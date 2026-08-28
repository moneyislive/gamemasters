/**
 * La validación de lo que escribe el modelo para El Misterio de la Momia.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTE FICHERO EXISTE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * El §7 del diseño lo dice sin rodeos: «Si el modelo devuelve una redacción que
 * no corresponde a la restricción que se le pidió, la partida sería irresoluble
 * y nadie se enteraría hasta la noche». Ese es el fallo que hay que hacer
 * imposible. Un fragmento de papiro que diga «el Aliento precede al Agua»
 * cuando la restricción dice lo contrario no rompe nada visible: la partida
 * arranca, la gente explora, reparte, discute — y a las dos de la mañana
 * descubren que no hay ningún orden que cumpla los papiros. Con doce personas
 * alrededor de una mesa, eso no tiene arreglo.
 *
 * Así que cada frase que devuelve el modelo se vuelve a leer con código y se
 * comprueba contra la restricción que se pidió. Cuando no cuadra NO se aborta la
 * generación: se sustituye por la redacción que el código sabe escribir
 * (`redactar`, en `juegos/momia-puzle.ts`). La prosa empeora, el puzle
 * sobrevive. Es la única jerarquía de prioridades que tiene sentido aquí.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUÉ AÑADE ESTO A `mencionaLosRitos`, QUE YA ESTÁ EN EL MOTOR
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Aquella comprueba que la frase nombra los ritos que le tocan. Es la mitad del
 * problema, y la mitad barata. La otra mitad es el SENTIDO: «el Agua precede al
 * Aliento» y «el Agua no llega hasta después del Aliento» nombran exactamente
 * los mismos dos ritos y dicen lo contrario. Aquí se comprueban tres cosas más:
 * que no se cuele ningún rito ajeno, que el que va antes se nombre antes, y que
 * el vocabulario de la frase no invierta la relación.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ LA COMPROBACIÓN ES DE FORMA Y NO DE SEMÁNTICA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * «Entender» una frase en español para saber si expresa «A va antes que B» es
 * exactamente el problema que no se puede resolver con un puñado de expresiones
 * regulares. Lo que sí se puede es imponer una FORMA verificable y pedírsela al
 * modelo en el prompt (ver `momia-prompt.ts`, REGLAS DE REDACCIÓN):
 *
 *   · La frase nombra los ritos implicados y NINGÚN otro.
 *   · En las de orden, el rito que va antes se nombra ANTES en la frase.
 *   · Aparece una palabra del vocabulario de esa forma de restricción.
 *   · No aparece ninguna palabra que invierta el sentido.
 *
 * Con esa forma, «A …precede… B» solo se puede leer de una manera. Una frase
 * correcta que no siga la forma se rechaza y se sustituye: es un falso positivo
 * que cuesta una frase más sosa, no una partida rota. El error caro es el otro,
 * y por eso la asimetría es deliberada.
 */
import { redactar } from '../juegos/momia-puzle';
import type { Restriccion, RestriccionEscrita, RitoId } from '../../../shared/juegos/momia-tipos';

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
 * «nombre», y una frase que diga «el Rito del Nombre ocupa el tercero» habría
 * dado por encontrada una negación que no existe. Se compara token a token, y
 * se admite una `s` final para no rechazar un plural.
 */
function contiene(texto: string, palabras: string[]): boolean {
  const plano = ` ${normalizar(texto)} `;
  return palabras.some((p) => plano.includes(` ${p} `) || plano.includes(` ${p}s `));
}

/**
 * Palabras que no distinguen un rito de otro.
 *
 * «Rito del Agua» y «Rito del Aliento» comparten «rito» y «del»: buscarlas
 * encontraría los cinco ritos en cualquier frase y la comprobación no valdría
 * nada.
 */
const VACIAS = new Set([
  'rito', 'ritos', 'de', 'del', 'la', 'las', 'el', 'los', 'y', 'o', 'a', 'al',
  'un', 'una', 'sellado', 'ceremonia', 'ritual',
]);

/** Los tokens con carga de un nombre de rito. */
function tokensDe(nombre: string): string[] {
  return normalizar(nombre)
    .split(' ')
    .filter((t) => t.length >= 3 && !VACIAS.has(t));
}

// ---------------------------------------------------------------------------
// El léxico de los ritos
// ---------------------------------------------------------------------------

/**
 * Qué palabra identifica a cada rito sin confundirlo con los demás.
 *
 * SI DOS RITOS NO SE PUEDEN DISTINGUIR, LA VALIDACIÓN LO DICE Y NO DISIMULA.
 * El Game Master puede llamar a sus ritos «Rito del Agua Alta» y «Rito del Agua
 * Baja»; entonces ninguna comprobación sobre el texto puede saber de cuál habla
 * una frase, y fingir que sí es peor que admitirlo. En ese caso `fiable` es
 * false y quien llama usa la redacción del código para todo.
 */
export interface LexicoDeRitos {
  /** Por cada rito, sus tokens exclusivos frente a los demás. */
  exclusivos: Map<RitoId, string[]>;
  /** ¿Se puede distinguir a los cinco por el texto? */
  fiable: boolean;
  /** Ritos que se llaman demasiado parecido, si los hay. */
  ambiguos: RitoId[];
  nombres: Map<RitoId, string>;
}

export function lexicoDeRitos(ritos: Array<{ id: RitoId; name: string }>): LexicoDeRitos {
  const todos = new Map<RitoId, string[]>();
  for (const r of ritos) todos.set(r.id, tokensDe(r.name));

  const exclusivos = new Map<RitoId, string[]>();
  const ambiguos: RitoId[] = [];
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
    fiable: ambiguos.length === 0 && ritos.length > 0,
    ambiguos,
    nombres: new Map(ritos.map((r) => [r.id, r.name])),
  };
}

/** Dónde se nombra por primera vez cada rito en la frase, o -1. */
function posicionesDeRitos(texto: string, lexico: LexicoDeRitos): Map<RitoId, number> {
  const plano = ` ${normalizar(texto)} `;
  const salida = new Map<RitoId, number>();
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

/** Los ritos que la frase nombra, en el orden en que aparecen. */
export function ritosMencionados(texto: string, lexico: LexicoDeRitos): RitoId[] {
  return [...posicionesDeRitos(texto, lexico)]
    .filter(([, donde]) => donde >= 0)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);
}

// ---------------------------------------------------------------------------
// El vocabulario de cada forma de restricción
// ---------------------------------------------------------------------------

/* Precedencia: lo que permite leer «A … B» como «A va antes que B». */
const PRECEDENCIA = ['precede', 'preceden', 'antes', 'delante', 'anterior', 'anteriores', 'previo', 'previa'];

/*
 * Posterioridad: si aparece, la frase puede estar diciendo lo contrario.
 *
 * Dos listas y no una. «A no se pronuncia hasta DESPUÉS de B» invierte la
 * relación aunque nombre a A primero, y por eso «después» está prohibida en
 * las dos formas de orden. «B SIGUE a A», en cambio, solo se puede escribir
 * nombrando a B primero, y de eso ya se encarga la regla de orden de mención:
 * prohibir «sigue» en un «justo antes» solo servía para tirar frases buenas
 * como «nada se interpone entre A y B: uno sigue al otro», que es justamente la
 * que escribe el código cuando tiene que sustituir.
 */
const POSTERIORIDAD_DURA = ['despues', 'tras', 'posterior', 'posteriores', 'luego', 'detras', 'ulterior'];
const POSTERIORIDAD_BLANDA = ['sigue', 'siguen', 'seguida', 'seguido'];

/* Inmediatez: lo que distingue «justo antes» de «en algún momento antes». */
const INMEDIATEZ = ['inmediatamente', 'inmediato', 'justo', 'interpone', 'interponen', 'directamente', 'pegado', 'media', 'seguido'];

/* Negación: obligatoria en `no-posicion`, prohibida en `posicion`. */
const NEGACION = ['no', 'ni', 'nunca', 'jamas', 'tampoco', 'ninguna', 'ningun'];

/* Extremos: principio y final. */
const EXTREMOS = ['primero', 'primera', 'ultimo', 'ultima', 'abre', 'cierra', 'principio', 'final', 'extremo'];

/** Cómo se dice cada posición, para las restricciones que fijan un lugar. */
const ORDINALES: Record<number, string[]> = {
  1: ['primero', 'primera', 'primer', '1', 'uno', 'abre', 'apertura'],
  2: ['segundo', 'segunda', '2', 'dos'],
  3: ['tercero', 'tercera', 'tercer', '3', 'tres', 'centro', 'medio'],
  4: ['cuarto', 'cuarta', '4', 'cuatro'],
  5: ['quinto', 'quinta', '5', 'cinco', 'ultimo', 'ultima', 'cierra', 'cierre'],
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
 * ¿Dice esta frase lo que dice esta restricción?
 *
 * Devuelve `bien: false` con el motivo cuando no se puede AFIRMAR que sí.
 * Nótese la asimetría: no comprueba que la frase sea correcta, comprueba que sea
 * INCONFUNDIBLE. Es lo único que se puede garantizar leyendo texto, y basta
 * porque la redacción del código siempre está disponible como recambio.
 */
export function comprobarRedaccion(
  r: Restriccion,
  texto: string,
  lexico: LexicoDeRitos,
): VeredictoDeFrase {
  const limpio = (texto ?? '').trim();
  if (limpio.length < 12) return { bien: false, motivo: 'la frase está vacía o es demasiado corta' };
  if (limpio.split(/\s+/).length > 45) {
    return { bien: false, motivo: 'la frase se va de largo y se vuelve ambigua' };
  }

  const implicados: RitoId[] =
    r.tipo === 'antes' || r.tipo === 'inmediatamente-antes' ? [r.a, r.b] : [r.a];
  const mencionados = ritosMencionados(limpio, lexico);

  // 1. Los ritos correctos, y NINGUNO más. Es la comprobación que atrapa el
  //    fallo caro: una frase que habla de otro rito distinto del pedido.
  for (const id of implicados) {
    if (!mencionados.includes(id)) {
      return { bien: false, motivo: `no nombra «${lexico.nombres.get(id) ?? id}»` };
    }
  }
  const sobrantes = mencionados.filter((id) => !implicados.includes(id));
  if (sobrantes.length > 0) {
    return {
      bien: false,
      motivo: `nombra ritos que no le tocan: ${sobrantes.map((id) => lexico.nombres.get(id) ?? id).join(', ')}`,
    };
  }

  switch (r.tipo) {
    case 'antes':
    case 'inmediatamente-antes': {
      // 2. El que va antes se nombra antes. Sin esta regla, «B no se pronuncia
      //    hasta que A haya corrido» y «A precede a B» son indistinguibles para
      //    el código, y una de las dos lecturas rompe el puzle.
      if (mencionados[0] !== r.a) {
        return {
          bien: false,
          motivo: `nombra primero «${lexico.nombres.get(mencionados[0]!) ?? ''}», y la restricción exige nombrar antes «${lexico.nombres.get(r.a) ?? ''}»`,
        };
      }
      if (contiene(limpio, POSTERIORIDAD_DURA)) {
        return { bien: false, motivo: 'usa una palabra de posterioridad que puede invertir el sentido' };
      }
      if (r.tipo === 'inmediatamente-antes') {
        if (!contiene(limpio, INMEDIATEZ)) {
          return {
            bien: false,
            motivo: 'no dice que sea INMEDIATAMENTE antes: se leería como un «antes» cualquiera',
          };
        }
        return { bien: true };
      }
      // Un «antes» normal necesita su palabra de precedencia y NO puede dar a
      // entender inmediatez: convertiría una restricción floja en una fuerte
      // que no es cierta, y con ella el papiro dejaría de tener solución.
      if (!contiene(limpio, PRECEDENCIA)) {
        return { bien: false, motivo: 'no usa ninguna palabra de precedencia (precede, antes, delante…)' };
      }
      if (contiene(limpio, POSTERIORIDAD_BLANDA)) {
        return { bien: false, motivo: 'usa «sigue», que en un «antes» suelto deja la relación ambigua' };
      }
      if (contiene(limpio, INMEDIATEZ)) {
        return {
          bien: false,
          motivo: 'da a entender que va justo antes, y la restricción solo dice «en algún momento antes»',
        };
      }
      return { bien: true };
    }

    case 'posicion': {
      if (!contiene(limpio, ORDINALES[r.posicion] ?? [])) {
        return { bien: false, motivo: `no dice que ocupe el lugar ${r.posicion}` };
      }
      if (contiene(limpio, NEGACION)) {
        return { bien: false, motivo: 'lleva una negación y se leería como «no ocupa ese lugar»' };
      }
      // Nombrar otro ordinal deja la frase con dos lugares y ninguno claro.
      const propios = new Set(ORDINALES[r.posicion] ?? []);
      const otros = Object.entries(ORDINALES)
        .filter(([n]) => Number(n) !== r.posicion)
        .flatMap(([, palabras]) => palabras)
        .filter((p) => !propios.has(p));
      if (contiene(limpio, otros)) {
        return { bien: false, motivo: 'menciona más de un lugar del sellado' };
      }
      return { bien: true };
    }

    case 'no-posicion': {
      if (!contiene(limpio, ORDINALES[r.posicion] ?? [])) {
        return { bien: false, motivo: `no dice de qué lugar se trata (el ${r.posicion})` };
      }
      if (!contiene(limpio, NEGACION)) {
        return { bien: false, motivo: 'no niega nada: se leería como «ocupa ese lugar», justo lo contrario' };
      }
      return { bien: true };
    }

    case 'extremos': {
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

    default:
      return { bien: false, motivo: 'forma de restricción desconocida' };
  }
}

// ---------------------------------------------------------------------------
// La regla de oro: el orden verdadero no viaja en texto público
// ---------------------------------------------------------------------------

/**
 * ¿Este texto deja leer el orden verdadero de corrido?
 *
 * Un narrador entusiasta que enumere los cinco ritos «tal y como deben
 * pronunciarse» acaba de resolver el juego en la primera vigilia. Es barato
 * comprobarlo: si el texto nombra a los cinco y lo hace exactamente en el orden
 * verdadero, ese texto no puede salir a la mesa.
 */
export function revelaElOrden(
  texto: string,
  lexico: LexicoDeRitos,
  ordenVerdadero: RitoId[],
): boolean {
  if (!lexico.fiable) return false;
  const mencionados = ritosMencionados(texto, lexico);
  if (mencionados.length < ordenVerdadero.length) return false;
  return mencionados.join('>') === ordenVerdadero.join('>');
}

/**
 * ¿Este texto público nombra a quien rompió el sello?
 *
 * Se le pasan los nombres por los que se le puede reconocer: el de la persona
 * real y el de su personaje. Con un nombre compuesto basta un token largo
 * —«Aurelia» identifica a Aurelia Vance—; con uno corto se exige entero, para
 * no dar por delatada a media expedición.
 */
/**
 * Palabras que convierten mencionar a alguien en SEÑALARLE.
 *
 * Normalizadas —sin tildes y en minúscula— porque así llega el texto a la
 * comparación. No pretende ser exhaustivo: pretende cubrir cómo se dice esto en
 * castellano cuando se dice de verdad.
 */
const SENALAMIENTOS = [
  'rompio el sello',
  'rompio el lacre',
  'abrio el sello',
  'abrio la camara sellada',
  'profano',
  'fue quien',
  'fue el',
  'fue ella',
  'el saqueador',
  'la saqueadora',
  'por encargo',
  'vendio',
  'traiciono',
];

/**
 * ¿Este texto SEÑALA a quien rompió el sello?
 *
 * NO ES LO MISMO QUE NOMBRARLE, y la diferencia es todo el juego. Los momentos
 * públicos son de dos o más personas y llevan sus nombres; la presentación de
 * alguien lleva el suyo; la expedición habla del saqueador sin saber que lo es.
 * Nada de eso revela nada, y un filtro que lo borrase dejaría los dosieres
 * llenos de agujeros.
 *
 * Lo que sí revela es «todo el mundo comenta que Fabio rompió el sello aquella
 * noche», que es una frase que el modelo escribe de vez en cuando y que estaba
 * saliendo impresa en la hoja de las otras cinco personas. Así que se exige que
 * el nombre y la acusación estén EN LA MISMA FRASE: es lo que separa hablar de
 * alguien de acusarle.
 */
export function senalaAlSaqueador(texto: string, nombres: string[]): boolean {
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

export function nombraAlSaqueador(texto: string, nombres: string[]): boolean {
  const plano = ` ${normalizar(texto)} `;
  return nombres.some((n) => {
    const limpio = normalizar(n);
    if (!limpio) return false;
    const tokens = limpio.split(' ').filter((t) => t.length >= 4);
    if (tokens.length === 0) return plano.includes(` ${limpio} `);
    return tokens.some((t) => plano.includes(` ${t} `) || plano.includes(` ${t}s `));
  });
}

// ---------------------------------------------------------------------------
// El paso completo sobre una tanda de fragmentos
// ---------------------------------------------------------------------------

/** Lo que se anota cuando algo no cuadra. Va al informe y al script de verificación. */
export interface Incidencia {
  /** Qué pieza de la respuesta. */
  donde: string;
  /** Qué se hizo con ella. */
  arreglo: 'sustituida' | 'aviso';
  motivo: string;
}

export interface RedaccionRevisada {
  fragmentos: RestriccionEscrita[];
  incidencias: Incidencia[];
  /** Cuántas frases venían del modelo y sobrevivieron tal cual. */
  aceptadas: number;
}

/**
 * Revisa la redacción de una tanda de restricciones y devuelve una lista sana.
 *
 * `pedidas` son las restricciones que decidió el CÓDIGO; `escritas`, lo que
 * devolvió el modelo, atado por id. Lo que no cuadre se sustituye. La lista de
 * salida tiene siempre exactamente las mismas restricciones que la de entrada,
 * en el mismo orden: ni una menos, ni una que el modelo se haya inventado.
 */
export function revisarRedaccion(
  pedidas: Array<{ id: string; restriccion: Restriccion }>,
  escritas: Map<string, string>,
  lexico: LexicoDeRitos,
  etiqueta: string,
): RedaccionRevisada {
  const nombre = (id: RitoId): string => lexico.nombres.get(id) ?? id;
  const incidencias: Incidencia[] = [];
  let aceptadas = 0;

  const fragmentos = pedidas.map(({ id, restriccion }) => {
    const delCodigo = redactar(restriccion, nombre);

    /*
     * Con ritos indistinguibles no se puede comprobar NADA sobre el texto, así
     * que no se acepta ninguno. Es una degradación brusca y a propósito, porque
     * la alternativa —aceptar a ciegas— es justo el fallo que este fichero
     * existe para impedir.
     */
    if (!lexico.fiable) {
      incidencias.push({
        donde: `${etiqueta} ${id}`,
        arreglo: 'sustituida',
        motivo: `los ritos «${lexico.ambiguos.map(nombre).join('», «')}» no se distinguen por su nombre: ninguna frase se puede verificar`,
      });
      return { id, restriccion, texto: delCodigo };
    }

    const texto = escritas.get(id);
    if (texto === undefined) {
      incidencias.push({
        donde: `${etiqueta} ${id}`,
        arreglo: 'sustituida',
        motivo: 'el modelo no lo redactó',
      });
      return { id, restriccion, texto: delCodigo };
    }

    const veredicto = comprobarRedaccion(restriccion, texto, lexico);
    if (!veredicto.bien) {
      incidencias.push({
        donde: `${etiqueta} ${id}`,
        arreglo: 'sustituida',
        motivo: veredicto.motivo ?? 'no corresponde a su restricción',
      });
      return { id, restriccion, texto: delCodigo };
    }

    aceptadas++;
    return { id, restriccion, texto: texto.trim() };
  });

  return { fragmentos, incidencias, aceptadas };
}
