/**
 * Cuántas cosas hace falta tener antes de poder generar una partida.
 *
 * Antes esto eran tres líneas escritas a mano en `StudioPage` —tres
 * sospechosos, cuatro salas, tres armas— y con ellas el taller solo sabía
 * preparar CLUEDO. Ahora lo dice cada categoría en su manifiesto, con dos
 * excepciones que están aquí porque no caben allí todavía. Las dos están
 * anotadas para el informe de arquitectura.
 */
import { entidadesDe, RITOS_DEL_SELLADO } from '../../../shared/juegos';
import type { CategoriaId, DefinicionCategoria, JuegoId, ManifiestoDeJuego } from '../../../shared/juegos';
import type { GameSession } from '../../../shared/types';

/**
 * EXCEPCIÓN 1: dos verdades sobre las salas de CLUEDO.
 *
 * El manifiesto dice `minimo: 3` y el servidor exige 4 (`MINIMOS` en
 * `server/src/agent/tools.ts`). No es una duda: son dos números distintos
 * escritos en dos sitios, y llevan así desde antes de que existieran los
 * manifiestos.
 *
 * El taller se queda con EL MÁS EXIGENTE de los dos, y el motivo es de producto
 * y no de código: la alternativa es dejar pulsar un botón que el servidor va a
 * rechazar, y no hay nada que dé peor impresión que una aplicación que te deja
 * hacer algo para negártelo después.
 *
 * Que lo arregle quien pueda tocar `shared/` y `server/` a la vez: sobra uno de
 * los dos números, y debería sobrar el del servidor.
 */
const MINIMO_HEREDADO: Record<CategoriaId, number> = {
  salas: 4,
};

/**
 * EXCEPCIÓN 2: las categorías que admiten un número EXACTO.
 *
 * Los ritos del sellado son cinco. Ni cuatro —con 24 órdenes posibles la mesa
 * lo resuelve por fuerza bruta en diez minutos— ni seis —con 720 la sobremesa
 * se hace larga—. Está razonado en `shared/juegos/momia.ts` y en el diseño.
 *
 * El manifiesto solo sabe decir `minimo`, así que «exactamente cinco» no cabe
 * en él y vive aquí. LO SUYO SERÍA `DefinicionCategoria.maximo`: con eso, una
 * categoría exacta sería la que tiene mínimo y máximo iguales, se diría en el
 * mismo sitio que todo lo demás, y este fichero perdería la mitad. Va en el
 * informe.
 */
const CUENTA_EXACTA: Record<string, number> = {
  'momia:ritos': RITOS_DEL_SELLADO,
};

export interface RequisitoDeCategoria {
  categoria: DefinicionCategoria;
  /** Cuántas hay dadas de alta. */
  hay: number;
  /** Cuántas hacen falta como mínimo. */
  minimo: number;
  /** Cuántas exactamente, si la categoría no admite más ni menos. */
  exacto?: number;
  cumple: boolean;
  /** Le sobran. Solo puede pasar en las categorías de cuenta exacta. */
  sobran: boolean;
}

export function cuentaExactaDe(
  juego: JuegoId,
  categoria: CategoriaId,
): number | undefined {
  return CUENTA_EXACTA[`${juego}:${categoria}`];
}

/** Cuántas entidades pide una categoría antes de poder generar. */
export function minimoDe(categoria: DefinicionCategoria): number {
  return Math.max(categoria.minimo, MINIMO_HEREDADO[categoria.id] ?? 0);
}

/** El estado de cada categoría frente a lo que exige. */
export function requisitosDe(
  manifiesto: ManifiestoDeJuego,
  game: GameSession,
): RequisitoDeCategoria[] {
  return manifiesto.categorias.map((categoria) => {
    const hay = entidadesDe(game, categoria.id).length;
    const exacto = cuentaExactaDe(manifiesto.id, categoria.id);
    const minimo = exacto ?? minimoDe(categoria);
    const sobran = exacto !== undefined && hay > exacto;
    const cumple = exacto === undefined ? hay >= minimo : hay === exacto;
    return { categoria, hay, minimo, exacto, cumple, sobran };
  });
}

/**
 * Lo que falta, dicho en una frase por categoría.
 *
 * El RÓTULO lo pone quien llama, y no es un capricho de diseño: en CLUEDO la
 * categoría se llama `objetos` en el manifiesto y «armas» en la pantalla, y
 * este fichero no tiene por qué saberlo. Aquí están las cuentas; las palabras
 * están en `palabras.ts`.
 */
export function loQueFalta(
  manifiesto: ManifiestoDeJuego,
  game: GameSession,
  rotulo: (categoria: DefinicionCategoria) => string,
): string[] {
  return requisitosDe(manifiesto, game)
    .filter((r) => !r.cumple)
    .map((r) =>
      r.exacto === undefined
        ? `${rotulo(r.categoria)} (${r.hay}/${r.minimo})`
        : `${rotulo(r.categoria)} (${r.hay} de ${r.exacto} exactos)`,
    );
}
