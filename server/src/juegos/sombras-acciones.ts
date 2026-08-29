/**
 * Lo que se puede hacer en El Paso de las Sombras, y qué pasa cuando se hace.
 *
 * VA EN FICHERO APARTE por la misma razón que los de CLUEDO y la Momia:
 * registrar los reductores dentro de un módulo que importe la sesión cerraría
 * un círculo de importaciones y el módulo se quedaría a medio cargar.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA ACCIÓN QUE HACE DISTINTO A ESTE JUEGO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `avanzar` pide dos cosas: un paso —que el motor valida contra la categoría,
 * como siempre— y **la palabra escrita en la puerta de ese paso**, que llega por
 * `eligeLibre` y que el motor pasa TAL CUAL sin mirarla. Ese es el trato de
 * `eligeLibre` y aquí se cumple al pie de la letra: la valida este reductor, que
 * es el único que conoce las contraseñas.
 *
 * Y de ahí sale la propiedad que sostiene la mecánica entera: **una contraseña
 * equivocada no gasta la hora**. El motor apunta la acción DESPUÉS de que el
 * reductor devuelva, así que basta con lanzar `AccionInvalida` para que no
 * cuente. Sin eso, esto sería un castigo por tener mala vista a oscuras, y
 * habría que haberlo implementado a mano en algún sitio.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE DURA UNA HORA Y LO QUE DURA LA NOCHE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `EstadoSombras` es el contrato: vive en `shared/` y lo leen los tres paquetes.
 * Hay cosas que solo importan durante una hora y que ninguna pantalla necesita
 * —a quién ha amparado el komusō, si la plata ya se ha gastado esta hora, qué le
 * sopló el juglar al hōkashi— y meterlas en el contrato lo ensuciaría para
 * siempre por algo que se tira al abrir la hora siguiente. Van bajo una segunda
 * clave de `LiveSession.estado`, que es un `Record<string, unknown>` justamente
 * para esto.
 */
import { acusar as registrarSenalamiento, elegirSala } from '../live/sesion';
import { AccionInvalida, registrarAcciones } from './motor';
import { registrarInicio } from './inicios';
// Por la puerta principal: es el índice quien declara dónde vive cada
// categoría. Ver el comentario largo en `sombras-trama.ts`.
import { entidadesDe } from '../../../shared/juegos';
import {
  EJE_KANCHO,
  estadoInicial,
  papelesAlDia,
  pasoBatido,
  tramaDe,
} from './sombras-trama';
import {
  normalizarContrasena,
  PRENDAS_RECIBIDAS_MAXIMO,
  TRAMOS_DE_LA_SENDA,
} from '../../../shared/juegos/sombras-tipos';
import type {
  EstadoSombras,
  PapelId,
  PorteId,
  TramaSombras,
} from '../../../shared/juegos/sombras-tipos';
import type { GameSession } from '../../../shared/types';
import type { LiveSession } from '../../../shared/live';

/** Bajo qué clave de `LiveSession.estado` vive lo de este juego. */
export const CLAVE_ESTADO = 'sombras';

/** Y bajo cuál lo que dura solo una hora. */
export const CLAVE_HORA = 'sombras-hora';

/** Lo que dura una sola hora y se tira al abrir la siguiente. */
interface HoraSombras {
  ronda: number;
  /** A estas personas no les sube el rastro en lo que queda de hora. */
  amparados: string[];
  /**
   * Quiénes han pagado rastro por pisar el paso batido, y sigue sin devolverse.
   *
   * EXISTE PARA QUE EL KOMUSŌ PUEDA LLEGAR TARDE. Sin esto, amparar a alguien
   * que ya había entrado no servía de nada, y como no se anuncia dónde están los
   * cazadores, la única forma de usar bien el disfraz habría sido adivinar antes
   * de que nadie se moviera. Con esto se puede tapar a quien acaba de volver
   * diciendo «me han visto», que además es el momento en que la mesa se entera
   * de algo y hay que decidir deprisa. La mecánica gana un momento dramático y no
   * pierde ninguna garantía: se devuelve como mucho lo que se pagó.
   */
  pagaronPorBatido: string[];
  /** ¿Ha absorbido ya la plata de Chaya la subida de esta hora? */
  plataGastada: boolean;
  /** Lo que el juglar averiguó: el paso que batirán la hora siguiente. */
  adelantos: Record<string, string>;
}

// ---------------------------------------------------------------------------
// El estado
// ---------------------------------------------------------------------------

/**
 * El estado de esta sesión, creándolo si es la primera vez.
 *
 * Se crea PEREZOSAMENTE y también al abrir la mesa (ver `registrarInicio` más
 * abajo): `abrirSesion` es código de la plataforma y no puede saber que este
 * juego tiene algo que inicializar, pero sí puede PREGUNTARLO, y eso es lo que
 * hace el registro de inicios. Que además nazca en la primera acción es la red
 * por si la partida se abrió antes de existir el registro.
 */
export function estadoDe(game: GameSession, sesion: LiveSession): EstadoSombras {
  const trama = tramaDe(game.plot);
  if (!trama) throw new AccionInvalida('Esta partida todavía no tiene camino que cruzar.');

  /*
   * EL REPARTO SE RESUELVE ANTES DE SENTAR A NADIE.
   *
   * Es la misma rueda que usa `ampliarColumna` al actualizar la partida, así que
   * el papel y el estandarte que se le enseñan a quien se apuntó tarde son
   * EXACTAMENTE los que su dosier va a decir cuando el Game Master actualice — o
   * los que diría si ya lo hubiera hecho. Antes no: sentarle el móvil primero le
   * escribía un `rastrear` de respaldo y ningún estandarte, y el papel impreso
   * decía otra cosa.
   */
  const { papeles, estandartes: banderas } = papelesAlDia(
    trama,
    entidadesDe(game, 'escoltas'),
    entidadesDe(game, 'estandartes'),
  );

  sesion.estado = sesion.estado ?? {};
  let estado = sesion.estado[CLAVE_ESTADO] as EstadoSombras | undefined;
  if (!estado) {
    estado = estadoInicial(trama, sesion.players.map((p) => p.suspectId), papeles, banderas);
    sesion.estado[CLAVE_ESTADO] = estado;
  }

  /*
   * Quien se incorpore después de la primera acción también tiene que existir.
   * Sin esto, alguien que empareja tarde el móvil se queda sin prendas, sin
   * disfraz y sin estandarte, y no hay forma de que juegue.
   */
  for (const jugador of sesion.players) {
    if (estado.gente[jugador.suspectId]) continue;
    const recien = estadoInicial(trama, [jugador.suspectId], papeles, banderas);
    estado.gente[jugador.suspectId] = recien.gente[jugador.suspectId]!;
    // Por `banderas` y no por `trama.estandartes`: quien llegó tarde todavía no
    // está escrito en la trama y se quedaba sin estandarte hasta que alguien se
    // acordara de actualizar la partida.
    if (banderas[jugador.suspectId]) {
      estado.estandartes[jugador.suspectId] = banderas[jugador.suspectId]!;
    }
  }
  return estado;
}

/**
 * El alta: la columna monta su estado al abrir la mesa.
 *
 * Es la misma `estadoDe` de arriba, que ya sabe crearlo y es idempotente. Lo que
 * cambia es CUÁNDO: si naciera con la primera acción de alguien, el panel de
 * quien dirige no encontraría nada que leer —ni rastro, ni prendas, ni quién
 * lleva el farol— justo en el momento en que hay que empezar. Se traga su propio
 * error porque una partida sin trama todavía no puede montar nada, y eso no es
 * motivo para no abrir la mesa: el primer reductor lo intentará otra vez.
 */
registrarInicio('sombras', (game, sesion) => {
  if (!tramaDe(game.plot)) return;
  estadoDe(game, sesion);
});

/** La trama, ya comprobada. Los reductores no pueden trabajar sin ella. */
function tramaObligatoria(game: GameSession): TramaSombras {
  const trama = tramaDe(game.plot);
  if (!trama) throw new AccionInvalida('Esta partida todavía no tiene camino que cruzar.');
  return trama;
}

/** Lo de esta hora, reiniciado si la hora ha cambiado. */
function horaDe(sesion: LiveSession): HoraSombras {
  sesion.estado = sesion.estado ?? {};
  const guardada = sesion.estado[CLAVE_HORA] as HoraSombras | undefined;
  if (guardada && guardada.ronda === sesion.round) return guardada;
  const nueva: HoraSombras = {
    ronda: sesion.round,
    amparados: [],
    pagaronPorBatido: [],
    plataGastada: false,
    adelantos: {},
  };
  sesion.estado[CLAVE_HORA] = nueva;
  return nueva;
}

/** Lo de esta hora, sin crearlo. Para leer desde la proyección sin escribir. */
export function horaSiLaHay(sesion: LiveSession): HoraSombras | undefined {
  const guardada = (sesion.estado?.[CLAVE_HORA] as HoraSombras | undefined) ?? undefined;
  return guardada && guardada.ronda === sesion.round ? guardada : undefined;
}

/** ¿Es esta persona quien cobra de Akechi? Nunca se le pregunta al estado. */
export function esElKancho(game: GameSession, suspectId: string): boolean {
  return game.plot?.solution.respuestas[EJE_KANCHO] === suspectId;
}

/**
 * Qué puede invocar esta persona.
 *
 * El kanchō tiene DOS: el que le tocó, que es el que sale en su dosier, y
 * `falsear`, que no está escrito en ninguna parte porque se deduce de ser la
 * respuesta del eje. Un dato que no se guarda no se puede filtrar por descuido.
 */
export function papelesDe(game: GameSession, estado: EstadoSombras, suspectId: string): PapelId[] {
  const propio = estado.gente[suspectId]?.papel;
  const papeles: PapelId[] = propio ? [propio] : [];
  if (esElKancho(game, suspectId)) papeles.push('falsear');
  return papeles;
}

/** Quién lleva ahora mismo el enser con este porte, si alguien. */
export function quienLleva(estado: EstadoSombras, porte: PorteId): string | undefined {
  const enser = Object.entries(estado.portes).find(([, p]) => p === porte)?.[0];
  if (!enser) return undefined;
  return Object.entries(estado.gente).find(([, p]) => p.enseres.includes(enser))?.[0];
}

/** ¿Lleva esta persona el enser con este porte? */
export function llevaElPorte(estado: EstadoSombras, suspectId: string, porte: PorteId): boolean {
  return quienLleva(estado, porte) === suspectId;
}

/** Sube el rastro sin pasarse del tope, y deja constancia de cuánto subió. */
function subirRastro(estado: EstadoSombras, cuanto: number): number {
  const antes = estado.rastro;
  estado.rastro = Math.min(estado.rastroMaximo, Math.max(0, estado.rastro + cuanto));
  return estado.rastro - antes;
}

// ---------------------------------------------------------------------------
// Reconocer un paso
// ---------------------------------------------------------------------------

export interface ResultadoDeAvance {
  paso: string;
  /** Los hitos que había ahí esta hora y ahora están en tu mano. */
  hitos: string[];
  /** Los viste. Solo lo sabes tú, y solo porque estuviste allí. */
  batido: boolean;
  /** Cuánto subió el rastro de la columna por tu culpa. Puede ser cero. */
  rastroSubio: number;
  rastro: number;
  rastroMaximo: number;
  /** Alguien te estaba tapando, o llevabas la lanza. */
  teLibraste: boolean;
}

/**
 * Vas hasta un paso, lees la palabra de la puerta y vuelves con lo que hay.
 *
 * ES LA ÚNICA PUERTA por la que se coge un hito reconociendo, y la usan dos
 * caminos: la acción `avanzar` y las pruebas. Escribirlo dos veces habría dejado
 * dos sitios donde olvidarse de comprobar la contraseña.
 */
export function reconocerPaso(
  game: GameSession,
  sesion: LiveSession,
  suspectId: string,
  pasoId: string,
  contrasena: string,
): ResultadoDeAvance {
  const trama = tramaObligatoria(game);
  const estado = estadoDe(game, sesion);
  const persona = estado.gente[suspectId];
  if (!persona) throw new AccionInvalida('No cruzas con esta columna.');

  /*
   * LA COMPROBACIÓN QUE SOSTIENE EL JUEGO. Se lanza —no se devuelve un fallo
   * suave— porque lanzar es lo que hace que el motor NO apunte la acción, y por
   * tanto que no se gaste la hora. Es una propiedad del motor de la que este
   * juego depende, así que está dicha aquí y en la cabecera.
   */
  const esperada = trama.contrasenas[pasoId];
  if (!esperada) {
    throw new AccionInvalida('Ese paso no está en el camino de esta noche.');
  }
  if (!contrasena.trim()) {
    throw new AccionInvalida('Falta la palabra. Está escrita en la puerta del paso: ve a leerla.');
  }
  if (normalizarContrasena(contrasena) !== normalizarContrasena(esperada)) {
    throw new AccionInvalida(
      'Esa no es la palabra que hay escrita en la puerta. Míralo otra vez: no se te gasta la hora.',
    );
  }

  /*
   * Se apunta también como elección de sala. No es duplicar el estado: es lo que
   * hace que el plano del camino, el recuento de quién hay en cada paso y el
   * panel de quien dirige funcionen sin que la plataforma sepa nada de este
   * juego. Y aquí es MÁS importante que en la Momia: que se vea públicamente
   * quién estuvo dónde es lo que permite desmentir a quien miente.
   */
  elegirSala(sesion, suspectId, pasoId);

  // Los hitos que el camino tiene puestos aquí esta hora.
  const encontrados = trama.hallazgos
    .filter((h) => h.pasoId === pasoId && h.ronda === sesion.round)
    .map((h) => h.hitoId)
    .filter((id) => estado.hitos[id] && !persona.hitos.includes(id));
  persona.hitos.push(...encontrados);
  // De dónde salió cada uno. Ver el porqué en `EstadoDeEscolta.donde`: sin esto,
  // la marca de procedencia solo la llevarían los hitos falsos y los delataría.
  persona.donde = persona.donde ?? {};
  for (const id of encontrados) persona.donde[id] = { pasoId, ronda: sesion.round };

  const batido = pasoBatido(estado.batidos, sesion.round) === pasoId;
  const hora = horaDe(sesion);
  const amparado = hora.amparados.includes(suspectId);
  const conLanza = llevaElPorte(estado, suspectId, 'lanza');

  let subio = 0;
  let teLibraste = false;
  if (batido) {
    persona.pisadas += 1;
    if (amparado || conLanza) {
      teLibraste = true;
    } else if (quienLleva(estado, 'plata') !== undefined && !hora.plataGastada) {
      /*
       * LA PLATA ABSORBE LA PRIMERA SUBIDA DE CADA HORA, que es exactamente lo
       * que dice la regla «el rastro sube uno menos». Se apunta como gastada
       * para que no absorba dos, y se reinicia sola al abrirse la hora
       * siguiente porque `horaDe` tira el objeto entero.
       */
      hora.plataGastada = true;
      teLibraste = true;
    } else {
      subio = subirRastro(estado, 1);
      if (subio > 0) hora.pagaronPorBatido.push(suspectId);
    }
  }

  return {
    paso: pasoId,
    hitos: encontrados,
    batido,
    rastroSubio: subio,
    rastro: estado.rastro,
    rastroMaximo: estado.rastroMaximo,
    teLibraste,
  };
}

// ---------------------------------------------------------------------------
// Las prendas
// ---------------------------------------------------------------------------

/**
 * Das una prenda de confianza a otra persona.
 *
 * NUNCA A UNO MISMO, y es la regla de la que vive la mesa: si pudieras avalarte,
 * la confianza sería un contador privado y no habría que hablar con nadie. Como
 * no puedes, para valer más de uno en el consejo tienes que convencer a alguien,
 * y convencer es exponerse.
 *
 * Y CON TOPE. Sin él, en una mesa de ocho hay dieciséis prendas flotando y a la
 * persona más elocuente le pueden llegar seis: su voto valdría siete contra los
 * unos de los demás y el consejo dejaría de ser un consejo.
 */
export function darPrenda(
  game: GameSession,
  sesion: LiveSession,
  suspectId: string,
  aQuien: string,
): { prendas: number; recibidasPor: number } {
  const estado = estadoDe(game, sesion);
  if (aQuien === suspectId) {
    throw new AccionInvalida('Una prenda no se puede dar a uno mismo.');
  }
  const mio = estado.gente[suspectId];
  const suyo = estado.gente[aQuien];
  if (!mio) throw new AccionInvalida('No cruzas con esta columna.');
  if (!suyo) throw new AccionInvalida('Esa persona no cruza con la columna.');
  if (mio.prendas <= 0) throw new AccionInvalida('No te quedan prendas.');
  if (suyo.prendasRecibidas >= PRENDAS_RECIBIDAS_MAXIMO) {
    /*
     * Se rechaza en vez de gastarla en balde: es un recurso de dos usos en toda
     * la noche, y tirarla porque a esa persona ya la avalaban dos sería un
     * castigo desproporcionado por no llevar la cuenta.
     */
    throw new AccionInvalida(
      `Esa persona ya tiene ${PRENDAS_RECIBIDAS_MAXIMO} prendas: nadie puede tener más.`,
    );
  }

  mio.prendas -= 1;
  suyo.prendasRecibidas += 1;
  return { prendas: mio.prendas, recibidasPor: suyo.prendasRecibidas };
}

// ---------------------------------------------------------------------------
// La carga
// ---------------------------------------------------------------------------

/**
 * Le pasas un enser a otra persona.
 *
 * ES UN ACTO FÍSICO: en la mesa se da el objeto de verdad, y la app solo deja
 * constancia. Por eso no tiene límite de veces y se puede hacer con la hora
 * cerrada: el momento en que se decide quién lleva el farol es una conversación,
 * no un turno.
 */
export function pasarEnser(
  game: GameSession,
  sesion: LiveSession,
  suspectId: string,
  enserId: string,
  aQuien: string,
): { enser: string; aQuien: string } {
  const estado = estadoDe(game, sesion);
  if (aQuien === suspectId) throw new AccionInvalida('Ya lo llevas tú.');
  const mio = estado.gente[suspectId];
  const suyo = estado.gente[aQuien];
  if (!mio) throw new AccionInvalida('No cruzas con esta columna.');
  if (!suyo) throw new AccionInvalida('Esa persona no cruza con la columna.');
  if (!mio.enseres.includes(enserId)) throw new AccionInvalida('Eso no lo llevas tú.');

  mio.enseres = mio.enseres.filter((e) => e !== enserId);
  suyo.enseres.push(enserId);
  return { enser: enserId, aQuien };
}

// ---------------------------------------------------------------------------
// El disfraz
// ---------------------------------------------------------------------------

export interface ResultadoDeInvocacion {
  papel: PapelId;
  /** Lo que ha pasado, en una frase para quien lo usó. */
  efecto: string;
  /** A quién ha afectado, si a alguien. */
  objetivo?: string;
  /** Lo que solo ve quien invoca: un hito nuevo, el paso de la hora siguiente. */
  revelado?: string;
}

/** ¿Le falta a esta persona un solo hito para tenerlos TODOS? */
function leFaltaSoloUno(estado: EstadoSombras, suspectId: string): boolean {
  const persona = estado.gente[suspectId];
  if (!persona) return false;
  const ciertos = Object.values(estado.hitos).filter((h) => !h.falso);
  return ciertos.filter((h) => !persona.hitos.includes(h.id)).length <= 1;
}

/**
 * Usas tu disfraz. Una vez por hora.
 *
 * LOS DESTINOS VAN EN CAMPOS DISTINTOS SEGÚN LO QUE SEAN, y no en un `objetivo`
 * para todo. La razón es del motor: valida cada campo contra la categoría que la
 * acción declara, así que una persona y un paso no pueden compartir campo. Y lo
 * que no es una entidad —cuál de tus hitos, cuál de tus disfraces— llega por
 * `eligeLibre` y lo valida esta función.
 *
 * Los valores por defecto son DETERMINISTAS, nunca al azar: una partida tiene
 * que poder repetirse con la misma semilla.
 */
export function invocarPapel(
  game: GameSession,
  sesion: LiveSession,
  suspectId: string,
  opciones: { papel?: string; aQuien?: string; paso?: string; hito?: string } = {},
): ResultadoDeInvocacion {
  const trama = tramaObligatoria(game);
  const estado = estadoDe(game, sesion);
  const persona = estado.gente[suspectId];
  if (!persona) throw new AccionInvalida('No cruzas con esta columna.');

  const disponibles = papelesDe(game, estado, suspectId);
  const papel = (opciones.papel as PapelId | undefined) ?? disponibles[0];
  if (!papel || !disponibles.includes(papel)) {
    throw new AccionInvalida('Ese disfraz no es el tuyo.');
  }
  if (persona.papelUsadoEnRonda === sesion.round) {
    throw new AccionInvalida('Tu disfraz ya se ha usado esta hora.');
  }

  const otros = Object.keys(estado.gente).filter((id) => id !== suspectId);
  /*
   * A falta de elección, quien más ha pisado donde no debía; a igualdad, el
   * primero por id. DETERMINISTA Y NO AL AZAR: una partida tiene que poder
   * repetirse con la misma semilla, y un valor por defecto aleatorio lo impide.
   */
  const masExpuesto = [...otros].sort((a, b) => {
    const d = (estado.gente[b]?.pisadas ?? 0) - (estado.gente[a]?.pisadas ?? 0);
    return d !== 0 ? d : a.localeCompare(b);
  })[0];

  const hora = horaDe(sesion);
  /*
   * Dónde estuviste esta hora. Lo necesitan tres papeles: `rastrear` para
   * apuntar de dónde salió el mojón de más, `falsear` para pegarle a la mentira
   * un sitio comprobable, y ninguno más — pero se calcula una vez porque los
   * tres lo sacarían del mismo sitio.
   */
  const jugador = sesion.players.find((p) => p.suspectId === suspectId);
  const dondeEstoy = (jugador?.elecciones ?? [])
    .filter((e) => e.round === sesion.round)
    .map((e) => e.roomId)
    .pop();
  persona.donde = persona.donde ?? {};

  let resultado: ResultadoDeInvocacion;

  switch (papel) {
    case 'rastrear': {
      /*
       * NUNCA ENTREGA EL ÚLTIMO QUE FALTA. Con cuatro horas, un yamabushi podría
       * juntar el camino entero entre lo que reconoce y lo que rastrea, y
       * entonces la garantía de que nadie lo resuelve en solitario —que es la
       * razón de ser del juego— se cae por la puerta de atrás. Que el monte se
       * resista es mejor regla que un tope contado.
       */
      if (leFaltaSoloUno(estado, suspectId)) {
        throw new AccionInvalida('El monte se cierra: nadie lee el camino entero por su cuenta.');
      }
      const candidato = Object.values(estado.hitos)
        .filter((h) => !h.falso && !persona.hitos.includes(h.id))
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      if (!candidato) throw new AccionInvalida('No queda mojón que leer.');
      persona.hitos.push(candidato.id);
      /*
       * Se apunta como leído DONDE ESTABAS. Fictivamente el yamabushi lee dos
       * mojones en el mismo alto, y en la mesa es la respuesta honesta a «¿de
       * dónde has sacado eso?». Si todavía no ha ido a ninguna parte, queda sin
       * procedencia, que es un dato ambiguo y no un delator.
       */
      if (dondeEstoy) persona.donde[candidato.id] = { pasoId: dondeEstoy, ronda: sesion.round };
      resultado = {
        papel,
        efecto: 'Has leído un mojón más. Solo tú lo has visto.',
        revelado: candidato.texto,
      };
      break;
    }

    case 'amparar': {
      /*
       * Aquí sí se admite ampararse a uno mismo: el komusō lleva la cesta en la
       * cabeza y decide a quién esconde detrás. Es lo contrario de la prenda, y a
       * propósito: una obliga a hablar, el otro es la decisión privada de quien
       * puede taparse la cara.
       */
      const aQuien = opciones.aQuien ?? masExpuesto ?? suspectId;
      if (!estado.gente[aQuien]) throw new AccionInvalida('Esa persona no cruza con la columna.');
      if (!hora.amparados.includes(aQuien)) hora.amparados.push(aQuien);

      /*
       * Y SI YA HABÍA PAGADO, SE LE DEVUELVE. Ver el porqué en `HoraSombras`:
       * como no se anuncia dónde están los cazadores, amparar solo a futuro
       * habría exigido adivinar antes de que nadie se moviera.
       */
      let devuelto = false;
      const i = hora.pagaronPorBatido.indexOf(aQuien);
      if (i >= 0) {
        hora.pagaronPorBatido.splice(i, 1);
        subirRastro(estado, -1);
        devuelto = true;
      }
      resultado = {
        papel,
        efecto: devuelto
          ? 'Le has puesto la cesta por delante justo a tiempo: el rastro vuelve atrás.'
          : 'Esta hora, a quien has elegido no le van a mirar la cara.',
        objetivo: aQuien,
      };
      break;
    }

    case 'comprar': {
      if (estado.rastro <= 0) {
        throw new AccionInvalida('No hay rastro que comprar todavía. Guarda la plata.');
      }
      subirRastro(estado, -1);
      resultado = {
        papel,
        efecto: 'Has pagado a quien había que pagar. El rastro de la columna baja uno.',
      };
      break;
    }

    case 'adelantarse': {
      const manana = pasoBatido(estado.batidos, sesion.round + 1);
      if (!manana) throw new AccionInvalida('No hay otra hora después de esta.');
      hora.adelantos[suspectId] = manana;
      resultado = {
        papel,
        efecto: 'Sabes dónde esperarán la hora que viene. Decide qué haces con eso.',
        revelado: manana,
      };
      break;
    }

    case 'referir': {
      const cual =
        opciones.hito ??
        persona.hitos.find((id) => estado.hitos[id] && !estado.hitos[id]!.publico);
      const hito = cual ? estado.hitos[cual] : undefined;
      if (!hito) throw new AccionInvalida('No tienes ningún mojón sin contar.');
      if (!persona.hitos.includes(hito.id)) {
        throw new AccionInvalida('Solo puedes contar lo que has leído tú.');
      }
      hito.publico = true;
      hito.publicadoPor = suspectId;
      /*
       * Y CON LA PROCEDENCIA QUE TÚ TIENES APUNTADA, no con una inventada. Esto
       * es lo que hace que la marca de sitio y hora no delate a los falsos: la
       * llevan todos los que se publican, y la de un hito honesto dice la verdad.
       */
      const suProcedencia = persona.donde[hito.id];
      if (suProcedencia) hito.halladoEn = { ...suProcedencia };
      resultado = {
        papel,
        efecto: 'Lo has dicho en voz alta. Ya está sobre la mesa para todos.',
        objetivo: hito.id,
      };
      break;
    }

    case 'trocar': {
      const aQuien = opciones.aQuien ?? masExpuesto;
      if (!aQuien || aQuien === suspectId) {
        throw new AccionInvalida('Un trueque es con otra persona, no contigo.');
      }
      const suyo = estado.gente[aQuien];
      if (!suyo) throw new AccionInvalida('Esa persona no cruza con la columna.');

      const doy =
        (opciones.hito && persona.hitos.includes(opciones.hito) ? opciones.hito : undefined) ??
        persona.hitos.filter((id) => !suyo.hitos.includes(id)).sort()[0];
      const recibo = suyo.hitos.filter((id) => !persona.hitos.includes(id)).sort()[0];
      if (!doy) throw new AccionInvalida('No tienes ningún mojón que a esa persona le falte.');
      if (!recibo) throw new AccionInvalida('Esa persona no tiene ningún mojón que a ti te falte.');

      suyo.hitos.push(doy);
      persona.hitos.push(recibo);
      /*
       * La procedencia VIAJA CON EL HITO, no se reescribe. «Esto me lo dio
       * Fulano, que lo leyó en el Vado» es la respuesta honesta, y además deja
       * un rastro social bonito: un hito que dio la vuelta a la mesa conserva
       * dónde nació. Si el otro no la tenía apuntada, sigue sin tenerla.
       */
      suyo.donde = suyo.donde ?? {};
      if (persona.donde[doy]) suyo.donde[doy] = { ...persona.donde[doy]! };
      if (suyo.donde[recibo]) persona.donde[recibo] = { ...suyo.donde[recibo]! };
      resultado = {
        papel,
        efecto: 'Trueque hecho. Los dos sabéis algo más, y los dos os habéis enseñado algo.',
        objetivo: aQuien,
        revelado: estado.hitos[recibo]?.texto,
      };
      break;
    }

    case 'falsear': {
      /*
       * EL PAPEL QUE ROMPE EL SUPUESTO DEL QUE VIVE CLUEDO: aquí no toda pista es
       * verdad. La mentira se fabricó al generar la partida y no en caliente, y
       * eso importa: una frase escrita ahora tendría otro tono que las demás, y
       * una pista que suena distinta se delata sola.
       *
       * Y AQUÍ VA PEGADA A UN LUGAR Y A UNA HORA, que es lo que la Momia no tenía.
       * El mojón falso se publica como hallado en el paso donde estuviste, y la
       * app dice públicamente quién estuvo dónde: mentir sobre un sitio donde
       * había alguien más es delatarse. Por eso hay que haber ido a algún sitio
       * antes de poder mentir.
       */
      if (!dondeEstoy) {
        throw new AccionInvalida(
          'Primero ve a algún paso: un mojón escrito de tu puño tiene que haber aparecido en alguna parte.',
        );
      }

      const yaPublicadas = new Set(
        Object.values(estado.hitos).filter((h) => h.falso).map((h) => h.id),
      );
      const candidata =
        trama.falsasCandidatas.find((f) => f.id === opciones.hito) ??
        trama.falsasCandidatas.find((f) => !yaPublicadas.has(f.id));
      if (!candidata) throw new AccionInvalida('Ya has gastado todas tus mentiras.');
      if (yaPublicadas.has(candidata.id)) throw new AccionInvalida('Esa ya está sobre la mesa.');

      estado.hitos[candidata.id] = {
        id: candidata.id,
        condicion: candidata.condicion,
        texto: candidata.texto,
        falso: true,
        // Nace público: escribir un mojón y guardárselo no serviría de nada.
        publico: true,
        publicadoPor: suspectId,
        halladoEn: { pasoId: dondeEstoy, ronda: sesion.round },
      };
      // Y va a tu mano, con su procedencia, para que parezca un hallazgo tuyo
      // como cualquier otro. Si el papiro delatara que salió de la nada, sobraría
      // todo lo demás.
      persona.hitos.push(candidata.id);
      persona.donde[candidata.id] = { pasoId: dondeEstoy, ronda: sesion.round };
      resultado = {
        papel,
        efecto: 'El mojón está sobre la mesa, con tu nombre y el sitio donde dices haberlo leído.',
        objetivo: candidata.id,
        revelado: candidata.texto,
      };
      break;
    }

    default:
      throw new AccionInvalida('Ese disfraz no existe.');
  }

  persona.papelUsadoEnRonda = sesion.round;
  return resultado;
}

// ---------------------------------------------------------------------------
// Proponer la senda
// ---------------------------------------------------------------------------

/**
 * Entregas tu propuesta: cuatro pasos, en orden.
 *
 * SE PUEDE CAMBIAR EN HORAS POSTERIORES, y a propósito: la propuesta va
 * madurando conforme salen hitos, y obligar a casarse con la primera castigaría
 * a quien se moja pronto. Lo que no se puede es entregar dos en la misma hora,
 * que es lo que comprueba el motor con `vecesPorTurno: 1`.
 *
 * La hora la pone el SERVIDOR porque desempata el consejo: si viniera del móvil,
 * bastaría con atrasar el reloj del teléfono para ganar todos los empates.
 */
export function proponerSenda(
  game: GameSession,
  sesion: LiveSession,
  suspectId: string,
  senda: string[],
): { senda: string[]; at: string } {
  const estado = estadoDe(game, sesion);
  const pasos = entidadesDe(game, 'pasos').map((p) => p.id);

  if (!Array.isArray(senda) || senda.length !== TRAMOS_DE_LA_SENDA) {
    throw new AccionInvalida(`La senda son ${TRAMOS_DE_LA_SENDA} pasos, ni uno más ni uno menos.`);
  }
  if (new Set(senda).size !== senda.length) {
    throw new AccionInvalida('Hay un paso repetido en tu propuesta.');
  }
  if (!senda.every((id) => pasos.includes(id))) {
    throw new AccionInvalida('Alguno de esos pasos no es de este camino.');
  }

  const propuesta = { senda: [...senda], at: new Date().toISOString() };
  estado.propuestas[suspectId] = propuesta;
  return propuesta;
}

// ---------------------------------------------------------------------------
// Los reductores
// ---------------------------------------------------------------------------

registrarAcciones('sombras', {
  /**
   * Reconocer un paso.
   *
   * UNO POR HORA. El manifiesto declara `cambiosPermitidos: 0` para decirlo,
   * pero ese campo hoy no lo lee nadie: lo que de verdad lo impide es
   * `vecesPorTurno: 1`, que el motor sí comprueba. Está anotado en el diseño,
   * porque una regla que se cree escrita en dos sitios y solo está en uno es de
   * las que se rompen al mover cualquier otra cosa.
   */
  avanzar: ({ game, sesion, suspectId, datos }) =>
    reconocerPaso(game, sesion, suspectId, datos.paso!, datos.contrasena ?? ''),

  avalar: ({ game, sesion, suspectId, datos }) =>
    darPrenda(game, sesion, suspectId, datos.aQuien!),

  entregar: ({ game, sesion, suspectId, datos }) =>
    pasarEnser(game, sesion, suspectId, datos.enser!, datos.aQuien!),

  /*
   * Los campos llegan por `eligeOpcional` y `eligeLibre`, que es lo que permite
   * que una misma acción pida una persona, un paso, un hito o nada según el
   * disfraz. Cuál mirar lo decide el reductor, porque el motor no puede: el
   * disfraz es secreto.
   */
  invocar: ({ game, sesion, suspectId, datos }) =>
    invocarPapel(game, sesion, suspectId, {
      papel: datos.papel,
      aQuien: datos.aQuien,
      paso: datos.paso,
      hito: datos.hito,
    }),

  /*
   * La lista llega en `listas`, ya validada por el motor: cuatro pasos, todos
   * reales, sin repetidos y en el orden en que se mandaron. Las comprobaciones
   * de `proponerSenda` siguen ahí de todos modos, porque esa función también se
   * llama desde las pruebas, y una regla que solo se cumple cuando se entra por
   * una puerta no es una regla.
   */
  'proponer-senda': ({ game, sesion, suspectId, listas }) => {
    const senda = listas.senda ?? [];
    if (senda.length === 0) {
      throw new AccionInvalida(
        'Tu propuesta no ha llegado. La senda se entrega desde la pantalla del consejo.',
      );
    }
    return proponerSenda(game, sesion, suspectId, senda);
  },

  /**
   * Señalar a quien cobra de Akechi.
   *
   * Se apoya entera en la maquinaria de acusación que ya existe, y de ahí hereda
   * gratis las cuatro reglas que hacen falta: una por persona y para toda la
   * partida, no se puede cambiar, no se dice si has acertado, y quien cobra de
   * Akechi no gana señalándose a sí mismo.
   *
   * OJO CON LO QUE SIGNIFICA `winnerId` EN ESTE JUEGO. La plataforma lo pone al
   * primero que acierta, porque en CLUEDO eso es ganar. Aquí no: aquí gana un
   * BANDO, y eso se decide en el consejo del alba. Así que `winnerId` quiere
   * decir «quien primero desenmascaró al kanchō» —que es lo que premia el trofeo
   * El ojo de Hanzō— y la victoria de verdad viaja aparte, en el resultado del
   * consejo. Es la misma limitación que ya tenía la Momia y está en el informe.
   */
  senalar: ({ game, sesion, suspectId, datos }) => {
    const solucion = game.plot?.solution.respuestas;
    if (!solucion) throw new AccionInvalida('Esta partida todavía no tiene kanchō.');
    const { acusacion } = registrarSenalamiento(
      sesion,
      suspectId,
      { [EJE_KANCHO]: datos[EJE_KANCHO] ?? '' },
      solucion,
    );
    // Deliberadamente no se devuelve si ha acertado: se sabrá al amanecer.
    return { registrada: true, at: acusacion.at };
  },
});
