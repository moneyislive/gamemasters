/**
 * Contrato de la PARTIDA EN VIVO: lo que ocurre la noche del juego, con la gente
 * sentada a la mesa y el móvil en la mano.
 *
 * Va aparte de `types.ts` a propósito. Aquello describe cómo se PREPARA una
 * partida —jugadores, salas, trama, documentos—; esto describe cómo se JUEGA.
 * Son dos ciclos de vida distintos: el primero dura semanas y lo toca una sola
 * persona, el segundo dura una noche y lo tocan doce a la vez.
 *
 * REGLA QUE GOBIERNA TODO ESTE FICHERO: nada de lo que se define aquí como
 * «vista» puede contener la solución. El móvil de un jugador es un entorno
 * hostil —basta con abrir las herramientas del navegador— así que el servidor
 * envía lo que esa persona puede saber en esa ronda, y nada más.
 */
import type { BoardLayout, BoardMode } from './types';
import type { CategoriaId, EjeId, JuegoId } from './juegos/tipos';
import type { CorreoDeCuenta, IdentidadDeProveedor } from './identidad';

// ---------------------------------------------------------------------------
// Estado de la partida
// ---------------------------------------------------------------------------

/**
 * En qué momento de la partida se está. CADENA LIBRE.
 *
 * ═══ ERA UNA UNIÓN CERRADA DE SIETE ═══
 *
 * `lobby`, `ronda-abierta`, `ronda-cerrada`, `acusaciones`, `sellado`,
 * `intermedio` y `desenlace`. Seis nombres de CLUEDO y uno —`sellado`— que
 * añadió El Misterio de la Momia cuando le hizo falta, lo cual describe el
 * problema entero: para tener una fase propia había que venir a este fichero,
 * que es el contrato de todos, y añadir un renglón.
 *
 * Y el que no venía, fingía. Una subasta llama `ronda-abierta` a «se canta un
 * lote». Una campaña de rol con exploración, combate y descanso tendría que
 * repartir tres momentos que no se parecen en nada entre unos nombres que
 * hablan de rondas y acusaciones — o pedir tres renglones más aquí, y el
 * siguiente juego otros tantos.
 *
 * ═══ QUÉ LA SUSTITUYE ═══
 *
 * Cada juego declara SUS fases en `manifiesto.fases`, con los nombres que
 * quiera, y dice qué SIGNIFICA cada una con `manifiesto.papelDeFase`. La
 * plataforma no reconoce ningún nombre: pregunta por el papel.
 *
 * Los tres juegos de hoy conservan los nombres que tenían, así que nada cambia
 * para ellos. Lo que cambia es que ya no son los únicos posibles.
 */
export type LivePhase = string;

/**
 * Qué significa una fase PARA LA PLATAFORMA.
 *
 * Son las cinco preguntas que el núcleo le hacía a la fase, y se las hacía
 * comparando con nombres: `if (fase === 'lobby')`, `if (phase === 'desenlace')`,
 * `sesion.phase === 'ronda-abierta'`. Aquí están dichas por lo que quieren
 * saber, que es lo único que la plataforma tiene derecho a preguntar.
 */
export type PapelDeFase =
  /** Aún no ha empezado: la gente va llegando y emparejando el móvil. */
  | 'espera'
  /**
   * EL TURNO QUE SE REPITE, abierto a acciones.
   *
   * La ronda de CLUEDO, la vigilia de la Momia, la hora de las Sombras, el lote
   * que se canta en una subasta. Es la fase que se abre y se cierra una y otra
   * vez hasta que la partida se decide.
   */
  | 'turno'
  /** El turno terminó y se habla, pero la partida sigue. */
  | 'entreacto'
  /**
   * DONDE SE DECIDE LA PARTIDA.
   *
   * Las acusaciones de CLUEDO, el Sellado de la Momia, el consejo del alba de
   * las Sombras. Son la misma transición con tres nombres, y hasta hoy eran tres
   * fases distintas en el contrato común porque cada juego trajo la suya.
   *
   * No es un turno más: de un turno se sale al siguiente turno, y de aquí se
   * sale al final.
   */
  | 'decision'
  /**
   * Se cierra la sesión de hoy y la partida NO ha terminado.
   *
   * Es lo que separa una velada de una campaña. Un CLUEDO no pasa nunca por
   * aquí: empieza y acaba la misma noche. Una campaña de varios días vive aquí
   * entre encuentro y encuentro, conservándolo todo.
   */
  | 'pausa'
  /** Se acabó: ya se puede enseñar la respuesta. */
  | 'fin';

/**
 * Los papeles en los que se está JUGANDO.
 *
 * Sustituye a `FASES_EN_JUEGO`, que era una lista de cuatro nombres —los de
 * CLUEDO más el sellado de la Momia— en el contrato común. Preguntar por el
 * papel en vez de por el nombre es lo que permite que un juego tenga cinco
 * fases de juego o una sola.
 */
export const PAPELES_EN_JUEGO: PapelDeFase[] = ['turno', 'entreacto', 'decision'];

/** Elección de sala de un jugador en una ronda concreta. */
export interface EleccionDeLugar {
  round: number;
  lugarId: string;
  /** Hora del SERVIDOR. Nunca la del móvil. */
  at: string;
}

/**
 * Consentimiento de una persona para que su partida se guarde en un perfil.
 *
 * POR QUÉ EXISTE ESTE TIPO. Hasta ahora la cuenta nacía sola: el Game Master
 * escribía un correo al montar la partida y, al llegar el desenlace, el
 * servidor creaba una cuenta con ese correo, le apuntaba la partida y le
 * repartía trofeos. A alguien que a lo mejor ni había abierto la app.
 *
 * Eso es exactamente lo que el RGPD no permite: un tercero no puede dar tu
 * consentimiento por ti, y un correo tecleado por otro no es una identidad
 * verificada. Además tenía consecuencias prácticas feas — una errata creaba una
 * cuenta fantasma, y reutilizar el correo de un conocido le volcaba encima un
 * historial que no era suyo—.
 *
 * Ahora la cuenta nace de un acto de la persona: acepta guardar. Y puede dejar
 * de hacerlo cuando quiera, sin salir de la partida.
 */
export interface VinculoDeCuenta {
  /** Cuenta donde se guarda. */
  accountId: string;
  /** Cuándo lo aceptó. Hora del servidor. */
  aceptadoEl: string;
  /**
   * Cómo se confirmó.
   *
   * `confirmacion` es el jugador pulsando «guardar mis partidas» con el correo
   * que le pusieron. Cuando existan las cuentas con proveedor, `google` y
   * `apple` valdrán más: ahí el correo viene verificado de origen.
   */
  via: 'confirmacion' | 'google' | 'apple';
}

export interface LivePlayer {
  /** Id del sospechoso de la partida: es la identidad dentro del juego. */
  participanteId: string;
  /** Nombre real, para la lista de conectados del Game Master. */
  displayName: string;
  /**
   * Correo que escribió quien organiza al montar la partida.
   *
   * OJO A LO QUE ES Y A LO QUE NO ES. Es una DIRECCIÓN DE INVITACIÓN, no una
   * cuenta ni una identidad: lo teclea una tercera persona y nadie lo ha
   * verificado. Sirve para dos cosas —mandar la invitación y ofrecerle a quien
   * juega guardar la partida en un perfil— y para nada más.
   *
   * Antes bastaba para que el servidor CREARA una cuenta a su nombre al llegar
   * el desenlace, con su historial y sus trofeos, sin que esa persona hubiera
   * pedido nada ni abierto siquiera la app. Ahora no: hace falta `vinculo`.
   */
  email?: string;
  /** Cuenta a la que se ha vinculado, si la persona ya tenía una. */
  accountId?: string;
  /**
   * El consentimiento para guardar esta partida en un perfil.
   *
   * Si no está, no se guarda nada en ninguna cuenta: se juega igual y al
   * terminar no queda rastro de esa persona fuera de la propia partida.
   */
  vinculo?: VinculoDeCuenta;
  /**
   * Código de invitación de seis caracteres que reparte el Game Master.
   * Es el único factor de acceso: sin servidor de correo ni contraseñas que
   * nadie va a recordar con doce invitados esperando.
   */
  joinCode: string;
  /** ¿Ha emparejado ya un móvil? */
  joined: boolean;
  /** Última vez que su móvil dio señales de vida. */
  lastSeenAt?: string;
  elecciones: EleccionDeLugar[];
  /** Cuaderno personal. Texto libre, se guarda según se escribe. */
  notas: string;
  /** Ids de los giros personales que ya se le han entregado. */
  girosRecibidos: string[];
  /**
   * Ha pulsado «estoy listo» en la sala de espera.
   *
   * No abre la partida —eso lo decide quien dirige— pero le dice cuánta gente
   * está esperando ya, que es la pregunta que se hace doce veces mientras la
   * mesa se llena.
   */
  pideEmpezar?: boolean;
  /**
   * Quién ocupó esta silla entrando desde una invitación, sin teclear código.
   *
   * NO ES DECORACIÓN: es la contrapartida de dejar entrar sin código. Verificar
   * el buzón demuestra que ese correo es tuyo, pero NO arregla que quien
   * organiza se equivocara al teclearlo — si puso el correo de otra Ana, esa
   * Ana entraría de buena fe en la velada de unos desconocidos. Así que la
   * silla queda marcada y quien dirige lo ve en su panel junto al código, con
   * la opción de rotarlo. La puerta se abre, pero deja huella.
   */
  reclamadaPor?: { cuentaId: string; correo: string; el: string };
}

export interface RespuestaEntregada {
  /** Quién acusa. */
  participanteId: string;
  /** Un valor por eje del juego. En CLUEDO: culpable, objeto y lugar. */
  respuestas: Record<EjeId, string>;
  /**
   * Hora del SERVIDOR en el instante de recibirla. El ganador se decide por
   * este campo, así que jamás puede venir del cliente: un móvil con la hora
   * cambiada ganaría siempre.
   */
  at: string;
  /** Calculado en el servidor al recibirla. */
  correcta: boolean;
}

export interface LiveSession {
  /** Coincide con el id de la partida. */
  id: string;
  /**
   * A qué se juega. CATA.
   *
   * Está aquí, y no solo en los ajustes de la partida, por una razón que salió
   * al intentarlo: las funciones que gobiernan las fases —`abrirRonda`,
   * `cerrarRonda`, `abrirRespuestas`— reciben la sesión y nada más. Sin esta
   * copia habría que pasarles la partida entera a todas, o buscarla en el
   * almacén dentro de una función que hoy es síncrona y pura.
   */
  juego?: JuegoId;
  /**
   * Identificador interno de ESTA apertura de la partida.
   *
   * No se enseña a nadie: sirve para atar las credenciales de los móviles a la
   * sesión que hay ahora. Antes, cerrar la partida y volver a abrirla repartía
   * códigos nuevos pero los `participanteId` seguían siendo los mismos, así que el
   * testigo de un móvil viejo volvía a valer y rotar los códigos no servía de
   * nada. Con esto, reabrir echa a todo el mundo de verdad.
   *
   * Opcional porque las sesiones creadas antes de existir este campo siguen
   * jugándose sin él.
   */
  sid?: string;
  /** Código corto para entrar, del estilo «TEJADO». Se enseña en la mesa. */
  code: string;
  phase: LivePhase;
  /** 0 mientras no ha empezado. */
  round: number;
  totalRounds: number;
  startedAt?: string;
  roundStartedAt?: string;
  /** Fin previsto de la ronda; el reloj del móvil se sincroniza con esto. */
  roundEndsAt?: string;
  players: LivePlayer[];
  /**
   * LAS RESPUESTAS QUE HA ENTREGADO LA GENTE.
   *
   * Se llamaba `acusaciones`, y el tipo `RespuestaEntregada`. Un juego donde se acusa a
   * alguien de un crimen tiene acusaciones; una expedición tiene un
   * señalamiento del saqueador y un cruce de montaña un consejo del alba. Los
   * tres son lo mismo: una respuesta por eje, entregada una vez y que no se
   * puede cambiar.
   *
   * El CONCEPTO sí es de la plataforma —los ejes están en el manifiesto y
   * `accionDeAcusacion` deduce con qué acción se responde—, así que lo que
   * sobraba era el nombre, no la idea.
   */
  respuestasEntregadas: RespuestaEntregada[];
  /** Sospechoso que ganó, decidido por la primera acusación correcta. */
  /**
   * QUIEN ACERTÓ PRIMERO. No necesariamente quien gana.
   *
   * Se llamaba `winnerId`, y mentía en dos juegos de tres. En El Misterio de la
   * Momia significa «quien primero desenmascaró al saqueador», y ahí gana un
   * BANDO que se decide en el sellado; en El Paso de las Sombras se puede
   * PERDER habiendo acertado la senda, si el rastro llegó al tope.
   *
   * Tanto mentía que hubo que añadir `ganadores` al lado para poder decir la
   * verdad. Ahora los dos campos dicen lo que son y conviven sin confundirse:
   * este es una carrera, y el otro es el resultado.
   */
  primeroEnAcertar?: string;
  /**
   * Quiénes ganaron de verdad, según las reglas del juego.
   *
   * `winnerId` significa «el primero que acertó la acusación», que es ganar en
   * CLUEDO y no lo es en un juego de bandos: en El Misterio de la Momia gana la
   * expedición entera o gana el saqueador, y en El Paso de las Sombras se puede
   * PERDER habiendo acertado la senda, si el rastro llegó al tope.
   *
   * Se escribe UNA vez, al revelar el desenlace, preguntándole al juego con
   * `ganadoresDe`. Se guarda en vez de recalcularse porque quien lo lee después
   * —el panel de partidas de cada cuenta— tiene la sesión pero no la partida
   * entera, y cargarla por cada fila sería un viaje al almacén por línea de una
   * lista.
   *
   * Ausente en CLUEDO y en las partidas de antes: entonces manda `winnerId`, que
   * es lo que había.
   */
  ganadores?: string[];
  /**
   * Lo que cada juego necesita guardar y el motor no interpreta.
   *
   * Las posiciones de una oca, los puntos de vida de una campaña de rol, las
   * cartas repartidas. El motor lo transporta, lo persiste y lo proyecta según
   * las reglas del juego, pero no mira dentro: si mirase, volvería a saber de
   * qué se juega.
   */
  estado?: Record<string, unknown>;
  /**
   * A quién le toca, en los juegos por turnos.
   *
   * Vacío en los simultáneos, donde los doce actúan a la vez.
   */
  turnoDe?: string;
  /**
   * Registro de lo que se ha hecho. Sirve para contar repeticiones por ronda y
   * para que quien dirige vea el pulso de la mesa.
   */
  acciones?: Array<{ participanteId: string; accion: string; round: number; at: string }>;
  /**
   * En qué encuentro va la partida. 1 es el primero.
   *
   * Una velada de una noche se queda en 1 para siempre y nadie lo nota. Una
   * campaña lo va subiendo cada vez que se retoma.
   */
  encuentro?: number;
  /**
   * Lo que pasó en cada encuentro ya cerrado.
   *
   * No es decoración: en una campaña que se retoma al cabo de una semana, esto
   * es lo que permite a doce personas recordar dónde lo dejaron. Se le enseña
   * a quien juega.
   */
  cronica?: Array<{
    encuentro: number;
    titulo: string;
    resumen: string;
    desdeRonda: number;
    hastaRonda: number;
    cerradoEl: string;
  }>;
  /**
   * Salas en las que estuvo alguien en cada ronda ya cerrada.
   *
   * ES UN REGISTRO, NO UN TABLÓN. Se llamó así cuando lo hallado en una sala se
   * ponía en común al cerrar la ronda: esta lista era la que decidía qué pistas
   * se destapaban para TODA la mesa. Esa regla ya no existe —las pistas son de
   * quien las encuentra y no salen de su móvil— así que nada de esto se proyecta
   * ya hacia ningún jugador.
   *
   * Se conserva porque es historia de la partida y las sesiones guardadas la
   * llevan dentro: borrar el campo obligaría a migrar documentos que se están
   * jugando ahora mismo, y a cambio no se gana nada. Quien venga detrás debe
   * saber que escribir aquí NO publica nada.
   */
  /**
   * POR DÓNDE PASÓ ALGUIEN en cada turno ya cerrado.
   *
   * Se llamaba `tablon` porque era la lista que decidía qué pistas se
   * destapaban para TODA la mesa al cerrar la ronda. Esa regla ya no existe
   * —lo que se encuentra es de quien lo encuentra— así que esto no publica
   * nada: es historia de la partida, y se conserva porque las sesiones
   * guardadas la llevan dentro.
   */
  porDondePasaron: Array<{ round: number; lugarId: string }>;
  /**
   * Respuestas del Mayordomo que alguien ha denunciado.
   *
   * Google Play lo exige literalmente a toda app que genere contenido con IA:
   * tiene que haber una forma de denunciar dentro de la propia app, sin salir
   * de ella. Y aquí no es letra pequeña: el Mayordomo es el botón central de la
   * barra, disponible a todas horas y en todas las pantallas.
   *
   * Van a parar a la partida, que es donde puede verlas quien la dirige: en un
   * juego que se monta en casa de alguien, quien responde de lo que sale por
   * pantalla es esa persona, no un buzón lejano.
   */
  denuncias?: Array<{
    participanteId: string;
    displayName: string;
    pregunta: string;
    respuesta: string;
    at: string;
  }>;
  /**
   * Se incrementa en CADA cambio. Es lo que permite que el móvil pregunte
   * «¿ha pasado algo desde la revisión N?» y el servidor le deje esperando
   * hasta que pase, en vez de sondear cada segundo.
   */
  rev: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Cuentas
// ---------------------------------------------------------------------------

export type TrofeoId =
  | 'primera-partida'
  | 'ganador'
  | 'sabueso'
  | 'culpable-impune'
  | 'superviviente'
  | 'escribano'
  /*
   * Los de El Misterio de la Momia. Que esta union sea CERRADA y haya que
   * ampliarla con cada juego es una costura conocida: obliga a tocar el
   * contrato comun para anadir contenido de uno solo. Se deja asi a proposito
   * en esta entrega —el compilador avisa de los sitios que hay que repasar— y
   * el informe de arquitectura propone que pasen a ser cadenas con el juego por
   * delante (`momia:sellador`), que es lo que escala.
   */
  | 'sellador'
  | 'ojo-de-horus'
  | 'incorrupto'
  | 'mano-abierta'
  | 'sombra'
  /*
   * Los de El Paso de las Sombras.
   *
   * NÓTESE QUE NINGUNO ES UNA PALABRA SUELTA, y no es casualidad: `sombra` ya
   * es de la Momia, y el trofeo del traidor de este juego se habría llamado
   * igual con toda naturalidad. Como los ids no llevan prefijo de juego —la
   * costura que el informe propone cerrar—, la única defensa que hay hoy es
   * ponerles nombres que nadie pueda repetir por accidente.
   */
  | 'paso-abierto'
  | 'ojo-de-hanzo'
  | 'sin-rastro'
  | 'palabra-dada'
  | 'sombra-de-akechi';

export interface TrofeoInfo {
  id: TrofeoId;
  nombre: string;
  descripcion: string;
  glifo: string;
}

/**
 * Los trofeos que se ganan en CUALQUIER juego, porque no dependen de sus reglas.
 *
 * Haber jugado la primera partida, haber llenado el cuaderno de notas y seguir
 * con el móvil encendido al cerrar significan lo mismo en un misterio de salón,
 * en una expedición a una tumba y en una oca. Los reparte la plataforma, en
 * `live/cuentas.ts`.
 *
 * LOS DEMÁS DE `TROFEOS` NO SON DE LA CASA, AUNQUE ESTÉN EN LA MISMA LISTA:
 * `ganador`, `sabueso` y `culpable-impune` son reglas de CLUEDO —«fuiste el
 * culpable y nadie te descubrió» no quiere decir nada donde no hay culpable— y
 * se reparten desde `juegos/cluedo-trofeos.ts`, igual que la Momia reparte los
 * suyos. Se quedan en `TROFEOS` porque esa lista ES el catálogo de CLUEDO: su
 * manifiesto la declara tal cual.
 *
 * Esta constante existe para que la vitrina del perfil pueda enseñar lo que de
 * verdad se puede ganar en la partida que se está jugando, en vez de los seis de
 * CLUEDO en cualquier juego.
 */
export const TROFEOS_DE_LA_CASA: TrofeoId[] = ['primera-partida', 'escribano', 'superviviente'];

export const TROFEOS: TrofeoInfo[] = [
  {
    id: 'primera-partida',
    nombre: 'Primera velada',
    descripcion: 'Jugaste tu primera partida entera.',
    glifo: '🕯',
  },
  {
    id: 'ganador',
    nombre: 'Quien lo resolvió',
    descripcion: 'Fuiste el primero en dar con la combinación correcta.',
    glifo: '🏆',
  },
  {
    id: 'sabueso',
    nombre: 'Sabueso',
    descripcion: 'Acertaste la combinación completa a la primera.',
    glifo: '🔎',
  },
  {
    id: 'culpable-impune',
    nombre: 'Crimen perfecto',
    descripcion: 'Fuiste el culpable y nadie te descubrió.',
    glifo: '🗝',
  },
  {
    id: 'superviviente',
    nombre: 'Hasta el final',
    descripcion: 'Terminaste la velada sin desconectarte ni una vez.',
    glifo: '⏳',
  },
  {
    id: 'escribano',
    nombre: 'Escribano',
    descripcion: 'Llenaste el cuaderno: más de mil caracteres de notas.',
    glifo: '✒',
  },
];

export interface PartidaJugada {
  gameId: string;
  titulo: string;
  personaje: string;
  jugadaEl: string;
  /** ¿Acertó su acusación? */
  acerto: boolean;
  /** ¿Fue el primero en acertar? */
  gano: boolean;
  /** ¿Le tocó ser el señalado por la respuesta? */
  eraElSenalado: boolean;
}

/**
 * Una cuenta de la plataforma.
 *
 * Todo lo nuevo es OPCIONAL a propósito: hay comprobadores que construyen
 * cuentas literales, y un campo obligatorio los rompería a todos sin aportar
 * nada. Las cuentas antiguas se ven al día al leerlas (ver `juegos/migracion`).
 */
export interface Account {
  id: string;
  /**
   * Correo principal de la cuenta, en minúsculas y sin espacios.
   *
   * Sigue siendo el índice por el que se busca en el camino del consentimiento.
   * Lo que NO puede hacer nunca es abrir una sesión desde un inicio con
   * proveedor: ahí la identidad es el `sub`, no el correo. Un correo cambia de
   * dueño; un `sub`, no.
   */
  email: string;
  displayName: string;
  createdAt: string;
  partidas: PartidaJugada[];
  trofeos: TrofeoId[];

  // ---- Identidad. Todo opcional: las cuentas de antes no lo tienen. ----
  /** Proveedores vinculados. Ninguno = cuenta nacida del consentimiento. */
  identidades?: IdentidadDeProveedor[];
  /** Los correos que se le conocen, y hasta dónde llega la prueba de cada uno. */
  correos?: CorreoDeCuenta[];
  /**
   * Puede abrir el taller y dirigir partidas.
   *
   * Se lee del almacén en CADA petición y nunca se sella dentro del pasaporte:
   * si fuera al revés, retirarle el permiso a alguien no surtiría efecto hasta
   * que caducara su sesión, y eso son noventa días.
   */
  taller?: boolean;
  /**
   * Corte de revocación: toda sesión emitida antes de esta fecha deja de valer.
   *
   * Es la única forma de echar a alguien de una sesión firmada sin estado. Sin
   * esto, la única manera sería rotar el secreto del servidor, que echaría
   * también a todos los jugadores de todas las campañas en curso.
   */
  sesionesValidasDesde?: string;
}

// ---------------------------------------------------------------------------
// La vista del jugador: lo ÚNICO que sale del servidor hacia un móvil
// ---------------------------------------------------------------------------

/** Una sala, tal como la ve un jugador. Sin nada de la trama. */
export interface LugarVista {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  /** ¿Alguien ya está ahí esta ronda? Se enseña para animar a repartirse. */
  ocupantes: number;
  /**
   * Dónde está clavada su chincheta sobre la foto aérea, en fracción del ancho
   * y del alto (0–1). Solo tiene valor si la partida se juega sobre el plano
   * del espacio real.
   */
  pin?: { x: number; y: number };
}

/**
 * El plano de la casa.
 *
 * Este es el único bloque de la vista que se envía ENTERO, sin recortar, y
 * conviene dejar dicho por qué: el tablero lo produce `generateBoardLayout()` a
 * partir de la lista de salas y de nada más. No mira la trama, ni quién es el
 * culpable, ni en qué sala está cada pista. Es la planta del edificio, y la
 * planta la ve cualquiera que cruce la puerta.
 *
 * Lo que sí es información de juego —dónde estoy, dónde hay gente, en qué salas
 * ya se encontró algo— no viaja aquí: se pinta encima con lo que el jugador ya
 * tenía en su vista.
 */
export interface TableroVista {
  /**
   * Con cuál de los dos empezó quien preparó la partida. No excluye al otro:
   * si vienen los dos, este solo decide cuál se enseña primero.
   */
  modo: BoardMode;
  /** Foto cenital del sitio de verdad, relativa al servidor. Si la hay. */
  imagenUrl?: string;
  /** El plano de rejilla con salas y pasadizos. Si está trazado. */
  plano?: BoardLayout;
}

export interface MomentoVista {
  time: string;
  description: string;
}

export interface VistaJugador {
  /** Revisión con la que se compuso: el móvil la devuelve al esperar cambios. */
  rev: number;
  sesion: {
    code: string;
    phase: LivePhase;
    round: number;
    totalRounds: number;
    roundEndsAt?: string;
    /** Hora del servidor al componer la vista: el móvil ajusta su reloj. */
    ahora: string;
    tituloPartida: string;
    lema: string;
    /** Cuántos han pulsado «estoy listo» y cuántos son en total. */
    listos: number;
    total: number;
    /** En qué encuentro va la partida. 1 en una velada de una sola noche. */
    encuentro: number;
    /**
     * A qué se juega.
     *
     * Lo necesita el móvil para saber qué pestañas pintar en la barra y qué
     * icono darle al asistente. Sin esto la app tendría que adivinarlo, o
     * peor: dar por hecho que siempre es CLUEDO.
     */
    juego?: JuegoId;
  };
  /**
   * El caso, tal como lo conoce todo el mundo.
   *
   * Es lo que en el dosier impreso ocupa la sección «El caso»: sin esto, quien
   * juega desde el móvil sabe quién es su personaje pero no de qué va la
   * velada, ni quién ha muerto, ni dónde está.
   */
  caso: {
    sinopsis: string;
    /**
     * Quien ha muerto. AUSENTE en un juego donde no ha muerto nadie.
     *
     * Era obligatoria, asi que la vista de una expedicion arqueologica llevaba
     * una victima inventada —«el faraon sin nombre»— y la de una subasta un
     * guion: la app pintaba «La victima · —» en el dosier de todo el mundo.
     *
     * Ausente significa ausente: quien la pinta se salta el bloque entero. No
     * hay cadena vacia que interpretar.
     */
    victima?: { nombre: string; descripcion: string };
    ambientacion: string;
    /** Las reglas que se leen en voz alta al empezar. */
    reglas: string[];
  };
  yo: {
    participanteId: string;
    displayName: string;
    characterName: string;
    role: string;
    publicPersona: string;
    /** Tu secreto. Tuyo: nadie más lo recibe. */
    secret: string;
    motive: string;
    alibi: string;
    personalHook: string;
    photoUrl?: string;
    /** Se va desbloqueando ronda a ronda. */
    conocimiento: string[];
    /** Cuántas piezas de conocimiento quedan por desbloquear. */
    conocimientoPendiente: number;
    /** Giros personales ya entregados, en orden. */
    giros: Array<{ id: string; round: number; instruction: string }>;
    /**
     * QUÉ HIZO TU PERSONAJE ESA NOCHE, hora a hora.
     *
     * Es la cronología de la trama recortada a los momentos en los que TÚ
     * estuviste. Sirve para que quien abre el dosier entienda de un vistazo qué
     * hacía su personaje mientras ocurría el crimen, en vez de tener que
     * deducirlo de la coartada.
     *
     * No es la cronología pública: ahí solo va lo que presenciaron todos, y esto
     * incluye también lo que hiciste sin testigos. Lo compone `proyeccion.ts`,
     * que es quien decide qué momentos son seguros de enviar.
     */
    cronologiaPropia: MomentoVista[];
    notas: string;
    /**
     * ERES TU LA RESPUESTA. Solo lo sabes tu, y le cambia el tono a la app.
     *
     * Se llamaba `soyCulpable`, y en dos de los tres juegos no habia ningun
     * culpable: en la Momia eres quien rompio el sello y en las Sombras quien
     * traiciona. Los dos tuvieron que escribir su propia tabla de textos para
     * tapar la palabra —«Tu rompiste el sello» / «Tu no rompiste el sello»— y
     * el que no la escribiera se habria encontrado a un arqueologo leyendo que
     * es el asesino.
     *
     * Lo que significa de verdad es esto: hay un eje de la respuesta final que
     * señala a alguien de la mesa, y ese alguien eres tu.
     */
    soyElSenalado: boolean;
    /** ¿Ya ha avisado de que está listo para empezar? */
    pediEmpezar: boolean;
  };
  /** Los demás, con lo que cualquiera sabría de ellos. */
  jugadores: Array<{
    participanteId: string;
    displayName: string;
    characterName: string;
    role: string;
    photoUrl?: string;
    conectado: boolean;
    /** Sala en la que está esta ronda, si la ha elegido. */
    salaActual?: string;
    /** Se llamaba `yaAcuso`. ¿Ha entregado ya su respuesta? */
    yaRespondio: boolean;
  }>;
  /**
   * LOS LUGARES de este juego, con lo que se sabe de cada uno.
   *
   * Se llamaba `salas` y su tipo `LugarVista`. Una expedición tiene cámaras y un
   * cruce de montaña tiene pasos: los dos los mandaban por un campo que decía
   * «sala», y el móvil los pintaba bajo el rótulo que su manifiesto declara —así
   * que la palabra sobraba solo aquí, en el contrato.
   */
  lugares: LugarVista[];
  /** El plano de la casa. Ausente si la partida todavía no tiene tablero. */
  tablero?: TableroVista;
  /**
   * LAS DEMAS CATEGORIAS del juego, en el orden en que las declara.
   *
   * ═══ AQUI HABIA UN CAMPO LLAMADO `objetos` ═══
   *
   * Era la tercera categoria de CLUEDO —las armas— con un hueco propio en el
   * contrato de la plataforma. Se rellenaba buscando la categoria cuyo
   * `almacenHeredado` fuese `weapons`, asi que funcionaba por casualidad: la
   * Momia guardaba ahi sus amuletos y las Sombras sus enseres porque los dos
   * habian declarado ese almacen, no porque el campo significase nada.
   *
   * Y tenia el limite que se ve en cuanto se escribe el cuarto juego: una
   * partida con CUATRO categorias —cartas, conjuros, reliquias— solo podia
   * mandar UNA. Las otras no tenian por donde salir.
   *
   * Ahora sale una entrada por categoria, con el rotulo que el juego declara,
   * y la app pinta la lista sin saber a que juega. Las dos que la plataforma
   * SI conoce no vienen aqui, porque tienen bloque propio y con mas cosas
   * dentro: las personas van en `jugadores` —con presencia y con quien ha
   * respondido— y los lugares en `lugares` —con ocupantes y chincheta—.
   *
   * No abre ninguna brecha: son las entidades del taller, que estan impresas en
   * el material que hay encima de la mesa.
   */
  entidades: Array<{
    categoriaId: CategoriaId;
    /** «objeto» / «objetos», tal como los llama este juego. */
    singular: string;
    plural: string;
    /** El rotulo ya resuelto para encabezar el bloque: «Los objetos». */
    titulo: string;
    cosas: Array<{ id: string; name: string; description?: string; photoUrl?: string }>;
  }>;
  /**
   * Qué hay que responder para responder, y con qué opciones.
   *
   * Lo compone el servidor a partir del manifiesto del juego. Antes la app
   * pintaba tres selectores escritos a mano —culpable, objeto y sala— y por
   * tanto solo servía para CLUEDO. Ahora recorre esta lista: si un juego tiene
   * dos ejes o cinco, la pantalla de acusación sale bien sin tocarla.
   *
   * No abre ninguna brecha: las opciones son las mismas entidades que ya
   * viajan en `jugadores`, `salas` y `objetos`.
   */
  ejes: Array<{
    ejeId: EjeId;
    /** «¿Quién lo hizo?» */
    pregunta: string;
    /** «Quién» */
    rotulo: string;
    opciones: Array<{ id: string; nombre: string }>;
  }>;
  /**
   * Qué puedes hacer ahora mismo, con sus opciones ya resueltas.
   *
   * Lo compone el servidor desde el repertorio del juego, filtrando por la
   * fase, por si te toca y por las veces que ya lo has hecho. La app lo pinta
   * sin saber a qué se juega: una acción nueva no obliga a escribir una
   * pantalla nueva.
   *
   * No abre ninguna brecha: las opciones son entidades que ya viajan en la
   * vista.
   */
  acciones: Array<{
    id: string;
    rotulo: string;
    campos: Array<{
      campo: string;
      rotulo: string;
      opciones: Array<{ id: string; nombre: string }>;
    }>;
    /**
     * Las CANTIDADES que pide la acción, si pide alguna.
     *
     * Sin esto, una acción que necesitara un número llegaba al móvil como un
     * botón SIN CAMPOS: el panel genérico solo sabía pintar `campos`, así que un
     * juego con dinero, con dados o con puntos de vida tenía que escribir
     * pantalla propia —o sea, publicar una versión nueva del binario— nada más
     * que para poder teclear una cifra.
     *
     * No hay riesgo en enviarlo: son los límites que el juego declara en su
     * manifiesto, que es público. Quien los hace valer es el motor, en el
     * servidor, y volvería a hacerlo aunque el móvil mandara cualquier cosa.
     */
    numeros?: Array<{
      campo: string;
      rotulo: string;
      minimo?: number;
      maximo?: number;
      porDefecto?: number;
      entero?: boolean;
    }>;
  }>;
  /**
   * Lo que este juego concreto necesita ensenarle a quien juega.
   *
   * POR QUE HACIA FALTA. `LiveSession.estado` ya existia para que un juego
   * guardase lo suyo —las marcas de la maldicion, los amuletos, los fragmentos—
   * pero no habia por donde sacarlo al movil: la vista del jugador solo tenia
   * huecos con forma de misterio (salas, pistas, tablon, acusacion). Un juego
   * podia recordar lo suyo y no podia contarlo.
   *
   * Lo rellena la funcion que cada juego registra con `registrarProyeccion`, y
   * es ESA funcion la que decide que ve cada persona. El motor no mira dentro:
   * si mirase, volveria a saber de que se juega.
   *
   * CLUEDO no registra ninguna y su vista no cambia ni un byte. Lo comprueba el
   * maestro de oro.
   */
  estadoDelJuego?: unknown;
  /** El lugar que has elegido esta ronda, si ya lo has hecho. */
  miLugar?: string;
  /**
   * POR DONDE HAS PASADO TU, ronda a ronda.
   *
   * ═══ POR QUE ESTO ES DE LA PLATAFORMA Y LAS PISTAS NO ═══
   *
   * El plano marcaba los sitios que te habian dado algo, y lo sacaba de
   * `misHallazgos`: una lista de PISTAS. Con eso, el mapa de un juego que no
   * tenga pistas —la Momia, las Sombras— salia sin una sola marca, porque esa
   * lista les llegaba vacia y nadie lo notaba: un plano limpio parece un plano
   * al principio de la partida.
   *
   * Haber estado en un sitio, en cambio, significa lo mismo en cualquier juego
   * que tenga lugares: la plataforma lo sabe porque es ella quien registra las
   * elecciones de cada ronda. El plano marca eso, y quien ademas quiera marcar
   * lo que encontro lo pinta desde lo suyo.
   *
   * Solo el tuyo. Por donde pasaron los demas no se manda a nadie.
   */
  miRecorrido: Array<{ round: number; lugarId: string }>;
  /**
   * Lo que pasó en los encuentros anteriores.
   *
   * Vacío en una velada de una noche. En una campaña es lo primero que se mira
   * al retomarla.
   */
  cronica: Array<{ encuentro: number; titulo: string; resumen: string; cerradoEl: string }>;
  /** Hechos públicos de la cronología. */
  cronologia: MomentoVista[];
  /** Narración de la ronda en curso, si el Game Master la ha lanzado. */
  narracion?: { title: string; text: string };
  /** Tu respuesta, si ya la has entregado. Se llamaba `miAcusacion`. */
  miRespuesta?: { respuestas: Record<EjeId, string>; at: string };
  /** Solo cuando la partida ha terminado. */
  desenlace?: {
    /**
     * La respuesta, ya resuelta a nombres para poder leerla sin más consultas.
     * Un renglón por eje, en el orden que declara el juego.
     */
    respuestas: Array<{ ejeId: EjeId; rotulo: string; entidadId: string; nombre: string }>;
    /**
     * QUIEN RESULTO SER. Se conserva aparte de `respuestas` porque la app lo
     * necesita para saber si eres tu, y eso no es un eje mas: es la unica
     * respuesta que ademas identifica a una persona de la mesa.
     *
     * Se llamaba `culpableId`. Ausente en un juego donde ningun eje señala a
     * nadie —una subasta, una carrera— y entonces no se pinta el bloque.
     */
    senaladoId?: string;
    /**
     * POR QUE LO HIZO. Ausente en un juego donde no lo hizo nadie.
     *
     * Sale de `plot.solution.motive`, que se escribio para un crimen. Una
     * subasta mandaba cadena vacia y el movil pintaba un apartado sin nada
     * dentro.
     */
    motive?: string;
    reconstruccion: string;
    confesion?: string;
    epilogo?: string;
    ganador?: { participanteId: string; displayName: string; at: string };
    clasificacion: Array<{
      participanteId: string;
      displayName: string;
      acerto: boolean;
      at?: string;
      aciertos: number;
    }>;
  };
}

/** Vista del Game Master mientras dirige. Nunca incluye la solución. */
export interface VistaGameMaster {
  sesion: LiveSession;
  /** Cuántos han emparejado y cuántos están vivos ahora mismo. */
  conectados: number;
  /** Reparto de gente por sala en la ronda en curso. */
  ocupacion: Array<{ lugarId: string; lugarNombre: string; participanteIds: string[] }>;
  /** Giros pendientes de entregar en la ronda en curso. */
  girosPendientes: Array<{ id: string; participanteId: string; displayName: string; round: number }>;
  /** Cuántas acusaciones se han recibido. */
  respuestasRecibidas: number;
  /** Quiénes han avisado de que están listos para empezar. */
  listos: Array<{ participanteId: string; displayName: string }>;
  /** El Game Master a ciegas no ve si son correctas. */
  revelaSolucion: boolean;
}

// ---------------------------------------------------------------------------
// Eventos que viajan por el stream
// ---------------------------------------------------------------------------

export type LiveEvent =
  /** Estado completo. Se manda al conectar y tras cada cambio relevante. */
  | { type: 'vista'; vista: VistaJugador }
  /** Aviso efímero para animar la pantalla: la app decide cómo celebrarlo. */
  | { type: 'aviso'; clave: AvisoClave; texto: string }
  /** Latido para que los proxies no cierren la conexión. */
  | { type: 'latido'; ahora: string };

export type AvisoClave =
  | 'ronda-abierta'
  | 'ronda-cerrada'
  | 'giro'
  | 'ayuda'
  /* Se llamaba `acusaciones`: es el momento de entregar la respuesta. */
  | 'respuestas'
  /* El Sellado, de El Misterio de la Momia. */
  | 'sellado'
  | 'desenlace'
  | 'ganador';

export type LiveGmEvent =
  | { type: 'vista'; vista: VistaGameMaster }
  | { type: 'latido'; ahora: string };

// ---------------------------------------------------------------------------
// Utilidades compartidas
// ---------------------------------------------------------------------------

/**
 * Alfabeto sin caracteres que se confunden al dictarlos en voz alta a doce
 * personas: fuera la O y el 0, la I y el 1, la L, la S y el 5.
 */
export const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRTUVWXYZ2346789';

export function esCodigoValido(codigo: string): boolean {
  return /^[A-Z0-9]{4,8}$/.test(codigo.trim().toUpperCase());
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}
