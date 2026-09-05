/**
 * ¿PINTA EL MÓVIL EL MISMO ATLAS QUE LA WEB? La tabla compilada, píxel a píxel, y el
 * complemento que la monta, propiedad a propiedad.
 *
 * ═══ EL FALLO QUE CAZA ═══
 *
 * `escenas/atlas-del-tablero.ts` son DATOS compilados por `compilar-atlas-del-tablero.ts`
 * desde la imagen empotrada en `tablero.glb`, y en el teléfono son LA ÚNICA fuente de
 * color del delta: Hermes no decodifica el PNG, así que si la tabla se separa de la
 * imagen —alguien recompila el tablero con otro atlas y no recompila la tabla, o edita
 * la tabla a mano— el móvil pinta un delta con los colores de antes y nada se pone rojo.
 * Es el mismo fallo silencioso de `iconos.ts`, sólo que aquí lo que sale mal es el suelo
 * entero de la partida.
 *
 * Y hay un segundo fallo, más fino, que no tiene nada que ver con los datos: la textura
 * que `texturas-nativas.ts` construye con esos datos tiene que llevar puesto lo que
 * `GLTFLoader` pone cuando decodifica él la imagen y NO pone cuando se la da un
 * complemento: `flipY = false` (con `true` la hierba se pinta con la celda del agua), el
 * espacio sRGB (sin él el delta sale lavado), los filtros con mipmaps del `sampler` del
 * tablero. Ninguna de esas tres cosas falla al compilar, ni al cargar: fallan en la
 * pantalla del teléfono, que es donde no se puede mirar desde aquí.
 *
 * ═══ CÓMO ═══
 *
 *  1. Como `verify:iconos`: se recompila a un temporal con `--a` y se compara byte a byte
 *     con el fichero del árbol, comprobando que el bueno no cambió por el camino.
 *  2. Se ensancha la tabla con el MISMO código que usa la app (`texeles-del-atlas.ts`) y
 *     se compara con el PNG del `.glb` decodificado en Node: el millón de píxeles, todos.
 *  3. Se vuelven a medir sobre la tabla los dos colores que la paleta tiene medidos
 *     contra el PNG: el dorado del campo y el téxel del agua.
 *  4. Se llama al complemento de verdad en Node, con un analizador de mentira que trae
 *     el JSON de texturas del `.glb`, y se mira lo que devuelve: para el atlas la
 *     `DataTexture` con sus téxeles y sus propiedades, para las demás imágenes la blanca;
 *     y `texturasLisas` —el de los avatares— sigue dando la blanca para todo.
 *  5. Y que ningún nodo que la escena pinte use una imagen SIN compilar: el tablero lleva
 *     tres, y las otras dos salen blancas a sabiendas mientras nadie las pinte.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import type { Node, Primitive } from '@gltf-transform/core';
import type { GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  ALTO_DEL_ATLAS,
  ANCHO_DEL_ATLAS,
  COLUMNAS_DE_LA_TABLA,
  IMAGEN_DEL_ATLAS,
  TABLA_EN_BASE64,
} from '../atlas-del-tablero';
import { COLOR_DEL_AGUA_DEL_PACK } from '../marea';
import { MODELO } from '../nombres';
import { PALETA } from '../paleta';
import { decodificaBase64, texelesDelAtlas } from '../texeles-del-atlas';
import { texturasDelTablero, texturasLisas } from '../../app/src/tres/texturas-nativas';
import { decodificaPng, muestrea } from './hornear';
import type { PngDecodificado } from './hornear';

const AQUI = path.resolve(import.meta.dirname ?? __dirname);
const RAIZ = path.resolve(AQUI, '..', '..');
const ESCENAS = path.join(RAIZ, 'escenas');
const COMPILADOR = path.join(AQUI, 'compilar-atlas-del-tablero.ts');
const EL_BUENO = path.join(ESCENAS, 'atlas-del-tablero.ts');
const TABLERO = path.join(ESCENAS, 'modelos', 'tablero.glb');

/**
 * EL DORADO DEL CAMPO, medido sobre el PNG del pack: la media de la celda (3,1). Es el
 * número que `paleta.ts` da en la cabecera de `CLASICOS` para justificar esa celda, y
 * aquí se vuelve a medir sobre la TABLA, no sobre el PNG: si la tabla se separa del
 * atlas, ésta es la primera cifra que se mueve.
 */
const CAMPO_MEDIDO_EN_EL_PACK = '#d19846';

/**
 * CUÁNTO SE DEJA MOVER UN COLOR: dos pasos de sRGB por canal. Uno no lo ve nadie; dos
 * ya es otro tono. Lo medido hoy es cero en los dos, y se deja el margen por si algún
 * día la tabla se reduce a propósito.
 */
const PASOS_DE_SRGB_QUE_SE_TOLERAN = 2;

/**
 * CUÁNTO PUEDE PESAR EL MÓDULO: entra en el bundle de la app. Hoy pesa 36 kB (8 × 1.024
 * colores en base64 más la cabecera); el tope avisa a quien suba la resolución o meta
 * una segunda imagen sin haberlo medido.
 */
const TOPE_DEL_MODULO_EN_KB = 48;

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : ` — ${JSON.stringify(detalle)}`}`);
}

const aSrgb = (l: number): number => (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055) * 255;
const hex = (rgb: readonly number[]): string =>
  `#${rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`;
const canalesDe = (hexadecimal: string): number[] => [1, 3, 5].map((i) => parseInt(hexadecimal.slice(i, i + 2), 16));
const pasosEntre = (a: readonly number[], b: readonly number[]): number =>
  Math.max(...a.map((c, i) => Math.abs(c - (b[i] ?? 0))));

/* ─── 1. La tabla del árbol es lo que el compilador produce hoy ─── */

const tsx = createRequire(import.meta.url).resolve('tsx/cli');
const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-recompilado-'));
const temporal = path.join(carpeta, 'atlas-del-tablero.ts');
const antes = fs.existsSync(EL_BUENO) ? fs.readFileSync(EL_BUENO) : null;
comprobar('`escenas/atlas-del-tablero.ts` existe: es lo que el móvil pinta', antes !== null, EL_BUENO);

const salida = spawnSync(process.execPath, [tsx, COMPILADOR, '--a', temporal], {
  cwd: AQUI,
  encoding: 'utf8',
  timeout: 180_000,
});
comprobar(
  'el compilador del atlas termina con salida 0 escribiendo a la ruta que se le pide',
  salida.status === 0,
  { status: salida.status, error: salida.error?.message, cola: (salida.stderr ?? '').slice(-600) },
);
const recompilado = fs.existsSync(temporal) ? fs.readFileSync(temporal) : null;
comprobar('y deja un fichero con contenido en esa ruta, no en otra', recompilado !== null && recompilado.length > 0, temporal);
const despues = fs.existsSync(EL_BUENO) ? fs.readFileSync(EL_BUENO) : null;
comprobar(
  'el bueno no ha cambiado por el camino: `--a` se ha obedecido y no se ha escrito encima de lo que se compara',
  antes !== null && despues !== null && antes.equals(despues),
);
const lineasDe = (b: Buffer | null): string[] =>
  b === null ? [] : b.toString('utf8').replace(/\r\n/g, '\n').split('\n');
const delArbol = lineasDe(antes);
const delGuion = lineasDe(recompilado);
let primeraDistinta = -1;
for (let i = 0; i < Math.max(delArbol.length, delGuion.length); i++) {
  if (delArbol[i] !== delGuion[i]) {
    primeraDistinta = i;
    break;
  }
}
comprobar(
  '`escenas/atlas-del-tablero.ts` es exactamente lo que `compilar-atlas-del-tablero.ts` produce hoy desde `tablero.glb`: si no, recompila (`npm run compilar:atlas-del-tablero -w escenas`)',
  antes !== null && recompilado !== null && primeraDistinta === -1,
  primeraDistinta === -1
    ? undefined
    : {
        linea: primeraDistinta + 1,
        enElArbol: (delArbol[primeraDistinta] ?? '<no hay línea>').slice(0, 120),
        recompilada: (delGuion[primeraDistinta] ?? '<no hay línea>').slice(0, 120),
      },
);
fs.rmSync(carpeta, { recursive: true, force: true });

comprobar(
  `el módulo pesa menos de ${String(TOPE_DEL_MODULO_EN_KB)} kB: entra en el bundle de la app`,
  antes !== null && antes.length < TOPE_DEL_MODULO_EN_KB * 1024,
  { kB: antes === null ? null : (antes.length / 1024).toFixed(1) },
);

/* ─── 2. La tabla ensanchada ES el PNG del .glb ─── */

const io = new NodeIO();
const doc = await io.read(TABLERO);
const raiz = doc.getRoot();
const texturas = raiz.listTextures();
const indiceDelAtlas = texturas.findIndex((t) => t.getName() === IMAGEN_DEL_ATLAS);
comprobar(
  'la imagen que la tabla dice sustituir sigue estando en `tablero.glb`',
  indiceDelAtlas >= 0,
  { buscada: IMAGEN_DEL_ATLAS, hay: texturas.map((t) => t.getName()) },
);
const bytesDelAtlas = indiceDelAtlas >= 0 ? texturas[indiceDelAtlas]?.getImage() : null;
const png: PngDecodificado | null = bytesDelAtlas ? decodificaPng(bytesDelAtlas) : null;
comprobar(
  'y mide lo que la tabla dice: las UV del modelo se reparten sobre esas medidas',
  png !== null && png.width === ANCHO_DEL_ATLAS && png.height === ALTO_DEL_ATLAS,
  { png: png ? [png.width, png.height] : null, tabla: [ANCHO_DEL_ATLAS, ALTO_DEL_ATLAS] },
);

/*
 * EL DECODIFICADOR DE BASE64 ES DE LA CASA, y se contrasta con el de Node: si un día
 * alguien lo «simplifica» y pierde un bit, el atlas sale corrido en el teléfono y aquí
 * seguiría comparándose consigo mismo.
 */
const tablaDeLaCasa = decodificaBase64(TABLA_EN_BASE64);
const tablaDeNode = Buffer.from(TABLA_EN_BASE64, 'base64');
comprobar(
  'el decodificador de base64 de `texeles-del-atlas.ts` da los mismos bytes que el de Node',
  tablaDeNode.equals(Buffer.from(tablaDeLaCasa)) && tablaDeLaCasa.length === ALTO_DEL_ATLAS * COLUMNAS_DE_LA_TABLA * 3,
  { casa: tablaDeLaCasa.length, node: tablaDeNode.length },
);

const texeles = texelesDelAtlas();
let pixelesDistintos = 0;
let alfaNoOpaco = 0;
let primerDistinto: { x: number; y: number; png: string; tabla: string } | null = null;
if (png !== null) {
  for (let i = 0, p = 0; i < texeles.length; i += 4, p++) {
    if (texeles[i + 3] !== 255) alfaNoOpaco++;
    if (png.data[i] !== texeles[i] || png.data[i + 1] !== texeles[i + 1] || png.data[i + 2] !== texeles[i + 2]) {
      pixelesDistintos++;
      if (primerDistinto === null) {
        primerDistinto = {
          x: p % ANCHO_DEL_ATLAS,
          y: Math.floor(p / ANCHO_DEL_ATLAS),
          png: hex([png.data[i] ?? 0, png.data[i + 1] ?? 0, png.data[i + 2] ?? 0]),
          tabla: hex([texeles[i] ?? 0, texeles[i + 1] ?? 0, texeles[i + 2] ?? 0]),
        };
      }
    }
  }
}
comprobar(
  'la tabla ensanchada con el código de la app es el PNG del `.glb` píxel a píxel: el móvil pinta lo mismo que la web',
  png !== null && texeles.length === png.data.length && pixelesDistintos === 0 && alfaNoOpaco === 0,
  { pixelesDistintos, alfaNoOpaco, primerDistinto },
);

/* ─── 3. Los colores que la paleta tiene medidos salen de la tabla ─── */

const ensanchada: PngDecodificado = { width: ANCHO_DEL_ATLAS, height: ALTO_DEL_ATLAS, data: Buffer.from(texeles) };
{
  const celda = PALETA['campo']?.celda ?? [3, 1];
  const anchoDeCelda = ANCHO_DEL_ATLAS / 8;
  const altoDeCelda = ALTO_DEL_ATLAS / 4;
  const suma = [0, 0, 0];
  let cuantos = 0;
  for (let y = celda[1] * altoDeCelda; y < (celda[1] + 1) * altoDeCelda; y++) {
    for (let x = celda[0] * anchoDeCelda; x < (celda[0] + 1) * anchoDeCelda; x++) {
      const i = (y * ANCHO_DEL_ATLAS + x) * 4;
      for (let c = 0; c < 3; c++) suma[c] = (suma[c] ?? 0) + (texeles[i + c] ?? 0);
      cuantos++;
    }
  }
  const media = suma.map((s) => s / cuantos);
  const pasos = pasosEntre(media, canalesDe(CAMPO_MEDIDO_EN_EL_PACK));
  comprobar(
    'el dorado del campo —la media de su celda, medida en `paleta.ts` contra el PNG— sale de la tabla dentro de dos pasos de sRGB',
    cuantos > 0 && pasos <= PASOS_DE_SRGB_QUE_SE_TOLERAN,
    { celda, escrito: CAMPO_MEDIDO_EN_EL_PACK, medido: hex(media), pasos: Number(pasos.toFixed(2)) },
  );
}
{
  /* La misma cuenta que `verify:escena` hace sobre el PNG: la UV media de las esquinas altas de la tesela de agua. */
  const nodoAgua = raiz.listNodes().find((n) => n.getName() === MODELO.agua);
  const primitivas: Primitive[] = [];
  const baja = (n: Node): void => {
    for (const p of n.getMesh()?.listPrimitives() ?? []) primitivas.push(p);
    for (const h of n.listChildren()) baja(h);
  };
  if (nodoAgua) baja(nodoAgua);
  const prim = primitivas[0];
  const posiciones = prim?.getAttribute('POSITION') ?? null;
  const uvs = prim?.getAttribute('TEXCOORD_0') ?? null;
  let medido: number[] | null = null;
  if (posiciones !== null && uvs !== null) {
    const punto = [0, 0, 0];
    const st = [0, 0];
    let alto = -Infinity;
    for (let i = 0; i < posiciones.getCount(); i++) {
      posiciones.getElement(i, punto);
      alto = Math.max(alto, punto[1] ?? -Infinity);
    }
    let u = 0;
    let v = 0;
    let cuantos = 0;
    for (let i = 0; i < posiciones.getCount(); i++) {
      posiciones.getElement(i, punto);
      if ((punto[1] ?? -Infinity) < alto - 1e-4) continue;
      uvs.getElement(i, st);
      u += st[0] ?? 0;
      v += st[1] ?? 0;
      cuantos++;
    }
    const lineal = [0, 0, 0];
    if (cuantos > 0) {
      muestrea(ensanchada, u / cuantos, v / cuantos, lineal);
      medido = lineal.map(aSrgb);
    }
  }
  const pasos = medido === null ? Infinity : pasosEntre(medido, canalesDe(COLOR_DEL_AGUA_DEL_PACK));
  comprobar(
    'el téxel del agua del pack (`COLOR_DEL_AGUA_DEL_PACK`, el albedo del mar) sale de la tabla dentro de dos pasos de sRGB',
    medido !== null && pasos <= PASOS_DE_SRGB_QUE_SE_TOLERAN,
    { escrito: COLOR_DEL_AGUA_DEL_PACK, medido: medido === null ? null : hex(medido), pasos: Number(pasos.toFixed(2)) },
  );
}

/* ─── 4. El complemento, llamado de verdad con un analizador de mentira ─── */

type TexturaMirada = {
  isDataTexture?: boolean;
  name?: string;
  flipY?: boolean;
  colorSpace?: string;
  wrapS?: number;
  wrapT?: number;
  magFilter?: number;
  minFilter?: number;
  generateMipmaps?: boolean;
  image?: { width?: number; height?: number; data?: Uint8Array };
};
/* Los números de `three`, escritos: aquí conviven dos copias del paquete y las constantes son las mismas en las dos. */
const REPEAT = 1000;
const LINEAR = 1006;
const LINEAR_MIPMAP_LINEAR = 1008;

const parserFalso = {
  json: {
    textures: texturas.map((_, i) => ({ source: i, sampler: 0 })),
    images: texturas.map((t) => ({ name: t.getName() })),
  },
} as unknown as GLTFParser;

const delTablero = texturasDelTablero(parserFalso);
const delAvatar = texturasLisas(parserFalso);
const atlas = (await delTablero.loadTexture?.(indiceDelAtlas)) as TexturaMirada | null | undefined;
comprobar(
  '`texturasDelTablero` contesta al atlas con una `DataTexture` de las medidas del PNG, y no con la blanca',
  !!atlas?.isDataTexture && atlas.image?.width === ANCHO_DEL_ATLAS && atlas.image?.height === ALTO_DEL_ATLAS,
  { esDataTexture: atlas?.isDataTexture, medidas: [atlas?.image?.width, atlas?.image?.height] },
);
comprobar(
  'y sus téxeles son la tabla ensanchada, byte a byte',
  atlas?.image?.data instanceof Uint8Array && Buffer.from(atlas.image.data).equals(Buffer.from(texeles)),
);
comprobar(
  'con `flipY = false`, como deja `GLTFLoader` las suyas: la fila 0 arriba, o la hierba sale del agua',
  atlas?.flipY === false,
  { flipY: atlas?.flipY },
);
comprobar(
  'en espacio sRGB, como `assignTexture` marca el mapa de color: sin él el delta sale lavado',
  atlas?.colorSpace === 'srgb',
  { colorSpace: atlas?.colorSpace },
);
comprobar(
  'con la envoltura y los filtros del `sampler` del tablero (REPEAT, lineal, lineal-mipmap-lineal) y mipmaps: el mismo filtrado que la web',
  atlas?.wrapS === REPEAT &&
    atlas?.wrapT === REPEAT &&
    atlas?.magFilter === LINEAR &&
    atlas?.minFilter === LINEAR_MIPMAP_LINEAR &&
    atlas?.generateMipmaps === true,
  { wrapS: atlas?.wrapS, wrapT: atlas?.wrapT, magFilter: atlas?.magFilter, minFilter: atlas?.minFilter, mipmaps: atlas?.generateMipmaps },
);
const otraVez = await delTablero.loadTexture?.(indiceDelAtlas);
comprobar('y la textura del atlas se construye UNA vez por app: la segunda llamada devuelve la misma', otraVez === atlas);

const esBlancaDeUnPixel = (t: TexturaMirada | null | undefined): boolean =>
  !!t?.isDataTexture &&
  t.image?.width === 1 &&
  t.image?.height === 1 &&
  t.image.data instanceof Uint8Array &&
  Buffer.from(t.image.data).equals(Buffer.from([255, 255, 255, 255]));

const otrasImagenes = texturas.map((t, i) => i).filter((i) => i !== indiceDelAtlas);
const otras = await Promise.all(otrasImagenes.map((i) => delTablero.loadTexture?.(i) as Promise<TexturaMirada>));
comprobar(
  'a las demás imágenes del tablero les contesta con la blanca de un píxel, que es lo que salía antes para todas',
  otrasImagenes.length > 0 && otras.every(esBlancaDeUnPixel),
  { imagenes: otrasImagenes.map((i) => texturas[i]?.getName()) },
);
const paraElAvatar = (await delAvatar.loadTexture?.(indiceDelAtlas)) as TexturaMirada | null | undefined;
comprobar(
  '`texturasLisas` —el de los avatares— sigue contestando la blanca hasta para el atlas: `escena-avatar.tsx` no cambia',
  esBlancaDeUnPixel(paraElAvatar),
);

/* ─── 5. Ningún nodo que la escena pinte usa una imagen sin compilar ─── */

{
  const escena = raiz.getDefaultScene() ?? raiz.listScenes()[0];
  const materialesDe = (n: Node, acc: Set<string>): Set<string> => {
    for (const p of n.getMesh()?.listPrimitives() ?? []) {
      const textura = p.getMaterial()?.getBaseColorTexture();
      if (textura) acc.add(textura.getName());
    }
    for (const h of n.listChildren()) materialesDe(h, acc);
    return acc;
  };
  const nodosSinCompilar: string[] = [];
  for (const hijo of escena?.listChildren() ?? []) {
    for (const imagen of materialesDe(hijo, new Set())) {
      if (imagen !== IMAGEN_DEL_ATLAS) nodosSinCompilar.push(hijo.getName());
    }
  }
  /*
   * Los nodos se piden por `MODELO.<llave>` o por una fábrica de nombres (`modeloDeBien`),
   * nunca por su cadena: se buscan esas formas en el código de las escenas —sin
   * comentarios— y ninguna puede aparecer. Si aparece, la imagen hay que compilarla.
   */
  const llaves = Object.entries(MODELO)
    .filter(([, nombre]) => nodosSinCompilar.includes(nombre))
    .map(([llave]) => llave);
  const fabricas = nodosSinCompilar.some((n) => n.startsWith('bien-')) ? ['modeloDeBien('] : [];
  const fuentes = fs
    .readdirSync(ESCENAS)
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.d.ts') && f !== 'nombres.ts' && f !== 'modelos.ts')
    .map((f) => path.join(ESCENAS, f));
  const usos: string[] = [];
  for (const fichero of fuentes) {
    const codigo = fs
      .readFileSync(fichero, 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l));
    codigo.forEach((linea, i) => {
      for (const llave of llaves) {
        if (new RegExp(`MODELO\\.${llave}\\b`).test(linea)) usos.push(`${path.basename(fichero)}:${String(i + 1)} MODELO.${llave}`);
      }
      for (const fabrica of fabricas) {
        if (linea.includes(fabrica)) usos.push(`${path.basename(fichero)}:${String(i + 1)} ${fabrica}`);
      }
    });
  }
  comprobar(
    'ningún nodo que la escena pida usa una imagen del tablero sin compilar: las que salen blancas en el móvil no las pinta nadie',
    nodosSinCompilar.length > 0 && usos.length === 0,
    { nodosConImagenSinCompilar: nodosSinCompilar, usos },
  );
}

/* Veintiuna comprobaciones, siempre: si un día son menos es que alguien ha borrado una. */
const COMPROBACIONES_ESCRITAS = 21;
if (hechas < COMPROBACIONES_ESCRITAS) {
  fallos.push(`sólo se han hecho ${String(hechas)} de las ${String(COMPROBACIONES_ESCRITAS)} comprobaciones escritas`);
}

if (fallos.length > 0) {
  console.log(`\n${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log('');
  process.exit(1);
}
console.log(
  `\n${String(hechas)} comprobaciones\n\n` +
    'El móvil pinta el atlas del tablero, y el mismo que la web: `escenas/atlas-del-tablero.ts` es byte a\n' +
    'byte lo que el compilador produce desde `tablero.glb`, ensanchado es el PNG píxel a píxel, y el\n' +
    'complemento lo monta con el `flipY`, el espacio de color y los filtros que `GLTFLoader` habría puesto.\n',
);
