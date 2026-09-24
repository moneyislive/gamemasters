/**
 * LA MULTITUD: qué durmientes se pintan en este fotograma, dónde, qué pie llevan adelante y cuánto andan.
 * Puro: sin three. Lo pinta `rebano.ts` con texturas de huesos, y el comprobador lo contrasta con el guion
 * de `quiebro-durmientes.ts`, que es el que manda.
 *
 * ═══ LA GENTE DE LA NOCHE: EL BARRIO O LA CIUDAD ═══
 *
 * Con el barrio de hoy son 48 y se pintan todos. Con la ciudad abierta (`docs/quiebro/CIUDAD-ABIERTA.md`
 * §5.8) son unos 630 y se pintan SÓLO LOS CERCANOS: nadie escribe 630 guiones para pintar los 64 de al
 * lado. `GenteDeLaNoche` es lo único que la multitud sabe de dónde salen —cuántos son, dónde está cada uno
 * en un tic, cómo es, a qué paso va, de cuál sale un Prestado—, y hay dos: `genteDelBarrio` y
 * `genteDeLaCiudad`. Sus índices son los de `FuenteDeCuerpos.prestados()`: los del barrio, o los de la
 * ciudad de la mesa, iguales todas las noches.
 *
 * ═══ QUIÉN SE PINTA EN LA CIUDAD (§5.8) ═══
 *
 *   · SIEMPRE, los que están a `RADIO_DE_LOS_CANDIDATOS` (40 m) o menos de un jugador: son los candidatos a
 *     Prestado, y un Prestado que sale de un civil que no estaba pintado sale de la nada.
 *   · Y hasta `DURMIENTES_QUE_SE_PINTAN` (64) en total, los más cercanos al centro —el propio, o la cámara
 *     sin él— a `RADIO_DE_LO_QUE_SE_PINTA` (90 m) o menos, por (distancia, índice), como
 *     `durmientesCercaEnLaCiudad`.
 * Los 64 son también el tope: si los candidatos de seis jugadores separados pasaran de ahí, se quedan los
 * más cercanos al centro (los demás no se ven desde aquí). Se elige cada `TICS_ENTRE_ELECCIONES` (medio
 * segundo), no en cada tic: elegir escribe el sitio de unos doscientos posibles, y con eso en cada tic la
 * multitud de la ciudad asignaba el doble que la del barrio (lo mide `verify:quiebro-personajes`). Entre
 * elección y elección se escriben sólo los de la lista, tic a tic; y como quien corre anda 3,5 m en medio
 * segundo, los candidatos se miran `MARGEN_DE_LOS_CANDIDATOS_M` más lejos. Con la lista a rebosar, un
 * durmiente que ya se pintaba cuenta `HISTERESIS_DE_LA_LISTA_M` más cerca: sin eso, dos durmientes a la
 * misma distancia en el puesto 64 se quitaban el sitio el uno al otro en cada elección, y a 50 m en la
 * lluvia se ve a alguien aparecer y desaparecer. Una multitud recién creada no recuerda a nadie, así que su primera lista es exactamente la
 * del contrato (lo mira `verify:quiebro-personajes`).
 *
 * ═══ EL SITIO ES EL DEL GUION, NO EL NUESTRO ═══
 *
 * Un Prestado sale del durmiente más cercano a un punto, y cada aparato lo elige con la misma función pura
 * (`GenteDeLaNoche.masCercano`). Si aquí se pintara al durmiente medio metro más allá de donde el guion lo
 * pone, el jugador vería temblar a un civil y convertirse en Prestado a otro. Así que el sitio sale del
 * guion en el tic entero y en el siguiente, y entre los dos se interpola (sin interpolar si en un tic salta
 * más de 2 m, que es el guion doblando una esquina o empezando otra vuelta). Lo único propio es el
 * apartarse: los jugadores y los NPC atraviesan a los durmientes, y éstos se apartan medio metro en local
 * (§8), con suavidad y sin salirse nunca de ese medio metro.
 *
 * ═══ EL RELOJ DEL REMANSO ═══
 *
 * La gente es adorno y el adorno va en el reloj de presentación (§4.4): durante el Remanso los durmientes
 * andan a ×0,3 y luego recuperan. El tic pintado es el de la sala menos el retraso que el Remanso lleva
 * acumulado (`ticPintado`): como mucho 315 ms, unos seis tics, que se recuperan solos. No cambia a quién se
 * elige de Prestado: eso se decide con el tic de la sala, no con éste.
 *
 * ═══ EL PIE ADELANTE ═══
 *
 * La fase del paso sale del tic, de lo que anda su cuadrilla por tic y de la zancada del clip de andar
 * (`faseDeAndar`): con un paso de 1,1 m/s y una zancada de 1,3 m, el pie de apoyo va hacia atrás a
 * 1,1 m/s y la persona no patina. Parado (esperando al semáforo o charlando en su esquina) pasa a reposo
 * con un fundido de 0,3 s. Quien entra en la lista empieza en su sitio, su rumbo y su marcha, sin fundir
 * nada: lo que recordaba de la última vez que se pintó ya no vale.
 *
 * ═══ SIN ASIGNAR POR FOTOGRAMA ═══
 *
 * Todo en arrays preparados: los de cada durmiente, del tamaño de la gente de la noche, y los de la lista,
 * de `DURMIENTES_PINTADOS_COMO_MUCHO`. Elegir recorre las cuadrillas de las celdas cercanas con una marca
 * por cuadrilla y escribe los sitios con `escribirLosDurmientesDeLaCiudad`, sin un objeto por cabeza.
 */
import { UNO } from '../../../../shared/mecanicas/fijo';
import {
  DURMIENTES,
  aspectoDelDurmienteEnLaCiudad,
  durmienteMasCercano,
  durmienteMasCercanoEnLaCiudad,
  escribirLosDurmientes,
  escribirLosDurmientesDeLaCiudad,
  guionDeLaCuadrillaEnLaCiudad,
  guionDeLosDurmientes,
  repartoDeLosDurmientes,
} from '../../../../shared/arcade/juegos/quiebro-durmientes';
import type { Barrio } from '../../../../shared/arcade/juegos/quiebro-barrio';
import type { NocheDeLaCiudad } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import {
  CELDA_MAXIMA,
  CELDA_MINIMA,
  DURMIENTES_QUE_SE_PINTAN,
  LADO_DE_CELDA,
  RADIO_DE_LO_QUE_SE_PINTA,
  RADIO_DE_LOS_CANDIDATOS,
  indiceDeCelda,
} from '../../../../shared/arcade/juegos/quiebro-ciudad';
import type { FuenteDeCuerpos } from '../cuerpos';
import { faseDeAndar, normalizarAngulo } from './gestos';

/** Lo que dura un tic, en ms. */
export const MS_POR_TIC = 50;
/** Lo más que se aparta un durmiente de su sitio del guion (§8: medio metro). */
export const APARTE_COMO_MUCHO_M = 0.5;
/** A qué distancia de un cuerpo empieza a apartarse. */
export const APARTARSE_DESDE_M = 1.2;
/** Fundido entre andar y estar parado. */
export const FUNDIDO_DE_PARAR_MS = 300;
/** Lo que gira como mucho al doblar una esquina, en rad/s. */
export const GIRO_COMO_MUCHO = 5;
/** Un salto de sitio de más de esto en un tic no se interpola. */
const SALTO_M = 2;
/**
 * Cuántos durmientes se pintan como mucho a la vez: los 48 del barrio o los 64 de la ciudad. Es lo que
 * miden el rebaño de la multitud, las sombras de contacto y el presupuesto (`verify:quiebro-personajes`).
 */
export const DURMIENTES_PINTADOS_COMO_MUCHO = Math.max(DURMIENTES, DURMIENTES_QUE_SE_PINTAN);
/** Lo que cuenta más cerca un durmiente que ya se pintaba, cuando la lista rebosa (ver la cabecera). */
export const HISTERESIS_DE_LA_LISTA_M = 3;
/** Cada cuántos tics se vuelve a elegir a quién se pinta en la ciudad (ver la cabecera): medio segundo. */
export const TICS_ENTRE_ELECCIONES = 10;
/** Lo que se miran más lejos los candidatos de cada jugador: lo que anda a la carrera entre dos elecciones. */
export const MARGEN_DE_LOS_CANDIDATOS_M = 4;

/* ═══════════════════════════════ LA GENTE DE LA NOCHE ═══════════════════════════════ */

/** Cómo se ve un durmiente: su cuerpo (0-1), su ropa (0-3) y si lleva paraguas. Igual en todos los aparatos. */
export interface AspectoDeLaGente {
  readonly cuerpo: number;
  readonly ropa: number;
  readonly paraguas: boolean;
}

/**
 * DE DÓNDE SALEN LOS DURMIENTES DE ESTA NOCHE. Todo lo que devuelve sale de `quiebro-durmientes.ts`: aquí no
 * se inventa ni un sitio.
 */
export interface GenteDeLaNoche {
  /** El barrio o la noche de la ciudad: lo que cambia cuando cambia la gente (para las memorias por identidad). */
  readonly clave: object;
  /** Cuántos hay: 48 en el barrio, los de `durmientesDeLaCiudad` en la ciudad. */
  readonly total: number;
  /** ¿Se pintan todos (el barrio) o sólo los cercanos (la ciudad)? */
  readonly todos: boolean;
  /**
   * Escribe `x, z, rumbo, anda` (Q16.16, rumbo 0-255, `anda` 1, 0, o −1 si esta noche no sale) de los
   * `cuantos` primeros de `indices` en el tic `tic`, en ese orden.
   */
  escribir(tic: number, indices: Int32Array, cuantos: number, destino: Int32Array): void;
  /**
   * Apunta en `salida`, a partir de `cuantos`, los que PUEDEN estar a `radio` metros o menos de `(x, z)`
   * —metros—: los de las cuadrillas cuya vuelta toca las celdas del cuadrado del radio, sin repetir una
   * cuadrilla en la misma tanda (`nuevaMarca`). Devuelve cuántos hay ya en `salida`.
   */
  posibles(x: number, z: number, radio: number, salida: Int32Array, cuantos: number): number;
  /** Empieza una tanda de `posibles`. */
  nuevaMarca(): void;
  /** Cómo es el durmiente `i`. */
  aspecto(i: number): AspectoDeLaGente;
  /** Lo que anda en un tic (Q16.16), o 0 si esta noche no sale. */
  pasoPorTic(i: number): number;
  /**
   * EL DURMIENTE DEL QUE SALE UN PRESTADO nacido en `(x, z)` —Q16.16— en el tic `tic`, sin los `excluidos`:
   * la función pura del contrato. `null` si no hay ninguno (en la ciudad, a más de 60 m: se imprime).
   */
  masCercano(tic: number, x: number, z: number, excluidos: readonly number[]): number | null;
}

const GENTE_DEL_BARRIO = new WeakMap<Barrio, GenteDeLaNoche>();

/** LA GENTE DEL BARRIO DE HOY: los 48, todos pintados. */
export function genteDelBarrio(barrio: Barrio): GenteDeLaNoche {
  const hecha = GENTE_DEL_BARRIO.get(barrio);
  if (hecha !== undefined) return hecha;
  const guion = guionDeLosDurmientes(barrio);
  const plano = new Int32Array(DURMIENTES * 4);
  let ticDelPlano = Number.NaN;
  let dados = false;
  const gente: GenteDeLaNoche = {
    clave: barrio,
    total: DURMIENTES,
    todos: true,
    escribir(tic, indices, cuantos, destino) {
      if (tic !== ticDelPlano) {
        escribirLosDurmientes(barrio, tic, plano);
        ticDelPlano = tic;
      }
      for (let k = 0; k < cuantos; k++) {
        const i = indices[k] as number;
        destino[k * 4] = plano[i * 4] as number;
        destino[k * 4 + 1] = plano[i * 4 + 1] as number;
        destino[k * 4 + 2] = plano[i * 4 + 2] as number;
        destino[k * 4 + 3] = plano[i * 4 + 3] as number;
      }
    },
    posibles(_x, _z, _radio, salida, cuantos) {
      if (dados) return cuantos;
      dados = true;
      let n = cuantos;
      for (let i = 0; i < DURMIENTES && n < salida.length; i++) salida[n++] = i;
      return n;
    },
    nuevaMarca() {
      dados = false;
    },
    aspecto(i) {
      const a = guion.durmientes[i];
      return a === undefined ? { cuerpo: 0, ropa: 0, paraguas: false } : { cuerpo: a.cuerpo, ropa: a.ropa, paraguas: a.paraguas };
    },
    pasoPorTic(i) {
      const a = guion.durmientes[i];
      const c = a === undefined ? undefined : guion.cuadrillas[a.cuadrilla];
      return c === undefined ? 0 : c.paso;
    },
    masCercano(tic, x, z, excluidos) {
      return durmienteMasCercano(barrio, tic, x, z, excluidos);
    },
  };
  GENTE_DEL_BARRIO.set(barrio, gente);
  return gente;
}

const GENTE_DE_LA_CIUDAD = new WeakMap<NocheDeLaCiudad, GenteDeLaNoche>();

/** LA GENTE DE UNA NOCHE DE LA CIUDAD: unos 630, pintados los cercanos. */
export function genteDeLaCiudad(noche: NocheDeLaCiudad): GenteDeLaNoche {
  const hecha = GENTE_DE_LA_CIUDAD.get(noche);
  if (hecha !== undefined) return hecha;
  const reparto = repartoDeLosDurmientes(noche.ciudad);
  const total = reparto.durmientes.length;
  /* Qué cuadrillas ya se apuntaron: el número de la tanda en que se apuntaron. */
  const marcadas = new Int32Array(reparto.cuadrillas.length).fill(-1);
  let tanda = 0;
  /* La lista que pide `escribirLosDurmientesDeLaCiudad`, reutilizada. */
  const indicesComoLista: number[] = [];
  const gente: GenteDeLaNoche = {
    clave: noche,
    total,
    todos: false,
    escribir(tic, indices, cuantos, destino) {
      indicesComoLista.length = cuantos;
      for (let k = 0; k < cuantos; k++) indicesComoLista[k] = indices[k] as number;
      escribirLosDurmientesDeLaCiudad(noche, tic, indicesComoLista, destino);
    },
    posibles(x, z, radio, salida, cuantos) {
      const medio = LADO_DE_CELDA / 2;
      const i0 = Math.max(CELDA_MINIMA, Math.floor((x - radio + medio) / LADO_DE_CELDA));
      const i1 = Math.min(CELDA_MAXIMA, Math.floor((x + radio + medio) / LADO_DE_CELDA));
      const j0 = Math.max(CELDA_MINIMA, Math.floor((z - radio + medio) / LADO_DE_CELDA));
      const j1 = Math.min(CELDA_MAXIMA, Math.floor((z + radio + medio) / LADO_DE_CELDA));
      let n = cuantos;
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const lista = reparto.porCelda[indiceDeCelda(i, j)] as readonly number[];
          for (let q = 0; q < lista.length; q++) {
            const k = lista[q] as number;
            if (marcadas[k] === tanda) continue;
            const c = reparto.cuadrillas[k];
            if (c === undefined) continue;
            /* Una vuelta cuya caja queda más lejos que el radio no tiene a nadie dentro: ni se escribe. */
            const fx = Math.max(c.caja.x0 - x, 0, x - c.caja.x1);
            const fz = Math.max(c.caja.z0 - z, 0, z - c.caja.z1);
            if (fx * fx + fz * fz > radio * radio) continue;
            marcadas[k] = tanda;
            for (let p = 0; p < c.miembros && n < salida.length; p++) salida[n++] = c.primero + p;
          }
        }
      }
      return n;
    },
    nuevaMarca() {
      tanda++;
    },
    aspecto(i) {
      const a = aspectoDelDurmienteEnLaCiudad(noche, i);
      return { cuerpo: a.cuerpo, ropa: a.ropa, paraguas: a.paraguas };
    },
    pasoPorTic(i) {
      const d = reparto.durmientes[i];
      if (d === undefined) return 0;
      return guionDeLaCuadrillaEnLaCiudad(noche, d.cuadrilla)?.cuadrilla.paso ?? 0;
    },
    masCercano(tic, x, z, excluidos) {
      return durmienteMasCercanoEnLaCiudad(noche, tic, x, z, excluidos);
    },
  };
  GENTE_DE_LA_CIUDAD.set(noche, gente);
  return gente;
}

/**
 * LO QUE LA FUENTE DE CUERPOS DEL JUEGO PUEDE DECIR ADEMÁS: la gente de la noche. `FuenteDeCuerpos`
 * (`cuerpos.ts`, frontera de otro frente) aún no lo tiene; el juego (`red/partida.ts`) lo da, y los
 * personajes lo miran si está. Sin él —el banco de los personajes, el barrio de hoy— sale del barrio.
 */
export interface FuenteConGente {
  genteDeLaNoche(): GenteDeLaNoche | null;
}

/** La gente que pintar: la que diga la fuente si la da; si no, la del barrio (o nadie sin barrio). */
export function genteDeLaFuente(fuente: FuenteDeCuerpos, barrio: Barrio | null): GenteDeLaNoche | null {
  const f = fuente as FuenteDeCuerpos & Partial<FuenteConGente>;
  if (typeof f.genteDeLaNoche === 'function') {
    const g = f.genteDeLaNoche();
    if (g !== null) return g;
  }
  return barrio === null ? null : genteDelBarrio(barrio);
}

/* ═══════════════════════════════ LA MULTITUD ═══════════════════════════════ */

/** Cuántos posibles se miran como mucho al elegir: las cuadrillas de 5 × 5 celdas y los de seis jugadores. */
const POSIBLES_COMO_MUCHO = 2048;

/**
 * El estado de la multitud entre fotogramas. Todo en arrays: ni un objeto por cabeza. Los de cada
 * durmiente van por su índice (del tamaño de la gente de la noche); `lista` dice cuáles se pintan.
 */
export interface Multitud {
  /** Sitio del guion interpolado, en metros (sin apartarse). */
  x: Float64Array;
  z: Float64Array;
  /** Lo que se aparta ahora, en metros. */
  apartX: Float64Array;
  apartZ: Float64Array;
  /** Hacia dónde mira, suavizado (convenio de `cuerpos.ts`: 0 al norte, creciendo al este). */
  rumbo: Float64Array;
  /** Peso de andar (0 parado, 1 andando), fundido. */
  andando: Float64Array;
  /** Fase del paso y del reposo (0 a 1). */
  faseAndar: Float64Array;
  faseReposo: Float64Array;
  /** Metros por segundo del paso de su cuadrilla (NaN: aún no se ha mirado). */
  rapidez: Float64Array;
  /** 1 si se pinta: está en la lista y no es Prestado ahora. */
  visible: Uint8Array;
  /** 1 si está en la lista (para la histéresis y el comprobador). */
  enLaLista: Uint8Array;
  /** El fotograma (`vuelta`) en que se pintó por última vez: quien no se pintó en el anterior empieza de cero. */
  vistoEn: Int32Array;
  /** LOS QUE SE PINTAN: sus índices, los `cuantos` primeros; en la ciudad, por (candidato, distancia, índice). */
  readonly lista: Int32Array;
  cuantos: number;
  /** Guion de los de la lista en el tic entero y en el siguiente (x, z, rumbo, anda en Q16.16). */
  readonly plano: Int32Array;
  readonly siguiente: Int32Array;
  /** Ya se colocó una vez (el primer fotograma no funde nada, y la primera lista no tiene histéresis). */
  iniciada: boolean;
  gente: GenteDeLaNoche | null;
  /**
   * El tic entero de `plano` (NaN si ninguno). El guion sólo cambia de tic en tic (cada 50 ms, unos tres
   * fotogramas): se elige y se lee cuando cambia.
   */
  ticDelPlano: number;
  /** El tic entero de la última elección (NaN si ninguna). */
  ticDeLaEleccion: number;
  /** El contador de fotogramas. */
  vuelta: number;
  /* Lo de elegir, preparado: los posibles, sus sitios, su nota y el puesto de cada elegido. */
  readonly posibles: Int32Array;
  readonly sitios: Int32Array;
  readonly notas: Float64Array;
  readonly grupos: Uint8Array;
  readonly puestos: Int32Array;
}

type PorDurmiente = Pick<Multitud, 'x' | 'z' | 'apartX' | 'apartZ' | 'rumbo' | 'andando' | 'faseAndar' | 'faseReposo' | 'rapidez' | 'visible' | 'enLaLista' | 'vistoEn'>;

function porDurmiente(total: number): PorDurmiente {
  return {
    x: new Float64Array(total),
    z: new Float64Array(total),
    apartX: new Float64Array(total),
    apartZ: new Float64Array(total),
    rumbo: new Float64Array(total),
    andando: new Float64Array(total),
    faseAndar: new Float64Array(total),
    faseReposo: new Float64Array(total),
    rapidez: new Float64Array(total).fill(Number.NaN),
    visible: new Uint8Array(total),
    enLaLista: new Uint8Array(total),
    vistoEn: new Int32Array(total).fill(-2),
  };
}

export function crearLaMultitud(): Multitud {
  return {
    ...porDurmiente(DURMIENTES),
    lista: new Int32Array(DURMIENTES_PINTADOS_COMO_MUCHO),
    cuantos: 0,
    plano: new Int32Array(DURMIENTES_PINTADOS_COMO_MUCHO * 4),
    siguiente: new Int32Array(DURMIENTES_PINTADOS_COMO_MUCHO * 4),
    iniciada: false,
    gente: null,
    ticDelPlano: Number.NaN,
    ticDeLaEleccion: Number.NaN,
    vuelta: 0,
    posibles: new Int32Array(POSIBLES_COMO_MUCHO),
    sitios: new Int32Array(POSIBLES_COMO_MUCHO * 4),
    notas: new Float64Array(POSIBLES_COMO_MUCHO),
    grupos: new Uint8Array(POSIBLES_COMO_MUCHO),
    puestos: new Int32Array(DURMIENTES_PINTADOS_COMO_MUCHO),
  };
}

/**
 * El tic con que se pintan los durmientes: el de la sala, retrasado lo que el Remanso tenga acumulado
 * (`ahora − presentado(ahora)`, en ms). Con reloj propio (`presentado` la identidad), el de la sala.
 */
export function ticPintado(ticDeLaSala: number, ahoraMs: number, presentadoMs: number): number {
  return ticDeLaSala - Math.max(0, ahoraMs - presentadoMs) / MS_POR_TIC;
}

/** Un cuerpo del que apartarse (los desvelados y los NPC de este fotograma), o un sitio, en metros. */
export interface Obstaculo {
  readonly x: number;
  readonly z: number;
}

/** Desde dónde elige la multitud a quién pinta: el centro (el propio o la cámara) y los jugadores. */
export interface MiradaDeLaMultitud {
  readonly centro: Obstaculo;
  /** Los desvelados con cuerpo (el propio incluido): sus candidatos a Prestado se pintan siempre. */
  readonly jugadores: readonly Obstaculo[];
}

/** Sin mirada (el banco de siempre): desde el centro de la plaza, y sin jugadores. */
const MIRADA_DEL_CENTRO: MiradaDeLaMultitud = { centro: { x: 0, z: 0 }, jugadores: [] };

/** Cambia la gente: los arrays de cada durmiente, del tamaño nuevo, y se olvida lo pintado. */
function ponerLaGente(m: Multitud, gente: GenteDeLaNoche): void {
  m.gente = gente;
  m.iniciada = false;
  m.ticDelPlano = Number.NaN;
  m.ticDeLaEleccion = Number.NaN;
  m.cuantos = 0;
  if (m.x.length !== gente.total) Object.assign(m, porDurmiente(gente.total));
  else {
    m.rapidez.fill(Number.NaN);
    m.vistoEn.fill(-2);
    m.enLaLista.fill(0);
    m.visible.fill(0);
  }
}

/** ¿Va el posible `a` antes que el `b`? Candidatos primero, luego la nota (distancia), luego el índice. */
function antes(m: Multitud, a: number, b: number): boolean {
  const ga = m.grupos[a] as number;
  const gb = m.grupos[b] as number;
  if (ga !== gb) return ga < gb;
  const na = m.notas[a] as number;
  const nb = m.notas[b] as number;
  if (na !== nb) return na < nb;
  return (m.posibles[a] as number) < (m.posibles[b] as number);
}

/**
 * ELIGE LOS QUE SE PINTAN en el tic entero `tic` y deja sus sitios de ese tic en `m.plano`, en el orden de
 * `m.lista`. En el barrio, los 48 en su orden. En la ciudad, lo de la cabecera.
 */
export function elegirLosQueSePintan(m: Multitud, gente: GenteDeLaNoche, tic: number, mirada: MiradaDeLaMultitud): void {
  const posibles = m.posibles;
  gente.nuevaMarca();
  if (gente.todos) {
    const cuantos = Math.min(gente.posibles(0, 0, 0, posibles, 0), m.lista.length);
    for (let k = 0; k < cuantos; k++) m.lista[k] = posibles[k] as number;
    m.cuantos = cuantos;
    m.enLaLista.fill(0);
    for (let k = 0; k < cuantos; k++) m.enLaLista[m.lista[k] as number] = 1;
    gente.escribir(tic, m.lista, cuantos, m.plano);
    return;
  }
  const radio = RADIO_DE_LO_QUE_SE_PINTA;
  const candidatos = RADIO_DE_LOS_CANDIDATOS + MARGEN_DE_LOS_CANDIDATOS_M;
  const c = mirada.centro;
  let n = gente.posibles(c.x, c.z, radio, posibles, 0);
  for (const j of mirada.jugadores) {
    if (Math.abs(j.x - c.x) > radio + candidatos || Math.abs(j.z - c.z) > radio + candidatos) continue;
    n = gente.posibles(j.x, j.z, candidatos, posibles, n);
  }
  gente.escribir(tic, posibles, n, m.sitios);
  /*
   * La nota de cada posible: su distancia al centro al cuadrado, exacta en Q16.16 (como
   * `durmientesCercaEnLaCiudad`: las diferencias no pasan de 2^26 y los cuadrados caben en 2^53). Grupo 0
   * los candidatos de algún jugador, 1 los demás a 90 m o menos, 2 lo que no se pinta.
   */
  const r2 = radio * UNO * (radio * UNO);
  const rc2 = candidatos * UNO * (candidatos * UNO);
  const cx = Math.round(c.x * UNO);
  const cz = Math.round(c.z * UNO);
  let dentro = 0;
  for (let k = 0; k < n; k++) {
    const o = k * 4;
    m.grupos[k] = 2;
    if ((m.sitios[o + 3] as number) < 0) continue;
    const x = m.sitios[o] as number;
    const z = m.sitios[o + 1] as number;
    const d = (x - cx) * (x - cx) + (z - cz) * (z - cz);
    let candidato = false;
    for (const j of mirada.jugadores) {
      const jx = Math.round(j.x * UNO);
      const jz = Math.round(j.z * UNO);
      if ((x - jx) * (x - jx) + (z - jz) * (z - jz) <= rc2) {
        candidato = true;
        break;
      }
    }
    if (!candidato && d > r2) continue;
    m.grupos[k] = candidato ? 0 : 1;
    m.notas[k] = d;
    dentro++;
  }
  const tope = Math.min(DURMIENTES_QUE_SE_PINTAN, m.lista.length);
  /* La histéresis: sólo con la lista a rebosar, y nunca en la primera. */
  if (dentro > tope && m.iniciada) {
    for (let k = 0; k < n; k++) {
      if (m.grupos[k] !== 1 || m.enLaLista[posibles[k] as number] !== 1) continue;
      const metros = Math.max(0, Math.sqrt(m.notas[k] as number) / UNO - HISTERESIS_DE_LA_LISTA_M);
      m.notas[k] = metros * UNO * (metros * UNO);
    }
  }
  /* Los `tope` primeros, insertando en orden: sin ordenar a todos ni asignar. */
  const puestos = m.puestos;
  let cuantos = 0;
  for (let k = 0; k < n; k++) {
    if (m.grupos[k] === 2) continue;
    let pos = cuantos;
    while (pos > 0 && antes(m, k, puestos[pos - 1] as number)) pos--;
    if (pos >= tope) continue;
    if (cuantos < tope) cuantos++;
    for (let q = cuantos - 1; q > pos; q--) puestos[q] = puestos[q - 1] as number;
    puestos[pos] = k;
  }
  m.cuantos = cuantos;
  m.enLaLista.fill(0);
  for (let q = 0; q < cuantos; q++) {
    const k = puestos[q] as number;
    const i = posibles[k] as number;
    m.lista[q] = i;
    m.enLaLista[i] = 1;
    m.plano[q * 4] = m.sitios[k * 4] as number;
    m.plano[q * 4 + 1] = m.sitios[k * 4 + 1] as number;
    m.plano[q * 4 + 2] = m.sitios[k * 4 + 2] as number;
    m.plano[q * 4 + 3] = m.sitios[k * 4 + 3] as number;
  }
}

/**
 * MUEVE LA MULTITUD al tic `tic` (con decimales), `dtMs` después del fotograma anterior. `prestados` no se
 * pintan. `zancadaAndar` es la del clip de pasear de cada uno (un número para todos, o por durmiente: la
 * mujer da pasos más cortos) y `duracionReposoMs` la del reposo (del manifiesto). `mirada`: desde dónde se
 * elige a quién pintar en la ciudad (en el barrio se pintan todos).
 */
export function moverLaMultitud(
  m: Multitud,
  gente: GenteDeLaNoche,
  tic: number,
  dtMs: number,
  prestados: ReadonlySet<number>,
  obstaculos: readonly Obstaculo[],
  zancadaAndar: number | ((i: number) => number),
  duracionReposoMs: number,
  mirada: MiradaDeLaMultitud = MIRADA_DEL_CENTRO,
): void {
  if (m.gente !== gente) ponerLaGente(m, gente);
  const base = Math.floor(tic);
  const f = tic - base;
  if (base !== m.ticDelPlano) {
    /* Otra elección si toca (o si el tic saltó); si no, el siguiente de antes es el plano de ahora. */
    if (!m.iniciada || base !== m.ticDelPlano + 1 || !(base - m.ticDeLaEleccion < TICS_ENTRE_ELECCIONES)) {
      elegirLosQueSePintan(m, gente, base, mirada);
      m.ticDeLaEleccion = base;
    } else m.plano.set(m.siguiente);
    gente.escribir(base + 1, m.lista, m.cuantos, m.siguiente);
    m.ticDelPlano = base;
  }
  const dt = Math.max(0, Math.min(250, dtMs));
  const vuelta = ++m.vuelta;
  for (let q = 0; q < m.cuantos; q++) {
    const i = m.lista[q] as number;
    const primera = !m.iniciada || (m.vistoEn[i] as number) !== vuelta - 1;
    m.vistoEn[i] = vuelta;
    if (Number.isNaN(m.rapidez[i] as number)) m.rapidez[i] = ((gente.pasoPorTic(i) / UNO) * 1000) / MS_POR_TIC;
    const ax = (m.plano[q * 4] as number) / UNO;
    const az = (m.plano[q * 4 + 1] as number) / UNO;
    const bx = (m.siguiente[q * 4] as number) / UNO;
    const bz = (m.siguiente[q * 4 + 1] as number) / UNO;
    const salta = Math.abs(bx - ax) > SALTO_M || Math.abs(bz - az) > SALTO_M || (m.siguiente[q * 4 + 3] as number) < 0;
    m.x[i] = salta ? ax : ax + (bx - ax) * f;
    m.z[i] = salta ? az : az + (bz - az) * f;
    m.visible[i] = prestados.has(i) ? 0 : 1;

    /* El rumbo del guion (0-255, el de la tabla de 256 rumbos) en radianes, girado sin saltos. */
    const objetivo = (((m.plano[q * 4 + 2] as number) & 255) / 256) * Math.PI * 2;
    if (primera) m.rumbo[i] = objetivo;
    else {
      const falta = normalizarAngulo(objetivo - (m.rumbo[i] as number));
      const paso = (GIRO_COMO_MUCHO * dt) / 1000;
      m.rumbo[i] = normalizarAngulo((m.rumbo[i] as number) + Math.max(-paso, Math.min(paso, falta)));
    }

    /* Andar o no: fundido de 0,3 s. */
    const anda = m.plano[q * 4 + 3] === 1 ? 1 : 0;
    if (primera) m.andando[i] = anda;
    else {
      const p = dt / FUNDIDO_DE_PARAR_MS;
      const a = m.andando[i] as number;
      m.andando[i] = anda > a ? Math.min(1, a + p) : Math.max(0, a - p);
    }
    const porTic = ((m.rapidez[i] as number) * MS_POR_TIC) / 1000;
    m.faseAndar[i] = faseDeAndar(tic, porTic, typeof zancadaAndar === 'number' ? zancadaAndar : zancadaAndar(i), i);
    const r = (tic * MS_POR_TIC) / Math.max(1, duracionReposoMs) + ((i * 0.3819660) % 1);
    m.faseReposo[i] = r - Math.floor(r);

    /* Apartarse de los cuerpos: hacia fuera, más cuanto más cerca, nunca más de medio metro. */
    let ox = 0;
    let oz = 0;
    for (const o of obstaculos) {
      const dx = (m.x[i] as number) - o.x;
      const dz = (m.z[i] as number) - o.z;
      /* Sin `Math.hypot`, que asigna en cada llamada (ver `distancia3` en `director.ts`). */
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d >= APARTARSE_DESDE_M) continue;
      const fuerza = ((APARTARSE_DESDE_M - d) / APARTARSE_DESDE_M) * APARTE_COMO_MUCHO_M;
      if (d < 1e-4) {
        /* Encima: hacia su derecha, por decidir algo que no dependa del azar. */
        ox += Math.cos(m.rumbo[i] as number) * fuerza;
        oz += Math.sin(m.rumbo[i] as number) * fuerza;
      } else {
        ox += (dx / d) * fuerza;
        oz += (dz / d) * fuerza;
      }
    }
    const largo = Math.sqrt(ox * ox + oz * oz);
    if (largo > APARTE_COMO_MUCHO_M) {
      ox *= APARTE_COMO_MUCHO_M / largo;
      oz *= APARTE_COMO_MUCHO_M / largo;
    }
    if (primera) {
      m.apartX[i] = ox;
      m.apartZ[i] = oz;
    } else {
      /* Se aparta a 2 m/s como mucho: un paso rápido de lado, no un salto. */
      const k = Math.min(1, (dt / 1000) * 6);
      m.apartX[i] = (m.apartX[i] as number) + (ox - (m.apartX[i] as number)) * k;
      m.apartZ[i] = (m.apartZ[i] as number) + (oz - (m.apartZ[i] as number)) * k;
      const l = Math.sqrt((m.apartX[i] as number) ** 2 + (m.apartZ[i] as number) ** 2);
      if (l > APARTE_COMO_MUCHO_M) {
        m.apartX[i] = ((m.apartX[i] as number) * APARTE_COMO_MUCHO_M) / l;
        m.apartZ[i] = ((m.apartZ[i] as number) * APARTE_COMO_MUCHO_M) / l;
      }
    }
  }
  /* Quien salió de la lista ya no se pinta. */
  if (!gente.todos) for (let i = 0; i < m.visible.length; i++) if (m.enLaLista[i] !== 1) m.visible[i] = 0;
  m.iniciada = true;
}

/**
 * LOS `k` DURMIENTES VISIBLES MÁS CERCANOS a (`x`, `z`), para darles esqueleto en N2 y N3. Escribe sus
 * índices en `salida` (reutilizada) por distancia, y a igual distancia el de índice menor.
 *
 * `preferidos` (los que ya llevan esqueleto) cuentan `margen` metros más cerca de lo que están: sin esa
 * histéresis, dos durmientes que se cruzan a la misma distancia se quitaban el esqueleto el uno al otro
 * en cada fotograma, y cada cambio es un cuerpo que se suelta y otro que se clona.
 */
export function durmientesMasCercanos(m: Multitud, x: number, z: number, k: number, salida: number[], preferidos: Uint8Array | null = null, margen = 0): number[] {
  salida.length = 0;
  if (k <= 0) return salida;
  for (let q = 0; q < m.cuantos; q++) {
    const i = m.lista[q] as number;
    if (m.visible[i] !== 1) continue;
    const di = distanciaPreferida(m, i, x, z, preferidos, margen);
    let pos = salida.length;
    while (pos > 0) {
      const j = salida[pos - 1] as number;
      const dj = distanciaPreferida(m, j, x, z, preferidos, margen);
      if (dj > di || (dj === di && j > i)) pos--;
      else break;
    }
    if (pos >= k) continue;
    /* Insertar en `pos` corriendo los de detrás (sin `splice`, que asigna la lista de lo quitado). */
    if (salida.length < k) salida.push(i);
    for (let p = salida.length - 1; p > pos; p--) salida[p] = salida[p - 1] as number;
    salida[pos] = i;
  }
  return salida;
}

function distanciaPreferida(m: Multitud, i: number, x: number, z: number, preferidos: Uint8Array | null, margen: number): number {
  const d = Math.sqrt(((m.x[i] as number) - x) ** 2 + ((m.z[i] as number) - z) ** 2);
  return preferidos !== null && preferidos[i] === 1 ? d - margen : d;
}
