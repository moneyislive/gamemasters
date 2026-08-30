/**
 * El Paso de las Sombras, dicho como datos.
 *
 * ES EL TERCER JUEGO, y su encargo es distinto del que tuvo el segundo. El
 * Misterio de la Momia tenía que demostrar que la plataforma aguanta un juego
 * que NO cabe en ella; este tiene que demostrar que, hecho aquel trabajo, un
 * juego nuevo **ya no obliga a ampliarla**: solo a rellenar los huecos que el
 * manual enumera y que el compilador vigila.
 *
 * Por eso hay una restricción autoimpuesta que conviene leer antes que nada:
 * **no se añade ninguna fase a `LivePhase`**. Es la ampliación más cara del
 * contrato —`fases` es un `Record` exhaustivo, así que una fase nueva obliga a
 * tocar los cinco manifiestos que existen, incluidos los tres de las pruebas—
 * y este juego no la necesita: su consejo del alba es la fase `acusaciones`,
 * que ya existe y cuyo aviso SÍ se puede escribir desde aquí.
 *
 * Lo que este juego rompe, y que los otros dos daban por bueno:
 *
 *   · La app se fiaba de que estuviste donde dices. Aquí hay que TECLEAR la
 *     palabra escrita en la puerta: sin ir, no hay hallazgo.
 *   · La respuesta era un orden de un conjunto conocido. Aquí hay que averiguar
 *     a la vez QUÉ CUATRO pasos y EN QUÉ ORDEN.
 *   · El coste de explorar era personal. Aquí el rastro es de la columna entera.
 *   · El peligro se anunciaba al abrir la ronda. Aquí es secreto y se revela al
 *     CERRARLA, así que cada afirmación de la noche es una promesa comprobable.
 *   · Todo el mundo valía lo mismo al votar. Aquí el voto pesa lo que pesa tu
 *     palabra: las prendas que te han dado.
 *
 * El diseño completo, con las reglas, la historia real de la que salen y el
 * porqué de cada decisión, está en `docs/sombras/DISENO.md`. Aquí solo va lo
 * que los tres paquetes tienen que saber a la vez.
 *
 * QUÉ NO ESTÁ AQUÍ Y ES A PROPÓSITO: la senda no es un `eje`. Un eje es una
 * respuesta independiente de una entidad; una senda es una selección ordenada
 * —cuáles y en qué orden—, y forzarla habría obligado al contrato general a
 * aprender qué es una secuencia. Vive en el estado del juego (`EstadoSombras`)
 * y la mueve una acción propia. Es la misma decisión que tomó la Momia con el
 * orden de los ritos, y se toma otra vez porque sigue siendo la correcta.
 */
import type { TrofeoInfo } from '../live';
import type { DocumentSectionInfo } from '../types';
import type { PrintableDocInfo } from '../documents';
import type { ManifiestoDeJuego, ReferenciaDeTrama, ReglaDeJuego } from './tipos';
import type { TramaSombras } from './sombras-tipos';

/**
 * Los trofeos de El Paso de las Sombras.
 *
 * LOS IDS SON LARGOS Y PROPIOS A PROPÓSITO. Los ids de trofeo no llevan prefijo
 * de juego —es una costura conocida, está en el informe— así que dos juegos
 * pueden usar el mismo sin que nada avise, y entonces el trofeo de uno sale en
 * la vitrina con el nombre y el glifo del otro. `sombra` ya es de la Momia; el
 * de aquí es `sombra-de-akechi`, que no lo puede repetir nadie por accidente.
 *
 * LOS GLIFOS SON DEL PLANO BÁSICO, y esa lección la pagó la Momia: cualquier
 * carácter fuera del plano básico Unicode se pinta en Windows y sale como un
 * cuadradito en iOS y en Android — y la vitrina de trofeos se mira en el móvil,
 * que es justo el único sitio donde se ve. Ninguno repite forma con los de los
 * otros dos juegos: en la vitrina se miran de tres en tres a 30 px con el
 * rótulo en versalitas, y a ese tamaño la silueta es lo único que los distingue.
 */
export const TROFEOS_SOMBRAS: TrofeoInfo[] = [
  {
    id: 'paso-abierto',
    nombre: 'El que abrió el paso',
    descripcion: 'La senda que se anduvo era la tuya, y era la buena.',
    /* Una estrella maciza de cuatro puntas: la marca del mojón en un mapa. */
    glifo: '✦',
  },
  {
    id: 'ojo-de-hanzo',
    nombre: 'El ojo de Hanzō',
    descripcion: 'Señalaste al kanchō y acertaste.',
    /* Diana y no el disco macizo de «Ojo de Horus»: a 30 px se distinguen. */
    glifo: '◎',
  },
  {
    id: 'sin-rastro',
    nombre: 'Sin rastro',
    descripcion: 'Cruzaste Iga sin pisar una sola vez donde estaban los cazadores.',
    /* Hueco, porque es una AUSENCIA. Rombo y no estrella: «Incorrupto» ya la usa. */
    glifo: '◇',
  },
  {
    id: 'palabra-dada',
    nombre: 'Palabra dada',
    descripcion: 'Diste tus dos prendas. Ninguna fue para ti.',
    /* Un sello estampado: la prenda es una palabra que queda impresa. */
    glifo: '▣',
  },
  {
    id: 'sombra-de-akechi',
    nombre: 'La sombra de Akechi',
    descripcion: 'Cobrabas de Akechi, y amaneció sin barca.',
    /*
     * Una flor, y no es ironía gratuita: el blasón de los Akechi es la campánula
     * (桔梗, kikyō). Que el trofeo del traidor sea una flor es exactamente lo que
     * era su estandarte.
     */
    glifo: '✾',
  },
];

/**
 * Las secciones del dosier de cada escolta.
 *
 * Se parecen a las de la Momia porque el problema es el mismo —dar a alguien lo
 * justo para interpretar un papel sin destriparle la trama— pero las cuatro
 * propias son otras: aquí hay un DISFRAZ (lo que puedes hacer y nadie más), un
 * ESTANDARTE (de qué casa eres, que es público y sirve para llamarse en la
 * mesa), la CARGA de la columna y los PASOS del camino.
 */
export const SECCIONES_SOMBRAS: DocumentSectionInfo[] = [
  { id: 'cover', label: 'Portada', description: 'El título de la noche y de quién es el dosier.', required: true },
  { id: 'character', label: 'Tu escolta', description: 'Tu papel, tu cara pública, tu motivo y tu coartada.', required: true },
  { id: 'papel', label: 'Tu disfraz', description: 'Lo que tú puedes hacer y nadie más. Una vez por hora.', required: true },
  { id: 'estandarte', label: 'Tu estandarte', description: 'De qué casa vas. Es público: los demás lo saben.' },
  { id: 'secret', label: 'Tu secreto', description: 'Lo que ocultas. Nadie más lo lee.' },
  { id: 'knowledge', label: 'Lo que sabes', description: 'Lo que has ido averiguando, hora a hora.' },
  { id: 'case', label: 'La noche', description: 'Qué ha pasado en Kioto y por qué hay que cruzar Iga.' },
  { id: 'rules', label: 'Cómo se juega', description: 'Las reglas de la hora, del rastro y del consejo del alba.' },
  { id: 'columna', label: 'Quiénes cruzan', description: 'El resto de la columna, con lo que cualquiera sabría.' },
  { id: 'enseres', label: 'La carga', description: 'Lo que lleva la columna y qué pesa cada cosa en las reglas.' },
  { id: 'senda', label: 'Los pasos', description: 'Los pasos del camino. Cuáles forman la senda es lo que hay que averiguar.' },
  { id: 'board', label: 'El mapa', description: 'El plano de los pasos.' },
];

/**
 * Los imprimibles de El Paso de las Sombras.
 *
 * SE PUEDE JUGAR SIN MÓVILES, y eso no es un extra: es la mitad del producto.
 * Con una salvedad que está escrita en el §9 del diseño y que conviene no
 * disimular: **la contraseña de la puerta no se puede comprobar en papel**. El
 * cartel la lleva, y quien dirige la usa como prueba oral. La mecánica
 * sobrevive; lo que se pierde es el árbitro automático.
 *
 * `indice-paquete` NO ESTÁ AQUÍ Y SÍ LO ESTÁ: se reutiliza el de la casa, igual
 * que hace la Momia, porque esa hoja se compone entera desde el catálogo del
 * juego y desde `preparacion`. Escribir una propia habría sido un id más y una
 * plantilla más para decir lo mismo.
 */
export const IMPRIMIBLES_SOMBRAS: PrintableDocInfo[] = [
  {
    id: 'indice-paquete',
    name: 'Empieza por aquí',
    summary:
      'La hoja por la que se abre el paquete: qué imprimir, cuántas copias y qué no debes abrir tú si diriges a ciegas.',
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'doble',
  },
  {
    id: 'guia-del-paso',
    name: 'Guía del paso',
    summary:
      'El documento que llevas toda la noche: cómo se abre cada hora, qué paso baten los cazadores, cómo se resuelve el consejo del alba.',
    audience: 'gm',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'doble',
  },
  {
    id: 'dosier-escolta',
    name: 'Dosieres de la columna',
    summary:
      'Uno por persona: su papel, su disfraz, su estandarte y lo que puede contar. Se reparten en sobres cerrados.',
    audience: 'players',
    modes: ['host', 'blind'],
    defaultOn: true,
    porPersona: true,
    copies: 'una-por-jugador',
    sides: 'doble',
  },
  {
    id: 'hitos-camino',
    name: 'Los hitos del camino',
    summary:
      'Las tiras recortables con lo que dice cada mojón, agrupadas por paso y por hora. Se dejan en cada habitación antes de abrirla.',
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'carteles-paso',
    necesitaLugares: true,
    name: 'Carteles de los pasos',
    summary:
      'Un cartel por habitación, con su nombre y LA CONTRASEÑA que hay que ir a leer. Es lo que convierte tu casa en el camino de Iga.',
    audience: 'room',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una-por-sala',
    sides: 'una',
  },
  {
    id: 'hoja-consejo',
    name: 'Hoja del consejo',
    summary:
      'Donde cada cual escribe la senda que propone y a quién señala. Se rellena al final, en silencio y a la vez.',
    audience: 'players',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una-por-jugador',
    sides: 'una',
  },
  {
    id: 'tabla-rastro',
    name: 'Tabla del rastro y las prendas',
    summary: 'La cuenta del rastro de la columna y de las prendas de cada cual, para llevarla sin discusiones.',
    // No lleva la senda, así que puede llevarla quien dirige a ciegas.
    audience: 'gm',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'senda-verdadera',
    name: 'La senda verdadera',
    summary:
      'Los cuatro pasos en su orden, quién cobra de Akechi y qué paso baten los cazadores cada hora. NO la dejes sobre la mesa.',
    /*
     * PARA QUIEN PREPARA, y en los DOS modos. Es la lección que costó una
     * partida en la Momia: con `gmPlays`, quien dirige juega como uno más y no
     * conoce la solución, así que una hoja marcada `gm` + `host` no se imprimía
     * — y es justamente la que hace falta para arbitrar la noche. Quien monta el
     * sobre puede no ser quien dirige, y a ciegas es exactamente así.
     */
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'informe-senda',
    name: 'Informe de la senda',
    summary:
      'La comprobación de que el camino tiene una sola solución, de que nadie puede resolverlo en solitario y de que ningún hito sobra.',
    /*
     * `preparer` Y NO `gm`, por lo mismo que su gemelo de la Momia: dentro va el
     * texto entero de los hitos ciertos, y esos hitos determinan una sola senda.
     * Quien los lee tiene la solución aunque no venga enumerada, y con `gm` esta
     * hoja acabaría en la carpeta cuyo propio léeme promete que nada de ahí
     * revela el caso.
     */
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: false,
    copies: 'una',
    sides: 'una',
  },
];

/**
 * Las reglas que lee quien juega.
 *
 * Están escritas para leerse UNA VEZ, de pie, con el móvil en la mano y con
 * ruido alrededor. Por eso van en el orden en que hacen falta —primero qué se
 * gana, luego qué se hace cada hora, y el consejo al final— y no en el orden en
 * que se programaron.
 *
 * Las tres que más se releen durante la noche son la de la contraseña, la del
 * rastro y la de las prendas: son las que la gente pregunta en voz alta.
 */
export const REGLAS_SOMBRAS: ReglaDeJuego[] = [
  {
    titulo: 'El objetivo',
    texto:
      'Es la noche del 21 de junio de 1582. Akechi ha matado a Nobunaga en Kioto y el señor está atrapado en Sakai con un puñado de acompañantes. Hay que cruzar Iga antes del alba y llegar a la playa de Shirako, donde espera una barca. Si el señor embarca, gana la columna entera.',
  },
  {
    titulo: 'Uno de vosotros cobra de Akechi',
    texto:
      'Una de las personas de la mesa es un kanchō: un infiltrado. No quiere que el señor llegue. Nadie sabe quién es, y esa persona cruza con vosotros toda la noche como una más.',
  },
  {
    titulo: 'La senda son cuatro pasos, en orden',
    texto:
      'De todos los pasos que hay, solo cuatro forman el camino a Shirako, y hay que andarlos en un orden exacto. Los demás no llevan a ninguna parte. Nadie conoce la senda entera: hay que juntar lo que cada cual va encontrando.',
  },
  {
    titulo: 'Hay que ir hasta el paso, de verdad',
    texto:
      'Cada hora eliges un paso, VAS ANDANDO HASTA ÉL y lees en voz baja la palabra que hay escrita en la puerta. La tecleas en la app, y solo entonces te dice lo que dice el mojón de ese paso esta noche. Si te equivocas de palabra no pasa nada: no gastas la hora, vuelves a mirar.',
  },
  {
    titulo: 'Los cazadores y el rastro',
    texto:
      'Cada hora hay un paso batido por los ochimusha-gari, los campesinos que cazan samuráis en fuga. No se anuncia cuál. Quien entra ahí los ve, y el RASTRO de la columna sube uno. El rastro es público, no baja solo, y si llega a su tope la columna está interceptada: por bien que se ande la senda, no se embarca.',
  },
  {
    titulo: 'Se sabe después',
    texto:
      'Al cerrarse cada hora se revela qué paso estaba batido. Ahí es donde se comprueba quién decía la verdad, así que ten cuidado con lo que afirmas: esta noche todo lo que digas se puede contrastar una hora más tarde.',
  },
  {
    titulo: 'Tu disfraz',
    texto:
      'Llevas uno de los siete disfraces del shinobi y puedes usarlo una vez por hora. Lo que hagas con él es cosa tuya: contarlo, callártelo o mentir sobre lo que has visto.',
  },
  {
    titulo: 'La carga',
    texto:
      'La columna lleva enseres, y tres de ellos pesan en las reglas: el farol te dice qué paso está batido, la plata de Chaya baja el rastro y la lanza de Hanzō te libra de los cazadores. Quién lleva qué es público, y se pasa de mano dándolo de verdad.',
  },
  {
    titulo: 'Las prendas',
    texto:
      'Empiezas con dos prendas de confianza y solo puedes darlas A OTRA PERSONA, nunca a ti. Nadie puede tener más de dos recibidas. En el consejo del alba tu voto pesa uno más por cada prenda que te hayan dado: quien tiene la palabra de la mesa decide el camino.',
  },
  {
    titulo: 'Lo que se debe por una prenda',
    texto:
      'Quien recibe una prenda contrae una obligación de mesa: responder con la verdad a UNA pregunta directa, en voz alta y delante de todos. No lo comprueba la app; lo comprueba la gente, y es lo que hace que la prenda valga algo.',
  },
  {
    titulo: 'El consejo del alba',
    texto:
      'Cuando quien dirige lo decide, cada cual propone su senda de cuatro pasos y señala a quien cree que es el kanchō. Se anda la senda MÁS APOYADA, no la tuya: convencer a la mesa importa tanto como acertar.',
  },
  {
    titulo: 'Señalar al kanchō',
    texto:
      'Se señala una sola vez y para toda la partida, y no se puede cambiar. Si la mayoría acierta, al kanchō se le retiran las prendas y su voto no cuenta: desenmascararlo no es solo un trofeo, es quitarle la mano del timón. No se te dirá si acertaste hasta el desenlace.',
  },
  {
    titulo: 'La regla de oro',
    texto:
      'Todo lo de esta noche es ficción. Interpreta con generosidad y deja brillar a los demás. Y si te toca ser el kanchō: pierde con elegancia o gana sin restregarlo.',
  },
];

/**
 * Lo que la trama de las Sombras cita de la partida.
 *
 * Mismo motivo que en la Momia: sin esto, borrar un paso o un estandarte
 * después de generar no lo veía nadie, y la senda verdadera es el juego entero.
 *
 * Las condiciones no se enumeran: solo citan pasos, y todos entran ya por
 * `sendaVerdadera`.
 */
function citasDeLasSombras(delJuego: unknown): ReferenciaDeTrama[] {
  const t = delJuego as Partial<TramaSombras> | undefined;
  if (!t) return [];
  const citas: ReferenciaDeTrama[] = [];

  for (const [i, id] of (t.sendaVerdadera ?? []).entries()) {
    citas.push({ categoria: 'pasos', id, donde: `el tramo ${i + 1} de la senda` });
  }
  for (const [i, id] of (t.batidos ?? []).entries()) {
    citas.push({ categoria: 'pasos', id, donde: `el paso batido en la hora ${i + 1}` });
  }
  for (const h of t.hallazgos ?? []) {
    citas.push({ categoria: 'pasos', id: h.pasoId, donde: 'el paso donde aparece un hito' });
  }
  for (const id of Object.keys(t.contrasenas ?? {})) {
    citas.push({ categoria: 'pasos', id, donde: 'el paso que tiene contraseña en su puerta' });
  }
  for (const id of Object.keys(t.papeles ?? {})) {
    citas.push({ categoria: 'escoltas', id, donde: 'quien tiene papel en la columna' });
  }
  for (const [escolta, estandarte] of Object.entries(t.estandartes ?? {})) {
    citas.push({ categoria: 'escoltas', id: escolta, donde: 'quien lleva estandarte' });
    citas.push({ categoria: 'estandartes', id: estandarte, donde: 'el estandarte que lleva alguien' });
  }
  for (const id of Object.keys(t.portes ?? {})) {
    citas.push({ categoria: 'enseres', id, donde: 'el enser que tiene porte' });
  }
  for (const [enser, quien] of Object.entries(t.cargaInicial ?? {})) {
    citas.push({ categoria: 'enseres', id: enser, donde: 'el enser que alguien carga al empezar' });
    citas.push({ categoria: 'escoltas', id: quien, donde: 'quien carga un enser al empezar' });
  }
  if (t.enserComprometido) {
    citas.push({ categoria: 'enseres', id: t.enserComprometido, donde: 'el enser prometido al kanchō' });
  }
  return citas;
}

export const SOMBRAS: ManifiestoDeJuego = {
  id: 'sombras',
  nombre: 'El Paso de las Sombras',
  lema: 'Honnō-ji arde. Antes del alba hay que cruzar Iga, y uno de los que guían cobra de Akechi.',

  categorias: [
    {
      id: 'escoltas',
      singular: 'escolta',
      plural: 'escoltas',
      minimo: 4,
      sonJugadores: true,
      admiteFoto: true,
      admiteEmail: true,
      /*
       * En `suspects`, y no por comodidad: de ese campo cuelgan el emparejamiento
       * de los móviles, el reparto de dosieres y los correos. Una categoría de
       * personas que viviera en otro sitio se quedaría sin nada de eso.
       */
      almacenHeredado: 'suspects',
      presentacion: {
        titulo: 'La columna',
        descripcion:
          'Las personas de carne y hueso que van a cruzar. A cada una le tocará un papel, un disfraz y un estandarte: cuanto mejor las describas, mejor le encajará el suyo.',
        forma: 'circle',
        vacio: {
          // Un rombo hueco: el hueco de la columna que todavía no ha salido.
          glifo: '◇',
          titulo: 'Todavía no hay columna',
          texto: 'Añade al menos cuatro personas. El Guía le escribirá a cada una un papel y le repartirá un disfraz.',
        },
        ejemploNombre: 'Marta',
        ejemploDescripcion:
          'Discute por deporte y nunca se calla lo que piensa. Le pega un papel donde tenga que convencer a la mesa de algo.',
        pista: 'El disfraz que le toque depende de lo que cuentes aquí: quien no se calla acaba de comerciante.',
      },
    },
    {
      id: 'pasos',
      singular: 'paso',
      plural: 'pasos',
      /*
       * SEIS, y no cinco como las cámaras de la Momia. La senda son cuatro: con
       * cinco pasos sobraría uno solo y averiguar CUÁLES dejaría de ser un
       * problema. Con seis hay dos falsos; con ocho o diez el rompecabezas gana
       * sin que la casa se haga inmanejable.
       */
      minimo: 6,
      sonLugares: true,
      admiteFoto: true,
      // En `rooms` porque de ahí cuelgan el plano y las chinchetas.
      almacenHeredado: 'rooms',
      presentacion: {
        titulo: 'Los pasos del camino',
        descripcion:
          'Las estancias reales de tu casa, convertidas en tramos del camino de Iga. Cada hora una de ellas está batida por los cazadores, y solo cuatro forman la senda que llega a la playa.',
        forma: 'square',
        vacio: {
          glifo: '⌂',
          titulo: 'El camino está sin trazar',
          texto: 'Añade al menos seis estancias. Con los nombres de tu casa de verdad, el camino se traza solo.',
        },
        sugerencias: [
          'El Vado del Kizu',
          'El Collado de Kabuto',
          'El Bosque de Tsuge',
          'El Puerto de Otogi',
          'La Cuesta de Kashiwabara',
          'La Playa de Shirako',
        ],
        ejemploNombre: 'El pasillo largo',
        ejemploDescripcion: 'El que va del salón a los dormitorios, con la lámpara que parpadea.',
        pista: 'Que se reconozca tu casa es lo que hace que salir al pasillo dé un poco de miedo de verdad.',
      },
    },
    {
      id: 'enseres',
      singular: 'enser',
      plural: 'enseres',
      minimo: 3,
      admiteFoto: true,
      // El tercer campo heredado. No le pega el nombre, pero es donde cabe.
      almacenHeredado: 'weapons',
      presentacion: {
        titulo: 'La carga de la columna',
        descripcion:
          'Lo que se lleva encima esta noche. Tres de ellos pesarán en las reglas —el farol, la plata y la lanza— y quién los lleva es público: pasarlos de mano es media negociación de la velada.',
        forma: 'square',
        vacio: {
          glifo: '◫',
          titulo: 'La columna va sin nada',
          texto: 'Añade al menos tres objetos. Cosas de tu casa valen: una linterna, una caja, un paraguas largo.',
        },
        sugerencias: [
          'El farol de papel',
          'La plata de Chaya',
          'La lanza de Hanzō',
          'El cofre lacado de los sellos',
          'La carta lacada de Akechi',
        ],
        ejemploNombre: 'El farol de papel',
        ejemploDescripcion: 'Alumbra tres pasos por delante y se ve desde media legua. Alguien tiene que llevarlo.',
        pista: 'Si es un objeto que existe en tu casa, esta noche se pasará de mano en mano de verdad.',
      },
    },
    {
      id: 'estandartes',
      singular: 'estandarte',
      plural: 'estandartes',
      minimo: 4,
      /*
       * SIN `almacen`, como los ritos de la Momia: es la categoría que comprueba
       * que el almacén genérico funciona. Y a diferencia de aquellos, NO entra en
       * la lógica del rompecabezas: es identidad y ambientación. Esa diferencia
       * es deliberada — hacía falta comprobar que un juego puede tener una
       * categoría propia sin que sea la que carga con todo.
       */
      presentacion: {
        titulo: 'Los estandartes',
        descripcion:
          'Los blasones de las casas que cruzan esta noche. Se reparten entre la columna y son públicos: es como se llaman unos a otros cuando no se ven las caras.',
        forma: 'square',
        vacio: {
          glifo: '❂',
          titulo: 'Nadie lleva blasón',
          texto: 'Hacen falta al menos cuatro. Pídeselos al Guía si no se te ocurren.',
        },
        sugerencias: [
          'Las tres malvarrosas de Tokugawa',
          'El carro de los Hattori',
          'La tela del mercader Chaya',
          'El pino de los Tarao',
          'La grulla de los Anayama',
        ],
        ejemploNombre: 'Las tres malvarrosas',
        ejemploDescripcion: 'Tres hojas en un círculo. Es el blasón del señor, y llevarlo esta noche es una carga.',
        pista: 'No deciden nada de las reglas: deciden cómo se llama la gente a gritos en un pasillo a oscuras.',
      },
    },
  ],

  /*
   * UN SOLO EJE, y por precisión, igual que en la Momia.
   *
   * Lo que hay que averiguar son dos cosas de naturaleza distinta. Quién cobra
   * de Akechi es una respuesta de eje —una entidad, se acierta o no— y usa la
   * maquinaria de acusación que ya existe: una por persona, para toda la
   * partida, sin decir si acertaste. La senda no lo es.
   *
   * Que la categoría sea la de jugadores no es casualidad: de ahí sale gratis
   * `ejeDeJugadores`, y con él la regla de que quien es señalado no gana
   * delatándose a sí mismo.
   */
  ejes: [
    { id: 'kancho', pregunta: '¿Quién cobra de Akechi?', rotulo: 'Quién', categoria: 'escoltas' },
  ],

  // Todos se mueven a la vez y la hora la cierra quien dirige.
  turnos: 'simultaneo',

  acciones: [
    {
      id: 'avanzar',
      rotulo: 'Reconocer un paso',
      fases: ['ronda-abierta'],
      eligeDe: [{ campo: 'paso', categoria: 'pasos', rotulo: '¿A qué paso vas?' }],
      /*
       * LA CONTRASEÑA, y va en `eligeLibre` porque no es una entidad de nadie:
       * es la palabra escrita en un cartel de papel pegado a una puerta. El
       * motor la pasa TAL CUAL y NO la valida —ese es el trato de `eligeLibre`—
       * y la valida el reductor, que es quien conoce la contraseña de cada paso.
       *
       * Es la mecánica que separa este juego de los otros dos: sin ella, la app
       * se fía de que estuviste donde dices. Y una contraseña equivocada NO
       * gasta la hora, porque el motor apunta la acción DESPUÉS de que el
       * reductor devuelva: basta con lanzar. Sin esa propiedad, esto sería un
       * castigo por tener mala vista.
       */
      eligeLibre: [{ campo: 'contrasena', rotulo: 'La palabra escrita en la puerta' }],
      /*
       * UNA, no dos como en CLUEDO. Allí se puede rectificar porque entrar en
       * una sala no cuesta nada; aquí entrar puede costarle a la columna entera,
       * y poder deshacerlo convertiría la decisión —el corazón del juego— en un
       * trámite.
       */
      vecesPorTurno: 1,
    },
    {
      id: 'avalar',
      rotulo: 'Dar una prenda',
      /*
       * También con la hora cerrada, y eso importa: la puesta en común es cuando
       * se ve quién ha dicho la verdad, y es el momento en que dar tu palabra
       * significa algo. Limitarlo a la hora abierta habría dejado la negociación
       * sin su momento natural.
       */
      fases: ['ronda-abierta', 'ronda-cerrada', 'acusaciones'],
      eligeDe: [{ campo: 'aQuien', categoria: 'escoltas', rotulo: '¿A quién se la das?' }],
    },
    {
      id: 'entregar',
      rotulo: 'Pasar un enser',
      fases: ['ronda-abierta', 'ronda-cerrada', 'acusaciones'],
      eligeDe: [
        { campo: 'enser', categoria: 'enseres', rotulo: '¿Qué le pasas?' },
        { campo: 'aQuien', categoria: 'escoltas', rotulo: '¿A quién?' },
      ],
    },
    {
      id: 'invocar',
      rotulo: 'Usar tu disfraz',
      fases: ['ronda-abierta'],
      /*
       * DOS CATEGORÍAS, y opcionales las dos: el komusō ampara a una PERSONA y
       * nadie más elige un paso, pero el hōkashi puede querer mirar uno concreto.
       * Cuál hace falta depende del papel, y el papel es secreto, así que el
       * motor no puede saberlo de antemano: valida lo que venga contra su
       * categoría y deja que el reductor —que sí sabe el papel— decida cuál mira
       * y si era obligatoria.
       */
      eligeOpcional: [
        { campo: 'aQuien', categoria: 'escoltas', rotulo: '¿Sobre quién?' },
        { campo: 'paso', categoria: 'pasos', rotulo: '¿Sobre qué paso?' },
      ],
      /*
       * LOS DOS QUE NO SON ENTIDADES DE NADIE, y sin ellos este juego pierde su
       * mecánica central. `papel` es CUÁL de los tuyos usas: solo el kanchō tiene
       * dos —el suyo aparente y `falsear`— y elegir es exactamente la jugada del
       * traidor. `hito` es CUÁL de los tuyos publica o intercambia. Ninguno está
       * en una categoría, porque los dos dependen de lo que tú sabes y nadie más.
       */
      eligeLibre: [
        { campo: 'papel', rotulo: '¿Cuál de tus disfraces?' },
        { campo: 'hito', rotulo: '¿Cuál?' },
      ],
      vecesPorTurno: 1,
    },
    {
      id: 'proponer-senda',
      rotulo: 'Proponer la senda',
      fases: ['ronda-abierta', 'ronda-cerrada', 'acusaciones'],
      /*
       * CUATRO PASOS, EN ORDEN. `ordenada` es lo que separa esto de «elige
       * cuatro»: aquí la posición ES la respuesta. Y `cuantas: 4` no es
       * decorativo — una propuesta incompleta no se puede andar, y es mejor
       * rechazarla en el motor que descubrirlo en el consejo.
       */
      eligeVarias: [
        { campo: 'senda', categoria: 'pasos', rotulo: 'La senda hasta la playa', cuantas: 4, ordenada: true },
      ],
      vecesPorTurno: 1,
    },
    {
      id: 'senalar',
      rotulo: 'Señalar al kanchō',
      fases: ['ronda-abierta', 'ronda-cerrada', 'acusaciones'],
      eligeDe: [{ campo: 'kancho', categoria: 'escoltas', rotulo: '¿Quién cobra de Akechi?' }],
      vecesPorTurno: 1,
    },
  ],

  /*
   * Seis pestañas, como los otros dos, porque seis es lo que entra con la
   * muesca en medio. Pero no las mismas: no hay tablón ni cuaderno. Lo que en
   * CLUEDO se apunta en el cuaderno, aquí es la senda, y tiene pantalla propia
   * porque no es texto libre: son piezas de un rompecabezas que se combinan.
   */
  barra: [
    { pantalla: 'ronda', rotulo: 'Hora', icono: 'reloj' },
    { pantalla: 'personaje', rotulo: 'Tú', icono: 'mascara' },
    { pantalla: 'mapa', rotulo: 'Pasos', icono: 'plano' },
    { pantalla: 'camino', rotulo: 'Senda', icono: 'torii' },
    { pantalla: 'consejo', rotulo: 'Consejo', icono: 'abanico' },
    { pantalla: 'perfil', rotulo: 'Perfil', icono: 'copa' },
  ],

  /**
   * EL DOSIER DE LA COLUMNA.
   *
   * Como el de la Momia y por lo mismo: la barra de este juego es `camino` y
   * `consejo`, no `tablon` ni `cuaderno`, así que lo que en CLUEDO se mudó a
   * otras pestañas aquí no tiene adónde ir.
   *
   * El DISFRAZ va arriba —es lo que puedes hacer tú y nadie más— y lleva dentro
   * el estandarte, que es público y sirve para llamarse a gritos por un sendero
   * a oscuras.
   */
  dosier: [
    'identidad',
    'senalado',
    'disfraz',
    'persona-publica',
    'secreto',
    'motivo',
    'coartada',
    'cronologia-propia',
    'gancho',
    'conocimiento',
    'giros',
    'caso',
    'reglas',
    'cosas',
    'mesa',
  ],

  asistente: {
    nombre: 'El Guía',
    descripcion: 'Tu guía del camino con IA',
    /*
     * El farol. Es el único icono de asistente que ya existía sin dueño —lo
     * dibujó la Momia y no lo usó nadie— y resulta ser exactamente lo que lleva
     * en la mano quien guía una columna de noche. No hace falta inventar otro.
     */
    icono: 'farol',
    /*
     * NO ES UN MAYORDOMO NI UN ESCRIBA. Es un hombre de Iga que conoce los
     * montes y al que le han pagado por sacar viva a una columna del bando que
     * arrasó su provincia el año pasado. Habla poco, frases cortas, y trata de
     * tú porque en un camino de noche nadie hace ceremonias.
     */
    voz:
      'Eres El Guía: un hombre de Iga que conoce estos montes de noche y al que han pagado por\n' +
      'sacar viva a esta columna. Hablas SIEMPRE en español, en frases cortas y sin adornos, como\n' +
      'quien habla bajo para que no le oigan. Tratas de tú. No haces ceremonias: se anda o no se anda.',
    saludo:
      'Tú dirás, y baja la voz. Te aviso de entrada: no sé quién cobra de Akechi, ni cuál es la ' +
      'senda buena, ni dónde estarán mañana los cazadores. Sé las reglas del camino y sé tu papel. ' +
      'Para eso pregúntame.',
    seNiega: 'yo conozco los montes, no las intenciones de quien anda por ellos',
    sinIa: {
      reglas:
        'Cada hora eliges un paso, vas hasta él, lees la palabra de la puerta y la tecleas: entonces ' +
        'sabes lo que dice su mojón. Uno de los pasos está batido por los cazadores y no se anuncia ' +
        'cuál; quien entra ahí sube el rastro de todos. Al alba se propone la senda de cuatro pasos ' +
        'y se anda la más apoyada.',
      personaje:
        'Lo que callas, lo sabes tú mejor que yo. Y tu disfraz se usa una vez por hora: dilo en voz ' +
        'alta cuando lo uses, aunque no digas qué has visto.',
      solucion:
        'Yo conozco los montes, no las intenciones de quien anda por ellos. Quién cobra de Akechi lo ' +
        'tendrá que sacar la mesa, y se sabrá cuando amanezca.',
      general:
        'Sin línea con el campamento, mi consejo es el de siempre: pon un hito sobre la mesa y mira ' +
        'quién se apresura a explicarlo.',
    },
  },

  /*
   * En medio de un mapa de puertos de montaña no hay escaleras ni un pozo
   * funerario: hay monte, que es lo que separa un paso del siguiente y lo que
   * hay que rodear.
   */
  rotuloCentralDelPlano: 'EL MONTE',

  reglas: REGLAS_SOMBRAS,
  referenciasDeLaTrama: citasDeLasSombras,

  ronda: {
    accionSobre: 'pasos',
    /*
     * CERO rectificaciones, por lo mismo que en `avanzar`: si entrar puede
     * costarle el rastro a la columna entera, poder deshacerlo vacía la
     * decisión. La regla la hace cumplir `vecesPorTurno: 1`, que el motor sí
     * comprueba; este campo sigue sin leerlo nadie y está anotado en el diseño.
     */
    cambiosPermitidos: 0,
  },

  fases: {
    lobby: ['ronda-abierta'],
    'ronda-abierta': ['ronda-cerrada'],
    /*
     * Tres salidas desde la hora cerrada, y la tercera es la lección que costó
     * cara en CLUEDO: al retirar una fase intermedia, el desenlace se quedó sin
     * puerta y la partida no se podía terminar. Aquí `desenlace` está desde el
     * principio, para que quien dirige pueda cerrar la noche aunque no se llegue
     * al consejo.
     */
    'ronda-cerrada': ['ronda-abierta', 'acusaciones', 'desenlace'],
    /*
     * EL CONSEJO DEL ALBA ES `acusaciones`, y no una fase nueva. Del consejo se
     * puede volver a andar: si la mesa se atasca, otra hora. Ver el porqué de no
     * usar `sellado` en la cabecera y en el §6.1 del diseño.
     */
    /*
     * OJO: `acusaciones` aqui es el NOMBRE DE UNA FASE de este juego, no la
     * clave del aviso. Va guardado en cada sesion, asi que renombrarlo dejaria
     * a las partidas en curso en una fase que el grafo no conoce. Lo comprobo
     * un renombrado automatico que se lo llevo por delante y una velada entera
     * que dejo de poder llegar al desenlace.
     */
    acusaciones: ['ronda-abierta', 'desenlace'],
    /* Este juego no las usa: se cruza Iga en una noche y se acaba. */
    sellado: [],
    intermedio: [],
    desenlace: [],
  },

  /*
   * QUE SIGNIFICA CADA UNA DE MIS FASES.
   *
   * El nucleo le hacia cinco preguntas a la fase comparando con NOMBRES:
   * `fase === 'lobby'`, `phase === 'desenlace'`, `phase === 'ronda-abierta'`.
   * Con los nombres abiertos eso deja de significar nada, asi que se declara.
   *
   * Los tres juegos de hoy dicen lo mismo, y no es duplicacion que haya que
   * factorizar: es que los tres nacieron del mismo molde. El dia que uno tenga
   * dos fases abiertas o ninguna sala de espera, su tabla dejara de parecerse a
   * las otras y estara bien.
   */
  papelDeFase: {
    'lobby': 'espera',
    'ronda-abierta': 'turno',
    'ronda-cerrada': 'entreacto',
    'acusaciones': 'decision',
    'desenlace': 'fin',
  },

  trofeos: TROFEOS_SOMBRAS,
  seccionesDeDosier: SECCIONES_SOMBRAS,

  preparacion: {
    anfitrion: [
      'Imprime el paquete. Los hitos del camino, a UNA CARA: a doble cara se leen al trasluz y se acaba el juego.',
      'Recorta las tiras de los hitos y agrúpalas por PASO y por HORA. Cada montón va en la habitación que le toca.',
      'Cuelga un cartel en cada paso. Lleva la CONTRASEÑA: es lo que hay que ir a leer, así que tiene que verse sin encender la luz grande.',
      'Reparte los dosieres cerrados. Cada uno lleva su disfraz y su secreto; nadie abre el de otro.',
      'Deja los enseres sobre la mesa y reparte dos prendas por persona. La hoja del consejo, sin repartir todavía.',
      'Guarda la senda verdadera donde nadie la vea: lleva los cuatro pasos en orden y el nombre de quien cobra de Akechi.',
    ],
    aCiegas: [
      'Busca a alguien que no vaya a jugar, o que acepte jugar sabiéndolo todo. Esa persona prepara el material.',
      'Quien prepara imprime todo —los hitos a UNA CARA—, recorta las tiras y las agrupa por paso y por hora.',
      'Quien dirige recibe solo su guía, los carteles de los pasos y la tabla del rastro. Nada más.',
      'Quien prepara reparte los dosieres cerrados y deja en cada habitación los hitos de la hora antes de abrirla.',
      'Quien prepara le dice a quien dirige, al cerrar cada hora, qué paso estaba batido. Al cerrarla, no antes.',
      'La senda verdadera se queda con quien prepara hasta el alba.',
    ],
  },

  /* Los rótulos de los telones. Aquí la noche se cuenta por HORAS. */
  rotulosDeAviso: {
    'ronda-abierta': 'Comienza la hora',
    'ronda-cerrada': 'Se cierra la hora',
    respuestas: 'El consejo del alba',
    desenlace: 'Amanece',
    ganador: 'El consejo ha hablado',
  },

  avisos: {
    rondaAbierta: 'Hora {ronda} de {total}. Elige un paso, ve hasta él y lee lo que hay escrito en la puerta.',
    /*
     * Aquí sí se publica algo, y es la mitad del juego: al cerrar se revela por
     * dónde andaban los cazadores, y con eso se comprueba quién decía la verdad.
     */
    rondaCerrada: 'Hora cerrada. Ya se sabe por dónde andaban los cazadores.',
    respuestas: 'El consejo del alba. Cuatro pasos en orden, y un nombre. Se anda la senda más apoyada.',
    desenlace: 'Se abre el pliego de Hanzō.',
  },

  ceremonia: {
    generar: [
      'Se cuenta lo que ha pasado en Kioto…',
      'Cuatro pasos de todos los que hay buscan su orden…',
      'Se reparten los siete disfraces sin que nadie mire…',
      'Se escribe lo que dice cada mojón del camino…',
      'Alguien apunta una mentira entre las verdaderas…',
      'Los cazadores eligen dónde esperar cada hora…',
      'Se lacra el pliego que nadie debe leer…',
    ],
    actualizar: [
      'El Guía repasa la lista de la columna…',
      'A los recién llegados se les busca un disfraz…',
      'Se corrigen los papeles que ya no encajan…',
      'Se reimprimen los dosieres afectados…',
    ],
  },

  documentos: IMPRIMIBLES_SOMBRAS,
  dosieresPropios: true,
};
