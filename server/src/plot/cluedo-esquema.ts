/**
 * Esquemas JSON para las salidas estructuradas de la trama:
 * `PLOT_SCHEMA` (generación completa) y `PLOT_EXTENSION_SCHEMA` (ampliación
 * de una trama existente cuando la partida cambia, ruta /refresh).
 *
 * Ambos reflejan EXACTAMENTE las interfaces de shared/types.ts:
 * - `additionalProperties: false` en todos los objetos.
 * - `required` completo en cada nivel.
 * - Arrays tipados.
 * - Sin `minLength` / `minimum` (no soportados por salidas estructuradas).
 *
 * Los campos *Id (solution, characters, clues, timeline) deben usar los ids
 * REALES de sospechosos/salas/armas que se pasan en el prompt de generación;
 * el pipeline valida la solución tras el parseo.
 */

/** Definición reutilizable de un personaje: idéntica en el schema base y en el de ampliación. */
const PERSONAJE_SCHEMA: Record<string, unknown> = {
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
  ],
  properties: {
    participanteId: {
      type: 'string',
      description: 'Id EXACTO del sospechoso real al que corresponde este personaje',
    },
    characterName: {
      type: 'string',
      description: 'Nombre del personaje dentro de la ficción (puede fusionar el nombre real)',
    },
    role: { type: 'string', description: 'Papel del personaje en la velada' },
    publicPersona: {
      type: 'string',
      description: 'Cara pública del personaje, conocida por todos los invitados',
    },
    secret: { type: 'string', description: 'Secreto que solo conoce este jugador' },
    motive: { type: 'string', description: 'Motivo (real o aparente) contra la víctima' },
    alibi: { type: 'string', description: 'Coartada declarada, cruzada con otros personajes' },
    knowledge: {
      type: 'array',
      description: 'Pistas o conocimientos que este personaje posee sobre otros',
      items: { type: 'string' },
    },
    personalHook: {
      type: 'string',
      description: 'Cómo se ha adaptado el personaje a la psicología de la persona real',
    },
  },
};

/** Definición reutilizable de una pista. */
const PISTA_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'roomId', 'description', 'pointsTo', 'round'],
  properties: {
    id: { type: 'string', description: 'Identificador único de la pista, p. ej. "pista-1"' },
    roomId: {
      type: 'string',
      description: 'Id EXACTO de la sala donde se encuentra la pista',
    },
    description: { type: 'string', description: 'Qué es la pista y cómo se presenta' },
    pointsTo: { type: 'string', description: 'Qué o a quién señala esta pista' },
    round: {
      type: 'integer',
      enum: [1, 2, 3, 4],
      description:
        'Ronda en la que el Game Master saca esta pista. 1: motivos, conflictos y señuelos. ' +
        '2: objetos desplazados y coartadas incompletas. 3: horarios, trayectos y contradicciones. ' +
        '4: evidencias decisivas que cierran el caso. NINGUNA pista que por sí sola señale al ' +
        'culpable puede ir en las rondas 1 o 2.',
    },
  },
};

export const PLOT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'tagline',
    'synopsis',
    'victim',
    'setting',
    'solution',
    'characters',
    'timeline',
    'clues',
    'gmScript',
  ],
  properties: {
    title: {
      type: 'string',
      description: 'Título evocador de la trama, en español, estilo años 20',
    },
    tagline: {
      type: 'string',
      description: 'Frase corta de gancho para la portada de los dosieres',
    },
    synopsis: {
      type: 'string',
      description:
        'Sinopsis pública del caso (sin revelar asesino, arma ni sala del crimen)',
    },
    victim: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'description'],
      properties: {
        name: { type: 'string', description: 'Nombre de la víctima (personaje inventado)' },
        description: { type: 'string', description: 'Quién era la víctima y por qué importaba' },
      },
    },
    setting: {
      type: 'string',
      description: 'Ambientación: cómo el espacio físico real se convierte en la mansión de los años 20',
    },
    solution: {
      type: 'object',
      additionalProperties: false,
      required: ['murdererId', 'weaponId', 'roomId', 'motive', 'howItHappened'],
      properties: {
        murdererId: {
          type: 'string',
          description: 'Id EXACTO de un sospechoso existente de la lista proporcionada',
        },
        weaponId: {
          type: 'string',
          description: 'Id EXACTO de un arma existente de la lista proporcionada',
        },
        roomId: {
          type: 'string',
          description: 'Id EXACTO de una sala existente de la lista proporcionada',
        },
        motive: { type: 'string', description: 'Motivo real del crimen' },
        howItHappened: {
          type: 'string',
          description: 'Relato completo de cómo ocurrió el crimen (solo para el Game Master)',
        },
      },
    },
    characters: {
      type: 'array',
      description: 'Un personaje por cada sospechoso proporcionado, hecho a su medida',
      items: PERSONAJE_SCHEMA,
    },
    timeline: {
      type: 'array',
      description:
        'Cronología COMPLETA de la velada (8-12 eventos con hora), pública y secreta mezclada. ' +
        'Las horas deben ser consistentes entre sí y con las coartadas de los personajes.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['time', 'description', 'participanteIds', 'isPublic'],
        properties: {
          time: { type: 'string', description: 'Hora del evento, p. ej. "21:40"' },
          description: { type: 'string', description: 'Qué ocurrió' },
          participanteIds: {
            type: 'array',
            description: 'Ids EXACTOS de los sospechosos implicados en el evento',
            items: { type: 'string' },
          },
          isPublic: {
            type: 'boolean',
            description:
              'true SOLO si lo presenciaron todos los invitados a la vez (llegada, cena, ' +
              'anuncio, apagón, hallazgo del cuerpo). false para todo lo que alguien hizo ' +
              'cuando nadie miraba: movimientos durante el apagón, manipulación de objetos, ' +
              'conversaciones privadas, causas del apagón, alteraciones de la escena y el ' +
              'crimen mismo. Ante la duda, false: los eventos públicos se imprimen en el ' +
              'dosier de TODOS los jugadores y destriparían el misterio.',
          },
        },
      },
    },
    clues: {
      type: 'array',
      description: 'Pistas repartidas por las salas (aprox. 2 por sala, verdaderas y falsas)',
      items: PISTA_SCHEMA,
    },
    gmScript: {
      type: 'array',
      description: 'Guion del Game Master: al menos 6 pasos para conducir la partida',
      items: { type: 'string' },
    },
  },
};

/**
 * Esquema JSON para la AMPLIACIÓN de una trama ya existente (ruta /refresh).
 *
 * No se regenera el misterio entero: solo se piden las piezas que faltan tras
 * cambiar los jugadores, las salas o los objetos de la partida.
 *
 * - `characters`: un personaje NUEVO por cada sospechoso que aún no lo tiene,
 *   encajado en la trama existente sin contradecirla.
 * - `solutionRepair`: motivo y relato del crimen reescritos, solo cuando la
 *   solución ha quedado rota y se ha tenido que reasignar asesino, arma o sala.
 * - `extraClues`: pistas adicionales para las salas nuevas (puede ir vacío).
 *
 * `solutionRepair` y `extraClues` figuran en `required` porque las salidas
 * estructuradas exigen enumerar todas las propiedades cuando
 * `additionalProperties` es false; el prompt indica que se devuelvan con
 * cadenas vacías / array vacío cuando no hay nada que reparar, y el pipeline de
 * refresco ignora esos valores vacíos.
 */
export const PLOT_EXTENSION_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['characters', 'solutionRepair', 'extraClues'],
  properties: {
    characters: {
      type: 'array',
      description:
        'Un personaje NUEVO por cada sospechoso sin personaje, a medida de la persona real y coherente con la trama ya escrita',
      items: PERSONAJE_SCHEMA,
    },
    solutionRepair: {
      type: 'object',
      additionalProperties: false,
      required: ['motive', 'howItHappened'],
      description:
        'Motivo y relato del crimen reescritos para la solución reasignada. Cadenas vacías si la solución no estaba rota.',
      properties: {
        motive: {
          type: 'string',
          description: 'Motivo real del crimen, coherente con el nuevo asesino, arma y sala',
        },
        howItHappened: {
          type: 'string',
          description:
            'Relato completo de cómo ocurrió el crimen con el nuevo asesino, arma y sala (solo para el Game Master)',
        },
      },
    },
    extraClues: {
      type: 'array',
      description:
        'Pistas adicionales para las salas que se hayan quedado sin ninguna. Array vacío si no hacen falta.',
      items: PISTA_SCHEMA,
    },
  },
};
