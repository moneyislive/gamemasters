/**
 * ¿SIRVEN LOS AVENTUREROS COMPILADOS PARA LOS DOS CLIENTES?
 *
 * ═══ QUÉ COMPRA ESTE GUION ═══
 *
 * `compilar-aventureros.ts` deja siete `.glb` en `escenas/modelos/aventureros/`:
 * seis personajes con el rig `Rig_Medium` y la textura horneada en el color de cada
 * vértice, y una biblioteca de doce clips sin malla que vale para los seis. Esto
 * vuelve a abrir esos siete ficheros DESDE FUERA —con `@gltf-transform`, que no
 * toca los nombres, y luego con el `GLTFLoader` de three, que sí— y comprueba lo
 * que, si estuviera mal, no daría ningún error en ninguna consola:
 *
 *   · Que cada personaje trae UNA piel con los 23 huesos exactos, cuelga de un
 *     único `Rig_Medium`, lleva `COLOR_0` en TODAS sus primitivas y NINGUNA
 *     textura ni imagen. Una textura que se colara se carga bien en el PC y deja
 *     un hueco en el móvil, que es el fallo que costó días en `texturas-nativas.ts`.
 *   · Que mide lo que dice `escala.ts`: de `ALTURA_DE_UNA_PERSONA` cuelga la
 *     escala del mundo entero, y un pack reexportado en centímetros cargaría
 *     perfectamente y pondría un gigante de 254 unidades sobre el tablero.
 *   · Que el esqueleto es EL MISMO en los siete ficheros, hueso a hueso: un clip
 *     grabado para un rig con otras longitudes de hueso se carga, se reproduce, y
 *     deforma al personaje sin quejarse.
 *   · Que la biblioteca trae exactamente los doce clips, con nuestros nombres, y
 *     ni una malla, ni una piel, ni un material dentro.
 *   · Y lo que de verdad decide si un personaje se mueve: que cada pista de cada
 *     clip ENCUENTRA SU HUESO en cada personaje DESPUÉS de que `GLTFLoader` haya
 *     saneado los nombres. Los huesos del pack se llaman `foot.l` y al cargar se
 *     llaman `footl`; el retarget se hace por nombre; si el saneado se aplicara de
 *     forma distinta a los dos ficheros, los seis personajes se quedarían en T sin
 *     un solo error.
 *
 * ═══ POR QUÉ ÉSTE SÍ IMPORTA `three`, Y `verificar-escena` NO ═══
 *
 * `verificar-escena` lee el `.glb` a mano para no arrastrar el motor de dibujo a la
 * batería: lo que comprueba es aritmética. Aquí, en cambio, LO QUE SE COMPRUEBA ES
 * LO QUE HACE `three` con los nombres al cargar, y comprobarlo contra una copia de
 * `sanitizeNodeName` escrita aquí sería comprobar la copia y no el cargador —el
 * mismo error que este árbol ya tiene apuntado con `puntosDeLaCifra`—. Así que se
 * carga con el `GLTFLoader` de verdad, en Node, sin abrir un contexto de dibujo:
 * `parse()` sólo necesita `TextDecoder` y `DataView`, y las imágenes —que es lo
 * único que pediría un navegador— es justo lo que estos ficheros no tienen.
 *
 * Lo que este guion NO prueba, dicho para que nadie se confíe: que se VEAN bien.
 * Ni el color horneado en pantalla, ni la luz sobre ellos, ni si el móvil aguanta
 * seis personajes animados. Eso sigue exigiendo ojos y un aparato de verdad.
 */
import { NodeIO } from '@gltf-transform/core';
import type { Document } from '@gltf-transform/core';
import fs from 'node:fs';
import path from 'node:path';
import { PropertyBinding } from 'three';
import type { Bone, MeshStandardMaterial, Object3D, SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ALTURA_DE_UNA_PERSONA } from '../escala';
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
const CARPETA = path.join(RAIZ, 'modelos', 'aventureros');

/*
 * LO QUE TIENE QUE HABER DENTRO, dicho aquí y no importado del compilador.
 *
 * A propósito: este guion comprueba el fichero de verdad por si el que hay no salió
 * de este compilador, y para eso la expectativa tiene que estar escrita en otro
 * sitio. Si las dos tablas discrepan, discrepan a la vista.
 */
const RIG = 'Rig_Medium';
const HUESOS = [
  'root', 'hips', 'spine', 'chest', 'head',
  'upperarm.l', 'lowerarm.l', 'wrist.l', 'hand.l', 'handslot.l',
  'upperarm.r', 'lowerarm.r', 'wrist.r', 'hand.r', 'handslot.r',
  'upperleg.l', 'lowerleg.l', 'foot.l', 'toes.l',
  'upperleg.r', 'lowerleg.r', 'foot.r', 'toes.r',
];
const PERSONAJES = ['caballero', 'barbaro', 'maga', 'exploradora', 'picaro', 'encapuchado'];
const CLIPS = [
  'reposo-a', 'reposo-b', 'andar', 'correr', 'saludar', 'recoger',
  'aparecer', 'usar', 'lanzar', 'golpe', 'salto', 't-pose',
];
const BIBLIOTECA = 'animaciones';
const TOPE_DE_PERSONAJE = 450 * 1024;

const mismos = (a: readonly string[], b: readonly string[]): boolean =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

const fichero = (nombre: string): string => path.join(CARPETA, `${nombre}.glb`);

// ---------------------------------------------------------------------------
paso('Los siete ficheros existen y pesan lo que deben');
// ---------------------------------------------------------------------------

const faltan = [...PERSONAJES, BIBLIOTECA].filter((n) => !fs.existsSync(fichero(n)));
comprobar('los seis personajes y la biblioteca están compilados', faltan.length === 0, faltan);
if (faltan.length > 0) {
  console.log(`\nFaltan ficheros en ${path.relative(RAIZ, CARPETA)}: ${faltan.join(', ')}.`);
  console.log('Se rehacen con `npm run compilar:aventureros -w escenas`; `arte/README.md` dice de dónde sale el material.');
  process.exit(1);
}

/*
 * EL TOPE DE PESO, y por qué es por personaje y no total.
 *
 * Cada personaje viaja al móvil cuando alguien lo elige, y la biblioteca una vez.
 * 450 kB es lo que pesaba el más gordo del pack con su textura dentro; el horneado
 * la quita y añade un byte por canal y vértice, así que si un personaje se pasa es
 * que se ha colado algo —una textura, unas UV, flotantes donde iban bytes—.
 */
{
  const pesos = Object.fromEntries(PERSONAJES.map((n) => [n, Math.round(fs.statSync(fichero(n)).size / 1024)]));
  const pesados = PERSONAJES.filter((n) => fs.statSync(fichero(n)).size >= TOPE_DE_PERSONAJE);
  comprobar('y ningún personaje pasa de 450 kB', pesados.length === 0, pesos);
}

// ---------------------------------------------------------------------------
paso('Cada personaje lleva el rig, el color en el vértice y ninguna textura');
// ---------------------------------------------------------------------------

type Rig = Map<string, { padre: string | null; posicion: number[] }>;

/** El rig de un documento: padre y posición de reposo de cada hueso. */
function rigDe(doc: Document): Rig {
  const rig: Rig = new Map();
  for (const nodo of doc.getRoot().listNodes()) {
    if (!HUESOS.includes(nodo.getName())) continue;
    const padre = nodo.listParents().find((p) => p.propertyType === 'Node');
    rig.set(nodo.getName(), {
      padre: padre === undefined ? null : (padre as { getName(): string }).getName(),
      posicion: [...nodo.getTranslation()],
    });
  }
  return rig;
}

/**
 * La altura en pose de reposo: la caja de las POSICIONES de todas las primitivas.
 *
 * En una malla con piel las posiciones están en la pose de reposo, y los nodos del
 * rig del pack van a identidad, así que la caja de los vértices ES la altura que se
 * ve antes de animar. Es la misma medida que dio 2,543 en `escala.ts`.
 */
function alturaDe(doc: Document): number {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const malla of doc.getRoot().listMeshes()) {
    for (const prim of malla.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (pos === null) continue;
      minY = Math.min(minY, pos.getMin([])[1] as number);
      maxY = Math.max(maxY, pos.getMax([])[1] as number);
    }
  }
  return maxY - minY;
}

const io = new NodeIO();
const documentos = new Map<string, Document>();
for (const n of [...PERSONAJES, BIBLIOTECA]) documentos.set(n, await io.read(fichero(n)));

{
  const sinRaizUnica: string[] = [];
  const pielMala: string[] = [];
  const sinColor: string[] = [];
  const conUv: string[] = [];
  const conTextura: string[] = [];
  const materialMalo: string[] = [];
  const alturas: Record<string, number> = {};

  for (const nombre of PERSONAJES) {
    const doc = documentos.get(nombre) as Document;
    const root = doc.getRoot();

    const raices = root.listScenes().flatMap((e) => e.listChildren());
    if (root.listScenes().length !== 1 || raices.length !== 1 || raices[0]?.getName() !== RIG) {
      sinRaizUnica.push(`${nombre}: [${raices.map((r) => r.getName()).join(', ')}]`);
    }

    const pieles = root.listSkins();
    const huesos = pieles[0]?.listJoints().map((j) => j.getName()) ?? [];
    if (pieles.length !== 1 || !mismos(huesos, HUESOS)) {
      pielMala.push(`${nombre}: ${pieles.length} pieles, ${huesos.length} huesos`);
    }

    for (const malla of root.listMeshes()) {
      for (const prim of malla.listPrimitives()) {
        const color = prim.getAttribute('COLOR_0');
        /* 5121 es UNSIGNED_BYTE: bytes normalizados, VEC4 con el alfa a 255, que es lo que escribe el horno. */
        if (color === null || color.getType() !== 'VEC4' || color.getComponentType() !== 5121 || !color.getNormalized()) {
          sinColor.push(`${nombre}/${malla.getName()}`);
        }
        if (prim.listSemantics().some((s) => s.startsWith('TEXCOORD_'))) conUv.push(`${nombre}/${malla.getName()}`);
      }
    }

    if (root.listTextures().length > 0) conTextura.push(`${nombre}: ${root.listTextures().length}`);

    const materiales = root.listMaterials();
    const m = materiales[0];
    if (
      materiales.length !== 1 ||
      m === undefined ||
      m.getBaseColorTexture() !== null ||
      m.getBaseColorFactor().some((c) => c !== 1)
    ) {
      materialMalo.push(`${nombre}: ${materiales.length} materiales, base ${String(m?.getBaseColorFactor())}`);
    }

    alturas[nombre] = Number(alturaDe(doc).toFixed(3));
  }

  comprobar('los seis cuelgan de un único nodo Rig_Medium', sinRaizUnica.length === 0, sinRaizUnica);
  comprobar('cada uno lleva una sola piel con los 23 huesos del rig, ni uno más', pielMala.length === 0, pielMala);
  comprobar(
    'todas las primitivas llevan COLOR_0 como VEC4 de bytes normalizados',
    sinColor.length === 0,
    sinColor,
  );
  comprobar('y ninguna conserva UV: sin textura son bytes muertos', conUv.length === 0, conUv);
  comprobar('ninguno lleva textura ni imagen dentro', conTextura.length === 0, conTextura);
  comprobar(
    'y su único material tiene el color base en blanco, para que mande el vértice',
    materialMalo.length === 0,
    materialMalo,
  );

  /*
   * LA ALTURA, EN DOS COMPROBACIONES Y NO EN UNA, y por qué.
   *
   * `escala.ts` midió 2,543 sobre `Knight.glb`, y ésa es la unidad del mundo: el
   * caballero tiene que seguir midiendo eso, con un 5 % de holgura. Pero los seis NO
   * miden lo mismo, y no es un fallo: comparten el esqueleto al milímetro —lo
   * comprueba el paso siguiente— y lo que cambia es el sombrero. Medido: la maga con
   * su capirote da 2,655; el pícaro sin nada en la cabeza, 2,180. Exigirles ±5 % a
   * todos sería exigir que todos lleven yelmo.
   *
   * Así que a los seis se les pide lo que de verdad protege al mundo: que estén en la
   * MISMA UNIDAD. Entre el 80 % y el 110 % de una persona caza el pack reexportado en
   * centímetros, el reescalado a 1,8 «para que parezca real» y el eje cambiado; y no
   * salta por un gorro.
   */
  const caballero = alturas['caballero'] ?? 0;
  comprobar(
    'el caballero mide una persona de escala.ts, con un 5 % de holgura',
    Math.abs(caballero - ALTURA_DE_UNA_PERSONA) / ALTURA_DE_UNA_PERSONA <= 0.05,
    { caballero, persona: ALTURA_DE_UNA_PERSONA },
  );
  const fueraDeUnidad = PERSONAJES.filter((n) => {
    const razon = (alturas[n] ?? 0) / ALTURA_DE_UNA_PERSONA;
    return razon < 0.8 || razon > 1.1;
  });
  comprobar(
    'y los seis miden entre el 80 % y el 110 % de una persona: la misma unidad',
    fueraDeUnidad.length === 0,
    alturas,
  );
}

// ---------------------------------------------------------------------------
paso('El esqueleto es el mismo en los siete ficheros');
// ---------------------------------------------------------------------------

{
  const referencia = rigDe(documentos.get('caballero') as Document);
  const padreDistinto: string[] = [];
  const posicionDistinta: string[] = [];
  for (const nombre of [...PERSONAJES, BIBLIOTECA]) {
    const rig = rigDe(documentos.get(nombre) as Document);
    for (const hueso of HUESOS) {
      const suyo = rig.get(hueso);
      const patron = referencia.get(hueso);
      if (suyo === undefined || patron === undefined) {
        padreDistinto.push(`${nombre}/${hueso}: falta`);
        continue;
      }
      if (suyo.padre !== patron.padre) padreDistinto.push(`${nombre}/${hueso}: ${String(suyo.padre)}`);
      const d = Math.hypot(
        (suyo.posicion[0] as number) - (patron.posicion[0] as number),
        (suyo.posicion[1] as number) - (patron.posicion[1] as number),
        (suyo.posicion[2] as number) - (patron.posicion[2] as number),
      );
      if (d > 1e-5) posicionDistinta.push(`${nombre}/${hueso}: ${d.toFixed(6)}`);
    }
  }
  comprobar('los 23 huesos cuelgan del mismo padre en los siete ficheros', padreDistinto.length === 0, padreDistinto.slice(0, 6));
  comprobar(
    'y tienen la misma posición de reposo, a la cienmilésima',
    posicionDistinta.length === 0,
    posicionDistinta.slice(0, 6),
  );
}

// ---------------------------------------------------------------------------
paso('La biblioteca trae los doce clips y nada más');
// ---------------------------------------------------------------------------

{
  const doc = documentos.get(BIBLIOTECA) as Document;
  const root = doc.getRoot();
  const clips = root.listAnimations();
  const nombres = clips.map((a) => a.getName());

  comprobar('animaciones.glb trae exactamente los doce clips, con nuestros nombres', mismos(nombres, CLIPS), nombres);

  /*
   * Los nombres de clip no pasan por `sanitizeNodeName` —eso es para nodos—, pero
   * la regla de la casa es una para todo lo que se busca por nombre dentro de un
   * `.glb`: minúsculas, cifras y guiones. Y se comprueba además con la función de
   * three, por si algún día también los tocara.
   */
  const mancillados = nombres.filter((n) => !NOMBRE_QUE_SOBREVIVE.test(n) || PropertyBinding.sanitizeNodeName(n) !== n);
  comprobar('ningún nombre de clip lleva algo que GLTFLoader vaya a borrar', mancillados.length === 0, mancillados);

  comprobar(
    'no queda dentro ni malla, ni piel, ni material, ni textura',
    root.listMeshes().length + root.listSkins().length + root.listMaterials().length + root.listTextures().length === 0,
    {
      mallas: root.listMeshes().length,
      pieles: root.listSkins().length,
      materiales: root.listMaterials().length,
      texturas: root.listTextures().length,
    },
  );

  const nodos = root.listNodes().map((n) => n.getName());
  comprobar('los nodos son exactamente el rig y sus 23 huesos', mismos(nodos, [RIG, ...HUESOS]), nodos);

  const pistasRotas: string[] = [];
  const pistasCortas: string[] = [];
  const destinos = new Set<string>();
  const duraciones: Record<string, number> = {};
  for (const clip of clips) {
    let fin = 0;
    for (const canal of clip.listChannels()) {
      const destino = canal.getTargetNode();
      const muestreador = canal.getSampler();
      if (destino === null || !HUESOS.includes(destino.getName()) || muestreador === null) {
        pistasRotas.push(`${clip.getName()}/${destino?.getName() ?? '∅'}.${canal.getTargetPath() ?? '?'}`);
        continue;
      }
      destinos.add(destino.getName());
      const entrada = muestreador.getInput();
      if (entrada === null || entrada.getCount() < 2) {
        pistasCortas.push(`${clip.getName()}/${destino.getName()}.${canal.getTargetPath() ?? '?'}`);
      } else {
        fin = Math.max(fin, entrada.getMax([])[0] as number);
      }
    }
    duraciones[clip.getName()] = Number(fin.toFixed(3));
  }
  comprobar('cada pista apunta a un hueso del rig, y ninguna a un nodo borrado', pistasRotas.length === 0, pistasRotas.slice(0, 6));
  comprobar('entre los doce clips se mueven los 23 huesos, ni uno menos', mismos([...destinos], HUESOS), [...destinos]);
  /*
   * `T-Pose` viene del pack con UNA clave y duración cero, y con duración cero el
   * mezclador de three da `NaN` al repetir. El compilador le añade un fotograma;
   * aquí se exige que ninguna pista de ningún clip se haya quedado con una sola.
   */
  comprobar(
    'ninguna pista tiene una sola clave: un clip de duración cero da NaN en el mezclador',
    pistasCortas.length === 0,
    pistasCortas.slice(0, 6),
  );
  const raras = CLIPS.filter((c) => {
    const d = duraciones[c] ?? 0;
    return c === 't-pose' ? d <= 0 || d > 0.1 : d < 0.5 || d > 3;
  });
  comprobar(
    'los once clips de movimiento duran entre medio segundo y tres, y la t-pose un fotograma',
    raras.length === 0,
    duraciones,
  );
}

// ---------------------------------------------------------------------------
paso('Cargados con el GLTFLoader de three de verdad, las pistas encuentran sus huesos');
// ---------------------------------------------------------------------------

/** Carga un `.glb` con el cargador de three, en Node, sin red ni navegador. */
function cargaConThree(ruta: string): Promise<GLTF> {
  const bytes = fs.readFileSync(ruta);
  const trozo = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(trozo, '', resolve, reject);
  });
}

{
  const cargados = new Map<string, GLTF>();
  const noCargan: string[] = [];
  for (const n of [...PERSONAJES, BIBLIOTECA]) {
    try {
      cargados.set(n, await cargaConThree(fichero(n)));
    } catch (e) {
      noCargan.push(`${n}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  comprobar('GLTFLoader carga los siete ficheros sin error', noCargan.length === 0, noCargan);

  const HUESOS_SANEADOS = HUESOS.map((h) => PropertyBinding.sanitizeNodeName(h));
  const huesosMal: string[] = [];
  const mallasMal: string[] = [];
  const entrelazados: string[] = [];
  const escenas = new Map<string, Object3D>();
  for (const n of PERSONAJES) {
    const gltf = cargados.get(n);
    if (gltf === undefined) continue;
    escenas.set(n, gltf.scene);
    const huesos: string[] = [];
    gltf.scene.traverse((o: Object3D) => {
      if ((o as Bone).isBone) huesos.push(o.name);
      if ((o as SkinnedMesh).isSkinnedMesh) {
        const malla = o as SkinnedMesh;
        const material = (Array.isArray(malla.material) ? malla.material[0] : malla.material) as MeshStandardMaterial;
        const color = malla.geometry.getAttribute('color');
        if (color === undefined || !material.vertexColors || material.map !== null) {
          mallasMal.push(`${n}/${o.name}: color=${String(color !== undefined)} vertexColors=${String(material.vertexColors)} map=${String(material.map !== null)}`);
        }
        for (const [nombre, atributo] of Object.entries(malla.geometry.attributes)) {
          if ((atributo as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute === true) entrelazados.push(`${n}/${o.name}.${nombre}`);
        }
      }
    });
    if (!mismos(huesos, HUESOS_SANEADOS) || gltf.scene.children.map((c) => c.name).join() !== RIG) {
      huesosMal.push(`${n}: ${huesos.length} huesos, raíz [${gltf.scene.children.map((c) => c.name).join(', ')}]`);
    }
  }
  comprobar('cada personaje llega con 23 huesos, llamados como GLTFLoader los deja', huesosMal.length === 0, huesosMal);
  /*
   * Y EL SANEADO HACE ALGO. Si un día three dejara de tocar los nombres, las dos
   * comprobaciones de arriba y de abajo seguirían en verde comprobando lo mismo dos
   * veces. Que dieciocho de los veintitrés cambien de nombre es la prueba de que
   * aquí se está ejercitando el camino de verdad.
   */
  const cambian = HUESOS.filter((h, i) => h !== HUESOS_SANEADOS[i]).length;
  comprobar('y el saneado hace algo: dieciocho de los veintitrés cambian de nombre al cargar', cambian === 18, cambian);
  comprobar('todas sus mallas llegan con el color por vértice encendido y sin mapa', mallasMal.length === 0, mallasMal);
  /*
   * NINGÚN ATRIBUTO LLEGA ENTRELAZADO: si uno llegara, cada clon de la escena
   * avisaría por consola una vez por atributo. La regla está en `hornear.ts`.
   */
  comprobar('y ningún atributo llega entrelazado: se clonan en silencio', escenas.size === PERSONAJES.length && entrelazados.length === 0, entrelazados.slice(0, 6));

  const biblioteca = cargados.get(BIBLIOTECA);
  const clips = biblioteca?.animations ?? [];
  comprobar('la biblioteca llega con los doce clips', mismos(clips.map((c) => c.name), CLIPS), clips.map((c) => c.name));

  /*
   * LA COMPROBACIÓN QUE DECIDE SI SE MUEVEN. `PropertyBinding.findNode` es lo que el
   * mezclador llama al enlazar cada pista: se le da la escena del personaje y el
   * nombre que la pista lleva dentro —ya saneado por el cargador— y tiene que
   * devolver un hueso. Se hace para cada pista de cada clip contra cada uno de los
   * seis, que son 814 × 6 búsquedas y tardan menos que abrir un fichero.
   */
  const huerfanas: string[] = [];
  const destinos = new Set<string>();
  for (const clip of clips) {
    for (const pista of clip.tracks) {
      const nombre = PropertyBinding.parseTrackName(pista.name).nodeName ?? '';
      destinos.add(nombre);
      for (const [personaje, escena] of escenas) {
        const hueso = PropertyBinding.findNode(escena, nombre) as Object3D | null | undefined;
        if (hueso === null || hueso === undefined || !(hueso as Bone).isBone) {
          huerfanas.push(`${clip.name}/${pista.name} en ${personaje}`);
        }
      }
    }
  }
  comprobar(
    'cada pista de cada clip encuentra su hueso en cada uno de los seis personajes',
    huerfanas.length === 0 && escenas.size === PERSONAJES.length,
    huerfanas.slice(0, 6),
  );
  comprobar(
    'y los destinos de las pistas son exactamente los huesos, uno a uno',
    mismos([...destinos], HUESOS_SANEADOS),
    [...destinos],
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
const COMPROBACIONES_ESCRITAS = 28;
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
    '\nLos seis aventureros llevan el mismo rig de veintitrés huesos, el color horneado en cada\n' +
      'vértice y ninguna textura que el móvil no sepa abrir; miden lo que mide una persona en\n' +
      'escala.ts; y cada pista de los doce clips encuentra su hueso en cada personaje con el\n' +
      'nombre que GLTFLoader deja al cargar. Lo que esto NO prueba es que se vean bien: para\n' +
      'eso hace falta mirar.',
  );
  process.exit(0);
}

process.exit(1);
