/**
 * La trama de la Momia, escrita sin llamar a ningún modelo.
 *
 * Es el equivalente de `plot/cluedo-demo.ts` para este juego, y hace la misma
 * falta que aquél: hay que poder jugar, probar y desarrollar sin clave de API.
 * Pero aquí carga con algo más que sabor. En CLUEDO la trama de demostración
 * elige un asesino, un arma y una sala; aquí tiene que construir el puzle del
 * sellado, repartir los dones, decidir qué cámara se profana cada noche y dejar
 * preparadas las mentiras del saqueador.
 *
 * LA FRONTERA CON EL MODELO (§7 del diseño) NO SE CRUZA NI SIQUIERA AQUÍ. Todo
 * lo que es lógica —el orden verdadero, las restricciones y sus garantías, el
 * reparto— sale de `momia-puzle.ts`, que es el mismo código que usará la
 * generación con IA. Lo único que cambia entre esta trama y una de verdad es
 * quién escribe las frases: allí el modelo, aquí unas plantillas. Si la lógica
 * viviera en dos sitios, uno de los dos se quedaría atrás.
 *
 * POR QUÉ `clues` VA VACÍO, que es lo primero que sorprende al leerlo. Las
 * pistas de `Plot` son el mecanismo de CLUEDO: una frase por sala y ronda que
 * pasa al tablón al cerrar. Los hallazgos de la Momia son fragmentos de papiro,
 * viven en `EstadoMomia` y se enseñan por la pantalla del papiro, no por el
 * tablón —que este juego ni siquiera tiene en su barra—. Meterlos en `clues`
 * habría hecho que la mitad de cada fragmento viajara por un camino y la otra
 * mitad por otro. La consecuencia hay que conocerla: `numeroDeRondas` deduce las
 * rondas de `clues`, así que sin pistas devuelve su valor por defecto, cuatro,
 * que resulta ser exactamente el número de vigilias que pide este juego.
 */
/*
 * `entidadesDe` se importa por la puerta principal de `shared/juegos` y no por
 * el atajo de `./entidades`, y no da igual: es el índice quien apunta DÓNDE vive
 * cada categoría (`anotarAlmacenes`, al cargarse). Importando solo el atajo, la
 * tabla está vacía y `entidadesDe(game, 'expedicionarios')` devuelve una lista
 * sin nadie —sin dar ningún error—. Costó un rato de perplejidad.
 */
import { entidadesDe } from '../../../shared/juegos';
import { registrarAmpliacion } from './ampliaciones';
import { generarPuzle, redactar, repartirHallazgos, verificarPuzle } from './momia-puzle';
import { AMULETOS_INICIALES } from '../../../shared/juegos/momia-tipos';
import type {
  DonId,
  EstadoMomia,
  RestriccionEscrita,
  TramaMomia,
} from '../../../shared/juegos/momia-tipos';
import type { GameSession, Plot, PlotCharacter, TimelineEvent } from '../../../shared/types';

/** El eje único de la Momia: quién rompió el sello. */
export const EJE_SAQUEADOR = 'saqueador';

/** Cuántas vigilias tiene una velada si nadie dice lo contrario. */
export const VIGILIAS_POR_DEFECTO = 4;

// ---------------------------------------------------------------------------
// Los dones
// ---------------------------------------------------------------------------

/**
 * Los dones que se reparten, y el papel que le pega a cada uno.
 *
 * `falsificar` NO ESTÁ EN ESTA LISTA, y esa ausencia es el corazón del juego. Al
 * saqueador se le reparte un don aparente como a cualquiera —en su dosier pone
 * «Fotógrafo» y hace lo que hace un fotógrafo— y la capacidad de fabricar
 * fragmentos falsos no se guarda en ningún campo: se deduce de ser la respuesta
 * del eje. Un dato que no se guarda es un dato que no se puede filtrar por
 * descuido en una proyección.
 */
export const DONES_REPARTIBLES: Array<{ don: DonId; rol: string; que: string }> = [
  {
    don: 'descifrar',
    rol: 'Epigrafista',
    que: 'Lees jeroglíficos como quien lee el periódico. Cada vigilia sacas un fragmento de más, y solo tú lo ves.',
  },
  {
    don: 'sanar',
    rol: 'Médico de la expedición',
    que: 'Sabes qué hacer con la fiebre de la tumba. Una vez por vigilia le quitas una marca a alguien sin gastar amuleto.',
  },
  {
    don: 'proteger',
    rol: 'Guardián',
    que: 'Cargas con las lámparas y vigilas las espaldas. A quien elijas no le alcanza la maldición esta vigilia.',
  },
  {
    don: 'sobornar',
    rol: 'Mecenas',
    que: 'Pagas la expedición y también a los guías. Sabes de antemano qué cámara se profanará la vigilia siguiente.',
  },
  {
    don: 'documentar',
    rol: 'Fotógrafo',
    que: 'Tu magnesio deja constancia. Puedes poner sobre la mesa uno de tus fragmentos para que lo lea todo el mundo.',
  },
  {
    don: 'excavar',
    rol: 'Capataz',
    que: 'Conoces los pasadizos. Entras en una segunda cámara la misma vigilia, y lo pagas con una marca.',
  },
];

// ---------------------------------------------------------------------------
// El azar de esta trama
// ---------------------------------------------------------------------------

function azarCon(semilla: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < semilla.length; i++) {
    h ^= semilla.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function barajar<T>(items: T[], rnd: () => number): T[] {
  const salida = [...items];
  for (let i = salida.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [salida[i], salida[j]] = [salida[j]!, salida[i]!];
  }
  return salida;
}

// ---------------------------------------------------------------------------
// La trama
// ---------------------------------------------------------------------------

export interface OpcionesTrama {
  /** La misma semilla da la misma trama. Sin ella, una distinta cada vez. */
  semilla?: string;
  /** Cuántas vigilias tiene la velada. */
  vigilias?: number;
  /** A quién le toca ser el saqueador. Si no se dice, sale al azar. */
  saqueador?: string;
}

/**
 * Compone una partida entera de la Momia sin pedirle nada a ningún modelo.
 *
 * @throws si la partida no tiene con qué jugarse. Reventar aquí —al preparar,
 * con el taller delante— es infinitamente mejor que entregar una velada a la
 * que le faltan ritos y que no se pueda terminar.
 */
export function generarTramaMomia(game: GameSession, opciones: OpcionesTrama = {}): Plot {
  const expedicionarios = entidadesDe(game, 'expedicionarios');
  const camaras = entidadesDe(game, 'camaras');
  const reliquias = entidadesDe(game, 'reliquias');
  const ritos = entidadesDe(game, 'ritos');

  if (expedicionarios.length < 4) throw new Error('La expedición necesita cuatro personas.');
  if (camaras.length < 5) throw new Error('La tumba necesita cinco cámaras.');
  if (reliquias.length < 3) throw new Error('Hacen falta tres reliquias.');
  /*
   * EXACTAMENTE CINCO, no «al menos cinco». El manifiesto declara `minimo: 5`
   * porque el contrato general solo sabe expresar mínimos, pero este juego se
   * cae con seis igual que con cuatro: el sellado es de cinco ritos y el puzle
   * está calibrado para 120 permutaciones. Que la validación fina viva aquí y
   * no en el manifiesto es la frontera de siempre: el contrato dice lo que vale
   * para cualquier juego, el juego dice lo suyo.
   */
  if (ritos.length !== 5) throw new Error('El sellado son cinco ritos exactamente.');

  const semilla = opciones.semilla ?? `momia-${game.id}-${Date.now()}`;
  const rnd = azarCon(semilla);
  const vigilias = Math.max(1, opciones.vigilias ?? VIGILIAS_POR_DEFECTO);

  // ---- El puzle ----
  const puzle = generarPuzle({
    ritos: ritos.map((r) => r.id),
    jugadores: expedicionarios.length,
    semilla: `${semilla}|puzle`,
    /*
     * MÁS RESTRICCIONES QUE VIGILIAS, y esto es una regla del juego disfrazada de
     * parámetro. Toda cámara da papiro todas las noches, y se entra en una por
     * vigilia: quien explore las cuatro se lleva cuatro fragmentos distintos como
     * mucho. Si el puzle tuviera cuatro, una sola persona podría resolverlo en
     * solitario y la razón de ser del juego —que haya que poner en común— se
     * caería sin que ninguna de las cuatro garantías del §4.2 se enterase.
     */
    minimoRestricciones: vigilias + 1,
  });
  /*
   * SE VERIFICA AQUÍ TAMBIÉN, aunque `generarPuzle` ya no devuelve puzles malos.
   * Es una comprobación redundante a propósito: es la última puerta antes de que
   * la trama se guarde en la base de datos, y a partir de ella el error ya no se
   * puede distinguir de una partida buena hasta la noche. Cuesta un milisegundo.
   */
  const informe = verificarPuzle(
    ritos.map((r) => r.id),
    puzle,
  );
  if (!informe.ok) {
    throw new Error(`El puzle del sellado no cumple sus garantías: ${JSON.stringify(informe)}`);
  }

  const nombreDeRito = (id: string): string => ritos.find((r) => r.id === id)?.name ?? id;

  const restricciones: RestriccionEscrita[] = puzle.restricciones.map((restriccion, i) => ({
    id: `frag-${i + 1}`,
    restriccion,
    texto: redactar(restriccion, nombreDeRito),
  }));
  const falsasCandidatas: RestriccionEscrita[] = puzle.falsas.map((f, i) => ({
    id: `falsa-${i + 1}`,
    restriccion: f.restriccion,
    texto: redactar(f.restriccion, nombreDeRito),
  }));

  // ---- Quién rompió el sello ----
  const saqueador =
    expedicionarios.find((e) => e.id === opciones.saqueador) ??
    expedicionarios[Math.floor(rnd() * expedicionarios.length)]!;
  const reliquiaCodiciada = reliquias[Math.floor(rnd() * reliquias.length)]!;

  // ---- Los dones ----
  // Barajados y repartidos en rueda: con cuatro personas y seis dones, dos se
  // quedan sin salir, y cuáles cambia de partida en partida.
  const barajados = barajar(DONES_REPARTIBLES, rnd);
  const dones: Record<string, DonId> = {};
  expedicionarios.forEach((e, i) => {
    dones[e.id] = barajados[i % barajados.length]!.don;
  });

  // ---- Qué se profana cada noche ----
  /*
   * Sin repetir dos vigilias seguidas. Si la misma cámara se profanara dos
   * noches, la segunda no sería una decisión: nadie entra donde ya sabe que se
   * marca, y esa vigilia la tumba se quedaría vacía.
   */
  const profanadas: string[] = [];
  for (let ronda = 0; ronda < vigilias; ronda++) {
    const posibles = camaras.filter(
      (c) =>
        c.id !== profanadas[ronda - 1] &&
        // Y la ultima tampoco puede repetir la primera: la lista se recorre en
        // circulo si la noche se alarga (ver `camaraProfanada`), y si coincidieran
        // los extremos habria dos vigilias seguidas con la misma camara.
        !(ronda === vigilias - 1 && vigilias > 1 && c.id === profanadas[0]),
    );
    profanadas.push(posibles[Math.floor(rnd() * posibles.length)]!.id);
  }

  // ---- Dónde aparece cada fragmento ----
  const hallazgos = repartirHallazgos({
    fragmentos: restricciones.map((r) => r.id),
    camaras: camaras.map((c) => c.id),
    rondas: vigilias,
    semilla: `${semilla}|hallazgos`,
  });

  const delJuego: TramaMomia = {
    ordenVerdadero: puzle.ordenVerdadero,
    restricciones,
    falsasCandidatas,
    profanadas,
    hallazgos,
    dones,
    reliquiaCodiciada: reliquiaCodiciada.id,
  };

  // ---- El sabor ----
  const casa = game.name?.trim() || 'la tumba';
  const characters = construirExpedicion(expedicionarios, dones, saqueador.id, reliquiaCodiciada.name);

  return {
    title: 'El Misterio de la Momia',
    tagline: 'El sello está roto. Alguien de la expedición lo quiso así.',
    synopsis:
      `La expedición abrió ayer la cámara sellada de ${casa}. El lacre llevaba tres mil ` +
      `años intacto y ahora está partido en dos. Desde esa noche el aire se enrarece, las ` +
      `lámparas se apagan solas y quien pasa demasiado tiempo en las cámaras profanadas ` +
      `empieza a marcarse. Antes del amanecer hay que volver a sellar la tumba, y el sellado ` +
      `es un ritual de cinco ritos que deben pronunciarse en un orden exacto. Ese orden ` +
      `estaba escrito en un papiro que se rompió al abrirse la cámara: cada fragmento que ` +
      `aparece dice una sola cosa sobre el orden, y nadie tiene bastantes para saberlo todo. ` +
      `Pero el sello no se rompió solo. Alguien de los ${expedicionarios.length} lo abrió a ` +
      `propósito, por encargo de un comprador, y no quiere que la tumba vuelva a cerrarse.`,
    victim: {
      name: 'el faraón sin nombre',
      description:
        'Lo enterraron con el nombre borrado de todas las paredes para que no pudiera ser ' +
        'llamado ni juzgado. Tres mil años después alguien ha abierto su puerta, y lo que ' +
        'sea que quisieron encerrar con él ya está fuera.',
    },
    setting:
      `${casa}, convertida por una noche en la tumba: ` +
      `${camaras.map((c) => c.name).join(', ')}. Cada vigilia una de esas cámaras está ` +
      `profanada, y entrar en ella deja marca.`,
    solution: {
      // Un solo eje, y su respuesta es una persona de la mesa: de ahí sale
      // gratis que el saqueador no gane señalándose a sí mismo.
      respuestas: { [EJE_SAQUEADOR]: saqueador.id },
      motive:
        `${saqueador.name} tenía ${reliquiaCodiciada.name} vendida antes de que la expedición ` +
        `saliera. El comprador paga por la pieza y por que la tumba quede abierta: una tumba ` +
        `sellada es una tumba que alguien vendrá a inventariar.`,
      howItHappened:
        `Fue ${saqueador.name} quien rompió el lacre, de madrugada y con la excusa de ` +
        `comprobar las lámparas. Desde entonces juega a lo mismo que los demás —explora, ` +
        `comparte, propone un orden— con una diferencia: puede fabricar un fragmento de ` +
        `papiro que suene a verdad y no lo sea. Le basta con que la mesa ejecute un orden ` +
        `equivocado para que amanezca con la tumba abierta.`,
    },
    characters,
    timeline: construirCronologia(),
    /*
     * Vacío, y el porqué está en la cabecera: los hallazgos de este juego no son
     * pistas de sala, son fragmentos de papiro que viven en el estado.
     */
    clues: [],
    gmScript: [
      'Antes de que llegue nadie: pega los carteles en las puertas, reparte los dosieres en sobres cerrados y quédate el papiro del sellado. No lo dejes sobre la mesa.',
      'Abre la velada leyendo la sinopsis. Presenta la tumba, presenta al faraón sin nombre, y deja claro que antes del amanecer hay que sellarla.',
      'Al abrir cada vigilia, anuncia EN VOZ ALTA qué cámara está profanada esta noche. Es información pública: entrar sabiendo el precio es la decisión del juego.',
      'Deja que exploren. Cada cual entra en una cámara y sale con un fragmento; quien entró en la profanada sale además con una marca.',
      'Recuerda que los amuletos solo se gastan en otras personas. Es lo que obliga a hablar: quien va por dos marcas tiene que pedirlo en voz alta.',
      'Cierra la vigilia con la puesta en común. Que cada cual cuente lo que quiera de lo que ha encontrado. Nadie está obligado a decir la verdad.',
      'Cuando veas que la mesa ya casi lo tiene —o que la noche se alarga—, abre el Sellado: cada persona propone un orden completo y señala a quien cree el saqueador.',
      'Ejecuta el orden más votado. Si es el correcto, la tumba se sella y gana la expedición entera menos el saqueador. Si no, amanece con la tumba abierta y gana él solo.',
      'Cierra revelando el orden verdadero, quién rompió el sello y por qué. El papiro del sellado lo tienes tú.',
    ],
    delJuego,
  };
}

// ---------------------------------------------------------------------------
// Las personas
// ---------------------------------------------------------------------------

function construirExpedicion(
  expedicionarios: Array<{ id: string; name: string; description?: string }>,
  dones: Record<string, DonId>,
  saqueadorId: string,
  reliquia: string,
): PlotCharacter[] {
  return expedicionarios.map((persona, i) => {
    const don = dones[persona.id]!;
    const ficha = DONES_REPARTIBLES.find((d) => d.don === don)!;
    const esSaqueador = persona.id === saqueadorId;
    const companero = expedicionarios[(i + 1) % expedicionarios.length]!;

    /*
     * EL DOSIER DEL SAQUEADOR SE PARECE A LOS DEMÁS. Si su rol o su don sonaran
     * distintos, bastaría con que dos personas comparasen dosieres para
     * descubrirle en la primera vigilia. Lo único que cambia es el secreto, y el
     * secreto no lo lee nadie más.
     */
    const secret = esSaqueador
      ? `Fuiste tú. Rompiste el lacre de madrugada, con la excusa de revisar las lámparas, ` +
        `porque tienes ${reliquia} vendida desde antes de salir de El Cairo. Tu comprador ` +
        `paga por la pieza y por que la tumba siga abierta. Puedes fabricar un fragmento de ` +
        `papiro que suene a verdad: úsalo cuando la mesa esté a punto de acertar, no antes. ` +
        `Ganas si el orden que se ejecuta es el equivocado.`
      : `Viste a ${companero.name} rondar la cámara sellada la noche anterior a que se ` +
        `rompiera el lacre. Puede que no signifique nada. Puede que sí, y entonces callarlo ` +
        `te costará caro.`;

    return {
      participanteId: persona.id,
      characterName: persona.name,
      role: ficha.rol,
      publicPersona: `${persona.name}, ${ficha.rol.toLowerCase()} de la expedición.`,
      secret,
      motive: esSaqueador
        ? `Una pieza vendida por adelantado y un comprador que no acepta devoluciones.`
        : `Volver a casa con el nombre limpio y sin una sola marca encima.`,
      alibi: 'Dormías cuando se rompió el sello. Como todo el mundo, dices.',
      knowledge: [
        `Tu don: ${ficha.que}`,
        'Nadie tiene fragmentos suficientes para deducir el orden en solitario. Es a propósito: hay que ponerlos en común.',
        'Un amuleto quita una marca, pero nunca puedes gastarlo en ti. Si vas por dos marcas, tendrás que pedirlo.',
        'A las tres marcas quedas tocado: sigues jugando y sigues pudiendo señalar, pero tu propuesta de orden ya no cuenta en la votación.',
        'No todo lo que se lee en un fragmento es cierto. Alguien de esta mesa puede fabricarlos.',
      ],
      personalHook: persona.description?.trim()
        ? `El papel se te ha escrito a medida. Quien te conoce dice de ti: «${persona.description.trim()}». Úsalo: en esta mesa lo que convence no son los datos, es quién los cuenta.`
        : 'No sabemos mucho de ti todavía, y eso juega a tu favor: nadie tiene una versión previa de cómo te comportas cuando hay algo en juego.',
    };
  });
}

/**
 * La cronología pública: lo que pasó ANTES de que empezara a jugarse.
 *
 * NO LLEVA NI UNA VIGILIA, y eso es lo que se arregló al jugar una velada de
 * verdad. Antes ponía un renglón por noche —«Vigilia 3: la maldición se asienta
 * en el Pozo de las Ofrendas»— y `VistaJugador.cronologia` es PÚBLICA por
 * contrato: cualquiera veía, desde el primer minuto, qué cámara estaría profanada
 * las cuatro noches.
 *
 * Rompía dos cosas de golpe. La decisión central del juego, porque explorar
 * dejaba de ser «información a cambio de salud» y pasaba a ser «entra donde no
 * hay maldición», que no es una decisión. Y el don del Mecenas, que consiste
 * exactamente en saber de antemano qué cámara se profanará mañana: quien lo
 * recibiera pasaría la noche preguntándose por qué le tocó el papel inútil.
 *
 * La vigilia EN CURSO sí se anuncia —lo pide el diseño (§2)— pero por donde debe:
 * `estadoDelJuego.vigilia.profanada`, que se compone vigilia a vigilia y no
 * adelanta ninguna.
 */
function construirCronologia(): TimelineEvent[] {
  return [
    {
      time: '04:10',
      description: 'El lacre de la cámara sellada aparece partido. Nadie dice haber oído nada.',
      participanteIds: [],
      isPublic: true,
    },
    {
      time: '06:00',
      description: 'Se saca la primera reliquia. El aire dentro de la tumba ya está enrarecido.',
      participanteIds: [],
      isPublic: true,
    },
    {
      time: '21:00',
      description:
        'Cae la noche y las lámparas empiezan a apagarse solas. Se organiza la primera vigilia.',
      participanteIds: [],
      isPublic: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Del papel a la mesa
// ---------------------------------------------------------------------------

/**
 * Que camara esta profanada en una vigilia.
 *
 * SE CONSULTA EN CIRCULO, Y ESO TAPA UNA AVERIA QUE ESTABA ESPERANDO. La trama
 * escribe tantas camaras profanadas como vigilias se pidieron, pero quien dirige
 * puede abrir vigilias indefinidamente —`ronda-cerrada` vuelve a
 * `ronda-abierta`— y en la primera que se pasara de la cuenta el indice se salia
 * de la lista: ninguna camara profanada, ninguna marca, la maldicion apagada de
 * golpe y sin que nada diera error.
 *
 * Hasta hoy no ocurria, y por una casualidad que conviene no heredar:
 * `numeroDeRondas` deduce las vigilias de `plot.clues`, este juego las deja
 * vacias y la funcion devuelve su valor por defecto, cuatro, que es justo lo que
 * la trama genera. Dos numeros que coinciden sin que nadie los haya atado. En
 * cuanto alguien genere una velada de tres o de cinco, dejan de coincidir.
 *
 * Dando la vuelta al principio, una quinta vigilia repite la camara de la
 * primera. La maldicion no se para nunca y el juego sigue teniendo sentido.
 */
export function camaraProfanada(profanadas: string[], ronda: number): string | undefined {
  if (profanadas.length === 0 || ronda < 1) return undefined;
  return profanadas[(ronda - 1) % profanadas.length];
}

/**
 * La trama de la Momia de una partida, si la tiene.
 *
 * `Plot.delJuego` es `unknown` a propósito —el contrato general no sabe de qué
 * se juega—, así que alguien tiene que bajarlo a tipo. Ese alguien es este
 * juego, y por eso comprueba antes de creerse nada: una partida de CLUEDO, o una
 * de la Momia generada por una versión anterior, pasa por aquí y sale sin trama
 * en vez de reventar en mitad de una proyección.
 */
export function tramaDe(plot: Plot | undefined): TramaMomia | undefined {
  const posible = plot?.delJuego as TramaMomia | undefined;
  if (!posible || !Array.isArray(posible.ordenVerdadero) || !Array.isArray(posible.restricciones)) {
    return undefined;
  }
  return posible;
}

/**
 * El estado con el que arranca una velada, sacado de la trama.
 *
 * La frontera entre los dos es la del tiempo: la trama es lo que la casa decidió
 * antes de que llegara nadie, el estado es lo que va pasando. Esta función es el
 * momento exacto en que lo primero se convierte en lo segundo.
 */
export function estadoInicial(
  trama: TramaMomia,
  participanteIds: string[],
  /*
   * EL REPARTO YA RESUELTO, incluida la gente que llegó tarde.
   *
   * Aquí ponía `trama.dones[id] ?? 'descifrar'`, y ese respaldo silencioso hacía
   * que la partida diera DOS RESPUESTAS DISTINTAS a la misma pregunta: a quien
   * se apuntó después de generar, el móvil le ponía `descifrar` sin decírselo a
   * nadie mientras su dosier impreso decía que esta partida no le había asignado
   * ninguno. Se plantaba en la mesa creyendo que no tiene don, con un don en el
   * bolsillo.
   *
   * `ampliarExpedicion` arreglaba eso, pero solo si el Game Master se acordaba
   * de actualizar la partida ANTES de que nadie emparejara el móvil. Si sentaba
   * a alguien primero —que es el orden natural cuando llega tarde y hay prisa—
   * el respaldo se le adelantaba.
   *
   * Con `donesAlDia` la respuesta es la misma se actualice o no, y se actualice
   * antes o después: es la MISMA rueda, así que el don que enseña el móvil hoy
   * es el que escribirá el dosier mañana.
   */
  dones: Record<string, DonId> = trama.dones,
): EstadoMomia {
  const gente: EstadoMomia['gente'] = {};
  for (const id of participanteIds) {
    gente[id] = {
      marcas: 0,
      amuletos: AMULETOS_INICIALES,
      tocado: false,
      fragmentos: [],
      // El respaldo ya no debería alcanzarse nunca por el camino de producción:
      // `estadoDe` resuelve la rueda antes de llamar. Queda porque el tipo pide
      // un don y quedarse sin ninguno impediría jugar, que es peor.
      don: dones[id] ?? trama.dones[id] ?? 'descifrar',
    };
  }

  const fragmentos: EstadoMomia['fragmentos'] = {};
  for (const r of trama.restricciones) {
    fragmentos[r.id] = {
      id: r.id,
      restriccion: r.restriccion,
      texto: r.texto,
      falso: false,
      publico: false,
    };
  }

  /*
   * Las falsas NO entran aquí. Solo aparecen en `fragmentos` si el saqueador
   * llega a publicar una, y entonces entran ya públicas. Tenerlas dentro desde
   * el principio sería un montón de fragmentos marcados `falso: true` esperando
   * en el estado a que a alguien se le olvide filtrarlos en una proyección.
   */
  return {
    ordenVerdadero: [...trama.ordenVerdadero],
    profanadas: [...trama.profanadas],
    gente,
    fragmentos,
    propuestas: {},
  };
}

// ---------------------------------------------------------------------------
// Poner al día una expedición a la que se ha sentado alguien más
// ---------------------------------------------------------------------------

/**
 * Qué pasa cuando alguien se apunta con el misterio ya escrito.
 *
 * LO QUE HACÍA FALTA ARREGLAR. Esa persona se quedaba fuera del reparto de
 * dones, y entonces la partida daba DOS RESPUESTAS DISTINTAS a la misma
 * pregunta: el móvil le ponía `descifrar` en silencio —por el valor por defecto
 * de `estadoInicial`— y su dosier impreso le decía que esta partida no le había
 * asignado ninguno. Quien lo leyera se plantaría en la mesa creyendo que no
 * tiene don, con un don en el bolsillo.
 *
 * SIN LLAMAR AL MODELO, y es una decisión, no una limitación. La ampliación de
 * CLUEDO sí llama, y para hacerlo le pasa la solución del caso: en la Momia eso
 * significa pasarle el motivo, que NOMBRA a quien rompió el sello, para que
 * escriba textos que se imprimen en la hoja de todo el mundo. No merece la pena
 * arriesgar eso por un párrafo de color. Aquí se reparte lo que falta —de forma
 * determinista, para que una partida se pueda repetir con su semilla— y se
 * escribe un papel mínimo que dice claramente que hay que improvisarlo.
 *
 * NO TOCA NADA DE LO YA ESCRITO: ni el puzle, ni el orden verdadero, ni quién es
 * el saqueador, ni los dones de quienes ya lo tenían. Solo rellena huecos.
 */
/**
 * El reparto de dones al día, contando a quien llegó tarde. No muta nada.
 *
 * LA RUEDA SIGUE DONDE SE QUEDÓ. Los dones se repartieron en rueda sobre una
 * lista barajada; para quien llega tarde se continúa por el mismo sitio, así que
 * el reparto sigue siendo par y no depende del azar del momento.
 *
 * ES PURA Y ES UNA SOLA, y ahí está el arreglo. Antes esta cuenta vivía dentro
 * de `ampliarExpedicion` —que solo corre si el Game Master actualiza la
 * partida— mientras el móvil, al sentar a alguien, se inventaba un `descifrar`
 * por su cuenta. Dos sitios decidiendo lo mismo son dos respuestas distintas en
 * cuanto una de las dos no se ejecuta.
 */
export function donesAlDia(
  trama: TramaMomia,
  expedicionarios: Array<{ id: string }>,
): Record<string, DonId> {
  const dones: Record<string, DonId> = { ...trama.dones };
  let vuelta = Object.keys(trama.dones).length;
  for (const persona of expedicionarios) {
    if (dones[persona.id] !== undefined) continue;
    dones[persona.id] = DONES_REPARTIBLES[vuelta % DONES_REPARTIBLES.length]!.don;
    vuelta += 1;
  }
  return dones;
}

export function ampliarExpedicion(game: GameSession, plot: Plot): { anadidos: string[] } {
  const trama = tramaDe(plot);
  if (!trama) return { anadidos: [] };

  const expedicionarios = entidadesDe(game, 'expedicionarios');
  const yaEscritos = new Set(plot.characters.map((c) => c.participanteId));
  const anadidos: string[] = [];

  // El reparto lo decide `donesAlDia`, que es la MISMA función que consulta el
  // móvil al sentar a alguien. Que sea una sola es lo que garantiza que las dos
  // respuestas coincidan, se actualice la partida antes o después.
  Object.assign(trama.dones, donesAlDia(trama, expedicionarios));

  for (const persona of expedicionarios) {
    if (yaEscritos.has(persona.id)) continue;

    /*
     * Con respaldo, aunque el don se acabe de repartir tres líneas arriba: si
     * algún día deja de hacerse, esto tiene que dar un dosier pobre y no tirar
     * la puesta al día entera con doce personas esperando.
     */
    const don = trama.dones[persona.id];
    const ficha = DONES_REPARTIBLES.find((d) => d.don === don) ?? DONES_REPARTIBLES[0]!;
    plot.characters.push({
      participanteId: persona.id,
      characterName: persona.name,
      role: ficha.rol,
      publicPersona: 'Se incorporó a la expedición con el trabajo ya empezado.',
      secret: 'Callas algo de aquella noche que todavía no has sabido cómo contar.',
      motive: 'Si la tumba no vuelve a sellarse, la concesión sigue viva otra temporada.',
      alibi: 'Dices que estabas en el corredor cuando se apagó la lámpara.',
      knowledge: [],
      personalHook:
        'Su papel se ha quedado sin escribir: improvísalo con lo que sepas de la persona, ' +
        'o vuelve a generar el misterio entero para que se lo escriban.',
    });
    anadidos.push(persona.id);
  }

  return { anadidos };
}

/*
 * El alta. La Momia no llama al modelo para esto, así que su ampliación es
 * síncrona por dentro y se envuelve aquí para encajar en el contrato.
 */
registrarAmpliacion('momia', async (game, plot, _informe, emit) => {
  const { anadidos } = ampliarExpedicion(game, plot);
  emit({
    type: 'text',
    delta:
      anadidos.length === 0
        ? 'La expedición ya estaba completa.\n'
        : `Repartido el don que faltaba a ${anadidos.length} ${anadidos.length === 1 ? 'persona' : 'personas'}.\n`,
  });
});
