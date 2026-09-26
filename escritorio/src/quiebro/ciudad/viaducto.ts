/**
 * EL VIADUCTO DEL ELEVADO, celda a celda: los pilares de la celda (dentro de su caja de 1 × 1 hasta la cabeza) y
 * el tramo de viga que cae en ella, con sus petos, sus carriles y la franja de luz verde-cian bajo el peto que se
 * ve de lejos (§2.7 de `docs/quiebro/CIUDAD-ABIERTA.md`: «el Elevado, con su franja de luz»). Cortado en la raya
 * de la celda: el tramo de al lado lo pone la otra.
 *
 * ═══ LA SECCIÓN ═══
 *
 * La viga es de hormigón y TRAPEZOIDAL: 2,4 m abajo, las almas abiertas hasta 3,5 m y los vuelos del tablero
 * hasta 3,8, con un canto de 18 cm donde va la franja de luz (bajo el peto) y, desde g2, el goterón (la ranura
 * de debajo del vuelo por donde el agua gotea en vez de lamer el alma). Encima, los petos de chapa y los carriles.
 * El pilar lleva plinto, fuste, capitel en seta (que se abre por encima de 1,9 m, fuera del paso) y, desde g2,
 * apoyos bajo la viga y su bajante de agua pegada a una cara. Por debajo de 1,9 m, todo dentro de la caja de
 * 1 × 1 (lo mira `verify:quiebro-ciudad`, vehículos c).
 *
 * `seccionDelViaducto(grado)` da la sección de cada grado (la viga, los petos, la franja y los tramos del pilar):
 * la de g1 es la de N0 y N1 en la ventana y la que LEJANO pone en la LOD1, para que el pilar y la viga no salten
 * al entrar en la ventana. Desde g2 el fuste y el capitel son ochavados y la viga lleva su goterón: la silueta
 * es la misma.
 *
 * ═══ EL DETALLE: EL NIVEL Y EL GRADO ═══
 *
 * N0 no puede gastar más que antes en el viaducto (§6, O2-VEHICULOS): la sección de g1 dibujada a lo justo (sin
 * carriles, que el peto tapa desde la calle). N1 (también g1) le pone los carriles, los apoyos y la bajante. g2
 * el pilar ochavado, el goterón y las juntas (cada 24 m, una tira oscura); g3 la seta en cuatro tramos, la
 * bandeja de cables, la pasarela y las abrazaderas de la bajante.
 *
 * ═══ LA FAMILIA `viaducto` ═══
 *
 * El hormigón del viaducto es de la familia 14 (`materia/familias/viaducto.ts`): los chorretones bajo las juntas
 * y bajo los apoyos. La familia lee la UV: en la viga, `u` es la coordenada de mundo a lo largo del eje (las
 * juntas, en los múltiplos de 24) y `v` la altura (o lo de través, en lo que mira arriba o abajo); en el pilar,
 * `u` rodea el fuste y `v` es la altura. Mientras el mobiliario no reparta familias, el acabado es el de siempre
 * (`acabadoDeVehiculo`, en `coches.ts`).
 *
 * ═══ CEDE POR PILAR Y POR TRAMO ═══
 *
 * `viaductoDeLaCelda` es el escritor de su familia en la celda (`EscritorDeLaCelda` de `celdas.ts`) y `viaducto`
 * la pieza (`EscritorDePieza`): cede después de cada pilar y del tramo de viga.
 */
import { ALTO_DEL_VIADUCTO } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import { ACABADO, lineal } from './materiales';
import type { Molde, P2 } from './geometria';
import type { CajaXZ, GradoDeLaCelda, NivelDeLaCiudad } from './tipos';
import type { ObraDeLaCelda, ParteDeLaCelda } from './celdas';
import { FAMILIA } from './materia/familias';
import { acabadoDeVehiculo } from './coches';

/** Un tramo del viaducto del Elevado: la viga de `desde` a `hasta` a lo largo de `eje`. */
export interface TramoDeViaducto {
  readonly eje: 'x' | 'z';
  readonly linea: number;
  readonly desde: number;
  readonly hasta: number;
  /** La altura de la cara de ABAJO de la viga (la cabeza de los pilares). */
  readonly alto: number;
}

/** Lo que el viaducto escribe en una celda: su tramo de viga (si pasa por ella) y sus pilares. */
export interface ViaductoDeLaCelda {
  readonly tramo: TramoDeViaducto | null;
  readonly pilares: readonly CajaXZ[];
}

/** Un tramo del pilar: de `y0` a `y1`, con el medio lado de sus caras abajo y arriba y su chaflán (0: cuadrado). */
export interface TramoDelPilar {
  readonly y0: number;
  readonly y1: number;
  readonly r0: number;
  readonly r1: number;
  /** El chaflán de las esquinas, en fracción del medio lado (0: cuadrado): igual en los dos anillos, que casan. */
  readonly chaflan: number;
}

/** LA SECCIÓN DEL VIADUCTO de un grado (ver la cabecera). Todo en metros. */
export interface SeccionDelViaducto {
  /**
   * La viga: su contorno cerrado en (t, dy) —t de través desde el eje, dy sobre la cara de abajo—, antihorario con
   * t a la derecha y dy arriba.
   */
  readonly viga: readonly P2[];
  /** El medio ancho del tablero (el canto de la franja de luz). */
  readonly medioAncho: number;
  /** La franja de luz en el canto del tablero: de dy0 a dy1. */
  readonly franja: readonly [number, number];
  /** Los petos, uno por lado: (t0, t1, dy0, dy1). */
  readonly petos: readonly (readonly [number, number, number, number])[];
  /** El pilar, de abajo arriba, para un viaducto de altura `alto` (la cabeza toca la viga). */
  readonly pilar: readonly TramoDelPilar[];
}

/** El tablero: la cara de arriba a 0,9 m sobre la de abajo, con 3,8 m de ancho. */
const ARRIBA = 0.9;
const MEDIO_ANCHO = 1.9;
/** Donde acaba el alma y empieza el vuelo, y el canto del tablero. */
const ALMA: P2 = [1.72, 0.66];
const CANTO = 0.72;
/** La cara de abajo de la viga. */
const MEDIO_FONDO = 1.2;

/** El medio lado del fuste y el de la cabeza del capitel. */
const FUSTE = 0.42;
const CABEZA = 0.78;
/** El chaflán del pilar ochavado, en fracción del medio lado (0,1 m en el fuste). */
const OCHAVO = 0.24;

/**
 * LA SECCIÓN de un grado, para un viaducto cuya viga arranca a `alto` (la cabeza de los pilares). g1: cuadrado y
 * sin goterón; g2 y g3: ochavado, con goterón y apoyos (la cabeza del capitel 14 cm por debajo de la viga).
 */
export function seccionDelViaducto(grado: GradoDeLaCelda, alto: number = ALTO_DEL_VIADUCTO): SeccionDelViaducto {
  const derecho: P2[] =
    grado === 1
      ? [
          [MEDIO_FONDO, 0],
          ALMA,
          [MEDIO_ANCHO, CANTO],
          [MEDIO_ANCHO, ARRIBA],
        ]
      : [
          [MEDIO_FONDO, 0],
          ALMA,
          [1.8, 0.69],
          [1.81, 0.706],
          [1.83, 0.708],
          [1.84, 0.692],
          [MEDIO_ANCHO, 0.7],
          [MEDIO_ANCHO, ARRIBA],
        ];
  /* Antihorario: el lado derecho de abajo arriba, el tablero de derecha a izquierda, el izquierdo de arriba abajo. */
  const izquierdo = [...derecho].reverse().map(([t, y]): P2 => [-t, y]);
  const viga: P2[] = [...derecho, ...izquierdo];
  const conApoyos = grado >= 2;
  const cabeza = conApoyos ? alto - 0.14 : alto;
  const pilar: TramoDelPilar[] = [
    { y0: 0, y1: 0.45, r0: 0.5, r1: 0.5, chaflan: 0 },
    { y0: 0.45, y1: alto - 1.3, r0: FUSTE, r1: FUSTE, chaflan: grado === 1 ? 0 : OCHAVO },
  ];
  if (grado >= 3) {
    /* La seta en cuatro tramos: se abre deprisa arriba, como un capitel de hongo. */
    const pasos = [0, 0.3, 0.58, 0.8, 1];
    const radio = [FUSTE, 0.47, 0.57, 0.68, CABEZA];
    for (let i = 0; i + 1 < pasos.length; i++) {
      const y0 = alto - 1.3 + (pasos[i] as number) * 0.92;
      const y1 = alto - 1.3 + (pasos[i + 1] as number) * 0.92;
      pilar.push({ y0, y1, r0: radio[i] as number, r1: radio[i + 1] as number, chaflan: OCHAVO });
    }
  } else if (grado === 2) {
    pilar.push({ y0: alto - 1.3, y1: alto - 0.8, r0: FUSTE, r1: 0.52, chaflan: OCHAVO });
    pilar.push({ y0: alto - 0.8, y1: alto - 0.38, r0: 0.52, r1: CABEZA, chaflan: OCHAVO });
  } else {
    pilar.push({ y0: alto - 1.3, y1: alto - 0.38, r0: FUSTE, r1: CABEZA, chaflan: 0 });
  }
  pilar.push({ y0: alto - 0.38, y1: cabeza, r0: CABEZA, r1: CABEZA, chaflan: grado === 1 ? 0 : OCHAVO });
  return {
    viga,
    medioAncho: MEDIO_ANCHO,
    franja: [0.76, 0.84],
    petos: [
      [MEDIO_ANCHO - 0.12, MEDIO_ANCHO, ARRIBA, ARRIBA + 0.55],
      [-MEDIO_ANCHO, -MEDIO_ANCHO + 0.12, ARRIBA, ARRIBA + 0.55],
    ],
    pilar,
  };
}

/** Lo que se dibuja del viaducto en una celda: por nivel y grado (ver la cabecera). */
export function detalleDelViaducto(nivel: NivelDeLaCiudad, grado: GradoDeLaCelda): 0 | 1 | 2 | 3 {
  if (nivel === 0) return 0;
  return grado === 1 ? 1 : grado === 2 ? 2 : 3;
}

const HORMIGON_DEL_VIADUCTO = lineal(0x5d5d58);
const CHAPA_DEL_PETO = lineal(0x3a3d3f);
const JUNTA = lineal(0x1d1d1b);
const CARRIL = lineal(0x4a4c4d);
const TUBO = lineal(0x2c2f30);

function acabadoDelHormigon(): readonly [number, number] {
  return acabadoDeVehiculo(FAMILIA.viaducto, 0.85, 0, {}, ACABADO.hormigon);
}

type Rgb = readonly [number, number, number];

function tono(m: Molde, color: Rgb, acabado: readonly [number, number]): void {
  m.color(color[0], color[1], color[2]);
  m.poner('aAcabado', acabado[0], acabado[1]);
}

/**
 * Un prisma vertical ochavado (o cuadrado, con `chaflan` 0) de `y0` a `y1`, con el medio lado de sus caras `r0`
 * abajo y `r1` arriba y las esquinas cortadas `chaflan · r` (a lo largo de cada eje: dos tramos que casan en un
 * radio casan también en el chaflán). Caras planas, con la normal de su plano; UV: `u` alrededor (metros) y `v`
 * la altura.
 */
function prismaOchavado(m: Molde, cx: number, cz: number, y0: number, y1: number, r0: number, r1: number, chaflan: number, tapaArriba = false): void {
  const contorno = (r: number): P2[] => {
    const c = Math.min(chaflan * r, r * 0.6);
    if (c <= 1e-6)
      return [
        [r, -r],
        [r, r],
        [-r, r],
        [-r, -r],
      ];
    /* De +x hacia +z, antihorario visto desde arriba con x a la derecha y z abajo… en el sentido de `muro`. */
    return [
      [r, -r + c],
      [r, r - c],
      [r - c, r],
      [-r + c, r],
      [-r, r - c],
      [-r, -r + c],
      [-r + c, -r],
      [r - c, -r],
    ];
  };
  const abajo = contorno(r0);
  const arriba = contorno(r1);
  const n = abajo.length;
  let u = 0;
  for (let i = 0; i < n; i++) {
    const a0 = abajo[i] as P2;
    const b0 = abajo[(i + 1) % n] as P2;
    const a1 = arriba[i] as P2;
    const b1 = arriba[(i + 1) % n] as P2;
    const largo = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]);
    /* La normal hacia fuera: la del segmento de abajo (x, z) girada, inclinada por lo que se estrecha. */
    const tx = (b0[0] - a0[0]) / largo;
    const tz = (b0[1] - a0[1]) / largo;
    let nx = tz;
    let nz = -tx;
    const hacia = (a0[0] + b0[0]) * nx + (a0[1] + b0[1]) * nz < 0 ? -1 : 1;
    nx *= hacia;
    nz *= hacia;
    const inclina = (r0 - r1) / Math.max(y1 - y0, 1e-6);
    const l = Math.hypot(1, inclina);
    const nnx = nx / l;
    const nny = inclina / l;
    const nnz = nz / l;
    const ia = m.vertice(cx + a0[0], y0, cz + a0[1], nnx, nny, nnz, u, y0);
    const ib = m.vertice(cx + b0[0], y0, cz + b0[1], nnx, nny, nnz, u + largo, y0);
    const ic = m.vertice(cx + b1[0], y1, cz + b1[1], nnx, nny, nnz, u + largo, y1);
    const id = m.vertice(cx + a1[0], y1, cz + a1[1], nnx, nny, nnz, u, y1);
    /* El sentido: que el producto de los lados mire hacia fuera. */
    const ux = b0[0] - a0[0];
    const uz = b0[1] - a0[1];
    const wy = y1 - y0;
    /* (b − a) × (d − a) ≈ (ux, 0, uz) × (…, wy, …): su parte horizontal es (−uz·wy, ·, ux·wy). */
    const fuera = -uz * wy * nx + ux * wy * nz > 0;
    if (fuera) {
      m.tri(ia, ib, ic);
      m.tri(ia, ic, id);
    } else {
      m.tri(ia, ic, ib);
      m.tri(ia, id, ic);
    }
    u += largo;
  }
  if (tapaArriba) {
    const idx = arriba.map(([x, z]) => m.vertice(cx + x, y1, cz + z, 0, 1, 0, cx + x, cz + z));
    for (let i = 1; i + 1 < n; i++) {
      const a = arriba[0] as P2;
      const b = arriba[i] as P2;
      const c = arriba[i + 1] as P2;
      /* Mirando arriba: (b − a) × (c − a) con y arriba es (·, (b.z − a.z)(c.x − a.x) − (b.x − a.x)(c.z − a.z), ·). */
      const y = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
      if (y > 0) m.tri(idx[0] as number, idx[i] as number, idx[i + 1] as number);
      else m.tri(idx[0] as number, idx[i + 1] as number, idx[i] as number);
    }
  }
}

/** UN PILAR en su caja, con los tramos de la sección de su grado y lo que su detalle le pone. */
function escribirElPilar(m: Molde, p: CajaXZ, alto: number, detalle: 0 | 1 | 2 | 3, grado: GradoDeLaCelda, eje: 'x' | 'z'): void {
  const cx = (p.x0 + p.x1) / 2;
  const cz = (p.z0 + p.z1) / 2;
  const lado = Math.min(p.x1 - p.x0, p.z1 - p.z0) / 2;
  const s = seccionDelViaducto(grado, alto);
  const hormigon = acabadoDelHormigon();
  tono(m, HORMIGON_DEL_VIADUCTO, hormigon);
  s.pilar.forEach((t, i) => {
    if (i === 0) {
      /* El plinto: la caja entera (es lo que se ve al pie); con bisel arriba desde N1. */
      if (detalle >= 1) m.cajaBiselada(cx - lado, 0, cz - lado, cx + lado, t.y1, cz + lado, detalle >= 2 ? 0.05 : 0.035, 'nseoa');
      else m.caja(cx - lado, 0, cz - lado, cx + lado, t.y1, cz + lado, 'nseoa');
      return;
    }
    const escala = lado / 0.5;
    prismaOchavado(m, cx, cz, t.y0, t.y1, t.r0 * escala, t.r1 * escala, t.chaflan);
  });
  if (detalle >= 2) {
    /* Los apoyos, en el hueco de 14 cm entre la cabeza del capitel y la viga (en g1 el capitel toca la viga). */
    const cabeza = s.pilar[s.pilar.length - 1] as TramoDelPilar;
    tono(m, JUNTA, ACABADO.caucho);
    for (const d of [-0.55, 0.55]) {
      const [ax, az] = eje === 'x' ? [cx, cz + d] : [cx + d, cz];
      m.caja(ax - 0.17, cabeza.y1, az - 0.17, ax + 0.17, alto, az + 0.17, 'nseo');
    }
  }
  if (detalle >= 1) {
    /* La bajante: un tubo metido medio centímetro en la cara de +través del fuste, del capitel al plinto: por
       fuera no pasa de la caja (0,495 de 0,5). */
    tono(m, TUBO, ACABADO.hierroViejo);
    const r = 0.04;
    const cara = FUSTE * (lado / 0.5);
    const d = cara + r - 0.005;
    const [bx, bz] = eje === 'x' ? [cx, cz + d] : [cx + d, cz];
    m.cilindro(bx, bz, 0.45, alto - 1.3, r, r, detalle >= 2 ? 6 : 4, false);
    if (detalle >= 3) {
      /* Las abrazaderas: de la cara del fuste a 2 mm de la de la caja. */
      const fuera = lado - 0.002;
      for (const y of [1.6, 3.4, 5.2]) {
        if (eje === 'x') m.caja(bx - 0.06, y, cz + cara, bx + 0.06, y + 0.05, cz + fuera, 'seoab');
        else m.caja(cx + cara, y, bz - 0.06, cx + fuera, y + 0.05, bz + 0.06, 'nseab');
      }
    }
  }
}

/** Un punto del tramo: `a` a lo largo del eje, `t` de través (desde la línea), `y` en altura. */
function enElTramo(tr: TramoDeViaducto, a: number, t: number, y: number): [number, number, number] {
  return tr.eje === 'x' ? [a, y, tr.linea + t] : [tr.linea + t, y, a];
}

/**
 * Un contorno (t, dy) corrido a lo largo del tramo, de `desde` a `hasta`, cara a cara (cerrado o abierto), con
 * la normal plana de cada cara y la UV de la cabecera (u a lo largo, v la altura o lo de través).
 */
function corrido(m: Molde, tr: TramoDeViaducto, contorno: readonly P2[], cerrado: boolean, desde: number, hasta: number): void {
  const n = contorno.length;
  const aristas = cerrado ? n : n - 1;
  for (let i = 0; i < aristas; i++) {
    const a = contorno[i] as P2;
    const b = contorno[(i + 1) % n] as P2;
    const dt = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dt, dy);
    if (l < 1e-6) continue;
    /* La normal en (t, y): la derecha del tramo recorrido antihorario, (dy, −dt). */
    const nt = dy / l;
    const ny = -dt / l;
    const deLado = Math.abs(ny) < 0.6;
    const [nx, nz] = tr.eje === 'x' ? [0, nt] : [nt, 0];
    const v = (q: P2): number => (deLado ? tr.alto + q[1] : tr.linea + q[0]);
    const p0 = enElTramo(tr, desde, a[0], tr.alto + a[1]);
    const p1 = enElTramo(tr, hasta, a[0], tr.alto + a[1]);
    const p2 = enElTramo(tr, hasta, b[0], tr.alto + b[1]);
    const p3 = enElTramo(tr, desde, b[0], tr.alto + b[1]);
    const i0 = m.vertice(p0[0], p0[1], p0[2], nx, ny, nz, desde, v(a));
    const i1 = m.vertice(p1[0], p1[1], p1[2], nx, ny, nz, hasta, v(a));
    const i2 = m.vertice(p2[0], p2[1], p2[2], nx, ny, nz, hasta, v(b));
    const i3 = m.vertice(p3[0], p3[1], p3[2], nx, ny, nz, desde, v(b));
    /* Con el eje en x (t es z) la cara mira hacia fuera con i0 i1 i2; con el eje en z (t es x) la sección se ve
       desde el otro lado y va al revés. */
    if (tr.eje === 'x') {
      m.tri(i0, i1, i2);
      m.tri(i0, i2, i3);
    } else {
      m.tri(i0, i3, i2);
      m.tri(i0, i2, i1);
    }
  }
}

/** Una caja corrida a lo largo del tramo: de t0 a t1 de través y de y0 a y1 (sobre `alto`), con las caras que se pidan (l, r, a, b: izquierda, derecha, arriba, abajo). */
function listonCorrido(m: Molde, tr: TramoDeViaducto, t0: number, t1: number, y0: number, y1: number, caras: string): void {
  const contorno: P2[] = [
    [t1, y0],
    [t1, y1],
    [t0, y1],
    [t0, y0],
  ];
  /* Las cuatro aristas antihorarias: derecha (r), arriba (a), izquierda (l), abajo (b). */
  const quiere = ['r', 'a', 'l', 'b'];
  for (let i = 0; i < 4; i++) {
    if (!caras.includes(quiere[i] as string)) continue;
    corrido(m, tr, [contorno[i] as P2, contorno[(i + 1) % 4] as P2], false, tr.desde, tr.hasta);
  }
}

/** LOS PILARES Y EL TRAMO DE VIGA de una celda (ver la cabecera): cede después de cada pilar y del tramo. */
export function* viaducto(obra: ObraDeLaCelda, v: ViaductoDeLaCelda): Generator<void, void, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const t = v.tramo;
  const detalle = detalleDelViaducto(obra.nivel, obra.grado);
  const grado: GradoDeLaCelda = detalle <= 1 ? 1 : obra.grado;
  const alto = t?.alto ?? ALTO_DEL_VIADUCTO;
  const eje = t?.eje ?? 'x';
  for (const p of v.pilares) {
    escribirElPilar(mo, p, alto, detalle, grado, eje);
    yield;
  }
  if (t === null || t.hasta - t.desde < 0.01) return;
  const s = seccionDelViaducto(grado, alto);
  const hormigon = acabadoDelHormigon();
  tono(mo, HORMIGON_DEL_VIADUCTO, hormigon);
  corrido(mo, t, s.viga, true, t.desde, t.hasta);
  /* Los petos: sus dos caras largas y la de arriba. */
  tono(mo, CHAPA_DEL_PETO, ACABADO.hierroViejo);
  for (const [t0, t1, y0, y1] of s.petos) listonCorrido(mo, t, t0, t1, y0, y1, 'lra');
  if (detalle >= 1) {
    /* Los carriles (el peto los tapa desde la calle: N0 no los paga). */
    tono(mo, CARRIL, ACABADO.hierro);
    for (const r of [-0.72, 0.72]) listonCorrido(mo, t, r - 0.04, r + 0.04, ARRIBA, ARRIBA + 0.12, 'lra');
  }
  if (detalle >= 2) {
    /* Las juntas cada 24 m: una tira oscura en el canto y en el alma de los dos lados. */
    tono(mo, JUNTA, ACABADO.caucho);
    for (let a = Math.ceil(t.desde / 24) * 24; a <= t.hasta; a += 24) {
      if (a - t.desde < 0.02 || t.hasta - a < 0.02) continue;
      /* Una arista del lado derecho (recorrida hacia arriba), 8 mm hacia fuera, y su gemela del izquierdo. */
      const juntaEn = (q0: P2, q1: P2): void => {
        const d = 0.008;
        corrido(mo, t, [[q0[0] + d, q0[1]], [q1[0] + d, q1[1]]], false, a - 0.012, a + 0.012);
        corrido(mo, t, [[-(q1[0] + d), q1[1]], [-(q0[0] + d), q0[1]]], false, a - 0.012, a + 0.012);
      };
      juntaEn([MEDIO_FONDO, 0], ALMA);
      /* En el canto, partida por la franja de luz (que va 2 mm por fuera): encima de ella, a lo lejos, las dos
         se pelearían por la profundidad y la franja saldría con una mota oscura cada 24 m. */
      const [fa, fb] = s.franja;
      juntaEn([MEDIO_ANCHO, 0.7], [MEDIO_ANCHO, fa - 0.004]);
      juntaEn([MEDIO_ANCHO, fb + 0.004], [MEDIO_ANCHO, ARRIBA]);
    }
  }
  if (detalle >= 3) {
    /* La bandeja de cables bajo el vuelo derecho y la pasarela sobre el tablero, junto al peto izquierdo. */
    tono(mo, TUBO, ACABADO.hierroViejo);
    listonCorrido(mo, t, 1.74, 1.88, 0.5, 0.62, 'rlb');
    tono(mo, CARRIL, ACABADO.hierro);
    listonCorrido(mo, t, -1.76, -1.2, ARRIBA, ARRIBA + 0.05, 'ra');
  }
  /* La franja de luz bajo el peto, por los dos lados: el Elevado se lee de noche desde cualquier calle. */
  em.color(0.16, 1.1, 0.85);
  em.poner('aEmisor', 0, 0);
  const [f0, f1] = s.franja;
  const fuera = s.medioAncho + 0.01;
  corrido(em, t, [[fuera, f0], [fuera, f1]], false, t.desde, t.hasta);
  corrido(em, t, [[-fuera, f1], [-fuera, f0]], false, t.desde, t.hasta);
  yield;
}

/** EL VIADUCTO DE UNA CELDA (el escritor de su familia, ver `celdas.ts`): su tramo y sus pilares, que estorban. */
export function* viaductoDeLaCelda(obra: ObraDeLaCelda, parte: ParteDeLaCelda): Generator<void, void, void> {
  yield* viaducto(obra, { tramo: parte.viaducto, pilares: parte.pilares });
  obra.estorba.push(...parte.pilares);
}
