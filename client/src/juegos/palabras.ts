/**
 * Las palabras con las que cada juego habla en el TALLER.
 *
 * POR QUÉ ESTO NO ESTÁ EN EL MANIFIESTO. `shared/juegos/` es lo que los tres
 * paquetes tienen que saber A LA VEZ, y nada de lo de aquí lo necesitan ni el
 * servidor ni el móvil: son los rótulos de una pantalla que solo existe en el
 * taller. Es la misma frontera que ya separa `server/src/juegos/` —los esquemas
 * con los que se le pide la trama al modelo— del contrato común. Lo que sí es
 * de los tres (el nombre del juego, su lema, el nombre del asistente, la
 * presentación de cada categoría) sale del manifiesto, y aquí no se repite.
 *
 * POR QUÉ FRASES ENTERAS Y NO PIEZAS. Se intentó lo otro: un sustantivo
 * («caso» / «expedición») y componer las frases alrededor. En español no sale:
 * cambia el artículo, cambia la concordancia y se acaba escribiendo un pequeño
 * motor de género y número para ahorrar veinte líneas de texto. Escribir las
 * frases dos veces se lee mejor, se traduce mejor y no puede fallar en tiempo
 * de ejecución.
 *
 * LAS DE CLUEDO SON, LITERALMENTE, LAS QUE YA HABÍA. Están copiadas de las
 * páginas de las que salieron, carácter a carácter, porque la regla de esta
 * entrega es que CLUEDO no cambie ni un píxel. Si alguien las retoca, que sea
 * queriendo.
 */
import { manifiestoDe } from '../../../shared/juegos';
import type { DefinicionCategoria, JuegoId } from '../../../shared/juegos';

export interface PalabrasDeJuego {
  /** El signo que separa secciones. Un rombo art déco, un anj. */
  ornamento: string;
  /** El recibidor: la lista de partidas de este juego. */
  recibidor: {
    kicker: string;
    titulo: string;
    sub: string;
    nueva: string;
    creando: string;
    cargando: string;
    /** Encabeza cada ficha: «Caso nº 001». */
    ficha: string;
    vacioTitulo: string;
    vacioTexto: string;
    vacioBoton: string;
    /** El signo grande de la tarjeta de «no hay nada todavía». */
    vacioMarca: string;
    /** Cómo se llama cada estado de una partida en la esquina de su ficha. */
    estados: { draft: string; generating: string; ready: string };
    /** Los tres contadores de la ficha, en el orden en que se pintan. */
    contadores: [string, string, string];
    confirmarCierre: string;
    /** Errores. Se leen en un aviso flotante. */
    errorCargar: string;
    errorCrear: string;
    errorBorrar: string;
    /** Para lectores de pantalla. */
    abrirAria: (nombre: string) => string;
    borrarAria: (nombre: string) => string;
  };
  /**
   * Cómo se llama cada categoría en las pestañas del taller.
   *
   * Solo hacen falta las EXCEPCIONES: por defecto se usa el plural del
   * manifiesto con la inicial en mayúscula, y casi siempre es lo correcto. La
   * excepción que hay es de CLUEDO y es vieja: la categoría se llama `objetos`
   * en el manifiesto y la pestaña dice «Armas» desde el primer día.
   */
  rotulos: Record<string, string>;
  /**
   * El artículo de cada categoría: «la sala», «el sospechoso».
   *
   * POR QUÉ HACE FALTA. Media docena de frases del taller nombran la categoría
   * con artículo —«No se pudo eliminar la sala», «Nuevo sospechoso»— y el
   * manifiesto no dice el género de nada. Sin esto salía «Nuevo reliquia».
   *
   * Se DECLARA y no se adivina. La regla de «termina en -a, es femenino»
   * acierta con las siete categorías que hay hoy y falla el día que alguien
   * escriba un juego con mapas, días o problemas; y un fallo así no lo ve nadie
   * hasta que lo lee un usuario. Siete palabras escritas no se equivocan.
   */
  articulos: Record<string, 'el' | 'la'>;
  /** El taller de preparación. */
  taller: {
    volver: string;
    /** Las pestañas que no son de una categoría. */
    pestanaEstilo: string;
    pestanaTablero: string;
    pestanaDosieres: string;
    pestanaVivo: string;
    kicker: string;
    nombreAria: string;
    listo: string;
    desactualizado: string;
    generar: string;
    actualizar: string;
    regenerar: string;
    confirmarRegenerar: string;
    tipTrabajando: string;
    tipGenerar: string;
    tipRegenerar: string;
    tipConfirmar: string;
    /**
     * La coletilla de «se rehará solo lo necesario…» cuando hace falta el
     * agente. Va la frase entera y no solo el nombre porque en español el
     * artículo se contrae —«del mayordomo», «del Escriba»— y componerla a
     * trozos daba «de El Mayordomo».
     */
    tipConAyuda: string;
    extraviadoTitulo: string;
    extraviadoTexto: string;
    extraviadoVolver: string;
    abriendo: string;
    buscando: string;
  };
  /** El puesto de mando de la noche: la partida en vivo. */
  vivo: {
    abrirSala: string;
    sinTrama: string;
    /** El botón que revela el final. */
    desenlace: string;
    abrirRonda: (numero: number) => string;
    cerrarRonda: string;
    rondaEnCurso: (numero: number, total: number) => string;
    rondaCerrada: (numero: number) => string;
  };
  /** El asistente. El NOMBRE sale del manifiesto; esto es lo que le rodea. */
  asistente: {
    subtitulo: string;
    /** Lo que dice al abrir una partida que no tiene conversación todavía. */
    bienvenida: string;
    servicio: string;
    pensando: string;
    marcador: string;
  };
}

const CLUEDO: PalabrasDeJuego = {
  ornamento: '❖',
  recibidor: {
    kicker: 'El recibidor de la mansión',
    titulo: 'Casos de CLUEDO',
    sub: 'Cada expediente es una velada: sospechosos, salas, armas y una trama a medida.',
    nueva: '✦ Nuevo caso',
    creando: 'Abriendo expediente…',
    cargando: 'Encendiendo los candelabros…',
    ficha: 'Caso nº',
    vacioTitulo: 'Aún no hay casos abiertos',
    vacioTexto: 'Pulse «Nuevo caso» y el mayordomo convocará a los sospechosos.',
    vacioBoton: 'Abrir el primer expediente',
    vacioMarca: '?',
    estados: { draft: 'Borrador', generating: 'Generando…', ready: 'Misterio listo' },
    contadores: ['sospechosos', 'salas', 'armas'],
    confirmarCierre: '¿Cerrar este caso para siempre?',
    errorCargar: 'No se pudieron cargar los casos. ¿Está el servidor en marcha?',
    errorCrear: 'No se pudo abrir un caso nuevo.',
    errorBorrar: 'No se pudo borrar el caso.',
    abrirAria: (nombre) => `Abrir el caso ${nombre}`,
    borrarAria: (nombre) => `Borrar el caso ${nombre}`,
  },
  rotulos: { objetos: 'Armas' },
  articulos: { sospechosos: 'el', salas: 'la', objetos: 'el' },
  taller: {
    volver: '← Recibidor',
    pestanaEstilo: 'Estilo',
    pestanaTablero: 'Tablero',
    pestanaDosieres: 'Dosieres',
    pestanaVivo: 'En vivo',
    kicker: 'Expediente',
    nombreAria: 'Nombre del caso',
    listo: '✦ Misterio listo · Ver dosieres',
    desactualizado: '⚠ Misterio desactualizado',
    generar: '✦ GENERAR MISTERIO',
    actualizar: '✦ ACTUALIZAR MISTERIO',
    regenerar: '↻ Regenerar desde cero',
    confirmarRegenerar: '¿Seguro? Pulse otra vez',
    tipTrabajando: 'El mayordomo ya está trabajando…',
    tipGenerar: 'Genera la trama, el tablero y los dosieres de los jugadores.',
    tipRegenerar:
      'Descarta la trama y los dosieres actuales y escribe un misterio completamente nuevo.',
    tipConfirmar: 'Pulse otra vez para descartar el misterio actual y escribir uno nuevo.',
    tipConAyuda: ', con ayuda del mayordomo para lo que falte',
    extraviadoTitulo: 'El expediente se ha extraviado',
    extraviadoTexto: 'No se pudo abrir este caso. Quizá fue borrado o el servidor no responde.',
    extraviadoVolver: '← Volver al recibidor',
    abriendo: 'Abriendo el expediente…',
    buscando: 'Buscando el expediente…',
  },
  vivo: {
    abrirSala: 'Abrir la sala de espera',
    sinTrama: 'Genera antes el misterio: sin trama no hay nada que jugar.',
    desenlace: 'Abrir el sobre del crimen',
    abrirRonda: (n) => `Abrir ronda ${n}`,
    cerrarRonda: 'Cerrar la ronda',
    rondaEnCurso: (n, total) => `Ronda ${n} de ${total} · en curso`,
    rondaCerrada: (n) => `Ronda ${n} cerrada`,
  },
  asistente: {
    subtitulo: 'Agente experto en CLUEDO',
    bienvenida:
      'Bienvenido a la mansión. Soy Edmund, su maestro de ceremonias. ' +
      'Cuénteme quiénes asistirán a la velada, qué estancias tiene la casa y qué objetos ' +
      'podrían servir de… arma. Puede escribirme o dictármelo con el micrófono; ' +
      'yo lo anotaré todo con la debida discreción.',
    servicio: 'El Mayordomo está de servicio',
    pensando: 'El Mayordomo está pensando…',
    marcador: 'Hable con El Mayordomo…',
  },
};

/**
 * El Misterio de la Momia.
 *
 * El registro es otro y no es un adorno: en la mansión se trata de usted a
 * quien organiza, porque el mayordomo es su empleado. Aquí no hay servicio:
 * hay una expedición en la que el escriba es uno más, y por eso se tutea. Que
 * el tono cambie con el juego es la mitad de lo que hace que sea otro sitio.
 */
const MOMIA: PalabrasDeJuego = {
  ornamento: '☥',
  recibidor: {
    kicker: 'El campamento, la noche antes',
    titulo: 'Expediciones abiertas',
    sub: 'Cada expedición es una noche: la tumba, los cinco ritos y alguien que no quiere que se selle.',
    nueva: '✦ Nueva expedición',
    creando: 'Levantando el campamento…',
    cargando: 'Encendiendo las lámparas…',
    ficha: 'Expedición nº',
    vacioTitulo: 'Todavía no se ha abierto ninguna tumba',
    vacioTexto: 'Pulsa «Nueva expedición» y el Escriba empezará a levantar acta.',
    vacioBoton: 'Abrir la primera expedición',
    vacioMarca: '☥',
    estados: { draft: 'Sin excavar', generating: 'Escribiendo…', ready: 'Papiro escrito' },
    contadores: ['expedicionarios', 'cámaras', 'reliquias'],
    confirmarCierre: '¿Cerrar esta expedición para siempre?',
    errorCargar: 'No se pudieron cargar las expediciones. ¿Está el servidor en marcha?',
    errorCrear: 'No se pudo abrir una expedición nueva.',
    errorBorrar: 'No se pudo borrar la expedición.',
    abrirAria: (nombre) => `Abrir la expedición ${nombre}`,
    borrarAria: (nombre) => `Borrar la expedición ${nombre}`,
  },
  rotulos: {},
  articulos: { expedicionarios: 'el', camaras: 'la', reliquias: 'la', ritos: 'el' },
  taller: {
    volver: '← Campamento',
    pestanaEstilo: 'Estilo',
    pestanaTablero: 'La tumba',
    pestanaDosieres: 'Dosieres',
    pestanaVivo: 'En vivo',
    kicker: 'Expedición',
    nombreAria: 'Nombre de la expedición',
    listo: '✦ Sellado escrito · Ver dosieres',
    desactualizado: '⚠ La expedición ha cambiado',
    generar: '✦ ESCRIBIR EL PAPIRO',
    actualizar: '✦ ACTUALIZAR EL PAPIRO',
    regenerar: '↻ Escribir otro papiro',
    confirmarRegenerar: '¿Seguro? Pulsa otra vez',
    tipTrabajando: 'El Escriba ya está trabajando…',
    tipGenerar:
      'Escribe la trama, reparte los dones y ordena los cinco ritos del sellado.',
    tipRegenerar:
      'Descarta el papiro actual —el orden de los ritos, los dones y los dosieres— y escribe otro distinto.',
    tipConfirmar: 'Pulsa otra vez para descartar este papiro y escribir uno nuevo.',
    tipConAyuda: ', con ayuda del Escriba para lo que falte',
    extraviadoTitulo: 'Esta expedición se ha perdido en la arena',
    extraviadoTexto: 'No se pudo abrir. Quizá se borró, o el servidor no responde.',
    extraviadoVolver: '← Volver al campamento',
    abriendo: 'Desenrollando el papiro…',
    buscando: 'Buscando la expedición…',
  },
  /*
   * Una «ronda» es aquí una VIGILIA: las horas de guardia que quedan hasta el
   * amanecer. Quien dirige lo va a decir doce veces esta noche, y decir «ronda
   * tres» en una tumba rompe la ficción tan bien como una alarma de móvil.
   */
  vivo: {
    abrirSala: 'Levantar el campamento',
    sinTrama: 'Escribe antes el papiro: sin trama no hay nada que jugar.',
    desenlace: 'Revelar el desenlace',
    abrirRonda: (n) => `Abrir la vigilia ${n}`,
    cerrarRonda: 'Cerrar la vigilia',
    rondaEnCurso: (n, total) => `Vigilia ${n} de ${total} · en curso`,
    rondaCerrada: (n) => `Vigilia ${n} cerrada`,
  },
  asistente: {
    subtitulo: 'Escriba de la expedición',
    bienvenida:
      'El sello está roto y falta poco para el amanecer. Soy el escriba de esta ' +
      'expedición: llevo el acta de lo que se encuentra y de lo que se dice. ' +
      'Cuéntame quién viene esta noche, qué estancias de tu casa serán las cámaras ' +
      'de la tumba y qué se ha sacado de ella. De los cinco ritos me ocupo yo, si ' +
      'no se te ocurren.',
    servicio: 'El Escriba está despierto',
    pensando: 'El Escriba está escribiendo…',
    marcador: 'Habla con El Escriba…',
  },
};

const PALABRAS: Record<JuegoId, PalabrasDeJuego> = {
  cluedo: CLUEDO,
  momia: MOMIA,
};

/**
 * Las palabras de un juego, con las de la mansión como respaldo.
 *
 * El respaldo importa: un juego instalado sin entrada aquí se seguiría viendo
 * entero, hablando como CLUEDO. Es feo, pero es una pantalla que funciona en
 * vez de una pantalla con huecos.
 */
export function palabrasDe(juego: JuegoId | undefined): PalabrasDeJuego {
  return PALABRAS[juego ?? 'cluedo'] ?? CLUEDO;
}

/** El nombre del asistente de un juego. Sale del manifiesto, no de aquí. */
export function nombreDelAsistente(juego: JuegoId | undefined): string {
  return manifiestoDe(juego).asistente.nombre;
}

/**
 * Cómo se llama una categoría en la pestaña que la abre.
 *
 * El plural del manifiesto con la inicial en mayúscula, salvo que el juego
 * declare otra cosa. Se usa el plural y no el `presentacion.titulo` porque el
 * título es una frase («Armas del crimen», «Los cinco ritos») y una pestaña
 * necesita una palabra.
 */
export function rotuloDeCategoria(juego: JuegoId | undefined, categoria: DefinicionCategoria): string {
  const propio = palabrasDe(juego).rotulos[categoria.id];
  if (propio) return propio;
  return categoria.plural.charAt(0).toUpperCase() + categoria.plural.slice(1);
}

/**
 * La categoría con su artículo: «la sala», «el rito».
 *
 * Con el masculino por defecto, que es lo que se venía usando cuando esto no
 * estaba declarado en ninguna parte.
 */
export function laCategoria(juego: JuegoId | undefined, categoria: DefinicionCategoria): string {
  const articulo = palabrasDe(juego).articulos[categoria.id] ?? 'el';
  return `${articulo} ${categoria.singular}`;
}

/** La misma, señalada: «esta sala», «este rito». */
export function estaCategoria(juego: JuegoId | undefined, categoria: DefinicionCategoria): string {
  const articulo = palabrasDe(juego).articulos[categoria.id] ?? 'el';
  return `${articulo === 'la' ? 'esta' : 'este'} ${categoria.singular}`;
}

/** El rótulo del formulario en blanco: «Nueva sala», «Nuevo rito». */
export function nuevaCategoria(juego: JuegoId | undefined, categoria: DefinicionCategoria): string {
  const articulo = palabrasDe(juego).articulos[categoria.id] ?? 'el';
  return `${articulo === 'la' ? 'Nueva' : 'Nuevo'} ${categoria.singular}`;
}
