/**
 * «RIBERAS»: el cuarto arcade, y el que mide si el motor nació agnóstico.
 *
 * Un delta de diecinueve islas. Se fundan CHOZAS en los cruces, se trazan
 * VEREDAS por las orillas, se tira el dado y las islas que sacan ese número
 * rinden bienes a quien las toca. Con bienes se alza más; con dos chozas
 * pegadas se levanta una TORRE. Se cambian bienes con quien quiera, y el que
 * responde a un cambio NO es el que tiene el turno. Quien primero junta ocho
 * puntos, gana. Y hay un premio que no se compra: el VADO LARGO, de quien tenga
 * la cadena de veredas más larga, que se recalcula sola y que un vecino puede
 * partir en dos fundando una choza en medio.
 *
 * ═══ ESTE FICHERO ES LA PRUEBA DE LA FASE, Y LA PRUEBA ES UN DIFF VACÍO ═══
 *
 * El §9 del diseño dice por qué el tablero hexagonal va el CUARTO y no el
 * primero: escribirlo antes «garantizaría que el motor solo juegue a él». Así
 * que lo que esta fase entrega no es el juego: es la demostración de que el
 * comercio, los recursos, los premios derivados, el orden en serpentina y la
 * negociación entre dos personas de las cuales una no tiene el turno CABEN
 * ENTEROS aquí dentro, con cero cambios en `shared/arcade/`.
 *
 * Por eso hay aquí cosas que en otro proyecto habrían subido a una capa común:
 * el coste de cada pieza, el ciclo de vida de un trueque, la serpentina y el
 * recálculo del premio. El §11 las nombra una a una como lo que NO puede subir
 * —«son campos del estado opaco y tipos de movimiento DE UN SOLO JUEGO»—, y lo
 * único que sube es la canonicalización hexagonal, que es geometría y no regla.
 *
 * ═══ EL MAZO, QUE LLEGÓ DESPUÉS Y ES LA MITAD DEL JUEGO ═══
 *
 * Hasta aquí Riberas repartía, fundaba, alzaba, tiraba, cobraba, truequeaba y daba
 * el Vado Largo, y con eso una partida es sólo construir: la decide quien tuvo
 * mejores números. Lo que faltaba es la SEGUNDA ECONOMÍA — cambiar tres bienes por
 * una carta que no sabes cuál es — y está entero en `docs/LAS-CARTAS-DE-RIBERAS.md`,
 * que es de donde salen las decisiones que aquí sólo se ejecutan.
 *
 * Las tres que gobiernan el código y que no se pueden deshacer luego:
 *
 *   · SE BARAJA UNA VEZ, AL EMPEZAR, con la semilla de la mesa. No se sortea al
 *     comprar. Un mazo se puede contar —quedan tres guardias, ya no puede salir un
 *     título— y sobre todo: un sorteo por compra dependería del orden en que llegan
 *     las peticiones, y con eso `reejecutarEn` deja de valer. Ver `EstadoDeRiberas.mazo`.
 *   · UNA CARTA COMPRADA NO SE JUEGA HOY, Y SÓLO SE JUEGA UNA POR TURNO. Sin lo
 *     primero el mazo es una tienda; sin lo segundo, una mano guardada es una jugada
 *     única que gana la partida sin que nadie pueda responder.
 *   · LO OCULTO NO VIAJA, NI DENTRO DE UN IDENTIFICADOR. Cada carta lleva número de
 *     serie por lo mismo que las fichas, y lo que se publica de ella es un seudónimo.
 *     Ver `Carta`, y el §5 bis.
 *
 * Y lo que la Guardia NO hace: mover una pieza de la desgracia por el tablero. Este
 * juego no la tiene —su desgracia es el ESTIAJE— así que roba, que es lo otro que
 * hacía aquella carta. Está razonado en `jugarLaGuardia`.
 *
 * ═══ LO QUE NO CUPO EN LA FASE 4, Y CUPO EN LA 5 ═══
 *
 * Aquí ponía que `opciones()` —concepto del §5 bis— no tenía registro en el
 * núcleo, que `instalarArcade` admitía «manifiesto, reductor, proyección y
 * `loSecreto`, y nada más», y que añadirle un hueco habría sido tocar
 * `shared/arcade/`. Eso fue verdad exactamente una fase.
 *
 * El argumento que lo sostenía —«NO HACE FALTA: los dos clientes de `opciones()`
 * están aquí dentro»— era cierto PARA UN JUEGO DE DENTRO DEL BINARIO, y sólo
 * para eso: un arcade de fuera no puede llamarse a sí mismo desde una pantalla
 * que no ha escrito, así que sin el hueco la frase del §7 —«los muebles
 * genéricos son los únicos que un arcade de FUERA puede usar»— valía a medias.
 * La fase 5 abrió el hueco y Riberas lo declara como los demás.
 *
 * Lo que NO cambió es cómo juega Riberas: sus dos clientes internos siguen
 * llamándola directamente, porque hacerlo por el registro sería resolver un
 * identificador para ejecutar la función del fichero que se está leyendo.
 *
 * ═══ LO LEGAL, QUE AQUÍ NO ES UN TRÁMITE ═══
 *
 * Las reglas y mecánicas de un juego de mesa no son objeto de copyright ni de
 * patente; lo protegido es la EXPRESIÓN. Sobre esa base el §8 dice con todas las
 * letras que «un juego propio de colonización hexagonal SÍ se puede publicar», y
 * pone cuatro condiciones. Van las cuatro, y lo que cumple cada una SIN adornar:
 * la primera versión de esta cabecera se adornó, un revisor la contrastó número a
 * número, y una afirmación falsa aquí es la peor de todas — ésta es la que existe
 * para que nadie más tenga que comprobarlo.
 *
 *   · NOMBRE PROPIO Y NO EVOCADOR. «Riberas», y en ninguna parte de este
 *     fichero, del manifiesto, de los rótulos ni de la lista de terrenos aparece
 *     el nombre de ningún juego publicado. Tampoco un descargo del tipo
 *     «inspirado en…»: no protege y mete la marca ajena en los metadatos
 *     indexables, que es justo lo que las tiendas sancionan. Y el gancho —que es
 *     superficie de tienda: descripción y palabras clave, guía 4.1(c)— ya no
 *     empieza por «Coloniza»; la razón está escrita junto al propio campo.
 *   · ARTE PROPIO. Hexágonos de color liso con el nombre del terreno y una cifra
 *     grande, dibujados aquí como datos. Ni una pieza de arte ajeno, ni fichas de
 *     número con puntos, ni puertos, ni marco. Ésta es la defensa FUERTE, porque
 *     *Tetris Holding v. Xio* hundió a un clon que había copiado las reglas
 *     legítimamente pero también el ASPECTO.
 *   · TERRENOS Y BIENES CON NOMBRE PROPIO: marisma, carrizal, salina, cantil,
 *     vega y duna dan limo, junco, sal, piedra y grano. Son palabras castellanas
 *     de un delta. Y lo que hay que decir aunque no luzca: `grano` es el nombre
 *     corriente de un cereal, no una invención de esta casa, así que ese bien
 *     concreto sí se llama como se llama en otros sitios. Los otros cuatro no.
 *   · REGLAS ESCRITAS CON NUESTRAS PALABRAS — que es literalmente lo que pide el
 *     §8, y NO «reglas inventadas», que es lo que esta cabecera llegó a afirmar y
 *     no es cierto. Contado para que quien audite lo lea aquí y no lo descubra
 *     contando islas:
 *
 *       — El reparto del delta (19 islas 4/4/4/3/3/1, con una sola sin
 *         producción) y los dieciocho números —2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,
 *         11,11,12— son los de la familia de la colonización hexagonal. No se
 *         sortearon aquí.
 *       — Los costes tampoco: vereda = dos bienes distintos, choza = cuatro
 *         distintos uno de cada, torre = dos grano y tres piedra. Es el reparto
 *         clásico del género.
 *       — Los topes de cinco chozas y cuatro torres, y los dos puntos que vale el
 *         premio de recorrido, son los de siempre.
 *       — Lo que SÍ se decidió aquí son cuatro números y una regla: doce veredas,
 *         ocho puntos para ganar, mínimo de cuatro veredas para que el Vado Largo
 *         exista, y el ESTIAJE —al sacar siete no rinde nadie y no pasa nada más:
 *         ni se roba, ni se descarta, ni hay una pieza que alguien mueva por el
 *         tablero—. Esa última es la que más cambia cómo se juega.
 *
 *     Nada de eso es un problema legal: las reglas y las mecánicas no son objeto
 *     de copyright, y es exactamente el supuesto de *DaVinci v. Ziko*, donde el
 *     juzgado dijo que las habilidades de los personajes son «un subconjunto de
 *     las reglas». El problema habría sido dejar escrito aquí lo contrario de lo
 *     que hay.
 *   · `procedencia: 'creacion-propia'`, que es la afirmación exacta y la que
 *     `verify:procedencia` contrasta. Significa lo que dice el tipo —«escrito
 *     aquí, de cero»: el código, el nombre, el arte, los terrenos, los bienes y
 *     todos los textos— y NO significa que la mecánica no tenga género. El
 *     razonamiento entero está junto al campo, al final del fichero.
 *
 * Y lo que un `verify:procedencia` en verde NO demuestra: ese comprobador busca
 * palabras de una lista y no sabe ver evocación estructural. Su alcance está
 * escrito en su propia cabecera, y es ahí donde hay que leerlo antes de tomar su
 * verde por una garantía.
 *
 * ═══ LO QUE ESTE FICHERO NO IMPORTA ═══
 *
 * Nada de `node:`, nada de React, nada de `server/`, nada de `shared/juegos` y
 * nada de `shared/live`. Lo lee el móvil y lo lee el servidor: `shared/` son las
 * reglas, `server/` es la autoridad.
 */
import { barajar, enteroEntre, sembrar } from '../../mecanicas/azar';
import type { Azar } from '../../mecanicas/azar';
import { canonico } from '../../mecanicas/canonico';
import {
  aristaTocaVertice,
  aristasDe,
  aristasDeVertice,
  centroDeHex,
  encuadre,
  esquinasDeHex,
  hexesDeVertice,
  llaveDeHex,
  mallaDeRadio,
  puntoDeVertice,
  verticesDe,
  verticesDeArista,
  verticesDeHex,
  verticesVecinos,
} from '../../mecanicas/malla-hexagonal';
import type { Hex, LlaveDeArista, LlaveDeVertice } from '../../mecanicas/malla-hexagonal';
import type {
  AccionDeTablero,
  CaraDeTablero,
  LineaDeTablero,
  NudoDeTablero,
  PanelDeTablero,
  TableroDeclarado,
} from '../../mecanicas/tablero-declarado';
import { rechazar } from '../motor';
import type { Rechazo } from '../motor';
import type { Opcion } from '../opciones';
import { esTic } from '../reloj';
import type { ContextoMovimiento, Movimiento } from '../movimiento';
import { comoSeLlama, ESPECTADOR, NADIE_SENTADO } from '../tipos';
import type { ArcadeId, AsientoId, LosSentados, ManifiestoDeArcade, QuienMira } from '../tipos';

/**
 * `Opcion` SE REEXPORTA Y YA NO SE DEFINE AQUÍ.
 *
 * Vivía en este fichero porque en la fase 4 el núcleo no tenía registro para
 * `opciones()` y no podía tener su tipo. Ahora lo tiene (`shared/arcade/opciones.ts`),
 * y el tipo vive donde vive la firma que lo usa. Se reexporta para no romper a
 * quien lo importaba de aquí —`shared/arcade/juegos/index.ts` y el comprobador del
 * juego— y porque leer «las opciones de Riberas» desde el fichero de Riberas es
 * lo que espera quien lo abre.
 */
export type { Opcion };

/** El identificador de este arcade. */
export const RIBERAS: ArcadeId = 'riberas';

// ---------------------------------------------------------------------------
// EL DELTA: terrenos, bienes y lo que rinde cada isla
// ---------------------------------------------------------------------------

/**
 * Lo que se recoge. Cinco bienes con nombre de delta y de ninguna otra parte.
 *
 * Se escriben como cadenas y no como números por lo mismo que las cartas de La
 * Ronda: los bienes son SECRETOS —ver `loSecretoDeRiberas`— y un secreto que es
 * el número 3 «aparece» por casualidad en cualquier contador de la vista, con lo
 * que el comprobador que existe para cazar filtraciones daría rojo sin que
 * pasara nada. Un comprobador que grita cuando no pasa nada acaba desactivado.
 */
export type Bien = 'limo' | 'junco' | 'sal' | 'piedra' | 'grano';

/** Los cinco, en el orden en que se enseñan y en que se recorren. */
export const BIENES: readonly Bien[] = ['limo', 'junco', 'sal', 'piedra', 'grano'];

/** Lo que hay en cada isla. `duna` es la que no rinde nada. */
export type Terreno = 'marisma' | 'carrizal' | 'salina' | 'cantil' | 'vega' | 'duna';

/**
 * QUÉ DA CADA TERRENO, o `null` si no da nada.
 *
 * ═══ POR QUÉ ESTO SE EXPORTA, SI NADIE DE FUERA REPARTE BIENES ═══
 *
 * Porque hay OTRA tabla que depende de ésta y no puede importarla. `escenas/paleta.ts`
 * decide de qué color y de qué celda del atlas se pinta cada isla, y esa decisión sale de
 * lo que la isla produce: el carrizal se ve como el bosque porque su junco es la madera, la
 * marisma como la colina porque su limo es el ladrillo. La escena no puede preguntárselo a
 * las reglas —sería el dibujo importando el juego— así que lo repite, y una tabla repetida
 * es una tabla que se desincroniza en silencio.
 *
 * Ya pasó: la escena pintó los seis terrenos por su NOMBRE en vez de por su bien, y las
 * cartas salieron de un color y sus islas de otro. Nada falló.
 *
 * Así que esto sale por la puerta para que `verify:riberas` pueda contrastar las dos: qué
 * rinde cada terreno aquí, y de qué color se pinta allí. Es lectura, no reparto — quien
 * quiera dar bienes sigue teniendo que pasar por el reductor.
 */
export const RINDE: Record<Terreno, Bien | null> = {
  marisma: 'limo',
  carrizal: 'junco',
  salina: 'sal',
  cantil: 'piedra',
  vega: 'grano',
  duna: null,
};

/** Cómo se llama cada terreno en el tablero. */
const NOMBRE_DEL_TERRENO: Record<Terreno, string> = {
  marisma: 'Marisma',
  carrizal: 'Carrizal',
  salina: 'Salina',
  cantil: 'Cantil',
  vega: 'Vega',
  duna: 'Duna',
};

/**
 * DE QUÉ COLOR SE PINTA CADA TERRENO EN EL TABLERO PLANO. Sólo pintado: ninguna regla.
 *
 * ═══ CADA ISLA SE PINTA DEL BIEN QUE DA, NO DE LO QUE SUENA SU NOMBRE ═══
 *
 * Aquí había seis colores elegidos por el nombre: la marisma verde azulada porque las
 * marismas son agua estancada, la salina parda porque la sal se seca al sol, el carrizal
 * verde medio porque el carrizo es hierba. Uno a uno se defendían; juntos mentían.
 *
 * La marisma da limo, que es el LADRILLO de este juego, y salía del mismo verde que el
 * carrizal, que da junco, que es la MADERA. O sea que las dos islas que dan los dos bienes
 * que más se truecan se parecían entre sí y no se parecían a sus cartas. Ese fallo no se
 * cae ni se reporta: se juega mal un rato y se abandona la partida sin saber por qué costaba
 * leer el tablero.
 *
 * Así que el color sale del BIEN: el carrizal es el verde oscuro del bosque, la marisma el
 * ladrillo cocido de la arcilla, la salina el verde claro de la pradera —donde otros juegos
 * ponen lana—, la vega el dorado del sembrado, el cantil el gris de la montaña y la duna la
 * arena del desierto, porque como el desierto no da nada.
 *
 * ═══ Y POR QUÉ LA VEGA YA NO ES EL AMARILLO QUE APETECÍA, NI LA MARISMA EL SUYO ═══
 *
 * Porque estos seis rellenos no compiten sólo entre ellos: encima de cada isla se pintan
 * las CHOZAS, las TORRES y las VEREDAS de quien las tiene, y esas se pintan con el color
 * de su dueño —`COLORES_DE_COLONO`, cuarenta líneas más abajo en este mismo fichero— y un
 * filo de un píxel que no promete nada. Una pieza del color de la isla que pisa no se ve.
 *
 * Pasó, y con el amarillo: la vega estaba en `#e3b53a` y el tercer colono es `#e0b83d`. Son
 * 2,9 CIE76 —el umbral de «se nota si están pegados» ronda 2— así que en cualquier partida
 * de tres o más, las piezas de quien jugara en amarillo DESAPARECÍAN sobre las islas de
 * vega. Lo mismo, más flojo, con la marisma `#c05a2c` contra el rojo `#e0533d`: 16,5.
 *
 * Y no se cazaba, porque lo único que se vigilaba era que dos ISLAS no se confundieran
 * entre sí — nunca que una isla se comiera una PIEZA. Así que los dos rellenos se movieron
 * fuera del alcance de los seis colores de colono y, sobre todo, se escribió la regla que
 * faltaba: `verify:riberas` exige ahora una distancia mínima entre cada uno de estos seis
 * y cada uno de aquellos seis. Hoy el par más apretado son 27,0 (vega contra el oro) sobre
 * un mínimo de 20; antes eran 2,9.
 *
 * Los colonos NO se tocaron a propósito: `escenas/embarcadero/tema.ts` los repite para las
 * barcas del Muelle y `verify:embarcadero` los contrasta, así que mover un colono es mover
 * dos ficheros y una comprobación ajena. Mover el relleno es mover una línea de aquí.
 *
 * ═══ POR QUÉ NO SON LOS MISMOS HEXADECIMALES QUE `escenas/paleta.ts` ═══
 *
 * Porque el otro tablero no es plano. En tres dimensiones el color lo pone la textura del
 * pack con su degradado, y encima hay relieve, sombras, árboles y agua: dos verdes vecinos
 * se separan solos. Aquí no hay más que polígonos pegados con un borde de un píxel, y encima
 * piezas de colonos encima de los polígonos, así que cada uno de estos seis se retoca por lo
 * que le pide ESTA superficie: los dos verdes se abren más el uno del otro, y la vega y la
 * marisma bajan y se desaturan para salir de debajo de las piezas.
 *
 * Lo que NO puede cambiar es cuál es cuál. La regla que lo sujeta está escrita como
 * comprobación en `server/scripts/verificar-riberas.ts`, y es ésta: el color plano de cada
 * terreno tiene que estar MÁS CERCA del color que `paleta.ts` le da a ese mismo terreno que
 * del de cualquier otro de los seis. Eso permite el retoque y prohíbe el cambio de historia.
 * Y de propina se mide que los seis se distingan entre sí, que es el fallo que se vio.
 *
 * ═══ Y POR QUÉ EL VERDE DEL CARRIZAL NO ES MÁS OSCURO, QUE APETECÍA ═══
 *
 * Porque hay un tercer interesado en estos seis colores que no está en este fichero: el
 * realce de la casilla que acaba de producir, que en los dos clientes es una raya de acento
 * con un halo de `--suelo` (#080a0e) debajo. Ese halo es lo único que promete verse contra
 * un relleno que la Sala no elige, y para prometerlo tiene que recortarse del relleno por
 * 3:1. Un carrizal a #2f6138 —que se probó, y se veía mejor como bosque— deja el halo en
 * 2,72 y rompe esa promesa justo en la isla que más veces se destaca. A #346d3d da 3,21.
 *
 * O sea que el suelo de este verde no es de gusto: es el contraste. Está medido en la
 * cabecera del realce de `app/src/arcade/retablo.tsx` y en la de `escritorio/src/retablo.tsx`.
 */
const COLOR_DEL_TERRENO: Record<Terreno, string> = {
  /* Verde oscuro de bosque: el junco es la madera. */
  carrizal: '#346d3d',
  /* Ladrillo cocido: el limo es el ladrillo. Bajado del rojo del primer colono. */
  marisma: '#9d4f25',
  /* Verde claro de pradera: donde otros juegos ponen lana, aquí hay sal. */
  salina: '#9dc257',
  /* Trigo maduro: sembrado, y no el amarillo del tercer colono. */
  vega: '#b89a55',
  /* Gris de montaña. */
  cantil: '#78828d',
  /* Arena: la duna no da nada, como no da nada el desierto. */
  duna: '#e6d8ae',
};

/**
 * LA BOLSA DE ISLAS: diecinueve, y su reparto es una decisión de este juego.
 *
 * El delta es una malla de radio 2 —diecinueve hexágonos— porque es el tamaño
 * más pequeño en el que la regla de distancia entre chozas muerde de verdad y
 * en el que caben seis colonos sin que el tablero se llene en la colocación.
 * Con radio 1 (siete islas) las dos chozas iniciales de cada cual ya no caben; a
 * partir de radio 3 la partida se alarga sin enseñar nada nuevo.
 *
 * Hay una sola duna. No es un desierto con nombre distinto: es la isla que no
 * rinde, y existe para que el tablero tenga un hueco que rompa las cadenas de
 * producción y para que la regla «el que no rinde no lleva número» tenga un
 * caso real que probar.
 */
const BOLSA_DE_ISLAS: readonly Terreno[] = [
  'vega',
  'vega',
  'vega',
  'vega',
  'carrizal',
  'carrizal',
  'carrizal',
  'carrizal',
  'marisma',
  'marisma',
  'marisma',
  'marisma',
  'cantil',
  'cantil',
  'cantil',
  'salina',
  'salina',
  'salina',
  'duna',
];

/**
 * LOS DIECIOCHO NÚMEROS, uno por isla que rinde.
 *
 * No hay ningún siete, y eso NO es porque el siete esté reservado a nada: es que
 * con dos dados el siete es la suma más probable, así que colgarlo de una isla
 * la haría rendir el doble que las demás. Lo que pasa al sacar un siete está
 * escrito en `ESTIAJE`, aquí abajo, y es una regla de este juego.
 */
const NUMEROS_DE_LAS_ISLAS: readonly number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];

/**
 * EL ESTIAJE: la suma que no rinde nada a nadie.
 *
 * Cuando el dado saca siete el agua baja y las islas no producen. Y no pasa nada
 * más: ni se roba, ni se descarta, ni se mueve ninguna pieza. Es a propósito —el
 * castigo por acumular es la clase de regla rica que este juego no necesita para
 * demostrar lo que la fase tiene que demostrar, y cada regla de más es una regla
 * que alguien copiaría al escribir el quinto juego.
 */
const ESTIAJE = 7;

/** El radio del delta, en islas. Ver `BOLSA_DE_ISLAS`. */
const RADIO_DEL_DELTA = 2;

// ---------------------------------------------------------------------------
// LO QUE CUESTA CADA COSA
// ---------------------------------------------------------------------------

/** Las tres piezas que se alzan. */
export type Pieza = 'vereda' | 'choza' | 'torre';

/**
 * QUÉ SE PAGA POR CADA PIEZA, como lista de bienes y no como cuentas.
 *
 * Una lista y no un `Record<Bien, number>` porque pagar es QUITAR FICHAS
 * concretas del almacén —ver `Ficha`— y con una lista el cobro es un bucle sobre
 * ella, sin tener que recorrer las claves de un objeto. Recorrer claves aquí
 * sería además un `for…in` o un `Object.keys`, y el primero está prohibido en
 * este árbol: el orden de las claves con forma de entero es numérico y no de
 * inserción, así que dos motores de JavaScript recorrerían distinto.
 */
const COSTES: Record<Pieza, readonly Bien[]> = {
  vereda: ['junco', 'limo'],
  choza: ['junco', 'limo', 'grano', 'sal'],
  torre: ['grano', 'grano', 'piedra', 'piedra', 'piedra'],
};

/** Cuántos puntos vale cada pieza sobre el tablero. */
const PUNTOS_DE_LA_PIEZA: Record<Pieza, number> = { vereda: 0, choza: 1, torre: 2 };

/** Lo que vale el Vado Largo a quien lo tenga. */
export const PUNTOS_DEL_VADO = 2;

/**
 * EL MÍNIMO PARA QUE EL VADO LARGO EXISTA. Con cuatro veredas ya no hay vado.
 *
 * ═══ VALÍA CUATRO Y AHORA VALE CINCO, Y NO ES UN AJUSTE DE EQUILIBRIO ═══
 *
 * Con cuatro el premio caía en la primera o segunda ronda: la colocación ya deja
 * dos veredas puestas, y dos más son un turno con bienes. A partir de ahí saltaba
 * de mano en mano cada vez que alguien alargaba la suya. Un premio que se alcanza
 * antes de que la partida empiece y que cambia de dueño sin que su dueño haga
 * nada no es un premio: es ruido en el marcador.
 *
 * Y hay que decir lo que subirlo OBLIGA A MIRAR, porque es la parte cara: una
 * comprobación escrita contra el número viejo que se pone VERDE con el nuevo sin
 * tocarla no es una comprobación que haya aguantado el cambio — es una que no
 * estaba mirando el mínimo. Por eso el comprobador tiene, al lado de las que
 * hablan de cinco, la vacuna que dice que CUATRO veredas seguidas no dan el Vado:
 * es la única que se pone roja si alguien vuelve a bajar el número.
 */
export const VADO_MINIMO = 5;

/** Con cuántos puntos se gana. */
export const PUNTOS_PARA_GANAR = 8;

/**
 * Cuántas piezas de cada clase puede tener un colono. Un tope, no una regla rica.
 *
 * Se EXPORTA para que `verify:riberas` pueda comprobar contra estos mismos números
 * que `opciones()` deja de ofrecer cuando se agotan. Durante un tiempo no lo hacía
 * —sólo lo miraba la torre— y el comprobador no podía cazarlo porque no tenía con
 * qué comparar. Un tope que sólo conoce el reductor es un tope que ofrece botones
 * que no hacen nada.
 */
export const TOPE_DE_PIEZAS: Record<Pieza, number> = { vereda: 12, choza: 5, torre: 4 };

/** Cuántos trueques se guardan en el estado. Los viejos se olvidan. */
const TRATOS_QUE_SE_RECUERDAN = 8;

/**
 * CUÁNTOS BIENES VAN EN CADA LADO DE UN TRUEQUE: uno. Un trueque es UNO POR UNO.
 *
 * ═══ ESTA CONSTANTE VALÍA 3 Y ERA UNA MENTIRA DE TRES LÍNEAS ═══
 *
 * Decía «como mucho tres» y la validación de `bienesDeLaCarga` rechazaba las
 * listas de más de tres, así que quien la leyera creería que el juego admite
 * trueques de dos o tres bienes por lado y que esa comprobación estaba viva
 * protegiendo algo. Ninguna de las dos cosas era cierta: `opcionesDeTrueque` sólo
 * emite `da: [uno], pide: [uno]`, y el portillo del §5 bis rechaza todo lo que no
 * coincida EN FORMA CANÓNICA con una opción ofrecida. Un `da: [x, y]` no llegaba
 * nunca a `ofrecer`. Medido: devolvía el mismo objeto de estado y `tratos` no
 * crecía.
 *
 * O sea que «no hay trueques de 2×1» era una regla del juego tomada de rebote por
 * el portillo, sin estar escrita en ninguna parte. Ahora está escrita aquí y es
 * una decisión: uno por uno se lee de un vistazo en una lista de botones, y la
 * combinatoria completa —cualquier montón por cualquier montón— son miles de
 * opciones, que no es una interfaz sino una lista que nadie lee.
 *
 * Y la validación no sobra por ser el portillo quien ya lo rechaza. Es lo que dice
 * el comentario de `bienesDeLaCarga`: quien lea esto dentro de un año no debe
 * tener que demostrar el teorema del portillo para saber que `ofrecer` está a
 * salvo. Lo que no puede es afirmar una forma que el juego no admite.
 */
const BIENES_POR_LADO_DEL_TRUEQUE = 1;

// ---------------------------------------------------------------------------
// EL MAZO: la segunda economía
// ---------------------------------------------------------------------------

/**
 * LAS NUEVE CLASES DE CARTA, que son cinco familias.
 *
 * Los cinco TÍTULOS —Molino, Cantera, Torreón, Faro, Huerto— son una sola familia
 * con cinco caras: cuestan lo mismo, valen lo mismo y hacen lo mismo. Que sean
 * cinco dibujos y no uno repetido cinco veces es una decisión de producto y no de
 * reglas: la mitad de la gracia de guardarse un título es lo que se enseña al
 * revelarlo, y cinco veces el mismo cartón no enseña nada.
 *
 * Los nombres son de Riberas y de ninguna otra parte, por lo mismo que los bienes
 * y los terrenos: ver la cabecera del fichero. Y hay una razón añadida que no es
 * de estilo — uno de los nombres con que se conoce la carta que aquí se llama EL
 * ACAPARAMIENTO es a la vez una marca viva y una palabra de economía, y está en la
 * lista de `server/scripts/marcas-registradas.ts`. Escribirlo aquí pondría rojo
 * `verify:procedencia`, y con razón: ese comprobador barre las cadenas literales
 * de esta carpeta justamente porque es donde una baraja puede estar.
 */
export type ClaseDeCarta =
  | 'guardia'
  | 'ano-bueno'
  | 'acaparamiento'
  | 'dos-veredas'
  | Titulo;

/** Las cinco cartas de punto. Se revelan; no se juegan. */
export type Titulo = 'molino' | 'cantera' | 'torreon' | 'faro' | 'huerto';

/** Los cinco títulos, en el orden en que se enseñan y en que se recorren. */
export const TITULOS: readonly Titulo[] = ['molino', 'cantera', 'torreon', 'faro', 'huerto'];

/** Las nueve, en el orden en que se enseñan. Los títulos, al final y juntos. */
export const CLASES_DE_CARTA: readonly ClaseDeCarta[] = [
  'guardia',
  'ano-bueno',
  'acaparamiento',
  'dos-veredas',
  ...TITULOS,
];

/** Cómo se llama cada carta cuando hay que escribirla en un botón. */
const NOMBRE_DE_LA_CARTA: Record<ClaseDeCarta, string> = {
  guardia: 'La Guardia',
  'ano-bueno': 'El Año Bueno',
  acaparamiento: 'El Acaparamiento',
  'dos-veredas': 'Las Dos Veredas',
  molino: 'El Molino',
  cantera: 'La Cantera',
  torreon: 'El Torreón',
  faro: 'El Faro',
  huerto: 'El Huerto',
};

/**
 * LAS VEINTICINCO CARTAS, y el reparto es una decisión de este juego.
 *
 * Catorce guardias de veinticinco no es un número bonito: es lo que hace que La
 * Mayor Guardia sea alcanzable —tres jugadas, y más que nadie— sin que comprar
 * deje de ser una apuesta. Con menos guardias el premio no se reparte nunca; con
 * más, el mazo deja de sorprender y comprar se vuelve un cambio seguro.
 *
 * Va en orden fijo y se baraja después. Escribirla ya revuelta sería un montón de
 * cartas cuyo reparto nadie puede contar leyendo, que es justo lo contrario de lo
 * que este fichero quiere de sus datos.
 */
const BOLSA_DE_CARTAS: readonly ClaseDeCarta[] = [
  'guardia', 'guardia', 'guardia', 'guardia', 'guardia', 'guardia', 'guardia',
  'guardia', 'guardia', 'guardia', 'guardia', 'guardia', 'guardia', 'guardia',
  'molino',
  'cantera',
  'torreon',
  'faro',
  'huerto',
  'ano-bueno', 'ano-bueno',
  'acaparamiento', 'acaparamiento',
  'dos-veredas', 'dos-veredas',
];

/** Cuántas cartas tiene el mazo al empezar. Se exporta para poder comprobarlo. */
export const CARTAS_DEL_MAZO = BOLSA_DE_CARTAS.length;

/** Lo que cuesta una carta: uno de cada. Se cobra con `cobrar`, como todo. */
export const COSTE_DE_LA_CARTA: readonly Bien[] = ['sal', 'piedra', 'grano'];

/** Cuántas guardias jugadas hacen falta para que La Mayor Guardia exista. */
export const GUARDIA_MINIMA = 3;

/** Lo que vale La Mayor Guardia a quien la tenga. */
export const PUNTOS_DE_LA_GUARDIA = 1;

/** Lo que vale cada título revelado. */
export const PUNTOS_DEL_TITULO = 1;

/** Cuántas veredas regala Las Dos Veredas. Están en el nombre y en la regla. */
export const VEREDAS_DE_LA_CARTA = 2;

/**
 * Cuántos bienes da El Año Bueno.
 *
 * Vale dos, igual que `VEREDAS_DE_LA_CARTA`, y son dos constantes y no una: que
 * hoy coincidan es casualidad de dos reglas distintas, y la primera vez que
 * alguien quiera tocar una de las dos, la que comparte constante arrastra a la
 * otra sin que nadie lo pida.
 */
export const BIENES_DEL_ANO_BUENO = 2;

/**
 * UNA CARTA: `'c7:guardia'`. Seudónimo delante, clase detrás.
 *
 * ═══ POR QUÉ CADA CARTA LLEVA NÚMERO DE SERIE, IGUAL QUE UNA FICHA ═══
 *
 * Por la misma razón exacta que `Ficha`, y conviene leer aquella cabecera entera.
 * Dos colonos con una guardia cada uno producirían el mismo valor secreto, ese
 * valor aparecería legítimamente en dos vistas, y `verify:mesa` —que comprueba
 * que ningún secreto salga en más de un asiento— se pondría rojo sin que hubiera
 * pasado nada. Un comprobador que grita cuando no pasa nada acaba desactivado.
 *
 * ═══ Y POR QUÉ EL SEUDÓNIMO VA DELANTE Y SEPARADO ═══
 *
 * Porque LA CARTA ENTERA ES SECRETA y el botón para jugarla no puede serlo: el
 * §5 bis prohíbe que un identificador de opción lleve dentro algo oculto, y
 * `verify:mesa` NO lo cazaría —busca la forma canónica, con comillas, y
 * `'jugar-guardia:c7:B'` no contiene `"c7:guardia"`—. Así que lo que se publica es
 * `c7` a secas, que no dice qué carta es, y el reductor lo resuelve contra la mano
 * de quien mueve, que es el único sitio donde ese seudónimo significa algo.
 *
 * Es el mismo trato que el trueque le da a `t1`, y está escrito allí: un
 * identificador derivado del contenido es un sitio por donde un secreto viaja sin
 * que el comprobador lo vea.
 */
export type Carta = string;

/**
 * UNA CARTA EN LA MANO, con el turno en que se compró.
 *
 * El turno hace falta porque una carta comprada NO se juega el mismo turno (§1.4
 * del diseño): sin esa regla, tres bienes se convierten en un efecto inmediato y
 * el mazo pasa a ser una tienda. Guardarlo por carta y no por colono es lo que
 * permite comprar una carta y jugar OTRA en el mismo turno, que es correcto.
 *
 * El sello se compara contra `turnosAbiertos`, que es un contador que sólo sube.
 * El índice del turno no serviría: vuelve a cero cada ronda, y una carta comprada
 * en la ronda anterior parecería recién comprada.
 */
export interface CartaEnMano {
  carta: Carta;
  /** El valor de `turnosAbiertos` cuando se compró. */
  comprada: number;
}

/**
 * La clase de una carta, leída de su propio identificador.
 *
 * Se contrasta contra LA LISTA y no con un `in` sobre la tabla de nombres, que es
 * como se escribió primero: `'toString' in NOMBRE_DE_LA_CARTA` es cierto, así que
 * una cadena `'c1:toString'` habría salido de aquí como si fuera una clase de
 * carta. Hoy ninguna carta se fabrica fuera de este fichero y no hay camino para
 * que llegue una así; la lista cuesta lo mismo y no depende de que siga sin
 * haberlo.
 */
export function claseDeLaCarta(carta: Carta): ClaseDeCarta | null {
  const corte = carta.indexOf(':');
  if (corte < 0) return null;
  const resto = carta.slice(corte + 1);
  return (CLASES_DE_CARTA as readonly string[]).includes(resto) ? (resto as ClaseDeCarta) : null;
}

/** El seudónimo de una carta: lo ÚNICO suyo que se puede publicar. */
export function seudonimoDeLaCarta(carta: Carta): string {
  const corte = carta.indexOf(':');
  return corte < 0 ? carta : carta.slice(0, corte);
}

/** ¿Es esta clase uno de los cinco títulos? */
export function esTitulo(clase: ClaseDeCarta): clase is Titulo {
  return (TITULOS as readonly string[]).includes(clase);
}

// ---------------------------------------------------------------------------
// LOS MOVIMIENTOS
// ---------------------------------------------------------------------------

/** Reparte el delta y arranca la colocación. Lo manda cualquiera de los sentados. */
export const EMPEZAR = 'riberas:empezar';

/** Funda una choza. `carga: { vertice: 'v:…' }`. */
export const FUNDAR = 'riberas:fundar';

/** Alza una pieza. `carga: { que: 'vereda'|'choza'|'torre', donde: 'a:…'|'v:…' }`. */
export const ALZAR = 'riberas:alzar';

/** Tira los dos dados. `carga` vacía. */
export const TIRAR = 'riberas:tirar';

/** Propone un trueque. `carga: { para, da: Bien[], pide: Bien[] }`. */
export const OFRECER = 'riberas:ofrecer';

/** Acepta un trueque ajeno. `carga: { trato: 't3' }`. */
export const ACEPTAR = 'riberas:aceptar';

/** Rechaza un trueque ajeno. `carga: { trato: 't3' }`. */
export const RECHAZAR = 'riberas:rechazar';

/** Cierra el turno. `carga` vacía. */
export const PASAR = 'riberas:pasar';

/*
 * ═══ LOS SEIS DEL MAZO, Y POR QUÉ SON SEIS TIPOS Y NO UNO ═══
 *
 * Se podría escribir un solo `riberas:jugar` con la clase de la carta dentro de la
 * carga, y sería menos código. No se hace, por dos razones que se ven al leer y no
 * al escribir:
 *
 *   · Cada una pide argumentos distintos —a quién robas, qué dos bienes coges, qué
 *     bien acaparas, ninguno— y un solo tipo obligaría a una carga con cuatro
 *     campos opcionales de los que cada rama usa uno. Eso no es una carga: es
 *     cuatro cargas disfrazadas de una, y el compilador deja de ayudar.
 *   · El portillo del §5 bis compara `{tipo, carga}` en forma canónica contra lo
 *     ofrecido. Con tipos distintos, una carga mal formada ni siquiera se parece a
 *     otra opción; con un tipo único, todas se parecen entre sí.
 *
 * REVELAR es el sexto y NO es «jugar una carta»: no gasta la jugada del turno y se
 * puede hacer el mismo turno en que se compró (§1.4). Que tenga tipo propio es lo
 * que hace que esa diferencia no dependa de un `if` dentro de una rama común.
 */

/** Compra la carta de arriba del mazo. `carga` vacía. */
export const COMPRAR = 'riberas:comprar';

/** Juega una guardia y roba. `carga: { carta: 'c7', a: 'asiento' }`. */
export const GUARDIA = 'riberas:guardia';

/** Juega el año bueno. `carga: { carta: 'c7', bienes: [Bien, Bien] }`. */
export const ANO_BUENO = 'riberas:ano-bueno';

/** Juega el acaparamiento. `carga: { carta: 'c7', bien: Bien }`. */
export const ACAPARAMIENTO = 'riberas:acaparamiento';

/** Juega las dos veredas. `carga: { carta: 'c7' }`. Las veredas se alzan después. */
export const DOS_VEREDAS = 'riberas:dos-veredas';

/** Revela un título. `carga: { carta: 'c7' }`. No cuenta como jugar una carta. */
export const REVELAR = 'riberas:revelar';

// ---------------------------------------------------------------------------
// EL ESTADO
// ---------------------------------------------------------------------------

/** En qué punto va la mesa. */
export type MomentoDeRiberas =
  /** Hay mesa y no hay delta: se espera a que se sienten al menos dos. */
  | 'reuniendo'
  /** El delta está repartido y se colocan las chozas iniciales en serpentina. */
  | 'colocando'
  /** Turnos normales: tirar, alzar, trocar, pasar. */
  | 'jugando'
  /** Alguien llegó a los puntos. Ya no entra ningún movimiento. */
  | 'terminada';

/**
 * UNA FICHA DE BIEN: `'b17:junco'`.
 *
 * ═══ POR QUÉ CADA BIEN ES UNA FICHA CON NÚMERO Y NO UNA CUENTA ═══
 *
 * Lo obvio sería guardar `{ junco: 3, limo: 1 }`. Se probó y NO SIRVE para lo
 * único que tiene que servir, que es que `verify:mesa` pueda demostrar que el
 * almacén de cada cual no se filtra:
 *
 *   · Ese comprobador coge lo que devuelve `loSecreto(estado)` y comprueba que
 *     ningún valor aparezca en la vista de MÁS DE UN asiento.
 *   · Dos colonos con el mismo montón —y al empezar TODOS tienen el mismo, que
 *     es ninguno— producirían el mismo objeto secreto, que aparecería en dos
 *     vistas legítimamente, y el comprobador se pondría rojo sin que hubiera
 *     pasado nada.
 *
 * Con una ficha por unidad y un número de serie que no se repite jamás, cada
 * secreto es único, aparece exactamente en la vista de su dueño y en ninguna
 * otra, y una proyección que fuera la identidad haría aparecer todas las fichas
 * en todas las vistas y se pondría roja. Es el mismo trato que las cartas de La
 * Ronda —`'espadas-10'`, distinguibles a propósito— y por la misma razón.
 *
 * ═══ Y POR QUÉ LA CLASE DEL BIEN VA DENTRO DE LA FICHA ═══
 *
 * Porque el almacén es una lista y hay que poder mirar qué es cada cosa sin un
 * segundo objeto que se desincronice. La consecuencia está en el §5 bis y es la
 * razón por la que este fichero no publica NUNCA una ficha dentro de un
 * identificador: `'pagar-con-b17:junco'` escondería un secreto dentro de un id,
 * y `verify:mesa` NO lo cazaría, porque busca la forma canónica CON COMILLAS y
 * esa cadena no contiene `"b17:junco"`. Ver `Opcion.id`.
 */
export type Ficha = string;

/** Una isla del delta. Todo lo de aquí es público: se ve mirando el tablero. */
export interface Isla {
  hex: Hex;
  terreno: Terreno;
  /** Con qué suma rinde. Cero en la duna, que no rinde nunca. */
  numero: number;
}

/**
 * UN COLONO: lo que un asiento tiene DENTRO de la partida.
 *
 * El asiento lo reparte el servidor y puede existir sin partida. Esto es lo
 * suyo: su almacén —secreto—, sus piezas —públicas, están sobre el tablero— y su
 * color. La lista se construye AL EMPEZAR, copiando `ctx.asientos` en el orden en
 * que se sentaron, y a partir de ahí no cambia: quien llegue después mira.
 */
export interface Colono {
  asiento: AsientoId;
  /** Con qué color salen sus piezas. Público y estable durante la partida. */
  color: string;
  /** SU ALMACÉN. Esto es lo que jamás puede salir hacia otro asiento. */
  almacen: Ficha[];
  chozas: LlaveDeVertice[];
  torres: LlaveDeVertice[];
  veredas: LlaveDeArista[];

  /**
   * SU MANO DE CARTAS. Secreta entera, como el almacén y por lo mismo.
   *
   * Lo que sí es público es CUÁNTAS tiene, y sale en la vista como un número: se
   * cuentan mirando el montón que tiene delante, igual que los bienes.
   */
  mano: CartaEnMano[];

  /**
   * CUÁNTAS GUARDIAS HA JUGADO. Público: una guardia se juega en voz alta.
   *
   * Es un número y no la lista de las cartas jugadas, y eso es deliberado: una
   * carta que sale de la mano deja de ser secreta, y si se guardara con su
   * identificador —`'c7:guardia'`— ese mismo valor pasaría a aparecer en las seis
   * vistas. `loSecretoDeRiberas` lo declara secreto mientras está en la mano, así
   * que `verify:mesa` se pondría rojo al jugarla. Con un contador, un secreto
   * nunca se vuelve público: desaparece.
   */
  guardias: number;

  /** Los títulos que ha revelado. Públicos, y un punto cada uno. */
  titulos: Titulo[];
}

/** En qué punto está un trueque. El ciclo de vida entero, y es de este juego. */
export type EstadoDelTrato = 'propuesta' | 'aceptada' | 'rechazada' | 'caducada';

/**
 * UN TRUEQUE PROPUESTO.
 *
 * ═══ ESTO ES LO QUE MÁS TENSIONA EL MOTOR, Y CABE ENTERO AQUÍ ═══
 *
 * Lo propone quien tiene el turno y lo contesta quien NO lo tiene. El árbitro no
 * se entera de nada de esto: comprueba que quien manda el movimiento esté
 * sentado y que su revisión sea fresca, y nada más. Que le toque o no le toque es
 * un campo de este estado, y por eso alguien puede actuar sin tener el turno sin
 * que haya que tocar una línea del núcleo.
 *
 * Lo que se ofrece y lo que se pide son PÚBLICOS: un trueque se dice en voz alta.
 * Lo que no es público es si quien lo propone tiene de verdad lo que promete, y
 * ahí está el contraejemplo del §5 bis. Ver `opcionesDeRiberas`.
 */
export interface Trato {
  /**
   * SEUDÓNIMO. Un contador, nunca el contenido.
   *
   * Se podría llamar `'t:junco2-por-sal1'`, que se lee mejor al depurar. No se
   * hace, y la razón es la del §5 bis: un identificador derivado del contenido
   * es un sitio donde un secreto viaja sin que el comprobador lo vea. Aquí el
   * contenido del trueque resulta ser público, así que no habría filtración —pero
   * la costumbre sí viajaría, y el siguiente id que alguien escriba con el mismo
   * patrón llevará dentro algo que no era público.
   */
  id: string;
  de: AsientoId;
  para: AsientoId;
  /** Lo que entrega quien lo propone. */
  da: Bien[];
  /** Lo que quiere a cambio. */
  pide: Bien[];
  estado: EstadoDelTrato;
}

/** Quién tiene el Vado Largo y con qué longitud. `de: null` si está vacante. */
export interface Vado {
  de: AsientoId | null;
  largo: number;
}

/**
 * Quién tiene La Mayor Guardia y con cuántas. `de: null` si está vacante.
 *
 * Es un tipo aparte y no `Vado` reutilizado, aunque los dos tengan la misma forma:
 * `largo` se cuenta en veredas encadenadas y `cuantas` en cartas jugadas, y son dos
 * cosas que no se comparan entre sí. Compartir el tipo invitaría a compartir la
 * función, y la función es lo único que de verdad se comparte —la REGLA del máximo
 * estricto, que está escrita una vez y se aplica dos.
 */
export interface Guardia {
  de: AsientoId | null;
  cuantas: number;
}

/**
 * TODO lo que hay que saber de una partida de Riberas.
 *
 * Opaco para el motor y para el árbitro: ninguno de los dos mira dentro. El
 * turno, la serpentina, los bienes, los trueques y el premio están aquí y no en
 * el contexto del movimiento, que es el descarte más importante del diseño.
 */
export interface EstadoDeRiberas {
  momento: MomentoDeRiberas;

  /*
   * ═══ AQUÍ HUBO UN CAMPO `sentados` Y SOBRABA. QUEDA ESCRITO PORQUE CASI CUELA ═══
   *
   * `opciones()` recibe LA VISTA y jamás el estado (§5 bis), y la vista sale de la
   * proyección, que sólo ve el estado. Los asientos, en cambio, viven en el
   * CONTEXTO del movimiento, que la proyección no recibe. De ahí la conclusión
   * aparente: sin copiarlos al estado, `opciones()` no sabría si hay bastante
   * gente para empezar, no ofrecería «empezar», y el portillo del reductor
   * rechazaría el único movimiento que hace arrancar la partida.
   *
   * Se escribió así, con su refresco desde el contexto en cada movimiento, y lo
   * cazó `verify:riberas` a la primera: en una mesa recién abierta el estado es
   * `undefined`, así que la copia nacía vacía, así que no se ofrecía empezar y la
   * mesa no arrancaba NUNCA. El campo no arreglaba el problema: lo movía al primer
   * movimiento, que era justo el que no podía existir.
   *
   * Y sobraba porque la regla del §5 bis es «SÓLO SI» y no «si y sólo si»:
   * `opciones()` puede ofrecer de más y el reductor lo vuelve a validar con todo
   * lo que hay. Así que se ofrece «empezar» a cualquiera que tenga asiento, y
   * `repartirElDelta` comprueba el aforo con `ctx.asientos`, que es donde vive la
   * verdad. Un campo menos en el estado, un refresco menos en el reductor y una
   * copia menos que se pueda quedar vieja.
   */
  /** Los colonos, en el orden en que se sentaron. Vacío mientras se reúne la mesa. */
  colonos: Colono[];

  /** El delta. Se reparte una vez, al empezar, y no cambia. */
  islas: Isla[];

  /** A quién le toca: índice dentro de `colonos`. */
  turno: number;

  /**
   * POR QUÉ PASO VA LA SERPENTINA, de 0 a `2n − 1`.
   *
   * De aquí sale el turno mientras se coloca, y el orden es 1,2,…,n y luego
   * n,…,2,1. Está calculado en `deQuienEsElPaso` y no repartido por el fichero:
   * la serpentina escrita en dos sitios es la serpentina que se desincroniza.
   */
  paso: number;

  /** Se ha fundado la choza del paso y falta su vereda. Ver `deQuienEsElPaso`. */
  faltaVereda: boolean;

  /** La última choza fundada, para saber a qué veredas puede pegarse la inicial. */
  ultimaChoza: LlaveDeVertice | null;

  /** ¿Ya se ha tirado en este turno? Sin tirar no se alza ni se trueca. */
  tirado: boolean;

  /**
   * EL MAZO, BARAJADO UNA VEZ AL EMPEZAR. Secreto entero.
   *
   * ═══ POR QUÉ UN MAZO Y NO UN SORTEO POR COMPRA ═══
   *
   * Sortear la carta al comprarla parece lo mismo y no lo es, por dos razones que
   * el §1.3 del diseño llama irreversibles:
   *
   *   · UN MAZO SE PUEDE CONTAR. Quedan tres guardias, ya no puede salir un
   *     título: eso es información legítima del juego y parte de lo que se decide
   *     al comprar tarde. Con un sorteo por compra no hay nada que contar.
   *   · Y SOBRE TODO: un sorteo por compra depende del ORDEN EN QUE LLEGAN LAS
   *     PETICIONES. Dos servidores con el mismo diario darían partidas distintas,
   *     `reejecutarEn` dejaría de valer y con él la comprobación que sostiene el
   *     motor entero. Barajado una vez, la carta que sale es función del estado y
   *     de nada más.
   *
   * Se roba por delante, que es «la de arriba». Y cuando se acaba NO SE REBARAJA:
   * un mazo que vuelve a empezar deja de poder contarse.
   */
  mazo: Carta[];

  /**
   * CUÁNTOS TURNOS SE HAN ABIERTO desde que la partida empezó a jugarse.
   *
   * Sólo sube, nunca vuelve a cero, y por eso sirve de sello de compra: una carta
   * comprada se juega cuando `turnosAbiertos` haya pasado del número que lleva
   * dentro. El índice `turno` no serviría —vuelve a cero cada ronda— y contar
   * rondas tampoco: con dos colonos, la ronda siguiente es el turno siguiente sólo
   * la mitad de las veces.
   */
  turnosAbiertos: number;

  /** ¿Se ha jugado ya una carta en este turno? Una por turno, y los títulos no cuentan. */
  cartaJugada: boolean;

  /**
   * CUÁNTAS VEREDAS GRATIS QUEDAN POR ALZAR. Público.
   *
   * ═══ ES EL MISMO MECANISMO QUE `faltaVereda`, Y ESO ES TODO EL TRUCO ═══
   *
   * Las Dos Veredas no puede resolverse dentro de un solo movimiento con dos
   * aristas en la carga: la segunda vereda puede salir de la primera, así que
   * ofrecer los pares legales de golpe obligaría a razonar sobre un tablero que
   * todavía no existe. La colocación inicial ya tenía ese problema —choza y luego
   * su vereda— y lo resolvió encadenando dos movimientos con un campo en el estado.
   *
   * Aquí igual: jugar la carta pone un dos aquí, y a partir de ese momento
   * `opciones()` no ofrece otra cosa que veredas y `trazar` no las cobra. Cada una
   * baja el contador, y el tablero de la segunda es el que dejó la primera.
   *
   * Se apaga solo si no queda ni un sitio legal —una carta no puede dejar la mesa
   * atascada— y al pasar el turno.
   */
  veredasGratis: number;

  /** La última suma de los dos dados. Cero antes de la primera tirada. */
  ultimaTirada: number;

  /** Los trueques, del más viejo al más nuevo. Ver `TRATOS_QUE_SE_RECUERDAN`. */
  tratos: Trato[];

  /** El número de serie de la próxima ficha. Ver `Ficha`. */
  siguienteFicha: number;

  /** El número de serie del próximo trueque. Ver `Trato.id`. */
  siguienteTrato: number;

  /** El premio derivado. Se recalcula solo; ver `recalcularElVado`. */
  vado: Vado;

  /** El otro premio derivado. Misma regla, otra cuenta; ver `recalcularLaGuardia`. */
  guardia: Guardia;

  /**
   * EL AZAR. Secreto entero: con la semilla y el acumulador se calculan todas
   * las tiradas que quedan. Sale de la partida en la proyección y no vuelve.
   */
  azar: Azar;

  /** Quién ganó. Vacío hasta que termina. */
  ganadores: AsientoId[];
}

/**
 * Una mesa recién puesta, sin delta.
 *
 * No la llama el servidor: `mesas.ts` es genérico y no conoce este juego, así
 * que abre la mesa con `estado: undefined` y el reductor construye lo suyo en el
 * primer movimiento. La ventaja no es la comodidad: la semilla y los asientos con
 * los que se reparte el delta quedan DENTRO del diario, así que reejecutar la
 * partida reparte exactamente las mismas islas.
 */
export function partidaNueva(): EstadoDeRiberas {
  return {
    momento: 'reuniendo',
    colonos: [],
    islas: [],
    turno: 0,
    paso: 0,
    faltaVereda: false,
    ultimaChoza: null,
    tirado: false,
    mazo: [],
    turnosAbiertos: 0,
    cartaJugada: false,
    veredasGratis: 0,
    ultimaTirada: 0,
    tratos: [],
    siguienteFicha: 1,
    siguienteTrato: 1,
    vado: { de: null, largo: 0 },
    guardia: { de: null, cuantas: 0 },
    azar: sembrar(0),
    ganadores: [],
  };
}

/**
 * UNA PARTIDA GUARDADA ANTES DEL MAZO TIENE QUE PODER ABRIRSE.
 *
 * ═══ POR QUÉ ESTO NO ES UNA CORTESÍA ═══
 *
 * Las mesas de Riberas se guardan en disco —`MESAS_DIR`, y en el despliegue eso es
 * un disco persistente— y una partida de las largas dura días. Cuando el mazo entró,
 * el estado creció con seis campos, y una mesa escrita el día anterior no los tiene:
 * al proyectarla, `estado.guardia.de` reventaba con «Cannot read properties of
 * undefined». Medido sobre las seis mesas que había guardadas: diecisiete vistas
 * rotas de diecisiete.
 *
 * Y el fallo no se lee como lo que es. Quien vuelve a su partida no ve «esta versión
 * no sabe abrir tu mesa»: ve que la Sala no carga. La partida existe entera en el
 * disco y es inalcanzable.
 *
 * ═══ POR QUÉ AQUÍ Y NO EN QUIEN LEE EL FICHERO ═══
 *
 * Porque el que lee el fichero —`mesas.ts`— es núcleo sellado y NO SABE A QUÉ SE
 * JUEGA: no puede conocer los campos de Riberas sin dejar de ser agnóstico, que es
 * la única propiedad que ese fichero existe para tener. El juego es quien sabe qué
 * le falta a un estado suyo, así que el juego es quien lo rellena, en las dos puertas
 * por las que entra un estado: el reductor y la proyección.
 *
 * Rellena con lo que habría habido si el mazo hubiera existido desde el principio y
 * nadie lo hubiera tocado: mazo vacío —no se puede comprar, que es más honrado que
 * repartir cartas a mitad de partida—, sin cartas en ninguna mano, sin guardias y sin
 * premio. La partida sigue exactamente donde estaba.
 *
 * NO devuelve un objeto nuevo si no falta nada, y eso importa: media docena de
 * comprobaciones de este juego comparan estados POR IDENTIDAD para saber que un
 * movimiento no cambió nada.
 */
export function comoSiSiempreHubieraHabidoMazo(estado: EstadoDeRiberas): EstadoDeRiberas {
  const faltaEnLaMesa =
    estado.mazo === undefined ||
    estado.guardia === undefined ||
    estado.turnosAbiertos === undefined ||
    estado.cartaJugada === undefined ||
    estado.veredasGratis === undefined;
  const faltaEnAlguien = estado.colonos.some(
    (c) => c.mano === undefined || c.guardias === undefined || c.titulos === undefined,
  );
  if (!faltaEnLaMesa && !faltaEnAlguien) return estado;

  return {
    ...estado,
    mazo: estado.mazo ?? [],
    turnosAbiertos: estado.turnosAbiertos ?? 0,
    cartaJugada: estado.cartaJugada ?? false,
    veredasGratis: estado.veredasGratis ?? 0,
    guardia: estado.guardia ?? { de: null, cuantas: 0 },
    colonos: faltaEnAlguien
      ? estado.colonos.map((c) => ({
          ...c,
          mano: c.mano ?? [],
          guardias: c.guardias ?? 0,
          titulos: c.titulos ?? [],
        }))
      : estado.colonos,
  };
}

// ---------------------------------------------------------------------------
// EL REDUCTOR
// ---------------------------------------------------------------------------

/**
 * LAS REGLAS. Puro, sin fechas, sin azar del sistema y sin excepciones.
 *
 * ═══ EL PORTILLO DEL §5 bis, QUE ES LA PIEZA NUEVA DE ESTA FASE ═══
 *
 * Antes de mirar de qué movimiento se trata, el reductor se pregunta si ese
 * movimiento estaba entre los que `opciones()` le habría ofrecido a quien lo
 * manda, CON LO QUE ESA PERSONA SABE. Si no estaba, se rechaza devolviendo el
 * mismo objeto de estado — que es lo que la mesa cuenta como un movimiento que
 * no cambió nada.
 *
 * Y después SIGUE VALIDANDO. Las dos mitades hacen falta y son dos preguntas
 * distintas que parecen una:
 *
 *     «QUÉ TE PUEDO OFRECER A TI, CON LO QUE TÚ SABES» — eso es `opciones()`.
 *     «QUÉ ES LEGAL, CON TODO LO QUE HAY»              — eso es lo de abajo.
 *
 * El bicondicional —«legal SI Y SÓLO SI se ofreció»— es falso en cuanto hay
 * información oculta a quien actúa, y el contraejemplo vive en este juego:
 * ACEPTAR UN TRUEQUE EXIGE QUE EL OFERENTE TENGA LA MERCANCÍA, Y SU ALMACÉN NO
 * ESTÁ EN LA VISTA DEL ACEPTANTE. Con «si y sólo si» habría que elegir entre
 * ofrecer un trueque que revienta al aceptarse o filtrar el almacén ajeno para
 * poder ofrecerlo bien, y las dos salidas son peores que la regla.
 *
 * ═══ POR QUÉ EL TIC NO PASA POR EL PORTILLO ═══
 *
 * Porque el tic no lo manda nadie: viene con `quien: null` y lo mete quien
 * hospeda, al vencer el plazo de pared que vive en la mesa. `opciones()` contesta
 * a «qué puede hacer ESTE asiento», y el reloj no es un asiento. Que un
 * dispositivo no pueda colar un `arcade:tic` lo garantiza `mesas.ts`, que
 * rechaza el prefijo reservado en la única puerta por la que entra un movimiento
 * de fuera — y lo garantiza AHÍ y no aquí a propósito, para que un juego que se
 * olvide de mirarlo no reabra el agujero.
 *
 * ═══ LAS TRES REGLAS DE SIEMPRE ═══
 *
 *  1. NO MUTA. Cada rama devuelve un objeto nuevo, o EL MISMO cuando no pasa
 *     nada — que importa igual: quien pinta compara por identidad.
 *  2. NO MIRA EL RELOJ NI EL AZAR DEL SISTEMA.
 *  3. SIEMPRE DEVUELVE UN ESTADO. Nunca una excepción: quien hospeda no tiene
 *     forma de distinguir «lo rechacé» de «reventé».
 */
export function avanzarRiberas(
  estado: EstadoDeRiberas | undefined,
  movimiento: Movimiento,
  ctx: ContextoMovimiento,
): EstadoDeRiberas | Rechazo<EstadoDeRiberas> {
  const actual = comoSiSiempreHubieraHabidoMazo(estado ?? partidaNueva());

  if (esTic(movimiento)) return venceElPlazo(actual);

  /*
   * EL PORTILLO. Se proyecta para quien manda —o sea, se le tapa lo que no puede
   * ver— y se le pregunta al propio juego qué le habría ofrecido.
   *
   * Se usa la proyección SIN el tablero porque el tablero es un dibujo de la
   * vista y de las propias opciones: se calcula DESPUÉS y no puede alimentarlas.
   * Meterlo aquí sería pintar un tablero entero en cada movimiento para tirarlo.
   *
   * ═══ SE PROYECTA CON `NADIE_SENTADO`, Y ESO NO ES UN DESCUIDO ═══
   *
   * Los nombres de la mesa no están —ni pueden estar— en el camino del reductor:
   * si estuvieran, la misma partida reejecutada después de que alguien se
   * renombrara daría otro estado. Aquí no hacen ninguna falta, porque el portillo
   * compara `tipo` y `carga`, que es lo que `estaOfrecido` mira; los nombres sólo
   * viven en `rotulo` y `ayuda`, que nadie compara. La vista que se calcula aquí
   * enseña identificadores y muere en esta línea.
   */
  const vista = loQueSeVe(actual, ctx.quien, NADIE_SENTADO);
  if (!estaOfrecido(opcionesDeRiberas(vista, ctx.quien), movimiento)) {
    /*
     * ═══ Y AQUÍ SE PAGA LA FACTURA DEL «SÓLO SI» (fase 5) ═══
     *
     * Antes esto era un `return actual` mudo, y con la regla del espejo el rechazo
     * silencioso es el CAMINO NORMAL: el móvil sólo podía decir «la mesa está
     * igual que estaba», deduciéndolo de que la revisión no subió.
     *
     * El motivo es deliberadamente CORTO Y CIEGO. No dice qué le falta a quien
     * mueve —eso obligaría a mirar cosas que quizá no estén en su vista, y sería
     * una fuga por la puerta de atrás— sino sólo que, con lo que él ve, eso ya no
     * se podía hacer. El caso real que produce esta línea es la carrera de dos
     * personas sobre el mismo vértice, o un trueque que caducó entre que se pintó
     * el botón y se pulsó.
     *
     * El estado que se devuelve es EL MISMO objeto, que es lo que la mesa cuenta
     * como movimiento que no cambió nada.
     */
    return rechazar(
      actual,
      'Eso ya no se puede hacer: la mesa cambió entre que se pintó el botón y lo pulsaste.',
    );
  }

  switch (movimiento.tipo) {
    case EMPEZAR:
      return repartirElDelta(actual, ctx);
    case FUNDAR:
      return fundar(actual, ctx, verticeDeLaCarga(movimiento.carga));
    case ALZAR:
      return alzar(actual, ctx, piezaDeLaCarga(movimiento.carga), dondeDeLaCarga(movimiento.carga));
    case TIRAR:
      return tirarLosDados(actual, ctx);
    case OFRECER:
      return ofrecer(actual, ctx, movimiento.carga);
    case ACEPTAR:
      return contestar(actual, ctx, tratoDeLaCarga(movimiento.carga), true);
    case RECHAZAR:
      return contestar(actual, ctx, tratoDeLaCarga(movimiento.carga), false);
    case PASAR:
      return pasarTurno(actual, ctx);
    case COMPRAR:
      return comprarUnaCarta(actual, ctx);
    case GUARDIA:
      return jugarLaGuardia(
        actual,
        ctx,
        campoDeTexto(movimiento.carga, 'carta'),
        campoDeTexto(movimiento.carga, 'a'),
      );
    case ANO_BUENO:
      return jugarElAnoBueno(
        actual,
        ctx,
        campoDeTexto(movimiento.carga, 'carta'),
        bienesDeLaCarga(movimiento.carga, 'bienes', BIENES_DEL_ANO_BUENO),
      );
    case ACAPARAMIENTO:
      return jugarElAcaparamiento(
        actual,
        ctx,
        campoDeTexto(movimiento.carga, 'carta'),
        bienDeLaCarga(movimiento.carga, 'bien'),
      );
    case DOS_VEREDAS:
      return jugarLasDosVeredas(actual, ctx, campoDeTexto(movimiento.carga, 'carta'));
    case REVELAR:
      return revelarUnTitulo(actual, ctx, campoDeTexto(movimiento.carga, 'carta'));
    default:
      /*
       * Un movimiento que este juego no conoce se ignora y devuelve el estado. No
       * es dejadez: la plataforma puede meter movimientos suyos que este juego no
       * reconozca, y un juego no se puede caer por no conocerlos. En la práctica
       * el portillo ya lo habrá rechazado antes de llegar aquí.
       */
      return actual;
  }
}

/**
 * ¿ESTABA ESTE MOVIMIENTO ENTRE LOS OFRECIDOS?
 *
 * Se compara la forma canónica de `{ tipo, carga }` contra la de cada opción, y
 * no campo a campo: la carga es `unknown` por contrato y compararla a mano
 * obligaría a saber la forma de cada movimiento en dos sitios. `canonico.ts`
 * ordena las claves, así que `{a:1,b:2}` y `{b:2,a:1}` son el mismo movimiento —
 * que es lo correcto: dos móviles que serializan en distinto orden mandan lo
 * mismo.
 *
 * Y va envuelto en un `try` porque la carga viene de un dispositivo y puede
 * traer cualquier cosa: `canonico` RECHAZA lo no serializable en vez de
 * tragárselo, y aquí ese rechazo significa exactamente «esto no es ninguna de
 * las opciones», que es la respuesta correcta.
 */
function estaOfrecido(opciones: readonly Opcion[], movimiento: Movimiento): boolean {
  let firma = '';
  try {
    firma = canonico({ tipo: movimiento.tipo, carga: movimiento.carga ?? null });
  } catch {
    return false;
  }
  for (const o of opciones) {
    let suya = '';
    try {
      suya = canonico({ tipo: o.tipo, carga: o.carga ?? null });
    } catch {
      continue;
    }
    if (suya === firma) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Leer la carga, que llega SIN VALIDAR
// ---------------------------------------------------------------------------

/*
 * El árbitro no mira lo que viene dentro del movimiento —no puede, el estado es
 * opaco y no sabe qué es un vértice—. Esa comprobación no desaparece: baja aquí,
 * que es el único sitio que sabe qué es real en este juego. El portillo del §5
 * bis ya rechaza casi todo lo mal formado, porque una carga inventada no coincide
 * con ninguna opción; estas funciones existen igual, porque quien las lea dentro
 * de un año no debe tener que demostrar el teorema para saber que están a salvo.
 */

function campoDeTexto(carga: unknown, campo: string): string | null {
  if (typeof carga !== 'object' || carga === null) return null;
  const posible = (carga as Record<string, unknown>)[campo];
  return typeof posible === 'string' ? posible : null;
}

function verticeDeLaCarga(carga: unknown): LlaveDeVertice | null {
  return campoDeTexto(carga, 'vertice');
}

function dondeDeLaCarga(carga: unknown): string | null {
  return campoDeTexto(carga, 'donde');
}

function tratoDeLaCarga(carga: unknown): string | null {
  return campoDeTexto(carga, 'trato');
}

function piezaDeLaCarga(carga: unknown): Pieza | null {
  const que = campoDeTexto(carga, 'que');
  if (que === 'vereda' || que === 'choza' || que === 'torre') return que;
  return null;
}

/**
 * Lee una lista de bienes de la carga, o `null` si ahí no venía una.
 *
 * Exige EXACTAMENTE `cuantos`, y quien llama dice cuántos: `BIENES_POR_LADO_DEL_TRUEQUE`
 * para un lado de un trueque —hoy uno, y ver esa constante para por qué un trueque
 * de este juego es uno por uno— y `BIENES_DEL_ANO_BUENO` para la carta.
 *
 * El número entra por parámetro y no se mira aquí dentro porque esta función no
 * sabe de qué regla la están llamando, y no debe: en el momento en que decidiera
 * ella el número, las dos reglas compartirían un valor que nadie pidió que fuera
 * el mismo.
 */
function bienesDeLaCarga(carga: unknown, campo: string, cuantos: number): Bien[] | null {
  if (typeof carga !== 'object' || carga === null) return null;
  const posible = (carga as Record<string, unknown>)[campo];
  if (!Array.isArray(posible)) return null;
  if (posible.length !== cuantos) return null;
  const bienes: Bien[] = [];
  for (const uno of posible) {
    if (typeof uno !== 'string') return null;
    if (!(BIENES as readonly string[]).includes(uno)) return null;
    bienes.push(uno as Bien);
  }
  return bienes;
}

/** Un bien suelto de la carga, o `null` si ahí no venía uno de los cinco. */
function bienDeLaCarga(carga: unknown, campo: string): Bien | null {
  const posible = campoDeTexto(carga, campo);
  if (posible === null) return null;
  return (BIENES as readonly string[]).includes(posible) ? (posible as Bien) : null;
}

// ---------------------------------------------------------------------------
// EMPEZAR: se reparte el delta
// ---------------------------------------------------------------------------

/**
 * REPARTE LAS ISLAS Y ABRE LA SERPENTINA.
 *
 * Quién se sienta lo dice `ctx.asientos` y no este fichero: repartir sitios es
 * autoridad. El reductor los LEE, que es lo que hace falta para dar color y
 * fijar el orden — y ese orden, el de llegada, es el de la serpentina.
 *
 * El azar nace sin sembrar en `partidaNueva()` y se siembra AQUÍ con `ctx.azar`,
 * que lo elige el servidor. Si lo eligiera el dispositivo, un cliente manipulado
 * probaría semillas hasta dar con el delta que le conviene.
 *
 * ═══ EL AFORO SE RECHAZA CON MOTIVO, Y ES LA OTRA MITAD DEL «SÓLO SI» ═══
 *
 * `opcionesDeReunion()` ofrece «Repartir el delta» a cualquiera que tenga
 * asiento sin mirar el aforo. Ofrecer de más es lo que el «sólo si» permite
 * —pero sólo se sostiene si el reductor, al rechazar lo que se ofreció de más,
 * DICE POR QUÉ. Esa mitad faltaba.
 *
 * (Y una precisión sobre la cabecera de `opcionesDeReunion`, que dice que el
 * aforo «no está en la vista y no puede estarlo»: la segunda mitad se quedó
 * vieja. Desde la fase 5 la proyección recibe un tercer parámetro con los
 * sentados —`proyectarRiberas(estado, quien, sentados)`— así que HOY se podría
 * publicar el recuento y dejar de ofrecer el botón hasta que se llene la mesa.
 * No se hace aquí porque cambiar qué se ofrece es cambiar el juego y esto es un
 * arreglo de lo que se calla, no de lo que se enseña; queda apuntado.)
 *
 * Devolver `estado` a secas no era descuido: antes de la fase 5 no había otra
 * forma. Ya la hay, y lo que se medía contra el servidor vivo era esto: quien
 * abre una mesa y pulsa el único botón que ve —estando solo, que es como se
 * abre toda mesa— recibe un 200, la revisión no se mueve y `motivo` llega
 * `null`. Un botón que no hace nada y nadie que lo explique, en el primer
 * segundo de la primera partida de cualquiera.
 *
 * El motivo no filtra nada: cuánta gente hay sentada viaja en
 * `VistaDeMesa.asientos` y la ven los seis. Sólo pone en palabras lo que ya
 * está en la pantalla de quien pulsó.
 *
 * Y el tope de arriba se rechaza igual aunque hoy no se alcance —la mesa no deja
 * sentarse por encima del máximo—, porque una pareja de guardas donde una
 * explica y la otra calla se lee como un olvido, y el día que el aforo cambie de
 * sitio la muda sería la que deja a alguien mirando un botón muerto.
 */
function repartirElDelta(
  estado: EstadoDeRiberas,
  ctx: ContextoMovimiento,
): EstadoDeRiberas | Rechazo<EstadoDeRiberas> {
  if (estado.momento !== 'reuniendo') return estado;
  const cuantos = ctx.asientos.length;
  if (cuantos < MANIFIESTO_RIBERAS.jugadores.minimo) {
    return rechazar(
      estado,
      `Todavía no sois bastantes: hacen falta al menos ${MANIFIESTO_RIBERAS.jugadores.minimo} ` +
        'sentados para repartir el delta.',
    );
  }
  if (cuantos > MANIFIESTO_RIBERAS.jugadores.maximo) {
    return rechazar(
      estado,
      `En este delta caben ${MANIFIESTO_RIBERAS.jugadores.maximo} como mucho, y sois ${cuantos}.`,
    );
  }

  const hexes = mallaDeRadio(RADIO_DEL_DELTA);

  const terrenosRevueltos = barajar(sembrar(ctx.azar), BOLSA_DE_ISLAS);
  const numerosRevueltos = barajar(terrenosRevueltos.azar, NUMEROS_DE_LAS_ISLAS);

  const islas: Isla[] = [];
  let siguienteNumero = 0;
  for (let i = 0; i < hexes.length; i++) {
    const terreno = terrenosRevueltos.valor[i] as Terreno;
    /*
     * La duna no lleva número, y por eso el contador de números va aparte del
     * índice de la isla. Con un solo índice, la duna se comería un número y la
     * última isla se quedaría sin — con la mitad de las semillas dando un
     * tablero al que le falta una producción, y sin que nada fallara.
     */
    const numero = RINDE[terreno] === null ? 0 : (numerosRevueltos.valor[siguienteNumero++] as number);
    islas.push({ hex: hexes[i] as Hex, terreno, numero });
  }

  /*
   * ═══ EL MAZO SE BARAJA AQUÍ, UNA VEZ, Y CON EL AZAR DE LA MESA ═══
   *
   * En el mismo sitio y con el mismo azar que las islas y los números, encadenado
   * detrás: `barajar` devuelve el azar ya avanzado y se le pasa al siguiente. Con
   * eso, todo lo que la partida sortea sale de la semilla que eligió el servidor
   * y de nada más — que es lo que hace que reejecutar el diario reparta las mismas
   * islas Y reparta las mismas cartas.
   *
   * El número de serie se pone DESPUÉS de barajar y en el orden del mazo. Da igual
   * a efectos de juego —el mazo es secreto entero— y hace que `c1` sea la primera
   * carta que se compra, que es lo único que ayuda al depurar.
   */
  const mazoRevuelto = barajar(numerosRevueltos.azar, BOLSA_DE_CARTAS);
  const mazo: Carta[] = mazoRevuelto.valor.map((clase, i) => `c${i + 1}:${clase}`);

  const colonos: Colono[] = [];
  for (let i = 0; i < cuantos; i++) {
    colonos.push({
      asiento: ctx.asientos[i] as AsientoId,
      color: COLORES_DE_COLONO[i % COLORES_DE_COLONO.length] as string,
      almacen: [],
      chozas: [],
      torres: [],
      veredas: [],
      mano: [],
      guardias: 0,
      titulos: [],
    });
  }

  return {
    ...estado,
    momento: 'colocando',
    colonos,
    islas,
    mazo,
    turno: 0,
    paso: 0,
    faltaVereda: false,
    ultimaChoza: null,
    tirado: false,
    turnosAbiertos: 0,
    cartaJugada: false,
    veredasGratis: 0,
    ultimaTirada: 0,
    azar: mazoRevuelto.azar,
  };
}

/**
 * Los seis colores de las piezas. Sólo pintado.
 *
 * Se eligen aquí y no en la app porque el tablero declarado lleva los colores
 * dentro: el mueble recorre listas y pinta lo que le dan, y no sabe qué es un
 * colono. Ver `shared/mecanicas/tablero-declarado.ts`.
 */
const COLORES_DE_COLONO: readonly string[] = [
  '#e0533d',
  '#3d8be0',
  '#e0b83d',
  '#4fbf7a',
  '#b06fd6',
  '#e08a3d',
];

// ---------------------------------------------------------------------------
// LA SERPENTINA
// ---------------------------------------------------------------------------

/**
 * DE QUIÉN ES EL PASO `p` DE LA SERPENTINA, con `n` colonos.
 *
 * 1,2,…,n y luego n,…,2,1. Escrito UNA vez y en una línea, que es lo que hace
 * que no se pueda desincronizar de sí misma. Fuera del rango devuelve −1, que es
 * lo que ve quien pregunta por un paso que ya no existe.
 */
export function deQuienEsElPaso(paso: number, cuantos: number): number {
  if (cuantos <= 0) return -1;
  if (paso < 0 || paso >= cuantos * 2) return -1;
  return paso < cuantos ? paso : cuantos * 2 - 1 - paso;
}

/** A quién le toca AHORA, sea colocando o jugando. −1 si a nadie. */
function turnoDe(estado: EstadoDeRiberas): number {
  if (estado.momento === 'colocando') return deQuienEsElPaso(estado.paso, estado.colonos.length);
  if (estado.momento === 'jugando') return estado.turno;
  return -1;
}

// ---------------------------------------------------------------------------
// FUNDAR una choza
// ---------------------------------------------------------------------------

/**
 * FUNDA UNA CHOZA, en la colocación o pagándola.
 *
 * La regla de distancia es la que da sentido a la canonicalización: «aquí no,
 * que hay algo al lado». Se escribe comparando CADENAS —las llaves canónicas de
 * los vértices vecinos— y eso sólo funciona porque el mismo punto, mirado desde
 * cualquiera de sus tres islas, produce siempre la misma cadena. Si cada isla
 * nombrara sus esquinas a su manera, esta comprobación diría que está libre un
 * sitio ocupado, y no se descubriría hasta ver dos chozas pegadas en el tablero.
 */
function fundar(
  estado: EstadoDeRiberas,
  ctx: ContextoMovimiento,
  vertice: LlaveDeVertice | null,
): EstadoDeRiberas {
  if (vertice === null) return estado;
  const yo = indiceDelAsiento(estado, ctx.quien);
  if (yo < 0 || yo !== turnoDe(estado)) return estado;
  /*
   * Las dos guardas de FASE, escritas aquí aunque el portillo ya las cubra. El
   * portillo protege la puerta de los dispositivos; esta función la llama además
   * `colocarPorElAusente` cuando vence el plazo, y ahí no hay portillo que valga.
   * Una regla que sólo vive en `opciones()` es una regla que se salta el reloj.
   */
  if (estado.momento === 'colocando' && estado.faltaVereda) return estado;
  if (estado.momento === 'jugando' && !estado.tirado) return estado;
  if (estado.momento !== 'colocando' && estado.momento !== 'jugando') return estado;
  if (!sePuedeFundarEn(estado, yo, vertice)) return estado;

  const colocando = estado.momento === 'colocando';
  const mio = estado.colonos[yo] as Colono;

  let almacen = mio.almacen;
  let siguienteFicha = estado.siguienteFicha;
  if (!colocando) {
    const cobrado = cobrar(almacen, COSTES.choza);
    if (cobrado === null) return estado;
    almacen = cobrado;
  } else if (estado.paso >= estado.colonos.length) {
    /*
     * LA SEGUNDA CHOZA COBRA LA PRIMERA COSECHA, y la segunda y no la primera a
     * propósito: en la ida, quien coloca antes elige mejor sitio; en la vuelta,
     * quien colocó el último elige antes y además cobra por lo que rodea a esa
     * choza. Es lo que compensa la ventaja de abrir, y es una decisión de este
     * juego y no un detalle heredado de nadie.
     */
    const cosecha = loQueRodea(estado, vertice, 1, siguienteFicha);
    almacen = [...almacen, ...cosecha.fichas];
    siguienteFicha = cosecha.siguiente;
  }

  const colonos = estado.colonos.map((c, i) =>
    i !== yo ? c : { ...c, almacen, chozas: [...c.chozas, vertice] },
  );

  const conLaChoza: EstadoDeRiberas = {
    ...estado,
    colonos,
    siguienteFicha,
    ultimaChoza: vertice,
    faltaVereda: colocando,
  };

  /*
   * EL PREMIO SE RECALCULA AQUÍ, y ésta es la mitad que sorprende: una choza NO
   * alarga ninguna vereda, pero una choza AJENA plantada en medio de una cadena
   * la parte en dos. Por eso el recálculo cuelga de fundar y no sólo de trazar.
   */
  return puedeHaberGanado(conElVado(conLaChoza));
}

/** ¿Se puede fundar aquí? Vale para la colocación y para el resto de la partida. */
function sePuedeFundarEn(estado: EstadoDeRiberas, quien: number, vertice: LlaveDeVertice): boolean {
  const mio = estado.colonos[quien];
  if (mio === undefined) return false;
  if (mio.chozas.length + mio.torres.length >= TOPE_DE_PIEZAS.choza + TOPE_DE_PIEZAS.torre) {
    return false;
  }
  if (!verticesDelDelta(estado).includes(vertice)) return false;
  if (estaOcupado(estado, vertice)) return false;
  for (const vecino of verticesVecinos(vertice)) {
    if (estaOcupado(estado, vecino)) return false;
  }
  /*
   * Fuera de la colocación, una choza tiene que colgar de una vereda propia. Sin
   * esta regla el tablero se coloniza a saltos y las veredas no sirven para nada
   * — y entonces el Vado Largo dejaría de ser un premio y pasaría a ser una
   * curiosidad que nadie persigue.
   */
  if (estado.momento === 'colocando') return true;
  for (const arista of aristasDeVertice(vertice)) {
    if (mio.veredas.includes(arista)) return true;
  }
  return false;
}

/** ¿Hay una choza o una torre de cualquiera en este vértice? */
function estaOcupado(estado: EstadoDeRiberas, vertice: LlaveDeVertice): boolean {
  for (const c of estado.colonos) {
    if (c.chozas.includes(vertice) || c.torres.includes(vertice)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// ALZAR: veredas y torres
// ---------------------------------------------------------------------------

/** Alza una vereda o sube una choza a torre. La choza tiene su propio movimiento. */
function alzar(
  estado: EstadoDeRiberas,
  ctx: ContextoMovimiento,
  pieza: Pieza | null,
  donde: string | null,
): EstadoDeRiberas {
  if (pieza === null || donde === null) return estado;
  const yo = indiceDelAsiento(estado, ctx.quien);
  if (yo < 0 || yo !== turnoDe(estado)) return estado;
  if (pieza === 'choza') return estado;
  if (pieza === 'vereda') return trazar(estado, yo, donde);
  return levantarTorre(estado, yo, donde);
}

/**
 * TRAZA UNA VEREDA.
 *
 * Durante la colocación es GRATIS y tiene que pegarse a la choza recién fundada.
 * Después se paga y tiene que pegarse a algo propio —una vereda o una choza— por
 * un vértice que no tenga pieza de otro encima: se puede llegar a la puerta del
 * vecino, no salir de ella. Ver `pegaConLoMio`.
 *
 * ═══ Y HAY UN TERCER CASO, QUE ES LAS DOS VEREDAS ═══
 *
 * Con `veredasGratis` por encima de cero la vereda es legal donde lo sería
 * pagándola —las mismas reglas de dónde, exactamente las mismas— y no se cobra.
 * Lo que cambia es SÓLO el precio, y por eso el caso vive aquí dentro y no en una
 * función paralela: una segunda función que colocara veredas sería un segundo juez
 * sobre dónde se puede, y dos jueces que casi siempre coinciden es la peor clase
 * de fallo. Ver `EstadoDeRiberas.veredasGratis`.
 */
function trazar(estado: EstadoDeRiberas, yo: number, arista: LlaveDeArista): EstadoDeRiberas {
  const mio = estado.colonos[yo];
  if (mio === undefined) return estado;
  if (mio.veredas.length >= TOPE_DE_PIEZAS.vereda) return estado;
  if (!aristasDelDelta(estado).includes(arista)) return estado;
  if (aristaOcupada(estado, arista)) return estado;

  const colocando = estado.momento === 'colocando';
  if (colocando) {
    if (!estado.faltaVereda) return estado;
    if (estado.ultimaChoza === null) return estado;
    if (!aristaTocaVertice(arista, estado.ultimaChoza)) return estado;
  } else {
    if (estado.momento !== 'jugando' || !estado.tirado) return estado;
    if (!pegaConLoMio(estado, yo, arista)) return estado;
  }

  const gratis = !colocando && estado.veredasGratis > 0;
  let almacen = mio.almacen;
  if (!colocando && !gratis) {
    const cobrado = cobrar(almacen, COSTES.vereda);
    if (cobrado === null) return estado;
    almacen = cobrado;
  }

  const colonos = estado.colonos.map((c, i) =>
    i !== yo ? c : { ...c, almacen, veredas: [...c.veredas, arista] },
  );

  const puesta: EstadoDeRiberas = { ...estado, colonos };
  /*
   * El contador baja aquí y se APAGA si ya no queda sitio: la segunda vereda de la
   * carta puede haberse quedado sin dónde ir justo porque la primera se comió el
   * último hueco, y un contador que se quedara en uno dejaría a quien la jugó sin
   * más opción que ninguna. Una mesa que no avanza es lo que esto existe para no
   * dejar pasar.
   */
  const quedan = gratis ? estado.veredasGratis - 1 : estado.veredasGratis;
  const conLaVereda = conElVado({
    ...puesta,
    veredasGratis: quedan > 0 && hayDondeTrazar(puesta, yo) ? quedan : 0,
  });
  return puedeHaberGanado(colocando ? avanzarLaSerpentina(conLaVereda) : conLaVereda);
}

/**
 * ¿LE QUEDA A ESTE COLONO ALGÚN SITIO DONDE TRAZAR UNA VEREDA?
 *
 * Sin mirar el precio, que es justo lo que hace falta para Las Dos Veredas: la
 * pregunta es «¿hay dónde?», no «¿te llega?». Mira el tope de piezas porque un
 * colono con las doce puestas no tiene dónde poner la trece, y ésa es la otra
 * forma de que la carta se quede a medias.
 */
function hayDondeTrazar(estado: EstadoDeRiberas, yo: number): boolean {
  const mio = estado.colonos[yo];
  if (mio === undefined) return false;
  if (mio.veredas.length >= TOPE_DE_PIEZAS.vereda) return false;
  for (const arista of aristasDelDelta(estado)) {
    if (aristaOcupada(estado, arista)) continue;
    if (pegaConLoMio(estado, yo, arista)) return true;
  }
  return false;
}

/**
 * ¿ENGANCHA ESTA ARISTA CON ALGO MÍO POR UN VÉRTICE DEL QUE PUEDA SALIR?
 *
 * Una vereda mía puede LLEGAR al vértice donde otro colono tiene choza o torre,
 * pero no SALIR de él: la casa ajena corta el paso. Así que el extremo por el que
 * la arista nueva engancha con lo mío tiene que estar limpio de piezas ajenas; el
 * OTRO extremo puede ser lo que sea, y por eso llegar sigue siendo legal.
 *
 * ═══ LA MITAD QUE FALTABA, Y LO QUE COSTÓ QUE FALTARA ═══
 *
 * Esto preguntaba sólo «¿toca algo mío?». Con eso el juego dejaba trazar saliendo
 * del vértice de otro, cobraba la vereda y la pintaba pegada — y el premio, que sí
 * corta ahí, contaba la cadena rota. Miguel puso cinco veredas seguidas y el Vado
 * Largo le dijo tres, sin un mensaje que lo explicara: la pieza se paga, se ve, y
 * no sirve.
 *
 * El corte es `bloqueadosPara`, EL MISMO que usa el premio, y no una cuenta
 * parecida escrita al lado. Dos jueces que casi siempre coinciden es la peor clase
 * de fallo, y éste fue exactamente eso durante toda una partida.
 */
function pegaConLoMio(estado: EstadoDeRiberas, yo: number, arista: LlaveDeArista): boolean {
  const mio = estado.colonos[yo];
  if (mio === undefined) return false;
  const bloqueados = bloqueadosPara(estado.colonos, mio.asiento);
  for (const v of verticesDeArista(arista)) {
    if (bloqueados.includes(v)) continue;
    if (mio.chozas.includes(v) || mio.torres.includes(v)) return true;
    for (const otra of aristasDeVertice(v)) {
      if (mio.veredas.includes(otra)) return true;
    }
  }
  return false;
}

/** ¿Hay una vereda de cualquiera en esta arista? */
function aristaOcupada(estado: EstadoDeRiberas, arista: LlaveDeArista): boolean {
  for (const c of estado.colonos) {
    if (c.veredas.includes(arista)) return true;
  }
  return false;
}

/** Sube una choza propia a torre. La torre rinde el doble y vale dos puntos. */
function levantarTorre(
  estado: EstadoDeRiberas,
  yo: number,
  vertice: LlaveDeVertice,
): EstadoDeRiberas {
  if (estado.momento !== 'jugando' || !estado.tirado) return estado;
  const mio = estado.colonos[yo];
  if (mio === undefined) return estado;
  if (!mio.chozas.includes(vertice)) return estado;
  if (mio.torres.length >= TOPE_DE_PIEZAS.torre) return estado;

  const almacen = cobrar(mio.almacen, COSTES.torre);
  if (almacen === null) return estado;

  const colonos = estado.colonos.map((c, i) =>
    i !== yo
      ? c
      : {
          ...c,
          almacen,
          chozas: c.chozas.filter((v) => v !== vertice),
          torres: [...c.torres, vertice],
        },
  );
  return puedeHaberGanado({ ...estado, colonos });
}

/**
 * SE CIERRA UN PASO DE LA COLOCACIÓN.
 *
 * Al último paso le sigue la partida de verdad, con el turno en el primero que se
 * sentó. Que el primer turno sea del primero y no del último es otra decisión de
 * este juego: la vuelta de la serpentina ya compensó a quien colocó tarde con la
 * cosecha de su segunda choza.
 */
function avanzarLaSerpentina(estado: EstadoDeRiberas): EstadoDeRiberas {
  const ultimo = estado.colonos.length * 2 - 1;
  if (estado.paso >= ultimo) {
    return {
      ...estado,
      momento: 'jugando',
      paso: estado.paso + 1,
      faltaVereda: false,
      ultimaChoza: null,
      turno: 0,
      tirado: false,
      /* El primero de verdad. Ver `turnosAbiertos`: cuenta desde uno y sólo sube. */
      turnosAbiertos: 1,
      cartaJugada: false,
      veredasGratis: 0,
    };
  }
  return { ...estado, paso: estado.paso + 1, faltaVereda: false, ultimaChoza: null };
}

// ---------------------------------------------------------------------------
// LOS DADOS Y LA PRODUCCIÓN
// ---------------------------------------------------------------------------

/**
 * TIRA LOS DOS DADOS Y REPARTE.
 *
 * Dos tiradas de `enteroEntre` y no una de 2 a 12: la suma de dos dados no es
 * uniforme, y una tirada uniforme haría que el 2 y el 7 salieran lo mismo. Los
 * números de las islas están repartidos suponiendo la campana, así que un azar
 * uniforme cambiaría el juego entero sin cambiar una regla escrita.
 *
 * El azar avanza SIEMPRE que se tira, incluso en el estiaje, y por eso la rama
 * del siete no sale antes de gastar las dos tiradas: si el acumulador avanzara
 * un número distinto de veces según lo que saliera, dos partidas con los mismos
 * movimientos tendrían el azar en sitios distintos y la reejecución divergiría.
 */
function tirarLosDados(estado: EstadoDeRiberas, ctx: ContextoMovimiento): EstadoDeRiberas {
  if (estado.momento !== 'jugando') return estado;
  const yo = indiceDelAsiento(estado, ctx.quien);
  if (yo < 0 || yo !== estado.turno) return estado;
  if (estado.tirado) return estado;

  const uno = enteroEntre(estado.azar, 1, 6);
  const otro = enteroEntre(uno.azar, 1, 6);
  const suma = uno.valor + otro.valor;

  const conLaTirada: EstadoDeRiberas = {
    ...estado,
    azar: otro.azar,
    tirado: true,
    ultimaTirada: suma,
  };
  if (suma === ESTIAJE) return conLaTirada;

  return repartirLaCosecha(conLaTirada, suma);
}

/**
 * REPARTE LO QUE RINDEN LAS ISLAS CON ESE NÚMERO.
 *
 * Se recorre isla por isla y vértice por vértice en orden fijo —el de
 * `mallaDeRadio`, que sale ordenado, y el de `verticesDeHex`, que da la vuelta—
 * para que los números de serie de las fichas se repartan siempre igual. Si el
 * recorrido dependiera del orden de un objeto, dos reejecuciones de la misma
 * partida darían fichas con números distintos y el hash del estado no cuadraría.
 */
function repartirLaCosecha(estado: EstadoDeRiberas, suma: number): EstadoDeRiberas {
  const almacenes: Ficha[][] = estado.colonos.map((c) => [...c.almacen]);
  let siguiente = estado.siguienteFicha;
  let hubo = false;

  for (const isla of estado.islas) {
    if (isla.numero !== suma) continue;
    const bien = RINDE[isla.terreno];
    if (bien === null) continue;
    for (const vertice of verticesDeHex(isla.hex)) {
      for (let i = 0; i < estado.colonos.length; i++) {
        const c = estado.colonos[i] as Colono;
        const cuantas = c.torres.includes(vertice) ? 2 : c.chozas.includes(vertice) ? 1 : 0;
        for (let k = 0; k < cuantas; k++) {
          (almacenes[i] as Ficha[]).push(`b${siguiente++}:${bien}`);
          hubo = true;
        }
      }
    }
  }

  if (!hubo) return estado;
  const colonos = estado.colonos.map((c, i) => ({ ...c, almacen: almacenes[i] as Ficha[] }));
  return { ...estado, colonos, siguienteFicha: siguiente };
}

/**
 * LO QUE RODEA A UN VÉRTICE: una ficha por isla que rinda, para la cosecha de
 * la segunda choza.
 *
 * Las tres islas salen de la propia llave del vértice —es lo que ES un vértice—
 * y hay que filtrar las que no están en el delta: el vértice del borde se llama
 * igual mirándolo desde dentro que desde el mar que no está dibujado, y esa es
 * exactamente la propiedad que hace que la identidad no dependa del recorte.
 */
function loQueRodea(
  estado: EstadoDeRiberas,
  vertice: LlaveDeVertice,
  cuantasPorIsla: number,
  desde: number,
): { fichas: Ficha[]; siguiente: number } {
  const fichas: Ficha[] = [];
  let siguiente = desde;
  for (const hex of hexesDeVertice(vertice)) {
    const isla = islaEn(estado, hex);
    if (isla === null) continue;
    const bien = RINDE[isla.terreno];
    if (bien === null) continue;
    for (let k = 0; k < cuantasPorIsla; k++) fichas.push(`b${siguiente++}:${bien}`);
  }
  return { fichas, siguiente };
}

/** La isla que hay en ese hexágono, o `null` si ahí no hay delta. */
function islaEn(estado: EstadoDeRiberas, hex: Hex): Isla | null {
  const llave = llaveDeHex(hex);
  for (const isla of estado.islas) {
    if (llaveDeHex(isla.hex) === llave) return isla;
  }
  return null;
}

// ---------------------------------------------------------------------------
// EL ALMACÉN
// ---------------------------------------------------------------------------

/** Qué bien es esta ficha. Se lee del propio identificador. */
export function bienDeLaFicha(ficha: Ficha): Bien | null {
  const corte = ficha.indexOf(':');
  if (corte < 0) return null;
  const resto = ficha.slice(corte + 1);
  return (BIENES as readonly string[]).includes(resto) ? (resto as Bien) : null;
}

/** Cuántas fichas de cada bien hay en un almacén, en el orden de `BIENES`. */
export function cuentaDeBienes(almacen: readonly Ficha[]): number[] {
  const cuentas: number[] = BIENES.map(() => 0);
  for (const ficha of almacen) {
    const bien = bienDeLaFicha(ficha);
    if (bien === null) continue;
    cuentas[BIENES.indexOf(bien)] = (cuentas[BIENES.indexOf(bien)] as number) + 1;
  }
  return cuentas;
}

/**
 * COBRA UN PRECIO. Devuelve el almacén sin esas fichas, o `null` si no llega.
 *
 * Se quita SIEMPRE la ficha de número más bajo de cada clase, o sea la más
 * vieja. Cualquier criterio valdría para el juego y no cualquiera vale para la
 * reejecución: si se quitara «una cualquiera», dos ejecuciones del mismo diario
 * dejarían almacenes con fichas distintas y el hash del estado no cuadraría.
 * El orden más viejo primero es el que sale del propio recorrido de la lista,
 * que se llena siempre por el final.
 */
function cobrar(almacen: readonly Ficha[], precio: readonly Bien[]): Ficha[] | null {
  const quedan = [...almacen];
  for (const bien of precio) {
    let quitada = -1;
    for (let i = 0; i < quedan.length; i++) {
      if (bienDeLaFicha(quedan[i] as Ficha) === bien) {
        quitada = i;
        break;
      }
    }
    if (quitada < 0) return null;
    quedan.splice(quitada, 1);
  }
  return quedan;
}

/** ¿Llega este almacén para pagar esto? Sin cobrarlo. */
function llegaPara(almacen: readonly Ficha[], precio: readonly Bien[]): boolean {
  return cobrar(almacen, precio) !== null;
}

// ---------------------------------------------------------------------------
// EL TRUEQUE
// ---------------------------------------------------------------------------

/**
 * PROPONE UN TRUEQUE.
 *
 * Lo propone quien tiene el turno, y aquí sí se comprueba que tenga lo que
 * ofrece: mentir en la propuesta llenaría la mesa de ofertas imposibles. Lo que
 * NO se puede garantizar es que lo siga teniendo cuando el otro conteste —puede
 * gastarlo alzando— y de ahí sale el contraejemplo del §5 bis.
 */
function ofrecer(
  estado: EstadoDeRiberas,
  ctx: ContextoMovimiento,
  carga: unknown,
): EstadoDeRiberas {
  if (estado.momento !== 'jugando') return estado;
  const yo = indiceDelAsiento(estado, ctx.quien);
  if (yo < 0 || yo !== estado.turno) return estado;
  if (!estado.tirado) return estado;

  const para = campoDeTexto(carga, 'para');
  const da = bienesDeLaCarga(carga, 'da', BIENES_POR_LADO_DEL_TRUEQUE);
  const pide = bienesDeLaCarga(carga, 'pide', BIENES_POR_LADO_DEL_TRUEQUE);
  if (para === null || da === null || pide === null) return estado;

  const otro = indiceDelAsiento(estado, para);
  if (otro < 0 || otro === yo) return estado;

  const mio = estado.colonos[yo] as Colono;
  if (!llegaPara(mio.almacen, da)) return estado;

  const trato: Trato = {
    id: `t${estado.siguienteTrato}`,
    de: mio.asiento,
    para,
    da,
    pide,
    estado: 'propuesta',
  };
  return {
    ...estado,
    tratos: ultimos([...estado.tratos, trato]),
    siguienteTrato: estado.siguienteTrato + 1,
  };
}

/**
 * CONTESTA A UN TRUEQUE. Lo hace quien NO tiene el turno, y ése es el punto.
 *
 * ═══ AQUÍ ESTÁ EL CONTRAEJEMPLO DEL «SI Y SÓLO SI» ═══
 *
 * `opciones()` le ha ofrecido «aceptar» al destinatario mirando SU vista, donde
 * está su propio almacén y no el del oferente. Puede afirmar que el destinatario
 * tiene lo que se le pide; no puede afirmar que el oferente siga teniendo lo que
 * prometió, porque eso no está en la vista de quien acepta y meterlo ahí sería
 * filtrar el almacén ajeno.
 *
 * Así que la aceptación se ofrece y AQUÍ se vuelve a validar con todo lo que
 * hay. Son dos reglas distintas que parecían una, y ninguna de las dos sobra.
 *
 * ═══ Y CADA RECHAZO DICE POR QUÉ, QUE ES LA MITAD QUE FALTABA ═══
 *
 * Ésta es la pantalla donde más falta hace, y es por la forma del juego: aceptar
 * un trueque es lo ÚNICO que se hace sin tener el turno, o sea con la mesa
 * moviéndose por debajo mientras miras. Entre que se pinta el botón y se pulsa
 * pueden pasar cuatro cosas —que caduque el trueque, que lo acepten antes, que
 * el oferente gaste lo que prometía, que lo gastes tú— y las cuatro daban el
 * mismo silencio.
 *
 * ═══ Y EL MOTIVO DEL CASO GORDO NO DICE POR QUÉ, A PROPÓSITO ═══
 *
 * Cuando el oferente ya gastó la mercancía, aquí se contesta «ese trueque ya no
 * está en pie» y NO «el oferente ya no tiene lo que prometía». La segunda es la
 * que sale sola al escribirla, y es una fuga.
 *
 * La regla está en la cabecera de `aplicarConMotivo`, en `shared/arcade/motor.ts`,
 * y nombra este caso con estas palabras: un motivo NO PUEDE DECIR NADA QUE LA
 * PROYECCIÓN DE QUIEN MUEVE NO DIJERA YA. El almacén del oferente no está en la
 * vista de quien acepta —y no puede estarlo: taparlo es justo para lo que existe
 * el «sólo si»—, así que un motivo que hable de él lo saca por la puerta de
 * atrás, en un texto que ningún comprobador de secretos mira: `verify:mesa` busca
 * valores canónicos y un motivo es una frase.
 *
 * Se pensó el argumento contrario —que quien acepta podría deducirlo por
 * eliminación, viendo que a él no le falta nada— y no basta: la deducción es
 * suya, y confirmársela es darle certeza donde tenía sospecha. Además dejaría la
 * puerta abierta al siguiente que quiera «mejorar» el mensaje nombrando el bien.
 *
 * ═══ Y TODAS LAS DEMÁS GUARDAS SE QUEDAN MUDAS, QUE ES LO QUE COSTÓ VER ═══
 *
 * Se escribieron con motivo —«ese trueque ya no está en la mesa», «caducó al
 * pasar el turno», «no te lo han ofrecido a ti»— y hubo que quitarlos todos,
 * porque son TEXTO MUERTO: a esas guardas no llega nadie.
 *
 * El portillo de `avanzarRiberas` corre ANTES que esto y rechaza todo lo que
 * `opciones()` no ofreció. Y `opciones()` sólo ofrece aceptar un trueque que esté
 * en pie, que sea para quien mira y del que quien mira tenga su mitad — o sea
 * exactamente las condiciones de las cuatro guardas de arriba. Se midió: el caso
 * del trueque caducado sale por el portillo, con su mensaje corto y ciego, y no
 * llega aquí.
 *
 * Queda UNA sola guarda alcanzable, y no por casualidad: es la que `opciones()`
 * NO PUEDE comprobar, porque mira el almacén del oferente y ése no está en la
 * vista de quien acepta. Es el contraejemplo del «sólo si» y es justo la que
 * necesitaba explicarse.
 *
 * `yo < 0` y `oferente < 0` son además cinturones para el compilador: el árbitro
 * ya comprobó que quien mueve está sentado, y un trueque guardado apunta a dos
 * asientos que existen.
 */
function contestar(
  estado: EstadoDeRiberas,
  ctx: ContextoMovimiento,
  id: string | null,
  acepta: boolean,
): EstadoDeRiberas | Rechazo<EstadoDeRiberas> {
  if (estado.momento !== 'jugando' || id === null) return estado;
  const yo = indiceDelAsiento(estado, ctx.quien);
  if (yo < 0) return estado;

  const trato = estado.tratos.find((t) => t.id === id);
  if (trato === undefined) return estado;
  if (trato.estado !== 'propuesta') return estado;
  if (trato.para !== (estado.colonos[yo] as Colono).asiento) return estado;

  if (!acepta) return { ...estado, tratos: conElTrato(estado.tratos, id, 'rechazada') };

  const oferente = indiceDelAsiento(estado, trato.de);
  if (oferente < 0) return estado;

  /*
   * LAS DOS MITADES, y la primera es la que `opciones()` no podía comprobar.
   */
  const suyo = cobrar((estado.colonos[oferente] as Colono).almacen, trato.da);
  if (suyo === null) {
    /* La redacción es la que el contrato deja escrita. Ver la cabecera. */
    return rechazar(estado, 'Ese trueque ya no está en pie.');
  }
  /*
   * Y ÉSTA SE QUEDA MUDA POR EL MISMO MOTIVO QUE LAS DE ARRIBA. Se le puso texto
   * y hubo que quitárselo: `opciones()` comprueba `llegaPara(v.misFichas, ...)`
   * antes de ofrecer aceptar —mi propio almacén SÍ está en mi vista— así que si
   * me falta mi mitad la opción no se ofrece y el portillo para el movimiento una
   * capa antes. Aquí no llega nadie.
   *
   * Que el par de guardas quede asimétrico —una habla y la otra calla— es
   * justamente lo que hay que ver: no son dos comprobaciones equivalentes, son
   * las DOS MITADES del contraejemplo, y sólo una de ellas es la que `opciones()`
   * no podía hacer.
   */
  const mio = cobrar((estado.colonos[yo] as Colono).almacen, trato.pide);
  if (mio === null) return estado;

  /*
   * Las fichas cambian de dueño ENTERAS, con su número de serie. No se destruyen
   * y se vuelven a crear: si se recrearan, el contador de fichas avanzaría en
   * cada trueque y dos partidas con los mismos movimientos y distinto número de
   * trueques rechazados tendrían números distintos. Y además, moviéndolas, un
   * secreto que cambia de manos deja de aparecer en la vista de quien lo tenía y
   * empieza a aparecer en la del nuevo dueño — que es exactamente lo que
   * `verify:mesa` comprueba: cada ficha, en la vista de un asiento y de ninguno
   * más.
   */
  const paraElOferente = fichasPara((estado.colonos[yo] as Colono).almacen, trato.pide);
  const paraMi = fichasPara((estado.colonos[oferente] as Colono).almacen, trato.da);

  const colonos = estado.colonos.map((c, i) => {
    if (i === oferente) return { ...c, almacen: [...suyo, ...paraElOferente] };
    if (i === yo) return { ...c, almacen: [...mio, ...paraMi] };
    return c;
  });

  return { ...estado, colonos, tratos: conElTrato(estado.tratos, id, 'aceptada') };
}

/** Qué fichas concretas se van a entregar por un precio. Mismo criterio que `cobrar`. */
function fichasPara(almacen: readonly Ficha[], precio: readonly Bien[]): Ficha[] {
  const quedan = [...almacen];
  const salen: Ficha[] = [];
  for (const bien of precio) {
    for (let i = 0; i < quedan.length; i++) {
      if (bienDeLaFicha(quedan[i] as Ficha) === bien) {
        salen.push(quedan[i] as Ficha);
        quedan.splice(i, 1);
        break;
      }
    }
  }
  return salen;
}

/** Cambia el estado de un trueque, dejando los demás como estaban. */
function conElTrato(tratos: readonly Trato[], id: string, nuevo: EstadoDelTrato): Trato[] {
  return tratos.map((t) => (t.id === id ? { ...t, estado: nuevo } : t));
}

/** Sólo se recuerdan los últimos, para que el estado no crezca sin tope. */
function ultimos(tratos: readonly Trato[]): Trato[] {
  return tratos.length <= TRATOS_QUE_SE_RECUERDAN
    ? [...tratos]
    : tratos.slice(tratos.length - TRATOS_QUE_SE_RECUERDAN);
}

/**
 * CADUCAN LOS TRUEQUES ABIERTOS.
 *
 * Un trueque vive lo que dura el turno de quien lo propuso, y ni un movimiento
 * más. La alternativa —dejarlos abiertos— convierte la mesa en un tablón de
 * anuncios donde alguien acepta tres turnos después una oferta que ya no tiene
 * sentido, y el aceptante no tendría forma de saber que el mundo cambió.
 *
 * Y caducar no es borrar: el trueque se queda en la lista con `'caducada'`, que
 * es lo que permite que quien lo propuso vea qué pasó con él en vez de verlo
 * desaparecer sin explicación.
 */
function caducarLosAbiertos(tratos: readonly Trato[]): { tratos: Trato[]; hubo: boolean } {
  let hubo = false;
  const nuevos = tratos.map((t) => {
    if (t.estado !== 'propuesta') return t;
    hubo = true;
    return { ...t, estado: 'caducada' as EstadoDelTrato };
  });
  return { tratos: nuevos, hubo };
}

// ---------------------------------------------------------------------------
// EL MAZO: comprar, jugar y revelar
// ---------------------------------------------------------------------------

/**
 * ¿ES MÍO EL TURNO? Devuelve mi índice, o −1.
 *
 * NO mira si se ha tirado, y eso es a propósito: revelar un título se puede hacer
 * en cualquier momento del turno propio —incluso antes de tirar— y todo lo demás
 * del mazo exige haber tirado. Poner el `tirado` aquí dentro habría metido en una
 * sola función dos reglas que el §3 del diseño separa expresamente.
 */
function elTurnoEsDe(estado: EstadoDeRiberas, ctx: ContextoMovimiento): number {
  if (estado.momento !== 'jugando') return -1;
  const yo = indiceDelAsiento(estado, ctx.quien);
  if (yo < 0 || yo !== estado.turno) return -1;
  return yo;
}

/** La carta de mi mano que lleva ese seudónimo, o `null`. Ver `Carta`. */
function laCartaDeLaMano(mio: Colono, seudonimo: string | null): CartaEnMano | null {
  if (seudonimo === null) return null;
  for (const enMano of mio.mano) {
    if (seudonimoDeLaCarta(enMano.carta) === seudonimo) return enMano;
  }
  return null;
}

/**
 * LAS DOS REGLAS QUE ATRAVIESAN TODAS LAS CARTAS QUE SE JUEGAN.
 *
 * Una por turno, y nunca la que se compró en este mismo turno. Las dos existen por
 * lo mismo y está escrito en el §1.4 y el §1.5 del diseño: sin ellas, tres bienes
 * se convierten en un efecto inmediato y una mano guardada se convierte en una
 * jugada única que gana la partida sin que nadie pueda responder.
 *
 * Los títulos NO pasan por aquí: no se juegan, se revelan, y revelar no hace nada
 * salvo enseñar lo que ya se tenía.
 *
 * ═══ Y ESTA COPIA ESTÁ A LA SOMBRA DEL PORTILLO. MEDIDO, NO SUPUESTO ═══
 *
 * Las dos reglas están escritas dos veces —aquí sobre el estado, y en
 * `opcionesDelMazo` sobre la vista—, y el sitio donde MUERDEN es el segundo: como
 * `opciones()` no ofrece la carta, el portillo para el movimiento antes de llegar
 * aquí. Se comprobó quitando esta función y dejando la otra: el comprobador siguió
 * en verde entero. Quitando la de `opcionesDelMazo`, se ponen rojas cuatro
 * comprobaciones a la vez.
 *
 * No sobra, y es el mismo trato que reciben las guardas de fase de `fundar` y los
 * topes de `trazar`: una regla que sólo vive en `opciones()` es una regla que se
 * salta cualquier camino que no pase por ahí —el reloj ya entra por uno—, y quien
 * lea esta rama dentro de un año no debe tener que demostrar el teorema del
 * portillo para saber que está a salvo. Lo que sí hay que saber es cuál de las dos
 * copias hay que tocar para cambiar la regla: LAS DOS, y lo dice el comprobador.
 */
function sePuedeJugarLaCarta(estado: EstadoDeRiberas, enMano: CartaEnMano): boolean {
  if (estado.cartaJugada) return false;
  return enMano.comprada < estado.turnosAbiertos;
}

/** La mano sin esa carta. Una carta jugada no vuelve: no hay descarte que mirar. */
function sinLaCarta(mano: readonly CartaEnMano[], carta: Carta): CartaEnMano[] {
  return mano.filter((m) => m.carta !== carta);
}

/**
 * COMPRA LA CARTA DE ARRIBA DEL MAZO.
 *
 * ═══ LAS DOS GUARDAS DE AQUÍ ESTÁN MUDAS, Y ESO ES UNA DECISIÓN ═══
 *
 * Ni «no te llega» ni «el mazo se acabó» dicen nada, y es por la doctrina que
 * `contestar` deja escrita entera: un motivo sólo se escribe donde `opciones()` NO
 * pudo comprobar la condición, porque en los demás casos es TEXTO MUERTO al que no
 * llega nadie. Aquí las dos condiciones están en la vista de quien compra —su
 * propio almacén, y cuántas cartas quedan, que es público— así que `opciones()` no
 * ofrece el botón y el portillo para el movimiento una capa antes, con su mensaje
 * corto y ciego.
 *
 * Se escriben igual porque quien lea esto dentro de un año no debe tener que
 * demostrar el teorema del portillo para saber que la rama está a salvo.
 */
function comprarUnaCarta(estado: EstadoDeRiberas, ctx: ContextoMovimiento): EstadoDeRiberas {
  const yo = elTurnoEsDe(estado, ctx);
  if (yo < 0 || !estado.tirado) return estado;
  const mio = estado.colonos[yo] as Colono;

  const arriba = estado.mazo[0];
  if (arriba === undefined) return estado;

  const almacen = cobrar(mio.almacen, COSTE_DE_LA_CARTA);
  if (almacen === null) return estado;

  const colonos = estado.colonos.map((c, i) =>
    i !== yo
      ? c
      : {
          ...c,
          almacen,
          /* El sello de compra, que es lo que impide jugarla hoy. Ver `CartaEnMano`. */
          mano: [...c.mano, { carta: arriba, comprada: estado.turnosAbiertos }],
        },
  );
  return { ...estado, colonos, mazo: estado.mazo.slice(1) };
}

/**
 * JUEGA UNA GUARDIA: le quitas un bien AL AZAR a un colono que elijas.
 *
 * ═══ ROBA, Y NO MUEVE A NADIE ═══
 *
 * En la familia de la que viene esta mecánica, esta carta mueve la pieza de la
 * desgracia por el tablero. RIBERAS NO TIENE ESA PIEZA: su desgracia es el
 * ESTIAJE, que no ocupa una isla sino que corta la producción del turno, y eso
 * está escrito desde el principio —`riberas-en-3d.ts` dice que «`ladron` sale
 * siempre `null`, y eso no es un hueco por rellenar»—. Así que la guardia hace lo
 * OTRO que hacía aquella carta, que es robar.
 *
 * ═══ AL AZAR DEL ESTADO, Y NO LA PRIMERA DE LA LISTA ═══
 *
 * Coger «la primera» sería determinista y también sería una fuga de reglas: el
 * orden del almacén ajeno es el orden en que le fueron llegando las fichas, o sea
 * información que quien roba no tiene y no debe tener. Con `estado.azar` la carta
 * roba a ciegas, que es lo que dice la regla, y sigue siendo reejecutable — que
 * es exactamente para lo que el azar vive dentro del estado.
 *
 * Y la ficha viaja ENTERA, con su número de serie, por lo mismo que en el trueque:
 * un secreto que cambia de manos deja de aparecer en una vista y empieza a
 * aparecer en la otra, que es justo lo que `verify:mesa` comprueba.
 */
function jugarLaGuardia(
  estado: EstadoDeRiberas,
  ctx: ContextoMovimiento,
  seudonimo: string | null,
  aQuien: string | null,
): EstadoDeRiberas {
  const yo = elTurnoEsDe(estado, ctx);
  if (yo < 0 || !estado.tirado) return estado;
  const mio = estado.colonos[yo] as Colono;

  const enMano = laCartaDeLaMano(mio, seudonimo);
  if (enMano === null || claseDeLaCarta(enMano.carta) !== 'guardia') return estado;
  if (!sePuedeJugarLaCarta(estado, enMano)) return estado;

  const victima = indiceDelAsiento(estado, aQuien);
  if (victima < 0 || victima === yo) return estado;
  const suyo = estado.colonos[victima] as Colono;
  /* A quien no tiene nada no se le roba, y por eso tampoco se ofrece robarle. */
  if (suyo.almacen.length === 0) return estado;

  const tirada = enteroEntre(estado.azar, 0, suyo.almacen.length - 1);
  const robada = suyo.almacen[tirada.valor] as Ficha;

  const colonos = estado.colonos.map((c, i) => {
    if (i === victima) return { ...c, almacen: c.almacen.filter((_, k) => k !== tirada.valor) };
    if (i === yo) {
      return {
        ...c,
        almacen: [...c.almacen, robada],
        mano: sinLaCarta(c.mano, enMano.carta),
        guardias: c.guardias + 1,
      };
    }
    return c;
  });

  /*
   * EL PREMIO SE RECALCULA AQUÍ, y es el único sitio donde hace falta: La Mayor
   * Guardia sólo se mueve cuando alguien juega una guardia. El Vado Largo cuelga
   * además de `fundar`, porque una choza ajena parte una cadena; una guardia
   * ajena no le quita guardias a nadie.
   */
  return puedeHaberGanado(
    conLaGuardia({ ...estado, colonos, azar: tirada.azar, cartaJugada: true }),
  );
}

/**
 * JUEGA EL AÑO BUENO: dos bienes cualesquiera del arcón, iguales o distintos.
 *
 * Las fichas se FABRICAN, con `siguienteFicha`, porque vienen del arcón y no de
 * nadie: son bienes nuevos en la partida. Es el mismo camino por el que nacen las
 * de la cosecha, y por eso el contador es el mismo — dos fichas con el mismo
 * número de serie serían dos secretos indistinguibles, y ahí es donde
 * `verify:mesa` empieza a dar rojos que no significan nada.
 *
 * No se mira si ha ganado: dos bienes no dan un punto.
 */
function jugarElAnoBueno(
  estado: EstadoDeRiberas,
  ctx: ContextoMovimiento,
  seudonimo: string | null,
  bienes: Bien[] | null,
): EstadoDeRiberas {
  const yo = elTurnoEsDe(estado, ctx);
  if (yo < 0 || !estado.tirado || bienes === null) return estado;
  const mio = estado.colonos[yo] as Colono;

  const enMano = laCartaDeLaMano(mio, seudonimo);
  if (enMano === null || claseDeLaCarta(enMano.carta) !== 'ano-bueno') return estado;
  if (!sePuedeJugarLaCarta(estado, enMano)) return estado;

  let siguiente = estado.siguienteFicha;
  const nuevas: Ficha[] = bienes.map((b) => `b${siguiente++}:${b}`);

  const colonos = estado.colonos.map((c, i) =>
    i !== yo
      ? c
      : { ...c, almacen: [...c.almacen, ...nuevas], mano: sinLaCarta(c.mano, enMano.carta) },
  );
  return { ...estado, colonos, siguienteFicha: siguiente, cartaJugada: true };
}

/**
 * JUEGA EL ACAPARAMIENTO: dices un bien y TODOS los demás te dan los que tengan.
 *
 * Se recorren los colonos en el orden de la lista y las fichas en el orden de cada
 * almacén, que es orden fijo: si el recorrido dependiera del orden de un objeto,
 * dos reejecuciones de la misma partida dejarían el almacén de quien acapara con
 * las mismas fichas en distinto orden, y el hash del estado no cuadraría.
 *
 * Puede no llevarse nada, y eso es correcto: quien la juega no ve los almacenes
 * ajenos y apuesta. Por eso se ofrecen los cinco bienes y no sólo los que alguien
 * tiene — ofrecer sólo esos sería publicar, en una lista de botones, qué tienen
 * los demás.
 */
function jugarElAcaparamiento(
  estado: EstadoDeRiberas,
  ctx: ContextoMovimiento,
  seudonimo: string | null,
  bien: Bien | null,
): EstadoDeRiberas {
  const yo = elTurnoEsDe(estado, ctx);
  if (yo < 0 || !estado.tirado || bien === null) return estado;
  const mio = estado.colonos[yo] as Colono;

  const enMano = laCartaDeLaMano(mio, seudonimo);
  if (enMano === null || claseDeLaCarta(enMano.carta) !== 'acaparamiento') return estado;
  if (!sePuedeJugarLaCarta(estado, enMano)) return estado;

  const cosecha: Ficha[] = [];
  for (let i = 0; i < estado.colonos.length; i++) {
    if (i === yo) continue;
    for (const ficha of (estado.colonos[i] as Colono).almacen) {
      if (bienDeLaFicha(ficha) === bien) cosecha.push(ficha);
    }
  }

  const colonos = estado.colonos.map((c, i) => {
    if (i === yo) {
      return { ...c, almacen: [...c.almacen, ...cosecha], mano: sinLaCarta(c.mano, enMano.carta) };
    }
    const quedan = c.almacen.filter((f) => bienDeLaFicha(f) !== bien);
    /* A quien no tenía ninguno se le devuelve EL MISMO objeto: no le pasó nada. */
    return quedan.length === c.almacen.length ? c : { ...c, almacen: quedan };
  });
  return { ...estado, colonos, cartaJugada: true };
}

/**
 * JUEGA LAS DOS VEREDAS: alzas dos sin pagarlas, donde las reglas te dejen.
 *
 * Esta función no pone ninguna vereda. Lo único que hace es dejar el contador en
 * dos y quitarse la carta de la mano; las veredas se alzan después, una a una, con
 * el movimiento de siempre y por la función de siempre. El porqué está en
 * `EstadoDeRiberas.veredasGratis` y es la parte que importa de esta carta: la
 * segunda vereda puede salir de la primera, así que no se puede elegir el par de
 * antemano.
 *
 * Si no queda un solo sitio legal, la carta no se juega —y tampoco se ofrece—.
 * Gastar una carta para no poner nada no es una jugada: es una carta perdida por
 * un descuido de quien escribió las opciones.
 */
function jugarLasDosVeredas(
  estado: EstadoDeRiberas,
  ctx: ContextoMovimiento,
  seudonimo: string | null,
): EstadoDeRiberas {
  const yo = elTurnoEsDe(estado, ctx);
  if (yo < 0 || !estado.tirado) return estado;
  const mio = estado.colonos[yo] as Colono;

  const enMano = laCartaDeLaMano(mio, seudonimo);
  if (enMano === null || claseDeLaCarta(enMano.carta) !== 'dos-veredas') return estado;
  if (!sePuedeJugarLaCarta(estado, enMano)) return estado;
  if (!hayDondeTrazar(estado, yo)) return estado;

  const colonos = estado.colonos.map((c, i) =>
    i !== yo ? c : { ...c, mano: sinLaCarta(c.mano, enMano.carta) },
  );
  return { ...estado, colonos, veredasGratis: VEREDAS_DE_LA_CARTA, cartaJugada: true };
}

/**
 * REVELA UN TÍTULO: lo enseñas, vale un punto en público y ya no se puede guardar.
 *
 * ═══ POR QUÉ ESTO NO ES «JUGAR UNA CARTA» ═══
 *
 * Porque no hace nada. Un título guardado ya vale su punto para su dueño —§1.6, y
 * está en `puntosOcultosDe`—; revelarlo sólo pone en público lo que ya contaba en
 * privado. Cobrarle la jugada del turno, o el turno de espera de la compra, sería
 * castigar un movimiento que no cambia el juego de nadie.
 *
 * Y hay una razón que no es de elegancia: los puntos con los que se GANA son los
 * públicos, así que quien tenga el octavo punto en un título tiene que poder
 * revelarlo para ganar. Si revelar costara el turno o la jugada, habría manos con
 * las que no se puede ganar. Por eso además se ofrece SIEMPRE en el turno propio,
 * antes de tirar y después.
 */
function revelarUnTitulo(
  estado: EstadoDeRiberas,
  ctx: ContextoMovimiento,
  seudonimo: string | null,
): EstadoDeRiberas {
  const yo = elTurnoEsDe(estado, ctx);
  if (yo < 0) return estado;
  const mio = estado.colonos[yo] as Colono;

  const enMano = laCartaDeLaMano(mio, seudonimo);
  if (enMano === null) return estado;
  const clase = claseDeLaCarta(enMano.carta);
  if (clase === null || !esTitulo(clase)) return estado;

  const colonos = estado.colonos.map((c, i) =>
    i !== yo
      ? c
      : { ...c, mano: sinLaCarta(c.mano, enMano.carta), titulos: [...c.titulos, clase] },
  );
  return puedeHaberGanado({ ...estado, colonos });
}

// ---------------------------------------------------------------------------
// PASAR EL TURNO Y EL PLAZO
// ---------------------------------------------------------------------------

/** Cierra el turno: caducan los trueques abiertos y le toca al siguiente. */
function pasarTurno(estado: EstadoDeRiberas, ctx: ContextoMovimiento): EstadoDeRiberas {
  if (estado.momento !== 'jugando') return estado;
  const yo = indiceDelAsiento(estado, ctx.quien);
  if (yo < 0 || yo !== estado.turno) return estado;
  return siguienteTurno(estado);
}

/**
 * Lo común: caducan los abiertos, avanza el turno y se borra la tirada.
 *
 * Y se borra TODO lo que dura un turno: la carta jugada y las veredas gratis que
 * quedaran sin alzar. Lo segundo es una decisión y no un descuido: quien juega Las
 * Dos Veredas y luego pasa sin poner la segunda la pierde, porque la alternativa
 * —guardársela para el turno siguiente— convierte una carta en un crédito que hay
 * que recordar, y nadie que mire el tablero sabría que existe.
 */
function siguienteTurno(estado: EstadoDeRiberas): EstadoDeRiberas {
  const caducados = caducarLosAbiertos(estado.tratos);
  return {
    ...estado,
    tratos: caducados.tratos,
    turno: (estado.turno + 1) % Math.max(1, estado.colonos.length),
    tirado: false,
    turnosAbiertos: estado.turnosAbiertos + 1,
    cartaJugada: false,
    veredasGratis: 0,
  };
}

/**
 * SE ACABÓ LA ESPERA: entra un tic.
 *
 * ═══ DÓNDE ESTÁ EL PLAZO, Y POR QUÉ NO ESTÁ AQUÍ ═══
 *
 * `tickHz: 0`, así que a este juego no le llega ningún tic por su cuenta y un
 * plazo contado en segundos no vencería nunca: `ticsPara(45, 0)` es infinito por
 * contrato. Y el plazo no se puede guardar aquí en milisegundos de pared, porque
 * un reductor puro no sabe qué hora es y no debe saberlo.
 *
 * De modo que el plazo de pared vive en LA MESA, que es la autoridad y lo evalúa
 * al leer, y lo que vive aquí es LA REGLA de qué significa que venza. Lo mismo
 * que en La Ronda, y por lo mismo.
 *
 * Qué significa aquí:
 *
 *   · COLOCANDO — se coloca por ti, en el primer sitio legal del orden canónico.
 *     Saltar el paso rompería la serpentina: quedarían menos chozas de las que la
 *     partida cuenta y la colocación no acabaría nunca. Una mesa que no avanza es
 *     exactamente lo que esto existe para no dejar pasar.
 *   · JUGANDO — caducan los trueques abiertos y pasa el turno. No se tira por
 *     nadie: una tirada gasta azar y beneficiaría o perjudicaría a quien no está,
 *     y la decisión menos intervencionista es la que menos regla inventa.
 *   · REUNIENDO o TERMINADA — no pasa nada y se devuelve EL MISMO objeto. Una
 *     mesa esperando al segundo puede estar días así, y cada lectura mete su tic.
 */
function venceElPlazo(estado: EstadoDeRiberas): EstadoDeRiberas {
  if (estado.momento === 'colocando') return colocarPorElAusente(estado);
  if (estado.momento !== 'jugando') return estado;
  return siguienteTurno(estado);
}

/**
 * COLOCA POR QUIEN NO ESTÁ, en el primer sitio legal del orden canónico.
 *
 * «El primero» y no «uno al azar»: gastar una tirada aquí haría que dos partidas
 * con los mismos movimientos y distinto número de plazos vencidos tuvieran el
 * azar en sitios distintos, y eso se nota al reejecutar.
 */
function colocarPorElAusente(estado: EstadoDeRiberas): EstadoDeRiberas {
  const yo = turnoDe(estado);
  if (yo < 0) return estado;
  const suyo = estado.colonos[yo];
  if (suyo === undefined) return estado;
  const ctx: ContextoMovimiento = {
    quien: suyo.asiento,
    azar: 0,
    tic: 0,
    asientos: estado.colonos.map((c) => c.asiento),
  };

  if (!estado.faltaVereda) {
    for (const vertice of verticesDelDelta(estado)) {
      if (!sePuedeFundarEn(estado, yo, vertice)) continue;
      return fundar(estado, ctx, vertice);
    }
    return estado;
  }

  const donde = estado.ultimaChoza;
  if (donde === null) return estado;
  for (const arista of aristasDeVertice(donde)) {
    if (!aristasDelDelta(estado).includes(arista)) continue;
    if (aristaOcupada(estado, arista)) continue;
    return trazar(estado, yo, arista);
  }
  return estado;
}

// ---------------------------------------------------------------------------
// EL VADO LARGO: el premio derivado
// ---------------------------------------------------------------------------

/**
 * LA CADENA DE VEREDAS MÁS LARGA DE UN COLONO.
 *
 * Camino simple sobre sus propias veredas —cada vereda se usa una vez— que NO
 * PUEDE ATRAVESAR un vértice donde otro colono tenga una choza o una torre.
 * Puede terminar ahí, pero no seguir: una casa ajena corta el paso, y ésa es la
 * regla que hace que el premio se pueda perder sin que su dueño toque nada.
 *
 * Es una búsqueda exhaustiva y no se disculpa: un colono tiene doce veredas como
 * mucho (`TOPE_DE_PIEZAS`), y una búsqueda exacta sobre doce aristas se hace
 * antes de que nadie levante el dedo del cristal. Una heurística aquí sería una
 * regla de juego que nadie sabría explicar.
 */
export function largoDelVado(
  veredas: readonly LlaveDeArista[],
  bloqueados: readonly LlaveDeVertice[],
): number {
  let mejor = 0;
  for (const arista of veredas) {
    for (const punta of verticesDeArista(arista)) {
      const largo = extender(veredas, bloqueados, [arista], punta);
      if (largo > mejor) mejor = largo;
    }
  }
  return mejor;
}

/** Alarga el camino desde una punta. Ver `largoDelVado`. */
function extender(
  veredas: readonly LlaveDeArista[],
  bloqueados: readonly LlaveDeVertice[],
  usadas: readonly LlaveDeArista[],
  punta: LlaveDeVertice,
): number {
  if (bloqueados.includes(punta)) return usadas.length;
  let mejor = usadas.length;
  for (const otra of veredas) {
    if (usadas.includes(otra)) continue;
    if (!aristaTocaVertice(otra, punta)) continue;
    const extremos = verticesDeArista(otra);
    const siguiente = extremos[0] === punta ? extremos[1] : extremos[0];
    if (siguiente === undefined) continue;
    const largo = extender(veredas, bloqueados, [...usadas, otra], siguiente);
    if (largo > mejor) mejor = largo;
  }
  return mejor;
}

/**
 * QUIEN TENGA PIEZAS DE VÉRTICE SIRVE PARA ESTA CUENTA: el colono del estado y el
 * de la vista, que son dos tipos distintos con los mismos campos públicos.
 *
 * Se declara lo MÍNIMO a propósito. Pedir `Colono` aquí obligaría a la vista a
 * escribir su propia versión del corte, y ése es justo el camino por el que el
 * corte acabó existiendo en un solo sitio. Ver `bloqueadosPara`.
 */
interface ConPiezasDeVertice {
  asiento: AsientoId;
  chozas: readonly LlaveDeVertice[];
  torres: readonly LlaveDeVertice[];
}

/**
 * LOS VÉRTICES DONDE OTRO TIENE ALGO. Son los que cortan el paso, y el corte tiene
 * que ser EL MISMO en los tres sitios que lo miran.
 *
 * ═══ POR QUÉ RECIBE UNA LISTA Y NO EL ESTADO, Y QUÉ COSTÓ ═══
 *
 * Esta cuenta la necesitan tres jueces: el premio (`recalcularElVado`), el
 * reductor que deja o no trazar (`pegaConLoMio`) y la vista que ofrece los sitios
 * (`pegaConLoSuyo`). Los dos primeros miran el estado; el tercero mira la vista.
 * Ésa fue la excusa con la que el corte se escribió una sola vez —para el premio—
 * y no para los otros dos, y el resultado se jugó: se podía trazar una vereda
 * SALIENDO del vértice donde otro tenía choza, el juego la cobraba y la pintaba
 * pegada, y luego el premio SÍ cortaba ahí. Cinco veredas pagadas, Vado de tres,
 * y ni una línea que lo explicara.
 *
 * Así que recibe lo mínimo que las dos formas comparten y la llaman los tres.
 * Escribir aquí al lado una segunda cuenta «igual pero sobre la vista» es reabrir
 * el mismo agujero con otro nombre.
 */
function bloqueadosPara(
  colonos: readonly ConPiezasDeVertice[],
  yo: AsientoId,
): LlaveDeVertice[] {
  const bloqueados: LlaveDeVertice[] = [];
  for (const c of colonos) {
    if (c.asiento === yo) continue;
    for (const v of c.chozas) bloqueados.push(v);
    for (const v of c.torres) bloqueados.push(v);
  }
  return bloqueados;
}

/**
 * RECALCULA EL VADO LARGO, y sólo cambia de dueño si se SUPERA ESTRICTAMENTE.
 *
 * ═══ POR QUÉ EL ESTRICTAMENTE, Y POR QUÉ ES DIFÍCIL DE ESCRIBIR BIEN ═══
 *
 * Un premio derivado tiene dos formas de estar mal escrito y las dos se ven sólo
 * jugando:
 *
 *   · Si se lo lleva quien EMPATA, el premio salta de mano en mano cada vez que
 *     alguien iguala, y quien lo tenía lo pierde sin que nada suyo cambie.
 *   · Si se recalcula desde cero ignorando quién lo tenía, dos jugadores
 *     empatados se lo van quitando según el orden de recorrido, que es un detalle
 *     de implementación decidiendo una partida.
 *
 * Así que: el dueño lo conserva mientras siga llegando al mínimo, y sólo se lo
 * quita quien lo supere ESTRICTAMENTE y además sea el único que lo supera. Si el
 * dueño baja del mínimo —porque alguien le partió la cadena con una choza— el
 * premio queda VACANTE y se reparte de nuevo con la misma regla: el máximo
 * estricto, y si hay empate, nadie.
 */
export function recalcularElVado(estado: EstadoDeRiberas): Vado {
  const largos: number[] = [];
  for (let i = 0; i < estado.colonos.length; i++) {
    const c = estado.colonos[i] as Colono;
    largos.push(largoDelVado(c.veredas, bloqueadosPara(estado.colonos, c.asiento)));
  }

  const iActual = estado.vado.de === null ? -1 : indiceDelAsiento(estado, estado.vado.de);
  const largoActual = iActual < 0 ? 0 : (largos[iActual] ?? 0);
  const sigueSiendoSuyo = iActual >= 0 && largoActual >= VADO_MINIMO;

  const umbral = sigueSiendoSuyo ? largoActual : VADO_MINIMO - 1;
  let mejor = umbral;
  let cuantos = 0;
  let quien = -1;
  for (let i = 0; i < largos.length; i++) {
    if (i === iActual && sigueSiendoSuyo) continue;
    const largo = largos[i] as number;
    if (largo > mejor) {
      mejor = largo;
      cuantos = 1;
      quien = i;
    } else if (largo === mejor && largo > umbral) {
      cuantos++;
    }
  }

  if (cuantos === 1 && quien >= 0) {
    return { de: (estado.colonos[quien] as Colono).asiento, largo: mejor };
  }
  if (sigueSiendoSuyo) return { de: estado.vado.de, largo: largoActual };
  return { de: null, largo: 0 };
}

/** Deja el vado al día, devolviendo EL MISMO objeto si no ha cambiado de manos. */
function conElVado(estado: EstadoDeRiberas): EstadoDeRiberas {
  const vado = recalcularElVado(estado);
  if (vado.de === estado.vado.de && vado.largo === estado.vado.largo) return estado;
  return { ...estado, vado };
}

// ---------------------------------------------------------------------------
// LA MAYOR GUARDIA: el segundo premio derivado
// ---------------------------------------------------------------------------

/**
 * RECALCULA LA MAYOR GUARDIA, con la MISMA regla que el Vado Largo.
 *
 * ═══ ES LA COPIA DEL PATRÓN DE `recalcularElVado`, Y ESO ES LO CORRECTO ═══
 *
 * Línea a línea es la misma función con otra cuenta dentro, y la tentación de
 * escribir una sola con un `Record` de cuentas y un mínimo por parámetro es real.
 * No se hace, y la razón no es pereza:
 *
 *   · LO QUE SE COMPARTE ES LA REGLA, y la regla es corta y está escrita entera en
 *     la cabecera de aquélla: el dueño conserva mientras siga llegando al mínimo, y
 *     sólo se lo quita quien lo SUPERE ESTRICTAMENTE siendo el único que lo supera.
 *     Lo que no se comparte es qué se cuenta, y ahí no hay nada que abstraer:
 *     `largoDelVado` es una búsqueda exhaustiva sobre un grafo y `c.guardias` es un
 *     campo.
 *   · Una función común tendría que devolver un tipo común, y `Vado` y `Guardia` son
 *     dos tipos a propósito —ver `Guardia`—. Unificarlos para poder unificar la
 *     función es dejar que la implementación decida el vocabulario del juego.
 *
 * Lo que sí hay que mantener a mano es que las dos cambien juntas si la regla
 * cambia, y para eso está la comprobación: el comprobador prueba el empate y la
 * superación estricta EN LOS DOS, con las mismas palabras.
 */
export function recalcularLaGuardia(estado: EstadoDeRiberas): Guardia {
  const cuentas = estado.colonos.map((c) => c.guardias);

  const iActual = estado.guardia.de === null ? -1 : indiceDelAsiento(estado, estado.guardia.de);
  const actual = iActual < 0 ? 0 : (cuentas[iActual] ?? 0);
  const sigueSiendoSuya = iActual >= 0 && actual >= GUARDIA_MINIMA;

  const umbral = sigueSiendoSuya ? actual : GUARDIA_MINIMA - 1;
  let mejor = umbral;
  let cuantos = 0;
  let quien = -1;
  for (let i = 0; i < cuentas.length; i++) {
    if (i === iActual && sigueSiendoSuya) continue;
    const suyas = cuentas[i] as number;
    if (suyas > mejor) {
      mejor = suyas;
      cuantos = 1;
      quien = i;
    } else if (suyas === mejor && suyas > umbral) {
      cuantos++;
    }
  }

  if (cuantos === 1 && quien >= 0) {
    return { de: (estado.colonos[quien] as Colono).asiento, cuantas: mejor };
  }
  if (sigueSiendoSuya) return { de: estado.guardia.de, cuantas: actual };
  return { de: null, cuantas: 0 };
}

/** Deja La Mayor Guardia al día, devolviendo EL MISMO objeto si no cambió. */
function conLaGuardia(estado: EstadoDeRiberas): EstadoDeRiberas {
  const guardia = recalcularLaGuardia(estado);
  if (guardia.de === estado.guardia.de && guardia.cuantas === estado.guardia.cuantas) {
    return estado;
  }
  return { ...estado, guardia };
}

// ---------------------------------------------------------------------------
// PUNTOS Y FIN
// ---------------------------------------------------------------------------

/**
 * CUÁNTOS PUNTOS TIENE UN COLONO EN PÚBLICO. Derivado, nunca guardado.
 *
 * ═══ «EN PÚBLICO» ES LA PALABRA QUE HAY QUE LEER ═══
 *
 * Aquí entran las piezas del tablero, los dos premios y los títulos REVELADOS.
 * NO entran los títulos que siguen en la mano, y no es un olvido: es el §1.6 del
 * diseño. Los cuenta `puntosOcultosDe`, y sólo se le enseñan a su dueño.
 *
 * De este número cuelga `puedeHaberGanado`, así que la consecuencia es una regla
 * de verdad: CON UN TÍTULO SIN REVELAR NO SE GANA. Hay que enseñarlo, y por eso
 * revelar se ofrece siempre en el turno propio.
 */
export function puntosDe(estado: EstadoDeRiberas, colono: Colono): number {
  const dePiezas =
    colono.chozas.length * PUNTOS_DE_LA_PIEZA.choza + colono.torres.length * PUNTOS_DE_LA_PIEZA.torre;
  const dePremios =
    (estado.vado.de === colono.asiento ? PUNTOS_DEL_VADO : 0) +
    (estado.guardia.de === colono.asiento ? PUNTOS_DE_LA_GUARDIA : 0);
  return dePiezas + dePremios + colono.titulos.length * PUNTOS_DEL_TITULO;
}

/**
 * LOS PUNTOS QUE SÓLO CUENTA SU DUEÑO: los títulos que siguen en la mano.
 *
 * Es la mitad del §1.6 que hace que las últimas rondas se jueguen distinto — saber
 * que vas ganando en secreto cambia si compras o si construyes—. Sale de aquí y
 * entra en la vista SÓLO por `misPuntos`, que la proyección no le manda a nadie
 * más.
 */
export function puntosOcultosDe(colono: Colono): number {
  let ocultos = 0;
  for (const enMano of colono.mano) {
    const clase = claseDeLaCarta(enMano.carta);
    if (clase !== null && esTitulo(clase)) ocultos += PUNTOS_DEL_TITULO;
  }
  return ocultos;
}

/**
 * ¿HA GANADO ALGUIEN? Se mira después de cada movimiento que cambia el tablero.
 *
 * Puede ganar más de uno a la vez: un trueque no cambia puntos, pero fundar una
 * choza puede a la vez darle a otro el Vado Largo y hacerle llegar a ocho. Se
 * devuelven TODOS los que llegan, en el orden en que se sentaron, en vez de
 * inventarse un desempate — que sería una regla de producto disfrazada de
 * detalle técnico.
 */
function puedeHaberGanado(estado: EstadoDeRiberas): EstadoDeRiberas {
  if (estado.momento !== 'jugando' && estado.momento !== 'colocando') return estado;
  const ganadores: AsientoId[] = [];
  for (const c of estado.colonos) {
    if (puntosDe(estado, c) >= PUNTOS_PARA_GANAR) ganadores.push(c.asiento);
  }
  if (ganadores.length === 0) return estado;
  return { ...estado, momento: 'terminada', ganadores };
}

/**
 * ¿Se acabó?
 *
 * La llama QUIEN HOSPEDA para saber cuándo cerrar la mesa: «fin como función del
 * estado» es uno de los conceptos que el diseño aplaza, porque en cuanto el motor
 * sepa preguntarle a un juego si ha terminado tendrá una opinión sobre qué es
 * terminar. El juego sí lo sabe, y lo dice cuando se lo preguntan por su nombre.
 */
export function seAcabo(estado: EstadoDeRiberas | undefined): boolean {
  return (estado ?? partidaNueva()).momento === 'terminada';
}

// ---------------------------------------------------------------------------
// El delta como listas de llaves
// ---------------------------------------------------------------------------

/*
 * Se recalculan cada vez que hacen falta en vez de guardarse en el estado, y eso
 * es deliberado: el delta no cambia en toda la partida, así que guardarlas sería
 * guardar un derivado —cincuenta y cuatro cadenas más noventa— dentro de algo que
 * se serializa, se manda por la red y se compara byte a byte en `oro:arcade`. Un
 * derivado dentro del estado es una segunda verdad que se puede desincronizar.
 */

/** Los vértices del delta, en orden canónico. */
function verticesDelDelta(estado: EstadoDeRiberas): LlaveDeVertice[] {
  return verticesDe(estado.islas.map((i) => i.hex));
}

/** Las aristas del delta, en orden canónico. */
function aristasDelDelta(estado: EstadoDeRiberas): LlaveDeArista[] {
  return aristasDe(estado.islas.map((i) => i.hex));
}

/** El índice del colono de este asiento, o −1. */
function indiceDelAsiento(estado: EstadoDeRiberas, quien: AsientoId | null): number {
  if (quien === null) return -1;
  for (let i = 0; i < estado.colonos.length; i++) {
    if ((estado.colonos[i] as Colono).asiento === quien) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// LO QUE VE CADA CUAL
// ---------------------------------------------------------------------------

/** Lo que se sabe de un colono SIN mirarle el almacén. */
export interface ColonoVisto {
  asiento: AsientoId;
  /**
   * CÓMO SE LLAMA, para poder escribir una frase que se lea.
   *
   * Lo trae la proyección desde la mesa (tercer argumento de `Proyeccion`) y es
   * de la fase 5: hasta entonces este juego no sabía cómo se llamaba nadie y
   * escribía huecos que rellenaba el mueble. Ver `mecanicas/tablero-declarado.ts`,
   * donde está contado el rodeo que esto sustituye.
   *
   * Puede ser el propio identificador —eso hace `comoSeLlama` cuando el asiento no
   * consta— y ése es el caso normal cuando el reductor se proyecta a sí mismo para
   * ejercer el «sólo si», donde no hay mesa que preguntar. Es texto degradado y no
   * texto roto, que es lo que hace falta.
   *
   * Y NO ENTRA EN EL ESTADO. Vive sólo en la vista: si estuviera en el estado, la
   * misma partida reejecutada después de que alguien se renombrara daría otro
   * estado y el marcador dejaría de cuadrar.
   */
  nombre: string;
  color: string;
  /** CUÁNTOS bienes tiene. El número es público: se cuentan mirando su montón. */
  bienes: number;
  chozas: LlaveDeVertice[];
  torres: LlaveDeVertice[];
  veredas: LlaveDeArista[];
  /** Sus puntos PÚBLICOS. Los títulos sin revelar no están aquí. Ver `puntosDe`. */
  puntos: number;
  /** El largo de su cadena de veredas. Público: las veredas están a la vista. */
  vado: number;
  /**
   * CUÁNTAS CARTAS TIENE EN LA MANO. El número, no cuáles (§4 del diseño).
   *
   * Mismo trato que `bienes`: se cuentan mirando el montón que tiene delante, y
   * saber que alguien lleva cuatro cartas guardadas es exactamente la información
   * que hace que la mesa se ponga nerviosa a tiempo.
   */
  cartas: number;
  /** Cuántas guardias ha jugado. Público: es lo que hace ver venir el premio. */
  guardias: number;
  /** Los títulos que ha revelado. Públicos, y un punto cada uno. */
  titulos: Titulo[];
}

/**
 * LA VISTA. Un solo tipo para el asiento y para el espectador, y CERRADO.
 *
 * Cerrado y no `Record<string, unknown>` porque es la mitad de la defensa de los
 * secretos, y la mitad que aguanta el paso del tiempo. La otra —buscar los
 * valores de `loSecreto` dentro de lo que sale— sólo caza lo que es
 * distinguible; un campo nuevo que alguien añada con la mejor intención dentro de
 * seis meses lo caza un tipo cerrado que se contrasta campo a campo contra lo que
 * de verdad sale por la red.
 */
export interface VistaDeRiberas {
  desde: 'riberas';
  momento: MomentoDeRiberas;
  colonos: ColonoVisto[];
  islas: Isla[];
  /** A quién le toca, o `null` si no le toca a nadie. */
  turnoDe: AsientoId | null;
  paso: number;
  faltaVereda: boolean;
  ultimaChoza: LlaveDeVertice | null;
  tirado: boolean;
  ultimaTirada: number;
  /** Los trueques. PÚBLICOS: una oferta se dice en voz alta. */
  tratos: Trato[];
  vado: Vado;
  /** El segundo premio. Público entero, como el Vado. */
  guardia: Guardia;
  /** Cuántas cartas quedan en el mazo. Público: un mazo se cuenta (§1.3). */
  mazo: number;
  /** ¿Se ha jugado ya una carta en este turno? Público: se jugó en voz alta. */
  cartaJugada: boolean;
  /**
   * CUÁNTOS TURNOS SE HAN ABIERTO. Público, y hace falta en la vista.
   *
   * Sin él, `opciones()` no podría saber si una carta de MI mano es de este turno o
   * del anterior: el sello vive en la carta y sólo significa algo comparado con
   * este contador. Y no es un secreto de nadie — cuántos turnos se han jugado lo
   * sabe cualquiera que esté mirando la mesa.
   */
  turnosAbiertos: number;
  /** Cuántas veredas gratis quedan por alzar. Pública, como la carta que las dio. */
  veredasGratis: number;
  /** Quién soy yo aquí, o `null` si miro sin asiento. */
  yo: AsientoId | null;
  /**
   * MIS FICHAS, y sólo las mías.
   *
   * Vacía para el espectador y para quien no juegue esta partida. No va marcada
   * como oculta ni tapada con asteriscos: sencillamente NO SE ENVÍA, que es la
   * doctrina que este repositorio ya tenía escrita. Una ficha que viaja marcada
   * como oculta es una ficha destapada con un adorno: el móvil de quien juega es
   * un entorno hostil y basta con abrir las herramientas del navegador.
   */
  misFichas: Ficha[];
  /**
   * MI MANO DE CARTAS, y sólo la mía. Mismo trato que `misFichas`.
   *
   * Vacía para el espectador y para quien no juegue esta partida. No viaja tapada
   * ni contada: sencillamente no se envía. Que la vista de otro no las traiga «ni
   * por asomo» lo comprueba `verify:mesa` sobre el cable de verdad, y lo comprueba
   * porque cada carta lleva número de serie — ver `Carta`.
   */
  misCartas: CartaEnMano[];
  /**
   * MIS PUNTOS CON LO OCULTO DENTRO. Sólo míos (§1.6 y §4 del diseño).
   *
   * Es `puntos` del colono propio más los títulos que sigo teniendo en la mano. Los
   * demás ven mis públicos y yo veo los dos números, que es lo que permite que la
   * pantalla distinga «lo que se ve» de «lo que sólo cuento yo».
   *
   * Cero para quien mira sin asiento.
   */
  misPuntos: number;
  ganadores: AsientoId[];
  /** El tablero YA RESUELTO, para el mueble genérico. Ver `tableroDeRiberas`. */
  tablero: TableroDeclarado;
}

/** La vista sin el tablero: lo que de verdad tapa la proyección. */
type VistaSinTablero = Omit<VistaDeRiberas, 'tablero'>;

/**
 * EL TAPADO. Todo lo público, más lo mío y nada de lo ajeno.
 *
 * Ni el azar sale por aquí, y eso no es cosmético: quien tenga la semilla y el
 * acumulador calcula todas las tiradas que quedan.
 */
function loQueSeVe(
  estado: EstadoDeRiberas,
  quien: QuienMira,
  sentados: LosSentados,
): VistaSinTablero {
  const mio =
    quien === ESPECTADOR ? undefined : estado.colonos.find((c) => c.asiento === quien);

  return {
    desde: 'riberas',
    momento: estado.momento,
    colonos: estado.colonos.map((c) => ({
      asiento: c.asiento,
      nombre: comoSeLlama(sentados, c.asiento),
      color: c.color,
      bienes: c.almacen.length,
      chozas: [...c.chozas],
      torres: [...c.torres],
      veredas: [...c.veredas],
      puntos: puntosDe(estado, c),
      vado: largoDelVado(c.veredas, bloqueadosPara(estado.colonos, c.asiento)),
      /* CUÁNTAS, no cuáles: la mano es de su dueño y el montón se ve desde fuera. */
      cartas: c.mano.length,
      guardias: c.guardias,
      titulos: [...c.titulos],
    })),
    islas: estado.islas.map((i) => ({ hex: { q: i.hex.q, r: i.hex.r }, terreno: i.terreno, numero: i.numero })),
    turnoDe: asientoDelTurno(estado),
    paso: estado.paso,
    faltaVereda: estado.faltaVereda,
    ultimaChoza: estado.ultimaChoza,
    tirado: estado.tirado,
    ultimaTirada: estado.ultimaTirada,
    tratos: estado.tratos.map((t) => ({ ...t, da: [...t.da], pide: [...t.pide] })),
    vado: { de: estado.vado.de, largo: estado.vado.largo },
    guardia: { de: estado.guardia.de, cuantas: estado.guardia.cuantas },
    /*
     * DEL MAZO SALE EL NÚMERO Y NUNCA LA LISTA. Contar lo que queda es información
     * legítima —§1.3— y el orden de lo que queda es la partida entera por venir.
     */
    mazo: estado.mazo.length,
    cartaJugada: estado.cartaJugada,
    turnosAbiertos: estado.turnosAbiertos,
    veredasGratis: estado.veredasGratis,
    yo: quien === ESPECTADOR ? null : quien,
    misFichas: mio === undefined ? [] : [...mio.almacen],
    misCartas: mio === undefined ? [] : mio.mano.map((m) => ({ ...m })),
    misPuntos: mio === undefined ? 0 : puntosDe(estado, mio) + puntosOcultosDe(mio),
    ganadores: [...estado.ganadores],
  };
}

/** El asiento a quien le toca, o `null`. */
function asientoDelTurno(estado: EstadoDeRiberas): AsientoId | null {
  const i = turnoDe(estado);
  if (i < 0) return null;
  return (estado.colonos[i] as Colono | undefined)?.asiento ?? null;
}

/**
 * LA PROYECCIÓN que se registra en el motor: el tapado más el tablero pintado.
 *
 * El tablero va DENTRO de la vista y no lo compone la app, y ésa es la decisión
 * que hace que `tablero` sea un mueble genérico de verdad: un arcade que viniera
 * de fuera del binario no puede mandar código al móvil, así que si el dibujo se
 * compusiera allí, «genérico» significaría «genérico para los juegos que ya
 * están dentro». Lo que viaja es una lista de polígonos, líneas, nudos y botones,
 * y el mueble los pinta sin saber qué son.
 */
export function proyectarRiberas(
  estado: EstadoDeRiberas | undefined,
  quien: QuienMira,
  sentados: LosSentados = NADIE_SENTADO,
): VistaDeRiberas {
  const base = loQueSeVe(comoSiSiempreHubieraHabidoMazo(estado ?? partidaNueva()), quien, sentados);
  return { ...base, tablero: tableroDeRiberas(base, quien) };
}

/**
 * CÓMO SE LLAMA ESTE ASIENTO, SEGÚN LA VISTA. Y sólo según la vista.
 *
 * Los nombres llegan a la vista dentro de cada colono, así que todo lo que se
 * escriba a partir de aquí —los paneles, el aviso, la ayuda de un trueque— sale de
 * lo que la proyección dejó pasar y de nada más. Es la misma regla que gobierna
 * `opciones()` y por el mismo motivo: si esto mirara el estado, sería una segunda
 * proyección con su propio tapado.
 *
 * Un asiento que no esté entre los colonos —alguien que se fue, un ganador de una
 * partida vieja— se queda con su identificador, que es feo y legible.
 */
function nombreEnLaVista(v: VistaSinTablero, asiento: AsientoId): string {
  for (const c of v.colonos) {
    if (c.asiento === asiento) return c.nombre.length > 0 ? c.nombre : asiento;
  }
  return asiento;
}

/**
 * LO QUE JAMÁS PUEDE SALIR EN LA PROYECCIÓN DE OTRO ASIENTO. Sólo para pruebas.
 *
 * El motor no la llama nunca: la llama `verify:mesa`. Sin ella, este juego podría
 * registrar la identidad como proyección, pasar todos los comprobadores en verde
 * y mandarle a los seis móviles los seis almacenes.
 *
 * Cómo se lee la lista: el contrato dice «los valores que jamás pueden aparecer
 * en la proyección de OTRO asiento», y la comprobación que sirve para los tres
 * juegos que ya existen es
 *
 *     NINGÚN VALOR SECRETO PUEDE APARECER EN LA VISTA DE MÁS DE UN ASIENTO.
 *
 * Aquí cada ficha aparece en la vista de UNO —su dueño— y en ninguna otra, que es
 * el caso de La Ronda. El azar no aparece en ninguna, que es el caso de La Frente.
 * Los dos son correctos y la misma regla los cubre.
 *
 * Y por eso las fichas llevan número de serie: dos colonos con el mismo montón
 * producirían el mismo valor secreto, que aparecería legítimamente en dos vistas
 * y pondría rojo un comprobador sin que hubiera pasado nada. Ver `Ficha`.
 */
export function loSecretoDeRiberas(estado: EstadoDeRiberas | undefined): unknown[] {
  const e = comoSiSiempreHubieraHabidoMazo(estado ?? partidaNueva());
  const secretos: unknown[] = [e.azar];
  for (const c of e.colonos) {
    for (const ficha of c.almacen) secretos.push(ficha);
    for (const enMano of c.mano) secretos.push(enMano.carta);
  }
  /*
   * ═══ EL MAZO ENTERO ES SECRETO, Y NO APARECE EN NINGUNA VISTA ═══
   *
   * Es el caso de La Frente —el azar no sale en la vista de nadie— y la misma
   * regla lo cubre: «ningún valor secreto puede aparecer en la vista de MÁS DE UN
   * asiento» se cumple de sobra con cero. Declararlo aquí igualmente es lo que
   * convierte en rojo el día que alguien mande el mazo por el cable «para que la
   * pantalla pueda pintar el lomo con las cartas que quedan».
   *
   * Y una carta que se JUEGA no pasa a estar en dos sitios: sale de la mano y lo
   * que queda es un contador. Ver `Colono.guardias`. Un secreto que se vuelve
   * público es un rojo de `verify:mesa` esperando a que alguien juegue esa carta.
   */
  for (const carta of e.mazo) secretos.push(carta);
  return secretos;
}

// ---------------------------------------------------------------------------
// `opciones()`: QUÉ TE PUEDO OFRECER A TI, CON LO QUE TÚ SABES
// ---------------------------------------------------------------------------

/*
 * `Opcion` VIVÍA AQUÍ Y AHORA VIVE EN EL NÚCLEO, con su documentación entera:
 * `shared/arcade/opciones.ts`. Vivía aquí porque en la fase 4 el núcleo no tenía
 * registro para `opciones()` y por tanto no podía tener su tipo; ahora sí lo
 * tiene, y un tipo que aparece en la firma de un alta no puede vivir dentro de
 * uno de los juegos que se dan de alta. La regla del seudónimo por asiento y la
 * de la estabilidad entre revisiones se leen allí, no menos escritas.
 */

/**
 * QUÉ PUEDE HACER `quien` AHORA MISMO, CON LO QUE ÉL SABE.
 *
 * ═══ RECIBE LA VISTA, JAMÁS EL ESTADO (§5 bis) ═══
 *
 * Con el estado, esto sería UNA SEGUNDA PROYECCIÓN con su propio tapado: escrita
 * dos veces, probada la mitad, y `verify:mesa` no la mira. Recibiendo la vista NO
 * PUEDE ofrecer nada que la proyección no hubiera dejado pasar. Es imposible por
 * construcción y no por disciplina, que es la única forma de garantía que este
 * motor acepta.
 *
 * La consecuencia práctica está en el trueque y es el contraejemplo entero del
 * «si y sólo si»: se puede ofrecer «aceptar» mirando MI almacén, y no se puede
 * comprobar el del oferente porque no está aquí. El reductor lo comprueba después
 * con todo lo que hay. Ver `contestar`.
 *
 * ═══ RECIBE `unknown` Y MIRA ANTES DE CREÉRSELO ═══
 *
 * Porque lo que le llega en el móvil es lo que vino por la red, que es `unknown`
 * por contrato —`vistaDeAsiento` devuelve `unknown` porque el motor no interpreta
 * el estado—. Mirarlo aquí una vez es más barato que repartir aserciones.
 */
export function opcionesDeRiberas(vista: unknown, quien: QuienMira): readonly Opcion[] {
  const v = comoVista(vista);
  if (v === null) return [];
  if (quien === ESPECTADOR) return [];

  if (v.momento === 'reuniendo') return opcionesDeReunion();
  if (v.momento === 'colocando') return opcionesDeColocacion(v, quien);
  if (v.momento === 'jugando') return opcionesDeTurno(v, quien);
  return [];
}

/**
 * Mira si esto tiene forma de vista de Riberas. Con o sin tablero: da igual.
 *
 * ═══ LO DEL MAZO SE NORMALIZA EN VEZ DE EXIGIRSE, Y HAY QUE SABER POR QUÉ ═══
 *
 * Lo que le llega a esto es `unknown` de verdad: viene por la red, y quien la
 * manda puede ser un cliente de la versión de ayer o un banco de pruebas que monta
 * una vista a mano —`vistaDePrueba`, en `riberas-en-3d.ts`, existe justamente para
 * probar los anillos del tablero sin partida—. Si los campos del mazo entraran en
 * las cuatro guardas de arriba, a una vista sin ellos se le devolvería `null` y el
 * juego ENTERO se apagaría: ni fundar, ni alzar, ni pasar. Un campo que falta
 * apagaría las reglas que no tienen nada que ver con él.
 *
 * Así que los campos que decidían si hay juego siguen siendo los de siempre, y los
 * del mazo se rellenan con «no hay mazo»: sin cartas no se ofrece ninguna opción de
 * carta, que es exactamente lo correcto. Lo que NO se hace es inventarse colonos ni
 * islas: eso sí cambiaría qué se puede hacer.
 */
function comoVista(vista: unknown): VistaSinTablero | null {
  if (typeof vista !== 'object' || vista === null) return null;
  const v = vista as Partial<VistaSinTablero>;
  if (v.desde !== 'riberas') return null;
  if (!Array.isArray(v.colonos) || !Array.isArray(v.islas)) return null;
  if (!Array.isArray(v.misFichas)) return null;
  if (!Array.isArray(v.tratos)) return null;
  return {
    ...(v as VistaSinTablero),
    colonos: v.colonos.map((c) => ({
      ...c,
      cartas: typeof c.cartas === 'number' ? c.cartas : 0,
      guardias: typeof c.guardias === 'number' ? c.guardias : 0,
      titulos: Array.isArray(c.titulos) ? c.titulos : [],
    })),
    misCartas: Array.isArray(v.misCartas) ? v.misCartas : [],
    misPuntos: typeof v.misPuntos === 'number' ? v.misPuntos : 0,
    mazo: typeof v.mazo === 'number' ? v.mazo : 0,
    cartaJugada: v.cartaJugada === true,
    turnosAbiertos: typeof v.turnosAbiertos === 'number' ? v.turnosAbiertos : 0,
    veredasGratis: typeof v.veredasGratis === 'number' ? v.veredasGratis : 0,
    guardia:
      typeof v.guardia === 'object' && v.guardia !== null ? v.guardia : { de: null, cuantas: 0 },
  };
}

/**
 * Mientras se reúne la mesa, lo único que se puede hacer es empezar.
 *
 * ═══ SE OFRECE SIN COMPROBAR EL AFORO, Y ESO ES EL «SÓLO SI» EN ACCIÓN ═══
 *
 * Cuánta gente hay sentada NO está en la vista y no puede estarlo: los asientos
 * viven en el contexto del movimiento, que la proyección no recibe. Copiarlos al
 * estado se intentó y no vale —está contado en `EstadoDeRiberas`—, porque una mesa
 * recién abierta no tiene estado y la copia nace vacía.
 *
 * Así que se ofrece a cualquiera que tenga asiento, y `repartirElDelta` comprueba
 * el aforo con `ctx.asientos`. Ofrecer de más es EXACTAMENTE lo que el «sólo si»
 * permite: el reductor rechaza lo que no se ofreció y sigue validando lo que sí.
 * Con el bicondicional, esta mesa no podría arrancar nunca.
 */
function opcionesDeReunion(): readonly Opcion[] {
  return [
    {
      id: 'empezar',
      tipo: EMPEZAR,
      carga: {},
      rotulo: 'Repartir el delta',
      ayuda: `Hacen falta entre ${MANIFIESTO_RIBERAS.jugadores.minimo} y ${MANIFIESTO_RIBERAS.jugadores.maximo} sentados. A partir de aquí no entra nadie más.`,
    },
  ];
}

/** En la serpentina: o funda una choza, o traza su primera vereda. */
function opcionesDeColocacion(v: VistaSinTablero, quien: AsientoId): readonly Opcion[] {
  if (v.turnoDe !== quien) return [];
  const opciones: Opcion[] = [];

  if (!v.faltaVereda) {
    for (const vertice of verticesDe(v.islas.map((i) => i.hex))) {
      if (!libreYSeparado(v, vertice)) continue;
      opciones.push({
        id: `fundar:${vertice}`,
        tipo: FUNDAR,
        carga: { vertice },
        rotulo: 'Fundar aquí',
        ayuda: 'Ninguna choza puede tocar a otra por una vereda.',
      });
    }
    return opciones;
  }

  const desde = v.ultimaChoza;
  if (desde === null) return [];
  const aristas = aristasDe(v.islas.map((i) => i.hex));
  for (const arista of aristasDeVertice(desde)) {
    if (!aristas.includes(arista)) continue;
    if (aristaTomada(v, arista)) continue;
    opciones.push({
      id: `vereda:${arista}`,
      tipo: ALZAR,
      carga: { que: 'vereda', donde: arista },
      rotulo: 'Trazar la vereda',
      ayuda: 'Sale de la choza que acabas de fundar. En la colocación es gratis.',
    });
  }
  return opciones;
}

/** El turno de verdad: tirar, alzar, trocar, contestar y pasar. */
function opcionesDeTurno(v: VistaSinTablero, quien: AsientoId): readonly Opcion[] {
  const opciones: Opcion[] = [];
  const mio = v.colonos.find((c) => c.asiento === quien);
  if (mio === undefined) return [];

  /*
   * LO QUE SE PUEDE HACER SIN TENER EL TURNO, Y ES LO QUE TENSIONA EL MOTOR.
   * Contestar a un trueque va PRIMERO porque es lo único que se ofrece a quien no
   * le toca, y ponerlo aquí arriba evita que alguien lo meta dentro del `if` del
   * turno al añadir la siguiente opción.
   */
  for (const trato of v.tratos) {
    if (trato.estado !== 'propuesta') continue;
    if (trato.para !== quien) continue;
    opciones.push({
      id: `rechazar:${trato.id}`,
      tipo: RECHAZAR,
      carga: { trato: trato.id },
      rotulo: `Rechazar el trueque ${trato.id}`,
      ayuda: `${nombreEnLaVista(v, trato.de)} te ofrece ${listar(trato.da)} por ${listar(trato.pide)}.`,
    });
    /*
     * SE OFRECE ACEPTAR SI YO TENGO LO QUE SE ME PIDE, y no se comprueba que el
     * oferente tenga lo que promete: SU ALMACÉN NO ESTÁ EN MI VISTA. Ése es el
     * contraejemplo del «si y sólo si» del §5 bis, escrito en el sitio donde
     * ocurre. El reductor lo vuelve a validar con todo lo que hay.
     */
    if (!llegaPara(v.misFichas, trato.pide)) continue;
    opciones.push({
      id: `aceptar:${trato.id}`,
      tipo: ACEPTAR,
      carga: { trato: trato.id },
      rotulo: `Aceptar el trueque ${trato.id}`,
      ayuda: `Le das ${listar(trato.pide)} y te da ${listar(trato.da)}.`,
    });
  }

  if (v.turnoDe !== quien) return opciones;

  if (!v.tirado) {
    opciones.push({
      id: 'tirar',
      tipo: TIRAR,
      carga: {},
      rotulo: 'Tirar los dados',
      ayuda: 'Las islas con esa suma rinden a quien las toca. Con siete no rinde nadie.',
    });
    /*
     * REVELAR TAMBIÉN AQUÍ, ANTES DE TIRAR, y va después de `tirar` en la lista a
     * propósito: quien recorre las opciones de arriba abajo —un comprobador, un
     * cliente tonto— tiene que encontrarse primero lo que mueve la partida.
     *
     * Que se ofrezca antes de tirar no es un capricho: los puntos con los que se
     * gana son los públicos, así que quien tiene el octavo en un título tiene que
     * poder enseñarlo en cualquier momento de su turno. Ver `revelarUnTitulo`.
     */
    opciones.push(...opcionesDeRevelar(v));
    return opciones;
  }

  /*
   * ═══ LAS DOS VEREDAS MANDAN MIENTRAS QUEDEN, Y NO SE OFRECE NADA MÁS ═══
   *
   * Es el mismo corte que hace la colocación con `faltaVereda`: quien tiene una
   * vereda pendiente no puede hacer otra cosa hasta ponerla. La alternativa —dejar
   * abierto todo el turno un crédito de dos veredas— convierte una carta en algo
   * que hay que recordar, y nadie que mire el tablero sabría que existe.
   *
   * Revelar sí sigue ofreciéndose, por lo mismo de arriba: no es una jugada.
   */
  if (v.veredasGratis > 0) {
    opciones.push(...opcionesDeVeredaGratis(v, mio));
    opciones.push(...opcionesDeRevelar(v));
    return opciones;
  }

  const aristas = aristasDe(v.islas.map((i) => i.hex));
  const vertices = verticesDe(v.islas.map((i) => i.hex));

  /*
   * ═══ LOS TOPES SE MIRAN AQUÍ, Y NO ES UN CASO DEL «SÓLO SI» ═══
   *
   * Los tres bloques que siguen comprueban su tope, y los tres tienen que hacerlo.
   * Durante un tiempo sólo lo hizo el de la torre, y las consecuencias no eran
   * teóricas: un colono con las doce veredas puestas seguía recibiendo opciones de
   * vereda, que en el móvil se pintan EN NEÓN con el trazo engordado y pulsable.
   * Se tocaba, el servidor contestaba 200, la revisión no subía y no pasaba nada.
   * Una pieza encendida que no responde es el fallo que no se cae, no lanza y no
   * se ve hasta que alguien lleva media partida. Medido antes de arreglarlo: 2.834
   * movimientos ofrecidos y devueltos sin cambio en cinco partidas.
   *
   * Y no vale defenderlo con el «sólo si» del §5 bis. Esa regla existe para lo que
   * el ofertante NO PUEDE VER —el almacén ajeno en `contestar`, el aforo de la
   * mesa en `opcionesDeReunion`—, y aquí no hay nada tapado: `mio.veredas`,
   * `mio.chozas` y `mio.torres` están en la vista, son públicos y se cuentan
   * mirando el tablero. Ofrecer de más cuando se puede mirar no es ejercer un
   * derecho: es un descuido con permiso.
   *
   * Las guardas están escritas contra las MISMAS cuentas que aplica el reductor
   * —`trazar` mira `veredas.length`, `sePuedeFundarEn` mira `chozas + torres`
   * contra la suma de los dos topes, `levantarTorre` mira `torres.length`— para
   * que si un día se toca una, la otra salte en la revisión y no en la partida.
   */
  if (llegaPara(v.misFichas, COSTES.vereda) && mio.veredas.length < TOPE_DE_PIEZAS.vereda) {
    for (const arista of aristas) {
      if (aristaTomada(v, arista)) continue;
      if (!pegaConLoSuyo(v, mio, arista)) continue;
      opciones.push({
        id: `vereda:${arista}`,
        tipo: ALZAR,
        carga: { que: 'vereda', donde: arista },
        rotulo: 'Trazar vereda',
        ayuda: `Cuesta ${listar(COSTES.vereda)}.`,
      });
    }
  }

  /*
   * La choza mira la suma de las dos piezas de vértice y no sólo las chozas,
   * porque es lo que mira `sePuedeFundarEn`: una torre nace de una choza, así que
   * lo que se agota es el total de sitios ocupados, no cada montón por su cuenta.
   */
  if (
    llegaPara(v.misFichas, COSTES.choza) &&
    mio.chozas.length + mio.torres.length < TOPE_DE_PIEZAS.choza + TOPE_DE_PIEZAS.torre
  ) {
    for (const vertice of vertices) {
      if (!libreYSeparado(v, vertice)) continue;
      if (!cuelgaDeUnaVereda(mio, vertice)) continue;
      opciones.push({
        id: `fundar:${vertice}`,
        tipo: FUNDAR,
        carga: { vertice },
        rotulo: 'Fundar choza',
        ayuda: `Cuesta ${listar(COSTES.choza)} y tiene que colgar de una vereda tuya.`,
      });
    }
  }

  if (llegaPara(v.misFichas, COSTES.torre) && mio.torres.length < TOPE_DE_PIEZAS.torre) {
    for (const vertice of mio.chozas) {
      opciones.push({
        id: `torre:${vertice}`,
        tipo: ALZAR,
        carga: { que: 'torre', donde: vertice },
        rotulo: 'Levantar torre',
        ayuda: `Cuesta ${listar(COSTES.torre)}. Rinde el doble y vale dos puntos.`,
      });
    }
  }

  opciones.push(...opcionesDeTrueque(v, mio));
  opciones.push(...opcionesDelMazo(v, mio));
  /*
   * REVELAR SALE POR LOS TRES CAMINOS DEL TURNO —antes de tirar, con veredas de la
   * carta pendientes y aquí—, y eso es lo que quiere decir «siempre». Escrito tres
   * veces y no una porque los otros dos caminos SE VAN por su `return`: meterlo en
   * un solo sitio significaría no ofrecerlo en dos tercios del turno, y con el
   * octavo punto guardado en un título eso es una mano con la que no se puede ganar.
   */
  opciones.push(...opcionesDeRevelar(v));

  opciones.push({
    id: 'pasar',
    tipo: PASAR,
    carga: {},
    rotulo: 'Pasar el turno',
    ayuda: 'Los trueques que sigan abiertos caducan.',
  });
  return opciones;
}

/**
 * LAS VEREDAS DE LA CARTA: las mismas de siempre, sin cobrar.
 *
 * Se ofrecen exactamente donde se ofrecerían pagándolas —sin mirar el almacén, que
 * es lo único que cambia— y con el MISMO `id` y la MISMA carga que la vereda
 * normal. Que el identificador sea el mismo no es descuido: el sitio es el mismo, y
 * el tablero declarado busca `vereda:${arista}` para saber qué línea se puede
 * tocar. Dos identificadores para la misma línea harían que el mapa dejara de
 * encenderla justo el turno en que la carta la regala.
 */
function opcionesDeVeredaGratis(v: VistaSinTablero, mio: ColonoVisto): Opcion[] {
  return sitiosDeVereda(v, mio).map((arista) => ({
    id: `vereda:${arista}`,
    tipo: ALZAR,
    carga: { que: 'vereda', donde: arista },
    rotulo: 'Trazar vereda',
    ayuda:
      v.veredasGratis <= 1
        ? 'La última de la carta, y es gratis.'
        : `Gratis: te quedan ${v.veredasGratis} de la carta.`,
  }));
}

/**
 * DÓNDE PODRÍA ESTE COLONO TRAZAR UNA VEREDA, sin mirar si le llega para pagarla.
 *
 * Es la misma pregunta que `hayDondeTrazar` le hace al estado, hecha sobre la
 * vista. Existe separada de las opciones porque hay dos sitios que necesitan la
 * respuesta y sólo uno necesita los botones: Las Dos Veredas se ofrece únicamente
 * si hay al menos un sitio, y contar botones para saberlo sería fabricar una lista
 * para tirarla.
 */
function sitiosDeVereda(v: VistaSinTablero, mio: ColonoVisto): LlaveDeArista[] {
  if (mio.veredas.length >= TOPE_DE_PIEZAS.vereda) return [];
  const sitios: LlaveDeArista[] = [];
  for (const arista of aristasDe(v.islas.map((i) => i.hex))) {
    if (aristaTomada(v, arista)) continue;
    if (!pegaConLoSuyo(v, mio, arista)) continue;
    sitios.push(arista);
  }
  return sitios;
}

/**
 * REVELAR UN TÍTULO. Siempre en el turno propio, y nunca con el título en el `id`.
 *
 * ═══ ÉSTA ES LA OPCIÓN QUE MÁS FÁCIL SE ESCRIBE MAL, Y ESTÁ AVISADO ═══
 *
 * Lo natural es `id: 'revelar:molino'`, que se lee de maravilla al depurar y
 * publica QUÉ TÍTULO TENGO — que es secreto hasta que lo enseñe—. Y `verify:mesa`
 * no lo cazaría: busca la forma canónica del secreto, `"c7:molino"`, y esa cadena
 * no está ahí. Es literalmente el agujero que el §5 bis describe con su propio
 * ejemplo.
 *
 * Así que el `id` lleva el SEUDÓNIMO de la carta y nada más. El rótulo sí nombra el
 * título, y eso es correcto y está autorizado en la cabecera de `Opcion.rotulo`:
 * las opciones se calculan sobre LA VISTA DE UN OBSERVADOR y esta carta ya está en
 * `misCartas`, que es suya. Lo que no se puede es nombrar algo de otro.
 */
function opcionesDeRevelar(v: VistaSinTablero): Opcion[] {
  const opciones: Opcion[] = [];
  for (const enMano of v.misCartas) {
    const clase = claseDeLaCarta(enMano.carta);
    if (clase === null || !esTitulo(clase)) continue;
    const suyo = seudonimoDeLaCarta(enMano.carta);
    opciones.push({
      id: `revelar:${suyo}`,
      tipo: REVELAR,
      carga: { carta: suyo },
      rotulo: `Revelar ${NOMBRE_DE_LA_CARTA[clase]}`,
      ayuda: 'Vale un punto, y a la vista de todos. No cuenta como jugar una carta.',
    });
  }
  return opciones;
}

/**
 * COMPRAR, Y JUGAR LO QUE SE PUEDA JUGAR.
 *
 * ═══ QUÉ SE COMPRUEBA AQUÍ Y QUÉ NO, QUE ES LA MITAD DEL §5 bis ═══
 *
 * Se comprueba todo lo que está EN MI VISTA: que me llegue el coste (mi almacén es
 * mío), que quede mazo (el número es público), que no haya jugado ya una carta
 * (público), que la carta no sea de este turno (el sello viaja en mi propia mano) y
 * —para la guardia— que a quien voy a robar le quede algo, porque cuántos bienes
 * tiene cada cual es público.
 *
 * Y NO se comprueba lo que no puedo ver: al acaparar se ofrecen los cinco bienes
 * aunque nadie tenga ninguno. Filtrar por lo que los demás tienen sería publicar
 * sus almacenes en una lista de botones — la fuga más barata de todas, y por una
 * puerta que ningún comprobador de secretos mira.
 */
function opcionesDelMazo(v: VistaSinTablero, mio: ColonoVisto): Opcion[] {
  const opciones: Opcion[] = [];

  if (v.mazo > 0 && llegaPara(v.misFichas, COSTE_DE_LA_CARTA)) {
    opciones.push({
      id: 'comprar',
      tipo: COMPRAR,
      carga: {},
      rotulo: 'Comprar una carta',
      ayuda: `Cuesta ${listar(COSTE_DE_LA_CARTA)}. Quedan ${v.mazo} en el mazo, y no se juega hasta tu turno siguiente.`,
    });
  }

  for (const enMano of v.misCartas) {
    const clase = claseDeLaCarta(enMano.carta);
    if (clase === null || esTitulo(clase)) continue;
    /* Una por turno, y nunca la de hoy. Las dos reglas, mirando lo que veo yo. */
    if (v.cartaJugada) continue;
    if (enMano.comprada >= v.turnosAbiertos) continue;

    const suyo = seudonimoDeLaCarta(enMano.carta);
    const como = NOMBRE_DE_LA_CARTA[clase];

    if (clase === 'guardia') {
      for (const otro of v.colonos) {
        if (otro.asiento === mio.asiento) continue;
        /* A quien no tiene nada no se le roba: es público cuántos bienes tiene. */
        if (otro.bienes === 0) continue;
        opciones.push({
          id: `jugar-guardia:${suyo}:${otro.asiento}`,
          tipo: GUARDIA,
          carga: { carta: suyo, a: otro.asiento },
          rotulo: `${como}: robar a ${nombreEnLaVista(v, otro.asiento)}`,
          ayuda: 'Le quitas un bien al azar. Cuenta para La Mayor Guardia.',
        });
      }
      continue;
    }

    if (clase === 'ano-bueno') {
      /*
       * LOS PARES SIN REPETIR: `sal y grano` y `grano y sal` son la misma jugada, y
       * ofrecerla dos veces sería pintar dos botones que hacen lo mismo. Se recorre
       * con el segundo índice desde el primero, que además deja el par `sal y sal`
       * dentro — dos iguales es legal y es la mitad de la gracia de la carta.
       */
      for (let a = 0; a < BIENES.length; a++) {
        for (let b = a; b < BIENES.length; b++) {
          const uno = BIENES[a] as Bien;
          const otro = BIENES[b] as Bien;
          opciones.push({
            id: `jugar-ano:${suyo}:${uno}:${otro}`,
            tipo: ANO_BUENO,
            carga: { carta: suyo, bienes: [uno, otro] },
            rotulo: `${como}: coger ${listar([uno, otro])}`,
            ayuda: 'Salen del arcón, no de nadie.',
          });
        }
      }
      continue;
    }

    if (clase === 'acaparamiento') {
      for (const bien of BIENES) {
        opciones.push({
          id: `jugar-acaparar:${suyo}:${bien}`,
          tipo: ACAPARAMIENTO,
          carga: { carta: suyo, bien },
          rotulo: `${como}: pedir ${bien}`,
          ayuda: 'Todos los demás te dan los que tengan de ése, y puede que no tengan ninguno.',
        });
      }
      continue;
    }

    /*
     * LAS DOS VEREDAS, y sólo si hay dónde poner al menos una: es público, se ve
     * mirando el tablero, y una carta que se gasta sin poner nada es una carta que
     * se pierde por un descuido de esta función.
     */
    if (sitiosDeVereda(v, mio).length === 0) continue;
    opciones.push({
      id: `jugar-veredas:${suyo}`,
      tipo: DOS_VEREDAS,
      carga: { carta: suyo },
      rotulo: `${como}`,
      ayuda: `Alzas ${VEREDAS_DE_LA_CARTA} veredas sin pagarlas, una detrás de otra.`,
    });
  }

  return opciones;
}

/**
 * LOS TRUEQUES QUE SE PUEDEN PROPONER.
 *
 * Uno por uno y sólo de lo que me sobra por lo que no tengo. Uno por uno es una
 * REGLA de este juego y está escrita en `BIENES_POR_LADO_DEL_TRUEQUE`, con el
 * porqué: la combinatoria completa —cualquier montón por cualquier montón— son
 * miles de opciones, y una lista de miles de botones no es una interfaz.
 *
 * Aquí NO hay ningún ejemplo del «sólo si» del §5 bis, y esta línea llegó a decir
 * que sí lo había: decía que «el reductor acepta trueques más ricos que los que se
 * ofrecen aquí», describiendo un camino que con el portillo delante no puede
 * recorrer nadie. El «sólo si» de este juego está tres funciones más abajo, en
 * `contestar`, y es el de verdad: se ofrece ACEPTAR mirando sólo mi almacén, y el
 * reductor lo vuelve a validar mirando también el del oferente, que no está en mi
 * vista. Ése no se puede quitar sin filtrar la mano ajena.
 *
 * Ojo, y es lo que hace que esta lista sea segura de publicar: se recorre
 * `BIENES` —la lista pública de clases— y NUNCA `misFichas`, así que ni un
 * identificador de los que salen de aquí lleva dentro una ficha.
 */
function opcionesDeTrueque(v: VistaSinTablero, mio: ColonoVisto): Opcion[] {
  const opciones: Opcion[] = [];
  for (const otro of v.colonos) {
    if (otro.asiento === mio.asiento) continue;
    if (otro.bienes === 0) continue;
    for (const doy of BIENES) {
      if (!llegaPara(v.misFichas, [doy])) continue;
      for (const quiero of BIENES) {
        if (doy === quiero) continue;
        if (llegaPara(v.misFichas, [quiero])) continue;
        opciones.push({
          id: `ofrecer:${otro.asiento}:${doy}:${quiero}`,
          tipo: OFRECER,
          carga: { para: otro.asiento, da: [doy], pide: [quiero] },
          rotulo: `Ofrecer ${doy} por ${quiero}`,
          ayuda: `A ${nombreEnLaVista(v, otro.asiento)}. Caduca al acabar tu turno.`,
        });
      }
    }
  }
  return opciones;
}

/** ¿Está libre este vértice y separado de todo lo demás? Se mira sobre la VISTA. */
function libreYSeparado(v: VistaSinTablero, vertice: LlaveDeVertice): boolean {
  if (verticeTomado(v, vertice)) return false;
  for (const vecino of verticesVecinos(vertice)) {
    if (verticeTomado(v, vecino)) return false;
  }
  return true;
}

/** ¿Hay algo de alguien en este vértice, según la vista? */
function verticeTomado(v: VistaSinTablero, vertice: LlaveDeVertice): boolean {
  for (const c of v.colonos) {
    if (c.chozas.includes(vertice) || c.torres.includes(vertice)) return true;
  }
  return false;
}

/** ¿Hay una vereda de alguien en esta arista, según la vista? */
function aristaTomada(v: VistaSinTablero, arista: LlaveDeArista): boolean {
  for (const c of v.colonos) {
    if (c.veredas.includes(arista)) return true;
  }
  return false;
}

/**
 * ¿ENGANCHA ESTA ARISTA CON ALGO SUYO POR UN VÉRTICE DEL QUE PUEDA SALIR?
 *
 * Es `pegaConLoMio` sobre la vista, línea por línea y con el MISMO corte: la
 * choza ajena impide salir del vértice, no llegar a él.
 *
 * Y la aritmética tiene que ser la misma, no parecida — pero que nadie deduzca de
 * ahí que con arreglar una de las dos basta. Medido, rompiéndolas por separado:
 *
 *   · Sin el corte AQUÍ, el tablero pinta el anillo, el dedo lo toca y la vereda
 *     ENTRA, porque el portillo del §5 bis le pregunta precisamente a esta
 *     función qué se ofrecía.
 *   · Sin el corte ALLÍ no se ve casi nada, porque ese mismo portillo tapa las
 *     guardas de `trazar` — salvo por una rendija: `hayDondeTrazar` usa el juez
 *     del reductor para decidir si el crédito de Las Dos Veredas sigue vivo, y
 *     esa decisión no pasa por el portillo. Un reductor más laxo que la vista
 *     deja el crédito encendido donde no hay dónde ponerlo, `opciones()` corta el
 *     turno entero mientras quede crédito, y al colono deja de ofrecérsele nada:
 *     la mesa se para sin caerse.
 *
 * Las dos mitades entran a la vez o no entra ninguna.
 */
function pegaConLoSuyo(v: VistaSinTablero, mio: ColonoVisto, arista: LlaveDeArista): boolean {
  const bloqueados = bloqueadosPara(v.colonos, mio.asiento);
  for (const vertice of verticesDeArista(arista)) {
    if (bloqueados.includes(vertice)) continue;
    if (mio.chozas.includes(vertice) || mio.torres.includes(vertice)) return true;
    for (const otra of aristasDeVertice(vertice)) {
      if (mio.veredas.includes(otra)) return true;
    }
  }
  return false;
}

/** ¿Cuelga este vértice de una vereda de este colono? */
function cuelgaDeUnaVereda(mio: ColonoVisto, vertice: LlaveDeVertice): boolean {
  for (const arista of aristasDeVertice(vertice)) {
    if (mio.veredas.includes(arista)) return true;
  }
  return false;
}

/** «junco y limo». Para los rótulos, y nada más. */
function listar(bienes: readonly string[]): string {
  if (bienes.length === 0) return 'nada';
  if (bienes.length === 1) return bienes[0] as string;
  return `${bienes.slice(0, -1).join(', ')} y ${bienes[bienes.length - 1] as string}`;
}

// ---------------------------------------------------------------------------
// EL TABLERO DECLARADO
// ---------------------------------------------------------------------------

/** El radio de un hexágono en las unidades del tablero. Sólo pintado. */
const TAMANO_DE_ISLA = 100;

/**
 * PINTA EL DELTA COMO DATO: polígonos, líneas, nudos, botones y paneles.
 *
 * ═══ ESTO NO ES UNA PANTALLA, Y ESA ES LA DIFERENCIA ═══
 *
 * El §7 dice que `tablero` es un mueble genérico y que «el tablero es dato, no
 * reductor». La trampa es grande: si la pantalla supiera qué es un hexágono, qué
 * es una choza y qué es una vereda, no sería un mueble genérico sino la pantalla
 * de Riberas con otro nombre, y el segundo juego de tablero llegaría con un `if`
 * dentro.
 *
 * Aquí se resuelve todo —los puntos de cada polígono, el color de cada pieza y el
 * movimiento que manda cada toque— y el mueble recorre cuatro listas y pinta. No
 * sabe qué pinta y no tiene por qué saberlo.
 *
 * Y se compone A PARTIR DE LA VISTA y de `opciones()`, no del estado: así el
 * dibujo no puede enseñar nada que la proyección hubiera tapado. Una pieza que se
 * puede tocar es exactamente una opción, así que no hay dos listas que
 * desincronizar.
 */
export function tableroDeRiberas(vista: unknown, quien: QuienMira): TableroDeclarado {
  const v = comoVista(vista);
  if (v === null) return tableroVacio('Esta vista no es de Riberas.');
  if (v.islas.length === 0) {
    return tableroVacio(
      'El delta está sin repartir. Cualquiera de los sentados puede empezar, y hace falta ' +
        `que haya entre ${MANIFIESTO_RIBERAS.jugadores.minimo} y ${MANIFIESTO_RIBERAS.jugadores.maximo}.`,
      opcionesDeRiberas(v, quien),
    );
  }

  const opciones = opcionesDeRiberas(v, quien);
  const porSitio = new Map<string, Opcion>();
  for (const o of opciones) {
    /*
     * La PRIMERA opción de cada sitio gana. Hoy no hay dos opciones distintas
     * sobre el mismo vértice —fundar y levantar torre son excluyentes— y está
     * escrito así para que el día que las haya, el tablero elija de forma
     * estable en vez de según el orden de recorrido.
     */
    if (!porSitio.has(o.id)) porSitio.set(o.id, o);
  }

  const hexes = v.islas.map((i) => i.hex);

  const caras: CaraDeTablero[] = v.islas.map((isla) => ({
    id: llaveDeHex(isla.hex),
    puntos: esquinasDeHex(isla.hex, TAMANO_DE_ISLA).map((p) => ({ x: p.x, y: p.y })),
    relleno: COLOR_DEL_TERRENO[isla.terreno],
    borde: '#1d1f26',
    rotulo: NOMBRE_DEL_TERRENO[isla.terreno],
    cifra: isla.numero === 0 ? '' : String(isla.numero),
    destacada: isla.numero !== 0 && isla.numero === v.ultimaTirada,
    toque: null,
  }));

  const lineas: LineaDeTablero[] = [];
  for (const arista of aristasDe(hexes)) {
    const extremos = verticesDeArista(arista);
    const uno = puntoDeVertice(extremos[0] as LlaveDeVertice, TAMANO_DE_ISLA);
    const otro = puntoDeVertice(extremos[1] as LlaveDeVertice, TAMANO_DE_ISLA);
    const dueno = v.colonos.find((c) => c.veredas.includes(arista));
    const ofrecida = porSitio.get(`vereda:${arista}`);
    lineas.push({
      id: arista,
      desde: { x: uno.x, y: uno.y },
      hasta: { x: otro.x, y: otro.y },
      color: dueno === undefined ? '#3a3f4b' : dueno.color,
      grosor: dueno === undefined ? 3 : 10,
      tenue: dueno === undefined,
      toque: ofrecida === undefined ? null : { tipo: ofrecida.tipo, carga: ofrecida.carga },
    });
  }

  const nudos: NudoDeTablero[] = [];
  for (const vertice of verticesDe(hexes)) {
    const punto = puntoDeVertice(vertice, TAMANO_DE_ISLA);
    const conTorre = v.colonos.find((c) => c.torres.includes(vertice));
    const conChoza = v.colonos.find((c) => c.chozas.includes(vertice));
    const ofrecido = porSitio.get(`fundar:${vertice}`) ?? porSitio.get(`torre:${vertice}`);
    const dueno = conTorre ?? conChoza;
    nudos.push({
      id: vertice,
      punto: { x: punto.x, y: punto.y },
      color: dueno === undefined ? '#5a6070' : dueno.color,
      radio: conTorre !== undefined ? 20 : conChoza !== undefined ? 15 : ofrecido === undefined ? 5 : 11,
      forma: conTorre !== undefined ? 'cuadrado' : 'redondo',
      tenue: dueno === undefined,
      toque: ofrecido === undefined ? null : { tipo: ofrecido.tipo, carga: ofrecido.carga },
    });
  }

  /*
   * LO QUE NO SE PUEDE TOCAR SOBRE EL TABLERO va como botón: empezar, tirar,
   * pasar, y los trueques —proponerlos, aceptarlos y rechazarlos—. Un trueque no
   * tiene sitio en el mapa, y forzarlo a tener uno sería inventar geometría para
   * una regla que no la tiene.
   */
  const acciones: AccionDeTablero[] = [];
  for (const o of opciones) {
    if (o.tipo === FUNDAR || (o.tipo === ALZAR && o.id.indexOf(':') > 0)) continue;
    acciones.push({
      id: o.id,
      rotulo: o.rotulo,
      ayuda: o.ayuda,
      disponible: true,
      toque: { tipo: o.tipo, carga: o.carga },
    });
  }

  return {
    vista: encuadreDelDelta(hexes),
    caras,
    lineas,
    nudos,
    acciones,
    paneles: panelesDe(v),
    aviso: avisoDe(v, quien),
  };
}

/** Un tablero sin delta: sólo el aviso y los botones que haya. */
function tableroVacio(aviso: string, opciones: readonly Opcion[] = []): TableroDeclarado {
  return {
    vista: { x: 0, y: 0, ancho: 100, alto: 100 },
    caras: [],
    lineas: [],
    nudos: [],
    acciones: opciones.map((o) => ({
      id: o.id,
      rotulo: o.rotulo,
      ayuda: o.ayuda,
      disponible: true,
      toque: { tipo: o.tipo, carga: o.carga },
    })),
    paneles: [],
    aviso,
  };
}

/** El `viewBox` del SVG: lo calcula el juego, porque sólo él sabe cuánto ocupa. */
function encuadreDelDelta(hexes: readonly Hex[]): { x: number; y: number; ancho: number; alto: number } {
  const puntos = hexes.map((h) => centroDeHex(h, TAMANO_DE_ISLA));
  return encuadre(puntos, TAMANO_DE_ISLA * 1.6);
}

/** Los bloques de texto de al lado: lo mío, el marcador y los trueques. */
function panelesDe(v: VistaSinTablero): PanelDeTablero[] {
  const cuentas = cuentaDeBienes(v.misFichas);
  const mios: string[] = [];
  for (let i = 0; i < BIENES.length; i++) {
    mios.push(`${BIENES[i] as string}: ${cuentas[i] as number}`);
  }

  /*
   * ═══ AQUÍ SE NOMBRA A LA GENTE, Y AHORA CON SU NOMBRE ═══
   *
   * Hasta la fase 5 esto escribía un hueco —`{asiento:aY9TK2MBJ}`— que el mueble
   * rellenaba al pintar, porque el juego no sabía cómo se llama nadie: la
   * proyección sólo recibía un `QuienMira`. El panel decía «aY9TK2MBJ — 1 pto, 0
   * bienes» mientras la barra de arriba decía «Ana · Bruno», y con seis en la mesa
   * no había forma de saber quién iba ganando.
   *
   * Ahora el nombre llega DENTRO de la vista (`ColonoVisto.nombre`), puesto por la
   * proyección a partir de quién está sentado. Se lee con `nombreEnLaVista` y no
   * de una lista aparte, para que nada de lo que se escribe aquí pueda salirse de
   * lo que la proyección dejó pasar.
   */
  /*
   * EL MARCADOR DICE LOS PUNTOS PÚBLICOS DE CADA CUAL, y de nadie los ocultos.
   *
   * Los de quien mira llevan además su cuenta con lo oculto dentro, y se escribe
   * aparte —«y N contando lo tuyo»— en vez de sumarlo al número de la lista. Si se
   * sumara ahí, el mismo renglón diría un número distinto en cada pantalla y nadie
   * podría hablar del marcador en voz alta.
   */
  const marcador = v.colonos.map((c) => {
    const suyo = c.asiento === v.yo && v.misPuntos !== c.puntos ? ` (y ${v.misPuntos} contándote lo oculto)` : '';
    return (
      `${nombreEnLaVista(v, c.asiento)} — ${c.puntos} pto${c.puntos === 1 ? '' : 's'}${suyo}, ` +
      `${c.bienes} bien${c.bienes === 1 ? '' : 'es'}, ${c.cartas} carta${c.cartas === 1 ? '' : 's'}, ` +
      `vereda más larga ${c.vado}`
    );
  });

  const tratos = v.tratos.map(
    (t) =>
      `${t.id}: ${nombreEnLaVista(v, t.de)} da ${listar(t.da)} por ${listar(t.pide)} a ${nombreEnLaVista(v, t.para)} — ${t.estado}`,
  );

  /*
   * MI MANO, POR FAMILIAS Y NO CARTA A CARTA.
   *
   * Es lo que pide el §5 del diseño para la pantalla, y aquí además ahorra la
   * pregunta de qué hacer con cinco guardias iguales. Sale SÓLO en mi panel,
   * porque sale de `misCartas`, que la proyección no le manda a nadie más.
   */
  const mano: string[] = [];
  for (const clase of CLASES_DE_CARTA) {
    const cuantas = v.misCartas.filter((m) => claseDeLaCarta(m.carta) === clase).length;
    if (cuantas > 0) mano.push(`${NOMBRE_DE_LA_CARTA[clase]}: ${cuantas}`);
  }
  if (mano.length === 0) mano.push('Sin cartas.');
  mano.push(`Quedan ${v.mazo} en el mazo.`);

  const guardias = v.colonos
    .filter((c) => c.guardias > 0)
    .map((c) => `${nombreEnLaVista(v, c.asiento)}: ${c.guardias}`);

  const paneles: PanelDeTablero[] = [
    { titulo: 'Lo mío', lineas: mios },
    { titulo: 'Mis cartas', lineas: mano },
    { titulo: 'La mesa', lineas: marcador },
    {
      titulo: 'El Vado Largo',
      lineas: [
        v.vado.de === null
          ? `Vacante. Hacen falta ${VADO_MINIMO} veredas seguidas.`
          : `De ${nombreEnLaVista(v, v.vado.de)}, con ${v.vado.largo} veredas. Vale ${PUNTOS_DEL_VADO} puntos.`,
      ],
    },
    {
      titulo: 'La Mayor Guardia',
      lineas: [
        v.guardia.de === null
          ? `Vacante. Hacen falta ${GUARDIA_MINIMA} guardias jugadas.`
          : `De ${nombreEnLaVista(v, v.guardia.de)}, con ${v.guardia.cuantas}. Vale ${PUNTOS_DE_LA_GUARDIA} punto.`,
        ...guardias,
      ],
    },
  ];
  if (tratos.length > 0) paneles.push({ titulo: 'Trueques', lineas: tratos });
  return paneles;
}

/** La línea grande de arriba: qué se espera y de quién. */
function avisoDe(v: VistaSinTablero, quien: QuienMira): string {
  if (v.momento === 'terminada') {
    /* Los nombres vienen dentro de la vista desde la fase 5: ver `panelesDe`. */
    return v.ganadores.length === 1
      ? `Gana ${nombreEnLaVista(v, v.ganadores[0] as string)}.`
      : `Empate entre ${v.ganadores.map((g) => nombreEnLaVista(v, g)).join(', ')}.`;
  }
  if (v.momento === 'reuniendo') {
    return `El delta está sin repartir. Con ${MANIFIESTO_RIBERAS.jugadores.minimo} sentados se puede empezar.`;
  }
  const suyo = v.turnoDe === quien;
  const de = v.turnoDe === null ? 'nadie' : nombreEnLaVista(v, v.turnoDe);
  if (v.momento === 'colocando') {
    const que = v.faltaVereda ? 'la vereda de salida' : 'una choza';
    return suyo ? `Coloca ${que}.` : `${de} coloca ${que}.`;
  }
  if (!v.tirado) return suyo ? 'Te toca: tira los dados.' : `Turno de ${de}: está por tirar.`;
  return suyo
    ? `Sacaste ${v.ultimaTirada}. Alza, truécalo o pasa.`
    : `Turno de ${de}, que sacó ${v.ultimaTirada}.`;
}

// ---------------------------------------------------------------------------
// EL MANIFIESTO
// ---------------------------------------------------------------------------

/**
 * RIBERAS, dicho como dato.
 *
 * Los campos que hubo que pensar llevan su razón al lado; los demás son lo que
 * son.
 */
export const MANIFIESTO_RIBERAS: ManifiestoDeArcade = {
  id: RIBERAS,
  nombre: 'Riberas',
  /*
   * El gancho dice las tres cosas que definen el juego —que hay un mapa que se
   * ocupa, que se negocia con quien no tiene el turno y que hay un premio que no
   * se compra— porque quien las entiende ya sabe si le apetece.
   *
   * ═══ Y POR QUÉ NO EMPIEZA POR «COLONIZA», QUE ES COMO EMPEZABA ═══
   *
   * Porque el gancho no es una frase interna: es SUPERFICIE DE TIENDA. Es lo que
   * se lee en la tarjeta de la Sala y lo que acabará en la descripción y en las
   * palabras clave de la ficha, que es justo el sitio que nombra la guía 4.1(c) de
   * Apple y el que el §8 protege cuando dice «nunca "Catan" ni "Settlers" en
   * nombre, subtítulo, icono, descripción, palabras clave ni URL».
   *
   * «Settlers» se dice en castellano «Colonos», y ése es el nombre con el que el
   * juego de referencia se vendió aquí durante años. «Coloniza» no es ese nombre
   * —es un verbo corriente, y el propio §8 usa «colonización hexagonal» para
   * describir el género que autoriza—, así que esto NO es corregir una infracción:
   * es no poner la palabra más cercana al nombre ajeno en el primer renglón de la
   * ficha, sobre un delta hexagonal con un número en el centro de cada isla. La
   * frase dice lo mismo, no cuesta nada, y `verify:procedencia` no habría podido
   * cazarlo nunca: compara palabras enteras contra una lista, y «coloniza» no casa
   * con «colonos» ni aunque la entrada estuviera puesta.
   */
  gancho: 'Levanta chozas en el delta, cambia bienes con quien no le toca y quédate el Vado Largo.',
  icono: 'mando',

  /*
   * DE DOS A SEIS. El mínimo es dos porque con uno no hay a quién ofrecerle un
   * trueque, que es la mitad del juego; el máximo es seis porque en un delta de
   * diecinueve islas las doce chozas de la colocación ya aprietan la regla de
   * distancia, y con siete la colocación decidiría la partida.
   */
  jugadores: { minimo: 2, maximo: 6 },

  /*
   * SEDE DE SERVIDOR, y no es una preferencia: con almacenes ocultos y sede de
   * dispositivo, los bienes de todo el mundo vivirían en todos los móviles, y
   * esconder algo en el aparato de quien juega no es esconderlo.
   */
  sede: 'servidor',

  /*
   * SIN RELOJ. Un juego por turnos no tiene ritmo propio: nada avanza solo
   * mientras la gente piensa. El §6 lo pone por escrito al repartir la
   * persistencia por frecuencia —«`tickHz === 0` → escritura síncrona. Riberas,
   * La Ronda y La Larga»—, así que cada movimiento de esta mesa se escribe antes
   * de contestar.
   *
   * Y trae el problema que el §5.4 llama «el plazo que no vencía nunca»: sin
   * tics propios, un trueque con caducidad no caducaría. La salida ya está
   * construida desde la fase 2 —la LECTURA evalúa el plazo de pared y mete el
   * tic— y lo que este fichero pone es qué significa que venza. Ver
   * `venceElPlazo`.
   */
  tickHz: 0,

  /*
   * EL MUEBLE QUE ESTRENA ESTA FASE. Genérico: la topología viaja declarada
   * —polígonos, líneas, nudos y botones con su movimiento dentro— y la app la
   * pinta con SVG sin saber a qué se juega. Es lo que permite que un arcade de
   * fuera del binario tenga tablero sin mandar código al móvil.
   */
  mueble: 'tablero',

  /*
   * SÍ: cada cual ve su almacén y de los demás sólo cuántos bienes tienen.
   * Declararlo `true` no afloja nada, OBLIGA: sin proyección y sin `loSecreto` el
   * servidor no arranca.
   */
  secretos: true,

  /*
   * NINGUNA CIFRA. Los puntos se cuentan dentro de esta partida, se ven en la
   * misma pantalla donde se ganaron y no suben a ninguna tabla, así que no hay
   * nada que la plataforma tenga que creerse. Declarar `'cifra'` comprometería a
   * verificar un récord, y esta fase no entrega ni repeticiones ni tabla:
   * prometer una verificación que nadie hace es peor que no prometer nada.
   *
   * NO EXIME DE SER DETERMINISTA: este reductor lo es, y por eso el diario de la
   * mesa se puede reejecutar.
   */
  marcador: { tipo: 'ninguno' },

  /*
   * CREACIÓN PROPIA, y aquí va el razonamiento entero porque el §4 exige que este
   * valor sea «una afirmación comprobable leyendo el juego» — o sea que quien lo
   * comprueba tiene derecho a encontrar lo mismo que dice la etiqueta.
   *
   * LO QUE AFIRMA, que es lo que dice el tipo: «escrito aquí, de cero». El código,
   * el nombre, el arte, los seis terrenos, los cinco bienes, el estiaje, el Vado
   * Largo con su mínimo, el número de puntos y todos los textos se escribieron en
   * este fichero. No hay nada traído de ningún sitio y no hay licencia detrás.
   *
   * LO QUE NO AFIRMA, y conviene decirlo aquí y no dejarlo a la buena fe: que la
   * MECÁNICA no tenga género. Lo tiene, y es la colonización hexagonal — un delta
   * de diecinueve islas con un número por isla, dados que hacen rendir, chozas en
   * los cruces y caminos por las orillas. El reparto de las islas, los dieciocho
   * números y los tres costes son los de esa familia y no se sortearon aquí. Está
   * contado con detalle en la cabecera, con lo que sí cambia al lado.
   *
   * POR QUÉ NO ES `'mecanica-generica'`. Porque ese valor está descrito en
   * `tipos.ts` como «una mecánica genérica sin dueño: emparejar, reaccionar,
   * adivinar una palabra» —piezas atómicas que no son un juego— y esto es un juego
   * entero. Y porque el §8 llama a este supuesto, con esas palabras, «un juego
   * PROPIO de colonización hexagonal». Las dos etiquetas son imprecisas en algo;
   * ésta lo es en menos, y lo que faltaba no era cambiarla sino escribir debajo
   * qué cubre.
   *
   * POR QUÉ NADA DE ESTO ES UN PROBLEMA LEGAL: §8. Las reglas y las mecánicas no
   * son objeto de copyright ni de patente. Lo protegido es la expresión, y la
   * expresión aquí es propia entera.
   */
  procedencia: { tipo: 'creacion-propia' },
};
