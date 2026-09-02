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
/*
 * De `tipos.ts` y no del índice de `shared/arcade`, igual que hace
 * `escritorio/src/muebles.ts`: la lista no se reexporta desde el índice, y el
 * índice es núcleo SELLADO —tocarlo para añadir una reexportación pondría rojo
 * `verify:nucleo-quieto` por una comodidad.
 */
import { MUEBLES_DEL_CONTRATO } from '../../../shared/arcade/tipos';
import type { ArcadeId, ManifiestoDeArcade, MuebleDeArcade } from '../../../shared/arcade';
import { EL_ARCADE, FRENTE, PEONZA, RIBERAS } from '../../../shared/arcade/juegos';
import type { LoQuePintaEsteBinario } from './del-servidor';
import { ElArcade } from './arcade';
import { LaPeonza } from './escena';
import { LaFrente } from './frente';
import { MUEBLES } from './muebles';
import { ElTableroEnLinea } from './tablero-en-linea';

/**
 * QUÉ ARCADES DEL BINARIO TIENEN PANTALLA PROPIA. NO SON TODOS, Y ESO ES LO NUEVO.
 *
 * Cuatro filas para cinco arcades instalados, y la resta es la noticia: «La Ronda»
 * viene dentro —`shared/arcade/juegos/index.ts` la da de alta— y NO tiene fila
 * aquí. La pinta `LOS_MUEBLES_GENERICOS`, por el mismo camino exacto que recorre un
 * arcade que no está en el binario.
 *
 * ═══ ESTE BLOQUE DECÍA «SIGUE HABIENDO UNA TABLA POR JUEGO, QUE ES UNA DEUDA» ═══
 *
 * Se escribió en la fase 4 y describía la Sala de aquel día. Sus tres afirmaciones
 * son hoy falsas, y hay que decir cuáles para que nadie las vuelva a escribir:
 *
 *   · «`opciones()` … llega con Riberas en la fase 4». Riberas la escribió, sí,
 *     pero DENTRO de su fichero: la llamaban su propio reductor y su propio
 *     tablero, y el alta no tenía hueco para ella. No por descuido — abrirlo habría
 *     sido tocar `shared/arcade/`, o sea falsear la única medida que la fase 4
 *     existía para tomar, que un juego rico cabe con el diff del núcleo vacío. El
 *     hueco es de la fase 5: `opciones?: Opciones<V>` en `instalarArcade`, que es
 *     lo que permite preguntarle a un arcade QUE NO SE CONOCE qué se puede hacer.
 *     El porqué entero está en `shared/arcade/opciones.ts`.
 *   · «con dos juegos y los dos de fiesta». Son cinco —La Frente, La Ronda, El
 *     Arcade, Riberas y La Peonza— y entre ellos cubren los cuatro muebles del
 *     contrato.
 *   · «escribirla hoy … la dejaría con la forma de La Frente». Para `tablero` ya
 *     está escrita y no salió con la forma de nadie: el mismo componente pinta
 *     Riberas, pinta La Ronda y pinta un arcade que este binario no conoce. A qué
 *     precio se compró eso está abajo, y no se repite aquí.
 *
 * ═══ TENER FILA AQUÍ NO ES LA DEUDA. LO QUE FALTA DEBAJO, SÍ ═══
 *
 * Una pantalla propia sobre un mueble genérico es legítima, y `quienPinta` la
 * protege a propósito: La Frente es de `formulario` y quiere la suya, no que la
 * plataforma le pinte encima. Lo que falta es lo de DEBAJO — para `formulario` no
 * hay nada. Si La Frente no estuviera en esta tabla no se pintaría, y un arcade de
 * fuera que declare ese mueble sale hoy con la tarjeta apagada aunque el mueble
 * esté entregado y la app sepa pintarlo.
 *
 * Qué le falta a `formulario` para tener pintor genérico —y por qué escribirlo con
 * un solo inquilino sería peor que no tenerlo— está razonado abajo, en
 * `LOS_MUEBLES_GENERICOS`. Ahí, y una sola vez.
 *
 * ═══ Y PARA `lienzo` Y `escena` ESTA TABLA NO ES DEUDA DE NINGUNA CLASE ═══
 *
 * Es la decisión de producto más cara del diseño, escrita en su §7. Un juego que
 * quiere sus propios píxeles está en el binario, y el enchufe de la fase 5 alcanza
 * a las reglas y no a los píxeles. Un arcade de fuera con esos muebles no se puede
 * pintar, y eso no es un fallo que arreglar: es lo que se decidió, y lo que se
 * ahorra es escribir un intérprete de escenas que saldría a medida del primer juego
 * que lo usara.
 */
export const LOS_QUE_PINTA: Record<ArcadeId, ComponentType> = {
  [FRENTE]: LaFrente,
  [EL_ARCADE]: ElArcade,
  /*
   * RIBERAS SIGUE AQUÍ, Y AHORA ES UN ATAJO Y NO UNA CONDICIÓN.
   *
   * `ElTableroEnLinea` no sabe que es Riberas: lee el arcade de la ruta, se sienta
   * a una mesa, saca el tablero declarado de la vista y lo pinta. Esta línea decía
   * «Riberas está entre los que este binario deja jugar», y esa segunda mitad de
   * la pregunta ya no la hace `seSabePintar` para los muebles genéricos — ver
   * `LOS_MUEBLES_GENERICOS`, que es lo que la fase 5 vino a desbloquear.
   *
   * Se deja escrita porque sigue siendo verdad y porque es la que decide para los
   * juegos de mueble PROPIO, y borrarla obligaría a que `PintarEnElMueble`
   * resolviera dos tablas en distinto orden según el mueble.
   */
  [RIBERAS]: ElTableroEnLinea,
  /*
   * LA PEONZA, que es la puerta del mueble `escena` de la fase 5 y no un
   * juego-prueba. Va aquí y no en `LOS_MUEBLES_GENERICOS` porque `escena` es un
   * mueble PROPIO: el juego pinta sus píxeles, está en el binario y cuesta
   * publicación. Un arcade de fuera que declare `escena` sigue con la tarjeta
   * apagada, y eso es la decisión de producto del §7 y no un fallo.
   */
  [PEONZA]: LaPeonza,
};

/**
 * QUÉ PINTA CADA MUEBLE GENÉRICO CUANDO EL JUEGO NO ESTÁ EN EL BINARIO.
 *
 * ═══ ESTA TABLA ES LA DEUDA QUE LA FASE 5 EXISTE PARA PAGAR ═══
 *
 * El §7 dice que los muebles genéricos «son los únicos que un arcade de FUERA
 * puede usar». Y hasta hoy la app decía lo contrario sin querer: `seSabePintar`
 * exigía UNA ENTRADA POR JUEGO en `LOS_QUE_PINTA`, así que un arcade de tablero
 * instalado en el servidor pero desconocido para el binario salía en la Sala con
 * la tarjeta apagada aunque su mueble se supiera pintar perfectamente. Estaba
 * anotado como deuda con dirección desde la fase 4 —«ese día llegará con el
 * enchufe de la fase 5, y entonces la pregunta será otra»— y ésta es la pregunta
 * nueva.
 *
 * ═══ POR QUÉ SÓLO `tablero`, Y POR QUÉ ESO NO ES ESTAR A MEDIAS ═══
 *
 * Porque un mueble genérico de verdad tiene que poder pintar un juego que no
 * conoce, y sólo hay uno que hoy pueda: `tablero` recibe el dibujo YA RESUELTO
 * dentro de la vista (`tablero-declarado.ts`), así que no necesita saber nada.
 *
 * Y desde que `mesas.ts` le pregunta al registro qué se puede hacer, `tablero`
 * pinta además al juego que NO se resuelve el dibujo: la mesa trae `opciones` y
 * `ElTableroEnLinea` saca de ahí un botón por opción. Ése es el arcade de fuera
 * que el §7 promete y que hasta esa corrección se quedaba con la pantalla vacía.
 *
 * `formulario` todavía no puede. Con `opciones()` en el alta —lo otro que trae
 * esta fase— ya tiene de dónde sacar los botones, y le sigue faltando qué pintar
 * ENCIMA de los botones: un juego de formulario enseña un cronómetro, o unas
 * cartas, o un marcador, y eso hoy no viaja declarado. Escribir ese vocabulario
 * con un solo inquilino lo dejaría con la forma de ese inquilino, que es el error
 * que este motor entero existe para no repetir. Se queda fuera a sabiendas y con
 * el motivo escrito, que es distinto de quedarse fuera por descuido.
 *
 * `Partial` y no `Record` completo a propósito: obligar a rellenar los cuatro
 * forzaría a inventar dos pantallas para que compile, que es exactamente cómo
 * nace un mueble genérico a medida de nadie.
 */
export const LOS_MUEBLES_GENERICOS: Partial<Record<MuebleDeArcade, ComponentType>> = {
  tablero: ElTableroEnLinea,
  /*
   * ═══ Y `formulario`, QUE ESTABA FUERA CON UNA RAZÓN YA CADUCADA ═══
   *
   * Aquí ponía que un formulario se queda fuera porque «le falta qué pintar ENCIMA
   * de los botones» —un cronómetro, unas cartas, un marcador— y que escribir ese
   * vocabulario con un solo inquilino lo dejaría con su forma. El argumento sigue
   * siendo bueno PARA EL VOCABULARIO, y sigue sin escribirse. Lo que no era bueno
   * es la consecuencia: el cliente de escritorio SÍ pinta un formulario genérico
   * —un botón por opción y nada más—, así que un arcade de FUERA con
   * `mueble: 'formulario'` se podía jugar en el PC y no en el móvil.
   *
   * Eso rompe la regla que manda en esta casa: ningún juego se juega sólo desde
   * un PC. Y el pincel ya estaba escrito: la rama de `ElTableroEnLinea` para una
   * vista SIN tablero pinta el código, los asientos, de quién es el turno, la
   * crónica y un botón por opción —o sea, más de lo que pinta el del escritorio—.
   * Faltaba darlo de alta, que es esta línea.
   */
  formulario: ElTableroEnLinea,
};

/**
 * LO QUE ESTE BINARIO SABE PINTAR, dicho como tres listas de cadenas.
 *
 * ═══ POR QUÉ ESTO EXISTE Y NO SE PREGUNTA A LAS TABLAS DIRECTAMENTE ═══
 *
 * Porque quien tiene que hacer el juicio —`arcade/del-servidor.ts`— no puede
 * importar este fichero: aquí dentro hay componentes de React Native y de Skia, y
 * ese juicio tiene nueve ramas que sólo se compran EJECUTÁNDOLAS desde un
 * comprobador de Node. Así que el conocimiento sale de aquí, que es donde vive, y
 * viaja como dato.
 *
 * Se derivan de las tablas con `Object.keys` y no se escriben a mano, que es la
 * diferencia entre una lista que se queda vieja y una que no puede: el día que
 * entre un mueble genérico nuevo, entra en `LOS_MUEBLES_GENERICOS` y aparece aquí
 * solo.
 *
 * Y son cadenas y no los tipos cerrados a propósito: lo que se va a contrastar
 * con esto viene POR LA RED, donde una unión cerrada no protege de nada.
 */
export const LO_QUE_PINTA_ESTE_BINARIO: LoQuePintaEsteBinario = {
  juegos: Object.keys(LOS_QUE_PINTA),
  muebles: MUEBLES_DEL_CONTRATO.filter((m) => MUEBLES[m].seSabePintar),
  genericosDelContrato: MUEBLES_DEL_CONTRATO.filter((m) => MUEBLES[m].quienPinta === 'la-plataforma'),
  genericos: Object.keys(LOS_MUEBLES_GENERICOS),
};

/**
 * ¿SABE ESTA APP PINTAR ESTE ARCADE? La única pregunta que vale.
 *
 * Son dos condiciones y hacen falta las dos:
 *
 *   · Que la app sepa pintar SU MUEBLE. Sin esto, alguien podría dar de alta un
 *     componente para un juego cuyo mueble todavía enseña la pantalla de
 *     «pendiente» —porque la ruta se calcula desde el mueble, no desde el juego— y
 *     la tarjeta mentiría al revés.
 *   · Y que haya CON QUÉ: o un componente propio para ese juego, o un mueble
 *     genérico capaz de pintar un juego que no conoce.
 *
 * ═══ LA SEGUNDA MITAD CAMBIÓ EN LA FASE 5, Y ES UN CAMBIO DE PRODUCTO ═══
 *
 * Antes decía «que el binario tenga un componente para ESE JUEGO», y con eso un
 * arcade de fuera no era jugable ni usando un mueble genérico — lo cual convertía
 * el enchufe del servidor en una capacidad que nadie podía ver. Ahora un arcade
 * desconocido con `mueble: 'tablero'` es pulsable, y lo que se pinta al tocarlo es
 * lo que su propia proyección manda.
 *
 * Lo que NO cambia es la regla de la portada: nada de lo que se enseña es mentira.
 * Un arcade con mueble `lienzo` que no esté en el binario sigue con la tarjeta
 * apagada, porque de verdad no hay con qué pintarlo — y eso no es un fallo que
 * arreglar, es la decisión de producto más cara del §7: el enchufe alcanza a las
 * reglas, no a los píxeles.
 */
export function seSabePintar(manifiesto: ManifiestoDeArcade): boolean {
  if (!MUEBLES[manifiesto.mueble].seSabePintar) return false;
  return quienPinta(manifiesto) !== undefined;
}

/**
 * CON QUÉ SE PINTA ESTE ARCADE, o nada.
 *
 * El componente propio gana al genérico, y ese orden importa: `lienzo` no tiene
 * genérico y nunca lo tendrá, y un juego de dentro que quiera su propia pantalla
 * sobre un mueble genérico —La Frente, que es de formulario— tiene que poder
 * tenerla sin que la plataforma le pinte encima.
 *
 * Vive aquí y no dentro de la pantalla por lo de siempre: si la Sala decidiera con
 * una tabla y la pantalla con otra, las dos respuestas dejarían de coincidir en
 * cuanto entrara el segundo inquilino. Ya pasó una vez y está contado arriba.
 */
export function quienPinta(manifiesto: ManifiestoDeArcade): ComponentType | undefined {
  return LOS_QUE_PINTA[manifiesto.id] ?? LOS_MUEBLES_GENERICOS[manifiesto.mueble];
}

/**
 * CON QUÉ SE PINTA UN ARCADE DEL QUE ESTE BINARIO NO SABE NADA.
 *
 * ═══ POR QUÉ HACE FALTA UNA SEGUNDA PUERTA, Y NO ES LA DOBLE TABLA ═══
 *
 * Un arcade instalado SÓLO EN EL SERVIDOR no tiene manifiesto aquí: el registro de
 * la app se llena importando `shared/arcade/juegos`, o sea los cinco que vienen
 * dentro. `quienPinta` pide un manifiesto y por tanto no puede contestar por él —y
 * ése es justo el arcade que el §7 promete que un mueble genérico puede pintar.
 *
 * Se midió en pantalla y era peor de lo que parecía: `PintarEnElMueble` cortaba
 * antes con «no hay ningún arcade llamado … instalado en esta app», así que
 * `LOS_MUEBLES_GENERICOS` —lo que la fase 5 añadió para esto— no lo alcanzaba
 * nadie. La tabla existía y no la recorría ningún camino.
 *
 * No es una segunda tabla: es LA MISMA, preguntada por lo único que se sabe cuando
 * no hay manifiesto, que es el mueble de la ruta. Si mañana entra un segundo
 * mueble genérico, entra en un sitio y lo ven las dos puertas.
 *
 * Lo que sigue faltando, y no se arregla aquí: la SALA no lista estos arcades,
 * porque `minijuegos()` se compone del registro local. Hoy se llega a uno de fuera
 * por enlace directo. Cerrarlo bien exige que la portada lea el catálogo del
 * servidor —`GET /api/arcade`— y eso es una pantalla asíncrona con su modo sin red,
 * que es otra cosa y más grande.
 */
export function quienPintaElMueble(mueble: MuebleDeArcade): ComponentType | undefined {
  return LOS_MUEBLES_GENERICOS[mueble];
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
