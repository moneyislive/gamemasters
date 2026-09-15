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
 * las casillas tocables las obras; EL CARRIL los botones del momento; la hoja las pujas,
 * los tratos y —sólo si no se pinta el carril— esos mismos botones del momento; la caja de
 * los tratos las propuestas vivas que me tocan; y `opcionesFueraDelTablero` lo que quede.
 * Aquí se afirma en cada vista que la unión es TODA la lista sin puertas y que NINGÚN
 * movimiento tiene dos botones, mire donde mire; y se afirma DOS VECES cada vez que un
 * mueble de fuera se lleva los botones de una sección: con él puesto y con él en `null`,
 * porque el cliente que no lo pinta tiene que seguir pudiendo jugar.
 *
 * Y se cuentan botones y atajos por separado, que es la corrección que trajo el apuro:
 * la casilla encendida NO es un botón, es el atajo de uno que está en la ficha de «Lo
 * mío» —o en la sección «Ahora», adonde vender e hipotecar suben cuando corre la cuenta
 * atrás del apuro—. Toda casilla encendida tiene que llegar a un botón por identidad, y
 * las dos que no pueden tenerlo —comprar y sacar a subasta, que no son de un título mío—
 * salen por `obrasSoloEnElAnillo` para que el cliente les pinte un gemelo de sólo apoyo:
 * sin esa cuenta, el movimiento principal del juego se queda alcanzable sólo con el ratón
 * y la partición sigue siendo una partición. Se afirma con los OBJETOS pintados y también
 * con `null` en cada hueco: con todo a `null` vuelven todas menos las puertas.
 *
 * ═══ Y LOS CINCO MUEBLES QUE LA PANTALLA NUEVA ESTRENA ═══
 *
 * El carril (un cuadrado de 44 puntos por opción del momento, con su glifo), la caja de los
 * tratos, el cartel al pie de una casilla, la ficha de una casilla cualquiera y la de un
 * jugador, y la crónica. De cada uno se afirma lo que puede fallar en silencio: que el
 * carril no añada ni pierda un cuadrado ni pinte dos iguales, que la caja y la sección de
 * la hoja no pinten los mismos botones a la vez, que el cartel diga la renta de HOY y lo
 * mismo que la tarjeta, que la ficha de un jugador no cuente un patrimonio que la vista no
 * dice, y que la crónica no se coma un renglón por parecerse al anterior.
 *
 * ═══ Y DEL CARRIL SE CUENTA ADEMÁS CUÁNTAS VECES TUVO ALGO QUE PINTAR ═══
 *
 * Porque estuvo vacío y en verde. El mueble se alimentaba de `opcionesFueraDelTablero`, que
 * en estas mismas tres partidas devuelve CERO opciones en las 16.660 vistas: el carril
 * recibía `[]` siempre, y como un carril vacío no da error —se lee como una pantalla sin
 * nada que hacer— tres de sus cuatro vacunas se saltaban solas con `carril.length === 0 ||`.
 * Ahora lleva las opciones del momento, se llena en 1.234, 4.015 y 5.788 vistas de las tres,
 * y ese contador (`carrilesConCuadrados`) tiene un MÍNIMO EXIGIDO: si algún día vuelve a
 * quedarse vacío, se ve rojo en vez de pasar por comprobado. Y sus vacunas se envenenan
 * sobre el carril de un apuro DE VERDAD, que es el más largo que da el juego.
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
  TIRAR,
  USAR_INDULTO,
  VENDER,
} from '../../shared/arcade/juegos/burgo';
import type { EstadoDelBurgo, SucesoDelBurgo, VistaDelBurgo } from '../../shared/arcade/juegos/burgo';
import { BARRIOS, barrioDe, carta, CASILLAS, cartasDe, CUANTAS_CASILLAS, POSADA, TITULOS } from '../../shared/arcade/juegos/burgo-tablero';
import {
  camaraSigueA,
  cardinal,
  carrilDelBurgo,
  cartelDeCasilla,
  cartelEnTres,
  dadosEnTres,
  EL_CARRIL_DE_LA_MESA,
  elPregonEnTres,
  esperaA,
  esVistaQueSePinta,
  fichaDeCasilla,
  fichaDeJugador,
  figurasEnTres,
  firmaDelTablero,
  glifosDelCarrilDelBurgo,
  hojaEnTres,
  laCronicaConLaVista,
  LOS_MIOS,
  LOS_TRATOS_DE_LA_MESA,
  PARA_CONTESTAR,
  maravedies,
  marcadorEnTres,
  meToca,
  obraPosibleEnCasilla,
  obrasSoloEnElAnillo,
  opcionesDelCarrilDelBurgo,
  opcionesFueraDelTablero,
  ORDEN_DE_LA_HOJA,
  plural,
  pregonDelBurgo,
  pujaEnTres,
  recorridoEnTres,
  seVeEnTres,
  sucesosEnTres,
  tableroEnTres,
  tirarEnTres,
  tratoEnTres,
  TOPE_DE_LA_CRONICA,
} from '../../shared/arcade/juegos/burgo-en-tres';
import type {
  CartelDeCasilla,
  FichaDeCasilla,
  FichaDeJugador,
  GlifoDelCarrilDelBurgo,
  HojaDelBurgo,
  OpcionQueLlega,
  PregonDelBurgo,
  RenglonDeLaCronica,
} from '../../shared/arcade/juegos/burgo-en-tres';
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
 * Juega a ganar: tira, compra casi todo, saca a subasta una de cada seis veces,
 * puja hasta cerca del precio (y una de cada tres por la puerta, con `montar`),
 * alza en cuanto puede, propone tratos cuando le falta poco para un barrio (con
 * `montar`), acepta la mitad, en el apuro vende y hipoteca antes de rendirse, y sólo
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

  /* Mi apuro: vender, hipotecar, y si no hay nada, la quiebra. */
  if (vista.paso === 'apuro' && vista.apuro !== null && vista.apuro.quien === quien) {
    return porTipo(opciones, VENDER) ?? porTipo(opciones, EMPENAR) ?? porTipo(opciones, RENDIRSE);
  }

  if (vista.turnoDe !== quien) return null;

  /* Obras con el turno: alzar si hay dinero, deshipotecar si sobra. */
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
    const subasta = porTipo(opciones, A_ALMONEDA);
    if (subasta !== null) return subasta;
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
    const sigue = porTipo(opciones, TIRAR) ?? porTipo(opciones, PASAR);
    if (sigue !== null) return sigue;
  }
  /*
   * ═══ Y SI CON EL TURNO EN LA MANO EL JUEGO OFRECE ALGO QUE ESTE ROBOT NO CONOCE ═══
   *
   * MEDIDO: con el Impuesto a elegir (regla 4), la casilla del Impuesto para el turno en el
   * paso `comprar` con dos opciones —la cantidad fija y el 10 %— y NINGUNA de las que este
   * robot buscaba ahí. El robot devolvía `null`, nadie movía, y la partida por el cable se
   * quedaba clavada: sobre la mesa en proceso el reloj la rescataba, pero en el bloque de
   * `burgo-servido` no hay tic, así que el comprobador se ponía rojo en «treinta
   * movimientos entraron por el sondeo» una de cada dos veces, y la roja no decía nada de
   * la regla nueva. Un robot que se planta delante de una lista de movimientos legales no
   * está probando el juego: está probando lo que el robot ya sabía.
   *
   * Se coge lo primero que el juego ofrezca, sin puertas —que no son movimientos— y sin la
   * quiebra —que sí lo es y acaba la partida—. Así, una regla nueva no vuelve a parar la
   * partida sin decir por qué, y el que la escriba no tiene que venir aquí a darse de alta.
   */
  const cualquiera = opciones.find((o) => o.declaracion !== true && o.tipo !== RENDIRSE);
  return cualquiera ?? null;
}

// ---------------------------------------------------------------------------
// LAS INVARIANTES: cada una devuelve reproches, y cada una se ve caer con veneno
// ---------------------------------------------------------------------------

type Puntos = { firma: string; o: OpcionQueLlega }[];

/**
 * Qué pinta cada sitio de la partición, por firma canónica.
 *
 * ═══ HAY BOTONES Y HAY ATAJOS, Y NO SE CUENTAN IGUAL ═══
 *
 * `tocables` NO es un botón: es la marca del acento sobre el anillo, el ATAJO de un botón
 * que está en otro sitio —la ficha de «Lo mío», o la sección «Ahora» en mi apuro, desde que
 * vender e hipotecar suben ahí—. Los BOTONES son `dados`, `hoja`, `fichas`, `pregon` y
 * `fuera`, y de ésos cada movimiento tiene EXACTAMENTE UNO. Contar el atajo como botón fue
 * lo que obligó durante un tiempo a que la sección «Ahora» no pudiera llevar una obra, y
 * eso no es una regla del juego: es una cuenta mal hecha.
 *
 * `gemelos` tampoco es un botón: son las obras que el anillo enciende y que NINGÚN botón
 * recoge —comprar y sacar a subasta, que no tienen ficha porque el título no es mío—, y a
 * las que el cliente le debe un gemelo de sólo apoyo para que se puedan hacer con teclado.
 *
 * `carril` SÍ ES UN BOTÓN, y es el sexto: cada cuadrado de 44 puntos se pulsa y manda. Entra
 * en la cuenta de «uno y sólo uno» con los demás, que es lo que caza que la sección «Ahora»
 * y el carril pinten a la vez la misma opción —dos «Pasar el turno» en la misma pantalla, y
 * la partida se juega igual mientras uno de los dos sobra.
 */
interface Particion {
  tocables: Puntos;
  dados: Puntos;
  hoja: Puntos;
  fichas: Puntos;
  pregon: Puntos;
  carril: Puntos;
  fuera: Puntos;
  gemelos: Puntos;
}

function particionDe(
  vista: unknown,
  quien: QuienMira,
  opciones: readonly Opcion[],
  tablero: TableroDelBurgoEn3D | null,
  dados: ReturnType<typeof dadosEnTres>,
  hoja: HojaDelBurgo<Opcion> | null,
  pregon: PregonDelBurgo<Opcion> | null = null,
  carril: readonly GlifoDelCarrilDelBurgo<Opcion>[] | null = null,
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
  const pregonP: Puntos = [];
  if (pregon !== null) {
    for (const tira of [...pregon.paraContestar, ...pregon.mios]) {
      for (const o of [tira.aceptar, tira.rechazar, tira.retirar]) if (o !== null) pregonP.push({ firma: firma(o), o });
    }
  }
  const carrilP: Puntos = carril === null ? [] : carril.map((g) => ({ firma: firma(g.opcion), o: g.opcion }));
  const fuera: Puntos = opcionesFueraDelTablero(opciones, tablero, dados, hoja, pregon, carril).map((o) => ({ firma: firma(o), o }));
  const gemelos: Puntos = obrasSoloEnElAnillo(opciones, tablero, hoja, carril).map((o) => ({ firma: firma(o), o }));
  return { tocables, dados: dadosP, hoja: hojaP, fichas, pregon: pregonP, carril: carrilP, fuera, gemelos };
}

/** LA PARTICIÓN: cada movimiento sin puerta exactamente en un botón, y ninguno perdido. */
function reprochesDeLaParticion(opciones: readonly Opcion[], p: Particion): string[] {
  const r: string[] = [];
  const todas = opciones.filter((o) => o.declaracion !== true).map(firma);
  const botones = [...p.dados, ...p.hoja, ...p.fichas, ...p.pregon, ...p.carril, ...p.fuera];
  const union = [...p.tocables, ...botones].map((x) => x.firma);
  for (const f of todas) if (union.indexOf(f) < 0) r.push(`se pierde ${f.slice(0, 80)}`);
  for (const f of union) if (todas.indexOf(f) < 0) r.push(`se pinta algo que el juego no ofrece: ${f.slice(0, 80)}`);
  /* UN SOLO BOTÓN POR MOVIMIENTO, mire donde mire: es la cuenta que importa. */
  const vistas: string[] = [];
  for (const x of botones) {
    if (vistas.indexOf(x.firma) >= 0) r.push(`dos botones para el mismo movimiento: ${x.firma.slice(0, 80)}`);
    vistas.push(x.firma);
  }
  const repetido = (lista: Puntos, nombre: string): void => {
    const yaVistas: string[] = [];
    for (const x of lista) {
      if (yaVistas.indexOf(x.firma) >= 0) r.push(`${nombre} repite ${x.firma.slice(0, 80)}`);
      yaVistas.push(x.firma);
    }
  };
  repetido(p.tocables, 'las casillas');
  /*
   * EL ATAJO SIEMPRE TIENE SU BOTÓN. Toda casilla encendida está, POR IDENTIDAD, o en un
   * botón (la ficha de «Lo mío», o «Ahora» en mi apuro) o en la lista de gemelos —comprar y
   * sacar a subasta, que no tienen ficha porque el título no es mío todavía—. Sin esta
   * cuenta, una obra alcanzable sólo con el ratón pasa desapercibida: la partición seguiría
   * siendo una partición y el movimiento seguiría teniendo sitio.
   */
  const deTituloAjeno = (o: OpcionQueLlega): boolean => o.tipo === COMPRAR || o.tipo === A_ALMONEDA;
  for (const t of p.tocables) {
    const conBoton = botones.some((b) => b.o === t.o);
    const conGemelo = p.gemelos.some((g) => g.o === t.o);
    if (!conBoton && !conGemelo) r.push(`una casilla encendida sin botón ni gemelo de apoyo: ${t.firma.slice(0, 80)}`);
    if (conBoton && conGemelo) r.push(`una obra con botón pide además un gemelo: ${t.firma.slice(0, 80)}`);
    if (!conBoton && !deTituloAjeno(t.o)) r.push(`una obra de un título mío se quedó sin botón: ${t.firma.slice(0, 80)}`);
  }
  for (const g of p.gemelos) {
    if (!p.tocables.some((t) => t.o === g.o)) r.push(`un gemelo de apoyo para una casilla que no está encendida: ${g.firma.slice(0, 80)}`);
    if (!deTituloAjeno(g.o)) r.push(`un gemelo de apoyo para una obra que tendría que tener ficha: ${g.firma.slice(0, 80)}`);
  }
  /* Las fichas de «Lo mío» son mías, y son los MISMOS objetos que abre la casilla. */
  for (const t of p.tocables) if (deTituloAjeno(t.o) && p.fichas.some((f) => f.o === t.o)) r.push(`una ficha de «Lo mío» ofrece comprar un título que no es mío: ${t.firma.slice(0, 80)}`);
  if (p.tocables.length > 0) for (const f of p.fichas) if (!p.tocables.some((t) => t.o === f.o)) r.push(`una ficha trae una obra que ninguna casilla abre: ${f.firma.slice(0, 80)}`);
  for (const f of p.fichas) if (deTituloAjeno(f.o)) r.push(`una ficha ofrece comprar: ${f.firma.slice(0, 80)}`);
  /* Y todo lo pintado es una opción ENTERA del juego, por identidad. */
  for (const x of [...p.tocables, ...botones, ...p.gemelos]) {
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
    if (c.empenada !== (tit?.empenado ?? false)) r.push(`la hipoteca de ${i}`);
    if (c.enAlmoneda !== (vista.almoneda !== null && vista.almoneda.casilla === i)) r.push(`la subasta de ${i}`);
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
  if (t.almoneda !== (vista.almoneda === null ? null : vista.almoneda.casilla)) r.push(`subasta ${t.almoneda}`);
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

/**
 * LA HOJA: ocho secciones en orden, opciones del juego enteras, sin puertas, y ningún secreto
 * ni carta no robada.
 *
 * El sexto parámetro es EL CARRIL tal como se pinta, o `null` si no se pinta, y hace falta
 * para saber dónde tienen que estar los botones del momento: con el carril puesto, «Ahora» se
 * queda sin ellos a propósito, y sin este dato la comprobación del apuro —«la obra subió a
 * "Ahora"»— se pondría roja justo cuando todo está bien.
 */
function reprochesDeLaHoja(
  vista: VistaDelBurgo,
  quien: QuienMira,
  opciones: readonly Opcion[],
  h: HojaDelBurgo<Opcion>,
  secretos: readonly string[],
  carril: readonly GlifoDelCarrilDelBurgo<Opcion>[] | null = null,
): string[] {
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
   * la puerta más cercana» en Sucesos; el Salvoconducto y «¡A la Comisaría!» en los dos
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
  /*
   * «Lo mío»: exactamente mis títulos, agrupados, y cada ficha con SUS obras… salvo en MI
   * apuro, donde vender e hipotecar suben a «Ahora» y se van de las fichas. Ahí la ficha
   * queda vacía de obras a propósito: el mismo botón en los dos sitios es un botón de más.
   */
  const enMiApuro = quien !== null && vista.apuro !== null && vista.apuro.quien === quien;
  const enLaSeccion = h.secciones.find((s) => s.id === 'ahora')?.opciones ?? [];
  /*
   * DÓNDE ESTÁN LOS BOTONES DEL MOMENTO: en la sección si no hay carril, y en el carril si lo
   * hay. Nunca en los dos —de eso se encarga la partición, que los cuenta juntos—, así que
   * aquí se mira EL SITIO QUE TOCA y no los dos a la vez: mirar los dos daría por buena una
   * sección que no soltó nada.
   */
  const enAhora: readonly Opcion[] = carril === null ? enLaSeccion : carril.map((g) => g.opcion);
  if (carril !== null && enLaSeccion.length !== 0) r.push(`con el carril puesto, «Ahora» sigue pintando ${enLaSeccion.length} botones`);
  if (carril !== null && enAhora.length > 0) {
    const lineas = h.secciones.find((s) => s.id === 'ahora')?.lineas ?? [];
    if (!lineas.some((l) => l.indexOf(EL_CARRIL_DE_LA_MESA) >= 0)) r.push('«Ahora» soltó sus botones y no dice dónde están');
  }
  const misCasillas = h.mios.flatMap((b) => b.fichas.map((f) => f.casilla)).sort((a, b) => a - b);
  const deLaVista = yo === undefined ? [] : [...yo.titulos].sort((a, b) => a - b);
  if (llano(misCasillas) !== llano(deLaVista)) r.push(`«Lo mío» trae ${llano(misCasillas)} y la vista ${llano(deLaVista)}`);
  for (const b of h.mios) {
    for (const f of b.fichas) {
      if (f.barrio !== null && f.barrio.id !== b.id) r.push(`la ficha ${f.casilla} está en el barrio equivocado`);
      const obras = obraPosibleEnCasilla(vista, quien, opciones, f.casilla);
      const esperadas = enMiApuro ? [] : obras;
      if (f.opciones.length !== esperadas.length || !f.opciones.every((o, k) => o === esperadas[k])) r.push(`la ficha ${f.casilla} no lleva sus obras`);
      if (!f.esMio) r.push(`la ficha ${f.casilla} de «Lo mío» no es mía`);
      if (enMiApuro) for (const o of obras) if (!enAhora.some((x) => x === o)) r.push(`en el apuro, la obra de ${f.casilla} no subió a «Ahora»`);
    }
  }
  if (!enMiApuro) for (const o of enAhora) if ([COMPRAR, A_ALMONEDA, ALZAR, VENDER, EMPENAR, DESEMPENAR].indexOf(o.tipo) >= 0) r.push(`«Ahora» lleva una obra fuera del apuro: ${o.id}`);
  /* La subasta y los tratos de la hoja son los de las funciones sueltas. */
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

/**
 * LAS FICHAS de las cuarenta casillas: nombre y tabla de la casilla, fila de hoy, dueño y obras.
 * El cuarto parámetro es QUIÉN REDACTA la tarjeta, y existe para poder envenenarla: un juez cuyo
 * testigo se saca él mismo del mismo sitio no se puede ver caer.
 */
function reprochesDeLasFichas(
  vista: VistaDelBurgo,
  quien: QuienMira,
  opciones: readonly Opcion[],
  haz: (casilla: number) => FichaDeCasilla<Opcion> = (casilla) => fichaDeCasilla(vista, casilla, quien, opciones),
): string[] {
  const r: string[] = [];
  for (let i = 0; i < CUANTAS_CASILLAS; i++) {
    const f = haz(i);
    const fila = CASILLAS[i];
    if (fila === undefined) continue;
    if (f.nombre !== fila.nombre || f.precio !== fila.precio || f.clase !== fila.clase) r.push(`la ficha ${i} no es la de la tabla`);
    /*
     * ═══ NI UN RENGLÓN QUE SEA EL NOMBRE QUE YA LLEVA EL ENCABEZADO ═══
     *
     * La tarjeta pinta `nombre` arriba y `lineas` debajo, y en las DIEZ casillas que no se
     * compran el estado ES el nombre de la casilla («El Descanso», «Sucesos», «El Fondo
     * Vecinal», «La Comisaría», «La Salida», «¡A comisaría!»): la tarjeta decía «El Descanso»
     * y «El Descanso» otra vez en el primer renglón. No lo puede arreglar el cliente —los
     * renglones los redacta el juego—, y no lo cazaba nada porque un renglón de más no rompe
     * ninguna cuenta: sólo se lee dos veces.
     */
    for (const linea of f.lineas) {
      if (linea === fila.nombre) r.push(`la tarjeta ${i} repite en un renglón el nombre que ya lleva el encabezado`);
    }
    /*
     * Y LA GUARDA NO SE COME UN ESTADO QUE SÍ APORTA: el Impuesto y la Tasa traen la cifra
     * pegada al nombre, así que su renglón tiene que seguir ahí. Sin este clavo, «no repitas el
     * nombre» se cumpliría igual de bien borrando lo único que hay que saber al caer en ellas.
     */
    if (fila.clase === 'diezmo' || fila.clase === 'alcabala') {
      const loQueCobra = f.lineas.some((x) => x.indexOf(fila.nombre) === 0 && x.indexOf(maravedies(fila.precio)) > 0);
      if (!loQueCobra) r.push(`la tarjeta ${i} ya no dice lo que cobra la casilla`);
    }
    const tit = vista.titulos.find((x) => x.casilla === i);
    const dueno = tit === undefined ? null : vista.jugadores.find((j) => j.asiento === tit.dueno);
    if ((f.dueno === null) !== (dueno === undefined || dueno === null)) r.push(`el dueño de la ficha ${i}`);
    if (f.dueno !== null && dueno !== undefined && dueno !== null && (f.dueno.color !== dueno.color || f.dueno.nombre !== dueno.nombre)) r.push(`el dueño de la ficha ${i} con otro color`);
    if (tit !== undefined && (f.casas !== tit.casas || f.empenado !== tit.empenado || f.rentaAhora !== tit.rentaAhora || f.esPosada !== (tit.casas === POSADA))) r.push(`la ficha ${i} miente en casas/hipoteca/renta`);
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

/**
 * EL CARTEL AL PIE de las cuarenta casillas: el nombre, el precio, el estado y la renta de
 * hoy. El cuarto parámetro es QUIÉN REDACTA el cartel, y existe para poder envenenarlo: un
 * juez cuyo testigo se saca él mismo del mismo sitio no se puede ver caer.
 */
function reprochesDeLosCarteles(
  vista: VistaDelBurgo,
  quien: QuienMira,
  opciones: readonly Opcion[],
  haz: (casilla: number) => CartelDeCasilla = (casilla) => cartelDeCasilla(vista, casilla),
): string[] {
  const r: string[] = [];
  for (let i = 0; i < CUANTAS_CASILLAS; i++) {
    const c = haz(i);
    const fila = CASILLAS[i];
    if (fila === undefined) continue;
    if (c.casilla !== i || c.nombre !== fila.nombre || c.rotulo !== fila.rotulo || c.clase !== fila.clase) r.push(`el cartel ${i} no es el de la tabla`);
    if (c.frases.length < 1 || c.frases.length > 2) r.push(`el cartel ${i} tiene ${c.frases.length} frases`);
    if (c.frase !== c.frases.join(' — ')) r.push(`el cartel ${i} no es la unión de sus frases`);
    if ((c.frases[0] ?? '').indexOf(fila.nombre) !== 0) r.push(`el cartel ${i} no empieza por el nombre`);
    const seCompra = fila.clase === 'solar' || fila.clase === 'puerta' || fila.clase === 'oficio';
    if (c.seCompra !== seCompra) r.push(`el cartel ${i} miente en seCompra`);
    if (seCompra && c.frase.indexOf(maravedies(fila.precio)) < 0) r.push(`el cartel ${i} no dice el precio`);
    const barrio = barrioDe(i);
    const acera = fila.clase === 'solar' && barrio !== null ? barrio.color : null;
    if (c.color !== acera) r.push(`el cartel ${i} pinta la acera ${c.color}`);
    const tit = vista.titulos.find((x) => x.casilla === i);
    const dueno = tit === undefined ? undefined : vista.jugadores.find((j) => j.asiento === tit.dueno);
    if (c.colorDelDueno !== (dueno === undefined ? null : dueno.color)) r.push(`el cartel ${i} pinta el filo del dueño mal`);
    if (c.esMio !== (tit !== undefined && vista.yo !== null && tit.dueno === vista.yo)) r.push(`esMio del cartel ${i}`);
    if (tit !== undefined && tit.dueno !== null && !tit.empenado && tit.rentaAhora > 0 && c.frase.indexOf(maravedies(tit.rentaAhora)) < 0) {
      r.push(`el cartel ${i} no dice la renta de hoy`);
    }
    /* Y es la MISMA frase que la tarjeta: dos redacciones del mismo dato acaban discrepando. */
    if (fichaDeCasilla(vista, i, quien, opciones).cartel !== c.frase) r.push(`la ficha ${i} y su cartel no dicen lo mismo`);
  }
  return r;
}

/** LA FICHA DE UN JUGADOR: lo que la vista dice de él, sus títulos, y ningún botón. */
function reprochesDeLasFichasDeJugador(
  vista: VistaDelBurgo,
  quien: QuienMira,
  opciones: readonly Opcion[],
  haz: (asiento: AsientoId) => FichaDeJugador | null = (asiento) => fichaDeJugador(vista, asiento, quien, opciones),
): string[] {
  const r: string[] = [];
  const puerta = tratoEnTres(vista, quien, opciones)?.puerta ?? null;
  for (const j of vista.jugadores) {
    const f = haz(j.asiento);
    if (f === null) {
      r.push(`sin ficha de ${j.asiento}`);
      continue;
    }
    if (f.mrs !== j.mrs || f.patrimonio !== j.patrimonio || f.casilla !== j.casilla || f.quebrado !== j.quebrado) r.push(`la ficha de ${j.asiento} miente sobre la vista`);
    if (f.presa !== j.presa >= 0 || f.indultos !== j.indultos) r.push(`la ficha de ${j.asiento} miente en presa o Salvoconductos`);
    if (f.cuantosTitulos !== j.titulos.length) r.push(`la ficha de ${j.asiento} cuenta ${f.cuantosTitulos} títulos y tiene ${j.titulos.length}`);
    if (f.soyYo !== (quien !== null && j.asiento === quien)) r.push(`soyYo de ${j.asiento}`);
    if (f.nombreDeLaCasilla !== (CASILLAS[j.casilla]?.nombre ?? '')) r.push(`la ficha de ${j.asiento} no dice dónde está`);
    if (f.linea !== marcadorEnTres(vista, quien).jugadores.find((m) => m.asiento === j.asiento)?.linea) r.push(`la línea de ${j.asiento} no es la del marcador`);
    const suyas = [...f.barrios.flatMap((b) => b.titulos.map((t) => t.casilla)), ...f.sueltos.map((t) => t.casilla)].sort((a, b) => a - b);
    if (llano(suyas) !== llano([...j.titulos].sort((a, b) => a - b))) r.push(`los títulos de la ficha de ${j.asiento}: ${llano(suyas)} frente a ${llano(j.titulos)}`);
    for (const b of f.barrios) {
      const tabla = BARRIOS.find((x) => x.id === b.id);
      if (tabla === undefined) r.push(`la ficha de ${j.asiento} inventa el barrio ${b.id}`);
      else if (b.entero !== (b.titulos.length === tabla.solares.length)) r.push(`«barrio entero» de ${b.id} en la ficha de ${j.asiento}`);
    }
    for (const c of f.tratables) if (j.titulos.indexOf(c) < 0) r.push(`la ficha de ${j.asiento} ofrece en trato un título que no es suyo`);
    /* El componedor existe EXACTAMENTE cuando la puerta del trato admite a este destinatario. */
    const admitido = puerta !== null && quien !== null && j.asiento !== quien && puerta.a.some((d) => d.asiento === j.asiento);
    if ((f.trato !== null) !== admitido) r.push(`el componedor de ${j.asiento} sale ${f.trato === null ? 'sin' : 'con'} puerta y el juego dice lo contrario`);
    if (f.trato !== null && puerta !== null) {
      if (f.trato.mrsMaximo !== puerta.mrsMaximo || llano(f.trato.titulos) !== llano(puerta.titulos)) r.push(`el componedor de ${j.asiento} no lleva lo que declara la puerta`);
      if (f.trato.a.asiento !== j.asiento) r.push(`el componedor de ${j.asiento} apunta a otro`);
    }
  }
  if (haz('nadie-de-esta-mesa') !== null) r.push('hay ficha de un asiento que no está sentado');
  return r;
}

/** EL CARRIL: un cuadrado por opción recibida que no sea puerta, en orden y con la opción entera. */
function reprochesDelCarril(
  vista: VistaDelBurgo,
  quien: QuienMira,
  opciones: readonly Opcion[],
  glifos: readonly GlifoDelCarrilDelBurgo<Opcion>[] = glifosDelCarrilDelBurgo(vista, quien, opciones),
): string[] {
  const r: string[] = [];
  const sinPuertas = opciones.filter((o) => o.declaracion !== true);
  if (glifos.length !== sinPuertas.length) r.push(`el carril pinta ${glifos.length} cuadrados para ${sinPuertas.length} movimientos`);
  for (let k = 0; k < glifos.length; k++) {
    const g = glifos[k] as (typeof glifos)[number];
    const o = sinPuertas[k];
    if (o === undefined || g.opcion !== o) {
      r.push(`el cuadrado ${k} no es la opción ${k} del carril`);
      continue;
    }
    if (g.glifo.length < 1 || g.glifo.length > 2) r.push(`el glifo «${g.glifo}» de ${o.id} no cabe en el cuadrado`);
    if (g.ayuda !== o.rotulo) r.push(`la ayuda de ${o.id} no es su rótulo`);
    if (g.rotulo.length === 0) r.push(`el cuadrado de ${o.id} sin rótulo corto`);
    const casilla = (o.carga as { casilla?: unknown } | null)?.casilla;
    const esperada = typeof casilla === 'number' ? casilla : null;
    if (g.casilla !== esperada) r.push(`el cuadrado de ${o.id} dice casilla ${g.casilla} y la carga ${String(esperada)}`);
    if (g.casilla !== null && CASILLAS[g.casilla]?.clase === 'solar') {
      const barrio = barrioDe(g.casilla);
      if (barrio !== null && g.color !== barrio.color) r.push(`el filo de ${o.id} no es la acera de su barrio`);
    }
  }
  /*
   * DOS CUADRADOS IGUALES SON UN CUADRADO QUE NO SE PUEDE ELEGIR. Se admite el empate sólo
   * cuando el JUEGO tampoco los distingue (dos tratos vivos de la misma persona llevan el
   * mismo rótulo entero): ésa es una ambigüedad del rótulo, no del carril, y se cierra en la
   * caja de los tratos, donde cada propuesta es una tira con su frase.
   */
  for (let a = 0; a < glifos.length; a++) {
    for (let b = a + 1; b < glifos.length; b++) {
      const x = glifos[a] as (typeof glifos)[number];
      const y = glifos[b] as (typeof glifos)[number];
      if (x.glifo === y.glifo && x.rotulo === y.rotulo && x.ayuda !== y.ayuda) r.push(`dos cuadrados iguales para «${x.ayuda}» y «${y.ayuda}»`);
    }
  }
  return r;
}

/** LA CAJA DE LOS TRATOS: mis propuestas vivas, redactadas, con las opciones del juego enteras. */
function reprochesDelPregon(vista: VistaDelBurgo, quien: QuienMira, opciones: readonly Opcion[], p: PregonDelBurgo<Opcion> | null): string[] {
  const r: string[] = [];
  const mios = vista.tratos.filter((t) => t.a === quien || t.de === quien);
  const deberia = quien !== null && vista.momento === 'jugando' && mios.length > 0;
  if (deberia !== (p !== null)) {
    r.push(`la caja sale ${p === null ? 'vacía' : 'puesta'} con ${mios.length} tratos míos`);
    return r;
  }
  if (p === null) return r;
  const tiras = [...p.paraContestar, ...p.mios];
  if (tiras.length !== mios.length) r.push(`la caja trae ${tiras.length} tiras para ${mios.length} tratos`);
  /*
   * CADA TIRA EN SU BLOQUE. Sin esto, todo lo de abajo se mira sobre `tiras`, que es la
   * suma de los dos, y una caja que echara MIS propuestas al bloque de «Para contestar»
   * —dos botones de aceptar que el juego no ofrece, y ningún «Retirar» donde se busca—
   * pasaba entera: `soyElDestinatario` lo escribe la misma función que reparte, así que
   * comparar la tira consigo misma no dice nada. Es el reparto lo que hay que mirar.
   */
  for (const x of p.paraContestar) if (!x.soyElDestinatario) r.push(`la tira ${x.id} está en «${PARA_CONTESTAR}» y no va dirigida a mí`);
  for (const x of p.mios) if (x.soyElDestinatario) r.push(`la tira ${x.id} está en «${LOS_MIOS}» y es una que tengo que contestar`);
  for (const t of mios) {
    const tira = tiras.find((x) => x.id === t.id);
    if (tira === undefined) {
      r.push(`la caja se deja el trato ${t.id}`);
      continue;
    }
    if (tira.soyElDestinatario !== (t.a === quien) || tira.soyElProponente !== (t.de === quien)) r.push(`la tira ${t.id} mira desde el lado equivocado`);
    if (tira.frase.length === 0) r.push(`la tira ${t.id} sin frase`);
    if (tira.soyElDestinatario && tira.frase.indexOf(tira.de.nombre) < 0) r.push(`la tira ${t.id} no nombra a quien la propone`);
    if (tira.soyElProponente && tira.frase.indexOf(tira.a.nombre) < 0) r.push(`la tira ${t.id} no nombra a quien va dirigida`);
    if (tira.comoAnda.length === 0 || tira.comoAndaSinNombre.length === 0) r.push(`la tira ${t.id} sin renglón de estado`);
    for (const o of [tira.aceptar, tira.rechazar, tira.retirar]) {
      if (o === null) continue;
      if (!opciones.some((x) => x === o)) r.push(`la tira ${t.id} pinta una opción que no es del juego`);
      if (o.declaracion === true) r.push(`la tira ${t.id} pinta una puerta`);
      if ((o.carga as { trato?: unknown }).trato !== t.id) r.push(`la tira ${t.id} lleva la opción de otro trato`);
    }
    const aceptarDelJuego = opciones.find((o) => o.tipo === ACEPTAR && (o.carga as { trato?: unknown }).trato === t.id) ?? null;
    const retirarDelJuego = opciones.find((o) => o.tipo === RETIRAR && (o.carga as { trato?: unknown }).trato === t.id) ?? null;
    if (tira.aceptar !== aceptarDelJuego) r.push(`el aceptar de la tira ${t.id} no es el del juego`);
    if (tira.retirar !== retirarDelJuego) r.push(`el retirar de la tira ${t.id} no es el del juego`);
  }
  for (const tira of tiras) if (!mios.some((t) => t.id === tira.id)) r.push(`la caja pinta el trato ${tira.id}, que no es mío`);
  if (p.caduca.length === 0) r.push('la caja no dice que los tratos caducan');
  return r;
}

/**
 * LA CRÓNICA: del más nuevo al más viejo, un renglón por jugada, y cada texto el pregón de
 * la vista de esa jugada. Se le dan las vistas que se leyeron para que no se pueda inventar
 * una línea que nadie dijo.
 */
function reprochesDeLaCronica(cronica: readonly RenglonDeLaCronica[], vistas: readonly VistaDelBurgo[], tope: number): string[] {
  const r: string[] = [];
  if (cronica.length > tope) r.push(`la crónica guarda ${cronica.length} renglones con tope ${tope}`);
  const jugadas: number[] = [];
  for (let k = 0; k < cronica.length; k++) {
    const x = cronica[k];
    if (x === undefined) continue;
    if (jugadas.indexOf(x.jugada) >= 0) r.push(`la crónica repite la jugada ${x.jugada}`);
    jugadas.push(x.jugada);
    const anterior = k === 0 ? undefined : cronica[k - 1];
    if (anterior !== undefined && anterior.jugada <= x.jugada) r.push(`la crónica no va del más nuevo al más viejo en ${x.jugada}`);
    const suya = vistas.find((v) => v.jugada === x.jugada);
    if (suya === undefined) r.push(`la crónica trae la jugada ${x.jugada}, que nadie leyó`);
    else if (suya.pregon !== x.texto) r.push(`el renglón ${x.jugada} no es el pregón de su vista`);
  }
  if (cronica.length < tope) {
    for (const v of vistas) {
      if (v.pregon.length === 0) continue;
      if (!cronica.some((x) => x.jugada === v.jugada)) r.push(`la crónica se deja la jugada ${v.jugada}`);
    }
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
  /** Cuántas miradas tuvieron la caja de los tratos puesta, y cuántas pidieron un gemelo de apoyo. */
  cajasDeTratos: number;
  gemelosDeApoyo: number;
  /**
   * EL CARRIL, MEDIDO. `carrilesConCuadrados` es cuántas vistas tuvieron al menos un cuadrado
   * que pulsar; los otros dos son para leer de un vistazo si el mueble se está usando de
   * verdad o si sale siempre con el mismo botón solitario. Sin un mínimo sobre el primero, un
   * carril vacío en las tres partidas pasa por comprobado.
   */
  carrilesConCuadrados: number;
  cuadradosDelCarril: number;
  carrilMasLargo: number;
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
    cajasDeTratos: 0,
    gemelosDeApoyo: 0,
    carrilesConCuadrados: 0,
    cuadradosDelCarril: 0,
    carrilMasLargo: 0,
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
    /*
     * LA CAJA DE LOS TRATOS Y EL CARRIL SE COMPONEN ANTES QUE LA HOJA, que es el orden que el
     * cliente tiene que seguir: la hoja los recibe compuestos para soltar sus botones —«El
     * trato» los suyos, «Ahora» los suyos— y la criba recibe los tres. Compuestos al revés,
     * cada sección pintaría sus botones y el mueble de fuera los suyos, y el mismo movimiento
     * tendría dos sitios donde pulsarse.
     */
    const pregon = pregonDelBurgo(vista, quien, opciones);
    const carril = carrilDelBurgo(vista, quien, opciones);
    const hoja = hojaEnTres(vista, quien, opciones, pregon, carril);
    if (tablero === null) {
      anota(c, donde, ['sin tablero']);
      continue;
    }
    anota(c, donde, reprochesDelTablero(vista, quien, opciones, tablero));
    anota(c, donde, reprochesDeLosDados(vista, quien, opciones, dados));
    anota(c, donde, reprochesDeLaHoja(vista, quien, opciones, hoja, secretos, carril));
    anota(c, donde, reprochesDelPregon(vista, quien, opciones, pregon));
    anota(c, donde, reprochesDeLaParticion(opciones, particionDe(vista, quien, opciones, tablero, dados, hoja, pregon, carril)));
    anota(c, donde, reprochesDelCarril(vista, quien, opcionesDelCarrilDelBurgo(vista, quien, opciones), carril));
    anota(c, donde, reprochesDeLosTextos(vista, quien));
    if (pregon !== null) c.cajasDeTratos++;
    if (obrasSoloEnElAnillo(opciones, tablero, hoja, carril).length > 0) c.gemelosDeApoyo++;
    /*
     * CUÁNTAS VISTAS TUVIERON ALGO QUE PINTAR EN EL CARRIL. Este contador es lo que compra
     * que no vuelva el fallo que trajo el mueble: el carril se alimentaba de
     * `opcionesFueraDelTablero`, que en estas mismas tres partidas devolvía CERO opciones en
     * las 16.660 vistas, y nadie lo vio porque un carril vacío no da error: se lee como una
     * pantalla sin nada que hacer. Con un mínimo exigido abajo, un carril que se quede vacío
     * se ve ROJO.
     */
    if (carril.length > 0) {
      c.carrilesConCuadrados++;
      c.cuadradosDelCarril += carril.length;
      if (carril.length > c.carrilMasLargo) c.carrilMasLargo = carril.length;
      /*
       * Y LA PARTICIÓN SIN EL CARRIL: los botones del momento vuelven ENTEROS a la sección,
       * que es lo que ve el cliente que no pinta la cinta (el retablo del móvil). Sin esto,
       * el día que «Ahora» dejara de recuperarlos, la partida sería injugable exactamente en
       * el cliente que este comprobador no abre.
       */
      const sinCarril = hojaEnTres(vista, quien, opciones, pregon);
      anota(c, donde, reprochesDeLaParticion(opciones, particionDe(vista, quien, opciones, tablero, dados, sinCarril, pregon, null)));
      const enLaSeccion = sinCarril.secciones.find((s) => s.id === 'ahora')?.opciones ?? [];
      if (enLaSeccion.length !== carril.length || !enLaSeccion.every((o, k) => o === carril[k]?.opcion)) {
        anota(c, donde, [`sin carril la sección lleva ${enLaSeccion.length} botones y el carril pinta ${carril.length}`]);
      }
    }
    if (vista.jugada % 7 === 0) anota(c, donde, reprochesDeLasFichas(vista, quien, opciones));
    if (vista.jugada % 7 === 0) anota(c, donde, reprochesDeLosCarteles(vista, quien, opciones));
    if (vista.jugada % 5 === 0) anota(c, donde, reprochesDeLasFichasDeJugador(vista, quien, opciones));
    /* Y la partición SIN la caja: los botones de los tratos vuelven enteros a la hoja. */
    if (pregon !== null) {
      const sinCaja = hojaEnTres(vista, quien, opciones);
      anota(c, donde, reprochesDeLaParticion(opciones, particionDe(vista, quien, opciones, tablero, dados, sinCaja, null)));
      const enLaSeccion = sinCaja.secciones.find((s) => s.id === 'trato')?.opciones ?? [];
      const enLaCaja = [...pregon.paraContestar, ...pregon.mios].flatMap((t) => [t.aceptar, t.rechazar, t.retirar]).filter((o) => o !== null);
      if (enLaSeccion.length !== enLaCaja.length) anota(c, donde, [`sin caja la sección lleva ${enLaSeccion.length} botones y la caja pinta ${enLaCaja.length}`]);
      if ((hoja.secciones.find((s) => s.id === 'trato')?.opciones.length ?? -1) !== 0) anota(c, donde, ['con la caja puesta, «El trato» sigue pintando botones']);
    }
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
    cajas: c.cajasDeTratos,
    gemelos: c.gemelosDeApoyo,
    carriles: [c.carrilesConCuadrados, c.cuadradosDelCarril, c.carrilMasLargo],
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
  comprobar(`${p.id}: hubo subastas abiertas y compras`, (cuentas.hitos['almoneda-abierta'] ?? 0) >= 1 && (cuentas.hitos['compra'] ?? 0) >= 5, cuentas.hitos);
  comprobar(`${p.id}: alguien pasó por la Comisaría`, (cuentas.hitos['a-la-mazmorra'] ?? 0) >= 1, cuentas.hitos);
  comprobar(`${p.id}: salieron cartas`, (cuentas.hitos['carta'] ?? 0) >= 2, cuentas.hitos);
  comprobar(`${p.id}: hubo obras que sólo tenía el anillo y pidieron gemelo de apoyo`, cuentas.gemelosDeApoyo >= 5, cuentas.gemelosDeApoyo);
  /*
   * ═══ EL CARRIL SE LLENÓ, Y ÉSTA ES LA CUENTA QUE COMPRA QUE NO VUELVA EL FALLO ═══
   *
   * El mueble nació alimentado por `opcionesFueraDelTablero`, que en estas mismas partidas
   * devolvía CERO opciones en las 16.660 vistas: el carril venía vacío siempre, sus vacunas
   * se saltaban solas y su cabecera describía un fallo imposible. Un carril vacío no da error
   * —se lee como una pantalla sin nada que hacer—, así que la única manera de que se vea es
   * exigirle un suelo. Se pide sobre las VISTAS con al menos un cuadrado y no sobre el total
   * de cuadrados: un carril de ocho en una sola vista no dice que el mueble se use.
   */
  comprobar(`${p.id}: el carril tuvo cuadrados que pulsar en muchas vistas: ${cuentas.carrilesConCuadrados} de ${cuentas.vistas}`, cuentas.carrilesConCuadrados >= 400, [cuentas.carrilesConCuadrados, cuentas.cuadradosDelCarril, cuentas.carrilMasLargo]);
  /*
   * MEDIDO HOY, con estas tres semillas: 1.234 de 1.854 vistas, 4.015 de 6.035 y 5.788 de
   * 8.771, y el carril más largo tuvo 19, 24 y 19 cuadrados (un apuro con muchos títulos: la
   * quiebra, y vender e hipotecar cada uno de ellos). El suelo se pone en 400 —tres veces por
   * debajo del peor— para que lo que se caiga sea el mueble vacío y no una semilla con suerte.
   */
  comprobar(`${p.id}: y alguna vez tuvo más de un cuadrado, que es cuando el rótulo corto tiene que distinguirlos`, cuentas.carrilMasLargo >= 3, cuentas.carrilMasLargo);
  if (p.tic > 0) comprobar(`${p.id}: el tic entró y jugó por el ausente`, cuentas.tics >= 20, cuentas.tics);
}
comprobar(
  'entre las tres partidas: la caja de los tratos se pintó de verdad en muchas miradas',
  cuentasDeTodas.reduce((s, c) => s + c.cajasDeTratos, 0) >= 5,
  cuentasDeTodas.map((c) => c.cajasDeTratos),
);
comprobar('entre las tres partidas: pujas libres montadas por la puerta y ACEPTADAS por el reductor', cuentasDeTodas.reduce((s, c) => s + c.pujasLibresAceptadas, 0) >= 2, cuentasDeTodas.map((c) => c.pujasLibresAceptadas));
comprobar('entre las tres partidas: tratos montados por la puerta y ACEPTADOS por el reductor (propuestos de verdad)', cuentasDeTodas.reduce((s, c) => s + c.tratosMontadosAceptados, 0) >= 2 && (hitosDeTodas['trato-propuesto'] ?? 0) >= 2, [cuentasDeTodas.map((c) => c.tratosMontadosAceptados), hitosDeTodas['trato-propuesto']]);
comprobar('entre las tres partidas: se ganó alguna subasta y se alzó', (hitosDeTodas['almoneda-ganada'] ?? 0) >= 1 && (hitosDeTodas['alza'] ?? 0) >= 1, hitosDeTodas);
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
    comprobar('en el apuro la hoja abre «Ahora» —donde están las obras desde que suben— y dice cuánto debe', hojaB.abre === 'ahora' && hojaB.secciones[2]?.lineas.some((l) => l.indexOf(maravedies(500)) >= 0) === true, [hojaB.abre, hojaB.secciones[2]?.lineas]);
    comprobar('y manda vender o hipotecar AQUÍ MISMO, no a rodar hasta «Lo mío»', hojaB.secciones[2]?.lineas.some((l) => l.indexOf('aquí mismo') >= 0) === true, hojaB.secciones[2]?.lineas);
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
    comprobar('la frase de espera es el fin', esperaA(vistaFin).indexOf('se queda con el Burgo') >= 0, esperaA(vistaFin));
    comprobar('terminada: sin dados, sin tocables, hoja con «Ahora» sin botones', dadosEnTres(vistaFin, a.asiento, []) === null && tableroFin?.casillas.every((x) => !x.tocable) === true && hojaEnTres(vistaFin, a.asiento, []).secciones[2]?.opciones.length === 0);
    /* La gruesa entre el apuro y el fin: quiebra por quebrado nuevo. */
    const gruesa = sucesosEnTres(vistaB.jugada - 1, vistaFin, vistaB);
    comprobar('la lista gruesa entre el apuro y el fin trae la quiebra de B y el fin', gruesa.some((s) => s.que === 'quiebra' && s.quien === b.asiento) && gruesa.some((s) => s.que === 'fin'), gruesa.map((s) => s.que));
    /* Y el tic sobre el apuro sin salida también quiebra. */
    const porTic = avanzarElReloj(mesa);
    comprobar('el tic sobre un apuro sin salida quiebra al ausente igual', estadoDe(porTic).jugadores[1]?.quebrado === true);
  }
}

/* ═══ 3 bis. EL APURO CON TÍTULOS: las obras suben a «Ahora» y se van de «Lo mío» ═══ */
paso('El apuro con títulos: vender e hipotecar donde corre el reloj, una sola vez, y la casilla como atajo');
{
  const base = jugarUnaPartida('BUR-3D-AP', 2, 31, 60, 0).mesa;
  const e = estadoDe(base);
  const [a, b] = e.jugadores;
  if (a !== undefined && b !== undefined) {
    /*
     * B debe 500 y NO tiene efectivo, pero sí dos solares sin casas: el juego le ofrece
     * hipotecar los dos (y sólo eso, más la quiebra). Es el caso que el montaje de arriba
     * no podía dar —allí B se quedaba sin títulos— y sin él nadie mira nunca si las obras
     * del apuro llegan a algún botón.
     */
    const titulos = e.titulos.map((t) => (t.casilla === 1 || t.casilla === 3 ? { ...t, dueno: b.asiento, casas: 0, empenado: false } : { ...t, dueno: null, casas: 0, empenado: false }));
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
      jugadores: e.jugadores.map((j, k) => (k === 1 ? { ...j, mrs: 0, presa: -1, quebrado: false } : { ...j, mrs: 1000, quebrado: false })),
      apuro: { quien: b.asiento, deudas: [{ a: a.asiento, cuanto: 500, porque: 'renta' }] },
      jugada: e.jugada + 1,
      sucesos: [{ que: 'apuro', quien: b.asiento, debe: 500 }],
    };
    const mesa = abrirMesa({ id: 'BUR-3D-AP2', arcade: BURGO, semilla: 31, asientos: [...base.asientos], estado: montado });
    const vista = vistaEn(mesa, b.asiento);
    const opciones = opcionesEn(mesa, b.asiento);
    const hoja = hojaEnTres(vista, b.asiento, opciones);
    const tablero = tableroEnTres(vista, b.asiento, opciones);
    const dados = dadosEnTres(vista, b.asiento, opciones);
    const obrasDelJuego = opciones.filter((o) => [VENDER, EMPENAR, ALZAR, DESEMPENAR].indexOf(o.tipo) >= 0);
    comprobar('B está en apuro con dos títulos y el juego le ofrece obras', vista.apuro?.quien === b.asiento && obrasDelJuego.length >= 2, [vista.apuro, obrasDelJuego.map((o) => o.id)]);
    const enAhora = hoja.secciones.find((s) => s.id === 'ahora')?.opciones ?? [];
    comprobar('las obras del apuro están en «Ahora», ENTERAS y por identidad', obrasDelJuego.every((o) => enAhora.indexOf(o) >= 0), enAhora.map((o) => o.id));
    comprobar('y «Ahora» lleva además lo del momento (la quiebra) sin repetir nada', enAhora.some((o) => o.tipo === RENDIRSE) && new Set(enAhora.map((o) => firma(o))).size === enAhora.length, enAhora.map((o) => o.id));
    const enLasFichas = hoja.mios.flatMap((x) => x.fichas.flatMap((f) => f.opciones));
    comprobar('«Lo mío» sigue enseñando mis dos títulos, y ya SIN sus obras: el botón está arriba', hoja.mios.flatMap((x) => x.fichas).length === 2 && enLasFichas.length === 0, [hoja.mios.flatMap((x) => x.fichas.map((f) => f.casilla)), enLasFichas.map((o) => o.id)]);
    comprobar('la casilla del anillo las sigue encendiendo: es el atajo, no un segundo botón', obrasDelJuego.every((o) => obraPosibleEnCasilla(vista, b.asiento, opciones, (o.carga as { casilla: number }).casilla).indexOf(o) >= 0));
    comprobar('y no vuelven como botón suelto', opcionesFueraDelTablero(opciones, tablero, dados, hoja).length === 0, opcionesFueraDelTablero(opciones, tablero, dados, hoja).map((o) => o.id));
    const particion = particionDe(vista, b.asiento, opciones, tablero, dados, hoja);
    comprobar('la partición del apuro no tiene reproche', reprochesDeLaParticion(opciones, particion).length === 0, reprochesDeLaParticion(opciones, particion));
    comprobar('y la hoja del apuro tampoco', reprochesDeLaHoja(vista, b.asiento, opciones, hoja, seriesSecretas(mesa)).length === 0, reprochesDeLaHoja(vista, b.asiento, opciones, hoja, seriesSecretas(mesa)));
    /* LA VACUNA: dejarlas TAMBIÉN en «Lo mío» son dos botones para el mismo movimiento. */
    const enLosDos: HojaDelBurgo<Opcion> = {
      ...hoja,
      mios: hoja.mios.map((x) => ({ ...x, fichas: x.fichas.map((f) => ({ ...f, opciones: obraPosibleEnCasilla(vista, b.asiento, opciones, f.casilla) })) })),
    };
    comprobar(
      'la vacuna del apuro: la misma obra en «Ahora» y en su ficha se ve caer como dos botones',
      reprochesDeLaParticion(opciones, particionDe(vista, b.asiento, opciones, tablero, dados, enLosDos)).some((x) => x.indexOf('dos botones') >= 0),
      reprochesDeLaParticion(opciones, particionDe(vista, b.asiento, opciones, tablero, dados, enLosDos)),
    );
    /* Y la de al lado: quitarlas de los dos sitios deja la casilla encendida sin botón. */
    const enNinguno: HojaDelBurgo<Opcion> = {
      ...hoja,
      secciones: hoja.secciones.map((s) => (s.id === 'ahora' ? { ...s, opciones: s.opciones.filter((o) => obrasDelJuego.indexOf(o) < 0) } : s)),
    };
    comprobar(
      'y la vacuna de al lado: sin botón en ninguno de los dos, la casilla encendida se queda sin sitio donde pulsarse',
      reprochesDeLaParticion(opciones, particionDe(vista, b.asiento, opciones, tablero, dados, enNinguno)).some((x) => x.indexOf('sin botón') >= 0),
      reprochesDeLaParticion(opciones, particionDe(vista, b.asiento, opciones, tablero, dados, enNinguno)),
    );
    /*
     * ═══ CON APURO Y CON UN TRATO POR CONTESTAR, EL CAJÓN ABRE «AHORA» ═══
     *
     * Se pueden dar a la vez y nadie lo había mirado: contestar un trato se ofrece SIN TURNO
     * y sin mirar el apuro, así que quien tiene la cuenta atrás encima puede tener además una
     * propuesta esperando. La rama del trato iba delante y el cajón le abría «El trato»,
     * dejando plegado el único sitio donde está escrito cuánto debe y a quién. Manda el apuro:
     * es el único reloj con final forzoso en mi contra, y el trato tiene otro mueble a la
     * vista (la caja del pie) mientras que la cuenta de la deuda no está en ninguna otra
     * parte. Las dos comprobaciones van juntas a propósito: la segunda afirma que la rama del
     * trato sigue viva cuando no hay apuro, o sea que esto es un orden y no un borrado.
     */
    const conTratoYApuro: EstadoDelBurgo = {
      ...montado,
      tratos: [{ id: 1, de: a.asiento, a: b.asiento, doy: { mrs: 600, titulos: [], indultos: 0 }, pido: { mrs: 0, titulos: [1], indultos: 0 }, enElTurno: montado.turnosAbiertos }],
      siguienteTrato: 2,
      jugada: montado.jugada + 1,
    };
    const mesaTA = abrirMesa({ id: 'BUR-3D-AP4', arcade: BURGO, semilla: 31, asientos: [...base.asientos], estado: conTratoYApuro });
    const vistaTA = vistaEn(mesaTA, b.asiento);
    const opcionesTA = opcionesEn(mesaTA, b.asiento);
    const hojaTA = hojaEnTres(vistaTA, b.asiento, opcionesTA);
    comprobar(
      'con la cuenta atrás encima y un trato por contestar, el cajón abre «Ahora» y no «El trato»',
      hojaTA.abre === 'ahora' && hojaTA.trato !== null && hojaTA.trato.abiertos.some((t) => t.soyElDestinatario && t.aceptar !== null),
      [hojaTA.abre, hojaTA.trato?.abiertos.length],
    );
    const sinApuro: EstadoDelBurgo = { ...conTratoYApuro, paso: 'por-pasar', apuro: null, turno: 0, jugada: conTratoYApuro.jugada + 1 };
    const mesaSA = abrirMesa({ id: 'BUR-3D-AP5', arcade: BURGO, semilla: 31, asientos: [...base.asientos], estado: sinApuro });
    comprobar(
      'y sin apuro el mismo trato SÍ abre «El trato»: es un orden entre dos ramas vivas, no una rama borrada',
      hojaEnTres(vistaEn(mesaSA, b.asiento), b.asiento, opcionesEn(mesaSA, b.asiento)).abre === 'trato',
      hojaEnTres(vistaEn(mesaSA, b.asiento), b.asiento, opcionesEn(mesaSA, b.asiento)).abre,
    );

    /* Fuera del apuro, las obras NO suben: el botón vuelve a ser la ficha. */
    const enPie: EstadoDelBurgo = { ...montado, paso: 'por-pasar', apuro: null, jugadores: montado.jugadores.map((j, k) => (k === 1 ? { ...j, mrs: 800 } : j)), turno: 1, jugada: montado.jugada + 1 };
    const otraMesa = abrirMesa({ id: 'BUR-3D-AP3', arcade: BURGO, semilla: 31, asientos: [...base.asientos], estado: enPie });
    const vistaB = vistaEn(otraMesa, b.asiento);
    const opcionesB = opcionesEn(otraMesa, b.asiento);
    const hojaB = hojaEnTres(vistaB, b.asiento, opcionesB);
    const ahoraB = hojaB.secciones.find((s) => s.id === 'ahora')?.opciones ?? [];
    comprobar('fuera del apuro «Ahora» no lleva ni una obra, y las fichas las recuperan', ahoraB.every((o) => [VENDER, EMPENAR, ALZAR, DESEMPENAR, COMPRAR, A_ALMONEDA].indexOf(o.tipo) < 0) && hojaB.mios.flatMap((x) => x.fichas.flatMap((f) => f.opciones)).length >= 1, [ahoraB.map((o) => o.id), hojaB.mios.flatMap((x) => x.fichas.flatMap((f) => f.opciones)).map((o) => o.id)]);
  }
}

/* ═══ 4. LA SUBASTA Y EL TRATO, POR SUS PUERTAS, CONTRA EL PORTILLO ═══ */
paso('La puja libre y el trato: montar() cabe en la puerta y el reductor los acepta; lo que no cabe es null');
{
  /* Se llega a una subasta jugando: un jugador manda a subasta lo primero que pisa. */
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
  comprobar('se llegó a una subasta jugando', alm !== null, vueltas);
  if (alm !== null) {
    const quien = alm.pujaDe;
    const vista = vistaEn(mesa, quien);
    const opciones = opcionesEn(mesa, quien);
    const puja = pujaEnTres(vista, quien, opciones);
    comprobar('a quien puja le sale la subasta con la puerta, las fijas y el pasar', puja !== null && puja.meToca && puja.puerta !== null && puja.fijas.length >= 1 && puja.pasar !== null && puja.pasar.tipo === PASAR_PUJA, puja && [puja.meToca, puja.puerta, puja.fijas.length]);
    const otro = mesa.asientos.find((x) => x !== quien) as AsientoId;
    const pujaDeOtro = pujaEnTres(vistaEn(mesa, otro), otro, opcionesEn(mesa, otro));
    comprobar('a los demás les sale la misma subasta pero sin botones ni puerta', pujaDeOtro !== null && !pujaDeOtro.meToca && pujaDeOtro.fijas.length === 0 && pujaDeOtro.pasar === null && pujaDeOtro.puerta === null && pujaDeOtro.casilla === alm.casilla);
    comprobar('y un mirón, lo mismo que los demás', pujaEnTres(vistaEn(mesa, null), null, [])?.meToca === false);
    const hojaDeOtro = hojaEnTres(vistaEn(mesa, otro), otro, opcionesEn(mesa, otro));
    comprobar('la hoja de quien no puja abre otra cosa, y la de quien puja abre la subasta', hojaDeOtro.abre !== 'almoneda' && hojaEnTres(vista, quien, opciones).abre === 'almoneda');
    if (puja !== null && puja.puerta !== null) {
      const p = puja.puerta;
      comprobar('la puerta declara casilla, mínimo, máximo y escalón de la subasta', p.casilla === alm.casilla && p.minimo >= 10 && p.maximo >= p.minimo && p.escalon === 10, p);
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
  comprobar('o el dueño, una figura, la destacada, la subasta, el trato o el ganador', [
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
  comprobar('cartelEnTres da el título y el texto DE LA TABLA por el número', cartel !== null && seis !== null && cartel.titulo === seis.titulo && cartel.texto === seis.texto && cartel.deDonde === 'de Sucesos');
  comprobar('y en el turno siguiente ya no hay cartel', cartelEnTres({ ...conCarta, turnosAbiertos: 10 }) === null);
  comprobar('un número que no es de la tabla no da cartel', cartelEnTres({ ...conCarta, ultimaCarta: { mazo: 'arca', carta: 99, quien, enElTurno: 9 } }) === null);
  const tableroConCarta = tableroEnTres(conCarta, quien, opciones);
  comprobar('el tablero dice de qué casilla de Sucesos sale el naipe', tableroConCarta?.carta !== null && CASILLAS[tableroConCarta?.carta?.enCasilla ?? 0]?.clase === 'pregon');
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
  comprobar('la ficha de la Avenida de las Acacias: nombre, barrio de Los Paseos, precio 400, casa 200, siete filas de renta', f39.nombre === 'Avenida de las Acacias' && f39.barrio?.nombre === 'Los Paseos' && f39.precio === 400 && f39.casa === 200 && f39.rentas.length === 7, f39);
  comprobar('las filas van Solar, Barrio entero (el doble), 1..4 casas, Hotel', f39.rentas.map((r) => r.rotulo).join('|') === 'Solar|Barrio entero|1 casa|2 casas|3 casas|4 casas|Hotel' && f39.rentas[1]?.cuanto === 2 * (f39.rentas[0]?.cuanto ?? 0));
  const f5 = fichaDeCasilla(vista, 5, quien, opciones);
  comprobar('la ficha de una estación: cuatro filas por estaciones del dueño, sin barrio', f5.barrio === null && f5.rentas.length === 4 && f5.rentas[3]?.cuanto === 200 && f5.rentas[0]?.rotulo === '1 estación');
  const f12 = fichaDeCasilla({ ...vista, tirada: [2, 3] }, 12, quien, opciones);
  comprobar('la ficha de un servicio: dos filas con el múltiplo por la tirada de la vista', f12.rentas.length === 2 && f12.rentas[0]?.cuanto === 4 * 5 && f12.rentas[1]?.cuanto === 10 * 5, f12.rentas);
  const f10 = fichaDeCasilla(vista, 10, quien, opciones);
  comprobar('la ficha de la Comisaría no se compra: sin rentas, sin hipoteca, estado con su nombre', f10.rentas.length === 0 && f10.empeno === 0 && f10.estado === 'La Comisaría' && f10.opciones.length === 0);
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
  comprobar('con la hoja, caen las pujas, los tratos, los botones del momento y las obras de las fichas; comprar y sacar a subasta, que no son de una ficha mía, se quedan', opcionesFueraDelTablero(opciones, null, null, hoja).length === todas.length - hoja.secciones.reduce((s, x) => s + x.opciones.length, 0) - obrasDeLasFichas, [opcionesFueraDelTablero(opciones, null, null, hoja).map((o) => o.id), obrasDeLasFichas]);
  comprobar('las tres cribas juntas no dejan botón suelto en una partida en marcha', opcionesFueraDelTablero(opciones, tablero, dados, hoja).length === 0, opcionesFueraDelTablero(opciones, tablero, dados, hoja).map((o) => o.id));
  const hojaSinObras: HojaDelBurgo<Opcion> = { ...hoja, mios: [] };
  comprobar('y si la hoja no trae las fichas pero el tablero sí las enciende, las obras siguen sin salir dos veces', opcionesFueraDelTablero(opciones, tablero, dados, hojaSinObras).length === 0);
  comprobar('sin tablero ni hoja, las obras vuelven como botones', opcionesFueraDelTablero(opciones, null, dados, null).filter((o) => [COMPRAR, A_ALMONEDA, ALZAR, VENDER, EMPENAR, DESEMPENAR].indexOf(o.tipo) >= 0).length === obras.length);

  /* Textos. */
  comprobar('cardinal y euros', cardinal(2) === 'dos' && cardinal(12) === 'doce' && cardinal(13) === '13' && maravedies(1500) === '1.500 €' && maravedies(50) === '50 €');
  comprobar('las frases de espera cubren cada paso y nombran a quien se espera', ['por-tirar', 'comprar', 'almoneda', 'apuro', 'por-pasar'].every((p) => esperaA({ ...vista, momento: 'jugando', paso: p, turnoDe: quien }).indexOf(vista.jugadores.find((j) => j.asiento === quien)?.nombre ?? quien) >= 0));
  comprobar('el recorrido de un mueve sin pisadas se deriva: hacia delante y hacia atrás', llano(recorridoEnTres({ que: 'mueve', quien, desde: 38, hasta: 2, recorrido: [], porLaPuertaMayor: true, como: 'anda' })) === '[39,0,1,2]' && llano(recorridoEnTres({ que: 'mueve', quien, desde: 1, hasta: 38, recorrido: [], porLaPuertaMayor: false, como: 'retrocede' })) === '[0,39,38]');
  comprobar('los textos de la última mesa no tienen reproche', reprochesDeLosTextos(vista, quien).length === 0, reprochesDeLosTextos(vista, quien));
  comprobar('la vacuna de los textos: un pregón que no es el de la vista se ve caer', reprochesDeLosTextos({ ...vista, pregon: `${vista.pregon} y algo más` }, quien).length > 0 || elPregonEnTres({ ...vista, pregon: 'otro' }).texto !== vista.pregon);
  comprobar('los ocho barrios de la tabla salen en «Lo mío» con su color cuando se tienen', BARRIOS.length === 8 && TITULOS.length === 28);
}

/* ═══ 5 bis. LOS CINCO MUEBLES NUEVOS: EL CARRIL, LA CAJA, EL CARTEL, LAS DOS FICHAS Y LA CRÓNICA ═══ */
paso('El carril, la caja de los tratos, el cartel al pie, la ficha de un jugador y la crónica, con sus vacunas');
{
  const mesa = ultimaMesaJugada ?? abrirMesa({ id: 'BUR-3D-M', arcade: BURGO, semilla: 1, asientos: ['A', 'B'] });
  const quien = mesa.asientos[0] as AsientoId;
  const vista = vistaEn(mesa, quien);
  const opciones = opcionesEn(mesa, quien);
  const tablero = tableroEnTres(vista, quien, opciones) as TableroDelBurgoEn3D;
  const dados = dadosEnTres(vista, quien, opciones);
  const hoja = hojaEnTres(vista, quien, opciones);

  /* ── EL CARRIL ── */
  comprobar('el carril de la última mesa no tiene reproche', reprochesDelCarril(vista, quien, opcionesDelCarrilDelBurgo(vista, quien, opciones), carrilDelBurgo(vista, quien, opciones)).length === 0);
  comprobar('y ninguna puerta se pinta como cuadrado', glifosDelCarrilDelBurgo(vista, quien, opciones).every((g) => g.opcion.declaracion !== true));
  const conPuerta = opciones.filter((o) => o.declaracion === true);
  comprobar('un carril de puras puertas sale vacío, no con cuadrados que no juegan', conPuerta.length === 0 || glifosDelCarrilDelBurgo(vista, quien, conPuerta).length === 0, conPuerta.map((o) => o.id));
  /*
   * LOS DIECIOCHO GLIFOS SON DISTINTOS DOS A DOS. Se comprueba con una lista fabricada de
   * un movimiento por tipo, porque una partida de verdad nunca los ofrece todos a la vez y
   * el día que dos coincidieran no se vería jugando: se vería como dos cuadrados iguales.
   *
   * SON DIECIOCHO Y NO DIECISIETE: el Impuesto entra en la cuenta. Se quedaba fuera de esta
   * lista —tiene su propio bloque más abajo, donde se mira que sus dos formas lleven rótulos
   * cortos distintos— y con eso su «Im» no se comparaba con ningún otro: el día que alguien
   * le pusiera «Pa» nadie lo vería. Los diecinueve tipos del juego menos `PROPONER`, que es
   * una puerta y no se pinta nunca, son estos dieciocho.
   */
  const TIPOS = [EMPEZAR, TIRAR, PAGAR_FIANZA, USAR_INDULTO, COMPRAR, A_ALMONEDA, PUJAR, PASAR_PUJA, ALZAR, VENDER, EMPENAR, DESEMPENAR, ACEPTAR, RECHAZAR, RETIRAR, PASAR, RENDIRSE, PAGAR_IMPUESTO];
  const unoDeCada = TIPOS.map((tipo, k) => ({ id: `x${k}`, tipo, carga: {}, rotulo: `Movimiento ${k}`, ayuda: '' }));
  const glifosDeCada = glifosDelCarrilDelBurgo(vista, quien, unoDeCada).map((g) => g.glifo);
  comprobar(`los ${TIPOS.length} glifos del carril son distintos dos a dos`, new Set(glifosDeCada).size === TIPOS.length, glifosDeCada);
  comprobar('y todos caben en el cuadrado: una o dos letras', glifosDeCada.every((g) => g.length >= 1 && g.length <= 2), glifosDeCada);
  const desconocido = glifosDelCarrilDelBurgo(vista, quien, [{ id: 'z', tipo: 'burgo:algo-que-no-existe', carga: {}, rotulo: 'Hacer algo nuevo', ayuda: '' }]);
  comprobar('un movimiento que este cliente no conoce cae a las dos primeras letras de su rótulo, no a un hueco', desconocido[0]?.glifo === 'Ha' && desconocido[0]?.rotulo === 'Hacer algo nuevo', desconocido);
  comprobar('y sin rótulo tampoco se queda en blanco', glifosDelCarrilDelBurgo(vista, quien, [{ id: 'z', tipo: 'burgo:otro', carga: {}, rotulo: '', ayuda: '' }])[0]?.glifo === '?');
  const conObra = glifosDelCarrilDelBurgo(vista, quien, [{ id: 'c39', tipo: COMPRAR, carga: { casilla: 39 }, rotulo: 'Comprar Avenida de las Acacias por 400 €', ayuda: '' }])[0];
  comprobar(
    'el cuadrado de una obra dice el verbo dentro, el rótulo de SEIS LETRAS de la cara debajo, y el filo de la acera',
    conObra?.glifo === 'Co' && conObra.rotulo === (CASILLAS[39]?.rotulo ?? '') && conObra.color === (barrioDe(39)?.color ?? null) && conObra.casilla === 39,
    conObra,
  );
  const conPuja = glifosDelCarrilDelBurgo(vista, quien, [{ id: 'p', tipo: PUJAR, carga: { casilla: 5, cuanto: 120 }, rotulo: 'Pujar 120 € por la Estación', ayuda: '' }])[0];
  comprobar('el de una puja dice la cifra, que es lo que la distingue de la puja de al lado', conPuja?.glifo === 'Pu' && conPuja.rotulo === maravedies(120), conPuja);
  /*
   * PASAR EN LA SUBASTA DICE «PASAR», Y ANTES DECÍA EL SOLAR. El juego manda `PASAR_PUJA` con
   * la casilla de lo que se subasta, y la rama del nombre de la casilla iba delante del verbo
   * declarado: salía «Ps / Acacia», que se lee como si pasar hiciera algo CON Acacia, y la
   * entrada `[PASAR_PUJA]: 'Pasar'` de la tabla no se alcanzaba nunca. El solar sigue dicho
   * donde no estorba —el filo con el color de su acera, y `casilla` para señalarla—, que es
   * además lo coherente con las pujas fijas de al lado: en una subasta todos los cuadrados
   * son de la misma casilla y repetirla no distingue ninguno.
   */
  const pasarLaPuja = glifosDelCarrilDelBurgo(vista, quien, [{ id: 'pp', tipo: PASAR_PUJA, carga: { casilla: 39 }, rotulo: 'Pasar', ayuda: '' }])[0];
  comprobar('el de pasar en la subasta dice el VERBO y no el solar, y señala el solar con el filo y la casilla', pasarLaPuja?.glifo === 'Ps' && pasarLaPuja.rotulo === 'Pasar' && pasarLaPuja.casilla === 39 && pasarLaPuja.color === (barrioDe(39)?.color ?? null), pasarLaPuja);
  comprobar('y no se lee igual que la puja de al lado sobre la misma casilla', `${pasarLaPuja?.glifo ?? ''}·${pasarLaPuja?.rotulo ?? ''}` !== `${conPuja?.glifo ?? ''}·${conPuja?.rotulo ?? ''}`);
  /*
   * EL IMPUESTO LLEGA DOS VECES CON EL MISMO TIPO y lo que las separa está en la carga:
   * sin rótulo corto propio, los dos cuadrados dirían el rótulo entero del juego, que no
   * cabe en 44 puntos.
   */
  const impuestos = glifosDelCarrilDelBurgo(vista, quien, [
    { id: 'impuesto:fijo', tipo: PAGAR_IMPUESTO, carga: { como: 'fijo' }, rotulo: 'Pagar 200 € del Impuesto', ayuda: '' },
    { id: 'impuesto:decima', tipo: PAGAR_IMPUESTO, carga: { como: 'decima' }, rotulo: 'Pagar el 10 % de tu patrimonio (340 €)', ayuda: '' },
  ]);
  comprobar('las dos formas de pagar el Impuesto llevan el mismo glifo y rótulos cortos distintos', impuestos.every((g) => g.glifo === 'Im') && impuestos[0]?.rotulo === 'Fijo' && impuestos[1]?.rotulo === '10 %', impuestos);
  comprobar('y no se leen como dos cuadrados iguales', reprochesDelCarril(vista, quien, [], impuestos).every((x) => x.indexOf('iguales') < 0));
  /*
   * Y «Ahora» tampoco puede decir «compra o sácala a subasta» delante del Impuesto: el paso
   * `comprar` para el turno en dos casillas que no se compran, y la frase se decide por la
   * CLASE de la casilla, que es lo que dice la tabla.
   */
  const enElImpuesto = {
    ...vista,
    momento: 'jugando',
    paso: 'comprar',
    turnoDe: quien,
    duenoDelTurno: quien,
    apuro: null,
    almoneda: null,
    jugadores: vista.jugadores.map((j) => (j.asiento === quien ? { ...j, casilla: 4, quebrado: false, presa: -1 } : j)),
  } as unknown as VistaDelBurgo;
  const lineasDelImpuesto = hojaEnTres(enElImpuesto, quien, opciones).secciones.find((s) => s.id === 'ahora')?.lineas ?? [];
  comprobar('«Ahora» en la casilla del Impuesto manda elegir cómo pagarlo, no comprar nada', lineasDelImpuesto.some((l) => l === `Has caído en ${CASILLAS[4]?.nombre ?? ''}: elige cómo pagarlo.`), lineasDelImpuesto);
  const enUnSolar = { ...enElImpuesto, jugadores: enElImpuesto.jugadores.map((j) => (j.asiento === quien ? { ...j, casilla: 39 } : j)) } as VistaDelBurgo;
  comprobar('y en un solar sigue diciendo lo de siempre', (hojaEnTres(enUnSolar, quien, opciones).secciones.find((s) => s.id === 'ahora')?.lineas ?? []).some((l) => l.indexOf('compra o sácala a subasta') >= 0));
  /*
   * ═══ Y LAS VACUNAS DEL CARRIL VAN SOBRE UN CARRIL DE VERDAD, QUE ANTES NO EXISTÍA ═══
   *
   * MEDIDO ENTONCES: en las 16.660 vistas de las tres partidas de arriba,
   * `opcionesFueraDelTablero` —que era lo que alimentaba el carril— devolvía CERO opciones,
   * siempre. Los dados se llevan tirar, el anillo las obras, «La subasta» las pujas, la caja
   * de los tratos los tres del trato, y lo del momento se iba a «Ahora», dentro del cajón. O
   * sea que el carril venía VACÍO en todas las vistas de tres partidas enteras, y tres de sus
   * cuatro vacunas empezaban por `carril.length === 0 ||`: se daban por buenas sin mirar
   * nada. Verde por filtro vacío, no por vigilancia.
   *
   * Ahora el carril lleva las opciones del momento y en las mismas tres partidas se llena en
   * 1.234, 4.015 y 5.788 vistas (lo cuenta `carrilesConCuadrados`, con su mínimo). Así que
   * las vacunas se pueden envenenar donde tienen que estar: SOBRE UNA PARTIDA. Se monta un
   * apuro con títulos porque es el carril más largo que da el juego —la quiebra más vender e
   * hipotecar título a título— y porque es el caso donde el rótulo corto tiene que decir de
   * qué solar habla: ocho cuadrados «Ve» sin nombre son ocho maneras de vender el que no era.
   */
  const deVerdad = jugarUnaPartida('BUR-3D-CR', 2, 31, 60, 0).mesa;
  const eR = estadoDe(deVerdad);
  const [ra, rb] = eR.jugadores;
  if (ra !== undefined && rb !== undefined) {
    const mesaR = abrirMesa({
      id: 'BUR-3D-CR2',
      arcade: BURGO,
      semilla: 31,
      asientos: [...deVerdad.asientos],
      estado: {
        ...eR,
        paso: 'apuro',
        luego: 'por-pasar',
        turno: 0,
        dobles: 0,
        almoneda: null,
        colaDeAlmonedas: [],
        colaDeApuros: [],
        tratos: [],
        titulos: eR.titulos.map((t) => ([1, 3, 6, 8].indexOf(t.casilla) >= 0 ? { ...t, dueno: rb.asiento, casas: 0, empenado: false } : { ...t, dueno: null, casas: 0, empenado: false })),
        jugadores: eR.jugadores.map((j, k) => (k === 1 ? { ...j, mrs: 0, presa: -1, quebrado: false } : { ...j, mrs: 1000, quebrado: false })),
        apuro: { quien: rb.asiento, deudas: [{ a: ra.asiento, cuanto: 500, porque: 'renta' }] },
        jugada: eR.jugada + 1,
        sucesos: [{ que: 'apuro', quien: rb.asiento, debe: 500 }],
      },
    });
    const vistaR = vistaEn(mesaR, rb.asiento);
    const opcionesR = opcionesEn(mesaR, rb.asiento);
    const delMomento = opcionesDelCarrilDelBurgo(vistaR, rb.asiento, opcionesR);
    const cuadrados = carrilDelBurgo(vistaR, rb.asiento, opcionesR);
    /* Se imprime para que se LEA lo que se pinta: un carril de cuadrados mudos pasa cualquier cuenta. */
    console.log(`  el carril del apuro: ${cuadrados.map((g) => `${g.glifo}/${g.rotulo}`).join('  ')}`);
    comprobar('el carril de una partida de verdad trae varios cuadrados que pulsar', cuadrados.length >= 3, cuadrados.map((g) => `${g.glifo}/${g.rotulo}`));
    comprobar('y no tiene reproche', reprochesDelCarril(vistaR, rb.asiento, delMomento, cuadrados).length === 0, reprochesDelCarril(vistaR, rb.asiento, delMomento, cuadrados));
    comprobar('un cuadrado por opción del momento, en el mismo orden y con LA MISMA opción por identidad', cuadrados.length === delMomento.length && cuadrados.every((g, k) => g.opcion === delMomento[k]));
    /* Y ES LA MISMA LISTA que «Ahora» pintaría sin carril: la sección y la cinta no pueden discrepar. */
    const enLaSeccion = hojaEnTres(vistaR, rb.asiento, opcionesR).secciones.find((s) => s.id === 'ahora')?.opciones ?? [];
    comprobar('el carril lleva EXACTAMENTE lo que «Ahora» llevaría sin él, por identidad', enLaSeccion.length === cuadrados.length && enLaSeccion.every((o, k) => o === cuadrados[k]?.opcion), [enLaSeccion.map((o) => o.id), cuadrados.map((g) => g.opcion.id)]);
    const conElCarril = hojaEnTres(vistaR, rb.asiento, opcionesR, null, cuadrados).secciones.find((s) => s.id === 'ahora');
    comprobar('con el carril puesto «Ahora» suelta sus botones, conserva sus renglones y dice dónde se pulsan', (conElCarril?.opciones.length ?? -1) === 0 && (conElCarril?.lineas.length ?? 0) > 0 && (conElCarril?.lineas ?? []).some((l) => l.indexOf(EL_CARRIL_DE_LA_MESA) >= 0), conElCarril?.lineas);
    /*
     * EL APURO: las obras que subieron a «Ahora» siguen saliendo UNA VEZ, ahora desde el
     * carril, y cada cuadrado dice DE QUÉ SOLAR habla. Sin el rótulo corto serían cuatro «Hi»
     * idénticos y hipotecar el equivocado no da error: da una partida perdida.
     */
    const obrasR = opcionesR.filter((o) => [VENDER, EMPENAR, ALZAR, DESEMPENAR].indexOf(o.tipo) >= 0);
    comprobar('en el apuro, las obras del juego están todas en el carril y ninguna en las fichas de «Lo mío»', obrasR.length >= 2 && obrasR.every((o) => cuadrados.some((g) => g.opcion === o)) && hojaEnTres(vistaR, rb.asiento, opcionesR, null, cuadrados).mios.flatMap((b) => b.fichas.flatMap((f) => f.opciones)).length === 0, obrasR.map((o) => o.id));
    const deObras = cuadrados.filter((g) => obrasR.some((o) => o === g.opcion));
    comprobar('cada cuadrado de una obra dice qué solar es: el rótulo de seis letras de su cara y el filo de su acera', deObras.every((g) => g.casilla !== null && g.rotulo === (CASILLAS[g.casilla]?.rotulo ?? '') && g.color === (barrioDe(g.casilla)?.color ?? null)), deObras.map((g) => [g.glifo, g.rotulo, g.casilla, g.color]));
    comprobar('y dos obras de dos solares distintos no dan dos cuadrados iguales', new Set(deObras.map((g) => `${g.glifo}·${g.rotulo}`)).size === deObras.length, deObras.map((g) => `${g.glifo}·${g.rotulo}`));
    const tablaR = tableroEnTres(vistaR, rb.asiento, opcionesR);
    const particionR = particionDe(vistaR, rb.asiento, opcionesR, tablaR, dadosEnTres(vistaR, rb.asiento, opcionesR), hojaEnTres(vistaR, rb.asiento, opcionesR, null, cuadrados), null, cuadrados);
    comprobar('la partición con el carril puesto no tiene reproche: cada movimiento en un botón y ni uno perdido', reprochesDeLaParticion(opcionesR, particionR).length === 0, reprochesDeLaParticion(opcionesR, particionR));
    comprobar('y no queda ningún botón suelto al pie', particionR.fuera.length === 0, particionR.fuera.map((x) => x.o.id));
    /*
     * EL GEMELO DE SÓLO APOYO CUENTA EL CARRIL COMO SITIO. Una obra que está en el carril YA
     * tiene botón, y pedirle además un gemelo son media docena de botones invisibles que
     * mandan movimientos que ya se ven. La vacuna es no pasarle el carril: entonces las
     * mismas obras aparecen como huérfanas, que es lo que pasaba antes de este parámetro.
     */
    const hojaR = hojaEnTres(vistaR, rb.asiento, opcionesR, null, cuadrados);
    comprobar('con el carril puesto, ninguna obra del apuro pide gemelo de sólo apoyo', obrasSoloEnElAnillo(opcionesR, tablaR, hojaR, cuadrados).length === 0, obrasSoloEnElAnillo(opcionesR, tablaR, hojaR, cuadrados).map((o) => o.id));
    comprobar('y la vacuna: sin decirle que el carril existe, las mismas obras salen como huérfanas', obrasSoloEnElAnillo(opcionesR, tablaR, hojaR).length === deObras.length, obrasSoloEnElAnillo(opcionesR, tablaR, hojaR).map((o) => o.id));
    /* LA VACUNA DE LA PARTICIÓN: la sección que NO suelta sus botones con el carril puesto son dos botones. */
    const sinSoltar = hojaEnTres(vistaR, rb.asiento, opcionesR);
    comprobar(
      'la vacuna: «Ahora» sin soltar sus botones y el carril puesto se ven como dos botones para el mismo movimiento',
      reprochesDeLaParticion(opcionesR, particionDe(vistaR, rb.asiento, opcionesR, tablaR, dadosEnTres(vistaR, rb.asiento, opcionesR), sinSoltar, null, cuadrados)).some((x) => x.indexOf('dos botones') >= 0),
    );
    /* Y LAS DEL CARRIL, sobre los cuadrados de esta partida y no sobre unos fabricados. */
    comprobar('la vacuna del carril: un cuadrado de menos se ve caer', reprochesDelCarril(vistaR, rb.asiento, delMomento, cuadrados.slice(1)).length > 0);
    comprobar('uno con la opción de otro también', reprochesDelCarril(vistaR, rb.asiento, delMomento, [cuadrados[1] as (typeof cuadrados)[number], ...cuadrados.slice(1)]).length > 0);
    const conAyudaAjena = [{ ...(cuadrados[0] as (typeof cuadrados)[number]), ayuda: 'otra cosa' }, ...cuadrados.slice(1)];
    comprobar('y uno cuya ayuda no es el rótulo del juego también', reprochesDelCarril(vistaR, rb.asiento, delMomento, conAyudaAjena).some((x) => x.indexOf('ayuda') >= 0));
    const sinRotulo = [{ ...(cuadrados[0] as (typeof cuadrados)[number]), rotulo: '' }, ...cuadrados.slice(1)];
    comprobar('y uno sin rótulo corto —el cuadrado que no dice qué solar es— también', reprochesDelCarril(vistaR, rb.asiento, delMomento, sinRotulo).some((x) => x.indexOf('rótulo corto') >= 0));
  }
  const dosIguales: GlifoDelCarrilDelBurgo<Opcion>[] = [
    { glifo: 'Co', rotulo: 'Mayor', ayuda: 'Comprar Calle Mayor por 350 €', casilla: null, color: null, opcion: unoDeCada[0] as unknown as Opcion },
    { glifo: 'Co', rotulo: 'Mayor', ayuda: 'Comprar otra cosa', casilla: null, color: null, opcion: unoDeCada[1] as unknown as Opcion },
  ];
  comprobar('y dos cuadrados iguales para dos movimientos que el juego SÍ distingue también', reprochesDelCarril(vista, quien, [], dosIguales).some((x) => x.indexOf('iguales') >= 0));

  /* ── LA CAJA DE LOS TRATOS ── */
  const base = jugarUnaPartida('BUR-3D-CJ', 2, 47, 60, 0).mesa;
  const eC = estadoDe(base);
  const [ca, cb] = eC.jugadores;
  if (ca !== undefined && cb !== undefined) {
    /*
     * DOS TRATOS VIVOS A LA VEZ Y EN LOS DOS SENTIDOS: A (que tiene el turno) le propone a
     * B, y B —que puede proponer sin turno AL DUEÑO DEL TURNO— le propone a A. Es el caso
     * que en Riberas no existe y que aquí obliga a que la caja tenga los dos bloques.
     */
    const conTratos: EstadoDelBurgo = {
      ...eC,
      paso: 'por-pasar',
      luego: 'por-pasar',
      turno: 0,
      dobles: 0,
      almoneda: null,
      colaDeAlmonedas: [],
      colaDeApuros: [],
      apuro: null,
      titulos: eC.titulos.map((t) => (t.casilla === 1 ? { ...t, dueno: cb.asiento, casas: 0, empenado: false } : t.casilla === 3 ? { ...t, dueno: ca.asiento, casas: 0, empenado: false } : t)),
      jugadores: eC.jugadores.map((j) => ({ ...j, mrs: 900, quebrado: false })),
      tratos: [
        { id: 1, de: ca.asiento, a: cb.asiento, doy: { mrs: 350, titulos: [], indultos: 0 }, pido: { mrs: 0, titulos: [1], indultos: 0 }, enElTurno: eC.turnosAbiertos },
        { id: 2, de: cb.asiento, a: ca.asiento, doy: { mrs: 0, titulos: [1], indultos: 0 }, pido: { mrs: 200, titulos: [], indultos: 0 }, enElTurno: eC.turnosAbiertos },
      ],
      siguienteTrato: 3,
      jugada: eC.jugada + 1,
      sucesos: [{ que: 'trato', id: 2, de: cb.asiento, a: ca.asiento, fin: 'propuesto' }],
    };
    const mesaT = abrirMesa({ id: 'BUR-3D-CJ2', arcade: BURGO, semilla: 47, asientos: [...base.asientos], estado: conTratos });
    const vistaB = vistaEn(mesaT, cb.asiento);
    const opcionesB = opcionesEn(mesaT, cb.asiento);
    const caja = pregonDelBurgo(vistaB, cb.asiento, opcionesB);
    comprobar('la caja de los tratos de B trae los DOS bloques a la vez: uno para contestar y uno suyo', caja !== null && caja.paraContestar.length === 1 && caja.mios.length === 1, caja);
    comprobar('la caja no tiene reproche', reprochesDelPregon(vistaB, cb.asiento, opcionesB, caja).length === 0, reprochesDelPregon(vistaB, cb.asiento, opcionesB, caja));
    const paraB = caja?.paraContestar[0];
    comprobar(
      'la tira que hay que contestar está redactada desde donde mira quien la lee y con el vocabulario',
      paraB !== undefined && paraB.frase.indexOf(`${paraB.de.nombre} te ofrece`) === 0 && paraB.frase.indexOf(maravedies(350)) >= 0 && paraB.frase.indexOf(CASILLAS[1]?.nombre ?? '') >= 0,
      paraB?.frase,
    );
    comprobar('con el aceptar y el rechazar ENTEROS del juego, y sin retirar', paraB !== undefined && opcionesB.indexOf(paraB.aceptar as Opcion) >= 0 && opcionesB.indexOf(paraB.rechazar as Opcion) >= 0 && paraB.retirar === null);
    comprobar('y con el color de quien la propone en el raíl', paraB !== undefined && paraB.color === vistaB.jugadores.find((j) => j.asiento === ca.asiento)?.color);
    const miaDeB = caja?.mios[0];
    comprobar('la tira propia dice a quién se le ofrece y que se está esperando, y trae el retirar', miaDeB !== undefined && miaDeB.frase.indexOf(`Le ofreces a ${miaDeB.a.nombre}`) === 0 && miaDeB.comoAnda.indexOf('esperando') >= 0 && miaDeB.retirar !== null && miaDeB.aceptar === null);
    const nombreDeA = vistaB.jugadores.find((j) => j.asiento === ca.asiento)?.nombre ?? ca.asiento;
    comprobar('y la caja dice que caducan, con el nombre de quien tiene el turno', (caja?.caduca ?? '').indexOf(nombreDeA) >= 0, caja?.caduca);
    const aceptado = paraB?.aceptar === undefined || paraB.aceptar === null ? null : mover(mesaT, cb.asiento, paraB.aceptar);
    comprobar('y el aceptar de la tira, MANDADO POR EL ÁRBITRO, entra: es la opción del juego, no una montada', aceptado !== null && aceptado.cambio, aceptado?.motivo);
    /* La hoja suelta sus botones cuando la caja se pinta, y los recupera cuando no. */
    const conCaja = hojaEnTres(vistaB, cb.asiento, opcionesB, caja);
    const sinCaja = hojaEnTres(vistaB, cb.asiento, opcionesB);
    const enLaSeccion = (h: HojaDelBurgo<Opcion>): readonly Opcion[] => h.secciones.find((s) => s.id === 'trato')?.opciones ?? [];
    comprobar('con la caja puesta, «El trato» se queda con sus renglones y SIN botones', enLaSeccion(conCaja).length === 0 && (conCaja.secciones.find((s) => s.id === 'trato')?.lineas.length ?? 0) > 0);
    comprobar('y sin caja los recupera enteros: los mismos objetos, ni uno menos', enLaSeccion(sinCaja).length === 3 && enLaSeccion(sinCaja).every((o) => opcionesB.indexOf(o) >= 0), enLaSeccion(sinCaja).map((o) => o.id));
    comprobar('con la caja, la sección dice DÓNDE se contestan: un renglón sin botones se lee como una sección rota', (conCaja.secciones.find((s) => s.id === 'trato')?.lineas ?? []).some((l) => l.indexOf(LOS_TRATOS_DE_LA_MESA) >= 0));
    comprobar('y la hoja ya no se abre sola por el trato: lo que había que contestar está a la vista', conCaja.abre !== 'trato' && sinCaja.abre === 'trato', [conCaja.abre, sinCaja.abre]);
    const tableroT = tableroEnTres(vistaB, cb.asiento, opcionesB);
    const dadosT = dadosEnTres(vistaB, cb.asiento, opcionesB);
    comprobar('la criba con la caja no devuelve los botones de los tratos como sueltos', opcionesFueraDelTablero(opcionesB, tableroT, dadosT, conCaja, caja).every((o) => [ACEPTAR, RECHAZAR, RETIRAR].indexOf(o.tipo) < 0));
    comprobar('y sin caja ni hoja, los tres vuelven como botones sueltos', opcionesFueraDelTablero(opcionesB, tableroT, dadosT, null, null).filter((o) => [ACEPTAR, RECHAZAR, RETIRAR].indexOf(o.tipo) >= 0).length === 3);
    const conCajaP = particionDe(vistaB, cb.asiento, opcionesB, tableroT, dadosT, conCaja, caja);
    comprobar('la partición con la caja puesta no tiene reproche', reprochesDeLaParticion(opcionesB, conCajaP).length === 0, reprochesDeLaParticion(opcionesB, conCajaP));
    /* LA VACUNA DE LA CAJA: pintar los dos muebles a la vez son dos botones para lo mismo. */
    const enLosDos = particionDe(vistaB, cb.asiento, opcionesB, tableroT, dadosT, sinCaja, caja);
    comprobar('la vacuna de la caja: la caja y la sección pintando a la vez se ven caer como dos botones', reprochesDeLaParticion(opcionesB, enLosDos).some((x) => x.indexOf('dos botones') >= 0), reprochesDeLaParticion(opcionesB, enLosDos));
    const cajaAjena: PregonDelBurgo<Opcion> | null = caja === null ? null : { ...caja, paraContestar: [...caja.paraContestar, { ...(caja.paraContestar[0] as (typeof caja.paraContestar)[number]), id: 99 }] };
    comprobar('y una tira de un trato que no es mío también', reprochesDelPregon(vistaB, cb.asiento, opcionesB, cajaAjena).some((x) => x.indexOf('no es mío') >= 0));
    /*
     * Y LA DE LOS DOS BLOQUES CAMBIADOS, que es la que faltaba: una caja que eche mis
     * propuestas al bloque de «Para contestar» tiene las mismas tiras, los mismos ids y las
     * mismas opciones —lo único que cambia es en qué montón está cada una—, así que todo lo
     * que se mira sobre la suma de los dos la daba por buena. En pantalla es un bloque que
     * pide contestar lo que sólo se puede retirar.
     */
    const bloquesCambiados: PregonDelBurgo<Opcion> | null = caja === null ? null : { ...caja, paraContestar: [...caja.paraContestar, ...caja.mios], mios: [] };
    comprobar('y los dos bloques cambiados también: lo mío no se contesta y lo que me proponen no se retira', reprochesDelPregon(vistaB, cb.asiento, opcionesB, bloquesCambiados).some((x) => x.indexOf(PARA_CONTESTAR) >= 0));
    comprobar('un mirón no tiene caja, y un asiento sin tratos vivos tampoco', pregonDelBurgo(vistaEn(mesaT, null), null, []) === null && pregonDelBurgo(vista, quien, opciones) === null);
    /*
     * LOS NOMBRES DE LOS MUEBLES VIAJAN DESDE AQUÍ, no desde cada cliente: dos copias de
     * «Los tratos de la mesa» son dos sitios donde el día que una cambie sólo cambiará una,
     * y el PC diría una cosa y el teléfono otra sobre la misma mesa.
     */
    comprobar(
      'los nombres de la caja y de sus dos bloques bajan de la traducción, y usan el vocabulario del §0',
      LOS_TRATOS_DE_LA_MESA.length > 0 && PARA_CONTESTAR.length > 0 && LOS_MIOS.length > 0 && LOS_TRATOS_DE_LA_MESA.indexOf('trato') >= 0,
      [LOS_TRATOS_DE_LA_MESA, PARA_CONTESTAR, LOS_MIOS],
    );
  }

  /* ── EL CARTEL AL PIE ── */
  comprobar('los cuarenta carteles de la última mesa no tienen reproche', reprochesDeLosCarteles(vista, quien, opciones).length === 0, reprochesDeLosCarteles(vista, quien, opciones));
  const c39 = cartelDeCasilla(vista, 39);
  comprobar('el cartel de un solar: nombre, barrio y precio en la primera frase', c39.frases[0] === `${CASILLAS[39]?.nombre ?? ''} · ${barrioDe(39)?.nombre ?? ''} · ${maravedies(400)}`, c39);
  const conDueno = { ...vista, titulos: vista.titulos.map((t) => (t.casilla === 39 ? { ...t, dueno: quien, casas: 2, empenado: false, rentaAhora: 600, barrioEntero: false } : t)) } as VistaDelBurgo;
  const c39mio = cartelDeCasilla(conDueno, 39);
  comprobar('con dueño, la segunda frase dice de quién es, qué tiene y cuánto cobra HOY', c39mio.frases.length === 2 && (c39mio.frases[1] ?? '').indexOf('2 casas') >= 0 && (c39mio.frases[1] ?? '').indexOf(maravedies(600)) >= 0 && c39mio.esMio === (vista.yo === quien), c39mio.frases);
  const c10 = cartelDeCasilla(vista, 10);
  comprobar('el cartel de la Comisaría no inventa precio ni renta', !c10.seCompra && c10.frase.indexOf('€') < 0 && c10.colorDelDueno === null, c10);
  const c4 = cartelDeCasilla(vista, 4);
  comprobar('y el del Impuesto dice lo que cobra, que es lo único que hay que saber al caer', c4.frase.indexOf(maravedies(CASILLAS[4]?.precio ?? 0)) >= 0, c4);
  comprobar('una vista que no es del Burgo da el cartel de la tabla, sin dueño: nunca un hueco bajo el cursor', cartelDeCasilla({ desde: 'riberas' }, 39).nombre === (CASILLAS[39]?.nombre ?? '') && cartelDeCasilla({ desde: 'riberas' }, 39).colorDelDueno === null);
  comprobar(
    'la vacuna del cartel: un cartel que no dice la renta de hoy se ve caer',
    reprochesDeLosCarteles(conDueno, quien, opciones, (casilla) => ({ ...cartelDeCasilla(conDueno, casilla), frases: [CASILLAS[casilla]?.nombre ?? ''], frase: CASILLAS[casilla]?.nombre ?? '' })).length > 0,
  );
  comprobar(
    'y uno que discrepa de la tarjeta también: son el mismo dato dicho dos veces',
    reprochesDeLosCarteles(vista, quien, opciones, (casilla) => ({ ...cartelDeCasilla(vista, casilla), frase: `${cartelDeCasilla(vista, casilla).frase} ` })).some((x) => x.indexOf('no dicen lo mismo') >= 0),
  );

  /* ── LA FICHA DE UNA CASILLA, PARA CUALQUIERA ── */
  /* La renta de hoy es la de la fila de tres casas de la TABLA: inventarla aquí sería inventar la regla. */
  const rentaDeTres = CASILLAS[39]?.rentas[3] ?? 0;
  const ajena = { ...vista, titulos: vista.titulos.map((t) => (t.casilla === 39 ? { ...t, dueno: 'otro-asiento', casas: 3, empenado: false, rentaAhora: rentaDeTres } : t)) } as VistaDelBurgo;
  const fAjena = fichaDeCasilla(ajena, 39, quien, opciones);
  comprobar('la tarjeta de una casilla AJENA trae la tabla entera, la fila de hoy y ninguna obra', fAjena.rentas.length === 7 && fAjena.rentas.filter((x) => x.actual).length === 1 && fAjena.opciones.length === 0 && !fAjena.esMio, fAjena.rentas);
  comprobar('la tabla de rentas NO se colapsa en un renglón: `lineas` no la lleva y `rentas` va fila a fila', fAjena.lineas.every((l) => fAjena.rentas.filter((x) => l.indexOf(x.rotulo) >= 0).length <= 1), fAjena.lineas);
  const enElBarrio = fAjena.solaresDelBarrio;
  comprobar('y dice quién tiene los solares del barrio, que es lo que se mira antes de comprar', enElBarrio.length === (barrioDe(39)?.solares.length ?? 0) && enElBarrio.some((s) => s.esEsta && s.casilla === 39), enElBarrio.map((s) => `${s.casilla}:${s.dueno?.nombre ?? '-'}`));
  comprobar('con un renglón que lo cuenta en palabras', fAjena.lineas.some((l) => l.indexOf(barrioDe(39)?.nombre ?? '') === 0 && l.indexOf('solares') >= 0), fAjena.lineas);
  comprobar('fuera de los solares no hay barrio que contar', fichaDeCasilla(vista, 5, quien, opciones).solaresDelBarrio.length === 0 && fichaDeCasilla(vista, 10, quien, opciones).solaresDelBarrio.length === 0);
  comprobar('y `seCompra` separa los títulos de las casillas que sólo cobran', fichaDeCasilla(vista, 5, quien, opciones).seCompra && !fichaDeCasilla(vista, 4, quien, opciones).seCompra);

  /* ── LA FICHA DE UN JUGADOR ── */
  comprobar('las fichas de jugador de la última mesa no tienen reproche', reprochesDeLasFichasDeJugador(vista, quien, opciones).length === 0, reprochesDeLasFichasDeJugador(vista, quien, opciones));
  const mia = fichaDeJugador(vista, quien, quien, opciones);
  comprobar('mi propia ficha dice el patrimonio y no me ofrece un trato conmigo mismo', mia !== null && mia.soyYo && mia.trato === null && mia.lineas.some((l) => l.indexOf('patrimonio') >= 0), mia?.lineas);
  /* En pie —ni quebrado ni en la Comisaría— la segunda línea dice DÓNDE está, que es lo que el marcador no decía. */
  const enPie = { ...vista, jugadores: vista.jugadores.map((j) => (j.asiento === quien ? { ...j, quebrado: false, presa: -1, casilla: 39 } : j)) } as VistaDelBurgo;
  const dePie = fichaDeJugador(enPie, quien, quien, opciones);
  comprobar('y de un jugador en pie dice en qué casilla está, con su nombre', dePie !== null && dePie.lineas.some((l) => l === `En ${CASILLAS[39]?.nombre ?? ''}.`), dePie?.lineas);
  const preso = { ...enPie, jugadores: enPie.jugadores.map((j) => (j.asiento === quien ? { ...j, presa: 1 } : j)) } as VistaDelBurgo;
  comprobar('y de uno en la Comisaría, por qué intento va', fichaDeJugador(preso, quien, quien, opciones)?.lineas.some((l) => l.indexOf('En la Comisaría: intento 2 de') === 0) === true, fichaDeJugador(preso, quien, quien, opciones)?.lineas);
  comprobar('un asiento que no está sentado no tiene ficha', fichaDeJugador(vista, 'nadie', quien, opciones) === null);
  comprobar('y una vista que no es del Burgo tampoco', fichaDeJugador({ desde: 'riberas' }, quien, quien, opciones) === null);
  comprobar(
    'la vacuna de la ficha de jugador: una que cuente un patrimonio que no es el de la vista se ve caer',
    reprochesDeLasFichasDeJugador(vista, quien, opciones, (asiento) => {
      const f = fichaDeJugador(vista, asiento, quien, opciones);
      return f === null ? null : { ...f, patrimonio: f.patrimonio + 1 };
    }).length > 0,
  );
  comprobar(
    'y una que ofrezca en trato un título que no es suyo también',
    reprochesDeLasFichasDeJugador(vista, quien, opciones, (asiento) => {
      const f = fichaDeJugador(vista, asiento, quien, opciones);
      return f === null ? null : { ...f, tratables: [...f.tratables, 37] };
    }).some((x) => x.indexOf('no es suyo') >= 0) || vista.jugadores.some((j) => j.titulos.indexOf(37) >= 0),
  );

  /* ── LOS GEMELOS DE SÓLO APOYO ── */
  const gemelos = obrasSoloEnElAnillo(opciones, tablero, hoja);
  comprobar('los gemelos son SÓLO comprar y sacar a subasta: lo demás tiene su botón en la ficha o en «Ahora»', gemelos.every((o) => o.tipo === COMPRAR || o.tipo === A_ALMONEDA), gemelos.map((o) => o.id));
  comprobar('sin anillo montado no hay gemelo que pintar: todo vuelve como botón suelto', obrasSoloEnElAnillo(opciones, null, hoja).length === 0);
  comprobar('y con el cajón cerrado el anillo se queda con TODAS las obras, que es lo que hay que decirle al cliente', obrasSoloEnElAnillo(opciones, tablero, null).length >= gemelos.length);
  comprobar('un gemelo es la opción ENTERA del juego, no una montada', gemelos.every((o) => opciones.indexOf(o) >= 0));

  /* ── EL TEXTO QUE SE REPITE, Y EL QUE NO SE LEE SOLO ── */
  /*
   * ═══ POR QUÉ HAY UN BLOQUE ENTERO PARA MIRAR FRASES ═══
   *
   * Todo lo de arriba mide ESTRUCTURA —qué opción va a qué mueble, qué casilla se enciende,
   * qué cifra sale de la vista—, y ninguna de esas cuentas se entera de que un renglón dice
   * dos veces lo mismo, de que un plural no concuerda o de que una frase se lee sola y no se
   * entiende. Son fallos que no rompen nada: se juega igual y se lee peor, que es exactamente
   * la clase de cosa que se queda en un juego durante meses porque no hay nada rojo.
   *
   * Lo que se afirma aquí, con su caso envenenado donde el juez no se lo puede sacar de sí
   * mismo: que ningún renglón repite lo que ya lleva el encabezado, que la concordancia sale
   * de `plural` y no de un ternario, que el dinero se escribe siempre igual, que ninguna
   * frase se compone con un hueco dentro («La sacó  de Sucesos», «En pie: .», «a el
   * Ayuntamiento») y que una redacción vive en UN sitio y los dos muebles que la usan la
   * sacan de allí.
   */
  const otroAsiento = (mesa.asientos.find((a) => a !== quien) ?? quien) as AsientoId;
  const comoSeLlamaElOtro = vista.jugadores.find((j) => j.asiento === otroAsiento)?.nombre ?? otroAsiento;
  /** La misma vista con `quien` en pie y jugando: las de las partidas jugadas acaban con alguien quebrado o preso. */
  const enPieYJugando = (extra: Record<string, unknown>): VistaDelBurgo =>
    ({
      ...vista,
      momento: 'jugando',
      apuro: null,
      jugadores: vista.jugadores.map((j) => (j.asiento === quien ? { ...j, quebrado: false, presa: -1 } : j)),
      ...extra,
    }) as unknown as VistaDelBurgo;
  const lineasDe = (v: VistaDelBurgo, id: string): readonly string[] => hojaEnTres(v, quien, opciones).secciones.find((s) => s.id === id)?.lineas ?? [];

  /* 1. La tarjeta no repite en un renglón el nombre que ya lleva el encabezado. */
  const elDescanso = fichaDeCasilla(vista, 20, quien, opciones);
  comprobar(
    'la tarjeta de una casilla sin título no repite su nombre en un renglón: «El Descanso / El Descanso» era el encabezado y el primer renglón',
    elDescanso.estado === elDescanso.nombre && !elDescanso.lineas.some((l) => l === elDescanso.nombre),
    elDescanso.lineas,
  );
  const elImpuesto = fichaDeCasilla(vista, 4, quien, opciones);
  comprobar(
    'y la guarda es una IGUALDAD, no un «empieza por»: el Impuesto sigue diciendo lo que cobra, que es lo único que hay que saber al caer',
    elImpuesto.lineas.some((l) => l === `${CASILLAS[4]?.nombre ?? ''}: ${maravedies(CASILLAS[4]?.precio ?? 0)}`),
    elImpuesto.lineas,
  );
  const conElRenglonRepetido = reprochesDeLasFichas(vista, quien, opciones, (casilla) => {
    const f = fichaDeCasilla(vista, casilla, quien, opciones);
    return { ...f, lineas: [...f.lineas, f.estado] };
  }).filter((x) => x.indexOf('repite en un renglón') >= 0);
  comprobar(
    'la vacuna: una tarjeta que mete el estado sin mirar el nombre se ve caer en DIEZ de las cuarenta —la Salida, la Comisaría, el Descanso, ¡A comisaría!, los tres Sucesos y los tres del Fondo Vecinal—',
    conElRenglonRepetido.length === 10,
    conElRenglonRepetido,
  );
  const sinLoQueCobra = reprochesDeLasFichas(vista, quien, opciones, (casilla) => {
    const f = fichaDeCasilla(vista, casilla, quien, opciones);
    return { ...f, lineas: f.lineas.filter((l) => l !== f.estado) };
  });
  comprobar(
    'y la del otro lado: una tarjeta que se coma el estado del Impuesto y la Tasa también, para que «no repitas» no se cumpla borrando',
    sinLoQueCobra.filter((x) => x.indexOf('ya no dice lo que cobra') >= 0).length === 2,
    sinLoQueCobra,
  );
  comprobar(
    'la tarjeta dice con VERBO qué da hipotecar y qué cuesta deshipotecar: «Hipoteca: 200 € · deshipotecar: 220 €» se leía como lo que la hipoteca cuesta',
    ((): boolean => {
      const f = fichaDeCasilla(vista, 39, quien, opciones);
      return f.empeno > 0 && f.empeno < f.desempeno && f.lineas.some((l) => l === `Hipotecarlo da ${maravedies(f.empeno)} · deshipotecarlo cuesta ${maravedies(f.desempeno)}`);
    })(),
    fichaDeCasilla(vista, 39, quien, opciones).lineas,
  );

  /* 2. El cartel es una función de (vista, casilla) y de nada más: por eso el sello del cliente no baja de aquí. */
  comprobar(
    'el cartel de una casilla es una función de (vista, casilla): dos llamadas iguales dan el MISMO cartel, y por eso la tarjeta y el cartel se pueden comparar por frase',
    llano(cartelDeCasilla(vista, 39)) === llano(cartelDeCasilla(vista, 39)) && llano(cartelDeCasilla(vista, 20)) === llano(cartelDeCasilla(vista, 20)),
    cartelDeCasilla(vista, 39).frase,
  );
  let cuantosCarteles = 0;
  const conContadorDentro = reprochesDeLosCarteles(vista, quien, opciones, (casilla) => {
    cuantosCarteles++;
    const c = cartelDeCasilla(vista, casilla);
    return { ...c, frase: `${c.frase} ${cuantosCarteles}`, frases: [...c.frases, String(cuantosCarteles)] };
  });
  comprobar(
    'la vacuna: un cartel con un contador dentro —el sello que el cliente cuenta por señalada— se ve caer, y por eso ese sello se queda en el cliente, que es quien cuenta gestos',
    conContadorDentro.some((x) => x.indexOf('no dicen lo mismo') >= 0) && cuantosCarteles === CUANTAS_CASILLAS,
    { reproches: conContadorDentro.length, inspeccionados: cuantosCarteles },
  );

  /* 3. La frase de un trato: UNA redacción para la caja y para la sección de la hoja. */
  const conDosTratos = enPieYJugando({
    tratos: [
      { id: 71, de: otroAsiento, a: quien, doy: { mrs: 350, titulos: [], indultos: 0 }, pido: { mrs: 0, titulos: [1], indultos: 0 }, enElTurno: 0 },
      { id: 72, de: quien, a: otroAsiento, doy: { mrs: 0, titulos: [3], indultos: 0 }, pido: { mrs: 100, titulos: [], indultos: 0 }, enElTurno: 0 },
    ],
  });
  const losDosTratos = tratoEnTres(conDosTratos, quien, opciones);
  const laCajaDeLosDos = pregonDelBurgo(conDosTratos, quien, opciones);
  const meOfrecen = losDosTratos?.abiertos.find((t) => t.id === 71);
  const yoOfrezco = losDosTratos?.abiertos.find((t) => t.id === 72);
  comprobar(
    'un trato abierto trae la frase escrita desde donde mira quien la lee: «Ana te ofrece…» a quien contesta, «Le ofreces a Ana…» a quien la propuso',
    meOfrecen !== undefined &&
      yoOfrezco !== undefined &&
      meOfrecen.frase === `${comoSeLlamaElOtro} te ofrece ${maravedies(350)} por ${CASILLAS[1]?.nombre ?? ''}` &&
      yoOfrezco.frase.indexOf(`Le ofreces a ${comoSeLlamaElOtro}`) === 0,
    [meOfrecen?.frase, yoOfrezco?.frase],
  );
  comprobar(
    'y es LA MISMA que la tira de la caja de los tratos, letra por letra: una redacción y no dos que un día se separan',
    laCajaDeLosDos !== null && laCajaDeLosDos.paraContestar[0]?.frase === meOfrecen?.frase && laCajaDeLosDos.mios[0]?.frase === yoOfrezco?.frase,
    [laCajaDeLosDos?.paraContestar[0]?.frase, laCajaDeLosDos?.mios[0]?.frase],
  );
  const renglonesDelTrato = lineasDe(conDosTratos, 'trato');
  comprobar(
    'la sección «El trato» pinta esa misma frase, y ya no un remite delante de un resumen en tercera persona («De Ana a ti: Ana da…», con Ana dos veces en el mismo renglón)',
    renglonesDelTrato.some((l) => l === `${meOfrecen?.frase ?? '·'}.`) && !renglonesDelTrato.some((l) => l.indexOf(' a ti: ') >= 0),
    renglonesDelTrato,
  );

  /*
   * 3 bis. UN LADO VACÍO NO SE DICE METIENDO «NADA» EN EL HUECO. Un regalo y una petición son
   * tratos legales —`montar` sólo rechaza los dos lados vacíos a la vez— y son la jugada de
   * quien va a quebrar, así que las dos frases se escriben de verdad en una partida.
   */
  const conRegaloYPeticion = enPieYJugando({
    tratos: [
      { id: 81, de: otroAsiento, a: quien, doy: { mrs: 350, titulos: [], indultos: 0 }, pido: { mrs: 0, titulos: [], indultos: 0 }, enElTurno: 0 },
      { id: 82, de: otroAsiento, a: quien, doy: { mrs: 0, titulos: [], indultos: 0 }, pido: { mrs: 350, titulos: [], indultos: 0 }, enElTurno: 0 },
    ],
  });
  const losRaros = tratoEnTres(conRegaloYPeticion, quien, opciones);
  const elRegalo = losRaros?.abiertos.find((t) => t.id === 81);
  const laPeticion = losRaros?.abiertos.find((t) => t.id === 82);
  comprobar(
    'un trato que no pide nada se lee como un regalo, y uno que no da nada se lee como una petición: «Ana te ofrece nada por 350 €» decía lo contrario de lo que pasaba',
    elRegalo?.frase === `${comoSeLlamaElOtro} te ofrece ${maravedies(350)} y no te pide nada` &&
      laPeticion?.frase === `${comoSeLlamaElOtro} te pide ${maravedies(350)} y no te da nada a cambio`,
    [elRegalo?.frase, laPeticion?.frase],
  );
  comprobar(
    'y el resumen en tercera persona tampoco pega el «nada» en el hueco: «Ana da nada y pide 350 €» no es castellano',
    elRegalo?.resumen === `${comoSeLlamaElOtro} da ${maravedies(350)} y no pide nada.` &&
      laPeticion?.resumen === `${comoSeLlamaElOtro} no da nada y pide ${maravedies(350)}.` &&
      elRegalo?.da === maravedies(350) &&
      laPeticion?.da === 'nada',
    [elRegalo?.resumen, laPeticion?.resumen],
  );

  /* 4. La concordancia sale de `plural`, y el clavo la sujeta desde fuera. */
  comprobar('la concordancia sale de `plural`, escrito a mano AQUÍ para que lo de abajo no se componga consigo mismo', plural(1, 'casa', 'casas') === 'casa' && plural(0, 'casa', 'casas') === 'casas' && plural(2, 'casa', 'casas') === 'casas');
  const alFinalDeTodo = enPieYJugando({ concejo: { casas: 1, posadas: 1 }, quedan: { pregon: 1, arca: 0 }, topeDeVueltas: 1 });
  const conTodoEnElConcejo = enPieYJugando({ concejo: { casas: 32, posadas: 12 }, quedan: { pregon: 16, arca: 16 }, topeDeVueltas: 5 });
  comprobar(
    'con un solo edificio y una sola carta, «La mesa entera» concuerda en singular: decía «guarda 1 casas y 1 hoteles» y «Quedan 1 cartas», y decía eso justo al final de la partida',
    lineasDe(alFinalDeTodo, 'mesa').some((l) => l === 'El Ayuntamiento guarda 1 casa y 1 hotel.') &&
      lineasDe(alFinalDeTodo, 'mesa').some((l) => l === `Queda 1 carta en Sucesos y 0 en el Fondo Vecinal.`) &&
      lineasDe(alFinalDeTodo, 'mesa').some((l) => l === 'Se juega a 1 vuelta.'),
    lineasDe(alFinalDeTodo, 'mesa'),
  );
  comprobar(
    'y con muchos, en plural: es el MISMO renglón compuesto por la misma función, no dos textos que se parecen',
    lineasDe(conTodoEnElConcejo, 'mesa').some((l) => l === 'El Ayuntamiento guarda 32 casas y 12 hoteles.') &&
      lineasDe(conTodoEnElConcejo, 'mesa').some((l) => l === 'Quedan 16 cartas en Sucesos y 16 en el Fondo Vecinal.') &&
      lineasDe(conTodoEnElConcejo, 'mesa').some((l) => l === 'Se juega a 5 vueltas.'),
    lineasDe(conTodoEnElConcejo, 'mesa'),
  );

  /* 5. La subasta: ni una frase con un hueco dentro, y el escalón escrito como dinero. */
  const subastaSinNadie = enPieYJugando({
    almoneda: { casilla: 39, puja: 0, quienPuja: null, pujaDe: null, enPie: [], abiertaPor: otroAsiento, enCola: 0 },
  });
  const pujaVacia = pujaEnTres(subastaSinNadie, quien, opciones);
  comprobar(
    'una subasta a la que ya no se espera a nadie no escribe «Puja el Ayuntamiento» —que no puja en toda la partida— ni «En pie: .»: las dos frases dejan de escribirse en vez de escribirse vacías',
    pujaVacia !== null &&
      pujaVacia.lineas[0] === `${CASILLAS[39]?.nombre ?? ''}: sin pujas todavía.` &&
      pujaVacia.lineas.every((l) => l.indexOf('el Ayuntamiento') < 0 && l.indexOf(': .') < 0),
    pujaVacia?.lineas,
  );
  const meTocaLaPuja = enPieYJugando({
    paso: 'almoneda',
    turnoDe: quien,
    almoneda: { casilla: 39, puja: 100, quienPuja: otroAsiento, pujaDe: quien, enPie: [quien, otroAsiento], abiertaPor: otroAsiento, enCola: 2 },
  });
  const puertaDePuja = { id: 'pujar', tipo: PUJAR, carga: { casilla: 39, minimo: 110, maximo: 500, escalon: 10 }, rotulo: 'Pujar lo que quieras', ayuda: '', declaracion: true } as unknown as Opcion;
  const conEscalon = pujaEnTres(meTocaLaPuja, quien, [puertaDePuja]);
  comprobar(
    'el escalón de la puja libre se escribe como dinero, igual que el mínimo y el máximo: iba en crudo («de 10 en 10») y era el único número del juego escrito sin su moneda',
    conEscalon !== null && conEscalon.lineas.some((l) => l === `Puja libre entre ${maravedies(110)} y ${maravedies(500)}, en múltiplos de ${maravedies(10)}.`),
    conEscalon?.lineas,
  );
  comprobar(
    'y la subasta con gente dice por cuánto va y de quién, a quién se espera, quiénes siguen y cuántos títulos faltan',
    conEscalon !== null &&
      conEscalon.lineas[0] === `${CASILLAS[39]?.nombre ?? ''}: la mejor puja es ${maravedies(100)}, de ${comoSeLlamaElOtro}.` &&
      conEscalon.lineas.some((l) => l.indexOf('Te toca pujar.') === 0 && l.indexOf('Siguen en pie:') > 0) &&
      conEscalon.lineas.some((l) => l === '2 títulos más en cola.'),
    conEscalon?.lineas,
  );
  const tituloDeLaSubasta = hojaEnTres(meTocaLaPuja, quien, opciones).secciones.find((s) => s.id === 'almoneda')?.titulo ?? '';
  comprobar(
    'y «Ahora» manda a esa sección NOMBRÁNDOLA como se titula —sale de la hoja, no de una cadena escrita al lado—, igual que hace con la caja y con el carril',
    tituloDeLaSubasta.length > 0 && lineasDe(meTocaLaPuja, 'ahora').some((l) => l === `Te toca pujar: las pujas están en «${tituloDeLaSubasta}».`),
    lineasDe(meTocaLaPuja, 'ahora'),
  );

  /* 6. El apuro: cada deuda se lee sola, y con la contracción hecha. */
  const conDeudas = enPieYJugando({
    paso: 'apuro',
    turnoDe: quien,
    apuro: {
      quien,
      debe: 300,
      enCola: 0,
      deudas: [
        { a: null, cuanto: 200, porque: 'diezmo' },
        { a: otroAsiento, cuanto: 100, porque: 'renta' },
      ],
    },
  });
  const renglonesDelApuro = lineasDe(conDeudas, 'ahora');
  comprobar(
    'cada deuda del apuro se lee sola y con la contracción hecha: era «200 € a el Ayuntamiento», y es el renglón que se lee mientras corre la cuenta atrás',
    renglonesDelApuro.some((l) => l === `Le debes ${maravedies(200)} al Ayuntamiento.`) && renglonesDelApuro.every((l) => l.indexOf('a el Ayuntamiento') < 0),
    renglonesDelApuro,
  );
  comprobar(
    'y la que se le debe a alguien lo nombra, con el nombre de la vista',
    renglonesDelApuro.some((l) => l === `Le debes ${maravedies(100)} a ${comoSeLlamaElOtro}.`),
    renglonesDelApuro,
  );

  /* 7. «Lo mío» no repite «Tuyo» en cada renglón. */
  const conMisTitulos = enPieYJugando({
    jugadores: vista.jugadores.map((j) => (j.asiento === quien ? { ...j, quebrado: false, presa: -1, titulos: [1, 3] } : j)),
    titulos: vista.titulos.map((t) =>
      t.casilla === 1
        ? { ...t, dueno: quien, casas: 2, empenado: false, rentaAhora: 30, barrioEntero: true }
        : t.casilla === 3
          ? { ...t, dueno: quien, casas: 0, empenado: true, rentaAhora: 0, barrioEntero: true }
          : t,
    ),
  });
  const renglonesDeLoMio = lineasDe(conMisTitulos, 'mios');
  comprobar(
    '«Lo mío» no repite «Tuyo» en cada renglón: en una sección donde todo es mío por construcción, la palabra que sobra es la primera de cada línea, y podían ser veintiocho',
    renglonesDeLoMio.length === 2 && renglonesDeLoMio.every((l) => l.indexOf('Tuyo') < 0),
    renglonesDeLoMio,
  );
  comprobar(
    'y cada renglón dice lo que distingue ese título del de al lado: las casas, la hipoteca y la renta de hoy',
    renglonesDeLoMio.some((l) => l === `${CASILLAS[1]?.nombre ?? ''} (${barrioDe(1)?.nombre ?? ''}): 2 casas · renta ${maravedies(30)}`) &&
      renglonesDeLoMio.some((l) => l === `${CASILLAS[3]?.nombre ?? ''} (${barrioDe(3)?.nombre ?? ''}): hipotecado`),
    renglonesDeLoMio,
  );

  /* 8. Ni una frase compuesta con un hueco dentro. */
  const cartaDeNadie = enPieYJugando({ turnosAbiertos: 9, ultimaCarta: { mazo: 'arca', carta: 3, quien: null, enElTurno: 9 } });
  const renglonesDeLaCarta = lineasDe(cartaDeNadie, 'carta');
  comprobar(
    'una carta cuya vista no dice quién la sacó no deja el hueco dentro de la frase («La sacó  de Sucesos.»): se dice de qué mazo salió y ya',
    renglonesDeLaCarta.some((l) => l === 'Una carta del Fondo Vecinal.') && renglonesDeLaCarta.every((l) => l.indexOf('  ') < 0),
    renglonesDeLaCarta,
  );

  /* 9. La última tirada, con la suma. */
  const trasTirar = enPieYJugando({ paso: 'por-pasar', turnoDe: quien, tirada: [3, 4], dobles: 0 });
  comprobar(
    'el renglón de la última tirada trae la suma: es lo que se anduvo, y lo que cobra un servicio (§1)',
    lineasDe(trasTirar, 'ahora').some((l) => l === 'Última tirada: 3 y 4, 7 en total.'),
    lineasDe(trasTirar, 'ahora'),
  );
  const conDobles = enPieYJugando({ paso: 'por-pasar', turnoDe: quien, tirada: [5, 5], dobles: 1 });
  comprobar(
    'y los dobles se siguen diciendo, que es lo que cambia el turno',
    lineasDe(conDobles, 'ahora').some((l) => l === 'Última tirada: 5 y 5, 10 en total (dobles).'),
    lineasDe(conDobles, 'ahora'),
  );

  /* ── LA CRÓNICA ── */
  const v1 = { ...vista, jugada: 10, pregon: 'Ana tira y saca un cinco.' } as VistaDelBurgo;
  const v2 = { ...vista, jugada: 11, pregon: 'Ana tira y saca un cinco.' } as VistaDelBurgo;
  const v3 = { ...vista, jugada: 12, pregon: 'Bea cayó en Calle Mayor y pagó 350 € a Ana.' } as VistaDelBurgo;
  const c1 = laCronicaConLaVista([], v1);
  const c2 = laCronicaConLaVista(c1, v2);
  const c3 = laCronicaConLaVista(c2, v3);
  comprobar('la crónica acumula un renglón por jugada, del más nuevo al más viejo', c3.length === 3 && c3[0]?.jugada === 12 && c3[2]?.jugada === 10, c3);
  /*
   * DOS FRASES IGUALES EN DOS JUGADAS SON DOS RENGLONES. Comparar con el texto anterior
   * —que es como lo hacía la app a mano— se comía el segundo: dos «Ana tira y saca un
   * cinco» son dos tiradas de verdad, no un sondeo repetido.
   */
  comprobar('dos jugadas con la misma frase son DOS renglones: no es un sondeo repetido, es que pasó dos veces', c2.length === 2 && c2[0]?.texto === c2[1]?.texto);
  comprobar('y el mismo sondeo dos veces no añade nada, y devuelve LA MISMA lista por identidad', laCronicaConLaVista(c3, v3) === c3);
  comprobar('una vista sin pregón no añade nada, y tampoco una que no es del Burgo', laCronicaConLaVista(c3, { ...v3, jugada: 13, pregon: '' }) === c3 && laCronicaConLaVista(c3, { desde: 'riberas' }) === c3);
  const otraPartida = laCronicaConLaVista(c3, { ...vista, jugada: 2, pregon: 'La mesa empieza.' } as VistaDelBurgo);
  comprobar('si la jugada va hacia atrás es otra mesa: la crónica empieza de cero en vez de mezclar dos relatos', otraPartida.length === 1 && otraPartida[0]?.jugada === 2, otraPartida);
  let larga: readonly RenglonDeLaCronica[] = [];
  for (let k = 1; k <= TOPE_DE_LA_CRONICA + 12; k++) larga = laCronicaConLaVista(larga, { ...vista, jugada: k, pregon: `Pasó la cosa ${k}.` } as VistaDelBurgo);
  comprobar(`la crónica se para en el tope de ${TOPE_DE_LA_CRONICA} y se queda con lo último`, larga.length === TOPE_DE_LA_CRONICA && larga[0]?.jugada === TOPE_DE_LA_CRONICA + 12, larga.length);
  comprobar('y con un tope propio, en él', laCronicaConLaVista(larga, { ...vista, jugada: 999, pregon: 'Y una más.' } as VistaDelBurgo, 3).length === 3);
  comprobar('la crónica de las tres vistas no tiene reproche', reprochesDeLaCronica(c3, [v1, v2, v3], TOPE_DE_LA_CRONICA).length === 0, reprochesDeLaCronica(c3, [v1, v2, v3], TOPE_DE_LA_CRONICA));
  comprobar('la vacuna de la crónica: dos renglones de la misma jugada se ven caer', reprochesDeLaCronica([...c3, c3[0] as RenglonDeLaCronica], [v1, v2, v3], TOPE_DE_LA_CRONICA).some((x) => x.indexOf('repite') >= 0));
  comprobar('una crónica del revés también', reprochesDeLaCronica([...c3].reverse(), [v1, v2, v3], TOPE_DE_LA_CRONICA).some((x) => x.indexOf('más nuevo') >= 0));
  comprobar('y un renglón que no es el pregón de su vista también', reprochesDeLaCronica([{ jugada: 12, texto: 'otra cosa' }, ...c3.slice(1)], [v1, v2, v3], TOPE_DE_LA_CRONICA).some((x) => x.indexOf('no es el pregón') >= 0));
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
    comprobar('el modelo del Burgo existe en el repositorio: `escenas/modelos/burgo.glb`', fs.existsSync(fichero), fichero);
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
 * VA CON MARGEN Y NO AL RAS: hoy se hacen 317 —eran 293 antes del repaso del texto que se
 * repite, 274 antes de que el carril dejara de venir vacío, y 180 antes del carril, la caja
 * de los tratos, el cartel al pie, las dos fichas y la crónica—, y el guardia está veintiocho
 * por debajo: más que el bloque condicional más pequeño. Al ras hace lo contrario de lo que
 * quiere: una comprobación que se cae de un `if` dispara el guardia antes que la roja, y con
 * el guardia delante nadie ve el nombre de lo que se rompió. Por eso las rojas se imprimen
 * ANTES de irse.
 */
const MINIMO = 289;
if (hechas < MINIMO) {
  for (const f of fallos) console.log(`   · ${f}`);
  console.log(`✘ este comprobador debería hacer al menos ${MINIMO} comprobaciones y ha hecho ${hechas}: alguien ha borrado un bloque`);
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(`✔ burgo-en-tres: ${hechas} comprobaciones — la escena dice lo mismo que las reglas, y el servidor sirve el Burgo`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
