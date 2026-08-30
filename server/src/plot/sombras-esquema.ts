/**
 * El esquema con el que se le pide al modelo la trama de El Paso de las Sombras.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE ESTE ESQUEMA *NO* PIDE, Y ES LA DECISIÓN QUE LO EXPLICA TODO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * No pide condiciones. No pide la senda. No pide qué paso baten los cazadores
 * cada hora, ni quién lleva qué disfraz, ni —sobre todo— las contraseñas de las
 * puertas. Nada de eso está aquí, y no es un olvido: es la línea del §7 del
 * diseño. El rompecabezas de este juego es una selección ordenada de cuatro
 * pasos que se deduce combinando pistas parciales, y un conjunto de condiciones
 * mal formado —contradictorio, o con dos soluciones— produce una noche
 * IRRESOLUBLE que nadie descubre hasta que hay doce personas de pie en un
 * pasillo. Un modelo acierta casi siempre; «casi siempre» es exactamente la
 * garantía que no sirve aquí.
 *
 * LAS CONTRASEÑAS MERECEN UNA LÍNEA APARTE. Podrían pedirse: son palabras, y el
 * modelo escribe palabras. No se piden porque hay que TECLEARLAS en un móvil, de
 * pie, a oscuras y a veces con una mano. Un modelo con ganas de lucirse
 * escribiría «Kagerō no michi» y la mecánica se vendría abajo la primera vez que
 * alguien no acertara con la ō. Las pone el código, de una tabla de dieciséis
 * palabras cortas y sin acentos.
 *
 * Así que la lógica la genera código (`juegos/sombras-senda.ts`) y este esquema
 * pide SOLO el sabor: quién es el señor, qué esconde cada persona de la columna,
 * por qué duele el motivo del kanchō, y **cómo se lee** cada condición cuando
 * está escrita en un mojón de piedra.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ UNA SOLA LLAMADA, Y NO DOS COMO EN CLUEDO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CLUEDO parte la generación en dos porque la primera llamada rozaba su límite
 * de tokens y porque el material se puede añadir después a una trama ya escrita.
 * Aquí se hace en una sola, y la razón es del juego, no de la infraestructura:
 *
 *   Los hitos FALSOS tienen que sonar exactamente igual que los verdaderos. Si
 *   se escriben en otra llamada —o peor, en caliente durante la partida— salen
 *   con otro tono, y una pista que suena distinta a las demás se delata sola.
 *   Todo el juego adversarial se cae.
 *
 * Por eso `hitos` es UNA lista plana, verdaderos y falsos mezclados, en la que el
 * modelo no sabe cuál es cuál —ni le hace falta—. No puede filtrar lo que no
 * sabe.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Y HAY UN TECHO: ESTE ESQUEMA TIENE QUE CABER
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Con `output_config.format` la API compila el esquema a una gramática, y si sale
 * demasiado grande RECHAZA la petición entera con un 400 —«The compiled grammar
 * is too large»— antes de escribir una palabra. Al esquema de la Momia le pasó:
 * la generación estaba rota contra la API de verdad y no se vio, porque sin clave
 * se cae al modo demo y porque las pruebas puras no salen a la red.
 *
 * Este esquema se ha escrito CON ESE TECHO DELANTE y sale más pequeño que el de
 * la Momia: diecisiete campos de primer nivel en vez de dieciocho, y uno de sus
 * objetos anidados —«la noche de Honnō-ji»— es aquí una cadena suelta.
 *
 * ANTES DE AÑADIR CAMPOS AQUÍ, comprueba que la gramática sigue compilando:
 * basta una llamada con `max_tokens` mínimo y este esquema; el 400 llega en la
 * validación y no cuesta tokens. Lo que NO sirve es fiarse de la suite: ninguna
 * de sus comprobaciones llama a la API. El techo es del servicio, no del modelo
 * — cambiar de modelo no lo levanta.
 */

// ---------------------------------------------------------------------------
// La forma de lo que devuelve el modelo
// ---------------------------------------------------------------------------

/** El dosier de una persona real, escrito a su medida. */
export interface EscoltaEscrito {
  participanteId: string;
  characterName: string;
  role: string;
  publicPersona: string;
  secret: string;
  motive: string;
  alibi: string;
  knowledge: string[];
  personalHook: string;
  /**
   * Cómo se justifica su disfraz en la ficción, escrito para esa persona.
   *
   * No es el disfraz (lo reparte el código): es la frase que explica por qué
   * precisamente ella va de yamabushi, o de comerciante, o de juglar. Sin esto el
   * dosier dice «tu disfraz es amparar» y suena a manual de instrucciones.
   */
  elDisfraz: string;
}

/** Un hito, tal y como el modelo lo redacta. */
export interface HitoEscrito {
  /** El id EXACTO que se le pidió redactar. Es como se vuelve a atar a su condición. */
  id: string;
  texto: string;
}

/** La narración de una hora, para leerse en voz alta. */
export interface HoraEscrita {
  ronda: number;
  titulo: string;
  texto: string;
  indicacion: string;
}

/** La respuesta completa del modelo. Sabor, y solo sabor. */
export interface RespuestaSombras {
  title: string;
  tagline: string;
  synopsis: string;
  senor: { nombre: string; descripcion: string };
  ambientacion: string;
  laNocheDeHonnoji: string;
  /** Id EXACTO de una persona de la columna. Es la respuesta del único eje. */
  kanchoId: string;
  motivoDelKancho: string;
  comoOcurrio: string;
  escoltas: EscoltaEscrito[];
  pasos: Array<{ pasoId: string; inscripcion: string }>;
  hitos: HitoEscrito[];
  horas: HoraEscrita[];
  cronologia: Array<{
    hora: string;
    descripcion: string;
    escoltaIds: string[];
    publico: boolean;
  }>;
  ayudas: Array<{ nivel: number; texto: string }>;
  desenlace: { reconstruccion: string; confesion: string; epilogo: string };
  guion: string[];
}

// ---------------------------------------------------------------------------
// El esquema JSON
// ---------------------------------------------------------------------------

/*
 * Mismas reglas que `PLOT_SCHEMA` y que el de la Momia, y por el mismo motivo:
 * las salidas estructuradas exigen `additionalProperties: false`, `required`
 * completo en cada nivel y nada de `minLength`/`minimum`. Las longitudes se
 * piden en las descripciones, que el modelo sí lee.
 */

const ESCOLTA_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'participanteId',
    'characterName',
    'role',
    'publicPersona',
    'secret',
    'motive',
    'alibi',
    'knowledge',
    'personalHook',
    'elDisfraz',
  ],
  properties: {
    participanteId: { type: 'string', description: 'Id EXACTO de la persona real a la que corresponde este dosier' },
    characterName: {
      type: 'string',
      description:
        'Nombre del personaje dentro de la ficción de 1582. Puede fundir el nombre real de la persona. Nombres japoneses del periodo, salvo que el nombre real pida otra cosa.',
    },
    role: {
      type: 'string',
      description:
        'Su puesto en la columna: paje del señor, lancero de Mikawa, guía de Iga, criado de Chaya, hija de un mercader de Sakai…',
    },
    publicPersona: {
      type: 'string',
      description: 'Lo que cualquiera de la columna sabe de esta persona. 2-4 frases.',
    },
    secret: {
      type: 'string',
      description:
        'Lo que oculta y solo lee quien recibe este dosier. Tiene que dar juego sin rozar la vida real de la persona. 2-4 frases.',
    },
    motive: {
      type: 'string',
      description:
        'Qué ganaría si el señor NO llegara a la barca. Todo el mundo tiene uno: es lo que hace que cualquiera pueda ser el infiltrado.',
    },
    alibi: {
      type: 'string',
      description:
        'Dónde dice haber estado cuando llegó la noticia de Honnō-ji, cruzada con la de otra persona concreta a la que nombra.',
    },
    knowledge: {
      type: 'array',
      description:
        'De dos a cuatro cosas que sabe de OTROS de la columna y puede soltar en la mesa. Cada una nombra a alguien.',
      items: { type: 'string' },
    },
    personalHook: {
      type: 'string',
      description:
        'Cómo se ha adaptado el papel a la psicología REAL de esta persona, según lo que quien organiza contó de ella. Cita ese rasgo.',
    },
    elDisfraz: {
      type: 'string',
      description:
        'Por qué en la ficción esta persona lleva el disfraz que se le ha asignado, en 1-2 frases y en segunda persona. NO cambies el disfraz: viene dado.',
    },
  },
};

export const SOMBRAS_TRAMA_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'tagline',
    'synopsis',
    'senor',
    'ambientacion',
    'laNocheDeHonnoji',
    'kanchoId',
    'motivoDelKancho',
    'comoOcurrio',
    'escoltas',
    'pasos',
    'hitos',
    'horas',
    'cronologia',
    'ayudas',
    'desenlace',
    'guion',
  ],
  properties: {
    title: { type: 'string', description: 'Título de la noche, evocador y japonés, en español' },
    tagline: { type: 'string', description: 'Frase de gancho para la portada de los dosieres' },
    synopsis: {
      type: 'string',
      description:
        'Sinopsis PÚBLICA: qué ha pasado en Kioto, por qué hay que cruzar Iga y qué espera al otro lado. NO nombra al infiltrado ni dice cuál es la senda.',
    },
    senor: {
      type: 'object',
      additionalProperties: false,
      required: ['nombre', 'descripcion'],
      properties: {
        nombre: { type: 'string', description: 'Cómo se le llama al señor al que hay que sacar vivo' },
        descripcion: {
          type: 'string',
          description: 'Quién es, qué se juega esta noche y por qué esta gente responde por él. 3-5 frases.',
        },
      },
    },
    ambientacion: {
      type: 'string',
      description:
        'Cómo el espacio físico REAL descrito en los pasos se convierte en el camino de Iga: pasillos, escaleras y puertas de esa casa concreta.',
    },
    laNocheDeHonnoji: {
      type: 'string',
      description:
        'Qué pasó desde que ardió el Honnō-ji hasta que la columna echó a andar, contado como lo contaría quien iba dentro: con lagunas. Se lee en voz alta antes de empezar. 120-200 palabras.',
    },
    kanchoId: {
      type: 'string',
      description:
        'Id EXACTO de la persona que cobra de Akechi. Tiene que ser una de las de la lista.',
    },
    motivoDelKancho: {
      type: 'string',
      description:
        'Por qué lo hace. Tiene que DOLER: Iga fue arrasada el año pasado por el aliado del señor, así que hay motivos que la mesa casi perdonaría. Nada de «por dinero». 3-5 frases.',
    },
    comoOcurrio: {
      type: 'string',
      description:
        'Relato completo de cuándo y cómo se vendió, y qué le prometieron. Solo lo lee quien dirige.',
    },
    escoltas: {
      type: 'array',
      description: 'Un dosier por cada persona de la lista, exactamente uno, hecho a su medida',
      items: ESCOLTA_SCHEMA,
    },
    pasos: {
      type: 'array',
      description: 'Una entrada por cada paso de la lista, con su id EXACTO',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['pasoId', 'inscripcion'],
        properties: {
          pasoId: { type: 'string', description: 'Id EXACTO del paso' },
          inscripcion: {
            type: 'string',
            description:
              'Lo que hay tallado en el mojón de la entrada, para el cartel que se pega en la puerta de esa habitación real. 1-2 frases evocadoras. NO dice nada de la senda ni de dónde esperan los cazadores.',
          },
        },
      },
    },
    hitos: {
      type: 'array',
      description:
        'La redacción de cada hito que se te ha pedido, con su id EXACTO. Uno por cada id de la lista, ni uno más.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'texto'],
        properties: {
          id: { type: 'string', description: 'El id EXACTO del hito que se te pidió redactar' },
          texto: {
            type: 'string',
            description:
              'La frase del mojón, de 8 a 25 palabras, que dice EXACTAMENTE lo que se te indicó y nada más. Sigue al pie de la letra las reglas de redacción del prompt.',
          },
        },
      },
    },
    horas: {
      type: 'array',
      description: 'Una narración por hora de la noche, en orden, escritas para leerse en voz alta',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['ronda', 'titulo', 'texto', 'indicacion'],
        properties: {
          ronda: { type: 'integer', description: 'Número de hora, empezando en 1' },
          titulo: { type: 'string', description: 'Título corto de la hora' },
          texto: {
            type: 'string',
            description:
              'De 90 a 170 palabras para decirse en alto: frases cortas. NUNCA dice dónde esperan los cazadores, ni cuál es la senda.',
          },
          indicacion: {
            type: 'string',
            description:
              'Indicación escénica breve para quien dirige: bajar la voz, apagar una luz, callar unos segundos. Cadena vacía si no hace falta.',
          },
        },
      },
    },
    cronologia: {
      type: 'array',
      description:
        'De 6 a 10 momentos del día que precede a la noche —de Honnō-ji a la salida de Sakai—, con hora, públicos y secretos mezclados',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['hora', 'descripcion', 'escoltaIds', 'publico'],
        properties: {
          hora: { type: 'string', description: 'Hora del momento, p. ej. "10:40"' },
          descripcion: { type: 'string', description: 'Qué ocurrió' },
          escoltaIds: {
            type: 'array',
            description: 'Ids EXACTOS de las personas implicadas',
            items: { type: 'string' },
          },
          publico: {
            type: 'boolean',
            description:
              'true SOLO si lo vio la columna entera a la vez. Un momento con una sola persona NUNCA es público: los públicos se imprimen en el dosier de todos.',
          },
        },
      },
    },
    ayudas: {
      type: 'array',
      description: 'Tres ayudas graduadas para cuando la mesa se atasca trazando la senda',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nivel', 'texto'],
        properties: {
          nivel: { type: 'integer', enum: [1, 2, 3], description: '1 empuja, 2 orienta, 3 casi lo dice' },
          texto: {
            type: 'string',
            description:
              'La ayuda, leída a toda la mesa. La de nivel 3 puede decir qué paso queda FUERA de la senda; NUNCA da la senda entera ni nombra al infiltrado.',
          },
        },
      },
    },
    desenlace: {
      type: 'object',
      additionalProperties: false,
      required: ['reconstruccion', 'confesion', 'epilogo'],
      properties: {
        reconstruccion: {
          type: 'string',
          description:
            'Qué pasó de verdad aquella noche, leído en voz alta al abrir el pliego. Aquí SÍ se dice la senda y quién cobraba de Akechi.',
        },
        confesion: {
          type: 'string',
          description:
            'La confesión del kanchō en PRIMERA persona, para que la lea quien lo interpretó. De 70 a 130 palabras.',
        },
        epilogo: {
          type: 'string',
          description:
            'Qué fue de cada cual. Puedes apoyarte en lo que de verdad pasó después: el señor volvió a Mikawa, y tres años más tarde los hombres de Iga entraron a su servicio.',
        },
      },
    },
    guion: {
      type: 'array',
      description:
        'Guion de quien dirige: al menos 8 pasos concretos para conducir la noche, de la salida de Sakai al consejo del alba',
      items: { type: 'string' },
    },
  },
};
