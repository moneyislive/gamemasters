/**
 * COMPILA LAS PIEZAS DEL BURGO EN UN SOLO FICHERO, CON EL COLOR HORNEADO Y A ESCALA.
 *
 * ═══ QUÉ SALE, Y DE DÓNDE ═══
 *
 * `escenas/modelos/burgo.glb`: las piezas de `PIEZAS_DEL_BURGO` (`escenas/burgo/piezas.ts`),
 * cada una como un nodo raíz con NUESTRO nombre, sacadas de SIETE packs de KayKit (todos
 * CC0, ver `arte/README.md`). La tabla manda: aquí no se escribe ni un nombre ni una ruta;
 * si falta un fichero de un pack, se para y lo dice.
 *
 * ═══ SIETE TEXTURAS, UN HORNO ═══
 *
 * Cada pack lleva su atlas —`boardgame_bits_texture.png`, `dungeon_texture.png`,
 * `hexagons_medieval.png`…— y cada `.gltf` referencia el suyo por ruta relativa, junto al
 * fichero. `hornear.ts` muestrea la textura del material de CADA primitiva, no una fija,
 * y los PNG decodificados se reconocen por su huella y no por su nombre, así que dos packs
 * con atlas distintos no se confunden y el mismo atlas repetido en veinte carpetas se
 * decodifica una vez. Se comprobó compilando los siete: el horno no necesitó ningún cambio.
 *
 * ═══ LA ESCALA SE HORNEA AQUÍ, Y POR QUÉ (AL REVÉS QUE EL EMBARCADERO) ═══
 *
 * Los siete packs vienen en cuatro unidades distintas (`piezas.ts` las mide y elige un
 * factor por pack). Dejar el fichero a la unidad de cada pack obligaría a la escena a
 * llevar una tabla de factores y acordarse de aplicarla instancia a instancia. Aquí cada
 * pieza se multiplica UNA vez, al compilar: las posiciones de sus vértices y las
 * traslaciones de sus hijos —una escala uniforme conmuta con el giro, así que ni las
 * rotaciones ni las normales cambian—. `burgo.glb` sale a la escala del mundo del Muelle
 * y la escena lo instancia a 1. `verify:burgo-modelos` mide que la casa-ficha mida una
 * persona, la casa grande dos, y la pared de la mazmorra lo que la muralla.
 *
 * La máscara de tinte se deriva ANTES de escalar, comparando la variante azul con la roja
 * a la unidad del pack; la roja se tira después, así que no hace falta escalarla.
 *
 * ═══ UN MATERIAL, UN BÚFER, Y LA RUGOSIDAD SE UNIFICA ═══
 *
 * Sin textura, los materiales de los siete packs son iguales salvo en la rugosidad, que
 * cada autor dejó a su gusto (0,3 las monedas, 0,45 la mazmorra, 0,6 el atrezo de
 * Halloween, 0,5 los demás; medido). A la talla a la que se pinta un burgo esa diferencia
 * no se distingue, y siete materiales son siete tandas de dibujo por nada. Se fija la de
 * la mayoría, `RUGOSIDAD_DEL_BURGO`, ANTES de fundir, y `dedup` deja UNO: blanco,
 * metalicidad 0, para que mande el color del vértice. Si por cualquier otra diferencia
 * quedara más de uno, se para y dice cuáles.
 *
 * ═══ EL PRESUPUESTO ═══
 *
 * Un fichero que viaja a cada móvil al abrir el arcade. `TOPE_DE_BYTES` es el techo: si
 * el `.glb` se pasa, se borra lo escrito, se imprime la tabla con las piezas más caras
 * arriba y se sale en rojo. Lo que se quita se decide a mano, en `piezas.ts`, con los
 * números delante; nunca aquí en silencio.
 *
 * ═══ ESTO NO CORRE EN EL DESPLIEGUE: CORRE UNA VEZ Y SE COMMITEA EL RESULTADO ═══
 *
 *     npm run compilar:burgo -w escenas
 *     npm run verify:burgo-modelos -w escenas
 */
import { Document } from '@gltf-transform/core';
import type { Accessor, Mesh, Node, Primitive } from '@gltf-transform/core';
import { dedup, mergeDocuments, prune, weld } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';
import {
  ATRIBUTO_DE_TINTE,
  CARPETA_DE_PACKS,
  escalaDe,
  PACKS,
  PIEZAS_DEL_BURGO,
  PIEZAS_QUE_SE_TINEN,
  PIEZAS_TENIDAS_ENTERAS,
  TOPE_DE_BYTES_DEL_BURGO,
} from '../burgo/piezas';
import type { PiezaDelBurgo } from '../burgo/piezas';
import { NOMBRE_QUE_SOBREVIVE } from '../nombres';
import { desnudaElMaterial, escritorDeGlb, horneaLaPrimitiva, pngDeLaTextura, rendirse } from './hornear';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const SALIDA = path.join(RAIZ, 'escenas/modelos/burgo.glb');

/** El techo del fichero, escrito en la tabla para que el comprobador exija el mismo. */
const TOPE_DE_BYTES = TOPE_DE_BYTES_DEL_BURGO;

/** La rugosidad que se queda: la de la mayoría de los packs. Ver la cabecera. */
const RUGOSIDAD_DEL_BURGO = 0.5;

/**
 * A PARTIR DE CUÁNTO UN VÉRTICE ES TINTE, en bytes lineales de `COLOR_0`. El mismo
 * umbral que el embarcadero, y por lo mismo: ocho pasos dejan pasar el bilineal del
 * borde de una celda y no dejan fuera ningún color.
 */
const UMBRAL_DE_TINTE = 8;

/** Un nombre del pack con lo que `GLTFLoader` borraría fuera y en minúsculas. */
function saneado(nombre: string): string {
  const limpio = nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return limpio === '' ? 'sin_nombre' : limpio;
}

/** Dónde está en el disco el fichero de una pieza (o su variante roja). */
function rutaDe(pieza: PiezaDelBurgo, fichero: string): string {
  return path.join(RAIZ, CARPETA_DE_PACKS, PACKS[pieza.pack].carpeta, fichero);
}

/** Las primitivas de un documento en orden de árbol, con la malla de la que salen. */
function primitivasEnOrden(doc: Document): Array<{ prim: Primitive; malla: Mesh }> {
  const salida: Array<{ prim: Primitive; malla: Mesh }> = [];
  const anda = (nodo: Node): void => {
    const malla = nodo.getMesh();
    if (malla !== null) for (const prim of malla.listPrimitives()) salida.push({ prim, malla });
    for (const h of nodo.listChildren()) anda(h);
  };
  for (const escena of doc.getRoot().listScenes()) for (const raiz of escena.listChildren()) anda(raiz);
  return salida;
}

/**
 * Hornea todas las primitivas de un documento con la textura de SU material y deja los
 * materiales sin textura y con la rugosidad del Burgo. Devuelve el peor desvío de
 * cuantización, en pasos de sRGB.
 */
function hornea(doc: Document, de: string): number {
  let desvio = 0;
  for (const { prim, malla } of primitivasEnOrden(doc)) {
    const material = prim.getMaterial();
    if (material === null) rendirse(`«${de}/${malla.getName()}» no trae material: no hay textura que hornear.`);
    const png = pngDeLaTextura(material.getBaseColorTexture(), `${de}/${malla.getName()}`);
    desvio = Math.max(desvio, horneaLaPrimitiva(doc, prim, png, saneado(malla.getName())));
  }
  for (const material of doc.getRoot().listMaterials()) {
    desnudaElMaterial(material);
    material.setRoughnessFactor(RUGOSIDAD_DEL_BURGO).setMetallicFactor(0);
  }
  const sobran = doc.getRoot().listTextures();
  if (sobran.length > 0) {
    rendirse(`«${de}» trae ${sobran.length} texturas que no son de color base y aquí no se hornean: ${sobran.map((t) => t.getName()).join(', ')}.`);
  }
  return desvio;
}

/** lineal (byte) → sRGB (byte), sólo para imprimir el azul medido. */
function aSrgb(byteLineal: number): number {
  const l = byteLineal / 255;
  const c = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055;
  return Math.round(c * 255);
}

/** Lo que se mide de una máscara: cuántos de color, cuántos sin, y el color medio de los de color. */
type Tinte = { con: number; sin: number; azul: [number, number, number] };

/**
 * Deriva `_TINTE` en la pieza azul comparando su color horneado con el de la roja.
 * Se para si la geometría no es la misma: una máscara derivada de dos mallas distintas
 * marcaría vértices al azar.
 */
function derivaElTinte(azul: Document, rojo: Document, pieza: PiezaDelBurgo): Tinte {
  const a = primitivasEnOrden(azul);
  const r = primitivasEnOrden(rojo);
  if (a.length !== r.length) {
    rendirse(`«${pieza.nombre}»: la variante azul trae ${a.length} primitivas y la roja ${r.length}. No son la misma pieza.`);
  }
  const bufer = azul.getRoot().listBuffers()[0];
  if (bufer === undefined) rendirse(`«${pieza.nombre}» no tiene búfer: no se puede escribir la máscara.`);

  let con = 0;
  let sin = 0;
  const suma = [0, 0, 0];
  for (let k = 0; k < a.length; k++) {
    const { prim: pa, malla } = a[k] as { prim: Primitive; malla: Mesh };
    const pr = (r[k] as { prim: Primitive }).prim;
    const posA = pa.getAttribute('POSITION') as Accessor;
    const posR = pr.getAttribute('POSITION') as Accessor;
    const n = posA.getCount();
    if (n !== posR.getCount()) {
      rendirse(`«${pieza.nombre}/${malla.getName()}»: ${n} vértices en azul y ${posR.getCount()} en rojo. No son la misma geometría.`);
    }
    const xyzA = posA.getArray() as Float32Array;
    const xyzR = posR.getArray() as Float32Array;
    for (let i = 0; i < xyzA.length; i++) {
      if (Math.abs((xyzA[i] as number) - (xyzR[i] as number)) > 1e-6) {
        rendirse(
          `«${pieza.nombre}/${malla.getName()}»: el vértice ${Math.floor(i / 3)} está en otro sitio en la variante roja ` +
            `(${String(xyzA[i])} frente a ${String(xyzR[i])}). No son la misma geometría; la máscara saldría falsa.`,
        );
      }
    }

    const colA = (pa.getAttribute('COLOR_0') as Accessor).getArray() as Uint8Array;
    const colR = (pr.getAttribute('COLOR_0') as Accessor).getArray() as Uint8Array;
    /* Flotantes de 0 o 1, no bytes: el paso tiene que ser el del elemento (ver `hornear.ts`). */
    const mascara = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const d = Math.max(
        Math.abs((colA[i * 4] as number) - (colR[i * 4] as number)),
        Math.abs((colA[i * 4 + 1] as number) - (colR[i * 4 + 1] as number)),
        Math.abs((colA[i * 4 + 2] as number) - (colR[i * 4 + 2] as number)),
      );
      if (d > UMBRAL_DE_TINTE) {
        mascara[i] = 1;
        con++;
        for (let c = 0; c < 3; c++) suma[c] = (suma[c] as number) + (colA[i * 4 + c] as number);
      } else {
        sin++;
      }
    }
    const tinte = azul
      .createAccessor(`${saneado(malla.getName())}${ATRIBUTO_DE_TINTE}`)
      .setType('SCALAR')
      .setArray(mascara)
      .setBuffer(bufer);
    pa.setAttribute(ATRIBUTO_DE_TINTE, tinte);
  }

  if (con === 0) {
    rendirse(
      `«${pieza.nombre}»: la máscara de tinte ha salido vacía: ningún vértice cambia de color entre ` +
        `${pieza.fichero} y ${pieza.tinte ?? '?'}. Son la misma variante, y no hay nada que teñir.`,
    );
  }
  const azulMedio = suma.map((s) => aSrgb(s / con)) as [number, number, number];
  return { con, sin, azul: azulMedio };
}

/**
 * HORNEA LA ESCALA EN LA PIEZA: posiciones por `k`, traslaciones de los hijos por `k`.
 *
 * Cada accesor de posición se toca UNA vez aunque lo compartan dos primitivas, y se
 * vuelve a asignar para que el escritor recalcule su mínimo y máximo. Giros y escalas
 * de los nodos se dejan como están: una escala uniforme conmuta con el giro.
 */
function escalaLaPieza(raices: readonly Node[], k: number): void {
  const vistos = new Set<Accessor>();
  const anda = (nodo: Node): void => {
    const t = nodo.getTranslation();
    nodo.setTranslation([t[0] * k, t[1] * k, t[2] * k]);
    const malla = nodo.getMesh();
    if (malla !== null) {
      for (const prim of malla.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        if (pos === null || vistos.has(pos)) continue;
        vistos.add(pos);
        const xyz = pos.getArray() as Float32Array;
        for (let i = 0; i < xyz.length; i++) xyz[i] = (xyz[i] as number) * k;
        pos.setArray(xyz);
      }
    }
    for (const h of nodo.listChildren()) anda(h);
  };
  for (const r of raices) anda(r);
}

/** Renombra un nodo y su descendencia con nombres que sobreviven al cargador. */
function saneaLosNombres(nodo: Node): void {
  nodo.setName(saneado(nodo.getName()));
  const malla = nodo.getMesh();
  if (malla !== null) malla.setName(saneado(malla.getName()));
  for (const h of nodo.listChildren()) saneaLosNombres(h);
}

/** Lo que se cuenta de una pieza ya dentro del fichero. */
type Medida = {
  nombre: string;
  vertices: number;
  triangulos: number;
  bytes: number;
  caja: [number, number, number];
  tinte?: Tinte;
};

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

function mide(envoltorio: Node): Omit<Medida, 'nombre' | 'tinte'> {
  let vertices = 0;
  let triangulos = 0;
  const accesores = new Set<Accessor>();
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const v = [0, 0, 0];
  const anda = (nodo: Node): void => {
    const malla = nodo.getMesh();
    if (malla !== null) {
      const m = nodo.getWorldMatrix();
      for (const prim of malla.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        if (pos === null) continue;
        vertices += pos.getCount();
        triangulos += (prim.getIndices()?.getCount() ?? pos.getCount()) / 3;
        for (let i = 0; i < pos.getCount(); i++) {
          const w = porLaMatriz(m, pos.getElement(i, v));
          for (let c = 0; c < 3; c++) {
            min[c] = Math.min(min[c] as number, w[c] as number);
            max[c] = Math.max(max[c] as number, w[c] as number);
          }
        }
        for (const s of prim.listSemantics()) {
          const a = prim.getAttribute(s);
          if (a !== null) accesores.add(a);
        }
        const idx = prim.getIndices();
        if (idx !== null) accesores.add(idx);
      }
    }
    for (const h of nodo.listChildren()) anda(h);
  };
  anda(envoltorio);
  let bytes = 0;
  for (const a of accesores) bytes += a.getByteLength();
  const caja = [0, 1, 2].map((c) => (max[c] as number) - (min[c] as number)) as [number, number, number];
  return { vertices, triangulos, bytes, caja };
}

async function main(): Promise<void> {
  /* La tabla y la lista de teñibles tienen que decir lo mismo, como en el embarcadero. */
  const conTinte = PIEZAS_DEL_BURGO.filter((p) => p.tinte !== undefined).map((p) => p.nombre);
  const declaradas = [...PIEZAS_QUE_SE_TINEN];
  if (JSON.stringify([...conTinte].sort()) !== JSON.stringify([...declaradas].sort())) {
    rendirse(`Las piezas con variante roja [${conTinte.join(', ')}] no son las de PIEZAS_QUE_SE_TINEN [${declaradas.join(', ')}].`);
  }

  const packsQueFaltan = Object.entries(PACKS)
    .map(([nombre, p]) => [nombre, path.join(RAIZ, CARPETA_DE_PACKS, p.carpeta)] as const)
    .filter(([, carpeta]) => !fs.existsSync(carpeta));
  if (packsQueFaltan.length > 0) {
    rendirse(
      `No está el material bruto de: ${packsQueFaltan.map(([n]) => n).join(', ')}.\n\n` +
        `Se esperaba en:\n${packsQueFaltan.map(([, c]) => `  ${path.relative(RAIZ, c)}`).join('\n')}\n\n` +
        'Son CC0 y no se versionan a propósito. `arte/README.md` dice cómo bajarlos.',
    );
  }
  const faltan = PIEZAS_DEL_BURGO.flatMap((p) =>
    [p.fichero, p.tinte]
      .filter((f): f is string => f !== undefined)
      .map((f) => rutaDe(p, f))
      .filter((ruta) => !fs.existsSync(ruta))
      .map((ruta) => path.relative(RAIZ, ruta)),
  );
  if (faltan.length > 0) rendirse(`Faltan en los packs:\n${faltan.map((f) => `  ${f}`).join('\n')}`);

  /* Con los atributos separados, no entrelazados: ver `escritorDeGlb` en `hornear.ts`. */
  const io = escritorDeGlb();
  const destino = new Document();
  const escena = destino.createScene('burgo');
  destino.getRoot().setDefaultScene(escena);

  const envoltorios = new Map<string, Node>();
  const tintes = new Map<string, Tinte>();
  let peorDesvio = 0;

  for (const pieza of PIEZAS_DEL_BURGO) {
    const azul = await io.read(rutaDe(pieza, pieza.fichero));
    peorDesvio = Math.max(peorDesvio, hornea(azul, `${pieza.pack}/${pieza.fichero}`));

    if (pieza.tinte !== undefined) {
      const rojo = await io.read(rutaDe(pieza, pieza.tinte));
      hornea(rojo, `${pieza.pack}/${pieza.tinte}`);
      tintes.set(pieza.nombre, derivaElTinte(azul, rojo, pieza));
    }

    /* La escala, ya con la máscara puesta y a la unidad del pack comparada. */
    const raicesDelPack = azul.getRoot().listScenes().flatMap((e) => e.listChildren());
    if (raicesDelPack.length === 0) rendirse(`«${pieza.nombre}» (${pieza.fichero}) venía sin nodos.`);
    escalaLaPieza(raicesDelPack, escalaDe(pieza));

    /*
     * Como en `compilar-embarcadero.ts`: `merge` trae el documento entero y deja SUS
     * escenas dentro. Se cogen sus raíces, se cuelgan de un envoltorio con nuestro
     * nombre, y sus escenas sobran.
     */
    mergeDocuments(destino, azul);
    const traidas = destino.getRoot().listScenes().filter((e) => e !== escena);
    const raices = traidas.flatMap((e) => e.listChildren());
    const envoltorio = destino.createNode(pieza.nombre);
    for (const r of raices) {
      saneaLosNombres(r);
      envoltorio.addChild(r);
    }
    escena.addChild(envoltorio);
    for (const e of traidas) e.dispose();
    envoltorios.set(pieza.nombre, envoltorio);
  }

  /* Suelda vértices repetidos, funde materiales y mallas iguales, tira lo huérfano. */
  await destino.transform(weld(), dedup(), prune());

  const root = destino.getRoot();
  const materiales = root.listMaterials();
  if (materiales.length !== 1) {
    rendirse(
      `Han quedado ${materiales.length} materiales y tenía que quedar uno: ` +
        materiales
          .map((m) => `${m.getName()} (rugosidad ${m.getRoughnessFactor()}, doble cara ${String(m.getDoubleSided())}, alfa ${m.getAlphaMode()})`)
          .join('; ') +
        '.',
    );
  }
  const material = materiales[0] as NonNullable<(typeof materiales)[0]>;
  material.setName('burgo').setMetallicFactor(0);
  if (root.listTextures().length !== 0) rendirse(`Han quedado ${root.listTextures().length} texturas dentro.`);

  /* Los nombres, una última vez, ya dentro del fichero que se va a escribir. */
  const malos = root.listNodes().map((n) => n.getName()).filter((n) => !NOMBRE_QUE_SOBREVIVE.test(n));
  if (malos.length > 0) rendirse(`Estos nombres no sobreviven a GLTFLoader: ${malos.join(', ')}`);

  /* Un solo búfer, que es lo único que admite un `.glb`. */
  const unico = destino.createBuffer('burgo');
  for (const accesor of root.listAccessors()) accesor.setBuffer(unico);
  for (const bufer of root.listBuffers()) if (bufer !== unico) bufer.dispose();

  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  await io.write(SALIDA, destino);

  const medidas: Medida[] = [];
  for (const pieza of PIEZAS_DEL_BURGO) {
    const m = mide(envoltorios.get(pieza.nombre) as Node);
    const tinte = tintes.get(pieza.nombre);
    medidas.push({ nombre: pieza.nombre, ...m, ...(tinte === undefined ? {} : { tinte }) });
  }

  console.log('\n  pieza               pack              escala  vértices  triáng.      kB   ancho × alto × fondo   tinte (de color/sin color)');
  for (const pieza of PIEZAS_DEL_BURGO) {
    const m = medidas.find((x) => x.nombre === pieza.nombre) as Medida;
    const entera = m.tinte !== undefined && m.tinte.sin === 0;
    console.log(
      `  ${pieza.nombre.padEnd(19)} ${pieza.pack.padEnd(16)} ${escalaDe(pieza).toFixed(3).padStart(7)}` +
        ` ${String(m.vertices).padStart(9)} ${String(m.triangulos).padStart(8)} ${(m.bytes / 1024).toFixed(1).padStart(7)}` +
        `   ${m.caja.map((c) => c.toFixed(2).padStart(6)).join(' × ')}` +
        (m.tinte === undefined ? '' : `   ${m.tinte.con}/${m.tinte.sin}${entera ? ' (entera)' : ''} azul sRGB ${m.tinte.azul.join(',')}`),
    );
  }
  const total = medidas.reduce(
    (t, m) => ({ vertices: t.vertices + m.vertices, triangulos: t.triangulos + m.triangulos, bytes: t.bytes + m.bytes }),
    { vertices: 0, triangulos: 0, bytes: 0 },
  );
  console.log(
    `  ${'TOTAL'.padEnd(19)} ${''.padEnd(16)} ${''.padStart(7)} ${String(total.vertices).padStart(9)} ${String(total.triangulos).padStart(8)} ${(total.bytes / 1024).toFixed(1).padStart(7)}`,
  );

  /*
   * LAS ENTERAS MEDIDAS TIENEN QUE SER LAS DECLARADAS. La tabla escribe cuáles salen
   * teñidas enteras para que quien tiña sepa dónde conservar la luminancia; si el pack
   * cambia y la medida no cuadra con la declaración, se para aquí y no en la pantalla.
   */
  const enterasMedidas = medidas.filter((m) => m.tinte !== undefined && m.tinte.sin === 0).map((m) => m.nombre);
  const enterasDeclaradas = [...PIEZAS_TENIDAS_ENTERAS];
  if (JSON.stringify([...enterasMedidas].sort()) !== JSON.stringify([...enterasDeclaradas].sort())) {
    fs.rmSync(SALIDA);
    rendirse(
      `Salen teñidas enteras [${enterasMedidas.join(', ')}] y PIEZAS_TENIDAS_ENTERAS declara [${enterasDeclaradas.join(', ')}]. ` +
        'Hay que medir y corregir la declaración en `piezas.ts`.',
    );
  }

  const bytes = fs.statSync(SALIDA).size;
  console.log(
    `\n  ${medidas.length} piezas · ${root.listMeshes().length} mallas · ${materiales.length} material · ${root.listTextures().length} texturas` +
      ` · rugosidad ${material.getRoughnessFactor()} · peor desvío sRGB ${peorDesvio.toFixed(1)}`,
  );
  console.log(`  ${(bytes / 1024).toFixed(0)} kB en ${path.relative(RAIZ, SALIDA)} (tope ${(TOPE_DE_BYTES / 1024).toFixed(0)} kB)\n`);

  if (bytes > TOPE_DE_BYTES) {
    fs.rmSync(SALIDA);
    const caras = [...medidas].sort((a, b) => b.bytes - a.bytes).slice(0, 12);
    rendirse(
      `El fichero pesa ${(bytes / 1024).toFixed(0)} kB y el tope son ${(TOPE_DE_BYTES / 1024).toFixed(0)} kB. Se ha borrado.\n\n` +
        `Las piezas más caras, para quitar en piezas.ts con los números delante:\n` +
        caras.map((m) => `  ${m.nombre.padEnd(19)} ${(m.bytes / 1024).toFixed(1).padStart(7)} kB  ${String(m.triangulos).padStart(6)} triángulos`).join('\n'),
    );
  }
}

await main();
