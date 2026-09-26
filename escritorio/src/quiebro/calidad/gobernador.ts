/**
 * EL GOBERNADOR DE LA CALIDAD: baja deprisa, sube despacio y a prueba, y no vuelve a lo que ya falló.
 * Lógica PURA: sin `three`, sin React, sin reloj. Cada fotograma entra como una muestra y sale el
 * estado siguiente, así que el comprobador lo ejercita con series de tiempos inventadas en Node.
 *
 * ═══ LAS REGLAS (diseño §8, y el porqué de cada una) ═══
 *
 *   · SE MIRA EN VENTANAS DE 60 FOTOGRAMAS. Si la media de una ventana pasa de 22 ms (45 fps) el
 *     aparato va justo. 22 es el mismo umbral que el juez de la casa (`escenas/embarcadero/calidad.ts`).
 *   · ANTES DE BAJAR DE NIVEL, SE BAJA DE DPR dentro del nivel (`escaleraDeDpr`): perder un poco de
 *     nitidez se nota menos que perder la lluvia o las luces, y es la palanca que más píxeles ahorra.
 *     Sólo cuando el nivel ya está en su peldaño más bajo se baja al nivel de abajo.
 *   · UN NIVEL DEL QUE SE BAJA QUEDA MARCADO y no se vuelve a probar en esta noche: subir y bajar sin
 *     parar es peor que cualquiera de los dos niveles (cada cambio recompila sombreadores y da tirón).
 *   · SE SUBE A PRUEBA, tras 20 s SEGUIDOS con holgura: primero los peldaños de DPR que se perdieron,
 *     y luego el nivel de arriba empezando por SU peldaño más bajo. Mientras está a prueba, la primera
 *     ventana mala lo devuelve directamente al nivel de antes (sin pasar por sus peldaños) y lo marca.
 *   · LA HOLGURA NO SE PUEDE CRONOMETRAR con el reloj de fotograma: con la sincronía vertical, un
 *     aparato sobrado y uno justo dan los mismos 16,7 ms, y la casa ya tiene apuntado que el cronómetro de
 *     fotograma mintió con la máquina ocupada. Por eso la holgura exige DOS cosas: que
 *     la ventana no pierda fotogramas (media ≤ 18 ms: a 60 Hz, como mucho uno o dos saltos en 60) y que
 *     la escena CUENTE dentro de los topes de su nivel (`gl.info.render`: llamadas y triángulos). Si
 *     la escena ya se sale de lo que su nivel declara, subir sólo empeora las cosas: no se sube.
 *   · LA PESTAÑA OCULTA NO CUENTA. El navegador baja `requestAnimationFrame` a 1 Hz con la pestaña
 *     escondida, y el primer fotograma al volver trae en su tiempo todo lo que estuvo oculta. Las
 *     muestras ocultas se tiran, tiran la ventana a medias y la holgura acumulada, y el primer
 *     fotograma visible tras ellas también se tira.
 *   · TRAS CADA CAMBIO HAY GRACIA: los primeros fotogramas de un nivel nuevo compilan sombreadores y
 *     reservan blancos; juzgarlos sería castigar al nivel por el precio de llegar a él.
 *   · CADA FOTOGRAMA CUENTA COMO MUCHO 100 ms, como en `escenas/comun/arranque.ts`: un tirón de un
 *     segundo no debe valer por sesenta fotogramas malos.
 *
 * ═══ LO QUE NO HACE ═══
 *
 * No toca `three` ni el lienzo: dice qué nivel y qué DPR, y quien lo usa (`usar-el-nivel.ts`) los
 * aplica. Tampoco recuerda nada entre noches por sí mismo: `recuerdoDe` / `leerElRecuerdo` dan la
 * forma de guardarlo, y guardarlo o no es cosa del gancho.
 *
 * ═══ UN AVISO QUE QUEDA ABIERTO ═══
 *
 * Un iPhone en ahorro de batería pinta a 30 Hz (33 ms) aunque le sobre GPU: este gobernador lo bajará
 * hasta N0. Es el lado seguro —se juega igual, con menos adorno— y distinguir «tope de 30 Hz» de «no
 * llega» sin cronómetro de GPU sería adivinar. Si el banco en aparato lo pide, se añade aquí.
 */
import type { NivelDeCalidad } from './niveles';
import { TABLA_DE_NIVELES, escaleraDeDpr } from './niveles';

/** Fotogramas de cada ventana de juicio. */
export const FOTOGRAMAS_DE_LA_VENTANA = 60;
/** Media por encima de la cual la ventana es mala (45 fps). */
export const UMBRAL_DE_BAJADA_MS = 22;
/**
 * Media que baja de nivel AUNQUE el nivel esté quieto (en la pelea): por debajo de 25 fps no se juega, y el tirón de
 * recompilar una vez sale más barato que la oleada entera a saltos.
 */
export const UMBRAL_DE_DESPLOME_MS = 40;
/** Media por debajo de la cual la ventana tiene holgura (a 60 Hz, casi sin saltos). */
export const UMBRAL_DE_HOLGURA_MS = 18;
/** Cuánto tiempo seguido con holgura hace falta para subir un peldaño o probar el nivel de arriba. */
export const HOLGURA_PARA_SUBIR_MS = 20_000;
/** Cuánto dura la prueba de un nivel recién subido. */
export const DURACION_DE_LA_PRUEBA_MS = 10_000;
/** Fotogramas que no se juzgan tras cualquier cambio (compilar, reservar blancos). */
export const FOTOGRAMAS_DE_GRACIA = 30;
/** Lo más que cuenta un fotograma. */
export const LO_MAS_QUE_CUENTA_UN_FOTOGRAMA_MS = 100;
/**
 * Holgura contra el redondeo al sumar tiempos: sesenta fotogramas de 1000/60 ms suman 999,99… y no
 * 1000, y sin esto «20 s» serían 21 ventanas y «10 s de prueba», 11.
 */
const REDONDEO_MS = 1;

/** Un fotograma, tal como lo ve el gancho. */
export interface MuestraDelFotograma {
  /** Tiempo desde el fotograma anterior, en ms. */
  readonly ms: number;
  /** La pestaña estaba oculta (o la app en segundo plano): la muestra no dice nada del aparato. */
  readonly oculta: boolean;
  /** Llamadas de dibujo de la ESCENA en ese fotograma. */
  readonly llamadas: number;
  /** Triángulos de la escena en ese fotograma. */
  readonly triangulos: number;
  /**
   * En plena pelea el NIVEL no se cambia: cambiarlo recompila los sombreadores de todo lo que se ve y, con la caché
   * fría, congela la imagen varios segundos (medido el 26-sep: 3,7 s de hilo parado con la caché templada, al
   * salir de la plaza en la oleada). El DPR sí, que no recompila nada. Lo que el nivel pida se hace en la calma.
   */
  readonly nivelQuieto?: boolean;
}

export interface EstadoDelGobernador {
  readonly nivel: NivelDeCalidad;
  /** Índice en la escalera de DPR del nivel: 0 es el peldaño más alto. */
  readonly peldano: number;
  /** Por encima de esto no se sube (lo dice el sondeo). */
  readonly techo: NivelDeCalidad;
  /** El DPR nativo de la pantalla, para recortar las escaleras. */
  readonly dprDelAparato: number;
  /** Niveles de los que se ha bajado: no se vuelven a probar. */
  readonly fallidos: readonly NivelDeCalidad[];
  /** El nivel actual se subió a prueba y aún no la ha pasado. */
  readonly aPrueba: boolean;
  /** Tiempo que lleva superando la prueba (sólo con `aPrueba`). */
  readonly pruebaMs: number;
  /** Fotogramas que aún no se juzgan. */
  readonly gracia: number;
  /** El último fotograma era de pestaña oculta: el primero visible se tira. */
  readonly veniaDeOculta: boolean;
  /** La ventana en curso. */
  readonly ventanaMs: number;
  readonly ventanaFotogramas: number;
  readonly ventanaLlamadas: number;
  readonly ventanaTriangulos: number;
  /** Tiempo seguido con holgura. */
  readonly holguraMs: number;
  /** De la última ventana cerrada, para el banco y el diagnóstico. */
  readonly ultimaMediaMs: number | null;
  readonly ultimaSobreElTope: boolean;
}

export type MotivoDelCambio =
  | 'bajar-dpr'
  | 'bajar-nivel'
  | 'prueba-fallida'
  | 'subir-dpr'
  | 'subir-a-prueba'
  | 'prueba-superada';

/** Lo que cambió en este fotograma, si cambió algo que el gancho tenga que aplicar o contar. */
export interface CambioDelGobernador {
  readonly motivo: MotivoDelCambio;
  readonly de: { readonly nivel: NivelDeCalidad; readonly dpr: number };
  readonly a: { readonly nivel: NivelDeCalidad; readonly dpr: number };
  /** La media de la ventana que lo decidió. */
  readonly mediaMs: number;
}

export interface PasoDelGobernador {
  readonly estado: EstadoDelGobernador;
  readonly cambio: CambioDelGobernador | null;
}

export interface ArranqueDelGobernador {
  readonly inicial: NivelDeCalidad;
  readonly techo: NivelDeCalidad;
  readonly dprDelAparato: number;
}

/** Una ventana sin fotogramas. */
const VENTANA_VACIA = {
  ventanaMs: 0,
  ventanaFotogramas: 0,
  ventanaLlamadas: 0,
  ventanaTriangulos: 0,
} as const;

export function gobernadorNuevo(arranque: ArranqueDelGobernador): EstadoDelGobernador {
  const techo = arranque.techo;
  const nivel = arranque.inicial > techo ? techo : arranque.inicial;
  return {
    nivel,
    peldano: 0,
    techo,
    dprDelAparato: arranque.dprDelAparato,
    fallidos: [],
    aPrueba: false,
    pruebaMs: 0,
    gracia: FOTOGRAMAS_DE_GRACIA,
    veniaDeOculta: false,
    ...VENTANA_VACIA,
    holguraMs: 0,
    ultimaMediaMs: null,
    ultimaSobreElTope: false,
  };
}

/** El DPR que toca en este estado. */
export function dprDe(estado: EstadoDelGobernador): number {
  const escalera = escaleraDeDpr(estado.nivel, estado.dprDelAparato);
  return escalera[Math.min(estado.peldano, escalera.length - 1)] ?? escalera[0] ?? 1;
}

/** Un fotograma más. Devuelve el estado siguiente y, si cambió el nivel o el DPR, el cambio. */
export function gobernar(estado: EstadoDelGobernador, muestra: MuestraDelFotograma): PasoDelGobernador {
  /* ─ La pestaña oculta: nada de lo que pase aquí es del aparato. ─ */
  if (muestra.oculta) {
    return { estado: { ...estado, ...VENTANA_VACIA, veniaDeOculta: true, holguraMs: 0 }, cambio: null };
  }
  if (estado.veniaDeOculta) {
    /* El primer fotograma visible trae en su tiempo todo lo que estuvo escondida. */
    return { estado: { ...estado, veniaDeOculta: false }, cambio: null };
  }
  if (estado.gracia > 0) {
    return { estado: { ...estado, gracia: estado.gracia - 1 }, cambio: null };
  }

  const ms = Math.min(LO_MAS_QUE_CUENTA_UN_FOTOGRAMA_MS, Math.max(0, Number.isFinite(muestra.ms) ? muestra.ms : 0));
  const conEste: EstadoDelGobernador = {
    ...estado,
    ventanaMs: estado.ventanaMs + ms,
    ventanaFotogramas: estado.ventanaFotogramas + 1,
    ventanaLlamadas: Math.max(estado.ventanaLlamadas, muestra.llamadas),
    ventanaTriangulos: Math.max(estado.ventanaTriangulos, muestra.triangulos),
  };
  if (conEste.ventanaFotogramas < FOTOGRAMAS_DE_LA_VENTANA) return { estado: conEste, cambio: null };
  return cerrarLaVentana(conEste, muestra.nivelQuieto === true);
}

/** Juzga la ventana que se acaba de llenar. */
function cerrarLaVentana(e: EstadoDelGobernador, quieto: boolean): PasoDelGobernador {
  const media = e.ventanaMs / e.ventanaFotogramas;
  const tope = TABLA_DE_NIVELES[e.nivel].topes;
  const sobreElTope = e.ventanaLlamadas > tope.llamadas || e.ventanaTriangulos > tope.triangulos;
  const cerrada: EstadoDelGobernador = { ...e, ...VENTANA_VACIA, ultimaMediaMs: media, ultimaSobreElTope: sobreElTope };
  const antes = { nivel: e.nivel, dpr: dprDe(e) };

  /* ─ Ventana mala: se baja, deprisa. Con el nivel quieto, sólo el DPR, salvo que el juego se hunda. ─ */
  if (media > UMBRAL_DE_BAJADA_MS) {
    const sinNivel = quieto && media <= UMBRAL_DE_DESPLOME_MS;
    const sinHolgura: EstadoDelGobernador = { ...cerrada, holguraMs: 0 };
    if (e.aPrueba && e.nivel > 0 && !sinNivel) {
      /* A prueba no hay peldaños: se vuelve al nivel de antes, en el peldaño alto que ya tenía. */
      const siguiente = conCambio(sinHolgura, (e.nivel - 1) as NivelDeCalidad, 0, marcar(e.fallidos, e.nivel));
      return { estado: siguiente, cambio: { motivo: 'prueba-fallida', de: antes, a: aDonde(siguiente), mediaMs: media } };
    }
    const escalera = escaleraDeDpr(e.nivel, e.dprDelAparato);
    if (e.peldano < escalera.length - 1) {
      const siguiente = conCambio(sinHolgura, e.nivel, e.peldano + 1, e.fallidos);
      return { estado: siguiente, cambio: { motivo: 'bajar-dpr', de: antes, a: aDonde(siguiente), mediaMs: media } };
    }
    if (e.nivel > 0 && !sinNivel) {
      const siguiente = conCambio(sinHolgura, (e.nivel - 1) as NivelDeCalidad, 0, marcar(e.fallidos, e.nivel));
      return { estado: siguiente, cambio: { motivo: 'bajar-nivel', de: antes, a: aDonde(siguiente), mediaMs: media } };
    }
    /* N0 en su peldaño más bajo (o el nivel quieto): no hay más palanca. Se sigue midiendo por si alguien pregunta. */
    return { estado: sinHolgura, cambio: null };
  }

  /* ─ Ventana aceptable. Si el nivel estaba a prueba, esta ventana cuenta para pasarla. ─ */
  let seguida: EstadoDelGobernador = cerrada;
  let superada = false;
  if (e.aPrueba) {
    const pruebaMs = e.pruebaMs + e.ventanaMs;
    superada = pruebaMs + REDONDEO_MS >= DURACION_DE_LA_PRUEBA_MS;
    seguida = { ...seguida, pruebaMs: superada ? 0 : pruebaMs, aPrueba: !superada };
  }

  const conHolgura = media <= UMBRAL_DE_HOLGURA_MS && !sobreElTope;
  if (!conHolgura) {
    const siguiente = { ...seguida, holguraMs: 0 };
    return { estado: siguiente, cambio: superada ? superadaDe(antes, media) : null };
  }

  const holguraMs = seguida.holguraMs + e.ventanaMs;
  if (holguraMs + REDONDEO_MS < HOLGURA_PARA_SUBIR_MS || seguida.aPrueba) {
    /* Mientras está a prueba no se sube nada más: primero que la pase. */
    const siguiente = { ...seguida, holguraMs: Math.min(holguraMs, HOLGURA_PARA_SUBIR_MS) };
    return { estado: siguiente, cambio: superada ? superadaDe(antes, media) : null };
  }

  /* ─ 20 s seguidos con holgura: primero el DPR perdido, luego el nivel de arriba si no falló. ─ */
  if (seguida.peldano > 0) {
    const siguiente = conCambio({ ...seguida, holguraMs: 0 }, e.nivel, seguida.peldano - 1, seguida.fallidos);
    return { estado: siguiente, cambio: { motivo: 'subir-dpr', de: antes, a: aDonde(siguiente), mediaMs: media } };
  }
  const arriba = e.nivel + 1;
  if (arriba <= e.techo && !seguida.fallidos.includes(arriba as NivelDeCalidad) && !quieto) {
    const nivelDeArriba = arriba as NivelDeCalidad;
    const peldanoBajo = escaleraDeDpr(nivelDeArriba, e.dprDelAparato).length - 1;
    const siguiente: EstadoDelGobernador = {
      ...conCambio({ ...seguida, holguraMs: 0 }, nivelDeArriba, peldanoBajo, seguida.fallidos),
      aPrueba: true,
      pruebaMs: 0,
    };
    return { estado: siguiente, cambio: { motivo: 'subir-a-prueba', de: antes, a: aDonde(siguiente), mediaMs: media } };
  }
  /* Arriba del todo, o el de arriba ya falló: la holgura se queda llena y no pasa nada. */
  return { estado: { ...seguida, holguraMs: HOLGURA_PARA_SUBIR_MS }, cambio: superada ? superadaDe(antes, media) : null };
}

function conCambio(
  e: EstadoDelGobernador,
  nivel: NivelDeCalidad,
  peldano: number,
  fallidos: readonly NivelDeCalidad[],
): EstadoDelGobernador {
  return { ...e, nivel, peldano, fallidos, aPrueba: false, pruebaMs: 0, gracia: FOTOGRAMAS_DE_GRACIA };
}

function marcar(fallidos: readonly NivelDeCalidad[], nivel: NivelDeCalidad): readonly NivelDeCalidad[] {
  return fallidos.includes(nivel) ? fallidos : [...fallidos, nivel];
}

function aDonde(e: EstadoDelGobernador): { readonly nivel: NivelDeCalidad; readonly dpr: number } {
  return { nivel: e.nivel, dpr: dprDe(e) };
}

function superadaDe(donde: { readonly nivel: NivelDeCalidad; readonly dpr: number }, media: number): CambioDelGobernador {
  return { motivo: 'prueba-superada', de: donde, a: donde, mediaMs: media };
}

/* ─────────────────────────────── El recuerdo por aparato ─────────────────────────────── */

/**
 * Lo que se guarda entre noches: el último nivel que AGUANTÓ en este aparato (superó su prueba o
 * era el de arranque y no bajó), y con qué gráfica. NO se guardan los fallidos: un tirón pasajero
 * —el aparato caliente, otra pestaña trabajando— no debe vetar un nivel para siempre. Sirve para que
 * un aparato que el sondeo sobrestima no pague cada noche los segundos de tirones hasta bajar.
 */
export interface RecuerdoDelAparato {
  readonly v: 1;
  readonly nivel: NivelDeCalidad;
  /** Si la gráfica cambia (portátil con dos), el recuerdo no vale. */
  readonly grafica: string;
}

/** La llave del almacén del navegador. Es por aparato (el almacén es por origen), no por cliente. */
export const LLAVE_DEL_RECUERDO = 'quiebro.aparato.nivel';

export function recuerdoDe(nivel: NivelDeCalidad, grafica: string): RecuerdoDelAparato {
  return { v: 1, nivel, grafica };
}

/** Lector estricto: cualquier forma inesperada es `null`, nunca un nivel inventado. */
export function leerElRecuerdo(crudo: unknown): RecuerdoDelAparato | null {
  let valor: unknown = crudo;
  if (typeof crudo === 'string') {
    try {
      valor = JSON.parse(crudo) as unknown;
    } catch {
      return null;
    }
  }
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return null;
  const r = valor as Record<string, unknown>;
  if (Object.keys(r).length !== 3 || r['v'] !== 1 || typeof r['grafica'] !== 'string') return null;
  const nivel = r['nivel'];
  if (nivel !== 0 && nivel !== 1 && nivel !== 2 && nivel !== 3) return null;
  return { v: 1, nivel, grafica: r['grafica'] };
}

/**
 * El arranque con el recuerdo encima: si la gráfica es la misma, se empieza en lo que aguantó la
 * última vez, pero NUNCA por encima del techo de hoy (el sondeo de hoy manda sobre el de ayer) y NUNCA
 * más de un nivel por debajo de lo que dice el sondeo de hoy.
 *
 * Ese «un nivel como mucho» es por una RTX 4070 SUPER que arrancaba cada noche en N0: su recuerdo decía
 * N0, aprendido con el panel del navegador oculto (los fotogramas frenados a 1 Hz sin que la página se
 * diera por oculta), y desde N0 el gobernador tarda más de un minuto en subir, a 20 s por peldaño. El
 * recuerdo sirve para ahorrarle a un aparato que el sondeo sobrestima los tirones de la primera bajada,
 * y para eso basta un nivel; lo que no puede es borrar lo que el aparato es.
 */
export function arranqueConRecuerdo(
  inicial: NivelDeCalidad,
  techo: NivelDeCalidad,
  grafica: string,
  recuerdo: RecuerdoDelAparato | null,
): NivelDeCalidad {
  if (recuerdo === null || recuerdo.grafica !== grafica) return inicial;
  const suelo = inicial > 0 ? ((inicial - 1) as NivelDeCalidad) : inicial;
  const nivel = recuerdo.nivel < suelo ? suelo : recuerdo.nivel;
  return nivel > techo ? techo : nivel;
}

/**
 * La media de ventana a partir de la cual una bajada NO se recuerda: 90 ms es menos de 11 fotogramas
 * por segundo, casi todos contados con el tope de 100. Eso no es una gráfica que no llega: es
 * `requestAnimationFrame` frenado (un panel oculto, una ventana tapada, la app en segundo plano sin que
 * la página lo diga). La bajada se hace igual —esta noche va a lo seguro—, pero no se guarda para la
 * siguiente.
 */
export const MEDIA_DE_FOTOGRAMAS_FRENADOS_MS = 90;

/** ¿Se guarda este cambio como el recuerdo del aparato? */
export function seRecuerda(cambio: CambioDelGobernador): boolean {
  if (cambio.motivo === 'prueba-superada') return true;
  if (cambio.motivo === 'bajar-nivel' || cambio.motivo === 'prueba-fallida') return cambio.mediaMs < MEDIA_DE_FOTOGRAMAS_FRENADOS_MS;
  return false;
}
