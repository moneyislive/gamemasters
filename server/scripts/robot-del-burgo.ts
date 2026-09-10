/**
 * EL ROBOT DEL BURGO: juega de verdad, siempre igual, y corre en cualquier motor.
 *
 * ═══ PARA QUÉ EXISTE, Y POR QUÉ ES UN FICHERO APARTE ═══
 *
 * Tres comprobadores necesitan una partida ENTERA del Burgo jugada por alguien que
 * no sea una persona: `verify:burgo` (las partidas de 2, 4 y 6 hasta ganador),
 * `oro:arcade` (el guion congelado del sexto arcade) y `verify:determinismo` (la
 * misma partida en Node y en Hermes). Si cada uno llevara su bucle, habría tres
 * políticas distintas y tres formas distintas de «jugar sin jugar». Aquí hay una.
 *
 * Y está aparte de los comprobadores por lo mismo que `guion-determinismo.ts`: la
 * mitad de las veces corre DENTRO DE HERMES 0.12, donde no hay `node:`, ni `fs`, ni
 * `process`, ni `class`, ni `Array.prototype.includes` garantizado. Aquí sólo hay
 * cuentas sobre la vista y las opciones que el propio juego ofrece.
 *
 * ═══ LO QUE ESTE ROBOT NO HACE NUNCA: PASAR SIN JUGAR ═══
 *
 * Esta casa tiene apuntado el bucle que decía jugar y no jugaba —26 de 40 vueltas
 * ofreciendo trueques, cero sietes, 856 comprobaciones en verde encima—. Por eso la
 * política de aquí es la de alguien que quiere GANAR y no la de alguien que quiere
 * que el turno acabe: tira siempre que puede, compra todo lo que puede pagar, alza
 * en cuanto tiene el barrio entero, puja hasta el precio del título, propone un
 * trato cuando le falta UN solar para el barrio y acepta los que le salen a cuenta,
 * empeña y vende en el apuro antes que rendirse, y sólo pasa cuando no queda otra.
 * `verify:burgo` cuenta desde los `sucesos` de la vista —no desde el robot— que
 * con esta política salen rentas, almonedas ganadas, Mazmorra, barrios alzados y
 * quiebras; y lleva la vacuna de un robot que sólo pasa, que se ve caer.
 *
 * ═══ SÓLO ELIGE ENTRE LO QUE `opcionesDelBurgo` OFRECE ═══
 *
 * Nunca monta un movimiento de la nada: coge una opción de la lista, o compone una
 * carga que QUEPA en una de las dos puertas (la puja libre y el trato) con
 * exactamente los campos que la puerta declara. Así una regresión en `opciones()`
 * —un botón que deja de ofrecerse— se ve como una partida que se corta, y no como
 * un robot que sigue jugando por debajo de la plataforma.
 *
 * ═══ DETERMINISTA, Y CON AZAR PROPIO SEMBRADO ═══
 *
 * Las pocas decisiones que se sortean (la puja libre frente a la fija) salen de un
 * azar de `shared/mecanicas/azar.ts` que el que llama siembra y devuelve: dos
 * ejecuciones con la misma semilla juegan la misma partida. Sin división de coma
 * flotante en ninguna decisión: son enteros comparados con enteros, para que si
 * Node y Hermes divergen sea el reductor y no el instrumento de medida.
 */
import { enteroEntre, sembrar } from '../../shared/mecanicas/azar';
import type { Azar } from '../../shared/mecanicas/azar';
import { canonico } from '../../shared/mecanicas/canonico';
import { movimientoDeTic } from '../../shared/arcade/reloj';
import type { ContextoMovimiento, Movimiento } from '../../shared/arcade/movimiento';
import type { Opcion } from '../../shared/arcade/opciones';
import { esRechazo } from '../../shared/arcade/motor';
import { ESPECTADOR } from '../../shared/arcade/tipos';
import type { AsientoId } from '../../shared/arcade/tipos';
import {
  A_ALMONEDA,
  avanzarElBurgo,
  EMPEZAR,
  PAGAR_FIANZA,
  PASAR,
  PASAR_PUJA,
  proyectarElBurgo,
  opcionesDelBurgo,
  PROPONER,
  PUJAR,
  RENDIRSE,
  TIRAR,
  USAR_INDULTO,
} from '../../shared/arcade/juegos/burgo';
import type { EstadoDelBurgo, LadoDelTrato, VistaDelBurgo } from '../../shared/arcade/juegos/burgo';
import { barrioDe, CASILLAS, PASO_DE_PUJA, POSADA } from '../../shared/arcade/juegos/burgo-tablero';

/** Lo que el robot decidió: el movimiento entero y de qué familia es, para contarlo. */
export interface DecisionDelRobot {
  movimiento: Movimiento;
  familia: string;
}

/** Cuánto efectivo quiere conservar el robot antes de comprar una casa o desempeñar. */
const RESERVA_PARA_ALZAR = 100;
const RESERVA_PARA_DESEMPENAR = 400;
/** Cuánto quiere que le sobre para pagar la fianza en vez de probar con los dados. */
const RESERVA_PARA_LA_FIANZA = 300;
/** Cuánto paga en un trato por el solar que le falta: precio × 3 / 2 (sin coma flotante). */
const PAGA_POR_EL_SOLAR_QUE_FALTA = [3, 2] as const;
/** Cuánto vale un Indulto en un trato, para decidir si sale a cuenta. */
const VALOR_DE_UN_INDULTO = 50;
/** Acepta un trato si lo que recibe vale al menos 4/5 de lo que da. */
const ACEPTA_SI_RECIBE = [4, 5] as const;

function precioDe(casilla: number): number {
  const fila = CASILLAS[casilla];
  return fila === undefined ? 0 : fila.precio;
}

function enteroDe(x: unknown): number {
  return typeof x === 'number' && Number.isInteger(x) ? x : 0;
}

function porId(opciones: readonly Opcion[], id: string): Opcion | null {
  for (const o of opciones) if (o.id === id) return o;
  return null;
}

function porTipo(opciones: readonly Opcion[], tipo: string, declaracion: boolean): Opcion | null {
  for (const o of opciones) if (o.tipo === tipo && (o.declaracion === true) === declaracion) return o;
  return null;
}

function conPrefijo(opciones: readonly Opcion[], prefijo: string): Opcion[] {
  const salida: Opcion[] = [];
  for (const o of opciones) if (o.id.indexOf(prefijo) === 0 && o.declaracion !== true) salida.push(o);
  return salida;
}

function decision(o: Opcion, familia: string): DecisionDelRobot {
  return { movimiento: { tipo: o.tipo, carga: o.carga }, familia };
}

/** Lo que vale un lado de trato para el robot, en maravedíes enteros. */
function valorDelLado(lado: LadoDelTrato): number {
  let total = lado.mrs + lado.indultos * VALOR_DE_UN_INDULTO;
  for (const c of lado.titulos) total += precioDe(c);
  return total;
}

function jugadorDe(v: VistaDelBurgo, quien: AsientoId): VistaDelBurgo['jugadores'][number] | null {
  for (const j of v.jugadores) if (j.asiento === quien) return j;
  return null;
}

function tituloDe(v: VistaDelBurgo, casilla: number): VistaDelBurgo['titulos'][number] | null {
  for (const t of v.titulos) if (t.casilla === casilla) return t;
  return null;
}

/**
 * LO QUE ME FALTA para un barrio entero, si lo tiene UN solo rival y nada del barrio
 * lleva edificios: `null` si no hay ningún barrio así. Es lo único por lo que el
 * robot propone. Con seis a la mesa un barrio de tres se reparte entre tres, y sin
 * esto nadie completaría nunca uno: sin barrios no hay casas, sin casas no hay
 * rentas que quiebren a nadie, y la partida acabaría siempre por tope de vueltas
 * con todos ricos —que es exactamente la partida que no prueba nada—.
 */
function loQueMeFalta(v: VistaDelBurgo, yo: AsientoId): { casillas: number[]; dueno: AsientoId } | null {
  const mios = jugadorDe(v, yo);
  if (mios === null) return null;
  const vistos: string[] = [];
  for (const c of mios.titulos) {
    const barrio = barrioDe(c);
    if (barrio === null || vistos.indexOf(barrio.id) >= 0) continue;
    vistos.push(barrio.id);
    let dueno: AsientoId | null = null;
    const casillas: number[] = [];
    let vale = true;
    for (const s of barrio.solares) {
      const t = tituloDe(v, s);
      if (t === null || t.casas > 0 || t.dueno === null) {
        vale = false;
        break;
      }
      if (t.dueno === yo) continue;
      if (dueno !== null && dueno !== t.dueno) {
        vale = false;
        break;
      }
      dueno = t.dueno;
      casillas.push(s);
    }
    if (vale && dueno !== null && casillas.length > 0) return { casillas, dueno };
  }
  return null;
}

/**
 * QUÉ HACE EL ROBOT con lo que se le ofrece. `conTrato` dice si en este turno todavía
 * puede proponer (quien llama lo limita a uno por turno para que dos robots no se
 * pasen la partida proponiéndose). Devuelve `null` si la lista está vacía.
 */
export function loQueHaceElRobot(
  vista: unknown,
  quien: AsientoId,
  azar: Azar,
  conTrato: boolean,
): { azar: Azar; decision: DecisionDelRobot | null } {
  const v = vista as VistaDelBurgo;
  const opciones = opcionesDelBurgo(vista, quien);
  if (opciones.length === 0) return { azar, decision: null };
  const yo = jugadorDe(v, quien);

  /* 0. Empezar, si toca. */
  const empezar = porTipo(opciones, EMPEZAR, false);
  if (empezar !== null) return { azar, decision: decision(empezar, 'empezar') };
  if (yo === null) return { azar, decision: null };

  /* 1. Contestar tratos: acepto si me sale a cuenta, si no rechazo. Es lo que se hace sin turno. */
  for (const o of conPrefijo(opciones, 'aceptar:')) {
    const id = enteroDe((o.carga as { trato?: unknown }).trato);
    let trato: VistaDelBurgo['tratos'][number] | null = null;
    for (const t of v.tratos) if (t.id === id) trato = t;
    if (trato === null) continue;
    const recibo = valorDelLado(trato.doy);
    const doy = valorDelLado(trato.pido);
    if (recibo * ACEPTA_SI_RECIBE[1] >= doy * ACEPTA_SI_RECIBE[0]) return { azar, decision: decision(o, 'aceptar') };
    const rechazo = porId(opciones, `rechazar:${id}`);
    if (rechazo !== null) return { azar, decision: decision(rechazo, 'rechazar') };
  }

  /* 2. En mi apuro: empeñar primero (es más barato deshacerlo), vender después, rendirse al final. */
  if (v.paso === 'apuro' && v.apuro !== null && v.apuro.quien === quien) {
    const empenos = conPrefijo(opciones, 'empenar:');
    if (empenos.length > 0) return { azar, decision: decision(empenos[0] as Opcion, 'empenar') };
    const ventas = conPrefijo(opciones, 'vender:');
    if (ventas.length > 0) return { azar, decision: decision(ventas[0] as Opcion, 'vender') };
    const rendirse = porTipo(opciones, RENDIRSE, false);
    if (rendirse !== null) return { azar, decision: decision(rendirse, 'rendirse') };
  }

  /* 3. La almoneda: pujo hasta el precio del título, dejando algo en la bolsa; si no, paso. */
  if (v.paso === 'almoneda' && v.almoneda !== null && v.almoneda.pujaDe === quien) {
    const a = v.almoneda;
    const tope = precioDe(a.casilla);
    const puedo = yo.mrs - RESERVA_PARA_ALZAR;
    const minimo = porId(opciones, 'pujar:minimo');
    const puerta = porTipo(opciones, PUJAR, true);
    const pasar = porId(opciones, 'pasar-puja');
    const hastaDonde = tope < puedo ? tope : puedo;
    if (puerta !== null && minimo !== null) {
      const d = puerta.carga as { casilla: number; minimo: number; maximo: number; escalon: number };
      const minimoLegal = enteroDe((minimo.carga as { cuanto?: unknown }).cuanto);
      if (minimoLegal <= hastaDonde) {
        /* Una de cada tres veces, una puja libre a mitad de camino: ejercita la puerta. */
        const sorteo = enteroEntre(azar, 0, 2);
        const libre = Math.floor((minimoLegal + hastaDonde) / 2 / PASO_DE_PUJA) * PASO_DE_PUJA;
        if (sorteo.valor === 0 && libre >= d.minimo && libre <= d.maximo && libre % d.escalon === 0 && libre > minimoLegal) {
          return {
            azar: sorteo.azar,
            decision: { movimiento: { tipo: PUJAR, carga: { casilla: d.casilla, cuanto: libre } }, familia: 'pujar-libre' },
          };
        }
        return { azar: sorteo.azar, decision: decision(minimo, 'pujar') };
      }
    }
    if (pasar !== null) return { azar, decision: decision(pasar, 'pasar-puja') };
  }

  if (v.turnoDe !== quien) return { azar, decision: null };

  /* 4. Preso: fianza si voy sobrado, Indulto si lo tengo, los dados si no. */
  const indulto = porTipo(opciones, USAR_INDULTO, false);
  if (indulto !== null) return { azar, decision: decision(indulto, 'usar-indulto') };
  const fianza = porTipo(opciones, PAGAR_FIANZA, false);
  if (fianza !== null && yo.mrs >= RESERVA_PARA_LA_FIANZA) return { azar, decision: decision(fianza, 'pagar-fianza') };

  /* 5. Comprar todo lo que se pueda pagar; lo que no, a almoneda. */
  const compras = conPrefijo(opciones, 'comprar:');
  if (compras.length > 0) return { azar, decision: decision(compras[0] as Opcion, 'comprar') };
  const almonedas = conPrefijo(opciones, 'a-almoneda:');
  if (almonedas.length > 0) return { azar, decision: decision(almonedas[0] as Opcion, 'a-almoneda') };

  /* 6. Alzar en cuanto hay barrio: la casilla con menos casas primero (el parejo lo exige igual). */
  const alzables = conPrefijo(opciones, 'alzar:');
  let mejorAlza: Opcion | null = null;
  let menosCasas = POSADA + 1;
  for (const o of alzables) {
    const c = enteroDe((o.carga as { casilla?: unknown }).casilla);
    const fila = CASILLAS[c];
    const t = tituloDe(v, c);
    if (fila === undefined || t === null) continue;
    if (yo.mrs - fila.casa < RESERVA_PARA_ALZAR) continue;
    if (t.casas < menosCasas) {
      menosCasas = t.casas;
      mejorAlza = o;
    }
  }
  if (mejorAlza !== null) return { azar, decision: decision(mejorAlza, 'alzar') };

  /* 7. Desempeñar si voy sobrado. */
  for (const o of conPrefijo(opciones, 'desempenar:')) {
    const c = enteroDe((o.carga as { casilla?: unknown }).casilla);
    const fila = CASILLAS[c];
    if (fila === undefined) continue;
    if (yo.mrs - Math.floor(fila.precio / 2) >= RESERVA_PARA_DESEMPENAR) return { azar, decision: decision(o, 'desempenar') };
  }

  /* 8. Proponer un trato por lo que me falta del barrio, una vez por turno. */
  if (conTrato) {
    const puerta = porTipo(opciones, PROPONER, true);
    const falta = loQueMeFalta(v, quien);
    if (puerta !== null && falta !== null) {
      const d = puerta.carga as { a: AsientoId[]; mrsMaximo: number; titulos: number[]; indultos: number };
      let precio = 0;
      for (const c of falta.casillas) precio += precioDe(c);
      const pago = Math.floor((precio * PAGA_POR_EL_SOLAR_QUE_FALTA[0]) / PAGA_POR_EL_SOLAR_QUE_FALTA[1]);
      if (d.a.indexOf(falta.dueno) >= 0 && pago <= d.mrsMaximo && yo.mrs - pago >= RESERVA_PARA_ALZAR) {
        const doy: LadoDelTrato = { mrs: pago, titulos: [], indultos: 0 };
        const pido: LadoDelTrato = { mrs: 0, titulos: [...falta.casillas], indultos: 0 };
        return { azar, decision: { movimiento: { tipo: PROPONER, carga: { a: falta.dueno, doy, pido } }, familia: 'proponer' } };
      }
    }
  }

  /* 9. Tirar siempre que se pueda; pasar sólo cuando no queda otra. */
  const tirar = porTipo(opciones, TIRAR, false);
  if (tirar !== null) return { azar, decision: decision(tirar, 'tirar') };
  const pasar = porTipo(opciones, PASAR, false);
  if (pasar !== null) return { azar, decision: decision(pasar, 'pasar') };
  return { azar, decision: null };
}

/**
 * EL ROBOT QUE SÓLO PASA: la vacuna. Tira porque no le queda otra, no compra nada
 * (todo a almoneda), pasa en toda almoneda, se rinde en el apuro y pasa el turno.
 * `verify:burgo` exige que con esta política los mínimos de una partida jugada de
 * verdad NO se cumplan: si se cumplieran, los mínimos no medirían nada.
 */
export function loQueHaceElRobotMudo(vista: unknown, quien: AsientoId): DecisionDelRobot | null {
  const v = vista as VistaDelBurgo;
  const opciones = opcionesDelBurgo(vista, quien);
  const empezar = porTipo(opciones, EMPEZAR, false);
  if (empezar !== null) return decision(empezar, 'empezar');
  const rechazos = conPrefijo(opciones, 'rechazar:');
  if (rechazos.length > 0) return decision(rechazos[0] as Opcion, 'rechazar');
  if (v.turnoDe !== quien) return null;
  /* En su apuro no vende ni empeña: se rinde, que es lo único que un mudo sabe hacer con una deuda. */
  const enMiApuro = v.paso === 'apuro' && v.apuro !== null && v.apuro.quien === quien;
  const orden = enMiApuro ? [RENDIRSE] : [PASAR_PUJA, A_ALMONEDA, TIRAR, PASAR];
  for (const tipo of orden) {
    const o = porTipo(opciones, tipo, false);
    if (o !== null) return decision(o, tipo);
  }
  return null;
}

/** Un apunte de la partida del robot: lo que el maestro de oro congela y lo que el diario lleva. */
export interface ApunteDelRobot {
  tipo: string;
  tic: number;
  carga?: unknown;
  quien?: string | null;
  asientos?: string[];
}

/** Lo que sale de jugar una partida entera con el robot. */
export interface PartidaDelRobot {
  estado: EstadoDelBurgo;
  apuntes: ApunteDelRobot[];
  /** Cuántos movimientos de asiento se aceptaron (cambiaron el estado). */
  movimientos: number;
  /** Cuántos tics se metieron. */
  tics: number;
  /** Por familia, cuántas decisiones. */
  familias: Record<string, number>;
  /** Cuántas decisiones del robot devolvieron el mismo estado sin motivo (botón mudo). */
  mudas: string[];
  /** Por qué se cortó antes de terminar, o `null`. */
  corte: string | null;
}

/** Los asientos de una partida del robot: `s1`..`sN`. */
export function asientosDelRobot(cuantos: number): AsientoId[] {
  const salida: AsientoId[] = [];
  for (let i = 1; i <= cuantos; i++) salida.push(`s${i}`);
  return salida;
}

/**
 * JUEGA UNA PARTIDA ENTERA con el robot, en proceso y sin árbitro (el árbitro lo
 * pone `verify:burgo`, que además compara esto con lo que sale por su puerta).
 *
 * `cadaCuantosUnTic`: cada tantos apuntes se mete un tic, para que el diario lleve
 * tics de verdad mezclados con los gestos (así lo congela el maestro de oro). Con
 * `0`, ningún tic. `topeDeVueltas` acota la partida: el robot juega a ganar, pero
 * seis robots comprándolo todo pueden tardar mucho en quebrar.
 */
export function jugarConElRobot(
  semilla: number,
  cuantos: number,
  topeDeVueltas: number,
  cadaCuantosUnTic: number,
  topeDeMovimientos: number,
  robot: (vista: unknown, quien: AsientoId, azar: Azar, conTrato: boolean) => { azar: Azar; decision: DecisionDelRobot | null } = loQueHaceElRobot,
  trasCadaCambio: (estado: EstadoDelBurgo, quien: AsientoId | null) => void = () => {},
): PartidaDelRobot {
  const asientos = asientosDelRobot(cuantos);
  const ctx = (quien: AsientoId | null, tic: number): ContextoMovimiento => ({ quien, azar: semilla, tic, asientos });
  const apuntes: ApunteDelRobot[] = [];
  const familias: Record<string, number> = {};
  const mudas: string[] = [];
  let azar: Azar = sembrar(semilla);
  /*
   * `undefined as …` y no `: … = undefined`: con el inicializador a secas TypeScript
   * estrecha la variable a `undefined` y no ve que `aplicar` (un cierre) la escribe,
   * así que cada `estado as EstadoDelBurgo` de abajo le parecía una conversión imposible.
   */
  let estado = undefined as EstadoDelBurgo | undefined;
  let tic = 0;
  let movimientos = 0;
  let tics = 0;
  let corte: string | null = null;
  let turnoConTrato = -1;
  const propusieron: AsientoId[] = [];

  const aplicar = (movimiento: Movimiento, quien: AsientoId | null): { cambio: boolean; motivo: string | null } => {
    const antes = estado;
    const salida = avanzarElBurgo(estado, movimiento, ctx(quien, tic));
    if (esRechazo(salida)) return { cambio: false, motivo: salida.motivo };
    estado = salida;
    if (salida !== antes) trasCadaCambio(salida, quien);
    return { cambio: salida !== antes, motivo: null };
  };

  /* Empieza el primero. */
  apuntes.push({ tipo: EMPEZAR, tic, carga: { topeDeVueltas }, quien: asientos[0] as string, asientos: [...asientos] });
  aplicar({ tipo: EMPEZAR, carga: { topeDeVueltas } }, asientos[0] as AsientoId);
  movimientos++;

  for (let paso = 0; paso < topeDeMovimientos; paso++) {
    const e = estado as EstadoDelBurgo;
    if (e.momento === 'terminada') break;
    if (cadaCuantosUnTic > 0 && (paso + 1) % cadaCuantosUnTic === 0) {
      tic++;
      apuntes.push({ tipo: movimientoDeTic().tipo, tic });
      aplicar(movimientoDeTic(), null);
      tics++;
      continue;
    }
    if (e.turnosAbiertos !== turnoConTrato) {
      turnoConTrato = e.turnosAbiertos;
      propusieron.length = 0;
    }
    const espectador = proyectarElBurgo(e, ESPECTADOR);
    const turnoDe = espectador.turnoDe;
    /*
     * PRIMERO los que tienen algo que contestar SIN turno, y el del turno el último.
     * Al revés, el proponente tiraba o pasaba antes de que el otro pudiera contestar
     * y el trato caducaba en el relevo: 339 propuestas y ninguna aceptada, medido.
     * Para quien no tiene el turno el robot sólo contesta tratos (nunca puja ni
     * obra fuera de su turno o de su apuro, y en los dos casos ES `turnoDe`).
     */
    const orden: AsientoId[] = [];
    for (const a of asientos) if (a !== turnoDe) orden.push(a);
    if (turnoDe !== null) orden.push(turnoDe);
    let hecho = false;
    for (const quien of orden) {
      const vista = proyectarElBurgo(e, quien);
      const conTrato = propusieron.indexOf(quien) < 0;
      const r = robot(vista, quien, azar, conTrato);
      azar = r.azar;
      if (r.decision === null) continue;
      if (r.decision.familia === 'proponer') propusieron.push(quien);
      const apunte: ApunteDelRobot = { tipo: r.decision.movimiento.tipo, tic, quien, asientos: [...asientos] };
      if (r.decision.movimiento.carga !== undefined) apunte.carga = r.decision.movimiento.carga;
      apuntes.push(apunte);
      const salida = aplicar(r.decision.movimiento, quien);
      if (!salida.cambio && salida.motivo === null) {
        mudas.push(`${quien} · ${r.decision.familia} · ${canonico(r.decision.movimiento).slice(0, 80)}`);
      }
      if (salida.cambio) {
        movimientos++;
        familias[r.decision.familia] = (familias[r.decision.familia] ?? 0) + 1;
      } else {
        familias[`${r.decision.familia}-rechazado`] = (familias[`${r.decision.familia}-rechazado`] ?? 0) + 1;
      }
      hecho = true;
      break;
    }
    if (!hecho) {
      corte = `nadie tiene nada que hacer en «${e.momento}/${e.paso}» (turnoDe ${String(turnoDe)})`;
      break;
    }
  }

  const fin = estado as EstadoDelBurgo;
  if (corte === null && fin.momento !== 'terminada') corte = `se agotó el tope de ${topeDeMovimientos} pasos`;
  return { estado: fin, apuntes, movimientos, tics, familias, mudas, corte };
}
