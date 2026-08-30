/**
 * El Nudo de Valdehierro, dicho como datos.
 *
 * ═══ EL ENCARGO DE ESTE JUEGO ═══
 *
 * Es el CUARTO, y su encargo es distinto del que tuvieron los tres anteriores.
 * CLUEDO fue el juego para el que se escribió la plataforma. El Misterio de la
 * Momia demostró que aguantaba uno que no cabía en ella. El Paso de las Sombras
 * demostró que, hecho aquel trabajo, un juego nuevo ya no obligaba a ampliarla.
 *
 * Pero los tres son el mismo juego visto de tres maneras: rondas simultáneas,
 * una persona de la mesa es la respuesta, y al final se señala a alguien. Todo
 * lo que la plataforma no había tenido que hacer nunca seguía sin probarse.
 *
 * Este juego se escribe para probarlo, y por eso rompe cinco cosas a la vez:
 *
 *   · NADIE ES EL MALO. No hay traidor, no hay culpable y ningún eje señala a
 *     una persona de la mesa. `ejeDeJugadores` devuelve `undefined` y
 *     `soyElSenalado` es falso para todo el mundo, toda la noche.
 *   · LA RESPUESTA SON SEIS EJES, no uno ni tres, y la categoría de los seis es
 *     la misma. La hoja de respuesta genérica del móvil tiene que pintar seis
 *     selectores sin que nadie la toque.
 *   · SE GANA O SE PIERDE EN GRUPO. No hay carrera por acertar primero: el
 *     veredicto lo decide el estado de la estación al amanecer.
 *   · SE JUEGA CONTRA UN PRESUPUESTO, no contra una persona. El retraso es el
 *     antagonista, y se administra: hay una moneda que se gana trabajando y se
 *     gasta en información.
 *   · HAY MINIJUEGOS DENTRO DE LA APP, y son los primeros: cuatro instrumentos
 *     de estación que el SERVIDOR plantea y comprueba. Ninguno es un adorno —de
 *     ellos sale lo que se gasta en despachar— y ninguno es de confianza: la
 *     app no puntúa, manda la respuesta y el servidor la corrige.
 *
 * ═══ LO QUE NO SE ROMPE, Y POR QUÉ ═══
 *
 * NO SE INVENTAN NOMBRES DE FASE. El contrato dice que son libres —`LivePhase`
 * es `string` y `fases` es un `Record` parcial— y es verdad a medias: quedan
 * ocho sitios en la plataforma que todavía comparan por nombre (la proyección,
 * el panel de partidas, las invitaciones y los dos botones del taller), y el
 * comprobador `verificar-juegos` exige que toda fase alcanzable tenga una ruta
 * POST que la abra, que hoy solo existe para los nombres de CLUEDO. Un juego
 * que se los inventara se estrenaría sin poder abrir una ronda. Está anotado en
 * el §11 del diseño, que es donde va lo que se ha encontrado y no se ha
 * arreglado aquí.
 *
 * El diseño completo, con las reglas, las cuentas del rompecabezas y el porqué
 * de cada número, está en `docs/nudo/DISENO.md`.
 */
import type { TrofeoInfo } from '../live';
import type { DocumentSectionInfo } from '../types';
import type { PrintableDocInfo } from '../documents';
import type { ManifiestoDeJuego, ReferenciaDeTrama, ReglaDeJuego } from './tipos';
import { FRANJAS_DE_LA_NOCHE, HORAS_DE_FRANJA } from './nudo-tipos';
import type { TramaNudo } from './nudo-tipos';

/**
 * Los trofeos de El Nudo de Valdehierro.
 *
 * LOS IDS SON LARGOS Y PROPIOS, por la misma razón que los de El Paso de las
 * Sombras: los ids de trofeo no llevan prefijo de juego, así que dos juegos
 * pueden usar el mismo sin que nada avise y entonces el trofeo de uno sale en
 * la vitrina con el nombre y el glifo del otro. `sombra` ya está cogido dos
 * veces; ninguno de estos cinco lo puede repetir nadie por accidente.
 *
 * LOS GLIFOS SON DEL PLANO BÁSICO. Es la lección que pagó la Momia: cualquier
 * carácter fuera del plano básico se ve en Windows y sale como un cuadradito en
 * el móvil, que es el único sitio donde se mira la vitrina. Y ninguno repite
 * silueta con los de los otros tres: a 30 px y en fila de tres, la silueta es
 * lo único que los distingue.
 */
export const TROFEOS_NUDO: TrofeoInfo[] = [
  {
    id: 'paso-a-nivel',
    nombre: 'El Correo pasó',
    descripcion: 'El Correo de Medianoche cruzó Valdehierro contigo en el turno.',
    /* Una locomotora no cabe en el plano básico. Un aspa de paso a nivel, sí. */
    glifo: '✕',
  },
  {
    id: 'noche-sin-retraso',
    nombre: 'Noche limpia',
    descripcion: 'Los seis convoyes salieron y la noche se cerró sin un minuto de retraso.',
    /* Un reloj sin manecillas: la hora exacta. Hueco, para no chocar con «Ojo de Horus». */
    glifo: '○',
  },
  {
    id: 'cuadro-de-memoria',
    nombre: 'El cuadro de memoria',
    descripcion: 'Entregaste el cuadro de marchas entero y no fallaste ni una franja.',
    /* Una rejilla: el cuadro de marchas es una cuadrícula y nada más. */
    glifo: '▦',
  },
  {
    id: 'mano-en-la-palanca',
    nombre: 'Mano en la palanca',
    descripcion: 'Resolviste cinco instrumentos o más en una sola noche.',
    /* Una palanca bajada. Barra y no rombo: no la usa nadie. */
    glifo: '⌐',
  },
  {
    id: 'sin-consultar-archivo',
    nombre: 'De cabeza',
    descripcion: 'Sacaste la noche adelante sin preguntarle nada al archivo.',
    /* Un triángulo hueco: la señal de «vía libre» de un semáforo de brazo. */
    glifo: '△',
  },
];

/**
 * Las secciones del dosier de cada ferroviario.
 *
 * Se parecen a las de los otros dos juegos en la mitad de arriba —dar a alguien
 * lo justo para interpretar un papel— y se separan del todo en la de abajo: aquí
 * lo que se reparte no son secretos sobre los demás, sino TRABAJO. Un oficio, un
 * puesto, una maña y unas tiras de telegrama que hay que leer en voz alta.
 */
export const SECCIONES_NUDO: DocumentSectionInfo[] = [
  { id: 'cover', label: 'Portada', description: 'La noche, la estación y de quién es el dosier.', required: true },
  { id: 'character', label: 'Tu ficha', description: 'Tu papel en el turno de noche, tu cara pública y lo que te trae aquí.', required: true },
  { id: 'oficio', label: 'Tu oficio', description: 'Qué instrumento manejas y qué puedes hacer una vez en toda la noche.', required: true },
  { id: 'telegramas', label: 'Tus telegramas', description: 'Las tiras que salvaste del fuego. Sin ellas no hay cuadro.', required: true },
  { id: 'secret', label: 'Tu secreto', description: 'Lo que no cuentas del turno de esta noche. Nadie más lo lee.' },
  { id: 'case', label: 'La noche', description: 'Qué ha pasado en Valdehierro y por qué no puede esperar a mañana.' },
  { id: 'rules', label: 'Cómo se juega', description: 'La franja, las conformidades, el margen y el retraso.' },
  { id: 'convoyes', label: 'Los convoyes', description: 'Los seis que tienen que cruzar y lo que lleva cada uno.' },
  { id: 'cuadro', label: 'El cuadro en blanco', description: 'La cuadrícula de seis por seis donde se va tachando.' },
  { id: 'turno', label: 'El turno', description: 'Quién está de servicio esta noche y en qué oficio.' },
  { id: 'board', label: 'El plano', description: 'La planta de la estación con los puestos.' },
];

/**
 * Los imprimibles de El Nudo de Valdehierro.
 *
 * ═══ SE PUEDE JUGAR SIN MÓVILES, Y AQUÍ ESO CUESTA MÁS QUE EN LOS OTROS ═══
 *
 * Lo que se pierde sin app son los cuatro instrumentos, que son minijuegos de
 * pantalla y no tienen versión de papel honesta. La noche se juega igual —el
 * cuadro, las órdenes, el retraso— pero las conformidades pasan a darse por
 * franja en vez de ganarse, y quien dirige arbitra las órdenes con la hoja del
 * cuadro verdadero en la mano. Está escrito en la guía y en el §9 del diseño;
 * no se disimula, porque un paquete que promete lo que no da es peor que uno
 * que avisa.
 *
 * `indice-paquete` se reutiliza el de la casa, igual que hacen la Momia y las
 * Sombras: esa hoja se compone entera desde el catálogo del juego y desde
 * `preparacion`, así que escribir una propia sería un id más para decir lo
 * mismo.
 */
export const IMPRIMIBLES_NUDO: PrintableDocInfo[] = [
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
    id: 'guia-de-la-noche',
    name: 'Guía de la noche',
    summary:
      'El documento que llevas encima toda la velada: cómo se abre cada franja, cómo se arbitra una orden, qué cuesta cada cosa y cómo se da el parte del amanecer.',
    audience: 'gm',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'doble',
  },
  {
    id: 'dosier-ferroviario',
    name: 'Dosieres del turno',
    summary:
      'Uno por persona: su ficha, su oficio, su maña y SUS TELEGRAMAS. Se reparten en sobres cerrados y no se abren los ajenos.',
    audience: 'players',
    modes: ['host', 'blind'],
    defaultOn: true,
    porPersona: true,
    copies: 'una-por-jugador',
    sides: 'doble',
  },
  {
    id: 'tiras-telegrama',
    name: 'Las tiras del telégrafo',
    summary:
      'Los telegramas recortables, uno por tira y agrupados por persona. Se recortan y se meten en el sobre de cada cual: leerlos en papel y en voz alta es la mitad del juego.',
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'cuadro-en-blanco',
    name: 'El cuadro de marchas en blanco',
    summary:
      'La cuadrícula grande de seis convoyes por seis franjas, para tacharla a lápiz encima de la mesa. Una por persona, y una más grande para el centro.',
    audience: 'players',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una-por-jugador',
    sides: 'una',
  },
  {
    id: 'hojas-de-porte',
    name: 'Las hojas de porte',
    summary:
      'Una por convoy: cómo se llama, qué lleva y qué manías tiene. Se dejan en el centro de la mesa boca arriba desde el principio.',
    audience: 'players',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'rotulos-de-puesto',
    necesitaLugares: true,
    name: 'Rótulos de los puestos',
    summary:
      'Un cartel por habitación con el nombre del puesto y el oficio que se ejerce ahí. Es lo que convierte tu casa en la estación de Valdehierro.',
    audience: 'room',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una-por-sala',
    sides: 'una',
  },
  {
    id: 'tabla-de-la-noche',
    name: 'Tabla del retraso y las conformidades',
    summary:
      'La cuenta de la noche, para llevarla a lápiz y sin discusiones: retraso, conformidades, margen de cada cual y qué convoy va por dónde.',
    /*
     * `gm` Y NO `preparer`: no lleva el cuadro verdadero, solo la contabilidad.
     * Quien dirige a ciegas la necesita y puede tenerla sin saber nada.
     */
    audience: 'gm',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'cuadro-verdadero',
    name: 'El cuadro verdadero',
    summary:
      'Los seis convoyes en su orden, y el texto de los quince telegramas. Es EL ÁRBITRO de la noche. NO la dejes sobre la mesa.',
    /*
     * PARA QUIEN PREPARA, y en los DOS modos. Es la lección que costó una
     * partida en la Momia: con `blind`, quien dirige juega como uno más y no
     * conoce la solución, así que una hoja marcada `gm` + `host` no se imprimía
     * — y es justo la que hace falta para arbitrar. Quien monta el sobre puede
     * no ser quien dirige, y a ciegas es exactamente así.
     */
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'informe-del-cuadro',
    name: 'Informe del cuadro',
    summary:
      'La comprobación de que el cuadro tiene una sola solución, de que ningún telegrama sobra y de que nadie puede resolverlo en solitario. Con el recuento exacto.',
    /*
     * `preparer` Y NO `gm`, por lo mismo que sus gemelos de la Momia y las
     * Sombras: dentro va el texto entero de los telegramas, y esos telegramas
     * determinan un solo cuadro. Quien los lee tiene la solución aunque no venga
     * enumerada, y con `gm` esta hoja acabaría en la carpeta cuyo propio léeme
     * promete que nada de ahí revela la respuesta.
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
 * Escritas para leerse UNA VEZ, de pie, con el móvil en la mano y con ruido
 * alrededor. Por eso van en el orden en que hacen falta —qué se gana, qué se
 * hace en una franja, y las cuentas al final— y no en el orden en que se
 * programaron.
 *
 * Las tres que más se releen son la del enclavamiento, la de las conformidades
 * y la del retraso: son las que la gente pregunta en voz alta a las dos de la
 * mañana.
 */
export const REGLAS_NUDO: ReglaDeJuego[] = [
  {
    titulo: 'La noche',
    texto:
      'Es la madrugada del 14 de enero de 1927 y estás en el turno de noche de Valdehierro, el ' +
      'nudo donde se cruzan cinco líneas. Ha ardido la oficina del telégrafo y con ella el cuadro ' +
      'de marchas: el papel que dice en qué orden tienen que cruzar los seis convoyes de esta ' +
      'noche. Seis ya vienen rodando y no se les puede avisar.',
  },
  {
    titulo: 'Qué se gana',
    texto:
      'Se gana o se pierde EN GRUPO. Si los seis convoyes cruzan antes del amanecer y el retraso ' +
      'de la estación no ha llegado a su tope, gana el turno entero. Aquí nadie es el malo y ' +
      'nadie compite con nadie: lo único que hay enfrente es el reloj.',
  },
  {
    titulo: 'El Correo de Medianoche',
    texto:
      'Uno de los seis lleva el suero para el valle, donde hay difteria y niños esperándolo. Ese ' +
      'es el Correo, es público cuál es, y si no cruza no hay nada más que hablar: la noche está ' +
      'perdida aunque salgan los otros cinco.',
  },
  {
    titulo: 'El cuadro son seis convoyes en seis franjas',
    texto:
      'La noche tiene seis franjas horarias y en cada una sale UN convoy, sin repetir. Averiguar ' +
      'cuál va en cada una es el juego entero. Nadie lo sabe: lo que hay son las tiras de ' +
      'telegrama que cada cual salvó del fuego, y solo juntándolas sale un único cuadro posible.',
  },
  {
    titulo: 'Tus telegramas se leen en voz alta',
    texto:
      'Los llevas en papel, dentro de tu sobre. Nadie te los puede quitar y nadie te obliga a ' +
      'leerlos, pero el cuadro no sale sin ellos. Léelos, discútelos y tacha en tu cuadrícula: la ' +
      'mesa es el sitio donde se resuelve esto, no la pantalla.',
  },
  {
    titulo: 'El enclavamiento no se equivoca',
    texto:
      'Para sacar un convoy hay que CURSAR LA ORDEN desde la app. Si es el que tocaba, sale. Si ' +
      'no, el enclavamiento no da paso, la orden se rechaza y la estación se come DOS minutos de ' +
      'retraso. No se te dice cuál era el bueno: se te dice que ese no.',
  },
  {
    titulo: 'El cuadro se corre, no se rompe',
    texto:
      'Si una franja se cierra sin que salga nadie, el convoy que tocaba no se pierde: la noche ' +
      'entera se corre una franja, como se corre un horario de verdad. Cuesta dos minutos de ' +
      'retraso y se sigue. Nunca te quedas sin poder terminar.',
  },
  {
    titulo: 'Las conformidades',
    texto:
      'Cursar una orden gasta UNA conformidad. La estación regala una al abrir cada franja y las ' +
      'demás hay que ganarlas: cada puesto da una conformidad la primera vez que alguien resuelve ' +
      'su instrumento esa franja. O sea que probar a lo loco no sale gratis en tiempo y tampoco ' +
      'en trabajo.',
  },
  {
    titulo: 'Los puestos y los instrumentos',
    texto:
      'Cada habitación de la casa es un puesto de la estación y tiene su instrumento: la garita de ' +
      'agujas, el telégrafo, el cuadro de enclavamiento o el muelle de carga. Para manejarlo hay ' +
      'que IR HASTA ALLÍ y ocuparlo desde la app. Todos los que estéis en el mismo puesto veis el ' +
      'mismo problema: resolvedlo entre vosotros si queréis, que es más rápido.',
  },
  {
    titulo: 'El margen',
    texto:
      'Resolver un instrumento te da margen, y el doble si es el de tu oficio. El margen es tuyo y ' +
      'sirve para dos cosas: preguntarle al archivo si un convoy cabe en una franja (dos de ' +
      'margen, contesta sí o no) y recuperar un minuto de retraso (tres de margen).',
  },
  {
    titulo: 'Tu oficio y tu maña',
    texto:
      'Tienes un oficio, y en tu puesto rindes más. Y tienes una maña que se usa UNA VEZ EN TODA ' +
      'LA NOCHE: dilo en voz alta cuando la gastes, porque las cuatro sirven para sacar a la mesa ' +
      'de un apuro y la mesa tiene que saber que la has gastado.',
  },
  {
    titulo: 'El cuadro final',
    texto:
      'Cuando quien dirige lo decide, cada cual entrega SU cuadro de marchas: los seis convoyes en ' +
      'las seis franjas, de memoria y por separado. Eso es cosa tuya y no del turno: se puede ' +
      'ganar la noche y entregar un cuadro con dos franjas cambiadas.',
  },
  {
    titulo: 'La regla de oro',
    texto:
      'Todo esto es ficción y son las dos de la mañana. Habla claro, escucha a quien tiene el ' +
      'telegrama que falta y no dejes a nadie sin decir lo suyo: en esta noche no se gana ' +
      'callándose nada.',
  },
];

/**
 * Lo que la trama de este juego cita de la partida.
 *
 * Sin esto, borrar un convoy o un puesto después de generar no lo vería nadie:
 * `computeStaleness` solo mira la parte genérica de la trama, y el cuadro
 * verdadero vive entero en `plot.delJuego`, que para el contrato general es
 * `unknown`. Quien dirige se enteraría en la mesa, con la gente delante.
 *
 * SE CITA TODO LO QUE APUNTA A UNA ENTIDAD, incluidos los telegramas: un
 * telegrama que hable de un convoy borrado es un telegrama que no se puede
 * cumplir, o sea un cuadro sin solución.
 */
function citasDelNudo(delJuego: unknown): ReferenciaDeTrama[] {
  const t = delJuego as Partial<TramaNudo> | undefined;
  if (!t) return [];
  const citas: ReferenciaDeTrama[] = [];

  for (const [i, id] of (t.cuadro ?? []).entries()) {
    citas.push({ categoria: 'convoyes', id, donde: `el convoy de la franja ${i + 1}` });
  }
  if (t.correo) {
    citas.push({ categoria: 'convoyes', id: t.correo, donde: 'el Correo de Medianoche' });
  }
  for (const escrito of t.telegramas ?? []) {
    for (const id of convoyesDelTelegrama(escrito)) {
      citas.push({ categoria: 'convoyes', id, donde: `el telegrama ${escrito.id}` });
    }
  }
  for (const id of Object.keys(t.oficioDePuesto ?? {})) {
    citas.push({ categoria: 'puestos', id, donde: 'el puesto que ejerce un oficio' });
  }
  for (const id of Object.keys(t.oficioDePersona ?? {})) {
    citas.push({ categoria: 'ferroviarios', id, donde: 'quien tiene oficio en el turno' });
  }
  for (const [convoy, carga] of Object.entries(t.cargaDeConvoy ?? {})) {
    citas.push({ categoria: 'convoyes', id: convoy, donde: 'el convoy que lleva carga' });
    citas.push({ categoria: 'mercancias', id: carga, donde: 'lo que lleva un convoy' });
  }
  for (const [persona, telegramas] of Object.entries(t.reparto ?? {})) {
    citas.push({ categoria: 'ferroviarios', id: persona, donde: 'quien guarda telegramas' });
    void telegramas;
  }
  return citas;
}

/**
 * Los convoyes que nombra un telegrama, sea del tipo que sea.
 *
 * Se escribe aquí y no en `nudo-tipos.ts` porque solo hace falta para las
 * citas: el resto del juego trabaja con el telegrama entero. Y se escribe
 * ENUMERANDO LOS TIPOS y no leyendo las claves del objeto, que sería más corto
 * y se rompería en silencio el día que un tipo nuevo llame `origen` a un campo
 * que lleva un id.
 */
function convoyesDelTelegrama(escrito: { telegrama: TramaNudo['telegramas'][number]['telegrama'] }): string[] {
  const t = escrito.telegrama;
  switch (t.tipo) {
    case 'no-franja':
    case 'paridad':
      return [t.convoy];
    case 'no-seguidos':
    case 'bloque':
    case 'separados':
    case 'seguidos':
      return [t.a, t.b];
    case 'antes':
      return [t.antes, t.despues];
    case 'entre':
      return [t.a, t.medio, t.c];
    default:
      return [];
  }
}

/**
 * Los seis ejes de la respuesta: uno por franja.
 *
 * ═══ POR QUÉ ESTO ES UN EJE Y LA SENDA DE LAS SOMBRAS NO LO ERA ═══
 *
 * Un eje es «una respuesta que es UNA entidad de UNA categoría». La senda de
 * las Sombras es una selección ordenada de cuatro pasos entre diez, y forzarla
 * en ejes habría obligado al contrato general a aprender qué es una secuencia.
 *
 * El cuadro de marchas SÍ cabe, y cabe exactamente: son seis preguntas
 * independientes —«¿quién sale a las 00:00?»— cuya respuesta es un convoy. Que
 * las seis respuestas no puedan repetirse es una regla de ESTE juego y la hace
 * cumplir su reductor, igual que las Sombras hacen cumplir las suyas.
 *
 * Y sale gratis todo lo que cuelga de ahí: `respuestaCompleta`, `aciertos` —que
 * es la puntuación individual de la noche—, la hoja de respuesta del móvil con
 * seis selectores, y el desenlace con un renglón por franja. Sin escribir nada.
 *
 * LOS IDS SON `franja-1`..`franja-6` Y LOS CAMPOS DE `entregar-cuadro` TAMBIÉN:
 * `accionDeAcusacion` deduce con qué acción se responde comprobando que los
 * campos de su `eligeDe` cubren todos los ejes. Si los dos nombres se separan,
 * la ruta de respuesta deja de encontrar la acción y los botones de entregar
 * contestan «eso no se puede hacer en esta partida» toda la noche.
 */
const EJES_NUDO = HORAS_DE_FRANJA.map((hora, i) => ({
  id: `franja-${i + 1}`,
  pregunta: `¿Qué convoy sale en la franja de las ${hora}?`,
  rotulo: hora,
  categoria: 'convoyes',
}));

export const NUDO: ManifiestoDeJuego = {
  id: 'nudo',
  nombre: 'El Nudo de Valdehierro',
  lema: 'Ardió el cuadro de marchas y seis convoyes vienen rodando. Quedan seis franjas para rehacerlo.',

  categorias: [
    {
      id: 'ferroviarios',
      singular: 'ferroviario',
      plural: 'ferroviarios',
      /*
       * CUATRO, como los otros tres juegos, y por lo mismo: por debajo no hay
       * conversación. Aquí hay además una razón propia: los cuatro oficios se
       * reparten uno por persona, así que con menos de cuatro habría un
       * instrumento de la estación que no maneja nadie.
       */
      minimo: 4,
      sonJugadores: true,
      admiteFoto: true,
      admiteEmail: true,
      presentacion: {
        titulo: 'El turno de noche',
        descripcion:
          'Las personas de carne y hueso que van a sacar la noche adelante. A cada una le tocará ' +
          'un oficio, un puesto y unas tiras de telegrama: cuanto mejor las describas, mejor le ' +
          'encajará el suyo.',
        forma: 'circle',
        vacio: {
          /* Un aspa de paso a nivel: la marca de que ahí todavía no pasa nadie. */
          glifo: '✕',
          titulo: 'No hay nadie de turno',
          texto:
            'Añade al menos cuatro personas. El Jefe de Estación le dará a cada una un oficio y le ' +
            'repartirá los telegramas que salvó del fuego.',
        },
        ejemploNombre: 'Marta',
        ejemploDescripcion:
          'Lleva la contabilidad de una cooperativa y se le dan bien los números. Ponla donde haya ' +
          'que echar cuentas deprisa y no fallar.',
        pista: 'El oficio que le toque sale de lo que cuentes aquí: quien no para quieto acaba en la garita.',
      },
    },
    {
      id: 'convoyes',
      singular: 'convoy',
      plural: 'convoyes',
      /*
       * EXACTAMENTE SEIS, y es la única categoría de los cuatro juegos con
       * `exacto`. No es una manía: el cuadro de marchas es una biyección entre
       * convoyes y franjas, y las franjas son seis porque los EJES del
       * manifiesto son datos estáticos y no pueden crecer con la mesa. Con
       * cinco convoyes sobra una franja y con siete falta una: en los dos casos
       * el rompecabezas deja de tener sentido, y el fallo saldría al generar.
       */
      minimo: FRANJAS_DE_LA_NOCHE,
      exacto: FRANJAS_DE_LA_NOCHE,
      admiteFoto: true,
      presentacion: {
        titulo: 'Los convoyes de la noche',
        descripcion:
          'Los seis trenes que tienen que cruzar el nudo antes del amanecer, uno por franja. Uno ' +
          'de ellos será el Correo de Medianoche, y ese no puede quedarse.',
        forma: 'square',
        vacio: {
          /* Una rejilla: seis convoyes en seis franjas es una cuadrícula. */
          glifo: '▦',
          titulo: 'No hay nada en la vía',
          texto:
            'Hacen falta seis, ni uno más ni uno menos. Ponles nombres que se distingan a gritos en ' +
            'una habitación con ruido.',
        },
        sugerencias: [
          'El Correo de Medianoche',
          'El mixto de Peñarroya',
          'El carbonero de la Cuenca',
          'El expreso de la frontera',
          'El tren de obras del kilómetro 84',
          'El ganadero de Villaseca',
        ],
        ejemploNombre: 'El carbonero de la Cuenca',
        ejemploDescripcion:
          'Cuarenta vagones de hulla y una máquina vieja. Tarda una eternidad en arrancar y no cabe ' +
          'en la vía corta.',
        pista: 'Los nombres se van a decir a voces toda la noche: que no se parezcan entre sí.',
      },
    },
    {
      id: 'puestos',
      singular: 'puesto',
      plural: 'puestos',
      /*
       * CUATRO, que son los cuatro oficios. Con más habitaciones se reparten
       * igual y habrá dos garitas de agujas, que es lo que pasa en una estación
       * de verdad. Con menos, hay un instrumento que no se puede manejar.
       */
      minimo: 4,
      sonLugares: true,
      admiteFoto: true,
      presentacion: {
        titulo: 'Los puestos de la estación',
        descripcion:
          'Las habitaciones reales de tu casa, convertidas en puestos de Valdehierro. En cada una ' +
          'hay un instrumento, y para manejarlo hay que ir hasta allí de verdad.',
        forma: 'square',
        vacio: {
          /* Una planta: el plano de la estación con sus cuartos. */
          glifo: '⌂',
          titulo: 'La estación está a oscuras',
          texto:
            'Añade al menos cuatro habitaciones. Con los nombres de tu casa de verdad, la estación ' +
            'se monta sola.',
        },
        sugerencias: [
          'La garita del kilómetro 83',
          'El cuarto del telégrafo',
          'El muelle cubierto',
          'La sala de aparatos',
          'El depósito de máquinas',
          'La cantina de la estación',
        ],
        ejemploNombre: 'La cocina',
        ejemploDescripcion: 'La que da al patio, con la puerta que chirría. Esta noche es el muelle de carga.',
        pista: 'Que se reconozca tu casa es lo que hace que salir al pasillo a las dos de la mañana tenga gracia.',
      },
    },
    {
      id: 'mercancias',
      singular: 'cargamento',
      plural: 'mercancias',
      /*
       * TRES Y NO SEIS: si hubiera uno por convoy, la carga sería otro nombre
       * del convoy y no diría nada. Con tres para seis se repiten, y entonces
       * «el que lleva carbón» deja de identificar a nadie — que es justo lo que
       * hace que haya que decir el nombre del convoy y no su carga.
       *
       * NO ENTRA EN EL ROMPECABEZAS, a propósito: es la cuarta categoría, y
       * hacía falta una que NO fuese la que carga con todo para comprobar que
       * una partida con cuatro familias de entidades las manda las cuatro al
       * móvil. Antes solo cabía una además de personas y lugares.
       */
      minimo: 3,
      admiteFoto: true,
      presentacion: {
        titulo: 'Lo que va en los vagones',
        descripcion:
          'Los cargamentos de esta noche. Van en las hojas de porte que se dejan encima de la mesa: ' +
          'no deciden ninguna regla, deciden de qué habla la gente.',
        forma: 'square',
        vacio: {
          /* Un vagón cerrado visto de frente. */
          glifo: '▤',
          titulo: 'Los vagones van vacíos',
          texto: 'Añade al menos tres cargamentos. Si no se te ocurren, pídeselos al Jefe de Estación.',
        },
        sugerencias: [
          'El suero antidiftérico de Madrid',
          'Hulla de la Cuenca',
          'Reses para el matadero',
          'Traviesas de roble',
          'Sacos de correo certificado',
        ],
        ejemploNombre: 'El suero antidiftérico',
        ejemploDescripcion: 'Doce cajas de vidrio en paja. Si se hielan no sirven, y a esta hora hace ocho bajo cero.',
        pista: 'Uno de ellos va a ser lo que lleva el Correo. Que se note por qué no puede esperar.',
      },
    },
  ],

  /*
   * SEIS EJES, todos de la misma categoría, y ninguno señala a una persona.
   * Ver el comentario largo de `EJES_NUDO` ahí arriba.
   */
  ejes: EJES_NUDO,

  /*
   * SIMULTÁNEO. La plataforma sabe repartir turnos —`turnos: 'por-turnos'` y
   * `sesion.turnoDe`— y este juego no lo usa, y conviene decir por qué en vez
   * de dejarlo como un hueco: con ocho personas de pie en una casa, esperar
   * turno es esperar de pie. La franja se abre, todo el mundo se mueve a la vez
   * y quien dirige la cierra. El reparto por turnos sigue sin tener un solo
   * juego que lo ejercite, y está anotado en el §11 del diseño.
   */
  turnos: 'simultaneo',

  acciones: [
    {
      id: 'ocupar-puesto',
      rotulo: 'Ocupar un puesto',
      fases: ['ronda-abierta'],
      /*
       * ÚNICO `eligeDe` DE UNA CATEGORÍA DE LUGARES EN TODO EL MANIFIESTO, y
       * eso no es casualidad: `accionDeEntrarEnLugar` busca exactamente eso para
       * saber qué pasa cuando alguien toca una habitación en el plano. Si otra
       * acción llegara a tener un solo campo de una categoría de lugares, cuál
       * de las dos gana dependería del orden de esta lista.
       */
      eligeDe: [{ campo: 'puesto', categoria: 'puestos', rotulo: '¿A qué puesto vas?' }],
      /*
       * DOS, no una. Moverse de puesto a mitad de franja es parte del juego
       * —«ve tú al telégrafo, que aquí ya está»— y no cuesta nada a la
       * estación. Lo que no se puede es estar en dos sitios: ocupar uno te saca
       * del anterior.
       */
      vecesPorTurno: 2,
    },
    {
      id: 'rendir-instrumento',
      rotulo: 'Entregar el instrumento',
      fases: ['ronda-abierta'],
      /*
       * LA RESPUESTA VA EN `eligeLibre` Y NO PODÍA IR EN OTRO SITIO. Lo que se
       * entrega es la solución de un rompecabezas que el servidor ha planteado
       * para este puesto y esta franja: una secuencia de movimientos de
       * maniobra, una palabra transcrita del Morse, una configuración de
       * palancas o un reparto de bultos. Nada de eso es una entidad de ninguna
       * categoría, así que el motor no puede validarlo — y ese es exactamente el
       * trato de `eligeLibre`: se pasa tal cual y lo valida el reductor, que sí
       * conoce el planteamiento y su solución.
       *
       * Y de ahí sale la propiedad que hace justo el minijuego: UNA RESPUESTA
       * EQUIVOCADA NO GASTA NADA. El motor apunta la acción DESPUÉS de que el
       * reductor devuelva, así que basta con lanzar `AccionInvalida` para que no
       * cuente. Sin eso, fallar una maniobra sería un castigo por tener sueño.
       */
      eligeLibre: [{ campo: 'respuesta', rotulo: 'Lo que has resuelto' }],
    },
    {
      id: 'cursar-orden',
      rotulo: 'Cursar la orden de salida',
      fases: ['ronda-abierta'],
      eligeDe: [{ campo: 'convoy', categoria: 'convoyes', rotulo: '¿Qué convoy sale ahora?' }],
      /*
       * SIN TOPE POR FRANJA, y es una decisión que se puede defender: el freno
       * de las órdenes no es un contador, es la ECONOMÍA. Cada una gasta una
       * conformidad, que hay que ganar resolviendo instrumentos, y cada rechazo
       * cuesta dos minutos de retraso. Un tope encima de eso sería castigar dos
       * veces lo mismo, y dejaría a una mesa que ha trabajado sin poder gastar
       * lo que ha ganado.
       */
    },
    {
      id: 'consultar-archivo',
      rotulo: 'Consultar el archivo',
      fases: ['ronda-abierta', 'ronda-cerrada'],
      eligeDe: [{ campo: 'convoy', categoria: 'convoyes', rotulo: '¿Por qué convoy preguntas?' }],
      /*
       * LA FRANJA VA EN `pideNumero`, Y ES EL PRIMER USO DE VERDAD QUE TIENE.
       *
       * El campo se añadió al contrato porque `verify:ajeno` montó una subasta y
       * no había forma de preguntar una puja: el motor construye los datos SOLO
       * con lo declarado y descartaba en silencio cualquier campo que no lo
       * estuviera. Se añadió y se quedó sin usar por ningún juego real, o sea
       * sin ejercitar en la app, en la vista ni en el reductor.
       *
       * Aquí es lo natural: se pregunta por un convoy Y por una franja, y la
       * franja es un número entre 1 y 6. No es una entidad de nadie y no se
       * puede fingir que lo sea. Los límites los comprueba el MOTOR, que es lo
       * correcto: un número no depende de ningún estado secreto y es justo lo
       * que un móvil manipulado mandaría negativo o enorme.
       */
      pideNumero: [
        {
          campo: 'franja',
          rotulo: '¿Por qué franja?',
          minimo: 1,
          maximo: FRANJAS_DE_LA_NOCHE,
          porDefecto: 1,
          entero: true,
        },
      ],
    },
    {
      id: 'recuperar-tiempo',
      rotulo: 'Recuperar un minuto',
      fases: ['ronda-abierta', 'ronda-cerrada'],
    },
    {
      id: 'usar-mana',
      rotulo: 'Usar tu maña',
      fases: ['ronda-abierta', 'ronda-cerrada'],
      /*
       * SIN CAMPOS, y por eso mismo hace falta decir qué es: la maña depende del
       * OFICIO, que lo sabe el reductor, así que no hay nada que elegir. Es la
       * acción más sencilla de las seis y la que más se piensa antes de pulsar.
       *
       * `vecesPorTurno` no la limita: el límite es UNA VEZ EN TODA LA NOCHE, y
       * eso el motor no lo sabe contar —solo cuenta por ronda—. Lo lleva el
       * estado, en `manaUsada`.
       */
    },
    {
      id: 'entregar-cuadro',
      rotulo: 'Entregar tu cuadro de marchas',
      /*
       * EN LAS TRES FASES DE JUEGO, como el `senalar` de las Sombras y por lo
       * mismo: entregar pronto es arriesgarse y esperar cuesta. Aquí además hay
       * una razón práctica — quien dirige puede cerrar la noche desde la franja
       * cerrada sin pasar por el cuadro final, y si esta acción solo valiera ahí,
       * media mesa se quedaría sin entregar.
       */
      fases: ['ronda-abierta', 'ronda-cerrada', 'acusaciones'],
      /*
       * LOS SEIS CAMPOS SE LLAMAN COMO LOS SEIS EJES, y tienen que seguir
       * llamándose así: `accionDeAcusacion` deduce que esta es la acción de
       * respuesta comprobando que sus campos cubren todos los ejes. Ver el
       * comentario de `EJES_NUDO`.
       */
      eligeDe: EJES_NUDO.map((e) => ({
        campo: e.id,
        categoria: 'convoyes',
        rotulo: `Franja de las ${e.rotulo}`,
      })),
      vecesPorTurno: 1,
    },
  ],

  /*
   * CINCO PESTAÑAS Y NO SEIS, que es lo que entra con la muesca en medio.
   *
   * No hay tablón, no hay cuaderno y no hay pestaña de «hechos»: en esta noche
   * no se destapa nada por rondas. Lo que hay es el CUADRO —la cuadrícula
   * compartida donde se va tachando— y el PUESTO, que es donde vive el
   * instrumento del sitio en el que estás. Las dos son propias y las dos han
   * costado una entrada en `PantallaDeApp`, que es el peaje honesto de que la
   * app sea un binario compilado.
   */
  barra: [
    { pantalla: 'cuadro', rotulo: 'Cuadro', icono: 'reloj' },
    { pantalla: 'puesto', rotulo: 'Puesto', icono: 'aguja' },
    /*
     * «Planta» y no «Estación», y son seis caracteres contra ocho: la barra
     * encoge la letra a 7,8 en cuanto un rótulo llega a siete, así que un
     * rótulo largo le cambia el aspecto a las cinco pestañas. Y además es más
     * exacto — lo que se enseña ahí es la PLANTA de la estación, con sus
     * puestos, que es como se llama de verdad ese plano.
     */
    { pantalla: 'mapa', rotulo: 'Planta', icono: 'plano' },
    { pantalla: 'personaje', rotulo: 'Tú', icono: 'mascara' },
    { pantalla: 'perfil', rotulo: 'Perfil', icono: 'copa' },
  ],

  /**
   * EL DOSIER DEL TURNO DE NOCHE.
   *
   * NO LLEVA `senalado`, y esa ausencia es la diferencia con los otros tres: ese
   * bloque es el consejo para quien lleva el papel que gana perdiendo, y aquí no
   * hay ninguno. `ejeDeJugadores` devuelve `undefined`, así que `soyElSenalado`
   * es falso para todo el mundo y el bloque saldría vacío toda la noche.
   *
   * Tampoco lleva `coartada` ni `motivo`: nadie tiene que justificar dónde
   * estaba. Lleva `secreto` porque un turno de noche tiene sus cosas, y las dos
   * propias —`oficio` y `telegramas`— arriba del todo, porque son lo que se mira
   * cada vez que se abre la app.
   */
  dosier: [
    'identidad',
    'oficio',
    'telegramas',
    'persona-publica',
    'secreto',
    'gancho',
    'conocimiento',
    'giros',
    'caso',
    'reglas',
    'cosas',
    'mesa',
  ],

  asistente: {
    nombre: 'El Jefe de Estación',
    descripcion: 'Tu jefe de estación con IA',
    icono: 'locomotora',
    /*
     * NO ES UN MAYORDOMO, NI UN ESCRIBA, NI UN GUÍA DE MONTAÑA. Es un
     * funcionario de ferrocarriles de 1927 que lleva treinta años en la misma
     * estación, se sabe el Reglamento de memoria y lo cita cuando le conviene.
     * Trata de usted porque en el servicio se trata de usted, pero no es
     * ceremonioso: es escueto, y cuando se pone tierno se le nota que le cuesta.
     */
    voz:
      'Eres el Jefe de Estación de Valdehierro: treinta años en el mismo nudo, el Reglamento de\n' +
      'Circulación en la cabeza y una estufa que no calienta. Hablas SIEMPRE en español, en frases\n' +
      'cortas y sin florituras. Tratas de USTED porque en el servicio se trata de usted, pero no\n' +
      'haces ceremonias: en una noche de nieve no las hace nadie. Cuando algo es una regla, la\n' +
      'dices como una regla. Cuando algo depende de la mesa, lo dices y te callas.',
    saludo:
      'A sus órdenes. Le aviso de entrada: no sé en qué orden va el cuadro de esta noche —ardió con ' +
      'la oficina, como todo— ni pienso adivinárselo. Sé el Reglamento, sé qué se hace en cada ' +
      'puesto y sé lo que le toca a usted. Para eso, pregunte.',
    seNiega: 'yo llevo la estación, no el cuadro de marchas',
    sinIa: {
      reglas:
        'Cada franja sale un convoy y solo uno. Se cursa la orden desde la app: si es el que tocaba, ' +
        'sale; si no, el enclavamiento no da paso y son dos minutos menos de margen. Cursar gasta ' +
        'una conformidad, y las conformidades se ganan resolviendo el instrumento de cada puesto.',
      personaje:
        'Su oficio y su maña los lleva usted en el dosier. La maña es una sola vez en toda la noche, ' +
        'y conviene decirla en voz alta: si nadie sabe que la ha gastado, no sirve de nada.',
      solucion:
        'Yo llevo la estación, no el cuadro de marchas. El orden lo tienen ustedes repartido en las ' +
        'tiras del telégrafo: júntenlas y saldrá, que no hay más que un cuadro que las cumpla todas.',
      general:
        'Sin línea con la central, mi consejo es el de siempre: que cada cual lea su tira en voz alta ' +
        'antes de que nadie proponga nada. Se pierde menos tiempo así que discutiendo a ciegas.',
    },
  },

  /*
   * En el centro del plano de una estación no hay escaleras: hay agujas. El
   * nudo es el haz de vías donde se cruzan las cinco líneas, y es literalmente
   * lo que da nombre al juego.
   */
  rotuloCentralDelPlano: 'EL NUDO',

  reglas: REGLAS_NUDO,
  referenciasDeLaTrama: citasDelNudo,

  ronda: {
    accionSobre: 'puestos',
    /*
     * UNO, que es el segundo `ocupar-puesto` de la franja. Este campo hoy no lo
     * lee nadie —está anotado en su propia declaración— y el límite de verdad
     * lo pone `vecesPorTurno: 2` en la acción. Se declara porque documenta de un
     * vistazo sobre qué actúa la franja.
     */
    cambiosPermitidos: 1,
    /*
     * SEIS FRANJAS, Y ESTE CAMPO SÍ SE LEE.
     *
     * Es el campo que este juego tuvo que añadir al contrato, y conviene decir
     * por qué: la duración de una velada la decidía `numeroDeRondas`, que mira
     * la ronda más alta de las PISTAS de la trama. Los tres juegos anteriores
     * usan la mecánica de pistas o se conforman con las cuatro por defecto;
     * este no entra a ningún sitio a encontrar nada, así que se quedaba con
     * cuatro rondas y el móvil enseñaba «Franja 5 de 4». Sin un solo error.
     */
    cuantas: FRANJAS_DE_LA_NOCHE,
  },

  /*
   * ═══ LAS FASES SON LAS DE SIEMPRE, Y NO POR PEREZA ═══
   *
   * El contrato dice que los nombres son libres. Lo son en el manifiesto y no lo
   * son en la plataforma: `verificar-juegos` exige que toda fase alcanzable
   * tenga una ruta POST que la abra, y esas rutas están escritas una por una en
   * `routes/live.ts` para los nombres de CLUEDO. Un juego que llamara `franja` a
   * su turno declararía una fase que no se puede abrir desde ninguna parte, y el
   * comprobador ni siquiera lo vería: su tabla `RUTA_DE_FASE` solo mira los
   * nombres que conoce.
   *
   * Así que se usan los cinco de siempre y se les cambian las palabras, que es
   * lo que sí está resuelto: `rotulosDeAviso` y `avisos` mandan sobre el telón,
   * y `palabras.ts` del taller sobre los botones. Lo que falta para que los
   * nombres sean libres de verdad está en el §11 del diseño.
   *
   * El CUADRO FINAL es `acusaciones`, como el consejo del alba de las Sombras:
   * es la fase de decisión y su ruta es `/live/respuestas`. Y se puede volver de
   * ella a una franja más, que es lo que quiere una mesa atascada.
   */
  fases: {
    lobby: ['ronda-abierta'],
    'ronda-abierta': ['ronda-cerrada'],
    'ronda-cerrada': ['ronda-abierta', 'acusaciones', 'desenlace'],
    acusaciones: ['ronda-abierta', 'desenlace'],
    /* Esta noche empieza y acaba antes del amanecer: ni sellado ni encuentros. */
    sellado: [],
    intermedio: [],
    desenlace: [],
  },

  papelDeFase: {
    lobby: 'espera',
    'ronda-abierta': 'turno',
    'ronda-cerrada': 'entreacto',
    acusaciones: 'decision',
    desenlace: 'fin',
  },

  trofeos: TROFEOS_NUDO,
  seccionesDeDosier: SECCIONES_NUDO,

  preparacion: {
    anfitrion: [
      'Imprime el paquete. Las tiras del telégrafo, a UNA CARA: a doble cara se leen al trasluz y se acabó el juego.',
      'Recorta las tiras y agrúpalas POR PERSONA. Cada montón va en el sobre de quien le toca, cerrado.',
      'Cuelga un rótulo en cada habitación. Lleva el nombre del puesto y el oficio que se ejerce ahí.',
      'Deja las hojas de porte de los seis convoyes boca arriba en el centro de la mesa. Son públicas desde el minuto uno.',
      'Reparte un cuadro en blanco por persona y deja lápices. Se tacha mucho: que haya gomas.',
      'Guarda el cuadro verdadero donde nadie lo vea. Es el árbitro: lo vas a necesitar si alguien discute una orden.',
    ],
    aCiegas: [
      'Busca a alguien que no vaya a jugar, o que acepte jugar sabiéndolo todo. Esa persona prepara el material.',
      'Quien prepara imprime todo —las tiras a UNA CARA—, las recorta y las mete en el sobre de cada cual.',
      'Quien dirige recibe solo la guía de la noche, los rótulos de los puestos y la tabla del retraso. Nada más.',
      'Quien prepara se queda con el cuadro verdadero toda la noche. La app arbitra las órdenes sola, así que no hace falta consultarlo salvo que algo se discuta.',
      'Al dar el parte del amanecer, quien prepara saca el cuadro verdadero y lo lee en voz alta. Ese es el momento.',
    ],
  },

  /* Los rótulos de los telones. Aquí la noche se cuenta por FRANJAS. */
  rotulosDeAviso: {
    'ronda-abierta': 'Se abre la franja',
    'ronda-cerrada': 'Se cierra la franja',
    respuestas: 'El cuadro final',
    desenlace: 'Amanece en Valdehierro',
    ganador: 'El parte de la noche',
  },

  avisos: {
    rondaAbierta:
      'Franja {ronda} de {total}. Ocupa un puesto, resuelve su instrumento y cursa la orden cuando lo tengáis.',
    rondaCerrada: 'Franja cerrada. Se apunta el retraso y se relevan los puestos.',
    respuestas: 'El cuadro final. Cada cual entrega el suyo: seis convoyes en seis franjas, de memoria.',
    desenlace: 'Amanece. Se abre el cuadro verdadero.',
  },

  ceremonia: {
    generar: [
      'Se pasa lista al turno de noche…',
      'Seis convoyes buscan su franja, y solo hay un orden bueno…',
      'Se reparten los cuatro oficios de la estación…',
      'Se redactan las tiras que sobrevivieron al fuego…',
      'Se cuenta cuántos cuadros las cumplen, y tiene que salir uno…',
      'Se comprueba que ningún telegrama sobra…',
      'Se lacra el cuadro verdadero…',
    ],
    actualizar: [
      'El Jefe de Estación repasa la lista del turno…',
      'A los recién llegados se les busca un oficio y un puesto…',
      'Se les reparten las tiras que quedaban sin dueño…',
      'Se reimprimen los dosieres afectados…',
    ],
  },

  documentos: IMPRIMIBLES_NUDO,
  dosieresPropios: true,

  /*
   * NO HAY MATERIAL DE VELADA, y conviene decir por qué en vez de dejar el campo
   * a `false` sin más. El material son narraciones por ronda, giros personales y
   * un desenlace escritos ENCIMA de una trama ya generada. Las narraciones de
   * esta noche no las escribe un modelo: las dicta el estado de la estación
   * —cuánto retraso hay, quién queda por salir— y se leen del panel de quien
   * dirige. Un botón que reescribiera «el material» aquí correría el pipeline de
   * otro juego sobre una trama que no tiene ni víctima ni culpable.
   */
  materialDeVelada: false,
};
