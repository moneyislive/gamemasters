/**
 * La validación de lo que escribe el modelo para El Paso de las Sombras.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTE FICHERO EXISTE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * El §7 del diseño lo dice sin rodeos: si el modelo devuelve una redacción que
 * no corresponde a la condición que se le pidió, la partida sería irresoluble y
 * nadie se enteraría hasta la noche. Un hito que diga «el Collado va antes que
 * el Vado» cuando la condición dice lo contrario no rompe nada visible: la
 * noche arranca, la gente se mueve, discute — y a las dos de la mañana descubren
 * que no hay ninguna senda que cumpla los mojones. Con doce personas de pie en
 * un pasillo, eso no tiene arreglo.
 *
 * Así que cada frase se vuelve a leer con código y se comprueba contra la
 * condición que se pidió. Cuando no cuadra NO se aborta la generación: se
 * sustituye por la redacción que el código sabe escribir (`redactarHito`, en
 * `juegos/sombras-senda.ts`). La prosa empeora, el rompecabezas sobrevive. Es la
 * única jerarquía de prioridades que tiene sentido aquí.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ LA COMPROBACIÓN ES DE FORMA Y NO DE SEMÁNTICA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * «Entender» una frase en español para saber si expresa «A va antes que B» es
 * exactamente el problema que no se puede resolver con un puñado de expresiones
 * regulares. Lo que sí se puede es imponer una FORMA verificable y pedírsela al
 * modelo en el prompt (ver `sombras-prompt.ts`, REGLAS DE REDACCIÓN):
 *
 *   · La frase nombra los pasos implicados y NINGÚN otro.
 *   · En las de orden, el paso que va antes se nombra ANTES en la frase.
 *   · Aparece una palabra del vocabulario de esa forma de condición.
 *   · No aparece ninguna palabra que invierta el sentido.
 *
 * Con esa forma, «A …antes que… B» solo se puede leer de una manera. Una frase
 * correcta que no siga la forma se rechaza y se sustituye: es un falso positivo
 * que cuesta una frase más sosa, no una partida rota. El error caro es el otro,
 * y por eso la asimetría es deliberada.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LAS DOS FORMAS QUE LA MOMIA NO TENÍA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `pasa-por` y `no-pasa-por` dicen si un paso entra o no en la senda, y son la
 * mitad nueva del rompecabezas. Se distinguen SOLO por la negación, así que aquí
 * la negación deja de ser un detalle y pasa a ser la comprobación entera: una
 * frase de pertenencia con un «no» suelto dentro afirma lo contrario de lo que
 * se pidió, y el camino se queda sin solución. Por eso `pasa-por` exige que NO
 * haya ninguna negación en toda la frase, y su redacción de código está escrita
 * para cumplirlo.
 */
import { redactarHito } from '../juegos/sombras-senda';
import type { Condicion, CondicionEscrita, PasoId } from '../../../shared/juegos/sombras-tipos';

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------

/** Minúsculas, sin acentos y con los signos convertidos en espacios. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();
}

/**
 * ¿Aparece alguna de estas palabras COMO PALABRA?
 *
 * Buscar subcadenas aquí sería un desastre silencioso: « no » está dentro de
 * «nombre», y una frase que diga «el Collado del Nombre es el tercero» habría
 * dado por encontrada una negación que no existe. Se compara token a token, y
 * se admite una `s` final para no rechazar un plural.
 */
function contiene(texto: string, palabras: string[]): boolean {
  const plano = ` ${normalizar(texto)} `;
  return palabras.some((p) => plano.includes(` ${p} `) || plano.includes(` ${p}s `));
}

/**
 * Palabras que no distinguen un paso de otro.
 *
 * Solo verdaderas palabras vacías. NO se meten aquí los términos geográficos
 * —vado, collado, puerto, bosque— aunque tiente: en una casa donde haya «El Vado
 * del Kizu» y «El Vado de Otogi», la palabra que distingue es justamente la otra,
 * y el algoritmo de tokens exclusivos ya se encarga de descartar lo compartido.
 * Meterlos aquí solo serviría para tirar información que a veces es la única que
 * hay.
 */
const VACIAS = new Set([
  'paso', 'pasos', 'de', 'del', 'la', 'las', 'el', 'los', 'y', 'o', 'a', 'al',
  'un', 'una', 'senda', 'camino', 'ruta', 'tramo', 'tramos', 'hito', 'hitos',
]);

/** Los tokens con carga de un nombre de paso. */
function tokensDe(nombre: string): string[] {
  return normalizar(nombre)
    .split(' ')
    .filter((t) => t.length >= 3 && !VACIAS.has(t));
}

// ---------------------------------------------------------------------------
// El léxico de los pasos
// ---------------------------------------------------------------------------

/**
 * Qué palabra identifica a cada paso sin confundirlo con los demás.
 *
 * SI DOS PASOS NO SE PUEDEN DISTINGUIR, LA VALIDACIÓN LO DICE Y NO DISIMULA.
 * Quien organiza puede llamar a sus pasos «El pasillo largo» y «El pasillo
 * corto»; entonces ninguna comprobación sobre el texto puede saber de cuál habla
 * una frase, y fingir que sí es peor que admitirlo. En ese caso `fiable` es
 * false y quien llama usa la redacción del código para todo.
 */
export interface LexicoDePasos {
  /** Por cada paso, sus tokens exclusivos frente a los demás. */
  exclusivos: Map<PasoId, string[]>;
  /** ¿Se pueden distinguir todos por el texto? */
  fiable: boolean;
  /** Pasos que se llaman demasiado parecido, si los hay. */
  ambiguos: PasoId[];
  nombres: Map<PasoId, string>;
}

export function lexicoDePasos(pasos: Array<{ id: PasoId; name: string }>): LexicoDePasos {
  const todos = new Map<PasoId, string[]>();
  for (const p of pasos) todos.set(p.id, tokensDe(p.name));

  const exclusivos = new Map<PasoId, string[]>();
  const ambiguos: PasoId[] = [];
  for (const [id, tokens] of todos) {
    const otros = new Set<string>();
    for (const [otroId, otrosTokens] of todos) {
      if (otroId !== id) otrosTokens.forEach((t) => otros.add(t));
    }
    const propios = tokens.filter((t) => !otros.has(t));
    exclusivos.set(id, propios);
    if (propios.length === 0) ambiguos.push(id);
  }

  return {
    exclusivos,
    fiable: ambiguos.length === 0 && pasos.length > 0,
    ambiguos,
    nombres: new Map(pasos.map((p) => [p.id, p.name])),
  };
}

/** Dónde se nombra por primera vez cada paso en la frase, o -1. */
function posicionesDePasos(texto: string, lexico: LexicoDePasos): Map<PasoId, number> {
  const plano = ` ${normalizar(texto)} `;
  const salida = new Map<PasoId, number>();
  for (const [id, tokens] of lexico.exclusivos) {
    let mejor = -1;
    for (const token of tokens) {
      for (const forma of [` ${token} `, ` ${token}s `]) {
        const donde = plano.indexOf(forma);
        if (donde >= 0 && (mejor === -1 || donde < mejor)) mejor = donde;
      }
    }
    salida.set(id, mejor);
  }
  return salida;
}

/** Los pasos que la frase nombra, en el orden en que aparecen. */
export function pasosMencionados(texto: string, lexico: LexicoDePasos): PasoId[] {
  return [...posicionesDePasos(texto, lexico)]
    .filter(([, donde]) => donde >= 0)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);
}

// ---------------------------------------------------------------------------
// El vocabulario de cada forma de condición
// ---------------------------------------------------------------------------

/* Precedencia: lo que permite leer «A … B» como «A va antes que B». */
const PRECEDENCIA = ['precede', 'preceden', 'antes', 'delante', 'anterior', 'anteriores', 'previo', 'previa'];

/*
 * Posterioridad: si aparece, la frase puede estar diciendo lo contrario.
 *
 * Dos listas y no una. «A no se cruza hasta DESPUÉS de B» invierte la relación
 * aunque nombre a A primero, y por eso «después» está prohibida en las dos
 * formas de orden. «B SIGUE a A», en cambio, solo se puede escribir nombrando a
 * B primero, y de eso ya se encarga la regla de orden de mención.
 */
const POSTERIORIDAD_DURA = ['despues', 'tras', 'posterior', 'posteriores', 'luego', 'detras', 'ulterior'];
const POSTERIORIDAD_BLANDA = ['sigue', 'siguen', 'seguida', 'seguido'];

/* Inmediatez: lo que distingue «justo antes» de «en algún momento antes». */
const INMEDIATEZ = [
  'inmediatamente', 'inmediato', 'justo', 'interpone', 'interponen', 'directamente',
  'directo', 'pegado', 'pegados', 'derecho', 'seguido',
];

/* Negación. Obligatoria en `no-posicion` y `no-pasa-por`, prohibida en sus gemelas. */
const NEGACION = ['no', 'ni', 'nunca', 'jamas', 'tampoco', 'ninguna', 'ningun', 'sin'];

/* Extremos: principio y final. */
const EXTREMOS = ['primero', 'primera', 'ultimo', 'ultima', 'abre', 'cierra', 'principio', 'final', 'extremo'];

/* Pertenencia: lo que hace que una frase hable de estar o no estar en la senda. */
const PERTENENCIA = [
  'pasa', 'pasan', 'cruza', 'cruzan', 'atraviesa', 'lleva', 'llevan', 'conduce',
  'entra', 'forma', 'parte', 'pisa', 'pisan', 'toca', 'incluye',
];

/** Cómo se dice cada posición, para las condiciones que fijan un tramo. */
const ORDINALES: Record<number, string[]> = {
  1: ['primero', 'primera', 'primer', '1', 'uno', 'abre', 'apertura'],
  2: ['segundo', 'segunda', '2', 'dos'],
  3: ['tercero', 'tercera', 'tercer', '3', 'tres'],
  4: ['cuarto', 'cuarta', '4', 'cuatro', 'ultimo', 'ultima', 'cierra', 'cierre'],
};

// ---------------------------------------------------------------------------
// La comprobación
// ---------------------------------------------------------------------------

export interface VeredictoDeFrase {
  bien: boolean;
  /** Por qué se rechaza, en una frase legible para el informe. */
  motivo?: string;
}

/**
 * ¿Dice esta frase lo que dice esta condición?
 *
 * Devuelve `bien: false` con el motivo cuando no se puede AFIRMAR que sí. Nótese
 * la asimetría: no comprueba que la frase sea correcta, comprueba que sea
 * INCONFUNDIBLE. Es lo único que se puede garantizar leyendo texto, y basta
 * porque la redacción del código siempre está disponible como recambio.
 */
export function comprobarRedaccion(
  c: Condicion,
  texto: string,
  lexico: LexicoDePasos,
): VeredictoDeFrase {
  const limpio = (texto ?? '').trim();
  if (limpio.length < 12) return { bien: false, motivo: 'la frase está vacía o es demasiado corta' };
  if (limpio.split(/\s+/).length > 45) {
    return { bien: false, motivo: 'la frase se va de largo y se vuelve ambigua' };
  }

  const implicados: PasoId[] = c.tipo === 'antes' || c.tipo === 'seguido' ? [c.a, c.b] : [c.a];
  const mencionados = pasosMencionados(limpio, lexico);

  /*
   * 1. Los pasos correctos, y NINGUNO más. Es la comprobación que atrapa el
   *    fallo caro: una frase que habla de otro paso distinto del pedido.
   */
  for (const id of implicados) {
    if (!mencionados.includes(id)) {
      return { bien: false, motivo: `no nombra «${lexico.nombres.get(id) ?? id}»` };
    }
  }
  const sobrantes = mencionados.filter((id) => !implicados.includes(id));
  if (sobrantes.length > 0) {
    return {
      bien: false,
      motivo: `nombra pasos que no le tocan: ${sobrantes.map((id) => lexico.nombres.get(id) ?? id).join(', ')}`,
    };
  }

  switch (c.tipo) {
    case 'antes':
    case 'seguido': {
      /*
       * 2. El que va antes se nombra antes. Sin esta regla, «B no se cruza hasta
       *    que A haya quedado atrás» y «A va antes que B» son indistinguibles
       *    para el código, y una de las dos lecturas rompe el camino.
       */
      if (mencionados[0] !== c.a) {
        return {
          bien: false,
          motivo: `nombra primero «${lexico.nombres.get(mencionados[0]!) ?? ''}», y la condición exige nombrar antes «${lexico.nombres.get(c.a) ?? ''}»`,
        };
      }
      if (contiene(limpio, POSTERIORIDAD_DURA)) {
        return { bien: false, motivo: 'usa una palabra de posterioridad que puede invertir el sentido' };
      }
      if (c.tipo === 'seguido') {
        if (!contiene(limpio, INMEDIATEZ)) {
          return {
            bien: false,
            motivo: 'no dice que se vaya DIRECTAMENTE de uno al otro: se leería como un «antes» cualquiera',
          };
        }
        return { bien: true };
      }
      /*
       * Un «antes» normal necesita su palabra de precedencia y NO puede dar a
       * entender inmediatez: convertiría una condición floja en una fuerte que no
       * es cierta, y con ella el camino dejaría de tener solución.
       */
      if (!contiene(limpio, PRECEDENCIA)) {
        return { bien: false, motivo: 'no usa ninguna palabra de precedencia (antes, precede, delante…)' };
      }
      if (contiene(limpio, POSTERIORIDAD_BLANDA)) {
        return { bien: false, motivo: 'usa «sigue», que en un «antes» suelto deja la relación ambigua' };
      }
      if (contiene(limpio, INMEDIATEZ)) {
        return {
          bien: false,
          motivo: 'da a entender que va justo antes, y la condición solo dice «en algún momento antes»',
        };
      }
      return { bien: true };
    }

    case 'posicion': {
      if (!contiene(limpio, ORDINALES[c.posicion] ?? [])) {
        return { bien: false, motivo: `no dice que ocupe el tramo ${c.posicion}` };
      }
      if (contiene(limpio, NEGACION)) {
        return { bien: false, motivo: 'lleva una negación y se leería como «no es ese tramo»' };
      }
      // Nombrar otro ordinal deja la frase con dos tramos y ninguno claro.
      const propios = new Set(ORDINALES[c.posicion] ?? []);
      const otros = Object.entries(ORDINALES)
        .filter(([n]) => Number(n) !== c.posicion)
        .flatMap(([, palabras]) => palabras)
        .filter((p) => !propios.has(p));
      if (contiene(limpio, otros)) {
        return { bien: false, motivo: 'menciona más de un tramo de la senda' };
      }
      return { bien: true };
    }

    case 'no-posicion': {
      if (!contiene(limpio, ORDINALES[c.posicion] ?? [])) {
        return { bien: false, motivo: `no dice de qué tramo se trata (el ${c.posicion})` };
      }
      if (!contiene(limpio, NEGACION)) {
        return { bien: false, motivo: 'no niega nada: se leería como «es ese tramo», justo lo contrario' };
      }
      return { bien: true };
    }

    case 'extremo': {
      const niegaElMedio =
        contiene(limpio, ['medio', 'intermedio', 'centro', 'mitad']) && contiene(limpio, NEGACION);
      const cuantosExtremos = EXTREMOS.filter((p) => contiene(limpio, [p])).length;
      if (!niegaElMedio && cuantosExtremos < 2) {
        return {
          bien: false,
          motivo:
            'no deja claro que sea el primero O el último: hace falta nombrar los dos extremos, o negar el medio',
        };
      }
      return { bien: true };
    }

    /*
     * LAS DOS DE PERTENENCIA. Se distinguen SOLO por la negación, así que aquí
     * la negación es la comprobación entera y se aplica a la frase completa, sin
     * matices: un «sin» o un «ni» perdidos en una subordinada de `pasa-por`
     * bastan para que la frase afirme lo contrario, y entonces el camino se
     * queda sin solución sin que nada dé error.
     */
    case 'pasa-por': {
      if (!contiene(limpio, PERTENENCIA)) {
        return {
          bien: false,
          motivo: 'no dice que la senda pase por ahí (pasa, cruza, forma parte…)',
        };
      }
      if (contiene(limpio, NEGACION)) {
        return {
          bien: false,
          motivo: 'lleva una negación, y esta condición AFIRMA que la senda pasa por ese paso',
        };
      }
      return { bien: true };
    }

    case 'no-pasa-por': {
      if (!contiene(limpio, PERTENENCIA)) {
        return {
          bien: false,
          motivo: 'no dice nada de pasar o no pasar: se leería como cualquier otra cosa',
        };
      }
      if (!contiene(limpio, NEGACION)) {
        return {
          bien: false,
          motivo: 'no niega nada: se leería como «la senda pasa por ahí», justo lo contrario',
        };
      }
      return { bien: true };
    }

    default:
      return { bien: false, motivo: 'forma de condición desconocida' };
  }
}

// ---------------------------------------------------------------------------
// La regla de oro: la senda verdadera no viaja en texto público
// ---------------------------------------------------------------------------

/**
 * ¿Este texto deja leer la senda verdadera de corrido?
 *
 * Un narrador entusiasta que enumere los cuatro pasos «en el orden en que hay
 * que andarlos» acaba de resolver el juego en la primera hora. Es barato
 * comprobarlo: si el texto nombra a los cuatro y lo hace exactamente en el orden
 * verdadero, ese texto no puede salir a la mesa.
 */
export function revelaLaSenda(
  texto: string,
  lexico: LexicoDePasos,
  senda: PasoId[],
): boolean {
  if (!lexico.fiable) return false;
  const mencionados = pasosMencionados(texto, lexico);
  if (mencionados.length < senda.length) return false;
  return mencionados.join('>') === senda.join('>');
}

/**
 * Palabras que convierten mencionar a alguien en SEÑALARLE.
 *
 * Normalizadas —sin tildes y en minúscula— porque así llega el texto a la
 * comparación. Son deliberadamente ESPECÍFICAS: las genéricas del tipo «fue él»
 * cazan frases inocentes a puñados, y cada falso positivo se paga con un texto
 * sustituido por el recambio. Aquí el coste de pasarse es más alto que el de
 * quedarse corto, porque el chequeo del nombre a secas cubre los sitios donde el
 * kanchō no puede salir en absoluto.
 */
const SENALAMIENTOS = [
  'cobra de akechi',
  'cobraba de akechi',
  'paga akechi',
  'pagado por akechi',
  'a sueldo de akechi',
  'trabaja para akechi',
  'es el kancho',
  'el kancho',
  'el infiltrado',
  'el espia',
  'la espia',
  'por encargo',
  'traiciono',
  'delato',
  'vendio a la columna',
  'vendio al senor',
];

/**
 * ¿Este texto SEÑALA a quien cobra de Akechi?
 *
 * NO ES LO MISMO QUE NOMBRARLE, y la diferencia es todo el juego. Los momentos
 * públicos son de dos o más personas y llevan sus nombres; la presentación de
 * alguien lleva el suyo; la columna habla del infiltrado sin saber quién es.
 * Nada de eso revela nada, y un filtro que lo borrase dejaría los dosieres
 * llenos de agujeros.
 *
 * Lo que sí revela es «todo el mundo dice que Bruno cobra de Akechi», que es una
 * frase que el modelo escribe de vez en cuando. Así que se exige que el nombre y
 * la acusación estén EN LA MISMA FRASE: es lo que separa hablar de alguien de
 * acusarle.
 */
export function senalaAlKancho(texto: string, nombres: string[]): boolean {
  const limpios = nombres.map((n) => normalizar(n)).filter(Boolean);
  if (limpios.length === 0) return false;

  for (const frase of normalizar(texto).split(/[.;:!?\n]+/)) {
    const conBordes = ` ${frase} `;
    const nombra = limpios.some((n) => {
      const tokens = n.split(' ').filter((t) => t.length >= 4);
      if (tokens.length === 0) return conBordes.includes(` ${n} `);
      return tokens.some((t) => conBordes.includes(` ${t} `) || conBordes.includes(` ${t}s `));
    });
    if (nombra && SENALAMIENTOS.some((m) => conBordes.includes(m))) return true;
  }
  return false;
}

/** ¿Aparece el nombre de quien cobra de Akechi, sea en el contexto que sea? */
export function nombraAlKancho(texto: string, nombres: string[]): boolean {
  const plano = ` ${normalizar(texto)} `;
  return nombres.some((n) => {
    const limpio = normalizar(n);
    if (!limpio) return false;
    const tokens = limpio.split(' ').filter((t) => t.length >= 4);
    if (tokens.length === 0) return plano.includes(` ${limpio} `);
    return tokens.some((t) => plano.includes(` ${t} `) || plano.includes(` ${t}s `));
  });
}

/**
 * ¿Este texto dice dónde estarán los cazadores?
 *
 * ES UNA COMPROBACIÓN QUE LA MOMIA NO NECESITABA, y este juego sí: allí la
 * cámara profanada se anuncia en voz alta al abrir la vigilia, así que una
 * narración que la nombrara no revelaba nada. Aquí el paso batido es SECRETO
 * hasta que se cierra la hora, y una narración que diga «los cazadores esperan
 * en el Vado» apaga la mitad del juego —la exploración deja de ser una apuesta—
 * y deja sin sentido dos de los seis disfraces.
 *
 * Se mira que la frase nombre el paso batido de esa hora Y una palabra de
 * emboscada. Nombrar el paso a secas es legítimo y frecuente: la narración habla
 * del camino.
 */
const EMBOSCADA = [
  'cazadores', 'emboscada', 'emboscados', 'esperan', 'esperando', 'apostados',
  'batido', 'batida', 'campesinos', 'partida', 'lanzas', 'acechan', 'acechando',
];

export function revelaLosCazadores(
  texto: string,
  lexico: LexicoDePasos,
  pasoBatidoId: string | undefined,
): boolean {
  if (!pasoBatidoId || !lexico.fiable) return false;
  for (const frase of normalizar(texto).split(/[.;:!?\n]+/)) {
    const nombra = pasosMencionados(frase, lexico).includes(pasoBatidoId);
    if (nombra && contiene(frase, EMBOSCADA)) return true;
  }
  return false;
}

/**
 * ¿Habla este texto de una emboscada, sea donde sea?
 *
 * ES LA VERSIÓN SIN LUGAR de la de arriba, y hace falta para UN sitio concreto:
 * la inscripción del cartel de un paso. Allí el lugar es implícito —el cartel
 * está clavado en esa puerta— así que el texto no tiene por qué nombrarlo, y
 * `revelaLosCazadores` no dispara nunca. Un cartel que ponga «aquí acechan los
 * campesinos con lanzas» apaga la decisión de esa hora sin nombrar nada.
 *
 * Se aplica a las inscripciones y a nada más: en una narración, hablar de
 * cazadores en general es legítimo y hasta necesario —de eso va la noche—; lo
 * que no puede es decir DÓNDE, y de eso se encarga la otra.
 */
export function anunciaEmboscada(texto: string): boolean {
  return contiene(texto, EMBOSCADA);
}

// ---------------------------------------------------------------------------
// El paso completo sobre una tanda de hitos
// ---------------------------------------------------------------------------

/** Lo que se anota cuando algo no cuadra. Va al informe y al verificador. */
export interface Incidencia {
  /** Qué pieza de la respuesta. */
  donde: string;
  /** Qué se hizo con ella. */
  arreglo: 'sustituida' | 'aviso';
  motivo: string;
}

export interface RedaccionRevisada {
  hitos: CondicionEscrita[];
  incidencias: Incidencia[];
  /** Cuántas frases venían del modelo y sobrevivieron tal cual. */
  aceptadas: number;
}

/**
 * Revisa la redacción de una tanda de condiciones y devuelve una lista sana.
 *
 * `pedidas` son las condiciones que decidió el CÓDIGO; `escritas`, lo que
 * devolvió el modelo, atado por id. Lo que no cuadre se sustituye. La lista de
 * salida tiene siempre exactamente las mismas condiciones que la de entrada, en
 * el mismo orden: ni una menos, ni una que el modelo se haya inventado.
 */
export function revisarRedaccion(
  pedidas: Array<{ id: string; condicion: Condicion }>,
  escritas: Map<string, string>,
  lexico: LexicoDePasos,
  etiqueta: string,
): RedaccionRevisada {
  const nombre = (id: PasoId): string => lexico.nombres.get(id) ?? id;
  const incidencias: Incidencia[] = [];
  let aceptadas = 0;

  const hitos = pedidas.map(({ id, condicion }) => {
    const delCodigo = redactarHito(condicion, nombre);

    /*
     * Con pasos indistinguibles no se puede comprobar NADA sobre el texto, así
     * que no se acepta ninguno. Es una degradación brusca y a propósito, porque
     * la alternativa —aceptar a ciegas— es justo el fallo que este fichero
     * existe para impedir.
     */
    if (!lexico.fiable) {
      incidencias.push({
        donde: `${etiqueta} ${id}`,
        arreglo: 'sustituida',
        motivo: `los pasos «${lexico.ambiguos.map(nombre).join('», «')}» no se distinguen por su nombre: ninguna frase se puede verificar`,
      });
      return { id, condicion, texto: delCodigo };
    }

    const texto = escritas.get(id);
    if (texto === undefined) {
      incidencias.push({
        donde: `${etiqueta} ${id}`,
        arreglo: 'sustituida',
        motivo: 'el modelo no lo redactó',
      });
      return { id, condicion, texto: delCodigo };
    }

    const veredicto = comprobarRedaccion(condicion, texto, lexico);
    if (!veredicto.bien) {
      incidencias.push({
        donde: `${etiqueta} ${id}`,
        arreglo: 'sustituida',
        motivo: veredicto.motivo ?? 'no corresponde a su condición',
      });
      return { id, condicion, texto: delCodigo };
    }

    aceptadas++;
    return { id, condicion, texto: texto.trim() };
  });

  return { hitos, incidencias, aceptadas };
}
