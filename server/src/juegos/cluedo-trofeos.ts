/**
 * Los trofeos de CLUEDO, que hasta ahora se repartían a todo el mundo.
 *
 * ═══ QUÉ ESTABA PASANDO ═══
 *
 * `live/cuentas.ts` concedía SEIS trofeos con sus ids escritos a mano, en código
 * de plataforma que corre para cualquier partida. Tres de los seis son reglas de
 * CLUEDO, y en los otros juegos no solo sobraban: mentían.
 *
 * El caso que lo retrata es «Crimen perfecto», cuyo texto dice literalmente
 * «Fuiste el culpable y nadie te descubrió». Se concedía con
 * `eraCulpable && !sesion.primeroEnAcertar`, y en El Misterio de la Momia `winnerId` solo
 * se escribe si alguien SEÑALA al saqueador. Así que en una noche en la que la
 * expedición sella la tumba en el orden bueno —o sea, en la que el saqueador
 * PIERDE— si además nadie llegó a señalarlo, el saqueador se llevaba la medalla
 * de haberse salido con la suya. Premiar al que perdió, y con la frase de otro
 * juego.
 *
 * Los otros dos son más suaves y igual de ajenos: «Quien lo resolvió» se concede
 * por `winnerId`, que en un juego de bandos no significa ganar; y «Sabueso»
 * —«acertaste la combinación completa»— se concedía por acertar UN eje cuando el
 * juego tiene uno solo.
 *
 * ═══ POR QUÉ NO SE HABÍA HECHO ANTES ═══
 *
 * La cabecera de `trofeos.ts` lo dejó escrito: mover los de CLUEDO «habría
 * cambiado el comportamiento del único juego que hay en producción a cambio de
 * nada esta noche». Ya no es a cambio de nada: hay tres juegos y dos de ellos
 * reparten medallas que no son suyas.
 *
 * ═══ CLUEDO NO CAMBIA ═══
 *
 * Las tres condiciones son las mismas, carácter a carácter, y se evalúan en el
 * mismo sitio del cierre; lo único que cambia es quién las evalúa. Lo que se
 * gana es que ahora hay que ser CLUEDO para recibirlas.
 *
 * En `cuentas.ts` se quedan los tres que sí son de la plataforma y significan lo
 * mismo en cualquier juego: haber jugado la primera partida, haber escrito mucho
 * en el cuaderno y seguir con el móvil encendido al cerrar.
 */
import { registrarTrofeos } from './trofeos';
import type { TrofeoId } from '../../../shared/live';

registrarTrofeos('cluedo', ({ sesion, gano, acerto, eraSenalado }) => {
  const suyos: TrofeoId[] = [];

  /** Quien lo resolvió: fue el primero en dar con la combinación correcta. */
  if (gano) suyos.push('ganador');

  /*
   * Sabueso: acertó, y su acusación es la primera que entregó —siempre lo es,
   * porque solo se admite una— con los tres campos a la vez.
   */
  if (acerto) suyos.push('sabueso');

  /*
   * Crimen perfecto: fuiste el culpable y NADIE te descubrió.
   *
   * Se mira `sesion.primeroEnAcertar` y no `gano`: la pregunta no es si ganó esta
   * persona, es si ganó ALGUIEN. Mientras el sobre siga sin abrirse por nadie,
   * el culpable se sale con la suya.
   */
  if (eraSenalado && !sesion.primeroEnAcertar) suyos.push('culpable-impune');

  return suyos;
});
