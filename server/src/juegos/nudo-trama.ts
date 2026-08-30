/**
 * La trama de El Nudo de Valdehierro: lo que se decide antes de que llegue nadie.
 *
 * ═══ LOS CIMIENTOS SE PONEN AQUÍ Y EL MODELO NO LOS TOCA ═══
 *
 * Esta es la decisión de diseño más importante del juego y conviene decirla
 * antes que nada: **el cuadro de marchas, los telegramas y el reparto de
 * oficios los calcula este fichero, con azar sembrado y comprobación
 * exhaustiva, ANTES de que el modelo escriba una palabra.** El modelo pone la
 * prosa —cómo se llama la noche, qué le pasa a cada personaje, qué se lee al
 * abrir cada franja— y nada más.
 *
 * No es desconfianza: es que el rompecabezas tiene que cumplir cuatro
 * garantías comprobables y un modelo no puede garantizar nada. Un cuadro
 * escrito por el modelo tendría dos soluciones una noche de cada cinco, y esa
 * noche la mesa discutiría dos cuadros correctos hasta el amanecer. Con los
 * cimientos aquí, lo peor que puede pasar con la prosa es que sea sosa.
 *
 * Es el mismo reparto que hace El Paso de las Sombras con su senda, y por la
 * misma razón.
 *
 * ═══ Y POR ESO ESTE FICHERO GENERA UNA PARTIDA COMPLETA SIN IA ═══
 *
 * Si los cimientos ya están puestos, escribir una velada entera sin clave de
 * API es rellenar huecos con plantillas. Lo hace `generarTramaNudo`, y no es
 * un modo degradado: es una partida que se puede jugar de principio a fin. Lo
 * que le falta es color.
 */
import { registrarAmpliacion } from './ampliaciones';
import { azarCon, barajar, escribirTelegramas, generarCuadro, verificarCuadro } from './nudo-cuadro';
import { entidadesDe } from '../../../shared/juegos';
import {
  FRANJAS_DE_LA_NOCHE,
  HORAS_DE_FRANJA,
  MANA_DE_OFICIO,
  NOMBRE_DE_OFICIO,
  OFICIOS,
  OFICIO_DE_PERSONA,
  horaDeFranja,
  retrasoMaximoPara,
} from '../../../shared/juegos/nudo-tipos';
import type { Entidad } from '../../../shared/juegos';
import type {
  ConvoyId,
  EstadoNudo,
  OficioId,
  TramaNudo,
} from '../../../shared/juegos/nudo-tipos';
import type { GameSession, Plot, PlotCharacter, TimelineEvent } from '../../../shared/types';

/** Dónde guarda este juego lo suyo dentro de `LiveSession.estado`. */
export const CLAVE_ESTADO = 'nudo';

/** Los ejes, en el orden en que los declara el manifiesto. */
export function ejeDeFranja(franja: number): string {
  return `franja-${franja}`;
}

// ---------------------------------------------------------------------------
// Bajar la trama de `unknown` a tipo
// ---------------------------------------------------------------------------

/**
 * La trama de este juego, si la partida la tiene.
 *
 * `Plot.delJuego` es `unknown` a propósito —el contrato general no sabe a qué
 * se juega— así que alguien tiene que bajarlo a tipo, y ese alguien comprueba
 * antes de creerse nada: una partida de CLUEDO, o una de este juego generada
 * por una versión anterior, pasa por aquí y sale SIN trama en vez de reventar
 * en mitad de una proyección con doce móviles mirando.
 */
export function tramaDe(plot: Plot | undefined): TramaNudo | undefined {
  const posible = plot?.delJuego as TramaNudo | undefined;
  if (
    !posible ||
    !Array.isArray(posible.cuadro) ||
    posible.cuadro.length === 0 ||
    !Array.isArray(posible.telegramas) ||
    typeof posible.oficioDePuesto !== 'object' ||
    typeof posible.oficioDePersona !== 'object' ||
    typeof posible.correo !== 'string'
  ) {
    return undefined;
  }
  return posible;
}

// ---------------------------------------------------------------------------
// La rueda de los oficios
// ---------------------------------------------------------------------------

/**
 * Quién ejerce qué, contando también a quien llegó tarde.
 *
 * ═══ POR QUÉ ES UNA RUEDA Y NO UN RESPALDO ═══
 *
 * La trama guarda el oficio de cada persona que había al generar. A quien se
 * apunta después no le toca ninguno, y la tentación es poner
 * `trama.oficioDePersona[id] ?? 'agujas'`. Ese respaldo silencioso hace que la
 * partida dé DOS RESPUESTAS DISTINTAS a la misma pregunta: el móvil le pondría
 * «guardagujas» mientras su dosier impreso dice que no le tocó ninguno.
 *
 * Es exactamente el fallo que ya se pagó en El Misterio de la Momia con los
 * dones. Con una rueda determinista sobre la lista de personas ordenada, la
 * respuesta es la MISMA se actualice la partida o no, y antes o después de que
 * nadie empareje un móvil.
 */
export function oficiosAlDia(
  trama: TramaNudo,
  ferroviarios: Entidad[],
): Record<string, OficioId> {
  const salida: Record<string, OficioId> = { ...trama.oficioDePersona };
  /*
   * Se cuenta cuántos hay ya de cada oficio para que quien llegue tarde reciba
   * el MENOS representado, no el siguiente de la lista. Con siete personas y
   * cuatro oficios, repartir a ciegas dejaba tres garitas y ningún muelle.
   */
  const cuenta = new Map<OficioId, number>(OFICIOS.map((o) => [o, 0]));
  for (const oficio of Object.values(salida)) cuenta.set(oficio, (cuenta.get(oficio) ?? 0) + 1);

  for (const persona of ferroviarios) {
    if (salida[persona.id]) continue;
    let elegido: OficioId = OFICIOS[0]!;
    for (const o of OFICIOS) {
      if ((cuenta.get(o) ?? 0) < (cuenta.get(elegido) ?? 0)) elegido = o;
    }
    salida[persona.id] = elegido;
    cuenta.set(elegido, (cuenta.get(elegido) ?? 0) + 1);
  }
  return salida;
}

/**
 * Qué oficio se ejerce en cada puesto, contando los que se añadieron después.
 *
 * Por lo mismo que arriba, y con una consecuencia más gorda: un puesto sin
 * oficio no tiene instrumento, así que quien vaya hasta esa habitación se
 * encuentra la pantalla vacía y no puede ganar conformidad. La rueda reparte
 * los cuatro oficios por turnos, que es lo que hace una estación de verdad
 * cuando abre un cuarto nuevo.
 */
export function oficiosDePuestoAlDia(
  trama: TramaNudo,
  puestos: Entidad[],
): Record<string, OficioId> {
  const salida: Record<string, OficioId> = { ...trama.oficioDePuesto };
  let siguiente = Object.keys(salida).length;
  for (const puesto of puestos) {
    if (salida[puesto.id]) continue;
    salida[puesto.id] = OFICIOS[siguiente % OFICIOS.length]!;
    siguiente++;
  }
  return salida;
}

// ---------------------------------------------------------------------------
// Los cimientos
// ---------------------------------------------------------------------------

export interface OpcionesDeCimientos {
  semilla?: string | number;
}

/**
 * Monta una partida jugable: el cuadro, los telegramas y quién hace qué.
 *
 * FALLA SI NO SE PUEDE. Un juego que se conforma con lo que hay y sigue
 * adelante es un juego que se estrena roto en la mesa: sin seis convoyes no hay
 * cuadro, y sin cuadro no hay noche. Mejor un error al pulsar «generar», con
 * tiempo de arreglarlo, que doce personas esperando.
 */
export function cimientosDelNudo(
  game: GameSession,
  opciones: OpcionesDeCimientos = {},
): TramaNudo {
  const ferroviarios = entidadesDe(game, 'ferroviarios');
  const convoyes = entidadesDe(game, 'convoyes');
  const puestos = entidadesDe(game, 'puestos');
  const mercancias = entidadesDe(game, 'mercancias');

  if (ferroviarios.length < 4) {
    throw new Error('El turno de noche necesita cuatro personas: hay un oficio que nadie cubriría.');
  }
  if (convoyes.length !== FRANJAS_DE_LA_NOCHE) {
    throw new Error(
      `El cuadro de marchas empareja convoyes con franjas: hacen falta exactamente ` +
        `${FRANJAS_DE_LA_NOCHE} convoyes y hay ${convoyes.length}.`,
    );
  }
  if (puestos.length < 4) {
    throw new Error('La estación necesita cuatro puestos: uno por instrumento.');
  }
  if (mercancias.length < 1) {
    throw new Error('Los vagones van vacíos: hace falta al menos un cargamento.');
  }

  const semilla = opciones.semilla ?? `${game.id}:nudo`;
  const rnd = azarCon(`cimientos:${semilla}`);

  const puzle = generarCuadro({
    convoyes: convoyes.map((c) => c.id),
    ferroviarios: ferroviarios.length,
    semilla: `cuadro:${semilla}`,
  });

  /*
   * SE VUELVE A COMPROBAR AQUÍ, aunque el generador ya lo haya hecho por
   * dentro. No es paranoia decorativa: `verificarCuadro` cuenta otra vez desde
   * cero, sin la caché de bits del generador, y esa segunda opinión es la que
   * cazó que las dos mitades habían dejado de estar de acuerdo. Cuesta treinta
   * milisegundos una vez por partida.
   */
  const informe = verificarCuadro(convoyes.map((c) => c.id), puzle);
  if (!informe.ok) {
    throw new Error(
      `El cuadro trazado no cumple las garantías (soluciones: ${informe.soluciones}, ` +
        `mínimo: ${informe.minimo}, repartido: ${informe.repartida}). No se puede jugar así.`,
    );
  }

  const nombreDeConvoy = (id: ConvoyId): string =>
    convoyes.find((c) => c.id === id)?.name ?? id;
  const telegramas = escribirTelegramas(puzle.telegramas, nombreDeConvoy);

  /* El reparto, de índices a ids de telegrama y de persona. */
  const reparto: Record<string, string[]> = {};
  ferroviarios.forEach((persona, i) => {
    reparto[persona.id] = (puzle.reparto[i] ?? []).map((indice) => telegramas[indice]!.id);
  });

  /*
   * EL CORREO ES EL PRIMER CONVOY QUE LO PAREZCA, y si ninguno lo parece, uno
   * al azar. Es la única concesión al nombre que se escribe en el taller: quien
   * llama «El Correo de Medianoche» a un convoy espera que sea ese, y
   * sortearlo daría una partida que contradice lo que la persona escribió.
   */
  const porElNombre = convoyes.find((c) => /correo|suero|medianoche/i.test(c.name));
  const correo = porElNombre?.id ?? barajar(convoyes, rnd)[0]!.id;

  /* Los oficios de las personas: barajados y por turnos, para que salgan los cuatro. */
  const oficioDePersona: Record<string, OficioId> = {};
  barajar(ferroviarios, rnd).forEach((persona, i) => {
    oficioDePersona[persona.id] = OFICIOS[i % OFICIOS.length]!;
  });

  /* Y los de los puestos, igual: con cuatro habitaciones sale uno de cada. */
  const oficioDePuesto: Record<string, OficioId> = {};
  barajar(puestos, rnd).forEach((puesto, i) => {
    oficioDePuesto[puesto.id] = OFICIOS[i % OFICIOS.length]!;
  });

  /*
   * La carga: al Correo le toca el cargamento que más suene a lo que lleva un
   * correo urgente, y a los demás por turnos. Con tres cargamentos y seis
   * convoyes se repiten, y eso es lo que se quería: si cada convoy tuviera el
   * suyo, «el que lleva carbón» sería otro nombre del convoy.
   */
  const urgente = mercancias.find((m) => /suero|medicin|vacun|correo/i.test(m.name));
  const resto = barajar(
    mercancias.filter((m) => m.id !== urgente?.id),
    rnd,
  );
  const cargaDeConvoy: Record<string, string> = {};
  let j = 0;
  for (const convoy of convoyes) {
    if (convoy.id === correo && urgente) {
      cargaDeConvoy[convoy.id] = urgente.id;
      continue;
    }
    const lista = resto.length > 0 ? resto : mercancias;
    cargaDeConvoy[convoy.id] = lista[j % lista.length]!.id;
    j++;
  }

  /*
   * Los partes de plantilla. El modelo los reescribe si hay clave de API, y si
   * no, estos se leen igual de bien en voz alta: dicen el tiempo que hace y
   * cuánto queda, que es lo que un parte de novedades dice de verdad.
   */
  const partes = Array.from({ length: FRANJAS_DE_LA_NOCHE }, (_, i) =>
    i === 0
      ? 'La nieve ha llegado a la altura del andén y el hilo con la capital va y viene. Entra el turno.'
      : i === FRANJAS_DE_LA_NOCHE - 1
        ? 'Empieza a clarear por el lado de la sierra. Es la última franja de la noche.'
        : `Sin novedad en la línea. La estufa del cuarto de aparatos sigue sin tirar. Quedan ${FRANJAS_DE_LA_NOCHE - i} franjas.`,
  );

  return {
    cuadro: puzle.cuadro,
    telegramas,
    reparto,
    correo,
    oficioDePuesto,
    oficioDePersona,
    cargaDeConvoy,
    partes,
    franjas: FRANJAS_DE_LA_NOCHE,
    retrasoMaximo: retrasoMaximoPara(ferroviarios.length),
  };
}

// ---------------------------------------------------------------------------
// El estado inicial
// ---------------------------------------------------------------------------

/**
 * El estado con el que arranca una noche.
 *
 * La frontera entre la trama y el estado es la del tiempo: la trama es lo que
 * se decidió antes de que llegara nadie, el estado es lo que va pasando. Esta
 * función es el instante exacto en que lo primero se convierte en lo segundo.
 */
export function estadoInicial(participanteIds: string[]): EstadoNudo {
  const gente: EstadoNudo['gente'] = {};
  for (const id of participanteIds) gente[id] = fichaEnBlanco();
  return {
    despachados: 0,
    salidos: [],
    retraso: 0,
    /*
     * SE EMPIEZA CON UNA, no con cero. Es el parte de novedades que la jefatura
     * deja escrito al entrar el turno, y existe para que la primera orden de la
     * noche se pueda cursar antes de haber resuelto ningún instrumento. Sin
     * esto, una mesa que no consiguiera resolver nada en la franja uno no
     * podría ni intentarlo, que es un callejón sin salida por incompetencia y
     * no por decisión.
     */
    conformidades: 1,
    puestosRendidos: [],
    instrumentos: {},
    gente,
    ordenes: [],
    franjasPerdidas: [],
  };
}

/** Lo que lleva encima alguien que acaba de entrar de turno. */
export function fichaEnBlanco(): EstadoNudo['gente'][string] {
  return {
    margen: 0,
    manaUsada: false,
    indulto: false,
    consultaGratis: false,
    sinConformidad: false,
    consultas: 0,
    instrumentosResueltos: 0,
  };
}

// ---------------------------------------------------------------------------
// La trama completa, sin IA
// ---------------------------------------------------------------------------

const APELLIDOS = [
  'Berrocal', 'Ochoa', 'Sanchís', 'Verdejo', 'Aramburu', 'Peláez', 'Cifuentes',
  'Rueda', 'Mansilla', 'Quiroga', 'Escobedo', 'Vilariño', 'Ferrer', 'Almazán',
];

const PREOCUPACIONES = [
  'Lleva tres noches sin dormir en su cama y mañana es el cumpleaños de su hija.',
  'Tiene una carta sin abrir en el bolsillo desde el martes y sabe lo que dice.',
  'Se juega el traslado a la capital con lo que pase esta noche.',
  'Le debe dinero a alguien de este turno y no lo ha dicho.',
  'Entró en el ferrocarril el mismo mes que se murió su padre, que también era de la casa.',
  'Está convencida de que la estufa del cuarto de aparatos es una desgracia esperando.',
  'Aprendió el oficio en la línea del norte y aquí todavía la miran como a una forastera.',
  'No ha vuelto a subirse a una máquina desde lo del kilómetro 84.',
];

const SECRETOS = [
  'La noche que ardió el telégrafo estabas fuera fumando y no lo has dicho.',
  'Guardas una copia del cuadro de la semana pasada. No sirve de nada esta noche, y lo sabes.',
  'Has echado más carbón del que consta en el libro para que un maquinista amigo llegara a tiempo.',
  'Le prometiste al jefe de la línea que este mes no habría un solo parte de retraso.',
  'Sabes quién dejó la estufa encendida en la oficina del telégrafo, y no vas a decirlo.',
  'Llevas dos años pidiendo el traslado y esta madrugada te han contestado que no.',
  'Duermes en la estación desde noviembre porque no tienes dónde.',
  'Falsificaste una firma en un parte hace seis años y aún sueñas con ello.',
];

/**
 * Una velada entera sin llamar a la API.
 *
 * NO ES UN MODO DEGRADADO: es una partida que se juega de principio a fin. El
 * rompecabezas es exactamente el mismo —lo ponen los cimientos, que no saben si
 * hay clave de API— y lo único que cambia es que la prosa sale de plantillas en
 * vez de escribirse a medida.
 *
 * Es determinista con la semilla, que es lo que permite que el maestro de oro
 * congele una partida y la compare byte a byte.
 */
export function generarTramaNudo(game: GameSession, opciones: OpcionesDeCimientos = {}): Plot {
  const trama = cimientosDelNudo(game, opciones);
  const rnd = azarCon(`prosa:${opciones.semilla ?? game.id}`);

  const ferroviarios = entidadesDe(game, 'ferroviarios');
  const convoyes = entidadesDe(game, 'convoyes');
  const puestos = entidadesDe(game, 'puestos');
  const nombreDe = (lista: Entidad[], id: string): string =>
    lista.find((e) => e.id === id)?.name ?? id;

  const apellidos = barajar(APELLIDOS, rnd);
  const preocupaciones = barajar(PREOCUPACIONES, rnd);
  const secretos = barajar(SECRETOS, rnd);

  const characters: PlotCharacter[] = ferroviarios.map((persona, i) => {
    const oficio = trama.oficioDePersona[persona.id] ?? 'agujas';
    const puestoPropio = Object.entries(trama.oficioDePuesto).find(([, o]) => o === oficio)?.[0];
    const mias = trama.reparto[persona.id] ?? [];
    return {
      participanteId: persona.id,
      characterName: `${persona.name} ${apellidos[i % apellidos.length]}`,
      role: OFICIO_DE_PERSONA[oficio],
      publicPersona:
        `Lleva el turno de noche en ${NOMBRE_DE_OFICIO[oficio].toLowerCase()}` +
        (puestoPropio ? `, que esta noche está en ${nombreDe(puestos, puestoPropio)}` : '') +
        `. ${preocupaciones[i % preocupaciones.length]}`,
      secret: secretos[i % secretos.length],
      personalHook:
        `Tu maña es «${MANA_DE_OFICIO[oficio].nombre}»: ${MANA_DE_OFICIO[oficio].texto} ` +
        `Salvaste ${mias.length === 1 ? 'una tira' : `${mias.length} tiras`} del telégrafo.`,
      knowledge: mias.map((id) => {
        const t = trama.telegramas.find((x) => x.id === id);
        return t ? t.texto : '';
      }).filter(Boolean),
    };
  });

  const timeline: TimelineEvent[] = [
    {
      time: '21:40',
      description:
        'Se declara el incendio en la oficina del telégrafo. Arde el cuadro de marchas de la noche.',
      participanteIds: [],
      isPublic: true,
    },
    {
      time: '22:15',
      description:
        'Se apaga el fuego. Del cuadro no queda nada; de las tiras del telégrafo, lo que cada cual llevaba encima.',
      participanteIds: ferroviarios.map((p) => p.id),
      isPublic: true,
    },
    {
      time: '23:20',
      description: `Entra el turno de noche. Son ${ferroviarios.length} y la estación tiene ${puestos.length} puestos abiertos.`,
      participanteIds: ferroviarios.map((p) => p.id),
      isPublic: true,
    },
    {
      time: '23:50',
      description: `Los seis convoyes están rodando y no se les puede avisar. El primero pide vía a las ${HORAS_DE_FRANJA[0]}.`,
      participanteIds: [],
      isPublic: true,
    },
  ];

  const gmScript = [
    'ACTO 1 · Se lee el parte de la primera franja y se abre. La mesa todavía no ha juntado las tiras: espera a que alguien lo proponga, no lo propongas tú.',
    'ACTO 2 · A partir de la segunda franja, empuja a que cada cual lea SU tira en voz alta. Es donde se resuelve el cuadro.',
    'ACTO 3 · Cuando lleven tres convoyes fuera, recuérdales el retraso que llevan y lo que cuesta el tope. Ahí es donde se decide si consultan el archivo.',
    'ACTO 4 · Última franja: si falta más de un convoy, avisa de que se van a quedar en la vía. Que la decisión sea suya.',
    'CIERRE · Abre el cuadro final, deja que cada cual entregue el suyo y luego da el parte del amanecer.',
  ];

  const respuestas: Record<string, string> = {};
  trama.cuadro.forEach((convoyId, i) => {
    respuestas[ejeDeFranja(i + 1)] = convoyId;
  });

  return {
    title: 'El Nudo de Valdehierro',
    tagline: 'Seis convoyes, seis franjas y una sola noche para rehacer el cuadro.',
    synopsis:
      `Madrugada del 14 de enero de 1927. Ardió la oficina del telégrafo de Valdehierro y con ella ` +
      `el cuadro de marchas de esta noche. Seis convoyes vienen rodando hacia el nudo y no hay forma ` +
      `de avisarles. Uno de ellos, ${nombreDe(convoyes, trama.correo)}, lleva el suero para el valle. ` +
      `El turno de noche tiene que rehacer el cuadro con las tiras que cada cual salvó del fuego y ` +
      `sacar los seis antes de que el puerto se cierre.`,
    setting:
      'La estación de Valdehierro, donde se cruzan cinco líneas, en una noche de nieve. Cada ' +
      'habitación de la casa es un puesto con su instrumento, y hay que ir hasta allí de verdad.',
    solution: { respuestas },
    characters,
    timeline,
    gmScript,
    delJuego: trama,
  };
}

// ---------------------------------------------------------------------------
// La ampliación
// ---------------------------------------------------------------------------

/**
 * Poner al día una trama a la que le ha cambiado la mesa.
 *
 * ═══ QUÉ SE PUEDE ARREGLAR SIN REGENERAR Y QUÉ NO ═══
 *
 * Se puede: dar oficio y telegramas a quien se apuntó tarde, dar oficio a un
 * puesto nuevo y escribirle un papel mínimo a quien no lo tenía. Todo eso es
 * reparto y no toca el rompecabezas.
 *
 * NO se puede: cambiar los convoyes. El cuadro es una biyección entre convoyes
 * y franjas, así que borrar o añadir uno no «desajusta» la trama: la invalida
 * entera, telegramas incluidos. En ese caso esto lo dice y no disimula — quien
 * dirige tiene que regenerar, y es mejor enterarse al pulsar «actualizar» que
 * en la mesa.
 *
 * NO LLAMA AL MODELO, igual que la de El Misterio de la Momia y por lo mismo:
 * primero que la partida sea correcta. El color se lo puede dar quien dirige, o
 * regenerar el misterio entero.
 */
registrarAmpliacion('nudo', async (game, plot, _informe, emit) => {
  const trama = tramaDe(plot);
  if (!trama) return;

  const ferroviarios = entidadesDe(game, 'ferroviarios');
  const convoyes = entidadesDe(game, 'convoyes');
  const puestos = entidadesDe(game, 'puestos');

  const mismos =
    convoyes.length === trama.cuadro.length &&
    trama.cuadro.every((id) => convoyes.some((c) => c.id === id));
  if (!mismos) {
    emit({
      type: 'text',
      delta:
        '\nLos convoyes han cambiado, y el cuadro de marchas se traza SOBRE ellos: los telegramas ' +
        'de esta partida hablan de trenes que ya no están. Hay que regenerar la noche desde cero.\n',
    });
    return;
  }

  /* Los oficios que falten, por la misma rueda que usa el móvil. */
  trama.oficioDePersona = oficiosAlDia(trama, ferroviarios);
  trama.oficioDePuesto = oficiosDePuestoAlDia(trama, puestos);

  /*
   * Los telegramas de quien llegó tarde: COPIAS DE SERVICIO.
   *
   * No se inventan telegramas nuevos —eso rompería la minimalidad y con ella la
   * garantía de que todo el papel de la mesa importa— sino que se le da una
   * copia del que menos gente tiene. Es lo que hacía una estación de verdad:
   * el telegrafista sacaba copia para quien la necesitara.
   */
  const cuantos = new Map<string, number>(trama.telegramas.map((t) => [t.id, 0]));
  for (const lista of Object.values(trama.reparto)) {
    for (const id of lista) cuantos.set(id, (cuantos.get(id) ?? 0) + 1);
  }
  let nuevos = 0;
  for (const persona of ferroviarios) {
    if (trama.reparto[persona.id]?.length) continue;
    const menosRepartido = [...cuantos.entries()].sort((a, b) => a[1] - b[1])[0];
    if (!menosRepartido) break;
    trama.reparto[persona.id] = [menosRepartido[0]];
    cuantos.set(menosRepartido[0], menosRepartido[1] + 1);
    nuevos++;
  }

  /* Y un papel mínimo para quien no tenga. Sin color, pero jugable. */
  const rnd = azarCon(`ampliacion:${game.id}:${ferroviarios.length}`);
  const apellidos = barajar(APELLIDOS, rnd);
  const preocupaciones = barajar(PREOCUPACIONES, rnd);
  const secretos = barajar(SECRETOS, rnd);
  let escritos = 0;
  ferroviarios.forEach((persona, i) => {
    if (plot.characters.some((c) => c.participanteId === persona.id)) return;
    const oficio = trama.oficioDePersona[persona.id] ?? 'agujas';
    plot.characters.push({
      participanteId: persona.id,
      characterName: `${persona.name} ${apellidos[i % apellidos.length]}`,
      role: OFICIO_DE_PERSONA[oficio],
      publicPersona:
        `Se incorpora al turno de noche en ${NOMBRE_DE_OFICIO[oficio].toLowerCase()}. ` +
        preocupaciones[i % preocupaciones.length],
      secret: secretos[i % secretos.length],
      personalHook: `Tu maña es «${MANA_DE_OFICIO[oficio].nombre}»: ${MANA_DE_OFICIO[oficio].texto}`,
      knowledge: (trama.reparto[persona.id] ?? [])
        .map((id) => trama.telegramas.find((t) => t.id === id)?.texto ?? '')
        .filter(Boolean),
    });
    escritos++;
  });

  /* Y quien ya no está en la mesa deja de tener telegramas y personaje. */
  const vivos = new Set(ferroviarios.map((p) => p.id));
  for (const id of Object.keys(trama.reparto)) if (!vivos.has(id)) delete trama.reparto[id];
  for (const id of Object.keys(trama.oficioDePersona)) {
    if (!vivos.has(id)) delete trama.oficioDePersona[id];
  }

  /*
   * El conocimiento de quien YA tenía personaje se vuelve a escribir desde el
   * reparto. Sin esto, alguien que recibe una copia de servicio la tiene en la
   * trama y no en su dosier: dos respuestas a la misma pregunta, otra vez.
   */
  for (const personaje of plot.characters) {
    const mias = trama.reparto[personaje.participanteId];
    if (!mias) continue;
    personaje.knowledge = mias
      .map((id) => trama.telegramas.find((t) => t.id === id)?.texto ?? '')
      .filter(Boolean);
  }

  plot.delJuego = trama;
  emit({
    type: 'text',
    delta:
      `\nTurno al día: ${escritos} ficha${escritos === 1 ? '' : 's'} nueva${escritos === 1 ? '' : 's'}, ` +
      `${nuevos} copia${nuevos === 1 ? '' : 's'} de servicio del telégrafo.\n`,
  });
});
