/**
 * QUÉ SE PINTA, SACADO ENTERO DE LO QUE MANDÓ EL SERVIDOR.
 *
 * ═══ LA PROPIEDAD QUE ESTE FICHERO EXISTE PARA TENER ═══
 *
 * Este cliente no puede pintar nada que la proyección no le haya dado. No como
 * buena intención: como forma. Todo lo que acaba en pantalla sale de una de
 * estas dos cosas, y de ninguna otra:
 *
 *   · `mesa.opciones` — lo que devolvió `opciones(vista, quien)` del §5 bis,
 *     que recibe LA VISTA y jamás el estado, y que por tanto no puede ofrecer
 *     nada que la proyección no hubiera dejado pasar. Es imposible por
 *     construcción y no por disciplina.
 *   · `mesa.vista.tablero` — el `TableroDeclarado` que el juego resolvió dentro
 *     de su propia proyección, ya con las coordenadas hechas.
 *
 * Lo que NO hay, y es la mitad del asunto: ni una tabla de qué significa cada
 * arcade, ni un `if (arcade === 'riberas')`, ni un rótulo escrito aquí que
 * hable de nada que se juegue. Este fichero no sabe qué es una choza, ni una
 * vereda, ni un hexágono, ni una carta. Si supiera alguna de esas cosas dejaría
 * de ser un mueble genérico y sería la pantalla de un juego, y entonces el
 * arcade de fuera —el que entra por `ARCADES_EXTERNOS` y que nadie compiló—
 * volvería a necesitar que alguien de esta casa escribiera su pantalla.
 *
 * ═══ POR QUÉ SON FUNCIONES PURAS Y NO EL CUERPO DE UN COMPONENTE ═══
 *
 * Porque «pinta de más» es un fallo mudo: se ve bonito y nadie lo nota hasta
 * que el de más resulta ser algo que ese observador no debía ver. Con la
 * decisión fuera de React, un comprobador de Node puede darle una proyección
 * concreta y contar lo que sale.
 */
import type { Opcion } from '../../shared/arcade';
import { canonico } from '../../shared/mecanicas/canonico';
import type {
  MovimientoDeclarado,
  PuntoDeTablero,
  TableroDeclarado,
} from '../../shared/mecanicas/tablero-declarado';
import { tableroDeLaVista } from '../../shared/mecanicas/tablero-declarado';

// ---------------------------------------------------------------------------
// Qué mueble toca, para esta mesa, en este instante
// ---------------------------------------------------------------------------

/**
 * Lo que hay que pintar ahora mismo. Tres respuestas y ninguna más.
 *
 * ═══ POR QUÉ EL `tablero` NO SE DECIDE POR EL MANIFIESTO ═══
 *
 * La tentación es mirar `manifiesto.mueble` y pintar el retablo si dice
 * `tablero`. Y está mal, porque el mueble declara CON QUÉ se pinta y no si hay
 * algo pintado todavía: un arcade de tablero perfectamente correcto puede
 * declararlo en su proyección solo a partir del momento en que la partida
 * empieza —antes no hay nada que dibujar— y hasta entonces lo único que tiene
 * que ofrecer es un botón de «repartir».
 *
 * Ese caso no es hipotético y ya está probado en el árbol: «El Vado», el
 * segundo arcade de `verify:arcade-de-fuera`, declara `mueble: 'tablero'` y su
 * proyección NO trae ninguno. Un cliente que decidiera por el manifiesto le
 * enseñaría un lienzo en blanco a quien tiene dos botones esperándole.
 *
 * Así que se pregunta por lo que HAY, en este orden: si vino tablero, tablero;
 * si no, lo que se pueda hacer; y si no vino ninguna de las dos cosas, se dice
 * —que es la tercera respuesta y la que no se puede callar.
 */
export type QueSePinta =
  | { que: 'tablero'; tablero: TableroDeclarado; opciones: readonly Opcion[] }
  | { que: 'formulario'; opciones: readonly Opcion[] }
  | { que: 'nada'; porque: string };

export function queSePinta(vista: unknown, opciones: readonly Opcion[]): QueSePinta {
  const tablero = tableroDeLaVista(vista);
  if (tablero !== null) return { que: 'tablero', tablero, opciones };
  if (opciones.length > 0) return { que: 'formulario', opciones };
  /*
   * Se enumeran las TRES razones posibles y no se elige una, porque desde aquí no
   * se puede saber cuál es: este mueble no sabe a qué se juega. Decir sólo «le
   * toca a otro» sería adivinar, y decir sólo «se juega en la app» sería acusar
   * al juego de no saber pintarse cuando a lo mejor es que la partida acabó.
   */
  return {
    que: 'nada',
    porque:
      'Ahora mismo este arcade no manda nada que pintar: ni tablero dibujado ni nada que se ' +
      'pueda hacer. Puede que le toque a otro, que la partida ya esté resuelta, o que este ' +
      'juego pinte su propia pantalla — y esa se juega en la app.',
  };
}

// ---------------------------------------------------------------------------
// Y dentro del tablero, pieza por pieza
// ---------------------------------------------------------------------------

/**
 * UNA PIEZA DEL RETABLO, con su geometría y con su movimiento dentro.
 *
 * Es casi lo declarado tal cual, con una etiqueta de qué clase es. El «casi»
 * importa: la lista sale APLANADA y EN ORDEN DE CAPAS, y ese orden es la única
 * regla de pintado que hay aquí. En SVG lo que se dibuja después tapa a lo de
 * antes; las caras son grandes y van debajo, las líneas cruzan por encima de
 * ellas, y los nudos son pequeños y tienen que quedar visibles sobre las dos
 * cosas. Un juego que declarara sus nudos antes que sus caras se pintaría solo
 * a medias, y el fallo se vería como «faltan piezas» sin decir por qué.
 *
 * Aplanarlo aquí y no en el componente tiene un motivo concreto: así el orden
 * de capas es una propiedad de un valor que se puede leer desde un comprobador,
 * y no el orden en que alguien escribió tres bucles dentro de un `<svg>`.
 */
export type PiezaPintada =
  | {
      clase: 'cara';
      id: string;
      puntos: PuntoDeTablero[];
      relleno: string;
      borde: string;
      rotulo: string;
      cifra: string;
      destacada: boolean;
      toque: MovimientoDeclarado | null;
    }
  | {
      clase: 'linea';
      id: string;
      desde: PuntoDeTablero;
      hasta: PuntoDeTablero;
      color: string;
      grosor: number;
      tenue: boolean;
      toque: MovimientoDeclarado | null;
    }
  | {
      clase: 'nudo';
      id: string;
      punto: PuntoDeTablero;
      color: string;
      radio: number;
      forma: 'redondo' | 'cuadrado';
      tenue: boolean;
      toque: MovimientoDeclarado | null;
    };

export function loQueSePinta(tablero: TableroDeclarado): PiezaPintada[] {
  const piezas: PiezaPintada[] = [];
  for (const c of tablero.caras) {
    piezas.push({
      clase: 'cara',
      id: c.id,
      puntos: c.puntos,
      relleno: c.relleno,
      borde: c.borde,
      rotulo: c.rotulo,
      cifra: c.cifra,
      destacada: c.destacada,
      toque: c.toque,
    });
  }
  for (const l of tablero.lineas) {
    piezas.push({
      clase: 'linea',
      id: l.id,
      desde: l.desde,
      hasta: l.hasta,
      color: l.color,
      grosor: l.grosor,
      tenue: l.tenue,
      toque: l.toque,
    });
  }
  for (const n of tablero.nudos) {
    piezas.push({
      clase: 'nudo',
      id: n.id,
      punto: n.punto,
      color: n.color,
      radio: n.radio,
      forma: n.forma,
      tenue: n.tenue,
      toque: n.toque,
    });
  }
  return piezas;
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
 * como opción.
 *
 * Pintar las tres listas tal cual da botones repetidos, y un botón repetido no
 * es solo feo: hace creer que hay dos cosas distintas que hacer.
 *
 * La salida fácil sería no pintar `opciones()` cuando hay tablero. Y sería la
 * mentira más cara de este cliente, porque `opciones()` puede ofrecer cosas que
 * NO son ninguna pieza —aceptar un trato, pasar, rendirse— y que por tanto no
 * tienen dónde dibujarse. Esconderlas es esconder movimientos legales.
 *
 * Así que se enseña cada movimiento EXACTAMENTE UNA VEZ: el tablero primero
 * —que es donde tiene sentido espacial— y debajo solo lo que el tablero no
 * enseña. La comparación es por forma canónica del movimiento y no por
 * identificador: los `id` de las opciones y los de las piezas son de dos
 * espacios de nombres distintos, y el juego no tiene ninguna obligación de
 * hacerlos coincidir. `canonico` es la mecánica que este repositorio ya tiene
 * para preguntar «¿son el mismo valor?» sin depender del orden de las claves.
 */
export function opcionesSueltas(
  tablero: TableroDeclarado,
  opciones: readonly Opcion[],
): readonly Opcion[] {
  const yaEstan = new Set<string>();
  for (const p of loQueSePinta(tablero)) {
    if (p.toque !== null) yaEstan.add(canonico({ tipo: p.toque.tipo, carga: p.toque.carga }));
  }
  for (const a of tablero.acciones) {
    yaEstan.add(canonico({ tipo: a.toque.tipo, carga: a.toque.carga }));
  }
  return opciones.filter((o) => !yaEstan.has(canonico({ tipo: o.tipo, carga: o.carga })));
}

/**
 * El encuadre del `<svg viewBox>`, sacado de la ventana que declaró el juego.
 *
 * Se saca aparte porque es el único número de todo el retablo que este cliente
 * podría inventarse sin que se notara: un `viewBox` mal puesto no da error, deja
 * el dibujo descentrado o recortado, y la explicación más plausible siempre
 * parece «el juego declaró mal sus coordenadas».
 */
export function encuadreDe(tablero: TableroDeclarado): string {
  const v = tablero.vista;
  return `${String(v.x)} ${String(v.y)} ${String(v.ancho)} ${String(v.alto)}`;
}
