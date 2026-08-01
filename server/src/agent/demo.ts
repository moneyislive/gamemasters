/**
 * Modo demo del chat (sin clave de API).
 *
 * Simula al mayordomo Edmund con un guion en español: da la bienvenida la
 * primera vez, guía los pasos y reconoce órdenes sencillas («añade a Marta»,
 * «apunta la cocina», «arma candelabro»...) aplicando las mutaciones REALES
 * a través de `executeTool`, para que toda la experiencia sea navegable
 * sin clave. Emite los eventos SSE de texto (troceado con pequeños retardos
 * para simular streaming), entidades y comandos de UI, y devuelve el texto
 * completo final.
 */

import type {
  ChatStreamEvent,
  GameSession,
  HighlightTarget,
} from '../../../shared/types';
import { getStore } from '../db/store';
import { executeTool, MINIMOS } from './tools';

const pausa = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

/** Emite un texto troceado en palabras con pequeños retardos, como un stream real. */
async function transmitir(
  texto: string,
  emit: (e: ChatStreamEvent) => void,
): Promise<void> {
  const trozos = texto.split(/(\s+)/);
  for (const trozo of trozos) {
    if (trozo === '') continue;
    emit({ type: 'text', delta: trozo });
    if (trozo.trim() !== '') await pausa(16);
  }
}

/** Palabras que identifican una habitación en el dictado del usuario. */
const PALABRAS_SALA = [
  'sala',
  'salón',
  'cocina',
  'comedor',
  'biblioteca',
  'estudio',
  'invernadero',
  'vestíbulo',
  'recibidor',
  'garaje',
  'terraza',
  'sótano',
  'desván',
  'ático',
  'buhardilla',
  'dormitorio',
  'habitación',
  'cuarto',
  'despacho',
  'oficina',
  'jardín',
  'bodega',
  'baño',
  'balcón',
  'azotea',
  'pasillo',
  'porche',
  'trastero',
  'lavadero',
];

/** Rango Unicode de marcas diacríticas combinantes (U+0300..U+036F). */
const MARCAS_DIACRITICAS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g',
);

/** Quita los acentos para comparar de forma robusta (la \b de RegExp falla con «ático»). */
function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(MARCAS_DIACRITICAS, '');
}

/** ¿Contiene el texto alguna palabra clave de sala? (comparación sin acentos) */
function contieneSala(texto: string): boolean {
  const normalizado = sinAcentos(texto.toLowerCase());
  return PALABRAS_SALA.some((clave) =>
    new RegExp(`\\b${sinAcentos(clave)}\\b`, 'i').test(normalizado),
  );
}

/** Enumera en español: «Ana», «Ana y Luis», «Ana, Luis y Marta». */
function listar(nombres: string[]): string {
  if (nombres.length === 0) return '';
  if (nombres.length === 1) return nombres[0]!;
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/** Capitaliza la primera letra de cada palabra principal. */
function capitalizar(texto: string): string {
  return texto
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((palabra, i) =>
      i === 0 || palabra.length > 3
        ? palabra.charAt(0).toUpperCase() + palabra.slice(1)
        : palabra,
    )
    .join(' ');
}

/** Limpia un nombre capturado: quita artículos iniciales y puntuación final. */
function limpiarNombre(bruto: string): string {
  return bruto
    .replace(/^(?:a\s+|el\s+|la\s+|los\s+|las\s+|un\s+|una\s+)/i, '')
    .replace(/[.,;:!?…]+$/g, '')
    .trim();
}

/**
 * Coletillas de rol que la gente añade al final de la orden y que no forman
 * parte del nombre: «añade a Elena como sospechosa», «apunta a Luis a la lista».
 */
const COLA_ROL =
  /\s+(?:como|de)\s+(?:sospechos[oa]s?|jugador(?:es|a|as)?|invitad[oa]s?|participantes?|personajes?)\b.*$|\s+a\s+(?:la\s+lista|los\s+sospechosos|las\s+sospechosas|la\s+partida|el\s+juego)\b.*$/i;

/** Quita la coletilla de rol de una captura de nombres de personas. */
function quitarColaDeRol(captura: string): string {
  return captura.replace(COLA_ROL, '').trim();
}

interface ResultadoDemo {
  partida: GameSession;
  hechos: string[];
  panel?: HighlightTarget;
}

/** Añade sospechosos detectados en el texto. */
async function anadirSospechosos(
  partida: GameSession,
  capturaBruta: string,
  emailDetectado: string | undefined,
): Promise<ResultadoDemo> {
  const hechos: string[] = [];
  let actual = partida;
  const captura = quitarColaDeRol(capturaBruta);

  // «Marta, tímida y lectora» → nombre + descripción; «Ana, Luis y Marta» → varios nombres.
  const segmentos = captura.split(/\s*,\s*|\s+y\s+/i).map((s) => limpiarNombre(s)).filter(Boolean);
  const sonNombres = segmentos.length > 1 && segmentos.every((s) => s.split(' ').length <= 2);

  const entradas: Array<{ name: string; description?: string }> = [];
  if (sonNombres) {
    for (const nombre of segmentos) entradas.push({ name: capitalizar(nombre) });
  } else {
    const [cabeza, ...resto] = captura.split(/\s*[,:—–-]\s*/);
    const nombre = limpiarNombre(cabeza ?? '');
    if (nombre) {
      entradas.push({
        name: capitalizar(nombre.split(' ').slice(0, 4).join(' ')),
        description: resto.join(', ').trim() || undefined,
      });
    }
  }

  const anotados: string[] = [];
  const repetidos: string[] = [];

  for (const entrada of entradas) {
    const yaExiste = actual.suspects.some(
      (s) => s.name.toLowerCase() === entrada.name.toLowerCase(),
    );
    if (yaExiste) {
      repetidos.push(entrada.name);
      continue;
    }
    const { game: actualizada } = await executeTool(actual, 'upsert_suspect', {
      name: entrada.name,
      description: entrada.description,
      email: emailDetectado,
    });
    if (actualizada) actual = actualizada;
    anotados.push(entrada.name);
  }

  // Una sola frase para todos, en lugar de una por invitado.
  if (anotados.length > 0) {
    hechos.push(`he anotado entre los sospechosos a ${listar(anotados)}`);
  }
  if (repetidos.length > 0) {
    hechos.push(
      `${listar(repetidos)} ya ${repetidos.length === 1 ? 'figuraba' : 'figuraban'} en la lista`,
    );
  }

  return { partida: actual, hechos, panel: 'suspects' };
}

/** Añade las salas detectadas por palabra clave en el texto. */
async function anadirSalas(partida: GameSession, texto: string): Promise<ResultadoDemo> {
  const hechos: string[] = [];
  let actual = partida;
  const minusculas = texto.toLowerCase();
  const nombres = new Set<string>();

  // «sala de billar» / «salón de fumadores» conservan el complemento.
  const conComplemento = minusculas.match(/\b(sala|salón|salon|cuarto)\s+de[l]?\s+([a-záéíóúüñ ]{2,30})/g);
  if (conComplemento) {
    for (const trozo of conComplemento) nombres.add(capitalizar(limpiarNombre(trozo)));
  }
  for (const clave of PALABRAS_SALA) {
    if (clave === 'sala' || clave === 'cuarto') continue;
    if (new RegExp(`\\b${clave}\\b`, 'i').test(minusculas)) {
      nombres.add(capitalizar(clave));
    }
  }

  const registradas: string[] = [];
  const repetidas: string[] = [];

  for (const nombre of nombres) {
    const yaExiste = actual.rooms.some((r) => r.name.toLowerCase() === nombre.toLowerCase());
    if (yaExiste) {
      repetidas.push(nombre);
      continue;
    }
    const { game: actualizada } = await executeTool(actual, 'upsert_room', { name: nombre });
    if (actualizada) actual = actualizada;
    registradas.push(nombre);
  }

  if (registradas.length > 0) {
    hechos.push(
      registradas.length === 1
        ? `he registrado la sala ${registradas[0]}`
        : `he registrado las salas ${listar(registradas)}`,
    );
  }
  if (repetidas.length > 0) {
    hechos.push(
      `${listar(repetidas)} ya ${repetidas.length === 1 ? 'estaba registrada' : 'estaban registradas'}`,
    );
  }

  return { partida: actual, hechos, panel: 'rooms' };
}

/** Añade las armas dictadas tras la palabra «arma(s)». */
async function anadirArmas(partida: GameSession, captura: string): Promise<ResultadoDemo> {
  const hechos: string[] = [];
  let actual = partida;
  const nombres = captura
    .split(/\s*,\s*|\s+y\s+/i)
    .map((n) => limpiarNombre(n))
    .filter(Boolean)
    .map((n) => capitalizar(n.split(' ').slice(0, 4).join(' ')));

  const catalogadas: string[] = [];
  const repetidas: string[] = [];

  for (const nombre of nombres) {
    const yaExiste = actual.weapons.some((w) => w.name.toLowerCase() === nombre.toLowerCase());
    if (yaExiste) {
      repetidas.push(nombre);
      continue;
    }
    const { game: actualizada } = await executeTool(actual, 'upsert_weapon', { name: nombre });
    if (actualizada) actual = actualizada;
    catalogadas.push(nombre);
  }

  if (catalogadas.length > 0) {
    hechos.push(
      catalogadas.length === 1
        ? `he catalogado el arma ${catalogadas[0]}`
        : `he catalogado como objetos sospechosos ${listar(catalogadas)}`,
    );
  }
  if (repetidas.length > 0) {
    hechos.push(
      `${listar(repetidas)} ya ${repetidas.length === 1 ? 'estaba catalogada' : 'estaban catalogadas'}`,
    );
  }

  return { partida: actual, hechos, panel: 'weapons' };
}

/** Resume qué falta para llegar a los mínimos de generación. */
function resumenProgreso(partida: GameSession): string {
  const faltas: string[] = [];
  let totalQueFalta = 0;
  const anotarFalta = (cantidad: number, singular: string, plural: string): void => {
    totalQueFalta += cantidad;
    faltas.push(`${cantidad} ${cantidad === 1 ? singular : plural}`);
  };

  if (partida.suspects.length < MINIMOS.sospechosos) {
    anotarFalta(MINIMOS.sospechosos - partida.suspects.length, 'sospechoso', 'sospechosos');
  }
  if (partida.rooms.length < MINIMOS.salas) {
    anotarFalta(MINIMOS.salas - partida.rooms.length, 'sala', 'salas');
  }
  if (partida.weapons.length < MINIMOS.armas) {
    anotarFalta(MINIMOS.armas - partida.weapons.length, 'arma', 'armas');
  }
  if (faltas.length === 0) {
    return 'La casa está lista: cumplimos los mínimos. Cuando usted lo ordene, digo «genera la trama» y preparo la velada.';
  }
  // El verbo concuerda con lo que falta en total, no con el número de categorías.
  return `Para poder generar la trama aún ${totalQueFalta === 1 ? 'falta' : 'faltan'} ${listar(faltas)}.`;
}

/** Saludo completo: solo cuando el usuario aún no ha dictado nada aprovechable. */
const BIENVENIDA = `Bienvenido a la mansión, si me permite la reverencia. Soy Edmund, su mayordomo y maestro de ceremonias, y le ayudaré a preparar una velada de CLUEDO en vivo.

El plan es sencillo: primero presénteme a los invitados («añade a Marta, tímida pero mordaz»), después las estancias de la casa («apunta la cocina y la biblioteca») y por último los objetos sospechosos («arma: el candelabro de plata»). En cuanto tengamos ${MINIMOS.sospechosos} sospechosos, ${MINIMOS.salas} salas y ${MINIMOS.armas} armas, generaré la trama y los dosieres. ¿Por quién empezamos?

Una advertencia honesta: el servidor no tiene clave de API, así que ahora mismo hablo con un guion de demostración y solo entiendo órdenes sencillas como las de arriba. Con una ANTHROPIC_API_KEY configurada me convierto en el agente completo y podrá pedirme lo que quiera con sus propias palabras.`;

/**
 * Apertura breve cuando la primera intervención ya trae datos que anotar.
 * No repite la presentación: el panel de chat ya ha saludado al abrirse.
 */
const BIENVENIDA_BREVE = 'A su servicio. Tomo nota de inmediato.';

/**
 * Chat demo: reconoce órdenes sencillas, aplica mutaciones reales y responde
 * con un guion en español simulando streaming. Devuelve el texto completo.
 */
export async function runDemoChat(
  game: GameSession,
  userText: string,
  emit: (e: ChatStreamEvent) => void,
): Promise<string> {
  const store = getStore();
  let partida = game;
  const frases: string[] = [];
  let panel: HighlightTarget | undefined;

  // ¿Primera intervención? (la ruta guarda el mensaje del usuario antes de llamarnos)
  let esPrimeraVez = false;
  try {
    const historial = await store.getMessages(game.id);
    esPrimeraVez = historial.length <= 1;
  } catch {
    esPrimeraVez = false;
  }

  const texto = userText.trim();
  const minusculas = texto.toLowerCase();
  const email = texto.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0];

  // --- Reconocimiento de patrones, del más específico al más general ---

  const pideGenerar =
    /\b(genera|generar|generemos|generación|generacion|crea la trama|estamos listos|hemos terminado|todo listo|lanza la velada)\b/i.test(
      minusculas,
    );

  const renombrar = texto.match(
    /(?:la partida se llama|llama a la partida|titula la partida|nombra la partida|bautiza la partida)\s+[«"']?([^«»"'\n]+?)[«»"']?\s*$/i,
  );

  const arma = texto.match(/\barmas?\b\s*[:,]?\s*(.+)$/i);

  const hayPalabraSala = PALABRAS_SALA.some((clave) =>
    new RegExp(`\\b${clave}\\b`, 'i').test(minusculas),
  );

  const anadirPersona = texto.match(
    /(?:añade|añádeme|apunta|agrega|suma|incluye|mete|invita)\s+(?:a\s+)?(.+)$/i,
  );

  // «los jugadores son Ana, Luis y Marta» o «jugadores: (Ana, Luis, Marta)».
  const listaPersonas = texto.match(
    /(?:jugadores|invitados|participantes|sospechosos|comensales|asistentes)\b[^:(\n]*[:(]\s*([^)\n]+)/i,
  );

  if (renombrar?.[1]) {
    const { game: actualizada, result } = await executeTool(partida, 'set_game_name', {
      name: limpiarNombre(renombrar[1]),
    });
    if (actualizada) partida = actualizada;
    frases.push(result.startsWith('Error') ? result : `Como usted disponga: ${result}`);
  } else if (pideGenerar) {
    const { result, ui } = await executeTool(partida, 'start_generation', {});
    if (ui) {
      emit({ type: 'ui', command: ui });
      frases.push(
        'Excelente. Doy la orden a la casa: se está preparando el tablero, la trama y los dosieres. Contenga la respiración, esto promete.',
      );
    } else {
      frases.push(`Todavía no puedo, mi señor. ${result.replace(/^No se puede generar todavía\.\s*/, '')}`);
      panel = 'suspects';
    }
  } else if (arma?.[1]) {
    const resultado = await anadirArmas(partida, arma[1]);
    partida = resultado.partida;
    frases.push(...resultado.hechos);
    panel = resultado.panel;
  } else if (listaPersonas?.[1]) {
    const resultado = await anadirSospechosos(partida, listaPersonas[1], email);
    partida = resultado.partida;
    frases.push(...resultado.hechos);
    panel = resultado.panel;
  } else if (hayPalabraSala) {
    const resultado = await anadirSalas(partida, texto);
    partida = resultado.partida;
    if (resultado.hechos.length > 0) {
      frases.push(...resultado.hechos);
      panel = resultado.panel;
    }
  } else if (anadirPersona?.[1]) {
    const resultado = await anadirSospechosos(partida, anadirPersona[1], email);
    partida = resultado.partida;
    frases.push(...resultado.hechos);
    panel = resultado.panel;
  }

  // --- Notificar entidades y guiar visualmente ---

  if (partida !== game) {
    emit({ type: 'entities', game: partida });
  }
  if (panel) {
    emit({ type: 'ui', command: { kind: 'highlight', target: panel } });
  }
  if (esPrimeraVez) {
    emit({
      type: 'ui',
      command: {
        kind: 'popup',
        title: 'La mansión abre sus puertas',
        body: 'Edmund, el mayordomo, queda a su servicio para preparar la velada. (Modo demo: sin clave de API, con guion local.)',
        tone: 'mystery',
      },
    });
  }

  // --- Componer la respuesta ---

  let respuesta: string;
  if (esPrimeraVez && frases.length === 0) {
    respuesta = BIENVENIDA;
  } else if (frases.length === 0) {
    respuesta = `Disculpe, en modo demo mis oídos son algo limitados. Pruebe con «añade a <nombre>» para un sospechoso, «apunta la cocina» para una sala o «arma: el candelabro» para un objeto. ${resumenProgreso(partida)}`;
  } else {
    const cuerpo = frases
      .map((f) => f.charAt(0).toUpperCase() + f.slice(1))
      .join('. ')
      // Evita el punto doble si la frase ya venía cerrada.
      .replace(/\.\s*$/, '');
    // Si ya hemos anotado algo, el saludo largo sobra: sería recitar el plan
    // y preguntar «¿por quién empezamos?» justo después de apuntar la lista.
    respuesta = `${esPrimeraVez ? `${BIENVENIDA_BREVE}\n\n` : ''}${cuerpo}. ${
      pideGenerar ? '' : resumenProgreso(partida)
    }`.trim();
  }

  await transmitir(respuesta, emit);
  return respuesta;
}
