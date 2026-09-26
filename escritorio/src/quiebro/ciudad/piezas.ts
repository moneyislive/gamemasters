/**
 * LAS PIEZAS QUE TRAE LA CIUDAD ABIERTA: las cajas nuevas del contrato (`TipoDeCajaDeLaCiudad` de
 * `quiebro-ciudad.ts`) y lo que la ciudad pinta sin caja.
 *
 *   · Con caja (estorban, y se pintan DENTRO de ella hasta la cabeza, como el mobiliario del barrio):
 *     el tronco del Bulevar, la estatua de la Porticada, los contenedores, la carretilla y el muelle del
 *     Patio de carga, el corte de obra de la noche y los pilares del soportal de una plaza.
 *   · Sin caja (van por encima de la cabeza): la copa del árbol y el techo del soportal de la plaza. La farola
 *     de pared va en `farolas.ts`, y el tramo del viaducto del Elevado, en `viaducto.ts`.
 *
 * Todo al mobiliario (color y acabado por vértice), a lo emisivo y, lo que lleva vidrio, al cristal: son
 * las mismas tres llamadas de siempre. Las medidas salen de la caja; el aspecto, del hash de su sitio,
 * igual en todos los aparatos. Cada pieza es un escritor de pieza (`EscritorDePieza` de `celdas.ts`): escribe
 * en los moldes de su obra, cede y devuelve sus luces.
 *
 * ═══ EL GRADO (plan del detalle, §3.1), Y LA HECHURA ═══
 *
 * Cada pieza sube su silueta con el grado de su celda, dentro de sus topes (árbol 120 / 350 / 650 triángulos,
 * estatua 120 / 400 / 1.500, contenedor 132 / 200 / 400) y sin salirse de su caja por debajo de 1,9 m. Como las
 * farolas, por su HECHURA (`hechuraDe` de `farolas.ts`): el grado 3 de N2 se queda a medio camino (el árbol) o dibuja
 * el grado 2 (lo demás), porque el libro de N2 no da para el grado 3 de N3 en su bloque de 2 × 2.
 *
 *   · EL ÁRBOL deja de ser un rombo en todos los niveles: tronco en torno con su pie (dentro de su caja de 0,5
 *     hasta 2,6 m), ramas por encima de 2,6 m (hechura 2+) y una copa de GRUMOS (icosaedros achatados y abollados,
 *     cada uno con su verde, su giro y sus normales ESFÉRICAS, un tercio vueltas hacia fuera de la copa entera para
 *     que la farola la ilumine como un volumen y no como bolas sueltas), 2-3 en grado 1 y de 6 a 16 después, en la
 *     cáscara de la copa con el ángulo de oro. Los vértices que miran hacia dentro de la copa, más oscuros (la
 *     oclusión, horneada en el color); los de abajo no: de noche la copa se ve desde abajo, que es lo que ilumina la
 *     farola. Familia `follaje` de la materia: la hoja y los huecos oscuros sin transparencia, y la corteza del
 *     plátano (`materia/familias/follaje.ts`).
 *   · LA ESTATUA: pedestal en tres cuerpos (con molduras corridas desde g2, biselado en g3) y la figura en torno
 *     de sección elíptica (más ancha de hombros que de pecho), con la cabeza aparte y dos brazos; en g3, en dos
 *     pasos (el pedestal y la figura).
 *   · EL CONTENEDOR: en g1 lo de siempre; en g2 los postes de esquina, los largueros y la raya de las puertas;
 *     en g3 la chapa ondulada de verdad en los costados, las cantoneras de arriba y las levas de las barras.
 *   · LA CARRETILLA, EL MUELLE Y EL CORTE, con biseles desde g2: la carretilla con sus ruedas de goma, el muelle
 *     con su canto de acero y sus topes, el corte con su montón de tierra en torno y la chapa de obra.
 *
 * El acabado va por familia (`acabado` de `materia/familias.ts`), sin marca de chaflán: el material de hoy no la
 * sabe leer (ver `farolas.ts`, `FUNDICION_PINTADA`).
 */
import * as THREE from 'three';
import type { Molde, P2, V3 } from './geometria';
import { acabado, FAMILIA } from './materia/familias';
import { ACABADO, lineal } from './materiales';
import type { LuzDelMobiliario, Rgb } from './mobiliario';
import { GRANITO, H, HORMIGON, barrerasDeObra, bloque, colocar, tono } from './mobiliario';
import { FUNDICION_PINTADA, hechuraDe, por, tornear, tubo } from './farolas';
import type { AnilloDelTorno, Hechura } from './farolas';
import type { CajaXZ, PiezaConFrente } from './tipos';
import { azarEn } from './azar';
import type { ObraDeLaCelda } from './celdas';

function centro(c: CajaXZ): [number, number] {
  return [(c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2];
}

/**
 * El grado con que se DIBUJA una pieza sin hechura intermedia (la estatua, el contenedor, la carretilla, el muelle y
 * el corte): el de su celda, salvo el grado 3 de N2, que dibuja el 2 (ver `hechuraDe` en `farolas.ts`).
 */
function gradoDeDibujo(obra: ObraDeLaCelda): 1 | 2 | 3 {
  const h = hechuraDe(obra);
  return h === 1 ? 1 : h === 4 ? 3 : 2;
}

/** El largo (a lo largo de `mira` girado 90°) y el fondo de una pieza con frente, en su caja. */
function medidas(p: PiezaConFrente): { largo: number; fondo: number } {
  const w = p.caja.x1 - p.caja.x0;
  const d = p.caja.z1 - p.caja.z0;
  const frenteEnX = p.mira === 'n' || p.mira === 's';
  return { largo: frenteEnX ? w : d, fondo: frenteEnX ? d : w };
}

/* ═══════════════════════════════ LOS ACABADOS ═══════════════════════════════ */

/** La hoja: familia `follaje`, algo satinada (mojada, lo que mira al cielo brilla más: lo pone el material). */
const ACABADO_DE_LA_HOJA = acabado(FAMILIA.follaje, 0.72, 0);
/** La corteza: la misma familia (la distingue del color: la hoja es verde, la corteza no). */
const ACABADO_DE_LA_CORTEZA = acabado(FAMILIA.follaje, 0.9, 0);
const ACABADO_DE_LA_PIEDRA = acabado(FAMILIA.piedra, 0.75, 0);
const ACABADO_DEL_HORMIGON = acabado(FAMILIA.hormigon, 0.85, 0);
const ACABADO_DEL_CAUCHO = acabado(FAMILIA.caucho, 0.9, 0);
const ACABADO_DE_LA_CHAPA_ONDULADA = acabado(FAMILIA.chapaOndulada, 0.55, 0);
const ACABADO_DE_LA_CHAPA = acabado(FAMILIA.chapa, 0.45, 0);
/**
 * El acero (galvanizado, o pintado de gris): poco metal. Con 0,55 de metal y un 4 % de color, el canto del muelle salía
 * negro puro de noche, como el poste de la M antes de `FUNDICION_PINTADA`: el metal oscuro sólo refleja lo que tiene
 * delante, y de noche no hay nada.
 */
const ACABADO_DEL_ACERO = acabado(FAMILIA.liso, 0.6, 0.15);
const ACABADO_DE_LA_TIERRA = acabado(FAMILIA.liso, 0.95, 0);
/**
 * El bronce con su pátina: la pátina (el cardenillo) no es metal, así que poco metal; liso (ninguna familia le
 * pondría pintura). Con 0,35 de metal, la placa y la cabeza salían negro puro en la plaza sin farola.
 */
const ACABADO_DEL_BRONCE = acabado(FAMILIA.liso, 0.55, 0.15);

/* ═══════════════════════════════ EL ÁRBOL DEL BULEVAR ═══════════════════════════════ */

/** La corteza del plátano (rojo por encima del verde: así la separa de la hoja la familia `follaje`). */
const CORTEZA: Rgb = lineal(0x544d3d);
const CORTEZA_DEL_PIE: Rgb = lineal(0x302c24);
/** Los verdes de la copa, uno por grumo (el verde por encima del rojo y del azul: es hoja). */
const HOJAS: readonly Rgb[] = [0x2b4a23, 0x345326, 0x2a4527, 0x3b5528, 0x264022, 0x31502a].map(lineal);

/** Los grumos de la copa en grado 1, por nivel (N0 dos; N1 en adelante, tres). */
export const GRUMOS_EN_GRADO_1_POR_NIVEL: Readonly<Record<0 | 1 | 2 | 3, number>> = { 0: 2, 1: 3, 2: 3, 3: 3 };
/**
 * Grumos y ramas por hechura (`hechuraDe` de `farolas.ts`; en la 1, los grumos de arriba por nivel). Las ramas, las
 * 3-7 de la ficha desde la hechura 2. En la 1 (N0 y N1) no hay: la regla contra el temblor de §3.1 pide en N1 piezas de
 * 25 cm como poco, y una rama de 25 cm es otro tronco.
 */
const GRUMOS_POR_HECHURA: Readonly<Record<Hechura, number>> = { 1: 3, 2: 6, 3: 9, 4: 16 };
const RAMAS_POR_HECHURA: Readonly<Record<Hechura, number>> = { 1: 0, 2: 3, 3: 3, 4: 5 };
/**
 * El radio de las ramas por hechura, con la regla contra el temblor (§3.1): la hechura 2 es el grado 2 de N2 y N3
 * (18 y 14 cm como poco), la 3 el grado 3 de N2 (9 cm) y la 4 el grado 3 de N3 (6 cm).
 */
const RADIO_DE_LAS_RAMAS: Readonly<Record<Hechura, number>> = { 1: 0.09, 2: 0.09, 3: 0.065, 4: 0.07 };

/** Los doce vértices del icosaedro, en la esfera unidad. */
const ICOSAEDRO: readonly V3[] = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  const crudos: V3[] = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ];
  return crudos.map((v) => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l] as V3;
  });
})();
/** Sus veinte caras (el orden de cada una se comprueba al escribirla: hacia fuera). */
const CARAS_DEL_ICOSAEDRO: readonly (readonly [number, number, number])[] = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
];

/** Lo que la copa pesa en la normal de cada grumo (menos de la mitad: ninguna cara queda al revés de su normal). */
const PESO_DE_LA_COPA = 0.35;

/**
 * UN GRUMO DE FOLLAJE: un icosaedro de radio `r` achatado a `achatado`, girado `giro` alrededor de y, con centro
 * `c`. Normales esféricas (las del icosaedro sin achatar), mezcladas con las de la copa entera (`copa`). El color
 * va de `abajo` (los vértices que miran abajo o hacia dentro de la copa) a `arriba`. La UV es una proyección de la
 * posición de mundo (la que lee la familia `follaje` para el ruido de la hoja). 20 triángulos.
 */
function grumo(m: Molde, c: V3, r: number, achatado: number, giro: number, copa: V3, arriba: Rgb, abajo: Rgb, semilla: number): void {
  const cg = Math.cos(giro);
  const sg = Math.sin(giro);
  const fuera: V3 = (() => {
    const v: V3 = [c[0] - copa[0], (c[1] - copa[1]) * 0.6, c[2] - copa[2]];
    const l = Math.hypot(v[0], v[1], v[2]);
    return l > 1e-6 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 1, 0];
  })();
  const pos: V3[] = [];
  const indices: number[] = [];
  for (let iv = 0; iv < ICOSAEDRO.length; iv++) {
    const v = ICOSAEDRO[iv] as V3;
    const vx = v[0] * cg - v[2] * sg;
    const vz = v[0] * sg + v[2] * cg;
    /* Cada vértice, un poco más dentro o fuera: el contorno deja de ser un icosaedro (la normal sigue esférica). */
    const rv = r * (0.74 + 0.42 * azarEn(semilla, iv, 0x9e));
    const p: V3 = [c[0] + vx * rv, c[1] + v[1] * rv * achatado, c[2] + vz * rv];
    pos.push(p);
    const dc: V3 = [p[0] - copa[0], p[1] - copa[1], p[2] - copa[2]];
    const lc = Math.hypot(dc[0], dc[1], dc[2]) || 1;
    let nx = (1 - PESO_DE_LA_COPA) * vx + (PESO_DE_LA_COPA * dc[0]) / lc;
    let ny = (1 - PESO_DE_LA_COPA) * v[1] + (PESO_DE_LA_COPA * dc[1]) / lc;
    let nz = (1 - PESO_DE_LA_COPA) * vz + (PESO_DE_LA_COPA * dc[2]) / lc;
    const ln = Math.hypot(nx, ny, nz) || 1;
    nx /= ln;
    ny /= ln;
    nz /= ln;
    /* La oclusión: lo que mira hacia dentro de la copa, más oscuro. No lo de abajo: de noche la copa se ve desde
       abajo y es lo que ilumina la farola. */
    const luz = Math.min(1, Math.max(0, 0.62 + 0.38 * (vx * fuera[0] + v[1] * fuera[1] + vz * fuera[2]) + 0.08 * v[1]));
    m.color(abajo[0] + (arriba[0] - abajo[0]) * luz, abajo[1] + (arriba[1] - abajo[1]) * luz, abajo[2] + (arriba[2] - abajo[2]) * luz);
    indices.push(m.vertice(p[0], p[1], p[2], nx, ny, nz, p[0] + 0.7 * p[1], p[2] - 0.5 * p[1]));
  }
  for (const [a, b, d] of CARAS_DEL_ICOSAEDRO) {
    const pa = pos[a] as V3;
    const pb = pos[b] as V3;
    const pd = pos[d] as V3;
    const ux = pb[0] - pa[0];
    const uy = pb[1] - pa[1];
    const uz = pb[2] - pa[2];
    const wx = pd[0] - pa[0];
    const wy = pd[1] - pa[1];
    const wz = pd[2] - pa[2];
    const gx = (pa[0] + pb[0] + pd[0]) / 3 - c[0];
    const gy = (pa[1] + pb[1] + pd[1]) / 3 - c[1];
    const gz = (pa[2] + pb[2] + pd[2]) / 3 - c[2];
    const hacia = (uy * wz - uz * wy) * gx + (uz * wx - ux * wz) * gy + (ux * wy - uy * wx) * gz;
    const ia = indices[a] as number;
    const ib = indices[b] as number;
    const id = indices[d] as number;
    if (hacia >= 0) m.tri(ia, ib, id);
    else m.tri(ia, id, ib);
  }
}

/**
 * EL ÁRBOL DEL BULEVAR, un plátano de sombra podado: el tronco dentro de su caja hasta 2,6 m (más, hasta la copa),
 * las ramas que abren la copa por encima de 2,6 m y la copa de grumos, de 2 a 2,6 m de radio. Ver la cabecera.
 */
export function* arbol(obra: ObraDeLaCelda, c: CajaXZ): Generator<void, void, void> {
  const mo = obra.m.mobiliario;
  const hechura = hechuraDe(obra);
  const [x, z] = centro(c);
  const r = Math.min(c.x1 - c.x0, c.z1 - c.z0) / 2 - 0.02;
  const h = azarEn(Math.round(x * 4), Math.round(z * 4), 0xa2b);
  const rc = 2.0 + h * 0.6;
  const altoDeLaCopa = 4.7 + h * 0.5;
  const copa: V3 = [x, H + altoDeLaCopa, z];
  const giro = azarEn(Math.round(x * 4), Math.round(z * 4), 0x51) * Math.PI * 2;

  /* El tronco: el pie más oscuro (el barro de la mediana) y la corteza arriba; entra en la copa. */
  tono(mo, CORTEZA, ACABADO_DE_LA_CORTEZA);
  const pie = por(CORTEZA_DEL_PIE, 1);
  const tronco: AnilloDelTorno[] =
    hechura === 1
      ? [
          { r, y: H, color: pie },
          { r: r * 0.66, y: H + 3.2, color: CORTEZA },
        ]
      : hechura === 2
        ? [
            { r, y: H, color: pie },
            { r: r * 0.86, y: H + 0.25, color: por(CORTEZA, 0.8) },
            { r: r * 0.64, y: H + 3.1, color: CORTEZA },
          ]
        : hechura === 3
          ? [
              { r, y: H, color: pie },
              { r: r * 0.86, y: H + 0.25, color: por(CORTEZA, 0.8) },
              { r: r * 0.68, y: H + 2.6, color: CORTEZA },
              { r: r * 0.55, y: H + 3.2, color: por(CORTEZA, 0.85) },
            ]
          : [
              { r, y: H, color: pie },
              { r: r * 0.88, y: H + 0.14, color: por(CORTEZA, 0.75) },
              { r: r * 0.77, y: H + 0.55, color: por(CORTEZA, 0.92) },
              { r: r * 0.67, y: H + 2.5, color: CORTEZA },
              /* La cabeza de la poda: el tronco se hincha donde nacen las ramas. */
              { r: r * 0.74, y: H + 2.85, color: CORTEZA },
              { r: r * 0.5, y: H + 3.3, color: por(CORTEZA, 0.85) },
            ];
  tornear(mo, x, z, tronco, hechura === 1 ? (obra.lados <= 6 ? 5 : 6) : hechura === 2 ? 7 : hechura === 3 ? 8 : 10, { giro });

  /* Los grumos: una corona baja alrededor, otra más alta y uno encima. */
  const n = hechura === 1 ? GRUMOS_EN_GRADO_1_POR_NIVEL[obra.nivel] : GRUMOS_POR_HECHURA[hechura];
  const grumos: { c: V3; r: number }[] = [];
  if (n <= 3) {
    /* Pocos y grandes: el primero, alto y en medio; los otros, a los lados y más bajos. */
    grumos.push({ c: [x + Math.cos(giro) * 0.3, H + altoDeLaCopa + 0.35, z + Math.sin(giro) * 0.3], r: rc * (n === 2 ? 0.92 : 0.82) });
    for (let i = 1; i < n; i++) {
      const a = giro + Math.PI * (0.35 + ((i - 1) * 2) / Math.max(1, n - 1));
      const d = rc * 0.48;
      grumos.push({ c: [x + Math.cos(a) * d, H + altoDeLaCopa - 0.35, z + Math.sin(a) * d], r: rc * 0.7 });
    }
  } else {
    /*
     * Muchos y más pequeños, en la cáscara de un elipsoide de copa (de arriba abajo, sin llegar al fondo) con el
     * ángulo de oro entre uno y el siguiente: el contorno sale abollado, como una copa, y no en bolas. Los de abajo,
     * al final de la lista: a ellos van las ramas. El más bajo queda por encima de 3,3 m.
     */
    const radio = rc * (n >= 16 ? 0.4 : n >= 9 ? 0.46 : 0.52);
    grumos.push({ c: [x, H + altoDeLaCopa + rc * 0.42, z], r: radio * 1.1 });
    for (let i = 0; i < n - 1; i++) {
      const t = (i + 0.5) / (n - 1);
      const polar = Math.acos(1 - 1.55 * t);
      const az = giro + i * 2.39996;
      const k = azarEn(i, Math.round(x * 4), Math.round(z * 4), 0x72);
      const d = rc * (0.6 + 0.12 * k);
      grumos.push({ c: [x + Math.sin(polar) * Math.cos(az) * d, H + altoDeLaCopa + Math.cos(polar) * rc * 0.36, z + Math.sin(polar) * Math.sin(az) * d], r: radio * (0.85 + 0.3 * k) });
    }
  }

  /* Las ramas (hechura 2+): de la cabeza del tronco a los grumos de abajo, abriéndose. Todo por encima de 2,6 m. */
  const ramas = RAMAS_POR_HECHURA[hechura];
  const g = hechura === 4 ? 3 : 2;
  if (ramas > 0) {
    tono(mo, por(CORTEZA, 0.9), ACABADO_DE_LA_CORTEZA);
    for (let i = 0; i < ramas; i++) {
      /* Los grumos más bajos son los últimos de la lista; cada rama, a uno distinto. */
      const destino = grumos[grumos.length - 1 - ((i * 3) % Math.max(1, grumos.length - 1))] ?? grumos[0];
      if (destino === undefined) continue;
      const [gx, gy, gz] = destino.c;
      const vx = gx - x;
      const vz = gz - z;
      const d = Math.hypot(vx, vz) || 1;
      const ux = vx / d;
      const uz = vz / d;
      const arranque: V3 = [x + ux * r * 0.3, H + 2.7 + 0.08 * i, z + uz * r * 0.3];
      const codo: V3 = [x + ux * d * 0.45, H + 3.3 + 0.1 * i, z + uz * d * 0.45];
      const fin: V3 = [x + ux * d * 0.8, gy - 0.1, z + uz * d * 0.8];
      const puntos: V3[] = g === 2 ? [arranque, codo, fin] : [arranque, [(arranque[0] + codo[0]) / 2, H + 3.0 + 0.09 * i, (arranque[2] + codo[2]) / 2], codo, fin];
      tubo(mo, puntos, RADIO_DE_LAS_RAMAS[hechura], g === 2 ? 4 : 5);
    }
  }

  /* La copa: cada grumo con su verde, su giro y su achatado. */
  for (let i = 0; i < grumos.length; i++) {
    const gr = grumos[i] as { c: V3; r: number };
    const k = azarEn(i, Math.round(x * 4), Math.round(z * 4), 0x6b);
    const verde = HOJAS[Math.floor(k * HOJAS.length) % HOJAS.length] as Rgb;
    tono(mo, verde, ACABADO_DE_LA_HOJA);
    grumo(mo, gr.c, gr.r, 0.7 + 0.12 * k, giro + k * 2.1, copa, por(verde, 1.12), por(verde, 0.55), Math.round(x * 4) * 131 + Math.round(z * 4) * 7 + i);
  }
  yield;
}

/* ═══════════════════════════════ LA ESTATUA ═══════════════════════════════ */

const BRONCE: Rgb = lineal(0x485a49);
const BRONCE_OSCURO: Rgb = lineal(0x3a473c);

/** La figura: un torno (r, y) de un hombre con levita, desde la peana. La sección es elíptica (ver `estatua`). */
const FIGURA_POR_GRADO: Readonly<Record<1 | 2 | 3, readonly P2[]>> = {
  1: [
    [0.36, 0],
    [0.3, 0.1],
    [0.21, 1.0],
    [0.27, 1.45],
    [0.09, 1.62],
    [0.13, 1.78],
    [0, 1.97],
  ],
  2: [
    [0.36, 0],
    [0.36, 0.07],
    [0.31, 0.1],
    [0.27, 0.6],
    [0.21, 1.0],
    [0.25, 1.3],
    [0.27, 1.48],
    [0.1, 1.6],
  ],
  3: [
    [0.37, 0],
    [0.37, 0.07],
    [0.32, 0.1],
    [0.3, 0.2],
    [0.28, 0.45],
    [0.24, 0.8],
    [0.2, 1.0],
    [0.215, 1.12],
    [0.245, 1.3],
    [0.265, 1.42],
    [0.26, 1.5],
    [0.17, 1.56],
    [0.085, 1.6],
  ],
};
const CABEZA_POR_GRADO: Readonly<Record<2 | 3, readonly P2[]>> = {
  2: [
    [0.07, 1.6],
    [0.1, 1.66],
    [0.12, 1.76],
    [0.1, 1.88],
    [0, 1.96],
  ],
  3: [
    [0.075, 1.59],
    [0.085, 1.64],
    [0.115, 1.69],
    [0.125, 1.76],
    [0.115, 1.85],
    [0.08, 1.92],
    [0, 1.96],
  ],
};

/** LA ESTATUA de la plaza: pedestal de granito que llena la caja y la figura de bronce encima. Ver la cabecera. */
export function* estatua(obra: ObraDeLaCelda, c: CajaXZ): Generator<void, void, void> {
  const mo = obra.m.mobiliario;
  const g = gradoDeDibujo(obra);
  const [x, z] = centro(c);
  const ax = c.x1 - c.x0 - 0.04;
  const az = c.z1 - c.z0 - 0.04;
  /* El pedestal: basa, dado y cornisa. */
  tono(mo, GRANITO, ACABADO_DE_LA_PIEDRA);
  if (g === 3) mo.cajaBiselada(x - ax / 2, H, z - az / 2, x + ax / 2, H + 0.3, z + az / 2, 0.03, 'nseoa');
  else bloque(mo, x, H, z, ax, 0.3, az, 'nseoa');
  if (g === 3) {
    /* El escalón de la peana. */
    tono(mo, por(GRANITO, 0.92), ACABADO_DE_LA_PIEDRA);
    bloque(mo, x, H + 0.3, z, ax - 0.16, 0.12, az - 0.16, 'nseoa');
  }
  tono(mo, por(GRANITO, 1.08), ACABADO_DE_LA_PIEDRA);
  const dado = g === 3 ? 0.42 : 0.3;
  if (g === 3) mo.cajaBiselada(x - (ax - dado) / 2, H + 0.3, z - (az - dado) / 2, x + (ax - dado) / 2, H + 1.8, z + (az - dado) / 2, 0.02, 'nseo');
  else bloque(mo, x, H + 0.3, z, ax - dado, 1.5, az - dado, 'nseo');
  if (g >= 2) {
    const perfil: P2[] = [
      [0, 0],
      [0.06, 0],
      [0.05, 0.04],
      [0, 0.1],
    ];
    const lado = ax - dado;
    const s = lado / 2;
    const sz = (az - dado) / 2;
    const corrida = (y: number, p: readonly P2[]): void =>
      mo.extruirPerfil(
        [
          [x + s, H + y, z - sz],
          [x - s, H + y, z - sz],
          [x - s, H + y, z + sz],
          [x + s, H + y, z + sz],
        ],
        p,
        { cerrado: true },
      );
    corrida(g === 3 ? 0.42 : 0.3, perfil);
    /* Bajo la cornisa, la moldura al revés (del dado sale hacia arriba y fuera). */
    corrida(1.7, [
      [0, 0],
      [0.02, 0.05],
      [0.05, 0.1],
      [0, 0.1],
    ]);
  }
  tono(mo, GRANITO, ACABADO_DE_LA_PIEDRA);
  if (g === 3) mo.cajaBiselada(x - (ax - 0.1) / 2, H + 1.8, z - (az - 0.1) / 2, x + (ax - 0.1) / 2, H + 2.0, z + (az - 0.1) / 2, 0.025);
  else bloque(mo, x, H + 1.8, z, ax - 0.1, 0.2, az - 0.1);
  if (g === 3) {
    /* La placa de bronce del frente (hacia +z). */
    tono(mo, BRONCE_OSCURO, ACABADO_DEL_BRONCE);
    mo.caja(x - 0.3, H + 0.95, z + (az - dado) / 2, x + 0.3, H + 1.3, z + (az - dado) / 2 + 0.015, 'seoab');
    /* En g3 la figura va en su propio paso: el pedestal ya es un trozo. */
    yield;
  }

  /* La figura: capa larga, torso, hombros y cabeza, de sección elíptica (hombros de 1,3 veces el fondo); un brazo
     que señala y otro recogido. Estilizada: se ve a contraluz. */
  const y0 = H + 2.0;
  const figura = FIGURA_POR_GRADO[g];
  const ladosDeLaFigura = g === 1 ? 6 : g === 2 ? 10 : 16;
  const ancho = (k: number, lados: number): number => 1 + 0.16 * Math.cos((4 * Math.PI * k) / lados);
  const colores = figura.map(([, y]) => por(BRONCE, 0.8 + 0.35 * (y / 2)));
  tono(mo, BRONCE, ACABADO_DEL_BRONCE);
  tornear(
    mo,
    x,
    z,
    figura.map(([r, y], i) => ({ r, y: y0 + y, color: colores[i] as Rgb })),
    ladosDeLaFigura,
    /* En g2-g3 la cabeza va aparte: el cuello se cierra por arriba (si no, se vería por dentro desde lo alto). */
    { radioDelSector: (k) => ancho(k, ladosDeLaFigura), tapaArriba: g >= 2 },
  );
  if (g !== 1) {
    const cabeza = CABEZA_POR_GRADO[g];
    tornear(
      mo,
      x,
      z,
      cabeza.map(([r, y]) => ({ r, y: y0 + y, color: por(BRONCE, 1.2) })),
      g === 2 ? 8 : 10,
    );
  }
  tono(mo, por(BRONCE, 1.1), ACABADO_DEL_BRONCE);
  /* El brazo que señala (el de siempre, hacia +x y −z), y el recogido (g2+). */
  const ladosDelBrazo = g === 1 ? 4 : g === 2 ? 5 : 6;
  const brazo: V3[] =
    g === 3
      ? [
          [x + 0.24, y0 + 1.45, z],
          [x + 0.36, y0 + 1.5, z - 0.08],
          [x + 0.52, y0 + 1.62, z - 0.22],
          [x + 0.68, y0 + 1.76, z - 0.36],
          [x + 0.84, y0 + 1.9, z - 0.46],
          [x + 0.92, y0 + 1.95, z - 0.5],
        ]
      : g === 2
        ? [
            [x + 0.24, y0 + 1.45, z],
            [x + 0.5, y0 + 1.62, z - 0.2],
            [x + 0.72, y0 + 1.8, z - 0.38],
            [x + 0.88, y0 + 1.92, z - 0.48],
          ]
        : [
            [x + 0.2, y0 + 1.45, z],
            [x + 0.55, y0 + 1.65, z - 0.2],
            [x + 0.85, y0 + 1.9, z - 0.45],
          ];
  tubo(mo, brazo, g === 3 ? 0.065 : 0.07, ladosDelBrazo);
  if (g >= 2) {
    const recogido: V3[] =
      g === 3
        ? [
            [x - 0.25, y0 + 1.46, z],
            [x - 0.3, y0 + 1.3, z + 0.04],
            [x - 0.3, y0 + 1.12, z + 0.1],
            [x - 0.2, y0 + 1.05, z + 0.2],
            [x - 0.08, y0 + 1.08, z + 0.24],
          ]
        : [
            [x - 0.25, y0 + 1.46, z],
            [x - 0.3, y0 + 1.2, z + 0.06],
            [x - 0.18, y0 + 1.05, z + 0.2],
            [x - 0.05, y0 + 1.08, z + 0.24],
          ];
    tubo(mo, recogido, 0.065, ladosDelBrazo);
  }
  if (g === 3) {
    /* El libro que lleva contra el pecho. */
    tono(mo, BRONCE_OSCURO, ACABADO_DEL_BRONCE);
    mo.con(new THREE.Matrix4().makeRotationY(-0.35).setPosition(x - 0.08, y0 + 1.1, z + 0.25), () => {
      mo.caja(-0.1, 0, -0.03, 0.1, 0.26, 0.03, 'nseoab');
    });
  }
  yield;
}

/* ═══════════════════════════════ EL CONTENEDOR ═══════════════════════════════ */

const CONTENEDORES: readonly Rgb[] = [0x7a3326, 0x2a4c68, 0x365532, 0x8a6a2a, 0x575b5e].map(lineal);

/**
 * UN COSTADO DE CHAPA ONDULADA: el costado del contenedor que mira a `hacia` (1 al lado mayor del eje de fondo, −1
 * al menor), de `a0` a `a1` por su largo, en `plano` (la coordenada de fondo de la cara de fuera), de `y0` a `y1`.
 * Trapecios de `paso` metros: la cresta sale `hondo` hacia fuera. `enX`: el largo va por x. Tiras verticales
 * planas, dos triángulos cada una.
 */
function chapaOndulada(m: Molde, a0: number, a1: number, plano: number, hacia: 1 | -1, y0: number, y1: number, paso: number, hondo: number, enX: boolean): void {
  const ondas = Math.max(1, Math.round((a1 - a0) / paso));
  const pasoReal = (a1 - a0) / ondas;
  /* El perfil de una onda: valle, subida, cresta, bajada. */
  const perfil: P2[] = [];
  for (let i = 0; i < ondas; i++) {
    const b = a0 + i * pasoReal;
    perfil.push([b, 0], [b + pasoReal * 0.22, hondo], [b + pasoReal * 0.5, hondo], [b + pasoReal * 0.72, 0]);
  }
  perfil.push([a1, 0]);
  /* Un punto (a lo largo, fuera, y) en el mundo. */
  const w = (a: number, f: number, y: number): V3 => (enX ? [a, y, plano + hacia * f] : [plano + hacia * f, y, a]);
  for (let i = 0; i + 1 < perfil.length; i++) {
    const [pa, fa] = perfil[i] as P2;
    const [pb, fb] = perfil[i + 1] as P2;
    const da = pb - pa;
    const df = fb - fa;
    const l = Math.hypot(da, df);
    if (l < 1e-6) continue;
    /* La normal en el plano (largo, fuera): hacia fuera del contenedor. */
    let na = -df / l;
    let nf = da / l;
    if (nf < 0) {
      na = -na;
      nf = -nf;
    }
    const n: V3 = enX ? [na, 0, hacia * nf] : [hacia * nf, 0, na];
    const q0 = w(pa, fa, y0);
    const q1 = w(pb, fb, y0);
    const q2 = w(pb, fb, y1);
    const q3 = w(pa, fa, y1);
    /* Antihorario visto desde fuera: se comprueba con la normal y se da la vuelta si hace falta. */
    const ux = q1[0] - q0[0];
    const uy = q1[1] - q0[1];
    const uz = q1[2] - q0[2];
    const vx = q2[0] - q0[0];
    const vy = q2[1] - q0[1];
    const vz = q2[2] - q0[2];
    const bien = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] >= 0;
    if (bien) m.quad(q0, q1, q2, q3, n, [pa, y0, pb, y0, pb, y1, pa, y1]);
    else m.quad(q1, q0, q3, q2, n, [pb, y0, pa, y0, pa, y1, pb, y1]);
  }
}

/**
 * UN CONTENEDOR de carga: la caja de chapa con sus nervios por los costados largos y las puertas en el
 * extremo que mira a `mira` (o en el de más x o más z, si el frente es un costado). Llena su caja. Ver la cabecera.
 */
export function* contenedor(obra: ObraDeLaCelda, p: PiezaConFrente): Generator<void, void, void> {
  const mo = obra.m.mobiliario;
  const g = gradoDeDibujo(obra);
  const c = p.caja;
  const [x, z] = centro(c);
  const h = azarEn(Math.round(x * 4), Math.round(z * 4), 0xc0e);
  const color = CONTENEDORES[Math.floor(h * CONTENEDORES.length) % CONTENEDORES.length] as Rgb;
  const alto = 2.55;
  const enX = c.x1 - c.x0 >= c.z1 - c.z0;
  const extremoAlto = p.mira === 'e' || p.mira === 's';
  /*
   * El cuerpo. En g3 los costados largos son de chapa ondulada, y la caja sigue cerrada 1 cm por detrás de sus valles:
   * la chapa es una tira abierta por arriba y por abajo, y sin la caja detrás, entre ella y los largueros se veía el
   * cielo de lado a lado del contenedor (lo vigila la (i) de `verify:quiebro-ciudad`).
   */
  tono(mo, color, ACABADO_DE_LA_CHAPA_ONDULADA);
  if (g === 3) {
    const dx = enX ? 0.02 : 0.03;
    const dz = enX ? 0.03 : 0.02;
    mo.caja(c.x0 + dx, H, c.z0 + dz, c.x1 - dx, H + alto, c.z1 - dz, 'nseoa');
  } else mo.caja(c.x0 + 0.02, H, c.z0 + 0.02, c.x1 - 0.02, H + alto, c.z1 - 0.02);
  const largo = enX ? c.x1 - c.x0 : c.z1 - c.z0;
  const a0 = enX ? c.x0 : c.z0;
  if (g === 3) {
    tono(mo, por(color, 0.9), ACABADO_DE_LA_CHAPA_ONDULADA);
    const f0 = enX ? c.z0 + 0.02 : c.x0 + 0.02;
    const f1 = enX ? c.z1 - 0.02 : c.x1 - 0.02;
    /* De larguero a larguero (de H + 0,1 a H + alto − 0,1), sin hueco entre ellos. */
    chapaOndulada(mo, a0 + 0.14, a0 + largo - 0.14, f0, -1, H + 0.1, H + alto - 0.1, 0.4, 0.02, enX);
    chapaOndulada(mo, a0 + 0.14, a0 + largo - 0.14, f1, 1, H + 0.1, H + alto - 0.1, 0.4, 0.02, enX);
  } else {
    /* Los nervios de la chapa por los dos costados largos, cada 0,6 m: lo que dice «contenedor». */
    tono(mo, por(color, 0.72), ACABADO_DE_LA_CHAPA_ONDULADA);
    const n = Math.floor((largo - 0.6) / 0.6);
    for (let k = 1; k < n; k++) {
      const a = a0 + 0.3 + k * 0.6;
      if (enX) {
        mo.caja(a - 0.04, H + 0.12, c.z0 - 0.0, a + 0.04, H + alto - 0.12, c.z0 + 0.03, 'nab');
        mo.caja(a - 0.04, H + 0.12, c.z1 - 0.03, a + 0.04, H + alto - 0.12, c.z1, 'sab');
      } else {
        mo.caja(c.x0, H + 0.12, a - 0.04, c.x0 + 0.03, H + alto - 0.12, a + 0.04, 'oab');
        mo.caja(c.x1 - 0.03, H + 0.12, a - 0.04, c.x1, H + alto - 0.12, a + 0.04, 'eab');
      }
    }
  }
  /* El bastidor (g2+): los largueros de arriba y de abajo y los cuatro postes de esquina, un dedo por fuera. */
  if (g >= 2) {
    tono(mo, por(color, 0.8), ACABADO_DE_LA_CHAPA_ONDULADA);
    const e = 0.14;
    for (const [px, pz] of [
      [c.x0, c.z0],
      [c.x1 - e, c.z0],
      [c.x0, c.z1 - e],
      [c.x1 - e, c.z1 - e],
    ] as const) {
      mo.caja(px, H, pz, px + e, H + alto, pz + e, 'nseo');
      if (g === 3) {
        /* La cantonera de arriba, con su ojo (un cajón un poco más ancho). */
        tono(mo, por(color, 0.6), ACABADO_DE_LA_CHAPA_ONDULADA);
        mo.caja(px - 0.005, H + alto - 0.12, pz - 0.005, px + e + 0.005, H + alto + 0.01, pz + e + 0.005, 'nseoa');
        tono(mo, por(color, 0.8), ACABADO_DE_LA_CHAPA_ONDULADA);
      }
    }
    for (const yy of [H + alto - 0.1, H]) {
      if (enX) {
        mo.caja(c.x0 + e, yy, c.z0, c.x1 - e, yy + 0.1, c.z0 + 0.012, 'na');
        mo.caja(c.x0 + e, yy, c.z1 - 0.012, c.x1 - e, yy + 0.1, c.z1, 'sa');
      } else {
        mo.caja(c.x0, yy, c.z0 + e, c.x0 + 0.012, yy + 0.1, c.z1 - e, 'oa');
        mo.caja(c.x1 - 0.012, yy, c.z0 + e, c.x1, yy + 0.1, c.z1 - e, 'ea');
      }
    }
  }
  /* Las puertas: las cuatro barras de cierre en el extremo; desde g2, la raya entre las dos hojas; en g3, la leva
     de arriba de cada barra (más ancha que la barra y del mismo fondo: nada sale de la caja). En g3 la barra queda
     8 mm por detrás de la cara de su leva: en el mismo plano, las dos parpadeaban (la (h) de `verify:quiebro-ciudad`). */
  tono(mo, lineal(0x464a4c), ACABADO_DEL_ACERO);
  const retiro = g === 3 ? 0.008 : 0;
  for (const t of [0.2, 0.4, 0.6, 0.8]) {
    if (enX) {
      const xe = extremoAlto ? c.x1 - 0.03 : c.x0;
      const zz = c.z0 + (c.z1 - c.z0) * t;
      mo.caja(xe + (extremoAlto ? 0 : retiro), H + 0.1, zz - 0.025, xe + 0.03 - (extremoAlto ? retiro : 0), H + alto - 0.1, zz + 0.025, extremoAlto ? 'eab' : 'oab');
      if (g === 3) mo.caja(xe, H + alto - 0.22, zz - 0.045, xe + 0.03, H + alto - 0.12, zz + 0.045, extremoAlto ? 'nseab' : 'nsoab');
    } else {
      const ze = extremoAlto ? c.z1 - 0.03 : c.z0;
      const xx = c.x0 + (c.x1 - c.x0) * t;
      mo.caja(xx - 0.025, H + 0.1, ze + (extremoAlto ? 0 : retiro), xx + 0.025, H + alto - 0.1, ze + 0.03 - (extremoAlto ? retiro : 0), extremoAlto ? 'sab' : 'nab');
      if (g === 3) mo.caja(xx - 0.045, H + alto - 0.22, ze, xx + 0.045, H + alto - 0.12, ze + 0.03, extremoAlto ? 'seoab' : 'neoab');
    }
  }
  if (g >= 2) {
    tono(mo, por(color, 0.5), ACABADO_DE_LA_CHAPA_ONDULADA);
    if (enX) {
      const xe = extremoAlto ? c.x1 - 0.022 : c.x0 + 0.002;
      mo.caja(xe, H + 0.1, z - 0.012, xe + 0.02, H + alto - 0.1, z + 0.012, extremoAlto ? 'e' : 'o');
    } else {
      const ze = extremoAlto ? c.z1 - 0.022 : c.z0 + 0.002;
      mo.caja(x - 0.012, H + 0.1, ze, x + 0.012, H + alto - 0.1, ze + 0.02, extremoAlto ? 's' : 'n');
    }
  }
  yield;
}

/* ═══════════════════════════════ LA CARRETILLA ═══════════════════════════════ */

const AMARILLO_DE_OBRA: Rgb = lineal(0xb08a1a);

/**
 * UNA CARRETILLA ELEVADORA: el cuerpo con su contrapeso, las ruedas, el techo de barras, el mástil y las
 * horquillas, todo EN PROPORCIÓN A SU CAJA y dentro de ella (la de la traza mide 1 × 1 m; con medidas fijas,
 * las ruedas y el mástil se salían dos palmos, justo lo que el comprobador busca). Desde g2, el cuerpo y el
 * contrapeso biselados y las ruedas redondas, de goma; en g3, el asiento.
 */
export function* carretilla(obra: ObraDeLaCelda, p: PiezaConFrente): Generator<void, void, void> {
  const mo = obra.m.mobiliario;
  const g = gradoDeDibujo(obra);
  const [x, z] = centro(p.caja);
  const { largo, fondo } = medidas(p);
  const a = largo / 2 - 0.02;
  const f = fondo / 2 - 0.02;
  const aqui = colocar(x, H, z, p.mira);
  mo.con(aqui, () => {
    /* El frente (+z) es donde van las horquillas; el contrapeso, detrás. */
    tono(mo, AMARILLO_DE_OBRA, ACABADO_DE_LA_CHAPA);
    if (g === 1) {
      bloque(mo, 0, 0.18, -f * 0.25, a * 1.7, 0.8, f * 1.3);
    } else {
      mo.cajaBiselada(-a * 0.85, 0.18, -f * 0.25 - f * 0.65, a * 0.85, 0.98, -f * 0.25 + f * 0.3, 0.05, 'nseoa');
      /* El contrapeso, 3 % del fondo por detrás del cuerpo: con la trasera en su mismo plano, las dos parpadeaban. */
      tono(mo, por(AMARILLO_DE_OBRA, 0.8), ACABADO_DE_LA_CHAPA);
      mo.cajaBiselada(-a * 0.8, 0.22, -f * 0.93, a * 0.8, 0.95, -f * 0.55, 0.07, 'nseoa');
    }
    if (g === 1) {
      tono(mo, lineal(0x303030), ACABADO_DEL_CAUCHO);
      for (const s of [-1, 1]) for (const bz of [-0.6, 0.45]) bloque(mo, s * a * 0.8, 0, bz * f, a * 0.35, 0.38, f * 0.5);
    }
    tono(mo, lineal(0x2c2f31), FUNDICION_PINTADA);
    for (const s of [-1, 1]) bloque(mo, s * a * 0.8, 0.98, -f * 0.5, 0.05, 1.05, 0.05, 'nseo');
    bloque(mo, 0, 2.03, -f * 0.25, a * 1.7, 0.05, f * 1.2);
    for (const s of [-1, 1]) bloque(mo, s * a * 0.45, 0.18, f * 0.72, 0.07, 1.95, 0.07, 'nseoa');
    for (const s of [-1, 1]) bloque(mo, s * a * 0.35, 0.06, f * 0.85, 0.08, 0.05, f * 0.28);
    if (g === 3) {
      /* El asiento y el respaldo. */
      tono(mo, lineal(0x2e3032), ACABADO_DEL_CAUCHO);
      mo.cajaBiselada(-a * 0.35, 0.98, -f * 0.45, a * 0.35, 1.06, -f * 0.05, 0.02, 'nseoa');
      mo.cajaBiselada(-a * 0.35, 1.06, -f * 0.5, a * 0.35, 1.4, -f * 0.42, 0.02, 'nseoa');
    }
  });
  /* Las ruedas (g2+): cilindros de goma tumbados, con su llanta. */
  if (g >= 2) {
    const ladosDeLaRueda = g === 2 ? 8 : 10;
    for (const s of [-1, 1]) {
      for (const bz of [-0.6, 0.45]) {
        const radio = Math.min(0.19, f * 0.25);
        const ancho = a * 0.3;
        /* Un cilindro vertical, tumbado sobre el eje x local y puesto en su sitio. */
        const m = new THREE.Matrix4()
          .copy(aqui)
          .multiply(new THREE.Matrix4().makeTranslation(s * a * 0.8, radio, bz * f))
          .multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
        mo.con(m, () => {
          tono(mo, lineal(0x303030), ACABADO_DEL_CAUCHO);
          mo.cilindro(0, 0, -ancho / 2, ancho / 2, radio, radio, ladosDeLaRueda, true);
          if (g === 3) {
            /* El cubo de la llanta, por la cara de fuera (la de su lado, `s`). */
            tono(mo, lineal(0x6a6c6e), ACABADO_DEL_ACERO);
            const y0 = (-s * ancho) / 2;
            mo.cilindro(0, 0, Math.min(y0, y0 - s * 0.012), Math.max(y0, y0 - s * 0.012), radio * 0.55, radio * 0.5, 6, true);
          }
        });
      }
    }
  }
  yield;
}

/* ═══════════════════════════════ EL MUELLE ═══════════════════════════════ */

/**
 * EL MUELLE DE CARGA: una losa de hormigón a la altura de un camión, con sus topes de goma (y el canto de acero, desde
 * g2). El frente del hormigón queda a 2 cm del borde de la caja; lo que va delante de él (los topes 1,5 cm, el canto
 * 1,2 cm y la franja 4 mm) sale de verdad: en el mismo plano, los topes y el frente parpadeaban a rayas, y en g1 los
 * topes quedaban enteros dentro del hormigón (la (h) de `verify:quiebro-ciudad` mira caras a menos de 3 mm).
 */
export function* muelle(obra: ObraDeLaCelda, p: PiezaConFrente): Generator<void, void, void> {
  const mo = obra.m.mobiliario;
  const g = gradoDeDibujo(obra);
  const [x, z] = centro(p.caja);
  const { largo, fondo } = medidas(p);
  const aqui = colocar(x, H, z, p.mira);
  const frente = fondo / 2 - 0.02;
  mo.con(aqui, () => {
    tono(mo, HORMIGON, ACABADO_DEL_HORMIGON);
    if (g === 1) bloque(mo, 0, 0, 0, largo - 0.04, 1.05, fondo - 0.04);
    else mo.cajaBiselada(-(largo - 0.04) / 2, 0, -(fondo - 0.04) / 2, (largo - 0.04) / 2, 1.05, (fondo - 0.04) / 2, 0.03, 'nseoa');
    if (g >= 2) {
      /* El canto del borde de carga: un angular galvanizado a lo largo del frente, 1,2 cm por fuera y 1 cm por encima. */
      tono(mo, lineal(0x6b6e70), ACABADO_DEL_ACERO);
      mo.caja(-(largo - 0.1) / 2, 0.93, frente - 0.01, (largo - 0.1) / 2, 1.06, frente + 0.012, 'seoa');
    }
    /* Los topes: goma de un 3 % de albedo (la de un neumático; 0x121212 era un 0,6 %). En la sombra de noche salen
       (0, 0, 0) igual: en ese frente el hormigón, del 10 %, da (0, 1, 0), y ninguna goma llega a 1. */
    tono(mo, lineal(0x303030), ACABADO_DEL_CAUCHO);
    for (let k = -2; k <= 2; k++) {
      if (g === 1) bloque(mo, k * (largo / 5), 0.35, frente - 0.015, 0.25, 0.5, 0.06, 'seoa');
      else mo.cajaBiselada(k * (largo / 5) - 0.125, 0.35, frente - 0.045, k * (largo / 5) + 0.125, 0.85, frente + 0.015, 0.015, 'seoa');
    }
    if (g === 3) {
      /* La franja de seguridad del borde de carga, pintada sobre el hormigón, 4 mm por fuera (con 1 mm, a más de 40 m la
         profundidad ya no separa los dos planos). */
      tono(mo, lineal(0x9a7a1c), ACABADO_DE_LA_CHAPA);
      mo.caja(-(largo - 0.1) / 2, 0.78, frente - 0.004, (largo - 0.1) / 2, 0.9, frente + 0.004, 'sab');
    }
  });
  yield;
}

/* ═══════════════════════════════ EL CORTE DE OBRA ═══════════════════════════════ */

const TIERRA: Rgb = lineal(0x2a2219);

/**
 * Las dos filas de barreras de un corte, a lo ancho de la calle (las de `barrerasDeObra`, de `mobiliario.ts`). Aparte
 * para que el comprobador separe lo que escriben ellas (de MOBILIARIO) de lo que escribe el corte.
 */
export function filasDelCorte(c: CajaXZ): CajaXZ[] {
  const aLoLargoDeX = c.x1 - c.x0 >= c.z1 - c.z0;
  const gg = 0.35;
  return aLoLargoDeX
    ? [
        { x0: c.x0, z0: c.z0 + gg - 0.3, x1: c.x1, z1: c.z0 + gg + 0.3 },
        { x0: c.x0, z0: c.z1 - gg - 0.3, x1: c.x1, z1: c.z1 - gg + 0.3 },
      ]
    : [
        { x0: c.x0 + gg - 0.3, z0: c.z0, x1: c.x0 + gg + 0.3, z1: c.z1 },
        { x0: c.x1 - gg - 0.3, z0: c.z0, x1: c.x1 - gg + 0.3, z1: c.z1 },
      ];
}

/**
 * UN CORTE DE OBRA: dos filas de barreras rojiblancas a lo ancho de la calle (las de las vallas del
 * barrio, con sus balizas) y el montón de tierra entre ellas; desde g2, la chapa de acero sobre la zanja y, en g3,
 * unas losas levantadas. Todo dentro de la caja.
 */
export function* corte(obra: ObraDeLaCelda, c: CajaXZ): Generator<void, LuzDelMobiliario[], void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const g = gradoDeDibujo(obra);
  const ancho = c.x1 - c.x0;
  const fondo = c.z1 - c.z0;
  const aLoLargoDeX = ancho >= fondo;
  const luces: LuzDelMobiliario[] = [];
  for (const f of filasDelCorte(c)) luces.push(...barrerasDeObra(mo, em, f));
  const [x, z] = centro(c);
  const rx = aLoLargoDeX ? ancho * 0.3 : Math.max(0.2, fondo / 2 - 0.9);
  const rz = aLoLargoDeX ? Math.max(0.2, fondo / 2 - 0.9) : ancho * 0.3;
  const rm = Math.min(rx, rz);
  tono(mo, TIERRA, ACABADO_DE_LA_TIERRA);
  if (g === 1) {
    mo.cilindro(x, z, 0, 0.7, rm, 0.15, 6, false);
  } else {
    /* El montón en torno, con el pie más ancho por un lado que por otro (el hash). */
    const lados = g === 2 ? 8 : 10;
    const semilla = Math.round(x * 4) * 31 + Math.round(z * 4);
    tornear(
      mo,
      x,
      z,
      [
        { r: rm, y: 0, color: por(TIERRA, 0.8) },
        { r: rm * 0.72, y: 0.3, color: TIERRA },
        ...(g === 3 ? [{ r: rm * 0.45, y: 0.55, color: por(TIERRA, 1.1) }] : []),
        { r: 0, y: 0.72, color: por(TIERRA, 1.15) },
      ],
      lados,
      { radioDelSector: (k) => 0.85 + 0.3 * azarEn(semilla, k, 0x7e) },
    );
  }
  if (g >= 2) {
    /* La chapa de acero sobre la zanja, a un lado del montón y en el suelo. */
    tono(mo, lineal(0x4a4741), ACABADO_DEL_ACERO);
    const dx = aLoLargoDeX ? ancho * 0.3 : 0;
    const dz = aLoLargoDeX ? 0 : fondo * 0.3;
    const sx = aLoLargoDeX ? 0.75 : Math.min(0.75, ancho / 2 - 0.75);
    const sz = aLoLargoDeX ? Math.min(0.75, fondo / 2 - 0.75) : 0.75;
    mo.cajaBiselada(x + dx - sx, 0, z + dz - sz, x + dx + sx, 0.025, z + dz + sz, 0.008, 'nseoa');
  }
  if (g === 3) {
    /* Tres losas de la acera levantadas, apiladas al otro lado. */
    tono(mo, lineal(0x5a5750), ACABADO_DE_LA_PIEDRA);
    const dx = aLoLargoDeX ? -ancho * 0.3 : 0;
    const dz = aLoLargoDeX ? 0 : -fondo * 0.3;
    for (let i = 0; i < 3; i++) {
      const y = i * 0.055;
      const o = (i - 1) * 0.04;
      mo.cajaBiselada(x + dx - 0.2 + o, y, z + dz - 0.2 - o, x + dx + 0.2 + o, y + 0.05, z + dz + 0.2 - o, 0.008, 'nseoa');
    }
  }
  yield;
  return luces;
}

/** Lo que escribe una vez el soportal de una plaza: unos pilares (con caja) y unos techos (por encima de la cabeza). */
export interface SoportalDeLaPlaza {
  readonly pilares: readonly CajaXZ[];
  readonly techos: readonly CajaXZ[];
}

/**
 * EL SOPORTAL DE UNA PLAZA (la Porticada, §2.3): los pilares de piedra con su basa y su capitel, dentro de
 * su caja hasta la cabeza, y el techo que va de su línea a la raya del solar, a 4,2 m, con su canto.
 */
export function* soportalDePlaza(obra: ObraDeLaCelda, s: SoportalDeLaPlaza): Generator<void, void, void> {
  const mo = obra.m.mobiliario;
  const alto = 4.2;
  for (const p of s.pilares) {
    const [x, z] = centro(p);
    const lado = Math.min(p.x1 - p.x0, p.z1 - p.z0) - 0.02;
    tono(mo, GRANITO, ACABADO.piedra);
    bloque(mo, x, H, z, lado, 0.3, lado);
    tono(mo, lineal(0x6c665c), ACABADO.piedra);
    bloque(mo, x, H + 0.3, z, lado - 0.08, alto - 0.6, lado - 0.08);
    tono(mo, GRANITO, ACABADO.piedra);
    bloque(mo, x, H + alto - 0.3, z, lado + 0.12, 0.3, lado + 0.12);
  }
  tono(mo, lineal(0x5e5a52), ACABADO.piedra);
  for (const t of s.techos) mo.caja(t.x0, H + alto, t.z0, t.x1, H + alto + 0.45, t.z1, 'nseoab');
  yield;
}
