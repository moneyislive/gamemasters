/**
 * COMPILA LOS SEIS AVENTUREROS Y SU BIBLIOTECA DE ANIMACIONES.
 *
 * ═══ QUÉ SALE, Y DE DÓNDE ═══
 *
 * Del pack KayKit Adventurers 2.0 (CC0, ver `arte/README.md`) salen SIETE ficheros
 * en `escenas/modelos/aventureros/`: seis personajes y una biblioteca de clips que
 * vale para los seis, porque los seis llevan el mismo esqueleto —`Rig_Medium`, 23
 * huesos— y una animación es una lista de giros por hueso.
 *
 *     nuestro        ← fichero del pack (Characters/gltf/)
 *     ─────────────────────────────────────────────────
 *     caballero      ← Knight.glb
 *     barbaro        ← Barbarian.glb
 *     maga           ← Mage.glb
 *     exploradora    ← Ranger.glb
 *     picaro         ← Rogue.glb
 *     encapuchado    ← Rogue_Hooded.glb
 *
 *     nuestro clip   ← clip del pack   ← fichero (Animations/gltf/Rig_Medium/)
 *     ─────────────────────────────────────────────────────────────────────
 *     reposo-a       ← Idle_A          ← Rig_Medium_General.glb
 *     reposo-b       ← Idle_B          ← Rig_Medium_General.glb
 *     andar          ← Walking_A       ← Rig_Medium_MovementBasic.glb
 *     correr         ← Running_A       ← Rig_Medium_MovementBasic.glb
 *     saludar        ← Interact        ← Rig_Medium_General.glb
 *     recoger        ← PickUp          ← Rig_Medium_General.glb
 *     aparecer       ← Spawn_Ground    ← Rig_Medium_General.glb
 *     usar           ← Use_Item        ← Rig_Medium_General.glb
 *     lanzar         ← Throw           ← Rig_Medium_General.glb
 *     golpe          ← Hit_A           ← Rig_Medium_General.glb
 *     salto          ← Jump_Full_Short ← Rig_Medium_MovementBasic.glb
 *     t-pose         ← T-Pose          ← Rig_Medium_General.glb
 *
 * Los dos ficheros de animación traen dentro un maniquí (`Mannequin_*`: seis mallas,
 * una piel y un material) que sirve para verlas en un visor y aquí no sirve para
 * nada: se tira, y en `animaciones.glb` quedan SÓLO los 24 nodos del rig y los doce
 * clips. Ni una malla, ni una piel, ni un material.
 *
 * ═══ LA TEXTURA SE HORNEA A COLOR POR VÉRTICE, Y POR QUÉ ═══
 *
 * Cada personaje del pack trae UNA textura PNG empotrada en el binario, y en el
 * móvil eso no se puede cargar (Hermes no tiene ni `<img>` ni decodificador de
 * PNG; ver `app/src/tres/texturas-nativas.ts`). Así que la textura se aplica AQUÍ,
 * una vez, al compilar: cada vértice se queda con el color que la textura tenía en
 * su UV, en `COLOR_0`, y el fichero sale sin textura, sin UV y con el material en
 * blanco. La maquinaria —el muestreo bilineal con envoltura, la curva sRGB → lineal,
 * los bytes normalizados en vez de flotantes y lo que se pierde al cuantizar— vive
 * en `hornear.ts`, que comparte con el compilador del embarcadero; su cabecera
 * cuenta cada decisión. Este compilador imprime el desvío que aquélla mide.
 *
 * ═══ LOS NOMBRES DE LOS HUESOS Y LO QUE HACE `GLTFLoader` CON ELLOS ═══
 *
 * Los huesos del pack se llaman `foot.l`, `upperarm.r`, `handslot.l`: con PUNTO.
 * `GLTFLoader` pasa cada nombre de nodo por `PropertyBinding.sanitizeNodeName`,
 * que borra `.`, `:`, `/`, `[` y `]` y cambia los espacios por `_`. O sea que al
 * cargar, `foot.l` se llama `footl`. (Es la misma regla que dejó el tablero sin
 * árboles una tarde: ver `nombres.ts`.)
 *
 * Aquí NO rompe nada, y conviene decir por qué: el retarget de un clip a un
 * personaje se hace POR NOMBRE, y el saneado se aplica IGUAL a los huesos del
 * personaje y a los destinos de las pistas de `animaciones.glb`, porque los dos
 * ficheros pasan por el mismo cargador. `footl.quaternion` busca un nodo llamado
 * `footl` y lo encuentra. `verify:aventureros` lo comprueba con la función de
 * three de verdad, hueso a hueso.
 *
 * Los huesos NO se renombran a propósito: el rig es del pack, y las herramientas
 * de fuera —Blender, el propio KayKit, las animaciones que se compren mañana— lo
 * esperan con estos nombres exactos.
 *
 * ═══ ESTO NO CORRE EN EL DESPLIEGUE: CORRE UNA VEZ Y SE COMMITEA EL RESULTADO ═══
 *
 * Igual que `compilar-modelos.ts`: `@gltf-transform` y `pngjs` son herramientas de
 * compilación y no entran en el paquete que se manda al navegador ni a la app. El
 * material bruto está en `.gitignore`; lo que se versiona son los siete `.glb`.
 *
 *     npm run compilar:aventureros -w escenas
 *     npm run verify:aventureros -w escenas
 */
import { PropertyType } from '@gltf-transform/core';
import type { Accessor, Animation, Document, Node, NodeIO } from '@gltf-transform/core';
import { dedup, mergeDocuments, prune, resample } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';
import { ALTURA_DE_UNA_PERSONA, enPersonas } from '../escala';
import { desnudaElMaterial, escritorDeGlb, horneaLaPrimitiva, pngDeLaTextura, rendirse } from './hornear';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const PACK = path.join(RAIZ, 'arte/kaykit/adventurers/KayKit_Adventurers_2.0_FREE');
const PERSONAJES_DEL_PACK = path.join(PACK, 'Characters/gltf');
const ANIMACIONES_DEL_PACK = path.join(PACK, 'Animations/gltf/Rig_Medium');
const SALIDA = path.join(RAIZ, 'escenas/modelos/aventureros');

/** El nodo raíz del esqueleto, tal como lo llama el pack. */
const RIG = 'Rig_Medium';

/**
 * LOS VEINTITRÉS HUESOS, con los nombres del pack.
 *
 * Están escritos y no se deducen del fichero para que el compilador se NIEGUE si un
 * día el pack cambia el rig: un personaje con otros huesos cargaría perfectamente y
 * se quedaría clavado en T al reproducir cualquier clip, sin un solo error.
 */
const HUESOS = [
  'root', 'hips', 'spine', 'chest', 'head',
  'upperarm.l', 'lowerarm.l', 'wrist.l', 'hand.l', 'handslot.l',
  'upperarm.r', 'lowerarm.r', 'wrist.r', 'hand.r', 'handslot.r',
  'upperleg.l', 'lowerleg.l', 'foot.l', 'toes.l',
  'upperleg.r', 'lowerleg.r', 'foot.r', 'toes.r',
] as const;

/** Los seis personajes: nombre nuestro ← fichero del pack. */
const PERSONAJES: ReadonlyArray<{ nombre: string; fichero: string }> = [
  { nombre: 'caballero', fichero: 'Knight' },
  { nombre: 'barbaro', fichero: 'Barbarian' },
  { nombre: 'maga', fichero: 'Mage' },
  { nombre: 'exploradora', fichero: 'Ranger' },
  { nombre: 'picaro', fichero: 'Rogue' },
  { nombre: 'encapuchado', fichero: 'Rogue_Hooded' },
];

/**
 * Los doce clips: nombre nuestro ← clip del pack ← fichero.
 *
 * `T-Pose` viene en los DOS ficheros de animación y es el mismo; se coge el de
 * `General` y el otro se tira, para que no salgan dos clips con el mismo nombre.
 */
type Fuente = 'General' | 'MovementBasic';
const CLIPS: ReadonlyArray<{ nombre: string; clip: string; fuente: Fuente }> = [
  { nombre: 'reposo-a', clip: 'Idle_A', fuente: 'General' },
  { nombre: 'reposo-b', clip: 'Idle_B', fuente: 'General' },
  { nombre: 'andar', clip: 'Walking_A', fuente: 'MovementBasic' },
  { nombre: 'correr', clip: 'Running_A', fuente: 'MovementBasic' },
  { nombre: 'saludar', clip: 'Interact', fuente: 'General' },
  { nombre: 'recoger', clip: 'PickUp', fuente: 'General' },
  { nombre: 'aparecer', clip: 'Spawn_Ground', fuente: 'General' },
  { nombre: 'usar', clip: 'Use_Item', fuente: 'General' },
  { nombre: 'lanzar', clip: 'Throw', fuente: 'General' },
  { nombre: 'golpe', clip: 'Hit_A', fuente: 'General' },
  { nombre: 'salto', clip: 'Jump_Full_Short', fuente: 'MovementBasic' },
  { nombre: 't-pose', clip: 'T-Pose', fuente: 'General' },
];

// ---------------------------------------------------------------------------
// Los personajes
// ---------------------------------------------------------------------------

type MedidaDePersonaje = {
  nombre: string;
  vertices: number;
  triangulos: number;
  bytes: number;
  altura: number;
  desvio: number;
};

/** Los nombres de los huesos de un rig, que tienen que ser EXACTAMENTE los 23. */
function exigeElRig(doc: Document, de: string): void {
  const escenas = doc.getRoot().listScenes();
  const raices = escenas.flatMap((e) => e.listChildren());
  if (escenas.length !== 1 || raices.length !== 1 || raices[0]?.getName() !== RIG) {
    rendirse(
      `«${de}» no cuelga de un único nodo «${RIG}»: ` +
        `${escenas.length} escenas y raíces [${raices.map((r) => r.getName()).join(', ')}].`,
    );
  }
  const nombres = doc.getRoot().listNodes().map((n) => n.getName());
  const faltan = HUESOS.filter((h) => !nombres.includes(h));
  if (faltan.length > 0) rendirse(`A «${de}» le faltan huesos del rig: ${faltan.join(', ')}.`);
  const repetidos = HUESOS.filter((h) => nombres.filter((n) => n === h).length > 1);
  if (repetidos.length > 0) rendirse(`«${de}» tiene huesos repetidos: ${repetidos.join(', ')}.`);
}

async function compilaPersonaje(
  io: NodeIO,
  personaje: { nombre: string; fichero: string },
): Promise<MedidaDePersonaje> {
  const origen = path.join(PERSONAJES_DEL_PACK, `${personaje.fichero}.glb`);
  if (!fs.existsSync(origen)) rendirse(`No está ${path.relative(RAIZ, origen)}.`);
  const doc = await io.read(origen);
  const root = doc.getRoot();

  exigeElRig(doc, personaje.fichero);
  const pieles = root.listSkins();
  if (pieles.length !== 1 || pieles[0]?.listJoints().length !== HUESOS.length) {
    rendirse(
      `«${personaje.fichero}» trae ${pieles.length} pieles con ` +
        `[${pieles.map((p) => p.listJoints().length).join(', ')}] huesos; se esperaba una de ${HUESOS.length}.`,
    );
  }

  /* UN material con UNA textura PNG: es lo que trae el pack, y lo que se hornea. */
  const materiales = root.listMaterials();
  const material = materiales[0];
  if (materiales.length !== 1 || material === undefined) {
    rendirse(`«${personaje.fichero}» trae ${materiales.length} materiales y el horneado supone uno.`);
  }
  const png = pngDeLaTextura(material.getBaseColorTexture(), personaje.fichero);

  let vertices = 0;
  let triangulos = 0;
  let desvio = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const malla of root.listMeshes()) {
    for (const prim of malla.listPrimitives()) {
      if (prim.getMaterial() !== material) rendirse(`«${malla.getName()}» usa otro material.`);
      desvio = Math.max(desvio, horneaLaPrimitiva(doc, prim, png, malla.getName()));
      const pos = prim.getAttribute('POSITION') as Accessor;
      vertices += pos.getCount();
      triangulos += (prim.getIndices()?.getCount() ?? pos.getCount()) / 3;
      /*
       * La altura se mide sobre las POSICIONES, que en una malla con piel están en
       * la pose de reposo: los nodos del rig van todos a identidad (comprobado en
       * el pack) y la piel deja los vértices donde están hasta que un clip los
       * mueva. Es la misma medida que dio 2,543 para `escala.ts`.
       */
      minY = Math.min(minY, pos.getMin([])[1] as number);
      maxY = Math.max(maxY, pos.getMax([])[1] as number);
    }
  }

  /* Sin textura y en blanco, para que mande el vértice. Ver `hornear.ts`. */
  desnudaElMaterial(material);

  await doc.transform(prune());

  if (root.listTextures().length !== 0) rendirse(`A «${personaje.nombre}» le ha quedado una textura dentro.`);

  fs.mkdirSync(SALIDA, { recursive: true });
  const destino = path.join(SALIDA, `${personaje.nombre}.glb`);
  await io.write(destino, doc);

  return {
    nombre: personaje.nombre,
    vertices,
    triangulos,
    bytes: fs.statSync(destino).size,
    altura: maxY - minY,
    desvio,
  };
}

// ---------------------------------------------------------------------------
// La biblioteca de animaciones
// ---------------------------------------------------------------------------

type MedidaDeClip = { nombre: string; clip: string; duracion: number; pistas: number };

/** Cuánto dura un clip: el último instante de cualquiera de sus muestreadores. */
function duracionDe(anim: Animation): number {
  let fin = 0;
  for (const s of anim.listSamplers()) {
    const entrada = s.getInput();
    if (entrada !== null && entrada.getCount() > 0) fin = Math.max(fin, entrada.getMax([])[0] as number);
  }
  return fin;
}

/**
 * TIRA UN CLIP ENTERO, y no sólo el clip.
 *
 * `anim.dispose()` borra la animación y deja HUÉRFANOS sus canales y muestreadores,
 * que siguen agarrando sus accesores; y `prune` sólo mira los muestreadores de las
 * animaciones que quedan, así que esos accesores se escriben igual. Medido: con el
 * `dispose` pelado, `animaciones.glb` salía de 512 kB con catorce clips muertos
 * dentro; tirando los tres niveles, 271 kB.
 */
function tiraElClip(anim: Animation): void {
  for (const canal of anim.listChannels()) canal.dispose();
  for (const muestreador of anim.listSamplers()) muestreador.dispose();
  anim.dispose();
}

/**
 * UN CLIP DE UNA SOLA CLAVE DURA CERO, Y CERO ROMPE EL MEZCLADOR.
 *
 * `T-Pose` viene del pack con UNA clave por pista. `GLTFLoader` lo carga como un
 * clip de duración 0 y `AnimationMixer`, en el modo de repetición que trae por
 * defecto, divide el tiempo entre esa duración: `action.time` sale `NaN`. Medido en
 * Node con three 0.185 sobre el fichero compilado.
 *
 * Se le añade una segunda clave IDÉNTICA un fotograma después —1/30 s, que es el
 * paso al que el pack graba todo lo demás—. La pose no cambia; el clip pasa a durar
 * 0,033 s y se reproduce, repite y funde como los otros once.
 */
function daUnFotogramaMas(anim: Animation): void {
  const UN_FOTOGRAMA = 1 / 30;
  for (const s of anim.listSamplers()) {
    const entrada = s.getInput();
    const salida = s.getOutput();
    if (entrada === null || salida === null) continue;
    /* La entrada suele estar COMPARTIDA entre las pistas del clip: se alarga una vez. */
    if (entrada.getCount() === 1) {
      const t0 = entrada.getElement(0, [])[0] as number;
      entrada.setArray(new Float32Array([t0, t0 + UN_FOTOGRAMA]));
    }
    const valores = salida.getArray();
    if (valores !== null && salida.getCount() === 1) {
      if (salida.getComponentType() !== 5126) rendirse(`«${anim.getName()}» trae pistas que no son flotantes.`);
      const doble = new Float32Array(valores.length * 2);
      doble.set(valores, 0);
      doble.set(valores, valores.length);
      salida.setArray(doble);
    }
  }
}

/**
 * Tira el maniquí de un fichero de animación: los nodos con malla, las mallas, las
 * pieles y los materiales. Los huesos se quedan porque las pistas apuntan a ellos.
 */
function quitaElManiqui(doc: Document): void {
  const root = doc.getRoot();
  for (const nodo of root.listNodes()) if (nodo.getMesh() !== null) nodo.dispose();
  for (const piel of root.listSkins()) piel.dispose();
  for (const malla of root.listMeshes()) malla.dispose();
  for (const material of root.listMaterials()) material.dispose();
  for (const textura of root.listTextures()) textura.dispose();
}

async function compilaAnimaciones(io: NodeIO): Promise<MedidaDeClip[]> {
  const ficheroGeneral = path.join(ANIMACIONES_DEL_PACK, 'Rig_Medium_General.glb');
  const ficheroMovimiento = path.join(ANIMACIONES_DEL_PACK, 'Rig_Medium_MovementBasic.glb');
  for (const f of [ficheroGeneral, ficheroMovimiento]) {
    if (!fs.existsSync(f)) rendirse(`No está ${path.relative(RAIZ, f)}.`);
  }

  /* `General` es el destino: su rig se queda, y el de `MovementBasic` se funde en él. */
  const doc = await io.read(ficheroGeneral);
  const movimiento = await io.read(ficheroMovimiento);
  exigeElRig(doc, 'Rig_Medium_General');
  exigeElRig(movimiento, 'Rig_Medium_MovementBasic');
  quitaElManiqui(doc);
  quitaElManiqui(movimiento);

  const root = doc.getRoot();
  const huesoPorNombre = new Map<string, Node>();
  for (const nodo of root.listNodes()) huesoPorNombre.set(nodo.getName(), nodo);
  const nodosPropios = new Set(root.listNodes());

  /*
   * `mergeDocuments` trae los clips de `MovementBasic` CON su copia del rig, y sus
   * pistas apuntan a esa copia. Se recolocan sobre los huesos del rig que ya estaba
   * —por nombre, que es lo mismo que hará three en el móvil— y la copia se tira.
   * En este orden: una pista cuyo destino se borra se queda apuntando a nada.
   */
  const copiado = mergeDocuments(doc, movimiento);
  for (const anim of movimiento.getRoot().listAnimations()) {
    const copia = copiado.get(anim);
    if (copia === undefined || !(copia instanceof Object)) rendirse(`No se ha copiado el clip «${anim.getName()}».`);
    for (const canal of (copia as import('@gltf-transform/core').Animation).listChannels()) {
      const destino = canal.getTargetNode();
      const hueso = destino === null ? undefined : huesoPorNombre.get(destino.getName());
      if (hueso === undefined) {
        rendirse(`«${anim.getName()}» apunta a «${destino?.getName() ?? '∅'}», que no es un hueso del rig.`);
      }
      canal.setTargetNode(hueso);
    }
  }
  for (const nodo of root.listNodes()) if (!nodosPropios.has(nodo)) nodo.dispose();
  for (const escena of root.listScenes()) if (escena.listChildren().length === 0) escena.dispose();

  /* Se queda lo de la tabla, con nuestro nombre; lo demás se tira. */
  const fuenteDe = (anim: import('@gltf-transform/core').Animation): Fuente =>
    movimiento.getRoot().listAnimations().some((a) => copiado.get(a) === anim) ? 'MovementBasic' : 'General';
  const medidas: MedidaDeClip[] = [];
  const encontrados = new Set<string>();
  for (const anim of root.listAnimations()) {
    const fuente = fuenteDe(anim);
    const quiero = CLIPS.find((c) => c.clip === anim.getName() && c.fuente === fuente);
    if (quiero === undefined) {
      tiraElClip(anim);
      continue;
    }
    if (encontrados.has(quiero.nombre)) rendirse(`El clip «${quiero.clip}» sale dos veces de «${fuente}».`);
    encontrados.add(quiero.nombre);
    anim.setName(quiero.nombre);
  }
  const faltan = CLIPS.filter((c) => !encontrados.has(c.nombre));
  if (faltan.length > 0) {
    rendirse(`Faltan clips en el pack: ${faltan.map((c) => `${c.nombre} (${c.clip} de ${c.fuente})`).join(', ')}.`);
  }
  for (const anim of root.listAnimations()) if (duracionDe(anim) === 0) daUnFotogramaMas(anim);

  /*
   * `resample` quita las claves que no aportan nada —la mayoría de las pistas de
   * escala y de traslación son constantes, y el pack las guarda a treinta claves
   * por segundo igual—; `dedup` de accesores funde los que quedan iguales —las
   * pistas constantes de un mismo hueso son el mismo par de claves en los doce
   * clips— y `prune` tira los accesores huérfanos, los búferes vacíos y los nodos
   * que ya no apunta nadie. Los huesos hoja (`toes.*`, `handslot.*`) se quedan
   * porque las pistas los apuntan; si un día ningún clip los moviera, `prune` los
   * tiraría y `verify:aventureros` lo cazaría contando 24 nodos.
   */
  await doc.transform(resample(), dedup({ propertyTypes: [PropertyType.ACCESSOR] }), prune());

  /* Un solo búfer, que es lo único que admite un `.glb`. Ver `compilar-modelos.ts`. */
  const unico = doc.createBuffer('animaciones');
  for (const accesor of root.listAccessors()) accesor.setBuffer(unico);
  for (const bufer of root.listBuffers()) if (bufer !== unico) bufer.dispose();

  const nodos = root.listNodes().map((n) => n.getName()).sort();
  const esperados = [RIG, ...HUESOS].sort();
  if (JSON.stringify(nodos) !== JSON.stringify(esperados)) {
    rendirse(`En animaciones.glb quedan estos nodos: [${nodos.join(', ')}], y tenían que ser el rig y sus 23 huesos.`);
  }
  if (root.listMeshes().length + root.listSkins().length + root.listMaterials().length + root.listTextures().length !== 0) {
    rendirse('En animaciones.glb ha quedado una malla, una piel, un material o una textura.');
  }

  for (const clip of CLIPS) {
    const anim = root.listAnimations().find((a) => a.getName() === clip.nombre);
    if (anim === undefined) rendirse(`Se ha perdido «${clip.nombre}» por el camino.`);
    medidas.push({ nombre: clip.nombre, clip: clip.clip, duracion: duracionDe(anim), pistas: anim.listChannels().length });
  }

  fs.mkdirSync(SALIDA, { recursive: true });
  await io.write(path.join(SALIDA, 'animaciones.glb'), doc);
  return medidas;
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!fs.existsSync(PACK)) {
    rendirse(
      `No está el material bruto en ${path.relative(RAIZ, PACK)}.\n\n` +
        'Es CC0 y no se versiona a propósito. `arte/README.md` dice cómo bajarlo.',
    );
  }
  /* Con los atributos separados, no entrelazados: ver `escritorDeGlb` en `hornear.ts`. */
  const io = escritorDeGlb();

  console.log('\nPersonajes');
  console.log('  nombre        vértices  triáng.     kB  altura  personas  desvío sRGB');
  const personajes: MedidaDePersonaje[] = [];
  for (const p of PERSONAJES) {
    const m = await compilaPersonaje(io, p);
    personajes.push(m);
    console.log(
      `  ${m.nombre.padEnd(12)} ${String(m.vertices).padStart(8)} ${String(m.triangulos).padStart(8)}` +
        ` ${(m.bytes / 1024).toFixed(0).padStart(6)}  ${m.altura.toFixed(3)}     ${enPersonas(m.altura).toFixed(3)}` +
        `        ${m.desvio.toFixed(1)}`,
    );
  }

  console.log('\nClips de animaciones.glb');
  console.log('  nombre      ← clip del pack        pistas  segundos');
  const clips = await compilaAnimaciones(io);
  for (const c of clips) {
    console.log(`  ${c.nombre.padEnd(11)} ← ${c.clip.padEnd(18)} ${String(c.pistas).padStart(6)}  ${c.duracion.toFixed(3)}`);
  }
  const bytesDeClips = fs.statSync(path.join(SALIDA, 'animaciones.glb')).size;
  console.log(`  ${(bytesDeClips / 1024).toFixed(0)} kB en ${path.relative(RAIZ, path.join(SALIDA, 'animaciones.glb'))}`);

  /*
   * LA ALTURA SE CONTRASTA CON `escala.ts` AL COMPILAR, no sólo al verificar: de
   * `ALTURA_DE_UNA_PERSONA` cuelga la escala del mundo entero, y si el pack cambiara
   * de unidad conviene enterarse aquí, con el fichero del pack delante.
   *
   * Se mira al CABALLERO porque es el que midió `escala.ts`. Los seis comparten el
   * esqueleto al milímetro y lo que cambia es el sombrero: la maga con capirote da
   * 2,655 y el pícaro sin nada, 2,180. `verify:aventureros` les pide a los otros
   * cinco lo que de verdad importa, que estén en la misma unidad.
   */
  const caballero = personajes.find((p) => p.nombre === 'caballero');
  if (caballero === undefined) rendirse('No se ha compilado el caballero, que es la referencia de escala.');
  console.log(
    `\n  El caballero mide ${caballero.altura.toFixed(3)}; una persona en escala.ts mide ${String(ALTURA_DE_UNA_PERSONA)}.`,
  );
  if (Math.abs(caballero.altura - ALTURA_DE_UNA_PERSONA) / ALTURA_DE_UNA_PERSONA > 0.05) {
    rendirse('El pack ya no mide lo que mide `escala.ts`: hay que volver a medir antes de seguir.');
  }
  console.log('');
}

await main();
