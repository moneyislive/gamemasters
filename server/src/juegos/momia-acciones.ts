/**
 * Lo que se puede hacer en El Misterio de la Momia, y qué pasa cuando se hace.
 *
 * VA EN FICHERO APARTE por la misma razón que el de CLUEDO: registrar los
 * reductores dentro de un módulo que importe la sesión cerraría un círculo de
 * importaciones y el módulo se quedaría a medio cargar.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CÓMO LLEGAN AQUÍ LOS DATOS, QUE TIENE HISTORIA
 * ────────────────────────────────────────────────────────────────────────────
 *
 * El motor solo le pasa al reductor los campos que la acción declara, y hace
 * bien: es lo que impide que un móvil manipulado cuele el id de una sala donde
 * va un sospechoso. El problema era que solo sabía declarar «una entidad de esta
 * categoría», y dos acciones de este juego no caben ahí: `proponer-orden`
 * necesita una LISTA ORDENADA de cinco y `invocar` necesita un objetivo que
 * depende del don, que es secreto hasta que se usa (§8.5 del diseño).
 *
 * Durante unas horas eso dejó las dos acciones sin datos, y este fichero tenía
 * escrito el apaño. Ya no: el motor admite `eligeVarias` —que valida cada
 * elemento igual, exige el número exacto y rechaza repetidos— y `eligeOpcional`
 * —un campo que unas veces hace falta y otras no—. Las listas llegan en
 * `ctx.listas` y no en `ctx.datos`, separadas a propósito para que un juego que
 * no use listas no tenga que comprobar el tipo de cada campo.
 *
 * LO QUE SIGUE SIN CABER, y está en el informe: elegir CUÁL de sus dos dones usa
 * el saqueador. Un don no es una entidad de ninguna categoría, así que no hay
 * forma de declararlo. Mientras tanto se lee de `datos.don` —por si algún día
 * llega— y sin él se usa el don aparente, que es el que tiene en el dosier.
 *  * El cambio que falta está anotado en el informe: una línea en `motor.ts`.
 */
import { acusar as registrarSenalamiento, elegirSala } from '../live/sesion';
import { AccionInvalida, registrarAcciones } from './motor';
import { registrarInicio } from './inicios';
// Por la puerta principal: es el índice quien declara dónde vive cada
// categoría. Ver el comentario largo en `momia-trama.ts`.
import { entidadesDe } from '../../../shared/juegos';
import { camaraProfanada, donesAlDia, estadoInicial, tramaDe, EJE_SAQUEADOR } from './momia-trama';
import { MARCAS_PARA_TOCADO } from '../../../shared/juegos/momia-tipos';
import type { DonId, EstadoMomia, TramaMomia } from '../../../shared/juegos/momia-tipos';
import type { GameSession } from '../../../shared/types';
import type { LiveSession } from '../../../shared/live';

/** Bajo qué clave de `LiveSession.estado` vive lo de este juego. */
export const CLAVE_ESTADO = 'momia';

/**
 * Y bajo cuál lo que dura solo una vigilia.
 *
 * POR QUÉ HAY UNA SEGUNDA CLAVE. `EstadoMomia` es el contrato: vive en
 * `shared/` y lo leen los tres paquetes. Hay cosas que solo importan durante una
 * vigilia y que ninguna pantalla necesita —a quién protegió el Guardián, qué le
 * sopló el soborno al Mecenas— y meterlas en el contrato lo habría ensuchado
 * para siempre por algo que se tira al abrir la vigilia siguiente.
 *
 * `LiveSession.estado` es un `Record<string, unknown>` justamente para esto: el
 * motor lo transporta sin mirar dentro. Que quepan dos claves no es una grieta,
 * es la forma que tiene.
 */
export const CLAVE_VIGILIA = 'momia-vigilia';

/** Lo que dura una sola vigilia y se tira al abrir la siguiente. */
interface VigiliaMomia {
  ronda: number;
  /** A estas personas no las alcanza la maldición en lo que queda de vigilia. */
  protegidos: string[];
  /** Lo que el soborno le sopló a cada cual: la cámara de la vigilia siguiente. */
  sobornos: Record<string, string>;
}

// ---------------------------------------------------------------------------
// El estado
// ---------------------------------------------------------------------------

/**
 * El estado de la Momia de esta sesión, creándolo si es la primera vez.
 *
 * Se crea PEREZOSAMENTE y no al abrir la sala de espera, y no es por comodidad:
 * `abrirSesion` es código de la plataforma y no puede saber que este juego tiene
 * algo que inicializar. Que el estado nazca en la primera acción mantiene el
 * arranque de una partida idéntico para todos los juegos.
 */
export function estadoDe(game: GameSession, sesion: LiveSession): EstadoMomia {
  const trama = tramaDe(game.plot);
  if (!trama) throw new AccionInvalida('Esta partida todavía no tiene tumba que sellar.');

  /*
   * EL REPARTO SE RESUELVE ANTES DE SENTAR A NADIE.
   *
   * Es la misma rueda que usa `ampliarExpedicion` al actualizar la partida, así
   * que el don que se le enseña a alguien que se apuntó tarde es EXACTAMENTE el
   * que su dosier va a decir cuando el Game Master actualice — o el que diría si
   * lo hubiera hecho ya. Antes no: sentarle el móvil antes de actualizar le
   * escribía un `descifrar` de respaldo, y el papel impreso decía otra cosa.
   */
  const dones = donesAlDia(trama, entidadesDe(game, 'expedicionarios'));

  sesion.estado = sesion.estado ?? {};
  let estado = sesion.estado[CLAVE_ESTADO] as EstadoMomia | undefined;
  if (!estado) {
    estado = estadoInicial(trama, sesion.players.map((p) => p.participanteId), dones);
    sesion.estado[CLAVE_ESTADO] = estado;
  }

  // Quien se incorpore después de la primera acción también tiene que existir.
  // Sin esto, alguien que empareja tarde el móvil se queda sin marcas, sin
  // amuletos y sin don, y no hay forma de que juegue.
  for (const jugador of sesion.players) {
    if (estado.gente[jugador.participanteId]) continue;
    const recien = estadoInicial(trama, [jugador.participanteId], dones);
    estado.gente[jugador.participanteId] = recien.gente[jugador.participanteId]!;
  }
  return estado;
}

/**
 * El alta: la Momia monta su estado al abrir la mesa.
 *
 * Es la misma `estadoDe` de arriba, que ya sabe crearlo y es idempotente. Lo
 * que cambia es CUÁNDO: antes nacía con la primera acción de alguien, y hasta
 * entonces el panel de quien dirige no encontraba nada que leer —ni cámara
 * profanada, ni marcas— justo en el momento en que hay que anunciarla en voz
 * alta. Se traga su propio error porque una partida sin trama todavía no puede
 * montar nada, y eso no es motivo para no abrir la mesa: el primer reductor lo
 * intentará otra vez.
 */
registrarInicio('momia', (game, sesion) => {
  if (!tramaDe(game.plot)) return;
  estadoDe(game, sesion);
});

/** La trama, ya comprobada. Los reductores no pueden trabajar sin ella. */
function tramaObligatoria(game: GameSession): TramaMomia {
  const trama = tramaDe(game.plot);
  if (!trama) throw new AccionInvalida('Esta partida todavía no tiene tumba que sellar.');
  return trama;
}

/** Lo de esta vigilia, reiniciado si la vigilia ha cambiado. */
function vigiliaDe(sesion: LiveSession): VigiliaMomia {
  sesion.estado = sesion.estado ?? {};
  const guardada = sesion.estado[CLAVE_VIGILIA] as VigiliaMomia | undefined;
  if (guardada && guardada.ronda === sesion.round) return guardada;
  const nueva: VigiliaMomia = { ronda: sesion.round, protegidos: [], sobornos: {} };
  sesion.estado[CLAVE_VIGILIA] = nueva;
  return nueva;
}

/** ¿Es esta persona quien rompió el sello? Nunca se le pregunta al estado. */
export function esElSaqueador(game: GameSession, participanteId: string): boolean {
  return game.plot?.solution.respuestas[EJE_SAQUEADOR] === participanteId;
}

/**
 * Qué puede invocar esta persona.
 *
 * El saqueador tiene DOS: el que le tocó, que es el que sale en su dosier, y
 * `falsificar`, que no está escrito en ninguna parte porque se deduce de ser la
 * respuesta del eje. Un dato que no se guarda no se puede filtrar por descuido.
 */
export function donesDe(game: GameSession, estado: EstadoMomia, participanteId: string): DonId[] {
  const propio = estado.gente[participanteId]?.don;
  const dones: DonId[] = propio ? [propio] : [];
  if (esElSaqueador(game, participanteId)) dones.push('falsificar');
  return dones;
}

/** Recalcula el estado de tocado tras cambiar las marcas de alguien. */
function ajustarTocado(estado: EstadoMomia, participanteId: string): void {
  const persona = estado.gente[participanteId];
  if (!persona) return;
  persona.marcas = Math.max(0, persona.marcas);
  persona.tocado = persona.marcas >= MARCAS_PARA_TOCADO;
}

// ---------------------------------------------------------------------------
// Entrar en una cámara
// ---------------------------------------------------------------------------

export interface ResultadoExploracion {
  camara: string;
  /** Los fragmentos que había ahí esta vigilia y ahora están en tu mano. */
  fragmentos: string[];
  profanada: boolean;
  marcas: number;
  tocado: boolean;
  /** Se te ahorró la marca porque alguien te estaba protegiendo. */
  protegido: boolean;
}

/**
 * Entra en una cámara: sale con papiro y, si estaba profanada, con marca.
 *
 * Es la única puerta por la que se coge un fragmento explorando, y la usan dos
 * caminos: la acción `explorar` y el don `excavar`, que es lo mismo pagando una
 * marca de más. Escribirlo dos veces habría dejado dos sitios donde olvidarse
 * de comprobar la protección.
 */
export function entrarEnCamara(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
  camaraId: string,
  opciones: { marcaExtra?: boolean } = {},
): ResultadoExploracion {
  const trama = tramaObligatoria(game);
  const estado = estadoDe(game, sesion);
  const persona = estado.gente[participanteId];
  if (!persona) throw new AccionInvalida('No participas en esta expedición.');

  const jugador = sesion.players.find((p) => p.participanteId === participanteId);
  const yaEstuve = (jugador?.elecciones ?? []).some(
    (e) => e.round === sesion.round && e.lugarId === camaraId,
  );
  if (yaEstuve) throw new AccionInvalida('Ya has estado en esa cámara esta vigilia.');

  /*
   * Se apunta también como elección de sala. No es duplicar el estado: es lo que
   * hace que el plano de la tumba, el recuento de quién hay en cada cámara y el
   * panel de quien dirige funcionen sin que la plataforma sepa nada de la Momia.
   */
  elegirSala(sesion, participanteId, camaraId);

  // Los fragmentos que la casa colocó aquí esta vigilia.
  const encontrados = trama.hallazgos
    .filter((h) => h.camaraId === camaraId && h.ronda === sesion.round)
    .map((h) => h.fragmentoId)
    .filter((id) => estado.fragmentos[id] && !persona.fragmentos.includes(id));
  persona.fragmentos.push(...encontrados);

  const profanada = camaraProfanada(estado.profanadas, sesion.round) === camaraId;
  const vigilia = vigiliaDe(sesion);
  const protegido = vigilia.protegidos.includes(participanteId);

  let marcas = 0;
  if (profanada && !protegido) marcas += 1;
  // La marca del capataz se paga aunque la cámara estuviera limpia: es el precio
  // de excavar, no un efecto de la maldición. Pero la protección la cubre igual.
  if (opciones.marcaExtra && !protegido) marcas += 1;
  persona.marcas += marcas;
  ajustarTocado(estado, participanteId);

  return {
    camara: camaraId,
    fragmentos: encontrados,
    profanada,
    marcas: persona.marcas,
    tocado: persona.tocado,
    protegido: protegido && (profanada || Boolean(opciones.marcaExtra)),
  };
}

// ---------------------------------------------------------------------------
// Ofrendar
// ---------------------------------------------------------------------------

/**
 * Da un amuleto a otra persona y le quita una marca.
 *
 * NUNCA A UNO MISMO, y es la regla de la que vive la mesa. Si pudieras curarte
 * solo, la maldición sería un contador privado y no habría que hablar con nadie;
 * como no puedes, quien va por dos marcas tiene que pedirlo en voz alta, y pedir
 * en voz alta es exponerse. Ahí es donde el juego pasa de ser un puzle a ser una
 * conversación.
 */
export function ofrendarAmuleto(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
  aQuien: string,
): { amuletos: number; marcasDe: number } {
  const estado = estadoDe(game, sesion);
  if (aQuien === participanteId) {
    throw new AccionInvalida('Un amuleto no se puede gastar en uno mismo.');
  }
  const mio = estado.gente[participanteId];
  const suyo = estado.gente[aQuien];
  if (!mio) throw new AccionInvalida('No participas en esta expedición.');
  if (!suyo) throw new AccionInvalida('Esa persona no está en la expedición.');
  if (mio.amuletos <= 0) throw new AccionInvalida('No te quedan amuletos.');
  if (suyo.marcas <= 0) {
    // Se rechaza en vez de gastarlo en balde: es un recurso de dos usos en toda
    // la noche y tirarlo por un toque de más sería un castigo desproporcionado.
    throw new AccionInvalida('No tiene ninguna marca que quitarle.');
  }

  mio.amuletos -= 1;
  suyo.marcas -= 1;
  ajustarTocado(estado, aQuien);
  return { amuletos: mio.amuletos, marcasDe: suyo.marcas };
}

// ---------------------------------------------------------------------------
// Invocar el don
// ---------------------------------------------------------------------------

export interface ResultadoInvocacion {
  don: DonId;
  /** Lo que ha pasado, en una frase para quien lo invocó. */
  efecto: string;
  /** A quién ha afectado, si a alguien. */
  objetivo?: string;
  /** Lo que solo ve quien invoca: un fragmento nuevo, la cámara de mañana. */
  revelado?: string;
}

/** El fragmento que le falta a alguien para tenerlos TODOS, si le falta uno solo. */
function leFaltaSoloUno(estado: EstadoMomia, participanteId: string): boolean {
  const persona = estado.gente[participanteId];
  if (!persona) return false;
  const ciertos = Object.values(estado.fragmentos).filter((f) => !f.falso);
  return ciertos.filter((f) => !persona.fragmentos.includes(f.id)).length <= 1;
}

/**
 * Usa el don. Una vez por vigilia.
 *
 * LOS DESTINOS VAN EN CAMPOS DISTINTOS SEGÚN LO QUE SEAN, y no en un `objetivo`
 * para todo. La razón es del motor: valida cada campo contra la categoría que la
 * acción declara, así que una persona y una cámara no pueden compartir campo. Y
 * lo que no es una entidad —un fragmento, una mentira— no puede declararse
 * siquiera, así que esos dos solo llegan cuando se llama a esta función
 * directamente y por el cable se usa el valor por defecto.
 *
 * Los valores por defecto son DETERMINISTAS, nunca al azar: una partida tiene
 * que poder repetirse con la misma semilla.
 */
export function invocarDon(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
  opciones: { don?: string; persona?: string; camara?: string; fragmento?: string } = {},
): ResultadoInvocacion {
  const trama = tramaObligatoria(game);
  const estado = estadoDe(game, sesion);
  const persona = estado.gente[participanteId];
  if (!persona) throw new AccionInvalida('No participas en esta expedición.');

  const disponibles = donesDe(game, estado, participanteId);
  const don = (opciones.don as DonId | undefined) ?? disponibles[0];
  if (!don || !disponibles.includes(don)) {
    throw new AccionInvalida('Ese don no es tuyo.');
  }
  if (persona.donUsadoEnRonda === sesion.round) {
    throw new AccionInvalida('Tu don ya se ha usado esta vigilia.');
  }

  const otros = Object.keys(estado.gente).filter((id) => id !== participanteId);
  /*
   * A falta de elección, la persona más tocada; a igualdad, la primera por id.
   * DETERMINISTA Y NO AL AZAR: una partida tiene que poder repetirse con la
   * misma semilla, y un valor por defecto aleatorio lo impediría.
   */
  const masTocado = [...otros].sort((a, b) => {
    const d = (estado.gente[b]?.marcas ?? 0) - (estado.gente[a]?.marcas ?? 0);
    return d !== 0 ? d : a.localeCompare(b);
  })[0];

  const vigilia = vigiliaDe(sesion);
  let resultado: ResultadoInvocacion;

  switch (don) {
    case 'descifrar': {
      /*
       * NUNCA ENTREGA EL ÚLTIMO QUE FALTA. Con cuatro vigilias, un epigrafista
       * podría juntar el papiro entero entre lo que explora y lo que descifra, y
       * entonces la garantía de que nadie lo resuelve en solitario —que es la
       * razón de ser del juego— se cae por la puerta de atrás. Que el papiro se
       * resista es mejor regla que un tope contado.
       */
      if (leFaltaSoloUno(estado, participanteId)) {
        throw new AccionInvalida('El papiro se resiste: ningún ojo puede leerlo entero.');
      }
      const candidato = Object.values(estado.fragmentos)
        .filter((f) => !f.falso && !persona.fragmentos.includes(f.id))
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      if (!candidato) throw new AccionInvalida('No queda papiro que descifrar.');
      persona.fragmentos.push(candidato.id);
      resultado = {
        don,
        efecto: 'Has descifrado un fragmento más. Solo tú lo has visto.',
        revelado: candidato.texto,
      };
      break;
    }

    case 'sanar': {
      const aQuien = opciones.persona ?? masTocado;
      if (!aQuien || aQuien === participanteId) {
        throw new AccionInvalida('Sanar es para otra persona, no para ti.');
      }
      const suyo = estado.gente[aQuien];
      if (!suyo) throw new AccionInvalida('Esa persona no está en la expedición.');
      if (suyo.marcas <= 0) throw new AccionInvalida('No tiene ninguna marca que quitarle.');
      suyo.marcas -= 1;
      ajustarTocado(estado, aQuien);
      resultado = { don, efecto: 'Le has quitado una marca sin gastar amuleto.', objetivo: aQuien };
      break;
    }

    case 'proteger': {
      // Aquí sí se admite protegerse a uno mismo: el guardián carga la lámpara y
      // decide a quién alumbra. Es lo contrario del amuleto, y a propósito: uno
      // obliga a hablar, el otro es la decisión privada de quien vigila.
      const aQuien = opciones.persona ?? masTocado ?? participanteId;
      if (!estado.gente[aQuien]) throw new AccionInvalida('Esa persona no está en la expedición.');
      if (!vigilia.protegidos.includes(aQuien)) vigilia.protegidos.push(aQuien);
      resultado = { don, efecto: 'La maldición no le alcanzará esta vigilia.', objetivo: aQuien };
      break;
    }

    case 'sobornar': {
      const manana = camaraProfanada(estado.profanadas, sesion.round + 1);
      if (!manana) throw new AccionInvalida('No hay otra vigilia después de esta.');
      vigilia.sobornos[participanteId] = manana;
      resultado = {
        don,
        efecto: 'Sabes qué cámara se profanará mañana. Decide qué haces con eso.',
        revelado: manana,
      };
      break;
    }

    case 'documentar': {
      const cual =
        opciones.fragmento ??
        persona.fragmentos.find((id) => estado.fragmentos[id] && !estado.fragmentos[id]!.publico);
      const fragmento = cual ? estado.fragmentos[cual] : undefined;
      if (!fragmento) throw new AccionInvalida('No tienes ningún fragmento sin publicar.');
      if (!persona.fragmentos.includes(fragmento.id)) {
        throw new AccionInvalida('Solo puedes fotografiar lo que tienes en la mano.');
      }
      fragmento.publico = true;
      fragmento.publicadoPor = participanteId;
      resultado = { don, efecto: 'El fragmento queda sobre la mesa, a la vista de todos.', objetivo: fragmento.id };
      break;
    }

    case 'excavar': {
      const camaras = entidadesDe(game, 'camaras');
      const jugador = sesion.players.find((p) => p.participanteId === participanteId);
      const yaVisitadas = (jugador?.elecciones ?? [])
        .filter((e) => e.round === sesion.round)
        .map((e) => e.lugarId);
      const aDonde =
        opciones.camara ?? camaras.find((c) => !yaVisitadas.includes(c.id))?.id;
      if (!aDonde) throw new AccionInvalida('No queda cámara nueva en la que entrar.');
      const exploracion = entrarEnCamara(game, sesion, participanteId, aDonde, { marcaExtra: true });
      resultado = {
        don,
        efecto: `Has entrado en una segunda cámara. Te ha costado una marca de más.`,
        objetivo: aDonde,
        revelado: exploracion.fragmentos.map((id) => estado.fragmentos[id]?.texto ?? '').join(' · '),
      };
      break;
    }

    case 'falsificar': {
      /*
       * EL DON QUE ROMPE EL SUPUESTO DEL QUE VIVE CLUEDO: aquí no toda pista es
       * verdad. La mentira se fabricó al generar la partida y no en caliente, y
       * eso importa: una frase escrita ahora tendría otro tono que las demás, y
       * una pista que suena distinta se delata sola.
       */
      const yaPublicadas = new Set(
        Object.values(estado.fragmentos).filter((f) => f.falso).map((f) => f.id),
      );
      const candidata =
        trama.falsasCandidatas.find((f) => f.id === opciones.fragmento) ??
        trama.falsasCandidatas.find((f) => !yaPublicadas.has(f.id));
      if (!candidata) throw new AccionInvalida('Ya has gastado todas tus mentiras.');
      if (yaPublicadas.has(candidata.id)) throw new AccionInvalida('Esa ya está sobre la mesa.');

      estado.fragmentos[candidata.id] = {
        id: candidata.id,
        restriccion: candidata.restriccion,
        texto: candidata.texto,
        falso: true,
        // Nace pública: fabricar un fragmento y guardárselo no serviría de nada.
        publico: true,
        publicadoPor: participanteId,
      };
      // Y va a su mano, para que en la mesa parezca un hallazgo suyo como
      // cualquier otro. Si no, el papiro delataría que salió de la nada.
      persona.fragmentos.push(candidata.id);
      resultado = {
        don,
        efecto: 'El fragmento está sobre la mesa. Nadie tiene por qué dudar de él.',
        objetivo: candidata.id,
        revelado: candidata.texto,
      };
      break;
    }

    default:
      throw new AccionInvalida('Ese don no existe.');
  }

  persona.donUsadoEnRonda = sesion.round;
  return resultado;
}

// ---------------------------------------------------------------------------
// Proponer el orden
// ---------------------------------------------------------------------------

/**
 * Entrega tu propuesta de sellado: los cinco ritos, en orden.
 *
 * SE PUEDE CAMBIAR EN VIGILIAS POSTERIORES, y a propósito: la propuesta va
 * madurando conforme salen fragmentos, y obligar a casarse con la primera
 * castigaría a quien se moja pronto. Lo que no se puede es entregar dos en la
 * misma vigilia, que es lo que comprueba el motor con `vecesPorTurno: 1`.
 *
 * La hora la pone el SERVIDOR porque desempata el sellado: si viniera del móvil,
 * bastaría con atrasar el reloj del teléfono para ganar todos los empates.
 */
export function proponerOrden(
  game: GameSession,
  sesion: LiveSession,
  participanteId: string,
  orden: string[],
): { orden: string[]; at: string } {
  const estado = estadoDe(game, sesion);
  const ritos = entidadesDe(game, 'ritos').map((r) => r.id);

  if (!Array.isArray(orden) || orden.length !== ritos.length) {
    throw new AccionInvalida(`El sellado son ${ritos.length} ritos, ni uno más ni uno menos.`);
  }
  if (new Set(orden).size !== orden.length) {
    throw new AccionInvalida('Hay un rito repetido en tu propuesta.');
  }
  if (!orden.every((id) => ritos.includes(id))) {
    throw new AccionInvalida('Alguno de esos ritos no es de este sellado.');
  }

  const propuesta = { orden: [...orden], at: new Date().toISOString() };
  estado.propuestas[participanteId] = propuesta;
  return propuesta;
}

// ---------------------------------------------------------------------------
// Los reductores
// ---------------------------------------------------------------------------

registrarAcciones('momia', {
  /**
   * Entrar en una cámara.
   *
   * UNA POR VIGILIA, y quien quiera dos que sea capataz y pague la marca. El
   * manifiesto declara `cambiosPermitidos: 0` para decirlo, pero ese campo hoy no
   * lo lee nadie: lo que de verdad lo impide es `vecesPorTurno: 1`, que el motor
   * sí comprueba. Está anotado en el informe, porque una regla que se cree
   * escrita en dos sitios y solo está en uno es de las que se rompen al mover
   * cualquier otra cosa.
   */
  explorar: ({ game, sesion, participanteId, datos }) =>
    entrarEnCamara(game, sesion, participanteId, datos.camara!),

  ofrendar: ({ game, sesion, participanteId, datos }) =>
    ofrendarAmuleto(game, sesion, participanteId, datos.aQuien!),

  /*
   * Los campos llegan por `eligeOpcional`, que es lo que permite que una misma
   * acción pida una persona, una cámara o nada según el don. Cuál mirar lo
   * decide el reductor, porque el motor no puede: el don es secreto.
   */
  invocar: ({ game, sesion, participanteId, datos }) =>
    invocarDon(game, sesion, participanteId, {
      don: datos.don,
      persona: datos.objetivo,
      camara: datos.camara,
    }),

  /*
   * La lista llega en `listas`, ya validada por el motor: cinco ritos, todos
   * reales, sin repetidos y en el orden en que se mandaron. Las comprobaciones
   * de `proponerOrden` siguen ahí de todos modos, porque esa función también se
   * llama desde una pantalla propia y desde las pruebas, y una regla que solo se
   * cumple cuando se entra por una puerta no es una regla.
   */
  'proponer-orden': ({ game, sesion, participanteId, listas }) => {
    const orden = listas.orden ?? [];
    if (orden.length === 0) {
      throw new AccionInvalida(
        'Tu propuesta no ha llegado. El sellado se entrega desde la pantalla del sellado.',
      );
    }
    return proponerOrden(game, sesion, participanteId, orden);
  },

  /**
   * Señalar a quien rompió el sello.
   *
   * Se apoya entera en la maquinaria de acusación que ya existe, y de ahí hereda
   * gratis las cuatro reglas que hacen falta: una por persona y para toda la
   * partida, no se puede cambiar, no se dice si has acertado, y quien rompió el
   * sello no gana señalándose a sí mismo.
   *
   * OJO CON LO QUE SIGNIFICA `winnerId` EN ESTE JUEGO. La plataforma lo pone al
   * primero que acierta, porque en CLUEDO eso es ganar. Aquí no: aquí gana un
   * BANDO, y eso se decide en el sellado. Así que `winnerId` en la Momia quiere
   * decir «quien primero desenmascaró al saqueador» —que es lo que premia el
   * trofeo Ojo de Horus— y la victoria de verdad viaja aparte. El campo para
   * decirlo bien es el que pide §8.3 del diseño, y todavía no existe.
   */
  senalar: ({ game, sesion, participanteId, datos }) => {
    const solucion = game.plot?.solution.respuestas;
    if (!solucion) throw new AccionInvalida('Esta partida todavía no tiene saqueador.');
    const { acusacion } = registrarSenalamiento(
      sesion,
      participanteId,
      { [EJE_SAQUEADOR]: datos[EJE_SAQUEADOR] ?? '' },
      solucion,
    );
    // Deliberadamente no se devuelve si ha acertado: se sabrá al amanecer.
    return { registrada: true, at: acusacion.at };
  },
});
