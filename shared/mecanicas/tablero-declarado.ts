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

/** Un punto del plano, en las unidades que declare el propio tablero. */
export interface PuntoDeTablero {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// NOMBRAR A LA GENTE SIN QUE EL JUEGO SEPA CÓMO SE LLAMA NADIE
// ---------------------------------------------------------------------------

/**
 * EL HUECO DONDE VA UN NOMBRE, y por qué hace falta uno.
 *
 * ═══ EL PROBLEMA, QUE SE VE EN LA PRIMERA PANTALLA ═══
 *
 * Un juego con mesa escribe textos sobre la gente: «a fulano le toca», «mengano
 * gana», «zutano te ofrece un trueque». Y NO SABE CÓMO SE LLAMA NADIE. No es un
 * descuido: `ContextoMovimiento.asientos` lleva `AsientoId[]` y la proyección
 * recibe un `QuienMira`, porque un asiento es «un sitio en la mesa, anónimo y
 * efímero» (§5.7) y los nombres los reparte la autoridad, no las reglas. Repartir
 * sitios es autoridad; el juego los LEE.
 *
 * El resultado, sin esto, es que el aviso grande de la partida dice «aJLFR7ZJ3
 * coloca una choza» mientras la barra de arriba —que la pinta la app con los datos
 * de la mesa— dice correctamente «Ana · Bruno». Nueve caracteres aleatorios donde
 * tenía que ir un nombre, en lo primero que se lee.
 *
 * ═══ POR QUÉ NO SE ARREGLA POR NINGUNA DE LAS DOS VÍAS OBVIAS ═══
 *
 * · Metiendo los nombres en el contrato del núcleo. Sería tocar
 *   `shared/arcade/movimiento.ts`, que es exactamente lo que la fase 4 existe para
 *   NO hacer: el diff vacío del núcleo es la demostración, y comprarla con un
 *   parche en la plataforma es falsear el resultado. Y sería además una decisión
 *   equivocada por su cuenta: el núcleo pasaría a tener una opinión sobre qué es
 *   un nombre visible.
 * · Sustituyéndolos en la app. No puede: el tablero viaja YA RESUELTO dentro de la
 *   proyección —cadenas hechas— y el mueble no sabe qué trozo de cada cadena era
 *   un asiento.
 *
 * ═══ LA TERCERA VÍA, QUE ES ÉSTA ═══
 *
 * El juego escribe un HUECO con el identificador dentro —`{asiento:aY9TK2MBJ}`— y
 * el mueble lo rellena con los nombres que ya tiene. Y no rompe la mudez del
 * mueble, que es lo que había que cuidar: «asiento» es vocabulario de PLATAFORMA
 * —está en el §1 bis y en el §5.7— y no de ningún juego. El mueble sigue sin saber
 * qué es una choza, una vereda o un trueque; lo único que aprende es que en un
 * texto puede venir dicho un asiento, que es algo que ya sabe porque la mesa se lo
 * manda con nombre y todo.
 *
 * Un arcade de fuera del binario usa esto igual que uno de dentro: es una función
 * de `mecanicas/`, y apuntarse es llamarla.
 *
 * ═══ POR QUÉ CON LLAVES Y NO CON UN CAMPO APARTE ═══
 *
 * Se consideró que cada panel llevara una lista de asientos al lado del texto. Eso
 * obliga a partir cada frase en trozos y a que el mueble sepa recomponerlas, o sea
 * a inventar un lenguaje de plantillas de verdad. Con el hueco dentro de la propia
 * cadena, el juego escribe la frase entera en su idioma y con su orden —que en
 * castellano no es el mismo que en inglés— y el mueble hace una sustitución.
 */
const HUECO = /\{asiento:([^}]{1,64})\}/g;

/**
 * El hueco donde el mueble pondrá el nombre de este asiento.
 *
 * El identificador va DENTRO del hueco a propósito: así, si nadie lo sustituye
 * —una app más vieja que el servidor, o un mueble que no llame a `conLosNombres`—
 * lo que se lee sigue identificando a alguien en vez de quedarse en blanco. Un
 * texto degradado es mejor que un texto mutilado.
 */
export function huecoDeAsiento(asiento: string): string {
  return `{asiento:${asiento}}`;
}

/**
 * RELLENA LOS HUECOS de un texto con los nombres que dé la mesa.
 *
 * Un asiento que no esté en la tabla se queda con su identificador a la vista, y
 * eso es deliberado: pasa de verdad —alguien que se fue y ya no sale en la lista, o
 * una vista de una revisión anterior a que se sentara— y borrarlo dejaría frases
 * cojas del tipo «— 1 pto», sin sujeto. Enseñar el identificador es feo; enseñar un
 * hueco es mentira.
 */
export function conLosNombres(texto: string, nombres: ReadonlyMap<string, string>): string {
  HUECO.lastIndex = 0;
  return texto.replace(HUECO, (_todo, id: string) => nombres.get(id) ?? id);
}

/**
 * El tablero entero con los nombres puestos. Lo llama el mueble, una vez por
 * repintado, justo antes de dibujar.
 *
 * Recorre TODO lo que lleva texto y no sólo el aviso: el marcador, los rótulos de
 * las caras, los botones y su ayuda. Que la sustitución esté en un solo sitio es lo
 * que evita el fallo de siempre —arreglar el aviso, olvidar el panel— y que el día
 * que el tipo gane un campo de texto, el compilador no avise pero el diff sí se lea
 * aquí.
 */
export function tableroConLosNombres(
  tablero: TableroDeclarado,
  nombres: ReadonlyMap<string, string>,
): TableroDeclarado {
  if (nombres.size === 0) return tablero;
  const nombrar = (t: string): string => conLosNombres(t, nombres);
  return {
    ...tablero,
    aviso: nombrar(tablero.aviso),
    caras: tablero.caras.map((c) => ({ ...c, rotulo: nombrar(c.rotulo) })),
    acciones: tablero.acciones.map((a) => ({
      ...a,
      rotulo: nombrar(a.rotulo),
      ayuda: nombrar(a.ayuda),
    })),
    paneles: tablero.paneles.map((p) => ({
      titulo: nombrar(p.titulo),
      lineas: p.lineas.map(nombrar),
    })),
  };
}

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
