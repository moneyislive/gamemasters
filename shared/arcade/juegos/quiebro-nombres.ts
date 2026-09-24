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
 * ═══ QUÉ NO ESTÁ AQUÍ ═══
 *
 * Los nombres del barrio (calles, neones, la hora): los inventa la semilla de cada noche en
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

  /** Las plantillas de plaza (una en la v1). */
  plantillas: {
    glorieta: 'Glorieta',
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
