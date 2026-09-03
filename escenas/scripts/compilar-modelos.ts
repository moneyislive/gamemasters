/**
 * COMPILA LOS MODELOS DEL TABLERO EN UN SOLO FICHERO.
 *
 * ═══ QUÉ HACE Y POR QUÉ NO SE CARGAN LOS `.gltf` TAL CUAL ═══
 *
 * El pack de KayKit trae 221 modelos en `.gltf`, y un `.gltf` no es un fichero:
 * son TRES —el JSON, un `.bin` con la geometría y la textura aparte—. Cargar
 * cuarenta modelos así son ciento veinte peticiones antes de que se vea un
 * hexágono, y en un móvil con la red de una casa eso es la diferencia entre
 * «entra al tablero» y «se queda cargando».
 *
 * Aquí se juntan los que el juego usa en UN `.glb`: un fichero, una petición, una
 * textura. Cada modelo queda dentro como un nodo con su nombre, y la escena lo
 * busca por ese nombre y lo instancia tantas veces como haga falta.
 *
 * ═══ Y POR QUÉ SE ELIGEN A MANO Y NO SE METEN LOS 221 ═══
 *
 * Porque de los 221 el juego usa unos treinta, y los otros ciento noventa serían
 * megabytes que viajan al móvil de alguien para no dibujarse nunca. La lista de
 * abajo es la decisión de producto, escrita donde se puede leer y cambiar.
 *
 * ═══ ESTO NO CORRE EN EL DESPLIEGUE: CORRE UNA VEZ Y SE COMMITEA EL RESULTADO ═══
 *
 * `@gltf-transform` es herramienta de compilación y no entra en el paquete que se
 * manda al navegador. El material bruto está en `.gitignore` —son 125 MB de FBX,
 * OBJ y GLTF que se pueden volver a bajar, porque son CC0— y lo que se versiona es
 * el `.glb` compilado. Ver `arte/README.md`.
 */
import { NodeIO } from '@gltf-transform/core';
import { dedup, mergeDocuments, prune, weld } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';
import { NOMBRE_QUE_SOBREVIVE, nombresEnElGlb } from '../nombres';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
/*
 * EL PACK DE PAGO, y por qué se usa ése y no el gratuito.
 *
 * El EXTRA es un SUPERCONJUNTO exacto del FREE: 404 modelos contra 221, con la
 * MISMA textura, la MISMA retícula de atlas y las MISMAS medidas de tesela —
 * comprobado midiendo `hex_grass` en los dos, que da 2 × 2,309 × 1 y todas sus UV
 * dentro de la celda (0,2). O sea que cambiar de uno a otro no reescala nada ni
 * desplaza nada: sólo aparecen piezas que antes no estaban.
 *
 * Lo que trae de más y aquí importa:
 *
 *   · BARCOS y MUELLES (`ship`, `building_docks`), que son los puertos del catán y
 *     la costa. Sin esto no hay puertos.
 *   · `hex_transition`, una tesela con DOS primitivas: media de un bioma y media
 *     de otro. Es la prueba de que el propio KayKit distingue biomas moviendo las
 *     UV por el atlas, que es exactamente lo que hace `paleta.ts`.
 *   · Cuatro atlas de estación —primavera, verano, otoño, invierno— del mismo
 *     tamaño y la misma retícula, así que el mundo entero cambia de estación
 *     cambiando UNA textura.
 *   · Ayuntamiento, taller, establos, ermita y atalayas, que dan pueblos bastante
 *     menos repetidos.
 *
 * La licencia es CC0, igual que la del gratuito: uso comercial sin atribución
 * obligatoria. `License.txt` del pack lo dice literalmente.
 */
const PACK = path.join(
  RAIZ,
  'arte/kaykit/hexagon-extra/KayKit_Medieval_Hexagon_Pack_1.0_EXTRA/Assets/gltf',
);
const BITS = path.join(RAIZ, 'arte/kaykit/resource-bits/KayKit_ResourceBits_1.0_FREE/Assets');
const SALIDA = path.join(RAIZ, 'escenas/modelos');

/**
 * LOS MODELOS QUE ENTRAN, y con qué nombre los busca la escena.
 *
 * El nombre de la izquierda es el que usa el código y NO el del fichero: los del
 * pack son descriptivos de su mundo —`building_home_A_blue`— y los de aquí lo son
 * del nuestro —`poblado:azul`—. Esa traducción vive en un solo sitio a propósito;
 * si la escena buscara por el nombre del pack, cambiar de pack sería tocar la
 * escena entera.
 */
const COLORES = ['blue', 'red', 'green', 'yellow'] as const;

const natura = (f: string): string => path.join(PACK, `decoration/nature/${f}.gltf`);
const trasto = (f: string): string => path.join(PACK, `decoration/props/${f}.gltf`);
const neutro = (f: string): string => path.join(PACK, `buildings/neutral/${f}.gltf`);
const suelo = (f: string): string => path.join(PACK, `tiles/base/${f}.gltf`);
const orilla = (f: string): string => path.join(PACK, `tiles/coast/${f}.gltf`);
const senda = (f: string): string => path.join(PACK, `tiles/roads/${f}.gltf`);
const cauce = (f: string): string => path.join(PACK, `tiles/rivers/${f}.gltf`);
const dePueblo = (color: string, f: string): string =>
  path.join(PACK, `buildings/${color}/building_${f}_${color}.gltf`);

const PIEZAS: Array<{ nombre: string; fichero: string }> = [
  /*
   * LA TESELA DEL SUELO, que es la misma para todos los terrenos.
   *
   * El pack sólo trae hierba y agua: NO hay tesela de arena, ni de piedra, ni de
   * campo. Así que el terreno no se distingue por la tesela sino por dos cosas: el
   * color con el que se pinta —la tesela son 36 triángulos sin detalle, así que
   * admite tinte plano sin perder nada— y sobre todo lo que se le pone encima. Un
   * bosque es una comarca con árboles, no una comarca de color verde oscuro.
   */
  { nombre: 'tesela', fichero: suelo('hex_grass') },
  { nombre: 'tesela-agua', fichero: suelo('hex_water') },
  { nombre: 'tesela-fondo', fichero: suelo('hex_grass_bottom') },
  { nombre: 'tesela-transicion', fichero: suelo('hex_transition') },

  /*
   * LAS RAMPAS, que son lo que hace que una terraza se pueda subir.
   *
   * El relieve va en escalones de 5,47 —dos personas y pico— y eso a pie es un
   * muro. `sloped_low` y `sloped_high` son las dos mitades de una cuesta entre dos
   * niveles: sin ellas el mundo se ve bien desde el aire y es intransitable abajo,
   * que es justo el fallo que no se nota hasta que llega el avatar.
   */
  { nombre: 'rampa-baja', fichero: suelo('hex_grass_sloped_low') },
  { nombre: 'rampa-alta', fichero: suelo('hex_grass_sloped_high') },

  /* La orilla: media tesela de tierra y media de agua, para cerrar el mundo. */
  { nombre: 'orilla-a', fichero: orilla('hex_coast_A') },
  { nombre: 'orilla-b', fichero: orilla('hex_coast_B') },
  { nombre: 'orilla-c', fichero: orilla('hex_coast_C') },
  { nombre: 'orilla-d', fichero: orilla('hex_coast_D') },
  { nombre: 'orilla-e', fichero: orilla('hex_coast_E') },

  /*
   * LOS CAMINOS, trece variantes de tesela.
   *
   * Un camino del PAISAJE no se dibuja con una caja estirada: se pone la tesela
   * cuyo trazado entra y sale por los lados que toca. Trece variantes cubren
   * recta, curva, cruce, bifurcación y final. Ojo, esto no son los caminos que
   * construyen los jugadores —ésos van sobre aristas de comarca y son de su
   * color—; esto es la red de caminos del mundo.
   */
  { nombre: 'senda-a', fichero: senda('hex_road_A') },
  { nombre: 'senda-b', fichero: senda('hex_road_B') },
  { nombre: 'senda-c', fichero: senda('hex_road_C') },
  { nombre: 'senda-d', fichero: senda('hex_road_D') },
  { nombre: 'senda-e', fichero: senda('hex_road_E') },
  { nombre: 'senda-f', fichero: senda('hex_road_F') },
  { nombre: 'senda-g', fichero: senda('hex_road_G') },
  { nombre: 'senda-h', fichero: senda('hex_road_H') },
  { nombre: 'senda-i', fichero: senda('hex_road_I') },
  { nombre: 'senda-j', fichero: senda('hex_road_J') },
  { nombre: 'senda-k', fichero: senda('hex_road_K') },
  { nombre: 'senda-l', fichero: senda('hex_road_L') },
  { nombre: 'senda-m', fichero: senda('hex_road_M') },

  /*
   * LOS CAUCES, doce variantes con LAS MISMAS LETRAS que los caminos.
   *
   * Medido: `hex_river_A` conecta los mismos lados que `hex_road_A`, y así las doce.
   * O sea que una sola tabla «conjunto de lados → fichero y giro» sirve para las dos
   * familias, y `sendas.ts` la comparte. Lo que NO comparten es la M: un camino puede
   * morir en un callejón sin salida y un río no, porque un río que se acaba dentro del
   * mapa no existe en la naturaleza ni en el pack.
   *
   * El cauce mide 0,9238 de ancho sobre una tesela de 2,0: es una vía fluvial, no un
   * arroyo. Y no hay variante en cuesta, así que un río NO puede cruzar el borde de
   * una terraza — de ahí que el generador tenga que excavar su valle a nivel cero.
   */
  { nombre: 'rio-a', fichero: cauce('hex_river_A') },
  { nombre: 'rio-b', fichero: cauce('hex_river_B') },
  { nombre: 'rio-c', fichero: cauce('hex_river_C') },
  { nombre: 'rio-d', fichero: cauce('hex_river_D') },
  { nombre: 'rio-e', fichero: cauce('hex_river_E') },
  { nombre: 'rio-f', fichero: cauce('hex_river_F') },
  { nombre: 'rio-g', fichero: cauce('hex_river_G') },
  { nombre: 'rio-h', fichero: cauce('hex_river_H') },
  { nombre: 'rio-i', fichero: cauce('hex_river_I') },
  { nombre: 'rio-j', fichero: cauce('hex_river_J') },
  { nombre: 'rio-k', fichero: cauce('hex_river_K') },
  { nombre: 'rio-l', fichero: cauce('hex_river_L') },
  { nombre: 'rio-curvo', fichero: cauce('hex_river_A_curvy') },

  /* Los dos únicos puentes que hay: río recto por el eje 0-3 y camino a sesenta grados. */
  { nombre: 'rio-puente-a', fichero: cauce('hex_river_crossing_A') },
  { nombre: 'rio-puente-b', fichero: cauce('hex_river_crossing_B') },

  /*
   * ÁRBOLES SUELTOS Y ARBOLEDAS, que no son lo mismo y hacen falta los dos.
   *
   * `arbol:*` es UN árbol; `arboleda:*` es un grupo que ocupa la tesela entera. Con
   * sólo arboledas, un bosque se ve como una rejilla de matas idénticas; con sólo
   * árboles sueltos hacen falta cientos para que parezca un bosque y se paga en
   * triángulos. Mezclando, un bosque sale denso y desordenado por poco dinero.
   */
  { nombre: 'arbol-a', fichero: natura('tree_single_A') },
  { nombre: 'arbol-b', fichero: natura('tree_single_B') },
  { nombre: 'tocon', fichero: natura('tree_single_A_cut') },
  { nombre: 'arboleda-grande', fichero: natura('trees_A_large') },
  { nombre: 'arboleda-media', fichero: natura('trees_A_medium') },
  { nombre: 'arboleda-pequena', fichero: natura('trees_A_small') },
  { nombre: 'arboleda-b', fichero: natura('trees_B_medium') },

  /* El relieve. Las `colina:*` son montículos sueltos; las `colinas:*`, tesela llena. */
  { nombre: 'colina-a', fichero: natura('hill_single_A') },
  { nombre: 'colina-b', fichero: natura('hill_single_B') },
  { nombre: 'colina-c', fichero: natura('hill_single_C') },
  { nombre: 'colinas-a', fichero: natura('hills_A') },
  { nombre: 'colinas-b', fichero: natura('hills_B') },
  { nombre: 'colinas-arboladas', fichero: natura('hills_A_trees') },
  { nombre: 'montana-a', fichero: natura('mountain_A') },
  { nombre: 'montana-b', fichero: natura('mountain_B') },
  { nombre: 'montana-c', fichero: natura('mountain_C') },
  { nombre: 'montana-verde', fichero: natura('mountain_A_grass') },
  { nombre: 'montana-arbolada', fichero: natura('mountain_B_grass_trees') },
  { nombre: 'roca-a', fichero: natura('rock_single_A') },
  { nombre: 'roca-b', fichero: natura('rock_single_B') },
  { nombre: 'roca-c', fichero: natura('rock_single_C') },
  { nombre: 'roca-d', fichero: natura('rock_single_D') },
  { nombre: 'roca-e', fichero: natura('rock_single_E') },

  /*
   * EL GRANO Y EL BARBECHO, que resuelven el terreno que faltaba.
   *
   * `building_grain` es una tesela sembrada: es el trigo que el pack de Resource
   * Bits no tiene, y viene sin color de jugador porque un campo no es de nadie.
   */
  { nombre: 'trigal', fichero: neutro('building_grain') },
  { nombre: 'barbecho', fichero: neutro('building_dirt') },
  { nombre: 'ruina', fichero: neutro('building_destroyed') },
  /*
   * EL VALLADO Y EL MURO, que encajan con la malla sin tocar nada. Medido:
   *
   *   · `fence_wood_straight` mide 1,155 de largo y se apoya en x = -1. Eso es
   *     EXACTAMENTE el lado del hexágono (1,1547) apoyado en la apotema (1,0): seis
   *     vallas cierran una tesela sin hueco ni solape.
   *   · `wall_straight` mide 2,0 de largo, que es EXACTAMENTE lo que hay entre los
   *     centros de dos teselas vecinas. Encadenados de centro a centro cierran un
   *     anillo hexagonal sin cortar ninguna pieza.
   *
   * Que las dos medidas caigan clavadas no es casualidad: el pack está hecho para
   * esta malla. Es lo que permite levantar un recinto amurallado con piezas enteras.
   */
  { nombre: 'valla', fichero: neutro('fence_wood_straight') },
  { nombre: 'valla-puerta', fichero: neutro('fence_wood_straight_gate') },
  { nombre: 'muro', fichero: neutro('wall_straight') },
  { nombre: 'muro-puerta', fichero: neutro('wall_straight_gate') },
  { nombre: 'muro-esquina', fichero: neutro('wall_corner_A_outside') },
  { nombre: 'muro-esquina-dentro', fichero: neutro('wall_corner_A_inside') },
  { nombre: 'muro-esquina-puerta', fichero: neutro('wall_corner_A_gate') },
  { nombre: 'puente', fichero: neutro('building_bridge_A') },

  /* El desierto y el ladrón. */
  { nombre: 'tienda', fichero: trasto('tent') },

  /* Trastos de campo, que es lo que hace que una tesela no parezca vacía. */
  { nombre: 'saco', fichero: trasto('sack') },
  { nombre: 'carro', fichero: trasto('wheelbarrow') },
  { nombre: 'barril', fichero: trasto('barrel') },
  { nombre: 'caja', fichero: trasto('crate_A_small') },
  { nombre: 'lena', fichero: trasto('resource_lumber') },
  { nombre: 'piedra', fichero: trasto('resource_stone') },
  { nombre: 'almiar', fichero: trasto('haybale') },
  { nombre: 'abrevadero', fichero: trasto('trough') },
  { nombre: 'bote', fichero: trasto('boat') },
  { nombre: 'ancla', fichero: trasto('anchor') },
  { nombre: 'varadero', fichero: trasto('boatrack') },
  /* Lo que crece dentro del agua quieta: nenúfares y juncos. */
  { nombre: 'nenufar-a', fichero: natura('waterlily_A') },
  { nombre: 'nenufar-b', fichero: natura('waterlily_B') },
  { nombre: 'junco-a', fichero: natura('waterplant_A') },
  { nombre: 'junco-b', fichero: natura('waterplant_B') },
  { nombre: 'junco-c', fichero: natura('waterplant_C') },
  { nombre: 'nube-grande', fichero: natura('cloud_big') },
  { nombre: 'nube-pequena', fichero: natura('cloud_small') },

  /*
   * LOS EDIFICIOS DEL PAISAJE, cada tipo en UN color y no en los cuatro.
   *
   * ═══ LA DECISIÓN QUE HAY DETRÁS, QUE NO ES DE TAMAÑO SINO DE LECTURA ═══
   *
   * Los pueblos que llenan las comarcas no son de nadie: están ahí para que la
   * comarca parezca un sitio habitado. Si cada casa de adorno viniera en los cuatro
   * colores, un molino rojo junto al poblado azul de alguien se leería como «esto
   * es del rojo», que es justo lo que no puede pasar en un juego donde el color ES
   * la propiedad.
   *
   * Se resuelve por TIPO: las piezas de jugador son casa y castillo, y ningún
   * edificio de adorno es una casa ni un castillo. Un molino verde es un molino,
   * no una pieza del verde. Y de paso el pack pesa cuatro veces menos.
   */
  { nombre: 'casa', fichero: path.join(PACK, 'buildings/red/building_home_B_red.gltf') },
  { nombre: 'iglesia', fichero: path.join(PACK, 'buildings/blue/building_church_blue.gltf') },
  { nombre: 'taberna', fichero: path.join(PACK, 'buildings/yellow/building_tavern_yellow.gltf') },
  { nombre: 'mercado', fichero: path.join(PACK, 'buildings/green/building_market_green.gltf') },
  { nombre: 'molino', fichero: path.join(PACK, 'buildings/red/building_windmill_red.gltf') },
  { nombre: 'acena', fichero: path.join(PACK, 'buildings/blue/building_watermill_blue.gltf') },
  { nombre: 'aserradero', fichero: path.join(PACK, 'buildings/green/building_lumbermill_green.gltf') },
  { nombre: 'herreria', fichero: path.join(PACK, 'buildings/yellow/building_blacksmith_yellow.gltf') },
  { nombre: 'mina', fichero: path.join(PACK, 'buildings/blue/building_mine_blue.gltf') },
  { nombre: 'pozo', fichero: path.join(PACK, 'buildings/green/building_well_green.gltf') },
  { nombre: 'atalaya', fichero: path.join(PACK, 'buildings/red/building_tower_B_red.gltf') },
  { nombre: 'concejo', fichero: dePueblo('blue', 'townhall') },
  { nombre: 'taller', fichero: dePueblo('yellow', 'workshop') },
  { nombre: 'cuadras', fichero: dePueblo('green', 'stables') },
  { nombre: 'ermita', fichero: dePueblo('red', 'shrine') },
  { nombre: 'vigia', fichero: dePueblo('blue', 'watchtower') },

  /* Los cinco bienes, para la mano y los paneles. De Resource Bits. */
  { nombre: 'bien-madera', fichero: path.join(BITS, 'gltf/Wood_Log_Stack.gltf') },
  { nombre: 'bien-ladrillo', fichero: path.join(BITS, 'gltf/Stone_Bricks_Stack_Small.gltf') },
  { nombre: 'bien-mineral', fichero: path.join(BITS, 'gltf/Iron_Nuggets.gltf') },
  { nombre: 'bien-lana', fichero: path.join(BITS, 'gltf/Textiles_Stack_Small.gltf') },
  { nombre: 'bien-grano', fichero: path.join(BITS, 'gltf/Pallet_Wood_Covered_A.gltf') },
];

/**
 * LAS PIEZAS DEL JUGADOR, UNA SOLA VEZ Y NO CUATRO.
 *
 * El pack trae cada una en cuatro ficheros de color, y aquí entra sólo la AZUL. Las
 * otras tres se fabrican al cargar moviendo las UV de una celda del atlas.
 *
 * No es una suposición: se compararon byte a byte las posiciones de los vértices de las
 * cuatro variantes de las siete piezas, y las veintiocho son la misma geometría exacta.
 * Lo único que cambia son las UV de los vértices que caen en la celda (0,3) del atlas,
 * que es la fila donde el pack pone los cuatro colores de jugador en cuatro columnas
 * seguidas. La cuenta y el porqué están en `paleta.ts`, en `CELDA_DEL_JUGADOR`.
 *
 * Lo que se ahorra, medido comparando el fichero antes y después: 4.606 kB → 4.209 kB
 * y 21 nodos menos. Son 397 kB, un 8,6 %, y no el tercio que prometía la primera
 * cuenta — `dedup` ya compartía las posiciones entre las cuatro variantes, así que lo
 * único que estaba de verdad por cuadruplicado eran las UV. Sigue valiendo la pena
 * porque un `.glb` es binario y no se guarda por diferencias: cada recompilación mete
 * una copia entera en la historia del repositorio.
 *
 * El azul es el origen porque es la columna cero, medido: todos los desplazamientos
 * salen hacia la derecha y ninguno negativo.
 */
const COLOR_ORIGEN = 'blue';
PIEZAS.push(
  { nombre: 'poblado', fichero: path.join(PACK, `buildings/${COLOR_ORIGEN}/building_home_A_${COLOR_ORIGEN}.gltf`) },
  { nombre: 'ciudad', fichero: path.join(PACK, `buildings/${COLOR_ORIGEN}/building_castle_${COLOR_ORIGEN}.gltf`) },
  { nombre: 'torre', fichero: path.join(PACK, `buildings/${COLOR_ORIGEN}/building_tower_A_${COLOR_ORIGEN}.gltf`) },
  { nombre: 'bandera', fichero: trasto(`flag_${COLOR_ORIGEN}`) },
  /* El zócalo de la torre: 1,5 de alto con la base a cero, para apilar torre encima. */
  { nombre: 'torreon', fichero: dePueblo(COLOR_ORIGEN, 'tower_base') },
  /*
   * EL PUERTO Y EL BARCO, que en el catán son una regla y no un adorno.
   *
   * El muelle mide 2 × 0,5 y su geometría baja hasta -1: es una pieza de BORDE, hecha
   * para pegarse a un lado de una tesela y no para ponerse encima. Por eso va con el
   * ángulo del lado que le toca, y no centrada.
   *
   * Y se llama `barco-jugador` y no `barco` porque el barco de nadie ya ocupa ese
   * nombre, y NO son el mismo modelo: 2.031 vértices el neutral y 2.028 el de color,
   * medido. Con el nombre corto, la última pieza escrita se habría comido a la otra sin
   * que nada protestara.
   */
  { nombre: 'muelle', fichero: dePueblo(COLOR_ORIGEN, 'docks') },
  { nombre: 'barco-jugador', fichero: path.join(PACK, `units/${COLOR_ORIGEN}/ship_${COLOR_ORIGEN}_full.gltf`) },
);

/* Y las piezas de nadie que hacen falta en el mar y en los caminos. */
PIEZAS.push(
  { nombre: 'barco', fichero: path.join(PACK, 'units/neutral/ship.gltf') },
  { nombre: 'carreta', fichero: path.join(PACK, 'units/neutral/cart_merchant.gltf') },
);

/**
 * EL COMPILADOR SE NIEGA A ESCRIBIR UN NOMBRE QUE EL CARGADOR VAYA A CAMBIAR.
 *
 * Es la única frontera donde se puede comprobar antes de que el fallo se vuelva
 * invisible: `GLTFLoader` borra los dos puntos de los nombres de nodo, así que una
 * pieza mal nombrada existe en el fichero, se lee bien desde Node y no aparece
 * NUNCA en pantalla, sin un solo error. La historia completa está en `nombres.ts`,
 * de donde sale esta regla — una sola definición, no dos que puedan discrepar.
 */
function revisaLosNombres(): void {
  const malos = PIEZAS.filter((p) => !NOMBRE_QUE_SOBREVIVE.test(p.nombre));
  const repetidos = PIEZAS.map((p) => p.nombre).filter(
    (n, i, todos) => todos.indexOf(n) !== i,
  );
  /*
   * Y LA OTRA MITAD: que lo que se compila sea EXACTAMENTE lo que el código espera
   * encontrar dentro. Antes esto sólo se comprobaba después, al arrancar la escena, y
   * en el peor sentido: `verify:escena` sabía decir «falta una pieza» pero no «sobra».
   * Una pieza compilada que nadie pide son cientos de kilobytes que se despliegan a
   * todo el mundo sin que nadie sepa por qué están.
   */
  const compiladas = new Set(PIEZAS.map((p) => p.nombre));
  const esperadas = new Set(nombresEnElGlb());
  const faltan = [...esperadas].filter((n) => !compiladas.has(n));
  const sobran = [...compiladas].filter((n) => !esperadas.has(n));

  if (malos.length === 0 && repetidos.length === 0 && faltan.length === 0 && sobran.length === 0) {
    return;
  }
  if (faltan.length > 0) {
    console.error(`El código pide estas piezas y aquí no se compilan: ${faltan.join(', ')}`);
  }
  if (sobran.length > 0) {
    console.error(`Y estas se compilan y no las pide nadie: ${sobran.join(', ')}`);
  }

  if (malos.length > 0) {
    console.error(
      'Estos nombres no sobreviven a GLTFLoader (sólo minúsculas, cifras, `-` y `_`):\n' +
        malos.map((p) => `  ${p.nombre}`).join('\n'),
    );
  }
  if (repetidos.length > 0) {
    console.error(`Y estos están dos veces: ${repetidos.join(', ')}`);
  }
  process.exit(2);
}

async function main(): Promise<void> {
  revisaLosNombres();

  if (!fs.existsSync(PACK)) {
    console.error(
      `No está el material bruto en ${PACK}.\n\n` +
        'Es CC0 y no se versiona a propósito: son 125 MB. `arte/README.md` dice cómo bajarlo.',
    );
    process.exit(2);
  }

  const io = new NodeIO();
  const destino = await io.read(PIEZAS[0]?.fichero as string);
  /* Se vacía la escena del primero: se van a añadir todos, incluido él. */
  for (const nodo of destino.getRoot().listNodes()) nodo.dispose();
  for (const escena of destino.getRoot().listScenes()) escena.dispose();
  const escena = destino.createScene('tablero');
  destino.getRoot().setDefaultScene(escena);

  let metidos = 0;
  const faltan: string[] = [];

  for (const pieza of PIEZAS) {
    if (!fs.existsSync(pieza.fichero)) {
      faltan.push(`${pieza.nombre} → ${path.relative(RAIZ, pieza.fichero)}`);
      continue;
    }
    const suyo = await io.read(pieza.fichero);
    /*
     * `merge` trae TODO el documento: mallas, materiales, texturas y nodos. Los
     * duplicados —la textura compartida, sobre todo— los quita `dedup` al final,
     * que es lo que hace que cuarenta modelos acaben con UNA textura y no cuarenta
     * copias de la misma.
     */
    mergeDocuments(destino, suyo);

    /*
     * El documento traído deja SUS escenas dentro. Se cogen sus nodos raíz, se les
     * pone el nombre nuestro y se cuelgan de la escena única; sus escenas sobran.
     */
    const escenasTraidas = destino
      .getRoot()
      .listScenes()
      .filter((e) => e !== escena);
    const raices = escenasTraidas.flatMap((e) => e.listChildren());
    if (raices.length === 0) {
      faltan.push(`${pieza.nombre} (venía sin nodos)`);
      for (const e of escenasTraidas) e.dispose();
      continue;
    }
    const envoltorio = destino.createNode(pieza.nombre);
    for (const r of raices) envoltorio.addChild(r);
    escena.addChild(envoltorio);
    for (const e of escenasTraidas) e.dispose();
    metidos++;
  }

  /*
   * `weld` junta vértices repetidos, `dedup` quita mallas, materiales y texturas
   * duplicados —aquí es donde las cuarenta copias del mismo atlas se vuelven una—
   * y `prune` tira lo que ya no cuelga de nada.
   */
  await destino.transform(weld(), dedup(), prune());

  /*
   * UN SOLO BUFER, que es lo que un `.glb` admite.
   *
   * Cada documento traido llega con el suyo, asi que tras juntar cuarenta hay
   * cuarenta bufers y el escritor se niega con «GLB must have 0-1 buffers». Se
   * reasignan todos los accesores a uno nuevo y los demas se tiran: el contenido
   * no se toca, solo donde vive.
   */
  const unico = destino.createBuffer('tablero');
  for (const accesor of destino.getRoot().listAccessors()) accesor.setBuffer(unico);
  for (const bufer of destino.getRoot().listBuffers()) {
    if (bufer !== unico) bufer.dispose();
  }

  fs.mkdirSync(SALIDA, { recursive: true });
  const destinoGlb = path.join(SALIDA, 'tablero.glb');
  await io.write(destinoGlb, destino);

  const bytes = fs.statSync(destinoGlb).size;
  const texturas = destino.getRoot().listTextures().length;
  const materiales = destino.getRoot().listMaterials().length;
  const mallas = destino.getRoot().listMeshes().length;

  console.log('');
  console.log(`  ${metidos} de ${PIEZAS.length} piezas metidas`);
  console.log(`  ${mallas} mallas · ${materiales} materiales · ${texturas} texturas`);
  console.log(`  ${(bytes / 1024).toFixed(0)} kB en ${path.relative(RAIZ, destinoGlb)}`);

  if (faltan.length > 0) {
    console.log('');
    console.log(`  ${faltan.length} no estaban:`);
    for (const f of faltan) console.log(`    · ${f}`);
  }

  /*
   * SE FALLA SI FALTA ALGUNA. Un `.glb` con la mitad de las piezas se carga
   * perfectamente y deja el tablero sin casas, sin un error en ninguna consola —
   * el fallo mudo de siempre. Mejor no compilar que compilar a medias.
   */
  if (faltan.length > 0) {
    console.error('\nFaltan piezas: no se compila a medias.');
    process.exit(1);
  }
  console.log('');
}

await main();
