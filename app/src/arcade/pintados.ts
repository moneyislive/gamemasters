/**
 * QUÉ ARCADES SABE PINTAR ESTE BINARIO. UNA TABLA, Y LA LEEN LOS DOS.
 *
 * ═══ EL ESCAPARATE ESTABA MINTIENDO, Y ASÍ ═══
 *
 * `app/src/vitrina.ts` decidía si la tarjeta de un arcade era pulsable mirando
 * `MUEBLES[m.mueble].seSabePintar`, o sea SI LA APP SABE PINTAR ESE MUEBLE. Y la
 * pantalla del mueble decidía otra cosa: si sabe pintar ESE JUEGO, mirando su
 * propia tabla `LOS_QUE_PINTA` dentro de `app/app/(arcade)/formulario.tsx`.
 *
 * Dos tablas, dos criterios, y en cuanto entró el segundo arcade de formulario
 * dejaron de coincidir: «La Ronda» declara `mueble: 'formulario'` —que sí se sabe
 * pintar— así que salía en la Sala con tarjeta pulsable, y al tocarla aparecía
 * «esta app todavía no sabe pintarlo». La portada tiene doctrina escrita contra
 * eso en su propia cabecera —«nada de lo que se enseña es mentira… no se rellena
 * con cajas muertas»— y la estaba incumpliendo.
 *
 * Lo interesante es que ninguna de las dos tablas estaba mal: estaban contestando
 * a preguntas distintas y las dos son necesarias. Lo que faltaba era la pregunta
 * de verdad, que es la conjunción, escrita UNA vez y leída por los dos sitios.
 *
 * ═══ POR QUÉ ESTE FICHERO Y NO `muebles.ts`, QUE ERA EL SITIO NATURAL ═══
 *
 * Porque `muebles.ts` exporta `SALA` —los colores— y lo importan todas las
 * pantallas de arcade, incluidas las que pintan los juegos. Meter aquí la tabla de
 * componentes obligaría a `muebles.ts` a importar `frente.tsx` y `arcade.tsx`, que
 * a su vez importan `SALA` de `muebles.ts`: un ciclo.
 *
 * Y no un ciclo teórico. Los `StyleSheet.create` de esas pantallas se evalúan AL
 * CARGARSE EL MÓDULO, así que verían `SALA` a medio inicializar —`undefined`— y la
 * app se caería al importar, antes de la primera pantalla, con un error que no
 * nombra ni a `SALA` ni a `muebles.ts`. Es el mismo filo que `verify:app` vigila
 * con su comprobación de «ninguna tabla de módulo nombra algo declarado más
 * abajo», solo que entre ficheros.
 *
 * Con la tabla aquí, las flechas van todas en la misma dirección: esto importa
 * `muebles.ts` y las pantallas, y nadie importa esto salvo quien decide.
 */
import type { ComponentType } from 'react';
import type { ArcadeId, ManifiestoDeArcade } from '../../../shared/arcade';
import { EL_ARCADE, FRENTE } from '../../../shared/arcade/juegos';
import { ElArcade } from './arcade';
import { LaFrente } from './frente';
import { MUEBLES } from './muebles';

/**
 * QUÉ COMPONENTE PINTA CADA ARCADE QUE TRAE ESTE BINARIO.
 *
 * ═══ POR QUÉ SIGUE HABIENDO UNA TABLA POR JUEGO, QUE ES UNA DEUDA ═══
 *
 * Un mueble genérico de verdad —`formulario`, `tablero`— tendría que preguntarle
 * al juego qué se puede hacer ahora mismo y pintar eso sin saber a qué se juega.
 * Esa función existe en el diseño, se llama `opciones()`, y llega con Riberas en
 * la fase 4. Escribirla hoy, con dos juegos y los dos de fiesta, la dejaría con la
 * forma de La Frente — el error que este motor entero existe para no repetir.
 *
 * `lienzo` es otra cosa y ahí la tabla NO es deuda: es la decisión de producto más
 * cara del diseño, escrita en su §7. Un juego que quiere sus propios píxeles está
 * en el binario, y el enchufe de la fase 5 alcanza a las reglas y no a los
 * píxeles. Un arcade de fuera con mueble `lienzo` no se puede pintar, y eso no es
 * un fallo que arreglar: es lo que se decidió, y lo que se ahorra es escribir un
 * intérprete de escenas que saldría a medida del primer juego que lo usara.
 */
export const LOS_QUE_PINTA: Record<ArcadeId, ComponentType> = {
  [FRENTE]: LaFrente,
  [EL_ARCADE]: ElArcade,
};

/**
 * ¿SABE ESTA APP PINTAR ESTE ARCADE? La única pregunta que vale.
 *
 * Son las dos condiciones y hacen falta las dos, aunque hoy una implique casi
 * siempre la otra:
 *
 *   · Que el binario tenga un componente para ESE JUEGO. Es lo que faltaba en la
 *     portada y lo que hacía pulsable una tarjeta que no llevaba a ninguna parte.
 *   · Que la app sepa pintar SU MUEBLE. Sin esto, alguien podría dar de alta un
 *     componente para un juego cuyo mueble todavía enseña la pantalla de
 *     «pendiente» —porque la ruta se calcula desde el mueble, no desde el juego— y
 *     la tarjeta volvería a mentir, esta vez al revés.
 *
 * Que las dos se pregunten AQUÍ es lo que impide que vuelvan a separarse: quien
 * decida algo sobre si un arcade se puede jugar llama a esto, y no hay una segunda
 * respuesta en ningún otro fichero.
 */
export function seSabePintar(manifiesto: ManifiestoDeArcade): boolean {
  return LOS_QUE_PINTA[manifiesto.id] !== undefined && MUEBLES[manifiesto.mueble].seSabePintar;
}

/*
 * ═══ Y AQUÍ NO HAY UNA FUNCIÓN «LOS QUE FALTAN» PARA UN COMPROBADOR ═══
 *
 * Se escribió y se quitó, y conviene decir por qué: un comprobador de Node no
 * puede llamar a nada de este fichero, porque la tabla de arriba trae dentro
 * componentes de React Native y de Skia. Habría quedado una función exportada con
 * un comentario diciendo que la usa `verify:app` — y no la usaría nadie.
 *
 * Lo que sí se puede comprobar desde fuera es que NADIE CONTESTE ESTA PREGUNTA POR
 * SU CUENTA, y eso lo hace `verify` de la app leyendo el código: que `vitrina.ts`
 * y las pantallas de mueble saquen la respuesta de aquí y no de
 * `MUEBLES[…].seSabePintar`, que es lo que hacían cuando el escaparate mentía.
 */
