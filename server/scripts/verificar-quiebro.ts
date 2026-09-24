/**
 * ¿LA MESA DE EL QUIEBRO LLEVA LA NOCHE ENTERA, RECHAZA CON MOTIVO LO QUE NO ES, Y SU PRODUCTOR DA A
 * LA SALA UNA LIZA SIN PROBLEMAS EN CADA FASE?
 *
 *   npm run verify:quiebro -w server
 *
 * ═══ QUÉ AFIRMA ═══
 *
 *   1. EL ALTA: el manifiesto del §10 del diseño, instalado con proyección, `opciones` y `seAcabo`, sin
 *      `loSecreto`, aguantando la mesa recién abierta; y su fila en el registro de lizas.
 *   2. LA MESA, FASE A FASE, con una mesa de tres asientos que se lleva a mano: la reunión (donde sólo
 *      se empieza), la Bajada (estilo una vez y aprendiz), las oleadas y sus rondas (sumas por fase,
 *      punto de control, monedas, aprendiz que baja), las pausas (retoques ofrecidos, elección, voto por
 *      mayoría estricta, reloj con lo de por defecto), la Llamada, el recuento, el final, otra noche, el
 *      nivel que sube y baja, la Memoria del Sistema, los títulos, la mejor noche, las diez noches, la
 *      noche interrumpida por dos tics perezosos, rendirse y cerrar.
 *   3. LOS AUSENTES: cuentan desde la fase siguiente (la liza de la fase en curso no cambia: ni límite
 *      ni encuentro), el aviso repetido o tardío entra sin efecto, y quien vuelve deja de serlo al
 *      mover o al jugar una fase entera; si en una fase se juega y se avisa, manda el aviso.
 *   4. EL DIARIO CON TOPE: un aparato que machaca el estilo y el aprendiz mil veces sólo mete uno por
 *      tramo, y cada noche cabe en el tope contado a mano desde las reglas.
 *   5. CADA RECHAZO CON SU MOTIVO: lo no ofrecido, la carga mala, los veredictos mal formados, firmados
 *      por un asiento, con la ronda o el reloj rancios, con cuentas que no cuadran (una Llamada ganada
 *      sin la mitad fuera, también), fuera de su fase.
 *   6. LAS TABLAS (`componerReglamento`): estilos, retoques, niveles, averías, propinas, el factor de
 *      puntos exacto (y el mismo en la declaración), la tabla del §4.10 por presentes y la Memoria.
 *   7. LA VISTA Y EL TABLERO: la misma para todos, leída por `leerVistaDelQuiebro` en TODAS las vistas
 *      que salen, con el tablero válido, de unos 4 kB y con los nombres; y el plano —manzanas, glorieta
 *      y calles—, el del barrio.
 *   8. EL PRODUCTOR (`lizaDelQuiebro`): `null` sin lanzar ante lo que no es una vista; y en las
 *      cientos de vistas de las partidas del robot, declaraciones sin problemas, con el mismo aforo, la
 *      clave que cambia sólo con la fase, el encuentro, los presentes, los límites y el reglamento de
 *      cada asiento que dicen las tablas; y dentro de una misma fase, un límite que nunca encoge y un
 *      encuentro que no cambia.
 *   9. EL ROBOT PURO (`robot-de-quiebro.ts`): llega al final de noches ganadas y perdidas, pasa por
 *      todas las fases, con gente que se va y vuelve; las travesuras se rechazan y nada sale
 *      inesperado, el diario de cada noche cabe en su tope, la misma semilla da la misma partida y el
 *      diario reejecutado da el mismo estado.
 *
 * Lo que NO afirma: que la sala arbitre bien (eso es `verify:liza`, con una liza de juguete) ni que
 * los números sean divertidos (eso lo dice la gente jugando). Y el robot genérico de la casa, que
 * juega este arcade sin sala, es `verify:robot-generico`.
 *
 * ═══ CÓMO SE HA VISTO ROJA CADA COMPROBACIÓN ═══
 *
 * Rompiendo en tres copias del árbol (el `shared/` entero y estos guiones), corriendo, y restaurando
 * cada fichero con una copia del bueno comprobada byte a byte (24-sep-2026): 210 roturas del reductor,
 * de las tablas, del productor, del alta, del registro y del robot, y las 279 comprobaciones con nombre
 * cayeron al menos una vez, cada una por su nombre y con salida 1. El suelo, quitando una partida del
 * robot: salida 2. Algunas de las que enseñaron algo:
 *
 *   · un portillo que compara sólo el tipo deja pasar un estilo que no existe… y no se ve, porque el
 *     lector de la carga lo vuelve a parar: hizo falta romper los dos para verlo caer;
 *   · una ronda aceptada a medias (sin mirar sus filas) mueve la mesa a la pausa, y las comprobaciones
 *     de detrás pasaban por otro motivo: cada lector roto tuvo que romperse solo;
 *   · un comprobador que da por hecha la liza (`as LizaDeclarada`) revienta con salida 3 en cuanto el
 *     productor devuelve `null`, y entonces no dice qué comprobación cayó: de ahí `SIN_LIZA`, `forma` y
 *     `nuncaLanza`;
 *   · «la oleada 1 va en tres tandas» no mordía con la receta que le tocaba a la mesa de siempre: ahora
 *     se buscan mesas hasta tener las seis recetas y se mira cada una.
 *
 * La segunda pasada (24-sep-2026, tras la revisión adversaria) añadió los ausentes que cuentan desde la
 * fase siguiente, el estilo de una vez por tramo, la Llamada ganada con la mitad fuera, el factor de
 * puntos exacto y las calles del tablero. Sus 41 roturas, en espejos del árbol y restauradas con `cmp`,
 * pusieron en rojo cada comprobación nueva o cambiada por su nombre, con salida 1; y el suelo, subido a
 * 310, con una partida del robot menos, salida 2. Las que enseñaron algo:
 *
 *   · marcar el ausente en el acto (lo de antes) no sólo tumba las comprobaciones hechas a mano: tumba
 *     también «dentro de una misma fase el límite nunca encoge» sobre las vistas del robot, que es la
 *     franja de la glorieta en la que la revisión dejó clavados a seis de seis;
 *   · el recuento y el final comparten el cambio de estilo: llenar el aguante otra vez al pasar al final
 *     (una línea) le devolvía a cada uno un cambio más, y sólo lo ve el aparato que machaca en el final.
 */
import '../../shared/arcade/juegos';
import {
  arcadeInstalado,
  arcadesQueNoAguantanVacio,
  avanzarConMotivo,
  hayFinal,
  hayLoSecreto,
  hayOpciones,
  hayProyeccion,
  manifiestoDeArcade,
  NADIE_SENTADO,
  opcionesDeArcade,
  problemasDelManifiesto,
  seAcaboLaPartida,
  TIC,
  vistaDeAsiento,
} from '../../shared/arcade';
import type { AsientoNombrado, Movimiento, QuienMira } from '../../shared/arcade';
import { canonico } from '../../shared/mecanicas/canonico';
import { UNO } from '../../shared/mecanicas/fijo';
import { accionesDelCable, problemasDeLaDeclaracion } from '../../shared/mecanicas/liza/declaracion';
import type { GrupoDeclarado, LizaDeclarada } from '../../shared/mecanicas/liza/declaracion';
import { esTableroDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { arcadesQueSeLidian, costeDeLaLiza, lizaDeLaMesa, sePuedeLidiar } from '../../shared/arcade/juegos/lizas';
import { MANIFIESTO_QUIEBRO, PLANO_DEL_TABLERO, QUIEBRO } from '../../shared/arcade/juegos/quiebro';
import type { EstadoDelQuiebro, MesaDelQuiebro } from '../../shared/arcade/juegos/quiebro';
import { barrioDeLaNoche, EJES_DE_CALLE, ID_DE_LIMITE_EN_LA_LIZA, LA_GLORIETA, LADO_DE_MANZANA, MEDIO_BARRIO, SOLARES } from '../../shared/arcade/juegos/quiebro-barrio';
import { AFORO_DEL_QUIEBRO, claveDeLaFase, lizaDelQuiebro } from '../../shared/arcade/juegos/quiebro-liza';
import { IDS_DE_AVERIA, IDS_DE_ESTILO, IDS_DE_RECETA, IDS_DE_RETOQUE, NOMBRES_DEL_QUIEBRO } from '../../shared/arcade/juegos/quiebro-nombres';
import type { IdDeRetoque } from '../../shared/arcade/juegos/quiebro-nombres';
import {
  ACCION_DEL_QUIEBRO,
  aguanteLleno,
  CLASE_DEL_QUIEBRO,
  componerReglamento,
  composicionDeLaOleada,
  contramedidaTrasLaNoche,
  encuentroDeLaLlamada,
  ESTADO_DEL_QUIEBRO,
  filaDelNivel,
  monedasAlEmpezar,
  nivelDelSistema,
  nivelTrasLaNoche,
  rondaDeLaFase,
} from '../../shared/arcade/juegos/quiebro-reglas';
import type { ReglamentoCompuesto, VistaParaComponer } from '../../shared/arcade/juegos/quiebro-reglas';
import { COLUMNAS_DE_LA_RONDA, leerVistaDelQuiebro } from '../../shared/arcade/juegos/quiebro-vista';
import type { FaseDelQuiebro, VistaDelQuiebro } from '../../shared/arcade/juegos/quiebro-vista';
import { arnes } from './arnes';
import { jugarAlQuiebro } from './robot-de-quiebro';
import type { PartidaDelRobotDelQuiebro } from './robot-de-quiebro';

const { comprobar, paso, nota, terminar } = arnes();

const CODIGO = 'QWXYZ';
const SEMILLA = 20260924;
const NOMBRES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fermín'];

/**
 * LA FORMA CANÓNICA, sin lanzar: `canonico` lanza con lo que no es dato llano, y un comprobador que
 * revienta a medias no dice qué comprobación cayó. Lo que no se puede canonizar da una marca que no
 * es igual a ninguna forma.
 */
function forma(x: unknown): string {
  try {
    return canonico(x);
  } catch (error) {
    return `(no canonizable: ${String(error)})`;
  }
}

/* ─── UNA MESA DE MENTIRA, POR LA MISMA PUERTA QUE LA DE VERDAD ──────────── */

interface Mesa {
  estado: EstadoDelQuiebro | undefined;
  asientos: string[];
  tic: number;
  /** La semilla de la mesa (`ctx.azar`): la que el servidor elige al abrirla. */
  azar: number;
}

function mesaNueva(cuantos: number, azar = SEMILLA): Mesa {
  const asientos: string[] = [];
  for (let i = 1; i <= cuantos; i++) asientos.push(`s${String(i)}`);
  return { estado: undefined, asientos, tic: 0, azar };
}

function sentadosDe(asientos: readonly string[]): AsientoNombrado[] {
  return asientos.map((asiento, i) => ({ asiento, nombre: NOMBRES[i] ?? asiento }));
}

/**
 * Manda un movimiento como la mesa (el reductor registrado, con el tic adelantado antes). Devuelve
 * `null` si se aceptó y el motivo si no; con «(el mismo estado)» si no cambió nada.
 */
function mandar(m: Mesa, quien: string | null, tipo: string, carga?: unknown): string | null {
  const esTic = tipo === TIC;
  const movimiento: Movimiento = carga === undefined ? { tipo } : { tipo, carga };
  const ctx = { quien, azar: m.azar, tic: esTic ? m.tic + 1 : m.tic, asientos: m.asientos };
  const s = avanzarConMotivo(QUIEBRO, m.estado, movimiento, ctx);
  if (s.motivo !== null) return s.motivo;
  if (s.estado === m.estado) return '(el mismo estado)';
  m.estado = s.estado as EstadoDelQuiebro;
  if (esTic) m.tic++;
  return null;
}

/** Lo que devuelve el reductor sin tocar la mesa: para ver la identidad y el motivo. */
function probar(m: Mesa, quien: string | null, tipo: string, carga?: unknown): { mismo: boolean; motivo: string | null } {
  const movimiento: Movimiento = carga === undefined ? { tipo } : { tipo, carga };
  const s = avanzarConMotivo(QUIEBRO, m.estado, movimiento, { quien, azar: m.azar, tic: m.tic + 1, asientos: m.asientos });
  return { mismo: s.estado === m.estado, motivo: s.motivo };
}

/**
 * LO QUE SE MIRA CUANDO EL PRODUCTOR NO DA LIZA: todo vacío o imposible, para que cada comprobación
 * que la usa caiga con su nombre en vez de reventar el guion entero.
 */
const SIN_LIZA = {
  fase: { clave: '', modo: 'quieta', limite: 0, semilla: -1, reloj: null, encuentro: null },
  mundo: { suelo: { cuerpos: [] } },
  asientos: [],
  clases: [],
  proyectiles: [],
  portables: [],
  veredictos: { columnas: [] },
  aforo: { entidades: -1, balas: -1, montones: -1 },
  equipo: { recurso: -1 },
  turnos: { repetirTrasTics: -1 },
} as unknown as LizaDeclarada;

/** Lo que da `f`, o `'lanzó'` si lanza: un comprobador que revienta no dice qué comprobación cayó. */
function nuncaLanza<T>(f: () => T): T | 'lanzó' {
  try {
    return f();
  } catch {
    return 'lanzó';
  }
}

function vista(m: Mesa, quien: QuienMira = null): VistaDelQuiebro {
  return vistaDeAsiento(QUIEBRO, m.estado, quien, sentadosDe(m.asientos)) as VistaDelQuiebro;
}

function laMesa(m: Mesa): MesaDelQuiebro {
  return (m.estado as EstadoDelQuiebro).mesa;
}

function fase(m: Mesa): FaseDelQuiebro {
  return laMesa(m).fase;
}

/** Una fila de cuentas con nombre: lo que no se diga, cero. */
interface Fila {
  puntos?: number;
  lleva?: number;
  cobradas?: number;
  aguante?: number;
  foco?: number;
  limpios?: number;
  racha?: number;
  amenazas?: number;
  desalojos?: number;
  estampados?: number;
  rescates?: number;
  caidas?: number;
  reapariciones?: number;
  quiebros?: number;
  salio?: number;
}

function filaDeCuentas(numero: number, f: Fila): number[] {
  return [
    numero,
    f.puntos ?? 0,
    f.lleva ?? 0,
    f.cobradas ?? 0,
    /* 30 cabe en el lleno de cualquier estilo con cualquier avería (la Ligera con «Cristal» llega a 40). */
    f.aguante ?? 30,
    f.foco ?? 0,
    f.limpios ?? 0,
    f.racha ?? 0,
    f.amenazas ?? 0,
    f.desalojos ?? 0,
    f.estampados ?? 0,
    f.rescates ?? 0,
    f.caidas ?? 0,
    f.reapariciones ?? 0,
    f.quiebros ?? 0,
    f.salio ?? 0,
  ];
}

function carga(n: number, resultado: string, filas: readonly Fila[], recurso: number): unknown {
  return { n, resultado, cuentas: filas.map((f, i) => filaDeCuentas(i + 1, f)), recurso };
}

/** La ronda que toca ahora, con estas filas. */
function laRondaDeAhora(m: Mesa, resultado: string, filas: readonly Fila[], recurso?: number): unknown {
  const me = laMesa(m);
  const n = rondaDeLaFase((me.noche as { numero: number }).numero, me.fase) ?? 0;
  return carga(n, resultado, filas, recurso ?? me.monedas);
}

function filasIguales(m: Mesa, f: Fila): Fila[] {
  return m.asientos.map(() => f);
}

function relojDeAhora(m: Mesa): string | null {
  const r = laMesa(m).reloj;
  return r === null ? '(sin reloj)' : mandar(m, null, 'arcade:reloj', { id: r.id });
}

/** Todos los presentes eligen el primer retoque que se les ofrece, con este voto (o sin él donde no se vota). */
function eligenTodos(m: Mesa, voto: 'llamar' | 'aguantar' | null): string[] {
  const motivos: string[] = [];
  const v = laMesa(m);
  const k = v.fase.tipo === 'pausa' ? v.fase.oleada : 0;
  const seVota = k >= 3 && k <= 4;
  for (const a of v.asientos) {
    if (a.ausente) continue;
    const r = a.ofrecidos[0];
    if (r === undefined) continue;
    const motivo = mandar(m, a.asiento, 'elegir', { retoque: r, voto: seVota ? voto : null });
    if (motivo !== null) motivos.push(`${a.asiento}: ${motivo}`);
    if (laMesa(m).fase.tipo !== 'pausa') break;
  }
  return motivos;
}

/**
 * De la Bajada a la oleada `k`, ganándolo todo, eligiendo lo primero y votando aguantar. Con tope de
 * vueltas: un comprobador que se cuelga no dice nada, y una ronda que la mesa rechazara lo colgaría.
 */
function hastaLaOleada(m: Mesa, k: number): void {
  if (fase(m).tipo === 'bajada') relojDeAhora(m);
  for (let vuelta = 0; vuelta < 2 * k && fase(m).tipo === 'oleada' && (fase(m) as { oleada: number }).oleada < k; vuelta++) {
    mandar(m, null, 'arcade:ronda', laRondaDeAhora(m, 'ganada', filasIguales(m, {})));
    eligenTodos(m, 'aguantar');
  }
}

/**
 * UN APARATO QUE MACHACA: manda `veces` veces el movimiento, alternando las cargas, y cuenta cuántos
 * entraron. Es lo que haría un botón que se deja pulsado o un cliente roto en bucle.
 */
function machacar(m: Mesa, quien: string, tipo: string, cargas: readonly unknown[], veces: number): number {
  let entran = 0;
  for (let k = 0; k < veces; k++) if (mandar(m, quien, tipo, cargas[k % cargas.length]) === null) entran++;
  return entran;
}

/**
 * EL TOPE DEL DIARIO DE UNA NOCHE, contado a mano desde las reglas de la mesa (no desde el reductor,
 * para que no se confirme a sí mismo): la entrada (empezar u otra noche), el reloj de la Bajada, un
 * estilo por asiento al bajar y otro entre noches, el aprendiz de cada uno en la primera, cinco rondas
 * de oleada y la de la Llamada, cinco pausas con una elección por asiento (o menos y su reloj), el
 * reloj o el tic del recuento, y rendirse y cerrar. Lo que no depende de la mesa sino de la sala —los
 * avisos de ausente que entran, los tics perezosos y reanudar— va aparte.
 */
function topeDeLaNoche(asientos: number, numero: number): number {
  return 1 + 1 + 2 * asientos + (numero === 1 ? asientos : 0) + 6 + 5 * asientos + 1 + 2;
}

/**
 * LO QUE PESA EL TABLERO COMO MUCHO, en la forma canónica. El diseño lo estimaba en unos 3 kB; con las
 * ocho calles dibujadas (el plano de la traza entero) son unos 4 en la vista más cargada: la pausa de
 * seis asientos con nombres largos y diez noches de historial. Viaja con cada revisión de la mesa, unas
 * cincuenta por noche, mientras la sala le manda a cada aparato 4,4 kB por SEGUNDO de fotos (§12): el
 * kilobyte de las calles no se nota, y el tope está para que el tablero no crezca sin que nadie lo vea.
 */
const TOPE_DEL_TABLERO = 5120;

/** Lo que de una noche depende de la sala y no de la mesa: se descuenta antes de comparar con el tope. */
const DE_LA_SALA = ['arcade:ausente', TIC, 'reanudar'];

/* ═══════════════════════════════════════════════════════════════════════════
 * 1 · EL ALTA
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('El alta: el manifiesto del §10, instalado entero, y su fila en el registro de lizas');
{
  const mf = manifiestoDeArcade(QUIEBRO);
  /* Por la forma y no por identidad: `tsx` puede cargar dos copias de un módulo de `shared/`. */
  comprobar('el manifiesto instalado es el del juego y no tiene problemas', forma(mf) === forma(MANIFIESTO_QUIEBRO) && problemasDelManifiesto(mf).length === 0, problemasDelManifiesto(mf));
  comprobar(
    'el manifiesto dice lo del §10: 1-6, servidor, sin reloj, tablero, sin secretos, sin cifra, creación propia',
    mf.id === 'quiebro' &&
      mf.nombre === 'El Quiebro' &&
      mf.icono === 'mando' &&
      mf.jugadores.minimo === 1 &&
      mf.jugadores.maximo === 6 &&
      mf.sede === 'servidor' &&
      mf.tickHz === 0 &&
      mf.mueble === 'tablero' &&
      mf.secretos === false &&
      mf.marcador.tipo === 'ninguno' &&
      mf.procedencia.tipo === 'creacion-propia',
    mf,
  );
  comprobar('está instalado con proyección, opciones y final, y sin `loSecreto` (no tiene secretos)', arcadeInstalado(QUIEBRO) && hayProyeccion(QUIEBRO) && hayOpciones(QUIEBRO) && hayFinal(QUIEBRO) && !hayLoSecreto(QUIEBRO));
  comprobar('aguanta la mesa recién abierta (reductor, proyección y final con el estado vacío)', !arcadesQueNoAguantanVacio().some((x) => x.arcade === QUIEBRO), arcadesQueNoAguantanVacio());
  comprobar('el registro de lizas lo lidia', sePuedeLidiar(QUIEBRO) && arcadesQueSeLidian().indexOf(QUIEBRO) >= 0, arcadesQueSeLidian());
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 2 · LA MESA, FASE A FASE
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Todas las vistas que salen de los recorridos a mano: el lector y el productor las miran todas al final. */
const vistasAMano: VistaDelQuiebro[] = [];
function apuntar(m: Mesa): VistaDelQuiebro {
  const v = vista(m);
  vistasAMano.push(v);
  return v;
}

paso('La mesa recién abierta y la reunión: sólo se empieza');
const A = mesaNueva(3);
{
  let lanza = '';
  let vacia: unknown = null;
  try {
    vacia = vistaDeAsiento(QUIEBRO, undefined, null, NADIE_SENTADO);
  } catch (error) {
    lanza = String(error);
  }
  comprobar('la vista de una mesa sin estado y sin sentados no lanza (es la sonda del arranque)', lanza === '' && vacia !== null, lanza);
  const v = apuntar(A);
  comprobar('la vista de una mesa sin estado con tres sentados es la reunión de los tres, y se lee', v.fase.tipo === 'reunion' && v.asientos.length === 3 && leerVistaDelQuiebro(v) !== null && v.noche === null);
  comprobar('sin estado no se ha acabado', nuncaLanza(() => seAcaboLaPartida(QUIEBRO, undefined)) === false);
  comprobar('a quien sólo mira no se le ofrece nada', opcionesDeArcade(QUIEBRO, v, null).length === 0);
  const deS1 = opcionesDeArcade(QUIEBRO, v, 's1');
  comprobar('en la reunión a un sentado sólo se le ofrece EMPEZAR', deS1.length === 1 && deS1[0]?.tipo === 'empezar', deS1.map((o) => o.id));
  comprobar('a quien no está sentado no se le ofrece nada', opcionesDeArcade(QUIEBRO, v, 'intruso').length === 0);

  A.asientos = ['s1'];
  comprobar('un tic sobre la mesa sin estado crea la reunión con quien hay', mandar(A, null, TIC) === null && laMesa(A).asientos.length === 1 && fase(A).tipo === 'reunion');
  const conUno = A.estado;
  comprobar('otro tic en la reunión no cambia nada: el MISMO objeto', probar(A, null, TIC).mismo);
  A.asientos = ['s1', 's2', 's3'];
  comprobar('la vista de la reunión sigue a los sentados aunque el estado vaya un movimiento por detrás', vista(A).asientos.length === 3 && laMesa(A).asientos.length === 1);
  comprobar('y el primer movimiento con los tres sentados los pone en el estado', mandar(A, null, TIC) === null && laMesa(A).asientos.length === 3 && A.estado !== conUno);

  const estiloEnLaReunion = mandar(A, 's1', 'estilo', { id: 'mole' });
  comprobar('el estilo en la reunión se rechaza, y el motivo dice por qué (cerraría la mesa)', estiloEnLaReunion !== null && estiloEnLaReunion.includes('Bajada'), estiloEnLaReunion);
  const aprendizEnLaReunion = mandar(A, 's2', 'aprendiz', null);
  comprobar('el aprendiz en la reunión también se rechaza con motivo', aprendizEnLaReunion !== null && aprendizEnLaReunion.includes('Bajada'), aprendizEnLaReunion);
  comprobar('un movimiento que El Quiebro no conoce se rechaza con motivo', (mandar(A, 's1', 'saltar', null) ?? '').includes('no conoce'));
  comprobar('empezar con una carga de más se rechaza', mandar(A, 's1', 'empezar', { rapido: true }) !== null);
  comprobar('empezar mandado por quien no está sentado se rechaza', (mandar(A, 'intruso', 'empezar', null) ?? '').includes('sentado'));
  const siete = mesaNueva(7);
  comprobar('empezar con siete sentados se rechaza con motivo', (mandar(siete, 's1', 'empezar', null) ?? '').includes('de 1 a 6'));
}

paso('La Bajada: la noche 1 empieza, se elige estilo y se dice lo del aprendiz');
{
  comprobar('EMPEZAR se acepta', mandar(A, 's2', 'empezar', null) === null);
  const me = laMesa(A);
  const v = apuntar(A);
  comprobar('la noche 1 empieza en la Bajada con su reloj de 6 s', me.fase.tipo === 'bajada' && me.reloj?.id === 'n1.b' && me.reloj.duraMs === 6000 && me.noche?.numero === 1);
  comprobar(
    'la noche 1 va en Llovizna, sin avería ni contramedida, con una receta, la glorieta y 3 monedas',
    me.reglamento.nivel === 1 &&
      me.reglamento.averia === 'ninguna' &&
      me.reglamento.contramedida === 'ninguna' &&
      IDS_DE_RECETA.indexOf(me.noche?.receta ?? 'enjambre') >= 0 &&
      me.noche?.plantilla === 'glorieta' &&
      me.monedas === 3,
    { reglamento: me.reglamento, noche: me.noche, monedas: me.monedas },
  );
  comprobar('todos empiezan con el aguante lleno de la Gabardina, sin Foco ni esquirlas', me.asientos.every((a) => a.control.aguante === 100 && a.control.foco === 0 && a.control.esquirlas === 0));
  comprobar('con la noche empezada no se vuelve a empezar', (mandar(A, 's1', 'empezar', null) ?? '').includes('ya ha empezado'));
  const o1 = opcionesDeArcade(QUIEBRO, v, 's1').map((o) => o.id);
  comprobar('en la Bajada se ofrecen rendirse, los otros dos estilos y el aprendiz', o1.length === 4 && o1.indexOf('rendirse') >= 0 && o1.indexOf('estilo:ligera') >= 0 && o1.indexOf('estilo:mole') >= 0 && o1.indexOf('aprendiz') >= 0 && o1.indexOf('estilo:gabardina') < 0, o1);
  comprobar('elegir el estilo que ya se lleva se rechaza (no se ofrece: sería un botón mudo)', mandar(A, 's1', 'estilo', { id: 'gabardina' }) !== null);
  comprobar(
    'elegir la Mole cambia el estilo; el punto de control se queda como se bajó (es la marca del cambio)',
    mandar(A, 's1', 'estilo', { id: 'mole' }) === null && laMesa(A).reglamento.asientos[0]?.estilo === 'mole' && laMesa(A).asientos[0]?.control.aguante === 100,
  );
  const enLaBajada = lizaDelQuiebro(vista(A), CODIGO) ?? SIN_LIZA;
  comprobar('y la sala ya la declara con su lleno de 130, que es lo que pinta el aparato', enLaBajada.asientos[0]?.cuerpo.vidaTope === 130 && enLaBajada.asientos[0].alEmpezar.vida === 130, enLaBajada.asientos[0]?.alEmpezar);
  const segundo = mandar(A, 's1', 'estilo', { id: 'ligera' });
  comprobar('un segundo cambio de estilo en la misma Bajada se rechaza, y el motivo lo dice', segundo !== null && segundo.includes('Ya has cambiado'), segundo);
  comprobar('y a quien ya cambió no se le ofrece otro estilo', opcionesDeArcade(QUIEBRO, vista(A), 's1').every((o) => o.tipo !== 'estilo'), opcionesDeArcade(QUIEBRO, vista(A), 's1').map((o) => o.id));
  comprobar('un estilo que no existe se rechaza', mandar(A, 's3', 'estilo', { id: 'capa' }) !== null);
  comprobar('la Ligera se elige igual', mandar(A, 's2', 'estilo', { id: 'ligera' }) === null && laMesa(A).reglamento.asientos[1]?.estilo === 'ligera');
  comprobar('el aprendiz pone 3 quiebros de aprender', mandar(A, 's3', 'aprendiz', null) === null && laMesa(A).asientos[2]?.aprendiz === 3);
  comprobar('y no se vuelve a ofrecer a quien ya los tiene', mandar(A, 's3', 'aprendiz', null) !== null);
  comprobar('elegir retoque fuera de la pausa se rechaza con motivo', (mandar(A, 's1', 'elegir', { retoque: 'iman', voto: null }) ?? '').includes('pausa'));
  comprobar('una ronda en la Bajada se rechaza: llega fuera de su fase', (mandar(A, null, 'arcade:ronda', carga(11, 'ganada', filasIguales(A, {}), 3)) ?? '').includes('fuera de su fase'));
  comprobar('un reloj que no es el de la fase se rechaza', (mandar(A, null, 'arcade:reloj', { id: 'n1.p1' }) ?? '').includes('no es el de la fase'));
  comprobar('un reloj firmado por un asiento se rechaza', mandar(A, 's1', 'arcade:reloj', { id: 'n1.b' }) !== null);
  comprobar('un reloj con una clave de más se rechaza', mandar(A, null, 'arcade:reloj', { id: 'n1.b', extra: 1 }) !== null);
  comprobar('un movimiento de la plataforma que no es de este juego se rechaza con motivo', (mandar(A, null, 'arcade:botin', { a: 1 }) ?? '').includes('no es de El Quiebro'));
  apuntar(A);
  comprobar('el reloj de la Bajada abre la oleada 1, sin reloj de fase', relojDeAhora(A) === null && fase(A).tipo === 'oleada' && (fase(A) as { oleada: number }).oleada === 1 && laMesa(A).reloj === null);
  comprobar('y al bajar a la calle el aguante es el lleno del estilo elegido: 130, 80 y 100', laMesa(A).asientos.map((a) => a.control.aguante).join(',') === '130,80,100', laMesa(A).asientos.map((a) => a.control.aguante));
}

paso('El diario tiene tope: un aparato que machaca el estilo o el aprendiz sólo mete uno por tramo');
{
  const x = mesaNueva(6);
  mandar(x, 's1', 'empezar', null);
  const alternos = [{ id: 'ligera' }, { id: 'mole' }, { id: 'gabardina' }];
  const enLaBajadaEntran = x.asientos.map((a) => machacar(x, a, 'estilo', alternos, 1000));
  comprobar('mil estilos alternos de cada uno en la Bajada: entra uno por asiento', enLaBajadaEntran.every((n) => n === 1), enLaBajadaEntran);
  const aprendices = x.asientos.map((a) => machacar(x, a, 'aprendiz', [null], 1000));
  comprobar('mil «mi primera noche» de cada uno: entra uno por asiento', aprendices.every((n) => n === 1), aprendices);
  mandar(x, 's1', 'rendirse', null);
  const enElRecuento = x.asientos.map((a) => machacar(x, a, 'estilo', alternos, 1000));
  comprobar('mil más en el recuento: uno por asiento, entre noches', enElRecuento.every((n) => n === 1), enElRecuento);
  relojDeAhora(x);
  const enElFinal = x.asientos.map((a) => machacar(x, a, 'estilo', alternos, 1000));
  comprobar('y en el final, ninguno más: el recuento y el final son el mismo tramo', enElFinal.every((n) => n === 0), enElFinal);
  mandar(x, 's2', 'otra-noche', null);
  const noche2 = x.asientos.map((a) => machacar(x, a, 'estilo', alternos, 1000));
  const aprendiz2 = machacar(x, 's1', 'aprendiz', [null], 1000);
  comprobar('en la Bajada de la noche 2, otro estilo por asiento y ningún aprendiz', noche2.every((n) => n === 1) && aprendiz2 === 0, { noche2, aprendiz2 });
  comprobar('los quiebros de aprender se apagan al empezar la noche 2 (eran de la primera)', laMesa(x).asientos.every((a) => a.aprendiz === 0));
  /*
   * LA NOCHE MÁS LARGA JUGANDO LIMPIO, con seis: todos cambian de estilo y piden el aprendiz al bajar,
   * se juegan las cinco oleadas eligiendo todos en cada pausa, se gana la Llamada y todos cambian de
   * estilo entre noches. Se cuenta lo que entra, y tiene que ser el tope menos rendirse y cerrar.
   */
  const larga = mesaNueva(6, 777);
  let entran = mandar(larga, 's1', 'empezar', null) === null ? 1 : 0;
  for (const a of larga.asientos) {
    if (mandar(larga, a, 'estilo', { id: 'ligera' }) === null) entran++;
    if (mandar(larga, a, 'aprendiz', null) === null) entran++;
  }
  if (relojDeAhora(larga) === null) entran++;
  for (let vuelta = 0; vuelta < 12 && fase(larga).tipo !== 'llamada' && fase(larga).tipo !== 'recuento'; vuelta++) {
    if (fase(larga).tipo === 'oleada' && mandar(larga, null, 'arcade:ronda', laRondaDeAhora(larga, 'ganada', filasIguales(larga, {}))) === null) entran++;
    if (fase(larga).tipo === 'pausa') entran += larga.asientos.length - eligenTodos(larga, 'aguantar').length;
  }
  if (mandar(larga, null, 'arcade:ronda', laRondaDeAhora(larga, 'ganada', larga.asientos.map((_, i) => (i < 3 ? { salio: 1 } : {})))) === null) entran++;
  for (const a of larga.asientos) if (mandar(larga, a, 'estilo', { id: 'mole' }) === null) entran++;
  if (relojDeAhora(larga) === null) entran++;
  comprobar(
    'la noche más larga jugando limpio, con seis (cinco oleadas, todos eligen, todos cambian de estilo): el tope justo, sin rendirse ni cerrar',
    fase(larga).tipo === 'final' && laMesa(larga).historial[0]?.resultado === 'ganada' && entran === topeDeLaNoche(6, 1) - 2,
    { entran, tope: topeDeLaNoche(6, 1), fase: fase(larga) },
  );
  nota(`la noche más larga jugando limpio con seis asientos: ${String(entran)} entradas la primera, ${String(topeDeLaNoche(6, 2) - 2)} las demás (sin aprendiz)`);
  const tresAguantes = IDS_DE_AVERIA.map((av) => new Set(IDS_DE_ESTILO.map((e) => aguanteLleno(e, av))).size);
  comprobar('la marca del cambio se sostiene: los tres aguantes son distintos con cada avería', tresAguantes.every((n) => n === IDS_DE_ESTILO.length), tresAguantes);
}

paso('Las oleadas: la ronda de la fase, sus sumas y su punto de control');
{
  const v = apuntar(A);
  const o = opcionesDeArcade(QUIEBRO, v, 's2').map((x) => x.id);
  comprobar('en la oleada sólo se ofrece rendirse', o.length === 1 && o[0] === 'rendirse', o);
  const n = rondaDeLaFase(1, fase(A));
  comprobar('la ronda de la oleada 1 de la noche 1 es la 11, y la Llamada de la noche 3 la 36', n === 11 && rondaDeLaFase(3, { tipo: 'llamada' }) === 36 && rondaDeLaFase(3, { tipo: 'pausa', oleada: 2 }) === null);
  const buena = [
    { puntos: 200, lleva: 3, aguante: 70, foco: 40, limpios: 3, racha: 2, amenazas: 5, quiebros: 2, estampados: 1 },
    { puntos: 100, lleva: 0, aguante: 0, foco: 10, limpios: 0, racha: 0, amenazas: 4, caidas: 1, reapariciones: 1, quiebros: 1 },
    { puntos: 50, lleva: 12, aguante: 20, foco: 100, limpios: 1, racha: 1, amenazas: 1, quiebros: 5, rescates: 1 },
  ];
  comprobar('una ronda con otro número se rechaza por rancia', (mandar(A, null, 'arcade:ronda', carga(12, 'ganada', buena, 2)) ?? '').includes('repetida o atrasada'));
  comprobar('una ronda firmada por un asiento se rechaza', mandar(A, 's1', 'arcade:ronda', carga(11, 'ganada', buena, 2)) !== null);
  comprobar('una ronda con una fila de menos se rechaza', mandar(A, null, 'arcade:ronda', carga(11, 'ganada', buena.slice(0, 2), 2)) !== null);
  comprobar('una ronda con una clave de más se rechaza', mandar(A, null, 'arcade:ronda', { ...(carga(11, 'ganada', buena, 2) as object), extra: 1 }) !== null);
  comprobar('una ronda con un resultado que no existe se rechaza', mandar(A, null, 'arcade:ronda', carga(11, 'empatada', buena, 2)) !== null);
  const conCambio = (i: number, f: Fila): Fila[] => buena.map((x, j) => (j === i ? { ...x, ...f } : x));
  const incoherentes: [string, Fila[], number, string][] = [
    ['más aguante que el lleno del estilo', conCambio(1, { aguante: 81 }), 2, 'su lleno'],
    ['más Foco que el tope', conCambio(0, { foco: 101 }), 2, 'Foco'],
    ['una racha más larga que los limpios', conCambio(0, { racha: 4 }), 2, 'racha'],
    ['más limpios que amenazas', conCambio(0, { limpios: 6, racha: 1 }), 2, 'amenazas'],
    ['más reapariciones que caídas', conCambio(1, { reapariciones: 2 }), 2, 'reaparece'],
    ['alguien que sale en una oleada', conCambio(2, { salio: 1, lleva: 0 }), 2, 'fuera de la Llamada'],
    ['alguien que cobra en una oleada', conCambio(2, { cobradas: 3 }), 2, 'fuera de la Llamada'],
    ['más monedas de las que había', buena, 4, 'no se ganan'],
    ['una cuenta desmesurada', conCambio(0, { amenazas: 5000000 }), 2, 'ninguna sala cuenta tanto'],
  ];
  for (const [que, filas, recurso, dice] of incoherentes) {
    const motivo = mandar(A, null, 'arcade:ronda', carga(11, 'ganada', filas, recurso));
    comprobar(`una ronda con ${que} se rechaza, y el motivo lo dice`, motivo !== null && motivo.includes(dice), motivo);
  }
  comprobar('la ronda buena de la oleada 1 se acepta', mandar(A, null, 'arcade:ronda', carga(11, 'ganada', buena, 2)) === null);
  const me = laMesa(A);
  apuntar(A);
  comprobar('tras la oleada 1 viene la pausa 1, con su reloj de 15 s', me.fase.tipo === 'pausa' && me.fase.oleada === 1 && me.reloj?.id === 'n1.p1' && me.reloj.duraMs === 15000);
  comprobar('los puntos de la fase se suman a la noche', me.asientos.map((a) => a.puntos).join(',') === '200,100,50', me.asientos.map((a) => a.puntos));
  comprobar('las monedas del equipo son las de la ronda', me.monedas === 2);
  comprobar(
    'el punto de control: +30 por la oleada ganada, 60 al volver del suelo, sin pasar del lleno',
    me.asientos[0]?.control.aguante === 100 && me.asientos[1]?.control.aguante === 60 && me.asientos[2]?.control.aguante === 50,
    me.asientos.map((a) => a.control),
  );
  comprobar('el Foco y las esquirlas del punto de control son los de la ronda', me.asientos.map((a) => `${String(a.control.foco)}/${String(a.control.esquirlas)}`).join(',') === '40/3,10/0,100/12');
  comprobar('los quiebros de la ronda bajan el aprendiz (3 − 5 → 0)', me.asientos[2]?.aprendiz === 0);
  comprobar(
    'los contadores de la noche suman los de la fase',
    me.asientos[0]?.contadores.limpios === 3 && me.asientos[0].contadores.amenazas === 5 && me.asientos[0].contadores.estampados === 1 && me.asientos[1]?.contadores.caidas === 1 && me.asientos[1].contadores.reapariciones === 1 && me.asientos[2]?.contadores.rescates === 1,
    me.asientos.map((a) => a.contadores),
  );
  comprobar('la misma ronda otra vez se rechaza: ya no es su fase', mandar(A, null, 'arcade:ronda', carga(11, 'ganada', buena, 2)) !== null);
}

paso('Las pausas: retoques ofrecidos, elección y lo que pasa al cerrarse');
{
  const me = laMesa(A);
  const ofrecidos = me.asientos.map((a) => a.ofrecidos);
  comprobar('a cada uno se le ofrecen tres retoques distintos que existen', ofrecidos.every((o) => o.length === 3 && new Set(o).size === 3 && o.every((r) => IDS_DE_RETOQUE.indexOf(r) >= 0)), ofrecidos);
  comprobar('no a todos los mismos (salen del azar de la mesa por asiento)', forma(ofrecidos[0]) !== forma(ofrecidos[1]) || forma(ofrecidos[1]) !== forma(ofrecidos[2]), ofrecidos);
  const otra = mesaNueva(3);
  mandar(otra, 's1', 'empezar', null);
  relojDeAhora(otra);
  mandar(otra, null, 'arcade:ronda', laRondaDeAhora(otra, 'ganada', filasIguales(otra, {})));
  comprobar('y los mismos para la misma mesa: se reejecutan igual', forma(laMesa(otra).asientos.map((a) => a.ofrecidos)) === forma(ofrecidos));
  const v = apuntar(A);
  const os = opcionesDeArcade(QUIEBRO, v, 's1');
  comprobar('en la pausa 1 se ofrece elegir cada retoque, sin voto, y rendirse', os.length === 4 && os.filter((o) => o.tipo === 'elegir').every((o) => (o.carga as { voto: unknown }).voto === null), os.map((o) => o.id));
  const primero = ofrecidos[0]?.[0] as IdDeRetoque;
  const noOfrecido = IDS_DE_RETOQUE.find((r) => (ofrecidos[0] ?? []).indexOf(r) < 0) as IdDeRetoque;
  comprobar('elegir un retoque que no se le ofrece se rechaza', mandar(A, 's1', 'elegir', { retoque: noOfrecido, voto: null }) !== null);
  comprobar('elegir con voto donde no se vota se rechaza', mandar(A, 's1', 'elegir', { retoque: primero, voto: 'aguantar' }) !== null);
  comprobar('elegir con una carga que no es la suya se rechaza', mandar(A, 's1', 'elegir', { retoque: primero }) !== null);
  comprobar('elegir lo ofrecido se acepta y el retoque entra ya en el reglamento', mandar(A, 's1', 'elegir', { retoque: primero, voto: null }) === null && laMesa(A).reglamento.asientos[0]?.retoques[0] === primero && laMesa(A).asientos[0]?.haElegido === true);
  comprobar('elegir dos veces en la misma pausa se rechaza', mandar(A, 's1', 'elegir', { retoque: ofrecidos[0]?.[1] as IdDeRetoque, voto: null }) !== null);
  apuntar(A);
  mandar(A, 's2', 'elegir', { retoque: ofrecidos[1]?.[2] as IdDeRetoque, voto: null });
  comprobar('con uno sin elegir la pausa sigue', fase(A).tipo === 'pausa');
  mandar(A, 's3', 'elegir', { retoque: ofrecidos[2]?.[0] as IdDeRetoque, voto: null });
  comprobar('cuando han elegido todos los presentes, viene la oleada 2 sin esperar al reloj', fase(A).tipo === 'oleada' && (fase(A) as { oleada: number }).oleada === 2);
  comprobar('fuera de la pausa no queda nada ofrecido ni elegido', laMesa(A).asientos.every((a) => a.ofrecidos.length === 0 && !a.haElegido && a.voto === null));
  apuntar(A);

  /* La pausa 2 se cierra por su reloj: lo de por defecto. */
  mandar(A, null, 'arcade:ronda', laRondaDeAhora(A, 'aguantada', [{ aguante: 90 }, { aguante: 70 }, { aguante: 45 }]));
  comprobar('una oleada aguantada no da +30 (el aguante se queda como acabó)', laMesa(A).asientos.map((a) => a.control.aguante).join(',') === '90,70,45', laMesa(A).asientos.map((a) => a.control.aguante));
  const ofrecidos2 = laMesa(A).asientos.map((a) => a.ofrecidos);
  comprobar('en la pausa 2 no se ofrece lo que ya se eligió en esta noche', laMesa(A).asientos.every((a, i) => a.ofrecidos.every((r) => (laMesa(A).reglamento.asientos[i]?.retoques ?? []).indexOf(r) < 0)));
  mandar(A, 's2', 'elegir', { retoque: ofrecidos2[1]?.[1] as IdDeRetoque, voto: null });
  apuntar(A);
  comprobar('el reloj de la pausa la cierra', relojDeAhora(A) === null && fase(A).tipo === 'oleada');
  const rs = laMesa(A).reglamento.asientos.map((e) => e.retoques);
  comprobar(
    'con el reloj, a quien no eligió le toca el primero que se le ofrecía',
    rs[0]?.[1] === ofrecidos2[0]?.[0] && rs[1]?.[1] === ofrecidos2[1]?.[1] && rs[2]?.[1] === ofrecidos2[2]?.[0],
    { rs, ofrecidos2 },
  );
}

paso('El voto de la pausa 3: mayoría estricta de Aguantar, y el empate llama');
{
  mandar(A, null, 'arcade:ronda', laRondaDeAhora(A, 'ganada', filasIguales(A, { aguante: 50 })));
  comprobar('tras la oleada 3 viene la pausa 3', fase(A).tipo === 'pausa' && (fase(A) as { oleada: number }).oleada === 3);
  const v = apuntar(A);
  const os = opcionesDeArcade(QUIEBRO, v, 's1').filter((o) => o.tipo === 'elegir');
  comprobar('en la pausa 3 cada retoque va con los dos votos', os.length === 6 && os.every((o) => (o.carga as { voto: unknown }).voto !== null), os.map((o) => o.id));
  comprobar('elegir sin voto donde se vota se rechaza', mandar(A, 's1', 'elegir', { retoque: laMesa(A).asientos[0]?.ofrecidos[0], voto: null }) !== null);
  /* Dos de tres votan aguantar: propina. */
  const r = laMesa(A).asientos.map((a) => a.ofrecidos[0] as IdDeRetoque);
  mandar(A, 's1', 'elegir', { retoque: r[0], voto: 'aguantar' });
  mandar(A, 's2', 'elegir', { retoque: r[1], voto: 'aguantar' });
  comprobar('el voto queda en la vista mientras dura la pausa', laMesa(A).asientos[0]?.voto === 'aguantar' && leerVistaDelQuiebro(apuntar(A)) !== null);
  mandar(A, 's3', 'elegir', { retoque: r[2], voto: 'llamar' });
  comprobar('dos de tres por aguantar: la oleada 4, de propina', fase(A).tipo === 'oleada' && (fase(A) as { oleada: number }).oleada === 4);
  apuntar(A);
  mandar(A, null, 'arcade:ronda', laRondaDeAhora(A, 'ganada', filasIguales(A, { aguante: 50 })));
  /* Con el tercero avisado, uno de dos por aguantar es empate: se llama. */
  comprobar(
    'el ausente de un sentado entra en la pausa como avisado: no se le espera, y la vista aún no lo marca',
    mandar(A, null, 'arcade:ausente', { a: 's3' }) === null && laMesa(A).asientos[2]?.ausente === false && forma((A.estado as EstadoDelQuiebro).avisados) === '["s3"]',
  );
  const r4 = laMesa(A).asientos.map((a) => a.ofrecidos[0] as IdDeRetoque);
  mandar(A, 's1', 'elegir', { retoque: r4[0], voto: 'aguantar' });
  mandar(A, 's2', 'elegir', { retoque: r4[1], voto: 'llamar' });
  comprobar('con el avisado fuera, uno de dos es empate y el empate llama: la Llamada', fase(A).tipo === 'llamada', fase(A));
  comprobar('y a quien estaba avisado también le toca su retoque por defecto', (laMesa(A).reglamento.asientos[2]?.retoques.length ?? 0) === 4);
  comprobar('en la fase siguiente ya consta como ausente, y el aviso se ha gastado', laMesa(A).asientos[2]?.ausente === true && (A.estado as EstadoDelQuiebro).avisados.length === 0);
  apuntar(A);
}

paso('La Llamada, el recuento y el final de la noche');
{
  const me = laMesa(A);
  comprobar('en la Llamada la ronda es la 16', rondaDeLaFase(1, me.fase) === 16);
  comprobar('la Llamada no se aguanta: se rechaza con motivo', (mandar(A, null, 'arcade:ronda', laRondaDeAhora(A, 'aguantada', filasIguales(A, { aguante: 40 }))) ?? '').includes('no se aguanta'));
  comprobar(
    'quien sale y sigue llevando esquirlas se rechaza',
    mandar(A, null, 'arcade:ronda', laRondaDeAhora(A, 'ganada', [{ salio: 1, lleva: 2, cobradas: 4 }, {}, {}])) !== null,
  );
  comprobar('quien cobra sin salir se rechaza', mandar(A, null, 'arcade:ronda', laRondaDeAhora(A, 'ganada', [{ cobradas: 4 }, {}, {}])) !== null);
  const sinNadieFuera = mandar(A, null, 'arcade:ronda', laRondaDeAhora(A, 'ganada', [{}, {}, {}]));
  comprobar('una Llamada «ganada» sin que salga nadie se rechaza, y el motivo dice cuántos hacían falta', sinNadieFuera !== null && sinNadieFuera.includes('se gana con 1'), sinNadieFuera);
  const perdidaConUno = mandar(A, null, 'arcade:ronda', laRondaDeAhora(A, 'perdida', [{ salio: 1 }, { aguante: 0 }, { aguante: 0 }], 0));
  comprobar('y una «perdida» con la mitad de los presentes fuera, también (el ausente no cuenta)', perdidaConUno !== null && perdidaConUno.includes('está ganada'), perdidaConUno);
  const antes = me.asientos.map((a) => a.puntos);
  const llamada = [
    { salio: 1, cobradas: 6, puntos: 360, limpios: 4, racha: 4, amenazas: 4, desalojos: 2 },
    { salio: 1, cobradas: 3, puntos: 210, rescates: 2 },
    { aguante: 0, caidas: 1 },
  ];
  comprobar('la ronda de la Llamada ganada se acepta', mandar(A, null, 'arcade:ronda', laRondaDeAhora(A, 'ganada', llamada, 1)) === null);
  const fin = laMesa(A);
  apuntar(A);
  comprobar('la noche ganada pasa al recuento con su reloj de 20 s', fin.fase.tipo === 'recuento' && fin.fase.resultado === 'ganada' && fin.reloj?.id === 'n1.re' && fin.reloj.duraMs === 20000);
  comprobar('quien sale queda como salido, y cobra sus esquirlas', fin.asientos[0]?.salio === true && fin.asientos[1]?.salio === true && fin.asientos[2]?.salio === false && fin.asientos[0]?.contadores.esquirlasCobradas === 6);
  comprobar('los puntos de la Llamada se suman', fin.asientos[0]?.puntos === (antes[0] ?? 0) + 360);
  const h = fin.historial[0];
  comprobar('el historial apunta la noche: número, nivel, resultado y puntos de cada uno', fin.historial.length === 1 && h?.noche === 1 && h.nivel === 1 && h.resultado === 'ganada' && h.puntos.length === 3 && h.puntos[0]?.puntos === fin.asientos[0]?.puntos, h);
  const titulos = (h?.titulos ?? []).map((t) => `${t.titulo}:${t.asiento}`);
  comprobar(
    'los títulos van a quien más tiene, y a nadie si nadie tiene',
    titulos.length === 5 &&
      titulos.indexOf('mas-limpios:s1') >= 0 &&
      titulos.indexOf('el-avaro:s1') >= 0 &&
      titulos.indexOf('mas-rescates:s2') >= 0 &&
      titulos.indexOf('mas-desalojos:s1') >= 0 &&
      titulos.indexOf('racha-mas-larga:s1') >= 0,
    titulos,
  );
  const mejor = fin.asientos.reduce((x, a) => (a.puntos > x.puntos ? a : x));
  comprobar('la mejor noche de la mesa es la del que más puntos hizo', fin.mejorNoche?.asiento === mejor.asiento && fin.mejorNoche.puntos === mejor.puntos && fin.mejorNoche.noche === 1, fin.mejorNoche);
  comprobar('al amanecer el aguante vuelve al lleno de cada estilo: 130, 80 y 100', fin.asientos.map((a) => a.control.aguante).join(',') === '130,80,100', fin.asientos.map((a) => a.control.aguante));
  const vr = vista(A);
  const or = opcionesDeArcade(QUIEBRO, vr, 's1').map((o) => o.id);
  comprobar(
    'en el recuento se ofrecen otra noche, cerrar y los otros dos estilos; el aprendiz no (es de la primera Bajada)',
    or.length === 4 && or.indexOf('otra-noche') >= 0 && or.indexOf('cerrar') >= 0 && or.indexOf('estilo:gabardina') >= 0 && or.indexOf('estilo:ligera') >= 0,
    or,
  );
  comprobar('entre noches se cambia de estilo', mandar(A, 's2', 'estilo', { id: 'gabardina' }) === null && laMesa(A).reglamento.asientos[1]?.estilo === 'gabardina');
  const otroEntreNoches = mandar(A, 's2', 'estilo', { id: 'mole' });
  comprobar('una vez: el segundo se rechaza, y el motivo lo dice', otroEntreNoches !== null && otroEntreNoches.includes('entre noches'), otroEntreNoches);
  comprobar('el reloj del recuento pasa al final', relojDeAhora(A) === null && fase(A).tipo === 'final' && laMesa(A).reloj === null);
  const vf = apuntar(A);
  const of2 = opcionesDeArcade(QUIEBRO, vf, 's2').map((o) => o.id);
  const of1 = opcionesDeArcade(QUIEBRO, vf, 's1').map((o) => o.id);
  comprobar(
    'en el final, otra noche y cerrar a todos; el estilo sólo a quien no lo cambió en el recuento (es el mismo tramo)',
    of2.length === 2 && of2.indexOf('otra-noche') >= 0 && of2.indexOf('cerrar') >= 0 && of1.length === 4,
    { of1, of2 },
  );
  comprobar('un tic en el final no hace nada: el MISMO objeto', probar(A, null, TIC).mismo);
}

paso('Otra noche: el nivel sube, la Memoria del Sistema recuerda, todo vuelve a su sitio');
{
  const antes = laMesa(A);
  const esperada = contramedidaTrasLaNoche({
    reapariciones: antes.asientos.reduce((s, a) => s + a.contadores.reapariciones, 0),
    limpios: antes.asientos.reduce((s, a) => s + a.contadores.limpios, 0),
    amenazas: antes.asientos.reduce((s, a) => s + a.contadores.amenazas, 0),
    estampados: antes.asientos.reduce((s, a) => s + a.contadores.estampados, 0),
  });
  comprobar('otra noche se acepta', mandar(A, 's1', 'otra-noche', null) === null);
  const me = laMesa(A);
  apuntar(A);
  comprobar('la noche 2 empieza en la Bajada con Chaparrón (la 1 se ganó)', me.noche?.numero === 2 && me.fase.tipo === 'bajada' && me.reglamento.nivel === 2 && me.reloj?.id === 'n2.b');
  comprobar('la contramedida es la que sale de los contadores de la noche 1', me.reglamento.contramedida === esperada, { esperada, hay: me.reglamento.contramedida });
  comprobar(
    'puntos, contadores, esquirlas, Foco y retoques vuelven a cero; los estilos siguen',
    me.asientos.every((a) => a.puntos === 0 && a.contadores.limpios === 0 && a.control.esquirlas === 0 && a.control.foco === 0 && !a.salio) &&
      me.reglamento.asientos.every((e) => e.retoques.length === 0) &&
      me.reglamento.asientos[0]?.estilo === 'mole',
  );
  comprobar('el aguante vuelve al lleno de cada estilo con la avería de la noche', me.asientos.every((a, i) => a.control.aguante === (componerReglamento(me)?.asientos[i]?.aguante ?? -1)));
  comprobar('las monedas son las del nivel y la contramedida', me.monedas === monedasAlEmpezar(2, me.reglamento.contramedida));
  comprobar('el historial y la mejor noche siguen', me.historial.length === 1 && me.mejorNoche !== null);
  comprobar('el ausente sigue ausente hasta que mueva', me.asientos[2]?.ausente === true);
  comprobar('y en cuanto mueve, deja de estarlo', mandar(A, 's3', 'estilo', { id: 'ligera' }) === null && laMesa(A).asientos[2]?.ausente === false);
}

paso('Perder, rendirse, y el nivel que baja sin bajar de 1 ni subir de 5');
{
  relojDeAhora(A);
  comprobar('una oleada perdida acaba la noche perdida', mandar(A, null, 'arcade:ronda', laRondaDeAhora(A, 'perdida', filasIguales(A, { aguante: 0 }), 0)) === null && fase(A).tipo === 'recuento' && (fase(A) as { resultado: string }).resultado === 'perdida');
  apuntar(A);
  mandar(A, null, TIC);
  comprobar('un tic perezoso en el recuento pasa al final (la sala no está)', fase(A).tipo === 'final');
  mandar(A, 's1', 'otra-noche', null);
  comprobar('tras perder en Chaparrón, la noche 3 va en Llovizna', laMesa(A).reglamento.nivel === 1 && laMesa(A).noche?.numero === 3);
  comprobar('rendirse en la Bajada acaba la noche rendida', mandar(A, 's2', 'rendirse', null) === null && fase(A).tipo === 'recuento' && (fase(A) as { resultado: string }).resultado === 'rendida');
  apuntar(A);
  relojDeAhora(A);
  mandar(A, 's1', 'otra-noche', null);
  comprobar('tras rendirse en Llovizna, la noche 4 sigue en Llovizna (no baja de 1)', laMesa(A).reglamento.nivel === 1);
  comprobar('nivelTrasLaNoche: sube, baja y se queda en sus topes', nivelTrasLaNoche(5, true) === 5 && nivelTrasLaNoche(1, false) === 1 && nivelTrasLaNoche(3, true) === 4 && nivelTrasLaNoche(3, false) === 2);
  comprobar('rendirse con la noche en la reunión se rechaza con motivo', (mandar(mesaNueva(1), 's1', 'rendirse', null) ?? '').length > 0);
}

paso('La noche interrumpida: dos tics perezosos seguidos, y reanudar o rendirse');
{
  relojDeAhora(A);
  hastaLaOleada(A, 2);
  const enOleada = laMesa(A);
  comprobar('un tic perezoso en una oleada se apunta pero no interrumpe', mandar(A, null, TIC) === null && fase(A).tipo === 'oleada' && (A.estado as EstadoDelQuiebro).perezosos === 1);
  comprobar('y esa cuenta no sale en la vista', !('perezosos' in (vista(A) as object)));
  comprobar('un veredicto entre medias la pone a cero', mandar(A, null, 'arcade:ausente', { a: 's1' }) === null && (A.estado as EstadoDelQuiebro).perezosos === 0);
  mandar(A, null, TIC);
  mandar(A, null, TIC);
  const i = fase(A);
  apuntar(A);
  comprobar('dos seguidos sin nada entre medias la interrumpen, y apunta la oleada en que estaba', i.tipo === 'interrumpida' && i.en.tipo === 'oleada' && i.en.oleada === 2, i);
  const vi = vista(A);
  const oi = opcionesDeArcade(QUIEBRO, vi, 's2').map((o) => o.id);
  comprobar('interrumpida se ofrecen reanudar y rendirse', oi.length === 2 && oi.indexOf('reanudar') >= 0 && oi.indexOf('rendirse') >= 0, oi);
  comprobar('un tic en la noche interrumpida no hace nada: el MISMO objeto', probar(A, null, TIC).mismo);
  comprobar(
    'reanudar vuelve a la misma oleada desde su principio, con el mismo punto de control',
    mandar(A, 's2', 'reanudar', null) === null && fase(A).tipo === 'oleada' && (fase(A) as { oleada: number }).oleada === 2 && forma(laMesa(A).asientos.map((a) => a.control)) === forma(enOleada.asientos.map((a) => a.control)),
  );
  comprobar('reanudar sin noche interrumpida se rechaza', mandar(A, 's2', 'reanudar', null) !== null);
  mandar(A, null, 'arcade:ronda', laRondaDeAhora(A, 'ganada', filasIguales(A, {})));
  const ofrecidos = laMesa(A).asientos.map((a) => a.ofrecidos[0] as IdDeRetoque);
  mandar(A, 's1', 'elegir', { retoque: ofrecidos[0], voto: null });
  mandar(A, null, TIC);
  mandar(A, null, TIC);
  const ip = fase(A);
  comprobar(
    'interrumpida en una pausa, la cierra con lo de por defecto y apunta lo que venía detrás',
    ip.tipo === 'interrumpida' && ip.en.tipo === 'oleada' && ip.en.oleada === 3 && laMesa(A).reglamento.asientos.every((e) => e.retoques.length === 2),
    { ip, retoques: laMesa(A).reglamento.asientos.map((e) => e.retoques) },
  );
  apuntar(A);
  mandar(A, 's1', 'reanudar', null);
  mandar(A, null, 'arcade:ronda', laRondaDeAhora(A, 'ganada', filasIguales(A, {})));
  eligenTodos(A, 'llamar');
  comprobar('votando llamar en la pausa 3 viene la Llamada', fase(A).tipo === 'llamada');
  mandar(A, null, TIC);
  mandar(A, null, TIC);
  const il = fase(A);
  comprobar('interrumpida en la Llamada, vuelve a la Llamada', il.tipo === 'interrumpida' && il.en.tipo === 'llamada', il);
  apuntar(A);
  comprobar('rendirse con la noche interrumpida la acaba rendida', mandar(A, 's3', 'rendirse', null) === null && fase(A).tipo === 'recuento');
  const b = mesaNueva(1);
  mandar(b, 's1', 'empezar', null);
  mandar(b, null, TIC);
  mandar(b, null, TIC);
  const ib = fase(b);
  comprobar('interrumpida en la Bajada, vuelve a la oleada 1', ib.tipo === 'interrumpida' && ib.en.tipo === 'oleada' && ib.en.oleada === 1, ib);
}

paso('Los ausentes');
{
  const c = mesaNueva(4);
  mandar(c, 's1', 'empezar', null);
  comprobar('un ausente de alguien que no está sentado se rechaza', mandar(c, null, 'arcade:ausente', { a: 's9' }) !== null);
  comprobar('un ausente firmado por un asiento se rechaza', mandar(c, 's1', 'arcade:ausente', { a: 's2' }) !== null);
  comprobar('un ausente con una clave de más se rechaza', mandar(c, null, 'arcade:ausente', { a: 's2', b: 1 }) !== null);
  const liza4 = lizaDelQuiebro(vista(c), CODIGO) ?? SIN_LIZA;
  comprobar('con cuatro presentes se juega en la glorieta de 60', liza4.fase.limite === ID_DE_LIMITE_EN_LA_LIZA.glorieta60);
  comprobar(
    'el ausente en la Bajada entra como avisado, y la MISMA fase no cambia: ni la vista ni la liza',
    mandar(c, null, 'arcade:ausente', { a: 's4' }) === null && laMesa(c).asientos[3]?.ausente === false && forma(lizaDelQuiebro(vista(c), CODIGO)) === forma(liza4),
  );
  const repetido = probar(c, null, 'arcade:ausente', { a: 's4' });
  comprobar('el mismo aviso otra vez entra sin efecto: el mismo objeto, sin motivo (la sala lo repite por fase)', repetido.mismo && repetido.motivo === null, repetido);
  relojDeAhora(c);
  const liza3 = lizaDelQuiebro(vista(c), CODIGO) ?? SIN_LIZA;
  comprobar('al cambiar de fase ya cuenta: la oleada 1 escala para tres y se juega en la de 48', laMesa(c).asientos[3]?.ausente === true && liza3.fase.encuentro?.presentes === 3 && liza3.fase.limite === ID_DE_LIMITE_EN_LA_LIZA.glorieta48, liza3.fase.encuentro?.presentes);
  const yaConsta = probar(c, null, 'arcade:ausente', { a: 's4' });
  comprobar('y el aviso de quien ya consta como ausente, sin efecto', yaConsta.mismo && yaConsta.motivo === null, yaConsta);
  mandar(c, null, 'arcade:ronda', laRondaDeAhora(c, 'ganada', filasIguales(c, {})));
  const r = laMesa(c).asientos.map((a) => a.ofrecidos[0] as IdDeRetoque);
  mandar(c, 's1', 'elegir', { retoque: r[0], voto: null });
  mandar(c, 's2', 'elegir', { retoque: r[1], voto: null });
  comprobar('en la pausa, con los presentes menos uno elegidos, se espera', fase(c).tipo === 'pausa');
  comprobar('y si ese uno se da por ausente, se sigue', mandar(c, null, 'arcade:ausente', { a: 's3' }) === null && fase(c).tipo === 'oleada');
  const d = mesaNueva(2);
  mandar(d, 's1', 'empezar', null);
  relojDeAhora(d);
  mandar(d, null, 'arcade:ronda', laRondaDeAhora(d, 'ganada', filasIguales(d, {})));
  mandar(d, null, 'arcade:ausente', { a: 's1' });
  mandar(d, null, 'arcade:ausente', { a: 's2' });
  comprobar('si el último presente se va sin que nadie haya elegido, la pausa no se cierra sola: espera a su reloj', fase(d).tipo === 'pausa' && relojDeAhora(d) === null && fase(d).tipo === 'oleada');
  const reunida = mesaNueva(1);
  mandar(reunida, null, TIC);
  const enLaReunion = probar(reunida, null, 'arcade:ausente', { a: 's1' });
  comprobar('fuera de la noche un aviso llega tarde o de más: entra sin efecto', enLaReunion.mismo && enLaReunion.motivo === null, enLaReunion);
}

paso('Los ausentes a media oleada: la fase en curso no cambia, y quien vuelve, vuelve');
{
  const c = mesaNueva(4);
  mandar(c, 's1', 'empezar', null);
  relojDeAhora(c);
  const antes = lizaDelQuiebro(vista(c), CODIGO) ?? SIN_LIZA;
  comprobar('la oleada 1 de cuatro se juega en la glorieta de 60, para cuatro', antes.fase.limite === ID_DE_LIMITE_EN_LA_LIZA.glorieta60 && antes.fase.encuentro?.presentes === 4);
  mandar(c, null, 'arcade:ausente', { a: 's4' });
  const despues = lizaDelQuiebro(vista(c), CODIGO) ?? SIN_LIZA;
  comprobar(
    'un ausente a media oleada no toca la liza de la oleada: la misma clave, el mismo límite y el mismo encuentro',
    forma(despues.fase) === forma(antes.fase) && forma(despues.asientos) === forma(antes.asientos),
    { limite: [antes.fase.limite, despues.fase.limite], presentes: [antes.fase.encuentro?.presentes, despues.fase.encuentro?.presentes] },
  );
  /* s4 jugó la primera mitad y se fue: la ronda lo enseña jugando, pero lo avisaron en esta misma fase. */
  mandar(c, null, 'arcade:ronda', laRondaDeAhora(c, 'ganada', [{}, {}, {}, { quiebros: 2, puntos: 40 }]));
  const pausa = lizaDelQuiebro(vista(c), CODIGO) ?? SIN_LIZA;
  comprobar(
    'en la pausa ya es ausente aunque la ronda lo enseñe jugando (manda el aviso), y la pausa se juega en la de 48',
    laMesa(c).asientos[3]?.ausente === true && pausa.fase.clave === 'n1.p1' && pausa.fase.limite === ID_DE_LIMITE_EN_LA_LIZA.glorieta48,
  );
  eligenTodos(c, null);
  comprobar('en la pausa no se le espera: eligen los tres y viene la oleada 2', fase(c).tipo === 'oleada' && (fase(c) as { oleada: number }).oleada === 2);
  const o2 = lizaDelQuiebro(vista(c), CODIGO) ?? SIN_LIZA;
  comprobar('la oleada 2 escala para tres', o2.fase.encuentro?.presentes === 3);
  /* En la oleada 2, s4 vuelve y juega; a s3 se le va el canal y no hace nada. */
  mandar(c, null, 'arcade:ausente', { a: 's3' });
  mandar(c, null, 'arcade:ronda', laRondaDeAhora(c, 'ganada', [{}, {}, {}, { quiebros: 1, puntos: 20 }]));
  comprobar(
    'quien vuelve y juega una oleada entera deja de ser ausente al cerrarla; al avisado de esa oleada le toca serlo',
    laMesa(c).asientos[3]?.ausente === false && laMesa(c).asientos[2]?.ausente === true,
    laMesa(c).asientos.map((a) => a.ausente),
  );
  const ofrecido = laMesa(c).asientos[2]?.ofrecidos[0] as IdDeRetoque;
  comprobar(
    'y quien vuelve y mueve deja de serlo en el acto: elige en la pausa y ya se le espera y cuenta',
    mandar(c, 's3', 'elegir', { retoque: ofrecido, voto: null }) === null && laMesa(c).asientos[2]?.ausente === false && fase(c).tipo === 'pausa',
  );
  const quieto = mesaNueva(2);
  mandar(quieto, 's1', 'empezar', null);
  relojDeAhora(quieto);
  mandar(quieto, null, 'arcade:ausente', { a: 's2' });
  mandar(quieto, null, 'arcade:ronda', laRondaDeAhora(quieto, 'ganada', filasIguales(quieto, {})));
  eligenTodos(quieto, null);
  mandar(quieto, null, 'arcade:ronda', laRondaDeAhora(quieto, 'ganada', [{ puntos: 30 }, { aguante: 30, foco: 0 }]));
  comprobar('quien sigue sin canal (su fila, la de un cuerpo quieto) sigue ausente', laMesa(quieto).asientos[1]?.ausente === true);
}

paso('Las diez noches de una mesa, y cerrarla');
{
  const e = mesaNueva(1);
  mandar(e, 's1', 'empezar', null);
  let vueltas = 0;
  while (laMesa(e).noche?.numero !== 10 && vueltas < 20) {
    vueltas++;
    mandar(e, 's1', 'rendirse', null);
    relojDeAhora(e);
    mandar(e, 's1', 'otra-noche', null);
  }
  mandar(e, 's1', 'rendirse', null);
  relojDeAhora(e);
  const v = apuntar(e);
  comprobar('la décima noche llega, y el historial guarda las diez', laMesa(e).noche?.numero === 10 && laMesa(e).historial.length === 10);
  comprobar('pasada la décima, otra noche no se ofrece', opcionesDeArcade(QUIEBRO, v, 's1').every((o) => o.tipo !== 'otra-noche'));
  comprobar('y mandarla se rechaza con motivo', (mandar(e, 's1', 'otra-noche', null) ?? '').includes('todas sus noches'));
  comprobar('cerrar se acepta y la mesa se da por acabada', mandar(e, 's1', 'cerrar', null) === null && fase(e).tipo === 'cerrada' && seAcaboLaPartida(QUIEBRO, e.estado));
  const vc = apuntar(e);
  comprobar('con la mesa cerrada no se ofrece nada y un tic no hace nada', opcionesDeArcade(QUIEBRO, vc, 's1').length === 0 && probar(e, null, TIC).mismo);
  comprobar('la vista de la mesa cerrada se lee', leerVistaDelQuiebro(vc) !== null);
  comprobar('noches rendidas sin una ronda no dan títulos a nadie', laMesa(e).historial.every((h) => h.titulos.length === 0));
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 3 · LAS TABLAS
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('Las tablas: estilos, retoques, niveles, averías y propinas por `componerReglamento`');

function componer(opciones: { nivel?: number; averia?: string; contramedida?: string; estilo?: string; retoques?: string[]; aprendiz?: number; fase?: FaseDelQuiebro; base?: string }): ReglamentoCompuesto | null {
  const v = {
    fase: opciones.fase ?? { tipo: 'oleada', oleada: 1 },
    reglamento: {
      base: opciones.base ?? 'v1',
      nivel: opciones.nivel ?? 1,
      averia: opciones.averia ?? 'ninguna',
      contramedida: opciones.contramedida ?? 'ninguna',
      asientos: [{ asiento: 's1', estilo: opciones.estilo ?? 'gabardina', retoques: opciones.retoques ?? [] }],
    },
    asientos: [{ aprendiz: opciones.aprendiz ?? 0 }],
  } as VistaParaComponer;
  return componerReglamento(v);
}
{
  const g = componer({}) as ReglamentoCompuesto;
  const l = componer({ estilo: 'ligera' }) as ReglamentoCompuesto;
  const mo = componer({ estilo: 'mole' }) as ReglamentoCompuesto;
  const [rg, rl, rm] = [g.asientos[0], l.asientos[0], mo.asientos[0]];
  comprobar('una base de tablas desconocida no se compone', componer({ base: 'v9' }) === null);
  comprobar('los aguantes de los estilos: 100, 80 y 130', rg?.aguante === 100 && rl?.aguante === 80 && rm?.aguante === 130);
  comprobar('los quiebros: 3,5, 4,5 y 2,5 m', rg?.quiebro.metros === 3.5 && rl?.quiebro.metros === 4.5 && rm?.quiebro.metros === 2.5);
  comprobar('la Ligera golpea ×0,8 (Entrada 8, Cierre 16), recupera dos tics antes y engancha a 9 m', rl?.entrada.dano === 8 && rl.cierre.dano === 16 && rl.quiebro.soltableDesdeTic === 4 && rl.enganche.metros === 9);
  comprobar('la Mole: Cierre ×1,5 (30) y firme un golpe cada 6 s; la Gabardina, ni lo uno ni lo otro', rm?.cierre.dano === 30 && rm.firmeCadaTics === 120 && rg?.cierre.dano === 20 && rg.firmeCadaTics === 0);
  comprobar('la Tanda a compás hace 60 (10 + 15 + 15 + 20)', (rg?.entrada.dano ?? 0) + 2 * (rg?.seguida.danoAlCompas ?? 0) + (rg?.cierre.dano ?? 0) === 60);
  const ventanas = [1, 2, 3, 4, 5].map((n) => componer({ nivel: n })?.asientos[0]?.quiebro.ventanaMs);
  comprobar('la ventana limpia por nivel: 200, 175, 150, 135 y 120 ms', ventanas.join(',') === '200,175,150,135,120', ventanas);
  const ancha = componer({ retoques: ['ventana-ancha'], aprendiz: 2 })?.asientos[0];
  comprobar('«Ventana ancha» suma 50 ms, también a la de aprender; el aprendiz sale de la vista', ancha?.quiebro.ventanaMs === 250 && ancha.quiebro.aprendizMs === 350 && ancha.quiebro.aprendiz === 2 && rg?.quiebro.aprendizMs === 300);
  const largo = componer({ retoques: ['paso-largo'] })?.asientos[0];
  comprobar('«Paso largo»: +1,5 m de quiebro y +50 ms de esquivar', largo?.quiebro.metros === 5 && largo.quiebro.esquivaHastaMs === 300 && rg?.quiebro.esquivaHastaMs === 250);
  const plomo = componer({ retoques: ['puno-de-plomo'] })?.asientos[0];
  comprobar('«Puño de plomo»: empujes de 5 m y estampado de +25', plomo?.cierre.empujeMetros === 5 && plomo.empellon.empujeMetros === 5 && plomo.estampado.dano === 25 && rg?.estampado.dano === 15);
  const iman = componer({ retoques: ['iman'] })?.asientos[0];
  comprobar('«Imán»: enganche a 9 m y acometida de 7', iman?.enganche.metros === 9 && iman.entrada.avanceMetros === 7 && rg?.entrada.avanceMetros === 5.5);
  const enlace = componer({ retoques: ['enlace'] })?.asientos[0];
  comprobar('«Enlace»: rescate en 0,8 s y +30 de Foco a los dos', enlace?.rescate.tics === 16 && enlace.rescate.focoAmbos === 30 && rg?.rescate.tics === 30);
  comprobar('«Réplica doble»: un segundo golpe de 15', componer({ retoques: ['replica-doble'] })?.asientos[0]?.replicaDoble?.dano === 15 && rg?.replicaDoble === null);
  const repetido = componer({ retoques: ['paso-largo', 'paso-largo'] })?.asientos[0];
  comprobar('un retoque repetido cuenta una vez', repetido?.quiebro.metros === 5 && repetido.retoques.length === 1);
  const cristal = componer({ averia: 'cristal', nivel: 2 }) as ReglamentoCompuesto;
  comprobar('«Cristal»: todos a media vida, desvelados y Sistema', cristal.asientos[0]?.aguante === 50 && cristal.enemigos.celador.vida === 45 && cristal.enemigos.prestado.vida === 10 && cristal.aguanteAlReaparecer === 30);
  comprobar('«Eco»: los ataques del Sistema se repiten al segundo', componer({ averia: 'eco' })?.repetirTrasTics === 20 && g.repetirTrasTics === 0);
  const t = componer({ nivel: 5 }) as ReglamentoCompuesto;
  comprobar('en Tormenta el Sistema anuncia a ×0,8 y pega a ×1,3', t.enemigos.prestado.golpe.anuncioTics === 11 && t.enemigos.prestado.golpe.dano === 10 && g.enemigos.prestado.golpe.anuncioTics === 14 && g.enemigos.prestado.golpe.dano === 8);
  const propina = componer({ nivel: 2, fase: { tipo: 'oleada', oleada: 4 } }) as ReglamentoCompuesto;
  comprobar('las propinas juegan con el nivel siguiente del Sistema, y el desvelado con el de la noche', propina.nivelDelSistema === 3 && propina.asientos[0]?.quiebro.ventanaMs === 175 && nivelDelSistema(5, { tipo: 'oleada', oleada: 5 }) === 5);
  comprobar('las monedas por nivel: 3, 3, 3, 2 y 2; una menos con «Monedas caras»', [1, 2, 3, 4, 5].map((n) => monedasAlEmpezar(n, 'ninguna')).join(',') === '3,3,3,2,2' && monedasAlEmpezar(4, 'monedas-caras') === 1);
  comprobar(
    'los puntos, exactos y en diezmilésimas: ×1,25 en Chaparrón, ×1,875 con «Cristal» en Chaparrón',
    componer({ nivel: 2 })?.puntosPorDiezMil === 12500 && cristal.puntosPorDiezMil === 18750 && filaDelNivel(9).nivel === 5 && filaDelNivel(0).nivel === 1,
  );
  /* Y la declaración dice el MISMO factor: una sola traducción, en todas las noches posibles. */
  const p = mesaNueva(1);
  mandar(p, 's1', 'empezar', null);
  const base = vista(p);
  const distintos: string[] = [];
  for (const nivel of [1, 2, 3, 4, 5]) {
    for (const averia of IDS_DE_AVERIA) {
      const v = { ...base, reglamento: { ...base.reglamento, nivel, averia } };
      const compuesto = componerReglamento(v);
      const factor = lizaDelQuiebro(v, CODIGO)?.asientos[0]?.puntos.factor;
      if (compuesto === null || factor === undefined || factor * 10000 !== compuesto.puntosPorDiezMil * UNO) distintos.push(`${String(nivel)}/${averia}: ${String(factor)} y ${String(compuesto?.puntosPorDiezMil)}`);
    }
  }
  comprobar('el factor de puntos que declara la liza es exactamente el del reglamento compuesto, en los 5 niveles y las 4 averías', distintos.length === 0, distintos);
}

paso('La tabla del §4.10, por presentes');
{
  /* Cada renglón escrito a mano desde el documento de diseño, para que no se confirme a sí mismo. */
  const tabla: [number, number, string][] = [
    [1, 1, '6,0,0|8,0,0|10,0,0|12,0,0|14,0,0|16,0,0'],
    [2, 1, '4,1,0|5,1,0|6,2,0|7,2,0|8,3,0|9,3,0'],
    [3, 1, '3,1,1|4,1,1|5,2,1|6,2,1|7,3,2|8,3,2'],
    [4, 1, '3,2,1|4,2,1|5,3,2|6,3,2|7,4,2|8,4,2'],
  ];
  for (const [oleada, nivel, esperado] of tabla) {
    const hay = [1, 2, 3, 4, 5, 6].map((n) => {
      const c = composicionDeLaOleada(oleada, n, nivel, 'ninguna');
      return `${String(c.prestados)},${String(c.celadores)},${String(c.tiradores)}`;
    });
    comprobar(`la oleada ${String(oleada)} por presentes (Prestados, Celadores, tiradores) es la del diseño`, hay.join('|') === esperado, hay);
  }
  comprobar('el Aguacero pone un Celador más de la 2 a la 5, la Tormenta dos', composicionDeLaOleada(2, 1, 3, 'ninguna').celadores === 2 && composicionDeLaOleada(5, 1, 5, 'ninguna').celadores === 4 && composicionDeLaOleada(1, 1, 5, 'ninguna').celadores === 0);
  comprobar('«Tiradores» pone uno más en las oleadas 2 y 3', composicionDeLaOleada(2, 1, 1, 'tiradores').tiradores === 1 && composicionDeLaOleada(3, 1, 1, 'tiradores').tiradores === 2 && composicionDeLaOleada(4, 1, 1, 'tiradores').tiradores === 1);
  const l = encuentroDeLaLlamada(3, 2, 6);
  const prestados = l.grupos.filter((x) => x.clase === 'prestado');
  const vivasDePrestados = [0, 1, 2, 3, 4, 5].map((i) => prestados.reduce((s, x) => s + (x.vivas[i] ?? 0), 0));
  comprobar(
    'la Llamada: Prestados de uno en uno cada 2 s, uno de cerca y otro de lejos, con 4, 5, 7, 7, 9 y 9 vivos',
    forma(vivasDePrestados) === forma([4, 5, 7, 7, 9, 9]) &&
      prestados.length === 2 &&
      prestados[0]?.zona === 'aparicion' &&
      prestados[1]?.zona === 'aparicion-lejana' &&
      prestados.every((x) => x.cadaTics === 80) &&
      (prestados[1]?.desdeTic ?? 0) - (prestados[0]?.desdeTic ?? 0) === 40,
    { vivasDePrestados, prestados },
  );
  comprobar('y un Celador guarda la cabina desde el Aguacero, no antes', l.grupos.some((x) => x.eleccion === 'zonaDeAccion' && x.clase === 'celador') && !encuentroDeLaLlamada(2, 2, 6).grupos.some((x) => x.eleccion === 'zonaDeAccion'));
}

paso('La Memoria del Sistema: la contramedida más fuerte');
{
  const cero = { reapariciones: 0, limpios: 0, amenazas: 0, estampados: 0 };
  comprobar('sin nada, ninguna', contramedidaTrasLaNoche(cero) === 'ninguna');
  comprobar('4 reapariciones: «Monedas caras»; 3, no', contramedidaTrasLaNoche({ ...cero, reapariciones: 4 }) === 'monedas-caras' && contramedidaTrasLaNoche({ ...cero, reapariciones: 3 }) === 'ninguna');
  comprobar('el 60 % de limpios: «Tiradores»; el 59 %, no', contramedidaTrasLaNoche({ ...cero, limpios: 60, amenazas: 100 }) === 'tiradores' && contramedidaTrasLaNoche({ ...cero, limpios: 59, amenazas: 100 }) === 'ninguna');
  comprobar('8 estampados: «Plaza despejada»', contramedidaTrasLaNoche({ ...cero, estampados: 8 }) === 'plaza-despejada');
  comprobar('manda la que más pasa de su umbral: 12 estampados (×1,5) contra 5 reapariciones (×1,25)', contramedidaTrasLaNoche({ ...cero, estampados: 12, reapariciones: 5 }) === 'plaza-despejada' && contramedidaTrasLaNoche({ ...cero, estampados: 9, reapariciones: 6 }) === 'monedas-caras');
  comprobar('a igualdad, la de más arriba de la lista', contramedidaTrasLaNoche({ reapariciones: 4, limpios: 60, amenazas: 100, estampados: 8 }) === 'tiradores');
  /* Y en la mesa de verdad: una noche con 8 estampados trae la plaza despejada, y el mundo con menos cajas. */
  const f = mesaNueva(1);
  mandar(f, 's1', 'empezar', null);
  relojDeAhora(f);
  mandar(f, null, 'arcade:ronda', laRondaDeAhora(f, 'perdida', [{ aguante: 0, estampados: 8 }], 0));
  relojDeAhora(f);
  mandar(f, 's1', 'otra-noche', null);
  const v = apuntar(f);
  const l = lizaDelQuiebro(v, CODIGO) ?? SIN_LIZA;
  const normal = lizaDelQuiebro({ ...v, reglamento: { ...v.reglamento, contramedida: 'ninguna' } }, CODIGO) ?? SIN_LIZA;
  comprobar('la noche con 8 estampados trae «Plaza despejada» a la siguiente', v.reglamento.contramedida === 'plaza-despejada');
  comprobar('y su liza choca con menos cajas que la misma noche sin ella', l.mundo.suelo.cuerpos.length < normal.mundo.suelo.cuerpos.length, [l.mundo.suelo.cuerpos.length, normal.mundo.suelo.cuerpos.length]);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 4 · LA VISTA Y EL TABLERO
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('La vista es la misma para todos, y el tablero es el respaldo honrado');
{
  const g = mesaNueva(6);
  g.asientos = ['s1', 's2', 's3', 's4', 's5', 's6'];
  mandar(g, 's1', 'empezar', null);
  relojDeAhora(g);
  mandar(g, null, 'arcade:ronda', laRondaDeAhora(g, 'ganada', filasIguales(g, { puntos: 123456, lleva: 12 })));
  const largos = g.asientos.map((asiento, i) => ({ asiento, nombre: `${'Desvelada Número'.slice(0, 16)} ${String(i)}${'x'.repeat(6)}` }));
  const v1 = vistaDeAsiento(QUIEBRO, g.estado, 's1', largos) as VistaDelQuiebro;
  const v2 = vistaDeAsiento(QUIEBRO, g.estado, 's4', largos) as VistaDelQuiebro;
  const v0 = vistaDeAsiento(QUIEBRO, g.estado, null, largos) as VistaDelQuiebro;
  comprobar('la vista no depende de quién mira', forma(v1) === forma(v0) && forma(v2) === forma(v0));
  comprobar('la vista se lee con el lector estricto', leerVistaDelQuiebro(v0) !== null);
  const pesa = forma(v0.tablero).length;
  comprobar(`el tablero es un tablero declarado de unos 4 kB (${String(TOPE_DEL_TABLERO)} B como mucho con seis asientos y nombres largos, en la pausa)`, esTableroDeclarado(v0.tablero) && pesa <= TOPE_DEL_TABLERO, pesa);
  nota(`el tablero más pesado mirado: ${String(pesa)} bytes`);
  const texto = forma(v0.tablero.paneles);
  comprobar('los paneles llevan los nombres y no los identificadores de asiento', largos.every((s) => texto.includes(s.nombre)) && !texto.includes('"s1'), texto.slice(0, 300));
  comprobar('las acciones del tablero son las que valen para todos (en la pausa, rendirse)', v0.tablero.acciones.length === 1 && v0.tablero.acciones[0]?.toque.tipo === 'rendirse');
  const calles = v0.tablero.lineas.filter((l) => l.id.startsWith('c'));
  const limite = v0.tablero.lineas.filter((l) => l.id.startsWith('l'));
  comprobar(
    'el plano: ocho manzanas y la glorieta, las ocho calles por su eje de punta a punta, y el límite de la fase',
    v0.tablero.caras.length === 9 &&
      v0.tablero.caras.filter((c) => c.rotulo === NOMBRES_DEL_QUIEBRO.lugares.glorieta).length === 1 &&
      calles.length === 8 &&
      calles.every((l) => (l.desde.x === l.hasta.x && Math.abs(l.desde.y - l.hasta.y) === 2 * MEDIO_BARRIO) || (l.desde.y === l.hasta.y && Math.abs(l.desde.x - l.hasta.x) === 2 * MEDIO_BARRIO)) &&
      limite.length === 4 &&
      v0.tablero.lineas.length === 12,
    v0.tablero.lineas.map((l) => l.id),
  );
  comprobar(
    'el plano del tablero es el del barrio (solares, manzana, borde, glorieta y ejes de calle)',
    forma(PLANO_DEL_TABLERO.solares) === forma(SOLARES) &&
      PLANO_DEL_TABLERO.ladoDeManzana === LADO_DE_MANZANA &&
      PLANO_DEL_TABLERO.medioBarrio === MEDIO_BARRIO &&
      PLANO_DEL_TABLERO.laGlorieta === LA_GLORIETA &&
      forma(PLANO_DEL_TABLERO.calles) === forma(EJES_DE_CALLE),
  );
  const limites = barrioDeLaNoche(CODIGO, 1).limites.map((x) => `${x.id}:${String(x.caja.x1)}`).join(',');
  comprobar('y sus límites, los del barrio', limites === `glorieta48:${String(PLANO_DEL_TABLERO.limites.glorieta48)},glorieta60:${String(PLANO_DEL_TABLERO.limites.glorieta60)},barrio:${String(PLANO_DEL_TABLERO.limites.barrio)}`, limites);
  vistasAMano.push(v0);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 5 · EL PRODUCTOR, Y 6 · EL ROBOT
 * ═══════════════════════════════════════════════════════════════════════════ */

paso('El productor ante lo que no es una vista de El Quiebro: `null`, y sin lanzar');
{
  const v = vista(A);
  const raros: [string, unknown, string][] = [
    ['un número', 42, CODIGO],
    ['un objeto vacío', {}, CODIGO],
    ['una vista con una clave de más', { ...v, sobra: 1 }, CODIGO],
    ['una vista sin tablero', { ...v, tablero: undefined }, CODIGO],
    ['una vista con tablas de otra base', { ...v, reglamento: { ...v.reglamento, base: 'v9' } }, CODIGO],
    ['una reunión sin nadie sentado', nuncaLanza(() => vistaDeAsiento(QUIEBRO, undefined, null, NADIE_SENTADO)), CODIGO],
    ['un código vacío', v, ''],
    ['un código con espacios', v, 'QW XY'],
  ];
  for (const [que, raro, codigo] of raros) {
    let dio: unknown = 'lanzó';
    try {
      dio = lizaDelQuiebro(raro, codigo);
    } catch {
      dio = 'lanzó';
    }
    comprobar(`el productor con ${que} da null sin lanzar`, dio === null, dio === 'lanzó' ? 'lanzó' : 'dio una liza');
  }
  /* Y cien vistas estropeadas a suertes: una clave cambiada por un valor raro, a cualquier profundidad. */
  let lanzo = 0;
  let semilla = 7;
  const raros2: unknown[] = [null, -1, 1.5, 'x', [], {}, true, 1e12];
  for (let k = 0; k < 150; k++) {
    const copia = JSON.parse(JSON.stringify(v)) as Record<string, unknown>;
    let aqui: unknown = copia;
    for (let d = 0; d < 4; d++) {
      if (typeof aqui !== 'object' || aqui === null) break;
      const llaves = Object.keys(aqui as object);
      if (llaves.length === 0) break;
      semilla = (semilla * 1103515245 + 12345) % 2147483648;
      const llave = llaves[semilla % llaves.length] as string;
      semilla = (semilla * 1103515245 + 12345) % 2147483648;
      if (d === 3 || semilla % 3 === 0) {
        (aqui as Record<string, unknown>)[llave] = raros2[semilla % raros2.length];
        break;
      }
      aqui = (aqui as Record<string, unknown>)[llave];
    }
    try {
      const l = lizaDelQuiebro(copia, CODIGO);
      if (l !== null && problemasDeLaDeclaracion(l).length > 0) lanzo++;
    } catch {
      lanzo++;
    }
  }
  comprobar('con 150 vistas estropeadas a suertes, el productor nunca lanza ni da una liza con problemas', lanzo === 0, lanzo);
  comprobar('el registro da la misma liza que el productor', forma(lizaDeLaMesa(QUIEBRO, v, CODIGO)) === forma(lizaDelQuiebro(v, CODIGO)));
}

/** Las partidas del robot que se miran: una por número de asientos, con las tres políticas, y dos sin travesuras. */
const PARTIDAS: readonly { asientos: number; politica: 'gana' | 'pierde' | 'mezcla'; travesuras: boolean; semilla: number }[] = [
  { asientos: 1, politica: 'gana', travesuras: true, semilla: 11 },
  { asientos: 2, politica: 'pierde', travesuras: true, semilla: 22 },
  { asientos: 3, politica: 'mezcla', travesuras: true, semilla: 33 },
  { asientos: 4, politica: 'mezcla', travesuras: true, semilla: 44 },
  { asientos: 5, politica: 'gana', travesuras: false, semilla: 55 },
  { asientos: 6, politica: 'mezcla', travesuras: true, semilla: 66 },
];

paso('El robot puro: noches enteras ganadas y perdidas, haciendo de sala');
const partidas: PartidaDelRobotDelQuiebro[] = [];
{
  for (const x of PARTIDAS) partidas.push(jugarAlQuiebro({ ...x, noches: 10 }));
  const resultados: string[] = [];
  const fases: string[] = [];
  for (let i = 0; i < partidas.length; i++) {
    const p = partidas[i] as PartidaDelRobotDelQuiebro;
    const x = PARTIDAS[i] as (typeof PARTIDAS)[number];
    const quien = `${String(x.asientos)} asientos (${x.politica}${x.travesuras ? ', con travesuras' : ''})`;
    for (const n of p.noches) if (resultados.indexOf(n.resultado) < 0) resultados.push(n.resultado);
    for (const f of p.fases) if (fases.indexOf(f) < 0) fases.push(f);
    comprobar(`${quien}: juega sus diez noches y cierra la mesa`, p.terminada && p.noches.length === 10 && seAcaboLaPartida(QUIEBRO, p.estado), { terminada: p.terminada, noches: p.noches.length });
    comprobar(`${quien}: nada sale inesperado`, p.inesperados.length === 0, p.inesperados.slice(0, 3));
    if (x.travesuras) comprobar(`${quien}: sus travesuras se rechazan, con motivo`, p.rechazosEsperados.length >= 10 && p.rechazosEsperados.every((r) => r.motivo.length > 0), p.rechazosEsperados.length);
    /* Cada noche, lo que es de la mesa cabe en el tope contado a mano; lo de la sala va aparte. */
    const pasadas: string[] = [];
    let mayor = 0;
    for (const n of p.noches) {
      const deLaSala = DE_LA_SALA.reduce((s, t) => s + (n.porTipo[t] ?? 0), 0);
      const deLaMesa = n.entradas - deLaSala;
      const tope = topeDeLaNoche(x.asientos, n.numero);
      if (deLaMesa > mayor) mayor = deLaMesa;
      const estilos = n.porTipo['estilo'] ?? 0;
      const aprendices = n.porTipo['aprendiz'] ?? 0;
      if (deLaMesa > tope || estilos > 2 * x.asientos || aprendices > (n.numero === 1 ? x.asientos : 0)) pasadas.push(`noche ${String(n.numero)}: ${String(deLaMesa)} de ${String(tope)}, ${String(estilos)} estilos, ${String(aprendices)} aprendices`);
    }
    comprobar(`${quien}: el diario de cada noche cabe en su tope (${String(topeDeLaNoche(x.asientos, 2))} entradas, ${String(topeDeLaNoche(x.asientos, 1))} la primera)`, pasadas.length === 0 && p.noches.length > 0, pasadas);
    nota(`${quien}: ${String(p.pasos)} pasos, ${String(p.diario.length)} en el diario, noches ${p.noches.map((n) => `${String(n.nivel)}${n.resultado[0] as string}`).join(' ')}, la noche más larga ${String(mayor)} entradas de la mesa`);
    nota(`${quien}: ausentes ${JSON.stringify(p.ausentes)}`);
    const otra = jugarAlQuiebro({ ...x, noches: 10 });
    comprobar(`${quien}: la misma semilla da la misma partida`, otra.huella === p.huella && forma(otra.diario) === forma(p.diario));
    let estado: unknown = undefined;
    let reventado = '';
    for (const r of p.diario) {
      const s = avanzarConMotivo(QUIEBRO, estado, r.movimiento, r.ctx);
      if (s.motivo !== null) {
        reventado = s.motivo;
        break;
      }
      estado = s.estado;
    }
    comprobar(`${quien}: su diario, reejecutado, da el mismo estado`, reventado === '' && forma(estado) === p.huella, reventado);
  }
  comprobar('entre todas, hay noches ganadas, perdidas y rendidas', resultados.indexOf('ganada') >= 0 && resultados.indexOf('perdida') >= 0 && resultados.indexOf('rendida') >= 0, resultados);
  const aus = partidas.reduce(
    (s, p) => ({
      avisados: s.avisados + p.ausentes.avisados,
      repetidos: s.repetidos + p.ausentes.repetidos,
      vuelvenJugando: s.vuelvenJugando + p.ausentes.vuelvenJugando,
      vuelvenMoviendo: s.vuelvenMoviendo + p.ausentes.vuelvenMoviendo,
      seVanJugando: s.seVanJugando + p.ausentes.seVanJugando,
    }),
    { avisados: 0, repetidos: 0, vuelvenJugando: 0, vuelvenMoviendo: 0, seVanJugando: 0 },
  );
  comprobar(
    'entre todas, hay gente que se va (antes y a media pelea), avisos repetidos sin efecto, y quien vuelve jugando y moviendo',
    aus.avisados >= 5 && aus.repetidos >= 5 && aus.vuelvenJugando >= 2 && aus.vuelvenMoviendo >= 2 && aus.seVanJugando >= 2,
    aus,
  );
  const todas = ['reunion', 'bajada', 'oleada-1', 'pausa-1', 'oleada-3', 'pausa-3', 'oleada-4', 'oleada-5', 'pausa-5', 'llamada', 'recuento-ganada', 'recuento-perdida', 'final', 'interrumpida-oleada', 'cerrada'];
  const faltan = todas.filter((f) => fases.indexOf(f) < 0);
  comprobar('entre todas, pasan por todas las fases (las propinas y la noche interrumpida incluidas)', faltan.length === 0, faltan);
  const averias: Record<string, true> = {};
  let primeraConAveria = 0;
  for (const p of partidas) {
    for (const v of p.vistas) {
      if (v.noche === null) continue;
      if (v.noche.numero === 1 && v.reglamento.averia !== 'ninguna') primeraConAveria++;
      if (v.noche.numero > 1) averias[v.reglamento.averia] = true;
    }
  }
  comprobar('la primera noche va sin avería, y de la segunda en adelante salen las cuatro barajadas', primeraConAveria === 0 && ['eco', 'cristal', 'apagon', 'ninguna'].every((x) => averias[x] === true), { primeraConAveria, averias: Object.keys(averias) });
  const niveles = partidas.flatMap((p) => p.noches.map((n) => n.nivel));
  comprobar('y los niveles van de Llovizna a Tormenta', niveles.indexOf(1) >= 0 && niveles.indexOf(5) >= 0, niveles);
}

paso('Todas las vistas se leen, y el productor da de cada una una liza sin problemas');
{
  const todas: VistaDelQuiebro[] = [...vistasAMano];
  for (const p of partidas) for (const v of p.vistas) todas.push(v);
  let ilegibles = 0;
  let conProblemas = 0;
  let sinLiza = 0;
  let otroAforo = 0;
  let malDelCable = 0;
  const primeros: string[] = [];
  const claves: string[] = [];
  let claveMal = 0;
  /* La clave se compara con la vista anterior DE LA MISMA MESA: entre dos mesas, dos fases distintas pueden llamarse igual. */
  const primeraDeSuMesa: VistaDelQuiebro[] = partidas.map((p) => p.vistas[0] as VistaDelQuiebro);
  let encuentroMal = 0;
  let reglamentoMal = 0;
  let limiteMal = 0;
  let pesaMas = 0;
  let encoge = 0;
  let encuentroCambia = 0;
  let mismaFaseVista = 0;
  let anterior: { fase: string; clave: string; ancho: number; encuentro: string } | null = null;
  for (const v of todas) {
    if (leerVistaDelQuiebro(v) === null) {
      ilegibles++;
      continue;
    }
    if (forma(v.tablero).length > TOPE_DEL_TABLERO || !esTableroDeclarado(v.tablero)) pesaMas++;
    const l = lizaDelQuiebro(v, CODIGO);
    if (l === null) {
      sinLiza++;
      continue;
    }
    const p = problemasDeLaDeclaracion(l);
    if (p.length > 0) {
      conProblemas++;
      if (primeros.length < 3) primeros.push(`${v.fase.tipo}: ${p.slice(0, 2).join(' | ')}`);
    }
    if (forma(l.aforo) !== forma(AFORO_DEL_QUIEBRO)) otroAforo++;
    /* Los ids del cable de cada asiento no se pisan con los de las clases (lo mira también la declaración). */
    const deClases = l.clases.flatMap((c) => c.acciones.map((a) => a.id));
    for (const r of l.asientos) if (accionesDelCable(l, r).some((id) => deClases.indexOf(id) >= 0)) malDelCable++;
    const clave = claveDeLaFase(v);
    if (claves.indexOf(clave) < 0) claves.push(clave);
    const faseCanonica = forma({ f: v.fase, n: v.noche?.numero ?? 0 });
    if (primeraDeSuMesa.indexOf(v) >= 0 || vistasAMano.indexOf(v) >= 0) anterior = null;
    if (anterior !== null && (anterior.fase === faseCanonica) !== (anterior.clave === l.fase.clave)) claveMal++;
    /*
     * DENTRO DE UNA MISMA FASE (la misma clave), la sala aplica el límite nuevo sin empezar fase: si
     * encogiera, quien estuviera en la franja se quedaría clavado fuera. Y el encuentro lo toma al
     * empezar: si cambiara, la mesa y la sala contarían con presentes distintos.
     */
    const caja = l.mundo.limites.find((x) => x.id === l.fase.limite)?.caja;
    const ancho = caja === undefined ? -1 : caja.x1 - caja.x0;
    const encuentro = forma(l.fase.encuentro);
    if (anterior !== null && anterior.clave === l.fase.clave) {
      mismaFaseVista++;
      if (ancho < anterior.ancho) encoge++;
      if (encuentro !== anterior.encuentro) encuentroCambia++;
    }
    anterior = { fase: faseCanonica, clave: l.fase.clave, ancho, encuentro };
    const presentes = v.asientos.filter((a) => !a.ausente).length;
    const e = l.fase.encuentro;
    const debeEncuentro = v.fase.tipo === 'oleada' || v.fase.tipo === 'llamada';
    if (debeEncuentro !== (e !== null)) encuentroMal++;
    if (e !== null && v.noche !== null) {
      if (e.ronda !== rondaDeLaFase(v.noche.numero, v.fase) || e.presentes !== Math.max(1, presentes) || e.vivasALaVez.length !== v.asientos.length) encuentroMal++;
      if (v.fase.tipo === 'llamada' && (e.fin.tipo !== 'salida' || e.fin.zona.accion !== ACCION_DEL_QUIEBRO.descolgar || forma(e.fin.salenComoMinimo) !== forma(v.asientos.map((_, i) => Math.ceil((i + 1) / 2))))) encuentroMal++;
      if (v.fase.tipo === 'oleada' && e.fin.tipo !== 'vaciar') encuentroMal++;
    }
    const idDelLimite = v.fase.tipo === 'llamada' ? ID_DE_LIMITE_EN_LA_LIZA.barrio : ['oleada', 'pausa', 'bajada'].indexOf(v.fase.tipo) >= 0 ? (Math.max(1, presentes) <= 3 ? ID_DE_LIMITE_EN_LA_LIZA.glorieta48 : ID_DE_LIMITE_EN_LA_LIZA.glorieta60) : null;
    if (idDelLimite !== null && l.fase.limite !== idDelLimite) limiteMal++;
    const c = componerReglamento(v) as ReglamentoCompuesto;
    for (let i = 0; i < l.asientos.length; i++) {
      const r = l.asientos[i];
      const t = c.asientos[i];
      const a = v.asientos[i];
      if (r === undefined || t === undefined || a === undefined) {
        reglamentoMal++;
        continue;
      }
      const bien =
        r.asiento === a.asiento &&
        r.cuerpo.vidaTope === t.aguante &&
        r.esquiva.ventanaMs === t.quiebro.ventanaMs &&
        r.esquiva.primeras.cuantas === a.aprendiz &&
        r.esquiva.puesta.soltableDesdeTic === t.quiebro.soltableDesdeTic &&
        r.alEmpezar.vida === (v.fase.tipo === 'bajada' ? t.aguante : Math.min(Math.max(a.control.aguante, 1), t.aguante)) &&
        r.alEmpezar.medidor === a.control.foco &&
        (r.alEmpezar.lleva[0]?.n ?? 0) === a.control.esquirlas &&
        r.cuerpo.firmeCadaTics === t.firmeCadaTics &&
        r.acciones.some((x) => x.id === ACCION_DEL_QUIEBRO.replicaDoble) === (t.replicaDoble !== null);
      if (!bien) reglamentoMal++;
    }
    if (l.equipo.recurso !== v.monedas || l.turnos.repetirTrasTics !== c.repetirTrasTics) reglamentoMal++;
  }
  nota(`${String(todas.length)} vistas miradas (${String(vistasAMano.length)} a mano y el resto del robot), ${String(claves.length)} claves de fase distintas`);
  comprobar('se han mirado cientos de vistas', todas.length >= 500, todas.length);
  comprobar('todas se leen con `leerVistaDelQuiebro`', ilegibles === 0, ilegibles);
  comprobar(`todas llevan un tablero declarado de ${String(TOPE_DEL_TABLERO)} B o menos`, pesaMas === 0, pesaMas);
  comprobar('el productor da una liza de cada una', sinLiza === 0, sinLiza);
  comprobar('y ninguna tiene problemas (`problemasDeLaDeclaracion` vacío)', conProblemas === 0, primeros);
  comprobar('el aforo es el mismo en todas, la reunión incluida', otroAforo === 0, otroAforo);
  comprobar('los ids del cable de los asientos no se pisan con los del Sistema', malDelCable === 0, malDelCable);
  comprobar('la clave de la fase cambia si y sólo si cambia la fase', claveMal === 0, claveMal);
  nota(`${String(mismaFaseVista)} vistas seguidas de la misma fase comparadas con la anterior`);
  comprobar('dentro de una misma fase el límite nunca encoge (un ausente cuenta desde la fase siguiente)', mismaFaseVista >= 100 && encoge === 0, { mismaFaseVista, encoge });
  comprobar('y el encuentro de una fase de combate no cambia mientras dura', encuentroCambia === 0, encuentroCambia);
  comprobar('hay encuentro en las oleadas y la Llamada, con su ronda, sus presentes y su final', encuentroMal === 0, encuentroMal);
  comprobar('el límite es la glorieta de 48 o de 60 según los presentes, y el barrio en la Llamada', limiteMal === 0, limiteMal);
  comprobar('el reglamento de cada asiento es el de las tablas y su punto de control', reglamentoMal === 0, reglamentoMal);
}

paso('Las recetas: cada una reparte las oleadas como dice');
{
  /*
   * La receta de la noche la sortea la mesa con su semilla. Se buscan mesas (semillas) hasta tener las
   * seis, y de cada una se mira su oleada 1 y su oleada 2 tal como las declara el productor.
   */
  const porReceta: Record<string, { o1: LizaDeclarada; o2: LizaDeclarada }> = {};
  for (let semilla = 1; semilla <= 400 && Object.keys(porReceta).length < IDS_DE_RECETA.length; semilla++) {
    const x = mesaNueva(1, semilla);
    mandar(x, 's1', 'empezar', null);
    const receta = laMesa(x).noche?.receta ?? '';
    if (porReceta[receta] !== undefined) continue;
    relojDeAhora(x);
    const o1 = lizaDelQuiebro(vista(x), CODIGO) ?? SIN_LIZA;
    hastaLaOleada(x, 2);
    const o2 = lizaDelQuiebro(vista(x), CODIGO) ?? SIN_LIZA;
    porReceta[receta] = { o1, o2 };
  }
  comprobar('las seis recetas salen en alguna mesa', IDS_DE_RECETA.every((r) => porReceta[r] !== undefined), Object.keys(porReceta));
  const grupos = (l: LizaDeclarada | undefined): GrupoDeclarado[] => (l?.fase.encuentro?.grupos ?? []) as GrupoDeclarado[];
  const deClase = (l: LizaDeclarada | undefined, c: number): GrupoDeclarado[] => grupos(l).filter((g) => g.clase === c);
  const P = CLASE_DEL_QUIEBRO;
  const tresTandas = (l: LizaDeclarada | undefined): boolean => forma(deClase(l, P.prestado).map((g) => g.desdeTic)) === forma([0, 300, 600]);
  const e = porReceta['enjambre'];
  comprobar('«Enjambre»: Prestados escalonados en un solo grupo, y los Celadores tarde', deClase(e?.o1, P.prestado).length === 1 && deClase(e?.o1, P.prestado)[0]?.cadaTics === 10 && (deClase(e?.o2, P.celador)[0]?.desdeTic ?? 0) === 400);
  const pa = porReceta['pareja'];
  comprobar('«Pareja»: la oleada 1 en tres tandas, y los Celadores de dos en dos y a la vez', tresTandas(pa?.o1) && deClase(pa?.o2, P.celador)[0]?.cadaTics === 0 && (deClase(pa?.o2, P.celador)[0]?.cuantos[0] ?? 0) === 2);
  const pi = porReceta['pinza'];
  comprobar('«Pinza»: los Prestados en dos grupos, uno a la espalda', deClase(pi?.o1, P.prestado).length === 2 && deClase(pi?.o1, P.prestado)[1]?.eleccion === 'aLaEspalda');
  const ma = porReceta['marea'];
  const mareaO1 = deClase(ma?.o1, P.prestado)[0];
  comprobar('«Marea»: la mitad más de Prestados, contra un tope de vivos a la mitad', mareaO1?.cuantos[0] === 9 && mareaO1.vivasALaVez[0] === 3 && mareaO1.cadaTics === 20);
  const fr = porReceta['francotirador'];
  comprobar('«Francotirador»: un tirador desde el borde ya en la oleada 2', tresTandas(fr?.o1) && deClase(fr?.o2, P.tirador).length === 1 && deClase(fr?.o2, P.tirador)[0]?.claseDeZona === 1 && deClase(fr?.o2, P.tirador)[0]?.desdeTic === 0);
  const em = porReceta['emboscada'];
  comprobar('«Emboscada»: la impresión de los Celadores, a la espalda del grupo', tresTandas(em?.o1) && deClase(em?.o2, P.celador)[0]?.eleccion === 'aLaEspalda');
}

paso('El productor, en lo que dice de cada cosa');
{
  const h = mesaNueva(2);
  mandar(h, 's1', 'empezar', null);
  const bajada = lizaDelQuiebro(vista(h), CODIGO) ?? SIN_LIZA;
  comprobar('en la Bajada: modo calma, sin encuentro, con el reloj de la vista y su clave', bajada.fase.modo === 'calma' && bajada.fase.encuentro === null && bajada.fase.reloj?.id === 'n1.b' && bajada.fase.clave === 'n1.b');
  relojDeAhora(h);
  const o1 = lizaDelQuiebro(vista(h), CODIGO) ?? SIN_LIZA;
  comprobar('en la oleada 1: encuentro, ronda 11, y sin reloj de fase (lo cierra la ronda)', o1.fase.modo === 'encuentro' && o1.fase.encuentro?.ronda === 11 && o1.fase.reloj === null && o1.fase.encuentro.relojTics === 3000);
  comprobar('la oleada 1 son sólo Prestados', (o1.fase.encuentro?.grupos ?? []).every((x) => x.clase === CLASE_DEL_QUIEBRO.prestado));
  comprobar('la semilla de la fase es pública y sale del código y la clave', o1.fase.semilla !== bajada.fase.semilla && o1.fase.semilla === (lizaDelQuiebro(vista(h), CODIGO) ?? SIN_LIZA).fase.semilla);
  const r = o1.asientos[0];
  comprobar(
    'el quiebro sin intocable (lo juzga su ventana), con su desplazamiento como distancia extra, y la ruptura desde tocado',
    r?.esquiva.accion === ACCION_DEL_QUIEBRO.quiebro && r.esquiva.puesta.intocableTics === 0 && r.esquiva.puesta.distanciaExtra === 4 * UNO && r.esquiva.ruptura.desde[0] === ESTADO_DEL_QUIEBRO.tocado && r.esquiva.ruptura.coste === 50,
  );
  comprobar('la Tanda encadena Entrada, Seguida, Seguida y Cierre, con compás en las Seguidas', forma(r?.acciones.filter((a) => a.cadena !== null).map((a) => [a.id, a.cadena?.tras[0], a.cadena?.ritmoMs])) === forma([[2, 1, 75], [3, 2, 75], [4, 3, 0]]));
  comprobar('el Empellón rompe la guardia y la Réplica es imparable y sólo en el Remanso', r?.acciones.some((a) => a.id === ACCION_DEL_QUIEBRO.empellon && a.efecto.rompeGuardia && a.recargaTics === 60) === true && r.acciones.some((a) => a.id === ACCION_DEL_QUIEBRO.replica && a.imparable && a.soloEn[0] === ESTADO_DEL_QUIEBRO.remanso));
  const celador = o1.clases.find((c) => c.id === CLASE_DEL_QUIEBRO.celador);
  comprobar('el Celador: 90 de vida, guardia que para la Entrada y esquiva el Empellón la mitad, y desalojable con 3 esquirlas', celador?.vida === 90 && celador.guardia?.para[0] === ACCION_DEL_QUIEBRO.entrada && celador.guardia.esquivaAlAzar.probabilidad === UNO / 2 && celador.alCaer.tipo === 'rematable' && celador.alCaer.suelta.n === 3);
  comprobar('el Trasvase: absorbe a un Prestado a 12 m, o se reimprime a 15 m y 2 s, con 45', celador?.alCaer.tipo === 'rematable' && celador.alCaer.siNo.absorbe === CLASE_DEL_QUIEBRO.prestado && celador.alCaer.siNo.vida === 45 && celador.alCaer.siNo.reapareceTras === 40);
  comprobar('el tirador dispara ráfagas de 3 balas a 20 m/s que quitan 12', o1.proyectiles[0]?.balas === 3 && o1.proyectiles[0].velocidad === 20 * UNO && o1.proyectiles[0].efecto.dano === 12);
  comprobar('las esquirlas pagan en triangular por 10, con tope de 12', o1.portables[0]?.pago.tipo === 'triangular' && o1.portables[0].pago.porUnidad === 10 && o1.portables[0].tope === 12);
  comprobar('las columnas de la ronda son las de la vista', forma(o1.veredictos.columnas) === forma(COLUMNAS_DE_LA_RONDA));
  comprobar('el coste de la sala sale del aforo de la mesa', costeDeLaLiza(o1) === 100 + 250 * 2 + 250 * AFORO_DEL_QUIEBRO.entidades + 40 * AFORO_DEL_QUIEBRO.balas);
  /* La Llamada, en Aguacero: con guardián, y la cabina de 50 s. */
  const k = mesaNueva(1);
  mandar(k, 's1', 'empezar', null);
  hastaLaOleada(k, 3);
  mandar(k, null, 'arcade:ronda', laRondaDeAhora(k, 'ganada', filasIguales(k, {})));
  eligenTodos(k, 'llamar');
  const ll = lizaDelQuiebro(vista(k), CODIGO) ?? SIN_LIZA;
  comprobar('en la Llamada: el barrio entero, fin por la cabina, sale uno de uno', ll.fase.limite === ID_DE_LIMITE_EN_LA_LIZA.barrio && ll.fase.encuentro?.fin.tipo === 'salida' && forma(ll.fase.encuentro.fin.salenComoMinimo) === '[1]');
  comprobar('la cabina suena 50 s, y otra 40 por moneda', ll.fase.encuentro?.fin.tipo === 'salida' && ll.fase.encuentro.fin.zona.activaTics === 1000 && ll.fase.encuentro.fin.zona.alApagarse.siguienteTics === 800 && ll.fase.encuentro.relojTics === 1000 + 800 * laMesa(k).monedas + 1);
  comprobar('en Llovizna la Llamada no tiene guardián', !(ll.fase.encuentro?.grupos ?? []).some((g) => g.eleccion === 'zonaDeAccion'));
}

terminar({
  escritas: 310,
  enVerde:
    'La mesa lleva la noche entera —reunión, Bajada, oleadas, pausas con voto, Llamada, recuento, final—,\n' +
    '  rechaza con motivo lo que no es y lo que llega rancio, sube y baja el nivel, recuerda la noche anterior y\n' +
    '  cierra a las diez; los ausentes cuentan desde la fase siguiente y quien vuelve, vuelve; el diario de\n' +
    '  cada noche tiene tope; las tablas son las del diseño; toda vista se lee y su tablero cabe; y el productor\n' +
    '  da una liza sin problemas, con el mismo aforo, en cada una de las vistas de las partidas del robot.',
});
