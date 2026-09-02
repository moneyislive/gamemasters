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
 * LOS COLORES DE LA SALA, y por qué no son los del tema de las veladas.
 *
 * La portada separa las dos familias a propósito: una es alta y con retrato, la
 * otra ancha y plana, y el acento de la sala de arcade es este verde de neón. La
 * razón está escrita allí y es de producto: nadie puede confundir «una noche con
 * cinco amigos» con «un minuto de pie».
 *
 * Y hay una segunda razón, de arquitectura: `useTema()` devuelve el tema DE LA
 * VELADA QUE SE ESTÉ JUGANDO —lee el contexto de la partida— así que un arcade
 * pintado con él saldría verde fieltro durante una partida de CLUEDO y color arena
 * durante una de la Momia, según lo que hubiera abierto antes. Un minijuego que
 * cambia de color según la velada que tengas a medias es exactamente el tipo de
 * enredo que la separación de los dos motores existe para impedir.
 */
export const SALA = {
  fondo: '#06110f',
  panel: '#0c1c19',
  neon: '#5fd4c8',
  neonTenue: '#2f6b64',
  palabra: '#f2fbf9',
  aviso: '#e8a04a',
  fallo: '#d4636f',
} as const;
