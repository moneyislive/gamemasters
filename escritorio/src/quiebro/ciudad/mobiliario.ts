/**
 * EL MOBILIARIO: bancos, la fuente, el quiosco de la plaza, los de prensa, las cabinas y las vallas del borde,
 * y lo que comparten todas las piezas (la cota del bordillo, cómo se colocan, los colores). Las farolas van en
 * `farolas.ts`, las tapas y las alcantarillas en `tapas.ts`, el viaducto en `viaducto.ts`, y qué pieza va en
 * cada celda, en `celda-mobiliario.ts`.
 *
 * ═══ CADA COSA DENTRO DE SU CAJA ═══
 *
 * Lo que estorba al paso (un banco, el pie de una farola, el poste de una cabina) se dibuja DENTRO de
 * la caja que el barrio declara para ello, y lo que sale de la caja lo hace por encima de la cabeza
 * (el brazo de la farola a 6 m, la marquesina de la cabina a 2,3, el tejadillo del quiosco a 2,7, el
 * capitel del pilar a 7). El comprobador cruza lo que se dibuja con la estructura: si alguien cambia el
 * banco y le crece el respaldo fuera de su caja, el comprobador lo dice antes de que un jugador se quede
 * enganchado en el aire.
 *
 * ═══ UN SOLO MOLDE POR MATERIAL ═══
 *
 * Todo esto va a tres moldes (mobiliario, emisivo, cristal: ver `materiales.ts`), así que el barrio
 * entero de mobiliario son tres llamadas. Las piezas se describen en su sitio local (x a lo largo,
 * z hacia su frente) y se colocan con una matriz; el nivel sólo cambia los lados de los cilindros.
 *
 * ═══ CADA PIEZA CEDE ═══
 *
 * Cada pieza es un escritor de pieza (`EscritorDePieza` de `celdas.ts`): escribe en los moldes de su obra, cede
 * el paso y devuelve sus luces. Entre dos cesiones no se escribe más que el trozo del nivel (600 triángulos en
 * N0, 1.000 en N1-N3, sumando familias): la ventana sólo empieza un trozo si le cabe entero en el fotograma.
 *
 * Todo lo que se apoya en la acera o en la plaza arranca a la cota del bordillo.
 */
import * as THREE from 'three';
import type { Molde } from './geometria';
import type { V3 } from './geometria';
import { ACABADO, lineal } from './materiales';
import type { CabinaDelPlano, CajaXZ, FuenteDelPlano, Orientacion, PiezaConFrente } from './tipos';
import { ALTURA_DE_LA_ACERA } from './tipos';
import { normalDe } from './fachadas';
import { azarEn } from './azar';
import type { ObraDeLaCelda } from './celdas';

/** Una luz que el mobiliario enciende: para hornear, reflejar y hacer halo. */
export interface LuzDelMobiliario {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly tipo: 'farola' | 'cabina' | 'quiosco' | 'baliza' | 'prensa';
}

/** La cota del bordillo: todo lo que se apoya en la acera o en la plaza arranca aquí. */
export const H = ALTURA_DE_LA_ACERA;

/** El ángulo (alrededor de y) que lleva el +z local a mirar hacia `o`. */
function anguloDe(o: Orientacion): number {
  /* +z local → n (−z): π; s (+z): 0; e (+x): π/2; o (−x): −π/2. */
  return o === 's' ? 0 : o === 'n' ? Math.PI : o === 'e' ? Math.PI / 2 : -Math.PI / 2;
}

/** La matriz que pone una pieza local (origen en su pie, +z a su frente) en (x, y, z) mirando a `o`. */
export function colocar(x: number, y: number, z: number, o: Orientacion): THREE.Matrix4 {
  return new THREE.Matrix4().makeRotationY(anguloDe(o)).setPosition(x, y, z);
}

export function centro(c: CajaXZ): [number, number] {
  return [(c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2];
}

/** Una caja local por centro y medidas. */
export function bloque(m: Molde, cx: number, y0: number, cz: number, ax: number, alto: number, az: number, caras = 'nseoab'): void {
  m.caja(cx - ax / 2, y0, cz - az / 2, cx + ax / 2, y0 + alto, cz + az / 2, caras);
}

export type Rgb = readonly [number, number, number];

export function tono(m: Molde, color: Rgb, acabado: readonly [number, number]): void {
  m.color(color[0], color[1], color[2]);
  m.poner('aAcabado', acabado[0], acabado[1]);
}

export const HIERRO: Rgb = lineal(0x16191a);
export const HIERRO_VERDE: Rgb = lineal(0x1d2e26);
export const PIEDRA: Rgb = lineal(0x6f6a60);
export const GRANITO: Rgb = lineal(0x4d4b47);
export const HORMIGON: Rgb = lineal(0x5a5a56);
export const MADERA: Rgb = lineal(0x5a3a22);
export const SODIO_HDR: Rgb = [6.5, 3.4, 1.1];
export const AMBAR_HDR: Rgb = [5.0, 2.4, 0.45];

/* ═══════════════════════════════ LAS PIEZAS ═══════════════════════════════ */

/** Banco de listones con respaldo, dentro de su caja (2 × 0,5), mirando a `mira`. */
export function* banco(obra: ObraDeLaCelda, b: PiezaConFrente): Generator<void, void, void> {
  const mo = obra.m.mobiliario;
  const [cx, cz] = centro(b.caja);
  const largo = Math.max(b.caja.x1 - b.caja.x0, b.caja.z1 - b.caja.z0) - 0.05;
  /* El frente es `mira`: en local, +z. El largo del banco va por x local. */
  mo.con(colocar(cx, H, cz, b.mira), () => {
    tono(mo, HIERRO, ACABADO.hierro);
    for (const s of [-1, 1]) {
      bloque(mo, s * (largo / 2 - 0.12), 0, 0.02, 0.06, 0.44, 0.4);
      bloque(mo, s * (largo / 2 - 0.12), 0.44, -0.2, 0.06, 0.42, 0.05);
    }
    tono(mo, MADERA, ACABADO.madera);
    for (let i = 0; i < 3; i++) bloque(mo, 0, 0.44, 0.18 - i * 0.13, largo, 0.035, 0.11);
    for (let i = 0; i < 2; i++) bloque(mo, 0, 0.6 + i * 0.16, -0.21, largo, 0.11, 0.03);
  });
  yield;
}

/** Un anillo plano (corona) de radio r0 a r1 a la altura y, mirando arriba. */
function corona(m: Molde, cx: number, cz: number, r0: number, r1: number, y: number, lados: number): void {
  for (let i = 0; i < lados; i++) {
    const a0 = (i / lados) * Math.PI * 2;
    const a1 = ((i + 1) / lados) * Math.PI * 2;
    const p = (r: number, a: number): V3 => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
    m.quad(p(r1, a0), p(r0, a0), p(r0, a1), p(r1, a1), [0, 1, 0], [0, 0, 1, 0, 1, 1, 0, 1]);
  }
}

/** La cara de DENTRO de un cilindro (paredes que miran al eje). */
function paredInterior(m: Molde, cx: number, cz: number, r: number, y0: number, y1: number, lados: number): void {
  for (let i = 0; i < lados; i++) {
    const a0 = (i / lados) * Math.PI * 2;
    const a1 = ((i + 1) / lados) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const p = (a: number, y: number): V3 => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
    m.quad(p(a0, y0), p(a1, y0), p(a1, y1), p(a0, y1), [-Math.cos(am), 0, -Math.sin(am)], [0, y0, 1, y0, 1, y1, 0, y1]);
  }
}

/** La fuente: pilón octogonal con agua, columna y taza. */
export function* fuente(obra: ObraDeLaCelda, f: FuenteDelPlano): Generator<void, void, void> {
  const mo = obra.m.mobiliario;
  const { x, z } = f;
  const r = f.radio - 0.05;
  tono(mo, PIEDRA, ACABADO.piedra);
  mo.cilindro(x, z, H, H + 0.55, r, r, 8, false);
  corona(mo, x, z, r - 0.3, r, H + 0.55, 8);
  paredInterior(mo, x, z, r - 0.3, H + 0.35, H + 0.55, 8);
  tono(mo, lineal(0x0b1214), ACABADO.agua);
  corona(mo, x, z, 0.35, r - 0.3, H + 0.38, 16);
  tono(mo, PIEDRA, ACABADO.piedra);
  mo.cilindro(x, z, H + 0.38, H + 1.3, 0.35, 0.3, 12, false);
  mo.cilindro(x, z, H + 1.3, H + 1.5, 0.3, 0.85, 12, false);
  corona(mo, x, z, 0.7, 0.85, H + 1.5, 12);
  tono(mo, lineal(0x0b1214), ACABADO.agua);
  corona(mo, x, z, 0.12, 0.7, H + 1.46, 12);
  tono(mo, PIEDRA, ACABADO.piedra);
  mo.cilindro(x, z, H + 1.46, H + 2.05, 0.12, 0.09, 8, true);
  mo.cilindro(x, z, H + 2.05, H + 2.25, 0.18, 0.02, 8, false);
  yield;
}

/** El quiosco de la plaza: octogonal, de hierro y cristal, con tejado de pabellón y luz dentro. */
export function* quiosco(obra: ObraDeLaCelda, q: PiezaConFrente): Generator<void, LuzDelMobiliario, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const cr = obra.m.cristal;
  const [x, z] = centro(q.caja);
  const r = Math.min(q.caja.x1 - q.caja.x0, q.caja.z1 - q.caja.z0) / 2 - 0.08;
  tono(mo, GRANITO, ACABADO.piedra);
  mo.cilindro(x, z, H, H + 0.2, r, r, 8, true);
  tono(mo, HIERRO_VERDE, ACABADO.hierro);
  const rp = r - 0.08;
  mo.cilindro(x, z, H + 0.2, H + 1.0, rp, rp, 8, false);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    mo.cilindro(x + Math.cos(a) * rp, z + Math.sin(a) * rp, H + 0.2, H + 2.75, 0.05, 0.05, 4, false);
  }
  mo.cilindro(x, z, H + 2.55, H + 2.75, rp + 0.05, rp + 0.05, 8, true);
  /* El tejado de pabellón vuela por encima de la cabeza, fuera de la caja. */
  mo.cilindro(x, z, H + 2.75, H + 3.45, r + 0.45, 0.25, 8, false);
  mo.cilindro(x, z, H + 3.45, H + 3.9, 0.12, 0.02, 6, false);
  /* Cristal entre 1 y 2,55 m. */
  cr.cilindro(x, z, H + 1.0, H + 2.55, rp - 0.01, rp - 0.01, 8, false);
  /* Dentro: un mostrador y la luz cálida del techo. */
  tono(mo, MADERA, ACABADO.madera);
  const [fx, fz] = normalDe(q.mira);
  bloque(mo, x - fx * 0.6, H + 0.2, z - fz * 0.6, 1.4, 0.95, 1.4);
  em.color(3.2, 2.2, 1.3);
  em.poner('aEmisor', 0, 0);
  em.losa(x - 0.6, z - 0.6, x + 0.6, z + 0.6, H + 2.5, false);
  em.color(1.4, 0.9, 0.5);
  em.cilindro(x, z, H + 1.3, H + 2.4, 0.25, 0.25, 8, false);
  yield;
  return { x, y: H + 2.3, z, tipo: 'quiosco' };
}

/** Quiosco de prensa cerrado de madrugada: caja verde con persiana, tejadillo y franja encendida. */
export function* quioscoDePrensa(obra: ObraDeLaCelda, q: PiezaConFrente): Generator<void, LuzDelMobiliario, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const [x, z] = centro(q.caja);
  const w = q.caja.x1 - q.caja.x0;
  const d = q.caja.z1 - q.caja.z0;
  const frenteEnX = q.mira === 'n' || q.mira === 's';
  const largo = (frenteEnX ? w : d) - 0.08;
  const fondo = (frenteEnX ? d : w) - 0.1;
  mo.con(colocar(x, H, z, q.mira), () => {
    tono(mo, lineal(0x183826), ACABADO.chapa);
    bloque(mo, 0, 0, 0, largo, 2.15, fondo);
    tono(mo, lineal(0x122a1d), ACABADO.chapa);
    bloque(mo, 0, 2.15, 0.02, largo + 0.16, 0.12, fondo + 0.14);
    tono(mo, lineal(0x3b3f3c), ACABADO.chapa);
    bloque(mo, 0, 0.2, fondo / 2 + 0.01, largo - 0.3, 1.7, 0.02, 's');
  });
  em.con(colocar(x, H, z, q.mira), () => {
    em.color(2.6, 2.3, 1.4);
    em.poner('aEmisor', 0, 0);
    bloque(em, 0, 1.95, fondo / 2 + 0.025, largo - 0.2, 0.16, 0.02, 's');
  });
  const [fx, fz] = normalDe(q.mira);
  yield;
  return { x: x + fx * (fondo / 2 + 0.2), y: H + 2.0, z: z + fz * (fondo / 2 + 0.2), tipo: 'prensa' };
}

/**
 * La cabina: poste de hierro con marquesina curva que vuela sobre quien descuelga, el aparato de
 * monedas y el auricular de luz ámbar. Hoy la cabina y el refugio (`c.refugio`) se escriben igual.
 */
export function* cabina(obra: ObraDeLaCelda, c: CabinaDelPlano): Generator<void, LuzDelMobiliario, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const lados = obra.lados;
  const { x, z, mira } = c;
  tono(mo, HIERRO, ACABADO.hierro);
  mo.cilindro(x, z, H, H + 0.08, 0.2, 0.2, lados, true);
  mo.cilindro(x, z, H + 0.08, H + 2.75, 0.07, 0.06, lados, true);
  mo.con(colocar(x, H, z, mira), () => {
    /* El aparato, delante del poste y dentro de su caja. */
    tono(mo, lineal(0x2a2c2e), ACABADO.chapa);
    bloque(mo, 0, 1.05, 0.12, 0.34, 0.48, 0.14);
    tono(mo, lineal(0x8a8d8f), ACABADO.cromo);
    bloque(mo, 0.06, 1.34, 0.195, 0.1, 0.04, 0.01, 's');
    /* La marquesina: un perfil curvo que sale del poste y baja hacia delante, a 2,3-2,75 m. */
    const curva: [number, number][] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      curva.push([t * 1.25, 2.72 - t * t * 0.38]);
    }
    const contorno: [number, number][] = [...curva, ...[...curva].reverse().map(([a, b]): [number, number] => [a, b + 0.05])];
    tono(mo, HIERRO, ACABADO.hierro);
    const rotar = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
    mo.con(new THREE.Matrix4().copy(colocar(x, H, z, mira)).multiply(rotar), () => {
      mo.perfil(contorno, -0.5, 0.5);
    });
  });
  em.con(colocar(x, H, z, mira), () => {
    /* El auricular, colgado a un lado: la luz ámbar que se ve desde lejos. */
    em.color(AMBAR_HDR[0], AMBAR_HDR[1], AMBAR_HDR[2]);
    em.poner('aEmisor', 0, 0);
    bloque(em, -0.2, 1.12, 0.14, 0.07, 0.3, 0.08);
    /* La tira de luz bajo la marquesina. */
    em.color(AMBAR_HDR[0] * 0.3, AMBAR_HDR[1] * 0.3, AMBAR_HDR[2] * 0.3);
    bloque(em, 0, 2.5, 0.75, 0.6, 0.02, 0.05, 'b');
  });
  const [fx, fz] = normalDe(mira);
  yield;
  return { x: x + fx * 0.2, y: H + 1.3, z: z + fz * 0.2, tipo: 'cabina' };
}

/**
 * Las barreras de obra de una caja: hormigón rojiblanco en perfil «new jersey» y balizas. Sin ceder: la usan la
 * valla (una pieza) y el corte de obra (`piezas.ts`, dos filas en la misma pieza).
 */
export function barrerasDeObra(mo: Molde, em: Molde, c: CajaXZ): LuzDelMobiliario[] {
  const [x, z] = centro(c);
  const enX = c.x1 - c.x0 >= c.z1 - c.z0;
  const largo = enX ? c.x1 - c.x0 : c.z1 - c.z0;
  const luces: LuzDelMobiliario[] = [];
  const perfil: [number, number][] = [
    [-0.3, 0],
    [0.3, 0],
    [0.3, 0.08],
    [0.12, 0.28],
    [0.08, 0.82],
    [-0.08, 0.82],
    [-0.12, 0.28],
    [-0.3, 0.08],
  ];
  const piezas = Math.max(1, Math.floor(largo / 2));
  const paso = largo / piezas;
  for (let i = 0; i < piezas; i++) {
    const a = -largo / 2 + paso * (i + 0.5);
    const px = enX ? x + a : x;
    const pz = enX ? z : z + a;
    const m = new THREE.Matrix4().makeRotationY(enX ? 0 : Math.PI / 2).setPosition(px, H, pz);
    tono(mo, i % 2 === 0 ? lineal(0xb32420) : lineal(0xc9c6bd), ACABADO.pintura);
    mo.con(m, () => {
      /* El perfil «new jersey» en el plano z-y local, estirado a lo largo de x. */
      const rot = new THREE.Matrix4().makeRotationY(Math.PI / 2);
      mo.con(new THREE.Matrix4().copy(m).multiply(rot), () => mo.perfil(perfil, -paso / 2 + 0.03, paso / 2 - 0.03));
    });
    if (i % 2 === 0) {
      em.color(AMBAR_HDR[0], AMBAR_HDR[1], AMBAR_HDR[2]);
      em.poner('aEmisor', 2, azarEn(Math.round(px * 4), Math.round(pz * 4)));
      em.cilindro(px, pz, H + 0.82, H + 0.97, 0.07, 0.07, 6, true);
      luces.push({ x: px, y: H + 0.9, z: pz, tipo: 'baliza' });
    }
  }
  return luces;
}

/** Las vallas donde una calle sigue fuera del barrio: barreras de hormigón rojiblancas y balizas. */
export function* valla(obra: ObraDeLaCelda, c: CajaXZ): Generator<void, LuzDelMobiliario[], void> {
  const luces = barrerasDeObra(obra.m.mobiliario, obra.m.emisivo, c);
  yield;
  return luces;
}
