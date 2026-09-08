/**
 * COMPILA EL RELOJ DE ARENA EN `escenas/modelos/reloj.glb`.
 *
 * ═══ QUÉ ENTRA, Y QUÉ OBLIGA SU LICENCIA ═══
 *
 * «Hourglass / Sand Clock» de **arloopa** (Sketchfab), con licencia **CC-BY-4.0**. Y eso es
 * distinto de todo lo demás que hay en `arte/`: los cinco packs de KayKit son CC0 —dominio
 * público, citar es de buena educación y nada más— y éste EXIGE citar al autor allá donde se
 * comparta la obra. Por eso no basta con el `license.txt` del directorio: el crédito va también
 * en la página pública de créditos que sirve el servidor, y hay un comprobador que se pone rojo
 * si el modelo está y el crédito no. Ver `server/src/legal/creditos.ts`.
 *
 * ═══ POR QUÉ HAY QUE COMPILARLO Y NO SE PUEDE SERVIR TAL CUAL ═══
 *
 * Porque pesa DIECIOCHO MEGAS, cuando el tablero entero —diecinueve comarcas y ciento veintitrés
 * modelos— pesa 4,3. Casi todo son once PNG de hasta cuatro megas: color, rugosidad metálica y
 * normales para el cristal, la madera y la arena. Y el objeto vive en el estante de la barra, a
 * cuarenta y cuatro puntos de pantalla: a esa talla ninguna de esas texturas pinta un solo píxel
 * que se distinga.
 *
 * Así que se hornea, que es lo que esta casa hace con todo (`hornear.ts`): el color de la textura
 * se muestrea en las UV de cada vértice y se guarda como `COLOR_0`, y después se tiran la
 * textura, la imagen y las UV. En el móvil, además, una textura empotrada no se abre.
 *
 * ═══ LO QUE NO SE TOCA: LA ANIMACIÓN ═══
 *
 * El modelo trae un clip de cuatro segundos con ciento dos canales, y es la razón por la que
 * Miguel lo eligió. Medido sobre el `.gltf`:
 *
 *   · 50 canales de `translation` y 50 de `scale` sobre otros tantos nodos
 *     `pPlaneShape1_MASH1_Instancer_*`: son los GRANOS que caen por la cintura.
 *   · 2 canales de `weights`: los dos MONTONES de arena, que suben y bajan por morfología.
 *
 * Los granos se dejan en bucle —son un chorro y un chorro no tiene principio— y los dos montones
 * NO se dejan al clip: los mueve la fracción de turno, que es la única que sabe cuánto queda de
 * verdad. Si se dejaran correr, el reloj de arena y el reloj del turno dirían cosas distintas, y
 * el de arena es el que la gente se cree.
 *
 * ═══ EL CRISTAL NO SE HORNEA ═══
 *
 * Los otros tres materiales son opacos y se hornean a vértice. El cristal no: lo que lo hace
 * cristal es que se ve a través, y eso no cabe en un color por vértice. Se le quita la textura y
 * se le deja el material transparente con su alfa, que es una décima parte del byte de lo que
 * pesaban sus tres PNG de cuatro megas.
 */

import type { Document, Primitive } from '@gltf-transform/core';
import { dedup, prune } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';
import { escritorDeGlb, horneaLaPrimitiva, pngDeLaTextura, rendirse } from './hornear';

const AQUI = import.meta.dirname ?? __dirname;
const PACK = path.join(AQUI, '..', '..', 'arte', 'sketchfab', 'reloj-de-arena');
const ORIGEN = 'scene.gltf';
const SALIDA = path.join(AQUI, '..', 'modelos', 'reloj.glb');

/** El material del cristal, que se queda transparente en vez de hornearse. */
const CRISTAL = 'glass';
/**
 * LO QUE SE LE DEJA AL CRISTAL. Un alfa alto —se ve a través pero se ve— y sin textura.
 *
 * El original trae `KHR_materials_transmission` con su propio PNG. La transmisión es refracción
 * de verdad y cuesta una pasada aparte del renderizador; a cuarenta y cuatro puntos no compra
 * nada que un alfa no compre, y en el móvil la pasada sí se nota.
 */
const ALFA_DEL_CRISTAL = 0.34;

/** Cuántos triángulos tiene una primitiva, contando índices o vértices. */
function triangulosDe(prim: Primitive): number {
  const idx = prim.getIndices();
  const pos = prim.getAttribute('POSITION');
  const n = idx !== null ? idx.getCount() : (pos?.getCount() ?? 0);
  return Math.floor(n / 3);
}

async function compilar(): Promise<void> {
  if (!fs.existsSync(path.join(PACK, ORIGEN))) {
    rendirse(
      `No encuentro «${ORIGEN}» en ${PACK}.\n` +
        'Se baja de https://sketchfab.com/3d-models/hourglass-sand-clock-86fb4b7dc8444a33b7bde4ad1adc535e\n' +
        'en formato glTF y se descomprime ahí. Ver `arte/README.md`.',
    );
  }
  const io = escritorDeGlb();
  const doc: Document = await io.read(path.join(PACK, ORIGEN));
  const raiz = doc.getRoot();

  const antes = {
    mallas: raiz.listMeshes().length,
    imagenes: raiz.listTextures().length,
    animaciones: raiz.listAnimations().length,
  };

  let horneadas = 0;
  let peorError = 0;
  for (const malla of raiz.listMeshes()) {
    for (const prim of malla.listPrimitives()) {
      const material = prim.getMaterial();
      if (material === null) continue;
      const nombre = material.getName();
      if (nombre === CRISTAL) {
        /* El cristal: fuera la textura, y transparente de verdad. */
        const textura = material.getBaseColorTexture();
        material.setBaseColorTexture(null);
        if (textura !== null) textura.dispose();
        material
          .setBaseColorFactor([0.82, 0.9, 0.94, ALFA_DEL_CRISTAL])
          .setAlphaMode('BLEND')
          .setDoubleSided(true);
        continue;
      }
      const textura = material.getBaseColorTexture();
      if (textura === null) continue;
      /*
       * Una primitiva sin UV no se puede hornear, y aquí no se rinde el compilador entero: se
       * deja con el color plano del material, que es lo que ya tenía. Rendirse por una de las
       * cincuenta y cuatro dejaría el reloj sin compilar por un grano de arena.
       */
      if (prim.getAttribute('TEXCOORD_0') === null) continue;
      if (prim.getAttribute('COLOR_0') !== null) continue;
      const png = pngDeLaTextura(textura, nombre);
      peorError = Math.max(peorError, horneaLaPrimitiva(doc, prim, png, nombre));
      horneadas++;
    }
  }

  /*
   * Ya horneado: se sueltan TODAS las texturas, la del cristal incluida.
   *
   * Y el cristal es el que más pesa, que es lo que no se ve venir: su color se le quitó arriba,
   * pero sus mapas de RUGOSIDAD METÁLICA y de NORMALES seguían dentro. Medido sobre el `.glb` a
   * medio compilar: 1.840 kB y 1.018 kB, o sea 2,8 de los 3,6 megas del fichero — dos PNG que a
   * cuarenta y cuatro puntos de pantalla no pintan un píxel distinguible, y que en el móvil
   * además hay que descomprimir.
   */
  for (const material of raiz.listMaterials()) {
    const textura = material.getBaseColorTexture();
    if (material.getName() !== CRISTAL) {
      material.setBaseColorTexture(null).setBaseColorFactor([1, 1, 1, 1]);
    }
    if (textura !== null) textura.dispose();
    const mr = material.getMetallicRoughnessTexture();
    material.setMetallicRoughnessTexture(null);
    if (mr !== null) mr.dispose();
    const nrm = material.getNormalTexture();
    material.setNormalTexture(null);
    if (nrm !== null) nrm.dispose();
  }
  for (const malla of raiz.listMeshes()) {
    for (const prim of malla.listPrimitives()) {
      const material = prim.getMaterial();
      if (material !== null && material.getName() === CRISTAL) continue;
      const uv = prim.getAttribute('TEXCOORD_0');
      if (uv !== null) prim.setAttribute('TEXCOORD_0', null);
    }
  }

  await doc.transform(dedup(), prune());

  let triangulos = 0;
  let vertices = 0;
  for (const malla of raiz.listMeshes()) {
    for (const prim of malla.listPrimitives()) {
      triangulos += triangulosDe(prim);
      vertices += prim.getAttribute('POSITION')?.getCount() ?? 0;
    }
  }

  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  await io.write(SALIDA, doc);
  const pesa = fs.statSync(SALIDA).size;

  console.log('EL RELOJ DE ARENA, compilado.');
  console.log(
    `  ${String(raiz.listMeshes().length)} mallas · ${String(vertices)} vértices · ` +
      `${String(triangulos)} triángulos`,
  );
  console.log(
    `  ${String(horneadas)} primitivas horneadas · peor error de color ${peorError.toFixed(4)}`,
  );
  console.log(
    `  texturas ${String(antes.imagenes)} → ${String(raiz.listTextures().length)} · ` +
      `animaciones ${String(raiz.listAnimations().length)} de ${String(antes.animaciones)}`,
  );
  console.log(`  ${(pesa / 1024).toFixed(1)} kB en ${path.relative(process.cwd(), SALIDA)}`);
  if (raiz.listAnimations().length === 0) {
    rendirse('El clip se ha perdido por el camino: el reloj sin animación no es este modelo.');
  }
}

void compilar();
