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
import type { ManifiestoDeJuego } from './tipos';

/**
 * Los trofeos de la Momia.
 *
 * Ninguno premia «acertar antes», que es lo que premia CLUEDO. Premian haber
 * sellado, haber desenmascarado, haber salido limpio y haber dado lo que tenías.
 * El último premia ganar siendo el traidor: sin él, ser el saqueador sería un
 * castigo y nadie querría serlo.
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
    glifo: '𓂀',
  },
  {
    id: 'incorrupto',
    nombre: 'Incorrupto',
    descripcion: 'Amaneciste sin una sola marca de la maldición.',
    glifo: '𓋹',
  },
  {
    id: 'mano-abierta',
    nombre: 'Mano Abierta',
    descripcion: 'Diste tus dos amuletos. Ninguno fue para ti.',
    glifo: '𓂉',
  },
  {
    id: 'sombra',
    nombre: 'La Sombra',
    descripcion: 'Eras el saqueador, y amaneció con la tumba abierta.',
    glifo: '𓆙',
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
    audience: 'gm',
    modes: ['host'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'papiro-sellado',
    name: 'El papiro del sellado',
    summary: 'El orden verdadero de los cinco ritos y quién rompió el sello. NO la dejes sobre la mesa.',
    audience: 'gm',
    modes: ['host'],
    defaultOn: true,
    copies: 'una',
    sides: 'una',
  },
  {
    id: 'informe-papiro',
    name: 'Informe del papiro',
    summary: 'La comprobación de que el puzle tiene una sola solución y de que nadie puede resolverlo en solitario.',
    audience: 'gm',
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
      presentacion: {
        titulo: 'La expedición',
        descripcion:
          'Las personas de carne y hueso que se sentarán a la mesa. A cada una le tocará un papel y un don: cuanto mejor las describas, mejor le encajará el suyo.',
        forma: 'circle',
        vacio: {
          glifo: '𓀀',
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
      presentacion: {
        titulo: 'Las cámaras de la tumba',
        descripcion:
          'Las estancias reales de tu casa, convertidas en cámaras. Cada vigilia una de ellas está profanada: entrar da un fragmento, pero también una marca.',
        forma: 'square',
        vacio: {
          glifo: '𓉔',
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
      presentacion: {
        titulo: 'Las reliquias',
        descripcion:
          'Lo que ha salido de la tumba. Una de ellas es la que el saqueador tiene vendida de antemano.',
        forma: 'square',
        vacio: {
          glifo: '𓆲',
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
       * Sin `eligeDe`: lo que hay que elegir depende del don, y el don es
       * secreto hasta que lo usas. El selector lo pinta la pantalla del juego a
       * partir del estado, no el panel genérico de acciones.
       */
      vecesPorTurno: 1,
    },
    {
      id: 'proponer-orden',
      rotulo: 'Proponer el sellado',
      fases: ['ronda-abierta', 'ronda-cerrada', 'sellado'],
      /*
       * Tampoco cabe en `eligeDe`, que sabe pintar «elige uno de esta
       * categoría» y no «ordena estos cinco». Es la limitación que el propio
       * comentario de `DefinicionDeRonda` ya avisaba, y aquí se toca de frente:
       * lo resuelve una pantalla propia, y el informe de arquitectura propone
       * el modelo general.
       */
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

  asistente: {
    nombre: 'El Escriba',
    descripcion: 'Tu asistente de la expedición con IA',
    icono: 'escarabajo',
  },

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

  trofeos: TROFEOS_MOMIA,
  seccionesDeDosier: SECCIONES_MOMIA,
  documentos: IMPRIMIBLES_MOMIA,
};
