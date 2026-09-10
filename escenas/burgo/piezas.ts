/**
 * LAS PIEZAS DEL BURGO: qué modelo de qué pack entra en `burgo.glb`, con qué nombre
 * lo busca la escena, y a qué escala queda cada uno.
 *
 * ═══ QUÉ ES EL BURGO, Y QUÉ CAMBIÓ EN ESTA TABLA (segunda vuelta) ═══
 *
 * Un arcade de la Sala: se compran solares, se cobra renta a quien cae en ellos y se
 * alzan casas —y luego una posada— para subirla. Su tablero es un anillo de cuarenta
 * casillas alrededor de una CIUDAD, y la ciudad es lo que esta tabla tiene que poder
 * levantar. La primera tabla era la de un tablero medieval con una muralla cerrando el
 * centro; la segunda quitó la muralla pero siguió siendo medieval. Miguel corrigió el
 * rumbo dos veces, y la segunda no deja lugar a dudas: la ciudad es MODERNA, su base es
 * el pack **City Builder**, y los demás packs entran para llenarla —restaurantes,
 * interiores, cementerio, polígono— no para vestirla de burgo.
 *
 * Así que aquí ya no manda «un edificio por solar» ni «piezas de aldea»: manda «un juego
 * de construcción urbano a escala de persona». Lo medieval que se cayó está al final, en
 * `PIEZAS_EN_ESPERA`, con su coste medido. El plano que esta tabla sirve es
 * `docs/burgo/LA-CIUDAD.md`, y él manda sobre la §5 de `DISENO-2.md`.
 *
 * ═══ OCHO PACKS Y TRES UNIDADES, TODAS MEDIDAS ═══
 *
 * El embarcadero sale de UN pack (`escenas/embarcadero/piezas.ts`), y por eso su tabla es
 * nombre y fichero. El Burgo mezcla ocho de KayKit (todos CC0, ver `arte/README.md`), y
 * hay que decir en qué unidad viene cada uno. Medido con `@gltf-transform` sobre los
 * 1.154 `.gltf` de los ocho packs —caja, triángulos, materiales, desvío de horneado—:
 *
 * 1. LA UNIDAD DE PERSONA, a factor 1. Cinco packs —dungeon, furniture-bits,
 *    restaurant-bits, halloween-bits y resource-bits— están dibujados en la misma unidad,
 *    la del personaje, y la prueba es que traen las mismas piezas dos veces:
 *
 *        dungeon/stool               0,750 × 0,500 × 0,750
 *        furniture-bits/chair_stool  0,750 × 0,500 × 0,750   (el mismo taburete)
 *        dungeon/table_small         1,000 × 1,000 × 1,000
 *        furniture-bits/table_small  1,000 × 1,000 × 1,000
 *        dungeon/bed_frame           1,500 × 1,063 × 3,000
 *        furniture-bits/bed_single_A 1,600 × 1,000 × 3,000
 *
 *    Y comparten REJILLA: cuatro unidades.
 *
 *        restaurant-bits/wall          4,000 × 4,000 × 0,500   (una planta)
 *        restaurant-bits/floor_kitchen 4,000 × 0,500 × 4,000   (el módulo de sala)
 *        dungeon/floor_tile_large      4,000 × 0,150 × 4,000
 *        halloween-bits/fence          4,000 × 2,200 × 0,500
 *        dungeon/stairs_modular_center 2,000 × 4,000 × 4,000   (sube una planta justa)
 *
 *    De ahí `MODULO_DE_LA_CIUDAD = 4`: una sala mide cuatro por lado, un tramo de muro
 *    cuatro, y el hueco libre de una planta cuatro de alto. Con la persona a 2,543, eso
 *    son 2,83 metros de techo: los de un piso de verdad.
 *
 * 2. LA UNIDAD DEL URBANISMO (City Builder), a factor 6. Ver `ESCALA_DEL_URBANISMO`: el
 *    pack viene en losas de 2 × 2, y esas losas son la retícula de la ciudad.
 *
 * 3. LAS FICHAS DE MESA (Board Game Bits), a `ESCALA_DE_LAS_FICHAS`: casa, peón, disco,
 *    figura, banderines y monedas no tienen referente en el mundo, así que se anclan como
 *    `escala.ts` ancló la casa: una casa-ficha mide UNA persona (2,543 por 1,000 medido),
 *    y el peón queda a 2,33.
 *
 * 4. EL HEXAGONAL (`ESCALA_DEL_PACK`, 5,469), la misma cadena de `escala.ts`. De este pack
 *    ya NO entra un solo edificio: es medieval y la ciudad no lo es. Entra sólo el CAMPO
 *    de fuera del anillo —teselas de hierba, árboles, arboledas, rocas, colinas, nubes—,
 *    que es paisaje y no tiene siglo.
 *
 * ═══ LA RETÍCULA DE LA CIUDAD SALE DE LAS PIEZAS DE CARRETERA, MEDIDA ═══
 *
 * Las seis piezas de carretera del City Builder —`road_straight`, `road_straight_crossing`,
 * `road_corner`, `road_corner_curved`, `road_junction`, `road_tsplit`— miden EXACTAMENTE
 * lo mismo: 2,000 × 0,100 × 2,000, centradas en el origen (x y z de −1 a +1). Y `base`
 * —la parcela de acera sobre la que se posan los edificios— mide otro tanto, y los ocho
 * bloques `building_A`…`building_H` traen esa misma base debajo. O sea: el pack entero
 * es un damero de losas de dos unidades, y calles y manzanas encajan sin un hueco porque
 * están dibujadas para encajar.
 *
 * Dentro de la losa de carretera, medido vértice a vértice:
 *
 *        bordillo         |x| de 0,90 a 1,00    (0,10 de acera alzada a cada lado)
 *        calzada          |x| < 0,90            (1,80 entre bordillos)
 *        línea de eje     |x| < 0,02, a trazos en z cada 0,20
 *        líneas de carril |x| de 0,58 a 0,62
 *        asfalto a y = 0,070 · bordillo a y = 0,100
 *
 * Dos carriles de 0,90, con su eje a |x| = 0,45. Eso es lo que fija dónde va un coche.
 *
 * ═══ EL FACTOR DEL PACK NUEVO: SEIS, Y POR QUÉ SEIS ═══
 *
 * Ver `ESCALA_DEL_URBANISMO`. En corto: a 6 la losa de 2 mide 12 —tres módulos de sala
 * justos—, el coche mide 5,63 (3,98 m de largo, 1,78 de ancho, 1,57 de alto: un coche de
 * verdad), la calzada 10,8 entre bordillos (7,6 m, dos carriles de 3,8) y la planta del
 * pack (0,75 medido: `building_C/D/E/F/G_withoutBase` miden 2,250 = 3 × 0,750) cae en
 * 4,50, que es justo el módulo de sala más el grueso de la losa. Los tres números se
 * atan solos, y ninguno se eligió: los tres salieron de medir.
 *
 * ═══ LA ESCALA SE APLICA AL COMPILAR, AL REVÉS QUE EN EL EMBARCADERO ═══
 *
 * `embarcadero.glb` va a la unidad del pack y la escena lo sube con `ESCALA_DEL_PACK` al
 * instanciar, porque comparte pack con el tablero. Aquí eso no vale: con cuatro unidades,
 * la escena tendría que llevar una tabla de factores y acordarse de aplicarla en cada
 * instancia, y el día que se olvidara en una saldría un coche del tamaño de un edificio
 * sin que nada protestara. Así que el compilador HORNEA la escala en las posiciones —y en
 * las traslaciones de los hijos—, `burgo.glb` sale ya a escala del mundo, y la escena lo
 * instancia a 1. La consecuencia, dicha para quien monte la ciudad: una pieza de este
 * fichero NO se multiplica por nada, venga del pack que venga.
 *
 * ═══ EL COLOR DE JUGADOR SE TIÑE, COMO EN EL EMBARCADERO ═══
 *
 * Las piezas de asiento entran en su variante AZUL con la máscara `_TINTE` que el
 * compilador deriva comparando con la ROJA (`compilar-embarcadero.ts` cuenta el método).
 * Aquí las cinco son de Board Game Bits, que es lo que queda del tablero cuando la ciudad
 * se moderniza: casa, peón, figura, disco y los dos banderines. `escenas/embarcadero/tinte.ts`
 * tiñe también estas piezas; lo que cambia es el azul de referencia (`AZUL_DE_LAS_FICHAS`).
 *
 * ═══ QUÉ NO ENTRA, MEDIDO ═══
 *
 * El horno muestrea la textura del pack en cada vértice y tira las UV: una pieza cuyo
 * dibujo cambie DENTRO de un triángulo pierde ese dibujo y sale plana. Medido sobre los
 * 1.154 `.gltf` (desvío entre el color del baricentro y la media de los tres vértices, en
 * pasos de sRGB): las 41 piezas del City Builder quedan entre 0 y 10 pasos —el atlas
 * `citybits_texture.png` son celdas planas, se hornea perfecto, incluidos los coches y
 * las líneas de la calzada, que son GEOMETRÍA y no dibujo—; las que se pasan siguen siendo
 * las mismas de siempre: las CARTAS de personaje (`playercard_*`, `tile_*`: 110-224), los
 * dados con los números pintados (`D6_C`, `D8`, `D20`: 70-80) y siete con una raya fina
 * (`chest_gold`, los montones de monedas y `wall_window_closed`, 25-30).
 *
 * ═══ ESTE FICHERO NO IMPORTA `three`, A PROPÓSITO ═══
 *
 * Es DATO: lo lee el compilador (Node, sin contexto de dibujo), lo lee el comprobador y lo
 * leerá la escena. Ver la cabecera de `escenas/nombres.ts`, que explica también por qué
 * ningún nombre lleva puntos ni dos puntos.
 */
import { ALTURA_DE_UNA_PERSONA, ESCALA_DEL_PACK } from '../escala';
import { NOMBRE_QUE_SOBREVIVE } from '../nombres';

/* La misma máscara que el embarcadero: un solo `tinte.ts` para los dos ficheros. */
export { ATRIBUTO_DE_TINTE, ATRIBUTO_DE_TINTE_CARGADO } from '../embarcadero/piezas';

// ---------------------------------------------------------------------------
// La escala
// ---------------------------------------------------------------------------

/**
 * EL MÓDULO DE SALA, en unidades del mundo: cuatro.
 *
 * No es una elección: es lo que miden, ya a escala de persona, el muro, la losa, el techo,
 * la valla, la barrera y el peldañeado de los cinco packs que comparten unidad (la cabecera
 * trae las medidas). Una sala mide esto de lado, un tramo de muro esto de largo, y el hueco
 * libre de una planta esto de alto. Con la persona a 2,543, son 2,83 metros de techo.
 */
export const MODULO_DE_LA_CIUDAD = 4;

/** Lo que engorda una losa de piso entre planta y planta: medio módulo de sala. */
export const GRUESO_DE_LA_LOSA = 0.5;

/**
 * LA ALTURA DE UNA PLANTA, de suelo a suelo: 4,5.
 *
 * El hueco libre (4) más la losa (0,5). Y aquí está la medida que ata los dos mundos: la
 * planta del pack City Builder mide 0,75 —`building_C`, `D`, `E`, `F` y `G` sin base miden
 * 2,250, que es 3 × 0,750 clavado—, y 0,75 × `ESCALA_DEL_URBANISMO` = 4,50. O sea: las
 * ventanas de un bloque del pack caen exactamente en los pisos que se construyen dentro
 * con geometría propia. No hubo que forzar nada; salió al medir.
 */
export const ALTURA_DE_PLANTA = MODULO_DE_LA_CIUDAD + GRUESO_DE_LA_LOSA;

/**
 * LA RETÍCULA DE LA CIUDAD, en unidades del mundo: doce, tres módulos de sala.
 *
 * Es la celda sobre la que se traza la ciudad entera: o es una losa de calle, o es una
 * parcela con su acera y su edificio. Sale de que el City Builder dibuja calles y parcelas
 * en losas de 2 × 2 y de que una parcela tiene que poder tener salas dentro: tres módulos
 * de 4 son 12, y 12 / 2 = 6, que es el factor del pack. Doce unidades son 8,5 metros: una
 * calle de dos carriles con sus dos aceras, o una casa entre medianeras.
 */
export const RETICULA_DE_LA_CIUDAD = 3 * MODULO_DE_LA_CIUDAD;

/** Lo que mide de lado una losa de calle o de parcela EN EL PACK, medido: dos. */
export const LADO_DE_LA_LOSA_EN_EL_PACK = 2;

/**
 * EL FACTOR DEL CITY BUILDER: seis. Lo decide la retícula, y lo confirman el coche y la planta.
 *
 * Los tres anclajes que se pueden medir contra el mundo dicen lo mismo:
 *
 *     losa de calle   2,000 → 12,00   tres módulos de sala; 8,49 m de calle
 *     calzada         1,800 → 10,80   7,64 m entre bordillos, dos carriles de 3,82
 *     coche berlina   0,938 →  5,63   3,98 m de largo (0,419 → 2,51 = 1,78 m de ancho,
 *                                     0,380 → 2,28 = 1,61 m de alto con las ruedas)
 *     planta del pack 0,750 →  4,50   `ALTURA_DE_PLANTA` exacta
 *     farola          0,960 →  5,76   4,08 m
 *     banco           0,400 →  2,40   1,70 m
 *     contenedor      0,566 →  3,40   2,40 m de largo
 *
 * Y el aventurero, de 2,543, le llega al techo al coche (2,28) y le pasa un palmo: es lo
 * que tiene que pasar. El pack es de figuritas —el depósito de agua sale a 4,02 de alto,
 * que es un depósito de azotea y no una torre de polígono—, y eso se dice en la ficha de
 * cada pieza, no se arregla con un factor distinto por pieza.
 */
export const ESCALA_DEL_URBANISMO = RETICULA_DE_LA_CIUDAD / LADO_DE_LA_LOSA_EN_EL_PACK;

/** La casa-ficha de Board Game Bits mide esto de alto en su pack (0,985 × 1,000 × 1,000). */
export const ALTURA_DE_LA_CASA_FICHA_EN_EL_PACK = 1;

/** Una casa-ficha mide UNA persona. Sale 2,543. */
export const ESCALA_DE_LAS_FICHAS = ALTURA_DE_UNA_PERSONA / ALTURA_DE_LA_CASA_FICHA_EN_EL_PACK;

/**
 * LOS CINCO PACKS DE PERSONA VAN A UNO, y esto no es «no escalar»: es la medida.
 *
 * Ver la cabecera: el taburete del Dungeon (0,750 × 0,500 × 0,750) y el de Furniture son
 * el mismo taburete, y los dos son media persona de asiento.
 */
export const ESCALA_DE_PERSONA = 1;

/**
 * LO MÁS GRANDE QUE PUEDE SER UNA PIEZA, en unidades del mundo: seis módulos.
 *
 * Un tope de cordura para que una pieza mal elegida —un rascacielos entero, un pack a otra
 * escala— se vea al compilar y no al pintar. Lo más alto que hay hoy en la tabla es el
 * bloque H (18,30 ya escalado, cuatro plantas), y lo más ancho la nube grande del
 * hexagonal (19,73), que va en el cielo y no estorba a nadie.
 */
export const TALLA_MAXIMA_DE_PIEZA = 6 * MODULO_DE_LA_CIUDAD;

/**
 * EL TECHO DEL FICHERO: OCHO megas, y sube a sabiendas.
 *
 * Eran tres: lo que se aceptó que viajara a un móvil cuando el catálogo era «una pieza
 * decorativa por casilla» y el centro del tablero una muralla vacía. Con una ciudad dentro
 * —calles, bloques, coches, cocinas, salones, tumbas, palets— el catálogo pasa de 73
 * piezas a más del doble, y en tres megas no entra sin dejar fuera justo lo que Miguel
 * pidió que se viera.
 *
 * Ocho, y no diez ni «lo que salga», porque hay un precedente MEDIDO en este mismo árbol:
 * `escenas/modelos/tablero.glb` pesa 4.209 kB, viaja en cada despliegue y se descarga en
 * cada móvil que abre Riberas, y nadie ha informado de que eso sea un problema. Ocho es el
 * doble de ese precedente, que es lo que cuesta traer una ciudad en vez de una comarca, y
 * sigue siendo menos que una foto de vacaciones. Lo que NO cabe en ocho no se mete a la
 * fuerza: se decide a mano en esta tabla, con los números delante, y se anota en
 * `PIEZAS_EN_ESPERA`.
 *
 * Lo lee el compilador para negarse a escribir más, y el comprobador para exigir que lo
 * escrito no se haya pasado.
 */
export const TOPE_DE_BYTES_DEL_BURGO = 8 * 1024 * 1024;

/** Lo que pesa `tablero.glb`, el precedente contra el que se eligió el tope de arriba. */
export const BYTES_DEL_TABLERO_DE_RIBERAS = 4_309_860;

// ---------------------------------------------------------------------------
// Los packs
// ---------------------------------------------------------------------------

/** Dónde se descomprimen los packs, respecto a la raíz del repositorio. */
export const CARPETA_DE_PACKS = 'arte/kaykit';

export type PackDelBurgo =
  | 'city-builder'
  | 'hexagon-extra'
  | 'board-game-bits'
  | 'dungeon'
  | 'resource-bits'
  | 'furniture-bits'
  | 'restaurant-bits'
  | 'halloween-bits';

/**
 * CADA PACK: su carpeta de `.gltf` (la estructura del zip tal cual, como espera
 * `arte/README.md`) y a cuánto hay que subirlo para que quede a escala del mundo.
 * Cinco de los ocho van a uno: ver `ESCALA_DE_PERSONA`.
 */
export const PACKS: Readonly<Record<PackDelBurgo, { readonly carpeta: string; readonly escala: number }>> = {
  'city-builder': { carpeta: 'city-builder/KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf', escala: ESCALA_DEL_URBANISMO },
  'hexagon-extra': { carpeta: 'hexagon-extra/KayKit_Medieval_Hexagon_Pack_1.0_EXTRA/Assets/gltf', escala: ESCALA_DEL_PACK },
  'board-game-bits': { carpeta: 'board-game-bits/KayKit_BoardGameBits_1.0_FREE/Assets/gltf', escala: ESCALA_DE_LAS_FICHAS },
  dungeon: { carpeta: 'dungeon/KayKit_Dungeon_Pack_1.1_FREE/Assets/gltf', escala: ESCALA_DE_PERSONA },
  'resource-bits': { carpeta: 'resource-bits/KayKit_ResourceBits_1.0_FREE/Assets/gltf', escala: ESCALA_DE_PERSONA },
  'furniture-bits': { carpeta: 'furniture-bits/KayKit_Furniture_Bits_1.0_FREE/Assets/gltf', escala: ESCALA_DE_PERSONA },
  'restaurant-bits': { carpeta: 'restaurant-bits/KayKit_Restaurant_Bits_1.0_FREE/Assets/gltf', escala: ESCALA_DE_PERSONA },
  'halloween-bits': { carpeta: 'halloween-bits/KayKit_HalloweenBits_1.0_FREE/Assets/gltf', escala: ESCALA_DE_PERSONA },
};

// ---------------------------------------------------------------------------
// Las piezas
// ---------------------------------------------------------------------------

/** Una pieza que entra en el `.glb`: nuestro nombre, de dónde sale, y a qué escala. */
export interface PiezaDelBurgo {
  readonly nombre: string;
  /** Ruta dentro de la carpeta de `.gltf` del pack. */
  readonly pack: PackDelBurgo;
  readonly fichero: string;
  /**
   * La variante ROJA de la misma pieza, sólo en las que se tiñen: el compilador la
   * hornea también y deriva `_TINTE` de la diferencia con la azul.
   */
  readonly tinte?: string;
  /**
   * Un factor POR ENCIMA del de su pack, para la pieza que quiera ir a otra talla que sus
   * hermanas. Se multiplica: 1 si no se dice. Nadie lo usa todavía; está para que ampliar
   * no obligue a inventar otro pack.
   */
  readonly escala?: number;
}

/** A cuánto se hornea una pieza: el factor de su pack por el suyo propio. */
export function escalaDe(pieza: PiezaDelBurgo): number {
  return PACKS[pieza.pack].escala * (pieza.escala ?? 1);
}

/* Los caminos dentro del pack hexagonal, los mismos que usa el embarcadero. */
const suelo = (f: string): string => `tiles/base/${f}.gltf`;
const natura = (f: string): string => `decoration/nature/${f}.gltf`;
/* Los otros siete packs tienen todos los `.gltf` en la raíz de su carpeta. */
const plano = (f: string): string => `${f}.gltf`;

/**
 * LOS NOMBRES QUE EL CÓDIGO USA, en un solo sitio.
 *
 * Constantes y no cadenas sueltas por lo de siempre: una cadena mal escrita no la ve el
 * compilador, y el síntoma es una pieza que no aparece, sin error.
 */
export const PIEZA = {
  /* ── Las piezas de asiento. Se TIÑEN: entran en azul con su máscara. ── */
  casa: 'casa',
  peon: 'peon',
  figura: 'figura',
  ficha: 'ficha',
  bandera: 'bandera',
  estandarte: 'estandarte',

  /* ── LA CALLE: las seis losas con las que se traza la red entera ── */
  calzada: 'calzada',
  calzadaPaso: 'calzada-paso',
  calzadaCurva: 'calzada-curva',
  calzadaCurvaSuave: 'calzada-curva-suave',
  calzadaCruce: 'calzada-cruce',
  calzadaTe: 'calzada-te',
  solera: 'solera',

  /* ── LOS OCHO BLOQUES, con su parcela y sin ella ── */
  bloqueA: 'bloque-a',
  bloqueB: 'bloque-b',
  bloqueC: 'bloque-c',
  bloqueD: 'bloque-d',
  bloqueE: 'bloque-e',
  bloqueF: 'bloque-f',
  bloqueG: 'bloque-g',
  bloqueH: 'bloque-h',
  cuerpoA: 'cuerpo-a',
  cuerpoB: 'cuerpo-b',
  cuerpoC: 'cuerpo-c',
  cuerpoD: 'cuerpo-d',
  cuerpoE: 'cuerpo-e',
  cuerpoF: 'cuerpo-f',
  cuerpoG: 'cuerpo-g',
  cuerpoH: 'cuerpo-h',

  /* ── LOS COCHES ── */
  cocheBerlina: 'coche-berlina',
  cocheUtilitario: 'coche-utilitario',
  cocheFamiliar: 'coche-familiar',
  cocheTaxi: 'coche-taxi',
  cochePatrulla: 'coche-patrulla',

  /* ── EL MOBILIARIO URBANO ── */
  farolaDeCalle: 'farola-de-calle',
  semaforoA: 'semaforo-a',
  semaforoB: 'semaforo-b',
  semaforoC: 'semaforo-c',
  bancoDeCalle: 'banco-de-calle',
  arbusto: 'arbusto',
  bocaDeRiego: 'boca-de-riego',
  contenedor: 'contenedor',
  papelera: 'papelera',
  cajaDeObraGrande: 'caja-de-obra-grande',
  cajaDeObra: 'caja-de-obra',
  torreDeAgua: 'torre-de-agua',

  /* ── LA COCINA Y EL COMEDOR: restaurantes, bares y las cocinas de las casas ── */
  encimera: 'encimera',
  encimeraEsquina: 'encimera-esquina',
  fregadero: 'fregadero',
  alacena: 'alacena',
  fogon: 'fogon',
  campana: 'campana',
  horno: 'horno',
  nevera: 'nevera',
  escurreplatos: 'escurreplatos',
  mesaDeCocina: 'mesa-de-cocina',
  mesaRedonda: 'mesa-redonda',
  mesaPequena: 'mesa-pequena',
  silla: 'silla',
  mostrador: 'mostrador',
  hojaDePuerta: 'hoja-de-puerta',
  columna: 'columna',
  muro: 'muro',
  losa: 'losa',
  olla: 'olla',
  sarten: 'sarten',
  cuenco: 'cuenco',
  plato: 'plato',
  platoServido: 'plato-servido',
  tabla: 'tabla',
  tarro: 'tarro',
  salsaRoja: 'salsa-roja',
  salsaAmarilla: 'salsa-amarilla',
  servilletero: 'servilletero',
  carta: 'carta',
  cajon: 'cajon',
  cajaDeJamones: 'caja-de-jamones',
  cajaDeZanahorias: 'caja-de-zanahorias',

  /* ── EL SALÓN, EL DORMITORIO Y LA OFICINA ── */
  sofa: 'sofa',
  sofaConCojines: 'sofa-con-cojines',
  butaca: 'butaca',
  cama: 'cama',
  catre: 'catre',
  armario: 'armario',
  armarioPequeno: 'armario-pequeno',
  anaquel: 'anaquel',
  anaquelPequeno: 'anaquel-pequeno',
  mesaBaja: 'mesa-baja',
  mesaMediana: 'mesa-mediana',
  mesaLarga: 'mesa-larga',
  mesilla: 'mesilla',
  sillaDeOficina: 'silla-de-oficina',
  taburete: 'taburete',
  lampara: 'lampara',
  lamparaDeMesa: 'lampara-de-mesa',
  alfombra: 'alfombra',
  alfombraDeRayas: 'alfombra-de-rayas',
  alfombraOvalada: 'alfombra-ovalada',
  cuadro: 'cuadro',
  cuadroPequeno: 'cuadro-pequeno',
  retrato: 'retrato',
  libros: 'libros',
  almohada: 'almohada',
  cojin: 'cojin',

  /* ── EL SÓTANO, EL TRASTERO Y LA TIENDA ── */
  escalera: 'escalera',
  escaleraIzquierda: 'escalera-izquierda',
  escaleraDerecha: 'escalera-derecha',
  banqueta: 'banqueta',
  mesaDeTrabajo: 'mesa-de-trabajo',
  estanteDePared: 'estante-de-pared',
  repisa: 'repisa',
  caja: 'caja',
  cajaPequena: 'caja-pequena',
  barril: 'barril',
  barrilPequeno: 'barril-pequeno',

  /* ── EL CEMENTERIO ── */
  tumba: 'tumba',
  tumbaLlana: 'tumba-llana',
  lapida: 'lapida',
  hito: 'hito',
  hitoB: 'hito-b',
  cripta: 'cripta',
  sarcofago: 'sarcofago',
  verja: 'verja',
  verjaPuerta: 'verja-puerta',
  verjaPoste: 'verja-poste',
  arcoDeVerja: 'arco-de-verja',
  losaConmemorativa: 'losa-conmemorativa',
  tierra: 'tierra',

  /* ── EL PARQUE ── */
  sendero: 'sendero',
  farolaDeParque: 'farola-de-parque',
  farolDePie: 'farol-de-pie',
  bancoDeParque: 'banco-de-parque',
  pino: 'pino',
  pinoGrande: 'pino-grande',
  pinoPequeno: 'pino-pequeno',
  pinoRojo: 'pino-rojo',
  arbolSeco: 'arbol-seco',
  arbolSecoMediano: 'arbol-seco-mediano',

  /* ── EL POLÍGONO ── */
  palet: 'palet',
  paletCubierto: 'palet-cubierto',
  tablones: 'tablones',
  sillares: 'sillares',
  bidon: 'bidon',
  garrafa: 'garrafa',
  chatarra: 'chatarra',
  perfiles: 'perfiles',
  fardo: 'fardo',
  lingotes: 'lingotes',

  /* ── EL DINERO ── */
  moneda: 'moneda',
  moneda5: 'moneda-5',
  moneda10: 'moneda-10',

  /* ── EL CAMPO DE FUERA DEL ANILLO: lo único que queda del hexagonal ── */
  tesela: 'tesela',
  fondo: 'tesela-fondo',
  arbolA: 'arbol-a',
  arbolB: 'arbol-b',
  arboledaPequena: 'arboleda-pequena',
  arboledaMediana: 'arboleda-mediana',
  arboledaGrande: 'arboleda-grande',
  rocaA: 'roca-a',
  rocaB: 'roca-b',
  nubeGrande: 'nube-grande',
  nubePequena: 'nube-pequena',
  colinasA: 'colinas-a',
} as const;

export type NombreDePieza = (typeof PIEZA)[keyof typeof PIEZA];

/** Las que llevan máscara de tinte. La escena las tiñe del color del asiento. */
export const PIEZAS_QUE_SE_TINEN: readonly NombreDePieza[] = [
  PIEZA.casa,
  PIEZA.peon,
  PIEZA.figura,
  PIEZA.ficha,
  PIEZA.bandera,
  PIEZA.estandarte,
];

/**
 * LAS QUE SE TIÑEN ENTERAS, medido al compilar y no supuesto.
 *
 * Las SEIS de Board Game Bits son piezas de un solo color: pintadas enteras en la celda de
 * su color del atlas, y la roja es la misma celda una columna más allá, así que difieren en
 * TODOS sus vértices. Los dos banderines se declararon primero a medias —parecía que el
 * mástil sería madera en las dos variantes— y el compilador midió lo contrario y se negó a
 * escribir el fichero: en este pack el mástil también cae dentro de la celda del color.
 * De ahí que estén los seis. `verify:burgo-modelos` exige que sean exactamente éstas.
 *
 * La consecuencia la paga quien tiñe (`embarcadero/tinte.ts`): en las enteras hay que
 * conservar la luminancia relativa de cada vértice, no sustituir el color en plano, o la
 * ficha sale sin volumen.
 */
export const PIEZAS_TENIDAS_ENTERAS: readonly NombreDePieza[] = [
  PIEZA.casa,
  PIEZA.peon,
  PIEZA.figura,
  PIEZA.ficha,
  PIEZA.bandera,
  PIEZA.estandarte,
];

/**
 * EL AZUL MEDIO DE LAS FICHAS de Board Game Bits en sRGB, medido al compilar sobre los
 * vértices de tinte de la casa-ficha: la referencia contra la que se mide la luminancia de
 * un vértice teñible para conservar su sombreado al cambiarle el color.
 */
export const AZUL_DE_LAS_FICHAS: readonly [number, number, number] = [36, 126, 187];

/**
 * LO QUE NO ESTÁ EN LA TABLA, Y POR QUÉ. Se vuelve con una línea en `PIEZAS_DEL_BURGO` y
 * otra en `PIEZA`, a cambio de quitar otras o de mirar otra vez el tope.
 *
 * ── SE CAYÓ TODO EL EDIFICIO MEDIEVAL (Miguel, 9-sep-2026: «no lo hagas medieval, hazlo
 *    con ese pack [City Builder] de base»). No es peso: es que la ciudad es de este siglo,
 *    y una colegiata de piedra en la manzana de al lado del centro comercial la deshace.
 *    Del hexagonal ya sólo entra el CAMPO de fuera del anillo. Triángulos medidos: ──
 *
 *      muralla / puerta / esquinas de muralla   504 · 820 · 414 · 796
 *      casa-grande  buildings/blue/building_home_A_blue      1.243
 *      posada       buildings/blue/building_tavern_blue      2.992
 *      iglesia      buildings/yellow/building_church         2.616
 *      ayuntamiento buildings/blue/building_townhall         2.148
 *      herreria · mercado · aserradero · mina · establos · ermita · muelle
 *      torre-a · torre-b · vigia · caseron · molino · pozo · torreon
 *      tablado · tienda · almiar · diana · puente · sembrado · eriazo
 *      valla-de-piedra · valla-de-madera · valla-de-madera-puerta
 *      castillo 5.659 · cuartel 4.007 · campo-de-tiro 3.819 · astillero 3.390
 *      taller 3.672 · andamios 2.672
 *
 * ── Y CON ELLO, EL ATREZO DE ALDEA: existe y se hornea bien, pero no es de una ciudad ──
 *
 *      antorcha · antorcha-pared · vela · farol de mano · pendón · llavero
 *      cofre · arca (chest_gold, además con raya fina) · cuba (keg)
 *      catre-de-tablas (bed_frame) · muro-ventana / muro-puerta / muro-arco / muro-medio /
 *      muro-remate / muro-esquina / muro-reja (los del Dungeon: son de piedra de mazmorra;
 *      los tabiques de la ciudad se hacen con geometría propia, ver `LA-CIUDAD.md` §6)
 *      valla-de-carrera / poste-de-carrera / curva-de-carrera (barreras de mazmorra: el
 *      quitamiedos del circuito es una cinta de geometría propia, 2 triángulos por tramo)
 *
 * ── Fuera por caras, con su coste medido ──
 *
 *      caja-de-panes    restaurant-bits crate_buns.gltf        2.772
 *      caja-de-lechugas restaurant-bits crate_lettuce.gltf     1.980
 *      lena             resource-bits Wood_Log_Stack.gltf      3.576
 *      telas            resource-bits Textiles_Stack_Small     1.668
 *      barriles         resource-bits Fuel_A_Barrels.gltf      4.400 (entra el suelto, 868)
 *      lingotes grandes resource-bits Gold_Bars_Stack_Large    5.184 (entra el pequeño, 648)
 *
 * ── Fuera porque el horno les borra el dibujo (desvío medido, en pasos de sRGB) ──
 *
 *      wall_window_closed  restaurant-bits   30 pasos  (no hace falta: no entra ningún muro
 *                                                       de restaurante con ventana)
 *      playercard_*, tile_*  board-game-bits 110-224   (cartas con retrato)
 *      D6_C, D8, D20         board-game-bits  70-80    (números pintados)
 *      Fuel_C_Barrel_Dirty   resource-bits    25       (entra `Fuel_A_Barrel`, 2)
 *
 * ── Fuera por talla: se salen del suelo de `TALLA_MINIMA` del comprobador ──
 *
 *      trash_B  city-builder  0,068 × 0,040 × 0,071 → 0,43 en el mundo, y el suelo es 0,50.
 *               Entra `trash_A` (0,133 → 0,80), que es la misma papelera un número mayor.
 *
 * ── Fuera por tema, aunque sean modernas ──
 *
 *      calabazas   halloween-bits pumpkin_*        (el cementerio no es de Halloween)
 *      esqueletos  halloween-bits skull / bone / ribcage
 *      cactus      furniture-bits cactus_*
 *
 * ── NO HAY HOTEL, Y SE BUSCÓ PIEZA A PIEZA ANTES DE ESCALAR LA CASA ──
 *
 * Al dar volumen propio al hotel (`TALLA_DEL_HOTEL` en `anillo-en-3d.ts`) lo primero fue
 * mirar si el disco tenía un modelo mejor que estirar la casa. Board Game Bits es el único
 * pack con la MISMA pieza en cuatro colores, que es lo que hace falta para derivar la máscara
 * de tinte (la azul y la roja, ver `PIEZAS_QUE_SE_TINEN`), y de sus piezas con color sólo hay
 * éstas: `building` (la casa que ya entra), `pawn_A` y `pawn_B`, `meeple`, `token`, `tile`,
 * `cube`, `flag_A` y `flag_B`, `playerstand`, `playercard_*` y los dados. Ninguna es un
 * edificio mayor.
 *
 * Los `container_A/B/C` —lo más parecido a un bloque grande que hay en el pack— vienen en UN
 * solo color, así que no se les puede derivar máscara y no se pueden teñir del color del
 * dueño; y un hotel que no lleve el color de su dueño no dice lo único que tiene que decir. Un
 * edificio del City Builder (`bloque-*`, `cuerpo-*`) tampoco vale: son piezas de ciudad, con
 * su color horneado, y puesto en la franja del barrio no se leería como ficha de tablero sino
 * como un edificio caído dentro de la casilla.
 *
 * Así que el hotel se hace estirando la casa, y esa decisión ahorra además 12 instancias de
 * otra pieza y una llamada de dibujo (ver la decisión 12 en `presupuesto.ts`).
 */
export const PIEZAS_EN_ESPERA: readonly string[] = [
  'muralla',
  'puerta-muralla',
  'esquina-muralla',
  'esquina-puerta',
  'casa-grande',
  'posada',
  'iglesia',
  'ayuntamiento',
  'herreria',
  'mercado',
  'aserradero',
  'mina',
  'establos',
  'ermita',
  'muelle',
  'torre-a',
  'torre-b',
  'vigia',
  'caseron',
  'molino',
  'pozo',
  'torreon',
  'tablado',
  'tienda',
  'almiar',
  'diana',
  'puente',
  'sembrado',
  'eriazo',
  'valla-de-piedra',
  'valla-de-madera',
  'valla-de-madera-puerta',
  'castillo',
  'cuartel',
  'campo-de-tiro',
  'astillero',
  'taller',
  'andamios',
  'antorcha',
  'antorcha-pared',
  'vela',
  'farol',
  'pendon',
  'llavero',
  'cofre',
  'arca',
  'cuba',
  'catre-de-tablas',
  'muro-ventana',
  'muro-puerta',
  'muro-arco',
  'muro-medio',
  'muro-remate',
  'muro-esquina',
  'muro-reja',
  'suelo-de-madera',
  'suelo-de-tierra',
  'techo',
  'zocalo',
  'pilar',
  'valla-de-carrera',
  'poste-de-carrera',
  'curva-de-carrera',
  'baldosa-de-camino',
  'banco',
  'farola',
  'puchero',
  'mesa-de-madera',
  'caja-de-panes',
  'caja-de-lechugas',
  'lena',
  'telas',
  'trash-b',
  'calabazas',
  'esqueletos',
  'cactus',
];

/** La tabla entera: lo que compila `compilar-burgo.ts`, en este orden. */
export const PIEZAS_DEL_BURGO: readonly PiezaDelBurgo[] = [
  /*
   * DE ASIENTO: la azul, más la roja para derivar la máscara. Las seis son de Board Game
   * Bits, que es el único pack que trae la misma pieza en cuatro colores. Los dos
   * banderines sustituyen a la bandera y al estandarte del hexagonal, que eran de
   * pendón medieval: éstos son banderines de mesa, sin siglo.
   */
  { nombre: PIEZA.casa, pack: 'board-game-bits', fichero: plano('building_blue'), tinte: plano('building_red') },
  { nombre: PIEZA.peon, pack: 'board-game-bits', fichero: plano('pawn_A_blue'), tinte: plano('pawn_A_red') },
  { nombre: PIEZA.figura, pack: 'board-game-bits', fichero: plano('meeple_blue'), tinte: plano('meeple_red') },
  { nombre: PIEZA.ficha, pack: 'board-game-bits', fichero: plano('token_blue'), tinte: plano('token_red') },
  { nombre: PIEZA.bandera, pack: 'board-game-bits', fichero: plano('flag_B_blue'), tinte: plano('flag_B_red') },
  { nombre: PIEZA.estandarte, pack: 'board-game-bits', fichero: plano('flag_A_blue'), tinte: plano('flag_A_red') },

  /*
   * LA CALLE. Seis losas de 2 × 2 en el pack, 12 × 12 en el mundo, y con ellas se traza la
   * red entera sin una junta: recta, recta con paso de cebra, esquina en ángulo, esquina
   * redondeada (la de las glorietas), cruce de cuatro y cruce en te. `solera` es la misma
   * losa sin calzada: la parcela de acera sobre la que se posa un bloque, o el suelo de una
   * plaza. Triángulos: 58, 64, 152, 172, 170, 138 y 60.
   */
  { nombre: PIEZA.calzada, pack: 'city-builder', fichero: plano('road_straight') },
  { nombre: PIEZA.calzadaPaso, pack: 'city-builder', fichero: plano('road_straight_crossing') },
  { nombre: PIEZA.calzadaCurva, pack: 'city-builder', fichero: plano('road_corner') },
  { nombre: PIEZA.calzadaCurvaSuave, pack: 'city-builder', fichero: plano('road_corner_curved') },
  { nombre: PIEZA.calzadaCruce, pack: 'city-builder', fichero: plano('road_junction') },
  { nombre: PIEZA.calzadaTe, pack: 'city-builder', fichero: plano('road_tsplit') },
  { nombre: PIEZA.solera, pack: 'city-builder', fichero: plano('base') },

  /*
   * LOS OCHO BLOQUES, dos veces: con su parcela (`bloque-*`) y sin ella (`cuerpo-*`).
   * El de parcela vale donde el bloque está solo en su celda; el cuerpo, donde varios
   * comparten una manzana y la acera es continua. Alturas medidas SIN parcela, en plantas
   * de 0,75 del pack: A y B dos plantas (1,550), C, D, E, F y G tres (2,250), H cuatro
   * (2,950). Triángulos con parcela: 828, 1.082, 1.020, 1.118, 1.356, 1.389, 1.711, 1.885;
   * sin ella: 435, 586, 666, 848, 950, 1.097, 1.053, 1.333.
   */
  { nombre: PIEZA.bloqueA, pack: 'city-builder', fichero: plano('building_A') },
  { nombre: PIEZA.bloqueB, pack: 'city-builder', fichero: plano('building_B') },
  { nombre: PIEZA.bloqueC, pack: 'city-builder', fichero: plano('building_C') },
  { nombre: PIEZA.bloqueD, pack: 'city-builder', fichero: plano('building_D') },
  { nombre: PIEZA.bloqueE, pack: 'city-builder', fichero: plano('building_E') },
  { nombre: PIEZA.bloqueF, pack: 'city-builder', fichero: plano('building_F') },
  { nombre: PIEZA.bloqueG, pack: 'city-builder', fichero: plano('building_G') },
  { nombre: PIEZA.bloqueH, pack: 'city-builder', fichero: plano('building_H') },
  { nombre: PIEZA.cuerpoA, pack: 'city-builder', fichero: plano('building_A_withoutBase') },
  { nombre: PIEZA.cuerpoB, pack: 'city-builder', fichero: plano('building_B_withoutBase') },
  { nombre: PIEZA.cuerpoC, pack: 'city-builder', fichero: plano('building_C_withoutBase') },
  { nombre: PIEZA.cuerpoD, pack: 'city-builder', fichero: plano('building_D_withoutBase') },
  { nombre: PIEZA.cuerpoE, pack: 'city-builder', fichero: plano('building_E_withoutBase') },
  { nombre: PIEZA.cuerpoF, pack: 'city-builder', fichero: plano('building_F_withoutBase') },
  { nombre: PIEZA.cuerpoG, pack: 'city-builder', fichero: plano('building_G_withoutBase') },
  { nombre: PIEZA.cuerpoH, pack: 'city-builder', fichero: plano('building_H_withoutBase') },

  /*
   * LOS COCHES. Los cinco a la misma caja (0,419 × 0,938 en el pack: 2,51 × 5,63 en el
   * mundo) salvo el utilitario, que es un palmo más corto, y con las ruedas POR DEBAJO del
   * origen (−0,072 en el pack, −0,43 en el mundo): se posan a esa altura sobre el asfalto,
   * que está a 0,42. Caros para lo que son —1.194 a 1.316 triángulos— y por eso el
   * presupuesto los cuenta uno a uno.
   */
  { nombre: PIEZA.cocheBerlina, pack: 'city-builder', fichero: plano('car_sedan') },
  { nombre: PIEZA.cocheUtilitario, pack: 'city-builder', fichero: plano('car_hatchback') },
  { nombre: PIEZA.cocheFamiliar, pack: 'city-builder', fichero: plano('car_stationwagon') },
  { nombre: PIEZA.cocheTaxi, pack: 'city-builder', fichero: plano('car_taxi') },
  { nombre: PIEZA.cochePatrulla, pack: 'city-builder', fichero: plano('car_police') },

  /*
   * EL MOBILIARIO URBANO. Barato y por eso se puede repetir: el banco son 44 triángulos, la
   * papelera 18, el arbusto 72, la boca de riego 180, la farola 176. Los tres semáforos son
   * el de poste corto (508), el de poste alto (636) y el de brazo sobre la calzada (444).
   */
  { nombre: PIEZA.farolaDeCalle, pack: 'city-builder', fichero: plano('streetlight') },
  { nombre: PIEZA.semaforoA, pack: 'city-builder', fichero: plano('trafficlight_A') },
  { nombre: PIEZA.semaforoB, pack: 'city-builder', fichero: plano('trafficlight_B') },
  { nombre: PIEZA.semaforoC, pack: 'city-builder', fichero: plano('trafficlight_C') },
  { nombre: PIEZA.bancoDeCalle, pack: 'city-builder', fichero: plano('bench') },
  { nombre: PIEZA.arbusto, pack: 'city-builder', fichero: plano('bush') },
  { nombre: PIEZA.bocaDeRiego, pack: 'city-builder', fichero: plano('firehydrant') },
  { nombre: PIEZA.contenedor, pack: 'city-builder', fichero: plano('dumpster') },
  { nombre: PIEZA.papelera, pack: 'city-builder', fichero: plano('trash_A') },
  { nombre: PIEZA.cajaDeObraGrande, pack: 'city-builder', fichero: plano('box_A') },
  { nombre: PIEZA.cajaDeObra, pack: 'city-builder', fichero: plano('box_B') },
  { nombre: PIEZA.torreDeAgua, pack: 'city-builder', fichero: plano('watertower') },

  /*
   * LA COCINA Y EL COMEDOR. La planta baja de media ciudad: los restaurantes del barrio de
   * ocio, los bares de las esquinas y la cocina de cada vivienda. `muro` y `losa` son las
   * dos piezas-ANCLA que prueban que el módulo de sala son cuatro unidades: el muro de
   * restaurante mide 4,000 × 4,000 × 0,500 y el suelo de cocina 4,000 × 0,500 × 4,000.
   * (Los tabiques de verdad se hacen con geometría propia; éstas están para medir y para
   * los cerramientos que sí se ven, como la nave del centro comercial.)
   */
  { nombre: PIEZA.muro, pack: 'restaurant-bits', fichero: plano('wall') },
  { nombre: PIEZA.losa, pack: 'restaurant-bits', fichero: plano('floor_kitchen') },
  { nombre: PIEZA.encimera, pack: 'restaurant-bits', fichero: plano('kitchencounter_straight_A') },
  { nombre: PIEZA.encimeraEsquina, pack: 'restaurant-bits', fichero: plano('kitchencounter_innercorner') },
  { nombre: PIEZA.fregadero, pack: 'restaurant-bits', fichero: plano('kitchencounter_sink') },
  { nombre: PIEZA.alacena, pack: 'restaurant-bits', fichero: plano('kitchencabinet') },
  { nombre: PIEZA.fogon, pack: 'restaurant-bits', fichero: plano('stove_multi') },
  { nombre: PIEZA.campana, pack: 'restaurant-bits', fichero: plano('extractorhood') },
  { nombre: PIEZA.horno, pack: 'restaurant-bits', fichero: plano('oven') },
  { nombre: PIEZA.nevera, pack: 'restaurant-bits', fichero: plano('fridge_B') },
  { nombre: PIEZA.escurreplatos, pack: 'restaurant-bits', fichero: plano('dishrack_plates') },
  { nombre: PIEZA.mesaDeCocina, pack: 'restaurant-bits', fichero: plano('kitchentable_A_large') },
  { nombre: PIEZA.mesaRedonda, pack: 'restaurant-bits', fichero: plano('table_round_A') },
  { nombre: PIEZA.mesaPequena, pack: 'restaurant-bits', fichero: plano('table_round_A_small') },
  { nombre: PIEZA.silla, pack: 'restaurant-bits', fichero: plano('chair_A') },
  { nombre: PIEZA.mostrador, pack: 'restaurant-bits', fichero: plano('wall_orderwindow') },
  { nombre: PIEZA.hojaDePuerta, pack: 'restaurant-bits', fichero: plano('door_A') },
  { nombre: PIEZA.columna, pack: 'restaurant-bits', fichero: plano('pillar_B') },
  { nombre: PIEZA.olla, pack: 'restaurant-bits', fichero: plano('pot_A_stew') },
  { nombre: PIEZA.sarten, pack: 'restaurant-bits', fichero: plano('pan_A') },
  { nombre: PIEZA.cuenco, pack: 'restaurant-bits', fichero: plano('bowl') },
  { nombre: PIEZA.plato, pack: 'restaurant-bits', fichero: plano('plate') },
  { nombre: PIEZA.platoServido, pack: 'restaurant-bits', fichero: plano('food_dinner') },
  { nombre: PIEZA.tabla, pack: 'restaurant-bits', fichero: plano('cuttingboard') },
  { nombre: PIEZA.tarro, pack: 'restaurant-bits', fichero: plano('jar_A_medium') },
  { nombre: PIEZA.salsaRoja, pack: 'restaurant-bits', fichero: plano('ketchup') },
  { nombre: PIEZA.salsaAmarilla, pack: 'restaurant-bits', fichero: plano('mustard') },
  { nombre: PIEZA.servilletero, pack: 'restaurant-bits', fichero: plano('papertowel') },
  { nombre: PIEZA.carta, pack: 'restaurant-bits', fichero: plano('menu') },
  { nombre: PIEZA.cajon, pack: 'restaurant-bits', fichero: plano('crate') },
  { nombre: PIEZA.cajaDeJamones, pack: 'restaurant-bits', fichero: plano('crate_ham') },
  { nombre: PIEZA.cajaDeZanahorias, pack: 'restaurant-bits', fichero: plano('crate_carrots') },

  /*
   * EL SALÓN, EL DORMITORIO Y LA OFICINA. Lo que hay de la primera planta para arriba en
   * las viviendas, y lo que llena las plantas de las torres del centro. Todo a escala de
   * persona: el sofá mide 3,000 de largo (2,12 m), la cama doble 3,100 × 3,000, la lámpara
   * de pie 2,520 de alto —una persona justa—, y la alfombra 3,000 × 2,000.
   */
  { nombre: PIEZA.sofa, pack: 'furniture-bits', fichero: plano('couch') },
  { nombre: PIEZA.sofaConCojines, pack: 'furniture-bits', fichero: plano('couch_pillows') },
  { nombre: PIEZA.butaca, pack: 'furniture-bits', fichero: plano('armchair') },
  { nombre: PIEZA.cama, pack: 'furniture-bits', fichero: plano('bed_double_A') },
  { nombre: PIEZA.catre, pack: 'furniture-bits', fichero: plano('bed_single_A') },
  { nombre: PIEZA.armario, pack: 'furniture-bits', fichero: plano('cabinet_medium') },
  { nombre: PIEZA.armarioPequeno, pack: 'furniture-bits', fichero: plano('cabinet_small') },
  { nombre: PIEZA.anaquel, pack: 'furniture-bits', fichero: plano('shelf_B_large') },
  { nombre: PIEZA.anaquelPequeno, pack: 'furniture-bits', fichero: plano('shelf_B_small') },
  { nombre: PIEZA.mesaBaja, pack: 'furniture-bits', fichero: plano('table_low') },
  { nombre: PIEZA.mesaMediana, pack: 'furniture-bits', fichero: plano('table_medium') },
  { nombre: PIEZA.mesaLarga, pack: 'furniture-bits', fichero: plano('table_medium_long') },
  { nombre: PIEZA.mesilla, pack: 'furniture-bits', fichero: plano('table_small') },
  { nombre: PIEZA.sillaDeOficina, pack: 'furniture-bits', fichero: plano('chair_C') },
  { nombre: PIEZA.taburete, pack: 'furniture-bits', fichero: plano('chair_stool_wood') },
  { nombre: PIEZA.lampara, pack: 'furniture-bits', fichero: plano('lamp_standing') },
  { nombre: PIEZA.lamparaDeMesa, pack: 'furniture-bits', fichero: plano('lamp_table') },
  { nombre: PIEZA.alfombra, pack: 'furniture-bits', fichero: plano('rug_rectangle_A') },
  { nombre: PIEZA.alfombraDeRayas, pack: 'furniture-bits', fichero: plano('rug_rectangle_stripes_A') },
  { nombre: PIEZA.alfombraOvalada, pack: 'furniture-bits', fichero: plano('rug_oval_A') },
  { nombre: PIEZA.cuadro, pack: 'furniture-bits', fichero: plano('pictureframe_large_B') },
  { nombre: PIEZA.cuadroPequeno, pack: 'furniture-bits', fichero: plano('pictureframe_small_A') },
  { nombre: PIEZA.retrato, pack: 'furniture-bits', fichero: plano('pictureframe_standing_A') },
  { nombre: PIEZA.libros, pack: 'furniture-bits', fichero: plano('book_set') },
  { nombre: PIEZA.almohada, pack: 'furniture-bits', fichero: plano('pillow_A') },
  { nombre: PIEZA.cojin, pack: 'furniture-bits', fichero: plano('pillow_B') },

  /*
   * EL SÓTANO, EL TRASTERO Y LA TIENDA. Lo que del Dungeon sirve en una ciudad de este
   * siglo: peldañeado (sube un módulo justo: es lo que lo hace apilable), taburete, mesa de
   * trabajo, estanterías, cajas y barriles. `banqueta` está además por una razón que no es
   * decorativa: es la pareja de `taburete` —la misma pieza dibujada en dos packs, 0,750 ×
   * 0,500 × 0,750 en los dos—, y `verify:burgo-modelos` las compara para probar que los
   * cinco packs de persona van a la misma unidad.
   */
  { nombre: PIEZA.escalera, pack: 'dungeon', fichero: plano('stairs_modular_center') },
  { nombre: PIEZA.escaleraIzquierda, pack: 'dungeon', fichero: plano('stairs_modular_left') },
  { nombre: PIEZA.escaleraDerecha, pack: 'dungeon', fichero: plano('stairs_modular_right') },
  { nombre: PIEZA.banqueta, pack: 'dungeon', fichero: plano('stool') },
  { nombre: PIEZA.mesaDeTrabajo, pack: 'dungeon', fichero: plano('table_long') },
  { nombre: PIEZA.estanteDePared, pack: 'dungeon', fichero: plano('shelves') },
  { nombre: PIEZA.repisa, pack: 'dungeon', fichero: plano('shelf_large') },
  { nombre: PIEZA.caja, pack: 'dungeon', fichero: plano('box_large') },
  { nombre: PIEZA.cajaPequena, pack: 'dungeon', fichero: plano('box_small') },
  { nombre: PIEZA.barril, pack: 'dungeon', fichero: plano('barrel_large') },
  { nombre: PIEZA.barrilPequeno, pack: 'dungeon', fichero: plano('barrel_small') },

  /*
   * EL CEMENTERIO. Un distrito entero de Halloween Bits, sin una calabaza ni un hueso: lo
   * que queda es un camposanto de verdad. La verja mide un módulo de largo (4,000 × 2,200)
   * y encaja sola con su poste; el arco de entrada 4,218 × 4,414; la cripta 6 × 8 × 8, que
   * es la pieza más grande de la tabla después del bloque H.
   */
  { nombre: PIEZA.tumba, pack: 'halloween-bits', fichero: plano('grave_A') },
  { nombre: PIEZA.tumbaLlana, pack: 'halloween-bits', fichero: plano('grave_B') },
  { nombre: PIEZA.lapida, pack: 'halloween-bits', fichero: plano('gravestone') },
  { nombre: PIEZA.hito, pack: 'halloween-bits', fichero: plano('gravemarker_A') },
  { nombre: PIEZA.hitoB, pack: 'halloween-bits', fichero: plano('gravemarker_B') },
  { nombre: PIEZA.cripta, pack: 'halloween-bits', fichero: plano('crypt') },
  { nombre: PIEZA.sarcofago, pack: 'halloween-bits', fichero: plano('coffin') },
  { nombre: PIEZA.verja, pack: 'halloween-bits', fichero: plano('fence') },
  { nombre: PIEZA.verjaPuerta, pack: 'halloween-bits', fichero: plano('fence_gate') },
  { nombre: PIEZA.verjaPoste, pack: 'halloween-bits', fichero: plano('fence_pillar') },
  { nombre: PIEZA.arcoDeVerja, pack: 'halloween-bits', fichero: plano('arch_gate') },
  { nombre: PIEZA.losaConmemorativa, pack: 'halloween-bits', fichero: plano('plaque') },
  { nombre: PIEZA.tierra, pack: 'halloween-bits', fichero: plano('floor_dirt') },

  /*
   * EL PARQUE. Los árboles de la ciudad son los pinos de Halloween Bits y no los del
   * hexagonal, y no por capricho: los del hexagonal van a `ESCALA_DEL_PACK` y son parte del
   * paisaje de fuera; éstos están dibujados a escala de persona (el grande mide 7,475, tres
   * personas) y se plantan al lado de un banco sin que nada cante. Los secos, sólo en el
   * cementerio.
   */
  { nombre: PIEZA.sendero, pack: 'halloween-bits', fichero: plano('path_A') },
  { nombre: PIEZA.farolaDeParque, pack: 'halloween-bits', fichero: plano('post_lantern') },
  { nombre: PIEZA.farolDePie, pack: 'halloween-bits', fichero: plano('lantern_standing') },
  { nombre: PIEZA.bancoDeParque, pack: 'halloween-bits', fichero: plano('bench') },
  { nombre: PIEZA.pino, pack: 'halloween-bits', fichero: plano('tree_pine_yellow_medium') },
  { nombre: PIEZA.pinoGrande, pack: 'halloween-bits', fichero: plano('tree_pine_yellow_large') },
  { nombre: PIEZA.pinoPequeno, pack: 'halloween-bits', fichero: plano('tree_pine_yellow_small') },
  { nombre: PIEZA.pinoRojo, pack: 'halloween-bits', fichero: plano('tree_pine_orange_medium') },
  { nombre: PIEZA.arbolSeco, pack: 'halloween-bits', fichero: plano('tree_dead_large') },
  { nombre: PIEZA.arbolSecoMediano, pack: 'halloween-bits', fichero: plano('tree_dead_medium') },

  /*
   * EL POLÍGONO. Resource Bits no tiene siglo: un palet es un palet, un bidón es un bidón y
   * un montón de perfiles de hierro es de una nave, no de una herrería. Entra el bidón
   * suelto (868) y no el grupo de tres (4.400), y el montón pequeño de lingotes (648) y no
   * el grande (5.184): el polígono se llena repitiendo piezas baratas.
   */
  { nombre: PIEZA.palet, pack: 'resource-bits', fichero: plano('Pallet_Wood') },
  { nombre: PIEZA.paletCubierto, pack: 'resource-bits', fichero: plano('Pallet_Wood_Covered_A') },
  { nombre: PIEZA.tablones, pack: 'resource-bits', fichero: plano('Wood_Planks_Stack_Medium') },
  { nombre: PIEZA.sillares, pack: 'resource-bits', fichero: plano('Stone_Bricks_Stack_Medium') },
  { nombre: PIEZA.bidon, pack: 'resource-bits', fichero: plano('Fuel_A_Barrel') },
  { nombre: PIEZA.garrafa, pack: 'resource-bits', fichero: plano('Fuel_A_Jerrycan') },
  { nombre: PIEZA.chatarra, pack: 'resource-bits', fichero: plano('Parts_Pile_Small') },
  { nombre: PIEZA.perfiles, pack: 'resource-bits', fichero: plano('Iron_Bars_Stack_Small') },
  { nombre: PIEZA.fardo, pack: 'resource-bits', fichero: plano('Textiles_A') },
  { nombre: PIEZA.lingotes, pack: 'resource-bits', fichero: plano('Gold_Bars_Stack_Small') },

  /* El dinero: las monedas son fichas de mesa y van a la escala de las fichas. */
  { nombre: PIEZA.moneda, pack: 'board-game-bits', fichero: plano('coin_gold') },
  { nombre: PIEZA.moneda5, pack: 'board-game-bits', fichero: plano('coin_5_gold') },
  { nombre: PIEZA.moneda10, pack: 'board-game-bits', fichero: plano('coin_10_gold') },

  /*
   * EL CAMPO DE FUERA DEL ANILLO. Lo único que queda del hexagonal, y por eso `tesela`
   * sigue siendo la pieza-ancla de `ESCALA_DEL_PACK`: mide 10,94 de ancho ya escalada, lo
   * mismo que en `tablero.glb`, y si algún día alguien se olvidara de escalar este pack se
   * vería en ella antes que en ningún otro sitio.
   */
  { nombre: PIEZA.tesela, pack: 'hexagon-extra', fichero: suelo('hex_grass') },
  { nombre: PIEZA.fondo, pack: 'hexagon-extra', fichero: suelo('hex_grass_bottom') },
  { nombre: PIEZA.arbolA, pack: 'hexagon-extra', fichero: natura('tree_single_A') },
  { nombre: PIEZA.arbolB, pack: 'hexagon-extra', fichero: natura('tree_single_B') },
  { nombre: PIEZA.arboledaPequena, pack: 'hexagon-extra', fichero: natura('trees_A_small') },
  { nombre: PIEZA.arboledaMediana, pack: 'hexagon-extra', fichero: natura('trees_A_medium') },
  { nombre: PIEZA.arboledaGrande, pack: 'hexagon-extra', fichero: natura('trees_A_large') },
  { nombre: PIEZA.rocaA, pack: 'hexagon-extra', fichero: natura('rock_single_A') },
  { nombre: PIEZA.rocaB, pack: 'hexagon-extra', fichero: natura('rock_single_B') },
  { nombre: PIEZA.nubeGrande, pack: 'hexagon-extra', fichero: natura('cloud_big') },
  { nombre: PIEZA.nubePequena, pack: 'hexagon-extra', fichero: natura('cloud_small') },
  { nombre: PIEZA.colinasA, pack: 'hexagon-extra', fichero: natura('hills_A') },
];

/** Todos los nombres, para que el comprobador exija que el `.glb` tenga exactamente éstos. */
export function nombresDelBurgo(): string[] {
  return PIEZAS_DEL_BURGO.map((p) => p.nombre);
}

/**
 * Se comprueba al cargar el módulo: un nombre que `GLTFLoader` fuera a cambiar es una pieza
 * que no aparece nunca, sin error; una escala que no sea un número positivo es una pieza
 * invisible o del revés. Mejor reventar aquí, en Node.
 */
for (const p of PIEZAS_DEL_BURGO) {
  if (!NOMBRE_QUE_SOBREVIVE.test(p.nombre)) {
    throw new Error(`La pieza «${p.nombre}» lleva un carácter que GLTFLoader borra al cargar.`);
  }
  const k = escalaDe(p);
  if (!Number.isFinite(k) || k <= 0) {
    throw new Error(`La pieza «${p.nombre}» sale a escala ${String(k)}, que no es un factor.`);
  }
}
const repetidos = nombresDelBurgo().filter((n, i, todos) => todos.indexOf(n) !== i);
if (repetidos.length > 0) {
  throw new Error(`Piezas del Burgo repetidas: ${repetidos.join(', ')}`);
}
const enterasSinTinte = PIEZAS_TENIDAS_ENTERAS.filter((n) => !PIEZAS_QUE_SE_TINEN.includes(n));
if (enterasSinTinte.length > 0) {
  throw new Error(`Declaradas teñidas enteras sin ser teñibles: ${enterasSinTinte.join(', ')}`);
}
const enEsperaYDentro = PIEZAS_EN_ESPERA.filter((n) => (nombresDelBurgo() as string[]).includes(n));
if (enEsperaYDentro.length > 0) {
  throw new Error(`Piezas que están en la tabla y también en espera: ${enEsperaYDentro.join(', ')}. Bórralas de PIEZAS_EN_ESPERA.`);
}
/* Un nombre de PIEZA que nadie puso en la tabla es una constante muerta esperando a que alguien la use. */
const declaradosSinFichero = (Object.values(PIEZA) as string[]).filter((n) => !(nombresDelBurgo() as string[]).includes(n));
if (declaradosSinFichero.length > 0) {
  throw new Error(`Nombres en PIEZA que no tienen fila en PIEZAS_DEL_BURGO: ${declaradosSinFichero.join(', ')}`);
}
