/**
 * LA MANO DE CARTAS DEL MAZO: la otra economía, en el borde IZQUIERDO.
 *
 * ═══ POR QUÉ ESTO NO ES `baraja.ts` CON OTRO NOMBRE ═══
 *
 * `baraja.ts` reparte la mano de BIENES —lo que se gasta— por el borde derecho. Esto
 * reparte la mano del MAZO —lo que se guarda—, y son dos manos distintas que no se
 * pueden mezclar: mezcladas habría que leer cada carta antes de cada decisión, y la
 * pregunta que se hace mil veces por partida («¿me llegan tres para comprar?») dejaría
 * de responderse mirando. Es lo que dice el §5 de `docs/LAS-CARTAS-DE-RIBERAS.md`, y por
 * eso una va a la derecha y la otra a la izquierda.
 *
 * De `baraja.ts` se copia la FORMA DE PENSAR y no el fichero: coordenadas de cámara,
 * agrupar antes de repartir, apretar cuando no cabe en vez de desbordar, y un imán que
 * hace usable una pila solapada. Lo que cambia es todo lo demás, empezando por el lado.
 *
 * ═══ CONTRA QUÉ ESTÁ MEDIDO EL REPARTO ═══
 *
 * Esta mano comparte lienzo con otras dos piezas de interfaz, y las tres viven pegadas a
 * la cámara a la MISMA distancia (2), así que sus cuentas son comparables sin proyectar
 * nada. Los números de aquí abajo salen de medirse contra ellas:
 *
 *   · `barra.ts` — la barra de construir, ABAJO Y CENTRADA. Su placa de fondo es lo más
 *     alto que tiene: el centro de la barra flota a `0,155` del alto sobre el canto de
 *     abajo (`DESDE_EL_SUELO`) y la placa mide `1,5` lados de alto, con el lado topado en
 *     `0,13` del alto (`PARTE_DEL_ALTO`). O sea que el techo de la barra NUNCA pasa de
 *     `-0,2475·alto`. Por eso el PISO de esta franja está en `-0,20·alto`: casi cinco
 *     centésimas de holgura, y no vale «mirarlo en pantalla» porque la barra se encoge
 *     con el ancho y el caso malo es el monitor, donde es más alta.
 *
 *     Y la barra ocupa hasta `0,70` del ANCHO, centrada, así que en un móvil de pie pasa
 *     por debajo de esta franja de lado a lado. Separarse de ella es un asunto de ALTURA,
 *     no de anchura: por eso hay piso y no hay margen lateral contra la barra.
 *
 *   · `baraja.ts` — la mano de bienes, a la DERECHA. Su carta mide `0,15` del alto por
 *     `0,7` de ancho, y con el imán a tope su canto izquierdo llega a
 *     `ancho/2 − 0,107·alto`. La franja de aquí se topa en `0,26` del ancho Y en dos
 *     cartas de ancho, lo que sea menor, y con eso las dos manos no se rozan ni en un
 *     monitor ni en un móvil de pie. `verify:escena` lo mide con las funciones de verdad
 *     en vez de con estos números, que es lo que hace que el día que `barra.ts` o
 *     `baraja.ts` cambien, esto se ponga rojo en lugar de solaparse en silencio.
 *
 *     Y también contra la columna de ÁREAS DE TRUEQUE, que es lo que de verdad aprieta:
 *     esa columna sólo existe mientras hay un bien cogido, pero llega mucho más adentro
 *     que la mano —hasta `ancho/2 − 0,346·alto`—, y en un móvil de pie eso cae pasado el
 *     centro de la pantalla, a `−0,115·alto`. Ahí es donde se decidió el ancho de las
 *     casillas de esta mano: valían el 94 % de la franja y su canto quedaba a media
 *     milésima del de las áreas. No llegaban a pisarse, y «no se pisan por medio píxel»
 *     no es una separación, es una casualidad. Bajado al 90 %, la holgura son cuatro
 *     milésimas del alto en el peor caso, y se exige.
 *
 * Se mide contra las áreas de trueque aunque las dos manos NO puedan estar cogidas a la
 * vez —coger una carta del mazo suelta el bien que hubiera cogido y al revés—: esa
 * exclusión la sostiene el cliente, no la geometría, y una separación que dependa de que
 * nadie se equivoque al montar los clientes no está separada.
 *
 * ═══ POR QUÉ LA CUENTA ESTÁ AQUÍ Y NO DONDE SE PINTA ═══
 *
 * Por lo mismo que la barra y la baraja: se puede comprobar. Que las familias no se
 * solapen entre sí, que un grupo de catorce guardias se APRIETE en vez de desbordar por
 * arriba, que ninguna carta pise la barra ni la mano de bienes, y que con cero cartas no
 * salga nada, son cuatro afirmaciones que un guion de Node verifica con números. Dentro
 * del componente que las dibuja no se podrían verificar de ninguna manera.
 *
 * ═══ COORDENADAS ═══
 *
 * Las de la CÁMARA, como la barra y la baraja: `x` a la derecha, `y` arriba, la cámara en
 * el origen mirando a `-z`. Quien pinta copia la posición y el giro de la cámara sobre el
 * grupo. Aquí no se importa `three` ni React a propósito: esto es aritmética, y un
 * comprobador de Node tiene que poder pedirla sin abrir un contexto de dibujo.
 */

/**
 * UNA CARTA DEL MAZO EN LA MANO.
 *
 * `familia` y `dibujo` son cadenas y no uniones cerradas por lo mismo que `terreno` en
 * `tipos.ts`: el vocabulario es de CADA juego y cerrarlo aquí obligaría a tocar la escena
 * cada vez que llegue un juego nuevo. Lo que la escena hace con una familia que no conoce
 * está decidido y escrito: la manda al final del reparto, en vez de perderla.
 *
 * `sePuedeJugar` y `sePuedeRevelar` las decide EL JUEGO, no la escena: son «¿lo permiten
 * las reglas ahora mismo?», y eso depende del turno, de si la compraste hoy y de si ya
 * jugaste otra. La mano las enseña apagadas y no abre ninguna casilla, pero no sabe por
 * qué — igual que el anillo no sabe por qué un vértice vale.
 */
export interface CartaDelMazo {
  /** Único y estable dentro de la mano: sirve de llave al pintar. */
  readonly id: string;
  /** En Riberas: 'guardia', 'anobueno', 'acaparamiento', 'dosveredas', 'titulo' y las dos de premio. */
  readonly familia: string;
  /** El nombre del icono: 'guardia', 'molino', 'faro', 'vado'… */
  readonly dibujo: string;
  /** Lo que se lee: «La Guardia», «El Faro»… */
  readonly nombre: string;
  /** Si las reglas dejan jugarla ahora mismo. */
  readonly sePuedeJugar: boolean;
  /** Sólo los títulos, y sólo en tu turno. */
  readonly sePuedeRevelar: boolean;
  /**
   * ESTE NAIPE NO SE JUEGA: SE TIENE. Y por eso NO se apaga.
   *
   * ═══ EL FALLO QUE ESTA BANDERA COMPRA ═══
   *
   * `apagada` es «ni se puede jugar ni se puede revelar», y con esa sola frase un premio
   * —El Vado Largo, La Mayor Guardia— saldría apagado SIEMPRE: en todos los turnos y para
   * quien lo tiene. Y apagado significa una cosa muy concreta en esta mano: «ahora no, más
   * tarde». Un naipe al que no le llega nunca el turno, pintado igual que el que sí le
   * llega el turno que viene, se lee como una carta estropeada — y el encargo entero era
   * que el premio SE VIERA.
   *
   * Va en el naipe y no se deduce de la familia porque la escena no sabe qué familias son
   * premios: la familia es vocabulario de CADA juego —lo dice el campo de arriba— y una
   * lista de nombres escrita aquí se quedaría vieja el día que llegue el segundo juego con
   * mano de cartas. Quien manda el naipe sí lo sabe.
   *
   * Opcional para que las nueve del mazo no tengan que escribirla: lo normal es una carta.
   */
  readonly esPremio?: boolean;
}

/**
 * Dónde y cómo se dibuja una carta del mazo.
 *
 * Tiene los mismos campos que el `HuecoDeCarta` de `baraja.ts`, y eso es a propósito: las
 * dos manos se dibujan con la misma geometría de naipe redondeado, así que quien pinta
 * puede usar la misma función para las dos sin traducir nada. No se importa aquel tipo
 * para no atar dos ficheros que no se necesitan: son dos manos distintas y tienen que
 * poder separarse.
 */
export interface HuecoDeCartaDelMazo {
  x: number;
  y: number;
  z: number;
  /** Lo ancha y alta que es la carta. La misma para todas. */
  ancho: number;
  alto: number;
  /** Cuánto se inclina, en radianes. Da el aire de mano sostenida. */
  giro: number;
  /** Cuánto tira el imán de esta carta, de 0 a 1. */
  iman: number;
  /**
   * DÓNDE VA EL DIBUJO DENTRO DE LA CARTA, en fracción de su ancho y con signo.
   *
   * ═══ EL FALLO QUE ESTO ARREGLA, Y ESTABA EN LAS DOS MANOS ═══
   *
   * Una carta de la mano asoma por el canto: la mayor parte de ella está FUERA de la
   * pantalla, y su centro también. El dibujo se colocaba a un cuarto de ancho del
   * centro de la carta… hacia fuera, o sea todavía más lejos del borde. Medido en las
   * tres proporciones —monitor, la columna de la Sala y un móvil de pie—: el dibujo
   * caía FUERA DE LA PANTALLA en las seis, y lo que se veía de la carta era su margen
   * vacío. Se pintaba, costaba sus triángulos, y no lo veía nadie.
   *
   * Así que el sitio del dibujo lo dice el reparto, que es quien sabe cuánto asoma
   * cada carta AHORA —el imán la saca más cuando se apunta— y hacia qué lado está el
   * borde. Es el centro de la parte visible: `asoma/2 − 0,5` anchos hacia dentro.
   * Sale del hueco y no de una constante en el pintor porque cambia con el imán en
   * cada fotograma, y porque así se puede comprobar en Node sin abrir un navegador.
   */
  dibujo: number;
  /**
   * EN QUÉ ORDEN SE PINTA.
   *
   * Las cartas se solapan y están TODAS a la misma distancia de la cámara, así que el
   * pintor no puede ordenarlas por profundidad: cualquier orden le vale igual y el que
   * elige es arbitrario. Se vio en la mano de bienes —el icono de una carta dibujado
   * encima de la carta de al lado, como si el dibujo no fuera parte del naipe— y aquí
   * pasaría exactamente igual. Con un orden explícito por carta, y hueco dentro para sus
   * capas, el pintor deja de opinar.
   */
  orden: number;
}

/** Una carta del mazo con el sitio que le toca. */
export interface CartaDelMazoColocada {
  carta: CartaDelMazo;
  hueco: HuecoDeCartaDelMazo;
  /** Si es la primera de su familia. Marca dónde empieza un grupo nuevo. */
  abreGrupo: boolean;
  /** Cuántas cartas tiene su familia. Es el «cuántas guardias tengo». */
  enElGrupo: number;
  /**
   * NI SE PUEDE JUGAR NI SE PUEDE REVELAR: sale apagada, y NO desaparece.
   *
   * Se calcula aquí y no donde se pinta para que sea una sola frase en un solo sitio.
   * Que siga viéndose es una regla del juego, no una cortesía: saber que tienes tres
   * guardias guardadas para el turno que viene es parte de lo que se juega, y una mano
   * que esconde lo que ahora no sirve obliga a acordarse de memoria.
   *
   * UN PREMIO NUNCA SE APAGA, y es la única excepción. Ver `esPremio` en `CartaDelMazo`:
   * apagado quiere decir «ahora no, más tarde», y a un premio no le llega nunca ese más
   * tarde porque no hay nada que jugar con él.
   */
  apagada: boolean;
}

/**
 * LAS DOS PUERTAS QUE ABRE UNA CARTA COGIDA.
 *
 * `revelar` es la de los títulos —el gesto de arrastrar a una casilla que pide el §5 del
 * diseño, el mismo que ya está aprendido con el área de trueque—; `jugar` es la de las
 * demás. Son dos y no una porque las reglas las distinguen: un título no se «juega» y una
 * guardia no se «revela», y una sola casilla que hiciera las dos cosas obligaría a la
 * escena a saber cuál toca, que es justo lo que no puede saber.
 */
export type ClaseDeCasilla = 'revelar' | 'jugar';

/** Una casilla de la mano: dónde cae y qué pasa si se suelta ahí. */
export interface CasillaDeLaMano {
  clase: ClaseDeCasilla;
  hueco: HuecoDeCartaDelMazo;
}

/**
 * EL ORDEN DE LAS FAMILIAS EN LA MANO, y por qué es fijo.
 *
 * Siempre el mismo, tenga uno lo que tenga, por lo mismo que el de los bienes: una mano
 * ordenada por cómo fueron llegando las cartas obliga a leerla entera cada vez; una
 * ordenada siempre igual se lee por la posición. Es el orden en que las nombra el §2 de
 * `docs/LAS-CARTAS-DE-RIBERAS.md`, con los títulos al final porque son los que se guardan
 * y no los que se juegan.
 *
 * Una familia que no esté en la lista va al final en vez de desaparecer: la escena no es
 * quién para decidir que una carta de otro juego no existe.
 *
 * ═══ LOS PREMIOS VAN ARRIBA DEL TODO, Y NO ES UN CAPRICHO ═══
 *
 * La mano se reparte de arriba abajo y sus CASILLAS —donde se sueltan las cartas para
 * jugarlas o revelarlas— viven en el PIE de la franja. O sea que lo que se arrastra
 * conviene tenerlo cerca del pie, y lo que no se arrastra nunca, lejos. Un premio no se
 * arrastra jamás: no abre ninguna casilla (ver `puertasDeLaCarta`). Puesto abajo se
 * cruzaría en el camino de cada jugada del turno.
 *
 * Y son DOS familias y no una sola de «premios», que era lo primero que salía: dos naipes
 * de la misma familia se solapan a `PASO_DENTRO_DEL_GRUPO` y del de abajo sólo asoma un
 * canto. De los cinco títulos eso está bien —son cinco de lo mismo y lo que interesa es
 * cuántos hay—; de los dos premios no, porque son dos cosas distintas y cada una se lee
 * por su dibujo. Separadas en dos familias las reparte `PASO_ENTRE_GRUPOS` y se ven las dos.
 */
export const ORDEN_DE_LAS_FAMILIAS: readonly string[] = [
  'vado',
  'mayorguardia',
  'guardia',
  'anobueno',
  'acaparamiento',
  'dosveredas',
  'titulo',
];

/**
 * LA FAMILIA DE LOS CINCO TÍTULOS.
 *
 * Está escrita porque la casilla de revelar es SÓLO suya, y `sePuedeRevelar` viene del
 * juego: sin el nombre aquí, la escena no podría afirmar en un comprobador que ninguna
 * carta que no sea un título abre esa casilla.
 */
export const FAMILIA_DE_LOS_TITULOS = 'titulo';

/**
 * EL COLOR DE CADA FAMILIA, y por qué esta tabla no está en `paleta.ts`.
 *
 * `paleta.ts` es el ATLAS del pack: dice a qué celda de la textura apunta cada terreno y
 * de qué color es cada bien PORQUE lo saca de su tierra. Una familia de cartas no tiene
 * tierra ni celda: es una etiqueta del mazo. Metida allí habría que inventarle un terreno
 * a la Guardia, y ese terreno acabaría dibujándose en el tablero.
 *
 * Son tonos apagados y distintos entre sí a propósito: la carta que se lee es la del
 * dibujo, y el color sólo tiene que decir «esta pila y aquélla no son lo mismo» cuando la
 * mano está en reposo y de cada carta asoma un canto.
 *
 * ═══ LOS DOS PREMIOS SON LOS DOS ÚNICOS VIVOS, Y ESO ES LA SEÑAL ═══
 *
 * En reposo, de un naipe asoma un canto y del canto sólo se ve el COLOR: el dibujo está
 * fuera de la pantalla hasta que el imán lo saca. Así que la pregunta «¿esto es una carta
 * o es un premio?» tiene que responderla el color solo, y responderla de un vistazo — que
 * es lo que no hace un séptimo tono apagado en una fila de tonos apagados.
 *
 * La señal es la SATURACIÓN, no el tono: las cinco del mazo están todas por debajo del
 * 0,55 y los dos premios por encima del 0,60, y `verify:escena` lo exige así en vez de
 * comparar dos códigos de color a mano. Buscar el tono libre no valía: la paleta de las
 * cinco ya recorre marrón, oliva, morado, azul y ocre, y cualquier séptimo apagado cae al
 * lado de alguno de ellos.
 *
 * Verde vivo y rojo vivo, y no dos matices del mismo, porque los dos premios se tienen a
 * la vez con toda naturalidad —quien encadena veredas suele ser quien juega guardias— y
 * dos cantos parecidos, uno junto al otro, se leen como una pila de dos.
 */
export const COLOR_DE_LA_FAMILIA: Readonly<Record<string, string>> = {
  vado: '#1a8a3c',
  mayorguardia: '#c2261c',
  guardia: '#7d4a3a',
  anobueno: '#6f7a3c',
  acaparamiento: '#6a4a72',
  dosveredas: '#3f6a72',
  titulo: '#8a6d2f',
};

/** El color de una familia que la escena no conoce. Se ve, y se ve que no es de ninguna. */
export const COLOR_SIN_FAMILIA = '#5b5f66';

/** De qué color va una carta. Una familia desconocida sale con el de reserva, no revienta. */
export function colorDeLaFamilia(familia: string): string {
  return COLOR_DE_LA_FAMILIA[familia] ?? COLOR_SIN_FAMILIA;
}

/** A qué distancia de la cámara vive esta mano. La misma que la barra y la baraja, y por lo mismo. */
export const DISTANCIA_DE_LAS_CARTAS = 2;

/**
 * QUÉ PARTE DEL ALTO DE LA PANTALLA MIDE UNA CARTA DEL MAZO.
 *
 * Un pelo más chica que la de bienes (`0,15`), y no por gusto: esta mano vive en media
 * pantalla —de la mitad de arriba hasta el piso de la franja— porque debajo van sus
 * casillas y más abajo la barra. Con el tamaño de la carta de bienes, tres familias ya
 * obligaban a apretar el reparto; con éste caben tres holgadas.
 */
const ALTO_DE_LA_CARTA = 0.115;
/** Y su proporción: más alta que ancha, como una carta de verdad. La misma que los bienes. */
const ANCHO_SOBRE_ALTO = 0.7;

/**
 * CUÁNTO ASOMA UNA CARTA EN REPOSO, en fracción de su ancho.
 *
 * Seis décimas, un poco más que la mano de bienes. La diferencia tiene motivo: un bien
 * se reconoce por el COLOR de su carta y estas cinco familias se reconocen por el DIBUJO.
 * Asomando un tercio se vería el color y no el dibujo, que es como no ver nada.
 *
 * Subió de 0,46 el 5-sep-2026 mirándolo en pantalla, a la vez que la mano de bienes y por
 * lo mismo: con lo de antes, el dibujo no llegaba a la parte visible del naipe.
 */
const ASOMA_QUIETA = 0.6;
/** Y cuánto asoma la carta a la que apunta el cursor, con el imán a tope. */
const ASOMA_TIRADA = 1;

/**
 * EL ALCANCE DEL IMÁN, en fracción del alto de la pantalla.
 *
 * Aquí el imán no es un lujo: dentro de una familia las cartas se solapan casi del todo,
 * y de las de en medio sólo asoma un canto. Sin imán habría que elegir entre desplegarlas
 * —y comerse la pantalla— o no poder señalar ninguna salvo la primera y la última.
 *
 * Más corto que el de la mano de bienes (`0,13`) porque aquí los grupos son más apretados:
 * con el alcance largo, apuntar a una guardia levantaría las cinco por igual.
 */
const ALCANCE_DEL_IMAN = 0.1;

/**
 * CUÁNTO SE SEPARAN DOS CARTAS DE LA MISMA FAMILIA, en fracción del alto de una carta.
 *
 * Poco: se solapan mucho, como se sostienen unas cartas iguales en la mano de verdad, y lo
 * que asoma de cada una es su canto. Contar cantos es cómo se sabe de un vistazo que se
 * tienen tres guardias y no dos, sin un número escrito —que además aquí costaría una
 * fuente dentro del lienzo.
 */
const PASO_DENTRO_DEL_GRUPO = 0.22;

/**
 * Y EL TOPE DE LO QUE PUEDE MEDIR UN GRUPO, en altos de carta.
 *
 * Esto es lo que hace que cinco guardias no ocupen cinco huecos, que es exactamente lo
 * que se pidió. Con un paso fijo, un grupo crece en línea recta: catorce guardias —que es
 * el máximo que puede haber, hay catorce en el mazo— medirían más de tres cartas y media
 * y se comerían la mano entera, dejando a los títulos apretados contra el suelo.
 *
 * Con el tope, el abanico de un grupo se cierra sobre sí mismo según crece: el paso se
 * reparte, el grupo mide siempre lo mismo pasadas seis cartas, y lo que dice cuántas hay
 * es lo apretados que están los cantos. Es lo que hace una mano de verdad cuando se
 * llena.
 *
 * Uno coma dos, y no dos: por encima de eso un grupo grande empuja al de al lado y se
 * pierde el salto entre familias, que es toda la información que da agruparlas.
 */
const ABANICO_MAXIMO = 1.2;

/**
 * CUÁNTO SE SEPARAN DOS FAMILIAS.
 *
 * Casi el triple del paso de dentro. Ese hueco es toda la información: sin él, ocho cartas
 * repartidas son ocho cartas repartidas, y con él son «tres guardias, dos títulos y estas
 * otras». El salto tiene que verse antes de que nadie se pare a mirar, y por eso
 * `verify:escena` exige que sea al menos el doble del de dentro y no sólo mayor.
 */
const PASO_ENTRE_GRUPOS = 0.62;

/** Y cuánto se inclina la mano de la primera carta a la última, en radianes. */
const INCLINACION = 0.12;

/**
 * LA FRANJA DE LA IZQUIERDA: hasta dónde puede llegar esta mano hacia dentro.
 *
 * Se topa por los DOS lados y hace falta que sea por los dos. Por el ancho de la pantalla,
 * para que en un móvil de pie no se cruce con la mano de bienes; y por el ancho de la
 * carta, para que en un monitor panorámico la franja no se coma medio tablero sólo porque
 * hay sitio. Es la misma cuenta de dos topes que hace `barra.ts` con el lado de sus
 * huecos, y por la misma razón.
 */
const PARTE_DEL_ANCHO = 0.26;
const FRANJA_EN_CARTAS = 2;

/**
 * DÓNDE EMPIEZA Y DÓNDE ACABA LA FRANJA, en fracción del alto visible.
 *
 * Tres cotas y las tres están medidas, no elegidas:
 *
 *   · `TECHO_DE_LAS_CARTAS` a `0,47`: el canto de arriba está en `0,5`, así que quedan
 *     tres centésimas de aire. Arriba a la izquierda no hay nada más.
 *   · `SUELO_DE_LAS_CARTAS` a `0`: las cartas viven en la mitad de arriba. Debajo van sus
 *     casillas, y una casilla tapada por la mano que la usa no sirve de nada.
 *   · `PISO_DE_LA_FRANJA` a `-0,20`: el techo de la placa de la barra está en `-0,2475`
 *     como mucho (ver la cabecera). Casi cinco centésimas de holgura, que a esta distancia
 *     son más que el alto de media carta.
 */
const TECHO_DE_LAS_CARTAS = 0.47;
const SUELO_DE_LAS_CARTAS = 0;
const PISO_DE_LA_FRANJA = -0.2;

/**
 * DESDE QUÉ PARTE DEL ANCHO, CONTANDO DESDE LA IZQUIERDA, DESPIERTA LA MANO.
 *
 * Un pelo más que la franja, para que el imán empiece a tirar ANTES de que el cursor toque
 * una carta: si despertara al tocarla, la carta se movería debajo del cursor justo cuando
 * se va a pulsar.
 */
const ZONA_DE_LAS_CARTAS = 0.3;

/** Lo que la cámara ve a la distancia de esta mano. */
export function loQueSeVeEnLasCartas(
  campo: number,
  proporcion: number,
): { alto: number; ancho: number } {
  const alto = 2 * DISTANCIA_DE_LAS_CARTAS * Math.tan(campo / 2);
  return { alto, ancho: alto * proporcion };
}

/**
 * LA FRANJA, EN UNIDADES DE MUNDO: el rectángulo dentro del que vive todo esto.
 *
 * Sale para que un comprobador pueda afirmar la separación contra `barra.ts` y
 * `baraja.ts` sin recorrer carta a carta, y para que quien pinta pueda poner un fondo del
 * tamaño de la franja sin recalcularla.
 */
export function franjaDeLasCartas(
  campo: number,
  proporcion: number,
): {
  izquierda: number;
  derecha: number;
  techo: number;
  suelo: number;
  piso: number;
} {
  const { alto, ancho } = loQueSeVeEnLasCartas(campo, proporcion);
  const anchoDeCarta = alto * ALTO_DE_LA_CARTA * ANCHO_SOBRE_ALTO;
  const franja = Math.min(ancho * PARTE_DEL_ANCHO, anchoDeCarta * FRANJA_EN_CARTAS);
  return {
    izquierda: -ancho / 2,
    derecha: -ancho / 2 + franja,
    techo: alto * TECHO_DE_LAS_CARTAS,
    suelo: alto * SUELO_DE_LAS_CARTAS,
    piso: alto * PISO_DE_LA_FRANJA,
  };
}

/**
 * ¿ESTÁ EL CURSOR EN LA ZONA DE ESTA MANO?
 *
 * `x` e `y` en coordenadas de cámara. Se pregunta aparte de la posición de las cartas
 * porque la mano despierta ENTERA al acercarse, y luego el imán reparte dentro: si cada
 * carta decidiera por su cuenta, acercarse por arriba no despertaría a las de abajo y la
 * mano parecería medio dormida.
 *
 * Pide la `y` además de la `x`, y ahí se separa de `enLaZonaDeLaMano` de `baraja.ts`. El
 * motivo es el vecino: la barra de construir ocupa hasta el 82 % del ancho por abajo, o
 * sea que la esquina de abajo a la izquierda es de la barra y no de esta mano. Sin mirar
 * la `y`, pasar el cursor por la primera pieza de la barra levantaría la carta de más
 * abajo de la mano — un movimiento en el rabillo del ojo cada vez que se va a construir.
 */
export function enLaZonaDeLasCartas(
  x: number,
  y: number,
  campo: number,
  proporcion: number,
): boolean {
  const { ancho } = loQueSeVeEnLasCartas(campo, proporcion);
  const franja = franjaDeLasCartas(campo, proporcion);
  return x < -ancho / 2 + ancho * ZONA_DE_LAS_CARTAS && y > franja.piso;
}

/**
 * ORDENA LA MANO POR FAMILIA, agrupando las iguales.
 *
 * Es una función aparte y pura para que se pueda comprobar sin colocar nada: que no pierde
 * ni inventa cartas, que las de la misma familia acaban juntas, y que dos manos con las
 * mismas cartas en distinto orden de llegada salen idénticas — que es lo que hace que la
 * mano se lea siempre igual, y lo que evita que comprar una carta reordene las que ya
 * había debajo del cursor.
 */
export function manoDelMazoPorFamilias(mano: readonly CartaDelMazo[]): CartaDelMazo[] {
  const sitio = (familia: string): number => {
    const i = ORDEN_DE_LAS_FAMILIAS.indexOf(familia);
    return i < 0 ? ORDEN_DE_LAS_FAMILIAS.length : i;
  };
  return [...mano].sort((a, b) => {
    const d = sitio(a.familia) - sitio(b.familia);
    if (d !== 0) return d;
    /* Desempate por familia y luego por id: dos manos iguales salen exactamente iguales. */
    if (a.familia !== b.familia) return a.familia < b.familia ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * CUÁNTO SE SEPARAN DOS CARTAS DENTRO DE UN GRUPO DE `cuantas`.
 *
 * Aparte y exportada porque es la afirmación que hay que poder comprobar sola: que el paso
 * ENCOGE según crece el grupo, y que por tanto un grupo grande mide menos que la suma de
 * sus cartas. Metida dentro del reparto habría que deducirla restando posiciones, y
 * entonces un fallo aquí se leería como un fallo del reparto.
 */
export function pasoDentroDelGrupo(cuantas: number): number {
  if (cuantas <= 1) return 0;
  const recorrido = (cuantas - 1) * PASO_DENTRO_DEL_GRUPO;
  return recorrido <= ABANICO_MAXIMO
    ? PASO_DENTRO_DEL_GRUPO
    : ABANICO_MAXIMO / (cuantas - 1);
}

/**
 * LOS HUECOS DE LA MANO DEL MAZO, agrupados por familia y pegados al borde izquierdo.
 *
 * ═══ SE REPARTE DE ARRIBA ABAJO, Y LA MANO SE CENTRA EN SU FRANJA ═══
 *
 * Primero se mide lo que ocupa todo —los abanicos de cada familia más los saltos entre
 * ellas— y luego se reparte. Al revés no se puede: para saber dónde empieza la primera
 * carta hay que saber cuánto mide la mano entera, y para eso hay que haberla medido.
 *
 * Si con los pasos normales no cabe, se APRIETAN los dos —el de dentro y el de entre— en
 * la misma proporción, en vez de salirse o de comerse el hueco entre familias, que es lo
 * primero que se pierde si se aprieta a lo bruto y es justo lo que no se puede perder.
 *
 * `apunta` es la `y` del cursor en coordenadas de cámara, o `null` si no está en la zona:
 * con `null` la mano se queda quieta y todas asoman lo mismo.
 */
export function huecosDeLasCartas(
  mano: readonly CartaDelMazo[],
  campo: number,
  proporcion: number,
  apunta: number | null,
): CartaDelMazoColocada[] {
  if (mano.length === 0) return [];

  const ordenada = manoDelMazoPorFamilias(mano);
  const { alto } = loQueSeVeEnLasCartas(campo, proporcion);
  const franja = franjaDeLasCartas(campo, proporcion);
  const altoDeCarta = alto * ALTO_DE_LA_CARTA;
  const anchoDeCarta = altoDeCarta * ANCHO_SOBRE_ALTO;

  /* Cuántas hay de cada familia. Hace falta ANTES de repartir: el paso de dentro depende. */
  const cuantasDe = new Map<string, number>();
  for (const c of ordenada) cuantasDe.set(c.familia, (cuantasDe.get(c.familia) ?? 0) + 1);

  /* El paso que le toca a cada salto, ya con el abanico cerrado si el grupo es grande. */
  const pasos: number[] = [];
  for (let i = 1; i < ordenada.length; i++) {
    const antes = ordenada[i - 1] as CartaDelMazo;
    const ahora = ordenada[i] as CartaDelMazo;
    pasos.push(
      antes.familia === ahora.familia
        ? pasoDentroDelGrupo(cuantasDe.get(ahora.familia) ?? 1)
        : PASO_ENTRE_GRUPOS,
    );
  }

  /*
   * ¿CABE? La franja de las cartas va del techo al suelo, y lo que tiene que caber es el
   * RECORRIDO más una carta: los huecos se miden desde el centro, así que media carta
   * sobresale por arriba de la primera y media por debajo de la última.
   */
  const suma = pasos.reduce((a, b) => a + b, 0);
  const cabe = franja.techo - franja.suelo - altoDeCarta;
  const aprieta = suma > 0 ? Math.min(1, cabe / (suma * altoDeCarta)) : 1;

  const desplazamientos: number[] = [0];
  let recorrido = 0;
  for (const p of pasos) {
    recorrido += p * altoDeCarta * aprieta;
    desplazamientos.push(recorrido);
  }
  /* Centrada en la franja de las cartas, no en la pantalla: debajo van las casillas. */
  const arriba = (franja.techo + franja.suelo) / 2 + recorrido / 2;

  const alcance = alto * ALCANCE_DEL_IMAN;
  const colocadas: CartaDelMazoColocada[] = [];

  for (let i = 0; i < ordenada.length; i++) {
    const carta = ordenada[i] as CartaDelMazo;
    const y = arriba - (desplazamientos[i] as number);
    const abreGrupo = i === 0 || (ordenada[i - 1] as CartaDelMazo).familia !== carta.familia;

    /*
     * EL IMÁN ES UNA CAMPANA, no un escalón ni una recta, por lo mismo que en la mano de
     * bienes: con un escalón la carta salta de golpe al pasar de una a otra, y con una
     * recta el reparto se corta en seco al borde del alcance y se ve el filo.
     */
    const iman = apunta === null ? 0 : Math.exp(-(((y - apunta) / alcance) ** 2));
    const asoma = ASOMA_QUIETA + (ASOMA_TIRADA - ASOMA_QUIETA) * iman;

    colocadas.push({
      carta,
      abreGrupo,
      enElGrupo: cuantasDe.get(carta.familia) ?? 1,
      /* El premio no se apaga nunca: no le llega el turno porque no hay nada que jugar. */
      apagada: carta.esPremio !== true && !carta.sePuedeJugar && !carta.sePuedeRevelar,
      hueco: {
        /* Espejo del de la baraja: allí se resta del borde derecho, aquí se suma al izquierdo. */
        x: franja.izquierda + anchoDeCarta * (asoma - 0.5),
        /* Hacia DENTRO: lo que se ve de esta carta queda a su derecha. Ver `dibujo`. */
        dibujo: 0.5 - asoma / 2,
        y,
        /*
         * Cada carta un pelo más cerca que la anterior. No decide nada por sí solo —el
         * orden lo manda `orden`— pero deja la profundidad coherente por si algún día
         * alguna capa vuelve a probarla.
         */
        z: -DISTANCIA_DE_LAS_CARTAS + i * 0.0015,
        ancho: anchoDeCarta,
        alto: altoDeCarta,
        /* La inclinación va de `-INCLINACION` a `+INCLINACION` de arriba abajo. */
        giro: ordenada.length > 1 ? INCLINACION * (1 - (2 * i) / (ordenada.length - 1)) : 0,
        iman,
        /*
         * Diez de margen por carta: dentro caben sus capas —borde, cara e icono— sin que
         * ninguna pueda colarse entre las de la carta de al lado.
         */
        orden: i * 10,
      },
    });
  }
  return colocadas;
}

/**
 * QUÉ CASILLAS ABRE LA CARTA COGIDA.
 *
 * Pura y aparte del reparto para que se pueda afirmar sola, que es lo que importa aquí:
 * que sin carta cogida no se abre ninguna, que una carta que no puede ni jugarse ni
 * revelarse tampoco abre nada, y sobre todo que NINGUNA carta que no sea un título abre la
 * de revelar por mucho que el juego mande `sePuedeRevelar` en `true`. Eso último es un
 * cinturón contra un fallo del otro lado: revelar una guardia no es una jugada mal
 * dibujada, es una carta que se enseña y ya no se puede desenseñar.
 *
 * Y el segundo cinturón, del mismo cuero: UN PREMIO NO ABRE NINGUNA PUERTA, por mucho que
 * llegue con una bandera puesta. No hay movimiento que mandar con El Vado Largo —el premio
 * es derivado, se gana solo y se pierde solo—, así que una casilla abierta debajo de él es
 * un sitio donde soltar algo que no va a pasar nada, y eso se siente como que la pantalla
 * se ha colgado.
 */
export function puertasDeLaCarta(carta: CartaDelMazo | null): ClaseDeCasilla[] {
  if (carta === null || carta.esPremio === true) return [];
  const puertas: ClaseDeCasilla[] = [];
  if (carta.familia === FAMILIA_DE_LOS_TITULOS && carta.sePuedeRevelar) puertas.push('revelar');
  if (carta.familia !== FAMILIA_DE_LOS_TITULOS && carta.sePuedeJugar) puertas.push('jugar');
  return puertas;
}

/**
 * QUÉ PARTE DEL ALTO MIDE UNA CASILLA, y cuánto aire va entre dos.
 *
 * Topada por el alto Y por el ancho de la franja, como el lado de la barra: sin el segundo
 * tope, en un móvil de pie saldría una casilla más alta que ancha, que es lo contrario de
 * lo que dice un sitio donde se suelta algo.
 */
const ALTO_DE_LA_CASILLA = 0.085;
const CASILLA_SOBRE_ANCHO = 1.7;
const AIRE_ENTRE_CASILLAS = 0.16;

/**
 * LAS CASILLAS DE LA MANO, que sólo existen mientras se arrastra una carta.
 *
 * ═══ POR QUÉ ABAJO Y EN LA MISMA COLUMNA, Y NO AL LADO ═══
 *
 * Es el mismo gesto que el área de trueque —se arrastra la carta y se suelta— y por eso
 * hereda su forma. Lo que cambia es hacia dónde: las áreas de trueque van HACIA DENTRO
 * desde la mano de bienes, y aquí eso no cabe. En un móvil de pie, la mano de bienes con
 * sus áreas ya llega hasta pasado el centro de la pantalla; una columna de casillas hacia
 * dentro desde la izquierda se le echaría encima.
 *
 * Así que van DEBAJO, en el pie de la misma franja, entre las cartas y la barra. El gesto
 * sigue siendo corto —que es de lo que iba ponerlas cerca— y en vez de cruzar la pantalla
 * se baja un dedo. Y el sitio está reservado: `SUELO_DE_LAS_CARTAS` deja libre ese pie
 * siempre, así que una casilla nunca sale tapada por la mano que la va a usar.
 *
 * Con la lista vacía no sale ninguna, que es lo que tiene que pasar cuando la carta cogida
 * no se puede ni jugar ni revelar — y se ve, en vez de dejar a alguien arrastrándola sin
 * sitio donde soltarla.
 */
export function casillasDeLaMano(
  cuales: readonly ClaseDeCasilla[],
  campo: number,
  proporcion: number,
): CasillaDeLaMano[] {
  if (cuales.length === 0) return [];

  const { alto } = loQueSeVeEnLasCartas(campo, proporcion);
  const franja = franjaDeLasCartas(campo, proporcion);
  const anchoDeFranja = franja.derecha - franja.izquierda;

  /*
   * NOVENTA POR CIENTO DE LA FRANJA, y el diez que sobra no es margen estético.
   *
   * Con la casilla a ras de la franja, en un móvil de pie su canto derecho caía a media
   * milésima del canto izquierdo de la columna de áreas de trueque. No llegaban a pisarse,
   * pero «no llegan a pisarse por medio píxel» es una afirmación que se rompe el día que
   * alguien toque un número en cualquiera de los dos ficheros. Con este diez por ciento la
   * holgura pasa a cuatro milésimas del alto en el peor caso, y `verify:escena` la exige
   * llamando a `areasDeTrueque` de verdad en vez de a estos números.
   */
  const anchoDeCasilla = anchoDeFranja * 0.9;
  const altoDeCasilla = Math.min(alto * ALTO_DE_LA_CASILLA, anchoDeCasilla / CASILLA_SOBRE_ANCHO);
  const paso = altoDeCasilla * (1 + AIRE_ENTRE_CASILLAS);

  /* Se apilan HACIA ARRIBA desde el piso: la de abajo siempre en el mismo sitio. */
  const primera = franja.piso + altoDeCasilla / 2;
  const x = franja.izquierda + anchoDeFranja * 0.03 + anchoDeCasilla / 2;

  return cuales.map((clase, i) => ({
    clase,
    hueco: {
      x,
      y: primera + i * paso,
      z: -DISTANCIA_DE_LAS_CARTAS,
      /* Una casilla no asoma por el canto: está entera dentro, y su dibujo va al medio. */
      dibujo: 0,
      ancho: anchoDeCasilla,
      alto: altoDeCasilla,
      giro: 0,
      iman: 0,
      /* Todas al mismo nivel: no se solapan entre sí, así que no hay nada que ordenar. */
      orden: 0,
    },
  }));
}
