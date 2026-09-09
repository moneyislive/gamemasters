/**
 * ¿CABE EL BURGO EN SU ANILLO, ANDA EL AVENTURERO POR DONDE DEBE, Y SE VE ENTERO?
 *
 * ═══ QUÉ COMPRA ESTE GUION ═══
 *
 * `escenas/burgo/` tiene siete ficheros sin `three` que son toda la aritmética de la
 * escena: dónde cae cada pieza (`anillo-en-3d.ts`), cuánto pesa un tablero lleno
 * (`presupuesto.ts`), cuánto dura cada suceso y en qué orden suena (`coreografia.ts`), la
 * máquina del aventurero (`peon.ts`), la de los dados (`dados-del-burgo.ts`) y la cámara
 * (`camara-del-burgo.ts`). Ninguna de esas cosas da error si está mal: un edificio
 * metido en la calle, un peón en T-pose, una vuelta al anillo de veinte segundos o una
 * esquina fuera del lienzo se VEN. Esto lo mide en Node, con las cajas y los triángulos
 * del `burgo.glb` REAL (abierto con `@gltf-transform`, como `verificar-burgo-modelos.ts`),
 * y con la proyección a mano de `embarcadero/camara.ts`.
 *
 * ═══ LAS VACUNAS ═══
 *
 * Cada juez se ve caer con un caso envenenado: un fuente con `drei`, una tienda sin girar
 * (8,29 de frente), una torre metida en la calle, una tabla con la taberna como posada,
 * un alcance de cámara corto. Un comprobador que no se ha visto caer no vigila nada.
 *
 * ═══ LO QUE NO PRUEBA ═══
 *
 * Que se VEA bien: ni el color, ni el tinte, ni si el móvil aguanta. Para eso está el
 * banco `banco-burgo.html` y hacen falta ojos.
 */
import { NodeIO } from '@gltf-transform/core';
import type { Node } from '@gltf-transform/core';
import fs from 'node:fs';
import path from 'node:path';
import { CLIP } from '../embarcadero/figuras';
import { DURACION } from '../embarcadero/gestos';
import { proyecta } from '../embarcadero/camara';
import { sorteo } from '../embarcadero/cala';
import { PIEZA, nombresDelBurgo } from '../burgo/piezas';
import {
  ACERA,
  ALERO_SOBRE_LA_CALLE,
  ANILLO_DEL_BURGO,
  BANDA,
  CALLE,
  CASILLAS,
  CELDA,
  DESBORDE_HACIA_FUERA,
  EDIFICIO_DE_LA_CASILLA,
  ESQUINAS,
  FONDO_DE_CASILLA,
  FONDO_MAXIMO_DEL_SOLAR,
  FONDO_MAXIMO_EN_EL_AGUA,
  FRENTE_MAXIMO_DEL_SOLAR,
  HOLGURA_DE_LA_MARCHA,
  HUECOS_DE_LOS_DADOS,
  LADO_EXTERIOR,
  LADO_INTERIOR,
  LARGO_DE_LA_MURALLA,
  LINEA_MEDIA_DE_LA_CALLE,
  MAZMORRA,
  MEDIO_LADO,
  MEDIO_LADO_DE_LA_MURALLA,
  POLILINEA,
  PUERTAS,
  RIBERA,
  SOLAR,
  SUELO_DE_DADOS,
  TESELAS_DEL_CAMPO,
  campo,
  enElMarco,
  enLaEsquina,
  giraElPunto,
  giroHaciaFuera,
  huecoDeAventurero,
  huecoDeBandera,
  huecoDeCasa,
  huecoDePeon,
  huecoDePosada,
  huecoDePreso,
  huecoDeVisita,
  largoDelTramo,
  marcoDeCasilla,
  mundoEstatico,
  puestaDeLaPiezaDelSolar,
  puestasDeLaMuralla,
  puestasDeLaPlaza,
  puestasDeLaRonda,
  puestasDeLasEsquinas,
  puestasDeLosSolares,
  puertasDeLaMuralla,
  sitioDeCasilla,
} from '../burgo/anillo-en-3d';
import type { PiezaDelSolar, Puesta, Punto } from '../burgo/anillo-en-3d';
import { MULTIPLICIDADES_PLENA, MULTIPLICIDADES_SOBRIA, TOPE_PLENA, TOPE_SOBRIA, sumaDelPresupuesto } from '../burgo/presupuesto';
import {
  CASILLAS_ANDANDO,
  TOPE_DEL_RECORRIDO,
  TOPE_DE_VELOCIDAD,
  TOPE_POR_CASILLA_ANDANDO,
  avanzar,
  clipQueToca,
  despedir,
  duracionDelRecorrido,
  encolar,
  largoDelRecorrido,
  nacer,
  posicionDelPeon,
  posicionYRumbo,
  saltarLaCola,
  terminada as peonTerminado,
  velocidadDelClip,
} from '../burgo/peon';
import type { EstadoDelPeon, FaseDelPeon } from '../burgo/peon';
import { avanzarLaCola, colaVacia, enCurso, encolar as encolarSucesos, finDeLaCola, saltar, terminada as colaTerminada } from '../burgo/coreografia';
import { dadosDelBurgoEnReposo, faseDeLosDadosConPar, parDeLaVista, saltoDelDoble } from '../burgo/dados-del-burgo';
import {
  ALCANCE_DEL_BURGO,
  LIMITES_DEL_BURGO,
  MIRADOR_DEL_BURGO,
  poseDeSalida,
  poseDelBurgo,
  seguir,
} from '../burgo/camara-del-burgo';
import type { SucesoDelBurgo } from '../../shared/arcade/juegos/burgo';

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

const r = (x: number): number => Number(x.toFixed(2));
const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..');
const FICHERO = path.join(RAIZ, 'modelos', 'burgo.glb');
const ANIMACIONES = path.join(RAIZ, 'modelos', 'aventureros', 'animaciones.glb');
const EXPLORADORA = path.join(RAIZ, 'modelos', 'aventureros', 'exploradora.glb');
const CARPETA = path.join(RAIZ, 'burgo');

// ---------------------------------------------------------------------------
paso('Ningún fichero de escenas/burgo trae drei, DOM, Expo ni fetch; los puros no traen three');
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
];

function loProhibidoEn(fuente: string): string[] {
  const codigo = sinComentarios(fuente);
  return PROHIBIDO.filter((p) => p.regex.test(codigo)).map((p) => p.que);
}

const FICHEROS = fs
  .readdirSync(CARPETA)
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => path.join(CARPETA, f));
const PUROS = ['tipos.ts', 'anillo-en-3d.ts', 'presupuesto.ts', 'coreografia.ts', 'peon.ts', 'dados-del-burgo.ts', 'camara-del-burgo.ts', 'piezas.ts'];

{
  const conAlgo = FICHEROS.flatMap((f) => loProhibidoEn(fs.readFileSync(f, 'utf8')).map((q) => `${path.basename(f)}: ${q}`));
  comprobar(`ninguno de los ${FICHEROS.length} ficheros de escenas/burgo trae drei, document, window, fetch ni expo`, conAlgo.length === 0, conAlgo);
  const envenenado = `import { Html } from '@react-three/drei';\nconst w = window.innerWidth;\nfetch('/x');\nimport { Asset } from 'expo-asset';\nconst d = document.body;`;
  comprobar('se ve fallar: un fuente con drei, window, fetch, expo y document enciende los cinco', loProhibidoEn(envenenado).length === 5, loProhibidoEn(envenenado));
  comprobar('y el barrido no se traga los comentarios: un `// window` no cuenta', loProhibidoEn('// window y document\n/* fetch( */\nconst a = 1;').length === 0);
  const conThree = PUROS.filter((f) => fs.existsSync(path.join(CARPETA, f)) && /from\s+['"]three['"]|from\s+['"]three\//.test(sinComentarios(fs.readFileSync(path.join(CARPETA, f), 'utf8'))));
  comprobar('los siete ficheros de aritmética (y piezas.ts) no importan three', conThree.length === 0, conThree);
  const faltan = PUROS.filter((f) => !fs.existsSync(path.join(CARPETA, f)));
  comprobar('y los ocho existen', faltan.length === 0, faltan);
}

// ---------------------------------------------------------------------------
paso('El .glb real: triángulos y cajas por pieza');
// ---------------------------------------------------------------------------

comprobar('burgo.glb está compilado', fs.existsSync(FICHERO));
if (!fs.existsSync(FICHERO)) {
  console.log(`\nNo está ${path.relative(RAIZ, FICHERO)}: se rehace con \`npm run compilar:burgo -w escenas\`.`);
  process.exit(1);
}

type Caja = { readonly min: readonly [number, number, number]; readonly max: readonly [number, number, number] };

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

const io = new NodeIO();
const doc = await io.read(FICHERO);
const raices = doc.getRoot().listScenes().flatMap((e) => e.listChildren());
const triangulos = new Map<string, number>();
const cajas = new Map<string, Caja>();
for (const raiz of raices) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let tri = 0;
  const anda = (n: Node): void => {
    const malla = n.getMesh();
    if (malla !== null) {
      for (const prim of malla.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        if (pos === null) continue;
        tri += (prim.getIndices()?.getCount() ?? pos.getCount()) / 3;
        const m = n.getWorldMatrix();
        const v = [0, 0, 0];
        for (let i = 0; i < pos.getCount(); i++) {
          const w = porLaMatriz(m, pos.getElement(i, v));
          for (let c = 0; c < 3; c++) {
            min[c] = Math.min(min[c] as number, w[c] as number);
            max[c] = Math.max(max[c] as number, w[c] as number);
          }
        }
      }
    }
    for (const h of n.listChildren()) anda(h);
  };
  anda(raiz);
  triangulos.set(raiz.getName(), Math.round(tri));
  cajas.set(raiz.getName(), { min: min as unknown as [number, number, number], max: max as unknown as [number, number, number] });
}
comprobar('el fichero trae las 73 piezas de piezas.ts con geometría', raices.length === nombresDelBurgo().length && [...triangulos.values()].every((t) => t > 0), raices.length);

const caja = (pieza: string): Caja => {
  const c = cajas.get(pieza);
  if (c === undefined) throw new Error(`No hay caja para «${pieza}»`);
  return c;
};
const huella = (pieza: string): { readonly ancho: number; readonly fondo: number; readonly alto: number } => {
  const c = caja(pieza);
  return { ancho: c.max[0] - c.min[0], fondo: c.max[2] - c.min[2], alto: c.max[1] - c.min[1] };
};

/** Las cuatro esquinas de la huella de una puesta, en el mundo. */
function esquinasDeLaPuesta(p: Puesta): Punto[] {
  const c = caja(p.pieza);
  const locales: Punto[] = [
    { x: c.min[0], z: c.min[2] },
    { x: c.max[0], z: c.min[2] },
    { x: c.min[0], z: c.max[2] },
    { x: c.max[0], z: c.max[2] },
  ];
  return locales.map((l) => {
    const g = giraElPunto(l.x * p.talla, l.z * p.talla, p.giro);
    return { x: p.x + g.x, z: p.z + g.z };
  });
}

// ---------------------------------------------------------------------------
paso('El anillo mide lo que dice el diseño y la marcha va por donde debe');
// ---------------------------------------------------------------------------

comprobar('LADO_EXTERIOR 100, MEDIO_LADO 50, LADO_INTERIOR 72, 40 casillas, y las tres bandas suman el fondo', LADO_EXTERIOR === 100 && MEDIO_LADO === 50 && LADO_INTERIOR === 72 && CASILLAS === 40 && BANDA.acera + BANDA.calle + BANDA.solar === FONDO_DE_CASILLA, {
  LADO_EXTERIOR,
  MEDIO_LADO,
  LADO_INTERIOR,
  CASILLAS,
});
comprobar('la línea media de la calle está a 43,25 del centro; la acera va de 36 a 41,5 y el solar de 45 a 50', LINEA_MEDIA_DE_LA_CALLE === 43.25 && ACERA.desde === 36 && ACERA.hasta === 41.5 && SOLAR.desde === 45 && SOLAR.hasta === 50);
comprobar('la polilínea tiene 40 puntos', POLILINEA.length === 40, POLILINEA.length);

{
  const esquina = (i: number, x: number, z: number): boolean => Math.abs((POLILINEA[i] as Punto).x - x) < 1e-9 && Math.abs((POLILINEA[i] as Punto).z - z) < 1e-9;
  comprobar(
    'las esquinas son (±43,25, ±43,25): la Puerta Mayor al sureste, la Mazmorra al suroeste, la Feria al noroeste y ¡A la Mazmorra! al noreste',
    esquina(0, 43.25, 43.25) && esquina(10, -43.25, 43.25) && esquina(20, -43.25, -43.25) && esquina(30, 43.25, -43.25),
    [0, 10, 20, 30].map((i) => POLILINEA[i]),
  );
  const mal: string[] = [];
  for (let k = 1; k <= 9; k++) {
    const sur = sitioDeCasilla(k);
    const oeste = sitioDeCasilla(10 + k);
    const norte = sitioDeCasilla(20 + k);
    const este = sitioDeCasilla(30 + k);
    const ok = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
    if (!ok(sur.x, 36 - 8 * k + 4) || !ok(sur.z, 43.25)) mal.push(`${k}: ${JSON.stringify(sur)}`);
    if (!ok(oeste.x, -43.25) || !ok(oeste.z, 36 - 8 * k + 4)) mal.push(`${10 + k}: ${JSON.stringify(oeste)}`);
    if (!ok(norte.x, -36 + 8 * k - 4) || !ok(norte.z, -43.25)) mal.push(`${20 + k}: ${JSON.stringify(norte)}`);
    if (!ok(este.x, 43.25) || !ok(este.z, -36 + 8 * k - 4)) mal.push(`${30 + k}: ${JSON.stringify(este)}`);
  }
  comprobar('las 36 casillas laterales caen donde dicen las cuatro fórmulas del §5.1: sur hacia el oeste, oeste hacia el norte, norte hacia el este, este hacia el sur', mal.length === 0, mal.slice(0, 4));
  const tramos = Array.from({ length: 40 }, (_, i) => r(largoDelTramo(i)));
  const esperado = tramos.every((t, i) => (i % 10 === 0 || i % 10 === 9 ? t === 11.25 : t === 8));
  comprobar('un tramo entre laterales mide 8 y el que llega a una esquina o sale de ella 11,25', esperado, tramos);
  const cuartos = [0, 1, 2, 3].map((l) => sitioDeCasilla(l * 10 + 5).cuartos);
  const haciaFuera = [0, 1, 2, 3].every((l) => {
    const m = marcoDeCasilla(l * 10 + 5);
    const g = giraElPunto(0, 1, giroHaciaFuera(m));
    return Math.abs(g.x - m.fuera.x) < 1e-9 && Math.abs(g.z - m.fuera.z) < 1e-9;
  });
  comprobar('los cuartos por lado son 0, 3, 2, 1 y girarlos lleva +Z a «fuera» en los cuatro lados', JSON.stringify(cuartos) === '[0,3,2,1]' && haciaFuera, cuartos);
}

// ---------------------------------------------------------------------------
paso('Cada rejilla de huecos cabe en su banda con la huella medida');
// ---------------------------------------------------------------------------

{
  const peon = huella(PIEZA.peon);
  const casa = huella(PIEZA.casa);
  const medioPeon = Math.max(peon.ancho, peon.fondo) / 2;
  const mediaCasa = Math.max(casa.ancho, casa.fondo) / 2;
  const fueraDeLaCalle: string[] = [];
  const solapados: string[] = [];
  const aventureroFuera: string[] = [];
  for (let i = 0; i < CASILLAS; i++) {
    if (i === MAZMORRA) continue;
    const m = marcoDeCasilla(i);
    const huecos = [0, 1, 2, 3, 4, 5].map((a) => huecoDePeon(i, a));
    for (const [a, h] of huecos.entries()) {
      const { radial, aLoLargo } = m.esEsquina ? { radial: enLaEsquina(m, h).u, aLoLargo: enLaEsquina(m, h).v - LINEA_MEDIA_DE_LA_CALLE } : enElMarco(m, h);
      if (radial - medioPeon < CALLE.desde || radial + medioPeon > CALLE.hasta) fueraDeLaCalle.push(`${i}/${a}: radial ${r(radial)}`);
      if (!m.esEsquina && Math.abs(aLoLargo) + medioPeon > 4) fueraDeLaCalle.push(`${i}/${a}: a lo largo ${r(aLoLargo)}`);
      if (m.esEsquina && (aLoLargo + medioPeon > 0 || aLoLargo + LINEA_MEDIA_DE_LA_CALLE - medioPeon < ACERA.desde)) fueraDeLaCalle.push(`${i}/${a}: en la ele`);
      for (const [b, o] of huecos.entries()) {
        if (b <= a) continue;
        if (Math.hypot(h.x - o.x, h.z - o.z) < 2 * medioPeon) solapados.push(`${i}: ${a} y ${b}`);
      }
      const av = huecoDeAventurero(i, a);
      const rav = m.esEsquina ? enLaEsquina(m, av).u : enElMarco(m, av).radial;
      if (rav - medioPeon < CALLE.desde || rav > SOLAR.desde + 1) aventureroFuera.push(`${i}/${a}: radial ${r(rav)}`);
    }
  }
  comprobar(`los seis huecos de peón (huella ${r(peon.ancho)} × ${r(peon.fondo)}) caben en la calle de las 39 casillas que la tienen, y en las esquinas sobre el tramo de salida`, fueraDeLaCalle.length === 0, fueraDeLaCalle.slice(0, 5));
  comprobar('y no se pisan entre sí', solapados.length === 0, solapados.slice(0, 5));
  comprobar('el hueco del aventurero está 1,2 hacia el solar, sin salirse de la calle por dentro ni pasar del borde del solar', aventureroFuera.length === 0, aventureroFuera.slice(0, 5));

  const casasFuera: string[] = [];
  const casasSolapadas: string[] = [];
  const banderasMal: string[] = [];
  const posadasMal: string[] = [];
  for (let i = 0; i < CASILLAS; i++) {
    if (ESQUINAS.includes(i)) continue;
    const m = marcoDeCasilla(i);
    const huecos = [0, 1, 2, 3].map((k) => huecoDeCasa(i, k));
    for (const [k, h] of huecos.entries()) {
      const { radial, aLoLargo } = enElMarco(m, h);
      if (radial - mediaCasa < ACERA.desde || radial + mediaCasa > ACERA.hasta || Math.abs(aLoLargo) + mediaCasa > 4) casasFuera.push(`${i}/${k}: radial ${r(radial)}, a lo largo ${r(aLoLargo)}`);
      for (const [b, o] of huecos.entries()) {
        if (b <= k) continue;
        if (Math.hypot(h.x - o.x, h.z - o.z) < 2 * mediaCasa) casasSolapadas.push(`${i}: ${k} y ${b}`);
      }
    }
    const posada = enElMarco(m, huecoDePosada(i));
    if (posada.radial - mediaCasa < ACERA.desde || posada.radial + mediaCasa > ACERA.hasta || Math.abs(posada.aLoLargo) > 1e-9) posadasMal.push(`${i}: ${JSON.stringify(posada)}`);
    const bandera = huecoDeBandera(i);
    const b = enElMarco(m, bandera);
    if (b.radial < ACERA.desde || b.radial > ACERA.hasta || Math.abs(b.aLoLargo) > 4) banderasMal.push(`${i}: fuera de la acera ${JSON.stringify(b)}`);
    for (const h of huecos) {
      const d = enElMarco(m, h);
      if (Math.abs(d.aLoLargo - b.aLoLargo) < mediaCasa && Math.abs(d.radial - b.radial) < mediaCasa) banderasMal.push(`${i}: la bandera pisa una casa`);
    }
  }
  comprobar(`los cuatro huecos de casa (huella ${r(casa.ancho)} × ${r(casa.fondo)}, paso 2,55) caben en la acera de las 36 casillas laterales`, casasFuera.length === 0, casasFuera.slice(0, 5));
  comprobar('y no se pisan', casasSolapadas.length === 0, casasSolapadas.slice(0, 5));
  comprobar('la posada va centrada en la acera', posadasMal.length === 0, posadasMal.slice(0, 3));
  comprobar('la bandera del dueño está en la acera y no pisa ninguna casa', banderasMal.length === 0, banderasMal.slice(0, 3));

  /* La Mazmorra: presos dentro de la celda, visitas fuera de ella y fuera de la ele. */
  const m = marcoDeCasilla(MAZMORRA);
  const interior = { desde: CELDA.centro - CELDA.lado / 2 + CELDA.grosorDelMuro / 2, hasta: CELDA.centro + CELDA.lado / 2 - CELDA.grosorDelMuro / 2 };
  const presosFuera = [0, 1, 2, 3, 4, 5]
    .map((a) => enLaEsquina(m, huecoDePreso(a)))
    .filter((p) => p.u - medioPeon < interior.desde || p.u + medioPeon > interior.hasta || p.v - medioPeon < interior.desde || p.v + medioPeon > interior.hasta);
  comprobar(`los seis huecos de preso caben dentro de la celda (interior de ${r(interior.hasta - interior.desde)})`, presosFuera.length === 0, presosFuera);
  const visitasMal = [0, 1, 2, 3, 4, 5]
    .map((a) => enLaEsquina(m, huecoDeVisita(a)))
    .filter((p) => {
      const enLaEle = (Math.abs(p.u - LINEA_MEDIA_DE_LA_CALLE) < HOLGURA_DE_LA_MARCHA + medioPeon && p.v < LINEA_MEDIA_DE_LA_CALLE + HOLGURA_DE_LA_MARCHA) || (Math.abs(p.v - LINEA_MEDIA_DE_LA_CALLE) < HOLGURA_DE_LA_MARCHA + medioPeon && p.u < LINEA_MEDIA_DE_LA_CALLE + HOLGURA_DE_LA_MARCHA);
      const enLaCelda = p.u + medioPeon > CELDA.centro - CELDA.lado / 2 - CELDA.grosorDelMuro / 2 && p.v + medioPeon > CELDA.centro - CELDA.lado / 2 - CELDA.grosorDelMuro / 2;
      const fueraDeLaEsquina = p.u - medioPeon < ACERA.desde || p.v - medioPeon < ACERA.desde;
      return enLaEle || enLaCelda || fueraDeLaEsquina;
    });
  comprobar('y los seis de visita quedan en la esquina, fuera de la celda y fuera de la ele de la marcha', visitasMal.length === 0, visitasMal);
  const huecoDelDiez = [0, 1, 2, 3, 4, 5].every((a) => {
    const p = huecoDePeon(MAZMORRA, a);
    const v = huecoDeVisita(a);
    return p.x === v.x && p.z === v.z;
  });
  comprobar('en la Mazmorra el hueco de peón es el de visita', huecoDelDiez);
}

// ---------------------------------------------------------------------------
paso('Ningún solar pasa de 7,6 de frente ni de 9 de fondo, medido con el fichero');
// ---------------------------------------------------------------------------

/** La huella de un solar en su marco: extremos a lo largo y en radial de la unión de sus piezas. */
function huellaDelSolar(casilla: number, piezas: readonly PiezaDelSolar[]): { readonly aLoLargo: readonly [number, number]; readonly radial: readonly [number, number]; readonly minY: number } {
  const m = marcoDeCasilla(casilla);
  let a0 = Infinity;
  let a1 = -Infinity;
  let r0 = Infinity;
  let r1 = -Infinity;
  let minY = Infinity;
  for (const p of piezas) {
    const puesta = puestaDeLaPiezaDelSolar(casilla, p);
    for (const e of esquinasDeLaPuesta(puesta)) {
      const { radial, aLoLargo } = enElMarco(m, e);
      a0 = Math.min(a0, aLoLargo);
      a1 = Math.max(a1, aLoLargo);
      r0 = Math.min(r0, radial);
      r1 = Math.max(r1, radial);
    }
    minY = Math.min(minY, puesta.y + caja(p.pieza).min[1]);
  }
  return { aLoLargo: [a0, a1], radial: [r0, r1], minY };
}

function problemasDelSolar(casilla: number, piezas: readonly PiezaDelSolar[]): string[] {
  const problemas: string[] = [];
  const h = huellaDelSolar(casilla, piezas);
  const frente = h.aLoLargo[1] - h.aLoLargo[0];
  if (frente > FRENTE_MAXIMO_DEL_SOLAR || Math.abs(h.aLoLargo[0]) > FRENTE_MAXIMO_DEL_SOLAR / 2 || Math.abs(h.aLoLargo[1]) > FRENTE_MAXIMO_DEL_SOLAR / 2) {
    problemas.push(`frente: ${casilla} mide ${r(frente)} de frente (${r(h.aLoLargo[0])}..${r(h.aLoLargo[1])})`);
  }
  const enLaAcera = piezas.every((p) => p.banda === 'acera');
  const desde = enLaAcera ? ACERA.desde - 0.1 : SOLAR.desde - ALERO_SOBRE_LA_CALLE;
  const hasta = enLaAcera ? ACERA.hasta + 0.1 : casilla === RIBERA ? SOLAR.desde + FONDO_MAXIMO_EN_EL_AGUA : SOLAR.hasta + DESBORDE_HACIA_FUERA;
  if (h.radial[0] < desde || h.radial[1] > hasta) {
    problemas.push(`fondo: ${casilla} va de ${r(h.radial[0])} a ${r(h.radial[1])} en radial y su banda admite ${r(desde)}..${r(hasta)}`);
  }
  /* El muelle de la ribera lleva su pilotaje bajo el suelo a propósito (baja a −5,47): es la excepción declarada. */
  if (h.minY < -0.05 && casilla !== RIBERA) problemas.push(`alza: ${casilla} se hunde ${r(-h.minY)} bajo el suelo`);
  return problemas;
}

{
  const laterales = Array.from({ length: CASILLAS }, (_, i) => i).filter((i) => !ESQUINAS.includes(i));
  const sinEntrada = laterales.filter((i) => (EDIFICIO_DE_LA_CASILLA[i] ?? []).length === 0);
  comprobar('las 36 casillas laterales tienen algo en la tabla EDIFICIO_DE_LA_CASILLA', sinEntrada.length === 0, sinEntrada);
  const todos = laterales.flatMap((i) => problemasDelSolar(i, EDIFICIO_DE_LA_CASILLA[i] ?? []));
  const de = (etiqueta: string): string[] => todos.filter((p) => p.startsWith(`${etiqueta}:`));
  const medidas = laterales.map((i) => {
    const h = huellaDelSolar(i, EDIFICIO_DE_LA_CASILLA[i] ?? []);
    return `${i}:${r(h.aLoLargo[1] - h.aLoLargo[0])}×${r(h.radial[1] - h.radial[0])}`;
  });
  console.log(`  frente × fondo por casilla: ${medidas.join('  ')}`);
  comprobar(`ningún solar pasa de ${FRENTE_MAXIMO_DEL_SOLAR} de frente ni se sale de su casilla`, de('frente').length === 0, de('frente'));
  comprobar(`ninguno invade la calle más del alero ni desborda más de ${DESBORDE_HACIA_FUERA} (${FONDO_MAXIMO_DEL_SOLAR} de fondo); la ribera entra en el agua hasta ${FONDO_MAXIMO_EN_EL_AGUA}`, de('fondo').length === 0, de('fondo'));
  comprobar('y ninguna pieza se hunde bajo el suelo (la tienda sube sus estacas; el muelle mete el pilotaje en el agua a sabiendas)', de('alza').length === 0, de('alza'));
  const muelle = huellaDelSolar(RIBERA, EDIFICIO_DE_LA_CASILLA[RIBERA] ?? []);
  comprobar('la ribera lleva el muelle de canto: 2,73 de frente y más de 9 hacia el agua, sin pisar la calle', muelle.aLoLargo[1] - muelle.aLoLargo[0] < 3 && muelle.radial[1] - muelle.radial[0] > 9 && muelle.radial[0] >= SOLAR.desde - ALERO_SOBRE_LA_CALLE, muelle);

  /* Vacunas: una tienda sin girar mide 8,29 de frente; una torre corrida 3 hacia dentro pisa la calle. */
  const tiendaSinGirar = problemasDelSolar(21, [{ pieza: PIEZA.tienda, giroEnCuartos: 0, desplazamiento: [0, 1.9] }]);
  comprobar('se ve fallar: la tienda sin girar (8,29 de frente) cae por el frente', tiendaSinGirar.some((p) => p.startsWith('frente:')), tiendaSinGirar);
  const torreEnLaCalle = problemasDelSolar(39, [{ pieza: PIEZA.torreB, giroEnCuartos: 0, desplazamiento: [0, -3] }]);
  comprobar('se ve fallar: la torre corrida tres hacia dentro pisa la calle y cae por el fondo', torreEnLaCalle.some((p) => p.startsWith('fondo:')), torreEnLaCalle);
  const tiendaHundida = problemasDelSolar(21, [{ pieza: PIEZA.tienda, giroEnCuartos: 1, desplazamiento: [0.46, 1.9] }]);
  comprobar('se ve fallar: la tienda sin su alza hunde las estacas un cuarto', tiendaHundida.some((p) => p.startsWith('alza:')), tiendaHundida);
}

// ---------------------------------------------------------------------------
paso('La muralla cierra un cuadrado de 58 con las puertas enfrente de las casillas 5, 15, 25 y 35');
// ---------------------------------------------------------------------------

{
  const muralla = puestasDeLaMuralla();
  const cuenta = (pieza: string): number => muralla.filter((p) => p.pieza === pieza).length;
  comprobar('la muralla son 16 tramos, 4 puertas, 3 esquinas y una esquina con puerta', cuenta(PIEZA.muralla) === 16 && cuenta(PIEZA.puertaMuralla) === 4 && cuenta(PIEZA.esquinaMuralla) === 3 && cuenta(PIEZA.esquinaPuerta) === 1, {
    muralla: cuenta(PIEZA.muralla),
    puertas: cuenta(PIEZA.puertaMuralla),
    esquinas: cuenta(PIEZA.esquinaMuralla),
    conPuerta: cuenta(PIEZA.esquinaPuerta),
  });
  const tramoMedido = huella(PIEZA.muralla).ancho;
  comprobar(`el tramo de muralla del fichero mide ${r(LARGO_DE_LA_MURALLA)} como dice la constante`, Math.abs(tramoMedido - LARGO_DE_LA_MURALLA) < 0.01 * LARGO_DE_LA_MURALLA, tramoMedido);
  const puertas = puertasDeLaMuralla();
  const desviadas: string[] = [];
  PUERTAS.forEach((casilla, k) => {
    const m = marcoDeCasilla(casilla);
    const p = puertas[k];
    if (p === undefined) {
      desviadas.push(`${casilla}: sin puerta`);
      return;
    }
    const { radial, aLoLargo } = enElMarco(m, { x: p.x, z: p.z });
    if (Math.abs(aLoLargo) > 0.5 || Math.abs(radial - MEDIO_LADO_DE_LA_MURALLA) > 0.01) desviadas.push(`${casilla}: a lo largo ${r(aLoLargo)}, radial ${r(radial)}`);
  });
  comprobar('las cuatro puertas quedan a ±0,5 del eje de las casillas 5, 15, 25 y 35, a 29 del centro', desviadas.length === 0, desviadas);
  const sureste = muralla.find((p) => p.pieza === PIEZA.esquinaPuerta);
  comprobar('la esquina con puerta grande es la del sureste, la que mira a la Puerta Mayor', sureste !== undefined && sureste.x > 0 && sureste.z > 0, sureste);
  /* Los tramos de cada lado son contiguos: consecutivos a un tramo de distancia. */
  const huecosEnLaMuralla: string[] = [];
  for (let lado = 0; lado < 4; lado++) {
    const tramos = muralla.filter((p) => p.pieza !== PIEZA.esquinaMuralla && p.pieza !== PIEZA.esquinaPuerta).slice(lado * 5, lado * 5 + 5);
    for (let k = 1; k < tramos.length; k++) {
      const a = tramos[k - 1] as Puesta;
      const b = tramos[k] as Puesta;
      const d = Math.hypot(b.x - a.x, b.z - a.z);
      if (Math.abs(d - LARGO_DE_LA_MURALLA) > 0.01) huecosEnLaMuralla.push(`lado ${lado}: ${r(d)}`);
    }
    const lejos = tramos.filter((t) => Math.abs(Math.max(Math.abs(t.x), Math.abs(t.z)) - MEDIO_LADO_DE_LA_MURALLA) > 0.01);
    if (lejos.length > 0) huecosEnLaMuralla.push(`lado ${lado}: tramos fuera del cuadrado de 58`);
  }
  comprobar('y en cada lado los cinco tramos van seguidos, sobre el cuadrado de 58', huecosEnLaMuralla.length === 0, huecosEnLaMuralla);
}

// ---------------------------------------------------------------------------
paso('Las esquinas, la plaza, la ronda y el campo');
// ---------------------------------------------------------------------------

{
  /* Ninguna pieza de esquina pisa la ele de la marcha engordada un peón; las losas son suelo. */
  const pisan: string[] = [];
  const fueraDeLaEsquina: string[] = [];
  for (const esquina of ESQUINAS) {
    const m = marcoDeCasilla(esquina);
    const piezas = puestasDeLasEsquinas().filter((p) => {
      const { u, v } = enLaEsquina(m, { x: p.x, z: p.z });
      return u > ACERA.desde - 1 && v > ACERA.desde - 1 && u < MEDIO_LADO + DESBORDE_HACIA_FUERA && v < MEDIO_LADO + DESBORDE_HACIA_FUERA;
    });
    for (const p of piezas) {
      const uv = esquinasDeLaPuesta(p).map((e) => enLaEsquina(m, e));
      const u0 = Math.min(...uv.map((q) => q.u));
      const u1 = Math.max(...uv.map((q) => q.u));
      const v0 = Math.min(...uv.map((q) => q.v));
      const v1 = Math.max(...uv.map((q) => q.v));
      if (u0 < ACERA.desde - 0.5 || v0 < ACERA.desde - 0.5 || u1 > MEDIO_LADO + DESBORDE_HACIA_FUERA || v1 > MEDIO_LADO + DESBORDE_HACIA_FUERA) fueraDeLaEsquina.push(`${esquina}/${p.pieza}: u ${r(u0)}..${r(u1)}, v ${r(v0)}..${r(v1)}`);
      if (p.pieza === PIEZA.losa) continue;
      const h = HOLGURA_DE_LA_MARCHA;
      const c = LINEA_MEDIA_DE_LA_CALLE;
      const tramoDeEntrada = v1 >= c - h && v0 <= c + h && u0 <= c + h; // v ≈ 43,25, u ≤ 43,25
      const tramoDeSalida = u1 >= c - h && u0 <= c + h && v0 <= c + h; // u ≈ 43,25, v ≤ 43,25
      if (tramoDeEntrada || tramoDeSalida) pisan.push(`${esquina}/${p.pieza}: u ${r(u0)}..${r(u1)}, v ${r(v0)}..${r(v1)}`);
    }
  }
  comprobar(`ninguna pieza de esquina pisa la ele de la marcha engordada ${HOLGURA_DE_LA_MARCHA} (las losas son suelo)`, pisan.length === 0, pisan);
  comprobar('y todas quedan dentro de su cuadrado de 14 más el desborde', fueraDeLaEsquina.length === 0, fueraDeLaEsquina);
  const mazmorra = puestasDeLasEsquinas().filter((p) => enLaEsquina(marcoDeCasilla(MAZMORRA), { x: p.x, z: p.z }).u > 36 && enLaEsquina(marcoDeCasilla(MAZMORRA), { x: p.x, z: p.z }).v > 36 && p.x < 0 && p.z > 0);
  const cuenta = (pieza: string): number => mazmorra.filter((p) => p.pieza === pieza).length;
  comprobar('la Mazmorra lleva cuatro losas, dos muros, dos rejas, un muro de esquina y dos pilares', cuenta(PIEZA.losa) === 4 && cuenta(PIEZA.muro) === 2 && cuenta(PIEZA.muroReja) === 2 && cuenta(PIEZA.muroEsquina) === 1 && cuenta(PIEZA.pilar) === 2, mazmorra.map((p) => p.pieza));

  /* La plaza dentro de la muralla, el suelo de dados en el centro con los dos dados encima. */
  const interior = MEDIO_LADO_DE_LA_MURALLA - huella(PIEZA.muralla).fondo / 2;
  const plazaFuera = puestasDeLaPlaza(true).filter((p) => esquinasDeLaPuesta(p).some((e) => Math.abs(e.x) > interior || Math.abs(e.z) > interior));
  comprobar('el ayuntamiento, el pozo, las mesas y las sillas quedan dentro de la muralla', plazaFuera.length === 0, plazaFuera.map((p) => p.pieza));
  const dadosDentro = HUECOS_DE_LOS_DADOS.every((d) => Math.abs(d.x - SUELO_DE_DADOS.x) < SUELO_DE_DADOS.lado / 2 - 1.5 && Math.abs(d.z - SUELO_DE_DADOS.z) < SUELO_DE_DADOS.lado / 2 - 1.5);
  comprobar('el suelo de dados mide 14 × 14 en el centro y los dos dados de arista 3 caen dentro', SUELO_DE_DADOS.lado === 14 && SUELO_DE_DADOS.x === 0 && SUELO_DE_DADOS.z === 0 && dadosDentro, HUECOS_DE_LOS_DADOS);
  const sobreElSuelo = puestasDeLaPlaza(true).filter((p) => esquinasDeLaPuesta(p).some((e) => Math.abs(e.x) < SUELO_DE_DADOS.lado / 2 && Math.abs(e.z) < SUELO_DE_DADOS.lado / 2));
  comprobar('y nada de la plaza pisa el suelo de dados', sobreElSuelo.length === 0, sobreElSuelo.map((p) => p.pieza));

  /* La ronda: entre la muralla y la acera, y sin tapar el camino de las puertas. */
  const ronda = puestasDeLaRonda();
  const cuentaRonda = (pieza: string): number => ronda.filter((p) => p.pieza === pieza).length;
  comprobar('la ronda son arbol-a × 12, arbol-b × 4, banco × 4 y farola × 2', cuentaRonda(PIEZA.arbolA) === 12 && cuentaRonda(PIEZA.arbolB) === 4 && cuentaRonda(PIEZA.banco) === 4 && cuentaRonda(PIEZA.farola) === 2, ronda.map((p) => p.pieza));
  const rondaMal = ronda.filter((p) => {
    const lejos = Math.max(Math.abs(p.x), Math.abs(p.z));
    const fueraDeLaBanda = lejos < MEDIO_LADO_DE_LA_MURALLA + huella(PIEZA.muralla).fondo / 2 || lejos > ACERA.desde;
    const cerca = Math.abs(p.x) >= Math.abs(p.z) ? Math.abs(p.z) : Math.abs(p.x);
    return fueraDeLaBanda || cerca < 3;
  });
  comprobar('y todas sus piezas quedan entre la muralla y la acera, a más de 3 del eje de cada puerta', rondaMal.length === 0, rondaMal.map((p) => `${p.pieza} (${r(p.x)}, ${r(p.z)})`));

  /* El campo: 30 teselas fuera del anillo, determinista por semilla. */
  const a = campo(7);
  const b = campo(7);
  const otro = campo(8);
  comprobar(`el campo tiene ${TESELAS_DEL_CAMPO} teselas, todas fuera del anillo y sin repetir`, a.teselas.length === TESELAS_DEL_CAMPO && a.teselas.every((t) => Math.max(Math.abs(t.x), Math.abs(t.z)) > MEDIO_LADO + 5) && new Set(a.teselas.map((t) => `${t.x},${t.z}`)).size === TESELAS_DEL_CAMPO, a.teselas.length);
  comprobar('la misma semilla da el mismo campo y otra semilla otro', JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) !== JSON.stringify(otro));
  comprobar('dos colinas y dos arboledas sobre sus teselas, y tres nubes a 28 de alto', a.decorado.length === 4 && a.decorado.every((d) => a.teselas.some((t) => t.x === d.x && t.z === d.z)) && a.nubes.length === 3 && a.nubes.every((n) => n.y === 28), a.decorado.map((d) => d.pieza));

  /* Todo lo que se instancia existe en el fichero. */
  const nombres = new Set(nombresDelBurgo());
  const desconocidas = [...mundoEstatico(7, 'plena'), ...a.nubes].filter((p) => !nombres.has(p.pieza)).map((p) => p.pieza);
  comprobar('todas las piezas del mundo estático están en burgo.glb', desconocidas.length === 0, desconocidas);
  comprobar('la ribera y las esquinas no se cuelan en la lista de solares más de una vez', puestasDeLosSolares().filter((p) => p.pieza === PIEZA.muelle).length === 1);
}

// ---------------------------------------------------------------------------
paso('El tablero LLENO cabe en el presupuesto de un móvil, en las dos calidades');
// ---------------------------------------------------------------------------

const triangulosDeUnAventurero = await (async (): Promise<number> => {
  if (!fs.existsSync(EXPLORADORA)) return 8_900;
  const d = await io.read(EXPLORADORA);
  let tri = 0;
  for (const malla of d.getRoot().listMeshes()) {
    for (const prim of malla.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (pos !== null) tri += (prim.getIndices()?.getCount() ?? pos.getCount()) / 3;
    }
  }
  return Math.round(tri);
})();

{
  const plena = sumaDelPresupuesto(MULTIPLICIDADES_PLENA, (p) => triangulos.get(p), 'plena', triangulosDeUnAventurero);
  const sobria = sumaDelPresupuesto(MULTIPLICIDADES_SOBRIA, (p) => triangulos.get(p), 'sobria', triangulosDeUnAventurero);
  const gordos = [...plena.renglones].sort((x, y) => y.triangulos - x.triangulos).slice(0, 6);
  console.log(`  plena: ${plena.total.toLocaleString('es-ES')} triángulos (tope ${TOPE_PLENA.toLocaleString('es-ES')}); sobria: ${sobria.total.toLocaleString('es-ES')} (tope ${TOPE_SOBRIA.toLocaleString('es-ES')}); la exploradora ${triangulosDeUnAventurero.toLocaleString('es-ES')}`);
  console.log(`  lo que más pesa: ${gordos.map((g) => `${g.que} ×${g.cuantos} = ${g.triangulos.toLocaleString('es-ES')}`).join('; ')}`);
  comprobar('la suma plena no pide piezas que el fichero no tenga', plena.desconocidas.length === 0 && sobria.desconocidas.length === 0, [...plena.desconocidas, ...sobria.desconocidas]);
  comprobar(`el tablero lleno en calidad plena, con un aventurero, baja de ${TOPE_PLENA.toLocaleString('es-ES')}`, plena.total <= TOPE_PLENA, plena.total);
  comprobar(`y en sobria baja de ${TOPE_SOBRIA.toLocaleString('es-ES')}`, sobria.total <= TOPE_SOBRIA, sobria.total);
  comprobar('la sobria quita de verdad: campo, ronda, aventurero, monedas, mesas', plena.total - sobria.total > 15_000, plena.total - sobria.total);
  /* La vacuna: doce tabernas como posada tienen que caer. */
  const conTaberna = { ...MULTIPLICIDADES_PLENA, [PIEZA.posada]: 12, [PIEZA.casa]: 32, [PIEZA.bandera]: 28 };
  const envenenada = sumaDelPresupuesto(conTaberna, (p) => triangulos.get(p), 'plena', triangulosDeUnAventurero);
  comprobar('se ve fallar: una tabla con la taberna como posada (× 12) se pasa del tope', envenenada.total > TOPE_PLENA, envenenada.total);
}

// ---------------------------------------------------------------------------
paso('El peón: diez mil pasos sin T-pose, sin clip inexistente, sin salirse de la polilínea');
// ---------------------------------------------------------------------------

const clipsDelFichero = new Set<string>();
if (fs.existsSync(ANIMACIONES)) {
  const d = await io.read(ANIMACIONES);
  for (const anim of d.getRoot().listAnimations()) clipsDelFichero.add(anim.getName());
}
comprobar('animaciones.glb está y trae los doce clips de CLIP', Object.values(CLIP).every((c) => clipsDelFichero.has(c)), [...clipsDelFichero]);

/** La distancia de un punto a la polilínea como conjunto de segmentos (cerrada). */
function distanciaALaPolilinea(p: Punto): number {
  let mejor = Infinity;
  for (let i = 0; i < POLILINEA.length; i++) {
    const a = POLILINEA[i] as Punto;
    const b = POLILINEA[(i + 1) % POLILINEA.length] as Punto;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l2 = dx * dx + dz * dz;
    const t = l2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2));
    mejor = Math.min(mejor, Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t)));
  }
  return mejor;
}

/** El vértice de la polilínea más cercano a un punto. */
function casillaMasCercana(p: Punto): number {
  let mejor = 0;
  let d = Infinity;
  POLILINEA.forEach((v, i) => {
    const dd = Math.hypot(v.x - p.x, v.z - p.z);
    if (dd < d) {
      d = dd;
      mejor = i;
    }
  });
  return mejor;
}

const anillo = ANILLO_DEL_BURGO;
const A = 'asiento-a';

function mueve(desde: number, pasos: number, como: 'anda' | 'viaja' | 'retrocede' = 'anda'): Extract<SucesoDelBurgo, { que: 'mueve' }> {
  const recorrido: number[] = [];
  const sentido = como === 'retrocede' ? -1 : 1;
  for (let k = 1; k <= Math.abs(pasos); k++) recorrido.push((((desde + k * sentido) % 40) + 40) % 40);
  const hasta = recorrido[recorrido.length - 1] ?? desde;
  return { que: 'mueve', quien: A, desde, hasta, recorrido: como === 'viaja' ? [hasta] : recorrido, porLaPuertaMayor: como === 'anda' && desde + pasos >= 40, como };
}

{
  const azar = sorteo(0xb0c0);
  const conTPose: string[] = [];
  const sinClip: string[] = [];
  const lejos: string[] = [];
  const fases = new Set<FaseDelPeon>();
  let ahora = 0;
  let e: EstadoDelPeon = nacer(0, 11, ahora, 2);
  for (let i = 0; i < 10_000; i++) {
    const dt = 0.02 + azar() * 0.1;
    ahora += dt;
    if (azar() < 0.04) {
      const u = azar();
      const desde = e.enCasilla;
      let s: SucesoDelBurgo;
      if (u < 0.35) s = mueve(desde, 2 + Math.floor(azar() * 11));
      else if (u < 0.45) s = mueve(desde, 3, 'retrocede');
      else if (u < 0.5) s = mueve(desde, 15, 'viaja');
      else if (u < 0.6) s = { que: 'cobra', quien: A, de: null, cuanto: 200, porque: 'renta' as never, casilla: desde };
      else if (u < 0.7) s = { que: 'paga', quien: A, a: null, cuanto: 50, porque: 'renta' as never, casilla: desde };
      else if (u < 0.78) s = { que: 'alza', quien: A, casilla: desde, casas: 1 + Math.floor(azar() * 5) };
      else if (u < 0.86) s = { que: 'a-la-mazmorra', quien: A, desde, porque: 'casilla' };
      else if (u < 0.92) s = { que: 'sale-de-la-mazmorra', quien: A, como: 'dobles' };
      else if (u < 0.96) s = { que: 'sigue-presa', quien: A, intento: 1 };
      else s = { que: 'turno', de: A };
      e = encolar(e, [s]);
    }
    if (azar() < 0.01) e = despedir(e, ahora);
    if (azar() < 0.003) e = saltarLaCola(e, ahora);
    if (e.quebrada) e = nacer(Math.floor(azar() * 40), i, ahora, 2);
    e = avanzar(e, ahora, dt, anillo);
    fases.add(e.fase);
    const clip = clipQueToca(e, ahora);
    if (clip.clip === CLIP.tPose) conTPose.push(`${String(i)}:${e.fase}`);
    if (!clipsDelFichero.has(clip.clip)) sinClip.push(`${String(i)}:${clip.clip}`);
    if (!Number.isFinite(clip.velocidad) || Math.abs(clip.velocidad) > TOPE_DE_VELOCIDAD) sinClip.push(`${String(i)}: velocidad ${String(clip.velocidad)}`);
    const p = posicionYRumbo(e, anillo, ahora);
    const d = distanciaALaPolilinea(p);
    const andando = e.fase === 'andando' || e.fase === 'corriendo';
    if (andando && d > 1.5) lejos.push(`${String(i)} ${e.fase}: ${r(d)}`);
    /* Presa, cobra y paga desde su celda, que está a siete de la polilínea: no es salirse. */
    if (!andando && !e.presa && e.fase !== 'preso' && e.fase !== 'quebrando' && d > 2.0) lejos.push(`${String(i)} ${e.fase}: ${r(d)}`);
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || !Number.isFinite(p.rumbo)) lejos.push(`${String(i)}: NaN`);
  }
  comprobar('en diez mil pasos con sucesos al azar nunca sale t-pose', conTPose.length === 0, conTPose.slice(0, 5));
  comprobar('todos los clips pedidos están en animaciones.glb y la velocidad del clip no pasa de 1,5', sinClip.length === 0, sinClip.slice(0, 5));
  comprobar('andando, el aventurero va SOBRE la polilínea (≤ 1,5) y parado, en su hueco (≤ 2: fila 0,8 + 1,2 hacia el solar)', lejos.length === 0, lejos.slice(0, 5));
  comprobar('el recorrido pasa por todas las fases', (['quieto', 'apareciendo', 'recogiendo', 'andando', 'corriendo', 'viajando', 'saltando', 'cobrando', 'pagando', 'alzando', 'preso', 'quebrando', 'despidiendose'] as FaseDelPeon[]).every((f) => fases.has(f) || f === 'quebrando'), [...fases]);
}

{
  /* Doce casillas en ≤ 8 s y tres en ≤ 6,75, desde CUALQUIER casilla (las esquinas alargan los tramos). */
  const largas: string[] = [];
  const cortas: string[] = [];
  const rapidas: string[] = [];
  for (let desde = 0; desde < 40; desde++) {
    const doce = mueve(desde, 12);
    const tres = mueve(desde, 3);
    const l12 = largoDelRecorrido(anillo, desde, doce.recorrido);
    const l3 = largoDelRecorrido(anillo, desde, tres.recorrido);
    const d12 = duracionDelRecorrido(l12, 12, 'anda');
    const d3 = duracionDelRecorrido(l3, 3, 'anda');
    if (d12 > TOPE_DEL_RECORRIDO + 1e-9) largas.push(`${desde}: ${r(d12)} s`);
    if (d3 > 3 * TOPE_POR_CASILLA_ANDANDO + 1e-9) cortas.push(`${desde}: ${r(d3)} s`);
    if (Math.abs(velocidadDelClip(l12, d12, 'anda', 12)) > TOPE_DE_VELOCIDAD || Math.abs(velocidadDelClip(l3, d3, 'anda', 3)) > TOPE_DE_VELOCIDAD) rapidas.push(`${desde}`);
  }
  comprobar(`doce casillas nunca duran más de ${TOPE_DEL_RECORRIDO} s, salgan de donde salgan`, largas.length === 0, largas);
  comprobar('tres casillas nunca duran más de 6,75 s', cortas.length === 0, cortas);
  comprobar('y el clip nunca pasa de 1,5', rapidas.length === 0, rapidas);
  comprobar('hasta tres casillas se anda a 4 u/s y con cuatro se corre a 8', CASILLAS_ANDANDO === 3 && r(duracionDelRecorrido(24, 3, 'anda')) === 6 && r(duracionDelRecorrido(32, 4, 'anda')) === 4);

  /* Un movimiento entero, paso a paso: nace, recoge, anda, salta, y el peón reaparece. */
  let ahora = 0;
  let e = nacer(8, 3, ahora, 1);
  e = encolar(e, [mueve(8, 3)]);
  const vistas: FaseDelPeon[] = [];
  let peonVisto = false;
  let peonEscondido = false;
  for (let i = 0; i < 1400; i++) {
    ahora += 0.01;
    e = avanzar(e, ahora, 0.01, anillo);
    if (vistas[vistas.length - 1] !== e.fase) vistas.push(e.fase);
    const p = posicionDelPeon(e, anillo, ahora);
    if (e.fase === 'andando') peonEscondido = peonEscondido || !p.visible;
    if (e.fase === 'saltando') peonVisto = peonVisto || p.visible;
  }
  comprobar('un mueve de tres: apareciendo → recogiendo → andando → saltando → quieto, y acaba en la 11', JSON.stringify(vistas) === JSON.stringify(['apareciendo', 'recogiendo', 'andando', 'saltando', 'quieto']) && e.enCasilla === 11 && e.enPie && peonTerminado(e), { vistas, enCasilla: e.enCasilla });
  comprobar('mientras anda el peón va escondido y en el salto reaparece cayendo', peonEscondido && peonVisto);

  /* Con el aventurero ya en pie, el siguiente mueve se ahorra el aparecer y corre si son cuatro o más. */
  e = encolar(e, [mueve(11, 5)]);
  const vistas2: FaseDelPeon[] = [];
  for (let i = 0; i < 1200; i++) {
    ahora += 0.01;
    e = avanzar(e, ahora, 0.01, anillo);
    if (vistas2[vistas2.length - 1] !== e.fase) vistas2.push(e.fase);
  }
  comprobar('el siguiente mueve con el aventurero en pie: recogiendo → corriendo → saltando → quieto, en la 16', JSON.stringify(vistas2) === JSON.stringify(['recogiendo', 'corriendo', 'saltando', 'quieto']) && e.enCasilla === 16, vistas2);

  /* Retroceder: anda hacia atrás mirando hacia delante. */
  e = encolar(e, [mueve(16, 3, 'retrocede')]);
  let rumboAlRetroceder = NaN;
  let velocidadAlRetroceder = NaN;
  for (let i = 0; i < 800; i++) {
    ahora += 0.01;
    e = avanzar(e, ahora, 0.01, anillo);
    if (e.fase === 'andando' && i > 200) {
      rumboAlRetroceder = posicionYRumbo(e, anillo, ahora).rumbo;
      velocidadAlRetroceder = clipQueToca(e, ahora).velocidad;
    }
  }
  const rumboDelLado = anillo.rumboDeLaMarcha(14);
  comprobar('al retroceder anda hacia atrás (timeScale −1) mirando en el sentido de la marcha, y acaba en la 13', velocidadAlRetroceder < 0 && Math.abs(Math.atan2(Math.sin(rumboAlRetroceder - rumboDelLado), Math.cos(rumboAlRetroceder - rumboDelLado))) < 0.2 && e.enCasilla === 13, {
    velocidad: velocidadAlRetroceder,
    rumbo: rumboAlRetroceder,
    rumboDelLado,
    enCasilla: e.enCasilla,
  });

  /* Viajar: nunca anda; desaparece y aparece. */
  e = encolar(e, [mueve(13, 20, 'viaja')]);
  const fasesDelViaje = new Set<FaseDelPeon>();
  for (let i = 0; i < 600; i++) {
    ahora += 0.01;
    e = avanzar(e, ahora, 0.01, anillo);
    fasesDelViaje.add(e.fase);
  }
  comprobar('viajar no anda: usar, desvanecerse y aparecer en el destino (33)', !fasesDelViaje.has('andando') && !fasesDelViaje.has('corriendo') && fasesDelViaje.has('viajando') && e.enCasilla === 33, [...fasesDelViaje]);

  /* A la Mazmorra sin pisar casillas. */
  e = encolar(e, [{ que: 'a-la-mazmorra', quien: A, desde: 33, porque: 'casilla' }]);
  const pisadas = new Set<number>();
  let duracion = 0;
  const arranque = ahora;
  for (let i = 0; i < 600; i++) {
    ahora += 0.01;
    e = avanzar(e, ahora, 0.01, anillo);
    if (e.fase === 'preso' && e.enPie) {
      duracion = ahora - arranque;
      const p = posicionYRumbo(e, anillo, ahora);
      pisadas.add(casillaMasCercana(p));
    }
  }
  comprobar('a la Mazmorra sin pisar casillas: sólo la 33 y la 10, en unos 3,5 s, y acaba presa en la celda', [...pisadas].every((c) => c === 33 || c === 10) && e.presa && e.enCasilla === MAZMORRA && duracion > 3.3 && duracion < 3.8, { pisadas: [...pisadas], duracion: r(duracion), presa: e.presa });
  const enLaCelda = enLaEsquina(marcoDeCasilla(MAZMORRA), posicionYRumbo(e, anillo, ahora));
  comprobar('y su aventurero y su peón están en la celda', enLaCelda.u > CELDA.centro - 3 && enLaCelda.v > CELDA.centro - 3 && posicionDelPeon(e, anillo, ahora).visible, enLaCelda);

  /* Sigue presa: golpe contra la reja; sale: la reja sube, salto, libre. */
  e = encolar(e, [{ que: 'sigue-presa', quien: A, intento: 1 }]);
  ahora += 0.05;
  e = avanzar(e, ahora, 0.05, anillo);
  comprobar('sigue presa: golpe contra la reja sin salir de la celda', clipQueToca(e, ahora).clip === CLIP.golpe && e.presa);
  e = encolar(e, [{ que: 'sale-de-la-mazmorra', quien: A, como: 'fianza' }]);
  const clipsAlSalir = new Set<string>();
  for (let i = 0; i < 300; i++) {
    ahora += 0.01;
    e = avanzar(e, ahora, 0.01, anillo);
    clipsAlSalir.add(clipQueToca(e, ahora).clip);
  }
  comprobar('sale de la Mazmorra: la reja sube, salto, y queda libre en la 10', clipsAlSalir.has(CLIP.salto) && !e.presa && e.enCasilla === MAZMORRA && e.fase === 'quieto', [...clipsAlSalir]);

  /* Saltar la cola deja el estado final. */
  e = encolar(e, [mueve(10, 7), { que: 'cobra', quien: A, de: null, cuanto: 200, porque: 'renta' as never, casilla: 17 }, { que: 'a-la-mazmorra', quien: A, desde: 17, porque: 'carta' }]);
  ahora += 0.3;
  e = avanzar(e, ahora, 0.3, anillo);
  const saltado = saltarLaCola(e, ahora);
  comprobar('saltar la cola deja el estado final: cola vacía, presa en la Mazmorra, nada en vuelo', saltado.cola.length === 0 && saltado.presa && saltado.enCasilla === MAZMORRA && peonTerminado(saltado), { fase: saltado.fase, enCasilla: saltado.enCasilla });
  const saltadoSinMazmorra = saltarLaCola(encolar(nacer(3, 1, 0, 0), [mueve(3, 9), mueve(12, 2)]), 1);
  comprobar('y con dos mueves pendientes, en la casilla del último con el aventurero en pie', saltadoSinMazmorra.enCasilla === 14 && saltadoSinMazmorra.enPie && saltadoSinMazmorra.fase === 'quieto');

  /* Despedirse: 0,4 s encogiendo y ya no está en pie. */
  let d = nacer(5, 1, 0, 0);
  d = encolar(d, [mueve(5, 2)]);
  let t = 0;
  for (let i = 0; i < 900; i++) {
    t += 0.01;
    d = avanzar(d, t, 0.01, anillo);
  }
  const despedida = despedir(d, t);
  const aMedias = posicionYRumbo(despedida, anillo, t + 0.2);
  const yaIdo = avanzar(despedida, t + 0.45, 0.05, anillo);
  comprobar('despedirse: 0,4 s encogiendo por escala y después no hay aventurero en pie', despedida.fase === 'despidiendose' && aMedias.escala > 0.3 && aMedias.escala < 0.7 && !yaIdo.enPie && yaIdo.fase === 'quieto', { escala: r(aMedias.escala), fase: yaIdo.fase });

  /* Quiebra: golpe, huida hacia fuera, y el peón cae. */
  let q = nacer(22, 1, 0, 3);
  q = encolar(q, [{ que: 'quiebra', quien: A, acreedor: null }]);
  let lejosDelAnillo = 0;
  let tumbado = 0;
  let tq = 0;
  for (let i = 0; i < 400; i++) {
    tq += 0.01;
    q = avanzar(q, tq, 0.01, anillo);
    if (q.fase === 'quebrando') {
      const p = posicionYRumbo(q, anillo, tq);
      lejosDelAnillo = Math.max(lejosDelAnillo, Math.max(Math.abs(p.x), Math.abs(p.z)));
      tumbado = Math.max(tumbado, posicionDelPeon(q, anillo, tq).tumbado);
    }
  }
  comprobar('quebrar: golpe, huida de 14 hacia fuera del anillo, el peón cae de lado, y al final no queda nadie', q.quebrada && !q.enPie && lejosDelAnillo > MEDIO_LADO + 8 && tumbado === 1 && !posicionDelPeon(q, anillo, tq).visible, { lejos: r(lejosDelAnillo), tumbado });

  /* La duración de cada clip es la real. */
  comprobar('las duraciones que usa el peón son las de gestos.ts (aparecer 1,3; salto 1,167; golpe 0,667)', DURACION.aparecer === 1.3 && DURACION.salto === 1.167 && DURACION.golpe === 0.667);
}

// ---------------------------------------------------------------------------
paso('La cola de una jugada real cabe en 14 s y saltarla deja el estado final');
// ---------------------------------------------------------------------------

{
  const jugada: SucesoDelBurgo[] = [
    { que: 'tira', quien: A, dados: [2, 1], dobles: false, enLaMazmorra: false },
    mueve(8, 3),
    { que: 'paga', quien: A, a: 'asiento-b', cuanto: 150, porque: 'renta' as never, casilla: 11 },
    { que: 'carta', quien: A, mazo: 'pregon' as never, carta: 3 },
  ];
  let cola = encolarSucesos(colaVacia(0), jugada, anillo);
  const fin = finDeLaCola(cola);
  console.log(`  la jugada (tirada + tres casillas por la esquina + renta + carta) dura ${r(fin)} s: ${cola.programados.map((p) => `${p.suceso.que} ${r(p.desde)}→${r(p.hasta)}`).join(', ')}`);
  comprobar('una jugada real —tirada, tres casillas cruzando una esquina, renta y carta— dura 14 s o menos', fin <= 14, r(fin));
  const monotona = cola.programados.every((p, i, todos) => i === 0 || p.desde >= (todos[i - 1] as { desde: number }).desde);
  comprobar('y los arranques van en el orden de la lista', monotona, cola.programados.map((p) => r(p.desde)));
  const conDoble = encolarSucesos(colaVacia(0), [{ que: 'tira', quien: A, dados: [4, 4], dobles: true, enLaMazmorra: false }]);
  comprobar('una tirada dura 0,95 y un doble 0,25 más', r(finDeLaCola(encolarSucesos(colaVacia(0), [jugada[0] as SucesoDelBurgo]))) === 0.95 && r(finDeLaCola(conDoble)) === 1.2);

  /* Las monedas de un mismo movimiento se solapan a 200 ms. */
  const renta = encolarSucesos(
    colaVacia(0),
    [1, 2, 3].map((k): SucesoDelBurgo => ({ que: 'cobra', quien: A, de: `b${k}`, cuanto: 100, porque: 'renta' as never, casilla: 11 })),
  );
  const arranques = renta.programados.map((p) => r(p.desde));
  comprobar('una renta a tres cobra en cadena a 200 ms: no dura tres veces', JSON.stringify(arranques) === '[0,0.2,0.4]' && finDeLaCola(renta) < 2, { arranques, fin: r(finDeLaCola(renta)) });

  /* Avanzar quita lo terminado; en curso da progresos válidos. */
  cola = avanzarLaCola(cola, 2);
  const curso = enCurso(cola);
  comprobar('a los dos segundos la tirada ya terminó, el mueve está en curso con progreso entre 0 y 1', cola.programados.every((p) => p.suceso.que !== 'tira') && curso.some((c) => c.suceso.que === 'mueve' && c.u > 0 && c.u < 1), curso.map((c) => `${c.suceso.que} ${r(c.u)}`));
  cola = avanzarLaCola(cola, 20);
  comprobar('y a los veinte segundos no queda nada', colaTerminada(cola));
  const saltada = saltar(encolarSucesos(colaVacia(0), jugada, anillo));
  comprobar('saltar la cola la deja terminada y marcada como saltada: la escena pone todo en su estado final', colaTerminada(saltada) && saltada.saltada);
  const quienEnPie = encolarSucesos(colaVacia(0), [mueve(1, 2), mueve(3, 2)], anillo);
  const [primero, segundo] = quienEnPie.programados;
  comprobar('el segundo mueve del mismo asiento se ahorra el aparecer (1,3 s menos)', primero !== undefined && segundo !== undefined && r(primero.hasta - primero.desde - (segundo.hasta - segundo.desde)) === 1.3, quienEnPie.programados.map((p) => r(p.hasta - p.desde)));
}

// ---------------------------------------------------------------------------
paso('Los dados con par: cambiar el par cambia el estado; un solo número no es un par');
// ---------------------------------------------------------------------------

{
  const reposo = dadosDelBurgoEnReposo();
  comprobar('en reposo enseñan [1, 1]', reposo.fase.fase === 'quieta' && JSON.stringify(reposo.fase.par) === '[1,1]');
  const primera = faseDeLosDadosConPar(reposo, { que: 'vista', vista: { par: [3, 5], tirado: true, sello: 1 } }, 0);
  comprobar('la primera vista nunca es nueva: se enseña quieta con su par, sin rodar', primera.fase.fase === 'quieta' && JSON.stringify(primera.fase.par) === '[3,5]');
  const segunda = faseDeLosDadosConPar(primera, { que: 'vista', vista: { par: [6, 6], tirado: true, sello: 2 } }, 1);
  comprobar('cambiar el par con el sello nuevo cambia el estado: ruedan hacia el par nuevo', segunda !== primera && segunda.fase.fase === 'rodando' && segunda.fase.objetivo !== null && JSON.stringify(segunda.fase.objetivo.par) === '[6,6]', segunda.fase);
  const igual = faseDeLosDadosConPar(primera, { que: 'vista', vista: { par: [3, 5], tirado: true, sello: 1 } }, 1);
  comprobar('y la misma vista otra vez no mueve nada', igual.fase.fase === 'quieta');
  const mismoSelloOtroPar = faseDeLosDadosConPar(primera, { que: 'vista', vista: { par: [2, 2], tirado: true, sello: 1 } }, 1);
  comprobar('el mismo sello con otro par (doble que repite turno) también rueda', mismoSelloOtroPar.fase.fase === 'rodando');
  const asentada = faseDeLosDadosConPar(faseDeLosDadosConPar(segunda, { que: 'tic' }, 1.7), { que: 'tic' }, 2.2);
  comprobar('con el tiempo se asientan y se quedan quietos en [6, 6]', asentada.fase.fase === 'quieta' && JSON.stringify(asentada.fase.par) === '[6,6]', asentada.fase);
  const tocado = faseDeLosDadosConPar(asentada, { que: 'tocado' }, 3);
  const rechazado = faseDeLosDadosConPar(tocado, { que: 'rechazado' }, 3.1);
  comprobar('tocar los pone a rodar sin objetivo, y el rechazo los devuelve al par anterior', tocado.fase.fase === 'rodando' && tocado.fase.objetivo === null && rechazado.fase.fase === 'quieta' && JSON.stringify(rechazado.fase.par) === '[6,6]');
  const sinPar = faseDeLosDadosConPar(asentada, { que: 'vista', vista: { par: null, tirado: false, sello: 3 } }, 4);
  comprobar('una vista sin par vuelve al reposo [1, 1] sin animar', sinPar.fase.fase === 'quieta' && JSON.stringify(sinPar.fase.par) === '[1,1]');
  comprobar('un solo número no es un par: parDeLaVista devuelve null (y dadosEnTres con él)', parDeLaVista([3]) === null && parDeLaVista([0, 7]) === null && parDeLaVista('35') === null && JSON.stringify(parDeLaVista([2, 5])) === '[2,5]');
  comprobar('el doble salta 0,25 s de más; un par corriente no', saltoDelDoble([4, 4], 0.125) > 0 && saltoDelDoble([4, 5], 0.125) === 0 && saltoDelDoble([4, 4], 0.3) === 0);
}

// ---------------------------------------------------------------------------
paso('La cámara: las cuatro esquinas caen en el lienzo en 16:9, 3:4 y 9:19,5; de cerca, una casilla llena casi la mitad');
// ---------------------------------------------------------------------------

{
  const ESQUINAS_DEL_ANILLO: Punto[] = [
    { x: MEDIO_LADO, z: MEDIO_LADO },
    { x: -MEDIO_LADO, z: MEDIO_LADO },
    { x: -MEDIO_LADO, z: -MEDIO_LADO },
    { x: MEDIO_LADO, z: -MEDIO_LADO },
  ];
  const ventanas = [
    { nombre: '16:9', ancho: 1920, alto: 1080 },
    { nombre: '3:4', ancho: 768, alto: 1024 },
    /* El móvil de 9:19,5 con el lienzo al 58 % del alto: 390 × (845 · 0,58). */
    { nombre: '9:19,5 al 58 %', ancho: 390, alto: Math.round(845 * 0.58) },
  ];
  const fuera: string[] = [];
  const margenes: string[] = [];
  for (const v of ventanas) {
    const ventana = { ancho: v.ancho, alto: v.alto, franjaInferior: 0 };
    const pose = poseDelBurgo(poseDeSalida(ventana), MIRADOR_DEL_BURGO, ventana);
    const aspecto = v.ancho / v.alto;
    for (const e of ESQUINAS_DEL_ANILLO) {
      const p = proyecta(pose, aspecto, { x: e.x, y: 0, z: e.z });
      if (!p.delante || Math.abs(p.x) > 0.97 || Math.abs(p.y) > 0.97) fuera.push(`${v.nombre} (${e.x}, ${e.z}): ${r(p.x)}, ${r(p.y)}`);
      margenes.push(`${v.nombre} (${e.x},${e.z})→(${r(p.x)},${r(p.y)})`);
    }
  }
  console.log(`  esquinas proyectadas: ${margenes.join('  ')}`);
  comprobar('las cuatro esquinas (±50, ±50) caen dentro del lienzo en 16:9', fuera.filter((f) => f.startsWith('16:9')).length === 0, fuera);
  comprobar('y en 3:4', fuera.filter((f) => f.startsWith('3:4')).length === 0, fuera);
  comprobar('y en 9:19,5 con el lienzo al 58 % del alto', fuera.filter((f) => f.startsWith('9:19,5')).length === 0, fuera);

  /* Vacuna: con la mitad del alcance, en 16:9 alguna esquina se sale. */
  const ventana = { ancho: 1920, alto: 1080, franjaInferior: 0 };
  const corta = poseDelBurgo({ factor: 0.5, centro: { x: 0, z: 0 } }, MIRADOR_DEL_BURGO, ventana);
  const seSale = ESQUINAS_DEL_ANILLO.some((e) => {
    const p = proyecta(corta, 16 / 9, { x: e.x, y: 0, z: e.z });
    return !p.delante || Math.abs(p.x) > 0.97 || Math.abs(p.y) > 0.97;
  });
  comprobar('se ve fallar: a la mitad de la distancia alguna esquina se sale del lienzo', seSale);

  /* A masCerca, una casilla ocupa al menos el 45 % del alto. */
  const m = marcoDeCasilla(5);
  const cerca = poseDelBurgo({ factor: LIMITES_DEL_BURGO.masCerca, centro: { x: m.centro.x, z: m.centro.z } }, MIRADOR_DEL_BURGO, ventana);
  const ys = [ACERA.desde, SOLAR.hasta].map((radial) => proyecta(cerca, 16 / 9, { x: m.centro.x + m.fuera.x * (radial - LINEA_MEDIA_DE_LA_CALLE), y: 0, z: m.centro.z + m.fuera.z * (radial - LINEA_MEDIA_DE_LA_CALLE) }).y);
  const alto = Math.abs((ys[0] as number) - (ys[1] as number)) / 2;
  comprobar(`a masCerca (${LIMITES_DEL_BURGO.masCerca}) una casilla ocupa al menos el 45 % del alto del lienzo`, alto >= 0.45, r(alto));
  comprobar('el alcance es 66: medio lado por 1,32', ALCANCE_DEL_BURGO === 66);

  /* Seguir: converge al que mueve. */
  let c = poseDeSalida(ventana);
  for (let i = 0; i < 300; i++) c = seguir(c, { x: 20, z: -10 }, 1 / 60);
  comprobar('seguir al que mueve converge en cinco segundos a 0,42 sobre él', Math.abs(c.factor - 0.42) < 0.01 && Math.abs(c.centro.x - 20) < 0.3 && Math.abs(c.centro.z + 10) < 0.3, c);
}

// ---------------------------------------------------------------------------
paso('Los dos .tsx de la escena y el tinte: lo que se puede medir sin abrir un lienzo');
// ---------------------------------------------------------------------------

/*
 * `Burgo.tsx` y `Aventurero.tsx` importan `three` y JSX, así que no se montan aquí; lo
 * que sí se puede leer es su FUENTE: que no traigan drei, DOM, Expo, fetch ni `Platform`
 * (ya barridos arriba con el resto de la carpeta), que lleven `import * as React` (los
 * carga `tsx` con el runtime clásico y sin él revientan sólo en la batería), que no
 * usen `matrizDePuesta` (multiplica por `ESCALA_DEL_PACK`, y el `.glb` del Burgo ya va
 * horneado a escala), que las posiciones vayan como ternas y no como `Vector3` en props,
 * que el asa de los dados se DESMONTE con `porTirar` en vez de esconderse, y que el
 * `useFrame` de la cámara no pida prioridad (r3f dejaría de pintar solo). Y de
 * `tinte-del-burgo.ts`, que sí se importa (sólo `three`, sin React), la regla del gris.
 */
{
  const fuenteDe = (f: string): string => fs.readFileSync(path.join(CARPETA, f), 'utf8');
  const burgo = fuenteDe('Burgo.tsx');
  const aventurero = fuenteDe('Aventurero.tsx');
  const codigoDelBurgo = sinComentarios(burgo);
  const codigoDelAventurero = sinComentarios(aventurero);
  comprobar('Burgo.tsx y Aventurero.tsx existen', burgo.length > 0 && aventurero.length > 0);
  comprobar('los dos llevan `import * as React`', /import \* as React from 'react'/.test(codigoDelBurgo) && /import \* as React from 'react'/.test(codigoDelAventurero));
  comprobar('ninguno decide por Platform.OS', !/Platform\.OS/.test(codigoDelBurgo) && !/Platform\.OS/.test(codigoDelAventurero));
  comprobar('Burgo.tsx no usa matrizDePuesta (la escala va horneada en el .glb)', !/\bmatrizDePuesta\s*\(/.test(codigoDelBurgo));
  /* Una posición, rotación o escala de JSX empieza por `[`: es una terna, no un Vector3 ni un objeto de otra copia de three. */
  const CON_VECTOR = /(position|rotation|scale)=\{\s*(?!\[)[^}]*\}/;
  const CON_PRIORIDAD = /useFrame\([\s\S]*?\},\s*-?\d+\s*\)/;
  comprobar('ninguna posición, rotación ni escala de JSX recibe algo que no sea una terna', !CON_VECTOR.test(codigoDelBurgo) && !CON_VECTOR.test(codigoDelAventurero));
  comprobar('el asa de los dados se desmonta con porTirar, no se esconde', /porTirar === true \? \(/.test(codigoDelBurgo) && !/visible=\{[^}]*porTirar/.test(codigoDelBurgo));
  comprobar('ningún useFrame pide prioridad: r3f dejaría de pintar solo', !CON_PRIORIDAD.test(codigoDelBurgo) && !CON_PRIORIDAD.test(codigoDelAventurero));
  comprobar('computeBoundingSphere se llama tras escribir matrices instanciadas', (codigoDelBurgo.match(/computeBoundingSphere\(\)/g) ?? []).length >= 3);
  comprobar('alEstarListo se avisa desde el hilo de dibujo con tope de quince segundos', /TOPE_DE_ARRANQUE_MS = 15_000/.test(codigoDelBurgo) && /alEstarListo\?\.\(\)/.test(codigoDelBurgo));
  comprobar('el modo tercera-persona se ignora a sabiendas y la cabecera lo dice', /tercera-persona/.test(burgo) && !/tercera-persona/.test(codigoDelBurgo));
  comprobar('Aventurero.tsx nunca pide t-pose ni reproduce sin marioneta', !/tPose|t-pose/.test(codigoDelAventurero) && /marioneta === null\) return/.test(codigoDelAventurero));
  /* Vacunas del barrido: un fuente sin React, con Vector3 en props o con prioridad en useFrame. */
  comprobar('se ve fallar: un fuente con `position={new THREE.Vector3()}` cae, y una terna pasa', CON_VECTOR.test('<mesh position={new THREE.Vector3(1, 2, 3)} />') && !CON_VECTOR.test('<mesh position={[1, 2, 3]} />'));
  comprobar('se ve fallar: un `useFrame(() => {}, 1)` cae', CON_PRIORIDAD.test('useFrame((s) => { s.x; }, 1);'));

  const { grisDeLuminancia, coloresDeLasBanderas, seTineEntera, referenciaDe, AMBAR_DEL_CONCEJO } = await import('../burgo/tinte-del-burgo');
  const { AZUL_DE_LAS_FICHAS } = await import('../burgo/piezas');
  const { AZUL_DEL_PACK } = await import('../embarcadero/piezas');
  const { RELACION_MAXIMA, RELACION_MINIMA, colorTenido } = await import('../embarcadero/tinte');
  const azul: [number, number, number] = [0.02, 0.2, 0.5];
  const gris = grisDeLuminancia(azul, AZUL_DE_LAS_FICHAS);
  comprobar('el gris de luminancia de un azul medio ronda 1', gris > 0.7 && gris < 1.4, gris);
  comprobar('y está acotado a [0,25, 1,75] por arriba y por abajo', grisDeLuminancia([0, 0, 0], AZUL_DE_LAS_FICHAS) === RELACION_MINIMA && grisDeLuminancia([1, 1, 1], AZUL_DE_LAS_FICHAS) === RELACION_MAXIMA);
  const asiento: [number, number, number] = [0.6, 0.3, 0.1];
  const tenido = colorTenido(azul, asiento, AZUL_DE_LAS_FICHAS);
  comprobar('asiento × gris es exactamente lo que da colorTenido, canal a canal (antes del recorte a 1)', Math.abs(tenido[0] - Math.min(1, asiento[0] * gris)) < 1e-9 && Math.abs(tenido[1] - Math.min(1, asiento[1] * gris)) < 1e-9 && Math.abs(tenido[2] - Math.min(1, asiento[2] * gris)) < 1e-9);
  comprobar('la casa y el peón se tiñen enteros; la bandera no', seTineEntera(PIEZA.casa) && seTineEntera(PIEZA.peon) && !seTineEntera(PIEZA.bandera));
  comprobar('la casa se mide contra el azul de las fichas y la bandera contra el del hexagonal', referenciaDe(PIEZA.casa) === AZUL_DE_LAS_FICHAS && referenciaDe(PIEZA.bandera) === AZUL_DEL_PACK);
  const colores = coloresDeLasBanderas(['#26262e', '#f2e8cf', '#26262e', '#7d3fd6']);
  comprobar('las banderas van por color: sin repetir, con el ámbar del Concejo y en orden estable', colores.length === 4 && colores.includes(AMBAR_DEL_CONCEJO) && colores.join() === [...colores].sort().join());
  comprobar('seis asientos y el ámbar son como mucho siete mallas de bandera', coloresDeLasBanderas(['#1', '#2', '#3', '#4', '#5', '#6']).length === 7);
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log('');
}

/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS». Ver `verificar-escena.ts`: un guion que se cae
 * a la mitad termina con código cero y una lista corta de aciertos. El número va a mano,
 * con margen, y hay que subirlo al añadir comprobaciones.
 */
const COMPROBACIONES_ESCRITAS = 115;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(`Solo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones que tiene escritas este guion: se ha caído por el camino sin decirlo. Si has añadido comprobaciones nuevas, sube el número.`);
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(`${hechas} comprobaciones`);
  console.log(
    '\nLa aritmética del Burgo cuadra con el fichero real: cada rejilla de huecos cabe en su banda\n' +
      'con la huella medida, ningún solar pasa de 7,6 de frente ni de 9 de fondo (la ribera entra en\n' +
      'el agua a sabiendas), las cuatro puertas de la muralla quedan enfrente de las casillas 5, 15,\n' +
      '25 y 35, la polilínea tiene 40 puntos con las esquinas en ±43,25, el tablero lleno cabe en el\n' +
      'presupuesto en las dos calidades, el peón anda diez mil pasos sin T-pose y sin salirse de la\n' +
      'polilínea, doce casillas caben en 8 s, una jugada real en 14, los dados obedecen al par y las\n' +
      'cuatro esquinas caen en el lienzo en las tres ventanas. Lo que esto NO prueba es que se vea bien.',
  );
  process.exit(0);
}

process.exit(1);
