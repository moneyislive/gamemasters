/**
 * LA VISTA DE UNA MESA DE EL QUIEBRO: su forma, los movimientos que admite y los veredictos que le
 * llegan de la sala. Sólo tipos, constantes y lectores: el reductor que la produce es `quiebro.ts`.
 *
 * ═══ POR QUÉ LA FORMA VA APARTE DEL REDUCTOR ═══
 *
 * La vista la LEEN cinco sitios que no son el reductor: el productor de la liza (`quiebro-liza.ts`), el
 * cliente del juego en el escritorio, el documento suelto que cargan la app y `/jugar`, el robot y los
 * comprobadores. Si el tipo viviera dentro de `quiebro.ts`, el cliente del navegador importaría el
 * reductor entero para saber qué forma tiene lo que le llega. Y si cada uno la leyera «a su manera»,
 * el primer campo renombrado dejaría a uno pintando `undefined`. Por eso hay UN lector estricto
 * (`leerVistaDelQuiebro`) y todos pasan por él.
 *
 * ═══ ES PÚBLICA E IGUAL PARA TODOS ═══
 *
 * El Quiebro no tiene secretos (`secretos: false`): la proyección es la identidad y quien mira sin
 * asiento ve lo mismo que un jugador. Es lo que permite que la sala del servidor la lea con
 * `mirar(codigo, null)` y componga la MISMA liza que el aparato.
 *
 * ═══ CADA DATO, EN UN SOLO SITIO ═══
 *
 * La vista no lleva ni un número de juego: lleva QUÉ se eligió (nivel, avería, contramedida, estilo y
 * retoques de cada asiento) y `componerReglamento` de `quiebro-reglas.ts` lo traduce a números, igual
 * en la sala y en el aparato. Y esos ids están UNA vez: en `reglamento`. Ni la noche repite el nivel ni
 * el asiento repite su estilo. Lo mismo el número de la noche: vive en `noche.numero` y la fase no lo
 * repite. Dos sitios para el mismo dato son la ocasión de que dejen de coincidir —el barrio se siembra
 * con el número de noche, y dos números distintos son dos barrios: la sala corregiría cada paso—.
 *
 * ═══ LOS PUNTOS DE CONTROL ═══
 *
 * La sala no persiste nada: si un despliegue la mata, se rehace desde la mesa. Lo que se tiene que
 * poder rehacer —aguante, Foco y esquirlas de cada asiento, monedas del equipo— lo guarda la mesa al
 * cerrar cada oleada (`arcade:ronda`) y lo publica aquí; el productor de la liza lo pone en `alEmpezar`
 * de cada fase. Las cuentas de la ronda son de ESA fase (ver `ContadorDeAsiento` en la Liza): el
 * reductor las SUMA a los contadores de la noche.
 */
import { esTableroDeclarado } from '../../mecanicas/tablero-declarado';
import type { TableroDeclarado } from '../../mecanicas/tablero-declarado';
import { esClaveCorta, leerCargaDeRonda } from '../../mecanicas/liza/declaracion';
import type { ColumnaDeCuenta, ResultadoDeRonda } from '../../mecanicas/liza/declaracion';
import {
  IDS_DE_AVERIA,
  IDS_DE_CONTRAMEDIDA,
  IDS_DE_ESTILO,
  IDS_DE_PLANTILLA,
  IDS_DE_RECETA,
  IDS_DE_RETOQUE,
  IDS_DE_TITULO,
  IDS_DE_VOTO,
  PRIMER_NIVEL,
  ULTIMO_NIVEL,
} from './quiebro-nombres';
import type {
  IdDeAveria,
  IdDeContramedida,
  IdDeEstilo,
  IdDePlantilla,
  IdDeReceta,
  IdDeRetoque,
  IdDeTitulo,
  IdDeVoto,
} from './quiebro-nombres';

/*
 * Los veredictos de la plataforma son de la Liza, que es genérica: aquí se reexportan con su forma
 * para que el reductor los importe de un solo sitio.
 */
export {
  VEREDICTO_DE_AUSENTE,
  VEREDICTO_DE_RELOJ,
  VEREDICTO_DE_RONDA,
  leerCargaDeAusente,
  leerCargaDeReloj,
  leerCargaDeRonda,
} from '../../mecanicas/liza/declaracion';
export type { CargaDeAusente, CargaDeReloj, CargaDeRonda, ResultadoDeRonda } from '../../mecanicas/liza/declaracion';

/* ─── LOS TOPES ──────────────────────────────────────────────────────────── */

/** Asientos de una mesa (manifiesto: 1-6). */
export const ASIENTOS_COMO_MUCHO = 6;
/** Noches por mesa, para que el diario no crezca sin fin. */
export const NOCHES_COMO_MUCHO = 10;
/** Oleadas de una noche: tres y hasta dos de propina. */
export const OLEADAS_COMO_MUCHO = 5;
/** Las oleadas que no son de propina. */
export const OLEADAS_FIJAS = 3;
/** Retoques que se ofrecen en cada pausa (como mucho: pueden quedar menos por ofrecer). */
export const RETOQUES_OFRECIDOS = 3;
/** Esquirlas que lleva un desvelado como mucho. */
export const ESQUIRLAS_COMO_MUCHO = 12;
/** La primera pausa en la que se vota «Llamar ya» o «Aguantar»: la que va detrás de la oleada 3. */
export const PRIMERA_PAUSA_CON_VOTO = 3;
/** Los quiebros con la ventana de aprender en la primera noche de un aparato. */
export const QUIEBROS_DE_APRENDIZ = 3;

/* ─── LA FASE ────────────────────────────────────────────────────────────── */

/** La fase de juego a la que vuelve una noche interrumpida. */
export type FaseDeJuego = { readonly tipo: 'oleada'; readonly oleada: number } | { readonly tipo: 'llamada' };

/** Cómo acabó una noche. `rendida` es una derrota: el grupo pulsó Rendirse. */
export type ResultadoDeNoche = 'ganada' | 'perdida' | 'rendida';

/**
 * LA FASE DE LA MESA (documento de diseño, §5 y §10). La noche de la que se habla es `noche.numero` de
 * la vista —la fase no lo repite—; `oleada`, de 1 a 5 (la 4 y la 5 son propinas). La `pausa` va DETRÁS
 * de la oleada que lleva.
 */
export type FaseDelQuiebro =
  | { readonly tipo: 'reunion' }
  | { readonly tipo: 'bajada' }
  | { readonly tipo: 'oleada'; readonly oleada: number }
  | { readonly tipo: 'pausa'; readonly oleada: number }
  | { readonly tipo: 'llamada' }
  | { readonly tipo: 'recuento'; readonly resultado: ResultadoDeNoche }
  /** Dos tics perezosos seguidos sin veredicto: nadie juega. Se ofrecen Reanudar y Rendirse. */
  | { readonly tipo: 'interrumpida'; readonly en: FaseDeJuego }
  | { readonly tipo: 'final' }
  | { readonly tipo: 'cerrada' };

/**
 * EL RELOJ DE FASE: la sala hace vencer `duraMs` y mete `arcade:reloj {id}` una vez. `id` distinto en
 * cada fase que lo lleve, y una clave corta de la Liza (`esClaveCorta`: 1-64 de `A-Z a-z 0-9 _ . : -`),
 * porque el productor lo pasa tal cual a la declaración.
 */
export interface RelojDelQuiebro {
  readonly id: string;
  readonly duraMs: number;
}

/**
 * LA NOCHE en curso (o la que va a empezar). `null` SÓLO en la reunión antes de sortear la primera y,
 * si el reductor quiere, en una mesa cerrada: en cualquier otra fase hay noche, y el lector lo exige.
 */
export interface NocheDelQuiebro {
  /** 1-10. Con el código de la mesa, siembra el barrio. El único sitio donde está. */
  readonly numero: number;
  readonly receta: IdDeReceta;
  readonly plantilla: IdDePlantilla;
}

/* ─── LOS ASIENTOS ───────────────────────────────────────────────────────── */

/** El último punto de control de un asiento: con esto empieza cada fase. */
export interface ControlDelAsiento {
  readonly aguante: number;
  readonly foco: number;
  readonly esquirlas: number;
}

/**
 * Lo que se cuenta de un asiento en la noche, para el recuento, los títulos y la Memoria del Sistema:
 * la SUMA de las columnas de cada ronda (la racha, el máximo).
 */
export interface ContadoresDelAsiento {
  /** Quiebros limpios («Más limpios»). */
  readonly limpios: number;
  /** La racha de limpios seguidos sin recibir daño más larga de la noche («Racha más larga»). */
  readonly rachaMasLarga: number;
  /** Golpes y balas que se juzgaron contra él: con `limpios`, la contramedida «Tiradores». */
  readonly amenazas: number;
  /** Celadores desalojados («Más desalojos»). */
  readonly desalojos: number;
  /** Estampados: la contramedida «Plaza despejada». */
  readonly estampados: number;
  /** Rescates hechos («Más rescates»). */
  readonly rescates: number;
  readonly caidas: number;
  /** Veces que volvió pagando una moneda: la contramedida «Monedas caras». */
  readonly reapariciones: number;
  /** Esquirlas cobradas al salir por la cabina («El Avaro»). */
  readonly esquirlasCobradas: number;
}

/** UN ASIENTO EN LA VISTA. Su estilo y sus retoques están en `reglamento`, no aquí (ver la cabecera). */
export interface AsientoDelQuiebro {
  /** El `AsientoId` de la mesa. La lista va en el orden en que se sentaron. */
  readonly asiento: string;
  /**
   * Los retoques que se le ofrecen en la pausa en curso: de 1 a `RETOQUES_OFRECIDOS`, distintos; `[]`
   * fuera de pausa.
   */
  readonly ofrecidos: readonly IdDeRetoque[];
  /**
   * Si ya eligió lo de la fase en curso: en una PAUSA, su retoque (su único movimiento de la pausa); en la
   * BAJADA, que está listo para bajar (eligió estilo o dijo `listo`). `false` en cualquier otra fase.
   */
  readonly haElegido: boolean;
  /**
   * Su voto en la pausa en curso, o `null` si no votó. Sólo puede haberlo en una pausa desde la oleada
   * `PRIMERA_PAUSA_CON_VOTO`.
   */
  readonly voto: IdDeVoto | null;
  /** Sin canal más de 60 s en una fase de juego: no cuenta para escalar la oleada siguiente. */
  readonly ausente: boolean;
  /** Salió por la cabina en esta noche. */
  readonly salio: boolean;
  /**
   * LA PRIMERA NOCHE DEL APARATO: cuántos quiebros con la ventana de aprender le quedan (0 a
   * `QUIEBROS_DE_APRENDIZ`). Lo pone el movimiento `aprendiz` —el aparato sabe, por su almacén local,
   * que nunca ha jugado una noche— y lo baja el reductor con la columna `quiebros` de cada ronda. El
   * productor lo declara como `esquiva.primeras.cuantas` y así ni un despliegue ni una oleada nueva los
   * regalan otra vez.
   */
  readonly aprendiz: number;
  /** Puntos de la noche. */
  readonly puntos: number;
  readonly control: ControlDelAsiento;
  readonly contadores: ContadoresDelAsiento;
}

/* ─── EL REGLAMENTO PUBLICADO ────────────────────────────────────────────── */

/** Lo que eligió un asiento: su estilo y los retoques de la noche, en el orden en que los eligió. */
export interface EleccionDelAsiento {
  readonly asiento: string;
  readonly estilo: IdDeEstilo;
  readonly retoques: readonly IdDeRetoque[];
}

/**
 * EL REGLAMENTO, POR IDS. `base` nombra la tabla de números de partida (`'v1'`); lo demás, qué se
 * eligió. `asientos` va en el mismo orden que `VistaDelQuiebro.asientos`.
 */
export interface ReglamentoDelQuiebro {
  readonly base: string;
  /** 1-5. */
  readonly nivel: number;
  readonly averia: IdDeAveria;
  readonly contramedida: IdDeContramedida;
  readonly asientos: readonly EleccionDelAsiento[];
}

/* ─── EL HISTORIAL ───────────────────────────────────────────────────────── */

/** Una noche ya jugada. Los asientos que nombra son los de la mesa. */
export interface NocheJugada {
  readonly noche: number;
  readonly nivel: number;
  readonly resultado: ResultadoDeNoche;
  readonly puntos: readonly { readonly asiento: string; readonly puntos: number }[];
  readonly titulos: readonly { readonly titulo: IdDeTitulo; readonly asiento: string }[];
}

/** La mejor noche de un asiento en esta mesa: la que se enseña «por nombre». */
export interface MejorNoche {
  readonly noche: number;
  readonly asiento: string;
  readonly puntos: number;
}

/* ─── LA VISTA ───────────────────────────────────────────────────────────── */

/** LA VISTA PÚBLICA DE UNA MESA DE EL QUIEBRO. */
export interface VistaDelQuiebro {
  readonly fase: FaseDelQuiebro;
  readonly reloj: RelojDelQuiebro | null;
  /** La noche en curso o la que va a empezar (ver `NocheDelQuiebro` para cuándo es `null`). */
  readonly noche: NocheDelQuiebro | null;
  readonly asientos: readonly AsientoDelQuiebro[];
  /** Las monedas del equipo en el último punto de control. */
  readonly monedas: number;
  /** Las últimas noches, de la más vieja a la más nueva (hasta `NOCHES_COMO_MUCHO`). */
  readonly historial: readonly NocheJugada[];
  readonly mejorNoche: MejorNoche | null;
  readonly reglamento: ReglamentoDelQuiebro;
  /** El plano del barrio con el marcador en paneles: el respaldo de quien no pinta la escena. */
  readonly tablero: TableroDeclarado;
}

/* ─── LOS MOVIMIENTOS DE ASIENTO ─────────────────────────────────────────── */

/**
 * Los tipos de movimiento que manda un asiento (`POST …/movimientos` con `x-asiento`). Los que no dicen
 * carga van con `carga: null`.
 */
export const MOVIMIENTO_DEL_QUIEBRO = {
  /**
   * `{id}`: elegir estilo. En la Bajada (donde además deja al asiento listo) y entre noches, uno por
   * tramo; en la reunión no, que cerraría la mesa a los que aún no han llegado (ver `quiebro.ts`).
   */
  estilo: 'estilo',
  /** Sin carga: «estoy listo, me quedo con mi estilo» (en la Bajada, a quien aún no lo está). */
  listo: 'listo',
  /**
   * Sin carga: «este aparato juega su primera noche» (lo sabe él, por su almacén local). Sólo en la
   * Bajada de la noche 1: el reductor le pone `aprendiz` a `QUIEBROS_DE_APRENDIZ`, y el aparato lo manda
   * en cuanto ve la Bajada.
   */
  aprendiz: 'aprendiz',
  /** Sin carga: empezar la noche (en la reunión). La mesa se cierra. */
  empezar: 'empezar',
  /** `{retoque, voto}`: la elección de la pausa, una por asiento. */
  elegir: 'elegir',
  /** Sin carga: rendirse (en juego o interrumpida). La noche se pierde. */
  rendirse: 'rendirse',
  /** Sin carga: reanudar una noche interrumpida. */
  reanudar: 'reanudar',
  /** Sin carga: otra noche en la misma mesa (al final). */
  otraNoche: 'otra-noche',
  /** Sin carga: cerrar la mesa (al final). Da `seAcabo`. */
  cerrar: 'cerrar',
} as const;
export type TipoDeMovimientoDelQuiebro = (typeof MOVIMIENTO_DEL_QUIEBRO)[keyof typeof MOVIMIENTO_DEL_QUIEBRO];

/** La carga de `estilo`. */
export interface CargaDeEstilo {
  readonly id: IdDeEstilo;
}

/** La carga de `elegir`: el retoque (uno de los ofrecidos) y el voto (`null` si en esa pausa no se vota). */
export interface CargaDeElegir {
  readonly retoque: IdDeRetoque;
  readonly voto: IdDeVoto | null;
}

/* ─── LA RONDA DE LA SALA, CON SUS COLUMNAS ──────────────────────────────── */

/** El id de portable de las esquirlas en la liza de El Quiebro (el único portable de la v1). */
export const PORTABLE_ESQUIRLA = 1;

/**
 * QUÉ LLEVA CADA FILA DE `cuentas` en el `arcade:ronda` de El Quiebro, detrás del número del asiento:
 * el productor la declara (`veredictos.columnas`) y el reductor la lee con `leerRondaDelQuiebro`. La
 * misma lista en los dos lados, escrita una vez. Lo que significa cada una, en `ContadorDeAsiento`.
 */
export const COLUMNAS_DE_LA_RONDA: readonly ColumnaDeCuenta[] = [
  { que: 'puntos' },
  { que: 'lleva', portable: PORTABLE_ESQUIRLA },
  { que: 'cobrado', portable: PORTABLE_ESQUIRLA },
  { que: 'vida' },
  { que: 'medidor' },
  { que: 'limpias' },
  { que: 'serieMaxima' },
  { que: 'amenazas' },
  { que: 'rematadas' },
  { que: 'choques' },
  { que: 'rescates' },
  { que: 'caidas' },
  { que: 'reapariciones' },
  { que: 'esquivas' },
  { que: 'salio' },
];

/**
 * Una fila de `cuentas`, con nombre. Todo es de LA FASE que la ronda cierra, salvo `esquirlas`,
 * `aguante` y `foco`, que son cómo quedó al cerrar (el punto de control).
 */
export interface CuentaDeAsiento {
  /** El número del asiento en la liza: su posición en `VistaDelQuiebro.asientos` más uno. */
  readonly numero: number;
  /** Ganados en la fase, con lo cobrado al salir dentro. */
  readonly puntos: number;
  /** Las que lleva al cerrar (0 si salió: las cobró). */
  readonly esquirlas: number;
  /** Las que cobró al salir en la fase. */
  readonly esquirlasCobradas: number;
  readonly aguante: number;
  readonly foco: number;
  readonly limpios: number;
  readonly rachaMasLarga: number;
  readonly amenazas: number;
  readonly desalojos: number;
  readonly estampados: number;
  readonly rescates: number;
  readonly caidas: number;
  readonly reapariciones: number;
  /** Quiebros empezados (rupturas aparte): lo que se descuenta de `aprendiz`. */
  readonly quiebros: number;
  readonly salio: boolean;
}

/** Un `arcade:ronda` de El Quiebro, leído y con nombres. */
export interface RondaDelQuiebro {
  readonly n: number;
  readonly resultado: ResultadoDeRonda;
  readonly cuentas: readonly CuentaDeAsiento[];
  readonly monedas: number;
}

/**
 * LA CARGA DE UN `arcade:ronda`, LEÍDA CON DESCONFIANZA Y CON NOMBRES. `null` si la manda alguien, si no
 * trae una fila por asiento con las columnas de `COLUMNAS_DE_LA_RONDA`, si `salio` no es 0 o 1, o si las
 * esquirlas que lleva pasan de `ESQUIRLAS_COMO_MUCHO`. El reductor que reciba `null` rechaza el
 * movimiento; el que reciba una ronda cuyo `n` no sea el de la oleada en curso, también.
 */
export function leerRondaDelQuiebro(carga: unknown, quien: string | null, asientos: number): RondaDelQuiebro | null {
  const leida = leerCargaDeRonda(carga, quien, COLUMNAS_DE_LA_RONDA.length, asientos);
  if (leida === null) return null;
  const cuentas: CuentaDeAsiento[] = [];
  for (const f of leida.cuentas) {
    const v = (i: number): number => f[i] as number;
    const salio = v(15);
    if (salio !== 0 && salio !== 1) return null;
    if (v(2) > ESQUIRLAS_COMO_MUCHO || v(3) > ESQUIRLAS_COMO_MUCHO) return null;
    cuentas.push({
      numero: v(0),
      puntos: v(1),
      esquirlas: v(2),
      esquirlasCobradas: v(3),
      aguante: v(4),
      foco: v(5),
      limpios: v(6),
      rachaMasLarga: v(7),
      amenazas: v(8),
      desalojos: v(9),
      estampados: v(10),
      rescates: v(11),
      caidas: v(12),
      reapariciones: v(13),
      quiebros: v(14),
      salio: salio === 1,
    });
  }
  return { n: leida.n, resultado: leida.resultado, cuentas, monedas: leida.recurso };
}

/* ─── LOS LECTORES ESTRICTOS ─────────────────────────────────────────────── */

function conClaves(v: unknown, claves: readonly string[]): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const suyas = Object.keys(v);
  if (suyas.length !== claves.length) return false;
  for (const c of claves) if (!Object.prototype.hasOwnProperty.call(v, c)) return false;
  return true;
}

function entero(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function unoDe<T extends string>(v: unknown, ids: readonly T[]): v is T {
  return typeof v === 'string' && (ids as readonly string[]).indexOf(v) >= 0;
}

function asientoId(v: unknown): v is string {
  return typeof v === 'string' && v.length >= 1 && v.length <= 64;
}

const TOPE = 1000000000;

/** La carga de `estilo`: `{id}` con un estilo que existe. */
export function leerCargaDeEstilo(carga: unknown): CargaDeEstilo | null {
  if (!conClaves(carga, ['id']) || !unoDe(carga.id, IDS_DE_ESTILO)) return null;
  return { id: carga.id };
}

/** La carga de `elegir`: `{retoque, voto}` con un retoque que existe y un voto o `null`. */
export function leerCargaDeElegir(carga: unknown): CargaDeElegir | null {
  if (!conClaves(carga, ['retoque', 'voto']) || !unoDe(carga.retoque, IDS_DE_RETOQUE)) return null;
  const voto = carga.voto;
  if (voto !== null && !unoDe(voto, IDS_DE_VOTO)) return null;
  return { retoque: carga.retoque, voto };
}

/** ¿Es la carga de un movimiento sin carga? `null`, o ninguna (un cliente que omite la clave). */
export function esCargaVacia(carga: unknown): boolean {
  return carga === null || carga === undefined;
}

function leerFaseDeJuego(v: unknown): FaseDeJuego | null {
  if (conClaves(v, ['tipo', 'oleada']) && v.tipo === 'oleada' && entero(v.oleada, 1, OLEADAS_COMO_MUCHO)) {
    return { tipo: 'oleada', oleada: v.oleada };
  }
  if (conClaves(v, ['tipo']) && v.tipo === 'llamada') return { tipo: 'llamada' };
  return null;
}

function esResultadoDeNoche(v: unknown): v is ResultadoDeNoche {
  return v === 'ganada' || v === 'perdida' || v === 'rendida';
}

function leerFase(v: unknown): FaseDelQuiebro | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const tipo = (v as { tipo?: unknown }).tipo;
  switch (tipo) {
    case 'reunion':
    case 'bajada':
    case 'llamada':
    case 'final':
    case 'cerrada':
      return conClaves(v, ['tipo']) ? { tipo } : null;
    case 'oleada':
    case 'pausa':
      if (!conClaves(v, ['tipo', 'oleada']) || !entero(v.oleada, 1, OLEADAS_COMO_MUCHO)) return null;
      return { tipo, oleada: v.oleada };
    case 'recuento':
      if (!conClaves(v, ['tipo', 'resultado']) || !esResultadoDeNoche(v.resultado)) return null;
      return { tipo, resultado: v.resultado };
    case 'interrumpida': {
      if (!conClaves(v, ['tipo', 'en'])) return null;
      const en = leerFaseDeJuego(v.en);
      if (en === null) return null;
      return { tipo, en };
    }
    default:
      return null;
  }
}

/** Una lista de ids que existen, sin repetir y con `minimo`…`tope` elementos. */
function leerListaDeIds<T extends string>(v: unknown, ids: readonly T[], minimo: number, tope: number): T[] | null {
  if (!Array.isArray(v) || v.length < minimo || v.length > tope) return null;
  const salida: T[] = [];
  for (const x of v as unknown[]) {
    if (!unoDe(x, ids) || salida.indexOf(x) >= 0) return null;
    salida.push(x);
  }
  return salida;
}

function leerAsiento(v: unknown, fase: FaseDelQuiebro): AsientoDelQuiebro | null {
  const claves = ['asiento', 'ofrecidos', 'haElegido', 'voto', 'ausente', 'salio', 'aprendiz', 'puntos', 'control', 'contadores'];
  if (!conClaves(v, claves)) return null;
  if (!asientoId(v.asiento)) return null;
  const enPausa = fase.tipo === 'pausa';
  /* Fuera de pausa no se ofrece nada; en pausa, de uno a tres, distintos (pueden quedar menos de tres). */
  const ofrecidos = enPausa ? leerListaDeIds(v.ofrecidos, IDS_DE_RETOQUE, 1, RETOQUES_OFRECIDOS) : leerListaDeIds(v.ofrecidos, IDS_DE_RETOQUE, 0, 0);
  if (ofrecidos === null) return null;
  if (typeof v.haElegido !== 'boolean' || typeof v.ausente !== 'boolean' || typeof v.salio !== 'boolean') return null;
  if (v.haElegido && !enPausa && fase.tipo !== 'bajada') return null;
  const voto = v.voto;
  if (voto !== null) {
    if (!unoDe(voto, IDS_DE_VOTO)) return null;
    /* Un voto sólo existe en una pausa que vota: fuera de ahí es un dato que nadie va a contar. */
    if (fase.tipo !== 'pausa' || fase.oleada < PRIMERA_PAUSA_CON_VOTO) return null;
  }
  if (!entero(v.aprendiz, 0, QUIEBROS_DE_APRENDIZ)) return null;
  if (!entero(v.puntos, 0, Number.MAX_SAFE_INTEGER)) return null;
  const c = v.control;
  if (!conClaves(c, ['aguante', 'foco', 'esquirlas'])) return null;
  if (!entero(c.aguante, 0, TOPE) || !entero(c.foco, 0, TOPE) || !entero(c.esquirlas, 0, ESQUIRLAS_COMO_MUCHO)) return null;
  const k = v.contadores;
  const nombres = ['limpios', 'rachaMasLarga', 'amenazas', 'desalojos', 'estampados', 'rescates', 'caidas', 'reapariciones', 'esquirlasCobradas'] as const;
  if (!conClaves(k, nombres)) return null;
  for (const n of nombres) if (!entero(k[n], 0, TOPE)) return null;
  const cuenta = (n: (typeof nombres)[number]): number => k[n] as number;
  return {
    asiento: v.asiento,
    ofrecidos,
    haElegido: v.haElegido,
    voto,
    ausente: v.ausente,
    salio: v.salio,
    aprendiz: v.aprendiz,
    puntos: v.puntos,
    control: { aguante: c.aguante, foco: c.foco, esquirlas: c.esquirlas },
    contadores: {
      limpios: cuenta('limpios'),
      rachaMasLarga: cuenta('rachaMasLarga'),
      amenazas: cuenta('amenazas'),
      desalojos: cuenta('desalojos'),
      estampados: cuenta('estampados'),
      rescates: cuenta('rescates'),
      caidas: cuenta('caidas'),
      reapariciones: cuenta('reapariciones'),
      esquirlasCobradas: cuenta('esquirlasCobradas'),
    },
  };
}

function leerReglamento(v: unknown): ReglamentoDelQuiebro | null {
  if (!conClaves(v, ['base', 'nivel', 'averia', 'contramedida', 'asientos'])) return null;
  if (typeof v.base !== 'string' || v.base.length < 1 || v.base.length > 32) return null;
  if (!entero(v.nivel, PRIMER_NIVEL, ULTIMO_NIVEL) || !unoDe(v.averia, IDS_DE_AVERIA) || !unoDe(v.contramedida, IDS_DE_CONTRAMEDIDA)) return null;
  if (!Array.isArray(v.asientos) || v.asientos.length > ASIENTOS_COMO_MUCHO) return null;
  const asientos: EleccionDelAsiento[] = [];
  for (const e of v.asientos as unknown[]) {
    if (!conClaves(e, ['asiento', 'estilo', 'retoques']) || !asientoId(e.asiento) || !unoDe(e.estilo, IDS_DE_ESTILO)) return null;
    /* Un retoque por pausa como mucho, y una pausa por oleada como mucho. Repetir un retoque se puede. */
    if (!Array.isArray(e.retoques) || e.retoques.length > OLEADAS_COMO_MUCHO) return null;
    const retoques: IdDeRetoque[] = [];
    for (const r of e.retoques as unknown[]) {
      if (!unoDe(r, IDS_DE_RETOQUE)) return null;
      retoques.push(r);
    }
    asientos.push({ asiento: e.asiento, estilo: e.estilo, retoques });
  }
  return { base: v.base, nivel: v.nivel, averia: v.averia, contramedida: v.contramedida, asientos };
}

function leerNocheJugada(v: unknown, sentados: readonly string[]): NocheJugada | null {
  if (!conClaves(v, ['noche', 'nivel', 'resultado', 'puntos', 'titulos'])) return null;
  if (!entero(v.noche, 1, NOCHES_COMO_MUCHO) || !entero(v.nivel, PRIMER_NIVEL, ULTIMO_NIVEL) || !esResultadoDeNoche(v.resultado)) return null;
  if (!Array.isArray(v.puntos) || v.puntos.length > ASIENTOS_COMO_MUCHO) return null;
  const puntos: { asiento: string; puntos: number }[] = [];
  for (const p of v.puntos as unknown[]) {
    if (!conClaves(p, ['asiento', 'puntos']) || !unoDe(p.asiento, sentados) || !entero(p.puntos, 0, Number.MAX_SAFE_INTEGER)) return null;
    if (puntos.some((q) => q.asiento === p.asiento)) return null;
    puntos.push({ asiento: p.asiento, puntos: p.puntos });
  }
  if (!Array.isArray(v.titulos) || v.titulos.length > IDS_DE_TITULO.length) return null;
  const titulos: { titulo: IdDeTitulo; asiento: string }[] = [];
  for (const t of v.titulos as unknown[]) {
    if (!conClaves(t, ['titulo', 'asiento']) || !unoDe(t.titulo, IDS_DE_TITULO) || !unoDe(t.asiento, sentados)) return null;
    /* Cada título, a uno: dos «Más limpios» es un recuento que no sabe quién ganó. */
    if (titulos.some((u) => u.titulo === t.titulo)) return null;
    titulos.push({ titulo: t.titulo, asiento: t.asiento });
  }
  return { noche: v.noche, nivel: v.nivel, resultado: v.resultado, puntos, titulos };
}

/**
 * LA VISTA DE UNA MESA DE EL QUIEBRO, LEÍDA CON DESCONFIANZA. `null` ante cualquier cosa que no sea
 * exactamente una vista bien formada y coherente:
 *   · una clave de más o de menos en cualquier nivel, un id que no existe, un número fuera de rango;
 *   · dos asientos iguales, o un reglamento que no habla de los mismos asientos, en el mismo orden;
 *   · una fase de noche sin noche;
 *   · retoques ofrecidos fuera de pausa o repetidos, una elección fuera de pausa, un voto en una pausa
 *     que no vota;
 *   · un historial desordenado o que habla de noches que aún no han pasado, o de asientos que no son
 *     de la mesa; una mejor noche de alguien que no está sentado.
 *
 * La usan los clientes y el productor de la liza. Una vista que no se lee NO se pinta a medias: el
 * cliente enseña el tablero de respaldo si lo hay (`tableroDeLaVista`) y dice que no entiende la mesa.
 */
export function leerVistaDelQuiebro(x: unknown): VistaDelQuiebro | null {
  if (!conClaves(x, ['fase', 'reloj', 'noche', 'asientos', 'monedas', 'historial', 'mejorNoche', 'reglamento', 'tablero'])) return null;
  const fase = leerFase(x.fase);
  if (fase === null) return null;

  let reloj: RelojDelQuiebro | null = null;
  if (x.reloj !== null) {
    const r = x.reloj;
    if (!conClaves(r, ['id', 'duraMs']) || !esClaveCorta(r.id)) return null;
    if (!entero(r.duraMs, 1, 3600000)) return null;
    reloj = { id: r.id, duraMs: r.duraMs };
  }

  let noche: NocheDelQuiebro | null = null;
  if (x.noche !== null) {
    const n = x.noche;
    if (!conClaves(n, ['numero', 'receta', 'plantilla']) || !entero(n.numero, 1, NOCHES_COMO_MUCHO)) return null;
    if (!unoDe(n.receta, IDS_DE_RECETA) || !unoDe(n.plantilla, IDS_DE_PLANTILLA)) return null;
    noche = { numero: n.numero, receta: n.receta, plantilla: n.plantilla };
  }
  /* Toda fase de una noche habla de una noche: sin ella no hay barrio que sembrar. */
  if (noche === null && fase.tipo !== 'reunion' && fase.tipo !== 'cerrada') return null;

  if (!Array.isArray(x.asientos) || x.asientos.length < 1 || x.asientos.length > ASIENTOS_COMO_MUCHO) return null;
  const asientos: AsientoDelQuiebro[] = [];
  const ids: string[] = [];
  for (const crudo of x.asientos as unknown[]) {
    const a = leerAsiento(crudo, fase);
    if (a === null) return null;
    /* Un asiento dos veces es una vista que no dice de quién es cada cosa. */
    if (ids.indexOf(a.asiento) >= 0) return null;
    ids.push(a.asiento);
    asientos.push(a);
  }

  if (!entero(x.monedas, 0, TOPE)) return null;

  if (!Array.isArray(x.historial) || x.historial.length > NOCHES_COMO_MUCHO) return null;
  const historial: NocheJugada[] = [];
  for (const crudo of x.historial as unknown[]) {
    const h = leerNocheJugada(crudo, ids);
    if (h === null) return null;
    /* De la más vieja a la más nueva, y ninguna posterior a la noche de la que habla la vista. */
    const anterior = historial[historial.length - 1];
    if (anterior !== undefined && h.noche <= anterior.noche) return null;
    if (noche !== null && h.noche > noche.numero) return null;
    historial.push(h);
  }

  let mejorNoche: MejorNoche | null = null;
  if (x.mejorNoche !== null) {
    const m = x.mejorNoche;
    if (!conClaves(m, ['noche', 'asiento', 'puntos']) || !entero(m.noche, 1, NOCHES_COMO_MUCHO) || !unoDe(m.asiento, ids)) return null;
    if (!entero(m.puntos, 0, Number.MAX_SAFE_INTEGER)) return null;
    mejorNoche = { noche: m.noche, asiento: m.asiento, puntos: m.puntos };
  }

  const reglamento = leerReglamento(x.reglamento);
  if (reglamento === null) return null;
  /* El reglamento habla de los mismos asientos y en el mismo orden: de ese orden salen los números de la liza. */
  if (reglamento.asientos.length !== asientos.length) return null;
  for (let i = 0; i < asientos.length; i++) {
    if ((reglamento.asientos[i] as EleccionDelAsiento).asiento !== (asientos[i] as AsientoDelQuiebro).asiento) return null;
  }

  if (!esTableroDeclarado(x.tablero)) return null;

  return {
    fase,
    reloj,
    noche,
    asientos,
    monedas: x.monedas,
    historial,
    mejorNoche,
    reglamento,
    tablero: x.tablero,
  };
}
