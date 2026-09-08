/**
 * EL TERRITORIO DE UN COLONO: una sola mancha translúcida, no una insignia por pieza.
 *
 * ═══ QUÉ SUSTITUYE Y POR QUÉ ═══
 *
 * Hasta aquí cada pieza llevaba su marca suelta: un disco bajo el asentamiento y una raya a lo
 * largo de la vereda, cada una con su geometría, su tamaño y su aire obligatorio con la de al
 * lado. Miguel lo miró jugando y pidió lo contrario: que no sean «áreas independientes que
 * compiten» sino elementos que se UNEN y se FUNDEN, de modo que al trazar una vereda que sale de
 * un poblado la línea nazca del círculo sin costura, que una cadena de veredas se lea como UN
 * trazo, y que fundar un poblado entre dos veredas ensanche esa línea con un bulto circular.
 *
 * Y pidió otra cosa que es la que manda en este fichero: que la marca NO reescale con la rueda.
 * La de antes estaba anclada a la PANTALLA —`tallaDeUnaMarca` devolvía un tamaño de mundo tal que
 * la marca ocupara una fracción fija del alto del lienzo— y eso, medido, la hacía encoger a un
 * tercio contra el terreno entre 800 y 300 de cámara, con tres comportamientos distintos según el
 * zoom (crece, se queda quieta, vuelve a crecer) y con la ciudad y el poblado cambiando cada uno
 * por su lado. Aquí los tamaños son del MUNDO y no se tocan: la marca es pintura sobre el suelo y
 * se deforma con el tablero, como una mancha de verdad.
 *
 * ═══ LA UNIÓN SE HACE CON UN CAMPO, NO APILANDO TRANSLÚCIDOS ═══
 *
 * Es la decisión que sostiene todo lo demás. Dibujar el territorio como muchas figuras
 * translúcidas superpuestas NO da una unión: donde dos se pisan la mezcla alfa se aplica dos
 * veces y sale una media luna más oscura, que es exactamente la costura que se pidió quitar.
 *
 * Así que el territorio se define como un CAMPO y la geometría sólo lo muestrea:
 *
 *     dentro(p) = máx sobre las figuras de (cuánto se mete p en cada una)
 *
 * —el radio menos la distancia al centro para un disco, el medio ancho menos la distancia al
 * segmento para un camino—. La opacidad es `min(1, dentro / DESVANECIDO)`: uno bien adentro, cero
 * justo en el filo. Con esto la fusión sale sola y no hay que programarla: en el punto donde una
 * vereda entra en su poblado el máximo lo gana el camino, la opacidad vale lo mismo por los dos
 * lados, y LA COSTURA NO EXISTE. Y el bulto circular del poblado tampoco se programa: es lo que
 * hace el máximo cuando el disco es más ancho que el camino.
 *
 * ═══ Y LA GEOMETRÍA NO SE SOLAPA, QUE ES LA OTRA MITAD ═══
 *
 * El campo dice qué opacidad va en cada punto, pero si dos mallas cubren el mismo píxel la mezcla
 * se sigue aplicando dos veces por mucho que el número sea el correcto. Por eso los caminos se
 * RECORTAN: cada uno empieza y acaba en el borde del disco de su punta, y nunca entra dentro.
 *
 * ═══ Y EN UN VÉRTICE SIN CONSTRUCCIÓN NO HAY CÍRCULO, QUE ES UNA REGLA DE MIGUEL ═══
 *
 * Aquí hubo una JUNTA: un disco del ancho del propio camino, plantado en cada vértice por el que
 * pasaba una vereda y que no tenía asentamiento, para que dos veredas que se encuentran allí se
 * recortaran contra él en vez de pisarse. Funcionaba y se veía: Miguel lo miró en el tablero y
 * dijo que un círculo donde no hay nada construido «puede dar a equívoco». Tiene razón — un bulto
 * en el territorio significa una pieza, y ésa era la gramática entera del dibujo.
 *
 * Lo que la junta hacía lo hace ahora la PUNTA de una de las veredas. Un camino no es un
 * rectángulo sino una cápsula, así que su punta YA es un semicírculo del ancho del camino: es
 * exactamente la junta que se quita, pero perteneciendo a una vereda en vez de siendo una figura
 * suelta. En cada vértice sin asentamiento manda UNA —la primera por orden de sus dos puntas, que
 * es estable y da lo mismo en los tres aparatos—: ésa llega entera y las demás se recortan contra
 * su punta.
 *
 * Resultado: las figuras se tocan y no se solapan nunca, el campo las cose, y donde no hay pieza
 * no hay bulto.
 *
 * ═══ ESTO NO SABE DE `three` ═══
 *
 * Devuelve números. Lo pinta `delta.tsx` y lo mide `verify:escena` desde Node, que es la misma
 * frontera que separa `paleta.ts` y `escala.ts` de la escena, y por la misma razón: de dentro de
 * un `useFrame` no se mide nada.
 */

import { ALTURA_DE_UNA_PERSONA, RADIO_DE_TESELA } from './escala';

/** Un punto del plano del tablero. `y` es la profundidad; la altura la pone el relieve. */
export interface PuntoLlano {
  readonly x: number;
  readonly y: number;
}

/**
 * ═══ LOS TRES TAMAÑOS, EN UNIDADES DE TESELA Y NO DE PANTALLA ═══
 *
 * Una tesela mide `RADIO_DE_TESELA` (6,315) y una comarca doce, o sea 75,778 — que es también lo
 * que mide una arista, porque en un hexágono el lado y el radio son el mismo número. Ésa es la
 * regla contra la que hay que leer los tres números de aquí abajo.
 *
 * El disco del poblado se sale de su propia pieza a propósito. Medido sobre el `.glb`: un poblado
 * entero —las trece partes que `asentamiento.ts` planta— llega a 15,65 de radio y una ciudad a
 * 14,07, con la muralla cerrando la vuelta a 12,43. Un disco más pequeño que eso se queda debajo
 * de las casas y no se ve, que es exactamente el fallo que costó dos tandas descubrir.
 */
export const RADIO_DEL_DISCO = 2.6;
/** La ciudad es el mismo disco, más ancho. No es otra cosa: es el mismo bulto, más grande. */
export const RADIO_DEL_DISCO_DE_CIUDAD = 3.1;
/**
 * EL MEDIO ANCHO DEL CAMINO. Con 0,55 el trazo mide 1,1 teselas —6,95 de mundo— sobre una arista
 * de 75,778: la novena parte de su largo, que es lo que hace que se lea como un camino y no como
 * una cinta.
 */
export const MEDIO_ANCHO_DEL_CAMINO = 0.55;
/**
 * CUÁNTO TARDA EN APAGARSE HACIA FUERA. Es la distancia, hacia dentro desde el filo, en la que la
 * opacidad sube de cero a uno. No puede pasar de `MEDIO_ANCHO_DEL_CAMINO` o el camino no llegaría
 * a tener un solo punto a opacidad entera y sería una mancha desvaída en vez de un trazo.
 */
export const DESVANECIDO = 0.42;

/**
 * ═══ LA OPACIDAD DEL TERRITORIO DONDE ESTÁ ENTERO. La de fuera sale del campo. ═══
 *
 * Estuvo en 0,85, que era el techo que dejaba la cuenta de la tinta cuando la marca era una
 * insignia por pieza y había que compararla con el aro que sustituía. Miguel la miró en el
 * tablero y pidió «el triple de transparencia para que también se siga apreciando el tablero»:
 * de 0,85 a 0,28, o sea que lo que tapa pasa del 85 % al 28 % y por debajo se lee el terreno,
 * el número de la comarca y el camino del pack.
 *
 * ═══ Y LO QUE ESO CUESTA, DICHO CON EL NÚMERO ═══
 *
 * Cuesta contraste contra el suelo, y ya iba justo: medidas en el lienzo con luz y tone mapping,
 * a 0,85 había TRES combinaciones de color y terreno por debajo del umbral 20 de esta casa —el
 * verde sobre el carrizal en 8,0, el amarillo sobre la vega en 5,7 y el azul sobre el agua del
 * río en 7,3—, y ninguna de las tres se arregla con opacidad porque el verde de jugador (#007d52)
 * y el carrizal (#008454) son literalmente el mismo color. A 0,28 caen más, y ahí está el cambio
 * de trato: la marca deja de decir «de quién es esto» por su COLOR y pasa a decirlo por su FORMA
 * —un trazo largo que recorre los caminos y se ensancha bajo los poblados— y por el caserío,
 * que ya va teñido del color de su dueño. La forma aguanta el cambio: barriendo el delta con las
 * marcas apagadas hay 91 manchas oscuras de más de 60 píxeles y sólo TRES son alargadas como una
 * vereda.
 */
export const OPACIDAD_DEL_TERRITORIO = 0.22;

/**
 * ═══ CUÁNTO SE LEVANTA LA MANCHA SOBRE LA TIERRA: LO JUSTO PARA NO PARPADEAR ═══
 *
 * Porque una pintura pegada al suelo la corta TODO lo que crece encima. En este delta el mundo
 * entero se dibuja con el mismo orden —711 mallas opacas en el cero, medido en la escena— así que
 * no hay forma de meter la mancha entre la tierra y los árboles: o pasa la prueba de profundidad y
 * la trocea el follaje, o no la pasa y se pinta por encima de las casas.
 *
 * Así que se levanta, y la altura sale de una MEDIDA y no de un gusto. Sobre una mesa de dos
 * colonos en el banco, contando los píxeles de cada mancha y sus racimos por 4-conectividad
 * (fotograma con la marca contra fotograma sin ella):
 *
 *     subida    azul                 rojo
 *      0        10 racimos ·   529    19 racimos ·   689
 *      3         9 racimos ·   748    17 racimos ·  1206
 *      6         4 racimos ·   860     9 racimos ·  1679
 *      9         4 racimos ·   863     8 racimos ·  1809
 *     12         4 racimos ·   861     6 racimos ·  1884
 *
 * El codo de esa tabla está en SEIS, y AHÍ ESTUVO, Y ESTABA MAL. Miguel lo miró en el tablero:
 * «las áreas no están en la base del tablero debajo de las construcciones, están por encima y no
 * permiten que se vean las construcciones». Y tiene razón por aritmética: una casa del pack
 * levanta 6,4 de mundo y un árbol 6,5, así que una lámina a SEIS no pasa por debajo de nada —
 * pasa a la altura del tejado, y lo que la tabla contaba como «píxeles recuperados» eran en
 * buena parte píxeles robados a las casas.
 *
 * Así que vuelve a la BASE, que es donde tiene que estar una pintura en el suelo, y lo que se
 * paga es lo que la tabla dice: la mancha se rompe donde hay maleza encima. Eso NO es un fallo
 * —un árbol plantado sobre tu territorio tapa la pintura que hay debajo, igual que en el suelo—
 * y es exactamente el trato que Miguel eligió al verlo.
 *
 * Media persona es lo que hace falta para no parpadear contra la tesela de debajo por el z-fight
 * y nada más: es el mismo número con el que se posaba el zócalo, y por la misma razón.
 */
export const ALTO_DE_LA_MANCHA = ALTURA_DE_UNA_PERSONA * 0.06;

/** Un disco del territorio: un asentamiento, o la junta donde se encuentran dos veredas. */
export interface DiscoDelTerritorio {
  readonly que: 'disco';
  readonly centro: PuntoLlano;
  /** En unidades de mundo, ya multiplicado por `RADIO_DE_TESELA`. */
  readonly radio: number;
}

/** Un camino del territorio, ya RECORTADO contra los discos de sus dos puntas. */
export interface CaminoDelTerritorio {
  readonly que: 'camino';
  readonly desde: PuntoLlano;
  readonly hasta: PuntoLlano;
  /** En unidades de mundo. */
  readonly medioAncho: number;
}

export type FiguraDelTerritorio = DiscoDelTerritorio | CaminoDelTerritorio;

/** Lo que hay que darle a `territorioDe` para componer la mancha de un colono. */
export interface LoQueTiene {
  /** Un asentamiento por vértice ocupado, con su clase. */
  readonly asentamientos: readonly { readonly punto: PuntoLlano; readonly clase: 'poblado' | 'ciudad' }[];
  /** Una vereda por arista trazada, con sus dos puntas. */
  readonly veredas: readonly { readonly a: PuntoLlano; readonly b: PuntoLlano }[];
}

/** La llave con la que se reconoce un vértice sin depender de cómo lo llame el juego. */
function llaveDelPunto(p: PuntoLlano): string {
  return `${p.x.toFixed(3)}|${p.y.toFixed(3)}`;
}

function distancia(a: PuntoLlano, b: PuntoLlano): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * LAS FIGURAS DEL TERRITORIO DE UN COLONO: LO QUE DEFINE EL CAMPO.
 *
 * Los caminos van ENTEROS, de vértice a vértice, y eso es deliberado: el campo es la UNIÓN, y
 * una unión no se recorta. Lo que se recorta es la GEOMETRÍA que la muestrea, y de eso se
 * encarga `piezasQueSePintan` — separar las dos cosas es lo que arregla los dos fallos que
 * salieron midiendo la primera versión:
 *
 *   · CON EL RECORTE DENTRO DEL CAMPO había un BACHE en la junta. Medido: entrando por el eje
 *     del camino hacia el disco, la opacidad bajaba a 0,782 justo antes del filo del disco y
 *     volvía a uno — porque allí el camino recortado ya no empezaba y el disco se estaba
 *     acabando, así que ninguno de los dos ganaba el máximo. Con el camino entero, el máximo lo
 *     gana siempre él y la junta sale plana.
 *   · Y EL RECORTE SÓLO NO BASTABA para que las mallas no se pisaran, porque un camino no es un
 *     rectángulo: `dentroDelCamino` mide la distancia al SEGMENTO, así que la figura es una
 *     cápsula con dos casquetes de un medio ancho. Recortando el camino justo en el filo del
 *     disco, el casquete se metía un medio ancho DENTRO. Medido en una comarca con un poblado y
 *     dos veredas encadenadas: 495 puntos de rejilla caían en dos figuras a la vez.
 */
export function territorioDe(tiene: LoQueTiene): readonly FiguraDelTerritorio[] {
  const medioAncho = MEDIO_ANCHO_DEL_CAMINO * RADIO_DE_TESELA;
  /* El radio que manda en cada vértice: el del asentamiento si lo hay, si no el de la junta. */
  const radioEn = new Map<string, number>();
  for (const a of tiene.asentamientos) {
    const radio = (a.clase === 'ciudad' ? RADIO_DEL_DISCO_DE_CIUDAD : RADIO_DEL_DISCO) * RADIO_DE_TESELA;
    radioEn.set(llaveDelPunto(a.punto), radio);
  }
  /*
   * SÓLO LOS ASENTAMIENTOS PONEN DISCO. Un vértice por el que pasa una vereda y donde no hay nada
   * construido no lleva ninguno: un bulto en el territorio significa una pieza, y ésa es la
   * gramática del dibujo. Que las veredas que se encuentran ahí no se pisen lo resuelve
   * `piezasQueSePintan` con la punta de una de ellas.
   */
  const puntos = new Map<string, PuntoLlano>();
  for (const a of tiene.asentamientos) puntos.set(llaveDelPunto(a.punto), a.punto);

  const figuras: FiguraDelTerritorio[] = [];
  for (const [llave, radio] of radioEn) {
    const centro = puntos.get(llave);
    if (centro === undefined) continue;
    figuras.push({ que: 'disco', centro, radio });
  }
  for (const v of tiene.veredas) {
    if (distancia(v.a, v.b) <= 0) continue;
    figuras.push({ que: 'camino', desde: v.a, hasta: v.b, medioAncho });
  }
  return figuras;
}

/**
 * LAS PIEZAS QUE SE PINTAN: las mismas figuras, con los caminos recortados para que NINGUNA se
 * pise con otra.
 *
 * El recorte es el radio del disco de la punta MÁS un medio ancho, y ese sumando es la parte que
 * no es obvia: el casquete de la cápsula asoma un medio ancho por detrás de donde acaba el
 * segmento, así que recortando sólo hasta el filo del disco la figura seguiría metiéndose dentro.
 * Con el sumando, el casquete queda TANGENTE al disco: se tocan y no se pisan.
 *
 * Y no se pierde nada por recortar de más, porque el CAMPO sigue viendo el camino entero: el
 * trozo que la geometría no pinta lo pinta el disco, con la opacidad que le toca a ese punto.
 */
export function piezasQueSePintan(
  figuras: readonly FiguraDelTerritorio[],
): readonly FiguraDelTerritorio[] {
  const discos = figuras.filter((f): f is DiscoDelTerritorio => f.que === 'disco');
  const caminos = figuras.filter((f): f is CaminoDelTerritorio => f.que === 'camino');
  const radioEn = (p: PuntoLlano): number => {
    for (const d of discos) if (distancia(d.centro, p) < 1e-6) return d.radio;
    return 0;
  };
  /*
   * QUIÉN MANDA EN UN VÉRTICE SIN DISCO: el primero de los caminos que lo tocan, por el orden
   * estable de sus dos puntas. Ése llega entero y su punta redonda hace de junta; los demás se
   * recortan contra ella. El orden no puede salir del orden en que llegan las veredas —eso
   * cambiaría el dibujo según en qué turno se construyó cada una— así que sale de las
   * coordenadas, que son las mismas en el servidor, en el escritorio y en el móvil.
   */
  const nombreDelCamino = (c: CaminoDelTerritorio): string =>
    [llaveDelPunto(c.desde), llaveDelPunto(c.hasta)].sort().join('~');
  const mandaEn = new Map<string, string>();
  for (const c of [...caminos].sort((x, y) => (nombreDelCamino(x) < nombreDelCamino(y) ? -1 : 1))) {
    for (const p of [c.desde, c.hasta]) {
      const llave = llaveDelPunto(p);
      if (radioEn(p) > 0) continue;
      if (!mandaEn.has(llave)) mandaEn.set(llave, nombreDelCamino(c));
    }
  }
  /** Cuánto se recorta este camino en esta punta suya. */
  const recorteEn = (c: CaminoDelTerritorio, p: PuntoLlano): number => {
    const radio = radioEn(p);
    if (radio > 0) return radio + c.medioAncho;
    /*
     * Sin disco: el que manda llega entero y su punta hace de junta. Los demás se paran a DOS
     * medios anchos, no a uno, y ese factor no es de adorno: la punta de un camino es un
     * semicírculo de un medio ancho, así que un camino recortado a `d` sigue pintando hasta
     * `d - medioAncho`. Para quedar TANGENTE a la punta del que manda —que es un disco de un
     * medio ancho alrededor del vértice— hace falta `d - medioAncho >= medioAncho`. Con uno solo
     * se pisaban: medido sobre un poblado con dos veredas encadenadas, 125 puntos de rejilla en
     * dos figuras a la vez.
     */
    return mandaEn.get(llaveDelPunto(p)) === nombreDelCamino(c) ? 0 : c.medioAncho * 2;
  };
  const piezas: FiguraDelTerritorio[] = [...discos];
  for (const f of figuras) {
    if (f.que !== 'camino') continue;
    const largo = distancia(f.desde, f.hasta);
    if (largo <= 0) continue;
    const ra = recorteEn(f, f.desde);
    const rb = recorteEn(f, f.hasta);
    /*
     * Un camino al que el recorte se le come el largo entero no se pinta, y con este tablero no
     * puede pasar —la arista mide doce teselas y el recorte más grande son cuatro—, pero se
     * comprueba en vez de suponerse: el día que alguien suba un radio, el fallo sería una vereda
     * que no aparece y nadie sabría por qué.
     */
    if (ra + rb >= largo) continue;
    const ux = (f.hasta.x - f.desde.x) / largo;
    const uy = (f.hasta.y - f.desde.y) / largo;
    piezas.push({
      que: 'camino',
      desde: { x: f.desde.x + ux * ra, y: f.desde.y + uy * ra },
      hasta: { x: f.hasta.x - ux * rb, y: f.hasta.y - uy * rb },
      medioAncho: f.medioAncho,
    });
  }
  return piezas;
}

/** Cuánto se mete un punto dentro de un segmento de ancho dado. Negativo si está fuera. */
function dentroDelCamino(p: PuntoLlano, c: CaminoDelTerritorio): number {
  const dx = c.hasta.x - c.desde.x;
  const dy = c.hasta.y - c.desde.y;
  const largo2 = dx * dx + dy * dy;
  if (largo2 <= 0) return c.medioAncho - distancia(p, c.desde);
  let t = ((p.x - c.desde.x) * dx + (p.y - c.desde.y) * dy) / largo2;
  t = Math.min(1, Math.max(0, t));
  const cx = c.desde.x + dx * t;
  const cy = c.desde.y + dy * t;
  return c.medioAncho - Math.hypot(p.x - cx, p.y - cy);
}

/**
 * CUÁNTO SE METE UN PUNTO DENTRO DEL TERRITORIO. Cero justo en el filo, negativo fuera.
 *
 * Es el MÁXIMO y no la suma: el territorio es la UNIÓN de sus figuras, y la unión de conjuntos se
 * escribe con un máximo de funciones de dentro. Sumar daría un territorio más gordo donde dos
 * figuras se tocan —justo el bulto de más que la mezcla alfa dibujaba y que esto viene a quitar—.
 */
export function dentroDelTerritorio(p: PuntoLlano, figuras: readonly FiguraDelTerritorio[]): number {
  let mayor = -Infinity;
  for (const f of figuras) {
    const d = f.que === 'disco' ? f.radio - distancia(p, f.centro) : dentroDelCamino(p, f);
    if (d > mayor) mayor = d;
  }
  return mayor === -Infinity ? -Infinity : mayor;
}

/**
 * LA OPACIDAD DEL TERRITORIO EN UN PUNTO, entre cero y uno.
 *
 * No lleva `OPACIDAD_DEL_TERRITORIO` dentro: esto es el PERFIL, y la opacidad del material lo
 * multiplica entero. Separarlos es lo que permite subir o bajar el volumen de la marca sin tocar
 * la forma de su degradado, que son dos decisiones distintas y se tomaron en dos días distintos.
 */
export function opacidadEn(p: PuntoLlano, figuras: readonly FiguraDelTerritorio[]): number {
  const dentro = dentroDelTerritorio(p, figuras);
  if (!Number.isFinite(dentro) || dentro <= 0) return 0;
  const desvanecido = DESVANECIDO * RADIO_DE_TESELA;
  return Math.min(1, dentro / desvanecido);
}

/**
 * ═══ CÓMO SE TESELA, Y POR QUÉ ASÍ ═══
 *
 * El campo dice la opacidad de un punto; la malla la muestrea en sus vértices y la tarjeta
 * interpola el resto. O sea que la finura de la malla es lo que decide si el degradado se ve
 * suave o a escalones, y hay que medirla contra el DESVANECIDO y no elegirla a ojo.
 *
 * Con el disco a 2,6 teselas de radio y el desvanecido en 0,42, la caída ocupa el 16 % del radio:
 * con diez anillos caen 1,6 anillos dentro de la caída, que a la vista es una raya. Por eso los
 * anillos NO van a paso fijo: van con la raíz, que los junta hacia fuera y deja cuatro dentro de
 * la caída sin gastar vértices en el medio, donde la opacidad vale uno y no pasa nada.
 *
 * Los sectores son 32 porque el borde tiene que doblarse alrededor de donde entra un camino: uno
 * de 1,1 teselas de ancho ocupa unos 24 grados del borde de un disco de 2,6, o sea dos sectores.
 * Con menos, la unión del camino con su poblado saldría con esquinas.
 */
const ANILLOS_DEL_DISCO = 10;
const SECTORES_DEL_DISCO = 32;
/** A lo largo y a lo ancho de un camino. A lo ancho manda el desvanecido; a lo largo, las puntas. */
const LARGO_DEL_CAMINO = 10;
const ANCHO_DEL_CAMINO = 8;

/** Una malla lista para `three`, sin tocar `three`. La altura la pone quien la pide. */
export interface MallaDelTerritorio {
  readonly posiciones: Float32Array;
  /** Cuatro por vértice: uno, uno, uno y la opacidad del campo. El color lo pone el material. */
  readonly colores: Float32Array;
  readonly indices: Uint32Array;
}

/**
 * LA MALLA DEL TERRITORIO DE UN COLONO.
 *
 * `alturaEn` es el relieve: cada vértice se apoya en la tierra que tiene debajo, y por eso el
 * territorio se dobla con el terreno en vez de quedarse en un plano que se hunde en la ladera de
 * al lado —que es lo que le pasaba a la marca de antes, medido: una ciudad pegada a la montaña
 * llegó a pintar TRES píxeles—. `alto` es lo que se levanta sobre esa tierra.
 */
export function mallaDelTerritorio(
  figuras: readonly FiguraDelTerritorio[],
  alturaEn: (p: PuntoLlano) => number,
  alto: number,
): MallaDelTerritorio {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];

  const meter = (p: PuntoLlano): number => {
    const i = pos.length / 3;
    pos.push(p.x, alturaEn(p) + alto, p.y);
    col.push(1, 1, 1, opacidadEn(p, figuras));
    return i;
  };

  for (const f of piezasQueSePintan(figuras)) {
    if (f.que === 'disco') {
      const centro = meter(f.centro);
      /* Los anillos van con la raíz para juntarse hacia fuera, que es donde vive la caída. */
      const aro: number[][] = [];
      for (let k = 1; k <= ANILLOS_DEL_DISCO; k++) {
        const r = f.radio * Math.sqrt(k / ANILLOS_DEL_DISCO);
        const fila: number[] = [];
        for (let s = 0; s < SECTORES_DEL_DISCO; s++) {
          const a = (s / SECTORES_DEL_DISCO) * Math.PI * 2;
          fila.push(meter({ x: f.centro.x + Math.cos(a) * r, y: f.centro.y + Math.sin(a) * r }));
        }
        aro.push(fila);
      }
      const primero = aro[0] as number[];
      for (let s = 0; s < SECTORES_DEL_DISCO; s++) {
        const t = (s + 1) % SECTORES_DEL_DISCO;
        idx.push(centro, primero[s] as number, primero[t] as number);
      }
      for (let k = 0; k + 1 < aro.length; k++) {
        const dentro = aro[k] as number[];
        const fuera = aro[k + 1] as number[];
        for (let s = 0; s < SECTORES_DEL_DISCO; s++) {
          const t = (s + 1) % SECTORES_DEL_DISCO;
          idx.push(dentro[s] as number, fuera[s] as number, fuera[t] as number);
          idx.push(dentro[s] as number, fuera[t] as number, dentro[t] as number);
        }
      }
      continue;
    }
    const dx = f.hasta.x - f.desde.x;
    const dy = f.hasta.y - f.desde.y;
    const largo = Math.hypot(dx, dy);
    if (largo <= 0) continue;
    const ux = dx / largo;
    const uy = dy / largo;
    /* La normal del camino: por donde se mide el ancho. */
    const nx = -uy;
    const ny = ux;
    const rejilla: number[][] = [];
    for (let i = 0; i <= LARGO_DEL_CAMINO; i++) {
      const t = i / LARGO_DEL_CAMINO;
      const fila: number[] = [];
      for (let j = 0; j <= ANCHO_DEL_CAMINO; j++) {
        const w = (j / ANCHO_DEL_CAMINO) * 2 - 1;
        fila.push(
          meter({
            x: f.desde.x + ux * largo * t + nx * f.medioAncho * w,
            y: f.desde.y + uy * largo * t + ny * f.medioAncho * w,
          }),
        );
      }
      rejilla.push(fila);
    }
    for (let i = 0; i < LARGO_DEL_CAMINO; i++) {
      const aqui = rejilla[i] as number[];
      const alla = rejilla[i + 1] as number[];
      for (let j = 0; j < ANCHO_DEL_CAMINO; j++) {
        idx.push(aqui[j] as number, alla[j] as number, alla[j + 1] as number);
        idx.push(aqui[j] as number, alla[j + 1] as number, aqui[j + 1] as number);
      }
    }
  }

  return {
    posiciones: new Float32Array(pos),
    colores: new Float32Array(col),
    indices: new Uint32Array(idx),
  };
}
