/**
 * LAS PIEZAS QUE TRAE LA CIUDAD ABIERTA: las cajas nuevas del contrato (`TipoDeCajaDeLaCiudad` de
 * `quiebro-ciudad.ts`) y lo que la ciudad pinta sin caja.
 *
 *   · Con caja (estorban, y se pintan DENTRO de ella hasta la cabeza, como el mobiliario del barrio):
 *     el tronco del Bulevar, la estatua de la Porticada, los contenedores, la carretilla y el muelle del
 *     Patio de carga, y el corte de obra de la noche.
 *   · Sin caja (van por encima de la cabeza): la copa del árbol, la farola de pared de las calles sin
 *     farolas de pie, y el tramo del viaducto del Elevado que cae en cada celda.
 *
 * Todo al mobiliario (color y acabado por vértice), a lo emisivo y, lo que lleva vidrio, al cristal: son
 * las mismas tres llamadas de siempre. Las medidas salen de la caja; el aspecto, del hash de su sitio,
 * igual en todos los aparatos.
 */
import type { Molde, V3 } from './geometria';
import { ACABADO, lineal } from './materiales';
import type { LuzDelMobiliario, Rgb } from './mobiliario';
import { GRANITO, H, HIERRO, HORMIGON, SODIO_HDR, bloque, colocar, tono, valla } from './mobiliario';
import { normalDe } from './fachadas';
import type { CajaXZ, Orientacion, PiezaConFrente } from './tipos';
import { azarEn } from './azar';

function centro(c: CajaXZ): [number, number] {
  return [(c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2];
}

/** El largo (a lo largo de `mira` girado 90°) y el fondo de una pieza con frente, en su caja. */
function medidas(p: PiezaConFrente): { largo: number; fondo: number } {
  const w = p.caja.x1 - p.caja.x0;
  const d = p.caja.z1 - p.caja.z0;
  const frenteEnX = p.mira === 'n' || p.mira === 's';
  return { largo: frenteEnX ? w : d, fondo: frenteEnX ? d : w };
}

const CORTEZA: Rgb = lineal(0x2b2118);
const HOJAS: readonly Rgb[] = [0x16261a, 0x1b2c1c, 0x202a18].map(lineal);
const BRONCE: Rgb = lineal(0x2c3a30);
const CONTENEDORES: readonly Rgb[] = [0x6b2a1f, 0x21405a, 0x2f4a2a, 0x7a5a22, 0x4a4d50].map(lineal);
const AMARILLO_DE_OBRA: Rgb = lineal(0xb08a1a);

/**
 * EL ÁRBOL DEL BULEVAR: el tronco dentro de su caja hasta 2,6 m y la copa por encima de la cabeza, un
 * volumen de dos troncos de cono (la copa de un plátano de sombra podado), de 2 a 2,6 m de radio.
 */
export function arbol(mo: Molde, c: CajaXZ, lados: number): void {
  const [x, z] = centro(c);
  const r = Math.min(c.x1 - c.x0, c.z1 - c.z0) / 2 - 0.02;
  tono(mo, CORTEZA, ACABADO.madera);
  mo.cilindro(x, z, H, H + 2.9, r, r * 0.8, Math.max(5, lados - 1), false);
  const h = azarEn(Math.round(x * 4), Math.round(z * 4), 0xa2b);
  const rc = 2.0 + h * 0.6;
  const hojas = HOJAS[Math.floor(h * HOJAS.length) % HOJAS.length] as Rgb;
  tono(mo, hojas, [0.8, 0]);
  mo.cilindro(x, z, H + 2.7, H + 4.6, 0.6, rc, lados, false);
  mo.cilindro(x, z, H + 4.6, H + 6.4 + h, rc, 0.5, lados, true);
}

/** LA ESTATUA de la plaza: pedestal de granito que llena la caja y la figura de bronce encima. */
export function estatua(mo: Molde, c: CajaXZ, lados: number): void {
  const [x, z] = centro(c);
  const ax = c.x1 - c.x0 - 0.04;
  const az = c.z1 - c.z0 - 0.04;
  tono(mo, GRANITO, ACABADO.piedra);
  bloque(mo, x, H, z, ax, 0.3, az);
  bloque(mo, x, H + 0.3, z, ax - 0.3, 1.5, az - 0.3);
  bloque(mo, x, H + 1.8, z, ax - 0.1, 0.2, az - 0.1);
  /* La figura: capa larga, torso, cabeza y un brazo que señala. Estilizada: se ve a contraluz. */
  tono(mo, BRONCE, [0.45, 0.6]);
  const y = H + 2.0;
  mo.cilindro(x, z, y, y + 1.3, 0.42, 0.3, lados, false);
  mo.cilindro(x, z, y + 1.3, y + 2.0, 0.3, 0.26, lados, false);
  mo.cilindro(x, z, y + 2.0, y + 2.1, 0.12, 0.12, lados, false);
  mo.cilindro(x, z, y + 2.1, y + 2.42, 0.15, 0.12, lados, true);
  mo.tubo(
    [
      [x + 0.2, y + 1.85, z],
      [x + 0.55, y + 2.05, z - 0.2],
      [x + 0.85, y + 2.3, z - 0.45],
    ],
    0.07,
    5,
  );
}

/**
 * UN CONTENEDOR de carga: la caja de chapa con sus nervios por los costados largos y las puertas en el
 * extremo que mira a `mira` (o en el de más x o más z, si el frente es un costado). Llena su caja.
 */
export function contenedor(mo: Molde, p: PiezaConFrente): void {
  const c = p.caja;
  const [x, z] = centro(c);
  const h = azarEn(Math.round(x * 4), Math.round(z * 4), 0xc0e);
  const color = CONTENEDORES[Math.floor(h * CONTENEDORES.length) % CONTENEDORES.length] as Rgb;
  const alto = 2.55;
  const enX = c.x1 - c.x0 >= c.z1 - c.z0;
  tono(mo, color, ACABADO.pintura);
  mo.caja(c.x0 + 0.02, H, c.z0 + 0.02, c.x1 - 0.02, H + alto, c.z1 - 0.02);
  /* Los nervios de la chapa por los dos costados largos, cada 0,6 m: lo que dice «contenedor». */
  tono(mo, color.map((v) => v * 0.72) as unknown as Rgb, ACABADO.pintura);
  const largo = enX ? c.x1 - c.x0 : c.z1 - c.z0;
  const n = Math.floor((largo - 0.6) / 0.6);
  for (let k = 1; k < n; k++) {
    const a = (enX ? c.x0 : c.z0) + 0.3 + k * 0.6;
    if (enX) {
      mo.caja(a - 0.04, H + 0.12, c.z0 - 0.0, a + 0.04, H + alto - 0.12, c.z0 + 0.03, 'nab');
      mo.caja(a - 0.04, H + 0.12, c.z1 - 0.03, a + 0.04, H + alto - 0.12, c.z1, 'sab');
    } else {
      mo.caja(c.x0, H + 0.12, a - 0.04, c.x0 + 0.03, H + alto - 0.12, a + 0.04, 'oab');
      mo.caja(c.x1 - 0.03, H + 0.12, a - 0.04, c.x1, H + alto - 0.12, a + 0.04, 'eab');
    }
  }
  /* Las puertas: las cuatro barras de cierre en el extremo. */
  tono(mo, lineal(0x303234), ACABADO.hierroViejo);
  const extremoAlto = p.mira === 'e' || p.mira === 's';
  for (const t of [0.2, 0.4, 0.6, 0.8]) {
    if (enX) {
      const xe = extremoAlto ? c.x1 - 0.03 : c.x0;
      const zz = c.z0 + (c.z1 - c.z0) * t;
      mo.caja(xe, H + 0.1, zz - 0.025, xe + 0.03, H + alto - 0.1, zz + 0.025, extremoAlto ? 'eab' : 'oab');
    } else {
      const ze = extremoAlto ? c.z1 - 0.03 : c.z0;
      const xx = c.x0 + (c.x1 - c.x0) * t;
      mo.caja(xx - 0.025, H + 0.1, ze, xx + 0.025, H + alto - 0.1, ze + 0.03, extremoAlto ? 'sab' : 'nab');
    }
  }
}

/**
 * UNA CARRETILLA ELEVADORA: el cuerpo con su contrapeso, las ruedas, el techo de barras, el mástil y las
 * horquillas, todo EN PROPORCIÓN A SU CAJA y dentro de ella (la de la traza mide 1 × 1 m; con medidas fijas,
 * las ruedas y el mástil se salían dos palmos, justo lo que el comprobador busca).
 */
export function carretilla(mo: Molde, p: PiezaConFrente, lados: number): void {
  const [x, z] = centro(p.caja);
  const { largo, fondo } = medidas(p);
  const a = largo / 2 - 0.02;
  const f = fondo / 2 - 0.02;
  void lados;
  mo.con(colocar(x, H, z, p.mira), () => {
    /* El frente (+z) es donde van las horquillas; el contrapeso, detrás. */
    tono(mo, AMARILLO_DE_OBRA, ACABADO.pintura);
    bloque(mo, 0, 0.18, -f * 0.25, a * 1.7, 0.8, f * 1.3);
    tono(mo, lineal(0x1a1a1a), ACABADO.caucho);
    for (const s of [-1, 1]) for (const bz of [-0.6, 0.45]) bloque(mo, s * a * 0.8, 0, bz * f, a * 0.35, 0.38, f * 0.5);
    tono(mo, HIERRO, ACABADO.hierro);
    for (const s of [-1, 1]) bloque(mo, s * a * 0.8, 0.98, -f * 0.5, 0.05, 1.05, 0.05);
    bloque(mo, 0, 2.03, -f * 0.25, a * 1.7, 0.05, f * 1.2);
    for (const s of [-1, 1]) bloque(mo, s * a * 0.45, 0.18, f * 0.72, 0.07, 1.95, 0.07);
    for (const s of [-1, 1]) bloque(mo, s * a * 0.35, 0.06, f * 0.85, 0.08, 0.05, f * 0.28);
  });
}

/** EL MUELLE DE CARGA: una losa de hormigón a la altura de un camión, con su canto de goma. */
export function muelle(mo: Molde, p: PiezaConFrente): void {
  const [x, z] = centro(p.caja);
  const { largo, fondo } = medidas(p);
  mo.con(colocar(x, H, z, p.mira), () => {
    tono(mo, HORMIGON, ACABADO.hormigon);
    bloque(mo, 0, 0, 0, largo - 0.04, 1.05, fondo - 0.04);
    tono(mo, lineal(0x121212), ACABADO.caucho);
    for (let k = -2; k <= 2; k++) bloque(mo, k * (largo / 5), 0.35, fondo / 2 - 0.06, 0.25, 0.5, 0.06, 'seoa');
  });
}

/**
 * UN CORTE DE OBRA: dos filas de barreras rojiblancas a lo ancho de la calle (las de las vallas del
 * barrio, con sus balizas) y el montón de tierra entre ellas. Todo dentro de la caja.
 */
export function corte(mo: Molde, em: Molde, c: CajaXZ): LuzDelMobiliario[] {
  const ancho = c.x1 - c.x0;
  const fondo = c.z1 - c.z0;
  const aLoLargoDeX = ancho >= fondo;
  const luces: LuzDelMobiliario[] = [];
  const g = 0.35;
  const filas: CajaXZ[] = aLoLargoDeX
    ? [
        { x0: c.x0, z0: c.z0 + g - 0.3, x1: c.x1, z1: c.z0 + g + 0.3 },
        { x0: c.x0, z0: c.z1 - g - 0.3, x1: c.x1, z1: c.z1 - g + 0.3 },
      ]
    : [
        { x0: c.x0 + g - 0.3, z0: c.z0, x1: c.x0 + g + 0.3, z1: c.z1 },
        { x0: c.x1 - g - 0.3, z0: c.z0, x1: c.x1 - g + 0.3, z1: c.z1 },
      ];
  for (const f of filas) luces.push(...valla(mo, em, f));
  const [x, z] = centro(c);
  tono(mo, lineal(0x2a2219), ACABADO.piedra);
  const rx = aLoLargoDeX ? ancho * 0.3 : Math.max(0.2, fondo / 2 - 0.9);
  const rz = aLoLargoDeX ? Math.max(0.2, fondo / 2 - 0.9) : ancho * 0.3;
  mo.cilindro(x, z, 0, 0.7, Math.min(rx, rz), 0.15, 6, false);
  return luces;
}

/**
 * UNA FAROLA DE PARED: una ménsula de hierro a `alto` metros que sale 0,7 m de la fachada, con su farol
 * y el vidrio de sodio. Va por encima de la cabeza y no tiene caja (§2.4): la ponen las calles que no
 * llevan farolas de pie.
 */
export function farolaDePared(mo: Molde, em: Molde, x: number, z: number, mira: Orientacion, alto: number, lados: number): LuzDelMobiliario {
  const [nx, nz] = normalDe(mira);
  tono(mo, HIERRO, ACABADO.hierro);
  const p = (a: number, y: number): V3 => [x + nx * a, y, z + nz * a];
  mo.tubo([p(0.02, alto - 0.35), p(0.3, alto - 0.05), p(0.7, alto)], 0.03, Math.max(4, lados - 2));
  mo.con(colocar(x + nx * 0.7, alto - 0.05, z + nz * 0.7, mira), () => {
    bloque(mo, 0, 0, 0, 0.26, 0.12, 0.26);
    bloque(mo, 0, 0.12, 0, 0.12, 0.08, 0.12);
  });
  em.con(colocar(x + nx * 0.7, alto - 0.05, z + nz * 0.7, mira), () => {
    em.color(SODIO_HDR[0] * 0.8, SODIO_HDR[1] * 0.8, SODIO_HDR[2] * 0.8);
    em.poner('aEmisor', 1, 0);
    bloque(em, 0, -0.28, 0, 0.2, 0.28, 0.2, 'nseob');
  });
  return { x: x + nx * 0.7, y: alto - 0.2, z: z + nz * 0.7, tipo: 'farola' };
}

/**
 * EL SOPORTAL DE UNA PLAZA (la Porticada, §2.3): los pilares de piedra con su basa y su capitel, dentro de
 * su caja hasta la cabeza, y el techo que va de su línea a la raya del solar, a 4,2 m, con su canto.
 */
export function soportalDePlaza(mo: Molde, pilares: readonly CajaXZ[], techos: readonly CajaXZ[]): void {
  const alto = 4.2;
  for (const p of pilares) {
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
  for (const t of techos) mo.caja(t.x0, H + alto, t.z0, t.x1, H + alto + 0.45, t.z1, 'nseoab');
}

/** Un tramo del viaducto del Elevado: la viga de `desde` a `hasta` a lo largo de `eje`. */
export interface TramoDeViaducto {
  readonly eje: 'x' | 'z';
  readonly linea: number;
  readonly desde: number;
  readonly hasta: number;
  readonly alto: number;
}

/**
 * EL VIADUCTO, a trozos: los pilares de la celda (con su zapata y su capitel, dentro de la caja hasta la
 * cabeza) y el tramo de viga que cae en ella, con sus petos, sus carriles y la franja de luz verde-cian
 * que se ve de lejos (§2.7). Cortado en la raya de la celda: el tramo de al lado lo pone la otra.
 */
export function viaducto(mo: Molde, em: Molde, t: TramoDeViaducto | null, pilares: readonly CajaXZ[]): void {
  tono(mo, HORMIGON, ACABADO.hormigon);
  const alto = t?.alto ?? 7.5;
  for (const p of pilares) {
    const [x, z] = centro(p);
    const lado = Math.min(p.x1 - p.x0, p.z1 - p.z0);
    bloque(mo, x, 0, z, lado, 0.35, lado);
    bloque(mo, x, 0.35, z, lado - 0.15, alto - 0.35 - 0.45, lado - 0.15);
    bloque(mo, x, alto - 0.45, z, lado + 0.4, 0.45, lado + 0.4);
  }
  if (t === null || t.hasta - t.desde < 0.01) return;
  const enX = t.eje === 'x';
  const [x0, x1, z0, z1] = enX ? [t.desde, t.hasta, t.linea - 1.9, t.linea + 1.9] : [t.linea - 1.9, t.linea + 1.9, t.desde, t.hasta];
  tono(mo, HORMIGON, ACABADO.hormigon);
  mo.caja(x0, t.alto, z0, x1, t.alto + 0.9, z1, enX ? 'nsab' : 'eoab');
  tono(mo, lineal(0x3a3d3f), ACABADO.hierroViejo);
  if (enX) {
    mo.caja(x0, t.alto + 0.9, z0, x1, t.alto + 1.45, z0 + 0.12, 'nsa');
    mo.caja(x0, t.alto + 0.9, z1 - 0.12, x1, t.alto + 1.45, z1, 'nsa');
    for (const r of [-0.72, 0.72]) mo.caja(x0, t.alto + 0.9, t.linea + r - 0.04, x1, t.alto + 1.02, t.linea + r + 0.04, 'nsa');
  } else {
    mo.caja(x0, t.alto + 0.9, z0, x0 + 0.12, t.alto + 1.45, z1, 'eoa');
    mo.caja(x1 - 0.12, t.alto + 0.9, z0, x1, t.alto + 1.45, z1, 'eoa');
    for (const r of [-0.72, 0.72]) mo.caja(t.linea + r - 0.04, t.alto + 0.9, z0, t.linea + r + 0.04, t.alto + 1.02, z1, 'eoa');
  }
  /* La franja de luz bajo el peto, por los dos lados: el Elevado se lee de noche desde cualquier calle. */
  em.color(0.16, 1.1, 0.85);
  em.poner('aEmisor', 0, 0);
  if (enX) {
    em.caja(x0, t.alto + 0.35, z0 - 0.01, x1, t.alto + 0.45, z0, 'n');
    em.caja(x0, t.alto + 0.35, z1, x1, t.alto + 0.45, z1 + 0.01, 's');
  } else {
    em.caja(x0 - 0.01, t.alto + 0.35, z0, x0, t.alto + 0.45, z1, 'o');
    em.caja(x1, t.alto + 0.35, z0, x1 + 0.01, t.alto + 0.45, z1, 'e');
  }
}
