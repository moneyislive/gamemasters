/**
 * Texturas empotradas en un GLB, en un motor sin navegador.
 *
 * EL PROBLEMA, comprobado en el código de three y no supuesto. Cuando un GLB
 * trae las imágenes dentro del binario —que es lo que devuelve Tripo con
 * `texture: true`, y lo que hace `tablero.glb` con su atlas— `GLTFLoader` hace esto:
 *
 *   1. Saca los bytes de la imagen del `bufferView`.
 *   2. Construye un `Blob` y llama a `URL.createObjectURL(blob)`.
 *   3. Se lo pasa a `THREE.TextureLoader`, que por dentro crea un `<img>`.
 *
 * Ninguna de las tres cosas existe en React Native: no hay `Blob` con URL de
 * objeto, no hay DOM y no hay decodificador de PNG ni de JPEG. La carga entera
 * revienta, y como revienta la carga NO SE VE NI LA GEOMETRÍA — que sí se
 * abriría perfectamente. El síntoma es un hueco, idéntico al de un fichero que
 * falta, y por eso costó tanto: se buscó en el disco del servidor durante días.
 *
 * (Y no vale el atajo de `manager.addHandler`: `GLTFLoader` solo consulta los
 * manejadores cuando la imagen tiene `uri`, y las empotradas no lo tienen.)
 *
 * LO QUE HACEN ESTOS COMPLEMENTOS. `three` pregunta a sus complementos antes de
 * usar su propio cargador (`loadTexture`), así que aquí se contesta con una
 * textura ya construida y la carga sigue adelante. Hay DOS, porque hay dos
 * modelos con dos problemas distintos:
 *
 *   · `texturasLisas`, para los AVATARES de Tripo: una textura blanca de un píxel.
 *     Blanca y no gris porque en un material la textura MULTIPLICA al color base,
 *     así que el blanco lo deja intacto y el personaje sale con los colores que
 *     Tripo también escribe en el material. Es una degradación y se dice como tal:
 *     la textura pintada de un avatar no se ve en el teléfono, y la solución pasa
 *     por servirla como fichero aparte, que es un trabajo con su propio diseño.
 *
 *   · `texturasDelTablero`, para `tablero.glb`: EL ATLAS DE VERDAD, compilado a bytes.
 *     Durante meses el tablero también recibía la blanca, y como TODO su aspecto
 *     —el color de cada bioma, el de cada jugador— vive en las UV de ese atlas,
 *     llegaba sin un solo color; la app instalada jugaba sobre el retablo en dos
 *     dimensiones mientras la web veía el delta. El día que se arregló no se
 *     horneó el color a vértice (el tablero pinta biomas MOVIENDO las UV, y un
 *     color fijado en el vértice habría dejado eso sin efecto): se compiló el PNG
 *     OFFLINE a una tabla de bytes —`escenas/atlas-del-tablero.ts`, generado— y
 *     aquí se monta como `DataTexture` con exactamente los téxeles que el
 *     navegador decodifica. Las UV no se tocan y `delta.tsx` no se entera.
 *
 * LO QUE `GLTFLoader` NO HACE POR UN COMPLEMENTO, y por eso se hace aquí. Cuando
 * la textura sale de `loadTextureImage` el cargador le pone `flipY = false`, los
 * filtros y la envoltura del `sampler`; cuando sale de un complemento la devuelve
 * TAL CUAL (`_invokeOne`), y sólo `assignTexture` le fija después el `colorSpace`
 * del mapa de color. Así que la textura del atlas trae puestos el `flipY` de glTF
 * —la fila 0 es la de ARRIBA, como en la tabla—, el espacio sRGB, la envoltura
 * REPEAT y los filtros lineal / lineal-mipmap-lineal del único `sampler` del
 * tablero. Con `flipY` a `true` la hierba sale de la celda del agua; con el
 * espacio lineal el delta sale lavado; con el filtro `Nearest` desaparece la
 * cadena de mipmaps que la web sí usa. `verify:atlas-del-tablero` lo comprueba
 * en Node con un analizador de mentira.
 */
import * as THREE from 'three';
import type { GLTFLoaderPlugin, GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ALTO_DEL_ATLAS, ANCHO_DEL_ATLAS, IMAGEN_DEL_ATLAS } from '../../../escenas/atlas-del-tablero';
import { texelesDelAtlas } from '../../../escenas/texeles-del-atlas';

/**
 * Una textura de un píxel, blanca.
 *
 * Blanca y no gris a propósito: en un material la textura MULTIPLICA al color
 * base, así que el blanco lo deja intacto y el modelo sale con los colores que
 * Tripo escribió. Cualquier otro tono los ensuciaría todos por igual.
 *
 * Se crea una sola vez y se comparte: hay una llamada por textura del modelo, y
 * son varias.
 */
let lisa: THREE.DataTexture | undefined;
function texturaLisa(): THREE.DataTexture {
  if (lisa) return lisa;
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  t.needsUpdate = true;
  lisa = t;
  return t;
}

/**
 * EL ATLAS DEL TABLERO, montado una vez por app desde la tabla compilada.
 *
 * Una vez y compartida por lo mismo que la blanca, y además porque son cuatro megas
 * de téxeles: ensancharlos cada vez que se vuelve a la mesa sería trabajo del hilo de
 * JavaScript por nada. La promesa del `.glb` ya se cachea en la pantalla; esto es la
 * otra mitad.
 */
let atlas: THREE.DataTexture | undefined;
export function texturaDelAtlasDelTablero(): THREE.DataTexture {
  if (atlas) return atlas;
  const t = new THREE.DataTexture(
    texelesDelAtlas(),
    ANCHO_DEL_ATLAS,
    ALTO_DEL_ATLAS,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  t.name = IMAGEN_DEL_ATLAS;
  /* Lo que `loadTextureImage` habría puesto y `_invokeOne` no pone: ver la cabecera. */
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  atlas = t;
  return t;
}

/** ¿Puede este motor decodificar una imagen empotrada? */
export function decodificaImagenes(): boolean {
  return (
    typeof URL !== 'undefined' &&
    typeof (URL as { createObjectURL?: unknown }).createObjectURL === 'function' &&
    typeof document !== 'undefined'
  );
}

/**
 * El complemento de los avatares. Se registra solo donde hace falta: en un
 * navegador estorbaría, porque ahí las texturas de verdad SÍ se cargan y esto las
 * sustituiría por nada.
 */
export function texturasLisas(_parser: GLTFParser): GLTFLoaderPlugin {
  return {
    name: 'HARKANIA_texturas_lisas',
    loadTexture(): Promise<THREE.Texture> {
      return Promise.resolve(texturaLisa());
    },
  };
}

/**
 * El nombre de la imagen de una textura del `.glb`, leído del JSON del analizador:
 * `textures[i].source` → `images[j].name`. Es el único dato que hace falta para saber
 * si una textura es el atlas, y el complemento lo recibe por el índice.
 */
function nombreDeLaImagen(parser: GLTFParser, indice: number): string | undefined {
  const json = parser.json as
    | { textures?: readonly { source?: number }[]; images?: readonly { name?: string }[] }
    | undefined;
  const fuente = json?.textures?.[indice]?.source;
  if (fuente === undefined) return undefined;
  return json?.images?.[fuente]?.name;
}

/** Se avisa UNA vez por imagen, no una por material: el tablero tiene tres y una llamada por cada una. */
const avisadas = new Set<string>();

/**
 * El complemento del TABLERO. La textura cuyo nombre es el del atlas compilado sale
 * del atlas; cualquier otra sale blanca, que es lo que salía antes para todas.
 *
 * `tablero.glb` lleva hoy otras dos imágenes —el atlas de invierno y la hoja de los
 * bienes de Resource Bits— que ningún nodo pintado por la escena usa
 * (`verify:atlas-del-tablero` lo vigila). Si un día se pintan, saldrán blancas y se
 * dirá por consola con el nombre de la imagen, que es lo que hay que compilar.
 */
export function texturasDelTablero(parser: GLTFParser): GLTFLoaderPlugin {
  return {
    name: 'HARKANIA_texturas_del_tablero',
    loadTexture(indice: number): Promise<THREE.Texture> {
      const nombre = nombreDeLaImagen(parser, indice);
      if (nombre === IMAGEN_DEL_ATLAS) return Promise.resolve(texturaDelAtlasDelTablero());
      const etiqueta = nombre ?? `#${String(indice)}`;
      if (!avisadas.has(etiqueta)) {
        avisadas.add(etiqueta);
        console.warn(
          `[tablero] la imagen «${etiqueta}» del modelo no está compilada para el móvil y sale blanca; ` +
            'si algo la pinta, hay que compilarla como el atlas (escenas/scripts/compilar-atlas-del-tablero.ts).',
        );
      }
      return Promise.resolve(texturaLisa());
    },
  };
}
