/**
 * Lo que se le pide al modelo para El Nudo de Valdehierro, y lo que NO.
 *
 * ═══ LO QUE ESTE ESQUEMA NO PIDE, Y ES LA DECISIÓN QUE LO EXPLICA TODO ═══
 *
 * No pide el cuadro de marchas. No pide los telegramas. No pide quién ejerce
 * cada oficio ni quién guarda qué tira. Nada de eso está aquí y no es un
 * olvido: el rompecabezas de este juego es una permutación de seis convoyes
 * determinada por un conjunto de condiciones, y un conjunto mal formado
 * —contradictorio, o con dos soluciones— produce una noche que no se puede
 * ganar y que nadie descubre hasta que hay doce personas alrededor de la mesa.
 * Un modelo acierta casi siempre; «casi siempre» es exactamente la garantía que
 * no sirve aquí.
 *
 * Así que la lógica la genera código (`juegos/nudo-cuadro.ts`, con las cuatro
 * garantías comprobadas por enumeración) y este esquema pide SOLO el sabor:
 * cómo se llama la noche, qué le pasa a cada persona del turno y qué se lee al
 * abrir cada franja.
 *
 * ═══ Y HAY UN TECHO: ESTE ESQUEMA TIENE QUE CABER ═══
 *
 * Con `output_config.format` la API compila el esquema a una gramática, y si
 * sale demasiado grande RECHAZA la petición entera con un 400 antes de escribir
 * una palabra. Al esquema de El Misterio de la Momia le pasó y estuvo roto sin
 * que se viera, porque sin clave se cae al modo demo y las pruebas puras no
 * salen a la red.
 *
 * Este se ha escrito con ese techo delante: SIETE campos de primer nivel, tres
 * de ellos cadenas sueltas. Es el más pequeño de los cuatro juegos con
 * diferencia, y se puede permitir serlo justamente porque no lleva lógica
 * dentro.
 */
import { buildStyleBlock } from './style';
import { entidadesDe } from '../../../shared/juegos';
import { HORAS_DE_FRANJA, NOMBRE_DE_OFICIO } from '../../../shared/juegos/nudo-tipos';
import { tramaDe } from '../juegos/nudo-trama';
import type { GameSession, Plot } from '../../../shared/types';

/** Lo que el modelo devuelve. Solo prosa. */
export interface RespuestaNudo {
  titulo: string;
  lema: string;
  sinopsis: string;
  ambientacion: string;
  fichas: Array<{
    participanteId: string;
    nombre: string;
    caraPublica: string;
    secreto: string;
    gancho: string;
  }>;
  partes: Array<{ franja: number; texto: string }>;
  guion: string[];
}

export const NUDO_TRAMA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titulo', 'lema', 'sinopsis', 'ambientacion', 'fichas', 'partes', 'guion'],
  properties: {
    titulo: { type: 'string', description: 'El título de la velada. Corto y con nombre propio.' },
    lema: { type: 'string', description: 'Una línea que se lee bajo el título.' },
    sinopsis: {
      type: 'string',
      description:
        'Tres o cuatro frases: qué ha pasado esta noche en la estación y por qué no puede esperar a mañana.',
    },
    ambientacion: {
      type: 'string',
      description: 'Dos frases sobre la estación, la nieve y la hora. Se lee en voz alta al empezar.',
    },
    fichas: {
      type: 'array',
      description: 'Una por persona del turno, con el mismo participanteId que se te ha dado.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['participanteId', 'nombre', 'caraPublica', 'secreto', 'gancho'],
        properties: {
          participanteId: { type: 'string' },
          nombre: { type: 'string', description: 'Nombre y apellido del personaje. Español de 1927.' },
          caraPublica: {
            type: 'string',
            description:
              'Lo que cualquiera del turno sabría de esta persona: su oficio, cuánto lleva en la casa y una cosa que se le note.',
          },
          secreto: {
            type: 'string',
            description:
              'Lo que no cuenta. Nadie más lo lee. NO puede tener nada que ver con el orden de los convoyes.',
          },
          gancho: {
            type: 'string',
            description:
              'Un consejo de interpretación en segunda persona: cómo llevar el papel esta noche.',
          },
        },
      },
    },
    partes: {
      type: 'array',
      description: 'El parte de novedades que se lee en voz alta al abrir cada franja.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['franja', 'texto'],
        properties: {
          franja: { type: 'integer' },
          texto: {
            type: 'string',
            description:
              'Dos frases de ambiente: el tiempo, la línea, la estufa. NUNCA qué convoy toca.',
          },
        },
      },
    },
    guion: {
      type: 'array',
      description: 'Cinco líneas para quien dirige: cómo conducir la noche, acto por acto.',
      items: { type: 'string' },
    },
  },
} as const;

export const SISTEMA_NUDO = `Eres un guionista de veladas de misterio en vivo especializado en el
ferrocarril español de principios del siglo XX.

Escribes SIEMPRE en español de España, con el vocabulario ferroviario de la época: convoy, franja,
enclavamiento, garita de agujas, factor, guardagujas, telegrafista, muelle, apartadero, vía muerta,
paso a nivel, jefatura, parte de novedades.

LO QUE ESCRIBES es la AMBIENTACIÓN de una noche que YA ESTÁ MONTADA. El cuadro de marchas —qué
convoy sale en cada franja— y las tiras de telegrama que lo determinan están decididos por el
sistema y no se te enseñan. Tú no tienes que averiguarlos, no debes inventarlos y no puedes
contradecirlos.

TRES REGLAS QUE NO SE NEGOCIAN:

1. NUNCA escribas ni insinúes en qué orden salen los convoyes. Ni en la sinopsis, ni en los partes,
   ni en el guion, ni en la ficha de nadie. Es lo único que hay que averiguar en toda la velada.
2. El SECRETO de cada persona es un asunto humano —una deuda, un traslado, un miedo, algo que
   calló— y JAMÁS información sobre los convoyes ni sobre el cuadro.
3. NO hay culpable, no hay traidor, no hay víctima y no ha muerto nadie. Esto es una noche de
   trabajo contra el reloj y contra la nieve. Si escribes un crimen, has escrito otro juego.

TONO: seco, concreto, con dignidad de oficio. Gente que lleva años haciendo lo mismo y esta noche
tiene que hacerlo sin el papel que lo dice. Nada de épica de folletín; la emoción está en que el
suero llegue.`;

/**
 * El encargo, con TODO lo que hace falta para escribir y nada de lo que no.
 *
 * ═══ QUÉ VIAJA Y QUÉ SE QUEDA ═══
 *
 * Viaja: quién juega, con la descripción que escribió quien monta la partida
 * —que es lo que permite darle a cada cual un papel que le pegue—, qué oficio
 * le ha tocado, cómo se llaman los convoyes, los puestos y las cargas.
 *
 * NO viaja: el cuadro de marchas, los telegramas, quién guarda cuál, ni el
 * CORREO ELECTRÓNICO de nadie. Lo del correo no es escrúpulo abstracto: es un
 * dato personal que no hace ninguna falta para escribir una ficha, y mandarlo
 * sería mandarlo a un tercero por nada.
 */
export function construirPromptNudo(game: GameSession, base: Plot): string {
  const trama = tramaDe(base);
  const ferroviarios = entidadesDe(game, 'ferroviarios');
  const convoyes = entidadesDe(game, 'convoyes');
  const puestos = entidadesDe(game, 'puestos');
  const mercancias = entidadesDe(game, 'mercancias');

  const gente = ferroviarios
    .map((p) => {
      const oficio = trama?.oficioDePersona[p.id];
      return (
        `- participanteId: ${p.id} · se llama ${p.name}` +
        (oficio ? ` · esta noche lleva ${NOMBRE_DE_OFICIO[oficio]}` : '') +
        (p.description ? `\n  Quien monta la partida dice de ella: «${p.description}»` : '')
      );
    })
    .join('\n');

  const trenes = convoyes
    .map((c) => {
      const carga = mercancias.find((m) => m.id === trama?.cargaDeConvoy[c.id]);
      return (
        `- ${c.name}${c.id === trama?.correo ? '  ← ES EL CORREO DE MEDIANOCHE, lleva el suero' : ''}` +
        (carga ? ` · carga: ${carga.name}` : '') +
        (c.description ? `\n  ${c.description}` : '')
      );
    })
    .join('\n');

  const cuartos = puestos
    .map((p) => {
      const oficio = trama?.oficioDePuesto[p.id];
      return `- ${p.name}${oficio ? ` · esta noche es ${NOMBRE_DE_OFICIO[oficio]}` : ''}`;
    })
    .join('\n');

  return `Escribe la ambientación de una velada de EL NUDO DE VALDEHIERRO.

LA SITUACIÓN
Madrugada del 14 de enero de 1927, estación de Valdehierro, donde se cruzan cinco líneas. Ardió
la oficina del telégrafo y con ella el cuadro de marchas de esta noche. Seis convoyes vienen
rodando y no se les puede avisar. El turno de noche tiene que rehacer el cuadro con las tiras de
telegrama que cada cual salvó del fuego, y sacar los seis antes de que la nieve cierre el puerto.

EL TURNO DE NOCHE (${ferroviarios.length} personas)
${gente}

LOS SEIS CONVOYES
${trenes}

LOS PUESTOS (son habitaciones de la casa de verdad donde se juega)
${cuartos}

LAS FRANJAS DE LA NOCHE
${HORAS_DE_FRANJA.map((h, i) => `${i + 1}. las ${h}`).join(' · ')}

QUÉ TIENES QUE ESCRIBIR
- El título y el lema de la velada.
- La sinopsis y la ambientación.
- Una ficha por persona, con SU participanteId exacto de la lista de arriba. Aprovecha lo que se
  dice de cada una para que el papel le pegue: quien discute por deporte, en el enclavamiento;
  quien no para quieto, en la garita.
- Un parte de novedades por cada una de las ${HORAS_DE_FRANJA.length} franjas. Ambiente y solo
  ambiente: el tiempo, la línea, la estufa, un maquinista que pita. NUNCA qué convoy toca.
- Cinco líneas de guion para quien dirige.

RECUERDA: no sabes en qué orden salen los convoyes y no debes inventártelo. Cualquier frase que
sugiera un orden estropea la velada entera.${buildStyleBlock(game)}`;
}
