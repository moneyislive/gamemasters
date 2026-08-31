/**
 * LA AUTORIDAD. Valida QUIÉN y CUÁNDO, y luego llama a las reglas.
 *
 * La regla que ordena el árbol entero cabe en una línea, y este fichero es su
 * mitad derecha:
 *
 *     `shared/` son las reglas. `server/` es la autoridad.
 *
 * ═══ QUÉ COMPRUEBA ESTO, Y QUÉ NO COMPRUEBA A PROPÓSITO ═══
 *
 * Comprueba TRES cosas, y las tres son ciertas en cualquier arcade porque
 * ninguna habla del juego:
 *
 *   1. QUIÉN. Que quien manda el movimiento esté sentado a esta mesa.
 *   2. CUÁNDO. Que la mesa no esté terminada.
 *   3. SOBRE QUÉ. Que la revisión que trae no sea rancia — o sea, que no esté
 *      actuando sobre un estado que ya no existe.
 *
 * Y NO comprueba nada más. En particular no comprueba los identificadores que
 * vengan dentro del movimiento, y esa ausencia es una consecuencia directa del
 * diseño y no un descuido:
 *
 * ═══ POR QUÉ NO SE VALIDAN LOS IDENTIFICADORES AQUÍ ═══
 *
 * En el motor de veladas sí se hace, y está bien hecho: `ejecutarAccion`
 * comprueba que lo elegido sea una entidad REAL de la categoría que la acción
 * declara, y eso impide que un móvil manipulado mande el id de una sala donde va
 * un sospechoso. Puede hacerlo porque el manifiesto declara las categorías y la
 * partida tiene las entidades dadas de alta.
 *
 * Aquí EL ESTADO ES OPACO. El árbitro no sabe qué es un vértice, ni cuál de tus
 * cartas es real, ni si esa casilla existe en el tablero que el juego se ha
 * dibujado. Intentar comprobarlo obligaría al manifiesto a declarar la forma del
 * estado, y toda esta arquitectura cuelga de que no lo haga.
 *
 * Así que la comprobación NO DESAPARECE: BAJA AL REDUCTOR, que es el único que
 * sabe qué es real en su juego. El trato es explícito y del mismo orden que el
 * de `eligeLibre` en las veladas: lo que llega en la carga no está validado, y
 * un reductor que se lo crea sin mirar abre el agujero entero. Está dicho
 * también en la cabecera de `movimiento.ts`, porque es la clase de garantía que
 * a alguien le entrarán ganas de volver a subir aquí «para tenerla en un solo
 * sitio» — y subirla es reconstruir el acoplamiento.
 *
 * ═══ Y NO DUPLICA NI UNA REGLA DEL JUEGO ═══
 *
 * Ni el turno, ni el fin, ni cuántas veces se puede hacer algo, ni si quedan
 * cartas. El motor no tiene ninguna opinión sobre el turno: de quién es el turno
 * es un campo del estado del juego, y el reductor lo mira. En cuanto el árbitro
 * supiera qué es un turno, el primer juego rico decidiría qué forma tiene.
 *
 * Compárese con el fallo público de boardgame.io, que en su capa de autoridad
 * tiene escrito «solo permitir deshacer/rehacer si hay exactamente un jugador
 * que pueda mover ahora mismo». Eso es una REGLA DE JUEGO cableada en el
 * árbitro, no una política que el juego declare.
 *
 * ═══ NO HABLA CON EL CANAL, Y ESO TAMBIÉN ES DELIBERADO ═══
 *
 * Este fichero no importa `server/src/canal/`. Avisar de que la mesa ha cambiado
 * es transporte y lo hace quien atiende la petición HTTP. Mezclarlo aquí tendría
 * dos consecuencias feas: no se podría ejecutar el árbitro sin montar un canal
 * —o sea, no se podría probar en proceso— y un dispositivo que quisiera usar la
 * misma autoridad en local arrastraría el bus del servidor.
 */
import {
  avanzar,
  manifiestoDeArcade,
  movimientoDeTic,
} from '../../../shared/arcade';
import type {
  ArcadeId,
  AsientoId,
  ContextoMovimiento,
  ManifiestoDeArcade,
  Movimiento,
  MovimientoRegistrado,
  Tic,
} from '../../../shared/arcade';

/**
 * UNA MESA. Lo que la autoridad guarda de una partida.
 *
 * ═══ POR QUÉ ESTO NO SE PARECE A `LiveSession` ═══
 *
 * Una sesión de velada tiene `players` con `joinCode`, `phase`, `round`,
 * `totalRounds`, `turnoDe`, `respuestasEntregadas` y `porDondePasaron`. Todo eso
 * es forma de velada, y un juego con otra forma tendría que traducirse a ella.
 *
 * Aquí no hay ni fase, ni ronda, ni turno. Hay un estado opaco, un contador de
 * revisión, un reloj y una lista de sitios ocupados. Todo lo que un juego
 * necesite además —de quién es el turno, en qué ronda va, cuántas cartas
 * quedan— vive DENTRO de `estado` y el árbitro no lo mira nunca.
 *
 * Y una mesa nace de un código que genera EL PRIMER JUGADOR, no de
 * `personasDe(game)` copiado por un Game Master que dio de alta a doce personas
 * en un taller. Esa diferencia es la que permite que exista un juego sin cuentas.
 */
export interface Mesa {
  /** El identificador de la mesa. Lo genera quien la abre. */
  id: string;
  arcade: ArcadeId;

  /**
   * Los sitios ocupados, en el orden en que se ocuparon.
   *
   * PUEDE ESTAR VACÍO, y eso no es una mesa a medio montar: es un arcade de un
   * jugador donde el servidor solo verifica, o un juego de un solo aparato que
   * usa la autoridad para guardar. Una mesa sin asientos es una mesa sin puerta:
   * no hay a quién comprobar, así que no se comprueba a nadie. Ver `jugar`.
   */
  asientos: readonly AsientoId[];

  /**
   * El estado del juego. OPACO.
   *
   * Puede ser `undefined` al abrir, y es una forma legítima de empezar: un
   * reductor puede crear su estado inicial en el primer movimiento
   * (`estado ?? recienNacido(ctx)`) y así la semilla y los asientos que use para
   * repartir quedan dentro del registro, con lo que la reejecución los
   * reproduce. La alternativa —construirlo fuera— también vale, y entonces quien
   * abre la mesa se encarga de que sea reproducible.
   */
  estado: unknown;

  /**
   * LA REVISIÓN. Sube uno con cada movimiento aceptado.
   *
   * Es control de concurrencia optimista, el mismo mecanismo que boardgame.io
   * llama `stateID` y que aquí se llama como se llama en el resto de este
   * repositorio. Su trabajo es rechazar movimientos de un dispositivo que actúa
   * sobre un estado que ya no existe: dos personas tocando a la vez, o una que
   * volvió de segundo plano con la pantalla de hace diez segundos.
   */
  rev: number;

  /** En qué tic va el reloj de esta mesa. Cero si el arcade no tiene reloj. */
  tic: Tic;

  /**
   * La semilla del azar de esta mesa. La elige el SERVIDOR al abrirla.
   *
   * Si la eligiera el dispositivo, un cliente manipulado probaría semillas hasta
   * dar con la que le reparte la mano que quiere. Que viaje en el contexto y no
   * en el estado inicial es lo que permite que el reductor la use sin conocerla
   * de antemano.
   */
  semilla: number;

  /**
   * ¿Se acabó?
   *
   * Es un HECHO que la autoridad anota, no una regla que el motor calcule. «Fin
   * como función del estado» es uno de los once conceptos que el diseño aplaza
   * hasta que llegue un juego que lo pida, y aplazarlo tiene un motivo: en
   * cuanto el motor sepa preguntarle al juego si ha terminado, tendrá una
   * opinión sobre qué es terminar — si hay un ganador, si son varios, si se
   * puede seguir jugando después.
   *
   * Mientras tanto, quien hospeda llama a `cerrarMesa` cuando el estado del
   * juego dice que se acabó. El juego sí lo sabe.
   */
  terminada: boolean;

  /**
   * EL DIARIO: todos los movimientos aceptados, con su contexto.
   *
   * Es lo que convierte una partida en algo reproducible: el estado final deja
   * de ser un dato en el que hay que creer y pasa a ser una consecuencia que se
   * puede recalcular. De aquí salen la verificación de un marcador, la
   * repetición de una partida y la comparación entre dos motores de JavaScript.
   *
   * Y solo lo escribe este fichero, que es el único sitio por el que un
   * movimiento puede entrar. Un diario que se pudiera escribir desde fuera no
   * sería una prueba de nada.
   */
  diario: readonly MovimientoRegistrado[];
}

/** Por qué se ha rechazado un movimiento. UNIÓN CERRADA. */
export type MotivoDeRechazo =
  /** No está sentado a esta mesa, o no ha dicho quién es. */
  | 'no-estas-sentado'
  /** La partida ya terminó. */
  | 'mesa-terminada'
  /** Actúa sobre un estado que ya no existe. */
  | 'revision-rancia';

/**
 * Un movimiento rechazado por la autoridad.
 *
 * ═══ POR QUÉ EL MOTIVO ES UNA UNIÓN CERRADA Y NO UN TEXTO ═══
 *
 * Porque quien atiende la petición HTTP tiene que traducirlo a un código de
 * respuesta, y una revisión rancia no es lo mismo que un intruso: la primera se
 * arregla sola —el dispositivo vuelve a pedir el estado y reintenta— y la
 * segunda es un 403 que hay que enseñar. Con un texto, esa traducción se haría
 * comparando cadenas, que es la forma de que un cambio de redacción se lleve por
 * delante el reintento automático sin que nada avise.
 */
export class MovimientoRechazado extends Error {
  constructor(
    public readonly motivo: MotivoDeRechazo,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'MovimientoRechazado';
  }
}

/** Lo que llega desde un dispositivo. */
export interface Peticion {
  /** Quién dice ser. Lo resuelve quien atiende la petición, no el dispositivo. */
  quien: AsientoId | null;
  movimiento: Movimiento;
  /**
   * Sobre qué revisión creía estar actuando. OBLIGATORIA.
   *
   * Podría ser opcional —«si no la mandas, no la compruebo»— y sería un error de
   * los que se pagan caros: un dispositivo manipulado la omitiría y conseguiría
   * exactamente la escritura rancia que la comprobación existe para impedir. Una
   * comprobación que el comprobado puede desactivar no es una comprobación.
   */
  rev: number;
}

/** Abre una mesa. Quién puede abrirla y con qué código es cosa de su fase. */
export function abrirMesa(datos: {
  id: string;
  arcade: ArcadeId;
  semilla: number;
  asientos?: readonly AsientoId[];
  estado?: unknown;
}): Mesa {
  /*
   * Se pide el manifiesto aunque no se use el resultado, y no es un descuido: es
   * la forma de que abrir una mesa de un arcade que no está instalado falle AQUÍ
   * —con `ArcadeNoInstalado`, en la petición que la abre— en vez de al primer
   * movimiento, cuando ya hay gente esperando. Es la misma lección que
   * `manifiestoDe`, que devolvía CLUEDO por defecto y dejaba jugar una velada
   * entera con las reglas de otro juego.
   */
  manifiestoDeArcade(datos.arcade);
  return {
    id: datos.id,
    arcade: datos.arcade,
    asientos: datos.asientos ?? [],
    estado: datos.estado,
    rev: 0,
    tic: 0,
    semilla: datos.semilla,
    terminada: false,
    diario: [],
  };
}

/**
 * Da la mesa por terminada. Lo llama quien hospeda cuando el juego lo dice.
 *
 * Devuelve una mesa nueva y no muta la que recibe, como todo lo de aquí: una
 * autoridad que muta en sitio deja estados a medias cuando algo falla en medio,
 * y en concurrencia optimista «a medias» es indistinguible de «bien».
 */
export function cerrarMesa(mesa: Mesa): Mesa {
  return { ...mesa, terminada: true, rev: mesa.rev + 1 };
}

/** El manifiesto de la mesa, por comodidad de quien la hospeda. */
export function manifiestoDeLaMesa(mesa: Mesa): ManifiestoDeArcade {
  return manifiestoDeArcade(mesa.arcade);
}

/**
 * EL CAMINO PRINCIPAL: alguien mueve.
 *
 * Valida, llama a `avanzar()` de `shared/` y devuelve la mesa nueva. Ni una
 * regla del juego por el camino.
 */
export function jugar(mesa: Mesa, peticion: Peticion): Mesa {
  if (mesa.terminada) {
    throw new MovimientoRechazado('mesa-terminada', 'Esta partida ya ha terminado.');
  }

  /*
   * LA REVISIÓN SE COMPRUEBA ANTES QUE EL ASIENTO, y el orden importa poco para
   * la corrección y mucho para el mensaje: si alguien vuelve de segundo plano
   * con la pantalla vieja, lo que le pasa es que su revisión es rancia, no que
   * no esté sentado. Decírselo al revés le manda a reconectar cuando lo que
   * tiene que hacer es refrescar.
   */
  if (peticion.rev !== mesa.rev) {
    throw new MovimientoRechazado(
      'revision-rancia',
      `Ese movimiento va sobre la revisión ${peticion.rev} y la mesa va por la ${mesa.rev}. ` +
        'Pide el estado otra vez y vuelve a intentarlo.',
    );
  }

  /*
   * QUIÉN. Y aquí está el caso que hace que esto no sea el motor de veladas:
   *
   * `ejecutarAccion` exige SIEMPRE que quien actúa esté en `sesion.players`,
   * porque una velada sin gente dada de alta no existe. Aquí una mesa SIN
   * ASIENTOS es una forma normal de mesa —un arcade de un jugador donde el
   * servidor solo verifica la repetición— y exigir un asiento obligaría a
   * inventarse uno. Inventarse un asiento para pasar una comprobación es
   * exactamente el peaje que `verify:ajeno` lleva contando desde que existe.
   *
   * Así que: si hay asientos, hay puerta y se comprueba. Si no los hay, no hay
   * puerta y no se comprueba a nadie. Lo que NO se hace nunca es dejar pasar un
   * `null` a una mesa que sí tiene asientos: eso convertiría «no digo quién soy»
   * en una llave maestra.
   */
  if (mesa.asientos.length > 0 && !mesa.asientos.includes(peticion.quien ?? '')) {
    throw new MovimientoRechazado('no-estas-sentado', 'No estás sentado a esta mesa.');
  }

  return aplicarMovimiento(mesa, peticion.movimiento, peticion.quien);
}

/**
 * EL RELOJ, que entra por la misma puerta y no es una excepción.
 *
 * ═══ POR QUÉ ESTO NO ES UN `setTimeout` ═══
 *
 * Un plazo que vence fuera del reductor es un cambio de estado que no está en el
 * diario. Reejecutar la partida daría otro resultado, la repetición dejaría de
 * verificar nada y el marcador pasaría a ser una cifra en la que hay que creer.
 * Además, un temporizador de servidor no sobrevive a un despliegue de Render, y
 * cada despliegue reemplaza la instancia.
 *
 * ═══ POR QUÉ NO PASA POR `jugar()` ═══
 *
 * Porque el tic no lo manda un dispositivo: lo mete quien hospeda la partida. No
 * tiene asiento —viene con `quien: null`— y no trae revisión, porque no está
 * actuando sobre una pantalla que pudiera estar vieja. Hacerlo pasar por la
 * misma puerta obligaría a que `jugar()` admitiera `null` como quién, y eso
 * abriría la llave maestra que la comprobación de asiento acaba de cerrar.
 *
 * El tic se incrementa ANTES de llamar al reductor: el movimiento del tic número
 * uno tiene que verse a sí mismo en el tic uno, no en el cero. Si no, un plazo
 * que vence «dentro de un tic» necesitaría dos.
 */
export function avanzarElReloj(mesa: Mesa): Mesa {
  if (mesa.terminada) {
    throw new MovimientoRechazado('mesa-terminada', 'Esta partida ya ha terminado.');
  }
  const conElRelojAdelantado: Mesa = { ...mesa, tic: mesa.tic + 1 };
  return aplicarMovimiento(conElRelojAdelantado, movimientoDeTic(), null);
}

/**
 * Lo común a los dos caminos: montar el contexto, llamar a las reglas y anotar.
 *
 * El contexto se guarda ENTERO en el diario junto al movimiento. Es lo que
 * permite reejecutar exactamente lo que pasó incluso cuando los asientos
 * cambiaron a mitad de partida — el razonamiento largo está en
 * `MovimientoRegistrado`, en `shared/arcade/motor.ts`.
 */
function aplicarMovimiento(mesa: Mesa, movimiento: Movimiento, quien: AsientoId | null): Mesa {
  const ctx: ContextoMovimiento = {
    quien,
    azar: mesa.semilla,
    tic: mesa.tic,
    asientos: mesa.asientos,
  };

  const estado = avanzar(mesa.arcade, mesa.estado, movimiento, ctx);

  return {
    ...mesa,
    estado,
    rev: mesa.rev + 1,
    diario: [...mesa.diario, { movimiento, ctx }],
  };
}
