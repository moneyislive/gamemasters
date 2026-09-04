/**
 * LOS MUEBLES DE LA SALA: con qué se pinta cada arcade, y adónde se navega.
 *
 * ═══ QUÉ ES UN MUEBLE Y QUÉ NO ES ═══
 *
 * Un mueble es la SUPERFICIE donde se pinta un juego, y es un dato del manifiesto
 * y nunca una decisión de la plataforma: si la capa de pintado se decidiera dentro
 * del motor —mirando el estado, o el `tickHz`, o si hay tablero— el motor saldría
 * a medida del primer minijuego que se escriba.
 *
 * Y NO es una pantalla de `expo-router`, aunque aquí cada uno tenga la suya. La
 * diferencia importa: un mueble sirve a MUCHOS juegos. La ruta `/formulario` la
 * abren La Frente y cualquier otro arcade que declare ese mueble, con el
 * identificador del juego como parámetro. Si hubiera una ruta por juego, cada
 * arcade nuevo exigiría publicar una versión de la app.
 *
 * ═══ POR QUÉ ESTA TABLA ES UN `Record` SOBRE LA UNIÓN CERRADA ═══
 *
 * Porque la app es un binario compilado y los muebles que sabe pintar están
 * dentro. Con una cadena libre, un arcade podría declarar `'mi-mueble'` y en el
 * móvil no saldría NADA —sin error, sin aviso— hasta que alguien abriera la Sala.
 * Con el `Record`, añadir un mueble al contrato no compila hasta que la app sabe
 * qué hacer con él. Es el mismo acoplamiento honesto que `PANTALLAS` de
 * `app/app/(juego)/_layout.tsx`: se paga una línea y a cambio el compilador no
 * deja estrenarse a medias.
 *
 * ═══ AQUÍ DECÍA QUE DOS DE LOS CUATRO NO SE PINTABAN. SE PINTAN LOS CUATRO ═══
 *
 * Decía que había «dos entregados —`formulario` con La Frente y La Ronda, y
 * `lienzo` con El Arcade—», que los otros dos enseñaban una pantalla explicando
 * qué fase los traería, y en mayúsculas que «HOY NO SE PUEDE LLEGAR A NINGUNA DE
 * LAS DOS, porque no hay ningún arcade instalado que declare esos muebles». Las
 * dos afirmaciones caducaron, y por caminos distintos, que conviene separar porque
 * la segunda es la que se vuelve a escribir sola:
 *
 *   · Los muebles llegaron. `tablero` lo estrenó Riberas —el delta hexagonal— y
 *     `escena` lo estrenó La Peonza, que es a propósito el arcade más pobre que se
 *     podía escribir, empujar y mirar, para que el mueble no saliera con la forma
 *     de su primer inquilino. Con eso, los cuatro `seSabePintar` de la tabla de
 *     abajo dicen `true` y ninguna de las cuatro rutas de `app/app/(arcade)/` monta
 *     ya `MueblePendiente`: las cuatro son la misma línea sobre `PintarEnElMueble`.
 *     La pantalla de «pendiente» decía aquí que seguía en el árbol «sin que la
 *     importe nadie; quien la borre no rompe nada». Borrada: una pantalla que
 *     explica por qué un mueble aún no existe, en un binario donde los cuatro
 *     existen, no es código de reserva — es una respuesta falsa esperando a que
 *     alguien la enchufe.
 *   · Y el reparto de juegos que la frase daba por cierto tampoco lo era ya: La
 *     Ronda NO es de `formulario`. Se movió a `tablero` al hacerla jugable, porque
 *     un formulario pinta la lista de `opciones()` y nada más, y un juego de bazas
 *     en el que no se ve la baza no es que se vea mal: no se puede jugar. Está
 *     razonado entero en el §7 de `docs/MOTOR-DE-ARCADE.md`, que corrige ahí su
 *     propia lista.
 *
 * Así que quién estrena cada uno, que es lo que sí vale la pena tener a mano y es
 * lo mismo que dice el `cuandoLlega` de cada fila: La Frente el `formulario`,
 * Riberas el `tablero` —y desde la fase 6 lo usa también La Ronda—, El Arcade el
 * `lienzo` y La Peonza la `escena`.
 *
 * ═══ LA DISTINCIÓN QUE SÍ QUEDA VIVA NO ES ÉSA: ES `quienPinta` ═══
 *
 * Que los cuatro se pinten no los iguala, y el bloque de arriba, tal y como estaba
 * escrito, invitaba a creer que sí: contaba la única diferencia que había como si
 * fuera la única que puede haber. Era un CALENDARIO —«esto todavía no, esto ya»— y
 * los calendarios se cumplen. Lo que separa de verdad a `formulario` y `tablero`
 * de `lienzo` y `escena` es de quién son los píxeles, y eso no lo mueve ninguna
 * fase: los dos primeros los pinta LA PLATAFORMA a partir de lo que el juego
 * declara, así que pueden pintar un arcade que este binario no conoce —es lo que
 * hace `LOS_MUEBLES_GENERICOS` de `./pintados.ts`—; los otros dos los pinta EL
 * JUEGO, sus píxeles viajan dentro del binario, y un arcade de fuera que los
 * declare se queda con la tarjeta apagada. No es un fallo que arreglar: es la
 * decisión de producto del §7 —el enchufe alcanza a las reglas y no a los
 * píxeles—, y por eso vive como campo `quienPinta` en el interfaz de abajo, con su
 * razonamiento, y no como un comentario que se pueda perder al reordenar la tabla.
 *
 * La diferencia práctica entre los dos campos es la fecha de caducidad, y por eso
 * son dos. `seSabePintar` es un estado que se mueve —fue `false` para dos de estos
 * cuatro y hoy no lo es para ninguno— y quien lo lea tiene que aceptar que mañana
 * diga otra cosa. `quienPinta` no se mueve, porque no dice lo que falta sino lo
 * que el mueble ES.
 *
 * ═══ Y `seSabePintar` NO ES LA PREGUNTA QUE HAY QUE HACERSE ═══
 *
 * Dice si esta app sabe pintar ese MUEBLE, y eso no basta para saber si un arcade
 * concreto se puede jugar: hacen falta además los píxeles de ESE JUEGO. Preguntar
 * solo esto fue lo que hizo que «La Ronda» saliera en la Sala con tarjeta pulsable
 * y al tocarla dijera que no se sabía pintar. La pregunta buena es
 * `seSabePintar(manifiesto)` de `./pintados.ts`, que junta las dos mitades.
 */
import type { Href } from 'expo-router';
import type { ManifiestoDeArcade, MuebleDeArcade } from '../../../shared/arcade';

/**
 * Las cuatro rutas del grupo `(arcade)`, dichas como unión y no como cadena.
 *
 * ═══ POR QUÉ NO ES `string`, Y CÓMO SE DESCUBRIÓ ═══
 *
 * `app.json` declara `typedRoutes: true`, así que `expo-router` GENERA la unión
 * de rutas que existen de verdad a partir del árbol de ficheros, y `router.push`
 * solo acepta una de ellas. Con `ruta: string` esto compilaba igualmente
 * mientras el fichero generado —`.expo/types/router.d.ts`, que no está
 * versionado— no se hubiera puesto al día. En cuanto alguien levanta la app, se
 * regenera y el tipado se vuelve estricto.
 *
 * O sea que era un verde que dependía de un artefacto local: pasaba en la
 * máquina donde nadie había arrancado el servidor de desarrollo y fallaba en la
 * de al lado. Se cazó al integrar, corriendo la batería después de haber jugado
 * una partida — no antes.
 *
 * Escrito como unión, el compilador exige que cada entrada de `MUEBLES`
 * corresponda a un fichero real de `app/app/(arcade)/`. Un mueble nuevo sin su
 * pantalla no compila, que es la misma disciplina que `MuebleDeArcade` tiene en
 * el manifiesto.
 */
export type RutaDeMueble = '/formulario' | '/tablero' | '/lienzo' | '/escena';

/** Qué sabe la app de cada mueble. */
export interface Mueble {
  /** La ruta de `expo-router` que lo pinta. Coincide con el nombre del mueble. */
  ruta: RutaDeMueble;
  /** ¿Sabe la app pintarlo ya, o solo sabe decir que falta? */
  seSabePintar: boolean;
  /**
   * QUIÉN PONE LOS PÍXELES, que no es lo mismo que si esta app los tiene.
   *
   * `la-plataforma` —`formulario` y `tablero`— significa que un cliente puede
   * pintar un juego que NO CONOCE, a partir de lo que el juego declara. `el-juego`
   * —`lienzo` y `escena`— significa que los píxeles viven en el binario del propio
   * juego, que es la decisión del §7: el enchufe alcanza a las reglas y no a los
   * píxeles.
   *
   * Hace falta separarlo de `seSabePintar` porque son dos preguntas y la Sala las
   * contesta distinto. Un `formulario` de un arcade de fuera que esta app todavía
   * no pinta es un «todavía no» —llegará con una versión nueva y el juego no tiene
   * que hacer nada—; un `lienzo` de un juego que no viene dentro es un «nunca por
   * esta vía». Fundirlas manda a quien lee a hacer algo que no sirve.
   *
   * El cliente de escritorio tiene este mismo campo y con los mismos valores. Son
   * dos tablas y no una a propósito —cada cliente sabe qué pinta ÉL— pero esta
   * columna es del CONTRATO y tiene que coincidir en las dos.
   */
  quienPinta: 'la-plataforma' | 'el-juego';
  /** Qué es, en una línea, para la pantalla que explica lo que falta. */
  loQueEs: string;
  /** Qué juego lo estrena, para no prometer fechas sino trabajo. */
  cuandoLlega: string;
}

export const MUEBLES: Record<MuebleDeArcade, Mueble> = {
  formulario: {
    ruta: '/formulario',
    quienPinta: 'la-plataforma',
    seSabePintar: true,
    loQueEs: 'Vistas normales: botones, listas, un cronómetro grande. Coste cero.',
    cuandoLlega: 'Ya está: lo estrena La Frente.',
  },
  tablero: {
    ruta: '/tablero',
    quienPinta: 'la-plataforma',
    seSabePintar: true,
    loQueEs: 'Una topología declarada, pintada con SVG. El tablero es dato, no reductor.',
    cuandoLlega: 'Ya está: lo estrena Riberas, el delta hexagonal.',
  },
  lienzo: {
    ruta: '/lienzo',
    quienPinta: 'el-juego',
    seSabePintar: true,
    loQueEs: 'Dos dimensiones a ritmo de fotograma, dibujadas con Skia sobre la GPU.',
    cuandoLlega: 'Ya está: lo estrena El Arcade, el de sesenta fotogramas por segundo.',
  },
  /*
   * ═══ ESTE DECÍA `seSabePintar: false` Y «CUESTA MEGABYTES A TODO EL MUNDO» ═══
   *
   * La segunda mitad ya no es cierta, y por eso la primera ha cambiado. `three` y
   * `@react-three/fiber` ESTÁN DENTRO del binario desde antes de que existiera la
   * Sala de Arcade: los trae `app/src/escena-avatar.tsx`, que es el retrato 3D de
   * las veladas, y están declarados en `app/package.json`. El coste en megabytes
   * está pagado desde hace meses; lo que faltaba era la puerta.
   *
   * Lo que la fase 5 entrega es esa puerta —`app/src/arcade/escena.tsx` y su
   * escena— con «La Peonza» detrás, que es deliberadamente el arcade más pobre
   * posible: empujar y mirar. Un juego de demostración rico se convertiría en el
   * modelo de cómo se escribe un arcade de escena, y entonces el mueble saldría
   * con su forma.
   *
   * Y lo que sigue pendiente, dicho donde se lee: PROBARLO EN UN IPHONE FÍSICO. La
   * documentación de r3f advierte de cierres `EXC_BAD_ACCESS` en simulador y esa
   * prueba no se ha hecho todavía — ni con esta escena ni con la del avatar, que
   * lleva más tiempo. Ningún comprobador puede cubrirlo: un guion de Node no abre
   * un contexto de GL.
   */
  escena: {
    ruta: '/escena',
    quienPinta: 'el-juego',
    seSabePintar: true,
    loQueEs: 'Tres dimensiones, y solo a través del lienzo común de la app.',
    cuandoLlega: 'Ya está: lo estrena La Peonza, que es la puerta y no el juego.',
  },
};

/**
 * Adónde se navega para jugar a un arcade.
 *
 * El juego viaja como parámetro y el mueble como ruta, y no al revés. Con una
 * ruta por juego —`/frente`— cada arcade nuevo obligaría a publicar una versión de
 * la app, que es exactamente lo que el enchufe de la fase 5 existe para evitar.
 *
 * Y va como OBJETO y no como cadena montada a mano. Con la cadena había que
 * acordarse de `encodeURIComponent` —un identificador de arcade con un espacio o
 * un `&` habría partido la consulta en dos— y además `router.push` no puede
 * comprobar una plantilla: `${ruta}?arcade=${id}` es `string` para el
 * compilador, por muy literal que sea el trozo de delante. Con el objeto, la
 * ruta se comprueba y los parámetros los escapa `expo-router`.
 */
export function rutaDeArcade(manifiesto: ManifiestoDeArcade): Href {
  return { pathname: MUEBLES[manifiesto.mueble].ruta, params: { arcade: manifiesto.id } };
}

/**
 * LA SALA DE ARCADE, y por qué no se parece al taller ni a un panel de juegos.
 *
 * ═══ DE DÓNDE SALE ESTO ═══
 *
 * De una maqueta que se hizo, se miró y se eligió, y no de una idea escrita. Se
 * probaron tres mundos —un salón recreativo de 1926, una vitrina de láminas
 * grabadas y una sala de máquinas— y después tres GRADOS de modernización del
 * que ganó. Éste es el grado de en medio, y el encargo era exacto: conservar la
 * disposición de la información y el color que brilla, y quitar el disfraz de
 * época.
 *
 * Antes de esto, la Sala llevaba siete colores escritos a mano —azul-negro
 * #06110f, turquesa #5fd4c8, naranja— y ningún fichero del arcade importaba el
 * tema de la casa. No se parecía al taller ni a nada: era el único sitio del
 * producto sin sistema.
 *
 * ═══ LAS TRES DECISIONES QUE SOSTIENEN ESTO ═══
 *
 * 1. NO HAY MATERIA. Ni metal, ni textura, ni relieve, ni madera. Las
 *    superficies se separan por un FILO de un píxel y por elevación, no por
 *    material. Es lo que la aleja a la vez del taller —que es fieltro, caoba y
 *    pan de oro— y del salón recreativo del que viene, que era latón y esmalte
 *    y se veía «demasiado antiguo».
 *
 * 2. EL COLOR VIVE EN UN SOLO SITIO Y ES GRANDE. La placa del nombre es un
 *    campo de acento saturado que ocupa media ficha. Todo lo demás es gris frío.
 *    Un acento repartido en veinte detalles se apaga; concentrado en un plano
 *    grande, brilla. La versión anterior de esta Sala hacía lo contrario y ésa
 *    es la razón medible de que se leyera barata.
 *
 * 3. EL ORNAMENTO CUENTA ALGO. Ver `CUENTA_DE_AFORO` aquí abajo.
 *
 * ═══ EL ACENTO ES INTERCAMBIABLE, Y ESO ES ESTRUCTURA ═══
 *
 * Sólo tres de los trece colores se tiñen: `acento`, `acentoHondo` y `halo`.
 * Los diez neutros no se enteran de que el tema cambia. La consecuencia es que
 * la Sala se puede repintar entera de ámbar, de verde o de carmesí y sigue
 * siendo la misma sala: lo que la sostiene es el gris frío, el filo de un píxel
 * y la retícula, no el violeta.
 *
 * Hoy el tema es VIOLETA para todo el mundo. La tabla de abajo declara los
 * cuatro porque el mecanismo es el que decide la forma del código, y dónde se
 * guarda la preferencia de cada cual está sin decidir a propósito: es una
 * pregunta de producto —¿un ajuste? ¿por aparato o por cuenta?— y no de pintura.
 *
 * ═══ Y SIGUE SIN USAR `useTema()` ═══
 *
 * Por lo de siempre, que no ha cambiado: `useTema()` devuelve el tema DE LA
 * VELADA QUE SE ESTÉ JUGANDO. Un arcade pintado con él saldría verde fieltro
 * durante una partida de CLUEDO y color arena durante una de la Momia, según lo
 * que hubiera abierto antes.
 */
export const SALA = {
  /* ---------- Los diez neutros. No se tiñen nunca. ---------- */

  /** El fondo de la pantalla. Frío y muy oscuro: el acento tiene que poder gritar encima. */
  suelo: '#080A0E',
  /** El fondo de una zona dentro de la pantalla, un escalón por encima del suelo. */
  pared: '#0C0F14',
  /** La superficie de una ficha o un panel. */
  teja: '#12161D',
  /** La franja levantada dentro de una ficha: la fila de datos, una cabecera. */
  tejaAlta: '#161B23',
  /**
   * El filo: un píxel de blanco al 7,5 %.
   *
   * Es lo ÚNICO que separa una superficie de otra, y por eso va en la tabla y no
   * escrito a mano en cada sitio. Blanco con alfa y no un gris opaco: así el
   * mismo valor funciona sobre el suelo, sobre la teja y sobre la placa de
   * acento sin tener que declarar tres.
   */
  filo: 'rgba(255, 255, 255, 0.075)',
  /** El filo cuando tiene que verse: un borde enfocado, una separación que importa. */
  filoVivo: 'rgba(255, 255, 255, 0.14)',
  /** El texto normal. */
  palabra: '#E9ECF2',
  /** El texto secundario: lo que acompaña y no se lee primero. */
  tenue: '#8C94A5',
  /** Los rótulos pequeños y las cifras de apoyo. */
  cifra: 'rgba(255, 255, 255, 0.34)',
  /** El blanco de énfasis: sobre la placa de acento, y las cifras grandes. */
  blanco: '#F4F6FA',

  /* ---------- Los tres que sí se tiñen ---------- */

  /** El color que brilla. Vive en la placa del nombre, en el piloto y en el filo de la acción. */
  acento: '#A855F7',
  /** Su fondo, para el degradado de la placa. */
  acentoHondo: '#6D28D9',
  /** El mismo color casi transparente: resplandores y auras. */
  halo: 'rgba(168, 85, 247, 0.20)',

  /* ---------- Y uno que no es ninguna de las dos cosas ---------- */

  /**
   * LO QUE QUEMA Y LO QUE SE ACABA: los últimos diez segundos de una ronda, y lo
   * que te mata en El Arcade.
   *
   * NO se tiñe con el tema, y hay que saber por qué: si se tiñera, el aviso
   * diría lo mismo que la placa del nombre y dejaría de avisar. Es fijo a costa
   * de una incomodidad que conviene tener escrita: con el tema en ÁMBAR este
   * naranja se le parece. Se aguanta porque los dos no coinciden nunca en la
   * misma pantalla —la placa de acento es de la Sala y la alarma es de dentro de
   * una partida—, y el día que coincidan habrá que resolverlo, no ignorarlo.
   */
  alarma: '#FF7A45',
} as const;

/**
 * LOS CUATRO TEMAS. Sólo cambian tres valores; los diez neutros no se mueven.
 *
 * Que la tabla sea tan corta ES la prueba de que la identidad no depende del
 * color: si repintar la Sala entera exigiera tocar más de tres cosas, sería que
 * el violeta estaba haciendo de estructura.
 */
export const TEMAS_DE_SALA = {
  violeta: { acento: '#A855F7', acentoHondo: '#6D28D9', halo: 'rgba(168, 85, 247, 0.20)' },
  ambar: { acento: '#F59E0B', acentoHondo: '#B45309', halo: 'rgba(245, 158, 11, 0.20)' },
  verde: { acento: '#22C55E', acentoHondo: '#15803D', halo: 'rgba(34, 197, 94, 0.20)' },
  carmesi: { acento: '#F43F5E', acentoHondo: '#9F1239', halo: 'rgba(244, 63, 94, 0.20)' },
} as const;

export type TemaDeSala = keyof typeof TEMAS_DE_SALA;

/** El que ve todo el mundo hoy, mientras no haya dónde guardar la preferencia. */
export const TEMA_POR_DEFECTO: TemaDeSala = 'violeta';

/**
 * LAS LETRAS DE LA SALA: el palo seco del sistema, y no es una renuncia.
 *
 * ═══ LO QUE PEDÍA EL DISEÑO Y LO QUE HAY ═══
 *
 * La maqueta que se eligió rotula con Oswald —condensada, en mayúsculas, la
 * letra del cartel— y pone los datos en IBM Plex Mono. Ninguna de las dos está
 * instalada: la app sólo trae Cinzel y Cormorant Garamond, que son del taller de
 * veladas y aquí no pintan nada. Nombrar una fuente que no existe no da error:
 * cae en la del sistema en silencio, y entonces la tabla miente.
 *
 * Así que se usa lo que hay, y se dice.
 *
 * ═══ POR QUÉ NO ES UN APAÑO ═══
 *
 * Porque La Frente ya lo hacía por su cuenta y con un argumento que vale para
 * toda la Sala: esa pantalla se lee a tres metros con el móvil apoyado en la
 * frente de alguien, y el palo seco del sistema —que en cada aparato es la letra
 * que mejor se ve en ese aparato— gana ahí a cualquier romana. Lo que aquí se
 * hace es extender ese criterio a las otras cuatro máquinas en vez de tener una
 * pantalla que juega con otras reglas.
 *
 * Y el trabajo que hacía la condensada lo hacen el PESO, la CAJA ALTA y el
 * TRACKING, que es de donde sale de verdad la voz de un rótulo. Un nombre en
 * mayúsculas, en 800, con tracking abierto, se lee como un cartel aunque la
 * familia sea la del sistema.
 *
 * ═══ LO QUE COSTARÍA TENER LA VOZ COMPLETA ═══
 *
 * Tres paquetes de `@expo-google-fonts` —oswald, archivo, ibm-plex-mono— con dos
 * pesos cada uno. Es la decisión que queda abierta, y la de los datos es la que
 * más se notaría: una cifra en monoespaciada dice «esto es una medida» sin
 * rotularlo, y además hace que las columnas de aforo y ritmo cuadren.
 *
 * MIENTRAS TANTO NO SE DECLARA NINGUNA `fontFamily` EN LA SALA. Sin entrada en
 * esta tabla no hay forma de escribir una fuente que no existe.
 */
export const LETRA = {
  /**
   * El rótulo: nombres de máquina y cifras grandes. Caja alta y tracking
   * abierto, que es lo que hace de cartel sin condensada.
   */
  rotulo: { fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  /**
   * Los rótulos pequeños y las cápsulas: la pastilla de estado de la portada y los
   * rótulos de las pantallas de dentro de partida.
   *
   * Decía «AFORO, SEDE, RITMO», que eran las tres columnas de la tabla que la
   * tarjeta de la Sala tuvo hasta que pasó a retrato. Esos tres datos siguen
   * estando, pero ahora son una frase en el pie y van en `cuerpo`.
   */
  rotuloChico: { fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase' },
  /** El gancho y las frases que se leen de cerca. */
  cuerpo: { fontWeight: '500', letterSpacing: 0 },
  /**
   * Los datos. Sin monoespaciada, lo que mantiene las columnas cuadradas es
   * `fontVariant: ['tabular-nums']`, que sí está en React Native y no cuesta
   * ningún fichero.
   */
  dato: { fontWeight: '600', letterSpacing: 0.4, fontVariant: ['tabular-nums'] },
} as const;

/**
 * LA FIRMA DE LA SALA: el contador de aforo.
 *
 * Sobre cada máquina hay un raíl de muescas. Hay tantas como personas admite
 * —`jugadores.maximo`— y están encendidas las que hacen falta para empezar
 * —`jugadores.minimo`—. La Frente son doce muescas con dos encendidas, y es el
 * raíl más largo de la Sala; La Ronda son cuatro y las cuatro encendidas, porque
 * su mínimo es su máximo y sólo se juega llena; El Arcade y La Peonza son una
 * sola.
 *
 * ═══ POR QUÉ ESTO Y NO UN ADORNO ═══
 *
 * Porque la longitud del raíl dice el aforo ANTES de leer una palabra, y porque
 * puestas en fila las cinco máquinas se distinguen por él. Es ornamento que
 * informa, que es la única clase de ornamento que sobrevive a que alguien añada
 * un juego: el sexto arcade trae su aforo en el manifiesto y su raíl sale solo.
 *
 * Viene de una orla de bombillas de feria —la maqueta que se eligió las
 * dibujaba con vidrio, casquillo y filamento— y se quedó sin el disfraz al
 * modernizarla. La cuenta es lo que valía; la bombilla era la época.
 */
export const CUENTA_DE_AFORO = {
  /** Ancho de cada muesca. */
  grosor: 3,
  /** Alto de una encendida y de una apagada: la diferencia es la que se lee. */
  altoEncendida: 15,
  altoApagada: 7,
  /*
   * SEPARACIÓN ENTRE MUESCAS. Era 22, y son 13 desde que el raíl se metió DENTRO
   * de la portada de la tarjeta: ahí dispone de los 210 útiles de una tarjeta de
   * 252 y no del ancho entero de una ficha de 378. Con 22, un aforo de doce medía
   * 278 y se salía; con 13 mide 179 y cabe con holgura.
   *
   * ES UNA SOLA Y NO DOS. Había `huecoDestacada` y `huecoHilera` porque la Sala
   * era una pila con la primera tarjeta más grande. En un carrusel todas las
   * tarjetas miden lo mismo, así que dos valores serían dos nombres para el
   * mismo número esperando a divergir.
   *
   * Lo que NO cede sigue siendo el número de muescas —el raíl cuenta o no sirve
   * para nada—, que es la regla que gobierna `huecoDelRail`.
   */
  hueco: 13,
} as const;

/** Los redondeos de la Sala. Pocos y con un trabajo cada uno. */
export const RADIO = {
  /** Una ficha de máquina: un panel de dentro de una partida. */
  ficha: 14,
  /*
   * UNA TARJETA DE LA SALA, Y ES MÁS REDONDA QUE UN PANEL A PROPÓSITO.
   *
   * Son los 20 de la tarjeta de velada del carrusel de la portada, copiados a
   * conciencia: las dos viven en la misma pantalla, a un dedo de distancia, y
   * ahí un radio distinto no se lee como dos familias sino como un descuido.
   * Los paneles de DENTRO de una partida siguen en 14 porque nadie los ve al
   * lado de una velada.
   */
  tarjeta: 20,
  /** Un botón, una pastilla, el marcador. */
  mando: 8,
} as const;
