/**
 * Lo que se puede hacer en CLUEDO, y qué pasa cuando se hace.
 *
 * Aquí es donde la regla «gana quien acierta primero» deja de ser una ley de la
 * plataforma y pasa a ser lo que dice ESTE juego. El motor no sabe que existe
 * un ganador ni cómo se decide: ejecuta el reductor y guarda lo que escriba.
 * Una oca declara que gana quien llega a la meta, y le sale igual de bien.
 *
 * VA EN FICHERO APARTE por una razón concreta y no por gusto: registrar los
 * reductores dentro de `juegos/cluedo.ts` cerraría un círculo de importaciones
 * —cluedo → sesion → store → migracion → cluedo— y el módulo se quedaría a
 * medio cargar. Este se importa desde las rutas, que es el único sitio que de
 * verdad necesita que estén dados de alta.
 */
import { registrarAcciones } from './motor';
import { AccionInvalida } from './motor';
import { responder as registrarAcusacion, elegirSala } from '../live/sesion';
import { EJES } from './cluedo';
import type { EjeId } from '../../../shared/juegos';

registrarAcciones('cluedo', {
  /** Entrar en una sala a investigar. Se puede rectificar una vez. */
  'entrar-en-sala': ({ sesion, participanteId, datos }) => {
    elegirSala(sesion, participanteId, datos.sala!);
    return { sala: datos.sala };
  },

  /**
   * Acusar: quién, con qué y dónde.
   *
   * Toda la mecánica de victoria de CLUEDO cabe en estas líneas, y ese es el
   * objetivo: que un juego nuevo pueda tener otra completamente distinta sin
   * pedirle permiso a la plataforma.
   */
  acusar: ({ game, sesion, participanteId, datos }) => {
    const solucion = game.plot?.solution.respuestas;
    if (!solucion) throw new AccionInvalida('Esta partida todavía no tiene misterio.');

    // Los campos de la acción son los ejes, así que lo que llega ya viene
    // comprobado por el motor: cada valor es una entidad real de su categoría.
    const respuestas: Record<EjeId, string> = {
      [EJES.culpable]: datos[EJES.culpable] ?? '',
      [EJES.objeto]: datos[EJES.objeto] ?? '',
      [EJES.lugar]: datos[EJES.lugar] ?? '',
    };

    const { respuesta } = registrarAcusacion(sesion, participanteId, respuestas, solucion);
    // Deliberadamente NO se devuelve si ha acertado: se sabrá en el desenlace,
    // como en la mesa. Devolverlo aquí permitiría probar combinaciones.
    return { registrada: true, at: respuesta.at };
  },
});
