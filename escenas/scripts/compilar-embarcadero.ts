/**
 * COMPILA LAS PIEZAS DEL EMBARCADERO EN UN SOLO FICHERO, CON EL COLOR HORNEADO.
 *
 * ═══ QUÉ SALE, Y DE DÓNDE ═══
 *
 * `escenas/modelos/embarcadero.glb`: las piezas de `PIEZAS_DEL_EMBARCADERO`
 * (`escenas/embarcadero/piezas.ts`), cada una como un nodo raíz con NUESTRO nombre,
 * sacadas del pack hexagonal EXTRA de KayKit (CC0, ver `arte/README.md`), que es el
 * mismo del que sale `tablero.glb`. La tabla de piezas manda: aquí no se escribe ni
 * un nombre ni una ruta; si falta un fichero del pack, se para y lo dice.
 *
 * ═══ POR QUÉ NO SE REUTILIZA `tablero.glb` ═══
 *
 * Porque `tablero.glb` lleva la textura del pack DENTRO y pinta moviendo las UV por
 * el atlas, y en el móvil Hermes no decodifica un PNG empotrado: ese fichero en
 * Android sale gris (`app/src/tres/texturas-nativas.ts`). Aquí la textura se aplica
 * al compilar y cada vértice se queda con su color en `COLOR_0`, como los
 * aventureros; el fichero sale sin texturas, sin imágenes y sin UV, y se carga igual
 * en los dos clientes. La maquinaria del horneado está en `hornear.ts`, compartida
 * con `compilar-aventureros.ts` para que muelle y aventurero salgan del mismo horno.
 *
 * ═══ EL COLOR DE JUGADOR SE TIÑE AL CARGAR, NO SE COMPILA CUATRO VECES ═══
 *
 * El pack trae el muelle, el barco, la bandera y el estandarte en cuatro colores, y
 * las cuatro variantes son la MISMA geometría con otras UV: sólo cambian los
 * vértices que caen en la fila del atlas donde el pack pone los colores de jugador.
 * Aquí entra SÓLO la azul, y con ella una máscara por vértice —el atributo `_TINTE`,
 * un flotante a 0 o a 1— que dice qué vértices son «del color». La escena pinta esos
 * vértices del color del asiento al cargar.
 *
 * Se tiñe y no se compila por color por dos razones que están en `piezas.ts` y en
 * `docs/EL-MUELLE.md` §1.5 y §1.6: Riberas sienta a SEIS y el pack sólo trae cuatro
 * colores, así que dos asientos no tendrían pieza; y la paleta del muelle es la del
 * tablero SVG del juego, seis tonos que no son los cuatro del pack. Con la máscara,
 * cualquier color vale y la pieza viaja una vez y no cuatro.
 *
 * La máscara NO se adivina: se hornea también la variante ROJA de la misma pieza, se
 * exige que la geometría sea la misma (mismas primitivas, mismos vértices, mismas
 * posiciones) y se marca cada vértice cuyo color horneado difiere entre azul y rojo.
 * Donde no difieren —la madera del muelle, el mástil de la bandera— no es tinte.
 *
 * ═══ DOS PIEZAS SALEN TEÑIDAS ENTERAS, Y NO ES UN FALLO ═══
 *
 * Medido sobre el pack: el muelle tiene 44 vértices de color entre 1.709 y la
 * bandera 44 entre 68; pero el barco (2.028) y el estandarte (72) difieren en TODOS.
 * Son las «unidades» del pack, y su variante `_full` es una ficha de juego: la pieza
 * entera pintada en una sola celda del atlas que trae un degradado de 87 tonos del
 * color —el sombreado va en la textura—, y la variante roja es la misma celda una
 * columna a la derecha. Es lo que `piezas.ts` eligió a sabiendas: el barco de nadie
 * es la variante `_accent`, casco crudo y sólo un ribete de color.
 *
 * Así que la regla es ésta: una máscara SIN NINGÚN vértice de color es una máscara
 * rota —las dos variantes eran la misma— y se para; una máscara CON TODOS lo es a
 * propósito, se imprime como «entera» y `verify:embarcadero-modelos` exige que sean
 * exactamente el barco y el estandarte. Consecuencia para quien tiña: en esas dos
 * piezas el color del asiento sustituye a TODO el azul, y el sombreado hay que
 * recuperarlo del propio color horneado (su luminancia respecto al azul del pack),
 * no de la máscara.
 *
 * ═══ LO QUE NO SE TOCA: LA ESCALA Y LOS HIJOS ═══
 *
 * No se escala nada. El pack va a su unidad —la casa mide 0,93— y es la escena la
 * que aplica `ESCALA_DEL_PACK` (`escenas/escala.ts`) al instanciar, exactamente como
 * hace `delta.tsx` con el tablero. Escalar aquí sería tener dos ficheros del mismo
 * pack a dos escalas, y el día que el muelle y el tablero compartan `Canvas` se
 * notaría en el primer barco.
 *
 * Los hijos de cada pieza se CONSERVAN con su nombre del pack, saneado: el molino
 * trae las aspas en una malla aparte colgando de la torre, y la escena las gira; la
 * atalaya trae el tejado suelto; la valla con puerta, la hoja. Aplanarlos ahorraría
 * unos nodos y dejaría el molino quieto para siempre. «Saneado» es lo que
 * `GLTFLoader` va a hacer igualmente con el nombre —borra `.`, `:`, `/`, `[`, `]`—,
 * más minúsculas, para que lo que se busca en la escena sea lo que hay en el fichero
 * (ver `escenas/nombres.ts`, que cuenta la tarde que costó aprenderlo).
 *
 * ═══ UN MATERIAL, UN BÚFER ═══
 *
 * Las setenta y tantas piezas llegan cada una con su copia del material del pack;
 * sin textura son todas iguales y `dedup` las funde en UNA: blanca, metalicidad 0 y
 * la rugosidad del pack, para que mande el color del vértice. `GLTFLoader` enciende
 * `vertexColors` solo al ver `COLOR_0`. Y un `.glb` admite un solo búfer, así que
 * los accesores de todas las piezas se reasignan a uno, como en `compilar-modelos.ts`.
 *
 * ═══ ESTO NO CORRE EN EL DESPLIEGUE: CORRE UNA VEZ Y SE COMMITEA EL RESULTADO ═══
 *
 *     npm run compilar:embarcadero -w escenas
 *     npm run verify:embarcadero-modelos -w escenas
 */
import { Document } from '@gltf-transform/core';
import type { Accessor, Mesh, Node, Primitive } from '@gltf-transform/core';
import { dedup, mergeDocuments, prune, weld } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';
import { ATRIBUTO_DE_TINTE, PIEZAS_DEL_EMBARCADERO, PIEZAS_QUE_SE_TINEN } from '../embarcadero/piezas';
import type { PiezaDelEmbarcadero } from '../embarcadero/piezas';
import { NOMBRE_QUE_SOBREVIVE } from '../nombres';
import { desnudaElMaterial, escritorDeGlb, horneaLaPrimitiva, pngDeLaTextura, rendirse } from './hornear';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const PACK = path.join(RAIZ, 'arte/kaykit/hexagon-extra/KayKit_Medieval_Hexagon_Pack_1.0_EXTRA/Assets/gltf');
const SALIDA = path.join(RAIZ, 'escenas/modelos/embarcadero.glb');

/**
 * A PARTIR DE CUÁNTO UN VÉRTICE ES TINTE, en bytes lineales de `COLOR_0`.
 *
 * Los vértices que no son de color salen IDÉNTICOS en la variante azul y en la roja:
 * misma UV, mismo atlas. Los que sí lo son cambian de celda y difieren en decenas
 * de pasos en algún canal. Ocho pasos es una holgura por si un vértice cae en el
 * borde de una celda y el muestreo bilineal recoge un poco de la vecina: no marca
 * como tinte una sombra y no deja fuera ningún color.
 */
const UMBRAL_DE_TINTE = 8;

/**
 * Un nombre del pack, con lo que `GLTFLoader` borraría fuera y en minúsculas, para
 * que cumpla `NOMBRE_QUE_SOBREVIVE`: `building_tower_B_top_red` → `building_tower_b_top_red`,
 * `Cube.569` → `cube_569`.
 */
function saneado(nombre: string): string {
  const limpio = nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return limpio === '' ? 'sin_nombre' : limpio;
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
 * Hornea todas las primitivas de un documento con la textura de SU material —una
 * pieza puede traer varias primitivas y varios materiales— y deja los materiales
 * sin textura. Devuelve el peor desvío de cuantización, en pasos de sRGB.
 */
function hornea(doc: Document, de: string): number {
  let desvio = 0;
  for (const { prim, malla } of primitivasEnOrden(doc)) {
    const material = prim.getMaterial();
    if (material === null) rendirse(`«${de}/${malla.getName()}» no trae material: no hay textura que hornear.`);
    const png = pngDeLaTextura(material.getBaseColorTexture(), `${de}/${malla.getName()}`);
    desvio = Math.max(desvio, horneaLaPrimitiva(doc, prim, png, saneado(malla.getName())));
  }
  for (const material of doc.getRoot().listMaterials()) desnudaElMaterial(material);
  const sobran = doc.getRoot().listTextures();
  if (sobran.length > 0) {
    rendirse(`«${de}» trae ${sobran.length} texturas que no son de color base y aquí no se hornean: ${sobran.map((t) => t.getName()).join(', ')}.`);
  }
  return desvio;
}

/**
 * Deriva `_TINTE` en la pieza azul comparando su color horneado con el de la roja.
 *
 * Se para si la geometría no es la misma: una máscara derivada de dos mallas
 * distintas marcaría vértices al azar y se vería como confeti del color del asiento.
 */
function derivaElTinte(azul: Document, rojo: Document, pieza: PiezaDelEmbarcadero): { con: number; sin: number } {
  const a = primitivasEnOrden(azul);
  const r = primitivasEnOrden(rojo);
  if (a.length !== r.length) {
    rendirse(`«${pieza.nombre}»: la variante azul trae ${a.length} primitivas y la roja ${r.length}. No son la misma pieza.`);
  }
  const bufer = azul.getRoot().listBuffers()[0];
  if (bufer === undefined) rendirse(`«${pieza.nombre}» no tiene búfer: no se puede escribir la máscara.`);

  let con = 0;
  let sin = 0;
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

    /* El color horneado es VEC4 (r, g, b, alfa a 255): se comparan los tres primeros. */
    const colA = (pa.getAttribute('COLOR_0') as Accessor).getArray() as Uint8Array;
    const colR = (pr.getAttribute('COLOR_0') as Accessor).getArray() as Uint8Array;
    /*
     * La máscara va en FLOTANTES de 0 o 1 y no en bytes: un escalar de un byte
     * se escribe con paso 4 (relleno) y `GLTFLoader` lo cargaría entrelazado;
     * pesa lo mismo. Ver la cabecera de `hornear.ts`.
     */
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
  return { con, sin };
}

/** Renombra un nodo y su descendencia con nombres que sobreviven al cargador. */
function saneaLosNombres(nodo: Node): void {
  nodo.setName(saneado(nodo.getName()));
  const malla = nodo.getMesh();
  if (malla !== null) malla.setName(saneado(malla.getName()));
  for (const h of nodo.listChildren()) saneaLosNombres(h);
}

/** Lo que se cuenta de una pieza ya dentro del fichero. */
type Medida = { nombre: string; vertices: number; triangulos: number; bytes: number; tinte?: { con: number; sin: number } };

function mide(envoltorio: Node): { vertices: number; triangulos: number; bytes: number } {
  let vertices = 0;
  let triangulos = 0;
  const accesores = new Set<Accessor>();
  const anda = (nodo: Node): void => {
    const malla = nodo.getMesh();
    if (malla !== null) {
      for (const prim of malla.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        if (pos === null) continue;
        vertices += pos.getCount();
        triangulos += (prim.getIndices()?.getCount() ?? pos.getCount()) / 3;
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
  return { vertices, triangulos, bytes };
}

async function main(): Promise<void> {
  /*
   * LA TABLA Y LA LISTA DE TEÑIBLES TIENEN QUE DECIR LO MISMO. Las dos están en
   * `piezas.ts`; si una pieza declara `tinte` y no está en `PIEZAS_QUE_SE_TINEN`, o al
   * revés, la escena teñiría lo que no tiene máscara o dejaría azul lo que sí.
   */
  const conTinte = PIEZAS_DEL_EMBARCADERO.filter((p) => p.tinte !== undefined).map((p) => p.nombre);
  const declaradas = [...PIEZAS_QUE_SE_TINEN];
  if (JSON.stringify([...conTinte].sort()) !== JSON.stringify([...declaradas].sort())) {
    rendirse(`Las piezas con variante roja [${conTinte.join(', ')}] no son las de PIEZAS_QUE_SE_TINEN [${declaradas.join(', ')}].`);
  }

  if (!fs.existsSync(PACK)) {
    rendirse(
      `No está el material bruto en ${path.relative(RAIZ, PACK)}.\n\n` +
        'Es CC0 y no se versiona a propósito. `arte/README.md` dice cómo bajarlo.',
    );
  }
  const faltan = PIEZAS_DEL_EMBARCADERO.flatMap((p) =>
    [p.fichero, p.tinte].filter((f): f is string => f !== undefined && !fs.existsSync(path.join(PACK, f))),
  );
  if (faltan.length > 0) rendirse(`Faltan en el pack:\n${faltan.map((f) => `  ${f}`).join('\n')}`);

  /* Con los atributos separados, no entrelazados: ver `escritorDeGlb` en `hornear.ts`. */
  const io = escritorDeGlb();
  const destino = new Document();
  const escena = destino.createScene('embarcadero');
  destino.getRoot().setDefaultScene(escena);

  const envoltorios = new Map<string, Node>();
  const tintes = new Map<string, { con: number; sin: number }>();
  let peorDesvio = 0;

  for (const pieza of PIEZAS_DEL_EMBARCADERO) {
    const azul = await io.read(path.join(PACK, pieza.fichero));
    peorDesvio = Math.max(peorDesvio, hornea(azul, pieza.fichero));

    if (pieza.tinte !== undefined) {
      const rojo = await io.read(path.join(PACK, pieza.tinte));
      hornea(rojo, pieza.tinte);
      tintes.set(pieza.nombre, derivaElTinte(azul, rojo, pieza));
    }

    /*
     * Como en `compilar-modelos.ts`: `merge` trae el documento entero y deja SUS
     * escenas dentro. Se cogen sus raíces, se cuelgan de un envoltorio con nuestro
     * nombre, y sus escenas sobran.
     */
    mergeDocuments(destino, azul);
    const traidas = destino.getRoot().listScenes().filter((e) => e !== escena);
    const raices = traidas.flatMap((e) => e.listChildren());
    if (raices.length === 0) rendirse(`«${pieza.nombre}» (${pieza.fichero}) venía sin nodos.`);
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
    rendirse(`Han quedado ${materiales.length} materiales y tenía que quedar uno: [${materiales.map((m) => m.getName()).join(', ')}].`);
  }
  const material = materiales[0] as NonNullable<(typeof materiales)[0]>;
  material.setName('embarcadero').setMetallicFactor(0);
  if (root.listTextures().length !== 0) rendirse(`Han quedado ${root.listTextures().length} texturas dentro.`);

  /* Los nombres, una última vez, ya dentro del fichero que se va a escribir. */
  const malos = root.listNodes().map((n) => n.getName()).filter((n) => !NOMBRE_QUE_SOBREVIVE.test(n));
  if (malos.length > 0) rendirse(`Estos nombres no sobreviven a GLTFLoader: ${malos.join(', ')}`);

  /* Un solo búfer, que es lo único que admite un `.glb`. */
  const unico = destino.createBuffer('embarcadero');
  for (const accesor of root.listAccessors()) accesor.setBuffer(unico);
  for (const bufer of root.listBuffers()) if (bufer !== unico) bufer.dispose();

  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  await io.write(SALIDA, destino);

  console.log('\n  pieza                 vértices  triáng.      kB  tinte (de color/sin color)');
  const medidas: Medida[] = [];
  for (const pieza of PIEZAS_DEL_EMBARCADERO) {
    const m = mide(envoltorios.get(pieza.nombre) as Node);
    const tinte = tintes.get(pieza.nombre);
    medidas.push({ nombre: pieza.nombre, ...m, ...(tinte === undefined ? {} : { tinte }) });
    console.log(
      `  ${pieza.nombre.padEnd(20)} ${String(m.vertices).padStart(9)} ${String(m.triangulos).padStart(8)}` +
        ` ${(m.bytes / 1024).toFixed(1).padStart(7)}` +
        (tinte === undefined ? '' : `  ${tinte.con}/${tinte.sin}${tinte.sin === 0 ? ' (entera)' : ''}`),
    );
  }
  const total = medidas.reduce(
    (t, m) => ({ vertices: t.vertices + m.vertices, triangulos: t.triangulos + m.triangulos, bytes: t.bytes + m.bytes }),
    { vertices: 0, triangulos: 0, bytes: 0 },
  );
  const bytes = fs.statSync(SALIDA).size;
  console.log(
    `  ${'TOTAL'.padEnd(20)} ${String(total.vertices).padStart(9)} ${String(total.triangulos).padStart(8)} ${(total.bytes / 1024).toFixed(1).padStart(7)}`,
  );
  console.log(
    `\n  ${medidas.length} piezas · ${root.listMeshes().length} mallas · ${materiales.length} material · ${root.listTextures().length} texturas` +
      ` · rugosidad ${material.getRoughnessFactor()} · peor desvío sRGB ${peorDesvio.toFixed(1)}`,
  );
  console.log(`  ${(bytes / 1024).toFixed(0)} kB en ${path.relative(RAIZ, SALIDA)}\n`);
}

await main();
