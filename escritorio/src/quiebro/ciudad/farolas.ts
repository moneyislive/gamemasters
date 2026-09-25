/**
 * LAS FAROLAS: la de calle (basa, fuste, brazo sobre la calzada y campana con su vidrio), la de plaza (pedestal,
 * fuste y farol de seis caras) y la de pared (ménsula en la fachada y farol de cuatro caras, sin caja). Cada una es
 * un escritor de pieza (`EscritorDePieza` de `celdas.ts`): escribe en los moldes de su obra, cede y devuelve su luz.
 *
 * ═══ LA LUZ NO SE MUEVE ═══
 *
 * La luz que devuelve cada farola alimenta la luz horneada de la calle, los halos, las tarjetas de reflejo y las
 * luces de verdad de N2+. Tiene que salir en el MISMO sitio en todos los grados: la luz de las celdas de fuera de
 * la ventana se saca en grado 1 (`fuentesDeLaCelda`), y si la cabeza subiera con el grado, el halo se quedaría
 * colgando debajo de la farola. Por eso la luz se devuelve con las cuentas de siempre (las de `d4402d0`), y la
 * cabeza se dibuja ALREDEDOR de ella: el vidrio de la campana envuelve la luz de la calle, el farol de la plaza
 * la lleva en su centro y el de la pared, un palmo por debajo del tejadillo. Lo vigila
 * `scripts/quiebro-ciudad/piezas.ts` (a), a ±1 cm y en cada grado.
 *
 * ═══ FUNDICIÓN PINTADA, NO HIERRO NEGRO ═══
 *
 * Hasta la ola 2 las farolas eran «hierro» casi negro (0x16191a, un 0,8 % de albedo) con metal 0,7: la difusa se
 * quedaba en el 0,24 % y el poste de la foto M, a 3 m, salía negro puro entero. Una farola es fundición PINTADA: la
 * pintura no es metal (metal 0), y un verde carruaje o un negro de farola tienen un 3-5 % de albedo. Va en la
 * familia `hierro` de la materia (`acabado`), que es la que le pone el desconchón y el óxido; sin marca de chaflán
 * ni de barniz, que el material de hoy no sabe leer (ver `FUNDICION_PINTADA`).
 *
 * ═══ EL GRADO, Y LA HECHURA ═══
 *
 * La silueta sube con el grado de la celda (plan del detalle, §3.1), dentro de sus topes (farola de calle
 * 90 / 260 / 500 triángulos, de plaza 110 / 300 / 600, de pared 60 / 120 / 200). Pero el libro de N2 da 7.000
 * triángulos de más a TODA la ventana, y en su bloque de 2 × 2 celdas de grado 3 caben 35 farolas de calle y 60 de
 * pared: con el grado 3 de N3 no cabía (se medían 16.000). Así que cada pieza se escribe por su HECHURA
 * (`hechuraDe`): el grado, salvo el 3 de N2, que se queda a medio camino. El nivel no cambia al recentrar la
 * ventana, así que la hechura cambia donde cambia el grado, nunca a los pies (§3.1).
 *
 *   · 1, el grado 1 (N0 y N1): los mismos triángulos que antes o menos, repartidos mejor (y siete lados como mucho:
 *     con los 8 de N1 no cabían en los topes de grado 1): basa en torno que se estrecha hasta el fuste, brazo curvo
 *     y campana (la de calle); pedestal en tres cuerpos, fuste y farol con tejadillo (la de plaza); brazo,
 *     tornapuntas y farol con tejadillo (la de pared). Lo emisivo, lo mismo que antes (N0 y N1 no pagan vidrio).
 *   · 2, el grado 2 (N2 y N3, y el barrio viejo de N2 y N3): basa con molduras, fuste con su anillo y vidrio en
 *     cuenco de 8 lados de un solo tramo (8 triángulos: el barrio pinta hasta 66 farolas de calle y su renglón de
 *     luces no da para más); en la de plaza, collar, fuste acanalado PINTADO (las normales del torno se tuercen por
 *     sectores: el sombreador ve estrías que la geometría no tiene) y montantes en el farol; en la de pared, remate
 *     encima del tejadillo.
 *   · 3, el grado 3 de N2: además, la puerta del registro, el tirante del brazo, la campana de perfil y el cuenco
 *     con su panza; en la de plaza, el collar y el capitel con más perfil; en la de pared, el alero del tejadillo.
 *   · 4, el grado 3 de N3: la voluta del brazo, el remate del fuste y el vidrio en ampolla; en la de plaza,
 *     pedestal con moldura corrida y cornisa biselada, fuste acanalado DE VERDAD, la barra de la escalera del
 *     farolero y el farol con sus seis montantes y remate de latón; en la de pared, la voluta, la placa del muro y
 *     los montantes.
 *
 * Por debajo de 1,9 m todo cabe en la caja de 0,5 × 0,5 de la farola (la franja de andar). El vidrio lleva en
 * `aEmisor.y` su coordenada radial (0 en la lámpara, 1 en el marco: el contrato con O4-SEMAFOROS) y un color que
 * se enfría hacia el marco; donde el vidrio no tiene vértice en la lámpara (hechuras 1-3 de los faroles), todo él es
 * marco (1).
 */
import type { Molde, P2, V3 } from './geometria';
import { acabado, FAMILIA } from './materia/familias';
import { lineal } from './materiales';
import type { LuzDelMobiliario, Rgb } from './mobiliario';
import { H, SODIO_HDR, colocar, tono } from './mobiliario';
import { normalDe } from './fachadas';
import type { FarolaDelPlano, NivelDeLaCiudad, GradoDeLaCelda, Orientacion } from './tipos';
import type { LamparaDePared, ObraDeLaCelda } from './celdas';

/* ═══════════════════════════════ LA HECHURA ═══════════════════════════════ */

/** Cuánto oficio lleva una pieza (ver la cabecera): 1-2 los grados 1 y 2, 3 el grado 3 de N2 y 4 el de N3. */
export type Hechura = 1 | 2 | 3 | 4;

/** La hechura de una pieza por el grado de su celda y su nivel (ver la cabecera). */
export function hechuraDe(obra: { readonly grado: GradoDeLaCelda; readonly nivel: NivelDeLaCiudad }): Hechura {
  if (obra.grado === 1) return 1;
  if (obra.grado === 2) return 2;
  return obra.nivel >= 3 ? 4 : 3;
}

/* ═══════════════════════════════ LA MATERIA DE LAS FAROLAS ═══════════════════════════════ */

/**
 * LA FUNDICIÓN PINTADA: familia `hierro`, rugosidad de pintura satinada y SIN metal (la pintura no lo es: el metal
 * lo enseña la familia donde se desconcha). Sin la marca de chaflán: el material del mobiliario de hoy lee
 * `aAcabado` tal cual, y con la marca el metal valdría 4 y la difusa saldría negativa (ver `materia/familias.ts`).
 */
export const FUNDICION_PINTADA: readonly [number, number] = acabado(FAMILIA.hierro, 0.5, 0);
/** El latón viejo de los remates de la hechura 4: metal de verdad, liso (la familia `hierro` le pondría pintura). */
export const LATON_VIEJO: readonly [number, number] = acabado(FAMILIA.liso, 0.4, 0.8);

/** El negro de farola de las de calle y de pared: un 3 % de albedo, no el 0,8 % del hierro de antes. */
export const NEGRO_DE_FAROLA: Rgb = lineal(0x2c302e);
/** El verde carruaje de las de plaza. */
export const VERDE_DE_FAROLA: Rgb = lineal(0x2a3d32);
/** La mugre del pie: el primer palmo de todo lo que pisa la acera, un poco más oscuro. */
const MUGRE = 0.72;
const LATON: Rgb = lineal(0x6b5a34);

/** Un color por un factor. */
export function por(c: Rgb, f: number): Rgb {
  return [c[0] * f, c[1] * f, c[2] * f];
}

/* ═══════════════════════════════ EL TORNO A MANO ═══════════════════════════════ */

/** Un punto del contorno de `tornear`: el de `Molde.torno` (r, y) más lo que lleva su anillo. */
export interface AnilloDelTorno {
  readonly r: number;
  readonly y: number;
  /** El color de los vértices de su anillo (lineal; en lo emisivo, HDR). Sin él, el color actual del molde. */
  readonly color?: Rgb;
  /** En lo emisivo, la coordenada radial del vidrio para `aEmisor.y`: 0 en la lámpara, 1 en el marco. */
  readonly radial?: number;
}

export interface OpcionesDelTorno {
  /** Dónde empieza el primer sector (radianes): un torno de 6 con `π/6` pone una cara mirando a cada eje. */
  readonly giro?: number;
  /** El radio del sector k, relativo (1 = el del contorno): las estrías de verdad del fuste acanalado. */
  readonly radioDelSector?: (k: number) => number;
  /**
   * Cuánto se tuerce la normal del sector k hacia su tangente (la de crecer el ángulo): el acanalado PINTADO. Con
   * estrías de verdad, la inclinación de sus paredes.
   */
  readonly torsionDelSector?: (k: number) => number;
  /** El tipo de lo emisivo (`aEmisor.x`): el torno escribe entonces `aEmisor` en cada anillo. */
  readonly emisor?: number;
  /** Un disco en el primer punto, mirando abajo (el bajo de una campana). */
  readonly tapaAbajo?: boolean;
  /** Un disco en el último punto, mirando arriba. */
  readonly tapaArriba?: boolean;
}

/** El ángulo por debajo del cual dos tramos seguidos del contorno comparten normal (el de `Molde.torno`). */
const SUAVE = Math.PI / 4;

/**
 * UN TORNO A MANO: la superficie de revolución del contorno alrededor del eje vertical por (cx, cz), en `lados`
 * sectores, con el MISMO sentido de los triángulos que `Molde.torno` (lo vigila `verify:quiebro-molde`, y aquí las
 * caras al revés de `verify:quiebro-ciudad`, 2) y sus mismas normales de contorno (suaves entre tramos que se
 * tuercen menos de 45°, vivas si no). Lo que añade: cada anillo con su color (la mugre del pie, la corteza más
 * oscura abajo, el vidrio más caliente en la lámpara) y, en lo emisivo, su `aEmisor`; y los sectores con su radio y
 * su normal torcida (el acanalado). Triángulos: 2·lados por tramo, `lados` si un extremo está en el eje, y
 * `lados` por tapa. Escribe con `vertice` y `tri`, así que vale en `MoldeQueNoGuarda`.
 */
export function tornear(m: Molde, cx: number, cz: number, anillos: readonly AnilloDelTorno[], lados: number, o: OpcionesDelTorno = {}): void {
  const n = anillos.length;
  if (n < 2 || lados < 3) return;
  let radioDeU = 0;
  for (const a of anillos) radioDeU = Math.max(radioDeU, a.r);
  if (radioDeU <= 1e-6) return;
  const giro = o.giro ?? 0;
  const paso = (Math.PI * 2) / lados;
  /* La normal de cada tramo, (dy, −dr) normalizada: la de la derecha de quien sube por fuera. */
  const tr: number[] = [];
  const ty: number[] = [];
  const largo: number[] = [];
  for (let s = 0; s < n - 1; s++) {
    const a = anillos[s] as AnilloDelTorno;
    const b = anillos[s + 1] as AnilloDelTorno;
    const dr = b.r - a.r;
    const dy = b.y - a.y;
    const l = Math.hypot(dr, dy);
    largo.push(l);
    tr.push(l > 1e-9 ? dy / l : 0);
    ty.push(l > 1e-9 ? -dr / l : 0);
  }
  /* La normal en el extremo `lado` (0 abajo, 1 arriba) del tramo s: promediada con la del vecino si la unión es suave. */
  const normalEn = (s: number, lado: 0 | 1): [number, number] => {
    const v = lado === 0 ? s - 1 : s + 1;
    const nr = tr[s] as number;
    const ny = ty[s] as number;
    if (v < 0 || v >= n - 1 || (largo[v] as number) < 1e-9) return [nr, ny];
    const vr = tr[v] as number;
    const vy = ty[v] as number;
    if (nr * vr + ny * vy < Math.cos(SUAVE)) return [nr, ny];
    const l = Math.hypot(nr + vr, ny + vy) || 1;
    return [(nr + vr) / l, (ny + vy) / l];
  };
  const y0 = (anillos[0] as AnilloDelTorno).y;
  let recorrido = 0;
  const anillo = (a: AnilloDelTorno, normal: [number, number], v: number, enElEje: boolean): number[] => {
    if (a.color !== undefined) m.color(a.color[0], a.color[1], a.color[2]);
    if (o.emisor !== undefined) m.poner('aEmisor', o.emisor, a.radial ?? 1);
    const lista: number[] = [];
    if (enElEje) {
      /* En el eje, un vértice por sector en su centro, con la normal y la u de su sector (como `Molde.torno`). */
      for (let k = 0; k < lados; k++) {
        const ang = giro + (k + 0.5) * paso;
        lista.push(m.vertice(cx, a.y, cz, normal[0] * Math.cos(ang), normal[1], normal[0] * Math.sin(ang), (k + 0.5) * paso * radioDeU, v));
      }
      return lista;
    }
    for (let k = 0; k <= lados; k++) {
      const kk = k % lados;
      const ang = giro + kk * paso;
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      const f = o.radioDelSector?.(kk) ?? 1;
      const t = o.torsionDelSector?.(kk) ?? 0;
      let nx = normal[0] * c - t * sn;
      let ny = normal[1];
      let nz = normal[0] * sn + t * c;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      lista.push(m.vertice(cx + c * a.r * f, a.y, cz + sn * a.r * f, nx, ny, nz, k * paso * radioDeU, v));
    }
    return lista;
  };
  for (let s = 0; s < n - 1; s++) {
    const l = largo[s] as number;
    const a0 = anillos[s] as AnilloDelTorno;
    const a1 = anillos[s + 1] as AnilloDelTorno;
    if (l < 1e-9) continue;
    const eje0 = a0.r <= 1e-6;
    const eje1 = a1.r <= 1e-6;
    if (eje0 && eje1) {
      recorrido += l;
      continue;
    }
    const abajo = anillo(a0, normalEn(s, 0), y0 + recorrido, eje0);
    recorrido += l;
    const arriba = anillo(a1, normalEn(s, 1), y0 + recorrido, eje1);
    for (let k = 0; k < lados; k++) {
      const a = abajo[k] as number;
      const d = arriba[k] as number;
      if (eje0) m.tri(a, d, arriba[k + 1] as number);
      else if (eje1) m.tri(a, d, abajo[k + 1] as number);
      else {
        m.tri(a, d, arriba[k + 1] as number);
        m.tri(a, arriba[k + 1] as number, abajo[k + 1] as number);
      }
    }
  }
  const disco = (a: AnilloDelTorno, arriba: boolean): void => {
    if (a.r <= 1e-6) return;
    if (a.color !== undefined) m.color(a.color[0], a.color[1], a.color[2]);
    if (o.emisor !== undefined) m.poner('aEmisor', o.emisor, a.radial ?? 1);
    const ny = arriba ? 1 : -1;
    const centro = m.vertice(cx, a.y, cz, 0, ny, 0, cx, cz);
    const borde: number[] = [];
    for (let k = 0; k < lados; k++) {
      const ang = giro + k * paso;
      const x = cx + Math.cos(ang) * a.r * (o.radioDelSector?.(k) ?? 1);
      const z = cz + Math.sin(ang) * a.r * (o.radioDelSector?.(k) ?? 1);
      borde.push(m.vertice(x, a.y, z, 0, ny, 0, x, z));
    }
    for (let k = 0; k < lados; k++) {
      const p = borde[k] as number;
      const q = borde[(k + 1) % lados] as number;
      if (arriba) m.tri(centro, q, p);
      else m.tri(centro, p, q);
    }
  };
  if (o.tapaAbajo === true) disco(anillos[0] as AnilloDelTorno, false);
  if (o.tapaArriba === true) disco(anillos[n - 1] as AnilloDelTorno, true);
}

/**
 * UN TUBO CON EL MARCO TRANSPORTADO: como `Molde.tubo` (la misma sección de `lados`, el mismo sentido de los
 * triángulos, sin tapas, y la UV de `u` alrededor y `v` a lo largo, en metros), pero el marco de cada anillo sale del
 * anterior girado lo justo (transporte paralelo) y no de «arriba». `Molde.tubo` lo rehace en cada punto desde la
 * vertical, y donde la tangente pasa por ella (el rizo de una voluta) el anillo da media vuelta: el tramo sale
 * retorcido y con caras al revés (lo vio `verify:quiebro-ciudad`, 2, en el rizo de la farola de pared). Los mismos
 * triángulos que `Molde.tubo`: 2·lados por tramo.
 */
export function tubo(m: Molde, puntos: readonly V3[], radio: number, lados: number): void {
  const np = puntos.length;
  if (np < 2 || lados < 3) return;
  /* La tangente de cada punto: la de sus dos vecinos. */
  const tangente = (i: number): V3 => {
    const a = puntos[Math.max(0, i - 1)] as V3;
    const b = puntos[Math.min(np - 1, i + 1)] as V3;
    const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    return [d[0] / l, d[1] / l, d[2] / l];
  };
  const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unidad = (a: V3): V3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  /* El primer marco, como el de `Molde.tubo`; los siguientes, el anterior proyectado sobre el plano de su tangente. */
  let t = tangente(0);
  let nor = unidad(cruz(t, Math.abs(t[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0]));
  let recorrido = 0;
  let anterior: number[] = [];
  for (let i = 0; i < np; i++) {
    const p = puntos[i] as V3;
    if (i > 0) {
      const q = puntos[i - 1] as V3;
      recorrido += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      t = tangente(i);
      const d = nor[0] * t[0] + nor[1] * t[1] + nor[2] * t[2];
      const proyectada: V3 = [nor[0] - d * t[0], nor[1] - d * t[1], nor[2] - d * t[2]];
      nor = Math.hypot(proyectada[0], proyectada[1], proyectada[2]) > 1e-6 ? unidad(proyectada) : unidad(cruz(t, Math.abs(t[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0]));
    }
    const bin = unidad(cruz(t, nor));
    const anillo: number[] = [];
    for (let k = 0; k <= lados; k++) {
      const a = (k / lados) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const nx = nor[0] * c + bin[0] * s;
      const ny = nor[1] * c + bin[1] * s;
      const nz = nor[2] * c + bin[2] * s;
      anillo.push(m.vertice(p[0] + nx * radio, p[1] + ny * radio, p[2] + nz * radio, nx, ny, nz, (k / lados) * radio * 6.283, recorrido));
    }
    if (i > 0) {
      for (let k = 0; k < lados; k++) {
        m.tri(anterior[k] as number, anterior[k + 1] as number, anillo[k + 1] as number);
        m.tri(anterior[k] as number, anillo[k + 1] as number, anillo[k] as number);
      }
    }
    anterior = anillo;
  }
}

/** Un contorno (r, y) subido a `y0`, con un color para todos sus anillos (o el del pie en el primero). */
function contorno(puntos: readonly P2[], y0: number, color?: Rgb, colorDelPie?: Rgb): AnilloDelTorno[] {
  return puntos.map(([r, y], i) => {
    const c = i === 0 && colorDelPie !== undefined ? colorDelPie : color;
    return c === undefined ? { r, y: y0 + y } : { r, y: y0 + y, color: c };
  });
}

/* ═══════════════════════════════ EL VIDRIO ═══════════════════════════════ */

/** El color del vidrio a una coordenada radial: la lámpara, más caliente; el marco, más frío. Media ≈ el de antes. */
function colorDelVidrio(base: Rgb, radial: number): Rgb {
  return por(base, 1.35 - 0.6 * radial);
}

/**
 * UN VIDRIO EN CUENCO para lo emisivo, colgado bajo una campana: anillos del marco a la lámpara, del borde de arriba
 * (radial 1) al fondo (radial 0, en el eje). Visto desde abajo y desde fuera, que es como se mira una farola.
 */
function vidrioEnCuenco(em: Molde, cx: number, cz: number, anillos: readonly { r: number; y: number; radial: number }[], lados: number, base: Rgb): void {
  /* De abajo arriba, como pide el torno: el fondo primero. */
  const deAbajo = [...anillos].sort((a, b) => a.y - b.y);
  tornear(
    em,
    cx,
    cz,
    deAbajo.map((a) => ({ r: a.r, y: a.y, radial: a.radial, color: colorDelVidrio(base, a.radial) })),
    lados,
    { emisor: 1 },
  );
}

/**
 * UN PAÑO DE VIDRIO con su centro (hechura 4): cuatro triángulos alrededor de un vértice en medio del paño (radial
 * 0), con las esquinas en el marco (radial 1). `p` en sentido antihorario visto desde `n`.
 */
function panoConCentro(em: Molde, p: readonly [V3, V3, V3, V3], n: V3, base: Rgb): void {
  const centro: V3 = [(p[0][0] + p[1][0] + p[2][0] + p[3][0]) / 4, (p[0][1] + p[1][1] + p[2][1] + p[3][1]) / 4, (p[0][2] + p[1][2] + p[2][2] + p[3][2]) / 4];
  const cc = colorDelVidrio(base, 0);
  em.color(cc[0], cc[1], cc[2]);
  em.poner('aEmisor', 1, 0);
  const c = em.vertice(centro[0], centro[1], centro[2], n[0], n[1], n[2], 0.5, 0.5);
  const cm = colorDelVidrio(base, 1);
  em.color(cm[0], cm[1], cm[2]);
  em.poner('aEmisor', 1, 1);
  const esquinas = p.map((q, i) => em.vertice(q[0], q[1], q[2], n[0], n[1], n[2], i === 1 || i === 2 ? 1 : 0, i >= 2 ? 1 : 0));
  for (let i = 0; i < 4; i++) em.tri(c, esquinas[i] as number, esquinas[(i + 1) % 4] as number);
}

/* ═══════════════════════════════ LA FAROLA DE CALLE ═══════════════════════════════ */

/** Dónde cuelga la cabeza de la farola de calle: a 1,35 m del fuste, sobre la calzada. La luz, a 6 m (la de siempre). */
const VUELO_DEL_BRAZO = 1.35;
/** El borde de abajo de la campana: el vidrio cuelga de aquí y envuelve la luz de 6 m. */
const BORDE_DE_LA_CAMPANA = 6.08;

/** Farola de calle: basa, fuste, brazo sobre la calzada y campana con el vidrio de sodio. Ver la cabecera. */
export function* farolaDeCalle(obra: ObraDeLaCelda, f: { readonly x: number; readonly z: number; readonly brazo: Orientacion }): Generator<void, LuzDelMobiliario, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const h = hechuraDe(obra);
  const lados = obra.lados;
  const { x, z, brazo } = f;
  const [dx, dz] = normalDe(brazo);
  /* Un punto a `a` metros por el brazo e `y` sobre la acera. */
  const p = (a: number, y: number): V3 => [x + dx * a, H + y, z + dz * a];
  const hx = x + dx * VUELO_DEL_BRAZO;
  const hz = z + dz * VUELO_DEL_BRAZO;
  const negro = NEGRO_DE_FAROLA;
  const pie = por(negro, MUGRE);
  tono(mo, negro, FUNDICION_PINTADA);

  /* La basa y el fuste: dos tornos (radios muy distintos: acta, decisión 10). Nada pasa de 0,22 m de radio. El anillo
     del fuste va a 2,4 m: entre 3,1 y 4,3 cuelga la banderola (`voladizos.ts`), a 12 cm del eje. */
  if (h === 1) {
    /* Siete lados como mucho: el tope de la farola de calle en grado 1 es de 90 triángulos (§3.1), y con los 8 de N1
       eran 112. */
    const l = Math.min(lados, 7);
    tornear(mo, x, z, contorno([[0.2, 0], [0.13, 0.28], [0.085, 0.6]], H, negro, pie), l);
    tornear(mo, x, z, contorno([[0.085, 0.6], [0.06, 5.9], [0, 5.98]], H, negro), l);
  } else if (h <= 3) {
    const basa: P2[] = h === 2 ? [[0.21, 0], [0.2, 0.08], [0.14, 0.2], [0.095, 0.56]] : [[0.21, 0], [0.2, 0.08], [0.14, 0.2], [0.115, 0.45], [0.095, 0.56]];
    tornear(mo, x, z, contorno(basa, H, negro, pie), 8);
    tornear(mo, x, z, contorno([[0.09, 0.56], [0.075, 2.36], [0.09, 2.4], [0.075, 2.44], [0.06, 5.9], [0, 5.98]], H, negro), 8);
  } else {
    tornear(mo, x, z, contorno([[0.215, 0], [0.205, 0.09], [0.155, 0.17], [0.12, 0.43], [0.132, 0.48], [0.095, 0.57]], H, negro, pie), 10);
    tornear(mo, x, z, contorno([[0.09, 0.57], [0.075, 2.36], [0.09, 2.4], [0.075, 2.44], [0.062, 5.28], [0.078, 5.32], [0.062, 5.36], [0.06, 5.9]], H, negro), 10);
    /* El remate del fuste, por encima del brazo. */
    tornear(mo, x, z, contorno([[0.06, 5.9], [0.075, 5.93], [0.04, 6.0], [0, 6.14]], H, negro), 8);
  }
  /* La puerta del registro, de espaldas a la calzada (hechura 3+): una chapa de 8 × 40 cm a 0,8-1,2 m, dentro de la caja. */
  if (h >= 3) {
    mo.con(colocar(x, H, z, brazo), () => {
      const r = 0.083;
      mo.caja(-0.04, 0.8, -r - 0.012, 0.04, 1.2, -r + 0.02, 'noeab');
    });
  }
  /* El brazo: sale del fuste por debajo del remate y se curva hasta la campana. */
  const brazoPuntos: V3[] = h <= 2 ? [p(0, 5.45), p(0.22, 5.95), p(0.75, 6.28), p(VUELO_DEL_BRAZO, 6.33)] : [p(0, 5.45), p(0.14, 5.82), p(0.45, 6.14), p(0.9, 6.3), p(VUELO_DEL_BRAZO, 6.33)];
  tubo(mo, brazoPuntos, h === 4 ? 0.042 : 0.04, h <= 2 ? 4 : 5);
  /* El tirante, del fuste a medio brazo (hechura 3). En la 4, la voluta: un rizo junto al fuste que sube curvo a
     buscar el brazo. */
  if (h === 3) tubo(mo, [p(0.05, 4.95), p(0.62, 6.2)], 0.02, 3);
  if (h === 4) {
    const voluta: V3[] = [];
    const c: P2 = [0.14, 5.05];
    for (let i = 0; i <= 3; i++) {
      const t = i / 3;
      const ang = Math.PI * (0.6 + 1.4 * t);
      const rr = 0.075 * (0.5 + 0.5 * t);
      voluta.push(p(c[0] + Math.cos(ang) * rr, c[1] + Math.sin(ang) * rr));
    }
    /* De la vuelta del rizo (tangente arriba) al brazo, en una curva de Bézier. */
    const b0: P2 = [c[0] + 0.075, c[1]];
    const b1: P2 = [c[0] + 0.075, 5.95];
    const b2: P2 = [0.62, 6.2];
    for (let i = 1; i <= 3; i++) {
      const t = i / 3;
      const u = 1 - t;
      voluta.push(p(u * u * b0[0] + 2 * u * t * b1[0] + t * t * b2[0], u * u * b0[1] + 2 * u * t * b1[1] + t * t * b2[1]));
    }
    tubo(mo, voluta, 0.02, 4);
  }
  /* La campana: un torno de perfil suave, con su bajo (de donde cuelga el vidrio). */
  const campana: P2[] =
    h === 1
      ? [[0.2, 0], [0, 0.25]]
      : h === 2
        ? [[0.21, 0], [0.14, 0.13], [0, 0.25]]
        : h === 3
          ? [[0.21, 0], [0.19, 0.06], [0.11, 0.17], [0, 0.25]]
          : [[0.22, 0], [0.205, 0.05], [0.13, 0.16], [0.05, 0.23], [0, 0.26]];
  tornear(mo, hx, hz, contorno(campana, H + BORDE_DE_LA_CAMPANA, negro), h === 1 ? Math.min(lados, 7) : h === 4 ? 10 : 8, { tapaAbajo: true });
  /* El vidrio. Hechura 1: el cristal plano de siempre bajo la campana (2 triángulos: N0 y N1 no pagan vidrio). 2: un
     cuenco de 8 lados de un solo tramo (8 triángulos: el barrio viejo pinta sus 66 farolas de calle en grado 2 y su
     renglón de luces, 2.600, no da para más de 9 por farola). 3: el cuenco con su panza. 4: una ampolla. La luz de la
     calle (6,0 m) queda dentro. */
  if (h === 1) {
    em.color(SODIO_HDR[0], SODIO_HDR[1], SODIO_HDR[2]);
    em.poner('aEmisor', 1, 1);
    em.losa(hx - 0.13, hz - 0.13, hx + 0.13, hz + 0.13, H + BORDE_DE_LA_CAMPANA - 0.02, false);
  } else if (h === 2) {
    vidrioEnCuenco(
      em,
      hx,
      hz,
      [
        { r: 0.17, y: H + BORDE_DE_LA_CAMPANA - 0.005, radial: 1 },
        { r: 0, y: H + 5.94, radial: 0 },
      ],
      8,
      SODIO_HDR,
    );
  } else if (h === 3) {
    vidrioEnCuenco(
      em,
      hx,
      hz,
      [
        { r: 0.18, y: H + BORDE_DE_LA_CAMPANA - 0.005, radial: 1 },
        { r: 0.13, y: H + 5.975, radial: 0.62 },
        { r: 0, y: H + 5.93, radial: 0 },
      ],
      8,
      SODIO_HDR,
    );
  } else {
    vidrioEnCuenco(
      em,
      hx,
      hz,
      [
        { r: 0.19, y: H + BORDE_DE_LA_CAMPANA - 0.005, radial: 1 },
        { r: 0.17, y: H + 6.02, radial: 0.78 },
        { r: 0.115, y: H + 5.955, radial: 0.45 },
        { r: 0, y: H + 5.925, radial: 0 },
      ],
      8,
      SODIO_HDR,
    );
  }
  yield;
  return { x: x + dx * 1.35, y: H + 6.0, z: z + dz * 1.35, tipo: 'farola' };
}

/* ═══════════════════════════════ LA FAROLA DE PLAZA ═══════════════════════════════ */

/** Un bloque local a la farola (x, z), por su centro y medidas, de y0 a y1 sobre la acera. */
function bloqueEn(m: Molde, x: number, z: number, lado: number, y0: number, y1: number, caras: string): void {
  m.caja(x - lado / 2, H + y0, z - lado / 2, x + lado / 2, H + y1, z + lado / 2, caras);
}

/** Una moldura corrida alrededor de un cuerpo cuadrado de `lado` a la altura `y` (perfil (fuera, arriba)). */
function molduraCuadrada(m: Molde, x: number, z: number, lado: number, y: number, perfil: readonly P2[]): void {
  const s = lado / 2;
  const yy = H + y;
  /* Como rodea los muros `caja`: (x1, z0) → (x0, z0) → (x0, z1) → (x1, z1), con «fuera» a la derecha. */
  m.extruirPerfil(
    [
      [x + s, yy, z - s],
      [x - s, yy, z - s],
      [x - s, yy, z + s],
      [x + s, yy, z + s],
    ],
    perfil,
    { cerrado: true },
  );
}

/** Farola de plaza: pedestal en tres cuerpos, fuste y farol de seis caras con su tejadillo. Ver la cabecera. */
export function* farolaDePlaza(obra: ObraDeLaCelda, f: { readonly x: number; readonly z: number }): Generator<void, LuzDelMobiliario, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const h = hechuraDe(obra);
  const lados = obra.lados;
  const { x, z } = f;
  const verde = VERDE_DE_FAROLA;
  /* El pedestal en tres cuerpos: basa, dado y cornisa. Todo dentro de la caja (0,46 de lado como mucho). */
  tono(mo, por(verde, MUGRE), FUNDICION_PINTADA);
  if (h === 4) mo.cajaBiselada(x - 0.23, H, z - 0.23, x + 0.23, H + 0.2, z + 0.23, 0.02, 'nseoa');
  else bloqueEn(mo, x, z, 0.46, 0, 0.2, 'nseoa');
  tono(mo, verde, FUNDICION_PINTADA);
  bloqueEn(mo, x, z, 0.34, 0.2, 0.56, 'nseo');
  if (h === 4) {
    molduraCuadrada(mo, x, z, 0.34, 0.2, [
      [0, 0],
      [0.035, 0],
      [0.03, 0.025],
      [0, 0.06],
    ]);
    mo.cajaBiselada(x - 0.2, H + 0.56, z - 0.2, x + 0.2, H + 0.66, z + 0.2, 0.018);
  } else {
    bloqueEn(mo, x, z, 0.4, 0.56, 0.66, 'nseoab');
  }
  /* El fuste. Hechura 1: un torno. 2-3: collar, fuste acanalado PINTADO (16 sectores con la normal torcida a un lado y
     al otro: ocho estrías que sólo ve el sombreador) y capitel. 4: las estrías de verdad (24 sectores, tres por
     estría, con el fondo 1 cm más adentro). */
  if (h === 1) {
    /* Siete lados como mucho: el tope de la de plaza en grado 1 es de 110 triángulos (§3.1). */
    tornear(mo, x, z, contorno([[0.11, 0.66], [0.085, 0.8], [0.07, 3.55], [0.095, 3.66]], H, verde), Math.min(lados, 7));
  } else {
    const l = h === 4 ? 10 : 8;
    tornear(mo, x, z, contorno(h === 2 ? [[0.12, 0.66], [0.082, 0.8]] : [[0.12, 0.66], [0.12, 0.7], [0.082, 0.8]], H, verde), l);
    if (h <= 3) {
      tornear(mo, x, z, contorno([[0.08, 0.8], [0.066, 3.5]], H, verde), 16, { torsionDelSector: (k) => (k % 2 === 0 ? 0.55 : -0.55) });
    } else {
      tornear(mo, x, z, contorno([[0.082, 0.8], [0.075, 2.2], [0.066, 3.5]], H, verde), 24, {
        radioDelSector: (k) => (k % 3 === 0 ? 1 : 0.86),
        torsionDelSector: (k) => (k % 3 === 1 ? 0.7 : k % 3 === 2 ? -0.7 : 0),
      });
    }
    tornear(mo, x, z, contorno(h === 2 ? [[0.066, 3.5], [0.1, 3.66]] : [[0.066, 3.5], [0.09, 3.58], [0.1, 3.66]], H, verde), l);
  }
  /* La barra de la escalera del farolero, a 3,3 m (hechura 4). */
  if (h === 4) {
    tubo(
      mo,
      [
        [x - 0.28, H + 3.3, z],
        [x + 0.28, H + 3.3, z],
      ],
      0.022,
      4,
    );
  }
  /* El farol: la bandeja de abajo, el tejadillo de seis aguas con su bajo y el remate. Seis caras: las del vidrio
     (radio 0,19 abajo y 0,25 arriba, de 3,85 a 4,45 m; la luz, a 4,15 en su centro). */
  const giro = Math.PI / 6;
  if (h <= 2) tornear(mo, x, z, contorno([[0.07, 3.66], [0.2, 3.85]], H, verde), 6, { giro });
  else tornear(mo, x, z, contorno([[0.07, 3.66], [0.2, 3.8], [0.21, 3.85]], H, verde), 6, { giro });
  const tejado: P2[] = h === 1 ? [[0.3, 4.45], [0.05, 4.72]] : h === 2 ? [[0.3, 4.45], [0.31, 4.49], [0.05, 4.72]] : [[0.3, 4.45], [0.31, 4.49], [0.12, 4.66], [0.05, 4.72]];
  tornear(mo, x, z, contorno(tejado, H, verde), 6, { giro, tapaAbajo: true });
  if (h === 4) {
    tono(mo, LATON, LATON_VIEJO);
    tornear(mo, x, z, contorno([[0.05, 4.72], [0.03, 4.77], [0.05, 4.84], [0, 4.97]], H), 6, { giro });
  } else {
    tornear(mo, x, z, contorno([[0.05, 4.72], [0, 4.92]], H, verde), 6, { giro });
  }
  /* Los montantes del farol: hechuras 2-3, una tira por arista; 4, seis varillas. */
  tono(mo, verde, FUNDICION_PINTADA);
  if (h >= 2) {
    for (let k = 0; k < 6; k++) {
      const a = giro + (k * Math.PI) / 3;
      const c = Math.cos(a);
      const s = Math.sin(a);
      if (h === 4) {
        tubo(
          mo,
          [
            [x + c * 0.2, H + 3.84, z + s * 0.2],
            [x + c * 0.262, H + 4.46, z + s * 0.262],
          ],
          0.014,
          3,
        );
      } else {
        const t: V3 = [-s * 0.016, 0, c * 0.016];
        const n: V3 = [c, 0, s];
        const b0: V3 = [x + c * 0.2, H + 3.85, z + s * 0.2];
        const b1: V3 = [x + c * 0.2605, H + 4.45, z + s * 0.2605];
        /* Antihorario visto desde fuera: `t` crece con el ángulo, que visto desde fuera va hacia la izquierda. */
        mo.quad([b0[0] + t[0], b0[1], b0[2] + t[2]], [b0[0] - t[0], b0[1], b0[2] - t[2]], [b1[0] - t[0], b1[1], b1[2] - t[2]], [b1[0] + t[0], b1[1], b1[2] + t[2]], n, [0, 3.85, 0.024, 3.85, 0.024, 4.45, 0, 4.45]);
      }
    }
  }
  /* El vidrio de seis caras. Hechuras 1-3: como antes (12 triángulos, todo marco). 4: cada paño con su centro. */
  if (h <= 3) {
    const c = por(SODIO_HDR, 0.7);
    tornear(
      em,
      x,
      z,
      [
        { r: 0.19, y: H + 3.85, radial: 1, color: c },
        { r: 0.25, y: H + 4.45, radial: 1, color: c },
      ],
      6,
      { emisor: 1, giro },
    );
  } else {
    const base = por(SODIO_HDR, 0.7);
    for (let k = 0; k < 6; k++) {
      const a0 = giro + (k * Math.PI) / 3;
      const a1 = giro + ((k + 1) * Math.PI) / 3;
      const am = (a0 + a1) / 2;
      const q = (a: number, r: number, y: number): V3 => [x + Math.cos(a) * r, H + y, z + Math.sin(a) * r];
      /* El orden del torno visto desde fuera: abajo a0, arriba a0, arriba a1, abajo a1. */
      const inclina = (0.25 - 0.19) / 0.6;
      const nl = Math.hypot(1, inclina);
      const n: V3 = [Math.cos(am) / nl, -inclina / nl, Math.sin(am) / nl];
      panoConCentro(em, [q(a0, 0.19, 3.85), q(a0, 0.25, 4.45), q(a1, 0.25, 4.45), q(a1, 0.19, 3.85)], n, base);
    }
  }
  yield;
  return { x, y: H + 4.15, z, tipo: 'farola' };
}

/** Una farola de pie del plano: de calle si tiene brazo, de plaza si no. */
export function* farola(obra: ObraDeLaCelda, f: FarolaDelPlano): Generator<void, LuzDelMobiliario, void> {
  const brazo = f.brazo;
  return brazo === null ? yield* farolaDePlaza(obra, f) : yield* farolaDeCalle(obra, { x: f.x, z: f.z, brazo });
}

/* ═══════════════════════════════ LA FAROLA DE PARED ═══════════════════════════════ */

/**
 * UNA FAROLA DE PARED: una ménsula de hierro a `alto` metros que sale 0,7 m de la fachada, con su farol de cuatro
 * caras colgado y su tejadillo. Va por encima de la cabeza y no tiene caja (§2.4): la ponen las calles que no
 * llevan farolas de pie. El vidrio va de 0,33 a 0,05 m por debajo de `alto` y la luz, a 0,2 (la de siempre). Es la
 * pieza que más se repite (150 en una ventana de N3): cada triángulo cuenta.
 */
export function* farolaDePared(obra: ObraDeLaCelda, l: LamparaDePared): Generator<void, LuzDelMobiliario, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const h = hechuraDe(obra);
  const lados = obra.lados;
  const { x, z, mira, alto } = l;
  const [nx, nz] = normalDe(mira);
  /* Un punto a `a` metros de la fachada y a `y` de altura (de mundo). */
  const p = (a: number, y: number): V3 => [x + nx * a, y, z + nz * a];
  const negro = NEGRO_DE_FAROLA;
  tono(mo, negro, FUNDICION_PINTADA);
  /* El brazo, casi horizontal, del muro a la cabeza del farol; y la tornapuntas que lo sostiene desde abajo. */
  const ladosDelBrazo = h === 1 ? Math.max(4, lados - 2) : h === 4 ? 5 : 4;
  tubo(mo, [p(0, alto + 0.04), p(0.4, alto + 0.075), p(0.7, alto + 0.075)], h === 1 ? 0.028 : 0.026, ladosDelBrazo);
  if (h === 1) {
    tubo(mo, [p(0, alto - 0.34), p(0.36, alto + 0.07)], 0.02, lados <= 6 ? 3 : 4);
  } else {
    /* La tornapuntas curva (hechuras 2-3) o con su rizo junto al muro (4): una Bézier que sale del muro hacia arriba
       y llega tumbada al brazo. */
    const puntos: V3[] = [];
    let b0: P2 = [0.02, alto - 0.36];
    if (h === 4) {
      const c: P2 = [0.06, alto - 0.3];
      for (let i = 0; i <= 3; i++) {
        const t = i / 3;
        const ang = Math.PI * (0.6 + 1.4 * t);
        const rr = 0.045 * (0.5 + 0.5 * t);
        puntos.push(p(c[0] + Math.cos(ang) * rr, c[1] + Math.sin(ang) * rr));
      }
      b0 = [c[0] + 0.045, c[1]];
    } else {
      puntos.push(p(b0[0], b0[1]));
    }
    const b1: P2 = [b0[0], alto + 0.03];
    const b2: P2 = [0.42, alto + 0.07];
    const n = h === 2 ? 3 : 4;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      puntos.push(p(u * u * b0[0] + 2 * u * t * b1[0] + t * t * b2[0], u * u * b0[1] + 2 * u * t * b1[1] + t * t * b2[1]));
    }
    tubo(mo, puntos, 0.02, h === 4 ? 4 : 3);
  }
  /* La placa del muro (hechura 4). */
  if (h === 4) {
    mo.con(colocar(x, alto - 0.14, z, mira), () => {
      mo.cajaBiselada(-0.06, -0.3, 0, 0.06, 0.24, 0.018, 0.008, 'seoab');
    });
  }
  /* El farol, en su sitio local: y = 0 en `alto`, +z hacia fuera del muro, centrado a 0,7 m. */
  mo.con(colocar(x + nx * 0.7, alto, z + nz * 0.7, mira), () => {
    /* El tejadillo de cuatro aguas, sobre el vidrio (que llega a −0,05 con 0,13 de semilado); con alero desde la 3. */
    tejadillo(mo, h === 1 ? 0.155 : 0.17, -0.045, 0.1, h >= 3);
    /* La bandeja de abajo, que sostiene el vidrio. */
    mo.caja(-0.11, -0.37, -0.11, 0.11, -0.33, 0.11, 'nseob');
    /* El remate. */
    if (h >= 2) mo.caja(-0.018, 0.05, -0.018, 0.018, 0.1, 0.018, h === 4 ? 'nseoa' : 'nseo');
    /* Los montantes (hechura 4): cuatro varillas por las aristas del vidrio, que se abre hacia arriba. */
    if (h === 4) {
      for (const [sx, sz] of [
        [1, 1],
        [1, -1],
        [-1, -1],
        [-1, 1],
      ] as const) {
        tubo(
          mo,
          [
            [sx * 0.1, -0.335, sz * 0.1],
            [sx * 0.13, -0.045, sz * 0.13],
          ],
          0.011,
          3,
        );
      }
    }
  });
  /* El vidrio: cuatro caras que se abren hacia arriba y el fondo. Hechuras 1-3: 10 triángulos, como antes. 4: cada
     paño con su centro. */
  em.con(colocar(x + nx * 0.7, alto, z + nz * 0.7, mira), () => {
    const base = por(SODIO_HDR, 0.8);
    const y0 = -0.33;
    const y1 = -0.05;
    const r0 = 0.1;
    const r1 = 0.13;
    /* Las esquinas, antihorario vistas desde fuera en cada cara. */
    const caras: readonly (readonly [V3, V3, V3, V3, V3])[] = [
      [[-r0, y0, r0], [r0, y0, r0], [r1, y1, r1], [-r1, y1, r1], [0, 0, 1]],
      [[r0, y0, -r0], [-r0, y0, -r0], [-r1, y1, -r1], [r1, y1, -r1], [0, 0, -1]],
      [[r0, y0, r0], [r0, y0, -r0], [r1, y1, -r1], [r1, y1, r1], [1, 0, 0]],
      [[-r0, y0, -r0], [-r0, y0, r0], [-r1, y1, r1], [-r1, y1, -r1], [-1, 0, 0]],
    ];
    const inclina = (r1 - r0) / (y1 - y0);
    const nl = Math.hypot(1, inclina);
    for (const [a, b, c, d, n0] of caras) {
      const n: V3 = [n0[0] / nl, -inclina / nl, n0[2] / nl];
      if (h === 4) panoConCentro(em, [a, b, c, d], n, base);
      else {
        em.color(base[0], base[1], base[2]);
        em.poner('aEmisor', 1, 1);
        em.quad(a, b, c, d, n, [0, 0, 1, 0, 1, 1, 0, 1]);
      }
    }
    const fondo: readonly [V3, V3, V3, V3] = [
      [-r0, y0, -r0],
      [r0, y0, -r0],
      [r0, y0, r0],
      [-r0, y0, r0],
    ];
    if (h === 4) panoConCentro(em, fondo, [0, -1, 0], base);
    else {
      em.color(base[0], base[1], base[2]);
      em.poner('aEmisor', 1, 1);
      em.quad(fondo[0], fondo[1], fondo[2], fondo[3], [0, -1, 0], [0, 0, 1, 0, 1, 1, 0, 1]);
    }
  });
  yield;
  return { x: x + nx * 0.7, y: alto - 0.2, z: z + nz * 0.7, tipo: 'farola' };
}

/**
 * UN TEJADILLO de cuatro aguas en el sitio local de un farol: el alero a `y0`, de semilado `s`, y la punta `alto`
 * más arriba. Con `alero`, una tira vertical de 2 cm en el borde (el canto del alero). Caras planas: cuatro aguas,
 * el bajo (lo que se ve desde la calle) y, con alero, sus cuatro cantos.
 */
function tejadillo(m: Molde, s: number, y0: number, alto: number, alero: boolean): void {
  const yA = y0 + (alero ? 0.02 : 0);
  const punta: V3 = [0, yA + alto, 0];
  const e: readonly V3[] = [
    [s, yA, s],
    [s, yA, -s],
    [-s, yA, -s],
    [-s, yA, s],
  ];
  const inc = alto / s;
  const nl = Math.hypot(inc, 1);
  /* Cada agua, antihorario vista desde fuera: una esquina, la siguiente y la punta. */
  for (let i = 0; i < 4; i++) {
    const a = e[i] as V3;
    const b = e[(i + 1) % 4] as V3;
    const mx = (a[0] + b[0]) / 2;
    const mz = (a[2] + b[2]) / 2;
    const ml = Math.hypot(mx, mz);
    const n: V3 = [(mx / ml) * (inc / nl), 1 / nl, (mz / ml) * (inc / nl)];
    const ia = m.vertice(a[0], a[1], a[2], n[0], n[1], n[2], 0, 0);
    const ib = m.vertice(b[0], b[1], b[2], n[0], n[1], n[2], 1, 0);
    const ic = m.vertice(punta[0], punta[1], punta[2], n[0], n[1], n[2], 0.5, 1);
    m.tri(ia, ib, ic);
  }
  if (alero) m.caja(-s, y0, -s, s, yA, s, 'nseob');
  else m.losa(-s, -s, s, s, y0, false);
}
