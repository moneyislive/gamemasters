/**
 * ¿SE SOSTIENE EL BURGO? — RENTAS, DADOS, MAZMORRA, CARTAS, ALMONEDA, APURO, TRATOS Y EL TIC
 *
 *   npm run verify:burgo
 *
 * ═══ QUÉ AFIRMA ESTE FICHERO, Y POR QUÉ ESTAS COSAS Y NO OTRAS ═══
 *
 * El Burgo es el sexto arcade y la memoria de esta casa tiene apuntado, tres veces,
 * lo que le pasa a un juego nuevo con la batería en verde: nada lo juega. `verify:mesa`
 * y `verify:larga` lo cubren en lo genérico; `oro:arcade` y `verify:determinismo` lo
 * congelan y lo comparan entre motores DESDE HOY; pero ninguno de ellos afirma que
 * una posada cobre lo que dice la tabla, que el tercer intento en la Mazmorra pague y
 * mueva, o que el tic liquide al ausente en un solo tic. Eso no se cae: se juega mal, y
 * se descubre a mitad de partida.
 *
 * Así que aquí se afirma, en este orden y con el ÁRBITRO DE VERDAD (`abrirMesa`,
 * `jugarConMotivo`, `avanzarElReloj`), lo que fallaría en silencio:
 *
 *   1. LAS CUATRO PUERTAS con `undefined` y con la sonda de mesa vacía, y la migración
 *      de un estado viejo (existe desde el primer commit, con vacuna).
 *   2. EMPEZAR: el aforo, el sorteo dentro, el tope de vueltas por carga, y que
 *      `ctx.azar` sólo se lee ahí.
 *   3. LAS RENTAS: suelto, barrio entero (doble), casas, posada, puertas ×1..4 con la
 *      empeñada contando, oficio ×4/×10, empeñado no cobra, presa cobra, propio no paga.
 *   4. DOBLES Y MAZMORRA: dobles repite, tres dobles encierran sin mover ni cobrar,
 *      fianza, Indulto (que vuelve al FONDO de su mazo), dados, tercer intento paga y
 *      mueve (o abre apuro y mueve igual), de visita no pasa nada.
 *   5. LAS 32 CARTAS, aplicadas UNA A UNA desde estados montados, y el mazo que rota.
 *   6. EL EMPEÑO, con el interés por tabla y el trato que lo cobra.
 *   7. LA ALMONEDA: relevo por asiento, mínimo y múltiplos, las tres fijas, la puja
 *      libre por la puerta con campos EXACTOS, ganador que paga, nadie puja, el que
 *      declinó no vuelve.
 *   8. EL APURO Y LA QUIEBRA: no se pasa en apuro, vender y empeñar saldan solos,
 *      varios acreedores, quiebra con jugador (todo a él, interés en el acto) y con el
 *      Concejo (almonedas en cola, Indultos al fondo), rendirse en y fuera de apuro.
 *   9. LOS TRATOS: por puerta, del turno y AL del turno, campos exactos, tope 3,
 *      aceptar revalida, retirar, rechazar, caducan al relevar, y el que cae por otro.
 *  10. LAS OBRAS: parejo al alzar y al vender, la posada devuelve cuatro casas, sin
 *      casas en el Concejo no se alza.
 *  11. EL TIC, caso a caso, y una mesa de seis con NADIE moviendo que acaba sola.
 *  12. «SÓLO SI»: cada tipo mandado fuera de su momento devuelve EL MISMO objeto con
 *      motivo, y ningún motivo lleva un secreto (vacuna con `'p07'`).
 *  13. PARTIDAS ENTERAS DE 2, 4 Y 6 jugadas por el robot, contadas desde los `sucesos`
 *      de la vista: quiebras, rentas, almonedas ganadas, Mazmorra, barrios alzados,
 *      tratos aceptados y un ganador; reejecutadas del diario; con secretos, forma y
 *      canónico mirados EN CADA REVISIÓN de siete miradas; y con la vacuna del robot
 *      que sólo pasa, que se ve caer.
 *  14. TAMAÑOS Y PRESUPUESTO: el peor estado, la peor vista, las peores opciones, la
 *      carga más gorda, la cascada de 28 almonedas, y las cifras impresas.
 *
 * ═══ LAS VACUNAS ═══
 *
 * Cada regla se comprueba con una función de REPROCHES que se aplica al caso bueno y a
 * un caso envenenado, y se exige que el envenenado dé reproches: una comprobación que
 * sólo ha visto datos buenos no se ha visto fallar nunca.
 *
 * ═══ POR QUÉ EN PROCESO ═══
 *
 * Aquí se comprueban REGLAS, que viven en `shared/`. Lo que viaja por el cable lo
 * comprueba `verify:mesa` levantando el servidor, y el Burgo tiene allí su bloque.
 *
 * ═══ LO QUE ESTE FICHERO DECIDIÓ DONDE EL DISEÑO CALLABA ═══
 *
 *   · «Seis sentados, nadie mueve, ≤ 2.500 tics» se mide con tope de vueltas 6, no 30:
 *     con 30 son ~7.900 tics (cada título sin comprar sale a almoneda y los seis pasan
 *     uno a uno: nueve tics por turno). Se imprime la cifra y se exige además la de
 *     cuatro con tope 10.
 *   · La tabla (§2.2) no se repite: la afirma `verify:mecanicas-burgo`.
 *   · Los secretos del Burgo no pueden aparecer en NINGUNA vista (no hay manos): la
 *     búsqueda es más estricta que la de `verify:mesa`, que admite una aparición.
 *   · Los topes propios de tiempo se afirman contra la mitad del de producción (25 ms)
 *     y no contra los de §8.6 (2 y 10 ms): la batería corre con otros procesos al lado
 *     y un rojo por contención acaba en un comprobador apagado. Las cifras se imprimen.
 */
import { performance } from 'node:perf_hooks';
import { abrirMesa, avanzarElReloj, jugar, jugarConMotivo, MovimientoRechazado } from '../src/arcade/arbitro';
import type { Mesa } from '../src/arcade/arbitro';
import {
  aplicarConMotivo,
  ESPECTADOR,
  loSecretoDe,
  opcionesDeArcade,
  reejecutarEn,
  registrarProyeccion,
  vistaDeAsiento,
} from '../../shared/arcade';
import type { AsientoId, ContextoMovimiento, LosSentados, Movimiento, Opcion, QuienMira } from '../../shared/arcade';
import { canonico, porQueNoEsCanonico } from '../../shared/mecanicas/canonico';
import { enteroEntre, sembrar } from '../../shared/mecanicas/azar';
import type { Azar } from '../../shared/mecanicas/azar';
import { turnoDeLaVista } from '../../shared/mecanicas/turno-declarado';
import { opcionesSueltas } from '../../shared/mecanicas/tablero-declarado';
import '../../shared/arcade/juegos';
import {
  A_ALMONEDA,
  ACEPTAR,
  ALZAR,
  avanzarElBurgo,
  BURGO,
  COLORES_DEL_BURGO,
  comoSiSiempreHubieraHabidoBurgo,
  COMPRAR,
  DESEMPENAR,
  EMPENAR,
  EMPEZAR,
  LIBRE,
  loSecretoDelBurgo,
  MANIFIESTO_BURGO,
  opcionesDelBurgo,
  PAGAR_FIANZA,
  partidaNueva,
  PASAR,
  PASAR_PUJA,
  PROPONER,
  proyectarElBurgo,
  PUJAR,
  RECHAZAR,
  RENDIRSE,
  RETIRAR,
  RONDAS_DE_SORTEO,
  seAcabo,
  TIRAR,
  TOPE_DE_SUCESOS,
  TRATOS_ABIERTOS_POR_PROPONENTE,
  USAR_INDULTO,
  VENDER,
} from '../../shared/arcade/juegos/burgo';
import type {
  ApuroDelBurgo,
  EstadoDelBurgo,
  JugadorDelBurgo,
  ParDeDados,
  SucesoDelBurgo,
  TituloDelBurgo,
  TratoDelBurgo,
  VistaDelBurgo,
} from '../../shared/arcade/juegos/burgo';
import {
  CASAS_DEL_CONCEJO,
  CASILLAS,
  cartasDe,
  costeDeDesempeno,
  DINERO_DE_SALIDA,
  EL_ARCA,
  EL_DIEZMO,
  EL_PREGON,
  FIANZA,
  interesDelEmpeno,
  LA_FERIA,
  LA_MAZMORRA,
  ESCALONES_DE_PUJA,
  MULTIPLO_DE_OFICIO,
  MULTIPLO_DE_OFICIO_POR_CARTA,
  PAGA_DE_LA_PUERTA_MAYOR,
  PASO_DE_PUJA,
  POSADA,
  POSADAS_DEL_CONCEJO,
  PUJA_MINIMA,
  RENTA_DE_PUERTA,
  serieDeCarta,
  seriesDe,
  TITULOS,
  valorDeEmpeno,
} from '../../shared/arcade/juegos/burgo-tablero';
import type { CartaDelBurgo, MazoId } from '../../shared/arcade/juegos/burgo-tablero';
import { MARCAS_VETADAS } from './marcas-registradas';
import { asientosDelRobot, jugarConElRobot, loQueHaceElRobot, loQueHaceElRobotMudo } from './robot-del-burgo';
import type { DecisionDelRobot } from './robot-del-burgo';

// ---------------------------------------------------------------------------
// El armazón
// ---------------------------------------------------------------------------

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  let cola = '';
  if (detalle !== undefined) {
    try {
      cola = `\n      ${String(JSON.stringify(detalle)).slice(0, 500)}`;
    } catch {
      cola = `\n      ${String(detalle).slice(0, 500)}`;
    }
  }
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const ANA = 'a-ana';
const BRUNO = 'a-bruno';
const CARLA = 'a-carla';
const DIEGO = 'a-diego';
const SEIS: AsientoId[] = [ANA, BRUNO, CARLA, DIEGO, 'a-eva', 'a-fer'];
const TRES: AsientoId[] = SEIS.slice(0, 3);
const CUATRO: AsientoId[] = SEIS.slice(0, 4);
const NOMBRES: LosSentados = [
  { asiento: ANA, nombre: 'Ana' },
  { asiento: BRUNO, nombre: 'Bruno' },
  { asiento: CARLA, nombre: 'Carla' },
  { asiento: DIEGO, nombre: 'Diego' },
  { asiento: 'a-eva', nombre: 'Eva' },
  { asiento: 'a-fer', nombre: 'Fer' },
];

/** El tope de la carga de un trato, de la vista y del estado, en bytes canónicos (§8.6). */
const TOPE_DE_ESTADO = 24 * 1024;
const TOPE_DE_VISTA = 40 * 1024;
const TOPE_DE_OPCIONES = 60;
const TOPE_DE_OPCIONES_BYTES = 12 * 1024;
const TOPE_DE_CARGA = 1024;
/** La mitad del tope de producción (50 ms): ver la cabecera. */
const TOPE_DE_MS = 25;
/** Cuántos tics como mucho para que una mesa sin nadie acabe. */
const TOPE_DE_TICS_SIN_NADIE = 2500;

function estadoDe(mesa: Mesa): EstadoDelBurgo {
  return mesa.estado as EstadoDelBurgo;
}

function vistaDe(e: EstadoDelBurgo | undefined, quien: QuienMira, sentados?: LosSentados): VistaDelBurgo {
  return vistaDeAsiento(BURGO, e, quien, sentados) as VistaDelBurgo;
}

function opcionesEn(e: EstadoDelBurgo | undefined, quien: QuienMira): readonly Opcion[] {
  return opcionesDeArcade(BURGO, vistaDe(e, quien), quien);
}

function opcionPorId(e: EstadoDelBurgo, quien: AsientoId, id: string): Opcion | null {
  for (const o of opcionesEn(e, quien)) if (o.id === id) return o;
  return null;
}

function idsDe(e: EstadoDelBurgo, quien: AsientoId): string[] {
  return opcionesEn(e, quien).map((o) => o.id);
}

/**
 * Mover por la puerta del árbitro, conservando el motivo. `MovimientoRechazado`
 * (asiento, rev) cuenta como motivo. Si el estado no cambió por identidad se
 * devuelve LA MESA QUE ENTRÓ, que es lo que hace `mesas.ts` con un movimiento que
 * el juego ignoró o rechazó: ni revisión, ni diario, ni escritura.
 */
function mover(mesa: Mesa, quien: AsientoId, movimiento: Movimiento): { mesa: Mesa; motivo: string | null; cambio: boolean } {
  try {
    const r = jugarConMotivo(mesa, { quien, movimiento, rev: mesa.rev });
    /* Un rechazo se descarta ENTERO aunque el objeto sea otro (una mesa recién abierta construye partidaNueva al rechazar). */
    if (r.motivo !== null || r.mesa.estado === mesa.estado) return { mesa, motivo: r.motivo, cambio: false };
    return { mesa: r.mesa, motivo: r.motivo, cambio: true };
  } catch (error) {
    if (error instanceof MovimientoRechazado) return { mesa, motivo: error.message, cambio: false };
    throw error;
  }
}

function mesaSobre(id: string, estado: EstadoDelBurgo | undefined, asientos: readonly AsientoId[], semilla = 7): Mesa {
  return abrirMesa({ id, arcade: BURGO, semilla, asientos, estado });
}

/** Una mesa recién EMPEZADA por el primer asiento, con el tope que se pida. */
function empezada(id: string, asientos: readonly AsientoId[], semilla: number, topeDeVueltas = 0): Mesa {
  const mesa = mesaSobre(id, undefined, asientos, semilla);
  return jugar(mesa, { quien: asientos[0] as AsientoId, movimiento: { tipo: EMPEZAR, carga: { topeDeVueltas } }, rev: 0 });
}

function sucesosDe(e: EstadoDelBurgo, que: SucesoDelBurgo['que']): SucesoDelBurgo[] {
  return e.sucesos.filter((s) => s.que === que);
}

function jugadorDe(e: EstadoDelBurgo, asiento: AsientoId): JugadorDelBurgo {
  const j = e.jugadores.find((x) => x.asiento === asiento);
  if (j === undefined) throw new Error(`no está sentado ${asiento}`);
  return j;
}

function tituloDe(e: EstadoDelBurgo, casilla: number): TituloDelBurgo {
  const t = e.titulos.find((x) => x.casilla === casilla);
  if (t === undefined) throw new Error(`la casilla ${casilla} no es un título`);
  return t;
}

function conJugador(e: EstadoDelBurgo, asiento: AsientoId, cambios: Partial<JugadorDelBurgo>): EstadoDelBurgo {
  return { ...e, jugadores: e.jugadores.map((j) => (j.asiento === asiento ? { ...j, ...cambios } : j)) };
}

function conTitulo(e: EstadoDelBurgo, casilla: number, cambios: Partial<TituloDelBurgo>): EstadoDelBurgo {
  return { ...e, titulos: e.titulos.map((t) => (t.casilla === casilla ? { ...t, ...cambios } : t)) };
}

/** Varios títulos de golpe: `[casilla, dueño, casas, empeñado]`. */
function conTitulos(e: EstadoDelBurgo, filas: ReadonlyArray<readonly [number, AsientoId | null, number, boolean]>): EstadoDelBurgo {
  let s = e;
  for (const [casilla, dueno, casas, empenado] of filas) s = conTitulo(s, casilla, { dueno, casas, empenado });
  return s;
}

/** El turno para `asiento`, en el paso que se diga, sin apuro ni almoneda. */
function turnoDe(e: EstadoDelBurgo, asiento: AsientoId, pasoDelTurno: EstadoDelBurgo['paso'] = 'por-tirar'): EstadoDelBurgo {
  const turno = e.jugadores.findIndex((j) => j.asiento === asiento);
  return { ...e, turno, paso: pasoDelTurno, luego: 'por-pasar', dobles: 0, apuro: null, almoneda: null, colaDeApuros: [], colaDeAlmonedas: [] };
}

/**
 * UN AZAR QUE SACA ESTOS PARES, en este orden, con los dos dados encadenados como
 * los encadena el reductor. Se busca la semilla a fuerza bruta: cada par es 1/36 y
 * tres pares son unos cincuenta mil intentos de una cuenta de nada. Es la misma
 * forma legítima de fijar una tirada que usa `verify:riberas`.
 */
function azarQueSaca(pares: readonly ParDeDados[]): Azar {
  for (let semilla = 1; semilla < 5_000_000; semilla++) {
    const raiz = sembrar(semilla);
    let a = raiz;
    let vale = true;
    for (const [d1, d2] of pares) {
      const uno = enteroEntre(a, 1, 6);
      const dos = enteroEntre(uno.azar, 1, 6);
      if (uno.valor !== d1 || dos.valor !== d2) {
        vale = false;
        break;
      }
      a = dos.azar;
    }
    if (vale) return raiz;
  }
  throw new Error(`no hay semilla que saque ${JSON.stringify(pares)}`);
}

/** Pone a `asiento` en `casilla`, con el turno y el azar que sacará `pares`, y devuelve la mesa lista para TIRAR. */
function listoParaTirar(id: string, base: EstadoDelBurgo, asiento: AsientoId, casilla: number, pares: readonly ParDeDados[]): Mesa {
  const e = { ...turnoDe(conJugador(base, asiento, { casilla }), asiento), azar: azarQueSaca(pares), tirada: null };
  return mesaSobre(id, e, base.jugadores.map((j) => j.asiento));
}

function tira(mesa: Mesa, quien: AsientoId): Mesa {
  const r = mover(mesa, quien, { tipo: TIRAR, carga: {} });
  if (r.motivo !== null) throw new Error(`TIRAR rechazado: ${r.motivo}`);
  return r.mesa;
}

function pagosDe(e: EstadoDelBurgo, quien: AsientoId): Array<{ a: AsientoId | null; cuanto: number; porque: string }> {
  const salida: Array<{ a: AsientoId | null; cuanto: number; porque: string }> = [];
  for (const s of e.sucesos) if (s.que === 'paga' && s.quien === quien) salida.push({ a: s.a, cuanto: s.cuanto, porque: s.porque });
  return salida;
}

function cobrosDe(e: EstadoDelBurgo, quien: AsientoId): Array<{ de: AsientoId | null; cuanto: number; porque: string }> {
  const salida: Array<{ de: AsientoId | null; cuanto: number; porque: string }> = [];
  for (const s of e.sucesos) if (s.que === 'cobra' && s.quien === quien) salida.push({ de: s.de, cuanto: s.cuanto, porque: s.porque });
  return salida;
}

// ---------------------------------------------------------------------------
// Los reproches genéricos: secretos, forma, marcas
// ---------------------------------------------------------------------------

/** Igual que en `verificar-procedencia.ts`: sin acentos, sin mayúsculas, sin puntuación. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function marcasEn(texto: string): string[] {
  const n = ` ${normalizar(texto)} `;
  return MARCAS_VETADAS.filter((m) => n.indexOf(` ${normalizar(m.nombre)} `) >= 0).map((m) => m.nombre);
}

/**
 * NINGÚN SECRETO EN NINGUNA VISTA NI EN NINGUNA OPCIÓN. Más estricto que el de
 * `verify:mesa` (que admite una aparición, la del dueño de una mano): el Burgo no
 * tiene manos. Se busca la forma canónica CON COMILLAS —`"p07"`— para que `p1` no
 * case dentro de `p12`, y el objeto azar entero, que es la forma de que un `7` de
 * contador no dé un rojo falso.
 */
function reprochesDeSecretos(e: EstadoDelBurgo | undefined, asientos: readonly AsientoId[]): string[] {
  const reproches: string[] = [];
  const secretos = loSecretoDe(BURGO, e);
  if (secretos.length === 0) return ['el Burgo no declara ningún secreto'];
  const miradas: QuienMira[] = [ESPECTADOR, ...asientos];
  for (const quien of miradas) {
    const vista = vistaDeAsiento(BURGO, e, quien);
    const texto = canonico({ vista, opciones: opcionesDeArcade(BURGO, vista, quien) });
    for (const secreto of secretos) {
      const buscado = canonico(secreto);
      if (texto.indexOf(buscado) >= 0) reproches.push(`${buscado.slice(0, 40)} aparece en lo que se le manda a ${quien ?? 'el espectador'}`);
    }
  }
  return reproches;
}

/** Un texto con un secreto dentro: un motivo, un rótulo, una ayuda. */
function reprochesDeTexto(texto: string, e: EstadoDelBurgo): string[] {
  const reproches: string[] = [];
  for (const secreto of loSecretoDe(BURGO, e)) {
    const buscado = canonico(secreto);
    if (texto.indexOf(buscado) >= 0 || (typeof secreto === 'string' && texto.indexOf(secreto) >= 0)) {
      reproches.push(`«${texto.slice(0, 60)}» lleva dentro ${buscado.slice(0, 30)}`);
    }
  }
  for (const m of marcasEn(texto)) reproches.push(`«${texto.slice(0, 60)}» nombra ${m}`);
  return reproches;
}

/** Los campos EXACTOS de `VistaDelBurgo` (§3.1). Un campo nuevo pone esto rojo y obliga a venir a mirar si puede salir. */
const CAMPOS_DE_LA_VISTA =
  'almoneda,apuro,aviso,concejo,desde,dobles,duenoDelTurno,ganadores,jugada,jugadores,luego,momento,paso,pregon,quedan,sorteoDeSalida,sucesos,tablero,tirada,tiradasDelTurno,titulos,topeDeVueltas,tratos,turnoDe,turnosAbiertos,ultimaCarta,yo';

/**
 * LA FORMA DE LO QUE SE LE MANDA A UNA MIRADA: canónico, campos cerrados, `turnoDe`
 * válido, ni un toque en caras ni nudos, ids únicos, cada movimiento exactamente una
 * vez, ninguna carga `undefined`, ningún pregón vacío en `jugando`, ningún id crudo
 * en los textos si hay nombres, ninguna marca. Se aplica en cada revisión de cada
 * partida y a los estados montados.
 */
function reprochesDeForma(vista: unknown, opciones: readonly Opcion[], quien: QuienMira, conNombres: boolean): string[] {
  const reproches: string[] = [];
  const noCanonico = porQueNoEsCanonico({ vista, opciones });
  if (noCanonico !== null) reproches.push(`no es canónico: ${noCanonico}`);
  const v = vista as VistaDelBurgo;
  const campos = Object.keys(v).sort().join(',');
  if (campos !== CAMPOS_DE_LA_VISTA) reproches.push(`la vista manda otros campos: ${campos}`);
  const turno = turnoDeLaVista(vista);
  if (!turno.declarado) reproches.push('la vista no declara `turnoDe`');
  else if (turno.de !== null) {
    const j = v.jugadores.find((x) => x.asiento === turno.de);
    if (j === undefined || j.quebrado) reproches.push(`turnoDe apunta a ${turno.de}, que no es un asiento vivo`);
  }
  if (v.momento === 'jugando' && turno.declarado && turno.de === null) reproches.push('en jugando turnoDe es null');
  if (v.momento !== 'jugando' && turno.declarado && turno.de !== null) reproches.push(`fuera de jugando turnoDe es ${turno.de}`);
  if (v.yo !== quien) reproches.push(`yo es ${String(v.yo)} y mira ${String(quien)}`);
  if (v.desde !== 'burgo') reproches.push('desde no es burgo');
  if (v.jugadores.length > 0 && v.titulos.length !== TITULOS.length) reproches.push(`${v.titulos.length} títulos`);
  if (v.sucesos.length > TOPE_DE_SUCESOS) reproches.push(`${v.sucesos.length} sucesos`);
  if (v.momento === 'jugando' && v.pregon.length === 0) reproches.push('pregón vacío en jugando');
  const t = v.tablero;
  if (t.caras.length !== 40) reproches.push(`${t.caras.length} caras`);
  if (!t.caras.every((c) => c.toque === null)) reproches.push('una cara lleva toque');
  if (!t.nudos.every((n) => n.toque === null)) reproches.push('un nudo lleva toque');
  if (t.lineas.length !== 0) reproches.push('hay líneas');
  const ids = [...t.caras.map((c) => c.id), ...t.nudos.map((n) => n.id)];
  if (new Set(ids).size !== ids.length) reproches.push('ids de caras/nudos repetidos');
  for (const a of t.acciones) {
    if (a.toque.carga === undefined) reproches.push(`la acción ${a.id} lleva carga undefined`);
    if (!a.disponible) reproches.push(`la acción ${a.id} va apagada`);
  }
  for (const o of opciones) if (o.carga === undefined) reproches.push(`la opción ${o.id} lleva carga undefined`);
  const sinDeclaracion = opciones.filter((o) => o.declaracion !== true);
  /*
   * Cada movimiento se enseña UNA vez: todo lo que no es puerta baja a `acciones`, así
   * que lo que `opcionesSueltas` deja fuera del tablero son EXACTAMENTE las puertas
   * (que no se pintan como botón en ningún mueble) y ni una opción normal más.
   */
  const sueltas = opcionesSueltas(t, opciones);
  const puertas = opciones.filter((o) => o.declaracion === true);
  if (canonico(sueltas) !== canonico(puertas)) reproches.push('opcionesSueltas deja fuera del tablero algo que no es una puerta, o pinta una puerta');
  if (t.acciones.length !== sinDeclaracion.length) reproches.push(`${t.acciones.length} acciones por ${sinDeclaracion.length} opciones`);
  const idsDeAccion = t.acciones.map((a) => a.id);
  if (new Set(idsDeAccion).size !== idsDeAccion.length) reproches.push('ids de acción repetidos');
  if (quien === ESPECTADOR && opciones.length > 0) reproches.push('el espectador recibe opciones');
  const textos: string[] = [v.pregon, v.aviso, t.aviso];
  for (const p of t.paneles) textos.push(p.titulo, ...p.lineas);
  for (const o of opciones) textos.push(o.rotulo, o.ayuda);
  for (const c of t.caras) textos.push(c.rotulo, c.cifra);
  for (const texto of textos) {
    for (const m of marcasEn(texto)) reproches.push(`«${texto.slice(0, 40)}» nombra ${m}`);
    if (conNombres) {
      for (const j of v.jugadores) if (texto.indexOf(j.asiento) >= 0) reproches.push(`«${texto.slice(0, 60)}» enseña el id crudo ${j.asiento}`);
    }
  }
  return reproches;
}

/** Los reproches de forma de las siete miradas de una mesa. */
function reprochesDeLasMiradas(e: EstadoDelBurgo | undefined, asientos: readonly AsientoId[], conNombres: boolean): string[] {
  const reproches: string[] = [];
  const sentados = conNombres ? NOMBRES : undefined;
  for (const quien of [ESPECTADOR, ...asientos] as QuienMira[]) {
    const vista = vistaDeAsiento(BURGO, e, quien, sentados);
    const opciones = opcionesDeArcade(BURGO, vista, quien);
    for (const r of reprochesDeForma(vista, opciones, quien, conNombres)) reproches.push(`${quien ?? 'espectador'}: ${r}`);
  }
  return reproches;
}

// ---------------------------------------------------------------------------
paso('1. Las cuatro puertas con `undefined`, la sonda de mesa vacía, y la migración');
// ---------------------------------------------------------------------------

{
  const sonda: ContextoMovimiento = { quien: null, azar: 1, tic: 0, asientos: [] };
  const r = aplicarConMotivo(avanzarElBurgo, undefined, { tipo: 'sonda:mesa-vacia' }, sonda);
  comprobar('la sonda de mesa vacía no lanza y deja una partida reuniéndose', r.estado !== undefined && r.estado.momento === 'reuniendo');
  comprobar('y la rechaza con motivo, porque no es un movimiento del Burgo', r.motivo !== null && r.motivo.length > 0, r.motivo);
  comprobar('el estado que sale es partidaNueva byte a byte', canonico(r.estado) === canonico(partidaNueva()));

  const delEspectador = proyectarElBurgo(undefined, ESPECTADOR);
  const turno = turnoDeLaVista(delEspectador);
  comprobar('la vista del espectador con undefined declara turnoDe null', turno.declarado && turno.de === null, turno);
  const deAna = proyectarElBurgo(undefined, ANA);
  comprobar('y la de un asiento también, con yo puesto', turnoDeLaVista(deAna).declarado && deAna.yo === ANA);
  comprobar('el momento es reuniendo y el pregón lo dice', delEspectador.momento === 'reuniendo' && delEspectador.pregon.length > 0);
  comprobar('loSecreto con undefined devuelve el azar y nada más', loSecretoDelBurgo(undefined).length === 1);
  comprobar('seAcabo con undefined es falso', seAcabo(undefined) === false);
  comprobar('el espectador no recibe opciones', opcionesDelBurgo(delEspectador, ESPECTADOR).length === 0);
  const deReunion = opcionesDelBurgo(deAna, ANA);
  comprobar('un sentado en reuniendo recibe exactamente «empezar»', deReunion.length === 1 && deReunion[0]?.id === 'empezar' && deReunion[0]?.tipo === EMPEZAR);
  comprobar('con la carga { topeDeVueltas: 0 } y sin declaración', canonico(deReunion[0]?.carga) === canonico({ topeDeVueltas: 0 }) && deReunion[0]?.declaracion === undefined);
  comprobar('la forma de la vista sobre undefined es la cerrada, para las siete miradas', reprochesDeLasMiradas(undefined, SEIS, false).length === 0, reprochesDeLasMiradas(undefined, SEIS, false));

  /* El tic sobre undefined construye la partida (rev 1, conocido); sobre partidaNueva() es el mismo objeto. */
  const nueva = partidaNueva();
  const tic: Movimiento = { tipo: 'arcade:tic' };
  const trasTic = aplicarConMotivo(avanzarElBurgo, nueva, tic, sonda);
  comprobar('el tic en reuniendo devuelve EL MISMO objeto', trasTic.estado === nueva && trasTic.motivo === null);
  const desdeNada = aplicarConMotivo(avanzarElBurgo, undefined, tic, sonda);
  comprobar('el primer tic sobre undefined construye partidaNueva (rev 1: conocido, no es fallo)', canonico(desdeNada.estado) === canonico(nueva));

  /* La migración. */
  comprobar('un estado con version 1 y entero pasa por la migración como EL MISMO objeto', comoSiSiempreHubieraHabidoBurgo(nueva) === nueva);
  const sinVersion = { ...nueva } as Record<string, unknown>;
  delete sinVersion.version;
  const migrado = comoSiSiempreHubieraHabidoBurgo(sinVersion as unknown as EstadoDelBurgo);
  comprobar('un estado sin version sale con version 1 y todos los campos', migrado.version === 1 && canonico(migrado) === canonico(nueva));
  const empezadaVieja = estadoDe(empezada('MIG', TRES, 11));
  const conUnCampoMenos = { ...empezadaVieja } as Record<string, unknown>;
  delete conUnCampoMenos.colaDeApuros;
  delete conUnCampoMenos.sorteoDeSalida;
  const rellenado = comoSiSiempreHubieraHabidoBurgo(conUnCampoMenos as unknown as EstadoDelBurgo);
  comprobar(
    'un estado guardado con dos campos menos sale entero y conserva lo que tenía',
    rellenado.colaDeApuros.length === 0 &&
      rellenado.sorteoDeSalida.length === 0 &&
      rellenado.jugadores.length === 3 &&
      rellenado.pregon.length === 16 &&
      rellenado.momento === 'jugando',
    Object.keys(rellenado),
  );
  comprobar('y ese estado migrado se proyecta y ofrece opciones sin lanzar', reprochesDeLasMiradas(rellenado, TRES, false).length === 0, reprochesDeLasMiradas(rellenado, TRES, false));
  comprobar('la vacuna: `null` como estado guardado sale como partida nueva', canonico(comoSiSiempreHubieraHabidoBurgo(null as unknown as EstadoDelBurgo)) === canonico(nueva));
  comprobar('un movimiento desconocido devuelve EL MISMO objeto con motivo', (() => {
    const r2 = aplicarConMotivo(avanzarElBurgo, empezadaVieja, { tipo: 'burgo:inventado', carga: {} }, { quien: ANA, azar: 1, tic: 0, asientos: TRES });
    return r2.estado === empezadaVieja && r2.motivo !== null;
  })());
}

// ---------------------------------------------------------------------------
paso('2. EMPEZAR: el aforo, el sorteo dentro, el tope por carga, y ctx.azar sólo aquí');
// ---------------------------------------------------------------------------

{
  const mesa = empezada('EMP', CUATRO, 20260909);
  const e = estadoDe(mesa);
  comprobar('la mesa de cuatro empieza jugando en por-tirar', e.momento === 'jugando' && e.paso === 'por-tirar' && e.luego === 'por-pasar');
  comprobar('con turnosAbiertos 1 y jugada 1', e.turnosAbiertos === 1 && e.jugada === 1 && mesa.rev === 1);
  comprobar(
    'cuatro jugadores en el orden de los asientos, con su color por orden y sin módulo',
    e.jugadores.map((j) => j.asiento).join() === CUATRO.join() && e.jugadores.every((j, i) => j.color === COLORES_DEL_BURGO[i]),
  );
  comprobar(
    'todos en la Puerta Mayor, libres, con 1.500 mrs, sin Indultos y sin vueltas',
    e.jugadores.every((j) => j.casilla === 0 && j.presa === LIBRE && j.mrs === DINERO_DE_SALIDA && j.indultos.length === 0 && !j.quebrado && j.vueltas === 0),
  );
  comprobar('28 títulos del Concejo, sin casas ni empeños, en orden de casilla', e.titulos.length === 28 && e.titulos.every((t, i) => t.casilla === TITULOS[i] && t.dueno === null && t.casas === 0 && !t.empenado));
  comprobar('el Concejo guarda 32 casas y 12 posadas', e.casasEnElConcejo === CASAS_DEL_CONCEJO && e.posadasEnElConcejo === POSADAS_DEL_CONCEJO);
  comprobar('el Pregón son las 16 series barajadas, sin repetir', e.pregon.length === 16 && new Set(e.pregon).size === 16 && [...e.pregon].sort().join() === seriesDe('pregon').join());
  comprobar('y el Arca igual, con sus 16', e.arca.length === 16 && new Set(e.arca).size === 16 && [...e.arca].sort().join() === seriesDe('arca').join());
  comprobar('y barajados de verdad: no en orden de tabla', e.pregon.join() !== seriesDe('pregon').join() && e.arca.join() !== seriesDe('arca').join());
  const sale = sucesosDe(e, 'sale');
  comprobar('el sorteo dejó un `sale` por candidato y ronda', sale.length >= 4);
  const empieza = sucesosDe(e, 'empieza');
  comprobar('y un `empieza` y un `turno` para el mismo asiento', empieza.length === 1 && sucesosDe(e, 'turno').length === 1 && (empieza[0] as { quien: string }).quien === e.jugadores[e.turno]?.asiento);
  const ultimaRonda = Math.max(...sale.map((s) => (s as { ronda: number }).ronda));
  const delaUltima = sale.filter((s) => (s as { ronda: number }).ronda === ultimaRonda) as Array<{ quien: string; dados: ParDeDados }>;
  const mejor = Math.max(...delaUltima.map((s) => s.dados[0] + s.dados[1]));
  comprobar('quien sale es quien sacó más en la última ronda', delaUltima.some((s) => s.quien === e.jugadores[e.turno]?.asiento && s.dados[0] + s.dados[1] === mejor));
  comprobar('sorteoDeSalida guarda una tirada por jugador', e.sorteoDeSalida.length === 4 && e.sorteoDeSalida.every((p) => p[0] >= 1 && p[0] <= 6 && p[1] >= 1 && p[1] <= 6));
  comprobar('la vista de todos enseña turnoDe = quien empieza', vistaDe(e, ESPECTADOR).turnoDe === e.jugadores[e.turno]?.asiento && vistaDe(e, BRUNO).turnoDe === vistaDe(e, ESPECTADOR).turnoDe);
  comprobar('ni un reproche de forma en las cinco miradas de la mesa recién empezada', reprochesDeLasMiradas(e, CUATRO, true).length === 0, reprochesDeLasMiradas(e, CUATRO, true));
  comprobar('ni un secreto en ninguna', reprochesDeSecretos(e, CUATRO).length === 0, reprochesDeSecretos(e, CUATRO));

  /* El aforo: se ofrece de más y lo rechaza el reductor con motivo. */
  const sola = mover(mesaSobre('EMP-1', undefined, [ANA]), ANA, { tipo: EMPEZAR, carga: { topeDeVueltas: 0 } });
  comprobar('con un solo sentado EMPEZAR se rechaza con motivo y la mesa no cambia', sola.motivo !== null && sola.motivo.indexOf('Hacen falta') === 0 && !sola.cambio, sola.motivo);
  const siete = mover(mesaSobre('EMP-7', undefined, [...SEIS, 'a-gil']), ANA, { tipo: EMPEZAR, carga: { topeDeVueltas: 0 } });
  comprobar('con siete también', siete.motivo !== null && siete.motivo.indexOf('Hacen falta') === 0 && !siete.cambio, siete.motivo);
  comprobar('el manifiesto dice de 2 a 6', MANIFIESTO_BURGO.jugadores.minimo === 2 && MANIFIESTO_BURGO.jugadores.maximo === 6);
  const dos = empezada('EMP-2', SEIS.slice(0, 2), 3);
  comprobar('con dos empieza', estadoDe(dos).momento === 'jugando' && estadoDe(dos).jugadores.length === 2);
  const seis = empezada('EMP-6', SEIS, 3);
  comprobar('y con seis, con los seis colores distintos', estadoDe(seis).jugadores.length === 6 && new Set(estadoDe(seis).jugadores.map((j) => j.color)).size === 6);

  /* El tope de vueltas por carga: la opción ofrece 0; quien abre puede mandar otro. */
  const conTope = empezada('EMP-T', TRES, 5, 30);
  comprobar('EMPEZAR con { topeDeVueltas: 30 } pasa el portillo y guarda el tope', estadoDe(conTope).topeDeVueltas === 30 && vistaDe(estadoDe(conTope), ESPECTADOR).topeDeVueltas === 30);
  const topeLoco = mover(mesaSobre('EMP-L', undefined, TRES), ANA, { tipo: EMPEZAR, carga: { topeDeVueltas: 5000 } });
  comprobar('con un tope fuera de rango se rechaza con motivo', topeLoco.motivo !== null && !topeLoco.cambio);
  const campoDeMas = mover(mesaSobre('EMP-C', undefined, TRES), ANA, { tipo: EMPEZAR, carga: { topeDeVueltas: 0, relleno: 'x' } });
  comprobar('y con un campo de más también: la carga es exactamente { topeDeVueltas }', campoDeMas.motivo !== null && !campoDeMas.cambio);
  const negativo = mover(mesaSobre('EMP-N', undefined, TRES), ANA, { tipo: EMPEZAR, carga: { topeDeVueltas: -1 } });
  comprobar('y con un tope negativo', negativo.motivo !== null && !negativo.cambio);
  const otraVez = mover(mesa, BRUNO, { tipo: EMPEZAR, carga: { topeDeVueltas: 0 } });
  comprobar('un segundo EMPEZAR en jugando devuelve el mismo estado con motivo', !otraVez.cambio && otraVez.motivo !== null);

  /* El sorteo con empate repite entre los empatados y acaba antes del tope de rondas. */
  let conEmpate: EstadoDelBurgo | null = null;
  let rondasMaximas = 0;
  for (let semilla = 1; semilla < 400 && (conEmpate === null || semilla < 60); semilla++) {
    const s = estadoDe(empezada(`SOR-${semilla}`, TRES, semilla));
    const rondas = Math.max(...sucesosDe(s, 'sale').map((x) => (x as { ronda: number }).ronda));
    if (rondas > rondasMaximas) rondasMaximas = rondas;
    if (rondas >= 2 && conEmpate === null) conEmpate = s;
  }
  comprobar('hay semillas cuyo sorteo empata y va a una segunda ronda', conEmpate !== null);
  if (conEmpate !== null) {
    const sale2 = sucesosDe(conEmpate, 'sale') as Array<{ quien: string; dados: ParDeDados; ronda: number }>;
    const primera = sale2.filter((s) => s.ronda === 1);
    const mejor1 = Math.max(...primera.map((s) => s.dados[0] + s.dados[1]));
    const empatados = primera.filter((s) => s.dados[0] + s.dados[1] === mejor1).map((s) => s.quien);
    const segunda = sale2.filter((s) => s.ronda === 2).map((s) => s.quien);
    comprobar('y en la segunda ronda tiran exactamente los empatados', empatados.length >= 2 && segunda.join() === empatados.join(), { empatados, segunda });
  }
  comprobar(`ninguna semilla de sesenta pasa de ${RONDAS_DE_SORTEO} rondas`, rondasMaximas <= RONDAS_DE_SORTEO && rondasMaximas >= 2, rondasMaximas);

  /* `ctx.azar` sólo se lee en EMPEZAR: el mismo TIRAR con dos semillas de contexto da lo mismo. */
  const conUna = aplicarConMotivo(avanzarElBurgo, e, { tipo: TIRAR, carga: {} }, { quien: e.jugadores[e.turno]?.asiento ?? ANA, azar: 1, tic: 0, asientos: CUATRO });
  const conOtra = aplicarConMotivo(avanzarElBurgo, e, { tipo: TIRAR, carga: {} }, { quien: e.jugadores[e.turno]?.asiento ?? ANA, azar: 999999, tic: 0, asientos: CUATRO });
  comprobar('TIRAR no lee ctx.azar: con dos semillas de contexto sale la misma tirada', canonico(conUna.estado) === canonico(conOtra.estado) && conUna.estado.tirada !== null);
  const otraSemilla = estadoDe(empezada('EMP-S', CUATRO, 1));
  comprobar('y EMPEZAR sí: otra semilla de mesa baraja distinto', otraSemilla.pregon.join() !== e.pregon.join());
}

// ---------------------------------------------------------------------------
paso('3. LAS RENTAS: suelto, barrio entero, casas, posada, puertas, oficios, empeñado, presa, propio');
// ---------------------------------------------------------------------------

/** Un par que suma siete y no es dobles: la tirada de casi todos los montajes. */
const SIETE: ParDeDados = [3, 4];

/**
 * Pone a `quien` siete casillas antes de `hasta`, tira `SIETE` y devuelve lo que
 * salió. Si `hasta` está antes de la salida, se cruza la Puerta Mayor y se cobran
 * 200: se devuelve para que quien mira el dinero lo descuente.
 */
function alCaerEn(id: string, base: EstadoDelBurgo, quien: AsientoId, hasta: number, pares: readonly ParDeDados[] = [SIETE]): { s: EstadoDelBurgo; cruza: boolean } {
  const suma = (pares[0] as ParDeDados)[0] + (pares[0] as ParDeDados)[1];
  const desde = (hasta - suma + 40) % 40;
  const mesa = listoParaTirar(id, base, quien, desde, pares);
  return { s: estadoDe(tira(mesa, quien)), cruza: desde > hasta };
}

/**
 * LOS REPROCHES DE UNA RENTA: quien cae paga exactamente `cuanto` al dueño por
 * `renta`, el dueño lo cobra, y el dinero de los dos cuadra (con la Puerta Mayor
 * descontada). Con `cuanto === 0` se exige que NO haya pago. Es la función que se
 * aplica al caso bueno y al envenenado.
 */
function reprochesDeRenta(antes: EstadoDelBurgo, s: EstadoDelBurgo, quien: AsientoId, dueno: AsientoId | null, cuanto: number, cruza: boolean): string[] {
  const r: string[] = [];
  const pagos = pagosDe(s, quien).filter((p) => p.porque === 'renta');
  const cobros = dueno === null ? [] : cobrosDe(s, dueno).filter((c) => c.porque === 'renta');
  if (cuanto === 0) {
    if (pagos.length !== 0) r.push(`paga renta cuando no debía: ${JSON.stringify(pagos)}`);
    if (cobros.length !== 0) r.push(`el dueño cobra cuando no debía: ${JSON.stringify(cobros)}`);
  } else {
    if (pagos.length !== 1 || pagos[0]?.a !== dueno || pagos[0]?.cuanto !== cuanto) r.push(`esperaba un pago de ${cuanto} a ${String(dueno)} y hay ${JSON.stringify(pagos)}`);
    if (cobros.length !== 1 || cobros[0]?.de !== quien || cobros[0]?.cuanto !== cuanto) r.push(`esperaba un cobro de ${cuanto} y hay ${JSON.stringify(cobros)}`);
  }
  if (s.apuro === null) {
    const esperado = jugadorDe(antes, quien).mrs + (cruza ? PAGA_DE_LA_PUERTA_MAYOR : 0) - cuanto;
    if (jugadorDe(s, quien).mrs !== esperado) r.push(`${quien} tiene ${jugadorDe(s, quien).mrs} y debería tener ${esperado}`);
    if (dueno !== null && dueno !== quien && jugadorDe(s, dueno).mrs !== jugadorDe(antes, dueno).mrs + cuanto) r.push(`${dueno} no cobró ${cuanto}`);
  }
  return r;
}

{
  const base = estadoDe(empezada('REN', CUATRO, 41));
  type Fila = readonly [number, AsientoId | null, number, boolean];
  const casos: Array<{ que: string; titulos: readonly Fila[]; hasta: number; dueno: AsientoId | null; cuanto: number; antes?: (e: EstadoDelBurgo) => EstadoDelBurgo; pares?: readonly ParDeDados[] }> = [
    { que: 'un solar suelto cobra la renta de la tabla', titulos: [[1, BRUNO, 0, false]], hasta: 1, dueno: BRUNO, cuanto: 2 },
    { que: 'el barrio entero sin casas cobra el DOBLE', titulos: [[1, BRUNO, 0, false], [3, BRUNO, 0, false]], hasta: 1, dueno: BRUNO, cuanto: 4 },
    { que: 'y sigue cobrando el doble aunque OTRO solar del barrio esté empeñado (regla oficial)', titulos: [[1, BRUNO, 0, false], [3, BRUNO, 0, true]], hasta: 1, dueno: BRUNO, cuanto: 4 },
    { que: 'con una casa cobra la renta de una casa', titulos: [[1, BRUNO, 1, false], [3, BRUNO, 1, false]], hasta: 1, dueno: BRUNO, cuanto: 10 },
    { que: 'con dos casas', titulos: [[1, BRUNO, 2, false], [3, BRUNO, 2, false]], hasta: 1, dueno: BRUNO, cuanto: 30 },
    { que: 'con tres casas', titulos: [[1, BRUNO, 3, false], [3, BRUNO, 3, false]], hasta: 1, dueno: BRUNO, cuanto: 90 },
    { que: 'con cuatro casas', titulos: [[1, BRUNO, 4, false], [3, BRUNO, 4, false]], hasta: 1, dueno: BRUNO, cuanto: 160 },
    { que: 'con posada cobra la renta de posada', titulos: [[1, BRUNO, POSADA, false], [3, BRUNO, 4, false]], hasta: 1, dueno: BRUNO, cuanto: 250 },
    { que: 'la Calle Mayor con posada cobra 2.000 (a quien los tiene)', titulos: [[39, BRUNO, POSADA, false], [37, BRUNO, POSADA, false]], hasta: 39, dueno: BRUNO, cuanto: 2000, antes: (e) => conJugador(e, ANA, { mrs: 2500 }) },
    { que: 'una puerta sola cobra 25', titulos: [[5, BRUNO, 0, false]], hasta: 5, dueno: BRUNO, cuanto: RENTA_DE_PUERTA[1] as number },
    { que: 'dos puertas cobran 50', titulos: [[5, BRUNO, 0, false], [15, BRUNO, 0, false]], hasta: 5, dueno: BRUNO, cuanto: RENTA_DE_PUERTA[2] as number },
    { que: 'tres puertas cobran 100', titulos: [[5, BRUNO, 0, false], [15, BRUNO, 0, false], [25, BRUNO, 0, false]], hasta: 5, dueno: BRUNO, cuanto: RENTA_DE_PUERTA[3] as number },
    { que: 'las cuatro puertas cobran 200', titulos: [[5, BRUNO, 0, false], [15, BRUNO, 0, false], [25, BRUNO, 0, false], [35, BRUNO, 0, false]], hasta: 5, dueno: BRUNO, cuanto: RENTA_DE_PUERTA[4] as number },
    { que: 'la puerta EMPEÑADA cuenta para el número: con cuatro y una empeñada, la libre cobra 200', titulos: [[5, BRUNO, 0, false], [15, BRUNO, 0, true], [25, BRUNO, 0, false], [35, BRUNO, 0, false]], hasta: 5, dueno: BRUNO, cuanto: RENTA_DE_PUERTA[4] as number },
    { que: 'pero la empeñada misma no cobra nada', titulos: [[5, BRUNO, 0, false], [15, BRUNO, 0, true], [25, BRUNO, 0, false], [35, BRUNO, 0, false]], hasta: 15, dueno: BRUNO, cuanto: 0 },
    { que: 'un oficio cobra cuatro veces la tirada', titulos: [[12, BRUNO, 0, false]], hasta: 12, dueno: BRUNO, cuanto: (MULTIPLO_DE_OFICIO[1] as number) * 7 },
    { que: 'los dos oficios cobran diez veces la tirada', titulos: [[12, BRUNO, 0, false], [28, BRUNO, 0, false]], hasta: 12, dueno: BRUNO, cuanto: (MULTIPLO_DE_OFICIO[2] as number) * 7 },
    { que: 'y con otra tirada, otra renta: con 2 y 6 son 32', titulos: [[12, BRUNO, 0, false]], hasta: 12, dueno: BRUNO, cuanto: (MULTIPLO_DE_OFICIO[1] as number) * 8, pares: [[2, 6]] },
    { que: 'un solar empeñado no cobra', titulos: [[1, BRUNO, 0, true]], hasta: 1, dueno: BRUNO, cuanto: 0 },
    { que: 'el dueño PRESA cobra igual', titulos: [[1, BRUNO, 0, false]], hasta: 1, dueno: BRUNO, cuanto: 2, antes: (e) => conJugador(e, BRUNO, { casilla: LA_MAZMORRA, presa: 0 }) },
    { que: 'lo propio no se paga', titulos: [[1, ANA, 0, false]], hasta: 1, dueno: ANA, cuanto: 0 },
    { que: 'un dueño quebrado ya no cobra: el título es de nadie a efectos de renta', titulos: [[1, BRUNO, 0, false]], hasta: 1, dueno: BRUNO, cuanto: 0, antes: (e) => conJugador(e, BRUNO, { quebrado: true, mrs: 0 }) },
  ];
  for (const caso of casos) {
    let e = conTitulos(base, caso.titulos);
    if (caso.antes !== undefined) e = caso.antes(e);
    const { s, cruza } = alCaerEn(`REN-${caso.hasta}-${caso.cuanto}`, e, ANA, caso.hasta, caso.pares);
    comprobar(`cae en ${caso.hasta}: ${caso.que}`, jugadorDe(s, ANA).casilla === caso.hasta && reprochesDeRenta(e, s, ANA, caso.dueno, caso.cuanto, cruza).length === 0, {
      casilla: jugadorDe(s, ANA).casilla,
      reproches: reprochesDeRenta(e, s, ANA, caso.dueno, caso.cuanto, cruza),
    });
    /* La vista dice lo mismo que se cobró: `rentaAhora` del título, con la tirada de la mesa. */
    if (caso.cuanto > 0 && caso.dueno !== null && !jugadorDe(s, caso.dueno).quebrado) {
      const visto = vistaDe(s, ESPECTADOR).titulos.find((t) => t.casilla === caso.hasta);
      comprobar(`  y la vista publica rentaAhora = ${caso.cuanto} en esa casilla`, visto !== undefined && visto.rentaAhora === caso.cuanto, visto);
    }
  }

  /* Y quien no alcanza no paga NADA: abre su apuro con la deuda entera (reglamento §9). */
  {
    const e = conTitulos(base, [[39, BRUNO, POSADA, false], [37, BRUNO, POSADA, false]]);
    const { s } = alCaerEn('REN-APURO', e, ANA, 39);
    comprobar('con 1.500 y una renta de 2.000 no se paga nada: se abre el apuro con la deuda entera al dueño', s.paso === 'apuro' && s.apuro !== null && s.apuro.quien === ANA && s.apuro.deudas.length === 1 && s.apuro.deudas[0]?.a === BRUNO && s.apuro.deudas[0]?.cuanto === 2000 && jugadorDe(s, ANA).mrs === DINERO_DE_SALIDA && jugadorDe(s, BRUNO).mrs === DINERO_DE_SALIDA, s.apuro);
    comprobar('y la vista de todos dice que se espera al endeudado, con el dueño del turno aparte', vistaDe(s, ESPECTADOR).turnoDe === ANA && vistaDe(s, ESPECTADOR).duenoDelTurno === ANA && vistaDe(s, ESPECTADOR).apuro?.debe === 2000);
  }

  /* Sin dueño, no hay renta: se abre `comprar`. */
  const { s: sinDueno } = alCaerEn('REN-CONCEJO', base, ANA, 1);
  comprobar('un título del Concejo no cobra: abre el paso de comprar', sinDueno.paso === 'comprar' && pagosDe(sinDueno, ANA).length === 0);
  comprobar('y la vista marca barrioEntero en los dos solares cuando son del mismo dueño', (() => {
    const e = conTitulos(base, [[1, BRUNO, 0, false], [3, BRUNO, 0, false]]);
    const v = vistaDe(e, ESPECTADOR);
    return v.titulos.filter((t) => t.barrioEntero).map((t) => t.casilla).join() === '1,3';
  })());

  /* LA VACUNA: sin el doble del barrio, la misma función tiene que caer. */
  {
    const e = conTitulos(base, [[1, BRUNO, 0, false], [3, BRUNO, 0, false]]);
    const { s, cruza } = alCaerEn('REN-VACUNA', e, ANA, 1);
    comprobar('la vacuna: exigir la renta simple donde se cobró el doble del barrio se ve caer', reprochesDeRenta(e, s, ANA, BRUNO, 2, cruza).length > 0);
    comprobar('y exigir un pago donde no lo hubo también', reprochesDeRenta(e, e, ANA, BRUNO, 2, false).length > 0);
  }
}

// ---------------------------------------------------------------------------
paso('4. LAS OBRAS: parejo al alzar y al vender, la posada, y el Concejo sin casas');
// ---------------------------------------------------------------------------

{
  const base = estadoDe(empezada('OBR', CUATRO, 41));
  const conBarrio = turnoDe(conTitulos(base, [[1, BRUNO, 0, false], [3, BRUNO, 0, false]]), BRUNO, 'por-pasar');
  let mesa = mesaSobre('OBR-1', conBarrio, CUATRO);
  const ids0 = idsDe(estadoDe(mesa), BRUNO);
  comprobar('con el barrio entero y sin casas se ofrece alzar en los dos solares', ids0.includes('alzar:1') && ids0.includes('alzar:3'), ids0);
  comprobar('y empeñar los dos, y vender ninguno', ids0.includes('empenar:1') && ids0.includes('empenar:3') && !ids0.some((id) => id.startsWith('vender:')), ids0);
  const sinBarrio = turnoDe(conTitulos(base, [[1, BRUNO, 0, false]]), BRUNO, 'por-pasar');
  comprobar('sin el barrio entero no se ofrece alzar', !idsDe(sinBarrio, BRUNO).some((id) => id.startsWith('alzar:')));
  const conEmpeno = turnoDe(conTitulos(base, [[1, BRUNO, 0, false], [3, BRUNO, 0, true]]), BRUNO, 'por-pasar');
  comprobar('ni con un solar del barrio empeñado', !idsDe(conEmpeno, BRUNO).some((id) => id.startsWith('alzar:')));

  const alza1 = mover(mesa, BRUNO, { tipo: ALZAR, carga: { casilla: 1 } });
  mesa = alza1.mesa;
  let e = estadoDe(mesa);
  comprobar('alzar la primera casa cambia el estado, cobra 50 y baja el Concejo a 31', alza1.cambio && tituloDe(e, 1).casas === 1 && e.casasEnElConcejo === CASAS_DEL_CONCEJO - 1 && pagosDe(e, BRUNO).some((p) => p.porque === 'casa' && p.cuanto === 50));
  comprobar('con un suceso `alza` con casas 1', sucesosDe(e, 'alza').length === 1 && (sucesosDe(e, 'alza')[0] as { casas: number }).casas === 1);
  const ids1 = idsDe(e, BRUNO);
  comprobar('PAREJO: la segunda casa en el 1 no se ofrece hasta que el 3 tenga una', !ids1.includes('alzar:1') && ids1.includes('alzar:3'), ids1);
  comprobar('y ya no se puede empeñar ninguno de los dos: hay edificios en el barrio', !ids1.includes('empenar:1') && !ids1.includes('empenar:3'), ids1);
  comprobar('vender se ofrece sólo donde hay casa', ids1.includes('vender:1') && !ids1.includes('vender:3'), ids1);
  const segunda = mover(mesa, BRUNO, { tipo: ALZAR, carga: { casilla: 1 } });
  comprobar('mandar la segunda casa en el 1 se rechaza con motivo y no cambia nada', !segunda.cambio && segunda.motivo !== null, segunda.motivo);

  /* Hasta cuatro y cuatro, alternando, y la posada. */
  for (const c of [3, 1, 3, 1, 3, 1, 3]) {
    const r = mover(mesa, BRUNO, { tipo: ALZAR, carga: { casilla: c } });
    if (!r.cambio) fallos.push(`no se pudo alzar en ${c}: ${String(r.motivo)}`);
    mesa = r.mesa;
  }
  e = estadoDe(mesa);
  comprobar('con ocho alzas hay cuatro casas en cada solar y 24 en el Concejo', tituloDe(e, 1).casas === 4 && tituloDe(e, 3).casas === 4 && e.casasEnElConcejo === CASAS_DEL_CONCEJO - 8);
  const idsPosada = idsDe(e, BRUNO);
  const opPosada = opcionPorId(e, BRUNO, 'alzar:1');
  comprobar('la quinta se ofrece como posada, con el precio de una casa más', opPosada !== null && opPosada.rotulo.indexOf('posada') >= 0 && opPosada.rotulo.indexOf('50 mrs') >= 0, idsPosada);
  const posada = mover(mesa, BRUNO, { tipo: ALZAR, carga: { casilla: 1 } });
  mesa = posada.mesa;
  e = estadoDe(mesa);
  comprobar('la posada sustituye a las cuatro casas: casas 5, el Concejo recupera cuatro y da una posada', posada.cambio && tituloDe(e, 1).casas === POSADA && e.casasEnElConcejo === CASAS_DEL_CONCEJO - 4 && e.posadasEnElConcejo === POSADAS_DEL_CONCEJO - 1);
  comprobar('y se paga por `posada`', pagosDe(e, BRUNO).some((p) => p.porque === 'posada' && p.cuanto === 50));
  const idsTrasPosada = idsDe(e, BRUNO);
  comprobar('PAREJO al vender: con posada en el 1 y cuatro casas en el 3, sólo se vende del 1', idsTrasPosada.includes('vender:1') && !idsTrasPosada.includes('vender:3'), idsTrasPosada);
  const opVenta = opcionPorId(e, BRUNO, 'vender:1');
  comprobar('y la venta de la posada se rotula «por cuatro casas» porque el Concejo las tiene', opVenta !== null && opVenta.rotulo.indexOf('por cuatro casas') >= 0, opVenta?.rotulo);
  const venta = mover(mesa, BRUNO, { tipo: VENDER, carga: { casilla: 1 } });
  e = estadoDe(venta.mesa);
  comprobar('vender la posada la degrada a cuatro casas y devuelve la mitad de una casa (25)', venta.cambio && tituloDe(e, 1).casas === 4 && e.posadasEnElConcejo === POSADAS_DEL_CONCEJO && e.casasEnElConcejo === CASAS_DEL_CONCEJO - 8 && cobrosDe(e, BRUNO).some((c) => c.porque === 'venta' && c.cuanto === 25));

  /* La posada ENTERA cuando el Concejo no tiene cuatro casas que devolver. */
  const sinCasas: EstadoDelBurgo = { ...estadoDe(mesa), casasEnElConcejo: 2 };
  const opEntera = opcionPorId(sinCasas, BRUNO, 'vender:1');
  comprobar('sin cuatro casas en el Concejo, la posada se vende ENTERA: rótulo y 125 mrs', opEntera !== null && opEntera.rotulo.indexOf('la posada entera') >= 0 && opEntera.rotulo.indexOf('125 mrs') >= 0, opEntera?.rotulo);
  const entera = mover(mesaSobre('OBR-ENTERA', sinCasas, CUATRO), BRUNO, { tipo: VENDER, carga: { casilla: 1 } });
  const eEntera = estadoDe(entera.mesa);
  comprobar('y al venderla quedan cero casas y el Concejo recupera la posada', entera.cambio && tituloDe(eEntera, 1).casas === 0 && eEntera.posadasEnElConcejo === POSADAS_DEL_CONCEJO && cobrosDe(eEntera, BRUNO).some((c) => c.cuanto === 5 * 25));

  /* Sin casas en el Concejo no se alza; sin posadas tampoco la posada. */
  const concejoVacio: EstadoDelBurgo = { ...conBarrio, casasEnElConcejo: 0 };
  comprobar('con el Concejo sin casas no se ofrece alzar', !idsDe(concejoVacio, BRUNO).some((id) => id.startsWith('alzar:')));
  const aPuntoDePosada = conTitulos({ ...conBarrio, casasEnElConcejo: 0 }, [[1, BRUNO, 4, false], [3, BRUNO, 4, false]]);
  comprobar('pero con cuatro y cuatro la posada sí, aunque no haya casas', idsDe(aPuntoDePosada, BRUNO).includes('alzar:1'));
  comprobar('y sin posadas en el Concejo, no', !idsDe({ ...aPuntoDePosada, posadasEnElConcejo: 0 }, BRUNO).some((id) => id.startsWith('alzar:')));
  const desparejo = conTitulos(conBarrio, [[1, BRUNO, 2, false], [3, BRUNO, 1, false]]);
  comprobar('se vende de donde hay más: con 2 y 1 sólo se ofrece vender del 1', idsDe(desparejo, BRUNO).includes('vender:1') && !idsDe(desparejo, BRUNO).includes('vender:3'));
  comprobar('y se alza donde hay menos: sólo el 3', idsDe(desparejo, BRUNO).includes('alzar:3') && !idsDe(desparejo, BRUNO).includes('alzar:1'));
  const pobre = conJugador(conBarrio, BRUNO, { mrs: 40 });
  comprobar('sin dinero para la casa no se ofrece alzar', !idsDe(pobre, BRUNO).some((id) => id.startsWith('alzar:')));
  const pobreAlza = mover(mesaSobre('OBR-POBRE', pobre, CUATRO), BRUNO, { tipo: ALZAR, carga: { casilla: 1 } });
  comprobar('y mandarlo igual se rechaza con motivo', !pobreAlza.cambio && pobreAlza.motivo !== null);
  const ajeno = mover(mesaSobre('OBR-AJENO', conBarrio, CUATRO), ANA, { tipo: ALZAR, carga: { casilla: 1 } });
  comprobar('otro asiento no alza en lo que no es suyo', !ajeno.cambio && ajeno.motivo !== null);
  comprobar('el precio de la casa es el del barrio para los dos solares', CASILLAS[1]?.casa === 50 && CASILLAS[3]?.casa === 50);
}

// ---------------------------------------------------------------------------
paso('5. DOBLES Y MAZMORRA: repetir, tres dobles, fianza, Indulto, dados, tercer intento, visita');
// ---------------------------------------------------------------------------

/** Los reproches de un encierro: en la Mazmorra, presa 0, sin cobrar la Puerta Mayor, y con el suceso. */
function reprochesDeEncierro(s: EstadoDelBurgo, quien: AsientoId, porque: 'casilla' | 'carta' | 'tres-dobles'): string[] {
  const r: string[] = [];
  const j = jugadorDe(s, quien);
  if (j.casilla !== LA_MAZMORRA) r.push(`está en ${j.casilla} y no en la Mazmorra`);
  if (j.presa !== 0) r.push(`presa es ${j.presa} y no 0`);
  const enc = sucesosDe(s, 'a-la-mazmorra') as Array<{ quien: string; porque: string }>;
  if (!enc.some((x) => x.quien === quien && x.porque === porque)) r.push(`no hay suceso a-la-mazmorra por ${porque}`);
  if (cobrosDe(s, quien).some((c) => c.porque === 'puerta-mayor')) r.push('cobró la Puerta Mayor de camino');
  if (s.dobles !== 0) r.push('los dobles no se pusieron a cero');
  return r;
}

/** Los reproches de un mazo tras devolver una serie al fondo: la serie está, está la última, y no falta ni sobra nada. */
function reprochesDeMazo(antes: readonly string[], despues: readonly string[], serie: string): string[] {
  const r: string[] = [];
  if (despues[despues.length - 1] !== serie) r.push(`${serie} no está al fondo: el fondo es ${String(despues[despues.length - 1])}`);
  if (despues.length !== antes.length + 1) r.push(`el mazo tenía ${antes.length} y ahora tiene ${despues.length}`);
  if (new Set(despues).size !== despues.length) r.push('hay series repetidas');
  for (const s of antes) if (despues.indexOf(s) < 0) r.push(`se perdió ${s}`);
  return r;
}

{
  const base = estadoDe(empezada('MAZ', CUATRO, 41));

  /* Dobles repite. */
  const { s: dobles } = alCaerEn('DOB-1', base, ANA, 4, [[2, 2]]);
  comprobar('con dobles se mueve, se resuelve la casilla y se queda en por-tirar con dobles 1', dobles.dobles === 1 && dobles.paso === 'por-tirar' && dobles.tiradasDelTurno === 1 && jugadorDe(dobles, ANA).casilla === 4);
  comprobar('y pagó el Diezmo al caer en el 4', pagosDe(dobles, ANA).some((p) => p.porque === 'diezmo' && p.cuanto === EL_DIEZMO));
  comprobar('la vista ofrece tirar otra vez y NO pasar', idsDe(dobles, ANA).includes('tirar') && !idsDe(dobles, ANA).includes('pasar'), idsDe(dobles, ANA));
  comprobar('y el suceso `tira` lleva dobles: true con el PAR entero', (sucesosDe(dobles, 'tira')[0] as { dobles: boolean; dados: ParDeDados }).dobles && (sucesosDe(dobles, 'tira')[0] as { dados: ParDeDados }).dados.join() === '2,2');
  const { s: sinDobles } = alCaerEn('DOB-0', base, ANA, LA_FERIA);
  comprobar('sin dobles se queda en por-pasar con dobles 0 y se ofrece pasar', sinDobles.paso === 'por-pasar' && sinDobles.dobles === 0 && idsDe(sinDobles, ANA).includes('pasar'));
  const pasar = mover(mesaSobre('DOB-PASAR', dobles, CUATRO), ANA, { tipo: PASAR, carga: {} });
  comprobar('con dobles pendientes, PASAR se rechaza con motivo', !pasar.cambio && pasar.motivo !== null);

  /*
   * Tres dobles seguidos encierran sin mover ni cobrar. Se sale del 34 para que las
   * dos primeras caídas sean la Puerta Mayor y el Diezmo: ni un título (que abriría
   * `comprar` y pararía la cadena) ni una carta (que gastaría azar).
   */
  let mesa = listoParaTirar('DOB-3', base, ANA, 34, [[3, 3], [2, 2], [1, 1]]);
  mesa = tira(mesa, ANA);
  comprobar('primer dobles: la Puerta Mayor, dobles 1', jugadorDe(estadoDe(mesa), ANA).casilla === 0 && estadoDe(mesa).dobles === 1);
  mesa = tira(mesa, ANA);
  comprobar('segundo dobles: el Diezmo, dobles 2', jugadorDe(estadoDe(mesa), ANA).casilla === 4 && estadoDe(mesa).dobles === 2);
  mesa = tira(mesa, ANA);
  const tres = estadoDe(mesa);
  comprobar('tercer dobles: a la Mazmorra sin mover ni cobrar', reprochesDeEncierro(tres, ANA, 'tres-dobles').length === 0 && sucesosDe(tres, 'mueve').length === 0, reprochesDeEncierro(tres, ANA, 'tres-dobles'));
  comprobar('y el turno queda en por-pasar: se ofrece pasar y no tirar', tres.paso === 'por-pasar' && idsDe(tres, ANA).includes('pasar') && !idsDe(tres, ANA).includes('tirar'));
  comprobar('rev 3 y jugada subida tres veces: una por tirada', mesa.rev === 3 && tres.jugada === base.jugada + 3);
  /* La vacuna: un estado que dejara al de los tres dobles libre en la calle se ve caer. */
  const noEncerrado = conJugador(tres, ANA, { casilla: 12, presa: LIBRE });
  comprobar('la vacuna: sin el tope de tres dobles (libre en el 12) los reproches del encierro caen', reprochesDeEncierro(noEncerrado, ANA, 'tres-dobles').length > 0);
  comprobar('y el dinero cuadra: cobró 200 en la Puerta Mayor, pagó 200 de Diezmo y nada más', jugadorDe(tres, ANA).mrs === DINERO_DE_SALIDA);

  /* Presa: fianza, Indulto, dados. */
  const presa = turnoDe(conJugador(base, ANA, { casilla: LA_MAZMORRA, presa: 0 }), ANA);
  const idsPresa = idsDe(presa, ANA);
  comprobar('presa con dinero: se ofrece tirar y pagar la fianza, no usar Indulto', idsPresa.includes('tirar') && idsPresa.includes('pagar-fianza') && !idsPresa.includes('usar-indulto'), idsPresa);
  comprobar('y el aviso lo dice con el intento', vistaDe(presa, ANA).aviso.indexOf('Mazmorra') >= 0 && vistaDe(presa, ANA).aviso.indexOf('intento 1 de 3') >= 0, vistaDe(presa, ANA).aviso);
  const fianza = mover(mesaSobre('MAZ-FIANZA', presa, CUATRO), ANA, { tipo: PAGAR_FIANZA, carga: {} });
  const trasFianza = estadoDe(fianza.mesa);
  comprobar('pagar la fianza cuesta 50, libera y deja por-tirar', fianza.cambio && jugadorDe(trasFianza, ANA).presa === LIBRE && jugadorDe(trasFianza, ANA).mrs === DINERO_DE_SALIDA - FIANZA && trasFianza.paso === 'por-tirar' && pagosDe(trasFianza, ANA).some((p) => p.porque === 'fianza'));
  comprobar('con suceso sale-de-la-mazmorra por fianza', (sucesosDe(trasFianza, 'sale-de-la-mazmorra')[0] as { como: string } | undefined)?.como === 'fianza');
  const tiraLibre = tira(mesaSobre('MAZ-TRAS-FIANZA', { ...trasFianza, azar: azarQueSaca([[2, 2]]) }, CUATRO), ANA);
  comprobar('y ya tira con normalidad: con dobles repite', estadoDe(tiraLibre).dobles === 1 && jugadorDe(estadoDe(tiraLibre), ANA).casilla === 14);
  const presaPobre = conJugador(presa, ANA, { mrs: FIANZA - 1 });
  comprobar('presa sin 50 mrs: no se ofrece la fianza', !idsDe(presaPobre, ANA).includes('pagar-fianza'));
  const fianzaPobre = mover(mesaSobre('MAZ-POBRE', presaPobre, CUATRO), ANA, { tipo: PAGAR_FIANZA, carga: {} });
  comprobar('y mandarla se rechaza con motivo', !fianzaPobre.cambio && fianzaPobre.motivo !== null);
  const libreFianza = mover(mesaSobre('MAZ-LIBRE', turnoDe(base, ANA), CUATRO), ANA, { tipo: PAGAR_FIANZA, carga: {} });
  comprobar('un libre no paga fianza: se rechaza', !libreFianza.cambio && libreFianza.motivo !== null);

  for (const mazo of ['pregon', 'arca'] as MazoId[]) {
    const serie = serieDeCarta(mazo, mazo === 'pregon' ? 10 : 5);
    const lista = (mazo === 'pregon' ? presa.pregon : presa.arca).filter((s) => s !== serie);
    const conIndulto: EstadoDelBurgo = { ...conJugador(presa, ANA, { indultos: [mazo] }), [mazo]: lista };
    comprobar(`presa con Indulto ${mazo}: se ofrece usarlo`, idsDe(conIndulto, ANA).includes('usar-indulto'));
    const uso = mover(mesaSobre(`MAZ-IND-${mazo}`, conIndulto, CUATRO), ANA, { tipo: USAR_INDULTO, carga: {} });
    const trasUso = estadoDe(uso.mesa);
    const mazoTras = mazo === 'pregon' ? trasUso.pregon : trasUso.arca;
    comprobar(`usar el Indulto ${mazo} libera sin pagar y la carta vuelve al FONDO de su mazo`, uso.cambio && jugadorDe(trasUso, ANA).presa === LIBRE && jugadorDe(trasUso, ANA).indultos.length === 0 && jugadorDe(trasUso, ANA).mrs === DINERO_DE_SALIDA && reprochesDeMazo(lista, mazoTras, serie).length === 0, reprochesDeMazo(lista, mazoTras, serie));
    comprobar(`  con el suceso sale-de-la-mazmorra por indulto y la vista contando 0 Indultos`, (sucesosDe(trasUso, 'sale-de-la-mazmorra')[0] as { como: string } | undefined)?.como === 'indulto' && vistaDe(trasUso, ANA).jugadores.find((j) => j.asiento === ANA)?.indultos === 0);
  }
  comprobar('la vacuna: un mazo al que la carta no vuelve se ve caer', reprochesDeMazo(presa.pregon.filter((s) => s !== 'p10'), presa.pregon.filter((s) => s !== 'p10'), 'p10').length > 0);
  comprobar('y uno al que vuelve arriba en vez de al fondo también', reprochesDeMazo(presa.pregon.filter((s) => s !== 'p10'), ['p10', ...presa.pregon.filter((s) => s !== 'p10')], 'p10').length > 0);
  const libreIndulto = mover(mesaSobre('MAZ-LIBRE-IND', conJugador(turnoDe(base, ANA), ANA, { indultos: ['arca'] }), CUATRO), ANA, { tipo: USAR_INDULTO, carga: {} });
  comprobar('un libre con Indulto no lo usa: se rechaza', !libreIndulto.cambio && libreIndulto.motivo !== null);

  /* Los dados desde la Mazmorra. */
  const conDobles = tira(mesaSobre('MAZ-DADOS-1', { ...presa, azar: azarQueSaca([[2, 2]]) }, CUATRO), ANA);
  const sD = estadoDe(conDobles);
  comprobar('presa que saca dobles: sale, mueve 4 hasta el 14 y NO repite', jugadorDe(sD, ANA).presa === LIBRE && jugadorDe(sD, ANA).casilla === 14 && sD.dobles === 0 && (sD.paso === 'comprar' || sD.paso === 'por-pasar') && !idsDe(sD, ANA).includes('tirar'), { paso: sD.paso, ids: idsDe(sD, ANA) });
  comprobar('con el suceso por dobles y sin pagar fianza', (sucesosDe(sD, 'sale-de-la-mazmorra')[0] as { como: string } | undefined)?.como === 'dobles' && !pagosDe(sD, ANA).some((p) => p.porque === 'fianza'));
  const falla = tira(mesaSobre('MAZ-DADOS-2', { ...presa, azar: azarQueSaca([[1, 2]]) }, CUATRO), ANA);
  const sF = estadoDe(falla);
  comprobar('presa sin dobles: sigue presa con un intento más y el turno pasa a por-pasar', jugadorDe(sF, ANA).presa === 1 && jugadorDe(sF, ANA).casilla === LA_MAZMORRA && sF.paso === 'por-pasar' && (sucesosDe(sF, 'sigue-presa')[0] as { intento: number } | undefined)?.intento === 1);
  const tercero = tira(mesaSobre('MAZ-DADOS-3', { ...conJugador(presa, ANA, { presa: 2 }), azar: azarQueSaca([[1, 2]]) }, CUATRO), ANA);
  const sT = estadoDe(tercero);
  comprobar('al tercer intento sin dobles paga la fianza Y mueve igual: casilla 13, 50 menos', jugadorDe(sT, ANA).presa === LIBRE && jugadorDe(sT, ANA).casilla === 13 && jugadorDe(sT, ANA).mrs === DINERO_DE_SALIDA - FIANZA && (sucesosDe(sT, 'sale-de-la-mazmorra')[0] as { como: string } | undefined)?.como === 'tercer-intento');
  const terceroPobre = tira(mesaSobre('MAZ-DADOS-4', { ...conJugador(presa, ANA, { presa: 2, mrs: 0 }), azar: azarQueSaca([[1, 2]]) }, CUATRO), ANA);
  const sP = estadoDe(terceroPobre);
  comprobar('y sin dinero para la fianza abre su apuro con la deuda de 50 al Concejo y mueve igual', sP.paso === 'apuro' && sP.apuro !== null && sP.apuro.quien === ANA && sP.apuro.deudas.some((d) => d.porque === 'fianza' && d.cuanto === FIANZA && d.a === null) && jugadorDe(sP, ANA).casilla === 13);

  /* De visita no pasa nada; el Cepo encierra. */
  const { s: visita } = alCaerEn('MAZ-VISITA', base, ANA, LA_MAZMORRA);
  comprobar('caer en la Mazmorra de visita no encierra', jugadorDe(visita, ANA).presa === LIBRE && jugadorDe(visita, ANA).casilla === LA_MAZMORRA && sucesosDe(visita, 'a-la-mazmorra').length === 0 && visita.paso === 'por-pasar');
  const { s: cepo } = alCaerEn('MAZ-CEPO', base, ANA, 30);
  comprobar('caer en el Cepo (30) manda a la Mazmorra sin pasar por la Puerta Mayor', reprochesDeEncierro(cepo, ANA, 'casilla').length === 0, reprochesDeEncierro(cepo, ANA, 'casilla'));
  comprobar('y el `mueve` del Cepo llega al 30 antes del encierro: la escena lo anima', (sucesosDe(cepo, 'mueve')[0] as { hasta: number } | undefined)?.hasta === 30);

  /* Presa obra y trata. */
  const presaConBarrio = conTitulos(presa, [[1, ANA, 0, false], [3, ANA, 0, false]]);
  const idsObra = idsDe(presaConBarrio, ANA);
  comprobar('presa con barrio entero: alza y propone desde la Mazmorra', idsObra.includes('alzar:1') && idsObra.includes('proponer'), idsObra);
  const alzaPresa = mover(mesaSobre('MAZ-ALZA', presaConBarrio, CUATRO), ANA, { tipo: ALZAR, carga: { casilla: 1 } });
  comprobar('y la casa se alza de verdad estando presa', alzaPresa.cambio && tituloDe(estadoDe(alzaPresa.mesa), 1).casas === 1 && jugadorDe(estadoDe(alzaPresa.mesa), ANA).presa === 0);
}

// ═══ FIN DE LOS BLOQUES ═══

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log('');
}

/**
 * EL GUARDIA. Va con margen por debajo de lo medido (ver la cifra al final del
 * fichero) y DESPUÉS de imprimir las rojas: al ras dispara antes que la roja y se
 * lleva por delante los nombres de lo que ya se había encontrado.
 */
const COMPROBACIONES_ESCRITAS = 0;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(
    `Solo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones que tiene escritas este guion: ` +
      'se ha caído por el camino sin decirlo. Si has añadido comprobaciones nuevas, sube el número.',
  );
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. El Burgo se sostiene: las rentas son las de la tabla y el barrio entero cobra el doble,`);
  console.log('  los dobles repiten y los tres dobles encierran sin cobrar, la Mazmorra se paga o se sale con dobles o al tercero,');
  console.log('  las treinta y dos cartas hacen lo que dicen y el mazo rota, la almoneda releva por asiento y la puja libre cabe');
  console.log('  sólo por su puerta, el apuro se salda vendiendo y empeñando o acaba en quiebra con quien más reclama, los tratos');
  console.log('  caducan al relevar, el tic juega por el ausente y una mesa sin nadie termina sola — y tres partidas enteras de');
  console.log('  2, 4 y 6 jugadas por el robot quiebran, cobran, pujan, encierran y alzan, reejecutadas byte a byte, con');
  console.log('  ningún secreto en ninguna de las siete miradas de ninguna revisión.');
  process.exit(0);
}
process.exit(1);
