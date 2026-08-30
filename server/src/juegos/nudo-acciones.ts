/**
 * Lo que se puede hacer en El Nudo de Valdehierro, y qué pasa cuando se hace.
 *
 * VA EN FICHERO APARTE por la misma razón que los de los otros tres: registrar
 * los reductores dentro de un módulo que importe la sesión cerraría un círculo
 * de importaciones y el módulo se quedaría a medio cargar.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA REGLA QUE SOSTIENE LA NOCHE ENTERA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `cursar-orden` acepta el convoy que el cuadro verdadero pone en la posición
 * `despachados`, y ninguno más. De ahí salen tres propiedades que no son
 * evidentes y que valen todo el juego:
 *
 *   · LA NOCHE SIEMPRE SE PUEDE TERMINAR. Una franja perdida no bloquea nada:
 *     el cuadro se corre entero, como se corre un horario de verdad. No existe
 *     un estado del que no se pueda salir.
 *
 *   · ADIVINAR ES POSIBLE Y CARO. Cinco intentos en el peor caso para el primer
 *     convoy, cuatro para el segundo… quince en total, y siete y medio de
 *     media. Cada uno cuesta dos minutos de retraso y una conformidad, que hay
 *     que haber ganado resolviendo instrumentos. Adivinar la noche entera sale
 *     por encima del tope: la deducción no es obligatoria, es la única forma
 *     barata.
 *
 *   · LO QUE SE APRENDE AL FALLAR ES REAL Y NO REGALA NADA. Un rechazo dice
 *     «ese no» y nada más. Es información honesta que la mesa puede combinar
 *     con las tiras, y es la razón por la que la partida converge en vez de
 *     atascarse.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE DURA UNA FRANJA Y LO QUE DURA LA NOCHE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `EstadoNudo` es el contrato: vive en `shared/` y lo leen los tres paquetes.
 * Los instrumentos planteados y los puestos rendidos son de UNA franja y se
 * tiran al abrir la siguiente; el retraso, el margen y los convoyes salidos
 * duran toda la noche. Las dos cosas viven en el mismo objeto porque la mitad
 * de lo efímero SÍ se le enseña a quien juega —el instrumento que tienes
 * delante— y separarlo obligaría a proyectar dos sitios.
 */
import { AccionInvalida, registrarAcciones } from './motor';
import { registrarInicio } from './inicios';
import { elegirSala, responder as registrarRespuesta } from '../live/sesion';
// Por la puerta principal: es el índice quien registra los manifiestos al
// cargarse, y pedir entidades por el módulo suelto las devuelve vacías.
import { entidadesDe } from '../../../shared/juegos';
import {
  CLAVE_ESTADO,
  ejeDeFranja,
  estadoInicial,
  fichaEnBlanco,
  oficiosAlDia,
  oficiosDePuestoAlDia,
  tramaDe,
} from './nudo-trama';
import { corregirInstrumento, plantearInstrumento } from './nudo-instrumentos';
import {
  cumpleTelegrama,
  cuadrosDe,
  franjasDe,
  horaDeFranja,
  CONFORMIDADES_DE_OFICIO,
  MANA_DE_OFICIO,
  MARGEN_EXTRA_EN_TU_OFICIO,
  MARGEN_POR_CONSULTA,
  MARGEN_POR_INSTRUMENTO,
  MARGEN_POR_RECUPERAR,
  RETRASO_POR_ORDEN_RECHAZADA,
  RETRASO_QUE_RECUPERA,
} from '../../../shared/juegos/nudo-tipos';
import type {
  EstadoDeFerroviario,
  EstadoNudo,
  Instrumento,
  OficioId,
  TramaNudo,
} from '../../../shared/juegos/nudo-tipos';
import type { LiveSession } from '../../../shared/live';
import type { GameSession } from '../../../shared/types';

/**
 * Dónde se guarda lo que solo dura una franja.
 *
 * Segunda clave de `LiveSession.estado`, que es un `Record<string, unknown>`
 * justamente para esto. Aquí solo va lo que NADIE tiene que ver y se tira al
 * abrir la franja siguiente: en qué franja se montaron los instrumentos, para
 * saber si hay que rehacerlos.
 */
const CLAVE_FRANJA = 'nudo-franja';

interface LoDeLaFranja {
  /** La última franja para la que se montaron instrumentos y se dio conformidad. */
  franja: number;
}

// ---------------------------------------------------------------------------
// El estado, siempre al día
// ---------------------------------------------------------------------------

/**
 * El estado de la noche, creándolo si hace falta. IDEMPOTENTE.
 *
 * Se llama desde el alta (`registrarInicio`) y desde cada reductor. Que se
 * pueda llamar dos veces sin efecto es lo que permite que exista el alta: si
 * el estado naciera con la primera acción de alguien, el panel de quien dirige
 * —que solo lee— no encontraría nada que enseñar justo en el momento de abrir
 * la mesa. Eso ya pasó en El Misterio de la Momia y el consejo que pintaba la
 * pantalla era «ciérrala y vuelve a abrirla», que echa a todo el mundo.
 */
export function estadoDe(game: GameSession, sesion: LiveSession): EstadoNudo {
  const trama = tramaObligatoria(game);

  /*
   * LOS OFICIOS SE RESUELVEN ANTES DE SENTAR A NADIE, y con la MISMA rueda que
   * usa la ampliación. Así el oficio que se le enseña a quien se apuntó tarde
   * es exactamente el que su dosier va a decir cuando el Game Master actualice
   * la partida — o el que diría si ya lo hubiera hecho.
   */
  trama.oficioDePersona = oficiosAlDia(trama, entidadesDe(game, 'ferroviarios'));
  trama.oficioDePuesto = oficiosDePuestoAlDia(trama, entidadesDe(game, 'puestos'));

  sesion.estado = sesion.estado ?? {};
  let estado = sesion.estado[CLAVE_ESTADO] as EstadoNudo | undefined;
  if (!estado) {
    estado = estadoInicial(sesion.players.map((p) => p.participanteId));
    sesion.estado[CLAVE_ESTADO] = estado;
  }

  /*
   * Quien empareja el móvil después de la primera acción también tiene que
   * existir. Sin esto se queda sin margen y sin maña, y no hay forma de que
   * juegue: los reductores no le encuentran ficha y lanzan.
   */
  for (const jugador of sesion.players) {
    if (!estado.gente[jugador.participanteId]) {
      estado.gente[jugador.participanteId] = fichaEnBlanco();
    }
  }
  return estado;
}

/** La trama, ya comprobada. Los reductores no pueden trabajar sin ella. */
function tramaObligatoria(game: GameSession): TramaNudo {
  const trama = tramaDe(game.plot);
  if (!trama) throw new AccionInvalida('Esta partida todavía no tiene cuadro de marchas.');
  return trama;
}

/** La ficha de quien actúa. */
function fichaDe(estado: EstadoNudo, participanteId: string): EstadoDeFerroviario {
  const ficha = estado.gente[participanteId];
  if (!ficha) throw new AccionInvalida('No estás de turno esta noche.');
  return ficha;
}

/**
 * El alta: la estación monta su estado al abrir la mesa.
 *
 * Se traga su propio error porque una partida sin trama todavía no puede montar
 * nada, y eso no es motivo para no abrir la mesa: el primer reductor lo
 * intentará otra vez. `iniciarJuego` además ya se los traga por su cuenta.
 */
registrarInicio('nudo', (game, sesion) => {
  if (!tramaDe(game.plot)) return;
  estadoDe(game, sesion);
});

// ---------------------------------------------------------------------------
// Los instrumentos de la franja
// ---------------------------------------------------------------------------

/**
 * Deja montados los instrumentos de la franja en curso, uno por puesto.
 *
 * ═══ SE MONTAN PEREZOSAMENTE Y NO AL ABRIR LA FRANJA ═══
 *
 * La tentación es montarlos en `abrirRonda`, y no se puede: esa función es
 * código de plataforma y recibe la sesión pero NO la partida, así que no tiene
 * de dónde sacar la trama ni los puestos. Es la misma limitación que anotó El
 * Paso de las Sombras.
 *
 * Así que se montan la primera vez que alguien los necesita —al ocupar un
 * puesto, al mirar la pantalla, al proyectar la vista— y se rehacen cuando la
 * franja cambia. Es idempotente y es determinista: el mismo puesto y la misma
 * franja dan el mismo instrumento, así que dos personas en la misma habitación
 * ven exactamente el mismo problema aunque lleguen con un minuto de diferencia.
 */
export function plantearFranja(
  game: GameSession,
  franja: number,
): Record<string, Instrumento> {
  const trama = tramaObligatoria(game);
  const puestos = entidadesDe(game, 'puestos');
  const vocabulario = {
    convoyes: entidadesDe(game, 'convoyes').map((c) => c.name),
    puestos: puestos.map((p) => p.name),
    mercancias: entidadesDe(game, 'mercancias').map((m) => m.name),
  };

  const instrumentos: Record<string, Instrumento> = {};
  for (const puesto of puestos) {
    const cual = trama.oficioDePuesto[puesto.id] ?? 'agujas';
    /*
     * La semilla lleva el id de la partida y el del puesto: así la misma
     * habitación tiene su propia serie de problemas a lo largo de la noche y
     * dos puestos con el mismo oficio no plantean lo mismo, que es lo que
     * pasaría con una semilla por franja a secas.
     */
    const planteado = plantearInstrumento(cual, franja, `${game.id}:${puesto.id}`, vocabulario);
    instrumentos[puesto.id] = {
      puesto: puesto.id,
      franja,
      cual,
      planteamiento: planteado.planteamiento,
      resueltoPor: [],
      /*
       * LA SOLUCIÓN VIAJA DENTRO DEL INSTRUMENTO Y NO SALE DE AQUÍ. Se guarda
       * en un campo que la proyección quita antes de mandar nada — ver
       * `nudo-proyeccion.ts`, que compone el objeto CAMPO A CAMPO justamente
       * para que un campo nuevo no se escape por descuido.
       */
      ...({ solucion: planteado.solucion } as { solucion: unknown }),
    };
  }
  return instrumentos;
}

/**
 * Deja montada la franja en curso: instrumentos nuevos y la conformidad de oficio.
 *
 * ═══ ESTO ESCRIBE, ASÍ QUE SOLO LO LLAMAN LOS REDUCTORES ═══
 *
 * La proyección NO puede llamarlo: corre fuera del candado de `mutar`, así que
 * lo que escribiera no se guardaría —y lo que es peor, podría contarse dos
 * veces—. Para pintar, la proyección usa `plantearFranja`, que es pura y
 * determinista y da exactamente los mismos problemas.
 *
 * LA CONFORMIDAD SE DA POR CADA FRANJA QUE HA PASADO, no por la última. Si una
 * franja entera se cierra sin que nadie toque nada —que puede pasar: la mesa se
 * queda discutiendo— la conformidad de esa franja no se pierde. Se acumulan a
 * propósito: una mesa que trabaja mucho una franja puede gastar de más en la
 * siguiente, y eso premia organizarse.
 */
export function montarFranja(
  game: GameSession,
  sesion: LiveSession,
  estado: EstadoNudo,
): void {
  sesion.estado = sesion.estado ?? {};
  const anterior = sesion.estado[CLAVE_FRANJA] as LoDeLaFranja | undefined;
  const franja = Math.max(1, sesion.round);
  if (anterior?.franja === franja && Object.keys(estado.instrumentos).length > 0) return;

  estado.instrumentos = plantearFranja(game, franja);
  estado.puestosRendidos = [];

  /*
   * La primera vez no se regala nada aquí: el estado ya nace con una
   * conformidad puesta (ver `estadoInicial`), que es la del parte de novedades
   * con el que entra el turno. Regalar otra al montar la franja 1 daría dos.
   */
  const desde = anterior?.franja ?? franja;
  const franjasPasadas = Math.max(0, franja - desde);
  estado.conformidades += franjasPasadas * CONFORMIDADES_DE_OFICIO;

  sesion.estado[CLAVE_FRANJA] = { franja };
}

/** La solución guardada de un instrumento. Solo la mira este fichero. */
function solucionDe(instrumento: Instrumento): unknown {
  return (instrumento as unknown as { solucion?: unknown }).solucion;
}

// ---------------------------------------------------------------------------
// Las acciones
// ---------------------------------------------------------------------------

/**
 * Ocupar un puesto: ir hasta esa habitación y plantarse delante del instrumento.
 *
 * Se apoya en `elegirSala` de la plataforma, y eso no es reutilizar por
 * reutilizar: de ahí cuelgan el recorrido que se pinta en el plano, la
 * ocupación que ven los demás y el registro de por dónde pasó cada cual. Un
 * juego que se lo montara por su cuenta tendría un plano vacío sin que nadie
 * viera un error.
 */
function ocuparPuesto(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
  puestoId: string,
): unknown {
  const estado = estadoDe(game, sesion);
  montarFranja(game, sesion, estado);
  try {
    elegirSala(sesion, participanteId, puestoId);
  } catch (error) {
    /* El mensaje de la plataforma habla de «sala»: aquí son puestos. */
    throw new AccionInvalida(
      error instanceof Error && /cambio/.test(error.message)
        ? 'Ya te has movido dos veces en esta franja. Quédate donde estás.'
        : 'Ahora mismo no se puede cambiar de puesto.',
    );
  }
  const instrumento = estado.instrumentos[puestoId];
  return {
    puesto: puestoId,
    instrumento: instrumento?.cual,
    yaRendido: estado.puestosRendidos.includes(puestoId),
  };
}

/**
 * Entregar la solución del instrumento del puesto en el que estás.
 *
 * ═══ UNA RESPUESTA EQUIVOCADA NO GASTA NADA ═══
 *
 * El motor apunta la acción DESPUÉS de que el reductor devuelva, así que basta
 * con lanzar `AccionInvalida` para que el intento no cuente. Es la misma
 * propiedad que usa El Paso de las Sombras con las contraseñas de las puertas, y
 * aquí importa igual: fallar una maniobra a las dos de la mañana tiene que
 * costar tiempo, no una oportunidad.
 *
 * LA RESPUESTA LLEGA POR `eligeLibre` Y EL MOTOR NO LA MIRA. Ese es el trato
 * explícito de ese campo, y por eso se corrige contra el planteamiento que este
 * servidor guardó: un móvil manipulado puede mandar lo que quiera y lo único
 * que consigue es fallar.
 */
function rendirInstrumento(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
  respuesta: string,
): unknown {
  const estado = estadoDe(game, sesion);
  montarFranja(game, sesion, estado);
  const trama = tramaObligatoria(game);

  const jugador = sesion.players.find((p) => p.participanteId === participanteId);
  const donde = jugador?.elecciones.filter((e) => e.round === sesion.round).slice(-1)[0]?.lugarId;
  if (!donde) {
    throw new AccionInvalida('Primero ve hasta un puesto y ocúpalo. Desde aquí no se toca nada.');
  }
  const instrumento = estado.instrumentos[donde];
  if (!instrumento) throw new AccionInvalida('En ese puesto no hay ningún instrumento montado.');

  const ficha = fichaDe(estado, participanteId);
  if (instrumento.resueltoPor.includes(participanteId)) {
    throw new AccionInvalida('Ya has resuelto este instrumento en esta franja.');
  }

  const veredicto = corregirInstrumento(
    instrumento.cual,
    instrumento.planteamiento,
    solucionDe(instrumento),
    respuesta,
  );
  if (!veredicto.vale) {
    throw new AccionInvalida(veredicto.porque ?? 'Eso no sale. Vuelve a mirarlo.');
  }

  instrumento.resueltoPor.push(participanteId);
  ficha.instrumentosResueltos++;

  /*
   * LA CONFORMIDAD ES DEL PUESTO Y SE DA UNA VEZ POR FRANJA; EL MARGEN ES DE
   * QUIEN RESUELVE Y SE DA SIEMPRE.
   *
   * Es lo que hace que repartirse por la casa sea lo óptimo sin prohibir que
   * dos personas trabajen juntas: la segunda no le quita nada a nadie —se lleva
   * su margen— pero tampoco duplica la conformidad. Un tope de una persona por
   * puesto habría sido más simple y habría dejado a media mesa mirando.
   */
  let conformidadNueva = false;
  if (!estado.puestosRendidos.includes(donde)) {
    estado.puestosRendidos.push(donde);
    estado.conformidades++;
    conformidadNueva = true;
  }

  const oficioPropio = trama.oficioDePersona[participanteId];
  const enSuOficio = oficioPropio === instrumento.cual;
  const margen = MARGEN_POR_INSTRUMENTO + (enSuOficio ? MARGEN_EXTRA_EN_TU_OFICIO : 0);
  ficha.margen += margen;

  return {
    resuelto: true,
    margen,
    enSuOficio,
    conformidadNueva,
    conformidades: estado.conformidades,
  };
}

/**
 * Cursar la orden de salida de un convoy.
 *
 * ═══ EL ENCLAVAMIENTO NO SE EQUIVOCA Y NO REGALA NADA ═══
 *
 * Acepta el convoy que el cuadro verdadero pone en la posición
 * `estado.despachados`, y contesta «ese no» a cualquier otro. No dice cuál era,
 * no dice si estaba cerca y no dice cuántos quedan por probar: eso lo sabe la
 * mesa mirando su cuadrícula.
 */
function cursarOrden(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
  convoyId: string,
): unknown {
  const estado = estadoDe(game, sesion);
  montarFranja(game, sesion, estado);
  const trama = tramaObligatoria(game);
  const ficha = fichaDe(estado, participanteId);

  if (estado.amanecer) throw new AccionInvalida('La noche ya se ha cerrado.');
  if (estado.despachados >= trama.cuadro.length) {
    throw new AccionInvalida('Ya han salido los seis. No queda nada en la vía.');
  }
  if (estado.salidos.includes(convoyId)) {
    throw new AccionInvalida('Ese convoy ya cruzó. Mira el cuadro.');
  }

  /* La llave maestra del factor: cursar sin gastar conformidad. Una por noche. */
  const conLlave = ficha.sinConformidad;
  if (!conLlave) {
    if (estado.conformidades <= 0) {
      throw new AccionInvalida(
        'La estación no tiene ninguna conformidad. Hay que resolver el instrumento de algún puesto ' +
          'antes de poder cursar nada.',
      );
    }
    estado.conformidades--;
  } else {
    ficha.sinConformidad = false;
  }

  const tocaba = trama.cuadro[estado.despachados];
  const aceptada = convoyId === tocaba;

  let retraso = 0;
  if (!aceptada) {
    /* El cambio de aguja del guardagujas: un rechazo sin retraso. Una por noche. */
    if (ficha.indulto) {
      ficha.indulto = false;
    } else {
      retraso = RETRASO_POR_ORDEN_RECHAZADA;
      estado.retraso += retraso;
    }
  } else {
    estado.despachados++;
    estado.salidos.push(convoyId);
  }

  estado.ordenes.push({
    franja: Math.max(1, sesion.round),
    convoy: convoyId,
    quien: participanteId,
    aceptada,
    retraso,
    at: new Date().toISOString(),
  });

  const convoyes = entidadesDe(game, 'convoyes');
  const nombre = convoyes.find((c) => c.id === convoyId)?.name ?? convoyId;
  return {
    aceptada,
    convoy: convoyId,
    /*
     * El anuncio se compone aquí y no en la app porque es lo que se lee en voz
     * alta en la mesa, y tiene que sonar a estación. Lo que NO lleva, ni cuando
     * se rechaza, es una sola pista de cuál era el bueno.
     */
    anuncio: aceptada
      ? `Vía libre. ${nombre} sale de Valdehierro.`
      : `El enclavamiento no da paso a ${nombre}. Ese no es el que toca.`,
    retraso: estado.retraso,
    conformidades: estado.conformidades,
    despachados: estado.despachados,
  };
}

/**
 * Preguntarle al archivo si un convoy cabe en una franja.
 *
 * ═══ QUÉ CONTESTA EXACTAMENTE, Y POR QUÉ ASÍ ═══
 *
 * Contesta si EXISTE ALGÚN CUADRO compatible con todos los telegramas en el que
 * ese convoy salga en esa franja. O sea: es la respuesta que la mesa habría
 * podido deducir con las tiras si las hubiera juntado todas y hubiera tenido
 * paciencia. No es información nueva, es tiempo comprado.
 *
 * Eso hace que sea honesto en las dos direcciones: un «no» es una casilla que
 * se puede tachar con certeza, y un «sí» significa «no lo descartes», no «es
 * este». Como el cuadro es único, la única franja que da «sí» para un convoy es
 * la suya — así que sí, dos consultas bien elegidas valen mucho. Por eso
 * cuestan dos de margen cada una, que es un instrumento entero.
 */
function consultarArchivo(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
  convoyId: string,
  franja: number,
): unknown {
  const estado = estadoDe(game, sesion);
  const trama = tramaObligatoria(game);
  const ficha = fichaDe(estado, participanteId);

  if (franja < 1 || franja > trama.cuadro.length) {
    throw new AccionInvalida(`Esta noche solo tiene ${trama.cuadro.length} franjas.`);
  }

  const gratis = ficha.consultaGratis;
  if (gratis) {
    ficha.consultaGratis = false;
  } else {
    if (ficha.margen < MARGEN_POR_CONSULTA) {
      throw new AccionInvalida(
        `El archivo cobra ${MARGEN_POR_CONSULTA} de margen y tú tienes ${ficha.margen}. ` +
          'Resuelve algún instrumento.',
      );
    }
    ficha.margen -= MARGEN_POR_CONSULTA;
  }
  ficha.consultas++;

  /*
   * SE RESUELVE CONTRA LOS TELEGRAMAS, NO CONTRA EL CUADRO GUARDADO. Comparar
   * con `trama.cuadro[franja-1] === convoyId` daría la misma respuesta —el
   * cuadro es único— y sería una respuesta que no se puede justificar: si algún
   * día el rompecabezas admitiera dos cuadros, esto mentiría con aplomo. Así
   * responde lo que las tiras permiten afirmar, que es lo que dice ser.
   */
  const convoyes = entidadesDe(game, 'convoyes').map((c) => c.id);
  const telegramas = trama.telegramas.map((t) => t.telegrama);
  const posible = cuadrosDe(convoyes, telegramas).some(
    (cuadro) => cuadro[franja - 1] === convoyId,
  );

  const nombre = entidadesDe(game, 'convoyes').find((c) => c.id === convoyId)?.name ?? convoyId;
  return {
    convoy: convoyId,
    franja,
    posible,
    gratis,
    margen: ficha.margen,
    respuesta: posible
      ? `El archivo no encuentra nada que impida a ${nombre} salir a las ${horaDeFranja(franja)}.`
      : `El archivo lo descarta: ${nombre} no puede salir a las ${horaDeFranja(franja)}.`,
  };
}

/** Cambiar margen por tiempo. Es la otra cosa que se puede comprar. */
function recuperarTiempo(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
): unknown {
  const estado = estadoDe(game, sesion);
  const ficha = fichaDe(estado, participanteId);
  if (estado.retraso <= 0) throw new AccionInvalida('La estación no lleva retraso que recuperar.');
  if (ficha.margen < MARGEN_POR_RECUPERAR) {
    throw new AccionInvalida(
      `Recuperar un minuto cuesta ${MARGEN_POR_RECUPERAR} de margen y tú tienes ${ficha.margen}.`,
    );
  }
  ficha.margen -= MARGEN_POR_RECUPERAR;
  estado.retraso = Math.max(0, estado.retraso - RETRASO_QUE_RECUPERA);
  return { retraso: estado.retraso, margen: ficha.margen };
}

/**
 * Usar tu maña. UNA VEZ EN TODA LA NOCHE.
 *
 * `vecesPorTurno` no sirve para esto: el motor cuenta por ronda, y esto es por
 * partida. Lo lleva `manaUsada` en el estado, que es donde tiene que estar.
 *
 * Tres de las cuatro dejan un efecto ARMADO que se gasta en la acción
 * siguiente, y eso es a propósito: obliga a decirlo en voz alta antes de hacer
 * la jugada, que es lo que convierte una maña en un momento de mesa en vez de
 * en un botón.
 */
function usarMana(game: GameSession, sesion: LiveSession, participanteId: string): unknown {
  const estado = estadoDe(game, sesion);
  const trama = tramaObligatoria(game);
  const ficha = fichaDe(estado, participanteId);
  if (ficha.manaUsada) throw new AccionInvalida('Tu maña se usa una vez en toda la noche, y ya está gastada.');

  const oficio: OficioId = trama.oficioDePersona[participanteId] ?? 'agujas';
  ficha.manaUsada = true;
  switch (oficio) {
    case 'agujas':
      ficha.indulto = true;
      break;
    case 'telegrafo':
      ficha.consultaGratis = true;
      break;
    case 'enclavamiento':
      ficha.sinConformidad = true;
      break;
    case 'muelle':
      ficha.margen += 3;
      break;
  }
  return {
    oficio,
    mana: MANA_DE_OFICIO[oficio].nombre,
    anuncio: `${MANA_DE_OFICIO[oficio].nombre}. ${MANA_DE_OFICIO[oficio].texto}`,
    margen: ficha.margen,
  };
}

/**
 * Entregar tu cuadro de marchas. Es la acusación de este juego.
 *
 * Se apoya entera en la maquinaria de respuestas que ya existe, y de ahí hereda
 * gratis lo que hace falta: una por persona y para toda la partida, no se puede
 * cambiar, y no se dice si has acertado hasta el amanecer.
 *
 * LO QUE ESTE JUEGO AÑADE ES QUE SEA UNA PERMUTACIÓN. El motor comprueba que
 * cada campo sea un convoy de verdad y no que no se repitan: un cuadro con el
 * mismo convoy en dos franjas es imposible por definición, y dejarlo pasar
 * sería aceptar una respuesta que no es un cuadro.
 *
 * OJO CON LO QUE SIGNIFICA `primeroEnAcertar` AQUÍ. La plataforma lo pone a
 * quien acierta antes porque en CLUEDO eso es ganar. En esta noche se gana o se
 * pierde en grupo y lo decide el veredicto: `primeroEnAcertar` quiere decir
 * «quien primero tuvo el cuadro entero en la cabeza», que es lo que premia el
 * trofeo «El cuadro de memoria».
 */
function entregarCuadro(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
  datos: Record<string, string>,
): unknown {
  const trama = tramaObligatoria(game);
  const solucion = game.plot?.solution.respuestas;
  if (!solucion) throw new AccionInvalida('Esta partida todavía no tiene cuadro de marchas.');

  const eleccion: Record<string, string> = {};
  for (let f = 1; f <= trama.cuadro.length; f++) {
    const valor = datos[ejeDeFranja(f)];
    if (!valor) throw new AccionInvalida(`Te falta la franja de las ${horaDeFranja(f)}.`);
    eleccion[ejeDeFranja(f)] = valor;
  }
  const distintos = new Set(Object.values(eleccion));
  if (distintos.size !== Object.keys(eleccion).length) {
    throw new AccionInvalida(
      'Un cuadro de marchas no repite convoy: cada uno sale en una franja y solo en una.',
    );
  }

  const { respuesta } = registrarRespuesta(sesion, participanteId, eleccion, solucion);
  /* Deliberadamente no se devuelve si ha acertado: se sabrá al amanecer. */
  return { entregado: true, at: respuesta.at };
}

// ---------------------------------------------------------------------------
// El alta
// ---------------------------------------------------------------------------

registrarAcciones('nudo', {
  'ocupar-puesto': ({ game, sesion, participanteId, datos }) =>
    ocuparPuesto(game, sesion, participanteId, datos.puesto!),

  /*
   * `respuesta` llega por `eligeLibre`, así que puede no venir: el motor solo
   * copia los campos declarados que traigan valor. Una entrega vacía es un
   * fallo del instrumento, no una excepción.
   */
  'rendir-instrumento': ({ game, sesion, participanteId, datos }) =>
    rendirInstrumento(game, sesion, participanteId, datos.respuesta ?? ''),

  'cursar-orden': ({ game, sesion, participanteId, datos }) =>
    cursarOrden(game, sesion, participanteId, datos.convoy!),

  /*
   * La franja llega en `numeros` y NO en `datos`: el motor las separa para que
   * los reductores que ya existen no tengan que mirar de qué tipo es cada
   * campo. Ya viene comprobada —número de verdad, entera y entre 1 y 6— porque
   * eso es aritmética y no depende de ningún estado secreto.
   */
  'consultar-archivo': ({ game, sesion, participanteId, datos, numeros }) =>
    consultarArchivo(game, sesion, participanteId, datos.convoy!, numeros.franja ?? 1),

  'recuperar-tiempo': ({ game, sesion, participanteId }) =>
    recuperarTiempo(game, sesion, participanteId),

  'usar-mana': ({ game, sesion, participanteId }) => usarMana(game, sesion, participanteId),

  'entregar-cuadro': ({ game, sesion, participanteId, datos }) =>
    entregarCuadro(game, sesion, participanteId, datos),
});

// ---------------------------------------------------------------------------
// Utilidades que necesitan el cierre y la proyección
// ---------------------------------------------------------------------------

/**
 * ¿Qué franjas se cerraron sin que saliera nadie?
 *
 * Se calcula desde las órdenes en vez de apuntarse al cerrar la franja, y hay
 * una razón: cerrar la franja es código de plataforma —`cerrarRonda`— que
 * recibe la sesión y no la partida, igual que `abrirRonda`. Deducirlo es
 * equivalente y no obliga a que la plataforma sepa nada de este juego.
 */
export function franjasSinDespacho(estado: EstadoNudo, hastaFranja: number): number[] {
  const conSalida = new Set(estado.ordenes.filter((o) => o.aceptada).map((o) => o.franja));
  const perdidas: number[] = [];
  for (let f = 1; f <= hastaFranja; f++) if (!conSalida.has(f)) perdidas.push(f);
  return perdidas;
}

/**
 * ¿Cumple este cuadro propuesto todos los telegramas?
 *
 * Lo usa el panel de quien dirige a ciegas para poder decirle a la mesa «eso no
 * puede ser» sin conocer la solución. Está aquí y no en la proyección porque es
 * una pregunta sobre las reglas del juego, no sobre lo que se enseña.
 */
export function cuadroCompatible(trama: TramaNudo, cuadro: string[]): boolean {
  const donde = franjasDe(cuadro);
  return trama.telegramas.every((t) => cumpleTelegrama(donde, t.telegrama));
}

