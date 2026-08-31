/**
 * Qué es un ARCADE, dicho como datos.
 *
 * ═══ ESTE FICHERO NO HEREDA DE `ManifiestoDeJuego`, Y ESA ES SU RAZÓN DE SER ═══
 *
 * La tentación evidente al escribir la segunda familia de juegos es partir del
 * contrato de la primera: `ManifiestoDeJuego` ya está muy generalizado —el juego
 * es dato, las fases tienen nombres libres, la plataforma pregunta por el PAPEL
 * de una fase en vez de por su nombre— y `verify:ajeno` demuestra con «La
 * Almoneda» que entra un juego sin ejes, sin lugares, sin pistas y sin
 * personajes.
 *
 * Pero aquel trabajo generalizó LA VELADA, no el producto. Lo que sigue clavado
 * allí no es CLUEDO: es el GAME MASTER. Tres piezas lo hacen estructural y las
 * tres están fuera del manifiesto, así que heredarlo no las trae y sin embargo
 * obliga a rellenarlas:
 *
 *   · `vistaDeJugador` empieza con `if (!plot) return null`: sin trama generada
 *     por IA no hay pantalla.
 *   · La sesión nace copiando `personasDe(game)` a sillas con `joinCode`: nadie
 *     juega si un humano no dio de alta su entidad en el taller antes.
 *   · Todo el ciclo lo abre `routes/live.ts`, detrás del `requireAuth` del taller.
 *
 * Un arcade no tiene ninguna de las tres cosas. Extender el manifiesto de velada
 * —con `extends`, con `Omit<…>` o copiando sus campos— significaría que un juego
 * de pulsar un botón declara su asistente con IA, su dosier, sus categorías con
 * mínimos y sus documentos imprimibles. Es exactamente el peaje que
 * `verify:ajeno` lleva contando desde que existe, cobrado otra vez y a sabiendas.
 *
 * Así que aquí no hay ni un `import` de `shared/juegos`, ni de `shared/live`, ni
 * de `shared/types`. Lo vigila `verify:fronteras`, y no como buena intención:
 * como comprobación estática que se pone roja.
 *
 * ═══ ONCE CAMPOS Y DOS EJES ═══
 *
 * Los ejes son `sede` —quién ejecuta el reductor— y `tickHz` —a qué ritmo entra
 * el tiempo—. Todo lo demás se DERIVA de ellos y de la existencia de `marcador`:
 * si hay mesa, si hay asientos, qué transporte hace falta y si la partida tiene
 * que ser reejecutable.
 *
 * La regla que evita el deslizamiento: LO QUE UN PROGRAMADOR PUEDA PONER MAL, SE
 * DERIVA, NO SE DECLARA. Por eso no existe `deterministaExigido` y no existe
 * `transporte`. Una bandera que exime de un comprobador es una bandera que
 * alguien pone a `false` el día que el comprobador se pone rojo, y entonces la
 * red deja de ser una red.
 */

/**
 * Identificador de un arcade instalado.
 *
 * `string` y no una unión cerrada, por lo mismo que `JuegoId`: un arcade puede
 * venir de fuera del binario y no hay forma de que el compilador conozca su
 * nombre. Se paga perdiendo la exhaustividad en compilación, y por eso el
 * registro de `index.ts` falla ruidosamente cuando se pide uno que no está.
 */
export type ArcadeId = string;

/**
 * Un sitio en la mesa. NO es una cuenta, NI una persona registrada.
 *
 * ═══ POR QUÉ ES UN CONCEPTO PROPIO Y NO `participanteId` ═══
 *
 * En las veladas, quien actúa tiene que estar en `sesion.players`, y esa lista
 * nace copiando las entidades que un humano dio de alta en el taller: hay un
 * correo, una foto, un `joinCode` y una obligación de datos personales detrás de
 * cada silla.
 *
 * En un arcade no. En «La Frente» los jugadores no están registrados, no tienen
 * móvil propio y a veces ni se cuentan: hay UN APARATO que pasa de mano en mano.
 * Un asiento es un nombre tecleado, o ni eso — un número de sitio. Que sea una
 * cadena opaca y no un identificador de cuenta es lo que permite que un juego
 * exista sin que nadie se dé de alta en nada.
 *
 * Y puede no haber ninguno: una mesa sin asientos es legítima y no un caso raro.
 * Es un arcade de un jugador donde el servidor solo verifica.
 */
export type AsientoId = string;

/**
 * QUIEN MIRA UNA PARTIDA: un asiento, o un espectador.
 *
 * ═══ POR QUÉ EL ESPECTADOR ENTRA EN EL CONTRATO AHORA, SI NADIE LO USA ═══
 *
 * Porque la proyección es POR ASIENTO y un espectador no tiene asiento. Hoy no
 * hay ninguna pantalla que mire una partida ajena, y el día que la haya —mirar
 * una mesa antes de sentarse, ver la partida de alguien, una pantalla común
 * apoyada en la mesa— la firma de la proyección tendrá que admitir «nadie en
 * concreto».
 *
 * Si el hueco no está previsto, ese día se resuelve con un asiento inventado
 * —`'espectador'` como cadena mágica, que colisiona con el nombre que alguien
 * teclee— o con un segundo camino de proyección solo para mirones, que es el que
 * nadie prueba y por el que se filtra la mano de otro. Prever el hueco cuesta un
 * tipo y una constante.
 *
 * CUIDADO CON EL OTRO `null`: `ContextoMovimiento.quien` también admite `null` y
 * significa OTRA COSA —el tic, que no lo manda ningún asiento—. Son dos nulos
 * distintos y por eso este tiene nombre propio: quien lea `QuienMira` sabe que
 * está en la proyección y no en el reductor.
 */
export const ESPECTADOR = null;
export type QuienMira = AsientoId | typeof ESPECTADOR;

/**
 * Con qué se pinta un arcade. UNIÓN CERRADA.
 *
 * ═══ POR QUÉ CERRADA, CON LA MISMA DISCIPLINA QUE `IconoId` ═══
 *
 * La app es un binario compilado, así que los muebles que sabe pintar están
 * dentro. Con una cadena libre, un arcade podría declarar `'mi-mueble'` y en el
 * móvil no saldría NADA —sin error, sin aviso— y nadie se enteraría hasta que
 * alguien abriera la Sala. Con la unión, el `Record<MuebleDeArcade, …>` de
 * `app/app/(arcade)/` no compila hasta que ese mueble existe. Es el acoplamiento
 * honesto de siempre: se paga una línea aquí y a cambio el compilador no deja
 * estrenarse a medias.
 *
 * ═══ Y POR QUÉ EL MUEBLE ES DATO Y NO UNA DECISIÓN DEL MOTOR ═══
 *
 * Si la capa de pintado se decidiera dentro del motor —mirando el estado, o el
 * `tickHz`, o si hay tablero—, el motor saldría a medida del primer minijuego
 * que se escriba. Lo declara quien lo sabe.
 */
export type MuebleDeArcade =
  /*
   * GENÉRICOS: los pinta la plataforma, y son los únicos que un arcade de FUERA
   * puede usar. Un juego que quiera sus propios píxeles tiene que estar en el
   * binario, y esa es la decisión de producto más cara del diseño: el enchufe
   * alcanza a las reglas, no a los píxeles.
   */
  /** Vistas normales: botones, listas, cantidades, un cronómetro grande. Coste cero. */
  | 'formulario'
  /** Una topología declarada, pintada con SVG. El tablero es dato, no reductor. */
  | 'tablero'
  /*
   * PROPIOS: los pinta el juego, están en el binario y cuestan publicación.
   */
  /** Dos dimensiones a ritmo de fotograma. */
  | 'lienzo'
  /** Tres dimensiones, y solo a través del lienzo común de la app. */
  | 'escena';

/**
 * De dónde salen las reglas de este arcade. UNIÓN CERRADA Y OBLIGATORIA.
 *
 * ═══ ESTO ES UN CAMPO LEGAL, Y CUESTA MENOS HOY QUE MAÑANA ═══
 *
 * Las reglas y mecánicas de un juego de mesa no son objeto de copyright ni de
 * patente. Lo que sí está protegido es la EXPRESIÓN: el nombre, la marca, el
 * arte, los textos. Y las tiendas son más estrictas que la ley — ahí no hay
 * juicio, hay retirada.
 *
 * Declararlo cuesta un campo ahora, con la Sala de Arcade vacía. Después, con
 * una tienda de por medio y arcades publicados, es una migración.
 *
 * No lleva texto libre a propósito: un campo donde se pueda escribir «creo que
 * es de dominio público» no es una declaración, es una excusa. Cuatro valores, y
 * quien no sepa cuál le toca tiene un problema que resolver antes de publicar.
 *
 * ═══ Y POR QUÉ `'licenciado'` NO ES UN VALOR SUELTO ═══
 *
 * Los otros tres se sostienen solos: que unas reglas sean de dominio público,
 * una mecánica genérica o creación propia son afirmaciones que se comprueban
 * LEYENDO EL JUEGO. `'licenciado'` no dice nada sin titular, referencia y
 * vigencia al lado: es una etiqueta que nadie puede auditar, y una etiqueta que
 * nadie puede auditar en un campo legal es peor que no tener el campo, porque
 * parece que alguien lo comprobó.
 *
 * Por eso es una unión DISCRIMINADA y no cuatro cadenas con tres campos
 * opcionales sueltos al lado. Con campos opcionales, un manifiesto puede
 * declararse licenciado y dejarlos en blanco, y el compilador lo bendice. Así,
 * escribir `'licenciado'` sin los tres datos no compila.
 *
 * ═══ POR QUÉ TODOS LLEVAN `{ tipo }`, INCLUIDOS LOS TRES SIMPLES ═══
 *
 * Se consideró dejar los tres primeros como cadenas sueltas y solo el cuarto
 * como objeto —`'dominio-publico' | { tipo: 'licenciado'; … }`—, que se lee más
 * corto en el manifiesto. Se descartó: eso obliga a que TODO el que lea este
 * campo —`verify:procedencia`, la ficha de la tienda, la migración del día que
 * los manifiestos vivan en la base— pregunte antes `typeof p === 'string'`. Un
 * campo cuyo tipo en ejecución cambia según el valor es un hueco sin tipar de
 * los que este repositorio ya tiene apuntados, y cuesta cuatro caracteres
 * evitarlo.
 */
export type ProcedenciaDeArcade =
  /** Reglas de dominio público: charadas, parchís, la oca, el dominó. */
  | { tipo: 'dominio-publico' }
  /** Una mecánica genérica sin dueño: emparejar, reaccionar, adivinar una palabra. */
  | { tipo: 'mecanica-generica' }
  /** Escrito aquí, de cero. */
  | { tipo: 'creacion-propia' }
  /** Hay una licencia firmada detrás, y estos tres datos dicen cuál. */
  | {
      tipo: 'licenciado';
      /** Quién es el dueño de los derechos. El nombre con el que se le reclamaría. */
      titular: string;
      /**
       * Cómo se encuentra el papel: número de contrato, URL de la licencia, o
       * dónde está archivada. Sin esto, «licenciado» es la palabra de alguien
       * que ya no trabaja aquí.
       */
      referencia: string;
      /**
       * Desde cuándo y hasta cuándo, en `AAAA-MM-DD`.
       *
       * `hasta` admite `'perpetua'` y NO admite omitirse, por lo mismo que
       * `marcador` no admite omitirse: una licencia sin fecha de fin puede ser
       * perpetua o puede ser que nadie miró el contrato, y esas dos cosas tienen
       * que distinguirse a simple vista. Escribir la palabra es una decisión;
       * dejar el campo fuera es un descuido que parece una decisión.
       */
      vigencia: { desde: string; hasta: string };
    };

/**
 * Los iconos que trae la Sala de Arcade. UNIÓN CERRADA, y hoy tiene UNO.
 *
 * ═══ POR QUÉ UNO SOLO, Y POR QUÉ NO SON LOS DE `IconoId` ═══
 *
 * No son los de las veladas porque importarlos sería importar `shared/juegos`,
 * que es justo la frontera que sostiene todo esto. Un `torii`, un `escarabajo` y
 * un `mayordomo` son el vocabulario de tres misterios; en una sala de arcade no
 * significan nada.
 *
 * Y hay uno solo porque la fase 0 no entrega ningún juego. La disciplina de
 * `IconoId` es exactamente esta: su lista creció juego a juego —dos de la Momia,
 * dos de las Sombras, dos del Nudo— y cada tanda lleva escrito al lado qué juego
 * la trajo y por qué no le bastaban los que ya había. Inventar aquí cuatro
 * iconos para cuatro juegos que todavía no existen sería adivinar qué dibujo
 * necesita un juego que nadie ha escrito, que es la forma exacta en que un
 * contrato sale a medida del primero.
 *
 * Nacer en uno y crecer con cada fase es gratis. Nacer en diez y descubrir que
 * seis no valían, no.
 */
export type IconoDeArcade =
  /** El genérico: un arcade que no ha pedido nada mejor. */
  | 'mando';

/**
 * Dónde corre el reductor. EJE 1.
 *
 * ═══ ESTE ES EL EJE QUE EL MOTOR DE VELADAS NO TIENE ═══
 *
 * Allí no hay elección: todo el ciclo lo abre `routes/live.ts` detrás de
 * `requireAuth`, y la vista se compone en el servidor a partir de una trama que
 * escribió un modelo. La sede está clavada y no es un campo porque nadie
 * imaginó la otra.
 *
 * Que aquí sea DATO es lo que permite que el mismo fichero de reglas corra en
 * Hermes o en Node sin que el juego se entere. Y es lo que hace que exista un
 * juego «sin red»: no una bandera que apaga la red, sino una sede que nunca la
 * pidió.
 *
 *   · `dispositivo` — el aparato manda. Sin `rev`, sin canal, sin cuenta. El
 *     estado no sale de ahí, y por tanto no hay nada que sincronizar ni nadie a
 *     quien engañar: el único que podría hacer trampa es quien está jugando.
 *   · `servidor` — la autoridad manda. El dispositivo propone movimientos y el
 *     servidor decide. Es lo que hace falta en cuanto hay dos aparatos, o en
 *     cuanto un marcador tiene que valer algo.
 */
export type SedeDeArcade = 'dispositivo' | 'servidor';

/**
 * La cifra que este arcade publica. UNIÓN CERRADA Y OBLIGATORIA.
 *
 * ═══ ESTE CAMPO ERA OPCIONAL Y ERA UN ERROR ═══
 *
 * La primera versión decía `marcador?: MarcadorDeArcade`, y la exigencia de
 * reejecutabilidad se derivaba de que el campo EXISTIERA. Eso es exactamente la
 * bandera que §4 prohíbe, con otro disfraz — y de hecho peor:
 *
 *     OMITIR UN CAMPO OPCIONAL ES MÁS SILENCIOSO QUE PONER UNO A `false`.
 *
 * El día que `verify:marcador` se ponga rojo, borrar tres líneas del manifiesto
 * lo apaga, y en el diff eso no parece una renuncia: parece una limpieza. Nadie
 * pregunta por qué se ha borrado un campo opcional.
 *
 * Con `{ tipo: 'ninguno' }`, renunciar a la verificación cuesta exactamente lo
 * mismo de teclear y es una PALABRA QUE ALGUIEN ESCRIBIÓ A PROPÓSITO, que un
 * revisor ve en el diff y sobre la que puede preguntar.
 *
 * Lo que hay dentro de `'cifra'` es CONTENIDO, no comportamiento: dice cómo se
 * lee el número, no qué hay que comprobar. No hay aquí ningún campo que exima de
 * nada.
 */
export type MarcadorDeArcade =
  /**
   * Este juego no publica ninguna cifra en ningún sitio.
   *
   * No significa que no lleve la cuenta de nada: un juego puede contar sus
   * aciertos dentro de su propio estado y no enseñárselos a nadie más. Significa
   * que no hay una cifra que la plataforma tenga que creerse, y por tanto no hay
   * nada que verificar.
   */
  | { tipo: 'ninguno' }
  | {
      tipo: 'cifra';
      /** Cómo se llama en la pantalla. «Puntos», «Segundos», «Aciertos». */
      rotulo: string;
      /** Si gana el número más alto o el más bajo. Un tiempo se gana bajando. */
      sentido: 'mas-alto' | 'mas-bajo';
    };

/** Cuántos caben en una mesa de este arcade. */
export interface AforoDeArcade {
  minimo: number;
  maximo: number;
}

/**
 * UN ARCADE, en lo que los dos lados —el móvil y el servidor— tienen que saber
 * a la vez.
 *
 * Todo lo de aquí es serializable a JSON por construcción, por lo mismo que el
 * manifiesto de velada: no porque haga falta hoy, sino para que el día que se
 * quiera instalar un arcade sin desplegar sea mover datos y no rediseñar.
 */
export interface ManifiestoDeArcade {
  // ── Identidad ────────────────────────────────────────────────────────────
  id: ArcadeId;
  /** Cómo se llama en la Sala. */
  nombre: string;
  /**
   * Una frase que diga a qué se juega, en el sitio donde se decide jugar.
   *
   * Se llama `gancho` y no `lema` porque no es la misma cosa: el `lema` de una
   * velada es literatura que se lee en el dosier impreso —«Todo lo que queda de
   * una casa, y una tarde para repartirlo»—, y esto es la línea que hace que
   * alguien toque la tarjeta. Reutilizar el nombre habría invitado a reutilizar
   * el tono.
   */
  gancho: string;
  icono: IconoDeArcade;

  // ── Aforo ────────────────────────────────────────────────────────────────
  /**
   * Cuántos caben, y `minimo: 1` es lo normal aquí y no un caso raro.
   *
   * En una velada el mínimo lo fija cuánta gente hace falta para que la trama
   * funcione. En un arcade lo fija la mecánica, y la mitad de las mecánicas
   * funcionan con uno.
   */
  jugadores: AforoDeArcade;

  // ── Los dos ejes ─────────────────────────────────────────────────────────
  sede: SedeDeArcade;
  /**
   * A qué frecuencia entra el tiempo por el reductor. EJE 2.
   *
   * ═══ CERO ES UN VALOR LEGÍTIMO, NO UN CASO ESPECIAL ═══
   *
   * Y conviene decirlo así de fuerte porque la alternativa —`reloj?: { hz }`, o
   * `tieneReloj: boolean` con un `hz` al lado— colapsa dos cosas: «este juego no
   * tiene reloj» y «este juego tiene un reloj apagado». La primera es la mitad
   * del catálogo; la segunda no existe.
   *
   * Con un número, un tablero por turnos declara `0` y no paga nada: nadie le
   * manda tics, y todas sus reglas de tiempo —si las tiene— son suyas. Con una
   * bandera, alguien acabaría escribiendo `if (manifiesto.reloj)` en el núcleo,
   * que es una rama del motor que solo recorre medio catálogo.
   *
   * Lo que este número NO es: una promesa de que la plataforma reparta tics. El
   * tic es un MOVIMIENTO como cualquier otro (ver `reloj.ts`), y quien lo mete
   * por la puerta es quien hospeda la partida. Esto declara a qué ritmo hay que
   * meterlo, no quién lo hace.
   */
  tickHz: number;

  // ── Cómo se pinta y qué esconde ──────────────────────────────────────────
  mueble: MuebleDeArcade;
  /**
   * ¿Hay algo en el estado que no todo el mundo puede ver?
   *
   * ═══ SI ES `true` Y NO HAY PROYECCIÓN REGISTRADA, EL ARRANQUE FALLA ═══
   *
   * Esto es lo contrario de una bandera cómoda: declarar `true` no afloja nada,
   * OBLIGA. Y declarar `false` no exime de ningún comprobador, porque no hay
   * ningún comprobador del que eximirse: un juego sin secretos simplemente no
   * tiene nada que proyectar.
   *
   * La alternativa que se descartó —deducir la visibilidad de unas «zonas»
   * declaradas en el manifiesto— obligaría al motor a interpretar la FORMA del
   * estado, y toda esta arquitectura cuelga de que el estado sea opaco.
   *
   * Un fallo mudo —un juego que filtra el mazo y nadie ve un error— se convierte
   * así en una negativa ruidosa a arrancar. Es lo que ya hace el registro de
   * veladas con las altas perdidas, y es lo que comprueba
   * `exigirProyecciones()` en `index.ts`.
   */
  secretos: boolean;

  // ── La cifra ─────────────────────────────────────────────────────────────
  /**
   * Qué cifra publica este arcade, y `{ tipo: 'ninguno' }` si no publica ninguna.
   *
   * OBLIGATORIO, y el razonamiento largo está en `MarcadorDeArcade`: un campo
   * opcional aquí sería la bandera que §4 prohíbe, y de la variedad más
   * silenciosa que hay. De él se DERIVA la exigencia de reejecutabilidad, que es
   * lo que impide que exista un `deterministaExigido` que alguien pueda apagar.
   */
  marcador: MarcadorDeArcade;

  // ── Lo legal ─────────────────────────────────────────────────────────────
  procedencia: ProcedenciaDeArcade;
}

// ---------------------------------------------------------------------------
// Consultas
//
// Todo lo que sigue se DERIVA del manifiesto. Ninguna de estas preguntas tiene
// un campo propio, y esa es la regla: un campo es algo que alguien puede poner
// mal; una función es algo que siempre dice la verdad sobre lo que hay.
// ---------------------------------------------------------------------------

/**
 * ¿Tiene que ser este arcade reejecutable byte a byte?
 *
 * Se DERIVA de que publique una cifra. Si una cifra va a valer algo —un récord,
 * una tabla, una comparación entre dos personas—, la única forma de verificarla
 * sin fiarse del dispositivo es reejecutar la partida a partir de la semilla y
 * las entradas. Y para reejecutarla, el reductor tiene que dar el mismo
 * resultado en Hermes y en Node.
 *
 * Un juego con `{ tipo: 'ninguno' }` no publica ninguna cifra, así que nadie
 * puede mentir sobre ella, así que no hay nada que verificar. La renuncia está
 * escrita con una palabra y no con un campo ausente: ver `MarcadorDeArcade`.
 */
export function exigeReejecutabilidad(m: ManifiestoDeArcade): boolean {
  return m.marcador.tipo !== 'ninguno';
}

/** ¿Le entra el tiempo a este arcade por el reductor? */
export function tieneReloj(m: ManifiestoDeArcade): boolean {
  return m.tickHz > 0;
}

/**
 * ¿Necesita este arcade una mesa en el servidor?
 *
 * Se deriva de la sede y de nada más. Un juego de dispositivo no tiene mesa, no
 * tiene `rev`, no tiene canal y no toca la red: no porque una bandera lo diga,
 * sino porque su reductor corre en el aparato y su estado no sale de ahí.
 */
export function necesitaMesa(m: ManifiestoDeArcade): boolean {
  return m.sede === 'servidor';
}

/** ¿Está este arcade obligado a registrar una proyección para poder arrancar? */
export function exigeProyeccion(m: ManifiestoDeArcade): boolean {
  return m.secretos;
}

/**
 * ¿Cabe esta cantidad de gente en una mesa de este arcade?
 *
 * Vive aquí y no en el árbitro porque es aritmética sobre el manifiesto, y el
 * árbitro no debe tener ni una regla que se pueda leer en el dato.
 */
export function cabenEnLaMesa(m: ManifiestoDeArcade, cuantos: number): boolean {
  return cuantos >= m.jugadores.minimo && cuantos <= m.jugadores.maximo;
}

/**
 * Lo que está mal en un manifiesto, en castellano. Vacío significa que está bien.
 *
 * ═══ POR QUÉ DEVUELVE UNA LISTA Y NO LANZA ═══
 *
 * Porque quien lo llama sabe qué hacer mejor que esto: el registro de `index.ts`
 * se niega a dar de alta y lo cuenta entero, mientras que un comprobador quiere
 * ver los cinco problemas de una vez y no el primero. Lanzar aquí obligaría a
 * los dos a rodearlo de `try`.
 *
 * NO comprueba que exista proyección cuando `secretos: true`. Eso no se puede
 * saber mirando el manifiesto —la proyección se registra aparte, y puede
 * registrarse después—, así que es una comprobación de ARRANQUE y vive en
 * `exigirProyecciones()`.
 */
export function problemasDelManifiesto(m: ManifiestoDeArcade): string[] {
  const problemas: string[] = [];
  if (!m.id) problemas.push('no tiene `id`, y sin id no hay registro que valga');
  if (!m.nombre) problemas.push('no tiene `nombre`, así que en la Sala saldría una tarjeta en blanco');
  if (!Number.isFinite(m.tickHz) || m.tickHz < 0) {
    problemas.push('`tickHz` tiene que ser un número mayor o igual que 0 (0 significa «sin reloj»)');
  }
  if (!Number.isInteger(m.jugadores.minimo) || m.jugadores.minimo < 1) {
    problemas.push('`jugadores.minimo` tiene que ser un entero de 1 en adelante');
  }
  if (m.jugadores.maximo < m.jugadores.minimo) {
    problemas.push('`jugadores.maximo` no puede ser menor que el mínimo');
  }
  if (m.marcador.tipo === 'cifra' && !m.marcador.rotulo) {
    problemas.push('publica una cifra y no dice cómo se llama: `marcador.rotulo` está vacío');
  }
  problemas.push(...problemasDeLaProcedencia(m.procedencia));
  return problemas;
}

/**
 * Lo que está mal en una declaración de procedencia.
 *
 * ═══ POR QUÉ SE COMPRUEBA EN EJECUCIÓN SI EL TIPO YA OBLIGA ═══
 *
 * Porque el tipo obliga a que los campos ESTÉN, no a que digan algo. `titular:
 * ''` compila perfectamente, y una licencia con el titular en blanco es
 * exactamente la etiqueta que nadie puede auditar que este campo existe para
 * evitar — solo que con más ceremonia.
 *
 * Y porque un arcade puede venir de FUERA del binario, cargado por el enchufe en
 * su fase. Ahí no hay compilador de por medio: lo que llega es un objeto que
 * alguien escribió en otro repositorio, y la única defensa es esta.
 */
function problemasDeLaProcedencia(p: ProcedenciaDeArcade): string[] {
  if (p.tipo !== 'licenciado') return [];
  const problemas: string[] = [];
  if (!p.titular.trim()) {
    problemas.push('se declara licenciado y no dice de quién: `procedencia.titular` está vacío');
  }
  if (!p.referencia.trim()) {
    problemas.push(
      'se declara licenciado y no dice dónde está el papel: `procedencia.referencia` está vacía',
    );
  }
  if (!esFechaDeLicencia(p.vigencia.desde)) {
    problemas.push('`procedencia.vigencia.desde` tiene que ser una fecha `AAAA-MM-DD`');
  }
  if (p.vigencia.hasta !== 'perpetua' && !esFechaDeLicencia(p.vigencia.hasta)) {
    problemas.push(
      '`procedencia.vigencia.hasta` tiene que ser una fecha `AAAA-MM-DD` o la palabra `perpetua`',
    );
  }
  return problemas;
}

/**
 * ¿Tiene esto forma de fecha `AAAA-MM-DD`?
 *
 * Se comprueba la FORMA y no que la fecha exista, y se hace con una expresión
 * regular y no construyendo una fecha, por dos razones que van juntas: el reloj
 * de pared está prohibido en todo `shared/arcade/` —lo vigila `verify:pureza`— y
 * además aquí no hace falta. Que el 31 de febrero sea o no un día real es un
 * problema de quien firmó el contrato; lo que este campo tiene que impedir es
 * que alguien escriba «el año que viene».
 */
function esFechaDeLicencia(texto: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto);
}
