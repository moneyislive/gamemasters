/**
 * COMPILA EL ATLAS DE `tablero.glb` A UNA TABLA DE BYTES EN UN MÓDULO DE TYPESCRIPT.
 *
 *   npx tsx escenas/scripts/compilar-atlas-del-tablero.ts
 *
 * Escribe `escenas/atlas-del-tablero.ts`, y lo escribe ENTERO cada vez. Es el gemelo de
 * `compilar-iconos.ts` para otra cosa que Metro no sabe traer: un PNG empotrado en un
 * `.glb`, que Hermes no puede decodificar.
 *
 * ═══ EL FALLO QUE REPARA ═══
 *
 * En iOS y Android `GLTFLoader` no puede abrir la imagen empotrada del tablero —no hay
 * `<img>` ni `createObjectURL`— y el complemento de `app/src/tres/texturas-nativas.ts`
 * la sustituía por una textura blanca de un píxel para que la carga no reventara entera.
 * La geometría llegaba sin un solo color, y por eso la app instalada jugaba sobre el
 * tablero de siempre en dos dimensiones mientras la web veía el delta. Con este módulo el
 * móvil recibe la MISMA imagen como una tabla de bytes que sí sabe leer, y la monta como
 * `DataTexture`: las UV del modelo no cambian, así que el tintado de biomas y de colores
 * de jugador por desplazamiento de UV (`paleta.ts`, `delta.tsx`) sigue funcionando igual.
 *
 * ═══ POR QUÉ NO SE HORNEA A VÉRTICE COMO EL EMBARCADERO ═══
 *
 * Porque el color por vértice queda fijado en la celda ORIGINAL de cada vértice, y el
 * tablero pinta seis biomas y cuatro colores de jugador precisamente MOVIENDO esas UV a
 * otra celda al clonar la geometría. Hornear habría obligado a reinventar el tintado
 * entero; compilar el atlas deja todo lo medido y comprobado como está.
 *
 * ═══ POR QUÉ LA TABLA ES DE OCHO COLUMNAS Y NO DE MIL VEINTICUATRO ═══
 *
 * Medido aquí mismo cada vez que se compila: el atlas del pack es una hoja de celdas
 * PLANAS en horizontal. Dentro de cada una de sus ocho columnas de 128 píxeles, todos los
 * píxeles de una misma fila son el mismo color, sin excepción; lo único que varía es el
 * degradado vertical de claro a oscuro que hace de sombreado. Así que se guarda UN color
 * por fila y columna —8 × 1.024 × RGB = 24 kB, 32 kB en base64— y la app ensancha cada
 * columna a sus 128 téxeles al cargar (`texeles-del-atlas.ts`). Lo que sube a la GPU es
 * byte a byte el PNG que decodifica el navegador, con su cadena de mipmaps.
 *
 * Y este guion SE NIEGA a compilar una imagen que no sea plana por columnas, con el
 * número de píxeles que se salen: `tablero.glb` lleva otras dos imágenes, la del atlas
 * de invierno (plana, y sin ningún nodo que la pinte) y la de los bienes de Resource
 * Bits, que trae una banda de 33 filas con dibujo. Ninguna de las dos la pinta hoy la
 * escena —`verify:atlas-del-tablero` lo vigila— y si un día hace falta la de los bienes,
 * habrá que ampliar esta tabla con parches a resolución completa, no bajar la vara.
 *
 * ═══ PUERTAS ═══
 *
 *   --a <ruta>        escribe AHÍ y no toca el bueno; la usa `verify:atlas-del-tablero`
 *                     para recompilar a un temporal y comparar byte a byte.
 *   --imagen <nombre> compila OTRA imagen del `.glb` (por nombre); existe para que la
 *                     negativa de arriba se pueda ver fallar sin editar el guion.
 */

import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { COLUMNAS_DEL_ATLAS } from '../paleta';
import { decodificaPng, rendirse } from './hornear';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TABLERO = path.join(RAIZ, 'escenas', 'modelos', 'tablero.glb');

/** El nombre de la imagen del atlas DENTRO del `.glb`, que es la que pintan las teselas. */
export const IMAGEN_DEL_ATLAS_POR_DEFECTO = 'hexagons_medieval';

const argumento = (bandera: string): string | undefined => {
  const i = process.argv.indexOf(bandera);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const DESTINO = (() => {
  const ruta = argumento('--a');
  return ruta === undefined ? path.join(RAIZ, 'escenas', 'atlas-del-tablero.ts') : path.resolve(ruta);
})();
const IMAGEN = argumento('--imagen') ?? IMAGEN_DEL_ATLAS_POR_DEFECTO;

const doc = await new NodeIO().read(TABLERO);
const textura = doc.getRoot().listTextures().find((t) => t.getName() === IMAGEN);
if (textura === undefined) {
  rendirse(
    `«${IMAGEN}» no está entre las imágenes de ${path.relative(RAIZ, TABLERO)}: ` +
      doc.getRoot().listTextures().map((t) => t.getName()).join(', '),
  );
}
const imagen = textura.getImage();
if (imagen === null || textura.getMimeType() !== 'image/png') {
  rendirse(`«${IMAGEN}» no trae un PNG empotrado y aquí sólo se decodifica PNG.`);
}
const png = decodificaPng(imagen);
const { width: ancho, height: alto, data } = png;

if (ancho % COLUMNAS_DEL_ATLAS !== 0) {
  rendirse(`El atlas mide ${String(ancho)} de ancho y no se reparte en ${String(COLUMNAS_DEL_ATLAS)} columnas enteras.`);
}
const anchoDeColumna = ancho / COLUMNAS_DEL_ATLAS;

/*
 * LA MEDIDA QUE LO PERMITE: cada fila de cada columna es de un solo color. Se comprueba
 * píxel a píxel contra el del centro de la columna, y se cuenta cuántos se salen y en
 * qué filas, para que la negativa diga dónde mirar.
 */
let fueraDeColumna = 0;
let primeraFilaRota = -1;
let ultimaFilaRota = -1;
let alfaNoOpaco = 0;
const tabla = new Uint8Array(alto * COLUMNAS_DEL_ATLAS * 3);
for (let fila = 0; fila < alto; fila++) {
  for (let columna = 0; columna < COLUMNAS_DEL_ATLAS; columna++) {
    const centro = (fila * ancho + columna * anchoDeColumna + Math.floor(anchoDeColumna / 2)) * 4;
    const r = data[centro] ?? 0;
    const g = data[centro + 1] ?? 0;
    const b = data[centro + 2] ?? 0;
    const o = (fila * COLUMNAS_DEL_ATLAS + columna) * 3;
    tabla[o] = r;
    tabla[o + 1] = g;
    tabla[o + 2] = b;
    for (let x = columna * anchoDeColumna; x < (columna + 1) * anchoDeColumna; x++) {
      const i = (fila * ancho + x) * 4;
      if (data[i + 3] !== 255) alfaNoOpaco++;
      if (data[i] !== r || data[i + 1] !== g || data[i + 2] !== b) {
        fueraDeColumna++;
        if (primeraFilaRota < 0) primeraFilaRota = fila;
        ultimaFilaRota = fila;
      }
    }
  }
}
if (fueraDeColumna > 0) {
  rendirse(
    `«${IMAGEN}» NO es plana por columnas: ${String(fueraDeColumna)} píxeles se apartan del color de su ` +
      `columna, entre las filas ${String(primeraFilaRota)} y ${String(ultimaFilaRota)}. Una tabla de un color por ` +
      `fila y columna no la reproduciría, y este guion no baja la vara: si hace falta esta imagen en el ` +
      `móvil, hay que ampliar la tabla con parches a resolución completa (ver la cabecera).`,
  );
}
if (alfaNoOpaco > 0) {
  rendirse(`«${IMAGEN}» trae ${String(alfaNoOpaco)} píxeles con alfa distinto de 255 y la tabla sólo guarda RGB.`);
}

/*
 * SE VUELVE A LEER LO ESCRITO antes de darlo por bueno: se reconstruye cada píxel desde
 * la tabla y se compara con el PNG. Es lo mismo que hará `texeles-del-atlas.ts` en el
 * teléfono, hecho aquí donde se puede mirar el resultado.
 */
let distintos = 0;
for (let fila = 0; fila < alto; fila++) {
  for (let x = 0; x < ancho; x++) {
    const o = (fila * COLUMNAS_DEL_ATLAS + Math.floor(x / anchoDeColumna)) * 3;
    const i = (fila * ancho + x) * 4;
    if (data[i] !== tabla[o] || data[i + 1] !== tabla[o + 1] || data[i + 2] !== tabla[o + 2]) distintos++;
  }
}
if (distintos > 0) rendirse(`La tabla reconstruida difiere del PNG en ${String(distintos)} píxeles: hay un error en este guion.`);

const base64 = Buffer.from(tabla).toString('base64');
const ANCHO_DE_LINEA = 100;
const lineas: string[] = [];
for (let i = 0; i < base64.length; i += ANCHO_DE_LINEA) lineas.push(`  '${base64.slice(i, i + ANCHO_DE_LINEA)}'`);

const salida = `/**
 * EL ATLAS DE \`tablero.glb\`, COMPILADO A BYTES para el móvil.
 *
 * ═══ ESTE FICHERO SE GENERA. NO SE EDITA A MANO ═══
 *
 * Lo escribe \`escenas/scripts/compilar-atlas-del-tablero.ts\` leyendo la imagen
 * «${IMAGEN}» empotrada en \`escenas/modelos/tablero.glb\`. Cualquier cambio hecho aquí
 * desaparece en la siguiente compilación, y desaparece EN SILENCIO. Si el pack cambia su
 * atlas o se recompila el tablero, se vuelve a ejecutar el compilador; y
 * \`verify:atlas-del-tablero\` compara este fichero byte a byte con lo que el compilador
 * produce hoy, para que las dos verdades no se separen.
 *
 * ═══ QUÉ HAY DENTRO Y POR QUÉ ═══
 *
 * Hermes no decodifica el PNG empotrado del tablero, así que en iOS y Android la textura
 * llegaba blanca y el delta se jugaba en dos dimensiones. Aquí va la misma imagen en una
 * forma que el teléfono sí puede construir: UN color RGB por fila y por columna del atlas,
 * porque las celdas del pack son planas en horizontal —medido en el compilador cada vez—
 * y sólo llevan degradado en vertical. \`texeles-del-atlas.ts\` la ensancha a los
 * ${String(ancho)} × ${String(alto)} téxeles del PNG original, byte a byte, y
 * \`app/src/tres/texturas-nativas.ts\` la monta como \`DataTexture\` en lugar de la imagen
 * que \`GLTFLoader\` no puede abrir. Las UV del modelo no se tocan: el tintado de biomas y
 * colores de jugador por desplazamiento de UV sigue igual que en la web.
 *
 * Las filas van de ARRIBA abajo, como el PNG y como las UV de glTF (\`flipY = false\`).
 */

/** El nombre de la imagen dentro de \`tablero.glb\` a la que esta tabla sustituye. */
export const IMAGEN_DEL_ATLAS = '${IMAGEN}';

/** Las medidas del PNG original, que son las de la textura que se monta. */
export const ANCHO_DEL_ATLAS = ${String(ancho)};
export const ALTO_DEL_ATLAS = ${String(alto)};

/** Cuántos colores por fila guarda la tabla: uno por columna de celdas del atlas. */
export const COLUMNAS_DE_LA_TABLA = ${String(COLUMNAS_DEL_ATLAS)};

/**
 * La tabla: \`ALTO_DEL_ATLAS\` filas × \`COLUMNAS_DE_LA_TABLA\` colores × RGB, en base64
 * estándar. ${String(tabla.length)} bytes; \`decodificaBase64\` de \`texeles-del-atlas.ts\` la abre.
 */
export const TABLA_EN_BASE64 =
${lineas.join(' +\n')};
`;

fs.writeFileSync(DESTINO, salida, 'utf8');

const kb = (salida.length / 1024).toFixed(1);
console.log(
  `\n  «${IMAGEN}» ${String(ancho)}×${String(alto)} → tabla de ${String(COLUMNAS_DEL_ATLAS)}×${String(alto)} colores ` +
    `(${String(tabla.length)} B crudos, ${String(base64.length)} en base64) · ${kb} kB en ${path.relative(RAIZ, DESTINO)}`,
);
console.log(`    plana por columnas: sí (0 píxeles fuera) · alfa 255 en todos · reconstruida = PNG en ${String(ancho * alto)} píxeles`);
