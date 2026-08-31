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
import { avanzarElArcade, MANIFIESTO_EL_ARCADE } from './arcade';
import type { EstadoDelArcade } from './arcade';
import {
  avanzarLaFrente,
  loSecretoDeLaFrente,
  MANIFIESTO_FRENTE,
  proyectarLaFrente,
} from './frente';
import {
  avanzarLaRonda,
  loSecretoDeLaRonda,
  MANIFIESTO_RONDA,
  proyectarLaRonda,
} from './ronda';
import type { EstadoDeLaRonda } from './ronda';

export {
  avanzarElArcade,
  CAIDA_LENTA,
  CAIDA_MEDIO,
  CAIDA_RAPIDA,
  CAMPO,
  EL_ARCADE,
  EMPEZAR as EMPEZAR_EL_ARCADE,
  intervaloCon,
  INTERVALO_INICIAL,
  INTERVALO_MINIMO,
  MANIFIESTO_EL_ARCADE,
  NAVE_MEDIO_ALTO,
  NAVE_MEDIO_ANCHO,
  NAVE_Y,
  OTRA as OTRA_PARTIDA,
  partidaNueva as partidaNuevaDelArcade,
  puntuacionDelArcade,
  RUMBO,
  seAcabo as seAcaboElArcade,
  TICK_HZ as TICK_HZ_DEL_ARCADE,
  TOPE_DE_CAIDAS,
  VELOCIDAD_NAVE,
} from './arcade';
export type { Caida, EstadoDelArcade, MomentoDelArcade, Rumbo } from './arcade';

export {
  arcadesConCifraSinPuntuacion,
  EstadoSinCifra,
  hayPuntuacion,
  puntuacionDe,
} from './puntuaciones';
export type { Puntuacion } from './puntuaciones';

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

export {
  avanzarLaRonda,
  BARAJA as BARAJA_DE_LA_RONDA,
  CARTAS_POR_MANO,
  EMPEZAR as EMPEZAR_LA_RONDA,
  JUGADORES,
  JUGAR,
  loSecretoDeLaRonda,
  MANIFIESTO_RONDA,
  partidaNueva as partidaNuevaDeLaRonda,
  proyectarLaRonda,
  RONDA,
  seAcabo as seAcaboLaRonda,
} from './ronda';
export type {
  Carta,
  CartaEnLaBaza,
  EstadoDeLaRonda,
  JugadorDeLaRonda,
  JugadorVisto,
  MomentoDeLaRonda,
  VistaDeLaRonda,
} from './ronda';

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

/**
 * «LA RONDA», el de la fase 2: la mesa en línea con mano oculta.
 *
 * ═══ POR QUÉ SU ESTADO SE INSTALA COMO `EstadoDeLaRonda | undefined` ═══
 *
 * Porque una mesa de arcade nace con `estado: undefined` —el árbitro lo
 * documenta como una forma legítima de empezar— y es el reductor quien construye
 * lo suyo en el primer movimiento, con la semilla y los asientos que le llegan en
 * el contexto. Eso es lo que hace que reejecutar el diario reparta exactamente
 * las mismas cartas.
 *
 * El parámetro se escribe a mano y no se deja inferir porque las tres funciones
 * lo usan en posiciones distintas —el reductor lo recibe y devuelve, la
 * proyección solo lo recibe— y con la inferencia el compilador escoge una de las
 * dos y las otras dos dejan de encajar.
 */
instalarArcade<EstadoDeLaRonda | undefined>({
  manifiesto: MANIFIESTO_RONDA,
  avanzar: avanzarLaRonda,
  proyeccion: proyectarLaRonda,
  loSecreto: loSecretoDeLaRonda,
});

/**
 * «EL ARCADE», el de la fase 3: sesenta fotogramas por segundo y una cifra.
 *
 * ═══ ENTRA CON DOS ALTAS Y NO CON CUATRO, Y ESO ES UNA NOTICIA ═══
 *
 * Ni proyección ni `loSecreto`: declara `secretos: false` porque sus secretos
 * serían secretos entre asientos y aquí solo hay un asiento —de hecho ninguno: un
 * aparato y quien lo sujeta—. Está razonado entero en la cabecera de `arcade.ts`.
 *
 * Lo que sí trae y no cabe por esta puerta es la PUNTUACIÓN: `instalarArcade` no
 * tiene hueco para ella, así que la cifra de un estado opaco se lee desde una
 * tabla de al lado (`./puntuaciones.ts`) en vez de venir con el alta. La cabecera
 * de ese fichero cuenta la grieta entera y qué habría que añadirle al núcleo para
 * cerrarla; aquí queda dicho que el alta de este juego está INCOMPLETA por una
 * limitación del contrato y no por descuido de quien la escribió.
 *
 * El parámetro se escribe a mano por lo mismo que en La Ronda: el reductor admite
 * `undefined` —una mesa nace sin estado, aunque este juego no tenga mesa— y con
 * la inferencia el compilador escoge una de las dos posiciones y la otra deja de
 * encajar.
 */
instalarArcade<EstadoDelArcade | undefined>({
  manifiesto: MANIFIESTO_EL_ARCADE,
  avanzar: avanzarElArcade,
});
