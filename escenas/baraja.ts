/**
 * LA BARAJA DEL LATERAL: la mano de bienes, escondida a medias por el borde derecho.
 *
 * ═══ QUÉ TIENE QUE HACER, Y POR QUÉ CADA COSA ═══
 *
 * En reposo asoma la mitad de cada carta y las demás se solapan: la mano ocupa poco y
 * se lee de un vistazo cuántas cartas hay y de qué son. Al acercar el cursor, las cartas
 * salen hacia dentro de la pantalla, y la que está más cerca sale MÁS que sus vecinas —
 * el efecto imán. Al alejarlo vuelven.
 *
 * El imán no es un adorno: es lo que hace que una mano de quince cartas solapadas se
 * pueda usar. Sin él habría que elegir entre verlas todas —y comerse media pantalla— o
 * verlas apiladas y no poder señalar una.
 *
 * ═══ POR QUÉ ESTA CUENTA ESTÁ AQUÍ Y NO DONDE SE PINTA ═══
 *
 * Por lo mismo que la barra: se puede comprobar. Que la mano quepa en el alto de la
 * pantalla con dos cartas y con veinte, que en reposo asome de todas al menos una
 * franja agarrable, que el imán empuje MÁS a la carta señalada que a sus vecinas y que
 * ninguna carta se salga por arriba son cuatro afirmaciones que un guion de Node
 * verifica con números y que dentro del componente que las dibuja no se podrían
 * verificar de ninguna manera.
 *
 * ═══ COORDENADAS ═══
 *
 * Las de la CÁMARA, como la barra: `x` a la derecha, `y` arriba, la cámara en el origen
 * mirando a `-z`. Quien pinta copia la posición y el giro de la cámara sobre el grupo.
 */

/** Un bien del catán. Es cadena y no unión cerrada por lo mismo que `terreno`. */
export interface CartaEnLaMano {
  /** Único dentro de la mano: dos cartas de madera son dos cartas distintas. */
  id: string;
  /** Qué bien es. La escena lo traduce a color y a modelo. */
  bien: string;
}

/** Dónde y cómo se dibuja una carta de la mano. */
export interface HuecoDeCarta {
  x: number;
  y: number;
  z: number;
  /** Lo ancha y alta que es la carta. La misma para todas. */
  ancho: number;
  alto: number;
  /** Cuánto se inclina, en radianes. Da el aire de mano sostenida. */
  giro: number;
  /**
   * Cuánto tira el imán de esta carta, de 0 a 1.
   *
   * Sale para que quien pinta pueda usarlo en más sitios que la posición — subir el
   * brillo, adelantarla en el orden de dibujo— sin volver a calcular la distancia.
   */
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
   * EN QUÉ ORDEN SE PINTA, y por qué esto viaja con el hueco.
   *
   * Las cartas se solapan y están todas a la misma distancia de la cámara, así que el
   * pintor NO puede ordenarlas por profundidad: cualquier orden le vale igual, y el que
   * elige es arbitrario. El resultado se vio en pantalla — el icono de una carta
   * dibujado encima de la carta de al lado, como si el dibujo no fuera parte del naipe.
   *
   * Con un orden explícito por carta, y otro dentro de cada carta para sus tres capas
   * —borde, cara e icono—, el pintor deja de opinar. Es la técnica del pintor de toda la
   * vida: se pinta de atrás adelante y se acabó.
   */
  orden: number;
}

/** Una carta de la mano con el sitio que le toca. */
export interface CartaColocada {
  carta: CartaEnLaMano;
  hueco: HuecoDeCarta;
  /** Si es la primera de su grupo. Marca dónde empieza un bien nuevo. */
  abreGrupo: boolean;
  /** Cuántas cartas tiene su grupo. Es el «cuántas tengo de esto». */
  enElGrupo: number;
}

/**
 * EL ORDEN DE LOS BIENES EN LA MANO, y por qué es fijo.
 *
 * Siempre el mismo, tenga uno lo que tenga. Una mano ordenada por cómo fueron llegando
 * las cartas obliga a leerla entera cada vez; una ordenada siempre igual se lee por la
 * posición, como se lee un teclado. Es el orden en que Riberas los nombra, que es el de
 * `BIENES` en `shared/arcade/juegos/riberas.ts`.
 *
 * ═══ AQUÍ ESTABAN LOS CINCO DEL CATÁN DE CAJA, Y NO LLEGA NINGUNO ═══
 *
 * Ponía `madera, ladrillo, lana, grano, mineral`. Riberas reparte `limo, junco, sal,
 * piedra, grano` y los manda SIN TRADUCIR (cabecera de `riberas-en-3d.ts`), así que
 * cuatro de los cinco se caían fuera de la lista: `indexOf` devolvía -1, los cuatro
 * empataban en el mismo sitio y acababan desempatando por orden alfabético. La mano
 * salía `grano, junco, limo, piedra, sal`, que es fijo pero no es éste ni ninguno que
 * nadie haya elegido, y la promesa de leerla por la posición estaba escrita sin cumplir.
 *
 * La lista se sigue escribiendo a mano en vez de importarla del juego, para no atar la
 * escena a un catán concreto (ver `CartaEnLaMano`). Lo que ya no puede es desviarse
 * callando: `verify:escena` la compara con la del juego, y con los cinco de verdad.
 *
 * Un bien que no esté en la lista va al final, en vez de desaparecer: la escena no es
 * quién para decidir que un bien de otro juego no existe.
 */
export const ORDEN_DE_LOS_BIENES: readonly string[] = [
  'limo',
  'junco',
  'sal',
  'piedra',
  'grano',
];

/** A qué distancia de la cámara vive la baraja. La misma que la barra, y por lo mismo. */
export const DISTANCIA_DE_LA_BARAJA = 2;

/**
 * QUÉ PARTE DEL ALTO DE LA PANTALLA MIDE UNA CARTA.
 *
 * Estaba en 0,2 y en pantalla salía una mano que se comía el tercio derecho: con once
 * cartas abiertas por el imán, el tablero desaparecía detrás. Una mano tiene que poder
 * consultarse SIN dejar de ver la partida, que es de lo que va consultarla.
 */
const ALTO_DE_LA_CARTA = 0.15;
/** Y su proporción: más alta que ancha, como una carta de verdad. */
const ANCHO_SOBRE_ALTO = 0.7;

/**
 * CUÁNTO ASOMA UNA CARTA EN REPOSO, en fracción de su ancho.
 *
 * Algo más de la mitad. Empezó en poco más de un tercio, y con eso la carta enseñaba
 * una tira estrecha en la que no cabía su dibujo: se veía el margen del naipe y nada
 * más. Se subió mirándolo en pantalla (5-sep-2026, a petición de Miguel): con esto se
 * lee de qué bien es sin tener que apuntarla, y sigue cortada por el canto —que es lo
 * que hace que se lea como una mano y no como una fila de fichas—.
 *
 * Por encima de 0,7 deja de parecer una mano sostenida y empieza a comer tablero, que
 * es lo que el número original quería evitar y sigue siendo verdad.
 */
const ASOMA_QUIETA = 0.55;
/** Y cuánto asoma la carta a la que apunta el cursor, con el imán a tope. */
const ASOMA_TIRADA = 1.02;

/**
 * LO ANCHA QUE ES LA TIRA QUE ASOMA EN REPOSO, en fracción del ALTO de la carta.
 *
 * No depende del tamaño de la pantalla: el reparto entero se hace en fracciones del alto
 * que se ve, así que la tira mide lo mismo en un monitor y en un móvil de pie. Medido en
 * cuatro proporciones (16:9, 1280x800, 852x922 y 9:19,5): 55,0 % del naipe en las cuatro.
 */
export const ANCHO_DE_LA_TIRA = ANCHO_SOBRE_ALTO * ASOMA_QUIETA;

/**
 * LO GRANDE QUE SE PINTA EL DIBUJO DEL BIEN, en fracción del alto de la carta.
 *
 * ═══ POR QUÉ EL NÚMERO ESTÁ AQUÍ Y NO DONDE SE PINTA ═══
 *
 * Porque lo que decide si el dibujo cabe es cuánto asoma la carta, y eso se sabe aquí.
 * Mientras vivió suelto en el pintor no había forma de comprobarlo en Node, y no se
 * comprobó: el dibujo llega de `formas.ts` encajado por su lado MAYOR en un cuadrado de
 * lado uno, así que lo que mide de ancho lo decide el glifo. Los tres bienes anchos
 * (`junco`, `limo` y `piedra`) salen con ancho normalizado 1,00; `grano` 0,96 y `sal`
 * 0,84.
 *
 * ═══ POR QUÉ 0,27, Y POR QUÉ EL 0,38 QUE HABÍA NO CABÍA ═══
 *
 * Porque 0,38 se comparaba contra `ANCHO_DE_LA_TIRA` (0,385) y las dos son FRACCIONES
 * PLANAS: dan por supuesto que el naipe está de frente y en el plano nominal de la baraja.
 * En pantalla no es ni una cosa ni la otra. El naipe va INCLINADO —`INCLINACION`, hasta
 * 0,13 radianes— y el dibujo va 0,01 POR DELANTE de la cara, o sea más cerca del ojo, donde
 * el lienzo es más estrecho. Las dos cosas lo empujan hacia el borde por el que la carta ya
 * está cortada.
 *
 * Medido proyectando las CUATRO ESQUINAS del rectángulo del dibujo con la cámara del
 * encuadre, en las cuatro proporciones y con manos de una a veinte cartas: con 0,38 la peor
 * esquina cae a 1,0183 del borde del lienzo, o sea un 1,8 % FUERA. En una mano de cinco el
 * dibujo queda dentro sólo entre el 84 % y el 100 % según el naipe y la pantalla —el que
 * peor sale es el más ancho de la mano de 16:9, con un 84 %—. Eso es un glifo cortado por el
 * canto derecho, que es exactamente lo que se bajó el número para evitar.
 *
 * 0,27 deja la peor esquina en 0,9990. El techo exacto está en 0,2813 y 0,28 lo roza —0,9999,
 * o sea a menos de un píxel del borde en un lienzo de mil seiscientos—, así que se toma el
 * redondo de abajo y queda un 4 % de aire medido. Subirlo a 0,29 vuelve a sacarlo, y
 * `verify:escena` lo dice con el número.
 */
export const ALTO_DEL_DIBUJO = 0.27;

/**
 * LO QUE LA MANO ENTERA SE SEPARA EN PROFUNDIDAD, de la primera carta a la última.
 *
 * ═══ ESTO ERA UN PASO POR CARTA, Y DECÍA DE SÍ MISMO QUE «NO DECIDE NADA» ═══
 *
 * Estaba escrito como `z: -DISTANCIA_DE_LA_BARAJA + i * 0,0015`, con un comentario que decía
 * que el orden lo manda `orden` y que esto sólo deja la profundidad coherente. Lo primero es
 * verdad; lo segundo NO: la mano vive a dos unidades del ojo y en PERSPECTIVA, así que
 * acercar la carta diecinueve 0,0285 la agranda un 1,4 % y la empuja hacia fuera por el borde
 * derecho — que es justo el borde por el que la mano ya asoma a medias, y por donde se pierde
 * lo único que se ve de un naipe en reposo.
 *
 * Medido con la cámara del encuadre (45°, 16:9) sobre una mano de veinte: lo que asoma de
 * cada naipe caía del 55,0 % en la primera al 42,9 % en la última. Una QUINTA PARTE de la
 * tira que `ASOMA_QUIETA` promete, perdida por una constante decorativa que en su propio
 * comentario decía no decidir nada. Con la separación repartida entre toda la mano, las
 * veinte se quedan entre el 55,0 y el 54,4 %.
 *
 * Y lo que la constante quería sigue estando: veinte cartas siguen cada una un pelo por
 * delante de la anterior, sólo que el pelo es el mismo para toda la mano y no crece con ella.
 * `verify:escena` mide lo que asoma el peor naipe de manos de una a veinte y en las cuatro
 * proporciones, y lo ve caer con el paso por carta.
 */
const SEPARACION_EN_PROFUNDIDAD = 0.0015;

/**
 * EL ALCANCE DEL IMÁN, en fracción del alto de la pantalla.
 *
 * Es lo que decide que el efecto se lea como imán y no como interruptor: muy corto y
 * sólo se mueve una carta, de golpe; muy largo y se mueven todas por igual, que es lo
 * mismo que no tener imán.
 */
const ALCANCE_DEL_IMAN = 0.13;

/** Desde qué parte del ancho de la pantalla, contando desde la derecha, despierta la mano. */
const ZONA_DE_LA_MANO = 0.22;

/**
 * CUÁNTO SE SEPARAN DOS CARTAS DEL MISMO BIEN, en fracción del alto de una carta.
 *
 * Poco: se solapan mucho, como las cartas iguales de una mano de verdad, y lo que asoma
 * de cada una es su canto. Contar cantos es cómo se sabe de un vistazo que se tienen
 * tres maderas y no dos — sin un número escrito, que además aquí costaría una fuente
 * dentro del lienzo.
 */
const PASO_DENTRO_DEL_GRUPO = 0.2;

/**
 * Y CUÁNTO SE SEPARAN DOS GRUPOS.
 *
 * Tres veces más. Ese hueco es toda la información: sin él, once cartas repartidas son
 * once cartas repartidas, y con él son «tres de éstas, dos de aquéllas». El salto tiene
 * que verse antes de que nadie se pare a mirar.
 */
const PASO_ENTRE_GRUPOS = 0.62;
/** Y cuánto se inclina la mano de la primera carta a la última, en radianes. */
const INCLINACION = 0.13;

/** Lo que la cámara ve a la distancia de la baraja. */
export function loQueSeVeEnLaBaraja(
  campo: number,
  proporcion: number,
): { alto: number; ancho: number } {
  const alto = 2 * DISTANCIA_DE_LA_BARAJA * Math.tan(campo / 2);
  return { alto, ancho: alto * proporcion };
}

/**
 * ¿ESTÁ EL CURSOR EN LA ZONA DE LA MANO?
 *
 * `x` en coordenadas de la cámara. Se pregunta aparte de la posición de las cartas
 * porque la mano despierta ENTERA al acercarse a la franja, y luego el imán reparte
 * dentro. Si cada carta decidiera por su cuenta, acercarse por el borde de arriba no
 * despertaría a las de abajo y la mano parecería medio dormida.
 */
export function enLaZonaDeLaMano(x: number, campo: number, proporcion: number): boolean {
  const { ancho } = loQueSeVeEnLaBaraja(campo, proporcion);
  return x > ancho / 2 - ancho * ZONA_DE_LA_MANO;
}

/**
 * ORDENA LA MANO POR BIEN, agrupando las iguales.
 *
 * Es una función aparte y pura para que se pueda comprobar sin colocar nada: que no
 * pierde ni inventa cartas, que las iguales acaban juntas, y que dos manos con las mismas
 * cartas en distinto orden de llegada salen idénticas — que es lo que hace que la mano se
 * lea siempre igual.
 */
export function manoPorGrupos(mano: readonly CartaEnLaMano[]): CartaEnLaMano[] {
  const sitio = (bien: string): number => {
    const i = ORDEN_DE_LOS_BIENES.indexOf(bien);
    return i < 0 ? ORDEN_DE_LOS_BIENES.length : i;
  };
  return [...mano].sort((a, b) => {
    const d = sitio(a.bien) - sitio(b.bien);
    if (d !== 0) return d;
    /* Desempate por bien y luego por id: dos manos iguales salen exactamente iguales. */
    if (a.bien !== b.bien) return a.bien < b.bien ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * LOS HUECOS DE LA MANO, agrupados por bien.
 *
 * ═══ POR QUÉ POR GRUPOS Y NO POR ORDEN DE LLEGADA ═══
 *
 * Una mano repartida sin agrupar obliga a recorrerla entera para saber qué se tiene: la
 * pregunta que se hace mil veces por partida —«¿me llegan tres maderas?»— pasa a ser un
 * recuento. Agrupada, se responde mirando.
 *
 * Dentro de un grupo las cartas se solapan mucho y lo que asoma de cada una es su canto:
 * contar cantos es contar cuántas se tienen. Entre grupos el hueco es el triple, y ese
 * salto es toda la información.
 *
 * `apunta` es la `y` del cursor en coordenadas de cámara, o `null` si el cursor no está
 * en la zona: con `null` la mano se queda quieta y todas asoman lo mismo.
 *
 * Si con los pasos normales no cabe, se APRIETAN los dos en la misma proporción, en vez
 * de salirse o de comerse el hueco entre grupos — que es lo primero que se pierde si se
 * aprieta a lo bruto, y es justo lo que no se puede perder.
 */
export function huecosDeLaBaraja(
  mano: readonly CartaEnLaMano[],
  campo: number,
  proporcion: number,
  apunta: number | null,
): CartaColocada[] {
  if (mano.length === 0) return [];

  const ordenada = manoPorGrupos(mano);
  const { alto, ancho } = loQueSeVeEnLaBaraja(campo, proporcion);
  const altoDeCarta = alto * ALTO_DE_LA_CARTA;
  const anchoDeCarta = altoDeCarta * ANCHO_SOBRE_ALTO;

  /* Cuántas hay de cada bien, y dónde abre cada grupo. */
  const cuantasDe = new Map<string, number>();
  for (const c of ordenada) cuantasDe.set(c.bien, (cuantasDe.get(c.bien) ?? 0) + 1);

  /* Lo que mide la mano con los pasos sin apretar, para saber si hay que apretarlos. */
  let suma = 0;
  for (let i = 1; i < ordenada.length; i++) {
    const abre = (ordenada[i] as CartaEnLaMano).bien !== (ordenada[i - 1] as CartaEnLaMano).bien;
    suma += abre ? PASO_ENTRE_GRUPOS : PASO_DENTRO_DEL_GRUPO;
  }
  const cabe = alto * 0.92 - altoDeCarta;
  const aprieta = suma > 0 ? Math.min(1, cabe / (suma * altoDeCarta)) : 1;

  const alcance = alto * ALCANCE_DEL_IMAN;
  const colocadas: CartaColocada[] = [];

  /* Se coloca de arriba abajo desde el centro: primero se mide, luego se reparte. */
  let recorrido = 0;
  const desplazamientos: number[] = [0];
  for (let i = 1; i < ordenada.length; i++) {
    const abre = (ordenada[i] as CartaEnLaMano).bien !== (ordenada[i - 1] as CartaEnLaMano).bien;
    recorrido += (abre ? PASO_ENTRE_GRUPOS : PASO_DENTRO_DEL_GRUPO) * altoDeCarta * aprieta;
    desplazamientos.push(recorrido);
  }
  const arriba = recorrido / 2;

  for (let i = 0; i < ordenada.length; i++) {
    const carta = ordenada[i] as CartaEnLaMano;
    const y = arriba - (desplazamientos[i] as number);
    const abreGrupo = i === 0 || (ordenada[i - 1] as CartaEnLaMano).bien !== carta.bien;

    /*
     * EL IMÁN ES UNA CAMPANA, no un escalón ni una recta.
     *
     * Con un escalón —«la más cercana sale, las demás no»— la carta salta de golpe al
     * pasar de una a otra. Con una recta, el reparto se corta en seco al borde del
     * alcance y se ve el filo. La campana sale suave por los dos lados y es lo que hace
     * que el conjunto se lea como una tela que se levanta y no como fichas que saltan.
     */
    const iman = apunta === null ? 0 : Math.exp(-(((y - apunta) / alcance) ** 2));
    const asoma = ASOMA_QUIETA + (ASOMA_TIRADA - ASOMA_QUIETA) * iman;

    colocadas.push({
      carta,
      abreGrupo,
      enElGrupo: cuantasDe.get(carta.bien) ?? 1,
      hueco: {
        x: ancho / 2 + anchoDeCarta * (0.5 - asoma),
        /* Hacia DENTRO: lo que se ve de esta carta queda a su izquierda. Ver `dibujo`. */
        dibujo: asoma / 2 - 0.5,
        y,
        /*
         * Cada carta un pelo más cerca que la anterior, y el pelo se reparte entre TODA la
         * mano en vez de sumarse una vez por carta: ver `SEPARACION_EN_PROFUNDIDAD`. El orden
         * lo sigue mandando `orden`; esto sólo deja la profundidad coherente.
         */
        z:
          -DISTANCIA_DE_LA_BARAJA +
          (ordenada.length > 1 ? (i / (ordenada.length - 1)) * SEPARACION_EN_PROFUNDIDAD : 0),
        ancho: anchoDeCarta,
        alto: altoDeCarta,
        /* La inclinación va de `-INCLINACION` a `+INCLINACION` de arriba abajo. */
        giro:
          ordenada.length > 1 ? INCLINACION * (1 - (2 * i) / (ordenada.length - 1)) : 0,
        iman,
        /*
         * Diez de margen por carta: dentro caben sus tres capas —borde, cara e icono—
         * sin que ninguna pueda colarse entre las de la carta de al lado.
         */
        orden: i * 10,
      },
    });
  }
  return colocadas;
}

/**
 * LAS ÁREAS DE TRUEQUE, que sólo existen mientras se arrastra una carta.
 *
 * Una por bien que se pueda pedir, en columna sobre el lado derecho y por dentro de la
 * mano: se arrastra la carta desde la baraja hacia la izquierda y se suelta en la que
 * se quiera. Van donde va la mano, y no en mitad de la pantalla, porque el gesto es
 * corto a propósito — arrastrar de un borde al otro cansa y en un móvil no se llega.
 */
export function areasDeTrueque(
  cuantas: number,
  campo: number,
  proporcion: number,
): HuecoDeCarta[] {
  if (cuantas <= 0) return [];
  const { alto, ancho } = loQueSeVeEnLaBaraja(campo, proporcion);
  const altoDeArea = Math.min(alto * 0.16, (alto * 0.86) / cuantas);
  const anchoDeArea = altoDeArea * 1.5;
  const paso = altoDeArea * 1.12;
  const primera = ((cuantas - 1) * paso) / 2;

  const huecos: HuecoDeCarta[] = [];
  for (let i = 0; i < cuantas; i++) {
    huecos.push({
      x: ancho / 2 - alto * ALTO_DE_LA_CARTA * ANCHO_SOBRE_ALTO * 0.55 - anchoDeArea * 0.7,
      y: primera - i * paso,
      z: -DISTANCIA_DE_LA_BARAJA,
      ancho: anchoDeArea,
      alto: altoDeArea,
      giro: 0,
      iman: 0,
      /* Un área no asoma por el canto: está entera dentro, y su dibujo va al medio. */
      dibujo: 0,
      /* Todas al mismo nivel: no se solapan entre sí, así que no hay nada que ordenar. */
      orden: 0,
    });
  }
  return huecos;
}

/**
 * EL SITIO DE LA BOLSA DEL DESCARTE, que es el de la casilla de trueque cuando hay una sola.
 *
 * ═══ POR QUÉ EL MISMO SITIO Y NO UNO SUYO ═══
 *
 * Porque el gesto es EL MISMO: se coge una ficha de la mano y se suelta en una casilla. Lo
 * único que cambia es qué hay al otro lado —un vecino que te da algo, o el estiaje que se lo
 * lleva—, y eso lo dice el dibujo de la casilla, no su posición. Una bolsa en otro rincón
 * obligaría a aprender un segundo gesto para el mismo movimiento de la mano, y a aprenderlo
 * justo en el peor momento: cuando acaba de salir un siete y hay prisa.
 *
 * Y sale de `areasDeTrueque` en vez de repetir su cuenta, para que el día que la mano se
 * mueva se muevan las dos. `null` no puede pasar hoy —con `cuantas` en uno siempre devuelve
 * una—, y se declara igual porque el que lo llama tiene que poder no pintar nada.
 */
export function sitioDeLaBolsa(campo: number, proporcion: number): HuecoDeCarta | null {
  return areasDeTrueque(1, campo, proporcion)[0] ?? null;
}
