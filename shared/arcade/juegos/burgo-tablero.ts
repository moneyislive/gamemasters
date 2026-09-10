/**
 * LA TABLA DEL BURGO: cuarenta casillas y treinta y dos cartas, como DATO.
 *
 * ═══ QUÉ ES ESTE FICHERO Y QUÉ NO ═══
 *
 * Es la hoja que hay pegada al tablero: qué casilla hay en cada índice, cuánto
 * cuesta, cuánto cobra, de qué barrio es, qué dice cada carta. No hay aquí ni una
 * regla —ninguna función decide quién paga a quién—: eso vive en `burgo.ts`. Lo
 * único que hay además de tablas son tres cuentas de un renglón (hipoteca, interés,
 * deshipoteca) y las de traducir una carta a su serie y vuelta, que son la tabla
 * mirada del revés.
 *
 * Y está separado del reductor a propósito, por el CABLE: los dos clientes y la
 * traducción a la escena lo compilan, así que la vista no repite en cada lectura
 * los cuarenta nombres, los precios, las rentas ni los textos de las cartas. La
 * vista publica índices y números; el que pinta los busca aquí. Una lectura de
 * mesa pesa lo que pesa el estado, no lo que pesa el reglamento.
 *
 * ═══ TODO ENTERO, TODO `readonly`, TODO EN ORDEN DE ÍNDICE ═══
 *
 * Las 40 filas van en el orden del anillo (0 = la Salida, sentido de la marcha) y
 * `verify:mecanicas-burgo` afirma que `CASILLAS[i].indice === i`: la tabla se lee
 * por posición y una fila movida sin querer sería un tablero que se pinta bien y
 * cobra mal. Los precios son todos PARES para que la hipoteca (la mitad) sea entera
 * sin redondear; las rentas de un solar crecen estrictamente de solar a hotel; y
 * `rentas` en cualquier casilla que no cobre por edificios es `[0, 0, 0, 0, 0, 0]`,
 * nunca una lista más corta, para que nadie tenga que preguntar por la longitud.
 *
 * ═══ LA EXPRESIÓN ES NUESTRA, Y ESO SE MIDE ═══
 *
 * El Burgo es una creación propia sobre una mecánica de dominio público (la
 * patente del juego del que desciende caducó en 1921; las reglas de un juego no
 * son objeto de copyright ni de patente). Lo que sí está protegido es la
 * EXPRESIÓN —nombres, marca, textos— y por eso aquí todo es propio: las cuarenta
 * calles de una ciudad inventada, los ocho barrios con su carácter, los textos de
 * las treinta y dos cartas. Ningún nombre coincide con los de ninguna edición
 * comercial, ninguna marca ajena se nombra —ni siquiera para decir que no se
 * nombra— y `verify:procedencia` barre cada cadena literal de este fichero contra
 * `server/scripts/marcas-registradas.ts`; `verify:mecanicas-burgo` barre además
 * los COMENTARIOS, por higiene.
 *
 * ═══ LOS OCHO COLORES DE ACERA, MEDIDOS CONTRA LOS SEIS DE ASIENTO ═══
 *
 * Los barrios se llaman por su color en el reglamento (pardo, celeste, rosa,
 * naranja, rojo, amarillo, verde, azul), y los seis colores de asiento del Burgo
 * son marfil, azabache, violeta, turquesa, coral y lima, elegidos para no
 * confundirse con ninguna acera. Los ocho de aquí se han elegido con dos reglas
 * medidas por el comprobador: contra cada color de asiento, la diferencia máxima
 * por canal es de al menos 60/255 y la suma de las tres al menos 100; y el blanco
 * encima de cada acera contrasta al menos 3:1, porque el rótulo de la cara del
 * retablo va en blanco sobre el color del barrio. Por eso el «amarillo» es un oro
 * viejo y el «celeste» un azul de medio tono: un amarillo limón o un celeste claro
 * no dejan leer nada encima y se pegan al marfil y al lima de los asientos.
 *
 * ═══ RÓTULOS DE SEIS LETRAS ═══
 *
 * La cara del retablo SVG no crece más allá de lo que cabe, y en un móvil de 390
 * px una cara de cuatro tiras mide ~39 px de ancho: seis letras es lo que se lee.
 * Así que cada casilla lleva, además del nombre entero, un `rotulo` de seis letras
 * o menos que la evoca: «Taller» por la Calle de los Talleres, «Cepo» por ¡A
 * comisaría!, «Visita» por la Comisaría de paso. El Impuesto no cabe en seis y
 * lleva «Fisco»; el nombre entero se lee en la ficha y en los paneles.
 *
 * ═══ LAS SERIES DE LAS CARTAS, Y POR QUÉ NO SON EL NÚMERO ═══
 *
 * En el mazo (que es SECRETO) las cartas viajan como series: `'p07'` para la
 * séptima de Sucesos, `'a12'` para la duodécima del Fondo Vecinal. Lo que se
 * PUBLICA al salir una carta es su número (1..16) dentro de su mazo, y con él
 * cualquier cliente encuentra aquí título, texto y efecto. La serie y el número son
 * la misma cosa escrita de dos formas —`serieDeCarta` y `numeroDeSerie` van y
 * vuelven—, pero la serie lleva la letra del mazo delante para que dos secretos de
 * dos mazos nunca coincidan en la forma canónica (`verify:mesa` busca los secretos
 * con comillas, y `7` a secas casaría con cualquier contador).
 */

export type ClaseDeCasilla =
  | 'salida'
  | 'solar'
  | 'arca'
  | 'diezmo'
  | 'puerta'
  | 'pregon'
  | 'mazmorra'
  | 'oficio'
  | 'feria'
  | 'a-la-mazmorra'
  | 'alcabala';

export type BarrioId = 'pardo' | 'celeste' | 'rosa' | 'naranja' | 'rojo' | 'amarillo' | 'verde' | 'azul';
export type MazoId = 'pregon' | 'arca';

/** Rentas de un solar: sin casas / 1 / 2 / 3 / 4 casas / hotel. */
export type RentasDeSolar = readonly [number, number, number, number, number, number];

export interface CasillaDelBurgo {
  /** 0..39, en sentido de la marcha. */
  readonly indice: number;
  readonly clase: ClaseDeCasilla;
  /** 'Callejón de las Latas'. */
  readonly nombre: string;
  /** ≤ 6 letras para la cara del retablo: 'Latas'. */
  readonly rotulo: string;
  /** Sólo en 'solar'. */
  readonly barrio: BarrioId | null;
  /** 0 si no se compra; el Impuesto y la Tasa llevan aquí lo que cobran. */
  readonly precio: number;
  /** solar/1/2/3/4/hotel; [0,0,0,0,0,0] en las demás. */
  readonly rentas: RentasDeSolar;
  /** Precio de la casa del barrio; 0 fuera de solares. */
  readonly casa: number;
}

export interface BarrioDelBurgo {
  readonly id: BarrioId;
  /** 'El Poblado', 'Las Naves'…: el rótulo propio, para la hoja. */
  readonly nombre: string;
  /** '#rrggbb' de la acera y del relleno del retablo. */
  readonly color: string;
  /** Índices de casilla, en orden. */
  readonly solares: readonly number[];
}

const SIN_RENTA: RentasDeSolar = [0, 0, 0, 0, 0, 0];

/** Una casilla que no es solar: sin barrio, sin casa, sin rentas. `precio` sólo lo llevan las comprables y las que cobran. */
function suelo(indice: number, clase: ClaseDeCasilla, nombre: string, rotulo: string, precio = 0): CasillaDelBurgo {
  return { indice, clase, nombre, rotulo, barrio: null, precio, rentas: SIN_RENTA, casa: 0 };
}

/** Un solar de un barrio. */
function solar(
  indice: number,
  nombre: string,
  rotulo: string,
  barrio: BarrioId,
  precio: number,
  rentas: RentasDeSolar,
  casa: number,
): CasillaDelBurgo {
  return { indice, clase: 'solar', nombre, rotulo, barrio, precio, rentas, casa };
}

export const CUANTAS_CASILLAS = 40;
export const PUERTA_MAYOR = 0;
export const LA_MAZMORRA = 10;
export const LA_FERIA = 20;
export const A_LA_MAZMORRA = 30;
export const PUERTAS: readonly number[] = [5, 15, 25, 35];
export const OFICIOS: readonly number[] = [12, 28];

/** Lo que cobran las dos casillas de impuesto. Van también en `precio` de su fila. */
export const EL_DIEZMO = 200;
export const LA_ALCABALA = 100;
export const PRECIO_DE_PUERTA = 200;
export const PRECIO_DE_OFICIO = 150;

/** Las cuarenta casillas, del reglamento §1, tal cual y en orden. */
export const CASILLAS: readonly CasillaDelBurgo[] = [
  suelo(0, 'salida', 'La Salida', 'Salida'),
  solar(1, 'Callejón de las Latas', 'Latas', 'pardo', 60, [2, 10, 30, 90, 160, 250], 50),
  suelo(2, 'arca', 'El Fondo Vecinal', 'Fondo'),
  solar(3, 'Pasaje de los Charcos', 'Charco', 'pardo', 60, [4, 20, 60, 180, 320, 450], 50),
  suelo(4, 'diezmo', 'El Impuesto', 'Fisco', EL_DIEZMO),
  suelo(5, 'puerta', 'Estación del Puerto', 'Puerto', PRECIO_DE_PUERTA),
  solar(6, 'Calle de los Talleres', 'Taller', 'celeste', 100, [6, 30, 90, 270, 400, 550], 50),
  suelo(7, 'pregon', 'Sucesos', 'Suceso'),
  solar(8, 'Calle de la Imprenta', 'Tinta', 'celeste', 100, [6, 30, 90, 270, 400, 550], 50),
  solar(9, 'Calle de las Grúas', 'Grúas', 'celeste', 120, [8, 40, 100, 300, 450, 600], 50),
  suelo(10, 'mazmorra', 'La Comisaría', 'Visita'),
  solar(11, 'Calle de la Frutería', 'Fruta', 'rosa', 140, [10, 50, 150, 450, 625, 750], 100),
  suelo(12, 'oficio', 'La Central Eléctrica', 'Luz', PRECIO_DE_OFICIO),
  solar(13, 'Calle de la Ferretería', 'Tuerca', 'rosa', 140, [10, 50, 150, 450, 625, 750], 100),
  solar(14, 'Plaza del Mercadillo', 'Puesto', 'rosa', 160, [12, 60, 180, 500, 700, 900], 100),
  suelo(15, 'puerta', 'Estación de Autobuses', 'Buses', PRECIO_DE_PUERTA),
  solar(16, 'Calle de los Balcones', 'Balcón', 'naranja', 180, [14, 70, 200, 550, 750, 950], 100),
  suelo(17, 'arca', 'El Fondo Vecinal', 'Fondo'),
  solar(18, 'Calle de los Garajes', 'Garaje', 'naranja', 180, [14, 70, 200, 550, 750, 950], 100),
  solar(19, 'Calle del Semáforo', 'Ámbar', 'naranja', 200, [16, 80, 220, 600, 800, 1000], 100),
  suelo(20, 'feria', 'El Descanso', 'Pausa'),
  solar(21, 'Calle de los Cines', 'Cine', 'rojo', 220, [18, 90, 250, 700, 875, 1050], 150),
  suelo(22, 'pregon', 'Sucesos', 'Suceso'),
  solar(23, 'Plaza del Ayuntamiento', 'Plaza', 'rojo', 220, [18, 90, 250, 700, 875, 1050], 150),
  solar(24, 'Calle del Teatro', 'Teatro', 'rojo', 240, [20, 100, 300, 750, 925, 1100], 150),
  suelo(25, 'puerta', 'Estación de Mercancías', 'Carga', PRECIO_DE_PUERTA),
  solar(26, 'Calle del Cristal', 'Vidrio', 'amarillo', 260, [22, 110, 330, 800, 975, 1150], 150),
  solar(27, 'Calle de las Antenas', 'Antena', 'amarillo', 260, [22, 110, 330, 800, 975, 1150], 150),
  suelo(28, 'oficio', 'El Canal de Aguas', 'Agua', PRECIO_DE_OFICIO),
  solar(29, 'Calle de la Bolsa', 'Bolsa', 'amarillo', 280, [24, 120, 360, 850, 1025, 1200], 150),
  suelo(30, 'a-la-mazmorra', '¡A comisaría!', 'Cepo'),
  solar(31, 'Calle del Hospital', 'Salud', 'verde', 300, [26, 130, 390, 900, 1100, 1275], 200),
  solar(32, 'Calle de la Biblioteca', 'Libros', 'verde', 300, [26, 130, 390, 900, 1100, 1275], 200),
  suelo(33, 'arca', 'El Fondo Vecinal', 'Fondo'),
  solar(34, 'Calle de los Jardines', 'Jardín', 'verde', 320, [28, 150, 450, 1000, 1200, 1400], 200),
  suelo(35, 'puerta', 'Estación Central', 'Tren', PRECIO_DE_PUERTA),
  suelo(36, 'pregon', 'Sucesos', 'Suceso'),
  solar(37, 'Paseo de los Tilos', 'Tilos', 'azul', 350, [35, 175, 500, 1100, 1300, 1500], 200),
  suelo(38, 'alcabala', 'La Tasa', 'Tasa', LA_ALCABALA),
  solar(39, 'Avenida de las Acacias', 'Acacia', 'azul', 400, [50, 200, 600, 1400, 1700, 2000], 200),
];

/** Los ocho barrios, en orden de anillo, con su color de acera (ver la cabecera). */
export const BARRIOS: readonly BarrioDelBurgo[] = [
  { id: 'pardo', nombre: 'El Poblado', color: '#6b4423', solares: [1, 3] },
  { id: 'celeste', nombre: 'Las Naves', color: '#2b7bb8', solares: [6, 8, 9] },
  { id: 'rosa', nombre: 'El Mercadillo', color: '#c2185b', solares: [11, 13, 14] },
  { id: 'naranja', nombre: 'El Ensanche', color: '#e0561c', solares: [16, 18, 19] },
  { id: 'rojo', nombre: 'El Centro', color: '#9b1c1c', solares: [21, 23, 24] },
  { id: 'amarillo', nombre: 'Las Torres', color: '#b8860b', solares: [26, 27, 29] },
  { id: 'verde', nombre: 'El Parque', color: '#2e8033', solares: [31, 32, 34] },
  { id: 'azul', nombre: 'Los Paseos', color: '#1f3a93', solares: [37, 39] },
];

/** Las 28 casillas que se compran (22 solares, 4 estaciones, 2 servicios), en orden de índice. */
export const TITULOS: readonly number[] = CASILLAS.filter(
  (c) => c.clase === 'solar' || c.clase === 'puerta' || c.clase === 'oficio',
).map((c) => c.indice);

/** El barrio de una casilla, o `null` si no es un solar. */
export function barrioDe(casilla: number): BarrioDelBurgo | null {
  const fila = CASILLAS[casilla];
  if (fila === undefined || fila.barrio === null) return null;
  for (const b of BARRIOS) if (b.id === fila.barrio) return b;
  return null;
}

export const DINERO_DE_SALIDA = 1500;
export const PAGA_DE_LA_PUERTA_MAYOR = 200;
export const FIANZA = 50;
export const INTENTOS_EN_LA_MAZMORRA = 3;
export const DOBLES_QUE_ENCIERRAN = 3;
export const CASAS_DEL_CONCEJO = 32;
export const POSADAS_DEL_CONCEJO = 12;
/** `casas === 5` es un hotel. */
export const POSADA = 5;
/** Por número de estaciones del dueño (las hipotecadas cuentan; sólo la hipotecada no cobra). */
export const RENTA_DE_PUERTA: readonly number[] = [0, 25, 50, 100, 200];
/** Por número de servicios del dueño: × la tirada. */
export const MULTIPLO_DE_OFICIO: readonly number[] = [0, 4, 10];
/** La carta «servicio más cercano»: 10 × una tirada nueva. */
export const MULTIPLO_DE_OFICIO_POR_CARTA = 10;
export const PUJA_MINIMA = 10;
export const PASO_DE_PUJA = 10;
/** Además del mínimo legal: las dos pujas fijas del respaldo. */
export const ESCALONES_DE_PUJA: readonly number[] = [50, 100];
/** Por ciento. */
export const INTERES_DEL_EMPENO = 10;
/** Vender un edificio al Ayuntamiento devuelve esta fracción del precio de la casa (la mitad). */
export const PARTES_DE_LA_CASA_AL_VENDER = 2;

/**
 * LA PARTE DEL PATRIMONIO QUE EL IMPUESTO ADMITE EN VEZ DE LA CANTIDAD FIJA: una
 * décima, que es el 10 % del reglamento §3. Va aquí y no en el reductor por lo mismo
 * que la hipoteca: es una cuenta de un renglón sobre un número de la tabla, la miran
 * los dos lados (el botón dice cuánto y el reductor cobra cuánto) y si cada uno la
 * escribiera por su cuenta el botón podría prometer una cifra y el cobro ser otra.
 */
export const PARTE_DEL_IMPUESTO = 10;

/**
 * EL 10 % DEL PATRIMONIO, redondeado HACIA ABAJO y nunca negativo.
 *
 * Hacia abajo y no hacia arriba —al revés que el interés de la hipoteca, que redondea
 * hacia arriba— porque el que cobra es distinto: el interés lo cobra el Ayuntamiento
 * sobre un préstamo que él hizo, y el 10 % es una ALTERNATIVA que se le ofrece a quien
 * paga; si la cuenta se redondeara hacia arriba, la alternativa podría costar más que
 * la décima que promete el rótulo. Y entera porque `hacienda.transferir` sólo mueve
 * enteros: un pago con coma se pierde al sumar y deja saldos que no cuadran.
 *
 * `Number.isFinite` de guarda porque esta función la llama también `opciones()` con el
 * patrimonio que trae la VISTA, y una vista de ayer o un banco de pruebas pueden no
 * traerlo: sin la guarda el rótulo diría «NaN €» y el botón seguiría pulsándose.
 */
export function decimaDelPatrimonio(patrimonio: number): number {
  if (!Number.isFinite(patrimonio) || patrimonio <= 0) return 0;
  return Math.floor(patrimonio / PARTE_DEL_IMPUESTO);
}

/** Hipoteca = mitad del precio. Todos los precios son pares, así que es entera sin redondear. */
export function valorDeEmpeno(precio: number): number {
  return Math.floor(precio / 2);
}

/** El 10 % de la hipoteca, redondeado hacia arriba: 60→3, 100→5, 140→7, 350→18. */
export function interesDelEmpeno(precio: number): number {
  return Math.ceil(valorDeEmpeno(precio) / INTERES_DEL_EMPENO);
}

/** Deshipotecar = hipoteca + interés. */
export function costeDeDesempeno(precio: number): number {
  return valorDeEmpeno(precio) + interesDelEmpeno(precio);
}

export type EfectoDeCarta =
  | { readonly que: 'ir'; readonly a: number; readonly cobraAlPasar: boolean }
  /** Renta doble si tiene dueño; compra si no. */
  | { readonly que: 'puerta-cercana' }
  /** 10 × una tirada NUEVA si tiene dueño; compra si no. */
  | { readonly que: 'oficio-cercano' }
  | { readonly que: 'cobra'; readonly cuanto: number }
  | { readonly que: 'paga'; readonly cuanto: number }
  | { readonly que: 'indulto' }
  | { readonly que: 'retrocede'; readonly casillas: number }
  | { readonly que: 'a-la-mazmorra' }
  | { readonly que: 'reparaciones'; readonly porCasa: number; readonly porPosada: number }
  | { readonly que: 'paga-a-cada-uno'; readonly cuanto: number }
  | { readonly que: 'cobra-de-cada-uno'; readonly cuanto: number };

export interface CartaDelBurgo {
  /** 1..16 dentro de su mazo: lo que se PUBLICA al salir. */
  readonly numero: number;
  readonly mazo: MazoId;
  /** 'Dividendo de acciones'. */
  readonly titulo: string;
  /** El texto propio del reglamento §11. */
  readonly texto: string;
  readonly efecto: EfectoDeCarta;
}

export const CARTAS_POR_MAZO = 16;

function pregon(numero: number, titulo: string, texto: string, efecto: EfectoDeCarta): CartaDelBurgo {
  return { numero, mazo: 'pregon', titulo, texto, efecto };
}

function arca(numero: number, titulo: string, texto: string, efecto: EfectoDeCarta): CartaDelBurgo {
  return { numero, mazo: 'arca', titulo, texto, efecto };
}

/** Las dieciséis de Sucesos, del reglamento §11, con texto propio. */
export const EL_PREGON: readonly CartaDelBurgo[] = [
  pregon(1, 'A la Salida', 'Avanza hasta la Salida. Cobra 200 €.', { que: 'ir', a: 0, cobraAlPasar: true }),
  pregon(2, 'Al Paseo de los Tilos', 'Avanza hasta el Paseo de los Tilos. Si pasas la Salida, cobra 200 €.', {
    que: 'ir',
    a: 37,
    cobraAlPasar: true,
  }),
  pregon(3, 'A la Calle de los Balcones', 'Avanza hasta la Calle de los Balcones. Si pasas la Salida, cobra 200 €.', {
    que: 'ir',
    a: 16,
    cobraAlPasar: true,
  }),
  pregon(4, 'A la Calle de la Frutería', 'Avanza hasta la Calle de la Frutería. Si pasas la Salida, cobra 200 €.', {
    que: 'ir',
    a: 11,
    cobraAlPasar: true,
  }),
  pregon(5, 'A la Estación del Puerto', 'Avanza hasta la Estación del Puerto. Si pasas la Salida, cobra 200 €.', {
    que: 'ir',
    a: 5,
    cobraAlPasar: true,
  }),
  pregon(
    6,
    'A la estación más cercana',
    'Avanza hasta la estación más cercana. Si tiene dueño, págale el doble de la renta; si no, puedes comprarla.',
    { que: 'puerta-cercana' },
  ),
  pregon(
    7,
    'A la estación más cercana',
    'Avanza hasta la estación más cercana. Si tiene dueño, págale el doble de la renta; si no, puedes comprarla.',
    { que: 'puerta-cercana' },
  ),
  pregon(
    8,
    'Al servicio más cercano',
    'Avanza hasta el servicio público más cercano. Si tiene dueño, tira los dados y págale diez veces la tirada; si no, puedes comprarlo.',
    { que: 'oficio-cercano' },
  ),
  pregon(9, 'Dividendo de acciones', 'Tus acciones reparten dividendo: cobra 50 €.', { que: 'cobra', cuanto: 50 }),
  pregon(10, 'Salvoconducto', 'Sales de la Comisaría cuando quieras. Guarda esta carta hasta usarla o cambiarla.', { que: 'indulto' }),
  pregon(11, 'Tres calles atrás', 'Retrocede tres casillas.', { que: 'retrocede', casillas: 3 }),
  pregon(12, '¡A comisaría!', 'Ve derecho a la Comisaría, sin pasar por la Salida ni cobrar 200 €.', {
    que: 'a-la-mazmorra',
  }),
  pregon(13, 'Derrama de la comunidad', 'Paga 25 € por cada casa y 100 € por cada hotel.', {
    que: 'reparaciones',
    porCasa: 25,
    porPosada: 100,
  }),
  pregon(14, 'Multa de tráfico', 'Paga una multa de 15 € por aparcar en doble fila.', { que: 'paga', cuanto: 15 }),
  pregon(15, 'Viaje a la Estación Central', 'Viaja hasta la Estación Central. Si pasas la Salida, cobra 200 €.', {
    que: 'ir',
    a: 35,
    cobraAlPasar: true,
  }),
  pregon(16, 'Presides la comunidad', 'Te eligen presidente de la comunidad: paga 50 € a cada jugador.', { que: 'paga-a-cada-uno', cuanto: 50 }),
];

/** Las dieciséis del Fondo Vecinal, del reglamento §11, con texto propio. */
export const EL_ARCA: readonly CartaDelBurgo[] = [
  arca(1, 'A la Salida', 'Avanza hasta la Salida. Cobra 200 €.', { que: 'ir', a: 0, cobraAlPasar: true }),
  arca(2, 'Error del Ayuntamiento', 'Error del Ayuntamiento a tu favor: cobra 200 €.', { que: 'cobra', cuanto: 200 }),
  arca(3, 'Factura del dentista', 'Paga 50 € al dentista.', { que: 'paga', cuanto: 50 }),
  arca(4, 'Venta de trastos', 'Vendes tus trastos en el mercadillo: cobra 50 €.', { que: 'cobra', cuanto: 50 }),
  arca(5, 'Salvoconducto', 'Sales de la Comisaría cuando quieras. Guarda esta carta hasta usarla o cambiarla.', { que: 'indulto' }),
  arca(6, '¡A comisaría!', 'Ve derecho a la Comisaría, sin pasar por la Salida ni cobrar 200 €.', {
    que: 'a-la-mazmorra',
  }),
  arca(7, 'Fiestas del barrio', 'Fiestas del barrio: cada jugador te paga 10 €.', { que: 'cobra-de-cada-uno', cuanto: 10 }),
  arca(8, 'Te toca la lotería', 'Te toca un pellizco de la lotería: cobra 100 €.', { que: 'cobra', cuanto: 100 }),
  arca(9, 'Devolución de la Tasa', 'Te devuelven la Tasa: cobra 20 €.', { que: 'cobra', cuanto: 20 }),
  arca(10, 'Es tu cumpleaños', 'Es tu cumpleaños: cada jugador te paga 10 €.', { que: 'cobra-de-cada-uno', cuanto: 10 }),
  arca(11, 'Vence el seguro', 'Vence tu seguro de vida: cobra 100 €.', { que: 'cobra', cuanto: 100 }),
  arca(12, 'Urgencias', 'Paga 100 € en urgencias.', { que: 'paga', cuanto: 100 }),
  arca(13, 'Matrícula del colegio', 'Paga 50 € de matrícula en el colegio.', { que: 'paga', cuanto: 50 }),
  arca(14, 'Cobras tus facturas', 'Cobra 25 € de facturas pendientes.', { que: 'cobra', cuanto: 25 }),
  arca(15, 'Obras en la calle', 'Te toca pagar las obras de la calle: paga 40 € por cada casa y 115 € por cada hotel.', {
    que: 'reparaciones',
    porCasa: 40,
    porPosada: 115,
  }),
  arca(16, 'Concurso de balcones', 'Ganas el segundo premio del concurso de balcones: cobra 10 €.', { que: 'cobra', cuanto: 10 }),
];

/** El mazo de una tabla. */
export function cartasDe(mazo: MazoId): readonly CartaDelBurgo[] {
  return mazo === 'pregon' ? EL_PREGON : EL_ARCA;
}

/** La carta `numero` (1..16) de un mazo, o `null` si no existe. */
export function carta(mazo: MazoId, numero: number): CartaDelBurgo | null {
  const tabla = cartasDe(mazo);
  for (const c of tabla) if (c.numero === numero) return c;
  return null;
}

const LETRA_DE_MAZO: Readonly<Record<MazoId, string>> = { pregon: 'p', arca: 'a' };

/** La serie que viaja en el mazo (SECRETA): 'p07' / 'a12'. */
export function serieDeCarta(mazo: MazoId, numero: number): string {
  const cifras = numero < 10 ? `0${numero}` : `${numero}`;
  return `${LETRA_DE_MAZO[mazo]}${cifras}`;
}

/** 'p07' → 7; 0 si la serie no cuadra con ningún mazo ni número. */
export function numeroDeSerie(serie: string): number {
  if (typeof serie !== 'string' || serie.length !== 3) return 0;
  const letra = serie.charAt(0);
  if (letra !== 'p' && letra !== 'a') return 0;
  const decena = serie.charCodeAt(1) - 48;
  const unidad = serie.charCodeAt(2) - 48;
  if (decena < 0 || decena > 9 || unidad < 0 || unidad > 9) return 0;
  const numero = decena * 10 + unidad;
  return numero >= 1 && numero <= CARTAS_POR_MAZO ? numero : 0;
}

/** 'p07' → 'pregon'; 'a12' → 'arca'; `null` si no cuadra. */
export function mazoDeSerie(serie: string): MazoId | null {
  if (numeroDeSerie(serie) === 0) return null;
  return serie.charAt(0) === 'p' ? 'pregon' : 'arca';
}

/** Las dieciséis series de un mazo, en orden de número: lo que se baraja UNA vez al empezar. */
export function seriesDe(mazo: MazoId): string[] {
  const salida: string[] = [];
  for (const c of cartasDe(mazo)) salida.push(serieDeCarta(mazo, c.numero));
  return salida;
}
