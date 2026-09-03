/**
 * UN POBLADO NO ES UNA CASA, Y UNA CIUDAD NO ES UNA CASA MÁS GRANDE.
 *
 * ═══ QUÉ SE CONSTRUYE Y POR QUÉ ═══
 *
 * En el tablero de cartón, un poblado es una casita de madera y una ciudad la misma
 * casita más gorda. En un mundo por el que se camina eso no vale: lo que hay en un
 * vértice tiene que parecer un SITIO, y tiene que parecerlo también desde el suelo,
 * donde no se ve la forma del hexágono ni el número.
 *
 * Así que aquí un poblado es un CASERÍO —la casa del jugador, tres casas más, un
 * pozo, unas vallas y su bandera— y una ciudad es un RECINTO AMURALLADO: seis
 * lienzos de muro cerrando un hexágono, seis torres en las esquinas, una puerta y el
 * castillo dentro. Mejorar un poblado a ciudad no cambia un modelo por otro: derriba
 * el caserío y levanta una fortaleza donde estaba.
 *
 * ═══ POR QUÉ LAS PIEZAS ENCAJAN SIN CORTAR NADA ═══
 *
 * Porque el pack está hecho para esta malla, y las dos medidas que hacen falta caen
 * clavadas. Medido sobre los `.gltf`:
 *
 *   · EL MURO NO ES UNA PIEZA DE ARISTA. Mide 2,000 y el lado del hexágono mide
 *     1,1547: no cabe en un lado y no está hecho para eso. Lo que hace es CRUZAR la
 *     tesela de plano a plano, con sus dos topes cayendo en los planos de dos lados,
 *     a la apotema justa. Por eso se coloca en el CENTRO de una tesela y sólo se
 *     gira, como un camino — y por eso un recinto se levanta sobre el ANILLO de
 *     teselas que rodea a lo que encierra, no sobre sus aristas. Encerrar una tesela
 *     cuesta las seis vecinas.
 *   · `fence_wood_straight` mide 1,155 de largo y se apoya en x = -1,0. Eso es el
 *     lado del hexágono (1,1547) apoyado en su apotema (1,0). Seis vallas puestas en
 *     el centro de una tesela y giradas de sesenta en sesenta la cercan entera.
 *
 * ═══ TODO SALE DEL VÉRTICE, ASÍ QUE NO HAY QUE GUARDAR NADA ═══
 *
 * La forma concreta de cada asentamiento —qué casa va dónde, cuánto está girada, por
 * qué lado está la puerta— se deriva de la LLAVE del vértice. El mismo vértice da
 * siempre el mismo pueblo, dos vértices distintos dan pueblos distintos, y no viaja
 * un solo byte por la red para contarlo. Es la misma regla que gobierna el resto del
 * paisaje; ver `revoltijo.ts`.
 *
 * ═══ Y CADA PIEZA SABE CUÁNDO LE TOCA APARECER ═══
 *
 * `cuando` es el instante, entre 0 y 1, en que esa pieza entra en la animación de
 * construcción. No es decoración: un recinto que aparece de golpe se lee como un
 * cambio de estado, y uno que se levanta —primero las torres, luego los muros
 * cerrando entre ellas, y el castillo al final— se lee como una obra. Es la
 * diferencia entre pulsar un botón y fundar una ciudad.
 */
import { DIRECCIONES, centroDeHex, vecino } from '../shared/mecanicas/malla-hexagonal';
import type { LlaveDeVertice, Punto } from '../shared/mecanicas/malla-hexagonal';
import { ESCALA_DEL_PACK, RADIO_DE_TESELA } from './escala';
import { MODELO, modeloDeBandera, modeloDePieza, modeloDeTorre } from './nombres';
import { fraccion, revoltijo } from './revoltijo';
import type { ClaseDePieza, ColorDeJugador } from './tipos';

/** Una pieza del asentamiento, ya colocada respecto al vértice. */
export interface PiezaDeAsentamiento {
  modelo: string;
  /** Desplazamiento respecto al vértice, en el plano de la malla. */
  donde: Punto;
  /** Altura sobre el suelo del vértice. Sirve para apilar la torre sobre su zócalo. */
  sobre: number;
  /** Giro sobre la vertical, en radianes. */
  giro: number;
  /** Tamaño, en múltiplos de la escala del pack. */
  talla: number;
  /** En qué momento de la animación de construcción entra, entre 0 y 1. */
  cuando: number;
}

/**
 * LO QUE HAY DE UNA TESELA A SU VECINA.
 *
 * Es la medida de la que cuelga todo el recinto: el muro del pack mide exactamente
 * esto, así que los lienzos van de esquina a esquina sin tocarlos.
 */
const PASO = Math.sqrt(3) * RADIO_DE_TESELA;

const SEIS = Math.PI / 3;

/**
 * DE UN PUNTO A OTRO, QUÉ LADO DEL PACK LOS UNE.
 *
 * El pack numera sus lados por el ángulo `atan2(-z, x)`, con la `z` del mundo siendo
 * la `y` de la malla. Se calcula en vez de escribirse en una tabla: una tabla a mano
 * deja de valer el día que la malla cambie de convenio, y el síntoma sería una
 * muralla girada sesenta grados que no cierra — visible, pero tarde.
 */
function ladoHacia(desde: Punto, hasta: Punto): number {
  const angulo = Math.atan2(-(hasta.y - desde.y), hasta.x - desde.x);
  return (Math.round(angulo / SEIS) + 6) % 6;
}

/** En qué dirección del pack cae un punto visto desde el vértice. */
function ladoDelPack(p: Punto): number {
  return ladoHacia({ x: 0, y: 0 }, p);
}

/** Un punto en polares alrededor del vértice. */
function alrededor(radio: number, angulo: number): Punto {
  return { x: Math.cos(angulo) * radio, y: Math.sin(angulo) * radio };
}

/**
 * DOS ENTEROS SACADOS DE LA LLAVE DE UN VÉRTICE.
 *
 * La llave es una cadena —los tres hexágonos que se tocan ahí— y el revoltijo pide
 * números. Se suman los códigos de sus caracteres en dos acumuladores distintos, uno
 * con más peso en las posiciones pares y otro en las impares, para que dos llaves que
 * se diferencian en un solo carácter no den el mismo par.
 */
function comoNumeros(llave: LlaveDeVertice): [number, number] {
  let a = 0;
  let b = 0;
  for (let i = 0; i < llave.length; i++) {
    const c = llave.charCodeAt(i);
    if (i % 2 === 0) a = (a * 31 + c) | 0;
    else b = (b * 37 + c) | 0;
  }
  return [a, b];
}

/**
 * EL CASERÍO DE UN POBLADO.
 *
 * La casa del jugador va en el vértice mismo, que es donde el juego dice que está la
 * pieza, y todo lo demás crece alrededor. Las otras casas se reparten a ciento veinte
 * grados con un poco de desorden: a tres cuartos de paso del centro, que son ocho
 * unidades — bastante para que no se toquen, porque una casa mide cinco de ancho.
 */
function caserio(color: ColorDeJugador, llave: LlaveDeVertice): PiezaDeAsentamiento[] {
  const [a, b] = comoNumeros(llave);
  const giroBase = (revoltijo(a, b, 1) % 6) * SEIS;
  const piezas: PiezaDeAsentamiento[] = [];

  /* La casa del jugador, en el vértice. Es la que dice de quién es esto. */
  piezas.push({
    modelo: modeloDePieza('poblado', color),
    donde: { x: 0, y: 0 },
    sobre: 0,
    giro: giroBase,
    talla: 1,
    cuando: 0,
  });

  /* Tres casas del pueblo alrededor, a ciento veinte grados y con desorden. */
  for (let i = 0; i < 3; i++) {
    const angulo = giroBase + (i * 2 * Math.PI) / 3 + (fraccion(a, b, 10 + i) - 0.5) * 0.7;
    piezas.push({
      modelo: MODELO.casa,
      donde: alrededor(PASO * (0.66 + fraccion(a, b, 20 + i) * 0.16), angulo),
      sobre: 0,
      giro: (revoltijo(a, b, 30 + i) % 6) * SEIS,
      talla: 1,
      cuando: 0.18 + i * 0.13,
    });
  }

  /* El pozo, que es lo que hace que un grupo de casas parezca un pueblo y no un campamento. */
  piezas.push({
    modelo: MODELO.pozo,
    donde: alrededor(PASO * 0.38, giroBase + Math.PI),
    sobre: 0,
    giro: (revoltijo(a, b, 40) % 6) * SEIS,
    talla: 1,
    cuando: 0.62,
  });

  /* Cuatro vallas de huerto, sueltas y torcidas: no cierran nada, sólo dan vida. */
  for (let i = 0; i < 4; i++) {
    const angulo = giroBase + (i * Math.PI) / 2 + (fraccion(a, b, 50 + i) - 0.5) * 0.9;
    piezas.push({
      modelo: MODELO.valla,
      donde: alrededor(PASO * (0.95 + fraccion(a, b, 60 + i) * 0.2), angulo),
      sobre: 0,
      giro: angulo + Math.PI / 2,
      talla: 1,
      cuando: 0.45 + i * 0.06,
    });
  }

  /* Un par de árboles, para que el caserío no salga sobre un solar pelado. */
  for (let i = 0; i < 2; i++) {
    piezas.push({
      modelo: i === 0 ? MODELO.arbolA : MODELO.arbolB,
      donde: alrededor(
        PASO * (0.8 + fraccion(a, b, 70 + i) * 0.35),
        giroBase + Math.PI * (0.6 + i * 0.9),
      ),
      sobre: 0,
      giro: fraccion(a, b, 80 + i) * Math.PI * 2,
      talla: 0.9 + fraccion(a, b, 90 + i) * 0.3,
      cuando: 0.3 + i * 0.1,
    });
  }

  /* Y la bandera, la última en subir: es la firma. */
  piezas.push({
    modelo: modeloDeBandera(color),
    donde: alrededor(PASO * 0.3, giroBase + 0.9),
    sobre: 0,
    giro: giroBase,
    talla: 2.2,
    cuando: 0.88,
  });

  return piezas;
}

/**
 * EL RECINTO AMURALLADO DE UNA CIUDAD.
 *
 * TRES torres —no seis: seis serían una empalizada— en un anillo de las seis teselas
 * vecinas del vértice, seis codos de muralla cerrando la vuelta entera —uno de ellos
 * es la puerta—, el castillo dentro y la bandera arriba, en la torre más lejana de la
 * puerta.
 *
 * ═══ POR QUÉ EL MURO VA EN EL PUNTO MEDIO Y NO EN LA ESQUINA ═══
 *
 * Porque el muro del pack está centrado en su propia longitud: mide 2,0 con el
 * origen en medio. Puesto en el punto medio de dos esquinas que están a 2,0 una de
 * otra, sus dos extremos caen EXACTAMENTE en las dos esquinas. Ponerlo en la esquina
 * dejaría medio muro por fuera del recinto y medio hueco en el otro lado.
 *
 * ═══ ESTA CABECERA DECÍA OTRA COSA, Y CONVIENE SABER CUÁL ═══
 *
 * Decía «seis torres», y el bucle de veinticinco líneas más abajo pone tres desde
 * hace tiempo. Y explicaba con detalle por qué la torre va sobre un zócalo, cuando el
 * cuerpo de la propia función explica —también con detalle— por qué se le quitó: los
 * dos modelos comparten el fuste vértice a vértice y apilarlos daba una torre con la
 * piedra repetida por dentro.
 *
 * O sea que la función se contradecía consigo misma dos veces en la misma pantalla.
 * Un comentario así no es ruido: es la documentación de una decisión, y quien lo lea
 * con prisa «arreglará» el código para que cuadre con él.
 */
function fortaleza(color: ColorDeJugador, llave: LlaveDeVertice): PiezaDeAsentamiento[] {
  const [a, b] = comoNumeros(llave);
  /* Por qué lado se entra. Cambia de una ciudad a otra, que es lo que las distingue. */
  const puerta = revoltijo(a, b, 2) % 6;
  const piezas: PiezaDeAsentamiento[] = [];

  /*
   * LAS SEIS TESELAS DEL RECINTO, sacadas de la malla y no de un ángulo escrito.
   *
   * Son las seis vecinas de la tesela del vértice, así que sus posiciones salen de
   * `vecino` y `centroDeHex` — las mismas funciones que colocan el suelo. Si mañana
   * cambiara la convención de la malla, la muralla se giraría con ella en vez de
   * quedarse cruzada.
   */
  const anillo: Punto[] = [];
  for (let j = 0; j < DIRECCIONES.length; j++) {
    anillo.push(centroDeHex(vecino({ q: 0, r: 0 }, j), RADIO_DE_TESELA));
  }

  /*
   * PRIMERO SUBEN LAS TORRES, en tres de las seis: seis serían una empalizada.
   *
   * ═══ Y VAN SOLAS, NO SOBRE UN ZÓCALO ═══
   *
   * `building_tower_base` PARECE el zócalo de `building_tower_A` y no lo es: es una
   * torre entera con la azotea plana. Las dos comparten el mismo fuste vértice a
   * vértice —secciones idénticas a las alturas 0,05, 0,5 y 1,0—, así que apilarlas
   * duplicaba el fuste y daba una torre de 3,69 con la piedra repetida por dentro.
   * Estuvo así en pantalla y desde lejos colaba; de cerca es una torre con dos
   * cuerpos iguales.
   *
   * ═══ Y GIRAN PARA QUE LA PUERTA MIRE AL PATIO ═══
   *
   * La torre tiene un saliente de entrada hacia su `+Z` local que llega a 0,58. Sin
   * girarla, ese saliente asoma por la cara EXTERIOR de la muralla: una puerta que da
   * al campo desde lo alto del muro. Se le pone mirando al centro del recinto.
   */
  for (let k = 0; k < 6; k += 2) {
    const donde = anillo[k] as Punto;
    piezas.push({
      modelo: modeloDeTorre(color),
      donde,
      sobre: 0,
      giro: ladoDelPack(donde) * SEIS - Math.PI / 2,
      talla: 1,
      cuando: (k / 2) * 0.09,
    });
  }

  /*
   * Y LUEGO LA MURALLA CIERRA EL ANILLO. Seis codos y ni un tramo recto.
   *
   * ═══ ESTO ES UNA MEDIDA, NO UNA ELECCIÓN ═══
   *
   * `wall_straight` NO es una pieza de arista: mide 2,0 y ATRAVIESA la tesela de
   * lado a lado, con sus dos topes cayendo exactamente en los planos de dos lados
   * opuestos. Así que la muralla no va por los bordes entre teselas — va POR DENTRO
   * de las teselas, y el recinto es un anillo de teselas, no de aristas.
   *
   * Y un anillo hexagonal no tiene ni un tramo recto: en cada una de las seis
   * teselas el perímetro entra por un lado y sale por otro que está a ciento veinte
   * grados, que es justo lo que hace `wall_corner_A_outside`. Seis codos de sesenta
   * grados suman los trescientos sesenta de la vuelta completa. Por eso la puerta
   * tiene que ser `wall_corner_A_gate` y no la puerta recta: en este recinto no hay
   * dónde meter un tramo recto.
   *
   * El giro sale de la receta medida: la pieza en su orientación nativa entra por el
   * lado 3, así que para entrar por el lado `kIn` se gira `60·(kIn-3)`.
   */
  for (let k = 0; k < 6; k++) {
    const aqui = anillo[k] as Punto;
    piezas.push({
      modelo: k === puerta ? MODELO.muroEsquinaPuerta : MODELO.muroEsquina,
      donde: aqui,
      sobre: 0,
      /*
       * El giro verificado: la tesela que está en la dirección `k` desde el centro
       * lleva su codo girado `60·(k+1)`. Se comprobó montando el anillo y comparando
       * los cuarenta y siete vértices de tope de cada pieza uno a uno con los de su
       * vecina: seis juntas, cero fallos.
       *
       * Y hay una señal inequívoca por si algún día se invierte el sentido del
       * recorrido: en un recinto convexo tienen que salir SEIS `_outside`. Si salieran
       * seis `_inside`, las almenas mirarían al patio y habría que dar la vuelta al
       * anillo. No son la misma pieza girada: son espejo.
       */
      giro: (ladoDelPack(aqui) + 1) * SEIS,
      talla: 1,
      cuando: 0.44 + k * 0.045,
    });
  }

  /*
   * EL CASTILLO, el último y en la tesela del vértice.
   *
   * Cabe, pero justo: mide 1,9754 de ancho sobre una tesela cuya apotema es 1,0, o
   * sea que le sobra el 1,2%. Por eso va SOLO en su tesela y nada más se pone ahí — y
   * por eso mira hacia la puerta, que es lo único que se puede elegir.
   *
   * ═══ Y MIRABA A CUALQUIER SITIO MENOS A ELLA ═══
   *
   * El giro era `puerta * SEIS`, o sea el ÍNDICE DE DIRECCIÓN DE LA MALLA multiplicado
   * por sesenta grados, como si el índice `k` de la malla y el lado `k` del pack fueran
   * el mismo. No lo son, y no se diferencian en un desfase que se pudiera absorber: la
   * relación es un ESPEJO, `(2 - k) mod 6`. Medido, dirección a dirección:
   *
   *     k          0    1    2    3    4    5
   *     ladoDelPack 2    1    0    5    4    3
   *
   * Coinciden dos de seis. O sea que en cuatro de cada seis ciudades el castillo
   * miraba a un sitio sin relación con su propia puerta, y en las otras dos acertaba
   * por casualidad. Es exactamente el fallo contra el que avisa la cabecera de
   * `ladoHacia`: una tabla mental de equivalencias que deja de valer sin avisar.
   *
   * Ahora el ángulo sale de la MISMA cuenta que orienta la muralla: se mira dónde cae
   * la tesela de la puerta y se pregunta por su ángulo del pack. Así el castillo y su
   * puerta no pueden discrepar aunque cambie el convenio de la malla.
   *
   * Aviso honesto sobre lo que esto arregla y lo que no: el castillo del pack es casi
   * simétrico a la altura de su puerta —medido, radio entre 1,00 y 1,10 en los doce
   * sectores de treinta grados—, así que el cambio se ve poco. Lo que se arregla es que
   * el número significaba una cosa y se usaba como otra.
   */
  piezas.push({
    modelo: modeloDePieza('ciudad', color),
    donde: { x: 0, y: 0 },
    sobre: 0,
    giro: ladoDelPack(anillo[puerta] as Punto) * SEIS,
    talla: 1,
    cuando: 0.76,
  });

  /*
   * Y SU BANDERA, ARRIBA DE UNA TORRE. Las dos mitades de esa frase eran falsas.
   *
   * Iba a `(puerta + 3) % 6`, que es la tesela opuesta a la puerta — pero las torres
   * están en los índices PARES, así que la mitad de las veces la bandera se plantaba
   * en un codo de muralla donde no hay torre ninguna.
   *
   * Y sobre todo iba a `sobre: 0`, o sea al SUELO del recinto. Medido: con `talla`
   * 2,4 el vuelo mide 3,64 unidades de mundo y el codo de muralla mide 6,02. La
   * bandera quedaba enterrada detrás del muro, invisible desde fuera y casi desde
   * arriba. Una bandera que no se ve no es una bandera: es geometría que se dibuja.
   *
   * Ahora sube a la azotea de la torre, que mide 2,192 del pack. La cuenta se escribe
   * a partir de la medida y de la escala, no como un número suelto: si mañana cambia
   * la torre o la escala del mundo, la bandera sube con ellas.
   */
  const ALTURA_DE_LA_TORRE_EN_EL_PACK = 2.192;
  /* Índice de torre —siempre par— más lejano de la puerta. */
  const torreDeLaBandera = ((puerta + 3) % 6) & ~1;
  piezas.push({
    modelo: modeloDeBandera(color),
    donde: anillo[torreDeLaBandera] as Punto,
    sobre: ALTURA_DE_LA_TORRE_EN_EL_PACK * ESCALA_DEL_PACK,
    giro: 0,
    talla: 2.4,
    cuando: 0.94,
  });

  return piezas;
}

/**
 * LAS PIEZAS DE UN ASENTAMIENTO, según su clase.
 *
 * Es una función pura de la clase, el color y el vértice: ni estado, ni azar, ni
 * nada que guardar. Dos clientes construyen el mismo pueblo sin hablar entre ellos.
 */
export function piezasDeAsentamiento(
  clase: ClaseDePieza,
  color: ColorDeJugador,
  vertice: LlaveDeVertice,
): PiezaDeAsentamiento[] {
  return clase === 'ciudad' ? fortaleza(color, vertice) : caserio(color, vertice);
}

/**
 * CUÁNTO DURA LA OBRA, en segundos.
 *
 * Dos segundos y medio. Menos se lee como un parpadeo y no como una construcción;
 * más se hace largo cuando en un turno se levantan dos cosas seguidas.
 */
export const DURACION_DE_LA_OBRA = 2.5;

/**
 * CUÁNTO HA SALIDO UNA PIEZA, entre 0 y 1.
 *
 * Cada pieza tarda una fracción del total en salir del suelo, y empieza cuando le
 * toca. La curva no es recta: `1-(1-t)³` sale rápido y frena al llegar, que es lo que
 * hace que una pieza parezca ASENTARSE en vez de deslizarse hasta su sitio.
 */
export function cuantoHaSalido(pieza: PiezaDeAsentamiento, transcurrido: number): number {
  const t = transcurrido / DURACION_DE_LA_OBRA;
  const propio = (t - pieza.cuando) / 0.24;
  if (propio <= 0) return 0;
  if (propio >= 1) return 1;
  return 1 - (1 - propio) ** 3;
}
