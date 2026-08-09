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

/** Pone al día una partida recién leída del almacén. Devuelve la misma. */
export function alDia<T extends GameSession | null | undefined>(game: T): T {
  if (game) tramaAlDia(game.plot);
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
