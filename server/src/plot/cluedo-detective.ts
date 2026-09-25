/**
 * El detective ciego: alguien que NO conoce la solución intenta resolver el
 * caso en cada momento de la velada, con lo que la mesa sabe en ese momento.
 *
 * ═══ POR QUÉ ES LA PRUEBA QUE IMPORTA ═══
 *
 * Una trama se delata o no se delata según lo que LEE quien juega, y no según lo
 * que el autor quiso decir. El autor —y un revisor que conoce la solución— no
 * puede leer la sinopsis sin saber quién fue: ve «la condesa, siempre tan
 * callada» y le parece ambiente. Quien no lo sabe ve a la condesa.
 *
 * Así que se le pregunta a alguien que no lo sabe, en cada punto de la noche:
 *
 *   · momento 0: con lo que se oye antes de la primera ronda —sinopsis,
 *     ambientación, caras públicas, coartadas declaradas, lo que cada cual sabe
 *     de los demás y la apertura—. Si aquí ya señala a la persona culpable, el
 *     resumen la está acusando (lo que pasó en la casa Sabrón);
 *   · momentos 1..N-1: al cerrar cada ronda, con sus pistas, sus hechos y sus
 *     giros. Si el caso se decide aquí, la noche se acaba antes de tiempo;
 *   · momento N: con todo. Si aquí NO señala a quien lo hizo, el caso no tiene
 *     solución; y si lo señala por UNA sola pista, esa pista lo dice demasiado
 *     claro (lo que pasó con la última ronda de Villa CASAS).
 *
 * ═══ CADA MOMENTO ES UNA LLAMADA APARTE, Y EN PARALELO ═══
 *
 * Con una sola conversación que fuera avanzando, lo que opinó en la ronda 1
 * condicionaría la 2: se estaría midiendo la terquedad del detective y no la
 * trama. Y en paralelo cuesta lo mismo y tarda lo que tarda la más lenta, no la
 * suma.
 *
 * Se le pide que sea implacable a propósito: mejor un detective que ve
 * fantasmas —el revisor decide si lo son— que uno que no ve lo que la mesa sí
 * verá.
 */
import type {
  GameSession,
  GenerateStreamEvent,
  HallazgoDeRevision,
  LecturaDelDetective,
  ModelId,
  Plot,
} from '../../../shared/types';
import { pistasDeLaTrama } from '../../../shared/mecanicas/pistas';
import { cronologiaPublica, numeroDeRondas } from '../docs/datos';
import { culpableDe, lugarDe, objetoDe, objetosDe, salasDe, sospechososDe, victimaDe } from '../juegos/cluedo';
import { esfuerzoPara, getAnthropicClient, streamDeGeneracion, textoDe } from '../agent/anthropic';
import { conocimientoDesbloqueado } from '../live/proyeccion';
import { apuntarUso } from '../gasto/contador';

const SISTEMA_DETECTIVE =
  'Eres una mesa de jugadores veteranos de misterio en vivo, de los que resuelven los casos antes que nadie. ' +
  'NO conoces la solución: solo lo que se os ha contado hasta ahora en la velada. ' +
  'Tu trabajo es decir, con honestidad, a quién señalaría la mesa en este momento y por qué. ' +
  'Aprovechas cualquier descuido del autor: nombres que se repiten, adjetivos que delatan, quién recibe ' +
  'demasiada atención o demasiado poca, quién no recibe un sobre que los demás sí reciben. ' +
  'Pero no inventas: si lo que sabéis no distingue a nadie, repartes la sospecha por igual. ' +
  'Escribes en español y devuelves exclusivamente el JSON pedido, con los ids exactos que se te dan.';

/** Lo que devuelve en cada momento. Probabilidades en puntos (0..100); se normalizan al leer. */
export const DETECTIVE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['personas', 'objetos', 'salas', 'razon', 'pistaDecisiva', 'cadena'],
  properties: {
    personas: {
      type: 'array',
      description: 'Una entrada por CADA persona de la lista, con los puntos de sospecha que le das (suman 100).',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'puntos'],
        properties: { id: { type: 'string' }, puntos: { type: 'integer' } },
      },
    },
    objetos: {
      type: 'array',
      description: 'Una entrada por CADA objeto: cuánto crees que fue el arma (suman 100).',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'puntos'],
        properties: { id: { type: 'string' }, puntos: { type: 'integer' } },
      },
    },
    salas: {
      type: 'array',
      description: 'Una entrada por CADA sala: cuánto crees que fue el lugar del crimen (suman 100).',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'puntos'],
        properties: { id: { type: 'string' }, puntos: { type: 'integer' } },
      },
    },
    razon: {
      type: 'string',
      description: 'En dos o tres frases: qué te hace sospechar de quien más sospechas, citando lo que lo delata.',
    },
    pistaDecisiva: {
      type: 'string',
      description:
        'Si UNA SOLA pista o frase te basta para señalar a alguien sin combinarla con nada más, su id de pista ' +
        '(o la frase entre comillas si no es una pista). Cadena vacía si tu sospecha sale de combinar varias cosas.',
    },
    cadena: {
      type: 'array',
      description: 'Los ids de las pistas que has combinado para llegar a tu sospecha principal. Vacío si ninguna.',
      items: { type: 'string' },
    },
  },
};

interface RespuestaDelDetective {
  personas: Array<{ id: string; puntos: number }>;
  objetos: Array<{ id: string; puntos: number }>;
  salas: Array<{ id: string; puntos: number }>;
  razon: string;
  pistaDecisiva: string;
  cadena: string[];
}

/** Una lectura con todo lo que dijo, para el revisor. `reparto` ya normalizado. */
export interface LecturaCompleta extends LecturaDelDetective {
  objetos: Record<string, number>;
  salas: Record<string, number>;
  razon: string;
  pistaDecisiva: string;
  cadena: string[];
}

export interface InformeDelDetective {
  lecturas: LecturaCompleta[];
  hallazgos: HallazgoDeRevision[];
  /** Momentos que no se pudieron leer (la llamada falló). No invalidan los demás. */
  fallidos: number[];
}

// ---------------------------------------------------------------------------
// Lo que sabe la mesa
// ---------------------------------------------------------------------------

/**
 * Lo que sabe la mesa en el momento `hasta` (0 = antes de la ronda 1). Es lo
 * ÚNICO que ve el detective: ni la solución, ni los secretos, ni los motivos, ni
 * el guion del Game Master, ni las ayudas —que solo se leen si la mesa se atasca—.
 *
 * Lo que cada cual sabe de los demás (`knowledge`) depende de cómo se juegue:
 *
 *   · EN PAPEL entra entero desde el principio: está todo en el dosier desde el
 *     primer minuto, y es lo primero que se cuenta en la mesa.
 *   · CON LA APP se desbloquea por rondas, con la misma regla que el móvil
 *     (`conocimientoDesbloqueado`): antes de la primera ronda no se ve nada.
 *
 * Una partida sin modo se mide como papel, que es el peor caso.
 */
export function loQueSabeLaMesa(game: GameSession, plot: Plot, hasta: number): string {
  const nombreDe = (id: string) => sospechososDe(game).find((s) => s.id === id)?.name ?? id;
  const salaDe = (id?: string) => salasDe(game).find((r) => r.id === id)?.name ?? 'sin sala';
  const material = plot.material;
  const conApp = game.settings?.modo === 'app';
  const rondas = numeroDeRondas(plot);
  const sabeYa = (conocimiento: string[]): string[] =>
    conApp ? conocimiento.slice(0, hasta === 0 ? 0 : conocimientoDesbloqueado(conocimiento.length, hasta, rondas)) : conocimiento;

  const personas = plot.characters
    .map(
      (c) =>
        `- id "${c.participanteId}" · ${c.characterName} (lo juega ${nombreDe(c.participanteId)}) · ${c.role}\n` +
        `  Cara pública: ${c.publicPersona}\n` +
        `  Coartada que declara: ${c.alibi ?? ''}\n` +
        `  Lo que cuenta que sabe de otros: ${sabeYa(c.knowledge ?? []).join(' | ') || '(nada, todavía)'}`,
    )
    .join('\n');

  const lista = (xs: Array<{ id: string; name: string; description?: string }>) =>
    xs.map((x) => `- id "${x.id}" · ${x.name}${x.description?.trim() ? ` · ${x.description.trim()}` : ''}`).join('\n');

  const partes = [
    `CASO: ${plot.title}
LEMA: ${plot.tagline}
SINOPSIS: ${plot.synopsis}
AMBIENTACIÓN: ${plot.setting}
VÍCTIMA: ${victimaDe(plot).name} — ${victimaDe(plot).description}

PERSONAS (una de ellas lo hizo):
${personas}

OBJETOS (uno de ellos fue el arma):
${lista(objetosDe(game))}

SALAS (en una ocurrió):
${lista(salasDe(game))}

CRONOLOGÍA PÚBLICA:
${cronologiaPublica(plot).map((e) => `- ${e.time} ${e.description}`).join('\n') || '(ninguna)'}`,
  ];

  const apertura = material?.narrations.find((n) => n.round === 0);
  if (apertura) partes.push(`APERTURA, LEÍDA EN VOZ ALTA:\n${apertura.text}`);

  for (let r = 1; r <= hasta; r++) {
    const narracion = material?.narrations.find((n) => n.round === r);
    const pistas = pistasDeLaTrama(plot).filter((p) => p.round === r);
    const hechos = (material?.timelineReveals ?? []).filter((t) => t.round === r);
    const giros = (material?.twists ?? []).filter((g) => g.round === r);
    partes.push(
      [
        `=== RONDA ${r} ===`,
        narracion ? `Narración: ${narracion.text}` : '',
        `Pistas encontradas:\n${pistas.map((p) => `- [${p.id}] en ${salaDe(p.lugarId)}: ${p.description} → apunta a: ${p.pointsTo}`).join('\n') || '(ninguna)'}`,
        hechos.length ? `Hechos que la mesa da por establecidos:\n${hechos.map((h) => `- ${h.time} ${h.fact}`).join('\n')}` : '',
        giros.length
          ? `Sobres de giro entregados al cerrar la ronda (quien lo recibe lo cuenta):\n${giros.map((g) => `- a ${nombreDe(g.participanteId)}: ${g.instruction}`).join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  return partes.join('\n\n');
}

function preguntaDelMomento(hasta: number, rondas: number): string {
  if (hasta === 0) {
    return 'MOMENTO: la velada acaba de empezar; todavía no se ha abierto ninguna ronda.';
  }
  if (hasta < rondas) {
    return `MOMENTO: acaba de cerrarse la ronda ${hasta} de ${rondas}. Quedan rondas por jugar.`;
  }
  return `MOMENTO: se han jugado las ${rondas} rondas. Es la hora de acusar: di quién, con qué y dónde.`;
}

// ---------------------------------------------------------------------------
// Llamadas
// ---------------------------------------------------------------------------

function normalizarReparto(entradas: Array<{ id: string; puntos: number }>, ids: string[]): Record<string, number> {
  const puntos = new Map<string, number>();
  for (const e of entradas ?? []) {
    if (ids.includes(e.id) && Number.isFinite(e.puntos) && e.puntos > 0) {
      puntos.set(e.id, (puntos.get(e.id) ?? 0) + e.puntos);
    }
  }
  const total = [...puntos.values()].reduce((a, b) => a + b, 0);
  const reparto: Record<string, number> = {};
  for (const id of ids) {
    // Sin ningún punto válido, a partes iguales: «no distingue a nadie».
    reparto[id] = total > 0 ? (puntos.get(id) ?? 0) / total : 1 / Math.max(1, ids.length);
  }
  return reparto;
}

async function unMomento(
  game: GameSession,
  plot: Plot,
  model: ModelId,
  hasta: number,
  rondas: number,
): Promise<LecturaCompleta> {
  const client = getAnthropicClient();
  if (!client) throw new Error('sin cliente');
  const stream = streamDeGeneracion(client, {
    model,
    // El último momento es el que decide si hay solución: piensa lo de la trama.
    esfuerzo: esfuerzoPara(game, hasta === rondas ? 'revisor' : 'detective'),
    maxTokens: 64000,
    system: SISTEMA_DETECTIVE,
    schema: DETECTIVE_SCHEMA,
    messages: [
      {
        role: 'user',
        content: `${loQueSabeLaMesa(game, plot, hasta)}\n\n${preguntaDelMomento(hasta, rondas)}\n\nReparte 100 puntos de sospecha entre las personas, 100 entre los objetos y 100 entre las salas. Incluye a todas, aunque sea con 0.`,
      },
    ],
  });
  const mensaje = await stream.finalMessage();
  apuntarUso({ concepto: 'detective', model: mensaje.model ?? model, usage: mensaje.usage, gameId: game.id });
  if (mensaje.stop_reason === 'refusal' || mensaje.stop_reason === 'max_tokens') {
    throw new Error(`el detective no terminó (${mensaje.stop_reason})`);
  }
  const r = JSON.parse(textoDe(mensaje)) as RespuestaDelDetective;
  return {
    momento: hasta,
    reparto: normalizarReparto(r.personas, sospechososDe(game).map((s) => s.id)),
    objetos: normalizarReparto(r.objetos, objetosDe(game).map((o) => o.id)),
    salas: normalizarReparto(r.salas, salasDe(game).map((s) => s.id)),
    razon: String(r.razon ?? ''),
    pistaDecisiva: String(r.pistaDecisiva ?? ''),
    cadena: Array.isArray(r.cadena) ? r.cadena.map(String) : [],
  };
}

/**
 * Le pregunta al detective en cada momento pedido (por defecto, todos: 0..N)
 * y saca los hallazgos comparando lo que dijo con la solución.
 *
 * Sin clave de API no hay detective: devuelve cero lecturas y ningún hallazgo,
 * y quien lo llama se queda con la auditoría hecha con código.
 */
export async function interrogarAlDetective(
  game: GameSession,
  plot: Plot,
  model: ModelId,
  emit: (evento: GenerateStreamEvent) => void,
  momentos?: number[],
): Promise<InformeDelDetective> {
  const rondas = numeroDeRondas(plot);
  const pedidos = momentos ?? Array.from({ length: rondas + 1 }, (_, i) => i);
  if (!getAnthropicClient()) return { lecturas: [], hallazgos: [], fallidos: [] };

  let hechas = 0;
  const resultados = await Promise.allSettled(
    pedidos.map(async (m) => {
      const lectura = await unMomento(game, plot, model, m, rondas);
      hechas += 1;
      emit({ type: 'text', delta: `\n[El detective ha leído ${hechas} de ${pedidos.length} momentos de la noche]\n` });
      return lectura;
    }),
  );

  const lecturas: LecturaCompleta[] = [];
  const fallidos: number[] = [];
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled') lecturas.push(r.value);
    else {
      fallidos.push(pedidos[i]!);
      console.warn(`[revision] el detective falló en el momento ${pedidos[i]}:`, r.reason);
    }
  });
  lecturas.sort((a, b) => a.momento - b.momento);
  return { lecturas, hallazgos: juzgarLecturas(game, plot, lecturas, rondas), fallidos };
}

// ---------------------------------------------------------------------------
// Juicio
// ---------------------------------------------------------------------------

function ordenados(reparto: Record<string, number>): Array<[string, number]> {
  return Object.entries(reparto).sort((a, b) => b[1] - a[1]);
}

/**
 * Compara lo que leyó el detective con la solución. Umbrales pensados para no
 * saltar con el ruido de una sola lectura: una sospecha que dobla lo que tocaría
 * por azar y saca ventaja clara a la segunda.
 *
 * ═══ DOS ESCALONES, Y POR QUÉ ═══
 *
 * La primera velada completa contra la API (25-sep-2026, siete personas) empezó
 * con el culpable al 70 % antes de la primera ronda: eso es una trama rota, y
 * el revisor la dejó en un 40 %. Un 40 % con siete a la mesa es que la mesa
 * tiene un favorito —vale un aviso— pero no que el caso esté resuelto. Con un
 * solo escalón, el 40 % salía «bloqueante», la velada «no apta» y se habría
 * devuelto entera una trama que ya estaba bien. Así que lo bloqueante es lo
 * que delata de verdad (la mitad o más, con ventaja holgada), y lo intermedio
 * se queda en grave.
 */
export function juzgarLecturas(
  game: GameSession,
  plot: Plot,
  lecturas: LecturaCompleta[],
  rondas: number,
): HallazgoDeRevision[] {
  const culpable = culpableDe(plot.solution);
  const arma = objetoDe(plot.solution);
  const sala = lugarDe(plot.solution);
  const n = Math.max(1, sospechososDe(game).length);
  const azar = 1 / n;
  const nombre = (id: string) => {
    const c = plot.characters.find((x) => x.participanteId === id);
    return c?.characterName ?? sospechososDe(game).find((s) => s.id === id)?.name ?? id;
  };
  const pct = (x: number) => `${Math.round(x * 100)} %`;
  const salida: HallazgoDeRevision[] = [];
  let momento = 0;
  const h = (codigo: string, gravedad: HallazgoDeRevision['gravedad'], texto: string, sobre?: string) =>
    salida.push({ codigo, gravedad, origen: 'detective', texto, estado: 'pendiente', sobre: sobre ?? `momento-${momento}` });

  for (const l of lecturas) {
    momento = l.momento;
    const orden = ordenados(l.reparto);
    const [primero, segundo] = [orden[0], orden[1]];
    const pCulpable = l.reparto[culpable] ?? 0;
    const encabeza = primero?.[0] === culpable;
    const ventaja = encabeza ? pCulpable - (segundo?.[1] ?? 0) : 0;

    if (l.momento === 0 && encabeza && pCulpable >= Math.max(0.3, 2 * azar) && ventaja >= 0.1) {
      const delata = pCulpable >= Math.max(0.5, 3 * azar) && ventaja >= 0.15;
      h(
        'filtracion-inicial',
        delata ? 'bloqueante' : 'grave',
        `Antes de abrir la primera ronda, quien no sabe la solución ya señala a ${nombre(culpable)} con un ` +
          `${pct(pCulpable)}${delata ? '' : ': la mesa empezará con un favorito'}. Por qué: ${l.razon}`,
      );
    } else if (l.momento > 0 && l.momento < rondas - 1 && encabeza && pCulpable >= Math.max(0.4, 2.5 * azar) && ventaja >= 0.15) {
      const delata = l.momento === 1 && pCulpable >= Math.max(0.6, 3.5 * azar) && ventaja >= 0.2;
      h(
        'filtracion-temprana',
        delata ? 'bloqueante' : 'grave',
        `Al cerrar la ronda ${l.momento} de ${rondas}, el detective ya señala a ${nombre(culpable)} con un ` +
          `${pct(pCulpable)} y ventaja clara. Por qué: ${l.razon}`,
      );
    } else if (l.momento === rondas - 1 && l.momento > 0 && pCulpable >= 0.65) {
      h(
        'resuelto-antes-de-tiempo',
        'grave',
        `Con una ronda todavía por jugar el caso ya está decidido (${nombre(culpable)}, ${pct(pCulpable)}): la última ` +
          `ronda no aporta nada. Por qué: ${l.razon}`,
      );
    }

    // Una pista que lo dice todo, en cualquier momento, si apunta a quien fue.
    if (l.pistaDecisiva.trim() && encabeza) {
      const esPista = pistasDeLaTrama(plot).find((p) => p.id === l.pistaDecisiva.trim());
      const yaEsta = salida.some((x) => x.codigo === 'pista-que-lo-dice-todo' && x.sobre === (esPista?.id ?? l.pistaDecisiva.trim()));
      if (!yaEsta) h(
        'pista-que-lo-dice-todo',
        l.momento < rondas ? 'bloqueante' : 'grave',
        `${esPista ? `La pista «${esPista.id}» (ronda ${esPista.round})` : `La frase ${l.pistaDecisiva}`} basta ` +
          `por sí sola para señalar a ${nombre(culpable)}, sin combinarla con nada. La noche se resuelve leyéndola, ` +
          `no deduciendo.`,
        esPista?.id ?? l.pistaDecisiva.trim(),
      );
    }

    if (l.momento === rondas) {
      if (!encabeza) {
        h(
          'irresoluble',
          'bloqueante',
          `Con TODAS las rondas jugadas, el detective acusa a ${nombre(primero?.[0] ?? '')} ` +
            `(${pct(primero?.[1] ?? 0)}) y no a ${nombre(culpable)} (${pct(pCulpable)}). Tal como está, la mesa no ` +
            `puede llegar a la solución. Su razonamiento: ${l.razon}`,
        );
      } else if (pCulpable < 0.45) {
        h(
          'final-flojo',
          'grave',
          `Al final la mesa acertaría, pero sin convicción (${pct(pCulpable)}): las pruebas no cierran el caso.`,
        );
      }
      const armaPrimera = ordenados(l.objetos)[0]?.[0];
      if (arma && armaPrimera && armaPrimera !== arma) {
        h('arma-irresoluble', 'grave', `Al final el detective no llega al arma: señala otro objeto (${armaPrimera}).`);
      }
      const salaPrimera = ordenados(l.salas)[0]?.[0];
      if (sala && salaPrimera && salaPrimera !== sala) {
        h('sala-irresoluble', 'grave', `Al final el detective no llega a la sala del crimen: señala otra (${salaPrimera}).`);
      }
    }
  }

  // Por abajo: que a la persona culpable no se la deje fuera de la noche.
  const intermedias = lecturas.filter((l) => l.momento > 0 && l.momento < rondas);
  if (intermedias.length >= 2 && intermedias.every((l) => (l.reparto[culpable] ?? 0) < azar / 2)) {
    momento = -1;
    h(
      'culpable-invisible',
      'grave',
      `En todas las rondas intermedias la sospecha sobre ${nombre(culpable)} está por debajo de la mitad de lo que ` +
        `le tocaría por azar: nadie la considera hasta que la última ronda la señala de golpe.`,
      culpable,
    );
  }

  return salida;
}

/** Las lecturas en texto, para el revisor: las tres personas más señaladas en cada momento. */
export function lecturasEnTexto(game: GameSession, plot: Plot, lecturas: LecturaCompleta[]): string {
  const culpable = culpableDe(plot.solution);
  const nombre = (id: string) => plot.characters.find((x) => x.participanteId === id)?.characterName ?? id;
  return lecturas
    .map((l) => {
      const top = ordenados(l.reparto)
        .slice(0, 3)
        .map(([id, p]) => `${nombre(id)}${id === culpable ? ' [CULPABLE]' : ''} ${Math.round(p * 100)} %`)
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
