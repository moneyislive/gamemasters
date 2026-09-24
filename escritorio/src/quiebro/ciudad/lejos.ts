/**
 * LO LEJANO DE LA CIUDAD ABIERTA (§5.7 de `docs/quiebro/CIUDAD-ABIERTA.md`): detrás de la ventana de
 * celdas, la ciudad ENTERA en LOD1 y el suelo entero, siempre, en tres llamadas.
 *
 * ═══ LA LOD1: VOLÚMENES CON LAS VENTANAS DEL SOMBREADOR ═══
 *
 * Todos los edificios de la ciudad, los de la fila del cerco y las torres de detrás, como sus volúmenes
 * sin relieve (sin cornisas, balcones ni azoteas) y con el MISMO sombreador de fachada que el detalle: las
 * ventanas, las tiendas, las medianeras y la luz de la calle salen igual, así que un edificio que pasa de
 * lo lejano a la ventana no cambia de cara, sólo gana su relieve. Con ellos va la viga y los pilares del
 * Elevado, que se ve de una punta a otra de la ciudad (§2.7). Una llamada.
 *
 * Cada vértice lleva su celda (`aCeldaQ`): lo que cae dentro de la ventana se TIRA en el sombreador de
 * vértices (se manda fuera del volumen de recorte), así que dentro de la ventana no se pinta dos veces.
 * Desde N1, en la franja de 12 m del borde de la ventana, el detalle y la LOD1 se FUNDEN CON TRAMADO: los
 * dos se pintan y cada píxel lo pone uno u otro según una trama de Bayer de 4 × 4 (`tramaQ`) y lo cerca
 * que esté del borde. Son tramas complementarias: ningún píxel se pinta dos veces ni se queda sin pintar,
 * y al moverse la ventana lo que entra o sale lo hace en la niebla y a trozos, no de golpe. En N0 no hay
 * fundido: un `discard` en el sombreador de las fachadas le quita al teléfono modesto el rechazo temprano
 * por profundidad, y la franja cae a más de 40 m, dentro de la niebla.
 *
 * ═══ EL SUELO ENTERO ═══
 *
 * La calzada y las islas (aceras, plazas, medianas) de toda la ciudad y de lo de detrás del cerco, con los
 * sombreadores de siempre (`suelo.ts`): dos llamadas, y unos pocos miles de triángulos. Con él, sus dos
 * mapas de toda la ciudad (el de alturas, para posar tarjetas, salpicaduras y pies; y el de oclusión, el
 * pie de las fachadas y el hueco bajo los coches), a dos téxeles por metro.
 */
import * as THREE from 'three';
import type { Retoque } from '../atmosfera/parcheo';
import { parchear } from '../atmosfera/parcheo';
import type { CajaDeLaCiudad, NocheDeLaCiudad } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import { ACERA_DE_AVENIDA, BORDE_DE_LA_CIUDAD, EJES_DE_LA_CIUDAD, MEDIANA_DE_AVENIDA, SALIDA_DE_GLIFOS } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import type { CajaXZ, CalleDelPlano, NivelDeLaCiudad } from './tipos';
import { Molde, triangulosDe } from './geometria';
import { ATRIBUTOS_DE_LA_FACHADA, cajaDeRelieve, escribirLasFachadas, materialDeFachada } from './fachadas';
import type { IslaDelSuelo } from './suelo';
import { construirElSuelo } from './suelo';
import type { Oclusor } from './luz-de-la-calle';
import { mapaDeAlturas, mapaDeOclusionAPasos } from './luz-de-la-calle';
import type { MapaDeAlturas } from './luz-de-la-calle';
import type { PartesDeLaCiudad } from './celdas';
import type { AnilloDeLaCiudad } from './anillo-de-la-ciudad';
import { UNIFORMES_DE_LA_VENTANA } from './ventana';
import type { SalidaDeAvenida } from './sintetica';

/* ═══════════════════════════════ EL FUNDIDO ═══════════════════════════════ */

/** La celda de lo que no entra nunca en la ventana (las torres de detrás). */
const NUNCA = 99;

/** Lo de la trama y la franja: lo usan el detalle y la LOD1, con la misma cuenta. */
const GLSL_DEL_FUNDIDO = /* glsl */ `
uniform vec4 uVentanaQ;
uniform float uFundidoQ;
const float TRAMA_Q[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
float tramaQ(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  return (TRAMA_Q[x + 4 * y] + 0.5) / 16.0;
}
/* 0 dentro de la ventana, 1 fuera, y en la franja del borde de 0 a 1. */
float fundidoQ(vec2 xz) {
  float d = min(min(xz.x - uVentanaQ.x, uVentanaQ.z - xz.x), min(xz.y - uVentanaQ.y, uVentanaQ.w - xz.y));
  return 1.0 - clamp(d / max(uFundidoQ, 1e-3), 0.0, 1.0);
}
`;

/**
 * EL FUNDIDO DEL DETALLE (N1+): en la franja del borde, el píxel se lo queda la LOD1 donde la trama es
 * menor que lo cerca que está del borde. Para las fachadas y el mobiliario de la ventana.
 */
export const RETOQUE_DEL_FUNDIDO: Retoque = {
  nombre: 'fundido-detalle',
  orden: 5,
  uniformes: { uVentanaQ: UNIFORMES_DE_LA_VENTANA.uVentanaQ, uFundidoQ: UNIFORMES_DE_LA_VENTANA.uFundidoQ },
  fragmento: [
    { buscar: '#include <common>', como: 'despues', texto: GLSL_DEL_FUNDIDO },
    { buscar: '#include <clipping_planes_fragment>', como: 'despues', texto: 'if (tramaQ(gl_FragCoord.xy) < fundidoQ(vPosMundoQ.xz)) discard;' },
  ],
};

/** LO LEJANO: se tira en el vértice lo de las celdas de dentro, y (N1+) se funde en la franja con la trama opuesta. */
function retoqueDeLoLejano(fundido: boolean): Retoque {
  return {
    nombre: `lejos-${fundido ? 'fundido' : 'seco'}`,
    orden: 5,
    uniformes: {
      uVentanaQ: UNIFORMES_DE_LA_VENTANA.uVentanaQ,
      uFundidoQ: UNIFORMES_DE_LA_VENTANA.uFundidoQ,
      uCeldasSinLejosQ: UNIFORMES_DE_LA_VENTANA.uCeldasSinLejosQ,
    },
    vertice: [
      { buscar: '#include <common>', como: 'despues', texto: 'attribute vec2 aCeldaQ;\nuniform vec4 uCeldasSinLejosQ;' },
      {
        buscar: '#include <project_vertex>',
        como: 'despues',
        texto:
          'if (aCeldaQ.x >= uCeldasSinLejosQ.x && aCeldaQ.x <= uCeldasSinLejosQ.z && aCeldaQ.y >= uCeldasSinLejosQ.y && aCeldaQ.y <= uCeldasSinLejosQ.w) gl_Position = vec4(0.0, 0.0, 2.0, 1.0);',
      },
    ],
    fragmento: fundido
      ? [
          { buscar: '#include <common>', como: 'despues', texto: GLSL_DEL_FUNDIDO },
          { buscar: '#include <clipping_planes_fragment>', como: 'despues', texto: 'if (tramaQ(gl_FragCoord.xy) >= fundidoQ(vPosMundoQ.xz)) discard;' },
        ]
      : [],
  };
}

/** El material de lo lejano: el de las fachadas del nivel, con su retoque. */
export function materialDeLoLejano(nivel: NivelDeLaCiudad, fundido: boolean): THREE.MeshStandardMaterial {
  const m = materialDeFachada(nivel);
  m.name = 'quiebro-lejos';
  parchear(m, retoqueDeLoLejano(fundido));
  return m;
}

/* ═══════════════════════════════ LA LOD1 ═══════════════════════════════ */

/** Los atributos de lo lejano: los de la fachada y la celda de cada vértice. */
export const ATRIBUTOS_DE_LO_LEJANO = { ...ATRIBUTOS_DE_LA_FACHADA, aCeldaQ: 2 } as const;

export interface LoLejano {
  readonly malla: THREE.Mesh;
  readonly triangulos: number;
  liberar(): void;
}

/** La geometría de la LOD1, sin su malla: no depende del nivel, y la comparten las ciudades de los cuatro. */
export interface GeometriaDeLoLejano {
  readonly geometria: THREE.BufferGeometry;
  readonly triangulos: number;
}

/**
 * LA LOD1 de una ciudad partida: todos los edificios de sus celdas (con su celda), la viga y los pilares
 * del Elevado, y las torres de detrás del cerco (que no entran nunca en la ventana).
 */
export function construirLoLejano(partes: PartesDeLaCiudad, anillo: AnilloDeLaCiudad, material: THREE.Material): LoLejano {
  const { geometria: g, triangulos } = geometriaDeLoLejano(partes, anillo);
  return {
    malla: mallaDeLoLejano(g, material),
    triangulos,
    liberar: () => g.dispose(),
  };
}

/** La malla de la LOD1 con el material de un nivel, sobre una geometría que no es suya (no la libera). */
export function mallaDeLoLejano(geometria: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const malla = new THREE.Mesh(geometria, material);
  malla.name = 'quiebro-lejos';
  malla.frustumCulled = false;
  malla.matrixAutoUpdate = false;
  return malla;
}

/**
 * La GEOMETRÍA de la LOD1 (unos 11-17 ms de PC: un tercio de lo que no depende del nivel al construir la
 * ciudad). Se hace una vez por ciudad, no por nivel: ver la base en `abierta.ts`.
 */
export function geometriaDeLoLejano(partes: PartesDeLaCiudad, anillo: AnilloDeLaCiudad): GeometriaDeLoLejano {
  const g = geometriaDeLoLejanoAPasos(partes, anillo);
  for (;;) {
    const r = g.next();
    if (r.done === true) return r.value;
  }
}

/** Cuántas celdas escribe cada paso de la LOD1 (unos 2-3 ms de PC). */
const CELDAS_DE_LO_LEJANO_POR_PASO = 24;

/**
 * La misma geometría A PASOS, para construir la base de otra noche sin parar el juego (ver `abierta.ts`):
 * las mismas celdas en el mismo orden, así que sale la misma geometría byte a byte.
 */
export function* geometriaDeLoLejanoAPasos(partes: PartesDeLaCiudad, anillo: AnilloDeLaCiudad): Generator<void, GeometriaDeLoLejano, void> {
  const m = new Molde(ATRIBUTOS_DE_LO_LEJANO);
  let escritas = 0;
  for (const p of partes.celdas) {
    if (++escritas % CELDAS_DE_LO_LEJANO_POR_PASO === 0) yield;
    m.poner('aCeldaQ', p.i, p.j);
    if (p.edificios.length > 0) escribirLasFachadas(m, p.edificios, { relieve: false, ventanas: false, vecinos: p.vecinos });
    const v = p.viaducto;
    if (v !== null) {
      const [x0, x1, z0, z1] = v.eje === 'x' ? [v.desde, v.hasta, v.linea - 1.9, v.linea + 1.9] : [v.linea - 1.9, v.linea + 1.9, v.desde, v.hasta];
      cajaDeRelieve(m, x0, v.alto, z0, x1, v.alto + 1.45, z1, 'hormigon', v.eje === 'x' ? 'nsab' : 'eoab');
    }
    for (const pi of p.pilares) cajaDeRelieve(m, pi.x0, 0, pi.z0, pi.x1, v?.alto ?? 7.5, pi.z1, 'hormigon', 'nseo');
  }
  yield;
  m.poner('aCeldaQ', NUNCA, NUNCA);
  escribirLasFachadas(m, anillo.lejanos, { relieve: false, ventanas: false });
  const g = m.geometria();
  return { geometria: g, triangulos: triangulosDe(g) };
}

/* ═══════════════════════════════ EL SUELO ENTERO ═══════════════════════════════ */

export interface SueloDeLaCiudad {
  readonly asfalto: THREE.BufferGeometry;
  readonly islas: THREE.BufferGeometry;
  /** Las islas, en planta (el mapa de alturas). */
  readonly cajasDeLasIslas: readonly CajaXZ[];
  readonly extension: CajaXZ;
}

/** Las calles del suelo: las del pintor y, en cada salida, la avenida 20 m más allá del borde. */
function callesDelSuelo(calles: readonly CalleDelPlano[], salidas: readonly SalidaDeAvenida[]): CalleDelPlano[] {
  return calles.map((c) => {
    let desde = c.desde;
    let hasta = c.hasta;
    for (const s of salidas) {
      if (s.eje !== c.corre || Math.abs(c.en - s.linea) > 13) continue;
      if (s.sentido < 0 && Math.abs(c.desde + BORDE_DE_LA_CIUDAD) < 0.01) desde = -BORDE_DE_LA_CIUDAD - SALIDA_DE_GLIFOS;
      if (s.sentido > 0 && Math.abs(c.hasta - BORDE_DE_LA_CIUDAD) < 0.01) hasta = BORDE_DE_LA_CIUDAD + SALIDA_DE_GLIFOS;
    }
    return { ...c, desde, hasta };
  });
}

/**
 * LAS ISLAS DE LA CIUDAD: cada hueco con su acera (de 3 m, o de 4 en el lado de una avenida, que es donde
 * su solar se come 6 m), las medianas de las avenidas (cortadas en los cruces) y, en las salidas, las
 * aceras y la mediana de la avenida hasta donde se deshace.
 */
function islasDeLaCiudad(noche: NocheDeLaCiudad, salidas: readonly SalidaDeAvenida[]): IslaDelSuelo[] {
  const islas: IslaDelSuelo[] = [];
  for (const h of noche.ciudad.huecos) {
    const s = h.solar;
    const ci = 48 * h.i;
    const cj = 48 * h.j;
    const acera = (lado: number, normal: number): number => (Math.abs(lado - normal) > 0.5 ? ACERA_DE_AVENIDA : 3);
    const caja = {
      x0: s.x0 - acera(s.x0, ci - 18),
      x1: s.x1 + acera(s.x1, ci + 18),
      z0: s.z0 - acera(s.z0, cj - 18),
      z1: s.z1 + acera(s.z1, cj + 18),
    };
    islas.push({ caja, tipo: h.uso === 'plaza' ? 'plaza' : 'acera', manzana: s });
  }
  const medio = MEDIANA_DE_AVENIDA / 2;
  for (const a of noche.ciudad.avenidas) {
    /* La mediana, de cruce a cruce: los ejes de la rejilla la cortan (la calzada de la calle que cruza). */
    const cortes = [a.desde, ...EJES_DE_LA_CIUDAD.filter((e) => e > a.desde + 0.5 && e < a.hasta - 0.5), a.hasta];
    for (const s of salidas) {
      if (s.eje !== a.eje || s.linea !== a.linea) continue;
      if (s.sentido > 0) cortes[cortes.length - 1] = a.hasta + SALIDA_DE_GLIFOS;
      else cortes[0] = a.desde - SALIDA_DE_GLIFOS;
    }
    for (let k = 0; k < cortes.length - 1; k++) {
      const p0 = (cortes[k] as number) + (k === 0 && Math.abs(a.desde) < BORDE_DE_LA_CIUDAD - 1 ? 12 : k === 0 ? 0 : 3);
      const p1 = (cortes[k + 1] as number) - (k === cortes.length - 2 ? 0 : 3);
      if (p1 - p0 < 1) continue;
      const caja = a.eje === 'x' ? { x0: p0, z0: a.linea - medio, x1: p1, z1: a.linea + medio } : { x0: a.linea - medio, z0: p0, x1: a.linea + medio, z1: p1 };
      const c = { x: (caja.x0 + caja.x1) / 2, z: (caja.z0 + caja.z1) / 2 };
      islas.push({ caja, tipo: 'acera', manzana: { x0: c.x, z0: c.z, x1: c.x, z1: c.z } });
    }
  }
  /* Las aceras de la avenida en su salida, del borde hasta donde se deshace. */
  for (const s of salidas) {
    const d0 = s.sentido > 0 ? BORDE_DE_LA_CIUDAD - 3 : -BORDE_DE_LA_CIUDAD - SALIDA_DE_GLIFOS;
    const d1 = s.sentido > 0 ? BORDE_DE_LA_CIUDAD + SALIDA_DE_GLIFOS : -BORDE_DE_LA_CIUDAD + 3;
    for (const lado of [-1, 1]) {
      const b0 = s.linea + lado * (12 - ACERA_DE_AVENIDA);
      const b1 = s.linea + lado * 12;
      const [c0, c1] = b0 < b1 ? [b0, b1] : [b1, b0];
      const caja = s.eje === 'x' ? { x0: d0, z0: c0, x1: d1, z1: c1 } : { x0: c0, z0: d0, x1: c1, z1: d1 };
      const c = { x: (caja.x0 + caja.x1) / 2, z: (caja.z0 + caja.z1) / 2 };
      islas.push({ caja, tipo: 'acera', manzana: { x0: c.x, z0: c.z, x1: c.x, z1: c.z } });
    }
  }
  return islas;
}

/** EL SUELO DE TODA LA CIUDAD y de lo de detrás del cerco: calzada e islas, en dos geometrías. */
export function construirElSueloDeLaCiudad(noche: NocheDeLaCiudad, partes: PartesDeLaCiudad, anillo: AnilloDeLaCiudad): SueloDeLaCiudad {
  const islas: IslaDelSuelo[] = [...islasDeLaCiudad(noche, partes.salidas), ...anillo.islas.map((i) => ({ caja: i.caja, tipo: 'acera' as const, manzana: i.manzana }))];
  const suelo = construirElSuelo(islas, callesDelSuelo(partes.calles, partes.salidas), anillo.extension);
  return { asfalto: suelo.asfalto, islas: suelo.islas, cajasDeLasIslas: islas.map((i) => i.caja), extension: anillo.extension };
}

/* ═══════════════════════════════ LOS MAPAS DEL SUELO ═══════════════════════════════ */

/** Lo que cubren los mapas de alturas y de oclusión: la ciudad y la fila del cerco. */
export const CAJA_DE_LOS_MAPAS: CajaXZ = { x0: -300, z0: -300, x1: 300, z1: 300 };

/** El mapa de alturas de toda la ciudad (0 calzada, el bordillo en las islas). */
export function alturasDeLaCiudad(suelo: SueloDeLaCiudad): MapaDeAlturas {
  return mapaDeAlturas(suelo.cajasDeLasIslas, CAJA_DE_LOS_MAPAS);
}

/**
 * La oclusión del suelo de toda la ciudad, con las mismas fuerzas que el barrio: el pie de cada edificio,
 * el hueco bajo coches, bancos, quioscos, cabinas y farolas.
 */
export function oclusionDeLaCiudad(noche: NocheDeLaCiudad, anillo: AnilloDeLaCiudad): MapaDeAlturas {
  const g = oclusionDeLaCiudadAPasos(noche, anillo);
  for (;;) {
    const r = g.next();
    if (r.done === true) return r.value;
  }
}

/** La misma oclusión A PASOS (unos 25 ms de PC de una vez; ver `mapaDeOclusionAPasos`). */
export function* oclusionDeLaCiudadAPasos(noche: NocheDeLaCiudad, anillo: AnilloDeLaCiudad): Generator<void, MapaDeAlturas, void> {
  const oclusores: Oclusor[] = [];
  const porTipo = (c: CajaDeLaCiudad): Oclusor | null => {
    const caja = { x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1 };
    if (c.tipo === 'edificio' || c.tipo === 'pilar-de-soportal' || c.tipo === 'fachada-exterior') return { caja, fuerza: 0.55, alcance: 1.6, debajo: 0.3 };
    if (c.tipo === 'coche') return { caja, fuerza: 0.6, alcance: 0.7, debajo: 0.25 };
    return { caja, fuerza: 0.5, alcance: 0.7, debajo: 0.4 };
  };
  for (const c of noche.cajas) {
    const o = porTipo(c);
    if (o !== null) oclusores.push(o);
  }
  for (const lista of anillo.porCelda.values()) for (const e of lista) oclusores.push({ caja: e.caja, fuerza: 0.55, alcance: 1.6, debajo: 0.3 });
  return yield* mapaDeOclusionAPasos(oclusores, CAJA_DE_LOS_MAPAS);
}

