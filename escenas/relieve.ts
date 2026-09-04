/**
 * EL SUELO DEL MUNDO: un terreno generado, no un patrón dibujado.
 *
 * ═══ POR QUÉ HAY DOS REJILLAS Y NO UNA ═══
 *
 * La del JUEGO tiene diecinueve hexágonos y decide las reglas: quién produce, qué
 * toca qué, dónde se puede construir. Ésa vive en `shared/mecanicas` y no se toca.
 *
 * La del MUNDO es mucho más fina —doce teselas por radio de comarca, o sea ciento
 * cuarenta y cuatro por comarca— y no decide ninguna regla: es el suelo por el que
 * se camina.
 *
 * ═══ LAS DOS REJILLAS ENCAJAN EXACTAMENTE, Y ESO SE DEMUESTRA ═══
 *
 * Poniendo la fórmula del centro de una subtesela dentro de la fórmula inversa de
 * la comarca, todo se cancela y queda una cuenta limpia:
 *
 *     centro de la subtesela (a,b) con radio Rt:   x = √3·Rt·(a + b/2)
 *                                                  y = 1,5·Rt·b
 *     y ese punto, en coordenadas de comarca (R = N·Rt):
 *                                                  q = a/N
 *                                                  r = b/N
 *
 * Ni raíces, ni senos, ni decimales: la comarca de la subtesela (a,b) es el
 * hexágono más cercano a `(a/N, b/N)`, y eso es aritmética de enteros, sin empates
 * que dependan del último bit de un doble. Lo de antes sí dependía, y costaba: las
 * comarcas salían de 144 a 156 teselas y siete vértices del tablero se quedaban sin
 * suelo debajo.
 *
 * ═══ EL RELIEVE NO SALE DE LA FORMA DEL HEXÁGONO. ÉSA ES LA DECISIÓN ═══
 *
 * Hubo dos versiones anteriores y las dos estaban mal, cada una a su manera:
 *
 *   · La primera sacaba la altura de un ruido por tesela. Salía confeti, y al
 *     suavizarlo, papilla.
 *   · La segunda la sacaba de la distancia al borde de la comarca. Eso da un mundo
 *     LEGIBLE pero MENTIROSO: todo sube en el centro de su hexágono, las terrazas
 *     son anillos concéntricos y las uniones entre biomas son rectas. Se reconoce el
 *     patrón a la primera, y un mapa que se deja adivinar deja de ser un sitio.
 *
 * Aquí la altura es un CAMPO CONTINUO sobre el plano, que no sabe nada de dónde
 * están los hexágonos. Se construye con tres piezas, y cada una hace un trabajo:
 *
 *   1. UNA AMPLITUD POR SITIO. Cuánto puede subir el terreno en cada punto sale de
 *      mezclar lo que sube cada bioma, con pesos gaussianos por cercanía. Es una
 *      función suave: no hay borde, no hay corte, no hay círculo de influencia.
 *   2. UN PERFIL. Cuánto sube DE VERDAD sale de sumar octavas de ruido. Donde la
 *      amplitud es alta se usa ruido de CRESTA, que da cordilleras con filo; donde
 *      es baja, ruido normal, que da lomas. Una montaña hecha con lomas parece un
 *      montón de arena.
 *   3. UNA DEFORMACIÓN. Antes de mirar cualquiera de los dos campos, el plano se
 *      retuerce con otro ruido. Eso es lo que hace que el borde entre el bosque y la
 *      montaña serpentee, se meta en el vecino y deje penínsulas, en vez de ser la
 *      mediatriz entre dos centros —que en una malla hexagonal se ve como un
 *      hexágono, y se ve enseguida—.
 *
 * El resultado se corta en escalones enteros, porque el pack está hecho de terrazas
 * de 1,0 exacto. Las curvas de nivel de un campo de este tipo son irregulares y
 * ramificadas, así que las terrazas salen con forma de terreno y no de diana.
 *
 * ═══ Y AUN ASÍ, DONDE SE CONSTRUYE TIENE QUE ESTAR LLANO ═══
 *
 * El juego pone poblados en los VÉRTICES —las esquinas donde se tocan tres
 * comarcas— y caminos en las ARISTAS. Un vértice a media ladera es un sitio donde no
 * se puede construir, y peor: donde no se ve si se puede.
 *
 * Así que alrededor de cada vértice del tablero el terreno se allana hacia la cota que
 * ese punto YA tenía: no se levanta ni se hunde nada, sólo se le quita la pendiente.
 * El allanamiento se aplica al campo CONTINUO y con una curva suave, no al nivel ya
 * cortado — la razón está abajo, y es que hacerlo al revés fabricaba muros
 * insalvables justo en los sitios de construcción.
 *
 * No es despreciable y no conviene fingir que lo es: cada rellano tiene dieciséis
 * unidades de radio y entre los cincuenta y cuatro tocan cerca de la décima parte del
 * suelo del mundo. Lo que sí es, es LOCAL: no dibuja anillos, no dibuja retícula y no
 * repite la forma del hexágono, porque cada mancha se funde con el terreno que la
 * rodea en vez de recortarse contra él.
 *
 * ═══ Y CADA PARTIDA UN MUNDO DISTINTO ═══
 *
 * Todo cuelga de una SEMILLA. El mismo reparto de comarcas con otra semilla da otras
 * montañas, otros valles y otros pueblos. Sigue siendo determinista —dos clientes
 * con la misma semilla ven el mismo mundo sin mandarse un solo byte— y sigue siendo
 * comprobable.
 */
import {
  DIRECCIONES,
  centroDeHex,
  comparaHex,
  mallaDeRadio,
  vecino,
} from '../shared/mecanicas/malla-hexagonal';
import type { Hex, LlaveDeVertice, Punto } from '../shared/mecanicas/malla-hexagonal';
import { puntoDeVertice, verticesDe } from '../shared/mecanicas/malla-hexagonal';
import { ESCALON, RADIO_DE_COMARCA, RADIO_DE_TESELA, TESELAS_POR_RADIO } from './escala';
import { fraccion } from './revoltijo';
import { deforma, fbm, fbmDeCresta } from './ruido';
import { trazaLasAguas } from './aguas';
import type { Aguas } from './aguas';

/**
 * DE UN PUNTO AL HEXÁGONO QUE LO CONTIENE.
 *
 * Es la inversa de `centroDeHex`, y vive aquí y no en `shared/mecanicas` por la
 * regla de siempre: `verify:pureza` prohíbe la trigonometría ahí dentro, y aunque
 * esto no use senos, sí usa la constante `√3` que sólo tiene sentido dibujando.
 *
 * El redondeo NO es redondear `q` y `r` por separado: eso da el hexágono
 * equivocado cerca de los bordes, porque los hexágonos no son cuadrados. Se pasa a
 * las tres coordenadas cúbicas —que suman cero—, se redondean las tres, y se
 * corrige la que más se movió para que la suma vuelva a ser cero.
 *
 * Devuelve el hexágono del origen si le dan un tamaño no positivo o un punto que no
 * es un número, en vez de propagar un `NaN` que sale del otro lado convertido en una
 * altura plausible: `Math.imul(NaN, K)` vale 0, así que un `NaN` aquí no revienta
 * nada — se disfraza de terreno.
 */
export function hexDePunto(p: Punto, tamano: number): Hex {
  if (!(tamano > 0) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return { q: 0, r: 0 };

  const q = ((Math.sqrt(3) / 3) * p.x - (1 / 3) * p.y) / tamano;
  const r = ((2 / 3) * p.y) / tamano;
  const s = -q - r;

  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;

  return { q: rq, r: rr };
}

/**
 * REDONDEA `x/n` AL ENTERO MÁS CERCANO, con el medio siempre hacia arriba.
 *
 * Todo entero: `x` y `n` lo son, así que no hay coma flotante que pueda decidir un
 * empate. Y la regla es la misma en todo el plano —sumar `n` a `x` suma exactamente
 * 1 al resultado—, que es lo que hace que todas las comarcas reciban el mismo
 * número de teselas.
 */
function redondeaMitadArriba(x: number, n: number): number {
  return Math.floor((2 * x + n) / (2 * n));
}

/**
 * A QUÉ COMARCA PERTENECE UNA SUBTESELA. Aritmética de enteros, sin empates sueltos.
 *
 * Es la composición de `centroDeHex` con `hexDePunto`, simplificada a redondear
 * `(a/N, b/N)` en coordenadas cúbicas. Los errores se comparan multiplicados por
 * `N`, así que también son enteros exactos.
 */
export function comarcaDeSubtesela(sub: Hex): Hex {
  const n = TESELAS_POR_RADIO;
  const s = -sub.q - sub.r;

  let rq = redondeaMitadArriba(sub.q, n);
  let rr = redondeaMitadArriba(sub.r, n);
  const rs = redondeaMitadArriba(s, n);

  const dq = Math.abs(rq * n - sub.q);
  const dr = Math.abs(rr * n - sub.r);
  const ds = Math.abs(rs * n - s);

  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;

  return { q: rq, r: rr };
}

/**
 * CUÁNTO PUEDE SUBIR EL TERRENO EN CADA BIOMA, en escalones.
 *
 * No es la altura que va a tener: es el TECHO. Lo que sube de verdad en cada punto
 * lo decide el perfil de ruido, así que una comarca de montaña tiene picos, faldas y
 * algún valle a ras — como una sierra— y no una meseta uniforme.
 *
 * Un escalón son 5,47 unidades, algo más de dos personas.
 *
 * ═══ POR QUÉ LA MONTAÑA LLEGA A NUEVE Y NO A TRES ═══
 *
 * Con techo tres, una montaña se levantaba dieciséis unidades: seis personas. Se
 * leía como una loma pedregosa, no como una montaña, y desde el aire no se
 * distinguía de una colina salvo por el color. Con NUEVE las cumbres llegan a siete
 * escalones —treinta y ocho unidades, quince personas— y encima llevan los peñascos
 * del pack, que miden otras ocho. Eso ya tapa el horizonte desde abajo y domina el
 * mapa desde arriba, que es lo que hace una montaña.
 *
 * El techo es lo que la montaña PUEDE llegar a ser, no lo que es: multiplicado por el
 * carácter de la comarca y por el perfil del ruido, una partida saca una sierra
 * imponente y otra no pasa de colina alta.
 *
 * Y trae una consecuencia que NO es un fallo: a esa altura la ladera sube más de un
 * escalón por tesela en algunos sitios, así que aparecen CANTILES que ninguna rampa
 * salva. Está bien que aparezcan. Una montaña por la que se puede subir por todas
 * partes no es una montaña; lo que tiene que quedar transitable son los sitios donde
 * se juega —los rellanos de los vértices y la red de caminos—, y de eso se encargan
 * el allanamiento y el trazado, no el techo.
 *
 * ═══ LOS NÚMEROS PEQUEÑOS TAMBIÉN SON UNA DECISIÓN ═══
 *
 * Una pradera con techo 0,3 sale SIEMPRE llana al cortar en enteros, y eso es
 * exactamente lo que se quiere de una pradera. Están escritos para que se vea que la
 * decisión es «llana», y no para que alguien crea que falta una entrada.
 */
const TECHO_DEL_BIOMA: Readonly<Record<string, number>> = {
  montana: 9,
  cantil: 7,
  colina: 1.7,
  bosque: 1.05,
  duna: 0.95,
  desierto: 0.5,
  carrizal: 0.35,
  pradera: 0.3,
  campo: 0.25,
  vega: 0.25,
  marisma: 0.2,
  salina: 0.15,
};

/**
 * DESDE QUÉ ALTURA HAY NIEVE, en escalones.
 *
 * Tres y medio, o sea veinte unidades: sólo lo alcanzan las montañas, y sólo
 * una parte de ellas. Es lo que convierte una sierra en una sierra NEVADA, que es de
 * las pocas cosas que se leen a la primera desde cualquier distancia.
 *
 * No es una línea recta: se le suma un ruido de casi un escalón, así que la cota de
 * nieve sube y baja como sube y baja de verdad —según la umbría, el viento y la
 * ladera—. Una nieve que empezara a una altura exacta dibujaría una curva de nivel
 * perfecta alrededor de cada pico y se vería el truco.
 */
const NIEVE_DESDE = 3.6;

/** Cuánto ondula la cota de nieve, en escalones. */
const VAIVEN_DE_LA_NIEVE = 0.8;

/** Lo que sube un bioma que esta versión no conoce: casi nada, que es lo que menos estorba. */
const TECHO_POR_DEFECTO = 0.3;

/**
 * Lo que sube un bioma, sin que una clave del prototipo se cuele por en medio.
 *
 * `TECHO_DEL_BIOMA['toString']` NO es `undefined`: es la función del prototipo de
 * `Object`, así que un `??` detrás no dispara. El vocabulario de terrenos lo trae
 * cada juego y llega por la red, así que ésta es la superficie por la que entraría.
 */
function techoDelBioma(terreno: string): number {
  return Object.hasOwn(TECHO_DEL_BIOMA, terreno)
    ? (TECHO_DEL_BIOMA[terreno] as number)
    : TECHO_POR_DEFECTO;
}

/**
 * LAS ESCALAS DEL MUNDO, todas en unidades de comarca.
 *
 * Se escriben relativas al radio de la comarca y no en unidades sueltas: si mañana
 * se cambia el tamaño del mundo, las montañas siguen midiendo lo mismo respecto de
 * las comarcas y el mapa se sigue leyendo igual.
 */
/** El tamaño de las formas grandes del relieve: valles y cordilleras. */
const ESCALA_DEL_RELIEVE = RADIO_DE_COMARCA * 1.15;
/** El tamaño de los meandros que retuercen el terreno. */
const ESCALA_DEL_RETORCIDO = RADIO_DE_COMARCA * 1.6;
/** Cuánto se retuerce. Media comarca: bastante para que no haya rectas, poco para que el bioma siga estando donde dice el tablero. */
const FUERZA_DEL_RETORCIDO = RADIO_DE_COMARCA * 0.5;
/** Lo mismo, para la mezcla de biomas: más flojo, para que un bioma no invada al vecino entero. */
const FUERZA_DEL_RETORCIDO_DE_BIOMA = RADIO_DE_COMARCA * 0.38;
/**
 * CUÁNTO LLEGA LA INFLUENCIA DE UNA COMARCA A UNA DISTANCIA DADA.
 *
 * ═══ POR QUÉ NO ES UNA GAUSSIANA ═══
 *
 * Porque una gaussiana ata dos cosas que tienen que ir sueltas: hasta dónde llega la
 * sierra a plena altura, y lo brusco que es su final. Con una sola sigma, o la
 * montaña ocupaba su comarca y bajaba despacio en todas partes, o se cortaba en seco
 * pero era un cono en mitad del hexágono. No había manera de tener una sierra ancha
 * que se corta contra el llano, que es una de las formas más comunes que hay.
 *
 * Aquí son dos números: una MESETA donde la influencia vale uno entera, y una FALDA
 * en la que baja hasta cero. La curva de bajada es el quíntico de siempre, con la
 * derivada nula en los dos extremos, así que ni al empezar ni al acabar aparece una
 * arruga — y al llegar a cero, llega de verdad, sin cola infinita que ensucie el
 * mapa entero.
 */
function cuantoLlega(d: number, meseta: number, falda: number): number {
  if (d <= meseta) return 1;
  if (d >= meseta + falda) return 0;
  const t = 1 - (d - meseta) / falda;
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Lo que mide la falda de una comarca corriente, antes de aplicarle su corte. */
const ALCANCE_DEL_BIOMA = RADIO_DE_COMARCA * 0.78;

/**
 * LO DURO QUE ES EL MÁXIMO SUAVE.
 *
 * Con 1 sería una suma —todo se acumula y el mundo entero se levanta—; con infinito
 * sería el máximo exacto, que tiene una arista donde dos comarcas se igualan y esa
 * arista se ve. Cuatro deja el máximo mandando y a la vez suma un poco donde dos
 * influencias coinciden, que es justo lo que hace un valle entre dos sierras.
 */
const DUREZA_DEL_MAXIMO = 4;

/** El rellano que se aplana alrededor de cada vértice, para poder construir. */
const RADIO_DE_RELLANO = RADIO_DE_TESELA * 2.6;

/** Qué parte de las teselas de una ladera se convierte en rampa. */
const CUANTAS_RAMPAS = 0.5;

/** Los canales del ruido. Separados y con nombre, por lo de siempre. */
const CANAL = {
  retorcidoDelRelieve: 1_001,
  retorcidoDelBioma: 2_003,
  loma: 3_007,
  cresta: 4_013,
  rampa: 5_021,
  pueblo: 6_029,
  caracter: 7_039,
  escarpadura: 9_067,
  corte: 11_083,
  temple: 13_099,
  nieve: 8_053,
} as const;

/** Una subtesela del mundo: dónde cae, a qué altura y qué papel hace. */
export interface Subtesela {
  sub: Hex;
  comarca: Hex;
  /** El centro de la tesela, en el plano de la malla. */
  centro: Punto;
  /** Su terraza, en escalones enteros desde el nivel del mar. */
  nivel: number;
  /** La altura de su cara de arriba, en unidades de mundo. Es `nivel · ESCALON`. */
  altura: number;
  /** A cuántos pasos de subtesela está del centro de su comarca. */
  rango: number;
  /** Si está dentro del rellano aplanado de un vértice, donde se construye. */
  rellano: boolean;
  /** Lo bien que se presta a que crezca un pueblo, entre 0 y 1. */
  habitabilidad: number;
  /** Si está por encima de la cota de nieve. Cambia la textura y lo que crece. */
  nieve: boolean;
  /** Qué es para el agua: tierra, cauce, cuerpo o vaguada. Ver `aguas.ts`. */
  agua: number;
  /** El nivel entero de su lámina, si la tiene. */
  nivelDelAgua: number;
  /** Los lados por los que sale el cauce, en bits. Sólo si es cauce. */
  cauce: number;
  /** Los lados por los que esta tierra ve agua, en bits. Cero si no ve ninguna. */
  orilla: number;
  /** A cuántos pasos está del agua. Sirve para la banda de arena de la ribera. */
  aOrilla: number;
  /** El porte del cauce que pasa por aquí: arroyo, río u hondo. */
  porte: number;
  /** Si esta tierra es ribera de un río y se pinta de arena. */
  margen: boolean;
  /**
   * Si es una rampa, el giro que lleva su lado alto contra el vecino elevado.
   * `null` si es una tesela llana normal.
   */
  rampa: number | null;
}

/** Lo que hace falta saber de una comarca para levantar su suelo. */
export interface ComarcaDelMundo {
  hex: Hex;
  terreno: string;
}

export interface Relieve {
  /** El fondo común de todas las teselas: por dónde se corta el mundo por abajo. */
  readonly base: number;
  /** El plan de aguas del mundo: ríos, lagos y de qué clase es cada subtesela. */
  readonly aguas: Aguas;
  /**
   * La altura SIN cortar en escalones, en un punto cualquiera.
   *
   * Es el campo del que salen los niveles, y hace falta fuera para una cosa concreta:
   * el agua corre cuesta abajo, y sobre un terreno ya cortado en cuatro escalones no
   * hay cuesta que seguir — todo son mesetas y paredes. Un río trazado sobre el campo
   * continuo serpentea como serpentean los ríos; trazado sobre los escalones, da
   * vueltas sin sentido dentro de una meseta.
   */
  alturaContinua(p: Punto): number;
  /** La terraza del suelo en un punto cualquiera, incluidos los vértices. */
  nivelEn(p: Punto): number;
  /** La altura del suelo en un punto cualquiera. Es `nivelEn(p) · ESCALON`. */
  alturaEn(p: Punto): number;
  /** Lo bien que se presta un punto a que crezca un pueblo, entre 0 y 1. */
  habitabilidadEn(p: Punto): number;
  /** Las subteselas de una comarca, ya resueltas. Copia: el original es del caché. */
  subteselasDe(hex: Hex): Subtesela[];
  /** Todas las del mundo, de una vez. */
  todas(): Subtesela[];
  /**
   * CUÁNTOS VÉRTICES DEL TABLERO SE HAN QUEDADO SIN SUELO DEBAJO.
   *
   * Tiene que ser CERO, y por eso está aquí: durante mucho tiempo fueron dieciséis de
   * cincuenta y cuatro y no había forma de enterarse desde fuera. Es un invariante que
   * el delantal garantiza por construcción, y aun así se mide, porque un invariante
   * que no se mide es una promesa.
   */
  readonly verticesSinSuelo: number;
}

/**
 * CUÁNTO SE ALEJA LA BÚSQUEDA al recoger las subteselas de una comarca.
 *
 * Tiene que llegar a la subtesela más lejana que siga siendo de la comarca. Una
 * comarca de radio `N·Rt` alcanza, en la dirección más cara, `N/1,5` pasos de
 * subtesela: no porque exista ningún paso de `1,5·Rt` —los seis vecinos están todos
 * a `√3·Rt`—, sino porque a partir de dos pasos el avance mínimo POR PASO tiende a
 * `1,5·Rt` en la dirección de las columnas. Con `N = 12` salen 8, y se miran 2 más
 * de propina.
 *
 * No hace falta fiarse de esta cuenta: `verify:escena` comprueba que cada comarca
 * recoja exactamente `N²` teselas, y quedarse corto aquí lo rompe.
 */
const ALCANCE_DE_BUSQUEDA = Math.ceil(TESELAS_POR_RADIO / 1.5) + 2;

/**
 * MONTA EL RELIEVE de un mundo concreto.
 *
 * La `semilla` es lo que hace que dos partidas con el mismo reparto de comarcas no
 * se parezcan en nada. Cero está bien para las pruebas y para el banco, donde
 * interesa poder comparar dos ejecuciones.
 */
export function crearRelieve(comarcas: readonly ComarcaDelMundo[], semilla = 0): Relieve {
  /*
   * Sin repetidos. Dos entradas con el mismo hexágono emitirían su suelo dos veces
   * —geometría superpuesta, que se ve como parpadeo— y contarían doble en la mezcla
   * de amplitudes. Gana la primera, que es la que quien llama escribió antes.
   */
  const unicas: ComarcaDelMundo[] = [];
  const vistas = new Set<string>();
  for (const c of comarcas) {
    const llave = `${String(c.hex.q)},${String(c.hex.r)}`;
    if (vistas.has(llave)) continue;
    vistas.add(llave);
    unicas.push(c);
  }

  /** El terreno de cada comarca, para que la hidrología sepa cuánto llueve encima. */
  const terrenoPorComarca = new Map<string, string>();
  for (const c of unicas) terrenoPorComarca.set(`${String(c.hex.q)},${String(c.hex.r)}`, c.terreno);
  function terrenoDeComarca(hex: Hex): string {
    return terrenoPorComarca.get(`${String(hex.q)},${String(hex.r)}`) ?? 'pradera';
  }

  /** La semilla desplaza todos los canales, así que cambia el mundo entero. */
  const canal = (n: number): number => n + semilla * 7_919;

  /**
   * EL CARÁCTER DE CADA COMARCA, y por qué no todas las montañas son altas.
   *
   * El techo de la tabla es lo que ese bioma puede llegar a ser, no lo que ES. Cada
   * comarca recibe además un carácter entre 0,3 y 1 sacado de sus coordenadas y de la
   * semilla, y su techo se multiplica por él.
   *
   * Sin esto, las tres montañas de un tablero salían las tres igual de altas y el
   * mapa se veía simétrico de una manera que no tiene nada que ver con la naturaleza:
   * una cordillera de verdad tiene un macizo, un pico secundario y unas estribaciones.
   * Con el carácter, una partida tiene una sierra imponente y dos serrezuelas, la
   * siguiente tiene dos macizos, y la de más allá ninguna que pase de colina alta.
   */
  /**
   * EL TEMPLE DEL TABLERO ENTERO, que es lo que hace que HAYA tableros distintos.
   *
   * El carácter varía de una comarca a otra dentro de un mismo mundo; el temple varía
   * de una PARTIDA a otra. Va casi siempre por debajo de uno —el cuadrado se encarga—
   * así que la mayoría de los tableros son de relieve tranquilo, y de vez en cuando
   * sale uno bravo en el que todo se levanta a la vez. Sin él, todos los tableros
   * tendrían el mismo aire aunque cambiaran las montañas de sitio.
   */
  const temple = 0.72 + fraccion(0, 0, canal(CANAL.temple)) ** 2 * 0.62;

  const centros = unicas.map((c) => {
    /*
     * EL CARÁCTER, sesgado hacia abajo A PROPÓSITO.
     *
     * Era uniforme entre 0,42 y 1, y eso hacía que la mitad de las montañas salieran
     * imponentes: un tablero tras otro con el terreno revuelto, y lo espectacular
     * dejaba de serlo por repetido. Elevando el sorteo a 2,4 la mayoría de las
     * comarcas se queda en la mitad baja y la cola alta se hace rara — así que un
     * macizo de quince personas sigue siendo posible pero deja de ser lo normal, que
     * es exactamente lo que tiene que pasar con una montaña.
     */
    const caracter =
      0.22 + fraccion(c.hex.q, c.hex.r, canal(CANAL.caracter)) ** 2.4 * 0.78;
    /*
     * LA ESCARPADURA: no cuánto sube, sino CÓMO.
     *
     * Una sierra puede ser un macizo ancho de media altura o un espolón de agujas
     * sobre un valle bajo, y las dos son montañas. Lo que las separa no es el techo
     * sino cómo se reparte la altura por la superficie, y eso es un EXPONENTE sobre el
     * perfil del ruido:
     *
     *   · exponente bajo (0,62): levanta la parte media del ruido, así que casi toda
     *     la comarca sube y sale un macizo con la cumbre plana.
     *   · exponente alto (1,95): hunde la parte media y deja sólo lo más alto, así que
     *     la comarca se queda baja y de ella salen agujas.
     *
     * Y el techo va acompañando: una comarca encrespada recibe un tercio más de techo
     * porque va a usarlo en muy poca superficie —sus agujas llegan a diez u once
     * escalones, más de veinte personas—, y una maciza recibe un cuarto menos porque
     * lo va a usar en toda. Sin ese acompañamiento, o los macizos salían absurdos o
     * las agujas no despuntaban.
     */
    const escarpadura = fraccion(c.hex.q, c.hex.r, canal(CANAL.escarpadura));
    const techo = techoDelBioma(c.terreno) * caracter * temple * (0.75 + escarpadura * 0.55);

    /*
     * EL CORTE: si esta sierra se deshilacha en estribaciones o se acaba en seco.
     *
     * Las dos cosas existen y las dos son realistas. Una cordillera erosionada baja
     * en faldas largas hasta la llanura; una levantada por una falla se corta contra
     * el llano como un muro, sin transición. Lo primero es lo corriente y lo segundo
     * pasa lo bastante como para que un tablero que nunca lo hiciera se notara pobre.
     *
     * Aquí es un solo número: lo ancha que es la FALDA. Con corte bajo la falda mide
     * casi una comarca y el terreno baja despacio; con corte alto mide una quinta
     * parte y la montaña termina en un escarpe.
     */
    const corte = fraccion(c.hex.q, c.hex.r, canal(CANAL.corte));

    return {
      punto: centroDeHex(c.hex, RADIO_DE_COMARCA),
      techo,
      dureza: 0.62 + escarpadura * 1.33,
      /*
       * LA MESETA: hasta dónde manda esta comarca a plena altura. Es más de medio
       * radio, así que una sierra ocupa su comarca de verdad en vez de ser un cono en
       * el centro — que es lo que salía cuando el alcance y la brusquedad eran el
       * mismo número y había que elegir entre una cosa o la otra.
       */
      meseta: RADIO_DE_COMARCA * 0.5,
      /* Y LA FALDA: lo que tarda en bajar a nada. Aquí manda el corte. */
      falda: RADIO_DE_COMARCA * (0.16 + (1 - corte) ** 1.6 * 0.95) * (1 + techo * 0.05),
    };
  });

  /**
   * CUÁNTO PUEDE SUBIR EL TERRENO EN UN PUNTO.
   *
   * ═══ MÁXIMO SUAVE, NO PROMEDIO. ÉSTA ES LA REGLA ═══
   *
   * La primera versión promediaba los techos de todas las comarcas con pesos
   * gaussianos, y eso es físicamente falso: una montaña rodeada de praderas se
   * ahogaba en el promedio y salía una loma. Medido, con techo declarado 7 los picos
   * no pasaban del nivel 3 — dieciséis unidades, seis personas y media— y nunca
   * llegaban a la cota de nieve.
   *
   * Una montaña no baja porque tenga vecinos llanos. Lo que hace es lo contrario:
   * LEVANTA a sus vecinos. Así que lo que se mezcla no es la media sino un máximo
   * suave —la norma-p de las contribuciones—, que en el centro de una comarca vale su
   * propio techo y entre dos comarcas se queda con el mayor de los dos, subiendo un
   * poco donde ambos coinciden. Que un valle entre dos sierras esté más alto que
   * cualquiera de ellas por separado no es un artefacto: es lo que pasa.
   *
   * ═══ Y EL ALCANCE CRECE CON LA ALTURA ═══
   *
   * La falda de un macizo de siete escalones llega casi al doble de lejos que la de
   * una loma. Eso es lo que hace que la pradera de al lado de una montaña deje de ser
   * llana aunque su propio techo sea 0,3, y es lo que convierte una montaña suelta en
   * una cordillera con estribaciones.
   *
   * Lo gaussiano importa: no tiene borde, así que no puede aparecer un círculo de
   * influencia ni un salto donde se corta la suma. Y el retorcido importa más: sin él,
   * la frontera entre dos biomas es la mediatriz entre sus centros, o sea una recta, y
   * en una malla hexagonal seis rectas dibujan el hexágono. Con él, la montaña baja
   * por un valle y se mete en el bosque.
   */
  function techoEn(p: Punto): { techo: number; dureza: number } {
    const w = deforma(
      p.x,
      p.y,
      ESCALA_DEL_RETORCIDO,
      FUERZA_DEL_RETORCIDO_DE_BIOMA,
      canal(CANAL.retorcidoDelBioma),
    );
    let suma = 0;
    let dureza = 0;
    let peso = 1e-9;
    for (const c of centros) {
      const dx = w.x - c.punto.x;
      const dy = w.y - c.punto.y;
      const k = cuantoLlega(Math.hypot(dx, dy), c.meseta, c.falda);
      suma += (k * c.techo) ** DUREZA_DEL_MAXIMO;
      /*
       * La escarpadura se mezcla con un promedio normal y no con el máximo suave: es
       * una FORMA, no una cantidad. Con el máximo, una comarca encrespada volvería
       * agujas a todas sus vecinas; con el promedio, la transición entre un macizo y
       * un espolón es gradual, que es como pasa en una cordillera de verdad.
       */
      dureza += k * c.dureza;
      peso += k;
    }
    return { techo: suma ** (1 / DUREZA_DEL_MAXIMO), dureza: dureza / peso };
  }

  /**
   * LA ALTURA CONTINUA EN UN PUNTO, antes de cortarla en escalones.
   *
   * El perfil se elige según lo alto que pueda llegar el sitio: donde hay montaña se
   * usa ruido de CRESTA, que da filos y valles en uve; donde hay llano, ruido normal,
   * que da lomas suaves. Y se mezclan gradualmente, así que una falda de montaña
   * pasa de cresta a loma sin que se note dónde.
   */
  function alturaCruda(p: Punto): number {
    const { techo, dureza } = techoEn(p);
    if (techo < 0.05) return 0;

    const w = deforma(
      p.x,
      p.y,
      ESCALA_DEL_RETORCIDO,
      FUERZA_DEL_RETORCIDO,
      canal(CANAL.retorcidoDelRelieve),
    );
    const x = w.x / ESCALA_DEL_RELIEVE;
    const y = w.y / ESCALA_DEL_RELIEVE;

    const loma = fbm(x, y, canal(CANAL.loma), 4);
    const cresta = fbmDeCresta(x, y, canal(CANAL.cresta), 4);
    const cuantaSierra = Math.min(1, techo / 2.5);
    const mezcla = loma * (1 - cuantaSierra) + cresta * cuantaSierra;

    /*
     * EL PERFIL SE LEVANTA CON UNA RAÍZ, y no es cosmética.
     *
     * El ruido de cresta eleva al cuadrado para afilar el filo, y eso le baja la media
     * de 0,5 a 0,33. Multiplicado por el techo, una montaña declarada a nueve escalones
     * se quedaba de media en tres: masas anchas y bajas con alguna aguja suelta, en vez
     * de un macizo. La potencia 0,72 devuelve la media a donde tiene que estar sin
     * tocar los extremos —el cero sigue siendo cero y el uno sigue siendo uno—, así que
     * los valles siguen al fondo y las cumbres siguen arriba: lo que sube es la MASA
     * intermedia, que es de lo que está hecha una montaña.
     */
    return techo * mezcla ** dureza;
  }

  /*
   * LOS RELLANOS DE LOS VÉRTICES.
   *
   * ═══ POR QUÉ SE APLANA EL CAMPO CONTINUO Y NO EL NIVEL YA CORTADO ═══
   *
   * Ésta es la corrección de un fallo que hacía exactamente lo contrario de lo que
   * pretendía, y conviene que quede escrito.
   *
   * La primera versión forzaba las siete teselas del disco a la cota de UNA sola —la
   * que contiene el vértice— después de cortar en escalones. Como el terreno alrededor
   * seguía a lo suyo, el disco quedaba levantado o hundido respecto de su borde, y ahí
   * aparecía un muro de DOS escalones. Y un muro de dos escalones no lo salva ninguna
   * rampa del pack, porque las rampas suben exactamente uno. Medido sobre un mundo de
   * montaña: sin aplanar había 2 aristas con desnivel de dos; con el aplanado, 18. O
   * sea que el remedio fabricaba dieciséis muros insalvables, y los fabricaba JUSTO en
   * los sitios donde hay que construir y por donde tienen que pasar los caminos.
   *
   * Aplanando el campo CONTINUO el problema no se arregla: no llega a existir. La
   * altura del vértice se mezcla con la del terreno con un peso que va de uno en el
   * vértice a cero a dos teselas y media, y como la mezcla es suave, la pendiente
   * también lo es. Al cortar en escalones después, los saltos siguen siendo de uno.
   *
   * Y no levanta ni hunde nada: la cota a la que aplana es la que el terreno YA tenía
   * en ese punto. Lo único que hace es quitarle la pendiente alrededor, que es lo que
   * hace cualquiera que va a construir en una ladera.
   */
  const cotaDelRellano = new Map<string, { punto: Punto; cota: number }>();
  {
    for (const v of verticesDe(unicas.map((c) => c.hex))) {
      const p = puntoDeVertice(v, RADIO_DE_COMARCA);
      cotaDelRellano.set(v, { punto: p, cota: alturaCruda(p) });
    }
  }

  /**
   * LA CURVA DEL ALLANAMIENTO: uno en el vértice, cero al borde del rellano.
   *
   * Es el mismo quíntico que suaviza el ruido, y por el mismo motivo: con una recta,
   * la PENDIENTE salta en el borde del rellano y ahí aparece una arruga que se ve en
   * las sombras.
   */
  function pesoDelRellano(d: number): number {
    if (d >= RADIO_DE_RELLANO) return 0;
    const t = 1 - d / RADIO_DE_RELLANO;
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * LA ALTURA CONTINUA DEFINITIVA: el terreno con los rellanos ya mezclados.
   *
   * Los vértices del tablero están a un radio de comarca unos de otros —setenta y
   * seis unidades— y el rellano alcanza dieciséis, así que dos rellanos no pueden
   * solaparse nunca. Por eso basta con buscar el más cercano en vez de mezclar todos:
   * es una cuenta de cincuenta y cuatro distancias y no una suma ponderada.
   */
  function conRellano(p: Punto, cruda: number): number {
    let mejor = 0;
    let cota = 0;
    for (const { punto, cota: suya } of cotaDelRellano.values()) {
      const d = Math.hypot(p.x - punto.x, p.y - punto.y);
      if (d >= RADIO_DE_RELLANO) continue;
      const w = pesoDelRellano(d);
      if (w > mejor) {
        mejor = w;
        cota = suya;
      }
    }
    return mejor <= 0 ? cruda : cruda * (1 - mejor) + cota * mejor;
  }

  /**
   * La misma cuenta partiendo del punto, para quien no tenga el perfil cacheado.
   *
   * La usan las piezas que se apoyan en un sitio arbitrario —un poblado en un
   * vértice, un tramo de camino— y los vecinos de fuera del tablero. Dentro del
   * mundo se usa la versión que lee el array, que es mucho más barata.
   */
  function alturaContinua(p: Punto): number {
    const crudo = alturaCruda(p);
    const c = aguasListas === null ? Number.POSITIVE_INFINITY : aguasListas.conoEn(p);
    return conRellano(p, c < crudo ? c : crudo);
  }

  /*
   * El agua no está lista mientras se construye el propio mundo: `alturaCruda` la
   * necesita antes de que exista. Esta referencia se rellena en cuanto está, y hasta
   * entonces `alturaContinua` devuelve el terreno sin cavar — que es exactamente lo
   * que la hidrología tiene que mirar.
   */
  let aguasListas: Aguas | null = null;

  /** ¿Está esta tesela dentro del rellano de algún vértice? Para dejarla despejada. */
  function esRellano(centro: Punto): boolean {
    for (const { punto } of cotaDelRellano.values()) {
      if (Math.hypot(centro.x - punto.x, centro.y - punto.y) < RADIO_DE_RELLANO * 0.55) {
        return true;
      }
    }
    return false;
  }

  /**
   * ¿HAY NIEVE AQUÍ?
   *
   * Por encima de la cota, y la cota ondula. El vaivén sale de un ruido continuo a
   * escala de media comarca, no de un revoltijo por tesela: con un revoltijo saldría
   * nieve salpicada entre roca pelada, como sal derramada, y lo que hace falta son
   * MANCHAS — un manto continuo con lenguas que bajan por las vaguadas y calvas donde
   * pega el sol. Es lo mismo que hace el propio terreno, y por el mismo motivo.
   */
  function hayNieve(centro: Punto, nivel: number): boolean {
    if (nivel < NIEVE_DESDE - VAIVEN_DE_LA_NIEVE) return false;
    const vaiven =
      (fbm(
        centro.x / (RADIO_DE_COMARCA * 0.55),
        centro.y / (RADIO_DE_COMARCA * 0.55),
        canal(CANAL.nieve),
        3,
      ) -
        0.5) *
      2 *
      VAIVEN_DE_LA_NIEVE;
    return nivel >= NIEVE_DESDE + vaiven;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * EL MUNDO, CONSTRUIDO UNA VEZ
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * ═══ POR QUÉ ESTO SE CALCULA ENTERO DE GOLPE Y NO COMARCA A COMARCA ═══
   *
   * Porque `alturaCruda` es CARA —una mezcla sobre las diecinueve comarcas, dos
   * deformaciones de dominio y ocho octavas de ruido— y se pedía muchas veces por la
   * misma subtesela: una para su nivel, seis más en `rampaDe` mirando a los vecinos, y
   * siete más en `habitabilidadDe` haciendo lo mismo. Catorce evaluaciones por tesela,
   * casi cuarenta mil en un mundo, para calcular dos mil setecientos números.
   *
   * Calculándolo una vez en un array indexado por entero, el mundo se levanta en una
   * fracción de lo que costaba. Y hace falta además por otra razón: la hidrología
   * necesita el campo ENTERO a la vez —una inundación prioritaria no se puede hacer
   * comarca a comarca— así que el array es también su entrada.
   *
   * El índice es por `(q,r)` ENTERO, nunca por una clave de coma flotante.
   */

  /** La llave entera de una subtesela. */
  function llaveDeSub(sub: Hex): string {
    return `${String(sub.q)},${String(sub.r)}`;
  }

  const subteselas: Hex[] = [];
  const indice = new Map<string, number>();
  const deComarca: Hex[] = [];
  const rangos: number[] = [];
  for (const c of unicas) {
    const centroSub: Hex = { q: c.hex.q * TESELAS_POR_RADIO, r: c.hex.r * TESELAS_POR_RADIO };
    for (const paso of mallaDeRadio(ALCANCE_DE_BUSQUEDA)) {
      const sub: Hex = { q: centroSub.q + paso.q, r: centroSub.r + paso.r };
      const suya = comarcaDeSubtesela(sub);
      if (suya.q !== c.hex.q || suya.r !== c.hex.r) continue;
      indice.set(llaveDeSub(sub), subteselas.length);
      subteselas.push(sub);
      deComarca.push(c.hex);
      rangos.push((Math.abs(paso.q) + Math.abs(paso.r) + Math.abs(paso.q + paso.r)) / 2);
    }
  }
  /* ── EL DELANTAL: QUE EL MUNDO CUBRA SUS PROPIOS VÉRTICES ─────────────────
   *
   * ═══ QUÉ PASABA ═══
   *
   * Dieciséis de los cincuenta y cuatro vértices del tablero NO tenían ni una
   * subtesela debajo. Medido, en todas las semillas, siempre los mismos dieciséis.
   *
   * ═══ POR QUÉ, QUE ES LO INTERESANTE ═══
   *
   * El reparto de subteselas en comarcas es una partición EXACTA del plano: cada
   * subtesela pertenece a una comarca y a una sola, existan o no. El mundo son las
   * subteselas de las diecinueve comarcas que hay, así que su contorno es exactamente
   * el borde de esas diecinueve.
   *
   * Y un vértice del tablero es una ESQUINA de comarca: cae JUSTO ENCIMA de ese
   * contorno. La subtesela que lo contiene puede tocarle a cualquiera de las tres
   * comarcas que se juntan ahí, y en el borde del tablero una o dos de esas tres no
   * existen. O sea que era una moneda al aire: de los treinta vértices del perímetro,
   * catorce caían dentro y dieciséis fuera.
   *
   * No era un fallo de redondeo que se pudiera apretar con un epsilon. Era el mundo
   * cortado exactamente por donde se construye.
   *
   * ═══ LO QUE SE ROMPÍA, QUE ERAN DOS COSAS Y NO UNA ═══
   *
   *   · `alturaEn` de esos vértices devolvía CERO tan tranquilo —no hay tesela que
   *     mirar—, así que un poblado fundado ahí se hundía o flotaba, según el terreno.
   *   · Y el veto de agua sobre los vértices se calcula mapeando cada vértice a su
   *     subtesela y filtrando los que no existen. Dieciséis se caían por ese filtro
   *     sin decir nada, así que el río podía pasar justo por donde se construye.
   *
   * ═══ EL ARREGLO ═══
   *
   * Se añaden las subteselas que faltan para que CADA vértice tenga suelo bajo los
   * pies y su anillo de seis alrededor — que es lo que ocupa una fortaleza, así que
   * es la unidad correcta y no una elección estética. Son 112 subteselas sobre 2.736,
   * un 4,1%.
   *
   * Cada una se arrima a la comarca EXISTENTE más cercana, que es la que le da su
   * bioma: así el delantal continúa el terreno de al lado en vez de inventarse uno.
   * La partición sigue siendo exacta para todo lo demás; esto es un añadido explícito
   * encima, y por eso se hace aquí y no tocando `comarcaDeSubtesela`, que es pura y
   * tiene que seguir siéndolo.
   *
   * Efecto secundario, y bueno: el contorno del mundo deja de ser el borde geométrico
   * de diecinueve hexágonos y se ensancha un poco en cada vértice. La costa se lee
   * menos como el recorte de una plantilla.
   */
  {
    const centrosDeComarca = unicas.map((c) => ({
      hex: c.hex,
      punto: centroDeHex(c.hex, RADIO_DE_COMARCA),
    }));

    /** La comarca existente cuyo centro cae más cerca. Desempate entero. */
    function comarcaMasCercana(centro: Punto): Hex {
      let mejor = centrosDeComarca[0] as (typeof centrosDeComarca)[number];
      let corta = Infinity;
      for (const c of centrosDeComarca) {
        const d = (c.punto.x - centro.x) ** 2 + (c.punto.y - centro.y) ** 2;
        if (d < corta - 1e-9 || (Math.abs(d - corta) <= 1e-9 && comparaHex(c.hex, mejor.hex) < 0)) {
          corta = d;
          mejor = c;
        }
      }
      return mejor.hex;
    }

    function agrega(sub: Hex): void {
      if (indice.has(llaveDeSub(sub))) return;
      const suya = comarcaMasCercana(centroDeHex(sub, RADIO_DE_TESELA));
      const dq = sub.q - suya.q * TESELAS_POR_RADIO;
      const dr = sub.r - suya.r * TESELAS_POR_RADIO;
      indice.set(llaveDeSub(sub), subteselas.length);
      subteselas.push(sub);
      deComarca.push(suya);
      rangos.push((Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2);
    }

    for (const { punto } of cotaDelRellano.values()) {
      const centro = hexDePunto(punto, RADIO_DE_TESELA);
      agrega(centro);
      for (let k = 0; k < 6; k++) agrega(vecino(centro, k));
    }
  }

  const N = subteselas.length;

  /** El centro de cada subtesela, y su altura CRUDA. Calculados una vez. */
  const centrosDeSub: Punto[] = new Array<Punto>(N);
  const perfil = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const c = centroDeHex(subteselas[i] as Hex, RADIO_DE_TESELA);
    centrosDeSub[i] = c;
    perfil[i] = alturaCruda(c);
  }

  /* ── EL AGUA, ANTES QUE LOS RELLANOS ──────────────────────────────────────
   *
   * El orden es parte del algoritmo. La hidrología se resuelve sobre el campo CRUDO
   * —sin rellanos y sin plazas—, de ahí sale el cono de cavado, y sólo DESPUÉS se
   * mezclan los rellanos, que leen ya el terreno cavado.
   *
   * Al revés, el rellano de un vértice levantaría el lecho justo por donde el agua
   * tiene que pasar. Y no hay ciclo: la hidrología no mira los rellanos y los
   * rellanos no miran la hidrología, sólo su resultado. Una sola dirección.
   */
  /*
   * LOS ÍNDICES DE LOS VÉRTICES, Y POR QUÉ SE CUENTAN LOS QUE FALTAN.
   *
   * Esto era un `.map(...).filter(i => i !== undefined)` en la llamada de abajo, y el
   * filtro se tragaba en silencio los dieciséis vértices que no tenían subtesela. El
   * veto de agua sobre los sitios de construcción nunca llegaba a ellos: el río podía
   * pasar justo por donde se funda un poblado, y no había nada que mirar.
   *
   * Con el delantal no debería faltar ninguno NUNCA. Pero un invariante que sólo se
   * cumple por construcción y no se mide es un invariante que alguien romperá sin
   * enterarse, así que el hueco se cuenta y sale por `verticesSinSuelo`. Es la misma
   * lección del `.filter` de antes, aplicada a su propio arreglo: el problema no era
   * el filtro, era que tiraba sin contar.
   */
  const indicesDeLosVertices: number[] = [];
  let verticesSinSuelo = 0;
  for (const v of cotaDelRellano.values()) {
    const i = indice.get(llaveDeSub(hexDePunto(v.punto, RADIO_DE_TESELA)));
    if (i === undefined) verticesSinSuelo++;
    else indicesDeLosVertices.push(i);
  }

  const aguas = trazaLasAguas({
    n: N,
    subteselas,
    centros: centrosDeSub,
    perfil,
    terrenos: subteselas.map((_, i) => terrenoDeComarca(deComarca[i] as Hex)),
    comarcas: deComarca,
    enVertices: indicesDeLosVertices,
    enPlazas: unicas
      .map((c) =>
        indice.get(
          llaveDeSub({ q: c.hex.q * TESELAS_POR_RADIO, r: c.hex.r * TESELAS_POR_RADIO }),
        ),
      )
      .filter((i): i is number => i !== undefined),
    indiceDe: (sub: Hex) => indice.get(llaveDeSub(sub)),
    semilla,
  });

  aguasListas = aguas;

  /** El terreno cavado de cada subtesela: lo que diga el ruido, o el cono si es menor. */
  const cavado = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const c = aguas.cono[i] as number;
    const crudo = perfil[i] as number;
    cavado[i] = c < crudo ? c : crudo;
  }

  /**
   * LA ALTURA FINAL DE UNA SUBTESELA DEL MUNDO, ya cavada y con su rellano mezclado.
   *
   * Parte del array cacheado en vez de volver a evaluar el ruido: la mezcla del
   * rellano cuesta cincuenta y cuatro distancias y el perfil costaba mucho más.
   */
  function alturaDeIndice(i: number): number {
    return conRellano(centrosDeSub[i] as Punto, cavado[i] as number);
  }

  /** Los niveles enteros de todo el mundo, en el mismo orden. */
  const niveles = new Int16Array(N);
  for (let i = 0; i < N; i++) {
    const n = Math.round(alturaDeIndice(i));
    niveles[i] = n < 0 ? 0 : n;
  }

  /**
   * UNA PLAYA QUE NO LLEGA AL AGUA NO ES UNA PLAYA: ES UN ACANTILADO.
   *
   * ═══ LA REGLA DECIDÍA CON UN NIVEL Y SE PINTABA OTRO ═══
   *
   * La regla de costas de `aguas.ts` juzga con `nivelTrasCavar`, que es la altura
   * después de excavar el río y ANTES de mezclar los rellanos de los vértices. Y lo
   * que se dibuja es el nivel de aquí, que es el de después. Entre los dos hay un paso
   * más: el rellano, que levanta o baja la celda para dejarla llana donde se construye.
   *
   * Así que una celda del borde podía valer cero para la regla —«toca el mar, ponle
   * playa»— y acabar dibujada un escalón más arriba. El resultado es una tesela de
   * costa con su arena colgando 5,47 unidades sobre el mar, o sea dos personas de aire
   * entre la playa y el agua.
   *
   * Medido sobre sesenta tableros: 51 lados así, TODOS en el borde del tablero y
   * ninguno al revés —ninguna playa hundida—, lo que encaja con la causa: el rellano
   * de un vértice del perímetro levantando su celda.
   *
   * ═══ POR QUÉ SE QUITA EL LADO Y NO SE BAJA LA TESELA ═══
   *
   * Bajarla desharía el rellano, que existe para que ahí se pueda construir, y en el
   * borde del tablero eso es justo donde acabamos de garantizar que hay suelo. Así que
   * se quita la playa: la tesela se dibuja como terreno normal y enseña su canto contra
   * el agua, que es exactamente lo que es. El pack no tiene pieza de acantilado costero
   * y el canto de la tesela hace ese papel sin inventar nada.
   *
   * Se comprueba lado a lado y no de golpe: una celda puede tocar un lago a su mismo
   * nivel por un lado y el mar un escalón más abajo por otro. El primero conserva su
   * playa; el segundo la pierde.
   */
  const orillaANivel = new Uint8Array(N);
  const SEIS_DEL_PACK = Math.PI / 3;
  for (let i = 0; i < N; i++) {
    const bits = aguas.orilla[i] as number;
    if (bits === 0) continue;
    const sub = subteselas[i] as Hex;
    const centro = centrosDeSub[i] as Punto;
    let limpio = bits;
    for (let k = 0; k < 6; k++) {
      const v = vecino(sub, k);
      const c = centroDeHex(v, RADIO_DE_TESELA);
      /* El lado del pack sale del ángulo, no de una tabla: ver `asentamiento.ts`. */
      const lado =
        (Math.round(Math.atan2(-(c.y - centro.y), c.x - centro.x) / SEIS_DEL_PACK) + 6) % 6;
      if ((bits & (1 << lado)) === 0) continue;
      const j = indice.get(llaveDeSub(v));
      /* Fuera del mundo está el mar, y el mar está al nivel cero. */
      const nivelDelAgua = j === undefined ? 0 : (aguas.nivelAgua[j] as number);
      if ((niveles[i] as number) !== nivelDelAgua) limpio &= ~(1 << lado);
    }
    orillaANivel[i] = limpio;
  }

  /**
   * EL NIVEL DE UNA SUBTESELA CUALQUIERA, esté o no dentro del mundo.
   *
   * Dentro se lee del array; fuera se calcula. Lo de fuera pasa sólo al mirar los
   * vecinos de una tesela del borde, y hace falta que devuelva algo coherente en vez
   * de un caso especial: así `rampaDe` y `habitabilidadDe` no necesitan saber dónde
   * se acaba el tablero.
   */
  function nivelDeSub(sub: Hex): number {
    const i = indice.get(llaveDeSub(sub));
    if (i !== undefined) return niveles[i] as number;
    const n = Math.round(alturaContinua(centroDeHex(sub, RADIO_DE_TESELA)));
    return n < 0 ? 0 : n;
  }

  /**
   * ¿ES ESTA TESELA UNA RAMPA, Y HACIA DÓNDE MIRA?
   *
   * Lo es si tiene algún vecino exactamente UN escalón más alto y el ruido dice que
   * sí. La mitad de la ladera queda en rampa y la otra mitad en pared, que es lo que
   * hace que una terraza siga leyéndose como terraza desde el aire y sea subible a
   * pie — que era la condición que pedía la vista en tercera persona.
   *
   * El giro es el ángulo del vecino elevado medido como lo mide `three`
   * —`atan2(-z, x)`, con la `z` del mundo siendo la `y` de la malla—, porque la
   * rampa del pack nace subiendo hacia su lado 0 y `rotation.y` la lleva donde haga
   * falta. Así no hay ninguna tabla de índices de lado que pueda desincronizarse.
   *
   * Un rellano NUNCA es rampa: es donde se construye, y tiene que estar llano.
   */
  function rampaDe(sub: Hex, nivelAqui: number, centro: Punto): number | null {
    if (esRellano(centro)) return null;
    if (fraccion(sub.q, sub.r, canal(CANAL.rampa)) > CUANTAS_RAMPAS) return null;
    for (let k = 0; k < DIRECCIONES.length; k++) {
      const v = vecino(sub, k);
      if (nivelDeSub(v) !== nivelAqui + 1) continue;
      const p = centroDeHex(v, RADIO_DE_TESELA);
      return Math.atan2(-(p.y - centro.y), p.x - centro.x);
    }
    return null;
  }

  /**
   * LO BIEN QUE SE PRESTA UN SITIO A QUE CREZCA UN PUEBLO.
   *
   * ═══ POR QUÉ NO ES UNA MANCHA DE RUIDO PUESTA ENCIMA DEL MAPA ═══
   *
   * Porque entonces habría pueblos en la cresta de una sierra y en mitad de una
   * cuesta, que es lo que pasaba cuando los pueblos iban «en el centro de la
   * comarca»: un sitio elegido por la geometría del tablero y no por el terreno.
   *
   * Esto multiplica tres cosas, y las tres significan algo:
   *
   *   · LO LLANO que está, mirando el desnivel con sus seis vecinas. Un sitio con un
   *     escalón alrededor ya vale la mitad; con tres, la cuarta parte.
   *   · LO BAJO que está. La gente se asienta en los valles, no en los picos.
   *   · UNA MANCHA de ruido, que decide en cuál de todos los sitios buenos cuajó de
   *     verdad un asentamiento. Sin ella saldrían pueblos en TODA la vega, que es
   *     tan falso como que salgan en la cima.
   *
   * El producto hace que baste con que un factor sea malo para descartar el sitio,
   * que es justo cómo funciona: una llanura preciosa donde no se asentó nadie sigue
   * sin tener pueblo, y una cima llana tampoco lo tiene por muy llana que esté.
   */
  function habitabilidadDe(sub: Hex): number {
    const aqui = nivelDeSub(sub);
    let desnivel = 0;
    for (let k = 0; k < DIRECCIONES.length; k++) {
      desnivel += Math.abs(nivelDeSub(vecino(sub, k)) - aqui);
    }
    const llano = 1 / (1 + desnivel);
    const bajo = 1 / (1 + aqui * 0.8);
    const centro = centroDeHex(sub, RADIO_DE_TESELA);
    const mancha = fbm(
      centro.x / (RADIO_DE_COMARCA * 0.42),
      centro.y / (RADIO_DE_COMARCA * 0.42),
      canal(CANAL.pueblo),
      3,
    );
    return llano * bajo * mancha;
  }

  /*
   * EL FONDO COMÚN. Todas las teselas se apoyan sobre un zócalo que llega hasta
   * aquí, así que el mundo es un bloque macizo con la cara de arriba escalonada y no
   * un montón de columnas flotando.
   */
  const base = -ESCALON;

  const cache = new Map<string, Subtesela[]>();

  /**
   * LAS SUBTESELAS DE UNA COMARCA, resueltas del todo.
   *
   * Se construyen TODAS de una vez al final, leyendo del perfil cacheado, y se
   * reparten por comarca. Antes se calculaban comarca a comarca la primera vez que
   * alguien las pedía; ahora ya está todo hecho y esto sólo agrupa.
   */
  const porComarca = new Map<string, Subtesela[]>();
  for (const c of unicas) porComarca.set(llaveDeSub(c.hex), []);
  for (let i = 0; i < N; i++) {
    const sub = subteselas[i] as Hex;
    const comarca = deComarca[i] as Hex;
    const centro = centrosDeSub[i] as Punto;
    const nivel = niveles[i] as number;
    (porComarca.get(llaveDeSub(comarca)) as Subtesela[]).push({
      sub,
      comarca,
      centro,
      nivel,
      altura: nivel * ESCALON,
      rango: rangos[i] as number,
      rellano: esRellano(centro),
      habitabilidad: habitabilidadDe(sub),
      nieve: hayNieve(centro, nivel),
      agua: aguas.clase[i] as number,
      nivelDelAgua: aguas.nivelAgua[i] as number,
      cauce: aguas.mascara[i] as number,
      orilla: orillaANivel[i] as number,
      aOrilla: aguas.dOrilla[i] as number,
      porte: aguas.porte[i] as number,
      margen: aguas.margen[i] === 1,
      rampa: rampaDe(sub, nivel, centro),
    });
  }

  return {
    base,
    aguas,
    alturaContinua,
    nivelEn(p: Punto): number {
      return nivelDeSub(hexDePunto(p, RADIO_DE_TESELA));
    },
    alturaEn(p: Punto): number {
      return nivelDeSub(hexDePunto(p, RADIO_DE_TESELA)) * ESCALON;
    },
    habitabilidadEn(p: Punto): number {
      return habitabilidadDe(hexDePunto(p, RADIO_DE_TESELA));
    },
    /*
     * Copia, y no el array del caché. Devolver el interior deja que cualquiera que
     * ordene o filtre in situ corrompa el suelo de esa comarca para todas las
     * llamadas siguientes — y el síntoma sería un mundo que cambia solo entre dos
     * repintados, que es de lo peor que hay para buscar.
     */
    subteselasDe(hex: Hex): Subtesela[] {
      return (porComarca.get(llaveDeSub(hex)) ?? []).slice();
    },
    todas(): Subtesela[] {
      const salida: Subtesela[] = [];
      for (const c of unicas) salida.push(...(porComarca.get(llaveDeSub(c.hex)) ?? []));
      return salida;
    },
    verticesSinSuelo,
  };
}
