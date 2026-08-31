/**
 * «LA FRENTE»: el primer arcade, y el más pobre que se puede escribir a propósito.
 *
 * El móvil enseña un nombre. Quien juega se lo pone en la frente con la pantalla
 * mirando a los demás, así que es el ÚNICO que no ve lo que pone. Los otros le
 * dan pistas, él adivina, y hay sesenta segundos. Al acertar pasa al siguiente;
 * si se atasca, pasa.
 *
 * Entre pulsar el botón y ver la primera palabra hay TRES SEGUNDOS para
 * colocarse el aparato, y no son cortesía: sin ellos la primera carta de cada
 * ronda se la lleva puesta la única persona que no puede verla. Ver
 * `TICS_PARA_COLOCARSE`.
 *
 * ═══ POR QUÉ ESTE JUEGO Y NO OTRO, Y POR QUÉ ES EL PRIMERO ═══
 *
 * Porque no tiene NADA. No tiene servidor, ni cuentas, ni mesa, ni asientos
 * registrados, ni turnos, ni tablero, ni puntuación que nadie tenga que creerse.
 * Un juego rico escrito el primero habría dejado el motor con su forma —es
 * literalmente lo que le pasó al motor de veladas con CLUEDO, y está contado en
 * `INFORME-ARQUITECTURA.md`—. Éste no puede hacerlo: no hay nada suyo que el
 * motor pueda salir a medida de ello.
 *
 * Lo que sí rompe son los tres acoplamientos más duros del otro motor:
 *
 *   · UN SOLO APARATO. `sede: 'dispositivo'`. El reductor corre dentro de Hermes,
 *     en el móvil, y el estado no sale de ahí. `verify:sin-red` lo juega entero
 *     con la capa de red sustituida por una función que LANZA: una sola llamada,
 *     rojo. Eso es un hecho, no una intención declarada en un campo.
 *   · EL RELOJ ES LA REGLA. Los sesenta segundos no son adorno: son la mecánica
 *     entera. Y vencen ENTRANDO por el reductor como un movimiento más, nunca en
 *     un `setTimeout` que decida por su cuenta. Ver `../reloj.ts`.
 *   · LA PROYECCIÓN, AL REVÉS. Y esto es lo más interesante que trae esta fase.
 *     Ver el bloque de abajo.
 *
 * ═══ LA PROYECCIÓN AL REVÉS: QUÉ ES «OTRO ASIENTO» CON UN SOLO APARATO ═══
 *
 * En cualquier juego de cartas la proyección tapa LO MÍO para que no lo veas TÚ.
 * Aquí es al contrario: la palabra la ven todos MENOS quien la lleva puesta. Si
 * la proyección fuera un concepto de tablero —«esconde la mano del rival»— este
 * juego no cabría, y habría que resolverlo con una bandera dentro del mueble:
 * pintar o no pintar la palabra según quién esté mirando, que es una regla de
 * juego cableada en la capa de pintado. La segunda vez que pasara eso, la capa de
 * pintado sabría de dos juegos.
 *
 * La firma de `Proyeccion` —`(estado, quien: QuienMira) => unknown`— ya lo dice
 * entero, y su cabecera lo dice con estas palabras: «la proyección no es tapar lo
 * mío: es esto es lo que se ve desde aquí». Con eso, La Frente se escribe sin
 * pedirle nada nuevo al núcleo:
 *
 *   · `ESPECTADOR` (o sea `null`, «nadie en concreto») es LA SALA: la gente que
 *     mira la pantalla porque la pantalla les mira a ellos. VE LA PALABRA. Y no
 *     es una interpretación forzada del concepto: la cabecera de `tipos.ts` ya
 *     nombra «la pantalla común de un juego de fiesta, el aparato apoyado en el
 *     centro» como el caso del espectador. Aquí el aparato está apoyado en una
 *     frente, que es la misma idea con otro soporte.
 *   · CUALQUIER ASIENTO es quien lo lleva puesto. NO VE LA PALABRA, ni el resto
 *     del montón, ni el azar —con la semilla y el contador se calcula la carta
 *     siguiente—, ni las que se le han escapado.
 *
 * Y la pregunta que hay que responder para escribir esto sin trampa: ¿qué
 * significa «otro asiento» cuando hay UN aparato? No significa otra pantalla.
 * Significa OTRO PUNTO DE VISTA, y con un solo aparato los dos puntos de vista
 * los separa la orientación física de la pantalla en vez de la red. La proyección
 * es la que convierte esa separación en algo que se puede escribir, comprobar y
 * reusar: el día que La Frente tenga una segunda pantalla —un televisor, el móvil
 * de otro haciendo de marcador— la vista de asiento ya está escrita y es la
 * correcta. Sin ella habría que inventarla ese día, con el juego en producción.
 *
 * ═══ AVISO PARA QUIEN ESCRIBA `verify:mesa` EN LA FASE 2 ═══
 *
 * `loSecreto` devuelve, por contrato, «los valores que jamás pueden aparecer en
 * la proyección de OTRO ASIENTO». En este juego eso se cumple: la palabra no sale
 * en la vista de ningún asiento. SÍ SALE en la del espectador, y tiene que salir,
 * porque el espectador es la sala.
 *
 * O sea que un `verify:mesa` escrito pensando solo en juegos de mano oculta —«el
 * secreto no puede aparecer en NINGUNA proyección salvo la de su dueño»— pondría
 * La Frente en rojo, y el rojo estaría mal. La formulación correcta es la del
 * contrato y hay que respetarla al pie de la letra: por asiento, y un espectador
 * no tiene asiento. Queda escrito aquí para que en la fase 2 sea una decisión y
 * no un descubrimiento.
 *
 * Y HAY UNA SEGUNDA TRAMPA, que es la que de verdad iba a saltar y que este aviso
 * no contaba en su primera versión: la comprobación es de APARICIÓN de valores, y
 * un valor de poca entropía —el número 0, un entero de dos cifras— aparece en
 * cualquier vista por casualidad. Lo que se declara secreto tiene que ser
 * distinguible; lo que no lo sea se defiende cerrando el juego de campos de la
 * vista, no buscándolo. Está contado entero, con los números medidos, en
 * `loSecretoDeLaFrente`.
 *
 * ═══ LO QUE ESTE FICHERO NO IMPORTA, Y ES LA MITAD DE SU VALOR ═══
 *
 * Nada de `node:`, nada de React, nada de `server/`, nada de `shared/juegos` y
 * nada de `shared/live`. Solo el contrato del arcade y la mecánica del azar. Es
 * lo que permite que el MISMO fichero lo lea el móvil y lo lea un comprobador del
 * servidor, que es la línea de la que cuelga todo: `shared/` son las reglas,
 * `server/` es la autoridad.
 */
import { barajar, sembrar } from '../../mecanicas/azar';
import type { Azar } from '../../mecanicas/azar';
import { esTic, NUNCA, plazoDentroDe, quedanTics, ticsPara, vencido } from '../reloj';
import type { Plazo, Tic } from '../reloj';
import type { ContextoMovimiento, Movimiento } from '../movimiento';
import { ESPECTADOR } from '../tipos';
import type { ManifiestoDeArcade, QuienMira } from '../tipos';

// ---------------------------------------------------------------------------
// LA BARAJA
//
// ═══ EL RIESGO DE ESTE JUEGO NO ESTÁ EN EL MOTOR: ESTÁ AQUÍ ═══
//
// La mecánica de charadas es libre y no la protege nadie: las reglas de un juego
// de mesa no son objeto de copyright ni de patente, y hay sentencias que lo
// aplican a juegos concretos. Lo que sí está protegido es la EXPRESIÓN, y en un
// juego de adivinar nombres la expresión ES el contenido de las cartas.
//
// Así que la baraja se escribe a mano, carta a carta, y NO la genera un modelo.
// El peligro concreto y ya nombrado en el diseño es ése: que la escriba una IA y
// meta un personaje de un estudio sin que nadie haya tomado una decisión. Aquí
// cada carta la ha tecleado alguien que sabía en qué familia la metía.
//
// LAS SEIS FAMILIAS, Y POR QUÉ CADA UNA ES SEGURA:
//
//   · OFICIOS, ANIMALES, OBJETOS y CONCEPTOS son palabras del idioma. No hay
//     nada que licenciar en «fontanero» ni en «erizo».
//   · PERSONAJES HISTÓRICOS REALES, y todos muertos hace mucho. Ninguna persona
//     viva ni reciente: el derecho a la propia imagen y al honor no caduca con la
//     obra, y una carta con el nombre de alguien vivo es un problema distinto
//     —y peor— que el de una marca. Y una segunda condición que se descubrió
//     tarde y está explicada entera sobre la lista: MUERTO HACE MUCHO NO BASTA,
//     porque hay nombres de personas históricas que un titular vivo tiene
//     REGISTRADOS COMO MARCA.
//   · PERSONAJES DE DOMINIO PÚBLICO: Cervantes, el romancero, los cuentos
//     populares recogidos por Perrault y los Grimm, «Las mil y una noches»,
//     Stoker, Homero. Obras cuyo plazo de protección se agotó hace generaciones.
//
// Y LO QUE NO ENTRA, POR ESCRITO: nada de Disney, Marvel, Nintendo, DC ni anime
// contemporáneo. Ninguna marca registrada, ningún personaje de un estudio vivo,
// ninguna versión concreta de un cuento popular que evoque una película. La regla
// no es «me suena que se puede»: es que se sepa decir de qué familia sale la
// carta. Lo comprueba `verify:procedencia`, que contrasta esta lista contra una
// lista negra de marcas escrita en fichero y revisable.
//
// EL TAMAÑO. Ciento veintiséis cartas para rondas de sesenta segundos en las
// que se resuelven diez o quince. Bastantes para que una tarde entera no repita
// —cada ronda vuelve a barajar la baraja completa, ver `otraRonda`— y pocas para
// que quepan en el binario sin que nadie lo note.
//
// Y ESE NÚMERO LO AFIRMA UN COMPROBADOR, que es la única razón por la que se
// puede escribir aquí. Las tres primeras versiones de esta cabecera decían
// «ciento veinticuatro» con ciento veintiséis cartas en el árbol: nadie las
// había contado desde que se escribieron las listas, y el número servía además
// para JUSTIFICAR una decisión de diseño ahí abajo, en `otraRonda`. Un argumento
// apoyado en un dato que se desmiente contando enseña que los comentarios de
// esta casa no se comprueban, y eso vale menos que no comentar. Ahora
// `verify:procedencia` afirma `BARAJA.length` y que no hay repetidas: el día que
// entre una carta más, se pone rojo y pide venir aquí a cambiar la palabra.
// ---------------------------------------------------------------------------

/** Oficios. Palabras del idioma: no hay nada que licenciar en un fontanero. */
const OFICIOS: readonly string[] = [
  'Panadero',
  'Astronauta',
  'Bombero',
  'Cartero',
  'Fontanero',
  'Veterinaria',
  'Arqueóloga',
  'Torero',
  'Peluquero',
  'Juez',
  'Pastor',
  'Farero',
  'Relojero',
  'Domadora de leones',
  'Socorrista',
  'Deshollinador',
  'Espía',
  'Notario',
  'Cirujana',
  'Camarero',
];

/** Animales. Se eligen los que se pueden IMITAR o describir sin decir el nombre. */
const ANIMALES: readonly string[] = [
  'Erizo',
  'Ornitorrinco',
  'Pulpo',
  'Flamenco',
  'Perezoso',
  'Murciélago',
  'Jirafa',
  'Topo',
  'Cocodrilo',
  'Ardilla',
  'Morsa',
  'Escarabajo pelotero',
  'Mantis religiosa',
  'Lombriz',
  'Cangrejo ermitaño',
  'Búho',
  'Camaleón',
  'Hipopótamo',
  'Suricata',
  'Salmón',
  'Abeja reina',
  'Caracol',
  'Oso hormiguero',
  'Mosquito',
];

/**
 * Objetos.
 *
 * CUIDADO CON LAS MARCAS QUE PARECEN PALABRAS. Media docena de objetos de andar
 * por casa se nombran en castellano con una marca registrada —«tirita», «táper»,
 * «kleenex», «post-it», «velcro»—, y son marcas de verdad aunque el diccionario
 * las haya recogido. Aquí se dicen con el nombre común a propósito.
 */
const OBJETOS: readonly string[] = [
  'Paraguas',
  'Sacacorchos',
  'Escalera',
  'Semáforo',
  'Cepillo de dientes',
  'Aspiradora',
  'Acordeón',
  'Brújula',
  'Molinillo de café',
  'Extintor',
  'Hamaca',
  'Bombilla',
  'Cremallera',
  'Chupete',
  'Pañuelo de papel',
  'Fiambrera',
  'Embudo',
  'Regadera',
  'Colador',
  'Almohada',
  'Espejo retrovisor',
  'Cortacésped',
  'Peonza',
  'Máquina de escribir',
  'Bola de discoteca',
  'Ancla',
];

/**
 * Conceptos.
 *
 * Son las mejores cartas del mazo y las peores de escribir: no se pueden imitar,
 * hay que explicarlas, y por eso es donde la mesa se ríe. Ninguna es un nombre
 * propio de nada.
 */
const CONCEPTOS: readonly string[] = [
  'Los celos',
  'La resaca',
  'El insomnio',
  'La nostalgia',
  'El vértigo',
  'La suerte',
  'El silencio',
  'La gravedad',
  'El eco',
  'La rutina',
  'El aburrimiento',
  'La envidia',
  'La paciencia',
  'El hipo',
  'La cuesta de enero',
  'El madrugón',
  'La siesta',
  'El sobresalto',
  'La casualidad',
  'El mal de ojo',
];

/**
 * Personajes históricos REALES, y todos muertos hace mucho.
 *
 * Ninguna persona viva y ninguna reciente, y no por prudencia estética: el
 * derecho a la propia imagen y al honor es de la persona, no de una obra, y no
 * caduca cuando caduca un copyright. Una carta con el nombre de alguien vivo es
 * un problema de otra materia —y más caro— que el de una marca registrada.
 *
 * ═══ Y UNA SEGUNDA REGLA, QUE ESTA LISTA NO TENÍA Y LE FALTABA ═══
 *
 * ESTAR MUERTO HACE MUCHO NO BASTA. Hay nombres de personas históricas que un
 * titular VIVO tiene registrados como marca, y una marca no caduca con la
 * persona: se renueva mientras alguien pague y la use. Esta lista llevaba dos
 * —se han ido las dos— y el árbol ya conocía la distinción sin haberla aplicado
 * aquí: la entrada de `Tarzan` de la lista negra dice con estas palabras que
 * dominio público y marca son dos cosas distintas.
 *
 * El criterio para no convertir esto en una purga sin fin —Beethoven es un perro
 * de película, Napoleón es un coñac y Tesla es un coche, y ninguno de los tres
 * es un problema— es estrecho y hay que poder decidirlo mirando:
 *
 *   HAY UN TITULAR ACTIVO QUE REGISTRA O LICENCIA ESE NOMBRE COMO MARCA EN
 *   MERCANCÍA DE CONSUMO, Y CON MÁS RAZÓN EN LA CLASE DE LOS JUGUETES Y JUEGOS.
 *
 * No es la fecha de la muerte: es si hay alguien cobrando por el nombre hoy. Las
 * dos que salieron y por qué están en `server/scripts/marcas-registradas.ts`,
 * con su familia propia, para que `verify:procedencia` las cace si vuelven —que
 * es lo que de verdad cierra esto, porque una regla que solo vive en un
 * comentario se salta sin querer—.
 */
const HISTORICOS: readonly string[] = [
  'Cleopatra',
  'Julio César',
  'Marie Curie',
  'Leonardo da Vinci',
  'Juana de Arco',
  'Cristóbal Colón',
  'Arquímedes',
  'Beethoven',
  'Gandhi',
  'Isabel la Católica',
  'Napoleón',
  'Galileo',
  'Copérnico',
  'Rosalind Franklin',
  'Miguel de Cervantes',
  'Hipatia de Alejandría',
  'Nikola Tesla',
  'Ada Lovelace',
  'Sócrates',
  'Tutankamón',
];

/**
 * Personajes de DOMINIO PÚBLICO, y de obras cuyo plazo se agotó hace
 * generaciones: Cervantes, Rojas, Zorrilla, el romancero castellano, los cuentos
 * populares de Perrault y los Grimm, «Las mil y una noches», Homero, Stoker.
 *
 * NO ENTRA NINGUNA VERSIÓN CONCRETA de un cuento popular. El cuento es libre; el
 * diseño que hizo un estudio de él, no, y hay una sentencia célebre sobre
 * exactamente eso: copiar las reglas es legítimo y copiar el aspecto hundió al
 * que lo hizo. Por eso están «El gato con botas» y «Caperucita Roja», que son los
 * cuentos, y no está ninguno de los que en castellano se dicen ya con el nombre
 * de una película.
 */
const DOMINIO_PUBLICO: readonly string[] = [
  'Don Quijote',
  'Sancho Panza',
  'La Celestina',
  'El Lazarillo de Tormes',
  'Don Juan Tenorio',
  'El Cid Campeador',
  'Caperucita Roja',
  'El lobo feroz',
  'El flautista de Hamelín',
  'Robin Hood',
  'Drácula',
  'Ulises',
  'Medusa',
  'El rey Midas',
  'El gato con botas',
  'Sherezade',
];

/**
 * LA BARAJA ENTERA, en el orden en que se escribió.
 *
 * Va compilada dentro en esta fase, y eso es una decisión con fecha de caducidad
 * escrita: `shared/mecanicas/mazo.ts` —barajas versionadas— llega con la SEGUNDA
 * baraja y no antes. Escribirlo hoy sería inventar el formato de versionado de un
 * problema que tiene un solo caso, que es la forma exacta en que una abstracción
 * sale a medida del primero que la usa.
 *
 * El orden de aquí NO es el orden de juego: `barajar` lo revuelve con el azar
 * sembrado en cada ronda. Se conserva agrupado por familias porque así se audita:
 * quien revise si hay una marca colada lee seis listas cortas y no una de ciento
 * veintiséis renglones.
 */
export const BARAJA: readonly string[] = [
  ...OFICIOS,
  ...ANIMALES,
  ...OBJETOS,
  ...CONCEPTOS,
  ...HISTORICOS,
  ...DOMINIO_PUBLICO,
];

// ---------------------------------------------------------------------------
// El reloj de este juego
// ---------------------------------------------------------------------------

/** El identificador con el que se instala y con el que se le pide todo. */
export const FRENTE = 'frente';

/**
 * Sesenta segundos, que SON la regla y no una decoración.
 *
 * Está aquí y no en el mueble por lo mismo que el resto: una constante de pintado
 * se puede cambiar sin que nadie se entere, y ésta cambia el juego. Quien la
 * toque está reescribiendo las reglas y tiene que verlo en este fichero.
 */
export const SEGUNDOS_DE_RONDA = 60;

/**
 * A qué ritmo entra el tiempo. DIEZ TICS POR SEGUNDO.
 *
 * ═══ POR QUÉ DIEZ Y NO UNO, Y POR QUÉ NO SESENTA ═══
 *
 * Uno por segundo sería lo barato y deja el juego peor de dos maneras a la vez:
 * el cronómetro daría saltos de un segundo entero —en los últimos cinco, que son
 * los que se gritan, se nota muchísimo— y el instante en que vence la ronda
 * tendría un segundo de holgura, o sea que un acierto en el último suspiro
 * contaría o no contaría según con qué pie se levantara el redondeo.
 *
 * Sesenta sería el ritmo de un juego de fotogramas y aquí no pinta nada: el
 * mueble es `formulario` —vistas normales, un cronómetro grande— y no hay nada
 * que animar entre dos décimas. Serían cincuenta llamadas por segundo al reductor
 * para no cambiar nada, en un móvil que además tiene que aguantar sesenta
 * segundos con la pantalla encendida sobre una frente.
 *
 * Con diez, la cuenta atrás se pinta en décimas, la ronda dura EXACTAMENTE 600
 * tics, y el estado solo cambia cuando pasa algo: ver `alVencerElPlazo`.
 */
export const TICK_HZ = 10;

/** Lo que dura una ronda, en tics. Seiscientos, y sale de las dos constantes. */
export const TICS_DE_RONDA = ticsPara(SEGUNDOS_DE_RONDA, TICK_HZ);

/**
 * TRES SEGUNDOS PARA COLOCÁRSELO, y son una regla del juego y no un adorno.
 *
 * ═══ EL FALLO QUE ESTO EVITA, QUE ERA EL PEOR DEL JUEGO ═══
 *
 * La primera versión repartía la carta y se ponía a jugar EN EL MISMO
 * movimiento que dispara el botón. O sea: quien pulsa EMPEZAR está mirando el
 * cristal —acaba de leer «pon el móvil en tu frente», el botón está debajo— y se
 * lleva el aparato a la cabeza DESPUÉS. La primera palabra de cada ronda se la
 * enseñaba a la única persona que no puede verla, siempre, no a veces. Y con
 * OTRA_RONDA era peor todavía: ese botón está en la pantalla de resultados, que
 * es la que mira quien acaba de jugar justo antes de pasar el móvil, así que la
 * carta se quemaba y además la sala se enteraba antes de tiempo.
 *
 * No lo cazaba ningún tipo ni ningún comprobador porque no es un fallo de
 * cálculo: el estado era correcto en todo momento. Lo que faltaba era un
 * MOMENTO, o sea una rama del reductor, y por eso se arregla aquí y no en la
 * pantalla. Arreglarlo en la pantalla —«no pintes la palabra los tres primeros
 * segundos»— sería una regla del juego escrita en la capa de pintado, que es
 * exactamente lo que este motor existe para no volver a hacer.
 *
 * Tres segundos, y no cinco ni uno: uno no da tiempo a levantar el brazo, y
 * cinco se hacen largos quince veces por tarde. Es el mismo orden de magnitud
 * que la cuenta atrás de cualquier juego de fiesta, y va contado en tics como
 * todo lo demás para que la partida siga reejecutándose igual.
 */
export const SEGUNDOS_PARA_COLOCARSE = 3;

/** Lo que dura el «colócatelo», en tics. Treinta. */
export const TICS_PARA_COLOCARSE = ticsPara(SEGUNDOS_PARA_COLOCARSE, TICK_HZ);

// ---------------------------------------------------------------------------
// Los movimientos
// ---------------------------------------------------------------------------

/**
 * Los cuatro movimientos, con el prefijo del juego.
 *
 * El prefijo no es decorativo: `arcade:` lo reserva la plataforma para el tic, y
 * un juego que llamara `tic` a un movimiento suyo chocaría. Con `frente:` delante
 * no puede haber colisión ni hoy ni cuando haya doce arcades en el mismo proceso.
 */
export const EMPEZAR = 'frente:empezar';
export const ACIERTO = 'frente:acierto';
export const PASO = 'frente:paso';
export const OTRA_RONDA = 'frente:otra';

// ---------------------------------------------------------------------------
// El estado
// ---------------------------------------------------------------------------

/**
 * En qué momento va la partida.
 *
 * ═══ EL CUARTO QUE FALTABA NO ERA «PAUSADA»: ERA «COLÓCATELO» ═══
 *
 * Aquí había tres, y la cabecera de este bloque presumía de ello con un
 * argumento que sigue siendo bueno —«una fase que nadie puede alcanzar es una
 * rama del reductor que nadie prueba»— aplicado al estado equivocado. El que
 * sobra sigue sobrando: NO HAY «pausada», porque un juego que se juega con el
 * móvil apoyado en una frente no se pausa; no se ve el botón.
 *
 * El que faltaba es `'preparados'`: los tres segundos entre pulsar y ver, sin
 * los cuales la primera palabra de cada ronda se la lleva puesta quien tiene que
 * adivinarla. Ver `TICS_PARA_COLOCARSE`, donde está contado entero.
 *
 * Y no es una fase que nadie alcance: se pasa por ella DOS VECES POR RONDA en el
 * sentido de que la atraviesan las dos puertas —`EMPEZAR` y `OTRA_RONDA`— y el
 * guion de `oro:arcade` la cruza cuatro veces.
 */
export type MomentoDeLaFrente = 'antes' | 'preparados' | 'jugando' | 'despues';

/**
 * TODO lo que sabe una partida de La Frente. Es dato y nada más que dato.
 *
 * ═══ LAS TRES REGLAS QUE CUMPLE, Y QUÉ ROMPE CADA UNA SI SE INCUMPLE ═══
 *
 *  1. SOBREVIVE A `shared/mecanicas/canonico.ts`. Objetos llanos, listas,
 *     cadenas, números finitos y `null`. Ni fechas, ni mapas, ni `undefined`. Sin
 *     esto, dos estados idénticos podrían producir cadenas distintas —o peor, dos
 *     distintos la misma— y `oro:arcade` y `verify:determinismo` dejarían de
 *     significar nada.
 *  2. EL AZAR VIVE AQUÍ DENTRO. Semilla y contador, para poder rebobinar. Y por
 *     eso mismo es SECRETO: quien lo tenga calcula la carta siguiente.
 *  3. EL PLAZO ES UN INSTANTE ABSOLUTO, no una cuenta atrás. Una cuenta atrás
 *     habría que decrementarla en cada tic, o sea que el estado cambiaría diez
 *     veces por segundo sin que pase nada. Así se escribe una vez y se compara.
 */
export interface EstadoDeLaFrente {
  momento: MomentoDeLaFrente;

  /**
   * El azar de esta partida.
   *
   * Nace sembrado con cero y sin gastar ni una tirada, y lo REEMPLAZA `empezar`
   * con la semilla que trae el contexto del movimiento. Se escribe así, y no como
   * un campo que pueda faltar, porque `canonico.ts` rechaza `undefined` dentro de
   * un objeto: un campo ausente y un campo sin definir dejarían de distinguirse
   * al serializar.
   *
   * Que la semilla la reparta el CONTEXTO y no este fichero tiene una razón que
   * hoy no se ve y en la fase 2 sí: en una mesa con autoridad la elige el
   * servidor, y si la eligiera el dispositivo un cliente manipulado probaría
   * semillas hasta encontrar la baraja que le conviene.
   */
  azar: Azar;

  /** Las que quedan por salir, ya barajadas. La primera es la siguiente. */
  monton: string[];

  /** La que se lleva puesta. `null` antes de empezar y cuando se acabó. */
  enLaFrente: string | null;

  /** Las acertadas de esta ronda, en el orden en que cayeron. */
  aciertos: string[];

  /** Las que se pasaron o se quedaron sin adivinar al vencer el tiempo. */
  pasadas: string[];

  /**
   * El plazo que corre ahora, en tics. `NUNCA` mientras no haya empezado.
   *
   * QUÉ SIGNIFICA LO DICE `momento`, y son dos cosas: en `'preparados'` es
   * cuándo EMPIEZA la ronda —los tres segundos para colocarse el móvil— y en
   * `'jugando'` es cuándo se ACABA. Un campo y no dos, porque dos dejarían uno
   * apagado en cada mitad de la partida y un campo apagado se lee mal.
   */
  plazo: Plazo;

  /** Cuántas rondas van. Empieza en cero y `empezar` la pone a uno. */
  ronda: number;
}

/**
 * Una partida recién abierta, antes de que nadie toque nada.
 *
 * No baraja, no reparte y no gasta ni una tirada de azar: todo eso pasa en
 * `empezar`, que es un movimiento y por tanto queda en el registro. Si barajara
 * aquí, la partida no sería reconstruible a partir de (estado inicial +
 * movimientos), que es la única forma que hay de reejecutarla — y con ella se
 * caerían `oro:arcade` y la mitad del valor de la pureza.
 */
export function partidaNueva(): EstadoDeLaFrente {
  return {
    momento: 'antes',
    azar: sembrar(0),
    monton: [],
    enLaFrente: null,
    aciertos: [],
    pasadas: [],
    plazo: { vence: NUNCA },
    ronda: 0,
  };
}

// ---------------------------------------------------------------------------
// EL REDUCTOR
// ---------------------------------------------------------------------------

/**
 * La única función obligatoria de un arcade: `(estado, movimiento, ctx) => estado`.
 *
 * ═══ LAS TRES REGLAS DEL CONTRATO, Y CÓMO SE CUMPLEN AQUÍ ═══
 *
 *  1. NO MUTA. Cada rama devuelve un objeto nuevo con `...estado`, y las listas se
 *     copian en vez de empujarse. Un `push` sobre `estado.aciertos` haría que
 *     reejecutar la partida diera un resultado distinto del que hubo.
 *  2. NO MIRA EL RELOJ NI EL AZAR DEL SISTEMA. El tiempo llega en `ctx.tic` y la
 *     semilla en `ctx.azar`. Lo vigila `verify:pureza`, que barre este fichero.
 *  3. SIEMPRE DEVUELVE UN ESTADO. Un movimiento que no procede devuelve el que
 *     recibió, y no lanza: quien hospeda no tiene forma de distinguir «lo
 *     rechacé» de «reventé», y en un móvil sin consola eso es una pantalla
 *     congelada sin explicación.
 *
 * ═══ Y UNA CUARTA QUE ES DE ESTE JUEGO: EL TIC MANDA ═══
 *
 * El reloj entra por la misma puerta que el pulgar. Un gesto que llega después de
 * que el plazo haya vencido —porque el tic que lo cierra todavía no ha entrado—
 * NO cuenta: cierra la ronda. Sin eso, el último acierto valdría o no valdría
 * según qué llegara antes al reductor, y eso es una regla decidida por el orden
 * de la cola de eventos del móvil.
 */
export function avanzarLaFrente(
  estado: EstadoDeLaFrente,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): EstadoDeLaFrente {
  if (esTic(movimiento)) return alVencerElPlazo(estado, ctx.tic);

  switch (movimiento.tipo) {
    case EMPEZAR:
      return empezar(estado, ctx);
    case ACIERTO:
      return resolver(estado, ctx.tic, true);
    case PASO:
      return resolver(estado, ctx.tic, false);
    case OTRA_RONDA:
      return otraRonda(estado, ctx.tic);
    default:
      /*
       * Un movimiento que este juego no conoce se ignora en silencio y devuelve
       * el estado. No es dejadez: el mismo reductor tiene que poder recibir
       * movimientos de la plataforma que todavía no existen —el sexto verbo del
       * canal traerá los suyos en la fase 2— sin que un juego de un solo aparato
       * se caiga por no reconocerlos.
       */
      return estado;
  }
}

/**
 * EL RELOJ, que aquí es media mecánica.
 *
 * Devuelve EL MISMO OBJETO cuando no ha vencido nada, y eso no es una
 * optimización: es lo que hace que diez tics por segundo cuesten cero. El estado
 * solo cambia cuando de verdad cambia algo, así que quien pinte puede comparar
 * por identidad y no repintar. Con una cuenta atrás dentro del estado, cada tic
 * produciría un objeto nuevo y la pantalla se reharía diez veces por segundo para
 * enseñar lo mismo.
 *
 * DOS PLAZOS DISTINTOS ENTRAN POR AQUÍ, y el mismo campo sirve para los dos:
 * mientras uno se coloca el móvil, `plazo` es cuándo empieza la ronda; jugando,
 * cuándo se acaba. Un segundo campo —`empiezaEn` al lado de `vence`— habría
 * dejado un plazo apagado en la mitad de la partida, que es la clase de campo
 * que alguien lee mal seis meses después. El momento dice qué significa el
 * plazo, y el momento no se puede dejar sin mirar.
 *
 * `'despues'` conserva el plazo de la ronda que acaba de terminar, o sea que
 * está VENCIDO: por eso se mira el momento antes que el plazo y no al revés.
 */
function alVencerElPlazo(estado: EstadoDeLaFrente, ahora: Tic): EstadoDeLaFrente {
  if (estado.momento !== 'jugando' && estado.momento !== 'preparados') return estado;
  if (!vencido(estado.plazo, ahora)) return estado;
  return estado.momento === 'preparados' ? empiezaLaRonda(estado, ahora) : seAcabo(estado);
}

/**
 * Se acabó el «colócatelo»: ahora sí se enseña la palabra y arranca el reloj.
 *
 * ═══ LA RONDA SE CUENTA DESDE `ahora` Y NO DESDE `plazo.vence` ═══
 *
 * Los dos números son casi siempre el mismo —quien hospeda mete los tics de uno
 * en uno, así que el tic que hace vencer el plazo es exactamente el del
 * vencimiento— y se separan en un caso: el móvil estuvo un rato al fondo y
 * `local.ts` saltó al tic que tocaba metiendo uno solo. Contando desde
 * `plazo.vence`, ese salto se comería la ronda entera antes de que nadie viera
 * la palabra: se abriría y se cerraría en el mismo movimiento. Contando desde
 * `ahora`, quien vuelve encuentra sus sesenta segundos.
 *
 * Es el mismo criterio que ya tenía `otraRonda` —el plazo se cuenta desde el
 * movimiento que la abre— y no cambia la reejecutabilidad: `ahora` es el tic del
 * movimiento, que está en el registro como todos los demás.
 */
function empiezaLaRonda(estado: EstadoDeLaFrente, ahora: Tic): EstadoDeLaFrente {
  return { ...estado, momento: 'jugando', plazo: plazoDentroDe(ahora, TICS_DE_RONDA) };
}

/**
 * Se acabó el tiempo.
 *
 * La que se llevaba puesta cuenta como pasada, y esto es producto y no
 * contabilidad: al terminar, la mesa entera quiere saber cuál era la que se le
 * había quedado. Perderla en silencio es quitarle el final al juego.
 */
function seAcabo(estado: EstadoDeLaFrente): EstadoDeLaFrente {
  const puesta = estado.enLaFrente;
  return {
    ...estado,
    momento: 'despues',
    enLaFrente: null,
    pasadas: puesta === null ? estado.pasadas : [...estado.pasadas, puesta],
  };
}

/**
 * Empieza la primera ronda: se siembra el azar, se baraja y se reparte TAPADA.
 *
 * Deja la partida en `'preparados'` y no en `'jugando'`: quien pulsa este botón
 * está mirando la pantalla. Ver `TICS_PARA_COLOCARSE`.
 *
 * Solo vale desde `'antes'`. Repetirlo a mitad de partida devolvería el estado
 * tal cual, que es lo correcto: un segundo `empezar` es un móvil que mandó dos
 * veces el mismo movimiento, no una petición de volver a barajar. Para eso está
 * `OTRA_RONDA`.
 */
function empezar(estado: EstadoDeLaFrente, ctx: ContextoMovimiento): EstadoDeLaFrente {
  if (estado.momento !== 'antes') return estado;
  return repartirRonda(estado, sembrar(ctx.azar), ctx.tic, estado.ronda + 1);
}

/**
 * Otra ronda, con el móvil ya en otra frente.
 *
 * Y ES LA PUERTA MÁS DELICADA DE LAS DOS: este botón está en la pantalla de
 * resultados, o sea que lo pulsa quien acaba de jugar —mirando el cristal, con
 * el móvil todavía en la mano— y el aparato cambia de manos justo después. Por
 * eso también sale a `'preparados'`, con la carta ya repartida y tapada.
 *
 * ═══ POR QUÉ VUELVE A BARAJAR LA BARAJA ENTERA ═══
 *
 * Lo fino sería seguir con el montón que quedó y no repetir cartas en toda la
 * tarde. Cuesta una regla más —qué hacer cuando el montón se queda corto, cuándo
 * rellenarlo, si las ya vistas vuelven o no— y esas tres decisiones no las pide
 * nadie: con ciento veintiséis cartas y quince por ronda, la primera repetición
 * llega cuando ya nadie se acuerda. Este juego es el más pobre a propósito, y una
 * regla que no se nota es una regla que sobra.
 *
 * LO QUE SÍ SE CONSERVA ES EL AZAR: la ronda nueva sigue la cadena donde la dejó
 * la anterior, no vuelve a sembrar. Así una tarde entera de rondas se reejecuta
 * desde una sola semilla y la lista de movimientos, sin más datos.
 */
function otraRonda(estado: EstadoDeLaFrente, ahora: Tic): EstadoDeLaFrente {
  if (estado.momento !== 'despues') return estado;
  return repartirRonda(estado, estado.azar, ahora, estado.ronda + 1);
}

/**
 * Baraja, reparte la primera y da tres segundos para colocárselo.
 *
 * Lo común de las dos puertas —`EMPEZAR` y `OTRA_RONDA`—, y es a propósito que
 * las dos pasen por aquí: las dos las pulsa alguien que está MIRANDO la
 * pantalla, así que las dos tienen que dejar la carta repartida y tapada. Que la
 * segunda sea la peligrosa —el móvil cambia de manos justo ahí— y aun así se
 * arregle en el mismo sitio es lo que impide que una de las dos se quede sin
 * arreglar el día que alguien toque una.
 *
 * La carta ya está repartida y ya está en el estado durante el «colócatelo». No
 * se reparte al arrancar la ronda porque entonces habría dos sitios donde se
 * consume el azar y el orden de las tiradas dependería de por dónde se entrara —
 * que es justo lo que `oro:arcade` existe para cazar—. Lo que la tapa mientras
 * tanto es la PROYECCIÓN, que es donde se decide qué se ve desde dónde.
 */
function repartirRonda(
  estado: EstadoDeLaFrente,
  azarDeLaRonda: Azar,
  ahora: Tic,
  ronda: number,
): EstadoDeLaFrente {
  const revuelta = barajar(azarDeLaRonda, BARAJA);
  const { carta, resto } = laSiguiente(revuelta.valor);
  return {
    momento: carta === null ? 'despues' : 'preparados',
    azar: revuelta.azar,
    monton: resto,
    enLaFrente: carta,
    aciertos: [],
    pasadas: [],
    plazo: plazoDentroDe(ahora, TICS_PARA_COLOCARSE),
    ronda,
  };
}

/**
 * Un gesto: acertó o pasa.
 *
 * Es la misma función para los dos porque es el mismo movimiento con la palabra
 * yendo a una lista o a la otra. Escribirlas separadas invitaría a que una de las
 * dos se olvidara de comprobar el plazo, que es justo la comprobación que decide
 * si el último acierto vale.
 */
function resolver(estado: EstadoDeLaFrente, ahora: Tic, acerto: boolean): EstadoDeLaFrente {
  if (estado.momento !== 'jugando') return estado;
  const puesta = estado.enLaFrente;
  if (puesta === null) return estado;

  /*
   * EL RELOJ VA PRIMERO. Si el plazo ya venció y el tic que lo cierra todavía no
   * ha entrado por la puerta, este gesto llega tarde y no cuenta: se cierra la
   * ronda con la palabra puesta como pasada, exactamente igual que si el tic
   * hubiera llegado antes. Sin esto, que un acierto en el último suspiro valiera
   * o no dependería del orden de la cola de eventos del móvil, que no es una
   * regla de nada.
   */
  if (vencido(estado.plazo, ahora)) return seAcabo(estado);

  const { carta, resto } = laSiguiente(estado.monton);
  return {
    ...estado,
    momento: carta === null ? 'despues' : 'jugando',
    monton: resto,
    enLaFrente: carta,
    aciertos: acerto ? [...estado.aciertos, puesta] : estado.aciertos,
    pasadas: acerto ? estado.pasadas : [...estado.pasadas, puesta],
  };
}

/**
 * La primera del montón y lo que queda detrás.
 *
 * `null` cuando se acaba, y quien llama cierra la ronda. Que un montón se termine
 * no es un error del programa —es una mesa que ha ido rapidísimo— así que no
 * lanza. El `undefined` que devuelve el índice con `noUncheckedIndexedAccess`
 * encendido se traduce aquí a `null` y no viaja: `canonico.ts` rechaza
 * `undefined` dentro de un objeto, con razón.
 */
function laSiguiente(monton: readonly string[]): { carta: string | null; resto: string[] } {
  const carta = monton[0];
  if (carta === undefined) return { carta: null, resto: [] };
  return { carta, resto: monton.slice(1) };
}

// ---------------------------------------------------------------------------
// LA PROYECCIÓN, QUE AQUÍ VA AL REVÉS
// ---------------------------------------------------------------------------

/**
 * LO QUE VE LA SALA: todo el mundo menos quien lo lleva puesto.
 *
 * Es la vista que de verdad se pinta en el móvil, porque la pantalla está mirando
 * a la sala. Lleva la palabra, que es justamente lo que el otro no puede ver.
 */
export interface VistaDeLaSala {
  desde: 'la-sala';
  momento: MomentoDeLaFrente;
  ronda: number;
  /**
   * La palabra que hay que adivinar. `null` fuera de la ronda.
   *
   * Y «fuera de la ronda» incluye el `'preparados'`: durante esos tres segundos
   * la carta ya está repartida y NO LA VE NADIE, tampoco la sala. Es el único
   * sitio del juego donde la vista del espectador esconde algo, y tiene toda la
   * razón de ser: mientras uno se coloca el aparato, la pantalla le está mirando
   * a ÉL. La sala no es «los que están enfrente», es «quien no lo lleva puesto»,
   * y en esos tres segundos no hay nadie ahí.
   */
  palabra: string | null;
  /** Cuándo vence, en tics. Quien pinta resta con el tic que él mismo lleva. */
  plazo: Plazo;
  aciertos: number;
  pasadas: number;
  /** Cuántas quedan en el montón. El número no dice cuáles son. */
  quedan: number;
  /** Al terminar, las dos listas enteras. Antes, vacías: ver `loSecretoDeLaFrente`. */
  acertadas: string[];
  falladas: string[];
}

/**
 * LO QUE VE QUIEN LO LLEVA PUESTO. Ni la palabra, ni el montón, ni el azar.
 *
 * ═══ ¿PARA QUÉ UNA VISTA QUE NADIE MIRA? ═══
 *
 * Porque no mirarla es una circunstancia de HOY —la pantalla está del revés— y no
 * una propiedad del juego. El día que haya un televisor, o un segundo móvil
 * haciendo de marcador, o alguien jugando en remoto, esta vista es la que sale
 * por ahí y ya está escrita. Escribirla ese día, con el juego publicado, es como
 * se filtran las cosas: el camino nuevo es el que nadie prueba.
 *
 * Y mientras tanto no es teórica: es la que hace comprobable la promesa entera de
 * este juego. `verify:mesa` llamará a `loSecretoDeLaFrente` y comprobará que
 * ninguno de esos valores aparece aquí. Sin esta vista no habría nada que
 * comprobar, solo una intención.
 *
 * MIENTRAS SE JUEGA NO LLEVA NI UNA PALABRA. Ni la puesta, ni las que quedan, ni
 * siquiera las falladas — y esas últimas cuestan explicarse: quien lleva el móvil
 * OYÓ las pistas de una palabra que no adivinó, así que enseñársela a mitad de
 * ronda es darle lo único que la mesa consiguió esconderle. Al terminar, en
 * cambio, las dos listas salen enteras: ahí ya no hay nada que esconder y ese
 * recuento ES el final del juego.
 */
export interface VistaDeQuienLoLleva {
  desde: 'la-frente';
  momento: MomentoDeLaFrente;
  ronda: number;
  plazo: Plazo;
  aciertos: number;
  pasadas: number;
  quedan: number;
  acertadas: string[];
  falladas: string[];
}

/** Lo que sale hacia quien mira, sea la sala o quien lo lleva puesto. */
export type VistaDeLaFrente = VistaDeLaSala | VistaDeQuienLoLleva;

/**
 * LA PROYECCIÓN. Y aquí está la inversión, en tres líneas.
 *
 * `ESPECTADOR` —«nadie en concreto»— es la sala y VE LA PALABRA. Un asiento
 * cualquiera es quien lo lleva puesto y NO LA VE. En cualquier otro juego sería
 * al contrario, y por eso este juego es el que demuestra que la proyección es un
 * concepto de plataforma y no un ayudante para esconder cartas.
 *
 * Ni una rama mira QUIÉN es el asiento: da igual cómo se llame. En un juego de un
 * solo aparato no hay asientos que distinguir, y la vista de asiento tiene que
 * ser la misma para cualquiera que pueda llegar a existir. Preguntar por el
 * nombre sería inventar aquí la identidad que este juego presume de no tener.
 */
export function proyectarLaFrente(estado: EstadoDeLaFrente, quien: QuienMira): VistaDeLaFrente {
  const seAcabo_ = estado.momento === 'despues';
  const comun = {
    momento: estado.momento,
    ronda: estado.ronda,
    plazo: estado.plazo,
    aciertos: estado.aciertos.length,
    pasadas: estado.pasadas.length,
    quedan: estado.monton.length,
    /*
     * Las listas solo salen cuando la ronda terminó, y salen en las DOS vistas.
     * Mientras se juega van vacías incluso en la de la sala: no porque la sala no
     * pueda verlas —las ha dicho ella en voz alta— sino porque una lista que va
     * creciendo en pantalla es un chivato para quien lleva el móvil, que oye a
     * doce personas reaccionar a lo que aparece.
     */
    acertadas: seAcabo_ ? [...estado.aciertos] : [],
    falladas: seAcabo_ ? [...estado.pasadas] : [],
  };

  if (quien === ESPECTADOR) {
    /*
     * La palabra solo sale JUGANDO. En `'preparados'` la carta ya está en el
     * estado y todavía no la puede ver nadie —quien pulsó el botón sigue con el
     * cristal delante de la cara— y ésa es la mitad de la reparación del fallo
     * más gordo que tuvo este juego. La otra mitad es el momento nuevo del
     * reductor; sin las dos, la primera palabra de cada ronda se quemaba.
     */
    const jugando = estado.momento === 'jugando';
    return { desde: 'la-sala', palabra: jugando ? estado.enLaFrente : null, ...comun };
  }
  return { desde: 'la-frente', ...comun };
}

/**
 * LO QUE JAMÁS PUEDE SALIR EN LA PROYECCIÓN DE OTRO ASIENTO. Solo para pruebas.
 *
 * El motor no la llama nunca: la llama `verify:mesa`. Y sin ella este juego
 * podría registrar la identidad como proyección, pasar todos los comprobadores en
 * verde y enseñarle la palabra a quien la lleva en la frente — que es el único
 * fallo que hay que evitar aquí, y sería mudo.
 *
 * ═══ QUÉ ES SECRETO EN LA FRENTE, Y CUÁNDO DEJA DE SERLO ═══
 *
 *   · SIEMPRE: el montón que queda —quien lo vea sabe lo que viene— y el azar
 *     ENTERO, que es el montón dicho de otra forma: con la semilla y el
 *     acumulador y cuatro líneas se calcula la baraja completa.
 *   · MIENTRAS SE JUEGA O UNO SE COLOCA EL MÓVIL, ADEMÁS: la palabra puesta, las
 *     falladas y las acertadas. Las acertadas las dijo él mismo en voz alta y no
 *     son un secreto de verdad, y aun así entran: la vista de asiento no manda
 *     NINGUNA palabra durante la ronda, y una lista de secretos más estrecha que
 *     la vista deja un hueco por donde el día de mañana entra un campo nuevo sin
 *     que nadie lo compruebe.
 *   · AL TERMINAR: nada de eso. El recuento final ES el juego, y las dos listas
 *     salen enteras en las dos vistas. Que esto dependa del estado y no sea una
 *     lista fija es lo que hace la comprobación exacta en vez de aproximada.
 *
 * ═══ EL AZAR ENTRA COMO OBJETO Y NO COMO DOS NÚMEROS SUELTOS ═══
 *
 * Esto parece un detalle de estilo y es la diferencia entre un comprobador que
 * sirve y uno que se acaba desactivando. La comprobación que cuelga de esta
 * función es de APARICIÓN: ninguno de estos valores puede aparecer en la vista de
 * un asiento. Y una vista de asiento está llena de números pequeños —`ronda`,
 * `aciertos`, `pasadas`, `quedan`—.
 *
 * La primera versión declaraba `estado.azar.semilla` y `estado.azar.acumulador`
 * DESNUDOS, y con eso la comprobación choca sola:
 *
 *   · En una partida recién abierta el azar está sin sembrar, o sea que los dos
 *     valores secretos son el número 0 — y en la vista de asiento hay cuatro
 *     ceros. Los 2 de 2 «aparecen». Rojo del cien por cien en el estado con el
 *     que ARRANCA toda partida.
 *   · Y jugando, por pura coincidencia de dígitos entre el acumulador y los
 *     números de la vista, unas nueve semillas de cada dos mil daban rojo.
 *
 * Hoy no salta porque el guion nunca corre esa comprobación sobre una partida
 * recién abierta y porque la semilla que usa no colisiona. La fase 2, que
 * barrerá todos los momentos y varias semillas, se encontraría ese rojo — y el
 * rojo estaría MAL, que es exactamente el mecanismo que el §5.5 del diseño
 * describe: un comprobador que grita cuando no pasa nada acaba desactivado, y
 * quien lo desactive lo hará debilitándolo («los números no cuentan»), con lo que
 * el día que un número secreto de verdad se escape ya nadie lo mirará.
 *
 * Con el azar entero, el valor que se busca es `{"acumulador":…,"semilla":…,
 * "tiradas":…}`, que no coincide con nada por casualidad. LO QUE SE PIERDE, dicho
 * para que no parezca gratis: una filtración PARCIAL —que la vista sacara solo el
 * acumulador, como número suelto— ya no la caza esta lista. Se cubre por otro
 * lado y a propósito: las dos vistas son tipos cerrados y `verify:sin-red`
 * comprueba que el juego de campos de la vista de asiento es EXACTAMENTE el que
 * hay escrito, así que un campo nuevo —se llame como se llame y lleve lo que
 * lleve— pone rojo esa comprobación. Un secreto de poca entropía no se defiende
 * buscándolo: se defiende cerrando la puerta por donde saldría.
 *
 * `NUNCA` es la palabra clave de la cabecera: estos valores no pueden salir en la
 * vista de un ASIENTO. En la de la sala sí, y tiene que ser así. Ver el aviso de
 * la cabecera del fichero, que es lo que hace este juego distinto de todos los
 * que vendrán.
 */
export function loSecretoDeLaFrente(estado: EstadoDeLaFrente): unknown[] {
  const siempre: unknown[] = [...estado.monton, estado.azar];
  if (estado.momento !== 'jugando' && estado.momento !== 'preparados') return siempre;
  const puesta = estado.enLaFrente;
  return [
    ...(puesta === null ? [] : [puesta]),
    ...estado.aciertos,
    ...estado.pasadas,
    ...siempre,
  ];
}

// ---------------------------------------------------------------------------
// Lo que necesita quien pinta
// ---------------------------------------------------------------------------

/**
 * Cuántos segundos quedan, redondeando hacia arriba.
 *
 * ═══ POR QUÉ ESTO NO ESTÁ EN EL ESTADO NI EN LA VISTA ═══
 *
 * Porque el estado no sabe qué hora es, y no debe saberlo: es lo que hace que la
 * misma partida reejecutada seis meses después dé exactamente lo mismo. El tic
 * actual lo lleva QUIEN HOSPEDA —el bucle del móvil, ver `app/src/arcade/
 * local.ts`— y por eso el cálculo se hace aquí, con las dos mitades juntas, y no
 * a ojo en el mueble con una resta suelta.
 *
 * RECIBE EL PLAZO Y NO EL ESTADO, y ese detalle es el que hace que sirva. El
 * mueble pinta desde la PROYECCIÓN —lo que se ve desde la sala— y no desde el
 * estado, que es la disciplina que hará falta el día que haya un juego con
 * servidor. Si esto pidiera el estado entero, el mueble tendría que tenerlo a mano
 * y esa disciplina se rompería en el primer sitio donde importa.
 *
 * Hacia arriba porque un cronómetro que enseña «0» durante un segundo entero
 * mientras todavía se puede jugar es mentira, y aquí el último segundo es el que
 * decide la ronda.
 */
export function segundosQueQuedan(plazo: Plazo, ahora: Tic): number {
  return Math.ceil(quedanTics(plazo, ahora) / TICK_HZ);
}

// ---------------------------------------------------------------------------
// EL MANIFIESTO
// ---------------------------------------------------------------------------

/**
 * LA FRENTE, dicho como dato.
 *
 * Once campos, y los cuatro que hubo que pensar llevan su razón escrita al lado.
 * Los demás son lo que son.
 */
export const MANIFIESTO_FRENTE: ManifiestoDeArcade = {
  id: FRENTE,
  nombre: 'La Frente',
  /*
   * El gancho es la línea que hace que alguien toque la tarjeta, y no es el
   * `lema` de una velada: allí es literatura para un dosier impreso, aquí es la
   * frase que se lee de pie en el metro decidiendo si abrir esto o no. Dice la
   * postura —el móvil en la frente— porque la postura ES el juego: quien la
   * entiende ya sabe jugar.
   */
  gancho: 'Póntelo en la frente. Todos lo ven menos tú.',
  icono: 'mando',

  /*
   * DOS COMO MÍNIMO, y no uno. Solo no se puede jugar: hace falta alguien que dé
   * las pistas, y ése es el juego entero. El máximo de doce no es una regla del
   * reductor —al motor le da igual cuánta gente hay delante, y de hecho no puede
   * saberlo— sino lo que cabe alrededor de un móvil sin que la mitad no lo vea.
   */
  jugadores: { minimo: 2, maximo: 12 },

  /*
   * EL APARATO MANDA, y es lo que esta fase entera existe para demostrar: un
   * juego que no toca el servidor NI UNA VEZ. No es una bandera que apague la
   * red: es una sede que nunca la pidió. Lo comprueba `verify:sin-red` jugando
   * una partida completa con la capa de red sustituida por una función que lanza.
   */
  sede: 'dispositivo',
  tickHz: TICK_HZ,

  /*
   * Vistas normales: un cronómetro grande, una palabra enorme y dos contadores.
   * Coste cero de pintado, ni una dependencia nueva, y —lo que importa de
   * verdad— es un mueble GENÉRICO: lo pinta la plataforma, así que el día que
   * llegue un arcade de fuera puede usar el mismo sin estar en el binario.
   */
  mueble: 'formulario',

  /*
   * SÍ HAY SECRETOS, y son los de este juego los que hacen la palabra interesante.
   * Declararlo `true` no afloja nada: OBLIGA a registrar proyección y `loSecreto`,
   * y sin las dos el arranque falla. Ver la cabecera de este fichero para la
   * vuelta de tuerca —aquí el que no puede ver es el que lleva el aparato— que es
   * lo que convierte la proyección en un concepto de plataforma.
   */
  secretos: true,

  /*
   * ═══ `marcador: 'ninguno'`, Y AQUÍ ESTÁ EL RAZONAMIENTO ═══
   *
   * La tentación es `{ tipo: 'cifra', rotulo: 'Aciertos', sentido: 'mas-alto' }`:
   * el juego cuenta aciertos, y contarlos parece publicar una cifra. No lo es, y
   * la diferencia está escrita en el propio tipo: `'ninguno'` no significa «no
   * lleva la cuenta de nada», significa que NO HAY UNA CIFRA QUE LA PLATAFORMA
   * TENGA QUE CREERSE. Los aciertos viven dentro de este estado, se enseñan en la
   * misma pantalla donde se consiguieron y no suben a ningún sitio.
   *
   * Y hay una razón más dura que la definición. De `marcador` se DERIVA la
   * exigencia de reejecutabilidad, o sea de que un servidor pueda verificar la
   * cifra reejecutando la partida. Con `sede: 'dispositivo'` no hay servidor que
   * la verifique: una cifra declarada aquí sería exactamente lo que el diseño
   * llama «un récord enviado como cifra suelta», que se rechaza siempre. Declarar
   * `'cifra'` sería prometer una verificación que nadie puede hacer, que es peor
   * que no prometer nada.
   *
   * Cuando La Frente quiera una tabla de récords necesitará sede de servidor y
   * una repetición que se pueda reejecutar. Ese día se cambia esta palabra, y se
   * verá en el diff — que es toda la gracia de que sea una unión cerrada
   * obligatoria y no un campo que se pueda omitir.
   *
   * NO EXIME DE SER DETERMINISTA. Este reductor lo es, y `oro:arcade` lo
   * comprueba byte a byte con `canonico.ts`. Renunciar a la verificación de una
   * cifra que no existe no es renunciar a la reejecutabilidad.
   */
  marcador: { tipo: 'ninguno' },

  /*
   * ═══ `dominio-publico`, Y NO `mecanica-generica` ═══
   *
   * Las dos parecían caber. La mecánica de charadas es libre —las reglas de un
   * juego de mesa no son objeto de copyright ni de patente— y «adivinar una
   * palabra» está literalmente puesto como ejemplo de mecánica genérica en
   * `tipos.ts`.
   *
   * Gana `dominio-publico` porque es la afirmación más fuerte de las dos y
   * porque es la que se puede comprobar leyendo el juego, que es el criterio que
   * el propio campo pide. «Mecánica genérica» describe un patrón sin dueño;
   * «dominio público» dice que ESTE juego —las charadas, que el mismo comentario
   * de `tipos.ts` nombra al lado del parchís y el dominó— es de todos. Y en un
   * juego cuyo riesgo entero está en el contenido de las cartas y no en el motor,
   * la declaración tiene que hablar de lo que de verdad se está afirmando: que ni
   * las reglas ni la baraja son de nadie.
   */
  procedencia: { tipo: 'dominio-publico' },
};
