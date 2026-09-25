/**
 * EL TREN ELEVADO que cruza por el Elevado: tres coches de aluminio con sus bogies, sus fuelles y sus ventanas
 * encendidas, de una punta a otra de la ciudad.
 *
 * ═══ EL HORARIO NO ES DE AQUÍ ═══
 *
 * Dónde va el tren lo dice la noche (`enTic(tic)`, con su desfase sembrado) y llega aquí en `TrenDelPlano.enTic`:
 * todos los aparatos ven pasar el mismo tren en el mismo tic. Aquí sólo se pinta. Cuando el tren está entrando
 * o saliendo, lo recortado es más corto que el tren; se reconstruye su frente (la cola + el largo, o la cabeza si
 * no está recortada) y se pinta entero.
 *
 * ═══ EL COCHE: ALUMINIO QUE COGE LA LUZ ═══
 *
 * Antes el tren era un perfil de chapa con metal 0,8: sin difusa, de noche sólo reflejaba el cielo falso, que es
 * casi negro, y el tren se veía negro. Ahora es de la familia `aluminio` (metal 0,35 y rugosidad 0,35, con las
 * estrías del costado por normal, `materia/familias/aluminio.ts`): coge la luz de la calle como coge la de las
 * farolas una fachada. Cada coche es un loft de su sección (el costado recto, el hombro y el techo abombado), con
 * la cabina en punta en la cabeza y la trasera en la cola; por nivel:
 *
 *   · N0: la sección en seis puntos, los bogies en caja y los fuelles en caja (156 triángulos los tres coches);
 *   · N1: el techo redondeado, el faldón de equipos, las ruedas de los bogies y el equipo del techo (386);
 *   · N2: las esquinas redondeadas en planta, las puertas con su hoja, los bogies con ruedas de verdad, cajas de
 *     grasa y bastidor, los fuelles de acordeón (1.884);
 *   · N3: todo más fino, los muelles, los pasamanos de la cabina y las canaletas del techo (2.776).
 *   Los renglones del libro son 300 / 500 / 3.000 / 7.000; las ventanas, 106 en todos (200 / 200 / 300 / 300).
 *
 * Las ventanas son de lo emisivo, tipo 3 (`emisivo.ts`): un interior falso con su marco oscuro, los tubos de luz
 * y, desde N2, viajeros por hash. La tira de luz baja verde-cian, los faros y los pilotos, como siempre.
 *
 * ═══ EL TEMBLOR ═══
 *
 * El coche tiembla ±1,2 cm y se mece ±0,15° con el tic (`temblorDelTren`): una función PURA del tic, la misma en
 * todos los aparatos y en cualquier orden en que se pida, y sin memoria nueva por fotograma (las dos matrices de
 * la colocación son del tren). Lo mira `verify:quiebro-ciudad`, vehículos d.
 *
 * ═══ LOS MATERIALES, Y EL FUNDIDO ═══
 *
 * `materialesDelTren(nivel)` da la caja (el material del mobiliario del nivel: así, cuando reparta familias, el
 * aluminio es suyo sin tocar a nadie) y las luces (lo emisivo). La caja lleva el fundido del canto de la ventana
 * desde N1, A PROPÓSITO: fuera de la ventana la viga es la de la LOD1 y el tren se disuelve con ella, como todo lo
 * de la ventana, en vez de flotar sobre una viga de otro dibujo; y así su programa es el del mobiliario de la
 * ventana (el mismo texto y la misma llave). Las luces van sin fundido, como lo emisivo de la ventana: de noche,
 * fuera de la ventana, pasa la hilera de ventanas encendidas.
 *
 * El nivel del tren (cuánta geometría lleva) viaja en el material de la caja (`userData`): la ciudad lo construye
 * con `new Tren(plano, cuerpo, luces, sombras)` y así no hay que tocarla. El barrio viejo (`construir.ts`) le da
 * su mobiliario, sin nivel: su tren es el de siempre (su libro no sube).
 */
import * as THREE from 'three';
import { Molde } from './geometria';
import type { P2 } from './geometria';
import { ACABADO, ATRIBUTOS_DE_LO_EMISIVO, ATRIBUTOS_DEL_MOBILIARIO, lineal, materialDelMobiliario, materialEmisivo } from './materiales';
import type { NivelDeLaCiudad, TrenDelPlano } from './tipos';
import { DETALLE_DEL_NIVEL } from './tipos';
import { parchear } from '../atmosfera/parcheo';
import { RETOQUE_DEL_FUNDIDO } from './lejos';
import { FAMILIA } from './materia/familias';
import { acabadoDeVehiculo } from './coches';

/** El color de la roña de abajo del coche (el polvo de los frenos y de la vía). */
const RONIA = lineal(0x3b3833);

/** Lo que sube el coche sobre la cara de arriba de la viga (petos y carriles): el tren rueda en y = 0. */
const SOBRE_LA_VIGA = 1.02;
const COCHES = 3;

/** Dónde guarda el material de la caja el nivel del tren. */
const LLAVE_DEL_NIVEL = 'nivelDelTrenQ';

/**
 * LOS MATERIALES DEL TREN de la ciudad abierta en un nivel: la caja y las luces (ver la cabecera). La caja lleva
 * el nivel en `userData` para que el tren sepa cuánta geometría lleva.
 */
export function materialesDelTren(nivel: NivelDeLaCiudad): { readonly cuerpo: THREE.MeshStandardMaterial; readonly luces: THREE.MeshBasicMaterial } {
  const cuerpo = materialDelMobiliario(nivel);
  if (DETALLE_DEL_NIVEL[nivel].fundido) parchear(cuerpo, RETOQUE_DEL_FUNDIDO);
  cuerpo.userData[LLAVE_DEL_NIVEL] = nivel;
  return { cuerpo, luces: materialEmisivo(nivel) };
}

/** El nivel del tren que lleva un material de caja, o `null` (el barrio viejo). */
function nivelDelMaterial(m: THREE.Material): NivelDeLaCiudad | null {
  const n: unknown = m.userData[LLAVE_DEL_NIVEL];
  return n === 0 || n === 1 || n === 2 || n === 3 ? n : null;
}

/* ═══════════════════════════════ EL TEMBLOR ═══════════════════════════════ */

/** Lo más que tiembla y se mece el tren. */
export const TEMBLOR_DEL_TREN = { altura: 0.012, balanceo: (0.15 * Math.PI) / 180 } as const;

/**
 * EL TEMBLOR EN UN TIC: [altura (m), balanceo (rad)], dentro de ±1,2 cm y ±0,15°. Función pura del tic: dos ondas
 * lentas (menos de 1,7 rad por tic, bien por debajo de lo que el tic de 20 Hz puede enseñar) que no se repiten a
 * la vez en todo un cruce. Lo escribe en `salida` y la devuelve: el tren le da la suya, reservada una vez, y no
 * pide memoria nueva en cada fotograma.
 */
export function temblorDelTren(tic: number, salida: Float64Array = new Float64Array(2)): Float64Array {
  const a = 0.62 * Math.sin(tic * 0.83) + 0.38 * Math.sin(tic * 1.67 + 1.3);
  const b = 0.7 * Math.sin(tic * 0.41 + 0.4) + 0.3 * Math.sin(tic * 1.21 + 2.1);
  salida[0] = a * TEMBLOR_DEL_TREN.altura;
  salida[1] = b * TEMBLOR_DEL_TREN.balanceo;
  return salida;
}

/* ═══════════════════════════════ LA GEOMETRÍA ═══════════════════════════════ */

/** Cuánto lleva el tren en cada nivel (ver la cabecera). */
interface DetalleDelTren {
  /** El costado derecho de la sección, de abajo arriba: (z, y); el izquierdo, en espejo, y el techo por el eje. */
  readonly costado: readonly P2[];
  readonly lomo: boolean;
  readonly esquinas: boolean;
  readonly ruedas: 0 | 6 | 8 | 12;
  readonly puertas: boolean;
  readonly fuelle: number;
  readonly faldon: boolean;
  readonly techo: 0 | 1 | 2;
  readonly muelles: boolean;
}

const COSTADO_N0: readonly P2[] = [
  [1.4, 0.72],
  [1.45, 2.85],
  [1.08, 3.22],
];
const COSTADO_N1: readonly P2[] = [
  [1.4, 0.72],
  [1.45, 1.0],
  [1.46, 2.7],
  [1.37, 3.04],
  [1.06, 3.2],
];
const COSTADO_N2: readonly P2[] = [
  [1.38, 0.72],
  [1.44, 0.8],
  [1.45, 1.0],
  [1.46, 2.7],
  [1.44, 2.88],
  [1.38, 3.02],
  [1.26, 3.13],
  [1.06, 3.2],
  [0.6, 3.235],
];
const COSTADO_N3: readonly P2[] = [
  [1.37, 0.72],
  [1.42, 0.76],
  [1.445, 0.84],
  [1.45, 1.0],
  [1.455, 1.5],
  [1.46, 2.7],
  [1.452, 2.8],
  [1.43, 2.9],
  [1.39, 2.99],
  [1.33, 3.07],
  [1.24, 3.14],
  [1.1, 3.19],
  [0.85, 3.22],
  [0.45, 3.24],
];

const DETALLE_DEL_TREN: Readonly<Record<NivelDeLaCiudad, DetalleDelTren>> = {
  0: { costado: COSTADO_N0, lomo: false, esquinas: false, ruedas: 0, puertas: false, fuelle: 0, faldon: false, techo: 0, muelles: false },
  1: { costado: COSTADO_N1, lomo: true, esquinas: false, ruedas: 6, puertas: false, fuelle: 0, faldon: true, techo: 1, muelles: false },
  2: { costado: COSTADO_N2, lomo: true, esquinas: true, ruedas: 8, puertas: true, fuelle: 7, faldon: true, techo: 1, muelles: false },
  3: { costado: COSTADO_N3, lomo: true, esquinas: true, ruedas: 12, puertas: true, fuelle: 11, faldon: true, techo: 2, muelles: true },
};

/** La sección cerrada de un coche (antihoraria en (z, y)), con el fondo; `escala` la estrecha en las puntas y `techo` baja lo de arriba. */
function seccion(d: DetalleDelTren, escala = 1, bajaElTecho = 0): P2[] {
  const lado = d.costado.map(([z, y]): P2 => [z * escala, y > 2.6 ? y - bajaElTecho * ((y - 2.6) / 0.64) : y]);
  const cima = (lado[lado.length - 1] as P2)[1];
  const lomo: P2[] = d.lomo ? [[0, cima + 0.03 * (1 - bajaElTecho / 0.7)]] : [];
  const izquierdo = [...lado].reverse().map(([z, y]): P2 => [-z, y]);
  return [...lado, ...lomo, ...izquierdo];
}

/** Una estación de un coche: su x y su sección. */
interface EstacionDelTren {
  readonly x: number;
  readonly anillo: readonly P2[];
}

/**
 * Un loft CERRADO de estaciones (todas con el mismo número de puntos), con la normal suave a lo largo del anillo
 * salvo donde se tuerce más de 50° y plana a lo largo del coche; UV: `u` la x del coche y `v` la altura (las
 * estrías de la familia `aluminio` van por altura, y la altura del coche no se mueve con el temblor). Con tapas
 * en las dos puntas.
 */
function loftDelTren(m: Molde, estaciones: readonly EstacionDelTren[], sucio?: { readonly base: readonly [number, number, number]; readonly ronia: readonly [number, number, number] }): void {
  const cosSuave = Math.cos((50 * Math.PI) / 180);
  const np = (estaciones[0] as EstacionDelTren).anillo.length;
  const normal = new Float64Array(np * 3);
  /* La roña de abajo, en el color de cada vértice (no le cuesta nada al sombreador): del faldón a 1,1 m. */
  const vertice = (x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number): number => {
    if (sucio !== undefined) {
      const t = Math.min(1, Math.max(0, (y - 0.72) / (1.1 - 0.72)));
      const f = 0.5 * (1 - t * t * (3 - 2 * t));
      const b = sucio.base;
      const r = sucio.ronia;
      m.color(b[0] + (r[0] - b[0]) * f, b[1] + (r[1] - b[1]) * f, b[2] + (r[2] - b[2]) * f);
    }
    return m.vertice(x, y, z, nx, ny, nz, u, v);
  };
  for (let s = 0; s + 1 < estaciones.length; s++) {
    const A = estaciones[s] as EstacionDelTren;
    const B = estaciones[s + 1] as EstacionDelTren;
    const P = (e: EstacionDelTren, k: number): [number, number, number] => {
      const q = e.anillo[k % np] as P2;
      return [e.x, q[1], q[0]];
    };
    /* La normal de cada cara de la banda: (d − a) × (c − a) + (c − a) × (b − a), como `Molde.seccionado`. */
    for (let k = 0; k < np; k++) {
      const a = P(A, k);
      const b = P(A, k + 1);
      const c = P(B, k + 1);
      const d = P(B, k);
      const u = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const x = (u[1] as number) * (w[2] as number) - (u[2] as number) * (w[1] as number) + ((w[1] as number) * (v[2] as number) - (w[2] as number) * (v[1] as number));
      const y = (u[2] as number) * (w[0] as number) - (u[0] as number) * (w[2] as number) + ((w[2] as number) * (v[0] as number) - (w[0] as number) * (v[2] as number));
      const z = (u[0] as number) * (w[1] as number) - (u[1] as number) * (w[0] as number) + ((w[0] as number) * (v[1] as number) - (w[1] as number) * (v[0] as number));
      const l = Math.hypot(x, y, z) || 1;
      normal[k * 3] = x / l;
      normal[k * 3 + 1] = y / l;
      normal[k * 3 + 2] = z / l;
    }
    /* En el punto p de la arista k: su normal, sumada a la de la vecina si se tuercen menos de 50°. */
    const enPunto = (k: number, otra: number): [number, number, number] => {
      const a0 = normal[k * 3] as number;
      const a1 = normal[k * 3 + 1] as number;
      const a2 = normal[k * 3 + 2] as number;
      const b0 = normal[otra * 3] as number;
      const b1 = normal[otra * 3 + 1] as number;
      const b2 = normal[otra * 3 + 2] as number;
      if (a0 * b0 + a1 * b1 + a2 * b2 < cosSuave) return [a0, a1, a2];
      const l = Math.hypot(a0 + b0, a1 + b1, a2 + b2) || 1;
      return [(a0 + b0) / l, (a1 + b1) / l, (a2 + b2) / l];
    };
    for (let k = 0; k < np; k++) {
      const k1 = (k + 1) % np;
      const a = P(A, k);
      const b = P(A, k1);
      const c = P(B, k1);
      const d = P(B, k);
      const nA = enPunto(k, (k - 1 + np) % np);
      const nB = enPunto(k, k1);
      const va = vertice(a[0], a[1], a[2], nA[0], nA[1], nA[2], a[0], a[1]);
      const vb = vertice(b[0], b[1], b[2], nB[0], nB[1], nB[2], b[0], b[1]);
      const vc = vertice(c[0], c[1], c[2], nB[0], nB[1], nB[2], c[0], c[1]);
      const vd = vertice(d[0], d[1], d[2], nA[0], nA[1], nA[2], d[0], d[1]);
      /* Como `Molde.seccionado`: a, d, c y a, c, b. */
      m.tri(va, vd, vc);
      m.tri(va, vc, vb);
    }
  }
  /* Las tapas: la primera mira a −x y la última a +x (en (z, y) antihorario, un triángulo mira a −x). */
  for (const [e, haciaMas] of [
    [estaciones[0] as EstacionDelTren, false],
    [estaciones[estaciones.length - 1] as EstacionDelTren, true],
  ] as const) {
    const tris = THREE.ShapeUtils.triangulateShape(
      e.anillo.map(([z, y]) => new THREE.Vector2(z, y)),
      [],
    );
    const idx = e.anillo.map(([z, y]) => vertice(e.x, y, z, haciaMas ? 1 : -1, 0, 0, z, y));
    for (const t of tris) {
      const [i, j, k] = t as [number, number, number];
      const pi = e.anillo[i] as P2;
      const pj = e.anillo[j] as P2;
      const pk = e.anillo[k] as P2;
      const antihorario = (pj[0] - pi[0]) * (pk[1] - pi[1]) - (pj[1] - pi[1]) * (pk[0] - pi[0]) >= 0;
      if (antihorario !== haciaMas) m.tri(idx[i] as number, idx[j] as number, idx[k] as number);
      else m.tri(idx[i] as number, idx[k] as number, idx[j] as number);
    }
  }
}

/** Una rueda de bogie en (x, 0,36, z), con su cara (un polígono de `lados`) mirando a `lado`, 7 cm fuera del bastidor. */
function ruedaDelBogie(m: Molde, x: number, z: number, lado: 1 | -1, lados: number): void {
  const r = 0.36;
  const y = r;
  const zf = z + lado * 0.07;
  const idx: number[] = [];
  for (let k = 0; k < lados; k++) {
    const a = (k * 2 * Math.PI) / lados;
    idx.push(m.vertice(x + r * Math.cos(a), y + r * Math.sin(a), zf, 0, 0, lado, Math.cos(a), Math.sin(a)));
  }
  for (let k = 1; k + 1 < lados; k++) {
    if (lado > 0) m.tri(idx[0] as number, idx[k] as number, idx[k + 1] as number);
    else m.tri(idx[0] as number, idx[k + 1] as number, idx[k] as number);
  }
}

/** Lo que escribe el tren: la caja (mobiliario) y las luces (emisivo), del nivel, o las de siempre (`null`). */
function geometrias(largo: number, nivel: NivelDeLaCiudad | null): { cuerpo: THREE.BufferGeometry; luces: THREE.BufferGeometry } {
  if (nivel === null) return geometriasDeSiempre(largo);
  const d = DETALLE_DEL_TREN[nivel];
  const mo = new Molde(ATRIBUTOS_DEL_MOBILIARIO, true);
  const em = new Molde(ATRIBUTOS_DE_LO_EMISIVO, true);
  const largoCoche = largo / COCHES;
  const aluminio = lineal(0x9ea3a6);
  const oscuro = lineal(0x17191a);
  const gris = lineal(0x5a5e61);
  const acabadoDelAluminio = acabadoDeVehiculo(FAMILIA.aluminio, 0.35, 0.35);
  const hierro = ACABADO.hierroViejo;
  const aluminioDe = (m: Molde): void => {
    m.color(aluminio[0], aluminio[1], aluminio[2]);
    m.poner('aAcabado', acabadoDelAluminio[0], acabadoDelAluminio[1]);
  };
  const oscuroDe = (m: Molde, c = oscuro): void => {
    m.color(c[0], c[1], c[2]);
    m.poner('aAcabado', hierro[0], hierro[1]);
  };
  let ventana = 0;
  for (let i = 0; i < COCHES; i++) {
    const x1 = -i * largoCoche - 0.25;
    const x0 = -(i + 1) * largoCoche + 0.25;
    const xc = (x0 + x1) / 2;
    const cabeza = i === 0;
    const cola = i === COCHES - 1;
    /* ─── La caja: un loft por estaciones, con la cabina en punta delante y la trasera detrás ─── */
    const estaciones: EstacionDelTren[] = [];
    const puntaDetras = cola ? [{ x: x0, anillo: seccion(d, 0.94, 0.45) }, { x: x0 + 0.55, anillo: seccion(d) }] : null;
    const puntaDelante = cabeza ? [{ x: x1 - 1.1, anillo: seccion(d) }, ...(d.esquinas ? [{ x: x1 - 0.45, anillo: seccion(d, 0.985, 0.28) }] : []), { x: x1, anillo: seccion(d, 0.93, 0.62) }] : null;
    if (puntaDetras !== null) estaciones.push(...puntaDetras);
    else {
      if (d.esquinas) estaciones.push({ x: x0, anillo: seccion(d, 0.975) }, { x: x0 + 0.1, anillo: seccion(d) });
      else estaciones.push({ x: x0, anillo: seccion(d) });
    }
    if (puntaDelante !== null) estaciones.push(...puntaDelante);
    else {
      if (d.esquinas) estaciones.push({ x: x1 - 0.1, anillo: seccion(d) }, { x: x1, anillo: seccion(d, 0.975) });
      else estaciones.push({ x: x1, anillo: seccion(d) });
    }
    aluminioDe(mo);
    loftDelTren(mo, estaciones, { base: aluminio, ronia: RONIA });
    /* ─── Los bogies: el bastidor, y desde N1 sus ruedas; desde N2 las cajas de grasa y el travesaño ─── */
    for (const b of [x0 + 2.3, x1 - 2.3]) {
      oscuroDe(mo);
      if (nivel >= 2) mo.cajaBiselada(b - 1.25, 0.2, -1.1, b + 1.25, 0.62, 1.1, 0.04, 'nseoab');
      else mo.caja(b - 1.2, 0.18, -1.1, b + 1.2, 0.62, 1.1, 'nseoa');
      if (d.ruedas > 0) {
        oscuroDe(mo, gris);
        for (const eje of [b - 0.95, b + 0.95]) {
          for (const lado of [-1, 1] as const) ruedaDelBogie(mo, eje, lado * 1.1, lado, d.ruedas);
          if (nivel >= 2) {
            oscuroDe(mo);
            for (const lado of [-1, 1] as const) mo.caja(eje - 0.12, 0.26, lado * 1.12 - 0.08, eje + 0.12, 0.46, lado * 1.12 + 0.08, 'nseoa');
          }
          if (d.muelles) {
            oscuroDe(mo, gris);
            for (const lado of [-1, 1] as const) mo.cilindro(eje + (b < eje ? -0.35 : 0.35), lado * 1.0, 0.46, 0.66, 0.09, 0.09, 8, false);
          }
          oscuroDe(mo, gris);
        }
      }
    }
    /* ─── El faldón de equipos entre los bogies ─── */
    if (d.faldon) {
      oscuroDe(mo);
      const f0 = x0 + 3.8;
      const f1 = x1 - 3.8;
      if (f1 - f0 > 1) {
        mo.caja(f0, 0.42, -1.2, f1, 0.72, 1.2, 'nseo');
        if (nivel >= 2) for (const cx of [f0 + 0.9, (f0 + f1) / 2, f1 - 0.9]) mo.cajaBiselada(cx - 0.45, 0.3, -1.05, cx + 0.45, 0.42, 1.05, 0.03, 'nseob');
      }
    }
    /* ─── El techo: el equipo de aire (desde N1) y, en N3, las canaletas ─── */
    if (d.techo >= 1) {
      oscuroDe(mo, gris);
      const cimaTecho = 3.24;
      for (const cx of nivel >= 2 ? [xc - 2.6, xc + 2.6] : [xc]) {
        if (nivel >= 2) mo.cajaBiselada(cx - 1.1, cimaTecho - 0.08, -0.75, cx + 1.1, cimaTecho + 0.22, 0.75, 0.05, 'nseoa');
        else mo.caja(cx - 1.1, cimaTecho - 0.05, -0.75, cx + 1.1, cimaTecho + 0.2, 0.75, 'nseoa');
      }
      if (d.techo >= 2) {
        for (const lado of [-1, 1]) mo.caja(x0 + 0.4, 3.18, lado * 1.12 - 0.03, x1 - 0.4, 3.23, lado * 1.12 + 0.03, 'nsa');
      }
    }
    /* ─── Las puertas (desde N2): la hoja, un centímetro y medio fuera, algo más oscura ─── */
    const puertas = [xc - 3.2, xc + 3.2];
    if (d.puertas) {
      const hoja = lineal(0x7e8387);
      for (const px of puertas) {
        for (const lado of [-1, 1]) {
          mo.color(hoja[0], hoja[1], hoja[2]);
          mo.poner('aAcabado', acabadoDelAluminio[0], acabadoDelAluminio[1]);
          const z0 = lado * 1.46;
          const z1 = lado * 1.475;
          mo.caja(px - 0.65, 0.78, Math.min(z0, z1), px + 0.65, 2.62, Math.max(z0, z1), `${lado > 0 ? 's' : 'n'}eoa`);
        }
      }
    }
    /* ─── Los pasamanos de la cabina (N3) ─── */
    if (nivel >= 3 && cabeza) {
      oscuroDe(mo, gris);
      for (const lado of [-1, 1]) mo.cilindro(x1 - 1.35, lado * 1.49, 1.2, 2.5, 0.02, 0.02, 5, false);
    }
    /* ─── Las luces: las ventanas (tipo 3), la tira baja, los faros y los pilotos ─── */
    const ventanas: [number, number, number, number, number][] = [];
    /* De delante a detrás: la ventana de la punta, las tres del medio y la de la otra punta, y las de las puertas. */
    const tramos: [number, number][] = [
      [puertas[1] as number + 0.8, x1 - (cabeza ? 1.35 : 0.5)],
      [puertas[0] as number + 0.8, puertas[1] as number - 0.8],
      [x0 + (cola ? 0.85 : 0.5), puertas[0] as number - 0.8],
    ];
    for (const [a, b] of tramos) {
      const n = Math.max(1, Math.round((b - a) / 1.65));
      const paso = (b - a) / n;
      for (let k = 0; k < n; k++) ventanas.push([a + k * paso + 0.07, a + (k + 1) * paso - 0.07, 1.55, 2.42, 1.4665]);
    }
    for (const px of puertas) ventanas.push([px - 0.4, px + 0.4, 1.6, 2.45, d.puertas ? 1.48 : 1.4665]);
    for (const [a, b, y0, y1, zz] of ventanas) {
      for (const lado of [-1, 1]) {
        const z = lado * zz;
        em.color(1.1, 1.18, 1.12);
        em.poner('aEmisor', 3, ventana++ % 997);
        /* UV de 0 a 1: u de izquierda a derecha de quien la mira desde fuera, v de abajo arriba. */
        const i0 = em.vertice(lado > 0 ? a : b, y0, z, 0, 0, lado, 0, 0);
        const i1 = em.vertice(lado > 0 ? b : a, y0, z, 0, 0, lado, 1, 0);
        const i2 = em.vertice(lado > 0 ? b : a, y1, z, 0, 0, lado, 1, 1);
        const i3 = em.vertice(lado > 0 ? a : b, y1, z, 0, 0, lado, 0, 1);
        em.tri(i0, i1, i2);
        em.tri(i0, i2, i3);
      }
    }
    /* La tira de luz baja, de lado a lado. */
    em.color(0.2, 1.4, 1.1);
    em.poner('aEmisor', 0, 0);
    em.caja(x0 + 0.5, 0.86, -1.462, x1 - 0.5, 0.91, 1.462, 'ns');
    if (cabeza) {
      /* El parabrisas de la cabina (tipo 3, la cabina oscura: fase −1) y los faros. */
      em.color(0.35, 0.4, 0.42);
      em.poner('aEmisor', 3, -1);
      const xf = x1 + 0.006;
      const i0 = em.vertice(xf, 1.55, 0.95, 1, 0, 0, 0, 0);
      const i1 = em.vertice(xf, 1.55, -0.95, 1, 0, 0, 1, 0);
      const i2 = em.vertice(xf, 2.3, -0.95, 1, 0, 0, 1, 1);
      const i3 = em.vertice(xf, 2.3, 0.95, 1, 0, 0, 0, 1);
      em.tri(i0, i1, i2);
      em.tri(i0, i2, i3);
      em.color(5, 5, 4.6);
      em.poner('aEmisor', 0, 0);
      for (const lado of [-0.85, 0.85]) em.caja(x1, 1.08, lado - 0.15, x1 + 0.02, 1.26, lado + 0.15, 'e');
    }
    if (cola) {
      em.color(3, 0.1, 0.05);
      em.poner('aEmisor', 0, 0);
      for (const lado of [-0.85, 0.85]) em.caja(x0 - 0.02, 1.08, lado - 0.12, x0, 1.23, lado + 0.12, 'o');
    }
  }
  /* ─── Los fuelles entre coches ─── */
  for (let i = 0; i + 1 < COCHES; i++) {
    const xa = -(i + 1) * largoCoche - 0.25;
    const xb = -(i + 1) * largoCoche + 0.25;
    oscuroDe(mo);
    if (d.fuelle === 0) {
      mo.caja(xa, 0.95, -1.15, xb, 2.95, 1.15, 'nsa');
      continue;
    }
    /* El acordeón: pliegues que entran y salen, un loft de secciones redondeadas. */
    const pliegue = (s: number): P2[] => {
      const w = 1.15 - s * 0.05;
      const y0 = 0.95 + s * 0.04;
      const y1 = 2.95 - s * 0.04;
      return [
        [w, y0],
        [w, y1],
        [w - 0.15, y1 + 0.1],
        [-w + 0.15, y1 + 0.1],
        [-w, y1],
        [-w, y0],
      ];
    };
    const est: EstacionDelTren[] = [];
    for (let k = 0; k <= d.fuelle; k++) est.push({ x: xa + ((xb - xa) * k) / d.fuelle, anillo: pliegue(k % 2) });
    loftDelTren(mo, est);
  }
  return { cuerpo: mo.geometria(), luces: em.geometria() };
}

/** EL TREN DE SIEMPRE (el del barrio viejo, que no tiene nivel): un perfil por coche, bogies en caja y la banda de ventanas. */
function geometriasDeSiempre(largo: number): { cuerpo: THREE.BufferGeometry; luces: THREE.BufferGeometry } {
  const mo = new Molde(ATRIBUTOS_DEL_MOBILIARIO, true);
  const em = new Molde(ATRIBUTOS_DE_LO_EMISIVO, true);
  const largoCoche = largo / COCHES;
  em.poner('aEmisor', 0, 0);
  for (let i = 0; i < COCHES; i++) {
    const x1 = -i * largoCoche - 0.25;
    const x0 = -(i + 1) * largoCoche + 0.25;
    const cabeza = i === 0;
    const cola = i === COCHES - 1;
    const aluminio = lineal(0x8e9396);
    mo.color(aluminio[0], aluminio[1], aluminio[2]);
    mo.poner('aAcabado', ACABADO.chapa[0], 0.8);
    const perfil: [number, number][] = [
      [x0, 0.4],
      [x1, 0.4],
      [x1, cabeza ? 2.2 : 2.95],
      [cabeza ? x1 - 0.9 : x1 - 0.2, 3.2],
      [cola ? x0 + 0.6 : x0 + 0.2, 3.2],
      [x0, cola ? 2.6 : 2.95],
    ];
    mo.perfil(perfil, -1.45, 1.45);
    const oscuro = lineal(0x151617);
    mo.color(oscuro[0], oscuro[1], oscuro[2]);
    mo.poner('aAcabado', ACABADO.hierroViejo[0], ACABADO.hierroViejo[1]);
    for (const b of [x0 + 2.2, x1 - 2.2]) mo.caja(b - 1.2, 0, -1.2, b + 1.2, 0.42, 1.2, 'nseoa');
    for (let x = x0 + 1.2; x + 1.3 < x1 - 0.8; x += 1.75) {
      em.color(1.25, 1.35, 1.2);
      for (const lado of [-1, 1]) {
        const z = lado * 1.452;
        if (lado > 0) em.quad([x, 1.35, z], [x + 1.3, 1.35, z], [x + 1.3, 2.3, z], [x, 2.3, z], [0, 0, 1], [0, 0, 1, 0, 1, 1, 0, 1]);
        else em.quad([x + 1.3, 1.35, z], [x, 1.35, z], [x, 2.3, z], [x + 1.3, 2.3, z], [0, 0, -1], [0, 0, 1, 0, 1, 1, 0, 1]);
      }
    }
    em.color(0.2, 1.4, 1.1);
    em.caja(x0 + 0.3, 0.55, -1.455, x1 - 0.3, 0.6, 1.455, 'ns');
    if (cabeza) {
      em.color(5, 5, 4.6);
      for (const lado of [-0.8, 0.8]) em.caja(x1, 0.9, lado - 0.15, x1 + 0.02, 1.1, lado + 0.15, 'e');
    }
    if (cola) {
      em.color(3, 0.1, 0.05);
      for (const lado of [-0.8, 0.8]) em.caja(x0 - 0.02, 0.9, lado - 0.12, x0, 1.05, lado + 0.12, 'o');
    }
  }
  return { cuerpo: mo.geometria(), luces: em.geometria() };
}

export class Tren {
  readonly mallas: THREE.Mesh[];
  private readonly grupo: THREE.Mesh[];
  private readonly plano: TrenDelPlano;
  /** El nivel del tren (el de su material de caja), o `null`: el de siempre, sin temblor (el barrio viejo). */
  readonly nivel: NivelDeLaCiudad | null;

  constructor(plano: TrenDelPlano, materialCuerpo: THREE.Material, materialLuces: THREE.Material, sombras: boolean) {
    this.plano = plano;
    this.nivel = nivelDelMaterial(materialCuerpo);
    const g = geometrias(plano.largo, this.nivel);
    const cuerpo = new THREE.Mesh(g.cuerpo, materialCuerpo);
    cuerpo.name = 'coches';
    cuerpo.castShadow = sombras;
    const luces = new THREE.Mesh(g.luces, materialLuces);
    luces.name = 'ventanas';
    this.mallas = [cuerpo, luces];
    this.grupo = [cuerpo, luces];
    for (const m of this.grupo) {
      m.visible = false;
      m.matrixAutoUpdate = false;
    }
  }

  /** Coloca el tren en el tic de la noche (20 Hz), con su temblor. No deja basura: va en cada fotograma. */
  actualizar(tic: number): void {
    const t = this.plano;
    const donde = t.enTic(tic);
    if (donde === null || Math.abs(donde.cabeza - donde.cola) < 0.01) {
      for (const m of this.grupo) m.visible = false;
      return;
    }
    const sentido = donde.cabeza > donde.cola ? 1 : -1;
    const frente =
      sentido > 0
        ? donde.cabeza < t.hasta - 1e-6
          ? donde.cabeza
          : donde.cola + t.largo
        : donde.cabeza > t.desde + 1e-6
          ? donde.cabeza
          : donde.cola - t.largo;
    let dy = 0;
    let balanceo = 0;
    if (this.nivel !== null) {
      temblorDelTren(tic, this.temblor);
      dy = this.temblor[0] as number;
      balanceo = this.temblor[1] as number;
    }
    const y = t.alto + SOBRE_LA_VIGA + dy;
    const m = this.colocacion;
    if (t.eje === 'x') m.makeRotationY(sentido > 0 ? 0 : Math.PI);
    else m.makeRotationY(sentido > 0 ? -Math.PI / 2 : Math.PI / 2);
    /* El balanceo, alrededor del eje del tren (su x), a la altura del carril. */
    m.multiply(this.balanceo.makeRotationX(balanceo));
    if (t.eje === 'x') m.setPosition(frente, y, t.linea);
    else m.setPosition(t.linea, y, frente);
    for (const malla of this.grupo) {
      malla.visible = true;
      malla.matrix.copy(m);
      malla.matrixWorldNeedsUpdate = true;
    }
  }

  private readonly colocacion = new THREE.Matrix4();
  private readonly balanceo = new THREE.Matrix4();
  /** El temblor del tic, reservado una vez (`temblorDelTren` escribe aquí). */
  private readonly temblor = new Float64Array(2);

  liberar(): void {
    for (const m of this.grupo) m.geometry.dispose();
  }
}
