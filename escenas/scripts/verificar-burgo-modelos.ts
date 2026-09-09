/**
 * ¿SIRVE `burgo.glb` PARA LOS DOS CLIENTES, Y ESTÁ A LA ESCALA DEL MUNDO?
 *
 * ═══ QUÉ COMPRA ESTE GUION ═══
 *
 * `compilar-burgo.ts` deja en `escenas/modelos/burgo.glb` las piezas del Burgo con el
 * color horneado en cada vértice, la máscara de tinte en las de asiento, y —al revés que
 * el embarcadero— la ESCALA ya horneada en las posiciones. Esto vuelve a abrir ese
 * fichero DESDE FUERA —con `@gltf-transform`, que no toca los nombres, y luego con el
 * `GLTFLoader` de three, que sí— y comprueba lo que, si estuviera mal, no daría ningún
 * error en ninguna consola:
 *
 *   · Que dentro están EXACTAMENTE las piezas de `burgo/piezas.ts`, con esos nombres y
 *     en ese orden. Una que falte es un solar vacío; una que sobre viaja a cada móvil.
 *   · Que TODAS las primitivas llevan `COLOR_0` y NINGUNA lleva UV, y que no hay ni una
 *     textura ni una imagen. Siete packs son siete atlas que se podrían colar: uno que se
 *     colara se ve bien en el PC y deja un hueco en el móvil.
 *   · Que las piezas de asiento llevan `_TINTE` con lo que tiene que haber: las fichas de
 *     Board Game Bits y el estandarte enteras, la casa grande, la posada y la bandera a
 *     medias, y las demás sin máscara. Se escribe como expectativa, no se deduce.
 *   · Que LA ESCALA ES LA DEL MUNDO, medida pieza a pieza contra `escala.ts`: la
 *     casa-ficha mide una persona, la casa grande dos, la tesela lo que la del tablero ya
 *     escalada, la losa una casilla, el muro de la mazmorra lo que la muralla del pack
 *     hexagonal, y nada baja de medio metro ni pasa de cuatro casillas. Éste es el
 *     fallo propio de un fichero que mezcla siete packs: una silla del tamaño de una
 *     iglesia no da error, se ve.
 *   · Que ningún fichero del Burgo nombra una marca ajena: la mecánica es de dominio
 *     público y el nombre de quien la vende no lo es.
 *   · Que el fichero pesa menos del tope de `piezas.ts` y baja de un techo de triángulos.
 *
 * ═══ LAS VACUNAS: EL JUEZ DE TALLAS TIENE DIENTES ═══
 *
 * Un juez de tallas que leyera la misma tabla que el compilador podría estar en verde
 * midiéndose a sí mismo. Por eso se le pasa DOS veces con cajas falsas y se exige que
 * caiga: con las cajas divididas por el factor de cada pieza —lo que habría si nadie
 * hubiera escalado— tienen que caer la casa, la casa grande, la tesela, la losa y el
 * muro; y con las cajas multiplicadas otra vez por `ESCALA_DEL_PACK` —lo que haría una
 * escena que tratara este fichero como el embarcadero— tienen que caer también, y
 * además el tope de talla. Y la caja de la casa y del muro se vuelve a medir con el
 * `Box3` de three sobre la escena cargada: dos medidas por dos caminos, y tienen que
 * coincidir.
 *
 * ═══ POR QUÉ ÉSTE SÍ IMPORTA `three` ═══
 *
 * Porque parte de lo que se comprueba es lo que hace `three` al cargar: los nombres
 * saneados, `vertexColors` encendido al ver `COLOR_0`, y el atributo `_TINTE` que
 * `GLTFLoader` deja en minúsculas. Se carga con el `GLTFLoader` de verdad, en Node, sin
 * abrir un contexto de dibujo, como `verificar-embarcadero-modelos.ts`.
 *
 * Lo que este guion NO prueba, dicho para que nadie se confíe: que se VEA bien. Ni el
 * color, ni el tinte, ni si el móvil aguanta un tablero entero. Eso exige ojos y un aparato.
 */
import { NodeIO } from '@gltf-transform/core';
import type { Node, Primitive } from '@gltf-transform/core';
import fs from 'node:fs';
import path from 'node:path';
import { Box3, PropertyBinding } from 'three';
import type { Mesh, MeshStandardMaterial, Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  ATRIBUTO_DE_TINTE,
  ATRIBUTO_DE_TINTE_CARGADO,
  escalaDe,
  LADO_DE_CASILLA,
  nombresDelBurgo,
  PIEZA,
  PIEZAS_DEL_BURGO,
  PIEZAS_QUE_SE_TINEN,
  PIEZAS_TENIDAS_ENTERAS,
  TOPE_DE_BYTES_DEL_BURGO,
} from '../burgo/piezas';
import type { NombreDePieza } from '../burgo/piezas';
import { ALTURA_DE_UNA_CASA, ALTURA_DE_UNA_PERSONA, ESCALA_DEL_PACK } from '../escala';
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
const FICHERO = path.join(RAIZ, 'modelos', 'burgo.glb');

/**
 * EL TECHO DE TRIÁNGULOS DEL FICHERO ENTERO: setenta y tantas piezas sueltas, no un
 * tablero. Cuántas veces pone cada una un tablero lleno lo decidirá quien escriba el
 * juego, y ese día entra aquí una tabla de multiplicidades como la del embarcadero.
 */
const TOPE_DE_TRIANGULOS = 70_000;

/** Nada más pequeño que medio metro ni más grande que cuatro casillas: ver la cabecera. */
const TALLA_MINIMA = 0.5;
const TALLA_MAXIMA = 4 * LADO_DE_CASILLA;

/** Cuánto puede apartarse una pieza-ancla de lo que `escala.ts` dice que mide. */
const HOLGURA_DE_ANCLA = 0.02;
/** Y cuánto el muro de la mazmorra de la muralla del hexagonal, que no se buscó que casaran. */
const HOLGURA_ENTRE_MURALLAS = 0.03;

const NOMBRES = nombresDelBurgo();
const mismos = (a: readonly string[], b: readonly string[]): boolean =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// ---------------------------------------------------------------------------
paso('Ningún fichero del Burgo nombra una marca ajena');
// ---------------------------------------------------------------------------

/*
 * LAS MARCAS SE BUSCAN SIN ESCRIBIRLAS: los trozos se juntan en tiempo de ejecución,
 * y así este guion tampoco las lleva. Es la regla del Burgo entero —la mecánica es de
 * dominio público, el nombre de quien la vende no—, y un comentario descuidado en la
 * tabla la rompería sin que nadie lo viera hasta que lo viera quien no debe.
 */
const MARCAS_AJENAS: readonly RegExp[] = [
  new RegExp(['mono', 'pol'].join(''), 'i'),
  new RegExp(['has', 'bro'].join(''), 'i'),
  new RegExp(`\\b${['cat', '[aá]n'].join('')}\\b`, 'i'),
];
function marcasEn(texto: string): string[] {
  return MARCAS_AJENAS.map((m) => m.exec(texto)?.[0]).filter((m): m is string => m !== undefined);
}
const FICHEROS_DEL_BURGO = [
  ...fs.readdirSync(path.join(RAIZ, 'burgo')).map((f) => path.join(RAIZ, 'burgo', f)),
  path.join(RAIZ, 'scripts', 'compilar-burgo.ts'),
  path.join(RAIZ, 'scripts', 'verificar-burgo-modelos.ts'),
];
{
  const conMarca = FICHEROS_DEL_BURGO.flatMap((f) => marcasEn(fs.readFileSync(f, 'utf8')).map((m) => `${path.relative(RAIZ, f)}: ${m}`));
  comprobar(`ninguno de los ${FICHEROS_DEL_BURGO.length} ficheros del Burgo lleva una marca ajena`, conMarca.length === 0, conMarca);
  const conLasMarcas = ['el ', ['Mono', 'poly'].join(''), ' de ', ['Has', 'bro'].join(''), ' y el ', ['Cat', 'an'].join(''), '.'].join('');
  comprobar('se ve fallar: un texto con las tres marcas escritas enciende las tres', marcasEn(conLasMarcas).length === 3, marcasEn(conLasMarcas));
}

// ---------------------------------------------------------------------------
paso('El fichero existe, pesa lo que debe y no lleva texturas ni imágenes');
// ---------------------------------------------------------------------------

comprobar('burgo.glb está compilado', fs.existsSync(FICHERO));
if (!fs.existsSync(FICHERO)) {
  console.log(`\nNo está ${path.relative(RAIZ, FICHERO)}.`);
  console.log('Se rehace con `npm run compilar:burgo -w escenas`; `arte/README.md` dice de dónde sale el material.');
  process.exit(1);
}
const bytesDelFichero = fs.statSync(FICHERO).size;
comprobar(`y pesa menos de ${Math.round(TOPE_DE_BYTES_DEL_BURGO / 1024)} kB`, bytesDelFichero < TOPE_DE_BYTES_DEL_BURGO, { kB: Math.round(bytesDelFichero / 1024) });

/* El JSON del `.glb` se lee a mano, como en el embarcadero: es lo que va por el cable. */
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
  'los nodos raíz son exactamente nombresDelBurgo(), ni uno más ni uno menos',
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
  comprobar('y todas traen normales', sinNormal.length === 0, sinNormal);
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
paso('Las piezas de asiento llevan su máscara, y las demás no');
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
    const entera = PIEZAS_TENIDAS_ENTERAS.includes(nombre);
    if (entera && sin !== 0) enteraSinQuerer.push(`${nombre}: ${sin} sin color`);
    if (!entera && sin === 0) planaSinQuerer.push(`${nombre}: ${con} de color, 0 sin color`);
  }
  comprobar(
    `las ${PIEZAS_QUE_SE_TINEN.length} piezas de asiento llevan ${ATRIBUTO_DE_TINTE} como escalar flotante`,
    malFormada.length === 0,
    malFormada,
  );
  comprobar('y la máscara sólo vale 0 o 1', conValoresRaros.length === 0, conValoresRaros);
  comprobar('en cada una hay vértices de color', sinColorDeAsiento.length === 0, sinColorDeAsiento);
  comprobar(
    'la casa grande, la posada y la bandera tienen también vértices SIN color: la piedra y el mástil no se tiñen',
    planaSinQuerer.length === 0,
    planaSinQuerer,
  );
  comprobar(
    `y ${PIEZAS_TENIDAS_ENTERAS.join(', ')} salen teñidas enteras, que son fichas de un solo color`,
    enteraSinQuerer.length === 0,
    enteraSinQuerer,
  );
  comprobar(`ninguna otra pieza lleva ${ATRIBUTO_DE_TINTE}`, conMascaraDeMas.length === 0, conMascaraDeMas);
}

// ---------------------------------------------------------------------------
paso('Los nombres sobreviven al cargador, los hijos siguen ahí y la escala va en los vértices');
// ---------------------------------------------------------------------------

{
  const nodos = root.listNodes().map((n) => n.getName());
  const malos = nodos.filter((n) => !NOMBRE_QUE_SOBREVIVE.test(n) || PropertyBinding.sanitizeNodeName(n) !== n);
  comprobar('ningún nombre de nodo, raíz o hijo, lleva algo que GLTFLoader vaya a borrar', malos.length === 0, malos);

  /* El molino es la prueba de que los hijos se conservan: las aspas van en una malla aparte. */
  const molino = raices.find((r) => r.getName() === PIEZA.molino);
  const aspas = molino === undefined ? [] : descendientesDe(molino).filter((n) => n.getName().includes('fan') && n.getMesh() !== null);
  const anidadas = aspas.some((a) => !(molino as Node).listChildren().includes(a));
  comprobar('el molino conserva las aspas en un nodo propio, colgando de la torre', aspas.length === 1 && anidadas, {
    aspas: aspas.map((a) => a.getName()),
    hijosDelMolino: molino?.listChildren().map((h) => h.getName()),
  });

  /*
   * LA ESCALA NO VA EN EL NODO: va horneada en los vértices. Un envoltorio con `scale`
   * cargaría igual, pero la caja que mide `Box3` y la que mide gltf-transform sin
   * aplicar transformaciones dirían cosas distintas, y una escena que aplanara la
   * jerarquía la perdería.
   */
  const conTransformacion = raices.filter((r) => {
    const t = r.getTranslation();
    const s = r.getScale();
    const q = r.getRotation();
    return t.some((v) => v !== 0) || s.some((v) => v !== 1) || q[0] !== 0 || q[1] !== 0 || q[2] !== 0 || Math.abs(q[3]) !== 1;
  });
  comprobar('y ningún nodo raíz trae traslación, giro ni escala propios', conTransformacion.length === 0, conTransformacion.map((r) => r.getName()));
}

// ---------------------------------------------------------------------------
paso('Cada pieza mide lo que mide en el mundo del Muelle');
// ---------------------------------------------------------------------------

/** ancho × alto × fondo de una pieza, en unidades del fichero. */
type Caja = readonly [number, number, number];

/** Un punto por una matriz 4 × 4 en columnas, como las escribe glTF. */
function porLaMatriz(m: ArrayLike<number>, v: readonly number[]): [number, number, number] {
  const x = v[0] as number;
  const y = v[1] as number;
  const z = v[2] as number;
  return [
    (m[0] as number) * x + (m[4] as number) * y + (m[8] as number) * z + (m[12] as number),
    (m[1] as number) * x + (m[5] as number) * y + (m[9] as number) * z + (m[13] as number),
    (m[2] as number) * x + (m[6] as number) * y + (m[10] as number) * z + (m[14] as number),
  ];
}

/** La caja de una pieza con las transformaciones de sus hijos aplicadas (las aspas del molino, la hoja de la puerta). */
function cajaDe(raiz: Node): Caja {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const v = [0, 0, 0];
  for (const { prim, nodo } of primitivasDe(raiz)) {
    const pos = prim.getAttribute('POSITION');
    if (pos === null) continue;
    const m = nodo.getWorldMatrix();
    for (let i = 0; i < pos.getCount(); i++) {
      const w = porLaMatriz(m, pos.getElement(i, v));
      for (let c = 0; c < 3; c++) {
        min[c] = Math.min(min[c] as number, w[c] as number);
        max[c] = Math.max(max[c] as number, w[c] as number);
      }
    }
  }
  return [0, 1, 2].map((c) => (max[c] as number) - (min[c] as number)) as unknown as Caja;
}

const cajas = new Map<string, Caja>();
for (const raiz of raices) cajas.set(raiz.getName(), cajaDe(raiz));

/**
 * EL JUEZ DE TALLAS, como función de «qué caja tiene cada pieza» para poder pasarle
 * cajas falsas en las vacunas. Devuelve los problemas etiquetados por pieza-ancla.
 */
function problemasDeTalla(caja: (n: string) => Caja | undefined): string[] {
  const problemas: string[] = [];
  const alto = (n: string): number => caja(n)?.[1] ?? NaN;
  const ancho = (n: string): number => caja(n)?.[0] ?? NaN;
  const fondo = (n: string): number => caja(n)?.[2] ?? NaN;
  const huella = (n: string): number => Math.max(ancho(n), fondo(n));
  const cerca = (medido: number, esperado: number, holgura: number): boolean => Math.abs(medido - esperado) <= esperado * holgura;
  const r = (x: number): number => Number(x.toFixed(3));

  if (!cerca(alto(PIEZA.casa), ALTURA_DE_UNA_PERSONA, HOLGURA_DE_ANCLA)) {
    problemas.push(`casa: mide ${r(alto(PIEZA.casa))} de alto y una casa-ficha mide una persona (${ALTURA_DE_UNA_PERSONA})`);
  }
  if (!(huella(PIEZA.casa) * 2 <= LADO_DE_CASILLA)) {
    problemas.push(`casa: con ${r(huella(PIEZA.casa))} de huella, cuatro en 2 × 2 no caben en una casilla de ${LADO_DE_CASILLA}`);
  }
  if (!cerca(alto(PIEZA.casaGrande), ALTURA_DE_UNA_CASA, HOLGURA_DE_ANCLA)) {
    problemas.push(`casa-grande: mide ${r(alto(PIEZA.casaGrande))} de alto y una casa mide dos personas (${r(ALTURA_DE_UNA_CASA)})`);
  }
  if (!(huella(PIEZA.casaGrande) <= LADO_DE_CASILLA)) {
    problemas.push(`casa-grande: con ${r(huella(PIEZA.casaGrande))} de huella no cabe en una casilla de ${LADO_DE_CASILLA}`);
  }
  if (!cerca(ancho(PIEZA.tesela), 2 * ESCALA_DEL_PACK, HOLGURA_DE_ANCLA)) {
    problemas.push(`tesela: mide ${r(ancho(PIEZA.tesela))} de ancho y la del tablero ya escalada mide ${r(2 * ESCALA_DEL_PACK)}`);
  }
  if (!cerca(ancho(PIEZA.losa), LADO_DE_CASILLA, HOLGURA_DE_ANCLA) || !cerca(fondo(PIEZA.losa), LADO_DE_CASILLA, HOLGURA_DE_ANCLA)) {
    problemas.push(`losa: mide ${r(ancho(PIEZA.losa))} × ${r(fondo(PIEZA.losa))} y es el suelo de una casilla de ${LADO_DE_CASILLA}`);
  }
  if (!cerca(alto(PIEZA.muro), LADO_DE_CASILLA, HOLGURA_DE_ANCLA)) {
    problemas.push(`muro: mide ${r(alto(PIEZA.muro))} de alto y la rejilla de la mazmorra escalada da ${LADO_DE_CASILLA}`);
  }
  if (!cerca(alto(PIEZA.muro), alto(PIEZA.muralla), HOLGURA_ENTRE_MURALLAS)) {
    problemas.push(`muralla: mide ${r(alto(PIEZA.muralla))} y el muro de la mazmorra ${r(alto(PIEZA.muro))}: las dos murallas del Burgo no casan`);
  }
  const peon = alto(PIEZA.peon) / ALTURA_DE_UNA_PERSONA;
  if (!(peon >= 0.8 && peon <= 1)) {
    problemas.push(`peon: mide ${r(peon)} personas y tenía que estar entre 0,8 y 1`);
  }
  for (const n of NOMBRES) {
    const c = caja(n);
    const mayor = c === undefined ? NaN : Math.max(...c);
    if (!(mayor >= TALLA_MINIMA && mayor <= TALLA_MAXIMA)) {
      problemas.push(`talla: ${n} mide ${r(mayor)} en su lado mayor, fuera de [${TALLA_MINIMA}, ${TALLA_MAXIMA}]`);
    }
  }
  return problemas;
}

/** Los problemas de una etiqueta (`casa:`, `talla:`…). */
const de = (problemas: readonly string[], etiqueta: string): string[] => problemas.filter((p) => p.startsWith(`${etiqueta}:`));

{
  const problemas = problemasDeTalla((n) => cajas.get(n));
  comprobar('la casa-ficha mide una persona de alto y cuatro caben en una casilla', de(problemas, 'casa').length === 0, de(problemas, 'casa'));
  comprobar('la casa grande mide dos personas y cabe en una casilla', de(problemas, 'casa-grande').length === 0, de(problemas, 'casa-grande'));
  comprobar('la tesela mide lo que la del tablero YA escalada: aquí la escala va dentro', de(problemas, 'tesela').length === 0, de(problemas, 'tesela'));
  comprobar(
    'la losa es una casilla, el muro mide lo que la rejilla escalada, y lo mismo que la muralla del hexagonal',
    [...de(problemas, 'losa'), ...de(problemas, 'muro'), ...de(problemas, 'muralla')].length === 0,
    [...de(problemas, 'losa'), ...de(problemas, 'muro'), ...de(problemas, 'muralla')],
  );
  comprobar('el peón mide entre el 80 % y el 100 % de una persona', de(problemas, 'peon').length === 0, de(problemas, 'peon'));
  comprobar(
    `ninguna pieza baja de ${TALLA_MINIMA} ni pasa de ${TALLA_MAXIMA} en su lado mayor`,
    de(problemas, 'talla').length === 0,
    de(problemas, 'talla'),
  );

  /* LA VACUNA DE «NADIE ESCALÓ»: las cajas a la unidad de cada pack. */
  const porPieza = new Map(PIEZAS_DEL_BURGO.map((p) => [p.nombre, p] as const));
  const sinEscalar = problemasDeTalla((n) => {
    const c = cajas.get(n);
    const p = porPieza.get(n);
    if (c === undefined || p === undefined) return undefined;
    const k = escalaDe(p);
    return [c[0] / k, c[1] / k, c[2] / k];
  });
  const anclas = ['casa', 'casa-grande', 'tesela', 'losa', 'muro'];
  const anclasQueNoCaen = anclas.filter((a) => de(sinEscalar, a).length === 0);
  comprobar(
    'se ve fallar: con las cajas a la unidad de cada pack —como si nadie hubiera escalado— caen la casa, la casa grande, la tesela, la losa y el muro',
    anclasQueNoCaen.length === 0,
    { noCaen: anclasQueNoCaen, problemas: sinEscalar.slice(0, 6) },
  );

  /* LA VACUNA DE «ESCALADO DOS VECES»: lo que haría una escena que lo tratara como el embarcadero. */
  const dosVeces = problemasDeTalla((n) => {
    const c = cajas.get(n);
    return c === undefined ? undefined : [c[0] * ESCALA_DEL_PACK, c[1] * ESCALA_DEL_PACK, c[2] * ESCALA_DEL_PACK];
  });
  const anclasQueNoCaenDosVeces = [...anclas, 'talla'].filter((a) => de(dosVeces, a).length === 0);
  comprobar(
    'se ve fallar: con las cajas multiplicadas otra vez por ESCALA_DEL_PACK caen las mismas cinco y además el tope de talla',
    anclasQueNoCaenDosVeces.length === 0,
    { noCaen: anclasQueNoCaenDosVeces, problemas: dosVeces.slice(0, 6) },
  );
}

// ---------------------------------------------------------------------------
paso('El fichero cabe en el presupuesto');
// ---------------------------------------------------------------------------

{
  const total = [...trianguloPorPieza.values()].reduce((a, b) => a + b, 0);
  const pesadas = [...trianguloPorPieza.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(
    `  ${Math.round(total).toLocaleString('es-ES')} triángulos en ${trianguloPorPieza.size} piezas; ` +
      `las que más pesan: ${pesadas.map(([n, t]) => `${n} ${Math.round(t).toLocaleString('es-ES')}`).join(', ')}`,
  );
  comprobar(`el fichero entero baja de ${TOPE_DE_TRIANGULOS.toLocaleString('es-ES')} triángulos: piezas sueltas, no un tablero`, total < TOPE_DE_TRIANGULOS, Math.round(total));
}

// ---------------------------------------------------------------------------
paso('Cargado con el GLTFLoader de three de verdad, todo llega con su nombre, su color y su talla');
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
    `y ${ATRIBUTO_DE_TINTE_CARGADO} (en minúsculas, como lo deja el cargador) está exactamente en las piezas de asiento`,
    tinteMal.length === 0,
    tinteMal,
  );
  comprobar('y ningún atributo llega entrelazado: se clonan en silencio', mallas > 0 && entrelazados.length === 0, entrelazados.slice(0, 6));

  const molino = gltf?.scene.getObjectByName(PIEZA.molino);
  let aspas: Object3D | undefined;
  molino?.traverse((o: Object3D) => {
    if (o.name.includes('fan') && (o as Mesh).isMesh) aspas = o;
  });
  comprobar('y las aspas del molino se pueden buscar por nombre en la escena cargada', aspas !== undefined && aspas.parent !== molino, aspas?.name);

  /*
   * LA SEGUNDA MEDIDA, POR OTRO CAMINO: `Box3` de three sobre la escena cargada, con
   * las matrices del mundo. Si la caja que mide este guion con gltf-transform y la que
   * mide three no coinciden, una de las dos se está equivocando de transformación, y
   * el juez de tallas de arriba no valdría nada.
   */
  gltf?.scene.updateMatrixWorld(true);
  const desacuerdos: string[] = [];
  for (const nombre of [PIEZA.casa, PIEZA.muro, PIEZA.molino, PIEZA.puertaMuralla]) {
    const objeto = gltf?.scene.getObjectByName(nombre);
    const propia = cajas.get(nombre);
    if (objeto === undefined || propia === undefined) {
      desacuerdos.push(`${nombre}: no se encuentra`);
      continue;
    }
    const caja = new Box3().setFromObject(objeto, true);
    const enThree = [caja.max.x - caja.min.x, caja.max.y - caja.min.y, caja.max.z - caja.min.z];
    for (let c = 0; c < 3; c++) {
      if (Math.abs((enThree[c] as number) - (propia[c] as number)) > 0.01 * Math.max(1, propia[c] as number)) {
        desacuerdos.push(`${nombre}: three mide ${enThree.map((x) => x.toFixed(3)).join(' × ')} y gltf-transform ${propia.map((x) => x.toFixed(3)).join(' × ')}`);
        break;
      }
    }
  }
  comprobar(
    'y la casa, el muro, el molino y la puerta de la muralla miden en three lo mismo que medidos con gltf-transform: la talla no se lee a sí misma',
    desacuerdos.length === 0,
    desacuerdos,
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
const COMPROBACIONES_ESCRITAS = 41;
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
    '\nburgo.glb trae exactamente las piezas que burgo/piezas.ts declara, de siete packs, todas con\n' +
      'el color horneado y ninguna con textura ni UV; las de asiento llevan su máscara —las fichas\n' +
      'y el estandarte enteras, la casa grande, la posada y la bandera a medias— y las demás no;\n' +
      'la escala va horneada en los vértices y es la del mundo del Muelle: la casa-ficha mide una\n' +
      'persona, la casa grande dos, la tesela lo que la del tablero, la losa una casilla y el muro\n' +
      'lo que la muralla; los nombres llegan enteros por el GLTFLoader de three; y ningún fichero\n' +
      'del Burgo nombra una marca ajena. Lo que esto NO prueba es que se vea bien: para eso hace\n' +
      'falta mirar.',
  );
  process.exit(0);
}

process.exit(1);
