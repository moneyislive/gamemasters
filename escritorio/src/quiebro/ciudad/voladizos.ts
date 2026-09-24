/**
 * LOS VOLADIZOS: lo que cuelga por encima de la cabeza y llena una calle de verdad. Toldos sobre las
 * tiendas, aparatos de aire bajo algunas ventanas, escaleras de incendios en las fachadas de ladrillo,
 * cables que cruzan la calle de fachada a fachada y banderolas en las farolas.
 *
 * ═══ POR QUÉ ═══
 *
 * Las calles de las referencias de Miguel están llenas de cosas que no son ni suelo ni fachada: es lo
 * que les da escala y vida. Sin ellas, el barrio eran cajas con ventanas pintadas y una acera vacía.
 *
 * ═══ NO ESTORBAN, Y SON IGUALES PARA TODOS ═══
 *
 * Todo va por ENCIMA de la franja de andar (lo más bajo, el faldón de un toldo, a 2,3 m; el comprobador
 * de la ciudad mira de 0,2 a 1,9): no hay nada con qué chocar ni nada que el barrio tenga que declarar.
 * Sale de la semilla de cada fachada con las MISMAS cuentas que el sombreador (dónde cae cada hueco,
 * qué tienda es escaparate), así que un toldo no tapa media ventana ni cuelga sobre un portal, y dos
 * aparatos con el mismo barrio ven lo mismo. El nivel sólo quita: N0 lleva toldos, aparatos de aire (la
 * mitad) y banderolas; las escaleras de incendios y los cables, desde N1.
 *
 * Una llamada (su propia malla, con el material del mobiliario: color y acabado por vértice, la luz
 * horneada de la calle y el cielo falso reflejado, como un banco o una farola).
 */
import * as THREE from 'three';
import { Molde } from './geometria';
import type { V3 } from './geometria';
import { ACABADO, ATRIBUTOS_DEL_MOBILIARIO, lineal } from './materiales';
import { carasDeCalle } from './fachadas';
import type { CaraDeCalle } from './fachadas';
import { colocar } from './mobiliario';
import { LARGO_DE_UNA_TIENDA, queTienda } from './hash';
import { azarEn } from './azar';
import type { CajaXZ, CalleDelPlano, FarolaDelPlano, NivelDeLaCiudad, PlanoDeLaCiudad } from './tipos';
import { ALTURA_DE_LA_ACERA } from './tipos';

type Rgb = readonly [number, number, number];

/** Lonas de toldo: verde botella, granate, azul noche, mostaza vieja y gris. Apagadas: están mojadas. */
const LONAS: readonly Rgb[] = [0x23382d, 0x4a2023, 0x1f2a3a, 0x5e4a24, 0x383a37].map(lineal);
const BANDEROLAS: readonly Rgb[] = [0x1e4a3a, 0x5a1e2a, 0x7a5a1e, 0x1e2a4a].map(lineal);
const HIERRO_NEGRO: Rgb = lineal(0x141617);
const CHAPA_CLARA: Rgb = lineal(0x8a8c87);
const CHAPA_OSCURA: Rgb = lineal(0x5d5f5b);
const CABLE: Rgb = lineal(0x0e0f10);
const LONA: readonly [number, number] = [0.55, 0];

function tono(m: Molde, color: Rgb, acabado: readonly [number, number]): void {
  m.color(color[0], color[1], color[2]);
  m.poner('aAcabado', acabado[0], acabado[1]);
}

/** La `u` de una cara (desde su borde izquierdo mirándola) de un punto `a` del mundo a lo largo de ella. */
function uDe(c: CaraDeCalle, a: number): number {
  return c.mira === 'n' || c.mira === 'e' ? c.hasta - a : a - c.desde;
}

/** La matriz de una pieza pegada a la cara en `u`, a la altura `y`: +z sale de la fachada, +x a la derecha. */
function sobreLaCara(c: CaraDeCalle, u: number, y: number): THREE.Matrix4 {
  const [x, z] = c.punto(u);
  return colocar(x, y, z, c.mira);
}

/** Un triángulo por las dos caras (los costados del toldo). */
function trianguloDoble(m: Molde, a: V3, b: V3, c: V3, n: V3): void {
  const i = m.vertice(a[0], a[1], a[2], n[0], n[1], n[2], 0, 0);
  const j = m.vertice(b[0], b[1], b[2], n[0], n[1], n[2], 1, 0);
  const k = m.vertice(c[0], c[1], c[2], n[0], n[1], n[2], 1, 1);
  m.tri(i, j, k);
  const i2 = m.vertice(a[0], a[1], a[2], -n[0], -n[1], -n[2], 0, 0);
  const j2 = m.vertice(b[0], b[1], b[2], -n[0], -n[1], -n[2], 1, 0);
  const k2 = m.vertice(c[0], c[1], c[2], -n[0], -n[1], -n[2], 1, 1);
  m.tri(i2, k2, j2);
}

/**
 * UN TOLDO en coordenadas de la cara: la lona baja desde el muro (a `alto`) hasta 1,3 m fuera, 0,75 m
 * más abajo, con un faldón de 25 cm delante. Lo más bajo queda a 2,3 m.
 */
function toldo(m: Molde, medio: number, alto: number): void {
  const fuera = 1.3;
  const caida = 0.75;
  const faldon = 0.25;
  const yf = alto - caida;
  const l = Math.hypot(fuera, caida);
  const nArriba: V3 = [0, fuera / l, caida / l];
  m.quad([-medio, yf, fuera], [medio, yf, fuera], [medio, alto, 0.02], [-medio, alto, 0.02], nArriba, [0, 0, 1, 0, 1, 1, 0, 1]);
  m.quad([-medio, alto - 0.03, 0.02], [medio, alto - 0.03, 0.02], [medio, yf - 0.03, fuera - 0.02], [-medio, yf - 0.03, fuera - 0.02], [0, -nArriba[1], -nArriba[2]], [0, 0, 1, 0, 1, 1, 0, 1]);
  m.muro(-medio, fuera, medio, fuera, yf - faldon, yf);
  m.muro(medio, fuera - 0.02, -medio, fuera - 0.02, yf - faldon, yf);
  for (const s of [-1, 1]) {
    trianguloDoble(m, [s * medio, alto, 0.02], [s * medio, yf, fuera], [s * medio, yf - faldon, fuera], [s, 0, 0]);
  }
}

/** Una caja por centro y medidas, en coordenadas locales. */
function bloque(m: Molde, cx: number, y0: number, cz: number, ax: number, alto: number, az: number, caras = 'nseoab'): void {
  m.caja(cx - ax / 2, y0, cz - az / 2, cx + ax / 2, y0 + alto, cz + az / 2, caras);
}

/**
 * UNA ESCALERA DE INCENDIOS en coordenadas de la cara, centrada en x = 0: un descansillo de rejilla
 * por planta (de `ancho` × 0,95 m), su barandilla (pasamanos, larguero y tres montantes), el tramo que
 * sube en diagonal al descansillo de arriba y, en el primero, la escala plegada que baja hasta 2,6 m.
 */
function escaleraDeIncendios(m: Molde, base: THREE.Matrix4, ancho: number, suelos: readonly number[]): void {
  const medio = ancho / 2;
  const fondo = 0.95;
  m.con(base, () => {
    for (const y of suelos) {
      bloque(m, 0, y - 0.06, fondo / 2 + 0.04, ancho, 0.06, fondo, 'nseoab');
      /* La barandilla: delante y en los dos costados. */
      bloque(m, 0, y + 0.95, fondo + 0.02, ancho, 0.035, 0.035, 'saob');
      bloque(m, 0, y + 0.45, fondo + 0.02, ancho, 0.025, 0.025, 'saob');
      for (const x of [-medio + 0.02, 0, medio - 0.02]) bloque(m, x, y, fondo + 0.02, 0.03, 0.95, 0.03, 'seo');
      for (const s of [-1, 1]) bloque(m, s * (medio - 0.02), y + 0.95, fondo / 2 + 0.04, 0.03, 0.035, fondo, 'eoa');
    }
  });
  /* Los tramos: de cada descansillo al de arriba, en diagonal, pegados al muro. */
  for (let i = 0; i + 1 < suelos.length; i++) {
    const y0 = suelos[i] as number;
    const y1 = suelos[i + 1] as number;
    const x0 = -medio + 0.5;
    const x1 = medio - 0.9;
    const largo = Math.hypot(x1 - x0, y1 - y0);
    const angulo = Math.atan2(y1 - y0, x1 - x0);
    const tramo = base.clone().multiply(new THREE.Matrix4().makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, 0.42).multiply(new THREE.Matrix4().makeRotationZ(angulo)));
    /* El tramo: la zanca de fuera (20 cm), los peldaños como una lámina fina, y el pasamanos. Con una
       losa ancha y un panel de 80 cm, de cerca era una rampa negra en zigzag. */
    m.con(tramo, () => {
      bloque(m, 0, -0.02, 0, largo, 0.035, 0.5, 'ab');
      bloque(m, 0, -0.12, 0.26, largo, 0.2, 0.025, 'sna');
      bloque(m, 0, 0.82, 0.26, largo, 0.03, 0.03, 'sab');
    });
  }
  /* La escala plegada del primer descansillo. */
  const primero = suelos[0];
  if (primero !== undefined) {
    m.con(base, () => {
      for (const x of [medio - 0.55, medio - 0.15]) bloque(m, x, 2.6, fondo - 0.05, 0.03, primero - 2.6, 0.03, 'nseo');
    });
  }
}

export interface OpcionesDeLosVoladizos {
  readonly escaleras: boolean;
  readonly cables: boolean;
  /** De cada cuántos aparatos de aire que la regla pondría, cuántos (0-1). */
  readonly aires: number;
}

export function opcionesDeLosVoladizos(nivel: NivelDeLaCiudad): OpcionesDeLosVoladizos {
  return nivel === 0 ? { escaleras: false, cables: false, aires: 0.5 } : { escaleras: true, cables: true, aires: 1 };
}

/** ESCRIBE LOS VOLADIZOS del barrio para un nivel. Devuelve su molde (color y acabado por vértice). */
export function escribirLosVoladizos(plano: PlanoDeLaCiudad, nivel: NivelDeLaCiudad): Molde {
  const o = opcionesDeLosVoladizos(nivel);
  const m = new Molde(ATRIBUTOS_DEL_MOBILIARIO, true);
  for (const _ of voladizosDeLasCaras(m, carasDeCalle(plano.edificios), o)) {
    /* de un tirón */
  }
  if (o.cables) {
    /* Un cable sólo se cuelga entre dos fachadas: en un cruce o junto a la plaza quedaría en el aire. */
    const hayFachada = (x: number, z: number): boolean =>
      plano.edificios.some((ed) => {
        const h = ed.huella;
        return Math.hypot(Math.max(h.x0 - x, 0, x - h.x1), Math.max(h.z0 - z, 0, z - h.z1)) < 1.2;
      });
    const sinTren = plano.calles.filter((calle) => !(plano.tren !== null && plano.tren.eje === calle.corre && Math.abs(plano.tren.linea - calle.en) < calle.calzada));
    escribirLosCables(m, cablesDeLasCalles(sinTren, plano.limite, plano.semilla, hayFachada));
  }
  escribirLasBanderolas(m, plano.farolas, plano.semilla);
  return m;
}

/**
 * LO QUE CUELGA DE LAS CARAS DE CALLE (toldos, aparatos de aire, escaleras de incendios), cediendo el
 * paso después de cada cara: una escalera de incendios de diez plantas son más de mil triángulos.
 */
export function* voladizosDeLasCaras(m: Molde, caras: readonly CaraDeCalle[], o: OpcionesDeLosVoladizos): Generator<void, void, void> {
  for (const c of caras) {
    const e = c.edificio;
    const ancho = c.hasta - c.desde;
    /* ─── Toldos: sobre un escaparate de cada dos, y sobre alguna persiana. Sólo en la planta baja. ─── */
    if (c.indice === 0 && c.bajo === 'tiendas') {
      const nT = Math.max(1, Math.floor(ancho / LARGO_DE_UNA_TIENDA));
      for (let t = 0; t < nT; t++) {
        const cual = queTienda(t, c.semilla, false);
        const h = azarEn(c.semilla, t, 0x701d);
        if (!((cual === 1 && h < 0.55) || (cual === 0 && h < 0.2))) continue;
        const t0 = t * LARGO_DE_UNA_TIENDA;
        const t1 = t === nT - 1 ? ancho : t0 + LARGO_DE_UNA_TIENDA;
        const a = c.desde + (t0 + t1) / 2;
        if (c.tapado(a, 2)) continue;
        const lona = LONAS[Math.floor(azarEn(c.semilla, t, 0x10a) * LONAS.length)] as Rgb;
        tono(m, lona, LONA);
        m.con(sobreLaCara(c, uDe(c, a), 0), () => toldo(m, (t1 - t0) / 2 - 0.45, e.plantaBaja - 1.2));
      }
    }
    if (c.indice === 0) {
      yield;
      continue;
    }
    /* ─── Aparatos de aire bajo alguna ventana (no en el vidrio: allí es un muro cortina). ─── */
    if (e.estilo !== 'vidrio') {
      tono(m, CHAPA_CLARA, ACABADO.chapa);
      c.huecos((celda, planta, u, _y, ySuelo) => {
        if (planta > 7) return;
        const h = azarEn(c.semilla, celda, planta, 0xa17e);
        if (h > 0.1 * o.aires) return;
        tono(m, h < 0.05 * o.aires ? CHAPA_CLARA : CHAPA_OSCURA, ACABADO.chapa);
        m.con(sobreLaCara(c, u, ySuelo - 0.62), () => bloque(m, 0, 0, 0.22, 0.78, 0.46, 0.42, 'seoab'));
      });
    }
    /* ─── Escaleras de incendios: en las fachadas de ladrillo que dan a la calle, una por cara. ─── */
    if (o.escaleras && e.estilo === 'ladrillo' && ancho >= 10 && c.y1 - c.y0 > 9) {
      const nV = Math.max(1, Math.floor(ancho / Math.max(e.vano, 0.5) + 0.5));
      const vano = ancho / nV;
      const celda = Math.max(1, Math.min(nV - 1, Math.floor(nV * (0.3 + 0.4 * azarEn(c.semilla, 0xe5c)))));
      const u = celda * vano;
      const suelos: number[] = [];
      for (let planta = 0; ; planta++) {
        const y = e.plantaBaja + planta * e.alturaDePlanta;
        if (y + e.alturaDePlanta > c.y1 + 0.01) break;
        if (y < c.y0 - 0.01) continue;
        suelos.push(y);
      }
      const a = c.mira === 'n' || c.mira === 'e' ? c.hasta - u : c.desde + u;
      if (suelos.length >= 2 && !c.tapado(a, e.plantaBaja + 1)) {
        tono(m, HIERRO_NEGRO, ACABADO.hierroViejo);
        escaleraDeIncendios(m, sobreLaCara(c, u, 0), Math.min(2 * vano - 0.3, 5.2), suelos);
      }
    }
    yield;
  }
}

/**
 * LOS CABLES DE FACHADA A FACHADA que cruzan las calles, como polilíneas: `hayFachada` dice si hay una
 * fachada a mano en cada punta (un cable no se cuelga del aire). Sale de la semilla y de la coordenada de
 * cada calle, así que la ciudad los calcula todos de una vez y cada celda pinta los suyos.
 */
export function cablesDeLasCalles(
  calles: readonly CalleDelPlano[],
  limite: CajaXZ,
  semilla: number,
  hayFachada: (x: number, z: number) => boolean,
): V3[][] {
  const salida: V3[][] = [];
  for (const calle of calles) {
    const medio = calle.calzada / 2 + calle.acera;
    const desde = Math.max(calle.desde, calle.corre === 'x' ? limite.x0 : limite.z0) + 8;
    const hasta = Math.min(calle.hasta, calle.corre === 'x' ? limite.x1 : limite.z1) - 8;
    let s = desde + azarEn(semilla, calle.en, 0xca) * 10;
    let k = 0;
    while (s < hasta) {
      const y0 = 6.5 + azarEn(semilla, calle.en, k, 1) * 2.5;
      const y1 = y0 + (azarEn(semilla, calle.en, k, 2) - 0.5) * 1.2;
      const sesgo = (azarEn(semilla, calle.en, k, 3) - 0.5) * 3;
      const inicio = s;
      const extremo = (t: number): readonly [number, number] => {
        const aa = inicio + sesgo * t;
        const bb = calle.en - medio + 2 * medio * t;
        return calle.corre === 'x' ? [aa, bb] : [bb, aa];
      };
      const [xa, za] = extremo(0);
      const [xb, zb] = extremo(1);
      if (!hayFachada(xa, za) || !hayFachada(xb, zb)) {
        s += 6;
        k++;
        continue;
      }
      const puntos: V3[] = [];
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const y = y0 + (y1 - y0) * t - 0.7 * 4 * t * (1 - t);
        const a = s + sesgo * t;
        const b = calle.en - medio + 2 * medio * t;
        puntos.push(calle.corre === 'x' ? [a, y, b] : [b, y, a]);
      }
      salida.push(puntos);
      s += 13 + azarEn(semilla, calle.en, k, 4) * 12;
      k++;
    }
  }
  return salida;
}

/** Escribe unos cables (polilíneas) como tubos finos. */
export function escribirLosCables(m: Molde, cables: readonly (readonly V3[])[]): void {
  tono(m, CABLE, ACABADO.caucho);
  for (const puntos of cables) m.tubo(puntos, 0.014, 3);
}

/** Las banderolas en las farolas de calle: una lona colgada del fuste, a 3-4,3 m. */
export function escribirLasBanderolas(m: Molde, farolas: readonly FarolaDelPlano[], semilla: number): void {
  for (const f of farolas) {
    if (f.brazo === null) continue;
    const h = azarEn(semilla, Math.round(f.x * 10), Math.round(f.z * 10), 0xba);
    if (h > 0.55) continue;
    tono(m, BANDEROLAS[Math.floor(h * 7.3) % BANDEROLAS.length] as Rgb, LONA);
    m.con(colocar(f.x, ALTURA_DE_LA_ACERA, f.z, f.brazo), () => {
      bloque(m, 0, 4.3, 0.3, 0.03, 0.03, 0.5, 'nseoab');
      m.muro(-0.005, 0.12, -0.005, 0.56, 3.1, 4.28);
      m.muro(0.005, 0.56, 0.005, 0.12, 3.1, 4.28);
    });
  }
}
