/**
 * EL REGISTRO DE MUNDOS: qué arcades se pueden recorrer, y cómo se saca el mundo de una mesa.
 *
 * ═══ POR QUÉ UN REGISTRO Y NO UN CAMPO DEL MANIFIESTO ═══
 *
 * Porque el manifiesto vive en `shared/arcade/tipos.ts`, que está SELLADO, y porque «este juego se
 * puede recorrer» no es una bandera que alguien pueda poner a `true` para que salga el botón: es
 * que exista una función que declare su mundo. La regla de la casa —lo que un programador pueda
 * poner mal, se deriva— lo pide así: un juego admite Boots on Board si y sólo si está aquí, y
 * está aquí si y sólo si alguien escribió su productor.
 *
 * ═══ EL MUNDO SALE DE LA VISTA PÚBLICA Y DEL CÓDIGO, NUNCA DEL ESTADO ═══
 *
 * El productor recibe lo que tienen los dos lados: la vista de la mesa —el aparato, la suya; el
 * servidor, la de quien mira sin asiento— y el código. El estado opaco del reductor NO entra: el
 * aparato no lo tiene, y un mundo que el aparato no puede derivar es un mundo en el que el
 * servidor y el jugador andan por sitios distintos.
 *
 * Por eso cada productor usa la parte PÚBLICA de la vista —el tablero, que es igual para todos—
 * a través de la misma traducción que usa la escena (`tableroEnTres`), y la semilla del paisaje
 * que usa la escena. Si la escena cambiara de semilla y esto no, el mundo declarado dejaría de
 * caer bajo lo que se pinta sin que nada fallara: por eso la semilla se escribe aquí una vez y
 * los productores de cada juego la documentan en su cabecera.
 *
 * ═══ UN JUEGO NUEVO ═══
 *
 * Declara su mundo en `shared/arcade/juegos/<juego>-mundo.ts` —pisables, vados, cuerpos de
 * ESTRUCTURA y sitios de nacer; el adorno se queda en su escena— y añade una línea aquí. Nada más:
 * el paseo, los mandos, las cámaras, la marioneta, el canal y la validación son de la plataforma.
 */
import type { MundoDeclarado } from '../../mecanicas/mundo';
import { semillaDelCodigo } from '../../mecanicas/semilla';
import type { ArcadeId } from '../tipos';
import { BURGO } from './burgo';
import { mundoDelBurgo } from './burgo-mundo';
import { LINDES } from './lindes';
import { tableroEnTres as tableroDeLasLindes } from './lindes-en-tres';
import { mundoDeLasLindes } from './lindes-mundo';
import { RIBERAS } from './riberas';
import { mundoDeRiberas } from './riberas-mundo';
import type { ClaseDeHallazgo } from '../../mecanicas/hallazgos';
import { HALLAZGOS_DE_LAS_LINDES, HALLAZGOS_DE_RIBERAS, HALLAZGOS_DEL_BURGO } from './hallazgos-de-los-juegos';
import { armaDeLaVista, PUNOS, refriegaDelArma } from './riberas-armas';
import type { ArmaEnLaRefriega } from './riberas-armas';

/**
 * Cómo se saca el mundo de una mesa: de su vista pública y su código. `null` si la vista todavía
 * no tiene tablero (una mesa sin empezar): no hay nada que recorrer.
 */
export type ProductorDeMundo = (vista: unknown, codigo: string) => MundoDeclarado | null;

/** La semilla del paisaje de Las Lindes: la de `escenas/lindes/Lindes.tsx`, con la portada en 0x5eed. */
export const SEMILLA_DE_PORTADA_DE_LAS_LINDES = 0x5eed;

const PRODUCTORES: ReadonlyMap<ArcadeId, ProductorDeMundo> = new Map<ArcadeId, ProductorDeMundo>([
  [
    LINDES,
    (vista, codigo) => {
      const tablero = tableroDeLasLindes(vista);
      if (tablero === null || tablero.losas.length === 0) return null;
      return mundoDeLasLindes(tablero.losas, semillaDelCodigo(codigo, SEMILLA_DE_PORTADA_DE_LAS_LINDES));
    },
  ],
  /* El Burgo no depende de la vista: su ciudad es la del código, y las casas que se compran son fichas. */
  [BURGO, (_vista, codigo) => mundoDelBurgo(codigo)],
  /*
   * Riberas, al revés: su delta ES la vista —qué comarca es de qué, dónde hay chozas y torres, el
   * estiaje—, y no depende del código. Una mesa que aún se reúne no tiene delta: mundo vacío, null.
   */
  [
    RIBERAS,
    (vista) => {
      const mundo = mundoDeRiberas(vista);
      return mundo.pisables.length === 0 ? null : mundo;
    },
  ],
]);

/** ¿Se puede recorrer este arcade? Si y sólo si tiene productor de mundo. */
export function sePuedeRecorrer(arcade: ArcadeId): boolean {
  return PRODUCTORES.has(arcade);
}

/** Los arcades que se pueden recorrer, en el orden en que se dieron de alta. */
export function arcadesQueSeRecorren(): readonly ArcadeId[] {
  return [...PRODUCTORES.keys()];
}

/**
 * EL MUNDO DE UNA MESA. `null` si el arcade no se recorre o si su vista aún no tiene tablero.
 */
export function mundoDeLaMesa(arcade: ArcadeId, vista: unknown, codigo: string): MundoDeclarado | null {
  const productor = PRODUCTORES.get(arcade);
  if (productor === undefined) return null;
  return productor(vista, codigo);
}

/* ─── LO QUE SE HACE A PIE: HALLAZGOS Y ARMAS (docs/AVATARES-JUGABLES.md) ───────────────────── */

/**
 * QUÉ BROTA EN CADA JUEGO. Un juego que se recorre y no está aquí no tiene hallazgos: se anda y se
 * pelea, y nada más. La tabla es de `hallazgos-de-los-juegos.ts`; esto sólo la ata al arcade.
 */
const HALLAZGOS: ReadonlyMap<ArcadeId, readonly ClaseDeHallazgo[]> = new Map<ArcadeId, readonly ClaseDeHallazgo[]>([
  [BURGO, HALLAZGOS_DEL_BURGO],
  [RIBERAS, HALLAZGOS_DE_RIBERAS],
  [LINDES, HALLAZGOS_DE_LAS_LINDES],
]);

/** Las clases de hallazgo de un arcade, con su peso. Vacío si no tiene. */
export function hallazgosDelJuego(arcade: ArcadeId): readonly ClaseDeHallazgo[] {
  return HALLAZGOS.get(arcade) ?? [];
}

/**
 * LO QUE HACE EN LA REFRIEGA EL GOLPE DE UN ASIENTO: daño, alcance y cono. Lo lee la sala del
 * servidor de la vista pública de la mesa (la de quien mira sin asiento). Sólo Riberas tiene
 * armas; en los demás, y ante cualquier vista rara, los puños de siempre.
 */
export function armaEnLaRefriega(arcade: ArcadeId, vista: unknown, asiento: string): ArmaEnLaRefriega {
  if (arcade !== RIBERAS) return PUNOS;
  return refriegaDelArma(armaDeLaVista(vista, asiento));
}
