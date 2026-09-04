/**
 * ¿SIRVE `embarcadero.glb` PARA LOS DOS CLIENTES?
 *
 * ═══ QUÉ COMPRA ESTE GUION ═══
 *
 * `compilar-embarcadero.ts` deja en `escenas/modelos/embarcadero.glb` las piezas del
 * lobby con el color horneado en cada vértice y una máscara de tinte en las que son
 * del color del asiento. Esto vuelve a abrir ese fichero DESDE FUERA —con
 * `@gltf-transform`, que no toca los nombres, y luego con el `GLTFLoader` de three,
 * que sí— y comprueba lo que, si estuviera mal, no daría ningún error en ninguna
 * consola:
 *
 *   · Que dentro están EXACTAMENTE las piezas de `piezas.ts`, ni una más ni una
 *     menos, con esos nombres. Una que falte es un hueco mudo en la cala; una que
 *     sobre son kilobytes que viajan a cada móvil para no dibujarse.
 *   · Que TODAS las primitivas llevan `COLOR_0` y NINGUNA lleva UV, y que no hay ni
 *     una textura ni una imagen: una que se colara se ve bien en el PC y deja un
 *     hueco en el móvil, que es el fallo que costó días en `texturas-nativas.ts`.
 *   · Que las piezas que se tiñen llevan `_TINTE` con lo que tiene que haber y las
 *     demás no lo llevan. El muelle y la bandera tienen vértices de color Y sin
 *     color; el barco y el estandarte son fichas del pack pintadas enteras
 *     (`compilar-embarcadero.ts` cuenta por qué) y salen todo 255. Esto se escribe
 *     aquí como expectativa, no se deduce: si un día el pack cambia, se ve.
 *   · Que ningún nombre, de raíz o de hijo, lleva algo que `GLTFLoader` vaya a
 *     borrar, y que el molino conserva sus aspas en un nodo aparte —que es lo que
 *     la escena gira—.
 *   · Que el pack no se ha escalado: la tesela sigue midiendo 2 de ancho, porque la
 *     escala la aplica la escena con `ESCALA_DEL_PACK` y un fichero preescalado
 *     saldría cinco veces más grande que el tablero de al lado.
 *   · Que el fichero pesa menos de 2 MB, y que una escena LLENA —seis sentados, la
 *     cala entera, el caserío, el fondo— cabe en el presupuesto de un móvil. Las
 *     multiplicidades están escritas aquí abajo; son una estimación declarada, no
 *     lo que la escena pone de verdad, y por eso el tope (150.000) es más holgado
 *     que el objetivo de `docs/EL-MUELLE.md` (110.000).
 *
 * ═══ POR QUÉ ÉSTE SÍ IMPORTA `three` ═══
 *
 * Porque parte de lo que se comprueba es lo que hace `three` al cargar: los nombres
 * saneados, `vertexColors` encendido al ver `COLOR_0`, y el atributo `_TINTE` que
 * `GLTFLoader` deja en minúsculas (`_tinte`). Comprobarlo contra una copia de esas
 * reglas sería comprobar la copia. Se carga con el `GLTFLoader` de verdad, en Node,
 * sin abrir un contexto de dibujo: `parse()` sólo necesita `TextDecoder` y
 * `DataView`, y las imágenes —lo único que pediría un navegador— es justo lo que
 * este fichero no tiene. Ver `verificar-aventureros.ts`, que hace lo mismo.
 *
 * Lo que este guion NO prueba, dicho para que nadie se confíe: que se VEA bien.
 * Ni el color horneado en pantalla, ni el tinte del asiento, ni si el móvil aguanta.
 * Eso sigue exigiendo ojos, el banco `escritorio/lobby3d.html` y un aparato.
 */
import { NodeIO } from '@gltf-transform/core';
import type { Node, Primitive } from '@gltf-transform/core';
import fs from 'node:fs';
import path from 'node:path';
import { PropertyBinding } from 'three';
import type { Mesh, MeshStandardMaterial, Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  ATRIBUTO_DE_TINTE,
  ATRIBUTO_DE_TINTE_CARGADO,
  nombresDelEmbarcadero,
  PIEZA,
  PIEZAS_QUE_SE_TINEN,
} from '../embarcadero/piezas';
import type { NombreDePieza } from '../embarcadero/piezas';
import { NOMBRE_QUE_SOBREVIVE } from '../nombres';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : ` — ${JSON.stringify(detalle)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..');
const FICHERO = path.join(RAIZ, 'modelos', 'embarcadero.glb');
const TOPE_DE_BYTES = 2 * 1024 * 1024;
const TOPE_DE_TRIANGULOS = 150_000;

/** Las dos piezas que el pack pinta enteras del color: fichas, no edificios. */
const TENIDAS_ENTERAS: readonly NombreDePieza[] = [PIEZA.barco, PIEZA.estandarte];

/**
 * CUÁNTAS VECES PONE CADA PIEZA UNA ESCENA LLENA, para sumar triángulos.
 *
 * Es una estimación declarada de la composición de `docs/EL-MUELLE.md` §2 con los
 * seis amarres ocupados: la cala de unas ciento diez teselas con su fondo, treinta
 * orillas, seis muelles con su barco, bandera y estandarte, botes en los amarres y
 * la playa, el caserío entero una vez, arboledas alrededor, colinas y montañas al
 * fondo, nubes, y los trastos del muelle. Está tipada sobre `NombreDePieza` para
 * que una pieza nueva en `piezas.ts` no pueda entrar sin presupuesto.
 */
const MULTIPLICIDADES: Readonly<Record<NombreDePieza, number>> = {
  [PIEZA.tesela]: 110,
  [PIEZA.fondo]: 110,
  [PIEZA.agua]: 12,
  [PIEZA.rampaBaja]: 4,
  [PIEZA.rampaAlta]: 4,
  [PIEZA.orillaA]: 6,
  [PIEZA.orillaB]: 6,
  [PIEZA.orillaC]: 6,
  [PIEZA.orillaD]: 6,
  [PIEZA.orillaE]: 6,
  [PIEZA.muelle]: 6,
  [PIEZA.barco]: 8,
  [PIEZA.bandera]: 6,
  [PIEZA.estandarte]: 6,
  [PIEZA.barcoDeNadie]: 2,
  [PIEZA.bote]: 8,
  [PIEZA.varadero]: 2,
  [PIEZA.ancla]: 2,
  [PIEZA.nenufarA]: 10,
  [PIEZA.nenufarB]: 10,
  [PIEZA.juncoA]: 10,
  [PIEZA.juncoB]: 10,
  [PIEZA.juncoC]: 10,
  [PIEZA.barril]: 4,
  [PIEZA.caja]: 4,
  [PIEZA.cajaGrande]: 2,
  [PIEZA.cajon]: 2,
  [PIEZA.saco]: 2,
  [PIEZA.lena]: 1,
  [PIEZA.piedra]: 1,
  [PIEZA.almiar]: 2,
  [PIEZA.carro]: 1,
  [PIEZA.abrevadero]: 1,
  [PIEZA.cubo]: 1,
  [PIEZA.escalera]: 1,
  [PIEZA.pale]: 1,
  [PIEZA.tienda]: 1,
  [PIEZA.taberna]: 1,
  [PIEZA.casa]: 1,
  [PIEZA.casaB]: 1,
  [PIEZA.pozo]: 1,
  [PIEZA.atalaya]: 1,
  [PIEZA.vigia]: 1,
  [PIEZA.molino]: 1,
  [PIEZA.astillero]: 1,
  [PIEZA.mercado]: 1,
  [PIEZA.valla]: 12,
  [PIEZA.vallaPuerta]: 2,
  [PIEZA.puente]: 1,
  [PIEZA.arbolA]: 20,
  [PIEZA.arbolB]: 20,
  [PIEZA.tocon]: 4,
  [PIEZA.arboledaGrande]: 6,
  [PIEZA.arboledaMedia]: 8,
  [PIEZA.arboledaPequena]: 8,
  [PIEZA.arboledaB]: 6,
  [PIEZA.colinaA]: 4,
  [PIEZA.colinaB]: 4,
  [PIEZA.colinaC]: 4,
  [PIEZA.colinasA]: 4,
  [PIEZA.colinasArboladas]: 4,
  [PIEZA.montanaA]: 2,
  [PIEZA.montanaB]: 2,
  [PIEZA.montanaC]: 2,
  [PIEZA.montanaVerde]: 2,
  [PIEZA.montanaArbolada]: 1,
  [PIEZA.rocaA]: 6,
  [PIEZA.rocaB]: 6,
  [PIEZA.rocaC]: 6,
  [PIEZA.rocaD]: 6,
  [PIEZA.rocaE]: 6,
  [PIEZA.nubeGrande]: 3,
  [PIEZA.nubePequena]: 2,
};

const NOMBRES = nombresDelEmbarcadero();
const mismos = (a: readonly string[], b: readonly string[]): boolean =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// ---------------------------------------------------------------------------
paso('El fichero existe, pesa lo que debe y no lleva texturas ni imágenes');
// ---------------------------------------------------------------------------

comprobar('embarcadero.glb está compilado', fs.existsSync(FICHERO));
if (!fs.existsSync(FICHERO)) {
  console.log(`\nNo está ${path.relative(RAIZ, FICHERO)}.`);
  console.log('Se rehace con `npm run compilar:embarcadero -w escenas`; `arte/README.md` dice de dónde sale el material.');
  process.exit(1);
}
const bytesDelFichero = fs.statSync(FICHERO).size;
comprobar('y pesa menos de 2 MB', bytesDelFichero < TOPE_DE_BYTES, { kB: Math.round(bytesDelFichero / 1024) });

/*
 * EL JSON DEL `.glb` SE LEE A MANO PARA ESTO, además de con la biblioteca: lo que
 * rompe el móvil es que en el fichero haya un `images` o un `textures`, y la forma
 * más directa de saber que no lo hay es mirar el JSON tal cual va por el cable.
 * Un `.glb` es una cabecera de doce bytes y luego un trozo JSON con su longitud.
 */
{
  const bytes = fs.readFileSync(FICHERO);
  const magia = bytes.toString('ascii', 0, 4);
  const largoDelJson = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + largoDelJson)) as Record<string, unknown[] | undefined>;
  comprobar('es un glb de verdad', magia === 'glTF' && bytes.readUInt32LE(4) === 2, { magia });
  comprobar(
    'y su JSON no declara ni texturas, ni imágenes, ni muestreadores',
    json['textures'] === undefined && json['images'] === undefined && json['samplers'] === undefined,
    { texturas: json['textures']?.length, imagenes: json['images']?.length, muestreadores: json['samplers']?.length },
  );
  comprobar('un solo material y un solo búfer', json['materials']?.length === 1 && json['buffers']?.length === 1, {
    materiales: json['materials']?.length,
    buferes: json['buffers']?.length,
  });
}

// ---------------------------------------------------------------------------
paso('Dentro están exactamente las piezas de piezas.ts, con el color en el vértice');
// ---------------------------------------------------------------------------

const io = new NodeIO();
const doc = await io.read(FICHERO);
const root = doc.getRoot();
const escenas = root.listScenes();
const raices = escenas.flatMap((e) => e.listChildren());
const nombresDeRaiz = raices.map((r) => r.getName());

comprobar('una sola escena', escenas.length === 1, escenas.length);
comprobar(
  'los nodos raíz son exactamente nombresDelEmbarcadero(), ni uno más ni uno menos',
  mismos(nombresDeRaiz, NOMBRES) && nombresDeRaiz.length === NOMBRES.length,
  {
    faltan: NOMBRES.filter((n) => !nombresDeRaiz.includes(n)),
    sobran: nombresDeRaiz.filter((n) => !NOMBRES.includes(n)),
    repetidos: nombresDeRaiz.filter((n, i, t) => t.indexOf(n) !== i),
  },
);
comprobar('y en el mismo orden que la tabla', JSON.stringify(nombresDeRaiz) === JSON.stringify(NOMBRES));

/** Las primitivas bajo un nodo, con el nodo del que cuelgan. */
function primitivasDe(nodo: Node): Array<{ prim: Primitive; nodo: Node }> {
  const salida: Array<{ prim: Primitive; nodo: Node }> = [];
  const anda = (n: Node): void => {
    const malla = n.getMesh();
    if (malla !== null) for (const prim of malla.listPrimitives()) salida.push({ prim, nodo: n });
    for (const h of n.listChildren()) anda(h);
  };
  anda(nodo);
  return salida;
}

/** Los descendientes de un nodo, sin él. */
function descendientesDe(nodo: Node): Node[] {
  return nodo.listChildren().flatMap((h) => [h, ...descendientesDe(h)]);
}

const trianguloPorPieza = new Map<string, number>();
{
  const sinColor: string[] = [];
  const conUv: string[] = [];
  const sinNormal: string[] = [];
  const sinGeometria: string[] = [];
  for (const raiz of raices) {
    const prims = primitivasDe(raiz);
    if (prims.length === 0) sinGeometria.push(raiz.getName());
    let triangulos = 0;
    for (const { prim, nodo } of prims) {
      const donde = `${raiz.getName()}/${nodo.getName()}`;
      const color = prim.getAttribute('COLOR_0');
      /* 5121 es UNSIGNED_BYTE: bytes normalizados, VEC4 con el alfa a 255, que es lo que escribe el horno. */
      if (color === null || color.getType() !== 'VEC4' || color.getComponentType() !== 5121 || !color.getNormalized()) {
        sinColor.push(donde);
      }
      if (prim.listSemantics().some((s) => s.startsWith('TEXCOORD_'))) conUv.push(donde);
      if (prim.getAttribute('NORMAL') === null) sinNormal.push(donde);
      const pos = prim.getAttribute('POSITION');
      if (pos !== null) triangulos += (prim.getIndices()?.getCount() ?? pos.getCount()) / 3;
    }
    trianguloPorPieza.set(raiz.getName(), triangulos);
  }
  comprobar('cada pieza trae geometría', sinGeometria.length === 0, sinGeometria);
  comprobar('todas las primitivas llevan COLOR_0 como VEC4 de bytes normalizados', sinColor.length === 0, sinColor);
  comprobar('y ninguna conserva UV: sin textura son bytes muertos', conUv.length === 0, conUv);
  comprobar('y todas traen normales, que sin ellas la luz de la hora azul no filetea nada', sinNormal.length === 0, sinNormal);
}

{
  comprobar('no queda dentro ni una textura', root.listTextures().length === 0, root.listTextures().length);
  const materiales = root.listMaterials();
  const m = materiales[0];
  comprobar(
    'el único material va en blanco, sin textura y sin metal, para que mande el vértice',
    materiales.length === 1 &&
      m !== undefined &&
      m.getBaseColorTexture() === null &&
      m.getBaseColorFactor().every((c) => c === 1) &&
      m.getMetallicFactor() === 0,
    { materiales: materiales.length, base: m?.getBaseColorFactor(), metal: m?.getMetallicFactor() },
  );
}

// ---------------------------------------------------------------------------
paso('Las piezas que se tiñen llevan su máscara, y las demás no');
// ---------------------------------------------------------------------------

{
  const malFormada: string[] = [];
  const conValoresRaros: string[] = [];
  const sinColorDeAsiento: string[] = [];
  const planaSinQuerer: string[] = [];
  const enteraSinQuerer: string[] = [];
  const conMascaraDeMas: string[] = [];
  for (const raiz of raices) {
    const nombre = raiz.getName() as NombreDePieza;
    const seTine = PIEZAS_QUE_SE_TINEN.includes(nombre);
    let con = 0;
    let sin = 0;
    for (const { prim, nodo } of primitivasDe(raiz)) {
      const tinte = prim.getAttribute(ATRIBUTO_DE_TINTE);
      const donde = `${nombre}/${nodo.getName()}`;
      if (!seTine) {
        if (tinte !== null) conMascaraDeMas.push(donde);
        continue;
      }
      /* 5126 es FLOAT: la máscara va en flotantes de 0 o 1 para que su paso sea el del elemento (ver hornear.ts). */
      if (tinte === null || tinte.getType() !== 'SCALAR' || tinte.getComponentType() !== 5126 || tinte.getNormalized()) {
        malFormada.push(donde);
        continue;
      }
      const valores = tinte.getArray() as Float32Array;
      for (const v of valores) {
        if (v === 1) con++;
        else if (v === 0) sin++;
        else {
          conValoresRaros.push(`${donde}: ${v}`);
          break;
        }
      }
    }
    if (!seTine) continue;
    if (con === 0) sinColorDeAsiento.push(nombre);
    const entera = TENIDAS_ENTERAS.includes(nombre);
    if (entera && sin !== 0) enteraSinQuerer.push(`${nombre}: ${sin} sin color`);
    if (!entera && sin === 0) planaSinQuerer.push(`${nombre}: ${con} de color, 0 sin color`);
  }
  comprobar(
    `las ${PIEZAS_QUE_SE_TINEN.length} piezas que se tiñen llevan ${ATRIBUTO_DE_TINTE} como escalar flotante`,
    malFormada.length === 0,
    malFormada,
  );
  comprobar('y la máscara sólo vale 0 o 1', conValoresRaros.length === 0, conValoresRaros);
  comprobar('en cada una hay vértices de color', sinColorDeAsiento.length === 0, sinColorDeAsiento);
  comprobar(
    'el muelle y la bandera tienen también vértices SIN color: la madera no se tiñe',
    planaSinQuerer.length === 0,
    planaSinQuerer,
  );
  comprobar(
    'y el barco y el estandarte salen teñidos enteros, que son fichas del pack',
    enteraSinQuerer.length === 0,
    enteraSinQuerer,
  );
  comprobar(`ninguna otra pieza lleva ${ATRIBUTO_DE_TINTE}`, conMascaraDeMas.length === 0, conMascaraDeMas);
}

// ---------------------------------------------------------------------------
paso('Los nombres sobreviven al cargador, los hijos siguen ahí y nada se ha escalado');
// ---------------------------------------------------------------------------

{
  const nodos = root.listNodes().map((n) => n.getName());
  const malos = nodos.filter((n) => !NOMBRE_QUE_SOBREVIVE.test(n) || PropertyBinding.sanitizeNodeName(n) !== n);
  comprobar('ningún nombre de nodo, raíz o hijo, lleva algo que GLTFLoader vaya a borrar', malos.length === 0, malos);

  /*
   * EL MOLINO ES LA PRUEBA DE QUE LOS HIJOS SE CONSERVAN. El pack trae las aspas en
   * una malla aparte, colgando de la torre, y la escena las gira; un compilador que
   * aplanara la pieza dejaría el molino quieto sin que nada protestara.
   */
  const molino = raices.find((r) => r.getName() === PIEZA.molino);
  const aspas = molino === undefined ? [] : descendientesDe(molino).filter((n) => n.getName().includes('fan') && n.getMesh() !== null);
  const anidadas = aspas.some((a) => !(molino as Node).listChildren().includes(a));
  comprobar('el molino conserva las aspas en un nodo propio, colgando de la torre', aspas.length === 1 && anidadas, {
    aspas: aspas.map((a) => a.getName()),
    hijosDelMolino: molino?.listChildren().map((h) => h.getName()),
  });

  /*
   * LA TESELA MIDE LO QUE MIDE EN EL PACK: 2 de ancho, 2,309 de fondo (`escala.ts`,
   * `RADIO_DEL_PACK`). Si midiera otra cosa, alguien la escaló al compilar, y la
   * escena la volvería a escalar con `ESCALA_DEL_PACK`.
   */
  const tesela = raices.find((r) => r.getName() === PIEZA.tesela);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const { prim } of tesela === undefined ? [] : primitivasDe(tesela)) {
    const pos = prim.getAttribute('POSITION');
    if (pos === null) continue;
    const lo = pos.getMin([]);
    const hi = pos.getMax([]);
    minX = Math.min(minX, lo[0] as number);
    maxX = Math.max(maxX, hi[0] as number);
    minZ = Math.min(minZ, lo[2] as number);
    maxZ = Math.max(maxZ, hi[2] as number);
  }
  const ancho = maxX - minX;
  const fondo = maxZ - minZ;
  comprobar(
    'la tesela mide 2 × 2,309 como en el pack: nadie la ha escalado al compilar',
    Math.abs(ancho - 2) < 0.01 && Math.abs(fondo - 2 / Math.sqrt(3) * 2) < 0.01,
    { ancho: Number(ancho.toFixed(3)), fondo: Number(fondo.toFixed(3)) },
  );
  const conTransformacion = raices.filter((r) => {
    const t = r.getTranslation();
    const s = r.getScale();
    const q = r.getRotation();
    return t.some((v) => v !== 0) || s.some((v) => v !== 1) || q[0] !== 0 || q[1] !== 0 || q[2] !== 0 || Math.abs(q[3]) !== 1;
  });
  comprobar('y ningún nodo raíz trae traslación, giro ni escala propios', conTransformacion.length === 0, conTransformacion.map((r) => r.getName()));
}

// ---------------------------------------------------------------------------
paso('Una escena llena cabe en el presupuesto');
// ---------------------------------------------------------------------------

{
  const sinPresupuesto = NOMBRES.filter((n) => !(n in MULTIPLICIDADES));
  comprobar('cada pieza tiene multiplicidad declarada', sinPresupuesto.length === 0, sinPresupuesto);
  let total = 0;
  const pesadas: Array<[string, number]> = [];
  for (const n of NOMBRES) {
    const tri = (trianguloPorPieza.get(n) ?? 0) * (MULTIPLICIDADES[n as NombreDePieza] ?? 0);
    total += tri;
    pesadas.push([n, tri]);
  }
  pesadas.sort((a, b) => b[1] - a[1]);
  console.log(
    `  ${Math.round(total).toLocaleString('es-ES')} triángulos en una escena llena; ` +
      `las que más pesan: ${pesadas.slice(0, 5).map(([n, t]) => `${n} ${Math.round(t).toLocaleString('es-ES')}`).join(', ')}`,
  );
  comprobar(`y suman menos de ${TOPE_DE_TRIANGULOS.toLocaleString('es-ES')} triángulos`, total < TOPE_DE_TRIANGULOS, Math.round(total));
  comprobar('el fichero entero baja de 40.000 triángulos: setenta y tantas piezas sueltas, no un mundo', [...trianguloPorPieza.values()].reduce((a, b) => a + b, 0) < 40_000);
}

// ---------------------------------------------------------------------------
paso('Cargado con el GLTFLoader de three de verdad, todo llega con su nombre y su color');
// ---------------------------------------------------------------------------

function cargaConThree(ruta: string): Promise<GLTF> {
  const bytes = fs.readFileSync(ruta);
  const trozo = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(trozo, '', resolve, reject);
  });
}

{
  let gltf: GLTF | undefined;
  let error = '';
  try {
    gltf = await cargaConThree(FICHERO);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  comprobar('GLTFLoader carga el fichero sin error', gltf !== undefined, error);

  const hijos = gltf?.scene.children.map((c) => c.name) ?? [];
  comprobar('y cada nodo raíz aparece con su nombre, en orden', JSON.stringify(hijos) === JSON.stringify(NOMBRES), {
    faltan: NOMBRES.filter((n) => !hijos.includes(n)),
    sobran: hijos.filter((n) => !NOMBRES.includes(n)),
  });

  const mallasMal: string[] = [];
  const tinteMal: string[] = [];
  const entrelazados: string[] = [];
  let mallas = 0;
  for (const raiz of gltf?.scene.children ?? []) {
    const seTine = PIEZAS_QUE_SE_TINEN.includes(raiz.name as NombreDePieza);
    raiz.traverse((o: Object3D) => {
      if (!(o as Mesh).isMesh) return;
      mallas++;
      const malla = o as Mesh;
      const material = (Array.isArray(malla.material) ? malla.material[0] : malla.material) as MeshStandardMaterial;
      const color = malla.geometry.getAttribute('color');
      if (color === undefined || !material.vertexColors || material.map !== null) {
        mallasMal.push(
          `${raiz.name}/${o.name}: color=${String(color !== undefined)} vertexColors=${String(material.vertexColors)} map=${String(material.map !== null)}`,
        );
      }
      const tinte = malla.geometry.getAttribute(ATRIBUTO_DE_TINTE_CARGADO);
      if (seTine !== (tinte !== undefined) || (tinte !== undefined && (tinte.normalized || tinte.itemSize !== 1))) {
        tinteMal.push(`${raiz.name}/${o.name}: ${ATRIBUTO_DE_TINTE_CARGADO}=${String(tinte !== undefined)} normalizado=${String(tinte?.normalized)}`);
      }
      for (const [nombre, atributo] of Object.entries(malla.geometry.attributes)) {
        if ((atributo as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute === true) entrelazados.push(`${raiz.name}/${o.name}.${nombre}`);
      }
    });
  }
  comprobar('todas sus mallas llegan con el color por vértice encendido y sin mapa', mallas > 0 && mallasMal.length === 0, mallasMal);
  comprobar(
    `y ${ATRIBUTO_DE_TINTE_CARGADO} (en minúsculas, como lo deja el cargador) está exactamente en las piezas que se tiñen`,
    tinteMal.length === 0,
    tinteMal,
  );
  /*
   * NINGÚN ATRIBUTO LLEGA ENTRELAZADO. Si uno llegara, cada `clone()` de la escena
   * (aplanar, fundir, teñir) avisaría por consola una vez por atributo y por pieza,
   * y esas doscientas líneas entierran cualquier aviso de verdad. La regla que lo
   * evita está en `hornear.ts`: atributos separados y con el paso igual al elemento.
   */
  comprobar('y ningún atributo llega entrelazado: se clonan en silencio', mallas > 0 && entrelazados.length === 0, entrelazados.slice(0, 6));

  const molino = gltf?.scene.getObjectByName(PIEZA.molino);
  let aspas: Object3D | undefined;
  molino?.traverse((o: Object3D) => {
    if (o.name.includes('fan') && (o as Mesh).isMesh) aspas = o;
  });
  comprobar(
    'y las aspas del molino se pueden buscar por nombre en la escena cargada',
    aspas !== undefined && aspas.parent !== molino,
    aspas?.name,
  );
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log('');
}

/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS». Ver `verificar-escena.ts`: un guion que se
 * cae a la mitad termina con código cero y una lista corta de aciertos, y eso se lee
 * como verde. El número va a mano y hay que subirlo al añadir comprobaciones.
 */
const COMPROBACIONES_ESCRITAS = 33;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(
    `Solo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones que ` +
      'tiene escritas este guion: se ha caído por el camino sin decirlo. ' +
      'Si has añadido comprobaciones nuevas, sube el número.',
  );
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(`${hechas} comprobaciones`);
  console.log(
    '\nembarcadero.glb trae exactamente las piezas que piezas.ts declara, todas con el color\n' +
      'horneado y ninguna con textura ni UV; las que se tiñen llevan su máscara —el muelle y la\n' +
      'bandera a medias, el barco y el estandarte enteros— y las demás no; los nombres llegan\n' +
      'enteros por el GLTFLoader de three, el molino conserva sus aspas, nadie escaló el pack, y\n' +
      'una escena llena cabe en el presupuesto de un móvil. Lo que esto NO prueba es que se vea\n' +
      'bien: para eso hace falta mirar.',
  );
  process.exit(0);
}

process.exit(1);
