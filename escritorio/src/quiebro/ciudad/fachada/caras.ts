/**
 * LAS CARAS DE LOS EDIFICIOS: de qué caras está hecho cada volumen, qué tramo de cada una tapa un volumen
 * pegado, dónde cae cada hueco (con la MISMA rejilla del sombreador) y el MURO de cada cara con sus atributos.
 *
 * ═══ QUÉ SE VE Y QUÉ NO: LAS MEDIANERAS ═══
 *
 * Dos edificios pegados comparten pared. La parte tapada por el vecino no se pinta (no se ve y cuesta
 * relleno); la parte que asoma por encima de un vecino más bajo es una MEDIANERA: pared ciega, sin ventanas.
 * Se calcula por tramos con las cajas de los volúmenes (`tocaLaCara`, `restar`), así que vale para cualquier
 * barrio y para la fila del cerco partida en celdas (los volúmenes de los vecinos de otra celda tapan igual).
 *
 * ═══ EL ÚNICO SITIO QUE ESCRIBE LOS ATRIBUTOS DEL MURO ═══
 *
 * Lo que el sombreador lee del muro de una cara (`aCara`, `aVolumen`, `aPlanta`, ver `declaraciones.ts`) sale
 * de `atributosDelMuro` y de ningún otro sitio: quien empaquete ahí algo más (la variedad por edificio, el
 * patrón de balcón, la marca de bulto) lo empaqueta para la ventana y para la LOD1 a la vez, porque las dos
 * escriben sus muros por aquí. Hoy da los mismos números que antes de partir `fachadas.ts`.
 */
import type { Molde } from '../geometria';
import { azarEn, mezclar } from '../azar';
import { NUMERO_DEL_ESTILO } from '../hash';
import type { BajoDeLaFachada, EdificioDelPlano, Orientacion, Volumen } from '../tipos';
import { BAJO, EPS, HUECO_DEL_ESTILO, TIPO } from './tipos-de-cara';
import type { Cara, CaraDelVolumen, GradoDeLaFachada, ObraDeLaFachada, Toque } from './tipos-de-cara';

/** Las cuatro caras de un volumen. */
export function carasDe(v: Volumen): Cara[] {
  return [
    { mira: 'n', plano: v.z0, desde: v.x0, hasta: v.x1, y0: v.y0, y1: v.y1 },
    { mira: 's', plano: v.z1, desde: v.x0, hasta: v.x1, y0: v.y0, y1: v.y1 },
    { mira: 'e', plano: v.x1, desde: v.z0, hasta: v.z1, y0: v.y0, y1: v.y1 },
    { mira: 'o', plano: v.x0, desde: v.z0, hasta: v.z1, y0: v.y0, y1: v.y1 },
  ];
}

/** ¿Toca este volumen la cara por detrás (su cara opuesta en el mismo plano)? Devuelve su tramo. */
export function tocaLaCara(c: Cara, o: Volumen): Toque | null {
  let plano: number;
  let desde: number;
  let hasta: number;
  if (c.mira === 'n') [plano, desde, hasta] = [o.z1, o.x0, o.x1];
  else if (c.mira === 's') [plano, desde, hasta] = [o.z0, o.x0, o.x1];
  else if (c.mira === 'e') [plano, desde, hasta] = [o.x0, o.z0, o.z1];
  else [plano, desde, hasta] = [o.x1, o.z0, o.z1];
  if (Math.abs(plano - c.plano) > EPS) return null;
  const a = Math.max(desde, c.desde);
  const b = Math.min(hasta, c.hasta);
  if (b - a < EPS) return null;
  return { desde: a, hasta: b, y0: o.y0, y1: o.y1 };
}

/** Resta de un intervalo [y0, y1] una lista de intervalos. Devuelve lo que queda, ordenado. */
export function restar(y0: number, y1: number, quitar: readonly (readonly [number, number])[]): [number, number][] {
  let quedan: [number, number][] = [[y0, y1]];
  for (const [a, b] of quitar) {
    const nuevos: [number, number][] = [];
    for (const [c, d] of quedan) {
      if (b <= c + EPS || a >= d - EPS) {
        nuevos.push([c, d]);
        continue;
      }
      if (a > c + EPS) nuevos.push([c, a]);
      if (b < d - EPS) nuevos.push([b, d]);
    }
    quedan = nuevos;
  }
  return quedan.filter(([a, b]) => b - a > EPS);
}

/** Una rejilla espacial tosca para no mirar todos los volúmenes contra todos. */
export function indiceDeVolumenes(todos: readonly Volumen[]): (c: Cara) => Volumen[] {
  const celda = 24;
  const mapa = new Map<string, Volumen[]>();
  for (const v of todos) {
    for (let i = Math.floor((v.x0 - EPS) / celda); i <= Math.floor((v.x1 + EPS) / celda); i++) {
      for (let k = Math.floor((v.z0 - EPS) / celda); k <= Math.floor((v.z1 + EPS) / celda); k++) {
        const clave = `${String(i)},${String(k)}`;
        const lista = mapa.get(clave);
        if (lista === undefined) mapa.set(clave, [v]);
        else lista.push(v);
      }
    }
  }
  return (c) => {
    const vistos = new Set<Volumen>();
    const [x0, x1, z0, z1] =
      c.mira === 'n' || c.mira === 's' ? [c.desde, c.hasta, c.plano, c.plano] : [c.plano, c.plano, c.desde, c.hasta];
    for (let i = Math.floor((x0 - EPS) / celda); i <= Math.floor((x1 + EPS) / celda); i++) {
      for (let k = Math.floor((z0 - EPS) / celda); k <= Math.floor((z1 + EPS) / celda); k++) {
        for (const v of mapa.get(`${String(i)},${String(k)}`) ?? []) vistos.add(v);
      }
    }
    return [...vistos];
  };
}

/** Los tramos de la cara `c` del volumen `v` que tapan los volúmenes pegados a ella (`cerca` los busca). */
export function toquesDeLaCara(c: Cara, v: Volumen, cerca: (c: Cara) => Volumen[]): Toque[] {
  return cerca(c)
    .filter((o) => o !== v)
    .map((o) => tocaLaCara(c, o))
    .filter((t): t is Toque => t !== null);
}

/** Escribe un muro de una cara, de `a` a `b` a lo largo y de `ya` a `yb` en alto. */
export function muroDeLaCara(m: Molde, c: Cara, a: number, b: number, ya: number, yb: number): void {
  if (c.mira === 'n') m.muro(b, c.plano, a, c.plano, ya, yb, c.hasta - b);
  else if (c.mira === 's') m.muro(a, c.plano, b, c.plano, ya, yb, a - c.desde);
  else if (c.mira === 'e') m.muro(c.plano, b, c.plano, a, ya, yb, c.hasta - b);
  else m.muro(c.plano, a, c.plano, b, ya, yb, a - c.desde);
}

/** El vector normal de una orientación. */
export function normalDe(o: Orientacion): readonly [number, number] {
  return o === 'n' ? [0, -1] : o === 's' ? [0, 1] : o === 'e' ? [1, 0] : [-1, 0];
}

/** El punto en planta de una `u` a lo largo de una cara (u desde el borde izquierdo mirándola). */
export function puntoDeLaCara(c: Cara, u: number): readonly [number, number] {
  if (c.mira === 'n') return [c.hasta - u, c.plano];
  if (c.mira === 's') return [c.desde + u, c.plano];
  if (c.mira === 'e') return [c.plano, c.hasta - u];
  return [c.plano, c.desde + u];
}

/** Semilla entera de una cara (< 2^16, exacta en el atributo y en el hash). */
export function semillaDeLaCara(edificio: EdificioDelPlano, v: number, c: Orientacion): number {
  return mezclar(edificio.semilla, v, c.charCodeAt(0)) % 65536;
}

/** El tinte de un edificio (de 0 a 0,99): su tono y un poco de azar, en `aVolumen.z` de todo lo suyo. */
export function tinteDe(e: EdificioDelPlano): number {
  return Math.min(0.99, Math.max(0, e.tono + (azarEn(e.semilla, 7) - 0.5) * 0.1));
}

/** La cara `cara` del volumen `iv` de `e`, con su semilla, su fachada de calle y lo que la tapa. */
export function caraDelVolumen(e: EdificioDelPlano, iv: number, cara: Cara, cerca: (c: Cara) => Volumen[]): CaraDelVolumen {
  const volumen = e.volumenes[iv] as Volumen;
  return {
    mira: cara.mira,
    indice: iv,
    volumen,
    cara,
    semilla: semillaDeLaCara(e, iv, cara.mira),
    fachada: e.fachadas.find((f) => f.mira === cara.mira),
    toques: toquesDeLaCara(cara, volumen, cerca),
  };
}

/**
 * Recorre los huecos de una cara con la MISMA rejilla del sombreador (vanos enteros, plantas desde la baja,
 * sólo las que caben enteras bajo el remate; ver `TRAMO_DEL_HUECO`) y avisa por cada uno que no tape un
 * vecino: su columna (`celda`), su planta, su `u` a lo largo de la cara, la altura de su centro y la de su
 * alféizar.
 */
export function recorrerLosHuecos(
  e: EdificioDelPlano,
  v: Volumen,
  c: Cara,
  toques: readonly Toque[],
  avisar: (celda: number, planta: number, u: number, yCentro: number, ySuelo: number) => void,
): void {
  const ancho = c.hasta - c.desde;
  const nV = Math.max(1, Math.floor(ancho / Math.max(e.vano, 0.5) + 0.5));
  const vano = ancho / nV;
  const hueco = HUECO_DEL_ESTILO[e.estilo];
  const hp = e.alturaDePlanta;
  for (let planta = 0; ; planta++) {
    const suelo = e.plantaBaja + planta * hp;
    if (suelo + hp > v.y1 + 0.01) break;
    if (suelo < v.y0 - 0.01) continue;
    for (let celda = 0; celda < nV; celda++) {
      const u = (celda + 0.5) * vano;
      const y = suelo + ((hueco[2] + hueco[3]) / 2) * hp;
      const a = c.mira === 'n' || c.mira === 'e' ? c.hasta - u : c.desde + u;
      if (toques.some((t) => a >= t.desde && a <= t.hasta && y >= t.y0 && y <= t.y1)) continue;
      avisar(celda, planta, u, y, suelo + hueco[2] * hp);
    }
  }
}

/** Lo que el sombreador lee del muro de una cara (ver `declaraciones.ts`). */
export interface AtributosDelMuro {
  readonly aCara: readonly [number, number, number, number];
  readonly aVolumen: readonly [number, number, number, number];
  readonly aPlanta: readonly [number, number];
}

/**
 * LOS ATRIBUTOS DEL MURO de la cara `c` de `e` (ver la cabecera): el ancho de la cara, el estilo, la semilla
 * y si es fachada o medianera (`ciega`: un tramo tapado por un vecino en una cara que no da a la calle); la
 * planta baja, el techo del volumen, el tinte y el vano; la altura de planta y qué hay en el bajo. Una
 * función pura del edificio y de la cara: la misma en la ventana y en la LOD1. `grado` hoy no cambia nada.
 */
export function atributosDelMuro(e: EdificioDelPlano, c: CaraDelVolumen, grado: GradoDeLaFachada, ciega = false): AtributosDelMuro {
  const bajo = c.fachada === undefined ? BAJO.sinCalle : BAJO[c.fachada.bajo];
  return {
    aCara: [c.cara.hasta - c.cara.desde, NUMERO_DEL_ESTILO[e.estilo], c.semilla, ciega ? TIPO.medianera : TIPO.fachada],
    aVolumen: [e.plantaBaja, c.volumen.y1, tinteDe(e), e.vano],
    aPlanta: [e.alturaDePlanta, bajo],
  };
}

/** Pone en el molde los atributos de un muro: lo que se escriba después, los lleva. */
export function ponerLosAtributos(m: Molde, a: AtributosDelMuro): void {
  m.poner('aCara', ...a.aCara);
  m.poner('aVolumen', ...a.aVolumen);
  m.poner('aPlanta', ...a.aPlanta);
}

/**
 * EL MURO DE UNA CARA: se corta la cara por donde empiezan y acaban los volúmenes que la tocan, y de cada tramo
 * se escribe lo que no tapan (medianera si la cara no da a la calle). Cede al acabar la cara.
 */
export function* escribirElMuro(m: Molde, e: EdificioDelPlano, c: CaraDelVolumen, obra: ObraDeLaFachada): Generator<void, void, void> {
  const { cara, toques } = c;
  const cortes = [cara.desde, cara.hasta, ...toques.flatMap((t) => [t.desde, t.hasta])]
    .filter((x) => x >= cara.desde - EPS && x <= cara.hasta + EPS)
    .sort((p, q) => p - q);
  for (let i = 0; i < cortes.length - 1; i++) {
    const a = cortes[i] as number;
    const b = cortes[i + 1] as number;
    if (b - a < EPS) continue;
    const tapan = toques.filter((t) => t.desde <= a + EPS && t.hasta >= b - EPS);
    const visibles = restar(cara.y0, cara.y1, tapan.map((t) => [Math.max(cara.y0, t.y0), Math.min(cara.y1, t.y1)] as const));
    const atributos = atributosDelMuro(e, c, obra.grado, tapan.length > 0 && c.fachada === undefined);
    for (const [ya, yb] of visibles) {
      ponerLosAtributos(m, atributos);
      muroDeLaCara(m, cara, a, b, ya, yb);
    }
  }
  yield;
}

/**
 * UNA CARA DE CALLE, para lo que se cuelga de ella (toldos, aparatos de aire, escaleras de incendios:
 * `voladizos.ts`). Da las mismas cuentas que el sombreador: dónde cae cada hueco y cada tienda, y qué
 * tramos tapa un vecino.
 */
export interface CaraDeCalle {
  readonly edificio: EdificioDelPlano;
  readonly indice: number;
  readonly mira: Orientacion;
  readonly desde: number;
  readonly hasta: number;
  readonly y0: number;
  readonly y1: number;
  readonly bajo: BajoDeLaFachada;
  readonly semilla: number;
  /** El punto en planta a `u` metros de su borde izquierdo (mirándola). */
  punto(u: number): readonly [number, number];
  /** ¿Tapa un vecino el punto `a` (coordenada del mundo a lo largo de la cara) a la altura `y`? */
  tapado(a: number, y: number): boolean;
  /** Los huecos, con la rejilla del sombreador: celda, planta, u, altura del centro y del alféizar. */
  huecos(avisar: (celda: number, planta: number, u: number, yCentro: number, ySuelo: number) => void): void;
}

/** Las caras de los edificios que dan a una calle (las que tienen fachada). */
export function carasDeCalle(edificios: readonly EdificioDelPlano[], vecinos: readonly Volumen[] = []): CaraDeCalle[] {
  const todos: Volumen[] = [...edificios.flatMap((e) => e.volumenes), ...vecinos];
  const cerca = indiceDeVolumenes(todos);
  const salida: CaraDeCalle[] = [];
  for (const e of edificios) {
    e.volumenes.forEach((v, iv) => {
      for (const c of carasDe(v)) {
        const fachada = e.fachadas.find((f) => f.mira === c.mira);
        if (fachada === undefined) continue;
        const toques = toquesDeLaCara(c, v, cerca);
        salida.push({
          edificio: e,
          indice: iv,
          mira: c.mira,
          desde: c.desde,
          hasta: c.hasta,
          y0: c.y0,
          y1: c.y1,
          bajo: fachada.bajo,
          semilla: semillaDeLaCara(e, iv, c.mira),
          punto: (u) => puntoDeLaCara(c, u),
          tapado: (a, y) => toques.some((t) => a >= t.desde && a <= t.hasta && y >= t.y0 && y <= t.y1),
          huecos: (avisar) => recorrerLosHuecos(e, v, c, toques, avisar),
        });
      }
    });
  }
  return salida;
}
