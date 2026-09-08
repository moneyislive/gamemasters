/**
 * `opciones()`: QUÉ TE PUEDO OFRECER A TI, CON LO QUE TÚ SABES.
 *
 * ═══ POR QUÉ ESTE FICHERO APARECE EN LA FASE 5 Y NO ANTES ═══
 *
 * El concepto está en el §5 bis del diseño desde el principio y el núcleo no
 * tenía hueco para él: `instalarArcade` admitía manifiesto, reductor, proyección
 * y `loSecreto`, y nada más. Riberas —la fase 4— lo resolvió por dentro, con la
 * función exportada de su propio fichero y llamada desde su propio reductor y su
 * propio tablero, y la cabecera de aquel juego dejó escrito por qué: añadirle un
 * hueco al alta habría sido tocar `shared/arcade/`, o sea falsear la única
 * medida que la fase 4 existía para tomar —que un juego rico cabe con el diff
 * del núcleo VACÍO—.
 *
 * Esa medida ya está tomada y publicada. Lo que quedaba era una consecuencia
 * fea y muy concreta: **un arcade de FUERA del binario no podía tener opciones
 * genéricas**. Un juego de dentro puede llamarse a sí mismo desde sus dos
 * clientes porque los dos están en su fichero; uno de fuera no tiene forma de
 * decirle a la plataforma «pregúntame qué se puede hacer», y por tanto el mueble
 * genérico no puede pintarle una lista de botones. El §7 dice que los muebles
 * genéricos «son los únicos que un arcade de FUERA puede usar»; sin este hueco
 * esa frase significaba «los únicos que puede usar para pintar un dibujo que él
 * mismo haya resuelto entero», que es bastante menos.
 *
 * ═══ LA FIRMA: RECIBE LA VISTA, JAMÁS EL ESTADO ═══
 *
 * Está copiada del §5 bis y no se negocia. Con el estado, `opciones()` sería UNA
 * SEGUNDA PROYECCIÓN con su propio tapado: escrita dos veces, probada la mitad, y
 * `verify:mesa` no la mira. Recibiendo la vista NO PUEDE ofrecer nada que la
 * proyección no hubiera dejado pasar — imposible por construcción y no por
 * disciplina, que es la única forma de garantía que este motor acepta.
 *
 * ═══ LA REGLA: «SÓLO SI», NUNCA «SI Y SÓLO SI» ═══
 *
 * El reductor **rechaza lo que `opciones()` no ofreció, y sigue validando lo que
 * sí**. El bicondicional es falso en cuanto existe información oculta a quien
 * actúa, y el contraejemplo vive dentro de Riberas: aceptar un trueque exige que
 * el OFERENTE tenga la mercancía, y su almacén no está en la vista del aceptante.
 *
 * La factura de esa regla es lo que paga `Rechazo` en `motor.ts`: con el «sólo
 * si», el rechazo silencioso pasa a ser el camino normal, y hasta hoy la app sólo
 * podía decir «la mesa está igual que estaba». Los dos ficheros se leen juntos.
 *
 * ═══ POR QUÉ AQUÍ Y NO EN `mecanicas/` ═══
 *
 * Porque el alta lo registra y el registro es núcleo. `mecanicas/` es código que
 * sirve a varios juegos y que la plataforma no conoce; esto la plataforma lo
 * conoce por definición, porque es ella quien lo llama para pintar un mueble
 * genérico. Un tipo que el registro usa en su firma no puede vivir fuera del
 * registro sin que el núcleo acabe importando de una carpeta que no controla.
 */
import type { QuienMira } from './tipos';

/**
 * UNA COSA QUE SE PUEDE HACER AHORA MISMO.
 *
 * `carga` es la carga EXACTA del movimiento, ya montada. Que la opción traiga el
 * movimiento entero y no «el vértice tal» es lo que mantiene MUDO al mueble: la
 * pantalla manda lo que la opción lleva dentro y no traduce nada, y por tanto no
 * hay código por juego dentro de la pantalla. Es la misma decisión que ya toma
 * `MovimientoDeclarado` en el tablero declarado, y por el mismo motivo.
 */
export interface Opcion {
  /**
   * SEUDÓNIMO POR ASIENTO, y nunca un derivado del contenido oculto (§5 bis).
   *
   * Un id tiene que salir del vocabulario PÚBLICO —el tipo del movimiento, la
   * llave de un sitio del tablero, un número de orden—, jamás de una carta ni de
   * una ficha. `'pagar-con-b17:junco'` escondería un secreto dentro de un
   * identificador y `verify:mesa` NO lo cazaría: ese comprobador busca la forma
   * canónica CON COMILLAS, y esa cadena no contiene `"b17:junco"`. Un secreto
   * embebido en un id es invisible para el comprobador que existe para cazarlo.
   *
   * Y tiene que ser ESTABLE entre revisiones para ese observador. Sin eso,
   * cualquier superficie que reconcilie por identidad —una lista de React, un
   * mueble que anima— se desincroniza en cada reordenación.
   */
  id: string;
  /** El tipo del movimiento que manda elegirla. */
  tipo: string;
  /**
   * Su carga, ya montada. `unknown` por lo mismo que `Movimiento.carga`.
   *
   * SALVO cuando la opción trae `declaracion: true`, y entonces esto no es un
   * movimiento montado sino lo que el juego admitiría. El caso entero está contado
   * en la cabecera de `declaracion`, aquí abajo, y hoy hay UNO en todo el árbol.
   */
  carga: unknown;
  /**
   * ESTO NO ES UN MOVIMIENTO: ES UNA DECLARACIÓN DE LO QUE EL JUEGO ADMITIRÍA.
   *
   * ═══ QUÉ SIGNIFICA, Y QUÉ HAY QUE HACER CON ELLA ═══
   *
   * NO LA MANDES. Léela para construir el movimiento que sí se manda. Una opción con
   * esta marca lleva en `carga` los límites de una FAMILIA de movimientos —un tope,
   * una lista de destinos— y no una carga que el reductor pueda ejecutar. Mandada tal
   * cual, lo mejor que puede pasar es que el reductor conteste con un motivo.
   *
   * ═══ POR QUÉ EXISTE, QUE ES LO QUE JUSTIFICA ROMPER LA PROMESA DE `carga` ═══
   *
   * Un juego puede tener una familia de movimientos que NO CABE en una lista. El caso
   * que la estrena es el trueque de Riberas: con topes de tres bienes por lado y cinco
   * rivales, enumerar «cualquier montón por cualquier montón» son 5.000 opciones y
   * 1.141,9 kB de lista, y esa lista viaja entera a cada aparato en CADA lectura de la
   * mesa. Contra 54 opciones y 9,3 kB, que es la lista más larga que se ve hoy jugando.
   * La lista no puede ser la interfaz; la declaración es lo que la sustituye, y quien
   * valida el miembro concreto es el reductor mirando el estado.
   *
   * ═══ QUIÉN LA ESCRIBE Y QUIÉN LA LEE ═══
   *
   * La escribe el juego, en la opción de puerta, y hoy sólo lo hace Riberas.
   *
   * La leen, y son cuatro clases de lector:
   *  1. LOS MUEBLES GENÉRICOS QUE PINTAN OPCIONES. Una opción con esta marca NO SE
   *     PINTA como botón: pulsarla no jugaría nada.
   *  2. LOS FILTROS DEL PROPIO JUEGO, para no depender de que cada mueble se acuerde.
   *  3. QUIEN BUSCA LA PUERTA, que la encuentra POR LA MARCA y nunca por su `id`: un
   *     convenio en el `id` lo conoce quien lo escribió y nadie más, y este tipo
   *     existe justamente para los arcades que esta casa no escribe.
   *  4. QUIEN JUEGA A CIEGAS eligiendo de `opciones()`, que la salta.
   *
   * ═══ QUIÉN NO LA LEE, A PROPÓSITO ═══
   *
   * El portillo que compara lo que se manda contra lo que se ofreció. Esa comparación
   * mira `{ tipo, carga }` y nada más: la marca es de la PANTALLA y no de la
   * legalidad, y meterla dentro cambiaría la firma de todas las opciones de todos los
   * juegos por una que sólo usa uno.
   *
   * ═══ QUÉ SE ROMPE SI ALGUIEN LA IGNORA ═══
   *
   * Un botón encendido que no juega. Pulsado, manda la declaración, recibe un motivo y
   * no pasa nada más. Es el mismo fallo que esta casa tiene medido en 2.834
   * movimientos: una pieza encendida que no responde. Y un jugador ciego que la ignore
   * gasta una de cada N elecciones en un movimiento que nunca avanza la partida.
   *
   * ═══ POR QUÉ OPCIONAL Y SÓLO `true` ═══
   *
   * Aditiva: una opción que no la trae se comporta exactamente como antes de que esto
   * existiera, y los juegos que no la escriben no se enteran. Y sin `false` posible,
   * porque un `declaracion: false` es una frase que alguien acaba leyendo al revés.
   */
  declaracion?: true;
  /**
   * Lo que se lee en el botón.
   *
   * ═══ AQUÍ EL COMPROBADOR DE SECRETOS NO LLEGA, Y HAY QUE SABERLO ═══
   *
   * `id` lleva arriba la advertencia de no meter contenido oculto dentro. Ésta es
   * la misma trampa y conviene decirla en su sitio, porque el rótulo la sortea
   * todavía más fácil: `verify:mesa` busca los valores de `loSecreto` en forma
   * CANÓNICA —`"espadas-10"`, con comillas— y un rótulo escrito para una persona
   * dice «As de bastos». Es la misma carta re-codificada, y no hay coincidencia
   * de texto que buscar.
   *
   * La diferencia con `id` es que aquí no se puede pedir otra cosa: un botón de
   * carta tiene que decir qué carta es. Así que la regla del rótulo no es
   * «no nombres lo oculto» sino que la defensa es ESTRUCTURAL y hay que
   * respetarla: `opciones()` recibe LA VISTA DE UN OBSERVADOR y sólo debe nombrar
   * lo que esa vista ya le manda a esa persona. Nombrar algo sacado de otro sitio
   * —de un campo que la proyección recorta para otros, de un cálculo sobre lo que
   * no se ve— es una fuga que NINGÚN comprobador de este árbol caza.
   *
   * Dicho para quien añada la opción de mañana: si tu rótulo menciona algo de
   * otra persona, no esperes que la batería te avise. No lo hará.
   */
  rotulo: string;
  /** Una línea que explica qué hace o por qué conviene. Vacía si sobra, y con la misma advertencia que `rotulo`. */
  ayuda: string;
}

/**
 * LO QUE ESCRIBE UN JUEGO PARA QUE UN MUEBLE GENÉRICO PUEDA PINTARLO.
 *
 * ═══ ES CLIENTE Y NO AUTORIDAD, Y ESO NO ES UN MATIZ ═══
 *
 * Que a quien no le toca no se le pinte el botón es una preocupación legítima, y
 * es la única que esta función cubre. NO decide nada: el reductor sigue validando
 * con todo lo que hay, y el árbitro sigue comprobando quién y cuándo. Si esto
 * fuera autoridad, el motor tendría que saber qué es un turno — que es el
 * descarte más importante del §11 y el que hace que media docena de conceptos
 * desaparezcan en vez de generalizarse.
 *
 * ═══ NO ES OBLIGATORIA, Y ESO TAMBIÉN ES DELIBERADO ═══
 *
 * Un juego de un solo aparato pinta su propia pantalla y no necesita que nadie le
 * pregunte nada; La Frente y El Arcade no la registran y no les falta. Exigirla a
 * todos sería ceremonia: una lista que nadie lee, escrita para que un comprobador
 * la encuentre.
 *
 * `V` es la forma de la vista de ESE juego. Quien la registra pasa su propia
 * función tipada y el registro la guarda como `Opciones<unknown>`, igual que hace
 * con el reductor y con la proyección: el registro no puede conocer la forma de
 * la vista de un juego que no conoce, y el juego sí la conoce y la lee tipada en
 * su fichero.
 */
export type Opciones<V = unknown> = (vista: V, quien: QuienMira) => readonly Opcion[];
