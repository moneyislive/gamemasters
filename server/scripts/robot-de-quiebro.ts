/**
 * EL ROBOT DE EL QUIEBRO: juega noches enteras de una mesa sin servidor, haciendo él de sala.
 *
 * ═══ PARA QUÉ, SI YA ESTÁ EL ROBOT GENÉRICO ═══
 *
 * El genérico (`robot-generico.ts`) juega cualquier arcade con lo que la plataforma sabe de todos:
 * `opciones()` y `seAcabo`. En El Quiebro eso es la mitad de la mesa: sin sala no llega nunca un
 * `arcade:ronda`, así que no pasa de la Bajada, no abre ninguna pausa, no vota, no cobra una esquirla
 * y no sube de nivel. Este robot hace lo que la sala hace por la puerta de la plataforma —cierra la
 * Bajada y las pausas con su reloj, cierra cada oleada y la Llamada con una ronda cuyas cuentas
 * cuadran con el reglamento de la vista, da por ausente a quien se le va el canal— y los asientos
 * eligen de lo que la mesa les ofrece. Así recorre las fases que el genérico no ve, con los números
 * que las cambian, y deja por el camino cientos de vistas de todas las fases para que el comprobador
 * les pase el lector estricto y el productor de la Liza.
 *
 * ═══ LA GENTE QUE SE VA Y VUELVE, COMO LA VE LA SALA ═══
 *
 * A veces a un asiento se le va el canal: antes de un combate (y la sala lo avisa en cuanto empieza) o
 * a media pelea, después de haber jugado (y la sala lo avisa antes de cerrarla). Mientras no está no
 * elige, no cambia de estilo y su fila de la ronda es la de un cuerpo quieto: sin quiebros, sin puntos,
 * sin salir. La sala lo vuelve a avisar en cada fase de combate, una vez, y la mesa lo tiene que tomar
 * sin efecto. A veces vuelve: antes de un combate, y entonces juega (y la ronda lo delata), o en una
 * pausa, y entonces elige. Es lo que la mesa hace con los ausentes, recorrido con una sala que se porta
 * como la de verdad.
 *
 * ═══ Y LAS TRAVESURAS ═══
 *
 * Con `travesuras`, además, prueba lo que una sala rota o un aparato viejo mandaría: la ronda de otra
 * oleada, un veredicto firmado por un asiento, cuentas que no cuadran, un estilo en la reunión, un
 * segundo cambio de estilo, el aprendiz fuera de la primera noche, dos tics perezosos seguidos. Lo que
 * espera que se rechace lo apunta como rechazo esperado; lo que sale distinto de lo que esperaba
 * —rechazado, aceptado o sin efecto—, como INESPERADO, que es lo que el comprobador exige vacío.
 *
 * ═══ Y LO QUE UNA SALA DE VERDAD MANDA TARDE ═══
 *
 * El reloj de una fase que la mesa ya dejó —la pausa en que eligieron todos antes de que venciera, el de
 * 15 s de una Bajada en que ya estaban todos listos— lo manda la sala de verdad a menudo, porque lee la
 * vista una vez por segundo. La mesa lo tiene que tomar SIN EFECTO, no rechazarlo: el robot lo manda así,
 * a veces, y espera el mismo estado. Un reloj de una fase que no existe también entra sin efecto: ninguna
 * sala lo manda, pero no es de nadie ni cambia nada.
 *
 * ═══ CORRE EN CUALQUIER MOTOR ═══
 *
 * Sin `node:`, sin `class`, sin reloj ni `Math.random`, y sin cierres sobre el `let` de un bucle
 * (Hermes 0.12 no lo liga por iteración): los pasos son funciones de nivel de módulo que reciben lo
 * que usan. El azar es el de `shared/mecanicas/azar.ts`, sembrado con la semilla del robot y aparte
 * del de la mesa (`ctx.azar`), que el juego usa para sus propios sorteos.
 */
import { aplicarConMotivo, movimientoDeTic } from '../../shared/arcade';
import type { ContextoMovimiento, Movimiento, MovimientoRegistrado, Opcion } from '../../shared/arcade';
import { enteroEntre, sembrar } from '../../shared/mecanicas/azar';
import type { Azar } from '../../shared/mecanicas/azar';
import { canonico } from '../../shared/mecanicas/canonico';
import { avanzarElQuiebro, opcionesDeLaMesa, proyectarElQuiebro } from '../../shared/arcade/juegos/quiebro';
import type { EstadoDelQuiebro } from '../../shared/arcade/juegos/quiebro';
import { componerReglamento, presentesDeLaMesa, rondaDeLaFase, salenParaGanar } from '../../shared/arcade/juegos/quiebro-reglas';
import { ESQUIRLAS_COMO_MUCHO, NOCHES_COMO_MUCHO } from '../../shared/arcade/juegos/quiebro-vista';
import type { ResultadoDeNoche, VistaDelQuiebro } from '../../shared/arcade/juegos/quiebro-vista';

/** Los nombres con que se sienta el robot: la vista se compone con ellos, como en la mesa. */
const NOMBRES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fermín'];

/** Cuántos pasos como mucho: una mesa que no acaba no bloquea el comprobador. */
export const TOPE_DE_PASOS_DEL_QUIEBRO = 5000;

/**
 * Cómo juega la noche la sala que simula el robot:
 *   · `gana`: las oleadas se ganan (alguna se aguanta por reloj) y en la Llamada sale la mitad o más;
 *   · `pierde`: la noche se pierde, en una oleada o en la Llamada;
 *   · `mezcla`: cada noche, a suertes.
 */
export type PoliticaDelRobotDelQuiebro = 'gana' | 'pierde' | 'mezcla';

export interface OpcionesDelRobotDelQuiebro {
  readonly asientos: number;
  readonly semilla: number;
  /** Cuántas noches juega antes de cerrar la mesa (1 a 10). */
  readonly noches: number;
  readonly politica: PoliticaDelRobotDelQuiebro;
  /** Mandar además lo que una sala rota o un aparato viejo mandaría, esperando que se rechace. */
  readonly travesuras: boolean;
}

/** Una noche jugada, como la cuenta el robot. */
export interface NocheDelRobot {
  readonly numero: number;
  readonly nivel: number;
  readonly resultado: ResultadoDeNoche;
  /** Entradas del diario de la mesa desde que empezó esta noche hasta que empezó la siguiente (o se cerró). */
  readonly entradas: number;
  /** Esas mismas entradas, por tipo de movimiento. */
  readonly porTipo: Readonly<Record<string, number>>;
}

/** Un rechazo, esperado o no. */
export interface RechazoDelRobot {
  readonly quien: string | null;
  readonly tipo: string;
  readonly motivo: string;
  readonly fase: string;
}

/** Lo que pasó con la gente que se fue y volvió, para que el comprobador vea que se recorrió. */
export interface AusentesDelRobot {
  /** Ausentes que la mesa apuntó (entraron). */
  readonly avisados: number;
  /** Ausentes repetidos que la mesa tomó sin efecto, como debe. */
  readonly repetidos: number;
  /** Asientos ausentes que dejaron de serlo al cerrarse una ronda en la que jugaron. */
  readonly vuelvenJugando: number;
  /** Asientos ausentes que dejaron de serlo al mover en la mesa. */
  readonly vuelvenMoviendo: number;
  /** Veces que un asiento se fue a media pelea, habiendo jugado. */
  readonly seVanJugando: number;
}

export interface PartidaDelRobotDelQuiebro {
  readonly asientos: readonly string[];
  readonly estado: EstadoDelQuiebro | undefined;
  /** Lo que la mesa habría guardado: sólo lo que cambió el estado, con su contexto. */
  readonly diario: MovimientoRegistrado[];
  /** La vista (la del espectador, que es la de todos) tras cada paso aceptado. */
  readonly vistas: VistaDelQuiebro[];
  readonly noches: NocheDelRobot[];
  /** Las travesuras, rechazadas como se esperaba. */
  readonly rechazosEsperados: RechazoDelRobot[];
  /** Lo que no salió como el robot esperaba: vacío en una partida sana. */
  readonly inesperados: string[];
  /** Cuántas veces entró cada tipo de movimiento aceptado. */
  readonly aceptados: Record<string, number>;
  /** Las fases por las que pasó la mesa (`tipo` y, en su caso, la oleada), sin repetir. */
  readonly fases: string[];
  readonly ausentes: AusentesDelRobot;
  readonly terminada: boolean;
  readonly pasos: number;
  /** El estado final en forma canónica. */
  readonly huella: string;
}

/* ─── LA MESA DE MENTIRA ─────────────────────────────────────────────────── */

/** Lo que se espera de un movimiento: que entre, que se rechace con motivo, o que no haga nada. */
type Espera = 'entra' | 'rechazo' | 'sinEfecto';

/** Lo que el robot lleva de una partida. Un objeto que las funciones del paso reciben y cambian. */
interface Partida {
  asientos: string[];
  sentados: { asiento: string; nombre: string }[];
  semillaDeLaMesa: number;
  estado: EstadoDelQuiebro | undefined;
  tic: number;
  azar: Azar;
  diario: MovimientoRegistrado[];
  vistas: VistaDelQuiebro[];
  noches: NocheDelRobot[];
  /** Dónde empezó la noche en curso en el diario. */
  empiezaEn: number;
  rechazosEsperados: RechazoDelRobot[];
  inesperados: string[];
  aceptados: Record<string, number>;
  fases: string[];
  pasos: number;
  /** La noche en curso, ¿se gana? Se decide al empezarla. */
  seGana: boolean;
  /** Si se pierde, en qué oleada (1-3) o en la Llamada (0). */
  seCaeEn: number;
  /** Travesuras que ya se hicieron en esta partida, para no repetir las de una vez. */
  hechas: Record<string, true>;
  /** Los asientos que están sin canal ahora mismo. */
  sinCanal: string[];
  /** Los que se fueron a media pelea en la fase en curso: su fila de la ronda lleva lo que jugaron. */
  seFueronJugando: string[];
  ausentes: { avisados: number; repetidos: number; vuelvenJugando: number; vuelvenMoviendo: number; seVanJugando: number };
}

function unoEntre(p: Partida, desde: number, hasta: number): number {
  const t = enteroEntre(p.azar, desde, hasta);
  p.azar = t.azar;
  return t.valor;
}

/** ¿Sale uno de cada `n`? */
function unoDeCada(p: Partida, n: number): boolean {
  return n <= 1 ? true : unoEntre(p, 1, n) === 1;
}

function vistaDe(p: Partida): VistaDelQuiebro {
  return proyectarElQuiebro(p.estado, null, p.sentados);
}

function nombreDeFase(v: VistaDelQuiebro): string {
  const f = v.fase;
  if (f.tipo === 'oleada' || f.tipo === 'pausa') return `${f.tipo}-${String(f.oleada)}`;
  if (f.tipo === 'recuento') return `recuento-${f.resultado}`;
  if (f.tipo === 'interrumpida') return `interrumpida-${f.en.tipo}`;
  return f.tipo;
}

/** Los ausentes de la mesa ahora, por asiento. */
function ausentesDeLaMesa(p: Partida): string[] {
  return p.estado === undefined ? [] : p.estado.mesa.asientos.filter((a) => a.ausente).map((a) => a.asiento);
}

/**
 * MANDA UN MOVIMIENTO COMO LA MESA: el tic con el reloj adelantado antes, el rechazo descartado
 * entero, y lo que no cambia nada también (ni diario ni revisión). Devuelve si ENTRÓ. `espera` dice
 * qué esperaba el robot; lo que sale de otra manera se apunta como inesperado.
 */
function mandar(p: Partida, quien: string | null, movimiento: Movimiento, espera: Espera): boolean {
  p.pasos++;
  const esTic = movimiento.tipo === movimientoDeTic().tipo;
  const enTic = esTic ? p.tic + 1 : p.tic;
  const ctx: ContextoMovimiento = { quien, azar: p.semillaDeLaMesa, tic: enTic, asientos: p.asientos };
  const faseAntes = p.estado === undefined ? 'sin-estado' : p.estado.mesa.fase.tipo;
  const salida = aplicarConMotivo(avanzarElQuiebro, p.estado, movimiento, ctx);
  const que = `${quien ?? 'la sala'} · ${movimiento.tipo} ${JSON.stringify(movimiento.carga) ?? ''}`;
  const hubo: Espera = salida.motivo !== null ? 'rechazo' : salida.estado === p.estado ? 'sinEfecto' : 'entra';
  if (hubo !== espera) p.inesperados.push(`${hubo} y se esperaba ${espera}, en ${faseAntes}: ${que}${salida.motivo === null ? '' : ` → ${salida.motivo}`}`);
  if (hubo === 'rechazo' && espera === 'rechazo') p.rechazosEsperados.push({ quien, tipo: movimiento.tipo, motivo: salida.motivo ?? '', fase: faseAntes });
  if (hubo !== 'entra') return false;
  const ausentesAntes = ausentesDeLaMesa(p);
  if (esTic) p.tic = enTic;
  p.estado = salida.estado;
  p.diario.push({ movimiento, ctx });
  p.aceptados[movimiento.tipo] = (p.aceptados[movimiento.tipo] ?? 0) + 1;
  /* Quién dejó de ser ausente con esto, y por qué: una ronda en la que jugó, o moviendo él. */
  const ausentesAhora = ausentesDeLaMesa(p);
  for (const a of ausentesAntes) {
    if (ausentesAhora.indexOf(a) >= 0) continue;
    if (movimiento.tipo === 'arcade:ronda') p.ausentes.vuelvenJugando++;
    else if (quien === a) p.ausentes.vuelvenMoviendo++;
    else p.inesperados.push(`${a} deja de ser ausente con ${que}, que ni es una ronda ni es suyo`);
  }
  const v = vistaDe(p);
  p.vistas.push(v);
  const f = nombreDeFase(v);
  if (p.fases.indexOf(f) < 0) p.fases.push(f);
  return true;
}

/** Lo que la mesa le ofrece a un asiento ahora, por la misma función que usa su portillo. */
function ofrecidas(p: Partida, quien: string): Opcion[] {
  return p.estado === undefined ? [] : opcionesDeLaMesa(p.estado.mesa, quien);
}

/** Hace una opción de ese tipo si se ofrece; si hay varias, una a suertes. */
function hacer(p: Partida, quien: string, tipo: string): boolean {
  const deEse = ofrecidas(p, quien).filter((o) => o.tipo === tipo);
  if (deEse.length === 0) return false;
  const o = deEse[unoEntre(p, 0, deEse.length - 1)] as Opcion;
  return mandar(p, quien, { tipo: o.tipo, carga: o.carga }, 'entra');
}

/** Los que tienen canal: los únicos que mueven. Siempre hay uno como poco. */
function conectados(p: Partida): string[] {
  return p.asientos.filter((a) => p.sinCanal.indexOf(a) < 0);
}

function unConectado(p: Partida): string {
  const c = conectados(p);
  return c[unoEntre(p, 0, c.length - 1)] as string;
}

/* ─── LA SALA DE MENTIRA: QUIÉN SE VA, QUIÉN VUELVE, LOS AVISOS ──────────── */

/**
 * ANTES DE UN COMBATE: alguno vuelve (y jugará éste), alguno se va (antes, o a media pelea después de
 * haber jugado). Nunca se quedan todos sin canal: sin nadie, la sala no existe.
 */
function moverLaGente(p: Partida): void {
  p.seFueronJugando = [];
  if (p.sinCanal.length > 0 && unoDeCada(p, 3)) p.sinCanal.splice(unoEntre(p, 0, p.sinCanal.length - 1), 1);
  const c = conectados(p);
  if (c.length > 1 && unoDeCada(p, 5)) {
    const a = c[unoEntre(p, 0, c.length - 1)] as string;
    p.sinCanal.push(a);
    if (unoDeCada(p, 2)) {
      p.seFueronJugando.push(a);
      p.ausentes.seVanJugando++;
    }
  }
}

/**
 * LA SALA AVISA A LOS QUE ESTÁN SIN CANAL, una vez por asiento en esta fase de combate. La mesa toma
 * el aviso de quien ya consta —ausente, o avisado en esta misma fase— sin efecto.
 */
function avisarALosQueNoEstan(p: Partida): void {
  for (const a of p.sinCanal) {
    const e = p.estado;
    if (e === undefined) return;
    const asiento = e.mesa.asientos.find((x) => x.asiento === a);
    const yaConsta = asiento !== undefined && (asiento.ausente || e.avisados.indexOf(a) >= 0);
    if (mandar(p, null, { tipo: 'arcade:ausente', carga: { a } }, yaConsta ? 'sinEfecto' : 'entra')) p.ausentes.avisados++;
    else if (yaConsta) p.ausentes.repetidos++;
  }
}

/* ─── LA SALA DE MENTIRA: LAS RONDAS ─────────────────────────────────────── */

/**
 * UNA RONDA QUE CUADRA con la vista: aguante hasta el lleno de cada estilo, limpios que no pasan de
 * las amenazas, reapariciones que no pasan de las caídas, esquirlas hasta el tope, monedas que sólo
 * bajan. Quien no tuvo canal en toda la fase acaba como empezó y sin haber hecho nada. En la Llamada
 * salen, de los que tienen canal, los que toca según la política —la mitad de los presentes o más
 * para ganarla—, y si no hay bastantes con canal, se pierde.
 */
function rondaQueCuadra(p: Partida, v: VistaDelQuiebro, quiere: 'ganada' | 'aguantada' | 'perdida'): Movimiento {
  const c = componerReglamento(v);
  const n = v.noche === null ? 0 : (rondaDeLaFase(v.noche.numero, v.fase) ?? 0);
  const enLaLlamada = v.fase.tipo === 'llamada';
  const hacenFalta = salenParaGanar(presentesDeLaMesa(v.asientos));
  const puedenSalir = conectados(p).length;
  const resultado = enLaLlamada && quiere === 'ganada' && puedenSalir < hacenFalta ? 'perdida' : quiere;
  /* Cuántos salen: en una Llamada ganada, la mitad o más; en una perdida, menos de la mitad. */
  const quierenSalir = resultado === 'ganada' ? hacenFalta + unoEntre(p, 0, puedenSalir - hacenFalta) : unoEntre(p, 0, hacenFalta - 1);
  let salen = 0;
  let reapariciones = 0;
  const cuentas: number[][] = [];
  for (let i = 0; i < v.asientos.length; i++) {
    const a = v.asientos[i] as VistaDelQuiebro['asientos'][number];
    const lleno = c === null ? 1 : (c.asientos[i] as { aguante: number }).aguante;
    const sinCanal = p.sinCanal.indexOf(a.asiento) >= 0 && p.seFueronJugando.indexOf(a.asiento) < 0;
    if (sinCanal) {
      /* Un cuerpo quieto: nadie le pega (está ausente momentáneo) y no hace nada. */
      const quieto = a.control.aguante < 1 ? 1 : a.control.aguante > lleno ? lleno : a.control.aguante;
      cuentas.push([i + 1, 0, a.control.esquirlas, 0, resultado === 'perdida' ? 0 : quieto, a.control.foco > 100 ? 100 : a.control.foco, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      continue;
    }
    const amenazas = unoEntre(p, 0, 12);
    const limpios = unoEntre(p, 0, amenazas);
    const racha = unoEntre(p, 0, limpios);
    const caidas = unoEntre(p, 0, 1);
    const reaparece = caidas > 0 && reapariciones < v.monedas ? unoEntre(p, 0, 1) : 0;
    reapariciones += reaparece;
    const rematadas = v.fase.tipo === 'oleada' && v.fase.oleada >= 2 ? unoEntre(p, 0, 2) : 0;
    const choques = unoEntre(p, 0, 3);
    const rescates = unoEntre(p, 0, 1);
    const esquivas = unoEntre(p, limpios, limpios + 4);
    let lleva = a.control.esquirlas + rematadas * 3;
    if (lleva > ESQUIRLAS_COMO_MUCHO) lleva = ESQUIRLAS_COMO_MUCHO;
    let puntos = 10 * unoEntre(p, 0, 20) + 50 * limpios + 30 * choques + 100 * rematadas + 75 * rescates;
    let aguante = resultado === 'perdida' ? 0 : unoEntre(p, 0, lleno);
    const foco = unoEntre(p, 0, 100);
    let salio = 0;
    let cobradas = 0;
    if (enLaLlamada && p.sinCanal.indexOf(a.asiento) < 0 && salen < quierenSalir) {
      salio = 1;
      salen++;
      cobradas = lleva;
      puntos += 150 + ((lleva * (lleva + 1)) / 2) * 10;
      lleva = 0;
      if (aguante < 1) aguante = 1;
    }
    cuentas.push([i + 1, puntos, lleva, cobradas, aguante, foco, limpios, racha, amenazas, rematadas, choques, rescates, caidas, reaparece, esquivas, salio]);
  }
  /* Una noche perdida es un equipo sin monedas: todos en el suelo y nadie que pague otra cabina. */
  return { tipo: 'arcade:ronda', carga: { n, resultado, cuentas, recurso: resultado === 'perdida' ? 0 : v.monedas - reapariciones } };
}

/* ─── LAS FASES ──────────────────────────────────────────────────────────── */

function enLaReunion(p: Partida): void {
  if (p.hechas['reunion'] !== true) {
    p.hechas['reunion'] = true;
    /* Un tic en la reunión no hace nada (salvo crearla); un estilo en la reunión cerraría la mesa a los que llegan. */
    mandar(p, null, movimientoDeTic(), p.estado === undefined ? 'entra' : 'sinEfecto');
    mandar(p, unConectado(p), { tipo: 'estilo', carga: { id: 'mole' } }, 'rechazo');
  }
  mandar(p, unConectado(p), { tipo: 'empezar', carga: null }, 'entra');
}

/** Al empezar cada noche se decide si se gana y, si no, dónde se cae. */
function decidirLaNoche(p: Partida, politica: PoliticaDelRobotDelQuiebro): void {
  p.seGana = politica === 'gana' ? true : politica === 'pierde' ? false : unoDeCada(p, 2);
  p.seCaeEn = unoEntre(p, 0, 3);
}

function enLaBajada(p: Partida, v: VistaDelQuiebro, travesuras: boolean): void {
  /* Con travesuras, la tercera noche se la rinde alguien en la Bajada: también es un final de noche. */
  if (travesuras && v.noche !== null && v.noche.numero === 3 && p.hechas['rendirse'] !== true) {
    p.hechas['rendirse'] = true;
    hacer(p, unConectado(p), 'rendirse');
    return;
  }
  for (const a of conectados(p)) {
    if (unoDeCada(p, 3) && hacer(p, a, 'estilo') && travesuras && p.hechas['dos-estilos'] !== true) {
      /* Un segundo cambio en la misma Bajada: el estilo se cambia una vez por tramo (y elegirlo es estar listo). */
      p.hechas['dos-estilos'] = true;
      mandar(p, a, { tipo: 'estilo', carga: { id: 'gabardina' } }, 'rechazo');
      mandar(p, a, { tipo: 'estilo', carga: { id: 'ligera' } }, 'rechazo');
      mandar(p, a, { tipo: 'listo', carga: null }, 'rechazo');
    }
    if (v.noche !== null && v.noche.numero === 1 && unoDeCada(p, 2)) hacer(p, a, 'aprendiz');
    /* Casi todos dicen que están listos (BAJAR); alguno no, y entonces la Bajada acaba por su reloj de 15 s. */
    if (!unoDeCada(p, 5)) hacer(p, a, 'listo');
  }
  if (travesuras && v.noche !== null && v.noche.numero === 2 && p.hechas['aprendiz-tarde'] !== true) {
    p.hechas['aprendiz-tarde'] = true;
    mandar(p, unConectado(p), { tipo: 'aprendiz', carga: null }, 'rechazo');
  }
  if (travesuras && p.hechas['bajada'] !== true) {
    p.hechas['bajada'] = true;
    mandar(p, null, { tipo: 'arcade:reloj', carga: { id: 'n9.b' } }, 'sinEfecto');
    mandar(p, null, { tipo: 'arcade:ronda', carga: { n: 11, resultado: 'ganada', cuentas: [], recurso: 0 } }, 'rechazo');
    mandar(p, p.asientos[0] as string, { tipo: 'arcade:reloj', carga: { id: (v.reloj as { id: string }).id } }, 'rechazo');
    mandar(p, p.asientos[0] as string, { tipo: 'elegir', carga: { retoque: 'iman', voto: null } }, 'rechazo');
    /* Un tic perezoso se apunta, y la Bajada sigue: con uno solo no se interrumpe nada. */
    mandar(p, null, movimientoDeTic(), 'entra');
  }
  const ahora = vistaDe(p);
  if (ahora.fase.tipo === 'bajada' && ahora.reloj !== null) {
    /* Con todos listos, a veces llega antes el de 15 s que la sala metió sin saberlo: sin efecto. */
    if (ahora.reloj.id !== (v.reloj as { id: string }).id && unoDeCada(p, 2)) mandar(p, null, { tipo: 'arcade:reloj', carga: { id: (v.reloj as { id: string }).id } }, 'sinEfecto');
    mandar(p, null, { tipo: 'arcade:reloj', carga: { id: ahora.reloj.id } }, 'entra');
  }
}

function enLaOleada(p: Partida, v: VistaDelQuiebro, travesuras: boolean): void {
  const k = v.fase.tipo === 'oleada' ? v.fase.oleada : 0;
  moverLaGente(p);
  avisarALosQueNoEstan(p);
  if (travesuras) {
    if (p.hechas['oleada'] !== true) {
      p.hechas['oleada'] = true;
      const buena = rondaQueCuadra(p, vistaDe(p), 'ganada');
      const carga = buena.carga as { n: number; cuentas: number[][] };
      mandar(p, null, { tipo: 'arcade:ronda', carga: { ...carga, n: carga.n + 1 } }, 'rechazo');
      mandar(p, p.asientos[0] as string, buena, 'rechazo');
      const rota = carga.cuentas.map((f) => f.slice());
      (rota[0] as number[])[4] = 1000;
      mandar(p, null, { tipo: 'arcade:ronda', carga: { ...carga, cuentas: rota } }, 'rechazo');
      mandar(p, null, { tipo: 'arcade:ausente', carga: { a: 'nadie' } }, 'rechazo');
      mandar(p, null, { tipo: 'arcade:otra-cosa', carga: null }, 'rechazo');
      mandar(p, unConectado(p), { tipo: 'cerrar', carga: null }, 'rechazo');
    }
    if (p.hechas['interrumpir'] !== true && unoDeCada(p, 3)) {
      p.hechas['interrumpir'] = true;
      mandar(p, null, movimientoDeTic(), 'entra');
      mandar(p, null, movimientoDeTic(), 'entra');
      const quien = unConectado(p);
      if (unoDeCada(p, 4)) {
        hacer(p, quien, 'rendirse');
        return;
      }
      hacer(p, quien, 'reanudar');
      /* La sala renace con la oleada otra vez desde su principio, y vuelve a avisar a quien no está. */
      avisarALosQueNoEstan(p);
    }
  }
  const ahora = vistaDe(p);
  if (ahora.fase.tipo !== 'oleada') return;
  const cae = !p.seGana && p.seCaeEn === k;
  const resultado = cae ? 'perdida' : unoDeCada(p, 5) ? 'aguantada' : 'ganada';
  mandar(p, null, rondaQueCuadra(p, ahora, resultado), 'entra');
}

function enLaPausa(p: Partida, v: VistaDelQuiebro, travesuras: boolean): void {
  const k = v.fase.tipo === 'pausa' ? v.fase.oleada : 0;
  if (travesuras && p.hechas[`pausa-${String(k >= 3 ? 3 : 1)}`] !== true) {
    p.hechas[`pausa-${String(k >= 3 ? 3 : 1)}`] = true;
    const a = v.asientos[0] as VistaDelQuiebro['asientos'][number];
    const ofrecido = a.ofrecidos[0];
    if (ofrecido !== undefined) {
      /* El voto donde no toca, y el que falta donde toca. */
      mandar(p, a.asiento, { tipo: 'elegir', carga: { retoque: ofrecido, voto: k >= 3 && k < 5 ? null : 'aguantar' } }, 'rechazo');
    }
    mandar(p, null, { tipo: 'arcade:reloj', carga: { id: 'n1.p9' } }, 'sinEfecto');
  }
  /* Alguno de los que no tenían canal vuelve en la pausa, y elige. */
  if (p.sinCanal.length > 0 && unoDeCada(p, 3)) p.sinCanal.splice(unoEntre(p, 0, p.sinCanal.length - 1), 1);
  /* Casi todos los que tienen canal eligen; alguno no, y entonces la pausa se cierra por su reloj. El voto, a suertes por pausa. */
  const quiereAguantar = unoDeCada(p, 2);
  for (const a of conectados(p)) {
    if (!unoDeCada(p, 6)) {
      const deEse = ofrecidas(p, a).filter((o) => o.tipo === 'elegir');
      if (deEse.length === 0) continue;
      const conVoto = deEse.filter((o) => (o.carga as { voto: string | null }).voto === (quiereAguantar ? 'aguantar' : 'llamar'));
      const lista = conVoto.length > 0 ? conVoto : deEse;
      const o = lista[unoEntre(p, 0, lista.length - 1)] as Opcion;
      mandar(p, a, { tipo: o.tipo, carga: o.carga }, 'entra');
    }
  }
  const ahora = vistaDe(p);
  if (ahora.fase.tipo === 'pausa' && ahora.reloj !== null) mandar(p, null, { tipo: 'arcade:reloj', carga: { id: ahora.reloj.id } }, 'entra');
  else if (v.reloj !== null && unoDeCada(p, 2)) {
    /* Eligieron todos antes de que venciera: la sala, que aún no se ha enterado, mete el reloj de la pausa igual. */
    mandar(p, null, { tipo: 'arcade:reloj', carga: { id: v.reloj.id } }, 'sinEfecto');
  }
}

function enLaLlamada(p: Partida): void {
  moverLaGente(p);
  avisarALosQueNoEstan(p);
  mandar(p, null, rondaQueCuadra(p, vistaDe(p), p.seGana ? 'ganada' : 'perdida'), 'entra');
}

/**
 * EL RECUENTO: alguno cambia de estilo (una vez: con travesuras se prueba la segunda), y lo cierra el
 * reloj de la sala, un tic perezoso si la sala no está, o alguien que no espera y pide otra noche.
 */
function enElRecuento(p: Partida, noches: number, politica: PoliticaDelRobotDelQuiebro, travesuras: boolean): void {
  for (const a of conectados(p)) {
    if (unoDeCada(p, 3) && hacer(p, a, 'estilo') && travesuras && p.hechas['dos-estilos-entre-noches'] !== true) {
      p.hechas['dos-estilos-entre-noches'] = true;
      const otro = ofrecidas(p, a).some((o) => o.tipo === 'estilo');
      if (otro) p.inesperados.push(`a ${a} se le sigue ofreciendo otro estilo tras cambiar entre noches`);
      mandar(p, a, { tipo: 'estilo', carga: { id: 'mole' } }, 'rechazo');
    }
  }
  if (travesuras && p.hechas['recuento'] !== true) {
    p.hechas['recuento'] = true;
    mandar(p, unConectado(p), { tipo: 'aprendiz', carga: null }, 'rechazo');
    mandar(p, unConectado(p), { tipo: 'reanudar', carga: null }, 'rechazo');
  }
  const ahora = vistaDe(p);
  if (ahora.fase.tipo !== 'recuento') return;
  if (unoDeCada(p, 5)) {
    enElFinal(p, noches, politica);
    return;
  }
  if (unoDeCada(p, 4)) mandar(p, null, movimientoDeTic(), 'entra');
  else if (ahora.reloj !== null) mandar(p, null, { tipo: 'arcade:reloj', carga: { id: ahora.reloj.id } }, 'entra');
}

/** Las entradas del diario por tipo, desde `desde` hasta `hasta`. */
function porTipoEntre(p: Partida, desde: number, hasta: number): Record<string, number> {
  const t: Record<string, number> = {};
  for (let i = desde; i < hasta; i++) {
    const r = p.diario[i] as MovimientoRegistrado;
    t[r.movimiento.tipo] = (t[r.movimiento.tipo] ?? 0) + 1;
  }
  return t;
}

/** Apunta la noche que acaba de terminar (la última del historial) con sus entradas del diario. */
function apuntarLaNoche(p: Partida): void {
  if (p.estado === undefined) return;
  const ultima = p.estado.mesa.historial[p.estado.mesa.historial.length - 1];
  if (ultima === undefined) return;
  if (p.noches.some((n) => n.numero === ultima.noche)) return;
  p.noches.push({ numero: ultima.noche, nivel: ultima.nivel, resultado: ultima.resultado, entradas: p.diario.length - p.empiezaEn, porTipo: porTipoEntre(p, p.empiezaEn, p.diario.length) });
}

/** Cierra la cuenta de la última noche apuntada en `hasta` (sin incluirlo). */
function cerrarLaCuenta(p: Partida, hasta: number): void {
  const ultima = p.noches[p.noches.length - 1];
  if (ultima !== undefined) p.noches[p.noches.length - 1] = { ...ultima, entradas: hasta - p.empiezaEn, porTipo: porTipoEntre(p, p.empiezaEn, hasta) };
}

function enElFinal(p: Partida, noches: number, politica: PoliticaDelRobotDelQuiebro): void {
  apuntarLaNoche(p);
  const v = vistaDe(p);
  const numero = v.noche === null ? 0 : v.noche.numero;
  if (numero < noches && numero < NOCHES_COMO_MUCHO) {
    const antes = p.diario.length;
    if (hacer(p, unConectado(p), 'otra-noche')) {
      /* Las entradas de la noche que acaba se cuentan hasta aquí; la nueva empieza con este movimiento. */
      cerrarLaCuenta(p, antes);
      p.empiezaEn = antes;
      decidirLaNoche(p, politica);
    }
    return;
  }
  hacer(p, unConectado(p), 'cerrar');
}

/**
 * JUEGA UNA MESA ENTERA: reunión, las noches que se pidan con todas sus fases, y el cierre. Dos
 * llamadas con los mismos argumentos juegan la misma partida, movimiento a movimiento.
 */
export function jugarAlQuiebro(o: OpcionesDelRobotDelQuiebro): PartidaDelRobotDelQuiebro {
  const asientos: string[] = [];
  const sentados: { asiento: string; nombre: string }[] = [];
  for (let i = 1; i <= o.asientos; i++) {
    asientos.push(`s${String(i)}`);
    sentados.push({ asiento: `s${String(i)}`, nombre: NOMBRES[i - 1] ?? `Asiento ${String(i)}` });
  }
  const p: Partida = {
    asientos,
    sentados,
    semillaDeLaMesa: o.semilla >>> 0,
    estado: undefined,
    tic: 0,
    azar: sembrar((o.semilla ^ 0x2f6b1d93) >>> 0),
    diario: [],
    vistas: [],
    noches: [],
    empiezaEn: 0,
    rechazosEsperados: [],
    inesperados: [],
    aceptados: {},
    fases: [],
    pasos: 0,
    seGana: true,
    seCaeEn: 0,
    hechas: {},
    sinCanal: [],
    seFueronJugando: [],
    ausentes: { avisados: 0, repetidos: 0, vuelvenJugando: 0, vuelvenMoviendo: 0, seVanJugando: 0 },
  };
  decidirLaNoche(p, o.politica);
  const noches = o.noches < 1 ? 1 : o.noches > NOCHES_COMO_MUCHO ? NOCHES_COMO_MUCHO : o.noches;
  let terminada = false;
  while (p.pasos < TOPE_DE_PASOS_DEL_QUIEBRO) {
    if (p.estado !== undefined && p.estado.mesa.fase.tipo === 'cerrada') {
      terminada = true;
      break;
    }
    const v = vistaDe(p);
    const antes = p.pasos;
    switch (v.fase.tipo) {
      case 'reunion':
        enLaReunion(p);
        break;
      case 'bajada':
        enLaBajada(p, v, o.travesuras);
        break;
      case 'oleada':
        enLaOleada(p, v, o.travesuras);
        break;
      case 'pausa':
        enLaPausa(p, v, o.travesuras);
        break;
      case 'llamada':
        enLaLlamada(p);
        break;
      case 'interrumpida':
        hacer(p, unConectado(p), unoDeCada(p, 3) ? 'rendirse' : 'reanudar');
        break;
      case 'recuento':
        apuntarLaNoche(p);
        enElRecuento(p, noches, o.politica, o.travesuras);
        break;
      case 'final':
        enElFinal(p, noches, o.politica);
        break;
      default:
        break;
    }
    if (p.pasos === antes) {
      p.inesperados.push(`nadie pudo hacer nada en ${nombreDeFase(v)}`);
      break;
    }
  }
  apuntarLaNoche(p);
  cerrarLaCuenta(p, p.diario.length);
  return {
    asientos,
    estado: p.estado,
    diario: p.diario,
    vistas: p.vistas,
    noches: p.noches,
    rechazosEsperados: p.rechazosEsperados,
    inesperados: p.inesperados,
    aceptados: p.aceptados,
    fases: p.fases,
    ausentes: { ...p.ausentes },
    terminada,
    pasos: p.pasos,
    huella: canonico(p.estado ?? null),
  };
}
