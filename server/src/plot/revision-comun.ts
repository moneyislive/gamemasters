/**
 * El motor de la revisión adversaria, el mismo para todos los juegos de velada.
 *
 * Nació en CLUEDO (`cluedo-revision.ts`) y se sacó aquí cuando hubo que darle
 * revisor a la Momia, a las Sombras y al Nudo: lo que cambia de un juego a otro
 * es QUÉ se cuenta, QUIÉN lee y QUÉ se corrige, no el orden en que se hace. Ese
 * orden es este:
 *
 *   1. La AUDITORÍA cuenta, con código, lo que se puede contar. No cuesta nada.
 *   2. Un LECTOR que no conoce la solución lee la noche momento a momento, con lo
 *      que la mesa sabe en cada uno. En CLUEDO es el detective; un juego sin nada
 *      que adivinar a ciegas no tiene lector.
 *   3. El REVISOR, que sí la conoce, lee todo lo anterior y reescribe.
 *   4. Se vuelve a auditar y a leer SOBRE LO CORREGIDO: un arreglo puede abrir
 *      otra grieta, y eso solo se ve mirando otra vez.
 *   5. Si queda algo bloqueante, una segunda pasada. No hay tercera: el coste de
 *      una velada tiene que tener techo.
 *
 * Cada juego pone sus piezas en un `AdaptadorDeRevision`. Todo lo demás —el
 * bucle, la conversación con el revisor en dos turnos, las lecturas en paralelo
 * y el juicio de «a quién señala la mesa»— vive aquí una sola vez.
 *
 * ═══ NUNCA TIRA LA TRAMA ═══
 *
 * Si algo falla a medias, se entrega la mejor versión que haya y el informe dice
 * qué no se pudo hacer. Una trama sin revisar es peor que una revisada; una
 * velada sin trama es peor que las dos.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type {
  GameSession,
  GenerateStreamEvent,
  GravedadDeHallazgo,
  HallazgoDeRevision,
  InformeDeRevision,
  ModelId,
  Plot,
} from '../../../shared/types';
import { esfuerzoPara, getAnthropicClient, resolveModel, streamDeGeneracion, textoDe } from '../agent/anthropic';
import type { AlcanceDeRevision } from '../juegos/revisores';
import { apuntarUso } from '../gasto/contador';
import { emisorDeProgreso } from '../live/proyeccion';

type Emitir = (evento: GenerateStreamEvent) => void;

// ---------------------------------------------------------------------------
// Lo que devuelven el revisor y el lector
// ---------------------------------------------------------------------------

export interface HallazgoDelRevisor {
  codigo: string;
  gravedad: GravedadDeHallazgo;
  sobre: string;
  problema: string;
  arreglo: string;
}

export interface RespuestaDelRevisor<C> {
  diagnostico: string;
  hallazgos: HallazgoDelRevisor[];
  cambios: C;
  resumenDeCambios: string[];
}

/** Una lectura del lector ciego en un momento de la noche. `reparto`, normalizado (suma 1). */
export interface LecturaDeMomento {
  momento: number;
  reparto: Record<string, number>;
  razon: string;
  /** Lo que le basta por sí solo para señalar a alguien; vacío si combinó varias cosas. */
  pistaDecisiva: string;
  cadena: string[];
}

export interface InformesParaElRevisor {
  auditoria: string;
  lecturas: string;
  hallazgos: HallazgoDeRevision[];
}

export interface OpcionesDeLaPasada {
  soloMaterial: boolean;
  pasada: number;
}

/** Las piezas de un juego. Ver la cabecera. */
export interface AdaptadorDeRevision<C, L extends LecturaDeMomento = LecturaDeMomento> {
  /** Cuántas rondas tiene la noche: el lector lee los momentos 0..rondas. */
  rondas(plot: Plot): number;
  /** Lo que se le enseña a quien espera, con la voz del juego. */
  etiquetas: { contar: string; leer?: string; revisar: string; segunda: string; comprobar: string };
  auditar(game: GameSession, plot: Plot): { hallazgos: HallazgoDeRevision[]; texto: string };
  lector?: {
    leer(game: GameSession, plot: Plot, model: ModelId, emit: Emitir, momentos?: number[]): Promise<{ lecturas: L[]; hallazgos: HallazgoDeRevision[] }>;
    juzgar(game: GameSession, plot: Plot, lecturas: L[], rondas: number): HallazgoDeRevision[];
    enTexto(game: GameSession, plot: Plot, lecturas: L[]): string;
  };
  revisar(
    game: GameSession,
    plot: Plot,
    model: ModelId,
    informes: InformesParaElRevisor,
    opciones: OpcionesDeLaPasada,
    emit: Emitir,
  ): Promise<RespuestaDelRevisor<C>>;
  parchear(game: GameSession, plot: Plot, cambios: C, soloMaterial: boolean): { plot: Plot; aplicados: string[]; rechazados: string[] };
}

// ---------------------------------------------------------------------------
// El bucle
// ---------------------------------------------------------------------------

/** Cuántas veces reescribe el revisor como mucho. */
export const PASADAS_MAXIMAS = 2;

const clave = (h: HallazgoDeRevision) => `${h.codigo}|${h.sobre ?? ''}`;

/**
 * Lo que obliga a OTRA pasada: solo lo bloqueante.
 *
 * La primera pasada va siempre. La segunda costó 1,2 $ de los 4,09 $ de la
 * primera velada completa contra la API (25-sep-2026), y la pedían avisos
 * graves que el taller ya enseña. Eso se le dice al Game Master; otra vuelta
 * del revisor se paga solo si queda algo que rompe la noche.
 */
export function hayQueCorregir(hallazgos: HallazgoDeRevision[]): boolean {
  return hallazgos.some((h) => h.gravedad === 'bloqueante');
}

export function veredictoDe(pendientes: HallazgoDeRevision[]): InformeDeRevision['veredicto'] {
  if (pendientes.some((h) => h.gravedad === 'bloqueante')) return 'no-apta';
  if (pendientes.some((h) => h.gravedad === 'grave')) return 'apta-con-avisos';
  return 'apta';
}

/** Sin repetidos: el mismo aviso visto por dos caminos es un aviso. */
export function sinRepetir(hallazgos: HallazgoDeRevision[]): HallazgoDeRevision[] {
  const vistos = new Set<string>();
  return hallazgos.filter((h) => {
    const k = clave(h);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

/**
 * Qué momentos hay que volver a leer después de corregir: los que avisaron de
 * algo, el principio —las correcciones suelen tocar lo público— y el final, que
 * es el que dice si sigue habiendo solución.
 */
export function momentosARevisar(rondas: number, hallazgos: HallazgoDeRevision[]): number[] {
  const momentos = new Set<number>([0, rondas]);
  for (const h of hallazgos) {
    const m = /^momento-(\d+)$/.exec(h.sobre ?? '');
    if (m) momentos.add(Number(m[1]));
  }
  if (rondas > 2) momentos.add(1);
  return [...momentos].sort((a, b) => a - b);
}

/** Revisa una trama con las piezas de su juego. Devuelve la mejor versión y su informe. */
export async function ejecutarRevision<C, L extends LecturaDeMomento>(
  adaptador: AdaptadorDeRevision<C, L>,
  game: GameSession,
  plotEntrante: Plot,
  emit: Emitir,
  alcance: AlcanceDeRevision,
): Promise<{ plot: Plot; informe: InformeDeRevision }> {
  const soloMaterial = alcance === 'material';
  const rondas = adaptador.rondas(plotEntrante);
  let plot = plotEntrante;

  emit({ type: 'stage', stage: 'revision', label: adaptador.etiquetas.contar });
  let auditoria = adaptador.auditar(game, plot);
  const hallazgosIniciales: HallazgoDeRevision[] = [...auditoria.hallazgos];

  // Sin modelo, la auditoría es todo lo que hay.
  if (!getAnthropicClient()) {
    return {
      plot,
      informe: {
        veredicto: veredictoDe(auditoria.hallazgos),
        pasadas: 0,
        hallazgos: auditoria.hallazgos,
        cambios: [],
        revisadaEl: new Date().toISOString(),
      },
    };
  }

  const model = await resolveModel(game);
  const cambios: string[] = [];
  const delRevisor: HallazgoDeRevision[] = [];
  let pasadas = 0;
  let error: string | undefined;

  const lector = adaptador.lector;
  let lecturasAntes: L[] = [];
  let lecturas: L[] = [];
  let pendientes = sinRepetir([...auditoria.hallazgos]);
  if (lector) {
    emit({ type: 'stage', stage: 'revision', label: adaptador.etiquetas.leer ?? adaptador.etiquetas.contar });
    const primeraLectura = await lector.leer(game, plot, model, emit);
    hallazgosIniciales.push(...primeraLectura.hallazgos);
    lecturasAntes = primeraLectura.lecturas;
    lecturas = primeraLectura.lecturas;
    pendientes = sinRepetir([...auditoria.hallazgos, ...primeraLectura.hallazgos]);
  }

  try {
    while (pasadas < PASADAS_MAXIMAS) {
      // La primera pasada va siempre: el revisor busca también lo que los
      // informes no saben ver. Las siguientes, solo si queda algo que las merezca.
      if (pasadas > 0 && !hayQueCorregir(pendientes)) break;

      emit({
        type: 'stage',
        stage: 'revision',
        label: pasadas === 0 ? adaptador.etiquetas.revisar : adaptador.etiquetas.segunda,
      });
      const respuesta = await adaptador.revisar(
        game,
        plot,
        model,
        {
          auditoria: auditoria.texto,
          lecturas: lector ? lector.enTexto(game, plot, lecturas) : '',
          hallazgos: pendientes,
        },
        { soloMaterial, pasada: pasadas },
        emit,
      );
      pasadas += 1;

      const { plot: corregida, aplicados, rechazados } = adaptador.parchear(game, plot, respuesta.cambios, soloMaterial);
      plot = corregida;
      cambios.push(...(respuesta.resumenDeCambios ?? []).map((c) => String(c).trim()).filter(Boolean));
      if (rechazados.length) {
        console.warn(`[revision] cambios rechazados en la pasada ${pasadas}:`, rechazados);
        cambios.push(...rechazados.map((r) => `No se aplicó: ${r}.`));
      }
      for (const h of respuesta.hallazgos ?? []) {
        delRevisor.push({
          codigo: String(h.codigo || 'revisor'),
          gravedad: h.gravedad,
          origen: 'revisor',
          texto: `${h.problema}${h.arreglo ? ` — ${h.arreglo}` : ''}`,
          // Lo que el revisor arregló y entró, corregido; lo que descartó como
          // no-problema, también (no queda nada pendiente de ello).
          estado: !h.arreglo || aplicados.length > 0 ? 'corregido' : 'pendiente',
          ...(h.sobre ? { sobre: h.sobre } : {}),
        });
      }
      if (aplicados.length === 0) break; // No cambió nada: otra vuelta daría lo mismo.

      // ---- Mirar otra vez, sobre lo corregido ----
      emit({ type: 'stage', stage: 'revision', label: adaptador.etiquetas.comprobar });
      auditoria = adaptador.auditar(game, plot);
      if (lector) {
        const releer = momentosARevisar(rondas, pendientes);
        const segunda = await lector.leer(game, plot, model, emit, releer);
        const porMomento = new Map(lecturas.map((l) => [l.momento, l]));
        for (const l of segunda.lecturas) porMomento.set(l.momento, l);
        lecturas = [...porMomento.values()].sort((a, b) => a.momento - b.momento);
        pendientes = sinRepetir([...auditoria.hallazgos, ...lector.juzgar(game, plot, lecturas, rondas)]);
      } else {
        pendientes = sinRepetir([...auditoria.hallazgos]);
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    console.error('[revision] la revisión se quedó a medias:', e);
  }

  // ---- El informe ----
  const siguen = new Map(pendientes.map((h) => [clave(h), h]));
  const hallazgos = sinRepetir([
    /*
     * Lo que sigue pendiente, con lo que dice la ÚLTIMA lectura: el mismo
     * aviso de la primera («un 70 %») contaba algo que ya no es verdad cuando
     * la corrección lo había dejado en un 40 %.
     */
    ...hallazgosIniciales.map((h) => {
      const ahora = siguen.get(clave(h));
      return ahora ? { ...ahora, estado: 'pendiente' as const } : { ...h, estado: 'corregido' as const };
    }),
    // Lo que apareció después de corregir y no estaba al principio.
    ...pendientes.filter((h) => !hallazgosIniciales.some((i) => clave(i) === clave(h))),
    ...delRevisor,
  ]);

  return {
    plot,
    informe: {
      veredicto: pasadas === 0 && error ? 'sin-revisar' : veredictoDe(pendientes),
      pasadas,
      hallazgos,
      cambios,
      ...(lector
        ? {
            lecturas: {
              antes: lecturasAntes.map(({ momento, reparto }) => ({ momento, reparto })),
              despues: lecturas.map(({ momento, reparto }) => ({ momento, reparto })),
            },
          }
        : {}),
      revisadaEl: new Date().toISOString(),
      modelo: model,
      ...(error ? { error } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// La conversación con el revisor
// ---------------------------------------------------------------------------

/**
 * Pide la revisión en uno o dos turnos de la MISMA conversación: primero los
 * hallazgos y los cambios de la trama; después, si hay material, los del
 * material, ya con lo anterior escrito.
 *
 * Dos turnos y no uno porque un esquema con todo junto no cabe: la API lo
 * rechazó al validarlo («The compiled grammar is too large»). El segundo turno
 * relee el primero de la caché, así que partirlo apenas cuesta.
 *
 * El primer mensaje lleva su propia marca de caché. La respuesta del primer
 * turno se devuelve TAL CUAL —con sus bloques de pensamiento—: en Opus 5.5 el
 * pensamiento está ligado a la conversación, y reescribirlo lo invalidaría. Si
 * el segundo turno falla, se queda lo del primero, que ya es lo importante.
 */
export async function conversarConElRevisor<C extends object>(opciones: {
  game: GameSession;
  model: ModelId;
  emit: Emitir;
  sistema: string;
  prompt: string;
  esquema: Record<string, unknown>;
  segundoTurno?: { pedido: string; esquema: Record<string, unknown> };
}): Promise<RespuestaDelRevisor<C>> {
  const { game, model, emit } = opciones;
  const client = getAnthropicClient();
  if (!client) throw new Error('No hay clave de API: el revisor no puede leer la trama.');

  const primero: Anthropic.MessageParam = {
    role: 'user',
    content: [{ type: 'text', text: opciones.prompt, cache_control: { type: 'ephemeral' } }],
  };

  /*
   * El juicio —qué falla y cómo se arregla la trama— piensa lo del revisor. El
   * material es poner al día prosa ya escrita con lo decidido: piensa lo del
   * material.
   */
  const turno = async (messages: Anthropic.MessageParam[], schema: Record<string, unknown>, paso: 'revisor' | 'material') => {
    const stream = streamDeGeneracion(client, {
      model,
      esfuerzo: esfuerzoPara(game, paso),
      maxTokens: 128000,
      system: opciones.sistema,
      schema,
      messages,
    });
    // A ciegas, puntos: el revisor escribe con la solución delante.
    stream.on('text', emisorDeProgreso(game, emit));
    const mensaje = await stream.finalMessage();
    apuntarUso({ concepto: 'revisor', model: mensaje.model ?? model, usage: mensaje.usage, gameId: game.id });
    if (mensaje.stop_reason === 'refusal') throw new Error('El modelo declinó revisar la trama.');
    if (mensaje.stop_reason === 'max_tokens') throw new Error('La revisión superó el límite de tokens y quedó incompleta.');
    try {
      return { mensaje, datos: JSON.parse(textoDe(mensaje)) as Partial<RespuestaDelRevisor<C>> };
    } catch {
      throw new Error('La respuesta del revisor no es un JSON válido.');
    }
  };

  const { mensaje, datos } = await turno([primero], opciones.esquema, 'revisor');
  const respuesta = completarRespuesta<C>(datos);
  if (!opciones.segundoTurno) return respuesta;

  try {
    const { datos: segundo } = await turno(
      [
        primero,
        { role: 'assistant', content: mensaje.content as Anthropic.MessageParam['content'] },
        { role: 'user', content: opciones.segundoTurno.pedido },
      ],
      opciones.segundoTurno.esquema,
      'material',
    );
    return {
      ...respuesta,
      cambios: { ...respuesta.cambios, ...((segundo.cambios ?? {}) as C) },
      resumenDeCambios: [...respuesta.resumenDeCambios, ...(Array.isArray(segundo.resumenDeCambios) ? segundo.resumenDeCambios.map(String) : [])],
    };
  } catch (error) {
    console.warn('[revision] el segundo turno falló; se queda lo del primero:', error);
    return respuesta;
  }
}

/** Rellena lo que falte para que quien lo lee no tenga que preguntar campo a campo. */
export function completarRespuesta<C>(datos: Partial<RespuestaDelRevisor<C>>): RespuestaDelRevisor<C> {
  return {
    diagnostico: String(datos.diagnostico ?? ''),
    hallazgos: Array.isArray(datos.hallazgos) ? datos.hallazgos : [],
    cambios: (datos.cambios ?? {}) as C,
    resumenDeCambios: Array.isArray(datos.resumenDeCambios) ? datos.resumenDeCambios.map(String) : [],
  };
}

// ---------------------------------------------------------------------------
// El lector ciego
// ---------------------------------------------------------------------------

export function ordenados(reparto: Record<string, number>): Array<[string, number]> {
  return Object.entries(reparto).sort((a, b) => b[1] - a[1]);
}

/** Puntos a probabilidades sobre `ids`. Sin ningún punto válido, a partes iguales: «no distingue a nadie». */
export function normalizarReparto(entradas: Array<{ id: string; puntos: number }> | undefined, ids: string[]): Record<string, number> {
  const puntos = new Map<string, number>();
  for (const e of entradas ?? []) {
    if (ids.includes(e.id) && Number.isFinite(e.puntos) && e.puntos > 0) {
      puntos.set(e.id, (puntos.get(e.id) ?? 0) + e.puntos);
    }
  }
  const total = [...puntos.values()].reduce((a, b) => a + b, 0);
  const reparto: Record<string, number> = {};
  for (const id of ids) reparto[id] = total > 0 ? (puntos.get(id) ?? 0) / total : 1 / Math.max(1, ids.length);
  return reparto;
}

/** Un reparto de puntos sobre una lista de ids, para el esquema del lector. */
export function esquemaDeReparto(description: string): Record<string, unknown> {
  return {
    type: 'array',
    description,
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'puntos'],
      properties: { id: { type: 'string' }, puntos: { type: 'integer' } },
    },
  };
}

/**
 * Lee los momentos pedidos EN PARALELO, cada uno en su propia llamada: con una
 * sola conversación que avanzara, lo que opinó en la ronda 1 condicionaría la 2,
 * y se estaría midiendo la terquedad del lector y no la trama.
 *
 * Un momento que falla no invalida los demás: se apunta en `fallidos`.
 */
export async function leerMomentos<L extends LecturaDeMomento>(opciones: {
  game: GameSession;
  model: ModelId;
  emit: Emitir;
  momentos: number[];
  rondas: number;
  sistema: string;
  esquema: Record<string, unknown>;
  /** El mensaje entero para el momento `m`: lo que sabe la mesa y lo que se le pregunta. */
  pregunta: (m: number) => string;
  /** Traduce la respuesta del modelo a una lectura. */
  interpretar: (m: number, datos: Record<string, unknown>) => L;
  progreso: (hechas: number, total: number) => string;
}): Promise<{ lecturas: L[]; fallidos: number[] }> {
  const client = getAnthropicClient();
  if (!client) return { lecturas: [], fallidos: [] };
  const { game, model, emit, momentos, rondas } = opciones;

  let hechas = 0;
  const resultados = await Promise.allSettled(
    momentos.map(async (m) => {
      const stream = streamDeGeneracion(client, {
        model,
        // El último momento es el que decide si hay solución: piensa lo del revisor.
        esfuerzo: esfuerzoPara(game, m === rondas ? 'revisor' : 'detective'),
        maxTokens: 64000,
        system: opciones.sistema,
        schema: opciones.esquema,
        messages: [{ role: 'user', content: opciones.pregunta(m) }],
      });
      const mensaje = await stream.finalMessage();
      apuntarUso({ concepto: 'detective', model: mensaje.model ?? model, usage: mensaje.usage, gameId: game.id });
      if (mensaje.stop_reason === 'refusal' || mensaje.stop_reason === 'max_tokens') {
        throw new Error(`el lector no terminó (${mensaje.stop_reason})`);
      }
      const lectura = opciones.interpretar(m, JSON.parse(textoDe(mensaje)) as Record<string, unknown>);
      hechas += 1;
      emit({ type: 'text', delta: `\n[${opciones.progreso(hechas, momentos.length)}]\n` });
      return lectura;
    }),
  );

  const lecturas: L[] = [];
  const fallidos: number[] = [];
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled') lecturas.push(r.value);
    else {
      fallidos.push(momentos[i]!);
      console.warn(`[revision] el lector falló en el momento ${momentos[i]}:`, r.reason);
    }
  });
  lecturas.sort((a, b) => a.momento - b.momento);
  return { lecturas, fallidos };
}

/**
 * El juicio de «a quién señala la mesa», el mismo para el culpable de CLUEDO,
 * el traidor de las Sombras o quien rompió el sello en la Momia: una sola
 * persona es la respuesta, y la mesa no debería encontrarla ni antes de tiempo
 * ni nunca.
 *
 * ═══ DOS ESCALONES, Y POR QUÉ ═══
 *
 * La primera velada completa contra la API (25-sep-2026, siete personas) empezó
 * con el culpable al 70 % antes de la primera ronda: eso es una trama rota, y el
 * revisor la dejó en un 40 %. Un 40 % con siete a la mesa es un favorito —vale
 * un aviso— pero no un caso resuelto. Con un solo escalón, el 40 % salía
 * «bloqueante» y se habría devuelto entera una trama que ya estaba bien. Así que
 * lo bloqueante es lo que delata de verdad, y lo intermedio se queda en grave.
 */
export function juzgarSospecha(opciones: {
  lecturas: LecturaDeMomento[];
  /** Quién es la respuesta. */
  objetivo: string;
  /** Entre cuántas personas se reparte la sospecha. */
  candidatos: number;
  rondas: number;
  nombre: (id: string) => string;
  /** Cómo se llama a quien se busca en los textos del aviso: «el culpable», «el traidor»… */
  quien: string;
  /** El código del aviso de «nadie lo mira»: `culpable-invisible`, `traidor-invisible`… */
  codigoInvisible: string;
  /** Si la frase decisiva es una pista con ronda, cuál. */
  pistaDe?: (texto: string) => { id: string; ronda: number } | undefined;
  origen?: HallazgoDeRevision['origen'];
  /**
   * `resolver` (CLUEDO): la mesa tiene que llegar a la respuesta LEYENDO, pero
   * al final y no antes. `no-delatar` (el traidor de las Sombras, quien rompió
   * el sello en la Momia): a esa persona se la caza JUGANDO —mintiendo,
   * votando, falsificando—, así que ningún momento, tampoco el último, debe
   * dejar a la mesa señalándola por lo que ha leído.
   */
  modo?: 'resolver' | 'no-delatar';
}): HallazgoDeRevision[] {
  const { lecturas, objetivo, rondas, nombre } = opciones;
  const azar = 1 / Math.max(1, opciones.candidatos);
  const pct = (x: number) => `${Math.round(x * 100)} %`;
  const salida: HallazgoDeRevision[] = [];
  let momento = 0;
  const h = (codigo: string, gravedad: GravedadDeHallazgo, texto: string, sobre?: string) =>
    salida.push({ codigo, gravedad, origen: opciones.origen ?? 'detective', texto, estado: 'pendiente', sobre: sobre ?? `momento-${momento}` });

  if (opciones.modo === 'no-delatar') {
    for (const l of lecturas) {
      momento = l.momento;
      const orden = ordenados(l.reparto);
      const p = l.reparto[objetivo] ?? 0;
      const encabeza = orden[0]?.[0] === objetivo;
      const ventaja = encabeza ? p - (orden[1]?.[1] ?? 0) : 0;
      if (encabeza && p >= Math.max(0.3, 2 * azar) && ventaja >= 0.1) {
        const delata = p >= Math.max(0.5, 3 * azar) && ventaja >= 0.15;
        const cuando =
          l.momento === 0 ? 'Antes de empezar' : l.momento < rondas ? `Al cerrar la ronda ${l.momento} de ${rondas}` : 'Al final de la noche';
        h(
          l.momento === 0 ? 'filtracion-inicial' : l.momento < rondas ? 'filtracion-temprana' : 'filtracion-final',
          delata ? 'bloqueante' : 'grave',
          `${cuando}, quien no sabe la solución ya señala a ${nombre(objetivo)} con un ${pct(p)} solo por lo que ha ` +
            `leído. A ${opciones.quien} se le caza jugando, no leyendo. Por qué: ${l.razon}`,
        );
      }
      const decisiva = l.pistaDecisiva.trim();
      if (decisiva && encabeza) {
        const pista = opciones.pistaDe?.(decisiva);
        const sobre = pista?.id ?? decisiva;
        if (!salida.some((x) => x.codigo === 'pista-que-lo-dice-todo' && x.sobre === sobre)) {
          h(
            'pista-que-lo-dice-todo',
            'bloqueante',
            `${pista ? `«${pista.id}» (ronda ${pista.ronda})` : `La frase ${decisiva}`} basta por sí sola para señalar a ` +
              `${nombre(objetivo)}. A ${opciones.quien} se le tiene que cazar jugando.`,
            sobre,
          );
        }
      }
    }
    return salida;
  }

  for (const l of lecturas) {
    momento = l.momento;
    const orden = ordenados(l.reparto);
    const [primero, segundo] = [orden[0], orden[1]];
    const p = l.reparto[objetivo] ?? 0;
    const encabeza = primero?.[0] === objetivo;
    const ventaja = encabeza ? p - (segundo?.[1] ?? 0) : 0;

    if (l.momento === 0 && encabeza && p >= Math.max(0.3, 2 * azar) && ventaja >= 0.1) {
      const delata = p >= Math.max(0.5, 3 * azar) && ventaja >= 0.15;
      h(
        'filtracion-inicial',
        delata ? 'bloqueante' : 'grave',
        `Antes de abrir la primera ronda, quien no sabe la solución ya señala a ${nombre(objetivo)} con un ` +
          `${pct(p)}${delata ? '' : ': la mesa empezará con un favorito'}. Por qué: ${l.razon}`,
      );
    } else if (l.momento > 0 && l.momento < rondas - 1 && encabeza && p >= Math.max(0.4, 2.5 * azar) && ventaja >= 0.15) {
      const delata = l.momento === 1 && p >= Math.max(0.6, 3.5 * azar) && ventaja >= 0.2;
      h(
        'filtracion-temprana',
        delata ? 'bloqueante' : 'grave',
        `Al cerrar la ronda ${l.momento} de ${rondas}, quien no sabe la solución ya señala a ${nombre(objetivo)} con un ` +
          `${pct(p)} y ventaja clara. Por qué: ${l.razon}`,
      );
    } else if (l.momento === rondas - 1 && l.momento > 0 && p >= 0.65) {
      h(
        'resuelto-antes-de-tiempo',
        'grave',
        `Con una ronda todavía por jugar ya está decidido (${nombre(objetivo)}, ${pct(p)}): la última ronda no ` +
          `aporta nada. Por qué: ${l.razon}`,
      );
    }

    // Una sola cosa que lo dice todo, en cualquier momento, si apunta a quien es.
    const decisiva = l.pistaDecisiva.trim();
    if (decisiva && encabeza) {
      const pista = opciones.pistaDe?.(decisiva);
      const sobre = pista?.id ?? decisiva;
      if (!salida.some((x) => x.codigo === 'pista-que-lo-dice-todo' && x.sobre === sobre)) {
        h(
          'pista-que-lo-dice-todo',
          l.momento < rondas ? 'bloqueante' : 'grave',
          `${pista ? `La pista «${pista.id}» (ronda ${pista.ronda})` : `La frase ${decisiva}`} basta por sí sola para ` +
            `señalar a ${nombre(objetivo)}, sin combinarla con nada. La noche se resuelve leyéndola, no deduciendo.`,
          sobre,
        );
      }
    }

    if (l.momento === rondas) {
      if (!encabeza) {
        h(
          'irresoluble',
          'bloqueante',
          `Con TODAS las rondas jugadas, quien no sabe la solución señala a ${nombre(primero?.[0] ?? '')} ` +
            `(${pct(primero?.[1] ?? 0)}) y no a ${nombre(objetivo)} (${pct(p)}). Tal como está, la mesa no puede ` +
            `llegar a la solución. Su razonamiento: ${l.razon}`,
        );
      } else if (p < 0.45) {
        h('final-flojo', 'grave', `Al final la mesa acertaría, pero sin convicción (${pct(p)}): las pruebas no cierran el caso.`);
      }
    }
  }

  // Por abajo: que a quien se busca no se le deje fuera de la noche.
  const intermedias = lecturas.filter((l) => l.momento > 0 && l.momento < rondas);
  if (intermedias.length >= 2 && intermedias.every((l) => (l.reparto[objetivo] ?? 0) < azar / 2)) {
    momento = -1;
    h(
      opciones.codigoInvisible,
      'grave',
      `En todas las rondas intermedias la sospecha sobre ${nombre(objetivo)} está por debajo de la mitad de lo que le ` +
        `tocaría por azar: nadie considera a ${opciones.quien} hasta la última ronda, y entonces todo se decide de golpe.`,
      objetivo,
    );
  }
  return salida;
}

/** Las lecturas en texto, para el revisor: las tres personas más señaladas en cada momento. */
export function lecturasEnTextoComun(
  lecturas: LecturaDeMomento[],
  objetivo: string,
  nombre: (id: string) => string,
  marca: string,
): string {
  return lecturas
    .map((l) => {
      const top = ordenados(l.reparto)
        .slice(0, 3)
        .map(([id, p]) => `${nombre(id)}${id === objetivo ? ` [${marca}]` : ''} ${Math.round(p * 100)} %`)
        .join(', ');
      return (
        `- Momento ${l.momento}${l.momento === 0 ? ' (antes de la ronda 1)' : ` (al cerrar la ronda ${l.momento})`}: ${top}\n` +
        `  Por qué: ${l.razon}` +
        (l.pistaDecisiva ? `\n  Le basta una sola cosa: ${l.pistaDecisiva}` : '') +
        (l.cadena.length ? `\n  Combina: ${l.cadena.join(', ')}` : '')
      );
    })
    .join('\n');
}
