/**
 * EL QUIEBRO: la MESA. Lo grueso de una noche —fases, niveles, retoques, votos, puntos de control,
 * historial— en un reductor puro; lo fino —golpes, quiebros, balas— vive en la sala de la Liza y
 * sólo llega aquí como veredictos gruesos.
 *
 * ═══ LOS TRES PLANOS, Y POR QUÉ ÉSTE ES EL LENTO ═══
 *
 * El documento de diseño (`docs/EL-QUIEBRO.md`, §10) parte el estado en tres: la MESA (esto),
 * persistida y a ritmo de movimientos raros; la SALA, arbitrada a 20 tics por segundo y nunca
 * persistida; y el ADORNO del cliente. La mesa no ve un golpe: ve, al cerrar cada oleada, un
 * `arcade:ronda` con las cuentas de cada asiento, y de eso saca los puntos de la noche, el punto de
 * control (aguante, Foco, esquirlas, monedas) con que la sala empezará la fase siguiente, los
 * títulos y la Memoria del Sistema. Cinco o diez veredictos por noche, no mil: la mesa escribe en
 * disco en cada uno y su diario se copia entero en cada movimiento.
 *
 * ═══ LOS VEREDICTOS VAN DELANTE DEL PORTILLO ═══
 *
 * `arcade:ronda`, `arcade:reloj` y `arcade:ausente` los mete la sala con `quien: null` por la puerta
 * de la plataforma; nadie los ofrece, así que el portillo del §5 bis los tiraría siempre. Se atienden
 * antes, cada uno con su lector estricto de la Liza (que exige `quien === null`), y cualquier cosa
 * rara —forma, ronda rancia, reloj que no es el de la fase, cuentas que no cuadran— se RECHAZA CON
 * MOTIVO: no hay veredicto a medias, y un motivo escrito es lo único que le queda a quien mira el
 * registro de la sala para saber por qué la mesa no avanzó. Lo que no es raro sino repetido o tardío
 * —el ausente de quien ya consta, el que llega con la noche ya acabada— entra SIN EFECTO: el mismo
 * objeto, sin motivo, que la plataforma cuenta aparte de los rechazos.
 *
 * ═══ POR QUÉ LA PROYECCIÓN NO ES LA IDENTIDAD LITERAL ═══
 *
 * El Quiebro no tiene secretos: la vista es la MISMA para todos, espectador incluido, y no depende
 * de quién mira (`quien` ni se lee). Pero no es el estado tal cual, por tres cosas que no caben en la
 * vista sin ensuciar su contrato:
 *
 *   · el DIBUJO (`tablero`), que lleva los nombres de los sentados en sus paneles —y los nombres sólo
 *     llegan a la proyección, nunca al reductor: son presentación y no pueden entrar en el diario—;
 *   · la cuenta de TICS PEREZOSOS (`perezosos`), que es de la mesa y no le importa a nadie más;
 *   · los AVISADOS de la fase en curso (`avisados`): ver «Los ausentes cuentan desde la fase siguiente».
 *
 * Así que el estado es la vista sin su dibujo, más esas dos cuentas; la proyección añade el dibujo y
 * quita las cuentas. «La proyección es la identidad» sigue siendo verdad en lo que importa, que es que
 * la sala (`mirar(codigo, null)`) y cada aparato leen exactamente lo mismo.
 *
 * ═══ EN LA REUNIÓN SÓLO SE PUEDE EMPEZAR, Y LA BAJADA ES LA PREPARACIÓN ═══
 *
 * El diseño elige el estilo «en la reunión», y aquí se elige en la BAJADA y entre noches. No es un
 * capricho: la mesa de la plataforma se cierra a los que llegan en cuanto un asiento cambia el estado
 * (`Mesa.empezada`, en `server/src/arcade/mesas.ts`), así que un estilo elegido mientras se espera a
 * los amigos les dejaría fuera con el código en la mano. Con `empezar` como único movimiento de la
 * reunión, «al empezar, la mesa se cierra» (§5.1) es literal.
 *
 * Con los 6 s de la caída no daba tiempo a elegir con calma, así que la Bajada dura hasta que todos
 * están LISTOS: elegir estilo es estar listo (se cambia una vez por tramo), y quien se queda con el suyo
 * lo dice con `listo` (el botón BAJAR). Su reloj es el de 15 s (`DURACION_MS.bajada`) mientras falte
 * alguien, y con el último listo la mesa lo CAMBIA por el de la caída (`n….b.listos`, 6 s contados desde
 * que empezó la Bajada: la caída tapa la carga del barrio y el canal). La sala vence el reloj que tenga
 * la vista (ver `RelojDeFase` en la Liza), y el de 15 s que llegue tarde entra sin efecto. No hay una
 * fase nueva: la vista, el productor y el cliente ya conocían la Bajada. El aparato manda el aviso de
 * aprendiz en cuanto la ve, y lo que se eligió en el vestíbulo, si quiere, como su estilo.
 *
 * ═══ EL DIARIO TIENE TOPE ═══
 *
 * Cada movimiento que entra se escribe en disco y el diario se copia entero en cada uno: un botón que
 * se puede pulsar sin fin es un diario sin fin, y un aparato roto o malicioso lo encuentra. Así que no
 * hay ninguno:
 *
 *   · el ESTILO se cambia una vez al bajar y una vez entre noches (recuento o final). La vista lo sabe
 *     sin un campo más: al empezar cada uno de esos tramos la mesa pone el aguante del punto de control
 *     al lleno del estilo que se lleva, cambiar de estilo no lo toca, y el estilo se ofrece mientras
 *     sigan casando. Funciona porque los tres aguantes son distintos con cualquier avería (lo dice
 *     `ESTILOS` y lo vigila `verify:quiebro`). El aguante de la Bajada no juega —ahí no se pega—, y al
 *     abrir la oleada 1 se llena con el estilo elegido;
 *   · el APRENDIZ, una vez por mesa: en la Bajada de la primera noche, que es la primera del aparato
 *     (nadie se sienta después de empezar), y se apaga al empezar la segunda;
 *   · el AUSENTE repetido no entra (ver abajo); otra noche, hasta la décima.
 *
 * Lo que queda es lo que el diseño cuenta por noche: una elección por asiento y pausa, una ronda por
 * oleada, un reloj por fase con reloj. `verify:quiebro` suma el tope noche a noche y lo mide con el
 * robot, y machaca el estilo mil veces para ver que entra una.
 *
 * ═══ LOS AUSENTES CUENTAN DESDE LA FASE SIGUIENTE ═══
 *
 * La sala manda `arcade:ausente` de quien lleva 60 s sin canal, una vez por asiento y por fase de
 * combate. Si la mesa lo marcara en el acto, la vista de la MISMA fase —la misma clave— diría otros
 * presentes y el productor declararía otro encuentro, escalado para otros, que la sala no toma sin
 * empezar fase: la mesa y la sala contarían con presentes distintos. (Con el barrio era peor: el límite
 * de la glorieta encogía de 60 a 48 m al pasar de cuatro a tres, y quien estuviera en la franja se
 * quedaba clavado fuera; con la ciudad abierta el límite ya no depende de los presentes.) El diseño lo
 * dice al revés: el ausente «deja de contar en la oleada siguiente» (§3), y la oleada escala con los
 * presentes «al empezar» (§4.10). Así que el aviso se guarda en el estado (`avisados`, fuera de la
 * vista) y se vuelve `ausente` al cambiar de fase; en la pausa, al avisado ya no se le espera. Dentro de
 * una fase los presentes sólo pueden crecer —quien vuelve y mueve—.
 *
 * ═══ Y QUIEN VUELVE, VUELVE ═══
 *
 * No hay veredicto de «presente»: la Liza sólo tiene ronda, reloj y ausente. Pero el ausente se
 * REPITE: la sala lo manda en cada fase de combate mientras el asiento siga sin canal. Así que la mesa
 * deja de dar por ausente a quien mueve en ella (elegir en la pausa, cualquier botón entre noches) y a
 * quien la ronda que cierra un combate enseña jugando —quiebros, puntos, rescates, desalojos o
 * salida: nada de eso lo hace un cuerpo sin canal— sin que la sala lo haya avisado en esa fase. Si en
 * la misma fase hay aviso y juego, manda el aviso: quien jugó la mitad y se fue, se fue.
 *
 * ═══ LA NOCHE QUE NADIE JUEGA ═══
 *
 * La mesa no tiene reloj (`tickHz: 0`): el plazo de 300 s con que se abre mete un `arcade:tic` cuando
 * pasan 300 s sin que cambie nada. En una fase de juego eso sólo pasa si la sala está muerta —la fase
 * más larga dura 170 s y la sala la cierra con su veredicto—, y dos seguidos (§5) la dejan en
 * `interrumpida`, con Reanudar y Rendirse. En el recuento, uno basta para pasar al final: los 20 s del
 * Amanecer ya pasaron. Así el robot genérico llega al final sin sala, y una mesa abandonada no se
 * queda colgada en una fase que no termina.
 *
 * ═══ LA CIUDAD DE LA MESA, Y DÓNDE SE BAJA ═══
 *
 * La ciudad abierta (`docs/quiebro/CIUDAD-ABIERTA.md`) es de la MESA: al empezar la primera noche el
 * reductor sortea su traza (una de 32) con el azar del contexto, y la guarda en la vista (`traza`) las
 * diez noches (§7, decisión 2: se aprende). Cada noche elige su plaza de la Bajada (`noche.fallos[0]`): la
 * Glorieta del Relojero la primera, y desde la segunda otra de las seis, distinta de la anterior (§3.2).
 * En la entrega 1 las oleadas siguen en esa plaza y la noche no tiene más plazas; con los Fallos 2 y 3
 * (entrega 2) la lista crece aquí mismo, entre los tríos válidos de la traza. El código, que da los
 * edificios, no llega nunca al reductor: por eso la traza es un número de la vista y no sale de él
 * (§2.6), y el retablo pinta la ciudad con los datos de la traza sin derivarla (ver `PLANO_DEL_TABLERO`).
 *
 * ═══ LAS TRES REGLAS DE SIEMPRE ═══
 *
 * No muta; no mira el reloj ni el azar del sistema (el azar es `ctx.azar`, la semilla de la mesa,
 * mezclada con la noche y la oleada); y siempre devuelve un estado, el MISMO objeto cuando no cambia
 * nada. Lo vigilan `verify:pureza`, `verify:quiebro` y `verify:robot-generico`.
 */
import { esRechazo, rechazar } from '../motor';
import type { Rechazo } from '../motor';
import { esTic } from '../reloj';
import { comoSeLlama } from '../tipos';
import type { ArcadeId, LosSentados, ManifiestoDeArcade, QuienMira } from '../tipos';
import type { ContextoMovimiento, Movimiento } from '../movimiento';
import type { Opcion } from '../opciones';
import { barajar, enteroEntre, sembrar } from '../../mecanicas/azar';
import { canonico } from '../../mecanicas/canonico';
import { semillaDelCodigo } from '../../mecanicas/semilla';
import type { TableroDeclarado } from '../../mecanicas/tablero-declarado';
import { IDS_DE_ESTILO, IDS_DE_RECETA, IDS_DE_RETOQUE, IDS_DE_TITULO, NOMBRES_DEL_QUIEBRO, PRIMER_NIVEL, nombreDePlaza, nombreDelNivel } from './quiebro-nombres';
import type { IdDeAveria, IdDeDistritoConNombre, IdDeEstilo, IdDeReceta, IdDeRetoque, IdDeTitulo } from './quiebro-nombres';
import {
  AGUANTE,
  AVERIAS,
  AVERIAS_QUE_SE_SORTEAN,
  BASE_DEL_REGLAMENTO,
  DURACION_MS,
  ESTILO_POR_DEFECTO,
  FOCO,
  aguanteLleno,
  comoEsElEstilo,
  contramedidaTrasLaNoche,
  monedasAlEmpezar,
  nivelTrasLaNoche,
  porCiento,
  presentesDeLaMesa,
  rondaDeLaFase,
  salenParaGanar,
} from './quiebro-reglas';
/* Sólo datos (las cuatro trazas dibujadas, sin una cuenta): el retablo pinta la ciudad sin derivarla. */
import { TRAZAS_DE_LA_CIUDAD } from './quiebro-trazas';
import {
  ASIENTOS_COMO_MUCHO,
  MOVIMIENTO_DEL_QUIEBRO,
  NOCHES_COMO_MUCHO,
  OLEADAS_COMO_MUCHO,
  OLEADAS_FIJAS,
  PLAZAS_DE_LA_CIUDAD,
  PLAZA_DE_LA_PRIMERA_BAJADA,
  PRIMERA_PAUSA_CON_VOTO,
  QUIEBROS_DE_APRENDIZ,
  RETOQUES_OFRECIDOS,
  TRAZAS_POSIBLES,
  bajadaDeLaNoche,
  VEREDICTO_DE_AUSENTE,
  VEREDICTO_DE_RELOJ,
  VEREDICTO_DE_RONDA,
  leerCargaDeAusente,
  leerCargaDeElegir,
  leerCargaDeEstilo,
  leerCargaDeReloj,
  leerRondaDelQuiebro,
  leerVistaDelQuiebro,
} from './quiebro-vista';
import type {
  AsientoDelQuiebro,
  ContadoresDelAsiento,
  CuentaDeAsiento,
  FaseDeJuego,
  FaseDelQuiebro,
  MejorNoche,
  NocheJugada,
  RelojDelQuiebro,
  ResultadoDeNoche,
  RondaDelQuiebro,
  VistaDelQuiebro,
} from './quiebro-vista';

/* ─── EL MANIFIESTO (§10) ────────────────────────────────────────────────── */

/** El identificador del arcade. Nunca se le enseña a nadie. */
export const QUIEBRO: ArcadeId = 'quiebro';

/**
 * EL MANIFIESTO. `tickHz: 0` porque aquí el tiempo fino es de la sala: la mesa sólo recibe el tic
 * perezoso de su plazo (ver la cabecera). `marcador: ninguno` porque no hay récords persistentes en
 * la v1 (§14, pendiente de Miguel): la mejor noche es de la mesa y muere con ella. `secretos: false`
 * y, aun así, proyección: una mesa de servidor con más de un asiento la exige siempre.
 */
export const MANIFIESTO_QUIEBRO: ManifiestoDeArcade = {
  id: QUIEBRO,
  nombre: NOMBRES_DEL_QUIEBRO.juego.nombre,
  gancho: NOMBRES_DEL_QUIEBRO.juego.gancho,
  icono: 'mando',
  jugadores: { minimo: 1, maximo: ASIENTOS_COMO_MUCHO },
  sede: 'servidor',
  tickHz: 0,
  mueble: 'tablero',
  secretos: false,
  marcador: { tipo: 'ninguno' },
  procedencia: { tipo: 'creacion-propia' },
};

/** Los tipos de movimiento, con el nombre corto: los de `quiebro-vista.ts`. */
export const EMPEZAR = MOVIMIENTO_DEL_QUIEBRO.empezar;
export const ESTILO = MOVIMIENTO_DEL_QUIEBRO.estilo;
export const LISTO = MOVIMIENTO_DEL_QUIEBRO.listo;
export const APRENDIZ = MOVIMIENTO_DEL_QUIEBRO.aprendiz;
export const ELEGIR = MOVIMIENTO_DEL_QUIEBRO.elegir;
export const RENDIRSE = MOVIMIENTO_DEL_QUIEBRO.rendirse;
export const REANUDAR = MOVIMIENTO_DEL_QUIEBRO.reanudar;
export const OTRA_NOCHE = MOVIMIENTO_DEL_QUIEBRO.otraNoche;
export const CERRAR = MOVIMIENTO_DEL_QUIEBRO.cerrar;

/** El prefijo que la plataforma se reserva (`Movimiento.tipo`). */
const PREFIJO_DE_LA_PLATAFORMA = 'arcade:';

/**
 * Lo más que cuenta una columna de una ronda, y lo más que suma en puntos: una ronda que traiga más
 * no es de ninguna sala de verdad, y sumarla podría dejar la vista fuera de lo que su lector admite
 * (contadores hasta 10^9) y la mesa sin poderse leer. Se rechaza antes.
 */
const TOPE_DE_UNA_CUENTA = 1000000;
const TOPE_DE_PUNTOS_EN_UNA_RONDA = 1000000000;

/* ─── EL ESTADO ──────────────────────────────────────────────────────────── */

/** La vista sin su dibujo: todo lo que la mesa sabe y publica. */
export type MesaDelQuiebro = Omit<VistaDelQuiebro, 'tablero'>;

/** EL ESTADO DE LA MESA. Ver en la cabecera por qué no es la vista tal cual. */
export interface EstadoDelQuiebro {
  readonly mesa: MesaDelQuiebro;
  /** Tics perezosos seguidos en la fase de juego en curso sin nada entre medias (0 o 1). */
  readonly perezosos: number;
  /**
   * Los asientos que la sala ha dado por ausentes EN LA FASE EN CURSO, en el orden en que llegaron.
   * Pasan a `ausente` al cambiar de fase (ver la cabecera); fuera de una fase de juego, vacío.
   */
  readonly avisados: readonly string[];
}

const CONTADORES_A_CERO: ContadoresDelAsiento = {
  limpios: 0,
  rachaMasLarga: 0,
  amenazas: 0,
  desalojos: 0,
  estampados: 0,
  rescates: 0,
  caidas: 0,
  reapariciones: 0,
  esquirlasCobradas: 0,
};

function asientoNuevo(asiento: string): AsientoDelQuiebro {
  return {
    asiento,
    ofrecidos: [],
    haElegido: false,
    voto: null,
    ausente: false,
    salio: false,
    aprendiz: 0,
    puntos: 0,
    control: { aguante: aguanteLleno(ESTILO_POR_DEFECTO, 'ninguna'), foco: 0, esquirlas: 0 },
    contadores: CONTADORES_A_CERO,
  };
}

/**
 * LA MESA EN LA REUNIÓN: sólo depende de quién está sentado. En la reunión no se admite más movimiento
 * que empezar (ver la cabecera), y a la reunión no se vuelve, así que rehacerla con la lista de ahora
 * no pierde nada.
 */
export function mesaEnLaReunion(asientos: readonly string[]): MesaDelQuiebro {
  return {
    fase: { tipo: 'reunion' },
    reloj: null,
    traza: null,
    noche: null,
    asientos: asientos.map(asientoNuevo),
    monedas: monedasAlEmpezar(PRIMER_NIVEL, 'ninguna'),
    historial: [],
    mejorNoche: null,
    reglamento: {
      base: BASE_DEL_REGLAMENTO,
      nivel: PRIMER_NIVEL,
      averia: 'ninguna',
      contramedida: 'ninguna',
      asientos: asientos.map((asiento) => ({ asiento, estilo: ESTILO_POR_DEFECTO, retoques: [] })),
    },
  };
}

/** Un estado recién hecho: sin tics perezosos ni avisos. */
function estadoCon(mesa: MesaDelQuiebro): EstadoDelQuiebro {
  return { mesa, perezosos: 0, avisados: [] };
}

/** ¿Es la misma lista, en el mismo orden? */
function mismosAsientos(m: MesaDelQuiebro, asientos: readonly string[]): boolean {
  if (m.asientos.length !== asientos.length) return false;
  for (let i = 0; i < asientos.length; i++) if ((m.asientos[i] as AsientoDelQuiebro).asiento !== asientos[i]) return false;
  return true;
}

/**
 * EN LA REUNIÓN, LA LISTA DE AHORA. Alguien se ha podido sentar desde el último movimiento, y el
 * contexto (`ctx.asientos`) es donde vive la verdad. Si no cambió, el MISMO objeto.
 */
function alDiaEnLaReunion(e: EstadoDelQuiebro, asientos: readonly string[]): EstadoDelQuiebro {
  if (e.mesa.fase.tipo !== 'reunion' || mismosAsientos(e.mesa, asientos)) return e;
  return estadoCon(mesaEnLaReunion(asientos));
}

/* ─── LOS RELOJES Y LAS FASES ────────────────────────────────────────────── */

/** ¿Se juega la noche en esta fase? Es donde entran los tics perezosos y los ausentes. */
function esFaseDeJuego(fase: FaseDelQuiebro): boolean {
  return fase.tipo === 'bajada' || fase.tipo === 'oleada' || fase.tipo === 'pausa' || fase.tipo === 'llamada';
}

/** ¿Es un tramo entre noches (recuento o final)? Ahí se pide otra noche, se cierra y se cambia de estilo. */
function esEntreNoches(fase: FaseDelQuiebro): boolean {
  return fase.tipo === 'recuento' || fase.tipo === 'final';
}

/**
 * El reloj de la Bajada cuando ya están todos listos: el de la caída. Otro `id` que el de 15 s, para que
 * la sala lo vuelva a armar y para que el de 15 s que llegue tarde no cuente.
 */
function relojDeLaBajadaConTodos(noche: number): RelojDelQuiebro {
  return { id: `n${String(noche)}.b.listos`, duraMs: DURACION_MS.bajadaConTodos };
}

/** El reloj de una fase: claves cortas de la Liza, distintas en cada fase de cada noche. */
function relojDe(noche: number, fase: FaseDelQuiebro): RelojDelQuiebro | null {
  switch (fase.tipo) {
    case 'bajada':
      return { id: `n${String(noche)}.b`, duraMs: DURACION_MS.bajada };
    case 'pausa':
      return { id: `n${String(noche)}.p${String(fase.oleada)}`, duraMs: DURACION_MS.pausa };
    case 'recuento':
      return { id: `n${String(noche)}.re`, duraMs: DURACION_MS.recuento };
    default:
      return null;
  }
}

/** Pasa la mesa a otra fase con su reloj, y sin nada de pausa colgando. */
function aLaFase(m: MesaDelQuiebro, fase: FaseDelQuiebro): MesaDelQuiebro {
  const noche = m.noche === null ? 1 : m.noche.numero;
  const sinPausa = fase.tipo === 'pausa' ? m.asientos : m.asientos.map(sinNadaDePausa);
  return { ...m, fase, reloj: relojDe(noche, fase), asientos: sinPausa };
}

function sinNadaDePausa(a: AsientoDelQuiebro): AsientoDelQuiebro {
  if (a.ofrecidos.length === 0 && !a.haElegido && a.voto === null) return a;
  return { ...a, ofrecidos: [], haElegido: false, voto: null };
}

/**
 * EL AGUANTE DEL PUNTO DE CONTROL, AL LLENO DEL ESTILO DE CADA UNO. Se hace al salir de la Bajada
 * (el estilo que se eligió al bajar manda desde la oleada 1) y al entrar en el recuento (la noche se
 * acabó: ahí empieza el tramo entre noches y su cambio de estilo). Ver «El diario tiene tope».
 */
function conElAguanteLleno(m: MesaDelQuiebro): MesaDelQuiebro {
  let cambia = false;
  const asientos = m.asientos.map((a, i) => {
    const lleno = aguanteLleno((m.reglamento.asientos[i] as { estilo: IdDeEstilo }).estilo, m.reglamento.averia);
    if (a.control.aguante === lleno) return a;
    cambia = true;
    return { ...a, control: { ...a.control, aguante: lleno } };
  });
  return cambia ? { ...m, asientos } : m;
}

/**
 * ¿PUEDE ESTE ASIENTO CAMBIAR DE ESTILO? En la Bajada y entre noches, mientras el aguante del punto de
 * control siga siendo el lleno del estilo que lleva: la mesa lo pone así al empezar cada tramo y el
 * cambio de estilo no lo toca, así que un cambio lo gasta (ver «El diario tiene tope»).
 */
function puedeCambiarDeEstilo(m: MesaDelQuiebro, i: number): boolean {
  if (m.fase.tipo !== 'bajada' && !esEntreNoches(m.fase)) return false;
  const a = m.asientos[i] as AsientoDelQuiebro;
  return a.control.aguante === aguanteLleno((m.reglamento.asientos[i] as { estilo: IdDeEstilo }).estilo, m.reglamento.averia);
}

/** ¿Se le ofrece el aprendiz? En la Bajada de la primera noche y a quien aún no lo tiene. */
function puedeAprender(m: MesaDelQuiebro, i: number): boolean {
  return m.fase.tipo === 'bajada' && m.noche !== null && m.noche.numero === 1 && (m.asientos[i] as AsientoDelQuiebro).aprendiz < QUIEBROS_DE_APRENDIZ;
}

/* ─── EL AZAR DE LA MESA ─────────────────────────────────────────────────── */

/**
 * UNA SEMILLA PARA UN SORTEO CONCRETO: la de la mesa (`ctx.azar`) con lo que se sortea escrito al
 * lado. Nada de azar viaja en el estado: la receta de la noche 3 o los retoques de la pausa 2 del
 * tercer asiento salen siempre iguales de lo mismo, y reejecutar el diario los vuelve a sacar.
 */
function semillaPara(azar: number, que: string): number {
  return semillaDelCodigo(`quiebro#${String(azar >>> 0)}#${que}`);
}

/** Las recetas, barajadas una vez por mesa y repartidas por noches: seis noches sin repetir. */
function recetaDeLaNoche(azar: number, numero: number): IdDeReceta {
  const orden = barajar(sembrar(semillaPara(azar, 'recetas')), IDS_DE_RECETA).valor;
  return orden[(numero - 1) % orden.length] as IdDeReceta;
}

/**
 * La avería de la noche: ninguna la primera (§2.1: la primera noche es la del aprendiz), y desde la
 * segunda las cuatro barajadas por mesa, de cuatro en cuatro.
 */
function averiaDeLaNoche(azar: number, numero: number): IdDeAveria {
  if (numero <= 1) return 'ninguna';
  const orden = barajar(sembrar(semillaPara(azar, 'averias')), AVERIAS_QUE_SE_SORTEAN).valor;
  return orden[(numero - 2) % orden.length] as IdDeAveria;
}

/**
 * LA TRAZA DE LA MESA (`docs/quiebro/CIUDAD-ABIERTA.md`, §2.6): una de las 32, sorteada una vez por mesa al
 * empezar. «Otra noche» trae la misma ciudad (§7, decisión 2): cambiar eso es sortearla aquí también.
 */
function trazaDeLaMesa(azar: number): number {
  return enteroEntre(sembrar(semillaPara(azar, 'traza')), 0, TRAZAS_POSIBLES - 1).valor;
}

/**
 * LA PLAZA DE LA BAJADA de la noche `numero` (§3.2): la primera noche, la Glorieta del Relojero, para que
 * los primeros treinta segundos (§2.1 del diseño) sean los de siempre para quien estrena el aparato; las
 * demás, una de las otras cinco de la anterior, sorteada con el azar de la mesa. En la entrega 1 es
 * también donde van las oleadas: su plaza es el Fallo de la noche entera.
 */
function bajadaDeLaNocheNueva(azar: number, numero: number, anterior: number | null): number {
  if (numero <= 1 || anterior === null) return PLAZA_DE_LA_PRIMERA_BAJADA;
  const otras: number[] = [];
  for (let p = 1; p <= PLAZAS_DE_LA_CIUDAD; p++) if (p !== anterior) otras.push(p);
  return otras[enteroEntre(sembrar(semillaPara(azar, `bajada#${String(numero)}`)), 0, otras.length - 1).valor] as number;
}

/** Los retoques que se le ofrecen a un asiento en una pausa: tres de los que aún no tiene esta noche. */
function retoquesOfrecidos(azar: number, noche: number, oleada: number, i: number, tiene: readonly IdDeRetoque[]): IdDeRetoque[] {
  const libres = IDS_DE_RETOQUE.filter((r) => tiene.indexOf(r) < 0);
  const bolsa = libres.length > 0 ? libres : IDS_DE_RETOQUE;
  const barajados = barajar(sembrar(semillaPara(azar, `retoques#${String(noche)}#${String(oleada)}#${String(i)}`)), bolsa).valor;
  return barajados.slice(0, RETOQUES_OFRECIDOS);
}

/* ─── EL CAMBIO DE FASE: AVISADOS, AUSENTES Y QUIEN VUELVE ───────────────── */

/** ¿Es la misma fase de la misma noche? Lo que decide si los avisados pasan a ausentes. */
function mismaFase(a: MesaDelQuiebro, b: MesaDelQuiebro): boolean {
  return (a.noche === null ? 0 : a.noche.numero) === (b.noche === null ? 0 : b.noche.numero) && canonico(a.fase) === canonico(b.fase);
}

/**
 * ¿JUGÓ ESTE ASIENTO LA FASE QUE CIERRA LA RONDA? Sólo lo que hace alguien con el aparato en la mano:
 * quebrar, puntuar, rescatar, desalojar, salir. Las amenazas y las caídas no cuentan: se las puede
 * llevar un cuerpo quieto en los dos segundos que tarda en quedar ausente momentáneo.
 */
function jugoLaFase(c: CuentaDeAsiento | undefined): boolean {
  return c !== undefined && (c.quiebros > 0 || c.puntos > 0 || c.rescates > 0 || c.desalojos > 0 || c.salio);
}

/**
 * EL ESTADO QUE SIGUE A UN MOVIMIENTO QUE ENTRA, con la mesa `mesa` que salió de él. Con la misma fase,
 * los avisados siguen a la espera. Con otra, se vuelven ausentes (ver la cabecera); y si lo que cerró
 * la fase fue una ronda, quien ya era ausente y la ronda enseña jugando deja de serlo. Los tics
 * perezosos vuelven a cero: todo lo que entra y no es un tic es señal de vida.
 */
function seguir(antes: EstadoDelQuiebro, mesa: MesaDelQuiebro, ronda: RondaDelQuiebro | null): EstadoDelQuiebro {
  if (mismaFase(antes.mesa, mesa)) return { mesa, perezosos: 0, avisados: antes.avisados };
  let cambia = false;
  const asientos = mesa.asientos.map((a, i) => {
    const avisado = antes.avisados.indexOf(a.asiento) >= 0;
    const vuelve = ronda !== null && a.ausente && jugoLaFase(ronda.cuentas[i]);
    const ausente = avisado || (a.ausente && !vuelve);
    if (ausente === a.ausente) return a;
    cambia = true;
    return { ...a, ausente };
  });
  return { mesa: cambia ? { ...mesa, asientos } : mesa, perezosos: 0, avisados: [] };
}

/** ¿Se le espera en la pausa? Ni al ausente ni al avisado. */
function seLeEspera(m: MesaDelQuiebro, i: number, avisados: readonly string[]): boolean {
  const a = m.asientos[i] as AsientoDelQuiebro;
  return !a.ausente && avisados.indexOf(a.asiento) < 0;
}

/* ─── EL REDUCTOR ────────────────────────────────────────────────────────── */

/**
 * `avanzarElQuiebro`, en orden fijo: (a) la reunión al día con quien está sentado; (b) el tic; (c) los
 * veredictos de la sala, delante del portillo; (d) lo demás con prefijo de la plataforma, rechazado;
 * (e) el portillo, con lo que `opciones()` le ofrecería a quien mueve; (f) una rama por movimiento,
 * que vuelve a validar con todo el estado.
 */
export function avanzarElQuiebro(
  estado: EstadoDelQuiebro | undefined,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): EstadoDelQuiebro | Rechazo<EstadoDelQuiebro> {
  const actual = alDiaEnLaReunion(estado ?? estadoCon(mesaEnLaReunion(ctx.asientos)), ctx.asientos);

  if (esTic(movimiento)) return elTicPerezoso(actual);

  switch (movimiento.tipo) {
    case VEREDICTO_DE_RONDA:
      return laRonda(actual, movimiento.carga, ctx);
    case VEREDICTO_DE_RELOJ:
      return elReloj(actual, movimiento.carga, ctx);
    case VEREDICTO_DE_AUSENTE:
      return elAusente(actual, movimiento.carga, ctx);
    default:
      break;
  }
  if (movimiento.tipo.indexOf(PREFIJO_DE_LA_PLATAFORMA) === 0) {
    return rechazar(actual, 'Ese movimiento de la plataforma no es de El Quiebro: la mesa sólo atiende la ronda, el reloj y el ausente.');
  }

  const m = actual.mesa;
  if (!estaOfrecido(opcionesDeLaMesa(m, ctx.quien), movimiento)) return rechazar(actual, porQueNoSeOfrece(m, ctx.quien, movimiento));
  const i = indiceDe(m, ctx.quien);
  /* El portillo ya dijo que está sentado; esto es para el compilador y para quien toque el portillo. */
  if (i < 0) return rechazar(actual, 'No estás sentado a esta mesa.');
  /* Quien mueve está ahí: si la sala lo había dado por ausente, o lo acababa de avisar, deja de estarlo. */
  const mesa = presente(m, i);
  const quien = (m.asientos[i] as AsientoDelQuiebro).asiento;
  const vivo: EstadoDelQuiebro = actual.avisados.indexOf(quien) < 0 ? actual : { ...actual, avisados: actual.avisados.filter((x) => x !== quien) };

  let salida: MesaDelQuiebro | Rechazo<EstadoDelQuiebro>;
  switch (movimiento.tipo) {
    case EMPEZAR:
      salida = empezar(actual, mesa, ctx);
      break;
    case ESTILO: {
      const c = leerCargaDeEstilo(movimiento.carga);
      salida = c === null ? rechazar(actual, 'Ese estilo no existe.') : cambiarDeEstilo(mesa, i, c.id, vivo.avisados);
      break;
    }
    case LISTO:
      salida = conTodosListos(conAsiento(mesa, i, { ...(mesa.asientos[i] as AsientoDelQuiebro), haElegido: true }), vivo.avisados);
      break;
    case APRENDIZ:
      salida = conAsiento(mesa, i, { ...(mesa.asientos[i] as AsientoDelQuiebro), aprendiz: QUIEBROS_DE_APRENDIZ });
      break;
    case ELEGIR: {
      const c = leerCargaDeElegir(movimiento.carga);
      salida = c === null ? rechazar(actual, 'Esa elección no tiene la forma que toca.') : elegir(mesa, i, c.retoque, c.voto, vivo.avisados);
      break;
    }
    case RENDIRSE:
      salida = cerrarLaNoche(mesa, 'rendida');
      break;
    case REANUDAR:
      salida = mesa.fase.tipo === 'interrumpida' ? aLaFase(mesa, faseDeJuego(mesa.fase.en)) : rechazar(actual, 'No hay ninguna noche interrumpida que reanudar.');
      break;
    case OTRA_NOCHE:
      salida = nochesJugadas(mesa) >= NOCHES_COMO_MUCHO ? rechazar(actual, 'Esta mesa ya ha jugado todas sus noches.') : nuevaNoche(mesa, nochesJugadas(mesa) + 1, ctx.azar);
      break;
    case CERRAR:
      salida = { ...mesa, fase: { tipo: 'cerrada' }, reloj: null };
      break;
    default:
      /* El portillo no deja llegar aquí nada que no sea de este juego. */
      return rechazar(actual, 'El Quiebro no conoce ese movimiento.');
  }
  return esLaMesa(salida) ? seguir(vivo, salida, null) : salida;
}

/** ¿Salió una mesa, o un rechazo con su motivo? */
function esLaMesa(x: MesaDelQuiebro | Rechazo<EstadoDelQuiebro>): x is MesaDelQuiebro {
  return !esRechazo<unknown>(x);
}

/** La fase de juego a la que vuelve una noche interrumpida. */
function faseDeJuego(en: FaseDeJuego): FaseDelQuiebro {
  return en.tipo === 'oleada' ? { tipo: 'oleada', oleada: en.oleada } : { tipo: 'llamada' };
}

function indiceDe(m: MesaDelQuiebro, quien: string | null): number {
  if (quien === null) return -1;
  for (let i = 0; i < m.asientos.length; i++) if ((m.asientos[i] as AsientoDelQuiebro).asiento === quien) return i;
  return -1;
}

function conAsiento(m: MesaDelQuiebro, i: number, a: AsientoDelQuiebro): MesaDelQuiebro {
  const asientos = m.asientos.slice();
  asientos[i] = a;
  return { ...m, asientos };
}

/**
 * Quien mueve está: deja de ser ausente EN EL ACTO. Es lo único que cambia los presentes dentro de una
 * fase, y sólo los sube; en un combate el único movimiento de asiento es rendirse, que la acaba.
 */
function presente(m: MesaDelQuiebro, i: number): MesaDelQuiebro {
  const a = m.asientos[i] as AsientoDelQuiebro;
  return a.ausente ? conAsiento(m, i, { ...a, ausente: false }) : m;
}

/** Cuántas noches se han empezado en esta mesa: la de la vista. */
function nochesJugadas(m: MesaDelQuiebro): number {
  return m.noche === null ? 0 : m.noche.numero;
}

/* ─── EL PORTILLO ────────────────────────────────────────────────────────── */

/** ¿Estaba este movimiento entre los ofrecidos? Por la forma canónica de `{tipo, carga}`. */
function estaOfrecido(opciones: readonly Opcion[], movimiento: Movimiento): boolean {
  let buscado: string;
  try {
    buscado = canonico({ tipo: movimiento.tipo, carga: movimiento.carga ?? null });
  } catch {
    return false;
  }
  for (const o of opciones) if (canonico({ tipo: o.tipo, carga: o.carga ?? null }) === buscado) return true;
  return false;
}

/** Por qué no se ofrecía, dicho sin contar nada que la vista de quien mueve no diga ya (no hay secretos). */
function porQueNoSeOfrece(m: MesaDelQuiebro, quien: string | null, movimiento: Movimiento): string {
  const i = indiceDe(m, quien);
  if (i < 0) return 'No estás sentado a esta mesa.';
  const tipos: readonly string[] = [EMPEZAR, ESTILO, LISTO, APRENDIZ, ELEGIR, RENDIRSE, REANUDAR, OTRA_NOCHE, CERRAR];
  if (tipos.indexOf(movimiento.tipo) < 0) return 'El Quiebro no conoce ese movimiento.';
  const f = m.fase.tipo;
  switch (movimiento.tipo) {
    case EMPEZAR:
      return 'La noche ya ha empezado.';
    case ESTILO:
      if (f === 'reunion') return 'El estilo se elige en la Bajada: si se eligiera aquí, la mesa se cerraría a los que aún no han llegado.';
      if (f !== 'bajada' && !esEntreNoches(m.fase)) return 'El estilo se elige en la Bajada o entre noches.';
      if (f === 'bajada' && (m.asientos[i] as AsientoDelQuiebro).haElegido) {
        return puedeCambiarDeEstilo(m, i) ? 'Ya estás listo para bajar con tu estilo.' : 'Ya has cambiado de estilo al bajar: uno por Bajada, y otro entre noches.';
      }
      return puedeCambiarDeEstilo(m, i)
        ? 'Ese estilo ya lo llevas, o no existe.'
        : f === 'bajada'
          ? 'Ya has cambiado de estilo al bajar: uno por Bajada, y otro entre noches.'
          : 'Ya has cambiado de estilo entre noches: uno aquí, y otro al bajar.';
    case LISTO:
      return f === 'bajada' ? 'Ya estás listo para bajar.' : 'Lo de estar listo se dice en la Bajada.';
    case APRENDIZ:
      if (f === 'bajada' && m.noche !== null && m.noche.numero === 1) return 'Ya tienes los quiebros de aprender.';
      return 'Lo de la primera noche se dice en la Bajada de la primera noche.';
    case ELEGIR:
      return f === 'pausa' ? 'Ya has elegido en esta pausa, o eso no es lo que se te ofrece.' : 'Los retoques se eligen en la pausa.';
    case RENDIRSE:
      return 'No hay ninguna noche en juego de la que rendirse.';
    case REANUDAR:
      return 'No hay ninguna noche interrumpida que reanudar.';
    case OTRA_NOCHE:
      return esEntreNoches(m.fase) ? 'Esta mesa ya ha jugado todas sus noches.' : 'Otra noche se pide al acabar ésta.';
    default:
      return 'La mesa se cierra al acabar la noche.';
  }
}

/* ─── LAS NOCHES ─────────────────────────────────────────────────────────── */

/** Lo que la Memoria del Sistema recuerda de la noche que acaba de terminar: la suma de todos. */
function sumaDeLaNoche(m: MesaDelQuiebro): { reapariciones: number; limpios: number; amenazas: number; estampados: number } {
  let reapariciones = 0;
  let limpios = 0;
  let amenazas = 0;
  let estampados = 0;
  for (const a of m.asientos) {
    reapariciones += a.contadores.reapariciones;
    limpios += a.contadores.limpios;
    amenazas += a.contadores.amenazas;
    estampados += a.contadores.estampados;
  }
  return { reapariciones, limpios, amenazas, estampados };
}

/**
 * UNA NOCHE NUEVA: número, nivel (sube si la anterior se ganó, baja si no), avería, receta, la
 * contramedida de la Memoria del Sistema (sacada de los contadores de la anterior, que aún están en la
 * mesa), la plaza de la Bajada, la traza de la mesa (sorteada en la primera; ver la cabecera) y los
 * puntos de control a lleno. Los estilos siguen; los retoques, los puntos y los contadores
 * vuelven a cero; los quiebros de aprender se apagan (eran de la primera noche), y los ausentes siguen
 * ausentes hasta que muevan o jueguen.
 */
function nuevaNoche(m: MesaDelQuiebro, numero: number, azar: number): MesaDelQuiebro {
  const anterior = m.historial[m.historial.length - 1];
  const nivel = numero <= 1 || anterior === undefined ? PRIMER_NIVEL : nivelTrasLaNoche(anterior.nivel, anterior.resultado === 'ganada');
  const averia = averiaDeLaNoche(azar, numero);
  const contramedida = numero <= 1 ? 'ninguna' : contramedidaTrasLaNoche(sumaDeLaNoche(m));
  const reglamento = {
    base: BASE_DEL_REGLAMENTO,
    nivel,
    averia,
    contramedida,
    asientos: m.reglamento.asientos.map((e) => ({ asiento: e.asiento, estilo: e.estilo, retoques: [] })),
  };
  const asientos = m.asientos.map((a, i) => ({
    ...a,
    ofrecidos: [],
    haElegido: false,
    voto: null,
    salio: false,
    aprendiz: numero <= 1 ? a.aprendiz : 0,
    puntos: 0,
    control: { aguante: aguanteLleno((reglamento.asientos[i] as { estilo: IdDeEstilo }).estilo, averia), foco: 0, esquirlas: 0 },
    contadores: CONTADORES_A_CERO,
  }));
  const fase: FaseDelQuiebro = { tipo: 'bajada' };
  const bajadaAnterior = m.noche === null ? null : bajadaDeLaNoche(m.noche);
  return {
    fase,
    reloj: relojDe(numero, fase),
    traza: m.traza ?? trazaDeLaMesa(azar),
    noche: { numero, receta: recetaDeLaNoche(azar, numero), fallos: [bajadaDeLaNocheNueva(azar, numero, bajadaAnterior)] },
    asientos,
    monedas: monedasAlEmpezar(nivel, contramedida),
    historial: m.historial,
    mejorNoche: m.mejorNoche,
    reglamento,
  };
}

function empezar(actual: EstadoDelQuiebro, m: MesaDelQuiebro, ctx: ContextoMovimiento): MesaDelQuiebro | Rechazo<EstadoDelQuiebro> {
  const n = ctx.asientos.length;
  if (n < 1 || n > ASIENTOS_COMO_MUCHO) {
    return rechazar(actual, `En una mesa de El Quiebro caben de 1 a ${String(ASIENTOS_COMO_MUCHO)} desvelados.`);
  }
  return nuevaNoche(m, 1, ctx.azar);
}

/**
 * CAMBIA DE ESTILO: sólo el reglamento. El aguante del punto de control se queda como estaba, que es
 * como la vista sabe que el cambio de este tramo ya se hizo (ver «El diario tiene tope»); el lleno del
 * estilo nuevo llega al abrir la oleada 1 o al empezar la noche siguiente. En la Bajada, además, deja al
 * asiento LISTO (ver la cabecera): el cambio de este tramo es su elección.
 */
function cambiarDeEstilo(m: MesaDelQuiebro, i: number, estilo: IdDeEstilo, avisados: readonly string[]): MesaDelQuiebro {
  const asientos = m.reglamento.asientos.slice();
  const eleccion = asientos[i] as { asiento: string; estilo: IdDeEstilo; retoques: readonly IdDeRetoque[] };
  asientos[i] = { ...eleccion, estilo };
  const cambiada: MesaDelQuiebro = { ...m, reglamento: { ...m.reglamento, asientos } };
  if (m.fase.tipo !== 'bajada') return cambiada;
  return conTodosListos(conAsiento(cambiada, i, { ...(cambiada.asientos[i] as AsientoDelQuiebro), haElegido: true }), avisados);
}

/**
 * EN LA BAJADA, CON TODOS LISTOS, EL RELOJ DE LA CAÍDA: los que se espera (ni ausentes ni avisados) han
 * dicho que están listos, y el reloj de 15 s se cambia por el de 6 (ver la cabecera). Si falta alguien,
 * o ya se había cambiado, la misma mesa.
 */
function conTodosListos(m: MesaDelQuiebro, avisados: readonly string[]): MesaDelQuiebro {
  if (m.fase.tipo !== 'bajada' || !hanElegidoTodos(m, avisados)) return m;
  const noche = nochesJugadas(m) < 1 ? 1 : nochesJugadas(m);
  const reloj = relojDeLaBajadaConTodos(noche);
  if (m.reloj !== null && m.reloj.id === reloj.id) return m;
  return { ...m, reloj };
}

/**
 * LA NOCHE SE ACABA: títulos, historial (las últimas diez), mejor noche de la mesa y el Amanecer con
 * su reloj de 20 s, con el aguante lleno (empieza el tramo entre noches). Lo de la pausa se recoge; los
 * retoques elegidos se quedan en el reglamento hasta la noche siguiente, que es donde los mira el
 * recuento.
 */
function cerrarLaNoche(m: MesaDelQuiebro, resultado: ResultadoDeNoche): MesaDelQuiebro {
  const numero = nochesJugadas(m) < 1 ? 1 : nochesJugadas(m);
  const jugada: NocheJugada = {
    noche: numero,
    nivel: m.reglamento.nivel,
    resultado,
    puntos: m.asientos.map((a) => ({ asiento: a.asiento, puntos: a.puntos })),
    titulos: losTitulos(m.asientos),
  };
  const historial = [...m.historial, jugada];
  while (historial.length > NOCHES_COMO_MUCHO) historial.shift();
  return conElAguanteLleno(aLaFase({ ...m, historial, mejorNoche: mejorNocheTras(m.mejorNoche, jugada) }, { tipo: 'recuento', resultado }));
}

/** Lo que cuenta cada título (§5.6): el que más tiene, si tiene algo. */
const VALOR_DEL_TITULO: Readonly<Record<IdDeTitulo, (c: ContadoresDelAsiento) => number>> = {
  'mas-limpios': (c) => c.limpios,
  'racha-mas-larga': (c) => c.rachaMasLarga,
  'mas-desalojos': (c) => c.desalojos,
  'mas-rescates': (c) => c.rescates,
  'el-avaro': (c) => c.esquirlasCobradas,
};

/**
 * LOS TÍTULOS DE LA NOCHE: cada uno a UNO (el lector de la vista lo exige), al que más tiene; a
 * igualdad, al que más puntos hizo, y después al que se sentó antes. Un título a cero no se da: «El
 * Avaro» de una noche en que nadie cobró una esquirla sería una broma sin gracia.
 */
function losTitulos(asientos: readonly AsientoDelQuiebro[]): { titulo: IdDeTitulo; asiento: string }[] {
  const salida: { titulo: IdDeTitulo; asiento: string }[] = [];
  for (const titulo of IDS_DE_TITULO) {
    const valor = VALOR_DEL_TITULO[titulo];
    let mejor: AsientoDelQuiebro | null = null;
    for (const a of asientos) {
      const v = valor(a.contadores);
      if (v <= 0) continue;
      if (mejor === null) {
        mejor = a;
        continue;
      }
      const w = valor(mejor.contadores);
      if (v > w || (v === w && a.puntos > mejor.puntos)) mejor = a;
    }
    if (mejor !== null) salida.push({ titulo, asiento: mejor.asiento });
  }
  return salida;
}

/** La mejor noche de un asiento en la mesa: sólo se supera con más puntos (a igualdad, manda la vieja). */
function mejorNocheTras(antes: MejorNoche | null, jugada: NocheJugada): MejorNoche | null {
  let mejor = antes;
  for (const p of jugada.puntos) {
    if (p.puntos <= 0) continue;
    if (mejor === null || p.puntos > mejor.puntos) mejor = { noche: jugada.noche, asiento: p.asiento, puntos: p.puntos };
  }
  return mejor;
}

/* ─── LAS PAUSAS ─────────────────────────────────────────────────────────── */

/** ¿Se vota en la pausa que va detrás de esta oleada? En la 3 y en la 4: tras la 5 no hay más propinas. */
export function seVotaTras(oleada: number): boolean {
  return oleada >= PRIMERA_PAUSA_CON_VOTO && oleada < OLEADAS_COMO_MUCHO;
}

/** Abre la pausa que va detrás de la oleada `k`, con los retoques que se le ofrecen a cada uno. */
function abrirLaPausa(m: MesaDelQuiebro, k: number, azar: number): MesaDelQuiebro {
  const noche = nochesJugadas(m);
  const asientos = m.asientos.map((a, i) => ({
    ...a,
    ofrecidos: retoquesOfrecidos(azar, noche, k, i, (m.reglamento.asientos[i] as { retoques: readonly IdDeRetoque[] }).retoques),
    haElegido: false,
    voto: null,
  }));
  return aLaFase({ ...m, asientos }, { tipo: 'pausa', oleada: k });
}

/**
 * Un asiento elige en la pausa: su retoque entra ya en el reglamento. Si con él han elegido todos
 * aquellos a los que se espera, la pausa acaba.
 */
function elegir(m: MesaDelQuiebro, i: number, retoque: IdDeRetoque, voto: 'llamar' | 'aguantar' | null, avisados: readonly string[]): MesaDelQuiebro {
  const eleccion = m.reglamento.asientos[i] as { asiento: string; estilo: IdDeEstilo; retoques: readonly IdDeRetoque[] };
  const asientosDelReglamento = m.reglamento.asientos.slice();
  asientosDelReglamento[i] = { ...eleccion, retoques: [...eleccion.retoques, retoque] };
  const conEleccion = conAsiento(
    { ...m, reglamento: { ...m.reglamento, asientos: asientosDelReglamento } },
    i,
    { ...(m.asientos[i] as AsientoDelQuiebro), haElegido: true, voto },
  );
  return hanElegidoTodos(conEleccion, avisados) ? cerrarLaPausa(conEleccion, avisados) : conEleccion;
}

/**
 * ¿Han elegido todos aquellos a los que se espera (en la pausa, su retoque; en la Bajada, que están
 * listos)? Sin nadie a quien esperar, no: se espera al reloj.
 */
function hanElegidoTodos(m: MesaDelQuiebro, avisados: readonly string[]): boolean {
  let esperados = 0;
  for (let i = 0; i < m.asientos.length; i++) {
    if (!seLeEspera(m, i, avisados)) continue;
    esperados++;
    if (!(m.asientos[i] as AsientoDelQuiebro).haElegido) return false;
  }
  return esperados > 0;
}

/**
 * CIERRA LA PAUSA: a quien no eligió, el primer retoque que se le ofrecía; el voto, por mayoría
 * ESTRICTA de «Aguantar» entre aquellos a los que se esperaba, contando «Llamar ya» a quien no votó
 * (§5.3-4: el empate llama). Tras la 1 y la 2 viene la oleada siguiente; tras la 3 y la 4, la propina
 * o la Llamada; tras la 5, la Llamada.
 */
function cerrarLaPausa(m: MesaDelQuiebro, avisados: readonly string[]): MesaDelQuiebro {
  if (m.fase.tipo !== 'pausa') return m;
  const k = m.fase.oleada;
  const asientosDelReglamento = m.reglamento.asientos.map((e, i) => {
    const a = m.asientos[i] as AsientoDelQuiebro;
    const primero = a.ofrecidos[0];
    return a.haElegido || primero === undefined ? e : { ...e, retoques: [...e.retoques, primero] };
  });
  let votan = 0;
  let aguantan = 0;
  for (let i = 0; i < m.asientos.length; i++) {
    if (!seLeEspera(m, i, avisados)) continue;
    votan++;
    if ((m.asientos[i] as AsientoDelQuiebro).voto === 'aguantar') aguantan++;
  }
  const propina = seVotaTras(k) && aguantan * 2 > votan;
  const siguiente: FaseDelQuiebro = k < OLEADAS_FIJAS || propina ? { tipo: 'oleada', oleada: k + 1 } : { tipo: 'llamada' };
  return aLaFase({ ...m, reglamento: { ...m.reglamento, asientos: asientosDelReglamento } }, siguiente);
}

/* ─── LOS VEREDICTOS DE LA SALA ──────────────────────────────────────────── */

/**
 * EL TIC PEREZOSO (ver la cabecera). En la reunión, el final, la noche interrumpida y la mesa cerrada
 * no hace nada: el MISMO objeto. En el recuento pasa al final. En una fase de juego, el primero se
 * apunta y el segundo seguido interrumpe la noche.
 */
function elTicPerezoso(e: EstadoDelQuiebro): EstadoDelQuiebro {
  const m = e.mesa;
  if (m.fase.tipo === 'recuento') return seguir(e, aLaFase(m, { tipo: 'final' }), null);
  if (!esFaseDeJuego(m.fase)) return e;
  if (e.perezosos < 1) return { ...e, perezosos: e.perezosos + 1 };
  return seguir(e, interrumpir(m, e.avisados), null);
}

/**
 * INTERRUMPE LA NOCHE: se apunta a qué fase de juego se vuelve. De la Bajada se vuelve a la oleada 1,
 * con el aguante del estilo que se eligió; de una pausa, a lo que venía detrás (se cierra con lo
 * elegido y lo que toque por defecto, como si hubiera vencido su reloj); de una oleada o de la
 * Llamada, a ella misma, desde su principio.
 */
function interrumpir(m: MesaDelQuiebro, avisados: readonly string[]): MesaDelQuiebro {
  let base = m;
  let en: FaseDeJuego;
  switch (m.fase.tipo) {
    case 'bajada':
      base = conElAguanteLleno(m);
      en = { tipo: 'oleada', oleada: 1 };
      break;
    case 'oleada':
      en = { tipo: 'oleada', oleada: m.fase.oleada };
      break;
    case 'pausa': {
      base = cerrarLaPausa(m, avisados);
      en = base.fase.tipo === 'oleada' ? { tipo: 'oleada', oleada: base.fase.oleada } : { tipo: 'llamada' };
      break;
    }
    default:
      en = { tipo: 'llamada' };
  }
  return aLaFase(base, { tipo: 'interrumpida', en });
}

/**
 * `arcade:reloj {id}`: venció el reloj de la fase. Sólo el de la fase en curso cambia algo.
 *
 * ═══ EL RELOJ QUE LLEGA TARDE ENTRA SIN EFECTO, NO SE RECHAZA ═══
 *
 * La sala mete el reloj de una fase cuando vence, y la mesa pudo cambiar de fase un momento antes: todos
 * eligieron en la pausa, o estaban listos en la Bajada, y la vista nueva aún no le había llegado a la sala
 * (la lee una vez por segundo como mucho). Eso no es un error de nadie: es lo normal. Rechazarlo lo
 * apuntaba como rechazo en el registro de la sala («no es el de la fase en curso»), con un motivo que
 * asustaba a quien lo leía. Así que un reloj BIEN FORMADO que no es el de la fase en curso —atrasado,
 * repetido, o de un reloj que la mesa ya cambió— devuelve el MISMO estado: la plataforma lo cuenta como
 * `sinEfecto` (`meterDeLaPlataforma`), aparte de los rechazos. Lo que sí se rechaza con motivo es lo que
 * ninguna sala de verdad manda: la forma mala o un reloj firmado por un asiento.
 */
function elReloj(e: EstadoDelQuiebro, carga: unknown, ctx: ContextoMovimiento): EstadoDelQuiebro | Rechazo<EstadoDelQuiebro> {
  const c = leerCargaDeReloj(carga, ctx.quien);
  if (c === null) return rechazar(e, 'El reloj no tiene la forma de la Liza, o lo manda alguien que no es la sala.');
  const m = e.mesa;
  if (m.reloj === null || c.id !== m.reloj.id) return e;
  switch (m.fase.tipo) {
    case 'bajada':
      return seguir(e, aLaFase(conElAguanteLleno(m), { tipo: 'oleada', oleada: 1 }), null);
    case 'pausa':
      return seguir(e, cerrarLaPausa(m, e.avisados), null);
    case 'recuento':
      return seguir(e, aLaFase(m, { tipo: 'final' }), null);
    default:
      return rechazar(e, 'Esta fase no tiene reloj.');
  }
}

/**
 * `arcade:ausente {a}`: el asiento lleva 60 s sin canal con la noche en marcha. Se apunta como AVISADO
 * y cuenta desde la fase siguiente (ver la cabecera); en la pausa, además, ya no se le espera. El de
 * quien ya consta —la sala lo repite en cada fase de combate— y el que llega con la noche acabada
 * entran sin efecto: el mismo objeto.
 */
function elAusente(e: EstadoDelQuiebro, carga: unknown, ctx: ContextoMovimiento): EstadoDelQuiebro | Rechazo<EstadoDelQuiebro> {
  const m = e.mesa;
  const c = leerCargaDeAusente(
    carga,
    ctx.quien,
    m.asientos.map((a) => a.asiento),
  );
  if (c === null) return rechazar(e, 'El ausente no tiene la forma de la Liza, nombra a quien no está sentado, o lo manda alguien que no es la sala.');
  if (!esFaseDeJuego(m.fase)) return e;
  const a = m.asientos[indiceDe(m, c.a)] as AsientoDelQuiebro;
  if (a.ausente || e.avisados.indexOf(c.a) >= 0) return e;
  const conAviso: EstadoDelQuiebro = { mesa: m, perezosos: 0, avisados: [...e.avisados, c.a] };
  if (m.fase.tipo === 'pausa' && hanElegidoTodos(m, conAviso.avisados)) return seguir(conAviso, cerrarLaPausa(m, conAviso.avisados), null);
  if (m.fase.tipo === 'bajada') return { ...conAviso, mesa: conTodosListos(m, conAviso.avisados) };
  return conAviso;
}

/**
 * `arcade:ronda {n, resultado, cuentas, recurso}`: la sala cerró la oleada o la Llamada en curso.
 * Sólo vale la ronda de la fase en curso (`rondaDeLaFase`): una repetida —la sala se rehízo tras
 * meterla— o atrasada se rechaza, y así las cuentas no se suman nunca dos veces.
 */
function laRonda(e: EstadoDelQuiebro, carga: unknown, ctx: ContextoMovimiento): EstadoDelQuiebro | Rechazo<EstadoDelQuiebro> {
  const m = e.mesa;
  const esperada = m.noche === null ? null : rondaDeLaFase(m.noche.numero, m.fase);
  if (esperada === null) return rechazar(e, 'No se está jugando ninguna oleada ni la Llamada: esa ronda llega fuera de su fase.');
  const r = leerRondaDelQuiebro(carga, ctx.quien, m.asientos.length);
  if (r === null) return rechazar(e, 'La ronda no tiene la forma que declara El Quiebro, o la manda alguien que no es la sala.');
  if (r.n !== esperada) return rechazar(e, `La ronda ${String(r.n)} no es la que se está jugando (la ${String(esperada)}): llega repetida o atrasada.`);
  const mal = porQueNoCuadra(m, r);
  if (mal !== null) return rechazar(e, mal);

  const enLaLlamada = m.fase.tipo === 'llamada';
  const vidaPorCiento = AVERIAS[m.reglamento.averia].vidaPorCiento;
  const asientos = m.asientos.map((a, i) => {
    const estilo = (m.reglamento.asientos[i] as { estilo: IdDeEstilo }).estilo;
    return sumarLaCuenta(a, r.cuentas[i] as CuentaDeAsiento, enLaLlamada, r.resultado === 'ganada', aguanteLleno(estilo, m.reglamento.averia), vidaPorCiento);
  });
  const sumada: MesaDelQuiebro = { ...m, asientos, monedas: r.monedas };

  if (m.fase.tipo === 'oleada') {
    return seguir(e, r.resultado === 'perdida' ? cerrarLaNoche(sumada, 'perdida') : abrirLaPausa(sumada, m.fase.oleada, ctx.azar), r);
  }
  return seguir(e, cerrarLaNoche(sumada, r.resultado === 'ganada' ? 'ganada' : 'perdida'), r);
}

/**
 * LO QUE UNA SALA DE VERDAD NO MANDA NUNCA. El lector de la vista ya mira la forma; esto mira que
 * los números se puedan dar a la vez: un aguante por encima del lleno, un Foco por encima del tope,
 * más limpios que amenazas, alguien que sale fuera de la Llamada, más monedas de las que había, una
 * Llamada ganada sin que salgan los que hacen falta (o perdida con ellos fuera)… Cualquiera de ellas
 * es una sala rota o un veredicto que no es de esta mesa.
 */
function porQueNoCuadra(m: MesaDelQuiebro, r: RondaDelQuiebro): string | null {
  const enLaLlamada = m.fase.tipo === 'llamada';
  if (enLaLlamada && r.resultado === 'aguantada') return 'La Llamada no se aguanta: se gana o se pierde.';
  if (r.monedas > m.monedas) return `La ronda trae ${String(r.monedas)} monedas y el equipo tenía ${String(m.monedas)}: las monedas no se ganan.`;
  let salidos = 0;
  for (let i = 0; i < r.cuentas.length; i++) {
    const c = r.cuentas[i] as CuentaDeAsiento;
    const quien = `el asiento ${String(c.numero)}`;
    const estilo = (m.reglamento.asientos[i] as { estilo: IdDeEstilo }).estilo;
    const lleno = aguanteLleno(estilo, m.reglamento.averia);
    if (c.aguante > lleno) return `${quien} acaba con ${String(c.aguante)} de aguante y su lleno es ${String(lleno)}.`;
    if (c.foco > FOCO.tope) return `${quien} acaba con ${String(c.foco)} de Foco y el tope es ${String(FOCO.tope)}.`;
    if (c.puntos > TOPE_DE_PUNTOS_EN_UNA_RONDA) return `${quien} trae más puntos de los que caben en una ronda.`;
    const cuentas = [c.limpios, c.rachaMasLarga, c.amenazas, c.desalojos, c.estampados, c.rescates, c.caidas, c.reapariciones, c.quiebros, c.esquirlasCobradas];
    for (const x of cuentas) if (x > TOPE_DE_UNA_CUENTA) return `${quien} trae una cuenta de ${String(x)}: ninguna sala cuenta tanto en una fase.`;
    if (c.rachaMasLarga > c.limpios) return `${quien} tiene una racha de ${String(c.rachaMasLarga)} con ${String(c.limpios)} limpios.`;
    if (c.limpios > c.amenazas) return `${quien} tiene ${String(c.limpios)} limpios de ${String(c.amenazas)} amenazas.`;
    if (c.reapariciones > c.caidas) return `${quien} reaparece ${String(c.reapariciones)} veces y cayó ${String(c.caidas)}.`;
    if (!enLaLlamada && (c.salio || c.esquirlasCobradas > 0)) return `${quien} sale o cobra fuera de la Llamada.`;
    if (c.salio && c.esquirlas > 0) return `${quien} sale y sigue llevando esquirlas: quien sale las cobra.`;
    if (!c.salio && c.esquirlasCobradas > 0) return `${quien} cobra esquirlas sin salir.`;
    if (c.salio) salidos++;
  }
  if (enLaLlamada) {
    /* Los presentes son los de la mesa, que son los que declaró el productor al empezar la Llamada. */
    const hacenFalta = salenParaGanar(presentesDeLaMesa(m.asientos));
    if (r.resultado === 'ganada' && salidos < hacenFalta) return `La Llamada se gana con ${String(hacenFalta)} fuera, y la ronda trae ${String(salidos)}.`;
    if (r.resultado === 'perdida' && salidos >= hacenFalta) return `Con ${String(salidos)} fuera la Llamada está ganada (hacían falta ${String(hacenFalta)}), y la ronda dice perdida.`;
  }
  return null;
}

/**
 * SUMA LA CUENTA DE UNA FASE A LA NOCHE DE UN ASIENTO. Todo lo de la ronda es de ESA fase (la Liza
 * cuenta desde que empieza cada una), así que se suma; salvo el punto de control, que es cómo quedó.
 * Al cerrar una oleada: +30 de aguante si se ganó (no si se aguantó por reloj), y quien acabó en el
 * suelo vuelve en la pausa con 60 (§4.7, §5.3). La avería «Cristal» parte los dos a la mitad.
 */
function sumarLaCuenta(a: AsientoDelQuiebro, c: CuentaDeAsiento, enLaLlamada: boolean, ganada: boolean, lleno: number, vidaPorCiento: number): AsientoDelQuiebro {
  let aguante = c.aguante;
  if (!enLaLlamada) {
    if (aguante <= 0) aguante = porCiento(AGUANTE.alVolverEnLaPausa, vidaPorCiento);
    else if (ganada) aguante += porCiento(AGUANTE.porOleadaGanada, vidaPorCiento);
    if (aguante > lleno) aguante = lleno;
    if (aguante < 1) aguante = 1;
  }
  const k = a.contadores;
  return {
    ...a,
    salio: a.salio || c.salio,
    aprendiz: a.aprendiz > c.quiebros ? a.aprendiz - c.quiebros : 0,
    puntos: a.puntos + c.puntos,
    control: { aguante, foco: c.foco, esquirlas: c.esquirlas },
    contadores: {
      limpios: k.limpios + c.limpios,
      rachaMasLarga: k.rachaMasLarga > c.rachaMasLarga ? k.rachaMasLarga : c.rachaMasLarga,
      amenazas: k.amenazas + c.amenazas,
      desalojos: k.desalojos + c.desalojos,
      estampados: k.estampados + c.estampados,
      rescates: k.rescates + c.rescates,
      caidas: k.caidas + c.caidas,
      reapariciones: k.reapariciones + c.reapariciones,
      esquirlasCobradas: k.esquirlasCobradas + c.esquirlasCobradas,
    },
  };
}

/* ─── `opciones()`: QUÉ TE PUEDO OFRECER A TI ────────────────────────────── */

function opcionSinCarga(id: string, tipo: string, rotulo: string, ayuda: string): Opcion {
  return { id, tipo, carga: null, rotulo, ayuda };
}

const N = NOMBRES_DEL_QUIEBRO;

const OPCION_EMPEZAR = opcionSinCarga('empezar', EMPEZAR, N.mesa.empezar, 'Empieza la noche. A partir de aquí no se sienta nadie más.');
const OPCION_LISTO = opcionSinCarga('listo', LISTO, N.mesa.bajar, 'Me quedo con este estilo. En cuanto estén todos, a la calle.');
const OPCION_RENDIRSE = opcionSinCarga('rendirse', RENDIRSE, N.mesa.rendirse, 'La noche se da por perdida para todos, y el nivel de la siguiente baja.');
const OPCION_REANUDAR = opcionSinCarga('reanudar', REANUDAR, N.mesa.reanudar, 'Vuelve a la calle: la fase en que se quedó la noche empieza otra vez desde el último punto de control.');
const OPCION_OTRA_NOCHE = opcionSinCarga('otra-noche', OTRA_NOCHE, N.mesa.otraNoche, 'Otra noche en la misma ciudad. El nivel sube si ganasteis y baja si no.');
const OPCION_CERRAR = opcionSinCarga('cerrar', CERRAR, N.mesa.cerrarLaMesa, 'Se acabó la mesa para todos.');
const OPCION_APRENDIZ = opcionSinCarga(
  'aprendiz',
  APRENDIZ,
  'Mi primera noche',
  `Los ${String(QUIEBROS_DE_APRENDIZ)} primeros quiebros de este aparato tienen la ventana de aprender.`,
);

function opcionesDeEstilo(actual: IdDeEstilo): Opcion[] {
  const salida: Opcion[] = [];
  for (const id of IDS_DE_ESTILO) {
    if (id === actual) continue;
    salida.push({ id: `estilo:${id}`, tipo: ESTILO, carga: { id }, rotulo: N.estilos[id], ayuda: comoEsElEstilo(id) });
  }
  return salida;
}

function opcionesDeElegir(a: AsientoDelQuiebro, oleada: number): Opcion[] {
  const salida: Opcion[] = [];
  const votos: readonly ('llamar' | 'aguantar' | null)[] = seVotaTras(oleada) ? ['llamar', 'aguantar'] : [null];
  for (const retoque of a.ofrecidos) {
    for (const voto of votos) {
      salida.push({
        id: `elegir:${retoque}:${voto ?? 'sin-voto'}`,
        tipo: ELEGIR,
        carga: { retoque, voto },
        rotulo: voto === null ? N.retoques[retoque] : `${N.retoques[retoque]} · ${N.votos[voto]}`,
        ayuda: voto === null ? N.mesa.elegirRetoque : `${N.mesa.elegirRetoque}, y vota: ${N.votos.llamar} o ${N.votos.aguantar}.`,
      });
    }
  }
  return salida;
}

/** Lo que se ofrece entre noches a todos: otra noche (hasta la décima) y cerrar. */
function opcionesEntreNoches(m: MesaDelQuiebro): Opcion[] {
  return nochesJugadas(m) < NOCHES_COMO_MUCHO ? [OPCION_OTRA_NOCHE, OPCION_CERRAR] : [OPCION_CERRAR];
}

/**
 * LO QUE PUEDE HACER UN ASIENTO en cada fase. Cada opción CAMBIA la mesa si se hace (un botón mudo
 * sería un error que `verify:robot-generico` caza) y ninguna se puede repetir sin fin (ver «El diario
 * tiene tope»): el estilo que ya se lleva no se ofrece, ni otro estilo a quien ya cambió en este
 * tramo, ni el aprendiz fuera de la primera Bajada, ni otra noche pasada la décima. El recuento ofrece
 * lo mismo que el final: los 20 s del Amanecer son para mirar, pero quien quiera seguir no espera.
 */
export function opcionesDeLaMesa(m: MesaDelQuiebro, quien: QuienMira): Opcion[] {
  const i = indiceDe(m, quien);
  if (i < 0) return [];
  const a = m.asientos[i] as AsientoDelQuiebro;
  const estilos = puedeCambiarDeEstilo(m, i) ? opcionesDeEstilo((m.reglamento.asientos[i] as { estilo: IdDeEstilo }).estilo) : [];
  switch (m.fase.tipo) {
    case 'reunion':
      return [OPCION_EMPEZAR];
    case 'bajada':
      return [OPCION_RENDIRSE, ...(a.haElegido ? [] : estilos), ...(puedeAprender(m, i) ? [OPCION_APRENDIZ] : []), ...(a.haElegido ? [] : [OPCION_LISTO])];
    case 'oleada':
    case 'llamada':
      return [OPCION_RENDIRSE];
    case 'pausa':
      return [...(a.haElegido ? [] : opcionesDeElegir(a, m.fase.oleada)), OPCION_RENDIRSE];
    case 'interrumpida':
      return [OPCION_REANUDAR, OPCION_RENDIRSE];
    case 'recuento':
    case 'final':
      return [...opcionesEntreNoches(m), ...estilos];
    default:
      return [];
  }
}

/**
 * `opciones()` DEL ALTA: recibe la vista que llegó por el cable, jamás el estado (§5 bis), y la lee
 * con el lector estricto. Una vista que no se lee no ofrece nada, y al espectador no se le ofrece
 * nada nunca.
 */
export function opcionesDelQuiebro(vista: unknown, quien: QuienMira): readonly Opcion[] {
  if (quien === null) return [];
  const v = leerVistaDelQuiebro(vista);
  return v === null ? [] : opcionesDeLaMesa(v, quien);
}

/** ¿Se acabó? Cuando la mesa se cierra (§10). Admite la mesa recién abierta, sin estado. */
export function seAcabo(estado: EstadoDelQuiebro | undefined): boolean {
  return estado !== undefined && estado.mesa.fase.tipo === 'cerrada';
}

/* ─── LA PROYECCIÓN Y EL TABLERO ─────────────────────────────────────────── */

/**
 * LA VISTA DE LA MESA, la misma para todos (ver la cabecera). En la reunión, la lista de sentados de
 * ahora (`sentados` es la mesa de verdad; el estado puede ir un movimiento por detrás de quien se
 * acaba de sentar), y con el estado sin nacer, la reunión de quienes haya.
 */
export function proyectarElQuiebro(estado: EstadoDelQuiebro | undefined, quien: QuienMira, sentados: LosSentados): VistaDelQuiebro {
  void quien;
  const ids = sentados.map((s) => s.asiento);
  let m: MesaDelQuiebro;
  if (estado === undefined) m = mesaEnLaReunion(ids);
  else if (estado.mesa.fase.tipo === 'reunion' && ids.length > 0 && !mismosAsientos(estado.mesa, ids)) m = mesaEnLaReunion(ids);
  else m = estado.mesa;
  return { ...m, tablero: tableroDelQuiebro(m, sentados) };
}

/**
 * EL PLANO QUE SE DIBUJA: la ciudad de la mesa (`docs/quiebro/CIUDAD-ABIERTA.md`, §2 y §5.2), con `x` al
 * este y `z` al sur, que en el dibujo es la `y` hacia abajo: el norte queda arriba. Las cuentas van en
 * metros; el tablero, en pasos de `unidad` (6 m), porque toda cifra del plano es múltiplo de 6 —ejes de
 * 24 + 48k, solares de 36, el canto en 270— y dos cifras por coordenada en vez de tres son cien bytes
 * menos en cada vista.
 *
 * ═══ SIN DERIVAR LA CIUDAD ═══
 *
 * La mesa se carga al arrancar la app (se instalan todos los arcades), y `quiebro-ciudad.ts` deriva
 * ciudades: cargarlo aquí le costaría su montaje a quien sólo quiere la lista de juegos. Así que el
 * retablo sale de los DATOS de las cuatro trazas dibujadas (`quiebro-trazas.ts`, que no hace ni una
 * cuenta) y de estas cifras del §2, con la simetría de la traza. `verify:quiebro` compara en las 32 trazas
 * cada plaza, cada distrito, cada avenida y cada calle mayor del retablo con los de `ciudadDeLaMesa`, y la
 * simetría de aquí con la de allí en todos los huecos: si la ciudad se mueve y el retablo no, sale rojo.
 *
 * ═══ QUÉ SE DIBUJA, Y QUÉ NO ═══
 *
 * Los cinco distritos (caras con su nombre), las seis plazas (caras con el suyo; las de la noche,
 * destacadas y en verde-cian, que es el color del Sistema que falla) y las dos avenidas (líneas). No van
 * los edificios, las cabinas ni los refugios: salen del código, que no llega nunca al reductor ni a la
 * proyección, y pintar una cabina que no es la que suena sería peor que no pintarla. Tampoco el límite de
 * la fase: ya no encierra nada que dibujar, salvo en la Bajada, y la plaza de la Bajada va destacada.
 *
 * Y tampoco las calles, ni siquiera las mayores que pide el §5.2: son las líneas ±120, que casi enteras
 * son ya el borde de algún distrito, y como líneas costaban 350 B de los 4.096 del tope. Una cara del
 * tablero son unos 190 B de forma fija, así que once caras y dos líneas se llevan 2,4 kB; lo que queda es
 * para los paneles, que son lo que se lee, con seis nombres de 24 letras y diez noches de historial (lo
 * mide `verify:quiebro`, y lo ve rojo con las 24 calles).
 */
export const PLANO_DEL_TABLERO = {
  /** De acera a acera exterior son 540 m (§2.1): ±270. */
  borde: 270,
  /** El paso de la rejilla: el hueco `(i, j)` es la celda `[48i − 24, 48i + 24]`, con su solar en medio. */
  paso: 48,
  medioSolar: 18,
  /** Los huecos van de −5 a 5. */
  huecoMaximo: 5,
  /** Las líneas ±120 separan los distritos y llevan las avenidas y las calles mayores. */
  mayor: 120,
  /** Lo que mide un paso del dibujo del tablero, en metros. */
  unidad: 6,
} as const;

/** Los colores, en la forma corta de tres cifras: el tablero viaja en cada vista y cada byte cuenta doce veces. */
const COLOR = {
  borde: '#445',
  ciudad: '#223',
  plaza: '#354',
  /** Verde-cian: lo del Sistema que falla (§1 del diseño). El ámbar es del jugador, y aquí no sale. */
  fallo: '#2a9',
  avenida: '#89a',
} as const;

/** El tono de cada distrito: el de su carácter (§2.2), oscuro para que se lean los rótulos. */
const COLOR_DEL_DISTRITO: Readonly<Record<IdDeDistritoConNombre, string>> = { casco: '#433', ensanche: '#423', lonja: '#343', naves: '#333', torres: '#235' };

/** Un rectángulo del plano, en metros. */
interface CajaDelPlano {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
}

/**
 * LA SIMETRÍA `s` DE UNA TRAZA: el bit 4 cambia los ejes y luego el 1 da la vuelta a `x` y el 2 a `z`. Es
 * `puntoSimetrico` de `quiebro-ciudad.ts`, la misma cuenta escrita aquí para no cargar aquel módulo (ver
 * la cabecera del plano); `verify:quiebro` compara las dos en todos los huecos y las ocho simetrías. Sin
 * `−0`: la forma canónica del tablero no lo distingue, pero un `Object.is` sí.
 */
function girar(s: number, x: number, z: number): { readonly x: number; readonly z: number } {
  const a = (s & 4) !== 0 ? z : x;
  const b = (s & 4) !== 0 ? x : z;
  return { x: (s & 1) !== 0 && a !== 0 ? -a : a, z: (s & 2) !== 0 && b !== 0 ? -b : b };
}

function girarCaja(s: number, c: CajaDelPlano): CajaDelPlano {
  const p = girar(s, c.x0, c.z0);
  const q = girar(s, c.x1, c.z1);
  return { x0: p.x < q.x ? p.x : q.x, z0: p.z < q.z ? p.z : q.z, x1: p.x < q.x ? q.x : p.x, z1: p.z < q.z ? q.z : p.z };
}

/** Lo que ocupan los huecos `i0…i1` × `j0…j1`: sus celdas, y en el canto de la ciudad hasta la acera exterior. */
function cajaDeLosHuecos(i0: number, i1: number, j0: number, j1: number): CajaDelPlano {
  const P = PLANO_DEL_TABLERO;
  const desde = (k: number): number => (k <= -P.huecoMaximo ? -P.borde : P.paso * k - P.paso / 2);
  const hasta = (k: number): number => (k >= P.huecoMaximo ? P.borde : P.paso * k + P.paso / 2);
  return { x0: desde(i0), z0: desde(j0), x1: hasta(i1), z1: hasta(j1) };
}

/**
 * LOS CINCO DISTRITOS EN LA TRAZA DIBUJADA, en huecos (`[id, i0, i1, j0, j1]`): el molinete del §2.2, el
 * Casco en las 5 × 5 del centro y cada distrito de fuera en una franja de 3 × 8 con su esquina.
 */
const DISTRITOS_DIBUJADOS: readonly (readonly [IdDeDistritoConNombre, number, number, number, number])[] = [
  ['casco', -2, 2, -2, 2],
  ['naves', -2, 5, -5, -3],
  ['lonja', -5, -3, -5, 2],
  ['ensanche', -5, 2, 3, 5],
  ['torres', 3, 5, -2, 5],
];

/**
 * LAS AVENIDAS EN LA TRAZA DIBUJADA (`[id, x0, z0, x1, z1]`, por su eje): el Elevado a lo largo de `x` por
 * z = −120, de canto a canto; el Bulevar a lo largo de `z` por x = 120, del Elevado al canto sur (§2.1).
 */
const AVENIDAS_DIBUJADAS: readonly (readonly ['elevado' | 'bulevar', number, number, number, number])[] = [
  ['elevado', -270, -120, 270, -120],
  ['bulevar', 120, -120, 120, 270],
];

/** Una plaza del plano: número (1-6), centro, nombre y distrito. */
export interface PlazaDelPlano {
  readonly numero: number;
  readonly x: number;
  readonly z: number;
  readonly nombre: string;
  readonly distrito: IdDeDistritoConNombre;
}

/** EL PLANO DE UNA TRAZA: sus distritos, sus plazas (en orden de número) y sus dos avenidas. */
export interface PlanoDeLaTraza {
  readonly distritos: readonly { readonly id: IdDeDistritoConNombre; readonly caja: CajaDelPlano }[];
  readonly plazas: readonly PlazaDelPlano[];
  readonly avenidas: readonly { readonly id: 'elevado' | 'bulevar'; readonly caja: CajaDelPlano }[];
}

/** Los planos ya hechos: 32 como mucho, uno por traza, y no dependen de nada más. */
const PLANOS = new Map<number, PlanoDeLaTraza>();

/**
 * EL PLANO DE LA TRAZA `traza` (0-31), de los datos de su traza dibujada y su simetría (ver la cabecera
 * del plano). Una traza fuera de rango da un plano vacío: el retablo no lanza.
 */
export function planoDeLaTraza(traza: number): PlanoDeLaTraza {
  const hecho = PLANOS.get(traza);
  if (hecho !== undefined) return hecho;
  const dibujada = Number.isInteger(traza) && traza >= 0 && traza < TRAZAS_POSIBLES ? TRAZAS_DE_LA_CIUDAD[Math.floor(traza / 8)] : undefined;
  if (dibujada === undefined) return { distritos: [], plazas: [], avenidas: [] };
  const s = traza % 8;
  const H = PLANO_DEL_TABLERO.huecoMaximo;
  const distritos = DISTRITOS_DIBUJADOS.map(([id, i0, i1, j0, j1]) => ({ id, caja: girarCaja(s, cajaDeLosHuecos(i0, i1, j0, j1)) }));
  const plazas: PlazaDelPlano[] = [];
  for (let j = -H; j <= H; j++) {
    const fila = dibujada.huecos[j + H] ?? '';
    for (let i = -H; i <= H; i++) {
      const letra = fila.charAt(i + H);
      const numero = letra.length === 1 ? '123456'.indexOf(letra) + 1 : 0;
      if (numero < 1) continue;
      const c = girar(s, PLANO_DEL_TABLERO.paso * i, PLANO_DEL_TABLERO.paso * j);
      let distrito: IdDeDistritoConNombre = 'casco';
      for (const [id, i0, i1, j0, j1] of DISTRITOS_DIBUJADOS) if (i >= i0 && i <= i1 && j >= j0 && j <= j1) distrito = id;
      plazas.push({ numero, x: c.x, z: c.z, nombre: nombreDePlaza(dibujada.nombres[numero - 1] ?? -1), distrito });
    }
  }
  plazas.sort((a, b) => a.numero - b.numero);
  const avenidas = AVENIDAS_DIBUJADAS.map(([id, x0, z0, x1, z1]) => ({ id, caja: girarCaja(s, { x0, z0, x1, z1 }) }));
  const plano: PlanoDeLaTraza = { distritos, plazas, avenidas };
  PLANOS.set(traza, plano);
  return plano;
}

/** Cómo se rotula la fase, para el panel y el aviso. */
function rotuloDeLaFase(m: MesaDelQuiebro): string {
  const f = m.fase;
  switch (f.tipo) {
    case 'reunion':
      return N.fases.reunion;
    case 'bajada':
      return N.fases.bajada;
    case 'oleada':
      return f.oleada > OLEADAS_FIJAS ? `${N.fases.propina} ${String(f.oleada - OLEADAS_FIJAS)}` : `${N.fases.oleada} ${String(f.oleada)}`;
    case 'pausa':
      return `${N.fases.pausa} tras ${f.oleada > OLEADAS_FIJAS ? `la ${N.fases.propina.toLowerCase()} ${String(f.oleada - OLEADAS_FIJAS)}` : `la ${N.fases.oleada.toLowerCase()} ${String(f.oleada)}`}`;
    case 'llamada':
      return N.fases.llamada;
    case 'recuento':
      return `${N.fases.recuento}: ${N.resultados[f.resultado]}`;
    case 'interrumpida':
      return N.fases.interrumpida;
    case 'final':
      return N.fases.final;
    default:
      return N.fases.cerrada;
  }
}

function elAviso(m: MesaDelQuiebro): string {
  const f = m.fase;
  switch (f.tipo) {
    case 'reunion':
      return `${N.fases.reunion}: cuando estéis, que alguien pulse ${N.mesa.empezar}.`;
    case 'bajada': {
      /* Dónde se baja: «Plaza · Distrito», como el rótulo de la Bajada (§2.7 de la ciudad abierta). */
      const p = m.traza === null || m.noche === null ? undefined : planoDeLaTraza(m.traza).plazas[bajadaDeLaNoche(m.noche) - 1];
      const donde = p === undefined ? '' : ` a ${p.nombre} · ${N.ciudad.distritos[p.distrito]}`;
      return `${N.fases.bajada}${donde}: la ciudad se escribe. Elige estilo si no lo has hecho.`;
    }
    case 'oleada':
      return `${rotuloDeLaFase(m)}: el Sistema entra en la plaza.`;
    case 'pausa':
      return seVotaTras(f.oleada) ? `${N.mesa.elegirRetoque} y votad: ${N.votos.llamar} o ${N.votos.aguantar}.` : `${N.mesa.elegirRetoque}.`;
    case 'llamada':
      return `${N.pantalla.suenaUnaCabina}: descolgad antes de que calle.`;
    case 'recuento':
      return N.resultados[f.resultado];
    case 'interrumpida':
      return 'Nadie juega la noche: reanudadla o rendíos.';
    case 'final':
      return nochesJugadas(m) < NOCHES_COMO_MUCHO ? `${N.mesa.otraNoche} o ${N.mesa.cerrarLaMesa.toLowerCase()}.` : `Esta mesa ya ha jugado sus ${String(NOCHES_COMO_MUCHO)} noches.`;
    default:
      return N.fases.cerrada;
  }
}

function panelesDelQuiebro(m: MesaDelQuiebro, sentados: LosSentados): TableroDeclarado['paneles'] {
  const paneles: TableroDeclarado['paneles'] = [];
  const nombre = (asiento: string): string => comoSeLlama(sentados, asiento);
  const r = m.reglamento;

  const noche: string[] = [rotuloDeLaFase(m)];
  if (m.noche !== null) {
    /* La avería y la Memoria, sólo si las hay: «Sin avería» en cada vista de la primera noche es ruido que pesa. */
    const sistema: string[] = [];
    if (r.averia !== 'ninguna') sistema.push(`Avería: ${N.averias[r.averia]}`);
    if (r.contramedida !== 'ninguna') sistema.push(`${N.cuentas.memoria}: ${N.contramedidas[r.contramedida]}`);
    if (sistema.length > 0) noche.push(sistema.join(' · '));
    noche.push(`Receta: ${N.recetas[m.noche.receta]} · ${N.cuentas.monedas}: ${String(m.monedas)}`);
  }
  paneles.push({ titulo: m.noche === null ? N.fases.reunion : `${N.cuentas.noche} ${String(m.noche.numero)} · ${nombreDelNivel(r.nivel)}`, lineas: noche });

  /*
   * Una línea por desvelado, y en la pausa lo que eligió o que aún elige al final de la suya (antes iba en
   * un panel aparte que repetía los seis nombres: pesaba lo que dos calles, y el retablo tiene 4 kB). Lo
   * que se le ofrece a cada cual va en sus `opciones`, con su botón.
   */
  const gente: string[] = [];
  for (let i = 0; i < m.asientos.length; i++) {
    const a = m.asientos[i] as AsientoDelQuiebro;
    const estilo = (r.asientos[i] as { estilo: IdDeEstilo }).estilo;
    /* En la Bajada el aguante que cuenta es el lleno del estilo elegido: el del punto de control es el de antes de cambiar. */
    const aguante = m.fase.tipo === 'bajada' ? aguanteLleno(estilo, r.averia) : a.control.aguante;
    let marcas = `${a.ausente ? ` · ${N.estados.ausente.toLowerCase()}` : ''}${a.salio ? ' · salió' : ''}${m.fase.tipo === 'bajada' && a.haElegido ? ' · listo' : ''}`;
    if (m.fase.tipo === 'pausa') {
      const tiene = (r.asientos[i] as { retoques: readonly IdDeRetoque[] }).retoques;
      const ultimo = tiene[tiene.length - 1];
      marcas += a.haElegido && ultimo !== undefined ? ` · ${N.retoques[ultimo]}${a.voto === null ? '' : ` · ${N.votos[a.voto]}`}` : ' · eligiendo';
    }
    gente.push(`${nombre(a.asiento)} (${N.estilos[estilo]}): ${String(a.puntos)} · ${String(a.control.esquirlas)} · ${String(aguante)}${marcas}`);
  }
  /* Las tres cifras de cada línea, dichas una vez en el título: seis veces «puntos, esquirlas, de aguante» eran 200 B del tope. */
  const leyenda = `${N.cuentas.puntos.toLowerCase()}, ${N.cuentas.esquirlas.toLowerCase()} y ${N.cuentas.aguante.toLowerCase()}`;
  if (gente.length > 0) paneles.push({ titulo: `${N.gente.desvelados}: ${leyenda}`, lineas: gente });

  const ultima = m.historial[m.historial.length - 1];
  if (esEntreNoches(m.fase) && ultima !== undefined && ultima.titulos.length > 0) {
    paneles.push({ titulo: 'Títulos', lineas: ultima.titulos.map((t) => `${N.titulos[t.titulo]}: ${nombre(t.asiento)}`) });
  }
  if (m.mejorNoche !== null) {
    const b = m.mejorNoche;
    paneles.push({ titulo: N.cuentas.mejorNoche, lineas: [`${nombre(b.asiento)}, ${N.cuentas.noche.toLowerCase()} ${String(b.noche)}: ${String(b.puntos)}`] });
  }
  if (m.historial.length > 0) {
    const ultimas = m.historial.slice(-3).map((h) => `${N.cuentas.noche} ${String(h.noche)} · ${nombreDelNivel(h.nivel)} · ${N.resultados[h.resultado]}`);
    paneles.push({ titulo: 'Noches', lineas: ultimas });
  }
  return paneles;
}

/** Los botones que valen igual para todos los sentados. Lo de cada uno (estilo, retoque) va suelto, en `opciones`. */
function accionesComunes(m: MesaDelQuiebro): TableroDeclarado['acciones'] {
  let comunes: Opcion[];
  switch (m.fase.tipo) {
    case 'reunion':
      comunes = [OPCION_EMPEZAR];
      break;
    case 'bajada':
    case 'oleada':
    case 'pausa':
    case 'llamada':
      comunes = [OPCION_RENDIRSE];
      break;
    case 'interrumpida':
      comunes = [OPCION_REANUDAR, OPCION_RENDIRSE];
      break;
    case 'recuento':
    case 'final':
      comunes = opcionesEntreNoches(m);
      break;
    default:
      comunes = [];
  }
  return comunes.map((o) => ({ id: o.id, rotulo: o.rotulo, ayuda: o.ayuda, disponible: true, toque: { tipo: o.tipo, carga: o.carga } }));
}

/** Una cara del plano: un rectángulo, sin toque. */
function cara(id: string, c: CajaDelPlano, relleno: string, rotulo: string, destacada: boolean): TableroDeclarado['caras'][number] {
  const u = PLANO_DEL_TABLERO.unidad;
  return {
    id,
    puntos: [
      { x: c.x0 / u, y: c.z0 / u },
      { x: c.x1 / u, y: c.z0 / u },
      { x: c.x1 / u, y: c.z1 / u },
      { x: c.x0 / u, y: c.z1 / u },
    ],
    relleno,
    borde: COLOR.borde,
    rotulo,
    cifra: '',
    destacada,
    toque: null,
  };
}

/**
 * EL TABLERO: el respaldo honrado del escritorio (y de cualquier cliente que no pinte la escena). La
 * ciudad de la mesa —sus cinco distritos, sus seis plazas con las de la noche destacadas y sus dos
 * avenidas (ver `PLANO_DEL_TABLERO`)—, el marcador y la noche en paneles, y los botones que
 * valen para todos. En la reunión todavía no hay traza: la ciudad sin escribir y la Glorieta del
 * Relojero, que está en el centro de todas. 4 kB como mucho: se manda en cada vista.
 */
export function tableroDelQuiebro(m: MesaDelQuiebro, sentados: LosSentados): TableroDeclarado {
  const P = PLANO_DEL_TABLERO;
  const caras: TableroDeclarado['caras'] = [];
  const lineas: TableroDeclarado['lineas'] = [];
  const plaza = (x: number, z: number): CajaDelPlano => ({ x0: x - P.medioSolar, z0: z - P.medioSolar, x1: x + P.medioSolar, z1: z + P.medioSolar });
  if (m.traza === null || m.noche === null) {
    caras.push(cara('ciudad', { x0: -P.borde, z0: -P.borde, x1: P.borde, z1: P.borde }, COLOR.ciudad, '', false));
    caras.push(cara(`p${String(PLAZA_DE_LA_PRIMERA_BAJADA)}`, plaza(0, 0), COLOR.plaza, nombreDePlaza(0), false));
  } else {
    const plano = planoDeLaTraza(m.traza);
    const fallos = m.noche.fallos;
    for (const d of plano.distritos) caras.push(cara(d.id, d.caja, COLOR_DEL_DISTRITO[d.id], N.ciudad.distritos[d.id], false));
    for (const p of plano.plazas) {
      const deLaNoche = fallos.indexOf(p.numero) >= 0;
      caras.push(cara(`p${String(p.numero)}`, plaza(p.x, p.z), deLaNoche ? COLOR.fallo : COLOR.plaza, p.nombre, deLaNoche));
    }
    const u = P.unidad;
    for (const a of plano.avenidas) lineas.push({ id: a.id, desde: { x: a.caja.x0 / u, y: a.caja.z0 / u }, hasta: { x: a.caja.x1 / u, y: a.caja.z1 / u }, color: COLOR.avenida, grosor: 3, tenue: false, toque: null });
  }
  /* Un paso de margen alrededor del cerco. */
  const borde = P.borde / P.unidad + 1;
  return {
    vista: { x: -borde, y: -borde, ancho: 2 * borde, alto: 2 * borde },
    caras,
    lineas,
    nudos: [],
    acciones: accionesComunes(m),
    paneles: panelesDelQuiebro(m, sentados),
    aviso: elAviso(m),
  };
}
