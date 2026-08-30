/**
 * Generador local de tramas para el MODO DEMO (sin clave de API).
 *
 * Produce un `Plot` completo y digno: asesino, arma y sala elegidos al azar,
 * víctima inventada, plantillas en español con variaciones, coartadas
 * cruzadas y personajes construidos con los nombres y descripciones reales
 * de la partida.
 *
 * Expone además `generateDemoCharacters`, que amplía una trama YA escrita con
 * los personajes de los jugadores incorporados después. Lo usa la ruta
 * /refresh tanto en modo demo como de red de seguridad cuando la IA no
 * devuelve todos los personajes pedidos.
 */
import type { GameSession, Plot, PlotCharacter, Room, Suspect, TimelineEvent, Weapon } from '../../../shared/types';
import { culpableDe, objetosDe, respuestasCluedo, salasDe, sospechososDe, victimaDe } from '../juegos/cluedo';
import type { PlotClue } from '../../../shared/mecanicas/pistas';

// ------------------------------ plantillas ------------------------------

const VICTIMAS = [
  {
    name: 'el Doctor Lenoir',
    description:
      'Médico de la alta sociedad, confidente de medio vecindario y guardián de demasiados secretos ajenos. Esta noche celebraba, decía, "un anuncio que lo cambiaría todo".',
  },
  {
    name: 'la Baronesa Von Adler',
    description:
      'Viuda de fortuna incalculable y lengua afilada. Coleccionaba joyas, amistades convenientes y pagarés firmados por casi todos los presentes.',
  },
  {
    name: 'el magnate Aurelio Blanco',
    description:
      'Dueño de medio puerto y de la paciencia de nadie. Había citado a sus invitados para "ajustar cuentas pendientes" antes de medianoche.',
  },
  {
    name: 'Madame Colette Duval',
    description:
      'Antigua estrella del cabaret reconvertida en anfitriona legendaria. Sabía escuchar detrás de las puertas... y lo apuntaba todo en un diario granate.',
  },
];

/**
 * Apellidos de color al estilo del Cluedo original (Escarlata, Mostaza…).
 * Se usan como sobrenombre detrás del nombre real: funcionan con cualquier
 * nombre sin chocar en género, a diferencia de los tratamientos clásicos.
 */
const TITULOS = [
  'Escarlata',
  'Mostaza',
  'Esmeralda',
  'Añil',
  'Ciruela',
  'Marfil',
  'Azabache',
  'Carmesí',
  'Turquesa',
  'Ámbar',
  'Bermellón',
  'Cobalto',
  'Ocre',
  'Púrpura',
];

const ROLES = [
  'mano derecha de la víctima en los negocios',
  'amistad de la infancia que reapareció hace poco',
  'estrella invitada de la velada',
  'persona de confianza de la familia desde hace décadas',
  'cronista de sociedad con pluma temible',
  'quien gestionaba las cuentas y contratos de la casa',
  'visita inesperada que nadie recuerda haber invitado',
  'promesa del mundo del arte apadrinada por la víctima',
];

const RASGOS = [
  'su encanto imposible de resistir',
  'una memoria que no perdona ni una fecha',
  'sus silencios más elocuentes que cualquier discurso',
  'una risa que llena los salones',
  'un gusto exquisito y carísimo',
  'una calma sospechosamente inalterable',
  'saber siempre más de lo que dice',
  'llegar tarde a todas partes menos a la mesa',
];

const MOTIVOS = [
  'una herencia disputada durante años',
  'un chantaje que amenazaba con salir a la luz',
  'unas deudas de juego imposibles de pagar',
  'un romance secreto que la víctima había descubierto',
  'una venganza incubada desde una ruina que nunca perdonó',
  'unos documentos comprometedores guardados bajo llave',
  'un ascenso social que la víctima podía destruir con una palabra',
];

const SECRETOS = [
  'Debe una pequeña fortuna a prestamistas poco recomendables… y la víctima lo sabía.',
  'Mantiene correspondencia secreta con el mayor rival de la familia.',
  'No es quien dice ser: su título es comprado y su pasado, inventado.',
  'La semana pasada fue quien forzó el escritorio privado de la víctima.',
  'Guarda una copia de la llave de todas las salas de la casa.',
  'Lleva meses falsificando las cuentas que gestionaba para la víctima.',
  'La víctima le retiró de su testamento hace tres días. Aún no se lo ha contado a nadie.',
];

const TAGLINES = [
  'Cuando la música paró, alguien ya estaba muerto.',
  'Nadie abandona la mansión hasta que la verdad salga a la luz.',
  'Todos tienen coartada. Todos mienten.',
  'La última copa se sirvió con veneno de cortesía.',
];

// ------------------------------ utilidades ------------------------------

function alAzar<T>(elementos: T[]): T {
  return elementos[Math.floor(Math.random() * elementos.length)];
}

function cicla<T>(elementos: T[], indice: number): T {
  return elementos[indice % elementos.length];
}

/** Entidades de reserva por si la partida llega vacía (no debería, pero el demo nunca casca). */
function conReserva<T>(lista: T[], reserva: T[]): T[] {
  return lista.length > 0 ? lista : reserva;
}

// ------------------------------ generador ------------------------------

export function generateDemoPlot(game: GameSession): Plot {
  const sospechosos: Suspect[] = conReserva(sospechososDe(game), [
    { id: 'invitado-1', name: 'Un invitado sin nombre' },
    { id: 'invitado-2', name: 'Una silueta en el umbral' },
  ]);
  const salas: Room[] = conReserva(salasDe(game), [
    { id: 'sala-1', name: 'El Gran Salón' },
    { id: 'sala-2', name: 'La Biblioteca' },
  ]);
  const armas: Weapon[] = conReserva(objetosDe(game), [
    { id: 'arma-1', name: 'El candelabro' },
    { id: 'arma-2', name: 'La cuerda de seda' },
  ]);

  const asesino = alAzar(sospechosos);
  const armaCrimen = alAzar(armas);
  const salaCrimen = alAzar(salas);
  const victima = alAzar(VICTIMAS);
  const motivo = alAzar(MOTIVOS);
  const lugar = game.name?.trim() ? game.name.trim() : 'la mansión';

  const characters = construirPersonajes(sospechosos, salas, asesino, motivo);
  const timeline = construirCronologia(sospechosos, asesino, salaCrimen, victima.name);
  const clues = construirPistas(salas, sospechosos, asesino, armaCrimen, salaCrimen);

  return {
    title: alAzar([
      `El último vals de ${victima.name}`,
      `Sombras sobre ${lugar}`,
      `Medianoche en ${lugar}`,
      `El silencio de ${victima.name}`,
    ]),
    tagline: alAzar(TAGLINES),
    synopsis:
      `La velada en ${lugar} prometía champán, música y un gran anuncio. ` +
      `Pero cuando las luces volvieron tras el apagón, ${victima.name} yacía sin vida ` +
      `y ninguno de los ${sospechosos.length} invitados quiso ser el primero en hablar. ` +
      `El arma no aparece, la sala del crimen se disputa y cada coartada tiene una costura suelta. ` +
      `Uno de los presentes miente mejor que los demás.`,
    victim: { name: victima.name, description: victima.description },
    setting:
      `La acción transcurre en ${lugar}, reconvertida por una noche en una mansión de los años 20. ` +
      `Cada espacio real se transforma: ${salas.map((sala) => sala.name).join(', ')}. ` +
      `Luz baja, jazz de fondo y copas largas: nadie debería fiarse de nadie.`,
    solution: {
      respuestas: respuestasCluedo({
        murdererId: asesino.id,
        weaponId: armaCrimen.id,
        lugarId: salaCrimen.id,
      }),
      motive: motivo,
      howItHappened:
        `Aprovechando el apagón de las 21:40, ${asesino.name} se deslizó hasta ${salaCrimen.name}, ` +
        `donde ${victima.name} esperaba a solas una conversación "privada". ` +
        `Bastaron dos minutos y ${armaCrimen.name.toLowerCase()} para zanjar ${motivo}. ` +
        `Después, ${asesino.name} volvió al grupo fingiendo buscar velas, con el pulso casi firme.`,
    },
    characters,
    timeline,
    /* Las pistas son de la mecánica, no del contrato de la trama. */
    mecanicas: { pistas: clues },
    gmScript: [
      `Antes de que lleguen los invitados, reparte o memoriza las pistas de cada sala (las tienes listadas en tu dosier) y decide cuáles esconderás físicamente.`,
      `Recibe a cada invitado por separado, entrégale su dosier confidencial y dale unos minutos para leerlo a solas. Nadie debe enseñar su dosier a nadie.`,
      `Abre la velada leyendo la sinopsis en voz alta, presenta a ${victima.name} con teatro… y despídele: a las 21:47 se descubre el cuerpo.`,
      `Anuncia el descubrimiento siguiendo la cronología. Desde ese momento los detectives pueden moverse por las salas, buscar pistas e interrogarse en personaje.`,
      `Modera las sugerencias sala a sala (personaje + arma + la sala en la que están) y recuerda el turno de refutación cuando haga falta.`,
      `Si la investigación se estanca, deja caer una pista de las reservas o improvisa a un mayordomo chismoso que "recuerda algo de pronto".`,
      `Cuando alguien formule su acusación final, reúne a todos en la sala principal y revela la solución paso a paso, saboreando cada pausa.`,
      `Cierra con el motivo y el relato de cómo ocurrió, y brinda por quien haya resuelto el caso… o por el asesino, si nadie lo logró.`,
    ],
  };
}

// ------------------------------ piezas ------------------------------

function construirPersonajes(
  sospechosos: Suspect[],
  salas: Room[],
  asesino: Suspect,
  motivoReal: string,
): PlotCharacter[] {
  return sospechosos.map((sospechoso, i) => {
    const esAsesino = sospechoso.id === asesino.id;
    const companero = cicla(sospechosos, i + 1);
    const salaCoartada = cicla(salas, i);
    const characterName = `${sospechoso.name} ${cicla(TITULOS, i)}`;

    const alibi = esAsesino
      ? `Afirma que durante el apagón estaba a solas en ${cicla(salas, i + 1).name}, "tomando el aire". Nadie puede confirmarlo.`
      : `Asegura que durante el apagón estaba en ${salaCoartada.name} charlando con ${companero.name}. ${companero.name} solo puede confirmarlo a medias.`;

    const knowledge = [
      `Viste a ${cicla(sospechosos, i + 2).name} discutir en voz baja con la víctima poco antes de la cena.`,
      `Sabes que ${companero.name} entró en ${cicla(salas, i + 2).name} cuando todos le creían en otra parte.`,
      `Tras el apagón oíste un objeto metálico caer al suelo, aunque no sabrías decir dónde exactamente.`,
    ];

    const personalHook = sospechoso.description?.trim()
      ? `Este personaje está cosido a tu medida. Quien te conoce dice de ti: «${sospechoso.description.trim()}». Úsalo esta noche: que esa forma de ser sea el disfraz perfecto… o la coartada perfecta.`
      : `No sabemos mucho de ti, y eso es una ventaja: esta noche puedes ser exactamente quien quieras. Nadie podrá distinguir tu papel de tu verdad.`;

    return {
      participanteId: sospechoso.id,
      characterName,
      role: cicla(ROLES, i),
      publicPersona: `${characterName} es ${cicla(ROLES, i)}, y en sociedad se comenta ante todo ${cicla(RASGOS, i)}.`,
      secret: cicla(SECRETOS, i),
      motive: esAsesino
        ? motivoReal
        : `${cicla(MOTIVOS, i + 3)} — o eso murmuran en los pasillos.`,
      alibi,
      knowledge,
      personalHook,
    };
  });
}

function construirCronologia(
  sospechosos: Suspect[],
  asesino: Suspect,
  salaCrimen: Room,
  nombreVictima: string,
): TimelineEvent[] {
  const todos = sospechosos.map((s) => s.id);
  const descubridor = sospechosos.find((s) => s.id !== asesino.id) ?? asesino;
  return [
    {
      time: '19:00',
      description: `Los invitados van llegando; ${nombreVictima} recibe a cada uno con una copa y una indirecta.`,
      participanteIds: todos,
      isPublic: true,
    },
    {
      time: '19:45',
      description: `Durante el aperitivo, ${nombreVictima} anuncia que a medianoche "pondrá los puntos sobre las íes". Varias copas se detienen a medio camino.`,
      participanteIds: todos,
      isPublic: true,
    },
    {
      time: '20:30',
      description: 'Cena servida. Conversación brillante en la superficie, cuchillos afilados por debajo.',
      participanteIds: todos,
      isPublic: true,
    },
    {
      time: '21:15',
      description: `${nombreVictima} se excusa y se retira "a atender un asunto privado". Nadie admite haberle seguido.`,
      participanteIds: [],
      isPublic: true,
    },
    {
      time: '21:40',
      description: 'Un apagón deja la casa a oscuras durante varios minutos. Pasos, un roce de telas, una puerta que no debía abrirse.',
      participanteIds: todos,
      isPublic: true,
    },
    {
      // Delator: nadie lo vio, así que jamás debe salir del dosier del GM.
      time: '21:44',
      description: `Una silueta se desliza hacia ${salaCrimen.name} amparada por la oscuridad y vuelve al salón antes de que prendan las velas.`,
      participanteIds: [asesino.id],
      isPublic: false,
    },
    {
      time: '21:47',
      description: `Vuelve la luz. Un grito: ${descubridor.name} encuentra el cuerpo de ${nombreVictima}. La velada se convierte en investigación.`,
      participanteIds: [descubridor.id, ...todos.filter((id) => id !== descubridor.id)],
      isPublic: true,
    },
  ];
}

function construirPistas(
  salas: Room[],
  sospechosos: Suspect[],
  asesino: Suspect,
  armaCrimen: Weapon,
  salaCrimen: Room,
): PlotClue[] {
  const pistas: PlotClue[] = [];
  const inocentes = sospechosos.filter((s) => s.id !== asesino.id);

  salas.forEach((sala, i) => {
    const esEscenaDelCrimen = sala.id === salaCrimen.id;
    const senuelo = inocentes.length > 0 ? cicla(inocentes, i) : asesino;

    if (esEscenaDelCrimen) {
      pistas.push({
        id: `pista-${i + 1}-a`,
        lugarId: sala.id,
        description: `Una alfombra ligeramente torcida y una mancha reciente que alguien limpió con más prisa que acierto.`,
        pointsTo: 'Señala esta sala como la verdadera escena del crimen.',
        // Decisiva: cierra la sala del crimen, así que va en la última ronda.
        round: 4,
      });
      pistas.push({
        id: `pista-${i + 1}-b`,
        lugarId: sala.id,
        description: `Una marca del tamaño y forma de ${armaCrimen.name.toLowerCase()} en el polvo de una repisa: algo estuvo ahí hasta esta misma noche.`,
        pointsTo: `Señala ${armaCrimen.name} como el arma del crimen.`,
        round: 4,
      });
    } else {
      pistas.push({
        id: `pista-${i + 1}-a`,
        lugarId: sala.id,
        description: cicla(
          [
            `Un pañuelo bordado con una inicial, abandonado con demasiada intención como para ser un descuido.`,
            `Una copa a medio beber con una huella de carmín (o de dedos nerviosos) en el borde.`,
            `Un papel arrugado en la papelera: media frase tachada que habla de "saldar esto esta noche".`,
            `Una cortina descolgada de un tirón, como si alguien se hubiera escondido tras ella.`,
          ],
          i,
        ),
        pointsTo: `Parece incriminar a ${senuelo.name}… quizá demasiado claramente. Pista falsa.`,
        // Señuelo: es lo que se saca al principio para levantar sospechas.
        round: 1,
      });
      pistas.push({
        id: `pista-${i + 1}-b`,
        lugarId: sala.id,
        description: cicla(
          [
            `Barro fresco junto a la ventana: alguien entró o salió por donde no debía.`,
            `Un reloj de sobremesa parado a las 21:43. Nadie recuerda haberlo tocado.`,
            `Una cerilla consumida hasta el final, de las que se usan para alumbrarse a oscuras.`,
            `El cajón del escritorio forzado; dentro, solo el hueco de lo que alguien se llevó.`,
          ],
          i + 1,
        ),
        pointsTo: `Sitúa a alguien moviéndose por la casa durante el apagón. Encaja con la coartada rota de ${asesino.name}.`,
        // Horarios y trayectos, repartidos entre la segunda y la tercera ronda.
        // Si todas fueran a la tercera, la segunda se quedaba sin nada que sacar
        // y la partida se paraba en seco a mitad de velada.
        round: i % 2 === 0 ? 2 : 3,
      });
    }
  });

  return pistas;
}

// ------------------------------ ampliación ------------------------------

/**
 * Escribe los personajes que faltan en una trama YA existente, sin tocar nada
 * de lo escrito. Reutiliza las mismas plantillas del generador demo, evita los
 * apellidos de color ya usados y cruza las coartadas con los personajes que ya
 * estaban en la trama, para que los recién llegados no queden sueltos.
 *
 * La usa la ruta /refresh: en modo demo como generador principal y, con API,
 * como red de seguridad cuando el modelo no devuelve todos los personajes.
 *
 * @param participanteIds ids de los sospechosos a los que hay que dar personaje.
 */
export function generateDemoCharacters(
  game: GameSession,
  participanteIds: string[],
  plot: Plot,
): PlotCharacter[] {
  const sospechosoPorId = new Map(sospechososDe(game).map((s) => [s.id, s]));
  const yaTienenPersonaje = new Set(plot.characters.map((personaje) => personaje.participanteId));

  // Se ignoran ids repetidos, inexistentes o que ya tenían personaje.
  const pendientes: Suspect[] = [];
  const vistos = new Set<string>();
  for (const id of participanteIds) {
    const sospechoso = sospechosoPorId.get(id);
    if (!sospechoso || vistos.has(id) || yaTienenPersonaje.has(id)) continue;
    vistos.add(id);
    pendientes.push(sospechoso);
  }
  if (pendientes.length === 0) return [];

  const salas: Room[] = conReserva(salasDe(game), [
    { id: 'sala-1', name: 'El Gran Salón' },
    { id: 'sala-2', name: 'La Biblioteca' },
  ]);

  // Apellidos de color que aún no ha gastado ningún personaje de la trama.
  const usados = new Set(
    TITULOS.filter((titulo) =>
      plot.characters.some((personaje) => personaje.characterName.includes(titulo)),
    ),
  );
  const libres = TITULOS.filter((titulo) => !usados.has(titulo));
  const repertorio = libres.length > 0 ? libres : TITULOS;

  // Nombres de los personajes que ya estaban escritos: sirven de testigos.
  const testigos = plot.characters.map((personaje) => personaje.characterName);
  const nombreVictima = victimaDe(plot).name;

  return pendientes.map((sospechoso, i) => {
    // Se desplazan las plantillas para no repetir las de los personajes ya escritos.
    const desplazamiento = plot.characters.length + i;
    const characterName = `${sospechoso.name} ${cicla(repertorio, i)}`;
    const papel = cicla(ROLES, desplazamiento);
    const esAsesino = culpableDe(plot.solution) === sospechoso.id;
    const salaCoartada = cicla(salas, desplazamiento);

    const testigo = testigos.length > 0 ? cicla(testigos, i) : null;
    const otro = testigos.length > 1 ? cicla(testigos, i + 1) : null;

    const alibi = esAsesino
      ? `Afirma que durante el apagón salió a ${salaCoartada.name} "a tomar el aire". Nadie puede confirmarlo… y tú sabes muy bien por qué.`
      : testigo
        ? `Asegura que durante el apagón estaba en ${salaCoartada.name} con ${testigo}, zanjando un asunto de dinero. ${testigo} llegó tarde a esa conversación y solo podrá confirmar la mitad.`
        : `Asegura que durante el apagón estaba en ${salaCoartada.name}, a solas y con una copa de más. Nadie puede confirmarlo.`;

    const secretoBase = cicla(SECRETOS, desplazamiento);
    const secret = testigo
      ? `${secretoBase} Y hay algo peor: ${testigo} lo descubrió hace una semana y desde entonces te trata con una amabilidad que hiela.`
      : secretoBase;

    const knowledge: string[] = [];
    if (testigo) {
      knowledge.push(
        `Viste a ${testigo} salir de ${cicla(salas, desplazamiento + 1).name} guardándose algo en el bolsillo, poco antes del apagón.`,
      );
    }
    if (otro && otro !== testigo) {
      knowledge.push(
        `${otro} te aseguró que no había cruzado palabra con ${nombreVictima} en toda la noche. Tú les oíste discutir antes de la cena.`,
      );
    }
    knowledge.push(
      'Acabas de incorporarte a este círculo: nadie ha tenido tiempo de ponerse de acuerdo contigo, así que cualquier versión que te cuenten hoy es la primera.',
    );

    const personalHook = sospechoso.description?.trim()
      ? `Este personaje se ha escrito después, expresamente para ti. Quien te conoce dice de ti: «${sospechoso.description.trim()}». Aprovéchalo: llegas con la ventaja del recién llegado y nadie sabe todavía de qué eres capaz.`
      : `Llegas cuando la velada ya estaba escrita, y eso es una ventaja: nadie tiene una versión previa de ti. Esta noche puedes ser exactamente quien te convenga.`;

    return {
      participanteId: sospechoso.id,
      characterName,
      role: papel,
      publicPersona: `${characterName} es ${papel}, y desde su llegada no se habla en la casa de otra cosa que de ${cicla(RASGOS, desplazamiento)}.`,
      secret,
      motive: esAsesino
        ? plot.solution.motive
        : `${cicla(MOTIVOS, desplazamiento + 2)} — o eso murmuran quienes te vieron llegar.`,
      alibi,
      knowledge,
      personalHook,
    };
  });
}
