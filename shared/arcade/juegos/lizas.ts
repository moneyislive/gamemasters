/**
 * EL REGISTRO DE LIZAS: qué arcades se lidian a pie en la sala del servidor, cómo se saca la liza de
 * una mesa y cuánto cuesta tenerla abierta.
 *
 * ═══ POR QUÉ UN REGISTRO, Y NO UNA BANDERA DEL MANIFIESTO ═══
 *
 * Por lo mismo que `mundos.ts`: el manifiesto vive en `shared/arcade/tipos.ts`, que está SELLADO, y
 * «este juego se lidia» no es un `true` que alguien pueda poner para que salga un botón: es que exista
 * una función que declare su liza. Un arcade se lidia si y sólo si está aquí, y está aquí si y sólo si
 * alguien escribió su productor.
 *
 * Estar aquí significa además tres cosas que la plataforma hace sin preguntar: la mesa se juega SIEMPRE
 * a pie —en la sala de la Liza, por su ruta `/liza`, sin pasar por la modalidad ni por la compuerta de
 * Boots on Board—; la calidad del aparato se DEGRADA y nunca VETA (un móvil modesto juega con menos
 * adorno, no se queda fuera); y el vestíbulo no pone plazos por turno, porque aquí no hay turnos.
 *
 * ═══ LA LIZA SALE DE LA VISTA PÚBLICA Y DEL CÓDIGO, NUNCA DEL ESTADO ═══
 *
 * El productor recibe lo que tienen LOS DOS LADOS: la vista de la mesa —la que ve quien mira sin
 * asiento, que es la misma para todos en un juego sin secretos— y el código. El estado opaco del
 * reductor no entra: el aparato no lo tiene, y una liza que el aparato no puede derivar es una liza en
 * la que la sala y el jugador juegan a cosas distintas. Es la regla de `mundos.ts`, por la misma razón.
 *
 * ═══ EL AFORO: CADA SALA DICE LO QUE CUESTA, Y EL REGISTRO DICE SI CABE ═══
 *
 * Una sala llena de la Liza cuesta unas veinte veces lo que una mesa de cartas, y el proceso es uno. Así
 * que la plataforma no abre salas a ciegas: cada liza declara su aforo (`AforoDeLaSala`, el mismo en
 * todas las fases de la mesa, la reunión incluida), `costeDeLaLiza` lo pasa a tiempo de CPU con el
 * modelo del §12 del diseño, y `cabeOtraSala` dice si el proceso tiene sitio. La E/S lo pregunta al
 * NACER una sala —cuando llega el primer `hola` de una mesa sin sala— y, si no cabe, cierra con `llena`:
 * «la ciudad está llena, prueba en un minuto». Una sala que ya vive no se echa: su coste se admitió al
 * abrir, y no puede crecer (la E/S no le mete una declaración con otro aforo).
 *
 * ═══ QUIÉN LO IMPORTA ═══
 *
 * La sala del servidor (`server/src/liza/`) y el cliente del juego. NADA de `shared/mecanicas/liza/`
 * importa este fichero: la Liza es genérica y no sabe qué juegos hay (ver `docs/LA-LIZA.md`).
 *
 * ═══ UN JUEGO NUEVO ═══
 *
 * 1. Escribe su productor en `shared/arcade/juegos/<juego>-liza.ts`: una función pura
 *    `(vista: unknown, codigo: string) => LizaDeclarada | null` que lee SU vista con su lector
 *    estricto, compone el reglamento de cada asiento con lo que la vista publica, deriva el mundo del
 *    código y la fase, y devuelve `null` si la vista no se lee (si la mesa se está reuniendo, la fase
 *    es `quieta`, que también es una liza: `null` es sólo «no se lee»). No lanza: una vista rara es un
 *    `null`, no un proceso caído.
 * 2. Exige en su comprobador que `problemasDeLaDeclaracion` dé `[]` para TODAS las fases que produce,
 *    y que el `aforo` sea el mismo en todas.
 * 3. Añade UNA fila a `FILAS_DE_LIZAS`: `[SU_ID, productor]`, importando el id de su fichero de
 *    manifiesto y el productor de su fichero de liza. Nada más: la sala, el cable, la geometría y los
 *    veredictos son de la plataforma.
 *
 * La primera fila la puso El Quiebro, el juego que estrena la Liza, cuando su productor pasó su
 * comprobador (`verify:quiebro` exige `problemasDeLaDeclaracion` vacío en cientos de vistas de su
 * robot, en todas sus fases, y el mismo aforo en todas). `verify:liza-protocolo` sigue probando el
 * registro con uno de juguete (`registroDeLizas`) y, además, cada fila de verdad.
 */
import type { LizaDeclarada } from '../../mecanicas/liza/declaracion';
import type { ArcadeId } from '../tipos';
import { QUIEBRO } from './quiebro';
import { lizaDelQuiebro } from './quiebro-liza';

/**
 * Cómo se saca la liza de una mesa: de su vista pública y su código. `null` si la vista no es la de
 * este juego o no se puede leer: la sala no se abre y lo dice.
 */
export type ProductorDeLiza = (vista: unknown, codigo: string) => LizaDeclarada | null;

/** Una fila del registro: el arcade y su productor. */
export type FilaDeLizas = readonly [arcade: ArcadeId, productor: ProductorDeLiza];

/** Lo que el registro contesta. */
export interface RegistroDeLizas {
  /** ¿Se lidia este arcade? Si y sólo si tiene productor de liza. */
  sePuedeLidiar(arcade: ArcadeId): boolean;
  /** Los arcades que se lidian, en el orden en que se dieron de alta. */
  arcadesQueSeLidian(): readonly ArcadeId[];
  /**
   * LA LIZA DE UNA MESA. `null` si el arcade no se lidia o si su productor no pudo leer la vista. No la
   * valida: quien la vaya a USAR —la sala antes de aceptarla, el comprobador del juego— pasa lo que
   * salga por `problemasDeLaDeclaracion`, que cuesta lo bastante como para no hacerlo en cada consulta.
   */
  lizaDeLaMesa(arcade: ArcadeId, vista: unknown, codigo: string): LizaDeclarada | null;
}

/**
 * UN REGISTRO CON ESTAS FILAS. El de la plataforma es `registroDeLizas(FILAS_DE_LIZAS)`; los
 * comprobadores montan otros con productores de juguete. Lanza si un arcade está dos veces: dos
 * productores para una mesa son dos respuestas a «¿a qué se juega aquí?», y la tabla es código que se
 * escribe a mano.
 */
export function registroDeLizas(filas: readonly FilaDeLizas[]): RegistroDeLizas {
  const productores = new Map<ArcadeId, ProductorDeLiza>();
  for (const [arcade, productor] of filas) {
    if (productores.has(arcade)) throw new Error(`El arcade «${arcade}» está dos veces en el registro de lizas.`);
    productores.set(arcade, productor);
  }
  return {
    sePuedeLidiar: (arcade) => productores.has(arcade),
    arcadesQueSeLidian: () => [...productores.keys()],
    lizaDeLaMesa: (arcade, vista, codigo) => {
      const productor = productores.get(arcade);
      if (productor === undefined) return null;
      return productor(vista, codigo);
    },
  };
}

/** LAS FILAS DE LA PLATAFORMA. Ver en la cabecera cómo se da de alta un juego. */
const FILAS_DE_LIZAS: readonly FilaDeLizas[] = [[QUIEBRO, lizaDelQuiebro]];

const REGISTRO: RegistroDeLizas = registroDeLizas(FILAS_DE_LIZAS);

/** ¿Se lidia este arcade? Si y sólo si tiene productor de liza. */
export function sePuedeLidiar(arcade: ArcadeId): boolean {
  return REGISTRO.sePuedeLidiar(arcade);
}

/** Los arcades que se lidian, en el orden en que se dieron de alta. */
export function arcadesQueSeLidian(): readonly ArcadeId[] {
  return REGISTRO.arcadesQueSeLidian();
}

/** LA LIZA DE UNA MESA: ver `RegistroDeLizas.lizaDeLaMesa`. */
export function lizaDeLaMesa(arcade: ArcadeId, vista: unknown, codigo: string): LizaDeclarada | null {
  return REGISTRO.lizaDeLaMesa(arcade, vista, codigo);
}

/* ─── EL COSTE Y LA ADMISIÓN ─────────────────────────────────────────────── */

/**
 * EL MODELO DE COSTE DE UNA SALA, en MICROSEGUNDOS DE CPU POR SEGUNDO de un PC de desarrollo, sacado de
 * la tabla del §12 del diseño: validar los `aqui` de un asiento y mandarle sus mensajes; mover, pensar
 * y mirar de una entidad; el vuelo de una bala; y lo fijo de una sala (el tic, la foto). Con él, una
 * sala llena (6 asientos, 14 entidades, 12 balas) cuesta 5.580 y una en solitario (1, 6, 6) 2.090,
 * que es lo que el diseño estimaba (≈ 5,9 y 1,9 ms/s). Los coeficientes se afinan con `medir:liza` en el
 * plan donde corre de verdad; lo que no cambia es que el coste sale de lo DECLARADO, nunca de lo que
 * esté vivo en cada momento, para que admitir una sala sea una promesa que se puede cumplir.
 */
export const COSTE_DE_UNA_SALA = {
  base: 100,
  porAsiento: 250,
  porEntidad: 250,
  porBala: 40,
} as const;

/**
 * EL PRESUPUESTO DE TODAS LAS SALAS DE UN PROCESO, en la misma unidad: 80.000 µs/s de PC. En la
 * instancia de producción (unas 2,5 veces más lenta, medio núcleo) son unos 200 ms/s: el 40 % que el
 * diseño reserva al juego. Unas catorce salas llenas o treinta y ocho en solitario, o su mezcla.
 */
export const PRESUPUESTO_DE_LAS_LIZAS = 80000;

/** Lo que cuesta tener abierta la sala de esta liza, según su aforo (µs de CPU por segundo, en PC). */
export function costeDeLaLiza(liza: LizaDeclarada): number {
  const c = COSTE_DE_UNA_SALA;
  return c.base + c.porAsiento * liza.asientos.length + c.porEntidad * liza.aforo.entidades + c.porBala * liza.aforo.balas;
}

/**
 * ¿CABE OTRA SALA de coste `nueva` junto a las que ya viven (`abiertas`, sus costes)? Si no, la E/S no
 * la abre y cierra el canal con `llena`: se reintenta en un minuto.
 */
export function cabeOtraSala(abiertas: readonly number[], nueva: number): boolean {
  let suma = nueva;
  for (const c of abiertas) suma += c;
  return suma <= PRESUPUESTO_DE_LAS_LIZAS;
}
