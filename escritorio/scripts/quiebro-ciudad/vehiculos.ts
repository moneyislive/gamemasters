/**
 * LAS COMPROBACIONES DE LOS VEHÍCULOS en `verify:quiebro-ciudad` (plan del detalle, §5.2.8 y la ficha de
 * O2-VEHICULOS). Dueño: O2-VEHICULOS. Cada resultado lleva su mínimo de inspeccionados (cero inspeccionados es cero
 * fallos, y se leería como vigilado) y, dentro, su VACUNA: el mismo juez sobre algo roto a propósito tiene que
 * salir rojo, o el resultado sale rojo.
 *
 *   (a) La envolvente de cada carrocería, en cada grado (g1-g4) y en cada orientación, entre 0,2 y 1,9 m, cabe en
 *       su caja de 4,5 × 1,75 (con la holgura de la franja). Vacuna: el coche escalado × 1,05.
 *   (b) Ninguna cara coplanaria solapada (el mismo plano a ±1 mm, mirando al mismo lado, con área en común) en cada
 *       carrocería y grado, ni en el pilar y la viga de cada detalle: es lo que hacía parpadear el estribo. Entre
 *       moldes distintos (lo emisivo delante del mobiliario), a ±4 mm: a lo lejos la profundidad no separa menos.
 *       Vacunas: los bajos de antes (una caja de 0,30-0,42 m con los costados en el plano de la chapa) y la junta
 *       del canto entera, 2 mm detrás de la franja de luz.
 *   (c) El pilar del viaducto, en cada detalle, dentro de su caja de 1 × 1 en la franja. Vacuna: el pilar 3 cm a un lado.
 *   (d) El temblor del tren es función pura del tic (lo mismo en cualquier orden, en dos trenes) y no pasa de
 *       ±1,2 cm ni de ±0,15°. Vacuna: un temblor que se acuerda de la llamada anterior.
 *   (e) Las mallas del tren se llaman `coches` y `ventanas` en todos los niveles y en el barrio (el comprobador de
 *       la ciudad las aparta por su nombre). Vacuna: una malla renombrada.
 *   (f) Faros y pilotos a ±1 cm entre los cuatro grados de cada carrocería (medidos en la geometría: el centro de
 *       las lentes, tipo 4, y el de la banda roja de atrás, a cada lado). Vacuna: un faro de g4 3 cm adelantado.
 *   (g) Hay franja de luz (emisivo) por los dos lados en cada tramo del Elevado, en cada nivel y grado, de punta a
 *       punta del tramo. Vacuna: el tramo sin su franja.
 *   (h) Cada coche, en cada grado, cabe en su tope (180 / 450 / 1.000 / 3.500 triángulos de mobiliario; la
 *       furgoneta, +20 %) y cede en pasos que caben en el trozo (600 en g1, que es el de N0; 1.000 en los demás).
 */
import * as THREE from 'three';
import type { ComprobarElPaquete, ContextoDeLaCiudad, Resultado, Tri } from './comun';
import { FRANJA, HOLGURA, recortarALaFranja } from './comun';
import { Molde } from '../../src/quiebro/ciudad/geometria';
import type { GeometriaVolcada } from '../../src/quiebro/ciudad/geometria';
import { ACABADO, ATRIBUTOS_DE_LO_EMISIVO, ATRIBUTOS_DEL_MOBILIARIO, materialDelMobiliario } from '../../src/quiebro/ciudad/materiales';
import type { Carroceria, GradoDelCoche, MoldesDelCoche } from '../../src/quiebro/ciudad/coches';
import { CARROCERIAS, GRADOS_DEL_COCHE, carroceriaDe, escribirElCoche, matrizDelCoche, topeDelCoche } from '../../src/quiebro/ciudad/coches';
import type { CajaXZ, CocheDelPlano, GradoDeLaCelda, NivelDeLaCiudad, Orientacion, TrenDelPlano } from '../../src/quiebro/ciudad/tipos';
import { NIVELES_DE_LA_CIUDAD } from '../../src/quiebro/ciudad/tipos';
import type { TramoDeViaducto } from '../../src/quiebro/ciudad/viaducto';
import { seccionDelViaducto, viaducto } from '../../src/quiebro/ciudad/viaducto';
import type { PartesDeLaCiudad } from '../../src/quiebro/ciudad/celdas';
import { moldesDeLaObra, obraNueva } from '../../src/quiebro/ciudad/celdas';
import { GRADOS_DEL_NIVEL } from '../../src/quiebro/ciudad/grados';
import { TEMBLOR_DEL_TREN, Tren, materialesDelTren, temblorDelTren } from '../../src/quiebro/ciudad/tren';

/* ═══════════════════════════════ LO COMÚN ═══════════════════════════════ */

type Punto = [number, number, number];

/** Los triángulos de una geometría volcada, en listas de tres puntos. */
function triangulosDe(g: GeometriaVolcada): Punto[][] {
  const pos = g.datos.get('position');
  const salida: Punto[][] = [];
  if (pos === undefined) return salida;
  const idx = g.indices;
  const p = (i: number): Punto => [pos[i * 3] as number, pos[i * 3 + 1] as number, pos[i * 3 + 2] as number];
  for (let k = 0; k < idx.length; k += 3) salida.push([p(idx[k] as number), p(idx[k + 1] as number), p(idx[k + 2] as number)]);
  return salida;
}

function moldesNuevos(): MoldesDelCoche {
  return { mobiliario: new Molde(ATRIBUTOS_DEL_MOBILIARIO, true), cristal: new Molde({}, false), emisivo: new Molde(ATRIBUTOS_DE_LO_EMISIVO, true) };
}

/** Un coche de esa carrocería (las de los turismos salen de la semilla, `carroceriaDe`). */
function cocheDePrueba(carroceria: Carroceria, caja: CajaXZ, mira: Orientacion): CocheDelPlano {
  const tipo = carroceria === 'taxi' ? 'taxi' : carroceria === 'furgoneta' ? 'furgoneta' : 'turismo';
  for (let semilla = 0; semilla < 10000; semilla++) {
    const c: CocheDelPlano = { tipo, caja, mira, semilla };
    if (carroceriaDe(c) === carroceria) return c;
  }
  throw new Error(`ninguna semilla da un ${carroceria}`);
}

/** Un coche escrito entero en moldes nuevos, con sus pasos (triángulos entre dos cesiones, sumando familias). */
function escrito(c: CocheDelPlano, grado: GradoDelCoche, matriz?: THREE.Matrix4): { m: MoldesDelCoche; pasos: number[] } {
  const m = moldesNuevos();
  const total = (): number => m.mobiliario.triangulos + m.cristal.triangulos + m.emisivo.triangulos;
  const pasos: number[] = [];
  let antes = 0;
  const g = escribirElCoche(m, c, grado, matriz ?? matrizDelCoche(c));
  for (;;) {
    const r = g.next();
    pasos.push(total() - antes);
    antes = total();
    if (r.done === true) break;
  }
  return { m, pasos };
}

/** La caja de un coche aparcado a lo largo de x (e/o) o de z (n/s), centrada en (cx, cz). */
function cajaDeCoche(cx: number, cz: number, mira: Orientacion): CajaXZ {
  const largo = mira === 'e' || mira === 'o';
  return largo ? { x0: cx - 2.25, z0: cz - 0.875, x1: cx + 2.25, z1: cz + 0.875 } : { x0: cx - 0.875, z0: cz - 2.25, x1: cx + 0.875, z1: cz + 2.25 };
}

/* ═══════════════════════════════ (a) LA ENVOLVENTE ═══════════════════════════════ */

/** Lo que de unos triángulos cae en la franja y se sale de la caja (con la holgura): cuántos, y un ejemplo. */
export function fueraDeLaCaja(tris: readonly Punto[][], caja: CajaXZ, holgura = HOLGURA): { fuera: number; mirados: number; ejemplo: string } {
  let fuera = 0;
  let mirados = 0;
  let ejemplo = '';
  for (const [a, b, c] of tris) {
    const t: Tri = { a: new THREE.Vector3(...(a as Punto)), b: new THREE.Vector3(...(b as Punto)), c: new THREE.Vector3(...(c as Punto)) };
    const poli = recortarALaFranja(t);
    if (poli.length < 3) continue;
    mirados++;
    const mal = poli.find((q) => q.x < caja.x0 - holgura || q.x > caja.x1 + holgura || q.z < caja.z0 - holgura || q.z > caja.z1 + holgura);
    if (mal !== undefined) {
      fuera++;
      if (ejemplo === '') ejemplo = `(${mal.x.toFixed(3)}, ${mal.y.toFixed(3)}, ${mal.z.toFixed(3)})`;
    }
  }
  return { fuera, mirados, ejemplo };
}

function envolvente(): Resultado {
  const problemas: string[] = [];
  let mirados = 0;
  let coches = 0;
  for (const carroceria of CARROCERIAS) {
    for (const grado of GRADOS_DEL_COCHE) {
      for (const mira of ['n', 's', 'e', 'o'] as const) {
        const caja = cajaDeCoche(12.3, -7.9, mira);
        const c = cocheDePrueba(carroceria, caja, mira);
        const { m } = escrito(c, grado);
        const tris = [...triangulosDe(m.mobiliario.volcar()), ...triangulosDe(m.cristal.volcar()), ...triangulosDe(m.emisivo.volcar())];
        const r = fueraDeLaCaja(tris, caja);
        mirados += r.mirados;
        coches++;
        if (r.fuera > 0 && problemas.length < 6) problemas.push(`${carroceria} g${String(grado)} mirando a ${mira}: ${String(r.fuera)} triángulos de la franja fuera de su caja, p. ej. ${r.ejemplo}`);
      }
    }
  }
  /* La vacuna: la berlina de g2 escalada × 1,05 se sale. */
  const caja = cajaDeCoche(0, 0, 'e');
  const c = cocheDePrueba('berlina', caja, 'e');
  const grande = escrito(c, 2, matrizDelCoche(c).multiply(new THREE.Matrix4().makeScale(1.05, 1.05, 1.05)));
  const vacuna = fueraDeLaCaja(triangulosDe(grande.m.mobiliario.volcar()), caja);
  if (vacuna.fuera === 0) problemas.push('vacuna: la berlina de g2 escalada × 1,05 no se sale de su caja: el juez no mira');
  return { que: '(a) cada carrocería, grado y orientación cabe en su caja entre 0,2 y 1,9 m (y la escalada × 1,05, no)', bien: problemas.length === 0, detalle: problemas, inspeccionados: mirados, minimo: 20000 + coches };
}

/* ═══════════════════════════════ (b) CARAS COPLANARIAS SOLAPADAS ═══════════════════════════════ */

/** Un triángulo con su plano: para buscar parejas en el mismo plano. `grupo`: el molde del que sale. */
interface Cara {
  readonly p: Punto[];
  readonly n: Punto;
  readonly d: number;
  readonly deDosCaras: boolean;
  readonly grupo: number;
}

function caraDe(p: Punto[], deDosCaras: boolean, grupo = 0): Cara | null {
  const [a, b, c] = p as [Punto, Punto, Punto];
  const u: Punto = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v: Punto = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n: Punto = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(...n);
  if (l < 1e-9) return null;
  const nn: Punto = [n[0] / l, n[1] / l, n[2] / l];
  return { p, n: nn, d: nn[0] * a[0] + nn[1] * a[1] + nn[2] * a[2], deDosCaras, grupo };
}

/** El área del corte de dos triángulos del mismo plano (Sutherland-Hodgman en el plano de mayor proyección). */
function areaEnComun(a: Cara, b: Cara): number {
  const n = a.n;
  const eje = Math.abs(n[0]) >= Math.abs(n[1]) && Math.abs(n[0]) >= Math.abs(n[2]) ? 0 : Math.abs(n[1]) >= Math.abs(n[2]) ? 1 : 2;
  const [i, j] = eje === 0 ? [1, 2] : eje === 1 ? [2, 0] : [0, 1];
  const plano = (p: Punto): [number, number] => [p[i] as number, p[j] as number];
  const antihorario = (q: [number, number][]): [number, number][] => {
    let s = 0;
    for (let k = 0; k < q.length; k++) {
      const p0 = q[k] as [number, number];
      const p1 = q[(k + 1) % q.length] as [number, number];
      s += p0[0] * p1[1] - p1[0] * p0[1];
    }
    return s >= 0 ? q : [...q].reverse();
  };
  let poli = antihorario(a.p.map(plano));
  const recorte = antihorario(b.p.map(plano));
  for (let k = 0; k < recorte.length && poli.length > 0; k++) {
    const c0 = recorte[k] as [number, number];
    const c1 = recorte[(k + 1) % recorte.length] as [number, number];
    const dentro = (p: [number, number]): number => (c1[0] - c0[0]) * (p[1] - c0[1]) - (c1[1] - c0[1]) * (p[0] - c0[0]);
    const nuevo: [number, number][] = [];
    for (let m = 0; m < poli.length; m++) {
      const p = poli[m] as [number, number];
      const q = poli[(m + 1) % poli.length] as [number, number];
      const dp = dentro(p);
      const dq = dentro(q);
      if (dp >= 0) nuevo.push(p);
      if (dp >= 0 !== dq >= 0) {
        const t = dp / (dp - dq);
        nuevo.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    poli = nuevo;
  }
  let area = 0;
  for (let k = 0; k < poli.length; k++) {
    const p0 = poli[k] as [number, number];
    const p1 = poli[(k + 1) % poli.length] as [number, number];
    area += p0[0] * p1[1] - p1[0] * p0[1];
  }
  /* El área de la proyección, devuelta al plano. */
  return Math.abs(area) / 2 / Math.max(Math.abs(n[eje] as number), 1e-6);
}

/**
 * EL JUEZ DE LAS CARAS COPLANARIAS: las parejas de triángulos en el mismo plano a ±`tolerancia` (1 mm) que miran al
 * mismo lado (o a cualquiera, si uno es de dos caras: el cristal) y comparten más de 1 cm² de área. Por planos
 * cuantizados, sin mirarlas todas contra todas. Con `soloEntreGrupos`, sólo las de moldes distintos: una cara de
 * lo emisivo delante de una del mobiliario a 2 mm no se pisa en el mismo plano, pero a 50 m la profundidad no
 * separa 2 mm y las dos se pelean igual (la junta del Elevado detrás de su franja de luz).
 */
export function carasSolapadas(caras: readonly Cara[], tolerancia = 0.001, soloEntreGrupos = false): { parejas: number; ejemplo: string } {
  const alcance = tolerancia <= 0.001 ? 1 : Math.ceil(tolerancia * 500) + 1;
  const vecinos = Array.from({ length: 2 * alcance + 1 }, (_, i) => i - alcance);
  const cubos = new Map<string, number[]>();
  const clave = (c: Cara, dd: number): string => {
    const s = c.n[0] + c.n[1] * 3 + c.n[2] * 7 < 0 ? -1 : 1;
    return `${String(Math.round(c.n[0] * s * 200))},${String(Math.round(c.n[1] * s * 200))},${String(Math.round(c.n[2] * s * 200))},${String(Math.round(c.d * s * 500) + dd)}`;
  };
  caras.forEach((c, k) => {
    const x = clave(c, 0);
    const l = cubos.get(x);
    if (l === undefined) cubos.set(x, [k]);
    else l.push(k);
  });
  let parejas = 0;
  let ejemplo = '';
  caras.forEach((a, ia) => {
    for (const dd of vecinos) {
      for (const ib of cubos.get(clave(a, dd)) ?? []) {
        if (ib <= ia) continue;
        const b = caras[ib] as Cara;
        if (soloEntreGrupos && a.grupo === b.grupo) continue;
        const mismoLado = a.n[0] * b.n[0] + a.n[1] * b.n[1] + a.n[2] * b.n[2];
        if (Math.abs(mismoLado) < 0.9999) continue;
        if (mismoLado < 0 && !a.deDosCaras && !b.deDosCaras) continue;
        const dist = Math.abs(a.d - (mismoLado > 0 ? b.d : -b.d));
        if (dist > tolerancia) continue;
        if (areaEnComun(a, b) > 1e-4) {
          parejas++;
          if (ejemplo === '') ejemplo = `(${(a.p[0] as Punto).map((v) => v.toFixed(3)).join(', ')}) con normal (${a.n.map((v) => v.toFixed(2)).join(', ')})`;
        }
      }
    }
  });
  return { parejas, ejemplo };
}

/** Las caras de varias geometrías; cada una es un grupo (su índice en la lista). */
function carasDe(geos: readonly (readonly [GeometriaVolcada, boolean])[]): Cara[] {
  const salida: Cara[] = [];
  geos.forEach(([g, dos], grupo) => {
    for (const p of triangulosDe(g)) {
      const c = caraDe(p, dos, grupo);
      if (c !== null) salida.push(c);
    }
  });
  return salida;
}

/** Entre moldes distintos (lo emisivo delante del mobiliario), la tolerancia de (b): 4 mm. */
const ENTRE_MOLDES = 0.004;

/** Un tramo y un pilar del viaducto con el detalle de un nivel y un grado, en moldes nuevos. */
function viaductoDePrueba(nivel: NivelDeLaCiudad, grado: GradoDeLaCelda, eje: 'x' | 'z', desplazado = 0): { mobiliario: Molde; emisivo: Molde; pilar: CajaXZ } {
  const m = moldesDeLaObra(true);
  const obra = obraNueva({ nivel, grado, relieveDeHoy: false, ciudad: null as unknown as PartesDeLaCiudad, m });
  const pilar: CajaXZ = eje === 'x' ? { x0: 11.5, z0: -60.5, x1: 12.5, z1: -59.5 } : { x0: -60.5, z0: 11.5, x1: -59.5, z1: 12.5 };
  const tramo: TramoDeViaducto = { eje, linea: -60, desde: -24, hasta: 24, alto: 7.5 };
  const puesto: CajaXZ = { x0: pilar.x0 + desplazado, z0: pilar.z0, x1: pilar.x1 + desplazado, z1: pilar.z1 };
  for (const _ of viaducto(obra, { tramo, pilares: [puesto] })) {
    /* de un tirón */
  }
  return { mobiliario: m.mobiliario, emisivo: m.emisivo, pilar };
}

/** Los detalles del viaducto que hay: (nivel, grado) de cada uno. */
const DETALLES_DEL_VIADUCTO: readonly (readonly [NivelDeLaCiudad, GradoDeLaCelda])[] = NIVELES_DE_LA_CIUDAD.flatMap((n) => GRADOS_DEL_NIVEL[n].map((g) => [n, g] as const));

function coplanarias(): Resultado {
  const problemas: string[] = [];
  let mirados = 0;
  for (const carroceria of CARROCERIAS) {
    for (const grado of GRADOS_DEL_COCHE) {
      const c = cocheDePrueba(carroceria, cajaDeCoche(0, 0, 'e'), 'e');
      const { m } = escrito(c, grado);
      const caras = carasDe([
        [m.mobiliario.volcar(), false],
        [m.emisivo.volcar(), false],
        [m.cristal.volcar(), true],
      ]);
      mirados += caras.length;
      const r = carasSolapadas(caras);
      if (r.parejas > 0 && problemas.length < 6) problemas.push(`${carroceria} g${String(grado)}: ${String(r.parejas)} parejas de caras solapadas en el mismo plano, p. ej. ${r.ejemplo}`);
      const e = carasSolapadas(caras, ENTRE_MOLDES, true);
      if (e.parejas > 0 && problemas.length < 6) problemas.push(`${carroceria} g${String(grado)}: ${String(e.parejas)} parejas de caras de moldes distintos a menos de 4 mm que se pisan, p. ej. ${e.ejemplo}`);
    }
  }
  for (const [nivel, grado] of DETALLES_DEL_VIADUCTO) {
    for (const eje of ['x', 'z'] as const) {
      const v = viaductoDePrueba(nivel, grado, eje);
      const caras = carasDe([
        [v.mobiliario.volcar(), false],
        [v.emisivo.volcar(), false],
      ]);
      mirados += caras.length;
      const r = carasSolapadas(caras);
      if (r.parejas > 0 && problemas.length < 8) problemas.push(`el viaducto de N${String(nivel)} g${String(grado)} (eje ${eje}): ${String(r.parejas)} parejas solapadas, p. ej. ${r.ejemplo}`);
      const e = carasSolapadas(caras, ENTRE_MOLDES, true);
      if (e.parejas > 0 && problemas.length < 8) problemas.push(`el viaducto de N${String(nivel)} g${String(grado)} (eje ${eje}): ${String(e.parejas)} parejas de lo emisivo y el mobiliario a menos de 4 mm que se pisan, p. ej. ${e.ejemplo}`);
    }
  }
  /* La vacuna de moldes distintos: la junta del canto entera, 2 mm detrás de la franja de luz (el viaducto de antes). */
  {
    const mo = new Molde(ATRIBUTOS_DEL_MOBILIARIO, true);
    const em = new Molde(ATRIBUTOS_DE_LO_EMISIVO, true);
    mo.quad([-0.012, 0.7, 1.908], [0.012, 0.7, 1.908], [0.012, 0.9, 1.908], [-0.012, 0.9, 1.908], [0, 0, 1], [0, 0, 1, 0, 1, 1, 0, 1]);
    em.quad([-1, 0.76, 1.91], [1, 0.76, 1.91], [1, 0.84, 1.91], [-1, 0.84, 1.91], [0, 0, 1], [0, 0, 1, 0, 1, 1, 0, 1]);
    const caras = carasDe([
      [mo.volcar(), false],
      [em.volcar(), false],
    ]);
    if (carasSolapadas(caras, ENTRE_MOLDES, true).parejas === 0) problemas.push('vacuna: la junta entera detrás de la franja (2 mm) no sale: el juez de moldes distintos no mira');
    if (carasSolapadas(caras).parejas !== 0) problemas.push('vacuna: la junta a 2 mm ya la ve el juez de 1 mm: la vacuna no prueba lo de 4 mm');
  }
  /* La vacuna: los bajos de antes, con los costados en el plano de la chapa (`coches.ts` de d4402d0). */
  const m = new Molde(ATRIBUTOS_DEL_MOBILIARIO, true);
  m.poner('aAcabado', ACABADO.chapa[0], ACABADO.chapa[1]);
  m.perfil(
    [
      [-2.2, 0.32],
      [2.2, 0.32],
      [2.22, 0.55],
      [2.15, 0.76],
      [1.9, 0.85],
      [0.95, 0.92],
      [-1.4, 0.95],
      [-2.1, 0.9],
      [-2.22, 0.72],
      [-2.22, 0.45],
    ],
    -0.86,
    0.86,
  );
  m.caja(-2.24, 0.3, -0.86, 2.24, 0.42, 0.86, 'nseoab');
  if (carasSolapadas(carasDe([[m.volcar(), false]])).parejas === 0) problemas.push('vacuna: los bajos de antes, en el plano de la chapa, no salen: el juez no mira');
  return {
    que: '(b) ninguna cara coplanaria solapada (±1 mm; ±4 mm entre moldes) en cada carrocería y grado ni en el viaducto de cada detalle (y los bajos de antes y la junta detrás de la franja, sí)',
    bien: problemas.length === 0,
    detalle: problemas,
    inspeccionados: mirados,
    minimo: 15000,
  };
}

/* ═══════════════════════════════ (c) EL PILAR EN SU CAJA ═══════════════════════════════ */

function pilarEnSuCaja(): Resultado {
  const problemas: string[] = [];
  let mirados = 0;
  const delPilar = (tris: Punto[][], pilar: CajaXZ): Punto[][] => {
    /* Sólo lo del pilar: lo que está a menos de 1,5 m de su centro (la viga va por encima de 7,5 m). */
    const cx = (pilar.x0 + pilar.x1) / 2;
    const cz = (pilar.z0 + pilar.z1) / 2;
    return tris.filter((t) => t.every((p) => Math.hypot(p[0] - cx, p[2] - cz) < 1.5));
  };
  for (const [nivel, grado] of DETALLES_DEL_VIADUCTO) {
    for (const eje of ['x', 'z'] as const) {
      const v = viaductoDePrueba(nivel, grado, eje);
      const r = fueraDeLaCaja(delPilar(triangulosDe(v.mobiliario.volcar()), v.pilar), v.pilar, 0.002);
      mirados += r.mirados;
      if (r.fuera > 0) problemas.push(`el pilar de N${String(nivel)} g${String(grado)} (eje ${eje}) se sale de su caja de 1 × 1 en la franja: ${String(r.fuera)} triángulos, p. ej. ${r.ejemplo}`);
    }
  }
  /* La vacuna: el pilar corrido 3 cm, contra su caja de siempre. */
  const v = viaductoDePrueba(2, 3, 'x', 0.03);
  const vacuna = fueraDeLaCaja(delPilar(triangulosDe(v.mobiliario.volcar()), v.pilar).filter((t) => t.every((p) => p[1] < FRANJA[1] + 0.5)), v.pilar, 0.002);
  if (vacuna.fuera === 0) problemas.push('vacuna: el pilar corrido 3 cm no se sale: el juez no mira');
  return { que: '(c) el pilar del viaducto de cada detalle, dentro de su caja de 1 × 1 en la franja (y corrido 3 cm, no)', bien: problemas.length === 0, detalle: problemas, inspeccionados: mirados, minimo: 60 };
}

/* ═══════════════════════════════ (d) EL TEMBLOR ═══════════════════════════════ */

const PLANO_DEL_TREN: TrenDelPlano = { eje: 'x', linea: -60, desde: -270, hasta: 270, alto: 7.5, largo: 36, pilares: [], enTic: (tic) => ({ cabeza: -200 + tic * 0.08, cola: -236 + tic * 0.08 }) };

interface ColocableQ {
  actualizar(tic: number): void;
  readonly mallas: readonly THREE.Mesh[];
}

/** ¿Da el tren la misma colocación en cada tic, se pida en el orden que se pida y en otro tren? Lo que no casa y cuántos tics miró. */
export function juzgarElTemblor(hacer: () => ColocableQ, tics: readonly number[]): { problemas: string[]; mirados: number } {
  const a = hacer();
  const b = hacer();
  const problemas: string[] = [];
  const guardado = new Map<number, number[]>();
  for (const tic of tics) {
    a.actualizar(tic);
    guardado.set(tic, [...(a.mallas[0] as THREE.Mesh).matrix.elements]);
  }
  /* El otro tren, al revés y repitiendo la mitad. */
  const revueltos = [...tics].reverse();
  for (let i = 0; i < tics.length; i += 2) revueltos.push(tics[i] as number);
  for (const tic of revueltos) {
    b.actualizar(tic);
    const e = (b.mallas[0] as THREE.Mesh).matrix.elements;
    const g = guardado.get(tic) as number[];
    if (e.some((x, i) => Math.abs(x - (g[i] as number)) > 1e-12) && problemas.length < 3) problemas.push(`en el tic ${String(tic)} la colocación depende de lo que se pidió antes`);
  }
  return { problemas, mirados: revueltos.length };
}

function temblor(): Resultado {
  const problemas: string[] = [];
  const tics = Array.from({ length: 400 }, (_, i) => i * 3 + 7);
  let mirados = 0;
  for (const nivel of NIVELES_DE_LA_CIUDAD) {
    const hacer = (): Tren => {
      const m = materialesDelTren(nivel);
      return new Tren(PLANO_DEL_TREN, m.cuerpo, m.luces, false);
    };
    const r = juzgarElTemblor(hacer, tics);
    mirados += r.mirados;
    problemas.push(...r.problemas.map((p) => `N${String(nivel)}: ${p}`));
  }
  let alto = 0;
  let giro = 0;
  for (let tic = 0; tic < 40000; tic++) {
    const [dy, rol] = temblorDelTren(tic);
    alto = Math.max(alto, Math.abs(dy));
    giro = Math.max(giro, Math.abs(rol));
  }
  if (alto > TEMBLOR_DEL_TREN.altura + 1e-12 || giro > TEMBLOR_DEL_TREN.balanceo + 1e-12) problemas.push(`el temblor llega a ${String(alto)} m y ${String(giro)} rad`);
  if (alto < TEMBLOR_DEL_TREN.altura * 0.5 || giro < TEMBLOR_DEL_TREN.balanceo * 0.5) problemas.push(`el temblor apenas se mueve (${String(alto)} m, ${String(giro)} rad): no se vería`);
  /* La vacuna: un temblor que se acuerda de la llamada anterior. */
  let memoria = 0;
  const conMemoria = (): ColocableQ => {
    const malla = new THREE.Mesh();
    return {
      mallas: [malla],
      actualizar(tic: number): void {
        memoria = (memoria + tic) % 7;
        malla.matrix.makeTranslation(tic, memoria * 0.01, 0);
      },
    };
  };
  if (juzgarElTemblor(conMemoria, tics).problemas.length === 0) problemas.push('vacuna: un temblor con memoria sale como función pura: el juez no mira');
  return { que: '(d) el temblor del tren es función pura del tic, en todos los niveles, dentro de ±1,2 cm y ±0,15° (y uno con memoria, no)', bien: problemas.length === 0, detalle: problemas, inspeccionados: mirados, minimo: 4 * 400 };
}

/* ═══════════════════════════════ (e) LOS NOMBRES DEL TREN ═══════════════════════════════ */

/** Los nombres que el comprobador de la ciudad aparta (`verificar-quiebro-ciudad.ts`, el tren). */
const NOMBRES_DEL_TREN = ['coches', 'ventanas'];

export function juzgarLosNombres(mallas: readonly THREE.Object3D[]): boolean {
  return mallas.length === NOMBRES_DEL_TREN.length && mallas.every((m, i) => m.name === NOMBRES_DEL_TREN[i]);
}

function nombres(): Resultado {
  const problemas: string[] = [];
  let mirados = 0;
  const trenes: [string, Tren][] = NIVELES_DE_LA_CIUDAD.map((n) => {
    const m = materialesDelTren(n);
    return [`N${String(n)}`, new Tren(PLANO_DEL_TREN, m.cuerpo, m.luces, false)];
  });
  trenes.push(['el barrio', new Tren(PLANO_DEL_TREN, materialDelMobiliario(1), materialDelMobiliario(1), false)]);
  for (const [quien, t] of trenes) {
    mirados += t.mallas.length;
    if (!juzgarLosNombres(t.mallas)) problemas.push(`${quien}: las mallas del tren se llaman ${JSON.stringify(t.mallas.map((m) => m.name))}`);
    t.liberar();
  }
  const renombrada = [new THREE.Mesh(), new THREE.Mesh()];
  (renombrada[0] as THREE.Mesh).name = 'coches';
  (renombrada[1] as THREE.Mesh).name = 'luces';
  if (juzgarLosNombres(renombrada)) problemas.push('vacuna: una malla renombrada pasa: el juez no mira');
  return { que: '(e) las mallas del tren se llaman coches y ventanas en todos los niveles y en el barrio (y renombradas, no)', bien: problemas.length === 0, detalle: problemas, inspeccionados: mirados, minimo: 10 };
}

/* ═══════════════════════════════ (f) FAROS Y PILOTOS EN SU SITIO ═══════════════════════════════ */

/** Los centros de las lentes (tipo 4) y de la banda roja de atrás de un coche: [faro de z < 0, faro de z > 0, pilotos]. */
export function lucesDelCoche(emisivo: GeometriaVolcada, local: (p: Punto) => Punto): Punto[] {
  const pos = emisivo.datos.get('position');
  const tipo = emisivo.datos.get('aEmisor');
  const color = emisivo.datos.get('color');
  if (pos === undefined || tipo === undefined || color === undefined) return [];
  const grupos: { suma: Punto; n: number }[] = [
    { suma: [0, 0, 0], n: 0 },
    { suma: [0, 0, 0], n: 0 },
    { suma: [0, 0, 0], n: 0 },
  ];
  for (let v = 0; v < pos.length / 3; v++) {
    const [x, y, z] = local([pos[v * 3] as number, pos[v * 3 + 1] as number, pos[v * 3 + 2] as number]);
    const t = tipo[v * 2] as number;
    const rojo = (color[v * 3] as number) > 4 * (color[v * 3 + 1] as number) && (color[v * 3] as number) > 0.05;
    const g = t > 3.5 ? (z < 0 ? 0 : 1) : rojo && x < 0 ? 2 : -1;
    if (g < 0) continue;
    const grupo = grupos[g] as { suma: Punto; n: number };
    grupo.suma[0] += x;
    grupo.suma[1] += y;
    grupo.suma[2] += z;
    grupo.n++;
  }
  return grupos.map((g): Punto => (g.n === 0 ? [Number.NaN, Number.NaN, Number.NaN] : [g.suma[0] / g.n, g.suma[1] / g.n, g.suma[2] / g.n]));
}

/** Lo que se mueve más de `tolerancia` entre los grados de un coche (las luces de cada grado contra las de g1). */
export function juzgarLasLuces(porGrado: readonly Punto[][], tolerancia = 0.01): string[] {
  const problemas: string[] = [];
  const base = porGrado[0] as Punto[];
  const nombre = ['el faro de la izquierda', 'el faro de la derecha', 'los pilotos'];
  porGrado.forEach((luces, g) => {
    luces.forEach((p, i) => {
      const q = base[i] as Punto;
      const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      if (!(d <= tolerancia)) problemas.push(`${String(nombre[i])} de g${String(g + 1)} está a ${(d * 100).toFixed(1)} cm del de g1`);
    });
  });
  return problemas;
}

function luces(): Resultado {
  const problemas: string[] = [];
  let mirados = 0;
  for (const carroceria of CARROCERIAS) {
    const c = cocheDePrueba(carroceria, cajaDeCoche(3, 5, 'o'), 'o');
    const inversa = matrizDelCoche(c).invert();
    const local = (p: Punto): Punto => {
      const v = new THREE.Vector3(...p).applyMatrix4(inversa);
      return [v.x, v.y, v.z];
    };
    const porGrado = GRADOS_DEL_COCHE.map((g) => lucesDelCoche(escrito(c, g).m.emisivo.volcar(), local));
    mirados += porGrado.reduce((s, l) => s + l.filter((p) => Number.isFinite(p[0])).length, 0);
    problemas.push(...juzgarLasLuces(porGrado).map((p) => `${carroceria}: ${p}`));
    /* La vacuna: el faro de g4 adelantado 3 cm. */
    const movido = porGrado.map((l, g) => (g === 3 ? l.map((p, i): Punto => (i === 0 ? [p[0] + 0.03, p[1], p[2]] : p)) : l));
    if (juzgarLasLuces(movido).length === 0) problemas.push(`vacuna (${carroceria}): un faro de g4 adelantado 3 cm no sale: el juez no mira`);
  }
  return { que: '(f) faros y pilotos de cada carrocería en el mismo sitio en los cuatro grados, a ±1 cm (y uno adelantado 3 cm, no)', bien: problemas.length === 0, detalle: problemas.slice(0, 8), inspeccionados: mirados, minimo: 5 * 4 * 3 };
}

/* ═══════════════════════════════ (g) LA FRANJA DE LUZ DEL ELEVADO ═══════════════════════════════ */

/** Lo que cubre la franja de luz a cada lado del tramo (en fracción de su largo), mirando lo emisivo a su altura. */
export function franjaDelTramo(emisivo: GeometriaVolcada, t: TramoDeViaducto): [number, number] {
  const s = seccionDelViaducto(1, t.alto);
  const [f0, f1] = s.franja;
  const cubre: [number, number][][] = [[], []];
  for (const ps of triangulosDe(emisivo)) {
    if (!ps.every((p) => p[1] >= t.alto + f0 - 0.02 && p[1] <= t.alto + f1 + 0.02)) continue;
    const trav = ps.map((p) => (t.eje === 'x' ? p[2] : p[0]) - t.linea);
    const lado = trav.every((q) => q > s.medioAncho - 0.05) ? 1 : trav.every((q) => q < -s.medioAncho + 0.05) ? 0 : -1;
    if (lado < 0) continue;
    const a = ps.map((p) => (t.eje === 'x' ? p[0] : p[2]));
    (cubre[lado] as [number, number][]).push([Math.min(...a), Math.max(...a)]);
  }
  const fraccion = (tramos: [number, number][]): number => {
    tramos.sort((p, q) => p[0] - q[0]);
    let hasta = t.desde;
    let cubierto = 0;
    for (const [p0, p1] of tramos) {
      const i0 = Math.max(p0, hasta);
      const i1 = Math.min(p1, t.hasta);
      if (i1 > i0) cubierto += i1 - i0;
      hasta = Math.max(hasta, p1);
    }
    return cubierto / Math.max(t.hasta - t.desde, 1e-6);
  };
  return [fraccion(cubre[0] as [number, number][]), fraccion(cubre[1] as [number, number][])];
}

function franja(ctx: ContextoDeLaCiudad): Resultado {
  const problemas: string[] = [];
  let mirados = 0;
  const trazas = Math.min(ctx.trazas, 3);
  for (let traza = 0; traza < trazas; traza++) {
    const b = ctx.base(traza);
    for (const parte of b.partes.celdas) {
      const t = parte.viaducto;
      if (t === null || t.hasta - t.desde < 0.5) continue;
      for (const [nivel, grado] of DETALLES_DEL_VIADUCTO) {
        const m = moldesDeLaObra(true);
        const obra = obraNueva({ nivel, grado, relieveDeHoy: false, ciudad: b.partes, m });
        for (const _ of viaducto(obra, { tramo: t, pilares: parte.pilares })) {
          /* de un tirón */
        }
        const [izquierda, derecha] = franjaDelTramo(m.emisivo.volcar(), t);
        mirados++;
        if ((izquierda < 0.999 || derecha < 0.999) && problemas.length < 6) {
          problemas.push(`traza ${String(traza)}, celda ${String(parte.indice)}, N${String(nivel)} g${String(grado)}: la franja cubre ${(izquierda * 100).toFixed(1)} % y ${(derecha * 100).toFixed(1)} % del tramo`);
        }
      }
    }
  }
  /* La vacuna: el tramo sin su franja (lo emisivo vacío). */
  const vacio = new Molde(ATRIBUTOS_DE_LO_EMISIVO, true).volcar();
  const [vi, vd] = franjaDelTramo(vacio, { eje: 'x', linea: 0, desde: 0, hasta: 48, alto: 7.5 });
  if (vi > 0 || vd > 0) problemas.push('vacuna: un tramo sin franja sale cubierto: el juez no mira');
  return { que: '(g) la franja de luz del Elevado, por los dos lados, de punta a punta de cada tramo, en cada nivel y grado (y sin ella, no)', bien: problemas.length === 0, detalle: problemas, inspeccionados: mirados, minimo: 30 };
}

/* ═══════════════════════════════ (h) EL TOPE Y LOS PASOS DE CADA COCHE ═══════════════════════════════ */

/** En cuántas cesiones escribe un coche de cada grado (la ficha de O2-VEHICULOS): g1 y g2 en una, g3 en dos, g4 en cuatro. */
const CESIONES_DEL_GRADO: Readonly<Record<GradoDelCoche, number>> = { 1: 1, 2: 1, 3: 2, 4: 4 };

function topes(): Resultado {
  const problemas: string[] = [];
  let mirados = 0;
  const filas: string[] = [];
  for (const carroceria of CARROCERIAS) {
    const fila: string[] = [];
    for (const grado of GRADOS_DEL_COCHE) {
      const c = cocheDePrueba(carroceria, cajaDeCoche(0, 0, 'e'), 'e');
      const { m, pasos } = escrito(c, grado);
      mirados++;
      const tope = topeDelCoche(carroceria, grado);
      const trozo = grado === 1 ? 600 : 1000;
      const mayor = Math.max(...pasos);
      /* `escrito` apunta también lo que va después de la última cesión (cero si el coche acaba cediendo). */
      const cesiones = pasos.length - 1;
      fila.push(`g${String(grado)} ${String(m.mobiliario.triangulos)}/${String(tope)} (+${String(m.cristal.triangulos)} cristal, +${String(m.emisivo.triangulos)} emisivo; ${String(cesiones)} cesiones, el paso mayor ${String(mayor)})`);
      if (m.mobiliario.triangulos > tope) problemas.push(`${carroceria} g${String(grado)}: ${String(m.mobiliario.triangulos)} triángulos de mobiliario > ${String(tope)}`);
      if (mayor > trozo) problemas.push(`${carroceria} g${String(grado)}: un paso de ${String(mayor)} triángulos > el trozo de ${String(trozo)}`);
      if (cesiones !== CESIONES_DEL_GRADO[grado]) problemas.push(`${carroceria} g${String(grado)}: cede ${String(cesiones)} veces, y la ficha dice ${String(CESIONES_DEL_GRADO[grado])}`);
    }
    filas.push(`${carroceria}: ${fila.join(' · ')}`);
  }
  return { que: '(h) cada coche cabe en el tope de su grado y cede en sus pasos (1, 1, 2 y 4), que caben en el trozo', bien: problemas.length === 0, detalle: problemas.length > 0 ? problemas : filas, inspeccionados: mirados, minimo: 20 };
}

/* ═══════════════════════════════ TODO ═══════════════════════════════ */

export const comprobar: ComprobarElPaquete = (ctx) => {
  const salida = [envolvente(), coplanarias(), pilarEnSuCaja(), temblor(), nombres(), luces(), franja(ctx), topes()];
  for (const r of salida) if (r.que.startsWith('(h)') && r.bien) for (const fila of r.detalle as string[]) ctx.nota(`vehículos · ${fila}`);
  return salida;
};
