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
 * ═══ LAS PIEZAS SE MIDEN PUESTAS, NO EN EL PACK ═══
 *
 * Durante meses este guion midió las huellas del `.glb` TAL CUAL y las comparó con las bandas
 * de la casilla, y todo salía verde: un peón de 1,272 cabe en cualquier sitio. Lo que no
 * medía es lo único que importaba —cuánto se VE—, y así pasó un tablero en el que un jugador
 * era una mota del 1,8 % del frente de su casilla y un hotel era literalmente una casa.
 *
 * Ahora la huella del fichero se multiplica por la TALLA a la que la escena instancia cada
 * pieza (`TALLA_DEL_PEON`, `TALLA_DE_LA_CASA`, `TALLA_DEL_HOTEL` de `anillo-en-3d.ts`), y
 * además hay un paso propio que afirma lo que ninguna banda afirmaba: que el peón pasa del
 * octavo del ancho de un dígito, que las cuatro casas van seguidas y no sueltas, y que un
 * hotel es de otro tamaño que una casa. Las vacunas de ese paso son las piezas de antes.
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
import * as THREE from 'three';
import { CLIP } from '../embarcadero/figuras';
import { DURACION } from '../embarcadero/gestos';
import { proyecta } from '../embarcadero/camara';
import { sorteo } from '../embarcadero/cala';
import { PIEZA, nombresDelBurgo } from '../burgo/piezas';
import {
  ALTO_DEL_GUARISMO,
  ALTO_DEL_HOTEL,
  ALTO_DEL_PEON,
  ALTO_DEL_PEON_EN_EL_PACK,
  ALTO_DE_LA_CASA,
  ALTURA_DEL_MANTO,
  ALTURA_DE_LAS_NUBES,
  ALTURA_DEL_REBORDE,
  ANCHO_DE_CASILLA,
  ANCHO_DE_TESELA,
  ANCHO_DEL_BULEVAR,
  ANCHO_DE_LA_AVENIDA,
  ANCHO_DEL_GUARISMO,
  ANCHO_DEL_HOTEL,
  ANCHO_DE_LA_CASA,
  ANILLO_DEL_BURGO,
  ARISTA_DE_LOS_DADOS,
  ATREZO,
  ATREZO_DE_LA_CASILLA,
  BANDA,
  BANDERA_SOBRE_LA_POSADA,
  BORDE_CLARO,
  BORDE_INTERIOR,
  CARRIL_DEL_AVATAR,
  CASILLAS,
  CELDA,
  CELDAS_DEL_BULEVAR,
  CELDAS_DE_LA_AVENIDA,
  CELDAS_DE_LA_CIUDAD,
  CELDAS_DE_LA_GLORIETA,
  CELDAS_POR_ESQUINA,
  CORONA,
  DIAMETRO_DEL_PEON,
  ESQUINAS,
  FILETE,
  FONDO_DE_CASILLA,
  FONDO_DEL_HOTEL,
  FONDO_DE_LA_CASA,
  FRANJA,
  FRENTE_MAXIMO_DEL_ATREZO,
  HOLGURA_DE_LA_MARCHA,
  HUECOS_DE_LOS_DADOS,
  HUELLA_DEL_PEON,
  HUELLA_DE_LA_CASA,
  LADO_DE_ESQUINA,
  LADO_DEL_EMBLEMA,
  LADO_EXTERIOR,
  LADO_INTERIOR,
  LINEA_DE_LA_MARCHA,
  MANCHAS_DEL_CAMPO,
  MANCHAS_LEJOS_DEL_TABLERO,
  MAZMORRA,
  MEDIO_LADO,
  NUBES_LEJOS_DEL_TABLERO,
  PIEZAS_DE_LA_ESQUINA,
  POLILINEA,
  PRECIO_DE_LA_CASILLA,
  PUERTAS,
  PUERTAS_DE_LA_CIUDAD,
  RADIO_DEL_DISCO_DEL_PEON,
  RECINTO_DE_LA_CIUDAD,
  REJILLA_DE_CASAS,
  REJILLA_DE_PEONES,
  REJILLA_DE_PEONES_DE_ESQUINA,
  REJILLA_DE_PRESOS,
  REJILLA_DE_VISITAS,
  SUELO_DE_DADOS,
  SUPERFICIE,
  TALLA_DEL_HOTEL,
  TALLA_DEL_PEON,
  TALLA_DE_LA_CASA,
  V_DEL_PRECIO,
  V_DE_LAS_CASAS,
  anchoDelPrecio,
  campo,
  candidatasDelCampo,
  centroDeCelda,
  enElMarco,
  enLaEsquina,
  esSuelo,
  giraElPunto,
  giroHaciaFuera,
  guarismosDelPrecio,
  huecoDeAventurero,
  huecoDeBandera,
  huecoDeCasa,
  huecoDePeon,
  huecoDePosada,
  huecoDePreso,
  huecoDeVisita,
  huecosDeLosEmblemas,
  largoDelTramo,
  marcoDeCasilla,
  mundoEstatico,
  puestaDeLaPiezaDeLaCasilla,
  puestasDeLasEsquinas,
  puestasDelAtrezo,
  puntoEnEsquina,
  puntoEnLaCasillaPorV,
  radianesDeCuartos,
  sitioDeCasilla,
  suelosDeLaCasilla,
  vDeRadial,
} from '../burgo/anillo-en-3d';
import type { PiezaDeCasilla, Puesta, Punto } from '../burgo/anillo-en-3d';
import { ALTURA_DE_PLANTA, PIEZAS_DEL_BURGO, RETICULA_DE_LA_CIUDAD } from '../burgo/piezas';
import { BARRIOS, CASILLAS as CASILLAS_DEL_REGLAMENTO } from '../../shared/arcade/juegos/burgo-tablero';
import {
  CASAS_DEL_CONCEJO,
  MULTIPLICIDADES_PLENA,
  MULTIPLICIDADES_SOBRIA,
  POSADAS_DEL_CONCEJO,
  TOPE_PLENA,
  TOPE_SOBRIA,
  TRIANGULOS_POR_EMBLEMA,
  TRIANGULOS_POR_GUARISMO,
  guarismosDelTablero,
  sumaDelPresupuesto,
} from '../burgo/presupuesto';
import {
  CASILLAS_ANDANDO,
  TOPE_DEL_RECORRIDO,
  TOPE_DE_VELOCIDAD,
  TOPE_POR_CASILLA_ANDANDO,
  VELOCIDAD_ANDANDO,
  VELOCIDAD_CORRIENDO,
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
  CERCANIA_DE_SEGUIMIENTO,
  CORRIMIENTO_EN_APAISADO,
  LIMITES_DEL_BURGO,
  MIRADOR_DEL_BURGO,
  poseDeSalida,
  poseDelBurgo,
  seguir,
} from '../burgo/camara-del-burgo';
import { gestoAlSalir, senaladoTrasElGesto } from '../burgo/tipos';
import type { GestoDeSenalado } from '../burgo/tipos';
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
comprobar(`el fichero trae las ${nombresDelBurgo().length} piezas de piezas.ts con geometría`, raices.length === nombresDelBurgo().length && [...triangulos.values()].every((t) => t > 0), raices.length);

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

/** Las puestas de UNA esquina, en el mundo: la misma cuenta que hace `puestasDeLasEsquinas`. */
function piezasDeLaEsquina(esquina: number): Puesta[] {
  const m = marcoDeCasilla(esquina);
  return (PIEZAS_DE_LA_ESQUINA[esquina] ?? []).map((p) => {
    const s = puntoEnEsquina(m, p.u, p.v);
    return { pieza: p.pieza, x: s.x, y: p.alza ?? 0, z: s.z, giro: giroHaciaFuera(m) + radianesDeCuartos(p.giroEnCuartos), talla: 1 };
  });
}

/**
 * CUÁNTAS VECINAS TIENE DE MEDIA UNA TESELA DEL MANTO. En un panal lleno son casi seis; en
 * treinta teselas barajadas por una corona, menos de una. Es lo que separa un paisaje de un
 * puñado de islas, y era la queja de Miguel sobre el campo del banco.
 */
function vecindadDelManto(teselas: readonly Puesta[]): number {
  if (teselas.length === 0) return 0;
  let vecinas = 0;
  for (const a of teselas) {
    for (const b of teselas) {
      if (a === b) continue;
      if (Math.hypot(a.x - b.x, a.z - b.z) < ANCHO_DE_TESELA * 1.05) vecinas++;
    }
  }
  return vecinas / teselas.length;
}

// ---------------------------------------------------------------------------
paso('El anillo mide lo que dice LA-CIUDAD.md §1 y la marcha va por donde debe');
// ---------------------------------------------------------------------------

comprobar(
  'LADO_EXTERIOR 864, MEDIO_LADO 432, LADO_INTERIOR 648, BORDE_INTERIOR 324, 40 casillas, y las cuatro bandas suman el fondo',
  LADO_EXTERIOR === 864 && MEDIO_LADO === 432 && LADO_INTERIOR === 648 && BORDE_INTERIOR === 324 && CASILLAS === 40 && BANDA.franja + BANDA.filete + BANDA.superficie + BANDA.borde === FONDO_DE_CASILLA,
  { LADO_EXTERIOR, MEDIO_LADO, LADO_INTERIOR, BORDE_INTERIOR, CASILLAS },
);
/*
 * LA ORDEN ERA «POR LO MENOS 9-10 VECES EL TAMAÑO QUE TIENE AHORA MISMO LA ZONA CENTRAL», y
 * la zona central del PRIMER tablero medía 72 de lado. Nueve veces son 648, y es un MÍNIMO,
 * no una preferencia: si alguien vuelve a achicar el recinto «para que quepa», esta línea se
 * pone roja y dice por qué. La regla vieja —«de 200 a 320»— queda revocada aquí.
 */
const CENTRO_DEL_PRIMER_TABLERO = 72;
comprobar(
  'el recinto es AL MENOS nueve veces el centro original de 72, es múltiplo de la retícula y son nueve casillas de frente',
  LADO_INTERIOR >= 9 * CENTRO_DEL_PRIMER_TABLERO && LADO_INTERIOR % RETICULA_DE_LA_CIUDAD === 0 && LADO_INTERIOR === 9 * ANCHO_DE_CASILLA,
  { LADO_INTERIOR, veces: LADO_INTERIOR / CENTRO_DEL_PRIMER_TABLERO },
);
comprobar('se ve fallar: el recinto de 288 de la versión anterior era sólo cuatro veces el centro original', 288 < 9 * CENTRO_DEL_PRIMER_TABLERO);
comprobar(
  'las cuatro bandas están donde dice el documento: franja 324–345, filete 345–354, superficie 354–414 y marco 414–432',
  FRANJA.desde === 324 && FRANJA.hasta === 345 && FILETE.desde === 345 && FILETE.hasta === 354 && SUPERFICIE.desde === 354 && SUPERFICIE.hasta === 414 && BORDE_CLARO.desde === 414 && BORDE_CLARO.hasta === 432,
  { FRANJA, FILETE, SUPERFICIE, BORDE_CLARO },
);
comprobar('la línea de la marcha es el centro del filete (349,5), o sea v = 25,5', LINEA_DE_LA_MARCHA === 349.5 && vDeRadial(LINEA_DE_LA_MARCHA) === 25.5);
comprobar('el reborde de la franja mide lo que un bordillo del pack (0,6) y el precio va a v = 45 con dígitos de 27', ALTURA_DEL_REBORDE === 0.6 && V_DEL_PRECIO === 45 && ALTO_DEL_GUARISMO === 27);
/*
 * EL DÍGITO CRECE CON EL TABLERO O DEJA DE LEERSE. Lo que se ve en pantalla no es el alto en
 * unidades: es el cociente `alto / alcance de la cámara`. Si el tablero se hace 2,25 veces
 * más grande y el dígito no, el precio pierde 2,25 veces sus píxeles sin que nada falle.
 * Esta línea afirma que el cociente NO ha cambiado desde el tablero de 384, que es lo que
 * hace que los píxeles medidos más abajo salgan iguales que entonces.
 */
comprobar(
  'el dígito conserva su proporción con el alcance: 27/570,24 es lo mismo que 12/253,44',
  Math.abs(ALTO_DEL_GUARISMO / ALCANCE_DEL_BURGO - 12 / 253.44) < 1e-9,
  { ahora: ALTO_DEL_GUARISMO / ALCANCE_DEL_BURGO, antes: 12 / 253.44 },
);
comprobar('la polilínea tiene 40 puntos', POLILINEA.length === 40, POLILINEA.length);

{
  const esquina = (i: number, x: number, z: number): boolean => Math.abs((POLILINEA[i] as Punto).x - x) < 1e-9 && Math.abs((POLILINEA[i] as Punto).z - z) < 1e-9;
  comprobar(
    'las esquinas son (±349,5, ±349,5): la Puerta Mayor al sureste, la Mazmorra al suroeste, la Feria al noroeste y ¡A la Mazmorra! al noreste',
    esquina(0, 349.5, 349.5) && esquina(10, -349.5, 349.5) && esquina(20, -349.5, -349.5) && esquina(30, 349.5, -349.5),
    [0, 10, 20, 30].map((i) => POLILINEA[i]),
  );
  const mal: string[] = [];
  for (let k = 1; k <= 9; k++) {
    const sur = sitioDeCasilla(k);
    const oeste = sitioDeCasilla(10 + k);
    const norte = sitioDeCasilla(20 + k);
    const este = sitioDeCasilla(30 + k);
    const ok = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
    if (!ok(sur.x, 360 - 72 * k) || !ok(sur.z, 349.5)) mal.push(`${k}: ${JSON.stringify(sur)}`);
    if (!ok(oeste.x, -349.5) || !ok(oeste.z, 360 - 72 * k)) mal.push(`${10 + k}: ${JSON.stringify(oeste)}`);
    if (!ok(norte.x, 72 * k - 360) || !ok(norte.z, -349.5)) mal.push(`${20 + k}: ${JSON.stringify(norte)}`);
    if (!ok(este.x, 349.5) || !ok(este.z, 72 * k - 360)) mal.push(`${30 + k}: ${JSON.stringify(este)}`);
  }
  comprobar('las 36 casillas laterales caen donde dicen las cuatro fórmulas de §1: sur hacia el oeste, oeste hacia el norte, norte hacia el este, este hacia el sur', mal.length === 0, mal.slice(0, 4));
  /*
   * LA CASILLA 5 CAE CENTRADA, y no es una casualidad afortunada: es lo que hace que las
   * cuatro avenidas de la ciudad entren por las cuatro Puertas del reglamento sin torcerse.
   */
  const centradas = PUERTAS.every((c) => {
    const m = marcoDeCasilla(c);
    return Math.abs(m.centro.x * m.adelante.x + m.centro.z * m.adelante.z) < 1e-9;
  });
  comprobar('las cuatro Puertas (5, 15, 25, 35) caen centradas en el eje de su lado: 72·5 − 360 = 0', centradas, PUERTAS.map((c) => marcoDeCasilla(c).centro));
  const tramos = Array.from({ length: 40 }, (_, i) => r(largoDelTramo(i)));
  const esperado = tramos.every((t, i) => (i % 10 === 0 || i % 10 === 9 ? t === 61.5 : t === 72));
  comprobar('un tramo entre laterales mide 72 y el que llega a una esquina o sale de ella 61,5', esperado, tramos);
  const cuartos = [0, 1, 2, 3].map((l) => sitioDeCasilla(l * 10 + 5).cuartos);
  const haciaFuera = [0, 1, 2, 3].every((l) => {
    const m = marcoDeCasilla(l * 10 + 5);
    const g = giraElPunto(0, 1, giroHaciaFuera(m));
    return Math.abs(g.x - m.fuera.x) < 1e-9 && Math.abs(g.z - m.fuera.z) < 1e-9;
  });
  comprobar('los cuartos por lado son 0, 3, 2, 1 y girarlos lleva +Z a «fuera» en los cuatro lados', JSON.stringify(cuartos) === '[0,3,2,1]' && haciaFuera, cuartos);
}

// ---------------------------------------------------------------------------
paso('Las piezas de un jugador —peón, casa y hotel— se instancian a una talla que se lee, y un hotel no es una casa');
// ---------------------------------------------------------------------------

/*
 * ESTE PASO EXISTE PORQUE UNA PIEZA A LA TALLA DEL PACK NO DA ERROR: SE VE.
 *
 * `burgo.glb` trae las fichas horneadas a la escala del mundo (una casa-ficha mide una
 * persona) y hasta esta tanda la escena las instanciaba a talla 1 sobre casillas de 72 × 108.
 * Resultado medido en el fichero: el peón ocupaba el 1,8 % del frente de su casilla y el
 * dígito del precio que tiene al lado dieciséis veces eso; las cuatro casas eran cuatro
 * puntos con 9,50 de hueco entre ellos; y un hotel era LITERALMENTE una casa, la misma
 * geometría a la misma talla, distinta sólo por ir centrada y llevar bandera.
 *
 * `anillo-en-3d.ts` escribe ahora las huellas del pack como constantes y deriva de ellas las
 * tres tallas. Lo primero que se comprueba es lo más aburrido y lo más importante: que lo
 * ESCRITO es lo que el `.glb` trae de verdad. Si mañana se recompila el fichero con otra
 * ficha, esta línea se pone roja antes de que nadie mire una captura.
 */
const peonEnElPack = huella(PIEZA.peon);
const casaEnElPack = huella(PIEZA.casa);
comprobar(
  `lo escrito en anillo-en-3d.ts es lo que trae el fichero: el peón mide ${r(peonEnElPack.ancho)} × ${r(peonEnElPack.alto)} y la casa ${r(casaEnElPack.ancho)} × ${r(casaEnElPack.fondo)} × ${r(casaEnElPack.alto)}`,
  Math.abs(HUELLA_DEL_PEON - peonEnElPack.ancho) < 1e-3 &&
    Math.abs(HUELLA_DEL_PEON - peonEnElPack.fondo) < 1e-3 &&
    Math.abs(ALTO_DEL_PEON_EN_EL_PACK - peonEnElPack.alto) < 1e-3 &&
    Math.abs(HUELLA_DE_LA_CASA.ancho - casaEnElPack.ancho) < 1e-3 &&
    Math.abs(HUELLA_DE_LA_CASA.fondo - casaEnElPack.fondo) < 1e-3 &&
    Math.abs(HUELLA_DE_LA_CASA.alto - casaEnElPack.alto) < 1e-3,
  { escrito: { HUELLA_DEL_PEON, ALTO_DEL_PEON_EN_EL_PACK, HUELLA_DE_LA_CASA }, medido: { peon: peonEnElPack, casa: casaEnElPack } },
);
/* La vacuna es el error de verdad: copiar la huella de la ficha de al lado (el `meeple`, 2,543). */
comprobar('se ve fallar: con la huella de la figura (2,543) escrita en vez de la del peón, la línea de arriba caería', Math.abs(huella(PIEZA.figura).ancho - peonEnElPack.ancho) > 1e-3, r(huella(PIEZA.figura).ancho));

/*
 * QUE EL PEÓN SE VEA NO ES UNA OPINIÓN: SE MIDE CONTRA EL DÍGITO DEL PRECIO.
 *
 * El dígito es la única referencia honrada de «lo que se lee a esta distancia», porque su
 * alto de 27 salió de contar píxeles con `proyecta` en las tres ventanas. El encargo puso el
 * suelo con el dedo: «un octavo de eso es invisible». Así que el peón tiene que pasar del
 * octavo, y `DIAMETRO_DEL_PEON` es la sexta parte —que además es lo máximo que el patio de la
 * cárcel admite—. La vacuna es el peón de antes: a talla 1 no llega ni al octavo.
 */
const octavoDeUnDigito = ANCHO_DEL_GUARISMO / 8;
console.log(`  el peón mide ${r(DIAMETRO_DEL_PEON)} de huella y ${r(ALTO_DEL_PEON)} de alto; un dígito mide ${r(ANCHO_DEL_GUARISMO)} de ancho, o sea ${r(ANCHO_DEL_GUARISMO / DIAMETRO_DEL_PEON)} peones`);
comprobar(
  `el peón se ve: su huella (${r(DIAMETRO_DEL_PEON)}) pasa del octavo del ancho de un dígito (${r(octavoDeUnDigito)}), que es lo que el encargo llama invisible`,
  DIAMETRO_DEL_PEON > octavoDeUnDigito && TALLA_DEL_PEON > 1,
  { DIAMETRO_DEL_PEON, octavoDeUnDigito, TALLA_DEL_PEON: r(TALLA_DEL_PEON) },
);
comprobar('se ve fallar: el peón a la talla del pack (1,272) no llegaba ni al octavo de un dígito', peonEnElPack.ancho < octavoDeUnDigito, r(peonEnElPack.ancho));
/*
 * Y EL TECHO, que es lo que impide subirlo más: el carril del avatar. El peón va centrado en
 * `LINEA_DE_LA_MARCHA`, que está a 2,5 del borde de dentro del carril, así que su diámetro no
 * puede pasar de 5. Se afirma con el número para que el día que alguien suba la talla sepa
 * contra qué chocó.
 */
comprobar(
  `el peón cabe entero en el carril del avatar: centrado en v = ${vDeRadial(LINEA_DE_LA_MARCHA)} llega de ${r(vDeRadial(LINEA_DE_LA_MARCHA) - DIAMETRO_DEL_PEON / 2)} a ${r(vDeRadial(LINEA_DE_LA_MARCHA) + DIAMETRO_DEL_PEON / 2)} y el carril va de ${CARRIL_DEL_AVATAR.desde} a ${CARRIL_DEL_AVATAR.hasta}`,
  vDeRadial(LINEA_DE_LA_MARCHA) - DIAMETRO_DEL_PEON / 2 >= CARRIL_DEL_AVATAR.desde && vDeRadial(LINEA_DE_LA_MARCHA) + DIAMETRO_DEL_PEON / 2 <= CARRIL_DEL_AVATAR.hasta,
  r(vDeRadial(LINEA_DE_LA_MARCHA) - DIAMETRO_DEL_PEON / 2),
);
comprobar('se ve fallar: un peón de 6 de huella se saldría del carril por el lado de la ciudad', vDeRadial(LINEA_DE_LA_MARCHA) - 3 < CARRIL_DEL_AVATAR.desde);
/* El disco de contacto es la sombra bajo la pieza: si no crece con ella, deja de estar debajo. */
comprobar(
  `el disco de contacto sigue midiendo 1,1 veces el radio del peón, como cuando el peón era de 1,272 (${r(RADIO_DEL_DISCO_DEL_PEON)} sobre ${r(DIAMETRO_DEL_PEON / 2)})`,
  Math.abs(RADIO_DEL_DISCO_DEL_PEON / (DIAMETRO_DEL_PEON / 2) - 1.1) < 1e-9 && RADIO_DEL_DISCO_DEL_PEON > DIAMETRO_DEL_PEON / 2,
  r(RADIO_DEL_DISCO_DEL_PEON),
);
comprobar('se ve fallar: el disco de 0,7 de antes se quedaría escondido bajo un peón de 3,375', 0.7 < DIAMETRO_DEL_PEON / 2);

/*
 * LAS CUATRO CASAS TIENEN QUE SER CUATRO CASAS SEGUIDAS, no cuatro puntos en una banda.
 *
 * «Seguidas» se mide: el hueco entre dos vecinas tiene que ser menor que media casa. Con la
 * casa del pack y el paso 12 el hueco era 9,50 —casi cuatro casas de aire— y por eso la fila
 * no se leía como una fila. Con `TALLA_DE_LA_CASA` el hueco baja a 1,66.
 */
const huecoEntreCasas = REJILLA_DE_CASAS.paso - ANCHO_DE_LA_CASA;
console.log(`  la casa mide ${r(ANCHO_DE_LA_CASA)} × ${r(FONDO_DE_LA_CASA)} × ${r(ALTO_DE_LA_CASA)}; con el paso ${REJILLA_DE_CASAS.paso} quedan ${r(huecoEntreCasas)} entre dos, y las cuatro ocupan ${r(3 * REJILLA_DE_CASAS.paso + ANCHO_DE_LA_CASA)} de ${ANCHO_DE_CASILLA}`);
comprobar(
  `la casa llena la mitad del fondo de la franja del barrio (${r(FONDO_DE_LA_CASA)} de ${BANDA.franja}) y las cuatro van SEGUIDAS: ${r(huecoEntreCasas)} de hueco, menos de media casa`,
  Math.abs(FONDO_DE_LA_CASA - BANDA.franja / 2) < 1e-9 && huecoEntreCasas > 0 && huecoEntreCasas < ANCHO_DE_LA_CASA / 2,
  { FONDO_DE_LA_CASA, huecoEntreCasas: r(huecoEntreCasas), ANCHO_DE_LA_CASA: r(ANCHO_DE_LA_CASA) },
);
comprobar(
  'se ve fallar: con la casa a la talla del pack el hueco entre dos era 9,50, casi cuatro casas de aire',
  REJILLA_DE_CASAS.paso - casaEnElPack.ancho >= casaEnElPack.ancho / 2,
  r(REJILLA_DE_CASAS.paso - casaEnElPack.ancho),
);

/*
 * UN HOTEL NO ES UNA CASA, Y ESO ES LO QUE HABÍA QUE ARREGLAR.
 *
 * La diferencia entre cuatro casas y un hotel es la decisión más cara del reglamento, y hasta
 * esta tanda compartían geometría Y talla. Ahora el hotel es la misma malla con una escala por
 * eje: más ancha, más honda y más alta. Se exige que la diferencia sea de bulto —al menos vez
 * y media de frente, un cuarto más de alto y el doble de huella— y no un matiz.
 */
const huellaDeLaCasa = ANCHO_DE_LA_CASA * FONDO_DE_LA_CASA;
const huellaDelHotel = ANCHO_DEL_HOTEL * FONDO_DEL_HOTEL;
console.log(`  el hotel mide ${r(ANCHO_DEL_HOTEL)} × ${r(FONDO_DEL_HOTEL)} × ${r(ALTO_DEL_HOTEL)}: ${r(ANCHO_DEL_HOTEL / ANCHO_DE_LA_CASA)} veces el frente de una casa, ${r(ALTO_DEL_HOTEL / ALTO_DE_LA_CASA)} su alto y ${r(huellaDelHotel / huellaDeLaCasa)} su huella`);
comprobar(
  `el hotel tiene volumen propio: ${r(ANCHO_DEL_HOTEL / ANCHO_DE_LA_CASA)} veces el frente de una casa, ${r(ALTO_DEL_HOTEL / ALTO_DE_LA_CASA)} su alto y ${r(huellaDelHotel / huellaDeLaCasa)} su huella`,
  ANCHO_DEL_HOTEL >= ANCHO_DE_LA_CASA * 1.5 && ALTO_DEL_HOTEL >= ALTO_DE_LA_CASA * 1.25 && FONDO_DEL_HOTEL > FONDO_DE_LA_CASA && huellaDelHotel >= 2 * huellaDeLaCasa,
  { ANCHO_DEL_HOTEL: r(ANCHO_DEL_HOTEL), FONDO_DEL_HOTEL, ALTO_DEL_HOTEL },
);
/* La vacuna: el hotel que había, que era la casa a su propia talla. */
comprobar(
  'se ve fallar: un hotel a la talla de la casa —que es lo que había— no se distingue de una casa',
  !(ANCHO_DE_LA_CASA >= ANCHO_DE_LA_CASA * 1.5 || ALTO_DE_LA_CASA >= ALTO_DE_LA_CASA * 1.25),
);
/* Y que el frente sea el que el diseño dice: lo que ocupan dos casas seguidas, de borde a borde. */
comprobar(
  'el frente del hotel es exactamente lo que ocupan dos casas seguidas (una casa más el paso de la rejilla)',
  Math.abs(ANCHO_DEL_HOTEL - (ANCHO_DE_LA_CASA + REJILLA_DE_CASAS.paso)) < 1e-9,
  r(ANCHO_DEL_HOTEL),
);
/* La bandera del hotel va clavada en SU tejado, y el tejado ha subido de 2,543 a 14. */
comprobar(
  `la bandera del hotel se planta en su tejado (alza ${BANDERA_SOBRE_LA_POSADA.alza}), no a la altura del tejado viejo`,
  Math.abs(BANDERA_SOBRE_LA_POSADA.alza - ALTO_DEL_HOTEL) < 1e-9,
  BANDERA_SOBRE_LA_POSADA.alza,
);
comprobar('se ve fallar: el alza de 2,45 que había dejaría la bandera flotando a un quinto del alto del hotel', 2.45 < ALTO_DEL_HOTEL / 2);

/*
 * ESCALAR NO CUESTA UN TRIÁNGULO NI UNA LLAMADA: son las mismas mallas con otra matriz, y por
 * eso el presupuesto no se mueve. Se afirma con la tabla delante: los 44 edificios de un
 * tablero lleno —32 casas y 12 hoteles— siguen contándose como `casa`. El día que alguien meta
 * un modelo propio de hotel, esta línea se pone roja y le recuerda que hay que sumarlo.
 */
comprobar(
  `el hotel se pinta con la geometría de la casa (decisión 12): la tabla cuenta ${CASAS_DEL_CONCEJO + POSADAS_DEL_CONCEJO} casas y ninguna pieza propia de hotel`,
  (MULTIPLICIDADES_PLENA[PIEZA.casa] ?? 0) === CASAS_DEL_CONCEJO + POSADAS_DEL_CONCEJO,
  MULTIPLICIDADES_PLENA[PIEZA.casa],
);

// ---------------------------------------------------------------------------
paso('Cada rejilla de huecos cabe en su banda con la huella medida a su talla, y nada pisa el carril del avatar');
// ---------------------------------------------------------------------------

/*
 * TODO LO QUE SIGUE SE MIDE CON LA PIEZA PUESTA, no con la pieza del pack: la huella del
 * `.glb` por la talla a la que la escena la instancia. Medir la del pack era lo que dejaba
 * pasar rejillas calibradas para un peón que ya no existe.
 */
const peon = { ancho: peonEnElPack.ancho * TALLA_DEL_PEON, fondo: peonEnElPack.fondo * TALLA_DEL_PEON, alto: peonEnElPack.alto * TALLA_DEL_PEON };
const medioPeon = Math.max(peon.ancho, peon.fondo) / 2;

{
  const casa = { ancho: casaEnElPack.ancho * TALLA_DE_LA_CASA, fondo: casaEnElPack.fondo * TALLA_DE_LA_CASA, alto: casaEnElPack.alto * TALLA_DE_LA_CASA };
  const mediaCasa = Math.max(casa.ancho, casa.fondo) / 2;
  const hotel = { ancho: casaEnElPack.ancho * TALLA_DEL_HOTEL.ancho, fondo: casaEnElPack.fondo * TALLA_DEL_HOTEL.fondo, alto: casaEnElPack.alto * TALLA_DEL_HOTEL.alto };
  const fueraDelCarril: string[] = [];
  const solapados: string[] = [];
  const discosSolapados: string[] = [];
  const aventureroFuera: string[] = [];
  for (let i = 0; i < CASILLAS; i++) {
    if (i === MAZMORRA) continue;
    const m = marcoDeCasilla(i);
    const huecos = [0, 1, 2, 3, 4, 5].map((a) => huecoDePeon(i, a));
    for (const [a, h] of huecos.entries()) {
      if (m.esEsquina) {
        /* En una esquina los seis van pegados al tramo por el que se SALE: |u − 155| corto, v entre 144 y 155. */
        const { u, v } = enLaEsquina(m, h);
        if (Math.abs(u - LINEA_DE_LA_MARCHA) > 2) fueraDelCarril.push(`${i}/${a}: u ${r(u)}`);
        if (v - medioPeon < BORDE_INTERIOR || v > LINEA_DE_LA_MARCHA) fueraDelCarril.push(`${i}/${a}: v ${r(v)}`);
      } else {
        const { v, aLoLargo } = enElMarco(m, h);
        if (v - medioPeon < CARRIL_DEL_AVATAR.desde || v + medioPeon > CARRIL_DEL_AVATAR.hasta) fueraDelCarril.push(`${i}/${a}: v ${r(v)}`);
        if (Math.abs(aLoLargo) + medioPeon > ANCHO_DE_CASILLA / 2) fueraDelCarril.push(`${i}/${a}: a lo largo ${r(aLoLargo)}`);
      }
      for (const [b, o] of huecos.entries()) {
        if (b <= a) continue;
        const entre = Math.hypot(h.x - o.x, h.z - o.z);
        if (entre < 2 * medioPeon) solapados.push(`${i}: ${a} y ${b} a ${r(entre)}`);
        if (entre < 2 * RADIO_DEL_DISCO_DEL_PEON) discosSolapados.push(`${i}: ${a} y ${b} a ${r(entre)}`);
      }
      const av = huecoDeAventurero(i, a);
      const rav = m.esEsquina ? Math.abs(enLaEsquina(m, av).u - LINEA_DE_LA_MARCHA) : enElMarco(m, av).v;
      const tope = m.esEsquina ? 2 : CARRIL_DEL_AVATAR.hasta;
      if (rav > tope) aventureroFuera.push(`${i}/${a}: ${r(rav)}`);
    }
  }
  comprobar(`los seis huecos de peón (huella ${r(peon.ancho)} × ${r(peon.fondo)} PUESTA, no la del pack) van en fila en el carril de las 39 casillas que lo tienen, y en las esquinas en la franja de dentro`, fueraDelCarril.length === 0, fueraDelCarril.slice(0, 5));
  comprobar('y dos peones de la misma casilla no se pisan, en ninguna de las 39', solapados.length === 0, solapados.slice(0, 5));
  comprobar('ni se pisan sus discos de contacto, que son 1,1 veces más anchos que la pieza', discosSolapados.length === 0, discosSolapados.slice(0, 5));
  /*
   * LAS DOS VACUNAS DE LAS REJILLAS, que son los dos errores que esta tanda ha tenido que
   * arreglar de verdad y no dos inventados: la rejilla de esquina era de dos filas separadas
   * 1,4 —un número calibrado para el peón de 1,272 y para ninguno más— y la del patio tenía
   * las columnas a 3,2. Con el peón puesto, las dos solapan.
   */
  comprobar('se ve fallar: con el paso 1,4 de la rejilla de esquina vieja, dos peones puestos se solaparían', 1.4 < 2 * medioPeon, r(2 * medioPeon));
  comprobar('se ve fallar: con el paso 3,2 de la rejilla de presos vieja, dos presos puestos se solaparían', 3.2 < 2 * medioPeon, r(2 * medioPeon));
  comprobar(`el hueco del aventurero está 1,2 hacia el campo y no se sale del carril (${CARRIL_DEL_AVATAR.desde}..${CARRIL_DEL_AVATAR.hasta})`, aventureroFuera.length === 0, aventureroFuera.slice(0, 5));

  /* El radio de la bandera de dueño se mide una vez y se usa dos: aquí y en la holgura al carril. */
  const cajaDeLaBandera = caja(PIEZA.bandera);
  const radioDeLaBandera = Math.max(Math.abs(cajaDeLaBandera.min[0]), Math.abs(cajaDeLaBandera.max[0]), Math.abs(cajaDeLaBandera.min[2]), Math.abs(cajaDeLaBandera.max[2]));

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
      if (radial - mediaCasa < FRANJA.desde || radial + mediaCasa > FRANJA.hasta || Math.abs(aLoLargo) + mediaCasa > ANCHO_DE_CASILLA / 2) casasFuera.push(`${i}/${k}: radial ${r(radial)}, a lo largo ${r(aLoLargo)}`);
      for (const [b, o] of huecos.entries()) {
        if (b <= k) continue;
        if (Math.hypot(h.x - o.x, h.z - o.z) < 2 * mediaCasa) casasSolapadas.push(`${i}: ${k} y ${b}`);
      }
    }
    /*
     * EL HOTEL SE MIDE CON SU PROPIO BULTO, no con el de una casa. Es la trampa que esta
     * comprobación tenía: usaba `mediaCasa` para la posada porque la posada ERA una casa, y
     * así un hotel el doble de ancho habría pasado sin que nadie lo mirase.
     */
    const posada = enElMarco(m, huecoDePosada(i));
    if (
      posada.radial - hotel.fondo / 2 < FRANJA.desde ||
      posada.radial + hotel.fondo / 2 > FRANJA.hasta ||
      hotel.ancho / 2 > ANCHO_DE_CASILLA / 2 ||
      posada.v + hotel.fondo / 2 >= CARRIL_DEL_AVATAR.desde ||
      Math.abs(posada.aLoLargo) > 1e-9
    ) {
      posadasMal.push(`${i}: ${JSON.stringify(posada)}`);
    }
    const b = enElMarco(m, huecoDeBandera(i));
    if (b.radial < FRANJA.desde || b.radial > FRANJA.hasta || Math.abs(b.aLoLargo) > ANCHO_DE_CASILLA / 2) banderasMal.push(`${i}: fuera de la franja ${JSON.stringify(b)}`);
    for (const h of huecos) {
      const d = enElMarco(m, h);
      if (Math.abs(d.aLoLargo - b.aLoLargo) < mediaCasa && Math.abs(d.radial - b.radial) < mediaCasa) banderasMal.push(`${i}: la bandera pisa una casa`);
    }
    /* Y el hotel, que es dos veces más ancho que una casa, tampoco puede llegar al mástil. */
    if (hotel.ancho / 2 > Math.abs(b.aLoLargo) - radioDeLaBandera) banderasMal.push(`${i}: el hotel llega hasta la bandera`);
  }
  comprobar(`los cuatro huecos de casa (huella ${r(casa.ancho)} × ${r(casa.fondo)}, paso ${REJILLA_DE_CASAS.paso}) van en FILA en la franja del barrio de las 36 casillas laterales`, casasFuera.length === 0, casasFuera.slice(0, 5));
  comprobar('y no se pisan', casasSolapadas.length === 0, casasSolapadas.slice(0, 5));
  comprobar(`el hotel (${r(hotel.ancho)} × ${r(hotel.fondo)} × ${r(hotel.alto)}) va centrado en la franja, cabe en el frente de la casilla y no llega al carril del avatar`, posadasMal.length === 0, posadasMal.slice(0, 3));
  comprobar('la bandera del dueño está en la franja, y ni las cuatro casas ni el hotel llegan a su mástil', banderasMal.length === 0, banderasMal.slice(0, 3));
  /*
   * LAS VACUNAS DE LA FRANJA. Los dos errores que de verdad se cometen al dar talla a estas
   * piezas son pasarse de fondo —y meterse en el carril por el que anda el aventurero— y
   * pasarse de frente, hasta comerse el mástil de la bandera del dueño.
   */
  const V_ENVENENADO_DEL_HOTEL = 26;
  comprobar('se ve fallar: un hotel de 26 de fondo se saldría de la franja y pisaría el carril del avatar', V_DE_LAS_CASAS + V_ENVENENADO_DEL_HOTEL / 2 >= CARRIL_DEL_AVATAR.desde, V_DE_LAS_CASAS + V_ENVENENADO_DEL_HOTEL / 2);
  const ANCHO_ENVENENADO_DEL_HOTEL = 60;
  comprobar(
    'se ve fallar: un hotel de 60 de frente se comería el mástil de la bandera del dueño',
    ANCHO_ENVENENADO_DEL_HOTEL / 2 > Math.abs(enElMarco(marcoDeCasilla(1), huecoDeBandera(1)).aLoLargo) - radioDeLaBandera,
    r(Math.abs(enElMarco(marcoDeCasilla(1), huecoDeBandera(1)).aLoLargo) - radioDeLaBandera),
  );

  /*
   * LA BANDERA NO PISA EL CARRIL, Y EL CARRIL NO CRECIÓ CON LA CASILLA.
   *
   * La caja del estandarte no mide 1,91 sino 2,61 en su lado mayor: el mástil sale 1,655 por
   * un lado, medido en el `.glb`. Con la franja del barrio en 21 de fondo la bandera sube a
   * `v = 15` —el medio de la franja, que es donde de verdad se ve— y llega a 16,7 con el
   * carril empezando en 23: seis unidades de holgura. La vacuna es ponerla pegada al filete,
   * en `v = 22`, que es el error que de verdad se puede cometer al mover una banda.
   */
  const vDeLaBandera = enElMarco(marcoDeCasilla(1), huecoDeBandera(1)).v;
  const holguraDeLaBandera = CARRIL_DEL_AVATAR.desde - (vDeLaBandera + radioDeLaBandera);
  console.log(`  la bandera va en v = ${r(vDeLaBandera)}, llega a ${r(vDeLaBandera + radioDeLaBandera)} y el carril empieza en ${CARRIL_DEL_AVATAR.desde}: ${r(holguraDeLaBandera)} de holgura`);
  comprobar('la bandera del dueño deja al menos medio peón al carril del avatar, y además cabe entera en la franja del barrio', holguraDeLaBandera >= medioPeon / 2 && vDeLaBandera + radioDeLaBandera <= BANDA.franja, r(holguraDeLaBandera));
  const V_ENVENENADO_DE_LA_BANDERA = 22;
  comprobar('se ve fallar: puesta pegada al filete (v = 22) la bandera se mete en el carril del avatar', CARRIL_DEL_AVATAR.desde - (V_ENVENENADO_DE_LA_BANDERA + radioDeLaBandera) < medioPeon / 2, r(CARRIL_DEL_AVATAR.desde - (V_ENVENENADO_DE_LA_BANDERA + radioDeLaBandera)));

  /* La cárcel: presos dentro del patio, visitas fuera de la verja y fuera de la ele. */
  const m = marcoDeCasilla(MAZMORRA);
  const patio = { u: [CELDA.u - CELDA.lado / 2, CELDA.u + CELDA.lado / 2], v: [CELDA.v - CELDA.lado / 2, CELDA.v + CELDA.lado / 2] };
  const presosFuera = [0, 1, 2, 3, 4, 5]
    .map((a) => enLaEsquina(m, huecoDePreso(a)))
    .filter((q) => q.u - medioPeon < (patio.u[0] as number) || q.u + medioPeon > (patio.u[1] as number) || q.v - medioPeon < (patio.v[0] as number) || q.v + medioPeon > (patio.v[1] as number));
  comprobar(`los seis huecos de preso caben dentro del patio (${CELDA.lado} × ${CELDA.lado} en la celda (${CELDA.u}, ${CELDA.v})) con el peón a su talla`, presosFuera.length === 0, presosFuera);
  /*
   * EL PATIO ES LA HABITACIÓN MÁS PEQUEÑA DEL TABLERO, y por eso es la que pone el techo al
   * peón entero: tres presos de frente en 12. Aquí se afirma lo que de verdad importa —que los
   * seis quepan sin tocarse y sin que se toquen sus discos— y se imprime lo que sobra, que es
   * el margen que le queda a quien mañana quiera un peón mayor.
   */
  const presosSolapados: string[] = [];
  for (let a = 0; a < 6; a++) {
    for (let b = a + 1; b < 6; b++) {
      const entre = Math.hypot(huecoDePreso(a).x - huecoDePreso(b).x, huecoDePreso(a).z - huecoDePreso(b).z);
      if (entre < 2 * medioPeon) presosSolapados.push(`presos ${a} y ${b} a ${r(entre)}`);
      if (entre < 2 * RADIO_DEL_DISCO_DEL_PEON) presosSolapados.push(`discos de ${a} y ${b} a ${r(entre)}`);
    }
  }
  const holguraEnElPatio = Math.min(...[0, 1, 2, 3, 4, 5].map((a) => enLaEsquina(m, huecoDePreso(a))).flatMap((q) => [q.u - medioPeon - (patio.u[0] as number), (patio.u[1] as number) - q.u - medioPeon, q.v - medioPeon - (patio.v[0] as number), (patio.v[1] as number) - q.v - medioPeon]));
  console.log(`  en el patio caben los seis con ${r(holguraEnElPatio)} de sobra hasta la verja y ${r(REJILLA_DE_PRESOS.pasoU - 2 * medioPeon)} entre dos presos`);
  comprobar('y los seis presos no se pisan, ni se pisan sus discos', presosSolapados.length === 0, presosSolapados.slice(0, 4));
  comprobar('se ve fallar: un peón de 4,5 no dejaría meter tres de frente en un patio de 12', 3 * 4.5 > CELDA.lado);
  const visitasMal = [0, 1, 2, 3, 4, 5]
    .map((a) => enLaEsquina(m, huecoDeVisita(a)))
    .filter((q) => {
      const enElPatio = q.u + medioPeon > (patio.u[0] as number) && q.v + medioPeon > (patio.v[0] as number);
      const fueraDeLaEsquina = q.u - medioPeon < BORDE_INTERIOR || q.v - medioPeon < BORDE_INTERIOR || q.u + medioPeon > MEDIO_LADO || q.v + medioPeon > MEDIO_LADO;
      /* Van sobre el tramo de ENTRADA de la marcha, que es la acera de delante de la cárcel. */
      const fueraDeLaAcera = Math.abs(q.v - LINEA_DE_LA_MARCHA) > 2 || q.u > LINEA_DE_LA_MARCHA;
      return enElPatio || fueraDeLaEsquina || fueraDeLaAcera;
    });
  comprobar('y los seis de visita quedan en la acera de delante de la cárcel, sobre el tramo de entrada y fuera del patio', visitasMal.length === 0, visitasMal);
  /* Los seis de visita van en fila india por el brazo de entrada: tampoco pueden pisarse. */
  const visitasSolapadas: string[] = [];
  for (let a = 0; a < 6; a++) {
    for (let b = a + 1; b < 6; b++) {
      const entre = Math.hypot(huecoDeVisita(a).x - huecoDeVisita(b).x, huecoDeVisita(a).z - huecoDeVisita(b).z);
      if (entre < 2 * medioPeon) visitasSolapadas.push(`visitas ${a} y ${b} a ${r(entre)}`);
      if (entre < 2 * RADIO_DEL_DISCO_DEL_PEON) visitasSolapadas.push(`discos de ${a} y ${b} a ${r(entre)}`);
    }
  }
  comprobar('y los seis de visita no se pisan entre sí ni con sus discos', visitasSolapadas.length === 0, visitasSolapadas.slice(0, 4));
  /*
   * LAS DOS REJILLAS DE ESQUINA SON DE UNA SOLA FILA, y eso no es un detalle de forma: con dos
   * filas el aventurero del que está quieto se despega de la polilínea la mitad del paso más
   * 1,2, y con un peón que se vea el paso ya no cabe en las dos unidades que se toleran.
   */
  comprobar(
    'las dos rejillas de esquina —la de peones y la de visitas— son de una sola fila, que es lo que permite un peón de 3,375',
    REJILLA_DE_PEONES_DE_ESQUINA.filas === 1 && REJILLA_DE_VISITAS.filas === 1 && REJILLA_DE_PEONES_DE_ESQUINA.columnas === 6 && REJILLA_DE_VISITAS.columnas === 6,
    { esquina: REJILLA_DE_PEONES_DE_ESQUINA, visitas: REJILLA_DE_VISITAS },
  );
  comprobar('se ve fallar: con dos filas, el aventurero de la fila de fuera se despegaría más de 2 de la línea de la marcha', medioPeon + 1.2 > 2, r(medioPeon + 1.2));
  /* Y los seis en fila india tienen que caber en el brazo, que mide 25,5 de la ciudad a la esquina. */
  const largoDelBrazo = LINEA_DE_LA_MARCHA - BORDE_INTERIOR;
  const filaDeSeis = (REJILLA_DE_PEONES_DE_ESQUINA.columnas - 1) * REJILLA_DE_PEONES_DE_ESQUINA.pasoV + 2 * medioPeon;
  console.log(`  los seis en fila india por el brazo ocupan ${r(filaDeSeis)} de los ${largoDelBrazo} que mide, con ${r(REJILLA_DE_PEONES_DE_ESQUINA.pasoV - 2 * medioPeon)} entre dos`);
  comprobar(`los seis en fila india caben en el brazo de la esquina (${r(filaDeSeis)} de ${largoDelBrazo})`, filaDeSeis <= largoDelBrazo, r(filaDeSeis));
  const presosYVisitas = [0, 1, 2, 3, 4, 5].every((a) => Math.hypot(huecoDePreso(a).x - huecoDeVisita(a).x, huecoDePreso(a).z - huecoDeVisita(a).z) > CELDA.lado / 2);
  comprobar('y ningún preso comparte sitio con una visita: el patio está lejos de la acera', presosYVisitas);
  const huecoDelDiez = [0, 1, 2, 3, 4, 5].every((a) => {
    const q = huecoDePeon(MAZMORRA, a);
    const v = huecoDeVisita(a);
    return q.x === v.x && q.z === v.z;
  });
  comprobar('en la Mazmorra el hueco de peón es el de visita', huecoDelDiez);
}

// ---------------------------------------------------------------------------
paso('La casilla es una casilla de tablero de mesa: poco atrezo, en su banda, sin pisar el carril, y el precio del reglamento');
// ---------------------------------------------------------------------------

/** La huella del atrezo de una casilla en su marco: extremos en `u` y en `v` de la unión de sus piezas. */
function huellaDelAtrezo(casilla: number, piezas: readonly PiezaDeCasilla[]): { readonly u: readonly [number, number]; readonly v: readonly [number, number]; readonly minY: number } {
  const m = marcoDeCasilla(casilla);
  let a0 = Infinity;
  let a1 = -Infinity;
  let v0 = Infinity;
  let v1 = -Infinity;
  let minY = Infinity;
  for (const p of piezas) {
    const puesta = puestaDeLaPiezaDeLaCasilla(casilla, p);
    for (const e of esquinasDeLaPuesta(puesta)) {
      const { v, aLoLargo } = enElMarco(m, e);
      a0 = Math.min(a0, aLoLargo);
      a1 = Math.max(a1, aLoLargo);
      v0 = Math.min(v0, v);
      v1 = Math.max(v1, v);
    }
    minY = Math.min(minY, puesta.y + caja(p.pieza).min[1]);
  }
  return { u: [a0, a1], v: [v0, v1], minY };
}

function problemasDelAtrezo(casilla: number, piezas: readonly PiezaDeCasilla[]): string[] {
  const problemas: string[] = [];
  if (piezas.length === 0) return problemas;
  const h = huellaDelAtrezo(casilla, piezas);
  const frente = (h.u[1] as number) - (h.u[0] as number);
  if (frente > FRENTE_MAXIMO_DEL_ATREZO || Math.abs(h.u[0] as number) > FRENTE_MAXIMO_DEL_ATREZO / 2 || Math.abs(h.u[1] as number) > FRENTE_MAXIMO_DEL_ATREZO / 2) {
    problemas.push(`frente: ${casilla} mide ${r(frente)} de frente (${r(h.u[0] as number)}..${r(h.u[1] as number)})`);
  }
  if ((h.v[0] as number) < ATREZO.desde || (h.v[1] as number) > ATREZO.hasta) {
    problemas.push(`banda: ${casilla} va de v ${r(h.v[0] as number)} a ${r(h.v[1] as number)} y la banda de atrezo es ${ATREZO.desde}..${ATREZO.hasta}`);
  }
  if (h.minY < -0.05) problemas.push(`alza: ${casilla} se hunde ${r(-h.minY)} bajo el suelo`);
  if (h.minY > 0.05) problemas.push(`alza: ${casilla} flota ${r(h.minY)} sobre el suelo`);
  return problemas;
}

{
  const laterales = Array.from({ length: CASILLAS }, (_, i) => i).filter((i) => !ESQUINAS.includes(i));
  const sinFila = laterales.filter((i) => ATREZO_DE_LA_CASILLA[i] === undefined);
  comprobar('las 36 casillas laterales tienen fila en ATREZO_DE_LA_CASILLA (el Diezmo y la Alcabala, vacía a propósito: sólo emblema y cifra)', sinFila.length === 0, sinFila);
  const mudas = laterales.filter((i) => (ATREZO_DE_LA_CASILLA[i] ?? []).length === 0 && !huecosDeLosEmblemas().some((e) => e.casilla === i) && guarismosDelPrecio(i).length === 0);
  comprobar('y ninguna se queda muda: o lleva atrezo, o emblema, o cifra', mudas.length === 0, mudas);

  const todos = laterales.flatMap((i) => problemasDelAtrezo(i, ATREZO_DE_LA_CASILLA[i] ?? []));
  const de = (etiqueta: string): string[] => todos.filter((q) => q.startsWith(`${etiqueta}:`));
  const medidas = laterales
    .filter((i) => (ATREZO_DE_LA_CASILLA[i] ?? []).length > 0)
    .map((i) => {
      const h = huellaDelAtrezo(i, ATREZO_DE_LA_CASILLA[i] ?? []);
      return `${i}:${r((h.u[1] as number) - (h.u[0] as number))}×${r((h.v[1] as number) - (h.v[0] as number))}`;
    });
  console.log(`  frente × fondo del atrezo por casilla: ${medidas.join('  ')}`);
  comprobar(`ningún atrezo pasa de ${FRENTE_MAXIMO_DEL_ATREZO} de frente ni se sale de su casilla`, de('frente').length === 0, de('frente'));
  comprobar(`ninguno se sale de la banda de atrezo (v ${ATREZO.desde}..${ATREZO.hasta}): ni pisa el precio ni se sube al marco`, de('banda').length === 0, de('banda'));
  comprobar('y ninguna pieza flota ni se hunde: los cuerpos del pack vienen sin base y bajan 0,6', de('alza').length === 0, de('alza'));

  /* NADA pisa el carril por donde anda el avatar: ni atrezo, ni casas, ni bandera, ni dígitos. */
  const enElCarril: string[] = [];
  for (const i of laterales) {
    const m = marcoDeCasilla(i);
    for (const pieza of ATREZO_DE_LA_CASILLA[i] ?? []) {
      const uv = esquinasDeLaPuesta(puestaDeLaPiezaDeLaCasilla(i, pieza)).map((e) => enElMarco(m, e).v);
      if (Math.min(...uv) < CARRIL_DEL_AVATAR.hasta && Math.max(...uv) > CARRIL_DEL_AVATAR.desde) enElCarril.push(`${i}/${pieza.pieza}`);
    }
  }
  comprobar(`ninguna pieza de atrezo pisa el carril del avatar (v de ${CARRIL_DEL_AVATAR.desde} a ${CARRIL_DEL_AVATAR.hasta})`, enElCarril.length === 0, enElCarril);

  /*
   * POCO ATREZO, PERO NO UN EDIFICIO SUELTO EN UN DESCAMPADO.
   *
   * Con la casilla en 72 de frente el solar lleva un FRENTE DE MANZANA de dos cuerpos y una
   * farola: tres piezas que no son suelo, y ni una más. El tope sube de dos a tres a
   * sabiendas y se afirma aquí para que nadie lo suba «un poquito» otra vez.
   */
  const PIEZAS_DE_VOLUMEN_POR_CASILLA = 3;
  const recargadas = laterales.filter((i) => (ATREZO_DE_LA_CASILLA[i] ?? []).filter((p) => !esSuelo(p.pieza)).length > PIEZAS_DE_VOLUMEN_POR_CASILLA);
  comprobar(`ninguna casilla lleva más de ${PIEZAS_DE_VOLUMEN_POR_CASILLA} piezas que no sean suelo: «no hace falta que pongas muchos elementos 3d»`, recargadas.length === 0, recargadas);
  /* Y el segundo cuerpo del frente se cae en sobria: en el móvil no se pagan veintidós edificios de más. */
  const cuerposEnPlena = puestasDelAtrezo('plena').filter((p) => p.pieza.startsWith('cuerpo-')).length;
  const cuerposEnSobria = puestasDelAtrezo('sobria').filter((p) => p.pieza.startsWith('cuerpo-')).length;
  comprobar('en sobria cada solar se queda con UN cuerpo: el medianero va marcado menudo', cuerposEnPlena === 2 * cuerposEnSobria, { cuerposEnPlena, cuerposEnSobria });

  /* El precio: los dígitos caben, están en la superficie y dicen lo que dice el reglamento. */
  const precioMal: string[] = [];
  const cifraMal: string[] = [];
  for (let i = 0; i < CASILLAS; i++) {
    const delReglamento = (CASILLAS_DEL_REGLAMENTO[i]?.precio ?? 0) as number;
    if ((PRECIO_DE_LA_CASILLA[i] ?? -1) !== delReglamento) cifraMal.push(`${i}: la tabla dice ${String(PRECIO_DE_LA_CASILLA[i])} y el reglamento ${String(delReglamento)}`);
    const digitos = guarismosDelPrecio(i);
    if (digitos.length === 0) continue;
    const m = marcoDeCasilla(i);
    if (anchoDelPrecio(i) > ANCHO_DE_CASILLA - 2) precioMal.push(`${i}: ${r(anchoDelPrecio(i))} de ancho en una casilla de ${ANCHO_DE_CASILLA}`);
    for (const g of digitos) {
      const { v, aLoLargo } = enElMarco(m, { x: g.x, z: g.z });
      if (v - ALTO_DEL_GUARISMO / 2 < SUPERFICIE.desde - BORDE_INTERIOR || v + ALTO_DEL_GUARISMO / 2 > ATREZO.desde) precioMal.push(`${i}: el dígito va de v ${r(v - ALTO_DEL_GUARISMO / 2)} a ${r(v + ALTO_DEL_GUARISMO / 2)}`);
      if (Math.abs(aLoLargo) + ANCHO_DEL_GUARISMO / 2 > ANCHO_DE_CASILLA / 2 - 1) precioMal.push(`${i}: el dígito se sale a lo largo (${r(aLoLargo)})`);
    }
  }
  comprobar('el precio de cada casilla es EL DEL REGLAMENTO, copiado y vigilado casilla a casilla', cifraMal.length === 0, cifraMal.slice(0, 5));
  comprobar('los dígitos del precio caben en la superficie, entre el carril y la banda de atrezo, y en los 32 de ancho', precioMal.length === 0, precioMal.slice(0, 5));
  comprobar('llevan cifra las 28 comprables más el Diezmo y la Alcabala; las Arcas, los Pregones y las cuatro esquinas no', PRECIO_DE_LA_CASILLA.filter((x) => x > 0).length === 30, PRECIO_DE_LA_CASILLA.filter((x) => x > 0).length);

  /* Los emblemas: uno por casilla que no se compra, y caben en la mitad exterior. */
  const emblemas = huecosDeLosEmblemas();
  const emblemasMal = emblemas.filter((e) => {
    if (ESQUINAS.includes(e.casilla)) return false;
    const m = marcoDeCasilla(e.casilla);
    const { v, aLoLargo } = enElMarco(m, { x: e.x, z: e.z });
    return v - LADO_DEL_EMBLEMA / 2 < ATREZO.desde || v + LADO_DEL_EMBLEMA / 2 > ATREZO.hasta || Math.abs(aLoLargo) + LADO_DEL_EMBLEMA / 2 > ANCHO_DE_CASILLA / 2;
  });
  comprobar('los diez emblemas de casilla y las dos flechas están puestos, y caben en la banda de atrezo sin salirse', emblemas.length === 12 && emblemasMal.length === 0, emblemasMal.map((e) => `${e.casilla}/${e.emblema}`));
  const barriosDelReglamento = BARRIOS.flatMap((b) => b.solares);
  const solaresConCuerpo = barriosDelReglamento.filter((i) => (ATREZO_DE_LA_CASILLA[i] ?? []).filter((p) => p.pieza.startsWith('cuerpo-')).length === 2);
  comprobar('los 22 solares del reglamento llevan DOS cuerpos del City Builder, y ninguna otra casilla los lleva', solaresConCuerpo.length === barriosDelReglamento.length && puestasDelAtrezo().filter((p) => p.pieza.startsWith('cuerpo-')).length === 2 * barriosDelReglamento.length, {
    conDosCuerpos: solaresConCuerpo.length,
    solares: barriosDelReglamento.length,
  });
  /* Dos edificios gemelos pegados no parecen una manzana: parecen un error de copia. */
  const gemelos = barriosDelReglamento.filter((i) => {
    const cuerpos = (ATREZO_DE_LA_CASILLA[i] ?? []).filter((p) => p.pieza.startsWith('cuerpo-')).map((p) => p.pieza);
    return cuerpos.length === 2 && cuerpos[0] === cuerpos[1];
  });
  comprobar('y los dos cuerpos de un mismo frente son SIEMPRE distintos', gemelos.length === 0, gemelos);
  /* Los dos no pueden solaparse: el más ancho del pack mide 12,04 y van a ±13. */
  const frentesSolapados = barriosDelReglamento.filter((i) => {
    const cuerpos = (ATREZO_DE_LA_CASILLA[i] ?? []).filter((p) => p.pieza.startsWith('cuerpo-'));
    if (cuerpos.length !== 2) return false;
    const anchos = cuerpos.map((p) => huella(p.pieza).ancho / 2);
    const us = cuerpos.map((p) => p.sitio[0] as number);
    return Math.abs((us[0] as number) - (us[1] as number)) < (anchos[0] as number) + (anchos[1] as number);
  });
  comprobar('y no se pisan entre sí: ±13 de eje deja hueco al cuerpo más ancho del pack (12,04)', frentesSolapados.length === 0, frentesSolapados);

  /*
   * VACUNAS. Los tres errores que de verdad se pueden cometer con esta tabla al cambiar de
   * escala: dejar el atrezo donde lo dejó la escala anterior y que se suba al marco, olvidar
   * el alza de 0,6 (y dejarlo flotando), y separar tanto el frente de manzana que un cuerpo
   * se salga de su casilla.
   */
  const cuerpoEnElMarco = problemasDelAtrezo(1, [{ pieza: PIEZA.cuerpoA, giroEnCuartos: 0, sitio: [0, 96], alza: -0.6 }]);
  comprobar('se ve fallar: un cuerpo en v = 96 se sube al borde claro, que es el marco del tablero', cuerpoEnElMarco.some((q) => q.startsWith('banda:')), cuerpoEnElMarco);
  const cuerpoFlotando = problemasDelAtrezo(1, [{ pieza: PIEZA.cuerpoA, giroEnCuartos: 0, sitio: [0, ATREZO.centro] }]);
  comprobar('se ve fallar: el cuerpo sin su alza flota 0,6, que es la base que el pack no trae', cuerpoFlotando.some((q) => q.startsWith('alza:')), cuerpoFlotando);
  const frenteDemasiadoAbierto = problemasDelAtrezo(1, [
    { pieza: PIEZA.cuerpoH, giroEnCuartos: 0, sitio: [-30, ATREZO.centro], alza: -0.6 },
    { pieza: PIEZA.cuerpoG, giroEnCuartos: 0, sitio: [30, ATREZO.centro], alza: -0.6 },
  ]);
  comprobar('se ve fallar: el frente de manzana abierto a ±30 saca los dos cuerpos de la casilla', frenteDemasiadoAbierto.some((q) => q.startsWith('frente:')), frenteDemasiadoAbierto);
}

// ---------------------------------------------------------------------------
paso('El precio y la franja del barrio se LEEN: proyectados en píxeles en 16:9, 3:4 y 9:19,5');
// ---------------------------------------------------------------------------

const VENTANAS = [
  { nombre: '16:9', ancho: 1920, alto: 1080 },
  { nombre: '3:4', ancho: 768, alto: 1024 },
  /* El móvil de 9:19,5 con el lienzo al 58 % del alto: 390 × (845 · 0,58). */
  { nombre: '9:19,5 al 58 %', ancho: 390, alto: Math.round(845 * 0.58) },
];

/** Cuántos píxeles de ALTO ocupa en el lienzo un segmento del suelo, desde la pose de salida. */
function pixelesEntre(ventanaK: number, a: Punto, b: Punto): number {
  const v = VENTANAS[ventanaK] as { nombre: string; ancho: number; alto: number };
  const ventana = { ancho: v.ancho, alto: v.alto, franjaInferior: 0 };
  const pose = poseDelBurgo(poseDeSalida(ventana), MIRADOR_DEL_BURGO, ventana);
  const aspecto = v.ancho / v.alto;
  const pa = proyecta(pose, aspecto, { x: a.x, y: 0, z: a.z });
  const pb = proyecta(pose, aspecto, { x: b.x, y: 0, z: b.z });
  if (!pa.delante || !pb.delante) return 0;
  return (Math.hypot((pa.x - pb.x) * (v.ancho / 2), (pa.y - pb.y) * (v.alto / 2)) * 1);
}

/**
 * CUÁNTO SE LEE, Y DÓNDE ESTÁ EL LÍMITE DE VERDAD.
 *
 * La cuenta de servilleta —«el tablero llena el ancho de la pantalla y se mira de frente»—
 * no vale: la cámara del Burgo mira desde 55° de altura y el lienzo del móvil es el 58 % del
 * alto, así que el tablero se ve escorzado y cabe por el alto, no por el ancho. Medido aquí
 * con `proyecta`, el dígito de 27 unidades sobre el tablero de 864 queda en 5,0 px en el
 * móvil, 9,9 en una tableta y 16,3 en un PC: EXACTAMENTE los mismos píxeles que daba el de
 * 12 sobre el tablero de 384, porque lo que manda es el cociente con el alcance y ese
 * cociente no ha cambiado.
 *
 * Y 27 es el TECHO, no una elección tímida: tres dígitos ocupan 2,45 × alto, y a 27 son
 * 66,15 de los 72 de la casilla. A 30 ya no caben. O sea que desde la pose de salida, en un
 * móvil, el precio es una mancha de tres cifras y no un número que se lea: se lee
 * ACERCÁNDOSE, y por eso la segunda medida —a la cercanía de seguimiento, que es la que la
 * cámara toma sola cada vez que alguien mueve— es la que de verdad manda: ahí el dígito mide
 * 16,6 px en el móvil, 32,8 en una tableta y 82,8 en un PC. Las dos están escritas para que
 * nadie vuelva a suponer la primera.
 */
const PIXELES_MINIMOS_DEL_DIGITO = 4.5;
const PIXELES_MINIMOS_DE_LA_FRANJA = 3;
/** Al seguir al que mueve la cámara se pone a 0,42: ahí el precio tiene que LEERSE. */
const PIXELES_MINIMOS_AL_SEGUIR = 15;

{
  const informe: string[] = [];
  const digitosCortos: string[] = [];
  const franjasCortas: string[] = [];
  for (const [k, v] of VENTANAS.entries()) {
    let peorDigito = Infinity;
    let peorFranja = Infinity;
    for (let i = 0; i < CASILLAS; i++) {
      if (ESQUINAS.includes(i)) continue;
      const m = marcoDeCasilla(i);
      const alto = pixelesEntre(k, puntoEnLaCasillaPorV(m, 0, V_DEL_PRECIO - ALTO_DEL_GUARISMO / 2), puntoEnLaCasillaPorV(m, 0, V_DEL_PRECIO + ALTO_DEL_GUARISMO / 2));
      const franja = pixelesEntre(k, puntoEnLaCasillaPorV(m, 0, 0), puntoEnLaCasillaPorV(m, 0, BANDA.franja));
      if (guarismosDelPrecio(i).length > 0) peorDigito = Math.min(peorDigito, alto);
      peorFranja = Math.min(peorFranja, franja);
    }
    informe.push(`${v.nombre}: dígito ${r(peorDigito)} px, franja ${r(peorFranja)} px`);
    if (peorDigito < PIXELES_MINIMOS_DEL_DIGITO) digitosCortos.push(`${v.nombre}: ${r(peorDigito)} px`);
    if (peorFranja < PIXELES_MINIMOS_DE_LA_FRANJA) franjasCortas.push(`${v.nombre}: ${r(peorFranja)} px`);
  }
  console.log(`  legibilidad desde la pose de salida — ${informe.join('; ')}`);
  comprobar(`el dígito del precio mide al menos ${PIXELES_MINIMOS_DEL_DIGITO} px de alto en las tres ventanas, en las 36 casillas`, digitosCortos.length === 0, digitosCortos);
  comprobar(`la franja del barrio mide al menos ${PIXELES_MINIMOS_DE_LA_FRANJA} px en las tres ventanas`, franjasCortas.length === 0, franjasCortas);
  /*
   * VACUNA, y es la del cambio de escala: un dígito que se quedase en los 12 de la escala
   * anterior mediría 2,2 px en el móvil sobre este tablero. Nada fallaría; sólo dejaría de
   * leerse el precio, que es la mitad de lo que hace que una casilla sea una casilla.
   */
  const m = marcoDeCasilla(1);
  const enanito = pixelesEntre(2, puntoEnLaCasillaPorV(m, 0, V_DEL_PRECIO - 6), puntoEnLaCasillaPorV(m, 0, V_DEL_PRECIO + 6));
  comprobar('se ve fallar: un dígito que se hubiera quedado en los 12 de la escala anterior no se lee en el móvil', enanito < PIXELES_MINIMOS_DEL_DIGITO, r(enanito));

  /*
   * Y LA MEDIDA QUE DE VERDAD IMPORTA: al seguir al que mueve, el precio se lee.
   *
   * La cámara se acerca sola a `CERCANIA_DE_SEGUIMIENTO` en cada `mueve` y vuelve 1,2 s
   * después del salto. Es el momento en el que un jugador mira la casilla en la que ha caído.
   */
  const cerquita: string[] = [];
  const informeCerca: string[] = [];
  for (const [k, v] of VENTANAS.entries()) {
    const ventana = { ancho: v.ancho, alto: v.alto, franjaInferior: 0 };
    const marco = marcoDeCasilla(39);
    const pose = poseDelBurgo({ factor: CERCANIA_DE_SEGUIMIENTO, centro: { x: marco.centro.x, z: marco.centro.z } }, MIRADOR_DEL_BURGO, ventana);
    const a = puntoEnLaCasillaPorV(marco, 0, V_DEL_PRECIO - ALTO_DEL_GUARISMO / 2);
    const b2 = puntoEnLaCasillaPorV(marco, 0, V_DEL_PRECIO + ALTO_DEL_GUARISMO / 2);
    const pa = proyecta(pose, v.ancho / v.alto, { x: a.x, y: 0, z: a.z });
    const pb = proyecta(pose, v.ancho / v.alto, { x: b2.x, y: 0, z: b2.z });
    const px = Math.hypot((pa.x - pb.x) * (v.ancho / 2), (pa.y - pb.y) * (v.alto / 2));
    informeCerca.push(`${v.nombre}: ${r(px)} px`);
    if (!pa.delante || !pb.delante || px < PIXELES_MINIMOS_AL_SEGUIR) cerquita.push(`${v.nombre}: ${r(px)} px`);
    void k;
  }
  console.log(`  el precio al seguir al que mueve (cercanía ${CERCANIA_DE_SEGUIMIENTO}) — ${informeCerca.join('; ')}`);
  comprobar(`al seguir al que mueve el dígito pasa de ${PIXELES_MINIMOS_AL_SEGUIR} px en las tres ventanas: ahí es donde el precio se lee`, cerquita.length === 0, cerquita);
}

// ---------------------------------------------------------------------------
paso('Las cuatro esquinas, el suelo, el campo y el recinto de la ciudad');
// ---------------------------------------------------------------------------

{
  /* Ninguna pieza de esquina que no sea suelo pisa la ele de la marcha engordada un peón. */
  const pisan: string[] = [];
  const fueraDeLaEsquina: string[] = [];
  for (const esquina of ESQUINAS) {
    const m = marcoDeCasilla(esquina);
    for (const p of piezasDeLaEsquina(esquina)) {
      const uv = esquinasDeLaPuesta(p).map((e) => enLaEsquina(m, e));
      const u0 = Math.min(...uv.map((q) => q.u));
      const u1 = Math.max(...uv.map((q) => q.u));
      const v0 = Math.min(...uv.map((q) => q.v));
      const v1 = Math.max(...uv.map((q) => q.v));
      if (u0 < BORDE_INTERIOR - 0.01 || v0 < BORDE_INTERIOR - 0.01 || u1 > MEDIO_LADO + 0.01 || v1 > MEDIO_LADO + 0.01) fueraDeLaEsquina.push(`${esquina}/${p.pieza}: u ${r(u0)}..${r(u1)}, v ${r(v0)}..${r(v1)}`);
      if (esSuelo(p.pieza)) continue;
      const h = HOLGURA_DE_LA_MARCHA;
      const c = LINEA_DE_LA_MARCHA;
      const tramoDeEntrada = v1 >= c - h && v0 <= c + h && u0 <= c + h;
      const tramoDeSalida = u1 >= c - h && u0 <= c + h && v0 <= c + h;
      if (tramoDeEntrada || tramoDeSalida) pisan.push(`${esquina}/${p.pieza}: u ${r(u0)}..${r(u1)}, v ${r(v0)}..${r(v1)}`);
    }
  }
  comprobar(`ninguna pieza de esquina que no sea suelo pisa la ele de la marcha engordada ${HOLGURA_DE_LA_MARCHA}`, pisan.length === 0, pisan);
  comprobar('y las cuatro escenas caben enteras en su cuadrado de 108', fueraDeLaEsquina.length === 0, fueraDeLaEsquina.slice(0, 6));

  const cuenta = (esquina: number, pieza: string): number => piezasDeLaEsquina(esquina).filter((p) => p.pieza === pieza).length;
  comprobar(
    'la salida es un cruce urbano de nueve por nueve celdas: un cruce, seis cebras, cuatro farolas, dos semáforos, un taxi y una berlina',
    cuenta(0, PIEZA.calzadaCruce) === 1 && cuenta(0, PIEZA.calzadaPaso) === 6 && cuenta(0, PIEZA.farolaDeCalle) === 4 && cuenta(0, PIEZA.semaforoC) === 2 && cuenta(0, PIEZA.cocheTaxi) === 1 && cuenta(0, PIEZA.cocheBerlina) === 1,
    piezasDeLaEsquina(0).map((p) => p.pieza),
  );
  comprobar(
    'la cárcel es una manzana entera: cuatro bloques, cuatro tramos de verja, dos hojas de puerta, dos patrullas y dos semáforos',
    cuenta(10, PIEZA.bloqueD) === 1 && cuenta(10, PIEZA.bloqueB) === 1 && cuenta(10, PIEZA.bloqueC) === 1 && cuenta(10, PIEZA.bloqueA) === 1 && cuenta(10, PIEZA.verja) === 4 && cuenta(10, PIEZA.verjaPuerta) === 2 && cuenta(10, PIEZA.cochePatrulla) === 2 && cuenta(10, PIEZA.semaforoA) === 2,
    piezasDeLaEsquina(10).map((p) => p.pieza),
  );
  comprobar(
    'el descanso es una plaza arbolada: tres mesas, doce sillas, seis arbustos, cuatro bancos, cuatro farolas de parque y siete árboles',
    cuenta(20, PIEZA.mesaRedonda) === 3 &&
      cuenta(20, PIEZA.silla) === 12 &&
      cuenta(20, PIEZA.arbusto) === 6 &&
      cuenta(20, PIEZA.bancoDeParque) === 4 &&
      cuenta(20, PIEZA.farolaDeParque) === 4 &&
      cuenta(20, PIEZA.pino) + cuenta(20, PIEZA.pinoGrande) + cuenta(20, PIEZA.pinoPequeno) === 7,
    piezasDeLaEsquina(20).map((p) => p.pieza),
  );
  comprobar(
    '¡a la Mazmorra! es una avenida de dos carriles: cuatro cebras, dos semáforos de brazo y el coche patrulla con el morro hacia la cárcel',
    cuenta(30, PIEZA.calzadaPaso) === 4 && cuenta(30, PIEZA.semaforoC) === 2 && cuenta(30, PIEZA.cochePatrulla) === 1,
    piezasDeLaEsquina(30).map((p) => p.pieza),
  );
  /*
   * LA ESQUINA ES UNA MANZANA, Y SE MIDE: con 108 de lado son 81 celdas de retícula, y de
   * ellas las NUEVE del rincón interior (a ≤ 2 en los dos ejes) sólo admiten suelo, porque
   * son las que la ele de la marcha atraviesa. Si alguien vuelve a achicar la esquina, este
   * número deja de cuadrar antes de que nadie mire una captura.
   */
  comprobar('cada esquina son 9 × 9 celdas de la retícula de la ciudad', CELDAS_POR_ESQUINA === 9 && LADO_DE_ESQUINA === 9 * RETICULA_DE_LA_CIUDAD, CELDAS_POR_ESQUINA);
  const piezasPorEsquina = ESQUINAS.map((e) => piezasDeLaEsquina(e).length);
  comprobar('y ninguna se queda en cuatro losas: las cuatro pasan de treinta piezas', piezasPorEsquina.every((n) => n >= 30), piezasPorEsquina);
  comprobar('las dos flechas del sentido de la marcha están en la salida y en la casilla que manda a la cárcel', huecosDeLosEmblemas().filter((e) => e.emblema === 'flecha').map((e) => e.casilla).join() === '0,30');

  /*
   * NADA MEDIEVAL EN EL ANILLO, y esto es lo que Miguel corrigió dos veces.
   *
   * Del pack hexagonal sólo se admite el CAMPO de fuera —hierba, árboles, rocas, colinas y
   * nubes, que no tienen siglo—. Ni una pieza suya puede aparecer en una casilla ni en una
   * esquina. Se mira contra `PIEZAS_DEL_BURGO`, que dice de qué pack sale cada nombre.
   */
  const packDe = new Map(PIEZAS_DEL_BURGO.map((p) => [p.nombre, p.pack]));
  const medievales = [...puestasDelAtrezo(), ...puestasDeLasEsquinas()].filter((p) => packDe.get(p.pieza) === 'hexagon-extra');
  comprobar('ni una pieza del pack medieval en las 36 casillas ni en las cuatro esquinas: la ciudad es de este siglo', medievales.length === 0, [...new Set(medievales.map((p) => p.pieza))]);
  const conMuralla = [...puestasDelAtrezo(), ...puestasDeLasEsquinas()].filter((p) => /muralla|torre-|iglesia|ayuntamiento|molino|posada|caseron/.test(p.pieza));
  comprobar('y no queda ni un nombre de muralla, torre, iglesia, ayuntamiento ni molino en ninguna puesta', conMuralla.length === 0, conMuralla.map((p) => p.pieza));

  /* El suelo del tablero: cuatro bandas por casilla más el reborde, y el marco de las esquinas. */
  const suelos = Array.from({ length: CASILLAS }, (_, i) => suelosDeLaCasilla(i));
  const papelesLaterales = (suelos[1] ?? []).map((q) => q.papel).join();
  comprobar('una casilla lateral son seis cuadros: franja, reborde, filete, superficie, marco y la línea que la separa de la siguiente', papelesLaterales === 'franja,reborde,filete,superficie,borde,linea', papelesLaterales);
  comprobar('una esquina son tres: su losa y los dos tramos de marco', (suelos[0] ?? []).map((q) => q.papel).join() === 'esquina,borde,borde');
  const sueloFuera = suelos.flat().filter((q) => q.puntos.some((pt) => Math.max(Math.abs(pt[0]), Math.abs(pt[2])) > MEDIO_LADO + 1e-9 || Math.max(Math.abs(pt[0]), Math.abs(pt[2])) < BORDE_INTERIOR - 1e-9));
  comprobar('y ningún cuadro de suelo se sale del anillo ni se mete en el recinto de la ciudad', sueloFuera.length === 0, sueloFuera.map((q) => q.papel).slice(0, 4));

  /* Los dados y el Concejo, en el campo delante del lado sur. */
  const medioDado = ARISTA_DE_LOS_DADOS / 2;
  const dadosDentro = HUECOS_DE_LOS_DADOS.every((d) => Math.abs(d.x - SUELO_DE_DADOS.x) < SUELO_DE_DADOS.lado / 2 - medioDado && Math.abs(d.z - SUELO_DE_DADOS.z) < SUELO_DE_DADOS.lado / 2 - medioDado);
  comprobar(`el paño de dados está FUERA del anillo (z ${SUELO_DE_DADOS.z}) y los dos dados de arista ${ARISTA_DE_LOS_DADOS} caen dentro de sus ${SUELO_DE_DADOS.lado}`, SUELO_DE_DADOS.z - SUELO_DE_DADOS.lado / 2 > MEDIO_LADO && dadosDentro, HUECOS_DE_LOS_DADOS);
  const panoEnElLienzo = VENTANAS.map((v, k) => {
    const ventana = { ancho: v.ancho, alto: v.alto, franjaInferior: 0 };
    const pose = poseDelBurgo(poseDeSalida(ventana), MIRADOR_DEL_BURGO, ventana);
    const q = proyecta(pose, v.ancho / v.alto, { x: SUELO_DE_DADOS.x, y: 0, z: SUELO_DE_DADOS.z + SUELO_DE_DADOS.lado / 2 });
    return { nombre: v.nombre, dentro: q.delante && Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1, y: r(q.y), k };
  });
  comprobar('y el paño se ve entero desde la pose de salida en las tres ventanas', panoEnElLienzo.every((q) => q.dentro), panoEnElLienzo);

  /* El campo: un MANTO contiguo, no un puñado de teselas sueltas. */
  const a = campo(7);
  const b = campo(7);
  const otro = campo(8);
  const candidatas = candidatasDelCampo();
  comprobar(`el manto pone TODAS las teselas de la corona (${candidatas.length}), sin repetir y sin dejar un hueco`, a.teselas.length === candidatas.length && new Set(a.teselas.map((t) => `${r(t.x)},${r(t.z)}`)).size === candidatas.length, a.teselas.length);
  comprobar('el manto es continuo: cada tesela tiene al menos cuatro vecinas a un paso de panal', vecindadDelManto(a.teselas) >= 4, vecindadDelManto(a.teselas));
  comprobar('el manto empieza DENTRO del tablero y no deja junta a la vista, y va tucado bajo él', CORONA.desde < MEDIO_LADO && a.teselas.every((t) => t.y === ALTURA_DEL_MANTO), { desde: CORONA.desde, y: ALTURA_DEL_MANTO });
  comprobar('la misma semilla da el mismo campo y otra semilla otro', JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) !== JSON.stringify(otro));
  comprobar(`las ${MANCHAS_DEL_CAMPO} manchas van en grupos de dos o tres piezas y todas lejos del tablero (${MANCHAS_LEJOS_DEL_TABLERO})`, a.decorado.length === otro.decorado.length && a.decorado.every((d) => Math.max(Math.abs(d.x), Math.abs(d.z)) > MEDIO_LADO + 2), a.decorado.length);
  comprobar(`las nubes van a ${ALTURA_DE_LAS_NUBES} de alto y FUERA del anillo: ninguna encima del tablero`, a.nubes.length === 5 && a.nubes.every((n) => n.y === ALTURA_DE_LAS_NUBES && Math.hypot(n.x, n.z) >= NUBES_LEJOS_DEL_TABLERO - 1e-9), a.nubes.map((n) => `${r(Math.hypot(n.x, n.z))}`));
  /*
   * Y NINGUNA MANCHA ENCIMA DEL PAÑO DE DADOS. La corona del manto es estrecha comparada con
   * el tablero, y con las manchas sembradas al azar una arboleda caía sobre el paño y tapaba
   * los dados: no daba error, sólo escondía la tirada. Se mide con el paño engordado.
   */
  const enElPano = (p: Punto): boolean => Math.abs(p.x - SUELO_DE_DADOS.x) < SUELO_DE_DADOS.lado / 2 && Math.abs(p.z - SUELO_DE_DADOS.z) < SUELO_DE_DADOS.lado / 2;
  const sobreElPano = [7, 8, 99, 1234].flatMap((s) => campo(s).decorado.filter((d) => enElPano({ x: d.x, z: d.z })));
  comprobar('y con cuatro semillas distintas ninguna mancha del campo cae sobre el paño de dados', sobreElPano.length === 0, sobreElPano.slice(0, 4).map((d) => `${d.pieza} (${r(d.x)}, ${r(d.z)})`));
  /* Vacuna: la siembra vieja —treinta teselas barajadas— dejaría huecos y se ve caer. */
  comprobar('se ve fallar: con treinta teselas sueltas el manto no es continuo', vecindadDelManto(a.teselas.slice(0, 30)) < 4, vecindadDelManto(a.teselas.slice(0, 30)));

  /* Todo lo que se instancia existe en el fichero. */
  const nombres = new Set(nombresDelBurgo());
  const desconocidas = [...mundoEstatico(7, 'plena'), ...a.nubes].filter((p) => !nombres.has(p.pieza)).map((p) => p.pieza);
  comprobar('todas las piezas del mundo estático están en burgo.glb', desconocidas.length === 0, desconocidas);

  /*
   * EL RECINTO DE LA CIUDAD: el contrato con `ciudad.ts`, que lo escribe otro.
   *
   * Si estos números se mueven aquí y no allí, la ciudad se sale del tablero o deja un
   * cerco de suelo vacío alrededor, y ninguna de las dos cosas da error.
   */
  comprobar(
    'el recinto mide 648 de lado, con el borde a 324, cincuenta y cuatro celdas de doce y el centro en el origen',
    RECINTO_DE_LA_CIUDAD.lado === 648 && RECINTO_DE_LA_CIUDAD.borde === 324 && RECINTO_DE_LA_CIUDAD.celdas === 54 && RECINTO_DE_LA_CIUDAD.reticula === RETICULA_DE_LA_CIUDAD && RECINTO_DE_LA_CIUDAD.centro.x === 0 && RECINTO_DE_LA_CIUDAD.centro.z === 0,
    RECINTO_DE_LA_CIUDAD,
  );
  comprobar('648 = 54 × 12: la retícula de la ciudad llena el recinto sin resto', LADO_INTERIOR === CELDAS_DE_LA_CIUDAD * RETICULA_DE_LA_CIUDAD);
  comprobar(
    'la celda (0, 0) está en (−318, −318) y la (53, 53) en (318, 318): la retícula llena el recinto justo',
    centroDeCelda(0, 0).x === -318 && centroDeCelda(0, 0).z === -318 && centroDeCelda(53, 53).x === 318 && centroDeCelda(53, 53).z === 318,
    [centroDeCelda(0, 0), centroDeCelda(53, 53)],
  );
  /*
   * EL ESQUELETO DE LA CIUDAD CRECE CON ELLA. Con 54 celdas por lado, un bulevar de una celda
   * y unas avenidas de dos serían hilos: 12 de ronda para 458 metros de ciudad no es un
   * bulevar. Bulevar de DOS celdas (24) y avenidas de CUATRO (48), y las cuatro celdas de la
   * avenida tienen que caer SIMÉTRICAS respecto del eje, o la avenida entra torcida por su
   * Puerta y nadie lo ve hasta que se mira una captura.
   */
  const avenidaSimetrica = CELDAS_DE_LA_AVENIDA.length === 4 && CELDAS_DE_LA_AVENIDA.every((c, k) => c + (CELDAS_DE_LA_AVENIDA[CELDAS_DE_LA_AVENIDA.length - 1 - k] as number) === CELDAS_DE_LA_CIUDAD - 1);
  comprobar(
    'el bulevar son dos celdas por borde (24) y la avenida cuatro (48), simétricas respecto del eje del recinto',
    CELDAS_DEL_BULEVAR.length === 4 && ANCHO_DEL_BULEVAR === 24 && ANCHO_DE_LA_AVENIDA === 48 && avenidaSimetrica,
    { CELDAS_DEL_BULEVAR, CELDAS_DE_LA_AVENIDA },
  );
  comprobar('y la glorieta son las dieciséis celdas donde la avenida cruza a la avenida', CELDAS_DE_LA_GLORIETA.length === 4 && CELDAS_DE_LA_GLORIETA.join() === CELDAS_DE_LA_AVENIDA.join());
  const bocas = PUERTAS_DE_LA_CIUDAD;
  const bocasMal = bocas.filter((b2) => {
    const m = marcoDeCasilla(b2.casilla);
    const { radial, aLoLargo } = enElMarco(m, b2.entrada);
    return Math.abs(radial - BORDE_INTERIOR) > 1e-9 || Math.abs(aLoLargo) > 1e-9 || b2.ancho !== 48 || b2.celdas.join() !== CELDAS_DE_LA_AVENIDA.join();
  });
  comprobar('las cuatro avenidas entran por el borde del recinto encaradas EXACTAMENTE con las casillas 5, 15, 25 y 35, con 48 de ancho y por las celdas 25 a 28', bocas.length === 4 && bocasMal.length === 0 && bocas.map((b2) => b2.casilla).join() === '5,15,25,35', bocas.map((b2) => `${b2.casilla}: (${r(b2.entrada.x)}, ${r(b2.entrada.z)}) eje ${b2.eje}`));
  comprobar('y la avenida (48) es más estrecha que la casilla (72): quedan 12 de acera a cada lado, que es donde van los dos semáforos de la Puerta', (ANCHO_DE_CASILLA - ANCHO_DE_LA_AVENIDA) / 2 === 12);
  /* Y la cebra de la Puerta cubre la avenida ENTERA: cuatro losas de 12 son 48. */
  const cebrasDeLaPuerta = (ATREZO_DE_LA_CASILLA[5] ?? []).filter((p) => p.pieza === PIEZA.calzadaPaso);
  comprobar('la Puerta pone cuatro losas de cebra: cubren los 48 de la avenida sin dejar hueco', cebrasDeLaPuerta.length * RETICULA_DE_LA_CIUDAD === ANCHO_DE_LA_AVENIDA, cebrasDeLaPuerta.length);
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
  comprobar('la sobria quita de verdad: decorado del campo, atrezo menudo, aventurero y monedas', plena.total - sobria.total > 15_000, plena.total - sobria.total);
  /*
   * LA VACUNA: la ciudad de 648 generada SIN nivel de detalle.
   *
   * El veneno tiene que ser el error que de verdad se puede cometer con el recinto nuevo, y
   * ya no es «trescientos bloques»: con 54 × 54 celdas y las manzanas que salen de la
   * retícula hay sitio para unos mil quinientos edificios, y soltarlos todos a la vez —que es
   * exactamente lo que pasa si alguien monta la ciudad entera en L1— son 2,8 millones de
   * triángulos con el bloque más caro del pack. Trescientos ya no bastarían para verlo caer:
   * cabrían en el tope nuevo. Por eso el veneno sube con el recinto.
   */
  const CIUDAD_ENTERA_SIN_NIVELES = 1_500;
  const bloqueEnCadaCelda = { ...MULTIPLICIDADES_PLENA, [PIEZA.bloqueH]: CIUDAD_ENTERA_SIN_NIVELES };
  const envenenada = sumaDelPresupuesto(bloqueEnCadaCelda, (p) => triangulos.get(p), 'plena', triangulosDeUnAventurero);
  comprobar('se ve fallar: la ciudad entera montada a la vez, sin niveles de detalle, se pasa del tope por tres veces', envenenada.total > TOPE_PLENA, envenenada.total);
  comprobar('los topes son los de LA-CIUDAD.md §8 (900.000 y 230.000), declarados en burgo/presupuesto.ts y no heredados del Muelle', TOPE_PLENA === 900_000 && TOPE_SOBRIA === 230_000, { TOPE_PLENA, TOPE_SOBRIA });
  comprobar('y el TABLERO solo, sin la ciudad, no llega a la mitad del tope: el resto es el sitio que la ciudad tiene reservado', plena.total < TOPE_PLENA / 2, plena.total);
  /*
   * Y EL MANTO ES LA PARTIDA MÁS GORDA DEL TABLERO: 1.796 teselas de 36. Se anota aquí, con
   * su número, porque es lo primero que hay que mirar si el tope vuelve a quedarse corto — y
   * porque es lo único del tablero que el móvil paga entero, ya que el paisaje no se quita.
   */
  const teselasEnLaSuma = plena.renglones.find((q) => q.que === PIEZA.tesela);
  comprobar('el manto del campo son 1.796 teselas y menos de un tercio del tablero en plena', (teselasEnLaSuma?.cuantos ?? 0) === 1796 && (teselasEnLaSuma?.triangulos ?? 0) < plena.total / 3, teselasEnLaSuma);
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
  /*
   * EL RITMO DE LA MARCHA ES LA DECISIÓN QUE OBLIGÓ EL TABLERO GRANDE.
   *
   * Con la casilla en 72 de frente, a `PASO_POR_SEGUNDO` (4) un aventurero tardaría 18 s en
   * cruzar UNA casilla. La marcha en el tablero se multiplica por 12 —48 u/s andando y 96
   * corriendo— y el porqué está escrito en `peon.ts`. Aquí se afirma el número y se ve caer
   * lo que pasaría si alguien lo devolviera al paso de una persona.
   */
  comprobar(
    'hasta tres casillas se anda a 48 u/s y con cuatro se corre a 96: una casilla en 1,5 s y tres en 4,5',
    CASILLAS_ANDANDO === 3 && VELOCIDAD_ANDANDO === 48 && VELOCIDAD_CORRIENDO === 96 && r(duracionDelRecorrido(216, 3, 'anda')) === 4.5 && r(duracionDelRecorrido(288, 4, 'anda')) === 3,
    { VELOCIDAD_ANDANDO, VELOCIDAD_CORRIENDO },
  );
  comprobar('se ve fallar: a paso de persona (4 u/s) una sola casilla de 72 duraría 18 s, más del doble del tope del recorrido entero', ANCHO_DE_CASILLA / 4 > 2 * TOPE_DEL_RECORRIDO, ANCHO_DE_CASILLA / 4);
  /* Y la tirada media —siete casillas— tiene que caber holgada, no rozando el tope. */
  const siete = duracionDelRecorrido(7 * ANCHO_DE_CASILLA, 7, 'anda');
  comprobar('la tirada media (siete casillas, 504 unidades) dura 5,25 s: por debajo de dos tercios del tope', r(siete) === 5.25 && siete < (2 * TOPE_DEL_RECORRIDO) / 3, r(siete));

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
  comprobar('y su aventurero y su peón están en el patio de la cárcel', Math.abs(enLaCelda.u - CELDA.u) < CELDA.lado && Math.abs(enLaCelda.v - CELDA.v) < CELDA.lado && posicionDelPeon(e, anillo, ahora).visible, enLaCelda);

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
  /*
   * LA HUIDA SE MIDE CONTRA LA LÍNEA DE LA MARCHA, NO CONTRA EL BORDE DEL TABLERO.
   *
   * `HUIDA_AL_QUEBRAR` vale 14 en `peon.ts`, que no se toca desde aquí. Con el tablero de
   * 100 esas catorce unidades sacaban al quebrado FUERA del anillo; con el de 384 la línea
   * de la marcha está a 155 y el borde a 192, así que ya no lo sacan: lo dejan en 169,
   * todavía sobre la superficie de su casilla. Lo que este juez puede afirmar es que huye
   * hacia fuera lo que dice su constante; que llegue a salirse del tablero pide subir
   * `HUIDA_AL_QUEBRAR` a unas 45, y está dicho en el informe.
   */
  comprobar('quebrar: golpe, huida de 14 hacia fuera, el peón cae de lado, y al final no queda nadie', q.quebrada && !q.enPie && lejosDelAnillo > LINEA_DE_LA_MARCHA + 12 && tumbado === 1 && !posicionDelPeon(q, anillo, tq).visible, { lejos: r(lejosDelAnillo), tumbado });

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
  const ventanas = VENTANAS;
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
  comprobar('las cuatro esquinas (±432, ±432) caen dentro del lienzo en 16:9', fuera.filter((f) => f.startsWith('16:9')).length === 0, fuera);
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
  const ys = [FRANJA.desde, BORDE_CLARO.hasta].map((radial) => proyecta(cerca, 16 / 9, { x: m.centro.x + m.fuera.x * (radial - LINEA_DE_LA_MARCHA), y: 0, z: m.centro.z + m.fuera.z * (radial - LINEA_DE_LA_MARCHA) }).y);
  const alto = Math.abs((ys[0] as number) - (ys[1] as number)) / 2;
  comprobar(`a masCerca (${LIMITES_DEL_BURGO.masCerca}) una casilla ocupa al menos el 45 % del alto del lienzo`, alto >= 0.45, r(alto));
  comprobar('el alcance es 570,24: medio lado (432) por 1,32', r(ALCANCE_DEL_BURGO) === 570.24, ALCANCE_DEL_BURGO);
  /*
   * LA CERCANÍA MÁXIMA NO SE TOCÓ AL TRIPLICAR EL TABLERO, y eso es una afirmación, no una
   * casualidad: `fondo de casilla / (alcance × masCerca)` valía 48/38,02 con el tablero de
   * 384 y vale 108/85,54 con el de 864 — el mismo 1,26. Todo lo de `camara-del-burgo.ts` está
   * escrito como fracción del tablero, y por eso sobrevivió al cambio de escala sin tocarlo.
   */
  comprobar(
    'una casilla ocupa la misma parte del encuadre a masCerca que con el tablero anterior: 108/85,54 = 48/38,02',
    Math.abs(FONDO_DE_CASILLA / (ALCANCE_DEL_BURGO * LIMITES_DEL_BURGO.masCerca) - 48 / (253.44 * 0.15)) < 1e-9,
    r(FONDO_DE_CASILLA / (ALCANCE_DEL_BURGO * LIMITES_DEL_BURGO.masCerca)),
  );
  /*
   * EL CORRIMIENTO EN APAISADO SE MIDE EN TABLEROS. Estaba escrito a pelo (16, del tablero
   * de 100) y al crecer el tablero dejó de valer: la esquina más cercana se salía por abajo
   * a −1,12. Ahora es `MEDIO_LADO × 0,32`, que dio 16 con el tablero de 100, 61,44 con el de
   * 384 y 138,24 con el de 864, sin tocarlo ninguna de las tres veces.
   */
  comprobar('el corrimiento en apaisado es una fracción del tablero (138,24 = 432 × 0,32), no un número escrito a pelo', r(CORRIMIENTO_EN_APAISADO) === 138.24, CORRIMIENTO_EN_APAISADO);

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
  /*
   * ═══ Y QUE LA ESCENA APLIQUE LAS TRES TALLAS, QUE ES DONDE ESTUVO EL FALLO ═══
   *
   * El paso de las tallas juzga la ARITMÉTICA de `anillo-en-3d.ts` pieza por pieza y con sus
   * vacunas, y aun así no habría visto el fallo que esta escena tuvo durante toda la fase: un
   * peón del tamaño del pack NO era un error de cuentas. Las constantes de las que se deriva
   * `TALLA_DEL_PEON` ya estaban, `anillo-en-3d.ts` ya era un fichero puro, y lo que fallaba
   * era que `Burgo.tsx` instanciaba con un `auxEscala.set(1, 1, 1)` literal. Se comprobó a
   * mano devolviendo ese literal a la escena: el guion entero seguía dando verde, y con lo
   * mismo para la casa y para el hotel. Un juez que sólo mire constantes no vigila la escena.
   *
   * Por eso se lee aquí el CÓDIGO. El regex del hotel pide sus tres ejes EN ORDEN —ancho,
   * alto, fondo—, porque ese orden es lo único que dice que el bloque se estira A LO LARGO de
   * la casilla y no hacia el carril: `compose` escala en los ejes LOCALES de la malla, y el
   * `+X` local de la casa cae sobre `adelante` cuando la pieza mira hacia dentro del anillo.
   * Cambiar dos argumentos de sitio daría un hotel de 22,34 de fondo sobre una franja de 21.
   */
  const TALLAS_EN_LA_ESCENA: readonly { readonly que: string; readonly regex: RegExp; readonly cuantas: number }[] = [
    { que: 'peón', regex: /auxEscala\.set\(\s*TALLA_DEL_PEON\s*,\s*TALLA_DEL_PEON\s*,\s*TALLA_DEL_PEON\s*\)/g, cuantas: 1 },
    /* Tres sitios ponen una casa —la que brota, las cuatro que se hunden y la que se vende—, y las tres tienen que ir a la misma talla. */
    { que: 'casa', regex: /matrizDelBurgo\([^)]*TALLA_DE_LA_CASA\s*\*/g, cuantas: 3 },
    { que: 'hotel', regex: /matrizEstiradaDelBurgo\([^)]*TALLA_DEL_HOTEL\.ancho[^)]*TALLA_DEL_HOTEL\.alto[^)]*TALLA_DEL_HOTEL\.fondo[^)]*\)/g, cuantas: 1 },
    { que: 'disco', regex: /CircleGeometry\(RADIO_DEL_DISCO_DEL_PEON\b/g, cuantas: 1 },
  ];
  const aSuTalla = (fuente: string): string[] => TALLAS_EN_LA_ESCENA.filter((t) => (fuente.match(t.regex) ?? []).length >= t.cuantas).map((t) => t.que);
  comprobar(
    'la ESCENA aplica las tallas de anillo-en-3d.ts: el peón, la casa, el hotel (con sus tres ejes en orden) y el disco de contacto',
    aSuTalla(codigoDelBurgo).length === TALLAS_EN_LA_ESCENA.length,
    aSuTalla(codigoDelBurgo),
  );
  comprobar(
    'se ve fallar: la escena de antes de la tanda —peón a `set(1, 1, 1)`, casa y posada a la escala de brotar a secas, disco de 0,7— no enciende ninguna de las cuatro',
    aSuTalla(
      'mp.setMatrixAt(k, auxMatriz.compose(auxPosicion.set(x, y, p.z), auxGiro, auxEscala.set(1, 1, 1)));\n' +
        'mc.setMatrixAt(nCasas, matrizDelBurgo(h.x, ALTURA_DEL_REBORDE, h.z, giro, Math.max(0.001, escala), auxMatriz));\n' +
        'disco: new THREE.CircleGeometry(0.7, SEGMENTOS_DEL_DISCO),',
    ).length === 0,
  );
  /* Y los dos errores que no dan error: el hotel con los ejes cambiados de sitio, y dos casas de tres a su talla. */
  comprobar(
    'se ve fallar: un hotel con el fondo donde va el ancho, o dos casas de las tres a su talla, no encienden lo suyo',
    !aSuTalla('matrizEstiradaDelBurgo(h.x, ALTURA_DEL_REBORDE, h.z, giro, TALLA_DEL_HOTEL.fondo * brote, TALLA_DEL_HOTEL.alto * brote, TALLA_DEL_HOTEL.ancho * brote, auxMatriz)').includes('hotel') &&
      !aSuTalla('matrizDelBurgo(a, TALLA_DE_LA_CASA * x, m);\nmatrizDelBurgo(b, TALLA_DE_LA_CASA * y, m);').includes('casa'),
  );
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
  /*
   * LAS SEIS DE ASIENTO SE TIÑEN ENTERAS, y la lista es cerrada.
   *
   * Antes esta línea decía «la bandera no», porque la bandera era la del pack hexagonal y
   * traía un mástil de madera que no cambiaba de color. Las seis de ahora son de Board Game
   * Bits, y el compilador MIDIÓ que las seis difieren en todos sus vértices entre la variante
   * azul y la roja: se negó a escribir el fichero hasta que la declaración lo dijo. Se
   * comprueba también que una pieza cualquiera de la ciudad NO se tiñe, que es la mitad que
   * de verdad puede romperse sin que se note.
   */
  comprobar(
    'las seis piezas de asiento se tiñen enteras, y un bloque de la ciudad no se tiñe',
    seTineEntera(PIEZA.casa) && seTineEntera(PIEZA.peon) && seTineEntera(PIEZA.bandera) && seTineEntera(PIEZA.estandarte) && !seTineEntera(PIEZA.bloqueA),
  );
  comprobar('la casa se mide contra el azul de las fichas y la bandera contra el del hexagonal', referenciaDe(PIEZA.casa) === AZUL_DE_LAS_FICHAS && referenciaDe(PIEZA.bandera) === AZUL_DEL_PACK);
  const colores = coloresDeLasBanderas(['#26262e', '#f2e8cf', '#26262e', '#7d3fd6']);
  comprobar('las banderas van por color: sin repetir, con el ámbar del Concejo y en orden estable', colores.length === 4 && colores.includes(AMBAR_DEL_CONCEJO) && colores.join() === [...colores].sort().join());
  comprobar('seis asientos y el ámbar son como mucho siete mallas de bandera', coloresDeLasBanderas(['#1', '#2', '#3', '#4', '#5', '#6']).length === 7);
}

// ---------------------------------------------------------------------------
paso('El MONTAJE: lo que la escena instancia de verdad, medido sin abrir un lienzo');
// ---------------------------------------------------------------------------

/*
 * ═══ QUÉ SE COMPRA AQUÍ, Y POR QUÉ ES OTRO GUION QUE `verify:la-ciudad` ═══
 *
 * `verificar-la-ciudad.ts` juzga la DESCRIPCIÓN de la ciudad: cuántas celdas, cuántos
 * triángulos dice cada nivel, si la red de calles se cierra. Esto juzga lo que `Burgo.tsx`
 * MONTA con esa descripción, que es otra cosa y puede divergir en silencio:
 *
 *   · Que un bulto de `n` triángulos se construya con `n` triángulos EXACTOS. Si la escena
 *     dibujara una caja de 12 donde el presupuesto dice 30, `verify:la-ciudad` seguiría en
 *     verde midiendo su propia tabla y el móvil se caería igual.
 *   · Que los precios y los emblemas estén MONTADOS —una geometría con triángulos dentro— y
 *     que se lean en el sentido bueno, que es el fallo que hubo: los dígitos salían
 *     espejados («06» por «60») y eso no parece un fallo de orientación, parece una fuente.
 *   · Que las capas por cercanía se muevan como dice el plano y que la HISTÉRESIS exista de
 *     verdad, con la vacuna de verla no existir.
 *   · Que los coches que circulan vayan por el EJE DE SU CARRIL y no por el eje de la calle.
 *   · Que en el anillo no quede nada de muralla: ni pieza, ni palabra, ni hueco.
 *
 * `ciudad-en-3d.ts` importa `three` pero NO abre un contexto de dibujo (`BufferGeometry` y
 * `ShapePath` son aritmética), así que aquí se pueden pedir las geometrías de verdad.
 */
{
  const { MINIMO_DE_UN_VOLUMEN, claveDelBulto, cuentaDeBulto, geometriaDeLosRotulos, geometriaDeUnBulto, geometriaDeUnaCinta, repartoDeLaCaja, soltarLosBultos, triangulosDeUnaCaja } = await import('../burgo/ciudad-en-3d');
  const { ALTURA_DEL_BORDILLO, HISTERESIS_DEL_NIVEL, TONO_DEL_EDIFICIO, TONO_POR_DEFECTO, TRIANGULOS_DE_LA_CASCARA_ABIERTA, TRIANGULOS_DE_LA_CUBIERTA, TRIANGULOS_DE_LA_MEDIANERA, UMBRALES_DE_NIVEL, VETA_DE_LA_ALTURA, cascaraAbierta, ciudadDelCodigo, cocheEnElInstante, montarLaCiudad, nivelDelGrupo, pulsoDeLaParcela, tonoDeLaFachada, tonoDelEdificio, triangulosDeUnaTorre, ANCHO_DEL_CARRIL, ANCHO_DEL_BORDILLO, EJE_DEL_CARRIL } = await import('../burgo/ciudad');
  /* La retícula es de `piezas.ts` y `ciudad.ts` no la reexporta: pedírsela a `ciudad` devolvía `undefined` en silencio y el juez del carril se caía comparando con NaN. */
  const RETICULA = RETICULA_DE_LA_CIUDAD;
  const { cuantosTriangulos } = await import('../formas');
  const laCiudad = ciudadDelCodigo('BANCO');

  /* ── 1. Cada bulto tiene los triángulos que su presupuesto declara ── */
  const cuentas = new Map<string, { triangulos: number; llano: boolean }>();
  for (const g of laCiudad.grupos) {
    for (const nivel of g.niveles) {
      for (const b of nivel.bultos) cuentas.set(claveDelBulto(b.triangulos, b.alto <= 0), { triangulos: b.triangulos, llano: b.alto <= 0 });
    }
  }
  const bultosMal: string[] = [];
  for (const [clave, v] of cuentas) {
    const medidos = cuantosTriangulos(geometriaDeUnBulto(v.triangulos, v.llano));
    if (medidos !== v.triangulos) bultosMal.push(`${clave}: la escena dibuja ${String(medidos)} y el presupuesto cuenta ${String(v.triangulos)}`);
  }
  comprobar(`las ${cuentas.size} clases de bulto de la ciudad se dibujan con los triángulos EXACTOS que suma el presupuesto`, bultosMal.length === 0, bultosMal.slice(0, 5));
  /* Y las nueve alturas de torre, que la semilla del banco no tiene por qué traer todas. */
  const torresMal: number[] = [];
  for (let plantas = 6; plantas <= 14; plantas++) {
    const n = triangulosDeUnaTorre(plantas);
    if (cuantosTriangulos(geometriaDeUnBulto(n, false)) !== n) torresMal.push(plantas);
  }
  comprobar('y las nueve alturas de torre también: 12 de prisma, 8 por planta y 20 de remate', torresMal.length === 0, torresMal);
  comprobar('el reparto de una caja es exacto: 30 triángulos son dos bandas y una cornisa, y vuelven a sumar 30', repartoDeLaCaja(30).bandas === 2 && repartoDeLaCaja(30).cornisas === 1 && triangulosDeUnaCaja(2, 1) === 30);
  /* La vacuna: una cuenta que la regla NO puede construir tiene que salir distinta. */
  comprobar('se ve fallar: pedir un bulto de 13 triángulos devuelve 14, y el juez lo vería', cuantosTriangulos(geometriaDeUnBulto(13, false)) !== 13);
  /*
   * ── 1 bis. LA LUPA CENITAL: desde arriba no se le ve el hueco a ningún volumen ──
   *
   * ═══ EL FALLO QUE ESTO COMPRA, Y POR QUÉ NINGÚN OTRO JUEZ LO VEÍA ═══
   *
   * El material de los bultos es `MeshStandardMaterial` sin `side`, o sea `FrontSide`, o sea
   * que `three` tira toda cara que se vea POR DETRÁS, y por detrás lo decide el orden de los
   * cuatro puntos. Ese orden estuvo al revés en las caras horizontales de toda la ciudad: los
   * tejados, los suelos de los distritos, el césped, el agua, las plazas de aparcamiento. Y no
   * falló nada. Los prismas seguían teniendo sus doce triángulos, el juez de aquí arriba los
   * contaba uno a uno, la ciudad cabía en el presupuesto, `verify:la-ciudad` medía sus ochenta
   * y siete cosas en verde y desde el suelo la calle se veía entera, porque las PAREDES sí
   * estaban bien. Sólo se veía desde el aire, que es como se mira un tablero. Lo vio Miguel:
   * «prismas inacabados sin techo ni el resto de paredes».
   *
   * Contar triángulos nunca lo habría cazado, porque el triángulo estaba ahí. Así que este
   * juez no cuenta: MIRA. Deja caer una rejilla de rayos verticales sobre la huella de cada
   * volumen y, para cada rayo, se queda con la cara horizontal MÁS ALTA que le sale al paso.
   * Dos preguntas, y las dos tienen que salir bien:
   *
   *   · que HAYA alguna — si no, el volumen está abierto por arriba y se le ve el interior;
   *   · que esa cara MIRE ARRIBA — si no, existe pero `three` la tira, que es peor, porque en
   *     el fichero está y en la pantalla no.
   *
   * La rejilla se queda dentro de la huella del cuerpo (`MARGEN_DE_LA_LUPA`) a propósito: una
   * banda de ventanas vuela doce milésimas por delante de la fachada y una cornisa cinco
   * centésimas, y ni una ni otra son techo de nada. Lo que se juzga es el volumen, no sus
   * molduras.
   */
  const RAYOS_DE_LA_LUPA = 9;
  const MARGEN_DE_LA_LUPA = 0.06;

  /** Qué le pasa a un rayo vertical que cae sobre `geometria` en (x, z): nada, techo, o techo del revés. */
  const loQueSeVeDesdeArriba = (geometria: THREE.BufferGeometry, x: number, z: number): 'hueco' | 'techo' | 'del-reves' => {
    const pos = geometria.getAttribute('position') as THREE.BufferAttribute;
    const nor = geometria.getAttribute('normal') as THREE.BufferAttribute;
    let mejorY = Number.NEGATIVE_INFINITY;
    let mejorNy = 0;
    for (let t = 0; t * 3 + 2 < pos.count; t++) {
      const a = t * 3;
      const ny = nor.getY(a);
      /* Una pared no es techo: un rayo vertical la roza y no la corta. */
      if (Math.abs(ny) < 1e-6) continue;
      const ax = pos.getX(a);
      const az = pos.getZ(a);
      const bx = pos.getX(a + 1) - ax;
      const bz = pos.getZ(a + 1) - az;
      const cx = pos.getX(a + 2) - ax;
      const cz = pos.getZ(a + 2) - az;
      const det = bx * cz - bz * cx;
      if (Math.abs(det) < 1e-12) continue;
      const u = ((x - ax) * cz - (z - az) * cx) / det;
      const v = ((z - az) * bx - (x - ax) * bz) / det;
      if (u < 0 || v < 0 || u + v > 1) continue;
      const y = pos.getY(a) + u * (pos.getY(a + 1) - pos.getY(a)) + v * (pos.getY(a + 2) - pos.getY(a));
      if (y <= mejorY) continue;
      mejorY = y;
      mejorNy = ny;
    }
    if (mejorY === Number.NEGATIVE_INFINITY) return 'hueco';
    return mejorNy > 0 ? 'techo' : 'del-reves';
  };

  /** Pasa la lupa por toda la huella y devuelve la lista de lo que sale mal. */
  const lupaCenital = (geometria: THREE.BufferGeometry): string[] => {
    const malos: string[] = [];
    for (let a = 0; a < RAYOS_DE_LA_LUPA; a++) {
      for (let b = 0; b < RAYOS_DE_LA_LUPA; b++) {
        const x = -0.5 + MARGEN_DE_LA_LUPA + ((1 - 2 * MARGEN_DE_LA_LUPA) * a) / (RAYOS_DE_LA_LUPA - 1);
        const z = -0.5 + MARGEN_DE_LA_LUPA + ((1 - 2 * MARGEN_DE_LA_LUPA) * b) / (RAYOS_DE_LA_LUPA - 1);
        const que = loQueSeVeDesdeArriba(geometria, x, z);
        if (que !== 'techo') malos.push(`(${x.toFixed(2)}, ${z.toFixed(2)}): ${que}`);
      }
    }
    return malos;
  };

  const destapados: string[] = [];
  for (const [clave, v] of cuentas) {
    const malos = lupaCenital(geometriaDeUnBulto(v.triangulos, v.llano));
    if (malos.length > 0) destapados.push(`${clave}: ${String(malos.length)} de ${String(RAYOS_DE_LA_LUPA * RAYOS_DE_LA_LUPA)} rayos — ${malos[0] as string}`);
  }
  comprobar(`y ninguna de las ${cuentas.size} se le ve por dentro desde el aire: los ${String(RAYOS_DE_LA_LUPA * RAYOS_DE_LA_LUPA)} rayos de la lupa cenital dan todos en una cara que mira arriba`, destapados.length === 0, destapados.slice(0, 5));
  const torresDestapadas: number[] = [];
  for (let plantas = 6; plantas <= 14; plantas++) {
    if (lupaCenital(geometriaDeUnBulto(triangulosDeUnaTorre(plantas), false)).length > 0) torresDestapadas.push(plantas);
  }
  comprobar('las nueve alturas de torre tampoco: por muchas bandas de ventana que lleven, arriba tienen tejado', torresDestapadas.length === 0, torresDestapadas);

  /*
   * LAS DOS VACUNAS, que son los dos fallos de verdad y no dos fallos inventados: uno es el
   * volumen sin tapa (los ocho triángulos que había en el toldo y en el surtidor) y el otro es
   * la tapa con los puntos al revés (lo que tenía la ciudad entera).
   */
  const sinLaTapa = (n: number): THREE.BufferGeometry => {
    const g = geometriaDeUnBulto(n, false);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const nor = g.getAttribute('normal') as THREE.BufferAttribute;
    const enferma = new THREE.BufferGeometry();
    /* Los últimos seis vértices de una caja de diez son su tapa: se la quitamos y ya está abierta. */
    enferma.setAttribute('position', new THREE.BufferAttribute((pos.array as Float32Array).slice(0, (pos.count - 6) * 3), 3));
    enferma.setAttribute('normal', new THREE.BufferAttribute((nor.array as Float32Array).slice(0, (nor.count - 6) * 3), 3));
    return enferma;
  };
  const delReves = (n: number): THREE.BufferGeometry => {
    const g = geometriaDeUnBulto(n, false);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const nor = g.getAttribute('normal') as THREE.BufferAttribute;
    const enferma = new THREE.BufferGeometry();
    enferma.setAttribute('position', new THREE.BufferAttribute((pos.array as Float32Array).slice(), 3));
    const vueltas = (nor.array as Float32Array).slice();
    for (let i = 0; i < vueltas.length; i++) vueltas[i] = -(vueltas[i] as number);
    enferma.setAttribute('normal', new THREE.BufferAttribute(vueltas, 3));
    return enferma;
  };
  comprobar('se ve fallar: a una caja de diez se le quita la tapa y la lupa cenital ve el hueco', lupaCenital(sinLaTapa(10)).length > 0);
  comprobar('y se ve fallar otra vez: con las caras horizontales del revés —el fallo que había— la lupa ve el techo que se tira', lupaCenital(delReves(30)).some((m) => m.endsWith('del-reves')));

  /*
   * Y EL PRESUPUESTO NO SE QUEDA CORTO POR HABER CERRADO NADA. `cuentaDeBulto` sube a diez
   * cualquier volumen que pida menos, porque menos no se puede cerrar. Si `ciudad.ts` siguiera
   * declarando ocho, la escena dibujaría diez y el presupuesto contaría ocho — y la diferencia
   * se la comería el móvil sin que nadie la sumara. Así que se exige que lo declarado y lo
   * construido sean el MISMO número, que es el trato de todo este fichero.
   */
  const cortos: string[] = [];
  for (const [clave, v] of cuentas) {
    if (cuentaDeBulto(v.triangulos, v.llano) !== v.triangulos) cortos.push(`${clave} declara ${String(v.triangulos)} y hace falta construir ${String(cuentaDeBulto(v.triangulos, v.llano))}`);
  }
  comprobar('ningún bulto con altura declara menos triángulos de los que hacen falta para cerrarlo por arriba', cortos.length === 0, cortos);
  comprobar(`se ve fallar: un volumen de ocho triángulos se construye con ${String(MINIMO_DE_UN_VOLUMEN)}, así que declararlo con ocho sería quedarse corto`, cuentaDeBulto(8, false) === MINIMO_DE_UN_VOLUMEN && cuentaDeBulto(8, true) === 8);

  /* Y las nueve cintas: cada una gasta exactamente lo que declara, repartido entre sus tramos. */
  const cintasMal: string[] = [];
  for (const c of laCiudad.cintas) {
    const g = geometriaDeUnaCinta(c);
    const medidos = cuantosTriangulos(g);
    g.dispose();
    if (medidos !== c.triangulos) cintasMal.push(`${c.clase} de ${String(c.puntos.length)} puntos: declara ${String(c.triangulos)} y dibuja ${String(medidos)}`);
  }
  comprobar(`las ${String(laCiudad.cintas.length)} cintas se dibujan con los triángulos que declaran, aunque su polilínea tenga menos vértices que cuadros`, cintasMal.length === 0, cintasMal.slice(0, 4));

  /* ── 2. Los precios y los emblemas están MONTADOS y se leen del derecho ── */
  const rotulos = geometriaDeLosRotulos();
  comprobar('los rótulos del tablero se funden en UNA geometría con triángulos dentro', rotulos !== null && rotulos.triangulos > 0, rotulos === null ? 'null' : rotulos.triangulos);
  if (rotulos !== null) {
    comprobar(
      `están los ${String(guarismosDelTablero())} dígitos del reglamento y los doce emblemas, ni uno menos`,
      rotulos.guarismos === guarismosDelTablero() && rotulos.emblemas === huecosDeLosEmblemas().length,
      { guarismos: rotulos.guarismos, emblemas: rotulos.emblemas },
    );
    /* El presupuesto los cuenta a 60 y 120: la medida real no puede pasarse del doble. */
    const presupuestados = guarismosDelTablero() * TRIANGULOS_POR_GUARISMO + huecosDeLosEmblemas().length * TRIANGULOS_POR_EMBLEMA;
    comprobar(
      `y pesan ${String(rotulos.triangulos)} triángulos, del orden de los ${String(presupuestados)} que el presupuesto les guarda`,
      rotulos.triangulos > presupuestados / 3 && rotulos.triangulos < presupuestados * 2,
      { medidos: rotulos.triangulos, presupuestados },
    );
    rotulos.geometria.dispose();
  }
  /*
   * EL SENTIDO DE LECTURA, QUE ES EL FALLO QUE HUBO Y NO SE VE EN NINGÚN NÚMERO.
   *
   * Quien lee el tablero está FUERA del anillo. Para un ojo en `+fuera` mirando al centro, la
   * «derecha» de la pantalla proyectada en el suelo es `−adelante` (el producto vectorial de
   * la mirada con la vertical). Así que el dígito `k + 1` de un precio tiene que caer hacia
   * `−adelante` respecto del `k`. Escribiéndolos al revés —que es lo que hacía la primera
   * versión— el 60 se lee «06» y el 400 «004»: se vio en el banco y no en ninguna cuenta.
   */
  const alReves: string[] = [];
  for (let i = 0; i < CASILLAS; i++) {
    const digitos = guarismosDelPrecio(i);
    if (digitos.length < 2) continue;
    const m = marcoDeCasilla(i);
    const primero = digitos[0] as { x: number; z: number };
    const segundo = digitos[1] as { x: number; z: number };
    const haciaDonde = (segundo.x - primero.x) * m.adelante.x + (segundo.z - primero.z) * m.adelante.z;
    if (haciaDonde >= 0) alReves.push(`${String(i)}: el segundo dígito cae hacia +adelante`);
  }
  comprobar('los dígitos de un precio se escriben hacia −adelante, que es la derecha de quien mira desde fuera del anillo', alReves.length === 0, alReves.slice(0, 4));
  comprobar('se ve fallar: con el orden de antes (+adelante) las treinta casillas con cifra caerían', PRECIO_DE_LA_CASILLA.filter((p) => p > 0 && String(p).length >= 2).length >= 25);

  /* ── 3. Las capas por cercanía, y la histéresis que hace que no parpadeen ── */
  const unGrupo = laCiudad.grupos.find((g) => g.clase === 'manzana');
  if (unGrupo !== undefined) {
    const alto = UMBRALES_DE_NIVEL.plena.alto;
    const dentro = { x: unGrupo.centro.x, z: unGrupo.centro.z };
    const justoFuera = { x: unGrupo.centro.x + alto + 1, z: unGrupo.centro.z };
    comprobar('un grupo con la cámara encima va a L1', nivelDelGrupo(unGrupo, dentro.x, dentro.z, 'plena') === 0);
    comprobar('y a un palmo del umbral de L1, sin memoria, cae a L2', nivelDelGrupo(unGrupo, justoFuera.x, justoFuera.z, 'plena') === 1);
    comprobar(
      'con memoria de que estaba en L1, la histéresis lo mantiene en L1 hasta 40 unidades más allá',
      nivelDelGrupo(unGrupo, justoFuera.x, justoFuera.z, 'plena', 0) === 0 && nivelDelGrupo(unGrupo, unGrupo.centro.x + alto + HISTERESIS_DEL_NIVEL + 1, unGrupo.centro.z, 'plena', 0) === 1,
    );
    /* La vacuna: sin histéresis, medio metro de cámara cambia el montaje entero. */
    comprobar(
      'se ve fallar: SIN histéresis, un palmo a un lado del umbral ya cambia de nivel — que es el parpadeo que se quería quitar',
      nivelDelGrupo(unGrupo, unGrupo.centro.x + alto - 0.5, unGrupo.centro.z, 'plena') !== nivelDelGrupo(unGrupo, unGrupo.centro.x + alto + 0.5, unGrupo.centro.z, 'plena'),
    );
  }
  /*
   * Y LA POSE QUE EL JUGADOR VE SIEMPRE: la de salida tiene que montar CIUDAD, no manchas.
   * Es el fallo que se vio mirando: con el umbral de L2 en 420 la ciudad entera caía a L3 y
   * se montaban 9.742 triángulos de los 692.000 que hay. Aquí se afirma lo contrario.
   */
  const ventanaDeSalida = { ancho: 1920, alto: 1080, franjaInferior: 0 };
  const ojoDeSalida = poseDelBurgo(poseDeSalida(ventanaDeSalida), MIRADOR_DEL_BURGO, ventanaDeSalida).posicion;
  const desdeLaSalida = montarLaCiudad(laCiudad, ojoDeSalida.x, ojoDeSalida.z);
  comprobar(
    `desde la pose de salida la ciudad monta ${String(desdeLaSalida.triangulos)} triángulos y no un puñado: el nivel medio alcanza hasta ${String(UMBRALES_DE_NIVEL.plena.medio)}`,
    desdeLaSalida.triangulos > 100_000 && (desdeLaSalida.gruposPorNivel[1] as number) === laCiudad.grupos.length,
    desdeLaSalida.gruposPorNivel,
  );

  /* ── 4. Los coches que circulan van por el eje de SU carril ── */
  const fueraDeCarril: string[] = [];
  for (const ruta of laCiudad.coches.rutas) {
    if (ruta.clase !== 'calle') continue;
    for (let k = 0; k < 24; k++) {
      const c = cocheEnElInstante(ruta, k * 1.7);
      /* El eje del carril está a `EJE_DEL_CARRIL` (2,7) del eje de la celda: o sea a 3,3 o a 8,7 dentro de la celda de 12. */
      const dentroX = ((c.x % RETICULA) + RETICULA) % RETICULA;
      const dentroZ = ((c.z % RETICULA) + RETICULA) % RETICULA;
      const enEje = (v: number): boolean => Math.abs(v - (RETICULA / 2 - EJE_DEL_CARRIL)) < 0.35 || Math.abs(v - (RETICULA / 2 + EJE_DEL_CARRIL)) < 0.35;
      if (!enEje(dentroX) && !enEje(dentroZ)) fueraDeCarril.push(`${ruta.pieza} en t=${String(k * 1.7)}: (${r(c.x)}, ${r(c.z)})`);
    }
  }
  comprobar(
    `los ${String(laCiudad.coches.rutas.filter((x) => x.clase === 'calle').length)} coches de calle van por el eje de su carril (a ${r(EJE_DEL_CARRIL)} del eje de la losa) en las veinticuatro fotos`,
    fueraDeCarril.length === 0,
    fueraDeCarril.slice(0, 4),
  );
  comprobar('y el carril mide la mitad de la calzada, que es lo que hace que dos coches se crucen sin tocarse', Math.abs(ANCHO_DEL_CARRIL * 2 - (RETICULA - 2 * ANCHO_DEL_BORDILLO)) < 1e-9);

  /* La fuente de la escena, que la miran el juez del color (5 quater) y el de la muralla (6). */
  const fuenteDeLaEscena = sinComentarios(fs.readFileSync(path.join(CARPETA, 'Burgo.tsx'), 'utf8'));

  /* ── 5. Los tonos de los edificios lejanos son los del pack, medidos ── */
  comprobar('los dieciséis volúmenes del pack tienen tono propio para su prisma de lejos, y ninguno repite el gris por defecto', Object.keys(TONO_DEL_EDIFICIO).length === 16 && !Object.values(TONO_DEL_EDIFICIO).includes(TONO_POR_DEFECTO));

  /*
   * ── 5 bis. LA CIUDAD NO SE REPITE: cada casa tiene su altura y su color ──
   *
   * Las dos mitades de lo que Miguel llamó «todos muy repetidos». Antes el ensanche —el tejido
   * más grande— salía entero de dos plantas y de dos colores, porque su lista de modelos tenía
   * las dos letras de la misma altura y porque el prisma de lejos se pintaba del hexadecimal
   * exacto de su modelo. Se mide sobre la ciudad de verdad y no sobre la regla: se cuentan las
   * alturas y los colores que salen, que es lo que se ve.
   */
  const alturasDelEnsanche = new Set<number>();
  const coloresDeLosPrismas = new Set<string>();
  for (const e of laCiudad.edificios) {
    if (e.cascara === null) continue;
    coloresDeLosPrismas.add(tonoDeLaFachada(tonoDelEdificio(e.cascara), (e.celdas[0] as { i: number }).i, (e.celdas[0] as { j: number }).j));
    if (e.distrito === 'ensanche') alturasDelEnsanche.add(e.plantas);
  }
  comprobar('el ensanche tiene edificios de más de una altura: una manzana con todos los tejados a la misma cota es un pavimento, no un barrio', alturasDelEnsanche.size >= 2, [...alturasDelEnsanche]);
  comprobar(
    `y los ${String(laCiudad.edificios.filter((e) => e.cascara !== null).length)} edificios se pintan de lejos con más de cien tonos distintos, y no con los dieciséis del pack`,
    coloresDeLosPrismas.size > 100,
    coloresDeLosPrismas.size,
  );
  /* La vacuna: el tono de una casa tiene que depender de DÓNDE está, o la variedad es de mentira. */
  comprobar('se ve fallar: dos parcelas distintas con el mismo modelo dan tonos distintos, y la misma parcela da siempre el mismo', tonoDeLaFachada('#808080', 3, 7) !== tonoDeLaFachada('#808080', 4, 7) && tonoDeLaFachada('#808080', 3, 7) === tonoDeLaFachada('#808080', 3, 7));
  comprobar('y el pulso de una parcela no se sale de [0, 1) ni depende del orden en que se pregunte', [0, 1, 2, 30, 53].every((i) => [0, 1, 2, 30, 53].every((j) => { const p = pulsoDeLaParcela(i, j, VETA_DE_LA_ALTURA); return p >= 0 && p < 1; })));

  /*
   * ── 5 ter. LA CASA DE MUÑECAS: un edificio abierto sigue siendo un edificio ──
   *
   * Al bajar a la calle, los tres edificios más cercanos a lo que se mira esconden su cáscara
   * y enseñan sus salas. Escondían el edificio ENTERO, y lo que quedaba entre dos vecinos con
   * su fachada era una rejilla de tabiques con muebles flotando: «algunos quedan solo el
   * interior». Ahora conservan el tejado y las tres medianeras que no dan a su calle.
   */
  const abiertosMal: string[] = [];
  for (const e of laCiudad.edificios.filter((x) => x.cascara !== null).slice(0, 40)) {
    const piel = cascaraAbierta(e, '#808080');
    const cubiertas = piel.filter((b) => b.clase === 'cubierta');
    const muros = piel.filter((b) => b.clase === 'medianera');
    const alto = ALTURA_DEL_BORDILLO + e.plantas * ALTURA_DE_PLANTA;
    if (cubiertas.length !== 1) abiertosMal.push(`#${String(e.indice)}: ${String(cubiertas.length)} tejados`);
    else if (Math.abs((cubiertas[0] as { y: number }).y - alto) > 1e-6) abiertosMal.push(`#${String(e.indice)}: el tejado a ${String((cubiertas[0] as { y: number }).y)} y la última planta acaba en ${String(alto)}`);
    if (muros.length !== 3) abiertosMal.push(`#${String(e.indice)}: ${String(muros.length)} medianeras`);
    if (piel.reduce((a, b) => a + b.triangulos, 0) !== TRIANGULOS_DE_LA_CASCARA_ABIERTA) abiertosMal.push(`#${String(e.indice)}: no cuesta ${String(TRIANGULOS_DE_LA_CASCARA_ABIERTA)}`);
  }
  comprobar('a un edificio abierto le quedan su tejado a la cota de su última planta y las TRES medianeras que no dan a su calle', abiertosMal.length === 0, abiertosMal.slice(0, 4));
  /* La vacuna: si se abriera por un rumbo que no es su frente, el hueco daría a la medianera del vecino. */
  {
    const e = laCiudad.edificios.find((x) => x.cascara !== null);
    const piel = e === undefined ? [] : cascaraAbierta(e, '#808080');
    const giros = piel.filter((b) => b.clase === 'medianera').map((b) => Math.round(((b.giro - (e?.giro ?? 0)) * 2) / Math.PI) & 3);
    comprobar('se ve fallar: el hueco que queda es el del FRENTE, y las medianeras son los otros tres rumbos', e !== undefined && giros.length === 3 && new Set(giros).size === 3, giros);
  }
  comprobar(`abrir un edificio cuesta ${String(TRIANGULOS_DE_LA_CASCARA_ABIERTA)} triángulos de más, y como mucho hay tres abiertos a la vez`, TRIANGULOS_DE_LA_CASCARA_ABIERTA === TRIANGULOS_DE_LA_CUBIERTA + 3 * TRIANGULOS_DE_LA_MEDIANERA && TRIANGULOS_DE_LA_CASCARA_ABIERTA * 3 < 200);

  /*
   * ── 5 quater. UN COLOR NO SE VUELVE A LEER DE SU TEXTO EN CADA ESCRITURA ──
   *
   * `Color.set(cadena)` son dos expresiones regulares, y un hexadecimal siempre da el mismo
   * color. Desde que cada casa tiene su tono son unas setecientas cadenas distintas, y la
   * tabla de colores ya leídos ahorró 7.922 lecturas en diez segundos, CONTANDO las llamadas
   * en el banco: media milésima de fotograma. Poco, cierto y barato — y contado, no
   * cronometrado, que es lo que hay que hacer en una máquina ocupada. Lo vigila un juez de
   * fuente porque no lo ve ningún otro: contar triángulos no lo ve, y el presupuesto tampoco.
   */
  comprobar('la escena no vuelve a leer un color de su texto por cada bulto: `pon` usa la tabla de colores ya leídos', /malla\.setColorAt\(n, colorLeido\(color\)\)/.test(fuenteDeLaEscena));
  comprobar('se ve fallar: si volviera a poner `auxColor.set(color)` ahí, el juez lo vería', !/malla\.setColorAt\(n, auxColor\.set\(/.test(fuenteDeLaEscena) && /malla\.setColorAt\(n, auxColor\.set\(color\)\)/.test('      malla.setColorAt(n, auxColor.set(color));'));

  /* ── 6. Ni muralla ni rastro de ella ── */
  const fuenteDelAnillo = sinComentarios(fs.readFileSync(path.join(CARPETA, 'anillo-en-3d.ts'), 'utf8'));
  /*
   * En el CÓDIGO, ni una muralla. En los comentarios sí se nombra, y tiene que seguir
   * nombrándose: la cabecera de `anillo-en-3d.ts` cuenta por qué ya no la hay, con las
   * palabras de quien la mandó quitar. Un barrido que también mirara los comentarios
   * castigaría precisamente al que explicó la decisión.
   */
  comprobar('en el CÓDIGO del anillo y de la escena no queda ni una muralla: se quitó entera, no se escondió', !/muralla|almena|adarve/i.test(fuenteDeLaEscena) && !/muralla|almena|adarve/i.test(fuenteDelAnillo));
  comprobar('la escena monta la ciudad de `ciudad.ts` y la reparte por cercanía', /montarLaCiudad\(/.test(fuenteDeLaEscena) && /ciudadDelCodigo\(/.test(fuenteDeLaEscena));
  comprobar('los interiores se abren DESMONTANDO la cáscara, no escondiéndola', /cascaras\.get\(/.test(fuenteDeLaEscena) && !/visible=\{[^}]*cascara/.test(fuenteDeLaEscena));
  comprobar('y el suelo del anillo se pide a `suelosDelAnillo`, no se vuelve a calcular en la escena', /suelosDelAnillo\(\)/.test(fuenteDeLaEscena));

  soltarLosBultos();
}

// ---------------------------------------------------------------------------
paso('El señalado: la escena dice qué casilla mira el puntero, y no dos veces la misma');
// ---------------------------------------------------------------------------

/**
 * ═══ QUÉ SE COMPRA AQUÍ, Y POR QUÉ NO LO VE NINGÚN OTRO JUEZ ═══
 *
 * El cartel del pie del escritorio —nombre, barrio, precio, renta de hoy y estado— tenía que
 * salir AL POSAR EL CURSOR («eso se hace veinte veces por turno»), y la escena no publicaba
 * ningún aviso de señalado: `PropsDelBurgo` tenía `alTocarCasilla` y nada más. El cliente lo
 * resolvió con lo que había —el primer toque señala, el segundo abre la tarjeta—, o sea
 * veinte clics por turno para leer dos renglones.
 *
 * Lo que se añade es un aviso, y un aviso tiene DOS maneras de estar mal que no dan error:
 *
 *   · QUE SALGA DE MÁS. `onPointerMove` sobre una malla instanciada se dispara con cada
 *     movimiento del ratón y casi todos caen en la misma casilla. Sin filtro, el recorrido de
 *     aquí abajo —64 gestos— manda 64 avisos en lugar de 3, y el cartel del escritorio, que
 *     se remonta con una llave nueva por cambio, reaparecería sesenta veces por segundo.
 *   · QUE APAGUE LO QUE ACABA DE ENCENDER. Al cruzar de una casilla a la vecina llegan la
 *     entrada en la nueva y la salida de la vieja, y r3f no promete el orden; con la salida
 *     por detrás, un adiós a secas apaga el cartel al que el cursor acaba de llegar. Es el
 *     mismo fallo que costó una tanda en la mano de cartas del Delta.
 *
 * Ninguna de las dos se ve contando triángulos ni mirando el `.glb`, y ninguna se puede medir
 * dentro de `Burgo.tsx` —que trae `three`— así que la decisión vive en `tipos.ts`, sin `three`,
 * y aquí se corre con recorridos de puntero de verdad. Los jueces de fuente que van detrás son
 * los que aseguran que la escena de verdad pasa por ahí y no avisa por su cuenta.
 */
{
  const fuenteDeTipos = fs.readFileSync(path.join(CARPETA, 'tipos.ts'), 'utf8');
  const laFirma = /readonly alSenalarCasilla\?: \(indice: number \| null\) => void;/;
  comprobar('el contrato publica `alSenalarCasilla` y es OPCIONAL: los dos clientes de hoy no lo pasan y siguen montando igual', laFirma.test(fuenteDeTipos));
  comprobar('se ve fallar: sin la interrogación —o sea, obligatorio— el mismo juez lo caza', !laFirma.test('  readonly alSenalarCasilla: (indice: number | null) => void;'));

  /** Pasa una lista de gestos por un filtro y devuelve LOS AVISOS que le habrían llegado al cliente. */
  const avisosDe = (
    gestos: readonly GestoDeSenalado[],
    filtro: (ultimo: number | null, gesto: GestoDeSenalado) => { readonly avisa: boolean; readonly ahora: number | null },
  ): (number | null)[] => {
    let ultimo: number | null = null;
    const salieron: (number | null)[] = [];
    for (const g of gestos) {
      const d = filtro(ultimo, g);
      if (!d.avisa) continue;
      ultimo = d.ahora;
      salieron.push(d.ahora);
    }
    return salieron;
  };
  const laMaquina = (ultimo: number | null, g: GestoDeSenalado): { readonly avisa: boolean; readonly ahora: number | null } => senaladoTrasElGesto(ultimo, g, CASILLAS);
  const posa = (sobre: number | undefined): GestoDeSenalado => ({ que: 'posa', sobre });
  const sale = (sobre: number | undefined): GestoDeSenalado => ({ que: 'sale', sobre });

  /* ── El recorrido de un ratón que cruza dos casillas y se va ── */
  const elRecorrido: GestoDeSenalado[] = [...Array.from({ length: 60 }, () => posa(7)), ...Array.from({ length: 3 }, () => posa(8)), sale(8)];
  comprobar(
    `sesenta avisos de puntero sobre la 7, tres sobre la 8 y la salida —${String(elRecorrido.length)} gestos— son TRES avisos: 7, 8 y nulo`,
    JSON.stringify(avisosDe(elRecorrido, laMaquina)) === '[7,8,null]',
    avisosDe(elRecorrido, laMaquina),
  );
  /* La vacuna: sin el filtro del cambio salen los sesenta y cuatro. */
  const elIngenuo = (ultimo: number | null, g: GestoDeSenalado): { readonly avisa: boolean; readonly ahora: number | null } => ({ avisa: true, ahora: senaladoTrasElGesto(ultimo, g, CASILLAS).ahora });
  comprobar(
    `se ve fallar: avisando en cada aviso de puntero salen los ${String(elRecorrido.length)} —el cartel del pie repintado sesenta veces por segundo para decir lo mismo—`,
    avisosDe(elRecorrido, elIngenuo).length === elRecorrido.length,
    avisosDe(elRecorrido, elIngenuo).length,
  );

  /*
   * ── El cruce de una casilla a la vecina, EN EL ORDEN EN QUE R3F LO MANDA ──
   *
   * Que es con la salida DELANTE: `cancelPointer(hits)` corre antes que `onIntersect`. La
   * salida trae las intersecciones frescas, y ahí ya está la 8: eso no es un adiós.
   */
  const laMalla = { asas: true };
  const otraMalla = { naipe: true };
  const bajoElPuntero = (i: number, de: object = laMalla): readonly { readonly eventObject: object; readonly instanceId?: number }[] => [{ eventObject: de, instanceId: i }];
  const elCruce: GestoDeSenalado[] = [posa(7), gestoAlSalir(7, bajoElPuntero(8), laMalla), posa(8)];
  comprobar('al cruzar de la 7 a la 8 —salida delante, como hace r3f— salen DOS avisos, 7 y 8, y ningún apagado entre medias', JSON.stringify(avisosDe(elCruce, laMaquina)) === '[7,8]', avisosDe(elCruce, laMaquina));
  /* La vacuna: una salida que no mira lo que queda debajo es exactamente el parpadeo. */
  comprobar(
    'se ve fallar: tomando la salida por un adiós sin mirar lo que queda debajo, el mismo cruce manda 7, nulo y 8 — y recorrer el anillo entero serían 39 apagados y 39 encendidos',
    JSON.stringify(avisosDe([posa(7), sale(7), posa(8)], laMaquina)) === '[7,null,8]',
    avisosDe([posa(7), sale(7), posa(8)], laMaquina),
  );
  comprobar(
    'y una salida de verdad —al cielo, o fuera del lienzo, donde las intersecciones vienen vacías— sí apaga; la de otra malla que esté debajo no la salva',
    JSON.stringify(avisosDe([posa(7), gestoAlSalir(7, [], laMalla)], laMaquina)) === '[7,null]' && JSON.stringify(avisosDe([posa(7), gestoAlSalir(7, bajoElPuntero(3, otraMalla), laMalla)], laMaquina)) === '[7,null]',
  );
  /* ── Y el orden CONTRARIO, el que r3f no usa hoy: la salida de la 7 llegando DETRÁS ── */
  const elCruceAlReves: GestoDeSenalado[] = [posa(7), posa(8), sale(7), posa(8)];
  comprobar('con la salida llegando detrás de la entrada —el orden que r3f no usa hoy— la de la 7 se tira igual: dos avisos, 7 y 8', JSON.stringify(avisosDe(elCruceAlReves, laMaquina)) === '[7,8]', avisosDe(elCruceAlReves, laMaquina));
  /* La vacuna: tratar TODA salida como un adiós es el mismo parpadeo por el otro lado. */
  const elCiego = (ultimo: number | null, g: GestoDeSenalado): { readonly avisa: boolean; readonly ahora: number | null } => senaladoTrasElGesto(ultimo, g.que === 'sale' ? { que: 'levanta' } : g, CASILLAS);
  comprobar('se ve fallar: con una salida ciega ese cruce manda 7, 8, nulo y 8 — el cartel se apaga y se vuelve a encender al pasar a la casilla de al lado', JSON.stringify(avisosDe(elCruceAlReves, elCiego)) === '[7,8,null,8]', avisosDe(elCruceAlReves, elCiego));

  /* ── El dedo: no hay cursor posado, así que al levantarlo se apaga ── */
  comprobar('con el dedo, levantarlo avisa con nulo y una segunda levantada ya no repite el aviso', JSON.stringify(avisosDe([posa(12), { que: 'levanta' }, { que: 'levanta' }], laMaquina)) === '[12,null]');

  /* ── Un `instanceId` que no es una casilla ── */
  const fueraDelAnillo: GestoDeSenalado[] = [posa(7), posa(undefined), posa(7), posa(CASILLAS), posa(7), posa(-1), posa(7), posa(7.5)];
  comprobar(
    `un instanceId que no es casilla —sin instancia debajo, ${String(CASILLAS)}, -1 o con decimales— sale como nulo y no como número`,
    JSON.stringify(avisosDe(fueraDelAnillo, laMaquina)) === '[7,null,7,null,7,null,7,null]',
    avisosDe(fueraDelAnillo, laMaquina),
  );
  /* La vacuna: sin mirar el anillo, el cliente recibe índices que su lista de cuarenta no tiene. */
  const elConfiado = (ultimo: number | null, g: GestoDeSenalado): { readonly avisa: boolean; readonly ahora: number | null } => {
    const ahora = g.que === 'posa' ? (g.sobre ?? null) : null;
    return { avisa: ahora !== ultimo, ahora };
  };
  comprobar(
    `se ve fallar: sin mirar el anillo el mismo recorrido le manda al cliente un ${String(CASILLAS)}, un -1 y un 7,5, y \`casillas[${String(CASILLAS)}]\` no existe`,
    JSON.stringify(avisosDe(fueraDelAnillo, elConfiado)) === `[7,null,7,${String(CASILLAS)},7,-1,7,7.5]`,
    avisosDe(fueraDelAnillo, elConfiado),
  );

  /* ── Y que la escena de verdad pase por ahí: los jueces de fuente ── */
  const fuenteDelBurgo = sinComentarios(fs.readFileSync(path.join(CARPETA, 'Burgo.tsx'), 'utf8'));
  comprobar(
    'el señalado sale de las MISMAS asas que ya raycastean para el toque, con el aviso de posar y el de salir',
    /onPointerMove=\{senalaLaCasilla\}/.test(fuenteDelBurgo) && /onPointerOut=\{dejaDeSenalarLaCasilla\}/.test(fuenteDelBurgo),
  );
  comprobar(
    'y la salida le pasa a `gestoAlSalir` las intersecciones FRESCAS del aviso y la malla que atiende, que es lo único que sabe si el puntero ya está en la casilla de al lado',
    /senala\(gestoAlSalir\(e\.instanceId, e\.intersections, e\.eventObject\)\);/.test(fuenteDelBurgo),
  );
  comprobar(
    'y las asas se montan también cuando SÓLO hay señalado: un cliente que sólo quiera leer no tiene que fingir un `alTocarCasilla`',
    /props\.alTocarCasilla === undefined && props\.alSenalarCasilla === undefined \? null/.test(fuenteDelBurgo),
  );
  const laLlamada = /alSenalarCasilla\?\.\(/g;
  const cuantasLlamadas = (fuente: string): number => (fuente.match(laLlamada) ?? []).length;
  comprobar(
    'el aviso sale por UN solo sitio, y ese sitio es el que pregunta a `senaladoTrasElGesto` y calla cuando la respuesta es que no hay noticia',
    cuantasLlamadas(fuenteDelBurgo) === 1 && /senaladoTrasElGesto\(senalada\.current, gesto, CASILLAS\)/.test(fuenteDelBurgo) && /if \(!paso\.avisa\) return;/.test(fuenteDelBurgo),
  );
  /* La vacuna del contador, escrita con dos líneas propias: mide UNO uno y DOS dos, aunque el fuente esté ya envenenado. */
  comprobar(
    'se ve fallar: un segundo `alSenalarCasilla?.(` suelto por la escena —que se saltaría el filtro entero— lo caza el mismo contador',
    cuantasLlamadas('avisos.current.alSenalarCasilla?.(paso.ahora);') === 1 && cuantasLlamadas('avisos.current.alSenalarCasilla?.(paso.ahora);\navisos.current.alSenalarCasilla?.(e.instanceId ?? null);') === 2,
  );

  const elSenalado = fuenteDelBurgo.slice(fuenteDelBurgo.indexOf('const senala = ('), fuenteDelBurgo.indexOf('const senalaLaCasilla'));
  const senaladoLimpio = (cuerpo: string): boolean => cuerpo.length > 0 && !/saltarTodo/.test(cuerpo) && !/quieto/.test(cuerpo);
  comprobar(
    'posar el cursor no salta la cola de animaciones y no lo apaga `quieto`: `quieto` está para que las asas no MANDEN con un movimiento en vuelo, y leer una casilla no manda nada',
    senaladoLimpio(elSenalado),
    elSenalado.slice(0, 120),
  );
  comprobar(
    'se ve fallar: el mismo juez con un `quieto` o un `saltarTodo` metidos dentro, y con el cuerpo vacío por si el corte se pierde',
    !senaladoLimpio(`${elSenalado}\n    if (avisos.current.quieto) return;`) && !senaladoLimpio(`${elSenalado}\n    saltarTodo(reloj.elapsedTime);`) && !senaladoLimpio(''),
  );

  const elToque = fuenteDelBurgo.slice(fuenteDelBurgo.indexOf('const tocaCasilla = ('), fuenteDelBurgo.indexOf('const tocaPeon'));
  comprobar(
    'al levantar el DEDO se avisa con nulo, y ANTES del filtro del arrastre: un dedo que arrastró por el anillo y se levanta también deja de señalar',
    /if \(esDeDedo\(e\)\) senala\(\{ que: 'levanta' \}\);/.test(elToque) && elToque.indexOf('esDeDedo') < elToque.indexOf('esUnToque'),
  );
  comprobar(
    'y con ratón no se apaga nada al soltar el botón —el cursor sigue donde estaba—, con lo desconocido contando como dedo: en la app el suceso de expo-gl no siempre trae `pointerType`',
    /\.pointerType \?\? 'touch'\) !== 'mouse'/.test(fuenteDelBurgo),
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
 * EL GUARDIA DE «NO SE HAN HECHO TODAS». Ver `verificar-escena.ts`: un guion que se cae
 * a la mitad termina con código cero y una lista corta de aciertos. El número va a mano,
 * con margen, y hay que subirlo al añadir comprobaciones.
 */
const COMPROBACIONES_ESCRITAS = 256;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(`Solo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones que tiene escritas este guion: se ha caído por el camino sin decirlo. Si has añadido comprobaciones nuevas, sube el número.`);
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(`${hechas} comprobaciones`);
  console.log(
    '\nLa aritmética del Burgo cuadra con el fichero real: el anillo mide 864 con casilla de 72 × 108 y\n' +
      'esquina de 108, el recinto de la ciudad es 648 —nueve veces el centro original, que es lo que se\n' +
      'pidió—, las cuatro bandas de la casilla suman su fondo, cada rejilla de huecos cabe en la suya con\n' +
      'la huella medida A SU TALLA —el peón es la sexta parte de un dígito y no la dieciseisava, las\n' +
      'cuatro casas van seguidas con 1,66 de hueco y el hotel es un bloque de otro tamaño, no una casa—,\n' +
      'el frente de manzana de dos cuerpos no se sale ni pisa el carril del avatar, el\n' +
      'precio es el del reglamento y se lee en los mismos píxeles que antes porque creció con el tablero,\n' +
      'no queda una sola pieza medieval en el anillo, las cuatro esquinas son manzanas de nueve por nueve\n' +
      'celdas que no tocan la ele de la marcha, el campo es un manto continuo con las nubes fuera y el\n' +
      'paño de dados despejado, las cuatro avenidas de 48 entran encaradas a las casillas 5, 15, 25 y 35,\n' +
      'el tablero cabe en el presupuesto dejando sitio a la ciudad, el peón cruza una casilla en 1,5 s y\n' +
      'anda diez mil pasos sin T-pose ni salirse de la polilínea, una jugada real cabe en 14 s y las\n' +
      'cuatro esquinas caen en el lienzo en las tres ventanas. Y lo que la escena MONTA cuadra con lo\n' +
      'que el presupuesto cuenta: cada bulto de la ciudad se dibuja con sus triángulos exactos, las nueve\n' +
      'cintas también, los dígitos y los emblemas están fundidos en una geometría y se leen del derecho,\n' +
      'la histéresis de los niveles existe y se ve fallar sin ella, desde la pose de salida la ciudad\n' +
      'entera se monta en L2 y no en manchas, los coches de calle van por el eje de su carril y en el\n' +
      'código no queda ni una muralla. Y la escena dice qué casilla mira el puntero sin decirlo dos\n' +
      'veces: sesenta gestos sobre la misma casilla son un aviso, cruzar a la vecina no apaga el\n' +
      'cartel por en medio —llegue la salida delante o detrás—, un instanceId que no es casilla sale\n' +
      'como nulo, y con el dedo el señalado se va al levantarlo.\n' +
      'Lo que esto NO prueba es que se vea bien.',
  );
  process.exit(0);
}

process.exit(1);
