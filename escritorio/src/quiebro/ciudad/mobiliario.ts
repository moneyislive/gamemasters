/**
 * EL MOBILIARIO: bancos, la fuente, el quiosco de la plaza, los de prensa, las cabinas y los refugios, y las vallas
 * del borde, y lo que comparten todas las piezas (la cota del bordillo, cómo se colocan, los colores). Las farolas
 * van en `farolas.ts`, las tapas y las alcantarillas en `tapas.ts`, el viaducto en `viaducto.ts`, y qué pieza va en
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
 * z hacia su frente) y se colocan con una matriz.
 *
 * ═══ EL GRADO DE LA CELDA (§3.1 del plan del detalle) ═══
 *
 * Cada pieza se escribe con el grado de su celda (`obra.grado`): 1 en N0 y N1 (las nueve celdas), 2 en el anillo de
 * N2 y N3 y 3 en su bloque del centro. El grado nunca cambia cerca de la cámara (`grados.ts`), así que lo que un
 * grado añade no salta a los pies de nadie. Lo que añade cada grado:
 *
 *   · g1: la SILUETA de oficio con los triángulos de hoy: el costado de fundición del banco en perfil (y no dos
 *     cajas), la marquesina curva y el poste biselado de la cabina, el tejadillo volado del quiosco de prensa, el
 *     pilón en perfil y la columna y la taza de la fuente en torno. Casi todo cabe en lo que costaba hoy.
 *   · g2: más lados y más perfil donde se ve de lejos (la taza, el tejado del quiosco, su crestería).
 *   · g3: lo que se ve de cerca: los listones redondeados del banco (con el canto que se gasta), las columnas con
 *     basa y capitel del quiosco y sus revistas, las cantoneras del quiosco de prensa, el cordón del auricular.
 *
 * LA REGLA CONTRA EL TEMBLOR (§3.1: nada más fino que 18 cm en g2 de N2 y 14 en g2 de N3; 9 y 6 cm en g3) vale
 * para lo que un grado AÑADE. No la cumplen, y es a sabiendas:
 *   · lo que tiene el grueso de hoy en todos los grados (las columnas del quiosco, de 10 cm; el poste de la cabina,
 *     de 12; los listones y los costados del banco): el grado les cambia los lados o el perfil, no el grueso, y
 *     tiemblan lo mismo que hoy;
 *   · las puntas de la crestería: su base es de 31 cm (g3) y 52 (g2), y afinan a punta como cualquier remate;
 *   · lo que va a ras de una cara y no hace silueta (la ranura del monedero, de 1 × 4 cm; la boca del buzón de
 *     prensa): a lo lejos es un píxel de otro color, no un borde que aparece y desaparece;
 *   · el agua de g3 (los chorros, de 3,6 cm): va en el cristal, con una opacidad de 0,05 a 0,4;
 *   · el cordón del auricular de g3 (1,2 cm, negro delante de la chapa oscura del aparato: a 20 m no se ve, y no
 *     hay contraste que tiemble);
 *   · y las barras del pictograma de g3, en lo emisivo (7 cm: 6 cm es el mínimo de N3; en N2 se quedan algo por
 *     debajo, y es luz sobre fondo oscuro).
 * Los caños de la fuente, de 9 cm, ya la cumplen.
 *
 * Los topes por pieza y grado son los de §3.1 (`TOPE_POR_PIEZA`); los mira `quiebro-ciudad/mobiliario.ts`.
 *
 * ═══ LA MATERIA: CADA PARTE CON SU FAMILIA ═══
 *
 * El acabado de cada parte dice su familia (`OFICIO` de `materiales.ts`): hierro fundido pintado, madera, piedra,
 * chapa, la persiana ondulada, el plástico de los carteles. Donde una pieza tiene chaflanes (`cajaBiselada`, las
 * franjas de un perfil) lleva la marca de chaflán: ahí la pintura salta y la madera se pule (desde N2). En N0 la
 * familia no se reparte y todo se pinta como hoy.
 *
 * ═══ CADA PIEZA CEDE ═══
 *
 * Cada pieza es un escritor de pieza (`EscritorDePieza` de `celdas.ts`): escribe en los moldes de su obra, cede
 * el paso y devuelve sus luces. Entre dos cesiones no se escribe más que el trozo del nivel (600 triángulos en
 * N0, 1.000 en N1-N3, sumando familias): la ventana sólo empieza un trozo si le cabe entero en el fotograma. La
 * fuente y el quiosco de la plaza ceden dos veces en g3.
 *
 * ═══ LA LUZ NO SE MUEVE ═══
 *
 * Lo que devuelve cada pieza (su luz) sale en el MISMO sitio en todos los grados y es el de siempre: la luz de las
 * celdas de fuera de la ventana se saca en grado 1 (`fuentesDeLaCelda`), y alimenta la luz horneada, los halos y
 * las tarjetas.
 *
 * Todo lo que se apoya en la acera o en la plaza arranca a la cota del bordillo.
 */
import * as THREE from 'three';
import type { Molde, P2, V3 } from './geometria';
import { OFICIO, lineal } from './materiales';
import type { CabinaDelPlano, CajaXZ, FuenteDelPlano, GradoDeLaCelda, Orientacion, PiezaConFrente } from './tipos';
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

/** Un acabado de `aAcabado`: [x, y] (ver `ACABADO` y `OFICIO` de `materiales.ts`). */
export type Acabado = readonly [number, number];

export function tono(m: Molde, color: Rgb, acabado: Acabado): void {
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

const AGUA_OSCURA: Rgb = lineal(0x0b1214);
/*
 * LAS PINTURAS DEL HIERRO DE ESTE FICHERO. `HIERRO` y `HIERRO_VERDE` son casi negros (luminancia 0,01): desde N1 la
 * pintura es dieléctrica y el color es todo lo que se ve, así que el costado del banco salía negro plano y el
 * desconchón y la mugre no tenían contra qué verse. Las piezas de aquí llevan una fundición pintada que se lee de
 * noche: el verde del banco tiene la luminancia de su madera (0,058, seis veces la de `HIERRO`), y la antracita de la
 * cabina y los verdes del refugio y de los quioscos, de dos a cuatro veces. Las farolas y las piezas de
 * FAROLAS-Y-PIEZAS siguen con `HIERRO` y `HIERRO_VERDE`, que son suyas. En N0 (sin familias: el metal del acabado,
 * 0,7) el cambio apenas se nota: el hierro sigue oscuro y metálico, un poco menos negro.
 */
const VERDE_DE_FUNDICION: Rgb = lineal(0x384b3e);
const ANTRACITA: Rgb = lineal(0x2c3134);
const VERDE_DEL_REFUGIO: Rgb = lineal(0x25392e);
const VERDE_DEL_QUIOSCO: Rgb = lineal(0x243529);
/*
 * El ámbar del auricular y del pictograma, en HDR pero bajo: el ACES del juego (exposición 1,15) lleva el
 * `AMBAR_HDR` de la tira (5,0; 2,4; 0,45) a (254, 247, 224), casi blanco, y éste, solo, a (250, 171, 62). En la
 * foto sale más amarillo, (255, 255, 110), porque encima se suman el halo y la luz horneada de la cabina
 * (`fuentes.ts`, que no es de aquí); con el de la tira salía blanco puro.
 */
const AMBAR_DEL_AURICULAR: Rgb = [1.2, 0.24, 0.012];
const CHAPA_DEL_APARATO: Rgb = lineal(0x2a2c2e);
const VERDE_DE_PRENSA: Rgb = lineal(0x21452f);
const VERDE_DE_PRENSA_OSCURO: Rgb = lineal(0x122a1d);
const GRIS_DE_PERSIANA: Rgb = lineal(0x4a4f4c);
const NEGRO_DEL_CORDON: Rgb = lineal(0x0a0a0b);

/* ═══════════════════════════════ LOS TOPES Y LAS AYUDAS ═══════════════════════════════ */

/** El tipo de una pieza de este fichero (lo que mide `quiebro-ciudad/mobiliario.ts`). */
export type PiezaDelMobiliario = 'banco' | 'fuente' | 'quiosco' | 'prensa' | 'cabina' | 'refugio';

/**
 * LOS TOPES POR PIEZA Y GRADO de §3.1 del plan (triángulos, sumando las familias: mobiliario, emisivo y cristal).
 * La cabina y el refugio comparten el de la cabina. La valla no está en la tabla del plan: es del barrio viejo (en las
 * trazas no hay ninguna), y en g1 es la de hoy.
 */
export const TOPE_POR_PIEZA: Readonly<Record<PiezaDelMobiliario, Readonly<Record<GradoDeLaCelda, number>>>> = {
  banco: { 1: 130, 2: 320, 3: 600 },
  fuente: { 1: 300, 2: 700, 3: 1800 },
  quiosco: { 1: 230, 2: 500, 3: 1500 },
  prensa: { 1: 60, 2: 250, 3: 600 },
  cabina: { 1: 160, 2: 380, 3: 700 },
  refugio: { 1: 160, 2: 380, 3: 700 },
};

/** El perfil de `Molde.perfil` (x, y) pasa a (z, y) local, estirado a lo largo de −x: la z del perfil es −x. */
const PERFIL_A_LO_LARGO = new THREE.Matrix4().makeRotationY(-Math.PI / 2);

/** El producto de unas matrices, de izquierda a derecha (la última se aplica la primera). */
function por(...ms: readonly THREE.Matrix4[]): THREE.Matrix4 {
  const r = new THREE.Matrix4();
  for (const m of ms) r.multiply(m);
  return r;
}

const mover = (x: number, y: number, z: number): THREE.Matrix4 => new THREE.Matrix4().makeTranslation(x, y, z);
const girarEnX = (a: number): THREE.Matrix4 => new THREE.Matrix4().makeRotationX(a);

/** Una caja biselada por centro y medidas, con `cara` en sus caras y `canto` (la marca de chaflán) en sus chaflanes. */
export function biselada(m: Molde, cx: number, y0: number, cz: number, ax: number, alto: number, az: number, bisel: number, cara: Acabado, canto: Acabado, caras = 'nseoab'): void {
  m.cajaBiselada(cx - ax / 2, y0, cz - az / 2, cx + ax / 2, y0 + alto, cz + az / 2, bisel, caras, {
    alChaflan: (enChaflan) => {
      const a = enChaflan ? canto : cara;
      m.poner('aAcabado', a[0], a[1]);
    },
  });
}

/**
 * Un perfil de oficio (`Molde.perfil`, con las normales suaves): sus dos tapas con `cara` y las franjas del contorno
 * con `canto` (las que diga `esCanto`; todas si no lo dice). Mismos triángulos que un perfil.
 */
function perfilDeOficio(m: Molde, puntos: readonly P2[], z0: number, z1: number, cara: Acabado, canto: Acabado, suave: number, esCanto?: (i: number) => boolean): void {
  m.poner('aAcabado', cara[0], cara[1]);
  m.perfil(puntos, z0, z1, { suave, lados: esCanto === undefined ? () => false : (i) => !esCanto(i) });
  m.poner('aAcabado', canto[0], canto[1]);
  m.perfil(puntos, z0, z1, { suave, tapas: false, ...(esCanto !== undefined ? { lados: esCanto } : {}) });
}

/** Un anillo plano (corona) de radio r0 a r1 a la altura y, mirando arriba (o abajo). */
function corona(m: Molde, cx: number, cz: number, r0: number, r1: number, y: number, lados: number, arriba = true): void {
  for (let i = 0; i < lados; i++) {
    const a0 = (i / lados) * Math.PI * 2;
    const a1 = ((i + 1) / lados) * Math.PI * 2;
    const p = (r: number, a: number): V3 => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
    if (arriba) m.quad(p(r1, a0), p(r0, a0), p(r0, a1), p(r1, a1), [0, 1, 0], [0, 0, 1, 0, 1, 1, 0, 1]);
    else m.quad(p(r1, a1), p(r0, a1), p(r0, a0), p(r1, a0), [0, -1, 0], [0, 0, 1, 0, 1, 1, 0, 1]);
  }
}

/** Un disco plano mirando arriba, en abanico: `lados` triángulos. `giro`: el ángulo del primer vértice. */
function disco(m: Molde, cx: number, cz: number, r: number, y: number, lados: number, giro = 0): void {
  const c = m.vertice(cx, y, cz, 0, 1, 0, cx, cz);
  const anillo: number[] = [];
  for (let i = 0; i <= lados; i++) {
    const a = giro + (i / lados) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    anillo.push(m.vertice(x, y, z, 0, 1, 0, x, z));
  }
  for (let i = 0; i < lados; i++) m.tri(c, anillo[i + 1] as number, anillo[i] as number);
}

/**
 * UNA LÁMINA DE AGUA en el molde del cristal: la superficie de revolución del `contorno` (puntos (r, y) desde arriba,
 * cayendo), abierta, con la UV MARCADA como agua que cae (`cristal.ts`): u = `U_DEL_AGUA` + los metros alrededor,
 * v = los metros caídos desde el primer punto. El cristal es de dos caras: el sentido no importa, la normal mira fuera.
 */
function laminaDeAgua(m: Molde, cx: number, cz: number, contorno: readonly P2[], lados: number): void {
  const n = contorno.length;
  if (n < 2) return;
  let radio = 0;
  for (const p of contorno) radio = Math.max(radio, p[0]);
  const caida: number[] = [0];
  for (let s = 1; s < n; s++) {
    const a = contorno[s - 1] as P2;
    const b = contorno[s] as P2;
    caida.push((caida[s - 1] as number) + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const anillos: number[][] = [];
  for (let s = 0; s < n; s++) {
    const p = contorno[s] as P2;
    const q = contorno[Math.min(n - 1, s + 1)] as P2;
    const o = contorno[Math.max(0, s - 1)] as P2;
    /* La normal en el plano (r, y): perpendicular a la tangente, hacia fuera. */
    const tr = q[0] - o[0];
    const ty = q[1] - o[1];
    const l = Math.hypot(tr, ty) || 1;
    const nr = -ty / l;
    const ny = tr / l;
    const anillo: number[] = [];
    for (let k = 0; k <= lados; k++) {
      const a = (k / lados) * Math.PI * 2;
      const c = Math.cos(a);
      const si = Math.sin(a);
      anillo.push(m.vertice(cx + c * p[0], p[1], cz + si * p[0], c * Math.abs(nr), ny, si * Math.abs(nr), U_DEL_AGUA + a * radio, caida[s] as number));
    }
    anillos.push(anillo);
  }
  for (let s = 0; s < n - 1; s++) {
    const a = anillos[s] as number[];
    const b = anillos[s + 1] as number[];
    for (let k = 0; k < lados; k++) {
      m.tri(a[k] as number, a[k + 1] as number, b[k + 1] as number);
      m.tri(a[k] as number, b[k + 1] as number, b[k] as number);
    }
  }
}

/** La u a partir de la cual el cristal es agua que cae (`cristal.ts`). */
export const U_DEL_AGUA = 2000;
/** La u de los paños del quiosco de la plaza: `U_DE_LOS_PANOS + id` (0-7) más la fracción a lo ancho (`cristal.ts`). */
export const U_DE_LOS_PANOS = 1000;

/* ═══════════════════════════════ EL BANCO ═══════════════════════════════ */

/**
 * El costado de fundición del banco en g1 y g2, en su plano (z hacia el frente, y arriba): pata delantera, asiento,
 * respaldo inclinado, pata trasera y el arco entre las dos. Ocho puntos: 28 triángulos, lo que costaban las dos
 * cajas de hoy más cuatro.
 */
const COSTADO_SENCILLO: readonly P2[] = [
  [0.2, 0],
  [0.22, 0.44],
  [-0.12, 0.44],
  [-0.2, 0.86],
  [-0.24, 0.86],
  [-0.17, 0.42],
  [-0.19, 0],
  [0, 0.3],
];

/** El costado de g3: la pata delantera que se abre, la nariz del asiento, el respaldo en dos tramos y el arco. */
const COSTADO_DE_FUNDICION: readonly P2[] = [
  [0.21, 0],
  [0.23, 0.4],
  [0.235, 0.44],
  [-0.11, 0.44],
  [-0.15, 0.62],
  [-0.205, 0.86],
  [-0.24, 0.86],
  [-0.19, 0.6],
  [-0.165, 0.4],
  [-0.2, 0],
  [-0.13, 0],
  [-0.05, 0.26],
  [0.05, 0.26],
  [0.13, 0],
];

/** La sección de un listón del asiento (z, y) redondeado arriba: 20 triángulos; las franjas 2 y 4 son el canto. */
function seccionDeListon(ancho: number, grueso: number, canto: number): P2[] {
  const a = ancho / 2;
  return [
    [-a, 0],
    [a, 0],
    [a, grueso - canto],
    [a - canto, grueso],
    [-a + canto, grueso],
    [-a, grueso - canto],
  ];
}

/** La sección de un listón del respaldo (z, y), centrada, con el canto redondeado por delante (franjas 1 y 3). */
function seccionDelRespaldo(grueso: number, alto: number, canto: number): P2[] {
  const g = grueso / 2;
  const h = alto / 2;
  return [
    [-g, -h],
    [g - canto, -h],
    [g, -h + canto],
    [g, h - canto],
    [g - canto, h],
    [-g, h],
  ];
}

/** La z del frente del respaldo de g3 a la altura y. */
function respaldoEn(y: number): number {
  return y <= 0.62 ? -0.11 - ((y - 0.44) * 0.04) / 0.18 : -0.15 - ((y - 0.62) * 0.055) / 0.24;
}

/**
 * Banco de fundición y listones, dentro de su caja (2 × 0,5), mirando a `mira`. g1-g2: costados de perfil (con el
 * canto marcado desde g2) y cinco listones. g3: el costado de fundición entero, siete listones redondeados (cuatro de
 * asiento y tres de respaldo, inclinados con él) con su canto, que es lo que se gasta.
 */
export function* banco(obra: ObraDeLaCelda, b: PiezaConFrente): Generator<void, void, void> {
  const mo = obra.m.mobiliario;
  const g = obra.grado;
  const [cx, cz] = centro(b.caja);
  const largo = Math.max(b.caja.x1 - b.caja.x0, b.caja.z1 - b.caja.z0) - 0.05;
  /* El frente es `mira`: en local, +z. El largo del banco va por x local. */
  const base = colocar(cx, H, cz, b.mira);
  const aLoLargo = por(base, PERFIL_A_LO_LARGO);
  tono(mo, VERDE_DE_FUNDICION, OFICIO.hierro);
  const costado = g >= 3 ? COSTADO_DE_FUNDICION : COSTADO_SENCILLO;
  for (const s of [-1, 1]) {
    const xs = s * (largo / 2 - 0.12);
    mo.con(aLoLargo, () => perfilDeOficio(mo, costado, -xs - 0.026, -xs + 0.026, OFICIO.hierro, OFICIO.hierroCanto, Math.PI / 5));
  }
  mo.color(MADERA[0], MADERA[1], MADERA[2]);
  if (g < 3) {
    mo.poner('aAcabado', OFICIO.madera[0], OFICIO.madera[1]);
    mo.con(base, () => {
      for (let i = 0; i < 3; i++) bloque(mo, 0, 0.44, 0.155 - i * 0.125, largo, 0.035, 0.11, 'nseoa');
    });
    const inclinado = Math.atan2(0.08, 0.42);
    for (const y of [0.6, 0.76]) {
      const z = -0.12 - (0.08 * (y - 0.44)) / 0.42 + 0.02;
      mo.con(por(base, mover(0, y, z), girarEnX(-inclinado)), () => bloque(mo, 0, -0.055, 0, largo, 0.11, 0.03, 'nseoab'));
    }
  } else {
    const asiento = seccionDeListon(0.075, 0.035, 0.012);
    const cantoDelAsiento = (i: number): boolean => i === 2 || i === 4;
    for (let i = 0; i < 4; i++) {
      const zc = 0.1875 - i * 0.09;
      const puntos = asiento.map(([pz, py]): P2 => [zc + pz, 0.44 + py]);
      mo.con(aLoLargo, () => perfilDeOficio(mo, puntos, -largo / 2, largo / 2, OFICIO.madera, OFICIO.maderaCanto, Math.PI / 3, cantoDelAsiento));
    }
    const respaldo = seccionDelRespaldo(0.028, 0.095, 0.01);
    const cantoDelRespaldo = (i: number): boolean => i === 1 || i === 3;
    const inclinado = Math.atan2(0.05, 0.21);
    /* Los tres del respaldo, de 9,5 cm con 1,5 de hueco: el de arriba cubre la altura de 0,75 m sobre la acera (los
       rayos con que el comprobador busca lo pintado en la caja van a 0,3, 0,9 y 1,5 m del suelo). */
    for (const y of [0.555, 0.665, 0.775]) {
      const z = respaldoEn(y) + 0.016;
      mo.con(por(base, mover(0, y, z), girarEnX(-inclinado), PERFIL_A_LO_LARGO), () =>
        perfilDeOficio(mo, respaldo, -largo / 2, largo / 2, OFICIO.madera, OFICIO.maderaCanto, Math.PI / 3, cantoDelRespaldo),
      );
    }
  }
  yield;
}

/* ═══════════════════════════════ LA FUENTE ═══════════════════════════════ */

/**
 * LA TAZA CON GALLONES: una superficie de revolución del `contorno` (r, y), subiendo por fuera como la de `torno`, con
 * el radio de cada anillo ondulado en `lobulos` gajos (r · (1 + ½ · amplitud · cos(lobulos · ángulo))): los gallones
 * de una taza de fuente. Es pieza aparte (no comparte anillos con la columna, que entra por dentro), así que no hay
 * rendijas entre polígonos de distinto número de lados. Normales por diferencias en la rejilla, orientadas hacia fuera
 * con la normal del contorno; el mismo sentido de los triángulos que `torno`. UV como `torno`.
 */
function tornoGallonado(m: Molde, cx: number, cz: number, contorno: readonly P2[], amplitud: readonly number[], lados: number, lobulos: number): void {
  const n = contorno.length;
  let radioDeU = 0;
  for (const p of contorno) radioDeU = Math.max(radioDeU, p[0]);
  const pos: V3[][] = [];
  const recorrido: number[] = [(contorno[0] as P2)[1]];
  for (let s = 0; s < n; s++) {
    const [r, y] = contorno[s] as P2;
    if (s > 0) {
      const [r0, y0] = contorno[s - 1] as P2;
      recorrido.push((recorrido[s - 1] as number) + Math.hypot(r - r0, y - y0));
    }
    const fila: V3[] = [];
    for (let k = 0; k <= lados; k++) {
      const a = (k / lados) * Math.PI * 2;
      const rr = r * (1 + (amplitud[s] ?? 0) * Math.cos(lobulos * a) * 0.5);
      fila.push([cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr]);
    }
    pos.push(fila);
  }
  const indices: number[][] = [];
  for (let s = 0; s < n; s++) {
    const fila = pos[s] as V3[];
    const antes = pos[Math.max(0, s - 1)] as V3[];
    const despues = pos[Math.min(n - 1, s + 1)] as V3[];
    const [pr0, py0] = contorno[Math.max(0, s - 1)] as P2;
    const [pr1, py1] = contorno[Math.min(n - 1, s + 1)] as P2;
    /* La normal del contorno en el plano (r, y): la de la derecha de quien sube (la de fuera). */
    const tr = pr1 - pr0;
    const ty = py1 - py0;
    const lt = Math.hypot(tr, ty) || 1;
    const nr = ty / lt;
    const ny = -tr / lt;
    const vuelta: number[] = [];
    for (let k = 0; k <= lados; k++) {
      const a = (k / lados) * Math.PI * 2;
      const p = fila[k] as V3;
      const q0 = fila[k === 0 ? lados - 1 : k - 1] as V3;
      const q1 = fila[k === lados ? 1 : k + 1] as V3;
      const d0 = antes[k] as V3;
      const d1 = despues[k] as V3;
      const ta: V3 = [q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]];
      const ts: V3 = [d1[0] - d0[0], d1[1] - d0[1], d1[2] - d0[2]];
      let nx = ts[1] * ta[2] - ts[2] * ta[1];
      let nyy = ts[2] * ta[0] - ts[0] * ta[2];
      let nz = ts[0] * ta[1] - ts[1] * ta[0];
      if (nx * nr * Math.cos(a) + nyy * ny + nz * nr * Math.sin(a) < 0) {
        nx = -nx;
        nyy = -nyy;
        nz = -nz;
      }
      const l = Math.hypot(nx, nyy, nz) || 1;
      vuelta.push(m.vertice(p[0], p[1], p[2], nx / l, nyy / l, nz / l, a * radioDeU, recorrido[s] as number));
    }
    indices.push(vuelta);
  }
  for (let s = 0; s < n - 1; s++) {
    const abajo = indices[s] as number[];
    const arriba = indices[s + 1] as number[];
    for (let k = 0; k < lados; k++) {
      const a = abajo[k] as number;
      const b = abajo[k + 1] as number;
      const c = arriba[k + 1] as number;
      const d = arriba[k] as number;
      /* Visto desde fuera: a, d, c y a, c, b (como `torno`). */
      m.tri(a, d, c);
      m.tri(a, c, b);
    }
  }
}

/**
 * El pilón (fuera, arriba) por grado: la cara de fuera, el reborde y la de dentro hasta el agua (a 0,38). g1 lleva
 * ya el reborde de 3 cm (32 triángulos más que la caja octogonal): sin él, en N0 y N1 el pilón era una caja.
 */
const PILON_POR_GRADO: Readonly<Record<GradoDeLaCelda, readonly P2[]>> = {
  1: [
    [0, 0],
    [0, 0.47],
    [0.03, 0.5],
    [0.03, 0.56],
    [-0.3, 0.56],
    [-0.3, 0.38],
  ],
  2: [
    [0, 0],
    [0, 0.47],
    [0.03, 0.5],
    [0.03, 0.56],
    [-0.3, 0.56],
    [-0.3, 0.38],
  ],
  3: [
    [0.04, 0],
    [0.04, 0.08],
    [0, 0.11],
    [0, 0.46],
    [0.035, 0.5],
    [0.035, 0.57],
    [0, 0.59],
    [-0.28, 0.59],
    [-0.31, 0.56],
    [-0.31, 0.38],
  ],
};

/** La columna y la taza en torno (r, y), por grado: subiendo por fuera, el reborde y el labio de dentro. */
const COLUMNA_POR_GRADO: Readonly<Record<GradoDeLaCelda, { readonly lados: number; readonly contorno: readonly P2[] }>> = {
  1: {
    lados: 10,
    contorno: [
      [0.34, 0.38],
      [0.3, 0.55],
      [0.21, 1.1],
      [0.3, 1.2],
      [0.86, 1.42],
      [0.86, 1.52],
      [0.72, 1.5],
    ],
  },
  2: {
    lados: 12,
    contorno: [
      [0.36, 0.38],
      [0.27, 0.56],
      [0.23, 0.74],
      [0.29, 0.9],
      [0.2, 1.08],
      [0.3, 1.2],
      [0.58, 1.33],
      [0.87, 1.42],
      [0.87, 1.53],
      [0.73, 1.52],
    ],
  },
  /* En g3 la columna acaba en el capitel, dentro de la taza: la taza es pieza aparte, con gallones (`TAZA_DE_G3`). */
  3: {
    lados: 16,
    contorno: [
      [0.38, 0.38],
      [0.33, 0.48],
      [0.27, 0.56],
      [0.23, 0.72],
      [0.3, 0.86],
      [0.24, 0.98],
      [0.19, 1.07],
      [0.24, 1.15],
      [0.32, 1.21],
    ],
  },
};

/**
 * La taza de g3 (r, y): la panza con ocho gallones que se abren desde el capitel, el reborde y el labio, con la
 * amplitud del gajo en cada anillo (0 donde nace, en la columna).
 */
const TAZA_DE_G3: { readonly lados: number; readonly lobulos: number; readonly contorno: readonly P2[]; readonly amplitud: readonly number[] } = {
  lados: 32,
  lobulos: 8,
  contorno: [
    [0.3, 1.19],
    [0.6, 1.33],
    [0.88, 1.43],
    [0.88, 1.52],
    [0.84, 1.545],
    [0.74, 1.53],
  ],
  amplitud: [0, 0.14, 0.05, 0.05, 0.04, 0.03],
};

/** El surtidor de lo alto (r, y), por grado; acaba en el eje. */
const SURTIDOR_POR_GRADO: Readonly<Record<GradoDeLaCelda, { readonly lados: number; readonly contorno: readonly P2[] }>> = {
  1: {
    lados: 8,
    contorno: [
      [0.12, 1.49],
      [0.09, 2.0],
      [0.16, 2.08],
      [0, 2.25],
    ],
  },
  2: {
    lados: 8,
    contorno: [
      [0.13, 1.5],
      [0.1, 1.8],
      [0.07, 2.0],
      [0.16, 2.07],
      [0.12, 2.12],
      [0, 2.3],
    ],
  },
  3: {
    lados: 12,
    contorno: [
      [0.14, 1.51],
      [0.11, 1.62],
      [0.09, 1.95],
      [0.13, 2.0],
      [0.18, 2.06],
      [0.14, 2.12],
      [0.06, 2.22],
      [0, 2.3],
    ],
  },
};

/** La lámina que rebosa de la taza al pilón (r, y), por grado, y sus lados. */
const LAMINA_POR_GRADO: Readonly<Record<GradoDeLaCelda, { readonly lados: number; readonly contorno: readonly P2[] }>> = {
  1: {
    lados: 10,
    contorno: [
      [0.875, 1.5],
      [0.99, 0.39],
    ],
  },
  2: {
    lados: 12,
    contorno: [
      [0.885, 1.52],
      [0.93, 1.2],
      [1.0, 0.39],
    ],
  },
  3: {
    lados: 16,
    contorno: [
      [0.895, 1.52],
      [0.915, 1.35],
      [0.96, 1.0],
      [1.02, 0.39],
    ],
  },
};

/** La altura del agua de la taza, por grado (justo por debajo del labio). */
const AGUA_DE_LA_TAZA: Readonly<Record<GradoDeLaCelda, number>> = { 1: 1.49, 2: 1.51, 3: 1.52 };

/**
 * La fuente: pilón octogonal con su reborde (el perfil corrido con ingletes, `extruirPerfil`), el agua, la columna
 * abalaustrada y la taza en torno (en g3, la taza aparte con sus ocho GALLONES, `tornoGallonado`), el surtidor, la
 * lámina de agua que rebosa de la taza (en el cristal, que la mueve con `uTiempo`: `cristal.ts`) y, en g3, cuatro
 * caños con su chorro. Cede dos veces en g3: tras la taza y al final.
 */
export function* fuente(obra: ObraDeLaCelda, f: FuenteDelPlano): Generator<void, void, void> {
  const mo = obra.m.mobiliario;
  const cr = obra.m.cristal;
  const g = obra.grado;
  const { x, z } = f;
  const r = f.radio - 0.05;
  /* El pilón: el octógono con las caras planas en los ejes, recorrido con el ángulo bajando (fuera a la derecha). */
  const esquina = r / Math.cos(Math.PI / 8);
  const camino: V3[] = [];
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 - (k * Math.PI) / 4;
    camino.push([x + Math.cos(a) * esquina, H, z + Math.sin(a) * esquina]);
  }
  tono(mo, PIEDRA, OFICIO.piedra);
  mo.extruirPerfil(camino, PILON_POR_GRADO[g], { cerrado: true, suave: Math.PI / 5 });
  tono(mo, AGUA_OSCURA, OFICIO.agua);
  const hondo = (PILON_POR_GRADO[g][PILON_POR_GRADO[g].length - 1] as P2)[0];
  disco(mo, x, z, (r + hondo) / Math.cos(Math.PI / 8), H + 0.38, 8, Math.PI / 8);
  const columna = COLUMNA_POR_GRADO[g];
  tono(mo, PIEDRA, OFICIO.piedra);
  mo.torno(x, z, columna.contorno.map(([cr0, cy]): P2 => [cr0, H + cy]), columna.lados, { tapas: false });
  let labio = (columna.contorno[columna.contorno.length - 1] as P2)[0];
  let ladosDelAgua = columna.lados;
  if (g >= 3) {
    const t = TAZA_DE_G3;
    tornoGallonado(mo, x, z, t.contorno.map(([tr, ty]): P2 => [tr, H + ty]), t.amplitud, t.lados, t.lobulos);
    labio = (t.contorno[t.contorno.length - 1] as P2)[0];
    ladosDelAgua = t.lados;
    yield;
  }
  tono(mo, AGUA_OSCURA, OFICIO.agua);
  disco(mo, x, z, labio + 0.01, H + AGUA_DE_LA_TAZA[g], ladosDelAgua);
  const surtidor = SURTIDOR_POR_GRADO[g];
  tono(mo, PIEDRA, OFICIO.piedra);
  mo.torno(x, z, surtidor.contorno.map(([sr, sy]): P2 => [sr, H + sy]), surtidor.lados, { tapas: false });
  const lamina = LAMINA_POR_GRADO[g];
  laminaDeAgua(cr, x, z, lamina.contorno.map(([lr, ly]): P2 => [lr, H + ly]), lamina.lados);
  if (g >= 3) {
    /* Los cuatro caños, de bronce oscuro, y su chorro en arco hasta el pilón. */
    tono(mo, lineal(0x3a2e1c), OFICIO.hierro);
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const p0: V3 = [x + c * 0.26, H + 0.86, z + s * 0.26];
      const p1: V3 = [x + c * 0.42, H + 0.84, z + s * 0.42];
      mo.tubo([p0, p1], 0.045, 6);
      const chorro: V3[] = [];
      for (let i = 0; i <= 5; i++) {
        const t = i / 5;
        const d = 0.44 + t * 0.62;
        chorro.push([x + c * d, H + 0.84 - t * t * 0.46, z + s * d]);
      }
      chorroDeAgua(cr, chorro, 0.018, 4);
    }
  }
  yield;
}

/** Un chorro de agua en el cristal: un tubo a lo largo de `puntos` con la UV marcada como agua que cae. */
function chorroDeAgua(m: Molde, puntos: readonly V3[], radio: number, lados: number): void {
  tuboLiso(m, puntos, radio, lados, U_DEL_AGUA);
}

/**
 * Un tubo a lo largo de `puntos` con el marco de siempre (la normal de lado es la tangente por la vertical, y sólo
 * si la tangente es vertical, la x): no salta de un anillo al siguiente como el de `Molde.tubo` cuando la tangente
 * pasa cerca de la vertical, y así ninguna cara sale del revés. u = `u0` + los metros alrededor; v = lo recorrido.
 */
function tuboLiso(m: Molde, puntos: readonly V3[], radio: number, lados: number, u0: number): void {
  const t = new THREE.Vector3();
  const n = new THREE.Vector3();
  const b = new THREE.Vector3();
  const arriba = new THREE.Vector3(0, 1, 0);
  const anillos: number[][] = [];
  let caida = 0;
  for (let i = 0; i < puntos.length; i++) {
    const p = puntos[i] as V3;
    const antes = puntos[Math.max(0, i - 1)] as V3;
    const despues = puntos[Math.min(puntos.length - 1, i + 1)] as V3;
    if (i > 0) caida += Math.hypot(p[0] - antes[0], p[1] - antes[1], p[2] - antes[2]);
    t.set(despues[0] - antes[0], despues[1] - antes[1], despues[2] - antes[2]).normalize();
    n.crossVectors(t, arriba);
    if (n.lengthSq() < 1e-8) n.set(1, 0, 0);
    n.normalize();
    b.crossVectors(t, n).normalize();
    const anillo: number[] = [];
    for (let k = 0; k <= lados; k++) {
      const a = (k / lados) * Math.PI * 2;
      const nx = n.x * Math.cos(a) + b.x * Math.sin(a);
      const ny = n.y * Math.cos(a) + b.y * Math.sin(a);
      const nz = n.z * Math.cos(a) + b.z * Math.sin(a);
      anillo.push(m.vertice(p[0] + nx * radio, p[1] + ny * radio, p[2] + nz * radio, nx, ny, nz, u0 + (k / lados) * radio * 6.283, caida));
    }
    anillos.push(anillo);
  }
  for (let i = 0; i < anillos.length - 1; i++) {
    const a = anillos[i] as number[];
    const c = anillos[i + 1] as number[];
    for (let k = 0; k < lados; k++) {
      m.tri(a[k] as number, a[k + 1] as number, c[k + 1] as number);
      m.tri(a[k] as number, c[k + 1] as number, c[k] as number);
    }
  }
}

/* ═══════════════════════════════ EL QUIOSCO DE LA PLAZA ═══════════════════════════════ */

/** La columna del quiosco en g3 (r, y): basa, fuste y capitel. */
const COLUMNA_DEL_QUIOSCO: readonly P2[] = [
  [0.075, 0.2],
  [0.075, 0.3],
  [0.048, 0.38],
  [0.045, 2.42],
  [0.09, 2.55],
];

/**
 * Los paños de cristal entre las ocho columnas, a `rp`, de 1 a 2,55 m. Cada paño lleva su número en la UV
 * (`U_DE_LOS_PANOS + id` más la fracción a lo ancho; v = la altura): la máscara de los paños rotos de `cristal.ts`
 * (el rompible futuro) los tira por número.
 */
function panosDelQuiosco(cr: Molde, x: number, z: number, rp: number): void {
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2;
    const a1 = ((i + 1) / 8) * Math.PI * 2;
    const p = (a: number, y: number): V3 => [x + Math.cos(a) * rp, y, z + Math.sin(a) * rp];
    const am = (a0 + a1) / 2;
    const u0 = U_DE_LOS_PANOS + i;
    cr.quad(p(a0, H + 1.0), p(a1, H + 1.0), p(a1, H + 2.55), p(a0, H + 2.55), [Math.cos(am), 0, Math.sin(am)], [u0, H + 1.0, u0 + 0.999, H + 1.0, u0 + 0.999, H + 2.55, u0, H + 2.55]);
  }
}

/** La crestería: `n` picos por lado del octógono de radio `R` a la altura `y`, de dos caras. */
function cresteria(mo: Molde, x: number, z: number, R: number, y: number, n: number, alto: number): void {
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2;
    const a1 = ((i + 1) / 8) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const fuera: V3 = [Math.cos(am), 0, Math.sin(am)];
    const dentro: V3 = [-fuera[0], 0, -fuera[2]];
    const p0 = [x + Math.cos(a0) * R, z + Math.sin(a0) * R];
    const p1 = [x + Math.cos(a1) * R, z + Math.sin(a1) * R];
    for (let k = 0; k < n; k++) {
      const t0 = k / n;
      const t1 = (k + 1) / n;
      const tm = (t0 + t1) / 2;
      const q = (t: number): [number, number] => [(p0[0] as number) + ((p1[0] as number) - (p0[0] as number)) * t, (p0[1] as number) + ((p1[1] as number) - (p0[1] as number)) * t];
      const [ax, az] = q(t0);
      const [bx, bz] = q(t1);
      const [mx, mz] = q(tm);
      const alto1 = alto * (k % 2 === 0 ? 1 : 0.7);
      const va = mo.vertice(ax, y, az, fuera[0], 0, fuera[2], 0, y);
      const vb = mo.vertice(bx, y, bz, fuera[0], 0, fuera[2], 1, y);
      const vm = mo.vertice(mx, y + alto1, mz, fuera[0], 0, fuera[2], 0.5, y + alto1);
      mo.tri(va, vm, vb);
      const wa = mo.vertice(ax, y, az, dentro[0], 0, dentro[2], 0, y);
      const wb = mo.vertice(bx, y, bz, dentro[0], 0, dentro[2], 1, y);
      const wm = mo.vertice(mx, y + alto1, mz, dentro[0], 0, dentro[2], 0.5, y + alto1);
      mo.tri(wa, wb, wm);
    }
  }
}

/**
 * El quiosco de la plaza: octogonal, de hierro verde y cristal, con tejado de pabellón y luz dentro. g1: el de hoy
 * con el alero por debajo (sin él, desde abajo se veía el cielo a través del tejado). g2: columnas de seis lados,
 * tejado en perfil y crestería. g3: columnas con basa y capitel (cede tras ellas), zócalo moldurado, mostrador
 * biselado y estantes con revistas.
 */
export function* quiosco(obra: ObraDeLaCelda, q: PiezaConFrente): Generator<void, LuzDelMobiliario, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const cr = obra.m.cristal;
  const g = obra.grado;
  const [x, z] = centro(q.caja);
  const r = Math.min(q.caja.x1 - q.caja.x0, q.caja.z1 - q.caja.z0) / 2 - 0.08;
  const rp = r - 0.08;
  const lados = g >= 3 ? 12 : 8;
  /* Las columnas (en g3, lo más caro: cede detrás). */
  tono(mo, VERDE_DEL_QUIOSCO, OFICIO.hierro);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = x + Math.cos(a) * rp;
    const pz = z + Math.sin(a) * rp;
    if (g >= 3) mo.torno(px, pz, COLUMNA_DEL_QUIOSCO.map(([cr0, cy]): P2 => [cr0, H + cy]), 6, { tapas: false });
    else mo.cilindro(px, pz, H + 0.2, H + 2.75, 0.05, 0.05, g >= 2 ? 6 : 4, false);
  }
  if (g >= 3) yield;
  /* El zócalo de granito y el suelo. */
  tono(mo, GRANITO, OFICIO.piedra);
  if (g >= 3) {
    mo.torno(
      x,
      z,
      [
        [r, H],
        [r, H + 0.15],
        [r - 0.03, H + 0.2],
      ],
      lados,
      { tapas: false },
    );
    disco(mo, x, z, r - 0.03, H + 0.2, lados);
  } else {
    mo.cilindro(x, z, H, H + 0.2, r, r, 8, false);
    disco(mo, x, z, r, H + 0.2, 8);
  }
  /* El antepecho, el entablamento y el alero. */
  tono(mo, VERDE_DEL_QUIOSCO, OFICIO.hierro);
  mo.cilindro(x, z, H + 0.2, H + 1.0, rp, rp, lados, false);
  mo.cilindro(x, z, H + 2.55, H + 2.75, rp + 0.05, rp + 0.05, lados, false);
  corona(mo, x, z, rp - 0.06, rp + 0.05, H + 2.55, lados, false);
  corona(mo, x, z, rp + 0.05, r + 0.45, H + 2.75, lados, false);
  /* El tejado de pabellón vuela por encima de la cabeza, fuera de la caja. */
  if (g >= 2) {
    mo.torno(
      x,
      z,
      [
        [r + 0.45, H + 2.75],
        [r + 0.1, H + 2.95],
        [0.5, H + 3.3],
        [0.22, H + 3.45],
      ],
      lados,
      { tapas: false },
    );
  } else mo.cilindro(x, z, H + 2.75, H + 3.45, r + 0.45, 0.25, 8, false);
  mo.cilindro(x, z, H + 3.45, H + 3.9, 0.12, 0.02, 6, false);
  if (g >= 2) cresteria(mo, x, z, r + 0.45, H + 2.75, g >= 3 ? 5 : 3, 0.2);
  /* Cristal entre 1 y 2,55 m, un paño por hueco. */
  panosDelQuiosco(cr, x, z, rp - 0.01);
  /* Dentro: un mostrador y la luz cálida del techo. */
  const [fx, fz] = normalDe(q.mira);
  tono(mo, MADERA, OFICIO.madera);
  if (g >= 3) biselada(mo, x - fx * 0.6, H + 0.2, z - fz * 0.6, 1.4, 0.95, 1.4, 0.03, OFICIO.madera, OFICIO.maderaCanto, 'nseoa');
  else bloque(mo, x - fx * 0.6, H + 0.2, z - fz * 0.6, 1.4, 0.95, 1.4, 'nseoa');
  if (g >= 3) {
    /* Los estantes del fondo con las revistas de cara, de colores apagados. */
    mo.con(colocar(x - fx * 1.2, H, z - fz * 1.2, q.mira), () => {
      tono(mo, MADERA, OFICIO.madera);
      for (const y of [1.35, 1.8]) bloque(mo, 0, y, 0, 1.4, 0.03, 0.22, 'nseoa');
      for (const y of [1.38, 1.83]) {
        for (let k = 0; k < 6; k++) {
          const h = azarEn(Math.round(x * 7 + k), Math.round(z * 7 + y * 10));
          const c: Rgb = [0.12 + 0.3 * h, 0.1 + 0.25 * ((h * 7.3) % 1), 0.1 + 0.3 * ((h * 13.7) % 1)];
          tono(mo, c, OFICIO.plastico);
          mo.quad([-0.62 + k * 0.215, y, 0.105], [-0.44 + k * 0.215, y, 0.105], [-0.44 + k * 0.215, y + 0.28, 0.06], [-0.62 + k * 0.215, y + 0.28, 0.06], [0, 0.16, 0.99], [0, y, 0.18, y, 0.18, y + 0.28, 0, y + 0.28]);
        }
      }
    });
  }
  /* El plafón del techo, tenue, y la lámpara que cuelga de él: una tulipa encendida de 35 cm. Los mismos
     triángulos que la columna de luz de 1,1 m que había (con el plafón, desde fuera era una «T» blanca). */
  em.color(1.8, 1.25, 0.75);
  em.poner('aEmisor', 0, 0);
  em.losa(x - 0.45, z - 0.45, x + 0.45, z + 0.45, H + 2.5, false);
  em.color(1.4, 0.9, 0.5);
  em.cilindro(x, z, H + 2.0, H + 2.35, 0.2, 0.07, 8, false);
  yield;
  return { x, y: H + 2.3, z, tipo: 'quiosco' };
}

/* ═══════════════════════════════ EL QUIOSCO DE PRENSA ═══════════════════════════════ */

/*
 * LAS PLANAS COLGADAS. Los carteles del quiosco son la prensa del día colgada por fuera: la primera plana de un diario
 * o la portada de una revista, dibujadas con quads de color (sin sombreador nuevo, y en todos los niveles: en N0 no hay
 * familias, y las pegatinas de la receta son de N3). Nada de letras ni de marcas: bloques que de 3 a 10 m se leen como
 * cabecera, titular, foto y renglones.
 *
 *   · El PAPEL (la capa 0, el cartel de siempre) va con el color de abajo y, arriba, desteñido por el sol (más claro y
 *     más gris); en la revista, el papel es la foto de portada entera, en degradado.
 *   · Lo IMPRESO va en la capa 1, 1 cm por fuera del papel, y NINGÚN bloque de la capa 1 pisa a otro: sólo hay dos
 *     capas, y 1 cm es lo que la profundidad de 24 bits separa todavía a unos 130 m (cerca de 0,1 m y lejos de 900),
 *     donde la plana entera es un puñado de píxeles.
 *   · g1 (N0, N1 y el anillo): el papel y nueve bloques el diario y seis la revista (los dos costados son siempre uno
 *     de cada): 34 triángulos, que dejan el quiosco en 58 de su tope de 60.
 *     - diario: cabecera de color, dos líneas de titular en tinta, la foto (un degradado de suelo a cielo), la columna
 *       de al lado en tres renglones gruesos y dos renglones de entradilla;
 *     - revista: cabecera en el color que contrasta con la portada, un titular grande y la silueta de la persona de la
 *       foto (cabeza, hombros y pecho).
 *   · g2 y g3: el diario suma el antetítulo, la columna de seis renglones junto a la foto (en vez de los tres gruesos),
 *     un renglón más y la foto partida en cielo y suelo por un horizonte torcido; la revista, el sello de la esquina y
 *     cuatro líneas de portada claras.
 * Los renglones son de 2,5 a 3,5 cm con otro tanto de hueco: a 10 m, dos o tres píxeles cada uno, que se leen como
 * texto gris; más lejos se funden en el gris del papel, sin centellear, porque todo es color de vértice.
 */

/** Dónde cae un punto de una plana: (u, v) en metros desde su esquina de abajo a la izquierda, vista de frente, y su capa. */
type SitioDeLaPlana = (u: number, v: number, capa: number) => V3;

/** Lo que separa lo impreso del papel (ver arriba). */
const CAPA_DE_LA_PLANA = 0.01;

const PAPELES: readonly Rgb[] = [lineal(0xd3ccb9), lineal(0xc9c9c1), lineal(0xd6cca8)];
const DESTENIDO: Rgb = lineal(0xdcdad2);
const TINTA: Rgb = lineal(0x17171a);
const GRIS_DE_RENGLON: Rgb = lineal(0x7a766c);
/* La cabecera, de un color que se lea sobre el papel y aparte de la tinta del titular: ni negro ni azul marino, que
   a la luz magenta de un rótulo salían del color del titular. */
const CABECERAS: readonly Rgb[] = [lineal(0xa3261b), lineal(0x2c5cae), lineal(0xa8700f)];
/** Las fotos del diario: [cielo arriba, cielo en el horizonte, suelo]: una calle de noche, un estadio, un ocaso. */
const FOTOS_DEL_DIARIO: readonly (readonly [Rgb, Rgb, Rgb])[] = [
  [lineal(0x2e3c55), lineal(0x7c8aa4), lineal(0x4a4036)],
  [lineal(0x2f2b2b), lineal(0x5a4c44), lineal(0x3b7434)],
  [lineal(0x7a4a36), lineal(0xc88c52), lineal(0x2a221e)],
];
/** Las portadas de revista: [abajo, arriba, cabecera, titular]. */
const PORTADAS: readonly (readonly [Rgb, Rgb, Rgb, Rgb])[] = [
  [lineal(0x7c1a22), lineal(0xc8584a), lineal(0xe4ddc9), lineal(0xe8c23a)],
  [lineal(0x15304c), lineal(0x4a84a6), lineal(0xe2b62a), lineal(0xebe6da)],
  [lineal(0xa27c18), lineal(0xdcbc5c), lineal(0xa3261b), lineal(0x17171a)],
];
const SOMBRA_DE_PORTADA: Rgb = lineal(0x2a1d1a);
const CLARO_DE_PORTADA: Rgb = lineal(0xe9e4d8);

function mezclaDe(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Un cuadrilátero de una plana por sus cuatro esquinas (u, v) en sentido antihorario visto de frente: las dos primeras
 * con el color `abajo` y las dos últimas con `arriba` (un degradado vertical exacto si van abajo-abajo-arriba-arriba).
 * La UV es la de la plana, en metros.
 */
function trozoDePlana(m: Molde, en: SitioDeLaPlana, n: V3, capa: number, esquinas: readonly (readonly [number, number])[], abajo: Rgb, arriba: Rgb = abajo): void {
  const i: number[] = [];
  esquinas.forEach(([u, v], k) => {
    const c = k < 2 ? abajo : arriba;
    m.color(c[0], c[1], c[2]);
    const p = en(u, v, capa);
    i.push(m.vertice(p[0], p[1], p[2], n[0], n[1], n[2], u, v));
  });
  m.tri(i[0] as number, i[1] as number, i[2] as number);
  m.tri(i[0] as number, i[2] as number, i[3] as number);
}

/**
 * Una plana colgada (ver arriba), de `ancho` × `alto` metros: un diario o una revista, con `h` (0-1) para la cabecera,
 * la foto y el largo de los renglones. Lo impreso se da en fracciones de la plana.
 */
function plana(m: Molde, g: GradoDeLaCelda, en: SitioDeLaPlana, n: V3, ancho: number, alto: number, diario: boolean, h: number): void {
  m.poner('aAcabado', OFICIO.plastico[0], OFICIO.plastico[1]);
  const trozo = (u0: number, v0: number, u1: number, v1: number, abajo: Rgb, arriba: Rgb = abajo): void =>
    trozoDePlana(m, en, n, 1, [[u0 * ancho, v0 * alto], [u1 * ancho, v0 * alto], [u1 * ancho, v1 * alto], [u0 * ancho, v1 * alto]], abajo, arriba);
  const azarDeLaPlana = (k: number): number => azarEn(Math.floor(h * 65536), k);
  const elegir = <T>(de: readonly T[], k: number): T => de[Math.floor(azarDeLaPlana(k) * de.length) % de.length] as T;
  const papelEntero = (abajo: Rgb, arriba: Rgb): void =>
    trozoDePlana(m, en, n, 0, [[0, 0], [ancho, 0], [ancho, alto], [0, alto]], abajo, arriba);
  if (diario) {
    const papel = elegir(PAPELES, 1);
    const cabecera = elegir(CABECERAS, 2);
    const [cielo, horizonte, suelo] = elegir(FOTOS_DEL_DIARIO, 3);
    papelEntero(papel, mezclaDe(papel, DESTENIDO, 0.45));
    trozo(0.05, 0.85, 0.95, 0.96, cabecera);
    trozo(0.05, 0.7, 0.95, 0.78, TINTA);
    trozo(0.05, 0.61, 0.62 + 0.3 * azarDeLaPlana(4), 0.69, TINTA);
    trozo(0.05, 0.15, 0.95, 0.18, GRIS_DE_RENGLON);
    trozo(0.05, 0.09, 0.6 + 0.3 * azarDeLaPlana(5), 0.12, GRIS_DE_RENGLON);
    if (g < 2) {
      /* La foto en un degradado de suelo a cielo, y la columna en tres renglones gruesos. */
      trozo(0.05, 0.24, 0.6, 0.57, suelo, mezclaDe(horizonte, cielo, 0.5));
      for (let r = 0; r < 3; r++) trozo(0.65, 0.535 - 0.11 * r, 0.65 + 0.3 * (r === 2 ? 0.6 : 0.95), 0.57 - 0.11 * r, GRIS_DE_RENGLON);
      return;
    }
    /* La foto, partida por un horizonte torcido: el suelo abajo y el cielo en degradado encima. */
    const hi = 0.34 + 0.06 * azarDeLaPlana(6);
    const hd = 0.34 + 0.06 * azarDeLaPlana(7);
    trozoDePlana(m, en, n, 1, [[0.05 * ancho, 0.24 * alto], [0.6 * ancho, 0.24 * alto], [0.6 * ancho, hd * alto], [0.05 * ancho, hi * alto]], suelo);
    trozoDePlana(m, en, n, 1, [[0.05 * ancho, hi * alto], [0.6 * ancho, hd * alto], [0.6 * ancho, 0.57 * alto], [0.05 * ancho, 0.57 * alto]], horizonte, cielo);
    trozo(0.05, 0.805, 0.32, 0.83, cabecera);
    trozo(0.05, 0.03, 0.72 + 0.2 * azarDeLaPlana(8), 0.06, GRIS_DE_RENGLON);
    for (let r = 0; r < 6; r++) {
      const v1 = 0.57 - 0.055 * r;
      const largoDelRenglon = r === 5 ? 0.45 + 0.3 * azarDeLaPlana(20 + r) : 0.75 + 0.25 * azarDeLaPlana(20 + r);
      trozo(0.65, v1 - 0.025, 0.65 + 0.3 * largoDelRenglon, v1, GRIS_DE_RENGLON);
    }
    return;
  }
  const [abajo, arriba, cabecera, titular] = elegir(PORTADAS, 1);
  papelEntero(abajo, mezclaDe(arriba, DESTENIDO, 0.25));
  trozo(0.05, 0.84, 0.95, 0.96, cabecera);
  trozo(0.05, 0.12, 0.46, 0.22, titular);
  /* La persona de la portada: la cabeza con las esquinas cortadas (cuadrada, sobre los hombros, era una botella), la
     caída de los hombros, anchos, y el pecho, cortado por el pie de la plana. */
  const figura = (esquinas: readonly (readonly [number, number])[]): void =>
    trozoDePlana(m, en, n, 1, esquinas.map(([u, v]) => [u * ancho, v * alto] as const), SOMBRA_DE_PORTADA);
  figura([[0.66, 0.52], [0.76, 0.52], [0.8, 0.62], [0.62, 0.62]]);
  figura([[0.62, 0.62], [0.8, 0.62], [0.76, 0.73], [0.66, 0.73]]);
  figura([[0.47, 0.44], [0.95, 0.44], [0.9, 0.505], [0.52, 0.505]]);
  trozo(0.47, 0, 0.95, 0.44, SOMBRA_DE_PORTADA);
  if (g < 2) return;
  trozo(0.05, 0.28, 0.44, 0.32, CLARO_DE_PORTADA);
  trozo(0.05, 0.69, 0.21, 0.8, titular);
  trozo(0.05, 0.58, 0.38, 0.62, CLARO_DE_PORTADA);
  trozo(0.05, 0.5, 0.3, 0.54, CLARO_DE_PORTADA);
  trozo(0.05, 0.36, 0.4, 0.4, CLARO_DE_PORTADA);
}

/**
 * Quiosco de prensa cerrado de madrugada: caja de chapa verde con la persiana de lamas bajada (la chapa ondulada con
 * las lamas, `OFICIO.persiana`), el tejadillo volado por encima de 2,15 m, la franja encendida y las planas colgadas de
 * los costados (ver arriba). g2: el tejadillo con su canto curvo. g3: cantoneras, las guías y el cierre de la persiana,
 * las planas de detrás y, debajo de ellas, el buzón de los periódicos.
 */
export function* quioscoDePrensa(obra: ObraDeLaCelda, q: PiezaConFrente): Generator<void, LuzDelMobiliario, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const g = obra.grado;
  const [x, z] = centro(q.caja);
  const w = q.caja.x1 - q.caja.x0;
  const d = q.caja.z1 - q.caja.z0;
  const frenteEnX = q.mira === 'n' || q.mira === 's';
  const largo = (frenteEnX ? w : d) - 0.08;
  const fondo = (frenteEnX ? d : w) - 0.1;
  const base = colocar(x, H, z, q.mira);
  const f2 = fondo / 2;
  mo.con(base, () => {
    tono(mo, VERDE_DE_PRENSA, OFICIO.chapa);
    /* Sin tapa: el tejadillo la cubre entera, y su cara de abajo va a 2,15 m, a ras de ella. */
    bloque(mo, 0, 0, 0, largo, 2.15, fondo, 'nseo');
    tono(mo, GRIS_DE_PERSIANA, OFICIO.persiana);
    bloque(mo, 0, 0.2, f2 + 0.01, largo - 0.3, 1.7, 0.02, 's');
    /* Las planas de los costados (`plana`): un diario en uno y una revista en el otro, por sitio. */
    const ix = Math.round(x * 3);
    const iz = Math.round(z * 3);
    const diarioAlEste = azarEn(ix, iz, 1) < 0.5;
    const anchoDelCostado = fondo - 0.45;
    plana(mo, g, (u, v, capa) => [largo / 2 + 0.006 + capa * CAPA_DE_LA_PLANA, 0.55 + v, f2 - 0.2 - u], [1, 0, 0], anchoDelCostado, 1.1, diarioAlEste, azarEn(ix, iz, 2));
    plana(mo, g, (u, v, capa) => [-largo / 2 - 0.006 - capa * CAPA_DE_LA_PLANA, 0.55 + v, -f2 + 0.25 + u], [-1, 0, 0], anchoDelCostado, 1.1, !diarioAlEste, azarEn(ix, iz, 3));
    if (g >= 3) {
      /* Las cantoneras (10 cm), las guías de la persiana y su cierre, y los carteles de detrás. */
      tono(mo, VERDE_DE_PRENSA_OSCURO, OFICIO.chapa);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) bloque(mo, sx * (largo / 2 - 0.03), 0, sz * (f2 - 0.03), 0.1, 2.15, 0.1, 'nseo');
      tono(mo, VERDE_DE_PRENSA_OSCURO, OFICIO.chapa);
      for (const sx of [-1, 1]) bloque(mo, sx * (largo / 2 - 0.12), 0.2, f2 + 0.02, 0.09, 1.72, 0.03, 'seo');
      bloque(mo, 0, 0.17, f2 + 0.03, largo - 0.3, 0.06, 0.04, 'nseoa');
      const anchoDeDetras = largo / 2 - 0.3;
      plana(mo, g, (u, v, capa) => [largo / 2 - 0.2 - u, 0.7 + v, -f2 - 0.006 - capa * CAPA_DE_LA_PLANA], [0, 0, -1], anchoDeDetras, 0.9, !diarioAlEste, azarEn(ix, iz, 4));
      plana(mo, g, (u, v, capa) => [-0.1 - u, 0.7 + v, -f2 - 0.006 - capa * CAPA_DE_LA_PLANA], [0, 0, -1], anchoDeDetras, 0.9, diarioAlEste, azarEn(ix, iz, 5));
      /* El buzón de los periódicos, detrás y por debajo de los carteles: la placa (1,5 cm: dentro de la caja, que
         deja 5 cm de fondo) y su boca de 30 × 3,5 cm, por donde el repartidor echa el paquete de madrugada. */
      tono(mo, VERDE_DE_PRENSA_OSCURO, OFICIO.chapa);
      bloque(mo, 0, 0.3, -f2 - 0.0075, 0.42, 0.15, 0.015, 'neoab');
      tono(mo, lineal(0x050505), OFICIO.plastico);
      mo.quad([0.15, 0.39, -f2 - 0.016], [-0.15, 0.39, -f2 - 0.016], [-0.15, 0.425, -f2 - 0.016], [0.15, 0.425, -f2 - 0.016], [0, 0, -1], [0, 0.39, 0.3, 0.39, 0.3, 0.425, 0, 0.425]);
    }
  });
  /* El tejadillo, volado hacia el frente por encima de 2,15 m (nada de él baja de ahí): un perfil a lo largo del
     quiosco, con la cara de abajo plana a 2,15 y el labio de delante levantado. */
  const tejadillo: P2[] =
    g >= 2
      ? [
          [-f2 - 0.05, 2.15],
          [f2 + 0.18, 2.15],
          [f2 + 0.3, 2.18],
          [f2 + 0.3, 2.23],
          [f2 + 0.2, 2.26],
          [-f2 - 0.05, 2.35],
        ]
      : [
          [-f2 - 0.05, 2.15],
          [f2 + 0.28, 2.15],
          [f2 + 0.28, 2.22],
          [-f2 - 0.05, 2.35],
        ];
  tono(mo, VERDE_DE_PRENSA_OSCURO, OFICIO.chapaMate);
  /* El canto que se gasta es el del labio de delante, no la chapa del tejado; y el tejado es mate (`chapaMate`). */
  const cantoDelTejadillo = g >= 2 ? (i: number): boolean => i >= 1 && i <= 3 : (i: number): boolean => i === 1;
  mo.con(por(base, PERFIL_A_LO_LARGO), () => perfilDeOficio(mo, tejadillo, -largo / 2 - 0.06, largo / 2 + 0.06, OFICIO.chapaMate, OFICIO.chapaCanto, Math.PI / 4, cantoDelTejadillo));
  em.con(base, () => {
    em.color(2.6, 2.3, 1.4);
    em.poner('aEmisor', 0, 0);
    bloque(em, 0, 1.95, f2 + 0.025, largo - 0.2, 0.16, 0.02, 's');
  });
  const [fx, fz] = normalDe(q.mira);
  yield;
  return { x: x + fx * (fondo / 2 + 0.2), y: H + 2.0, z: z + fz * (fondo / 2 + 0.2), tipo: 'prensa' };
}

/* ═══════════════════════════════ LA CABINA Y EL REFUGIO ═══════════════════════════════ */

/** El auricular de una cabina: dónde cuelga y qué vértices son suyos (ver `pivoteDelAuricular`). */
export interface AuricularDeLaCabina {
  readonly cabina: CabinaDelPlano;
  /** El gancho: el auricular cuelga de aquí, y aquí gira cuando queda balanceándose. En el mundo. */
  readonly pivote: V3;
  /** El eje de giro, horizontal, a lo largo del frente del aparato. En el mundo. */
  readonly eje: V3;
  /** Sus vértices en el molde de lo emisivo de la obra: de `desde` a `hasta` (sin él). */
  readonly desde: number;
  readonly hasta: number;
}

/** El gancho del auricular en el sitio de la cabina (x a lo largo del frente, z hacia quien descuelga). */
const GANCHO_LOCAL: V3 = [-0.2, 1.44, 0.14];

/**
 * EL PIVOTE DEL AURICULAR de una cabina (o de un refugio), en el mundo, y su eje de giro: el mismo en todos los grados.
 * Otro frente lo usa para dejarlo balanceándose en la salida (`EL-QUIEBRO.md`: «el auricular queda balanceándose»).
 */
export function pivoteDelAuricular(c: CabinaDelPlano): { readonly pivote: V3; readonly eje: V3 } {
  const m = colocar(c.x, H, c.z, c.mira);
  const p = new THREE.Vector3(...GANCHO_LOCAL).applyMatrix4(m);
  const e = new THREE.Vector3(1, 0, 0).transformDirection(m);
  return { pivote: [p.x, p.y, p.z], eje: [e.x, e.y, e.z] };
}

/** Los auriculares escritos en cada obra, en el orden de sus cabinas. */
const AURICULARES = new WeakMap<ObraDeLaCelda, AuricularDeLaCabina[]>();

/** Los auriculares que se han escrito en una obra (su pivote, su eje y sus vértices en `obra.m.emisivo`). */
export function auricularesDeLaObra(obra: ObraDeLaCelda): readonly AuricularDeLaCabina[] {
  return AURICULARES.get(obra) ?? [];
}

/** Una caja con sus seis caras escrita vértice a vértice: devuelve el primer vértice y el siguiente al último. */
function cajaContada(m: Molde, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): [number, number] {
  const caras: readonly (readonly [V3, V3, V3, V3, V3])[] = [
    [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]],
    [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]],
    [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]],
    [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]],
    [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]],
    [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]],
  ];
  let desde = -1;
  let ultimo = -1;
  for (const [a, b, c, d, n] of caras) {
    const ia = m.vertice(a[0], a[1], a[2], n[0], n[1], n[2], 0, a[1]);
    const ib = m.vertice(b[0], b[1], b[2], n[0], n[1], n[2], 1, b[1]);
    const ic = m.vertice(c[0], c[1], c[2], n[0], n[1], n[2], 1, c[1]);
    const id = m.vertice(d[0], d[1], d[2], n[0], n[1], n[2], 0, d[1]);
    if (desde < 0) desde = ia;
    ultimo = id;
    m.tri(ia, ib, ic);
    m.tri(ia, ic, id);
  }
  return [desde, ultimo + 1];
}

/**
 * EL AURICULAR ÁMBAR, pieza aparte en el molde de lo emisivo: la luz del jugador. Cuelga del gancho (`GANCHO_LOCAL`)
 * hacia abajo, a un lado del aparato: una barra de 12 triángulos en todos los grados (lo emisivo del plan para la
 * cabina son unos 50 triángulos por ventana, y la ventana de N3 lleva diez cabinas). Devuelve sus vértices.
 */
function escribirElAuricular(em: Molde, c: CabinaDelPlano): [number, number] {
  const [gx, gy, gz] = GANCHO_LOCAL;
  let rango: [number, number] = [0, 0];
  em.con(colocar(c.x, H, c.z, c.mira), () => {
    em.color(AMBAR_DEL_AURICULAR[0], AMBAR_DEL_AURICULAR[1], AMBAR_DEL_AURICULAR[2]);
    em.poner('aEmisor', 0, 0);
    rango = cajaContada(em, gx - 0.035, gy - 0.32, gz - 0.04, gx + 0.035, gy - 0.02, gz + 0.04);
  });
  return rango;
}

/** La marquesina curva, en su plano (x hacia delante desde el poste, y arriba): `n` tramos de curva y su grueso. */
function marquesina(n: number): P2[] {
  const curva: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    curva.push([t * 1.22, 2.72 - t * t * 0.36]);
  }
  return [...curva, ...[...curva].reverse().map(([a, b]): [number, number] => [a, b + 0.05])];
}

/**
 * El pictograma del auricular en la cara de delante del letrero: tres rectángulos emisivos (las dos copas y el mango:
 * un auricular visto de lado, sin letras ni marca), con barras de 7 cm, lo más fino que el grado 3 deja (§3.1: 6 cm en
 * N3, 9 en N2 a la distancia de su bloque; en N2 se queda algo por debajo, y es luz sobre fondo oscuro). En g1 y g2,
 * de lejos, el letrero es una sola cara de luz tenue: la misma mancha ámbar que el pictograma da a esa distancia.
 */
function pictograma(em: Molde, y: number, zCara: number, g: GradoDeLaCelda): void {
  const rects: readonly (readonly [number, number, number, number])[] =
    g >= 3
      ? [
          [-0.12, y - 0.07, -0.05, y + 0.04],
          [0.05, y - 0.07, 0.12, y + 0.04],
          [-0.12, y + 0.02, 0.12, y + 0.08],
        ]
      : [[-0.13, y - 0.08, 0.13, y + 0.08]];
  for (const [x0, y0, x1, y1] of rects) em.quad([x0, y0, zCara], [x1, y0, zCara], [x1, y1, zCara], [x0, y1, zCara], [0, 0, 1], [x0, y0, x1, y0, x1, y1, x0, y1]);
}

/**
 * LA CABINA (`EL-QUIEBRO.md`: «un poste de hierro con marquesina curva y un auricular de luz ámbar que funciona con
 * monedas»): el pie, el poste de hierro biselado, la marquesina CURVA que vuela sobre quien descuelga, el aparato con
 * el MONEDERO (la ranura cromada y el cajetín de las monedas: no hay teclado), el auricular ámbar colgado de su gancho
 * (pieza aparte, con su pivote: `auricularesDeLaObra`), el cordón desde g3 y, en lo alto, el LETRERO con el pictograma
 * del auricular en luz ámbar. Todo lo que baja de 1,9 m cabe en su caja de 0,5 × 0,5.
 *
 * El REFUGIO (`c.refugio`, la cabina de reaparecer) es la misma cabina en hierro verde, con OTRA LINTERNA: sin letrero
 * y con un farol colgado de la punta de la marquesina.
 */
export function* cabina(obra: ObraDeLaCelda, c: CabinaDelPlano): Generator<void, LuzDelMobiliario, void> {
  const mo = obra.m.mobiliario;
  const em = obra.m.emisivo;
  const g = obra.grado;
  const { x, z, mira } = c;
  const base = colocar(x, H, z, mira);
  const pintura = c.refugio ? VERDE_DEL_REFUGIO : ANTRACITA;
  mo.con(base, () => {
    tono(mo, pintura, OFICIO.hierro);
    /* El pie y el poste biselado (sin tapas: el pie lo tapa abajo y el letrero o el capitel arriba). */
    if (g >= 2) biselada(mo, 0, 0, 0, 0.3, 0.08, 0.3, 0.02, OFICIO.hierro, OFICIO.hierroCanto, 'nseoa');
    else bloque(mo, 0, 0, 0, 0.3, 0.08, 0.3, 'nseoa');
    biselada(mo, 0, 0.08, 0, 0.12, 2.72, 0.12, 0.025, OFICIO.hierro, OFICIO.hierroCanto, 'nseo');
    if (g >= 3) {
      /* Los collares del poste. */
      biselada(mo, 0, 0.9, 0, 0.15, 0.05, 0.15, 0.012, OFICIO.hierro, OFICIO.hierroCanto, 'nseo');
      biselada(mo, 0, 2.2, 0, 0.15, 0.05, 0.15, 0.012, OFICIO.hierro, OFICIO.hierroCanto, 'nseo');
    }
    /* El aparato, delante del poste y dentro de su caja, y el monedero. */
    tono(mo, CHAPA_DEL_APARATO, OFICIO.chapa);
    if (g >= 2) biselada(mo, 0, 1.05, 0.12, 0.34, 0.48, 0.14, 0.02, OFICIO.chapa, OFICIO.chapaCanto);
    else bloque(mo, 0, 1.05, 0.12, 0.34, 0.48, 0.14);
    tono(mo, lineal(0x8a8d8f), OFICIO.cromo);
    bloque(mo, 0.08, 1.35, 0.195, 0.1, 0.05, 0.01, 's');
    tono(mo, lineal(0x050505), OFICIO.plastico);
    mo.quad([0.06, 1.365, 0.201], [0.1, 1.365, 0.201], [0.1, 1.375, 0.201], [0.06, 1.375, 0.201], [0, 0, 1], [0.06, 1.365, 0.1, 1.365, 0.1, 1.375, 0.06, 1.375]);
    tono(mo, CHAPA_DEL_APARATO, OFICIO.chapa);
    if (g >= 3) biselada(mo, 0.08, 1.1, 0.215, 0.11, 0.08, 0.05, 0.01, OFICIO.chapa, OFICIO.chapaCanto, 'nseoa');
    else bloque(mo, 0.08, 1.1, 0.21, 0.1, 0.07, 0.04, 'nseoa');
    if (!c.refugio) {
      /* El letrero de lo alto. */
      tono(mo, lineal(0x121416), OFICIO.chapa);
      if (g >= 2) biselada(mo, 0, 2.8, 0, 0.36, 0.24, 0.05, 0.012, OFICIO.chapa, OFICIO.chapaCanto);
      else bloque(mo, 0, 2.8, 0, 0.36, 0.24, 0.05);
    } else {
      tono(mo, pintura, OFICIO.hierro);
      bloque(mo, 0, 2.8, 0, 0.16, 0.05, 0.16);
    }
  });
  /* La marquesina: un perfil curvo que sale del poste y baja hacia delante, a 2,34-2,77 m. */
  tono(mo, pintura, OFICIO.hierro);
  const tramos = g >= 3 ? 8 : g >= 2 ? 5 : 4;
  const perfilDeLaMarquesina = marquesina(tramos);
  /* El canto gastado es el labio de la punta (la franja `tramos`), no el vuelo entero. */
  mo.con(por(base, PERFIL_A_LO_LARGO), () => perfilDeOficio(mo, perfilDeLaMarquesina, -0.5, 0.5, OFICIO.hierro, OFICIO.hierroCanto, Math.PI / 4, (i) => i === tramos));
  if (g >= 3) {
    /* El cordón del auricular: de la esquina baja del aparato al pie del auricular, con una comba suave. Una espiral,
       o un lazo que cuelga mucho en tan poco ancho, dobla el tubo más cerrado que su grueso y le vuelve caras del
       revés (el comprobador de las caras las veía). */
    tono(mo, NEGRO_DEL_CORDON, OFICIO.caucho);
    const puntos: V3[] = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const comba = Math.sin(t * Math.PI);
      puntos.push([-0.13 - t * 0.07, 1.06 + t * 0.05 - comba * 0.04, 0.13 + t * 0.01 + comba * 0.02]);
    }
    mo.con(base, () => tuboLiso(mo, puntos, 0.006, 4, 0));
  }
  const [desde, hasta] = escribirElAuricular(em, c);
  const pv = pivoteDelAuricular(c);
  let lista = AURICULARES.get(obra);
  if (lista === undefined) {
    lista = [];
    AURICULARES.set(obra, lista);
  }
  lista.push({ cabina: c, pivote: pv.pivote, eje: pv.eje, desde, hasta });
  em.con(base, () => {
    em.poner('aEmisor', 0, 0);
    if (!c.refugio) {
      /* La tira de luz bajo la marquesina y el pictograma del letrero. */
      em.color(AMBAR_HDR[0] * 0.3, AMBAR_HDR[1] * 0.3, AMBAR_HDR[2] * 0.3);
      bloque(em, 0, 2.5, 0.75, 0.6, 0.02, 0.05, 'b');
      const brillo = g >= 3 ? 1 : 0.55;
      em.color(AMBAR_DEL_AURICULAR[0] * brillo, AMBAR_DEL_AURICULAR[1] * brillo, AMBAR_DEL_AURICULAR[2] * brillo);
      pictograma(em, 2.92, 0.027, g);
    } else {
      /* La OTRA linterna del refugio, en vez de la tira: el vidrio de un farol de luz cálida colgado de la punta de
         la marquesina. */
      em.color(1.5, 1.05, 0.5);
      bloque(em, 0, 2.1, 1.08, 0.12, 0.17, 0.12, 'nseo');
    }
  });
  if (c.refugio) {
    /* El farol: sombrerete, colgadero hasta la marquesina y base del vidrio, de hierro; desde g2, el cuello. */
    mo.con(base, () => {
      tono(mo, pintura, OFICIO.hierro);
      bloque(mo, 0, 2.27, 1.08, 0.2, 0.035, 0.2, 'nseoab');
      bloque(mo, 0, 2.075, 1.08, 0.15, 0.025, 0.15, 'nseob');
      bloque(mo, 0, 2.305, 1.08, 0.025, 0.13, 0.025, 'nseo');
      if (g >= 2) bloque(mo, 0, 2.305, 1.08, 0.11, 0.03, 0.11, 'nseoa');
    });
  }
  const [fx, fz] = normalDe(mira);
  yield;
  return { x: x + fx * 0.2, y: H + 1.3, z: z + fz * 0.2, tipo: 'cabina' };
}

/** EL REFUGIO: la cabina de reaparecer, con su otra linterna (ver `cabina`). */
export function* refugio(obra: ObraDeLaCelda, c: CabinaDelPlano): Generator<void, LuzDelMobiliario, void> {
  return yield* cabina(obra, { ...c, refugio: true });
}

/* ═══════════════════════════════ LAS VALLAS DE OBRA ═══════════════════════════════ */

/**
 * Las barreras de obra de una caja: hormigón rojiblanco en perfil «new jersey» y balizas. Sin ceder: la usan la
 * valla (una pieza) y el corte de obra (`piezas.ts`, dos filas en la misma pieza). El hormigón pintado es de la
 * familia del hormigón (sus manchas y su mojado desde N1); en g1 la geometría es la de siempre, y desde g2 el perfil
 * lleva las normales suaves (la curva del «new jersey» se ve curva) con el mismo número de triángulos.
 */
export function barrerasDeObra(mo: Molde, em: Molde, c: CajaXZ, grado: GradoDeLaCelda = 1): LuzDelMobiliario[] {
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
    tono(mo, i % 2 === 0 ? lineal(0xb32420) : lineal(0xc9c6bd), OFICIO.hormigon);
    mo.con(m, () => {
      /* El perfil «new jersey» en el plano z-y local, estirado a lo largo de x. */
      const rot = new THREE.Matrix4().makeRotationY(Math.PI / 2);
      mo.con(new THREE.Matrix4().copy(m).multiply(rot), () => mo.perfil(perfil, -paso / 2 + 0.03, paso / 2 - 0.03, grado >= 2 ? { suave: Math.PI / 5 } : {}));
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
  const luces = barrerasDeObra(obra.m.mobiliario, obra.m.emisivo, c, obra.grado);
  yield;
  return luces;
}
