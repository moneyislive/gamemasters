/**
 * COMPILA EL D6 DE KAYKIT EN `escenas/modelos/dados.glb`, DEL COLOR DE LAS FICHAS.
 *
 * ═══ QUÉ SALE, Y DE DÓNDE ═══
 *
 * Del pack KayKit Board Game Bits 1.0 FREE (CC0, ver `arte/README.md`) sale UN
 * fichero de unos kB con UN nodo, `MODELO.dado`: el `D6_A.gltf` con la textura
 * horneada en el color de cada vértice, los dos colores cambiados por los de las
 * fichas del tablero, y sin textura, sin imagen y sin UV. Y al lado, un fichero
 * TypeScript generado, `escenas/caras-del-dado.ts`, con qué cara enseña cada valor.
 *
 * ═══ POR QUÉ EL D6_A Y NO EL B NI EL C ═══
 *
 * El pack trae tres D6, medidos con el fichero delante (`docs/LA-MESA-DE-RIBERAS.md`
 * §9): el A (521 vértices, 662 triángulos, cuerpo claro y puntos oscuros) y el B (501
 * y 740, cuerpo oscuro) van con el ATLAS compartido del pack y llevan LOS PUNTOS COMO
 * GEOMETRÍA: cada punto son nueve vértices propios que caen en una celda oscura del
 * atlas. El C (120 vértices, 188 triángulos) y los D4, D8 y D20 llevan los NÚMEROS
 * PINTADOS en una textura individual de 1024² y 150 a 175 kB: hornear por vértice los
 * borra (una cara son cuatro esquinas y cuatro esquinas son un color plano), y llevar
 * la textura al móvil como tabla en base64 pesa dieciséis veces los dos dados
 * procedimentales del respaldo. Entre A y B gana el A porque los dados de esta mesa
 * son claros con puntos oscuros, como las fichas.
 *
 * ═══ POR QUÉ SE HORNEA Y ADEMÁS SE REMAPEA ═══
 *
 * Se hornea por lo de siempre (`hornear.ts`): en el móvil una textura empotrada no se
 * abre. Y se remapea porque el atlas del pack pinta el dado de blanco azulado con un
 * degradado (37 tonos bajo los 521 vértices, medido: el cuerpo entre 0,58 y 0,94 de
 * luminancia lineal, los puntos entre 0,02 y 0,06) y los dados de esta mesa son del
 * mismo juego que las fichas de número: el cuerpo del crema de sus discos
 * (`COLOR_DEL_NUMERO`) y los puntos del color de sus cifras (`COLOR_DEL_PUNTO`), los dos
 * de `escenas/dados.ts`, que es donde los lee también el respaldo procedimental. Se
 * decide por vértice con la luminancia lineal del color horneado y un umbral,
 * `UMBRAL_DE_LUMINANCIA`; el degradado se aplana a propósito (una cara, un color:
 * el sombreado lo pone la luz de la escena, como en las fichas), y salen EXACTAMENTE
 * dos colores, que es lo que `verify:dados` exige.
 *
 * ═══ POR QUÉ SE MIDE LA CARA DE CADA VALOR Y NO SE SUPONE ═══
 *
 * La escena tiene que girar el dado para que la cara del número que salió mire hacia
 * arriba, y el pack no dice en ningún sitio qué cara lleva qué número. Suponerlo es un
 * fallo sin error: el dado se asienta y enseña otro número. Así que se cuentan los
 * grupos conexos de vértices oscuros por cara (`caras-del-d6.ts` cuenta cómo) y se
 * exige que sea un dado (1..6, 21 en total, opuestas 7) antes de escribir la tabla.
 *
 * ═══ LO QUE NO SE TOCA: LA ESCALA ═══
 *
 * La caja del D6_A mide 0,75 × 0,75 × 0,75 centrada en el origen, y así se queda:
 * `ARISTA_DEL_D6_EN_EL_PACK` en `dados.ts` lo escribe, esto lo contrasta al 1 % en los
 * tres ejes (y se niega si no es un cubo), y la escena lo escala al instanciar, como el
 * tablero y el embarcadero. Un fichero preescalado sería el segundo modelo del mismo
 * autor a otra escala.
 *
 * ═══ ESTO NO CORRE EN EL DESPLIEGUE: CORRE UNA VEZ Y SE COMMITEA EL RESULTADO ═══
 *
 *     npm run compilar:dados -w escenas
 *     npm run verify:dados -w escenas
 */
import type { Accessor, Document, Primitive } from '@gltf-transform/core';
import { dedup, prune } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';
import { ARISTA_DEL_D6_EN_EL_PACK, COLOR_DEL_NUMERO, COLOR_DEL_PUNTO } from '../dados';
import { MODELO, NOMBRE_QUE_SOBREVIVE } from '../nombres';
import { CARAS, cuentaLosPuntos, problemasDeUnDado, textoDeCarasDelDado } from './caras-del-d6';
import { byteLinealDeSrgb, desnudaElMaterial, escritorDeGlb, horneaLaPrimitiva, pngDeLaTextura, rendirse } from './hornear';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const PACK = path.join(RAIZ, 'arte/kaykit/board-game-bits/KayKit_BoardGameBits_1.0_FREE/Assets/gltf');
/** El D6 que entra. Ver la cabecera: por qué el A. */
const ORIGEN = 'D6_A.gltf';
const SALIDA = path.join(RAIZ, 'escenas/modelos/dados.glb');
const FICHERO_DE_CARAS = path.join(RAIZ, 'escenas/caras-del-dado.ts');

/**
 * A PARTIR DE QUÉ LUMINANCIA LINEAL UN VÉRTICE ES CUERPO Y NO PUNTO.
 *
 * Medido sobre el D6_A horneado: los puntos caen entre 0,02 y 0,06 y el cuerpo entre
 * 0,58 y 0,94; en medio no hay nada. 0,25 (un gris de 137 en sRGB) queda a más del
 * cuádruple del punto más claro y a menos de la mitad del cuerpo más oscuro, y el
 * compilador se NIEGA si algún vértice cae a menos de un factor dos del umbral por
 * cualquiera de los dos lados: un pack con otro degradado no se clasificaría a medias,
 * pararía aquí.
 */
const UMBRAL_DE_LUMINANCIA = 0.25;
const HOLGURA_DEL_UMBRAL = 2;

/** Cuánto puede apartarse la caja de `ARISTA_DEL_D6_EN_EL_PACK`, por eje. */
const HOLGURA_DE_LA_CAJA = 0.01;

/** Los bytes LINEALES de un color escrito en sRGB hexadecimal, con la curva del horno. */
function bytesLinealesDe(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (m === null) rendirse(`«${hex}» no es un color #rrggbb.`);
  return [byteLinealDeSrgb(parseInt(m[1] as string, 16)), byteLinealDeSrgb(parseInt(m[2] as string, 16)), byteLinealDeSrgb(parseInt(m[3] as string, 16))];
}

/** La luminancia lineal (Rec. 709) de un color en bytes lineales. */
function luminancia(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** La única primitiva del único nodo con malla, o se para diciendo qué hay. */
function laPrimitiva(doc: Document): Primitive {
  const root = doc.getRoot();
  const escenas = root.listScenes();
  const raices = escenas.flatMap((e) => e.listChildren());
  if (escenas.length !== 1 || raices.length !== 1) {
    rendirse(`«${ORIGEN}» trae ${String(escenas.length)} escenas y ${String(raices.length)} raíces; se esperaba un solo nodo.`);
  }
  const mallas = root.listMeshes();
  const prims = mallas.flatMap((m) => m.listPrimitives());
  if (mallas.length !== 1 || prims.length !== 1 || raices[0]?.getMesh() !== mallas[0]) {
    rendirse(`«${ORIGEN}» trae ${String(mallas.length)} mallas y ${String(prims.length)} primitivas; el D6_A es una y una.`);
  }
  const prim = prims[0] as Primitive;
  for (const atributo of ['POSITION', 'NORMAL', 'TEXCOORD_0']) {
    if (prim.getAttribute(atributo) === null) rendirse(`A la primitiva de «${ORIGEN}» le falta ${atributo}.`);
  }
  /* 4 es TRIANGLES en glTF; se escribe el número para no traer la clase sólo por su enumeración. */
  if (prim.getIndices() === null || prim.getMode() !== 4) {
    rendirse(`La primitiva de «${ORIGEN}» no es de triángulos indexados.`);
  }
  if (root.listMaterials().length !== 1) rendirse(`«${ORIGEN}» trae ${String(root.listMaterials().length)} materiales y el horneado supone uno.`);
  return prim;
}

/** Exige que la caja sea un cubo de `ARISTA_DEL_D6_EN_EL_PACK`, centrado. Devuelve los lados. */
function exigeElCubo(prim: Primitive): [number, number, number] {
  const pos = prim.getAttribute('POSITION') as Accessor;
  const mn = pos.getMin([]);
  const mx = pos.getMax([]);
  const lados: [number, number, number] = [0, 1, 2].map((i) => (mx[i] as number) - (mn[i] as number)) as [number, number, number];
  const centro = [0, 1, 2].map((i) => ((mx[i] as number) + (mn[i] as number)) / 2);
  const tolerancia = ARISTA_DEL_D6_EN_EL_PACK * HOLGURA_DE_LA_CAJA;
  const torcidos = lados.filter((l) => Math.abs(l - ARISTA_DEL_D6_EN_EL_PACK) > tolerancia);
  if (torcidos.length > 0 || centro.some((c) => Math.abs(c) > tolerancia)) {
    rendirse(
      `«${ORIGEN}» mide ${lados.map((l) => l.toFixed(4)).join(' × ')} con el centro en (${centro.map((c) => c.toFixed(4)).join(', ')}), ` +
        `y tenía que ser un cubo de ${String(ARISTA_DEL_D6_EN_EL_PACK)} al ${String(HOLGURA_DE_LA_CAJA * 100)} % centrado en el origen. ` +
        'Si el pack ha cambiado de unidad, hay que volver a medir `ARISTA_DEL_D6_EN_EL_PACK` antes de seguir.',
    );
  }
  return lados;
}

/**
 * Cambia los colores horneados por los dos de las fichas, decidiendo por luminancia.
 * Devuelve cuántos vértices han ido a cada lado y el hueco medido alrededor del umbral.
 */
function remapea(prim: Primitive): { cuerpo: number; puntos: number; puntoMasClaro: number; cuerpoMasOscuro: number } {
  const color = prim.getAttribute('COLOR_0') as Accessor;
  const antes = color.getArray() as Uint8Array;
  const n = color.getCount();
  const numero = bytesLinealesDe(COLOR_DEL_NUMERO);
  const punto = bytesLinealesDe(COLOR_DEL_PUNTO);
  const despues = new Uint8Array(n * 4);
  let cuerpo = 0;
  let puntos = 0;
  let puntoMasClaro = 0;
  let cuerpoMasOscuro = 1;
  for (let i = 0; i < n; i++) {
    const y = luminancia(antes[i * 4] as number, antes[i * 4 + 1] as number, antes[i * 4 + 2] as number);
    const esPunto = y < UMBRAL_DE_LUMINANCIA;
    const destino = esPunto ? punto : numero;
    if (esPunto) {
      puntos++;
      puntoMasClaro = Math.max(puntoMasClaro, y);
    } else {
      cuerpo++;
      cuerpoMasOscuro = Math.min(cuerpoMasOscuro, y);
    }
    despues[i * 4] = destino[0];
    despues[i * 4 + 1] = destino[1];
    despues[i * 4 + 2] = destino[2];
    despues[i * 4 + 3] = 255;
  }
  if (puntos === 0) {
    rendirse(
      `Tras hornear «${ORIGEN}» ningún vértice es oscuro (el más oscuro tiene ${cuerpoMasOscuro.toFixed(3)} de luminancia): ` +
        'los puntos no son geometría, están pintados en la textura, y hornear los borra. Gana el respaldo procedimental; no se compila.',
    );
  }
  if (cuerpo === 0) rendirse(`Tras hornear «${ORIGEN}» todos los vértices son oscuros: no hay cuerpo que pintar de crema.`);
  if (puntoMasClaro * HOLGURA_DEL_UMBRAL > UMBRAL_DE_LUMINANCIA || cuerpoMasOscuro < UMBRAL_DE_LUMINANCIA * HOLGURA_DEL_UMBRAL) {
    rendirse(
      `El umbral de luminancia (${String(UMBRAL_DE_LUMINANCIA)}) no tiene un factor ${String(HOLGURA_DEL_UMBRAL)} de hueco a cada lado: ` +
        `el punto más claro está en ${puntoMasClaro.toFixed(3)} y el cuerpo más oscuro en ${cuerpoMasOscuro.toFixed(3)}. ` +
        'Con el degradado de este pack no se puede clasificar por vértice sin dudas; hay que volver a medir.',
    );
  }
  color.setArray(despues);
  return { cuerpo, puntos, puntoMasClaro, cuerpoMasOscuro };
}

async function main(): Promise<void> {
  if (!fs.existsSync(path.join(PACK, ORIGEN))) {
    rendirse(
      `No está ${path.relative(RAIZ, path.join(PACK, ORIGEN))}.\n\n` +
        'El pack Board Game Bits es CC0 y no se versiona a propósito. `arte/README.md` dice cómo bajarlo.',
    );
  }
  if (!NOMBRE_QUE_SOBREVIVE.test(MODELO.dado)) rendirse(`«${MODELO.dado}» no sobrevive a GLTFLoader.`);

  /* Con los atributos separados, no entrelazados: ver `escritorDeGlb` en `hornear.ts`. */
  const io = escritorDeGlb();
  const doc = await io.read(path.join(PACK, ORIGEN));
  const root = doc.getRoot();
  const prim = laPrimitiva(doc);
  const lados = exigeElCubo(prim);

  const material = root.listMaterials()[0] as NonNullable<ReturnType<typeof root.listMaterials>[0]>;
  const png = pngDeLaTextura(material.getBaseColorTexture(), ORIGEN);
  const desvio = horneaLaPrimitiva(doc, prim, png, MODELO.dado);
  const reparto = remapea(prim);

  /* Las caras, contadas sobre el color YA remapeado: punto es exactamente el color del punto. */
  const bytesDelPunto = bytesLinealesDe(COLOR_DEL_PUNTO);
  const colores = (prim.getAttribute('COLOR_0') as Accessor).getArray() as Uint8Array;
  const esPunto = (i: number): boolean =>
    colores[i * 4] === bytesDelPunto[0] && colores[i * 4 + 1] === bytesDelPunto[1] && colores[i * 4 + 2] === bytesDelPunto[2];
  const { porCara, normalesTorcidas } = cuentaLosPuntos(prim, esPunto);
  if (normalesTorcidas > 0) {
    rendirse(`${String(normalesTorcidas)} vértices de punto tienen la normal mirando a otra cara que la de su posición: la cuenta por posición no es de fiar en este pack.`);
  }
  const problemas = problemasDeUnDado(porCara);
  if (problemas.length > 0) rendirse(`Lo contado no es un dado:\n${problemas.map((p) => `  · ${p}`).join('\n')}`);

  /* El nodo, la malla y el material con nuestro nombre; el material sin textura y en blanco. */
  const raiz = root.listScenes()[0]?.listChildren()[0];
  if (raiz === undefined) rendirse('Se ha perdido la raíz por el camino.');
  raiz.setName(MODELO.dado);
  raiz.getMesh()?.setName(MODELO.dado);
  desnudaElMaterial(material);
  material.setName(MODELO.dado).setMetallicFactor(0);

  /*
   * FUNDE LO IGUAL Y TIRA LO HUÉRFANO (la textura, las UV), pero SIN `weld`, y por qué.
   *
   * Los otros compiladores sueldan vértices repetidos. Aquí, tras aplanar el color, doce
   * vértices que sólo se distinguían por el tono del degradado quedan idénticos y `weld`
   * los fundiría: 521 → 509, medido. La geometría pintada sería la misma y se ahorrarían
   * 336 bytes; a cambio la cuenta del fichero dejaría de ser la del pack que se midió y
   * que `verify:dados` exige (521 vértices, 662 triángulos). Se prefiere que el número
   * del fichero sea el del pack, para que una recompilación con otro D6 se vea en la cuenta.
   */
  await doc.transform(dedup(), prune());
  if (root.listTextures().length !== 0) rendirse('Ha quedado una textura dentro.');
  const malos = root.listNodes().map((n) => n.getName()).filter((n) => !NOMBRE_QUE_SOBREVIVE.test(n));
  if (malos.length > 0) rendirse(`Estos nombres no sobreviven a GLTFLoader: ${malos.join(', ')}`);

  /* Un solo búfer, que es lo único que admite un `.glb`. */
  const unico = doc.createBuffer(MODELO.dado);
  for (const accesor of root.listAccessors()) accesor.setBuffer(unico);
  for (const bufer of root.listBuffers()) if (bufer !== unico) bufer.dispose();

  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  await io.write(SALIDA, doc);
  fs.writeFileSync(FICHERO_DE_CARAS, textoDeCarasDelDado(porCara), 'utf8');

  const pos = prim.getAttribute('POSITION') as Accessor;
  const triangulos = (prim.getIndices()?.getCount() ?? 0) / 3;
  console.log(`\n  ${ORIGEN} → ${path.relative(RAIZ, SALIDA)}`);
  console.log(`  caja ${lados.map((l) => l.toFixed(4)).join(' × ')} (arista del pack ${String(ARISTA_DEL_D6_EN_EL_PACK)})`);
  console.log(`  ${String(pos.getCount())} vértices · ${String(triangulos)} triángulos · peor desvío sRGB ${desvio.toFixed(1)}`);
  console.log(
    `  ${String(reparto.cuerpo)} vértices de cuerpo (${COLOR_DEL_NUMERO}) y ${String(reparto.puntos)} de punto (${COLOR_DEL_PUNTO}); ` +
      `luminancia: punto más claro ${reparto.puntoMasClaro.toFixed(3)}, cuerpo más oscuro ${reparto.cuerpoMasOscuro.toFixed(3)}, umbral ${String(UMBRAL_DE_LUMINANCIA)}`,
  );
  console.log(`  caras: ${CARAS.map((c) => `${c}=${String(porCara.get(c)?.puntos ?? 0)}`).join('  ')} → ${path.relative(RAIZ, FICHERO_DE_CARAS)}`);
  console.log(`  ${(fs.statSync(SALIDA).size / 1024).toFixed(1)} kB\n`);
}

await main();
