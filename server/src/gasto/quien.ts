/**
 * Quién está pidiendo algo que cuesta dinero.
 *
 * Estaba escrita dentro de `routes/generacion.ts`, que es la ruta BARATA, y por
 * eso el tope solo podía existir allí: las rutas caras —generar una trama,
 * ampliarla, hablar con el asistente— no tenían a quién contarle el gasto.
 *
 * Vale cualquier identidad de la plataforma, y ese es el punto: quien genera su
 * avatar es un jugador desde su móvil, quien genera una trama es quien dirige
 * desde el taller, y las dos cosas cuestan. Se les cuenta por separado porque
 * son personas distintas.
 */
import { identidadDeTaller } from '../auth';
import { credencialDePeticion } from '../live/token';
import { sesionDeCuentaDePeticion } from '../identidad/sesion';
import type { Request } from 'express';

/**
 * Un identificador estable de quien llama, o `null` si no se identifica.
 *
 * `casa` y `abierto` NO son personas: son la contraseña compartida de la casa y
 * el modo sin puerta. Van marcados así a propósito para que el tope pueda
 * darles su propia holgura — la comparte quien la tenga, y su cubo sería uno
 * solo para todo el mundo.
 */
export function quienPide(req: Request): string | null {
  const jugador = credencialDePeticion(req.headers.authorization);
  if (jugador) return `jugador:${jugador.gameId}:${jugador.participanteId}`;
  const cuenta = sesionDeCuentaDePeticion(req);
  if (cuenta) return `cuenta:${cuenta.cuentaId}`;
  const taller = identidadDeTaller(req);
  if (taller?.tipo === 'casa') return 'casa';
  if (taller?.tipo === 'abierto') return 'abierto';
  if (taller?.tipo === 'cuenta') return `cuenta:${taller.cuentaId}`;
  return null;
}
