/**
 * LOS ARCADES QUE TRAE ESTE BINARIO. Un fichero, un alta por juego.
 *
 * ═══ POR QUÉ EL ALTA NO VA DENTRO DE `frente.ts` ═══
 *
 * Porque un fichero de reglas que se da de alta a sí mismo al cargarse no se
 * puede leer sin instalarlo. Un comprobador que quiera examinar el manifiesto de
 * La Frente sin meterlo en el registro del proceso —o que quiera montar dos
 * repartos distintos en la misma ejecución, que es lo que hace `verify:reparto`
 * en el otro motor— tendría que soportar el efecto secundario de la importación.
 *
 * Es exactamente el reparto que ya hace `shared/juegos/index.ts`: `cluedo.ts`
 * declara y este fichero da de alta. Aquí además hace falta por una razón que
 * allí no existía: `shared/arcade/index.ts` es NÚCLEO y no se toca, así que las
 * altas no pueden vivir dentro de él. Este fichero es el sitio, y el `juegos/`
 * del árbol lo dice: las reglas del motor arriba, los juegos en su carpeta.
 *
 * ═══ IMPORTARLO TIENE EFECTO. Y ESO ES A PROPÓSITO ═══
 *
 * `import '../arcade/juegos'` instala. Es el mismo trato que el otro motor y por
 * el mismo motivo: quien quiera la Sala de Arcade llena importa esto una vez —lo
 * hace `app/src/vitrina.ts`— y no hay una lista escrita a mano en otro sitio que
 * se quede vieja el día que entre el segundo juego.
 *
 * ═══ REEXPORTADO UNO A UNO, NO CON `export *` ═══
 *
 * Por la cautela que la cabecera de `shared/arcade/index.ts` explica entera: con
 * la estrella, `tsx` dejó fuera funciones en tiempo de EJECUCIÓN mientras el
 * compilador las daba por buenas, y el servidor reventó al arrancar con «does not
 * provide an export named …». Cuesta una línea por nombre y se paga una vez.
 */
import { instalarArcade } from '../index';
import {
  avanzarLaFrente,
  loSecretoDeLaFrente,
  MANIFIESTO_FRENTE,
  proyectarLaFrente,
} from './frente';

export {
  ACIERTO,
  avanzarLaFrente,
  BARAJA,
  EMPEZAR,
  FRENTE,
  loSecretoDeLaFrente,
  MANIFIESTO_FRENTE,
  OTRA_RONDA,
  partidaNueva,
  PASO,
  proyectarLaFrente,
  segundosQueQuedan,
  SEGUNDOS_DE_RONDA,
  SEGUNDOS_PARA_COLOCARSE,
  TICK_HZ,
  TICS_DE_RONDA,
  TICS_PARA_COLOCARSE,
} from './frente';
export type {
  EstadoDeLaFrente,
  MomentoDeLaFrente,
  VistaDeLaFrente,
  VistaDeLaSala,
  VistaDeQuienLoLleva,
} from './frente';

/**
 * EL ALTA. Manifiesto, reductor, proyección y `loSecreto` por la misma puerta.
 *
 * Las cuatro juntas y no en cuatro llamadas: `instalarArcade` está escrito así
 * para que no exista el estado intermedio de un juego declarado del que no se
 * sabe jugar, o —peor aquí— de un juego con `secretos: true` instalado sin nada
 * que tape. Con `secretos: true` y sin estas dos funciones, `exigirSecretosTapados()`
 * no dejaría arrancar al servidor, que es exactamente lo que tiene que pasar.
 */
instalarArcade({
  manifiesto: MANIFIESTO_FRENTE,
  avanzar: avanzarLaFrente,
  proyeccion: proyectarLaFrente,
  loSecreto: loSecretoDeLaFrente,
});
