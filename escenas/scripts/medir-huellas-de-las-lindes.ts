/**
 * LAS HUELLAS DE LO QUE ESTORBA EN LAS LINDES, MEDIDAS EN `tablero.glb`.
 *
 *   npx tsx escenas/scripts/medir-huellas-de-las-lindes.ts
 *
 * Mide y REESCRIBE `shared/arcade/juegos/lindes-huellas.ts`. Y exporta `medirLasHuellas`, que
 * es lo que `verify:lindes-mundo` vuelve a correr para exigir que la tabla escrita sigue siendo
 * lo que dicen los modelos: si alguien recompila el pack, se pone rojo ahí.
 *
 * ═══ POR QUÉ UNA TABLA LITERAL Y NO MEDIR AL CARGAR ═══
 *
 * Porque quien la usa es `lindes-mundo.ts`, que vive en `shared/` y corre en el servidor y en
 * Hermes: no abre un `.glb` de cuatro megas, y no debe. Y porque una tabla escrita a ojo se
 * queda vieja EN SILENCIO el día que alguien recompile el pack —es lo que la cabecera de
 * `ANCHO_EN_PACK` confiesa de la suya—. Así que es literal, sale de aquí, y la vigila un
 * comprobador que vuelve a medir.
 *
 * ═══ QUÉ SE MIDE: LA PLANTA DE LO QUE HAY POR DEBAJO DE LA CABEZA ═══
 *
 * La caja en planta —`x` y `z` del modelo— de su geometría HASTA la altura de una persona. No
 * la caja entera, porque lo que para a alguien es lo que tiene delante del cuerpo, no lo que
 * vuela por encima: medido, la corona de una atalaya sobresale 0,13 del pack por cada lado de lo
 * que tiene a la altura de la cabeza —una unidad del mundo a su escala— y el adarve del muro
 * 0,1 hacia un lado —1,3 unidades—. Con la caja entera, el paseante se pararía a un palmo de una
 * pared que no toca.
 *
 * La altura es la de una persona a la escala MÁS PEQUEÑA a la que se pone algo que estorba, que
 * es la de las torres: `ALTURA_DE_UNA_PERSONA / (ESCALA_DEL_PACK × ESCALA_DE_LA_TORRE)` = 0,332
 * del pack. A cualquier otra escala una persona mide menos que eso en unidades del modelo, así
 * que la planta medida cubre siempre por lo menos hasta su cabeza. `verify:lindes-mundo` exige
 * que ninguna pieza que estorba se ponga más pequeña que una torre.
 *
 * Se RECORTAN los triángulos contra ese plano, no se filtran los vértices: una cara inclinada
 * que empieza por debajo y sale hacia fuera por encima —un alero— tiene sus vértices lejos del
 * corte, y filtrarlos perdería justo el trozo que cruza la altura.
 *
 * ═══ EL ORIGEN NO ESTÁ EN EL CENTRO, Y POR ESO SE GUARDA LA CAJA Y NO ANCHO Y FONDO ═══
 *
 * El reparto pone cada pieza por su ORIGEN, y no todos los modelos lo tienen en el medio. La
 * ermita va de −1,05 a +0,25 del pack en `z`: su centro está 0,4 detrás del origen, que a su
 * escala son siete unidades del mundo. Con ancho y fondo centrados, su caja habría quedado
 * media nave corrida. Se guardan las cuatro cotas.
 *
 * ═══ Y LA PUERTA TIENE UN HUECO ═══
 *
 * `muro-puerta` es un lienzo con un portón en medio. Cortado a la altura de andar, el muro
 * grueso —0,3 del pack a cada lado de su eje— se interrumpe y en medio sólo queda la hoja,
 * de 0,09 como mucho. Ese hueco es por donde se cruza: se mide como el tramo alrededor del eje
 * del modelo en el que ninguna rodaja de muro pasa de `MEDIO_GRUESO_DE_LA_HOJA`, a todas las
 * alturas hasta la cabeza. La hoja no para: una muralla con puerta se cruza por la puerta.
 *
 * ═══ Y DE LAS PIEDRAS, ADEMÁS, EL ALTO Y EL RADIO ═══
 *
 * Las piedras, las rocas y los tocones estorban sólo si, puestos, pasan de la cintura de quien
 * anda (`comoEstorba`, en `lindes-piezas.ts`). Para contestarlo en `shared/` hace falta lo que
 * mide cada modelo de alto —lo más alto de su geometría, desde el origen, que es el suelo donde
 * se apoya—, y se mide aquí con lo demás.
 *
 * Y su RADIO: lo más lejos del origen que llega su planta, medido en el mismo trozo de abajo que
 * la huella. El reparto las pone giradas de cualquier manera, y a un ángulo que no es un cuarto el
 * mundo no puede girar la caja: tiene que cubrirlas con algo que no cambie al girar. El mayor
 * semieje de la caja sólo vale para lo que es redondo de verdad, y la piedra no lo es —su punto
 * más lejano está un cuarto más allá—; el radio vale para todo, se gire como se gire.
 *
 * Su huella no pide otra altura de corte: son más bajas que la de la huella, así que lo que se
 * mide de ellas es su planta ENTERA. Por qué eso basta está en la cabecera de `comoEstorba`.
 *
 * ═══ EL REDONDEO VA HACIA FUERA, Y EL DEL HUECO HACIA DENTRO ═══
 *
 * La tabla lleva cuatro decimales —0,0001 del pack son dos milésimas del mundo a la escala
 * mayor—, y se redondea hacia el lado que no deja pasar: la caja crece y el hueco encoge; el
 * radio crece, y el alto también, que hace que una piedra pase antes de la cintura. Una
 * tabla redondeada al más cercano podría dejar asomar una décima de milímetro de muro y, lo
 * que es peor, un comprobador que compara con tolerancia es un comprobador que alguien ensancha.
 * Éste compara EXACTO: vuelve a medir, redondea igual, y exige los mismos números.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import type { Node } from '@gltf-transform/core';
import {
  ALTURA_DE_UNA_PERSONA,
  ESCALA_DEL_PACK,
  ESCALA_DE_LA_TORRE,
} from '../../shared/arcade/juegos/lindes-medidas';
import { comoEstorba, PIEZA } from '../../shared/arcade/juegos/lindes-piezas';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');

/** El `.glb` del que salen las piezas del reparto. */
export const TABLERO_GLB = path.join(RAIZ, 'escenas', 'modelos', 'tablero.glb');

/** Dónde se escribe la tabla. */
export const TABLA = path.join(RAIZ, 'shared', 'arcade', 'juegos', 'lindes-huellas.ts');

/**
 * Hasta qué altura del modelo, en unidades del pack, se mide la planta: una persona a la escala
 * de una torre, que es la más pequeña a la que se pone algo que estorba. Ver la cabecera.
 */
export const ALTURA_DE_LA_HUELLA_EN_PACK = ALTURA_DE_UNA_PERSONA / (ESCALA_DEL_PACK * ESCALA_DE_LA_TORRE);

/**
 * El medio grueso por encima del cual una rodaja de `muro-puerta` es MURO y no la hoja del
 * portón. Medido a la altura de andar: la hoja no pasa de 0,085 del pack a cada lado del eje, y
 * el muro llega a 0,3. Cualquier número entre los dos los separa; se toma la mitad del muro.
 */
export const MEDIO_GRUESO_DE_LA_HOJA = 0.15;

/** Cuántas rodajas se cortan para buscar el hueco de la puerta, hasta la altura de la huella. */
const RODAJAS_DEL_HUECO = 12;

/** Cuántos decimales lleva la tabla. */
const DECIMALES = 4;

/** Una caja en planta, en unidades del pack y con el origen donde el reparto pone la pieza. */
export interface CajaEnPlanta {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

/** El alto de un modelo y el radio de su planta, en unidades del pack. */
export interface AltoYRadio {
  readonly alto: number;
  readonly radio: number;
}

/** Lo que devuelve medir: redondeado como va a la tabla, y en crudo para quien lo quiera ver. */
export interface HuellasMedidas {
  readonly altura: number;
  readonly huellas: Readonly<Record<string, CajaEnPlanta>>;
  readonly crudas: Readonly<Record<string, CajaEnPlanta>>;
  /** De lo que estorba sólo si pasa de la cintura: su alto y su radio, redondeados hacia fuera. */
  readonly altosYRadios: Readonly<Record<string, AltoYRadio>>;
  readonly altosYRadiosCrudos: Readonly<Record<string, AltoYRadio>>;
  readonly hueco: { readonly x0: number; readonly x1: number };
  readonly huecoCrudo: { readonly x0: number; readonly x1: number };
  /** Cuántos triángulos se miraron, por pieza: el suelo de «no se midió nada». */
  readonly triangulos: Readonly<Record<string, number>>;
}

/**
 * Las piezas que hay que medir: todas las que PUEDEN estorbar, por la regla de `comoEstorba`. Las
 * piedras entran todas, pasen o no de la cintura donde las ponga hoy el reparto: la pregunta es por
 * pieza puesta, y la tabla tiene que poder contestarla a cualquier escala.
 */
export function piezasQueSeMiden(): string[] {
  return (Object.values(PIEZA) as string[])
    .filter((p) => comoEstorba(p) !== 'nada')
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/* ─── Aritmética de matrices, la justa ──────────────────────────────────── */

type Matriz = readonly number[];
const IDENTIDAD: Matriz = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** `a · b`, en columnas como las da glTF. */
function componer(a: Matriz, b: Matriz): number[] {
  const r = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let f = 0; f < 4; f++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += (a[k * 4 + f] as number) * (b[c * 4 + k] as number);
      r[c * 4 + f] = s;
    }
  }
  return r;
}

function aplicar(m: Matriz, v: readonly number[]): [number, number, number] {
  const x = v[0] as number;
  const y = v[1] as number;
  const z = v[2] as number;
  return [
    (m[0] as number) * x + (m[4] as number) * y + (m[8] as number) * z + (m[12] as number),
    (m[1] as number) * x + (m[5] as number) * y + (m[9] as number) * z + (m[13] as number),
    (m[2] as number) * x + (m[6] as number) * y + (m[10] as number) * z + (m[14] as number),
  ];
}

/**
 * LOS TRIÁNGULOS DE UNA PIEZA, en coordenadas del modelo.
 *
 * El compilador mete cada pieza como un nodo con nuestro nombre y le cuelga debajo lo que traía
 * el pack, así que se baja por el subárbol acumulando las matrices de los HIJOS —la del nodo con
 * nombre no, porque la escena se la quita al cargar (`partesDe`, en `Lindes.tsx`): el origen del
 * modelo es el del nodo con nombre—.
 */
function triangulosDe(nodo: Node): [number, number, number][][] {
  const salida: [number, number, number][][] = [];
  const bajar = (n: Node, m: Matriz): void => {
    for (const prim of n.getMesh()?.listPrimitives() ?? []) {
      /* 4 es TRIANGLES. El pack no trae otra cosa; si un día la trae, mejor saberlo que medir mal. */
      if (prim.getMode() !== 4) {
        throw new Error(`«${nodo.getName()}» trae una primitiva de modo ${String(prim.getMode())}, no triángulos`);
      }
      const pos = prim.getAttribute('POSITION');
      if (pos === null) continue;
      const indices = prim.getIndices();
      const cuantos = indices === null ? pos.getCount() : indices.getCount();
      const v = [0, 0, 0];
      const vertice = (k: number): [number, number, number] => {
        pos.getElement(indices === null ? k : indices.getScalar(k), v);
        return aplicar(m, v);
      };
      for (let k = 0; k + 2 < cuantos; k += 3) salida.push([vertice(k), vertice(k + 1), vertice(k + 2)]);
    }
    for (const hijo of n.listChildren()) bajar(hijo, componer(m, hijo.getMatrix()));
  };
  bajar(nodo, IDENTIDAD);
  return salida;
}

/** La caja en planta de lo que un triángulo tiene por debajo de `h`. */
function plantaBajo(tris: readonly (readonly [number, number, number][])[], h: number): CajaEnPlanta | null {
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let z0 = Number.POSITIVE_INFINITY;
  let z1 = Number.NEGATIVE_INFINITY;
  const meter = (x: number, z: number): void => {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (z < z0) z0 = z;
    if (z > z1) z1 = z;
  };
  for (const t of tris) {
    for (let a = 0; a < 3; a++) {
      const p = t[a] as [number, number, number];
      const q = t[(a + 1) % 3] as [number, number, number];
      if (p[1] <= h) meter(p[0], p[2]);
      /* Y donde el lado cruza la altura, el punto de corte: es un vértice del trozo de abajo. */
      if ((p[1] <= h) !== (q[1] <= h)) {
        const s = (h - p[1]) / (q[1] - p[1]);
        meter(p[0] + s * (q[0] - p[0]), p[2] + s * (q[2] - p[2]));
      }
    }
  }
  return x0 <= x1 && z0 <= z1 ? { x0, x1, z0, z1 } : null;
}

/** Lo más alto de un modelo: hasta dónde llega por encima del suelo donde se apoya. */
function altoDe(tris: readonly (readonly [number, number, number][])[]): number {
  let alto = Number.NEGATIVE_INFINITY;
  for (const t of tris) for (const p of t) if (p[1] > alto) alto = p[1];
  return alto;
}

/**
 * EL RADIO DE LA PLANTA de lo que un modelo tiene por debajo de `h`: lo más lejos del origen que
 * llega en `x` y `z`. Se miran los mismos puntos que en `plantaBajo` —los vértices de abajo y los
 * cortes de los lados con la altura—, y basta: lo recortado de un triángulo es un polígono convexo,
 * y lo más lejano de un polígono convexo a un punto es siempre uno de sus vértices.
 */
function radioBajo(tris: readonly (readonly [number, number, number][])[], h: number): number {
  let radio = Number.NEGATIVE_INFINITY;
  const meter = (x: number, z: number): void => {
    const r = Math.hypot(x, z);
    if (r > radio) radio = r;
  };
  for (const t of tris) {
    for (let a = 0; a < 3; a++) {
      const p = t[a] as [number, number, number];
      const q = t[(a + 1) % 3] as [number, number, number];
      if (p[1] <= h) meter(p[0], p[2]);
      if ((p[1] <= h) !== (q[1] <= h)) {
        const s = (h - p[1]) / (q[1] - p[1]);
        meter(p[0] + s * (q[0] - p[0]), p[2] + s * (q[2] - p[2]));
      }
    }
  }
  return radio;
}

/**
 * EL HUECO DE LA PUERTA: el tramo alrededor de `x = 0` en el que, a todas las alturas de andar,
 * no hay más que la hoja. Ver la cabecera.
 */
function huecoDeLaPuerta(tris: readonly (readonly [number, number, number][])[], h: number): { x0: number; x1: number } {
  let izquierda = Number.NEGATIVE_INFINITY;
  let derecha = Number.POSITIVE_INFINITY;
  for (let k = 1; k <= RODAJAS_DEL_HUECO; k++) {
    const y = (h * k) / RODAJAS_DEL_HUECO;
    for (const t of tris) {
      /* El segmento que deja el triángulo al cortarlo con el plano `y`. */
      const corte: [number, number][] = [];
      for (let a = 0; a < 3; a++) {
        const p = t[a] as [number, number, number];
        const q = t[(a + 1) % 3] as [number, number, number];
        if ((p[1] <= y) !== (q[1] <= y)) {
          const s = (y - p[1]) / (q[1] - p[1]);
          corte.push([p[0] + s * (q[0] - p[0]), p[2] + s * (q[2] - p[2])]);
        }
      }
      if (corte.length !== 2) continue;
      const [a, b] = corte as [[number, number], [number, number]];
      if (Math.max(Math.abs(a[1]), Math.abs(b[1])) <= MEDIO_GRUESO_DE_LA_HOJA) continue;
      const desde = Math.min(a[0], b[0]);
      const hasta = Math.max(a[0], b[0]);
      if (hasta <= 0) izquierda = Math.max(izquierda, hasta);
      else if (desde >= 0) derecha = Math.min(derecha, desde);
      else throw new Error(`«muro-puerta» tiene muro cruzando el eje a la altura ${y.toFixed(3)}: no hay hueco`);
    }
  }
  if (!Number.isFinite(izquierda) || !Number.isFinite(derecha)) {
    throw new Error('«muro-puerta» no tiene muro a uno de los dos lados del hueco: no es una puerta');
  }
  return { x0: izquierda, x1: derecha };
}

const ESCALON = 10 ** DECIMALES;
/*
 * Una milésima de escalón de holgura, que son 10⁻⁷ del pack: lo que el `float32` del `.glb` no
 * distingue. Sin ella, el −0,3 del muro —que el fichero guarda como −0,30000001192— salía
 * −0,3001 al redondear hacia fuera, y la tabla decía una cosa que el modelo no dice.
 */
const hacia = (v: number, arriba: boolean): number =>
  (arriba ? Math.ceil(v * ESCALON - 1e-3) : Math.floor(v * ESCALON + 1e-3)) / ESCALON;

/** Hacia fuera: la caja crece. */
function redondearCaja(c: CajaEnPlanta): CajaEnPlanta {
  return { x0: hacia(c.x0, false), x1: hacia(c.x1, true), z0: hacia(c.z0, false), z1: hacia(c.z1, true) };
}

/** MIDE LAS HUELLAS. Lo corre este guion para escribir la tabla y `verify:lindes-mundo` para vigilarla. */
export async function medirLasHuellas(glb: string = TABLERO_GLB): Promise<HuellasMedidas> {
  const documento = await new NodeIO().read(glb);
  const raices = documento.getRoot().listScenes()[0]?.listChildren() ?? [];
  const h = ALTURA_DE_LA_HUELLA_EN_PACK;
  const huellas: Record<string, CajaEnPlanta> = {};
  const crudas: Record<string, CajaEnPlanta> = {};
  const altosYRadios: Record<string, AltoYRadio> = {};
  const altosYRadiosCrudos: Record<string, AltoYRadio> = {};
  const triangulos: Record<string, number> = {};
  let hueco: { x0: number; x1: number } | null = null;
  let huecoCrudo: { x0: number; x1: number } | null = null;
  for (const pieza of piezasQueSeMiden()) {
    const nodo = raices.find((n) => n.getName() === pieza);
    if (nodo === undefined) throw new Error(`«${pieza}» no está en ${path.relative(RAIZ, glb)}`);
    const tris = triangulosDe(nodo);
    triangulos[pieza] = tris.length;
    const planta = plantaBajo(tris, h);
    if (planta === null) throw new Error(`«${pieza}» no tiene nada por debajo de ${h.toFixed(3)} del pack`);
    crudas[pieza] = planta;
    huellas[pieza] = redondearCaja(planta);
    if (comoEstorba(pieza) === 'si-pasa-de-la-cintura') {
      const crudo = { alto: altoDe(tris), radio: radioBajo(tris, h) };
      altosYRadiosCrudos[pieza] = crudo;
      /* Hacia fuera los dos: la piedra pasa antes de la cintura, y su caja girada crece. */
      altosYRadios[pieza] = { alto: hacia(crudo.alto, true), radio: hacia(crudo.radio, true) };
    }
    if (comoEstorba(pieza) === 'puerta') {
      huecoCrudo = huecoDeLaPuerta(tris, h);
      /* Hacia dentro: el hueco encoge. */
      hueco = { x0: hacia(huecoCrudo.x0, true), x1: hacia(huecoCrudo.x1, false) };
    }
  }
  if (hueco === null || huecoCrudo === null) throw new Error('ninguna pieza es una puerta, y la muralla tiene que tenerla');
  return { altura: h, huellas, crudas, altosYRadios, altosYRadiosCrudos, hueco, huecoCrudo, triangulos };
}

/** El fichero de la tabla, tal cual se escribe. */
export function textoDeLaTabla(m: HuellasMedidas): string {
  const porOrden = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  const filas = Object.keys(m.huellas)
    .sort(porOrden)
    .map((pieza) => {
      const c = m.huellas[pieza] as CajaEnPlanta;
      return `  '${pieza}': { x0: ${String(c.x0)}, x1: ${String(c.x1)}, z0: ${String(c.z0)}, z1: ${String(c.z1)} },`;
    });
  const filasDeAltoYRadio = Object.keys(m.altosYRadios)
    .sort(porOrden)
    .map((pieza) => {
      const a = m.altosYRadios[pieza] as AltoYRadio;
      return `  '${pieza}': { alto: ${String(a.alto)}, radio: ${String(a.radio)} },`;
    });
  return `/**
 * LAS HUELLAS DE LO QUE ESTORBA EN LAS LINDES — TABLA GENERADA: NO SE EDITA A MANO.
 *
 *   npx tsx escenas/scripts/medir-huellas-de-las-lindes.ts
 *
 * Es la caja en planta de cada modelo de \`tablero.glb\` que estorba al andar, medida por debajo
 * de la cabeza de una persona, con el origen donde el reparto pone la pieza y en unidades del
 * pack; y, de las piedras, las rocas y los tocones, que estorban sólo si pasan de la cintura, su
 * alto y el radio de su planta. Cómo se mide y por qué así está en la cabecera del guion que la
 * escribe; quién estorba y quién no, en \`comoEstorba\` (\`lindes-piezas.ts\`); y cómo se convierte
 * en una caja del mundo —escala, largo, giro—, en \`lindes-mundo.ts\`.
 *
 * Es literal porque la usa \`shared/\`, que corre en el servidor y en Hermes y no abre un \`.glb\`.
 * \`verify:lindes-mundo\` la vuelve a medir y exige los mismos números: si se recompila el pack,
 * se pone rojo ahí, y se arregla volviendo a correr el guion, no tocando esto.
 */

/** Una caja en planta, en unidades del pack. \`x0 < x1\`, \`z0 < z1\`. */
export interface HuellaDelModelo {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

/** Hasta qué altura del modelo se midió: una persona a la escala de una torre. */
export const ALTURA_DE_LA_HUELLA_EN_PACK = ${String(m.altura)};

/** La huella de cada pieza que estorba. */
export const HUELLA_DEL_MODELO: Readonly<Record<string, HuellaDelModelo>> = {
${filas.join('\n')}
};

/** El alto de un modelo y el radio de su planta, en unidades del pack. */
export interface AltoYRadioDelModelo {
  /** Lo más alto de su geometría, desde el suelo donde se apoya. */
  readonly alto: number;
  /** Lo más lejos del sitio donde se pone que llega su planta: lo que ocupa girado de cualquier manera. */
  readonly radio: number;
}

/** De lo que estorba sólo si pasa de la cintura: las piedras, las rocas y los tocones. */
export const ALTO_Y_RADIO_DEL_MODELO: Readonly<Record<string, AltoYRadioDelModelo>> = {
${filasDeAltoYRadio.join('\n')}
};

/**
 * El hueco de \`muro-puerta\`, a lo largo del muro —la \`x\` del modelo—: por aquí se cruza. Lo de
 * los dos lados es muro y estorba.
 */
export const HUECO_DE_LA_PUERTA: { readonly x0: number; readonly x1: number } = {
  x0: ${String(m.hueco.x0)},
  x1: ${String(m.hueco.x1)},
};
`;
}

/* ─── Cuando se corre, escribe ──────────────────────────────────────────── */

const esElGuion = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (esElGuion) {
  const m = await medirLasHuellas();
  fs.writeFileSync(TABLA, textoDeLaTabla(m), 'utf8');
  console.log(`\n${String(Object.keys(m.huellas).length)} huellas medidas hasta ${m.altura.toFixed(4)} del pack:\n`);
  for (const pieza of Object.keys(m.huellas).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    const c = m.huellas[pieza] as CajaEnPlanta;
    console.log(
      `  ${pieza.padEnd(18)} x ${c.x0.toFixed(4)} … ${c.x1.toFixed(4)}   z ${c.z0.toFixed(4)} … ${c.z1.toFixed(4)}   (${String(m.triangulos[pieza])} triángulos)`,
    );
  }
  console.log('\n  de lo que estorba sólo si pasa de la cintura:');
  for (const pieza of Object.keys(m.altosYRadios).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    const a = m.altosYRadios[pieza] as AltoYRadio;
    const c = m.huellas[pieza] as CajaEnPlanta;
    const semieje = Math.max(-c.x0, c.x1, -c.z0, c.z1);
    console.log(
      `  ${pieza.padEnd(18)} alto ${a.alto.toFixed(4)}   radio ${a.radio.toFixed(4)} (mayor semieje de su caja ${semieje.toFixed(4)})`,
    );
  }
  console.log(`\n  hueco de la puerta: x ${m.hueco.x0.toFixed(4)} … ${m.hueco.x1.toFixed(4)}`);
  console.log(`\nEscrita ${path.relative(process.cwd(), TABLA)}`);
}
