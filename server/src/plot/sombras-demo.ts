/**
 * La respuesta de demostración: lo que «escribe el modelo» cuando no hay modelo.
 *
 * POR QUÉ IMPORTA MÁS DE LO QUE PARECE. Sin clave de API la plataforma entera
 * tiene que seguir siendo navegable —es una regla vieja de este repositorio— y
 * en este juego eso significa que una noche completa se pueda montar, repartir,
 * imprimir y jugar sin gastar un token. Además es lo que permite desarrollar y
 * comprobar sin salir a la red, que es como se han escrito los verificadores.
 *
 * DEVUELVE LA MISMA FORMA QUE LA API, no un `Plot`. Esa es la gracia: pasa por
 * el mismo ensamblaje, la misma validación y los mismos recambios que una
 * respuesta de verdad. Si el ensamblaje se rompiera, esta ruta se rompería
 * igual, y por eso sirve como prueba.
 *
 * LAS FRASES DE LOS MOJONES SON LAS DEL CÓDIGO, y no unas inventadas aquí: son
 * las que produce `redactarHito`, o sea exactamente las que la validación va a
 * aceptar. No es hacer trampas al examen — es que en modo demostración el
 * «modelo» ES el código, y lo honesto es que se note qué frases salen de dónde.
 */
import { redactarHito } from '../juegos/sombras-senda';
import { fichaDePapel, HORAS_DE_LA_NOCHE, nombreDeLaHora } from '../juegos/sombras-trama';
import type { EntidadesDeSombras } from './sombras-cimientos';
import type { RespuestaSombras } from './sombras-esquema';
import type { TramaSombras } from '../../../shared/juegos/sombras-tipos';

export function respuestaDeDemostracion(
  nombrePartida: string,
  entidades: EntidadesDeSombras,
  trama: TramaSombras,
): RespuestaSombras {
  const { escoltas, pasos, enseres, estandartes } = entidades;
  const nombreDePaso = (id: string) => pasos.find((p) => p.id === id)?.name ?? id;
  const nombreDeEstandarte = (id: string) => estandartes.find((e) => e.id === id)?.name ?? '';
  const casa = nombrePartida?.trim() || 'esta casa';

  /*
   * El kanchō de la demostración es DETERMINISTA: el último de la lista. Con uno
   * al azar, media prueba fallaría una vez de cada cuatro sin que nada estuviera
   * roto, y un comprobador intermitente se acaba ignorando.
   */
  const kancho = escoltas[escoltas.length - 1];
  const enserComprometido = enseres.find((e) => e.id === trama.enserComprometido) ?? enseres[0];

  return {
    title: 'El Paso de las Sombras',
    tagline: 'Honnō-ji arde. Antes del alba hay que cruzar Iga, y uno de los que guían cobra de Akechi.',
    synopsis:
      `Esta madrugada, en Kioto, Akechi Mitsuhide ha rodeado el templo de Honnō-ji y Oda ` +
      `Nobunaga ha muerto en el incendio. El señor estaba de visita en Sakai, sin tropas y con ` +
      `un puñado de acompañantes, y a media mañana los caminos grandes ya eran de Akechi. Solo ` +
      `queda una salida: cruzar de noche la provincia de Iga y llegar antes del alba a la playa ` +
      `de Shirako, donde espera una barca. De todos los pasos del camino, únicamente cuatro ` +
      `llevan a la playa, y hay que andarlos en orden. Nadie los conoce todos.`,
    senor: {
      nombre: 'el señor de Mikawa',
      descripcion:
        'Hace doce horas era un aliado invitado a una función en Sakai. Ahora es un hombre sin ' +
        'tierra a cuatro días de la suya, con precio en la cabeza y treinta personas que ' +
        'responden por él. Habla poco y mira mucho. Si no llega a la barca, se acaba una ' +
        'historia que aún no ha empezado.',
    },
    ambientacion:
      `${casa}, convertida por una noche en el camino de Iga: ` +
      `${pasos.map((p) => p.name).join(', ')}. Se anda a oscuras y en fila, y en cada mojón hay ` +
      `algo escrito para quien sepa mirar.`,
    laNocheDeHonnoji:
      'Antes del amanecer se vio el humo desde el norte de la ciudad. Un criado llegó a Sakai a ' +
      'media mañana diciendo que el Honnō-ji estaba ardiendo y que dentro no quedaba nadie vivo. ' +
      'Nadie quiso creerlo hasta que llegó el segundo aviso. Al mediodía ya se sabía que Akechi ' +
      'tenía Kioto y que había puesto precio a las cabezas que quedaban del bando contrario. Se ' +
      'habló de ir por la costa y se descartó: los caminos grandes tienen ojos. Se habló de ' +
      'acabar allí mismo, con dignidad, y también se descartó. Al caer la tarde se mandó aviso a ' +
      'los guías de Iga, que tienen sus motivos para no ayudar y aun así vinieron. Se sale de ' +
      'noche, sin faroles encendidos hasta pasar el primer alto, y sin decir a nadie por dónde.',
    kanchoId: kancho?.id ?? '',
    motivoDelKancho:
      'El año pasado, los hombres de este mismo bando entraron en Iga y no dejaron piedra sobre ' +
      'piedra. Quien cobra de Akechi esta noche perdió allí a los suyos y no ha vuelto a pisar su ' +
      'valle. No lo hace por la plata, aunque acepte la plata: lo hace porque le ofrecieron algo ' +
      'que nadie le había ofrecido nunca, que es que la deuda quede saldada. Y porque ha ' +
      'calculado, con una frialdad que le da miedo a sí mismo, que un señor menos no cambia gran ' +
      'cosa y que su valle sí.',
    comoOcurrio:
      'El trato se cerró hace tres días en un cruce de caminos, con un hombre que no dio su ' +
      'nombre y que sabía demasiado sobre lo que iba a pasar en Kioto. Le dijeron dónde ' +
      `esperarían los cazadores cada hora de esta noche, y le prometieron ${
        enserComprometido?.name ?? 'lo que pidiera'
      } cuando amaneciera con la columna todavía en el monte. No tiene que matar a nadie. Le ` +
      'basta con hablar, con dejar un mojón escrito de su puño donde no haya testigos, y con que ' +
      'la mesa ande el camino equivocado.',
    escoltas: escoltas.map((persona, i) => {
      const ficha = fichaDePapel(trama.papeles[persona.id] ?? 'rastrear');
      const esKancho = persona.id === kancho?.id;
      const companero = escoltas[(i + 1) % escoltas.length]!;
      return {
        participanteId: persona.id,
        characterName: persona.name,
        role: ficha.rol,
        publicPersona:
          `${persona.name} va en la columna bajo el blasón de ${nombreDeEstandarte(trama.estandartes[persona.id] ?? '')}. ` +
          'Lleva el paso de quien ha andado de noche otras veces, y no ha dicho una palabra de más desde que salieron de Sakai.',
        secret: esKancho
          ? 'Cobras de Akechi. Te buscaron en un cruce de caminos hace tres días y te ofrecieron algo ' +
            'que no te atreves a repetir en voz alta. Sabes dónde esperan los cazadores cada hora ' +
            'de esta noche, porque te lo dijeron. Y puedes dejar por el camino un mojón escrito de ' +
            'tu puño que suene a verdad: hazlo en un paso donde no haya nadie más, porque la ' +
            'columna sabe quién estuvo dónde. Ganas si al amanecer no se ha andado la senda buena.'
          : `Viste a ${companero.name} apartarse a hablar con alguien en el camino de Sakai y volver ` +
            'sin decir con quién. Puede que no signifique nada. Puede que sí, y entonces callarlo te ' +
            'va a costar caro esta noche.',
        motive: esKancho
          ? 'Una deuda con Iga que nadie te pagó nunca, y un hombre de Akechi que sí ha pagado por adelantado.'
          : 'Llegar a la playa antes del alba, y llegar con todos.',
        alibi:
          `Cuando llegó la noticia estabas en el patio, como todo el mundo. ${companero.name} te vio ` +
          'allí, o eso dices.',
        knowledge: [
          `${companero.name} conoce estos montes mejor de lo que admite.`,
          'Alguien de la columna llevaba el farol antes de salir y ya no lo lleva.',
          'Nadie tiene mojones suficientes para trazar la senda solo: es a propósito.',
        ],
        personalHook: persona.description?.trim()
          ? `El papel se te ha escrito a medida. Quien te conoce dice de ti: «${persona.description.trim()}». ` +
            'Úsalo: esta noche lo que convence no son los datos, es quién los cuenta.'
          : 'No sabemos mucho de ti todavía, y eso juega a tu favor: nadie tiene una versión previa de cómo te comportas cuando hay algo en juego.',
        elDisfraz: ficha.que,
      };
    }),
    pasos: pasos.map((p) => ({
      pasoId: p.id,
      inscripcion:
        `${p.name}. Quien pase de noche, que pase en silencio; quien pase de día, que no pase.`,
    })),
    /*
     * Verdaderos y falsos MEZCLADOS y en el mismo orden en que se pidieron, que
     * es como los mandaría el modelo. Aquí no hay ninguna diferencia entre unos y
     * otros, y no puede haberla: si la hubiera, la demostración estaría jugando
     * con ventaja sobre la partida de verdad.
     */
    hitos: [...trama.condiciones, ...trama.falsasCandidatas].map((h) => ({
      id: h.id,
      texto: redactarHito(h.condicion, nombreDePaso),
    })),
    horas: trama.batidos.map((_, i) => {
      const ronda = i + 1;
      const hora = HORAS_DE_LA_NOCHE[i % HORAS_DE_LA_NOCHE.length]!;
      return {
        ronda,
        titulo: `${hora.kanji} · ${nombreDeLaHora(ronda)}`,
        texto:
          `Entra ${nombreDeLaHora(ronda)}. ${hora.reloj[0]!.toUpperCase()}${hora.reloj.slice(1)}. ` +
          'La columna se detiene donde el camino se abre y cada cual decide por dónde mira. ' +
          'No hay luna, o la hay poca. Se oye agua en alguna parte y no se sabe de dónde viene. ' +
          'En algún sitio de estos montes hay gente esperando con lanzas de bambú y ganas de ' +
          'cobrarse una cabeza, y nadie sabe en cuál. Id, mirad lo que hay escrito en los ' +
          'mojones, y volved. Lo que contéis al volver es cosa vuestra.',
        indicacion:
          ronda === 1
            ? 'Baja la voz al leerlo. Que se note que a partir de aquí se habla bajo.'
            : 'Espera tres segundos en silencio antes de dejarles moverse.',
      };
    }),
    cronologia: [
      {
        hora: '04:00',
        descripcion:
          'Las tropas de Akechi rodean el Honnō-ji. Antes del amanecer, Oda Nobunaga ha muerto en el incendio.',
        escoltaIds: [],
        publico: true,
      },
      {
        hora: '10:00',
        descripcion: 'La noticia llega a Sakai. El señor está de visita, sin tropas y a cuatro días de sus tierras.',
        escoltaIds: escoltas.slice(0, 2).map((e) => e.id),
        publico: true,
      },
      {
        hora: '15:00',
        descripcion:
          'Se descarta la costa: los caminos grandes son de Akechi. Se decide cruzar Iga de noche y se manda aviso a los guías.',
        escoltaIds: escoltas.slice(0, 3).map((e) => e.id),
        publico: true,
      },
      {
        hora: '18:30',
        descripcion:
          'Alguien se aparta del grupo un rato largo y vuelve sin dar explicaciones. Nadie pregunta.',
        escoltaIds: kancho ? [kancho.id] : [],
        publico: false,
      },
      {
        hora: '20:00',
        descripcion:
          'Se reparte la carga y se decide quién lleva qué. Se sale sin faroles encendidos.',
        escoltaIds: escoltas.map((e) => e.id),
        publico: true,
      },
    ],
    ayudas: [
      {
        nivel: 1,
        texto:
          'Contad cuántos mojones distintos hay sobre la mesa. Si son menos que gente, alguien se está guardando algo y no pasa nada por decirlo en voz alta.',
      },
      {
        nivel: 2,
        texto:
          'Empezad por lo que queda FUERA. Descartar un paso vale tanto como colocar otro, y hay mojones que solo sirven para eso.',
      },
      {
        nivel: 3,
        texto:
          'Si dos mojones se contradicen, uno de los dos es mentira. Mirad quién lo puso, dónde dice haberlo leído, y quién más estuvo allí a esa hora.',
      },
    ],
    desenlace: {
      reconstruccion:
        'La senda era la que era, y estaba escrita entera en los mojones que la columna tuvo delante ' +
        'toda la noche. Lo que faltó no fue información: fue ponerla junta y decidir a quién creer.',
      confesion:
        'No me arrepiento, y no espero que lo entendáis esta noche. El año pasado bajaron por ese mismo ' +
        'camino y no dejaron nada en pie. Yo iba delante de vosotros con una lámpara y con un nombre ' +
        'prestado, y cada vez que alguien me daba las gracias se me revolvía algo. Me ofrecieron que la ' +
        'deuda quedara saldada. No pedí que muriera nadie. Solo tenía que hablar, y hablar se me da bien.',
      epilogo:
        'De lo que pasó después se sabe bastante: el señor volvió a sus tierras, y tres años más tarde ' +
        'los hombres de Iga que le cruzaron aquella noche entraron a su servicio y se quedaron. De lo ' +
        'que pasó en esta casa, decidid vosotros qué se cuenta mañana.',
    },
    guion: [
      'Antes de que llegue nadie: cuelga un cartel en cada paso, deja las tiras de mojones en su habitación y reparte los dosieres cerrados.',
      'Abre la noche leyendo la sinopsis y lo de Honnō-ji. Que quede claro que hay barca y que hay alba.',
      'Al abrir cada hora NO digas dónde están los cazadores. Es lo único que no se anuncia.',
      'Deja que se muevan. Cada cual va hasta su paso, lee la palabra de la puerta y la teclea.',
      'Recuerda que las prendas solo se dan a otra persona, y que quien recibe una debe una respuesta sincera.',
      'Cierra la hora y REVELA dónde estaban los cazadores. Deja que la mesa lo mastique.',
      'Cuando ya casi lo tengan, abre el consejo del alba: cada cual propone su senda y señala.',
      'Echa a andar la senda más apoyada, de verdad, habitación por habitación y con todos detrás.',
      'Cierra revelando la senda, quién cobraba de Akechi y por qué. El pliego lo tienes tú.',
    ],
  };
}
