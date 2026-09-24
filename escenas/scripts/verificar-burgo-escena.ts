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
import { NodeIO, getBounds } from '@gltf-transform/core';
import type { Node } from '@gltf-transform/core';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { CLIP, FIGURAS } from '../embarcadero/figuras';
import { DURACION } from '../embarcadero/gestos';
import { proyecta } from '../embarcadero/camara';
import { sorteo } from '../embarcadero/cala';
import { PIEZA, nombresDelBurgo } from '../burgo/piezas';
import type { NombreDePieza } from '../burgo/piezas';
import {
  ALTO_DEL_HOTEL,
  ALTO_DEL_PEON,
  ALTO_DEL_PEON_EN_EL_PACK,
  ALTO_DE_LA_CASA,
  ALTURA_DEL_MANTO,
  ALTURA_DE_LAS_NUBES,
  ALTURA_DEL_REBORDE,
  ALZA_DEL_ASFALTO,
  A_LA_MAZMORRA,
  CELDA_DEL_CUARTEL,
  DENTRO_DE_LA_CELDA,
  PASO_HACIA_LA_CELDA,
  PUERTA_DE_LA_CELDA,
  SUBIDA_DE_LA_REJA,
  ANCHO_DE_CASILLA,
  ANCHO_DE_TESELA,
  ANCHO_DEL_BULEVAR,
  ANCHO_DE_LA_AVENIDA,
  ANCHO_DEL_HOTEL,
  ANCHO_DE_LA_CASA,
  ANILLO_DEL_BURGO,
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
  COCHE_SOBRE_EL_ASFALTO,
  RUEDAS_BAJO_EL_ORIGEN,
  celdaDeEsquina,
  CORONA,
  DIAMETRO_DEL_PEON,
  ESQUINAS,
  FILETE,
  FONDO_DE_CASILLA,
  FONDO_DEL_HOTEL,
  FONDO_DE_LA_CASA,
  FRANJA,
  FERIA,
  FRENTE_MAXIMO_DEL_ATREZO,
  HOLGURA_DE_LA_MARCHA,
  HUECO_ENTRE_RENGLONES,
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
  CENTRO_DEL_SUELO_DE_LA_ESQUINA,
  CLARO_DEL_CONCEJO,
  EL_CONCEJO,
  LADO_DEL_SUELO_DE_LA_ESQUINA,
  SUPERFICIE,
  TALLA_DEL_HOTEL,
  TALLA_DEL_PEON,
  TALLA_DE_LA_CASA,
  V_DE_LAS_CASAS,
  ANCHO_DEL_ROTULO,
  MARGEN_DEL_TEXTO,
  MARGEN_DEL_TEXTO_EN_LAS_LATERALES,
  ROTULO_DE_LA_CASILLA,
  SUBTITULO_DE_LA_CASILLA,
  ALTO_DEL_NOMBRE,
  ALTO_DEL_PIE,
  CASILLAS_DE_CARTA,
  CASILLA_DEL_IMPUESTO_DE_LUJO,
  CASILLA_DEL_IMPUESTO_SOBRE_EL_CAPITAL,
  PASO_DEL_NOMBRE,
  POR_CIENTO_DEL_IMPUESTO,
  V_DEL_NOMBRE,
  V_DEL_PIE,
  altoDelRotuloDeEsquina,
  enEuros,
  renglonesDelNombre,
  vDelFinalDelNombre,
  anchoDeLaPalabra,
  campo,
  candidatasDelCampo,
  centroDeCelda,
  enElMarco,
  enLaEsquina,
  esSuelo,
  giraElPunto,
  giroHaciaFuera,
  huecoDeAventurero,
  huecoDeBandera,
  huecoDeCasa,
  huecoDePeon,
  huecoDePosada,
  huecoDePreso,
  huecoDeVisita,
  huecosDeLosEmblemas,
  largoDelTramo,
  letrasDelRotulo,
  letrasDelSubtitulo,
  marcoDeCasilla,
  mundoEstatico,
  puestaDeLaPiezaDeLaCasilla,
  PRECINTO,
  giroHaciaDentro,
  letrasDelPrecinto,
  puestasDeLasEsquinas,
  puestasDelAtrezo,
  puntoDelPrecintoEnElMundo,
  puntoEnEsquina,
  puntoEnLaCasillaPorV,
  radianesDeCuartos,
  sitioDeCasilla,
  sitioDelPrecinto,
  suelosDeLaCasilla,
  vDeRadial,
} from '../burgo/anillo-en-3d';
import type { LetraEnElTablero, MarcoDeCasilla, PiezaDeCasilla, Puesta, Punto } from '../burgo/anillo-en-3d';
import { BOCANADAS_DEL_HUMO as BOCANADAS_DEL_HUMO_EN_EL_COMPROBADOR, CASILLA_DEL_CANAL, CASILLA_DE_LA_CENTRAL, CASILLA_DE_LA_OFICINA, COLOR_DE_OBRA, DEL_MUNDO, MONEDA_DE_LA_RECAUDACION, ONDA_DEL_CANAL, bocaDeLaChimenea, carasDeLaOnda, carasDeUnaBocanada, centroDeLaAlberca, RECORRIDO_DE_LA_MONEDA, VIA, cajasDeLaOficina, triangulosDeLasPiezasVivas, caja as cajaDeObra, carasDeLaJoyaViva, carasDeLaMonedaDeLaRecaudacion, carasDeLaObraEnElMundo, carasDeLaRejaDeLaCelda, carasDeLaRuleta, carasDeLaTapa, carasDeLasObras, carasDelTren, casillasConObra, disco, esTriangulo, largoDeLaVia, letrasDeLosCarteles, monedaEnLaEscalinata, paradasDelTren, puntoEnLaVia, sitioDeLaRejaDeLaCelda, triangulosDeLasObras } from '../burgo/obras';
import type { CaraDeObra } from '../burgo/obras';
import { ALTO_DE_LA_LETRA, AVANCE_DE_LA_LETRA } from '../iconos';
import { ALTURA_DE_PLANTA, PIEZAS_DEL_BURGO, RETICULA_DE_LA_CIUDAD } from '../burgo/piezas';
import { BARRIOS, CASAS_DEL_CONCEJO as CASAS_DEL_REGLAMENTO, CASILLAS as CASILLAS_DEL_REGLAMENTO, PAGA_DE_LA_PUERTA_MAYOR, PARTE_DEL_IMPUESTO, POSADAS_DEL_CONCEJO as POSADAS_DEL_REGLAMENTO } from '../../shared/arcade/juegos/burgo-tablero';
import { COLORES_DEL_BURGO, maravedies } from '../../shared/arcade/juegos/burgo';
import {
  CASAS_DEL_CONCEJO,
  MULTIPLICIDADES_PLENA,
  MULTIPLICIDADES_SOBRIA,
  POSADAS_DEL_CONCEJO,
  TOPE_PLENA,
  TOPE_SOBRIA,
  TRIANGULOS_POR_EMBLEMA,
  TRIANGULOS_POR_LETRA,
  letrasDelTablero,
  sumaDelPresupuesto,
  triangulosDelPrecinto,
} from '../burgo/presupuesto';
import {
  A_LA_CELDA,
  CASILLAS_ANDANDO,
  DESVANECER,
  PASO_DE_LA_REJA,
  TOPE_DEL_RECORRIDO,
  TOPE_DE_VELOCIDAD,
  TOPE_POR_CASILLA_ANDANDO,
  VELOCIDAD_ANDANDO,
  VELOCIDAD_CORRIENDO,
  avanzar,
  clipQueToca,
  despedir,
  duracionDeLaFase,
  duracionDelRecorrido,
  encolar,
  etapaActual,
  etapasDe,
  largoDelCaminoALaCelda,
  largoDelRecorrido,
  nacer,
  pasaPorLaCelda,
  posicionDelPeon,
  posicionYRumbo,
  saltarLaCola,
  terminada as peonTerminado,
  velocidadDelClip,
} from '../burgo/peon';
import type { EstadoDelPeon, FaseDelPeon } from '../burgo/peon';
import { CASILLAS_DEL_ARCA, CASILLAS_DEL_PREGON, JOYA_QUE_GIRA, RULETA, TAPA_DEL_COFRE, TREN, aperturaDelCofre, avanceDelTren, avanzarLaCola, colaVacia, enCurso, encolar as encolarSucesos, A_LA_MAZMORRA as DURA_A_LA_MAZMORRA, HUMO, ONDA_DEL_AGUA, RECAUDACION, bocanadaDelHumo, duracionDelHumo, esRentaDe, ondaDelAgua, alzadoDeLaReja, alzadoDeLaRejaDeLaCelda, duracionDelDinero, duracionDelEncierro, duracionDelSuceso, esRecaudacion, finDeLaCola, momentoDeLaRecaudacion, giroDeLaJoya, giroDeLaRuleta, loQueAnimaUnaCarta, LUMINANCIA_EMPENADA, saltar, terminada as colaTerminada, vueltaDelTren } from '../burgo/coreografia';
import { dadosDelBurgoEnReposo, faseDeLosDadosConPar, parDeLaVista, saltoDelDoble } from '../burgo/dados-del-burgo';
import {
  ALTO_DE_LA_BANDEJA_EN_PARTES,
  ALZA_DEL_RENGLON_DE_LA_PLACA,
  ARISTA_DE_LOS_DADOS,
  ASA_DEL_RELOJ_DE_ARENA,
  BILLETE,
  BILLETES,
  BILLETES_A_LA_VISTA,
  CAJA,
  CAJON_DEL_RELOJ,
  CASAS_DEL_CONCEJO as CASAS_DE_LA_CAJA,
  CASITA,
  ENVOLVENTE_DEL_RELOJ,
  HOTELES_DEL_CONCEJO as HOTELES_DE_LA_CAJA,
  HOTELITO,
  LETRAS_DE_LA_PLACA,
  MAZO,
  MEDIA_DIAGONAL_DEL_DADO,
  MEDIA_DIAGONAL_DE_LA_CARA,
  MOVIMIENTO_DE_LOS_DADOS,
  PLACA,
  PROPORCIONES_DEL_RELOJ,
  TRIANGULOS_DEL_ASA_DE_LOS_DADOS,
  TRIANGULOS_DEL_ASA_DEL_RELOJ,
  TRIANGULOS_DEL_RELOJ_SIN_MODELO,
  TRIANGULOS_DEL_RELOJ_DE_RIBERAS,
  altoDelMazo,
  alzaMaximaDeLosDados,
  anchoDeLaBandejaEnPuntos,
  billetesDeLaCantidad,
  cabeceoHaciaElOjo,
  cajaDeLaBandeja,
  cajaDelAsaDeLosDados,
  cajaDelAsaDelReloj,
  carasDeLaCaja,
  carasDeUnEdificio,
  colorDelFieltro,
  distanciaEntreColores,
  formaDeLaBandeja,
  huecosDeLosDados,
  planoDeLaBandeja,
  poseDeLaBandeja,
  prisma,
  puntoDeLaBandejaEnLaCamara,
  puntoDeLaCamaraEnElLienzo,
  rectanguloDeLaBandeja,
  sacudidaMaximaDeLosDados,
  sitioDeLaPlaca,
  sitioDelBillete,
  sitiosDeLasCasas,
  sitiosDeLosHoteles,
  sitiosDeLosMazos,
  textoDelDinero,
  triangulosDeLaCaja,
  triangulosDeLasCaras,
  volumenesDeLaBandeja,
} from '../burgo/bandeja-de-los-dados';
import type { CaraDeLaBandeja, EsquinaDeLaBandeja, FormaDeLaBandeja, VolumenDeLaBandeja } from '../burgo/bandeja-de-los-dados';
import { DADO_MINIMO, PUNTO_DEL_DADO, PUNTO_MINIMO, reboteDelDado, saltoDelDado } from '../dados';
import { APARTE_MAXIMO as APARTE_MAXIMO_DE_LA_MIRADA } from '../acercar';
import {
  ALCANCE_DEL_BURGO,
  CAMPO_DE_LA_CAMARA,
  CERCANIA_DE_SEGUIMIENTO,
  CORRIMIENTO_EN_APAISADO,
  LIMITES_DEL_BURGO,
  MIRADOR_DEL_BURGO,
  NIEBLA_DE_LA_MESA,
  elAnilloSeVeJuntoALaCaja,
  nieblaDeLaMesa,
  poseDeSalida,
  poseDeSalidaAlLadoDeLaCaja,
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
const PUROS = ['tipos.ts', 'anillo-en-3d.ts', 'presupuesto.ts', 'coreografia.ts', 'peon.ts', 'dados-del-burgo.ts', 'bandeja-de-los-dados.ts', 'camara-del-burgo.ts', 'piezas.ts', 'a-pie.ts'];

{
  const conAlgo = FICHEROS.flatMap((f) => loProhibidoEn(fs.readFileSync(f, 'utf8')).map((q) => `${path.basename(f)}: ${q}`));
  comprobar(`ninguno de los ${FICHEROS.length} ficheros de escenas/burgo trae drei, document, window, fetch ni expo`, conAlgo.length === 0, conAlgo);
  const envenenado = `import { Html } from '@react-three/drei';\nconst w = window.innerWidth;\nfetch('/x');\nimport { Asset } from 'expo-asset';\nconst d = document.body;`;
  comprobar('se ve fallar: un fuente con drei, window, fetch, expo y document enciende los cinco', loProhibidoEn(envenenado).length === 5, loProhibidoEn(envenenado));
  comprobar('y el barrido no se traga los comentarios: un `// window` no cuenta', loProhibidoEn('// window y document\n/* fetch( */\nconst a = 1;').length === 0);
  const conThree = PUROS.filter((f) => fs.existsSync(path.join(CARPETA, f)) && /from\s+['"]three['"]|from\s+['"]three\//.test(sinComentarios(fs.readFileSync(path.join(CARPETA, f), 'utf8'))));
  comprobar(`los ${String(PUROS.length - 1)} ficheros de aritmética (y piezas.ts) no importan three`, conThree.length === 0, conThree);
  const faltan = PUROS.filter((f) => !fs.existsSync(path.join(CARPETA, f)));
  comprobar(`y los ${String(PUROS.length)} existen`, faltan.length === 0, faltan);

  /*
   * ═══ Y LO QUE SE MUDÓ A `escenas/comun/`, CON LAS MISMAS PROHIBICIONES ═══
   *
   * El cargador del reloj, el arranque y la medida, la marioneta, las props de tablero y el renglón del
   * presupuesto vivían, entre otros sitios, en esta carpeta, y este barrido los miraba. Se han mudado a
   * `comun/`, y el barrido va con ellos: sin esto, un `window` escrito allí llegaría al Burgo sin que
   * nadie lo viera. Y los dos de allí que leen `tipos.ts` y `presupuesto.ts` de aquí —puros, que este
   * guion importa en Node— tampoco pueden traer `three`: el regex de arriba mira el `import` de este
   * fichero, no el del que importa. CERO INSPECCIONADOS ES UN FALLO: se cuentan.
   */
  const COMUN = path.join(RAIZ, 'comun');
  const deComun = fs.existsSync(COMUN) ? fs.readdirSync(COMUN).filter((f) => /\.tsx?$/.test(f)) : [];
  const enComun = deComun.flatMap((f) => loProhibidoEn(fs.readFileSync(path.join(COMUN, f), 'utf8')).map((q) => `comun/${f}: ${q}`));
  comprobar(`ni ninguno de los ${String(deComun.length)} de escenas/comun, adonde se mudó parte de lo de aquí`, deComun.length >= 6 && enComun.length === 0, { deComun, enComun });
  const PUROS_DE_COMUN = ['presupuesto.ts', 'tablero.ts'];
  const comunConThree = PUROS_DE_COMUN.filter((f) => !fs.existsSync(path.join(COMUN, f)) || /from\s+['"]three['"]|from\s+['"]three\/|from\s+['"]react|@react-three\/fiber/.test(sinComentarios(fs.readFileSync(path.join(COMUN, f), 'utf8'))));
  comprobar('y los dos puros de comun que leen tipos.ts y presupuesto.ts existen y no traen three ni React', comunConThree.length === 0, comunConThree);
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
comprobar('el reborde de la franja mide lo que un bordillo del pack (0,6)', ALTURA_DEL_REBORDE === 0.6);
/*
 * EL NOMBRE ARRIBA Y EL PIE ABAJO, CON UN SOLO ALTO PARA LOS NOMBRES.
 *
 * Miguel, con la foto del tablero de mesa delante: el nombre arriba de la parte blanca —no en el
 * margen de color— y el precio abajo, los dos centrados, el precio «ligeramente más pequeño que
 * el nombre», y los nombres cortos del mismo tamaño que los largos. Los números gordos de 25 que
 * había se fueron.
 *
 * El alto de los nombres no es un número a ojo: es el MAYOR, a la décima, con el que la palabra más
 * ancha de todas las laterales cabe en el ancho útil —una palabra no se parte—. Se mide aquí por su
 * cuenta, palabra a palabra, y no con la función que lo calcula.
 */
comprobar(
  `el nombre empieza a 3 del blanco (v ${String(V_DEL_NOMBRE)}) y el pie acaba a 3 de su final (v ${String(V_DEL_PIE)})`,
  V_DEL_NOMBRE === vDeRadial(SUPERFICIE.desde) + 3 && V_DEL_PIE === vDeRadial(SUPERFICIE.hasta) - 3,
  { V_DEL_NOMBRE, V_DEL_PIE },
);
{
  const palabrasDeLasLaterales = Object.entries(ROTULO_DE_LA_CASILLA)
    .filter(([clave]) => !ESQUINAS.includes(Number(clave)))
    .flatMap(([, nombre]) => nombre.split(' '));
  const cabeA = (alto: number): string[] => palabrasDeLasLaterales.filter((palabra) => anchoDeLaPalabra(palabra, alto) > ANCHO_DEL_ROTULO + 1e-9);
  const laMasAncha = palabrasDeLasLaterales.reduce((a, b) => (anchoDeLaPalabra(b, 1) > anchoDeLaPalabra(a, 1) ? b : a));
  comprobar(
    `los nombres de las laterales van todos a ${String(ALTO_DEL_NOMBRE)}, el mayor alto a la décima con el que ${laMasAncha} cabe en los ${r(ANCHO_DEL_ROTULO)} útiles`,
    palabrasDeLasLaterales.length > 80 && cabeA(ALTO_DEL_NOMBRE).length === 0 && cabeA(Math.round((ALTO_DEL_NOMBRE + 0.1) * 10) / 10).length > 0,
    { alto: ALTO_DEL_NOMBRE, conUnaDecimaMas: cabeA(Math.round((ALTO_DEL_NOMBRE + 0.1) * 10) / 10) },
  );
  comprobar(
    `y el pie va «ligeramente más pequeño»: ${String(ALTO_DEL_PIE)}, entre el 80 % y el 95 % del nombre`,
    ALTO_DEL_PIE < ALTO_DEL_NOMBRE && ALTO_DEL_PIE >= 0.8 * ALTO_DEL_NOMBRE && ALTO_DEL_PIE <= 0.95 * ALTO_DEL_NOMBRE,
    { ALTO_DEL_PIE, ALTO_DEL_NOMBRE },
  );
}
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
 * QUE EL PEÓN SE VEA NO ES UNA OPINIÓN: SE MIDE CONTRA EL FRENTE DE SU CASILLA.
 *
 * Se medía contra el dígito del precio —«un octavo de eso es invisible», puso el encargo—, que era
 * la referencia de lo que se lee a esta distancia. Los dígitos gordos se fueron cuando el precio pasó
 * a escribirse abajo, como en el tablero de mesa, y la vara se queda con el mismo tamaño y otro
 * nombre: un treintaidosavo del frente de la casilla (2,25; el octavo del dígito de 18,75 era 2,34).
 * `DIAMETRO_DEL_PEON` es además lo máximo que el patio de la cárcel admite. La vacuna es el peón de
 * antes: a talla 1 no llegaba.
 */
const lindeDeLoInvisible = ANCHO_DE_CASILLA / 32;
console.log(`  el peón mide ${r(DIAMETRO_DEL_PEON)} de huella y ${r(ALTO_DEL_PEON)} de alto; el frente de su casilla, ${r(ANCHO_DE_CASILLA)}`);
comprobar(
  `el peón se ve: su huella (${r(DIAMETRO_DEL_PEON)}) pasa de un treintaidosavo del frente de su casilla (${r(lindeDeLoInvisible)})`,
  DIAMETRO_DEL_PEON > lindeDeLoInvisible && TALLA_DEL_PEON > 1,
  { DIAMETRO_DEL_PEON, lindeDeLoInvisible, TALLA_DEL_PEON: r(TALLA_DEL_PEON) },
);
comprobar('se ve fallar: el peón a la talla del pack (1,272) no llegaba', peonEnElPack.ancho < lindeDeLoInvisible, r(peonEnElPack.ancho));
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
paso('El precinto de una casilla hipotecada: cabe en su franja, se lee como el nombre, la bandera no pisa la palabra y no se confunde con ningún barrio');
// ---------------------------------------------------------------------------

/*
 * Miguel no reconoció una calle hipotecada —la franja apagada al 55 % y la bandera a media asta— y la
 * tomó por un fallo de color; pidió «como un precinto» en la celda de color (`PRECINTO`, en
 * `anillo-en-3d.ts`). Una captura enseña UNA casilla hipotecada; esto mide las treinta y seis
 * laterales, con la cinta puesta donde la pone la escena (`sitioDelPrecinto`).
 */
{
  const laterales = Array.from({ length: CASILLAS }, (_, i) => i).filter((i) => !marcoDeCasilla(i).esEsquina);
  /* Un punto del mundo en su casilla: `u` a lo largo de `adelante` desde el eje, y `v` desde la ciudad. */
  const enLaCasilla = (i: number, p: Punto): { readonly u: number; readonly v: number } => {
    const m = marcoDeCasilla(i);
    const dx = p.x - m.centro.x;
    const dz = p.z - m.centro.z;
    return { u: dx * m.adelante.x + dz * m.adelante.z, v: vDeRadial(LINEA_DE_LA_MARCHA + dx * m.fuera.x + dz * m.fuera.z) };
  };
  const medioLargo = PRECINTO.largo / 2;
  const medioAncho = PRECINTO.ancho / 2;
  const cintaFuera = (largo: number): string[] => {
    const salida: string[] = [];
    for (const i of laterales) {
      for (const [x, z] of [
        [-largo / 2, -medioAncho],
        [-largo / 2, medioAncho],
        [largo / 2, medioAncho],
        [largo / 2, -medioAncho],
      ] as const) {
        const q = enLaCasilla(i, puntoDelPrecintoEnElMundo(i, x, z));
        if (Math.abs(q.u) > ANCHO_DE_CASILLA / 2 - 1 || q.v < 1 || q.v > BANDA.franja - 1) salida.push(`${String(i)}: (${r(q.u)}, ${r(q.v)})`);
      }
    }
    return salida;
  };
  comprobar(
    `la cinta del precinto, de ${String(PRECINTO.largo)} × ${String(PRECINTO.ancho)} y sesgada, cabe en la franja de las ${String(laterales.length)} laterales con 1 de margen: no se sale ni pisa la línea de la casilla de al lado`,
    laterales.length === 36 && cintaFuera(PRECINTO.largo).length === 0,
    cintaFuera(PRECINTO.largo).slice(0, 4),
  );
  comprobar('se ve fallar: una cinta de lado a lado de la casilla, de 72, pisaría la línea de al lado', cintaFuera(ANCHO_DE_CASILLA).length > 0);

  /* Las letras, con la caja de su avance y su alto —desde la base hacia `−z`, que es hacia donde crece la silueta tumbada—, dentro de la cinta. */
  const letras = letrasDelPrecinto();
  const cajaDeLetra = (le: LetraEnElTablero): { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number } => {
    const ancho = anchoDeLaPalabra(le.letra, le.alto);
    return { x0: le.x - ancho / 2, x1: le.x + ancho / 2, z0: le.z - le.alto, z1: le.z };
  };
  const letrasFuera = letras.filter((le) => {
    const c = cajaDeLetra(le);
    return c.x0 < -medioLargo + 2 || c.x1 > medioLargo - 2 || c.z0 < -medioAncho + PRECINTO.canto + 1 || c.z1 > medioAncho - PRECINTO.canto - 1;
  });
  comprobar(
    `las ${String(letras.length)} letras de ${PRECINTO.texto} caben en la cinta: a 1 de sus cantos y a 2 de sus puntas`,
    letras.map((le) => le.letra).join('') === PRECINTO.texto && letrasFuera.length === 0,
    letrasFuera.map((le) => le.letra),
  );

  /* Se lee como el nombre: avanzando hacia la derecha de quien mira desde fuera, con el giro del nombre y el sesgo. */
  const vuelta = 2 * Math.PI;
  const malLeidas = (giroLocal: number): string[] => {
    const salida: string[] = [];
    for (const i of laterales) {
      const m = marcoDeCasilla(i);
      const enElMundo = letras.map((le) => puntoDelPrecintoEnElMundo(i, le.x, le.z));
      for (let k = 1; k < enElMundo.length; k++) {
        const a = enElMundo[k - 1] as Punto;
        const b = enElMundo[k] as Punto;
        if ((b.x - a.x) * -m.adelante.x + (b.z - a.z) * -m.adelante.z <= 0) salida.push(`${String(i)}: ${letras[k]?.letra ?? '?'} retrocede`);
      }
      const esperado = giroHaciaDentro(m) + PRECINTO.sesgo;
      const diferencia = ((((giroLocal + sitioDelPrecinto(i).giro - esperado) % vuelta) + vuelta) % vuelta);
      if (Math.min(diferencia, vuelta - diferencia) > 1e-9) salida.push(`${String(i)}: gira ${r(diferencia)}`);
    }
    return salida;
  };
  comprobar(
    `${PRECINTO.texto} se lee en las treinta y seis laterales como su nombre: hacia la derecha de quien mira desde fuera, con el giro del nombre más el sesgo`,
    letras.every((le) => le.giro === Math.PI) && malLeidas(Math.PI).length === 0,
    malLeidas(Math.PI).slice(0, 4),
  );
  comprobar('se ve fallar: con las letras giradas como una pieza que mira fuera, sale cabeza abajo en todas', malLeidas(0).length >= laterales.length);

  /* La bandera, llevada al marco de la cinta, lejos de la caja de cualquier letra. */
  const banderaEnLaCinta = (i: number, sesgo: number): { readonly x: number; readonly z: number } => {
    const p = huecoDeBandera(i);
    const s = sitioDelPrecinto(i);
    const giro = s.giro - PRECINTO.sesgo + sesgo;
    const dx = p.x - s.x;
    const dz = p.z - s.z;
    return { x: dx * Math.cos(giro) - dz * Math.sin(giro), z: dx * Math.sin(giro) + dz * Math.cos(giro) };
  };
  const hastaLaPalabra = (q: { readonly x: number; readonly z: number }): number =>
    Math.min(
      ...letras.map((le) => {
        const c = cajaDeLetra(le);
        return Math.hypot(Math.max(c.x0 - q.x, 0, q.x - c.x1), Math.max(c.z0 - q.z, 0, q.z - c.z1));
      }),
    );
  const conSuSesgo = Math.min(...laterales.map((i) => hastaLaPalabra(banderaEnLaCinta(i, PRECINTO.sesgo))));
  const alReves = Math.max(...laterales.map((i) => hastaLaPalabra(banderaEnLaCinta(i, -PRECINTO.sesgo))));
  comprobar(`la bandera del dueño queda a ${r(conSuSesgo)} de la palabra, más de 3: el sesgo baja el lado de la H, que es el suyo`, conSuSesgo > 3, conSuSesgo);
  comprobar(`se ve fallar: con el sesgo al revés, la bandera se queda a ${r(alReves)} de la H`, alReves <= 3, alReves);

  /* La cinta no se confunde con ninguna franja apagada, y la tinta se lee sobre la cinta. */
  const lineal = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const deLineal = (c: number): number => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
  const apagado = (hex: string): string =>
    `#${[0, 1, 2]
      .map((k) => Math.round(deLineal(lineal(Number.parseInt(hex.slice(1 + 2 * k, 3 + 2 * k), 16) / 255) * LUMINANCIA_EMPENADA) * 255))
      .map((v) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0'))
      .join('')}`;
  const sinBarrio = /const COLOR_DE_LA_FRANJA_SIN_BARRIO = '(#[0-9a-f]{6})'/.exec(fs.readFileSync(path.join(CARPETA, 'Burgo.tsx'), 'utf8'))?.[1] ?? '';
  const franjas = [...BARRIOS.map((b) => b.color), sinBarrio];
  const cercaDeLaCinta = (cinta: string): string[] => franjas.filter((f) => distanciaEntreColores(apagado(f), cinta) < 80).map((f) => `${f} apagado ${apagado(f)}`);
  comprobar(
    `la cinta amarilla no se confunde con ninguna de las ${String(franjas.length)} franjas apagadas —los ocho barrios y la de estaciones y servicios— y su tinta negra contrasta con ella`,
    BARRIOS.length === 8 && sinBarrio.length === 7 && cercaDeLaCinta(PRECINTO.color.cinta).length === 0 && distanciaEntreColores(PRECINTO.color.tinta, PRECINTO.color.cinta) > 250,
    cercaDeLaCinta(PRECINTO.color.cinta),
  );
  comprobar('se ve fallar: una cinta del ocre del barrio amarillo apagado se confunde con su franja', cercaDeLaCinta(apagado('#b8860b')).length > 0);
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
  /*
   * NINGUNA CASILLA SE QUEDA MUDA. Una casilla puede decir lo que es con su atrezo, un emblema, una
   * OBRA de `obras.ts` —el cofre de la Caja de Comunidad no lleva ni pieza ni emblema: lleva cofre—
   * o con lo que tiene escrito: su NOMBRE arriba y su PIE abajo, que ahora llevan las treinta y seis.
   * Lo que la regla vigila sigue siendo lo mismo: que no haya una casilla en la que no se vea nada.
   */
  const conObra = new Set(casillasConObra());
  const mudas = laterales.filter(
    (i) =>
      (ATREZO_DE_LA_CASILLA[i] ?? []).length === 0 &&
      !huecosDeLosEmblemas().some((e) => e.casilla === i) &&
      letrasDelSubtitulo(i).length === 0 &&
      !conObra.has(i) &&
      letrasDelRotulo(i).length === 0,
  );
  comprobar('y ninguna se queda muda: o lleva atrezo, o emblema, o obra, o su nombre y su pie', mudas.length === 0, mudas);

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
  comprobar(`ninguno se sale de la banda de atrezo (v ${ATREZO.desde}..${ATREZO.hasta}): ni pisa el nombre ni se sube al marco`, de('banda').length === 0, de('banda'));
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
  /*
   * NINGÚN EDIFICIO EN UNA CASILLA, y esta regla SUSTITUYE a la de antes.
   *
   * Hasta hoy cada solar llevaba un frente de manzana de dos cuerpos, y aquí se afirmaba que el
   * segundo se caía en sobria (`cuerposEnPlena === 2 * cuerposEnSobria`). Los cuerpos se han ido
   * enteros: a la talla del tablero un edificio del pack y una casa del jugador son dos bultos
   * que compiten, y lo que hay que leer de un vistazo es cuántas casas tiene puesta la casilla.
   *
   * Y la afirmación vieja NO SE PODÍA DEJAR PUESTA: con cero cuerpos seguiría en verde para
   * siempre —0 === 2 × 0— sin mirar absolutamente nada, que es el verde falso que esta casa ya
   * tiene anotado dos veces. Ésta dice lo contrario y se cae sola el día que alguien vuelva a
   * poner un edificio sobre una casilla.
   */
  const conCuerpo = puestasDelAtrezo('plena').filter((p) => p.pieza.startsWith('cuerpo-'));
  comprobar(
    'ninguna casilla lateral lleva un cuerpo de edificio: se confundiría con las casas y el hotel de la franja',
    conCuerpo.length === 0,
    conCuerpo.map((p) => p.pieza).slice(0, 5),
  );

  /*
   * EL PIE DICE LO QUE DICE EL REGLAMENTO. La tabla de precios de la escena es una copia, y el pie se
   * escribe con ella: «PRECIO 60 €» en los veintiocho títulos, «PAGA … €» en los dos impuestos —el de
   * Capital con su 10 %, §3.4— y «COGE CARTA» en las seis de carta. Aquí cada pie se reconstruye
   * desde el REGLAMENTO —su clase, su precio, `PARTE_DEL_IMPUESTO` y `maravedies`, que es como el
   * juego escribe los euros— y no desde la tabla.
   */
  const cifraMal: string[] = [];
  const pieMal: string[] = [];
  let piesMirados = 0;
  for (let i = 0; i < CASILLAS; i++) {
    const fila = CASILLAS_DEL_REGLAMENTO[i];
    const delReglamento = (fila?.precio ?? 0) as number;
    if ((PRECIO_DE_LA_CASILLA[i] ?? -1) !== delReglamento) cifraMal.push(`${i}: la tabla dice ${String(PRECIO_DE_LA_CASILLA[i])} y el reglamento ${String(delReglamento)}`);
    if (ESQUINAS.includes(i) || fila === undefined) continue;
    piesMirados++;
    const esperado =
      fila.clase === 'arca' || fila.clase === 'pregon'
        ? 'COGE CARTA'
        : fila.clase === 'diezmo'
          ? `PAGA ${maravedies(fila.precio)} O ${String(PARTE_DEL_IMPUESTO)} %`
          : fila.clase === 'alcabala'
            ? `PAGA ${maravedies(fila.precio)}`
            : `PRECIO ${maravedies(fila.precio)}`;
    if (SUBTITULO_DE_LA_CASILLA[i] !== esperado) pieMal.push(`${i}: el pie dice «${String(SUBTITULO_DE_LA_CASILLA[i])}» y el reglamento pide «${esperado}»`);
  }
  comprobar('el precio de cada casilla es EL DEL REGLAMENTO, copiado y vigilado casilla a casilla', cifraMal.length === 0, cifraMal.slice(0, 5));
  comprobar(`el pie de las ${String(piesMirados)} laterales dice lo del reglamento: su precio, lo que se paga o COGE CARTA`, pieMal.length === 0 && piesMirados === 36, pieMal.slice(0, 5));
  comprobar('llevan cifra los 28 títulos y los dos impuestos; las seis de carta y las cuatro esquinas no', PRECIO_DE_LA_CASILLA.filter((x) => x > 0).length === 30, PRECIO_DE_LA_CASILLA.filter((x) => x > 0).length);
  comprobar(
    'los euros de la escena se escriben como los del juego, también con millar: 60, 400, 1.500 y 12.000',
    [60, 400, 1500, 12000, 0].every((n) => enEuros(n) === maravedies(n)) && CASILLAS_DE_CARTA.length === 6 && POR_CIENTO_DEL_IMPUESTO === PARTE_DEL_IMPUESTO,
    [60, 400, 1500, 12000].map((n) => [enEuros(n), maravedies(n)]),
  );
  comprobar(
    'se ve fallar: un pie con el precio sin su símbolo, «PRECIO 60», no es el que pide el reglamento',
    `PRECIO ${maravedies(60)}` !== 'PRECIO 60' && CASILLA_DEL_IMPUESTO_SOBRE_EL_CAPITAL === 4 && CASILLA_DEL_IMPUESTO_DE_LUJO === 38,
  );

  /* Los emblemas: uno por casilla que no se compra, y caben en la mitad exterior. */
  const emblemas = huecosDeLosEmblemas();
  const emblemasMal = emblemas.filter((e) => {
    if (ESQUINAS.includes(e.casilla)) return false;
    const m = marcoDeCasilla(e.casilla);
    const { v, aLoLargo } = enElMarco(m, { x: e.x, z: e.z });
    return v - LADO_DEL_EMBLEMA / 2 < ATREZO.desde || v + LADO_DEL_EMBLEMA / 2 > ATREZO.hasta || Math.abs(aLoLargo) + LADO_DEL_EMBLEMA / 2 > ANCHO_DE_CASILLA / 2;
  });
  /*
   * YA NO QUEDA NINGÚN EMBLEMA DE CASILLA: las diez que los llevaban tienen obra propia, y un
   * icono plano de 27 tumbado justo donde se levanta el edificio no se lee ni como icono ni como
   * sombra. Lo que queda del emblema son las DOS FLECHAS de la marcha, que no dicen qué es una
   * casilla sino hacia dónde se va, y por eso no compiten con nada. Hoy es UNA: la de la Salida; la de
   * la comisaría la quitó Miguel.
   *
   * La regla de que una casilla no se quede muda sigue en pie unas líneas más arriba, y ahora
   * cuenta cinco formas de hablar en vez de tres: atrezo, emblema, cifra, OBRA o NOMBRE.
   */
  const emblemasDeCasilla = emblemas.filter((e) => !ESQUINAS.includes(e.casilla)).length;
  comprobar(
    'la flecha de la marcha está puesta, ninguna casilla lleva ya emblema plano, y lo que hay cabe en su banda',
    emblemas.length === 1 && emblemasDeCasilla === 0 && emblemasMal.length === 0,
    { emblemas: emblemas.length, deCasilla: emblemasDeCasilla, mal: emblemasMal.map((e) => `${e.casilla}/${e.emblema}`) },
  );
  comprobar('y las diez casillas que los llevaban tienen obra: cofre, oficina, casino, central, aguas y joya', [2, 4, 7, 12, 17, 22, 28, 33, 36, 38].every((i) => casillasConObra().includes(i)), casillasConObra());
  const barriosDelReglamento = BARRIOS.flatMap((b) => b.solares);
  /*
   * LOS 22 SOLARES, TODOS IGUALES Y SIN EDIFICIO.
   *
   * Aquí se afirmaba que cada solar llevaba DOS cuerpos del City Builder. Se fueron enteros:
   * a la talla del tablero un edificio del pack y una casa del jugador son dos bultos que
   * compiten, y lo que hay que leer de un vistazo es cuántas casas tiene puesta la casilla
   * (ver `solar` en `anillo-en-3d.ts`). Lo que queda es la farola del fondo.
   *
   * Se afirma EN POSITIVO —qué lleva, no qué no lleva— para que esto se caiga también el día
   * que alguien le cuelgue a un solar cualquier otra cosa, y no sólo un `cuerpo-`.
   */
  const solaresMal = barriosDelReglamento.filter((i) => {
    const piezas = ATREZO_DE_LA_CASILLA[i] ?? [];
    return piezas.length !== 1 || piezas[0]?.pieza !== PIEZA.farolaDeCalle;
  });
  comprobar('los 22 solares del reglamento llevan sólo su farola: ni un edificio, para que lo que sobresalga de la casilla sean las casas', solaresMal.length === 0, {
    solaresMal,
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
paso('El nombre, el pie y la franja del barrio se LEEN: proyectados en píxeles en 16:9, 3:4 y 9:19,5');
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
 * La cuenta de servilleta —«el tablero llena el ancho de la pantalla y se mira de frente»— no vale:
 * la cámara del Burgo mira desde 55° de altura y el lienzo del móvil es el 58 % del alto, así que
 * el tablero se ve escorzado. Se mide con `proyecta`, y en la casilla PEOR de las treinta y seis
 * —las de los lados de delante y de detrás, que son las que se ven escorzadas—.
 *
 * Hasta el cambio al tablero de mesa, el precio eran tres dígitos de 25 que se leían desde la pose
 * de salida hasta en el móvil. Ahora el nombre y el precio van en letra de 4,3 y 3,7, como en la
 * foto que mandó Miguel, y eso tiene un precio que se dice aquí en vez de esconderlo: desde la pose
 * de salida no se leen —es el tablero entero, y en un tablero de mesa mirado desde lejos tampoco—.
 * Se leen SIGUIENDO al que mueve en un PC, que es cuando la cámara se acerca sola a la casilla en la
 * que se cae; y en el móvil, ACERCÁNDOSE del todo (`masCerca`). Las dos medidas tienen suelo.
 *
 * La franja del barrio, en cambio, se sigue viendo desde la salida en las tres ventanas: el color es
 * lo que dice de quién es cada lado desde lejos.
 */
const PIXELES_MINIMOS_DE_LA_FRANJA = 3;
/**
 * Siguiendo al que mueve, en un PC: el nombre se lee como un texto pequeño de pantalla. Medido en la
 * casilla peor, 11,9 px el nombre y 9,4 el pie; el suelo queda justo debajo, para que cualquier cosa
 * que los encoja se vea caer.
 */
const PIXELES_MINIMOS_DEL_NOMBRE_AL_SEGUIR = 11;
const PIXELES_MINIMOS_DEL_PIE_AL_SEGUIR = 9;
/**
 * Y en el móvil, acercándose del todo: 6,7 y 5,2 px de CSS, que en una pantalla de densidad 3 son 20
 * y 15 píxeles de verdad. Es lo justo, y es el precio de la letra del tablero de mesa en un teléfono.
 */
const PIXELES_MINIMOS_DEL_NOMBRE_DE_CERCA = 6.5;
const PIXELES_MINIMOS_DEL_PIE_DE_CERCA = 5;

/** Cuántos píxeles de ALTO ocupa en el lienzo un tramo de `v` de una casilla, desde una cercanía. */
function pixelesDeUnTramo(ventana: { ancho: number; alto: number }, cercania: { factor: number; centro: { x: number; z: number } }, m: MarcoDeCasilla, v0: number, v1: number): number {
  const conFranja = { ancho: ventana.ancho, alto: ventana.alto, franjaInferior: 0 };
  const pose = poseDelBurgo(cercania, MIRADOR_DEL_BURGO, conFranja);
  const a = puntoEnLaCasillaPorV(m, 0, v0);
  const b = puntoEnLaCasillaPorV(m, 0, v1);
  const pa = proyecta(pose, ventana.ancho / ventana.alto, { x: a.x, y: 0, z: a.z });
  const pb = proyecta(pose, ventana.ancho / ventana.alto, { x: b.x, y: 0, z: b.z });
  if (!pa.delante || !pb.delante) return 0;
  return Math.hypot((pa.x - pb.x) * (ventana.ancho / 2), (pa.y - pb.y) * (ventana.alto / 2));
}

{
  const informe: string[] = [];
  const franjasCortas: string[] = [];
  for (const [k, v] of VENTANAS.entries()) {
    let peorFranja = Infinity;
    for (let i = 0; i < CASILLAS; i++) {
      if (ESQUINAS.includes(i)) continue;
      const m = marcoDeCasilla(i);
      peorFranja = Math.min(peorFranja, pixelesEntre(k, puntoEnLaCasillaPorV(m, 0, 0), puntoEnLaCasillaPorV(m, 0, BANDA.franja)));
    }
    informe.push(`${v.nombre}: franja ${r(peorFranja)} px`);
    if (peorFranja < PIXELES_MINIMOS_DE_LA_FRANJA) franjasCortas.push(`${v.nombre}: ${r(peorFranja)} px`);
  }
  console.log(`  desde la pose de salida — ${informe.join('; ')}`);
  comprobar(`la franja del barrio mide al menos ${PIXELES_MINIMOS_DE_LA_FRANJA} px en las tres ventanas`, franjasCortas.length === 0, franjasCortas);

  /* El nombre y el pie, en la casilla peor, a las dos cercanías que importan. */
  const peorEn = (ventana: { ancho: number; alto: number }, factor: number, alto: number, v0DeLaCasilla: (i: number) => number): number => {
    let peor = Infinity;
    for (let i = 0; i < CASILLAS; i++) {
      if (ESQUINAS.includes(i)) continue;
      const m = marcoDeCasilla(i);
      const v0 = v0DeLaCasilla(i);
      peor = Math.min(peor, pixelesDeUnTramo(ventana, { factor, centro: { x: m.centro.x, z: m.centro.z } }, m, v0, v0 + alto));
    }
    return peor;
  };
  const pc = VENTANAS[0] as { nombre: string; ancho: number; alto: number };
  const movil = VENTANAS[2] as { nombre: string; ancho: number; alto: number };
  const nombreAlSeguir = peorEn(pc, CERCANIA_DE_SEGUIMIENTO, ALTO_DEL_NOMBRE, () => V_DEL_NOMBRE);
  const pieAlSeguir = peorEn(pc, CERCANIA_DE_SEGUIMIENTO, ALTO_DEL_PIE, () => V_DEL_PIE - ALTO_DEL_PIE);
  const nombreDeCerca = peorEn(movil, LIMITES_DEL_BURGO.masCerca, ALTO_DEL_NOMBRE, () => V_DEL_NOMBRE);
  const pieDeCerca = peorEn(movil, LIMITES_DEL_BURGO.masCerca, ALTO_DEL_PIE, () => V_DEL_PIE - ALTO_DEL_PIE);
  console.log(`  siguiendo en ${pc.nombre}: nombre ${r(nombreAlSeguir)} px, pie ${r(pieAlSeguir)} px; de cerca en ${movil.nombre}: nombre ${r(nombreDeCerca)} px, pie ${r(pieDeCerca)} px`);
  comprobar(
    `siguiendo al que mueve en un PC, el nombre pasa de ${PIXELES_MINIMOS_DEL_NOMBRE_AL_SEGUIR} px y el pie de ${PIXELES_MINIMOS_DEL_PIE_AL_SEGUIR} en las 36 casillas`,
    nombreAlSeguir >= PIXELES_MINIMOS_DEL_NOMBRE_AL_SEGUIR && pieAlSeguir >= PIXELES_MINIMOS_DEL_PIE_AL_SEGUIR,
    { nombreAlSeguir: r(nombreAlSeguir), pieAlSeguir: r(pieAlSeguir) },
  );
  comprobar(
    `y en el móvil, acercándose del todo, el nombre pasa de ${PIXELES_MINIMOS_DEL_NOMBRE_DE_CERCA} px y el pie de ${PIXELES_MINIMOS_DEL_PIE_DE_CERCA}`,
    nombreDeCerca >= PIXELES_MINIMOS_DEL_NOMBRE_DE_CERCA && pieDeCerca >= PIXELES_MINIMOS_DEL_PIE_DE_CERCA,
    { nombreDeCerca: r(nombreDeCerca), pieDeCerca: r(pieDeCerca) },
  );
  /* La vacuna: un nombre de 2,5, que es lo que saldría si se partieran las palabras para agrandar las cortas, no se lee siguiendo. */
  comprobar('se ve fallar: un nombre de 2,5 no llega a leerse siguiendo al que mueve', peorEn(pc, CERCANIA_DE_SEGUIMIENTO, 2.5, () => V_DEL_NOMBRE) < PIXELES_MINIMOS_DEL_NOMBRE_AL_SEGUIR);
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
  /*
   * LA SALIDA NO LLEVA NI UNA PIEZA, y esto lo vigila porque era un cruce urbano entero.
   *
   * Lo pidió Miguel: «en vez de fragmentos de carretera únicamente una flecha roja y el mensaje
   * del tablero con SALIDA en grande». La regla de antes contaba el cruce, las seis cebras, las
   * cuatro farolas, los dos semáforos, el taxi y la berlina; ésta cuenta que no hay NADA, que es
   * lo único que un día de prisa puede deshacerse sin querer añadiendo «algo de ambiente».
   */
  comprobar('la salida no lleva ni una pieza: es la flecha y la palabra, y nada más', piezasDeLaEsquina(0).length === 0, piezasDeLaEsquina(0).map((p) => p.pieza));
  /*
   * LA CÁRCEL YA NO ES UNA MANZANA DE PISOS. Esta regla contaba cuatro bloques del pack —los
   * mismos con los que se construye la ciudad— y por eso no veía el problema que vio Miguel: con
   * ellos, la esquina se leía desde el aire como una manzana con el patio vallado y no como una
   * cárcel. Los bloques se fueron; el muro, las torretas, los barrotes y los dos pabellones los
   * levanta `obras.ts`. Lo que esta regla vigila ahora es lo que NO puede irse: la verja con su
   * hoja que sube —que es una pieza porque se anima— y las dos patrullas.
   */
  comprobar(
    'la cárcel conserva sus cuatro tramos de verja, sus dos hojas de puerta y dos patrullas, y ya no lleva ni bloques de pisos ni semáforos',
    cuenta(10, PIEZA.verja) === 4 &&
      cuenta(10, PIEZA.verjaPuerta) === 2 &&
      cuenta(10, PIEZA.cochePatrulla) === 2 &&
      cuenta(10, PIEZA.semaforoA) === 0 &&
      cuenta(10, PIEZA.bloqueA) + cuenta(10, PIEZA.bloqueB) + cuenta(10, PIEZA.bloqueC) + cuenta(10, PIEZA.bloqueD) === 0,
    piezasDeLaEsquina(10).map((p) => p.pieza),
  );
  /*
   * EL APARCAMIENTO, que era una plaza arbolada con tres terrazas hasta que Miguel pidió «un
   * parking que se vea real». Lo que lo hace legible desde el aire son los HUECOS: nueve coches en
   * dieciocho plazas. Lleno se leería como un atasco, y vacío como una pista de tenis.
   */
  const cochesDelAparcamiento = cuenta(20, PIEZA.cocheBerlina) + cuenta(20, PIEZA.cocheUtilitario) + cuenta(20, PIEZA.cocheFamiliar) + cuenta(20, PIEZA.cocheTaxi);
  comprobar(
    'el aparcamiento tiene nueve coches, dos farolas en la calle de en medio y su rincón verde',
    cochesDelAparcamiento === 9 &&
      cuenta(20, PIEZA.farolaDeCalle) === 2 &&
      cuenta(20, PIEZA.pinoPequeno) === 2 &&
      cuenta(20, PIEZA.arbusto) === 1 &&
      cuenta(20, PIEZA.mesaRedonda) === 0 &&
      cuenta(20, PIEZA.silla) === 0,
    piezasDeLaEsquina(20).map((p) => p.pieza),
  );
  /*
   * SIN CALLE EN LA CÁRCEL NI EN LA COMISARÍA. Miguel, mirando el tablero: «quita los trozos de
   * carretera tanto de la comisaría como de la cárcel para que se vea bien el texto». La calle de la
   * 10 y la avenida de la 30 cruzaban el nombre y el texto pequeño por la diagonal. Con ellas se fue
   * todo lo que sólo tenía sentido en una calle: cebras, aceras, semáforos, farolas y los coches que
   * circulaban. Queda el coche patrulla de la 30, aparcado y con el morro hacia la cárcel.
   */
  const deCalle: readonly string[] = [PIEZA.calzada, PIEZA.calzadaPaso, PIEZA.calzadaCruce, PIEZA.calzadaCurva, PIEZA.calzadaCurvaSuave, PIEZA.calzadaTe, PIEZA.solera, PIEZA.semaforoA, PIEZA.semaforoC, PIEZA.farolaDeCalle];
  const callejeras = [10, 30].flatMap((e) => piezasDeLaEsquina(e).filter((p) => deCalle.includes(p.pieza)).map((p) => `${String(e)}/${p.pieza}`));
  comprobar('la cárcel y la comisaría no llevan ni un trozo de calle: ni calzada, ni cebra, ni acera, ni semáforo, ni farola', callejeras.length === 0, callejeras);
  const patrulla = (PIEZAS_DE_LA_ESQUINA[30] ?? []).filter((p) => p.pieza === PIEZA.cochePatrulla);
  comprobar(
    '¡A comisaría! conserva su coche patrulla, aparcado sobre el suelo y con el morro hacia la cárcel, y ningún otro coche',
    patrulla.length === 1 && patrulla[0]?.giroEnCuartos === 1 && patrulla[0]?.alza === RUEDAS_BAJO_EL_ORIGEN && cuenta(30, PIEZA.cocheBerlina) + cuenta(30, PIEZA.cocheTaxi) === 0,
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
  /*
   * Las TRES amuebladas; la salida se quedó a propósito sin nada y la vigila su propia regla. Esto
   * contaba piezas —veinte, y después quince—, y dejó de tener sentido cuando lo que hay en cada
   * esquina pasó a ser OBRA: el aparcamiento, la cárcel y la comisaría. Así que lo que se mira es que
   * ninguna de las tres se quede sin la suya.
   */
  const conObraEnLaEsquina = new Set(casillasConObra());
  comprobar('y ninguna de las otras tres se queda vacía: el aparcamiento, la cárcel y la comisaría llevan su obra', [10, 20, 30].every((e) => conObraEnLaEsquina.has(e)), piezasPorEsquina);
  comprobar('la flecha del sentido de la marcha sólo está en la salida: la de la comisaría se quitó', huecosDeLosEmblemas().filter((e) => e.emblema === 'flecha').map((e) => e.casilla).join() === '0');

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

  /*
   * LA CAJA DEL BURGO (`bandeja-de-los-dados.ts`): los dados, el dinero, el reloj de arena, los mazos y
   * las casas del Concejo, pegados a la pantalla. Miguel no quería tener que buscar los dados en el
   * mapa, y la primera bandeja —sólo los dados, vistos casi desde arriba— le pareció pobre. Lo que se
   * mide aquí es lo que una captura no enseña: que en todos los lienzos y en las dos esquinas la
   * composición ENTERA —con los dados en lo alto del salto y el reloj— cabe, mide lo pedido y queda
   * pegada a su esquina; que se mira con la misma inclinación en todas partes; que cada pieza cabe en
   * su compartimento y no se esconde detrás de una pared; y que el dinero que se pinta es el que hay.
   */
  {
    const FORMAS: readonly FormaDeLaBandeja[] = ['completa', 'compacta'];
    const medioDado = ARISTA_DE_LOS_DADOS / 2;
    const temblor = sacudidaMaximaDeLosDados();
    const cabeCon = (r: { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number }, x0: number, x1: number, z0: number, z1: number, aire: number): boolean =>
      x0 >= r.x0 + aire - 1e-9 && x1 <= r.x1 - aire + 1e-9 && z0 >= r.z0 + aire - 1e-9 && z1 <= r.z1 - aire + 1e-9;
    const seSolapan = (a: { x0: number; x1: number; z0: number; z1: number }, b: { x0: number; x1: number; z0: number; z1: number }): boolean => a.x0 < b.x1 - 1e-9 && b.x0 < a.x1 - 1e-9 && a.z0 < b.z1 - 1e-9 && b.z0 < a.z1 - 1e-9;

    /* ── Los dados en su fieltro ── */
    /*
     * Quietos, pero GIRADOS sobre la vertical lo que diga su sello: a 45° un dado ocupa media diagonal de
     * su cara de cada lado, no media arista. Medido con media arista, los huecos de ±12 del paño
     * pasaban esta regla y en el banco los dos dados salían uno dentro del otro.
     */
    const cabenEnElFieltro = (forma: FormaDeLaBandeja, huecos: readonly Punto[]): boolean => {
      const f = planoDeLaBandeja(forma).dados;
      const lado = MEDIA_DIAGONAL_DE_LA_CARA + temblor;
      return huecos.every((h) => cabeCon(f, h.x - lado, h.x + lado, h.z - lado, h.z + lado, 2));
    };
    const noSeTocan = (huecos: readonly Punto[]): boolean => Math.abs((huecos[1]?.x ?? 0) - (huecos[0]?.x ?? 0)) >= 2 * MEDIA_DIAGONAL_DE_LA_CARA + 2 * temblor;
    comprobar(
      `en las dos formas de la caja, los dos dados de arista ${String(ARISTA_DE_LOS_DADOS)} caben quietos en su fieltro con 2 de aire y no se tocan, aun girados a 45° y temblando`,
      FORMAS.every((forma) => huecosDeLosDados(forma).length === 2 && cabenEnElFieltro(forma, huecosDeLosDados(forma)) && noSeTocan(huecosDeLosDados(forma))),
      FORMAS.map((forma) => ({ forma, huecos: huecosDeLosDados(forma), fieltro: planoDeLaBandeja(forma).dados })),
    );
    comprobar(
      'se ve fallar: con los huecos de ±12 del paño, dos dados girados a 45° se meten uno dentro del otro',
      !noSeTocan([
        { x: -12, z: 0 },
        { x: 12, z: 0 },
      ]),
    );

    /* ── El aire de los dados: las tres curvas de verdad, recorridas, y no los números que la caja dice que usan ── */
    let alzaMedida = 0;
    for (let k = 0; k <= 3000; k++) {
      const t = (k / 3000) * 1.5;
      alzaMedida = Math.max(
        alzaMedida,
        saltoDelDado(t) * ARISTA_DE_LOS_DADOS * MOVIMIENTO_DE_LOS_DADOS.salto,
        reboteDelDado(t) * ARISTA_DE_LOS_DADOS * MOVIMIENTO_DE_LOS_DADOS.rebote,
        saltoDelDoble([4, 4], t) * ARISTA_DE_LOS_DADOS * MOVIMIENTO_DE_LOS_DADOS.doble,
      );
    }
    const aireDeLosDados = (forma: FormaDeLaBandeja): VolumenDeLaBandeja | undefined => volumenesDeLaBandeja(forma)[1];
    comprobar(
      `el aire que la composición reserva a los dados llega a lo más alto de un dado de verdad —recorridas las tres curvas, el centro sube ${r(alzaMedida)}, y se reservan ${r(alzaMaximaDeLosDados())} más la media diagonal— y a lo más ancho de uno que da vueltas y tiembla, en las dos formas`,
      alzaMedida <= alzaMaximaDeLosDados() + 1e-9 &&
        alzaMedida > alzaMaximaDeLosDados() - 0.05 &&
        FORMAS.every((forma) => {
          const v = aireDeLosDados(forma);
          const lado = MEDIA_DIAGONAL_DEL_DADO + temblor;
          return v !== undefined && v.y0 <= 0 && v.y1 >= medioDado + alzaMaximaDeLosDados() + MEDIA_DIAGONAL_DEL_DADO - 1e-9 && huecosDeLosDados(forma).every((h) => h.x - lado >= v.x0 - 1e-9 && h.x + lado <= v.x1 + 1e-9 && h.z - lado >= v.z0 - 1e-9 && h.z + lado <= v.z1 + 1e-9);
        }),
      { alzaMedida, aire: FORMAS.map(aireDeLosDados) },
    );

    /* ── Lo que ocupa en el lienzo ── */
    const LIENZOS_DE_LA_CAJA: readonly { readonly nombre: string; readonly ancho: number; readonly alto: number }[] = [
      ...VENTANAS,
      { nombre: 'móvil 375×812', ancho: 375, alto: 812 },
      { nombre: 'apaisado 844×390', ancho: 844, alto: 390 },
      { nombre: 'recuadro 288×317', ancho: 288, alto: 317 },
      { nombre: 'justo completa 600×540', ancho: 600, alto: 540 },
      { nombre: 'justo compacta 599×540', ancho: 599, alto: 540 },
      { nombre: 'el panel del banco 961×421', ancho: 961, alto: 421 },
      { nombre: 'portátil 1280×720', ancho: 1280, alto: 720 },
      { nombre: 'monitor 1600×900', ancho: 1600, alto: 900 },
    ];
    const ESQUINAS_DE_LA_BANDEJA: readonly EsquinaDeLaBandeja[] = ['abajo-derecha', 'arriba-derecha'];
    const MARGEN = 12;
    const poses = LIENZOS_DE_LA_CAJA.flatMap((v) => ESQUINAS_DE_LA_BANDEJA.map((esquina) => ({ v, esquina, pose: poseDeLaBandeja(v.ancho, v.alto, CAMPO_DE_LA_CAMARA, { esquina, margen: MARGEN }) })));
    const malPosadas = poses
      .filter(({ v, esquina, pose }) => {
        const q = pose.rectangulo;
        const pedido = Math.min(v.ancho - 2 * MARGEN, anchoDeLaBandejaEnPuntos(v.ancho, v.alto));
        const techo = Math.min(v.alto - 2 * MARGEN, ALTO_DE_LA_BANDEJA_EN_PARTES[pose.forma] * v.alto);
        const dentro = q.x0 >= 0 && q.y0 >= 0 && q.x1 <= v.ancho && q.y1 <= v.alto;
        const pegada = Math.abs(q.x1 - (v.ancho - MARGEN)) < 0.5 && (esquina === 'abajo-derecha' ? Math.abs(q.y1 - (v.alto - MARGEN)) < 0.5 : Math.abs(q.y0 - MARGEN) < 0.5);
        /* O mide de ancho lo pedido sin pasar de su techo, o la para el techo y mide menos. */
        const mide = Math.abs(q.x1 - q.x0 - pedido) < 0.5 ? q.y1 - q.y0 <= techo + 0.5 : Math.abs(q.y1 - q.y0 - techo) < 0.5 && q.x1 - q.x0 < pedido;
        return !dentro || !pegada || !mide || pose.forma !== formaDeLaBandeja(v.ancho, v.alto);
      })
      .map(({ v, esquina, pose }) => `${v.nombre} ${esquina}: ${r(pose.rectangulo.x0)}..${r(pose.rectangulo.x1)} × ${r(pose.rectangulo.y0)}..${r(pose.rectangulo.y1)}`);
    comprobar(
      `en ${String(LIENZOS_DE_LA_CAJA.length)} lienzos y en las dos esquinas (${String(poses.length)} poses) la composición entera cabe, queda a ${String(MARGEN)} puntos de su esquina y mide de ancho lo pedido —la mitad del lienzo en la completa— o lo que le deja su techo de alto, medido proyectado`,
      poses.length === LIENZOS_DE_LA_CAJA.length * 2 && malPosadas.length === 0,
      malPosadas,
    );
    /*
     * LA VACUNA ES LA CUENTA QUE HUBO: la escala sacada del ancho de la caja a la distancia del ojo, en el
     * centro del lienzo. Con la perspectiva de verdad, lo que está más cerca del ojo y lo que queda lejos
     * del centro mide más, y en un móvil la caja se salía por la izquierda.
     */
    const conLaEscalaDelCentro = (ancho: number, alto: number, esquina: EsquinaDeLaBandeja): { readonly x0: number; readonly x1: number } => {
      const forma = formaDeLaBandeja(ancho, alto);
      const d = CAJA.distancia;
      const porPunto = d / (alto / 2 / Math.tan((CAMPO_DE_LA_CAMARA * Math.PI) / 360));
      const c = cajaDeLaBandeja(forma);
      const escala = (anchoDeLaBandejaEnPuntos(ancho, alto) * porPunto) / (c.x1 - c.x0);
      const centro = { x: 0, y: 0, z: -d };
      for (let k = 0; k < 12; k++) {
        const q = rectanguloDeLaBandeja(forma, centro, escala, cabeceoHaciaElOjo(centro), ancho, alto, CAMPO_DE_LA_CAMARA);
        centro.x += (ancho - MARGEN - q.x1) * porPunto;
        centro.y -= (esquina === 'abajo-derecha' ? alto - MARGEN - q.y1 : MARGEN - q.y0) * porPunto;
      }
      return rectanguloDeLaBandeja(forma, centro, escala, cabeceoHaciaElOjo(centro), ancho, alto, CAMPO_DE_LA_CAMARA);
    };
    const conLaDeAntes = conLaEscalaDelCentro(375, 812, 'arriba-derecha');
    const pedidoEnElMovil = anchoDeLaBandejaEnPuntos(375, 812);
    comprobar(
      `se ve fallar: con la escala medida en el centro del lienzo, en un móvil de 375 la composición mediría ${r(conLaDeAntes.x1 - conLaDeAntes.x0)} puntos y no ${String(pedidoEnElMovil)}`,
      conLaDeAntes.x1 - conLaDeAntes.x0 > pedidoEnElMovil + 3,
      conLaDeAntes,
    );

    /* ── La misma inclinación desde el ojo en todas partes, medida con un grupo de `three` como el de la escena ── */
    const gradosDeLaCaja = (CAJA.inclinacion * 180) / Math.PI;
    const inclinacionVista = (pose: { readonly x: number; readonly y: number; readonly z: number; readonly escala: number }, cabeceo: number): number => {
      const grupo = new THREE.Object3D();
      grupo.position.set(pose.x, pose.y, pose.z);
      grupo.rotation.set(cabeceo, 0, 0);
      grupo.scale.set(pose.escala, pose.escala, pose.escala);
      grupo.updateMatrixWorld(true);
      const normal = new THREE.Vector3(0, 1, 0).transformDirection(grupo.matrixWorld);
      const alOjo = new THREE.Vector3(-pose.x, -pose.y, -pose.z).normalize();
      return (Math.asin(normal.dot(alOjo)) * 180) / Math.PI;
    };
    const torcidas: string[] = [];
    const desacuerdos: string[] = [];
    for (const { v, esquina, pose } of poses) {
      const vista = inclinacionVista(pose, pose.cabeceo);
      if (Math.abs(vista - gradosDeLaCaja) > 0.01) torcidas.push(`${v.nombre} ${esquina}: ${r(vista)}°`);
      const grupo = new THREE.Object3D();
      grupo.position.set(pose.x, pose.y, pose.z);
      grupo.rotation.set(pose.cabeceo, 0, 0);
      grupo.scale.set(pose.escala, pose.escala, pose.escala);
      grupo.updateMatrixWorld(true);
      const camara = new THREE.PerspectiveCamera(CAMPO_DE_LA_CAMARA, v.ancho / v.alto, 0.5, 1000);
      camara.updateMatrixWorld(true);
      camara.updateProjectionMatrix();
      const c = cajaDeLaBandeja(pose.forma);
      for (const p of [[c.x0, c.y0, c.z0], [c.x1, c.y1, c.z1], [0, CAJA.alto, 0], [c.x1, c.y0, c.z0]] as const) {
        const puro = puntoDeLaBandejaEnLaCamara(p, pose, pose.escala, pose.cabeceo);
        const deThree = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(grupo.matrixWorld);
        const enElLienzo = puntoDeLaCamaraEnElLienzo(puro, v.ancho, v.alto, CAMPO_DE_LA_CAMARA);
        const ndc = deThree.clone().project(camara);
        const px = ((ndc.x + 1) / 2) * v.ancho;
        const py = ((1 - ndc.y) / 2) * v.alto;
        if (Math.hypot(puro[0] - deThree.x, puro[1] - deThree.y, puro[2] - deThree.z) > 1e-9 || enElLienzo === null || Math.hypot(enElLienzo.x - px, enElLienzo.y - py) > 1e-6) desacuerdos.push(`${v.nombre} ${esquina} ${p.join(',')}`);
      }
    }
    comprobar(
      `en las ${String(poses.length)} poses el suelo de la caja se mira a ${r(gradosDeLaCaja)}° del rayo del ojo —abajo en el escritorio y arriba en la app—, medido con un grupo de three como el de la escena`,
      torcidas.length === 0,
      torcidas,
    );
    comprobar('y la cuenta pura lleva cada punto de la caja a la cámara y al lienzo donde lo llevan ese grupo y una PerspectiveCamera de three', desacuerdos.length === 0, desacuerdos.slice(0, 4));
    const movilArriba = poseDeLaBandeja(390, Math.round(845 * 0.58), CAMPO_DE_LA_CAMARA, { esquina: 'arriba-derecha', margen: MARGEN });
    const sinCompensar = inclinacionVista(movilArriba, CAJA.inclinacion);
    comprobar(
      `se ve fallar: inclinada ${r(gradosDeLaCaja)}° hacia la cámara a secas, como la bandeja, arriba en la app la caja se miraría a ${r(sinCompensar)}° y las paredes taparían lo de dentro`,
      gradosDeLaCaja - sinCompensar > 10,
      sinCompensar,
    );

    /*
     * ── GRANDE ── Miguel vio la primera caja «muy muy pequeño»: medía el 30 % del ancho del lienzo, entre 330
     * y 500 puntos, y un dado quieto no pasaba de 39 puntos en ningún lienzo. En un monitor de escritorio
     * tiene que medir la mitad del ancho, y el dado, por lo menos 60 puntos; en un portátil, 48.
     */
    const dadoEn = (ancho: number, alto: number): number => poseDeLaBandeja(ancho, alto, CAMPO_DE_LA_CAMARA).aristaEnPuntos;
    const anchoEn = (ancho: number, alto: number): number => {
      const q = poseDeLaBandeja(ancho, alto, CAMPO_DE_LA_CAMARA).rectangulo;
      return q.x1 - q.x0;
    };
    comprobar(
      `la caja es grande: en un monitor de 1.920 × 1.080 mide ${r(anchoEn(1920, 1080))} puntos de ancho y el dado ${r(dadoEn(1920, 1080))}; en uno de 1.600 × 900, ${r(anchoEn(1600, 900))} y ${r(dadoEn(1600, 900))}; en un portátil de 1.280 × 720, ${r(anchoEn(1280, 720))} y ${r(dadoEn(1280, 720))}`,
      Math.abs(anchoEn(1920, 1080) - 960) < 1 && dadoEn(1920, 1080) >= 60 && Math.abs(anchoEn(1600, 900) - 800) < 1 && dadoEn(1600, 900) >= 60 && dadoEn(1280, 720) >= 48,
    );
    comprobar(
      'se ve fallar: con las medidas de la primera caja —el 30 % del ancho, hasta 500 puntos—, en un monitor de 1.920 el dado no llegaría a 42 puntos',
      (500 / anchoEn(1920, 1080)) * dadoEn(1920, 1080) < 42,
    );

    /* ── Un dado quieto se lee ── */
    const aristas = LIENZOS_DE_LA_CAJA.map((v) => ({ lienzo: v.nombre, arista: poseDeLaBandeja(v.ancho, v.alto, CAMPO_DE_LA_CAMARA).aristaEnPuntos }));
    comprobar(
      `un dado quieto se lee en los ${String(aristas.length)} lienzos: su arista no baja de ${String(DADO_MINIMO)} puntos ni su punto de ${String(PUNTO_MINIMO)} (${aristas.map((x) => `${x.lienzo} ${r(x.arista)}`).join(', ')})`,
      aristas.every((x) => x.arista >= DADO_MINIMO && x.arista * PUNTO_DEL_DADO >= PUNTO_MINIMO),
      aristas,
    );
    const movil = VENTANAS[2] as { readonly ancho: number; readonly alto: number };
    /*
     * LA VACUNA DE UNA ESCALA FIJA. La que le toca a un monitor, llevada al móvil, no le sirve: la caja
     * grande del monitor, con su misma escala, no cabe en el ancho del móvil. La escala se saca de cada
     * lienzo.
     */
    const monitor = poseDeLaBandeja(VENTANAS[0]?.ancho ?? 1920, VENTANAS[0]?.alto ?? 1080, CAMPO_DE_LA_CAMARA);
    const focalDelMonitor = (VENTANAS[0]?.alto ?? 1080) / 2 / Math.tan((CAMPO_DE_LA_CAMARA * Math.PI) / 360);
    const focalDelMovil = movil.alto / 2 / Math.tan((CAMPO_DE_LA_CAMARA * Math.PI) / 360);
    const anchoFijo = ((monitor.rectangulo.x1 - monitor.rectangulo.x0) * focalDelMovil) / focalDelMonitor;
    comprobar(`se ve fallar: con la escala de un monitor, en el móvil la caja mediría ${r(anchoFijo)} puntos de ancho y no cabría en sus ${String(movil.ancho)}`, anchoFijo > movil.ancho - 2 * MARGEN, anchoFijo);

    /*
     * ── LA POSE DE SALIDA NO SE ESCONDE DETRÁS DE LA CAJA ── Grande y abajo a la derecha, la caja dejaba
     * detrás la esquina de SALIDA y cuatro casillas en la pose de salida de siempre: donde empiezan todos
     * los peones, y un clic ahí se lo quedaba la caja. Con `poseDeSalidaAlLadoDeLaCaja`, en los lienzos
     * de escritorio ninguna casilla queda detrás, las cuatro esquinas del anillo siguen en el lienzo y el
     * ojo no se aleja más de un 5 %; y en un móvil en vertical, donde la caja va arriba sin tapar nada,
     * la pose es la de siempre.
     */
    /* Con los apaisados y bajos: el panel del banco, de 961 × 421, era donde la caja seguía tapando la salida. */
    const escritorios = [[961, 421], [1000, 480], [1200, 500], [900, 600], [1280, 720], [1440, 810], [1600, 900], [1920, 1080], [2560, 1400], [768, 1024]] as const;
    const malEncuadrados = escritorios
      .filter(([ancho, alto]) => {
        const ventana = { ancho, alto, franjaInferior: 0 };
        const caja = poseDeLaBandeja(ancho, alto, CAMPO_DE_LA_CAMARA, { esquina: 'abajo-derecha', margen: MARGEN }).rectangulo;
        const c = poseDeSalidaAlLadoDeLaCaja(ventana, caja);
        return !elAnilloSeVeJuntoALaCaja(c, ventana, caja, true) || c.factor > poseDeSalida(ventana).factor + 0.05 + 1e-9 || Math.hypot(c.centro.x, c.centro.z) > ALCANCE_DEL_BURGO * APARTE_MAXIMO_DE_LA_MIRADA + 1e-9;
      })
      .map(([ancho, alto]) => `${String(ancho)}×${String(alto)}`);
    comprobar(
      `en ${String(escritorios.length)} lienzos de escritorio —con el panel del banco y los apaisados bajos— la pose de salida no deja ninguna casilla detrás de la caja, con las cuatro esquinas del anillo en el lienzo, el ojo alejado un 5 % como mucho y la mirada dentro del tope del arrastre`,
      malEncuadrados.length === 0,
      malEncuadrados,
    );
    const ventanaDeMonitor = { ancho: 1600, alto: 900, franjaInferior: 0 };
    const cajaDeMonitor = poseDeLaBandeja(1600, 900, CAMPO_DE_LA_CAMARA, { esquina: 'abajo-derecha', margen: MARGEN }).rectangulo;
    comprobar('se ve fallar: con la pose de salida de siempre, en 1.600 × 900 la caja grande deja casillas detrás', !elAnilloSeVeJuntoALaCaja(poseDeSalida(ventanaDeMonitor), ventanaDeMonitor, cajaDeMonitor, false));
    const ventanaDelPanel = { ancho: 961, alto: 421, franjaInferior: 0 };
    const cajaDelPanel = poseDeLaBandeja(961, 421, CAMPO_DE_LA_CAMARA, { esquina: 'abajo-derecha', margen: MARGEN }).rectangulo;
    comprobar(
      'se ve fallar: con la mirada corrida sólo tres quintos de lado, como estuvo, en el panel del banco no hay pose que deje la salida libre',
      ((): boolean => {
        const base = poseDeSalida(ventanaDelPanel);
        const pose = poseDelBurgo(base, MIRADOR_DEL_BURGO, ventanaDelPanel);
        const frente = { x: pose.objetivo.x - pose.posicion.x, z: pose.objetivo.z - pose.posicion.z };
        const largo = Math.hypot(frente.x, frente.z) || 1;
        for (let lado = -30; lado <= 30; lado++) {
          for (let arriba = -15; arriba <= 15; arriba++) {
            const l = (lado / 50) * MEDIO_LADO;
            const s = (arriba / 50) * MEDIO_LADO;
            const centro = { x: base.centro.x + (-frente.z / largo) * l + (-frente.x / largo) * s, z: base.centro.z + (frente.x / largo) * l + (-frente.z / largo) * s };
            if (elAnilloSeVeJuntoALaCaja({ factor: base.factor, centro }, ventanaDelPanel, cajaDelPanel, true)) return false;
          }
        }
        return true;
      })(),
    );
    const movilesDePie = [[375, 812], [412, 915]] as const;
    comprobar(
      'en un móvil en vertical, con la caja arriba, la pose de salida es la de siempre',
      movilesDePie.every(([ancho, alto]) => {
        const ventana = { ancho, alto, franjaInferior: 0 };
        const caja = poseDeLaBandeja(ancho, alto, CAMPO_DE_LA_CAMARA, { esquina: 'arriba-derecha', margen: MARGEN }).rectangulo;
        return JSON.stringify(poseDeSalidaAlLadoDeLaCaja(ventana, caja)) === JSON.stringify(poseDeSalida(ventana));
      }),
    );

    /* ── El plano cercano, leído de los tres lienzos que montan la escena: no un 0,5 copiado aquí ── */
    const LIENZOS = ['../escritorio/src/burgo-en-tres.tsx', '../escritorio/src/banco-burgo.tsx', '../app/src/arcade/burgo-en-tres-escena.tsx'];
    const cercanos = LIENZOS.map((f) => {
      const texto = fs.readFileSync(path.join(RAIZ, f), 'utf8');
      const m = /<Canvas[\s\S]*?camera=\{\{[^}]*near:\s*([\d.]+)/.exec(texto);
      return m === null ? NaN : Number(m[1]);
    });
    let loMasCerca = Infinity;
    for (const { pose } of poses) {
      for (const c of volumenesDeLaBandeja(pose.forma)) {
        for (const x of [c.x0, c.x1]) for (const y of [c.y0, c.y1]) for (const z of [c.z0, c.z1]) loMasCerca = Math.min(loMasCerca, -puntoDeLaBandejaEnLaCamara([x, y, z], pose, pose.escala, pose.cabeceo)[2]);
      }
    }
    comprobar(
      `la composición está entera delante del plano cercano de los tres lienzos (${cercanos.join(', ')}): lo más cerca del ojo que llega es ${r(loMasCerca)}, más del doble`,
      cercanos.every((c) => Number.isFinite(c)) && loMasCerca > 2 * Math.max(...cercanos),
      { cercanos, loMasCerca },
    );

    /*
     * ── EL FIELTRO NUNCA SE CONFUNDE CON LA MADERA ── La primera bandeja llevaba el borde crema y el
     * fieltro del primer asiento, `#f2e8cf`, salió del mismo tostado: no decía de quién era el turno. Se
     * mide con los seis colores del reglamento y con el fieltro sin turno, contra el nogal de las paredes
     * y el de sus cantos, que son lo que rodea al fieltro.
     */
    const fieltros = [...COLORES_DEL_BURGO.map((c) => colorDelFieltro(c)), colorDelFieltro(null)];
    const cercaDe = (madera: string): string[] => fieltros.filter((f) => distanciaEntreColores(f, madera) < 100).map((f) => `${f} a ${r(distanciaEntreColores(f, madera))}`);
    comprobar(
      `ninguno de los ${String(fieltros.length)} fieltros posibles —los seis colores del reglamento y el de sin turno— queda a menos de 100 del nogal de la caja ni de sus cantos`,
      COLORES_DEL_BURGO.length === 6 && fieltros.every((f) => /^#[0-9a-f]{6}$/.test(f)) && cercaDe(CAJA.color.madera).length === 0 && cercaDe(CAJA.color.canto).length === 0 && colorDelFieltro('#F2E8CF') === '#f2e8cf',
      [...cercaDe(CAJA.color.madera), ...cercaDe(CAJA.color.canto)],
    );
    comprobar('se ve fallar: con el borde crema de la primera bandeja, el fieltro del primer asiento queda a menos de 100', cercaDe('#efe6cc').some((x) => x.startsWith('#f2e8cf')), cercaDe('#efe6cc'));

    /* ── El dinero ── */
    const sumaDe = (cuantos: readonly number[]): number => cuantos.reduce((n, c, i) => n + c * (BILLETES[i]?.valor ?? 0), 0);
    const inexactas: number[] = [];
    const pasadas: number[] = [];
    for (let cantidad = 0; cantidad <= 40_000; cantidad += cantidad < 5_000 ? 1 : 37) {
      const cuantos = billetesDeLaCantidad(cantidad);
      if (cantidad < 3_500 && sumaDe(cuantos) !== cantidad) inexactas.push(cantidad);
      if (cuantos.length !== BILLETES.length || cuantos.some((c, i) => c < 0 || c > (BILLETES[i]?.tope ?? 0)) || sumaDe(cuantos) > cantidad) pasadas.push(cantidad);
    }
    comprobar(
      `los billetes que se pintan suman EXACTAMENTE el dinero hasta 3.499 —con 1.494, ${billetesDeLaCantidad(1494).join(', ')}—, y con cualquier cantidad hasta 40.000 ninguno pasa de su tope ni suman más de lo que hay`,
      inexactas.length === 0 && pasadas.length === 0 && billetesDeLaCantidad(1494).join() === '2,4,1,2,0,0,4' && BILLETES_A_LA_VISTA === BILLETES.reduce((n, b) => n + b.tope, 0),
      { inexactas: inexactas.slice(0, 5), pasadas: pasadas.slice(0, 5) },
    );
    comprobar(
      `la placa escribe la cantidad con los miles con punto —«${textoDelDinero(1494)}», «${textoDelDinero(0)}», «${textoDelDinero(1_234_567)}»— y la más larga de una partida, «${textoDelDinero(99_999)}», son las ${String(LETRAS_DE_LA_PLACA)} letras que cuenta el presupuesto`,
      textoDelDinero(1494) === '1.494 €' && textoDelDinero(0) === '0 €' && textoDelDinero(-5) === '0 €' && textoDelDinero(1_234_567) === '1.234.567 €' && [...textoDelDinero(99_999)].filter((c) => c !== ' ').length === LETRAS_DE_LA_PLACA,
    );
    const huellaDelBillete = (forma: FormaDeLaBandeja, valor: number, k: number): { x0: number; x1: number; z0: number; z1: number; cima: number } => {
      const s = sitioDelBillete(forma, valor, k);
      const medioX = (BILLETE.ancho / 2) * Math.abs(Math.cos(s.giro)) + (BILLETE.largo / 2) * Math.abs(Math.sin(s.giro));
      const medioZ = (BILLETE.ancho / 2) * Math.abs(Math.sin(s.giro)) + (BILLETE.largo / 2) * Math.abs(Math.cos(s.giro));
      return { x0: s.x - medioX, x1: s.x + medioX, z0: s.z - medioZ, z1: s.z + medioZ, cima: s.y + BILLETE.grueso / 2 };
    };
    const billetesMal: string[] = [];
    for (const forma of FORMAS) {
      const compartimento = planoDeLaBandeja(forma).billetes;
      const huellas = BILLETES.map((b) => Array.from({ length: b.tope }, (_, k) => huellaDelBillete(forma, b.valor, k)));
      huellas.forEach((monton, i) => {
        for (const h of monton) if (!cabeCon(compartimento, h.x0, h.x1, h.z0, h.z1, 1) || h.cima > CAJA.altoDelTabique) billetesMal.push(`${forma}: el de ${String(BILLETES[i]?.valor)} se sale`);
        for (let j = i + 1; j < huellas.length; j++) if (monton.some((a) => (huellas[j] ?? []).some((b) => seSolapan(a, b)))) billetesMal.push(`${forma}: el montón de ${String(BILLETES[i]?.valor)} pisa el de ${String(BILLETES[j]?.valor)}`);
      });
    }
    comprobar('en las dos formas, todos los billetes a la vista caben en su compartimento con 1 de aire y por debajo de los tabiques, y ningún montón pisa a otro', billetesMal.length === 0, billetesMal);

    /* ── Los mazos, las casas y los hoteles ── */
    const plano = planoDeLaBandeja('completa');
    const mazos = sitiosDeLosMazos('completa');
    const huellaDelMazo = (m: { readonly x: number; readonly z: number }): { x0: number; x1: number; z0: number; z1: number } => ({ x0: m.x - MAZO.ancho / 2, x1: m.x + MAZO.ancho / 2, z0: m.z - MAZO.fondo / 2, z1: m.z + MAZO.fondo / 2 });
    comprobar(
      `la completa lleva los dos mazos en su compartimento sin tocarse, con ${String(MAZO.cartas)} cartas bajo la pared (${r(altoDelMazo(MAZO.cartas))} de ${String(CAJA.alto)}), el emblema dentro de la carta, y un mazo vacío deja la marca de una`,
      plano.mazos !== null &&
        mazos.length === 2 &&
        mazos.every((m) => plano.mazos !== null && cabeCon(plano.mazos, huellaDelMazo(m).x0, huellaDelMazo(m).x1, huellaDelMazo(m).z0, huellaDelMazo(m).z1, 1)) &&
        !seSolapan(huellaDelMazo(mazos[0] as Punto), huellaDelMazo(mazos[1] as Punto)) &&
        altoDelMazo(MAZO.cartas) + MAZO.alzaDelEmblema < CAJA.alto &&
        altoDelMazo(0) === MAZO.gruesoDeUnaCarta &&
        altoDelMazo(99) === altoDelMazo(MAZO.cartas) &&
        MAZO.ladoDelEmblema <= Math.min(MAZO.ancho, MAZO.fondo) &&
        sitiosDeLosMazos('compacta').length === 0,
      { mazos, compartimento: plano.mazos },
    );
    const huellaDe = (s: Punto, pieza: typeof CASITA | typeof HOTELITO): { x0: number; x1: number; z0: number; z1: number } => ({ x0: s.x - pieza.ancho / 2, x1: s.x + pieza.ancho / 2, z0: s.z - pieza.fondo / 2, z1: s.z + pieza.fondo / 2 });
    const obras = [...sitiosDeLasCasas('completa').map((s) => huellaDe(s, CASITA)), ...sitiosDeLosHoteles('completa').map((s) => huellaDe(s, HOTELITO))];
    const obrasMal: string[] = [];
    obras.forEach((h, i) => {
      if (plano.obras === null || !cabeCon(plano.obras, h.x0, h.x1, h.z0, h.z1, 0.5)) obrasMal.push(`la ${String(i)} se sale`);
      for (let j = i + 1; j < obras.length; j++) if (seSolapan(h, obras[j] as typeof h)) obrasMal.push(`la ${String(i)} pisa la ${String(j)}`);
    });
    comprobar(
      `la completa guarda las ${String(CASAS_DEL_REGLAMENTO)} casas y los ${String(POSADAS_DEL_REGLAMENTO)} hoteles del reglamento en su compartimento, con medio de aire, sin pisarse y por debajo de la pared`,
      CASAS_DE_LA_CAJA === CASAS_DEL_REGLAMENTO && HOTELES_DE_LA_CAJA === POSADAS_DEL_REGLAMENTO && sitiosDeLasCasas('completa').length === CASAS_DEL_REGLAMENTO && sitiosDeLosHoteles('completa').length === POSADAS_DEL_REGLAMENTO && obrasMal.length === 0 && CASITA.alto + CASITA.tejado < CAJA.alto && HOTELITO.alto + HOTELITO.tejado < CAJA.alto && sitiosDeLasCasas('compacta').length === 0,
      obrasMal.slice(0, 6),
    );
    /* Una cara al revés no falla nada y se ve: el tejado de una casita se tiraría. Cada cara mira afuera de su pieza, que es convexa. */
    const carasHaciaFuera = (caras: readonly CaraDeLaBandeja[]): boolean => {
      const puntos = caras.flatMap((c) => c.puntos);
      const centro = puntos.reduce((s, p) => [s[0] + p[0] / puntos.length, s[1] + p[1] / puntos.length, s[2] + p[2] / puntos.length] as [number, number, number], [0, 0, 0] as [number, number, number]);
      return caras.every((c) => {
        const [a, b, d] = c.puntos;
        const n = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).cross(new THREE.Vector3(d[0] - a[0], d[1] - a[1], d[2] - a[2]));
        const medio = c.puntos.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4] as [number, number, number], [0, 0, 0] as [number, number, number]);
        return n.dot(new THREE.Vector3(medio[0] - centro[0], medio[1] - centro[1], medio[2] - centro[2])) > 0;
      });
    };
    const prismaDePrueba = prisma(-1, 3, -2, 5, -4, 1, '#000000');
    const tumbadas = carasDeLaCaja('completa').filter((c) => c.puntos.every((p) => p[1] === c.puntos[0][1]));
    const miraArriba = (c: CaraDeLaBandeja): boolean => {
      const [a, b, d] = c.puntos;
      return new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).cross(new THREE.Vector3(d[0] - a[0], d[1] - a[1], d[2] - a[2])).y > 0;
    };
    comprobar(
      `las caras de una casita y de un hotelito (${String(triangulosDeLasCaras(carasDeUnEdificio(CASITA)))} triángulos cada uno) y las de cada prisma de la caja miran hacia fuera, y las ${String(tumbadas.length)} tumbadas —los fondos y los cantos de arriba—, hacia arriba`,
      carasHaciaFuera(carasDeUnEdificio(CASITA)) && carasHaciaFuera(carasDeUnEdificio(HOTELITO)) && carasHaciaFuera(prismaDePrueba) && tumbadas.length >= 4 && tumbadas.every(miraArriba),
    );
    const volteada = carasDeUnEdificio(CASITA).map((c, i) => (i === 5 ? { ...c, puntos: [c.puntos[0], c.puntos[3], c.puntos[2], c.puntos[1]] as typeof c.puntos } : c));
    comprobar('se ve fallar: con un agua del tejado de la casita enhebrada al revés, cae', !carasHaciaFuera(volteada));

    /*
     * ── NADA DE DENTRO SE ESCONDE DETRÁS DE UNA PARED, VISTO DESDE EL OJO ── Por esto los billetes van en
     * la mitad de atrás de su compartimento: vista a su inclinación, una pared de 10 tapa el suelo de
     * detrás de ella. Se tira un rayo del ojo —llevado a unidades de bandeja con la pose de verdad— a lo
     * que tiene que verse, y no puede cruzar ninguna pared ni tabique: la base de cada montón de
     * billetes, la cima de cada dado quieto, el emblema de cada mazo, lleno y con una carta, el caballete
     * de cada casa y de cada hotel, y el renglón de la placa, que va en la cara de delante.
     */
    const ojoEnLaBandeja = (pose: { readonly x: number; readonly y: number; readonly z: number; readonly escala: number; readonly cabeceo: number }): THREE.Vector3 => {
      const grupo = new THREE.Object3D();
      grupo.position.set(pose.x, pose.y, pose.z);
      grupo.rotation.set(pose.cabeceo, 0, 0);
      grupo.scale.set(pose.escala, pose.escala, pose.escala);
      grupo.updateMatrixWorld(true);
      return new THREE.Vector3(0, 0, 0).applyMatrix4(grupo.matrixWorld.clone().invert());
    };
    const paredesDe = (forma: FormaDeLaBandeja): THREE.Box3[] => {
      const p = planoDeLaBandeja(forma);
      const { pared, tabique, alto, altoDelTabique, bajo } = CAJA;
      const k = p.caja;
      const medio = (k.x0 + k.x1) / 2;
      const cajas = [
        new THREE.Box3(new THREE.Vector3(k.x0, -bajo, k.z0), new THREE.Vector3(k.x1, alto, k.z0 + pared)),
        new THREE.Box3(new THREE.Vector3(k.x0, -bajo, k.z1 - pared), new THREE.Vector3(k.x1, alto, k.z1)),
        new THREE.Box3(new THREE.Vector3(k.x0, -bajo, k.z0), new THREE.Vector3(k.x0 + pared, alto, k.z1)),
        new THREE.Box3(new THREE.Vector3(k.x1 - pared, -bajo, k.z0), new THREE.Vector3(k.x1, alto, k.z1)),
        new THREE.Box3(new THREE.Vector3(medio - tabique / 2, 0, k.z0), new THREE.Vector3(medio + tabique / 2, altoDelTabique, k.z1)),
      ];
      if (p.mazos !== null) cajas.push(new THREE.Box3(new THREE.Vector3(k.x0, 0, p.mazos.z1), new THREE.Vector3(k.x1, altoDelTabique, p.mazos.z1 + tabique)));
      cajas.push(new THREE.Box3(new THREE.Vector3(p.cajon.x0, -bajo, p.cajon.z0), new THREE.Vector3(p.cajon.x1, alto, p.cajon.z1)));
      return cajas;
    };
    const loQueTieneQueVerse = (forma: FormaDeLaBandeja, filasDeBilletes: (valor: number, k: number) => { x: number; y: number; z: number }): { que: string; punto: THREE.Vector3 }[] => {
      const salida: { que: string; punto: THREE.Vector3 }[] = [];
      for (const b of BILLETES) {
        const s = filasDeBilletes(b.valor, 0);
        salida.push({ que: `el montón de ${String(b.valor)}`, punto: new THREE.Vector3(s.x, BILLETE.grueso, s.z) });
      }
      for (const h of huecosDeLosDados(forma)) salida.push({ que: 'la cima de un dado', punto: new THREE.Vector3(h.x, ARISTA_DE_LOS_DADOS, h.z) });
      for (const m of sitiosDeLosMazos(forma)) for (const cartas of [MAZO.cartas, 1]) salida.push({ que: `el emblema de ${m.mazo} con ${String(cartas)}`, punto: new THREE.Vector3(m.x, altoDelMazo(cartas) + MAZO.alzaDelEmblema, m.z) });
      for (const s of sitiosDeLasCasas(forma)) salida.push({ que: 'una casa', punto: new THREE.Vector3(s.x, CASITA.alto + CASITA.tejado, s.z) });
      for (const s of sitiosDeLosHoteles(forma)) salida.push({ que: 'un hotel', punto: new THREE.Vector3(s.x, HOTELITO.alto + HOTELITO.tejado, s.z) });
      const placa = sitioDeLaPlaca(forma);
      salida.push({ que: 'la placa', punto: new THREE.Vector3(placa.x, placa.y, placa.z + PLACA.grueso + ALZA_DEL_RENGLON_DE_LA_PLACA) });
      return salida;
    };
    const tapados = (filasDeBilletes: (forma: FormaDeLaBandeja) => (valor: number, k: number) => { x: number; y: number; z: number }): string[] => {
      const salida = new Set<string>();
      for (const { v, esquina, pose } of poses) {
        const ojo = ojoEnLaBandeja(pose);
        const paredes = paredesDe(pose.forma);
        for (const { que, punto } of loQueTieneQueVerse(pose.forma, filasDeBilletes(pose.forma))) {
          const hacia = punto.clone().sub(ojo);
          const largo = hacia.length();
          const rayo = new THREE.Ray(ojo, hacia.normalize());
          const choca = paredes.some((caja) => {
            const donde = rayo.intersectBox(caja, new THREE.Vector3());
            return donde !== null && donde.distanceTo(ojo) < largo - 0.05 && !caja.containsPoint(punto);
          });
          if (choca) salida.add(`${que} (${v.nombre} ${esquina})`);
        }
      }
      return [...salida];
    };
    const tapadosHoy = tapados((forma) => (valor, k) => sitioDelBillete(forma, valor, k));
    comprobar(
      'desde el ojo, en todas las poses, ninguna pared ni tabique tapa los montones de billetes, la cima de los dados, los emblemas de los mazos, las casas, los hoteles ni la placa',
      tapadosHoy.length === 0 && poses.every(({ pose }) => ojoEnLaBandeja(pose).z > planoDeLaBandeja(pose.forma).caja.z1),
      tapadosHoy.slice(0, 6),
    );
    const tapadosDelante = tapados((forma) => (valor, k) => {
      const s = sitioDelBillete(forma, valor, k);
      const r0 = planoDeLaBandeja(forma).billetes;
      return { ...s, z: r0.z1 - 2 - BILLETE.largo / 2 };
    });
    comprobar('se ve fallar: con los billetes pegados a la pared de delante de su compartimento, la pared los tapa', tapadosDelante.some((t) => t.startsWith('el montón')), tapadosDelante.slice(0, 3));

    /* ── El reloj de arena ── */
    /*
     * `tsx` carga los `.tsx` con el runtime clásico de JSX, y `escenas/reloj.tsx` no importa React —en
     * Vite y en Metro no le hace falta—: para llamarlo desde aquí se le presta, en vez de tocar el
     * componente de Riberas.
     */
    const react = await import('react');
    (globalThis as { React?: unknown }).React ??= (react as { default?: unknown }).default ?? react;
    const { ALTO_DEL_BULBO: ALTO_DEL_BULBO_DEL_RELOJ, GRUESO_DEL_MARCO: GRUESO_DEL_MARCO_DEL_RELOJ, RADIO_DEL_BULBO: RADIO_DEL_BULBO_DEL_RELOJ, RelojDeArena } = await import('../reloj');
    const { cuantosTriangulos: cuantosTriangulosDeUnaGeometria } = await import('../formas');
    const reloj = planoDeLaBandeja('completa').reloj;
    const relojCompacto = planoDeLaBandeja('compacta').reloj;
    comprobar(
      `las proporciones del reloj que usa la caja son las de escenas/reloj.tsx, y cabe en el cilindro que se le reserva (${String(ENVOLVENTE_DEL_RELOJ.alto)} lado de alto y ${String(ENVOLVENTE_DEL_RELOJ.radio)} de radio), de pie fuera de la caja`,
      PROPORCIONES_DEL_RELOJ.altoDelBulbo === ALTO_DEL_BULBO_DEL_RELOJ &&
        PROPORCIONES_DEL_RELOJ.radioDelBulbo === RADIO_DEL_BULBO_DEL_RELOJ &&
        PROPORCIONES_DEL_RELOJ.gruesoDelMarco === GRUESO_DEL_MARCO_DEL_RELOJ &&
        RADIO_DEL_BULBO_DEL_RELOJ * 1.15 <= ENVOLVENTE_DEL_RELOJ.radio &&
        2 * (ALTO_DEL_BULBO_DEL_RELOJ + GRUESO_DEL_MARCO_DEL_RELOJ) <= ENVOLVENTE_DEL_RELOJ.alto &&
        Math.abs(reloj.cinturaDeLosConos - (ALTO_DEL_BULBO_DEL_RELOJ + GRUESO_DEL_MARCO_DEL_RELOJ) * reloj.lado - reloj.suelo) < 1e-9 &&
        Math.abs(reloj.centroDelModelo - (ENVOLVENTE_DEL_RELOJ.alto * reloj.lado) / 2 - reloj.suelo) < 1e-9 &&
        [reloj, relojCompacto].every((x, i) => x.x - ENVOLVENTE_DEL_RELOJ.radio * x.lado > planoDeLaBandeja(FORMAS[i] as FormaDeLaBandeja).caja.x1 + 4),
      { reloj, relojCompacto },
    );
    /*
     * EL RELOJ APOYA EN SU CAJÓN. Miguel lo vio «flotando»: estaba de pie en la cota del canto de abajo de
     * la caja, sobre nada. Su base es la tapa del cajón, su huella cabe en ella con aire, el cajón mide lo
     * que las paredes y su frente va a haces con el de la caja, fuera de ella.
     */
    const apoyaEnSuCajon = (plano: { readonly caja: { readonly x1: number; readonly z1: number }; readonly cajon: { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number }; readonly reloj: { readonly x: number; readonly z: number; readonly lado: number; readonly suelo: number } }): boolean => {
      const radio = ENVOLVENTE_DEL_RELOJ.radio * plano.reloj.lado;
      const k = plano.cajon;
      return (
        plano.reloj.suelo === CAJA.alto &&
        plano.reloj.x - radio >= k.x0 + 2 &&
        plano.reloj.x + radio <= k.x1 - 2 &&
        plano.reloj.z - radio >= k.z0 + 2 &&
        plano.reloj.z + radio <= k.z1 - 2 &&
        k.x0 >= plano.caja.x1 + 2 &&
        k.z1 === plano.caja.z1 &&
        k.x1 - k.x0 === CAJON_DEL_RELOJ.ancho
      );
    };
    comprobar(
      `en las dos formas el reloj apoya en la tapa de su cajón, a ${String(CAJA.alto)} de alto como las paredes, con su huella dentro y aire, y el cajón va fuera de la caja con el frente a haces con el suyo`,
      FORMAS.every((forma) => apoyaEnSuCajon(planoDeLaBandeja(forma))),
      FORMAS.map((forma) => ({ forma, cajon: planoDeLaBandeja(forma).cajon, reloj: planoDeLaBandeja(forma).reloj })),
    );
    const planoCompleto = planoDeLaBandeja('completa');
    comprobar(
      'se ve fallar: con el reloj de pie en el canto de abajo de la caja, como estuvo, o corrido fuera de la tapa, no apoya',
      !apoyaEnSuCajon({ ...planoCompleto, reloj: { ...planoCompleto.reloj, suelo: -CAJA.bajo } }) && !apoyaEnSuCajon({ ...planoCompleto, reloj: { ...planoCompleto.reloj, x: planoCompleto.reloj.x + 12 } }),
    );
    const triangulosDelArbol = (nodo: unknown): number => {
      if (nodo === null || nodo === undefined || typeof nodo === 'boolean' || typeof nodo === 'string' || typeof nodo === 'number') return 0;
      if (Array.isArray(nodo)) return nodo.reduce((n: number, hijo: unknown) => n + triangulosDelArbol(hijo), 0);
      const e = nodo as { readonly type?: unknown; readonly props?: { readonly children?: unknown; readonly args?: readonly number[] } };
      const args = [...(e.props?.args ?? [])] as number[];
      const geometria =
        e.type === 'cylinderGeometry'
          ? new THREE.CylinderGeometry(...(args as [number, number, number, number]))
          : e.type === 'coneGeometry'
            ? new THREE.ConeGeometry(...(args as [number, number, number, number, boolean]))
            : e.type === 'planeGeometry'
              ? new THREE.PlaneGeometry(...(args as [number, number]))
              : null;
      if (geometria !== null) {
        const n = cuantosTriangulosDeUnaGeometria(geometria);
        geometria.dispose();
        return n;
      }
      return triangulosDelArbol(e.props?.children);
    };
    /*
     * ═══ SIN MODELO NO SE PINTA UN SEGUNDO RELOJ: SE PINTA EL ASA Y NADA MÁS ═══
     *
     * Aquí se contaban los 330 triángulos de un reloj de RESPALDO —cilindros y conos— que vivía
     * dentro de `RelojDeArena` y salía en cuanto alguien pasaba `modelo={null}`. Era anterior a
     * `reloj.glb`, y por esa puerta Las Lindes enseñó durante semanas un reloj que ya no era el
     * de la casa, sin que fallara nada y sin que ningún comprobador lo mirara.
     *
     * El respaldo está borrado. Esta comprobación es ahora su contraria: llamando al componente
     * sin modelo tiene que salir SÓLO el asa —dos triángulos de un plano—, que es lo que deja el
     * botón de pasar el turno puesto mientras el `.glb` viaja.
     */
    const nadaDeReferencia = { current: null };
    const arbolDelReloj = RelojDeArena({ cuerpo: nadaDeReferencia, asa: nadaDeReferencia, lado: reloj.lado, ancho: reloj.lado * ASA_DEL_RELOJ_DE_ARENA.ancho, encendido: false, modelo: null, onPulsar: () => undefined });
    const sinModelo = triangulosDelArbol(arbolDelReloj);
    comprobar(
      `sin modelo, RelojDeArena pinta el asa y nada más: ${String(TRIANGULOS_DEL_RELOJ_SIN_MODELO)} triángulos, los que cuenta el presupuesto de la calidad sobria`,
      sinModelo === TRIANGULOS_DEL_RELOJ_SIN_MODELO,
      sinModelo,
    );

    /*
     * ═══ Y LA PUERTA, CERRADA POR EL FUENTE ═══
     *
     * Lo de arriba cuenta triángulos, y un reloj de respaldo nuevo podría tener otros. Esto mira
     * el fichero: en `escenas/reloj.tsx` no puede haber geometría de conos ni cilindros, porque
     * el único reloj de esta casa es un `.glb`. Es la comprobación que faltaba la primera vez.
     */
    {
      const fuenteDelReloj = fs.readFileSync(path.join(RAIZ, 'reloj.tsx'), 'utf8');
      const soloCodigo = fuenteDelReloj.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      for (const prohibida of ['coneGeometry', 'cylinderGeometry', 'sphereGeometry']) {
        comprobar(
          `\`escenas/reloj.tsx\` no vuelve a levantar un reloj a mano: sin \`${prohibida}\``,
          !soloCodigo.includes(prohibida),
        );
      }
      /* Vacuna: que se está leyendo el fichero de verdad y no una cadena vacía. */
      comprobar(
        'y se ha leído el fuente del reloj para juzgarlo',
        soloCodigo.includes('RelojDeArena') && soloCodigo.includes('planeGeometry'),
        { letras: soloCodigo.length },
      );
    }
    /* El de Riberas, abierto con `@gltf-transform`: sus triángulos nodo a nodo —los cincuenta granos comparten una malla— y su silueta. */
    const RELOJ_GLB = path.join(RAIZ, 'modelos', 'reloj.glb');
    const delGlb = await (async (): Promise<{ triangulos: number; radioPorAlto: number } | null> => {
      if (!fs.existsSync(RELOJ_GLB)) return null;
      const d = await io.read(RELOJ_GLB);
      const escena = d.getRoot().getDefaultScene() ?? d.getRoot().listScenes()[0];
      if (escena === undefined) return null;
      let triangulos = 0;
      escena.traverse((n) => {
        const malla = n.getMesh();
        if (malla === null) return;
        for (const prim of malla.listPrimitives()) {
          const pos = prim.getAttribute('POSITION');
          if (pos !== null) triangulos += (prim.getIndices()?.getCount() ?? pos.getCount()) / 3;
        }
      });
      const limites = getBounds(escena);
      const alto = limites.max[1] - limites.min[1];
      const radio = Math.max(limites.max[0] - limites.min[0], limites.max[2] - limites.min[2]) / 2;
      return { triangulos: Math.round(triangulos), radioPorAlto: radio / alto };
    })();
    comprobar(
      `el reloj de Riberas (reloj.glb) son los ${String(TRIANGULOS_DEL_RELOJ_DE_RIBERAS)} triángulos del presupuesto con su asa, y su silueta cabe en el cilindro sin encogerlo: ${delGlb === null ? '—' : r(delGlb.radioPorAlto)} de radio por lado`,
      delGlb !== null && delGlb.triangulos + 2 === TRIANGULOS_DEL_RELOJ_DE_RIBERAS && delGlb.radioPorAlto <= ENVOLVENTE_DEL_RELOJ.radio,
      delGlb,
    );

    /* ── Las dos asas ── */
    const asasMal: string[] = [];
    for (const forma of FORMAS) {
      const r0 = planoDeLaBandeja(forma).reloj;
      const asa = cajaDelAsaDelReloj(forma);
      const media = (ASA_DEL_RELOJ_DE_ARENA.ancho * r0.lado) / 2;
      for (const centro of [r0.cinturaDeLosConos, r0.centroDelModelo]) {
        const cubre = asa.x - asa.ancho / 2 <= r0.x - media + 1e-9 && asa.x + asa.ancho / 2 >= r0.x + media - 1e-9 && asa.y - asa.alto / 2 <= centro - r0.lado / 2 + 1e-9 && asa.y + asa.alto / 2 >= centro + r0.lado / 2 - 1e-9 && Math.abs(asa.z - r0.z) < 1e-9;
        if (!cubre) asasMal.push(`${forma}: el asa del reloj no envuelve la de RelojDeArena puesta a ${r(centro)}`);
      }
      const dados = cajaDelAsaDeLosDados(forma);
      const f = planoDeLaBandeja(forma).dados;
      if (Math.abs(dados.x - (f.x0 + f.x1) / 2) > 1e-9 || Math.abs(dados.ancho - (f.x1 - f.x0)) > 1e-9 || Math.abs(dados.fondo - (f.z1 - f.z0)) > 1e-9 || dados.y - dados.alto / 2 !== 0 || dados.alto < medioDado + alzaMaximaDeLosDados() + MEDIA_DIAGONAL_DEL_DADO - 1e-9) asasMal.push(`${forma}: el asa de los dados no cubre su compartimento hasta lo alto de un salto`);
      const deLosDados = { x0: dados.x - dados.ancho / 2, x1: dados.x + dados.ancho / 2, z0: dados.z - dados.fondo / 2, z1: dados.z + dados.fondo / 2 };
      const delReloj = { x0: asa.x - asa.ancho / 2, x1: asa.x + asa.ancho / 2, z0: asa.z - asa.fondo / 2, z1: asa.z + asa.fondo / 2 };
      if (seSolapan(deLosDados, delReloj)) asasMal.push(`${forma}: las dos asas se pisan`);
    }
    comprobar('en las dos formas, el asa del reloj envuelve el asa de RelojDeArena con cualquiera de los dos relojes, el asa de los dados cubre su compartimento hasta lo alto de un salto, y las dos no se pisan', asasMal.length === 0, asasMal);
  }

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
   * Y NINGUNA MANCHA ENCIMA DEL CLARO DEL CONCEJO. La corona del manto es estrecha comparada con el
   * tablero, y con las manchas sembradas al azar una arboleda caía sobre el paño de dados que hubo
   * ahí y los tapaba; hoy escondería las monedas que vuelan al Concejo. El claro está fuera del anillo
   * y dentro del manto, y el Concejo, dentro del claro.
   */
  const enElClaro = (p: Punto): boolean => Math.abs(p.x - CLARO_DEL_CONCEJO.x) < CLARO_DEL_CONCEJO.lado / 2 && Math.abs(p.z - CLARO_DEL_CONCEJO.z) < CLARO_DEL_CONCEJO.lado / 2;
  const sobreElClaro = [7, 8, 99, 1234].flatMap((s) => campo(s).decorado.filter((d) => enElClaro({ x: d.x, z: d.z })));
  comprobar(
    'y con cuatro semillas distintas ninguna mancha del campo cae sobre el claro del Concejo, que está fuera del anillo y sobre el manto, con el Concejo dentro',
    sobreElClaro.length === 0 && CLARO_DEL_CONCEJO.z - CLARO_DEL_CONCEJO.lado / 2 > MEDIO_LADO && CLARO_DEL_CONCEJO.z + CLARO_DEL_CONCEJO.lado / 2 < CORONA.hasta && enElClaro(EL_CONCEJO),
    sobreElClaro.slice(0, 4).map((d) => `${d.pieza} (${r(d.x)}, ${r(d.z)})`),
  );
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
  comprobar('y la avenida (48) es más estrecha que la casilla (72): llega entera a su estación, con 12 de sobra a cada lado', (ANCHO_DE_CASILLA - ANCHO_DE_LA_AVENIDA) / 2 === 12);
  /*
   * Y en la casilla de la Puerta la espera su ESTACIÓN. Hasta el tablero de mesa la cruzaba un paso de
   * cebra con dos semáforos en medio del blanco; ése es ahora el sitio del edificio de viajeros, así
   * que las cuatro van sin atrezo y con su obra.
   */
  const conObraDeEstacion = new Set(casillasConObra());
  comprobar(
    'las cuatro estaciones llevan su obra y ningún atrezo: ni la cebra ni los semáforos que había en el sitio del edificio de viajeros',
    PUERTAS.every((c) => conObraDeEstacion.has(c) && (ATREZO_DE_LA_CASILLA[c] ?? []).length === 0),
    PUERTAS.map((c) => `${String(c)}: ${String((ATREZO_DE_LA_CASILLA[c] ?? []).length)} piezas`),
  );
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
   * LA CABECERA DE `presupuesto.ts` DICE LO QUE ESTA SUMA DA.
   *
   * La cabecera apunta las cifras del tablero «que `verify:burgo-escena` imprime hoy», y dos veces se
   * quedaron viejas sin que nada lo notara: estuvo diciendo 181.333 cuando la suma daba 199.078, y
   * a la media hora de corregirla la dejaron vieja los nombres de las estaciones. Una cifra que un
   * documento da por actual o se compara o miente; así que se compara, con el manto de teselas.
   */
  const cifrasDeLaCabecera = (fuente: string): { readonly plena: number; readonly sobria: number; readonly teselas: number } | null => {
    const numero = (texto: string | undefined): number => Number((texto ?? '').replace(/\./g, ''));
    const plenaEscrita = /TABLERO en plena \.+ ([\d.]+)\s+de los cuales el manto de teselas son ([\d.]+)/.exec(fuente);
    const sobriaEscrita = /TABLERO en sobria \.+ ([\d.]+)/.exec(fuente);
    if (plenaEscrita === null || sobriaEscrita === null) return null;
    return { plena: numero(plenaEscrita[1]), sobria: numero(sobriaEscrita[1]), teselas: numero(plenaEscrita[2]) };
  };
  const fuenteDelPresupuesto = fs.readFileSync(path.join(CARPETA, 'presupuesto.ts'), 'utf8');
  const escritas = cifrasDeLaCabecera(fuenteDelPresupuesto);
  const teselasSumadas = plena.renglones.filter((x) => x.que === PIEZA.tesela).reduce((n, x) => n + x.triangulos, 0);
  comprobar(
    `la cabecera de presupuesto.ts dice lo que suma el tablero: ${plena.total.toLocaleString('es-ES')} en plena, ${sobria.total.toLocaleString('es-ES')} en sobria y ${teselasSumadas.toLocaleString('es-ES')} de teselas`,
    escritas !== null && escritas.plena === plena.total && escritas.sobria === sobria.total && escritas.teselas === teselasSumadas && teselasSumadas > 0,
    { escritas, sumadas: { plena: plena.total, sobria: sobria.total, teselas: teselasSumadas } },
  );
  comprobar(
    'se ve fallar: con las cifras que tuvo hasta hoy (181.333 y 136.547) la cabecera no casaría',
    ((): boolean => {
      const vieja = cifrasDeLaCabecera(fuenteDelPresupuesto.replace(/TABLERO en plena \.+ [\d.]+/, 'TABLERO en plena ... 181.333').replace(/TABLERO en sobria \.+ [\d.]+/, 'TABLERO en sobria .. 136.547'));
      return vieja !== null && (vieja.plena !== plena.total || vieja.sobria !== sobria.total);
    })(),
  );
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
   * Y EL MANTO ES LA PARTIDA MÁS GORDA DEL TABLERO: 1.796 teselas de 36 = 64.656 triángulos.
   * Se anota aquí, con su número, porque es lo primero que hay que mirar si el tope vuelve a
   * quedarse corto — y porque es lo único del tablero que el móvil paga entero, ya que el
   * paisaje no se quita.
   *
   * ═══ EL TOPE ES ABSOLUTO, Y ANTES ERA UNA PROPORCIÓN. POR QUÉ SE CAMBIA ═══
   *
   * Decía «menos de un TERCIO del tablero en plena». Esa forma tiene un defecto que se vio el
   * día que se quitaron los edificios de los solares: el tablero adelgazó de golpe, el manto no
   * cambió ni una tesela, y la regla se puso ROJA. O sea que una regla
   * escrita contra el total se aprieta sola cada vez que el tablero mejora, y acaba castigando
   * exactamente los cambios que se quieren hacer. Lo que se quiere vigilar es el manto, no su
   * cociente con lo demás: va en triángulos, con margen y con la cifra medida delante
   * (tablero en plena, hoy: 181.333).
   */
  const TOPE_DEL_MANTO = 70_000;
  const teselasEnLaSuma = plena.renglones.find((q) => q.que === PIEZA.tesela);
  comprobar(`el manto del campo son 1.796 teselas y no pasa de ${TOPE_DEL_MANTO} triángulos`, (teselasEnLaSuma?.cuantos ?? 0) === 1796 && (teselasEnLaSuma?.triangulos ?? 0) <= TOPE_DEL_MANTO, teselasEnLaSuma);
}

// ---------------------------------------------------------------------------
paso('El peón: diez mil pasos sin T-pose, sin clip inexistente, sin salirse de la polilínea');
// ---------------------------------------------------------------------------

const clipsDelFichero = new Set<string>();
if (fs.existsSync(ANIMACIONES)) {
  const d = await io.read(ANIMACIONES);
  for (const anim of d.getRoot().listAnimations()) clipsDelFichero.add(anim.getName());
}
comprobar('animaciones.glb está y trae los trece clips de CLIP', Object.values(CLIP).every((c) => clipsDelFichero.has(c)), [...clipsDelFichero]);

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

  /*
   * DESDE LA 30, A LA CELDA DEL CUARTEL: SE VE ENTRAR.
   *
   * Quien cae en ¡A comisaría! no se desvanece donde está: corre a la celda del cuartel de esa
   * misma esquina, pasa bajo la reja subida y se desvanece dentro. Se mide con la máquina de
   * verdad, paso a paso, y con los SEIS asientos, porque cada uno sale de un sitio:
   *
   *  · la etapa está entre el golpe y el desvanecerse, y la fase dura lo que dice la coreografía;
   *  · corre con el clip de correr al paso del camino, y el peón no se ve mientras lo lleva;
   *  · no sale de la esquina de la 30, pasa por la PUERTA y acaba DENTRO de la celda;
   *  · no atraviesa ninguna obra ni ninguna pieza de la esquina;
   *  · cada instante en que está bajo la reja de la celda, la reja está más alta que él;
   *  · y la verja de la Comisaría no se abre hasta que se ha desvanecido, ni desde la 30 ni desde otra.
   *
   * Las medidas que hacen falta se toman de donde viven: el alto del aventurero MÁS ALTO de los
   * seis `.glb`, el radio de su disco de `Aventurero.tsx`, la reja de su geometría viva y las
   * piezas de sus cajas del `burgo.glb`.
   */
  {
    let altoDelMasAlto = 0;
    const faltan: string[] = [];
    for (const f of FIGURAS) {
      const ruta = path.join(RAIZ, 'modelos', 'aventureros', f.fichero);
      if (!fs.existsSync(ruta)) {
        faltan.push(f.id);
        continue;
      }
      const d = await io.read(ruta);
      for (const malla of d.getRoot().listMeshes()) {
        for (const prim of malla.listPrimitives()) {
          const pos = prim.getAttribute('POSITION');
          if (pos === null) continue;
          const v = [0, 0, 0];
          for (let i = 0; i < pos.getCount(); i++) altoDelMasAlto = Math.max(altoDelMasAlto, pos.getElement(i, v)[1] as number);
        }
      }
    }
    comprobar(`los ${String(FIGURAS.length)} aventureros están y se miden: el más alto, ${r(altoDelMasAlto)}`, faltan.length === 0 && altoDelMasAlto > 2 && altoDelMasAlto < 3, { faltan, altoDelMasAlto });
    const radioLeido = /RADIO_DEL_DISCO_DEL_AVENTURERO\s*=\s*([\d.]+)/.exec(fs.readFileSync(path.join(CARPETA, 'Aventurero.tsx'), 'utf8'));
    const radio = radioLeido === null ? NaN : Number(radioLeido[1]);
    comprobar('el radio del disco del aventurero se lee de Aventurero.tsx', Number.isFinite(radio) && radio > 0.3 && radio < 2, radioLeido?.[0]);

    const marco30 = marcoDeCasilla(A_LA_MAZMORRA);
    const enLa30 = (p: Punto): { readonly u: number; readonly v: number } => enLaEsquina(marco30, p);

    /* Lo que no se puede atravesar: las caras de obra con altura y las piezas de la esquina, en (u, v). */
    interface Estorbo {
      readonly que: string;
      readonly u0: number;
      readonly u1: number;
      readonly v0: number;
      readonly v1: number;
    }
    const estorbos: Estorbo[] = [];
    for (const cara of carasDeLasObras()) {
      if (cara.casilla !== A_LA_MAZMORRA) continue;
      const ys = cara.puntos.map((q) => q[1]);
      if (Math.max(...ys) - Math.min(...ys) < 0.001 || Math.min(...ys) >= altoDelMasAlto) continue;
      const us = cara.puntos.map((q) => q[0]);
      const vs = cara.puntos.map((q) => q[2]);
      estorbos.push({ que: `obra ${cara.color}`, u0: Math.min(...us), u1: Math.max(...us), v0: Math.min(...vs), v1: Math.max(...vs) });
    }
    const obrasMedidas = estorbos.length;
    for (const puesta of piezasDeLaEsquina(A_LA_MAZMORRA)) {
      if (esSuelo(puesta.pieza) || puesta.y + caja(puesta.pieza).min[1] >= altoDelMasAlto) continue;
      const esquinas = esquinasDeLaPuesta(puesta).map(enLa30);
      estorbos.push({
        que: `pieza ${puesta.pieza}`,
        u0: Math.min(...esquinas.map((q) => q.u)),
        u1: Math.max(...esquinas.map((q) => q.u)),
        v0: Math.min(...esquinas.map((q) => q.v)),
        v1: Math.max(...esquinas.map((q) => q.v)),
      });
    }
    /*
     * Eran más de cinco piezas mientras esta esquina fue una avenida; sin ella quedan tres —el coche
     * patrulla, el arbusto y la papelera—, y las tres tienen que entrar en la cuenta.
     */
    comprobar(
      `se miden ${String(obrasMedidas)} caras de obra y ${String(estorbos.length - obrasMedidas)} piezas de la esquina, y no cero`,
      obrasMedidas > 20 && estorbos.length - obrasMedidas >= 3,
      { obras: obrasMedidas, piezas: estorbos.slice(obrasMedidas).map((o) => o.que) },
    );
    const choquesEn = (u: number, v: number): string[] =>
      estorbos.filter((o) => u > o.u0 - radio && u < o.u1 + radio && v > o.v0 - radio && v < o.v1 + radio).map((o) => `${o.que} en (${r(u)}, ${r(v)})`);

    /* La reja de la celda, de su geometría viva puesta en su sitio: la franja que ocupa en el suelo. */
    const sitioDeLaReja = sitioDeLaRejaDeLaCelda();
    const pieDeLaReja = carasDeLaRejaDeLaCelda()
      .flatMap((cara) => cara.puntos)
      .map((q) => {
        const g = giraElPunto(q[0], q[2], sitioDeLaReja.giro);
        return enLa30({ x: sitioDeLaReja.x + g.x, z: sitioDeLaReja.z + g.z });
      });
    const franja = { u0: Math.min(...pieDeLaReja.map((q) => q.u)), u1: Math.max(...pieDeLaReja.map((q) => q.u)), v0: Math.min(...pieDeLaReja.map((q) => q.v)), v1: Math.max(...pieDeLaReja.map((q) => q.v)) };
    comprobar(
      'la reja de la celda está puesta en el lado de la puerta: entre la puerta y el fondo, a lo largo de toda la celda',
      franja.u0 > PUERTA_DE_LA_CELDA.u && franja.u1 < DENTRO_DE_LA_CELDA.u && franja.v0 <= CELDA_DEL_CUARTEL.v0 + 1e-6 && franja.v1 >= CELDA_DEL_CUARTEL.v1 - 1e-6,
      franja,
    );
    const bajoLaReja = (u: number, v: number): boolean => u > franja.u0 - radio && u < franja.u1 + radio && v > franja.v0 - radio && v < franja.v1 + radio;

    const ETAPAS_DESDE_LA_30 = ['golpe', 'a-la-celda', 'desvanecer', 'reja-sube', 'aparecer', 'reja-baja'];
    const suceso30: SucesoDelBurgo = { que: 'a-la-mazmorra', quien: A, desde: A_LA_MAZMORRA, porque: 'casilla' };
    const PASO = 0.004;
    const malas: string[] = [];
    const choques: string[] = [];
    const sinPuerta: string[] = [];
    const fueraDeLaCelda: string[] = [];
    const rejaBaja: string[] = [];
    const verjaAntes: string[] = [];
    let instantesBajoLaReja = 0;
    let instantesCorriendo = 0;
    /* La vacuna de la reja: la misma curva, pero adelantada lo que dura la carrera. */
    let conLaRejaAdelantada = 0;
    for (let asiento = 0; asiento < 6; asiento++) {
      let c = encolar(nacer(A_LA_MAZMORRA, 5 + asiento, 0, asiento), [suceso30]);
      let t = 0;
      c = avanzar(c, t, PASO, anillo);
      const dura = duracionDeLaFase(c);
      const etapas: string[] = [];
      let alaPuerta = Infinity;
      let ultimo: { readonly u: number; readonly v: number } | null = null;
      const largo = largoDelCaminoALaCelda(anillo, asiento);
      while (c.fase === 'preso' && c.enPie && t < 10) {
        const etapa = etapaActual(c, t);
        if (etapas[etapas.length - 1] !== etapa.nombre) etapas.push(etapa.nombre);
        const p = posicionYRumbo(c, anillo, t);
        const uv = enLa30(p);
        const clip = clipQueToca(c, t);
        if ((etapa.nombre === 'golpe' || etapa.nombre === 'a-la-celda' || etapa.nombre === 'desvanecer') && posicionDelPeon(c, anillo, t).visible) malas.push(`${String(asiento)}: el peón se ve en «${etapa.nombre}»`);
        if ((etapa.nombre === 'golpe' || etapa.nombre === 'a-la-celda' || etapa.nombre === 'desvanecer') && alzadoDeLaReja(t, A_LA_MAZMORRA) > 0) verjaAntes.push(`${String(asiento)}: la verja ya sube en «${etapa.nombre}» a ${r(t)}`);
        if (etapa.nombre === 'aparecer' && alzadoDeLaReja(t, A_LA_MAZMORRA) < 1) verjaAntes.push(`${String(asiento)}: aparece con la verja a ${r(alzadoDeLaReja(t, A_LA_MAZMORRA))}`);
        if (etapa.nombre === 'a-la-celda') {
          instantesCorriendo++;
          if (clip.clip !== CLIP.correr || !clip.bucle || clip.velocidad <= 0 || clip.velocidad > TOPE_DE_VELOCIDAD) malas.push(`${String(asiento)}: clip ${clip.clip} a ${r(clip.velocidad)}`);
          if (Math.abs(clip.velocidad * VELOCIDAD_CORRIENDO * A_LA_CELDA - largo) > 0.5) malas.push(`${String(asiento)}: el clip a ${r(clip.velocidad)} no va al paso de ${r(largo)} en ${String(A_LA_CELDA)} s`);
        }
        if (etapa.nombre === 'a-la-celda' || etapa.nombre === 'desvanecer') {
          if (uv.u < BORDE_INTERIOR + radio || uv.u > MEDIO_LADO - radio || uv.v < BORDE_INTERIOR + radio || uv.v > MEDIO_LADO - radio) malas.push(`${String(asiento)}: sale de la esquina en (${r(uv.u)}, ${r(uv.v)})`);
          choques.push(...choquesEn(uv.u, uv.v).map((x) => `${String(asiento)}: ${x}`));
          alaPuerta = Math.min(alaPuerta, Math.hypot(p.x - anillo.puertaDeLaCelda.x, p.z - anillo.puertaDeLaCelda.z));
          ultimo = uv;
          if (bajoLaReja(uv.u, uv.v) && p.escala > 0.001) {
            instantesBajoLaReja++;
            const alto = altoDelMasAlto * p.escala;
            if (alzadoDeLaRejaDeLaCelda(t, A_LA_MAZMORRA) * SUBIDA_DE_LA_REJA <= alto) rejaBaja.push(`${String(asiento)}: a ${r(t)} la reja está a ${r(alzadoDeLaRejaDeLaCelda(t, A_LA_MAZMORRA) * SUBIDA_DE_LA_REJA)} y él mide ${r(alto)}`);
            if (alzadoDeLaRejaDeLaCelda(t + A_LA_CELDA, A_LA_MAZMORRA) * SUBIDA_DE_LA_REJA <= alto) conLaRejaAdelantada++;
          }
        }
        t += PASO;
        c = avanzar(c, t, PASO, anillo);
      }
      if (JSON.stringify(etapas) !== JSON.stringify(ETAPAS_DESDE_LA_30)) malas.push(`${String(asiento)}: etapas ${etapas.join(' → ')}`);
      if (dura === null || Math.abs(dura - duracionDelEncierro(A_LA_MAZMORRA)) > 1e-9 || Math.abs(dura - duracionDelSuceso(suceso30, false, anillo)) > 1e-9) malas.push(`${String(asiento)}: la fase dura ${String(dura)} y la coreografía ${r(duracionDelSuceso(suceso30, false, anillo))}`);
      if (t < duracionDelEncierro(A_LA_MAZMORRA) - 1e-9 || t > duracionDelEncierro(A_LA_MAZMORRA) + PASO + 1e-9) malas.push(`${String(asiento)}: la entrada acabó a ${r(t)}`);
      if (!c.presa || c.enCasilla !== MAZMORRA || c.enPie) malas.push(`${String(asiento)}: no acaba presa en la Comisaría`);
      if (alaPuerta > 0.5) sinPuerta.push(`${String(asiento)}: pasa a ${r(alaPuerta)} de la puerta`);
      const dentro = ultimo;
      if (dentro === null || !(dentro.u > CELDA_DEL_CUARTEL.u0 + radio && dentro.u < CELDA_DEL_CUARTEL.u1 - radio && dentro.v > CELDA_DEL_CUARTEL.v0 + radio && dentro.v < CELDA_DEL_CUARTEL.v1 - radio)) {
        fueraDeLaCelda.push(`${String(asiento)}: acaba en ${dentro === null ? 'ningún sitio' : `(${r(dentro.u)}, ${r(dentro.v)})`}`);
      }
    }
    comprobar(`desde la 30, en los seis asientos: golpe → a la celda → desvanecer → reja → aparecer → reja, en ${r(duracionDelEncierro(A_LA_MAZMORRA))} s como dice la coreografía, corriendo al paso y con el peón escondido`, malas.length === 0, malas.slice(0, 4));
    comprobar(`y corre de verdad: ${String(instantesCorriendo)} instantes corriendo, y no cero`, instantesCorriendo > 6 * (A_LA_CELDA / PASO) * 0.9, instantesCorriendo);
    comprobar('pasa por la puerta de la celda y acaba dentro, lejos de sus cuatro lados', sinPuerta.length === 0 && fueraDeLaCelda.length === 0, [...sinPuerta, ...fueraDeLaCelda].slice(0, 4));
    comprobar('y en el camino no atraviesa ninguna obra ni ninguna pieza de la esquina', choques.length === 0, [...new Set(choques)].slice(0, 4));
    comprobar(`cada instante bajo la reja de la celda (${String(instantesBajoLaReja)}, y no cero), la reja está más alta que el aventurero más alto`, instantesBajoLaReja > 0 && rejaBaja.length === 0, rejaBaja.slice(0, 3));
    comprobar('se ve fallar: con la reja adelantada lo que dura la carrera, se le cierra encima', conLaRejaAdelantada > 0, conLaRejaAdelantada);
    comprobar('la verja de la Comisaría no sube hasta que se ha desvanecido en la celda, y está arriba cuando aparece', verjaAntes.length === 0, verjaAntes.slice(0, 3));
    comprobar(
      'se ve fallar: con el compás de siempre —el de quien no pasa por la celda— la verja subiría mientras corre',
      [0.8, 1.2, 1.5].some((t) => alzadoDeLaReja(t, 33) > 0 && t > DURACION.golpe && t < DURACION.golpe + A_LA_CELDA),
    );
    /*
     * Las dos vacunas del camino ven fallar las dos cosas contra las que se mide: una OBRA —la puerta
     * en el lado `v0`, donde estuvo la reja, obliga a atravesar el cuartel— y una PIEZA —un camino que
     * pase por donde está aparcado el coche patrulla choca con él—.
     *
     * Hubo otra: la línea recta de su sitio a la puerta, sin el paso, con la que cinco de los seis
     * asientos se llevaban por delante una farola o un arbusto de la avenida. La avenida se quitó para
     * que se leyera ¡A COMISARÍA!, y con ella la línea recta dejó de chocar con nada: esa vacuna ya no
     * probaba nada, y la del coche patrulla prueba lo mismo con lo que hay.
     */
    {
      type EnLa30 = { readonly u: number; readonly v: number };
      const choquesDelCamino = (puntos: readonly EnLa30[]): string[] => {
        const salida: string[] = [];
        for (let k = 1; k < puntos.length; k++) {
          const de = puntos[k - 1] as EnLa30;
          const a = puntos[k] as EnLa30;
          const pasos = Math.ceil(Math.hypot(a.u - de.u, a.v - de.v) / 0.25);
          for (let i = 0; i <= pasos; i++) salida.push(...choquesEn(de.u + ((a.u - de.u) * i) / pasos, de.v + ((a.v - de.v) * i) / pasos));
        }
        return salida;
      };
      const sitioDe = (asiento: number): EnLa30 => enLa30(huecoDeAventurero(A_LA_MAZMORRA, asiento));
      const puertaVieja = { u: DENTRO_DE_LA_CELDA.u, v: CELDA_DEL_CUARTEL.v0 - 6 };
      comprobar('se ve fallar: con la puerta en el lado del cuartel, el camino atravesaría el edificio', choquesDelCamino([sitioDe(0), puertaVieja, DENTRO_DE_LA_CELDA]).length > 0);
      const elPatrulla = estorbos.slice(obrasMedidas).find((o) => o.que === `pieza ${PIEZA.cochePatrulla}`);
      const porElPatrulla = elPatrulla === undefined ? [] : choquesDelCamino([sitioDe(0), PASO_HACIA_LA_CELDA, { u: (elPatrulla.u0 + elPatrulla.u1) / 2, v: (elPatrulla.v0 + elPatrulla.v1) / 2 }, PUERTA_DE_LA_CELDA, DENTRO_DE_LA_CELDA]);
      comprobar('se ve fallar: con el camino desviado por donde está aparcado el coche patrulla, choca con él', porElPatrulla.some((x) => x.startsWith(`pieza ${PIEZA.cochePatrulla} en `)), porElPatrulla.slice(0, 2));
      comprobar(
        'y el camino de la máquina es el declarado: su sitio, el paso, la puerta y dentro',
        [0, 1, 2, 3, 4, 5].every((asiento) => choquesDelCamino([sitioDe(asiento), PASO_HACIA_LA_CELDA, PUERTA_DE_LA_CELDA, DENTRO_DE_LA_CELDA]).length === 0) &&
          Math.hypot(anillo.pasoHaciaLaCelda.x - puntoEnEsquina(marco30, PASO_HACIA_LA_CELDA.u, PASO_HACIA_LA_CELDA.v).x, anillo.pasoHaciaLaCelda.z - puntoEnEsquina(marco30, PASO_HACIA_LA_CELDA.u, PASO_HACIA_LA_CELDA.v).z) < 1e-9,
      );
    }
    /* Y desde otra casilla nadie entra: ni etapa, ni reja de la celda, ni un segundo más. */
    const suceso33: SucesoDelBurgo = { que: 'a-la-mazmorra', quien: A, desde: 33, porque: 'carta' };
    const desde33 = avanzar(encolar(nacer(33, 1, 0, 0), [suceso33]), 0, PASO, anillo);
    comprobar(
      'desde otra casilla no hay carrera: sin etapa «a la celda», la reja de la celda quieta y el encierro de siempre',
      !etapasDe(desde33).some((x) => x.nombre === 'a-la-celda') &&
        [0.3, 0.9, 1.5, 2.5, 3.5].every((t) => alzadoDeLaRejaDeLaCelda(t, 33) === 0) &&
        duracionDelSuceso(suceso33, false, anillo) === DURA_A_LA_MAZMORRA &&
        Math.abs(duracionDelEncierro(A_LA_MAZMORRA) - DURA_A_LA_MAZMORRA - A_LA_CELDA) < 1e-9 &&
        !pasaPorLaCelda(33) &&
        pasaPorLaCelda(A_LA_MAZMORRA),
    );
  }

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
  /*
   * LA PRIORIDAD QUE LE QUITA A R3F EL PINTAR SOLO ES LA POSITIVA, y sólo ésa (`internal.priority`
   * sube con `priority > 0`, en `events-*.js`; `usar-el-paseo.ts` lo cuenta). Esto pedía que no hubiera
   * NINGUNA, y a pie la escena necesita una NEGATIVA: guardar la cámara que el paseo común acaba de
   * poner, detrás de él y antes que nadie. Se prohíbe lo que rompe, que es la positiva.
   */
  const CON_PRIORIDAD = /useFrame\([\s\S]*?\},\s*[1-9]\d*\s*\)/;
  comprobar('ninguna posición, rotación ni escala de JSX recibe algo que no sea una terna', !CON_VECTOR.test(codigoDelBurgo) && !CON_VECTOR.test(codigoDelAventurero));
  comprobar('el asa de los dados se desmonta con porTirar, no se esconde', /porTirar === true \? \(/.test(codigoDelBurgo) && !/visible=\{[^}]*porTirar/.test(codigoDelBurgo));
  comprobar('ningún useFrame pide prioridad POSITIVA: r3f dejaría de pintar solo', !CON_PRIORIDAD.test(codigoDelBurgo) && !CON_PRIORIDAD.test(codigoDelAventurero));
  comprobar('y la única que pide la escena es la −1 de guardar la cámara del paseo: una negativa no le quita el pintado a r3f', (codigoDelBurgo.match(/\},\s*-1\s*\);/g) ?? []).length === 1 && !CON_PRIORIDAD.test('useFrame((s) => { s.x; }, -1);'));
  /*
   * LA BANDEJA DE LOS DADOS SE PEGA A LA CÁMARA EN EL ÚLTIMO `useFrame`, Y LOS DADOS Y SU ASA VAN
   * DENTRO DE ELLA.
   *
   * Lo primero no se ve en una captura quieta: copiada en el `useFrame` de la escena, la bandeja iría
   * un fotograma por detrás de la cámara, y temblaría justo al tirar, que es cuando la cámara corre
   * detrás del peón. Lo segundo es el fallo que había: el asa de los dados era un cilindro en el
   * centro de la GLORIETA mientras los dados estaban en el paño de delante de la Estación de Goya, y
   * en el banco un clic sobre los dados no tiraba y uno sobre la glorieta sí.
   */
  const pegadoDeLaBandeja = (codigo: string): boolean => {
    const seguimiento = codigo.indexOf('cam.lookAt(miraMezclada)');
    const siguiente = seguimiento < 0 ? -1 : codigo.indexOf('useFrame(', seguimiento);
    if (siguiente < 0) return false;
    const cuerpo = codigo.slice(siguiente, siguiente + 400);
    const despues = codigo.slice(siguiente + 400);
    return (
      /grupoDeLaBandeja\.current/.test(cuerpo) &&
      /\.position\.copy\(s\.camera\.position\)/.test(cuerpo) &&
      /\.quaternion\.copy\(s\.camera\.quaternion\)/.test(cuerpo) &&
      !/\.lookAt\(|\b(cam|camera)\.(position|quaternion)\.(copy|set)\(/.test(despues)
    );
  };
  comprobar('la bandeja de los dados copia la cámara en el useFrame que sigue al seguimiento, y ninguno de después mueve la cámara', pegadoDeLaBandeja(codigoDelBurgo));
  comprobar(
    'se ve fallar: con la bandeja copiada antes del seguimiento, o con un useFrame de después que mueve la cámara, cae',
    !pegadoDeLaBandeja('useFrame((s) => { const b = grupoDeLaBandeja.current; b.position.copy(s.camera.position); b.quaternion.copy(s.camera.quaternion); });\nuseFrame((s) => { cam.lookAt(miraMezclada); });') &&
      !pegadoDeLaBandeja(
        'useFrame((s) => { cam.lookAt(miraMezclada); });\nuseFrame((s) => { const b = grupoDeLaBandeja.current; b.position.copy(s.camera.position); b.quaternion.copy(s.camera.quaternion); });\n' +
          ' '.repeat(400) +
          'useFrame((s) => { s.camera.position.set(0, 9, 0); });',
      ),
  );
  /*
   * Cuelgan DENTRO: el asa de los dados es el último hijo de la caja, así que justo detrás de ella se
   * cierran los dos grupos; y la caja, el reloj, los dados y el asa del reloj van entre la apertura y el
   * asa de los dados. Una sola asa de tirar, una sola de pasar, un solo reloj y un solo sitio donde se
   * apuntan los dados en todo el fichero. Y el grupo de dentro se cabecea con lo que dice la pose, no con
   * la inclinación a secas.
   */
  const dentroDeLaBandeja = (codigo: string): boolean => {
    const desde = codigo.indexOf('<group ref={grupoDeLaBandeja}>');
    const cierre = /onPointerUp=\{tocaLosDados\}[^<]*?\/>\s*\)\s*:\s*null\}\s*<\/group>\s*<\/group>/.exec(codigo);
    if (desde < 0 || cierre === null || cierre.index < desde) return false;
    const trozo = codigo.slice(desde, cierre.index);
    const unaVez = (x: RegExp): boolean => (codigo.match(new RegExp(x.source, 'g')) ?? []).length === 1;
    return (
      unaVez(/onPointerUp=\{tocaLosDados\}/) &&
      unaVez(/onPointerUp=\{tocaElReloj\}/) &&
      unaVez(/<RelojDeArena\b/) &&
      unaVez(/dadosGrupos\.current\[i\] = g/) &&
      /dadosGrupos\.current\[i\] = g/.test(trozo) &&
      /geometry=\{cajaGeometria\}/.test(trozo) &&
      /<RelojDeArena\b/.test(trozo) &&
      /onPointerUp=\{tocaElReloj\}/.test(trozo) &&
      /rotation=\{\[poseDeLaBandejaEnPantalla\.cabeceo, 0, 0\]\}/.test(trozo)
    );
  };
  comprobar('la caja, el reloj de arena, los dos dados y las dos asas cuelgan de la caja pegada a la pantalla, y de ningún otro sitio: tocar lo que se ve es tirar o pasar', dentroDeLaBandeja(codigoDelBurgo));
  const cajaDePrueba = (asaDeLosDados: string, cabeceo = 'poseDeLaBandejaEnPantalla.cabeceo'): string =>
    `<group ref={grupoDeLaBandeja}><group position={[1, 2, 3]} rotation={[${cabeceo}, 0, 0]}><mesh geometry={cajaGeometria} /><RelojDeArena lado={48} /><group ref={(g) => { dadosGrupos.current[i] = g; }} />{reloj ? (<mesh onPointerUp={tocaElReloj} />) : null}${asaDeLosDados}`;
  comprobar(
    'se ve fallar: con el asa de los dados suelta en el mundo, como estuvo, o con la caja inclinada a secas, cae; y la caja bien montada pasa',
    !dentroDeLaBandeja(`${cajaDePrueba('')}</group></group>\n{dados?.porTirar === true ? (<mesh position={[0, 3, 0]} onPointerUp={tocaLosDados} />) : null}\n<group ref={naipeGrupo}>`) &&
      !dentroDeLaBandeja(`${cajaDePrueba('{dados?.porTirar === true ? (<mesh onPointerUp={tocaLosDados} />) : null}', 'CAJA.inclinacion')}</group></group>`) &&
      dentroDeLaBandeja(`${cajaDePrueba('{dados?.porTirar === true ? (<mesh onPointerUp={tocaLosDados} />) : null}')}</group></group>`),
  );
  /*
   * PASAR EL TURNO ES TOCAR EL RELOJ, NO APRETARLO. El asa propia de `RelojDeArena` pasa al apretar, y va
   * apagada; la de la caja lo envuelve (`cajaDelAsaDelReloj`), pide un toque sin arrastre como los dados,
   * vuelve a mirar `quieto` y la disponibilidad, y sólo se monta cuando se puede pasar. Así quien empieza
   * a girar el tablero desde el reloj no pierde el turno.
   */
  const elRelojPasaAlTocar = (codigo: string): boolean => {
    const reloj = /<RelojDeArena\b[\s\S]*?\/>/.exec(codigo)?.[0] ?? '';
    const cuerpo = /const tocaElReloj = \(e: ThreeEvent<PointerEvent>\): void => \{([\s\S]*?)\n {2}\};/.exec(codigo)?.[1] ?? '';
    return (
      /encendido=\{false\}/.test(reloj) &&
      /^\s*if \(!esUnToque\(e\)\) return;/.test(cuerpo) &&
      /avisos\.current\.quieto \|\| avisos\.current\.reloj\?\.disponible !== true/.test(cuerpo) &&
      /avisos\.current\.alPasarElTurno/.test(cuerpo) &&
      /props\.reloj\?\.disponible === true && props\.alPasarElTurno !== undefined \? \(\s*<mesh[^>]*onPointerDown=\{empiezaElToque\}[^>]*onPointerUp=\{tocaElReloj\}/.test(codigo)
    );
  };
  comprobar('el reloj de arena pasa el turno con un toque sin arrastre sobre el asa de la caja, con su asa propia apagada, y el asa sólo existe cuando se puede pasar', elRelojPasaAlTocar(codigoDelBurgo));
  /*
   * LAS LLAMADAS DE DIBUJO QUE LA SOBRIA NO TIENE. Con la caja recién puesta la escena hacía 92 en sobria
   * con un tope de 90 (medido en el banco); se bajó a 87 dejando de dibujar las dos asas —r3f no mira
   * `visible` al tirar rayos, así que se siguen tocando— y fundiendo los mazos con sus emblemas y la
   * placa con su cantidad. Nada de eso falla solo si se deshace: se pasaría del tope en silencio.
   */
  const pocasLlamadas = (codigo: string): boolean =>
    /material=\{materiales\.asa\} visible=\{false\} onPointerDown=\{empiezaElToque\} onPointerUp=\{tocaElReloj\}/.test(codigo) &&
    /material=\{materiales\.asa\} visible=\{false\} onPointerDown=\{empiezaElToque\} onPointerUp=\{tocaLosDados\}/.test(codigo) &&
    /geometriaDeLosMazos\(forma, /.test(codigo) &&
    /geometriaDeLaPlacaConSuCantidad\(textoDeLaPlaca\)/.test(codigo) &&
    (codigo.match(/<mesh geometry=\{mazosGeometria\}/g) ?? []).length === 1;
  comprobar('las dos asas de la caja no se dibujan, y los mazos con sus emblemas y la placa con su cantidad van en una geometría cada uno: son las llamadas que la sobria no tiene', pocasLlamadas(codigoDelBurgo));
  comprobar('se ve fallar: con el asa de los dados dibujada, como estuvo, cae', !pocasLlamadas(codigoDelBurgo.replace('material={materiales.asa} visible={false} onPointerDown={empiezaElToque} onPointerUp={tocaLosDados}', 'material={materiales.asa} onPointerDown={empiezaElToque} onPointerUp={tocaLosDados}')));
  comprobar(
    'se ve fallar: con el asa propia del reloj encendida, o con el toque sin mirar si fue arrastre, cae',
    !elRelojPasaAlTocar(codigoDelBurgo.replace('encendido={false}', 'encendido={props.reloj?.disponible === true}')) && !elRelojPasaAlTocar(codigoDelBurgo.replace(/(const tocaElReloj = \(e: ThreeEvent<PointerEvent>\): void => \{\s*)if \(!esUnToque\(e\)\) return;/, '$1')),
  );
  /*
   * EL RELOJ DE RIBERAS SE NORMALIZA AL CILINDRO QUE LA CAJA LE RESERVA, sus cincuenta granos se pintan
   * en UNA llamada —medido en el banco, sueltos subían la escena de 117 a 207 llamadas con un tope de
   * 150— y, si no llega, no se avisa por `alFallar`: el escritorio mandaría la partida al tablero dibujado
   * por un fichero de arte.
   *
   * La carga es la COMÚN, `relojDe` de `comun/reloj.ts`: el Burgo tuvo su copia, `relojDelBurgoDe`, con
   * su caché y su aviso, y se fue. Así que lo que se mira es que la escena la use —y no traiga otra— y que
   * el cargador común, que es donde vive el trato del 404, lo diga por consola y no llame a ningún aviso.
   */
  const codigoDelCargadorDelReloj = sinComentarios(fs.readFileSync(path.join(RAIZ, 'comun', 'reloj.ts'), 'utf8'));
  const relojBienMontado = (codigo: string, cargador: string): boolean => {
    const carga = /export function relojDe\(traer: Traer\): Promise<RelojCargado \| null> \{([\s\S]*?)\n\}/.exec(cargador)?.[1] ?? null;
    return (
      carga !== null &&
      /console\.warn\(/.test(carga) &&
      !/alFallar|falla\(/.test(carga) &&
      /import \{ relojDe \} from '\.\.\/comun\/reloj';/.test(codigo) &&
      /\brelojDe\(traer\)\.then/.test(codigo) &&
      !/WeakMap<Traer, Promise<RelojCargado/.test(codigo) &&
      !/\brutaDelReloj\(/.test(codigo) &&
      /tamano\.y \/ ENVOLVENTE_DEL_RELOJ\.alto, Math\.max\(tamano\.x, tamano\.z\) \/ \(2 \* ENVOLVENTE_DEL_RELOJ\.radio\)/.test(codigo) &&
      /new THREE\.InstancedMesh\(primero\.geometry, primero\.material, granos\.length\)/.test(codigo) &&
      /for \(const g of granos\) g\.visible = false;/.test(codigo) &&
      /chorro\.setMatrixAt\(k, auxMatriz\.multiplyMatrices\(nodo\.matrix, g\.matrix\)\)/.test(codigo)
    );
  };
  comprobar(
    'el reloj de Riberas se trae con el cargador común, se normaliza al cilindro de la caja, pinta sus cincuenta granos en una llamada y, si no llega, no tumba el anillo',
    relojBienMontado(codigoDelBurgo, codigoDelCargadorDelReloj),
  );
  comprobar(
    'se ve fallar: con el reloj que no llega avisado por alFallar, con los granos sueltos o con un cargador propio otra vez en la escena, cae',
    !relojBienMontado(codigoDelBurgo, codigoDelCargadorDelReloj.replace('console.warn(', 'alFallar(')) &&
      !relojBienMontado(codigoDelBurgo.replace('for (const g of granos) g.visible = false;', ''), codigoDelCargadorDelReloj) &&
      !relojBienMontado(
        `${codigoDelBurgo.replace('relojDe(traer).then', 'relojDelBurgoDe(traer).then')}\nconst relojesDelBurgo = new WeakMap<Traer, Promise<RelojCargado | null>>();\nfunction relojDelBurgoDe(traer: Traer): Promise<RelojCargado | null> { return traer(rutaDelReloj()).then(() => null); }`,
        codigoDelCargadorDelReloj,
      ),
  );
  /*
   * `RelojDelBurgo` (`tipos.ts`) ES `RelojDeLaMesa` (`reloj.tsx`) CAMPO A CAMPO. Está escrito dos veces
   * porque la traducción y el servidor leen `tipos.ts` y no compilan JSX; si el reloj de Riberas gana un
   * campo, el de la caja no puede quedarse sin él sin que se vea.
   */
  const camposDe = (fuente: string, nombre: string): string => {
    const cuerpo = new RegExp(`export interface ${nombre} \\{([\\s\\S]*?)\\n\\}`).exec(sinComentarios(fuente))?.[1] ?? '';
    return [...cuerpo.matchAll(/readonly (\w+)(\??): ([^;]+);/g)].map((m) => `${m[1] ?? ''}${m[2] ?? ''}:${(m[3] ?? '').replace(/\s+/g, '')}`).sort().join('; ');
  };
  const fuenteDeLosTipos = fs.readFileSync(path.join(CARPETA, 'tipos.ts'), 'utf8');
  const fuenteDelReloj = fs.readFileSync(path.join(RAIZ, 'reloj.tsx'), 'utf8');
  comprobar(
    `el reloj que recibe la caja (RelojDelBurgo) tiene los campos de RelojDeLaMesa de reloj.tsx: ${camposDe(fuenteDeLosTipos, 'RelojDelBurgo')}`,
    camposDe(fuenteDeLosTipos, 'RelojDelBurgo').split('; ').length === 4 && camposDe(fuenteDeLosTipos, 'RelojDelBurgo') === camposDe(fuenteDelReloj, 'RelojDeLaMesa'),
    { caja: camposDe(fuenteDeLosTipos, 'RelojDelBurgo'), riberas: camposDe(fuenteDelReloj, 'RelojDeLaMesa') },
  );
  comprobar('se ve fallar: un RelojDeLaMesa con un campo más no casa', camposDe(fuenteDelReloj.replace('readonly vuelta: number;', 'readonly vuelta: number;\n  readonly pausado: boolean;'), 'RelojDeLaMesa') !== camposDe(fuenteDeLosTipos, 'RelojDelBurgo'));
  /*
   * LOS NÚMEROS DEL MOVIMIENTO SON LOS DE LA BANDEJA. La caja con la que se posa la bandeja se mide con
   * `MOVIMIENTO_DE_LOS_DADOS`; si la escena multiplicara el salto por otro número escrito a mano, un
   * dado saltaría más de lo reservado y se saldría del lienzo sin que fallara ninguna cuenta.
   */
  const movimientosDeLaBandeja = (codigo: string): string[] => ['salto', 'rebote', 'doble', 'sacudida'].filter((m) => new RegExp(`ARISTA_DE_LOS_DADOS \\* MOVIMIENTO_DE_LOS_DADOS\\.${m}\\b`).test(codigo));
  comprobar(
    'la escena mueve los dados con los cuatro números de la bandeja —salto, rebote, doble y sacudida— y con ninguno escrito a mano',
    movimientosDeLaBandeja(codigoDelBurgo).length === 4 && !/ARISTA_DE_LOS_DADOS \* \d/.test(codigoDelBurgo),
    movimientosDeLaBandeja(codigoDelBurgo),
  );
  const conElSaltoAMano = codigoDelBurgo.replace('ARISTA_DE_LOS_DADOS * MOVIMIENTO_DE_LOS_DADOS.salto', 'ARISTA_DE_LOS_DADOS * 2');
  comprobar('se ve fallar: con el salto escrito a mano, como estaba, cae', conElSaltoAMano !== codigoDelBurgo && (movimientosDeLaBandeja(conElSaltoAMano).length < 4 || /ARISTA_DE_LOS_DADOS \* \d/.test(conElSaltoAMano)));
  /*
   * Y LOS DOS CLIENTES DICEN DÓNDE VA: el escritorio abajo a la derecha —y su cartel del pie se para
   * antes, medido con la misma pose—, y la app arriba a la derecha, porque abajo flota su pie; y su
   * «Ver el burgo entero», que iba en la esquina de arriba a la izquierda, baja debajo de la caja. Sin el
   * sitio, la app la pondría abajo, debajo del carril y de la cinta, y los dados no se verían.
   */
  const fuenteDelCliente = (f: string): string => sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'));
  const elEscritorio = fuenteDelCliente('../escritorio/src/burgo-en-tres.tsx');
  const laApp = fuenteDelCliente('../app/src/arcade/burgo-en-tres-escena.tsx');
  const ponenLaBandeja = (codigo: string, esquina: string): boolean =>
    /bandejaDeLosDados=\{SITIO_DE_LA_BANDEJA\}/.test(codigo) && new RegExp(`const SITIO_DE_LA_BANDEJA: SitioDeLaBandeja = \\{ esquina: '${esquina}', margen: \\d+ \\}`).test(codigo);
  comprobar(
    'el escritorio pone la caja abajo a la derecha y el cartel del pie se para antes de ella si al lado cabe uno que se lea; la app, arriba a la derecha, con «Ver el burgo entero» debajo',
    ponenLaBandeja(elEscritorio, 'abajo-derecha') &&
      /estilo=\{sitioDelCartel\}/.test(elEscritorio) &&
      /poseDeLaBandeja\(lienzo\.ancho, lienzo\.alto, FOV, SITIO_DE_LA_BANDEJA\)/.test(elEscritorio) &&
      /< ANCHO_MINIMO_DEL_CARTEL_AL_LADO\) return EL_SITIO_DEL_CARTEL;/.test(elEscritorio) &&
      ponenLaBandeja(laApp, 'arriba-derecha') &&
      /poseDeLaBandeja\(medida\.ancho, medida\.alto, CAMPO_DE_LA_CAMARA, SITIO_DE_LA_BANDEJA\)\.rectangulo/.test(laApp) &&
      /style=\{\[estilos\.volver, \{ top: alturaDelBotonDeVolver \}\]\}/.test(laApp),
  );
  comprobar('se ve fallar: una app que no pasa el sitio de la caja cae', !ponenLaBandeja(laApp.replace(/bandejaDeLosDados=\{SITIO_DE_LA_BANDEJA\}/, ''), 'arriba-derecha'));
  {
    /* En los lienzos de la completa, al lado de la caja cabe siempre un cartel de 220 puntos: sólo en los estrechos va a lo ancho. */
    const alLado = (ancho: number, alto: number): number => poseDeLaBandeja(ancho, alto, CAMPO_DE_LA_CAMARA, { esquina: 'abajo-derecha', margen: 12 }).rectangulo.x0 - 2 * 12;
    const completas = [[600, 540], [768, 1024], [900, 600], [1280, 720], [1920, 1080], [2560, 1400]] as const;
    comprobar(
      `en los lienzos de la caja completa el cartel del pie cabe al lado de ella con al menos 220 puntos (${completas.map(([a, h]) => `${String(a)}×${String(h)} ${r(alLado(a, h))}`).join(', ')}), y en uno de 288 va a lo ancho`,
      completas.every(([a, h]) => alLado(a, h) >= 220) && alLado(288, 317) < 220,
    );
  }
  /*
   * EL RELOJ DE ARENA LO LLEVAN LOS DOS CLIENTES: los instantes de la mesa, la opción de pasar buscada
   * en la traducción (`pasarEnTres`, la misma en los dos) y la vuelta de `turnosAbiertos`. Sin pasarlo, el
   * reloj se pinta lleno y quieto, y tocarlo no hace nada: no fallaría ninguna cuenta.
   */
  const llevanElReloj = (codigo: string): boolean =>
    /reloj=\{relojDeArena\}/.test(codigo) &&
    /alPasarElTurno=\{alPasarElTurno\}/.test(codigo) &&
    /disponible: !(mesa\.)?quieto && pasarEnTres\(opciones\) !== null/.test(codigo) &&
    /vuelta: vueltaDelReloj\(/.test(codigo) &&
    /const pasar = pasarEnTres\(opciones\);/.test(codigo);
  comprobar('el escritorio y la app le dan a la caja su reloj de arena —los instantes de la mesa, la vuelta y si se puede pasar— y pasan el turno con la opción de pasarEnTres', llevanElReloj(elEscritorio) && llevanElReloj(laApp));
  comprobar('se ve fallar: una app que no pasa el reloj cae', !llevanElReloj(laApp.replace('reloj={relojDeArena}', '')));
  /* Y LOS DOS CLIENTES SALEN CON LA POSE QUE NO SE ESCONDE DETRÁS DE LA CAJA, y ninguno con la de siempre. */
  const salenAlLadoDeLaCaja = (escritorio: string, app: string): boolean =>
    /poseDeSalidaAlLadoDeLaCaja\(\{ ancho: lienzo\.ancho, alto: lienzo\.alto, franjaInferior: 0 \}, poseDeLaBandeja\(lienzo\.ancho, lienzo\.alto, FOV, SITIO_DE_LA_BANDEJA\)\.rectangulo\)/.test(escritorio) &&
    !/\bposeDeSalida\(/.test(escritorio) &&
    (app.match(/poseDeSalidaAlLadoDeLaCaja\(ventana, rectanguloDeLaCaja\)/g) ?? []).length === 2 &&
    !/\bposeDeSalida\(/.test(app);
  comprobar('el escritorio y la app salen, y vuelven con «Ver el burgo entero», a la pose que no deja casillas detrás de la caja', salenAlLadoDeLaCaja(elEscritorio, laApp));
  comprobar('se ve fallar: un escritorio que vuelve a la pose de salida de siempre cae', !salenAlLadoDeLaCaja(elEscritorio.replace('poseDeSalidaAlLadoDeLaCaja({', 'poseDeSalida({'), laApp));
  /*
   * EL PRECINTO SE TIENDE CON LA HIPOTECA: uno por casilla hipotecada, en su sitio, estirado lo que diga
   * la curva de la bandera, en una malla de un precinto por título. Sin la llamada en el bucle de las
   * casillas no fallaría ninguna cuenta: el precinto simplemente no saldría nunca.
   */
  const precintoEnLaEscena = (codigo: string): boolean =>
    /escribePrecinto\(c\.indice, f\)/.test(codigo) &&
    /sitioDelPrecinto\(casilla\)/.test(codigo) &&
    /auxEscala\.set\(tendido, 1, 1\)/.test(codigo) &&
    /args=\{\[precintoGeometria, materiales\.rotulo, CAPACIDAD\.precintos\]\}/.test(codigo) &&
    /precintos: TITULOS/.test(codigo) &&
    /mallaDePrecintos\.count = nPrecintos/.test(codigo);
  comprobar('la escena tiende un precinto por casilla hipotecada, en su sitio y estirado con la curva de la bandera, en una malla de uno por título', precintoEnLaEscena(codigoDelBurgo));
  comprobar('se ve fallar: sin la llamada en el bucle de las casillas, cae', !precintoEnLaEscena(codigoDelBurgo.replace('escribePrecinto(c.indice, f);', '')));
  const elAnillo = await import('../burgo/anillo-en-3d');
  comprobar('y ya no hay paño de dados en el campo: anillo-en-3d.ts no lo exporta y Burgo.tsx no lo pinta', !('SUELO_DE_DADOS' in elAnillo) && !/SUELO_DE_DADOS/.test(codigoDelBurgo));
  comprobar('computeBoundingSphere se llama tras escribir matrices instanciadas', (codigoDelBurgo.match(/computeBoundingSphere\(\)/g) ?? []).length >= 3);
  /*
   * `alEstarListo` desde el hilo de dibujo y con tope de quince segundos: lo lleva el gancho común
   * (`comun/arranque.ts`), que la escena arranca cuando `burgo.glb` y `dados.glb` han llegado o fallado,
   * y la escena no avisa por su cuenta. Se juzgan los dos fuentes, y cada caso envenenado rompe uno.
   */
  const codigoDelArranque = sinComentarios(fs.readFileSync(path.join(RAIZ, 'comun', 'arranque.ts'), 'utf8'));
  const avisaListo = (escena: string, gancho: string): boolean =>
    /export const TOPE_DE_ARRANQUE_MS = 15_000;/.test(gancho) &&
    /\}, TOPE_DE_ARRANQUE_MS\);/.test(gancho) &&
    /useFrame\(\(s, dtCrudo\) => \{[\s\S]*?losAvisos\.current\.alEstarListo\?\.\(\);/.test(gancho) &&
    /const arrancar = usarArranqueYMedida\(props, \{ llave: traer, alVencerElTope: \(\) => falla\('el burgo no ha contestado en quince segundos'\) \}\);/.test(escena) &&
    /void Promise\.all\(\[burgo, losDados\]\)\.then\(\(\) => \{\s*if \(vivo\.current\) arrancar\(\);\s*\}\);/.test(escena) &&
    !/\balEstarListo\?\.\(\)/.test(escena);
  comprobar('alEstarListo se avisa desde el hilo de dibujo con tope de quince segundos: con el gancho común, arrancado cuando llegan los dos .glb', avisaListo(codigoDelBurgo, codigoDelArranque));
  comprobar(
    'se ve fallar: sin arrancar al llegar los .glb, con otro tope, o avisando la escena por su cuenta, cae',
    !avisaListo(codigoDelBurgo.replace('if (vivo.current) arrancar();', ''), codigoDelArranque) &&
      !avisaListo(codigoDelBurgo, codigoDelArranque.replace('TOPE_DE_ARRANQUE_MS = 15_000', 'TOPE_DE_ARRANQUE_MS = 60_000')) &&
      !avisaListo(`${codigoDelBurgo}\navisos.current.alEstarListo?.();`, codigoDelArranque),
  );
  comprobar(
    'la `tercera-persona` reservada ya no existe: las cámaras son las tres de Las Lindes —`mesa`, `hombro` y `ojos`— en el contrato y en la escena',
    !/tercera-persona/.test(codigoDelBurgo) &&
      !/tercera-persona/.test(sinComentarios(fs.readFileSync(path.join(CARPETA, 'tipos.ts'), 'utf8'))) &&
      /\| \{ readonly modo: 'mesa' \}\s*\| \{ readonly modo: 'hombro'; readonly asiento: string \}\s*\| \{ readonly modo: 'ojos'; readonly asiento: string \}/.test(fs.readFileSync(path.join(CARPETA, 'tipos.ts'), 'utf8')),
  );
  /*
   * NUNCA EN T: el aventurero no pide `t-pose` ni reproduce sin marioneta, y la marioneta la monta y la
   * pinta lo común (`comun/marioneta.tsx`), que es donde vive ahora la otra mitad de la promesa —la que
   * estaba aquí—: sin biblioteca no se monta ni se clona nada, y sin marioneta no se pinta nada.
   */
  const codigoDeLaMarionetaComun = sinComentarios(fs.readFileSync(path.join(RAIZ, 'comun', 'marioneta.tsx'), 'utf8'));
  const nuncaEnT = (aventurero: string, comun: string): boolean =>
    !/tPose|t-pose/.test(aventurero) &&
    /marioneta === null\) return/.test(aventurero) &&
    /const marioneta = usarMarioneta\(cargado, biblioteca\);/.test(aventurero) &&
    /<Marioneta de=\{marioneta\}/.test(aventurero) &&
    /biblioteca\.length === 0 \? null : montaMarioneta\(cargado, biblioteca\)/.test(comun) &&
    /if \(de === null\) return null;/.test(comun);
  comprobar(
    'Aventurero.tsx nunca pide t-pose ni reproduce sin marioneta, y la monta y la pinta lo común, que sin clips no monta nada ni pinta nada',
    nuncaEnT(codigoDelAventurero, codigoDeLaMarionetaComun),
  );
  comprobar(
    'se ve fallar: un <Marioneta> que pinta sin marioneta, o un montaje que no mira si hay biblioteca, cae',
    !nuncaEnT(codigoDelAventurero, codigoDeLaMarionetaComun.replace('if (de === null) return null;', '')) &&
      !nuncaEnT(codigoDelAventurero, codigoDeLaMarionetaComun.replace('biblioteca.length === 0 ? null : ', '')),
  );
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
  const { MINIMO_DE_UN_VOLUMEN, claveDelBulto, cuentaDeBulto, geometriaDeLaCaja, geometriaDeLaPlaca, geometriaDeLaPlacaConSuCantidad, geometriaDelColorDeUnBillete, geometriaDeLosMazos, geometriaDelPrecinto, geometriaDeLasObras, geometriaDeLosRotulos, geometriaDeUnBillete, geometriaDeUnBulto, geometriaDeUnHotelito, geometriaDeUnRenglonDePie, geometriaDeUnaCasita, geometriaDeUnaLetra, geometriaDeUnaCinta, repartoDeLaCaja, soltarLosBultos, triangulosDeUnaCaja } = await import('../burgo/ciudad-en-3d');
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

  /* ── 2. Los nombres, los precios y los emblemas están MONTADOS y se leen del derecho ── */
  const rotulos = geometriaDeLosRotulos();
  comprobar('los rótulos del tablero se funden en UNA geometría con triángulos dentro', rotulos !== null && rotulos.triangulos > 0, rotulos === null ? 'null' : rotulos.triangulos);
  if (rotulos !== null) {
    comprobar(
      `están los ${String(huecosDeLosEmblemas().length)} emblemas y las ${String(letrasDelTablero())} letras de los nombres, los pies y los carteles, ni una menos`,
      rotulos.emblemas === huecosDeLosEmblemas().length && rotulos.letras === letrasDelTablero() && letrasDelTablero() > 700,
      { emblemas: rotulos.emblemas, letras: rotulos.letras },
    );
    /*
     * LA VACUNA DE LA CUENTA DE ARRIBA, que si no sería decorado. Un carácter que el tipo no
     * trae no da geometría, y el bucle que funde los rótulos lo SALTA: el nombre saldría corto
     * —«SURTE»— sin un error en ninguna consola. Es el modo de fallo del día que se añada un
     * idioma y se olvide su alfabeto en el charset del compilador.
     */
    comprobar('se ve fallar: una letra que el tipo no trae no da geometría, y ese rótulo se montaría corto', geometriaDeUnaLetra('Ω') === null);
    /*
     * EL PRECINTO DE LA HIPOTECA SE MONTA ENTERO: la cinta, sus dos cantos y las diez letras en una
     * geometría, del orden de lo que le guarda el presupuesto, sin nada fuera de la cinta y con cada
     * capa a su cota —cinta, cantos, letras—, que es lo que hace que las letras no se hundan en la cinta.
     */
    {
      const precinto = geometriaDelPrecinto();
      const posiciones = precinto?.getAttribute('position') as THREE.BufferAttribute | undefined;
      const triangulos = posiciones === undefined ? 0 : posiciones.count / 3;
      let fueraDeLaCinta = 0;
      const cotas = new Set<number>();
      for (let k = 0; posiciones !== undefined && k < posiciones.count; k++) {
        if (Math.abs(posiciones.getX(k)) > PRECINTO.largo / 2 + 1e-4 || Math.abs(posiciones.getZ(k)) > PRECINTO.ancho / 2 + 1e-4) fueraDeLaCinta++;
        cotas.add(Math.round(posiciones.getY(k) * 1000));
      }
      const porPrecinto = triangulosDelPrecinto();
      comprobar(
        `el precinto se monta en una geometría de ${String(triangulos)} triángulos —la cinta, sus cantos y las diez letras—, del orden de los ${String(porPrecinto)} que le guarda el presupuesto, sin nada fuera de la cinta y en tres cotas`,
        precinto !== null && triangulos > porPrecinto * 0.7 && triangulos <= porPrecinto * 1.3 && fueraDeLaCinta === 0 && [...cotas].sort((x, y) => x - y).join() === [PRECINTO.alzas.cinta, PRECINTO.alzas.canto, PRECINTO.alzas.letras].map((y) => Math.round(y * 1000)).join(),
        { triangulos, porPrecinto, fueraDeLaCinta, cotas: [...cotas] },
      );
      precinto?.dispose();
    }
    /*
     * LA CAJA DEL BURGO SE MONTA CON LO QUE CUENTA SU PRESUPUESTO: cada geometría de `ciudad-en-3d.ts`
     * tiene los triángulos de sus caras puras, la suma con sus multiplicidades es `triangulosDeLaCaja()`,
     * los emblemas de los mazos y el renglón más largo de la placa caben en lo que les guarda
     * `presupuesto.ts`, ese renglón cabe en la cara de latón, y los mazos fundidos son tan altos como
     * cartas les quedan.
     */
    {
      const medir = (g: THREE.BufferGeometry | null): number => {
        const n = g === null ? -1 : cuantosTriangulos(g);
        g?.dispose();
        return n;
      };
      const caja = medir(geometriaDeLaCaja('completa'));
      const casita = medir(geometriaDeUnaCasita());
      const hotelito = medir(geometriaDeUnHotelito());
      const mazo = triangulosDeLasCaras(prisma(0, 1, 0, 1, 0, 1, '#000000'));
      const billete = medir(geometriaDeUnBillete());
      const colorDelBillete = medir(geometriaDelColorDeUnBillete());
      const placa = medir(geometriaDeLaPlaca());
      const mazosFundidos = medir(geometriaDeLosMazos('completa', { pregon: MAZO.cartas, arca: 1 }));
      const emblemas = mazosFundidos - 2 * mazo;
      const cimaDeLosMazos = (cartas: { readonly pregon: number; readonly arca: number }): number => {
        const g = geometriaDeLosMazos('completa', cartas);
        g?.computeBoundingBox();
        const cima = g?.boundingBox?.max.y ?? NaN;
        g?.dispose();
        return cima;
      };
      const placaConCantidad = medir(geometriaDeLaPlacaConSuCantidad(textoDelDinero(99_999)));
      const renglon = geometriaDeUnRenglonDePie(textoDelDinero(99_999), PLACA.altoDelTexto, PLACA.color.tinta);
      const posiciones = renglon?.getAttribute('position') as THREE.BufferAttribute | undefined;
      let fueraDelLaton = 0;
      for (let k = 0; posiciones !== undefined && k < posiciones.count; k++) {
        if (Math.abs(posiciones.getX(k)) > PLACA.ancho / 2 - 1 || Math.abs(posiciones.getY(k)) > PLACA.alto / 2 - 0.5) fueraDelLaton++;
      }
      const letras = medir(renglon);
      const sumada =
        caja + CASAS_DE_LA_CAJA * casita + HOTELES_DE_LA_CAJA * hotelito + 2 * mazo + BILLETES_A_LA_VISTA * (billete + colorDelBillete) + placa + TRIANGULOS_DEL_ASA_DE_LOS_DADOS + TRIANGULOS_DEL_ASA_DEL_RELOJ;
      comprobar(
        `la caja del Burgo se monta con los triángulos que cuenta su presupuesto (${String(sumada)} medidos en las geometrías de verdad, ${String(triangulosDeLaCaja())} contados); los dos emblemas de los mazos (${String(emblemas)}) caben en los ${String(2 * TRIANGULOS_POR_EMBLEMA)} de dos, y «${textoDelDinero(99_999)}» (${String(letras)}) en las ${String(LETRAS_DE_LA_PLACA)} letras de la placa y dentro de su latón`,
        caja === triangulosDeLasCaras(carasDeLaCaja('completa')) &&
          casita === triangulosDeLasCaras(carasDeUnEdificio(CASITA)) &&
          hotelito === triangulosDeLasCaras(carasDeUnEdificio(HOTELITO)) &&
          sumada === triangulosDeLaCaja() &&
          emblemas > 0 &&
          emblemas <= 2 * TRIANGULOS_POR_EMBLEMA &&
          letras > 0 &&
          letras <= LETRAS_DE_LA_PLACA * TRIANGULOS_POR_LETRA &&
          placaConCantidad === placa + letras &&
          fueraDelLaton === 0,
        { caja, casita, hotelito, mazo, billete, colorDelBillete, placa, emblemas, letras, placaConCantidad, fueraDelLaton },
      );
      comprobar(
        `los mazos fundidos son tan altos como cartas les quedan —con dieciséis, el emblema a ${r(cimaDeLosMazos({ pregon: MAZO.cartas, arca: 1 }))}; con una en cada uno, a ${r(cimaDeLosMazos({ pregon: 1, arca: 1 }))}— y la caja compacta no los lleva`,
        Math.abs(cimaDeLosMazos({ pregon: MAZO.cartas, arca: 1 }) - (altoDelMazo(MAZO.cartas) + MAZO.alzaDelEmblema)) < 0.01 &&
          Math.abs(cimaDeLosMazos({ pregon: 1, arca: 1 }) - (altoDelMazo(1) + MAZO.alzaDelEmblema)) < 0.01 &&
          geometriaDeLosMazos('compacta', { pregon: MAZO.cartas, arca: MAZO.cartas }) === null,
      );
    }
    /* El presupuesto los cuenta a 120 y a su media por letra: la medida real no puede pasarse del doble. */
    const presupuestados = huecosDeLosEmblemas().length * TRIANGULOS_POR_EMBLEMA + letrasDelTablero() * TRIANGULOS_POR_LETRA;
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
   * la mirada con la vertical), y el «abajo» es `+fuera`. Así que en un renglón la letra `k + 1`
   * tiene que caer hacia `−adelante` respecto de la `k`, y el renglón siguiente del nombre —y el
   * pie después de todos— hacia `+fuera`. Escribiéndolos al revés —que es lo que hacía la primera
   * versión de los precios— el 60 se leía «06» y el 400 «004»: se vio en el banco y no en ninguna
   * cuenta.
   */
  const alReves: string[] = [];
  let renglonesMirados = 0;
  for (let i = 0; i < CASILLAS; i++) {
    if (ESQUINAS.includes(i)) continue;
    const m = marcoDeCasilla(i);
    const renglones = new Map<string, LetraEnElTablero[]>();
    for (const l of [...letrasDelRotulo(i), ...letrasDelSubtitulo(i)]) {
      const clave = r(enElMarco(m, { x: l.x, z: l.z }).v).toString();
      renglones.set(clave, [...(renglones.get(clave) ?? []), l]);
    }
    let vDeAntes = -Infinity;
    for (const [clave, letras] of renglones) {
      renglonesMirados++;
      if (Number(clave) <= vDeAntes) alReves.push(`${String(i)}: el renglón de v ${clave} no va debajo del anterior`);
      vDeAntes = Number(clave);
      for (let k = 1; k < letras.length; k++) {
        const a = letras[k - 1] as LetraEnElTablero;
        const b = letras[k] as LetraEnElTablero;
        if ((b.x - a.x) * m.adelante.x + (b.z - a.z) * m.adelante.z >= 0) alReves.push(`${String(i)}: «${b.letra}» cae hacia +adelante de «${a.letra}»`);
      }
    }
  }
  comprobar(
    `los ${String(renglonesMirados)} renglones de las laterales se escriben hacia −adelante, uno debajo de otro hacia +fuera: la derecha y el abajo de quien mira desde fuera`,
    alReves.length === 0 && renglonesMirados >= 36 * 2,
    alReves.slice(0, 4),
  );

  /*
   * ── 2 bis. EL RÓTULO DE UNA ESQUINA CABE EN SU ESQUINA, Y SE LEE DESDE LA DIAGONAL ──
   *
   * Una esquina escribe su nombre por la DIAGONAL de su cuadro de suelo (90 de lado), y ahí hay
   * dos formas de equivocarse que ninguna cuenta de triángulos ve:
   *
   *  · QUE NO QUEPA. El hueco de un cuadro girado un octavo no es su lado: a `α` del centro por
   *    la diagonal quedan `L√2/2 − |α|` a cada lado, así que lo que tiene que caber es
   *    `ancho + alto ≤ L√2`. Con el lado —que fue el primer intento— la palabra se sale por los
   *    picos, justo donde el tablero levanta su marco, y en pantalla se ve una letra cortada.
   *    Aquí se mide la CAJA de cada letra puesta, sus cuatro esquinas, contra el rombo de verdad.
   *
   *  · QUE SE LEA AL REVÉS. Es el mismo fallo que el de los precios, pero girado un octavo: la
   *    derecha de quien mira una esquina desde su diagonal es `−(fuera + adelante)`, o sea `u`
   *    bajando y `v` subiendo A LA VEZ. Al revés, «SALIDA» se lee «ADILAS».
   */
  /* El rombo, ya descontado el margen: lo que se juzga es que la palabra no ENTRE en él. */
  const medioRombo = (LADO_DEL_SUELO_DE_LA_ESQUINA * Math.SQRT2) / 2 - LADO_DEL_SUELO_DE_LA_ESQUINA * Math.SQRT2 * MARGEN_DEL_TEXTO;
  const seSalen: string[] = [];
  const delRevesEnEsquina: string[] = [];
  let letrasDeEsquinaMiradas = 0;
  for (const esquina of ESQUINAS) {
    /* El nombre y su texto pequeño, que tiene que caber en el mismo rombo. */
    const letras = [...letrasDelRotulo(esquina), ...letrasDelSubtitulo(esquina)];
    if (letras.length === 0) continue;
    letrasDeEsquinaMiradas += letras.length;
    const m = marcoDeCasilla(esquina);
    const enEsquina = (x: number, z: number): { u: number; v: number } => ({ u: x * m.fuera.x + z * m.fuera.z, v: -(x * m.adelante.x + z * m.adelante.z) });
    for (const l of letras) {
      const c = enEsquina(l.x, l.z);
      /*
       * La caja de una letra de esquina va girada un octavo: su ALTO cae por la diagonal (α) y su
       * AVANCE por el renglón (b). Medirla como un cuadrado de su alto —que fue el primer
       * intento— hace de más: la `S` no ocupa a lo ancho lo que mide a lo alto.
       */
      const alfa = (c.u - CENTRO_DEL_SUELO_DE_LA_ESQUINA + (c.v - CENTRO_DEL_SUELO_DE_LA_ESQUINA)) / Math.SQRT2;
      const lado = (c.u - CENTRO_DEL_SUELO_DE_LA_ESQUINA - (c.v - CENTRO_DEL_SUELO_DE_LA_ESQUINA)) / Math.SQRT2;
      const media = ((AVANCE_DE_LA_LETRA[l.letra] ?? ALTO_DE_LA_LETRA / 2) * (l.alto / ALTO_DE_LA_LETRA)) / 2;
      const pico = Math.abs(alfa) + l.alto / 2 + Math.abs(lado) + media;
      if (pico > medioRombo + 0.001) seSalen.push(`${String(esquina)}/${l.letra}: ${pico.toFixed(1)} de ${medioRombo.toFixed(1)}`);
    }
    const a = enEsquina((letras[0] as LetraEnElTablero).x, (letras[0] as LetraEnElTablero).z);
    const b = enEsquina((letras[letras.length - 1] as LetraEnElTablero).x, (letras[letras.length - 1] as LetraEnElTablero).z);
    if (!(b.u < a.u && b.v > a.v)) delRevesEnEsquina.push(`${String(esquina)}: de (${a.u.toFixed(0)}, ${a.v.toFixed(0)}) a (${b.u.toFixed(0)}, ${b.v.toFixed(0)})`);
  }
  /*
   * Y ANTES QUE LAS DOS, LA QUE DICE QUE HAN MIRADO ALGO. Hoy sólo la SALIDA y el PARKING llevan nombre de
   * esquina: si un día `letrasDelRotulo` volviera a devolver vacío para una esquina —que es
   * exactamente lo que hacía hasta esta tanda—, las dos reglas de abajo se quedarían en verde
   * sin haber mirado una sola letra, que es la forma más silenciosa de perder un comprobador.
   */
  const letrasQueLasEsquinasDeclaran = ESQUINAS.reduce((n, e) => n + [...(ROTULO_DE_LA_CASILLA[e] ?? ''), ...(SUBTITULO_DE_LA_CASILLA[e] ?? '')].filter((c) => c !== ' ').length, 0);
  comprobar(
    `las reglas de la esquina han mirado las ${String(letrasQueLasEsquinasDeclaran)} letras que las esquinas declaran, y no cero`,
    letrasDeEsquinaMiradas === letrasQueLasEsquinasDeclaran && letrasQueLasEsquinasDeclaran > 0,
    { miradas: letrasDeEsquinaMiradas, declaradas: letrasQueLasEsquinasDeclaran },
  );
  /*
   * ── 2 quater. EL MARGEN DEL TEXTO, QUE ES LO QUE SEPARA UN RÓTULO DE UNA ETIQUETA ──
   *
   * Lo pidió Miguel viendo el tablero: «los textos tienen que tener un margen para que queden
   * estéticos, ahora mismo ocupan de extremo a extremo». Y no era un descuido de una casilla: el
   * alto de un rótulo se calcula para LLENAR su hueco, así que cualquier palabra que no llegue al
   * techo sale tocando los dos bordes POR CONSTRUCCIÓN. Por eso esto no mira la constante
   * —`ANCHO_DEL_ROTULO` podría volver a ser 72 y la cuenta seguiría cuadrando consigo misma—:
   * mide la caja de cada letra PUESTA, en las coordenadas de su casilla, contra los bordes.
   */
  const MARGEN_LATERAL = ANCHO_DE_CASILLA * MARGEN_DEL_TEXTO_EN_LAS_LATERALES;
  const apretados: string[] = [];
  let letrasLateralesMiradas = 0;
  for (let i = 0; i < CASILLAS; i++) {
    const m = marcoDeCasilla(i);
    if (m.esEsquina) continue;
    const letras = [...letrasDelRotulo(i), ...letrasDelSubtitulo(i)];
    if (letras.length === 0) continue;
    for (const l of letras) {
      letrasLateralesMiradas++;
      const enMarco = enElMarco(m, { x: l.x, z: l.z });
      const media = ((AVANCE_DE_LA_LETRA[l.letra] ?? ALTO_DE_LA_LETRA / 2) * (l.alto / ALTO_DE_LA_LETRA)) / 2;
      const borde = ANCHO_DE_CASILLA / 2 - MARGEN_LATERAL;
      if (Math.abs(enMarco.aLoLargo) + media > borde + 0.001) apretados.push(`${String(i)}/${l.letra}: llega a ${(Math.abs(enMarco.aLoLargo) + media).toFixed(1)} y el margen empieza en ${borde.toFixed(1)}`);
      /* Y a lo hondo: el nombre y el pie van en el BLANCO, sin tocar el filete por arriba ni el marco por abajo, y con uno de los dos altos. */
      if (enMarco.v - l.alto / 2 < vDeRadial(SUPERFICIE.desde) + 1 || enMarco.v + l.alto / 2 > vDeRadial(SUPERFICIE.hasta) - 1) apretados.push(`${String(i)}/${l.letra}: va de v ${(enMarco.v - l.alto / 2).toFixed(1)} a ${(enMarco.v + l.alto / 2).toFixed(1)}, fuera del blanco`);
      if (Math.abs(l.alto - ALTO_DEL_NOMBRE) > 1e-9 && Math.abs(l.alto - ALTO_DEL_PIE) > 1e-9) apretados.push(`${String(i)}/${l.letra}: alto ${l.alto.toFixed(2)}, que no es ni el del nombre ni el del pie`);
    }
  }
  const letrasLateralesDeclaradas = Array.from({ length: CASILLAS }, (_, i) => i)
    .filter((i) => !ESQUINAS.includes(i))
    .reduce((n, i) => n + [...(ROTULO_DE_LA_CASILLA[i] ?? ''), ...(SUBTITULO_DE_LA_CASILLA[i] ?? '')].filter((c) => c !== ' ').length, 0);
  comprobar(
    `el margen se ha medido en las ${String(letrasLateralesMiradas)} letras de las casillas laterales —nombres y pies—, y no en cero`,
    letrasLateralesMiradas === letrasLateralesDeclaradas && letrasLateralesDeclaradas > 0,
    { miradas: letrasLateralesMiradas, declaradas: letrasLateralesDeclaradas },
  );
  comprobar(`ningún rótulo lateral se mete en el margen del ${String(Math.round(MARGEN_DEL_TEXTO_EN_LAS_LATERALES * 100))} % de su casilla ni se sale del blanco`, apretados.length === 0, apretados.slice(0, 4));
  /*
   * ── 2 octies. EL TABLERO HABLA COMO EL REGLAMENTO ──
   *
   * Los nombres y el texto pequeño de las casillas son una COPIA —la escena no importa el
   * reglamento en ejecución para no arrastrar el reductor al móvil—, y una copia se desvía sin
   * avisar. Se desvió: durante unas horas la casilla 10 dijo «CÁRCEL» en el tablero mientras el
   * cartel del pie decía «La Comisaría», y el §0.2 del reglamento lo prohíbe con esas palabras
   * exactas: «ni "cárcel" por la Comisaría, ni "propiedad" por solar, ni "peón" por la ficha de un
   * jugador. La lista del §0.1 es cerrada». Ningún comprobador lo vio, porque ninguno comparaba.
   *
   * Dos reglas, las dos contra el reglamento de verdad:
   *
   *  · el NOMBRE de cada casilla en el tablero es su `rotulo` del reglamento o un trozo de su
   *    `nombre` —«FONDO» de «El Fondo Vecinal», «LUZ» del rótulo «Luz»—; no una palabra nueva;
   *  · y ningún texto del tablero —nombres, texto pequeño ni carteles— usa un sinónimo prohibido.
   */
  {
    const enMayusculas = (texto: string): string => texto.toLocaleUpperCase('es');
    const nombresQueNoSonDelReglamento: string[] = [];
    for (const [clave, palabra] of Object.entries(ROTULO_DE_LA_CASILLA)) {
      const fila = CASILLAS_DEL_REGLAMENTO[Number(clave)];
      if (fila === undefined) {
        nombresQueNoSonDelReglamento.push(`${clave}: «${palabra}» y el reglamento no tiene esa casilla`);
        continue;
      }
      const esSuRotulo = enMayusculas(fila.rotulo) === palabra;
      const esDeSuNombre = enMayusculas(fila.nombre).includes(palabra);
      if (!esSuRotulo && !esDeSuNombre) nombresQueNoSonDelReglamento.push(`${clave}: «${palabra}» no es ni «${fila.rotulo}» ni un trozo de «${fila.nombre}»`);
    }
    comprobar(
      `los ${String(Object.keys(ROTULO_DE_LA_CASILLA).length)} nombres del tablero salen del reglamento: su rótulo o un trozo de su nombre`,
      nombresQueNoSonDelReglamento.length === 0,
      nombresQueNoSonDelReglamento,
    );
    const PROHIBIDAS = ['CÁRCEL', 'CARCEL', 'PROPIEDAD', 'PEÓN', 'PEON'] as const;
    const todoLoEscrito = [
      ...Object.entries(ROTULO_DE_LA_CASILLA).map(([c, t]) => `${c}/nombre: ${t}`),
      ...Object.entries(SUBTITULO_DE_LA_CASILLA).map(([c, t]) => `${c}/texto: ${t}`),
      `20/cartel: ${letrasDeLosCarteles().map((l) => l.letra).join('')}`,
    ];
    const conSinonimo = todoLoEscrito.filter((linea) => PROHIBIDAS.some((p) => enMayusculas(linea).includes(p)));
    comprobar('y ningún texto del tablero usa un sinónimo que el §0.2 prohíbe', conSinonimo.length === 0, conSinonimo);
    /* Las dos vacunas: el nombre que estuvo puesto, y la palabra prohibida en un texto pequeño. */
    const fila10 = CASILLAS_DEL_REGLAMENTO[10];
    comprobar(
      'se ve fallar: «CÁRCEL» en la 10 no es ni su rótulo ni un trozo de «La Comisaría»',
      fila10 !== undefined && enMayusculas(fila10.rotulo) !== 'CÁRCEL' && !enMayusculas(fila10.nombre).includes('CÁRCEL'),
    );
    comprobar('y un texto «LA CÁRCEL» caería por la palabra prohibida', PROHIBIDAS.some((p) => 'LA CÁRCEL'.includes(p)));
    /* Y la cifra del texto pequeño de la Salida es la del reglamento, no otra. */
    comprobar(
      `el texto pequeño de la Salida cobra lo que dice el reglamento: ${String(PAGA_DE_LA_PUERTA_MAYOR)}`,
      (SUBTITULO_DE_LA_CASILLA[0] ?? '').includes(String(PAGA_DE_LA_PUERTA_MAYOR)),
      SUBTITULO_DE_LA_CASILLA[0],
    );
  }

  /*
   * La vacuna del margen: el renglón más ancho del tablero tiene que quedarse CORTO del borde, y con
   * el hueco de antes —los 62 de ancho útil, que era el 86 % de la casilla— no se quedaba.
   */
  const renglonesDeLasLaterales = Array.from({ length: CASILLAS }, (_, i) => i)
    .filter((i) => !ESQUINAS.includes(i))
    .flatMap((i) => [...renglonesDelNombre(ROTULO_DE_LA_CASILLA[i] ?? '').map((t) => ({ t, alto: ALTO_DEL_NOMBRE })), { t: SUBTITULO_DE_LA_CASILLA[i] ?? '', alto: ALTO_DEL_PIE }]);
  const elMasAncho = renglonesDeLasLaterales.reduce((a, b) => (anchoDeLaPalabra(b.t, b.alto) > anchoDeLaPalabra(a.t, a.alto) ? b : a));
  const anchoDelMasAncho = anchoDeLaPalabra(elMasAncho.t, elMasAncho.alto);
  comprobar(
    `se ve fallar: «${elMasAncho.t}» mide ${anchoDelMasAncho.toFixed(1)} y cabría en los 62 de antes, pero el margen la deja en ${ANCHO_DEL_ROTULO.toFixed(1)}`,
    anchoDelMasAncho <= ANCHO_DEL_ROTULO + 0.001 && anchoDelMasAncho > 50 && ANCHO_DEL_ROTULO < 62,
    { ancho: anchoDelMasAncho, util: ANCHO_DEL_ROTULO },
  );
  /*
   * Y LOS RENGLONES: los menos posibles y, entre ésos, los más iguales. Se comprueba contra todos
   * los cortes posibles de cada nombre, contados aquí con su propia cuenta.
   */
  const malPartidos: string[] = [];
  for (const [clave, nombre] of Object.entries(ROTULO_DE_LA_CASILLA)) {
    if (ESQUINAS.includes(Number(clave))) continue;
    const puestos = renglonesDelNombre(nombre);
    const palabras = nombre.split(' ');
    let menos = Infinity;
    let masIgual = Infinity;
    for (let cortes = 0; cortes < 1 << (palabras.length - 1); cortes++) {
      const renglones: string[][] = [[palabras[0] as string]];
      for (let k = 1; k < palabras.length; k++) {
        if ((cortes >> (k - 1)) & 1) renglones.push([palabras[k] as string]);
        else (renglones[renglones.length - 1] as string[]).push(palabras[k] as string);
      }
      const anchos = renglones.map((rr) => anchoDeLaPalabra(rr.join(' '), ALTO_DEL_NOMBRE));
      if (Math.max(...anchos) > ANCHO_DEL_ROTULO + 1e-9) continue;
      if (renglones.length < menos || (renglones.length === menos && Math.max(...anchos) < masIgual)) {
        menos = renglones.length;
        masIgual = Math.max(...anchos);
      }
    }
    const anchoPuesto = Math.max(...puestos.map((t) => anchoDeLaPalabra(t, ALTO_DEL_NOMBRE)));
    if (puestos.join(' ') !== nombre || puestos.length !== menos || Math.abs(anchoPuesto - masIgual) > 1e-9) malPartidos.push(`${clave}: ${puestos.join(' / ')}`);
  }
  comprobar(
    'cada nombre va en los menos renglones que caben y, con ésos, en los más iguales; sin perder ni una palabra',
    malPartidos.length === 0 && renglonesDelNombre('IMPUESTO SOBRE EL CAPITAL').length === 3 && renglonesDelNombre('CALLEJÓN DE LAS LATAS').join(' / ') === 'CALLEJÓN DE / LAS LATAS',
    { malPartidos, impuesto: renglonesDelNombre('IMPUESTO SOBRE EL CAPITAL'), latas: renglonesDelNombre('CALLEJÓN DE LAS LATAS') },
  );
  comprobar(
    `y el nombre acaba por encima de su pie con sitio para la obra: el más hondo, el de la 4, acaba en v ${r(vDelFinalDelNombre(4))}`,
    Array.from({ length: CASILLAS }, (_, i) => i).filter((i) => !ESQUINAS.includes(i)).every((i) => vDelFinalDelNombre(i) + 20 < V_DEL_PIE - ALTO_DEL_PIE) && Math.abs(PASO_DEL_NOMBRE - 1.5 * ALTO_DEL_NOMBRE) < 1e-9,
    Array.from({ length: CASILLAS }, (_, i) => i).filter((i) => !ESQUINAS.includes(i)).map((i) => r(vDelFinalDelNombre(i))),
  );

  comprobar('el rótulo de una esquina cabe entero en el rombo de su suelo, letra a letra y por sus cuatro picos', seSalen.length === 0, seSalen.slice(0, 4));
  /*
   * ── 2 ter. LAS OBRAS: NINGUNA CARA DEL REVÉS, MIRADAS DESDE ARRIBA ──
   *
   * Las obras de las casillas —el asfalto del aparcamiento, sus rayas, el poste y el panel del
   * cartel— se construyen en código, cuadro a cuadro, y el material con el que se dibujan es
   * `FrontSide`: `three` TIRA toda cara que se vea por detrás, y «por detrás» lo decide el orden
   * de los cuatro puntos. Eso ya costó una vez los tejados de la ciudad entera con 277
   * comprobaciones en verde encima, porque contar triángulos no lo ve: el triángulo está ahí.
   *
   * Y aquí hay un motivo extra para no fiarse del ojo: el marco de una casilla lleva `(u, v)` al
   * mundo con determinante −1 —es un reflejo—, así que el orden que uno escribiría mirando el
   * plano sale justo del revés. Por eso no se juzga el código: se MIRA desde arriba. Una rejilla
   * de rayos verticales sobre el aparcamiento, y para cada rayo la cara horizontal MÁS ALTA que
   * le sale al paso tiene que mirar al cielo.
   */
  const carasDeObraPorCasilla = casillasConObra().map((casilla) => ({
    casilla,
    caras: carasDeLaObraEnElMundo(casilla).map((cara) => {
      const [a, b, c] = cara.puntos as readonly (readonly [number, number, number])[];
      const ux = (b as readonly number[])[0]! - (a as readonly number[])[0]!;
      const uy = (b as readonly number[])[1]! - (a as readonly number[])[1]!;
      const uz = (b as readonly number[])[2]! - (a as readonly number[])[2]!;
      const wx = (c as readonly number[])[0]! - (a as readonly number[])[0]!;
      const wy = (c as readonly number[])[1]! - (a as readonly number[])[1]!;
      const wz = (c as readonly number[])[2]! - (a as readonly number[])[2]!;
      const n = { x: uy * wz - uz * wy, y: uz * wx - ux * wz, z: ux * wy - uy * wx };
      const largo = Math.hypot(n.x, n.y, n.z) || 1;
      const xs = cara.puntos.map((q) => (q as readonly number[])[0]!);
      const zs = cara.puntos.map((q) => (q as readonly number[])[2]!);
      const ys = cara.puntos.map((q) => (q as readonly number[])[1]!);
      return {
        normalY: n.y / largo,
        horizontal: Math.max(...ys) - Math.min(...ys) < 1e-6,
        y: ys[0]!,
        x0: Math.min(...xs),
        x1: Math.max(...xs),
        z0: Math.min(...zs),
        z1: Math.max(...zs),
      };
    }),
  }));
  const carasDeObra = carasDeObraPorCasilla.flatMap((x) => x.caras);
  comprobar('las obras del tablero tienen caras, y ninguna degenerada', carasDeObra.length > 0 && carasDeObra.every((c) => Number.isFinite(c.normalY)), carasDeObra.length);
  /*
   * Y PESAN EXACTAMENTE LO QUE EL PRESUPUESTO CUENTA. Con los rótulos esta regla tiene que ser de
   * orden —una letra triangulada no cae siempre en los mismos triángulos—, pero aquí no: una cara
   * de cuatro puntos son dos triángulos y una de tres es uno, así que la cuenta puede ser EXACTA.
   * Lo que caza es que la malla y el presupuesto se separen, que es lo que pasaría el día que
   * `geometriaDeLasObras` dejara de saltarse el triángulo que sobra en una cara de tres puntos.
   */
  {
    const fundidas = geometriaDeLasObras();
    comprobar(
      `las ${String(carasDeLasObras().length)} caras de las obras se funden en UNA malla de ${String(triangulosDeLasObras())} triángulos, los mismos que cuenta el presupuesto`,
      fundidas !== null && cuantosTriangulos(fundidas) === triangulosDeLasObras(),
      { medidos: fundidas === null ? null : cuantosTriangulos(fundidas), presupuestados: triangulosDeLasObras() },
    );
    fundidas?.dispose();
  }
  /*
   * Y NINGUNA OBRA SE SALE DE SU CASILLA. Es la misma regla que ya tenían las piezas del pack
   * —«caben enteras en su cuadrado de 108»—, y hacía falta escribirla otra vez porque una obra no
   * es una pieza: no pasa por `puestasDeLasEsquinas` y aquella regla no la mira. La primera
   * torreta de vigilancia de la cárcel se salió por aquí: su tejadillo volaba hasta 435 y el
   * cuadro de una esquina acaba en 432, o sea que asomaba por el borde del tablero al campo.
   */
  const obrasFuera: string[] = [];
  for (const cara of carasDeLasObras()) {
    /*
     * El ferrocarril no es de ninguna casilla: sus caras ya vienen en coordenadas del mundo, y lo
     * que tienen que cumplir es otra cosa —quedarse en el pasillo limpio que el campo deja entre
     * el canto del tablero y la primera mancha de arbolado—. Ahí se cazó que la curva de las
     * esquinas, con radio 40, se metía por debajo del tablero.
     */
    if (cara.casilla === DEL_MUNDO) {
      for (const [x, , z] of cara.puntos) {
        const lejos = Math.max(Math.abs(x), Math.abs(z));
        if (lejos < MEDIO_LADO + 1 || lejos > MANCHAS_LEJOS_DEL_TABLERO) obrasFuera.push(`vía: (${x.toFixed(1)}, ${z.toFixed(1)}) a ${lejos.toFixed(1)} del centro`);
      }
      continue;
    }
    const esEsquina = marcoDeCasilla(cara.casilla).esEsquina;
    for (const [u, , v] of cara.puntos) {
      if (esEsquina) {
        if (u < BORDE_INTERIOR - 0.001 || u > MEDIO_LADO + 0.001 || v < BORDE_INTERIOR - 0.001 || v > MEDIO_LADO + 0.001) {
          obrasFuera.push(`${String(cara.casilla)}: (${u.toFixed(1)}, ${v.toFixed(1)}) fuera de [${String(BORDE_INTERIOR)}, ${String(MEDIO_LADO)}]`);
        }
      } else if (Math.abs(u) > ANCHO_DE_CASILLA / 2 + 0.001 || v < -0.001 || v > FONDO_DE_CASILLA + 0.001) {
        obrasFuera.push(`${String(cara.casilla)}: (${u.toFixed(1)}, ${v.toFixed(1)}) fuera de su casilla`);
      }
    }
  }
  comprobar('ninguna obra se sale del cuadro de su casilla, y la vía se queda en el pasillo limpio del campo', obrasFuera.length === 0, obrasFuera.slice(0, 4));
  /*
   * ── 2 quinquies. NINGUNA OBRA SE COME UNA PIEZA ──
   *
   * Una obra y una pieza del pack viven en mundos distintos —una la describe `obras.ts` cuadro a
   * cuadro y la otra sale del `.glb` con su caja medida— y hasta hoy nadie comparaba las dos. Eso
   * ya ha costado dos arreglos a mano en esta misma tanda: la comisaría enterró dos bancos y una
   * papelera dentro de una pared, y la carbonera de la estación de vapor se plantó encima del paso
   * de cebra de la avenida. Las dos veces lo vi leyendo coordenadas, que es exactamente la forma
   * de encontrar las cosas que no escala.
   *
   * Así que se miden: la caja de cada pieza —a su talla, en el marco de su casilla— contra la caja
   * de cada cara de obra que TENGA ALTURA. Las caras tumbadas se saltan a propósito: el asfalto
   * del aparcamiento cubre su esquina entera y los coches están encima, que es lo que
   * tiene que pasar.
   */
  const choques: string[] = [];
  let paresMirados = 0;
  for (const casilla of casillasConObra()) {
    if (casilla === DEL_MUNDO) continue;
    const m = marcoDeCasilla(casilla);
    const suyas = carasDeLasObras().filter((cara) => cara.casilla === casilla);
    const piezas = m.esEsquina
      ? (PIEZAS_DE_LA_ESQUINA[casilla] ?? []).map((p) => ({ pieza: p.pieza, u: p.u, v: p.v, giro: p.giroEnCuartos, alza: p.alza ?? 0 }))
      : (ATREZO_DE_LA_CASILLA[casilla] ?? []).map((p) => ({ pieza: p.pieza, u: (p.sitio[0] as number), v: (p.sitio[1] as number), giro: p.giroEnCuartos, alza: p.alza ?? 0 }));
    for (const p of piezas) {
      if (esSuelo(p.pieza)) continue;
      const h = huella(p.pieza);
      /* Un cuarto de vuelta impar cambia el ancho por el fondo. */
      const ancho = p.giro % 2 === 0 ? h.ancho : h.fondo;
      const fondo = p.giro % 2 === 0 ? h.fondo : h.ancho;
      const pu = [p.u - ancho / 2, p.u + ancho / 2] as const;
      const pv = [p.v - fondo / 2, p.v + fondo / 2] as const;
      const py = [p.alza, p.alza + h.alto] as const;
      for (const cara of suyas) {
        const ys = cara.puntos.map((q) => q[1]);
        const y0 = Math.min(...ys);
        const y1 = Math.max(...ys);
        if (y1 - y0 < 0.001) continue;
        const us = cara.puntos.map((q) => q[0]);
        const vs = cara.puntos.map((q) => q[2]);
        paresMirados++;
        const pisa =
          Math.min(...us) < pu[1] - 0.05 &&
          Math.max(...us) > pu[0] + 0.05 &&
          Math.min(...vs) < pv[1] - 0.05 &&
          Math.max(...vs) > pv[0] + 0.05 &&
          y0 < py[1] - 0.05 &&
          y1 > py[0] + 0.05;
        if (pisa) choques.push(`${String(casilla)}: la obra se come «${p.pieza}» en (${p.u.toFixed(1)}, ${p.v.toFixed(1)})`);
      }
    }
  }
  comprobar(`se han mirado ${String(paresMirados)} pares de obra y pieza, y no cero`, paresMirados > 500, paresMirados);
  comprobar('ninguna obra se come una pieza del pack', choques.length === 0, [...new Set(choques)].slice(0, 4));
  /*
   * LA VACUNA: se planta una caja de obra ENCIMA de una pieza de verdad —el primer coche del
   * aparcamiento— y la misma cuenta tiene que cazarla. Sin esto, la regla de arriba estaría en
   * verde igual el día que alguien le cambiara un signo.
   */
  {
    const unCoche = (PIEZAS_DE_LA_ESQUINA[20] ?? []).find((x) => !esSuelo(x.pieza));
    const h = unCoche === undefined ? null : huella(unCoche.pieza);
    /* `caja` a secas es el medidor de piezas de este comprobador; la de las obras entra con su nombre largo. */
    const encima = unCoche === undefined || h === null ? [] : cajaDeObra(20, unCoche.u - 2, unCoche.u + 2, unCoche.v - 2, unCoche.v + 2, 0, 5, '#000000');
    const pisa =
      unCoche !== undefined &&
      h !== null &&
      encima.some((cara) => {
        const us = cara.puntos.map((q) => q[0]);
        const vs = cara.puntos.map((q) => q[2]);
        const ys = cara.puntos.map((q) => q[1]);
        return (
          Math.max(...ys) - Math.min(...ys) > 0.001 &&
          Math.min(...us) < unCoche.u + h.ancho / 2 &&
          Math.max(...us) > unCoche.u - h.ancho / 2 &&
          Math.min(...vs) < unCoche.v + h.fondo / 2 &&
          Math.max(...vs) > unCoche.v - h.fondo / 2 &&
          Math.min(...ys) < (unCoche.alza ?? 0) + h.alto &&
          Math.max(...ys) > (unCoche.alza ?? 0)
        );
      });
    comprobar(`se ve fallar: una obra plantada encima de un «${unCoche?.pieza ?? '?'}» del aparcamiento da choque`, pisa, unCoche?.pieza);
  }
  /*
   * ── 2 quinquies bis. NINGUNA PIEZA NI OBRA TAPA UNA LETRA DEL SUELO ──
   *
   * El nombre y el texto pequeño de las esquinas cruzan su cuadro en diagonal, y lo que hay encima se
   * come letras. Nadie lo medía —las reglas de texto miran el margen y el rombo, y la de piezas mira
   * que no se pisen entre ellas—, y en cuanto se midió salieron cuatro:
   *
   *   · siete coches y una farola del Descanso, aparcados sobre DESCANSO y NI DA NI QUITA;
   *   · una berlina de la avenida de la 30 sobre la T de RETENIDO, un 16 %;
   *   · las rayas amarillas del aparcamiento, a 0,12, pintadas ENCIMA de la tinta, que va a 0,08;
   *   · y el panel del PARKING, que mirado desde arriba tapaba el 84 % de la O de DESCANSO.
   *
   * LAS PIEZAS se muestrean: cada letra con 11 × 11 puntos DENTRO de su rectángulo girado —en una
   * esquina va en diagonal, y su caja alineada exagera el solape—, y la unión de lo que tapan las
   * que suben por encima de ella no puede pasar del 3 %. Ese 3 % es la punta del brazo de un
   * semáforo o de una farola, que vuela sobre la letra a seis de altura; un coche encima no cabe.
   *
   * LAS OBRAS no, y las dos últimas son la razón. La primera versión de esta regla medía las obras
   * como las piezas, con la caja de cada cara QUE TUVIERA ALTURA, y no vio ninguna de las dos: una
   * raya es una cara tumbada, el techo del panel también, y los lados de una caja a plomo proyectan
   * una línea, que no tapa nada. Y aunque las hubiera mirado, una raya de 0,5 cabe entre dos puntos
   * de la rejilla. Así que cada cara de obra que suba por encima de la letra se proyecta al suelo tal
   * cual y se mide EXACTAMENTE contra el rectángulo de la letra, por ejes separadores. Y como una obra
   * está hecha en código a la décima, no se le perdona nada: ninguna puede quedar a menos de
   * `HUECO_ENTRE_RENGLONES` de una letra, el mismo hueco que hay entre sus dos renglones. La
   * separación por ejes nunca pasa de la distancia de verdad: si dice 2,5, hay por lo menos 2,5.
   */
  {
    type Rectangulo = { readonly que: string; readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number; readonly arriba: number };
    const rectanguloDeLaPuesta = (puesta: Puesta): Rectangulo => {
      const esquinas = esquinasDeLaPuesta(puesta);
      return {
        que: `${puesta.pieza} en (${r(puesta.x)}, ${r(puesta.z)})`,
        x0: Math.min(...esquinas.map((q) => q.x)),
        x1: Math.max(...esquinas.map((q) => q.x)),
        z0: Math.min(...esquinas.map((q) => q.z)),
        z1: Math.max(...esquinas.map((q) => q.z)),
        arriba: puesta.y + caja(puesta.pieza).max[1] * puesta.talla,
      };
    };
    const estorbosDeLasLetras: Rectangulo[] = [...puestasDeLasEsquinas('plena'), ...puestasDelAtrezo('plena')].filter((puesta) => !esSuelo(puesta.pieza)).map(rectanguloDeLaPuesta);
    const TOPE_TAPADO = 0.03;
    const letrasTapadas = (estorbos: readonly Rectangulo[]): string[] => {
      const salida: string[] = [];
      for (let casilla = 0; casilla < CASILLAS; casilla++) {
        for (const letra of [...letrasDelRotulo(casilla), ...letrasDelSubtitulo(casilla)]) {
          const ancho = (AVANCE_DE_LA_LETRA[letra.letra] ?? ALTO_DE_LA_LETRA / 2) * (letra.alto / ALTO_DE_LA_LETRA);
          const encima = estorbos.filter((e) => e.arriba > letra.alza + 0.01);
          let tapados = 0;
          let muestras = 0;
          const quien = new Set<string>();
          for (let i = 0; i <= 10; i++) {
            for (let j = 0; j <= 10; j++) {
              const g = giraElPunto(-ancho / 2 + (ancho * i) / 10, -letra.alto / 2 + (letra.alto * j) / 10, letra.giro);
              const x = letra.x + g.x;
              const z = letra.z + g.z;
              muestras++;
              const tapa = encima.find((e) => x > e.x0 && x < e.x1 && z > e.z0 && z < e.z1);
              if (tapa !== undefined) {
                tapados++;
                quien.add(tapa.que);
              }
            }
          }
          if (tapados / muestras > TOPE_TAPADO) salida.push(`${String(casilla)}: la ${letra.letra} tapada un ${String(Math.round((100 * tapados) / muestras))} % por ${[...quien].join(', ')}`);
        }
      }
      return salida;
    };
    const tapadas = letrasTapadas(estorbosDeLasLetras);
    const letrasMiradas = Array.from({ length: CASILLAS }, (_, c) => letrasDelRotulo(c).length + letrasDelSubtitulo(c).length).reduce((a, b) => a + b, 0);
    comprobar(
      `ninguna de las ${String(letrasMiradas)} letras del suelo queda tapada más de un ${String(TOPE_TAPADO * 100)} % por una de las ${String(estorbosDeLasLetras.length)} piezas que no son suelo`,
      tapadas.length === 0 && letrasMiradas > 150 && estorbosDeLasLetras.length > 50,
      tapadas.slice(0, 4),
    );
    /* La vacuna es la berlina de la 30 donde estuvo, en la celda de la cebra, sobre RETENIDO. */
    const marcoDeLa30 = marcoDeCasilla(30);
    const sitioDeAntes = puntoEnEsquina(marcoDeLa30, celdaDeEsquina(5) - 2.7, celdaDeEsquina(3));
    const berlinaDeAntes = rectanguloDeLaPuesta({ pieza: PIEZA.cocheBerlina, x: sitioDeAntes.x, y: COCHE_SOBRE_EL_ASFALTO, z: sitioDeAntes.z, giro: giroHaciaFuera(marcoDeLa30) + radianesDeCuartos(3), talla: 1 });
    const conLaDeAntes = letrasTapadas([...estorbosDeLasLetras, berlinaDeAntes]);
    comprobar('se ve fallar: con la berlina de la 30 donde estuvo, la T de RETENIDO sale tapada', conLaDeAntes.some((x) => x.startsWith('30: la T')), conLaDeAntes);

    /* Las obras: su sombra de verdad contra el rectángulo de cada letra. */
    type Sombra = { readonly que: string; readonly puntos: readonly Punto[]; readonly arriba: number };
    const areaDeLaSombra = (puntos: readonly Punto[]): number =>
      puntos.reduce((suma, p, i) => {
        const q = puntos[(i + 1) % puntos.length] as Punto;
        return suma + p.x * q.z - q.x * p.z;
      }, 0) / 2;
    /* La mayor separación entre las proyecciones de dos convexos sobre las normales de sus lados: negativa si se meten uno en otro. */
    const separacion = (a: readonly Punto[], b: readonly Punto[]): number => {
      let mayor = -Infinity;
      for (const poligono of [a, b]) {
        for (let i = 0; i < poligono.length; i++) {
          const p = poligono[i] as Punto;
          const q = poligono[(i + 1) % poligono.length] as Punto;
          const largo = Math.hypot(q.x - p.x, q.z - p.z);
          if (largo < 1e-9) continue;
          const n = { x: -(q.z - p.z) / largo, z: (q.x - p.x) / largo };
          const enA = a.map((w) => w.x * n.x + w.z * n.z);
          const enB = b.map((w) => w.x * n.x + w.z * n.z);
          mayor = Math.max(mayor, Math.min(...enA) - Math.max(...enB), Math.min(...enB) - Math.max(...enA));
        }
      }
      return mayor;
    };
    const sombraDeLaCara = (que: string, puntos: readonly (readonly [number, number, number])[]): Sombra => ({
      que,
      puntos: puntos.map((q) => ({ x: q[0], z: q[2] })),
      arriba: Math.max(...puntos.map((q) => q[1])),
    });
    /* Una cara a plomo proyecta una línea: desde arriba no tapa nada, y se deja fuera. */
    const sombrasDeLasObras: Sombra[] = [...casillasConObra(), DEL_MUNDO]
      .flatMap((casilla) => carasDeLaObraEnElMundo(casilla).map((cara) => sombraDeLaCara(`obra de la ${String(casilla)} (${cara.color})`, cara.puntos)))
      .filter((sombra) => Math.abs(areaDeLaSombra(sombra.puntos)) > 1e-6);
    const obrasPegadasALasLetras = (sombras: readonly Sombra[]): string[] => {
      const salida = new Set<string>();
      for (let casilla = 0; casilla < CASILLAS; casilla++) {
        for (const letra of [...letrasDelRotulo(casilla), ...letrasDelSubtitulo(casilla)]) {
          const ancho = (AVANCE_DE_LA_LETRA[letra.letra] ?? ALTO_DE_LA_LETRA / 2) * (letra.alto / ALTO_DE_LA_LETRA);
          const rectangulo = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
            const g = giraElPunto(((a as number) * ancho) / 2, ((b as number) * letra.alto) / 2, letra.giro);
            return { x: letra.x + g.x, z: letra.z + g.z };
          });
          for (const sombra of sombras) {
            if (sombra.arriba <= letra.alza + 0.01) continue;
            const d = separacion(rectangulo, sombra.puntos);
            if (d < HUECO_ENTRE_RENGLONES - 1e-6) salida.add(`${String(casilla)}: la ${letra.letra} ${d < 0 ? 'tapada' : `a ${d.toFixed(2)}`} por la ${sombra.que}, a ${r(sombra.arriba)}`);
          }
        }
      }
      return [...salida];
    };
    const pegadas = obrasPegadasALasLetras(sombrasDeLasObras);
    comprobar(
      `ninguna de las ${String(sombrasDeLasObras.length)} caras de obra que se ven desde arriba tapa una letra ni se le acerca a menos de ${String(HUECO_ENTRE_RENGLONES)}`,
      pegadas.length === 0 && sombrasDeLasObras.length > 1000,
      pegadas.slice(0, 4),
    );
    /* Tres vacunas, las tres en el Descanso: el techo del panel donde estuvo, una raya sin cortar y un punto de pintura a 1 de la C. */
    const marcoDelDescanso = marcoDeCasilla(FERIA);
    const losaEnElDescanso = (que: string, u0: number, u1: number, v0: number, v1: number, y: number): Sombra => ({
      que,
      puntos: [puntoEnEsquina(marcoDelDescanso, u0, v0), puntoEnEsquina(marcoDelDescanso, u1, v0), puntoEnEsquina(marcoDelDescanso, u1, v1), puntoEnEsquina(marcoDelDescanso, u0, v1)],
      arriba: y,
    });
    const conElPanelDeAntes = obrasPegadasALasLetras([losaEnElDescanso('el panel de antes', 325, 347, 385, 407, 13.9)]);
    comprobar('se ve fallar: con el panel del PARKING donde estuvo, la O de DESCANSO sale tapada', conElPanelDeAntes.some((x) => x.startsWith('20: la O tapada')), conElPanelDeAntes);
    const conUnaRayaEntera = obrasPegadasALasLetras([losaEnElDescanso('una raya sin cortar', 374.15, 374.65, 360, 367, 0.12)]);
    comprobar('se ve fallar: con una raya de la hilera A sin cortar, la C de DESCANSO sale tapada', conUnaRayaEntera.some((x) => x.startsWith('20: la C tapada')), conUnaRayaEntera);
    const laC = letrasDelRotulo(FERIA).find((l) => l.letra === 'C');
    const puntoCerca: Sombra[] =
      laC === undefined
        ? []
        : [
            {
              que: 'un punto de pintura',
              puntos: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
                const g = giraElPunto((a as number) * 0.25, -(laC.alto / 2 + 1.25) + (b as number) * 0.25, laC.giro);
                return { x: laC.x + g.x, z: laC.z + g.z };
              }),
              arriba: 0.12,
            },
          ];
    const conElPuntoCerca = obrasPegadasALasLetras(puntoCerca);
    comprobar('se ve fallar: un punto de pintura a 1 por debajo de la C, sin tocarla, sale a 1.00', conElPuntoCerca.some((x) => x.startsWith('20: la C a 1.00')), conElPuntoCerca);
  }
  /*
   * Y NINGÚN COCHE EN UNA PLAZA PARTIDA NI DEBAJO DEL CARTEL. Las rayas del aparcamiento se cortan a
   * un hueco del nombre, así que quedan plazas con una raya a medias o sin ninguna, y un coche ahí se
   * lee como aparcado de cualquier manera. Una plaza es entera si las dos rayas que la cierran cubren
   * el fondo de su hilera. Y el panel del PARKING vuela a 13 sobre el fondo de las hileras C y D:
   * lo que quede debajo no se ve desde arriba, ni coche ni farola ni nada.
   */
  {
    const PLAZA = 3.6;
    const FONDO = 7;
    const rayas = carasDeLasObras()
      .filter((cara) => cara.casilla === FERIA && cara.color === COLOR_DE_OBRA.linea)
      .map((cara) => ({
        u: (Math.min(...cara.puntos.map((q) => q[0])) + Math.max(...cara.puntos.map((q) => q[0]))) / 2,
        v0: Math.min(...cara.puntos.map((q) => q[2])),
        v1: Math.max(...cara.puntos.map((q) => q[2])),
      }));
    const rayaEntera = (u: number, v0: number, v1: number): boolean => rayas.some((x) => Math.abs(x.u - u) < 0.01 && x.v0 <= v0 + 0.01 && x.v1 >= v1 - 0.01);
    const plazaEntera = (u: number, v: number): boolean => rayaEntera(u - PLAZA / 2, v - FONDO / 2, v + FONDO / 2) && rayaEntera(u + PLAZA / 2, v - FONDO / 2, v + FONDO / 2);
    /* El panel: las caras azules de la esquina, en `(u, v)`. */
    const carasDelPanel = carasDeLasObras().filter((cara) => cara.casilla === FERIA && cara.color === COLOR_DE_OBRA.carteloAzul);
    const techoDelPanel = Math.max(...carasDelPanel.flatMap((cara) => cara.puntos.map((q) => q[1])));
    const panel = {
      u0: Math.min(...carasDelPanel.flatMap((cara) => cara.puntos.map((q) => q[0]))),
      u1: Math.max(...carasDelPanel.flatMap((cara) => cara.puntos.map((q) => q[0]))),
      v0: Math.min(...carasDelPanel.flatMap((cara) => cara.puntos.map((q) => q[2]))),
      v1: Math.max(...carasDelPanel.flatMap((cara) => cara.puntos.map((q) => q[2]))),
    };
    const MODELOS_DE_COCHE: readonly string[] = [PIEZA.cocheBerlina, PIEZA.cocheFamiliar, PIEZA.cocheTaxi, PIEZA.cocheUtilitario];
    /* Lo que ocupa en planta una pieza de la esquina, con el cuarto de vuelta impar cambiando ancho por fondo. */
    const plantaDe = (p: { readonly pieza: string; readonly u: number; readonly v: number; readonly giroEnCuartos: number }) => {
      const h = huella(p.pieza);
      const ancho = p.giroEnCuartos % 2 === 0 ? h.ancho : h.fondo;
      const fondo = p.giroEnCuartos % 2 === 0 ? h.fondo : h.ancho;
      return { u0: p.u - ancho / 2, u1: p.u + ancho / 2, v0: p.v - fondo / 2, v1: p.v + fondo / 2 };
    };
    const bajoElPanel = (q: { readonly u0: number; readonly u1: number; readonly v0: number; readonly v1: number }): boolean => q.u1 > panel.u0 && q.u0 < panel.u1 && q.v1 > panel.v0 && q.v0 < panel.v1;
    const enteras = [360, 367, 388, 395]
      .flatMap((v0) => Array.from({ length: 15 }, (_, k) => ({ u: 361.8 + PLAZA * k, v: v0 + FONDO / 2 })))
      .filter((p) => plazaEntera(p.u, p.v) && !bajoElPanel({ u0: p.u - PLAZA / 2, u1: p.u + PLAZA / 2, v0: p.v - FONDO / 2, v1: p.v + FONDO / 2 }));
    const coches = (PIEZAS_DE_LA_ESQUINA[FERIA] ?? []).filter((p) => MODELOS_DE_COCHE.includes(p.pieza));
    const malAparcados = coches.filter((p) => !plazaEntera(p.u, p.v)).map((p) => `${p.pieza} en (${String(p.u)}, ${String(p.v)})`);
    comprobar(
      `los ${String(coches.length)} coches del aparcamiento están en plazas con sus dos rayas enteras, y no pasan de la mitad de las ${String(enteras.length)} que quedan así a la vista`,
      malAparcados.length === 0 && coches.length === 9 && enteras.length >= 2 * coches.length,
      { malAparcados, enteras: enteras.length },
    );
    comprobar('se ve fallar: la berlina de la hilera D en la plaza 1, donde estuvo, está en una plaza partida', !plazaEntera(365.4, 398.5));
    const debajo = (PIEZAS_DE_LA_ESQUINA[FERIA] ?? []).filter((p) => !esSuelo(p.pieza) && bajoElPanel(plantaDe(p))).map((p) => `${p.pieza} en (${String(p.u)}, ${String(p.v)})`);
    comprobar(
      `ninguna pieza del Descanso queda debajo del panel del PARKING, que vuela a ${r(techoDelPanel)} sobre u ${r(panel.u0)}..${r(panel.u1)} y v ${r(panel.v0)}..${r(panel.v1)}`,
      debajo.length === 0 && carasDelPanel.length >= 6 && panel.u1 - panel.u0 > 20,
      debajo,
    );
    comprobar('se ve fallar: un utilitario en la plaza 11 de la hilera D queda debajo del panel', bajoElPanel(plantaDe({ pieza: PIEZA.cocheUtilitario, u: 401.4, v: 398.5, giroEnCuartos: 1 })));
  }
  /*
   * ── 2 quinquies ter. Y NINGUNA OBRA TAPA UNA LETRA DESDE LA CÁMARA DEL JUEGO ──
   *
   * Las reglas de arriba miran el tablero desde el cielo, y el juego no lo mira así: la cámara está a
   * 55° desde el sur (`MIRADOR_DEL_BURGO`), y una obra alta se ve corrida hacia el fondo lo que mide
   * por la cotangente de esos 55°. Así se escapó el panel del PARKING. En el carril de entrada, con
   * la vista de arriba ya limpia, seguía tapando la N y la S de DESCANSO: un 20 % al seguir al que
   * mueve y un 85 % desde la pose de salida. Y donde estuvo al principio, la S, la O, la T y la A.
   *
   * Se proyecta con la cuenta de los clientes (`poseDelBurgo` y `proyecta`), en 16:9 y en el móvil,
   * siguiendo al que mueve en cada casilla con letras y desde la pose de salida. Cada letra se
   * muestrea con 11 × 11 puntos, y ninguno puede caer dentro de una cara de obra que suba por encima
   * de ella: la letra está en el suelo, así que lo que la cubre en pantalla está DELANTE. Se saltan
   * las caras con algún punto detrás del ojo, que son tramos de vía de 860 de largo: proyectados así
   * dan polígonos sin sentido —la primera sonda los vio «tapando» la M de la 30—, y ninguno pasa
   * cerca de una letra.
   */
  {
    type Pantalla = { readonly x: number; readonly y: number };
    type CaraViva = { readonly que: string; readonly puntos: readonly (readonly [number, number, number])[] };
    const dentroDelConvexo = (p: Pantalla, poligono: readonly Pantalla[]): boolean => {
      let signo = 0;
      for (let i = 0; i < poligono.length; i++) {
        const a = poligono[i] as Pantalla;
        const b = poligono[(i + 1) % poligono.length] as Pantalla;
        const c = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        if (Math.abs(c) < 1e-9) continue;
        if (signo === 0) signo = Math.sign(c);
        else if (Math.sign(c) !== signo) return false;
      }
      return signo !== 0;
    };
    const carasDeTodasLasObras: CaraViva[] = [...casillasConObra(), DEL_MUNDO].flatMap((casilla) => carasDeLaObraEnElMundo(casilla).map((cara) => ({ que: `obra de la ${String(casilla)} (${cara.color})`, puntos: cara.puntos })));
    const VENTANAS_DEL_JUEGO = [VENTANAS[0], VENTANAS[2]] as readonly { nombre: string; ancho: number; alto: number }[];
    const tapadasDesdeLaCamara = (caras: readonly CaraViva[]): string[] => {
      const salida = new Set<string>();
      for (const v of VENTANAS_DEL_JUEGO) {
        const ventana = { ancho: v.ancho, alto: v.alto, franjaInferior: 0 };
        const aspecto = v.ancho / v.alto;
        const poses = [
          { nombre: 'desde la salida', pose: poseDelBurgo(poseDeSalida(ventana), MIRADOR_DEL_BURGO, ventana), casillas: Array.from({ length: CASILLAS }, (_, i) => i) },
          ...Array.from({ length: CASILLAS }, (_, i) => {
            const m = marcoDeCasilla(i);
            return { nombre: 'siguiendo', pose: poseDelBurgo({ factor: CERCANIA_DE_SEGUIMIENTO, centro: { x: m.centro.x, z: m.centro.z } }, MIRADOR_DEL_BURGO, ventana), casillas: [i] };
          }),
        ];
        for (const { nombre, pose, casillas } of poses) {
          const enPantalla = (x: number, y: number, z: number): Pantalla | null => {
            const p = proyecta(pose, aspecto, { x, y, z });
            return p.delante ? { x: (p.x * v.ancho) / 2, y: (p.y * v.alto) / 2 } : null;
          };
          const proyectadas = caras.flatMap((cara) => {
            const puntos = cara.puntos.map((q) => enPantalla(q[0], q[1], q[2]));
            if (puntos.some((q) => q === null)) return [];
            const enLaPantalla = puntos as Pantalla[];
            return [
              {
                que: cara.que,
                arriba: Math.max(...cara.puntos.map((q) => q[1])),
                puntos: enLaPantalla,
                x0: Math.min(...enLaPantalla.map((q) => q.x)),
                x1: Math.max(...enLaPantalla.map((q) => q.x)),
                y0: Math.min(...enLaPantalla.map((q) => q.y)),
                y1: Math.max(...enLaPantalla.map((q) => q.y)),
              },
            ];
          });
          for (const casilla of casillas) {
            for (const letra of [...letrasDelRotulo(casilla), ...letrasDelSubtitulo(casilla)]) {
              const ancho = (AVANCE_DE_LA_LETRA[letra.letra] ?? ALTO_DE_LA_LETRA / 2) * (letra.alto / ALTO_DE_LA_LETRA);
              const muestras: Pantalla[] = [];
              for (let i = 0; i <= 10; i++) {
                for (let j = 0; j <= 10; j++) {
                  const g = giraElPunto(-ancho / 2 + (ancho * i) / 10, -letra.alto / 2 + (letra.alto * j) / 10, letra.giro);
                  const p = enPantalla(letra.x + g.x, letra.alza, letra.z + g.z);
                  if (p !== null) muestras.push(p);
                }
              }
              if (muestras.length === 0) continue;
              const x0 = Math.min(...muestras.map((q) => q.x));
              const x1 = Math.max(...muestras.map((q) => q.x));
              const y0 = Math.min(...muestras.map((q) => q.y));
              const y1 = Math.max(...muestras.map((q) => q.y));
              const cerca = proyectadas.filter((c) => c.arriba > letra.alza + 0.01 && c.x1 >= x0 && c.x0 <= x1 && c.y1 >= y0 && c.y0 <= y1);
              if (cerca.length === 0) continue;
              let tapados = 0;
              const quien = new Set<string>();
              for (const p of muestras) {
                const tapa = cerca.find((c) => dentroDelConvexo(p, c.puntos));
                if (tapa !== undefined) {
                  tapados++;
                  quien.add(tapa.que);
                }
              }
              if (tapados > 0) salida.add(`${String(casilla)}: la ${letra.letra} ${String(Math.round((100 * tapados) / muestras.length))} % ${nombre} en ${v.nombre}, por la ${[...quien].join(', ')}`);
            }
          }
        }
      }
      return [...salida];
    };
    const tapadasEnPantalla = tapadasDesdeLaCamara(carasDeTodasLasObras);
    comprobar(
      `ninguna de las ${String(carasDeTodasLasObras.length)} caras de obra tapa un punto de una letra desde la cámara del juego: siguiendo en cada casilla y desde la salida, en 16:9 y en el móvil`,
      tapadasEnPantalla.length === 0 && carasDeTodasLasObras.length > 2000,
      tapadasEnPantalla.slice(0, 4),
    );
    /* La vacuna: el panel del PARKING bajado por el carril de entrada, a 13, que desde arriba ya no tapaba nada. */
    const marcoDelDescanso = marcoDeCasilla(FERIA);
    const panelEnElCarril: CaraViva[] = cajaDeObra(FERIA, 325, 347, 355, 377, 13, 13.9, '#000000').map((cara) => ({
      que: 'el panel en el carril',
      puntos: cara.puntos.map((q) => {
        const p = puntoEnEsquina(marcoDelDescanso, q[0], q[2]);
        return [p.x, q[1], p.z] as const;
      }),
    }));
    const conElPanelEnElCarril = tapadasDesdeLaCamara(panelEnElCarril);
    comprobar('se ve fallar: con el panel en el carril de entrada, la N de DESCANSO sale tapada siguiendo al que mueve', conElPanelEnElCarril.some((x) => x.startsWith('20: la N') && x.includes('siguiendo')), conElPanelEnElCarril);
  }
  /*
   * ── 2 sexies. EL TREN: QUE ANDE, QUE PARE Y QUE NO SE SALGA DE LA VÍA ──
   *
   * Es la única animación del tablero que no espera a un suceso de la partida: da vueltas sin
   * parar, así que un fallo suyo se ve siempre y en cualquier pose. Tres cosas, y las tres se
   * miden sobre la función pura y sobre la polilínea de verdad:
   *
   *  · que PARE en las cuatro estaciones el tiempo que dice, y no pase de largo;
   *  · que no ande hacia atrás nunca —un tren que retrocede medio metro en una vuelta es un fallo
   *    de resto que no se ve mirando una captura—;
   *  · y que el punto donde se le pone esté SOBRE la vía, que es lo que hace que no flote por el
   *    campo el día que alguien cambie el trazado y se olvide del tren.
   */
  {
    const largo = largoDeLaVia();
    const paradas = paradasDelTren();
    const vuelta = vueltaDelTren(largo, paradas);
    comprobar(
      `la vía mide ${largo.toFixed(0)} y el tren la recorre con cuatro paradas en ${vuelta.toFixed(1)} s`,
      paradas.length === 4 && Math.abs(vuelta - (largo / TREN.velocidad + 4 * TREN.parada)) < 1e-6,
      { largo, paradas: paradas.map((d) => Math.round(d)), vuelta },
    );
    /* Se muestrea una vuelta entera en pasos de una décima. */
    const PASOS = Math.ceil(vuelta * 10);
    let atras = 0;
    let quietoEnEstacion = 0;
    let fueraDeLaVia = 0;
    let anterior = avanceDelTren(0, largo, paradas);
    for (let k = 1; k <= PASOS; k++) {
      const t = (vuelta * k) / PASOS;
      const d = avanceDelTren(t, largo, paradas);
      const paso = ((d - anterior) % largo + largo) % largo;
      if (paso > largo / 2) atras++;
      if (paso < 1e-9 && paradas.some((p) => Math.abs(p - d) < 1e-6)) quietoEnEstacion++;
      const p = puntoEnLaVia(d);
      const lejos = Math.max(Math.abs(p.x), Math.abs(p.z));
      if (lejos < MEDIO_LADO || lejos > MANCHAS_LEJOS_DEL_TABLERO) fueraDeLaVia++;
      anterior = d;
    }
    comprobar(`en una vuelta muestreada en ${String(PASOS)} pasos el tren no anda hacia atrás ni una vez`, atras === 0, atras);
    comprobar('y se para en las estaciones: hay pasos en los que no avanza, y todos son en una parada', quietoEnEstacion >= 4 * Math.floor(TREN.parada * 10) - 8, quietoEnEstacion);
    comprobar('y en toda la vuelta se mantiene sobre la vía, sin salirse al campo ni meterse en el tablero', fueraDeLaVia === 0, fueraDeLaVia);
    /*
     * LAS DOS VACUNAS. Sin paradas el tren no se para nunca —o sea que los pasos quietos de arriba
     * son de verdad las paradas y no un redondeo—, y con una sola parada la vuelta dura justo el
     * viaje más una parada.
     */
    let quietoSinParadas = 0;
    let previo = avanceDelTren(0, largo, []);
    for (let k = 1; k <= 200; k++) {
      const d = avanceDelTren((vuelta * k) / 200, largo, []);
      if (Math.abs(d - previo) < 1e-9) quietoSinParadas++;
      previo = d;
    }
    comprobar('se ve fallar: sin estaciones el tren no se para ni una vez en toda la vuelta', quietoSinParadas === 0, quietoSinParadas);
    comprobar('y con una sola estación la vuelta dura el viaje entero más una parada', Math.abs(vueltaDelTren(largo, [0]) - (largo / TREN.velocidad + TREN.parada)) < 1e-6);
    /*
     * ═══ Y QUE EL MORRO MIRE HACIA DONDE ANDA ═══
     *
     * El tren se construyó primero a lo largo de `+x` y en este tablero todas las piezas miran a
     * `+z` —`rumboDeLaMarcha` devuelve `atan2(dx, dz)`—, así que daba la vuelta al burgo DE LADO:
     * se movía perfectamente y miraba a noventa grados de su marcha. En una captura desde arriba
     * eso no se distingue, y ninguna cuenta de las de más arriba lo veía. Ésta sí: coge el morro
     * del modelo, lo gira con el rumbo que se le pone y lo compara con hacia dónde va la vía.
     */
    const caras = carasDelTren();
    const alLargo = Math.max(...caras.flatMap((c) => c.puntos.map((q) => q[2])));
    const aLoAncho = Math.max(...caras.flatMap((c) => c.puntos.map((q) => q[0])));
    comprobar('el tren se construye a lo largo de +z, como todas las piezas de este tablero', alLargo > aLoAncho * 2, { alLargo, aLoAncho });
    const enElMorro = Math.max(...caras.filter((c) => c.puntos.some((q) => Math.abs(q[2] - alLargo) < 0.01)).flatMap((c) => c.puntos.map((q) => q[1])));
    const loMasAlto = Math.max(...caras.flatMap((c) => c.puntos.map((q) => q[1])));
    comprobar('y su punto más adelantado es el morro, más bajo que la cabina', enElMorro < loMasAlto - 1, { enElMorro, loMasAlto });
    {
      const donde = puntoEnLaVia(paradas[0] as number);
      const unPasoMas = puntoEnLaVia((paradas[0] as number) + 2);
      const dx = unPasoMas.x - donde.x;
      const dz = unPasoMas.z - donde.z;
      const largoDelPaso = Math.hypot(dx, dz) || 1;
      /* El `+z` del modelo, girado por el rumbo que se le pone: `(sin θ, cos θ)`. */
      const morro = { x: Math.sin(donde.rumbo), z: Math.cos(donde.rumbo) };
      const alineado = (morro.x * dx + morro.z * dz) / largoDelPaso;
      comprobar('el morro del tren mira exactamente hacia donde avanza la vía', alineado > 0.999, { alineado });
      comprobar('se ve fallar: girado un cuarto —que es como estaba— el morro y la marcha no se parecen en nada', Math.abs((Math.sin(donde.rumbo + Math.PI / 2) * dx + Math.cos(donde.rumbo + Math.PI / 2) * dz) / largoDelPaso) < 0.02);
    }
  }

  /*
   * ── 2 septies. LAS TRES PIEZAS VIVAS DE LAS CASILLAS ──
   *
   * La tapa del cofre, la ruleta del casino y la joya de la Tasa se mueven, así que no se funden
   * con las demás obras: van en tres `InstancedMesh` y la escena les cambia la matriz. Lo que se
   * mide aquí es lo único que puede medirse sin pintar: que las tres CURVAS empiecen y acaben
   * quietas —una animación que no vuelve a su sitio deja la tapa abierta para siempre—, que duren
   * lo que dicen, y que la regla que decide QUIÉN se anima con una carta acierte.
   */
  {
    comprobar(
      'la tapa del cofre empieza y acaba cerrada, y se abre del todo por en medio',
      aperturaDelCofre(0) === 0 && aperturaDelCofre(TAPA_DEL_COFRE.total) === 0 && aperturaDelCofre(TAPA_DEL_COFRE.abre) === 1 && aperturaDelCofre(TAPA_DEL_COFRE.total + 5) === 0,
      { alPrincipio: aperturaDelCofre(0), abierta: aperturaDelCofre(TAPA_DEL_COFRE.abre), alFinal: aperturaDelCofre(TAPA_DEL_COFRE.total) },
    );
    comprobar('y no da tirones: entre dos instantes seguidos no salta más de un décimo', (() => {
      let mayor = 0;
      for (let t = 0; t < TAPA_DEL_COFRE.total; t += 0.01) mayor = Math.max(mayor, Math.abs(aperturaDelCofre(t + 0.01) - aperturaDelCofre(t)));
      return mayor < 0.1;
    })());
    comprobar(
      `la ruleta da ${String(RULETA.vueltas)} vueltas y se para: al final no se mueve`,
      Math.abs(giroDeLaRuleta(RULETA.total) - RULETA.vueltas * Math.PI * 2) < 1e-9 && Math.abs(giroDeLaRuleta(RULETA.total) - giroDeLaRuleta(RULETA.total + 1)) < 1e-9,
    );
    comprobar('y frena: el último décimo gira menos que el primero', giroDeLaRuleta(RULETA.total) - giroDeLaRuleta(RULETA.total - 0.08) < giroDeLaRuleta(0.08) - giroDeLaRuleta(0));
    comprobar('la joya da una vuelta entera y se queda como estaba', Math.abs(giroDeLaJoya(JOYA_QUE_GIRA.total) - Math.PI * 2) < 1e-9);
    /*
     * «LAS ANIMACIONES SIEMPRE MUY BREVES», con la cifra que el plan le puso (LAS-CASILLAS.md §1):
     * ninguna animación de casilla pasa de 0,8 s. Hasta hoy la regla vivía sólo en el documento, y
     * la carrera a la celda del cuartel se escribió con 0,9 sin que nada lo notara. Se miden todas
     * las que tiene una casilla —tapa, ruleta, joya, la carrera y los dos gestos de la reja de la
     * celda—; el tren no, que es continuo y no espera a nadie.
     */
    const TOPE_DE_UNA_ANIMACION_DE_CASILLA = 0.8;
    const lasQuePasan = (tabla: Readonly<Record<string, number>>): string[] =>
      Object.entries(tabla)
        .filter(([, dura]) => !(dura > 0 && dura <= TOPE_DE_UNA_ANIMACION_DE_CASILLA + 1e-9))
        .map(([que, dura]) => `${que}: ${String(dura).replace('.', ',')} s`);
    const animacionesDeCasilla = {
      'la tapa del cofre': TAPA_DEL_COFRE.total,
      'la ruleta': RULETA.total,
      'la joya': JOYA_QUE_GIRA.total,
      'la carrera a la celda': A_LA_CELDA,
      'la reja de la celda al subir': PASO_DE_LA_REJA,
      'la reja de la celda al bajar': DESVANECER,
      'la moneda de la recaudación': RECAUDACION.rueda,
      'el humo de la central': duracionDelHumo(),
      'la onda del canal': ONDA_DEL_AGUA.dura,
    };
    comprobar(
      `ninguna animación de casilla pasa de ${String(TOPE_DE_UNA_ANIMACION_DE_CASILLA).replace('.', ',')} s: ${Object.keys(animacionesDeCasilla).join(', ')}`,
      lasQuePasan(animacionesDeCasilla).length === 0,
      lasQuePasan(animacionesDeCasilla),
    );
    comprobar('se ve fallar: con la carrera a la celda de la primera versión, 0,9 s, la misma cuenta la señala', lasQuePasan({ ...animacionesDeCasilla, 'la carrera a la celda': 0.9 }).length === 1);
    /*
     * Y QUE SE VEAN DESDE EL AIRE. Las piezas vivas se escriben en su propio marco, SIN el espejo que
     * tiene el de una casilla, y un ayudante escrito para el otro marco las pone del revés sin que
     * falle nada: la ruleta estuvo así desde que se hizo, con los 24 triángulos de su plato y su buje
     * mirando al suelo, y como su material sólo pinta la cara de delante, desde arriba se veía girar
     * la rayita amarilla sobre nada. La lupa de las obras no llegaba: mira las fundidas.
     *
     * Ésta es exacta, triángulo a triángulo y no por cajas: una rejilla de rayos verticales sobre la
     * huella de cada pieza, y el primer triángulo que corta cada rayo tiene que mirar ARRIBA.
     */
    const lupaDeUnaPiezaViva = (caras: readonly CaraDeObra[]): { readonly rayos: number; readonly alReves: number } => {
      const triangulos = caras.flatMap((cara) => {
        const [a, b, c, d] = cara.puntos;
        return esTriangulo(cara) ? [[a, b, c] as const] : [[a, b, c] as const, [a, c, d] as const];
      });
      const xs = caras.flatMap((cara) => cara.puntos.map((q) => q[0]));
      const zs = caras.flatMap((cara) => cara.puntos.map((q) => q[2]));
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const z0 = Math.min(...zs);
      const z1 = Math.max(...zs);
      const RAYOS_POR_LADO = 15;
      let rayos = 0;
      let alReves = 0;
      for (let i = 0; i < RAYOS_POR_LADO; i++) {
        for (let j = 0; j < RAYOS_POR_LADO; j++) {
          const x = x0 + ((x1 - x0) * (i + 0.5)) / RAYOS_POR_LADO;
          const z = z0 + ((z1 - z0) * (j + 0.5)) / RAYOS_POR_LADO;
          let mejorY = Number.NEGATIVE_INFINITY;
          let mejorNormalY = 0;
          for (const [a, b, c] of triangulos) {
            const ux = b[0] - a[0];
            const uz = b[2] - a[2];
            const wx = c[0] - a[0];
            const wz = c[2] - a[2];
            const det = ux * wz - uz * wx;
            /* Una pared no es techo: un rayo vertical la roza y no la corta. */
            if (Math.abs(det) < 1e-9) continue;
            const s = ((x - a[0]) * wz - (z - a[2]) * wx) / det;
            const t = ((z - a[2]) * ux - (x - a[0]) * uz) / det;
            if (s < 0 || t < 0 || s + t > 1) continue;
            const y = a[1] + s * (b[1] - a[1]) + t * (c[1] - a[1]);
            if (y <= mejorY) continue;
            mejorY = y;
            /* La `y` de (b − a) × (c − a) es −det: positiva cuando el triángulo mira arriba. */
            mejorNormalY = -det;
          }
          if (mejorY === Number.NEGATIVE_INFINITY) continue;
          rayos++;
          if (mejorNormalY <= 0) alReves++;
        }
      }
      return { rayos, alReves };
    };
    const piezasVivas: readonly (readonly [string, readonly CaraDeObra[]])[] = [
      ['la tapa del cofre', carasDeLaTapa()],
      ['la ruleta', carasDeLaRuleta()],
      ['la joya', carasDeLaJoyaViva()],
      ['la reja de la celda', carasDeLaRejaDeLaCelda()],
      ['el tren', carasDelTren()],
      ['la moneda de la recaudación', carasDeLaMonedaDeLaRecaudacion()],
      ['una bocanada del humo', carasDeUnaBocanada()],
      ['la onda del canal', carasDeLaOnda()],
    ];
    const lupasVivas = piezasVivas.map(([que, caras]) => ({ que, ...lupaDeUnaPiezaViva(caras) }));
    comprobar(
      `las ${String(piezasVivas.length)} piezas vivas se ven desde el aire: cada rayo de la lupa da primero en una cara que mira arriba, y cada una recibe rayos`,
      lupasVivas.every((l) => l.rayos >= 20 && l.alReves === 0),
      lupasVivas.filter((l) => l.rayos < 20 || l.alReves > 0),
    );
    /* La vacuna es la ruleta como estuvo: el mismo disco, pero con el orden del marco de una casilla. */
    const ruletaDeAntes = lupaDeUnaPiezaViva(disco(CASILLAS_DEL_PREGON[0] as number, 0, 0, 4.2, 0, 12, '#000000'));
    comprobar('se ve fallar: el plato de la ruleta con el orden de una casilla, como estuvo, sale entero del revés', ruletaDeAntes.rayos > 0 && ruletaDeAntes.alReves === ruletaDeAntes.rayos, ruletaDeAntes);
    /* Y la regla que decide quién se anima, que vivía dentro del bucle de fotogramas. */
    comprobar('una carta del Arca en la 17 abre ese cofre y ninguna ruleta', loQueAnimaUnaCarta('arca', 17).cofre === 17 && loQueAnimaUnaCarta('arca', 17).ruleta === null);
    comprobar('una del Pregón en la 22 gira esa ruleta y ningún cofre', loQueAnimaUnaCarta('pregon', 22).ruleta === 22 && loQueAnimaUnaCarta('pregon', 22).cofre === null);
    comprobar(
      'se ve fallar: una carta del Arca cogida en una casilla que no tiene cofre no anima nada',
      loQueAnimaUnaCarta('arca', 22).cofre === null && loQueAnimaUnaCarta('arca', 22).ruleta === null && loQueAnimaUnaCarta(null, 17).cofre === null,
    );
    /*
     * Y LA REJA DE LA CELDA: la comisaría tiene cuatro paredes y una de ellas es una reja que sube.
     * Lo que se mide es que esté FUERA de la malla fundida —si volviera a fundirse se quedaría
     * clavada y nadie lo notaría hasta ver un encierro— y que su curva empiece y acabe cerrada. Que
     * esté arriba justo cuando el aventurero pasa por debajo lo mide el paso del peón, con la máquina.
     */
    comprobar(
      'la reja de la celda es una pieza viva y no está fundida con la comisaría',
      triangulosDeLasPiezasVivas().reja > 0 && !carasDeLasObras().some((cara) => cara.casilla === 30 && cara.color === '#2f2f33'),
      { reja: triangulosDeLasPiezasVivas().reja },
    );
    const alzadaDesdeLa30 = (t: number): number => alzadoDeLaRejaDeLaCelda(t, A_LA_MAZMORRA);
    const finDelEncierro = duracionDelEncierro(A_LA_MAZMORRA);
    comprobar(
      'y sube y vuelve a bajar: empieza cerrada, se abre del todo por en medio y acaba cerrada',
      alzadaDesdeLa30(0) === 0 && alzadaDesdeLa30(finDelEncierro) === 0 && Math.max(...[0.2, 0.9, 1.2, 1.5, 2.4, 3, 3.5].map(alzadaDesdeLa30)) === 1,
      { alPrincipio: alzadaDesdeLa30(0), alFinal: alzadaDesdeLa30(finDelEncierro) },
    );
    comprobar(
      'y las casillas que la regla nombra son las mismas que levantan cofre y ruleta',
      CASILLAS_DEL_ARCA.every((c) => casillasConObra().includes(c)) && CASILLAS_DEL_PREGON.every((c) => casillasConObra().includes(c)),
    );

    /*
     * LA RECAUDACIÓN: la moneda que sube la escalinata de la oficina del Impuesto.
     *
     * Rueda por un sitio que ya estaba construido, así que lo que se mide es que el sitio y la moneda
     * se entiendan: que en TODO el recorrido esté apoyada —ni hundida en un peldaño ni flotando—,
     * que pase entre las columnas y quepa por la puerta, que acabe entera dentro del cuerpo (y por
     * eso escondida), que empiece sin pisar el precio, y que sólo la mueva el pago del Impuesto, en
     * una ventana que cabe dentro del pago más corto que hay.
     *
     * Todo en el plano `(v, y)` de la casilla, que es donde rueda: los peldaños son rectángulos ahí, y
     * una moneda de canto es un círculo de radio `radio` con su grueso a lo largo de `u`.
     */
    {
      const { radio, grueso } = MONEDA_DE_LA_RECAUDACION;
      const coma = (x: number): string => String(r(x)).replace('.', ',');
      const oficina = cajasDeLaOficina();
      const hastaUnRectangulo = (v: number, y: number, r: { readonly v0: number; readonly v1: number; readonly desde: number; readonly hasta: number }): number =>
        Math.hypot(Math.max(r.v0 - v, 0, v - r.v1), Math.max(r.desde - y, 0, y - r.hasta));
      /* Lo que la aguanta: el suelo (y = 0) y los peldaños. La distancia de su eje a lo más cercano. */
      const apoyo = (v: number, y: number, peldanos: typeof oficina.peldanos): number => Math.min(y, ...peldanos.map((p) => hastaUnRectangulo(v, y, p)));
      const recorrer = (alturaDe: (u: number) => { readonly v: number; readonly y: number }, peldanos: typeof oficina.peldanos): { hundida: string[]; flotando: string[] } => {
        const hundida: string[] = [];
        const flotando: string[] = [];
        for (let k = 0; k <= 400; k++) {
          const u = k / 400;
          const { v, y } = alturaDe(u);
          /* Mientras no ha llegado a la fachada: después va entrando en el cuerpo, que es a lo que va. */
          if (v + radio > oficina.cuerpo.v0) continue;
          const d = apoyo(v, y, peldanos);
          if (d < radio - 1e-6) hundida.push(`u ${r(u)}: eje en (${r(v)}, ${r(y)}), a ${r(d)} de un peldaño`);
          if (d > radio + 1e-3) flotando.push(`u ${r(u)}: eje en (${r(v)}, ${r(y)}), a ${r(d - radio)} del apoyo`);
        }
        return { hundida, flotando };
      };
      const deVerdad = recorrer((u) => monedaEnLaEscalinata(u), oficina.peldanos);
      comprobar('la moneda de la recaudación sube la escalinata apoyada: en 400 instantes, ni hundida en un peldaño ni flotando', deVerdad.hundida.length === 0 && deVerdad.flotando.length === 0, [...deVerdad.hundida, ...deVerdad.flotando].slice(0, 4));
      comprobar(
        'se ve fallar: rodando a ras de suelo, sin subir, se hunde en los peldaños',
        recorrer((u) => ({ v: monedaEnLaEscalinata(u).v, y: radio }), oficina.peldanos).hundida.length > 0,
      );
      comprobar(
        'se ve fallar: con los peldaños de antes, que acababan cuatro antes de la fachada, el último tramo antes de la puerta va por el aire',
        recorrer((u) => monedaEnLaEscalinata(u), oficina.peldanos.map((p) => ({ ...p, v1: oficina.cuerpo.v0 - 4 }))).flotando.length > 0,
      );
      /* Las columnas y la puerta: la moneda es un disco de grueso `grueso` centrado en `u = 0`. */
      const medioGrueso = grueso / 2;
      comprobar('pasa entre las dos columnas del centro sin rozarlas', oficina.columnas.every((c) => c.u0 > medioGrueso || c.u1 < -medioGrueso), oficina.columnas);
      const porLaPuerta: string[] = [];
      for (let k = 0; k <= 400; k++) {
        const { v, y } = monedaEnLaEscalinata(k / 400);
        if (v + radio <= oficina.cuerpo.v0) continue;
        if (medioGrueso > oficina.puerta.u || y - radio < oficina.puerta.desde - 1e-6 || y + radio > oficina.puerta.hasta) porLaPuerta.push(`u ${r(k / 400)}: de ${r(y - radio)} a ${r(y + radio)}`);
      }
      comprobar(`entra por la puerta: cuando cruza la fachada cabe entera en el hueco (${coma(oficina.puerta.u * 2)} de ancho, de ${coma(oficina.puerta.desde)} a ${coma(oficina.puerta.hasta)})`, porLaPuerta.length === 0, porLaPuerta.slice(0, 3));
      const alFinal = monedaEnLaEscalinata(1);
      const alPrincipio = monedaEnLaEscalinata(0);
      comprobar(
        'y acaba entera dentro del cuerpo, que es lo que la esconde',
        alFinal.v - radio >= oficina.cuerpo.v0 && alFinal.y + radio <= oficina.cuerpo.hasta && medioGrueso <= oficina.cuerpo.u,
        { borde: r(alFinal.v - radio), fachada: oficina.cuerpo.v0 },
      );
      comprobar(
        `empieza en el suelo y sin pisar el nombre: su borde en ${coma(alPrincipio.v - radio)}, y el nombre acaba en ${coma(vDelFinalDelNombre(CASILLA_DE_LA_OFICINA))}`,
        Math.abs(alPrincipio.y - radio) < 1e-9 && alPrincipio.v - radio >= vDelFinalDelNombre(CASILLA_DE_LA_OFICINA) + HUECO_ENTRE_RENGLONES && Math.abs(RECORRIDO_DE_LA_MONEDA.desde - alPrincipio.v) < 1e-9,
      );
      comprobar(
        'rueda sin deslizar: lo girado crece siempre y al final es lo andado por el eje entre el radio, más que la distancia en llano',
        [0.1, 0.3, 0.5, 0.7, 0.9, 1].every((u, k, us) => k === 0 || monedaEnLaEscalinata(u).rodado > monedaEnLaEscalinata(us[k - 1] as number).rodado) &&
          alFinal.rodado > (alFinal.v - alPrincipio.v) / radio,
      );
      /* La pieza: un sólido convexo alrededor de su eje, con todas las caras hacia fuera. */
      const carasDeLaMoneda = carasDeLaMonedaDeLaRecaudacion();
      const haciaDentro = carasDeLaMoneda.filter((cara) => {
        const [a, b, c] = cara.puntos;
        const n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
        const puntos = cara.puntos.slice(0, esTriangulo(cara) ? 3 : 4);
        const centro = [0, 1, 2].map((i) => puntos.reduce((s, q) => s + (q[i] as number), 0) / puntos.length);
        return (n[0] as number) * (centro[0] as number) + (n[1] as number) * (centro[1] as number) + (n[2] as number) * (centro[2] as number) <= 1e-9;
      });
      comprobar(`la moneda es un sólido bien vuelto: sus ${String(carasDeLaMoneda.length)} caras miran hacia fuera de su eje`, carasDeLaMoneda.length > 0 && haciaDentro.length === 0, haciaDentro.length);
      /* Cuándo: sólo el Impuesto, y dentro del pago más corto. */
      const pagoDelImpuesto: Extract<SucesoDelBurgo, { que: 'paga' }> = { que: 'paga', quien: A, a: null, cuanto: 200, porque: 'diezmo', casilla: CASILLA_DE_LA_OFICINA };
      comprobar(
        'sólo la mueve pagar el Impuesto al Ayuntamiento: ni la Tasa, ni una renta, ni un Impuesto que no vaya al Ayuntamiento, ni un cobro',
        esRecaudacion(pagoDelImpuesto) &&
          !esRecaudacion({ ...pagoDelImpuesto, porque: 'alcabala' }) &&
          !esRecaudacion({ ...pagoDelImpuesto, porque: 'renta' as never }) &&
          !esRecaudacion({ ...pagoDelImpuesto, a: 'asiento-b' }) &&
          !esRecaudacion({ que: 'cobra', quien: A, de: null, cuanto: 200, porque: 'diezmo', casilla: CASILLA_DE_LA_OFICINA }),
      );
      const pagoMasCorto = duracionDelDinero(1);
      comprobar(
        `rueda de ${coma(RECAUDACION.empieza)} a ${coma(RECAUDACION.empieza + RECAUDACION.rueda)} s, dentro del pago más corto (${coma(pagoMasCorto)} s), y fuera de esa ventana no se ve`,
        RECAUDACION.empieza + RECAUDACION.rueda <= pagoMasCorto &&
          momentoDeLaRecaudacion(RECAUDACION.empieza - 0.01) === null &&
          momentoDeLaRecaudacion(RECAUDACION.empieza + RECAUDACION.rueda + 1e-6) === null &&
          (momentoDeLaRecaudacion(RECAUDACION.empieza + 0.3)?.escala ?? 0) === 1 &&
          (momentoDeLaRecaudacion(RECAUDACION.empieza)?.escala ?? 1) === 0,
      );
    }

    /*
     * EL HUMO DE LA CENTRAL Y LA ONDA DEL CANAL.
     *
     * Suenan con la renta de su casilla y con nada más; salen de donde tienen que salir —el humo de
     * la BOCA de la chimenea, no de su pie; la onda del centro del agua, por debajo del borde de la
     * alberca y sin salirse del agua al abrirse del todo—, empiezan y acaban donde dicen, y caben en
     * la renta más corta.
     */
    {
      const renta = (casilla: number): SucesoDelBurgo => ({ que: 'paga', quien: A, a: 'asiento-b', cuanto: 8, porque: 'renta', casilla });
      comprobar(
        'el humo sólo lo suelta la renta de la Luz y la onda sólo la del Agua: ni la otra, ni un cobro, ni un pago que no sea renta',
        esRentaDe(renta(CASILLA_DE_LA_CENTRAL), CASILLA_DE_LA_CENTRAL) &&
          esRentaDe(renta(CASILLA_DEL_CANAL), CASILLA_DEL_CANAL) &&
          !esRentaDe(renta(CASILLA_DEL_CANAL), CASILLA_DE_LA_CENTRAL) &&
          !esRentaDe({ que: 'cobra', quien: A, de: 'asiento-b', cuanto: 8, porque: 'renta', casilla: CASILLA_DE_LA_CENTRAL }, CASILLA_DE_LA_CENTRAL) &&
          !esRentaDe({ que: 'paga', quien: A, a: null, cuanto: 150, porque: 'compra', casilla: CASILLA_DE_LA_CENTRAL }, CASILLA_DE_LA_CENTRAL),
      );
      const ultima = BOCANADAS_DEL_HUMO_EN_EL_COMPROBADOR - 1;
      const alAcabar = bocanadaDelHumo(0, HUMO.dura - 1e-6);
      comprobar(
        `las ${String(BOCANADAS_DEL_HUMO_EN_EL_COMPROBADOR)} bocanadas salen escalonadas, crecen, se deshacen del todo y caben en la renta más corta (${String(r(duracionDelHumo())).replace('.', ',')} de ${String(r(duracionDelDinero(1))).replace('.', ',')} s)`,
        bocanadaDelHumo(0, -0.01) === null &&
          bocanadaDelHumo(1, HUMO.escalon - 0.01) === null &&
          bocanadaDelHumo(ultima, ultima * HUMO.escalon + HUMO.dura) === null &&
          Math.abs((bocanadaDelHumo(0, 0)?.lado ?? 0) - HUMO.ladoAlSalir) < 1e-9 &&
          (bocanadaDelHumo(0, HUMO.dura * 0.66)?.lado ?? 0) > HUMO.ladoAlSalir &&
          alAcabar !== null &&
          alAcabar.lado < 0.01 &&
          [0.1, 0.2, 0.3, 0.4, 0.5].every((t, k, ts) => k === 0 || (bocanadaDelHumo(0, t)?.sube ?? 0) > (bocanadaDelHumo(0, ts[k - 1] as number)?.sube ?? 0)) &&
          duracionDelHumo() <= duracionDelDinero(1),
      );
      comprobar(
        'la onda se abre de un quinto a entera en su ventana, y fuera no está',
        ondaDelAgua(-0.01) === null && ondaDelAgua(ONDA_DEL_AGUA.dura) === null && Math.abs((ondaDelAgua(0) ?? 0) - ONDA_DEL_AGUA.desde) < 1e-9 && (ondaDelAgua(ONDA_DEL_AGUA.dura - 1e-6) ?? 0) > 0.999 && ONDA_DEL_AGUA.dura <= duracionDelDinero(1),
      );
      /* De dónde sale el humo: la boca es lo más alto de la chimenea. */
      const chimenea = bocaDeLaChimenea();
      const deLaChimenea = carasDeLaObraEnElMundo(CASILLA_DE_LA_CENTRAL).filter((cara) => cara.puntos.every((q) => Math.hypot(q[0] - chimenea.x, q[2] - chimenea.z) < 2));
      const bocaMedida = Math.max(...deLaChimenea.flatMap((cara) => cara.puntos.map((q) => q[1])));
      comprobar(`el humo sale de la boca de la chimenea (a ${String(bocaMedida).replace('.', ',')}) y no de su pie`, deLaChimenea.length > 8 && Math.abs(bocaMedida - chimenea.y) < 1e-9, { caras: deLaChimenea.length, bocaMedida, sale: chimenea.y });
      /* Dónde se abre la onda: dentro del agua y por debajo del borde. */
      const alberca = centroDeLaAlberca();
      const caraDelAgua = carasDeLaObraEnElMundo(CASILLA_DEL_CANAL).find((cara) => cara.color === COLOR_DE_OBRA.agua);
      const cabeLaOnda = (radio: number): boolean => {
        if (caraDelAgua === undefined) return false;
        const xs = caraDelAgua.puntos.map((q) => q[0]);
        const zs = caraDelAgua.puntos.map((q) => q[2]);
        return alberca.x - radio >= Math.min(...xs) && alberca.x + radio <= Math.max(...xs) && alberca.z - radio >= Math.min(...zs) && alberca.z + radio <= Math.max(...zs);
      };
      const aguaY = caraDelAgua?.puntos[0][1] ?? Number.NaN;
      const bordeY = Math.max(
        ...carasDeLaObraEnElMundo(CASILLA_DEL_CANAL)
          .filter((cara) => cara.color === COLOR_DE_OBRA.hormigon && cara.puntos.every((q) => Math.hypot(q[0] - alberca.x, q[2] - alberca.z) < 12))
          .flatMap((cara) => cara.puntos.map((q) => q[1])),
      );
      comprobar(
        `la onda se abre en el centro del agua, por encima de ella y por debajo del borde, y abierta del todo (radio ${String(ONDA_DEL_CANAL.radio).replace('.', ',')}) no se sale del agua`,
        caraDelAgua !== undefined && cabeLaOnda(ONDA_DEL_CANAL.radio) && alberca.y > aguaY && alberca.y < aguaY + 0.1 && alberca.y < bordeY,
        { aguaY, sale: alberca.y, bordeY },
      );
      comprobar('se ve fallar: una onda de radio 6 ya se saldría del agua', !cabeLaOnda(6));
    }
  }

  /*
   * La vacuna de la vía es la cuenta que se hizo mal dos veces: el punto más adentro de una curva
   * no es `eje − 0,293 r`, es eso MENOS el medio ancho del balasto en diagonal. Con los números de
   * la primera versión —radio 40, balasto 13— sale por debajo del tablero, y con los de hoy no.
   */
  const masAdentro = (radio: number, balasto: number): number => VIA.eje - 0.2929 * radio - 0.7071 * (balasto / 2);
  comprobar(
    `se ve fallar: con el radio 40 y el balasto 13 de la primera versión, la vía entraba a ${masAdentro(40, 13).toFixed(1)} del centro y el tablero acaba en ${String(MEDIO_LADO)}`,
    masAdentro(40, 13) < MEDIO_LADO && masAdentro(VIA.radioDeCurva, VIA.balasto) > MEDIO_LADO,
    { antes: masAdentro(40, 13), ahora: masAdentro(VIA.radioDeCurva, VIA.balasto) },
  );
  comprobar('se ve fallar: un punto a 435 en una esquina estaría fuera, y el cuadro acaba en 432', 435 > MEDIO_LADO);

  /*
   * La rejilla va POR CASILLA y no sobre la huella de todas juntas: con dos esquinas amuebladas
   * en extremos opuestos del anillo, una huella única cubre medio tablero y casi todos los rayos
   * caen en el vacío —se vio: 29 de 289—. Una regla que mira veintinueve rayos no es la lupa
   * que se quiso escribir.
   */
  const RAYOS = 17;
  const miradaCenital = (voltearLaDeArriba: boolean): { rayos: number; alReves: number } => {
    let rayos = 0;
    let alReves = 0;
    for (const { caras } of carasDeObraPorCasilla) {
      if (caras.length === 0) continue;
      const huella = {
        x0: Math.min(...caras.map((c) => c.x0)),
        x1: Math.max(...caras.map((c) => c.x1)),
        z0: Math.min(...caras.map((c) => c.z0)),
        z1: Math.max(...caras.map((c) => c.z1)),
      };
      for (let i = 0; i < RAYOS; i++) {
        for (let j = 0; j < RAYOS; j++) {
          const x = huella.x0 + ((huella.x1 - huella.x0) * (i + 0.5)) / RAYOS;
          const z = huella.z0 + ((huella.z1 - huella.z0) * (j + 0.5)) / RAYOS;
          let mejor: (typeof caras)[number] | null = null;
          for (const cara of caras) {
            if (!cara.horizontal) continue;
            if (x < cara.x0 || x > cara.x1 || z < cara.z0 || z > cara.z1) continue;
            if (mejor === null || cara.y > mejor.y) mejor = cara;
          }
          if (mejor === null) continue;
          rayos++;
          const normal = voltearLaDeArriba ? -mejor.normalY : mejor.normalY;
          if (normal <= 0) alReves++;
        }
      }
    }
    return { rayos, alReves };
  };
  const cenital = miradaCenital(false);
  comprobar(`la lupa cenital de las obras ha mirado ${String(cenital.rayos)} rayos sobre ${String(carasDeObraPorCasilla.length)} casillas, y no cero`, cenital.rayos >= 200 && carasDeObraPorCasilla.length >= 2, { rayos: cenital.rayos, casillas: carasDeObraPorCasilla.length });
  comprobar('y ninguna de las caras que se ven desde arriba está del revés', cenital.alReves === 0, cenital.alReves);
  comprobar('se ve fallar: con la de arriba volteada, la lupa las caza todas', miradaCenital(true).alReves === cenital.rayos);

  /*
   * LO QUE ESTÁ DENTRO DE UN HUECO SE VE DESDE ARRIBA.
   *
   * La lupa de arriba pregunta si lo primero que se ve mira arriba, y no QUÉ es: el agua de la
   * alberca del Canal estuvo a 1,15 debajo de la tapa de hormigón de su propia caja, a 1,40, y la
   * lupa daba verde porque la tapa miraba arriba como debe. Desde el aire, la «alberca con agua» era
   * un bloque gris. Así que las superficies que existen para verse dentro de algo —el agua, las
   * bocas oscuras de las torres de la central— se miran con rayos EXACTOS, triángulo a triángulo,
   * y lo primero que corta cada rayo tiene que ser de su color.
   */
  {
    type CaraEnElMundoDeObra = ReturnType<typeof carasDeLaObraEnElMundo>[number];
    const primeraDesdeArriba = (caras: readonly CaraEnElMundoDeObra[], x: number, z: number): string | null => {
      let mejorY = Number.NEGATIVE_INFINITY;
      let color: string | null = null;
      for (const cara of caras) {
        const [a, b, c, d] = cara.puntos;
        const esTri = c[0] === d[0] && c[1] === d[1] && c[2] === d[2];
        for (const [t0, t1, t2] of esTri ? [[a, b, c] as const] : [[a, b, c] as const, [a, c, d] as const]) {
          const ux = t1[0] - t0[0];
          const uz = t1[2] - t0[2];
          const wx = t2[0] - t0[0];
          const wz = t2[2] - t0[2];
          const det = ux * wz - uz * wx;
          if (Math.abs(det) < 1e-9) continue;
          const s = ((x - t0[0]) * wz - (z - t0[2]) * wx) / det;
          const t = ((z - t0[2]) * ux - (x - t0[0]) * uz) / det;
          if (s < 0 || t < 0 || s + t > 1) continue;
          const y = t0[1] + s * (t1[1] - t0[1]) + t * (t2[1] - t0[1]);
          if (y > mejorY) {
            mejorY = y;
            color = cara.color;
          }
        }
      }
      return color;
    };
    /* La parte de una superficie que se ve: rayos por dentro de su huella, a `margen` de sus bordes. */
    const loQueSeVeDe = (caras: readonly CaraEnElMundoDeObra[], color: string): { readonly rayos: number; readonly vistos: number } => {
      let rayos = 0;
      let vistos = 0;
      for (const cara of caras.filter((x) => x.color === color)) {
        const [a, b, c, d] = cara.puntos;
        const esTri = c[0] === d[0] && c[1] === d[1] && c[2] === d[2];
        const vertices = esTri ? [a, b, c] : [a, b, c, d];
        const centro = { x: vertices.reduce((s, q) => s + q[0], 0) / vertices.length, z: vertices.reduce((s, q) => s + q[2], 0) / vertices.length };
        /* Hacia el centro de la cara desde cada vértice, al 30 % y al 70 %: dentro y lejos del borde. */
        for (const q of vertices) {
          for (const f of [0.3, 0.7]) {
            rayos++;
            if (primeraDesdeArriba(caras, centro.x + (q[0] - centro.x) * f, centro.z + (q[2] - centro.z) * f) === color) vistos++;
          }
        }
      }
      return { rayos, vistos };
    };
    const delCanal = carasDeLaObraEnElMundo(28);
    const deLaCentral = carasDeLaObraEnElMundo(12);
    const agua = loQueSeVeDe(delCanal, COLOR_DE_OBRA.agua);
    const bocas = loQueSeVeDe(deLaCentral, COLOR_DE_OBRA.boca);
    comprobar(
      `el agua de la alberca y las bocas de las torres se ven desde arriba: ${String(agua.vistos)} de ${String(agua.rayos)} y ${String(bocas.vistos)} de ${String(bocas.rayos)} rayos dan primero en ellas`,
      agua.rayos >= 8 && agua.vistos === agua.rayos && bocas.rayos >= 16 && bocas.vistos === bocas.rayos,
      { agua, bocas },
    );
    /* La vacuna es la alberca de antes: una tapa de hormigón un cuarto por encima del agua. */
    const conTapa = delCanal.flatMap((cara) =>
      cara.color !== COLOR_DE_OBRA.agua ? [cara] : [cara, { color: COLOR_DE_OBRA.hormigon, puntos: cara.puntos.map((q) => [q[0], q[1] + 0.25, q[2]] as const) as unknown as CaraEnElMundoDeObra['puntos'] }],
    );
    comprobar('se ve fallar: con la tapa de hormigón por encima, como estuvo, el agua no se ve en ningún rayo', loQueSeVeDe(conTapa, COLOR_DE_OBRA.agua).vistos === 0);
  }

  /*
   * Y LO QUE UNA OBRA PONE EN EL SUELO DE UNA ESQUINA NO QUEDA DEBAJO DE UNA PIEZA DE SUELO DEL PACK.
   *
   * Pasó en la 10 y en la 30 cuando iban llenas de `solera` y `calzada`, que suben a 0,6: el patio de
   * hormigón de la cárcel y el suelo de la celda de la comisaría estaban a 0,05, y el patio no se veía
   * nada y la celda salía mitad losa de acera. Se subieron por encima del empedrado; y después el
   * empedrado se fue entero, porque Miguel quitó la calle de las dos esquinas para que se leyera el
   * texto, y los dos volvieron a ras. La regla sigue mirando las cuatro esquinas, con las cajas de
   * verdad de las piezas de suelo del `burgo.glb`, por si alguien vuelve a empedrar una.
   */
  {
    type PiezaDeSuelo = { readonly esquina: number; readonly pieza: NombreDePieza; readonly u: number; readonly v: number; readonly giroEnCuartos: number; readonly alza?: number };
    let losasMiradas = 0;
    const tapadasPorElEmpedrado = (caras: readonly { readonly casilla: number; readonly puntos: readonly (readonly number[])[] }[], extra: readonly PiezaDeSuelo[] = []): string[] => {
      const salida: string[] = [];
      losasMiradas = 0;
      for (const esquina of ESQUINAS) {
        const suelos = [...(PIEZAS_DE_LA_ESQUINA[esquina] ?? []).map((pieza) => ({ ...pieza, esquina })), ...extra.filter((x) => x.esquina === esquina)]
          .filter((pieza) => esSuelo(pieza.pieza))
          .map((pieza) => {
            const h = huella(pieza.pieza);
            const ancho = pieza.giroEnCuartos % 2 === 0 ? h.ancho : h.fondo;
            const fondo = pieza.giroEnCuartos % 2 === 0 ? h.fondo : h.ancho;
            return { u0: pieza.u - ancho / 2, u1: pieza.u + ancho / 2, v0: pieza.v - fondo / 2, v1: pieza.v + fondo / 2, arriba: (pieza.alza ?? 0) + caja(pieza.pieza).max[1] };
          });
        for (const cara of caras.filter((x) => x.casilla === esquina)) {
          const ys = cara.puntos.map((q) => q[1] as number);
          const y = ys[0] as number;
          if (Math.max(...ys) - Math.min(...ys) > 1e-6 || y <= 0.001) continue;
          const us = cara.puntos.map((q) => q[0] as number);
          const vs = cara.puntos.map((q) => q[2] as number);
          const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
          if ((u1 - u0) * (v1 - v0) < 1) continue;
          losasMiradas++;
          const tapada = suelos
            .filter((suelo) => suelo.arriba > y + 1e-3)
            .reduce((area, suelo) => area + Math.max(0, Math.min(u1, suelo.u1) - Math.max(u0, suelo.u0)) * Math.max(0, Math.min(v1, suelo.v1) - Math.max(v0, suelo.v0)), 0);
          if (tapada > 0.01) salida.push(`${String(esquina)}: la losa a ${String(y)} de ${String(r(u0))}..${String(r(u1))} × ${String(r(v0))}..${String(r(v1))} tiene ${String(r(tapada))} debajo del empedrado`);
        }
      }
      return salida;
    };
    const tapadas = tapadasPorElEmpedrado(carasDeLasObras());
    comprobar(`ninguna de las ${String(losasMiradas)} losas de obra de las esquinas queda debajo de una pieza de suelo del pack`, tapadas.length === 0 && losasMiradas > 20, tapadas.slice(0, 3));
    /* La vacuna: la solera que tuvo el patio de la cárcel, en su celda (6, 6), vuelta a poner. */
    const conLaSoleraDeAntes = tapadasPorElEmpedrado(carasDeLasObras(), [{ esquina: 10, pieza: PIEZA.solera, u: celdaDeEsquina(6), v: celdaDeEsquina(6), giroEnCuartos: 0 }]);
    comprobar('se ve fallar: con la solera que tuvo el patio de la cárcel vuelta a su celda, el patio queda debajo', conLaSoleraDeAntes.some((x) => x.startsWith('10:')), conLaSoleraDeAntes);
  }

  comprobar('y avanza hacia −(fuera + adelante), que es la derecha de quien mira una esquina desde su diagonal', delRevesEnEsquina.length === 0, delRevesEnEsquina);
  /*
   * LAS DOS VACUNAS. La primera es la palabra que NO cabe: `altoDelRotuloDeEsquina` tiene que encogerla
   * hasta que `ancho + alto` quepa en la diagonal, y si alguien vuelve a escribir la cuenta con
   * el lado, una palabra larga se sale. La segunda es que la regla de arriba sepa ver un rombo
   * desbordado, con la misma cuenta y un alto imposible.
   */
  const larga = 'ESTACIONAMIENTO';
  const altoLargo = altoDelRotuloDeEsquina(larga);
  comprobar(
    `se ve fallar: «${larga}» se encoge a ${altoLargo.toFixed(1)} para que ancho + alto quepan en la diagonal`,
    anchoDeLaPalabra(larga, altoLargo) + altoLargo <= LADO_DEL_SUELO_DE_LA_ESQUINA * Math.SQRT2 && altoLargo < altoDelRotuloDeEsquina('SALIDA'),
    { alto: altoLargo, ancho: anchoDeLaPalabra(larga, altoLargo) },
  );
  comprobar('y se ve fallar la otra: una letra de 60 de alto en el centro desborda el rombo y la cuenta lo dice', 60 / Math.SQRT2 + 60 / Math.SQRT2 > medioRombo);

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
paso('A pie por el Burgo: el paseo común con el mundo de la mesa, de qué sitio se nace, a qué altura, cuánta ciudad, la mesa de siempre y los muros del estadio');
// ---------------------------------------------------------------------------

/*
 * ═══ QUÉ SE COMPRA AQUÍ ═══
 *
 * El Burgo se anda con el paseo COMÚN de `escenas/paseo/` —el mismo de Las Lindes— sobre el mundo
 * que declara `mundoDelBurgo(código)`. Nada de eso falla solo si se hace mal: un paseo propio con su
 * paso anda igual de bien en la pantalla mientras el servidor valida con otro; un sitio de nacer
 * repetido pone a dos en el mismo punto; una altura mal sacada deja la figura flotando sobre el
 * asfalto; y la ciudad entera en detalle a ras de calle hunde el móvil sin un error. Y lo que no puede
 * cambiar es la cámara de MESA, que es la de siempre y con la que se juega.
 *
 * Los jueces de fuente miran el CÓDIGO (sin comentarios) de la escena y de los dos clientes; los de
 * aritmética corren las funciones puras de `a-pie.ts` contra el `.glb` real, el anillo que se pinta,
 * la ciudad de varias mesas y el presupuesto de la escena. Cada uno se ve caer.
 */
{
  const aPie = await import('../burgo/a-pie');
  const laCiudadDelBurgo = await import('../burgo/ciudad');
  const elMundo = await import('../../shared/arcade/juegos/burgo-mundo');
  const laArena = await import('../../shared/mecanicas/mundo');
  const { RADIO_DEL_PASEANTE } = await import('../../shared/mecanicas/andar');
  const anillo = await import('../burgo/anillo-en-3d');
  const { cajaDelDistrito } = await import('../../shared/arcade/juegos/burgo-distritos');
  const escena = sinComentarios(fs.readFileSync(path.join(CARPETA, 'Burgo.tsx'), 'utf8'));
  const laApp = sinComentarios(fs.readFileSync(path.join(RAIZ, '../app/src/arcade/burgo-en-tres-escena.tsx'), 'utf8'));
  const elEscritorio = sinComentarios(fs.readFileSync(path.join(RAIZ, '../escritorio/src/burgo-en-tres.tsx'), 'utf8'));

  /* ── 1. EL PASEO ES EL COMÚN, CON EL MUNDO DE LA MESA, Y NINGUNO PROPIO ── */
  /*
   * Las cinco claves se miran SUELTAS dentro de la llamada y no como una lista cerrada: el canal de
   * Boots on Board entró aquí igual que en Las Lindes —con un `alDarUnTic` más en esta misma llamada—,
   * y un juez que lo tumbara por eso habría enseñado a no conectarlo. Que esté cosido de verdad, y que
   * los demás se pinten con esta misma altura, lo mira `verify:canal-del-paseo` en los tres juegos;
   * aquí, que el paseo sea el común con el canal y sin él.
   */
  const laLlamadaDelPaseo = (c: string): string => /const paseo = usarElPaseo\(\{([\s\S]*?)\}\);/.exec(c)?.[1] ?? '';
  const usaElComun = (c: string): boolean =>
    /import \{ usarElPaseo \} from '\.\.\/paseo\/usar-el-paseo';/.test(c) &&
    (c.match(/\busarElPaseo\(/g) ?? []).length === 1 &&
    ['mundo: mundoAPie,', 'nace: naceQuienAnda,', 'modo: modoDelPaseo,', 'mandos: props.mandos,', 'alturaEn: alturaDelSuelo,'].every((clave) => laLlamadaDelPaseo(c).includes(clave)) &&
    /import \{ mundoDelBurgo \} from '\.\.\/\.\.\/shared\/arcade\/juegos\/burgo-mundo';/.test(c) &&
    /const deLaMesa = mundoDelBurgo\(codigo\);/.test(c) &&
    /if \(!aPie\) return null;/.test(c);
  comprobar('la escena anda con `usarElPaseo` —una sola vez— y le da el mundo de `mundoDelBurgo(codigo)`, sólo a pie, con la palanca de `props.mandos` y la altura del suelo', usaElComun(escena));
  comprobar(
    'se ve fallar: con el mundo sacado de otra parte, o con un segundo paseo montado, cae',
    !usaElComun(escena.replace('const deLaMesa = mundoDelBurgo(codigo);', 'const deLaMesa = mundoDeLaSemilla(1);')) &&
      !usaElComun(`${escena}\nconst otro = usarElPaseo({ mundo: null, nace: null, modo: 'mesa', alturaEn: () => 0 });`) &&
      !usaElComun(escena.replace('mundo: mundoAPie,', 'mundo: null,')),
  );
  const sinElCanal = escena.replace(/\n\s*alDarUnTic: elCanal\.alDarUnTic,/, '');
  comprobar(
    'y el juez mira el paseo y no el canal: con el canal cosido —como está— y sin él —la mesa de siempre— sigue en verde, y quitárselo cambia la llamada de verdad',
    usaElComun(escena) && sinElCanal !== escena && usaElComun(sinElCanal),
  );
  /* Lo que sería un paseo propio: el paso, el reloj, las teclas o la arena escritos o llamados en `escenas/burgo/`. */
  const PASEO_PROPIO = /\b(pasoDelTic|unPaso|fotogramaDelPaseo|ticsDelFotograma|nacerEnElPaseo|teclaDelPaseo|mandosDelFotograma|arenaDe|sePuedeEstar)\s*\(/;
  const conPaseoPropio = FICHEROS.filter((f) => PASEO_PROPIO.test(sinComentarios(fs.readFileSync(f, 'utf8')))).map((f) => path.basename(f));
  comprobar('ningún fichero de escenas/burgo da un paso, cuenta tics, lee teclas ni deriva una arena por su cuenta: el paseo es el común', conPaseoPropio.length === 0, conPaseoPropio);
  comprobar('se ve fallar: una escena que diera su propio `pasoDelTic` lo enciende', PASEO_PROPIO.test(`${escena}\nconst p = pasoDelTic(arena, quien, 0, 1);`));
  comprobar(
    'y quien anda es la marioneta común, sólo a pie, con la pose del paseo, sin pintarse desde sus ojos y con la figura de su asiento',
    /\{aPie \? \(\s*<QuienAnda\b[\s\S]*?pose=\{paseo\.pose\}[\s\S]*?enPrimeraPersona=\{modoDelPaseo === 'ojos'\}[\s\S]*?\/>\s*\) : null\}/.test(escena) &&
      /const figuraQueAnda = tablero\.figuras\.find\(\(f\) => f\.asiento === quienAnda\)\?\.figura;/.test(escena) &&
      /import \{ QuienAnda \} from '\.\.\/paseo\/quien-anda';/.test(escena),
  );
  comprobar(
    'y la figura que no llega se dice por consola y NO por `alFallar`: el escritorio mandaría la partida entera al tablero dibujado',
    /alFallar=\{avisaQueNoLlegaQuienAnda\}/.test(escena) && /function avisaQueNoLlegaQuienAnda\(motivo: string\): void \{\s*console\.warn\(/.test(escena),
  );

  /* ── 2. LA MESA ES LA DE SIEMPRE, Y A PIE LA CÁMARA ES DEL PASEO LA ESCRIBA QUIEN LA ESCRIBA ── */
  const modosBien =
    aPie.modoDelPaseoDe({ modo: 'mesa' }) === 'mesa' &&
    aPie.modoDelPaseoDe({ modo: 'aerea' }) === 'mesa' &&
    aPie.modoDelPaseoDe({ modo: 'hombro', asiento: 's1' }) === 'hombro' &&
    aPie.modoDelPaseoDe({ modo: 'ojos', asiento: 's1' }) === 'ojos' &&
    aPie.asientoQueAnda({ modo: 'ojos', asiento: 's3' }) === 's3' &&
    aPie.asientoQueAnda({ modo: 'mesa' }) === '';
  comprobar('la mesa —y `aerea`, su nombre viejo— no anda; hombro y ojos andan con el asiento que traen', modosBien);
  const laMesaDeSiempre = (c: string): boolean => {
    const guarda = c.search(/useFrame\(\(s\) => \{\s*if \(!aPie\) return;\s*camaraDelPaseo\.current\.posicion\.copy\(s\.camera\.position\);\s*camaraDelPaseo\.current\.giro\.copy\(s\.camera\.quaternion\);\s*\}, -1\);/);
    const reponeEn = c.search(/if \(!aPie\) return;\s*s\.camera\.position\.copy\(camaraDelPaseo\.current\.posicion\);\s*s\.camera\.quaternion\.copy\(camaraDelPaseo\.current\.giro\);/);
    const elPaseo = c.indexOf('const paseo = usarElPaseo(');
    const elFotograma = c.indexOf('const losAsientos = asientosRef.current;');
    return (
      elPaseo > 0 &&
      guarda > elPaseo &&
      reponeEn > guarda &&
      elFotograma > reponeEn &&
      /const sg = seguimiento\.current;/.test(c) &&
      /useFrame\(\(s, dtCrudo\) => \{\s*if \(aPie\) return;\s*const dt = Math\.min\(0\.1, Math\.max\(0, dtCrudo\)\);\s*const ahora = s\.clock\.elapsedTime;\s*const cam = s\.camera as THREE\.PerspectiveCamera;\s*const sg = seguimiento\.current;/.test(c) &&
      /n\.near = aPie \? NIEBLA_A_PIE\.cerca : mesa\.cerca;\s*n\.far = aPie \? NIEBLA_A_PIE\.lejos : mesa\.lejos;/.test(c) &&
      /aPie \? UMBRALES_A_PIE\[c\.ciudad\.calidad\] : undefined\)/.test(c) &&
      /if \(aPie \|\| !plena \|\| !INTERRUPTORES_DEL_BANCO\.interiores/.test(c)
    );
  };
  comprobar(
    'en la mesa todo es lo de siempre —el seguimiento, la niebla, los umbrales y los interiores—; a pie, la cámara que el paseo pone se guarda con −1 DETRÁS de él y se repone en un `useFrame` que corre ANTES del fotograma que la lee',
    laMesaDeSiempre(escena),
  );
  comprobar(
    'se ve fallar: con el fotograma que lee la cámara ANTES de reponerla —el reparto de la ciudad la leería del cliente—, o con el seguimiento corriendo a pie, cae',
    !laMesaDeSiempre(escena.replace('const losAsientos = asientosRef.current;', '').replace('const paseo = usarElPaseo(', 'const losAsientos = asientosRef.current;\n  const paseo = usarElPaseo(')) &&
      !laMesaDeSiempre(escena.replace(/useFrame\(\(s, dtCrudo\) => \{\s*if \(aPie\) return;/, 'useFrame((s, dtCrudo) => {')),
  );
  comprobar(
    'los dos clientes siguen montando su cámara de mesa ANTES que `<Burgo>` —la app su ojo y el escritorio `CamaraAerea`—, y le pasan la cámara con su modo y el asiento de quien mira',
    laApp.indexOf('<ElOjoDelBurgo mirador={mirador} cercania={cercania} />') > 0 &&
      laApp.indexOf('<ElOjoDelBurgo') < laApp.indexOf('<Burgo\n') &&
      /const CAMARA_DE_MESA: ModoDeCamara = \{ modo: 'mesa' \};/.test(laApp) &&
      /modo === 'mesa' \? CAMARA_DE_MESA : \{ modo, asiento: yo \?\? '' \}/.test(laApp) &&
      /camara=\{camara\}\s*mandos=\{mandos\}/.test(laApp) &&
      elEscritorio.indexOf('<CamaraAerea') > 0 &&
      elEscritorio.indexOf('<CamaraAerea') < elEscritorio.indexOf('<Burgo\n') &&
      /modo === 'mesa' \? \{ modo: 'mesa' \} : \{ modo, asiento: yo \?\? '' \}/.test(elEscritorio) &&
      /camara=\{camara\}/.test(elEscritorio) &&
      !/modo: 'aerea'/.test(laApp) &&
      !/modo: 'aerea'/.test(elEscritorio),
  );

  /* ── 3. DE QUÉ SITIO SE NACE ── */
  const CODIGOS_A_PIE = ['QWXYZ', '', '39KG2', 'B4RGK', 'M7NPT'];
  const sentados = (n: number): { asiento: string }[] => Array.from({ length: n }, (_, k) => ({ asiento: `s${String(k + 1)}` }));
  type Elige = typeof aPie.sitioDeNacerEnElBurgo;
  /** Lo que tiene de malo un reparto de sitios de nacer, con la función que se le dé. */
  const malNacidos = (elige: Elige): unknown[] => {
    const malos: unknown[] = [];
    for (const codigo of CODIGOS_A_PIE) {
      const mundo = elMundo.mundoDelBurgo(codigo);
      const arena = laArena.arenaDe(mundo);
      const seis = sentados(6);
      const sitios = seis.map((s) => elige(mundo.nace, seis, s.asiento));
      if (sitios.some((s, k) => s !== mundo.nace[k])) malos.push({ codigo, que: 'el asiento k no nace en el sitio k del mundo' });
      if (new Set(sitios).size !== 6) malos.push({ codigo, que: 'dos asientos en el mismo sitio' });
      for (const s of sitios) {
        if (s === null) continue;
        if (!laArena.sePuedeEstar(arena, Math.round(s.x * 65536) | 0, Math.round(s.z * 65536) | 0, RADIO_DEL_PASEANTE)) malos.push({ codigo, que: 'no se cabe donde se nace', s });
      }
      if (elige(mundo.nace, seis, 'miron') !== mundo.nace[6]) malos.push({ codigo, que: 'quien mira sin asiento no nace en el siguiente libre' });
      const ocho = sentados(8);
      if (new Set(ocho.map((s) => elige(mundo.nace, ocho, s.asiento))).size !== 8) malos.push({ codigo, que: 'ocho asientos no nacen en ocho sitios' });
    }
    return malos;
  };
  const puertas = sentados(4).map((s) => aPie.sitioDeNacerEnElBurgo(elMundo.NACE_EN_EL_BURGO, sentados(4), s.asiento));
  comprobar(
    `en ${String(CODIGOS_A_PIE.length)} mesas, cada asiento nace en el sitio de su orden —los cuatro primeros, las cuatro Puertas—, en un sitio donde se cabe, ninguno repetido, y quien mira sin asiento en el siguiente libre`,
    malNacidos(aPie.sitioDeNacerEnElBurgo).length === 0 && puertas.every((p, k) => p === elMundo.NACE_EN_EL_BURGO[k]) && aPie.sitioDeNacerEnElBurgo([], sentados(2), 's1') === null,
    malNacidos(aPie.sitioDeNacerEnElBurgo).slice(0, 4),
  );
  comprobar('se ve fallar: naciendo todos en el primer sitio, seis se pisan en el mismo punto y el juez lo dice en todas las mesas', malNacidos((nace) => nace[0] ?? null).length >= CODIGOS_A_PIE.length);
  comprobar('y la escena nace con ESA función, con las figuras de la vista y el asiento de quien anda', /sitioDeNacerEnElBurgo\(mundoAPie\.nace, tablero\.figuras, quienAnda\)/.test(escena));

  /* ── 4. A QUÉ ALTURA ESTÁ EL SUELO QUE SE PINTA ── */
  /* 4a. El anillo: el centro y cuatro puntos de dentro de cada cuadro de suelo, contra la cota a la que se pinta. */
  const PAPELES_QUE_SE_PISAN = new Set(['franja', 'filete', 'superficie', 'borde', 'esquina']);
  const cuadrosMal = (alturaEn: (x: number, z: number) => number): number => {
    let mal = 0;
    for (let i = 0; i < CASILLAS; i++) {
      for (const q of suelosDeLaCasilla(i)) {
        if (!PAPELES_QUE_SE_PISAN.has(q.papel)) continue;
        const cx = q.puntos.reduce((a, p) => a + p[0], 0) / 4;
        const cz = q.puntos.reduce((a, p) => a + p[2], 0) / 4;
        const y = (q.puntos[0] as readonly [number, number, number])[1];
        for (const p of [[cx, cz], ...q.puntos.map((v) => [cx + (v[0] - cx) * 0.9, cz + (v[2] - cz) * 0.9])] as [number, number][]) {
          /* Encima de la raya que separa dos casillas, que va más alta y mide 0,9, no se mira: es una raya. */
          const m = marcoDeCasilla(i);
          const u = (p[0] - m.centro.x) * m.adelante.x + (p[1] - m.centro.z) * m.adelante.z;
          if (!m.esEsquina && Math.abs(Math.abs(u) - ANCHO_DE_CASILLA / 2) < 0.5) continue;
          if (Math.abs(alturaEn(p[0], p[1]) - y) > 1e-9) mal++;
        }
      }
    }
    return mal;
  };
  comprobar('en las cuarenta casillas, la altura a pie es la del cuadro de suelo que se pinta: la franja a 0,60, el filete a 0,20, la superficie a 0 y el marco a 0,30', cuadrosMal(aPie.alturaEnElAnillo) === 0, cuadrosMal(aPie.alturaEnElAnillo));
  comprobar('se ve fallar: con la franja del barrio a ras de suelo, las cuarenta casillas lo dicen', cuadrosMal((x, z) => (Math.max(Math.abs(x), Math.abs(z)) < anillo.FRANJA.hasta && Math.min(Math.abs(x), Math.abs(z)) < anillo.BORDE_INTERIOR ? 0 : aPie.alturaEnElAnillo(x, z))) >= 40);

  /* 4b. Las seis losas de calle: el modelo de bordillo contra la superficie de arriba del `.glb`, rasterizada. */
  const trianglesDeLaLosa = (nombre: string): (readonly [number, number, number])[][] => {
    const raiz = raices.find((r) => r.getName() === nombre);
    const caras: (readonly [number, number, number])[][] = [];
    const anda = (n: Node): void => {
      const malla = n.getMesh();
      if (malla !== null) {
        for (const prim of malla.listPrimitives()) {
          const pos = prim.getAttribute('POSITION');
          if (pos === null) continue;
          const idx = prim.getIndices();
          const m = n.getWorldMatrix();
          const v = [0, 0, 0];
          const punto = (i: number): [number, number, number] => porLaMatriz(m, pos.getElement(i, v));
          const cuenta = idx?.getCount() ?? pos.getCount();
          for (let k = 0; k < cuenta; k += 3) caras.push([punto(idx === null ? k : idx.getScalar(k)), punto(idx === null ? k + 1 : idx.getScalar(k + 1)), punto(idx === null ? k + 2 : idx.getScalar(k + 2))]);
        }
      }
      for (const h of n.listChildren()) anda(h);
    };
    if (raiz !== undefined) anda(raiz);
    return caras;
  };
  const alturaRasterizada = (caras: readonly (readonly [number, number, number])[][], px: number, pz: number): number => {
    let alto = -1;
    for (const t of caras) {
      const [p0, p1, p2] = t as [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];
      const d = (p1[0] - p0[0]) * (p2[2] - p0[2]) - (p2[0] - p0[0]) * (p1[2] - p0[2]);
      if (Math.abs(d) < 1e-9) continue;
      const u = ((px - p0[0]) * (p2[2] - p0[2]) - (p2[0] - p0[0]) * (pz - p0[2])) / d;
      const w = ((p1[0] - p0[0]) * (pz - p0[2]) - (px - p0[0]) * (p1[2] - p0[2])) / d;
      if (u < -1e-6 || w < -1e-6 || u + w > 1 + 1e-6) continue;
      const y = p0[1] + u * (p1[1] - p0[1]) + w * (p2[1] - p0[1]);
      if (y > alto) alto = y;
    }
    return alto;
  };
  const MEDIO_ESCALON = (laCiudadDelBurgo.ALTURA_DEL_ASFALTO + laCiudadDelBurgo.ALTURA_DEL_BORDILLO) / 2;
  const PUNTOS_POR_LADO = 48;
  const acierto = (modelo: (abiertas: number, u: number, v: number) => number): { peor: number; porLosa: string[] } => {
    let peor = 1;
    const porLosa: string[] = [];
    for (const nombre of Object.keys(laCiudadDelBurgo.CARAS_ABIERTAS)) {
      /* Sin girar: las caras de la tabla y, si es la curva suave, su marca. Es lo que la escena guarda por celda. */
      const abiertas = aPie.carasQueSePintan(nombre, 0);
      const caras = trianglesDeLaLosa(nombre);
      let bien = 0;
      let total = 0;
      for (let a = 0; a < PUNTOS_POR_LADO; a++) {
        for (let b = 0; b < PUNTOS_POR_LADO; b++) {
          const x = -RETICULA_DE_LA_CIUDAD / 2 + ((a + 0.5) * RETICULA_DE_LA_CIUDAD) / PUNTOS_POR_LADO;
          const z = -RETICULA_DE_LA_CIUDAD / 2 + ((b + 0.5) * RETICULA_DE_LA_CIUDAD) / PUNTOS_POR_LADO;
          const real = alturaRasterizada(caras, x, z);
          if (real < 0) continue;
          total++;
          if (real > MEDIO_ESCALON === modelo(abiertas, x, z) > MEDIO_ESCALON) bien++;
        }
      }
      const parte = total === 0 ? 0 : bien / total;
      peor = Math.min(peor, parte);
      porLosa.push(`${nombre} ${(100 * parte).toFixed(1)} %`);
    }
    return { peor, porLosa };
  };
  const conBordillo = acierto(aPie.alturaEnLaLosa);
  console.log(`  el bordillo de a pie contra el .glb rasterizado (${String(PUNTOS_POR_LADO)} × ${String(PUNTOS_POR_LADO)} por losa): ${conBordillo.porLosa.join(' · ')}`);
  comprobar('en las seis losas de calle, el asfalto y el bordillo de a pie caen donde los pone el `.glb`, en el 97 % de los puntos de la peor', conBordillo.peor >= 0.97, conBordillo.porLosa);
  const sinBordillo = acierto(() => laCiudadDelBurgo.ALTURA_DEL_ASFALTO);
  comprobar('se ve fallar: con la losa entera de asfalto, sin bordillo, la peor baja del 97 %', sinBordillo.peor < 0.97, sinBordillo.porLosa);
  const sinArco = acierto((abiertas, u, v) => aPie.alturaEnLaLosa(abiertas & ~aPie.CURVA_SUAVE, u, v));
  comprobar('y con la curva suave doblando en ángulo recto, como las demás, también', sinArco.peor < 0.97, sinArco.porLosa);

  /* 4c. La ciudad: los sitios de nacer, las calles, las aceras, el puente y el andén, en varias mesas. */
  const alturasMal: unknown[] = [];
  let puentesMirados = 0;
  let andenesMirados = 0;
  for (const codigo of CODIGOS_A_PIE) {
    const ciudad = laCiudadDelBurgo.ciudadDelCodigo(codigo, laCiudadDelBurgo.RECINTO_DEL_BURGO, 'plena');
    const suelo = aPie.sueloDelBurgo(ciudad);
    const nace = elMundo.NACE_EN_EL_BURGO;
    for (let k = 0; k < 4; k++) {
      const s = nace[k] as { x: number; z: number };
      if (suelo(s.x, s.z) !== anillo.ALTURA_DEL_FILETE) alturasMal.push({ codigo, sitio: k, que: 'la Puerta no está en el filete', y: suelo(s.x, s.z) });
    }
    for (let k = 4; k < 8; k++) {
      const s = nace[k] as { x: number; z: number };
      if (suelo(s.x, s.z) !== laCiudadDelBurgo.ALTURA_DEL_ASFALTO) alturasMal.push({ codigo, sitio: k, que: 'el brazo de la glorieta no está en el asfalto', y: suelo(s.x, s.z) });
    }
    for (const celda of ciudad.celdas) {
      const esperada = laCiudadDelBurgo.esClaseDeCalle(celda.clase) ? laCiudadDelBurgo.ALTURA_DEL_ASFALTO : laCiudadDelBurgo.ALTURA_DEL_BORDILLO;
      const dada = suelo(celda.x, celda.z);
      /* Lo que se levanta encima (el andén, un puente, un forjado) sólo puede SUBIR la cota de su celda. */
      if (dada < esperada || (laCiudadDelBurgo.esClaseDeCalle(celda.clase) && dada !== esperada)) alturasMal.push({ codigo, celda: [celda.i, celda.j], clase: celda.clase, dada, esperada });
    }
    for (const b of ciudad.fachadas) {
      if (b.clase !== 'puente' && b.clase !== 'anden') continue;
      const cota = b.y + b.alto;
      if (suelo(b.x, b.z) !== cota) alturasMal.push({ codigo, que: `el ${b.clase} no se pisa a su cota`, dada: suelo(b.x, b.z), cota });
      if (b.clase === 'puente') puentesMirados++;
      else andenesMirados++;
    }
  }
  comprobar(
    `en ${String(CODIGOS_A_PIE.length)} mesas: se nace en las Puertas a la cota del filete y en la glorieta a la del asfalto, cada calle a la del asfalto en su centro, cada acera, parcela y distrito a la del bordillo o más, y ${String(puentesMirados)} puentes y ${String(andenesMirados)} andenes se pisan por encima`,
    alturasMal.length === 0 && puentesMirados > 0 && andenesMirados > 0,
    alturasMal.slice(0, 4),
  );
  {
    const ciudad = laCiudadDelBurgo.ciudadDelCodigo('QWXYZ', laCiudadDelBurgo.RECINTO_DEL_BURGO, 'plena');
    const puente = ciudad.fachadas.find((b) => b.clase === 'puente');
    const sinPuentes = aPie.sueloDelBurgo({ ...ciudad, fachadas: ciudad.fachadas.filter((b) => b.clase !== 'puente') });
    comprobar('se ve fallar: sin mirar lo que se levanta del suelo, un puente se pisa a la cota de la calle y la figura se hunde en su tablero', puente !== undefined && sinPuentes(puente.x, puente.z) < puente.y + puente.alto);
    const forjadoDeArriba = ciudad.fachadas.find((b) => b.clase === 'forjado' && b.y > aPie.TECHO_DE_UN_SUELO);
    comprobar('y un forjado de las plantas de arriba de la obra no es suelo: se pasa por debajo', forjadoDeArriba !== undefined && aPie.sueloDelBurgo(ciudad)(forjadoDeArriba.x, forjadoDeArriba.z) < forjadoDeArriba.y);
  }
  comprobar('y la escena le da al paseo ESA altura, derivada sólo a pie', /const alturaDelSuelo = useMemo\(\(\) => \(aPie \? sueloDelBurgo\(ciudad\) : SIN_SUELO\), \[aPie, ciudad\]\);/.test(escena));

  /* ── 5. CUÁNTA CIUDAD SE MONTA A PIE, CONTRA EL PRESUPUESTO QUE YA TENÍA LA ESCENA ── */
  comprobar('a pie, el L2 llega hasta donde llega la niebla y no más: más allá no se ve nada', aPie.UMBRALES_A_PIE.plena.medio === aPie.NIEBLA_A_PIE.lejos && aPie.UMBRALES_A_PIE.sobria.medio === aPie.NIEBLA_A_PIE.lejos && aPie.NIEBLA_A_PIE.cerca < aPie.NIEBLA_A_PIE.lejos);
  const peorAPie = (calidad: 'plena' | 'sobria', umbrales: { readonly alto: number; readonly medio: number } | undefined): { peor: number; donde: string } => {
    let peor = 0;
    let donde = '';
    for (const codigo of CODIGOS_A_PIE.slice(0, 4)) {
      const ciudad = laCiudadDelBurgo.ciudadDelCodigo(codigo, laCiudadDelBurgo.RECINTO_DEL_BURGO, calidad);
      const arena = laArena.arenaDe(elMundo.mundoDelBurgo(codigo));
      const rutas = ciudad.coches.rutas.reduce((a, r) => a + laCiudadDelBurgo.triangulosDe(r.pieza), 0);
      for (let x = -426; x <= 426; x += 12) {
        for (let z = -426; z <= 426; z += 12) {
          if (!laArena.sePuedeEstar(arena, Math.round(x * 65536) | 0, Math.round(z * 65536) | 0, RADIO_DEL_PASEANTE)) continue;
          const t = laCiudadDelBurgo.montarLaCiudad(ciudad, x, z, undefined, umbrales).triangulos + rutas;
          if (t > peor) {
            peor = t;
            donde = `${codigo === '' ? 'portada' : codigo} (${String(x)}, ${String(z)})`;
          }
        }
      }
    }
    return { peor, donde };
  };
  const plenaAPie = peorAPie('plena', aPie.UMBRALES_A_PIE.plena);
  const sobriaAPie = peorAPie('sobria', aPie.UMBRALES_A_PIE.sobria);
  console.log(
    `  a pie, lo más que se monta de ciudad donde se puede estar: plena ${String(plenaAPie.peor)} de ${String(laCiudadDelBurgo.TOPE_DE_LA_CIUDAD.plena)} en ${plenaAPie.donde} · sobria ${String(sobriaAPie.peor)} de ${String(laCiudadDelBurgo.TOPE_DE_LA_CIUDAD.sobria)} en ${sobriaAPie.donde}`,
  );
  comprobar(
    `a pie, en ${String(CODIGOS_A_PIE.slice(0, 4).length)} mesas y en cada punto andable de doce en doce, la ciudad montada cabe en el presupuesto de la escena en las dos calidades`,
    plenaAPie.peor <= laCiudadDelBurgo.TOPE_DE_LA_CIUDAD.plena && sobriaAPie.peor <= laCiudadDelBurgo.TOPE_DE_LA_CIUDAD.sobria && plenaAPie.peor > 0 && sobriaAPie.peor > 0,
    { plena: plenaAPie, sobria: sobriaAPie },
  );
  const sobriaConLosDeLaMesa = peorAPie('sobria', undefined);
  comprobar(
    `se ve fallar: a pie con los umbrales de la mesa, la sobria monta ${String(sobriaConLosDeLaMesa.peor)} y NO cabe en ${String(laCiudadDelBurgo.TOPE_DE_LA_CIUDAD.sobria)} —por eso a pie hay otros—`,
    sobriaConLosDeLaMesa.peor > laCiudadDelBurgo.TOPE_DE_LA_CIUDAD.sobria,
    sobriaConLosDeLaMesa,
  );

  /* ── 6. NINGÚN MURO DEL ESTADIO CRUZA UNA CALLE: lo que se PINTA, en las dos calidades ── */
  const murosQueCruzan = (ciudad: ReturnType<typeof laCiudadDelBurgo.ciudadDelCodigo>, muros: readonly ReturnType<typeof laCiudadDelBurgo.ciudadDelCodigo>['fachadas'][number][]): unknown[] => {
    const d = ciudad.distritos.find((x) => x.nombre === 'estadio');
    if (d === undefined) return [{ que: 'sin estadio' }];
    const caja = cajaDelDistrito(ciudad.recinto, d);
    const malos: unknown[] = [];
    for (const b of muros) {
      const c = Math.cos(b.giro);
      const s = Math.sin(b.giro);
      const xs = [-1, 1].flatMap((i) => [-1, 1].map((j) => b.x + ((i * b.ancho) / 2) * c + ((j * b.fondo) / 2) * s));
      const zs = [-1, 1].flatMap((i) => [-1, 1].map((j) => b.z - ((i * b.ancho) / 2) * s + ((j * b.fondo) / 2) * c));
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const z0 = Math.min(...zs);
      const z1 = Math.max(...zs);
      if (x0 < caja.x0 - 1e-6 || x1 > caja.x1 + 1e-6 || z0 < caja.z0 - 1e-6 || z1 > caja.z1 + 1e-6) malos.push({ que: 'se sale del distrito', caja: [r(x0), r(z0), r(x1), r(z1)] });
      for (const celda of ciudad.celdas) {
        if (!laCiudadDelBurgo.esClaseDeCalle(celda.clase)) continue;
        /* Con una millonésima de holgura: la caja sale de un seno y un coseno, y el muro va justo en el canto de su distrito. */
        const m = RETICULA_DE_LA_CIUDAD / 2 - 1e-6;
        if (x0 < celda.x + m && x1 > celda.x - m && z0 < celda.z + m && z1 > celda.z - m) {
          malos.push({ que: 'pisa una calle', celda: [celda.i, celda.j] });
          break;
        }
      }
    }
    return malos;
  };
  const murosDe = (ciudad: ReturnType<typeof laCiudadDelBurgo.ciudadDelCodigo>): ReturnType<typeof laCiudadDelBurgo.ciudadDelCodigo>['fachadas'][number][] => ciudad.fachadas.filter((b) => b.clase === 'cantil' && b.y === laCiudadDelBurgo.ALTURA_DEL_BORDILLO);
  const estadiosMal: unknown[] = [];
  let murosMirados = 0;
  let cruzabanAntes = 0;
  for (const codigo of CODIGOS_A_PIE) {
    for (const calidad of ['plena', 'sobria'] as const) {
      const ciudad = laCiudadDelBurgo.ciudadDelCodigo(codigo, laCiudadDelBurgo.RECINTO_DEL_BURGO, calidad);
      const muros = murosDe(ciudad);
      murosMirados += muros.length;
      if (muros.length !== 4) estadiosMal.push({ codigo, calidad, que: `${String(muros.length)} muros y no cuatro` });
      estadiosMal.push(...murosQueCruzan(ciudad, muros).map((m) => ({ codigo, calidad, ...(m as object) })));
      /* La cuenta de antes: a los que giran un número impar de cuartos se les cambiaban el ancho y el fondo. */
      const comoAntes = muros.map((b) => (Math.round(b.giro / (Math.PI / 2)) % 2 !== 0 ? { ...b, ancho: b.fondo, fondo: b.ancho } : b));
      cruzabanAntes += murosQueCruzan(ciudad, comoAntes).length;
    }
  }
  comprobar(`en ${String(CODIGOS_A_PIE.length)} mesas y en las dos calidades, los ${String(murosMirados)} muros del estadio que se PINTAN van dentro de su distrito y ninguno pisa una calle`, estadiosMal.length === 0 && murosMirados === CODIGOS_A_PIE.length * 2 * 4, estadiosMal.slice(0, 4));
  comprobar(`se ve fallar: con la cuenta de antes, girados dos veces, salen ${String(cruzabanAntes)} faltas —muros fuera del distrito y sobre la calle—`, cruzabanAntes >= CODIGOS_A_PIE.length * 2 * 2, cruzabanAntes);
}

// ---------------------------------------------------------------------------
paso('La niebla de la mesa se retira con el ojo: en un móvil en vertical el anillo no queda detrás de ella');
// ---------------------------------------------------------------------------

{
  /*
   * EL BURGO EN BLANCO (24-sep-2026). En la app publicada, el tablero se abría todo blanco en un
   * móvil en vertical, y ninguna comprobación lo veía: las de arriba miden que las cuatro esquinas
   * CAIGAN en el lienzo, y caían —detrás de la niebla—. En retrato el ojo se retira para que quepa el
   * ancho del anillo (de 3 a 4 veces lo de un monitor) y la niebla era fija, de 1.140 a 2.281
   * unidades: con el ojo a 2.766, un 100 % de niebla en el centro y en la esquina más cercana. Esto
   * mide lo que se VE al abrir el tablero, con la cuenta de la niebla lineal de three: cuánta
   * niebla cae sobre el centro del anillo y sobre su esquina más cercana, en los tres lienzos de
   * arriba y en tres móviles en vertical de verdad. Y trae su vacuna: con la niebla fija de la app
   * publicada, un móvil tiene que salir con el anillo entero detrás.
   */
  const LIENZOS = [
    ...VENTANAS,
    { nombre: 'móvil 390×600', ancho: 390, alto: 600 },
    { nombre: 'móvil 390×760', ancho: 390, alto: 760 },
    { nombre: 'móvil 412×640', ancho: 412, alto: 640 },
  ];
  /*
   * Un 25 %: un monitor de 16:9 tiene en el centro del tablero un 14 % desde la pose de salida —en
   * apaisado se retira un 20 % y corre la mirada hacia la cámara— y un 21 % desde la que se aparta de
   * la caja del escritorio, y así se ha jugado en el escritorio desde siempre. El fallo era un 100 %.
   */
  const TOPE_DE_NIEBLA_EN_LA_SALIDA = 0.25;
  /*
   * Desde las poses con las que abre de verdad cada cliente, y se queda la peor: la de salida, y la
   * que se aparta de la caja de los dados —abajo a la derecha en el escritorio, arriba en la app—.
   */
  const ESQUINAS_DE_LOS_CLIENTES = ['abajo-derecha', 'arriba-derecha'] as const;
  const nieblaEnLaSalida = (
    niebla: (proporcion: number) => { readonly cerca: number; readonly lejos: number },
  ): { readonly nombre: string; readonly centro: number; readonly esquina: number }[] =>
    LIENZOS.map((v) => {
      const ventana = { ancho: v.ancho, alto: v.alto, franjaInferior: 0 };
      const { cerca, lejos } = niebla(v.ancho / v.alto);
      const cercanias = [
        poseDeSalida(ventana),
        ...ESQUINAS_DE_LOS_CLIENTES.map((esquina) =>
          poseDeSalidaAlLadoDeLaCaja(ventana, poseDeLaBandeja(v.ancho, v.alto, CAMPO_DE_LA_CAMARA, { esquina, margen: 12 }).rectangulo),
        ),
      ];
      const medidas = cercanias.map((cercania) => {
        const ojo = poseDelBurgo(cercania, MIRADOR_DEL_BURGO, ventana).posicion;
        const cuanta = (x: number, z: number): number => {
          const d = Math.hypot(ojo.x - x, ojo.y, ojo.z - z);
          return Math.min(1, Math.max(0, (d - cerca) / (lejos - cerca)));
        };
        const esquina = Math.min(...[-MEDIO_LADO, MEDIO_LADO].flatMap((x) => [-MEDIO_LADO, MEDIO_LADO].map((z) => cuanta(x, z))));
        return { centro: cuanta(0, 0), esquina };
      });
      const peor = (que: 'centro' | 'esquina'): number => Math.round(Math.max(...medidas.map((m) => m[que])) * 100) / 100;
      return { nombre: v.nombre, centro: peor('centro'), esquina: peor('esquina') };
    });
  const conLaDeVerdad = nieblaEnLaSalida(nieblaDeLaMesa);
  comprobar(
    'desde las poses de salida de los dos clientes, en todos los lienzos —monitor, tableta y tres móviles en vertical— el centro del anillo y su esquina más cercana tienen como mucho un 25 % de niebla —la de un monitor—',
    conLaDeVerdad.every((m) => m.centro <= TOPE_DE_NIEBLA_EN_LA_SALIDA && m.esquina <= TOPE_DE_NIEBLA_EN_LA_SALIDA),
    conLaDeVerdad,
  );
  const enUnMonitor = nieblaDeLaMesa(16 / 9);
  comprobar(
    'y en un monitor la niebla es la de siempre: de dos a cuatro alcances',
    enUnMonitor.cerca === NIEBLA_DE_LA_MESA.cerca &&
      enUnMonitor.lejos === NIEBLA_DE_LA_MESA.lejos &&
      NIEBLA_DE_LA_MESA.cerca === ALCANCE_DEL_BURGO * 2 &&
      NIEBLA_DE_LA_MESA.lejos === ALCANCE_DEL_BURGO * 4,
    enUnMonitor,
  );
  const conLaFija = nieblaEnLaSalida(() => NIEBLA_DE_LA_MESA);
  comprobar(
    'se ve fallar: con la niebla fija —la de la app publicada—, un móvil en vertical tiene el anillo entero detrás de ella',
    conLaFija.some((m) => m.centro >= 1 && m.esquina >= 1),
    conLaFija,
  );
  const escenaDeLaNiebla = sinComentarios(fs.readFileSync(path.join(CARPETA, 'Burgo.tsx'), 'utf8'));
  comprobar(
    'y la escena la pone en cada fotograma con la proporción del LIENZO —la misma con la que se retira el ojo—, y a pie la de a pie',
    /const mesa = nieblaDeLaMesa\(s\.size\.width \/ Math\.max\(1, s\.size\.height\)\);\s*n\.near = aPie \? NIEBLA_A_PIE\.cerca : mesa\.cerca;\s*n\.far = aPie \? NIEBLA_A_PIE\.lejos : mesa\.lejos;/.test(escenaDeLaNiebla),
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
const COMPROBACIONES_ESCRITAS = 285;
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
      'la huella medida A SU TALLA —el peón mide 3,375 —y ya no la sexta parte de un dígito—, las\n' +
      'cuatro casas van seguidas con 1,66 de hueco y el hotel es un bloque de otro tamaño, no una casa—,\n' +
      'el frente de manzana de dos cuerpos no se sale ni pisa el carril del avatar, el\n' +
      'precio es el del reglamento y se lee en los mismos píxeles que antes porque creció con el tablero,\n' +
      'no queda una sola pieza medieval en el anillo, las cuatro esquinas son manzanas de nueve por nueve\n' +
      'celdas que no tocan la ele de la marcha, el campo es un manto continuo con las nubes fuera y el\n' +
      'claro del Concejo despejado, una casilla hipotecada lleva su precinto dentro de la franja y\n' +
      'leyéndose como su nombre, los dados, el dinero y el reloj de arena van en una caja pegada a la\n' +
      'pantalla que cabe en su esquina con los dados en el aire y se mira igual desde cualquiera, sin\n' +
      'nada escondido detrás de sus paredes, las cuatro avenidas de 48 entran encaradas a las casillas 5, 15,\n' +
      '25 y 35,\n' +
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
