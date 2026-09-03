/**
 * QUÉ HAY ENCIMA DE CADA TESELA DEL MUNDO.
 *
 * ═══ LAS TRES FRANJAS DE UNA COMARCA ═══
 *
 * Una comarca no es un campo uniforme con cosas repartidas al azar: tiene un borde,
 * unas afueras y un centro, como cualquier sitio habitado. Dos medidas deciden qué
 * le toca a cada tesela, y las dos vienen ya calculadas en `relieve.ts`:
 *
 *     anillos < 2      LA FRANJA DE BORDE. Llana y casi vacía.
 *     rango 0          LA PLAZA. Vacía, porque encima va el número de la comarca.
 *     rango 1 y 2      EL PUEBLO. Casas, iglesia, taberna, molino, mina.
 *     el resto         EL CAMPO. Bosque, montaña, trigales, según el terreno.
 *
 * ═══ POR QUÉ LA FRANJA DE BORDE VA CASI VACÍA, QUE NO ES UN DESCUIDO ═══
 *
 * Porque es donde SE JUEGA. Las aristas de las comarcas son donde los jugadores
 * ponen sus caminos y sus puentes, y los vértices —las esquinas donde se tocan tres
 * comarcas— son donde ponen poblados y ciudades. Si esa franja estuviera llena de
 * árboles y casas, una construcción de jugador aparecería medio metida dentro de un
 * bosque y nadie sabría dónde puede construir.
 *
 * Así que ahí sólo van piedras y matojos sueltos, pequeños y espaciados: lo justo
 * para que no parezca una carretera de asfalto, y no tanto como para tapar lo que
 * importa. Y `relieve.ts` garantiza además que esa franja está a nivel cero, así que
 * también es plana.
 *
 * ═══ POR QUÉ HAY MODELOS «DE TESELA» Y MODELOS SUELTOS ═══
 *
 * El pack trae las dos cosas y las dos hacen falta. Una arboleda ocupa la tesela
 * entera y va centrada y girada en múltiplos de sesenta grados, porque está hecha
 * para encajar con la de al lado; un árbol suelto va donde sea y girado como sea.
 * Con sólo arboledas, un bosque se ve como una rejilla de matas idénticas; con sólo
 * árboles sueltos hacen falta cientos para que parezca un bosque. Mezclando, sale
 * denso y desordenado por poco dinero.
 */
import type { Punto } from '../shared/mecanicas/malla-hexagonal';
import { RADIO_DE_TESELA } from './escala';
import { MODELO } from './nombres';
import type { Subtesela } from './relieve';
import { fraccion, revoltijo, unoDe } from './revoltijo';

/** Una cosa puesta en el mundo: qué modelo, dónde, cómo girada y de qué tamaño. */
export interface Puesto {
  modelo: string;
  /** Desplazamiento RESPECTO al centro de su subtesela, en el plano de la malla. */
  donde: Punto;
  /** Giro sobre la vertical, en radianes. */
  giro: number;
  /** Un tamaño alrededor de 1, para que no parezcan clones. */
  talla: number;
}

/**
 * EL RADIO DE LA PLAZA DEL NÚMERO, en pasos de subtesela desde el centro.
 *
 * Dos: siete teselas despejadas en el centro de cada comarca, sobre ciento cuarenta
 * y cuatro. Es lo justo para que el disco del número se lea desde el aire sin que
 * nada se le suba encima, y lo bastante poco para que no dibuje un patrón.
 */
const RADIO_DE_LA_PLAZA = 2;

/**
 * A PARTIR DE QUÉ HABITABILIDAD CUAJA UN PUEBLO.
 *
 * `habitabilidad` es el producto de tres factores entre 0 y 1 —lo llano, lo bajo y
 * la mancha de asentamiento— así que su valor típico es bajo y su cola alta es
 * corta. Con este umbral queda poblado en torno a la quinta parte del terreno bueno,
 * que es lo que hace que un mapa tenga pueblos y no una urbanización continua.
 */
const HABITABLE = 0.42;

/** Lo que llena una tesela de campo, y lo que se le esparce por encima. */
interface Campo {
  /** Modelos que ocupan la tesela entera. Van centrados y girados a sesenta grados. */
  llenan: readonly string[];
  /** Con qué frecuencia una tesela lleva uno de esos, entre 0 y 1. */
  cuantoLlena: number;
  /** Modelos sueltos, que van donde sea y girados como sea. */
  sueltos: readonly string[];
  /** Cuántos sueltos como mucho, cuando la tesela no lleva uno de los que llenan. */
  cuantosSueltos: number;
}

/**
 * QUÉ LLEVA CADA TERRENO.
 *
 * Los números están bajados a propósito respecto de la primera versión, que llenaba
 * el sesenta o el setenta por ciento de las teselas y dejaba un mundo macizo, sin
 * un claro por el que andar y sin silueta: desde el aire era una alfombra. Un mapa
 * se lee por el CONTRASTE entre lo lleno y lo vacío, así que la mitad de las teselas
 * de un bosque tienen árboles y la otra mitad son claros.
 */
const CAMPO: Readonly<Record<string, Campo>> = {
  bosque: {
    llenan: [
      MODELO.arboledaMedia,
      MODELO.arboledaPequena,
      MODELO.arboledaB,
      MODELO.arboledaGrande,
      MODELO.arboledaMedia,
    ],
    cuantoLlena: 0.46,
    sueltos: [MODELO.arbolA, MODELO.arbolB, MODELO.arbolA, MODELO.tocon, MODELO.rocaB],
    cuantosSueltos: 3,
  },
  montana: {
    llenan: [
      MODELO.montanaA,
      MODELO.montanaB,
      MODELO.montanaC,
      MODELO.montanaVerde,
      MODELO.montanaArbolada,
    ],
    cuantoLlena: 0.5,
    sueltos: [MODELO.rocaA, MODELO.rocaB, MODELO.rocaC, MODELO.rocaD, MODELO.rocaE],
    cuantosSueltos: 3,
  },
  colina: {
    llenan: [MODELO.colinasA, MODELO.colinasB, MODELO.colinasArboladas],
    cuantoLlena: 0.34,
    sueltos: [MODELO.colinaA, MODELO.colinaB, MODELO.colinaC, MODELO.rocaC, MODELO.arbolA],
    cuantosSueltos: 3,
  },
  campo: {
    llenan: [MODELO.trigal, MODELO.trigal, MODELO.trigal, MODELO.barbecho],
    cuantoLlena: 0.5,
    sueltos: [MODELO.almiar, MODELO.saco, MODELO.carro, MODELO.valla],
    cuantosSueltos: 2,
  },
  pradera: {
    llenan: [MODELO.barbecho],
    cuantoLlena: 0.05,
    sueltos: [MODELO.valla, MODELO.arbolA, MODELO.colinaA, MODELO.abrevadero, MODELO.rocaB],
    cuantosSueltos: 2,
  },
  desierto: {
    llenan: [MODELO.barbecho, MODELO.ruina],
    cuantoLlena: 0.14,
    sueltos: [MODELO.rocaA, MODELO.rocaB, MODELO.rocaD, MODELO.rocaE, MODELO.tienda],
    cuantosSueltos: 2,
  },

  /* Riberas, que comparte esta escena. */
  marisma: {
    llenan: [MODELO.barbecho],
    cuantoLlena: 0.12,
    sueltos: [MODELO.arbolA, MODELO.rocaB, MODELO.tocon],
    cuantosSueltos: 3,
  },
  carrizal: {
    llenan: [MODELO.arboledaPequena, MODELO.arboledaMedia],
    cuantoLlena: 0.4,
    sueltos: [MODELO.arbolA, MODELO.tocon],
    cuantosSueltos: 3,
  },
  salina: {
    llenan: [MODELO.barbecho],
    cuantoLlena: 0.25,
    sueltos: [MODELO.caja, MODELO.saco, MODELO.rocaA],
    cuantosSueltos: 2,
  },
  cantil: {
    llenan: [MODELO.montanaA, MODELO.montanaC, MODELO.montanaB],
    cuantoLlena: 0.48,
    sueltos: [MODELO.rocaC, MODELO.rocaD, MODELO.rocaE],
    cuantosSueltos: 3,
  },
  vega: {
    llenan: [MODELO.trigal, MODELO.barbecho],
    cuantoLlena: 0.42,
    sueltos: [MODELO.saco, MODELO.carro, MODELO.valla],
    cuantosSueltos: 2,
  },
  duna: {
    llenan: [MODELO.barbecho],
    cuantoLlena: 0.2,
    sueltos: [MODELO.rocaA, MODELO.rocaD],
    cuantosSueltos: 2,
  },
};

/** Lo que lleva un terreno que esta versión no conoce: piedras, y que se note poco. */
const CAMPO_POR_DEFECTO: Campo = {
  llenan: [],
  cuantoLlena: 0,
  sueltos: [MODELO.rocaA, MODELO.rocaB, MODELO.arbolA],
  cuantosSueltos: 2,
};

/** Lo poco que se pone en la franja donde se construye: matojos y guijarros. */
const DEL_BORDE: readonly string[] = [
  MODELO.rocaA,
  MODELO.rocaB,
  MODELO.rocaD,
  MODELO.arbolA,
  MODELO.tocon,
];

/**
 * LOS EDIFICIOS DEL PUEBLO, comunes a cualquier comarca.
 *
 * La casa aparece cuatro veces y la iglesia una: un pueblo es casas con algún
 * edificio bueno, no un muestrario. Repetir en la lista es la manera más simple de
 * dar peso sin meter una tabla de probabilidades que luego hay que mantener.
 */
const PUEBLO: readonly string[] = [
  MODELO.casa,
  MODELO.casa,
  MODELO.casa,
  MODELO.casa,
  MODELO.casa,
  MODELO.pozo,
  MODELO.taberna,
  MODELO.mercado,
  MODELO.iglesia,
  MODELO.concejo,
  MODELO.taller,
  MODELO.ermita,
  MODELO.atalaya,
];

/**
 * EL EDIFICIO QUE DELATA DE QUÉ VIVE LA COMARCA.
 *
 * Un aserradero en el bosque y una mina en la montaña no son adorno: son la única
 * pista que tiene alguien que mira el mundo a pie de suelo para saber en qué
 * terreno está, porque desde ahí no se ve la forma del hexágono ni su número.
 */
const OFICIO: Readonly<Record<string, string>> = {
  bosque: MODELO.aserradero,
  montana: MODELO.mina,
  colina: MODELO.herreria,
  campo: MODELO.molino,
  pradera: MODELO.cuadras,
  cantil: MODELO.mina,
  carrizal: MODELO.aserradero,
  vega: MODELO.molino,
  salina: MODELO.mercado,
};

const SEIS = Math.PI / 3;

/**
 * LOS CANALES DEL REVOLTIJO, separados y con nombre.
 *
 * ═══ POR QUÉ ESTO NO SON NÚMEROS SUELTOS ═══
 *
 * Cada decisión —qué modelo, dónde, cómo girado, de qué tamaño— pide su número al
 * revoltijo con un canal distinto. Cuando los canales se pisan, las dos decisiones
 * dejan de ser independientes y quedan atadas, y eso NO se ve mirando: se ve
 * contando.
 *
 * Aquí pasó dos veces. El bucle de sueltos avanzaba de cuatro en cuatro pero
 * gastaba cinco canales por objeto, así que el canal `24+4i` era a la vez el TAMAÑO
 * del objeto `i` y el MODELO del objeto `i+1`. Y en el pueblo, el canal 34 servía a
 * la vez para el modelo del primer edificio y para la tirada del oficio del
 * segundo; como el índice se tomaba módulo 9 y la tirada módulo 6, y 9 y 6
 * comparten el factor 3, el resultado medido era que el edificio del oficio NUNCA
 * aparecía en segundo lugar salvo si el primero era casa o mercado — cuando el
 * comentario prometía «una de cada seis».
 *
 * Con los canales bautizados y con un hueco holgado entre bloques, pisarse exige
 * escribir el mismo nombre dos veces, que sí se ve.
 */
const CANALES_POR_COSA = 8;

const CANAL = {
  llenaONo: 11,
  cualLlena: 12,
  giroDelQueLlena: 13,
  cuantosSueltos: 14,
  /* Bloques de ocho a partir de aquí, uno por objeto suelto. */
  sueltos: 100,
  /* Y el pueblo, bien lejos de los sueltos. */
  hayCasa: 300,
  esOficio: 301,
  cualCasa: 302,
  sitioU: 303,
  sitioV: 304,
  giroDeLaCasa: 305,
  hayTrasto: 310,
  cualTrasto: 311,
  trastoU: 312,
  trastoV: 313,
  trastoGiro: 314,
  trastoTalla: 315,
} as const;

/**
 * Busca en una tabla sin que el prototipo de `Object` se cuele por en medio.
 *
 * `CAMPO['toString']` NO es `undefined`: es la función del prototipo, así que un
 * `?? POR_DEFECTO` detrás no dispara y lo que sale es una función disfrazada de
 * terreno, que revienta una línea más abajo. Y el vocabulario de terrenos lo trae
 * cada juego y llega por la red —así lo declara `tipos.ts` a propósito—, o sea que
 * ésta es la superficie por la que entraría.
 */
function deLaTabla<T>(tabla: Readonly<Record<string, T>>, clave: string): T | undefined {
  return Object.hasOwn(tabla, clave) ? tabla[clave] : undefined;
}

/**
 * DÓNDE VA UN SUELTO DENTRO DE SU TESELA.
 *
 * En polares y no en rejilla: una rejilla se ve por muy revuelta que esté, el ojo
 * encuentra las filas. El radio sale con raíz cuadrada a propósito —`√u` y no `u`—
 * porque sin ella el reparto se apelotona en el centro: la superficie de un anillo
 * crece con el radio, así que repartir el radio uniformemente concentra los puntos
 * donde menos sitio hay.
 *
 * El alcance es la APOTEMA de la tesela —`√3/2` del radio, la distancia del centro
 * al lado— y no el radio: un punto a menos de la apotema está dentro del hexágono
 * venga del ángulo que venga, sin comprobar seis lados.
 */
function dentroDeLaTesela(radio: number, u: number, v: number): Punto {
  const alcance = radio * (Math.sqrt(3) / 2) * 0.82;
  const angulo = u * Math.PI * 2;
  const d = Math.sqrt(v) * alcance;
  return { x: Math.cos(angulo) * d, y: Math.sin(angulo) * d };
}

/**
 * QUÉ VA ENCIMA DE UNA SUBTESELA.
 *
 * Devuelve la lista ya resuelta: modelo, sitio, giro y tamaño. Todo sale de las
 * coordenadas de la tesela, así que la misma tesela da siempre lo mismo y dos
 * clientes ven el mismo mundo sin hablar entre ellos. Ver `revoltijo.ts`.
 */
export function queVaEn(tesela: Subtesela, terreno: string): Puesto[] {
  const { q, r } = tesela.sub;

  /*
   * Una rampa se queda LIMPIA. Es por donde se sube, y además su superficie es una
   * cuña: cualquier cosa puesta encima se hunde por un lado y flota por el otro,
   * porque la altura de la tesela es la de su meseta y no la de la pendiente.
   */
  if (tesela.rampa !== null) return [];

  /*
   * EL RELLANO DE UN VÉRTICE: sólo guijarros, y pocos.
   *
   * Es donde el juego pone poblados y ciudades, y donde llegan los caminos. Si
   * estuviera lleno de árboles, una construcción de jugador aparecería medio metida
   * dentro de un bosque y nadie sabría dónde puede construir. Un par de piedras
   * bastan para que no parezca una explanada de asfalto.
   */
  if (tesela.rellano) {
    if (fraccion(q, r, CANAL.llenaONo) > 0.18) return [];
    const modelo = unoDe(DEL_BORDE, q, r, CANAL.cualLlena);
    if (modelo === null) return [];
    return [
      {
        modelo,
        donde: dentroDeLaTesela(
          RADIO_DE_TESELA,
          fraccion(q, r, CANAL.sitioU),
          fraccion(q, r, CANAL.sitioV),
        ),
        giro: fraccion(q, r, CANAL.giroDeLaCasa) * Math.PI * 2,
        talla: 0.7 + fraccion(q, r, CANAL.cuantosSueltos) * 0.35,
      },
    ];
  }

  /*
   * POR ENCIMA DE LA COTA DE NIEVE no crece nada y no vive nadie.
   *
   * Sólo asoman peñascos, y pocos. Es la regla natural más barata de todas y la que
   * más se nota: un bosque o un pueblo sobre la nieve delatan a la primera que el
   * paisaje se repartió sin mirar la altura.
   */
  if (tesela.nieve) {
    if (fraccion(q, r, CANAL.llenaONo) > 0.3) return [];
    const modelo = unoDe([MODELO.rocaA, MODELO.rocaC, MODELO.rocaE], q, r, CANAL.cualLlena);
    if (modelo === null) return [];
    return [
      {
        modelo,
        donde: dentroDeLaTesela(
          RADIO_DE_TESELA,
          fraccion(q, r, CANAL.sitioU),
          fraccion(q, r, CANAL.sitioV),
        ),
        giro: fraccion(q, r, CANAL.giroDeLaCasa) * Math.PI * 2,
        talla: 0.8 + fraccion(q, r, CANAL.cuantosSueltos) * 0.5,
      },
    ];
  }

  /*
   * LA PLAZA DEL NÚMERO, despejada.
   *
   * El número de la comarca se lee desde el aire y es la información más importante
   * del tablero: si un pueblo le crece encima, el juego deja de poder jugarse. Es la
   * ÚNICA concesión que el paisaje le hace a la geometría del hexágono, y por eso es
   * pequeña — dos teselas de radio en una comarca de doce.
   */
  if (tesela.rango <= RADIO_DE_LA_PLAZA) return [];

  /*
   * EL PUEBLO CRECE DONDE EL TERRENO LO PERMITE, no en el centro del hexágono.
   *
   * `habitabilidad` mezcla lo llano, lo bajo y una mancha de ruido; ver `relieve.ts`.
   * Así los pueblos salen en las vegas y en los valles, cada comarca tiene el suyo
   * donde le toca —a veces dos, a veces ninguno— y dos partidas no se parecen.
   */
  if (tesela.habitabilidad > HABITABLE) {
    return puebloEn(tesela, terreno);
  }

  const campo = deLaTabla(CAMPO, terreno) ?? CAMPO_POR_DEFECTO;
  const salida: Puesto[] = [];

  if (campo.llenan.length > 0 && fraccion(q, r, CANAL.llenaONo) < campo.cuantoLlena) {
    const modelo = unoDe(campo.llenan, q, r, CANAL.cualLlena);
    if (modelo !== null) {
      salida.push({
        modelo,
        donde: { x: 0, y: 0 },
        /* Múltiplo de sesenta grados: encaja con la tesela de al lado. */
        giro: (revoltijo(q, r, CANAL.giroDelQueLlena) % 6) * SEIS,
        talla: 1,
      });
      return salida;
    }
  }

  const cuantos = revoltijo(q, r, CANAL.cuantosSueltos) % (campo.cuantosSueltos + 1);
  for (let i = 0; i < cuantos; i++) {
    const base = CANAL.sueltos + i * CANALES_POR_COSA;
    const modelo = unoDe(campo.sueltos, q, r, base);
    if (modelo === null) continue;
    salida.push({
      modelo,
      donde: dentroDeLaTesela(RADIO_DE_TESELA, fraccion(q, r, base + 1), fraccion(q, r, base + 2)),
      giro: fraccion(q, r, base + 3) * Math.PI * 2,
      talla: 0.8 + fraccion(q, r, base + 4) * 0.45,
    });
  }
  return salida;
}

/**
 * EL PUEBLO: UN edificio por tesela, y algún trasto suelto.
 *
 * ═══ POR QUÉ UNO Y NO DOS, QUE ES LO QUE HABÍA ═══
 *
 * Porque dos no caben. Medido: la versión anterior repartía hasta dos edificios
 * dentro de un disco de 3,23 unidades de radio, y una casa mide 4,78 de ancho, una
 * iglesia 5,63 y una atalaya 6,55. El resultado eran dos edificios a 2,91 de media
 * cuando hacían falta más de cinco: el 93,4% de las teselas con dos edificios los
 * tenía empotrados uno dentro de otro. No se veía como un fallo, se veía como un
 * pueblo mal modelado.
 *
 * Con uno por tesela sobra sitio, y la densidad se regula con cuántas teselas del
 * pueblo llevan casa — que es un número que se puede subir sin que nada se solape.
 *
 * Los edificios van girados en múltiplos de sesenta grados y no libremente. Un
 * pueblo con las casas torcidas cada una a su aire parece un vertedero; alineadas
 * con la retícula del terreno parecen un pueblo, que es lo que hacen los pueblos de
 * verdad cuando el terreno manda.
 */
function puebloEn(tesela: Subtesela, terreno: string): Puesto[] {
  const { q, r } = tesela.sub;
  const salida: Puesto[] = [];

  /*
   * Cuanto mejor es el sitio, más apretado está el caserío: un pueblo tiene núcleo y
   * afueras, y lo que los separa es el terreno. En el umbral construye una tesela de
   * cada tres; en el mejor sitio de la vega, cinco de cada seis. Sin esto todos los
   * pueblos tendrían la misma densidad y se verían como sellos repetidos.
   */
  const empuje = Math.min(1, (tesela.habitabilidad - HABITABLE) * 4);
  if (fraccion(q, r, CANAL.hayCasa) > 0.34 + empuje * 0.5) return salida;

  /* Una de cada cinco casas es el edificio del oficio de la comarca. */
  const oficio = deLaTabla(OFICIO, terreno);
  const esOficio = oficio !== undefined && revoltijo(q, r, CANAL.esOficio) % 5 === 0;
  const modelo = esOficio ? oficio : unoDe(PUEBLO, q, r, CANAL.cualCasa);
  if (modelo === null) return salida;

  salida.push({
    modelo,
    donde: dentroDeLaTesela(
      RADIO_DE_TESELA * 0.5,
      fraccion(q, r, CANAL.sitioU),
      fraccion(q, r, CANAL.sitioV),
    ),
    giro: (revoltijo(q, r, CANAL.giroDeLaCasa) % 6) * SEIS,
    talla: 1,
  });

  if (revoltijo(q, r, CANAL.hayTrasto) % 4 === 0) {
    const trastos = [MODELO.barril, MODELO.caja, MODELO.carro, MODELO.saco, MODELO.lena];
    const trasto = unoDe(trastos, q, r, CANAL.cualTrasto);
    if (trasto !== null) {
      salida.push({
        modelo: trasto,
        donde: dentroDeLaTesela(
          RADIO_DE_TESELA,
          fraccion(q, r, CANAL.trastoU),
          fraccion(q, r, CANAL.trastoV),
        ),
        giro: fraccion(q, r, CANAL.trastoGiro) * Math.PI * 2,
        talla: 0.85 + fraccion(q, r, CANAL.trastoTalla) * 0.3,
      });
    }
  }

  return salida;
}
