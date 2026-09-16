/**
 * ¿SE SOSTIENE LA PLAZA DEL BURGO? La composición, la cámara, los gestos y el
 * presupuesto, en Node y sin abrir un contexto de dibujo.
 *
 * ═══ QUÉ COMPRA ESTE GUION ═══
 *
 * `escenas/plaza/` separa a propósito lo que es aritmética pura (`la-plaza.ts`,
 * `camara-de-la-plaza.ts`, `gestos-de-la-plaza.ts`, `presupuesto-de-la-plaza.ts`,
 * `tarde.ts`) de lo que dibuja (`mundo-de-la-plaza.ts`, que importa `three` pero no abre
 * lienzo, y los dos `.tsx`). Esto recorre lo primero —y construye lo segundo con el
 * `burgo.glb` de verdad— y comprueba lo que, si estuviera mal, no daría ningún error en
 * ninguna consola:
 *
 *   · Que la plaza es DETERMINISTA: la misma semilla da byte a byte la misma plaza, y dos
 *     códigos distintos dan plazas distintas. Es lo que hace que los seis aparatos de una
 *     mesa vean la misma plaza.
 *   · Que toda pieza puesta EXISTE en `burgo/piezas.ts` y en el `.glb`, que ninguna se
 *     sale del recinto, y que TODAS APOYAN en su suelo: la acera está a 0,6 y un
 *     `cuerpo-*` puesto a cero flota exactamente eso, que es el fallo que no se ve hasta
 *     que se mira de canto.
 *   · Que NADA pisa un puesto ni el pasillo por el que se entra o se sale. Un árbol a dos
 *     unidades de un camino es un aventurero atravesando un pino.
 *   · Que la CÁMARA deja a los seis enteros, por encima de la hoja y separados al menos
 *     el 6 % del ancho en 9:19,5 (hoja 0,36), 3:4 (0,3) y 16:9 (0), con uno, dos, cuatro y
 *     seis ocupados — y con la cámara RESPIRANDO, no sólo en reposo.
 *   · Que el ARCO está abierto hacia la cámara: nadie detrás del monumento, nadie tapado
 *     por él, el local delante y en el eje, y gente a los dos lados.
 *   · Que los GESTOS nunca piden `t-pose` en diez mil pasos sembrados, que todos los clips
 *     que piden existen en `animaciones.glb`, y que el paso de cada camino cae en un ritmo
 *     que no hace patinar los pies.
 *   · Que el PRESUPUESTO se cumple con los triángulos del `.glb` REAL —cargado con el
 *     `GLTFLoader` de three, como `verificar-burgo-modelos.ts`— y seis aventureros DE LA
 *     FIGURA MÁS PESADA, no de la media.
 *   · Que a los bultos propios no se les ve el interior desde el aire (la LUPA CENITAL que
 *     salió de perder los tejados de la ciudad entera con 277 comprobaciones en verde).
 *   · Y que el cielo del zarpe acaba EXACTAMENTE en el mediodía del tablero, leído del
 *     fuente de `Burgo.tsx`: si el tablero cambia de cielo, esto se pone rojo en vez de
 *     dejar un corte de color al cambiar de pantalla.
 *
 * ═══ CADA REGLA CON SU VACUNA ═══
 *
 * Un comprobador que no se ha visto caer no vigila nada, y uno con filtro puede estar
 * verde porque no mira NADA. Así que cada juez se ejerce con un caso envenenado —una
 * pieza que flota, un árbol en mitad del pasillo, un puesto movido al eje, un clip que
 * devuelve `t-pose`, una figura de veinte mil triángulos, una caja sin tapa, unas normales
 * del revés— y además se cuenta cuántas cosas inspecciona cada barrido: CERO
 * INSPECCIONADOS ES UN FALLO.
 *
 * ═══ LO QUE ESTO NO PRUEBA ═══
 *
 * Que se VEA bien, ni cuántas llamadas de dibujo salen de verdad, ni lo que pasa dentro de
 * un `useFrame` (Node no lo mide). Para eso está el banco `escritorio/plaza3d.html`, que
 * enseña la plaza con una mesa de mentira y un contador de triángulos y llamadas.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { NodeIO } from '@gltf-transform/core';
import { catalogoDeModelos } from '../modelos';
import type { CatalogoDeModelos } from '../modelos';
import { conRespiracion } from '../embarcadero/camara';
import { sorteo } from '../embarcadero/cala';
import { CLIP, FIGURAS } from '../embarcadero/figuras';
import { nacer, siguiente } from '../embarcadero/gestos';
import type { EstadoDeAventurero, Fase, ModoDeNacer, Suceso } from '../embarcadero/gestos';
import { PIEZA } from '../burgo/piezas';
import { ALTURA_DEL_ASFALTO, cuartosDelBrazoHacia, giroMirandoA, radianesDeCuartos } from '../burgo/ciudad';
import type { Rumbo } from '../burgo/ciudad';
import { geometriaDeUnBulto } from '../burgo/ciudad-en-3d';
import {
  BORDE_DE_LA_PLAZA,
  CELDAS_POR_LADO,
  COCHE_SOBRE_EL_ASFALTO,
  LADO_DE_LA_PLAZA,
  MONUMENTO,
  OJO_DE_REFERENCIA,
  RETICULA,
  SUELO_DE_LA_PLAZA,
  componerLaPlaza,
  distanciaAlCamino,
  giroDelBrazoHacia,
  giroMirandoHacia,
  huellaAlAndar,
  piezasQueSePintan,
  puestosDeLaPlaza,
  semillaDeLaPlaza,
  HUELLA,
} from '../plaza/la-plaza';
import type { LaPlaza, PuestaDeLaPlaza } from '../plaza/la-plaza';
import {
  BORDE_DEL_ENCUADRE,
  POSE_AEREA,
  SEPARACION_ENTRE_PUESTOS,
  SEPARACION_RESPIRANDO,
  cajaEnPantalla,
  pieEnPantalla,
  poseDeReposo,
} from '../plaza/camara-de-la-plaza';
import { RITMO, clipDeLaPlaza, largoDelCamino, puntoDelCamino, ritmoDeLaEntrada } from '../plaza/gestos-de-la-plaza';
import type { ClipDeLaPlaza } from '../plaza/gestos-de-la-plaza';
import {
  TOPE_DE_LLAMADAS,
  TOPE_DE_TRIANGULOS,
  llamadasDeLaPlaza,
  renglonesDeLaPlaza,
} from '../plaza/presupuesto-de-la-plaza';
import { MEDIODIA_DEL_TABLERO, TARDE, mezclaDeColores } from '../plaza/tarde';
import { construirElMundoDeLaPlaza, geometriaDeUnBultoDeLaPlaza } from '../plaza/mundo-de-la-plaza';

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

const r2 = (x: number): number => Number(x.toFixed(2));
const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..');
const FICHERO = path.join(RAIZ, 'modelos', 'burgo.glb');
const AVENTUREROS = path.join(RAIZ, 'modelos', 'aventureros');
const CARPETA = path.join(RAIZ, 'plaza');
const BURGO_TSX = path.join(RAIZ, 'burgo', 'Burgo.tsx');

/** Los códigos con los que se prueba: el peor de todos es el que manda en el presupuesto. */
const CODIGOS: readonly (string | null)[] = ['ABCDE', 'QWERT', 'ZXCVB', 'MNBVC', 'HOLAA', 'PLAZA', 'BURGO', 'RIBER', null];
/** El alto que se le supone a un aventurero al encuadrarlo: el más alto del pack, medido abajo. */
let ALTO_DEL_AVENTURERO = 2.66;

// ---------------------------------------------------------------------------
paso('Ningún fichero de escenas/plaza trae drei, DOM, Expo ni fetch; los puros no traen three');
// ---------------------------------------------------------------------------

/** Quita comentarios de bloque y de línea: lo prohibido se busca en el código, no en las cabeceras. */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const PROHIBIDO: readonly { readonly que: string; readonly regex: RegExp }[] = [
  { que: 'drei', regex: /@react-three\/drei/ },
  { que: 'document', regex: /\bdocument\b/ },
  { que: 'window', regex: /\bwindow\b/ },
  { que: 'fetch', regex: /\bfetch\s*\(/ },
  { que: 'expo', regex: /['"]expo[-/'"]|\bexpo-/ },
  /* La trampa medida: `matrizDePuesta` escala ×5,469 y `burgo.glb` ya va a escala del mundo. */
  { que: 'matrizDePuesta', regex: /\bmatrizDePuesta\b/ },
  { que: 'ESCALA_DEL_PACK', regex: /\bESCALA_DEL_PACK\b/ },
];

function loProhibidoEn(fuente: string): string[] {
  const codigo = sinComentarios(fuente);
  return PROHIBIDO.filter((p) => p.regex.test(codigo)).map((p) => p.que);
}

const PUROS = ['la-plaza.ts', 'camara-de-la-plaza.ts', 'gestos-de-la-plaza.ts', 'presupuesto-de-la-plaza.ts', 'tarde.ts'];
const CON_THREE_PERO_SIN_LIENZO = ['mundo-de-la-plaza.ts', 'cielo-de-la-plaza.ts'];

{
  const ficheros = fs
    .readdirSync(CARPETA)
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => path.join(CARPETA, f));
  comprobar('la carpeta escenas/plaza tiene ficheros que inspeccionar', ficheros.length >= 7, ficheros.length);
  const conAlgo = ficheros.flatMap((f) => loProhibidoEn(fs.readFileSync(f, 'utf8')).map((q) => `${path.basename(f)}: ${q}`));
  comprobar(`ninguno de los ${String(ficheros.length)} ficheros trae drei, document, window, fetch, expo, matrizDePuesta ni ESCALA_DEL_PACK`, conAlgo.length === 0, conAlgo);
  const envenenado = `import { Html } from '@react-three/drei';\nconst w = window.innerWidth;\nfetch('/x');\nimport { Asset } from 'expo-asset';\nconst d = document.body;\nconst m = matrizDePuesta(1,2,3,0,1);\nconst k = ESCALA_DEL_PACK;`;
  comprobar('se ve fallar: un fuente con los siete enciende los siete', loProhibidoEn(envenenado).length === 7, loProhibidoEn(envenenado));
  comprobar('y el barrido no se traga los comentarios: un `// window` no cuenta', loProhibidoEn('// window y document\n/* fetch( */\nconst a = 1;').length === 0);

  const faltan = [...PUROS, ...CON_THREE_PERO_SIN_LIENZO].filter((f) => !fs.existsSync(path.join(CARPETA, f)));
  comprobar('los cinco ficheros puros y los dos de geometría existen', faltan.length === 0, faltan);
  const conThree = PUROS.filter((f) => /from\s+['"]three['"]|from\s+['"]three\//.test(sinComentarios(fs.readFileSync(path.join(CARPETA, f), 'utf8'))));
  comprobar('los cinco puros no importan three: los lee este guion sin motor de dibujo', conThree.length === 0, conThree);
  comprobar('se ve fallar: un puro que importara three se vería', /from\s+['"]three['"]/.test(sinComentarios("import * as THREE from 'three';")));
  const conReact = CON_THREE_PERO_SIN_LIENZO.filter((f) => /from\s+['"]react|@react-three\/fiber/.test(sinComentarios(fs.readFileSync(path.join(CARPETA, f), 'utf8'))));
  comprobar('mundo-de-la-plaza y cielo-de-la-plaza no importan React ni fiber: este guion los usa en Node', conReact.length === 0, conReact);
}

// ---------------------------------------------------------------------------
paso('El .glb real: catálogo, triángulos y cajas por pieza');
// ---------------------------------------------------------------------------

comprobar('burgo.glb está compilado', fs.existsSync(FICHERO));
if (!fs.existsSync(FICHERO)) {
  console.log(`\nNo está ${path.relative(RAIZ, FICHERO)}: se rehace con \`npm run compilar:burgo -w escenas\`.`);
  process.exit(1);
}

function cargaConThree(ruta: string): Promise<GLTF> {
  const bytes = fs.readFileSync(ruta);
  const trozo = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolver, rechazar) => {
    new GLTFLoader().parse(trozo, '', resolver, rechazar);
  });
}

function triangulosDe(objeto: THREE.Object3D): number {
  let t = 0;
  objeto.traverse((n) => {
    const m = n as THREE.Mesh;
    if (!m.isMesh) return;
    const indice = m.geometry.getIndex();
    t += indice !== null ? indice.count / 3 : (m.geometry.getAttribute('position') as THREE.BufferAttribute).count / 3;
  });
  return t;
}

const gltf = await cargaConThree(FICHERO);
const catalogo: CatalogoDeModelos = catalogoDeModelos(gltf.scene);
const triangulosPorPieza = new Map<string, number>();
const cajaPorPieza = new Map<string, THREE.Box3>();
for (const hijo of gltf.scene.children) {
  triangulosPorPieza.set(hijo.name, triangulosDe(hijo));
  cajaPorPieza.set(hijo.name, new THREE.Box3().setFromObject(hijo));
}
comprobar('el GLTFLoader de three abre burgo.glb y trae piezas con triángulos', triangulosPorPieza.size > 100, triangulosPorPieza.size);

/* El aventurero más pesado, medido: es con el que se exige el tope. */
let triangulosDelPeorAventurero = 0;
let elPeorAventurero = '';
{
  const io = new NodeIO();
  for (const f of FIGURAS) {
    const ruta = path.join(AVENTUREROS, f.fichero);
    if (!fs.existsSync(ruta)) continue;
    const suGltf = await cargaConThree(ruta);
    const t = triangulosDe(suGltf.scene);
    if (t > triangulosDelPeorAventurero) {
      triangulosDelPeorAventurero = t;
      elPeorAventurero = f.id;
    }
    const caja = new THREE.Box3().setFromObject(suGltf.scene);
    ALTO_DEL_AVENTURERO = Math.max(ALTO_DEL_AVENTURERO, caja.max.y - caja.min.y);
    /* Y de paso, que el fichero se pueda leer también con @gltf-transform, como el resto de la casa. */
    if (f.id === 'exploradora') await io.read(ruta);
  }
  comprobar('los seis aventureros están compilados y se miden', triangulosDelPeorAventurero > 1000, { elPeorAventurero, triangulos: triangulosDelPeorAventurero, alto: r2(ALTO_DEL_AVENTURERO) });
}

// ---------------------------------------------------------------------------
paso('La plaza es determinista, y distinta para dos códigos');
// ---------------------------------------------------------------------------

{
  const a = JSON.stringify(componerLaPlaza(semillaDeLaPlaza('ABCDE')));
  const b = JSON.stringify(componerLaPlaza(semillaDeLaPlaza('ABCDE')));
  const c = JSON.stringify(componerLaPlaza(semillaDeLaPlaza('QWERT')));
  comprobar('la misma semilla da byte a byte la misma plaza', a === b);
  comprobar('y dos códigos distintos dan plazas distintas', a !== c);
  comprobar('el código no distingue mayúsculas', semillaDeLaPlaza('abcde') === semillaDeLaPlaza('ABCDE'));
  comprobar('sin código se usa la semilla fija de la portada', semillaDeLaPlaza(null) === semillaDeLaPlaza('') && semillaDeLaPlaza(null) === semillaDeLaPlaza(undefined));
  /* Los puestos NO dependen de la semilla: la cámara se comprueba contra ellos una vez. */
  const puestosA = JSON.stringify(componerLaPlaza(semillaDeLaPlaza('ABCDE')).puestos);
  const puestosB = JSON.stringify(componerLaPlaza(semillaDeLaPlaza('QWERT')).puestos);
  comprobar('los seis puestos son los mismos con cualquier semilla', puestosA === puestosB);
}

const plazas = CODIGOS.map((c) => componerLaPlaza(semillaDeLaPlaza(c), 'plena'));
const plaza = plazas[0] as LaPlaza;
const puestos = plaza.puestos;

// ---------------------------------------------------------------------------
paso('Toda pieza existe, cabe en el recinto y apoya en su suelo');
// ---------------------------------------------------------------------------

const NOMBRES_DE_PIEZA = new Set<string>(Object.values(PIEZA));

/**
 * SOBRE QUÉ SUPERFICIE SE APOYA CADA PIEZA, que no es lo mismo que a qué cota está su origen.
 *
 * Las losas de calle y las soleras SON el suelo: su cara de abajo va a cero. Un coche se
 * posa sobre el asfalto (0,42) y sus ruedas bajan del origen, por eso se pone a 0,786. El
 * monumento se apoya en el PEDESTAL y no en la acera. Y todo lo demás —el atrezo, los
 * muebles y también los `cuerpo-*`, que traen dentro el grueso de su acera— se apoya en la
 * acera, a 0,6. Sin esta distinción, media plaza «flotaría» y la otra media «estaría
 * enterrada» sin que nada estuviera mal.
 */
function sueloQueLeToca(p: PuestaDeLaPlaza): number {
  if (p.pieza.startsWith('calzada') || p.pieza === PIEZA.solera) return 0;
  if (Math.abs(p.y - COCHE_SOBRE_EL_ASFALTO) < 1e-6) return ALTURA_DEL_ASFALTO;
  if (p.tenir !== undefined) return MONUMENTO.y;
  return SUELO_DE_LA_PLAZA;
}

/**
 * LOS PROBLEMAS DE UNA PLAZA. Se escribe como función para poder envenenarla: una pieza
 * inventada, una que flote, una que se salga. Un juez que no se ha visto caer no vigila.
 */
function problemasDeLaComposicion(laPlaza: LaPlaza): string[] {
  const problemas: string[] = [];
  const mitad = LADO_DE_LA_PLAZA / 2 + RETICULA * 1.5;
  for (const p of laPlaza.piezas) {
    if (!NOMBRES_DE_PIEZA.has(p.pieza)) {
      problemas.push(`pieza: «${p.pieza}» no está en PIEZA`);
      continue;
    }
    const caja = cajaPorPieza.get(p.pieza);
    if (caja === undefined) {
      problemas.push(`fichero: «${p.pieza}» no está en burgo.glb`);
      continue;
    }
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || Math.abs(p.x) > mitad || Math.abs(p.z) > mitad) {
      problemas.push(`recinto: ${p.pieza} en (${r2(p.x)}, ${r2(p.z)}) se sale de la plaza`);
    }
    if (!(p.talla > 0)) problemas.push(`talla: ${p.pieza} a talla ${String(p.talla)}`);
    /* Apoyar: el origen a la cota que le toca, y la caja ni flotando ni enterrada. */
    const suelo = sueloQueLeToca(p);
    const abajo = p.y + caja.min.y * p.talla;
    if (abajo > suelo + 0.02) problemas.push(`flota: ${p.pieza} en (${r2(p.x)}, ${r2(p.z)}) empieza a ${r2(abajo)} sobre un suelo de ${r2(suelo)}`);
    if (abajo < suelo - 0.62) problemas.push(`enterrada: ${p.pieza} en (${r2(p.x)}, ${r2(p.z)}) baja a ${r2(abajo)} con el suelo a ${r2(suelo)}`);
  }
  return problemas;
}

{
  let inspeccionadas = 0;
  const problemas: string[] = [];
  for (const laPlaza of plazas) {
    inspeccionadas += laPlaza.piezas.length;
    problemas.push(...problemasDeLaComposicion(laPlaza));
  }
  comprobar('hay piezas que inspeccionar en las nueve plazas probadas', inspeccionadas > 900, inspeccionadas);
  comprobar(`las ${String(inspeccionadas)} piezas puestas existen, caben y apoyan en su suelo`, problemas.length === 0, problemas.slice(0, 6));

  /* Las tres vacunas del juez de composición. */
  const inventada: PuestaDeLaPlaza = { pieza: 'catapulta' as PuestaDeLaPlaza['pieza'], x: 0, y: 0, z: 0, giro: 0, talla: 1 };
  const flotando: PuestaDeLaPlaza = { pieza: PIEZA.cuerpoA, x: 0, y: SUELO_DE_LA_PLAZA, z: 0, giro: 0, talla: 1 };
  const fuera: PuestaDeLaPlaza = { pieza: PIEZA.pino, x: 400, y: SUELO_DE_LA_PLAZA, z: 0, giro: 0, talla: 1 };
  const con = (mala: PuestaDeLaPlaza): string[] => problemasDeLaComposicion({ ...plaza, piezas: [...plaza.piezas, mala] });
  comprobar('se ve fallar: una pieza que no está en PIEZA', con(inventada).some((p) => p.startsWith('pieza:')));
  comprobar('se ve fallar: un cuerpo puesto sobre la acera flota los 0,6 que mide el bordillo', con(flotando).some((p) => p.startsWith('flota:')), con(flotando).filter((p) => p.startsWith('flota:')).slice(0, 1));
  comprobar('se ve fallar: una pieza fuera del recinto', con(fuera).some((p) => p.startsWith('recinto:')));
}

// ---------------------------------------------------------------------------
paso('Nada pisa un puesto ni el pasillo por el que se entra y se sale');
// ---------------------------------------------------------------------------

/** El claro que necesita una persona para pasar al lado de algo. */
const MEDIO_ANCHO_DE_UNA_PERSONA = 0.6;

function problemasDePasillos(laPlaza: LaPlaza): string[] {
  const problemas: string[] = [];
  for (const p of laPlaza.piezas) {
    /* El suelo se pisa: las losas y las soleras no estorban a nadie. */
    if (p.y === 0) continue;
    const radio = huellaAlAndar(p.pieza);
    for (const puesto of laPlaza.puestos) {
      for (const [camino, cual] of [
        [puesto.entrada, 'entrada'],
        [puesto.salida, 'salida'],
      ] as const) {
        const d = distanciaAlCamino({ x: p.x, z: p.z }, camino) - radio;
        if (d < MEDIO_ANCHO_DE_UNA_PERSONA) {
          problemas.push(`pasillo: ${p.pieza} en (${r2(p.x)}, ${r2(p.z)}) deja ${r2(d)} en la ${cual} del puesto ${String(puesto.indice)}`);
        }
      }
    }
  }
  /* Y ningún pasillo pasa por encima del sitio de otro. */
  for (const a of laPlaza.puestos) {
    for (const b of laPlaza.puestos) {
      if (a.indice === b.indice) continue;
      for (const [camino, cual] of [
        [b.entrada, 'entrada'],
        [b.salida, 'salida'],
      ] as const) {
        const d = distanciaAlCamino(a.pie, camino);
        if (d < 2.2) problemas.push(`pasillo: la ${cual} del puesto ${String(b.indice)} pasa a ${r2(d)} del pie del ${String(a.indice)}`);
      }
    }
  }
  return problemas;
}

{
  const problemas = plazas.flatMap((p) => problemasDePasillos(p));
  comprobar('ningún mueble, árbol ni coche deja menos de 0,6 de paso en un pasillo, en las nueve plazas', problemas.length === 0, problemas.slice(0, 6));

  const enMedio: PuestaDeLaPlaza = {
    pieza: PIEZA.pinoGrande,
    x: (puestos[3]?.entrada[1]?.x ?? 0),
    y: SUELO_DE_LA_PLAZA,
    z: (puestos[3]?.entrada[1]?.z ?? 0),
    giro: 0,
    talla: 1,
  };
  comprobar(
    'se ve fallar: un pino grande plantado en mitad de un pasillo',
    problemasDePasillos({ ...plaza, piezas: [...plaza.piezas, enMedio] }).some((p) => p.startsWith('pasillo:')),
  );
}

// ---------------------------------------------------------------------------
paso('Los caminos se andan a un paso que no patina');
// ---------------------------------------------------------------------------

{
  const malos: string[] = [];
  for (const puesto of puestos) {
    const largo = largoDelCamino(puesto.entrada);
    const ritmo = ritmoDeLaEntrada(largo);
    if (Math.abs(ritmo - puesto.ritmo) > 1e-9) malos.push(`${String(puesto.indice)}: el puesto dice ${r2(puesto.ritmo)} y el camino ${r2(ritmo)}`);
    if (ritmo < RITMO.minimo || ritmo > RITMO.maximo) malos.push(`${String(puesto.indice)}: ${r2(largo)} u dan un ritmo de ${r2(ritmo)}`);
    /* Y el camino tiene que empezar en una boca de calle, no en medio de la plaza. */
    const boca = puesto.entrada[0];
    if (boca === undefined || Math.max(Math.abs(boca.x), Math.abs(boca.z)) < BORDE_DE_LA_PLAZA - 0.01) {
      malos.push(`${String(puesto.indice)}: su camino no sale del borde de la plaza`);
    }
    /* El último punto es su sitio, y el de salida sale de su sitio. */
    const fin = puesto.entrada[puesto.entrada.length - 1];
    if (fin === undefined || Math.hypot(fin.x - puesto.pie.x, fin.z - puesto.pie.z) > 1e-9) malos.push(`${String(puesto.indice)}: su camino no acaba en su sitio`);
    const salida = puesto.salida[puesto.salida.length - 1];
    if (salida === undefined || salida.z < LADO_DE_LA_PLAZA / 2) malos.push(`${String(puesto.indice)}: su salida no llega a la calle del lado de la cámara`);
  }
  comprobar('los seis caminos salen de una boca de calle, acaban en su sitio y se andan entre 0,8 y 1,5 de ritmo', malos.length === 0, malos);
  comprobar('se ve fallar: un camino de sesenta unidades pide un ritmo imposible', ritmoDeLaEntrada(60) > RITMO.maximo, r2(ritmoDeLaEntrada(60)));
  comprobar('se ve fallar: un camino de tres unidades pide un ritmo de sonámbulo', ritmoDeLaEntrada(3) < RITMO.minimo, r2(ritmoDeLaEntrada(3)));
  /* Y el punto del camino se mueve con la distancia: ni se queda quieto ni se sale. */
  const puesto = puestos[2];
  if (puesto !== undefined) {
    const largo = largoDelCamino(puesto.entrada);
    const medio = puntoDelCamino(puesto.entrada, largo / 2);
    const fin = puntoDelCamino(puesto.entrada, largo * 2);
    comprobar('el punto del camino avanza y se queda en el final si se pasa', Math.hypot(fin.x - puesto.pie.x, fin.z - puesto.pie.z) < 1e-6 && Math.hypot(medio.x - puesto.pie.x, medio.z - puesto.pie.z) > 1, {
      medio: [r2(medio.x), r2(medio.z)],
      fin: [r2(fin.x), r2(fin.z)],
    });
  }
}

// ---------------------------------------------------------------------------
paso('El arco está abierto hacia la cámara: nadie detrás del monumento ni tapado por él');
// ---------------------------------------------------------------------------

/** ¿Corta el segmento a-b la caja del monumento? Prueba de losas, en dos dimensiones y en alto. */
function cortaElMonumento(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): boolean {
  const min = { x: MONUMENTO.x - MONUMENTO.radio, y: SUELO_DE_LA_PLAZA, z: MONUMENTO.z - MONUMENTO.radio };
  const max = { x: MONUMENTO.x + MONUMENTO.radio, y: SUELO_DE_LA_PLAZA + MONUMENTO.alto, z: MONUMENTO.z + MONUMENTO.radio };
  let t0 = 0;
  let t1 = 1;
  for (const eje of ['x', 'y', 'z'] as const) {
    const desde = a[eje];
    const hasta = b[eje];
    const d = hasta - desde;
    if (Math.abs(d) < 1e-9) {
      if (desde < min[eje] || desde > max[eje]) return false;
      continue;
    }
    let ta = (min[eje] - desde) / d;
    let tb = (max[eje] - desde) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

{
  const detras = puestos.filter((p) => p.pie.z < MONUMENTO.z + MONUMENTO.radio);
  comprobar('ningún puesto está detrás del monumento', detras.length === 0, detras.map((p) => p.indice));
  const dentro = puestos.filter((p) => Math.hypot(p.pie.x - MONUMENTO.x, p.pie.z - MONUMENTO.z) < MONUMENTO.radio + 2);
  comprobar('ningún puesto se planta encima del pedestal', dentro.length === 0, dentro.map((p) => p.indice));
  const local = puestos[0] as (typeof puestos)[number];
  comprobar('el puesto del local está en el eje', Math.abs(local.pie.x) <= 0.5, local.pie);
  comprobar(
    'y es el más cercano al ojo de referencia: delante de todos',
    puestos.every((p) => p.indice === 0 || Math.hypot(p.pie.x - OJO_DE_REFERENCIA.x, p.pie.z - OJO_DE_REFERENCIA.z) > Math.hypot(local.pie.x - OJO_DE_REFERENCIA.x, local.pie.z - OJO_DE_REFERENCIA.z)),
    puestos.map((p) => r2(Math.hypot(p.pie.x - OJO_DE_REFERENCIA.x, p.pie.z - OJO_DE_REFERENCIA.z))),
  );
  const izquierda = puestos.filter((p) => p.pie.x < -1).length;
  const derecha = puestos.filter((p) => p.pie.x > 1).length;
  comprobar('el arco se abre a los dos lados: al menos dos puestos por lado', izquierda >= 2 && derecha >= 2, { izquierda, derecha });

  /* Y desde la cámara de verdad, el monumento no tapa a nadie. */
  const tapados: string[] = [];
  for (const v of [
    { nombre: '9:19,5', aspecto: 9 / 19.5, franja: 0.36 },
    { nombre: '16:9', aspecto: 16 / 9, franja: 0 },
  ]) {
    for (let k = 0; k < puestos.length; k++) {
      const pose = poseDeReposo(k, v.aspecto, v.franja);
      for (const p of puestos.slice(0, k + 1)) {
        for (const alto of [0.2, 0.9, 1]) {
          const punto = { x: p.pie.x, y: SUELO_DE_LA_PLAZA + ALTO_DEL_AVENTURERO * alto, z: p.pie.z };
          if (cortaElMonumento(pose.posicion, punto)) tapados.push(`${v.nombre} k${String(k)}: el monumento tapa al ${String(p.indice)}`);
        }
      }
    }
  }
  comprobar('el monumento no se cruza en la línea de mirada de ningún aventurero', tapados.length === 0, tapados.slice(0, 4));
  comprobar(
    'se ve fallar: un puesto puesto detrás del monumento queda tapado por él',
    cortaElMonumento(poseDeReposo(5, 9 / 19.5, 0.36).posicion, { x: MONUMENTO.x, y: SUELO_DE_LA_PLAZA + 1.3, z: MONUMENTO.z - 6 }),
  );
}

// ---------------------------------------------------------------------------
paso('La cámara deja a los seis enteros, encima de la hoja y separados');
// ---------------------------------------------------------------------------

const VENTANAS = [
  { nombre: '9:19,5 con hoja 0,36', aspecto: 9 / 19.5, franja: 0.36 },
  { nombre: '3:4 con hoja 0,3', aspecto: 3 / 4, franja: 0.3 },
  { nombre: '16:9 sin hoja', aspecto: 16 / 9, franja: 0 },
];
/** Los instantes de respiración que se prueban: la órbita entera, no sólo sus extremos. */
const INSTANTES: number[] = [];
for (let i = 0; i <= 60; i++) INSTANTES.push((23 * i) / 60);
for (const t of [2.75, 5.5, 8.25, 10, 20, 30, 40, 46, 57.5, 80, 115]) INSTANTES.push(t);

interface Mirada {
  readonly fuera: string[];
  readonly separacionEnReposo: number;
  readonly separacionRespirando: number;
  readonly tapado: number;
}

function loQueSeVe(sitios: readonly { readonly x: number; readonly z: number }[], hasta: number): Mirada {
  const fuera: string[] = [];
  let separacionEnReposo = Infinity;
  let separacionRespirando = Infinity;
  let tapado = 0;
  for (const v of VENTANAS) {
    const base = poseDeReposo(hasta, v.aspecto, v.franja);
    const dentro = sitios.slice(0, hasta + 1);
    for (const [n, t] of [0, ...INSTANTES].entries()) {
      const pose = n === 0 ? base : conRespiracion(base, t);
      const cajas = dentro.map((p) => cajaEnPantalla(pose, v.aspecto, p, ALTO_DEL_AVENTURERO));
      const pies = dentro.map((p) => pieEnPantalla(pose, v.aspecto, p));
      cajas.forEach((caja, i) => {
        const sueloDeLaHoja = -1 + 2 * v.franja - (i === 0 ? 0.03 : 0);
        if (!caja.delante) fuera.push(`${v.nombre} k${String(hasta)}: el ${String(i)} está detrás de la cámara`);
        else if (caja.x0 < -BORDE_DEL_ENCUADRE || caja.x1 > BORDE_DEL_ENCUADRE) fuera.push(`${v.nombre} k${String(hasta)}: el ${String(i)} se sale por el lado (x ${r2(caja.x0)}…${r2(caja.x1)})`);
        else if (caja.y1 > BORDE_DEL_ENCUADRE) fuera.push(`${v.nombre} k${String(hasta)}: al ${String(i)} se le va la cabeza (y ${r2(caja.y1)})`);
        else if (caja.y0 < sueloDeLaHoja) fuera.push(`${v.nombre} k${String(hasta)}: el ${String(i)} se mete bajo la hoja (y ${r2(caja.y0)} < ${r2(sueloDeLaHoja)})`);
      });
      for (let i = 0; i < pies.length; i++) {
        for (let j = i + 1; j < pies.length; j++) {
          const d = Math.abs((pies[i] as number) - (pies[j] as number));
          if (n === 0) separacionEnReposo = Math.min(separacionEnReposo, d);
          else separacionRespirando = Math.min(separacionRespirando, d);
        }
      }
      for (let i = 0; i < cajas.length; i++) {
        for (let j = 0; j < cajas.length; j++) {
          if (i === j) continue;
          const pa = dentro[i] as { x: number; z: number };
          const pb = dentro[j] as { x: number; z: number };
          const da = Math.hypot(pa.x - pose.posicion.x, pa.z - pose.posicion.z);
          const db = Math.hypot(pb.x - pose.posicion.x, pb.z - pose.posicion.z);
          if (da >= db) continue;
          const A = cajas[i] as (typeof cajas)[number];
          const B = cajas[j] as (typeof cajas)[number];
          const ox = Math.max(0, Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0));
          const oy = Math.max(0, Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0));
          tapado = Math.max(tapado, (ox * oy) / ((B.x1 - B.x0) * (B.y1 - B.y0)));
        }
      }
    }
  }
  return { fuera, separacionEnReposo, separacionRespirando, tapado };
}

{
  const sitios = puestos.map((p) => p.pie);
  let peorReposo = Infinity;
  let peorRespirando = Infinity;
  let peorTapado = 0;
  for (let k = 0; k < puestos.length; k++) {
    const visto = loQueSeVe(sitios, k);
    comprobar(`con el puesto ${String(k)} ocupado (o sea ${String(k + 1)} sentados), los ${String(k + 1)} caben enteros y encima de la hoja en las tres ventanas`, visto.fuera.length === 0, visto.fuera.slice(0, 4));
    comprobar(`y en reposo ningún par baja del ${String(Math.round(SEPARACION_ENTRE_PUESTOS * 50))} % del ancho`, visto.separacionEnReposo >= SEPARACION_ENTRE_PUESTOS, r2(visto.separacionEnReposo));
    comprobar(`y con la cámara respirando, tampoco del ${String(Math.round(SEPARACION_RESPIRANDO * 50))} %`, visto.separacionRespirando >= SEPARACION_RESPIRANDO, r2(visto.separacionRespirando));
    peorReposo = Math.min(peorReposo, visto.separacionEnReposo);
    peorRespirando = Math.min(peorRespirando, visto.separacionRespirando);
    peorTapado = Math.max(peorTapado, visto.tapado);
  }
  comprobar('ningún aventurero tapa a otro más de un 5 % de su silueta', peorTapado <= 0.05, r2(peorTapado));
  console.log(`  separación: ${r2(peorReposo)} en reposo, ${r2(peorRespirando)} respirando; lo más tapado, el ${String(Math.round(peorTapado * 100))} %`);

  /* Las dos vacunas del encuadre: un puesto en el eje y otro fuera del cono. */
  const alEje = sitios.map((p, i) => (i === 5 ? { x: 0.2, z: p.z } : p));
  comprobar('se ve fallar: un puesto movido al eje se junta con el local por debajo del 6 %', loQueSeVe(alEje, 5).separacionEnReposo < SEPARACION_ENTRE_PUESTOS, r2(loQueSeVe(alEje, 5).separacionEnReposo));
  const aLaCalle = sitios.map((p, i) => (i === 4 ? { x: -40, z: p.z } : p));
  comprobar('se ve fallar: un puesto llevado a la calle se sale del encuadre', loQueSeVe(aLaCalle, 5).fuera.length > 0, loQueSeVe(aLaCalle, 5).fuera.slice(0, 1));
  const detras = sitios.map((p, i) => (i === 3 ? { x: (sitios[1] as { x: number }).x, z: (sitios[1] as { z: number }).z - 9 } : p));
  comprobar('se ve fallar: un puesto puesto justo detrás de otro queda tapado', loQueSeVe(detras, 5).tapado > 0.05, r2(loQueSeVe(detras, 5).tapado));
}

// ---------------------------------------------------------------------------
paso('La grúa del zarpe acaba mirando como el tablero, y el cielo con su color');
// ---------------------------------------------------------------------------

{
  const alto = POSE_AEREA.posicion.y - POSE_AEREA.objetivo.y;
  const fondo = Math.hypot(POSE_AEREA.posicion.x - POSE_AEREA.objetivo.x, POSE_AEREA.posicion.z - POSE_AEREA.objetivo.z);
  const altura = (Math.atan2(alto, fondo) * 180) / Math.PI;
  comprobar('la pose aérea mira desde unos 55°, como el mirador del tablero', altura > 50 && altura < 60, r2(altura));
  comprobar('y con el campo de la cámara del Burgo', POSE_AEREA.fov === 45, POSE_AEREA.fov);

  /** Un color del fuente de `Burgo.tsx`: `const NOMBRE = '#rrggbb';`. Si no está, devuelve vacío y esto se pone rojo. */
  function colorDelFuente(nombre: string): string {
    const texto = fs.existsSync(BURGO_TSX) ? fs.readFileSync(BURGO_TSX, 'utf8') : '';
    const encontrado = new RegExp(`const ${nombre}\\s*=\\s*'(#[0-9a-fA-F]{6})'`).exec(texto);
    return (encontrado?.[1] ?? '').toLowerCase();
  }
  const cenit = colorDelFuente('COLOR_DEL_CENIT');
  const horizonte = colorDelFuente('COLOR_DEL_HORIZONTE');
  const niebla = colorDelFuente('COLOR_DE_LA_NIEBLA');
  comprobar('Burgo.tsx declara los tres colores de su mediodía', cenit.length === 7 && horizonte.length === 7 && niebla.length === 7, { cenit, horizonte, niebla });
  comprobar('y el final del zarpe de la plaza es exactamente ese mediodía', MEDIODIA_DEL_TABLERO.cenit === cenit && MEDIODIA_DEL_TABLERO.horizonte === horizonte && MEDIODIA_DEL_TABLERO.niebla === niebla, {
    plaza: [MEDIODIA_DEL_TABLERO.cenit, MEDIODIA_DEL_TABLERO.horizonte, MEDIODIA_DEL_TABLERO.niebla],
    tablero: [cenit, horizonte, niebla],
  });
  comprobar('se ve fallar: la regex no encuentra un color que no existe', colorDelFuente('COLOR_QUE_NO_EXISTE') === '');
  comprobar('la tarde no es el mediodía: el horizonte es más cálido y el cénit más profundo', TARDE.horizonte !== MEDIODIA_DEL_TABLERO.horizonte && TARDE.cenit !== MEDIODIA_DEL_TABLERO.cenit);
  comprobar('y la mezcla empieza en la tarde y acaba en el mediodía', mezclaDeColores(TARDE.niebla, MEDIODIA_DEL_TABLERO.niebla, 0) === TARDE.niebla && mezclaDeColores(TARDE.niebla, MEDIODIA_DEL_TABLERO.niebla, 1) === MEDIODIA_DEL_TABLERO.niebla);
  comprobar('la luz de cara se apaga al llegar al tablero, que no la tiene', MEDIODIA_DEL_TABLERO.cara.intensidad === 0 && TARDE.cara.intensidad > 0);
}

// ---------------------------------------------------------------------------
paso('Los gestos nunca piden t-pose, y los clips existen en animaciones.glb');
// ---------------------------------------------------------------------------

const clipsDelFichero = new Set<string>();
{
  const io = new NodeIO();
  const doc = await io.read(path.join(AVENTUREROS, 'animaciones.glb'));
  for (const anim of doc.getRoot().listAnimations()) clipsDelFichero.add(anim.getName());
  comprobar('animaciones.glb trae clips', clipsDelFichero.size > 5, clipsDelFichero.size);
}

/** Recorre diez mil pasos sembrados y devuelve lo que salga mal. Se le puede dar otro juez de clips para envenenarlo. */
function problemasDeLosGestos(queClip: (e: EstadoDeAventurero, ahora: number, ritmo: number) => ClipDeLaPlaza): { readonly problemas: string[]; readonly fases: Set<Fase>; readonly pasos: number } {
  const SUCESOS: readonly Suceso[] = ['tic', 'tic', 'tic', 'tic', 'saluda', 'se-ausenta', 'vuelve', 'se-viste', 'zarpa'];
  const MODOS: readonly ModoDeNacer[] = ['aparecer', 'quieto', 'barco'];
  const problemas: string[] = [];
  const fases = new Set<Fase>();
  const azar = sorteo(0x51a2a7);
  let ahora = 0;
  let e: EstadoDeAventurero = nacer(1, ahora, 'barco', 0.3);
  let pasos = 0;
  for (let i = 0; i < 10_000; i++) {
    ahora += azar() * 0.6;
    const suceso = SUCESOS[Math.floor(azar() * SUCESOS.length)] ?? 'tic';
    e = siguiente(e, suceso, ahora);
    if (i % 1000 === 999) e = nacer(i, ahora, MODOS[Math.floor(i / 1000) % MODOS.length] ?? 'quieto', azar() * 0.9, azar() < 0.8);
    fases.add(e.fase);
    const clip = queClip(e, ahora, 1.2);
    pasos++;
    if (clip.clip === CLIP.tPose) problemas.push(`${String(i)}: t-pose en ${e.fase}`);
    if (!clipsDelFichero.has(clip.clip)) problemas.push(`${String(i)}: el clip ${clip.clip} no está en animaciones.glb`);
    if (!(clip.velocidad >= RITMO.minimo && clip.velocidad <= RITMO.maximo) && clip.velocidad !== 1) problemas.push(`${String(i)}: velocidad ${String(clip.velocidad)}`);
  }
  return { problemas, fases, pasos };
}

{
  const recorrido = problemasDeLosGestos(clipDeLaPlaza);
  comprobar('el recorrido de gestos da diez mil pasos', recorrido.pasos === 10_000, recorrido.pasos);
  comprobar('en diez mil pasos con sucesos al azar nunca sale t-pose ni un clip que no exista', recorrido.problemas.length === 0, recorrido.problemas.slice(0, 5));
  comprobar('y el recorrido pasa por todas las fases', ['naciendo', 'llegando', 'esperando', 'ausente', 'vistiendose', 'zarpando', 'zarpado'].every((f) => recorrido.fases.has(f as Fase)), [...recorrido.fases]);
  const envenenado = problemasDeLosGestos((e, ahora, ritmo) => (e.fase === 'ausente' ? { clip: CLIP.tPose, bucle: true, desde: 0, velocidad: 1 } : clipDeLaPlaza(e, ahora, ritmo)));
  comprobar('se ve fallar: un juez de clips que devuelva t-pose en una fase lo delata', envenenado.problemas.some((p) => p.includes('t-pose')));
  /* Al llegar se anda y al zarpar se corre: es lo que separa esta escena del Muelle. */
  const llegando = nacer(7, 0, 'barco', 0);
  comprobar('al llegar suena `andar` en bucle, con el ritmo de su camino', clipDeLaPlaza(llegando, 1, 1.2).clip === CLIP.andar && clipDeLaPlaza(llegando, 1, 1.2).bucle && clipDeLaPlaza(llegando, 1, 1.2).velocidad === 1.2);
  const zarpando = siguiente(nacer(3, 0, 'quieto', 0.3), 'zarpa', 5);
  comprobar('al zarpar se saluda y luego se corre, y nunca se salta', clipDeLaPlaza(zarpando, 5.4, 1).clip === CLIP.saludar && clipDeLaPlaza(zarpando, 7, 1).clip === CLIP.correr);
  const zarpado = siguiente(zarpando, 'tic', 5 + 3.3);
  comprobar('y en zarpado se sigue corriendo: lo que sale de cuadro no se para a mitad de zancada', zarpado.fase === 'zarpado' && clipDeLaPlaza(zarpado, 9, 1).clip === CLIP.correr);
}

// ---------------------------------------------------------------------------
paso('Los bultos propios se ven cerrados desde el aire (lupa cenital)');
// ---------------------------------------------------------------------------

{
  const RAYOS = 9;
  const MARGEN = 0.06;
  /** Qué le pasa a un rayo vertical que cae sobre la geometría: nada, techo, o techo del revés. */
  const loQueSeVeDesdeArriba = (geometria: THREE.BufferGeometry, x: number, z: number, caja: THREE.Box3): 'hueco' | 'techo' | 'del-reves' => {
    const pos = geometria.getAttribute('position') as THREE.BufferAttribute;
    const nor = geometria.getAttribute('normal') as THREE.BufferAttribute;
    let mejorY = Number.NEGATIVE_INFINITY;
    let mejorNy = 0;
    const px = caja.min.x + (caja.max.x - caja.min.x) * x;
    const pz = caja.min.z + (caja.max.z - caja.min.z) * z;
    for (let t = 0; t * 3 + 2 < pos.count; t++) {
      const a = t * 3;
      const ny = nor.getY(a);
      if (Math.abs(ny) < 1e-6) continue;
      const ax = pos.getX(a);
      const az = pos.getZ(a);
      const bx = pos.getX(a + 1) - ax;
      const bz = pos.getZ(a + 1) - az;
      const cx = pos.getX(a + 2) - ax;
      const cz = pos.getZ(a + 2) - az;
      const det = bx * cz - bz * cx;
      if (Math.abs(det) < 1e-12) continue;
      const u = ((px - ax) * cz - (pz - az) * cx) / det;
      const v = ((pz - az) * bx - (px - ax) * bz) / det;
      if (u < 0 || v < 0 || u + v > 1) continue;
      const y = pos.getY(a) + u * (pos.getY(a + 1) - pos.getY(a)) + v * (pos.getY(a + 2) - pos.getY(a));
      if (y <= mejorY) continue;
      mejorY = y;
      mejorNy = ny;
    }
    if (mejorY === Number.NEGATIVE_INFINITY) return 'hueco';
    return mejorNy > 0 ? 'techo' : 'del-reves';
  };
  const lupa = (geometria: THREE.BufferGeometry): string[] => {
    const caja = new THREE.Box3().setFromBufferAttribute(geometria.getAttribute('position') as THREE.BufferAttribute);
    const malos: string[] = [];
    for (let a = 0; a < RAYOS; a++) {
      for (let b = 0; b < RAYOS; b++) {
        const x = MARGEN + ((1 - 2 * MARGEN) * a) / (RAYOS - 1);
        const z = MARGEN + ((1 - 2 * MARGEN) * b) / (RAYOS - 1);
        const que = loQueSeVeDesdeArriba(geometria, x, z, caja);
        if (que !== 'techo') malos.push(`(${r2(x)}, ${r2(z)}): ${que}`);
      }
    }
    return malos;
  };

  let mirados = 0;
  const destapados: string[] = [];
  for (const bulto of plaza.bultos) {
    mirados++;
    const geometria = geometriaDeUnBultoDeLaPlaza(bulto);
    const malos = lupa(geometria);
    if (malos.length > 0) destapados.push(`${bulto.clase}: ${String(malos.length)} de ${String(RAYOS * RAYOS)} rayos — ${malos[0] as string}`);
    geometria.dispose();
  }
  comprobar('hay bultos propios que mirar', mirados >= 3, mirados);
  comprobar(`a los ${String(mirados)} bultos de la plaza no se les ve el interior desde el aire`, destapados.length === 0, destapados.slice(0, 3));

  /* Las dos vacunas de la lupa: el volumen sin tapa y la tapa del revés. */
  const sinLaTapa = (): THREE.BufferGeometry => {
    const g = geometriaDeUnBulto(10, false).clone();
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const nor = g.getAttribute('normal') as THREE.BufferAttribute;
    const enferma = new THREE.BufferGeometry();
    enferma.setAttribute('position', new THREE.BufferAttribute((pos.array as Float32Array).slice(0, (pos.count - 6) * 3), 3));
    enferma.setAttribute('normal', new THREE.BufferAttribute((nor.array as Float32Array).slice(0, (nor.count - 6) * 3), 3));
    return enferma;
  };
  const delReves = (): THREE.BufferGeometry => {
    const g = geometriaDeUnBulto(16, false).clone();
    const nor = g.getAttribute('normal') as THREE.BufferAttribute;
    const vueltas = (nor.array as Float32Array).slice();
    for (let i = 0; i < vueltas.length; i++) vueltas[i] = -(vueltas[i] as number);
    g.setAttribute('normal', new THREE.BufferAttribute(vueltas, 3));
    return g;
  };
  comprobar('se ve fallar: a una caja sin tapa la lupa le ve el hueco', lupa(sinLaTapa()).some((m) => m.endsWith('hueco')));
  comprobar('se ve fallar: con las caras horizontales del revés, la lupa ve el techo que three tiraría', lupa(delReves()).some((m) => m.endsWith('del-reves')));
}

// ---------------------------------------------------------------------------
paso('Los giros del pack son los de la ciudad, y las huellas declaradas cubren el fichero');
// ---------------------------------------------------------------------------

{
  const malos: string[] = [];
  for (const rumbo of [0, 1, 2, 3] as Rumbo[]) {
    const mio = giroMirandoHacia(radianesDeCuartos((1 - rumbo + 4) % 4));
    const suyo = giroMirandoA(rumbo);
    if (Math.abs(Math.sin(mio - suyo)) > 1e-9) malos.push(`mirar al rumbo ${String(rumbo)}: ${r2(mio)} contra ${r2(suyo)}`);
    const brazoMio = giroDelBrazoHacia(radianesDeCuartos((1 - rumbo + 4) % 4));
    const brazoSuyo = radianesDeCuartos(cuartosDelBrazoHacia(rumbo));
    if (Math.abs(Math.sin(brazoMio - brazoSuyo)) > 1e-9) malos.push(`brazo al rumbo ${String(rumbo)}: ${r2(brazoMio)} contra ${r2(brazoSuyo)}`);
  }
  comprobar('mirar y tender el brazo dan lo mismo que en la ciudad, en los cuatro rumbos rectos', malos.length === 0, malos);

  const huellasMalas: string[] = [];
  let medidas = 0;
  for (const [pieza, radio] of Object.entries(HUELLA)) {
    const caja = cajaPorPieza.get(pieza);
    if (caja === undefined) {
      huellasMalas.push(`${pieza}: no está en burgo.glb`);
      continue;
    }
    medidas++;
    const real = Math.max(Math.abs(caja.min.x), Math.abs(caja.max.x), Math.abs(caja.min.z), Math.abs(caja.max.z));
    if (real > radio + 1e-6) huellasMalas.push(`${pieza}: declarada ${String(radio)}, medida ${r2(real)}`);
  }
  comprobar('hay huellas declaradas que contrastar', medidas >= 15, medidas);
  comprobar(`las ${String(medidas)} huellas declaradas cubren la caja del fichero`, huellasMalas.length === 0, huellasMalas.slice(0, 5));
  comprobar('se ve fallar: una huella de cero no cubriría ninguna pieza', (cajaPorPieza.get(PIEZA.pinoGrande)?.max.x ?? 0) > 0);
}

// ---------------------------------------------------------------------------
paso('Una plaza llena con seis aventureros cabe en el presupuesto');
// ---------------------------------------------------------------------------

{
  let peor: { codigo: string; total: number; renglones: readonly { que: string; cuantos: number; triangulos: number }[]; fundidos: number } | null = null;
  for (const [i, laPlaza] of plazas.entries()) {
    const mundo = construirElMundoDeLaPlaza(laPlaza, catalogo);
    comprobar(`la plaza del código ${String(CODIGOS[i])} se funde con todas sus piezas en el catálogo`, mundo.desconocidas.length === 0, mundo.desconocidas);
    const suma = renglonesDeLaPlaza(laPlaza, piezasQueSePintan(laPlaza), (p) => triangulosPorPieza.get(p), triangulosDelPeorAventurero, 6);
    if (peor === null || suma.total > peor.total) peor = { codigo: String(CODIGOS[i]), total: suma.total, renglones: suma.renglones, fundidos: mundo.triangulosFundidos };
    mundo.soltar();
  }
  const laPeor = peor as NonNullable<typeof peor>;
  console.log(`  La plaza más pesada es la del código ${laPeor.codigo}: ${Math.round(laPeor.total).toLocaleString('es-ES')} triángulos con seis ${elPeorAventurero} (${String(triangulosDelPeorAventurero)} cada uno)`);
  for (const r of [...laPeor.renglones].sort((a, b) => b.triangulos - a.triangulos).slice(0, 10)) {
    console.log(`    ${r.que.padEnd(34)} × ${String(r.cuantos).padStart(3)} = ${Math.round(r.triangulos).toLocaleString('es-ES').padStart(7)}`);
  }
  console.log(`  De ellos, ${Math.round(laPeor.fundidos).toLocaleString('es-ES')} van en UNA sola malla fundida.`);
  comprobar(`una plaza llena con seis de la figura más pesada baja de ${TOPE_DE_TRIANGULOS.toLocaleString('es-ES')} triángulos`, laPeor.total > 0 && laPeor.total < TOPE_DE_TRIANGULOS, Math.round(laPeor.total));
  comprobar('y lo fundido es de verdad lo que dice la suma de las piezas y los bultos', laPeor.fundidos > 20_000 && laPeor.fundidos < laPeor.total, Math.round(laPeor.fundidos));

  const llamadas = llamadasDeLaPlaza('plena', 6);
  comprobar(`con seis sentados se prometen ${String(llamadas.total)} llamadas de dibujo, por debajo de ${String(TOPE_DE_LLAMADAS)}`, llamadas.total <= TOPE_DE_LLAMADAS, llamadas.renglones);
  comprobar('en sobria no son más que en plena', llamadasDeLaPlaza('sobria', 6).total <= llamadas.total);

  /* La vacuna del presupuesto: seis figuras de veinte mil triángulos no caben. */
  const conUnaGorda = renglonesDeLaPlaza(plaza, piezasQueSePintan(plaza), (p) => triangulosPorPieza.get(p), 20_000, 6);
  comprobar('se ve fallar: con seis figuras de veinte mil triángulos el presupuesto revienta', conUnaGorda.total > TOPE_DE_TRIANGULOS, Math.round(conUnaGorda.total));
  /* Y la de las desconocidas: una pieza que el fichero no trae se dice, no se suma como cero. */
  const conDesconocida = renglonesDeLaPlaza(plaza, [...piezasQueSePintan(plaza), { pieza: 'ballesta' }], (p) => triangulosPorPieza.get(p), triangulosDelPeorAventurero, 6);
  comprobar('se ve fallar: una pieza que el fichero no trae sale como desconocida', conDesconocida.desconocidas.includes('ballesta'));

  /* La sobria pesa menos que la plena: si no, el interruptor no hace nada. */
  const enPlena = renglonesDeLaPlaza(componerLaPlaza(semillaDeLaPlaza('ABCDE'), 'plena'), piezasQueSePintan(componerLaPlaza(semillaDeLaPlaza('ABCDE'), 'plena')), (p) => triangulosPorPieza.get(p), triangulosDelPeorAventurero, 6);
  const sobria = componerLaPlaza(semillaDeLaPlaza('ABCDE'), 'sobria');
  const enSobria = renglonesDeLaPlaza(sobria, piezasQueSePintan(sobria), (p) => triangulosPorPieza.get(p), triangulosDelPeorAventurero, 6);
  comprobar('la calidad sobria quita atrezo de verdad: pesa menos que la plena', enSobria.total < enPlena.total, { plena: Math.round(enPlena.total), sobria: Math.round(enSobria.total) });
  comprobar('y no cambia el sorteo: las dos plazas tienen los mismos puestos y el mismo monumento', JSON.stringify(sobria.puestos) === JSON.stringify(componerLaPlaza(semillaDeLaPlaza('ABCDE'), 'plena').puestos));
}

// ---------------------------------------------------------------------------
paso('La calle rodea la plaza con sus cebras y sus esquinas curvas');
// ---------------------------------------------------------------------------

{
  const calle = plaza.piezas.filter((p) => p.pieza.startsWith('calzada'));
  const anillo = 4 * (CELDAS_POR_LADO - 1);
  comprobar(`el anillo son ${String(anillo)} losas de calle`, calle.length === anillo, calle.length);
  comprobar('con cuatro esquinas curvas suaves', calle.filter((p) => p.pieza === PIEZA.calzadaCurvaSuave).length === 4, calle.filter((p) => p.pieza === PIEZA.calzadaCurvaSuave).length);
  comprobar('y un paso de cebra en el centro de cada lado', calle.filter((p) => p.pieza === PIEZA.calzadaPaso).length === 4);
  const soleras = plaza.piezas.filter((p) => p.pieza === PIEZA.solera);
  comprobar('la plaza tiene sus veinticinco soleras más las de las fachadas', soleras.length >= 25 + 19, soleras.length);
  const fachadas = plaza.piezas.filter((p) => p.pieza.startsWith('cuerpo'));
  comprobar('hay fachadas cerrando la plaza, y todas con su matiz propio', fachadas.length >= 15 && fachadas.every((f) => f.matiz !== undefined), { cuantas: fachadas.length, sinMatiz: fachadas.filter((f) => f.matiz === undefined).length });
  const matices = new Set(fachadas.map((f) => f.matiz));
  comprobar('y no todas del mismo matiz: dos casas del mismo modelo no salen idénticas', matices.size > 1, matices.size);
  const monumento = plaza.piezas.filter((p) => p.pieza === PIEZA.figura);
  comprobar('el monumento es una figura teñida de bronce encima del pedestal', monumento.length === 1 && monumento[0]?.tenir === MONUMENTO.color && (monumento[0]?.talla ?? 0) > 1.5);
  const terrazas = plaza.piezas.filter((p) => p.pieza === PIEZA.mesaRedonda);
  comprobar('hay dos o tres terrazas con sus sillas', terrazas.length >= 2 && terrazas.length <= 3 && plaza.piezas.filter((p) => p.pieza === PIEZA.silla).length >= terrazas.length * 3, { terrazas: terrazas.length, sillas: plaza.piezas.filter((p) => p.pieza === PIEZA.silla).length });
  const coches = plaza.piezas.filter((p) => p.pieza.startsWith('coche'));
  comprobar('y de dos a cuatro coches aparcados en el anillo', coches.length >= 2 && coches.length <= 4, coches.length);
  const arboles = plaza.piezas.filter((p) => p.pieza.startsWith('pino') || p.pieza === PIEZA.arbusto);
  comprobar('con arbolado alrededor', arboles.length >= 5, arboles.length);
  /* Los seis puestos tienen su banco y su farola, y los seis estandartes los pone la escena aparte. */
  comprobar('cada puesto tiene su banco y su farola', plaza.piezas.filter((p) => p.pieza === PIEZA.bancoDeCalle).length === 6 && plaza.piezas.filter((p) => p.pieza === PIEZA.farolaDeCalle).length >= 6);
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log('');
}

/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS». Un guion que se cae a la mitad termina con
 * código cero y una lista corta de aciertos, y eso se lee como verde. El número va a mano
 * y hay que subirlo al añadir comprobaciones.
 */
const COMPROBACIONES_ESCRITAS = 98;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(
    `Solo se han hecho ${String(hechas)} de las ${String(COMPROBACIONES_ESCRITAS)} comprobaciones que ` +
      'tiene escritas este guion: se ha caído por el camino sin decirlo. ' +
      'Si has añadido comprobaciones nuevas, sube el número.',
  );
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(`${String(hechas)} comprobaciones`);
  console.log(
    '\nLa plaza sale igual para la misma semilla y distinta para otro código; todas sus piezas existen,\n' +
      'caben y apoyan en su suelo; nada pisa un puesto ni un pasillo; los seis caben enteros, encima de la\n' +
      'hoja y separados en las tres ventanas y los seis aforos, sin que nadie tape a nadie ni el monumento\n' +
      'se cruce; los gestos nunca piden t-pose y al llegar se anda y al zarpar se corre; los bultos se ven\n' +
      'cerrados desde el aire; el cielo del zarpe acaba en el mediodía del tablero; y una plaza llena con\n' +
      'seis de la figura más pesada cabe en el presupuesto. Lo que esto NO prueba es que se vea bien ni\n' +
      'cuántas llamadas salen de verdad: eso es del banco (escritorio/plaza3d.html).',
  );
  process.exit(0);
}

process.exit(1);
