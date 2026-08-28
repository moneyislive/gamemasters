/**
 * El esquema con el que se le pide al modelo la trama de El Misterio de la Momia.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE ESTE ESQUEMA *NO* PIDE, Y ES LA DECISIÓN QUE LO EXPLICA TODO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * No pide restricciones. No pide el orden de los ritos. No pide qué cámara se
 * profana cada noche ni quién tiene qué don. Nada de eso está aquí, y no es un
 * olvido: es la línea del §7 del diseño. El puzle de la Momia es un orden de
 * cinco ritos que se deduce combinando pistas parciales, y un conjunto de
 * restricciones mal formado —contradictorio, o con dos soluciones— produce una
 * partida IRRESOLUBLE que nadie descubre hasta que hay doce personas alrededor
 * de una mesa. Un modelo acierta casi siempre; «casi siempre» es exactamente la
 * garantía que no sirve aquí.
 *
 * Así que la lógica la genera código (`juegos/momia-puzle.ts`) y este esquema
 * pide SOLO el sabor: quién era el faraón, qué esconde cada expedicionario, por
 * qué duele el motivo del saqueador, y **cómo se lee** cada restricción cuando
 * está escrita en un papiro roto.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ UNA SOLA LLAMADA, Y NO DOS COMO EN CLUEDO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CLUEDO parte la generación en dos (`pipeline.ts` y `material.ts`) porque la
 * primera llamada rozaba su límite de tokens y porque el material se puede
 * añadir después a una trama ya escrita. Aquí se hace en una sola, y la razón
 * es del juego, no de la infraestructura:
 *
 *   Los fragmentos de papiro FALSOS tienen que sonar exactamente igual que los
 *   verdaderos. Si se escriben en otra llamada —o peor, en caliente durante la
 *   partida— salen con otro tono, y una pista que suena distinta a las demás se
 *   delata sola. Todo el juego adversarial se cae.
 *
 * Por eso `fragmentos` es UNA lista plana, verdaderos y falsos mezclados, en la
 * que el modelo no sabe cuál es cuál —ni le hace falta—. No puede filtrar lo
 * que no sabe.
 */

// ---------------------------------------------------------------------------
// La forma de lo que devuelve el modelo
// ---------------------------------------------------------------------------

/** El dosier de una persona real, escrito a su medida. */
export interface ExpedicionarioEscrito {
  suspectId: string;
  characterName: string;
  role: string;
  publicPersona: string;
  secret: string;
  motive: string;
  alibi: string;
  knowledge: string[];
  personalHook: string;
  /**
   * Cómo se justifica su don en la ficción, escrito para esa persona.
   *
   * No es el don (lo reparte el código): es la frase que explica por qué
   * precisamente ella lee jeroglíficos, o cura, o soborna. Sin esto el dosier
   * dice «tu don es descifrar» y suena a manual de instrucciones.
   */
  elDon: string;
}

/** Un fragmento de papiro, tal y como el modelo lo redacta. */
export interface FragmentoEscrito {
  /** El id EXACTO que se le pidió redactar. Es como se vuelve a atar a su restricción. */
  id: string;
  texto: string;
}

/** La narración de una vigilia, para leerse en voz alta. */
export interface VigiliaEscrita {
  ronda: number;
  titulo: string;
  texto: string;
  indicacion: string;
}

/** La respuesta completa del modelo. Sabor, y solo sabor. */
export interface RespuestaMomia {
  title: string;
  tagline: string;
  synopsis: string;
  faraon: { nombre: string; descripcion: string };
  ambientacion: string;
  tumba: { laNocheDelSello: string };
  /** Id EXACTO de un expedicionario. Es la respuesta del único eje del juego. */
  saqueadorId: string;
  motivoDelSaqueo: string;
  comoOcurrio: string;
  expedicionarios: ExpedicionarioEscrito[];
  ritos: Array<{ ritoId: string; invocacion: string; gesto: string }>;
  camaras: Array<{ camaraId: string; inscripcion: string }>;
  fragmentos: FragmentoEscrito[];
  vigilias: VigiliaEscrita[];
  cronologia: Array<{
    hora: string;
    descripcion: string;
    expedicionarioIds: string[];
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
 * Mismas reglas que `PLOT_SCHEMA`, y por el mismo motivo: las salidas
 * estructuradas exigen `additionalProperties: false`, `required` completo en
 * cada nivel y nada de `minLength`/`minimum`. Las longitudes se piden en las
 * descripciones, que el modelo sí lee.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Y HAY UN TECHO: ESTE ESQUEMA CABE JUSTO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Con `output_config.format` la API compila el esquema a una gramática, y si
 * sale demasiado grande RECHAZA la petición entera con un 400 —«The compiled
 * grammar is too large»— antes de escribir una palabra. Este esquema llegó a
 * pasarse de ese techo: la generación del papiro estaba rota contra la API de
 * verdad, y no se vio porque sin clave se cae al modo demo y porque
 * `verificar-momia-trama.ts` es puro y no sale a la red.
 *
 * Se arregló quitando tres textos que se pedían y no leía nadie —los dos
 * campos de `tumba` que no son `laNocheDelSello`, y el relato de cada
 * reliquia—. Lo que quedó compila con sitio para unos seis campos de texto más.
 *
 * Así que ANTES DE AÑADIR CAMPOS AQUÍ, comprueba que la gramática sigue
 * compilando: basta una llamada con `max_tokens` mínimo y este esquema; el 400
 * llega en la validación y no cuesta tokens. Lo que NO sirve es fiarse de la
 * suite: ninguna de sus comprobaciones llama a la API. El techo es del
 * servicio, no del modelo — cambiar de modelo no lo levanta.
 */

const EXPEDICIONARIO_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'suspectId',
    'characterName',
    'role',
    'publicPersona',
    'secret',
    'motive',
    'alibi',
    'knowledge',
    'personalHook',
    'elDon',
  ],
  properties: {
    suspectId: { type: 'string', description: 'Id EXACTO del expedicionario real al que corresponde este dosier' },
    characterName: {
      type: 'string',
      description:
        'Nombre del personaje dentro de la ficción de 1923. Puede fundir el nombre real de la persona.',
    },
    role: {
      type: 'string',
      description:
        'Su papel en la expedición: epigrafista, médico de campaña, capataz, mecenas, fotógrafa, guardián de la concesión…',
    },
    publicPersona: {
      type: 'string',
      description: 'Lo que cualquiera de la expedición sabe de esta persona. 2-4 frases.',
    },
    secret: {
      type: 'string',
      description:
        'Lo que oculta y solo lee quien recibe este dosier. Tiene que dar juego sin rozar la vida real de la persona. 2-4 frases.',
    },
    motive: {
      type: 'string',
      description:
        'Qué ganaría si la tumba NO se sellara. Todo el mundo tiene uno: es lo que hace que cualquiera pueda ser sospechoso.',
    },
    alibi: {
      type: 'string',
      description:
        'Dónde dice haber estado la noche en que se rompió el sello, cruzada con la de otro expedicionario concreto al que nombra.',
    },
    knowledge: {
      type: 'array',
      description:
        'De dos a cuatro cosas que sabe de OTROS miembros de la expedición y puede soltar en la mesa. Cada una nombra a alguien.',
      items: { type: 'string' },
    },
    personalHook: {
      type: 'string',
      description:
        'Cómo se ha adaptado el papel a la psicología REAL de esta persona, según lo que el Game Master contó de ella. Cita ese rasgo.',
    },
    elDon: {
      type: 'string',
      description:
        'Por qué en la ficción esta persona tiene el don que se le ha asignado, en 1-2 frases escritas en segunda persona. NO cambies el don: viene dado.',
    },
  },
};

export const MOMIA_TRAMA_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'tagline',
    'synopsis',
    'faraon',
    'ambientacion',
    'tumba',
    'saqueadorId',
    'motivoDelSaqueo',
    'comoOcurrio',
    'expedicionarios',
    'ritos',
    'camaras',
    'fragmentos',
    'vigilias',
    'cronologia',
    'ayudas',
    'desenlace',
    'guion',
  ],
  properties: {
    title: { type: 'string', description: 'Título de la velada, evocador y egiptológico, en español' },
    tagline: { type: 'string', description: 'Frase de gancho para la portada de los dosieres' },
    synopsis: {
      type: 'string',
      description:
        'Sinopsis PÚBLICA: qué expedición es esta, qué se abrió y qué está pasando desde entonces. NO nombra al saqueador ni dice el orden de los ritos.',
    },
    faraon: {
      type: 'object',
      additionalProperties: false,
      required: ['nombre', 'descripcion'],
      properties: {
        nombre: { type: 'string', description: 'Nombre del faraón cuya tumba se ha abierto' },
        descripcion: {
          type: 'string',
          description: 'Quién fue, por qué su tumba se selló como se selló y qué se decía de él. 3-5 frases.',
        },
      },
    },
    ambientacion: {
      type: 'string',
      description:
        'Cómo el espacio físico REAL descrito en las cámaras se convierte en la tumba: pasillos, escaleras y puertas de esa casa concreta.',
    },
    tumba: {
      type: 'object',
      additionalProperties: false,
      required: ['laNocheDelSello'],
      properties: {
        laNocheDelSello: {
          type: 'string',
          description:
            'Qué pasó la noche en que el sello se rompió, contado como lo contaría la expedición: con lagunas.',
        },
      },
    },
    saqueadorId: {
      type: 'string',
      description:
        'Id EXACTO del expedicionario que rompió el sello por encargo. Tiene que ser uno de los de la lista.',
    },
    motivoDelSaqueo: {
      type: 'string',
      description:
        'Por qué lo hizo. Tiene que DOLER: no «por dinero», sino algo que la mesa entienda y casi perdone. 3-5 frases.',
    },
    comoOcurrio: {
      type: 'string',
      description:
        'Relato completo de cómo rompió el sello y qué pactó con el comprador. Solo lo lee quien dirige.',
    },
    expedicionarios: {
      type: 'array',
      description: 'Un dosier por cada expedicionario de la lista, exactamente uno, hecho a su medida',
      items: EXPEDICIONARIO_SCHEMA,
    },
    ritos: {
      type: 'array',
      description: 'Una entrada por cada rito de la lista, con su id EXACTO',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['ritoId', 'invocacion', 'gesto'],
        properties: {
          ritoId: { type: 'string', description: 'Id EXACTO del rito' },
          invocacion: {
            type: 'string',
            description: 'La fórmula que se pronuncia al ejecutarlo, una o dos frases, en tono de conjuro.',
          },
          gesto: {
            type: 'string',
            description:
              'Qué se hace físicamente en la mesa para ejecutarlo: soplar sobre algo, verter agua, apagar una vela. Tiene que poder hacerse en una casa.',
          },
        },
      },
    },
    camaras: {
      type: 'array',
      description: 'Una entrada por cada cámara de la lista, con su id EXACTO',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['camaraId', 'inscripcion'],
        properties: {
          camaraId: { type: 'string', description: 'Id EXACTO de la cámara' },
          inscripcion: {
            type: 'string',
            description:
              'Lo que hay escrito en su dintel, para el cartel que se pega en la puerta de esa habitación real. 1-2 frases, sin decir nada del orden de los ritos.',
          },
        },
      },
    },
    fragmentos: {
      type: 'array',
      description:
        'La redacción de cada fragmento de papiro que se te ha pedido, con su id EXACTO. Uno por cada id de la lista, ni uno más.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'texto'],
        properties: {
          id: { type: 'string', description: 'El id EXACTO del fragmento que se te pidió redactar' },
          texto: {
            type: 'string',
            description:
              'La frase de papiro, de 8 a 25 palabras, que dice EXACTAMENTE lo que se te indicó y nada más. Sigue al pie de la letra las reglas de redacción del prompt.',
          },
        },
      },
    },
    vigilias: {
      type: 'array',
      description: 'Una narración por vigilia, en orden, escritas para leerse en voz alta',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['ronda', 'titulo', 'texto', 'indicacion'],
        properties: {
          ronda: { type: 'integer', description: 'Número de vigilia, empezando en 1' },
          titulo: { type: 'string', description: 'Título corto de la vigilia' },
          texto: {
            type: 'string',
            description:
              'De 90 a 170 palabras para decirse en alto: frases cortas. Nombra la cámara que se profana esta noche. No revela el orden de los ritos ni quién es el saqueador.',
          },
          indicacion: {
            type: 'string',
            description:
              'Indicación escénica breve para quien dirige: apagar una luz, encender incienso, callar unos segundos. Cadena vacía si no hace falta.',
          },
        },
      },
    },
    cronologia: {
      type: 'array',
      description:
        'De 6 a 10 momentos de la noche en que se rompió el sello, con hora, públicos y secretos mezclados',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['hora', 'descripcion', 'expedicionarioIds', 'publico'],
        properties: {
          hora: { type: 'string', description: 'Hora del momento, p. ej. "23:40"' },
          descripcion: { type: 'string', description: 'Qué ocurrió' },
          expedicionarioIds: {
            type: 'array',
            description: 'Ids EXACTOS de los expedicionarios implicados',
            items: { type: 'string' },
          },
          publico: {
            type: 'boolean',
            description:
              'true SOLO si lo vio la expedición entera a la vez. Un momento con una sola persona NUNCA es público: los públicos se imprimen en el dosier de todos.',
          },
        },
      },
    },
    ayudas: {
      type: 'array',
      description: 'Tres ayudas graduadas para cuando la mesa se atasca deduciendo el orden',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nivel', 'texto'],
        properties: {
          nivel: { type: 'integer', enum: [1, 2, 3], description: '1 empuja, 2 orienta, 3 casi lo dice' },
          texto: {
            type: 'string',
            description:
              'La ayuda, leída a toda la mesa. La de nivel 3 puede señalar qué rito ocupa un extremo; NUNCA da el orden entero ni nombra al saqueador.',
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
            'Qué pasó de verdad aquella noche, leído en voz alta al abrir el papiro del sellado. Aquí SÍ se dice el orden verdadero y quién rompió el sello.',
        },
        confesion: {
          type: 'string',
          description:
            'La confesión del saqueador en PRIMERA persona, para que la lea quien lo interpretó. De 70 a 130 palabras.',
        },
        epilogo: { type: 'string', description: 'Qué fue de cada cual. Cierra con amargura o con humor negro.' },
      },
    },
    guion: {
      type: 'array',
      description:
        'Guion de quien dirige: al menos 8 pasos concretos para conducir la noche, de la apertura al sellado',
      items: { type: 'string' },
    },
  },
};
