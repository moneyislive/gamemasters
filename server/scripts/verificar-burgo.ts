/**
 * ¿SE SOSTIENE EL BURGO? — RENTAS, DADOS, COMISARÍA, CARTAS, SUBASTA, APURO, TRATOS Y EL TIC
 *
 *   npm run verify:burgo
 *
 * ═══ QUÉ AFIRMA ESTE FICHERO, Y POR QUÉ ESTAS COSAS Y NO OTRAS ═══
 *
 * El Burgo es el sexto arcade y la memoria de esta casa tiene apuntado, tres veces,
 * lo que le pasa a un juego nuevo con la batería en verde: nada lo juega. `verify:mesa`
 * y `verify:larga` lo cubren en lo genérico; `oro:arcade` y `verify:determinismo` lo
 * congelan y lo comparan entre motores DESDE HOY; pero ninguno de ellos afirma que
 * un hotel cobre lo que dice la tabla, que el tercer intento en la Comisaría pague y
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
 *   3. LAS RENTAS: suelto, barrio entero (doble), casas, hotel, puertas ×1..4 con la
 *      hipotecada contando, oficio ×4/×10, hipotecado no cobra, presa cobra, propio no paga.
 *   4. DOBLES Y COMISARÍA: dobles repite, tres dobles encierran sin mover ni cobrar,
 *      fianza, Salvoconducto (que vuelve al FONDO de su mazo), dados, tercer intento paga y
 *      mueve (o abre apuro y mueve igual), de visita no pasa nada.
 *   5. LAS 32 CARTAS, aplicadas UNA A UNA desde estados montados, y el mazo que rota.
 *   6. EL EMPEÑO, con el interés por tabla y el trato que lo cobra.
 *   7. LA SUBASTA: relevo por asiento, mínimo y múltiplos, las tres fijas, la puja
 *      libre por la puerta con campos EXACTOS, ganador que paga, nadie puja, el que
 *      declinó no vuelve.
 *   8. EL APURO Y LA QUIEBRA: no se pasa en apuro, vender y hipotecar saldan solos,
 *      varios acreedores, quiebra con jugador (todo a él, interés en el acto) y con el
 *      Ayuntamiento (subastas en cola, Salvoconductos al fondo), rendirse en y fuera de apuro.
 *   9. LOS TRATOS: por puerta, del turno y AL del turno, campos exactos, tope 3,
 *      aceptar revalida, retirar, rechazar, caducan al relevar, y el que cae por otro.
 *  10. LAS OBRAS: parejo al alzar y al vender, el hotel devuelve cuatro casas, sin
 *      casas en el Ayuntamiento no se alza.
 *  11. EL TIC, caso a caso, y una mesa de seis con NADIE moviendo que acaba sola.
 *  12. «SÓLO SI»: cada tipo mandado fuera de su momento devuelve EL MISMO objeto con
 *      motivo, y ningún motivo lleva un secreto (vacuna con `'p07'`).
 *  13. PARTIDAS ENTERAS DE 2, 3 Y 6 jugadas por el robot, contadas desde los `sucesos`
 *      de la vista: quiebras, rentas, subastas ganadas, Comisaría, barrios alzados,
 *      tratos aceptados y un ganador; reejecutadas del diario; con secretos, forma y
 *      canónico mirados EN CADA REVISIÓN de siete miradas; y con la vacuna del robot
 *      que sólo pasa, que se ve caer.
 *  14. TAMAÑOS Y PRESUPUESTO: el peor estado, la peor vista, las peores opciones, la
 *      carga más gorda, la cascada de 28 subastas, y las cifras impresas.
 *  15. LAS CUATRO REGLAS OFICIALES que estaban fuera de alcance en `DISENO-3.md` §12 y
 *      volvieron a entrar: obrar en el turno de cualquiera (y los tres momentos en que
 *      no), tratar entre dos que no tienen el turno, la subasta del último edificio
 *      (casa y hotel, con el suelo del precio de lista y el solar de cada pujador) y la
 *      elección del 10 % en el Impuesto (con el tic eligiendo lo barato). Cada una con
 *      su vacuna, y el veneno de cada vacuna es EL COMPORTAMIENTO VIEJO. Y con ellas el
 *      TOPE DE VUELTAS, que no cambia y que aquí se ve andar entero por primera vez: el
 *      relevo que lo alcanza, el patrimonio que gana, el empate que se comparte y el
 *      quebrado que no gana por rico.
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
 *   · «Seis sentados, nadie mueve, ≤ 2.500 tics» del diseño es de OTRA mesa. Medido
 *     aquí: seis con tope 30 cuestan 7.846 tics; cuatro con tope 10, 1.615; dos con
 *     tope 6, 357. Sin nadie que compre, cada título pisado sale a subasta y los
 *     seis pasan uno a uno. Se afirman las tres con su tope propio (lo medido más un
 *     tercio) y se IMPRIMEN; lo que de verdad se exige es que TERMINEN.
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
import { cruzaLaSalida, distanciaAdelante, masCercana } from '../../shared/mecanicas/anillo';
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
  maravedies,
  opcionesDelBurgo,
  PAGAR_FIANZA,
  PAGAR_IMPUESTO,
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
  TOPE_DE_MRS_EN_UN_TRATO,
  TOPE_DE_SUCESOS,
  TRATOS_ABIERTOS_POR_PROPONENTE,
  USAR_INDULTO,
  VENDER,
} from '../../shared/arcade/juegos/burgo';
import type {
  AlmonedaDelBurgo,
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
  decimaDelPatrimonio,
  CUANTAS_CASILLAS,
  OFICIOS,
  PUERTAS,
  DINERO_DE_SALIDA,
  DOBLES_QUE_ENCIERRAN,
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
/**
 * LAS TRES MESAS SIN NADIE: `[cuántos sentados, tope de vueltas, tope de tics]`.
 *
 * Los topes salen de medir y de subir un tercio (ver el bloque 11). No son «2.500»,
 * que es lo que decía el diseño para una mesa distinta de la que aquí se juega.
 */
/** Tope de tics de la cascada de quiebra al Ayuntamiento: 28 subastas con los demás pasando. */
const TOPE_DE_CASCADA = 400;

const MESAS_SIN_NADIE: ReadonlyArray<readonly [number, number, number]> = [
  [2, 6, 500],
  [4, 10, 2200],
  [6, 30, 10500],
];

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

/**
 * UN TIC POR LA PUERTA DEL ÁRBITRO, que es la única que hay: `avanzarElReloj` sube el
 * reloj de la mesa y mete `arcade:tic` con `quien: null`, SIN pasar por el portillo.
 * Un tic que el juego ignora devuelve la MISMA mesa por identidad, y en eso se apoya
 * el bloque del tic para afirmar que en `reuniendo` y en `terminada` no pasa nada.
 */
function tic(mesa: Mesa): Mesa {
  return avanzarElReloj(mesa);
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

/** Varios títulos de golpe: `[casilla, dueño, casas, hipotecado]`. */
function conTitulos(e: EstadoDelBurgo, filas: ReadonlyArray<readonly [number, AsientoId | null, number, boolean]>): EstadoDelBurgo {
  let s = e;
  for (const [casilla, dueno, casas, empenado] of filas) s = conTitulo(s, casilla, { dueno, casas, empenado });
  return s;
}

/** El turno para `asiento`, en el paso que se diga, sin apuro ni subasta. */
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

/**
 * «a el» y «de el» sin contraer, que en castellano son «al» y «del». Con «El» en mayúscula
 * —el nombre propio de un jugador, «a El Pícaro»— no se contrae, y por eso sólo se mira la
 * minúscula. La crónica escribía «paga 120 € por la subasta a el Ayuntamiento» y ninguna de
 * las 590 comprobaciones lo veía: se vio jugando una mesa de verdad el 16-sep-2026.
 */
function contraccionesSinHacer(texto: string): string[] {
  const conBorde = ` ${texto}`;
  const salida: string[] = [];
  for (const mal of [' a el ', ' de el ']) if (conBorde.indexOf(mal) >= 0) salida.push(mal.trim());
  return salida;
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
  'almoneda,apuro,aviso,concejo,desde,dobles,duenoDelTurno,ganadores,impuestoSinPagar,jugada,jugadores,luego,momento,paso,pregon,quedan,sorteoDeSalida,sucesos,tablero,tirada,tiradasDelTurno,titulos,topeDeVueltas,tratos,turnoDe,turnosAbiertos,ultimaCarta,yo';

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
    for (const mal of contraccionesSinHacer(texto)) reproches.push(`«${texto.slice(0, 60)}» escribe «${mal}» sin contraer`);
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
    'todos en la Salida, libres, con 1.500 €, sin Salvoconductos y sin vueltas',
    e.jugadores.every((j) => j.casilla === 0 && j.presa === LIBRE && j.mrs === DINERO_DE_SALIDA && j.indultos.length === 0 && !j.quebrado && j.vueltas === 0),
  );
  comprobar('28 títulos del Ayuntamiento, sin casas ni hipotecas, en orden de casilla', e.titulos.length === 28 && e.titulos.every((t, i) => t.casilla === TITULOS[i] && t.dueno === null && t.casas === 0 && !t.empenado));
  comprobar('el Ayuntamiento guarda 32 casas y 12 hoteles', e.casasEnElConcejo === CASAS_DEL_CONCEJO && e.posadasEnElConcejo === POSADAS_DEL_CONCEJO);
  comprobar('Suerte son las 16 series barajadas, sin repetir', e.pregon.length === 16 && new Set(e.pregon).size === 16 && [...e.pregon].sort().join() === seriesDe('pregon').join());
  comprobar('y la Caja de Comunidad igual, con sus 16', e.arca.length === 16 && new Set(e.arca).size === 16 && [...e.arca].sort().join() === seriesDe('arca').join());
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
paso('3. LAS RENTAS: suelto, barrio entero, casas, hotel, puertas, oficios, hipotecado, presa, propio');
// ---------------------------------------------------------------------------

/** Un par que suma siete y no es dobles: la tirada de casi todos los montajes. */
const SIETE: ParDeDados = [3, 4];

/**
 * Pone a `quien` siete casillas antes de `hasta`, tira `SIETE` y devuelve lo que
 * salió. Si `hasta` está antes de la salida, se cruza la Salida y se cobran
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
 * `renta`, el dueño lo cobra, y el dinero de los dos cuadra (con la Salida
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
    { que: 'y sigue cobrando el doble aunque OTRO solar del barrio esté hipotecado (regla oficial)', titulos: [[1, BRUNO, 0, false], [3, BRUNO, 0, true]], hasta: 1, dueno: BRUNO, cuanto: 4 },
    { que: 'con una casa cobra la renta de una casa', titulos: [[1, BRUNO, 1, false], [3, BRUNO, 1, false]], hasta: 1, dueno: BRUNO, cuanto: 10 },
    { que: 'con dos casas', titulos: [[1, BRUNO, 2, false], [3, BRUNO, 2, false]], hasta: 1, dueno: BRUNO, cuanto: 30 },
    { que: 'con tres casas', titulos: [[1, BRUNO, 3, false], [3, BRUNO, 3, false]], hasta: 1, dueno: BRUNO, cuanto: 90 },
    { que: 'con cuatro casas', titulos: [[1, BRUNO, 4, false], [3, BRUNO, 4, false]], hasta: 1, dueno: BRUNO, cuanto: 160 },
    { que: 'con hotel cobra la renta de hotel', titulos: [[1, BRUNO, POSADA, false], [3, BRUNO, 4, false]], hasta: 1, dueno: BRUNO, cuanto: 250 },
    { que: 'la Calle Mayor con hotel cobra 2.000 (a quien los tiene)', titulos: [[39, BRUNO, POSADA, false], [37, BRUNO, POSADA, false]], hasta: 39, dueno: BRUNO, cuanto: 2000, antes: (e) => conJugador(e, ANA, { mrs: 2500 }) },
    { que: 'una puerta sola cobra 25', titulos: [[5, BRUNO, 0, false]], hasta: 5, dueno: BRUNO, cuanto: RENTA_DE_PUERTA[1] as number },
    { que: 'dos puertas cobran 50', titulos: [[5, BRUNO, 0, false], [15, BRUNO, 0, false]], hasta: 5, dueno: BRUNO, cuanto: RENTA_DE_PUERTA[2] as number },
    { que: 'tres puertas cobran 100', titulos: [[5, BRUNO, 0, false], [15, BRUNO, 0, false], [25, BRUNO, 0, false]], hasta: 5, dueno: BRUNO, cuanto: RENTA_DE_PUERTA[3] as number },
    { que: 'las cuatro puertas cobran 200', titulos: [[5, BRUNO, 0, false], [15, BRUNO, 0, false], [25, BRUNO, 0, false], [35, BRUNO, 0, false]], hasta: 5, dueno: BRUNO, cuanto: RENTA_DE_PUERTA[4] as number },
    { que: 'la puerta HIPOTECADA cuenta para el número: con cuatro y una hipotecada, la libre cobra 200', titulos: [[5, BRUNO, 0, false], [15, BRUNO, 0, true], [25, BRUNO, 0, false], [35, BRUNO, 0, false]], hasta: 5, dueno: BRUNO, cuanto: RENTA_DE_PUERTA[4] as number },
    { que: 'pero la hipotecada misma no cobra nada', titulos: [[5, BRUNO, 0, false], [15, BRUNO, 0, true], [25, BRUNO, 0, false], [35, BRUNO, 0, false]], hasta: 15, dueno: BRUNO, cuanto: 0 },
    { que: 'un oficio cobra cuatro veces la tirada', titulos: [[12, BRUNO, 0, false]], hasta: 12, dueno: BRUNO, cuanto: (MULTIPLO_DE_OFICIO[1] as number) * 7 },
    { que: 'los dos oficios cobran diez veces la tirada', titulos: [[12, BRUNO, 0, false], [28, BRUNO, 0, false]], hasta: 12, dueno: BRUNO, cuanto: (MULTIPLO_DE_OFICIO[2] as number) * 7 },
    { que: 'y con otra tirada, otra renta: con 2 y 6 son 32', titulos: [[12, BRUNO, 0, false]], hasta: 12, dueno: BRUNO, cuanto: (MULTIPLO_DE_OFICIO[1] as number) * 8, pares: [[2, 6]] },
    { que: 'un solar hipotecado no cobra', titulos: [[1, BRUNO, 0, true]], hasta: 1, dueno: BRUNO, cuanto: 0 },
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
  comprobar('un título del Ayuntamiento no cobra: abre el paso de comprar', sinDueno.paso === 'comprar' && pagosDe(sinDueno, ANA).length === 0);
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
paso('4. LAS OBRAS: parejo al alzar y al vender, el hotel, y el Ayuntamiento sin casas');
// ---------------------------------------------------------------------------

{
  const base = estadoDe(empezada('OBR', CUATRO, 41));
  const conBarrio = turnoDe(conTitulos(base, [[1, BRUNO, 0, false], [3, BRUNO, 0, false]]), BRUNO, 'por-pasar');
  let mesa = mesaSobre('OBR-1', conBarrio, CUATRO);
  const ids0 = idsDe(estadoDe(mesa), BRUNO);
  comprobar('con el barrio entero y sin casas se ofrece alzar en los dos solares', ids0.includes('alzar:1') && ids0.includes('alzar:3'), ids0);
  comprobar('y hipotecar los dos, y vender ninguno', ids0.includes('empenar:1') && ids0.includes('empenar:3') && !ids0.some((id) => id.startsWith('vender:')), ids0);
  const sinBarrio = turnoDe(conTitulos(base, [[1, BRUNO, 0, false]]), BRUNO, 'por-pasar');
  comprobar('sin el barrio entero no se ofrece alzar', !idsDe(sinBarrio, BRUNO).some((id) => id.startsWith('alzar:')));
  const conEmpeno = turnoDe(conTitulos(base, [[1, BRUNO, 0, false], [3, BRUNO, 0, true]]), BRUNO, 'por-pasar');
  comprobar('ni con un solar del barrio hipotecado', !idsDe(conEmpeno, BRUNO).some((id) => id.startsWith('alzar:')));

  const alza1 = mover(mesa, BRUNO, { tipo: ALZAR, carga: { casilla: 1 } });
  mesa = alza1.mesa;
  let e = estadoDe(mesa);
  comprobar('alzar la primera casa cambia el estado, cobra 50 y baja el Ayuntamiento a 31', alza1.cambio && tituloDe(e, 1).casas === 1 && e.casasEnElConcejo === CASAS_DEL_CONCEJO - 1 && pagosDe(e, BRUNO).some((p) => p.porque === 'casa' && p.cuanto === 50));
  comprobar('con un suceso `alza` con casas 1', sucesosDe(e, 'alza').length === 1 && (sucesosDe(e, 'alza')[0] as { casas: number }).casas === 1);
  const ids1 = idsDe(e, BRUNO);
  comprobar('PAREJO: la segunda casa en el 1 no se ofrece hasta que el 3 tenga una', !ids1.includes('alzar:1') && ids1.includes('alzar:3'), ids1);
  comprobar('y ya no se puede hipotecar ninguno de los dos: hay edificios en el barrio', !ids1.includes('empenar:1') && !ids1.includes('empenar:3'), ids1);
  comprobar('vender se ofrece sólo donde hay casa', ids1.includes('vender:1') && !ids1.includes('vender:3'), ids1);
  const segunda = mover(mesa, BRUNO, { tipo: ALZAR, carga: { casilla: 1 } });
  comprobar('mandar la segunda casa en el 1 se rechaza con motivo y no cambia nada', !segunda.cambio && segunda.motivo !== null, segunda.motivo);

  /* Hasta cuatro y cuatro, alternando, y el hotel. */
  for (const c of [3, 1, 3, 1, 3, 1, 3]) {
    const r = mover(mesa, BRUNO, { tipo: ALZAR, carga: { casilla: c } });
    if (!r.cambio) fallos.push(`no se pudo alzar en ${c}: ${String(r.motivo)}`);
    mesa = r.mesa;
  }
  e = estadoDe(mesa);
  comprobar('con ocho alzas hay cuatro casas en cada solar y 24 en el Ayuntamiento', tituloDe(e, 1).casas === 4 && tituloDe(e, 3).casas === 4 && e.casasEnElConcejo === CASAS_DEL_CONCEJO - 8);
  const idsPosada = idsDe(e, BRUNO);
  const opPosada = opcionPorId(e, BRUNO, 'alzar:1');
  comprobar('la quinta se ofrece como hotel, con el precio de una casa más', opPosada !== null && opPosada.rotulo.indexOf('hotel') >= 0 && opPosada.rotulo.indexOf('50 €') >= 0, idsPosada);
  const posada = mover(mesa, BRUNO, { tipo: ALZAR, carga: { casilla: 1 } });
  mesa = posada.mesa;
  e = estadoDe(mesa);
  comprobar('el hotel sustituye a las cuatro casas: casas 5, el Ayuntamiento recupera cuatro y da un hotel', posada.cambio && tituloDe(e, 1).casas === POSADA && e.casasEnElConcejo === CASAS_DEL_CONCEJO - 4 && e.posadasEnElConcejo === POSADAS_DEL_CONCEJO - 1);
  comprobar('y se paga por `posada`', pagosDe(e, BRUNO).some((p) => p.porque === 'posada' && p.cuanto === 50));
  const idsTrasPosada = idsDe(e, BRUNO);
  comprobar('PAREJO al vender: con hotel en el 1 y cuatro casas en el 3, sólo se vende del 1', idsTrasPosada.includes('vender:1') && !idsTrasPosada.includes('vender:3'), idsTrasPosada);
  const opVenta = opcionPorId(e, BRUNO, 'vender:1');
  comprobar('y la venta de el hotel se rotula «por cuatro casas» porque el Ayuntamiento las tiene', opVenta !== null && opVenta.rotulo.indexOf('por cuatro casas') >= 0, opVenta?.rotulo);
  const venta = mover(mesa, BRUNO, { tipo: VENDER, carga: { casilla: 1 } });
  e = estadoDe(venta.mesa);
  comprobar('vender el hotel la degrada a cuatro casas y devuelve la mitad de una casa (25)', venta.cambio && tituloDe(e, 1).casas === 4 && e.posadasEnElConcejo === POSADAS_DEL_CONCEJO && e.casasEnElConcejo === CASAS_DEL_CONCEJO - 8 && cobrosDe(e, BRUNO).some((c) => c.porque === 'venta' && c.cuanto === 25));

  /* El hotel ENTERO cuando el Ayuntamiento no tiene cuatro casas que devolver. */
  const sinCasas: EstadoDelBurgo = { ...estadoDe(mesa), casasEnElConcejo: 2 };
  const opEntera = opcionPorId(sinCasas, BRUNO, 'vender:1');
  comprobar('sin cuatro casas en el Ayuntamiento, el hotel se vende ENTERA: rótulo y 125 €', opEntera !== null && opEntera.rotulo.indexOf('el hotel entero') >= 0 && opEntera.rotulo.indexOf('125 €') >= 0, opEntera?.rotulo);
  const entera = mover(mesaSobre('OBR-ENTERA', sinCasas, CUATRO), BRUNO, { tipo: VENDER, carga: { casilla: 1 } });
  const eEntera = estadoDe(entera.mesa);
  comprobar('y al venderla quedan cero casas y el Ayuntamiento recupera el hotel', entera.cambio && tituloDe(eEntera, 1).casas === 0 && eEntera.posadasEnElConcejo === POSADAS_DEL_CONCEJO && cobrosDe(eEntera, BRUNO).some((c) => c.cuanto === 5 * 25));

  /* Sin casas en el Ayuntamiento no se alza; sin hoteles tampoco el hotel. */
  const concejoVacio: EstadoDelBurgo = { ...conBarrio, casasEnElConcejo: 0 };
  comprobar('con el Ayuntamiento sin casas no se ofrece alzar', !idsDe(concejoVacio, BRUNO).some((id) => id.startsWith('alzar:')));
  const aPuntoDePosada = conTitulos({ ...conBarrio, casasEnElConcejo: 0 }, [[1, BRUNO, 4, false], [3, BRUNO, 4, false]]);
  comprobar('pero con cuatro y cuatro el hotel sí, aunque no haya casas', idsDe(aPuntoDePosada, BRUNO).includes('alzar:1'));
  comprobar('y sin hoteles en el Ayuntamiento, no', !idsDe({ ...aPuntoDePosada, posadasEnElConcejo: 0 }, BRUNO).some((id) => id.startsWith('alzar:')));
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
paso('5. DOBLES Y COMISARÍA: repetir, tres dobles, fianza, Salvoconducto, dados, tercer intento, visita');
// ---------------------------------------------------------------------------

/** Los reproches de un encierro: en la Comisaría, presa 0, sin cobrar la Salida, y con el suceso. */
function reprochesDeEncierro(s: EstadoDelBurgo, quien: AsientoId, porque: 'casilla' | 'carta' | 'tres-dobles'): string[] {
  const r: string[] = [];
  const j = jugadorDe(s, quien);
  if (j.casilla !== LA_MAZMORRA) r.push(`está en ${j.casilla} y no en la Comisaría`);
  if (j.presa !== 0) r.push(`presa es ${j.presa} y no 0`);
  const enc = sucesosDe(s, 'a-la-mazmorra') as Array<{ quien: string; porque: string }>;
  if (!enc.some((x) => x.quien === quien && x.porque === porque)) r.push(`no hay suceso a-la-mazmorra por ${porque}`);
  if (cobrosDe(s, quien).some((c) => c.porque === 'puerta-mayor')) r.push('cobró la Salida de camino');
  if (s.dobles !== 0) r.push('los dobles no se pusieron a cero');
  return r;
}

/**
 * LOS DOBLES A LA VISTA de quien tiene el turno: el aviso y el botón de tirar.
 *
 * La regla estuvo entera en el reductor desde el principio, pero sus frases colgaban de `por-pasar`
 * con dobles, un paso al que no lleva ninguna tirada (con dobles el turno vuelve a `por-tirar`): quien
 * sacaba dobles leía «Te toca tirar.» y «Tirar los dados», lo mismo que al empezar un turno, y al
 * tercero la Comisaría llegaba sin una palabra fuera de la crónica. El 17-sep-2026 Miguel dio la regla
 * por olvidada. Esto exige, en `por-tirar` y `por-pasar` sin nada que interrumpa:
 *
 *   · con dobles, que el aviso diga que se vuelve a tirar y que el tercero lleva a la Comisaría sin
 *     mover, y que el botón sea «Volver a tirar (dobles)»;
 *   · justo después del tercer doble, que el aviso diga por qué se está en la Comisaría, sin botón de
 *     tirar;
 *   · sin dobles, que nadie mande volver a tirar, y que el botón de quien está libre sea «Tirar los dados».
 *
 * Un estado donde no toca decir nada de esto (otro paso, una subasta, un apuro, el Impuesto por elegir,
 * otro asiento) no da reproches. La vista y las opciones entran por parámetro para poder envenenarlas
 * con las frases de antes.
 */
function reprochesDeLosDoblesALaVista(
  e: EstadoDelBurgo,
  quien: AsientoId,
  v: VistaDelBurgo = vistaDe(e, quien),
  opciones: readonly Opcion[] = opcionesEn(e, quien),
): string[] {
  const r: string[] = [];
  const i = e.jugadores.findIndex((x) => x.asiento === quien);
  const j = e.jugadores[i];
  if (j === undefined || j.quebrado || e.momento !== 'jugando' || e.turno !== i) return r;
  if (e.apuro !== null || e.almoneda !== null || e.impuestoSinPagar || (e.paso !== 'por-tirar' && e.paso !== 'por-pasar')) return r;
  /* Un trato que me proponen va antes en el aviso (`redactarAviso`): ahí sólo se mira el botón. */
  const conTratoParaMi = e.tratos.some((t) => t.a === quien);
  const tirar = opciones.find((o) => o.tipo === TIRAR) ?? null;
  if (e.dobles > 0) {
    if (!conTratoParaMi && v.aviso.indexOf('vuelve a tirar') < 0) r.push(`con ${e.dobles} dobles el aviso no dice que se vuelve a tirar: «${v.aviso}»`);
    if (!conTratoParaMi && v.aviso.indexOf('Comisaría sin mover') < 0) r.push(`con ${e.dobles} dobles el aviso no dice que el tercero lleva a la Comisaría sin mover: «${v.aviso}»`);
    if (tirar === null || tirar.rotulo !== 'Volver a tirar (dobles)') r.push(`con ${e.dobles} dobles el botón de tirar es «${String(tirar?.rotulo)}»`);
  } else if (e.sucesos.some((s) => s.que === 'a-la-mazmorra' && s.quien === quien && s.porque === 'tres-dobles')) {
    if (!conTratoParaMi && v.aviso.indexOf('Tres dobles seguidos') < 0) r.push(`tras el tercer doble el aviso no dice por qué está en la Comisaría: «${v.aviso}»`);
    if (tirar !== null) r.push(`tras el tercer doble se ofrece «${tirar.rotulo}»`);
  } else {
    if (v.aviso.indexOf('vuelve a tirar') >= 0) r.push(`sin dobles el aviso manda volver a tirar: «${v.aviso}»`);
    if (tirar !== null && j.presa < 0 && tirar.rotulo !== 'Tirar los dados') r.push(`sin dobles el botón de tirar es «${tirar.rotulo}»`);
  }
  return r;
}

/**
 * LA REGLA DE LOS DOBLES entre dos revisiones seguidas de una mesa (`antes` es el estado justo antes
 * del cambio). Si el cambio trae una tirada con dobles de alguien que no estaba en la Comisaría:
 *
 *   · si ya llevaba dos (el tercero), va a la Comisaría EN ESE MISMO CAMBIO, sin un solo `mueve`, sin
 *     cobrar la Salida y con los dobles a cero: la tercera tirada no se juega;
 *   · si no, anda, y —salvo que la casilla o una carta lo encierren, o quiebre— los dobles suben uno y
 *     el turno sigue siendo suyo.
 *
 * Y en cualquier cambio: el turno no pasa a otro con dobles pendientes, salvo que quien los tenía haya
 * quebrado o la partida se haya acabado.
 */
function reprochesDeLaReglaDeLosDobles(antes: EstadoDelBurgo, despues: EstadoDelBurgo): string[] {
  const r: string[] = [];
  const quienTenia = antes.jugadores[antes.turno];
  if (antes.momento === 'jugando' && despues.momento === 'jugando' && antes.dobles > 0 && despues.turno !== antes.turno && quienTenia !== undefined) {
    const ahora = despues.jugadores.find((x) => x.asiento === quienTenia.asiento);
    if (ahora !== undefined && !ahora.quebrado) r.push(`el turno pasó de ${quienTenia.asiento} a otro con ${antes.dobles} dobles pendientes`);
  }
  const k = despues.sucesos.findIndex((s) => s.que === 'tira');
  const tira = despues.sucesos[k];
  if (tira === undefined || tira.que !== 'tira' || !tira.dobles || tira.enLaMazmorra) return r;
  const quien = tira.quien;
  const j = despues.jugadores.find((x) => x.asiento === quien);
  if (j === undefined) return r;
  const tras = despues.sucesos.slice(k + 1);
  const porTresDobles = tras.some((s) => s.que === 'a-la-mazmorra' && s.quien === quien && s.porque === 'tres-dobles');
  const encerrado = tras.some((s) => s.que === 'a-la-mazmorra' && s.quien === quien);
  const anda = tras.filter((s) => s.que === 'mueve' && s.quien === quien).length;
  if (antes.dobles + 1 >= DOBLES_QUE_ENCIERRAN) {
    if (!porTresDobles) r.push(`el tercer doble seguido de ${quien} no lo llevó a la Comisaría`);
    if (anda > 0) r.push(`con el tercer doble ${quien} anduvo (${anda} mueve)`);
    if (tras.some((s) => s.que === 'cobra' && s.quien === quien && s.porque === 'puerta-mayor')) r.push(`con el tercer doble ${quien} cobró la Salida`);
    if (j.casilla !== LA_MAZMORRA || j.presa !== 0) r.push(`tras el tercer doble ${quien} está en la ${j.casilla} con presa ${j.presa}`);
    if (despues.dobles !== 0) r.push(`tras el tercer doble quedan ${despues.dobles} dobles`);
  } else {
    if (porTresDobles) r.push(`con el ${antes.dobles + 1}.º doble ${quien} fue a la Comisaría por tres dobles`);
    if (anda === 0) r.push(`con el ${antes.dobles + 1}.º doble ${quien} no anduvo`);
    if (!encerrado && !j.quebrado && despues.momento === 'jugando') {
      if (despues.dobles !== antes.dobles + 1) r.push(`tras el ${antes.dobles + 1}.º doble el estado lleva ${despues.dobles} dobles`);
      if (despues.turno !== antes.turno) r.push(`tras un doble el turno ya no es de ${quien}`);
    }
  }
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

  /* Dobles repite. Se cae en el Descanso (20), que no pide nada: el Impuesto tiene su propio bloque. */
  const { s: dobles } = alCaerEn('DOB-1', base, ANA, LA_FERIA, [[2, 2]]);
  comprobar('con dobles se mueve, se resuelve la casilla y se queda en por-tirar con dobles 1', dobles.dobles === 1 && dobles.paso === 'por-tirar' && dobles.tiradasDelTurno === 1 && jugadorDe(dobles, ANA).casilla === LA_FERIA);
  comprobar('y en el Descanso no se paga nada', pagosDe(dobles, ANA).length === 0, pagosDe(dobles, ANA));
  comprobar('la vista ofrece tirar otra vez y NO pasar', idsDe(dobles, ANA).includes('tirar') && !idsDe(dobles, ANA).includes('pasar'), idsDe(dobles, ANA));
  comprobar('y el suceso `tira` lleva dobles: true con el PAR entero', (sucesosDe(dobles, 'tira')[0] as { dobles: boolean; dados: ParDeDados }).dobles && (sucesosDe(dobles, 'tira')[0] as { dados: ParDeDados }).dados.join() === '2,2');
  const { s: sinDobles } = alCaerEn('DOB-0', base, ANA, LA_FERIA);
  comprobar('sin dobles se queda en por-pasar con dobles 0 y se ofrece pasar', sinDobles.paso === 'por-pasar' && sinDobles.dobles === 0 && idsDe(sinDobles, ANA).includes('pasar'));
  const pasar = mover(mesaSobre('DOB-PASAR', dobles, CUATRO), ANA, { tipo: PASAR, carga: {} });
  comprobar('con dobles pendientes, PASAR se rechaza con motivo', !pasar.cambio && pasar.motivo !== null);

  /*
   * Tres dobles seguidos encierran sin mover ni cobrar. Se sale del 34 para que las
   * dos primeras caídas sean la Salida y el Impuesto: ni un título (que abriría
   * `comprar` y pararía la cadena) ni una carta (que gastaría azar).
   */
  let mesa = listoParaTirar('DOB-3', base, ANA, 34, [[3, 3], [2, 2], [1, 1]]);
  mesa = tira(mesa, ANA);
  comprobar('primer dobles: la Salida, dobles 1', jugadorDe(estadoDe(mesa), ANA).casilla === 0 && estadoDe(mesa).dobles === 1);
  mesa = tira(mesa, ANA);
  comprobar('segundo dobles: el Impuesto, dobles 2', jugadorDe(estadoDe(mesa), ANA).casilla === 4 && estadoDe(mesa).dobles === 2);
  /*
   * Y EL IMPUESTO PARA LA CADENA HASTA QUE SE ELIGE CÓMO SE PAGA (regla 4): con los
   * dobles pendientes, el turno vuelve a `por-tirar` en cuanto se paga y la tercera
   * tirada sigue siendo la que encierra.
   */
  comprobar('caer en el Impuesto NO cobra todavía: enciende la marca y deja los dobles como estaban', estadoDe(mesa).impuestoSinPagar && estadoDe(mesa).paso === 'por-tirar' && jugadorDe(estadoDe(mesa), ANA).mrs === DINERO_DE_SALIDA + PAGA_DE_LA_PUERTA_MAYOR, {
    marca: estadoDe(mesa).impuestoSinPagar,
    mrs: jugadorDe(estadoDe(mesa), ANA).mrs,
  });
  {
    /* Tirar sin elegir lo cobra de camino, por la cantidad fija: en otra mesa, para no gastar la cadena. */
    const sinElegir = estadoDe(mover(mesaSobre('DOB-SIN-ELEGIR', estadoDe(mesa), CUATRO), ANA, { tipo: TIRAR, carga: {} }).mesa);
    comprobar('y tirar sin elegir cobra la fija de camino y apaga la marca', !sinElegir.impuestoSinPagar && jugadorDe(sinElegir, ANA).mrs === DINERO_DE_SALIDA, { mrs: jugadorDe(sinElegir, ANA).mrs });
  }
  const conImpuesto = mover(mesa, ANA, { tipo: PAGAR_IMPUESTO, carga: { como: 'fijo' } });
  mesa = conImpuesto.mesa;
  comprobar('y elegirlo a mano cobra lo mismo sin tocar los dobles ni el paso', conImpuesto.cambio && estadoDe(mesa).paso === 'por-tirar' && estadoDe(mesa).dobles === 2 && jugadorDe(estadoDe(mesa), ANA).mrs === DINERO_DE_SALIDA, {
    paso: estadoDe(mesa).paso,
    mrs: jugadorDe(estadoDe(mesa), ANA).mrs,
  });
  const conDosDobles = estadoDe(mesa);
  mesa = tira(mesa, ANA);
  const tres = estadoDe(mesa);
  comprobar('tercer dobles: a la Comisaría sin mover ni cobrar', reprochesDeEncierro(tres, ANA, 'tres-dobles').length === 0 && sucesosDe(tres, 'mueve').length === 0, reprochesDeEncierro(tres, ANA, 'tres-dobles'));
  comprobar('y el turno queda en por-pasar: se ofrece pasar y no tirar', tres.paso === 'por-pasar' && idsDe(tres, ANA).includes('pasar') && !idsDe(tres, ANA).includes('tirar'));
  comprobar('rev 4 y jugada subida cuatro veces: una por tirada y otra por el Impuesto', mesa.rev === 4 && tres.jugada === base.jugada + 4, { rev: mesa.rev, jugada: tres.jugada - base.jugada });
  /* La vacuna: un estado que dejara al de los tres dobles libre en la calle se ve caer. */
  const noEncerrado = conJugador(tres, ANA, { casilla: 12, presa: LIBRE });
  comprobar('la vacuna: sin el tope de tres dobles (libre en el 12) los reproches del encierro caen', reprochesDeEncierro(noEncerrado, ANA, 'tres-dobles').length > 0);
  comprobar('y el dinero cuadra: cobró 200 en la Salida, pagó 200 de Impuesto y nada más', jugadorDe(tres, ANA).mrs === DINERO_DE_SALIDA);

  /*
   * LA REGLA ENTRE DOS REVISIONES: la función que vigila las partidas enteras del bloque 13, aplicada
   * aquí a los cambios de verdad y a sus venenos. El tercer doble no se juega; los otros andan y suman.
   */
  const antesDelDoble = listoParaTirar('DOB-1-REGLA', base, ANA, LA_FERIA - 4, [[2, 2]]);
  const trasElDoble = estadoDe(tira(antesDelDoble, ANA));
  comprobar('la regla entre revisiones: el primer doble anda, suma uno y deja el turno a quien lo sacó', reprochesDeLaReglaDeLosDobles(estadoDe(antesDelDoble), trasElDoble).length === 0 && trasElDoble.dobles === 1, reprochesDeLaReglaDeLosDobles(estadoDe(antesDelDoble), trasElDoble));
  comprobar('y el tercero, sin andar, a la Comisaría en el mismo cambio', reprochesDeLaReglaDeLosDobles(conDosDobles, tres).length === 0, reprochesDeLaReglaDeLosDobles(conDosDobles, tres));
  {
    const andando: EstadoDelBurgo = {
      ...conJugador(tres, ANA, { casilla: (jugadorDe(conDosDobles, ANA).casilla + 2) % CUANTAS_CASILLAS, presa: LIBRE }),
      sucesos: [...tres.sucesos.filter((s) => s.que !== 'a-la-mazmorra'), { que: 'mueve', quien: ANA, desde: jugadorDe(conDosDobles, ANA).casilla, hasta: (jugadorDe(conDosDobles, ANA).casilla + 2) % CUANTAS_CASILLAS, recorrido: [5, 6], porLaPuertaMayor: false, como: 'anda' }],
    };
    comprobar('VACUNA: un tercer doble que se juega —anda dos casillas y no va a la Comisaría— se ve caer', reprochesDeLaReglaDeLosDobles(conDosDobles, andando).length >= 3, reprochesDeLaReglaDeLosDobles(conDosDobles, andando));
    const sinContar: EstadoDelBurgo = { ...trasElDoble, dobles: 0, paso: 'por-pasar' };
    comprobar('VACUNA: un doble que no se cuenta también', reprochesDeLaReglaDeLosDobles(estadoDe(antesDelDoble), sinContar).length > 0);
    const otroTurno: EstadoDelBurgo = { ...trasElDoble, turno: trasElDoble.jugadores.findIndex((x) => x.asiento === BRUNO), sucesos: [] };
    comprobar('VACUNA: y un turno que pasa a otro con dobles pendientes también', reprochesDeLaReglaDeLosDobles(trasElDoble, otroTurno).length > 0);
  }

  /*
   * Y LA PANTALLA LO DICE (17-sep-2026). Las frases de los dobles colgaban de `por-pasar`, adonde no
   * lleva ninguna tirada: con dobles se leía «Te toca tirar.» y «Tirar los dados», como al empezar un
   * turno, y la regla parecía no existir.
   */
  const alEmpezar = turnoDe(base, ANA);
  comprobar('al empezar el turno, sin dobles: «Te toca tirar.» y «Tirar los dados»', reprochesDeLosDoblesALaVista(alEmpezar, ANA).length === 0 && vistaDe(alEmpezar, ANA).aviso === 'Te toca tirar.', reprochesDeLosDoblesALaVista(alEmpezar, ANA));
  comprobar('con un doble el aviso manda volver a tirar y avisa de la Comisaría, y el botón es «Volver a tirar (dobles)»', reprochesDeLosDoblesALaVista(dobles, ANA).length === 0, { reproches: reprochesDeLosDoblesALaVista(dobles, ANA), aviso: vistaDe(dobles, ANA).aviso });
  comprobar('con dos, lo mismo, y el aviso dice que son otra vez', reprochesDeLosDoblesALaVista(conDosDobles, ANA).length === 0 && vistaDe(conDosDobles, ANA).aviso.indexOf('otra vez') >= 0 && vistaDe(conDosDobles, ANA).aviso !== vistaDe(dobles, ANA).aviso, { reproches: reprochesDeLosDoblesALaVista(conDosDobles, ANA), aviso: vistaDe(conDosDobles, ANA).aviso });
  comprobar('y tras el tercero el aviso dice por qué está en la Comisaría, sin botón de tirar', reprochesDeLosDoblesALaVista(tres, ANA).length === 0, { reproches: reprochesDeLosDoblesALaVista(tres, ANA), aviso: vistaDe(tres, ANA).aviso });
  comprobar('el aviso de los dobles es de quien los sacó: los demás siguen esperando', vistaDe(dobles, BRUNO).aviso.indexOf('vuelve a tirar') < 0 && vistaDe(tres, BRUNO).aviso.indexOf('Tres dobles') < 0, [vistaDe(dobles, BRUNO).aviso, vistaDe(tres, BRUNO).aviso]);
  comprobar('y la ayuda del botón también cuenta los dobles', (opcionesEn(dobles, ANA).find((o) => o.tipo === TIRAR)?.ayuda ?? '').indexOf('Comisaría sin mover') >= 0 && (opcionesEn(conDosDobles, ANA).find((o) => o.tipo === TIRAR)?.ayuda ?? '').indexOf('dos dobles seguidos') >= 0);
  {
    /* LAS VACUNAS, con EL COMPORTAMIENTO VIEJO: las frases de antes en cada uno de los tres momentos. */
    const conLoDeAntes = (e: EstadoDelBurgo, aviso: string, rotulo: string | null): string[] => {
      const v: VistaDelBurgo = { ...vistaDe(e, ANA), aviso };
      const opciones = opcionesEn(e, ANA).map((o) => (o.tipo === TIRAR && rotulo !== null ? { ...o, rotulo } : o));
      return reprochesDeLosDoblesALaVista(e, ANA, v, opciones);
    };
    comprobar('VACUNA: con un doble, «Te toca tirar.» y «Tirar los dados», como estuvo, se ve caer por las tres', conLoDeAntes(dobles, 'Te toca tirar.', 'Tirar los dados').length === 3, conLoDeAntes(dobles, 'Te toca tirar.', 'Tirar los dados'));
    comprobar('VACUNA: tras el tercer doble, «Puedes obrar, tratar o pasar el turno.» a secas, como estuvo, también', conLoDeAntes(tres, 'Puedes obrar, tratar o pasar el turno.', null).length === 1);
    comprobar('VACUNA: y sin dobles, un aviso que manda volver a tirar también', conLoDeAntes(alEmpezar, 'Dobles: vuelve a tirar.', null).length === 1);
  }

  /* Presa: fianza, Salvoconducto, dados. */
  const presa = turnoDe(conJugador(base, ANA, { casilla: LA_MAZMORRA, presa: 0 }), ANA);
  const idsPresa = idsDe(presa, ANA);
  comprobar('presa con dinero: se ofrece tirar y pagar la fianza, no usar Salvoconducto', idsPresa.includes('tirar') && idsPresa.includes('pagar-fianza') && !idsPresa.includes('usar-indulto'), idsPresa);
  comprobar('y el aviso lo dice con el intento', vistaDe(presa, ANA).aviso.indexOf('Comisaría') >= 0 && vistaDe(presa, ANA).aviso.indexOf('intento 1 de 3') >= 0, vistaDe(presa, ANA).aviso);
  const fianza = mover(mesaSobre('MAZ-FIANZA', presa, CUATRO), ANA, { tipo: PAGAR_FIANZA, carga: {} });
  const trasFianza = estadoDe(fianza.mesa);
  comprobar('pagar la fianza cuesta 50, libera y deja por-tirar', fianza.cambio && jugadorDe(trasFianza, ANA).presa === LIBRE && jugadorDe(trasFianza, ANA).mrs === DINERO_DE_SALIDA - FIANZA && trasFianza.paso === 'por-tirar' && pagosDe(trasFianza, ANA).some((p) => p.porque === 'fianza'));
  comprobar('con suceso sale-de-la-mazmorra por fianza', (sucesosDe(trasFianza, 'sale-de-la-mazmorra')[0] as { como: string } | undefined)?.como === 'fianza');
  const tiraLibre = tira(mesaSobre('MAZ-TRAS-FIANZA', { ...trasFianza, azar: azarQueSaca([[2, 2]]) }, CUATRO), ANA);
  comprobar('y ya tira con normalidad: con dobles repite', estadoDe(tiraLibre).dobles === 1 && jugadorDe(estadoDe(tiraLibre), ANA).casilla === 14);
  const presaPobre = conJugador(presa, ANA, { mrs: FIANZA - 1 });
  comprobar('presa sin 50 €: no se ofrece la fianza', !idsDe(presaPobre, ANA).includes('pagar-fianza'));
  const fianzaPobre = mover(mesaSobre('MAZ-POBRE', presaPobre, CUATRO), ANA, { tipo: PAGAR_FIANZA, carga: {} });
  comprobar('y mandarla se rechaza con motivo', !fianzaPobre.cambio && fianzaPobre.motivo !== null);
  const libreFianza = mover(mesaSobre('MAZ-LIBRE', turnoDe(base, ANA), CUATRO), ANA, { tipo: PAGAR_FIANZA, carga: {} });
  comprobar('un libre no paga fianza: se rechaza', !libreFianza.cambio && libreFianza.motivo !== null);

  for (const mazo of ['pregon', 'arca'] as MazoId[]) {
    const serie = serieDeCarta(mazo, mazo === 'pregon' ? 10 : 5);
    const lista = (mazo === 'pregon' ? presa.pregon : presa.arca).filter((s) => s !== serie);
    const conIndulto: EstadoDelBurgo = { ...conJugador(presa, ANA, { indultos: [mazo] }), [mazo]: lista };
    comprobar(`presa con Salvoconducto ${mazo}: se ofrece usarlo`, idsDe(conIndulto, ANA).includes('usar-indulto'));
    const uso = mover(mesaSobre(`MAZ-IND-${mazo}`, conIndulto, CUATRO), ANA, { tipo: USAR_INDULTO, carga: {} });
    const trasUso = estadoDe(uso.mesa);
    const mazoTras = mazo === 'pregon' ? trasUso.pregon : trasUso.arca;
    comprobar(`usar el Salvoconducto ${mazo} libera sin pagar y la carta vuelve al FONDO de su mazo`, uso.cambio && jugadorDe(trasUso, ANA).presa === LIBRE && jugadorDe(trasUso, ANA).indultos.length === 0 && jugadorDe(trasUso, ANA).mrs === DINERO_DE_SALIDA && reprochesDeMazo(lista, mazoTras, serie).length === 0, reprochesDeMazo(lista, mazoTras, serie));
    comprobar(`  con el suceso sale-de-la-mazmorra por indulto y la vista contando 0 Salvoconductos`, (sucesosDe(trasUso, 'sale-de-la-mazmorra')[0] as { como: string } | undefined)?.como === 'indulto' && vistaDe(trasUso, ANA).jugadores.find((j) => j.asiento === ANA)?.indultos === 0);
  }
  comprobar('la vacuna: un mazo al que la carta no vuelve se ve caer', reprochesDeMazo(presa.pregon.filter((s) => s !== 'p10'), presa.pregon.filter((s) => s !== 'p10'), 'p10').length > 0);
  comprobar('y uno al que vuelve arriba en vez de al fondo también', reprochesDeMazo(presa.pregon.filter((s) => s !== 'p10'), ['p10', ...presa.pregon.filter((s) => s !== 'p10')], 'p10').length > 0);
  const libreIndulto = mover(mesaSobre('MAZ-LIBRE-IND', conJugador(turnoDe(base, ANA), ANA, { indultos: ['arca'] }), CUATRO), ANA, { tipo: USAR_INDULTO, carga: {} });
  comprobar('un libre con Salvoconducto no lo usa: se rechaza', !libreIndulto.cambio && libreIndulto.motivo !== null);

  /* Los dados desde la Comisaría. */
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
  comprobar('y sin dinero para la fianza abre su apuro con la deuda de 50 al Ayuntamiento y mueve igual', sP.paso === 'apuro' && sP.apuro !== null && sP.apuro.quien === ANA && sP.apuro.deudas.some((d) => d.porque === 'fianza' && d.cuanto === FIANZA && d.a === null) && jugadorDe(sP, ANA).casilla === 13);

  /* De visita no pasa nada; el Cepo encierra. */
  const { s: visita } = alCaerEn('MAZ-VISITA', base, ANA, LA_MAZMORRA);
  comprobar('caer en la Comisaría de visita no encierra', jugadorDe(visita, ANA).presa === LIBRE && jugadorDe(visita, ANA).casilla === LA_MAZMORRA && sucesosDe(visita, 'a-la-mazmorra').length === 0 && visita.paso === 'por-pasar');
  const { s: cepo } = alCaerEn('MAZ-CEPO', base, ANA, 30);
  comprobar('caer en el Cepo (30) manda a la Comisaría sin pasar por la Salida', reprochesDeEncierro(cepo, ANA, 'casilla').length === 0, reprochesDeEncierro(cepo, ANA, 'casilla'));
  comprobar('y el `mueve` del Cepo llega al 30 antes del encierro: la escena lo anima', (sucesosDe(cepo, 'mueve')[0] as { hasta: number } | undefined)?.hasta === 30);

  /* Presa obra y trata. */
  const presaConBarrio = conTitulos(presa, [[1, ANA, 0, false], [3, ANA, 0, false]]);
  const idsObra = idsDe(presaConBarrio, ANA);
  comprobar('presa con barrio entero: alza y propone desde la Comisaría', idsObra.includes('alzar:1') && idsObra.includes('proponer'), idsObra);
  const alzaPresa = mover(mesaSobre('MAZ-ALZA', presaConBarrio, CUATRO), ANA, { tipo: ALZAR, carga: { casilla: 1 } });
  comprobar('y la casa se alza de verdad estando presa', alzaPresa.cambio && tituloDe(estadoDe(alzaPresa.mesa), 1).casas === 1 && jugadorDe(estadoDe(alzaPresa.mesa), ANA).presa === 0);
}

// ---------------------------------------------------------------------------
paso('6. LAS 32 CARTAS, una a una desde estados montados, y los dos mazos que rotan');
// ---------------------------------------------------------------------------

/** Las tres casillas de cada mazo. Se cae en la primera de cada lista salvo que la carta pida otra. */
const CASILLA_DE_MAZO: Readonly<Record<MazoId, number>> = { pregon: 7, arca: 17 };

/**
 * UN TRES QUE NO ES DOBLES, y la razón de que las cartas se prueben con él y no con
 * el siete de los demás bloques: con siete, caer en Sucesos (7) obliga a salir del
 * 39 y a CRUZAR la Salida de camino, y entonces cada cuenta de dinero de las
 * treinta y dos cartas lleva doscientos euros de propina que no son de la carta.
 * Con tres se sale del 4, del 14 y del 33, y lo único que mueve el dinero es la carta.
 */
const TRES_PASOS: ParDeDados = [1, 2];

/** La casilla del Impuesto, que es donde se abre el apuro que se salda. */
const EL_DIEZMO_CASILLA = 4;

/**
 * CAER EN EL IMPUESTO Y PAGAR LA CANTIDAD FIJA de un tirón.
 *
 * Desde la regla 4 el Impuesto se ELIGE y caer en él ya no cobra: enciende la marca. Los
 * bloques que sólo querían la deuda de 200 € encima (el apuro, la liquidación del tic)
 * la piden aquí y siguen midiendo lo suyo; la elección tiene su propio bloque. Si al
 * caer NO se encendió la marca —porque ya venía un apuro abierto, que es el caso en que
 * el reductor cobra la fija sin preguntar— se devuelve tal cual.
 */
function alCaerEnElImpuesto(id: string, base: EstadoDelBurgo, quien: AsientoId): EstadoDelBurgo {
  const { s } = alCaerEn(id, base, quien, EL_DIEZMO_CASILLA, [TRES_PASOS]);
  if (!s.impuestoSinPagar) return s;
  const asientos = s.jugadores.map((j) => j.asiento);
  return estadoDe(mover(mesaSobre(`${id}-FIJO`, s, asientos), quien, { tipo: PAGAR_IMPUESTO, carga: { como: 'fijo' } }).mesa);
}

/** ¿Ir de `desde` a `hasta` hacia delante pasa por la Salida? */
function cruzaAlIr(desde: number, hasta: number): boolean {
  return cruzaLaSalida(desde, distanciaAdelante(desde, hasta, CUANTAS_CASILLAS), CUANTAS_CASILLAS);
}

/** Pone `numero` de `mazo` en la CIMA, sin tocar el resto del orden ni el otro mazo. */
function conLaCartaArriba(e: EstadoDelBurgo, mazo: MazoId, numero: number): EstadoDelBurgo {
  const serie = serieDeCarta(mazo, numero);
  const lista = (mazo === 'pregon' ? e.pregon : e.arca).filter((s) => s !== serie);
  const puesto = [serie, ...lista];
  return mazo === 'pregon' ? { ...e, pregon: puesto } : { ...e, arca: puesto };
}

/**
 * LOS REPROCHES DE UNA CARTA CUMPLIDA, sin mirar todavía su efecto: la carta salió
 * por su NÚMERO (nunca la serie), hay un suceso `carta`, y el mazo rotó —la serie
 * al fondo y ni una carta perdida— salvo el Salvoconducto, que SALE del mazo.
 */
function reprochesDeCartaSalida(antes: EstadoDelBurgo, s: EstadoDelBurgo, mazo: MazoId, numero: number, quien: AsientoId): string[] {
  const r: string[] = [];
  const serie = serieDeCarta(mazo, numero);
  const deAntes = mazo === 'pregon' ? antes.pregon : antes.arca;
  const deAhora = mazo === 'pregon' ? s.pregon : s.arca;
  const ficha = cartasDe(mazo).find((c) => c.numero === numero);
  const sucesos = sucesosDe(s, 'carta') as Array<{ mazo: MazoId; carta: number; quien: AsientoId }>;
  if (!sucesos.some((x) => x.mazo === mazo && x.carta === numero && x.quien === quien)) r.push('no hay suceso `carta` con ese número');
  /*
   * `ultimaCarta` es la ÚLTIMA que salió, y no siempre la que se pidió: «tres pasos
   * atrás» desde el 36 cae en el Fondo Vecinal del 33 y saca una segunda. Se exige que cuadre
   * con el último suceso `carta`, que es lo que de verdad afirma el contrato.
   */
  const ultima = sucesos[sucesos.length - 1];
  if (s.ultimaCarta === null) r.push('no hay ultimaCarta');
  else if (ultima === undefined || s.ultimaCarta.mazo !== ultima.mazo || s.ultimaCarta.carta !== ultima.carta || s.ultimaCarta.quien !== ultima.quien) {
    r.push(`ultimaCarta es ${JSON.stringify(s.ultimaCarta)} y el último suceso ${JSON.stringify(ultima)}`);
  }
  if (ficha !== undefined && ficha.efecto.que === 'indulto') {
    if (deAhora.length !== deAntes.length - 1) r.push(`el Salvoconducto no salió del mazo: ${deAntes.length} → ${deAhora.length}`);
    if (deAhora.indexOf(serie) >= 0) r.push('el Salvoconducto sigue en el mazo');
  } else {
    if (deAhora.length !== deAntes.length) r.push(`el mazo cambió de tamaño: ${deAntes.length} → ${deAhora.length}`);
    if (deAhora[deAhora.length - 1] !== serie) r.push(`la carta no fue al fondo: el fondo es ${String(deAhora[deAhora.length - 1])}`);
    if (deAhora[0] === serie) r.push('la carta sigue en la cima');
    for (const x of deAntes) if (deAhora.indexOf(x) < 0) r.push(`se perdió ${x}`);
  }
  return r;
}

{
  const base = estadoDe(empezada('CAR', CUATRO, 41));
  /* Con dinero de sobra: ninguna carta de estas debe abrir un apuro, y si lo abre se ve. */
  let rico = base;
  for (const a of CUATRO) rico = conJugador(rico, a, { mrs: 5000 });

  let cumplidas = 0;
  for (const mazo of ['pregon', 'arca'] as MazoId[]) {
    for (const ficha of cartasDe(mazo)) {
      const donde = CASILLA_DE_MAZO[mazo];
      const numero = ficha.numero;
      /* El «tres pasos atrás» se prueba desde el 36, que es la única de Suerte que cae en una Caja de Comunidad (33). */
      const salida = ficha.efecto.que === 'retrocede' ? 36 : donde;
      const partida = conLaCartaArriba(rico, mazo, numero);
      const { s, cruza } = alCaerEn(`CAR-${mazo}-${numero}`, partida, ANA, salida, [TRES_PASOS]);
      cumplidas++;
      const antesMrs = jugadorDe(partida, ANA).mrs + (cruza ? PAGA_DE_LA_PUERTA_MAYOR : 0);
      const ahora = jugadorDe(s, ANA);
      const generales = reprochesDeCartaSalida(partida, s, mazo, numero, ANA);
      comprobar(`${mazo} ${numero} «${ficha.titulo}» sale por su número y el mazo queda bien`, generales.length === 0, generales);
      const efecto = ficha.efecto;
      switch (efecto.que) {
        case 'ir':
          comprobar(`  y lleva a la casilla ${efecto.a}, cobrando la Salida sólo si se pasa`, ahora.casilla === efecto.a && ahora.mrs === antesMrs + (cruzaAlIr(salida, efecto.a) ? PAGA_DE_LA_PUERTA_MAYOR : 0), {
            casilla: ahora.casilla,
            mrs: ahora.mrs,
            antesMrs,
          });
          break;
        case 'puerta-cercana': {
          const puerta = masCercana(salida, PUERTAS, CUANTAS_CASILLAS);
          comprobar(`  y lleva a la puerta más cercana (${puerta}), que es del Ayuntamiento y se abre para comprar`, ahora.casilla === puerta && s.paso === 'comprar');
          /* Con dueño: el DOBLE de la renta de puerta. */
          const conDueno = conTitulo(conLaCartaArriba(rico, mazo, numero), puerta, { dueno: BRUNO });
          const { s: s2 } = alCaerEn(`CAR-PC-${mazo}-${numero}`, conDueno, ANA, salida, [TRES_PASOS]);
          const esperado = 2 * (RENTA_DE_PUERTA[1] as number);
          comprobar(`  y con dueño paga el DOBLE de la renta de puerta (${esperado})`, reprochesDeRenta(conDueno, s2, ANA, BRUNO, esperado, false).length === 0, reprochesDeRenta(conDueno, s2, ANA, BRUNO, esperado, false));
          break;
        }
        case 'oficio-cercano': {
          const oficio = masCercana(salida, OFICIOS, CUANTAS_CASILLAS);
          comprobar(`  y lleva al oficio más cercano (${oficio}), del Ayuntamiento, y se abre para comprar`, ahora.casilla === oficio && s.paso === 'comprar');
          const conDueno = conTitulo(conLaCartaArriba(rico, mazo, numero), oficio, { dueno: BRUNO });
          /* La segunda tirada del par sale de la MISMA cadena: [2,6] mueve y [1,3] es la del oficio. */
          const { s: s2 } = alCaerEn(`CAR-OC-${mazo}-${numero}`, conDueno, ANA, salida, [TRES_PASOS, [1, 3]]);
          const nueva = sucesosDe(s2, 'tirada-de-oficio')[0] as { dados: ParDeDados } | undefined;
          comprobar('  y con dueño tira DE NUEVO para el oficio y publica el par', nueva !== undefined && nueva.dados.join() === '1,3', nueva);
          const esperado = MULTIPLO_DE_OFICIO_POR_CARTA * 4;
          comprobar(`  y paga diez veces esa tirada (${esperado}), no cuatro ni diez veces la del movimiento`, reprochesDeRenta(conDueno, s2, ANA, BRUNO, esperado, false).length === 0, reprochesDeRenta(conDueno, s2, ANA, BRUNO, esperado, false));
          break;
        }
        case 'cobra':
          comprobar(`  y cobra ${efecto.cuanto} del Ayuntamiento`, ahora.mrs === antesMrs + efecto.cuanto && cobrosDe(s, ANA).some((c) => c.porque === 'carta' && c.cuanto === efecto.cuanto && c.de === null), ahora.mrs);
          break;
        case 'paga':
          comprobar(`  y paga ${efecto.cuanto} al Ayuntamiento`, ahora.mrs === antesMrs - efecto.cuanto && pagosDe(s, ANA).some((p) => p.porque === 'carta' && p.cuanto === efecto.cuanto && p.a === null), ahora.mrs);
          break;
        case 'indulto':
          comprobar('  y el Salvoconducto queda en la mano, contado en la vista y sin gastar un euro', ahora.indultos.length === 1 && ahora.indultos[0] === mazo && ahora.mrs === antesMrs && vistaDe(s, ESPECTADOR).jugadores.find((j) => j.asiento === ANA)?.indultos === 1);
          break;
        case 'retrocede':
          comprobar(`  y retrocede ${efecto.casillas} hasta el 33, que es un Fondo Vecinal, y la resuelve (sale una carta más)`, ahora.casilla === 33 && sucesosDe(s, 'carta').length === 2 && (sucesosDe(s, 'carta')[1] as { mazo: MazoId }).mazo === 'arca', {
            casilla: ahora.casilla,
            cartas: sucesosDe(s, 'carta').length,
          });
          comprobar('  y el `mueve` de retroceder lo dice: como «retrocede» y sin cobrar la Salida', (sucesosDe(s, 'mueve')[1] as { como: string; porLaPuertaMayor: boolean } | undefined)?.como === 'retrocede' && (sucesosDe(s, 'mueve')[1] as { porLaPuertaMayor: boolean } | undefined)?.porLaPuertaMayor === false);
          break;
        case 'a-la-mazmorra':
          comprobar('  y va derecho a la Comisaría, por carta', reprochesDeEncierro(s, ANA, 'carta').length === 0, reprochesDeEncierro(s, ANA, 'carta'));
          break;
        case 'reparaciones': {
          /* Con tres casas en el barrio pardo y un hotel en el azul: la cuenta de la tabla. */
          const conObra = conTitulos(conLaCartaArriba(rico, mazo, numero), [
            [1, ANA, 2, false],
            [3, ANA, 1, false],
            [37, ANA, POSADA, false],
            [39, ANA, 0, false],
          ]);
          const { s: s2, cruza: cruza2 } = alCaerEn(`CAR-REP-${mazo}-${numero}`, conObra, ANA, salida, [TRES_PASOS]);
          const debe = efecto.porCasa * 3 + efecto.porPosada * 1;
          const esperadoMrs = jugadorDe(conObra, ANA).mrs + (cruza2 ? PAGA_DE_LA_PUERTA_MAYOR : 0) - debe;
          comprobar(`  y las reparaciones cuestan ${efecto.porCasa}×3 + ${efecto.porPosada}×1 = ${debe}`, jugadorDe(s2, ANA).mrs === esperadoMrs && pagosDe(s2, ANA).some((p) => p.porque === 'reparaciones' && p.cuanto === debe), {
            mrs: jugadorDe(s2, ANA).mrs,
            esperadoMrs,
          });
          comprobar('  y sin edificios no cuesta nada', (() => {
            const { s: s3, cruza: c3 } = alCaerEn(`CAR-REP0-${mazo}-${numero}`, conLaCartaArriba(rico, mazo, numero), ANA, salida, [TRES_PASOS]);
            return jugadorDe(s3, ANA).mrs === jugadorDe(rico, ANA).mrs + (c3 ? PAGA_DE_LA_PUERTA_MAYOR : 0) && pagosDe(s3, ANA).every((p) => p.porque !== 'reparaciones');
          })());
          break;
        }
        case 'paga-a-cada-uno': {
          const otros = CUATRO.filter((a) => a !== ANA);
          comprobar(`  y paga ${efecto.cuanto} a cada uno de los otros tres`, ahora.mrs === antesMrs - efecto.cuanto * otros.length && otros.every((a) => jugadorDe(s, a).mrs === jugadorDe(partida, a).mrs + efecto.cuanto), ahora.mrs);
          break;
        }
        case 'cobra-de-cada-uno': {
          const otros = CUATRO.filter((a) => a !== ANA);
          comprobar(`  y cobra ${efecto.cuanto} de cada uno de los otros tres`, ahora.mrs === antesMrs + efecto.cuanto * otros.length && otros.every((a) => jugadorDe(s, a).mrs === jugadorDe(partida, a).mrs - efecto.cuanto), ahora.mrs);
          break;
        }
        default:
          comprobar(`  efecto no previsto en este comprobador: ${(efecto as { que: string }).que}`, false);
      }
      comprobar('  y ni un reproche de forma ni un secreto tras cumplirla', reprochesDeLasMiradas(s, CUATRO, true).length === 0 && reprochesDeSecretos(s, CUATRO).length === 0, [
        ...reprochesDeLasMiradas(s, CUATRO, true),
        ...reprochesDeSecretos(s, CUATRO),
      ]);
    }
  }
  comprobar('se han cumplido las 32 cartas, una a una', cumplidas === EL_PREGON.length + EL_ARCA.length && cumplidas === 32, cumplidas);

  /* «Cada uno te paga» con quien no alcanza: se abre la cola de apuros y no se pierde la deuda. */
  {
    const numero = (EL_ARCA.find((c) => c.efecto.que === 'cobra-de-cada-uno') as CartaDelBurgo).numero;
    let pobres = conLaCartaArriba(base, 'arca', numero);
    for (const a of [BRUNO, CARLA]) pobres = conJugador(pobres, a, { mrs: 0 });
    const { s } = alCaerEn('CAR-COLA', pobres, ANA, CASILLA_DE_MAZO.arca, [TRES_PASOS]);
    comprobar('con dos que no alcanzan, «cada uno te paga» abre un apuro y encola el otro', s.paso === 'apuro' && s.apuro !== null && s.colaDeApuros.length === 1, {
      apuro: s.apuro,
      cola: s.colaDeApuros,
    });
    comprobar('y los dos apuros son de los dos pobres, con la deuda entera', [s.apuro?.quien, s.colaDeApuros[0]?.quien].sort().join() === [BRUNO, CARLA].sort().join());
    comprobar('y quien la jugó cobró SÓLO del que podía pagar: de los otros dos no se mueve un euro', jugadorDe(s, ANA).mrs === DINERO_DE_SALIDA + 10 && jugadorDe(s, DIEGO).mrs === DINERO_DE_SALIDA - 10 && jugadorDe(s, BRUNO).mrs === 0, {
      ana: jugadorDe(s, ANA).mrs,
      diego: jugadorDe(s, DIEGO).mrs,
    });
  }

  /* LAS VACUNAS del mazo y de la carta. */
  {
    const numero = 1;
    const partida = conLaCartaArriba(base, 'pregon', numero);
    const { s } = alCaerEn('CAR-VAC', partida, ANA, CASILLA_DE_MAZO.pregon, [TRES_PASOS]);
    comprobar('la vacuna: exigir OTRO número del que salió se ve caer', reprochesDeCartaSalida(partida, s, 'pregon', 2, ANA).length > 0);
    const sinRotar: EstadoDelBurgo = { ...s, pregon: partida.pregon };
    comprobar('y un mazo que no rota también', reprochesDeCartaSalida(partida, sinRotar, 'pregon', numero, ANA).length > 0);
    const conUnaMenos: EstadoDelBurgo = { ...s, pregon: s.pregon.slice(1) };
    comprobar('y uno al que le falta una carta también', reprochesDeCartaSalida(partida, conUnaMenos, 'pregon', numero, ANA).length > 0);
  }
}

// ---------------------------------------------------------------------------
paso('7. EL EMPEÑO: mitad, deshipoteca por TABLA, el barrio con edificios, y el interés del trato');
// ---------------------------------------------------------------------------

{
  const base = estadoDe(empezada('EMP-T', CUATRO, 41));
  const suyos = turnoDe(conTitulos(base, [[1, ANA, 0, false], [3, ANA, 0, false], [5, ANA, 0, false], [37, ANA, 0, false], [39, ANA, 0, false]]), ANA, 'por-pasar');

  /*
   * LA TABLA DEL EMPEÑO, escrita a mano y no derivada de la función: si `valorDeEmpeno`
   * cambiara de fórmula, una tabla calculada con ella seguiría en verde. El interés es
   * el 10 % REDONDEADO HACIA ARRIBA, que es donde vive el fallo fácil (60 → 3, no 3,0).
   */
  const TABLA_DEL_EMPENO: ReadonlyArray<readonly [number, number, number]> = [
    [60, 30, 3],
    [100, 50, 5],
    [140, 70, 7],
    [200, 100, 10],
    [220, 110, 11],
    [260, 130, 13],
    [300, 150, 15],
    [350, 175, 18],
    [400, 200, 20],
  ];
  for (const [precio, empeno, interes] of TABLA_DEL_EMPENO) {
    comprobar(`un título de ${precio} se hipoteca por ${empeno} y se deshipoteca por ${empeno + interes}`, valorDeEmpeno(precio) === empeno && interesDelEmpeno(precio) === interes && costeDeDesempeno(precio) === empeno + interes, {
      empeno: valorDeEmpeno(precio),
      interes: interesDelEmpeno(precio),
    });
  }
  comprobar('el 10 % se redondea HACIA ARRIBA: 175 no da 17', interesDelEmpeno(350) === 18 && interesDelEmpeno(60) === 3);

  const opEmpeno = opcionPorId(suyos, ANA, 'empenar:39');
  comprobar('la opción de hipotecar la Calle Mayor dice sus 200 €', opEmpeno !== null && opEmpeno.rotulo.indexOf('200 €') >= 0, opEmpeno?.rotulo);
  const empenado = mover(mesaSobre('EMP-1', suyos, CUATRO), ANA, { tipo: EMPENAR, carga: { casilla: 39 } });
  const trasEmpeno = estadoDe(empenado.mesa);
  comprobar('hipotecar la Calle Mayor da 200 y la marca', empenado.cambio && tituloDe(trasEmpeno, 39).empenado && jugadorDe(trasEmpeno, ANA).mrs === DINERO_DE_SALIDA + valorDeEmpeno(400) && cobrosDe(trasEmpeno, ANA).some((c) => c.porque === 'empeno' && c.cuanto === 200));
  comprobar('con su suceso `empena` y la vista marcándolo', sucesosDe(trasEmpeno, 'empena').length === 1 && vistaDe(trasEmpeno, ESPECTADOR).titulos.find((t) => t.casilla === 39)?.empenado === true);
  comprobar('y ya no se ofrece hipotecarlo otra vez, sino deshipotecarlo', !idsDe(trasEmpeno, ANA).includes('empenar:39') && idsDe(trasEmpeno, ANA).includes('desempenar:39'));
  const opDes = opcionPorId(trasEmpeno, ANA, 'desempenar:39');
  comprobar('y la de deshipotecar dice la hipoteca MÁS el interés (220 €)', opDes !== null && opDes.rotulo.indexOf('220 €') >= 0, opDes?.rotulo);
  const desempenado = mover(mesaSobre('EMP-2', trasEmpeno, CUATRO), ANA, { tipo: DESEMPENAR, carga: { casilla: 39 } });
  const trasDes = estadoDe(desempenado.mesa);
  comprobar('deshipotecar cuesta 220 y lo libera', desempenado.cambio && !tituloDe(trasDes, 39).empenado && jugadorDe(trasDes, ANA).mrs === DINERO_DE_SALIDA + 200 - 220 && pagosDe(trasDes, ANA).some((p) => p.porque === 'desempeno' && p.cuanto === 220));
  comprobar('hipotecado no cobra y deshipotecado vuelve a cobrar (y con el barrio azul entero, el doble)', vistaDe(trasEmpeno, ESPECTADOR).titulos.find((t) => t.casilla === 39)?.rentaAhora === 0 && vistaDe(trasDes, ESPECTADOR).titulos.find((t) => t.casilla === 39)?.rentaAhora === 2 * 50, {
    empenado: vistaDe(trasEmpeno, ESPECTADOR).titulos.find((t) => t.casilla === 39)?.rentaAhora,
    libre: vistaDe(trasDes, ESPECTADOR).titulos.find((t) => t.casilla === 39)?.rentaAhora,
  });
  const sinDinero = conJugador(trasEmpeno, ANA, { mrs: 219 });
  comprobar('sin los 220 no se ofrece deshipotecar', !idsDe(sinDinero, ANA).includes('desempenar:39'));
  comprobar('y mandarlo se rechaza con motivo', (() => {
    const r = mover(mesaSobre('EMP-3', sinDinero, CUATRO), ANA, { tipo: DESEMPENAR, carga: { casilla: 39 } });
    return !r.cambio && r.motivo !== null;
  })());

  /* Con edificios en el barrio no se hipoteca NINGUNO de sus solares. */
  const conCasa = conTitulo(suyos, 1, { casas: 1 });
  const idsConCasa = idsDe(conCasa, ANA);
  comprobar('con una casa en el barrio pardo no se hipoteca ni el 1 ni el 3', !idsConCasa.includes('empenar:1') && !idsConCasa.includes('empenar:3'), idsConCasa);
  comprobar('pero sí los de otros barrios', idsConCasa.includes('empenar:5') && idsConCasa.includes('empenar:39'));
  const forzado = mover(mesaSobre('EMP-4', conCasa, CUATRO), ANA, { tipo: EMPENAR, carga: { casilla: 3 } });
  comprobar('y mandarlo igual se rechaza con motivo', !forzado.cambio && forzado.motivo !== null);
  const ajeno = mover(mesaSobre('EMP-5', suyos, CUATRO), BRUNO, { tipo: EMPENAR, carga: { casilla: 39 } });
  comprobar('un título que no es tuyo no se hipoteca', !ajeno.cambio && ajeno.motivo !== null);

  /*
   * EL INTERÉS DEL TRATO: quien RECIBE un título hipotecado paga el 10 % en el acto, y
   * si no le alcanza para ese interés el trato se rechaza CON MOTIVO (y sin decir qué
   * hay en la mano de nadie: aquí no hay manos, pero el motivo se pasa por la criba).
   */
  {
    const conEmpenado = conJugador(conTitulo(turnoDe(conTitulos(base, [[39, ANA, 0, true]]), ANA, 'por-pasar'), 39, { empenado: true }), BRUNO, { mrs: 500 });
    const propuesta = mover(mesaSobre('EMP-TRATO', conEmpenado, CUATRO), ANA, {
      tipo: PROPONER,
      carga: { a: BRUNO, doy: { mrs: 0, titulos: [39], indultos: 0 }, pido: { mrs: 100, titulos: [], indultos: 0 } },
    });
    comprobar('se propone dar la Calle Mayor HIPOTECADA por 100 €', propuesta.cambio && estadoDe(propuesta.mesa).tratos.length === 1);
    const id = (estadoDe(propuesta.mesa).tratos[0] as TratoDelBurgo).id;
    const aceptado = mover(propuesta.mesa, BRUNO, { tipo: ACEPTAR, carga: { trato: id } });
    const s = estadoDe(aceptado.mesa);
    comprobar('al aceptarlo, quien recibe el hipotecado paga el interés (20) EN EL ACTO', aceptado.cambio && tituloDe(s, 39).dueno === BRUNO && tituloDe(s, 39).empenado && jugadorDe(s, BRUNO).mrs === 500 - 100 - interesDelEmpeno(400), jugadorDe(s, BRUNO).mrs);
    comprobar('y el pago se anota como `interes` al Ayuntamiento', pagosDe(s, BRUNO).some((p) => p.porque === 'interes' && p.cuanto === 20 && p.a === null));
    /* Y si no le alcanza para el interés: rechazo con motivo, sin mover nada. */
    const pelado = conJugador(conEmpenado, BRUNO, { mrs: 10 });
    const p2 = mover(mesaSobre('EMP-TRATO-2', pelado, CUATRO), ANA, {
      tipo: PROPONER,
      carga: { a: BRUNO, doy: { mrs: 0, titulos: [39], indultos: 0 }, pido: { mrs: 10, titulos: [], indultos: 0 } },
    });
    const id2 = (estadoDe(p2.mesa).tratos[0] as TratoDelBurgo).id;
    const fallido = mover(p2.mesa, BRUNO, { tipo: ACEPTAR, carga: { trato: id2 } });
    comprobar('con 10 € y un interés de 20, aceptar se rechaza con motivo y el título no se mueve', !fallido.cambio && fallido.motivo !== null && fallido.motivo.indexOf('interés') >= 0, fallido.motivo);
    comprobar('y ese motivo no lleva ningún secreto ni ninguna marca dentro', reprochesDeTexto(String(fallido.motivo), estadoDe(p2.mesa)).length === 0);
  }
}

// ---------------------------------------------------------------------------
paso('8. LA SUBASTA: relevo, mínimo y múltiplos, las fijas, la puja libre por la puerta, el cierre');
// ---------------------------------------------------------------------------

{
  const base = estadoDe(empezada('ALM', CUATRO, 41));
  /* ANA cae en la Calle Mayor (39), que es del Ayuntamiento, y la manda a subasta. */
  const { s: enCompra } = alCaerEn('ALM-0', base, ANA, 39);
  comprobar('caer en un título del Ayuntamiento abre `comprar` con las dos opciones', enCompra.paso === 'comprar' && idsDe(enCompra, ANA).includes('comprar:39') && idsDe(enCompra, ANA).includes('a-almoneda:39'));
  const abierta = mover(mesaSobre('ALM-1', enCompra, CUATRO), ANA, { tipo: A_ALMONEDA, carga: { casilla: 39 } });
  let mesa = abierta.mesa;
  let e = estadoDe(mesa);
  const a0 = e.almoneda as AlmonedaDelBurgo;
  comprobar('se abre la subasta, sin pujas, con los cuatro en pie', abierta.cambio && e.paso === 'almoneda' && a0.casilla === 39 && a0.puja === 0 && a0.quienPuja === null && a0.enPie.length === 4);
  comprobar('EL RELEVO EMPIEZA POR EL SIGUIENTE al dueño del turno, que va el ÚLTIMO', a0.enPie.join() === [BRUNO, CARLA, DIEGO, ANA].join() && a0.pujaDe === BRUNO && a0.abiertaPor === ANA, a0.enPie);
  comprobar('y `turnoDe` de la vista es a quien se espera, con `duenoDelTurno` aparte', vistaDe(e, ESPECTADOR).turnoDe === BRUNO && vistaDe(e, ESPECTADOR).duenoDelTurno === ANA);
  comprobar('quien no tiene el relevo no recibe ninguna opción de puja', !idsDe(e, CARLA).some((id) => id.indexOf('pujar') === 0 || id === 'pasar-puja'), idsDe(e, CARLA));

  const idsB = idsDe(e, BRUNO);
  comprobar('el que puja recibe el mínimo, los dos escalones y pasar', idsB.includes('pujar:minimo') && idsB.includes('pujar:+50') && idsB.includes('pujar:+100') && idsB.includes('pasar-puja'), idsB);
  const minima = opcionPorId(e, BRUNO, 'pujar:minimo');
  comprobar(`la primera puja mínima es ${PUJA_MINIMA}`, canonico(minima?.carga) === canonico({ casilla: 39, cuanto: PUJA_MINIMA }));
  const puerta = opcionesEn(e, BRUNO).find((o) => o.declaracion === true && o.tipo === PUJAR);
  comprobar('y una PUERTA de puja libre, que no se pinta como botón', puerta !== undefined && puerta.declaracion === true);
  comprobar('con los cuatro campos exactos y el escalón del paso', canonico(puerta?.carga) === canonico({ casilla: 39, minimo: PUJA_MINIMA, maximo: DINERO_DE_SALIDA, escalon: PASO_DE_PUJA }), puerta?.carga);
  comprobar('las tres fijas son distintas entre sí y ninguna pasa de lo que se tiene', (() => {
    const cuantos = opcionesEn(e, BRUNO).filter((o) => o.declaracion !== true && o.tipo === PUJAR).map((o) => (o.carga as { cuanto: number }).cuanto);
    return new Set(cuantos).size === cuantos.length && cuantos.every((c) => c <= DINERO_DE_SALIDA);
  })());

  /* La puja libre por la puerta: campos EXACTOS. */
  const libre = mover(mesa, BRUNO, { tipo: PUJAR, carga: { casilla: 39, cuanto: 300 } });
  comprobar('una puja libre de 300 cabe por la puerta y se acepta', libre.cambio && (estadoDe(libre.mesa).almoneda as AlmonedaDelBurgo).puja === 300);
  for (const [que, carga] of [
    ['con un campo de más (8 kB de relleno incluidos)', { casilla: 39, cuanto: 300, relleno: 'x'.repeat(8192) }],
    ['sin la casilla', { cuanto: 300 }],
    ['con otra casilla', { casilla: 1, cuanto: 300 }],
    ['por debajo del mínimo', { casilla: 39, cuanto: 5 }],
    ['por encima de lo que tiene', { casilla: 39, cuanto: 5000 }],
    ['que no es múltiplo del paso', { casilla: 39, cuanto: 305 }],
    ['con un no entero', { casilla: 39, cuanto: 300.5 }],
  ] as ReadonlyArray<readonly [string, unknown]>) {
    const r = mover(mesa, BRUNO, { tipo: PUJAR, carga });
    comprobar(`una puja ${que} se rechaza con motivo y no cambia nada`, !r.cambio && r.motivo !== null, r.motivo);
  }
  const deOtro = mover(mesa, CARLA, { tipo: PUJAR, carga: { casilla: 39, cuanto: 300 } });
  comprobar('y una puja de quien no tiene el relevo también', !deOtro.cambio && deOtro.motivo !== null);

  /* El relevo pasa al siguiente y da la vuelta. */
  mesa = libre.mesa;
  e = estadoDe(mesa);
  comprobar('tras pujar, el relevo pasa al siguiente en pie', (e.almoneda as AlmonedaDelBurgo).pujaDe === CARLA && (e.almoneda as AlmonedaDelBurgo).quienPuja === BRUNO);
  const minimaTras = opcionPorId(e, CARLA, 'pujar:minimo');
  comprobar('y el mínimo sube un paso sobre la mejor puja', canonico(minimaTras?.carga) === canonico({ casilla: 39, cuanto: 300 + PASO_DE_PUJA }));
  const pasa1 = mover(mesa, CARLA, { tipo: PASAR_PUJA, carga: { casilla: 39 } });
  mesa = pasa1.mesa;
  e = estadoDe(mesa);
  comprobar('quien pasa sale de `enPie` y el relevo sigue por donde iba', pasa1.cambio && (e.almoneda as AlmonedaDelBurgo).enPie.join() === [BRUNO, DIEGO, ANA].join() && (e.almoneda as AlmonedaDelBurgo).pujaDe === DIEGO);
  const vuelve = mover(mesa, CARLA, { tipo: PUJAR, carga: { casilla: 39, cuanto: 400 } });
  comprobar('EL QUE DECLINÓ NO VUELVE: su puja se rechaza con motivo', !vuelve.cambio && vuelve.motivo !== null);
  mesa = mover(mesa, DIEGO, { tipo: PASAR_PUJA, carga: { casilla: 39 } }).mesa;
  const antesDelCierre = estadoDe(mesa);
  comprobar('con dos fuera, el relevo llega al dueño del turno, que también puja', (antesDelCierre.almoneda as AlmonedaDelBurgo).pujaDe === ANA && (antesDelCierre.almoneda as AlmonedaDelBurgo).enPie.join() === [BRUNO, ANA].join());
  const cierre = mover(mesa, ANA, { tipo: PASAR_PUJA, carga: { casilla: 39 } });
  const cerrada = estadoDe(cierre.mesa);
  comprobar('cuando queda uno en pie y es el mejor postor, la subasta se cierra sola', cerrada.almoneda === null && cerrada.paso === 'por-pasar');
  comprobar('el ganador paga su puja y se lleva el título', tituloDe(cerrada, 39).dueno === BRUNO && jugadorDe(cerrada, BRUNO).mrs === DINERO_DE_SALIDA - 300 && pagosDe(cerrada, BRUNO).some((p) => p.porque === 'almoneda' && p.cuanto === 300));
  comprobar('con los sucesos `almoneda-cerrada` y `cambia-de-mano`', (sucesosDe(cerrada, 'almoneda-cerrada')[0] as { ganador: AsientoId | null; cuanto: number } | undefined)?.ganador === BRUNO && sucesosDe(cerrada, 'cambia-de-mano').length === 1);

  /* Nadie puja: el título se queda en el Ayuntamiento. */
  {
    let sinPujas = mesaSobre('ALM-NADIE', estadoDe(abierta.mesa), CUATRO);
    for (const quien of [BRUNO, CARLA, DIEGO, ANA]) {
      const r = mover(sinPujas, quien, { tipo: PASAR_PUJA, carga: { casilla: 39 } });
      comprobar(`  ${quien} pasa en la subasta`, r.cambio, r.motivo);
      sinPujas = r.mesa;
    }
    const s = estadoDe(sinPujas);
    comprobar('sin una sola puja el título se queda en el Ayuntamiento y la mesa vuelve al turno', s.almoneda === null && tituloDe(s, 39).dueno === null && s.paso === 'por-pasar' && (sucesosDe(s, 'almoneda-cerrada')[0] as { ganador: AsientoId | null } | undefined)?.ganador === null);
  }

  /*
   * LA COLA: al cerrar una subasta, `reanudar` abre la siguiente encolada y no
   * devuelve el turno hasta que la cola está vacía. Es el camino de la cascada de
   * quiebra al Ayuntamiento, y se prueba aquí sobre una subasta normal con dos detrás.
   */
  {
    const conCola: EstadoDelBurgo = { ...estadoDe(abierta.mesa), colaDeAlmonedas: [1, 5] };
    let conLaCola = mesaSobre('ALM-COLA', conCola, CUATRO);
    for (const quien of [BRUNO, CARLA, DIEGO, ANA]) conLaCola = mover(conLaCola, quien, { tipo: PASAR_PUJA, carga: { casilla: 39 } }).mesa;
    const s = estadoDe(conLaCola);
    comprobar('al cerrarse una subasta con la cola llena se abre la SIGUIENTE, en orden de casilla', s.paso === 'almoneda' && (s.almoneda as AlmonedaDelBurgo).casilla === 1 && s.colaDeAlmonedas.join() === '5', {
      paso: s.paso,
      almoneda: s.almoneda,
      cola: s.colaDeAlmonedas,
    });
    let segunda = conLaCola;
    for (const quien of [BRUNO, CARLA, DIEGO, ANA]) segunda = mover(segunda, quien, { tipo: PASAR_PUJA, carga: { casilla: 1 } }).mesa;
    const s2 = estadoDe(segunda);
    comprobar('y al cerrarse ésa, la tercera; la cola se vacía por orden', s2.paso === 'almoneda' && (s2.almoneda as AlmonedaDelBurgo).casilla === 5 && s2.colaDeAlmonedas.length === 0, {
      almoneda: s2.almoneda,
      cola: s2.colaDeAlmonedas,
    });
    let tercera = segunda;
    for (const quien of [BRUNO, CARLA, DIEGO, ANA]) tercera = mover(tercera, quien, { tipo: PASAR_PUJA, carga: { casilla: 5 } }).mesa;
    const s3 = estadoDe(tercera);
    comprobar('y con la cola vacía el turno vuelve a quien lo tenía', s3.almoneda === null && s3.paso === 'por-pasar' && s3.turno === estadoDe(abierta.mesa).turno, { paso: s3.paso });
  }
}

// ---------------------------------------------------------------------------
paso('9. EL APURO Y LA QUIEBRA: no se pasa, vender y hipotecar saldan, varios acreedores, y las dos quiebras');
// ---------------------------------------------------------------------------

{
  const base = estadoDe(empezada('APU', CUATRO, 41));

  /*
   * EL APURO QUE SE SALDA SOLO. ANA con 50 € cae en el Impuesto (200 al Ayuntamiento):
   * no alcanza, no se mueve un euro y se abre su apuro por la deuda ENTERA
   * (reglamento §9: quien no alcanza vende y hipoteca, no paga lo que puede).
   */
  const conPuertas = conTitulos(conJugador(base, ANA, { mrs: 50 }), [[5, ANA, 0, false], [15, ANA, 0, false]]);
  const enApuro = alCaerEnElImpuesto('APU-1', conPuertas, ANA);
  comprobar('con 50 €, el Impuesto abre el apuro por los 200 enteros y no se paga nada', enApuro.paso === 'apuro' && enApuro.apuro !== null && enApuro.apuro.quien === ANA && enApuro.apuro.deudas.length === 1 && enApuro.apuro.deudas[0]?.cuanto === EL_DIEZMO && enApuro.apuro.deudas[0]?.a === null && jugadorDe(enApuro, ANA).mrs === 50, enApuro.apuro);
  comprobar('con el suceso `apuro` diciendo lo que debe', (sucesosDe(enApuro, 'apuro')[0] as { debe: number } | undefined)?.debe === EL_DIEZMO);
  comprobar('y la vista dice a quién se espera y cuánto debe', vistaDe(enApuro, ESPECTADOR).turnoDe === ANA && vistaDe(enApuro, ESPECTADOR).apuro?.debe === EL_DIEZMO && vistaDe(enApuro, ESPECTADOR).apuro?.enCola === 0);
  const idsApuro = idsDe(enApuro, ANA);
  comprobar('EN APURO NO SE PASA NI SE TIRA: sólo hipotecar, vender, tratar y rendirse', !idsApuro.includes('pasar') && !idsApuro.includes('tirar') && idsApuro.includes('empenar:5') && idsApuro.includes('rendirse'), idsApuro);
  comprobar('ni se alza ni se deshipoteca estando en apuro', !idsApuro.some((id) => id.indexOf('alzar:') === 0 || id.indexOf('desempenar:') === 0));
  for (const tipo of [PASAR, TIRAR]) {
    const r = mover(mesaSobre(`APU-NO-${tipo}`, enApuro, CUATRO), ANA, { tipo, carga: {} });
    comprobar(`  y mandar ${tipo} en apuro se rechaza con motivo y no cambia nada`, !r.cambio && r.motivo !== null, r.motivo);
  }
  const otroEnApuro = mover(mesaSobre('APU-OTRO', enApuro, CUATRO), BRUNO, { tipo: EMPENAR, carga: { casilla: 5 } });
  comprobar('y otro asiento no hipoteca lo del endeudado', !otroEnApuro.cambio && otroEnApuro.motivo !== null);

  let saldando = mesaSobre('APU-2', enApuro, CUATRO);
  saldando = mover(saldando, ANA, { tipo: EMPENAR, carga: { casilla: 5 } }).mesa;
  const aMedias = estadoDe(saldando);
  comprobar('hipotecar una puerta da 100 y el apuro SIGUE abierto: 150 no llega a 200', aMedias.paso === 'apuro' && aMedias.apuro !== null && jugadorDe(aMedias, ANA).mrs === 150);
  saldando = mover(saldando, ANA, { tipo: EMPENAR, carga: { casilla: 15 } }).mesa;
  const saldado = estadoDe(saldando);
  comprobar('con la segunda puerta llega a 250, y el apuro SE SALDA SOLO: paga 200 y se cierra', saldado.apuro === null && jugadorDe(saldado, ANA).mrs === 50 && pagosDe(saldado, ANA).some((p) => p.porque === 'diezmo' && p.cuanto === EL_DIEZMO), {
    mrs: jugadorDe(saldado, ANA).mrs,
    paso: saldado.paso,
  });
  comprobar('y la mesa vuelve al paso que se interrumpió, con el turno donde estaba', saldado.paso === 'por-pasar' && saldado.turno === enApuro.turno && idsDe(saldado, ANA).includes('pasar'));

  /* Vender también salda: mismo apuro, pero con casas en vez de puertas. */
  {
    const conCasas = conTitulos(conJugador(base, ANA, { mrs: 50 }), [[31, ANA, 4, false], [32, ANA, 4, false], [34, ANA, 4, false]]);
    const s = alCaerEnElImpuesto('APU-V', conCasas, ANA);
    let vendiendo = mesaSobre('APU-V2', s, CUATRO);
    let ventas = 0;
    for (let k = 0; k < 20 && estadoDe(vendiendo).apuro !== null; k++) {
      const cual = idsDe(estadoDe(vendiendo), ANA).find((id) => id.indexOf('vender:') === 0);
      if (cual === undefined) break;
      const casilla = Number(cual.slice('vender:'.length));
      const r = mover(vendiendo, ANA, { tipo: VENDER, carga: { casilla } });
      if (!r.cambio) break;
      vendiendo = r.mesa;
      ventas++;
    }
    const s2 = estadoDe(vendiendo);
    comprobar('vender casas de una en una también salda el apuro, y en cuanto alcanza se cierra', s2.apuro === null && ventas === 2 && jugadorDe(s2, ANA).mrs === 50 + 2 * 100 - EL_DIEZMO, { ventas, mrs: jugadorDe(s2, ANA).mrs });
    comprobar('y no se vende ni una casa de más: el saldo cierra el apuro en el acto', s2.titulos.filter((t) => t.dueno === ANA).reduce((n, t) => n + t.casas, 0) === 10);
  }

  /*
   * VARIOS ACREEDORES: «te nombran regidor, paga 50 a cada jugador» con 20 € deja
   * TRES deudas en el mismo apuro, una por acreedor, y ninguna se pierde.
   */
  const REGIDOR = (EL_PREGON.find((c) => c.efecto.que === 'paga-a-cada-uno') as CartaDelBurgo).numero;
  const conTres = (() => {
    const conCarta = conLaCartaArriba(conJugador(base, ANA, { mrs: 20 }), 'pregon', REGIDOR);
    return alCaerEn('APU-3', conCarta, ANA, CASILLA_DE_MAZO.pregon, [TRES_PASOS]).s;
  })();
  comprobar('«paga 50 a cada uno» con 20 € deja un apuro con TRES deudas, una por acreedor', conTres.apuro !== null && conTres.apuro.quien === ANA && conTres.apuro.deudas.length === 3 && conTres.apuro.deudas.every((d) => d.cuanto === 50), conTres.apuro);
  comprobar('y la vista suma las tres: debe 150', vistaDe(conTres, ESPECTADOR).apuro?.debe === 150);
  comprobar('y nadie ha cobrado todavía: es todo o nada', [BRUNO, CARLA, DIEGO].every((a) => jugadorDe(conTres, a).mrs === DINERO_DE_SALIDA));

  /*
   * LA QUIEBRA CON UN JUGADOR: todo a quien más reclama. Con tres deudas iguales el
   * empate lo gana el que va antes en orden de mesa, que es la regla escrita.
   */
  {
    const conBienes = conTitulos(conTres, [[1, ANA, 0, false], [3, ANA, 0, true], [21, ANA, 2, false]]);
    const rendida = mover(mesaSobre('APU-Q1', conBienes, CUATRO), ANA, { tipo: RENDIRSE, carga: {} });
    const s = estadoDe(rendida.mesa);
    comprobar('rendirse en apuro con tres deudas iguales manda todo al PRIMERO en orden de mesa', rendida.cambio && jugadorDe(s, ANA).quebrado && (sucesosDe(s, 'quiebra')[0] as { acreedor: AsientoId | null } | undefined)?.acreedor === BRUNO);
    const botin = 20 + 2 * 75;
    comprobar('los edificios se venden al Ayuntamiento por la mitad y el botín entero va al acreedor', tituloDe(s, 21).casas === 0 && s.casasEnElConcejo === conBienes.casasEnElConcejo + 2 && cobrosDe(s, BRUNO).some((c) => c.porque === 'quiebra' && c.cuanto === botin && c.de === ANA), cobrosDe(s, BRUNO));
    comprobar('y su bolsa queda con el botín menos el interés dla hipoteca heredado, pagado en el acto', jugadorDe(s, BRUNO).mrs === DINERO_DE_SALIDA + botin - interesDelEmpeno(60), jugadorDe(s, BRUNO).mrs);
    comprobar('los títulos pasan tal cual, y el HIPOTECADO sigue hipotecado', tituloDe(s, 1).dueno === BRUNO && tituloDe(s, 3).dueno === BRUNO && tituloDe(s, 3).empenado && tituloDe(s, 21).dueno === BRUNO);
    comprobar('y el acreedor paga EN EL ACTO el interés dla hipoteca que recibe', pagosDe(s, BRUNO).some((p) => p.porque === 'interes' && p.cuanto === interesDelEmpeno(60)));
    comprobar('el quebrado queda con 0, sin Salvoconductos, y ya no recibe opciones', jugadorDe(s, ANA).mrs === 0 && jugadorDe(s, ANA).indultos.length === 0 && opcionesEn(s, ANA).length === 0);
    comprobar('y el turno pasa a otro: no se espera a quien ya no juega', s.momento === 'jugando' && vistaDe(s, ESPECTADOR).turnoDe !== ANA && s.apuro === null);
    comprobar('ni un reproche de forma tras la quiebra', reprochesDeLasMiradas(s, CUATRO, true).length === 0, reprochesDeLasMiradas(s, CUATRO, true));

    /* El acreedor que no alcanza para el interés entra ÉL en apuro con el Ayuntamiento. */
    /* Con la Calle Mayor hipotecada (interés 20) y un botín de cero, el acreedor no puede pagarlo. */
    const acreedorPelado = conJugador(conJugador(conTitulos(conTres, [[39, ANA, 0, true]]), ANA, { mrs: 0 }), BRUNO, { mrs: 0 });
    const s2 = estadoDe(mover(mesaSobre('APU-Q1B', acreedorPelado, CUATRO), ANA, { tipo: RENDIRSE, carga: {} }).mesa);
    comprobar('un acreedor sin un euro para el interés hereda todo y entra ÉL en apuro con el Ayuntamiento', jugadorDe(s2, ANA).quebrado && s2.apuro !== null && s2.apuro.quien === BRUNO && s2.apuro.deudas.some((d) => d.porque === 'interes' && d.a === null), s2.apuro);
  }

  /*
   * LA QUIEBRA CON EL AYUNTAMIENTO: la caja se pierde, los títulos vuelven SIN HIPOTECA y
   * salen a subasta uno por uno en orden de casilla, y los Salvoconductos al fondo de su
   * mazo. Es la cascada del §8.6, y aquí se mira de cerca con tres títulos.
   */
  {
    const sinPregon = base.pregon.filter((x) => x !== serieDeCarta('pregon', 10));
    const sinArca = base.arca.filter((x) => x !== serieDeCarta('arca', 5));
    const conIndultos: EstadoDelBurgo = {
      ...conJugador(base, ANA, { indultos: ['pregon', 'arca'], mrs: 300 }),
      pregon: sinPregon,
      arca: sinArca,
    };
    const conTodo = turnoDe(conTitulos(conIndultos, [[1, ANA, 0, true], [21, ANA, 3, false], [35, ANA, 0, false]]), ANA, 'por-pasar');
    const rendida = mover(mesaSobre('APU-Q2', conTodo, CUATRO), ANA, { tipo: RENDIRSE, carga: {} });
    const s = estadoDe(rendida.mesa);
    comprobar('rendirse FUERA de apuro se puede: la opción está siempre y el acreedor es el Ayuntamiento', rendida.cambio && jugadorDe(s, ANA).quebrado && (sucesosDe(s, 'quiebra')[0] as { acreedor: AsientoId | null } | undefined)?.acreedor === null);
    comprobar('nadie hereda la caja: los otros tres siguen con lo suyo', [BRUNO, CARLA, DIEGO].every((a) => jugadorDe(s, a).mrs === DINERO_DE_SALIDA));
    comprobar('los títulos vuelven al Ayuntamiento SIN HIPOTECA y sin edificios', s.titulos.filter((t) => [1, 21, 35].indexOf(t.casilla) >= 0).every((t) => t.dueno === null && !t.empenado && t.casas === 0));
    comprobar('y salen a subasta: la primera abierta y las otras dos en cola, en orden de casilla', s.paso === 'almoneda' && (s.almoneda as AlmonedaDelBurgo).casilla === 1 && s.colaDeAlmonedas.join() === '21,35', {
      almoneda: s.almoneda,
      cola: s.colaDeAlmonedas,
    });
    comprobar('la vista dice cuántas quedan en cola', vistaDe(s, ESPECTADOR).almoneda?.enCola === 2);
    comprobar('los dos Salvoconductos vuelven al FONDO de su mazo, cada uno al suyo', reprochesDeMazo(sinPregon, s.pregon, serieDeCarta('pregon', 10)).length === 0 && reprochesDeMazo(sinArca, s.arca, serieDeCarta('arca', 5)).length === 0, {
      pregon: reprochesDeMazo(sinPregon, s.pregon, serieDeCarta('pregon', 10)),
      arca: reprochesDeMazo(sinArca, s.arca, serieDeCarta('arca', 5)),
    });
    comprobar('y en la subasta que se abrió el quebrado NO está en pie', (s.almoneda as AlmonedaDelBurgo).enPie.indexOf(ANA) < 0, (s.almoneda as AlmonedaDelBurgo).enPie);
  }

  /* Con dos a la mesa, la quiebra de uno termina la partida. */
  {
    const dos = estadoDe(empezada('APU-DOS', SEIS.slice(0, 2), 5));
    const s = estadoDe(mover(mesaSobre('APU-FIN', turnoDe(dos, ANA, 'por-pasar'), SEIS.slice(0, 2)), ANA, { tipo: RENDIRSE, carga: {} }).mesa);
    comprobar('con dos a la mesa, la quiebra de uno termina la partida y gana el último en pie', s.momento === 'terminada' && s.ganadores.join() === BRUNO && (sucesosDe(s, 'fin')[0] as { porque: string } | undefined)?.porque === 'ultimo-en-pie', {
      momento: s.momento,
      ganadores: s.ganadores,
    });
    comprobar('y `seAcabo` lo dice', seAcabo(s) === true && seAcabo(dos) === false);
    comprobar('en terminada nadie recibe opciones, ni el ganador', opcionesEn(s, BRUNO).length === 0 && opcionesEn(s, ANA).length === 0);
    comprobar('y la vista de terminada no declara turno', vistaDe(s, ESPECTADOR).turnoDe === null && reprochesDeLasMiradas(s, SEIS.slice(0, 2), true).length === 0, reprochesDeLasMiradas(s, SEIS.slice(0, 2), true));
  }
}

// ---------------------------------------------------------------------------
paso('10. LOS TRATOS: por puerta, del turno y AL del turno, campos exactos, tope, caducidad y revalidación');
// ---------------------------------------------------------------------------

/** El último trato de un estado, o `null`. */
function ultimoTrato(e: EstadoDelBurgo): TratoDelBurgo | null {
  const t = e.tratos[e.tratos.length - 1];
  return t === undefined ? null : t;
}

{
  const base = estadoDe(empezada('TRA', CUATRO, 41));
  const repartido = turnoDe(conTitulos(base, [[1, ANA, 0, false], [5, ANA, 0, false], [3, BRUNO, 0, false], [21, CARLA, 0, false]]), ANA, 'por-pasar');

  const puerta = opcionesEn(repartido, ANA).find((o) => o.declaracion === true && o.tipo === PROPONER);
  comprobar('el dueño del turno recibe la PUERTA de proponer, que no se pinta como botón', puerta !== undefined && puerta.declaracion === true && puerta.id === 'proponer');
  comprobar('con los cuatro campos exactos: a quién, cuánto, qué títulos y cuántos Salvoconductos', canonico(puerta?.carga) === canonico({ a: [BRUNO, CARLA, DIEGO], mrsMaximo: DINERO_DE_SALIDA, titulos: [1, 5], indultos: 0 }), puerta?.carga);
  /*
   * REGLA 2: CUALQUIERA LE PROPONE A CUALQUIERA. Antes la puerta de quien no tenía el
   * turno sólo listaba al dueño del turno, y dos que no lo tuvieran no podían tratar
   * entre ellos; en el juego oficial sí. La puerta de cada uno lista ahora a TODOS los
   * vivos menos él.
   */
  const deOtro = opcionesEn(repartido, BRUNO).find((o) => o.declaracion === true && o.tipo === PROPONER);
  comprobar('quien NO tiene el turno recibe la puerta y puede proponer a CUALQUIERA vivo', canonico((deOtro?.carga as { a: AsientoId[] }).a) === canonico([ANA, CARLA, DIEGO]), deOtro?.carga);
  comprobar('y un tercero también, con el dueño del turno dentro de la lista', canonico((opcionesEn(repartido, CARLA).find((o) => o.declaracion === true && o.tipo === PROPONER)?.carga as { a: AsientoId[] }).a) === canonico([ANA, BRUNO, DIEGO]));
  comprobar('nadie se ofrece a sí mismo como destinatario', [ANA, BRUNO, CARLA, DIEGO].every((quien) => ((opcionesEn(repartido, quien).find((o) => o.declaracion === true && o.tipo === PROPONER)?.carga as { a: AsientoId[] }).a).indexOf(quien) < 0));
  {
    /* Y el trato ENTRE DOS QUE NO TIENEN EL TURNO se propone, se acepta y mueve la mercancía. */
    const entreDos = { a: CARLA, doy: { mrs: 0, titulos: [3], indultos: 0 }, pido: { mrs: 300, titulos: [], indultos: 0 } };
    const propuestoSinTurno = mover(mesaSobre('TRA-SIN-TURNO', repartido, CUATRO), BRUNO, { tipo: PROPONER, carga: entreDos });
    comprobar('dos que no tienen el turno pueden tratar entre ellos', propuestoSinTurno.cambio && estadoDe(propuestoSinTurno.mesa).tratos.length === 1, propuestoSinTurno.motivo);
    const cerrado = mover(propuestoSinTurno.mesa, CARLA, { tipo: ACEPTAR, carga: { trato: repartido.siguienteTrato } });
    const s = estadoDe(cerrado.mesa);
    comprobar('  y aceptarlo mueve el título y los euros sin que el del turno haga nada', cerrado.cambio && tituloDe(s, 3).dueno === CARLA && jugadorDe(s, BRUNO).mrs === DINERO_DE_SALIDA + 300 && jugadorDe(s, CARLA).mrs === DINERO_DE_SALIDA - 300, {
      dueno: tituloDe(s, 3).dueno,
      bruno: jugadorDe(s, BRUNO).mrs,
    });
    comprobar('  y el turno sigue siendo del mismo', s.turno === repartido.turno && vistaDe(s, ESPECTADOR).duenoDelTurno === ANA);
    /* LA VACUNA: con la regla vieja (uno de los dos con el turno) este trato no existía. */
    comprobar('LA VACUNA de la regla 2: la lista de destinos de quien no tiene el turno YA NO es sólo el del turno', canonico((deOtro?.carga as { a: AsientoId[] }).a) !== canonico([ANA]));
  }

  const buena = { a: BRUNO, doy: { mrs: 100, titulos: [], indultos: 0 }, pido: { mrs: 0, titulos: [3], indultos: 0 } };
  const propuesta = mover(mesaSobre('TRA-1', repartido, CUATRO), ANA, { tipo: PROPONER, carga: buena });
  comprobar('un trato bien formado pasa la puerta y queda abierto', propuesta.cambio && estadoDe(propuesta.mesa).tratos.length === 1);
  const trato = ultimoTrato(estadoDe(propuesta.mesa)) as TratoDelBurgo;
  comprobar('con id público y estable (el contador de la mesa), y el turno en el que se propuso', trato.id === repartido.siguienteTrato && estadoDe(propuesta.mesa).siguienteTrato === repartido.siguienteTrato + 1 && trato.de === ANA && trato.a === BRUNO && trato.enElTurno === repartido.turnosAbiertos, trato);
  comprobar('y su suceso `trato` dice «propuesto»', (sucesosDe(estadoDe(propuesta.mesa), 'trato')[0] as { fin: string } | undefined)?.fin === 'propuesto');

  /* Los campos EXACTOS: lo que no cabe en la puerta se queda fuera, con motivo. */
  for (const [que, carga] of [
    ['con un campo de más', { ...buena, relleno: 'x'.repeat(8192) }],
    ['con un lado de cuatro campos', { a: BRUNO, doy: { mrs: 100, titulos: [], indultos: 0, extra: 1 }, pido: { mrs: 0, titulos: [3], indultos: 0 } }],
    ['con más euros de los que tiene', { ...buena, doy: { mrs: 99999, titulos: [], indultos: 0 } }],
    ['dando un título que no es suyo', { ...buena, doy: { mrs: 0, titulos: [21], indultos: 0 } }],
    ['dando Salvoconductos que no tiene', { ...buena, doy: { mrs: 0, titulos: [1], indultos: 1 } }],
    ['a alguien que no está sentado', { ...buena, a: 'a-nadie' }],
    ['con los DOS lados vacíos', { a: BRUNO, doy: { mrs: 0, titulos: [], indultos: 0 }, pido: { mrs: 0, titulos: [], indultos: 0 } }],
    ['con una casilla que no es un título', { ...buena, doy: { mrs: 0, titulos: [], indultos: 0 }, pido: { mrs: 0, titulos: [4], indultos: 0 } }],
    ['pidiendo y dando el mismo título', { a: BRUNO, doy: { mrs: 0, titulos: [1], indultos: 0 }, pido: { mrs: 0, titulos: [1], indultos: 0 } }],
  ] as ReadonlyArray<readonly [string, unknown]>) {
    const r = mover(mesaSobre('TRA-NO', repartido, CUATRO), ANA, { tipo: PROPONER, carga });
    comprobar(`un trato ${que} no pasa: mismo estado y motivo`, !r.cambio && r.motivo !== null, r.motivo);
  }
  const unLadoVacio = mover(mesaSobre('TRA-REGALO', repartido, CUATRO), ANA, { tipo: PROPONER, carga: { a: BRUNO, doy: { mrs: 200, titulos: [], indultos: 0 }, pido: { mrs: 0, titulos: [], indultos: 0 } } });
  comprobar('pero UN lado vacío sí: un regalo es un trato', unLadoVacio.cambio && estadoDe(unLadoVacio.mesa).tratos.length === 1);

  /* El tope de tratos abiertos, que es POR PROPONENTE. */
  {
    let conTope = mesaSobre('TRA-TOPE', repartido, CUATRO);
    for (let k = 0; k < TRATOS_ABIERTOS_POR_PROPONENTE; k++) {
      const r = mover(conTope, ANA, { tipo: PROPONER, carga: { a: BRUNO, doy: { mrs: 10 + k, titulos: [], indultos: 0 }, pido: { mrs: 0, titulos: [3], indultos: 0 } } });
      comprobar(`  el trato ${k + 1} de Ana pasa`, r.cambio, r.motivo);
      conTope = r.mesa;
    }
    comprobar(`con ${TRATOS_ABIERTOS_POR_PROPONENTE} abiertos ya no se ofrece la puerta`, !opcionesEn(estadoDe(conTope), ANA).some((o) => o.declaracion === true && o.tipo === PROPONER));
    const cuarto = mover(conTope, ANA, { tipo: PROPONER, carga: { a: BRUNO, doy: { mrs: 99, titulos: [], indultos: 0 }, pido: { mrs: 0, titulos: [3], indultos: 0 } } });
    comprobar('y el cuarto se rechaza con motivo', !cuarto.cambio && cuarto.motivo !== null);
    comprobar('el tope es POR PROPONENTE: el otro sigue pudiendo proponer', opcionesEn(estadoDe(conTope), BRUNO).some((o) => o.declaracion === true && o.tipo === PROPONER));
  }

  /* Contestar: aceptar, rechazar, retirar, y quién puede cada cosa. */
  {
    const mesa = propuesta.mesa;
    const e = estadoDe(mesa);
    const idsB = idsDe(e, BRUNO);
    comprobar('al destinatario se le ofrece aceptar y rechazar, con el resumen del trato en la ayuda', idsB.includes(`aceptar:${trato.id}`) && idsB.includes(`rechazar:${trato.id}`) && (opcionPorId(e, BRUNO, `aceptar:${trato.id}`)?.ayuda.length ?? 0) > 0, idsB);
    comprobar('al proponente, retirarlo; y a un tercero, nada de este trato', idsDe(e, ANA).includes(`retirar:${trato.id}`) && !idsDe(e, CARLA).some((id) => id.indexOf(`:${trato.id}`) >= 0));
    const ajeno = mover(mesa, CARLA, { tipo: ACEPTAR, carga: { trato: trato.id } });
    comprobar('un tercero no puede aceptar un trato que no es suyo', !ajeno.cambio && ajeno.motivo !== null);

    const aceptado = mover(mesa, BRUNO, { tipo: ACEPTAR, carga: { trato: trato.id } });
    const s = estadoDe(aceptado.mesa);
    comprobar('aceptar mueve las dos partes de golpe: 100 € por el Corral', aceptado.cambio && tituloDe(s, 3).dueno === ANA && jugadorDe(s, ANA).mrs === DINERO_DE_SALIDA - 100 && jugadorDe(s, BRUNO).mrs === DINERO_DE_SALIDA + 100);
    comprobar('con los sucesos `trato` aceptado y `cambia-de-mano`', (sucesosDe(s, 'trato')[0] as { fin: string } | undefined)?.fin === 'aceptado' && sucesosDe(s, 'cambia-de-mano').length === 1);
    comprobar('y el trato desaparece de la lista', s.tratos.length === 0);
    comprobar('y quien reunió el barrio pardo entero ya puede alzar en los dos solares', idsDe(s, ANA).includes('alzar:1') && idsDe(s, ANA).includes('alzar:3'));

    const rechazado = mover(mesa, BRUNO, { tipo: RECHAZAR, carga: { trato: trato.id } });
    comprobar('rechazar lo borra sin mover nada', rechazado.cambio && estadoDe(rechazado.mesa).tratos.length === 0 && tituloDe(estadoDe(rechazado.mesa), 3).dueno === BRUNO && (sucesosDe(estadoDe(rechazado.mesa), 'trato')[0] as { fin: string } | undefined)?.fin === 'rechazado');
    const retirado = mover(mesa, ANA, { tipo: RETIRAR, carga: { trato: trato.id } });
    comprobar('retirar, igual', retirado.cambio && estadoDe(retirado.mesa).tratos.length === 0 && (sucesosDe(estadoDe(retirado.mesa), 'trato')[0] as { fin: string } | undefined)?.fin === 'retirado');
    comprobar('el destinatario no lo retira, y el proponente no lo acepta', !mover(mesa, BRUNO, { tipo: RETIRAR, carga: { trato: trato.id } }).cambio && !mover(mesa, ANA, { tipo: ACEPTAR, carga: { trato: trato.id } }).cambio);
    const inventado = mover(mesa, BRUNO, { tipo: ACEPTAR, carga: { trato: 999 } });
    comprobar('y un id de trato inventado se rechaza con motivo', !inventado.cambio && inventado.motivo !== null);
  }

  /* ACEPTAR REVALIDA LAS DOS PARTES con el estado de AHORA, y el motivo es ciego. */
  {
    const mesa = propuesta.mesa;
    const vendidoEnMedio = conTitulo(estadoDe(mesa), 3, { dueno: CARLA });
    const caido = mover(mesaSobre('TRA-REV', vendidoEnMedio, CUATRO), BRUNO, { tipo: ACEPTAR, carga: { trato: trato.id } });
    comprobar('si el título ya no es de quien lo prometía, aceptar se rechaza CON MOTIVO y nada se mueve', !caido.cambio && caido.motivo !== null && caido.motivo.indexOf('en pie') >= 0, caido.motivo);
    comprobar('y el motivo NO dice de quién es ahora: no enseña lo que la vista de quien mueve no daba', reprochesDeTexto(String(caido.motivo), vendidoEnMedio).length === 0 && String(caido.motivo).indexOf(CARLA) < 0, caido.motivo);
    const sinDinero = conJugador(estadoDe(mesa), ANA, { mrs: 10 });
    const caido2 = mover(mesaSobre('TRA-REV2', sinDinero, CUATRO), BRUNO, { tipo: ACEPTAR, carga: { trato: trato.id } });
    comprobar('y si el proponente ya no tiene los euros que prometía, también', !caido2.cambio && caido2.motivo !== null);
    const quebrado = conJugador(estadoDe(mesa), ANA, { quebrado: true, mrs: 0 });
    const caido3 = mover(mesaSobre('TRA-REV3', quebrado, CUATRO), BRUNO, { tipo: ACEPTAR, carga: { trato: trato.id } });
    comprobar('y si el proponente quebró entre medias, también', !caido3.cambio && caido3.motivo !== null);
  }

  /* UN TRATO QUE CAE POR OTRO: dos sobre el mismo título; al aceptar uno, el otro caduca. */
  {
    let mesa = mesaSobre('TRA-DOS', repartido, CUATRO);
    mesa = mover(mesa, ANA, { tipo: PROPONER, carga: { a: BRUNO, doy: { mrs: 100, titulos: [1], indultos: 0 }, pido: { mrs: 0, titulos: [3], indultos: 0 } } }).mesa;
    mesa = mover(mesa, CARLA, { tipo: PROPONER, carga: { a: ANA, doy: { mrs: 200, titulos: [], indultos: 0 }, pido: { mrs: 0, titulos: [1], indultos: 0 } } }).mesa;
    const e = estadoDe(mesa);
    comprobar('dos tratos abiertos que tocan el mismo título', e.tratos.length === 2, e.tratos.length);
    const primero = e.tratos[0] as TratoDelBurgo;
    const segundo = e.tratos[1] as TratoDelBurgo;
    const s = estadoDe(mover(mesa, BRUNO, { tipo: ACEPTAR, carga: { trato: primero.id } }).mesa);
    comprobar('al aceptar el primero, el segundo CADUCA: ya no dice la verdad', s.tratos.length === 0 && (sucesosDe(s, 'trato') as Array<{ id: number; fin: string }>).some((x) => x.id === segundo.id && x.fin === 'caducado'), s.tratos);
    comprobar('y los títulos quedan donde dijo el trato aceptado', tituloDe(s, 1).dueno === BRUNO && tituloDe(s, 3).dueno === ANA);
  }

  /* CADUCAN AL RELEVAR. */
  {
    const mesa = propuesta.mesa;
    const relevada = mover(mesa, ANA, { tipo: PASAR, carga: {} });
    const s = estadoDe(relevada.mesa);
    comprobar('al pasar el turno, los tratos abiertos caducan', relevada.cambio && s.tratos.length === 0 && (sucesosDe(s, 'trato') as Array<{ fin: string }>).some((x) => x.fin === 'caducado'));
    comprobar('y el turno pasa al siguiente, con `turnoDe` cambiado y los dobles a cero', s.turno !== estadoDe(mesa).turno && s.turnosAbiertos === estadoDe(mesa).turnosAbiertos + 1 && s.dobles === 0 && s.tiradasDelTurno === 0 && vistaDe(s, ESPECTADOR).turnoDe !== ANA);
    const tarde = mover(relevada.mesa, BRUNO, { tipo: ACEPTAR, carga: { trato: trato.id } });
    comprobar('y aceptar un trato caducado se rechaza con motivo', !tarde.cambio && tarde.motivo !== null);
  }

  /* En subasta no se propone. */
  {
    const enAlmoneda: EstadoDelBurgo = {
      ...repartido,
      paso: 'almoneda',
      almoneda: { casilla: 39, edificio: false, puja: 0, quienPuja: null, pujaDe: BRUNO, enPie: [BRUNO, CARLA, DIEGO, ANA], abiertaPor: ANA },
    };
    comprobar('con una subasta abierta nadie recibe la puerta de proponer', [ANA, BRUNO, CARLA, DIEGO].every((a) => !opcionesEn(enAlmoneda, a).some((o) => o.tipo === PROPONER)));
    const r = mover(mesaSobre('TRA-ALM', enAlmoneda, CUATRO), ANA, { tipo: PROPONER, carga: buena });
    comprobar('y mandarlo se rechaza con motivo', !r.cambio && r.motivo !== null);
  }
}

// ---------------------------------------------------------------------------
paso('11. EL TIC, caso a caso, y las mesas donde NADIE mueve, que tienen que acabar solas');
// ---------------------------------------------------------------------------

/**
 * MESA SIN NADIE: sólo tics, hasta que termine o hasta el tope. Devuelve cuántos
 * tics costó, si terminó, y cuántos de esos tics no cambiaron nada (que tienen que
 * ser cero: en `jugando` el tic siempre hace algo).
 */
function mesaSinNadie(id: string, asientos: readonly AsientoId[], topeDeVueltas: number, topeDeTics: number): { tics: number; termino: boolean; quietos: number; ms: number } {
  let mesa = empezada(id, asientos, 20260909, topeDeVueltas);
  let tics = 0;
  let quietos = 0;
  const desde = performance.now();
  while (tics < topeDeTics && estadoDe(mesa).momento === 'jugando') {
    const antes = mesa;
    mesa = tic(mesa);
    tics++;
    if (mesa.estado === antes.estado) quietos++;
  }
  return { tics, termino: estadoDe(mesa).momento === 'terminada', quietos, ms: performance.now() - desde };
}

/** Una partida terminada de verdad, por la puerta del reductor: dos a la mesa y uno se rinde. */
function unaPartidaTerminada(): EstadoDelBurgo {
  const dos = SEIS.slice(0, 2);
  const e = estadoDe(empezada('FIN-DE-VERDAD', dos, 5));
  const s = estadoDe(mover(mesaSobre('FIN-DE-VERDAD-2', turnoDe(e, ANA, 'por-pasar'), dos), ANA, { tipo: RENDIRSE, carga: {} }).mesa);
  if (s.momento !== 'terminada') throw new Error('la partida de dos no terminó al rendirse uno');
  return s;
}

{
  const base = estadoDe(empezada('TIC', CUATRO, 41));
  const turnoDeAna = turnoDe(base, ANA);

  /* Los dos casos de identidad: reuniendo y terminada. */
  {
    const reuniendo = mesaSobre('TIC-R', undefined, CUATRO);
    const conEstado = mesaSobre('TIC-R2', partidaNueva(), CUATRO);
    const trasTic = tic(conEstado);
    /*
     * SE MIRA EL ESTADO POR IDENTIDAD Y NO LA REVISIÓN, y no es un atajo: `avanzarElReloj`
     * del árbitro sube `rev` siempre —es quien lleva el reloj—, y quien descarta el tic
     * que no cambió nada es `ponerAlDiaElPlazo` de `mesas.ts`, comparando `estado` POR
     * IDENTIDAD. Lo que el juego tiene que garantizar, y lo único, es el mismo objeto.
     */
    comprobar('un tic en `reuniendo` devuelve EL MISMO objeto de estado, que es lo que la mesa descarta', trasTic.estado === conEstado.estado, { rev: trasTic.rev });
    comprobar('el primer tic sobre una mesa recién abierta SÍ construye la partida (rev 1: conocido, no es fallo)', tic(reuniendo).rev === 1);
    const terminada = unaPartidaTerminada();
    const dos = SEIS.slice(0, 2);
    let seguidos = mesaSobre('TIC-T', terminada, dos);
    for (let k = 0; k < 8; k++) seguidos = tic(seguidos);
    comprobar('y ocho tics en `terminada` —el tope de la mesa por lectura— devuelven EL MISMO objeto', estadoDe(seguidos) === terminada, { rev: seguidos.rev });
  }

  /* `por-tirar`: el tic tira por el ausente, gastando el mismo azar que gastaría él. */
  {
    const conAzar: EstadoDelBurgo = { ...turnoDeAna, azar: azarQueSaca([[2, 6]]) };
    const porTic = estadoDe(tic(mesaSobre('TIC-1', conAzar, CUATRO)));
    const porLaMano = estadoDe(tira(mesaSobre('TIC-1B', conAzar, CUATRO), ANA));
    comprobar('en `por-tirar` el tic TIRA por el ausente, y sale exactamente lo mismo que si tirara él', canonico(porTic) === canonico(porLaMano), { tic: porTic.tirada, mano: porLaMano.tirada });
    comprobar('y la tirada es la del azar sembrado, con el par entero en el estado', porTic.tirada?.join() === '2,6' && jugadorDe(porTic, ANA).casilla === 8);
  }

  /* `por-pasar`: con dobles vuelve a tirar; sin dobles, releva. */
  {
    const conDobles: EstadoDelBurgo = { ...turnoDe(base, ANA, 'por-pasar'), dobles: 1, azar: azarQueSaca([[2, 6]]) };
    const s = estadoDe(tic(mesaSobre('TIC-2', conDobles, CUATRO)));
    comprobar('en `por-pasar` CON dobles el tic vuelve a tirar por él', s.tirada?.join() === '2,6' && s.turno === conDobles.turno);
    const sinDobles = turnoDe(base, ANA, 'por-pasar');
    const s2 = estadoDe(tic(mesaSobre('TIC-3', sinDobles, CUATRO)));
    comprobar('y SIN dobles pasa el turno al siguiente', s2.turno !== sinDobles.turno && s2.turnosAbiertos === sinDobles.turnosAbiertos + 1 && (sucesosDe(s2, 'turno')[0] as { de: AsientoId } | undefined)?.de === BRUNO);
  }

  /* `comprar`: el tic manda el título a subasta, que es lo que no bloquea la mesa. */
  {
    const { s: enCompra } = alCaerEn('TIC-4', base, ANA, 39);
    const s = estadoDe(tic(mesaSobre('TIC-4B', enCompra, CUATRO)));
    comprobar('en `comprar` el tic saca el título a subasta: no compra por nadie', s.paso === 'almoneda' && (s.almoneda as AlmonedaDelBurgo).casilla === 39 && tituloDe(s, 39).dueno === null);
    comprobar('y `turnoDe` cambia al primero que puja: el plazo se reprograma', vistaDe(s, ESPECTADOR).turnoDe !== vistaDe(enCompra, ESPECTADOR).turnoDe);
  }

  /* `almoneda`: el tic pasa por quien tiene el relevo en la subasta, uno por tic. */
  {
    const abierta: EstadoDelBurgo = {
      ...turnoDe(base, ANA, 'por-pasar'),
      paso: 'almoneda',
      almoneda: { casilla: 39, edificio: false, puja: 0, quienPuja: null, pujaDe: BRUNO, enPie: [BRUNO, CARLA, DIEGO, ANA], abiertaPor: ANA },
    };
    const s1 = estadoDe(tic(mesaSobre('TIC-5', abierta, CUATRO)));
    comprobar('en subasta el tic PASA por el que tiene el relevo, y sólo por él', (s1.almoneda as AlmonedaDelBurgo).enPie.join() === [CARLA, DIEGO, ANA].join() && (s1.almoneda as AlmonedaDelBurgo).pujaDe === CARLA);
    comprobar('y `turnoDe` cambia en cada tic que resuelve algo', vistaDe(s1, ESPECTADOR).turnoDe === CARLA);
    let mesa = mesaSobre('TIC-5B', s1, CUATRO);
    for (let k = 0; k < 3; k++) mesa = tic(mesa);
    const s2 = estadoDe(mesa);
    comprobar('con cuatro tics —menos que los ocho de una lectura— la subasta entera se cierra sin ganador', s2.almoneda === null && tituloDe(s2, 39).dueno === null && s2.paso === 'por-pasar', { paso: s2.paso });
  }

  /* `apuro`: UN tic liquida al ausente entero. */
  {
    const enApuro = conTitulos(conJugador(base, ANA, { mrs: 50 }), [[5, ANA, 0, false], [15, ANA, 0, false]]);
    const s = alCaerEnElImpuesto('TIC-6', enApuro, ANA);
    comprobar('hay un apuro abierto de 200 con dos puertas que hipotecar', s.paso === 'apuro' && s.apuro !== null);
    const s2 = estadoDe(tic(mesaSobre('TIC-6B', s, CUATRO)));
    comprobar('UN SOLO TIC liquida al ausente: hipoteca lo que hace falta y salda', s2.apuro === null && tituloDe(s2, 5).empenado && jugadorDe(s2, ANA).mrs === 50 + 2 * 100 - EL_DIEZMO, { mrs: jugadorDe(s2, ANA).mrs, apuro: s2.apuro });
    const conDeudaEnorme = conTitulos(conJugador(base, ANA, { mrs: 0 }), [[1, ANA, 0, false], [39, BRUNO, POSADA, false], [37, BRUNO, POSADA, false]]);
    const { s: s3 } = alCaerEn('TIC-7', conDeudaEnorme, ANA, 39, [[1, 1]]);
    comprobar('y con una renta de 2.000 y nada que vender, el apuro queda abierto', s3.paso === 'apuro' && s3.apuro !== null, s3.paso);
    const s4 = estadoDe(tic(mesaSobre('TIC-7B', s3, CUATRO)));
    comprobar('el mismo tic lo hipoteca todo y, como no llega, lo quiebra con su acreedor', jugadorDe(s4, ANA).quebrado && (sucesosDe(s4, 'quiebra')[0] as { acreedor: AsientoId | null } | undefined)?.acreedor === BRUNO, sucesosDe(s4, 'quiebra'));
  }

  /* El tic NO contesta tratos: los caduca al relevar, que es otra cosa. */
  {
    const repartido = turnoDe(conTitulos(base, [[3, BRUNO, 0, false]]), ANA, 'por-pasar');
    const conTrato = mover(mesaSobre('TIC-8', repartido, CUATRO), ANA, { tipo: PROPONER, carga: { a: BRUNO, doy: { mrs: 100, titulos: [], indultos: 0 }, pido: { mrs: 0, titulos: [3], indultos: 0 } } });
    const s = estadoDe(tic(conTrato.mesa));
    comprobar('el tic NO acepta ni rechaza un trato por nadie: pasa el turno y el trato caduca', tituloDe(s, 3).dueno === BRUNO && jugadorDe(s, ANA).mrs === DINERO_DE_SALIDA && s.tratos.length === 0 && (sucesosDe(s, 'trato') as Array<{ fin: string }>).every((x) => x.fin === 'caducado'));
  }

  /*
   * ═══ LAS MESAS DONDE NADIE MUEVE, Y POR QUÉ LA CIFRA NO ES «2.500» ═══
   *
   * El diseño (§8.1 F7) escribió «una mesa con `plazoSegundos: 1` y todos ausentes
   * termina en ≤ 2.500 tics». MEDIDO, con seis sentados y tope de vueltas 30 son
   * unos ocho mil: sin nadie que compre, cada título pisado sale a subasta y los
   * seis pasan uno a uno —hasta nueve tics para resolver un solo turno—, y con tope
   * 30 hay que dar treinta vueltas al anillo con los seis. La cifra del diseño no
   * era falsa: era de otra mesa.
   *
   * Así que se afirman las cifras de tres mesas CONCRETAS —cada una con sus
   * asientos, su tope de vueltas y su tope de tics escrito— y se IMPRIMEN. El
   * margen sobre lo medido es de un tercio: al ras, cualquier cambio de reglas da
   * un rojo que no dice nada; diez veces mayor no afirma nada. Lo que de verdad se
   * afirma es que TERMINA: una mesa que no termina se queda para siempre esperando
   * a alguien que no está.
   */
  {
    const medidas: Array<{ que: string; tope: number; r: ReturnType<typeof mesaSinNadie> }> = [];
    for (const [cuantos, vueltas, tope] of MESAS_SIN_NADIE) {
      const r = mesaSinNadie(`SIN-${cuantos}-${vueltas}`, SEIS.slice(0, cuantos), vueltas, tope);
      medidas.push({ que: `${cuantos} sentados, tope ${vueltas}`, tope, r });
      comprobar(`una mesa de ${cuantos} con tope de ${vueltas} vueltas y NADIE moviendo TERMINA sola`, r.termino, r);
      comprobar(`  y le cuesta ${r.tics} tics, por debajo del tope escrito de ${tope}`, r.tics < tope, r.tics);
      comprobar('  y ningún tic suyo devolvió el mismo estado: en `jugando` el tic siempre hace algo', r.quietos === 0, r.quietos);
    }
    console.log('  mesas donde nadie mueve:');
    for (const m of medidas) {
      console.log(`    ${m.que.padEnd(22)} · ${String(m.r.tics).padStart(5)} tics (tope ${m.tope}) · ${m.r.ms.toFixed(0).padStart(5)} ms · ${m.r.termino ? 'termina' : 'NO TERMINA'}`);
    }
  }
}

// ---------------------------------------------------------------------------
paso('12. «SÓLO SI»: cada tipo fuera de su momento devuelve el MISMO objeto con motivo, y ningún motivo filtra');
// ---------------------------------------------------------------------------

/** Los dieciocho tipos del Burgo, cada uno con una carga bien formada. */
const TODOS_LOS_TIPOS: ReadonlyArray<readonly [string, unknown]> = [
  [EMPEZAR, { topeDeVueltas: 0 }],
  [TIRAR, {}],
  [PAGAR_FIANZA, {}],
  [USAR_INDULTO, {}],
  [COMPRAR, { casilla: 39 }],
  [A_ALMONEDA, { casilla: 39 }],
  [PUJAR, { casilla: 39, cuanto: PUJA_MINIMA }],
  [PASAR_PUJA, { casilla: 39 }],
  [ALZAR, { casilla: 1 }],
  [VENDER, { casilla: 1 }],
  [EMPENAR, { casilla: 1 }],
  [DESEMPENAR, { casilla: 1 }],
  [PROPONER, { a: BRUNO, doy: { mrs: 1, titulos: [], indultos: 0 }, pido: { mrs: 0, titulos: [], indultos: 0 } }],
  [ACEPTAR, { trato: 0 }],
  [RECHAZAR, { trato: 0 }],
  [RETIRAR, { trato: 0 }],
  [PASAR, {}],
  [RENDIRSE, {}],
];

{
  const base = estadoDe(empezada('SOLO-SI', CUATRO, 41));
  const motivos: string[] = [];

  /*
   * EN `terminada` NO SE PUEDE NADA. Es el caso más limpio del «sólo si»: la lista
   * de opciones está vacía para todos, así que los dieciocho tipos tienen que
   * devolver EL MISMO objeto —no una copia igual— y un motivo.
   */
  {
    const terminada = unaPartidaTerminada();
    const dos = SEIS.slice(0, 2);
    for (const [tipo, carga] of TODOS_LOS_TIPOS) {
      const r = aplicarConMotivo(avanzarElBurgo, terminada, { tipo, carga }, { quien: BRUNO, azar: 1, tic: 0, asientos: dos });
      comprobar(`en terminada, ${tipo} devuelve EL MISMO objeto con motivo`, r.estado === terminada && r.motivo !== null, { motivo: r.motivo, mismo: r.estado === terminada });
      if (r.motivo !== null) motivos.push(r.motivo);
    }
  }

  /*
   * FUERA DE SU MOMENTO, con la partida en marcha. `RENDIRSE` va aparte: se ofrece
   * SIEMPRE a quien sigue jugando (es la salida de emergencia del reglamento), así
   * que su «fuera de su momento» es haber quebrado ya, y se prueba abajo.
   */
  {
    const enPorTirar = turnoDe(base, ANA);
    for (const [tipo, carga] of TODOS_LOS_TIPOS) {
      if (tipo === TIRAR || tipo === PROPONER || tipo === RENDIRSE) continue;
      const r = mover(mesaSobre('SS-1', enPorTirar, CUATRO), ANA, { tipo, carga });
      comprobar(`en \`por-tirar\` y sin nada suyo, ${tipo} devuelve el mismo estado con motivo`, !r.cambio && r.motivo !== null, r.motivo);
      if (r.motivo !== null) motivos.push(r.motivo);
    }
    for (const tipo of [TIRAR, PASAR, COMPRAR, A_ALMONEDA]) {
      const r = mover(mesaSobre('SS-2', enPorTirar, CUATRO), CARLA, { tipo, carga: { casilla: 39 } });
      comprobar(`a quien no le toca, ${tipo} devuelve el mismo estado con motivo`, !r.cambio && r.motivo !== null, r.motivo);
      if (r.motivo !== null) motivos.push(r.motivo);
    }
    const quebrado = conJugador(enPorTirar, CARLA, { quebrado: true, mrs: 0 });
    for (const [tipo, carga] of TODOS_LOS_TIPOS) {
      const r = mover(mesaSobre('SS-3', quebrado, CUATRO), CARLA, { tipo, carga });
      comprobar(`quien ya quebró no puede ${tipo}`, !r.cambio && r.motivo !== null, r.motivo);
      if (r.motivo !== null) motivos.push(r.motivo);
    }
    const deFuera = mover(mesaSobre('SS-4', enPorTirar, CUATRO), 'a-nadie', { tipo: TIRAR, carga: {} });
    comprobar('y quien no está sentado tampoco, con su motivo propio', !deFuera.cambio && deFuera.motivo !== null, deFuera.motivo);
    if (deFuera.motivo !== null) motivos.push(deFuera.motivo);
  }

  /* Una carga que no es un objeto no pasa por ninguna puerta. */
  for (const carga of [null, 42, 'x', ['a'], undefined] as unknown[]) {
    const r = mover(mesaSobre('SS-5', turnoDe(base, ANA), CUATRO), ANA, { tipo: ALZAR, carga });
    comprobar(`una carga de tipo ${carga === null ? 'null' : typeof carga} en ALZAR se rechaza con motivo`, !r.cambio && r.motivo !== null);
    if (r.motivo !== null) motivos.push(r.motivo);
  }

  /*
   * ═══ NINGÚN MOTIVO PUEDE FILTRAR LO QUE LA PROYECCIÓN NO ENSEÑA ═══
   *
   * El motivo viaja por un canal aparte —no entra en el diario, no lo guarda nadie,
   * y sólo llega a quien movió—, y por eso mismo no lo vigila NINGÚN comprobador
   * genérico: la memoria de esta casa lo tiene apuntado como la fuga por la puerta
   * de atrás. Aquí cada motivo recogido pasa por la misma criba que las vistas, y
   * la criba se ve caer con uno envenenado.
   */
  comprobar(`se han recogido ${motivos.length} motivos de rechazo`, motivos.length >= 40, motivos.length);
  comprobar('ninguno lleva dentro una serie de carta, un secreto ni una marca', motivos.every((m) => reprochesDeTexto(m, base).length === 0), motivos.filter((m) => reprochesDeTexto(m, base).length > 0));
  comprobar('ninguno es una cadena vacía: un motivo mudo no explica nada', motivos.every((m) => m.trim().length > 0));
  comprobar('LA VACUNA: un motivo envenenado con «p07» se ve caer', reprochesDeTexto('No puedes: la siguiente de Suerte es la "p07".', base).length > 0);
  comprobar('y otro con una marca registrada dentro, también', reprochesDeTexto(`Eso no se puede: esto no es ${(MARCAS_VETADAS[0] as { nombre: string }).nombre}.`, base).length > 0);
}

// ---------------------------------------------------------------------------
paso('13. PARTIDAS ENTERAS de 2, 3 y 6 jugadas por el robot, vigiladas en CADA revisión');
// ---------------------------------------------------------------------------

/** Lo contado de una partida entera: por clase de suceso, y lo que costó. */
interface PartidaVigilada {
  estado: EstadoDelBurgo;
  mesa: Mesa;
  revisiones: number;
  movimientos: number;
  tics: number;
  cuenta: Record<string, number>;
  rentas: number;
  almonedasGanadas: number;
  tratosAceptados: number;
  alzas: number;
  corte: string | null;
}

/**
 * JUEGA UNA PARTIDA ENTERA POR LA PUERTA DEL ÁRBITRO, con el robot decidiendo sobre
 * `opciones()`, tics intercalados, y `revisar` llamado en CADA revisión.
 *
 * El orden de los asientos es el del robot y por la misma razón medida allí: los que
 * tienen algo que contestar SIN turno van PRIMERO y el del turno el ÚLTIMO. Al revés,
 * el proponente pasaba el turno antes de que nadie pudiera aceptar y los tratos
 * caducaban todos sin haber sido contestados nunca (339 propuestas, cero aceptadas).
 */
function partidaVigilada(
  id: string,
  cuantos: number,
  semilla: number,
  topeDeVueltas: number,
  cadaCuantosUnTic: number,
  topeDePasos: number,
  robot: (vista: unknown, quien: AsientoId, azar: Azar, conTrato: boolean) => { azar: Azar; decision: DecisionDelRobot | null },
  revisar: (e: EstadoDelBurgo, asientos: readonly AsientoId[]) => void,
): PartidaVigilada {
  const asientos = asientosDelRobot(cuantos);
  let mesa = mesaSobre(id, undefined, asientos, semilla);
  let azar: Azar = sembrar(semilla);
  const cuenta: Record<string, number> = {};
  let rentas = 0;
  let almonedasGanadas = 0;
  let tratosAceptados = 0;
  let alzas = 0;
  let revisiones = 0;
  let movimientos = 0;
  let tics = 0;
  let corte: string | null = null;
  let turnoConTrato = -1;
  const propusieron: AsientoId[] = [];

  const anotar = (e: EstadoDelBurgo): void => {
    revisiones++;
    for (const s of e.sucesos) {
      cuenta[s.que] = (cuenta[s.que] ?? 0) + 1;
      if (s.que === 'paga' && s.porque === 'renta') rentas++;
      if (s.que === 'almoneda-cerrada' && s.ganador !== null) almonedasGanadas++;
      if (s.que === 'trato' && s.fin === 'aceptado') tratosAceptados++;
      if (s.que === 'alza') alzas++;
    }
    revisar(e, asientos);
  };

  mesa = mover(mesa, asientos[0] as AsientoId, { tipo: EMPEZAR, carga: { topeDeVueltas } }).mesa;
  movimientos++;
  anotar(estadoDe(mesa));

  for (let paso = 0; paso < topeDePasos; paso++) {
    const e = estadoDe(mesa);
    if (e.momento === 'terminada') break;
    if (cadaCuantosUnTic > 0 && (paso + 1) % cadaCuantosUnTic === 0) {
      const antes = mesa;
      mesa = tic(mesa);
      tics++;
      if (mesa.estado !== antes.estado) anotar(estadoDe(mesa));
      continue;
    }
    if (e.turnosAbiertos !== turnoConTrato) {
      turnoConTrato = e.turnosAbiertos;
      propusieron.length = 0;
    }
    const turnoAhora = vistaDe(e, ESPECTADOR).turnoDe;
    const orden: AsientoId[] = [];
    for (const a of asientos) if (a !== turnoAhora) orden.push(a);
    if (turnoAhora !== null) orden.push(turnoAhora);
    let hecho = false;
    for (const quien of orden) {
      const r = robot(vistaDe(e, quien), quien, azar, propusieron.indexOf(quien) < 0);
      azar = r.azar;
      if (r.decision === null) continue;
      if (r.decision.familia === 'proponer') propusieron.push(quien);
      const salida = mover(mesa, quien, r.decision.movimiento);
      if (salida.cambio) {
        mesa = salida.mesa;
        movimientos++;
        anotar(estadoDe(mesa));
      }
      hecho = true;
      break;
    }
    if (!hecho) {
      corte = `nadie tiene nada que hacer en «${e.momento}/${e.paso}» (turnoDe ${String(turnoAhora)})`;
      break;
    }
  }
  const fin = estadoDe(mesa);
  if (corte === null && fin.momento !== 'terminada') corte = `se agotó el tope de ${topeDePasos} pasos`;
  return { estado: fin, mesa, revisiones, movimientos, tics, cuenta, rentas, almonedasGanadas, tratosAceptados, alzas, corte };
}

/** Lo que una partida jugada DE VERDAD tiene que traer (§8.1, F4), contado desde los `sucesos`. */
const MINIMOS_DE_UNA_PARTIDA = {
  quiebras: 1,
  rentas: 3,
  almonedasGanadas: 1,
  mazmorra: 2,
  alzas: 1,
  tratosAceptados: 1,
} as const;

/** Los reproches de una partida que dice haberse jugado. Es la función con vacuna. */
function reprochesDePartida(p: PartidaVigilada): string[] {
  const r: string[] = [];
  if (p.estado.momento !== 'terminada') r.push(`no terminó: ${String(p.corte)}`);
  if (p.estado.ganadores.length === 0) r.push('terminó sin ganador');
  if ((p.cuenta.quiebra ?? 0) < MINIMOS_DE_UNA_PARTIDA.quiebras) r.push(`sólo ${p.cuenta.quiebra ?? 0} quiebras`);
  if (p.rentas < MINIMOS_DE_UNA_PARTIDA.rentas) r.push(`sólo ${p.rentas} rentas cobradas`);
  if (p.almonedasGanadas < MINIMOS_DE_UNA_PARTIDA.almonedasGanadas) r.push(`sólo ${p.almonedasGanadas} subastas ganadas`);
  if ((p.cuenta['a-la-mazmorra'] ?? 0) < MINIMOS_DE_UNA_PARTIDA.mazmorra) r.push(`sólo ${p.cuenta['a-la-mazmorra'] ?? 0} entradas en la Comisaría`);
  if (p.alzas < MINIMOS_DE_UNA_PARTIDA.alzas) r.push(`ninguna casa alzada sobre un barrio entero (${p.alzas})`);
  if (p.tratosAceptados < MINIMOS_DE_UNA_PARTIDA.tratosAceptados) r.push(`sólo ${p.tratosAceptados} tratos aceptados`);
  return r;
}

/** Las tres partidas: `[asientos, semilla, tope de vueltas, un tic cada, tope de pasos]`. */
const PARTIDAS_DE_VERDAD: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [2, 20260901, 40, 7, 4000],
  [3, 20260902, 40, 11, 4000],
  /*
   * La semilla de la de seis está ELEGIDA: con seis comprándolo todo, la mayoría de
   * las partidas no llegan a una subasta GANADA —el que la abre suele poder pagar el
   * título— y el mínimo de §8.1 F4 exige una. La partida sigue siendo la que el robot
   * juega, no una guiada.
   *
   * Era la 13 y ahora es la 19: con las cuatro reglas oficiales nuevas el robot juega
   * OTRA partida —el Impuesto cuesta un gesto más y la décima se paga cuando sale más
   * barata— y con la 13 sólo un jugador pasaba por la Comisaría de las dos que exige
   * el mínimo. Se probaron veinte semillas con la política nueva: diecisiete cumplen
   * los seis mínimos, y se escogió la 19 (5 quiebras, 59 rentas, 5 subastas ganadas, 5
   * entradas en la Comisaría, 95 alzas y 6 tratos aceptados en 563 movimientos).
   */
  [6, 19, 40, 13, 6000],
];

{
  const resumen: string[] = [];
  let tercerosDoblesEntreLasTres = 0;
  for (const [cuantos, semilla, vueltas, cadaCuantos, topePasos] of PARTIDAS_DE_VERDAD) {
    let revisadas = 0;
    let conContraccion = 0;
    let reprochesEnVuelo: string[] = [];
    let anterior: EstadoDelBurgo | null = null;
    let reprochesDeDobles: string[] = [];
    let doblesQueRepiten = 0;
    let tercerosDobles = 0;
    let vistasConDobles = 0;
    const desde = performance.now();
    const p = partidaVigilada(
      `VIVA-${cuantos}`,
      cuantos,
      semilla,
      vueltas,
      cadaCuantos,
      topePasos,
      loQueHaceElRobot,
      (e, asientos) => {
        revisadas++;
        /*
         * LA REGLA DE LOS DOBLES, entre esta revisión y la anterior, y lo que el del turno lee de ella.
         * Cuenta cuántas tiradas la ejercieron, para que no se lea como vigilada una partida sin dobles.
         */
        if (anterior !== null) {
          const tira = e.sucesos.find((s) => s.que === 'tira');
          if (tira !== undefined && tira.que === 'tira' && tira.dobles && !tira.enLaMazmorra) {
            if (anterior.dobles + 1 >= DOBLES_QUE_ENCIERRAN) tercerosDobles++;
            else doblesQueRepiten++;
          }
          if (reprochesDeDobles.length === 0) {
            const regla = reprochesDeLaReglaDeLosDobles(anterior, e);
            if (regla.length > 0) reprochesDeDobles = [`en la jugada ${e.jugada}`, ...regla];
          }
        }
        anterior = e;
        const delTurno = e.momento === 'jugando' ? e.jugadores[e.turno] : undefined;
        if (delTurno !== undefined && reprochesDeDobles.length === 0) {
          if (e.dobles > 0 && e.paso === 'por-tirar' && e.apuro === null && e.almoneda === null && !e.impuestoSinPagar) vistasConDobles++;
          const dichos = reprochesDeLosDoblesALaVista(e, delTurno.asiento);
          if (dichos.length > 0) reprochesDeDobles = [`en la jugada ${e.jugada}, a la vista de ${delTurno.asiento}`, ...dichos];
        }
        /* Que la crónica diga «al Ayuntamiento» en alguna revisión es lo que prueba que la regla de arriba miró la frase que fallaba. */
        if ((vistaDeAsiento(BURGO, e, ESPECTADOR, undefined) as VistaDelBurgo).pregon.indexOf('al Ayuntamiento') >= 0) conContraccion++;
        if (reprochesEnVuelo.length > 0) return;
        /*
         * `conNombres: false`: la mesa del robot no tiene registro de nombres, así que
         * `comoSeLlama` degrada al identificador A PROPÓSITO (está escrito en su cabecera)
         * y exigir aquí que ningún texto enseñe el id sería exigir lo contrario del
         * contrato. Los nombres se vigilan en los bloques montados a mano, que sí los pasan.
         */
        const forma = reprochesDeLasMiradas(e, asientos, false);
        const secretos = reprochesDeSecretos(e, asientos);
        if (forma.length > 0 || secretos.length > 0) reprochesEnVuelo = [`en la jugada ${e.jugada}`, ...forma, ...secretos];
      },
    );
    const ms = performance.now() - desde;
    const reproches = reprochesDePartida(p);
    comprobar(`la partida de ${cuantos} se juega DE VERDAD hasta el final y trae de todo`, reproches.length === 0, { reproches, cuenta: p.cuenta, corte: p.corte });
    comprobar(`  y en sus ${revisadas} revisiones no hay ni un secreto ni un reproche de forma en las ${cuantos + 1} miradas`, reprochesEnVuelo.length === 0, reprochesEnVuelo.slice(0, 6));
    comprobar(`  y la crónica contrae «al Ayuntamiento» (${conContraccion} revisiones lo dicen), que es la frase que salía «a el»`, conContraccion >= 1, conContraccion);
    comprobar(
      `  y la regla de los dobles se cumple en cada revisión, y se dice: ${doblesQueRepiten} dobles que repiten, ${tercerosDobles} terceros dobles, ${vistasConDobles} turnos que vuelven a tirar a la vista`,
      reprochesDeDobles.length === 0 && doblesQueRepiten >= 1 && vistasConDobles >= 1,
      reprochesDeDobles.slice(0, 6),
    );
    tercerosDoblesEntreLasTres += tercerosDobles;
    /*
     * EL AVISO DEL FINAL DICE «SE ACABÓ» UNA VEZ. Era cabeza + aviso + crónica, y la crónica
     * cierra con la frase del suceso `fin`, letra a letra la cabeza: la línea de estado de una
     * mesa de verdad decía «Se acabó: Ana se queda con el Burgo. Te quedas con el Burgo. … Se
     * acabó: Ana se queda con el Burgo.» (16-sep-2026). La vacuna es la crónica, que sigue
     * trayendo la frase: pegada entera, «Se acabó» sale dos veces.
     */
    {
      const alFinal = vistaDeAsiento(BURGO, p.estado, ESPECTADOR, undefined) as VistaDelBurgo;
      const veces = (texto: string): number => texto.split('Se acabó').length - 1;
      comprobar('  y el aviso del final dice «Se acabó» una sola vez', veces(alFinal.tablero.aviso) === 1, alFinal.tablero.aviso);
      comprobar('  VACUNA: la crónica del final trae la misma frase, así que pegada entera saldría dos veces', veces(`${alFinal.tablero.aviso} ${alFinal.pregon}`) >= 2, alFinal.pregon);
    }
    comprobar('  `jugada` sube exactamente una vez por revisión, y los sucesos nunca pasan del tope', p.estado.jugada === p.revisiones && p.estado.sucesos.length <= TOPE_DE_SUCESOS, { jugada: p.estado.jugada, revisiones: p.revisiones, sucesos: p.estado.sucesos.length });
    comprobar('  hay ganador, sigue vivo, y `seAcabo` lo dice', p.estado.ganadores.length >= 1 && p.estado.ganadores.every((g) => !jugadorDe(p.estado, g).quebrado) && seAcabo(p.estado) === true, p.estado.ganadores);
    comprobar('  y el último suceso es el `fin`: la crónica no se corta por el tope y pierde el final', (p.estado.sucesos[p.estado.sucesos.length - 1] as SucesoDelBurgo | undefined)?.que === 'fin', p.estado.sucesos.length);

    /* DETERMINISMO, ESCALÓN 1: el diario reejecutado da el MISMO estado, byte a byte. */
    const otraVez = reejecutarEn(BURGO, undefined, p.mesa.diario);
    comprobar(`  y su diario de ${p.mesa.diario.length} entradas reejecuta el mismo estado byte a byte`, canonico(otraVez) === canonico(p.estado));
    resumen.push(`    ${cuantos} a la mesa · ${String(p.movimientos).padStart(4)} movs · ${String(p.tics).padStart(3)} tics · ${String(p.cuenta.quiebra ?? 0)} quiebras · ${String(p.rentas).padStart(3)} rentas · ${p.almonedasGanadas} subastas · ${p.alzas} alzas · ${p.tratosAceptados} tratos · ${doblesQueRepiten} dobles y ${tercerosDobles} terceros · ${ms.toFixed(0)} ms`);
  }
  console.log('  partidas jugadas de verdad:');
  for (const r of resumen) console.log(r);
  /*
   * UN TERCER DOBLE JUGADO DE VERDAD, al menos. El bloque 5 lo monta a mano; aquí se exige que la regla
   * entre revisiones lo haya visto también en una partida del robot, porque una vigilancia que nunca
   * se ejerce se lee como vigilada. Medido el 17-sep-2026: 30, 18 y 21 dobles que repiten, y dos
   * terceros, los dos en la partida de tres. Si un cambio del robot los deja en cero, se busca otra
   * semilla como se hizo con la de seis, no se quita esto.
   */
  comprobar(`entre las tres partidas hubo algún tercer doble jugado de verdad (${tercerosDoblesEntreLasTres}), y fue a la Comisaría sin andar`, tercerosDoblesEntreLasTres >= 1, tercerosDoblesEntreLasTres);
  comprobar(
    'LA VACUNA de la contracción: «a el» y «de el» se ven caer en un texto de la vista',
    contraccionesSinHacer('Diego paga 120 € por la subasta a el Ayuntamiento.').length === 1 && contraccionesSinHacer('Las llaves de el Ayuntamiento.').length === 1,
  );
  comprobar('  y un nombre propio en mayúscula no se contrae: «a El Pícaro» se queda así', contraccionesSinHacer('Bea paga 50 € a El Pícaro.').length === 0);

  /*
   * LA VACUNA DEL BUCLE QUE DICE JUGAR Y NO JUEGA. El robot mudo tira porque no le
   * queda otra, no compra nada, pasa en toda subasta y se rinde en su apuro. Que la
   * partida TERMINE no prueba nada; lo que se exige es que los mínimos NO se cumplan,
   * porque si se cumplieran con esta política los mínimos no medirían nada.
   */
  {
    const mudo = partidaVigilada('MUDA', 4, 20260904, 40, 0, 4000, (vista, quien, azar) => ({ azar, decision: loQueHaceElRobotMudo(vista, quien) }), () => {});
    const reproches = reprochesDePartida(mudo);
    comprobar('LA VACUNA: el robot que sólo pasa NO cumple los mínimos de una partida jugada', reproches.length > 0, reproches);
    comprobar('  y en concreto no compra nada, así que no alza ni acepta tratos', mudo.alzas === 0 && mudo.tratosAceptados === 0, { alzas: mudo.alzas, tratos: mudo.tratosAceptados });
    console.log(`    robot mudo (vacuna) · ${mudo.movimientos} movs · le faltan: ${reproches.join('; ').slice(0, 140)}`);
  }
}

// ---------------------------------------------------------------------------
paso('14. LAS CIFRAS DE PRESUPUESTO (§8.6), medidas e IMPRESAS siempre');
// ---------------------------------------------------------------------------

/** Percentil de una lista de milisegundos. `sort` con comparador: esto es un guion, pero la costumbre es la costumbre. */
function percentil(muestras: readonly number[], parte: number): number {
  if (muestras.length === 0) return 0;
  const orden = [...muestras].sort((a, b) => a - b);
  const donde = Math.min(orden.length - 1, Math.floor((orden.length - 1) * parte));
  return orden[donde] as number;
}

{
  const cifras: Array<{ que: string; valor: string; tope: string; bien: boolean }> = [];
  const anota = (que: string, valor: string, tope: string, bien: boolean): void => {
    cifras.push({ que, valor, tope, bien });
    comprobar(`presupuesto · ${que}: ${valor} (tope propio ${tope})`, bien, valor);
  };

  /* EL PEOR ESTADO QUE PUEDE HABER: 28 títulos con dueño y edificios, tres tratos y 64 sucesos. */
  const gordo = (() => {
    let e = estadoDe(empezada('PRE', SEIS, 41));
    const filas: Array<readonly [number, AsientoId | null, number, boolean]> = [];
    for (let k = 0; k < TITULOS.length; k++) {
      const casilla = TITULOS[k] as number;
      const fila = CASILLAS[casilla];
      filas.push([casilla, SEIS[k % SEIS.length] as AsientoId, fila !== undefined && fila.clase === 'solar' ? POSADA : 0, k % 7 === 0]);
    }
    e = conTitulos(e, filas);
    for (const a of SEIS) e = conJugador(e, a, { mrs: 99999, indultos: ['pregon', 'arca'], vueltas: 12 });
    const tratos: TratoDelBurgo[] = [];
    for (let k = 0; k < TRATOS_ABIERTOS_POR_PROPONENTE; k++) {
      tratos.push({ id: k, de: ANA, a: BRUNO, doy: { mrs: 99999, titulos: [...TITULOS], indultos: 2 }, pido: { mrs: 99999, titulos: [], indultos: 0 }, enElTurno: e.turnosAbiertos });
    }
    const paseo: number[] = [];
    for (let k = 1; k <= 12; k++) paseo.push(k);
    const sucesos: SucesoDelBurgo[] = [];
    for (let k = 0; k < TOPE_DE_SUCESOS; k++) sucesos.push({ que: 'mueve', quien: ANA, desde: 0, hasta: 12, recorrido: paseo, porLaPuertaMayor: true, como: 'anda' });
    return { ...turnoDe(e, ANA, 'por-pasar'), tratos, sucesos, tirada: [3, 4] as ParDeDados, colaDeAlmonedas: [...TITULOS] };
  })();

  const bytesDelEstado = canonico(gordo).length;
  anota('estado canónico, en el peor caso', `${(bytesDelEstado / 1024).toFixed(1)} KiB`, `${TOPE_DE_ESTADO / 1024} KiB`, bytesDelEstado < TOPE_DE_ESTADO);
  comprobar('y ese peor estado sigue siendo canonizable, sin un solo `undefined`', porQueNoEsCanonico(gordo) === null, porQueNoEsCanonico(gordo));

  let peorVista = 0;
  let peorOpciones = 0;
  let peorBytesDeOpciones = 0;
  const deProyectar: number[] = [];
  const deOpciones: number[] = [];
  for (const quien of [ESPECTADOR, ...SEIS] as QuienMira[]) {
    const t0 = performance.now();
    const vista = vistaDeAsiento(BURGO, gordo, quien, NOMBRES);
    deProyectar.push(performance.now() - t0);
    const t1 = performance.now();
    const opciones = opcionesDeArcade(BURGO, vista, quien);
    deOpciones.push(performance.now() - t1);
    peorVista = Math.max(peorVista, canonico(vista).length);
    peorOpciones = Math.max(peorOpciones, opciones.length);
    peorBytesDeOpciones = Math.max(peorBytesDeOpciones, canonico(opciones).length);
  }
  anota('vista canónica con el tablero dentro, la mayor de siete', `${(peorVista / 1024).toFixed(1)} KiB`, `${TOPE_DE_VISTA / 1024} KiB`, peorVista < TOPE_DE_VISTA);
  anota('opciones por lectura, la peor de siete', `${peorOpciones} opciones · ${(peorBytesDeOpciones / 1024).toFixed(1)} KiB`, `${TOPE_DE_OPCIONES} y ${TOPE_DE_OPCIONES_BYTES / 1024} KiB`, peorOpciones <= TOPE_DE_OPCIONES && peorBytesDeOpciones < TOPE_DE_OPCIONES_BYTES);
  anota('proyectar(), la peor de siete miradas', `${Math.max(...deProyectar).toFixed(2)} ms`, `${TOPE_DE_MS} ms`, Math.max(...deProyectar) < TOPE_DE_MS);
  anota('opciones(), la peor de siete miradas', `${Math.max(...deOpciones).toFixed(2)} ms`, `${TOPE_DE_MS} ms`, Math.max(...deOpciones) < TOPE_DE_MS);

  const cargaMayor = canonico({ a: BRUNO, doy: { mrs: TOPE_DE_MRS_EN_UN_TRATO, titulos: [...TITULOS], indultos: 2 }, pido: { mrs: TOPE_DE_MRS_EN_UN_TRATO, titulos: [], indultos: 0 } }).length;
  anota('la carga legal más gorda (un trato con 28 títulos)', `${cargaMayor} bytes`, `${TOPE_DE_CARGA} bytes`, cargaMayor < TOPE_DE_CARGA);

  /* `avanzar` por movimiento: p50, p99 y el peor de una partida entera de seis. */
  {
    const porMovimiento: number[] = [];
    let mesa = mesaSobre('PRE-M', undefined, SEIS, 20260905);
    mesa = mover(mesa, SEIS[0] as AsientoId, { tipo: EMPEZAR, carga: { topeDeVueltas: 20 } }).mesa;
    let azar: Azar = sembrar(20260905);
    for (let k = 0; k < 2000 && estadoDe(mesa).momento === 'jugando'; k++) {
      const e = estadoDe(mesa);
      const turnoAhora = vistaDe(e, ESPECTADOR).turnoDe;
      const orden: AsientoId[] = [];
      for (const a of SEIS) if (a !== turnoAhora) orden.push(a);
      if (turnoAhora !== null) orden.push(turnoAhora);
      let hecho = false;
      for (const quien of orden) {
        const r = loQueHaceElRobot(vistaDe(e, quien), quien, azar, true);
        azar = r.azar;
        if (r.decision === null) continue;
        const t0 = performance.now();
        const salida = mover(mesa, quien, r.decision.movimiento);
        porMovimiento.push(performance.now() - t0);
        if (salida.cambio) mesa = salida.mesa;
        hecho = true;
        break;
      }
      if (!hecho) break;
    }
    const peor = Math.max(...porMovimiento);
    anota(`avanzar() por movimiento, sobre ${porMovimiento.length} movimientos de seis`, `p50 ${percentil(porMovimiento, 0.5).toFixed(3)} ms · p99 ${percentil(porMovimiento, 0.99).toFixed(3)} ms · peor ${peor.toFixed(2)} ms`, `${TOPE_DE_MS} ms`, peor < TOPE_DE_MS);
  }

  /*
   * EL PEOR TIC QUE PUEDE HABER: el apuro del ausente con los 28 títulos y las 22
   * hoteles encima, liquidado en UN SOLO tic —vende, hipoteca y quiebra—. Es la
   * cascada del §8.6, y el único sitio donde un tic hace decenas de cosas de golpe.
   */
  {
    let e = estadoDe(empezada('PRE-T', SEIS, 41));
    const filas: Array<readonly [number, AsientoId | null, number, boolean]> = [];
    for (const casilla of TITULOS) {
      const fila = CASILLAS[casilla];
      filas.push([casilla, ANA, fila !== undefined && fila.clase === 'solar' ? POSADA : 0, false]);
    }
    e = conJugador(conTitulos(e, filas), ANA, { mrs: 0 });
        /* La deuda es CON EL AYUNTAMIENTO: es lo que manda los títulos a la cola de subastas en vez de a un heredero. */
    const deuda: ApuroDelBurgo = { quien: ANA, deudas: [{ a: null, cuanto: 999999, porque: 'diezmo' }] };
    const alBorde: EstadoDelBurgo = { ...turnoDe(e, ANA, 'por-pasar'), paso: 'apuro', apuro: deuda };
    const t0 = performance.now();
    const trasTic = tic(mesaSobre('PRE-T2', alBorde, SEIS));
    const ms = performance.now() - t0;
    const s = estadoDe(trasTic);
    comprobar('el peor tic (28 títulos y 22 hoteles liquidados) acaba en quiebra, y en UN solo tic', jugadorDe(s, ANA).quebrado, { paso: s.paso });
    anota('avanzar() por tic, el peor caso medido', `${ms.toFixed(2)} ms`, `${TOPE_DE_MS} ms`, ms < TOPE_DE_MS);
    anota('el estado tras esa cascada', `${(canonico(s).length / 1024).toFixed(1)} KiB`, `${TOPE_DE_ESTADO / 1024} KiB`, canonico(s).length < TOPE_DE_ESTADO);

    /* LA CASCADA ENTERA: cuántos tics cuesta vaciar las subastas con los demás pasando. */
    let cascada = trasTic;
    let tics = 0;
    let peorEstado = canonico(s).length;
    const pendientes = (m: Mesa): number => estadoDe(m).colaDeAlmonedas.length + (estadoDe(m).almoneda === null ? 0 : 1);
    comprobar('la quiebra al Ayuntamiento encola TODOS los títulos del quebrado, ninguno perdido', pendientes(trasTic) === TITULOS.length, pendientes(trasTic));
    while (tics < TOPE_DE_CASCADA && pendientes(cascada) > 0 && estadoDe(cascada).momento === 'jugando') {
      cascada = tic(cascada);
      tics++;
      peorEstado = Math.max(peorEstado, canonico(estadoDe(cascada)).length);
    }
    anota('la cascada de 28 subastas con los demás pasando', `${tics} tics · estado mayor ${(peorEstado / 1024).toFixed(1)} KiB`, `${TOPE_DE_CASCADA} tics y ${TOPE_DE_ESTADO / 1024} KiB`, tics < TOPE_DE_CASCADA && peorEstado < TOPE_DE_ESTADO);
    comprobar('y la cola queda vacía: ningún título del quebrado se queda por el camino', pendientes(cascada) === 0, estadoDe(cascada).colaDeAlmonedas);
  }

  console.log('  presupuesto del Burgo (los topes propios van a la mitad de los 50 ms y a 1/21 de los 512 KiB de producción):');
  for (const c of cifras) console.log(`    ${c.bien ? '·' : '✗'} ${c.que.padEnd(56)} ${c.valor.padEnd(50)} tope ${c.tope}`);
}

// ---------------------------------------------------------------------------
paso('15. LAS CUATRO REGLAS OFICIALES QUE FALTABAN: obrar sin turno, tratar entre dos, la última casa y el 10 %');
// ---------------------------------------------------------------------------

/*
 * ═══ QUÉ SE MIDE AQUÍ Y POR QUÉ CON JUECES CON VACUNA ═══
 *
 * Las cuatro reglas de `DISENO-3.md` §12 que volvieron a entrar en alcance cambian
 * QUIÉN puede hacer QUÉ y CUÁNDO, que es justo la clase de regla que no se cae: se
 * juega mal. Cada una lleva aquí un JUEZ —una función de reproches— que se aplica al
 * caso bueno y a un caso ENVENENADO, y el veneno de cada una es EL COMPORTAMIENTO
 * VIEJO: la mesa ocupada donde antes no se obraba, el Ayuntamiento con dos casas donde
 * antes se alzaba por orden de llegada, y el Impuesto ya cobrado donde antes no había
 * elección. Si mañana alguien deshace una de las cuatro, su juez lo dice.
 */

/** Los cuatro prefijos de las obras, que es lo que `opcionesDeObra` ofrece. */
const OBRAS_OFRECIDAS: readonly string[] = ['alzar:', 'vender:', 'empenar:', 'desempenar:'];

/**
 * EL JUEZ DE «AQUÍ SE OBRA»: para cada obra que se espera, exige que esté OFRECIDA y
 * que el reductor la ACEPTE. Las dos cosas juntas, porque el fallo que se busca es el
 * botón mudo: la opción encendida por una regla y el reductor rechazando por otra.
 */
function reprochesDeObrarAhora(e: EstadoDelBurgo, quien: AsientoId, esperadas: readonly string[], asientos: readonly AsientoId[]): string[] {
  const r: string[] = [];
  const ids = idsDe(e, quien);
  for (const prefijo of esperadas) {
    const cual = ids.find((id) => id.indexOf(prefijo) === 0);
    if (cual === undefined) {
      r.push(`no se ofrece ninguna obra «${prefijo}» a ${quien}`);
      continue;
    }
    const o = opcionPorId(e, quien, cual) as Opcion;
    const salida = mover(mesaSobre(`OBRA-${prefijo}${quien}`, e, asientos), quien, { tipo: o.tipo, carga: o.carga });
    if (!salida.cambio) r.push(`«${cual}» se ofrece y el reductor no la acepta: ${String(salida.motivo)}`);
  }
  return r;
}

/** El juez del revés: aquí NO se obra, ni ofrecido ni mandado a mano. */
function reprochesDeNoObrar(e: EstadoDelBurgo, quien: AsientoId, casilla: number, asientos: readonly AsientoId[]): string[] {
  const r: string[] = [];
  for (const id of idsDe(e, quien)) {
    for (const prefijo of OBRAS_OFRECIDAS) if (id.indexOf(prefijo) === 0) r.push(`se ofrece «${id}» a ${quien} y la mesa está ocupada`);
  }
  for (const tipo of [ALZAR, VENDER, EMPENAR, DESEMPENAR]) {
    const salida = mover(mesaSobre(`NO-OBRA-${tipo}${quien}`, e, asientos), quien, { tipo, carga: { casilla } });
    if (salida.cambio) r.push(`${tipo} en ${casilla} ha cambiado la mesa y no debía`);
    else if (salida.motivo === null) r.push(`${tipo} se rechaza sin motivo`);
  }
  return r;
}

{
  /* ═══ REGLA 1: SE OBRA EN EL TURNO DE CUALQUIERA ═══ */
  const base = estadoDe(empezada('R1', CUATRO, 41));
  /*
   * ANA tiene el turno; BRUNO tiene el barrio pardo entero (con una casa puesta, para
   * que haya algo que vender), una estación hipotecada que deshipotecar, otra sin
   * hipotecar que hipotecar, y dinero. Las cuatro obras a la vez, que es lo que se mide.
   */
  const conBarrios = conTitulos(conJugador(base, BRUNO, { mrs: 900 }), [
    [1, BRUNO, 0, false],
    [3, BRUNO, 1, false],
    [5, BRUNO, 0, true],
    [15, BRUNO, 0, false],
  ]);
  const enElTurnoDeAna = turnoDe(conBarrios, ANA, 'por-pasar');

  const reprochesDeBruno = reprochesDeObrarAhora(enElTurnoDeAna, BRUNO, OBRAS_OFRECIDAS, CUATRO);
  comprobar('REGLA 1: quien NO tiene el turno alza, vende, hipoteca y deshipoteca, y el reductor lo acepta', reprochesDeBruno.length === 0, reprochesDeBruno);
  const alzada = mover(mesaSobre('R1-ALZA', enElTurnoDeAna, CUATRO), BRUNO, { tipo: ALZAR, carga: { casilla: 1 } });
  const trasAlzar = estadoDe(alzada.mesa);
  comprobar('  y la casa se pone de verdad: sube el solar, baja el Ayuntamiento y se cobra el precio', tituloDe(trasAlzar, 1).casas === 1 && trasAlzar.casasEnElConcejo === base.casasEnElConcejo - 1 && jugadorDe(trasAlzar, BRUNO).mrs === 900 - 50, {
    casas: tituloDe(trasAlzar, 1).casas,
    mrs: jugadorDe(trasAlzar, BRUNO).mrs,
  });
  comprobar('  sin tocar el turno ni el paso de quien lo tiene', trasAlzar.turno === enElTurnoDeAna.turno && trasAlzar.paso === 'por-pasar' && vistaDe(trasAlzar, ESPECTADOR).turnoDe === ANA);
  comprobar('  y el suceso `alza` lo cuenta con su casilla', (sucesosDe(trasAlzar, 'alza')[0] as { quien: AsientoId; casas: number } | undefined)?.quien === BRUNO);

  /* LA VACUNA de la regla 1: los TRES momentos en que la mesa espera una respuesta. */
  const conSubasta: EstadoDelBurgo = {
    ...enElTurnoDeAna,
    paso: 'almoneda',
    almoneda: { casilla: 39, edificio: false, puja: 0, quienPuja: null, pujaDe: BRUNO, enPie: [BRUNO, CARLA, DIEGO, ANA], abiertaPor: ANA },
  };
  comprobar('LA VACUNA: con una subasta abierta el juez de «aquí se obra» CAE', reprochesDeObrarAhora(conSubasta, BRUNO, OBRAS_OFRECIDAS, CUATRO).length > 0);
  comprobar('  y no se obra ni ofrecido ni mandado a mano', reprochesDeNoObrar(conSubasta, BRUNO, 1, CUATRO).length === 0, reprochesDeNoObrar(conSubasta, BRUNO, 1, CUATRO));
  const conApuroAjeno: EstadoDelBurgo = {
    ...conTitulos(enElTurnoDeAna, [[26, ANA, 0, false]]),
    paso: 'apuro',
    apuro: { quien: ANA, deudas: [{ a: null, cuanto: 5000, porque: 'diezmo' }] },
  };
  comprobar('con el apuro de OTRO abierto tampoco se obra: la mesa espera una deuda', reprochesDeNoObrar(conApuroAjeno, BRUNO, 1, CUATRO).length === 0, reprochesDeNoObrar(conApuroAjeno, BRUNO, 1, CUATRO));
  comprobar('  pero el endeudado sigue hipotecando lo suyo, que es de lo que va su apuro', reprochesDeObrarAhora(conApuroAjeno, ANA, ['empenar:'], CUATRO).length === 0 && idsDe(conApuroAjeno, ANA).includes('rendirse'), reprochesDeObrarAhora(conApuroAjeno, ANA, ['empenar:'], CUATRO));
  comprobar('  y sigue sin poder alzar ni deshipotecar en su apuro, que es lo de siempre', !idsDe(conApuroAjeno, ANA).some((id) => id.indexOf('alzar:') === 0 || id.indexOf('desempenar:') === 0), idsDe(conApuroAjeno, ANA));

  /* Y con la casilla del dueño del turno sin resolver: él sí, los demás no. */
  const { s: enCompra } = alCaerEn('R1-COMPRA', conBarrios, ANA, 39);
  comprobar('con el del turno decidiendo si compra, los demás NO obran', reprochesDeNoObrar(enCompra, BRUNO, 1, CUATRO).length === 0, reprochesDeNoObrar(enCompra, BRUNO, 1, CUATRO));
  const conAlgoQueObrar = conTitulos(enCompra, [[21, ANA, 0, false], [23, ANA, 0, false], [24, ANA, 0, false]]);
  comprobar('  y el del turno sí, que es lo de siempre', reprochesDeObrarAhora(conAlgoQueObrar, ANA, ['alzar:'], CUATRO).length === 0, reprochesDeObrarAhora(conAlgoQueObrar, ANA, ['alzar:'], CUATRO));

  /* ═══ REGLA 4: EL IMPUESTO SE ELIGE ═══ */
  const patrimonioGordo = conTitulos(conJugador(base, ANA, { mrs: 2000 }), [[21, ANA, 0, false], [23, ANA, 0, false]]);
  const { s: enElImpuesto } = alCaerEn('R4-1', patrimonioGordo, ANA, EL_DIEZMO_CASILLA, [TRES_PASOS]);
  const idsImpuesto = idsDe(enElImpuesto, ANA);
  comprobar('REGLA 4: caer en el Impuesto NO cobra: enciende la marca y ofrece los dos pagos', enElImpuesto.impuestoSinPagar && idsImpuesto.includes('impuesto:fijo') && idsImpuesto.includes('impuesto:decima') && jugadorDe(enElImpuesto, ANA).mrs === 2000, {
    marca: enElImpuesto.impuestoSinPagar,
    ids: idsImpuesto,
  });
  comprobar('  y la marca viaja en la vista de todos, que es de donde salen los botones', vistaDe(enElImpuesto, ESPECTADOR).impuestoSinPagar === true && vistaDe(enElImpuesto, BRUNO).impuestoSinPagar === true);
  comprobar('  sólo el del turno los recibe: el Impuesto no lo elige un tercero', !idsDe(enElImpuesto, BRUNO).some((id) => id.indexOf('impuesto:') === 0), idsDe(enElImpuesto, BRUNO));
  const patrimonioDeAna = vistaDe(enElImpuesto, ANA).jugadores.find((j) => j.asiento === ANA)?.patrimonio ?? 0;
  const laDecima = decimaDelPatrimonio(patrimonioDeAna);
  comprobar('  el patrimonio que publica la vista es el efectivo más los títulos: 2.000 + 220 + 220', patrimonioDeAna === 2000 + 220 + 220, patrimonioDeAna);
  comprobar('  y el rótulo del 10 % promete EXACTAMENTE lo que la tabla calcula', (opcionPorId(enElImpuesto, ANA, 'impuesto:decima')?.rotulo ?? '').indexOf(maravedies(laDecima)) >= 0, opcionPorId(enElImpuesto, ANA, 'impuesto:decima')?.rotulo);
  comprobar('  no lo paga otro por él', !mover(mesaSobre('R4-AJENO', enElImpuesto, CUATRO), BRUNO, { tipo: PAGAR_IMPUESTO, carga: { como: 'fijo' } }).cambio);
  /* PASAR SIN ELEGIR paga la fija: es la que anuncia la casilla, y por eso el turno no se queda clavado. */
  const pasandoSinElegir = mover(mesaSobre('R4-PASA', enElImpuesto, CUATRO), ANA, { tipo: PASAR, carga: {} });
  const trasPasar = estadoDe(pasandoSinElegir.mesa);
  comprobar('  pasar el turno sin elegir cobra la cantidad fija y releva', pasandoSinElegir.cambio && jugadorDe(trasPasar, ANA).mrs === 2000 - EL_DIEZMO && !trasPasar.impuestoSinPagar && trasPasar.turno !== enElImpuesto.turno, {
    mrs: jugadorDe(trasPasar, ANA).mrs,
    marca: trasPasar.impuestoSinPagar,
  });
  comprobar('  y no se cobra dos veces: la marca se apaga con el cobro', pagosDe(trasPasar, ANA).filter((p) => p.porque === 'diezmo').length === 1, pagosDe(trasPasar, ANA));
  const porLaDecima = mover(mesaSobre('R4-DECIMA', enElImpuesto, CUATRO), ANA, { tipo: PAGAR_IMPUESTO, carga: { como: 'decima' } });
  const trasLaDecima = estadoDe(porLaDecima.mesa);
  comprobar('  pagar el 10 % cobra esa cifra exacta, apaga la marca y deja el turno donde estaba', porLaDecima.cambio && jugadorDe(trasLaDecima, ANA).mrs === 2000 - laDecima && !trasLaDecima.impuestoSinPagar && trasLaDecima.paso === 'por-pasar' && trasLaDecima.turno === enElImpuesto.turno && pagosDe(trasLaDecima, ANA).some((p) => p.porque === 'diezmo' && p.cuanto === laDecima), {
    mrs: jugadorDe(trasLaDecima, ANA).mrs,
    decima: laDecima,
    paso: trasLaDecima.paso,
  });
  comprobar('  y ya pagado, la elección desaparece y pasar el turno ya no cobra nada', !idsDe(trasLaDecima, ANA).some((id) => id.indexOf('impuesto:') === 0) && jugadorDe(estadoDe(mover(mesaSobre('R4-YA', trasLaDecima, CUATRO), ANA, { tipo: PASAR, carga: {} }).mesa), ANA).mrs === 2000 - laDecima);
  const porLaFija = estadoDe(mover(mesaSobre('R4-FIJA', enElImpuesto, CUATRO), ANA, { tipo: PAGAR_IMPUESTO, carga: { como: 'fijo' } }).mesa);
  comprobar('  y pagar la fija cobra los 200 de la tabla: se elige de verdad, y las dos cifras son distintas', jugadorDe(porLaFija, ANA).mrs === 2000 - EL_DIEZMO && laDecima !== EL_DIEZMO, { fija: jugadorDe(porLaFija, ANA).mrs, decima: laDecima });
  const conCarga = mover(mesaSobre('R4-CARGA', enElImpuesto, CUATRO), ANA, { tipo: PAGAR_IMPUESTO, carga: { como: 'la-mitad' } });
  comprobar('  una elección inventada no pasa el portillo', !conCarga.cambio && conCarga.motivo !== null, conCarga.motivo);
  comprobar('  con 2.440 de patrimonio la décima (244) es MÁS CARA que la fija, y aun así se ofrece: elige quien paga', laDecima > EL_DIEZMO, { decima: laDecima, fija: EL_DIEZMO });
  /* El tic paga por el ausente lo que menos cuesta, que aquí es la fija. */
  const trasTicRico = estadoDe(tic(mesaSobre('R4-TIC', enElImpuesto, CUATRO)));
  comprobar('  el tic paga por el ausente lo más barato de los dos: con patrimonio gordo, la fija', !trasTicRico.impuestoSinPagar && jugadorDe(trasTicRico, ANA).mrs === 2000 - EL_DIEZMO && trasTicRico.turno === enElImpuesto.turno, { mrs: jugadorDe(trasTicRico, ANA).mrs });
  comprobar('  y el tic hace UNA cosa: cobrar el Impuesto y nada más; el siguiente ya releva', estadoDe(tic(tic(mesaSobre('R4-TIC-2', enElImpuesto, CUATRO)))).turno !== enElImpuesto.turno);
  comprobar('  el aviso de quien tiene que elegir dice las dos cifras', vistaDe(enElImpuesto, ANA).aviso.indexOf(maravedies(laDecima)) >= 0 && vistaDe(enElImpuesto, ANA).aviso.indexOf(maravedies(EL_DIEZMO)) >= 0, vistaDe(enElImpuesto, ANA).aviso);

  /* Y el mismo Impuesto con poco patrimonio: la décima es el salvavidas, y el tic la coge. */
  const pelado = conJugador(base, ANA, { mrs: 90 });
  const { s: impuestoPelado } = alCaerEn('R4-POBRE', pelado, ANA, EL_DIEZMO_CASILLA, [TRES_PASOS]);
  const decimaPelada = decimaDelPatrimonio(vistaDe(impuestoPelado, ANA).jugadores.find((j) => j.asiento === ANA)?.patrimonio ?? 0);
  comprobar('con 90 € y nada más, la décima son 9 € y la fija no le alcanza', decimaPelada === 9 && jugadorDe(impuestoPelado, ANA).mrs === 90, { decima: decimaPelada });
  const trasTicPelado = estadoDe(tic(mesaSobre('R4-TIC2', impuestoPelado, CUATRO)));
  comprobar('  y el tic coge la décima: 9 € pagados, sin apuro y sin quiebra', trasTicPelado.apuro === null && jugadorDe(trasTicPelado, ANA).mrs === 81 && !trasTicPelado.impuestoSinPagar, { mrs: jugadorDe(trasTicPelado, ANA).mrs, apuro: trasTicPelado.apuro });
  const pasandoPelado = estadoDe(mover(mesaSobre('R4-POBRE-PASA', impuestoPelado, CUATRO), ANA, { tipo: PASAR, carga: {} }).mesa);
  comprobar('  pero si PASA sin elegir paga la fija, no le alcanza y se abre su apuro sin relevar el turno', pasandoPelado.apuro !== null && pasandoPelado.turno === impuestoPelado.turno && jugadorDe(pasandoPelado, ANA).mrs === 90, { apuro: pasandoPelado.apuro, turno: pasandoPelado.turno });
  const eligiendoLaFija = estadoDe(mover(mesaSobre('R4-POBRE-FIJA', impuestoPelado, CUATRO), ANA, { tipo: PAGAR_IMPUESTO, carga: { como: 'fijo' } }).mesa);
  comprobar('  y si aun así elige la fija, se abre su apuro por los 200 enteros', eligiendoLaFija.apuro !== null && eligiendoLaFija.apuro.deudas.some((d) => d.porque === 'diezmo' && d.cuanto === EL_DIEZMO) && jugadorDe(eligiendoLaFija, ANA).mrs === 90, eligiendoLaFija.apuro);

  /* LA VACUNA de la regla 4: el comportamiento viejo —cobrar al caer— se ve caer. */
  const comoAntes: EstadoDelBurgo = { ...conJugador(enElImpuesto, ANA, { mrs: 2000 - EL_DIEZMO }), impuestoSinPagar: false };
  comprobar('LA VACUNA: con el Impuesto ya cobrado al caer (lo de antes), la elección no está y se ve', !idsDe(comoAntes, ANA).includes('impuesto:fijo') && !idsDe(comoAntes, ANA).includes('impuesto:decima'));
}

{
  /* ═══ REGLA 3: LA SUBASTA DE LA ÚLTIMA CASA ═══ */
  const base = estadoDe(empezada('R3', CUATRO, 41));
  /* ANA tiene el barrio pardo (casa de 50) y BRUNO el azul (casa de 200); queda UNA casa. */
  const conDosBarrios: EstadoDelBurgo = {
    ...conTitulos(conJugador(conJugador(base, ANA, { mrs: 800 }), BRUNO, { mrs: 800 }), [
      [1, ANA, 0, false],
      [3, ANA, 0, false],
      [37, BRUNO, 0, false],
      [39, BRUNO, 0, false],
    ]),
    casasEnElConcejo: 1,
  };
  const laUltima = turnoDe(conDosBarrios, ANA, 'por-pasar');
  const pedida = mover(mesaSobre('R3-1', laUltima, CUATRO), ANA, { tipo: ALZAR, carga: { casilla: 1 } });
  const enSubasta = estadoDe(pedida.mesa);
  const a0 = enSubasta.almoneda as AlmonedaDelBurgo;
  comprobar('REGLA 3: con UNA casa y otro que también la quiere, ALZAR no alza: la subasta', pedida.cambio && enSubasta.paso === 'almoneda' && a0 !== null && a0.edificio === true && tituloDe(enSubasta, 1).casas === 0, {
    paso: enSubasta.paso,
    almoneda: enSubasta.almoneda,
  });
  comprobar('  quien la pidió abre la puja al precio de lista de SU barrio y no ha pagado nada todavía', a0.puja === 50 && a0.quienPuja === ANA && a0.casilla === 1 && jugadorDe(enSubasta, ANA).mrs === 800, { puja: a0.puja, mrs: jugadorDe(enSubasta, ANA).mrs });
  comprobar('  en pie van sólo los que podrían alzarla, y el que la pidió el último', a0.enPie.join() === [BRUNO, ANA].join() && a0.pujaDe === BRUNO, a0.enPie);
  comprobar('  la casa sigue en el Ayuntamiento mientras se puja: no se reserva', enSubasta.casasEnElConcejo === 1);
  comprobar('  y el aviso del que puja dice que es el último edificio y por qué solar puja', vistaDe(enSubasta, BRUNO).aviso.indexOf('último edificio') >= 0 && vistaDe(enSubasta, BRUNO).aviso.indexOf('Tilos') >= 0, vistaDe(enSubasta, BRUNO).aviso);
  const barata = mover(mesaSobre('R3-BARATA', enSubasta, CUATRO), BRUNO, { tipo: PUJAR, carga: { casilla: 37, cuanto: 60 } });
  comprobar('  nadie puja por debajo del precio de casa de SU barrio: 60 por un solar de 200 se rechaza', !barata.cambio && barata.motivo !== null, barata.motivo);
  const minimoDeBruno = opcionPorId(enSubasta, BRUNO, 'pujar:minimo');
  comprobar('  y su puja mínima ofrecida es justo ese precio de lista, por su propio solar', canonico(minimoDeBruno?.carga) === canonico({ casilla: 37, cuanto: 200 }), minimoDeBruno?.carga);
  const ajena = mover(mesaSobre('R3-AJENA', enSubasta, CUATRO), BRUNO, { tipo: PUJAR, carga: { casilla: 1, cuanto: 200 } });
  comprobar('  y no se puja por el solar de otro', !ajena.cambio && ajena.motivo !== null);
  const pujada = mover(mesaSobre('R3-PUJA', enSubasta, CUATRO), BRUNO, { tipo: PUJAR, carga: { casilla: 37, cuanto: 200 } });
  const conPuja = estadoDe(pujada.mesa);
  comprobar('  al pujar, la subasta apunta al solar del mejor postor', pujada.cambio && (conPuja.almoneda as AlmonedaDelBurgo).casilla === 37 && (conPuja.almoneda as AlmonedaDelBurgo).puja === 200 && (conPuja.almoneda as AlmonedaDelBurgo).quienPuja === BRUNO, conPuja.almoneda);
  const cerrada = estadoDe(mover(mesaSobre('R3-CIERRE', conPuja, CUATRO), ANA, { tipo: PASAR_PUJA, carga: { casilla: 37 } }).mesa);
  comprobar('  y al pasar el otro se cierra sola: la casa se pone en el solar del ganador, que paga su puja', cerrada.almoneda === null && tituloDe(cerrada, 37).casas === 1 && tituloDe(cerrada, 1).casas === 0 && jugadorDe(cerrada, BRUNO).mrs === 600 && cerrada.casasEnElConcejo === 0, {
    casas37: tituloDe(cerrada, 37).casas,
    mrs: jugadorDe(cerrada, BRUNO).mrs,
    concejo: cerrada.casasEnElConcejo,
  });
  comprobar('  con los sucesos de la subasta cerrada y del alza', sucesosDe(cerrada, 'almoneda-cerrada').length === 1 && (sucesosDe(cerrada, 'alza')[0] as { quien: AsientoId } | undefined)?.quien === BRUNO);
  comprobar('  y la mesa vuelve al turno de quien lo tenía', cerrada.paso === 'por-pasar' && cerrada.turno === laUltima.turno);
  /* Si el rival pasa, la casa es del que la pidió y al precio de lista: la regla nueva no le cuesta nada. */
  const sinRival = estadoDe(mover(mesaSobre('R3-PASA', enSubasta, CUATRO), BRUNO, { tipo: PASAR_PUJA, carga: { casilla: 1 } }).mesa);
  comprobar('  si el rival pasa, la casa se queda donde se pidió y por el precio de lista', sinRival.almoneda === null && tituloDe(sinRival, 1).casas === 1 && jugadorDe(sinRival, ANA).mrs === 750 && sinRival.casasEnElConcejo === 0, {
    casas: tituloDe(sinRival, 1).casas,
    mrs: jugadorDe(sinRival, ANA).mrs,
  });
  /* LA VACUNA de la regla 3: con dos casas en el Ayuntamiento (no es la última) se alza sin subasta. */
  const conDos: EstadoDelBurgo = { ...laUltima, casasEnElConcejo: 2 };
  const directa = estadoDe(mover(mesaSobre('R3-DOS', conDos, CUATRO), ANA, { tipo: ALZAR, carga: { casilla: 1 } }).mesa);
  comprobar('LA VACUNA: con DOS casas no hay escasez, se alza por orden de llegada y no se abre subasta', directa.almoneda === null && tituloDe(directa, 1).casas === 1 && directa.casasEnElConcejo === 1, { almoneda: directa.almoneda, casas: tituloDe(directa, 1).casas });
  /* Y sin rival que la quiera tampoco: la subasta de uno solo sería un trámite. */
  const sinNadieMas: EstadoDelBurgo = { ...conTitulos(laUltima, [[37, null, 0, false], [39, null, 0, false]]), casasEnElConcejo: 1 };
  const solitaria = estadoDe(mover(mesaSobre('R3-SOLO', sinNadieMas, CUATRO), ANA, { tipo: ALZAR, carga: { casilla: 1 } }).mesa);
  comprobar('con la última casa pero sin nadie más que pueda alzarla, se alza sin subasta', solitaria.almoneda === null && tituloDe(solitaria, 1).casas === 1 && solitaria.casasEnElConcejo === 0);

  /* EL ÚLTIMO HOTEL, que es la otra existencia y la otra cuenta. */
  const conCuatroCasas: EstadoDelBurgo = {
    ...conTitulos(conJugador(conJugador(base, ANA, { mrs: 800 }), BRUNO, { mrs: 800 }), [
      [1, ANA, 4, false],
      [3, ANA, 4, false],
      [37, BRUNO, 4, false],
      [39, BRUNO, 4, false],
    ]),
    casasEnElConcejo: 8,
    posadasEnElConcejo: 1,
  };
  const porElHotel = estadoDe(mover(mesaSobre('R3-HOTEL', turnoDe(conCuatroCasas, ANA, 'por-pasar'), CUATRO), ANA, { tipo: ALZAR, carga: { casilla: 1 } }).mesa);
  const aH = porElHotel.almoneda as AlmonedaDelBurgo;
  comprobar('el ÚLTIMO HOTEL también se subasta, y sólo entre los que tienen las cuatro casas', porElHotel.paso === 'almoneda' && aH !== null && aH.edificio === true && aH.enPie.join() === [BRUNO, ANA].join(), porElHotel.almoneda);
  const conHotel = estadoDe(mover(mesaSobre('R3-HOTEL2', porElHotel, CUATRO), BRUNO, { tipo: PASAR_PUJA, carga: { casilla: 1 } }).mesa);
  comprobar('  y al cerrarse, el hotel sustituye a las cuatro casas, que vuelven al Ayuntamiento', tituloDe(conHotel, 1).casas === POSADA && conHotel.posadasEnElConcejo === 0 && conHotel.casasEnElConcejo === 8 + (POSADA - 1) && jugadorDe(conHotel, ANA).mrs === 750, {
    casas: tituloDe(conHotel, 1).casas,
    concejo: conHotel.casasEnElConcejo,
    posadas: conHotel.posadasEnElConcejo,
  });
  /* Y una mesa guardada de antes de esta regla, sin el campo `edificio`, es la subasta de siempre. */
  const comoAntes = comoSiSiempreHubieraHabidoBurgo({
    ...laUltima,
    paso: 'almoneda',
    almoneda: { casilla: 39, puja: 0, quienPuja: null, pujaDe: BRUNO, enPie: [BRUNO, ANA], abiertaPor: ANA },
  } as unknown as EstadoDelBurgo);
  comprobar('una subasta guardada SIN el campo `edificio` se lee como la del título, no como la del edificio', vistaDe(comoAntes, BRUNO).almoneda?.edificio === false && idsDe(comoAntes, BRUNO).includes('pujar:minimo'), vistaDe(comoAntes, BRUNO).almoneda);
}

{
  /*
   * ═══ Y EL TOPE DE VUELTAS, QUE NO CAMBIA PERO TENÍA QUE VERSE ANDAR ═══
   *
   * El §12 del diseño lo dejaba «escrito y comprobado» pero sin ofrecer en la hoja del
   * Muelle, y así sigue: el camino está abierto en las reglas y ofrecerlo es de quien
   * toque la hoja. Lo que faltaba era ver el final ENTERO por la puerta del reductor —el
   * relevo que alcanza el tope, el patrimonio que gana y el empate que se comparte—,
   * porque un camino abierto que nadie recorre es un camino que no se sabe si existe.
   */
  const conTope = estadoDe(empezada('TOP', CUATRO, 41, 3));
  comprobar('EL TOPE DE VUELTAS: EMPEZAR lo admite en la carga y la vista lo publica', conTope.topeDeVueltas === 3 && vistaDe(conTope, ESPECTADOR).topeDeVueltas === 3);
  const alBorde = (patrimonios: ReadonlyArray<readonly [AsientoId, number]>, vueltas: number): EstadoDelBurgo => {
    let s = turnoDe(conTope, ANA, 'por-pasar');
    for (const a of CUATRO) s = conJugador(s, a, { vueltas });
    for (const [quien, mrs] of patrimonios) s = conJugador(s, quien, { mrs });
    return s;
  };
  const gana = estadoDe(mover(mesaSobre('TOP-1', alBorde([[ANA, 1000], [BRUNO, 5000], [CARLA, 900], [DIEGO, 800]], 3), CUATRO), ANA, { tipo: PASAR, carga: {} }).mesa);
  comprobar('  cuando el MÍNIMO de vueltas de los vivos alcanza el tope, la partida acaba al relevar', gana.momento === 'terminada' && (sucesosDe(gana, 'fin')[0] as { porque: string } | undefined)?.porque === 'tope-de-vueltas', {
    momento: gana.momento,
    fin: sucesosDe(gana, 'fin'),
  });
  comprobar('  y gana el mayor patrimonio, aunque no sea el que pasó el turno', gana.ganadores.join() === BRUNO, gana.ganadores);
  const empate = estadoDe(mover(mesaSobre('TOP-2', alBorde([[ANA, 5000], [BRUNO, 5000], [CARLA, 900], [DIEGO, 800]], 3), CUATRO), ANA, { tipo: PASAR, carga: {} }).mesa);
  comprobar('  con dos patrimonios iguales el Burgo se comparte: sin desempate inventado', empate.ganadores.join() === [ANA, BRUNO].join(), empate.ganadores);
  const quebrado = conJugador(alBorde([[ANA, 1000], [BRUNO, 9000], [CARLA, 900], [DIEGO, 800]], 3), BRUNO, { quebrado: true });
  const sinElRico = estadoDe(mover(mesaSobre('TOP-3', quebrado, CUATRO), ANA, { tipo: PASAR, carga: {} }).mesa);
  comprobar('  y un quebrado no gana por rico: no cuenta ni para el mínimo ni para el patrimonio', sinElRico.momento === 'terminada' && sinElRico.ganadores.join() === ANA, sinElRico.ganadores);
  /* LA VACUNA: una vuelta por debajo del tope, la partida sigue. */
  const sigue = estadoDe(mover(mesaSobre('TOP-4', alBorde([[ANA, 1000], [BRUNO, 5000], [CARLA, 900], [DIEGO, 800]], 2), CUATRO), ANA, { tipo: PASAR, carga: {} }).mesa);
  comprobar('LA VACUNA del tope: con una vuelta menos la partida NO acaba y el turno pasa al siguiente', sigue.momento === 'jugando' && sigue.turno !== conTope.turno, { momento: sigue.momento });
  /* Y sin tope (0), que es lo que la hoja del Muelle ofrece hoy, no acaba nunca por vueltas. */
  const sinTope = estadoDe(empezada('TOP-5', CUATRO, 41, 0));
  let conMuchasVueltas = turnoDe(sinTope, ANA, 'por-pasar');
  for (const a of CUATRO) conMuchasVueltas = conJugador(conMuchasVueltas, a, { vueltas: 99 });
  const nadaDeFin = estadoDe(mover(mesaSobre('TOP-6', conMuchasVueltas, CUATRO), ANA, { tipo: PASAR, carga: {} }).mesa);
  comprobar('sin tope (0), noventa y nueve vueltas no acaban nada: es la partida que ofrece el Muelle hoy', nadaDeFin.momento === 'jugando', nadaDeFin.momento);
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
const COMPROBACIONES_ESCRITAS = 601;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(
    `Solo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones que tiene escritas este guion: ` +
      'se ha caído por el camino sin decirlo. Si has añadido comprobaciones nuevas, sube el número.',
  );
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. El Burgo se sostiene: las rentas son las de la tabla y el barrio entero cobra el doble,`);
  console.log('  los dobles repiten y los tres dobles encierran sin cobrar, la Comisaría se paga o se sale con dobles o al tercero,');
  console.log('  las treinta y dos cartas hacen lo que dicen y el mazo rota, la subasta releva por asiento y la puja libre cabe');
  console.log('  sólo por su puerta, el apuro se salda vendiendo y hipotecando o acaba en quiebra con quien más reclama, los tratos');
  console.log('  caducan al relevar, el tic juega por el ausente y una mesa sin nadie termina sola — y tres partidas enteras de');
  console.log('  2, 3 y 6 jugadas por el robot quiebran, cobran, pujan, encierran y alzan, reejecutadas byte a byte, con');
  console.log('  ningún secreto en ninguna de las siete miradas de ninguna revisión.');
  console.log('  Y las cuatro reglas oficiales que faltaban: se obra en el turno de cualquiera salvo con la mesa esperando una');
  console.log('  respuesta, dos que no tienen el turno tratan entre ellos, la última casa y el último hotel se subastan entre');
  console.log('  quienes podrían alzarlos, y el Impuesto se elige entre la cantidad fija y el 10 % del patrimonio.');
  process.exit(0);
}
process.exit(1);
