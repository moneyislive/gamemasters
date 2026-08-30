/**
 * La trama de El Paso de las Sombras, escrita sin llamar a ningún modelo.
 *
 * Es el equivalente de `plot/cluedo-demo.ts` para este juego, y hace la misma
 * falta que aquél: hay que poder jugar, probar y desarrollar sin clave de API.
 * Pero aquí carga con algo más que sabor. En CLUEDO la trama de demostración
 * elige un asesino, un arma y una sala; aquí tiene que trazar la senda,
 * repartir los disfraces, decidir qué paso baten los cazadores cada hora,
 * asignar las contraseñas de las puertas y dejar preparadas las mentiras del
 * kanchō.
 *
 * LA FRONTERA CON EL MODELO (§7 del diseño) NO SE CRUZA NI SIQUIERA AQUÍ. Todo
 * lo que es lógica —la senda, las condiciones y sus garantías, el reparto— sale
 * de `sombras-senda.ts`, que es el mismo código que usa la generación con IA. Lo
 * único que cambia entre esta trama y una de verdad es quién escribe las frases:
 * allí el modelo, aquí unas plantillas. Si la lógica viviera en dos sitios, uno
 * de los dos se quedaría atrás.
 *
 * POR QUÉ `clues` VA VACÍO, que es lo primero que sorprende al leerlo. Las
 * pistas de `Plot` son el mecanismo de CLUEDO: una frase por sala y ronda que
 * pasa al tablón al cerrar. Los hitos de este juego viven en `EstadoSombras` y
 * se enseñan por la pantalla de la senda, no por el tablón —que este juego ni
 * siquiera tiene en su barra—. La consecuencia hay que conocerla:
 * `numeroDeRondas` deduce las rondas de `clues`, así que sin pistas devuelve su
 * valor por defecto, cuatro, que resulta ser exactamente el número de horas que
 * pide este juego. Coinciden, y no están atadas: si algún día se cambia una,
 * hay que cambiar la otra a mano.
 */
/*
 * `entidadesDe` se importa por la puerta principal de `shared/juegos` y no por
 * el atajo de `./entidades`, y no da igual: es el índice quien apunta DÓNDE vive
 * cada categoría (`anotarAlmacenes`, al cargarse). Importando solo el atajo, la
 * tabla está vacía y `entidadesDe(game, 'escoltas')` devuelve una lista sin
 * nadie —sin dar ningún error—. A la Momia le costó un rato de perplejidad.
 */
import { entidadesDe } from '../../../shared/juegos';
import { registrarAmpliacion } from './ampliaciones';
import {
  generarSenda,
  redactarHito,
  repartirHitos,
  verificarSenda,
} from './sombras-senda';
import {
  PRENDAS_INICIALES,
  rastroMaximoPara,
  TRAMOS_DE_LA_SENDA,
} from '../../../shared/juegos/sombras-tipos';
import type {
  CondicionEscrita,
  EstadoSombras,
  PapelId,
  PorteId,
  TramaSombras,
} from '../../../shared/juegos/sombras-tipos';
import type { GameSession, Plot, PlotCharacter, TimelineEvent } from '../../../shared/types';

/** El eje único: quién cobra de Akechi. */
export const EJE_KANCHO = 'kancho';

/** Cuántas horas tiene una noche si nadie dice lo contrario. */
export const HORAS_POR_DEFECTO = 4;

/**
 * Los nombres de las horas de la noche, en el reloj japonés.
 *
 * Son las horas del zodiaco y son reales: 亥 el Jabalí (~21–23 h), 子 la Rata
 * (~23–01), 丑 el Buey (~01–03), 寅 el Tigre (~03–05) y 卯 la Liebre (~05–07),
 * que es el alba y el límite de la noche.
 *
 * VAN EN CÓDIGO Y NO EN EL MANIFIESTO porque el manifiesto solo sabe sustituir
 * `{ronda}` y `{total}` en sus avisos: un nombre por hora no cabe ahí. Los usan
 * la app, la guía impresa y las narraciones, que es donde de verdad se leen.
 */
export const HORAS_DE_LA_NOCHE = [
  { kanji: '亥', nombre: 'la hora del Jabalí', reloj: 'de las nueve a las once' },
  { kanji: '子', nombre: 'la hora de la Rata', reloj: 'de las once a la una' },
  { kanji: '丑', nombre: 'la hora del Buey', reloj: 'de la una a las tres' },
  { kanji: '寅', nombre: 'la hora del Tigre', reloj: 'de las tres a las cinco' },
  { kanji: '卯', nombre: 'la hora de la Liebre', reloj: 'el alba' },
] as const;

/** Cómo se llama la hora número N. Da la vuelta si la noche se alarga. */
export function nombreDeLaHora(ronda: number): string {
  if (ronda < 1) return 'antes de salir';
  const h = HORAS_DE_LA_NOCHE[(ronda - 1) % HORAS_DE_LA_NOCHE.length]!;
  return h.nombre;
}

// ---------------------------------------------------------------------------
// Los papeles
// ---------------------------------------------------------------------------

/**
 * Los seis disfraces que se reparten, con su nombre y lo que hacen.
 *
 * Son seis de los siete *shichihōde* (七方出) que recoge el Bansenshūkai. El
 * séptimo no está en esta lista, y esa ausencia es el corazón del juego: al
 * kanchō se le reparte uno de estos seis como a cualquiera —en su dosier pone
 * «Sarugaku» y hace lo que hace un sarugaku— y la capacidad de fabricar hitos
 * falsos no se guarda en ningún campo: se deduce de ser la respuesta del eje. Un
 * dato que no se guarda es un dato que no se puede filtrar por descuido.
 */
/**
 * Un disfraz de los que se reparten: cualquiera menos el del kanchō.
 *
 * SE DECLARA CON `Exclude` Y NO SE DEJA EN `PapelId` porque así el compilador
 * impide meter `falsear` en la tabla de abajo. No es una precaución teórica: esa
 * tabla la lee el reparto, la lee el prompt del asistente y la lee el dosier
 * impreso, y el día que alguien la ampliara sin darse cuenta, el papel secreto
 * del traidor saldría anunciado en las tres.
 */
export type PapelRepartible = Exclude<PapelId, 'falsear'>;

export const PAPELES_REPARTIBLES: Array<{
  papel: PapelRepartible;
  /** Cómo se llama en el dosier. */
  rol: string;
  /** El kanji del disfraz, para el cartel y la app. */
  kanji: string;
  que: string;
}> = [
  {
    papel: 'rastrear',
    rol: 'Yamabushi, asceta de los montes',
    kanji: '山伏',
    que: 'Subes a estas cumbres desde niño y lees el monte como quien lee una cara. Cada hora sacas un hito de más, y solo tú lo ves.',
  },
  {
    papel: 'amparar',
    rol: 'Komusō, monje de la cesta',
    kanji: '虚無僧',
    que: 'Llevas la cabeza dentro de una cesta de junco y nadie te mira dos veces. A quien elijas no le sube el rastro esta hora, aunque pise donde no debe.',
  },
  {
    papel: 'comprar',
    rol: 'Akindo, la gente de Chaya',
    kanji: '商人',
    que: 'Llevas plata de Chaya en el fajín y sabes cuánto vale callar. Una vez por hora compras un silencio: el rastro de la columna baja uno.',
  },
  {
    papel: 'adelantarse',
    rol: 'Hōkashi, juglar de camino',
    kanji: '放下師',
    que: 'Vas por delante haciendo ruido, que es la mejor manera de que te cuenten cosas. Sabes qué paso batirán la hora siguiente.',
  },
  {
    papel: 'referir',
    rol: 'Tsune no kata, persona corriente',
    kanji: '常の形',
    que: 'No llamas la atención de nadie, y por eso puedes poner algo sobre la mesa sin que parezca una jugada. Haces público uno de tus hitos.',
  },
  {
    papel: 'trocar',
    rol: 'Sarugaku, comediante de aldea',
    kanji: '猿楽',
    que: 'Entras en las casas a cambiar coplas por comida y sales sabiendo lo que pasa dentro. Intercambias un hito con quien elijas: ganáis los dos, y os exponéis los dos.',
  },
];

/** La ficha de un papel, con respaldo para no reventar nunca al pintar. */
export function fichaDePapel(papel: PapelId): (typeof PAPELES_REPARTIBLES)[number] {
  return PAPELES_REPARTIBLES.find((p) => p.papel === papel) ?? PAPELES_REPARTIBLES[0]!;
}

// ---------------------------------------------------------------------------
// Los portes
// ---------------------------------------------------------------------------

/** Qué significa llevar cada uno de los tres enseres que pesan en las reglas. */
export const PORTES: Array<{ porte: PorteId; nombre: string; kanji: string; que: string }> = [
  {
    porte: 'farol',
    nombre: 'El farol',
    kanji: '提灯',
    que: 'Alumbra tres pasos por delante, y por eso ves a los cazadores antes que ellos a ti: al abrirse cada hora sabes qué paso está batido. Nadie más lo sabe.',
  },
  {
    porte: 'plata',
    nombre: 'La plata de Chaya',
    kanji: '銀',
    que: 'Un puñado de plata compra media provincia esta noche. Mientras la lleves, el rastro de cada hora sube uno menos.',
  },
  {
    porte: 'lanza',
    nombre: 'La lanza de Hanzō',
    kanji: '槍',
    que: 'Con ella en la mano nadie se acerca a mirarte la cara. No sumas rastro al entrar en el paso batido.',
  },
];

/** La ficha de un porte, o undefined si ese enser no lleva ninguno. */
export function fichaDePorte(porte: PorteId | undefined): (typeof PORTES)[number] | undefined {
  return porte ? PORTES.find((p) => p.porte === porte) : undefined;
}

// ---------------------------------------------------------------------------
// Las contraseñas
// ---------------------------------------------------------------------------

/**
 * Las palabras que se escriben en las puertas.
 *
 * Son santos y señas del Sengoku: una palabra corta, de las que se dicen en
 * bajo y no se confunden con otra. La pareja 山 / 川 —«monte» y «río»— es la que
 * todo el mundo conoce, y de ahí sale la familia entera.
 *
 * LAS ESCRIBE EL CÓDIGO Y NUNCA EL MODELO, y es una regla del §7 con una razón
 * muy concreta: hay que teclearlas en un móvil, de pie, a oscuras y a veces con
 * una mano. Tienen que ser cortas, sin acentos y sin ambigüedad. Un modelo con
 * ganas de lucirse escribiría «Kagerō no michi» y la mecánica se vendría abajo
 * la primera vez que alguien no acertara con la ō.
 *
 * SON DIECISÉIS, que es el tope de pasos que admite el generador: así nunca hay
 * que repetir una, y repetir sería regalar la contraseña de una puerta a quien
 * abrió otra.
 */
export const CONTRASENAS: Array<{ palabra: string; kanji: string; significa: string }> = [
  { palabra: 'YAMA', kanji: '山', significa: 'monte' },
  { palabra: 'KAWA', kanji: '川', significa: 'río' },
  { palabra: 'UMI', kanji: '海', significa: 'mar' },
  { palabra: 'MATSU', kanji: '松', significa: 'pino' },
  { palabra: 'TAKE', kanji: '竹', significa: 'bambú' },
  { palabra: 'TSUKI', kanji: '月', significa: 'luna' },
  { palabra: 'HOSHI', kanji: '星', significa: 'estrella' },
  { palabra: 'IWA', kanji: '岩', significa: 'roca' },
  { palabra: 'KIRI', kanji: '霧', significa: 'niebla' },
  { palabra: 'TAKA', kanji: '鷹', significa: 'halcón' },
  { palabra: 'TSURU', kanji: '鶴', significa: 'grulla' },
  { palabra: 'KAME', kanji: '亀', significa: 'tortuga' },
  { palabra: 'YUKI', kanji: '雪', significa: 'nieve' },
  { palabra: 'KAZE', kanji: '風', significa: 'viento' },
  { palabra: 'MIZU', kanji: '水', significa: 'agua' },
  { palabra: 'SUGI', kanji: '杉', significa: 'cedro' },
];

/** La ficha de una contraseña, para pintarla con su kanji en el cartel. */
export function fichaDeContrasena(palabra: string): (typeof CONTRASENAS)[number] | undefined {
  return CONTRASENAS.find((c) => c.palabra === palabra.toUpperCase());
}

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
  /** La misma semilla da la misma noche. Sin ella, una distinta cada vez. */
  semilla?: string;
  /** Cuántas horas tiene la noche. */
  horas?: number;
  /** A quién le toca cobrar de Akechi. Si no se dice, sale al azar. */
  kancho?: string;
}

/**
 * Compone una partida entera sin pedirle nada a ningún modelo.
 *
 * @throws si la partida no tiene con qué jugarse. Reventar aquí —al preparar,
 * con el taller delante— es infinitamente mejor que entregar una noche a la que
 * le faltan pasos y que no se pueda terminar.
 */
export function generarTramaSombras(game: GameSession, opciones: OpcionesTrama = {}): Plot {
  const escoltas = entidadesDe(game, 'escoltas');
  const pasos = entidadesDe(game, 'pasos');
  const enseres = entidadesDe(game, 'enseres');
  const estandartes = entidadesDe(game, 'estandartes');

  if (escoltas.length < 4) throw new Error('La columna necesita cuatro personas.');
  if (pasos.length < TRAMOS_DE_LA_SENDA + 2) {
    throw new Error(`El camino necesita al menos ${TRAMOS_DE_LA_SENDA + 2} pasos.`);
  }
  if (enseres.length < 3) throw new Error('La columna necesita al menos tres enseres.');
  if (estandartes.length < 4) throw new Error('Hacen falta al menos cuatro estandartes.');

  const semilla = opciones.semilla ?? `sombras-${game.id}-${Date.now()}`;
  const rnd = azarCon(semilla);
  const horas = Math.max(1, opciones.horas ?? HORAS_POR_DEFECTO);

  // ---- El rompecabezas ----
  const puzle = generarSenda({
    pasos: pasos.map((p) => p.id),
    jugadores: escoltas.length,
    semilla: `${semilla}|senda`,
    /*
     * MÁS CONDICIONES QUE HORAS, y esto es una regla del juego disfrazada de
     * parámetro. Todo paso da hito todas las horas, y se entra en uno por hora:
     * quien reconozca los cuatro se lleva cuatro hitos distintos como mucho. Si
     * el camino se resolviera con cuatro, una sola persona lo sacaría en
     * solitario y la razón de ser del juego —que haya que poner en común— se
     * caería sin que ninguna de las cuatro garantías se enterase.
     */
    minimoCondiciones: horas + 1,
  });
  /*
   * SE VERIFICA AQUÍ TAMBIÉN, aunque `generarSenda` ya no devuelve caminos
   * malos. Es una comprobación redundante a propósito: es la última puerta antes
   * de que la trama se guarde en la base de datos, y a partir de ella el error ya
   * no se puede distinguir de una partida buena hasta la noche.
   */
  const informe = verificarSenda(pasos.map((p) => p.id), puzle);
  if (!informe.ok) {
    throw new Error(`La senda no cumple sus garantías: ${JSON.stringify(informe)}`);
  }

  const nombreDePaso = (id: string): string => pasos.find((p) => p.id === id)?.name ?? id;

  const condiciones: CondicionEscrita[] = puzle.condiciones.map((condicion, i) => ({
    id: `h-${i + 1}`,
    condicion,
    texto: redactarHito(condicion, nombreDePaso),
  }));
  const falsasCandidatas: CondicionEscrita[] = puzle.falsas.map((f, i) => ({
    id: `f-${i + 1}`,
    condicion: f.condicion,
    texto: redactarHito(f.condicion, nombreDePaso),
  }));

  // ---- Quién cobra de Akechi ----
  const kancho =
    escoltas.find((e) => e.id === opciones.kancho) ??
    escoltas[Math.floor(rnd() * escoltas.length)]!;

  // ---- Los papeles ----
  // Barajados y repartidos en rueda: con cuatro personas y seis disfraces, dos
  // se quedan sin salir, y cuáles cambia de partida en partida.
  const barajados = barajar(PAPELES_REPARTIBLES, rnd);
  const papeles: Record<string, PapelId> = {};
  escoltas.forEach((e, i) => {
    papeles[e.id] = barajados[i % barajados.length]!.papel;
  });

  // ---- Los estandartes ----
  const banderas = barajar(estandartes, rnd);
  const porCasa: Record<string, string> = {};
  escoltas.forEach((e, i) => {
    porCasa[e.id] = banderas[i % banderas.length]!.id;
  });

  // ---- Los portes y quién carga qué ----
  const cargables = barajar(enseres, rnd);
  const portes: Record<string, PorteId> = {};
  PORTES.forEach((p, i) => {
    const enser = cargables[i];
    if (enser) portes[enser.id] = p.porte;
  });
  const portadores = barajar(escoltas, rnd);
  const cargaInicial: Record<string, string> = {};
  cargables.forEach((enser, i) => {
    cargaInicial[enser.id] = portadores[i % portadores.length]!.id;
  });

  // ---- Las contraseñas de las puertas ----
  const palabras = barajar(CONTRASENAS, rnd);
  const contrasenas: Record<string, string> = {};
  pasos.forEach((paso, i) => {
    contrasenas[paso.id] = palabras[i % palabras.length]!.palabra;
  });

  // ---- Dónde esperan los cazadores cada hora ----
  /*
   * Sin repetir dos horas seguidas. Si el mismo paso se batiera dos noches, la
   * segunda no sería una decisión: nadie entra donde ya sabe que hay gente, y
   * esa hora el paso se quedaría vacío.
   */
  const batidos: string[] = [];
  for (let ronda = 0; ronda < horas; ronda++) {
    const posibles = pasos.filter(
      (p) =>
        p.id !== batidos[ronda - 1] &&
        // Y el último tampoco puede repetir el primero: la lista se recorre en
        // círculo si la noche se alarga (ver `pasoBatido`), y si coincidieran
        // los extremos habría dos horas seguidas con el mismo paso.
        !(ronda === horas - 1 && horas > 1 && p.id === batidos[0]),
    );
    batidos.push(posibles[Math.floor(rnd() * posibles.length)]!.id);
  }

  // ---- Dónde aparece cada hito ----
  const hallazgos = repartirHitos({
    hitos: condiciones.map((c) => c.id),
    pasos: pasos.map((p) => p.id),
    rondas: horas,
    semilla: `${semilla}|hitos`,
  });

  const enserComprometido = cargables[cargables.length - 1]!;

  const delJuego: TramaSombras = {
    sendaVerdadera: puzle.sendaVerdadera,
    condiciones,
    falsasCandidatas,
    batidos,
    hallazgos,
    contrasenas,
    papeles,
    estandartes: porCasa,
    portes,
    cargaInicial,
    enserComprometido: enserComprometido.id,
  };

  // ---- El sabor ----
  const casa = game.name?.trim() || 'esta casa';
  const characters = construirColumna(
    escoltas,
    papeles,
    porCasa,
    estandartes,
    kancho.id,
    enserComprometido.name,
  );

  return {
    title: 'El Paso de las Sombras',
    tagline: 'Honnō-ji arde. Antes del alba hay que cruzar Iga, y uno de los que guían cobra de Akechi.',
    synopsis:
      `Esta madrugada, en Kioto, Akechi Mitsuhide ha rodeado el templo de Honnō-ji y Oda Nobunaga ` +
      `ha muerto en el incendio. El señor estaba de visita en Sakai, sin ejército y con un puñado ` +
      `de acompañantes, y ahora los caminos son de Akechi. La única salida es cruzar de noche la ` +
      `provincia de Iga —arrasada el año pasado, llena de gente con motivos para cobrarse una ` +
      `deuda— y llegar antes del alba a la playa de Shirako, donde espera una barca. De todos los ` +
      `pasos que hay, solo cuatro forman la senda, y hay que andarlos en orden. Nadie los conoce ` +
      `todos. Y hay algo peor: uno de los ${escoltas.length} que cruzan esta noche cobra de ` +
      `Akechi, y no quiere que el señor embarque.`,
    victim: {
      name: 'el señor',
      description:
        'Hace doce horas era un aliado invitado a una función de teatro en Sakai. Ahora es un ' +
        'hombre sin tierra a cuatro días de la suya, con precio en la cabeza y treinta personas ' +
        'que responden por él. Si no llega a la barca, se acaba una historia que aún no ha empezado.',
    },
    setting:
      `${casa}, convertida por una noche en el camino de Iga: ` +
      `${pasos.map((p) => p.name).join(', ')}. Cada hora los cazadores baten uno de esos pasos, ` +
      `y no se anuncia cuál.`,
    solution: {
      // Un solo eje, y su respuesta es una persona de la mesa: de ahí sale
      // gratis que el kanchō no gane señalándose a sí mismo.
      respuestas: { [EJE_KANCHO]: kancho.id },
      motive:
        `A ${kancho.name} le prometieron ${enserComprometido.name} y algo más difícil de decir en ` +
        `voz alta: que en Iga no vuelva a pasar lo del año pasado. Akechi paga por que el señor no ` +
        `llegue a la barca, y esta noche eso significa dejar que amanezca.`,
      howItHappened:
        `${kancho.name} se sumó a la columna con todo el mundo mirando y con el mismo miedo que ` +
        `los demás, y hasta ahí no hay nada que fingir. Lo que lleva encima es la palabra dada a ` +
        `un hombre de Akechi en un cruce de caminos: sabe dónde esperan los cazadores cada hora, ` +
        `porque se lo dijeron, y puede dejar por el camino un mojón escrito de su puño que suene a ` +
        `verdad. Le basta con que se ande la senda equivocada.`,
    },
    characters,
    timeline: construirCronologia(),
    /*
     * Vacío, y el porqué está en la cabecera: los hallazgos de este juego no son
     * pistas de sala, son hitos que viven en el estado.
     */
    clues: [],
    gmScript: [
      'Antes de que llegue nadie: cuelga un cartel en cada paso —lleva la CONTRASEÑA, y es lo que hay que ir a leer—, deja en cada habitación las tiras de sus hitos y reparte los dosieres cerrados.',
      'Abre la noche leyendo la sinopsis. Cuenta lo de Honnō-ji. Deja claro que hay barca en Shirako y que solo hay cuatro pasos buenos.',
      'Al abrir cada hora NO digas dónde están los cazadores. Es lo único que no se anuncia, y es de lo que vive el juego.',
      'Deja que se muevan. Cada cual va hasta su paso, lee la palabra de la puerta y la teclea; entonces recibe el hito de esa hora.',
      'Recuerda que las prendas solo se dan a otras personas. Quien recibe una debe una respuesta sincera a una pregunta directa: haz que se cobre en voz alta.',
      'Cierra la hora y REVELA qué paso estaba batido. Ahí es donde se ve quién decía la verdad; deja que la mesa lo mastique antes de abrir la siguiente.',
      'Cuando la mesa ya casi lo tenga —o el rastro apriete—, abre el consejo del alba: cada cual propone su senda de cuatro pasos y señala a quien cree el kanchō.',
      'Echa a andar la senda más apoyada, de verdad, habitación por habitación y con todo el mundo detrás. Es el mejor momento de la noche: no lo resuelvas sentado.',
      'Cierra revelando la senda verdadera, quién cobraba de Akechi y por qué. El pliego lo tienes tú.',
    ],
    delJuego,
  };
}

// ---------------------------------------------------------------------------
// Las personas
// ---------------------------------------------------------------------------

function construirColumna(
  escoltas: Array<{ id: string; name: string; description?: string }>,
  papeles: Record<string, PapelId>,
  estandartesDe: Record<string, string>,
  estandartes: Array<{ id: string; name: string }>,
  kanchoId: string,
  enserComprometido: string,
): PlotCharacter[] {
  const nombreDeEstandarte = (id: string): string =>
    estandartes.find((e) => e.id === id)?.name ?? 'sin blasón';

  return escoltas.map((persona, i) => {
    const papel = papeles[persona.id]!;
    const ficha = fichaDePapel(papel);
    const esKancho = persona.id === kanchoId;
    const companero = escoltas[(i + 1) % escoltas.length]!;

    /*
     * EL DOSIER DEL KANCHŌ SE PARECE A LOS DEMÁS. Si su papel o su disfraz
     * sonaran distintos, bastaría con que dos personas comparasen dosieres para
     * descubrirle en la primera hora. Lo único que cambia es el secreto, y el
     * secreto no lo lee nadie más.
     */
    const secret = esKancho
      ? `Cobras de Akechi. Te buscaron hace tres días en un cruce de caminos y te ofrecieron ` +
        `${enserComprometido} y una promesa sobre Iga que no te atreves a repetir en voz alta. ` +
        `Te dijeron dónde esperarían los cazadores cada hora de esta noche, así que lo sabes. Y ` +
        `puedes dejar por el camino un mojón escrito de tu puño que suene a verdad: úsalo cuando ` +
        `la mesa esté a punto de acertar, no antes, y hazlo en un paso donde no haya nadie más. ` +
        `Ganas si al amanecer no se ha andado la senda buena.`
      : `Viste a ${companero.name} apartarse a hablar con alguien en el camino de Sakai, y volver ` +
        `sin decir con quién. Puede que no signifique nada. Puede que sí, y entonces callarlo te ` +
        `va a costar caro esta noche.`;

    return {
      participanteId: persona.id,
      characterName: persona.name,
      role: ficha.rol,
      publicPersona: `${persona.name}, ${ficha.rol.toLowerCase()}, bajo el blasón de ${nombreDeEstandarte(
        estandartesDe[persona.id] ?? '',
      )}.`,
      secret,
      motive: esKancho
        ? 'Una deuda con Iga que nadie te pagó nunca, y un hombre de Akechi que sí ha pagado por adelantado.'
        : 'Llegar a la playa antes del alba, y llegar con todos.',
      alibi: 'Cuando llegó la noticia de Honnō-ji estabas donde todo el mundo: en el patio, sin saber qué hacer con las manos.',
      knowledge: [
        `Tu disfraz: ${ficha.que}`,
        'Nadie tiene hitos suficientes para trazar la senda en solitario. Es a propósito: hay que ponerlos en común.',
        'A un paso hay que IR: se lee la palabra escrita en la puerta y se teclea. Sin eso no hay hito.',
        'No se anuncia qué paso baten los cazadores. Se sabe al cerrar la hora, y ahí se ve quién decía la verdad.',
        'Una prenda solo se da a otra persona, y quien la recibe debe una respuesta sincera a una pregunta directa.',
        'No todo lo que lleva escrito un mojón es cierto. Alguien de esta columna puede escribirlos.',
      ],
      personalHook: persona.description?.trim()
        ? `El papel se te ha escrito a medida. Quien te conoce dice de ti: «${persona.description.trim()}». ` +
          `Úsalo: esta noche lo que convence no son los datos, es quién los cuenta.`
        : 'No sabemos mucho de ti todavía, y eso juega a tu favor: nadie tiene una versión previa de cómo te comportas cuando hay algo en juego.',
    };
  });
}

/**
 * La cronología pública: lo que pasó ANTES de que empezara a jugarse.
 *
 * NO LLEVA NI UNA HORA DE LA NOCHE, y esa es una lección que la Momia pagó
 * jugando: `VistaJugador.cronologia` es PÚBLICA por contrato, así que un renglón
 * por hora diciendo dónde estarían los cazadores habría enseñado a todo el mundo,
 * desde el primer minuto, qué habitaciones evitar. Rompería la decisión central
 * del juego y dejaría sin sentido dos de los seis disfraces.
 *
 * Lo de cada hora se sabe cuando toca, y por donde debe: al cerrarla.
 */
function construirCronologia(): TimelineEvent[] {
  return [
    {
      time: '04:00',
      description:
        'En Kioto, las tropas de Akechi Mitsuhide rodean el templo de Honnō-ji. Antes del amanecer, Oda Nobunaga ha muerto en el incendio.',
      participanteIds: [],
      isPublic: true,
    },
    {
      time: '10:00',
      description:
        'La noticia llega a Sakai. El señor está de visita, sin tropas, con un puñado de acompañantes y a cuatro días de sus tierras.',
      participanteIds: [],
      isPublic: true,
    },
    {
      time: '15:00',
      description:
        'Se descarta ir por la costa: los caminos grandes son de Akechi. Se decide cruzar Iga de noche, y se manda aviso a los guías.',
      participanteIds: [],
      isPublic: true,
    },
    {
      time: '20:00',
      description:
        'Chaya se adelanta con plata para comprar el paso donde se pueda comprar. Por los montes ya corre que hay samuráis en fuga y precio por ellos.',
      participanteIds: [],
      isPublic: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Del papel a la mesa
// ---------------------------------------------------------------------------

/**
 * Qué paso baten los cazadores en una hora.
 *
 * SE CONSULTA EN CÍRCULO, y eso tapa una avería que la Momia descubrió tarde: la
 * trama escribe tantos pasos batidos como horas se pidieron, pero quien dirige
 * puede abrir horas indefinidamente —`ronda-cerrada` vuelve a `ronda-abierta`— y
 * en la primera que se pasara de la cuenta el índice se saldría de la lista:
 * ningún paso batido, ningún rastro, el peligro apagado de golpe y sin que nada
 * diera error.
 *
 * Dando la vuelta al principio, una quinta hora repite el paso de la primera. El
 * peligro no se para nunca y el juego sigue teniendo sentido.
 */
export function pasoBatido(batidos: string[], ronda: number): string | undefined {
  if (batidos.length === 0 || ronda < 1) return undefined;
  return batidos[(ronda - 1) % batidos.length];
}

/**
 * La trama de este juego en una partida, si la tiene.
 *
 * `Plot.delJuego` es `unknown` a propósito —el contrato general no sabe de qué
 * se juega—, así que alguien tiene que bajarlo a tipo. Ese alguien es este
 * juego, y por eso comprueba antes de creerse nada: una partida de CLUEDO, o una
 * de este juego generada por una versión anterior, pasa por aquí y sale sin
 * trama en vez de reventar en mitad de una proyección.
 */
export function tramaDe(plot: Plot | undefined): TramaSombras | undefined {
  const posible = plot?.delJuego as TramaSombras | undefined;
  if (
    !posible ||
    !Array.isArray(posible.sendaVerdadera) ||
    !Array.isArray(posible.condiciones) ||
    typeof posible.contrasenas !== 'object'
  ) {
    return undefined;
  }
  return posible;
}

/**
 * El estado con el que arranca una noche, sacado de la trama.
 *
 * La frontera entre los dos es la del tiempo: la trama es lo que se decidió
 * antes de que llegara nadie, el estado es lo que va pasando. Esta función es el
 * momento exacto en que lo primero se convierte en lo segundo.
 */
export function estadoInicial(
  trama: TramaSombras,
  participanteIds: string[],
  /*
   * EL REPARTO YA RESUELTO, incluida la gente que llegó tarde.
   *
   * Aquí ponía `trama.papeles[id] ?? 'rastrear'`, y ese respaldo silencioso
   * hacía que la partida diera DOS RESPUESTAS DISTINTAS a la misma pregunta: a
   * quien se apuntó después de generar, el móvil le ponía `rastrear` sin
   * decírselo a nadie mientras su dosier impreso decía que esta noche no le
   * había asignado ninguno.
   *
   * `ampliarColumna` lo arreglaba, pero solo si el Game Master actualizaba la
   * partida ANTES de que nadie emparejara el móvil. Sentar primero a quien llega
   * tarde —que es el orden natural cuando hay prisa— dejaba ganar al respaldo.
   *
   * Con `papelesAlDia` la respuesta es la misma se actualice o no, y antes o
   * después: es la MISMA rueda.
   */
  papeles: Record<string, PapelId> = trama.papeles,
  /*
   * Y los estandartes al día, por lo mismo. Iban por `trama.estandartes`, así
   * que quien llegaba tarde se sentaba SIN NINGUNO —no con uno equivocado, con
   * ninguno— hasta que alguien se acordara de actualizar la partida.
   */
  banderas: Record<string, string> = trama.estandartes,
): EstadoSombras {
  const gente: EstadoSombras['gente'] = {};
  for (const id of participanteIds) {
    gente[id] = {
      prendas: PRENDAS_INICIALES,
      prendasRecibidas: 0,
      hitos: [],
      donde: {},
      // El respaldo ya no debería alcanzarse por el camino de producción:
      // `estadoDe` resuelve la rueda antes de llamar. Queda porque el tipo pide
      // un papel y quedarse sin ninguno impediría jugar, que es peor.
      papel: papeles[id] ?? trama.papeles[id] ?? 'rastrear',
      enseres: Object.entries(trama.cargaInicial)
        .filter(([, quien]) => quien === id)
        .map(([enser]) => enser),
      pisadas: 0,
    };
  }

  const hitos: EstadoSombras['hitos'] = {};
  for (const c of trama.condiciones) {
    hitos[c.id] = {
      id: c.id,
      condicion: c.condicion,
      texto: c.texto,
      falso: false,
      publico: false,
    };
  }

  /*
   * Las falsas NO entran aquí. Solo aparecen en `hitos` si el kanchō llega a
   * publicar una, y entonces entran ya públicas. Tenerlas dentro desde el
   * principio sería un montón de hitos marcados `falso: true` esperando en el
   * estado a que a alguien se le olvide filtrarlos en una proyección.
   */
  return {
    sendaVerdadera: [...trama.sendaVerdadera],
    batidos: [...trama.batidos],
    rastro: 0,
    rastroMaximo: rastroMaximoPara(participanteIds.length),
    gente,
    hitos,
    estandartes: { ...banderas },
    portes: { ...trama.portes },
    propuestas: {},
  };
}

// ---------------------------------------------------------------------------
// Poner al día una columna a la que se ha sumado alguien más
// ---------------------------------------------------------------------------

/**
 * Qué pasa cuando alguien se apunta con la trama ya escrita.
 *
 * LO QUE HACE FALTA ARREGLAR. Esa persona se quedaría fuera del reparto de
 * disfraces y de estandartes, y entonces la partida daría DOS RESPUESTAS
 * DISTINTAS a la misma pregunta: el móvil le pondría un papel por defecto en
 * silencio y su dosier impreso diría que no le tocó ninguno. Quien lo leyera se
 * plantaría en la mesa creyendo que no tiene disfraz, con un disfraz en el
 * bolsillo. Es exactamente el fallo que tuvo la Momia.
 *
 * SIN LLAMAR AL MODELO, y es una decisión, no una limitación. La ampliación de
 * CLUEDO sí llama, y para hacerlo le pasa la solución del caso: aquí eso
 * significa pasarle el motivo, que NOMBRA a quien cobra de Akechi, para que
 * escriba textos que se imprimen en la hoja de todo el mundo. No merece la pena
 * arriesgar eso por un párrafo de color.
 *
 * NO TOCA NADA DE LO YA ESCRITO: ni la senda, ni los hitos, ni quién es el
 * kanchō, ni los disfraces de quienes ya lo tenían. Solo rellena huecos.
 */
/**
 * El reparto de papeles y estandartes al día, contando a quien llegó tarde.
 * No muta nada.
 *
 * LA RUEDA SIGUE DONDE SE QUEDÓ, igual que en el reparto original: para quien
 * llega tarde se continúa por el mismo sitio, así que sigue siendo par y no
 * depende del azar del momento.
 *
 * ES PURA Y ES UNA SOLA. Antes esta cuenta vivía dentro de `ampliarColumna`
 * —que solo corre si el Game Master actualiza la partida— mientras el móvil, al
 * sentar a alguien, se inventaba un `rastrear` por su cuenta. Dos sitios
 * decidiendo lo mismo son dos respuestas distintas en cuanto una no se ejecuta.
 */
export function papelesAlDia(
  trama: TramaSombras,
  escoltas: Array<{ id: string }>,
  estandartes: Array<{ id: string }>,
): { papeles: Record<string, PapelId>; estandartes: Record<string, string> } {
  const papeles: Record<string, PapelId> = { ...trama.papeles };
  const banderas: Record<string, string> = { ...trama.estandartes };
  let vuelta = Object.keys(trama.papeles).length;
  for (const persona of escoltas) {
    if (papeles[persona.id] !== undefined) continue;
    papeles[persona.id] = PAPELES_REPARTIBLES[vuelta % PAPELES_REPARTIBLES.length]!.papel;
    if (estandartes.length > 0) {
      banderas[persona.id] = estandartes[vuelta % estandartes.length]!.id;
    }
    vuelta += 1;
  }
  return { papeles, estandartes: banderas };
}

export function ampliarColumna(game: GameSession, plot: Plot): { anadidos: string[] } {
  const trama = tramaDe(plot);
  if (!trama) return { anadidos: [] };

  const escoltas = entidadesDe(game, 'escoltas');
  const estandartes = entidadesDe(game, 'estandartes');
  const yaEscritos = new Set(plot.characters.map((c) => c.participanteId));
  const anadidos: string[] = [];

  // El reparto lo decide `papelesAlDia`, que es la MISMA función que consulta
  // el móvil al sentar a alguien. Que sea una sola es lo que garantiza que las
  // dos respuestas coincidan, se actualice la partida antes o después.
  const alDia = papelesAlDia(trama, escoltas, estandartes);
  Object.assign(trama.papeles, alDia.papeles);
  Object.assign(trama.estandartes, alDia.estandartes);

  for (const persona of escoltas) {
    if (yaEscritos.has(persona.id)) continue;

    /*
     * Con respaldo, aunque el papel se acabe de repartir tres líneas arriba: si
     * algún día deja de hacerse, esto tiene que dar un dosier pobre y no tirar
     * la puesta al día entera con doce personas esperando.
     */
    const ficha = fichaDePapel(trama.papeles[persona.id] ?? 'rastrear');
    plot.characters.push({
      participanteId: persona.id,
      characterName: persona.name,
      role: ficha.rol,
      publicPersona: 'Se unió a la columna con el camino ya empezado.',
      secret: 'Callas algo de lo que viste en Sakai que todavía no has sabido cómo contar.',
      motive: 'Llegar a la playa antes del alba, y llegar con todos.',
      alibi: 'Dices que estabas en el patio cuando llegó la noticia. Como todo el mundo.',
      knowledge: [],
      personalHook:
        'Su papel se ha quedado sin escribir: improvísalo con lo que sepas de la persona, ' +
        'o vuelve a generar la noche entera para que se lo escriban.',
    });
    anadidos.push(persona.id);
  }

  return { anadidos };
}

/*
 * El alta. Este juego no llama al modelo para esto, así que su ampliación es
 * síncrona por dentro y se envuelve aquí para encajar en el contrato.
 */
registrarAmpliacion('sombras', async (game, plot, _informe, emit) => {
  const { anadidos } = ampliarColumna(game, plot);
  emit({
    type: 'text',
    delta:
      anadidos.length === 0
        ? 'La columna ya estaba completa.\n'
        : `Repartido el disfraz que faltaba a ${anadidos.length} ${anadidos.length === 1 ? 'persona' : 'personas'}.\n`,
  });
});
