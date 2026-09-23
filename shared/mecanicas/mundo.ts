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
 * La altura a la que se PINTA a alguien es cosa de cada escena: sale del relieve que esa
 * escena ya dibuja, y no decide nada. Lo que decide —si se puede estar, si se choca— es
 * plano, y es lo único que está aquí.
 *
 * ═══ EL VADO: SE ANDA, PERO DESPACIO ═══
 *
 * Miguel lo decidió para Riberas el 18 de septiembre: «se anda por la arena y por el agua
 * somera, con el avatar metido en el agua; lo hondo frena». Una casilla puede ser, pues, de
 * TRES maneras y no de dos: no se pisa, se pisa, o se VADEA. Lo hondo es simplemente lo que
 * no está en ninguna de las dos listas. En un vado el paso es la mitad —con una división
 * entera, sin coma flotante—, y un juego sin agua declara `vados: []`, que es una palabra que
 * alguien tuvo que escribir y no un campo que faltaba.
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

/**
 * Un sitio donde se puede nacer, en unidades del mundo, y hacia dónde se mira al nacer.
 *
 * `rumbo` en radianes con el convenio del paseante: 0 es el norte —la `z` negativa— y crece
 * hacia el este. Va aquí y no en cada escena porque nacer mirando a una pared es un fallo del
 * MUNDO —quien lo declara sabe dónde está el centro del tablero— y no de quien lo pinta.
 */
export interface Sitio {
  readonly x: number;
  readonly z: number;
  readonly rumbo: number;
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
  /**
   * Dónde se puede estar, pero con el agua por las rodillas: se anda a la mitad. Una casilla
   * que esté en las dos listas es firme —gana la tierra—. Sin agua, `[]`.
   */
  readonly vados: readonly Casilla[];
  /** Lo que hay en medio. */
  readonly cuerpos: readonly Cuerpo[];
  /** Dónde se puede nacer. */
  readonly nace: readonly Sitio[];
}

/* ─── LA ARENA: DERIVADA, RÁPIDA, Y NO VIAJA ─────────────────────────────── */

/** Cuántas unidades del mundo mide el lado de un cajón del índice de cuerpos. */
const UNIDADES_POR_CAJON = 32;

/**
 * El lado de un cajón en coma fija: 32 × 65.536 = 2^21. Que sea potencia de dos no es
 * casualidad: dividir un entero entre ella es exacto en coma flotante, así que `Math.floor`
 * de esa división da el mismo cajón en todos los motores sin pasar por un desplazamiento
 * (ver `fijo.ts` para por qué los desplazamientos no).
 */
const CAJON_EN_FIJO = UNIDADES_POR_CAJON * UNO;

/** Lo que hay debajo de un punto. */
export const NADA = 0;
export const FIRME = 1;
export const VADO = 2;
export type Suelo = typeof NADA | typeof FIRME | typeof VADO;

/**
 * La forma rápida del mundo. Se deriva con `arenaDe()` y se tira al salir.
 *
 * Todo lo que lleva dentro está en Q16.16 salvo los índices de casilla y de cajón, que son
 * enteros de contar.
 */
export interface Arena {
  /** El lado de una casilla, en Q16.16. */
  readonly lado: number;
  /** El rectángulo de casillas que envuelve lo pisable y lo vadeable. */
  readonly desdeX: number;
  readonly desdeY: number;
  readonly anchura: number;
  readonly fondo: number;
  /** Un byte por casilla del rectángulo: `NADA`, `FIRME` o `VADO`. */
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
  /** Y hacia dónde se mira en cada uno, en radianes: no decide nada, así que no es entero. */
  readonly rumbos: readonly number[];
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

/**
 * En qué cajón del índice cae una coordenada EN COMA FIJA.
 *
 * El índice se monta y se consulta con la MISMA cuenta sobre los MISMOS enteros. Antes se
 * montaba con los números del mundo en coma flotante y se consultaba con los de coma fija
 * divididos otra vez: dos caminos hasta el mismo cajón, que en una raya pueden no coincidir.
 */
function cajonDe(v: number): number {
  return Math.floor(v / CAJON_EN_FIJO);
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

  /* ── El rectángulo de lo que se pisa o se vadea ──────────────────────── */
  let desdeX = 0;
  let desdeY = 0;
  let hastaX = -1;
  let hastaY = -1;
  let hayAlguna = false;
  for (const lista of [mundo.pisables, mundo.vados]) {
    for (const c of lista) {
      if (!hayAlguna) {
        desdeX = c.x;
        desdeY = c.y;
        hastaX = c.x;
        hastaY = c.y;
        hayAlguna = true;
        continue;
      }
      if (c.x < desdeX) desdeX = c.x;
      if (c.y < desdeY) desdeY = c.y;
      if (c.x > hastaX) hastaX = c.x;
      if (c.y > hastaY) hastaY = c.y;
    }
  }
  const anchura = hastaX >= desdeX ? hastaX - desdeX + 1 : 0;
  const fondo = hastaY >= desdeY ? hastaY - desdeY + 1 : 0;
  const pisable = new Uint8Array(anchura * fondo);
  /* Primero el agua y después la tierra: una casilla en las dos listas acaba FIRME. */
  for (const c of mundo.vados) pisable[(c.y - desdeY) * anchura + (c.x - desdeX)] = VADO;
  for (const c of mundo.pisables) pisable[(c.y - desdeY) * anchura + (c.x - desdeX)] = FIRME;

  /* ── Las cajas, en coma fija, y su índice por cajones ────────────────── */
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
  for (let i = 0; i < mundo.cuerpos.length; i++) {
    const a = cajonDe(cuerpos[i * 4] as number);
    const b = cajonDe(cuerpos[i * 4 + 1] as number);
    const d = cajonDe(cuerpos[i * 4 + 2] as number);
    const e = cajonDe(cuerpos[i * 4 + 3] as number);
    if (i === 0) {
      cajonDesdeX = a;
      cajonDesdeZ = b;
      cajonHastaX = d;
      cajonHastaZ = e;
      continue;
    }
    if (a < cajonDesdeX) cajonDesdeX = a;
    if (b < cajonDesdeZ) cajonDesdeZ = b;
    if (d > cajonHastaX) cajonHastaX = d;
    if (e > cajonHastaZ) cajonHastaZ = e;
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
    const a = cajonDe(cuerpos[i * 4] as number) - cajonDesdeX;
    const b = cajonDe(cuerpos[i * 4 + 1] as number) - cajonDesdeZ;
    const d = cajonDe(cuerpos[i * 4 + 2] as number) - cajonDesdeX;
    const e = cajonDe(cuerpos[i * 4 + 3] as number) - cajonDesdeZ;
    for (let cz = b; cz <= e; cz++) {
      for (let cx = a; cx <= d; cx++) {
        (cajones[cz * cajonesAncho + cx] as number[]).push(i);
      }
    }
  }

  const nace = new Int32Array(mundo.nace.length * 2);
  const rumbos: number[] = [];
  for (let i = 0; i < mundo.nace.length; i++) {
    const s = mundo.nace[i] as Sitio;
    nace[i * 2] = aFijo(s.x);
    nace[i * 2 + 1] = aFijo(s.z);
    rumbos.push(s.rumbo);
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
    rumbos,
  };
}

/* ─── LAS PREGUNTAS ──────────────────────────────────────────────────────── */

/** ¿Qué hay debajo de este punto? Todo en Q16.16. */
export function sueloEn(arena: Arena, x: number, z: number): Suelo {
  const i = casillaDe(x, arena.lado) - arena.desdeX;
  const j = casillaDe(-z, arena.lado) - arena.desdeY;
  if (i < 0 || j < 0 || i >= arena.anchura || j >= arena.fondo) return NADA;
  const v = arena.pisable[j * arena.anchura + i];
  return v === FIRME ? FIRME : v === VADO ? VADO : NADA;
}

/** ¿Cae este punto en una casilla donde se puede estar, firme o vadeando? Todo en Q16.16. */
export function hayPiso(arena: Arena, x: number, z: number): boolean {
  return sueloEn(arena, x, z) !== NADA;
}

/**
 * ¿Choca este círculo con alguna caja? Todo en Q16.16.
 *
 * Cuatro comparaciones por caja y ni un producto. Se prueba el CUADRADO que envuelve al
 * paseante y no el círculo: para decidir si se pasa entre un almiar y un muro, la diferencia
 * entre una esquina y un arco es menos que el ancho de una bota, y el arco costaría una raíz.
 *
 * ═══ SE MIRAN TODOS LOS CAJONES QUE PISA EL CUADRADO, NO SÓLO EL DEL CENTRO ═══
 *
 * Mirar sólo el cajón del centro era el agujero: con el centro a una bota de la raya, la mitad
 * del paseante está en el cajón de al lado, y lo que vive sólo ahí no se consultaba. Se veía
 * como meterse medio cuerpo en una casa que cae justo en una raya. Son a lo sumo cuatro cajones
 * —el radio es mucho menor que el cajón—, y una caja apuntada en dos se mira dos veces, que
 * para contestar «¿choca con algo?» da igual.
 */
export function chocaConCuerpo(arena: Arena, x: number, z: number, radio: number): boolean {
  if (arena.cajonesAncho === 0 || arena.cajonesFondo === 0) return false;
  let desdeCx = cajonDe(x - radio) - arena.cajonDesdeX;
  let hastaCx = cajonDe(x + radio) - arena.cajonDesdeX;
  let desdeCz = cajonDe(z - radio) - arena.cajonDesdeZ;
  let hastaCz = cajonDe(z + radio) - arena.cajonDesdeZ;
  if (hastaCx < 0 || hastaCz < 0 || desdeCx >= arena.cajonesAncho || desdeCz >= arena.cajonesFondo) return false;
  if (desdeCx < 0) desdeCx = 0;
  if (desdeCz < 0) desdeCz = 0;
  if (hastaCx >= arena.cajonesAncho) hastaCx = arena.cajonesAncho - 1;
  if (hastaCz >= arena.cajonesFondo) hastaCz = arena.cajonesFondo - 1;
  const c = arena.cuerpos;
  for (let cz = desdeCz; cz <= hastaCz; cz++) {
    for (let cx = desdeCx; cx <= hastaCx; cx++) {
      const cajon = arena.cajones[cz * arena.cajonesAncho + cx];
      if (cajon === undefined) continue;
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
    }
  }
  return false;
}

/** ¿Se puede estar aquí? Hay piso —firme o vado— y no hay cuerpo. */
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
 * Cuántos trozos como mucho se miran en un tramo. Con el radio de una persona son 1.600 unidades
 * del mundo: más que cualquier tramo que un servidor tenga que mirar, porque antes de preguntar
 * esto ya ha descartado lo que no se puede andar en el tiempo que ha pasado.
 */
export const TROZOS_DE_UN_TRAMO = 4096;

/**
 * ¿SE PUEDE IR DE AQUÍ A ALLÍ EN LÍNEA RECTA? Todo en Q16.16.
 *
 * Es la pregunta del que valida. Comprobar sólo el sitio de llegada deja que quien diga «estoy al
 * otro lado del muro» lo esté: la llegada es buena, lo malo es el camino. Así que se recorre el
 * tramo a trozos no más largos que el radio —ninguna pared más gruesa que un paseante se cuela
 * entre dos— y en cada trozo se exige poder estar. El trozo se saca con una multiplicación y una
 * división exactas y un truncado, sin un producto Q16.16 (ver `fijo.ts`).
 *
 * Un tramo de más de `TROZOS_DE_UN_TRAMO` trozos se da por imposible: nadie anda tanto en un tic,
 * y mirarlo sería dejar que cualquiera ponga a trabajar al servidor diciendo que se ha
 * teletransportado.
 */
export function seAndaEnRecta(arena: Arena, desde: Andante, hasta: Andante, radio: number): boolean {
  const dx = hasta.x - desde.x;
  const dz = hasta.z - desde.z;
  const largo = Math.max(Math.abs(dx), Math.abs(dz));
  if (largo === 0) return sePuedeEstar(arena, hasta.x, hasta.z, radio);
  const paso = radio > 0 ? radio : UNO / 4;
  const trozos = Math.ceil(largo / paso);
  if (trozos > TROZOS_DE_UN_TRAMO) return false;
  for (let i = 1; i <= trozos; i++) {
    const x = desde.x + (((dx * i) / trozos) | 0);
    const z = desde.z + (((dz * i) / trozos) | 0);
    if (!sePuedeEstar(arena, x, z, radio)) return false;
  }
  return true;
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
 *
 * En un VADO el paso es la mitad, y la mitad es `(d / 2) | 0`: división y truncado, las dos
 * fijadas al bit. Lo decide el suelo que se pisa AL SALIR, no al llegar: entrar en el agua no
 * frena el paso que te mete, frena el siguiente, que es como se nota andando.
 */
export function unPaso(
  arena: Arena,
  quien: Andante,
  vx: number,
  vz: number,
  dt: number,
  radio: number,
): Andante {
  let dx = por(vx, dt);
  let dz = por(vz, dt);
  if (sueloEn(arena, quien.x, quien.z) === VADO) {
    dx = (dx / 2) | 0;
    dz = (dz / 2) | 0;
  }
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
