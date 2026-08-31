/**
 * LA LISTA NEGRA: nombres que no pueden aparecer en un arcade de esta casa.
 *
 * La usa `verify:procedencia`, que la contrasta contra el nombre visible de cada
 * arcade, su gancho, sus rótulos y el contenido de sus barajas.
 *
 * ═══ POR QUÉ EXISTE, SI LAS REGLAS DE UN JUEGO SON LIBRES ═══
 *
 * Porque lo que está protegido no son las reglas: es la EXPRESIÓN. La mecánica de
 * charadas no la protege nadie, y ningún tribunal ha protegido nunca «adivina la
 * palabra que llevas en la frente». Lo que sí protege la ley —y con mucha más
 * dureza las tiendas, donde no hay juicio sino retirada— es el nombre, la marca,
 * el arte y los personajes.
 *
 * En un juego de adivinar nombres, la expresión ES el contenido de las cartas. O
 * sea que todo el riesgo legal de La Frente está en su baraja, y el peligro
 * concreto está nombrado desde el diseño: que la baraja la genere un modelo y
 * meta un personaje de un estudio sin que nadie haya tomado una decisión.
 *
 * ═══ POR QUÉ EN UN FICHERO Y NO DENTRO DEL COMPROBADOR ═══
 *
 * Para que se pueda revisar sin leer código, y para que ampliarla sea una línea
 * en un diff que alguien firma. Una lista negra escondida en medio de un
 * comprobador la lee quien la escribió y nadie más.
 *
 * ═══ Y POR QUÉ CADA ENTRADA LLEVA SU PORQUÉ ═══
 *
 * Ésta es la parte que el encargo exige por escrito, y tiene motivo. Una lista de
 * nombres prohibidos sin explicación envejece de la peor manera: dentro de dos
 * años nadie sabe si un nombre está porque es una marca viva, porque lo pidió un
 * abogado o porque a alguien le sonó mal, y entonces no se puede ni ampliar ni
 * podar. Con el porqué al lado, quitar una entrada es un argumento y no una
 * corazonada.
 *
 * ═══ EL PUNTO DÉBIL DE CUALQUIER LISTA NEGRA, DICHO AQUÍ ═══
 *
 * Los nombres que también son palabras corrientes. «Mario» es un nombre de pila
 * castellano y «Sonic» aparece en cualquier texto técnico: meterlos sueltos
 * convertiría el comprobador en un cepo que salta con cartas legítimas, y un
 * comprobador que da falsos rojos acaba desactivado — que es estrictamente peor
 * que no tenerlo.
 *
 * Así que aquí solo entran nombres INEQUÍVOCOS, y los ambiguos se escriben con su
 * acompañante («Super Mario», «Mario Bros»). Lo que esta lista NO puede cazar es
 * exactamente lo que justifica la otra mitad de la defensa: que la baraja se
 * escriba a mano, familia por familia, sabiendo de dónde sale cada carta. La
 * lista es la red; la familia es el suelo.
 */

/** Un nombre que no puede salir, y la razón exacta por la que está aquí. */
export interface MarcaVetada {
  /** El nombre tal como se escribiría. Se compara sin acentos y sin mayúsculas. */
  nombre: string;
  /**
   * POR QUÉ ESTÁ AQUÍ. Obligatorio, y el comprobador se pone rojo si falta:
   * una entrada sin explicación es una entrada que nadie podrá revisar.
   */
  porque: string;
}

/**
 * Los estudios y editoriales cuyos catálogos enteros están vivos.
 *
 * No es que sus personajes estén protegidos uno a uno: es que el NOMBRE del
 * estudio en una carta, en una descripción de tienda o en una palabra clave es lo
 * que las tiendas sancionan directamente. La guía 4.1(c) de Apple prohíbe usar el
 * nombre de producto de otro desarrollador en el icono o el nombre de la app.
 */
const ESTUDIOS: MarcaVetada[] = [
  { nombre: 'Disney', porque: 'The Walt Disney Company. Marca viva y el litigante más activo del sector.' },
  { nombre: 'Pixar', porque: 'De Disney desde 2006. Mismo caso, y su catálogo entero está en plazo.' },
  { nombre: 'Marvel', porque: 'De Disney desde 2009. Sus personajes son marca además de obra.' },
  { nombre: 'DC Comics', porque: 'De Warner. Sus personajes están registrados como marca en juguetes y juegos.' },
  { nombre: 'Nintendo', porque: 'Persigue el uso de sus personajes con más constancia que ninguna otra.' },
  { nombre: 'Hasbro', porque: 'Dueña de CLUEDO y de media estantería de juegos de mesa. Es la que reclamaría.' },
  { nombre: 'Ghibli', porque: 'Studio Ghibli. Obra reciente, y sus personajes son marca en mercancía.' },
  { nombre: 'Lucasfilm', porque: 'De Disney. Star Wars e Indiana Jones cuelgan de aquí.' },
  { nombre: 'Warner Bros', porque: 'Looney Tunes, DC y Harry Potter. Catálogo vivo entero.' },
];

/**
 * Personajes concretos, y todos de obras EN PLAZO.
 *
 * La regla para entrar aquí es que el nombre no signifique otra cosa en
 * castellano. Un personaje de una obra en plazo es doblemente delicado: es obra
 * protegida y, casi siempre, marca registrada en la clase de los juegos.
 */
const PERSONAJES: MarcaVetada[] = [
  { nombre: 'Mickey Mouse', porque: 'El cortometraje de 1928 es de dominio público desde 2024; el PERSONAJE moderno y su nombre siguen siendo marca de Disney. La confusión es justo la trampa.' },
  { nombre: 'Pikachu', porque: 'Pokémon. Es el ejemplo que el propio diseño pone de lo que no puede colarse en la baraja.' },
  { nombre: 'Pokemon', porque: 'The Pokémon Company. Marca y obra, las dos vivas.' },
  { nombre: 'Super Mario', porque: 'Nintendo. Va con acompañante porque «Mario» suelto es un nombre de pila castellano.' },
  { nombre: 'Mario Bros', porque: 'Lo mismo, con el otro acompañante con el que se escribe.' },
  { nombre: 'Zelda', porque: 'Nintendo. Como nombre de pila es rarísimo en castellano, así que no hace falta acompañante.' },
  { nombre: 'Donkey Kong', porque: 'Nintendo. Personaje y marca registrada en juegos desde 1981, con litigio propio célebre.' },
  { nombre: 'Batman', porque: 'DC. Marca registrada en juegos y juguetes.' },
  { nombre: 'Superman', porque: 'DC. Idem, y con litigios propios sobre el nombre.' },
  { nombre: 'Spiderman', porque: 'Marvel. Se escribe de tres maneras y ninguna vale.' },
  { nombre: 'Spider-Man', porque: 'Marvel. La grafía oficial, por si alguien la copia de la película.' },
  { nombre: 'Iron Man', porque: 'Marvel. En castellano también se escribe «Hombre de Hierro», y las dos formas son de la misma casa.' },
  { nombre: 'Darth Vader', porque: 'Lucasfilm. El personaje más reconocible de una obra en plazo.' },
  { nombre: 'Star Wars', porque: 'Lucasfilm. La marca, además de la obra.' },
  { nombre: 'Harry Potter', porque: 'Obra de 1997: le quedan décadas de plazo, y es marca en juegos.' },
  { nombre: 'Hogwarts', porque: 'Mismo caso. Un topónimo inventado y protegido no es un topónimo.' },
  { nombre: 'Goku', porque: 'Dragon Ball. Obra y marca vivas.' },
  { nombre: 'Dragon Ball', porque: 'Toei y Shueisha. El anime contemporáneo está fuera por completo.' },
  { nombre: 'Naruto', porque: 'Shueisha. Anime contemporáneo.' },
  { nombre: 'Totoro', porque: 'Studio Ghibli. Obra de 1988 y logotipo de la casa: es su marca además de su personaje.' },
  { nombre: 'Bob Esponja', porque: 'Paramount. Obra de 1999.' },
  { nombre: 'Peter Pan', porque: 'La obra es antigua y el hospital Great Ormond Street conserva un derecho perpetuo sobre ella en el Reino Unido, que es un caso único y que casi nadie conoce.' },
  { nombre: 'Tarzan', porque: 'La obra ya está en dominio público en muchos países y «Tarzan» sigue siendo MARCA REGISTRADA de Edgar Rice Burroughs, Inc. Es el ejemplo perfecto de que dominio público y marca son dos cosas distintas.' },
];

/**
 * Juegos de mesa y videojuegos. La familia más peligrosa para una casa como ésta.
 *
 * Porque aquí el error no es meter un personaje ajeno: es NOMBRAR AL JUEGO DEL
 * QUE SE COPIÓ LA MECÁNICA. Copiar reglas es legítimo —lo dicen la Oficina de
 * Copyright de EEUU, la Ley de Patentes y el TJUE— y nombrar el original en el
 * título, el subtítulo, la descripción o las palabras clave es exactamente lo que
 * las tiendas sancionan. Que un repositorio clon tenga licencia MIT no cambia
 * nada: MIT licencia el código de quien lo escribió, no la marca de un tercero.
 */
const JUEGOS: MarcaVetada[] = [
  { nombre: 'Cluedo', porque: 'Marca de Hasbro. La mecánica de deducción es libre —la patente de Pratt caducó en los sesenta— y el nombre no. Esta casa ya lo tiene apuntado como riesgo vivo en su otro motor.' },
  { nombre: 'Monopoly', porque: 'Hasbro. Es el caso de manual sobre marcas de juegos de mesa: las reglas se copiaron mil veces y el nombre nunca.' },
  { nombre: 'Catan', porque: 'Catan GmbH. El nombre no se puede usar ni evocar: ni en título, ni en subtítulo, ni en palabras clave, ni en URL.' },
  { nombre: 'Settlers', porque: 'La otra mitad del mismo nombre, y la que se cuela en inglés.' },
  { nombre: 'Trivial Pursuit', porque: 'Hasbro. Y «Trivial» a secas se dice en castellano, por eso va con el apellido.' },
  { nombre: 'Scrabble', porque: 'Mattel en unos territorios y Hasbro en otros, lo que significa que hay dos que podrían reclamar.' },
  { nombre: 'Party & Co', porque: 'Diset. El juego de fiesta español con el que se compararía éste.' },
  { nombre: 'Tabu', porque: 'Hasbro. Es el juego de adivinar palabras del que La Frente es primo, así que es el nombre que a alguien le tentaría escribir en la descripción.' },
  { nombre: 'Heads Up', porque: 'La app de charadas en la frente más conocida. Mismo caso que el anterior y más cercano todavía.' },
  { nombre: 'Minecraft', porque: 'Mojang, de Microsoft. Obra viva y marca registrada en la clase de los juegos.' },
  { nombre: 'Fortnite', porque: 'Epic Games. Obra viva, y una casa con departamento legal muy activo.' },
  { nombre: 'Lego', porque: 'Marca defendida con una agresividad documentada.' },
  { nombre: 'Playmobil', porque: 'Geobra Brandstätter. Marca viva en la misma clase que un juego de mesa.' },
  { nombre: 'Barbie', porque: 'Mattel. Marca defendida hasta en canciones, con jurisprudencia propia sobre el nombre.' },
];

/**
 * MARCAS QUE PARECEN PALABRAS, y ésta es la familia que nadie ve venir.
 *
 * Media docena de objetos de andar por casa se nombran en castellano con una
 * marca registrada. Quien escriba una baraja de objetos cotidianos las meterá sin
 * pensarlo dos veces, porque en la cabeza de todo el mundo son el nombre del
 * objeto — y siguen siendo marcas vivas, con dueño y con abogados.
 *
 * Es la familia con más probabilidad real de aparecer en una baraja de esta casa,
 * y la única cuyo arreglo es trivial: existe el nombre común y no le falta nada.
 */
const MARCAS_QUE_PARECEN_PALABRAS: MarcaVetada[] = [
  { nombre: 'Tirita', porque: 'Marca registrada de Hartmann en España. El nombre común es «apósito» o «venda adhesiva».' },
  { nombre: 'Kleenex', porque: 'Kimberly-Clark. El nombre común es «pañuelo de papel».' },
  { nombre: 'Post-it', porque: '3M. El nombre común es «nota adhesiva».' },
  { nombre: 'Velcro', porque: 'Velcro Companies, que hace campañas públicas pidiendo que no se use como nombre común. El nombre común es «cierre de gancho y bucle».' },
  { nombre: 'Tupperware', porque: 'Tupperware Brands. El nombre común es «fiambrera» o «recipiente hermético».' },
  { nombre: 'Aspirina', porque: 'Bayer, y marca viva en España aunque sea genérica en otros países. El nombre común es «ácido acetilsalicílico».' },
  { nombre: 'Jacuzzi', porque: 'Jacuzzi Brands. El nombre común es «bañera de hidromasaje».' },
  { nombre: 'Chupa Chups', porque: 'Perfetti Van Melle. El nombre común es «caramelo con palo».' },
  { nombre: 'Danone', porque: 'El nombre común es «yogur», y es el ejemplo español clásico de marca usada como categoría.' },
  { nombre: 'Albal', porque: 'El nombre común es «papel de aluminio».' },
];

/**
 * PERSONAS HISTÓRICAS REALES CUYO NOMBRE ES UNA MARCA VIVA.
 *
 * ═══ LA FAMILIA QUE FALTABA, Y LA QUE DE VERDAD IBA A PASAR AQUÍ ═══
 *
 * Esta lista tenía estudios, personajes de ficción, juegos de mesa y marcas que
 * parecen palabras, y con eso pasaba en verde mientras la baraja de La Frente
 * llevaba el único nombre que un titular activo podía reclamar. El fallo no
 * estaba en la red: estaba en que a la red le faltaba una categoría entera.
 *
 * Y la casa YA CONOCÍA la distinción sin haberla aplicado a las personas: la
 * entrada de `Tarzan` de aquí arriba dice, con estas palabras, que dominio
 * público y marca son dos cosas distintas. Con una persona real pasa lo mismo y
 * cuesta más verlo, porque el argumento que tranquiliza —«está muerto hace un
 * siglo, no hay nada que licenciar»— es verdad sobre el COPYRIGHT y no dice
 * absolutamente nada sobre la MARCA. Una marca no caduca con la persona: se
 * renueva mientras alguien la use y la pague.
 *
 * ═══ EL CRITERIO, ESCRITO PARA QUE ESTO NO SE CONVIERTA EN UNA PURGA ═══
 *
 * No entra aquí una persona por ser famosa ni por ser reciente. Entra cuando
 *
 *   HAY UN TITULAR ACTIVO QUE REGISTRA O LICENCIA SU NOMBRE COMO MARCA EN
 *   MERCANCÍA DE CONSUMO, Y CON MÁS RAZÓN EN LA CLASE DE LOS JUGUETES Y JUEGOS.
 *
 * Con ese listón, Beethoven se queda en la baraja aunque haya un perro de
 * película que se llame así, y Napoleón se queda aunque sea un coñac: nadie
 * registra ni licencia el nombre de la persona. Lo que decide no es la fecha de
 * la muerte, es si hay alguien cobrando por el nombre hoy.
 */
const PERSONAS_CON_MARCA_VIVA: MarcaVetada[] = [
  {
    nombre: 'Frida Kahlo',
    porque:
      'Murió en 1954 y su nombre es marca registrada viva de Frida Kahlo Corporation, que la defiende en la clase de los juguetes y juegos: en 2018 litigó contra Mattel por una muñeca. Es el caso exacto de «personaje histórico real» cuyo nombre no se puede poner en una carta.',
  },
  {
    nombre: 'Amelia Earhart',
    porque:
      'Su nombre lo gestiona y licencia comercialmente CMG Worldwide, y hay registros vivos sobre él en mercancía. El riesgo es menor que el anterior y del mismo tipo, y una carta de una baraja no vale lo que cuesta discutirlo.',
  },
];

/**
 * TODA la lista, que es lo que lee el comprobador.
 *
 * Se junta aquí y no se exporta por familias porque quien comprueba no tiene por
 * qué saber de familias: las familias son para quien REVISA, que es la otra mitad
 * del trabajo y la que justifica que este fichero se lea de arriba abajo.
 */
export const MARCAS_VETADAS: readonly MarcaVetada[] = [
  ...ESTUDIOS,
  ...PERSONAJES,
  ...JUEGOS,
  ...MARCAS_QUE_PARECEN_PALABRAS,
  ...PERSONAS_CON_MARCA_VIVA,
];
