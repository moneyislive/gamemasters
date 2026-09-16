/**
 * LAS COREOGRAFÍAS DEL BURGO: cuánto dura cada suceso, qué curva sigue, y la COLA que
 * los reproduce en orden. Sin `three`.
 *
 * ═══ NINGUNA ANIMACIÓN DECIDE NADA ═══
 *
 * La mesa manda una vista con `jugada` y la lista de `sucesos` del último cambio; la
 * escena anima lo que hay entre la jugada que vio y la que llega, y el estado final es
 * SIEMPRE el de la vista. Esta cola es la máquina pura que dice qué suceso está sonando
 * y desde cuándo; `Burgo.tsx` le pregunta cada fotograma y pinta. Un toque en el lienzo
 * o en un botón la SALTA: todo a su estado final. La mesa no espera.
 *
 * ═══ LOS TIEMPOS, DE LA TABLA DEL DISEÑO (§5.7) ═══
 *
 *     sale (sorteo)               0,9 s por jugador: caen los peones, ruedan los dados
 *     empieza / turno             0,4: la marca se desliza al peón del siguiente
 *     tira                        0,95 (+ 0,25 si doble): `RODAR_MINIMO + ASENTAR`
 *     mueve                       lo que diga `peon.ts`: aparecer, recoger, ≤ 8 s de recorrido, salto
 *     cobra / paga                0,9 + 0,07 por moneda (una por cada 50 mrs, tope 6)
 *     compra / almoneda ganada    0,7: la bandera cae desde 4 y clava con rebote; el edificio respira
 *     almoneda-abierta            0,5; puja 0,3; almoneda desierta 0,5
 *     alza                        0,45 por casa; la posada hunde cuatro y brota una
 *     vende                       0,4; empeña / desempeña 0,5
 *     carta                       0,4 + 2,4 + 0,4: sube, se lee, vuelve
 *     a-la-mazmorra               ≈ 3,5 (+ 0,8 desde la 30, corriendo a la celda del cuartel);
 *                                 sale-de-la-mazmorra 0,6 + salto; sigue-presa 0,667
 *     trato                       propuesto: mientras dure (aquí, 0,4); aceptado 1,0
 *     apuro                       0,6; quiebra ≈ 2,4 (golpe, huida, desvanecer)
 *     fin                         3,0
 *
 * ═══ LOS SOLAPES, Y POR QUÉ UNA RENTA DE TRES NO DURA SEIS SEGUNDOS ═══
 *
 * La cola arranca cada suceso cuando el anterior TERMINA, salvo donde el diseño dice
 * que se solapen: las monedas de un mismo movimiento (`cobra`/`paga` seguidos) arrancan a
 * 200 ms unas de otras; el `mueve` arranca cuando los dados aún ruedan (`SOLAPE` con
 * `tira`); el dinero de una renta vuela mientras el aventurero aterriza (solape con el
 * salto); y el naipe sube antes de que se apague el último. Con eso una jugada real
 * —tirada, tres casillas, renta y carta— cabe en menos de 14 s, y `verify:burgo-escena`
 * lo mide. Los arranques son MONÓTONOS: el orden de la lista es el orden en pantalla.
 *
 * ═══ LAS CURVAS ═══
 *
 * Todas de `u` en 0..1 (o de segundos), sin estado: `arcoDeMoneda`, `backOut` (sobrepaso
 * 1,7, para las casas que brotan), `respira` (1 → 1,06 → 1), `parpadeo` a 1 Hz, `caidaConRebote`
 * (`reboteDelDado` de `dados.ts`), `hundirse`, `mediaAsta`. Esto es `escenas/`: `Math.sin`
 * y `Math.pow` valen.
 */
import { ASENTAR, RODAR_MINIMO, reboteDelDado } from '../dados';
import { DURACION } from '../embarcadero/gestos';
import type { SucesoDelBurgo } from '../../shared/arcade/juegos/burgo';
import { SALTO_EXTRA_DEL_DOBLE } from './dados-del-burgo';
import { A_LA_CELDA, DESVANECER, DESVANECER_AL_QUEBRAR, HUIDA_AL_QUEBRAR, PASO_DE_LA_REJA, VELOCIDAD_CORRIENDO, duracionDelMovimiento, pasaPorLaCelda } from './peon';
import type { AnilloEn3D } from './anillo-en-3d';
import { ANILLO_DEL_BURGO } from './anillo-en-3d';
import { BOCANADAS_DEL_HUMO } from './obras';

/* ─────────────────────────────── Los tiempos ─────────────────────────────── */

export const POR_JUGADOR_EN_EL_SORTEO = 0.9;
/** Los seis peones caen escalonados por esto. */
export const ESCALON_DE_LOS_PEONES = 0.12;
export const CAMBIO_DE_TURNO = 0.4;
export const TIRADA = RODAR_MINIMO + ASENTAR;
/**
 * `altura` sube de 6 a 27 con el tablero, y por la misma razón que el dígito del precio: una
 * moneda vuela desde un peón hasta el Concejo, que con el tablero de 864 está a unas 500
 * unidades, y un arco de 6 sobre 500 es una línea recta. 27 es 6 × 2,25 redondeado hacia
 * arriba, o sea el mismo arco que se veía sobre el tablero de 384.
 */
export const MONEDAS = { base: 0.9, porMoneda: 0.07, tope: 6, porCada: 50, altura: 27, escalon: 0.07 } as const;
/** Las monedas de un mismo movimiento arrancan a esto unas de otras. */
export const SOLAPE_DE_MONEDAS = 0.2;
export const COMPRA = 0.7;
export const ALMONEDA_ABIERTA = 0.5;
export const PUJA = 0.3;
export const ALMONEDA_DESIERTA = 0.5;
export const POR_CASA = 0.45;
export const HUNDIR_CASAS = 0.3;
export const VENTA = 0.4;
export const EMPENO = 0.5;
export const CARTA = { sube: 0.4, seLee: 2.4, vuelve: 0.4, total: 3.2 } as const;
export const A_LA_MAZMORRA = DURACION.golpe + DESVANECER + PASO_DE_LA_REJA + DURACION.aparecer + PASO_DE_LA_REJA;
/** Lo que dura un encierro mandado desde `desde`: el de siempre, y desde la 30 además la carrera a la celda. */
export function duracionDelEncierro(desde: number): number {
  return A_LA_MAZMORRA + (pasaPorLaCelda(desde) ? A_LA_CELDA : 0);
}
export const SALE_DE_LA_MAZMORRA = PASO_DE_LA_REJA + DURACION.salto;
export const SIGUE_PRESA = DURACION.golpe;
export const TRATO_PROPUESTO = 0.4;
export const TRATO_ACEPTADO = 1.0;
export const TRATO_CERRADO = 0.3;
export const APURO = 0.6;
export const QUIEBRA = DURACION.golpe + HUIDA_AL_QUEBRAR / VELOCIDAD_CORRIENDO + 0;
export const FIN = 3.0;
/** Las banderas de un quebrado cambian de dueño escalonadas por esto. */
export const ESCALON_DE_LAS_BANDERAS = 0.08;
/** Cuánto tarda en saltarse la cola: todo a su estado final en esto. */
export const SALTO_DE_LA_COLA = 0.2;
/** Desde qué altura cae la bandera al comprar. */
export const CAIDA_DE_LA_BANDERA = 4;
/** El sobrepaso del back-out con el que brotan las casas. */
export const SOBREPASO = 1.7;
/** Cuánto «respira» un edificio al cambiar de mano. */
export const RESPIRO = 0.06;
/** La acera empeñada se apaga a este tanto de su luminancia. */
export const LUMINANCIA_EMPENADA = 0.55;
/** Los solapes con el anterior: cuánto puede arrancar un suceso ANTES de que el anterior termine. */
export const SOLAPE = { muevesTrasTirar: 0.65, dineroTrasMover: 1.0, cartaTrasDinero: 0.5, cartaTrasMover: 1.0 } as const;
/** Cuánto pesa una moneda: cuántas vuelan por una cantidad. */
export function monedasDe(cuanto: number): number {
  return Math.max(1, Math.min(MONEDAS.tope, Math.ceil(Math.abs(cuanto) / MONEDAS.porCada)));
}

/** Cuánto dura un `cobra` o un `paga`: 0,9 + 0,07 por moneda. */
export function duracionDelDinero(cuanto: number): number {
  return MONEDAS.base + MONEDAS.porMoneda * monedasDe(cuanto);
}

/**
 * CUÁNTO DURA UN SUCESO EN PANTALLA. `enPie` dice si el aventurero de quien mueve ya está
 * en el tablero (entonces `mueve` se ahorra el `aparecer`).
 */
export function duracionDelSuceso(s: SucesoDelBurgo, enPie = false, anillo: AnilloEn3D = ANILLO_DEL_BURGO): number {
  switch (s.que) {
    case 'sale':
      return POR_JUGADOR_EN_EL_SORTEO;
    case 'empieza':
    case 'turno':
      return CAMBIO_DE_TURNO;
    case 'tira':
    case 'tirada-de-oficio':
      return TIRADA + (s.dados[0] === s.dados[1] ? SALTO_EXTRA_DEL_DOBLE : 0);
    case 'mueve':
      return duracionDelMovimiento(s, enPie, anillo);
    case 'cobra':
    case 'paga':
      return duracionDelDinero(s.cuanto);
    case 'compra':
      return COMPRA;
    case 'almoneda-abierta':
      return ALMONEDA_ABIERTA;
    case 'puja':
    case 'pasa-puja':
      return PUJA;
    case 'almoneda-cerrada':
      return s.ganador === null ? ALMONEDA_DESIERTA : COMPRA;
    case 'alza':
      return s.casas === 5 ? HUNDIR_CASAS + POR_CASA : POR_CASA;
    case 'vende':
      return VENTA;
    case 'empena':
    case 'desempena':
      return EMPENO;
    case 'carta':
      return CARTA.total;
    case 'a-la-mazmorra':
      return duracionDelEncierro(s.desde);
    case 'sale-de-la-mazmorra':
      return SALE_DE_LA_MAZMORRA;
    case 'sigue-presa':
      return SIGUE_PRESA;
    case 'trato':
      return s.fin === 'propuesto' ? TRATO_PROPUESTO : s.fin === 'aceptado' ? TRATO_ACEPTADO : TRATO_CERRADO;
    case 'apuro':
      return APURO;
    case 'quiebra':
      return QUIEBRA;
    case 'cambia-de-mano':
      return COMPRA;
    case 'fin':
      return FIN;
    default:
      return CAMBIO_DE_TURNO;
  }
}

const esDinero = (s: SucesoDelBurgo): boolean => s.que === 'cobra' || s.que === 'paga';

/**
 * CUÁNDO ARRANCA UN SUCESO respecto del anterior: en cuanto termina, salvo los solapes de
 * la cabecera. Nunca antes de que el anterior haya arrancado más `SOLAPE_DE_MONEDAS`.
 */
export function arranqueTras(anterior: { readonly suceso: SucesoDelBurgo; readonly desde: number; readonly hasta: number } | null, s: SucesoDelBurgo, ahora: number): number {
  if (anterior === null) return ahora;
  const a = anterior.suceso;
  let solape = 0;
  if (esDinero(a) && esDinero(s)) return Math.max(anterior.desde + SOLAPE_DE_MONEDAS, ahora);
  if (a.que === 'tira' && s.que === 'mueve') solape = SOLAPE.muevesTrasTirar;
  else if (a.que === 'mueve' && esDinero(s)) solape = SOLAPE.dineroTrasMover;
  else if (a.que === 'mueve' && s.que === 'carta') solape = SOLAPE.cartaTrasMover;
  else if (esDinero(a) && s.que === 'carta') solape = SOLAPE.cartaTrasDinero;
  return Math.max(anterior.desde + SOLAPE_DE_MONEDAS, anterior.hasta - solape, ahora);
}

/* ─────────────────────────────── La cola ─────────────────────────────── */

export interface SucesoProgramado {
  readonly suceso: SucesoDelBurgo;
  /** Cuándo arranca y cuándo termina, en el reloj de la escena. */
  readonly desde: number;
  readonly hasta: number;
}

export interface ColaDeSucesos {
  /** Programados, en orden de arranque. Los que ya terminaron se van quitando. */
  readonly programados: readonly SucesoProgramado[];
  readonly ahora: number;
  /** Se ha saltado: la escena pone todo en su estado final y no reproduce nada. */
  readonly saltada: boolean;
  /** El aventurero de quien mueve ya está en pie (ahorra el `aparecer` del siguiente `mueve`). */
  readonly enPie: string | null;
}

export function colaVacia(ahora = 0): ColaDeSucesos {
  return { programados: [], ahora, saltada: false, enPie: null };
}

/**
 * ENCOLAR: cada suceso se programa detrás del último, con su solape. Si la cola estaba
 * vacía, arranca ahora. Quién está en pie se lleva de un `mueve` al siguiente.
 */
export function encolar(cola: ColaDeSucesos, sucesos: readonly SucesoDelBurgo[], anillo: AnilloEn3D = ANILLO_DEL_BURGO): ColaDeSucesos {
  if (sucesos.length === 0) return cola;
  const programados = [...cola.programados];
  let enPie = cola.enPie;
  for (const s of sucesos) {
    const anterior = programados[programados.length - 1] ?? null;
    const desde = arranqueTras(anterior, s, cola.ahora);
    const yaEnPie = s.que === 'mueve' && enPie === s.quien;
    const dura = duracionDelSuceso(s, yaEnPie, anillo);
    programados.push({ suceso: s, desde, hasta: desde + dura });
    if (s.que === 'mueve') enPie = s.quien;
    if (s.que === 'quiebra' || s.que === 'a-la-mazmorra') enPie = enPie === s.quien ? null : enPie;
  }
  return { ...cola, programados, saltada: false, enPie };
}

/** El reloj avanza: los que terminaron se quitan. */
export function avanzarLaCola(cola: ColaDeSucesos, dt: number): ColaDeSucesos {
  const ahora = cola.ahora + Math.max(0, dt);
  const programados = cola.programados.filter((p) => p.hasta > ahora);
  return programados.length === cola.programados.length && ahora === cola.ahora ? cola : { ...cola, ahora, programados };
}

/** Saltar: todo a su estado final. */
export function saltar(cola: ColaDeSucesos): ColaDeSucesos {
  return { ...cola, programados: [], saltada: true };
}

/** ¿No queda nada por reproducir? */
export function terminada(cola: ColaDeSucesos): boolean {
  return cola.programados.length === 0;
}

/** Los sucesos que están sonando AHORA, con su progreso 0..1. */
export function enCurso(cola: ColaDeSucesos): readonly { readonly suceso: SucesoDelBurgo; readonly desde: number; readonly hasta: number; readonly u: number }[] {
  return cola.programados
    .filter((p) => p.desde <= cola.ahora)
    .map((p) => ({ ...p, u: p.hasta > p.desde ? Math.min(1, (cola.ahora - p.desde) / (p.hasta - p.desde)) : 1 }));
}

/** Cuándo termina el último programado, o `ahora` si no hay nada. */
export function finDeLaCola(cola: ColaDeSucesos): number {
  return cola.programados.reduce((fin, p) => Math.max(fin, p.hasta), cola.ahora);
}

/* ─────────────────────────────── Las curvas ─────────────────────────────── */

const pinza = (u: number): number => Math.min(1, Math.max(0, u));
/** Suavizado clásico: arranca y frena solo, que es lo que hace que una tapa no dé un tirón. */
const suave = (u: number): number => {
  const v = pinza(u);
  return v * v * (3 - 2 * v);
};

/** El arco de una moneda entre dos puntos: altura `MONEDAS.altura · sin(πu)`. */
export function arcoDeMoneda(u: number): number {
  return MONEDAS.altura * Math.sin(Math.PI * pinza(u));
}

/** Una moneda de `n` en su vuelo: cuándo arranca (escalonadas) y cuánto lleva, en 0..1. */
export function progresoDeLaMoneda(k: number, transcurrido: number, cuanto: number): number {
  const vuelo = MONEDAS.base;
  return pinza((transcurrido - k * MONEDAS.escalon) / vuelo);
}

/** Back-out con sobrepaso 1,7: brota, pasa de 1 y vuelve. */
export function backOut(u: number): number {
  const t = pinza(u) - 1;
  return 1 + (SOBREPASO + 1) * t * t * t + SOBREPASO * t * t;
}

/** El edificio respira: 1 → 1,06 → 1. */
export function respira(u: number): number {
  return 1 + RESPIRO * Math.sin(Math.PI * pinza(u));
}

/** Parpadeo a 1 Hz entre 0,35 y 1: la bandera ámbar de la almoneda. */
export function parpadeo(t: number): number {
  return 0.675 + 0.325 * Math.sin(2 * Math.PI * t);
}

/** La bandera cae desde `CAIDA_DE_LA_BANDERA` en `COMPRA` y clava con el rebote del dado. Devuelve la altura. */
export function caidaConRebote(transcurrido: number): number {
  const cae = COMPRA - ASENTAR;
  if (transcurrido < cae) return CAIDA_DE_LA_BANDERA * (1 - pinza(transcurrido / cae));
  return reboteDelDado(transcurrido - cae) * 10;
}

/** Hundirse: escala de 1 a 0 en `dura`. */
export function hundirse(transcurrido: number, dura = HUNDIR_CASAS): number {
  return 1 - pinza(transcurrido / dura);
}

/** La bandera a media asta: cuánto baja su tela, 0 arriba, 1 a media asta. */
export function mediaAsta(transcurrido: number, empenando: boolean): number {
  const u = pinza(transcurrido / EMPENO);
  return empenando ? u : 1 - u;
}

/** El naipe: sube (0..1 de escala) en 0,4, se queda, y vuelve encogiendo en los últimos 0,4. */
export function escalaDelNaipe(transcurrido: number): number {
  if (transcurrido < CARTA.sube) return pinza(transcurrido / CARTA.sube);
  if (transcurrido > CARTA.sube + CARTA.seLee) return 1 - pinza((transcurrido - CARTA.sube - CARTA.seLee) / CARTA.vuelve);
  return 1;
}

/**
 * La reja de la Comisaría: sube 1 (de 0 a `SUBIDA`) en 0,6 y baja igual; devuelve la fracción
 * alzada para un instante dentro de `a-la-mazmorra` mandado desde `desde`. Sube cuando el preso ya
 * se ha desvanecido donde estaba, así que desde la 30 espera también a que corra a su celda.
 */
export function alzadoDeLaReja(transcurrido: number, desde: number): number {
  const sube = DURACION.golpe + (pasaPorLaCelda(desde) ? A_LA_CELDA : 0) + DESVANECER;
  const arriba = sube + PASO_DE_LA_REJA;
  const baja = arriba + DURACION.aparecer;
  if (transcurrido < sube) return 0;
  if (transcurrido < arriba) return pinza((transcurrido - sube) / PASO_DE_LA_REJA);
  if (transcurrido < baja) return 1;
  return 1 - pinza((transcurrido - baja) / PASO_DE_LA_REJA);
}

/**
 * LA REJA DE LA CELDA DEL CUARTEL DE LA 30, que es otra y lleva otro compás: el de quien entra.
 *
 * Sube durante el golpe —en los últimos 0,6, para estar arriba cuando echa a correr—, se queda
 * arriba mientras corre a la celda y pasa por debajo, y baja mientras se desvanece dentro: 0,4, lo
 * que dura desvanecerse, porque una reja que cae va más deprisa que una que se levanta. Sólo se
 * mueve si le mandan desde la 30; desde cualquier otra casilla nadie entra en esa celda.
 */
export function alzadoDeLaRejaDeLaCelda(transcurrido: number, desde: number): number {
  if (!pasaPorLaCelda(desde)) return 0;
  const arriba = DURACION.golpe;
  const sube = arriba - PASO_DE_LA_REJA;
  const baja = arriba + A_LA_CELDA;
  if (transcurrido < sube) return 0;
  if (transcurrido < arriba) return pinza((transcurrido - sube) / PASO_DE_LA_REJA);
  if (transcurrido < baja) return 1;
  return 1 - pinza((transcurrido - baja) / DESVANECER);
}

/**
 * EL TREN, QUE ES LA ÚNICA ANIMACIÓN DEL TABLERO QUE NO ESPERA A NADIE.
 *
 * Todo lo demás que se mueve aquí arranca con un suceso de la partida —una tirada, una compra, un
 * encierro— y dura lo que dura ese suceso. El tren no: da vueltas, pare quien pare. Por eso su
 * función no toma un «transcurrido desde que empezó algo» sino el reloj de la escena a secas.
 *
 * Y por eso mismo va DESPACIO: 40 por segundo, cuando un peón cruza una casilla de 72 en segundo y
 * medio, o sea a 48. Un tren más rápido que los peón es que le roba la vista al juego.
 *
 * La vuelta entera mide 3.510 y tiene cuatro paradas: 87,7 segundos de viaje más cuatro paradas de
 * 2,5 son 97,7 segundos por vuelta. Los dos trenes van a media vuelta uno de otro.
 */
export const TREN = { velocidad: 40, parada: 2.5, cuantos: 2 } as const;

/**
 * A qué distancia del origen de la vía está el tren en el instante `reloj`.
 *
 * Se escribe con las paradas como parámetro y no leídas de `obras.ts` para que el comprobador
 * pueda ejercitarla con paradas inventadas —una sola, ninguna, dos pegadas— sin tocar el tablero.
 */
/**
 * LO QUE HAY DE CADA PARADA A LA SIGUIENTE, dando la vuelta.
 *
 * Con el módulo a secas hay un caso que sale MAL y que no se ve mirando el tablero: con UNA sola
 * parada, el tramo de ella a sí misma da 0 en vez de la vuelta entera, o sea que el tren se queda
 * clavado en la estación para siempre. Lo cazó la vacuna del comprobador, no una captura.
 */
function tramosDelTren(largo: number, paradas: readonly number[]): number[] {
  return paradas.map((d, i) => {
    const bruto = ((((paradas[(i + 1) % paradas.length] as number) - d) % largo) + largo) % largo;
    return bruto === 0 ? largo : bruto;
  });
}

export function avanceDelTren(reloj: number, largo: number, paradas: readonly number[], desfase = 0): number {
  if (largo <= 0) return 0;
  if (paradas.length === 0) return (((reloj * TREN.velocidad + desfase) % largo) + largo) % largo;
  const tramos = tramosDelTren(largo, paradas);
  const periodo = tramos.reduce((a, b) => a + b / TREN.velocidad, 0) + paradas.length * TREN.parada;
  let resto = (((reloj + desfase) % periodo) + periodo) % periodo;
  for (let i = 0; i < paradas.length; i++) {
    if (resto < TREN.parada) return paradas[i] as number;
    resto -= TREN.parada;
    const viaje = (tramos[i] as number) / TREN.velocidad;
    if (resto < viaje) return ((paradas[i] as number) + resto * TREN.velocidad) % largo;
    resto -= viaje;
  }
  return paradas[0] as number;
}

/** Lo que tarda el tren en dar una vuelta con sus paradas: lo usa el comprobador y el desfase. */
export function vueltaDelTren(largo: number, paradas: readonly number[]): number {
  if (paradas.length === 0) return largo / TREN.velocidad;
  return tramosDelTren(largo, paradas).reduce((a, b) => a + b / TREN.velocidad, 0) + paradas.length * TREN.parada;
}

/**
 * LAS TRES ANIMACIONES DE CASILLA QUE SE VEN SIEMPRE, Y LO CORTAS QUE TIENEN QUE SER.
 *
 * Miguel lo pidió tres veces y con las mismas palabras: «las animaciones siempre deben ser muy
 * breves». Aquí eso no es una opinión de estilo sino una cuenta: el tablero encola los sucesos de
 * una jugada uno detrás de otro, y una tapa que tarde en abrirse más de lo que dura el suceso de
 * la carta retrasa la partida entera. Así que las tres caben dentro de su suceso.
 *
 * Las tres son PURAS —de un tiempo a un número— y valen cero fuera de su ventana, que es lo que
 * deja a la escena preguntar sin condiciones: «cuánto está abierta esta tapa ahora mismo».
 */
export const TAPA_DEL_COFRE = { abre: 0.22, quieta: 0.24, cierra: 0.24, total: 0.7, angulo: (72 * Math.PI) / 180 } as const;
export const RULETA = { total: 0.8, vueltas: 1.5 } as const;
export const JOYA_QUE_GIRA = { total: 0.5, vueltas: 1 } as const;

/**
 * QUIÉN SE ANIMA CUANDO ALGUIEN COGE UNA CARTA, Y POR QUÉ ESTO ES UNA FUNCIÓN Y NO UN `if`.
 *
 * El suceso de la carta dice el MAZO pero no la casilla —hay tres del Arca y tres de Sucesos—, así
 * que hay que mirar dónde está el peón de quien la coge: es el único sitio de donde esa carta
 * puede haber salido. Esa regla vivía dentro del bucle de fotogramas, que es el único rincón de
 * esta escena al que el comprobador no llega; aquí sí llega, y de paso se lee sola.
 *
 * Devuelve la casilla que se anima o `null`: cero condiciones en quien la usa.
 */
export function loQueAnimaUnaCarta(mazo: 'arca' | 'pregon' | null, casillaDelQueLaCoge: number): { readonly cofre: number | null; readonly ruleta: number | null } {
  if (mazo === 'arca' && CASILLAS_DEL_ARCA.includes(casillaDelQueLaCoge)) return { cofre: casillaDelQueLaCoge, ruleta: null };
  if (mazo === 'pregon' && CASILLAS_DEL_PREGON.includes(casillaDelQueLaCoge)) return { cofre: null, ruleta: casillaDelQueLaCoge };
  return { cofre: null, ruleta: null };
}

/** Las tres del Fondo Vecinal y las tres de Sucesos, que es donde están los cofres y las ruletas. */
export const CASILLAS_DEL_ARCA: readonly number[] = [2, 17, 33];
export const CASILLAS_DEL_PREGON: readonly number[] = [7, 22, 36];

/** Cuánto está abierta la tapa del cofre: 0 cerrada, 1 abierta del todo. */
export function aperturaDelCofre(transcurrido: number): number {
  if (transcurrido <= 0) return 0;
  if (transcurrido < TAPA_DEL_COFRE.abre) return suave(transcurrido / TAPA_DEL_COFRE.abre);
  if (transcurrido < TAPA_DEL_COFRE.abre + TAPA_DEL_COFRE.quieta) return 1;
  const cayendo = (transcurrido - TAPA_DEL_COFRE.abre - TAPA_DEL_COFRE.quieta) / TAPA_DEL_COFRE.cierra;
  return cayendo >= 1 ? 0 : 1 - suave(cayendo);
}

/** Lo que ha girado la ruleta: vuelta y media frenando, y se queda donde la deja el freno. */
export function giroDeLaRuleta(transcurrido: number): number {
  if (transcurrido <= 0) return 0;
  const u = pinza(transcurrido / RULETA.total);
  /* Frenada cuadrática: arranca rápido y se para sola, como una ruleta de verdad. */
  return RULETA.vueltas * Math.PI * 2 * (1 - (1 - u) ** 2);
}

/** Lo que ha girado la joya sobre su pedestal: una vuelta entera, y vuelve a quedarse de frente. */
export function giroDeLaJoya(transcurrido: number): number {
  if (transcurrido <= 0) return 0;
  return JOYA_QUE_GIRA.vueltas * Math.PI * 2 * suave(pinza(transcurrido / JOYA_QUE_GIRA.total));
}

/**
 * LA RECAUDACIÓN DEL IMPUESTO: cuándo sube la moneda de la oficina, dentro del pago.
 *
 * Suena con el `paga` del Impuesto al Ayuntamiento y rueda 0,6 s a partir de los 0,3: después de que
 * quien paga haga el gesto de lanzar, y dentro del pago más corto que puede haber —una sola moneda,
 * 0,97 s—, porque cuando el suceso acaba la escena deja de preguntar, y una moneda a medio camino
 * desaparecería de golpe. Crece en sus primeras 0,08 para no salir de la nada.
 */
export const RECAUDACION = { empieza: 0.3, rueda: 0.6, crece: 0.08 } as const;

/** ¿Este suceso es pagar el Impuesto al Ayuntamiento? Sólo ése mueve la moneda de la oficina. */
export function esRecaudacion(s: SucesoDelBurgo): boolean {
  return s.que === 'paga' && s.porque === 'diezmo' && s.a === null;
}

/** Dónde va la moneda a `transcurrido` del pago: `null` si no se ve; si no, su avance (0..1) y su escala. */
export function momentoDeLaRecaudacion(transcurrido: number): { readonly u: number; readonly escala: number } | null {
  const t = transcurrido - RECAUDACION.empieza;
  if (t < 0 || t >= RECAUDACION.rueda) return null;
  return { u: t / RECAUDACION.rueda, escala: suave(t / RECAUDACION.crece) };
}

/**
 * EL HUMO DE LA CENTRAL Y LA ONDA DEL CANAL: cuándo suenan, dentro de la renta de un servicio.
 *
 * Suenan con el `paga` de la renta de su casilla y arrancan con él, como la joya con la Tasa. El humo
 * son tres bocanadas escalonadas una décima, que suben 7 desde la boca de la chimenea: cada una crece
 * durante dos tercios de su vida y se deshace en el último, 0,6 cada una y 0,8 las tres. La onda se
 * abre desde un quinto de su radio hasta entero en 0,6. Las dos caben en la renta más corta que hay
 * —una moneda, 0,97—, por lo mismo que la moneda de la oficina.
 */
export const HUMO = { escalon: 0.1, dura: 0.6, sube: 7, ladoAlSalir: 1.2, ladoMayor: 3.4 } as const;
export const ONDA_DEL_AGUA = { dura: 0.6, desde: 0.2 } as const;

/** Lo que duran las tres bocanadas, de la primera que sale a la última que se deshace. */
export function duracionDelHumo(): number {
  return HUMO.escalon * (BOCANADAS_DEL_HUMO - 1) + HUMO.dura;
}

/** ¿Este suceso es pagar la renta de ESTA casilla? */
export function esRentaDe(s: SucesoDelBurgo, casilla: number): boolean {
  return s.que === 'paga' && s.porque === 'renta' && s.casilla === casilla;
}

/** La bocanada `k` a `transcurrido` de la renta: `null` si no está; si no, lo que ha subido y su lado. */
export function bocanadaDelHumo(k: number, transcurrido: number): { readonly sube: number; readonly lado: number } | null {
  const t = transcurrido - k * HUMO.escalon;
  if (t < 0 || t >= HUMO.dura) return null;
  const u = t / HUMO.dura;
  const lado = u < 2 / 3 ? HUMO.ladoAlSalir + (HUMO.ladoMayor - HUMO.ladoAlSalir) * suave(u * 1.5) : HUMO.ladoMayor * (1 - suave((u - 2 / 3) * 3));
  return { sube: HUMO.sube * suave(u), lado };
}

/** La escala del radio de la onda a `transcurrido` de la renta, o `null` si no está. */
export function ondaDelAgua(transcurrido: number): number | null {
  if (transcurrido < 0 || transcurrido >= ONDA_DEL_AGUA.dura) return null;
  return ONDA_DEL_AGUA.desde + (1 - ONDA_DEL_AGUA.desde) * suave(transcurrido / ONDA_DEL_AGUA.dura);
}

/** El quebrado se desvanece en los últimos 0,8 s de su huida. */
export function desvanecidoAlQuebrar(transcurrido: number): number {
  return pinza((transcurrido - (QUIEBRA - DESVANECER_AL_QUEBRAR)) / DESVANECER_AL_QUEBRAR);
}

/** El peón `k` del sorteo cae escalonado: cuánto lleva cayendo, 0..1. */
export function caidaDelPeonDelSorteo(k: number, transcurrido: number): number {
  return pinza((transcurrido - k * ESCALON_DE_LOS_PEONES) / ASENTAR);
}
