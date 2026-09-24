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
 * ═══ EN LA REUNIÓN SÓLO SE PUEDE EMPEZAR ═══
 *
 * El diseño elige el estilo «en la reunión», y aquí se elige en la BAJADA y entre noches. No es un
 * capricho: la mesa de la plataforma se cierra a los que llegan en cuanto un asiento cambia el estado
 * (`Mesa.empezada`, en `server/src/arcade/mesas.ts`), así que un estilo elegido mientras se espera a
 * los amigos les dejaría fuera con el código en la mano. Con `empezar` como único movimiento de la
 * reunión, «al empezar, la mesa se cierra» (§5.1) es literal. El aparato guarda lo que se eligió en
 * el vestíbulo y lo manda en cuanto ve la Bajada (6 s, de sobra); lo mismo el aviso de aprendiz.
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
 * presentes, el productor declararía otro límite (de la glorieta de 60 a la de 48 al pasar de cuatro
 * a tres) y la sala lo aplicaría sin empezar fase: quien estuviera entre los 24 y los 30 m se quedaría
 * clavado fuera, con cada paso corregido. El diseño lo dice al revés: el ausente «deja de contar en la
 * oleada siguiente» (§3), y la oleada escala con los presentes «al empezar» (§4.10). Así que el aviso
 * se guarda en el estado (`avisados`, fuera de la vista) y se vuelve `ausente` al cambiar de fase; en
 * la pausa, al avisado ya no se le espera. Dentro de una fase los presentes sólo pueden crecer —quien
 * vuelve y mueve—, y un límite que crece no deja a nadie fuera.
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
import { barajar, sembrar } from '../../mecanicas/azar';
import { canonico } from '../../mecanicas/canonico';
import { semillaDelCodigo } from '../../mecanicas/semilla';
import type { TableroDeclarado } from '../../mecanicas/tablero-declarado';
import { IDS_DE_ESTILO, IDS_DE_RECETA, IDS_DE_RETOQUE, IDS_DE_TITULO, NOMBRES_DEL_QUIEBRO, PRIMER_NIVEL, nombreDelNivel } from './quiebro-nombres';
import type { IdDeAveria, IdDeEstilo, IdDeReceta, IdDeRetoque, IdDeTitulo } from './quiebro-nombres';
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
  limiteDeLaFase,
  monedasAlEmpezar,
  nivelTrasLaNoche,
  porCiento,
  presentesDeLaMesa,
  rondaDeLaFase,
  salenParaGanar,
} from './quiebro-reglas';
import {
  ASIENTOS_COMO_MUCHO,
  MOVIMIENTO_DEL_QUIEBRO,
  NOCHES_COMO_MUCHO,
  OLEADAS_COMO_MUCHO,
  OLEADAS_FIJAS,
  PRIMERA_PAUSA_CON_VOTO,
  QUIEBROS_DE_APRENDIZ,
  RETOQUES_OFRECIDOS,
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
      salida = c === null ? rechazar(actual, 'Ese estilo no existe.') : cambiarDeEstilo(mesa, i, c.id);
      break;
    }
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
  const tipos: readonly string[] = [EMPEZAR, ESTILO, APRENDIZ, ELEGIR, RENDIRSE, REANUDAR, OTRA_NOCHE, CERRAR];
  if (tipos.indexOf(movimiento.tipo) < 0) return 'El Quiebro no conoce ese movimiento.';
  const f = m.fase.tipo;
  switch (movimiento.tipo) {
    case EMPEZAR:
      return 'La noche ya ha empezado.';
    case ESTILO:
      if (f === 'reunion') return 'El estilo se elige en la Bajada: si se eligiera aquí, la mesa se cerraría a los que aún no han llegado.';
      if (f !== 'bajada' && !esEntreNoches(m.fase)) return 'El estilo se elige en la Bajada o entre noches.';
      return puedeCambiarDeEstilo(m, i)
        ? 'Ese estilo ya lo llevas, o no existe.'
        : f === 'bajada'
          ? 'Ya has cambiado de estilo al bajar: uno por Bajada, y otro entre noches.'
          : 'Ya has cambiado de estilo entre noches: uno aquí, y otro al bajar.';
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
 * mesa) y los puntos de control a lleno. Los estilos siguen; los retoques, los puntos y los contadores
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
  return {
    fase,
    reloj: relojDe(numero, fase),
    noche: { numero, receta: recetaDeLaNoche(azar, numero), plantilla: 'glorieta' },
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
 * estilo nuevo llega al abrir la oleada 1 o al empezar la noche siguiente.
 */
function cambiarDeEstilo(m: MesaDelQuiebro, i: number, estilo: IdDeEstilo): MesaDelQuiebro {
  const asientos = m.reglamento.asientos.slice();
  const eleccion = asientos[i] as { asiento: string; estilo: IdDeEstilo; retoques: readonly IdDeRetoque[] };
  asientos[i] = { ...eleccion, estilo };
  return { ...m, reglamento: { ...m.reglamento, asientos } };
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

/** ¿Han elegido todos aquellos a los que se espera? Sin nadie a quien esperar, no: se espera al reloj. */
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

/** `arcade:reloj {id}`: venció el reloj de la fase. Sólo vale el de la fase en curso. */
function elReloj(e: EstadoDelQuiebro, carga: unknown, ctx: ContextoMovimiento): EstadoDelQuiebro | Rechazo<EstadoDelQuiebro> {
  const c = leerCargaDeReloj(carga, ctx.quien);
  if (c === null) return rechazar(e, 'El reloj no tiene la forma de la Liza, o lo manda alguien que no es la sala.');
  const m = e.mesa;
  if (m.reloj === null || c.id !== m.reloj.id) {
    return rechazar(e, `El reloj «${c.id}» no es el de la fase en curso: llega repetido o atrasado.`);
  }
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
const OPCION_RENDIRSE = opcionSinCarga('rendirse', RENDIRSE, N.mesa.rendirse, 'La noche se da por perdida para todos, y el nivel de la siguiente baja.');
const OPCION_REANUDAR = opcionSinCarga('reanudar', REANUDAR, N.mesa.reanudar, 'Vuelve a la calle: la fase en que se quedó la noche empieza otra vez desde el último punto de control.');
const OPCION_OTRA_NOCHE = opcionSinCarga('otra-noche', OTRA_NOCHE, N.mesa.otraNoche, 'Otro barrio en la misma mesa. El nivel sube si ganasteis y baja si no.');
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
      return [OPCION_RENDIRSE, ...estilos, ...(puedeAprender(m, i) ? [OPCION_APRENDIZ] : [])];
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
 * EL PLANO QUE SE DIBUJA, en metros (x al este, z al sur, que en el dibujo es la `y` hacia abajo: el
 * norte queda arriba). Son las cifras de la traza de `quiebro-barrio.ts`, escritas aquí para que la
 * mesa no cargue el barrio entero —su módulo monta el grafo al cargarse, y la app instala todos los
 * arcades al arrancar—. `verify:quiebro` comprueba que siguen siendo las del barrio.
 *
 * Lo que NO se dibuja, y por qué: los edificios, las cabinas y el refugio salen de (código, noche), y
 * el código de la mesa no llega nunca al reductor ni a la proyección (`ContextoMovimiento` no lo
 * lleva, y la semilla de la mesa es otra). Pintar una cabina que no es la que suena sería peor que no
 * pintarla. La traza —manzanas, glorieta y calles— no depende del código, y ésa sí va.
 */
export const PLANO_DEL_TABLERO = {
  medioBarrio: 78,
  ladoDeManzana: 36,
  solares: [-66, -18, 30],
  /** Los ejes de las cuatro calles de cada sentido (el centro de su calzada). */
  calles: [-72, -24, 24, 72],
  laGlorieta: 4,
  limites: { glorieta48: 24, glorieta60: 30, barrio: 78 },
} as const;

/** Los colores, en la forma corta de tres cifras: el tablero viaja en cada vista y cada byte cuenta doce veces. */
const COLOR = {
  manzana: '#233',
  glorieta: '#243',
  borde: '#445',
  calle: '#567',
  limite: '#fb0',
} as const;

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
    case 'bajada':
      return `${N.fases.bajada}: el barrio se escribe. Elige estilo si no lo has hecho.`;
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
    noche.push(`Avería: ${N.averias[r.averia]} · ${N.cuentas.memoria}: ${N.contramedidas[r.contramedida]}`);
    noche.push(`Receta: ${N.recetas[m.noche.receta]} · ${N.cuentas.monedas}: ${String(m.monedas)}`);
  }
  paneles.push({ titulo: m.noche === null ? N.fases.reunion : `${N.cuentas.noche} ${String(m.noche.numero)} · ${nombreDelNivel(r.nivel)}`, lineas: noche });

  const gente: string[] = [];
  for (let i = 0; i < m.asientos.length; i++) {
    const a = m.asientos[i] as AsientoDelQuiebro;
    const estilo = (r.asientos[i] as { estilo: IdDeEstilo }).estilo;
    /* En la Bajada el aguante que cuenta es el lleno del estilo elegido: el del punto de control es el de antes de cambiar. */
    const aguante = m.fase.tipo === 'bajada' ? aguanteLleno(estilo, r.averia) : a.control.aguante;
    const marcas = `${a.ausente ? ` · ${N.estados.ausente.toLowerCase()}` : ''}${a.salio ? ' · salió' : ''}`;
    gente.push(`${nombre(a.asiento)} (${N.estilos[estilo]}): ${String(a.puntos)} ${N.cuentas.puntos.toLowerCase()}, ${String(a.control.esquirlas)} ${N.cuentas.esquirlas.toLowerCase()}, ${String(aguante)} de ${N.cuentas.aguante.toLowerCase()}${marcas}`);
  }
  if (gente.length > 0) paneles.push({ titulo: N.gente.desvelados, lineas: gente });

  if (m.fase.tipo === 'pausa') {
    /* Lo que eligió cada uno, o que aún elige. Lo que se le ofrece a cada cual va en sus `opciones`, con su botón. */
    const retoques: string[] = [];
    for (let i = 0; i < m.asientos.length; i++) {
      const a = m.asientos[i] as AsientoDelQuiebro;
      const tiene = (r.asientos[i] as { retoques: readonly IdDeRetoque[] }).retoques;
      const ultimo = tiene[tiene.length - 1];
      retoques.push(
        a.haElegido && ultimo !== undefined
          ? `${nombre(a.asiento)}: ${N.retoques[ultimo]}${a.voto === null ? '' : ` · ${N.votos[a.voto]}`}`
          : `${nombre(a.asiento)}: eligiendo`,
      );
    }
    paneles.push({ titulo: 'Retoques', lineas: retoques });
  }

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

/** Una línea del plano, sin toque. */
function linea(id: string, desde: { x: number; y: number }, hasta: { x: number; y: number }, color: string, tenue: boolean): TableroDeclarado['lineas'][number] {
  return { id, desde, hasta, color, grosor: 1, tenue, toque: null };
}

/**
 * EL TABLERO: el respaldo honrado del escritorio (y de cualquier cliente que no pinte la escena). La
 * traza del barrio —las ocho manzanas, la glorieta y las ocho calles por su eje— con el límite de la
 * fase en ámbar, el marcador y la noche en paneles, y los botones que valen para todos. Unos 4 kB: se
 * manda en cada vista.
 */
export function tableroDelQuiebro(m: MesaDelQuiebro, sentados: LosSentados): TableroDeclarado {
  const P = PLANO_DEL_TABLERO;
  const caras: TableroDeclarado['caras'] = [];
  for (let fila = 0; fila < 3; fila++) {
    for (let columna = 0; columna < 3; columna++) {
      const indice = fila * 3 + columna;
      const x0 = P.solares[columna] as number;
      const z0 = P.solares[fila] as number;
      const x1 = x0 + P.ladoDeManzana;
      const z1 = z0 + P.ladoDeManzana;
      const esGlorieta = indice === P.laGlorieta;
      caras.push({
        id: `m${String(indice)}`,
        puntos: [
          { x: x0, y: z0 },
          { x: x1, y: z0 },
          { x: x1, y: z1 },
          { x: x0, y: z1 },
        ],
        relleno: esGlorieta ? COLOR.glorieta : COLOR.manzana,
        borde: COLOR.borde,
        rotulo: esGlorieta ? N.lugares.glorieta : '',
        cifra: '',
        destacada: false,
        toque: null,
      });
    }
  }
  const lineas: TableroDeclarado['lineas'] = [];
  const b = P.medioBarrio;
  for (let k = 0; k < P.calles.length; k++) {
    const eje = P.calles[k] as number;
    lineas.push(linea(`c${String(k)}`, { x: -b, y: eje }, { x: b, y: eje }, COLOR.calle, true));
    lineas.push(linea(`c${String(k + P.calles.length)}`, { x: eje, y: -b }, { x: eje, y: b }, COLOR.calle, true));
  }
  if (esFaseDeJuego(m.fase) || m.fase.tipo === 'interrumpida') {
    const lado = P.limites[limiteDeLaFase(m.fase, presentesDeLaMesa(m.asientos))];
    const esquinas = [
      { x: -lado, y: -lado },
      { x: lado, y: -lado },
      { x: lado, y: lado },
      { x: -lado, y: lado },
    ];
    for (let k = 0; k < 4; k++) {
      lineas.push(linea(`l${String(k)}`, esquinas[k] as { x: number; y: number }, esquinas[(k + 1) % 4] as { x: number; y: number }, COLOR.limite, false));
    }
  }
  const borde = P.medioBarrio + 4;
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
