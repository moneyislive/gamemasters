/**
 * EL PRESUPUESTO DEL DELTA: los números del disco de mar, y la primera medida que
 * este mundo tiene de lo que cuesta pintarse.
 *
 * ═══ EL DELTA NO TENÍA PRESUPUESTO, Y ESO NO ES LO MISMO QUE SER BARATO ═══
 *
 * Los 110.000 triángulos de `embarcadero/presupuesto.ts` son del MUELLE, y su
 * comprobador suma piezas del muelle. Aquí no había ninguno: el mar era un
 * `circleGeometry(alcance · 6, 84)` —OCHENTA Y CUATRO triángulos— y a nadie se le
 * ocurrió contarlo porque no había nada que contar. En cuanto el mar deja de ser un
 * abanico plano y pasa a ser anillos con una distancia por vértice, sí lo hay: éste
 * es el fichero donde se ve el precio ANTES de pagarlo, que es lo que pide
 * `docs/EL-MAR-DE-RIBERAS.md` §1.6. El día que alguien suba los anillos, el número
 * cambia aquí y el comprobador lo dice; sin este fichero se descubriría en un móvil.
 *
 * ═══ SIN `three`, Y POR LA MISMA RAZÓN QUE EN EL MUELLE ═══
 *
 * Si los radios y los sectores vivieran dentro de `costa.ts` —que sí importa el motor
 * de dibujo— el comprobador tendría que arrastrar `three` para leerlos, o tendría que
 * copiarlos a mano; y una copia a mano es un número que el día menos pensado ya no es
 * el mismo. Se declaran aquí y los dos lados los importan: la escena para construir,
 * `verify:escena` para contar. No hay dos sitios que puedan discrepar.
 *
 * ═══ EL REPARTO DE ANILLOS ES LA DECISIÓN, Y SE EXPLICA ABAJO ═══
 *
 * No es un detalle de afinado: es lo que decide si la línea de espuma se ve fina o
 * dentada. Ver `radiosDelMar`.
 */
import { RADIO_DE_COMARCA, RADIO_DE_TESELA } from './escala';

/**
 * HASTA DÓNDE LLEGA EL DELTA, en unidades de mundo.
 *
 * `encuadreDelDelta` lo calcula MIDIENDO —el centro de comarca más lejano más un
 * radio— y sale este mismo número; aquí se escribe la cuenta porque un módulo que no
 * puede importar la escena necesita saberlo igual. Un delta es siempre una malla de
 * radio 2: el centro de la comarca más lejana está a `2·√3` radios de comarca del
 * origen, y su esquina un radio más allá. Salen 338,28.
 *
 * Todo lo demás de este fichero es una fracción de este número, así que un delta más
 * grande —si algún día lo hay— reajusta sus anillos solo en vez de quedarse con la
 * costa fuera de la parte fina.
 */
export const ALCANCE_DEL_DELTA = RADIO_DE_COMARCA * (2 * Math.sqrt(3) + 1);

/**
 * EL RADIO DEL DISCO, que no cambia: seis alcances, como el `circleGeometry` de hoy.
 *
 * Se conserva a propósito. El disco llega hasta donde la niebla ya se lo ha comido y
 * la cámara no puede alejarse más; tocarlo movería el horizonte, que es una decisión
 * de encuadre y no de mar.
 */
export const RADIO_DEL_DISCO = 6;

/**
 * CUÁNTOS SECTORES, y por qué son 288 y no los 84 de antes.
 *
 * Éste es el número que decide si la espuma se ve FINA O DENTADA, y sale de medir la
 * costa, no de probar. El contorno del delta está hecho de lados de subtesela: tramos
 * rectos de 6,31 —un radio de tesela— con un quiebro en cada esquina. La línea de
 * espuma es una isolínea del atributo por vértice, o sea una poligonal con un tramo
 * por triángulo: si un triángulo del mar es más ancho que un lado de la costa, esa
 * poligonal se salta los quiebros y la espuma corta las puntas.
 *
 * El aro de la costa vive entre 269 y 347 de radio. Con 288 sectores, el arco entre
 * dos vértices vecinos mide `2π·269/288 = 5,9` en la parte de dentro y `7,6` en la de
 * fuera: uno o algo más de un lado de tesela, que es justo el límite. Con los 84 de
 * antes el arco medía 20 —tres lados de costa por triángulo— y la espuma habría
 * salido recortada en sierra por encima de la forma real del terreno.
 */
export const SECTORES_DEL_MAR = 288;

/**
 * EL PASO RADIAL EN EL ARO DE LA COSTA: un radio de tesela, por lo mismo de arriba.
 *
 * De poco sirve tener el arco a la medida de la costa si los anillos van cada cien
 * unidades: la isolínea se estira en la otra dirección y la espuma sale en cuñas.
 * Radial y tangencial tienen que ir parejos, y los dos van a un lado de tesela.
 */
export const PASO_DE_LA_COSTA = RADIO_DE_TESELA;

/**
 * DÓNDE EMPIEZA Y DÓNDE ACABA EL ARO FINO, con holgura por los dos lados.
 *
 * La costa exterior de un delta de radio 2 cae entre 269 y 347 de radio —medido sobre
 * veinticuatro semillas, y no depende de la semilla: es la forma de las diecinueve
 * comarcas—. El aro fino se abre un poco más: `0,72·alcance = 244` por dentro y
 * `1,10·alcance = 372` por fuera. La holgura de dentro paga las bahías que el cierre
 * de costas abre en el borde; la de fuera deja sitio a la rompiente, que nace mar
 * adentro y no pegada a la orilla.
 *
 * Lo que queda FUERA del aro a sabiendas son los estuarios: el contorno sigue los ríos
 * tierra adentro hasta el centro del tablero —se ha medido un contorno a 41 de radio—,
 * y ahí los anillos son bastos. No es un descuido: por dentro del tablero el disco va
 * por debajo de las teselas de agua del pack, que tienen su propia lámina y lo tapan.
 * Darle paso fino a todo el interior costaría cinco veces más triángulos para pintar
 * espuma donde no se ve.
 */
export const RADIO_INTERIOR_DE_LA_COSTA = 0.72;
export const RADIO_EXTERIOR_DE_LA_COSTA = 1.1;

/**
 * CÓMO CRECEN LOS ANILLOS FUERA DEL ARO, a cada lado.
 *
 * Hacia DENTRO, un 60 % por anillo: ese trozo de disco está debajo del tablero y no se
 * ve nunca, y sólo hace falta para llegar al centro sin dejar un abanico gigante. Ocho
 * anillos bastan para cubrir 244 unidades.
 *
 * Hacia FUERA, un 18 %. Es más apretado que el 28 % del muelle, y a propósito: el
 * oleaje de mar abierto levanta el vértice con ondas de unos cincuenta de largo, y un
 * triángulo de cien no puede dibujar una onda de cincuenta —saldría una lámina lisa
 * justo donde `docs/EL-MAR-DE-RIBERAS.md` §2.3 pide las olas con cresta—. Con el 18 %
 * el primer salto tras la costa es de 67 y el mar sigue teniendo relieve hasta que la
 * niebla se lo lleva.
 */
export const RAZON_BAJO_EL_TABLERO = 1.6;
export const RAZON_DEL_HORIZONTE = 1.18;

/**
 * HASTA DÓNDE PUEDE LAMER LA ESPUMA TIERRA ADENTRO. Es un contrato, no un adorno.
 *
 * `docs/EL-MAR-DE-RIBERAS.md` §1.5: la espuma vive en el agua y se apaga antes de
 * llegar a donde se pone una choza. Quien escriba el sombreador tiene que apagarla en
 * `distancia < -ESPUMA_TIERRA_ADENTRO`, y este número dice cuánto margen tiene: un
 * radio de tesela de vaivén sobre la arena.
 *
 * Que sea suficiente NO es una opinión. Los cincuenta y cuatro vértices donde se
 * construye tienen garantizado por `relieve.ts` que su tesela y su anillo de seis son
 * tierra, así que el contorno no puede pasar a menos de DOS radios de tesela de
 * ninguno de ellos —12,63—, y `verify:escena` lo mide sobre semillas de verdad. Con la
 * espuma a 6,31 sobra un radio entero de tesela.
 */
export const ESPUMA_TIERRA_ADENTRO = RADIO_DE_TESELA;

/**
 * LOS RADIOS DE LOS ANILLOS, en orden y sin repetir, empezando por el centro.
 *
 * Tres tramos, y el de en medio es el que importa:
 *
 *   1. Del centro al aro, creciendo un 60 % por anillo. Tapado por el tablero.
 *   2. EL ARO DE LA COSTA, a paso fijo de un radio de tesela. Aquí es donde se
 *      interpola la distancia a la costa, y por tanto donde se dibuja la espuma.
 *   3. Del aro al horizonte, creciendo un 18 %.
 *
 * El índice 0 es el centro —un solo punto, repetido en todos los sectores, igual que
 * en el mar del muelle— y el último es el borde exacto del disco.
 */
export function radiosDelMar(alcance = ALCANCE_DEL_DELTA): number[] {
  const dentro = RADIO_INTERIOR_DE_LA_COSTA * alcance;
  const fuera = RADIO_EXTERIOR_DE_LA_COSTA * alcance;
  const borde = RADIO_DEL_DISCO * alcance;

  const radios: number[] = [0];
  for (let r = PASO_DE_LA_COSTA; r < dentro; r *= RAZON_BAJO_EL_TABLERO) radios.push(r);
  for (let r = dentro; r < fuera; r += PASO_DE_LA_COSTA) radios.push(r);
  for (let r = fuera; r < borde; r *= RAZON_DEL_HORIZONTE) radios.push(r);
  radios.push(borde);
  return radios;
}

/** Cuántos anillos tiene el disco. Es `radiosDelMar().length`, dicho aparte para contar. */
export function anillosDelMar(alcance = ALCANCE_DEL_DELTA): number {
  return radiosDelMar(alcance).length;
}

/**
 * LOS TRIÁNGULOS DEL DISCO: un abanico en el centro y dos por celda en los demás
 * anillos. Es la misma cuenta que hace `geometriaDelMar`, escrita sin `three`.
 */
export function triangulosDelMar(alcance = ALCANCE_DEL_DELTA): number {
  const anillos = anillosDelMar(alcance);
  return SECTORES_DEL_MAR + (anillos - 2) * SECTORES_DEL_MAR * 2;
}

/**
 * LO QUE CUESTA EL MAR NUEVO, escrito para que se vea cuando cambie.
 *
 * Cuarenta y dos anillos por doscientos ochenta y ocho sectores: 12.096 vértices y
 * 23.328 triángulos, contra los 84 del abanico de antes. Es el precio de que la
 * espuma siga la forma del terreno en vez de un círculo.
 *
 * Para situarlo: el muelle entero cabe en 110.000 con seis personajes dentro, y una
 * sola comarca del delta pone ciento cuarenta y cuatro teselas del pack. El mar no es
 * lo caro de esta escena; lo que hacía falta era poder decirlo con un número.
 */
export const TRIANGULOS_DEL_MAR = 23_328;

/**
 * EL TOPE, que es lo que convierte el número de arriba en un freno.
 *
 * Un recuento sin tope es un dato; con tope es una decisión. Subir los sectores a 512
 * —la tentación evidente cuando alguien mire una captura de cerca— pondría el mar en
 * 41.000 y se comería el margen de la escena entera sin que nadie lo hubiera pesado.
 */
export const TOPE_DEL_MAR = 24_000;

// ---------------------------------------------------------------------------
// LA MESA: el segundo número del delta con tope, escrito al lado del del mar
// ---------------------------------------------------------------------------

/**
 * CUÁNTOS SEGMENTOS TIENE LA TAPA A LO LARGO, según el ancho del lienzo EN PUNTOS.
 *
 * La resolución de la veta es la de los vértices: con 96 segmentos un segmento mide 5,9
 * puntos en 568 de ancho, 8,8 en 844 y 20 en 1.920. Veinte puntos interpolados se ven
 * blandos en un monitor, así que los segmentos se escalan con el ancho —uno cada
 * `puntosPorSegmento`— acotados entre un mínimo (por debajo la veta es una mancha) y un
 * máximo, que es lo que el tope de abajo cubre. Aquí y no en `mesa.ts` porque es lo que
 * decide el precio, y el precio se lee en este fichero.
 */
export const SEGMENTOS_DE_LA_MESA = { minimo: 64, maximo: 240, puntosPorSegmento: 8 } as const;
/** Cuántas filas a lo ancho: dos por tablón. */
export const FILAS_DE_LA_MESA = 6;

export function segmentosDeLaMesa(anchoEnPuntos: number): number {
  const pedidos = Math.round(anchoEnPuntos / SEGMENTOS_DE_LA_MESA.puntosPorSegmento);
  return Math.min(SEGMENTOS_DE_LA_MESA.maximo, Math.max(SEGMENTOS_DE_LA_MESA.minimo, pedidos));
}

/**
 * LO QUE CUESTAN LOS DOS DADOS, y por qué son DOS números y se suma el MÁXIMO.
 *
 * `Dados` pinta el D6 de KayKit horneado (`escenas/modelos/dados.glb`) si el catálogo lo
 * trae y el respaldo procedimental si no (`cubo-del-dado.ts`): una caja de 12 triángulos y
 * veintiún puntos de diez lados fundidos, 222 por dado, 444 los dos. El D6 del pack cuesta
 * 662 por dado (521 vértices, medido al compilar; `verify:dados` exige ese número exacto),
 * 1.324 los dos: tres veces el respaldo. Si `triangulosDeLaMesa` sumara sólo el modelo, la
 * comprobación que construye el respaldo con `three` se pondría roja sin que nada estuviera
 * mal; si sumara sólo el respaldo, el tope dejaría de vigilar lo que se pinta cuando el
 * pack está. Con el máximo, `verify:escena` cuenta el respaldo contra el máximo (menor o
 * igual) y el `.glb` contra `TRIANGULOS_DE_LOS_DADOS_DEL_PACK` (igual).
 */
export const TRIANGULOS_DEL_RESPALDO_DE_LOS_DADOS = 2 * (12 + 21 * 10);
export const TRIANGULOS_DE_LOS_DADOS_DEL_PACK = 2 * 662;
export const TRIANGULOS_DE_LOS_DADOS = Math.max(TRIANGULOS_DEL_RESPALDO_DE_LOS_DADOS, TRIANGULOS_DE_LOS_DADOS_DEL_PACK);

/**
 * LO QUE CUESTA LA MESA ENTERA, con la tapa a `segmentos`: `12 · segmentos + 1.470`.
 *
 * Sumando por pieza, medido con `three` en Node:
 *   · la tapa: `2 · segmentos · FILAS_DE_LA_MESA` triángulos, sin canto (su frente queda
 *     fuera del lienzo);
 *   · dos dados: el máximo de arriba, 1.324 con el D6 del pack (444 con el respaldo);
 *   · el asa de los dados, una caja invisible → 12;
 *   · el tapete del turno → 2;
 *   · seis sombras de contacto de 20 segmentos fundidas en una geometría → 120;
 *   · la pila del mazo, una caja escalada → 12.
 *
 * Son 2.622 con 96 segmentos y 4.350 con 240: el 11,2 % y el 18,6 % del mar. Es UN total,
 * el mismo aquí y en el comprobador, para que el número salga de la misma cuenta.
 */
const TRIANGULOS_DEL_ASA_DE_LOS_DADOS = 12;
const TRIANGULOS_DEL_TAPETE = 2;
const TRIANGULOS_DE_LAS_SOMBRAS = 6 * 20;
const TRIANGULOS_DE_LA_PILA = 12;
export const TRIANGULOS_FIJOS_DE_LA_MESA =
  TRIANGULOS_DE_LOS_DADOS +
  TRIANGULOS_DEL_ASA_DE_LOS_DADOS +
  TRIANGULOS_DEL_TAPETE +
  TRIANGULOS_DE_LAS_SOMBRAS +
  TRIANGULOS_DE_LA_PILA;

export function triangulosDeLaMesa(segmentos: number): number {
  return 2 * segmentos * FILAS_DE_LA_MESA + TRIANGULOS_FIJOS_DE_LA_MESA;
}

/**
 * EL TOPE DE LA MESA, por lo mismo que el del mar: un recuento sin tope es un dato y con
 * tope es una decisión. El día que alguien suba los segmentos para ver la veta más fina lo
 * descubrirá aquí y no en un móvil.
 *
 * Era 3.600 con el respaldo (3.470 a 240 segmentos, 130 de margen). El D6 del pack cuesta
 * 1.324 los dos (880 más que el respaldo), así que la cuenta con la tapa al máximo es
 * `12 · 240 + 1.470 = 4.350`, y el tope se rehace con esa cuenta y no a ojo: 4.500, 150 de
 * margen. Frente a los dos millones del tablero es nada; el tope está para que la mesa no
 * crezca sin que nadie lo escriba.
 */
export const TOPE_DE_LA_MESA = 4_500;
