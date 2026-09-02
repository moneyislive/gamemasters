/**
 * UN TABLERO DICHO COMO DATO, para que el mueble no sepa a qué se juega.
 *
 * ═══ QUÉ PROBLEMA RESUELVE, Y POR QUÉ NO ES UN DETALLE DE PINTADO ═══
 *
 * El §7 del diseño dice que `tablero` es un mueble GENÉRICO —«los pinta la
 * plataforma, y son los únicos que un arcade de FUERA puede usar»— y que «el
 * tablero es dato, no reductor». La frase es corta y la trampa es grande: si la
 * pantalla del mueble supiera qué es un hexágono, qué es un asentamiento y qué es
 * una carretera, no sería un mueble genérico: sería la pantalla de Riberas con
 * otro nombre, y el segundo juego de tablero llegaría con un `if` dentro.
 *
 * Este fichero es la forma que evita eso. El juego proyecta, además de su vista,
 * UN TABLERO YA RESUELTO: polígonos con sus puntos, líneas con sus extremos,
 * nudos con su color, botones con su rótulo y paneles de texto. El mueble recorre
 * cuatro listas y pinta. No sabe qué pinta y no tiene por qué saberlo.
 *
 * ═══ POR QUÉ VIVE EN `mecanicas/` Y NO EN LA APP ═══
 *
 * Porque hacen falta los DOS lados y tienen que hablar del mismo tipo. Si la forma
 * viviera solo en `app/`, el juego —que está en `shared/`, porque `shared/` son
 * las reglas— no podría importarla y produciría un objeto «que ya se parecerá»,
 * comprobado por nadie. Ese hueco existe en el otro motor de esta casa:
 * `VistaJugador.estadoDelJuego` es `unknown`, y tiene un comprobador entero
 * (`verify:estado`) dedicado a vigilar que el servidor y la app sigan hablando del
 * mismo objeto. Aquí se paga un fichero de tipos y no hace falta ese comprobador.
 *
 * Y no sube al NÚCLEO del arcade —`shared/arcade/`— a propósito. El núcleo no
 * puede tener una opinión sobre cómo se pinta un tablero: en cuanto la tuviera,
 * saldría con la forma del primer juego que lo usara, que es exactamente el error
 * que todo este motor existe para no repetir. Es una mecánica: código que sirve a
 * varios juegos, que ninguno tiene la obligación de usar y que no sabe quién lo
 * usa.
 *
 * ═══ ESTE FICHERO NO ESTÁ EN EL §3 DEL DISEÑO, Y CONVIENE DECIRLO ═══
 *
 * El árbol de `mecanicas/` que dibuja el documento tiene tres inquilinos
 * previstos —`azar.ts`, `mazo.ts` y `malla-hexagonal.ts`— y éste no es ninguno.
 * Es una decisión que se toma aquí, en la fase 4, y la razón es que el documento
 * pide dos cosas que no encajan sin él: que `tablero` sea un mueble GENÉRICO
 * —«los únicos que un arcade de FUERA puede usar»— y que «el tablero es dato, no
 * reductor». Un arcade de fuera del binario no puede mandar código al móvil; si
 * la forma del dibujo no viajara declarada, «genérico» querría decir «genérico
 * para los juegos que ya están dentro».
 *
 * Cumple la definición de mecánica que este repositorio ya tenía escrita —código
 * que sirve a varios juegos, que ninguno tiene la obligación de usar y que no
 * sabe quién lo usa— y NO es núcleo: `shared/arcade/` no lo importa ni lo conoce,
 * y `verify:nucleo-quieto` lo deja fuera de lo que sella precisamente porque el
 * núcleo no puede tener una opinión sobre cómo se pinta un tablero.
 *
 * ═══ NI UN CAMPO OPCIONAL, Y ESO ES DELIBERADO ═══
 *
 * Todos los campos están siempre. Un `rotulo?: string` sería `undefined` cuando no
 * hay rótulo, y `canonico.ts` —que es con lo que `verify:mesa` compara lo que
 * viaja por el cable— RECHAZA `undefined`, porque `JSON.stringify` lo borra dentro
 * de un objeto y lo convierte en `null` dentro de una lista, de modo que la
 * ausencia y el nulo dejan de distinguirse. Donde no hay nada va la cadena vacía;
 * donde puede no haber movimiento va `null`, que sí sobrevive al viaje.
 */

import { canonico } from './canonico';

/** Un punto del plano, en las unidades que declare el propio tablero. */
export interface PuntoDeTablero {
  x: number;
  y: number;
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * AQUÍ VIVÍA EL RODEO PARA NOMBRAR A LA GENTE, Y LA FASE 5 LO BORRÓ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Había tres funciones —`huecoDeAsiento`, `conLosNombres` y
 * `tableroConLosNombres`— que resolvían un problema real: un juego con mesa
 * escribe textos sobre la gente («a fulano le toca», «mengano gana») y no sabía
 * cómo se llama nadie, porque `ContextoMovimiento.asientos` lleva identificadores
 * y la proyección sólo recibía un `QuienMira`. El aviso grande de la partida
 * decía «aJLFR7ZJ3 coloca una choza» mientras la barra de arriba decía «Ana ·
 * Bruno».
 *
 * La salida era escribir un hueco dentro de la propia cadena —`{asiento:aY9TK2MBJ}`—
 * y que el mueble lo sustituyera al pintar. Funcionaba, era genérico y estaba
 * razonado: su cabecera decía que la vía obvia —meter los nombres en el contrato—
 * era «exactamente lo que la fase 4 existe para NO hacer», porque el diff vacío
 * del núcleo era LA medida de aquella fase y comprarla con un parche la habría
 * falseado.
 *
 * Esa medida ya está tomada y publicada, así que el argumento caducó y quedó el
 * sitio correcto: **el contrato**. La proyección recibe ahora quién está sentado
 * y cómo se llama (`Proyeccion`, tercer argumento; `comoSeLlama` en `tipos.ts`),
 * y el juego escribe la frase ya legible. Lo que se gana al mover el arreglo:
 *
 *   · el juego deja de escribir un microlenguaje de plantillas dentro de sus
 *     propios textos, que era una segunda gramática que nadie validaba;
 *   · y CUALQUIER superficie que lea la vista —un aviso, un registro, una
 *     pantalla que aún no existe— ve el nombre. Con el hueco, sólo lo veía el
 *     mueble que se acordara de llamar a la sustitución, y las demás enseñaban
 *     `{asiento:aY9TK2MBJ}` en crudo.
 *
 * Queda escrito y no borrado del todo porque el rodeo era correcto en su fase, y
 * un fichero que no dice qué tuvo dentro invita a reinventarlo.
 */

/**
 * QUÉ MOVIMIENTO MANDA UN TOQUE.
 *
 * ═══ ESTO ES LO QUE MANTIENE MUDO AL MUEBLE ═══
 *
 * La alternativa era que el mueble devolviera «han tocado el nudo tal» y que
 * alguien tradujera eso a un movimiento. Ese «alguien» es código por juego dentro
 * de la pantalla, o sea la pantalla de Riberas otra vez. Con el movimiento ya
 * escrito dentro de cada pieza, el mueble hace literalmente esto: si hay `toque`,
 * lo manda; si es `null`, la pieza no se puede tocar.
 *
 * `carga` es `unknown` porque el motor la lleva libre: es la misma decisión que
 * `Movimiento.carga` en el núcleo, y la razón está escrita allí — un vocabulario
 * de formulario no sabe expresar el identificador canónico de un vértice que nadie
 * registró.
 */
export interface MovimientoDeclarado {
  tipo: string;
  carga: unknown;
}

/** Una cara del tablero: un polígono cerrado. Un hexágono, una casilla, un país. */
export interface CaraDeTablero {
  /** Su identidad, para las claves de la lista y para depurar. */
  id: string;
  /** Los vértices del polígono, en orden. */
  puntos: PuntoDeTablero[];
  /** Color de relleno, en `#rrggbb`. */
  relleno: string;
  /** Color del borde. */
  borde: string;
  /** Lo que se escribe encima. Cadena vacía si nada. */
  rotulo: string;
  /** Una cifra destacada —el número de producción, la puntuación—. Vacía si nada. */
  cifra: string;
  /** Si hay que resaltarla ahora mismo. */
  destacada: boolean;
  /** Qué manda tocarla, o `null` si no se toca. */
  toque: MovimientoDeclarado | null;
}

/** Una línea: una arista del tablero, esté ocupada o solo disponible. */
export interface LineaDeTablero {
  id: string;
  desde: PuntoDeTablero;
  hasta: PuntoDeTablero;
  color: string;
  grosor: number;
  /** Para dibujar de otra manera lo que aún no es de nadie. */
  tenue: boolean;
  toque: MovimientoDeclarado | null;
}

/** Un nudo: un vértice del tablero, ocupado o disponible. */
export interface NudoDeTablero {
  id: string;
  punto: PuntoDeTablero;
  color: string;
  radio: number;
  /** Dos formas bastan para distinguir dos clases de pieza sin dibujar sprites. */
  forma: 'redondo' | 'cuadrado';
  tenue: boolean;
  toque: MovimientoDeclarado | null;
}

/** Un botón: lo que no se puede tocar sobre el propio tablero. */
export interface AccionDeTablero {
  id: string;
  rotulo: string;
  /** Una línea que explica qué hace o por qué no se puede. Vacía si sobra. */
  ayuda: string;
  disponible: boolean;
  toque: MovimientoDeclarado;
}

/** Un bloque de texto al lado del tablero: la mano, el marcador, el aviso de turno. */
export interface PanelDeTablero {
  titulo: string;
  lineas: string[];
}

/**
 * EL TABLERO ENTERO, tal y como lo recibe el mueble.
 *
 * `vista` es el `viewBox` del SVG y lo calcula el juego, no la pantalla: solo el
 * juego sabe cuánto ocupa su tablero. La pantalla lo escala a lo que haya.
 */
export interface TableroDeclarado {
  vista: { x: number; y: number; ancho: number; alto: number };
  caras: CaraDeTablero[];
  lineas: LineaDeTablero[];
  nudos: NudoDeTablero[];
  acciones: AccionDeTablero[];
  paneles: PanelDeTablero[];
  /** Una línea grande arriba: de quién es el turno, qué se espera, quién ganó. */
  aviso: string;
}

/**
 * ¿ES ESTO UN TABLERO DECLARADO?
 *
 * La vista de una mesa llega al mueble como `unknown` —el motor no interpreta el
 * estado, y por eso `vistaDeAsiento` devuelve `unknown`— así que alguien tiene que
 * mirar antes de pintar. Se mira AQUÍ y una sola vez, para que la pantalla no
 * tenga que ir preguntando campo a campo con `as` por el medio.
 *
 * No comprueba cada punto de cada polígono: comprueba que las cuatro listas estén
 * y sean listas. Lo que caza es el caso real —un juego cuya vista no trae tablero,
 * o una versión de la app más vieja que el servidor— y para eso basta. Un tablero
 * a medias se pinta a medias, y eso se ve; una vista sin tablero se pintaría como
 * una pantalla en blanco, que es el fallo mudo de siempre.
 */
export function esTableroDeclarado(x: unknown): x is TableroDeclarado {
  if (typeof x !== 'object' || x === null) return false;
  const t = x as Partial<TableroDeclarado>;
  if (typeof t.vista !== 'object' || t.vista === null) return false;
  if (typeof t.vista.ancho !== 'number' || typeof t.vista.alto !== 'number') return false;
  return (
    Array.isArray(t.caras) &&
    Array.isArray(t.lineas) &&
    Array.isArray(t.nudos) &&
    Array.isArray(t.acciones) &&
    Array.isArray(t.paneles) &&
    typeof t.aviso === 'string'
  );
}

/**
 * La vista de un juego que trae tablero. Se saca aparte para que el mueble pueda
 * decir con todas las letras «este juego no trae tablero» en vez de quedarse en
 * blanco, que es la regla de la portada aplicada aquí: nada de lo que se enseña es
 * mentira.
 */
export function tableroDeLaVista(vista: unknown): TableroDeclarado | null {
  if (typeof vista !== 'object' || vista === null) return null;
  const posible = (vista as { tablero?: unknown }).tablero;
  return esTableroDeclarado(posible) ? posible : null;
}

/**
 * LAS OPCIONES QUE EL TABLERO NO ENSEÑA YA, Y NI UNA MÁS.
 *
 * ═══ POR QUÉ HACE FALTA, Y POR QUÉ NO SE ARREGLA ESCONDIENDO LAS OPCIONES ═══
 *
 * Con un tablero delante, un movimiento puede llegar por tres sitios: dentro del
 * `toque` de una pieza, dentro de una `accion` declarada, o en la lista de
 * `opciones()`. Y no son tres listas distintas: son tres formas de enseñar los
 * mismos movimientos, y un juego perfectamente correcto los publica por más de
 * una —Riberas resuelve su tablero A PARTIR de sus propias opciones, así que
 * mientras la mesa se reúne el mismo «repartir» sale como acción del tablero y
 * como opción—.
 *
 * Pintar las tres listas tal cual da botones repetidos, y un botón repetido no es
 * solo feo: hace creer que hay dos cosas distintas que hacer.
 *
 * La salida fácil sería no pintar `opciones()` cuando hay tablero. Y sería la
 * mentira más cara de un cliente, porque `opciones()` puede ofrecer cosas que NO
 * son ninguna pieza —aceptar un trato, pasar, rendirse— y que por tanto no tienen
 * dónde dibujarse. Esconderlas es esconder movimientos legales.
 *
 * ═══ Y VIVE AQUÍ Y NO EN UN CLIENTE, QUE ES LA CORRECCIÓN DE HOY ═══
 *
 * Esto nació en `escritorio/src/plan.ts` y se quedó allí, así que la app hacía
 * justo lo que este comentario llamaba la mentira más cara: con tablero delante
 * no pintaba ni una opción. Hoy no se nota porque los dos juegos de mesa de esta
 * casa meten todo lo suyo en `acciones` —La Ronda lo hace por esto mismo—, pero
 * un arcade de FUERA con tablero y un «pasar» suelto perdía ese botón en el
 * móvil y lo tenía en el escritorio. Dos clientes que no ofrecen los mismos
 * movimientos legales es exactamente lo que el §7 existe para que no pase.
 *
 * Así que se enseña cada movimiento EXACTAMENTE UNA VEZ: el tablero primero
 * —que es donde tiene sentido espacial— y debajo solo lo que el tablero no
 * enseña. La comparación es por forma canónica del movimiento y no por
 * identificador: los `id` de las opciones y los de las piezas son de dos espacios
 * de nombres distintos, y el juego no tiene ninguna obligación de hacerlos
 * coincidir. `canonico` es la mecánica que este repositorio ya tiene para
 * preguntar «¿son el mismo valor?» sin depender del orden de las claves.
 */
export function opcionesSueltas<O extends { tipo: string; carga: unknown }>(
  tablero: TableroDeclarado,
  opciones: readonly O[],
): readonly O[] {
  const yaEstan = new Set<string>();
  const apuntar = (t: MovimientoDeclarado | null): void => {
    if (t !== null) yaEstan.add(canonico({ tipo: t.tipo, carga: t.carga }));
  };
  for (const c of tablero.caras) apuntar(c.toque);
  for (const l of tablero.lineas) apuntar(l.toque);
  for (const n of tablero.nudos) apuntar(n.toque);
  for (const a of tablero.acciones) apuntar(a.toque);
  return opciones.filter((o) => !yaEstan.has(canonico({ tipo: o.tipo, carga: o.carga })));
}
