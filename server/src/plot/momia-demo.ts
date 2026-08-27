/**
 * La respuesta de demostración de El Misterio de la Momia.
 *
 * Tiene la forma EXACTA de lo que devuelve el modelo, escrita a mano. No
 * pretende ser buena literatura: pretende que se pueda recorrer la generación
 * entera, montar los diez imprimibles y verificarlos sin gastar un céntimo de la
 * cuenta de nadie. Es la misma función que cumple `demoPlot.ts` en CLUEDO, y
 * vale exactamente para lo mismo: cuando algo se rompe, se rompe aquí, gratis y
 * a plena luz.
 *
 * UN DETALLE QUE NO ES DECORATIVO: los fragmentos que devuelve son los que
 * escribe `redactar()`. Así la trama de demostración pasa la validación entera
 * —tiene que pasarla, si no la validación estaría rechazando su propio patrón—
 * y el número de frases aceptadas en el informe es 100%. Cuando se quiere probar
 * el camino contrario, se estropea a propósito con `estropearRedaccion`.
 */
import type { Entidad } from '../../../shared/juegos/entidades';
import type { TramaMomia } from '../../../shared/juegos/momia-tipos';
import type { RespuestaMomia } from './momia-esquema';
import type { EntidadesDeMomia } from './momia-cimientos';

/** Un papel de expedición por persona, ciclando. Suficiente para probar. */
const PAPELES = [
  { role: 'epigrafista de la misión', persona: 'Traduce lo que nadie más sabe leer, y le gusta que se note.' },
  { role: 'médico de campaña', persona: 'Lleva el botiquín y la paciencia. Ha visto cosas peores en el Somme.' },
  { role: 'capataz de la excavación', persona: 'Manda la cuadrilla desde antes de que llegaran los ingleses.' },
  { role: 'mecenas de la expedición', persona: 'Paga. Recuerda a menudo que paga.' },
  { role: 'fotógrafa de la misión', persona: 'Todo lo que ha ocurrido aquí ha pasado antes por su objetivo.' },
  { role: 'guardián de la concesión', persona: 'Responde ante El Cairo, y El Cairo no perdona.' },
  { role: 'agregada del museo', persona: 'Vino a catalogar y se ha quedado a discutir.' },
  { role: 'intérprete de la misión', persona: 'Habla con todo el mundo. Sabe más de lo que dice.' },
];

const SECRETOS = [
  'Vendiste una pieza menor en El Cairo hace dos temporadas y nadie lo sabe.',
  'La tesis con la que llegaste aquí no era tuya del todo.',
  'Debes dinero a alguien que ha preguntado por ti en el campamento.',
  'Escribiste al periódico antes que al patronato, y cobraste por hacerlo.',
  'Estuviste dentro de la cámara la noche del sello, y dijiste que no.',
  'Guardas una llave que oficialmente se perdió en el pozo.',
];

/**
 * Escribe una respuesta completa sin llamar a ningún modelo.
 *
 * Recibe la trama que ya generó el código porque tiene que ser coherente con
 * ella: las mismas vigilias, las mismas cámaras profanadas y los mismos ids de
 * fragmento. Una demo que no cuadrara con los cimientos no probaría el camino
 * de verdad, que es justo lo que se le pide.
 */
export function respuestaDeDemostracion(
  nombrePartida: string,
  entidades: EntidadesDeMomia,
  trama: TramaMomia,
): RespuestaMomia {
  const { expedicionarios, camaras, reliquias, ritos } = entidades;
  const nombreDe = (lista: Entidad[], id: string): string =>
    lista.find((e) => e.id === id)?.name ?? id;

  // El saqueador de la demo: el último de la lista. Fijo a propósito, para que
  // la partida congelada no cambie de culpable entre dos ejecuciones.
  const saqueador = expedicionarios[expedicionarios.length - 1]!;

  return {
    title: `${nombrePartida}: la tumba abierta`,
    tagline: 'El sello está roto. Alguien de la expedición lo quiso así.',
    synopsis:
      'La concesión se firmó en marzo y la cámara se abrió en noviembre. Desde esa noche, las lámparas ' +
      'se apagan solas y quien duerme cerca del pozo amanece con la boca seca. Antes del amanecer hay ' +
      'que volver a sellar la tumba, y para eso hacen falta cinco ritos en el orden exacto en que se ' +
      'escribieron. El papiro que lo decía se rompió al abrirse la puerta.',
    faraon: {
      nombre: 'Neferhotep el Menor',
      descripcion:
        'Reinó poco y mal, y su nombre fue picado de los muros por quien vino después. Lo enterraron ' +
        'deprisa, con el sello triple de los que no deben volver, y durante tres mil años nadie ' +
        'discutió esa decisión.',
    },
    ambientacion:
      `La casa entera se ha convertido en la tumba: ${camaras
        .slice(0, 3)
        .map((c) => c.name)
        .join(', ')} y lo que las une son ahora corredores excavados en la roca.`,
    tumba: {
      porQueEstabaSellada:
        'El sello triple advertía que el difunto no había pagado su deuda con la balanza y que abrir ' +
        'la puerta era aceptarla en su lugar.',
      queSeAbrio:
        'Primero el corredor, después la antesala, y la última noche la cámara del sarcófago, contra ' +
        'el criterio del guardián de la concesión.',
      laNocheDelSello:
        'Se cenó tarde. Hubo una discusión por quién firmaría el hallazgo. A la una alguien bajó con ' +
        'una lámpara y a las dos el sello estaba en el suelo, en tres pedazos, y nadie vio nada.',
    },
    saqueadorId: saqueador.id,
    motivoDelSaqueo:
      'Su hermana lleva cuatro años en un sanatorio suizo que se paga por adelantado. El comprador no ' +
      'pidió la reliquia: pidió que la puerta estuviera abierta una noche. Aceptó pensando que no era ' +
      'robar, porque nada de aquello era de nadie.',
    comoOcurrio:
      'Esperó a que la discusión de la cena se alargara, bajó con la lámpara de repuesto y golpeó el ' +
      'sello por la juntura, que es por donde ceden. Dejó la puerta entornada y volvió a subir antes ' +
      'del segundo turno de café.',
    expedicionarios: expedicionarios.map((persona, i) => {
      const papel = PAPELES[i % PAPELES.length]!;
      const otro = expedicionarios[(i + 1) % expedicionarios.length]!;
      return {
        suspectId: persona.id,
        characterName: persona.name,
        role: papel.role,
        publicPersona: papel.persona,
        secret: SECRETOS[i % SECRETOS.length]!,
        motive:
          'Si la tumba no se sella, la concesión se prorroga otra temporada y hay quien necesita esa ' +
          'temporada más que el resto.',
        alibi: `Dice haber estado con ${otro.name} en el corredor, revisando el registro de piezas, entre la una y las dos.`,
        knowledge: [
          `${otro.name} bajó a la cámara después de cenar y volvió sin la lámpara.`,
          'Alguien pidió que no se fotografiara el sello antes de moverlo.',
        ],
        personalHook: persona.description?.trim()
          ? `Se le ha dado un papel donde eso mismo le sirve: ${persona.description.trim()}`
          : 'Se le ha dado un papel que tira de la mesa: es quien reparte la palabra cuando nadie se aclara.',
        elDon:
          'Te tocó por costumbre más que por mérito: llevas haciéndolo desde antes de que esta ' +
          'expedición tuviera nombre, y aquí nadie discute lo que uno lleva haciendo años.',
      };
    }),
    ritos: ritos.map((rito) => ({
      ritoId: rito.id,
      invocacion: `Que ${rito.name.toLocaleLowerCase('es')} cierre lo que la mano abrió.`,
      gesto: 'Apaga una vela, di el nombre del difunto y espera a que alguien conteste.',
    })),
    camaras: camaras.map((camara) => ({
      camaraId: camara.id,
      inscripcion: `Aquí se guarda lo que no se pesa. Entra si has de entrar, y no te entretengas.`,
    })),
    reliquias: reliquias.map((reliquia) => ({
      reliquiaId: reliquia.id,
      relato:
        'Salió del nicho lateral, envuelta en lino podrido. Vale menos de lo que se dice y más de lo ' +
        'que se paga por ella.',
    })),
    // La redacción del código, tal cual: es la que la validación acepta.
    fragmentos: [...trama.restricciones, ...trama.falsasCandidatas].map((r) => ({
      id: r.id,
      texto: r.texto,
    })),
    vigilias: trama.profanadas.map((camaraId, i) => ({
      ronda: i + 1,
      titulo: `Vigilia ${i + 1}`,
      texto:
        `Se abre la vigilia ${i + 1}. Esta noche está profanada ${nombreDe(camaras, camaraId)}: quien entre ahí ` +
        'saldrá con algo escrito y con algo encima. El aire se ha vuelto espeso desde el pozo. ' +
        'Quedan menos horas de las que parece. Hablad entre vosotros: nadie tiene bastante solo.',
      indicacion: i === 0 ? 'Baja las luces antes de empezar.' : '',
    })),
    cronologia: [
      { hora: '21:30', descripcion: 'Cena en el corredor, con discusión por quién firma el hallazgo.', expedicionarioIds: expedicionarios.map((e) => e.id), publico: true },
      { hora: '23:10', descripcion: 'Se apaga la lámpara grande y nadie sabe decir por qué.', expedicionarioIds: expedicionarios.map((e) => e.id), publico: true },
      { hora: '01:05', descripcion: 'Alguien baja con la lámpara de repuesto.', expedicionarioIds: [saqueador.id], publico: false },
      { hora: '02:00', descripcion: 'El sello aparece en el suelo, en tres pedazos.', expedicionarioIds: expedicionarios.map((e) => e.id), publico: true },
    ],
    ayudas: [
      { nivel: 1, texto: 'Poned todos los papiros sobre la mesa. Sobra información y falta orden.' },
      { nivel: 2, texto: 'Empezad por los que fijan un lugar exacto: son los que menos se prestan a discusión.' },
      { nivel: 3, texto: 'Uno de los papiros que hay sobre la mesa contradice a otros dos. Buscadlo.' },
    ],
    desenlace: {
      reconstruccion:
        `Se selló por fin en este orden: ${trama.ordenVerdadero
          .map((id, i) => `${i + 1}. ${nombreDe(ritos, id)}`)
          .join('; ')}. Y el sello no se había roto solo.`,
      confesion:
        'Fui yo. Bajé con la lámpara de repuesto y golpeé la juntura. No me pidieron la pieza: me ' +
        'pidieron que la puerta estuviera abierta una noche. Llevo cuatro años pagando un sanatorio ' +
        'en Suiza y no se me ocurrió otra manera. Si alguno de vosotros hubiera preguntado alguna vez ' +
        'de dónde salía el dinero, quizá me habría dado vergüenza a tiempo.',
      epilogo:
        'La concesión se retiró en febrero. Dos de los presentes volvieron al año siguiente con otra ' +
        'bandera y otro patrocinador, y ninguno mencionó nunca aquella noche.',
    },
    guion: [
      'Reparte los dosieres en sobres cerrados y no dejes que nadie abra el ajeno.',
      'Lee la narración de la primera vigilia y anuncia qué cámara está profanada.',
      'Deja diez minutos para explorar: cada cual entra en una cámara y recoge lo que haya.',
      'Recuerda que los dones se usan una vez por vigilia y que hay que decirlo en voz alta.',
      'Cierra la vigilia: que cada cual cuente lo que quiera contar, y solo lo que quiera.',
      'Repite tantas vigilias como aguante la mesa, subiendo la presión en cada una.',
      'Abre el sellado: cada persona escribe su orden y a quién señala, en silencio.',
      'Ejecuta el orden más votado, lee el desenlace y deja que el saqueador confiese.',
    ],
  };
}
