/**
 * Quién pone al día la trama de cada juego cuando la mesa cambia.
 *
 * CUÁNDO PASA. Se añade alguien a la partida cuando ya hay misterio escrito, y
 * el taller ofrece «Actualizar el misterio». Es lo normal: alguien confirma
 * tarde y se le sienta.
 *
 * LO QUE PASABA. `refresh.ts` corría el pipeline de CLUEDO para cualquier
 * juego. Sobre una partida de El Misterio de la Momia eso hacía tres cosas
 * malas a la vez:
 *
 *  · Le mandaba al modelo un encargo que empieza «experto en CLUEDO» y le
 *    pasaba la solución del caso —incluido el MOTIVO, que nombra a quien rompió
 *    el sello— para que escribiera coartadas. Esas coartadas acaban en
 *    `publicPersona`, que se imprime en la hoja de TODO EL MUNDO.
 *  · Dejaba a la persona nueva fuera del reparto de dones. El móvil le ponía
 *    `descifrar` en silencio y su dosier impreso decía que esta partida no le
 *    había asignado ninguno: dos respuestas distintas a la misma pregunta.
 *  · Gastaba una llamada a la API para escribir sobre un asesinato que en esa
 *    partida no ha ocurrido.
 *
 * QUÉ HACE AHORA CADA JUEGO ES COSA SUYA. CLUEDO registra el suyo de siempre y
 * no cambia nada. La Momia registra uno que reparte el don que falta y escribe
 * un papel mínimo, sin llamar al modelo: primero que la partida sea correcta;
 * el color se lo puede dar quien dirige, o regenerar el misterio entero.
 *
 * ESTE REGISTRO Y EL DE `materiales.ts` son las dos mitades del
 * `registrarGenerador` que pide el informe de arquitectura. Cuando se junten,
 * este comentario sobra.
 */
import type { JuegoId } from '../../../shared/juegos';
import type { GenerateStreamEvent, GameSession, Plot } from '../../../shared/types';
import type { StalenessReport } from '../../../shared/staleness';

/** Pone al día una trama ya escrita. Modifica `plot` en el sitio. */
export type Ampliacion = (
  game: GameSession,
  plot: Plot,
  informe: StalenessReport,
  emit: (evento: GenerateStreamEvent) => void,
) => Promise<void>;

/** Anclado al ámbito global, como los demás registros y por lo mismo. */
const LLAVE = Symbol.for('gamemasters.juegos.ampliaciones');
const global_ = globalThis as unknown as Record<symbol, Record<string, Ampliacion>>;
const AMPLIACIONES: Record<JuegoId, Ampliacion> = global_[LLAVE] ?? (global_[LLAVE] = {});

/** Da de alta quién pone al día la trama de un juego. */
export function registrarAmpliacion(juego: JuegoId, ampliacion: Ampliacion): void {
  AMPLIACIONES[juego] = ampliacion;
}

/**
 * Quién amplía este juego, si alguien.
 *
 * Un juego sin ampliación registrada NO recibe la de otro: se salta esa etapa.
 * Es lo correcto y además es lo seguro — recibir la de otro juego era el fallo.
 */
export function ampliacionDe(juego: JuegoId | undefined): Ampliacion | undefined {
  return AMPLIACIONES[juego ?? ''];
}

/** Los juegos con ampliación dada de alta. Lo usa la comprobación. */
export function juegosConAmpliacion(): string[] {
  return Object.keys(AMPLIACIONES);
}
