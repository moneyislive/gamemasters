/**
 * CÓMO SE TIENDE UN PUENTE DE UN VÉRTICE A OTRO.
 *
 * ═══ POR QUÉ UN PUENTE SON VARIOS TRAMOS Y NO UNA PIEZA ═══
 *
 * Por la escala, y sale de medir. Una arista de este tablero mide 75,8 unidades —treinta
 * personas puestas en fila— y el modelo de puente del pack mide 10,5 largo. No es que
 * queden bien varios: es que uno solo no llega ni a la séptima parte. Estirarlo hasta
 * cubrir la arista daría una tabla de treinta metros con barandillas del tamaño de una
 * casa, que es lo que pasa siempre que se escala un modelo fuera de su escala.
 *
 * Así que se tienden varios tramos con un estandarte del color del jugador en cada junta.
 * El estandarte no es adorno: es lo que hace legible de quién es el puente desde el aire,
 * donde una barandilla teñida no se distingue.
 *
 * ═══ LA CALZADA NO SIGUE EL SUELO, PERO TAMPOCO LO ATRAVIESA ═══
 *
 * La primera versión tendía la calzada RECTA de punta a punta, razonando que eso es lo que
 * distingue un puente de un camino. En pantalla no se veía ni uno, y al medirlo estaba
 * claro por qué: en el 23% de las aristas de este tablero la recta queda BAJO TIERRA en
 * algún punto, y en la peor se hunde 21,3 unidades — ocho personas y media de roca encima.
 * No es un puente invisible: es un puente enterrado.
 *
 * Y no era un fallo de cuentas sino de idea. Una recta entre dos puntos del terreno sólo
 * está en el aire si el terreno es cóncavo entre ellos; en cuanto hay un cerro en medio, la
 * recta se mete dentro. Un puente de verdad no ignora lo que tiene debajo: lo salva.
 *
 * Así que la calzada es una POLILÍNEA por las juntas. Cada junta se pone en lo más alto de
 * dos cosas: la recta entre las puntas, y el suelo justo debajo más un aire. Donde no hay
 * nada que salvar la calzada queda recta, que es lo que se quería; donde hay un cerro,
 * sube por encima. Cada tramo es un segmento entre dos juntas, que es exactamente lo que es
 * un puente de tramos.
 *
 * Las dos PUNTAS no se levantan nunca: quedan a la altura del camino, que es lo que pidió
 * el usuario con «que encajen tanto en entrada como en salida». Y eso es además lo que hace
 * que dos puentes que comparten vértice se encuentren sin hablarse: los dos llegan a ese
 * vértice a la misma cota porque los dos la sacan del suelo de ese vértice, no de lo que
 * haya en medio de cada uno.
 *
 * ═══ Y LA CALZADA QUEDA A LA ALTURA DEL CAMINO, DERIVADA Y NO COPIADA ═══
 *
 * Lo que el usuario pidió con «que los puentes encajen tanto en entrada como en salida con
 * los caminos» es esto: la cara de arriba de la calzada tiene que quedar donde queda la
 * cara de arriba de un camino, o se ve un escalón justo donde uno pisa.
 *
 * Ese número NO se escribe aquí a mano. Se importa el mismo que usa el camino y se le suma
 * su medio grosor. Escrito a mano coincidiría hoy y dejaría de coincidir el día que
 * alguien suba el camino un pelo, sin que nadie relacione una cosa con la otra.
 */
import type { Punto } from '../shared/mecanicas/malla-hexagonal';
import { ALTURA_DE_UNA_PERSONA, ESCALON, RADIO_DE_TESELA } from './escala';

/**
 * LO QUE MIDE EL MODELO DEL PACK, medido y no supuesto.
 *
 * `building_bridge_A`, con la caja que trae dentro del `.glb`: 1,333 de ancho, 1,250 de
 * alto y 1,924 de largo, a la escala del pack. El largo es el que manda porque es el que
 * decide cuántos caben; los otros dos entran para que la pieza no salga deformada.
 *
 * Está aquí y no en `nombres.ts` porque es una MEDIDA, no un nombre: `verify:escena` la
 * contrasta contra el fichero compilado, así que si el día de mañana entra otro modelo de
 * puente, esto salta en vez de dibujar un puente con la longitud del anterior.
 */
export const CAJA_DEL_PUENTE = { ancho: 1.333, alto: 1.25, largo: 1.924 } as const;

/** El largo de un tramo de puente ya en unidades del mundo. */
export const LARGO_DEL_TRAMO = CAJA_DEL_PUENTE.largo * (RADIO_DE_TESELA / (2 / Math.sqrt(3)));

/**
 * LA CARA DE ARRIBA DE UN CAMINO, que es donde tiene que quedar la calzada.
 *
 * Los dos números salen de cómo se dibuja un camino en `delta.tsx`: sus cajas se plantan a
 * `ALTO_DEL_CAMINO` sobre el suelo y tienen `GRUESO_DEL_CAMINO` de canto, centradas. Así
 * que se pisa medio canto más arriba.
 *
 * Se exportan desde aquí y `delta.tsx` los usa para dibujar el camino, no al revés: si
 * cada uno tuviera los suyos, coincidirían hasta el primer retoque.
 */
export const ALTO_DEL_CAMINO = 0.3;
export const GRUESO_DEL_CAMINO = ESCALON * 0.09;
export const SUPERFICIE_DEL_CAMINO = ALTO_DEL_CAMINO + GRUESO_DEL_CAMINO / 2;

/**
 * EL HUECO MÍNIMO ENTRE DOS TRAMOS, para que quepa el estandarte.
 *
 * Medido en personas y no en unidades sueltas: el hueco tiene que dar para que un asta se
 * plante ahí y se lea como un asta, y lo único que da esa medida en este mundo es cuánto
 * ocupa una persona.
 *
 * Es un MÍNIMO y no una medida fija, y en eso hay una decisión: la arista nunca va a ser un
 * múltiplo exacto de tramo más hueco, así que algo tiene que ceder. Puede ceder el TRAMO
 * —estirándolo— o el HUECO —ensanchándolo—, y no es lo mismo. La primera versión estiraba
 * el tramo, y al medirlo salían un 9% de más: un 9% en una barandilla se ve, porque el ojo
 * conoce la forma de una barandilla. El hueco es AIRE con un asta en medio, y nadie sabe
 * cuánto aire debería haber. Así que cede el hueco y el modelo se dibuja tal cual es.
 */
export const HUECO_MINIMO = ALTURA_DE_UNA_PERSONA * 0.55;

/**
 * LO ALTO QUE ES EL ESTANDARTE. Alto de verdad, que es lo que se pidió.
 *
 * Tres personas y media. La bandera del pack mide 0,277 a escala de tesela —dos tercios de
 * una persona— y a ese tamaño, vista desde el aire con el tablero entero en pantalla, no
 * se distingue de una piedra. Lo que tiene que hacer el estandarte es decir de quién es el
 * puente desde arriba, así que se planta sobre un asta.
 */
export const ALTO_DEL_ESTANDARTE = ALTURA_DE_UNA_PERSONA * 3.5;

/**
 * EL AIRE QUE LA CALZADA DEJA SOBRE EL SUELO en el punto que salva.
 *
 * Media persona. No es para que se pueda pasar por debajo —para eso harían falta dos— sino
 * para que se VEA que la calzada está por encima: pegada al suelo, un puente se lee como
 * un camino pintado, y toda la diferencia está en esa sombra de debajo.
 */
export const AIRE_BAJO_LA_CALZADA = ALTURA_DE_UNA_PERSONA * 0.5;

/** Un tramo de calzada: dónde va, hacia dónde mira, cuánto se inclina y cuánto mide. */
export interface TramoDePuente {
  x: number;
  y: number;
  z: number;
  /** Radianes alrededor del eje vertical, para que el tramo siga la arista. */
  giro: number;
  /**
   * Radianes de PENDIENTE, positivo cuando el tramo sube hacia adelante.
   *
   * Sin esto, un tramo entre dos juntas a distinta altura se plantaría horizontal y dejaría
   * un escalón en cada junta. Con la calzada recta no hacía falta —todos los tramos estaban
   * al mismo nivel— y por eso no estaba: es la deuda que dejó aquella versión.
   */
  inclinacion: number;
  /** El largo del tramo, que es la distancia REAL entre sus dos juntas, cuesta incluida. */
  largo: number;
}

/** Un estandarte plantado en una junta, con la altura de su asta. */
export interface EstandarteDelPuente {
  x: number;
  y: number;
  z: number;
  giro: number;
  alto: number;
}

export interface Puente {
  tramos: TramoDePuente[];
  estandartes: EstandarteDelPuente[];
  /** La cota de la calzada en cada punta. Lo que tiene que cuadrar con el camino. */
  cotas: readonly [number, number];
}

/**
 * CUÁNTOS TRAMOS CABEN en un vano, sin deformar ninguno.
 *
 * Cuántos caben con su hueco mínimo, redondeando HACIA ABAJO. Hacia arriba habría que
 * encoger los tramos para que entraran, que es justo lo que se quiere evitar; hacia abajo
 * siempre sobra sitio, y lo que sobra se reparte entre las juntas —que es aire—.
 *
 * En una arista de este tablero salen seis tramos con juntas de 2,53, y ni un tramo se
 * toca. Medido, no supuesto.
 *
 * Nunca menos de dos: un puente de un solo tramo no tiene junta, y sin junta no hay
 * estandarte, y sin estandarte no se sabe de quién es el puente.
 */
export function cuantosTramos(vano: number): number {
  return Math.max(2, Math.floor(vano / (LARGO_DEL_TRAMO + HUECO_MINIMO)));
}

/** El hueco que toca, una vez repartido lo que sobra entre las juntas. */
export function huecoEntreTramos(vano: number): number {
  const cuantos = cuantosTramos(vano);
  return (vano - LARGO_DEL_TRAMO * cuantos) / (cuantos - 1);
}

/**
 * EL PUENTE ENTERO ENTRE DOS VÉRTICES.
 *
 * `alturaEn` es el suelo, y entra como función para que este módulo no dependa del relieve
 * —así se puede medir desde Node con un suelo de mentira, que es la única forma de
 * comprobar que un puente salva un cerro sin abrir un contexto de dibujo—.
 *
 * `avance` va de 0 a 1 y es la obra: a 0 no hay nada, a 1 está el puente entero. Los tramos
 * aparecen POR ORDEN desde una punta, que es como se tiende un puente de verdad y lo que
 * hace que se lea como una construcción y no como un parpadeo.
 */
export function puenteEntre(
  a: Punto,
  b: Punto,
  alturaEn: (p: Punto) => number,
  avance = 1,
): Puente {
  const vano = Math.hypot(b.x - a.x, b.y - a.y);
  const giro = Math.atan2(-(b.y - a.y), b.x - a.x);

  /*
   * LAS DOS PUNTAS SALEN DEL SUELO DE LOS VÉRTICES Y DE NADA MÁS.
   *
   * Es lo que hace que dos puentes que comparten un vértice se encuentren: los dos miran el
   * mismo suelo y le suman lo mismo. Si la cota de la punta dependiera del terreno de en
   * medio, dos puentes que llegan al mismo sitio desde lados distintos llegarían a alturas
   * distintas, y se vería el escalón justo donde uno pisa.
   */
  const cotaA = alturaEn(a) + SUPERFICIE_DEL_CAMINO;
  const cotaB = alturaEn(b) + SUPERFICIE_DEL_CAMINO;

  const cuantos = cuantosTramos(vano);
  const largoLlano = LARGO_DEL_TRAMO;
  const hueco = huecoEntreTramos(vano);
  const cabida = largoLlano + hueco;

  /*
   * LO MÁS ALTO QUE HAY BAJO CADA TRAMO, que es lo que ese tramo tiene que salvar.
   *
   * ═══ POR QUÉ POR TRAMO Y NO POR JUNTA ═══
   *
   * El primer intento levantaba cada JUNTA por encima del suelo que tuviera debajo, y al
   * medirlo seguía habiendo un 11% de aristas con la calzada enterrada, hasta cuatro
   * personas de hondo. La razón: entre dos juntas hay un tramo RECTO, y un cerro que asome
   * en mitad de ese tramo no lo toca ninguna junta.
   *
   * Un segmento recto entre dos alturas nunca baja de la MENOR de las dos. Así que para que
   * un tramo no se entierre basta —y hace falta— que sus DOS extremos estén por encima de
   * lo más alto que haya debajo de él. De ahí que se mida por tramo y que cada junta se
   * levante por los dos tramos que toca.
   */
  const techoDelTramo: number[] = [];
  for (let i = 0; i < cuantos; i++) {
    let suelo = -Infinity;
    for (let k = 0; k <= 6; k++) {
      const u = (i * cabida + (k / 6) * largoLlano) / vano;
      suelo = Math.max(suelo, alturaEn({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }));
    }
    techoDelTramo.push(suelo + AIRE_BAJO_LA_CALZADA);
  }

  /*
   * LAS JUNTAS. Una más que tramos: las dos puntas y los huecos de en medio.
   *
   * Las PUNTAS no se levantan nunca. Quedan a la altura del camino, que es lo que hace que
   * el puente encaje a la entrada y a la salida — y si por levantarlas se salvara mejor un
   * cerro, se ganaría un puente limpio a cambio de un escalón justo donde uno pisa, que es
   * peor. Lo que puede pasar en las puntas es que el terreno suba a pico contra el vértice;
   * ahí el primer tramo roza, y es correcto: eso no es un puente, es una ladera.
   */
  const juntas: number[] = [];
  for (let i = 0; i <= cuantos; i++) {
    const t = i === cuantos ? 1 : (i * cabida) / vano;
    const recta = cotaA + (cotaB - cotaA) * t;
    if (i === 0 || i === cuantos) {
      juntas.push(recta);
      continue;
    }
    const antes = techoDelTramo[i - 1] ?? -Infinity;
    const despues = techoDelTramo[i] ?? -Infinity;
    juntas.push(Math.max(recta, antes, despues));
  }

  const puestos = Math.round(cuantos * Math.min(1, Math.max(0, avance)));
  const tramos: TramoDePuente[] = [];
  const estandartes: EstandarteDelPuente[] = [];

  for (let i = 0; i < puestos; i++) {
    /* Este tramo va de la junta `i` a la `i+1`, con el hueco fuera por los dos lados. */
    const desde = (i * cabida) / vano;
    const hasta = desde + largoLlano / vano;
    const yDesde = juntas[i] as number;
    const yHasta = (juntas[i] as number) + ((juntas[i + 1] as number) - (juntas[i] as number)) *
      (largoLlano / cabida);
    const subida = yHasta - yDesde;
    tramos.push({
      x: a.x + (b.x - a.x) * ((desde + hasta) / 2),
      y: (yDesde + yHasta) / 2,
      z: a.y + (b.y - a.y) * ((desde + hasta) / 2),
      giro,
      /* Positivo cuando sube: el modelo se inclina lo mismo que la recta entre sus juntas. */
      inclinacion: Math.atan2(subida, largoLlano),
      /* Y se estira lo justo para cubrir la cuesta, que es más larga que su sombra. */
      largo: Math.hypot(largoLlano, subida),
    });
    if (i + 1 < puestos) {
      const j = (largoLlano + i * cabida + hueco / 2) / vano;
      estandartes.push({
        x: a.x + (b.x - a.x) * j,
        y: juntas[i + 1] as number,
        z: a.y + (b.y - a.y) * j,
        giro,
        alto: ALTO_DEL_ESTANDARTE,
      });
    }
  }

  return { tramos, estandartes, cotas: [cotaA, cotaB] };
}
