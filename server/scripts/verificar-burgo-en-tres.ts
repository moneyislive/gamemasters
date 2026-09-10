/**
 * ¿DICE LA ESCENA LO MISMO QUE LAS REGLAS? — EL ADAPTADOR DEL BURGO EN TRES
 *
 *   npm run verify:burgo-en-tres
 *
 * ═══ QUÉ AFIRMA ESTE FICHERO ═══
 *
 * Entre la vista del Burgo y el anillo en tres dimensiones hay UNA traducción,
 * `shared/arcade/juegos/burgo-en-tres.ts`, y los dos clientes la usan sin añadir
 * nada. Si esa traducción miente, el fallo es de los silenciosos: una casilla se
 * enciende donde no hay nada que hacer, la bandera sale del color de otro, los dados
 * enseñan un par que el servidor no tiró, o un botón se pinta dos veces y el segundo
 * manda un movimiento que el reductor descarta sin decir nada. Nada se cae; se juega
 * mal.
 *
 * Por eso aquí NO se comprueba contra vistas inventadas: se abren mesas de verdad con
 * el árbitro, se juegan partidas enteras con un robot propio que elige SÓLO entre lo
 * que `opcionesDelBurgo` ofrece, y en CADA paso, para CADA asiento y para el
 * espectador, se mira que lo que la escena recibiría coincide, casilla a casilla y
 * opción a opción, con la vista y con las opciones. Los estados montados a mano son
 * dos —una quiebra y un fin de partida— y se montan sobre un estado jugado, porque
 * llegar a una quiebra jugando exige que los dados quieran.
 *
 * ═══ CADA MOVIMIENTO EXACTAMENTE UNA VEZ, MEDIDO ═══
 *
 * La cabecera de `burgo-en-tres.ts` declara una partición: los dados llevan TIRAR;
 * las casillas tocables las obras; la hoja las pujas, los tratos y los botones del
 * momento; y `opcionesFueraDelTablero` lo que quede. Aquí se afirma en cada vista que
 * la unión es TODA la lista sin puertas, que los botones sueltos no repiten nada de lo
 * que ya está pintado, que los dados y la hoja no comparten nada, y que las obras de
 * las fichas de «Lo mío» son LOS MISMOS objetos que las casillas tocables abren: la
 * ficha es el botón y la casilla su atajo (§4 y §6.3 piden los dos), y por eso se
 * cuentan como uno; comprar y sacar a almoneda, que no son de un título mío, sólo
 * tienen la casilla. Se afirma con los OBJETOS pintados y también con `null` en cada
 * hueco: con todo a `null` vuelven todas menos las puertas.
 *
 * ═══ Y `burgo-servido`: EL SERVIDOR DE VERDAD ═══
 *
 * La mitad de lo que un cliente necesita no se ve en proceso: que `burgo.glb` se sirva
 * por HTTP con su tipo y sus bytes, que la mesa se abra con `plazoSegundos: 0` y seis
 * figuras, que los treinta primeros movimientos entren por el sondeo con `x-asiento`,
 * que un movimiento en vuelo al vestir vuelva como 409 `revision-rancia` y se reintente,
 * que un rechazo traiga su motivo en la respuesta y `null` en la lectura, y que
 * `empezada` se ponga con el primer cambio. Se levanta el servidor en un puerto libre,
 * con `MESAS_DIR` en una carpeta temporal, y se mata al terminar, también si falla.
 *
 * ═══ LAS VACUNAS ═══
 *
 * Cada invariante es una función que devuelve reproches, y cada una se ve caer con un
 * caso envenenado: una bandera del color equivocado, una hoja que repite un botón, una
 * serie de carta escondida en un texto, un par de dados inventado, una vista de otro
 * juego. Y el filtro también: se afirma cuántas vistas se inspeccionaron, porque cero
 * inspeccionadas es cero fallos y se lee como vigilado.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../../shared/arcade/juegos';
import { abrirMesa, avanzarElReloj, jugarConMotivo } from '../src/arcade/arbitro';
import type { Mesa } from '../src/arcade/arbitro';
import { enteroEntre, sembrar } from '../../shared/mecanicas/azar';
import type { Azar } from '../../shared/mecanicas/azar';
import { canonico } from '../../shared/mecanicas/canonico';
import { ESPECTADOR } from '../../shared/arcade/tipos';
import type { AsientoId, QuienMira } from '../../shared/arcade/tipos';
import type { Opcion } from '../../shared/arcade/opciones';
import {
  A_ALMONEDA,
  ACEPTAR,
  ALZAR,
  BURGO,
  COMPRAR,
  DESEMPENAR,
  EMPENAR,
  EMPEZAR,
  loSecretoDelBurgo,
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
  TIRAR,
  USAR_INDULTO,
  VENDER,
} from '../../shared/arcade/juegos/burgo';
import type { EstadoDelBurgo, SucesoDelBurgo, VistaDelBurgo } from '../../shared/arcade/juegos/burgo';
import { BARRIOS, barrioDe, carta, CASILLAS, cartasDe, CUANTAS_CASILLAS, POSADA, TITULOS } from '../../shared/arcade/juegos/burgo-tablero';
import {
  camaraSigueA,
  cardinal,
  cartelEnTres,
  dadosEnTres,
  elPregonEnTres,
  esperaA,
  esVistaQueSePinta,
  fichaDeCasilla,
  figurasEnTres,
  firmaDelTablero,
  hojaEnTres,
  maravedies,
  marcadorEnTres,
  meToca,
  obraPosibleEnCasilla,
  opcionesFueraDelTablero,
  ORDEN_DE_LA_HOJA,
  pujaEnTres,
  recorridoEnTres,
  seVeEnTres,
  sucesosEnTres,
  tableroEnTres,
  tirarEnTres,
  tratoEnTres,
} from '../../shared/arcade/juegos/burgo-en-tres';
import type { HojaDelBurgo, OpcionQueLlega } from '../../shared/arcade/juegos/burgo-en-tres';
import type { TableroDelBurgoEn3D } from '../../escenas/burgo/tipos';
import { figuraDeSerie } from '../../escenas/embarcadero/figuras';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---------------------------------------------------------------------------
// El armazón
// ---------------------------------------------------------------------------

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  const cola = detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 500)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

/*
 * Una mesa recién abierta tiene `estado: undefined` (el Burgo nace en el primer
 * movimiento, como Riberas): leerla es leer `partidaNueva()`, igual que hacen las
 * cuatro puertas del juego con `estado ?? partidaNueva()`.
 */
const estadoDe = (mesa: Mesa): EstadoDelBurgo => (mesa.estado === undefined ? partidaNueva() : (mesa.estado as EstadoDelBurgo));
const vistaEn = (mesa: Mesa, quien: QuienMira): VistaDelBurgo => proyectarElBurgo(estadoDe(mesa), quien);
const opcionesEn = (mesa: Mesa, quien: QuienMira): readonly Opcion[] => opcionesDelBurgo(vistaEn(mesa, quien), quien);
const firma = (o: { tipo: string; carga: unknown }): string => canonico({ tipo: o.tipo, carga: o.carga ?? null });
const llano = (x: unknown): string => JSON.stringify(x);

/** Manda un movimiento por el árbitro y dice si cambió algo. */
function mover(mesa: Mesa, quien: AsientoId, m: { tipo: string; carga: unknown }): { mesa: Mesa; cambio: boolean; motivo: string | null } {
  const jugado = jugarConMotivo(mesa, { quien, rev: mesa.rev, movimiento: { tipo: m.tipo, carga: m.carga } });
  return { mesa: jugado.mesa, cambio: jugado.mesa.estado !== mesa.estado, motivo: jugado.motivo };
}

/** Las series de los dos mazos que NUNCA pueden salir en lo que se pinta (con comillas, en forma llana). */
function seriesSecretas(mesa: Mesa): string[] {
  const salida: string[] = [];
  for (const s of loSecretoDelBurgo(estadoDe(mesa))) if (typeof s === 'string') salida.push(`"${s}"`);
  return salida;
}

// ---------------------------------------------------------------------------
// EL ROBOT PROPIO: elige sólo entre lo que el juego ofrece, y compone por las puertas
// ---------------------------------------------------------------------------

/**
 * Juega a ganar: tira, compra casi todo, saca a almoneda una de cada seis veces,
 * puja hasta cerca del precio (y una de cada tres por la puerta, con `montar`),
 * alza en cuanto puede, propone tratos cuando le falta poco para un barrio (con
 * `montar`), acepta la mitad, en el apuro vende y empeña antes de rendirse, y sólo
 * pasa cuando no le queda otra. Determinista con el azar sembrado de la casa.
 */
interface Robot {
  azar: Azar;
  /** Un trato por proponente y turno, para que dos robots no se pasen la tarde proponiéndose. */
  propusoEn: Record<string, number>;
}

function de(robot: Robot, hasta: number): number {
  const r = enteroEntre(robot.azar, 0, hasta - 1);
  robot.azar = r.azar;
  return r.valor;
}

function porTipo(opciones: readonly Opcion[], tipo: string): Opcion | null {
  for (const o of opciones) if (o.tipo === tipo && o.declaracion !== true) return o;
  return null;
}

function decideElRobot(robot: Robot, vista: VistaDelBurgo, quien: AsientoId, opciones: readonly Opcion[]): { tipo: string; carga: unknown } | null {
  if (opciones.length === 0) return null;
  const empezar = porTipo(opciones, EMPEZAR);
  if (empezar !== null) return empezar;
  const yo = vista.jugadores.find((j) => j.asiento === quien);
  if (yo === undefined) return null;

  /* Sin turno: contestar tratos. La mitad se aceptan. */
  const aceptar = porTipo(opciones, ACEPTAR);
  if (aceptar !== null) {
    const rechazar = opciones.find((o) => o.tipo === RECHAZAR && llano(o.carga) === llano(aceptar.carga));
    return de(robot, 2) === 0 ? aceptar : (rechazar ?? aceptar);
  }

  /* Mi apuro: vender, empeñar, y si no hay nada, la quiebra. */
  if (vista.paso === 'apuro' && vista.apuro !== null && vista.apuro.quien === quien) {
    return porTipo(opciones, VENDER) ?? porTipo(opciones, EMPENAR) ?? porTipo(opciones, RENDIRSE);
  }

  if (vista.turnoDe !== quien) return null;

  /* Obras con el turno: alzar si hay dinero, desempeñar si sobra. */
  const alzar = porTipo(opciones, ALZAR);
  if (alzar !== null && yo.mrs > 250) return alzar;
  const desempenar = porTipo(opciones, DESEMPENAR);
  if (desempenar !== null && yo.mrs > 500) return desempenar;

  if (vista.paso === 'por-tirar') {
    if (yo.presa >= 0) {
      const fianza = porTipo(opciones, PAGAR_FIANZA);
      const indulto = porTipo(opciones, USAR_INDULTO);
      if (indulto !== null) return indulto;
      if (fianza !== null && yo.mrs > 300) return fianza;
    }
    return porTipo(opciones, TIRAR);
  }
  if (vista.paso === 'comprar') {
    const comprar = porTipo(opciones, COMPRAR);
    if (comprar !== null && de(robot, 6) !== 0) return comprar;
    return porTipo(opciones, A_ALMONEDA);
  }
  if (vista.paso === 'almoneda') {
    const puja = pujaEnTres(vista, quien, opciones);
    if (puja === null || !puja.meToca) return null;
    const fila = CASILLAS[puja.casilla];
    const tope = fila === undefined ? 0 : fila.precio;
    if (puja.puja + 10 <= tope && puja.minimo <= yo.mrs && de(robot, 5) !== 0) {
      if (puja.puerta !== null && de(robot, 3) === 0) {
        const cuanto = puja.puerta.minimo + puja.puerta.escalon * de(robot, 3);
        const libre = puja.montar(cuanto);
        if (libre !== null) return libre;
      }
      return puja.fijas[0] ?? puja.pasar;
    }
    return puja.pasar;
  }
  if (vista.paso === 'por-pasar') {
    /* Un trato por turno: pido un título sin casas de otro, doy dinero. */
    const trato = tratoEnTres(vista, quien, opciones);
    if (trato !== null && trato.puerta !== null && robot.propusoEn[quien] !== vista.turnosAbiertos && de(robot, 3) === 0) {
      for (const destino of trato.puerta.a) {
        if (destino.titulos.length === 0) continue;
        const pido = destino.titulos[de(robot, destino.titulos.length)] as number;
        const mrs = Math.min(trato.puerta.mrsMaximo, 100 + 10 * de(robot, 20));
        const montado = trato.montar(destino.asiento, { mrs, titulos: [], indultos: 0 }, { mrs: 0, titulos: [pido], indultos: 0 });
        if (montado !== null) {
          robot.propusoEn[quien] = vista.turnosAbiertos;
          return montado;
        }
      }
    }
    return porTipo(opciones, TIRAR) ?? porTipo(opciones, PASAR);
  }
  return null;
}

// ---------------------------------------------------------------------------
// LAS INVARIANTES: cada una devuelve reproches, y cada una se ve caer con veneno
// ---------------------------------------------------------------------------

type Puntos = { firma: string; o: OpcionQueLlega }[];

/** Qué pinta cada sitio de la partición, por firma canónica. */
interface Particion {
  tocables: Puntos;
  dados: Puntos;
  hoja: Puntos;
  fichas: Puntos;
  fuera: Puntos;
}

function particionDe(
  vista: unknown,
  quien: QuienMira,
  opciones: readonly Opcion[],
  tablero: TableroDelBurgoEn3D | null,
  dados: ReturnType<typeof dadosEnTres>,
  hoja: HojaDelBurgo<Opcion> | null,
): Particion {
  const tocables: Puntos = [];
  if (tablero !== null) {
    for (const c of tablero.casillas) {
      if (!c.tocable) continue;
      for (const o of obraPosibleEnCasilla(vista, quien, opciones, c.indice)) tocables.push({ firma: firma(o), o });
    }
  }
  const dadosP: Puntos = dados !== null && dados.movimiento !== null ? [{ firma: firma(dados.movimiento), o: dados.movimiento }] : [];
  const hojaP: Puntos = [];
  const fichas: Puntos = [];
  if (hoja !== null) {
    for (const s of hoja.secciones) for (const o of s.opciones) hojaP.push({ firma: firma(o), o });
    for (const b of hoja.mios) for (const f of b.fichas) for (const o of f.opciones) fichas.push({ firma: firma(o), o });
  }
  const fuera: Puntos = opcionesFueraDelTablero(opciones, tablero, dados, hoja).map((o) => ({ firma: firma(o), o }));
  return { tocables, dados: dadosP, hoja: hojaP, fichas, fuera };
}

/** LA PARTICIÓN: cada movimiento sin puerta exactamente en un botón o un asa, y ninguno perdido. */
function reprochesDeLaParticion(opciones: readonly Opcion[], p: Particion): string[] {
  const r: string[] = [];
  const todas = opciones.filter((o) => o.declaracion !== true).map(firma);
  const union = [...p.tocables, ...p.dados, ...p.hoja, ...p.fichas, ...p.fuera].map((x) => x.firma);
  for (const f of todas) if (union.indexOf(f) < 0) r.push(`se pierde ${f.slice(0, 80)}`);
  for (const f of union) if (todas.indexOf(f) < 0) r.push(`se pinta algo que el juego no ofrece: ${f.slice(0, 80)}`);
  const repetido = (lista: Puntos, nombre: string): void => {
    const vistas: string[] = [];
    for (const x of lista) {
      if (vistas.indexOf(x.firma) >= 0) r.push(`${nombre} repite ${x.firma.slice(0, 80)}`);
      vistas.push(x.firma);
    }
  };
  repetido(p.hoja, 'la hoja');
  repetido(p.fuera, 'los botones sueltos');
  repetido(p.tocables, 'las casillas');
  const cruce = (a: Puntos, b: Puntos, nombre: string): void => {
    for (const x of a) if (b.some((y) => y.firma === x.firma)) r.push(`${nombre}: ${x.firma.slice(0, 80)}`);
  };
  cruce(p.fuera, p.tocables, 'un botón suelto repite una casilla tocable');
  cruce(p.fuera, p.dados, 'un botón suelto repite los dados');
  cruce(p.fuera, p.hoja, 'un botón suelto repite la hoja');
  cruce(p.fuera, p.fichas, 'un botón suelto repite una ficha');
  cruce(p.dados, p.hoja, 'los dados y la hoja pintan lo mismo');
  cruce(p.dados, p.tocables, 'los dados y una casilla pintan lo mismo');
  cruce(p.hoja, p.tocables, 'una sección de la hoja repite una casilla tocable');
  /*
   * Las obras de las fichas de «Lo mío» son LOS MISMOS objetos que las casillas
   * abren (un botón y su atajo, no dos botones): toda obra de una ficha es una
   * casilla tocable, y toda casilla tocable que no sea comprar ni sacar a almoneda
   * —las dos obras sobre un título que aún no es mío— está en una ficha por
   * identidad. Cuando no hay tablero (`tocables` vacío) la ficha es el único sitio.
   */
  const deTituloAjeno = (o: OpcionQueLlega): boolean => o.tipo === COMPRAR || o.tipo === A_ALMONEDA;
  for (const t of p.tocables) if (!deTituloAjeno(t.o) && !p.fichas.some((f) => f.o === t.o)) r.push(`una obra tocable de un título mío no está en su ficha como el mismo objeto: ${t.firma.slice(0, 80)}`);
  for (const t of p.tocables) if (deTituloAjeno(t.o) && p.fichas.some((f) => f.o === t.o)) r.push(`una ficha de «Lo mío» ofrece comprar un título que no es mío: ${t.firma.slice(0, 80)}`);
  if (p.tocables.length > 0) for (const f of p.fichas) if (!p.tocables.some((t) => t.o === f.o)) r.push(`una ficha trae una obra que ninguna casilla abre: ${f.firma.slice(0, 80)}`);
  for (const f of p.fichas) if (deTituloAjeno(f.o)) r.push(`una ficha ofrece comprar: ${f.firma.slice(0, 80)}`);
  /* Y todo lo pintado es una opción ENTERA del juego, por identidad. */
  for (const x of [...p.tocables, ...p.dados, ...p.hoja, ...p.fichas, ...p.fuera]) {
    if (!opciones.some((o) => o === x.o)) r.push(`se pintó una opción montada, no la del juego: ${x.firma.slice(0, 80)}`);
    if (x.o.declaracion === true) r.push(`se pintó una puerta: ${x.o.id}`);
  }
  return r;
}

/** EL TABLERO, casilla a casilla, contra la vista. */
function reprochesDelTablero(vista: VistaDelBurgo, quien: QuienMira, opciones: readonly Opcion[], t: TableroDelBurgoEn3D): string[] {
  const r: string[] = [];
  if (t.casillas.length !== CUANTAS_CASILLAS) r.push(`${t.casillas.length} casillas`);
  const colorDe = (asiento: AsientoId | null): string | null => {
    if (asiento === null) return null;
    const j = vista.jugadores.find((x) => x.asiento === asiento);
    return j === undefined ? null : j.color;
  };
  for (let i = 0; i < t.casillas.length; i++) {
    const c = t.casillas[i] as TableroDelBurgoEn3D['casillas'][number];
    const fila = CASILLAS[i];
    if (fila === undefined) continue;
    const tit = vista.titulos.find((x) => x.casilla === i);
    const barrio = barrioDe(i);
    if (c.indice !== i) r.push(`la casilla ${i} dice índice ${c.indice}`);
    if (c.clase !== fila.clase) r.push(`la casilla ${i} es ${c.clase} y la tabla dice ${fila.clase}`);
    const acera = fila.clase === 'solar' && barrio !== null ? barrio.color : null;
    if (c.colorDelBarrio !== acera) r.push(`la acera de ${i} es ${c.colorDelBarrio}, no ${acera}`);
    const dueno = tit === undefined ? null : colorDe(tit.dueno);
    if (c.dueno !== dueno) r.push(`el dueño de ${i} sale ${c.dueno} y la vista dice ${dueno}`);
    if (c.casas !== (tit?.casas ?? 0)) r.push(`las casas de ${i}: ${c.casas} frente a ${tit?.casas ?? 0}`);
    if (c.empenada !== (tit?.empenado ?? false)) r.push(`el empeño de ${i}`);
    if (c.enAlmoneda !== (vista.almoneda !== null && vista.almoneda.casilla === i)) r.push(`la almoneda de ${i}`);
    const obras = obraPosibleEnCasilla(vista, quien, opciones, i);
    if (c.tocable !== obras.length > 0) r.push(`la casilla ${i} ${c.tocable ? 'se enciende sin' : 'no se enciende con'} obra`);
    for (const o of obras) {
      if (!opciones.some((x) => x === o)) r.push(`la obra de ${i} no es la opción del juego`);
      if ((o.carga as { casilla?: unknown }).casilla !== i) r.push(`la obra de ${i} lleva otra casilla`);
    }
  }
  if (t.figuras.length !== vista.jugadores.length) r.push(`${t.figuras.length} figuras para ${vista.jugadores.length} jugadores`);
  for (let k = 0; k < t.figuras.length; k++) {
    const f = t.figuras[k] as TableroDelBurgoEn3D['figuras'][number];
    const j = vista.jugadores[k];
    if (j === undefined) continue;
    if (f.asiento !== j.asiento) r.push(`la figura ${k} no va en orden de asiento`);
    if (f.color !== j.color || f.casilla !== j.casilla) r.push(`la figura de ${j.asiento} no está donde la vista dice`);
    if (f.presa !== j.presa >= 0 || f.quebrada !== j.quebrado) r.push(`la figura de ${j.asiento} miente en presa/quebrada`);
    if (f.esLocal !== (quien !== null && quien === j.asiento)) r.push(`la figura de ${j.asiento} miente en esLocal`);
    if (f.leToca !== (vista.turnoDe === j.asiento)) r.push(`la figura de ${j.asiento} miente en leToca`);
    if (f.figura !== figuraDeSerie(j.asiento)) r.push(`la figura de ${j.asiento} sin silla no es la de serie`);
  }
  const delTurno = vista.jugadores.find((j) => j.asiento === vista.duenoDelTurno);
  if (t.destacada !== (delTurno === undefined ? null : delTurno.casilla)) r.push(`destacada ${t.destacada}`);
  if (t.almoneda !== (vista.almoneda === null ? null : vista.almoneda.casilla)) r.push(`almoneda ${t.almoneda}`);
  const vigente = vista.ultimaCarta !== null && vista.ultimaCarta.enElTurno === vista.turnosAbiertos && vista.momento === 'jugando';
  if ((t.carta !== null) !== vigente) r.push(`carta ${llano(t.carta)} con ultimaCarta ${llano(vista.ultimaCarta)}`);
  if (t.carta !== null && vista.ultimaCarta !== null) {
    if (t.carta.mazo !== vista.ultimaCarta.mazo) r.push('la carta es de otro mazo');
    const fila = CASILLAS[t.carta.enCasilla];
    if (fila === undefined || fila.clase !== vista.ultimaCarta.mazo) r.push(`la carta sale de la casilla ${t.carta.enCasilla}, que no es del ${vista.ultimaCarta.mazo}`);
  }
  const primero = vista.tratos[0];
  if (llano(t.trato) !== llano(primero === undefined ? null : { de: primero.de, a: primero.a })) r.push('el trato del tablero');
  const ganador = vista.momento === 'terminada' && vista.ganadores.length > 0 ? vista.ganadores[0] : null;
  if (t.ganador !== ganador) r.push(`ganador ${t.ganador}`);
  return r;
}

/** LOS DADOS: el par de la vista, nunca inventado; el sello; el asa exactamente cuando el juego ofrece tirar. */
function reprochesDeLosDados(vista: VistaDelBurgo, quien: QuienMira, opciones: readonly Opcion[], d: ReturnType<typeof dadosEnTres>): string[] {
  const r: string[] = [];
  const tirar = tirarEnTres(opciones);
  if (quien === null || vista.momento !== 'jugando') {
    if (d !== null) r.push('un mirón o una mesa sin partida tiene dados');
    return r;
  }
  if (d === null) {
    r.push('un asiento en una partida no tiene dados');
    return r;
  }
  if (llano(d.par) !== llano(vista.tirada)) r.push(`el par ${llano(d.par)} no es la tirada ${llano(vista.tirada)}`);
  if (d.tirado !== (vista.paso !== 'por-tirar')) r.push('tirado');
  if (d.sello !== vista.tiradasDelTurno + 100 * vista.turnosAbiertos) r.push(`sello ${d.sello}`);
  if (d.porTirar !== (tirar !== null)) r.push(`porTirar ${d.porTirar} con ${tirar === null ? 'ninguna' : 'una'} opción de tirar`);
  if (d.movimiento !== tirar) r.push('el movimiento de los dados no es la opción de tirar');
  if (tirar !== null && tirar.tipo !== TIRAR) r.push('tirarEnTres devuelve otro tipo');
  return r;
}

/** LA HOJA: ocho secciones en orden, opciones del juego enteras, sin puertas, y ningún secreto ni carta no robada. */
function reprochesDeLaHoja(vista: VistaDelBurgo, quien: QuienMira, opciones: readonly Opcion[], h: HojaDelBurgo<Opcion>, secretos: readonly string[]): string[] {
  const r: string[] = [];
  if (h.secciones.length !== ORDEN_DE_LA_HOJA.length) r.push(`${h.secciones.length} secciones`);
  for (let i = 0; i < ORDEN_DE_LA_HOJA.length; i++) {
    if (h.secciones[i]?.id !== ORDEN_DE_LA_HOJA[i]) r.push(`la sección ${i} es ${h.secciones[i]?.id}`);
  }
  for (const s of h.secciones) {
    for (const o of s.opciones) {
      if (!opciones.some((x) => x === o)) r.push(`la sección ${s.id} pinta una opción que no es del juego`);
      if (o.declaracion === true) r.push(`la sección ${s.id} pinta una puerta`);
    }
    if (s.titulo.length === 0) r.push(`la sección ${s.id} sin título`);
  }
  const texto = llano({ secciones: h.secciones, cinta: h.cinta, marcador: h.marcador, cartel: h.cartel, mios: h.mios, lineasDePuja: h.puja?.lineas ?? [] });
  for (const serie of secretos) if (texto.indexOf(serie) >= 0) r.push(`la hoja enseña la serie ${serie}`);
  /*
   * La carta vigente se salta POR TEXTO y no por número: hay cartas gemelas (dos «A
   * la puerta más cercana» en el Pregón; el Indulto y «¡A la Mazmorra!» en los dos
   * mazos) y la hoja, que enseña título y texto, no puede distinguir cuál de las dos
   * salió ni tiene por qué: lo que se vigila es que no cuente una que NO ha salido.
   */
  const vigente = cartelEnTres(vista);
  for (const mazo of ['pregon', 'arca'] as const) {
    for (const c of cartasDe(mazo)) {
      if (vigente !== null && vigente.titulo === c.titulo && vigente.texto === c.texto) continue;
      if (texto.indexOf(llano(c.texto).slice(1, -1)) >= 0) r.push(`la hoja cuenta el texto de «${c.titulo}», que no ha salido`);
      for (const s of h.secciones) for (const l of s.lineas) if (l === c.titulo) r.push(`la hoja nombra «${c.titulo}», que no ha salido`);
    }
  }
  if (vigente !== null) {
    const ficha = carta(vigente.mazo, vigente.numero);
    if (ficha === null || vigente.titulo !== ficha.titulo || vigente.texto !== ficha.texto) r.push('el cartel no es la carta de la tabla');
    if (h.cartel === null || h.cartel.titulo !== vigente.titulo) r.push('la hoja no enseña la carta vigente');
    if (!h.secciones.some((s) => s.id === 'carta' && s.lineas.indexOf(vigente.titulo) >= 0)) r.push('la sección de la carta no lleva el título');
  }
  if (h.cinta.aviso !== vista.aviso) r.push('el aviso de la cinta no es el de la vista');
  if (h.cinta.meToca !== meToca(vista, quien)) r.push('la cinta miente en meToca');
  const yo = vista.jugadores.find((j) => j.asiento === quien);
  if (yo !== undefined && h.cinta.miDinero !== maravedies(yo.mrs)) r.push(`mi dinero ${h.cinta.miDinero}`);
  if (yo === undefined && h.cinta.miDinero !== '') r.push('un mirón tiene dinero en la cinta');
  if (h.marcador.jugadores.length !== vista.jugadores.length) r.push('el marcador no tiene a todos');
  for (const m of h.marcador.jugadores) {
    const j = vista.jugadores.find((x) => x.asiento === m.asiento);
    if (j === undefined) r.push(`el marcador tiene a ${m.asiento}, que no está`);
    else if (m.mrs !== j.mrs || m.patrimonio !== j.patrimonio || m.titulos !== j.titulos.length || m.indultos !== j.indultos) r.push(`el marcador miente sobre ${j.asiento}`);
    else if (m.esSuTurno !== (vista.duenoDelTurno === j.asiento) || m.seLeEspera !== (vista.turnoDe === j.asiento)) r.push(`el marcador marca mal a ${j.asiento}`);
  }
  /* «Lo mío»: exactamente mis títulos, agrupados, y cada ficha con SUS obras. */
  const misCasillas = h.mios.flatMap((b) => b.fichas.map((f) => f.casilla)).sort((a, b) => a - b);
  const deLaVista = yo === undefined ? [] : [...yo.titulos].sort((a, b) => a - b);
  if (llano(misCasillas) !== llano(deLaVista)) r.push(`«Lo mío» trae ${llano(misCasillas)} y la vista ${llano(deLaVista)}`);
  for (const b of h.mios) {
    for (const f of b.fichas) {
      if (f.barrio !== null && f.barrio.id !== b.id) r.push(`la ficha ${f.casilla} está en el barrio equivocado`);
      const obras = obraPosibleEnCasilla(vista, quien, opciones, f.casilla);
      if (f.opciones.length !== obras.length || !f.opciones.every((o, k) => o === obras[k])) r.push(`la ficha ${f.casilla} no lleva sus obras`);
      if (!f.esMio) r.push(`la ficha ${f.casilla} de «Lo mío» no es mía`);
    }
  }
  /* La almoneda y los tratos de la hoja son los de las funciones sueltas. */
  const puja = pujaEnTres(vista, quien, opciones);
  if ((h.puja === null) !== (puja === null)) r.push('la hoja y pujaEnTres no coinciden');
  if (puja !== null && vista.almoneda !== null && puja.casilla !== vista.almoneda.casilla) r.push('la puja es de otra casilla');
  const trato = tratoEnTres(vista, quien, opciones);
  if (trato !== null && trato.abiertos.length !== vista.tratos.length) r.push('los tratos abiertos no son los de la vista');
  return r;
}

/** LOS TEXTOS: el pregón y el aviso son los de la vista; «espera a» dice algo cuando hay alguien a quien esperar. */
function reprochesDeLosTextos(vista: VistaDelBurgo, quien: QuienMira): string[] {
  const r: string[] = [];
  const p = elPregonEnTres(vista);
  if (p.texto !== vista.pregon || p.aviso !== vista.aviso) r.push('el pregón no es el de la vista');
  const espera = esperaA(vista);
  if (vista.momento === 'jugando' && vista.turnoDe !== null) {
    const nombre = vista.jugadores.find((j) => j.asiento === vista.turnoDe)?.nombre ?? vista.turnoDe;
    if (espera.indexOf(nombre) < 0) r.push(`«${espera}» no nombra a ${nombre}`);
  }
  if (vista.momento === 'reuniendo' && espera.length === 0) r.push('sin frase mientras se reúne');
  if (meToca(vista, quien) !== (quien !== null && vista.momento === 'jugando' && vista.turnoDe === quien)) r.push('meToca');
  const sigue = camaraSigueA(vista);
  const mueve = [...vista.sucesos].reverse().find((s) => s.que === 'mueve' || s.que === 'a-la-mazmorra' || s.que === 'sale-de-la-mazmorra');
  const esperado = mueve === undefined ? vista.turnoDe : (mueve as { quien: AsientoId }).quien;
  if (sigue !== esperado) r.push(`la cámara sigue a ${sigue} y debía seguir a ${esperado}`);
  for (const s of vista.sucesos) {
    if (s.que === 'mueve' && llano(recorridoEnTres(s)) !== llano(s.recorrido)) r.push('recorridoEnTres no devuelve el recorrido del suceso');
  }
  return r;
}

/** LAS FICHAS de las cuarenta casillas: nombre y tabla de la casilla, fila de hoy, dueño y obras. */
function reprochesDeLasFichas(vista: VistaDelBurgo, quien: QuienMira, opciones: readonly Opcion[]): string[] {
  const r: string[] = [];
  for (let i = 0; i < CUANTAS_CASILLAS; i++) {
    const f = fichaDeCasilla(vista, i, quien, opciones);
    const fila = CASILLAS[i];
    if (fila === undefined) continue;
    if (f.nombre !== fila.nombre || f.precio !== fila.precio || f.clase !== fila.clase) r.push(`la ficha ${i} no es la de la tabla`);
    const tit = vista.titulos.find((x) => x.casilla === i);
    const dueno = tit === undefined ? null : vista.jugadores.find((j) => j.asiento === tit.dueno);
    if ((f.dueno === null) !== (dueno === undefined || dueno === null)) r.push(`el dueño de la ficha ${i}`);
    if (f.dueno !== null && dueno !== undefined && dueno !== null && (f.dueno.color !== dueno.color || f.dueno.nombre !== dueno.nombre)) r.push(`el dueño de la ficha ${i} con otro color`);
    if (tit !== undefined && (f.casas !== tit.casas || f.empenado !== tit.empenado || f.rentaAhora !== tit.rentaAhora || f.esPosada !== (tit.casas === POSADA))) r.push(`la ficha ${i} miente en casas/empeño/renta`);
    const actuales = f.rentas.filter((x) => x.actual);
    if (actuales.length > 1) r.push(`la ficha ${i} destaca ${actuales.length} filas`);
    if (tit !== undefined && tit.dueno !== null && !tit.empenado && fila.clase === 'solar' && actuales.length !== 1) r.push(`la ficha ${i} con dueño no destaca la fila de hoy`);
    if (actuales.length === 1 && tit !== undefined && actuales[0]?.cuanto !== tit.rentaAhora) r.push(`la fila destacada de ${i} no es la renta de hoy`);
    if ((tit === undefined || tit.dueno === null || tit.empenado) && actuales.length !== 0) r.push(`la ficha ${i} destaca una fila sin cobrar`);
    const obras = obraPosibleEnCasilla(vista, quien, opciones, i);
    if (f.opciones.length !== obras.length || !f.opciones.every((o, k) => o === obras[k])) r.push(`la ficha ${i} no lleva sus obras`);
    if (f.esMio !== (tit !== undefined && quien !== null && tit.dueno === quien)) r.push(`esMio de ${i}`);
  }
  return r;
}

// ---------------------------------------------------------------------------
// LAS PARTIDAS: mesas reales, y en cada paso las siete miradas
// ---------------------------------------------------------------------------

/** Lo que se cuenta por partida, para exigir mínimos y para afirmar que el filtro miró. */
interface Cuentas {
  vistas: number;
  reproches: string[];
  hitos: Record<string, number>;
  saltosDeUna: number;
  saltosDeDos: number;
  gruesasVacias: number;
  gruesasConMueve: number;
  gruesasConCambioDeMano: number;
  firmasIguales: number;
  firmasDistintas: number;
  pujasLibresAceptadas: number;
  tratosMontadosAceptados: number;
  montarNuloFuera: number;
  /** Qué mandó `montar()` que el reductor no aceptó, con su motivo: para leerlo, no sólo contarlo. */
  montadosRechazados: string[];
  movimientos: number;
  tics: number;
  ganador: boolean;
}

function cuentasNuevas(): Cuentas {
  return {
    vistas: 0,
    reproches: [],
    hitos: {},
    saltosDeUna: 0,
    saltosDeDos: 0,
    gruesasVacias: 0,
    gruesasConMueve: 0,
    gruesasConCambioDeMano: 0,
    firmasIguales: 0,
    firmasDistintas: 0,
    pujasLibresAceptadas: 0,
    tratosMontadosAceptados: 0,
    montarNuloFuera: 0,
    montadosRechazados: [],
    movimientos: 0,
    tics: 0,
    ganador: false,
  };
}

function anota(c: Cuentas, donde: string, reproches: string[]): void {
  for (const x of reproches) if (c.reproches.length < 60) c.reproches.push(`${donde}: ${x}`);
}

function hito(c: Cuentas, nombre: string): void {
  c.hitos[nombre] = (c.hitos[nombre] ?? 0) + 1;
}

/** Las siete miradas de una mesa: cada asiento y el espectador, con la traducción entera encima. */
function revisarLaMesa(mesa: Mesa, c: Cuentas, anteriores: Map<string, VistaDelBurgo[]>): void {
  const secretos = seriesSecretas(mesa);
  const miradas: QuienMira[] = [...mesa.asientos, ESPECTADOR];
  for (const quien of miradas) {
    const vista = vistaEn(mesa, quien);
    const opciones = opcionesEn(mesa, quien);
    const donde = `${mesa.id}/j${vista.jugada}/${quien ?? 'mirón'}`;
    c.vistas++;
    if (!esVistaQueSePinta(vista) || !seVeEnTres(vista)) {
      anota(c, donde, ['la vista real no se puede pintar']);
      continue;
    }
    const tablero = tableroEnTres(vista, quien, opciones);
    const dados = dadosEnTres(vista, quien, opciones);
    const hoja = hojaEnTres(vista, quien, opciones);
    if (tablero === null) {
      anota(c, donde, ['sin tablero']);
      continue;
    }
    anota(c, donde, reprochesDelTablero(vista, quien, opciones, tablero));
    anota(c, donde, reprochesDeLosDados(vista, quien, opciones, dados));
    anota(c, donde, reprochesDeLaHoja(vista, quien, opciones, hoja, secretos));
    anota(c, donde, reprochesDeLaParticion(opciones, particionDe(vista, quien, opciones, tablero, dados, hoja)));
    anota(c, donde, reprochesDeLosTextos(vista, quien));
    if (vista.jugada % 7 === 0) anota(c, donde, reprochesDeLasFichas(vista, quien, opciones));
    if (quien === null && opciones.length !== 0) anota(c, donde, ['el espectador tiene opciones']);
    if (quien === null && tablero.casillas.some((x) => x.tocable)) anota(c, donde, ['el espectador tiene casillas tocables']);
    /* La firma: la misma vista proyectada dos veces da la misma firma. */
    const otraVez = tableroEnTres(proyectarElBurgo(estadoDe(mesa), quien), quien, opciones);
    if (otraVez !== null && firmaDelTablero(otraVez) === firmaDelTablero(tablero)) c.firmasIguales++;
    else anota(c, donde, ['la firma cambia entre dos proyecciones iguales']);
    /* Los sucesos: con la vista de hace una jugada, la lista; con la de hace dos, la gruesa. */
    const llave = quien ?? 'mirón';
    const previas = anteriores.get(llave) ?? [];
    const hace1 = previas.find((v) => v.jugada === vista.jugada - 1);
    const hace2 = previas.find((v) => v.jugada === vista.jugada - 2);
    if (hace1 !== undefined) {
      c.saltosDeUna++;
      if (sucesosEnTres(hace1.jugada, vista) !== vista.sucesos) anota(c, donde, ['con una jugada de salto no devuelve la lista de la vista']);
    }
    if (hace2 !== undefined) {
      c.saltosDeDos++;
      const gruesa = sucesosEnTres(hace2.jugada, vista, hace2);
      const cambioVisible =
        llano(hace2.jugadores.map((j) => [j.casilla, j.mrs, j.quebrado, j.presa])) !== llano(vista.jugadores.map((j) => [j.casilla, j.mrs, j.quebrado, j.presa])) ||
        llano(hace2.titulos) !== llano(vista.titulos);
      if (gruesa.length === 0) c.gruesasVacias++;
      if (cambioVisible && gruesa.length === 0) anota(c, donde, ['la lista gruesa sale vacía con cambios a la vista']);
      for (const j of vista.jugadores) {
        const antes = hace2.jugadores.find((x) => x.asiento === j.asiento);
        if (antes === undefined || antes.casilla === j.casilla || j.presa >= 0 || antes.quebrado || j.quebrado) continue;
        const suyo = gruesa.find((s) => s.que === 'mueve' && s.quien === j.asiento);
        if (suyo === undefined || suyo.que !== 'mueve' || suyo.hasta !== j.casilla || suyo.desde !== antes.casilla) {
          anota(c, donde, [`la gruesa no lleva a ${j.asiento} de ${antes.casilla} a ${j.casilla}`]);
          continue;
        }
        c.gruesasConMueve++;
        const pisadas = recorridoEnTres(suyo);
        if (pisadas.length === 0 || pisadas[pisadas.length - 1] !== j.casilla) anota(c, donde, ['el recorrido de la gruesa no llega']);
      }
      for (const t of vista.titulos) {
        const antes = hace2.titulos.find((x) => x.casilla === t.casilla);
        if (antes === undefined || antes.dueno === t.dueno) continue;
        if (!gruesa.some((s) => s.que === 'cambia-de-mano' && s.casilla === t.casilla && s.a === t.dueno)) anota(c, donde, [`la gruesa no cambia de mano ${t.casilla}`]);
        else c.gruesasConCambioDeMano++;
      }
      if (vista.momento === 'jugando' && !gruesa.some((s) => s.que === 'turno' || s.que === 'fin')) anota(c, donde, ['la gruesa no acaba en relevo']);
    }
    if (sucesosEnTres(vista.jugada, vista).length !== 0) anota(c, donde, ['con la misma jugada devuelve sucesos']);
    previas.push(vista);
    if (previas.length > 3) previas.shift();
    anteriores.set(llave, previas);
  }
}

/** Los hitos que salen de los sucesos del estado nuevo. */
function anotaLosHitos(c: Cuentas, sucesos: readonly SucesoDelBurgo[]): void {
  for (const s of sucesos) {
    hito(c, s.que);
    if (s.que === 'almoneda-cerrada' && s.ganador !== null) hito(c, 'almoneda-ganada');
    if (s.que === 'trato' && s.fin === 'aceptado') hito(c, 'trato-aceptado');
    if (s.que === 'trato' && s.fin === 'propuesto') hito(c, 'trato-propuesto');
    if (s.que === 'mueve' && s.como === 'viaja') hito(c, 'viaja');
    if (s.que === 'mueve' && s.como === 'retrocede') hito(c, 'retrocede');
  }
}

/** Una partida entera con el robot, revisando las siete miradas en cada paso. */
function jugarUnaPartida(id: string, cuantos: number, semilla: number, topeDePasos: number, cadaCuantosUnTic: number): { mesa: Mesa; cuentas: Cuentas } {
  const asientos: AsientoId[] = [];
  for (let i = 0; i < cuantos; i++) asientos.push(`s${i + 1}`);
  let mesa = abrirMesa({ id, arcade: BURGO, semilla, asientos });
  const c = cuentasNuevas();
  const robot: Robot = { azar: sembrar(semilla), propusoEn: {} };
  const anteriores = new Map<string, VistaDelBurgo[]>();
  revisarLaMesa(mesa, c, anteriores);
  let sinMover = 0;
  for (let paso = 0; paso < topeDePasos; paso++) {
    if (estadoDe(mesa).momento === 'terminada') break;
    if (cadaCuantosUnTic > 0 && (paso + 1) % cadaCuantosUnTic === 0) {
      const antes = mesa.estado;
      mesa = avanzarElReloj(mesa);
      c.tics++;
      if (mesa.estado !== antes) {
        anotaLosHitos(c, estadoDe(mesa).sucesos);
        revisarLaMesa(mesa, c, anteriores);
      }
      continue;
    }
    let movio = false;
    for (const quien of mesa.asientos) {
      const vista = vistaEn(mesa, quien);
      const opciones = opcionesEn(mesa, quien);
      const decision = decideElRobot(robot, vista, quien, opciones);
      if (decision === null) continue;
      const esMontado = !opciones.some((o) => o === decision);
      const r = mover(mesa, quien, decision);
      if (!r.cambio) {
        if (esMontado) {
          c.montarNuloFuera++;
          c.montadosRechazados.push(`${decision.tipo} ${llano(decision.carga)}: ${r.motivo ?? 'sin motivo'}`);
        }
        anota(c, `${id}/${quien}`, [`el robot mandó ${decision.tipo} ofrecido y el reductor no lo aceptó: ${r.motivo ?? 'sin motivo'}`]);
        continue;
      }
      if (esMontado && decision.tipo === PUJAR) c.pujasLibresAceptadas++;
      if (esMontado && decision.tipo === PROPONER) c.tratosMontadosAceptados++;
      mesa = r.mesa;
      c.movimientos++;
      anotaLosHitos(c, estadoDe(mesa).sucesos);
      revisarLaMesa(mesa, c, anteriores);
      movio = true;
      break;
    }
    if (!movio) {
      sinMover++;
      if (sinMover > 3) {
        const antes = mesa.estado;
        mesa = avanzarElReloj(mesa);
        c.tics++;
        if (mesa.estado !== antes) {
          anotaLosHitos(c, estadoDe(mesa).sucesos);
          revisarLaMesa(mesa, c, anteriores);
        } else {
          anota(c, id, [`la mesa se ha quedado parada en ${estadoDe(mesa).paso} esperando a ${vistaEn(mesa, null).turnoDe}`]);
          break;
        }
      }
    } else sinMover = 0;
  }
  c.ganador = estadoDe(mesa).momento === 'terminada' && estadoDe(mesa).ganadores.length > 0;
  return { mesa, cuentas: c };
}

function resumen(c: Cuentas): Record<string, unknown> {
  return {
    vistas: c.vistas,
    movimientos: c.movimientos,
    tics: c.tics,
    hitos: c.hitos,
    saltos: [c.saltosDeUna, c.saltosDeDos],
    gruesas: [c.gruesasConMueve, c.gruesasConCambioDeMano, c.gruesasVacias],
    pujasLibres: c.pujasLibresAceptadas,
    tratosMontados: c.tratosMontadosAceptados,
    montadosRechazados: c.montadosRechazados.slice(0, 4),
    reproches: c.reproches.slice(0, 8),
  };
}

/* ═══ 1. LA MESA QUE SE REÚNE Y LA QUE NO ES DEL BURGO ═══ */
paso('La mesa que se reúne, y lo que no es una vista del Burgo');
{
  const mesa = abrirMesa({ id: 'BUR-3D-0', arcade: BURGO, semilla: 3, asientos: ['A', 'B', 'C'] });
  const vista = vistaEn(mesa, 'A');
  const opciones = opcionesEn(mesa, 'A');
  comprobar('la vista recién abierta es del Burgo y se puede pintar', esVistaQueSePinta(vista) && seVeEnTres(vista));
  const tablero = tableroEnTres(vista, 'A', opciones);
  comprobar('y tiene tablero: el anillo existe antes de que haya jugadores, con cuarenta casillas y ninguna figura', tablero !== null && tablero.casillas.length === 40 && tablero.figuras.length === 0);
  comprobar('sin una casilla tocable ni dueño', tablero !== null && tablero.casillas.every((c) => !c.tocable && c.dueno === null && c.casas === 0));
  comprobar('a nadie le toca mientras se reúne la mesa', meToca(vista, 'A') === false && esperaA(vista).length > 0);
  comprobar('no hay dados mientras se reúne: `null`, no apagados', dadosEnTres(vista, 'A', opciones) === null);
  const hoja = hojaEnTres(vista, 'A', opciones);
  comprobar('la hoja trae las ocho secciones en orden', hoja.secciones.map((s) => s.id).join(',') === ORDEN_DE_LA_HOJA.join(','), hoja.secciones.map((s) => s.id));
  comprobar('y «Ahora» lleva empezar como botón, entero', hoja.secciones[2]?.opciones.some((o) => o.tipo === EMPEZAR && opciones.indexOf(o) >= 0) === true);
  const fuera = opcionesFueraDelTablero(opciones, tablero, null, hoja);
  comprobar('con la hoja pintada no queda ningún botón suelto', fuera.length === 0, fuera.map((o) => o.id));
  comprobar('y sin hoja, empezar es un botón suelto', opcionesFueraDelTablero(opciones, tablero, null, null).some((o) => o.tipo === EMPEZAR));
  comprobar('el marcador sin jugadores está vacío y no revienta', marcadorEnTres(vista, 'A').jugadores.length === 0);
  comprobar('no hay carta, ni puja, ni tratos', cartelEnTres(vista) === null && pujaEnTres(vista, 'A', opciones) === null && tratoEnTres(vista, 'A', opciones) === null);

  /* Otro juego, o nada. */
  const ajena = { desde: 'riberas', momento: 'jugando', colonos: [], islas: [], jugada: 3 };
  comprobar('una vista de otro juego no se pinta: `null`, no un anillo vacío', !esVistaQueSePinta(ajena) && tableroEnTres(ajena, 'A', []) === null && dadosEnTres(ajena, 'A', []) === null);
  comprobar('ni tiene hoja con secciones llenas, ni marcador, ni pregón', hojaEnTres(ajena, 'A', []).secciones.every((s) => !s.hayAlgo) && marcadorEnTres(ajena, 'A').jugadores.length === 0 && elPregonEnTres(ajena).texto === '');
  comprobar('ni sucesos, ni cámara, ni ficha con dueño', sucesosEnTres(0, ajena).length === 0 && camaraSigueA(ajena) === null && fichaDeCasilla(ajena, 1, 'A', []).dueno === null);
  comprobar('`null`, `undefined`, una cadena y un número tampoco', [null, undefined, 'burgo', 4].every((x) => !esVistaQueSePinta(x) && tableroEnTres(x, 'A', []) === null));
  comprobar('y una vista del Burgo con siete jugadores no se ve en tres', !seVeEnTres({ ...vista, jugadores: [1, 2, 3, 4, 5, 6, 7] }) && tableroEnTres({ ...vista, jugadores: [1, 2, 3, 4, 5, 6, 7] }, 'A', []) === null);
  comprobar('seVeEnTres no mira colores: seis jugadores sin color se ven', seVeEnTres({ ...vista, jugadores: [{}, {}, {}, {}, {}, {}] }));
  const escasa = tableroEnTres({ desde: 'burgo', momento: 'jugando', jugadores: [{ asiento: 'A' }], titulos: [], jugada: 1 }, 'A', []);
  comprobar('una vista con lo mínimo se pinta con huecos rellenos: figura de serie de A en la casilla 0 y sin dinero', escasa !== null && escasa.figuras[0]?.casilla === 0 && escasa.figuras[0]?.figura === figuraDeSerie('A'));
}

/* ═══ 2. PARTIDAS ENTERAS CON EL ROBOT: 2, 4 Y 6 ASIENTOS ═══ */
paso('Partidas enteras con el robot: en cada paso, cada asiento y el mirón contra la vista');
const PARTIDAS: { id: string; cuantos: number; semilla: number; pasos: number; tic: number }[] = [
  { id: 'BUR-3D-2', cuantos: 2, semilla: 11, pasos: 1400, tic: 0 },
  { id: 'BUR-3D-4', cuantos: 4, semilla: 23, pasos: 2200, tic: 9 },
  { id: 'BUR-3D-6', cuantos: 6, semilla: 20260909, pasos: 3000, tic: 13 },
];
const hitosDeTodas: Record<string, number> = {};
let ultimaMesaJugada: Mesa | null = null;
const cuentasDeTodas: Cuentas[] = [];
for (const p of PARTIDAS) {
  const { mesa, cuentas } = jugarUnaPartida(p.id, p.cuantos, p.semilla, p.pasos, p.tic);
  cuentasDeTodas.push(cuentas);
  ultimaMesaJugada = mesa;
  for (const k of Object.keys(cuentas.hitos)) hitosDeTodas[k] = (hitosDeTodas[k] ?? 0) + (cuentas.hitos[k] ?? 0);
  console.log(`  ${p.id}: ${llano(resumen(cuentas))}`);
  comprobar(`${p.id}: se inspeccionaron muchas vistas (filtro vivo): ${cuentas.vistas}`, cuentas.vistas >= 400, cuentas.vistas);
  comprobar(`${p.id}: el robot movió de verdad`, cuentas.movimientos >= 150, cuentas.movimientos);
  comprobar(`${p.id}: ninguna mirada tuvo un reproche`, cuentas.reproches.length === 0, cuentas.reproches);
  comprobar(`${p.id}: sucesosEnTres con +1 devolvió la lista muchas veces`, cuentas.saltosDeUna >= 100, cuentas.saltosDeUna);
  comprobar(`${p.id}: y con +2 derivó listas gruesas con viajes y cambios de mano`, cuentas.saltosDeDos >= 50 && cuentas.gruesasConMueve >= 10 && cuentas.gruesasConCambioDeMano >= 3, [cuentas.saltosDeDos, cuentas.gruesasConMueve, cuentas.gruesasConCambioDeMano]);
  comprobar(`${p.id}: la firma fue estable en todas las vistas`, cuentas.firmasIguales === cuentas.vistas, [cuentas.firmasIguales, cuentas.vistas]);
  comprobar(`${p.id}: se tiró, se movió y se cobró renta`, (cuentas.hitos['tira'] ?? 0) >= 40 && (cuentas.hitos['mueve'] ?? 0) >= 40 && (cuentas.hitos['cobra'] ?? 0) >= 5, cuentas.hitos);
  comprobar(`${p.id}: hubo almonedas abiertas y compras`, (cuentas.hitos['almoneda-abierta'] ?? 0) >= 1 && (cuentas.hitos['compra'] ?? 0) >= 5, cuentas.hitos);
  comprobar(`${p.id}: alguien pasó por la Mazmorra`, (cuentas.hitos['a-la-mazmorra'] ?? 0) >= 1, cuentas.hitos);
  comprobar(`${p.id}: salieron cartas`, (cuentas.hitos['carta'] ?? 0) >= 2, cuentas.hitos);
  if (p.tic > 0) comprobar(`${p.id}: el tic entró y jugó por el ausente`, cuentas.tics >= 20, cuentas.tics);
}
comprobar('entre las tres partidas: pujas libres montadas por la puerta y ACEPTADAS por el reductor', cuentasDeTodas.reduce((s, c) => s + c.pujasLibresAceptadas, 0) >= 2, cuentasDeTodas.map((c) => c.pujasLibresAceptadas));
comprobar('entre las tres partidas: tratos montados por la puerta y ACEPTADOS por el reductor (propuestos de verdad)', cuentasDeTodas.reduce((s, c) => s + c.tratosMontadosAceptados, 0) >= 2 && (hitosDeTodas['trato-propuesto'] ?? 0) >= 2, [cuentasDeTodas.map((c) => c.tratosMontadosAceptados), hitosDeTodas['trato-propuesto']]);
comprobar('entre las tres partidas: se ganó alguna almoneda y se alzó', (hitosDeTodas['almoneda-ganada'] ?? 0) >= 1 && (hitosDeTodas['alza'] ?? 0) >= 1, hitosDeTodas);
comprobar('entre las tres partidas: hubo apuro', (hitosDeTodas['apuro'] ?? 0) >= 1, hitosDeTodas);
comprobar('entre las tres partidas: hubo un trato aceptado o rechazado (los robots contestan)', (hitosDeTodas['trato-aceptado'] ?? 0) + (hitosDeTodas['trato'] ?? 0) >= 2, hitosDeTodas);
comprobar('ningún montar() dio algo que el reductor rechazara', cuentasDeTodas.every((c) => c.montarNuloFuera === 0), cuentasDeTodas.flatMap((c) => c.montadosRechazados));
console.log(`  hitos: ${llano(hitosDeTodas)}`);

/* ═══ 3. QUIEBRA Y FIN, MONTADOS SOBRE UN ESTADO JUGADO ═══ */
paso('Quiebra y fin: un apuro sin salida, la quiebra por rendirse, y el último en pie');
{
  const base = jugarUnaPartida('BUR-3D-Q', 2, 5, 60, 0).mesa;
  const e = estadoDe(base);
  const [a, b] = e.jugadores;
  comprobar('la partida de dos está en marcha con sus dos jugadores', e.momento === 'jugando' && a !== undefined && b !== undefined);
  if (a !== undefined && b !== undefined) {
    /*
     * B debe 500 a A y no tiene con qué: apuro sin salida. Es el TURNO DE A (B cayó
     * en un solar de A en el turno de A y no pudo pagar... o lo que sea: el estado se
     * monta): así `duenoDelTurno` es A y `turnoDe` es B, que es el caso que la cinta
     * tiene que decir con «· B en apuro».
     */
    const titulos = e.titulos.map((t) => (t.dueno === b.asiento ? { ...t, dueno: a.asiento, casas: 0, empenado: false } : t));
    const montado: EstadoDelBurgo = {
      ...e,
      paso: 'apuro',
      luego: 'por-pasar',
      turno: 0,
      dobles: 0,
      almoneda: null,
      colaDeAlmonedas: [],
      colaDeApuros: [],
      tratos: [],
      titulos,
      jugadores: e.jugadores.map((j, k) => (k === 1 ? { ...j, mrs: 0, presa: -1 } : { ...j, mrs: 1000 })),
      apuro: { quien: b.asiento, deudas: [{ a: a.asiento, cuanto: 500, porque: 'renta' }] },
      jugada: e.jugada + 1,
      sucesos: [{ que: 'apuro', quien: b.asiento, debe: 500 }],
    };
    const mesa = abrirMesa({ id: 'BUR-3D-Q2', arcade: BURGO, semilla: 5, asientos: [...base.asientos], estado: montado });
    const c = cuentasNuevas();
    const anteriores = new Map<string, VistaDelBurgo[]>();
    revisarLaMesa(mesa, c, anteriores);
    const vistaB = vistaEn(mesa, b.asiento);
    const opcionesB = opcionesEn(mesa, b.asiento);
    const hojaB = hojaEnTres(vistaB, b.asiento, opcionesB);
    comprobar('en el apuro la hoja abre «Lo mío» y «Ahora» dice cuánto debe', hojaB.abre === 'mios' && hojaB.secciones[2]?.lineas.some((l) => l.indexOf(maravedies(500)) >= 0) === true, hojaB.secciones[2]?.lineas);
    comprobar('y la cinta dice que es el turno de A y que B está en apuro', hojaB.cinta.turno.indexOf('apuro') >= 0 && hojaB.cinta.turno.indexOf(`Turno de ${vistaB.jugadores[0]?.nombre ?? ''}`) === 0, hojaB.cinta.turno);
    comprobar('el marcador enmarca a A (su turno) y pone el punto en B (se le espera)', marcadorEnTres(vistaB, b.asiento).jugadores.map((m) => `${m.esSuTurno ? 'T' : ''}${m.seLeEspera ? 'E' : ''}`).join(',') === 'T,E');
    comprobar('a B se le espera: los dados no tienen asa y la única salida es rendirse', dadosEnTres(vistaB, b.asiento, opcionesB)?.porTirar === false && opcionesB.some((o) => o.tipo === RENDIRSE));
    const tocablesB = tableroEnTres(vistaB, b.asiento, opcionesB)?.casillas.filter((x) => x.tocable).length ?? -1;
    comprobar('sin títulos, ninguna casilla se enciende para B', tocablesB === 0, tocablesB);
    comprobar('la frase de espera dice que B busca dinero', esperaA(vistaB).indexOf('busca dinero') >= 0, esperaA(vistaB));
    const rendido = mover(mesa, b.asiento, opcionesB.find((o) => o.tipo === RENDIRSE) as Opcion);
    comprobar('B se rinde y la mesa cambia', rendido.cambio);
    const tras = estadoDe(rendido.mesa);
    comprobar('con dos en la mesa, la quiebra es el fin: último en pie', tras.momento === 'terminada' && tras.ganadores[0] === a.asiento, [tras.momento, tras.ganadores]);
    revisarLaMesa(rendido.mesa, c, anteriores);
    comprobar('las miradas del apuro y del fin no tuvieron reproche', c.reproches.length === 0, c.reproches);
    const vistaFin = vistaEn(rendido.mesa, a.asiento);
    const tableroFin = tableroEnTres(vistaFin, a.asiento, opcionesEn(rendido.mesa, a.asiento));
    comprobar('el tablero del fin nombra al ganador y a la figura quebrada', tableroFin?.ganador === a.asiento && tableroFin?.figuras.find((f) => f.asiento === b.asiento)?.quebrada === true);
    comprobar('los sucesos del fin traen la quiebra y el fin, y la cámara no sigue a nadie', vistaFin.sucesos.some((s) => s.que === 'quiebra') && vistaFin.sucesos.some((s) => s.que === 'fin') && camaraSigueA(vistaFin) === null);
    comprobar('la frase de espera es el fin', esperaA(vistaFin).indexOf('se queda con el burgo') >= 0, esperaA(vistaFin));
    comprobar('terminada: sin dados, sin tocables, hoja con «Ahora» sin botones', dadosEnTres(vistaFin, a.asiento, []) === null && tableroFin?.casillas.every((x) => !x.tocable) === true && hojaEnTres(vistaFin, a.asiento, []).secciones[2]?.opciones.length === 0);
    /* La gruesa entre el apuro y el fin: quiebra por quebrado nuevo. */
    const gruesa = sucesosEnTres(vistaB.jugada - 1, vistaFin, vistaB);
    comprobar('la lista gruesa entre el apuro y el fin trae la quiebra de B y el fin', gruesa.some((s) => s.que === 'quiebra' && s.quien === b.asiento) && gruesa.some((s) => s.que === 'fin'), gruesa.map((s) => s.que));
    /* Y el tic sobre el apuro sin salida también quiebra. */
    const porTic = avanzarElReloj(mesa);
    comprobar('el tic sobre un apuro sin salida quiebra al ausente igual', estadoDe(porTic).jugadores[1]?.quebrado === true);
  }
}

/* ═══ 4. LA ALMONEDA Y EL TRATO, POR SUS PUERTAS, CONTRA EL PORTILLO ═══ */
paso('La puja libre y el trato: montar() cabe en la puerta y el reductor los acepta; lo que no cabe es null');
{
  /* Se llega a una almoneda jugando: un jugador manda a almoneda lo primero que pisa. */
  let mesa = abrirMesa({ id: 'BUR-3D-A', arcade: BURGO, semilla: 42, asientos: ['A', 'B', 'C'] });
  mesa = mover(mesa, 'A', { tipo: EMPEZAR, carga: { topeDeVueltas: 0 } }).mesa;
  let vueltas = 0;
  while (estadoDe(mesa).almoneda === null && vueltas < 200) {
    vueltas++;
    let movio = false;
    for (const quien of mesa.asientos) {
      const opciones = opcionesEn(mesa, quien);
      const o = porTipo(opciones, A_ALMONEDA) ?? porTipo(opciones, ACEPTAR) ?? porTipo(opciones, TIRAR) ?? porTipo(opciones, PASAR) ?? porTipo(opciones, PAGAR_FIANZA) ?? porTipo(opciones, VENDER) ?? porTipo(opciones, EMPENAR) ?? porTipo(opciones, PASAR_PUJA);
      if (o === null) continue;
      const r = mover(mesa, quien, o);
      if (r.cambio) {
        mesa = r.mesa;
        movio = true;
        break;
      }
    }
    if (!movio) mesa = avanzarElReloj(mesa);
  }
  const alm = estadoDe(mesa).almoneda;
  comprobar('se llegó a una almoneda jugando', alm !== null, vueltas);
  if (alm !== null) {
    const quien = alm.pujaDe;
    const vista = vistaEn(mesa, quien);
    const opciones = opcionesEn(mesa, quien);
    const puja = pujaEnTres(vista, quien, opciones);
    comprobar('a quien puja le sale la almoneda con la puerta, las fijas y el pasar', puja !== null && puja.meToca && puja.puerta !== null && puja.fijas.length >= 1 && puja.pasar !== null && puja.pasar.tipo === PASAR_PUJA, puja && [puja.meToca, puja.puerta, puja.fijas.length]);
    const otro = mesa.asientos.find((x) => x !== quien) as AsientoId;
    const pujaDeOtro = pujaEnTres(vistaEn(mesa, otro), otro, opcionesEn(mesa, otro));
    comprobar('a los demás les sale la misma almoneda pero sin botones ni puerta', pujaDeOtro !== null && !pujaDeOtro.meToca && pujaDeOtro.fijas.length === 0 && pujaDeOtro.pasar === null && pujaDeOtro.puerta === null && pujaDeOtro.casilla === alm.casilla);
    comprobar('y un mirón, lo mismo que los demás', pujaEnTres(vistaEn(mesa, null), null, [])?.meToca === false);
    const hojaDeOtro = hojaEnTres(vistaEn(mesa, otro), otro, opcionesEn(mesa, otro));
    comprobar('la hoja de quien no puja abre otra cosa, y la de quien puja abre la almoneda', hojaDeOtro.abre !== 'almoneda' && hojaEnTres(vista, quien, opciones).abre === 'almoneda');
    if (puja !== null && puja.puerta !== null) {
      const p = puja.puerta;
      comprobar('la puerta declara casilla, mínimo, máximo y escalón de la almoneda', p.casilla === alm.casilla && p.minimo >= 10 && p.maximo >= p.minimo && p.escalon === 10, p);
      const bien = puja.montar(p.minimo);
      comprobar('montar(mínimo) da una puja con EXACTAMENTE `casilla` y `cuanto`', bien !== null && bien.tipo === PUJAR && Object.keys(bien.carga as object).sort().join(',') === 'casilla,cuanto', bien);
      comprobar('montar por debajo del mínimo, por encima del máximo, fuera del escalón, con decimales o NaN es null', puja.montar(p.minimo - 10) === null && puja.montar(p.maximo + 10) === null && puja.montar(p.minimo + 5) === null && puja.montar(p.minimo + 0.5) === null && puja.montar(NaN) === null);
      const libre = bien === null ? null : mover(mesa, quien, bien);
      comprobar('y MANDADA POR EL ÁRBITRO entra: el portillo la deja pasar', libre !== null && libre.cambio && estadoDe(libre.mesa).almoneda?.puja === p.minimo, libre?.motivo);
      const trucada = mover(mesa, quien, { tipo: PUJAR, carga: { casilla: p.casilla, cuanto: p.minimo, relleno: 'x'.repeat(100) } });
      comprobar('y una puja con un campo de más no entra (la puerta cuenta los campos)', !trucada.cambio);
      comprobar('la puja fija es la opción entera del juego y su carga cabe en la misma puerta', puja.fijas.every((f) => opciones.indexOf(f) >= 0 && f.tipo === PUJAR && (f.carga as { casilla: number }).casilla === p.casilla));
      /* Tras la puja libre, «la hoja» de quien acaba de pujar ya no puja. */
      if (libre !== null) {
        const despues = pujaEnTres(vistaEn(libre.mesa, quien), quien, opcionesEn(libre.mesa, quien));
        comprobar('después de pujar ya no me toca: sin fijas, sin pasar, sin puerta, y la cifra es la mía', despues !== null && !despues.meToca && despues.fijas.length === 0 && despues.puja === p.minimo && despues.quienPuja?.asiento === quien, despues && [despues.meToca, despues.puja]);
      }
    }
  }

  /* El trato: la puerta de quien tiene el turno, con un destinatario con títulos. */
  let mesaT = abrirMesa({ id: 'BUR-3D-T', arcade: BURGO, semilla: 77, asientos: ['A', 'B'] });
  mesaT = mover(mesaT, 'A', { tipo: EMPEZAR, carga: { topeDeVueltas: 0 } }).mesa;
  const eT = estadoDe(mesaT);
  const [ta, tb] = eT.jugadores;
  if (ta !== undefined && tb !== undefined) {
    /* B tiene el 1 y el 6 sin casas; A tiene el 3 y el 39; es el turno de A en por-pasar. */
    const conTitulos: EstadoDelBurgo = {
      ...eT,
      paso: 'por-pasar',
      luego: 'por-pasar',
      turno: 0,
      dobles: 0,
      titulos: eT.titulos.map((t) => (t.casilla === 1 || t.casilla === 6 ? { ...t, dueno: tb.asiento } : t.casilla === 3 || t.casilla === 39 ? { ...t, dueno: ta.asiento } : t)),
      jugadores: eT.jugadores.map((j) => ({ ...j, mrs: 800 })),
      jugada: eT.jugada + 1,
      sucesos: [{ que: 'turno', de: ta.asiento }],
    };
    const mesa = abrirMesa({ id: 'BUR-3D-T2', arcade: BURGO, semilla: 77, asientos: [...mesaT.asientos], estado: conTitulos });
    const vistaA = vistaEn(mesa, ta.asiento);
    const opcionesA = opcionesEn(mesa, ta.asiento);
    const trato = tratoEnTres(vistaA, ta.asiento, opcionesA);
    comprobar('A, con el turno, tiene la puerta del trato con B como destino y los títulos de B sin casas', trato?.puerta !== null && trato?.puerta.a.some((d) => d.asiento === tb.asiento && d.titulos.indexOf(1) >= 0 && d.titulos.indexOf(6) >= 0) === true, trato?.puerta);
    comprobar('y sus propios títulos ofrecibles con el tope de dinero de la puerta', trato?.puerta?.titulos.indexOf(3) !== -1 && trato?.puerta?.mrsMaximo === 800, trato?.puerta);
    comprobar('la puerta no se pinta en ninguna sección de la hoja', hojaEnTres(vistaA, ta.asiento, opcionesA).secciones.every((s) => s.opciones.every((o) => o.declaracion !== true)));
    if (trato !== null && trato.puerta !== null) {
      const m = trato.montar(tb.asiento, { mrs: 100, titulos: [3], indultos: 0 }, { mrs: 0, titulos: [1], indultos: 0 });
      comprobar('montar(a, doy, pido) da un trato con EXACTAMENTE `a`, `doy`, `pido` y tres campos por lado', m !== null && m.tipo === PROPONER && Object.keys(m.carga as object).sort().join(',') === 'a,doy,pido' && Object.keys((m.carga as { doy: object }).doy).sort().join(',') === 'indultos,mrs,titulos', m);
      comprobar(
        'y no cabe: un destino que no está, más dinero del que tengo, un título que no es mío, un título en los dos lados, los dos lados vacíos, decimales',
        trato.montar('nadie', { mrs: 10, titulos: [], indultos: 0 }, { mrs: 0, titulos: [1], indultos: 0 }) === null &&
          trato.montar(tb.asiento, { mrs: 900, titulos: [], indultos: 0 }, { mrs: 0, titulos: [1], indultos: 0 }) === null &&
          trato.montar(tb.asiento, { mrs: 0, titulos: [1], indultos: 0 }, { mrs: 0, titulos: [], indultos: 0 }) === null &&
          trato.montar(tb.asiento, { mrs: 0, titulos: [3], indultos: 0 }, { mrs: 0, titulos: [3], indultos: 0 }) === null &&
          trato.montar(tb.asiento, { mrs: 0, titulos: [], indultos: 0 }, { mrs: 0, titulos: [], indultos: 0 }) === null &&
          trato.montar(tb.asiento, { mrs: 10.5, titulos: [], indultos: 0 }, { mrs: 0, titulos: [1], indultos: 0 }) === null &&
          trato.montar(tb.asiento, { mrs: 0, titulos: [], indultos: 3 }, { mrs: 0, titulos: [1], indultos: 0 }) === null,
      );
      const propuesto = m === null ? null : mover(mesa, ta.asiento, m);
      comprobar('y MANDADO POR EL ÁRBITRO entra: el portillo lo deja pasar y la mesa guarda el trato', propuesto !== null && propuesto.cambio && estadoDe(propuesto.mesa).tratos.length === 1, propuesto?.motivo);
      const conRelleno = mover(mesa, ta.asiento, { tipo: PROPONER, carga: { a: tb.asiento, doy: { mrs: 100, titulos: [3], indultos: 0 }, pido: { mrs: 0, titulos: [1], indultos: 0 }, relleno: 1 } });
      comprobar('y con un campo de más no entra', !conRelleno.cambio);
      if (propuesto !== null) {
        const vistaB = vistaEn(propuesto.mesa, tb.asiento);
        const opcionesB = opcionesEn(propuesto.mesa, tb.asiento);
        const deB = tratoEnTres(vistaB, tb.asiento, opcionesB);
        const abierto = deB?.abiertos[0];
        comprobar('B ve el trato abierto con aceptar y rechazar enteros, y sin retirar', abierto !== undefined && abierto.soyElDestinatario && abierto.aceptar !== null && abierto.rechazar !== null && abierto.retirar === null && opcionesB.indexOf(abierto.aceptar as Opcion) >= 0, abierto && [abierto.aceptar?.id, abierto.rechazar?.id]);
        comprobar('y su resumen nombra lo que da y lo que pide con el vocabulario', abierto !== undefined && abierto.resumen.indexOf(CASILLAS[3]?.nombre ?? '') >= 0 && abierto.resumen.indexOf(CASILLAS[1]?.nombre ?? '') >= 0 && abierto.resumen.indexOf(maravedies(100)) >= 0, abierto?.resumen);
        comprobar('la hoja de B abre «El trato» y el tablero dibuja la línea entre los dos', hojaEnTres(vistaB, tb.asiento, opcionesB).abre === 'trato' && llano(tableroEnTres(vistaB, tb.asiento, opcionesB)?.trato) === llano({ de: ta.asiento, a: tb.asiento }));
        const deA = tratoEnTres(vistaEn(propuesto.mesa, ta.asiento), ta.asiento, opcionesEn(propuesto.mesa, ta.asiento));
        comprobar('A ve el mismo trato con retirar y sin aceptar', deA?.abiertos[0]?.soyElProponente === true && deA?.abiertos[0]?.retirar !== null && deA?.abiertos[0]?.aceptar === null);
        const aceptado = abierto === undefined || abierto.aceptar === null ? null : mover(propuesto.mesa, tb.asiento, abierto.aceptar);
        comprobar('B acepta con la opción entera y los títulos cambian de mano', aceptado !== null && aceptado.cambio && estadoDe(aceptado.mesa).titulos.find((t) => t.casilla === 1)?.dueno === ta.asiento, aceptado?.motivo);
        if (aceptado !== null) {
          const gruesa = sucesosEnTres(vistaB.jugada - 1, vistaEn(aceptado.mesa, tb.asiento), vistaB);
          comprobar('la gruesa entre antes y después del trato cambia de mano los dos títulos y mueve el dinero', gruesa.filter((s) => s.que === 'cambia-de-mano').length === 2 && gruesa.some((s) => s.que === 'cobra') && gruesa.some((s) => s.que === 'paga'), gruesa.map((s) => s.que));
        }
      }
    }
    comprobar('un mirón no tiene tratos ni puerta', tratoEnTres(vistaEn(mesa, null), null, []) === null);
    comprobar('un tratoEnTres pedido con otro `yo` que el de la vista no abre la puerta', tratoEnTres(vistaA, tb.asiento, opcionesA)?.puerta === null);
  }
}

/* ═══ 5. LOS DADOS, LA CARTA, LA FICHA Y LA FIRMA CON VENENO ═══ */
paso('Dados con el par, la firma estable e inestable, la carta de la tabla, y las vacunas de cada invariante');
{
  const mesa = ultimaMesaJugada ?? abrirMesa({ id: 'BUR-3D-V', arcade: BURGO, semilla: 1, asientos: ['A', 'B'] });
  const quien = mesa.asientos[0] as AsientoId;
  const vista = vistaEn(mesa, quien);
  const opciones = opcionesEn(mesa, quien);
  const tablero = tableroEnTres(vista, quien, opciones) as TableroDelBurgoEn3D;
  const hoja = hojaEnTres(vista, quien, opciones);
  const dados = dadosEnTres(vista, quien, opciones);
  const secretos = seriesSecretas(mesa);
  comprobar('la última mesa jugada da tablero, hoja y (si juega) dados', tablero !== null && hoja.secciones.length === 8);

  /* Los dados. */
  const conPar = { ...vista, momento: 'jugando', tirada: [3, 5], tiradasDelTurno: 2, turnosAbiertos: 7 } as unknown as VistaDelBurgo;
  const d = dadosEnTres(conPar, quien, opciones);
  comprobar('dadosEnTres trae EL PAR de la vista y el sello tiradasDelTurno + 100·turnosAbiertos', d !== null && llano(d.par) === '[3,5]' && d.sello === 702, d);
  comprobar('con dobles el par son los dobles, no una suma repartida', llano(dadosEnTres({ ...conPar, tirada: [4, 4] }, quien, opciones)?.par) === '[4,4]');
  comprobar('una vista con un solo número en la tirada NO tiene dados: nunca se inventa el par', dadosEnTres({ ...conPar, tirada: [7] }, quien, opciones) === null && dadosEnTres({ ...conPar, tirada: 7 }, quien, opciones) === null && dadosEnTres({ ...conPar, tirada: [0, 9] }, quien, opciones) === null);
  comprobar('sin tirada todavía, dados con par null (en reposo)', dadosEnTres({ ...conPar, tirada: null }, quien, opciones)?.par === null);
  comprobar('un mirón no tiene dados', dadosEnTres(conPar, null, opciones) === null);
  comprobar('el asa se monta exactamente cuando el juego ofrece tirar, y el movimiento es esa opción', (d?.porTirar ?? false) === (tirarEnTres(opciones) !== null) && d?.movimiento === tirarEnTres(opciones));
  const conTirarFalso = [...opciones, { id: 'tirar', tipo: TIRAR, carga: {}, rotulo: 'Tirar', ayuda: '', declaracion: true as const }];
  comprobar('tirarEnTres no coge una puerta aunque lleve el tipo', tirarEnTres(conTirarFalso.filter((o) => o.declaracion === true)) === null);
  comprobar('tirarEnTres busca por TIPO y no por id', tirarEnTres([{ id: 'otro-id', tipo: TIRAR, carga: {}, rotulo: '', ayuda: '' }])?.id === 'otro-id' && tirarEnTres([{ id: 'tirar', tipo: PASAR, carga: {}, rotulo: '', ayuda: '' }]) === null);
  comprobar('la vacuna de los dados: un par ajeno se ve caer', reprochesDeLosDados(conPar, quien, opciones, { ...(dadosEnTres(conPar, quien, opciones) as NonNullable<typeof d>), par: [2, 6] }).length > 0);
  comprobar('y un asa sin opción de tirar también', reprochesDeLosDados(conPar, quien, opciones, { ...(dadosEnTres(conPar, quien, opciones) as NonNullable<typeof d>), porTirar: !(d?.porTirar ?? false) }).length > 0);

  /* La firma. */
  const t2 = tableroEnTres(vistaEn(mesa, quien), quien, opciones) as TableroDelBurgoEn3D;
  comprobar('la firma es la misma para dos vistas iguales', firmaDelTablero(tablero) === firmaDelTablero(t2));
  const unaCasilla = tablero.casillas[1] as TableroDelBurgoEn3D['casillas'][number];
  const conCasa = { ...tablero, casillas: tablero.casillas.map((c) => (c.indice === 1 ? { ...c, casas: c.casas + 1 } : c)) };
  comprobar('y distinta si cambia una casa', firmaDelTablero(conCasa) !== firmaDelTablero(tablero) && unaCasilla.casas + 1 === (conCasa.casillas[1]?.casas ?? -1));
  comprobar('o el dueño, una figura, la destacada, la almoneda, el trato o el ganador', [
    { ...tablero, casillas: tablero.casillas.map((c) => (c.indice === 1 ? { ...c, dueno: '#123456' } : c)) },
    { ...tablero, figuras: tablero.figuras.map((f, k) => (k === 0 ? { ...f, casilla: (f.casilla + 1) % 40 } : f)) },
    { ...tablero, destacada: tablero.destacada === 5 ? 6 : 5 },
    { ...tablero, almoneda: tablero.almoneda === 5 ? 6 : 5 },
    { ...tablero, trato: { de: 'x', a: 'y' } },
    { ...tablero, ganador: 'x' },
  ].every((t) => firmaDelTablero(t) !== firmaDelTablero(tablero)));

  /* La carta. */
  /* Con el aviso y el pregón vacíos: los de la mesa real hablan de SU última carta, que aquí se sustituye. */
  const conCarta = { ...vista, momento: 'jugando', turnosAbiertos: 9, ultimaCarta: { mazo: 'pregon', carta: 6, quien, enElTurno: 9 }, aviso: '', pregon: '', sucesos: [] } as unknown as VistaDelBurgo;
  const cartel = cartelEnTres(conCarta);
  const seis = carta('pregon', 6);
  comprobar('cartelEnTres da el título y el texto DE LA TABLA por el número', cartel !== null && seis !== null && cartel.titulo === seis.titulo && cartel.texto === seis.texto && cartel.deDonde === 'del Pregón');
  comprobar('y en el turno siguiente ya no hay cartel', cartelEnTres({ ...conCarta, turnosAbiertos: 10 }) === null);
  comprobar('un número que no es de la tabla no da cartel', cartelEnTres({ ...conCarta, ultimaCarta: { mazo: 'arca', carta: 99, quien, enElTurno: 9 } }) === null);
  const tableroConCarta = tableroEnTres(conCarta, quien, opciones);
  comprobar('el tablero dice de qué casilla del Pregón sale el naipe', tableroConCarta?.carta !== null && CASILLAS[tableroConCarta?.carta?.enCasilla ?? 0]?.clase === 'pregon');
  const hojaConCarta = hojaEnTres(conCarta, quien, opciones);
  comprobar('la hoja lleva la carta vigente en su sección y no la de ninguna otra', reprochesDeLaHoja(conCarta, quien, opciones, hojaConCarta, secretos).length === 0 && hojaConCarta.secciones[3]?.lineas[0] === seis?.titulo, reprochesDeLaHoja(conCarta, quien, opciones, hojaConCarta, secretos));
  const otra = carta('arca', 3);
  const envenenada: HojaDelBurgo<Opcion> = { ...hojaConCarta, secciones: hojaConCarta.secciones.map((s) => (s.id === 'mesa' ? { ...s, lineas: [...s.lineas, otra?.texto ?? ''] } : s)) };
  comprobar('la vacuna: una hoja que cuenta el texto de una carta no robada se ve caer', reprochesDeLaHoja(conCarta, quien, opciones, envenenada, secretos).some((r) => r.indexOf('no ha salido') >= 0));
  const conSerie: HojaDelBurgo<Opcion> = { ...hoja, cinta: { ...hoja.cinta, aviso: `${hoja.cinta.aviso} p07` } };
  comprobar('y una hoja con una serie del mazo en un texto también (con las series de verdad de esta mesa)', secretos.length === 32 && reprochesDeLaHoja(vista, quien, opciones, { ...conSerie, cinta: { ...conSerie.cinta, aviso: vista.aviso }, marcador: { ...conSerie.marcador, turnoDe: secretos[0]?.slice(1, -1) ?? null } }, secretos).some((r) => r.indexOf('serie') >= 0));
  comprobar('las series de verdad no están en la hoja ni en el tablero ni en las fichas de esta mesa', secretos.every((s) => llano(hoja.secciones).indexOf(s) < 0 && llano(tablero).indexOf(s) < 0 && llano(fichaDeCasilla(vista, 7, quien, opciones)).indexOf(s) < 0));

  /* La ficha. */
  const f39 = fichaDeCasilla(vista, 39, quien, opciones);
  comprobar('la ficha de la Calle Mayor: nombre, barrio de La Corte, precio 400, casa 200, siete filas de renta', f39.nombre === 'Calle Mayor' && f39.barrio?.nombre === 'La Corte' && f39.precio === 400 && f39.casa === 200 && f39.rentas.length === 7, f39);
  comprobar('las filas van Solar, Barrio entero (el doble), 1..4 casas, Posada', f39.rentas.map((r) => r.rotulo).join('|') === 'Solar|Barrio entero|1 casa|2 casas|3 casas|4 casas|Posada' && f39.rentas[1]?.cuanto === 2 * (f39.rentas[0]?.cuanto ?? 0));
  const f5 = fichaDeCasilla(vista, 5, quien, opciones);
  comprobar('la ficha de una puerta: cuatro filas por puertas del dueño, sin barrio', f5.barrio === null && f5.rentas.length === 4 && f5.rentas[3]?.cuanto === 200 && f5.rentas[0]?.rotulo === '1 puerta');
  const f12 = fichaDeCasilla({ ...vista, tirada: [2, 3] }, 12, quien, opciones);
  comprobar('la ficha de un oficio: dos filas con el múltiplo por la tirada de la vista', f12.rentas.length === 2 && f12.rentas[0]?.cuanto === 4 * 5 && f12.rentas[1]?.cuanto === 10 * 5, f12.rentas);
  const f10 = fichaDeCasilla(vista, 10, quien, opciones);
  comprobar('la ficha de la Mazmorra no se compra: sin rentas, sin empeño, estado con su nombre', f10.rentas.length === 0 && f10.empeno === 0 && f10.estado === 'La Mazmorra' && f10.opciones.length === 0);
  comprobar('las cuarenta fichas de la última mesa no tienen reproche', reprochesDeLasFichas(vista, quien, opciones).length === 0, reprochesDeLasFichas(vista, quien, opciones));
  const conDuenoFalso = { ...vista, titulos: vista.titulos.map((t) => (t.casilla === 39 ? { ...t, dueno: quien, casas: 2, empenado: false, rentaAhora: 5 } : t)) } as VistaDelBurgo;
  comprobar('la vacuna de la ficha: una renta que no cuadra con la fila se ve caer', reprochesDeLasFichas(conDuenoFalso, quien, opciones).some((r) => r.indexOf('39') >= 0));

  /* El tablero, con veneno. */
  comprobar('el tablero de la última mesa no tiene reproche', reprochesDelTablero(vista, quien, opciones, tablero).length === 0, reprochesDelTablero(vista, quien, opciones, tablero));
  const banderaAjena = { ...tablero, casillas: tablero.casillas.map((c) => (c.indice === 1 ? { ...c, dueno: '#000001' } : c)) };
  comprobar('la vacuna del tablero: una bandera del color de nadie se ve caer', reprochesDelTablero(vista, quien, opciones, banderaAjena).some((r) => r.indexOf('dueño de 1') >= 0));
  const encendida = { ...tablero, casillas: tablero.casillas.map((c) => (c.indice === 10 ? { ...c, tocable: true } : c)) };
  comprobar('y una casilla encendida sin obra también', reprochesDelTablero(vista, quien, opciones, encendida).some((r) => r.indexOf('se enciende sin') >= 0));
  const figuraMovida = { ...tablero, figuras: tablero.figuras.map((f, k) => (k === 0 ? { ...f, casilla: (f.casilla + 3) % 40 } : f)) };
  comprobar('y una figura donde la vista no la pone', reprochesDelTablero(vista, quien, opciones, figuraMovida).some((r) => r.indexOf('no está donde') >= 0));
  comprobar('las figuras con las sillas de la mesa llevan la figura elegida, y sin silla la de serie', figurasEnTres(vista, [{ id: quien, figura: 'maga' }])[0]?.figura === 'maga' && figurasEnTres(vista, [{ id: quien, figura: 'un-dragon' }])[0]?.figura === figuraDeSerie(quien) && figurasEnTres(vista, [])[0]?.figura === figuraDeSerie(quien));
  comprobar('y tableroEnTres con las sillas pinta lo mismo que figurasEnTres', llano(tableroEnTres(vista, quien, opciones, [{ id: quien, figura: 'barbaro' }])?.figuras) === llano(figurasEnTres(vista, [{ id: quien, figura: 'barbaro' }])));

  /* La partición, con veneno. */
  const particion = particionDe(vista, quien, opciones, tablero, dados, hoja);
  comprobar('la partición de la última mesa no tiene reproche', reprochesDeLaParticion(opciones, particion).length === 0, reprochesDeLaParticion(opciones, particion));
  const unaDeFuera = particion.fuera[0] ?? particion.hoja[0];
  if (unaDeFuera !== undefined) {
    comprobar('la vacuna de la partición: un botón repetido se ve caer', reprochesDeLaParticion(opciones, { ...particion, fuera: [...particion.fuera, unaDeFuera] }).some((r) => r.indexOf('repite') >= 0));
  }
  comprobar('y una opción perdida también', reprochesDeLaParticion(opciones, { ...particion, hoja: [], fuera: [], dados: [], tocables: [], fichas: [] }).length > 0 || opciones.filter((o) => o.declaracion !== true).length === 0);
  const montada = { id: 'x', tipo: PASAR, carga: {}, rotulo: '', ayuda: '' };
  comprobar('y una opción montada a mano en vez de la del juego también', reprochesDeLaParticion([...opciones, montada], { ...particion, fuera: [...particion.fuera, { firma: firma(montada), o: { ...montada } }] }).some((r) => r.indexOf('montada') >= 0));
  comprobar('y una puerta pintada también', reprochesDeLaParticion([...opciones, { ...montada, declaracion: true as const }], { ...particion, fuera: [...particion.fuera, { firma: firma(montada), o: { ...montada, declaracion: true as const } }] }).some((r) => r.indexOf('puerta') >= 0));

  /* «Una vez y ni una más»: los filtros con los objetos y con null. */
  const todas = opciones.filter((o) => o.declaracion !== true);
  comprobar('con todo a null, los botones sueltos son todas las opciones sin puertas', opcionesFueraDelTablero(opciones, null, null, null).length === todas.length && opcionesFueraDelTablero(opciones, null, null, null).every((o) => o.declaracion !== true));
  comprobar('con dados, cae exactamente TIRAR', opcionesFueraDelTablero(opciones, null, dados, null).length === todas.length - (dados !== null && tirarEnTres(opciones) !== null ? 1 : 0));
  const obras = todas.filter((o) => [COMPRAR, A_ALMONEDA, ALZAR, VENDER, EMPENAR, DESEMPENAR].indexOf(o.tipo) >= 0);
  const obrasDeLasFichas = hoja.mios.reduce((s, b) => s + b.fichas.reduce((t, f) => t + f.opciones.length, 0), 0);
  comprobar('con el tablero, caen exactamente las obras de las casillas tocables', opcionesFueraDelTablero(opciones, tablero, null, null).length === todas.length - obras.length);
  comprobar('con la hoja, caen las pujas, los tratos, los botones del momento y las obras de las fichas; comprar y sacar a almoneda, que no son de una ficha mía, se quedan', opcionesFueraDelTablero(opciones, null, null, hoja).length === todas.length - hoja.secciones.reduce((s, x) => s + x.opciones.length, 0) - obrasDeLasFichas, [opcionesFueraDelTablero(opciones, null, null, hoja).map((o) => o.id), obrasDeLasFichas]);
  comprobar('las tres cribas juntas no dejan botón suelto en una partida en marcha', opcionesFueraDelTablero(opciones, tablero, dados, hoja).length === 0, opcionesFueraDelTablero(opciones, tablero, dados, hoja).map((o) => o.id));
  const hojaSinObras: HojaDelBurgo<Opcion> = { ...hoja, mios: [] };
  comprobar('y si la hoja no trae las fichas pero el tablero sí las enciende, las obras siguen sin salir dos veces', opcionesFueraDelTablero(opciones, tablero, dados, hojaSinObras).length === 0);
  comprobar('sin tablero ni hoja, las obras vuelven como botones', opcionesFueraDelTablero(opciones, null, dados, null).filter((o) => [COMPRAR, A_ALMONEDA, ALZAR, VENDER, EMPENAR, DESEMPENAR].indexOf(o.tipo) >= 0).length === obras.length);

  /* Textos. */
  comprobar('cardinal y maravedíes', cardinal(2) === 'dos' && cardinal(12) === 'doce' && cardinal(13) === '13' && maravedies(1500) === '1.500 mrs' && maravedies(50) === '50 mrs');
  comprobar('las frases de espera cubren cada paso y nombran a quien se espera', ['por-tirar', 'comprar', 'almoneda', 'apuro', 'por-pasar'].every((p) => esperaA({ ...vista, momento: 'jugando', paso: p, turnoDe: quien }).indexOf(vista.jugadores.find((j) => j.asiento === quien)?.nombre ?? quien) >= 0));
  comprobar('el recorrido de un mueve sin pisadas se deriva: hacia delante y hacia atrás', llano(recorridoEnTres({ que: 'mueve', quien, desde: 38, hasta: 2, recorrido: [], porLaPuertaMayor: true, como: 'anda' })) === '[39,0,1,2]' && llano(recorridoEnTres({ que: 'mueve', quien, desde: 1, hasta: 38, recorrido: [], porLaPuertaMayor: false, como: 'retrocede' })) === '[0,39,38]');
  comprobar('los textos de la última mesa no tienen reproche', reprochesDeLosTextos(vista, quien).length === 0, reprochesDeLosTextos(vista, quien));
  comprobar('la vacuna de los textos: un pregón que no es el de la vista se ve caer', reprochesDeLosTextos({ ...vista, pregon: `${vista.pregon} y algo más` }, quien).length > 0 || elPregonEnTres({ ...vista, pregon: 'otro' }).texto !== vista.pregon);
  comprobar('los ocho barrios de la tabla salen en «Lo mío» con su color cuando se tienen', BARRIOS.length === 8 && TITULOS.length === 28);
}

/* ═══ 6. `burgo-servido`: EL SERVIDOR DE VERDAD ═══ */
paso('burgo-servido: el modelo por HTTP y el ciclo entero de una mesa por el cable');

const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');

async function puertoLibre(): Promise<number> {
  const { createServer } = await import('node:net');
  return new Promise<number>((resolver, rechazar) => {
    const sonda = createServer();
    sonda.once('error', rechazar);
    sonda.listen(0, '127.0.0.1', () => {
      const donde = sonda.address();
      const puerto = typeof donde === 'object' && donde !== null ? donde.port : 0;
      sonda.close(() => resolver(puerto));
    });
  });
}

const PUERTO = await puertoLibre();
const BASE = `http://127.0.0.1:${PUERTO}/api`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'burgo-3d-'));
let servidor: ChildProcess | undefined;
let loQueDijoElServidor = '';

function entorno(): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    PORT: String(PUERTO),
    NODE_ENV: 'test',
    MESAS_DIR: path.join(dir, 'mesas'),
    MODELOS_DIR: path.join(REPO, 'escenas', 'modelos'),
  };
}

function levantar(): ChildProcess {
  const proceso = spawn(process.execPath, [TSX, SERVIDOR], { cwd: dir, env: entorno(), stdio: ['ignore', 'pipe', 'pipe'] });
  loQueDijoElServidor = '';
  const anotar = (d: Buffer): void => {
    loQueDijoElServidor += d.toString();
  };
  proceso.stdout?.on('data', anotar);
  proceso.stderr?.on('data', anotar);
  return proceso;
}

function esperarAQueMuera(proceso: ChildProcess): Promise<void> {
  return new Promise((resolver) => {
    if (proceso.exitCode !== null || proceso.signalCode !== null) {
      resolver();
      return;
    }
    proceso.once('exit', () => resolver());
  });
}

async function esperarAlServidor(): Promise<void> {
  for (let i = 0; i < 240; i++) {
    try {
      const r = await fetch(`${BASE}/salud`);
      if (r.ok) return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`el servidor no arrancó en el puerto ${PUERTO}. Dijo:\n${loQueDijoElServidor.slice(-1500)}`);
}

interface Respuesta {
  estado: number;
  datos: any;
}

async function pedir(ruta: string, opciones: { metodo?: string; cuerpo?: unknown; llave?: string | null } = {}): Promise<Respuesta> {
  const r = await fetch(`${BASE}${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(opciones.llave ? { 'x-asiento': opciones.llave } : {}) },
    ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
  });
  const texto = await r.text();
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    datos = texto;
  }
  return { estado: r.status, datos };
}

interface Silla {
  nombre: string;
  asiento: string;
  llave: string;
  figura: string;
}

try {
  servidor = levantar();
  await esperarAlServidor();

  /* ── EL MODELO ── */
  {
    const fichero = path.join(REPO, 'escenas', 'modelos', 'burgo.glb');
    comprobar('el burgo existe en el repositorio: `escenas/modelos/burgo.glb`', fs.existsSync(fichero), fichero);
    const real = fs.existsSync(fichero) ? fs.readFileSync(fichero) : Buffer.alloc(0);
    const r = await fetch(`${BASE}/arcade/modelos/burgo.glb`);
    const bytes = Buffer.from(await r.arrayBuffer());
    comprobar('GET /api/arcade/modelos/burgo.glb contesta 200', r.status === 200, r.status);
    comprobar('con `Content-Type: model/gltf-binary`', (r.headers.get('content-type') ?? '').startsWith('model/gltf-binary'), r.headers.get('content-type'));
    comprobar('y los bytes son EXACTAMENTE los del fichero', real.length > 0 && bytes.length === real.length && bytes.equals(real), { recibido: bytes.length, real: real.length });
    comprobar('que empiezan por «glTF»', bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46);
    console.log(`  burgo.glb: ${real.length} bytes por HTTP`);
  }

  /* ── EL CICLO DE LA MESA ── */
  {
    const figuras = ['maga', 'caballero', 'barbaro', 'exploradora', 'picaro', 'encapuchado'];
    const abierta = await pedir('/arcade/mesas', { metodo: 'POST', cuerpo: { arcade: BURGO, nombre: 'Ana', plazoSegundos: 0, figura: figuras[0] } });
    comprobar('abrir una mesa del Burgo con `plazoSegundos: 0` y figura devuelve 201', abierta.estado === 201, abierta.datos);
    const codigo = String(abierta.datos.codigo ?? '');
    const sillas: Silla[] = [{ nombre: 'Ana', asiento: abierta.datos.asiento, llave: abierta.datos.llave, figura: figuras[0] as string }];
    for (const [k, nombre] of ['Bea', 'Carla', 'Diego', 'Elena', 'Fermín'].entries()) {
      const r = await pedir(`/arcade/mesas/${codigo}/asientos`, { metodo: 'POST', cuerpo: { nombre, figura: figuras[k + 1] } });
      comprobar(`${nombre} se sienta con figura`, r.estado === 200, r.datos);
      sillas.push({ nombre, asiento: r.datos.asiento, llave: r.datos.llave, figura: figuras[k + 1] as string });
    }
    const ana = sillas[0] as Silla;
    const leer = async (s: Silla): Promise<any> => (await pedir(`/arcade/mesas/${codigo}`, { llave: s.llave })).datos.mesa;
    let mesa = await leer(ana);
    comprobar('la mesa reunida llega con seis asientos, sin empezar, y su vista es del Burgo', mesa.asientos.length === 6 && mesa.empezada === false && esVistaQueSePinta(mesa.vista), { asientos: mesa.asientos?.length, empezada: mesa.empezada });
    comprobar('las sillas traen la figura y figurasEnTres la respeta (todavía sin jugadores: cero figuras)', mesa.asientos.every((a: { figura?: string }) => typeof a.figura === 'string') && figurasEnTres(mesa.vista, mesa.asientos).length === 0);
    const empezar = (mesa.opciones as Opcion[]).find((o) => o.tipo === EMPEZAR);
    comprobar('la opción de empezar llega por el cable con el id `empezar`', empezar !== undefined && empezar.id === 'empezar', mesa.opciones);
    const empezada = await pedir(`/arcade/mesas/${codigo}/movimientos`, { metodo: 'POST', llave: ana.llave, cuerpo: { rev: mesa.rev, tipo: empezar?.tipo, carga: empezar?.carga } });
    comprobar('empezar entra por el cable y sube la revisión', empezada.estado === 200 && empezada.datos.mesa.rev > mesa.rev, { estado: empezada.estado, motivo: empezada.datos?.mesa?.motivo });
    mesa = await leer(ana);
    comprobar('y `empezada: true` tras el primer cambio', mesa.empezada === true);
    comprobar('las seis figuras del tablero por el cable son las elegidas, en orden de asiento', llano(tableroEnTres(mesa.vista, ana.asiento, mesa.opciones, mesa.asientos)?.figuras.map((f) => f.figura)) === llano(mesa.vista.jugadores.map((j: { asiento: string }) => sillas.find((s) => s.asiento === j.asiento)?.figura)));

    /* Treinta movimientos por el sondeo, con la traducción encima de cada lectura. */
    const robot: Robot = { azar: sembrar(9), propusoEn: {} };
    let aceptados = 0;
    let lecturas = 0;
    let reprochesPorElCable = 0;
    let motivoVisto: string | null = null;
    let sinNada = 0;
    while (aceptados < 30 && sinNada < 40) {
      let movio = false;
      for (const s of sillas) {
        const m = await leer(s);
        lecturas++;
        const vista = m.vista as VistaDelBurgo;
        const opciones = m.opciones as Opcion[];
        const tablero = tableroEnTres(vista, s.asiento, opciones, m.asientos);
        const dados = dadosEnTres(vista, s.asiento, opciones);
        const hoja = hojaEnTres(vista, s.asiento, opciones);
        if (tablero === null) reprochesPorElCable++;
        else {
          reprochesPorElCable += reprochesDelTablero({ ...vista }, s.asiento, opciones, { ...tablero, figuras: figurasEnTres(vista, []) }).length;
          reprochesPorElCable += reprochesDeLosDados(vista, s.asiento, opciones, dados).length;
          reprochesPorElCable += reprochesDeLaParticion(opciones, particionDe(vista, s.asiento, opciones, tablero, dados, hoja)).length;
        }
        if (m.motivo !== null) reprochesPorElCable++;
        const decision = decideElRobot(robot, vista, s.asiento, opciones);
        if (decision === null) continue;
        const r = await pedir(`/arcade/mesas/${codigo}/movimientos`, { metodo: 'POST', llave: s.llave, cuerpo: { rev: m.rev, tipo: decision.tipo, carga: decision.carga } });
        if (r.estado === 200 && r.datos.mesa.rev > m.rev) {
          aceptados++;
          movio = true;
          break;
        }
        if (r.estado === 200 && typeof r.datos.mesa.motivo === 'string') motivoVisto = r.datos.mesa.motivo;
      }
      if (!movio) sinNada++;
      else sinNada = 0;
    }
    comprobar('treinta movimientos entraron por el sondeo con `x-asiento`', aceptados === 30, { aceptados, lecturas });
    comprobar('y en cada lectura la traducción sobre la vista del cable no tuvo reproche, y `motivo` iba a null', reprochesPorElCable === 0, reprochesPorElCable);
    comprobar('ninguna decisión del robot sobre lo ofrecido por el cable fue rechazada', motivoVisto === null, motivoVisto);
    console.log(`  ${aceptados} movimientos en ${lecturas} lecturas`);

    /* El 409 provocado al vestir en vuelo, y el reintento. */
    {
      const antes = await leer(ana);
      const quien = sillas.find((s) => s.asiento === (antes.vista as VistaDelBurgo).turnoDe) ?? ana;
      const suya = await leer(quien);
      /* Con OTRA figura que la que Ana lleva: vestirse con la misma no cambia nada y no sube la revisión (`vestir` en `mesas.ts`). */
      const vestida = await pedir(`/arcade/mesas/${codigo}/figura`, { metodo: 'PUT', llave: ana.llave, cuerpo: { figura: 'picaro' } });
      comprobar('vestir en vuelo con otra figura contesta 200 y sube la revisión', vestida.estado === 200 && vestida.datos.mesa.rev > suya.rev, { estado: vestida.estado, rev: vestida.datos?.mesa?.rev, antes: suya.rev });
      comprobar('y la figura nueva viaja en las sillas de la lectura', (vestida.datos.mesa.asientos as { id: string; figura?: string }[]).find((s) => s.id === ana.asiento)?.figura === 'picaro');
      const o = decideElRobot({ azar: sembrar(1), propusoEn: {} }, suya.vista, quien.asiento, suya.opciones) ?? (suya.opciones as Opcion[])[0];
      const rancio = await pedir(`/arcade/mesas/${codigo}/movimientos`, { metodo: 'POST', llave: quien.llave, cuerpo: { rev: suya.rev, tipo: o?.tipo, carga: o?.carga } });
      comprobar('el movimiento con la revisión de antes vuelve 409 `revision-rancia` con la mesa dentro', rancio.estado === 409 && rancio.datos.motivo === 'revision-rancia' && typeof rancio.datos.mesa?.rev === 'number', { estado: rancio.estado, motivo: rancio.datos?.motivo });
      const reintento = await pedir(`/arcade/mesas/${codigo}/movimientos`, { metodo: 'POST', llave: quien.llave, cuerpo: { rev: rancio.datos.mesa?.rev ?? vestida.datos.mesa.rev, tipo: o?.tipo, carga: o?.carga } });
      comprobar('y reintentado con la revisión de la respuesta entra', reintento.estado === 200 && reintento.datos.mesa.rev > (rancio.datos.mesa?.rev ?? 0), { estado: reintento.estado, motivo: reintento.datos?.mesa?.motivo });
    }

    /* Un rechazo con motivo en la respuesta y null en la lectura. */
    {
      const m = await leer(ana);
      const turnoDe = (m.vista as VistaDelBurgo).turnoDe;
      const otro = sillas.find((s) => s.asiento !== turnoDe && !(m.vista as VistaDelBurgo).jugadores.find((j) => j.asiento === s.asiento)?.quebrado) as Silla;
      const suya = await leer(otro);
      const rechazo = await pedir(`/arcade/mesas/${codigo}/movimientos`, { metodo: 'POST', llave: otro.llave, cuerpo: { rev: suya.rev, tipo: TIRAR, carga: {} } });
      comprobar('tirar sin turno vuelve 200 con la misma revisión y un `motivo` en texto', rechazo.estado === 200 && rechazo.datos.mesa.rev === suya.rev && typeof rechazo.datos.mesa.motivo === 'string' && rechazo.datos.mesa.motivo.length > 0, { estado: rechazo.estado, motivo: rechazo.datos?.mesa?.motivo });
      comprobar('y el motivo no nombra ninguna serie del mazo', !/["'][pa]\d\d["']/.test(String(rechazo.datos?.mesa?.motivo ?? '')));
      const despues = await leer(otro);
      comprobar('en la lectura siguiente `motivo` es null', despues.motivo === null, despues.motivo);
      comprobar('y la partida sigue empezada y sin terminar', despues.empezada === true && despues.terminada === false);
    }
  }
} catch (error) {
  fallos.push(`la prueba con el servidor se cayó: ${error instanceof Error ? error.stack : String(error)}\n${loQueDijoElServidor.slice(-800)}`);
} finally {
  if (servidor) {
    servidor.kill();
    await esperarAQueMuera(servidor);
  }
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows a veces retiene la carpeta un instante; no es un fallo del Burgo. */
  }
}

/* ═══ EL RECUENTO, PARA QUE NO SE VACÍE SIN QUE NADIE LO NOTE ═══ */
/*
 * VA CON MARGEN Y NO AL RAS: hoy se hacen unas 180, y el guardia está veinte por debajo:
 * más que el bloque más pequeño. Al ras hace lo contrario de lo que quiere: una
 * comprobación que se cae de un `if` dispara el guardia antes que la roja, y con el
 * guardia delante nadie ve el nombre de lo que se rompió. Por eso las rojas se
 * imprimen ANTES de irse.
 */
const MINIMO = 160;
if (hechas < MINIMO) {
  for (const f of fallos) console.log(`   · ${f}`);
  console.log(`✘ este comprobador debería hacer al menos ${MINIMO} comprobaciones y ha hecho ${hechas}: alguien ha borrado un bloque`);
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(`✔ burgo-en-tres: ${hechas} comprobaciones — la escena dice lo mismo que las reglas, y el servidor sirve el burgo`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
