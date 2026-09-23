/**
 * ¿EL MUNDO DE RIBERAS CAE BAJO LO QUE SE PINTA, SE ANDA COMO DICE, Y ES EL MISMO EN LOS DOS MOTORES?
 *
 *   npm run verify:riberas-mundo -w server
 *
 * (Hasta que quien integra dé de alta la línea en `server/package.json`, se corre con
 * `npx tsx scripts/verificar-riberas-mundo.ts` desde `server/`. Tarda un minuto: la mitad son las
 * tres partidas.)
 *
 * ═══ QUÉ AFIRMA, Y POR QUÉ CADA COSA ES DE LAS QUE NO DAN ERROR ═══
 *
 * `shared/arcade/juegos/riberas-mundo.ts` declara por dónde se anda en el delta. Todo lo que puede
 * ir mal ahí va mal EN SILENCIO: un mundo girado sesenta grados canoniza igual de bien, un vado
 * estrecho no lanza nada, una caja en `NaN` no choca con nadie. Así que cada escalón mira una de
 * esas cosas sobre VISTAS DE VERDAD —partidas jugadas por el reductor, con el árbitro delante— y
 * no sobre un tablero escrito a mano:
 *
 *  1. PARTIDAS. Tres mesas de 2, 4 y 6 colonos jugadas por un robot que tira, funda, alza, compra
 *     y juega cartas, sin atascarse. Con suelos: que haya chozas, torres, estiaje, y un quinto y un
 *     sexto colono con piezas (el traductor de la escena sólo pinta cuatro colores; el mundo no
 *     puede perder a los otros dos).
 *  2. EL MUNDO ES CONTRATO: canoniza, sale igual dos veces, y sale igual desde la vista de
 *     cualquier asiento y desde la del espectador —sólo lee lo público—.
 *  3. LA CORRESPONDENCIA HEXÁGONO → MUNDO ES LA DE LA ESCENA: los literales son los de
 *     `escenas/escala.ts` bit a bit; los 19 centros y los 54 vértices caen donde los pone
 *     `escenas/sitios.ts` (a milésimas); y las 2.736 teselas propias que pinta `crearRelieve`
 *     caen dentro de SU comarca declarada —con la vacuna de un mundo con la z del revés, que
 *     tiene que fallar—.
 *  4. TIERRA, VADO Y MAR HONDO: cada casilla de la arena se vuelve a clasificar con OTRA cuenta
 *     —el redondeo cúbico de la escena y la distancia euclídea a las comarcas— y tiene que
 *     cuadrar; y con suelos, contando cuántas hay de cada clase.
 *  5. LO QUE SE PINTA CAE SOBRE SUELO: ninguna esquina de ninguna tesela pintada cae en lo hondo
 *     (tres semillas de paisaje), lo firme no pisa mar pintado más de una apotema de tesela, y el
 *     vado no llega a donde la escena rompe las olas. Y las cajas cubren —justas— lo que la escena
 *     planta en cada vértice, medido sobre `tablero.glb`.
 *  6. DE TIERRA AL MAR: por las treinta orillas del delta, el paseante pisa el vado, allí anda
 *     EXACTAMENTE a la mitad —ni un tic entero en el agua ni uno a medias en tierra— y se para
 *     donde empieza lo hondo, sin pisarlo nunca.
 *  7. LAS CHOZAS, LAS TORRES Y EL ESTIAJE PARAN: andando hacia cada una, la caja SUYA le corta el
 *     paso, y nadie acaba nunca dentro de una caja.
 *  8. DÓNDE SE NACE: seis sitios, en tierra firme, fuera de toda caja, junto a lo suyo quien tiene
 *     algo, y mirando al centro del tablero.
 *  9. NODE Y HERMES: el mismo mundo y el mismo paseo, con los choques contados, en los dos motores.
 *
 * ═══ Y LOS SUELOS, QUE AQUÍ SON LA MITAD DEL COMPROBADOR ═══
 *
 * Un paseante que no toca nada da la misma huella en todos los motores; un mundo sin vado no
 * frena a nadie; una partida sin torres no prueba la caja de la ciudad. Cada escalón exige
 * haber visto lo que dice haber mirado, contado, antes de afirmar nada sobre ello.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import type { Node as NodoDelGlb } from '@gltf-transform/core';
import { abrirMesa, jugar } from '../src/arcade/arbitro';
import type { Mesa } from '../src/arcade/arbitro';
import '../../shared/arcade/juegos';
import {
  ACAPARAMIENTO,
  ALZAR,
  ANO_BUENO,
  COMPRAR,
  DESCARTAR,
  DOS_VEREDAS,
  EMPEZAR,
  FUNDAR,
  GUARDIA,
  MANIFIESTO_RIBERAS,
  MOVER_EL_ESTIAJE,
  opcionesDeRiberas,
  PASAR,
  proyectarRiberas,
  REVELAR,
  RIBERAS,
  TIRAR,
} from '../../shared/arcade/juegos/riberas';
import type { EstadoDeRiberas, Opcion } from '../../shared/arcade/juegos/riberas';
import {
  ANCHO_DEL_VADO,
  APOTEMA_DE_COMARCA,
  APOTEMA_DE_TESELA,
  CAJA_DE_LA_CIUDAD,
  CAJA_DEL_ESTIAJE,
  CAJA_DEL_POBLADO,
  centroEnElMundo,
  ensancheDeComarca,
  LADO_DE_CASILLA,
  mundoDeRiberas,
  NACIMIENTOS,
  RADIO_DE_COMARCA_EN_EL_MUNDO,
  RADIO_DE_TESELA_EN_EL_MUNDO,
  RAIZ_DE_TRES,
  rumboHacia,
  verticeEnElMundo,
} from '../../shared/arcade/juegos/riberas-mundo';
import type { CajaRelativa, PuntoDelMundo } from '../../shared/arcade/juegos/riberas-mundo';
import { enteroEntre, sembrar } from '../../shared/mecanicas/azar';
import type { Azar } from '../../shared/mecanicas/azar';
import { canonico, porQueNoEsCanonico } from '../../shared/mecanicas/canonico';
import { por, UNO } from '../../shared/mecanicas/fijo';
import {
  ANDANDO,
  COSENO,
  DT_DEL_TIC,
  pasoDelTic,
  radianesDelRumbo,
  RADIO_DEL_PASEANTE,
  rumboDeRadianes,
  SENO,
  VELOCIDAD_ANDANDO,
} from '../../shared/mecanicas/andar';
import { arenaDe, chocaConCuerpo, FIRME, hayPiso, NADA, sePuedeEstar, sueloEn, VADO } from '../../shared/mecanicas/mundo';
import type { Andante, Arena, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
import {
  distanciaHex,
  llaveDeHex,
  puntoDeVertice,
  vecino,
  verticeDeHex,
  verticesDe,
} from '../../shared/mecanicas/malla-hexagonal';
import type { Hex, LlaveDeVertice } from '../../shared/mecanicas/malla-hexagonal';
/*
 * LA ESCENA, abierta sólo por sus ficheros de aritmética: sin `three`, sin React y sin JSX. Es el
 * mismo permiso con el que `verify:riberas-en-tres` abre `escenas/sitios.ts`. Y es la mitad que
 * hay que contrastar: el mundo declarado sólo sirve si cae bajo ESTO.
 */
import { ESCALA_DEL_PACK, RADIO_DE_COMARCA, RADIO_DE_TESELA } from '../../escenas/escala';
import { sitiosDelTablero } from '../../escenas/sitios';
import { comarcaDeSubtesela, crearRelieve, hexDePunto } from '../../escenas/relieve';
import { piezasDeAsentamiento } from '../../escenas/asentamiento';
import { MAR_ADENTRO_DE_LOS_BARCOS } from '../../escenas/marina';
import { MODELO } from '../../escenas/nombres';
import { pasearRiberas } from './paseo-de-riberas';
import type { PaseoDeRiberas } from './paseo-de-riberas';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '..', '..');

const fallos: string[] = [];
let hechas = 0;

function comprobar(que: string, bien: boolean, detalle?: unknown): void {
  hechas++;
  if (bien) return;
  const cola = detalle === undefined ? '' : ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`;
  fallos.push(`${que}${cola.slice(0, 600)}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const aFijo = (v: number): number => Math.round(v * UNO) | 0;
const L = LADO_DE_CASILLA;
const W = ANCHO_DEL_VADO;
/** Lo que se mueve el centro de una casilla respecto de cualquier punto suyo, en ensanche. */
const REDONDEO = (L * (1 + RAIZ_DE_TRES)) / 4;

// ---------------------------------------------------------------------------
// ESCALÓN 1 · PARTIDAS DE VERDAD, JUGADAS POR EL REDUCTOR CON EL ÁRBITRO DELANTE
// ---------------------------------------------------------------------------

paso('Tres partidas de verdad, con el árbitro delante');

/** Una foto de la partida: el estado tal cual lo guarda la mesa, y quién está sentado. */
interface Foto {
  que: string;
  estado: EstadoDeRiberas;
  asientos: readonly string[];
}

/**
 * Cómo acabó una partida. `'tope'` y `'atascada'` NO son lo mismo, y confundirlos es el fallo del
 * bucle que decía jugar y no jugaba: una partida larga que llega al tope ha jugado de verdad; una
 * atascada se quedó sin nada que ofrecer a quien tenía el turno, y todo lo de debajo estaría
 * mirando un tablero a medio hacer.
 */
type ComoAcabo = 'terminada' | 'tope' | 'atascada';

interface Partida {
  nombre: string;
  asientos: readonly string[];
  fotos: Foto[];
  movimientos: number;
  acabo: ComoAcabo;
  cuenta: Map<string, number>;
}

function queAlza(o: Opcion): unknown {
  return (o.carga as { que?: unknown } | null)?.que;
}

/*
 * EL ROBOT: juega para GANAR y no para que el turno acabe (la lección del bucle que decía jugar
 * y no jugaba). Es la misma escalera de familias que el bucle de `verify:mesa`: tira siempre que
 * puede, revela títulos, alza torre, funda, compra y juega cartas, traza veredas y sólo pasa
 * cuando no queda otra. Sin comprar, medido: la mesa de seis acaparaba, tiraba 2.208 fichas en
 * descartes y no acababa en cuatro mil movimientos. No propone trueques: aquí interesa llenar el
 * delta de chozas y torres, que es lo que el mundo declara.
 */
const CARTAS_QUE_SE_JUEGAN: readonly string[] = [GUARDIA, ANO_BUENO, ACAPARAMIENTO, DOS_VEREDAS];
const PREFERENCIA: ReadonlyArray<{ nombre: string; es: (o: Opcion) => boolean }> = [
  { nombre: 'empezar', es: (o) => o.tipo === EMPEZAR },
  { nombre: 'descartar', es: (o) => o.tipo === DESCARTAR },
  { nombre: 'estiaje', es: (o) => o.tipo === MOVER_EL_ESTIAJE },
  { nombre: 'tirar', es: (o) => o.tipo === TIRAR },
  { nombre: 'revelar', es: (o) => o.tipo === REVELAR },
  { nombre: 'torre', es: (o) => o.tipo === ALZAR && queAlza(o) === 'torre' },
  { nombre: 'fundar', es: (o) => o.tipo === FUNDAR },
  { nombre: 'comprar', es: (o) => o.tipo === COMPRAR },
  { nombre: 'jugar-carta', es: (o) => CARTAS_QUE_SE_JUEGAN.indexOf(o.tipo) >= 0 },
  { nombre: 'vereda', es: (o) => o.tipo === ALZAR && queAlza(o) === 'vereda' },
  { nombre: 'pasar', es: (o) => o.tipo === PASAR },
];

const TOPE_DE_MOVIMIENTOS = 6000;
const A_MEDIA_PARTIDA = 120;

function jugarUnaPartida(nombre: string, asientos: readonly string[], semilla: number): Partida {
  let mesa: Mesa = abrirMesa({ id: nombre, arcade: RIBERAS, semilla, asientos });
  let azar: Azar = sembrar(semilla ^ 0x5eed);
  const fotos: Foto[] = [];
  const cuenta = new Map<string, number>();
  let movimientos = 0;
  let jugados = 0;
  let colocado = false;
  let acabo: ComoAcabo = 'tope';
  while (movimientos < TOPE_DE_MOVIMIENTOS) {
    const estado = mesa.estado as EstadoDeRiberas | undefined;
    if (estado?.momento === 'terminada') {
      acabo = 'terminada';
      break;
    }
    if (estado !== undefined && estado.momento === 'jugando' && !colocado) {
      colocado = true;
      fotos.push({ que: 'colocado', estado, asientos });
    }
    const quien = estado === undefined ? (asientos[0] as string) : proyectarRiberas(estado, null).turnoDe;
    if (quien === null) {
      acabo = 'atascada';
      break;
    }
    const opciones = opcionesDeRiberas(proyectarRiberas(estado, quien), quien).filter((o) => o.declaracion !== true);
    let elegida: Opcion | null = null;
    let familia = 'nada';
    for (const f of PREFERENCIA) {
      const caben = opciones.filter(f.es);
      if (caben.length === 0) continue;
      const tirada = enteroEntre(azar, 0, caben.length - 1);
      azar = tirada.azar;
      elegida = caben[tirada.valor] as Opcion;
      familia = f.nombre;
      break;
    }
    if (elegida === null) {
      acabo = 'atascada';
      break;
    }
    mesa = jugar(mesa, { quien, rev: mesa.rev, movimiento: { tipo: elegida.tipo, carga: elegida.carga } });
    movimientos++;
    cuenta.set(familia, (cuenta.get(familia) ?? 0) + 1);
    if (estado === undefined) fotos.push({ que: 'recién repartido', estado: mesa.estado as EstadoDeRiberas, asientos });
    if (colocado && ++jugados === A_MEDIA_PARTIDA) {
      fotos.push({ que: 'a media partida', estado: mesa.estado as EstadoDeRiberas, asientos });
    }
  }
  if ((mesa.estado as EstadoDeRiberas | undefined)?.momento === 'terminada') acabo = 'terminada';
  fotos.push({ que: 'al final', estado: mesa.estado as EstadoDeRiberas, asientos });
  return { nombre, asientos, fotos, movimientos, acabo, cuenta };
}

const partidas: Partida[] = [
  jugarUnaPartida('RIB-MUNDO-2', ['A', 'B'], 4242),
  jugarUnaPartida('RIB-MUNDO-4', ['A', 'B', 'C', 'D'], 90210),
  jugarUnaPartida('RIB-MUNDO-6', ['A', 'B', 'C', 'D', 'E', 'F'], 31337),
];

const todasLasFotos: Foto[] = [];
for (const p of partidas) {
  const finales = p.fotos[p.fotos.length - 1] as Foto;
  const chozas = finales.estado.colonos.reduce((s, c) => s + c.chozas.length, 0);
  const torres = finales.estado.colonos.reduce((s, c) => s + c.torres.length, 0);
  console.log(
    `  ${p.nombre}: ${String(p.movimientos)} movimientos · ${p.acabo} · ` +
      `${String(chozas)} chozas · ${String(torres)} torres · ${String(p.fotos.length)} fotos · ` +
      [...p.cuenta].map(([f, n]) => `${f} ${String(n)}`).join(', '),
  );
  comprobar(`${p.nombre}: el robot no se atasca: siempre hay algo que jugar para quien tiene el turno`, p.acabo !== 'atascada', {
    movimientos: p.movimientos,
  });
  comprobar(`${p.nombre}: hay foto recién repartida, colocada, a media partida y al final`, p.fotos.length === 4, p.fotos.map((f) => f.que));
  todasLasFotos.push(...p.fotos);
}
comprobar(
  'y alguna de las tres llega a ganador: el robot sabe acabar una partida',
  partidas.some((p) => p.acabo === 'terminada'),
  partidas.map((p) => p.acabo),
);

const finalesDe = partidas.map((p) => (p.fotos[p.fotos.length - 1] as Foto).estado);
const chozasAlFinal = finalesDe.reduce((s, e) => s + e.colonos.reduce((t, c) => t + c.chozas.length, 0), 0);
const torresAlFinal = finalesDe.reduce((s, e) => s + e.colonos.reduce((t, c) => t + c.torres.length, 0), 0);
comprobar('SUELO: al final hay al menos veinte chozas entre las tres mesas', chozasAlFinal >= 20, { chozasAlFinal });
comprobar('SUELO: y al menos cuatro torres, que es la caja que más asoma', torresAlFinal >= 4, { torresAlFinal });
{
  const seis = finalesDe[2] as EstadoDeRiberas;
  const quinto = seis.colonos[4];
  const sexto = seis.colonos[5];
  comprobar(
    'SUELO: el quinto y el sexto colono tienen piezas, que es lo que el traductor de cuatro colores perdería',
    quinto !== undefined && sexto !== undefined && quinto.chozas.length + quinto.torres.length > 0 && sexto.chozas.length + sexto.torres.length > 0,
  );
  comprobar('SUELO: hay estiaje en el tablero', seis.estiaje !== null);
}

/** La vista de un asiento —o del espectador, con `null`— de una foto. */
function vistaDe(f: Foto, quien: string | null): unknown {
  return proyectarRiberas(f.estado, quien);
}

// ---------------------------------------------------------------------------
// ESCALÓN 2 · EL MUNDO ES CONTRATO
// ---------------------------------------------------------------------------

paso('El mundo es contrato: canoniza, es determinista y sólo lee lo público');

let pesoMayor = 0;
for (const f of todasLasFotos) {
  const mundo = mundoDeRiberas(vistaDe(f, null));
  const porQue = porQueNoEsCanonico(mundo);
  comprobar(`${f.que}: el mundo canoniza`, porQue === null, porQue);
  if (porQue !== null) continue;
  const texto = canonico(mundo);
  pesoMayor = Math.max(pesoMayor, texto.length);
  comprobar(`${f.que}: y derivarlo otra vez da lo mismo`, canonico(mundoDeRiberas(vistaDe(f, null))) === texto);
  const distintos = f.asientos.filter((a) => canonico(mundoDeRiberas(vistaDe(f, a))) !== texto);
  comprobar(`${f.que}: y desde la vista de cada asiento sale el MISMO mundo que desde la del espectador`, distintos.length === 0, distintos);
  /* Una caja por choza y por torre de TODOS los colonos, más el estiaje: ni una más ni una menos. */
  const esperadas =
    f.estado.colonos.reduce((s, c) => s + c.chozas.length + c.torres.length, 0) + (f.estado.estiaje === null ? 0 : 1);
  comprobar(`${f.que}: una caja por choza, por torre y por el estiaje`, mundo.cuerpos.length === esperadas, {
    cuerpos: mundo.cuerpos.length,
    esperadas,
  });
}
console.log(`  el mundo más pesado son ${(pesoMayor / 1024).toFixed(1)} kB canonizado`);
comprobar('y canonizarlo da algo, no una cadena vacía', pesoMayor > 50_000, { pesoMayor });
{
  const reuniendo = mundoDeRiberas(proyectarRiberas(undefined, 'A'));
  comprobar(
    'una mesa que se está reuniendo no tiene delta, y su mundo está vacío: sin suelo no se recorre',
    reuniendo.pisables.length === 0 && reuniendo.vados.length === 0 && reuniendo.nace.length === 0,
  );
  comprobar('y lo que no es una vista de Riberas, también vacío', mundoDeRiberas({ desde: 'burgo' }).pisables.length === 0);
}

// ---------------------------------------------------------------------------
// ESCALÓN 3 · LA CORRESPONDENCIA HEXÁGONO → MUNDO ES LA DE LA ESCENA
// ---------------------------------------------------------------------------

paso('La correspondencia hexágono → mundo es la de la escena');

comprobar('√3 escrita es `Math.sqrt(3)` bit a bit', RAIZ_DE_TRES === Math.sqrt(3), RAIZ_DE_TRES);
comprobar('el radio de comarca es el de `escenas/escala.ts` bit a bit', RADIO_DE_COMARCA_EN_EL_MUNDO === RADIO_DE_COMARCA, {
  mundo: RADIO_DE_COMARCA_EN_EL_MUNDO,
  escena: RADIO_DE_COMARCA,
});
comprobar('el radio de tesela también', RADIO_DE_TESELA_EN_EL_MUNDO === RADIO_DE_TESELA);
comprobar('la apotema de tesela es la escala del pack', APOTEMA_DE_TESELA === ESCALA_DEL_PACK, {
  apotema: APOTEMA_DE_TESELA,
  escala: ESCALA_DEL_PACK,
});
comprobar(
  'y la apotema de comarca es R·√3/2',
  APOTEMA_DE_COMARCA === (RADIO_DE_COMARCA * Math.sqrt(3)) / 2,
  { escrita: APOTEMA_DE_COMARCA, cuenta: (RADIO_DE_COMARCA * Math.sqrt(3)) / 2 },
);

const primeraFoto = todasLasFotos[0] as Foto;
const islas: Hex[] = primeraFoto.estado.islas.map((i) => i.hex);
const esIsla = new Set(islas.map(llaveDeHex));
{
  /*
   * `sitiosDelTablero` es donde la escena resuelve centros y vértices a puntos del plano, y
   * `alMundo(p, h) = [p.x, h, p.y]` (`delta.tsx:390`) los tumba: la `y` del plano es la `z`.
   */
  const sitios = sitiosDelTablero(islas, () => 0);
  let peorCentro = 0;
  for (const s of sitios.comarcas) {
    const [q, r] = s.llave.split(',').map(Number) as [number, number];
    const m = centroEnElMundo({ q, r });
    peorCentro = Math.max(peorCentro, Math.abs(m.x - s.punto.x), Math.abs(m.z - s.punto.y));
  }
  let peorVertice = 0;
  for (const s of sitios.vertices) {
    const m = verticeEnElMundo(s.llave as LlaveDeVertice);
    peorVertice = Math.max(peorVertice, Math.abs(m.x - s.punto.x), Math.abs(m.z - s.punto.y));
  }
  console.log(`  ${String(sitios.comarcas.length)} centros y ${String(sitios.vertices.length)} vértices contra la escena · peor diferencia ${peorCentro.toExponential(1)} y ${peorVertice.toExponential(1)}`);
  comprobar('SUELO: se comparan los 19 centros y los 54 vértices', sitios.comarcas.length === 19 && sitios.vertices.length === 54);
  comprobar('los 19 centros de comarca caen donde los pone la escena, a milésimas', peorCentro < 1e-3, { peorCentro });
  comprobar('y los 54 vértices, donde la escena planta chozas y torres', peorVertice < 1e-3, { peorVertice });
}

/*
 * LAS TESELAS QUE PINTA LA ESCENA, contra las comarcas declaradas. Es la comprobación de la
 * orientación y del sentido de los ejes con el suelo de verdad: `delta.tsx:4120` planta cada
 * tesela en `(t.centro.x, cota, t.centro.y)`. Las 144 propias de cada comarca tienen que caer
 * DENTRO de su hexágono declarado; con la z del revés o con la punta de lado, no caen.
 */
const relieves = [0, 1, 7].map((semilla) =>
  crearRelieve(primeraFoto.estado.islas.map((i) => ({ hex: i.hex, terreno: i.terreno })), semilla),
);
{
  let propias = 0;
  let fueraDeLaSuya = 0;
  let conLaZDelReves = 0;
  let conLaPuntaDeLado = 0;
  for (const t of (relieves[0] as ReturnType<typeof crearRelieve>).todas()) {
    const suya = comarcaDeSubtesela(t.sub);
    if (suya.q !== t.comarca.q || suya.r !== t.comarca.r) continue;
    propias++;
    const c = centroEnElMundo(t.comarca);
    if (ensancheDeComarca(t.centro.x, t.centro.y, c) > 1e-9) fueraDeLaSuya++;
    /* LAS VACUNAS: el mismo suelo mal tumbado tiene que salirse de su comarca, y mucho. */
    if (ensancheDeComarca(t.centro.x, -t.centro.y, c) > 1e-9) conLaZDelReves++;
    if (ensancheDeComarca(t.centro.y, t.centro.x, c) > 1e-9) conLaPuntaDeLado++;
  }
  console.log(`  ${String(propias)} teselas propias · fuera de su comarca ${String(fueraDeLaSuya)} · con la z del revés ${String(conLaZDelReves)} · de lado ${String(conLaPuntaDeLado)}`);
  comprobar('SUELO: se miran las 2.736 teselas propias de las 19 comarcas', propias === 19 * 144, { propias });
  comprobar('cada tesela que la escena pinta cae dentro de SU comarca declarada', fueraDeLaSuya === 0, { fueraDeLaSuya });
  comprobar('VACUNA: con la z del revés se saldrían a miles, o sea que esto mira los ejes', conLaZDelReves > 1000, { conLaZDelReves });
  comprobar('VACUNA: y con la punta de lado también: esto mira la orientación', conLaPuntaDeLado > 1000, { conLaPuntaDeLado });
}

// ---------------------------------------------------------------------------
// ESCALÓN 4 · TIERRA, VADO Y MAR HONDO, CONTADOS Y CLASIFICADOS OTRA VEZ
// ---------------------------------------------------------------------------

paso('Tierra, vado y mar hondo: cada casilla, con otra cuenta');

/** Las seis esquinas de una comarca en el mundo, sacadas de la malla y no de la fórmula de arriba. */
function esquinasDe(h: Hex): PuntoDelMundo[] {
  const salida: PuntoDelMundo[] = [];
  for (let k = 0; k < 6; k++) {
    const p = puntoDeVertice(verticeDeHex(h, k), RADIO_DE_COMARCA);
    salida.push({ x: p.x, z: p.y });
  }
  return salida;
}
const esquinasDeLasIslas = islas.map(esquinasDe);

function alSegmento(p: PuntoDelMundo, a: PuntoDelMundo, b: PuntoDelMundo): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  let u = ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz);
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  return Math.hypot(a.x + u * dx - p.x, a.z + u * dz - p.z);
}

/** La distancia EUCLÍDEA de un punto a la raya de las comarcas más cercana. */
function aLaRaya(p: PuntoDelMundo): number {
  let m = Infinity;
  for (const es of esquinasDeLasIslas) for (let k = 0; k < 6; k++) m = Math.min(m, alSegmento(p, es[k] as PuntoDelMundo, es[(k + 1) % 6] as PuntoDelMundo));
  return m;
}

/** ¿Está en una comarca? Con el redondeo cúbico de la ESCENA (`relieve.ts:124`), no con semiplanos. */
function enUnaComarcaSegunLaEscena(p: PuntoDelMundo): boolean {
  return esIsla.has(llaveDeHex(hexDePunto({ x: p.x, y: p.z }, RADIO_DE_COMARCA)));
}

const mundoFinalDe6 = mundoDeRiberas(vistaDe(partidas[2]?.fotos[3] as Foto, null));
const arenaFinalDe6 = arenaDe(mundoFinalDe6);
{
  const a = arenaFinalDe6;
  let firmes = 0;
  let vados = 0;
  let hondas = 0;
  let enLaRaya = 0;
  const malas: string[] = [];
  for (let j = a.desdeY; j < a.desdeY + a.fondo; j++) {
    for (let i = a.desdeX; i < a.desdeX + a.anchura; i++) {
      const p = { x: i * L, z: -j * L };
      const suelo = sueloEn(a, aFijo(p.x), aFijo(p.z));
      if (suelo === FIRME) firmes++;
      else if (suelo === VADO) vados++;
      else hondas++;
      const dentro = enUnaComarcaSegunLaEscena(p);
      const raya = aLaRaya(p);
      /* En la raya misma las dos cuentas pueden discrepar por un bit, y las dos tienen razón. */
      if (raya < 1e-6) {
        enLaRaya++;
        continue;
      }
      if (suelo === FIRME) {
        if (!dentro) malas.push(`firme fuera de las comarcas en (${String(i)},${String(j)})`);
      } else if (suelo === VADO) {
        if (dentro) malas.push(`vado dentro de una comarca en (${String(i)},${String(j)})`);
        if (raya > (W * 2) / RAIZ_DE_TRES + 1e-6) malas.push(`vado a ${raya.toFixed(2)} de la raya`);
      } else {
        if (dentro) malas.push(`hondo dentro de una comarca en (${String(i)},${String(j)})`);
        if (raya <= W) malas.push(`hondo a sólo ${raya.toFixed(2)} de la raya en (${String(i)},${String(j)})`);
      }
    }
  }
  const esperadas = (19 * ((3 * Math.sqrt(3)) / 2) * RADIO_DE_COMARCA * RADIO_DE_COMARCA) / (L * L);
  console.log(
    `  firmes ${String(firmes)} (el área da ${esperadas.toFixed(0)}) · vado ${String(vados)} · hondas en el rectángulo ${String(hondas)} · ` +
      `centros justo en la raya ${String(enLaRaya)}`,
  );
  comprobar('cada casilla es lo que dicen el redondeo de la escena y la distancia a la raya', malas.length === 0, malas.slice(0, 6));
  comprobar('SUELO: las firmes son las del área de diecinueve comarcas, a un uno por ciento', Math.abs(firmes - esperadas) < esperadas * 0.01, { firmes, esperadas });
  comprobar('SUELO: hay vado, y no de adorno: más de mil casillas', vados > 1000, { vados });
  comprobar('SUELO: y hay mar hondo dentro del rectángulo de la arena', hondas > 500, { hondas });
  comprobar(
    'la arena tiene exactamente las firmes y los vados que el mundo declara',
    firmes === mundoFinalDe6.pisables.length && vados === mundoFinalDe6.vados.length,
    { firmes, pisables: mundoFinalDe6.pisables.length, vados, declarados: mundoFinalDe6.vados.length },
  );
  /* Y lejos, siempre hondo: el centro de cada comarca del anillo tres, que no existe. */
  let lejosEnTierra = 0;
  for (let k = 0; k < 6; k++) {
    let lejos: Hex = { q: 0, r: 0 };
    for (let n = 0; n < 3; n++) lejos = vecino(lejos, k);
    const c = centroEnElMundo(lejos);
    if (sueloEn(arenaFinalDe6, aFijo(c.x), aFijo(c.z)) !== NADA) lejosEnTierra++;
  }
  comprobar('las comarcas del anillo tres —que no existen— son mar hondo', lejosEnTierra === 0, { lejosEnTierra });
}

// ---------------------------------------------------------------------------
// ESCALÓN 5 · LO QUE SE PINTA CAE SOBRE SUELO, Y LAS CAJAS CUBREN LO QUE SE PLANTA
// ---------------------------------------------------------------------------

paso('Lo que la escena pinta cae sobre suelo, y las cajas cubren lo que planta');

{
  let muestras = 0;
  let enLoHondo = 0;
  let peor = '';
  let firmeSinPintar = 0;
  let masAdentro = 0;
  for (const relieve of relieves) {
    const pintadas = new Set<string>();
    for (const t of relieve.todas()) {
      pintadas.add(`${String(t.sub.q)},${String(t.sub.r)}`);
      const puntos = [t.centro];
      for (let k = 0; k < 6; k++) puntos.push(puntoDeVertice(verticeDeHex(t.sub, k), RADIO_DE_TESELA));
      for (const p of puntos) {
        muestras++;
        if (sueloEn(arenaFinalDe6, aFijo(p.x), aFijo(p.y)) === NADA) {
          enLoHondo++;
          peor = `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`;
        }
      }
    }
    /* Del otro lado: lo firme sobre mar pintado, que son los dientes de la costa. */
    for (const k of mundoFinalDe6.pisables) {
      const p = { x: k.x * L, z: -k.y * L };
      const t = hexDePunto({ x: p.x, y: p.z }, RADIO_DE_TESELA);
      if (pintadas.has(`${String(t.q)},${String(t.r)}`)) continue;
      firmeSinPintar++;
      let ensanche = Infinity;
      for (const h of islas) ensanche = Math.min(ensanche, ensancheDeComarca(p.x, p.z, centroEnElMundo(h)));
      masAdentro = Math.max(masAdentro, -ensanche);
    }
  }
  console.log(`  ${String(muestras)} esquinas y centros de tesela pintada · en lo hondo ${String(enLoHondo)} · firmes sin pintar debajo ${String(firmeSinPintar)}, la más adentro a ${masAdentro.toFixed(2)}`);
  comprobar('SUELO: se miran las teselas de tres paisajes, siete puntos cada una', muestras >= 3 * 2848 * 7, { muestras });
  comprobar('ninguna tesela pintada cae en lo hondo: el vado cubre el delantal', enLoHondo === 0, { enLoHondo, peor });
  comprobar(
    'y lo firme no se mete en el mar pintado más de una apotema de tesela: la orilla se aparta, el mundo no',
    masAdentro <= APOTEMA_DE_TESELA + 1e-9,
    { masAdentro, apotema: APOTEMA_DE_TESELA },
  );

  /*
   * Y LA COTA POR ARRIBA DEL VADO, contra la escena y no contra `ANCHO_DEL_VADO`: el mar pintado
   * rompe olas por fuera de la flota, desde `MAR_ADENTRO_DE_LOS_BARCOS` (`escenas/marina.ts`) de la
   * costa. Un vado que llegara hasta ahí haría vadear entre rompientes. Se mide desde el centro de
   * la tesela pintada más cercana, que es lo que ya hace `marina.ts` con sus barcos.
   */
  const centrosPintados = (relieves[0] as ReturnType<typeof crearRelieve>).todas().map((t) => t.centro);
  let vadoMasLejos = 0;
  for (const k of mundoFinalDe6.vados) {
    const p = { x: k.x * L, z: -k.y * L };
    let m = Infinity;
    for (const c of centrosPintados) {
      const d = (c.x - p.x) * (c.x - p.x) + (c.y - p.z) * (c.y - p.z);
      if (d < m) m = d;
    }
    vadoMasLejos = Math.max(vadoMasLejos, Math.sqrt(m));
  }
  console.log(`  la casilla de vado más lejana está a ${vadoMasLejos.toFixed(2)} de una tesela pintada; la ola rompe desde ${MAR_ADENTRO_DE_LOS_BARCOS.toFixed(2)}`);
  comprobar(
    'y el vado no llega a donde rompen las olas: todo él más cerca de lo pintado que la flota',
    vadoMasLejos > 0 && vadoMasLejos < MAR_ADENTRO_DE_LOS_BARCOS,
    { vadoMasLejos, rompeDesde: MAR_ADENTRO_DE_LOS_BARCOS },
  );
}

/*
 * LAS CAJAS, CONTRA EL `.glb`. Una tabla de medidas escrita a mano se queda vieja en silencio el
 * día que alguien recompila el pack; esto la vuelve a medir con `piezasDeAsentamiento` —la función
 * que coloca las piezas— y el giro de cada una, en los 54 vértices, como `verify:escena`.
 */
{
  const glb = path.join(REPO, 'escenas', 'modelos', 'tablero.glb');
  const documento = await new NodeIO().read(glb);
  const nodos = documento.getRoot().listNodes();
  const sinColor = (n: string): string => {
    for (const c of ['blue', 'red', 'green', 'yellow']) if (n.endsWith(`-${c}`)) return n.slice(0, -c.length - 1);
    return n;
  };
  const guardados = new Map<string, number[]>();
  const faltan: string[] = [];
  const puntosDe = (nombre: string): number[] => {
    const ya = guardados.get(nombre);
    if (ya !== undefined) return ya;
    const raiz = nodos.find((n) => n.getName() === sinColor(nombre));
    const salida: number[] = [];
    if (raiz === undefined) faltan.push(nombre);
    const bajar = (n: NodoDelGlb, tx: number, tz: number, s: number): void => {
      const t = n.getTranslation();
      const e = n.getScale();
      const px = tx + (t[0] as number) * s;
      const pz = tz + (t[2] as number) * s;
      const ss = s * Math.max(Math.abs(e[0] as number), Math.abs(e[2] as number));
      for (const prim of n.getMesh()?.listPrimitives() ?? []) {
        const pos = prim.getAttribute('POSITION');
        if (pos === null) continue;
        const v = [0, 0, 0];
        for (let i = 0; i < pos.getCount(); i++) {
          pos.getElement(i, v);
          salida.push(px + (v[0] as number) * ss, pz + (v[2] as number) * ss);
        }
      }
      for (const h of n.listChildren()) bajar(h, px, pz, ss);
    };
    if (raiz !== undefined) bajar(raiz, 0, 0, 1);
    guardados.set(nombre, salida);
    return salida;
  };
  const vertices = verticesDe(islas);
  /** La caja de lo que se planta en los 54 vértices, con el giro puesto y relativa al vértice. */
  const cajaMedida = (clase: 'poblado' | 'ciudad', sirve: (m: string) => boolean): { caja: CajaRelativa; puntos: number } => {
    let x0 = 0;
    let x1 = 0;
    let z0 = 0;
    let z1 = 0;
    let puntos = 0;
    for (const v of vertices) {
      for (const parte of piezasDeAsentamiento(clase, 'blue', v)) {
        if (!sirve(parte.modelo)) continue;
        const ps = puntosDe(parte.modelo);
        const escala = ESCALA_DEL_PACK * parte.talla;
        const cos = Math.cos(parte.giro);
        const sen = Math.sin(parte.giro);
        for (let i = 0; i < ps.length; i += 2) {
          const x = ps[i] as number;
          const z = ps[i + 1] as number;
          const wx = parte.donde.x + (x * cos + z * sen) * escala;
          const wz = parte.donde.y + (-x * sen + z * cos) * escala;
          x0 = Math.min(x0, wx);
          x1 = Math.max(x1, wx);
          z0 = Math.min(z0, wz);
          z1 = Math.max(z1, wz);
          puntos++;
        }
      }
    }
    return { caja: { x0, z0, x1, z1 }, puntos };
  };
  const esDelCaserio = (m: string): boolean => m === MODELO.casa || m === MODELO.pozo || m.startsWith('poblado');
  const esDelRecinto = (m: string): boolean => m.startsWith('muro') || m.startsWith('torre') || m.startsWith('ciudad');
  const poblado = cajaMedida('poblado', esDelCaserio);
  const ciudad = cajaMedida('ciudad', esDelRecinto);
  const tienda = puntosDe(MODELO.tienda);
  let tiendaX = 0;
  let tiendaZ = 0;
  for (let i = 0; i < tienda.length; i += 2) {
    tiendaX = Math.max(tiendaX, Math.abs(tienda[i] as number) * ESCALA_DEL_PACK * 3);
    tiendaZ = Math.max(tiendaZ, Math.abs(tienda[i + 1] as number) * ESCALA_DEL_PACK * 3);
  }
  const redondea = (c: CajaRelativa): string => `x ${c.x0.toFixed(2)}…${c.x1.toFixed(2)} · z ${c.z0.toFixed(2)}…${c.z1.toFixed(2)}`;
  console.log(`  medido en tablero.glb: poblado ${redondea(poblado.caja)} · ciudad ${redondea(ciudad.caja)} · tienda ±${tiendaX.toFixed(2)}`);
  comprobar('SUELO: el .glb trae todas las piezas que se plantan', faltan.length === 0, faltan);
  comprobar('SUELO: y se han medido de verdad, miles de puntos', poblado.puntos > 1000 && ciudad.puntos > 1000 && tienda.length > 20);
  const cubre = (declarada: CajaRelativa, medida: CajaRelativa): boolean =>
    declarada.x0 <= medida.x0 && declarada.z0 <= medida.z0 && declarada.x1 >= medida.x1 && declarada.z1 >= medida.z1;
  comprobar('la caja del poblado cubre sus casas y su pozo en los 54 vértices', cubre(CAJA_DEL_POBLADO, poblado.caja), redondea(poblado.caja));
  comprobar('la de la ciudad, su muralla, sus torres y su castillo', cubre(CAJA_DE_LA_CIUDAD, ciudad.caja), redondea(ciudad.caja));
  comprobar(
    'y la del estiaje, la tienda a talla 3',
    CAJA_DEL_ESTIAJE.x1 >= tiendaX && -CAJA_DEL_ESTIAJE.x0 >= tiendaX && CAJA_DEL_ESTIAJE.z1 >= tiendaZ && -CAJA_DEL_ESTIAJE.z0 >= tiendaZ,
  );
  /*
   * Y JUSTAS: una caja inflada «por si acaso» es una pared invisible delante de cada choza. Se
   * admite el redondeo a centésimas, y en el poblado la simetría (el reparto gira con la llave).
   */
  const justa = (a: number, b: number): boolean => a - b < 0.02;
  comprobar(
    'y justas: ninguna pasa de lo medido más que el redondeo a centésimas',
    justa(CAJA_DEL_POBLADO.x1, Math.max(poblado.caja.x1, -poblado.caja.x0)) &&
      justa(CAJA_DEL_POBLADO.z1, Math.max(poblado.caja.z1, -poblado.caja.z0)) &&
      justa(-CAJA_DE_LA_CIUDAD.x0, -ciudad.caja.x0) &&
      justa(CAJA_DE_LA_CIUDAD.x1, ciudad.caja.x1) &&
      justa(CAJA_DE_LA_CIUDAD.z1, Math.max(ciudad.caja.z1, -ciudad.caja.z0)) &&
      justa(CAJA_DEL_ESTIAJE.x1, tiendaX),
    { poblado: redondea(poblado.caja), ciudad: redondea(ciudad.caja), tienda: tiendaX },
  );
}

// ---------------------------------------------------------------------------
// ESCALÓN 6 · DE TIERRA AL MAR: EL VADO FRENA A LA MITAD Y LO HONDO PARA
// ---------------------------------------------------------------------------

paso('De tierra al mar, por las treinta orillas del delta');

/** El paso de un tic entero, sin mirar el suelo: lo que `pasoDelTic` calcula antes de frenar. */
function pasoEntero(rumbo: number): { dx: number; dz: number } {
  return {
    dx: por(por(VELOCIDAD_ANDANDO, SENO[rumbo] as number), DT_DEL_TIC),
    dz: por(-por(VELOCIDAD_ANDANDO, COSENO[rumbo] as number), DT_DEL_TIC),
  };
}

/** El menor ensanche de un punto contra las comarcas: ≤ 0 dentro, y crece mar adentro. */
function ensancheDelDelta(x: number, z: number): number {
  let m = Infinity;
  for (const h of islas) m = Math.min(m, ensancheDeComarca(x, z, centroEnElMundo(h)));
  return m;
}

{
  const a = arenaFinalDe6;
  let orillas = 0;
  let pisaronElVado = 0;
  let pararonEnLoHondo = 0;
  let enteroEnTierra = 0;
  let mitadEnElVado = 0;
  let enteroEnElVado = 0;
  let mitadEnTierra = 0;
  let pisaronLoHondo = 0;
  let masLejos = -Infinity;
  const raras: string[] = [];
  for (const h of islas) {
    if (distanciaHex(h, { q: 0, r: 0 }) !== 2) continue;
    for (let k = 0; k < 6; k++) {
      const fuera = vecino(h, k);
      if (esIsla.has(llaveDeHex(fuera))) continue;
      orillas++;
      /* Del centro de la comarca hacia el centro del hexágono de mar: cruza la orilla por su medio. */
      const c = centroEnElMundo(h);
      const m = centroEnElMundo(fuera);
      const ux = (m.x - c.x) / (RADIO_DE_COMARCA * Math.sqrt(3));
      const uz = (m.z - c.z) / (RADIO_DE_COMARCA * Math.sqrt(3));
      /* Diez fuera del centro, por si el estiaje está plantado ahí. */
      const desde = { x: c.x + ux * 10, z: c.z + uz * 10 };
      const rumbo = rumboHacia(desde, m);
      const { dx, dz } = pasoEntero(rumbo);
      const mdx = (dx / 2) | 0;
      const mdz = (dz / 2) | 0;
      let quien: Andante = { x: aFijo(desde.x), z: aFijo(desde.z) };
      if (!sePuedeEstar(a, quien.x, quien.z, RADIO_DEL_PASEANTE)) {
        raras.push(`no se puede salir de ${llaveDeHex(h)} hacia ${String(k)}`);
        continue;
      }
      let vadeo = false;
      let paradoEnElBorde = false;
      for (let t = 0; t < 400; t++) {
        const suelo = sueloEn(a, quien.x, quien.z);
        const despues = pasoDelTic(a, quien, rumbo, ANDANDO);
        const ddx = despues.x - quien.x;
        const ddz = despues.z - quien.z;
        if (suelo === VADO) {
          vadeo = true;
          if (ddx === mdx && ddz === mdz) mitadEnElVado++;
          if (ddx === dx && ddz === dz && (dx !== mdx || dz !== mdz)) enteroEnElVado++;
        } else if (suelo === FIRME) {
          if (ddx === dx && ddz === dz) enteroEnTierra++;
          if (ddx === mdx && ddz === mdz && (dx !== mdx || dz !== mdz)) mitadEnTierra++;
        }
        if (ddx === 0 && ddz === 0 && suelo === VADO && !hayPiso(a, quien.x + mdx, quien.z + mdz)) paradoEnElBorde = true;
        if (!hayPiso(a, despues.x, despues.z)) pisaronLoHondo++;
        masLejos = Math.max(masLejos, ensancheDelDelta(despues.x / UNO, despues.z / UNO));
        quien = despues;
      }
      if (vadeo) pisaronElVado++;
      if (paradoEnElBorde && sueloEn(a, quien.x, quien.z) === VADO) pararonEnLoHondo++;
      else raras.push(`${llaveDeHex(h)} hacia ${String(k)} acaba en ${String(sueloEn(a, quien.x, quien.z))} sin pararse en lo hondo`);
    }
  }
  console.log(
    `  ${String(orillas)} orillas · pisan el vado ${String(pisaronElVado)} · se paran donde empieza lo hondo ${String(pararonEnLoHondo)} · ` +
      `tics enteros en tierra ${String(enteroEnTierra)}, a la mitad en el vado ${String(mitadEnElVado)} · lo más lejos, ensanche ${masLejos.toFixed(2)}`,
  );
  comprobar('SUELO: son las treinta orillas de un delta de radio dos', orillas === 30, { orillas });
  comprobar('por todas se entra en el vado', pisaronElVado === orillas, raras.slice(0, 4));
  comprobar('y en todas el paseante se para donde empieza lo hondo, con el agua por las rodillas', pararonEnLoHondo === orillas, raras.slice(0, 4));
  comprobar('SUELO: se han andado de verdad tics enteros en tierra y a la mitad en el agua', enteroEnTierra > 1000 && mitadEnElVado > 1000, {
    enteroEnTierra,
    mitadEnElVado,
  });
  comprobar('en el vado NINGÚN tic avanza entero', enteroEnElVado === 0, { enteroEnElVado });
  comprobar('y en tierra ninguno avanza a la mitad', mitadEnTierra === 0, { mitadEnTierra });
  comprobar('nadie pisa lo hondo ni una vez', pisaronLoHondo === 0, { pisaronLoHondo });
  comprobar(
    'y nadie llega más allá del vado declarado más lo que se mueve una casilla',
    masLejos <= W + REDONDEO + 1e-9,
    { masLejos, tope: W + REDONDEO },
  );
}

// ---------------------------------------------------------------------------
// ESCALÓN 7 · LAS CHOZAS, LAS TORRES Y EL ESTIAJE PARAN
// ---------------------------------------------------------------------------

paso('Las chozas, las torres y el estiaje paran');

/** ¿Solapa el cuadrado del paseante en `(x, z)` —coma fija— con esta caja? Como `chocaConCuerpo`. */
function solapa(x: number, z: number, c: Cuerpo): boolean {
  const r = RADIO_DEL_PASEANTE;
  return x + r > aFijo(c.x0) && x - r < aFijo(c.x1) && z + r > aFijo(c.z0) && z - r < aFijo(c.z1);
}

{
  let probadas = 0;
  let paradasPorLaSuya = 0;
  let dentroDeAlguna = 0;
  let saltadas = 0;
  const sinParar: string[] = [];
  for (const p of partidas) {
    const mundo: MundoDeclarado = mundoDeRiberas(vistaDe(p.fotos[p.fotos.length - 1] as Foto, null));
    const a: Arena = arenaDe(mundo);
    for (const cuerpo of mundo.cuerpos) {
      const centro = { x: (cuerpo.x0 + cuerpo.x1) / 2, z: (cuerpo.z0 + cuerpo.z1) / 2 };
      const largo = Math.hypot(centro.x, centro.z);
      const ux = largo > 1 ? -centro.x / largo : 0;
      const uz = largo > 1 ? -centro.z / largo : -1;
      const desde = { x: centro.x + ux * 40, z: centro.z + uz * 40 };
      let quien: Andante = { x: aFijo(desde.x), z: aFijo(desde.z) };
      if (!sePuedeEstar(a, quien.x, quien.z, RADIO_DEL_PASEANTE)) {
        saltadas++;
        continue;
      }
      probadas++;
      const rumbo = rumboHacia(desde, centro);
      const { dx, dz } = pasoEntero(rumbo);
      let laSuyaLoPara = false;
      for (let t = 0; t < 120; t++) {
        const vadea = sueloEn(a, quien.x, quien.z) === VADO;
        const ex = vadea ? (dx / 2) | 0 : dx;
        const ez = vadea ? (dz / 2) | 0 : dz;
        const despues = pasoDelTic(a, quien, rumbo, ANDANDO);
        /* El paso entero se rechazó, y lo que había delante era ESTA caja. */
        if ((despues.x !== quien.x + ex || despues.z !== quien.z + ez) && solapa(quien.x + ex, quien.z + ez, cuerpo)) laSuyaLoPara = true;
        if (chocaConCuerpo(a, despues.x, despues.z, RADIO_DEL_PASEANTE)) dentroDeAlguna++;
        quien = despues;
      }
      if (laSuyaLoPara) paradasPorLaSuya++;
      else sinParar.push(`${p.nombre}: la caja en (${centro.x.toFixed(1)}, ${centro.z.toFixed(1)}) no paró a nadie`);
    }
  }
  console.log(`  ${String(probadas)} cajas buscadas de frente · las paró la suya ${String(paradasPorLaSuya)} · saltadas ${String(saltadas)}`);
  comprobar('SUELO: se buscan de frente todas las chozas, torres y estiajes del final de las tres mesas', probadas >= chozasAlFinal + torresAlFinal + 3, {
    probadas,
    chozasAlFinal,
    torresAlFinal,
  });
  comprobar('y a ninguna le falta sitio para empezar a andar', saltadas === 0, { saltadas });
  comprobar('a quien anda hacia una choza, una torre o el estiaje, la caja SUYA le corta el paso', paradasPorLaSuya === probadas, sinParar.slice(0, 4));
  comprobar('y nadie acaba nunca dentro de una caja', dentroDeAlguna === 0, { dentroDeAlguna });
}

// ---------------------------------------------------------------------------
// ESCALÓN 8 · DÓNDE SE NACE
// ---------------------------------------------------------------------------

paso('Dónde se nace');

comprobar('se declaran tantos sitios como colonos admite Riberas', NACIMIENTOS === MANIFIESTO_RIBERAS.jugadores.maximo, {
  NACIMIENTOS,
  maximo: MANIFIESTO_RIBERAS.jugadores.maximo,
});
/*
 * QUÉ ES «JUNTO A LO SUYO», escrito aquí y no importado: medido contra `LEJOS_DE_SU_CHOZA`, alejar
 * los sitios movería la vara con ellos y esto seguiría verde. Cuarenta son una caja de choza y
 * media más allá de su borde; más lejos ya no se nace junto a lo suyo, se nace en otra parte.
 */
const JUNTO_A_LO_SUYO = 40;
{
  let sitios = 0;
  let junto = 0;
  let conQueEstar = 0;
  let peorRumbo = 0;
  const malos: string[] = [];
  for (const f of todasLasFotos) {
    const mundo = mundoDeRiberas(vistaDe(f, null));
    const a = arenaDe(mundo);
    /* Contra el manifiesto y no contra `NACIMIENTOS`: si no, al tocar la constante se movería con ella. */
    comprobar(`${f.que}: un sitio de nacer por colono posible`, mundo.nace.length === MANIFIESTO_RIBERAS.jugadores.maximo, {
      nace: mundo.nace.length,
    });
    mundo.nace.forEach((s, k) => {
      sitios++;
      const x = aFijo(s.x);
      const z = aFijo(s.z);
      if (sueloEn(a, x, z) !== FIRME) malos.push(`${f.que} · sitio ${String(k)} en ${String(sueloEn(a, x, z))}, no en tierra firme`);
      if (!sePuedeEstar(a, x, z, RADIO_DEL_PASEANTE)) malos.push(`${f.que} · sitio ${String(k)}: no se puede estar`);
      if (chocaConCuerpo(a, x, z, RADIO_DEL_PASEANTE)) malos.push(`${f.que} · sitio ${String(k)}: dentro de una caja`);
      /*
       * Mira al centro del tablero, con el error de la tabla: medio rumbo, 0,7 grados. Aquí SÍ hay
       * senos: esto es un comprobador, corre en un solo motor y no decide nada.
       */
      const haciaX = -s.x;
      const haciaZ = -s.z;
      const dirX = Math.sin(s.rumbo);
      const dirZ = -Math.cos(s.rumbo);
      const coseno = (haciaX * dirX + haciaZ * dirZ) / Math.hypot(haciaX, haciaZ);
      const error = (Math.acos(Math.min(1, coseno)) * 180) / Math.PI;
      peorRumbo = Math.max(peorRumbo, error);
      /* Y es un rumbo DE LA TABLA, no un ángulo cualquiera: el aparato lo convierte a entero sin perder nada. */
      if (radianesDelRumbo(rumboDeRadianes(s.rumbo)) !== s.rumbo) malos.push(`${f.que} · sitio ${String(k)}: rumbo que no es de la tabla`);
      const colono = f.estado.colonos[k];
      const suyo = colono === undefined ? undefined : (colono.chozas[0] ?? colono.torres[0]);
      if (suyo !== undefined) {
        conQueEstar++;
        const v = verticeEnElMundo(suyo);
        const d = Math.hypot(s.x - v.x, s.z - v.z);
        if (d <= JUNTO_A_LO_SUYO) junto++;
        else malos.push(`${f.que} · el colono ${String(k)} nace a ${d.toFixed(1)} de lo suyo`);
      }
    });
    for (let i = 0; i < mundo.nace.length; i++) {
      for (let j = i + 1; j < mundo.nace.length; j++) {
        const p = mundo.nace[i] as { x: number; z: number };
        const q = mundo.nace[j] as { x: number; z: number };
        if (Math.hypot(p.x - q.x, p.z - q.z) < 1) malos.push(`${f.que} · los sitios ${String(i)} y ${String(j)} son el mismo`);
      }
    }
  }
  console.log(`  ${String(sitios)} sitios · ${String(conQueEstar)} de colonos con algo construido, ${String(junto)} junto a lo suyo · el que peor mira al centro, a ${peorRumbo.toFixed(2)}°`);
  comprobar('todos en tierra firme, fuera de toda caja, y distintos', malos.length === 0, malos.slice(0, 6));
  comprobar('SUELO: hay sitios de colonos con piezas, y todos junto a lo suyo', conQueEstar >= 20 && junto === conQueEstar, { conQueEstar, junto });
  comprobar('y todos miran al centro del tablero, a menos de un rumbo de la tabla', peorRumbo < 360 / 256, { peorRumbo });
}

// ---------------------------------------------------------------------------
// ESCALÓN 9 · EL MISMO MUNDO Y EL MISMO PASEO, EN NODE Y EN HERMES
// ---------------------------------------------------------------------------

paso('El mismo mundo y el mismo paseo, en Node y en Hermes');

/*
 * Cuatro vistas de espectador que cubren lo que hay que cubrir: el final de la mesa de seis (la
 * más llena, con el quinto y el sexto colono), el final y la media partida de la de cuatro (con
 * torres), y la de dos recién repartida (sin una choza: los seis sitios de nacer son de reserva).
 */
const vistasDelPaseo: unknown[] = [
  vistaDe(partidas[2]?.fotos[3] as Foto, null),
  vistaDe(partidas[1]?.fotos[3] as Foto, null),
  vistaDe(partidas[1]?.fotos[2] as Foto, null),
  vistaDe(partidas[0]?.fotos[0] as Foto, null),
];
const enProceso = pasearRiberas(vistasDelPaseo);
console.log(
  `  en proceso · mundo ${String(enProceso.huellaDelMundo)} · paseo ${String(enProceso.huella)} · ${String(enProceso.tics)} tics · ` +
    `cuerpo ${String(enProceso.porCuerpo)} · borde ${String(enProceso.porBorde)} · resbalando ${String(enProceso.resbalados)} · vado ${String(enProceso.enElVado)}`,
);
comprobar('SUELO: al paseante lo han parado los cuerpos de verdad', enProceso.porCuerpo >= 50, { porCuerpo: enProceso.porCuerpo });
comprobar('SUELO: y lo hondo', enProceso.porBorde >= 50, { porBorde: enProceso.porBorde });
comprobar('SUELO: y ha resbalado pegado a algo', enProceso.resbalados >= 20, { resbalados: enProceso.resbalados });
comprobar('SUELO: y ha vadeado', enProceso.enElVado >= 500, { enElVado: enProceso.enElVado });
comprobar('y no ha acabado nunca un tic sin suelo', enProceso.fuera === 0, { fuera: enProceso.fuera });
comprobar('y ninguna tanda se quedó sin empezar', enProceso.saltadas === 0, { saltadas: enProceso.saltadas });

function dondeEstaHermes(): string | null {
  const carpeta = path.join(REPO, 'node_modules', 'hermes-engine-cli');
  const candidato =
    process.platform === 'win32'
      ? path.join(carpeta, 'win64-bin', 'hermes.exe')
      : process.platform === 'darwin'
        ? path.join(carpeta, 'osx-bin', 'hermes')
        : path.join(carpeta, 'linux64-bin', 'hermes');
  return fs.existsSync(candidato) ? candidato : null;
}

const hermes = dondeEstaHermes();
comprobar(
  'el intérprete de Hermes está instalado',
  hermes !== null,
  'falta `hermes-engine-cli`. SIN ÉL ESTO NO COMPARA DOS MOTORES: se pone rojo en vez de saltárselo.',
);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'riberas-mundo-'));
const entrada = path.join(dir, 'entrada.ts');
const crudo = path.join(dir, 'crudo.js');

/*
 * Se empaqueta EL MISMO paseo que acaba de correr en proceso, con las vistas metidas como datos.
 * El mundo se deriva DENTRO de cada motor: lo que viaja al paquete son vistas, no mundos.
 */
fs.writeFileSync(
  entrada,
  `import { pasearRiberas } from ${JSON.stringify(path.join(AQUI, 'paseo-de-riberas.ts').replace(/\\/g, '/'))};\n` +
    `const vistas = ${JSON.stringify(vistasDelPaseo)};\n` +
    'const r = pasearRiberas(vistas);\n' +
    'const linea = JSON.stringify(r);\n' +
    "if (typeof print === 'function') print(linea); else console.log(linea);\n",
  'utf8',
);

let paqueteListo = false;
if (hermes !== null) {
  const esbuild = path.join(REPO, 'node_modules', 'esbuild', 'bin', 'esbuild');
  const hecho = spawnSync(
    process.execPath,
    [esbuild, entrada, '--bundle', '--format=iife', '--target=es2015', '--platform=neutral', `--outfile=${crudo}`],
    { encoding: 'utf8' },
  );
  paqueteListo = hecho.status === 0;
  comprobar('el paseo se empaqueta para los dos motores', paqueteListo, hecho.stderr.slice(0, 500));
  /* `class` se baja a funciones, como en `verify:mundo`: Hermes 0.12 no la entiende. */
  if (paqueteListo) {
    const antes = fs.readFileSync(crudo, 'utf8');
    comprobar('el paquete crudo trae alguna `class`, o esta pasada sobra', /\bclass\s/.test(antes), { letras: antes.length });
    const NOMBRE_DEL_COMPLEMENTO = '@babel/plugin-transform-classes';
    const bajarClases = (await import(NOMBRE_DEL_COMPLEMENTO)) as { default: unknown };
    const babel = await import('@babel/core');
    const transformado = babel.transformFileSync(crudo, {
      babelrc: false,
      configFile: false,
      compact: false,
      plugins: [bajarClases.default as babel.PluginItem],
    });
    const codigo = transformado?.code ?? '';
    comprobar('y se bajan a funciones', codigo.length > 0);
    if (codigo.length > 0) fs.writeFileSync(crudo, codigo, 'utf8');
  }
}

if (paqueteListo && hermes !== null) {
  const enNode = spawnSync(process.execPath, [crudo], { encoding: 'utf8', maxBuffer: 1 << 24 });
  const enHermes = spawnSync(hermes, [crudo], { encoding: 'utf8', maxBuffer: 1 << 24 });
  comprobar('Node ejecuta el paquete sin caerse', enNode.status === 0, enNode.stderr.slice(0, 400));
  comprobar('Hermes ejecuta el paquete sin caerse', enHermes.status === 0, enHermes.stderr.slice(0, 400));
  const leer = (s: string): PaseoDeRiberas | null => {
    const linea = s.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(linea) as PaseoDeRiberas;
    } catch {
      return null;
    }
  };
  const a = leer(enNode.stdout);
  const b = leer(enHermes.stdout);
  comprobar('las dos tandas dicen algo', a !== null && b !== null, { node: enNode.stdout.slice(-200), hermes: enHermes.stdout.slice(-200) });
  if (a !== null && b !== null) {
    const linea = (r: PaseoDeRiberas): string =>
      `mundo ${String(r.huellaDelMundo)} · paseo ${String(r.huella)} · cuerpo ${String(r.porCuerpo)} · borde ${String(r.porBorde)} · ` +
      `resbalando ${String(r.resbalados)} · vado ${String(r.enElVado)}`;
    console.log(`  Node   · ${linea(a)}`);
    console.log(`  Hermes · ${linea(b)}`);
    comprobar('SUELO: al paseante del paquete también lo paran los cuerpos y lo hondo', a.porCuerpo >= 50 && b.porCuerpo >= 50 && a.porBorde >= 50 && b.porBorde >= 50, {
      node: `${String(a.porCuerpo)}/${String(a.porBorde)}`,
      hermes: `${String(b.porCuerpo)}/${String(b.porBorde)}`,
    });
    comprobar('el mundo derivado es el MISMO en Node y en Hermes', a.huellaDelMundo === b.huellaDelMundo && a.pesoDelMundo === b.pesoDelMundo, {
      node: a.huellaDelMundo,
      hermes: b.huellaDelMundo,
    });
    comprobar('y con las mismas casillas, cajas y sitios', a.firmes === b.firmes && a.vados === b.vados && a.cuerpos === b.cuerpos && a.nacimientos === b.nacimientos);
    comprobar('la huella del paseo es la MISMA en Node y en Hermes', a.huella === b.huella, { node: a.huella, hermes: b.huella });
    comprobar(
      'y se chocaron las mismas veces contra lo mismo',
      a.porCuerpo === b.porCuerpo && a.porBorde === b.porBorde && a.resbalados === b.resbalados && a.enElVado === b.enElVado && a.fuera === b.fuera,
    );
    comprobar(
      'y el paquete da lo mismo que el código sin empaquetar',
      a.huella === enProceso.huella && a.huellaDelMundo === enProceso.huellaDelMundo,
      { empaquetado: a.huella, enProceso: enProceso.huella },
    );
  }
}

fs.rmSync(dir, { recursive: true, force: true });

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  process.exit(1);
}

console.log(`${String(hechas)} comprobaciones`);
console.log('\nEl mundo de Riberas cae bajo lo que pinta la escena —mismos centros, mismos vértices, la');
console.log('orilla pintada entera sobre suelo—, frena a la mitad en el vado y para en lo hondo y en');
console.log('cada choza, torre y estiaje, nace en tierra mirando al centro, y es el mismo en Node y en Hermes.');
