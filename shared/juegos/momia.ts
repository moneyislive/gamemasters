/**
 * El Misterio de la Momia, dicho como datos.
 *
 * ES EL SEGUNDO JUEGO DE VERDAD, y por eso se elige uno que NO cabe cómodamente
 * en lo que la plataforma sabía hacer. CLUEDO es: entrar en una sala, recoger
 * pistas ciertas, acusar una tupla, gana quien acierta antes. Si esto fuera otra
 * variante de lo mismo, la plataforma parecería general sin serlo.
 *
 * Aquí se rompen cuatro supuestos a la vez y cada rotura es deliberada:
 *
 *   · La respuesta no es una tupla de ejes independientes, es un ORDEN.
 *   · No toda la información es cierta: el saqueador fabrica fragmentos falsos.
 *   · Guardarse lo que sabes no es óptimo: nadie tiene datos suficientes.
 *   · No gana una persona, gana un BANDO.
 *
 * El diseño completo, con las reglas y el porqué de cada una, está en
 * `docs/momia/DISENO.md`. Aquí solo va lo que los tres paquetes tienen que
 * saber a la vez.
 *
 * QUÉ NO ESTÁ AQUÍ Y ES A PROPÓSITO: el orden de los ritos no es un `eje`. Los
 * ejes son respuestas independientes de una entidad cada una, y un orden no lo
 * es —el valor de la tercera posición depende de las otras cuatro—. Forzarlo
 * habría requerido que `ejes` supiera de secuencias, es decir, que el contrato
 * general aprendiera una mecánica concreta. El orden vive en el estado del
 * juego (`EstadoMomia`) y lo mueve una acción propia.
 */
import type { TrofeoInfo } from '../live';
import type { DocumentSectionInfo } from '../types';
import type { PrintableDocInfo } from '../documents';
import type { ManifiestoDeJuego, ReferenciaDeTrama, ReglaDeJuego } from './tipos';
import type { TramaMomia } from './momia-tipos';

/**
 * Los trofeos de la Momia.
 *
 * Ninguno premia «acertar antes», que es lo que premia CLUEDO. Premian haber
 * sellado, haber desenmascarado, haber salido limpio y haber dado lo que tenías.
 * El último premia ganar siendo el traidor: sin él, ser el saqueador sería un
 * castigo y nadie querría serlo.
 */
/*
 * LOS GLIFOS SON DEL PLANO BASICO, y no es un capricho estetico.
 *
 * Estos trofeos llevaban jeroglificos de verdad (𓂀, 𓋹, U+13000 y alrededores).
 * En Windows se pintan porque el sistema trae Segoe UI Historic; en iOS y en
 * Android NO HAY NINGUNA FUENTE que cubra ese bloque, asi que la vitrina de
 * trofeos —que se mira en el movil, no en un escritorio— habria salido con
 * cuadraditos vacios. El sitio donde se veria mal es justo el unico sitio donde
 * se ve.
 *
 * El anj (U+2625) si esta en el plano basico y se pinta en todas partes.
 */
export const TROFEOS_MOMIA: TrofeoInfo[] = [
  {
    id: 'sellador',
    nombre: 'El Sellador',
    descripcion: 'Tu orden fue el que se ejecutó, y era el correcto.',
    glifo: '☥',
  },
  {
    id: 'ojo-de-horus',
    nombre: 'Ojo de Horus',
    descripcion: 'Señalaste al saqueador y acertaste.',
    glifo: '◉',
  },
  {
    id: 'incorrupto',
    nombre: 'Incorrupto',
    descripcion: 'Amaneciste sin una sola marca de la maldición.',
    /*
     * Hueco a proposito, y es el unico de los cinco que lo es. En la vitrina
     * estos glifos se miran de tres en tres a 30 px, con el rotulo en
     * versalitas de 11 px que a veces parte en dos lineas: la forma es lo unico
     * que los distingue. Aqui llevaba tambien el anj, el mismo que «El
     * Sellador», y los dos son la primera y la tercera casilla de la misma
     * fila — se leian como el mismo trofeo repetido.
     *
     * El anj se queda en «El Sellador» porque sellar la tumba es devolver la
     * vida, y porque ya es el icono de la pestana del Sellado en la barra.
     * «Incorrupto» es una AUSENCIA —ni una marca—, y una estrella hueca lo dice.
     */
    glifo: '✧',
  },
  {
    id: 'mano-abierta',
    nombre: 'Mano Abierta',
    descripcion: 'Diste tus dos amuletos. Ninguno fue para ti.',
    glifo: '❖',
  },
  {
    id: 'sombra',
    nombre: 'La Sombra',
    descripcion: 'Eras el saqueador, y amaneció con la tumba abierta.',
    glifo: '☾',
  },
];

/**
 * Las secciones del dosier de cada expedicionario.
 *
 * Se parecen a las de CLUEDO porque el problema es el mismo —dar a alguien lo
 * justo para interpretar un papel sin destriparle la trama— pero no son las
 * mismas: aquí hay un DON, que es lo que esa persona puede hacer y las demás no,
 * y es la sección que más se consulta durante la noche.
 */
export const SECCIONES_MOMIA: DocumentSectionInfo[] = [
  { id: 'cover', label: 'Portada', description: 'El título de la expedición y de quién es el dosier.', required: true },
  { id: 'character', label: 'Tu expedicionario', description: 'Tu papel, tu cara pública, tu motivo y tu coartada.', required: true },
  { id: 'don', label: 'Tu don', description: 'Lo que tú puedes hacer y nadie más. Una vez por vigilia.', required: true },
  { id: 'secret', label: 'Tu secreto', description: 'Lo que ocultas. Nadie más lo lee.' },
  { id: 'knowledge', label: 'Lo que sabes', description: 'Lo que has ido averiguando, vigilia a vigilia.' },
  { id: 'case', label: 'La expedición', description: 'Qué se ha encontrado, qué se abrió y qué pasó esa noche.' },
  { id: 'rules', label: 'Cómo se juega', description: 'Las reglas de la vigilia, el sellado y la maldición.' },
  { id: 'expedicion', label: 'Quiénes van', description: 'El resto de la expedición, con lo que cualquiera sabría.' },
  { id: 'reliquias', label: 'Las reliquias', description: 'Lo que ha salido de la tumba.' },
  { id: 'ritos', label: 'Los cinco ritos', description: 'Los ritos del sellado. El orden es lo que hay que averiguar.' },
  { id: 'board', label: 'La tumba', description: 'El plano de las cámaras.' },
];

/**
 * Los imprimibles de la Momia.
 *
 * SE PUEDE JUGAR SIN MÓVILES, y eso no es un extra: es la mitad del producto.
 * Una casa con mala cobertura, gente sin batería o unas ganas razonables de no
 * mirar una pantalla en toda la noche son motivos suficientes. Lo que en la app
 * es una pantalla, aquí es una hoja.
 */
export const IMPRIMIBLES_MOMIA: PrintableDocInfo[] = [
  {
    id: 'indice-paquete',
    name: 'Empieza por aquí',
    summary: 'La hoja por la que se abre el paquete: qué imprimir, cuántas copias y qué no debes abrir tú si juegas a ciegas.',
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'doble',
  },
  {
    id: 'guia-expedicion',
    name: 'Guía de la expedición',
    summary: 'El documento que llevas toda la noche: cómo se abre cada vigilia, qué cámara se profana, cómo se resuelve el sellado.',
    audience: 'gm',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'doble',
  },
  {
    id: 'dosier-expedicionario',
    name: 'Dosieres de la expedición',
    summary: 'Uno por persona: su papel, su don, su secreto y lo que puede contar. Se reparten en sobres cerrados.',
    audience: 'players',
    modes: ['host', 'blind'],
    defaultOn: true,
    porPersona: true,
    copies: 'una-por-jugador',
    sides: 'doble',
  },
  {
    id: 'fragmentos-papiro',
    name: 'Fragmentos de papiro',
    summary: 'Las cartas del puzle, para recortar. Cada una dice una cosa sobre el orden de los ritos.',
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'carteles-camara',
    necesitaLugares: true,
    name: 'Carteles de las cámaras',
    summary: 'Un cartel por cámara para pegar en las puertas de tu casa. Es lo que convierte el pasillo en una tumba.',
    audience: 'room',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una-por-sala',
    sides: 'una',
  },
  {
    id: 'hoja-sellado',
    name: 'Hoja del sellado',
    summary: 'Donde cada cual anota el orden que propone y a quién señala. Se rellena al final, en silencio.',
    audience: 'players',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una-por-jugador',
    sides: 'una',
  },
  {
    id: 'tabla-marcas',
    name: 'Tabla de marcas y amuletos',
    summary: 'La cuenta de la maldición, para llevarla a mano sin discusiones.',
    // No lleva la solución, así que puede llevarla quien dirige a ciegas.
    audience: 'gm',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'papiro-sellado',
    name: 'El papiro del sellado',
    summary: 'El orden verdadero de los cinco ritos y quién rompió el sello. NO la dejes sobre la mesa.',
    /*
     * PARA QUIEN PREPARA, y en los DOS modos.
     *
     * Estaba como `audience: 'gm'` y `modes: ['host']`, y eso dejaba la partida
     * a ciegas sin arbitro: con `gmPlays`, quien dirige juega como uno mas y no
     * conoce la solucion, asi que estas dos hojas no se imprimian... y son
     * justamente las que hacen falta para resolver el sellado y llevar la cuenta
     * de las marcas. Nadie las tenia.
     *
     * `preparer` es la audiencia correcta: quien monta el sobre puede no ser
     * quien dirige, y en la partida a ciegas es exactamente asi.
     */
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'informe-papiro',
    name: 'Informe del papiro',
    summary: 'La comprobación de que el puzle tiene una sola solución y de que nadie puede resolverlo en solitario.',
    /*
     * `preparer` Y NO `gm`, como su gemelo `informe-validacion` de CLUEDO.
     *
     * Dentro va el texto entero de los fragmentos ciertos, y esos fragmentos
     * determinan un solo orden: quien los lee tiene la solución, aunque no
     * venga enumerada. Con `gm`, el paquete a ciegas lo metía en la carpeta
     * `01_GAME_MASTER`, cuyo propio léeme promete que nada de ahí revela el
     * caso, y quien dirige jugando se destripaba la partida creyendo que hacía
     * la comprobación previa. Es material de quien MONTA la velada, que es lo
     * que dice la cabecera de `docs/imprimibles/momia/informePapiro.ts`.
     */
    audience: 'preparer',
    modes: ['host', 'blind'],
    defaultOn: false,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'etiquetas-sobres',
    name: 'Etiquetas para los sobres',
    summary: 'Para que cada dosier llegue a su persona y ninguno se abra antes de tiempo.',
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
 * Estan escritas para leerse UNA VEZ, de pie, con el movil en la mano y con
 * ruido alrededor. Por eso van en el orden en que hacen falta —primero que se
 * gana, luego que se hace cada vigilia, y el sellado al final— y no en el orden
 * en que se programaron.
 *
 * Las tres que mas se releen durante la noche son la de los amuletos, la del
 * saqueador y la del sellado: son las que la gente pregunta en voz alta.
 */
export const REGLAS_MOMIA: ReglaDeJuego[] = [
  {
    titulo: 'El objetivo',
    texto:
      'La tumba esta abierta y la maldicion avanza. Antes del amanecer hay que volver a sellarla ejecutando cinco ritos EN EL ORDEN correcto. Si se sella, gana la expedicion entera. Si no, gana quien rompio el sello.',
  },
  {
    titulo: 'Hay un saqueador entre vosotros',
    texto:
      'Una de las personas de la mesa abrio el sello a proposito, por encargo de un comprador. No quiere que la tumba se selle. Nadie sabe quien es, y esa persona juega con vosotros toda la noche como si fuera una mas.',
  },
  {
    titulo: 'Nadie puede resolverlo solo',
    texto:
      'El orden de los ritos estaba escrito en un papiro que se rompio. Cada fragmento dice UNA cosa sobre el orden. Los fragmentos estan repartidos, y con los tuyos no basta: la unica forma de sellar la tumba es poner en comun lo que cada cual ha encontrado.',
  },
  {
    titulo: 'No todo lo que se dice es verdad',
    texto:
      'El saqueador puede fabricar fragmentos falsos y ponerlos sobre la mesa como si los hubiera encontrado. Parecen autenticos. Si dos fragmentos publicos se contradicen, uno de los dos es mentira: esa contradiccion es la mejor pista que vas a tener.',
  },
  {
    titulo: 'Las vigilias',
    texto:
      'La noche se divide en vigilias. Quien dirige abre y cierra cada una. Al empezar se anuncia que camara esta PROFANADA esa noche.',
  },
  {
    titulo: 'Entrar en una camara',
    texto:
      'En cada vigilia entras en una camara y sales con un fragmento de papiro. Si la camara estaba profanada, sales tambien con una MARCA de la maldicion. No se puede rectificar: se entra una vez y se acepta lo que haya.',
  },
  {
    titulo: 'Las marcas',
    texto:
      'A las tres marcas quedas TOCADO. No te elimina: sigues jugando, sigues hablando y sigues pudiendo senalar. Lo que pierdes es voz en el sellado, porque tu propuesta ya no cuenta en la votacion.',
  },
  {
    titulo: 'Los amuletos',
    texto:
      'Empiezas con dos amuletos. Un amuleto quita una marca, y solo puedes gastarlo EN OTRA PERSONA, nunca en ti. Es la unica forma de curarse que hay, asi que sobrevivir depende de que alguien quiera ayudarte.',
  },
  {
    titulo: 'Tu don',
    texto:
      'Tu papel trae un don que las demas personas no tienen, y puedes usarlo una vez por vigilia. Lo que hagas con el es cosa tuya: contarlo, callartelo o mentir sobre lo que has visto.',
  },
  {
    titulo: 'El sellado',
    texto:
      'Cuando quien dirige lo decide, cada cual propone su orden de los cinco ritos y senala a quien cree que es el saqueador. Se ejecuta el orden MAS VOTADO, no el tuyo: convencer a la mesa importa tanto como acertar.',
  },
  {
    titulo: 'Senalar al saqueador',
    texto:
      'Se senala una sola vez y para toda la partida, y no se puede cambiar. No se te dira si has acertado hasta el desenlace.',
  },
  {
    titulo: 'La regla de oro',
    texto:
      'Todo lo de esta noche es ficcion. Interpreta con generosidad y deja brillar a los demas. Y si eres el saqueador: pierde con elegancia o gana sin restregarlo.',
  },
];

/**
 * Lo que la trama de la Momia cita de la partida.
 *
 * Sirve para que `computeStaleness` avise cuando quien dirige toca las entidades
 * DESPUÉS de generar. Sin esto, borrar una cámara dejaba `profanadas` y
 * `hallazgos` apuntando al vacío sin que nadie dijera nada, y tocar los ritos no
 * lo veía absolutamente NADIE —no tienen equivalente genérico— aunque el orden
 * del sellado sea el juego entero.
 *
 * Las restricciones no se enumeran a propósito: solo citan ritos, y los cinco
 * ritos ya entran por `ordenVerdadero`. Repetirlas daría el mismo aviso dos
 * veces.
 */
function citasDeLaMomia(delJuego: unknown): ReferenciaDeTrama[] {
  const t = delJuego as Partial<TramaMomia> | undefined;
  if (!t) return [];
  const citas: ReferenciaDeTrama[] = [];

  for (const [i, id] of (t.ordenVerdadero ?? []).entries()) {
    citas.push({ categoria: 'ritos', id, donde: `el rito ${i + 1} del sellado` });
  }
  for (const [i, id] of (t.profanadas ?? []).entries()) {
    citas.push({ categoria: 'camaras', id, donde: `la cámara profanada en la vigilia ${i + 1}` });
  }
  for (const h of t.hallazgos ?? []) {
    citas.push({ categoria: 'camaras', id: h.camaraId, donde: 'la cámara donde aparece un fragmento' });
  }
  for (const id of Object.keys(t.dones ?? {})) {
    citas.push({ categoria: 'expedicionarios', id, donde: 'quien recibió un don' });
  }
  if (t.reliquiaCodiciada) {
    citas.push({ categoria: 'reliquias', id: t.reliquiaCodiciada, donde: 'la reliquia que el saqueador tiene vendida' });
  }
  return citas;
}

export const MOMIA: ManifiestoDeJuego = {
  id: 'momia',
  nombre: 'El Misterio de la Momia',
  lema: 'El sello está roto. Alguien de la expedición lo quiso así.',

  categorias: [
    {
      id: 'expedicionarios',
      singular: 'expedicionario',
      plural: 'expedicionarios',
      minimo: 4,
      sonJugadores: true,
      admiteFoto: true,
      admiteEmail: true,
      /*
       * En `suspects`, y no por comodidad: de ese campo cuelga el emparejamiento
       * de los móviles, el reparto de dosieres y los correos. Una categoría de
       * personas que viviera en otro sitio se quedaría sin nada de eso.
       */
      almacen: 'suspects',
      presentacion: {
        titulo: 'La expedición',
        descripcion:
          'Las personas de carne y hueso que se sentarán a la mesa. A cada una le tocará un papel y un don: cuanto mejor las describas, mejor le encajará el suyo.',
        forma: 'circle',
        vacio: {
          // Una bandera: lo que planta una expedicion al llegar. El anj se
          // reserva para los ritos, que es donde significa algo.
          glifo: '⚑',
          titulo: 'Todavía no hay expedición',
          texto: 'Añade al menos cuatro personas. El agente le escribirá a cada una un papel y le repartirá un don.',
        },
        ejemploNombre: 'Marta',
        ejemploDescripcion:
          'Discute por deporte y nunca se calla lo que piensa. Le pega un papel donde tenga que convencer a la mesa de algo.',
        pista: 'El don que le toque depende de lo que cuentes aquí: quien no se calla acaba de epigrafista.',
      },
    },
    {
      id: 'camaras',
      singular: 'cámara',
      plural: 'cámaras',
      minimo: 5,
      sonLugares: true,
      admiteFoto: true,
      // En `rooms` porque de ahí cuelgan el plano y las chinchetas.
      almacen: 'rooms',
      presentacion: {
        titulo: 'Las cámaras de la tumba',
        descripcion:
          'Las estancias reales de tu casa, convertidas en cámaras. Cada vigilia una de ellas está profanada: entrar da un fragmento, pero también una marca.',
        forma: 'square',
        vacio: {
          glifo: '⌂',
          titulo: 'La tumba está sin excavar',
          texto: 'Añade al menos cinco estancias. Con nombres de tu casa de verdad, la tumba se monta sola.',
        },
        sugerencias: [
          'Cámara del Barquero',
          'Pozo de las Ofrendas',
          'Antesala de los Sellos',
          'Corredor de las Estrellas',
          'Sala de la Balanza',
        ],
        ejemploNombre: 'El pasillo largo',
        ejemploDescripcion: 'El que va del salón a los dormitorios, con la lámpara que parpadea.',
        pista: 'Que se reconozca tu casa es lo que hace que la maldición dé un poco de miedo de verdad.',
      },
    },
    {
      id: 'reliquias',
      singular: 'reliquia',
      plural: 'reliquias',
      minimo: 3,
      admiteFoto: true,
      // El tercer campo heredado. No le pega el nombre, pero es donde cabe.
      almacen: 'weapons',
      presentacion: {
        titulo: 'Las reliquias',
        descripcion:
          'Lo que ha salido de la tumba. Una de ellas es la que el saqueador tiene vendida de antemano.',
        forma: 'square',
        vacio: {
          glifo: '◈',
          titulo: 'No se ha sacado nada todavía',
          texto: 'Añade al menos tres piezas. Objetos de tu casa valen: una jarra, un espejo, un abrecartas.',
        },
        sugerencias: [
          'Escarabeo de lapislázuli',
          'Máscara funeraria',
          'Vaso canopo',
          'Collar de cuentas de fayenza',
          'Daga de hierro meteórico',
        ],
        ejemploNombre: 'El escarabeo azul',
        ejemploDescripcion: 'Del tamaño de un puño, con una inscripción que nadie ha sabido leer entera.',
        pista: 'Si es un objeto que existe en tu casa, puedes ponerlo sobre la mesa esa noche.',
      },
    },
    {
      id: 'ritos',
      singular: 'rito',
      plural: 'ritos',
      /*
       * CINCO, NI CUATRO NI SEIS. Con cuatro hay 24 órdenes posibles y la mesa
       * lo resuelve por fuerza bruta en diez minutos; con seis son 720 y la
       * sobremesa se hace larga. Con cinco son 120: bastante para que haga falta
       * poner en común, poco para que se pueda razonar en voz alta.
       */
      minimo: 5,
      /*
       * SIN `almacen`, y es la primera categoría de la plataforma que no lo
       * tiene. Los ritos no son personas ni lugares ni objetos: no hay campo
       * heredado donde quepan, así que viven en `game.entidades.ritos`, que es
       * el destino al que tiene que llegar todo lo demás.
       *
       * Que exista una categoría así es lo que hacía falta para comprobar que
       * el almacén genérico funciona de verdad y no solo sobre el papel.
       */
      presentacion: {
        titulo: 'Los cinco ritos',
        descripcion:
          'Los ritos que vuelven a sellar la tumba. Se ejecutan en un orden exacto, y ese orden es lo que hay que averiguar.',
        forma: 'square',
        vacio: {
          glifo: '☥',
          titulo: 'El sellado no está escrito',
          texto: 'Hacen falta exactamente cinco ritos. Pídeselos al agente si no se te ocurren.',
        },
        sugerencias: [
          'Rito del Agua',
          'Rito del Aliento',
          'Rito del Nombre',
          'Rito de la Balanza',
          'Rito del Silencio',
        ],
        ejemploNombre: 'Rito del Aliento',
        ejemploDescripcion: 'Se sopla sobre la boca de la máscara para devolverle el habla al difunto.',
        pista: 'Cuanto más rituales suenen, mejor se lee el papiro. El orden lo decide la casa, no tú.',
      },
    },
  ],

  /*
   * UN SOLO EJE, y no por pobreza: por precisión.
   *
   * Lo que hay que averiguar en este juego son dos cosas de naturaleza
   * distinta. Quién rompió el sello es una respuesta de eje —una entidad, se
   * acierta o no— y usa la maquinaria de acusación que ya existe: una por
   * persona, para toda la partida, sin decir si acertaste. El orden de los
   * ritos no lo es, y meterlo aquí a la fuerza habría obligado al contrato
   * general a aprender qué es una secuencia.
   *
   * Que la categoría sea la de jugadores no es casualidad: de ahí sale gratis
   * `ejeDeJugadores`, y con él la regla de que quien es señalado no gana
   * delatándose a sí mismo.
   */
  ejes: [
    { id: 'saqueador', pregunta: '¿Quién rompió el sello?', rotulo: 'Quién', categoria: 'expedicionarios' },
  ],

  // Todos exploran a la vez y la vigilia la cierra quien dirige.
  turnos: 'simultaneo',

  acciones: [
    {
      id: 'explorar',
      rotulo: 'Entrar en una cámara',
      fases: ['ronda-abierta'],
      eligeDe: [{ campo: 'camara', categoria: 'camaras', rotulo: '¿En qué cámara entras?' }],
      /*
       * UNA, no dos como en CLUEDO. Allí se puede rectificar porque entrar en
       * una sala no cuesta nada; aquí entrar puede costar una marca, y poder
       * deshacerlo convertiría la decisión —el corazón del juego— en un trámite.
       * Quien quiera entrar dos veces tiene que ser capataz y pagar por ello.
       */
      vecesPorTurno: 1,
    },
    {
      id: 'ofrendar',
      rotulo: 'Dar un amuleto',
      /*
       * También con la vigilia cerrada, y eso importa: la puesta en común es
       * cuando se ve quién está a punto de quedar tocado, y es el momento en que
       * pedir ayuda tiene sentido. Limitarlo a la vigilia abierta habría dejado
       * la negociación sin su momento natural.
       */
      fases: ['ronda-abierta', 'ronda-cerrada'],
      eligeDe: [{ campo: 'aQuien', categoria: 'expedicionarios', rotulo: '¿A quién se lo das?' }],
    },
    {
      id: 'invocar',
      rotulo: 'Usar tu don',
      fases: ['ronda-abierta'],
      /*
       * DOS CATEGORIAS, y opcionales las dos: el capataz excava una CAMARA y el
       * medico sana a una PERSONA. Cual de las dos hace falta depende del don, y
       * el don es secreto, asi que el motor no puede saberlo de antemano: valida
       * lo que venga contra su categoria y deja que el reductor —que si sabe el
       * don— decida cual mira y si era obligatoria.
       */
      eligeOpcional: [
        { campo: 'objetivo', categoria: 'expedicionarios', rotulo: '¿Sobre quién?' },
        { campo: 'camara', categoria: 'camaras', rotulo: '¿En qué cámara excavas?' },
      ],
      /*
       * Sin `eligeDe`: lo que hay que elegir depende del don, y el don es
       * secreto hasta que lo usas. El selector lo pinta la pantalla del juego a
       * partir del estado, no el panel genérico de acciones.
       */
      /*
       * LOS DOS QUE NO SON ENTIDADES DE NADIE, y sin ellos este juego pierde su
       * mecánica central. `don` es CUÁL de los tuyos usas: solo el saqueador
       * tiene dos —el suyo aparente y `falsificar`— y elegir es exactamente la
       * jugada del traidor. `fragmento` es CUÁL de los tuyos publica el
       * Fotógrafo. Ninguno está en una categoría, porque los dos dependen de lo
       * que tú sabes y nadie más.
       *
       * El motor los pasa sin validar; los valida el reductor, que compara el
       * don contra los tuyos y el fragmento contra los que tienes en la mano.
       */
      eligeLibre: [
        { campo: 'don', rotulo: '¿Cuál de tus dones?' },
        { campo: 'fragmento', rotulo: '¿Cuál publicas?' },
      ],
      vecesPorTurno: 1,
    },
    {
      id: 'proponer-orden',
      rotulo: 'Proponer el sellado',
      fases: ['ronda-abierta', 'ronda-cerrada', 'sellado'],
      /*
       * LOS CINCO RITOS, EN ORDEN. `ordenada` es lo que separa esto de «elige
       * cinco»: aqui la posicion ES la respuesta. Y `cuantas: 5` no es
       * decorativo — una propuesta incompleta no se puede ejecutar, y es mejor
       * rechazarla en el motor que descubrirlo al resolver el sellado.
       */
      eligeVarias: [
        { campo: 'orden', categoria: 'ritos', rotulo: 'El orden del sellado', cuantas: 5, ordenada: true },
      ],
      vecesPorTurno: 1,
    },
    {
      id: 'senalar',
      rotulo: 'Señalar al saqueador',
      fases: ['ronda-abierta', 'ronda-cerrada', 'sellado'],
      eligeDe: [{ campo: 'saqueador', categoria: 'expedicionarios', rotulo: '¿Quién rompió el sello?' }],
      vecesPorTurno: 1,
    },
  ],

  /*
   * Seis pestañas, como CLUEDO, porque seis es lo que entra con la muesca en
   * medio. Pero no las mismas: no hay tablón ni cuaderno. Lo que en CLUEDO se
   * apunta en el cuaderno, aquí es el papiro, y tiene pantalla propia porque no
   * es texto libre: son piezas de un puzle que se combinan.
   */
  barra: [
    { pantalla: 'ronda', rotulo: 'Vigilia', icono: 'reloj' },
    { pantalla: 'personaje', rotulo: 'Tú', icono: 'mascara' },
    { pantalla: 'mapa', rotulo: 'Tumba', icono: 'plano' },
    { pantalla: 'papiro', rotulo: 'Papiro', icono: 'papiro' },
    { pantalla: 'sellado', rotulo: 'Sellado', icono: 'anj' },
    { pantalla: 'perfil', rotulo: 'Perfil', icono: 'copa' },
  ],

  /**
   * EL DOSIER DE LA EXPEDICIÓN.
   *
   * Largo, y no por inercia: la barra de este juego no tiene ni `tablon` ni
   * `cuaderno` —son `papiro` y `sellado`— así que el caso, las reglas, las
   * reliquias y quién va en la expedición no tienen otra pantalla donde vivir.
   * Si se quitaran de aquí desaparecerían de la app entera.
   *
   * El DON va arriba del todo, justo después de saber quién eres: es la sección
   * que más se consulta durante la noche y la única que dice qué puedes hacer tú
   * y nadie más.
   */
  dosier: [
    'identidad',
    'senalado',
    'don',
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
    nombre: 'El Escriba',
    descripcion: 'Tu asistente de la expedición con IA',
    icono: 'escarabajo',
    /*
     * NO ES UN MAYORDOMO. Lleva el acta de la excavación: sabe de ritos, de
     * cámaras y de lo que se ha dicho en voz alta, y no ha visto un asesinato
     * en su vida. Trata de tú porque en una expedición se trabaja codo con codo.
     */
    voz:
      'Eres el Escriba de una expedición que abrió una tumba y rompió su sello.\n' +
      'Hablas SIEMPRE en español, con el tono de quien lleva el acta de una excavación: preciso,\n' +
      'breve, algo supersticioso. Tratas de tú, porque en una expedición se trabaja codo con codo.',
    saludo:
      'Tú dirás. Te aviso de entrada: no sé quién rompió el sello, ni qué dicen los fragmentos que ' +
      'no has visto, ni cuál es el orden bueno. Estoy para las reglas y para tu papel.',
    seNiega: 'yo tomo nota de lo que se dice, no de lo que es verdad',
    sinIa: {
      reglas:
        'Cada vigilia entras en una cámara y sales con un fragmento de papiro. Si entras en la que ' +
        'está profanada, sales además con una marca. Al final se propone el orden de los cinco ritos ' +
        'y se ejecuta el más apoyado: si es el bueno, la tumba se sella.',
      personaje:
        'Lo que callas, lo sabes tú mejor que yo. Y tu don se usa una vez por vigilia: dilo en voz ' +
        'alta cuando lo invoques, aunque no digas qué has visto.',
      solucion:
        'Yo tomo nota de lo que se dice, no de lo que es verdad. Quién rompió el sello lo tendrá que ' +
        'sacar la mesa, y se sabrá al amanecer.',
      general:
        'Sin línea con el campamento, mi consejo es el de siempre: pon un fragmento sobre la mesa y ' +
        'mira quién se apresura a explicarlo.',
    },
  },

  // En medio de una tumba no hay escaleras: hay un pozo funerario.
  rotuloCentralDelPlano: 'EL POZO',

  reglas: REGLAS_MOMIA,
  referenciasDeLaTrama: citasDeLaMomia,

  ronda: {
    accionSobre: 'camaras',
    /*
     * CERO rectificaciones, frente a la de CLUEDO. Ver el porqué en `explorar`:
     * si entrar puede costarte una marca, poder deshacerlo vacía la decisión.
     */
    cambiosPermitidos: 0,
  },

  fases: {
    lobby: ['ronda-abierta'],
    'ronda-abierta': ['ronda-cerrada'],
    /*
     * Tres salidas desde la vigilia cerrada, y la tercera es la lección que
     * costó cara en CLUEDO: al retirar una fase intermedia, el desenlace se
     * quedó sin puerta y la partida no se podía terminar. Aquí `desenlace` está
     * desde el principio, para que quien dirige pueda cerrar la noche aunque no
     * se llegue al sellado.
     */
    'ronda-cerrada': ['ronda-abierta', 'sellado', 'desenlace'],
    /* Del sellado se puede volver a jugar: si la mesa se atasca, otra vigilia. */
    sellado: ['ronda-abierta', 'desenlace'],
    /* La Momia no la usa: se juega y se acaba la misma noche. */
    acusaciones: [],
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
    'sellado': 'decision',
    'desenlace': 'fin',
  },

  trofeos: TROFEOS_MOMIA,
  seccionesDeDosier: SECCIONES_MOMIA,
  preparacion: {
    anfitrion: [
      'Imprime el paquete. Los fragmentos de papiro, a UNA CARA: a doble cara se leen al trasluz y se acaba el juego.',
      'Recorta las tiras de papiro y dóblalas por su línea. Agrúpalas por vigilia y mete cada grupo en un sobre.',
      'Cuelga un cartel en cada cámara: es lo que convierte tu casa en la tumba.',
      'Reparte los dosieres cerrados. Cada uno lleva su don y su secreto; nadie abre el de otro.',
      'Ten a mano la tabla de marcas y dos amuletos por persona. La hoja del sellado, sin repartir todavía.',
      'Guarda el papiro del sellado donde nadie lo vea: lleva el orden verdadero y el nombre de quien rompió el sello.',
    ],
    aCiegas: [
      'Busca a alguien que no vaya a jugar, o que acepte jugar sabiéndolo todo. Esa persona prepara el material.',
      'Quien prepara imprime todo —los fragmentos a UNA CARA—, recorta las tiras y las agrupa por vigilia.',
      'Quien dirige recibe solo su guía, los carteles de las cámaras y la tabla de marcas. Nada más.',
      'Quien prepara reparte los dosieres cerrados y va dejando las tiras de cada vigilia antes de que empiece.',
      'Quien prepara le dice a quien dirige, al abrir cada vigilia, qué cámara está profanada.',
      'El papiro del sellado se queda con quien prepara hasta el amanecer.',
    ],
  },

  /*
   * Los rótulos de los telones. Estaban en una tabla dentro de la app y solo
   * cubrían DOS de los ocho, así que el telón de abrir vigilia decía «Comienza la
   * ronda» encima de un cuerpo que decía «Vigilia 3 de 5»: título de un juego y
   * cuerpo de otro, en la misma pantalla y a tamaño grande.
   */
  rotulosDeAviso: {
    'ronda-abierta': 'Comienza la vigilia',
    'ronda-cerrada': 'Se cierra la vigilia',
    sellado: 'Se abre El Sellado',
    acusaciones: 'Hora de señalar',
    desenlace: 'Ha amanecido',
    ganador: 'Alguien ha señalado',
    giro: 'Algo ha cambiado',
  },

  avisos: {
    rondaAbierta: 'Vigilia {ronda} de {total}. Elige cámara.',
    // Al cerrar no se publica nada: lo único que llega a la mesa es lo que
    // alguien decide enseñar con su don.
    rondaCerrada: 'Vigilia cerrada. Lo que nadie ha enseñado, sigue sin saberse.',
    acusaciones: 'Momento de señalar. Un solo nombre, y no se puede cambiar.',
    desenlace: 'Se abre el papiro del sellado.',
  },
  ceremonia: {
    generar: [
      'El escriba moja el cálamo…',
      'Se reparten los dones sin que nadie mire…',
      'Cinco ritos buscan su orden…',
      'Se rompe una tira de papiro en pedazos…',
      'Alguien esconde una mentira entre las verdaderas…',
      'La maldición elige a quién marcar cada noche…',
      'Se sella el papiro que nadie debe leer…',
    ],
    actualizar: [
      'El escriba repasa la lista de la expedición…',
      'A los recién llegados se les busca un don…',
      'Se corrigen los papeles que ya no encajan…',
      'Se reimprimen los dosieres afectados…',
    ],
  },

  documentos: IMPRIMIBLES_MOMIA,
  dosieresPropios: true,
};
