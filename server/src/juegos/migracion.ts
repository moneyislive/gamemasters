/**
 * Partidas escritas antes de que la respuesta fuese una lista de ejes.
 *
 * POR QUÉ EXISTE ESTE FICHERO. Cuando la solución dejó de ser
 * `{murdererId, weaponId, roomId}` para pasar a ser `respuestas`, todo lo que
 * ya estaba guardado se quedó con la forma vieja: las partidas del Atlas de
 * quien usa esto hoy, las sesiones en vivo a medio jugar y los ficheros JSON de
 * desarrollo. El almacén de Mongo es de esquema laxo, así que nada avisa: se
 * lee el documento tal cual y el código nuevo se encuentra un `undefined` donde
 * esperaba un diccionario.
 *
 * Lo descubrió el maestro de oro al primer intento, y por eso su partida
 * congelada se deja a propósito en el formato ANTIGUO: así cada ejecución
 * vuelve a comprobar que la conversión sigue funcionando.
 *
 * La conversión es de solo ida y se hace al leer, no al escribir. No hay que
 * migrar la base de datos ni parar nada: un documento viejo se convierte al
 * cargarlo y se guarda ya con la forma nueva la próxima vez que se toque.
 */
import { respuestasCluedo } from './cluedo';
import { manifiestoSiExiste } from '../../../shared/juegos';
import type { Entidad } from '../../../shared/juegos';
import type { GameSession, Plot } from '../../../shared/types';
import type { LiveSession } from '../../../shared/live';

/** La forma que tenían la solución y las acusaciones antes del cambio. */
interface TernaHeredada {
  murdererId?: string;
  weaponId?: string;
  roomId?: string;
}

function tieneTerna(v: unknown): v is TernaHeredada {
  return typeof v === 'object' && v !== null && 'murdererId' in v;
}

/**
 * Convierte una trama antigua.
 *
 * Solo actúa si falta `respuestas` y está la terna: así llamarla dos veces es
 * inocuo y una trama ya convertida no se toca.
 */
export function tramaAlDia(plot: Plot | undefined): boolean {
  if (!plot?.solution) return false;
  const s = plot.solution as unknown as TernaHeredada & { respuestas?: Record<string, string> };
  if (s.respuestas) return false;
  if (!tieneTerna(s)) return false;

  plot.solution.respuestas = respuestasCluedo({
    murdererId: s.murdererId ?? '',
    weaponId: s.weaponId ?? '',
    roomId: s.roomId ?? '',
  });
  delete s.murdererId;
  delete s.weaponId;
  delete s.roomId;
  return true;
}

/**
 * Muda las entidades de los tres campos heredados a `entidades`.
 *
 * ═══ QUÉ SE ESTÁ CONVIRTIENDO ═══
 *
 * Una partida guardaba sus cosas en `suspects`, `rooms` y `weapons`: tres
 * campos con nombre en el contrato común, heredados del primer juego. Un juego
 * cuya categoría de personas no se llamara «sospechosos» tenía que declarar
 * `almacenHeredado: 'suspects'` para que sus datos acabaran ahí, y todo el
 * núcleo leía esos tres campos por su nombre.
 *
 * Ahora todas las categorías de todos los juegos viven en
 * `game.entidades[categoria]`. Esto trae las partidas viejas a ese sitio.
 *
 * ═══ POR QUÉ AL LEER Y NO EN UN PROCESO APARTE ═══
 *
 * Porque es el patrón que ya usaba este fichero para la terna de la acusación, y
 * porque un proceso por lotes hay que acordarse de correrlo —en cada base, en
 * cada país, después de cada despliegue— y esto no. Una partida se pone al día
 * la primera vez que alguien la abre, y se queda así al guardarla.
 *
 * SE VACÍA EL CAMPO VIEJO. Dejarlo lleno significaría dos copias de la misma
 * lista divergiendo en cuanto alguien edite: quien lea por `entidadesDe` vería
 * la nueva y quien leyera el campo a pelo vería la vieja para siempre. Y
 * quedaría escondido, que es lo peor.
 */
function entidadesAlDia(game: GameSession): void {
  const manifiesto = manifiestoSiExiste(game.settings?.juego);
  if (!manifiesto) return;

  for (const cat of manifiesto.categorias) {
    const campo = cat.almacenHeredado;
    if (!campo) continue;
    const viejas = game[campo] as unknown as Entidad[] | undefined;
    if (!viejas || viejas.length === 0) continue;

    game.entidades ??= {};
    /*
     * Si ya hay algo en el sitio nuevo, manda lo nuevo y lo viejo se descarta.
     * Es el caso de una partida que se guardó a medio migrar —posible si un
     * despliegue se revierte— y ahí lo correcto es quedarse con lo último que
     * se escribió, no fusionar dos listas y duplicar a la mitad de la mesa.
     */
    if (!game.entidades[cat.id] || game.entidades[cat.id]!.length === 0) {
      game.entidades[cat.id] = viejas;
    }
    (game as unknown as Record<string, unknown>)[campo] = [];
  }
}

/**
 * El indice de dosieres guardado llamaba `suspectId` a lo que no siempre es una
 * persona.
 *
 * Ahi caben tres cosas: el id de alguien de la mesa, las cadenas `gm` y
 * `solution` —los dosieres que no son de nadie— y el id de un imprimible
 * entero. Llamar `suspectId` a «informe-validacion» era una mentira que costaba
 * un rato entender, asi que el campo pasa a llamarse `id`.
 *
 * SIN ESTO, una partida guardada se queda con el indice ilegible: la interfaz
 * lista dosieres sin nombre y `computeStaleness` cree que a todo el mundo le
 * falta el suyo, asi que marca la partida caducada y ofrece regenerarla.
 */
function documentosAlDia(game: GameSession): void {
  for (const doc of game.documents ?? []) {
    const viejo = doc as unknown as { suspectId?: string; id?: string };
    if (viejo.id === undefined && typeof viejo.suspectId === 'string') {
      viejo.id = viejo.suspectId;
    }
    delete viejo.suspectId;
  }
}


/**
 * `suspectId` pasa a llamarse `participanteId` en todo lo guardado.
 *
 * ═══ QUE SE ESTA CONVIRTIENDO, Y POR QUE IMPORTA TANTO ═══
 *
 * El concepto —«cual de los que estan sentados a la mesa»— es de todos los
 * juegos: lo usan el emparejamiento de moviles, la presencia, los trofeos, los
 * correos y el motor de acciones, que por lo demas no sabe a que se juega. Lo
 * que sobraba era el NOMBRE, heredado del primer juego.
 *
 * Y estaba en SIETE sitios guardados. Si alguno se queda sin convertir no se
 * rompe nada visible: se rompe una partida a medias, de noche, con doce
 * personas delante. Los siete son:
 *
 *   · `players[].participanteId`   quien ocupa cada silla
 *   · `acusaciones[].participanteId`  quien la entrego
 *   · `acciones[].participanteId`  el registro de lo que se ha hecho
 *   · `denuncias[].participanteId` quien denuncio una respuesta del asistente
 *   · `plot.characters[].participanteId`  a quien interpreta cada personaje
 *   · `plot.timeline[].participanteIds`   quienes estaban en cada momento
 *   · `plot.material.twists[].participanteId`  a quien va cada giro
 *
 * Los cuatro primeros viven en la sesion y los tres ultimos en la partida, asi
 * que se convierten en las dos puertas: `alDia` y `sesionAlDia`.
 */
function renombrarParticipante(objeto: unknown): void {
  if (!objeto || typeof objeto !== 'object') return;
  const o = objeto as Record<string, unknown>;
  if (o.participanteId === undefined && typeof o.suspectId === 'string') {
    o.participanteId = o.suspectId;
  }
  delete o.suspectId;
  if (o.participanteIds === undefined && Array.isArray(o.suspectIds)) {
    o.participanteIds = o.suspectIds;
  }
  delete o.suspectIds;
}

/** Lo guardado en la PARTIDA que llevaba el nombre viejo. */
function participantesDeLaTramaAlDia(game: GameSession): void {
  const plot = game.plot;
  if (!plot) return;
  for (const personaje of plot.characters ?? []) renombrarParticipante(personaje);
  for (const momento of plot.timeline ?? []) renombrarParticipante(momento);
  for (const giro of plot.material?.twists ?? []) renombrarParticipante(giro);
}

/** Lo guardado en la SESION que llevaba el nombre viejo. */
function participantesDeLaSesionAlDia(sesion: LiveSession): void {
  for (const jugador of sesion.players ?? []) renombrarParticipante(jugador);
  for (const a of sesion.acusaciones ?? []) renombrarParticipante(a);
  for (const accion of sesion.acciones ?? []) renombrarParticipante(accion);
  for (const denuncia of sesion.denuncias ?? []) renombrarParticipante(denuncia);
}

/** Pone al día una partida recién leída del almacén. Devuelve la misma. */
export function alDia<T extends GameSession | null | undefined>(game: T): T {
  if (game) {
    tramaAlDia(game.plot);
    entidadesAlDia(game);
    documentosAlDia(game);
    participantesDeLaTramaAlDia(game);
  }
  return game;
}

/**
 * Pone al día una sesión en vivo recién leída.
 *
 * Las acusaciones ya entregadas llevaban la terna. Si se perdieran, una partida
 * a medio jugar olvidaría quién acusó qué —y con ella, quién iba ganando.
 */
export function sesionAlDia<T extends LiveSession | null | undefined>(sesion: T): T {
  if (!sesion) return sesion;
  participantesDeLaSesionAlDia(sesion);
  for (const a of sesion.acusaciones ?? []) {
    const vieja = a as unknown as TernaHeredada & { respuestas?: Record<string, string> };
    if (vieja.respuestas || !tieneTerna(vieja)) continue;
    a.respuestas = respuestasCluedo({
      murdererId: vieja.murdererId ?? '',
      weaponId: vieja.weaponId ?? '',
      roomId: vieja.roomId ?? '',
    });
    delete vieja.murdererId;
    delete vieja.weaponId;
    delete vieja.roomId;
  }
  return sesion;
}
