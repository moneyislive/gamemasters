/**
 * EL MUNDO DECLARADO, Y LA ARENA QUE SE DERIVA DE ÉL.
 *
 * Un juego DECLARA por dónde se puede andar y qué hay en medio. De esa declaración se deriva
 * una «arena»: la forma rápida de contestar «¿cabe aquí?» y «¿dónde acabo si doy este paso?».
 * Ni three, ni red, ni motor de físicas: números.
 *
 * ═══ POR QUÉ SON DOS COSAS Y NO UNA ═══
 *
 * Porque tienen estatutos distintos, y confundirlos fue lo que hundió el primer diseño:
 *
 *   · EL MUNDO DECLARADO es CONTRATO: se COMPARA y se CONGELA. Por eso es llano —listas,
 *     objetos llanos, números— y pasa por `canonico.ts`. Un `Int16Array` metido aquí devuelve
 *     `NoCanonizable: no es un objeto llano`, y entonces el mundo no se puede fijar en un
 *     comprobador ni comparar entre dos motores. Se probó: no cabía.
 *   · LA ARENA es DERIVADA. Se calcula con `arenaDe()` a los dos lados —servidor y aparato—
 *     de la MISMA declaración, y su vida es la de un proceso. Ahí sí hay listas tipadas,
 *     porque su trabajo es ser rápida.
 *
 * Declarar las dos cosas sería decir dos veces lo mismo y darle a alguien la oportunidad de
 * que dejen de coincidir.
 *
 * ═══ Y NINGUNA DE LAS DOS VIAJA. ESTO IMPORTA Y CUESTA ENTENDERLO ═══
 *
 * El primer diseño decía «el servidor arbitra sobre la misma declaración» y daba por hecho
 * que la declaración iba por el cable. No cabe: un tablero lleno de Las Lindes —72 losas con
 * sus piezas— son **288,8 kB canonizado**, medido, contra los 90,9 kB de la vista más cara
 * que hoy baja a un móvil. Mandar eso por revisión es tres veces la partida entera.
 *
 * Lo que viaja es LO QUE YA VIAJABA: el estado de la mesa. El mundo se DERIVA del estado, con
 * una función pura, a los dos lados. Así que el coste por el cable de toda esta capa es CERO
 * bytes, y lo que hay que demostrar no es que quepa, sino que los dos lados derivan lo mismo
 * —que es para lo que sirve que canonice—.
 *
 * ═══ LO QUE ESTA CAPA CONTESTA, Y LO QUE NO ═══
 *
 * CONTESTA dos cosas, y las dos son de sitio, no de altura:
 *
 *   · DÓNDE SE PUEDE ESTAR. El borde del mundo es una LISTA DE CASILLAS, no la ausencia de
 *     obstáculos. La diferencia no es de estilo: en Las Lindes el tablero no existe hasta que
 *     lo ponen, y fuera de las losas puestas no hay valle, así que quien saliera vería el
 *     mundo por debajo y no sabría volver. Preguntar «¿choca con algo?» dejaría andar por el
 *     vacío, porque en el vacío no hay nada con lo que chocar.
 *   · Y QUÉ HAY EN MEDIO. Cajas alineadas con los ejes: almiares, muros, casas.
 *
 * NO CONTESTA la altura. Hoy el paseante de Las Lindes es plano —`unPaso` devuelve `x` y `z`
 * y nadie lee una `y`— y el relieve de Riberas pide una conversación aparte, con sus rampas y
 * su escalón de 5,47 unidades contra el 1,86 de Las Lindes. Meter un campo de altura que
 * nadie produce ni lee es el fallo firmado de esta casa; cuando haga falta, se añade con su
 * productor y su comprobador el mismo día.
 *
 * ═══ POR QUÉ UNA CAJA ALINEADA Y NO UNA MALLA ═══
 *
 * Porque el camino que decide un choque NO MULTIPLICA: cuatro comparaciones y ni un producto.
 * Eso es lo que permite que la arena sea entera de verdad, y una arena entera da el mismo
 * resultado en V8 y en Hermes. Una malla pediría productos escalares, y un producto en coma
 * fija es justo donde esta casa ya se cortó una vez: ver `fijo.ts`.
 *
 * ═══ LAS CAJAS VAN INDEXADAS, Y ESO NO ES UNA OPTIMIZACIÓN PREMATURA ═══
 *
 * Un tablero lleno de Las Lindes son 72 losas por unas 42 piezas: **3.024 cajas**. Medido con
 * el prototipo de esta casa, en Hermes, con un paseante dando 60.000 pasos:
 *
 *   · barrido lineal de las 3.024 .......... 0,07527 ms por paso
 *   · las mismas, indexadas por cajón ...... 0,00063 ms por paso   (120 veces menos)
 *
 * Y la huella del recorrido es la misma en los dos casos: el paseante NI LAS TOCABA. Eran
 * 3.024 comparaciones por paso para no encontrar nada. Por eso el índice va desde el primer
 * día: sin él, la bitácora de Las Lindes tenía razón al llamar a esto «un trabajo con sus
 * propios riesgos de rendimiento».
 */
import { por, UNO } from './fijo';

/* ─── EL CONTRATO: LLANO, Y POR ESO CANONIZABLE ──────────────────────────── */

/**
 * Una casilla del tablero donde se puede estar.
 *
 * `y` crece hacia la `z` NEGATIVA, que es el convenio que ya usa Las Lindes en `paseo.ts`
 * (`j = -z / LADO_DE_LOSA`). Se hereda a propósito en vez de inventar otro: dos convenios de
 * ejes en el mismo tablero es un fallo que no da error y se ve como un mundo del revés.
 */
export interface Casilla {
  readonly x: number;
  readonly y: number;
}

/** Una caja alineada con los ejes, en unidades del mundo. `x0 < x1` y `z0 < z1`. */
export interface Cuerpo {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
}

/** Un sitio donde se puede nacer, en unidades del mundo. */
export interface Sitio {
  readonly x: number;
  readonly z: number;
}

/**
 * LO QUE UN JUEGO DECLARA PARA PODER RECORRERSE.
 *
 * Todo en unidades del mundo y en coma flotante: esto es lo que un juego ESCRIBE, y escribir
 * `2.543` es más honrado que escribir `166658`. El paso a coma fija lo hace `arenaDe()` una
 * vez, al derivar, que es el único sitio donde se toca coma flotante.
 *
 * Nada opcional: un campo que a veces está y a veces no se convierte en dos contratos, y el
 * segundo no lo comprueba nadie.
 */
export interface MundoDeclarado {
  /** El lado de una casilla, en unidades del mundo. */
  readonly lado: number;
  /** Dónde se puede estar. Vacío significa vacío: un mundo sin suelo no se recorre. */
  readonly pisables: readonly Casilla[];
  /** Lo que hay en medio. */
  readonly cuerpos: readonly Cuerpo[];
  /** Dónde se puede nacer. */
  readonly nace: readonly Sitio[];
}

/* ─── LA ARENA: DERIVADA, RÁPIDA, Y NO VIAJA ─────────────────────────────── */

/** Cuántas unidades del mundo mide el lado de un cajón del índice de cuerpos. */
const UNIDADES_POR_CAJON = 32;

/**
 * La forma rápida del mundo. Se deriva con `arenaDe()` y se tira al salir.
 *
 * Todo lo que lleva dentro está en Q16.16 salvo los índices de casilla y de cajón, que son
 * enteros de contar.
 */
export interface Arena {
  /** El lado de una casilla, en Q16.16. */
  readonly lado: number;
  /** El rectángulo de casillas que envuelve lo pisable. */
  readonly desdeX: number;
  readonly desdeY: number;
  readonly anchura: number;
  readonly fondo: number;
  /** Un byte por casilla del rectángulo: 1 si se puede estar. */
  readonly pisable: Uint8Array;
  /** Las cajas, planas: `x0, z0, x1, z1` por cuerpo, en Q16.16. */
  readonly cuerpos: Int32Array;
  /** El rectángulo de cajones que envuelve las cajas, y su rejilla. */
  readonly cajonDesdeX: number;
  readonly cajonDesdeZ: number;
  readonly cajonesAncho: number;
  readonly cajonesFondo: number;
  /** Por cajón, los índices de cuerpo que lo tocan. */
  readonly cajones: readonly (readonly number[])[];
  /** Los sitios donde se nace, en Q16.16: `x, z` por sitio. */
  readonly nace: Int32Array;
}

/**
 * En qué casilla cae una coordenada.
 *
 * `Math.floor(v / lado + 0.5)` y no un desplazamiento de bits, por dos razones: el lado de una
 * casilla no tiene por qué ser potencia de dos —el de Las Lindes es 175/48— y un desplazamiento
 * de 16 sobre un producto es justo el fallo que `fijo.ts` existe para no repetir. La división
 * de dos enteros y `Math.floor` están fijadas al bit por IEEE 754.
 */
function casillaDe(v: number, lado: number): number {
  return Math.floor(v / lado + 0.5);
}

/** En qué cajón del índice cae una coordenada. */
function cajonDe(v: number, porCajon: number): number {
  return Math.floor(v / porCajon);
}

/** Un número del mundo a coma fija. Sólo aquí, al derivar. */
function aFijo(x: number): number {
  return Math.round(x * UNO) | 0;
}

/**
 * LA ARENA DE UN MUNDO. Función pura: la misma declaración da la misma arena en los dos lados.
 */
export function arenaDe(mundo: MundoDeclarado): Arena {
  const lado = aFijo(mundo.lado);

  /* ── El rectángulo de lo pisable ─────────────────────────────────────── */
  let desdeX = 0;
  let desdeY = 0;
  let hastaX = -1;
  let hastaY = -1;
  if (mundo.pisables.length > 0) {
    const primera = mundo.pisables[0] as Casilla;
    desdeX = primera.x;
    desdeY = primera.y;
    hastaX = primera.x;
    hastaY = primera.y;
    for (const c of mundo.pisables) {
      if (c.x < desdeX) desdeX = c.x;
      if (c.y < desdeY) desdeY = c.y;
      if (c.x > hastaX) hastaX = c.x;
      if (c.y > hastaY) hastaY = c.y;
    }
  }
  const anchura = hastaX >= desdeX ? hastaX - desdeX + 1 : 0;
  const fondo = hastaY >= desdeY ? hastaY - desdeY + 1 : 0;
  const pisable = new Uint8Array(anchura * fondo);
  for (const c of mundo.pisables) {
    pisable[(c.y - desdeY) * anchura + (c.x - desdeX)] = 1;
  }

  /* ── Las cajas, y su índice por cajones ──────────────────────────────── */
  const cuerpos = new Int32Array(mundo.cuerpos.length * 4);
  for (let i = 0; i < mundo.cuerpos.length; i++) {
    const c = mundo.cuerpos[i] as Cuerpo;
    cuerpos[i * 4] = aFijo(c.x0);
    cuerpos[i * 4 + 1] = aFijo(c.z0);
    cuerpos[i * 4 + 2] = aFijo(c.x1);
    cuerpos[i * 4 + 3] = aFijo(c.z1);
  }

  let cajonDesdeX = 0;
  let cajonDesdeZ = 0;
  let cajonHastaX = -1;
  let cajonHastaZ = -1;
  if (mundo.cuerpos.length > 0) {
    const primero = mundo.cuerpos[0] as Cuerpo;
    cajonDesdeX = cajonDe(primero.x0, UNIDADES_POR_CAJON);
    cajonDesdeZ = cajonDe(primero.z0, UNIDADES_POR_CAJON);
    cajonHastaX = cajonDe(primero.x1, UNIDADES_POR_CAJON);
    cajonHastaZ = cajonDe(primero.z1, UNIDADES_POR_CAJON);
    for (const c of mundo.cuerpos) {
      const a = cajonDe(c.x0, UNIDADES_POR_CAJON);
      const b = cajonDe(c.z0, UNIDADES_POR_CAJON);
      const d = cajonDe(c.x1, UNIDADES_POR_CAJON);
      const e = cajonDe(c.z1, UNIDADES_POR_CAJON);
      if (a < cajonDesdeX) cajonDesdeX = a;
      if (b < cajonDesdeZ) cajonDesdeZ = b;
      if (d > cajonHastaX) cajonHastaX = d;
      if (e > cajonHastaZ) cajonHastaZ = e;
    }
  }
  const cajonesAncho = cajonHastaX >= cajonDesdeX ? cajonHastaX - cajonDesdeX + 1 : 0;
  const cajonesFondo = cajonHastaZ >= cajonDesdeZ ? cajonHastaZ - cajonDesdeZ + 1 : 0;
  const cajones: number[][] = [];
  for (let i = 0; i < cajonesAncho * cajonesFondo; i++) cajones.push([]);
  /*
   * Una caja se apunta en TODOS los cajones que toca, no sólo en el de su esquina. Un muro de
   * Las Lindes son siete casillas seguidas —25,5 unidades— y cabe en varios cajones: apuntarlo
   * sólo en uno lo haría invisible desde el resto de su propia longitud.
   */
  for (let i = 0; i < mundo.cuerpos.length; i++) {
    const c = mundo.cuerpos[i] as Cuerpo;
    const a = cajonDe(c.x0, UNIDADES_POR_CAJON) - cajonDesdeX;
    const b = cajonDe(c.z0, UNIDADES_POR_CAJON) - cajonDesdeZ;
    const d = cajonDe(c.x1, UNIDADES_POR_CAJON) - cajonDesdeX;
    const e = cajonDe(c.z1, UNIDADES_POR_CAJON) - cajonDesdeZ;
    for (let cz = b; cz <= e; cz++) {
      for (let cx = a; cx <= d; cx++) {
        (cajones[cz * cajonesAncho + cx] as number[]).push(i);
      }
    }
  }

  const nace = new Int32Array(mundo.nace.length * 2);
  for (let i = 0; i < mundo.nace.length; i++) {
    const s = mundo.nace[i] as Sitio;
    nace[i * 2] = aFijo(s.x);
    nace[i * 2 + 1] = aFijo(s.z);
  }

  return {
    lado,
    desdeX,
    desdeY,
    anchura,
    fondo,
    pisable,
    cuerpos,
    cajonDesdeX,
    cajonDesdeZ,
    cajonesAncho,
    cajonesFondo,
    cajones,
    nace,
  };
}

/* ─── LAS DOS PREGUNTAS ──────────────────────────────────────────────────── */

/** ¿Cae este punto en una casilla donde se puede estar? Todo en Q16.16. */
export function hayPiso(arena: Arena, x: number, z: number): boolean {
  const i = casillaDe(x, arena.lado) - arena.desdeX;
  const j = casillaDe(-z, arena.lado) - arena.desdeY;
  if (i < 0 || j < 0 || i >= arena.anchura || j >= arena.fondo) return false;
  return arena.pisable[j * arena.anchura + i] === 1;
}

/**
 * ¿Choca este círculo con alguna caja? Todo en Q16.16.
 *
 * Cuatro comparaciones por caja y ni un producto. Se prueba el CUADRADO que envuelve al
 * paseante y no el círculo: para decidir si se pasa entre un almiar y un muro, la diferencia
 * entre una esquina y un arco es menos que el ancho de una bota, y el arco costaría una raíz.
 */
export function chocaConCuerpo(arena: Arena, x: number, z: number, radio: number): boolean {
  const cx = cajonDe(x / UNO, UNIDADES_POR_CAJON) - arena.cajonDesdeX;
  const cz = cajonDe(z / UNO, UNIDADES_POR_CAJON) - arena.cajonDesdeZ;
  if (cx < 0 || cz < 0 || cx >= arena.cajonesAncho || cz >= arena.cajonesFondo) return false;
  const cajon = arena.cajones[cz * arena.cajonesAncho + cx];
  if (cajon === undefined) return false;
  const c = arena.cuerpos;
  for (const k of cajon) {
    const i = k * 4;
    if (
      x + radio > (c[i] as number) &&
      x - radio < (c[i + 2] as number) &&
      z + radio > (c[i + 1] as number) &&
      z - radio < (c[i + 3] as number)
    ) {
      return true;
    }
  }
  return false;
}

/** ¿Se puede estar aquí? Hay piso y no hay cuerpo. */
export function sePuedeEstar(arena: Arena, x: number, z: number, radio: number): boolean {
  if (!hayPiso(arena, x, z)) return false;
  return !chocaConCuerpo(arena, x, z, radio);
}

/** Quien anda. Todo en Q16.16. */
export interface Andante {
  readonly x: number;
  readonly z: number;
}

/**
 * UN PASO, Y SI NO CABE ENTERO, LO QUE QUEPA DE CADA EJE.
 *
 * Probar el paso entero y, si no, cada eje por separado, es lo que hace que andar pegado a un
 * muro RESBALE en vez de engancharse. Sin ello, quien camina en diagonal contra una pared se
 * queda clavado aunque uno de los dos ejes esté libre, y se lee como que el juego se ha
 * colgado. Es la misma regla que ya tenía `unPaso` de Las Lindes para el borde del tablero, y
 * está aquí por la misma razón escrita allí.
 *
 * `vx` y `vz` son unidades por segundo y `dt` segundos, las dos en Q16.16. La multiplicación
 * va por `fijo.por` y NO por un desplazamiento de 16: `(v * dt) >> 16` desborda el entero de
 * 32 bits y devuelve el paso con el signo cambiado —el peón anda hacia atrás— igual en los dos
 * motores, que es lo que lo hacía invisible. Ver la cabecera de `fijo.ts`.
 */
export function unPaso(
  arena: Arena,
  quien: Andante,
  vx: number,
  vz: number,
  dt: number,
  radio: number,
): Andante {
  const dx = por(vx, dt);
  const dz = por(vz, dt);
  if (dx === 0 && dz === 0) return quien;

  if (sePuedeEstar(arena, quien.x + dx, quien.z + dz, radio)) {
    return { x: quien.x + dx, z: quien.z + dz };
  }
  let x = quien.x;
  let z = quien.z;
  if (sePuedeEstar(arena, x + dx, z, radio)) x += dx;
  if (sePuedeEstar(arena, x, z + dz, radio)) z += dz;
  return { x, z };
}
