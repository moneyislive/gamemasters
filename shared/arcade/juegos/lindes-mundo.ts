/**
 * EL MUNDO DE LAS LINDES: por dónde se anda y con qué se choca en el valle.
 *
 * ═══ ESTADO: ESBOZO CON LA FIRMA DEFINITIVA ═══
 *
 * Este fichero nace con la firma que van a usar la escena, el paseo y el servidor, y con un
 * cuerpo mínimo que se comporta como el paseante de siempre: se anda por las losas puestas y
 * el borde para, pero todavía no se choca con las piezas. Lo sustituye el reparto de piezas
 * bajado a `shared/` (murallas, torres, casas, ermita y lo que estorba de verdad), sin que
 * cambie la firma: quien ya lo llame no se entera.
 *
 * La firma y lo que promete:
 *
 *   · Entra lo que YA sale de la vista pública —las losas puestas, con su clase y su giro— y la
 *     semilla del paisaje, `semillaDelCodigo(codigo, 0x5eed)`, que es la misma que usa la
 *     escena. Nada del estado opaco: el servidor y el aparato tienen los dos la vista.
 *   · `lado` es el de una LOSA: una casilla del mundo es una losa puesta.
 *   · `nace[i]` es el sitio donde se nace en `losas[i]`, en el mismo orden. Quien pasea a solas
 *     nace en la última puesta; el servidor reparte a los de una mesa entre todas.
 */
import type { MundoDeclarado, Sitio } from '../../mecanicas/mundo';
import type { Giro } from './lindes-losas';

/** Una losa puesta, como la da la vista traducida (`TableroDeLasLindesEn3D.losas`). */
export interface LosaParaElMundo {
  /** Hacia el este. */
  readonly x: number;
  /** Hacia el norte. */
  readonly y: number;
  /** La clase de losa, del catálogo. */
  readonly losa: string;
  readonly giro: Giro;
}

/**
 * El lado de una losa en unidades del mundo: 32 del pack por la escala del pack (2,543 × 2 / 0,93).
 * Es el `LADO_DE_LOSA` de `escenas/lindes/medidas.ts`, escrito aquí porque `shared/` no puede
 * importar de `escenas/`.
 */
export const LADO_DE_LOSA_DEL_MUNDO = 175.0021505376344;

/** EL MUNDO DE UN TABLERO DE LAS LINDES. Función pura. */
export function mundoDeLasLindes(losas: readonly LosaParaElMundo[], semilla: number): MundoDeclarado {
  void semilla;
  const nace: Sitio[] = losas.map((l) => ({
    x: l.x * LADO_DE_LOSA_DEL_MUNDO,
    z: -l.y * LADO_DE_LOSA_DEL_MUNDO,
    rumbo: 0,
  }));
  return {
    lado: LADO_DE_LOSA_DEL_MUNDO,
    pisables: losas.map((l) => ({ x: l.x, y: l.y })),
    vados: [],
    cuerpos: [],
    nace,
  };
}
