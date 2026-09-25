/**
 * EL COMPROBADOR DEL MOLDE: las primitivas de oficio de `ciudad/geometria.ts` (torno, caja biselada,
 * perfil suave, seccionado y perfil corrido), en Node, sin lienzo.
 *
 * ═══ QUÉ SE PRUEBA ═══
 *
 * Cada primitiva con tres juegos de datos (uno de ellos dentro de `con`, con una matriz de verdad), y en
 * cada uno:
 *
 *   · sin NaN, normales de largo 1 y ningún triángulo de área nula;
 *   · EL SENTIDO: el producto vectorial de cada triángulo va hacia su normal. Una cara al revés no la
 *     caza nada más en la ciudad (se pinta de una cara y desaparece sin fallar nada);
 *   · en las cerradas, que lo son de verdad (cada arista la usan dos triángulos, una en cada sentido) y
 *     que su volumen firmado es positivo: una pieza entera del revés tiene el sentido coherente y el
 *     volumen negativo;
 *   · UV en metros (cada arista mide en UV lo que mide en el mundo, hasta un factor 3) y seguidas (en
 *     una arista suave, los dos lados llevan la misma UV, salvo las costuras que la primitiva declara);
 *   · `MoldeQueNoGuarda` recorre lo mismo: las mismas llamadas a `vertice` y a `tri`;
 *   · el recuento es el de su fórmula (`triangulosDel…` de geometria.ts);
 *   · un triángulo que se pinta plano (sus tres normales iguales) lleva la normal de su plano;
 *   · en el seccionado (que suaviza en las dos direcciones a la vez, y es donde un punto puede salir con
 *     normales casi iguales), cada sitio lleva exactamente las normales de su regla, escrita aquí aparte
 *     (`normalesDeLaRegla`): grupos de caras unidas por aristas suaves, una normal por grupo.
 *
 * Además: lo de HOY (`caja`, `cilindro`, `tubo`, `perfil` sin `suave`, `muro`, `losa`, `quad`) escribe
 * byte a byte lo mismo que en d4402d0; un torno de dos puntos rectos es el `cilindro`; `alChaflan` marca
 * exactamente chaflanes y esquinas; la cornisa queda por fuera del edificio; una esquina de 90° del
 * seccionado sale redondeada sin declarar y con sus dos caras declarada; una unión suave lleva la
 * bisectriz (torno, perfil suave y perfil corrido); `lados` quita la franja pedida; y la `v` del torno
 * sigue por las uniones vivas.
 *
 * ═══ EL COSTE, CONTADO Y NO CRONOMETRADO ═══
 *
 * Con otros agentes en la máquina un cronómetro mide la máquina, no el código. Así que se CUENTA, por
 * triángulo: llamadas a `vertice`, productos de matriz (`applyMatrix4`, `applyMatrix3`,
 * `getNormalMatrix`), raíces (`Math.sqrt`, `Math.hypot`, que es lo que hacen los `normalize` de three) y
 * trigonometría, con la pieza puesta con `con` (como la ponen las celdas) y sin él. `TABLA_DE_COSTE` es
 * esa tabla ESCRITA, y se comprueba que es la contada: O4-CIERRE la usa para ajustar `porFotograma`
 * (`ventana.ts`) si alguna primitiva pasa de 1,5 veces la caja.
 *
 * Se corre con `npm run verify:quiebro-molde -w escritorio`. Códigos de salida: los del arnés.
 */
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { arnes } from '../../server/scripts/arnes';
import type { GeometriaVolcada, P2, SeccionDelMolde, V3 } from '../src/quiebro/ciudad/geometria';
import {
  Molde,
  MoldeQueNoGuarda,
  SUAVE_POR_DEFECTO,
  atributoRoto,
  triangulosDeExtruirPerfil,
  triangulosDeLaCajaBiselada,
  triangulosDelPerfil,
  triangulosDelSeccionado,
  triangulosDelTorno,
} from '../src/quiebro/ciudad/geometria';

const { comprobar, paso, nota, terminar } = arnes();

/* ═══ Los datos ═══ */

/** Rotación de verdad (no múltiplo de 90°) y traslado: lo que hace `con` en una celda. */
const MATRIZ = new THREE.Matrix4().makeRotationY(0.63).setPosition(4.2, 0.15, -3.1);

const BALAUSTRE: P2[] = [
  [0, 0],
  [0.12, 0],
  [0.12, 0.05],
  [0.08, 0.1],
  [0.1, 0.2],
  [0.13, 0.32],
  [0.14, 0.45],
  [0.11, 0.56],
  [0.07, 0.66],
  [0.1, 0.72],
  [0.1, 0.8],
  [0, 0.8],
];
const TAZA: P2[] = [
  [0.5, 0],
  [0.55, 0.12],
  [0.6, 0.25],
  [0.62, 0.3],
  [0.58, 0.31],
  [0.52, 0.2],
  [0.45, 0.1],
];
const PUNTA: P2[] = [
  [0.2, 0],
  [0.15, 1.5],
  [0, 1.8],
];

/** Una marquesina curva: una lámina de 6 cm de grueso en arco. */
function marquesina(): P2[] {
  const fuera: P2[] = [];
  const dentro: P2[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (0.15 + 0.7 * (i / 10));
    fuera.push([Math.cos(a) * 1.2, 2.2 + Math.sin(a) * 0.5]);
    dentro.push([Math.cos(a) * 1.14, 2.2 + Math.sin(a) * 0.44]);
  }
  return [...fuera, ...dentro.reverse()];
}
/** Un costado de banco: un rectángulo de cantos redondeados, dado en sentido horario (se le da la vuelta). */
function costado(): P2[] {
  const p: P2[] = [];
  const esquinas: [number, number, number][] = [
    [0.25, 0.4, 0],
    [-0.25, 0.4, Math.PI / 2],
    [-0.25, 0.05, Math.PI],
    [0.25, 0.05, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of esquinas) for (let i = 0; i <= 4; i++) p.push([cx + Math.cos(a0 + (i / 4) * (Math.PI / 2)) * 0.05, cy + Math.sin(a0 + (i / 4) * (Math.PI / 2)) * 0.05]);
  return p.reverse();
}
const COCHE_LADO: P2[] = [
  [-2, 0.3],
  [2, 0.3],
  [2.1, 0.8],
  [1, 0.9],
  [0.4, 1.4],
  [-1, 1.4],
  [-1.8, 0.9],
  [-2.1, 0.7],
];

/** Un anillo de coche en (z, y), antihorario, escalado en ancho y alto. */
function anilloDeCoche(ancho: number, alto: number, techo: number): P2[] {
  return [
    [-ancho, 0.3],
    [ancho, 0.3],
    [ancho, 0.75],
    [ancho * 0.97, 0.9],
    [ancho * 0.75, alto],
    [ancho * 0.7, techo],
    [-ancho * 0.7, techo],
    [-ancho * 0.75, alto],
    [-ancho * 0.97, 0.9],
    [-ancho, 0.75],
  ];
}
const SECCIONES_COCHE: SeccionDelMolde[] = [
  { x: -2.2, puntos: anilloDeCoche(0.78, 0.9, 0.95) },
  { x: -1.9, puntos: anilloDeCoche(0.86, 0.95, 1.05) },
  { x: -1.0, puntos: anilloDeCoche(0.87, 1.05, 1.42) },
  { x: 0.5, puntos: anilloDeCoche(0.87, 1.05, 1.44) },
  { x: 1.4, puntos: anilloDeCoche(0.87, 0.98, 1.0) },
  { x: 2.2, puntos: anilloDeCoche(0.8, 0.85, 0.88) },
];
/** Un vagón dado del revés (horario) y con la última sección con dos puntos juntos (una arista que mide cero). */
function seccionesDelVagon(): SeccionDelMolde[] {
  const anillo = (a: number, h: number, junta: boolean): P2[] => {
    const p: P2[] = [
      [-a, 0.4],
      [a, 0.4],
      [a, h * 0.8],
      [a * 0.8, h],
      [junta ? a * 0.8 : -a * 0.8, h],
      [-a, h * 0.8],
    ];
    return p.reverse();
  };
  return [
    { x: 0, puntos: anillo(1.4, 3.6, false) },
    { x: 8, puntos: anillo(1.45, 3.7, false) },
    { x: 16, puntos: anillo(1.4, 3.6, false) },
    { x: 17, puntos: anillo(1.2, 3.2, true) },
  ];
}
/** Una moldura abierta que cambia de vuelo: contorno abierto, la materia a la izquierda. */
const MOLDURA: SeccionDelMolde[] = [
  { x: 0, puntos: [[0.3, 0], [0.3, 0.1], [0.2, 0.2], [0.2, 0.3], [0, 0.35]] },
  { x: 1, puntos: [[0.35, 0], [0.35, 0.12], [0.24, 0.22], [0.22, 0.32], [0, 0.37]] },
  { x: 2.5, puntos: [[0.3, 0], [0.3, 0.1], [0.2, 0.2], [0.2, 0.3], [0, 0.35]] },
];
/** Un cajón de sección cuadrada: cuatro esquinas de 90° en (z, y), antihorario. */
const SECCIONES_CAJON: SeccionDelMolde[] = [0, 1, 2.5].map((x) => ({
  x,
  puntos: [
    [-0.5, 0],
    [0.5, 0],
    [0.5, 1],
    [-0.5, 1],
  ],
}));
/**
 * El cajón que en sus últimos 20 cm mete 25 cm su costado de +z: ese costado se tuerce 51° de una sección
 * a la siguiente, más que `suave`, y esa arista de sección es viva (la única de este tipo en los casos).
 * De un solo lado: estrechado por los dos, o también de alto, la `v` (lo recorrido por cada sección) cambia
 * tanto de una sección a la otra que la UV se tuerce ×5 (es la `v` del seccionado: ver `pendiente`).
 */
const SECCIONES_PLIEGUE: SeccionDelMolde[] = [
  ...SECCIONES_CAJON,
  {
    x: 2.7,
    puntos: [
      [-0.5, 0],
      [0.25, 0],
      [0.25, 1],
      [-0.5, 1],
    ],
  },
];
/** Un edificio de 10 × 6 rodeado como lo recorren sus muros (norte, oeste, sur, este), a 12 m. */
const EDIFICIO: V3[] = [
  [10, 12, 0],
  [0, 12, 0],
  [0, 12, 6],
  [10, 12, 6],
];
/** Una cornisa: sale de la pared por abajo, vuela, sube y vuelve por arriba. Abierta por la pared. */
const CORNISA: P2[] = [
  [0, 0],
  [0.12, 0.04],
  [0.18, 0.12],
  [0.3, 0.2],
  [0.3, 0.3],
  [0, 0.34],
];
/** Una moldura suelta cerrada (no toca la pared): un bocel. */
const BOCEL: P2[] = [
  [0.05, 0],
  [0.2, 0],
  [0.25, 0.05],
  [0.25, 0.12],
  [0.2, 0.17],
  [0.05, 0.17],
];

/* ═══ Las cuentas sobre lo volcado ═══ */

type Punto3 = [number, number, number];
const leer = (a: Float32Array, i: number): Punto3 => [a[3 * i] as number, a[3 * i + 1] as number, a[3 * i + 2] as number];
const menos = (a: Punto3, b: Punto3): Punto3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a: Punto3, b: Punto3): Punto3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punto = (a: Punto3, b: Punto3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const largo = (a: Punto3): number => Math.hypot(a[0], a[1], a[2]);
const clave = (p: Punto3): string => `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)},${Math.round(p[2] * 1e5)}`;

interface Medidas {
  triangulos: number;
  vertices: number;
  normalesMalas: number;
  degenerados: number;
  alReves: number;
  /** Aristas usadas dos veces en el mismo sentido, o sin su contraria. 0 = cerrada y bien cosida. */
  aristasSueltas: number;
  volumen: number;
  aristasMedidas: number;
  peorEscalaUV: number;
  aristasSuaves: number;
  saltosDeUV: number;
  /** Triángulos con sus tres normales iguales (planos a la vista): se les exige la normal geométrica. */
  planosMirados: number;
  planosTorcidos: number;
}

function medir(v: GeometriaVolcada, ignorarUV?: (p: Punto3) => boolean): Medidas {
  const pos = v.datos.get('position') as Float32Array;
  const nor = v.datos.get('normal') as Float32Array;
  const uv = v.datos.get('uv') as Float32Array;
  const ind = v.indices;
  const m: Medidas = {
    triangulos: ind.length / 3,
    vertices: v.vertices,
    normalesMalas: 0,
    degenerados: 0,
    alReves: 0,
    aristasSueltas: 0,
    volumen: 0,
    aristasMedidas: 0,
    peorEscalaUV: 1,
    aristasSuaves: 0,
    saltosDeUV: 0,
    planosMirados: 0,
    planosTorcidos: 0,
  };
  for (let i = 0; i < v.vertices; i++) if (Math.abs(largo(leer(nor, i)) - 1) > 1e-3) m.normalesMalas++;
  const dirigidas = new Map<string, number>();
  const porArista = new Map<string, [number, number][]>();
  for (let t = 0; t < ind.length; t += 3) {
    const ia = ind[t] as number;
    const ib = ind[t + 1] as number;
    const ic = ind[t + 2] as number;
    const a = leer(pos, ia);
    const b = leer(pos, ib);
    const c = leer(pos, ic);
    const n = cruz(menos(b, a), menos(c, a));
    if (largo(n) < 1e-9) m.degenerados++;
    const suma: Punto3 = [0, 0, 0];
    for (const i of [ia, ib, ic]) {
      const q = leer(nor, i);
      suma[0] += q[0];
      suma[1] += q[1];
      suma[2] += q[2];
    }
    if (!(punto(n, suma) > 0)) m.alReves++;
    /* Un triángulo que se pinta plano (sus tres normales, la misma) lleva la normal de su plano. */
    const na = leer(nor, ia);
    if (punto(na, leer(nor, ib)) >= 0.99999 && punto(na, leer(nor, ic)) >= 0.99999 && largo(n) >= 1e-9) {
      m.planosMirados++;
      if (punto(na, n) / (largo(na) * largo(n)) < 0.9999) m.planosTorcidos++;
    }
    m.volumen += punto(a, cruz(b, c)) / 6;
    const lados: [number, number][] = [
      [ia, ib],
      [ib, ic],
      [ic, ia],
    ];
    for (const [p, q] of lados) {
      const kp = clave(leer(pos, p));
      const kq = clave(leer(pos, q));
      const d = `${kp}>${kq}`;
      dirigidas.set(d, (dirigidas.get(d) ?? 0) + 1);
      const [k0, v0, v1] = kp < kq ? [`${kp}|${kq}`, p, q] : [`${kq}|${kp}`, q, p];
      const lista = porArista.get(k0) ?? [];
      lista.push([v0, v1]);
      porArista.set(k0, lista);
      /* Métrica: lo que mide la arista en UV contra lo que mide en el mundo. */
      const l3 = largo(menos(leer(pos, q), leer(pos, p)));
      if (l3 >= 0.01) {
        const luv = Math.hypot((uv[2 * q] as number) - (uv[2 * p] as number), (uv[2 * q + 1] as number) - (uv[2 * p + 1] as number));
        const escala = luv / l3;
        m.aristasMedidas++;
        const peor = escala > 1 ? escala : 1 / Math.max(escala, 1e-9);
        if (peor > m.peorEscalaUV) m.peorEscalaUV = peor;
      }
    }
  }
  for (const [d, cuantas] of dirigidas) {
    const [kp, kq] = d.split('>') as [string, string];
    if (cuantas !== 1 || dirigidas.get(`${kq}>${kp}`) !== 1) m.aristasSueltas++;
  }
  /* Continuidad: una arista con dos triángulos y la misma normal a los dos lados es suave; su UV, la misma. */
  for (const lista of porArista.values()) {
    if (lista.length !== 2) continue;
    const [[a0, b0], [a1, b1]] = lista as [[number, number], [number, number]];
    if (ignorarUV !== undefined && (ignorarUV(leer(pos, a0)) || ignorarUV(leer(pos, b0)))) continue;
    if (punto(leer(nor, a0), leer(nor, a1)) < 0.9999 || punto(leer(nor, b0), leer(nor, b1)) < 0.9999) continue;
    m.aristasSuaves++;
    if (a0 === a1 && b0 === b1) continue;
    const salto =
      Math.abs((uv[2 * a0] as number) - (uv[2 * a1] as number)) +
      Math.abs((uv[2 * a0 + 1] as number) - (uv[2 * a1 + 1] as number)) +
      Math.abs((uv[2 * b0] as number) - (uv[2 * b1] as number)) +
      Math.abs((uv[2 * b0 + 1] as number) - (uv[2 * b1 + 1] as number));
    if (salto > 1e-4) m.saltosDeUV++;
  }
  return m;
}

type OpcionesDelSeccionado = { readonly aristasVivas?: readonly number[]; readonly suave?: number; readonly tapas?: boolean; readonly cerrada?: boolean };

/**
 * LA REGLA DE LAS NORMALES DEL SECCIONADO, escrita aquí aparte (no se llama a geometria.ts para sacarla):
 * cada cara (franja s, arista k) tiene su normal; una arista del anillo (de sección a sección por el punto
 * k) es suave si k no es arista viva; una arista de sección, si sus dos caras se tuercen menos que `suave`.
 * En cada punto de la rejilla, las caras que lo tocan y se unen por aristas suaves son un grupo, y el grupo
 * da UNA normal: la suma de las suyas. Devuelve cada sitio (posición) con las normales que le tocan, las
 * tapas incluidas; con `conMatriz`, puestas con MATRIZ.
 */
function normalesDeLaRegla(secciones: readonly SeccionDelMolde[], opciones: OpcionesDelSeccionado, conMatriz: boolean): { donde: Punto3; normales: Punto3[] }[] {
  const ns = secciones.length;
  const cerrada = opciones.cerrada !== false;
  const np = (secciones[0] as SeccionDelMolde).puntos.length;
  let area = 0;
  const p0 = (secciones[0] as SeccionDelMolde).puntos;
  for (let i = 0; i < np; i++) {
    const a = p0[i] as P2;
    const b = p0[(i + 1) % np] as P2;
    area += a[0] * b[1] - b[0] * a[1];
  }
  const vuelta = cerrada && area < 0;
  const indice = (k: number): number => (vuelta ? np - 1 - k : k);
  const vivas = new Set((opciones.aristasVivas ?? []).map(indice));
  const cosSuave = Math.cos(opciones.suave ?? SUAVE_POR_DEFECTO);
  const en = (s: number, k: number): Punto3 => {
    const sec = secciones[s] as SeccionDelMolde;
    const q = sec.puntos[indice(((k % np) + np) % np)] as P2;
    return [sec.x, q[1], q[0]];
  };
  const aristas = cerrada ? np : np - 1;
  /* La normal de cada cara: la suma de los productos vectoriales de sus dos triángulos (uno nulo no suma). */
  const cara = (s: number, k: number): Punto3 | null => {
    if (s < 0 || s >= ns - 1) return null;
    if (!cerrada && (k < 0 || k >= aristas)) return null;
    const a = en(s, k);
    const b = en(s, k + 1);
    const c = en(s + 1, k + 1);
    const d = en(s + 1, k);
    const t1 = cruz(menos(d, a), menos(c, a));
    const t2 = cruz(menos(c, a), menos(b, a));
    const n: Punto3 = [t1[0] + t2[0], t1[1] + t2[1], t1[2] + t2[2]];
    const l = largo(n);
    return l < 1e-12 ? null : [n[0] / l, n[1] / l, n[2] / l];
  };
  const sitios: { donde: Punto3; normales: Punto3[] }[] = [];
  const anotar = (donde: Punto3, n: Punto3): void => {
    let sitio = sitios.find((x) => largo(menos(x.donde, donde)) < 1e-7);
    if (sitio === undefined) {
      sitio = { donde, normales: [] };
      sitios.push(sitio);
    }
    if (!sitio.normales.some((q) => punto(q, n) >= 0.9999999)) sitio.normales.push(n);
  };
  for (let gs = 0; gs < ns; gs++) {
    for (let gk = 0; gk < np; gk++) {
      /* Las cuatro caras alrededor, en abanico: (gs−1, gk−1), (gs−1, gk), (gs, gk), (gs, gk−1). */
      const alrededor = [cara(gs - 1, gk - 1), cara(gs - 1, gk), cara(gs, gk), cara(gs, gk - 1)];
      const grupo = [0, 1, 2, 3];
      const raiz = (i: number): number => (grupo[i] === i ? i : raiz(grupo[i] as number));
      const unir = (i: number, j: number): void => {
        grupo[raiz(i)] = raiz(j);
      };
      const ambas = (i: number, j: number): boolean => alrededor[i] !== null && alrededor[j] !== null;
      /* Por el anillo (0–1 y 3–2), si el punto no es arista viva. */
      if (!vivas.has(gk)) {
        if (ambas(0, 1)) unir(0, 1);
        if (ambas(3, 2)) unir(3, 2);
      }
      /* Por la sección (1–2 y 0–3), si las caras se tuercen menos que `suave`. */
      for (const [i, j] of [
        [1, 2],
        [0, 3],
      ] as const) {
        if (ambas(i, j) && punto(alrededor[i] as Punto3, alrededor[j] as Punto3) >= cosSuave) unir(i, j);
      }
      const sumas = new Map<number, Punto3>();
      alrededor.forEach((n, i) => {
        if (n === null) return;
        const r = raiz(i);
        const s = sumas.get(r) ?? [0, 0, 0];
        sumas.set(r, [s[0] + n[0], s[1] + n[1], s[2] + n[2]]);
      });
      for (const s of sumas.values()) {
        const l = largo(s);
        anotar(en(gs, gk), [s[0] / l, s[1] / l, s[2] / l]);
      }
    }
  }
  if (cerrada && opciones.tapas !== false) {
    for (let k = 0; k < np; k++) {
      anotar(en(0, k), [-1, 0, 0]);
      anotar(en(ns - 1, k), [1, 0, 0]);
    }
  }
  if (!conMatriz) return sitios;
  const giro = new THREE.Matrix3().setFromMatrix4(MATRIZ);
  return sitios.map(({ donde, normales }) => {
    const p = new THREE.Vector3(...donde).applyMatrix4(MATRIZ);
    return {
      donde: [p.x, p.y, p.z] as Punto3,
      normales: normales.map((n) => {
        const q = new THREE.Vector3(...n).applyMatrix3(giro).normalize();
        return [q.x, q.y, q.z] as Punto3;
      }),
    };
  });
}

/**
 * Compara lo escrito con la regla, sitio a sitio: cada normal escrita en un sitio es una de las de la regla
 * (≥ 0,99999) y cada una de la regla está escrita. Un punto con tres normales casi iguales (cada cara
 * sumando sus vecinas por su cuenta) sale aquí como normales que la regla no da.
 */
function contrastarConLaRegla(v: GeometriaVolcada, regla: { donde: Punto3; normales: Punto3[] }[]): { sitios: number; conVarias: number; malos: number; ejemplo: unknown } {
  const pos = v.datos.get('position') as Float32Array;
  const nor = v.datos.get('normal') as Float32Array;
  const escritas = regla.map(() => [] as Punto3[]);
  let huerfanos = 0;
  for (let i = 0; i < v.vertices; i++) {
    const p = leer(pos, i);
    const j = regla.findIndex((x) => largo(menos(x.donde, p)) < 1e-4);
    if (j < 0) {
      huerfanos++;
      continue;
    }
    (escritas[j] as Punto3[]).push(leer(nor, i));
  }
  let malos = huerfanos;
  let ejemplo: unknown = huerfanos > 0 ? { huerfanos } : null;
  regla.forEach((sitio, j) => {
    const aqui = escritas[j] as Punto3[];
    const sobra = aqui.filter((n) => !sitio.normales.some((q) => punto(q, n) >= 0.99999));
    const falta = sitio.normales.filter((q) => !aqui.some((n) => punto(q, n) >= 0.99999));
    if (sobra.length > 0 || falta.length > 0) {
      malos++;
      ejemplo ??= { donde: sitio.donde.map((x) => +x.toFixed(3)), regla: sitio.normales.map((n) => n.map((x) => +x.toFixed(3))), sobra: sobra.slice(0, 3).map((n) => n.map((x) => +x.toFixed(3))) };
    }
  });
  return { sitios: regla.length, conVarias: regla.filter((s) => s.normales.length >= 2).length, malos, ejemplo };
}

/** La huella de lo volcado: vértices, atributos en su orden y los índices. */
function huella(m: Molde): string {
  const v = m.volcar();
  const h = createHash('sha256');
  h.update(String(v.vertices));
  for (const a of v.atributos) {
    h.update(a.nombre);
    const d = v.datos.get(a.nombre) as Float32Array;
    h.update(new Uint8Array(d.buffer, d.byteOffset, d.byteLength));
  }
  h.update(new Uint8Array(v.indices.buffer, v.indices.byteOffset, v.indices.byteLength));
  return h.digest('hex');
}

/** Un molde que no guarda y cuenta lo que le piden. */
class ContadorQueNoGuarda extends MoldeQueNoGuarda {
  llamadasAVertice = 0;
  llamadasATri = 0;
  override vertice(): number {
    this.llamadasAVertice++;
    return 0;
  }
  override tri(): void {
    this.llamadasATri++;
  }
}

/* ═══ Los casos ═══ */

interface Caso {
  readonly primitiva: string;
  readonly nombre: string;
  /** Si es un sólido cerrado: se le exige estar cosido y tener volumen positivo. */
  readonly cerrada: boolean;
  /** Cuántas aristas suaves llevan un salto de UV: la costura que la primitiva declara, ni una más ni una menos. */
  readonly costuras: number;
  readonly formula: number;
  readonly ignorarUV?: (p: Punto3) => boolean;
  /** En un seccionado, sus datos: las normales se comparan con las de su regla (`normalesDeLaRegla`). */
  readonly seccionado?: { readonly secciones: readonly SeccionDelMolde[]; readonly opciones: OpcionesDelSeccionado; readonly conMatriz?: boolean };
  escribir(m: Molde): void;
}

const enElEjeDe =
  (cx: number, cz: number, conMatriz: boolean) =>
  (p: Punto3): boolean => {
    let q = new THREE.Vector3(cx, 0, cz);
    if (conMatriz) q = q.applyMatrix4(MATRIZ);
    return Math.hypot(p[0] - q.x, p[2] - q.z) < 1e-4;
  };

const CASOS: Caso[] = [
  {
    primitiva: 'torno',
    nombre: 'balaustre, del eje al eje',
    cerrada: true,
    costuras: BALAUSTRE.length - 3 /* un tramo por costura, menos los dos abanicos del eje */,
    formula: triangulosDelTorno(BALAUSTRE, 12),
    ignorarUV: enElEjeDe(1.5, -2, false),
    escribir: (m) => m.torno(1.5, -2, BALAUSTRE, 12),
  },
  {
    primitiva: 'torno',
    nombre: 'taza con sus dos tapas, suave a 0,3',
    cerrada: true,
    costuras: TAZA.length - 1 /* un tramo, una costura */,
    formula: triangulosDelTorno(TAZA, 16),
    escribir: (m) => m.torno(0, 0, TAZA, 16, { suave: 0.3 }),
  },
  {
    primitiva: 'torno',
    nombre: 'fuste en punta de 5 lados, dentro de `con`',
    cerrada: true,
    costuras: PUNTA.length - 2 /* el abanico de la punta no cuenta */,
    formula: triangulosDelTorno(PUNTA, 5),
    ignorarUV: enElEjeDe(0.3, 0.2, true),
    escribir: (m) => m.con(MATRIZ, () => m.torno(0.3, 0.2, PUNTA, 5)),
  },
  {
    primitiva: 'cajaBiselada',
    nombre: 'las seis caras',
    cerrada: true,
    costuras: 0,
    formula: triangulosDeLaCajaBiselada(),
    escribir: (m) => m.cajaBiselada(0, 0, 0, 1, 0.5, 0.4, 0.03),
  },
  {
    primitiva: 'cajaBiselada',
    nombre: 'sin fondo (posada en el suelo)',
    cerrada: false,
    costuras: 0,
    formula: triangulosDeLaCajaBiselada('nseoa'),
    escribir: (m) => m.cajaBiselada(-0.3, 0, 1, 0.3, 0.9, 1.25, 0.05, 'nseoa'),
  },
  {
    primitiva: 'cajaBiselada',
    nombre: 'bisel de más (se recorta), dentro de `con`',
    cerrada: true,
    costuras: 0,
    formula: triangulosDeLaCajaBiselada(),
    escribir: (m) => m.con(MATRIZ, () => m.cajaBiselada(-0.2, 0, -0.1, 0.2, 2.5, 0.1, 0.5)),
  },
  {
    primitiva: 'perfil suave',
    nombre: 'marquesina curva con tapas',
    cerrada: true,
    costuras: 0 /* su cierre es arista viva */,
    formula: triangulosDelPerfil(marquesina()),
    escribir: (m) => m.perfil(marquesina(), -0.4, 0.4, { suave: Math.PI / 5 }),
  },
  {
    primitiva: 'perfil suave',
    nombre: 'coche del revés, sin tapas y sin una arista',
    cerrada: false,
    costuras: 0 /* su cierre es arista viva */,
    formula: triangulosDelPerfil([...COCHE_LADO].reverse(), { tapas: false, lados: (i) => i !== 1 }),
    escribir: (m) => m.perfil([...COCHE_LADO].reverse(), -0.8, 0.8, { tapas: false, lados: (i) => i !== 1, suave: 0.5 }),
  },
  {
    primitiva: 'perfil suave',
    nombre: 'costado de banco horario, dentro de `con`',
    cerrada: true,
    costuras: 1,
    formula: triangulosDelPerfil(costado()),
    escribir: (m) => m.con(MATRIZ, () => m.perfil(costado(), -0.03, 0.03, { suave: Math.PI / 4 })),
  },
  {
    primitiva: 'seccionado',
    nombre: 'coche de seis secciones, con aristas vivas',
    cerrada: true,
    costuras: 0 /* el punto 0 es arista viva: la costura cae en ella */,
    formula: triangulosDelSeccionado(SECCIONES_COCHE),
    seccionado: { secciones: SECCIONES_COCHE, opciones: { aristasVivas: [0, 1, 2, 9] } },
    escribir: (m) => m.seccionado(SECCIONES_COCHE, { aristasVivas: [0, 1, 2, 9] }),
  },
  {
    primitiva: 'seccionado',
    nombre: 'vagón horario con una arista que mide cero',
    cerrada: true,
    /*
     * Viene horario: se le da la vuelta y el punto 5 tal y como llega (la esquina de abajo a la izquierda)
     * pasa a ser el 0, donde cae la costura. Las dos esquinas de abajo, 4 y 5, son vivas: la costura cae en
     * una arista viva y no se cuenta. (Con [0, 1], que eran los hombros del techo, la costura caía en una
     * esquina suave y sus tres saltos se ven: el rojo de `vagon-costura-en-esquina-suave`.)
     */
    costuras: 0,
    formula: triangulosDelSeccionado(seccionesDelVagon()),
    seccionado: { secciones: seccionesDelVagon(), opciones: { aristasVivas: [4, 5], suave: 0.4 } },
    escribir: (m) => m.seccionado(seccionesDelVagon(), { aristasVivas: [4, 5], suave: 0.4 }),
  },
  {
    primitiva: 'seccionado',
    nombre: 'moldura abierta, dentro de `con`',
    cerrada: false,
    costuras: 0,
    formula: triangulosDelSeccionado(MOLDURA, { cerrada: false }),
    seccionado: { secciones: MOLDURA, opciones: { cerrada: false, aristasVivas: [1] }, conMatriz: true },
    escribir: (m) => m.con(MATRIZ, () => m.seccionado(MOLDURA, { cerrada: false, aristasVivas: [1] })),
  },
  {
    primitiva: 'seccionado',
    nombre: 'cajón de esquinas de 90° sin declarar (redondeadas)',
    cerrada: true,
    costuras: SECCIONES_CAJON.length - 1 /* la costura del punto 0 es arista suave: un salto por franja */,
    formula: triangulosDelSeccionado(SECCIONES_CAJON),
    seccionado: { secciones: SECCIONES_CAJON, opciones: {} },
    escribir: (m) => m.seccionado(SECCIONES_CAJON),
  },
  {
    primitiva: 'seccionado',
    nombre: 'cajón con sus cuatro esquinas declaradas vivas',
    cerrada: true,
    costuras: 0,
    formula: triangulosDelSeccionado(SECCIONES_CAJON),
    seccionado: { secciones: SECCIONES_CAJON, opciones: { aristasVivas: [0, 1, 2, 3] } },
    escribir: (m) => m.seccionado(SECCIONES_CAJON, { aristasVivas: [0, 1, 2, 3] }),
  },
  {
    primitiva: 'seccionado',
    nombre: 'cajón con un pliegue de 51° entre dos secciones',
    cerrada: true,
    /*
     * Las esquinas del anillo, vivas: si no, el pliegue se «rodea» por el fondo y el techo, que siguen
     * planos, y en sus dos puntos las cuatro caras son un solo grupo (una arista viva suelta no parte un
     * abanico; hacen falta dos). Así el pliegue es lo único que separa el costado de antes del de después.
     */
    costuras: 0,
    formula: triangulosDelSeccionado(SECCIONES_PLIEGUE),
    seccionado: { secciones: SECCIONES_PLIEGUE, opciones: { aristasVivas: [0, 1, 2, 3] } },
    escribir: (m) => m.seccionado(SECCIONES_PLIEGUE, { aristasVivas: [0, 1, 2, 3] }),
  },
  {
    primitiva: 'extruirPerfil',
    nombre: 'cornisa alrededor de un edificio, con ingletes',
    cerrada: false,
    costuras: 0,
    formula: triangulosDeExtruirPerfil(EDIFICIO, CORNISA, { cerrado: true }),
    escribir: (m) => m.extruirPerfil(EDIFICIO, CORNISA, { cerrado: true }),
  },
  {
    primitiva: 'extruirPerfil',
    nombre: 'bocel cerrado en L, con tapas',
    cerrada: true,
    costuras: 0,
    formula: triangulosDeExtruirPerfil(
      [
        [0, 3, 0],
        [4, 3, 0],
        [4, 3, 3],
      ],
      BOCEL,
      { perfilCerrado: true },
    ),
    escribir: (m) =>
      m.extruirPerfil(
        [
          [0, 3, 0],
          [4, 3, 0],
          [4, 3, 3],
        ],
        BOCEL,
        { perfilCerrado: true, suave: 1 },
      ),
  },
  {
    primitiva: 'extruirPerfil',
    nombre: 'sin ingletes (tramos a escuadra), dentro de `con`',
    cerrada: true,
    costuras: 0,
    formula: triangulosDeExtruirPerfil(
      [
        [0, 0, 0],
        [2, 0, 0.5],
        [3, 0, 2],
      ],
      BOCEL,
      { perfilCerrado: true, ingletes: false },
    ),
    escribir: (m) =>
      m.con(MATRIZ, () =>
        m.extruirPerfil(
          [
            [0, 0, 0],
            [2, 0, 0.5],
            [3, 0, 2],
          ],
          BOCEL,
          { perfilCerrado: true, ingletes: false },
        ),
      ),
  },
];

/** El factor que se admite entre lo que mide una arista en UV y en el mundo. */
const ESCALA_UV_MAXIMA = 3;

/* ═══ 1. Cada primitiva, en cada caso ═══ */

paso('las primitivas, tres casos cada una: sin NaN, sentido, cerradas, UV, sin guardar y su fórmula');
let triangulosMirados = 0;
let aristasSuavesMiradas = 0;
const suavesPorPrimitiva = new Map<string, number>();
let planosMirados = 0;
const planosPorPrimitiva = new Map<string, number>();
let sitiosDelSeccionado = 0;
let sitiosConVarias = 0;
for (const caso of CASOS) {
  const que = `${caso.primitiva} (${caso.nombre})`;
  const m = new Molde({}, false);
  caso.escribir(m);
  const g = m.geometria();
  const med = medir(m.volcar(), caso.ignorarUV);
  triangulosMirados += med.triangulos;
  aristasSuavesMiradas += med.aristasSuaves;
  suavesPorPrimitiva.set(caso.primitiva, (suavesPorPrimitiva.get(caso.primitiva) ?? 0) + med.aristasSuaves);
  nota(
    `${que}: ${med.triangulos} tri, ${med.vertices} vért, volumen ${med.volumen.toFixed(4)} m³, ` +
      `UV peor ×${med.peorEscalaUV.toFixed(2)} en ${med.aristasMedidas} aristas, ${med.aristasSuaves} suaves, ${med.saltosDeUV} saltos`,
  );
  comprobar(`${que}: escribe algo`, med.triangulos > 0);
  comprobar(`${que}: sin NaN, normales de largo 1 y ningún triángulo de área nula`, atributoRoto(g) === null && med.normalesMalas === 0 && med.degenerados === 0, {
    roto: atributoRoto(g),
    normalesMalas: med.normalesMalas,
    degenerados: med.degenerados,
  });
  comprobar(`${que}: todo triángulo gira hacia su normal`, med.alReves === 0, { alReves: med.alReves, de: med.triangulos });
  planosMirados += med.planosMirados;
  planosPorPrimitiva.set(caso.primitiva, (planosPorPrimitiva.get(caso.primitiva) ?? 0) + med.planosMirados);
  comprobar(`${que}: los ${med.planosMirados} triángulos planos llevan la normal de su plano`, med.planosTorcidos === 0, {
    torcidos: med.planosTorcidos,
    de: med.planosMirados,
  });
  if (caso.seccionado !== undefined) {
    const r = contrastarConLaRegla(m.volcar(), normalesDeLaRegla(caso.seccionado.secciones, caso.seccionado.opciones, caso.seccionado.conMatriz === true));
    sitiosDelSeccionado += r.sitios;
    sitiosConVarias += r.conVarias;
    comprobar(`${que}: en cada uno de sus ${r.sitios} sitios, las normales de su regla (grupos por arista), ni una más`, r.malos === 0 && r.sitios > 0, r);
  }
  if (caso.cerrada) {
    comprobar(`${que}: cerrada, cada arista con su contraria, y volumen positivo`, med.aristasSueltas === 0 && med.volumen > 0, {
      aristasSueltas: med.aristasSueltas,
      volumen: med.volumen,
    });
  }
  comprobar(
    `${que}: UV en metros (×${ESCALA_UV_MAXIMA} como mucho) y seguidas, con sus ${caso.costuras} aristas de costura`,
    med.aristasMedidas > 0 && med.peorEscalaUV <= ESCALA_UV_MAXIMA && med.saltosDeUV === caso.costuras,
    { aristasMedidas: med.aristasMedidas, peorEscala: med.peorEscalaUV, saltos: med.saltosDeUV, costuras: caso.costuras },
  );
  const sinGuardar = new ContadorQueNoGuarda({}, false);
  let revento: unknown = null;
  try {
    caso.escribir(sinGuardar);
  } catch (e) {
    revento = String(e);
  }
  comprobar(
    `${que}: MoldeQueNoGuarda hace las mismas llamadas`,
    revento === null && sinGuardar.llamadasATri === med.triangulos && sinGuardar.llamadasAVertice === med.vertices,
    { revento, tri: [sinGuardar.llamadasATri, med.triangulos], vertice: [sinGuardar.llamadasAVertice, med.vertices] },
  );
  comprobar(`${que}: ${med.triangulos} triángulos, los de su fórmula`, med.triangulos === caso.formula, { escritos: med.triangulos, formula: caso.formula });
}
comprobar(`se han mirado al menos 1.000 triángulos (${triangulosMirados})`, triangulosMirados >= 1000, triangulosMirados);
comprobar(
  `la continuidad de UV ha mirado aristas suaves en torno, perfil suave y seccionado (${aristasSuavesMiradas})`,
  ['torno', 'perfil suave', 'seccionado'].every((p) => (suavesPorPrimitiva.get(p) ?? 0) >= 20),
  Object.fromEntries(suavesPorPrimitiva),
);
comprobar(
  `la normal de los planos ha mirado triángulos de las cinco primitivas (${planosMirados})`,
  ['torno', 'cajaBiselada', 'perfil suave', 'seccionado', 'extruirPerfil'].every((p) => (planosPorPrimitiva.get(p) ?? 0) >= 12) &&
    (planosPorPrimitiva.get('cajaBiselada') ?? 0) >= 44 + 30 + 44,
  Object.fromEntries(planosPorPrimitiva),
);
comprobar(
  `la regla del seccionado ha mirado al menos 100 sitios, 30 de ellos con varias normales (${sitiosDelSeccionado}, ${sitiosConVarias})`,
  sitiosDelSeccionado >= 100 && sitiosConVarias >= 30,
  { sitiosDelSeccionado, sitiosConVarias },
);

/* ═══ 2. Lo de hoy no cambia ═══ */

paso('lo de hoy escribe lo mismo que en d4402d0');
/** La batería de primitivas de hoy. Si se cambia, se vuelve a sacar su huella con el geometria.ts de d4402d0. */
function bateriaDeHoy(m: Molde): void {
  m.color(0.2, 0.3, 0.4).poner('aX', 1, 2);
  m.caja(-1, 0, -2, 1.5, 2, 0.5);
  m.caja(0, 0.1, 0, 0.4, 0.9, 0.3, 'nsa');
  m.cilindro(0.2, -0.3, 0, 1.2, 0.3, 0.3, 8, true);
  m.cilindro(1, 1, 0.5, 2, 0.4, 0.1, 6, false);
  m.tubo(
    [
      [0, 0, 0],
      [0, 1, 0],
      [0.5, 1.5, 0.2],
      [1, 1.5, 1],
    ],
    0.05,
    5,
  );
  m.perfil(COCHE_LADO, -0.8, 0.8);
  m.perfil([...COCHE_LADO].reverse(), -0.7, 0.7, { tapas: false, lados: (i) => i % 2 === 0 });
  m.muro(0, 0, 3, 1, 0, 2.5, 0.7);
  m.losa(0, 0, 2, 3, 0.2, true);
  m.losa(0, 0, 2, 3, 0.1, false);
  m.quad([0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [0, 0, 1, 0, 1, 1, 0, 1]);
  m.con(new THREE.Matrix4().makeRotationY(0.7).setPosition(3, 0, -2), () => {
    m.caja(-0.5, 0, -0.5, 0.5, 1, 0.5);
    m.perfil(COCHE_LADO, -0.8, 0.8);
    m.cilindro(0, 0, 0, 1, 0.2, 0.2, 7, true);
  });
}
/* Sacada con el geometria.ts de d4402d0 (`git show d4402d0:escritorio/src/quiebro/ciudad/geometria.ts`). */
const HUELLA_DE_HOY = 'd41e0d0acd0cc97806a555feb860ce5f41f290fcc44287452b85163a0088f770';
{
  const m = new Molde({ aX: 2 }, true);
  bateriaDeHoy(m);
  const h = huella(m);
  comprobar(`caja, cilindro, tubo, perfil sin suave, muro, losa y quad: la misma huella (${m.triangulos} tri)`, h === HUELLA_DE_HOY && m.triangulos === 204, {
    huella: h,
    triangulos: m.triangulos,
  });
}

/* ═══ 3. Lo que cada una promete además ═══ */

paso('lo que cada primitiva promete además');
{
  /* Un torno recto de dos puntos es el cilindro de hoy: mismas posiciones, normales y triángulos. */
  const a = new Molde();
  a.cilindro(0.4, -0.7, 0.2, 1.7, 0.3, 0.3, 9, true);
  const b = new Molde();
  b.torno(0.4, -0.7, [[0.3, 0.2], [0.3, 1.7]], 9);
  const juego = (m: Molde): string[] => {
    const v = m.volcar();
    const pos = v.datos.get('position') as Float32Array;
    const nor = v.datos.get('normal') as Float32Array;
    const uv = v.datos.get('uv') as Float32Array;
    const lista: string[] = [];
    for (let t = 0; t < v.indices.length; t += 3) {
      const esquinas: string[] = [];
      for (let j = 0; j < 3; j++) {
        const i = v.indices[t + j] as number;
        const r = (x: number): string => (Math.round(x * 1e4) / 1e4).toFixed(4);
        esquinas.push([...leer(pos, i), ...leer(nor, i), uv[2 * i] as number, uv[2 * i + 1] as number].map(r).join(','));
      }
      /* El triángulo, girado a su esquina menor: el mismo giro da la misma cadena. */
      const k = esquinas.indexOf([...esquinas].sort()[0] as string);
      lista.push([0, 1, 2].map((j) => esquinas[(k + j) % 3]).join(' '));
    }
    return lista.sort();
  };
  const ja = juego(a);
  const jb = juego(b);
  const iguales = ja.length === jb.length && ja.every((x, i) => x === jb[i]);
  comprobar('un torno recto de dos puntos es el cilindro de hoy (triángulos, sentido, normales y UV)', iguales, {
    cilindro: ja.length,
    torno: jb.length,
    primeroDistinto: ja.find((x, i) => x !== jb[i]),
  });
}
{
  /* alChaflan: el bit marca exactamente lo que no mira a un eje. */
  const m = new Molde({ aChaflan: 1 });
  const avisos: boolean[] = [];
  m.cajaBiselada(0, 0, 0, 1, 1, 1, 0.1, 'nseoab', {
    alChaflan: (si) => {
      avisos.push(si);
      m.poner('aChaflan', si ? 1 : 0);
    },
  });
  const v = m.volcar();
  const nor = v.datos.get('normal') as Float32Array;
  const bit = v.datos.get('aChaflan') as Float32Array;
  let mal = 0;
  let chaflanes = 0;
  for (let i = 0; i < v.vertices; i++) {
    const n = leer(nor, i);
    const deCara = Math.max(Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])) > 0.999;
    if (!deCara) chaflanes++;
    if ((bit[i] === 1) === deCara) mal++;
  }
  comprobar(
    `alChaflan marca los ${chaflanes} vértices de chaflanes y esquinas, ninguno de cara, y acaba en «no»`,
    mal === 0 && chaflanes === 12 * 4 + 8 * 3 && avisos.join(',') === 'false,true,false',
    { mal, chaflanes, avisos },
  );
}
{
  /* La cornisa, por fuera del edificio: ningún vértice dentro de la planta y las normales, hacia fuera. */
  const m = new Molde();
  m.extruirPerfil(EDIFICIO, CORNISA, { cerrado: true });
  const v = m.volcar();
  const pos = v.datos.get('position') as Float32Array;
  const nor = v.datos.get('normal') as Float32Array;
  let dentro = 0;
  let haciaDentro = 0;
  for (let i = 0; i < v.vertices; i++) {
    const p = leer(pos, i);
    if (p[0] > 1e-4 && p[0] < 10 - 1e-4 && p[2] > 1e-4 && p[2] < 6 - 1e-4) dentro++;
    const n = leer(nor, i);
    if (n[0] * (p[0] - 5) + n[2] * (p[2] - 3) < -1e-6) haciaDentro++;
  }
  comprobar(`la cornisa queda fuera del edificio y mira hacia fuera (${v.vertices} vértices)`, v.vertices > 0 && dentro === 0 && haciaDentro === 0, {
    dentro,
    haciaDentro,
  });
  /*
   * Los ingletes conservan el vuelo: un punto del perfil está a su «fuera» de la línea de CADA muro que
   * tiene al lado. En una esquina, a la misma distancia de los dos; sin estirar el inglete quedaría a
   * fuera/√2 y la cornisa adelgazaría justo en la esquina, cosida y cerrada igual (nada más lo ve).
   */
  const vuelos = new Set(CORNISA.map((q) => q[0].toFixed(4)));
  let malos = 0;
  let esquinas = 0;
  for (let i = 0; i < v.vertices; i++) {
    const p = leer(pos, i);
    const dx = Math.max(0, p[0] - 10, -p[0]);
    const dz = Math.max(0, p[2] - 6, -p[2]);
    if (dx > 1e-6 && dz > 1e-6) {
      esquinas++;
      if (Math.abs(dx - dz) > 1e-4 || !vuelos.has(dx.toFixed(4))) malos++;
    } else if (!vuelos.has(Math.max(dx, dz).toFixed(4))) malos++;
  }
  comprobar(`los ingletes conservan el vuelo del perfil (${esquinas} vértices de esquina)`, esquinas >= 12 && malos === 0, { malos, esquinas });
}

/** Las normales escritas en los vértices que cumplen `donde` (sin las que cumplen `salvo`). */
function normalesEn(m: Molde, donde: (p: Punto3) => boolean, salvo: (n: Punto3) => boolean = () => false): Punto3[] {
  const v = m.volcar();
  const pos = v.datos.get('position') as Float32Array;
  const nor = v.datos.get('normal') as Float32Array;
  const lista: Punto3[] = [];
  for (let i = 0; i < v.vertices; i++) {
    const n = leer(nor, i);
    if (donde(leer(pos, i)) && !salvo(n)) lista.push(n);
  }
  return lista;
}
const cerca = (a: number, b: number): boolean => Math.abs(a - b) < 1e-5;
const esTapaX = (n: Punto3): boolean => Math.abs(Math.abs(n[0]) - 1) < 1e-6;
{
  /*
   * Una esquina de 90° del seccionado, la (z, y) = (0,5, 0) del cajón. Sin declarar: una sola normal, la
   * diagonal, en toda la línea. Declarada: exactamente las dos de cara, puras (antes cada cara sumaba sus
   * vecinas por su cuenta y una esquina sin declarar podía salir con dos normales distintas).
   */
  const enLaEsquina = (p: Punto3): boolean => cerca(p[1], 0) && cerca(p[2], 0.5);
  const lisa = new Molde();
  lisa.seccionado(SECCIONES_CAJON);
  const nl = normalesEn(lisa, enLaEsquina, esTapaX);
  const diagonal: Punto3 = [0, -Math.SQRT1_2, Math.SQRT1_2];
  const viva = new Molde();
  viva.seccionado(SECCIONES_CAJON, { aristasVivas: [0, 1, 2, 3] });
  const nv = normalesEn(viva, enLaEsquina, esTapaX);
  const deCara: Punto3[] = [
    [0, -1, 0],
    [0, 0, 1],
  ];
  const vivaBien = nv.every((n) => deCara.some((q) => punto(q, n) >= 0.99999)) && deCara.every((q) => nv.some((n) => punto(q, n) >= 0.99999));
  comprobar(
    `seccionado: una esquina de 90° sin declarar da UNA normal, la diagonal (${nl.length} vértices); declarada, las dos de cara (${nv.length})`,
    nl.length >= 3 && nl.every((n) => punto(n, diagonal) >= 0.99999) && nv.length >= 6 && vivaBien,
    { sinDeclarar: nl.slice(0, 4), declarada: nv.slice(0, 6) },
  );
}
{
  /*
   * En una unión suave conocida, la normal es la bisectriz de las dos de los tramos (no la de uno de ellos).
   * Tres primitivas la sacan de la misma cuenta, y se mira en las tres.
   */
  const bisectriz = (n1: P2, n2: P2): P2 => {
    const l = Math.hypot(n1[0] + n2[0], n1[1] + n2[1]);
    return [(n1[0] + n2[0]) / l, (n1[1] + n2[1]) / l];
  };
  const derechaDe = (a: P2, b: P2): P2 => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[1] - a[1]) / l, -(b[0] - a[0]) / l];
  };
  const malos: string[] = [];
  let mirados = 0;
  const exigir = (que: string, lista: Punto3[], esperada: (p: number) => Punto3, minimo: number): void => {
    mirados += lista.length;
    if (lista.length < minimo) malos.push(`${que}: ${lista.length} vértices, menos de ${minimo}`);
    lista.forEach((n, i) => {
      if (punto(n, esperada(i)) < 0.99999) malos.push(`${que}: ${n.map((x) => x.toFixed(4)).join(',')} contra ${esperada(i).map((x) => x.toFixed(4)).join(',')}`);
    });
  };
  /* Torno: sube recto y se tuerce 20° hacia el eje en y = 1. */
  const t20 = (20 * Math.PI) / 180;
  const contorno: P2[] = [
    [0.3, 0],
    [0.3, 1],
    [0.3 - 0.5 * Math.sin(t20), 1 + 0.5 * Math.cos(t20)],
  ];
  const bt = bisectriz(derechaDe(contorno[0] as P2, contorno[1] as P2), derechaDe(contorno[1] as P2, contorno[2] as P2));
  const torno = new Molde();
  torno.torno(0, 0, contorno, 10, { tapas: false });
  const vt = torno.volcar();
  const posT = vt.datos.get('position') as Float32Array;
  const norT = vt.datos.get('normal') as Float32Array;
  const listaT: Punto3[] = [];
  const esperadaT: Punto3[] = [];
  for (let i = 0; i < vt.vertices; i++) {
    const p = leer(posT, i);
    if (!cerca(p[1], 1)) continue;
    const r = Math.hypot(p[0], p[2]);
    listaT.push(leer(norT, i));
    esperadaT.push([(bt[0] * p[0]) / r, bt[1], (bt[0] * p[2]) / r]);
  }
  exigir('torno', listaT, (i) => esperadaT[i] as Punto3, 11);
  /* Perfil suave: en (1, 0) la base se tuerce 16,7° hacia arriba. Sin tapas, para no contar las suyas. */
  const poligono: P2[] = [
    [0, 0],
    [1, 0],
    [2, 0.3],
    [2, 1],
    [0, 1],
  ];
  const bp = bisectriz(derechaDe(poligono[0] as P2, poligono[1] as P2), derechaDe(poligono[1] as P2, poligono[2] as P2));
  const perfil = new Molde();
  perfil.perfil(poligono, -0.5, 0.5, { suave: Math.PI / 4, tapas: false });
  exigir('perfil suave', normalesEn(perfil, (p) => cerca(p[0], 1) && cerca(p[1], 0)), () => [bp[0], bp[1], 0], 2);
  /* Perfil corrido a lo largo de +x (fuera = +z): en el punto (0,2, 0,05) del perfil, 31° de giro. */
  const moldura: P2[] = [
    [0, 0],
    [0.2, 0.05],
    [0.3, 0.15],
    [0, 0.3],
  ];
  const be = bisectriz(derechaDe(moldura[0] as P2, moldura[1] as P2), derechaDe(moldura[1] as P2, moldura[2] as P2));
  const corrido = new Molde();
  corrido.extruirPerfil(
    [
      [0, 0, 0],
      [4, 0, 0],
    ],
    moldura,
    { tapas: false },
  );
  exigir('extruirPerfil', normalesEn(corrido, (p) => cerca(p[2], 0.2) && cerca(p[1], 0.05)), () => [0, be[1], be[0]], 2);
  comprobar(`una unión suave lleva la bisectriz en torno, perfil suave y perfil corrido (${mirados} vértices)`, malos.length === 0, malos.slice(0, 6));
}
{
  /*
   * `lados` en el perfil suave dado del revés: falta la franja de la arista pedida (la 1 tal y como llega),
   * y sólo ésa. No la 3: con 8 puntos del revés la arista 3 sigue siendo la 3 (6 − 3), y un `lados` sin
   * traducir pasaba en verde (el rojo `perfil-suave-lados-sin-traducir`).
   */
  const pts: P2[] = [...COCHE_LADO].reverse();
  const m = new Molde();
  m.perfil(pts, -0.8, 0.8, { tapas: false, lados: (i) => i !== 1, suave: 0.5 });
  const v = m.volcar();
  const pos = v.datos.get('position') as Float32Array;
  const porArista = new Array<number>(pts.length).fill(0);
  let sinArista = 0;
  for (let t = 0; t < v.indices.length; t += 3) {
    const c = [0, 1, 2].map((j) => leer(pos, v.indices[t + j] as number));
    const cx = ((c[0] as Punto3)[0] + (c[1] as Punto3)[0] + (c[2] as Punto3)[0]) / 3;
    const cy = ((c[0] as Punto3)[1] + (c[1] as Punto3)[1] + (c[2] as Punto3)[1]) / 3;
    const i = pts.findIndex((a, j) => {
      const b = pts[(j + 1) % pts.length] as P2;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy);
      const along = ((cx - a[0]) * dx + (cy - a[1]) * dy) / l;
      return Math.abs((cx - a[0]) * dy - (cy - a[1]) * dx) / l < 1e-4 && along > 0 && along < l;
    });
    if (i < 0) sinArista++;
    else porArista[i] = (porArista[i] as number) + 1;
  }
  comprobar(
    `perfil suave con \`lados\`: falta la franja de la arista pedida y sólo ésa (${porArista.join('/')})`,
    sinArista === 0 && porArista.every((n, i) => (i === 1 ? n === 0 : n === 2)),
    { porArista, sinArista },
  );
}
{
  /* La v del torno sigue de tramo a tramo también en las uniones vivas: en cada sitio del balaustre, una sola v. */
  const m = new Molde();
  m.torno(1.5, -2, BALAUSTRE, 12);
  const v = m.volcar();
  const pos = v.datos.get('position') as Float32Array;
  const uv = v.datos.get('uv') as Float32Array;
  const nor = v.datos.get('normal') as Float32Array;
  const vPorSitio = new Map<string, Set<string>>();
  const normalesPorSitio = new Map<string, Set<string>>();
  for (let i = 0; i < v.vertices; i++) {
    const k = clave(leer(pos, i));
    const s = vPorSitio.get(k) ?? new Set<string>();
    s.add(((uv[2 * i + 1] as number) * 1e4).toFixed(0));
    vPorSitio.set(k, s);
    const q = normalesPorSitio.get(k) ?? new Set<string>();
    q.add(clave(leer(nor, i)));
    normalesPorSitio.set(k, q);
  }
  const conVarios = [...vPorSitio.values()].filter((s) => s.size > 1).length;
  /* Una unión viva: un sitio con dos normales distintas (la costura repite el vértice con la misma). */
  const vivos = [...normalesPorSitio.values()].filter((s) => s.size >= 2).length;
  comprobar(`torno: en cada uno de los ${vPorSitio.size} sitios del balaustre, una sola v (sigue por las ${vivos} uniones vivas)`, conVarios === 0 && vivos >= 24, {
    conVarios,
    vivos,
  });
}

/* ═══ 4. El coste, contado ═══ */

paso('el coste de CPU por triángulo, contado');
interface Cuenta {
  vertices: number;
  matrices: number;
  raices: number;
  trig: number;
  triangulaciones: number;
  triangulos: number;
}
/** Cuenta lo que hace `escribir` en un molde nuevo. Parchea Math y three SÓLO mientras escribe. */
function contar(escribir: (m: Molde) => void, conMatriz: boolean): Cuenta {
  const c: Cuenta = { vertices: 0, matrices: 0, raices: 0, trig: 0, triangulaciones: 0, triangulos: 0 };
  class Contador extends Molde {
    override vertice(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, w: number): number {
      c.vertices++;
      return super.vertice(x, y, z, nx, ny, nz, u, w);
    }
  }
  const m = new Contador();
  const M = Math as unknown as Record<string, (...a: number[]) => number>;
  const V = THREE.Vector3.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  const N = THREE.Matrix3.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  const S = THREE.ShapeUtils as unknown as Record<string, (...a: unknown[]) => unknown>;
  const guardados: [Record<string, (...a: never[]) => unknown>, string, (...a: never[]) => unknown][] = [];
  const envolver = <T extends (...a: never[]) => unknown>(obj: Record<string, T>, nombre: string, contador: () => void): void => {
    const original = obj[nombre] as T;
    guardados.push([obj as Record<string, (...a: never[]) => unknown>, nombre, original]);
    obj[nombre] = function (this: unknown, ...a: never[]) {
      contador();
      return original.apply(this, a);
    } as unknown as T;
  };
  for (const f of ['sqrt', 'hypot']) envolver(M, f, () => c.raices++);
  for (const f of ['sin', 'cos', 'tan', 'atan2', 'acos', 'asin']) envolver(M, f, () => c.trig++);
  for (const f of ['applyMatrix4', 'applyMatrix3']) envolver(V, f, () => c.matrices++);
  envolver(N, 'getNormalMatrix', () => c.matrices++);
  envolver(S, 'triangulateShape', () => c.triangulaciones++);
  try {
    if (conMatriz) m.con(MATRIZ, () => escribir(m));
    else escribir(m);
  } finally {
    for (const [obj, nombre, original] of guardados.reverse()) obj[nombre] = original;
  }
  c.triangulos = m.triangulos;
  return c;
}
/** Una pieza representativa de cada primitiva (y de las dos de hoy con las que se comparan). */
const PIEZAS_DE_COSTE: [string, (m: Molde) => void][] = [
  ['caja', (m) => m.caja(0, 0, 0, 1, 1, 1)],
  ['cilindro', (m) => m.cilindro(0, 0, 0, 1, 0.2, 0.2, 8, true)],
  ['torno', (m) => m.torno(0, 0, BALAUSTRE, 12)],
  ['cajaBiselada', (m) => m.cajaBiselada(0, 0, 0, 1, 0.5, 0.4, 0.03)],
  ['perfil suave', (m) => m.perfil(marquesina(), -0.4, 0.4, { suave: Math.PI / 5 })],
  ['seccionado', (m) => m.seccionado(SECCIONES_COCHE, { aristasVivas: [0, 1, 2, 9] })],
  ['extruirPerfil', (m) => m.extruirPerfil(EDIFICIO, CORNISA, { cerrado: true })],
];
/**
 * LA TABLA DE COSTE, ESCRITA: por triángulo, sin matriz y con ella (`con`): vértices, productos de
 * matriz, raíces, trigonometría, y el total de esas cuatro. Es lo que O4-CIERRE mira para `porFotograma`:
 * una primitiva por encima de 1,5 veces la caja (con matriz, que es como se ponen las piezas) pide revisar
 * el trabajo por fotograma de la ventana. Si una primitiva cambia, se vuelve a contar y se reescribe.
 */
const TABLA_DE_COSTE: Readonly<Record<string, { sin: readonly [number, number, number, number]; con: readonly [number, number, number, number] }>> = {
  /*                vért  mat   raíz  trig           vért  mat   raíz  trig       total con matriz, ×caja */
  caja: { sin: [2, 0, 0.33, 0], con: [2, 4.08, 2.33, 0] } /* 8,41  ×1,00 */,
  cilindro: { sin: [1.19, 0, 0.28, 1.69], con: [1.19, 2.41, 1.47, 1.69] } /* 6,76  ×0,80 */,
  torno: { sin: [0.86, 0, 0.07, 0.3], con: [0.86, 1.72, 0.93, 0.3] } /* 3,81  ×0,45 */,
  cajaBiselada: { sin: [2.18, 0, 0.55, 0], con: [2.18, 4.39, 2.73, 0] } /* 9,30  ×1,11 */,
  'perfil suave': { sin: [1.57, 0, 0.48, 0.54], con: [1.57, 3.15, 2.05, 0.54] } /* 7,31  ×0,87 */,
  seccionado: { sin: [1.9, 0, 3.55, 0.01], con: [1.9, 3.8, 5.45, 0.01] } /* 11,16 ×1,33 */,
  extruirPerfil: { sin: [2, 0, 0.38, 0.03], con: [2, 4.03, 2.38, 0.03] } /* 8,44  ×1,00 */,
};
const redondo = (x: number): number => Math.round(x * 100) / 100;
const porTri = (c: Cuenta): [number, number, number, number] => [
  redondo(c.vertices / c.triangulos),
  redondo(c.matrices / c.triangulos),
  redondo(c.raices / c.triangulos),
  redondo(c.trig / c.triangulos),
];
const total = (f: readonly [number, number, number, number]): number => redondo(f[0] + f[1] + f[2] + f[3]);
const contadas = new Map<string, { sin: [number, number, number, number]; con: [number, number, number, number]; tri: number; triangulaciones: number }>();
for (const [nombre, escribir] of PIEZAS_DE_COSTE) {
  const sin = contar(escribir, false);
  const con = contar(escribir, true);
  contadas.set(nombre, { sin: porTri(sin), con: porTri(con), tri: sin.triangulos, triangulaciones: sin.triangulaciones });
}
const cajaCon = total((contadas.get('caja') as { con: [number, number, number, number] }).con);
nota('pieza            tri  | sin matriz: vért mat raíz trig = total | con matriz: vért mat raíz trig = total | ×caja | earcut');
for (const [nombre, c] of contadas) {
  const veces = redondo(total(c.con) / cajaCon);
  nota(
    `${nombre.padEnd(15)} ${String(c.tri).padStart(4)}  | ${c.sin.map((x) => x.toFixed(2)).join(' ')} = ${total(c.sin).toFixed(2)} | ` +
      `${c.con.map((x) => x.toFixed(2)).join(' ')} = ${total(c.con).toFixed(2)} | ×${veces.toFixed(2)}${veces > 1.5 ? ' (pasa de 1,5: O4-CIERRE)' : ''} | ${c.triangulaciones}`,
  );
}
{
  const distintas: string[] = [];
  for (const [nombre, c] of contadas) {
    const escrita = TABLA_DE_COSTE[nombre];
    const igual = (a: readonly number[], b: readonly number[]): boolean => a.every((x, i) => Math.abs(x - (b[i] as number)) < 0.005);
    if (escrita === undefined || !igual(c.sin, escrita.sin) || !igual(c.con, escrita.con)) distintas.push(`${nombre}: sin ${c.sin.join('/')} con ${c.con.join('/')}`);
  }
  comprobar(`la tabla de coste escrita es la contada (${contadas.size} piezas)`, contadas.size === PIEZAS_DE_COSTE.length && distintas.length === 0, distintas);
}

terminar({
  escritas: 161,
  enVerde: 'Las primitivas del molde giran hacia su normal, cierran, llevan UV en metros, no guardan cuando no deben y cuestan lo escrito.',
});
