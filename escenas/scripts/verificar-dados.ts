/**
 * ¿SIRVE `dados.glb` PARA LOS DOS CLIENTES, Y ENSEÑA CADA NÚMERO POR SU CARA?
 *
 * ═══ QUÉ COMPRA ESTE GUION ═══
 *
 * `compilar-dados.ts` deja en `escenas/modelos/dados.glb` el D6 de KayKit horneado y
 * pintado con los dos colores de las fichas, y en `escenas/caras-del-dado.ts` la tabla
 * de qué cara enseña cada valor. Esto vuelve a abrir los dos DESDE FUERA (el `.glb` con
 * `@gltf-transform`, que no toca los nombres, y con el `GLTFLoader` de three, que sí) y
 * comprueba lo que, si estuviera mal, no daría ningún error en ninguna consola:
 *
 *   · Que el fichero es lo que se midió del pack: un solo nodo `MODELO.dado`, 521
 *     vértices, 662 triángulos, un cubo de `ARISTA_DEL_D6_EN_EL_PACK` centrado. Otro
 *     D6 compilado en su lugar cargaría igual y costaría otros triángulos.
 *   · Que lleva `COLOR_0` como bytes lineales, NINGUNA textura, imagen ni UV, y que el
 *     color son EXACTAMENTE dos tonos, los de `COLOR_DEL_NUMERO` y `COLOR_DEL_PUNTO`
 *     convertidos aquí con la curva sRGB de la norma, escrita aparte de `hornear.ts`
 *     para que una conversión torcida no se compruebe contra sí misma. Un dado del
 *     blanco azulado del pack no da error: es un dado de otro juego que las fichas.
 *   · Que contando los puntos del fichero salen seis caras con 1..6, 21 en total y las
 *     opuestas sumando 7, y que `caras-del-dado.ts` es BYTE A BYTE lo que esa cuenta
 *     produce y lo que exporta coincide valor a valor. Con la tabla desfasada, el dado
 *     se asienta y enseña OTRO número, sin un solo aviso.
 *   · Y lo que hace three al cargar: el nodo llega con su nombre, la malla con el color
 *     por vértice encendido y sin mapa, y ningún atributo entrelazado (ver `hornear.ts`).
 *
 * Lo que este guion NO prueba, dicho para que nadie se confíe: que se VEA bien, ni que
 * los puntos se lean a 23 puntos de pantalla en un SE. Eso exige el banco y ojos.
 */
import { NodeIO } from '@gltf-transform/core';
import type { Accessor, Primitive } from '@gltf-transform/core';
import fs from 'node:fs';
import path from 'node:path';
import { Box3, PropertyBinding } from 'three';
import type { Mesh, MeshStandardMaterial, Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CARA_DEL_VALOR, NORMAL_DEL_VALOR, normalDelValor } from '../caras-del-dado';
import { ARISTA_DEL_D6_EN_EL_PACK, COLOR_DEL_NUMERO, COLOR_DEL_PUNTO } from '../dados';
import { EN_DADOS_GLB, MODELO, NOMBRE_QUE_SOBREVIVE, nombresEnElGlb } from '../nombres';
import { CARAS, caraDeCadaValor, cuentaLosPuntos, normalDeLaCara, problemasDeUnDado, textoDeCarasDelDado } from './caras-del-d6';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `: ${JSON.stringify(detalle)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..');
const FICHERO = path.join(RAIZ, 'modelos', 'dados.glb');
const FICHERO_DE_CARAS = path.join(RAIZ, 'caras-del-dado.ts');

/*
 * LO QUE TIENE QUE HABER DENTRO, dicho aquí y no importado del compilador: este guion
 * comprueba el fichero de verdad por si el que hay no salió de aquel compilador.
 */
const VERTICES = 521;
const TRIANGULOS = 662;
/** Cada punto del D6_A son nueve vértices, medido: 21 puntos, 189 vértices de punto. */
const VERTICES_POR_PUNTO = 9;
/** El fichero pesa 19 kB; 100 es el techo que delata una textura o unas UV que se colaran. */
const TOPE_DE_BYTES = 100 * 1024;
const HOLGURA_DE_LA_CAJA = 0.01;

/** sRGB → byte lineal con la curva de la norma, escrita aquí y no importada del horno. */
function byteLineal(componente: number): number {
  const c = componente / 255;
  const lineal = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return Math.round(lineal * 255);
}
function bytesDe(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => byteLineal(parseInt(hex.slice(i, i + 2), 16))) as [number, number, number];
}
const CUERPO = bytesDe(COLOR_DEL_NUMERO);
const PUNTO = bytesDe(COLOR_DEL_PUNTO);
const clave = (r: number, g: number, b: number): string => `${String(r)},${String(g)},${String(b)}`;

// ---------------------------------------------------------------------------
paso('El fichero existe y pesa lo que pesa un dado');
// ---------------------------------------------------------------------------

comprobar('dados.glb está compilado en escenas/modelos/', fs.existsSync(FICHERO), FICHERO);
if (!fs.existsSync(FICHERO)) {
  console.log('\nSe rehace con `npm run compilar:dados -w escenas`; `arte/README.md` dice de dónde sale el pack.');
  process.exit(1);
}
const bytesDelFichero = fs.statSync(FICHERO).size;
comprobar('y pesa menos de 100 kB: sin textura, sin UV, bytes y no flotantes', bytesDelFichero < TOPE_DE_BYTES, { kB: Math.round(bytesDelFichero / 1024) });

// ---------------------------------------------------------------------------
paso('Dentro hay un solo dado, el del pack, con el color de las fichas y nada más');
// ---------------------------------------------------------------------------

const doc = await new NodeIO().read(FICHERO);
const root = doc.getRoot();
const raices = root.listScenes().flatMap((e) => e.listChildren());

comprobar(
  'un único nodo raíz, llamado MODELO.dado, con un nombre que sobrevive a GLTFLoader',
  root.listScenes().length === 1 && raices.length === 1 && raices[0]?.getName() === MODELO.dado && NOMBRE_QUE_SOBREVIVE.test(MODELO.dado),
  raices.map((r) => r.getName()),
);
comprobar(
  'y ese nombre vive en EN_DADOS_GLB y no se le exige a tablero.glb: los dos catálogos se unen sin pisarse',
  EN_DADOS_GLB.has(MODELO.dado) && !nombresEnElGlb().includes(MODELO.dado),
);

const mallas = root.listMeshes();
const prims = mallas.flatMap((m) => m.listPrimitives());
comprobar('una malla con una primitiva de triángulos indexados', mallas.length === 1 && prims.length === 1 && prims[0]?.getIndices() !== null && prims[0]?.getMode() === 4, {
  mallas: mallas.length,
  primitivas: prims.length,
});
const prim = prims[0] as Primitive;
const color = prim.getAttribute('COLOR_0');
/* 5121 es UNSIGNED_BYTE: bytes normalizados, VEC4 con el alfa a 255, que es lo que escribe el horno. */
comprobar(
  'lleva COLOR_0 como VEC4 de bytes normalizados',
  color !== null && color.getType() === 'VEC4' && color.getComponentType() === 5121 && color.getNormalized(),
  color === null ? 'sin COLOR_0' : { tipo: color.getType(), componente: color.getComponentType() },
);
comprobar('y ninguna UV: sin textura son bytes muertos', !prim.listSemantics().some((s) => s.startsWith('TEXCOORD_')), prim.listSemantics());
comprobar('ninguna textura ni imagen dentro', root.listTextures().length === 0, root.listTextures().length);
{
  const materiales = root.listMaterials();
  const m = materiales[0];
  comprobar(
    'un solo material, blanco, sin textura y sin metal, para que mande el vértice',
    materiales.length === 1 && m !== undefined && m.getBaseColorTexture() === null && m.getBaseColorFactor().every((c) => c === 1) && m.getMetallicFactor() === 0,
    { materiales: materiales.length, base: m?.getBaseColorFactor(), metal: m?.getMetallicFactor() },
  );
}

const pos = prim.getAttribute('POSITION') as Accessor;
const triangulos = (prim.getIndices()?.getCount() ?? 0) / 3;
comprobar(`${String(VERTICES)} vértices, los del D6_A del pack`, pos.getCount() === VERTICES, pos.getCount());
comprobar(`y ${String(TRIANGULOS)} triángulos`, triangulos === TRIANGULOS, triangulos);
{
  const mn = pos.getMin([]);
  const mx = pos.getMax([]);
  const lados = [0, 1, 2].map((i) => (mx[i] as number) - (mn[i] as number));
  const centro = [0, 1, 2].map((i) => ((mx[i] as number) + (mn[i] as number)) / 2);
  const tolerancia = ARISTA_DEL_D6_EN_EL_PACK * HOLGURA_DE_LA_CAJA;
  comprobar(
    'la caja es un cubo de ARISTA_DEL_D6_EN_EL_PACK al 1 % en los tres ejes, centrado: sin escalar, a la unidad del pack',
    lados.every((l) => Math.abs(l - ARISTA_DEL_D6_EN_EL_PACK) <= tolerancia) && centro.every((c) => Math.abs(c) <= tolerancia),
    { lados: lados.map((l) => l.toFixed(4)), centro: centro.map((c) => c.toFixed(4)), arista: ARISTA_DEL_D6_EN_EL_PACK },
  );
}

const colores = new Map<string, number>();
let alfasMalos = 0;
if (color !== null) {
  const bytes = color.getArray() as Uint8Array;
  for (let i = 0; i < color.getCount(); i++) {
    const k = clave(bytes[i * 4] as number, bytes[i * 4 + 1] as number, bytes[i * 4 + 2] as number);
    colores.set(k, (colores.get(k) ?? 0) + 1);
    if (bytes[i * 4 + 3] !== 255) alfasMalos++;
  }
}
comprobar('el color son EXACTAMENTE dos tonos: el degradado del atlas se aplanó', colores.size === 2, [...colores.keys()]);
comprobar(
  'y son los bytes lineales de COLOR_DEL_NUMERO y COLOR_DEL_PUNTO: los dados son del mismo juego que las fichas',
  colores.has(clave(...CUERPO)) && colores.has(clave(...PUNTO)),
  { fichero: [...colores.keys()], cuerpo: clave(...CUERPO), punto: clave(...PUNTO) },
);
comprobar('con el alfa a 255 en todos los vértices', alfasMalos === 0, alfasMalos);
comprobar(
  `los 21 puntos son ${String(21 * VERTICES_POR_PUNTO)} vértices de punto, nueve cada uno, y el resto cuerpo`,
  colores.get(clave(...PUNTO)) === 21 * VERTICES_POR_PUNTO && (colores.get(clave(...CUERPO)) ?? 0) === VERTICES - 21 * VERTICES_POR_PUNTO,
  { punto: colores.get(clave(...PUNTO)), cuerpo: colores.get(clave(...CUERPO)) },
);

// ---------------------------------------------------------------------------
paso('Contando los puntos sale un dado, y caras-del-dado.ts es esa cuenta');
// ---------------------------------------------------------------------------

const bytesDeColor = (color?.getArray() as Uint8Array | undefined) ?? new Uint8Array(0);
const esPunto = (i: number): boolean =>
  bytesDeColor[i * 4] === PUNTO[0] && bytesDeColor[i * 4 + 1] === PUNTO[1] && bytesDeColor[i * 4 + 2] === PUNTO[2];
const { porCara, normalesTorcidas } = cuentaLosPuntos(prim, esPunto);
const cuenta = CARAS.map((c) => `${c}=${String(porCara.get(c)?.puntos ?? 0)}`).join(' ');

comprobar('todos los vértices de punto tienen la normal de su cara: la cuenta por posición es de fiar', normalesTorcidas === 0, normalesTorcidas);
const problemas = problemasDeUnDado(porCara);
comprobar('seis caras con 1..6 puntos, 21 en total y las opuestas sumando 7', problemas.length === 0, problemas.length === 0 ? cuenta : problemas);
{
  /* Sólo hay texto que regenerar si lo contado es un dado: si no, la tabla no puede ser cierta. */
  const esperado = problemas.length === 0 ? textoDeCarasDelDado(porCara) : null;
  const enElArbol = fs.existsSync(FICHERO_DE_CARAS) ? fs.readFileSync(FICHERO_DE_CARAS, 'utf8') : '';
  comprobar(
    'escenas/caras-del-dado.ts es byte a byte lo que se genera contando este fichero: nadie lo ha tocado a mano',
    esperado !== null && enElArbol === esperado,
    esperado === null ? 'lo contado no es un dado' : enElArbol === '' ? 'no existe' : { bytesEnElArbol: enElArbol.length, bytesEsperados: esperado.length },
  );
}
{
  const medida = caraDeCadaValor(porCara);
  const desacuerdos = ([1, 2, 3, 4, 5, 6] as const).filter((v) => CARA_DEL_VALOR[v] !== medida.get(v));
  comprobar('y lo que exporta coincide con la medida, valor a valor', desacuerdos.length === 0, {
    fichero: CARA_DEL_VALOR,
    medida: Object.fromEntries(medida),
  });
  const normalesMal = ([1, 2, 3, 4, 5, 6] as const).filter((v) => NORMAL_DEL_VALOR[v].join() !== normalDeLaCara(CARA_DEL_VALOR[v]).join());
  comprobar(
    'cada normal exportada es la de su cara, y fuera de 1..6 no hay normal',
    normalesMal.length === 0 && normalDelValor(0) === null && normalDelValor(7) === null && normalDelValor(3.5) === null && normalDelValor(6) !== null,
    normalesMal,
  );
}

// ---------------------------------------------------------------------------
paso('Cargado con el GLTFLoader de three de verdad');
// ---------------------------------------------------------------------------

function cargaConThree(ruta: string): Promise<GLTF> {
  const bytes = fs.readFileSync(ruta);
  const trozo = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(trozo, '', resolve, reject);
  });
}

{
  let gltf: GLTF | null = null;
  let error = '';
  try {
    gltf = await cargaConThree(FICHERO);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  comprobar('GLTFLoader lo carga sin error', gltf !== null, error);

  const hijos = gltf?.scene.children ?? [];
  comprobar(
    'y la escena trae un solo hijo con el nombre que el catálogo busca, igual antes y después del saneado',
    hijos.length === 1 && hijos[0]?.name === MODELO.dado && PropertyBinding.sanitizeNodeName(MODELO.dado) === MODELO.dado,
    hijos.map((h) => h.name),
  );

  const mallasMal: string[] = [];
  const entrelazados: string[] = [];
  let triangulosEnThree = 0;
  let verticesEnThree = 0;
  gltf?.scene.traverse((o: Object3D) => {
    if (!(o as Mesh).isMesh) return;
    const malla = o as Mesh;
    const material = (Array.isArray(malla.material) ? malla.material[0] : malla.material) as MeshStandardMaterial;
    const c = malla.geometry.getAttribute('color');
    if (c === undefined || !material.vertexColors || material.map !== null) {
      mallasMal.push(`${o.name}: color=${String(c !== undefined)} vertexColors=${String(material.vertexColors)} map=${String(material.map !== null)}`);
    }
    for (const [nombre, atributo] of Object.entries(malla.geometry.attributes)) {
      if ((atributo as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute === true) entrelazados.push(`${o.name}.${nombre}`);
    }
    triangulosEnThree += (malla.geometry.index?.count ?? 0) / 3;
    verticesEnThree += malla.geometry.getAttribute('position').count;
  });
  comprobar('la malla llega con el color por vértice encendido y sin mapa', gltf !== null && mallasMal.length === 0, mallasMal);
  comprobar('y ningún atributo llega entrelazado: se clona en silencio', gltf !== null && entrelazados.length === 0, entrelazados);
  comprobar(
    `three cuenta los mismos ${String(VERTICES)} vértices y ${String(TRIANGULOS)} triángulos`,
    verticesEnThree === VERTICES && triangulosEnThree === TRIANGULOS,
    { vertices: verticesEnThree, triangulos: triangulosEnThree },
  );
  const caja = gltf === null ? null : new Box3().setFromObject(gltf.scene);
  const tolerancia = ARISTA_DEL_D6_EN_EL_PACK * HOLGURA_DE_LA_CAJA;
  comprobar(
    'y la caja que mide three es la del pack: la escena lo escalará con ARISTA_DEL_DADO · lado / ARISTA_DEL_D6_EN_EL_PACK',
    caja !== null &&
      ['x', 'y', 'z'].every((eje) => Math.abs(caja.max[eje as 'x'] - caja.min[eje as 'x'] - ARISTA_DEL_D6_EN_EL_PACK) <= tolerancia),
    caja === null ? 'sin escena' : { x: (caja.max.x - caja.min.x).toFixed(4), y: (caja.max.y - caja.min.y).toFixed(4), z: (caja.max.z - caja.min.z).toFixed(4) },
  );
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log('');
}

/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS». Ver `verificar-escena.ts`: un guion que se cae a
 * la mitad termina con código cero y una lista corta de aciertos, y eso se lee como
 * verde. El número va a mano y hay que subirlo al añadir comprobaciones.
 */
const COMPROBACIONES_ESCRITAS = 27;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(
    `Solo se han hecho ${String(hechas)} de las ${String(COMPROBACIONES_ESCRITAS)} comprobaciones que ` +
      'tiene escritas este guion: se ha caído por el camino sin decirlo. ' +
      'Si has añadido comprobaciones nuevas, sube el número.',
  );
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(`${String(hechas)} comprobaciones`);
  console.log(
    `\ndados.glb es el D6 de KayKit tal como se midió (${String(VERTICES)} vértices, ${String(TRIANGULOS)} triángulos, un cubo de\n` +
      `${String(ARISTA_DEL_D6_EN_EL_PACK)}), horneado en exactamente los dos colores de las fichas, sin textura ni UV, y carga con el\n` +
      `GLTFLoader de verdad sin atributos entrelazados. Contando sus puntos sale un dado (${cuenta}) y\n` +
      'caras-del-dado.ts es esa cuenta byte a byte. Lo que esto NO prueba es que se vea bien: para eso hace falta mirar.',
  );
  process.exit(0);
}

process.exit(1);
