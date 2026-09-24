/**
 * LOS NOMBRES DE EL QUIEBRO: todo lo que se LEE en pantalla con nombre propio, en un solo sitio.
 *
 * ═══ POR QUÉ VIVEN JUNTOS ═══
 *
 * Tres razones, y la tercera es la que decide:
 *
 *   1. PARA PODER CAMBIARLOS. Un nombre es una decisión de diseño que se revisa —«Mole» puede acabar
 *      siendo otra cosa tras la primera prueba con gente—, y un nombre repartido en veinte ficheros no
 *      se cambia: se cambia en diecinueve.
 *   2. PARA QUE LOS DOS CLIENTES DIGAN LO MISMO. El HUD del lienzo, el tablero de respaldo y el recuento
 *      los pintan ficheros distintos; si cada uno escribe su «Réplica», uno acaba sin tilde.
 *   3. PARA QUE LA VIGILANCIA LEGAL MIRE UN SOLO SITIO. El juego vive cerca de una franquicia muy
 *      conocida, y la defensa es que ningún texto la nombre ni la cite (ver el §1 del documento de
 *      diseño y `verify:procedencia`, que barre las cadenas de `shared/arcade/juegos/`). Con los nombres
 *      juntos, revisar la lista antes de publicar es leer UN fichero.
 *
 * ═══ LAS CLAVES SON LOS IDS, Y NO SE TOCAN ═══
 *
 * Cada tabla va de id a nombre: `estilos.mole` es «Mole». El id es lo que viaja en la vista de la mesa
 * y en los movimientos (`{tipo: 'estilo', carga: {id: 'mole'}}`), lo que guarda el historial y lo que
 * lee `componerReglamento`; el nombre es sólo lo que se pinta. Cambiar un NOMBRE es libre; cambiar un
 * ID rompe las mesas abiertas y los reglamentos publicados, y por eso los tipos de id (`IdDeEstilo`…) se
 * derivan de estas claves: el lector de la vista y las tablas de reglas usan los mismos.
 *
 * ═══ LOS NOMBRES DE LA CIUDAD, POR ÍNDICE ═══
 *
 * La ciudad abierta (`docs/quiebro/CIUDAD-ABIERTA.md`, §2.7) rotula cada esquina y cada plaza. La traza
 * no lleva nombres sino ÍNDICES a las listas de `ciudad` (`quiebro-ciudad.ts`: `PlazaDeLaCiudad.nombre`,
 * `CalleDeLaCiudad.nombre`, `CallejonDeLaCiudad.nombre`), y los largos mínimos de esas listas los fija
 * allí la columna (`NOMBRES_DE_PLAZA_COMO_MINIMO` y compañía): `verify:quiebro` los compara, y compara
 * también que cada plaza de las 32 trazas tenga el nombre de su distrito y su plantilla. El 0 de las
 * plazas es la Glorieta del Relojero, la del centro en todas las trazas. Todos inventados: ni una calle
 * que exista, ni una de la franquicia vecina.
 *
 * ═══ QUÉ NO ESTÁ AQUÍ ═══
 *
 * Los nombres del barrio de antes (calles, neones, la hora), que inventa la semilla de cada noche en
 * `quiebro-barrio.ts`. Y los números: los tiene `quiebro-reglas.ts`.
 */

export const NOMBRES_DEL_QUIEBRO = {
  /** El juego, y la frase de su tarjeta en la Sala. */
  juego: {
    nombre: 'El Quiebro',
    gancho:
      'Lee el golpe, quiébralo en el último instante y la ciudad se detiene para ti. Artes marciales ' +
      'bajo la lluvia, en equipo, hasta la cabina que suena.',
    cabeFrase: 'Ser quien ve venir el golpe',
  },

  /** Los tres estilos: la elección de rol de cada asiento. */
  estilos: {
    gabardina: 'Gabardina',
    ligera: 'Ligera',
    mole: 'Mole',
  },

  /** Los retoques que se eligen en la pausa (seis en la v1). */
  retoques: {
    'paso-largo': 'Paso largo',
    'ventana-ancha': 'Ventana ancha',
    'replica-doble': 'Réplica doble',
    'puno-de-plomo': 'Puño de plomo',
    iman: 'Imán',
    enlace: 'Enlace',
  },

  /** Las averías de la noche (tres en la v1, más ninguna). */
  averias: {
    ninguna: 'Sin avería',
    eco: 'Eco',
    cristal: 'Cristal',
    apagon: 'Apagón',
  },

  /** Las recetas de oleada (seis en la v1). */
  recetas: {
    enjambre: 'Enjambre',
    pareja: 'Pareja',
    pinza: 'Pinza',
    marea: 'Marea',
    francotirador: 'Francotirador',
    emboscada: 'Emboscada',
  },

  /** Las contramedidas de la Memoria del Sistema (tres, más ninguna). */
  contramedidas: {
    ninguna: 'Sin contramedida',
    'monedas-caras': 'Monedas caras',
    tiradores: 'Tiradores',
    'plaza-despejada': 'Plaza despejada',
  },

  /** Los niveles de noche, del 1 al 5, en orden. */
  niveles: ['Llovizna', 'Chaparrón', 'Aguacero', 'Temporal', 'Tormenta'],

  /** Las plantillas de plaza de la v1 de la ciudad abierta (§2.3); la fase 2 trae más. */
  plantillas: {
    glorieta: 'Glorieta',
    porticada: 'Porticada',
    patio: 'Patio de carga',
  },

  /**
   * LA CIUDAD ABIERTA (§2): sus distritos, sus avenidas y las listas por índice de plazas, calles y
   * pasajes (ver la cabecera). Las plazas van por plantilla y distrito como las pone la traza: el 0 es la
   * Glorieta del Relojero; 1, 6 y 11, la porticada del Casco; 2, 7 y 12, el patio de las Naves; 3, 8 y
   * 13, la porticada de la Lonja; 4, 9 y 14, la glorieta del Ensanche; 5, 10 y 15, la de las Torres.
   */
  ciudad: {
    distritos: {
      casco: 'El Casco',
      ensanche: 'El Ensanche',
      lonja: 'La Lonja',
      naves: 'Las Naves',
      torres: 'Las Torres',
    },
    avenidas: {
      elevado: 'Avenida del Elevado',
      bulevar: 'El Bulevar',
    },
    plazas: [
      'Glorieta del Relojero',
      'Plaza Mayor',
      'Patio de Carga',
      'Plaza de la Lonja',
      'Glorieta del Ensanche',
      'Plaza de las Torres',
      'Plaza de los Soportales',
      'Patio del Muelle Seco',
      'Plaza del Pescado',
      'Glorieta de los Faroles',
      'Plaza del Vidrio',
      'Plaza de la Campana',
      'Patio de las Grúas',
      'Plaza de las Especias',
      'Glorieta de la Fuente Vieja',
      'Plaza del Mirador',
    ],
    calles: [
      'Calle del Sereno',
      'Calle de la Lluvia',
      'Calle del Insomnio',
      'Calle de los Relojes',
      'Calle del Farol',
      'Calle de la Madrugada',
      'Calle del Paraguas',
      'Calle de las Persianas',
      'Calle del Tranvía',
      'Calle de los Charcos',
      'Calle de la Niebla',
      'Calle del Andén',
      'Calle de la Esquina Rota',
      'Calle de los Neones',
      'Calle del Buzón',
      'Calle del Adoquín',
      'Calle de la Gotera',
      'Calle del Escaparate',
      'Calle de los Toldos',
      'Calle del Carbón',
      'Calle de la Imprenta',
      'Calle de las Antenas',
      'Calle del Semáforo',
      'Calle del Almanaque',
      'Calle de los Tejados',
      'Calle del Portal',
      'Calle de la Farmacia',
      'Calle del Quiosco',
      'Calle de las Golondrinas',
      'Calle del Reloj Parado',
      'Calle de la Última Parada',
      'Calle del Vapor',
      'Calle de los Balcones',
      'Calle del Zaguán',
      'Calle de la Vía Muerta',
      'Calle del Desvelo',
      'Calle de la Tinta',
      'Calle del Hilo',
      'Calle de las Cornisas',
      'Calle del Último Tranvía',
    ],
    pasajes: [
      'Pasaje del Gato',
      'Pasaje Oscuro',
      'Pasaje del Tendedero',
      'Pasaje de las Goteras',
      'Pasaje del Cartero',
      'Pasaje de la Escalera',
      'Pasaje del Humo',
      'Pasaje de los Cubos',
      'Pasaje del Silbido',
      'Pasaje de la Cal',
      'Pasaje del Remiendo',
      'Pasaje del Candil',
      'Pasaje de la Rendija',
      'Pasaje del Alambre',
      'Pasaje del Susurro',
      'Pasaje de la Chatarra',
      'Pasaje del Vaho',
      'Pasaje de la Muralla',
      'Pasaje del Clavo',
      'Pasaje de las Latas',
      'Pasaje de la Polilla',
      'Pasaje del Paragüero',
      'Pasaje de la Lavandería',
      'Pasaje del Afilador',
    ],
  },

  /**
   * LO QUE SE LEE DE LA NOCHE EN LA CIUDAD (§3, §7.5 de la ciudad abierta). La entrega 1 sólo abre la
   * ciudad —las oleadas siguen en la plaza de la Bajada—, así que las fases se siguen rotulando con
   * `fases`; estas palabras entran ya para que pasen por `verify:procedencia` y el cliente las tome de un
   * solo sitio cuando lleguen los Fallos (entrega 2).
   */
  noche: {
    tramo: 'Tramo',
    tregua: 'Tregua',
    fallo: 'Fallo',
    lectura: 'Lectura',
    custodio: 'Custodio',
    emboscada: 'Emboscada',
    ronda: 'Ronda',
    madrugon: 'Madrugón',
    andarin: 'El Andarín',
  },

  /** EL MINIMAPA Y EL PLANO (§5.9): sus rótulos, los que hoy escribe `hud/mapa.ts`. */
  mapa: {
    plano: 'Plano',
    cerrar: 'Cerrar el plano',
    aqui: 'Aquí',
    soltarRumbo: 'Soltar el rumbo',
    tu: 'Tú',
    fallo: 'Fallo',
    cabina: 'Cabina',
    companero: 'Compañero',
    refugio: 'Refugio',
    vigia: 'Vigía',
    ayuda: 'Toca un sitio: «Aquí». Toca un Fallo o una cabina: rumbo.',
    minimapa: 'Minimapa',
  },

  /** Los títulos del recuento. */
  titulos: {
    'mas-limpios': 'Más limpios',
    'racha-mas-larga': 'Racha más larga',
    'mas-desalojos': 'Más desalojos',
    'mas-rescates': 'Más rescates',
    'el-avaro': 'El Avaro',
  },

  /** El voto de la pausa, desde la tercera oleada. */
  votos: {
    llamar: 'Llamar ya',
    aguantar: 'Aguantar',
  },

  /** Las fases de la noche, como se rotulan. */
  fases: {
    reunion: 'Reunión',
    bajada: 'La Bajada',
    oleada: 'Oleada',
    propina: 'Propina',
    pausa: 'Pausa',
    bis: 'El Bis',
    llamada: 'La Llamada',
    amanecer: 'Amanecer',
    recuento: 'Recuento',
    interrumpida: 'Noche interrumpida',
    final: 'Fin de la noche',
    cerrada: 'Mesa cerrada',
  },

  /** Cómo acabó una noche o una oleada. */
  resultados: {
    ganada: 'Noche ganada',
    perdida: 'Noche perdida',
    aguantada: 'Aguantada',
    rendida: 'Os habéis rendido',
  },

  /** Quién es quién. */
  gente: {
    desvelado: 'Desvelado',
    desvelados: 'Desvelados',
    durmiente: 'Durmiente',
    durmientes: 'Durmientes',
    sistema: 'El Sistema',
  },

  /** Los enemigos. */
  enemigos: {
    prestado: 'Prestado',
    celador: 'Celador',
    tirador: 'Celador tirador',
    mayor: 'Celador Mayor',
  },

  /** Los golpes y lo que se hace con ellos. */
  golpes: {
    tanda: 'Tanda',
    entrada: 'Entrada',
    seguida: 'Seguida',
    cierre: 'Cierre',
    empellon: 'Empellón',
    replica: 'Réplica',
    acometida: 'Acometida',
    aCompas: 'A compás',
    respuesta: 'Respuesta',
    estampado: 'Estampado',
  },

  /** La esquiva y sus variantes. */
  quiebros: {
    quiebro: 'Quiebro',
    limpio: 'Quiebro limpio',
    torpe: 'Quiebro torpe',
    ruptura: 'Quiebro de ruptura',
    esquivado: 'Esquivado',
  },

  /** Los estados que se rotulan sobre un cuerpo. */
  estados: {
    remanso: 'Remanso',
    tocado: 'Tocado',
    derribado: 'Derribado',
    descolocado: 'Descolocado',
    desconectado: 'Desconectado',
    desalojable: 'Desalojable',
    desalojando: 'Desalojando',
    rescatando: 'Rescatando',
    descolgando: 'Descolgando',
    ausente: 'Ausente',
    vigia: 'Vigía',
  },

  /** Lo que le pasa al Sistema y a sus Celadores, con nombre. */
  sucesos: {
    impresion: 'Impresión',
    desalojo: 'Desalojo',
    trasvase: 'Trasvase',
    bis: 'El Bis',
    salida: 'Salida',
  },

  /** Lo que se cuenta y se lleva. */
  cuentas: {
    aguante: 'Aguante',
    foco: 'Foco',
    racha: 'Racha',
    esquirla: 'Esquirla',
    esquirlas: 'Esquirlas',
    moneda: 'Moneda',
    monedas: 'Monedas',
    puntos: 'Puntos',
    noche: 'Noche',
    nivel: 'Nivel',
    memoria: 'Memoria del Sistema',
    mejorNoche: 'Mejor noche de la mesa',
    conUnaMas: 'con una más',
  },

  /** Los sitios con nombre. */
  lugares: {
    glorieta: 'Glorieta',
    barrio: 'Barrio',
    cabina: 'Cabina',
    cabinaDeRefugio: 'Cabina de refugio',
    grafia: 'La Grafía',
    barDesvelo: 'El Bar Desvelo',
  },

  /** Los modos de las fases posteriores (se nombran en la tarjeta de «próximamente»). */
  modos: {
    azotea: 'La Azotea',
    celador: 'El Celador',
  },

  /** Los botones del mando táctil y los rótulos de USAR según lo que haya cerca. */
  botones: {
    bajar: 'BAJAR',
    golpe: 'GOLPE',
    quiebro: 'QUIEBRO',
    empellon: 'EMPELLÓN',
    usar: 'USAR',
    aviso: 'AVISO',
    rematar: 'Rematar',
    rescatar: 'Rescatar',
    descolgar: 'Descolgar',
    menu: 'Menú',
    marcador: 'Marcador',
  },

  /** Las clases de aviso (AVISO): lo que ven los demás. */
  avisos: {
    marcar: 'Marcado',
    rescate: 'Rescate',
    voy: 'Voy',
    desalojalo: '¡Desalójalo!',
  },

  /** Los botones de la mesa: entrar, empezar y lo que se hace al acabar. */
  mesa: {
    jugarYa: 'Jugar ya',
    abrirMesa: 'Abrir mesa',
    entrarConCodigo: 'Entrar con código',
    empezar: 'EMPEZAR',
    bajar: 'BAJAR',
    elegirEstilo: 'Elige estilo',
    elegirRetoque: 'Elige un retoque',
    otraNoche: 'Otra noche',
    cerrarLaMesa: 'Cerrar la mesa',
    otraMesa: 'Otra mesa',
    reanudar: 'Reanudar',
    rendirse: 'Rendirse',
  },

  /** Los rótulos grandes que salen en pantalla y se repiten. */
  pantalla: {
    muevete: 'Muévete',
    quiebroAlCerrarse: 'QUIEBRO cuando se cierre',
    golpeAhora: '¡GOLPE!',
    vienenMas: 'Vienen más',
    suenaUnaCabina: 'Suena una cabina',
    ciudadSeReinicia: 'La ciudad se reinicia',
    ciudadLlena: 'La ciudad está llena: prueba en un minuto',
    giraElTelefono: 'Gira el teléfono',
    sinSonido: 'El teléfono está en silencio: los golpes también se oyen',
    actualiza: 'Actualiza la app para jugar esta noche',
    reconectando: 'Volviendo a la calle…',
  },
} as const;

/* ─── LOS IDS, DERIVADOS DE LAS CLAVES ───────────────────────────────────── */

export type IdDeEstilo = keyof typeof NOMBRES_DEL_QUIEBRO.estilos;
export type IdDeRetoque = keyof typeof NOMBRES_DEL_QUIEBRO.retoques;
export type IdDeAveria = keyof typeof NOMBRES_DEL_QUIEBRO.averias;
export type IdDeReceta = keyof typeof NOMBRES_DEL_QUIEBRO.recetas;
export type IdDeContramedida = keyof typeof NOMBRES_DEL_QUIEBRO.contramedidas;
export type IdDePlantilla = keyof typeof NOMBRES_DEL_QUIEBRO.plantillas;
export type IdDeTitulo = keyof typeof NOMBRES_DEL_QUIEBRO.titulos;
export type IdDeVoto = keyof typeof NOMBRES_DEL_QUIEBRO.votos;

/** Las claves de una tabla, como lista: para los lectores estrictos y los comprobadores. */
function clavesDe<T extends object>(tabla: T): readonly (keyof T & string)[] {
  return Object.keys(tabla) as (keyof T & string)[];
}

export const IDS_DE_ESTILO: readonly IdDeEstilo[] = clavesDe(NOMBRES_DEL_QUIEBRO.estilos);
export const IDS_DE_RETOQUE: readonly IdDeRetoque[] = clavesDe(NOMBRES_DEL_QUIEBRO.retoques);
export const IDS_DE_AVERIA: readonly IdDeAveria[] = clavesDe(NOMBRES_DEL_QUIEBRO.averias);
export const IDS_DE_RECETA: readonly IdDeReceta[] = clavesDe(NOMBRES_DEL_QUIEBRO.recetas);
export const IDS_DE_CONTRAMEDIDA: readonly IdDeContramedida[] = clavesDe(NOMBRES_DEL_QUIEBRO.contramedidas);
export const IDS_DE_PLANTILLA: readonly IdDePlantilla[] = clavesDe(NOMBRES_DEL_QUIEBRO.plantillas);
export const IDS_DE_TITULO: readonly IdDeTitulo[] = clavesDe(NOMBRES_DEL_QUIEBRO.titulos);
export const IDS_DE_VOTO: readonly IdDeVoto[] = clavesDe(NOMBRES_DEL_QUIEBRO.votos);

/** El primer y el último nivel de noche. */
export const PRIMER_NIVEL = 1;
export const ULTIMO_NIVEL = NOMBRES_DEL_QUIEBRO.niveles.length;

/** El nombre de un nivel de noche (1-5); cadena vacía si no es un nivel. */
export function nombreDelNivel(nivel: number): string {
  if (!Number.isInteger(nivel) || nivel < PRIMER_NIVEL || nivel > ULTIMO_NIVEL) return '';
  return NOMBRES_DEL_QUIEBRO.niveles[nivel - 1] as string;
}

/** Los distritos con su nombre: las claves son los `IdDeDistrito` de `quiebro-ciudad.ts` (lo mira `verify:quiebro`). */
export type IdDeDistritoConNombre = keyof typeof NOMBRES_DEL_QUIEBRO.ciudad.distritos;

/** Un nombre de una lista por índice; cadena vacía fuera de ella (un índice raro no se pinta como `undefined`). */
function deLaLista(lista: readonly string[], i: number): string {
  return Number.isInteger(i) && i >= 0 && i < lista.length ? (lista[i] as string) : '';
}

/** El nombre de la plaza de índice `i` (`PlazaDeLaCiudad.nombre`). */
export function nombreDePlaza(i: number): string {
  return deLaLista(NOMBRES_DEL_QUIEBRO.ciudad.plazas, i);
}

/** El nombre de la calle de índice `i` (`CalleDeLaCiudad.nombre`; −1, la avenida, no tiene: va por `ciudad.avenidas`). */
export function nombreDeCalle(i: number): string {
  return deLaLista(NOMBRES_DEL_QUIEBRO.ciudad.calles, i);
}

/** El nombre del pasaje de índice `i` (`CallejonDeLaCiudad.nombre`). */
export function nombreDePasaje(i: number): string {
  return deLaLista(NOMBRES_DEL_QUIEBRO.ciudad.pasajes, i);
}
