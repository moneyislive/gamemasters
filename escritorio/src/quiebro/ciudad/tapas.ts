/**
 * LO QUE VA EN EL SUELO DE LA CALLE: las tapas de alcantarilla en el eje de la calzada y las rejillas de los
 * imbornales en la rigola, los VADOS (la rampa de cada boca de cebra contra el bordillo), los registros de
 * servicios junto a las farolas y los alcorques de los troncos. Todo a ras de suelo y SIEMPRE por debajo de
 * 0,2 m contando la acera (no estorba: el comprobador mira de 0,2 a 1,9 m, y `quiebro-ciudad/suelo.ts`, b, exige
 * que nada de aquí pase de ahí).
 *
 * `sueloDeLaCelda` es el escritor de su familia en la celda (`EscritorDeLaCelda` de `celdas.ts`): el último,
 * después de los rótulos. Las bocas de las tapas van a la obra: de ellas sale el vapor. Cede por pieza (una tapa,
 * una rampa, un registro, un alcorque): ninguna pasa de cien triángulos.
 *
 * ═══ POR GRADO (plan del detalle, §3.1: tapa 30 / 45 / 70) ═══
 *
 *   · N0: las tapas y las rejillas de siempre, con otro albedo (eran manchas negras), y los vados.
 *   · g1 (N1): la tapa, un disco de 10 lados con su canto (28 triángulos, sin la cara de abajo, que no se ve); la
 *     rejilla, un cuadro; los registros y los alcorques, sus caras de arriba.
 *   · g2: la tapa con su marco en anillo, un pelo más alto que ella, de 9 lados (43); la rejilla, el registro y el
 *     alcorque con sus cantos.
 *   · g3: lo mismo con 14 lados, que a metro y medio ya no se ve el polígono (68); la rejilla y el registro hundidos
 *     en su marco.
 *
 * Y la rampa de cada vado: 4 triángulos (2 en N0, sin los costados).
 *
 * El dibujo de la fundición (los rombos de la tapa, los barrotes de la rejilla, las estrías del registro, la reja
 * del alcorque) no es geometría: lo pinta la familia `fundicion` de la materia (`materia/familias/fundicion.ts`),
 * que sabe qué pieza es por la parte entera de la `u` (`PIEZA_DE_FUNDICION`, de 10 en 10) y lee el resto de la UV
 * como metros desde el centro de la pieza, alineados con x y z. En N0 no se reparten familias: ahí el acabado va
 * con la familia 0 (lo liso), que es lo de siempre.
 *
 * ═══ EL VADO ═══
 *
 * Una rampa de hormigón adosada al bordillo en la calzada (4 triángulos; 2 en N0): de la cota de la acera, contra el
 * canto, a ras del asfalto `VADO.fondo` metros más allá, y a lo largo del bordillo de `VADO.desde` a `VADO.hasta`
 * metros de la boca del tramo, que es donde el asfalto pinta la cebra (`suelo.ts`) y la acera el podotáctil y el
 * bordillo rebajado (los mismos números, `VADO`). Una en cada bordillo de cada boca de cada tramo de cebra (de 10 m o
 * más, como la cebra), menos contra la mediana donde la mediana no llega (la punta del Bulevar en el Elevado). El
 * mapa de alturas NO cambia (§3.3): sigue binario; un pie en lo alto de la rampa se hunde como mucho unos 10 cm, del
 * orden del escalón de siempre.
 *
 * El acabado de las piezas de N1+ lleva su familia (`fundicion`, `hormigon`, `piedra`): el material del mobiliario la
 * reparte desde que O2-MOBILIARIO lo cablea con la materia. Hasta entonces lee `aAcabado.x` entero como rugosidad, y
 * three la deja en 1: las piezas salen mates, no rotas.
 */
import { ACABADO, lineal } from './materiales';
import { GRANITO, tono } from './mobiliario';
import type { CajaXZ, CalleDelPlano, FarolaDelPlano, NivelDeLaCiudad } from './tipos';
import { ALTURA_DE_LA_ACERA } from './tipos';
import { azarEn } from './azar';
import { BORDE_DE_LA_CIUDAD, CALZADA_DE_AVENIDA, MEDIANA_DE_AVENIDA } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import type { ObraDeLaCelda, ParteDeLaCelda } from './celdas';
import type { Molde, V3 } from './geometria';
import { FAMILIA, acabado } from './materia/familias';
import { VADO } from './suelo';

/** Dónde se ponen las tapas: unas calles y la caja de la que no se salen. */
export interface TapasDeLasCalles {
  readonly calles: readonly CalleDelPlano[];
  readonly limite: CajaXZ;
}

/**
 * QUÉ PIEZA DE FUNDICIÓN ES, en la parte entera de la `u` (de 10 en 10: `u = 10·pieza + metros`). La rejilla va
 * en dos: con los barrotes sucediéndose a lo largo de x (`rejillaX`, cada barrote corre en z) o de z (`rejillaZ`),
 * según corra la calle. Lo lee `materia/familias/fundicion.ts`.
 */
export const PIEZA_DE_FUNDICION = { tapa: 0, rejillaX: 1, registro: 2, marco: 3, reja: 4, rejillaZ: 5 } as const;
/** El paso de la `u` entre dos piezas. */
export const U_DE_LA_PIEZA = 10;

/** Lo más alto que escribe este fichero, contando la acera (la franja de andar empieza en 0,2). */
export const TECHO_DEL_SUELO = 0.2;

/**
 * Lo menos que se separa del suelo que pisa una cara plana de aquí (una rejilla, un registro, la reja de un alcorque,
 * el pie de una rampa). Con `near` 0,1 y 24 bits de profundidad, el paso de la profundidad a d metros es unos
 * d² / 1,7·10⁶: 3 mm se pierden hacia los 70 m y la cara parpadea con el suelo; 8 mm aguantan hasta unos 115.
 */
const SOBRE_EL_SUELO = 0.008;

const COLOR_DE_LA_TAPA = lineal(0x4a4845);
const COLOR_DEL_MARCO = lineal(0x42403d);
const COLOR_DE_LA_REJILLA = lineal(0x3a3936);
const COLOR_DEL_REGISTRO = lineal(0x4d4a45);
/** El hormigón de la rampa, del tono de la rigola mojada (el mobiliario no se oscurece con la lluvia). */
const COLOR_DE_LA_RAMPA = lineal(0x51504c);

/* ═══════════════════════════════ LAS CARAS ═══════════════════════════════ */

function restar(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cruz(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/**
 * UNA CARA PLANA Y CONVEXA con la normal `n`: el sentido de los triángulos sale de `n` (si el orden de los puntos
 * lo da al revés, se da la vuelta), así que ninguna cara de aquí puede quedar al revés. La UV de cada punto, la
 * que se le dé.
 */
function cara(mo: Molde, puntos: readonly V3[], n: V3, uvs: readonly (readonly [number, number])[]): void {
  const [p0, p1, p2] = puntos as readonly [V3, V3, V3];
  const c = cruz(restar(p1, p0), restar(p2, p0));
  const alReves = c[0] * n[0] + c[1] * n[1] + c[2] * n[2] < 0;
  const k = puntos.map((p, i) => {
    const uv = uvs[i] as readonly [number, number];
    return mo.vertice(p[0], p[1], p[2], n[0], n[1], n[2], uv[0], uv[1]);
  });
  for (let i = 1; i + 1 < k.length; i++) {
    if (alReves) mo.tri(k[0] as number, k[i + 1] as number, k[i] as number);
    else mo.tri(k[0] as number, k[i] as number, k[i + 1] as number);
  }
}

/** Una cara horizontal hacia arriba, con la UV de su pieza (metros desde `centro`). */
function arriba(mo: Molde, puntos: readonly V3[], pieza: number, cx: number, cz: number): void {
  cara(
    mo,
    puntos,
    [0, 1, 0],
    puntos.map((p) => [U_DE_LA_PIEZA * pieza + p[0] - cx, p[2] - cz] as const),
  );
}

/** Un rectángulo horizontal (x0..x1, z0..z1) a la altura y. */
function rectangulo(mo: Molde, x0: number, z0: number, x1: number, z1: number, y: number, pieza: number, cx: number, cz: number): void {
  arriba(mo, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], pieza, cx, cz);
}

/** Los cuatro cantos de un rectángulo, de y0 a y1, hacia fuera (o hacia dentro, si `dentro`). */
function cantos(mo: Molde, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, pieza: number, dentro = false): void {
  const s = dentro ? -1 : 1;
  const u = U_DE_LA_PIEZA * pieza;
  cara(mo, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [0, 0, -s], [[u, y0], [u + x1 - x0, y0], [u + x1 - x0, y1], [u, y1]]);
  cara(mo, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, s], [[u, y0], [u + x1 - x0, y0], [u + x1 - x0, y1], [u, y1]]);
  cara(mo, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-s, 0, 0], [[u, y0], [u + z1 - z0, y0], [u + z1 - z0, y1], [u, y1]]);
  cara(mo, [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], [s, 0, 0], [[u, y0], [u + z1 - z0, y0], [u + z1 - z0, y1], [u, y1]]);
}

/** Los puntos de un círculo de `lados` a la altura y. */
function circulo(cx: number, cz: number, r: number, y: number, lados: number): V3[] {
  const p: V3[] = [];
  for (let k = 0; k < lados; k++) {
    const a = (k / lados) * Math.PI * 2;
    p.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]);
  }
  return p;
}

/** Un anillo horizontal de r0 a r1 (hacia arriba), de `lados` trozos: 2·lados triángulos. */
function anillo(mo: Molde, cx: number, cz: number, r0: number, r1: number, y: number, lados: number, pieza: number): void {
  const a = circulo(cx, cz, r0, y, lados);
  const b = circulo(cx, cz, r1, y, lados);
  for (let k = 0; k < lados; k++) {
    const j = (k + 1) % lados;
    arriba(mo, [a[k] as V3, b[k] as V3, b[j] as V3, a[j] as V3], pieza, cx, cz);
  }
}

/** El canto de un cilindro de radio r, de y0 a y1, hacia fuera (o hacia dentro): 2·lados triángulos. */
function cantoRedondo(mo: Molde, cx: number, cz: number, r: number, y0: number, y1: number, lados: number, pieza: number, dentro = false): void {
  const s = dentro ? -1 : 1;
  for (let k = 0; k < lados; k++) {
    const a0 = (k / lados) * Math.PI * 2;
    const a1 = ((k + 1) / lados) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const p0: V3 = [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r];
    const p1: V3 = [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r];
    const u0 = U_DE_LA_PIEZA * pieza + a0 * r;
    const u1 = U_DE_LA_PIEZA * pieza + a1 * r;
    cara(mo, [p0, p1, [p1[0], y1, p1[2]], [p0[0], y1, p0[2]]], [s * Math.cos(am), 0, s * Math.sin(am)], [[u0, y0], [u1, y0], [u1, y1], [u0, y1]]);
  }
}

/* ═══════════════════════════════ LAS PIEZAS ═══════════════════════════════ */

/** El acabado de una pieza de fundición: la familia en N1+, lo liso de siempre en N0 (ver la cabecera). */
function deFundicion(nivel: NivelDeLaCiudad, rug: number, metal: number): readonly [number, number] {
  return nivel === 0 ? [rug, metal] : acabado(FAMILIA.fundicion, rug, metal);
}

/**
 * UNA TAPA DE ALCANTARILLA en (x, z) sobre el asfalto. En N0 la de siempre (el cilindro con sus dos caras), con otro
 * albedo; en N1+ por el grado (ver la cabecera).
 */
function tapa(obra: ObraDeLaCelda, x: number, z: number): void {
  const mo = obra.m.mobiliario;
  if (obra.nivel === 0) {
    tono(mo, COLOR_DE_LA_TAPA, ACABADO.hierroViejo);
    mo.cilindro(x, z, 0, 0.015, 0.36, 0.34, Math.max(8, obra.lados + 2), true);
    return;
  }
  const g = obra.grado;
  if (g === 1) {
    tono(mo, COLOR_DE_LA_TAPA, deFundicion(obra.nivel, 0.55, 0.45));
    arriba(mo, circulo(x, z, 0.36, 0.015, 10), PIEZA_DE_FUNDICION.tapa, x, z);
    cantoRedondo(mo, x, z, 0.36, 0, 0.015, 10, PIEZA_DE_FUNDICION.tapa);
    return;
  }
  /* g2 con 9 lados (43 triángulos); g3 con 14, que a metro y medio ya no se ve el polígono (68). */
  const lados = g === 2 ? 9 : 14;
  /* La tapa, un pelo más baja que su marco (el escalón de 5 mm no lleva cara: es la junta oscura de alrededor). */
  tono(mo, COLOR_DE_LA_TAPA, deFundicion(obra.nivel, 0.55, 0.45));
  arriba(mo, circulo(x, z, 0.33, 0.012, lados), PIEZA_DE_FUNDICION.tapa, x, z);
  tono(mo, COLOR_DEL_MARCO, deFundicion(obra.nivel, 0.6, 0.4));
  anillo(mo, x, z, 0.33, 0.4, 0.017, lados, PIEZA_DE_FUNDICION.marco);
  cantoRedondo(mo, x, z, 0.4, 0, 0.017, lados, PIEZA_DE_FUNDICION.marco);
}

/**
 * UNA PIEZA RECTANGULAR DE FUNDICIÓN a ras de suelo (la rejilla de un imbornal, un registro): la caja
 * (x0..x1, z0..z1) sobre el suelo `base`, con su marco de `ancho` en g2+ y hundida en él en g3.
 */
function rectangular(obra: ObraDeLaCelda, c: CajaXZ, base: number, pieza: number, color: readonly [number, number, number], rug: number, metal: number): void {
  const mo = obra.m.mobiliario;
  const cx = (c.x0 + c.x1) / 2;
  const cz = (c.z0 + c.z1) / 2;
  const g = obra.nivel === 0 ? 1 : obra.grado;
  if (g === 1) {
    tono(mo, color, deFundicion(obra.nivel, rug, metal));
    rectangulo(mo, c.x0, c.z0, c.x1, c.z1, base + SOBRE_EL_SUELO, pieza, cx, cz);
    return;
  }
  /* El marco, 4 mm por encima de la pieza hundida de g3, que así queda a SOBRE_EL_SUELO. */
  const alto = base + SOBRE_EL_SUELO + 0.004;
  if (g === 2) {
    tono(mo, color, deFundicion(obra.nivel, rug, metal));
    rectangulo(mo, c.x0, c.z0, c.x1, c.z1, alto, pieza, cx, cz);
    tono(mo, COLOR_DEL_MARCO, deFundicion(obra.nivel, 0.6, 0.4));
    cantos(mo, c.x0, c.z0, c.x1, c.z1, base, alto, PIEZA_DE_FUNDICION.marco);
    return;
  }
  /* g3: el marco de 3 cm alrededor y la pieza 4 mm por debajo de él. */
  const m = 0.03;
  tono(mo, COLOR_DEL_MARCO, deFundicion(obra.nivel, 0.6, 0.4));
  rectangulo(mo, c.x0, c.z0, c.x1, c.z0 + m, alto, PIEZA_DE_FUNDICION.marco, cx, cz);
  rectangulo(mo, c.x0, c.z1 - m, c.x1, c.z1, alto, PIEZA_DE_FUNDICION.marco, cx, cz);
  rectangulo(mo, c.x0, c.z0 + m, c.x0 + m, c.z1 - m, alto, PIEZA_DE_FUNDICION.marco, cx, cz);
  rectangulo(mo, c.x1 - m, c.z0 + m, c.x1, c.z1 - m, alto, PIEZA_DE_FUNDICION.marco, cx, cz);
  cantos(mo, c.x0, c.z0, c.x1, c.z1, base, alto, PIEZA_DE_FUNDICION.marco);
  cantos(mo, c.x0 + m, c.z0 + m, c.x1 - m, c.z1 - m, alto - 0.004, alto, PIEZA_DE_FUNDICION.marco, true);
  tono(mo, color, deFundicion(obra.nivel, rug, metal));
  rectangulo(mo, c.x0 + m, c.z0 + m, c.x1 - m, c.z1 - m, alto - 0.004, pieza, cx, cz);
}

/**
 * Las alcantarillas: tapas redondas junto al eje de cada tramo de calzada y rejillas en la rigola, contra el
 * bordillo. Van a 1,5 cm sobre el asfalto (una tapa de verdad sobresale un poco, y así no parpadea). Devuelve las
 * bocas (para el vapor). Cede después de cada pareja de tapa y rejilla.
 */
export function* alcantarillas(obra: ObraDeLaCelda, t: TapasDeLasCalles): Generator<void, { x: number; z: number }[], void> {
  const { calles, limite } = t;
  const salida: { x: number; z: number }[] = [];
  for (const c of calles) {
    for (let s = c.desde + 11; s < c.hasta - 5; s += 24) {
      const cruza = calles.some((o) => o.corre !== c.corre && Math.abs(s - o.en) < o.calzada / 2 + o.acera + 2);
      if (cruza) continue;
      const lado = azarEn(Math.round(s * 4), Math.round(c.en * 4)) < 0.5 ? -1 : 1;
      const x = c.corre === 'z' ? c.en + lado * 0.9 : s;
      const z = c.corre === 'z' ? s : c.en + lado * 0.9;
      if (x < limite.x0 || x > limite.x1 || z < limite.z0 || z > limite.z1) continue;
      tapa(obra, x, z);
      salida.push({ x, z });
      /* La rejilla del imbornal, en la rigola: pegada al bordillo, 0,7 m a lo largo y 0,36 de través (en N0, donde
         siempre). */
      const r = c.calzada / 2 - (obra.nivel === 0 ? 0.25 : 0.2);
      const gx = c.corre === 'z' ? c.en - lado * r : s + 3;
      const gz = c.corre === 'z' ? s + 3 : c.en - lado * r;
      if (obra.nivel === 0) {
        tono(obra.m.mobiliario, COLOR_DE_LA_REJILLA, ACABADO.hierroViejo);
        if (c.corre === 'z') obra.m.mobiliario.caja(gx - 0.18, 0, gz - 0.35, gx + 0.18, 0.012, gz + 0.35, 'a');
        else obra.m.mobiliario.caja(gx - 0.35, 0, gz - 0.18, gx + 0.35, 0.012, gz + 0.18, 'a');
      } else {
        const caja = c.corre === 'z' ? { x0: gx - 0.18, z0: gz - 0.35, x1: gx + 0.18, z1: gz + 0.35 } : { x0: gx - 0.35, z0: gz - 0.18, x1: gx + 0.35, z1: gz + 0.18 };
        /* Los barrotes, de través a la calle (la rueda de una bici no cae en la ranura): se suceden a lo largo de ella. */
        rectangular(obra, caja, 0, c.corre === 'z' ? PIEZA_DE_FUNDICION.rejillaZ : PIEZA_DE_FUNDICION.rejillaX, COLOR_DE_LA_REJILLA, 0.65, 0.4);
      }
      yield;
    }
  }
  yield;
  return salida;
}

/** Un vado: la caja de la rampa en planta y hacia dónde queda el bordillo (el lado alto). */
export interface VadoDeLaCalle {
  readonly caja: CajaXZ;
  /** El lado de la caja pegado al bordillo, a la cota de la acera. */
  readonly alto: 'x0' | 'x1' | 'z0' | 'z1';
}

/**
 * LOS VADOS DE UNAS CALLES cuyo centro cae en `limite`: en cada tramo de 10 m o más entre dos cruces (la cebra del
 * asfalto sólo se pinta en ésos), una rampa en cada bordillo de cada boca. Los cruces de una calle son las calzadas
 * de las calles que la cortan; las avenidas van en sus dos calzadas, así que el paso por la mediana lleva rampa en
 * los dos bordillos de la mediana.
 */
export function vadosDeLasCalles(calles: readonly CalleDelPlano[], limite: CajaXZ): VadoDeLaCalle[] {
  const salida: VadoDeLaCalle[] = [];
  for (const c of calles) {
    /*
     * Si la calle es una calzada de avenida, hacia su pareja está la MEDIANA, que no llega a la punta de la avenida
     * cuando ésta empieza dentro de la ciudad (el Bulevar, en el Elevado): empieza 12 m después (`islasDeLaCiudad`,
     * `lejos.ts`). Ahí no hay bordillo, y una rampa contra nada flotaría.
     */
    const pareja = calles.find((o) => o !== c && o.corre === c.corre && Math.abs(Math.abs(o.en - c.en) - (MEDIANA_DE_AVENIDA + CALZADA_DE_AVENIDA)) < 0.01 && o.desde === c.desde && o.hasta === c.hasta);
    const haciaLaMediana = pareja === undefined ? 0 : Math.sign(pareja.en - c.en);
    const empiezaLaMediana = Math.abs(c.desde) < BORDE_DE_LA_CIUDAD - 1 ? c.desde + 12 : -Infinity;
    const cruces: [number, number][] = [];
    for (const o of calles) {
      if (o.corre === c.corre) continue;
      if (c.en < o.desde - 0.01 || c.en > o.hasta + 0.01 || o.en < c.desde - 0.01 || o.en > c.hasta + 0.01) continue;
      cruces.push([o.en - o.calzada / 2, o.en + o.calzada / 2]);
    }
    cruces.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k + 1 < cruces.length; k++) {
      const g0 = (cruces[k] as [number, number])[1];
      const g1 = (cruces[k + 1] as [number, number])[0];
      if (g1 - g0 < 10) continue;
      for (const [a0, a1] of [
        [g0 + VADO.desde, g0 + VADO.hasta],
        [g1 - VADO.hasta, g1 - VADO.desde],
      ] as const) {
        for (const lado of [-1, 1] as const) {
          if (lado === haciaLaMediana && a0 < empiezaLaMediana) continue;
          const bordillo = c.en + (lado * c.calzada) / 2;
          const frente = bordillo - lado * VADO.fondo;
          const t0 = Math.min(bordillo, frente);
          const t1 = Math.max(bordillo, frente);
          const caja = c.corre === 'x' ? { x0: a0, z0: t0, x1: a1, z1: t1 } : { x0: t0, z0: a0, x1: t1, z1: a1 };
          const alto = c.corre === 'x' ? (lado > 0 ? 'z1' : 'z0') : lado > 0 ? 'x1' : 'x0';
          const mx = (caja.x0 + caja.x1) / 2;
          const mz = (caja.z0 + caja.z1) / 2;
          if (mx < limite.x0 || mx >= limite.x1 || mz < limite.z0 || mz >= limite.z1) continue;
          if (Math.abs(mx) >= BORDE_DE_LA_CIUDAD || Math.abs(mz) >= BORDE_DE_LA_CIUDAD) continue;
          salida.push({ caja, alto });
        }
      }
    }
  }
  return salida;
}

/** La cota de la rampa pegada al bordillo (un milímetro sobre la acera: sin rendija) y la del frente (sin parpadeo). */
const ALTO_DE_LA_RAMPA = ALTURA_DE_LA_ACERA + 0.001;
const PIE_DE_LA_RAMPA = SOBRE_EL_SUELO;

/** UNA RAMPA DE VADO: la cara de arriba inclinada y los dos costados (4 triángulos). */
function rampa(obra: ObraDeLaCelda, v: VadoDeLaCalle): void {
  const mo = obra.m.mobiliario;
  const { x0, z0, x1, z1 } = v.caja;
  tono(mo, COLOR_DE_LA_RAMPA, obra.nivel === 0 ? ACABADO.hormigon : acabado(FAMILIA.hormigon, ACABADO.hormigon[0], ACABADO.hormigon[1]));
  /* El alto (a lo largo del bordillo) y el bajo (en la calzada), con los dos extremos del bordillo. */
  const enX = v.alto === 'x0' || v.alto === 'x1';
  const tAlto = v.alto === 'x0' ? x0 : v.alto === 'x1' ? x1 : v.alto === 'z0' ? z0 : z1;
  const tBajo = v.alto === 'x0' ? x1 : v.alto === 'x1' ? x0 : v.alto === 'z0' ? z1 : z0;
  const [a0, a1] = enX ? [z0, z1] : [x0, x1];
  const punto = (t: number, a: number, y: number): V3 => (enX ? [t, y, a] : [a, y, t]);
  const pA0 = punto(tAlto, a0, ALTO_DE_LA_RAMPA);
  const pA1 = punto(tAlto, a1, ALTO_DE_LA_RAMPA);
  const pB0 = punto(tBajo, a0, PIE_DE_LA_RAMPA);
  const pB1 = punto(tBajo, a1, PIE_DE_LA_RAMPA);
  /* La normal de arriba: sube hacia el bordillo. */
  const pendiente = (ALTO_DE_LA_RAMPA - PIE_DE_LA_RAMPA) / VADO.fondo;
  const haciaBajo = Math.sign(tBajo - tAlto);
  const nLargo = pendiente * haciaBajo;
  const k = 1 / Math.hypot(nLargo, 1);
  const n: V3 = enX ? [nLargo * k, k, 0] : [0, k, nLargo * k];
  const uv = (p: V3): readonly [number, number] => [p[0], p[2]];
  cara(mo, [pA0, pA1, pB1, pB0], n, [uv(pA0), uv(pA1), uv(pB1), uv(pB0)]);
  /* Los costados: un triángulo vertical en cada extremo, hacia fuera. En N0 no (quince centímetros de canto que en
     un teléfono no se ven; así el vado cabe en sus 300 triángulos de la ventana). */
  if (obra.nivel === 0) return;
  for (const [a, fuera] of [
    [a0, -1],
    [a1, 1],
  ] as const) {
    const pie = punto(tAlto, a, 0);
    const alto = punto(tAlto, a, ALTO_DE_LA_RAMPA);
    const bajo = punto(tBajo, a, PIE_DE_LA_RAMPA);
    const nc: V3 = enX ? [0, 0, fuera] : [fuera, 0, 0];
    cara(mo, [pie, alto, bajo], nc, [
      [a, 0],
      [a, ALTO_DE_LA_RAMPA],
      [a + VADO.fondo, PIE_DE_LA_RAMPA],
    ]);
  }
}

/**
 * LOS REGISTROS DE SERVICIOS (N1+): la arqueta del alumbrado junto a algunas farolas, a 0,6 m de su pie a lo largo
 * del bordillo, de 0,4 o 0,5 m, sobre la acera.
 */
function registroDeLaFarola(f: FarolaDelPlano): CajaXZ | null {
  const semilla = [Math.round(f.x * 4), Math.round(f.z * 4)] as const;
  if (azarEn(semilla[0], semilla[1], 71) > 0.55) return null;
  const aLoLargoDeX = f.brazo === null || f.brazo === 'n' || f.brazo === 's';
  const lado = azarEn(semilla[0], semilla[1], 72) < 0.5 ? -1 : 1;
  const medio = azarEn(semilla[0], semilla[1], 73) < 0.5 ? 0.2 : 0.25;
  const cx = f.x + (aLoLargoDeX ? lado * (0.4 + medio) : 0);
  const cz = f.z + (aLoLargoDeX ? 0 : lado * (0.4 + medio));
  return { x0: cx - medio, z0: cz - medio, x1: cx + medio, z1: cz + medio };
}

/** EL ALCORQUE de un tronco (N1+): 1,2 × 1,2 m, el cerco de granito y la reja de fundición dentro. */
function alcorque(obra: ObraDeLaCelda, t: CajaXZ): void {
  const mo = obra.m.mobiliario;
  const cx = (t.x0 + t.x1) / 2;
  const cz = (t.z0 + t.z1) / 2;
  const m = 0.6;
  const b = 0.08;
  const suelo = ALTURA_DE_LA_ACERA;
  const cerco = suelo + 0.012;
  tono(mo, GRANITO, acabado(FAMILIA.piedra, 0.7, 0));
  const x0 = cx - m;
  const x1 = cx + m;
  const z0 = cz - m;
  const z1 = cz + m;
  rectangulo(mo, x0, z0, x1, z0 + b, cerco, 0, cx, cz);
  rectangulo(mo, x0, z1 - b, x1, z1, cerco, 0, cx, cz);
  rectangulo(mo, x0, z0 + b, x0 + b, z1 - b, cerco, 0, cx, cz);
  rectangulo(mo, x1 - b, z0 + b, x1, z1 - b, cerco, 0, cx, cz);
  if (obra.grado >= 2) {
    cantos(mo, x0, z0, x1, z1, suelo, cerco, 0);
    cantos(mo, x0 + b, z0 + b, x1 - b, z1 - b, suelo + SOBRE_EL_SUELO, cerco, 0, true);
  }
  tono(mo, COLOR_DE_LA_REJILLA, acabado(FAMILIA.fundicion, 0.7, 0.35));
  rectangulo(mo, x0 + b, z0 + b, x1 - b, z1 - b, suelo + SOBRE_EL_SUELO, PIEZA_DE_FUNDICION.reja, cx, cz);
}

/**
 * EL SUELO DE UNA CELDA (el escritor de su familia, ver `celdas.ts`): las tapas de sus medias calles (y sus bocas a
 * la obra), los vados de sus bocas de cebra y, desde N1, los registros junto a sus farolas y los alcorques de sus
 * troncos.
 */
export function* sueloDeLaCelda(obra: ObraDeLaCelda, parte: ParteDeLaCelda): Generator<void, void, void> {
  const bocas = yield* alcantarillas(obra, { calles: obra.ciudad.calles, limite: parte.caja });
  for (const b of bocas) if (Math.abs(b.x) < BORDE_DE_LA_CIUDAD && Math.abs(b.z) < BORDE_DE_LA_CIUDAD) obra.bocas.push(b);
  for (const v of vadosDeLasCalles(obra.ciudad.calles, parte.caja)) {
    rampa(obra, v);
    yield;
  }
  if (obra.nivel === 0) return;
  for (const f of parte.farolas) {
    const c = registroDeLaFarola(f);
    if (c === null) continue;
    rectangular(obra, c, ALTURA_DE_LA_ACERA, PIEZA_DE_FUNDICION.registro, COLOR_DEL_REGISTRO, 0.6, 0.35);
    yield;
  }
  for (const t of parte.troncos) {
    alcorque(obra, t);
    yield;
  }
}
