/**
 * ¿EL MUNDO DE LAS LINDES CHOCA CON LO QUE SE VE, Y ES EL MISMO EN LOS DOS MOTORES?
 *
 *   npx tsx server/scripts/verificar-lindes-mundo.ts
 *
 * `verify:mundo` comprueba la capa —que un mundo declarado canoniza y que la arena contesta lo
 * mismo en Node y en Hermes— sobre un tablero de juguete. Esto comprueba el mundo DE VERDAD de
 * Las Lindes: el que sale de `mundoDeLasLindes` para tableros jugados enteros por el robot, con
 * sus setenta y dos losas, sus murallas, sus villas y sus campos. Lo que afirma, por escalones:
 *
 *  1. QUE ES CONTRATO. Canoniza, y sus cuerpos son exactamente los que `cuerposDeLasLindes`
 *     cuenta, en el mismo orden: lo que se cuenta aquí es lo que hay en el mundo.
 *  2. QUE ESTORBA LO QUE TIENE QUE ESTORBAR. Hay cajas de murallas, de torres, de la villa, de
 *     la ermita y del campo, y jambas de puerta; y NI UNA de trigal, de barbecho o de nada
 *     menudo, salvo las piedras, rocas y tocones que pasan de la cintura: ésas estorban TODAS, una
 *     a una, y ninguna de las que no pasan, y su caja las cubre giradas como caigan. Toda pieza
 *     que estorba tiene su huella medida, nada con esquinas llega girado a un ángulo que no sea
 *     un cuarto, y nada que estorba se pone más pequeño que la altura a la que se midió su huella.
 *  3. QUE SE NACE DONDE SE PUEDE ESTAR: en su losa, en senda o en prado, sin cuerpo encima.
 *  4. QUE LA MURALLA PARA Y LA PUERTA DEJA PASAR, mirado desde el REPARTO y no desde las cajas.
 *     Ver ese escalón: una caja mal girada se «para a sí misma» si el cruce se calcula con ella.
 *  5. QUE LAS PIEDRAS NO CIERRAN LO QUE SE ANDABA: quien va por el eje de una senda no toca
 *     ninguna, ninguna estrecha el hueco de una puerta por debajo de lo que pasa una persona,
 *     ningún sitio de nacer queda al lado de una, y no parten el valle: cada trozo por el que se
 *     andaba sigue entero, y todos los sitios de nacer están en el grande.
 *  6. QUE EL MISMO PASEO DA LA MISMA HUELLA EN NODE Y EN HERMES, y el mismo mundo.
 *  7. QUE LA TABLA DE HUELLAS ES LA DE LOS MODELOS: se vuelven a medir en `tablero.glb` y se
 *     exigen los mismos números, y lo mismo el alto y el radio de las piedras.
 *  8. QUE LAS DOS TABLAS LITERALES DEL REPARTO DICEN LO QUE DICE SU CABECERA.
 *  9. Y QUE MUCHAS MESAS CUESTAN LO QUE UNA CALIENTE: con dieciséis en rueda —más losas de las
 *     que cabían en las memorias viejas del proceso—, poner una losa monta UNA y saca las cajas de
 *     UNA, y una jugada sin losa no hace nada; lo que sale de memoria es, bit a bit, lo que sale en
 *     frío; el tope se respeta y lo que sale es la mesa que más tiempo lleva quieta, entera; y en el
 *     aparato el mundo no vuelve a montar lo que la escena ya montó. CONTANDO, no cronometrando: en
 *     una máquina ocupada el reloj miente, y una losa montada es una losa montada.
 *
 * ═══ CON SUELOS DELANTE ═══
 *
 * Un paseante al que no para nada da la misma huella en los dos motores: la de no tocar nada. Y
 * una muralla que no para a nadie «pasa» todas las comprobaciones que sólo miran que no se
 * atraviese. Así que cada escalón cuenta lo que ha mirado y exige un mínimo: paradas por cuerpo
 * y por borde, cruces de muralla concluyentes, puertas cruzadas, tramos de senda comparados.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANDANDO, pasoDelTic, RADIO_DEL_PASEANTE } from '../../shared/mecanicas/andar';
import { canonico, porQueNoEsCanonico } from '../../shared/mecanicas/canonico';
import { deNumero, UNO } from '../../shared/mecanicas/fijo';
import { arenaDe, hayPiso, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Arena, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import { casillaDeLlave, LAS_LOSAS, ladoGirado, losaPorId, LOSAS_EN_TOTAL } from '../../shared/arcade/juegos/lindes-losas';
import type { Giro } from '../../shared/arcade/juegos/lindes-losas';
import {
  ALTO_Y_RADIO_DEL_MODELO,
  ALTURA_DE_LA_HUELLA_EN_PACK,
  HUECO_DE_LA_PUERTA,
  HUELLA_DEL_MODELO,
} from '../../shared/arcade/juegos/lindes-huellas';
import {
  ALTURA_DE_UNA_PERSONA,
  ANCHO_DE_LA_SENDA,
  CELDAS_POR_LOSA,
  CELDAS_POR_MURO,
  ESCALA_DEL_PACK,
  ESCALA_DE_LA_TORRE,
  LADO_DE_CELDA,
  LADO_DE_LOSA,
} from '../../shared/arcade/juegos/lindes-medidas';
import { comoEstorba, comoEstorbaLaPuesta, esMenuda, PIEZA } from '../../shared/arcade/juegos/lindes-piezas';
import {
  caminoDeLaSenda,
  DIRECCIONES_DE_LA_PLAZA,
  montarLaLosa,
  rumboDelTramo,
  semillaDeLaLosa,
  sueloDeLaLosa,
} from '../../shared/arcade/juegos/lindes-reparto';
import {
  cajasDeLaPuesta,
  cuartosDeVuelta,
  cuentasDelMundo,
  cuerposDeLasLindes,
  LADO_DE_LOSA_DEL_MUNDO,
  LOSAS_QUE_SE_RECUERDAN,
  loQueSeRecuerda,
  memoriaDeLasLindes,
  mundoDeLasLindes,
} from '../../shared/arcade/juegos/lindes-mundo';
import type { CuerpoDeLasLindes, LosaParaElMundo } from '../../shared/arcade/juegos/lindes-mundo';
import { ESCALA_DEL_PACK as ESCALA_DE_ESCENAS } from '../../escenas/escala';
import { LADO_DE_LOSA as LADO_DE_ESCENAS } from '../../escenas/lindes/medidas';
import { medirLasHuellas } from '../../escenas/scripts/medir-huellas-de-las-lindes';
import { jugarLasLindes } from './robot-de-las-lindes';
import type { PartidaDelRobot } from './robot-de-las-lindes';
import { pasearLasLindes } from './paseo-de-las-lindes';
import type { PaseoDeLasLindes } from './paseo-de-las-lindes';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '..', '..');

const fallos: string[] = [];
let hechas = 0;

function comprobar(que: string, bien: boolean, detalle?: unknown): void {
  hechas++;
  if (bien) return;
  const cola = detalle === undefined ? '' : ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`;
  fallos.push(`${que}${cola}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

const porOrden = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// ---------------------------------------------------------------------------
// LOS TABLEROS: JUGADOS ENTEROS POR EL ROBOT, NO ESCRITOS A MANO
// ---------------------------------------------------------------------------

interface Tablero {
  readonly nombre: string;
  readonly losas: readonly LosaParaElMundo[];
  readonly semilla: number;
}

/** Cada partida del robot se juega una vez: la usan varios escalones. */
const PARTIDAS = new Map<number, PartidaDelRobot>();
function partidaDelRobot(semilla: number): PartidaDelRobot {
  let partida = PARTIDAS.get(semilla);
  if (partida === undefined) {
    partida = jugarLasLindes(semilla, 3);
    PARTIDAS.set(semilla, partida);
  }
  return partida;
}

/**
 * Un tablero de verdad: el que deja una partida del robot, con las losas en el orden de sus
 * llaves. `hasta` corta por el orden en que se pusieron, que es un tablero que existió a mitad
 * de partida y por eso también es legal. La semilla del paisaje sale como la saca la escena:
 * `semillaDelCodigo` de un código de mesa, con `0x5eed`; el código es `LINDES-` y la partida
 * si no se dice otro.
 */
function tableroDelRobot(semilla: number, hasta: number | null, codigo = `LINDES-${String(semilla)}`): Tablero {
  const partida = partidaDelRobot(semilla);
  const losas: LosaParaElMundo[] = [];
  for (const llave of Object.keys(partida.estado.tablero).sort(porOrden)) {
    const puesta = partida.estado.tablero[llave];
    const c = casillaDeLlave(llave);
    if (puesta === undefined || c === null) continue;
    if (hasta !== null && puesta.orden > hasta) continue;
    losas.push({ x: c.x, y: c.y, losa: puesta.losa, giro: puesta.giro });
  }
  const partidaYHasta = hasta === null ? `partida ${String(semilla)}` : `partida ${String(semilla)} hasta la losa ${String(hasta)}`;
  const nombre = codigo === `LINDES-${String(semilla)}` ? partidaYHasta : `${partidaYHasta} en la mesa ${codigo}`;
  return { nombre, losas, semilla: semillaDelCodigo(codigo, 0x5eed) };
}

const TABLEROS: Tablero[] = [
  tableroDelRobot(1, null),
  tableroDelRobot(2, null),
  tableroDelRobot(3, null),
  tableroDelRobot(4, 5),
];

/**
 * TABLEROS CON UNA PIEDRA EN LA PUERTA, sólo para el escalón 5. En los cuatro de arriba ninguna
 * piedra cae en el pasillo del hueco de una puerta —es raro: cuatro puertas de setenta y cinco en
 * veintiséis tableros, medido al estrenar la regla de la cintura—, y sin una allí ese escalón no
 * probaría las puertas contra nada. Éstos son tres de los que la tienen, buscados una vez. Si el
 * reparto cambia y dejan de tenerla, el suelo de ese escalón se pone rojo y hay que buscar otros:
 * es lo que tiene que pasar, no un fallo del comprobador.
 */
const CON_PIEDRA_EN_LA_PUERTA: Tablero[] = [
  tableroDelRobot(10, null, 'MESA10'),
  tableroDelRobot(12, null, 'MESA12'),
  tableroDelRobot(15, null, 'MESA15'),
];

/**
 * Lo que se pone girado a un ángulo cualquiera: plantas redondas u ovaladas. Ver `lindes-mundo.ts`.
 * Las piedras, las rocas y los tocones también, y ésas además con la caja de su radio medido.
 */
const CAMPO_REDONDO: ReadonlySet<string> = new Set([
  PIEZA.arbolA,
  PIEZA.arbolB,
  PIEZA.arboledaGrande,
  PIEZA.arboledaMedia,
  PIEZA.arboledaPequena,
  PIEZA.almiar,
  PIEZA.colinaA,
  PIEZA.piedra,
  PIEZA.rocaA,
  PIEZA.rocaB,
  PIEZA.rocaC,
  PIEZA.rocaD,
  PIEZA.rocaE,
  PIEZA.tocon,
]);

/** ¿Es de las que estorban sólo si pasan de la cintura? Las piedras, las rocas y los tocones. */
const esPiedra = (pieza: string): boolean => comoEstorba(pieza) === 'si-pasa-de-la-cintura';

interface Derivado {
  readonly tablero: Tablero;
  readonly mundo: MundoDeclarado;
  readonly conOrigen: readonly CuerpoDeLasLindes[];
  readonly arena: Arena;
}

function derivar(t: Tablero): Derivado {
  const mundo = mundoDeLasLindes(t.losas, t.semilla);
  return { tablero: t, mundo, conOrigen: cuerposDeLasLindes(t.losas, t.semilla), arena: arenaDe(mundo) };
}

const DERIVADOS: Derivado[] = TABLEROS.map(derivar);

// ---------------------------------------------------------------------------
// ESCALÓN 1 · EL MUNDO ES CONTRATO
// ---------------------------------------------------------------------------

paso('El mundo de Las Lindes pasa por el serializador canónico');

for (const d of DERIVADOS) {
  const { tablero: t, mundo } = d;
  const porQue = porQueNoEsCanonico(mundo);
  comprobar(`${t.nombre}: el mundo canoniza`, porQue === null, porQue);
  const peso = porQue === null ? canonico(mundo).length : 0;
  console.log(
    `  ${t.nombre}: ${String(t.losas.length)} losas · ${String(mundo.cuerpos.length)} cuerpos · ` +
      `${(peso / 1024).toFixed(1)} kB canonizado`,
  );
  comprobar(`${t.nombre}: pisables son las losas puestas, una por una`, mundo.pisables.length === t.losas.length, {
    pisables: mundo.pisables.length,
    losas: t.losas.length,
  });
  comprobar(`${t.nombre}: sin agua`, mundo.vados.length === 0);
  comprobar(`${t.nombre}: el lado es el de una losa`, mundo.lado === LADO_DE_LOSA, { lado: mundo.lado });
  if (porQue === null) {
    comprobar(
      `${t.nombre}: los cuerpos del mundo son EXACTAMENTE los que se cuentan aquí, en el mismo orden`,
      canonico(mundo.cuerpos) === canonico(d.conOrigen.map((c) => c.cuerpo)),
      { mundo: mundo.cuerpos.length, contados: d.conOrigen.length },
    );
    comprobar(`${t.nombre}: y lo mismo dos veces da lo mismo`, canonico(mundoDeLasLindes(t.losas, t.semilla)) === canonico(mundo));
  }
}
{
  const lleno = DERIVADOS[0] as Derivado;
  comprobar('un tablero lleno son las 72 losas', lleno.tablero.losas.length === 72, { losas: lleno.tablero.losas.length });
  comprobar('y lleva más de mil cajas: no es un mundo vacío', lleno.mundo.cuerpos.length > 1000, {
    cuerpos: lleno.mundo.cuerpos.length,
  });
}

// ---------------------------------------------------------------------------
// ESCALÓN 2 · ESTORBA LO QUE TIENE QUE ESTORBAR, Y NADA MÁS
// ---------------------------------------------------------------------------

paso('Estorba lo que tiene que estorbar, y nada más');

{
  const porPorque = new Map<string, number>();
  const porPieza = new Map<string, number>();
  let jambas = 0;
  let redondas = 0;
  let exactas = 0;
  const redondasConEsquinas: string[] = [];
  const deLasQueNo: string[] = [];
  const malFormadas: string[] = [];
  for (const d of DERIVADOS) {
    for (const c of d.conOrigen) {
      porPorque.set(c.porque, (porPorque.get(c.porque) ?? 0) + 1);
      porPieza.set(c.pieza, (porPieza.get(c.pieza) ?? 0) + 1);
      if (c.forma === 'jamba') jambas++;
      if (c.forma === 'exacta') exactas++;
      if (c.forma === 'redonda') {
        redondas++;
        if (!CAMPO_REDONDO.has(c.pieza)) redondasConEsquinas.push(`${c.pieza} en la losa ${String(c.losa)}`);
      }
      if (comoEstorba(c.pieza) === 'nada') deLasQueNo.push(c.pieza);
      const b = c.cuerpo;
      const bien =
        Number.isFinite(b.x0) && Number.isFinite(b.x1) && Number.isFinite(b.z0) && Number.isFinite(b.z1) && b.x0 < b.x1 && b.z0 < b.z1;
      if (!bien) malFormadas.push(`${c.pieza}: ${JSON.stringify(b)}`);
    }
  }
  console.log(`  por qué está: ${JSON.stringify([...porPorque].sort((a, b) => b[1] - a[1]))}`);
  console.log(`  por pieza: ${JSON.stringify([...porPieza].sort((a, b) => b[1] - a[1]))}`);
  console.log(`  ${String(exactas)} cajas exactas · ${String(redondas)} redondas · ${String(jambas)} jambas de puerta`);
  for (const clase of ['muralla', 'remate', 'villa', 'ermita', 'prado']) {
    comprobar(`hay cajas de «${clase}»`, (porPorque.get(clase) ?? 0) > 0, { cuantas: porPorque.get(clase) ?? 0 });
  }
  comprobar('los lienzos de muralla estorban', (porPieza.get(PIEZA.muro) ?? 0) > 100, { muro: porPieza.get(PIEZA.muro) });
  comprobar('y las torres', (porPieza.get(PIEZA.atalaya) ?? 0) + (porPieza.get(PIEZA.vigia) ?? 0) > 50);
  comprobar('y las casas', (porPieza.get(PIEZA.casa) ?? 0) > 100, { casa: porPieza.get(PIEZA.casa) });
  comprobar('y los árboles', (porPieza.get(PIEZA.arbolA) ?? 0) + (porPieza.get(PIEZA.arbolB) ?? 0) > 50);
  comprobar('y las puertas dejan DOS jambas cada una', jambas > 0 && jambas % 2 === 0, { jambas });
  /*
   * Lo menudo que estorba son las piedras que pasan de la cintura, y sólo ellas: una valla, un
   * barril o un pozo con caja sería la regla de producto rota en silencio. Cuáles de las piedras,
   * pieza a pieza, lo mira el bloque de abajo.
   */
  const menudasConCaja = [...porPieza.keys()].filter((p) => esMenuda(p) && !esPiedra(p));
  comprobar(
    'y ni una caja de trigal, de barbecho o de nada menudo que no sea una piedra, una roca o un tocón',
    deLasQueNo.length === 0 &&
      (porPieza.get(PIEZA.trigal) ?? 0) === 0 &&
      (porPieza.get(PIEZA.barbecho) ?? 0) === 0 &&
      menudasConCaja.length === 0,
    { deLasQueNo: deLasQueNo.slice(0, 10), menudasConCaja },
  );
  comprobar('nada con esquinas llega girado a un ángulo que no sea un cuarto de vuelta', redondasConEsquinas.length === 0, redondasConEsquinas.slice(0, 10));
  comprobar('y lo del campo sí llega girado de cualquier manera: las redondas existen', redondas > 100, { redondas });
  comprobar('toda caja es una caja: finita y con el ancho y el fondo en positivo', malFormadas.length === 0, malFormadas.slice(0, 5));
}

/*
 * EL REPARTO, PIEZA A PIEZA: que no se quede nada que estorbe sin huella —se atravesaría en
 * silencio— y que nada que estorbe se ponga más pequeño que una torre, que es la escala a la que
 * se midió hasta dónde llega la cabeza de quien anda. «Que estorbe» es tal como está PUESTA: una
 * piedra que pasa de la cintura cuenta, y tiene que cumplirlo como una casa.
 */
{
  let piezasMiradas = 0;
  let queEstorban = 0;
  let piedrasQueEstorban = 0;
  let piedraMasPequena = Number.POSITIVE_INFINITY;
  const sinHuella = new Set<string>();
  const pequenas: string[] = [];
  const cabeza = ALTURA_DE_LA_HUELLA_EN_PACK * ESCALA_DEL_PACK * ESCALA_DE_LA_TORRE;
  for (const d of DERIVADOS) {
    for (const l of d.tablero.losas) {
      for (const p of montarLaLosa(l.losa, l.giro, semillaDeLaLosa(d.tablero.semilla, l.x, l.y)).puestas) {
        piezasMiradas++;
        if (comoEstorbaLaPuesta(p.pieza, p.escala) === 'nada') continue;
        queEstorban++;
        if (esPiedra(p.pieza)) {
          piedrasQueEstorban++;
          if (p.escala < piedraMasPequena) piedraMasPequena = p.escala;
        }
        if (HUELLA_DEL_MODELO[p.pieza] === undefined) sinHuella.add(p.pieza);
        if (p.escala < ESCALA_DE_LA_TORRE - 1e-12) pequenas.push(`${p.pieza} a escala ${p.escala.toFixed(3)}`);
      }
    }
  }
  console.log(
    `  ${String(piezasMiradas)} piezas del reparto miradas, ${String(queEstorban)} estorban · ` +
      `${String(piedrasQueEstorban)} de ellas piedras, la más pequeña a escala ${piedraMasPequena.toFixed(3)} (la torre, ${String(ESCALA_DE_LA_TORRE)})`,
  );
  comprobar('se han mirado las piezas del reparto de verdad', piezasMiradas > 5000, { piezasMiradas });
  comprobar('toda pieza que estorba tiene su huella medida', sinHuella.size === 0, [...sinHuella]);
  comprobar(
    `ninguna pieza que estorba se pone más pequeña que una torre: su huella cubre una persona entera (${cabeza.toFixed(3)} del mundo)`,
    pequenas.length === 0,
    pequenas.slice(0, 5),
  );
  /* Y las piedras entran en esa cuenta: si no hubiera ninguna, el invariante no las estaría mirando. */
  comprobar('y en esa cuenta entran piedras que estorban, que también la cumplen', piedrasQueEstorban > 300, { piedrasQueEstorban });
}

/*
 * ═══ LAS PIEDRAS, PIEZA A PIEZA ═══
 *
 * La regla es por pieza PUESTA: estorba la piedra, la roca o el tocón que pasa de la cintura de
 * quien anda (`comoEstorbaLaPuesta`). Aquí se vuelve a contestar con la cuenta a la vista —su alto
 * medido, por la escala del pack y la suya, contra media persona—, sin preguntarle a la regla, y
 * se exige que el mundo haya sacado caja de las que pasan y de NINGUNA otra.
 *
 * Y que esa caja cubra la piedra se gire como se gire: centrada donde se puso y con su radio
 * medido —lo más lejos que llega su planta— por medio lado. Con el mayor semieje, que es lo que
 * tienen los árboles, la piedra asomaba por las esquinas: ver `lindes-mundo.ts`. Que el radio de
 * la tabla sea el del modelo lo mira el escalón 7, midiéndolo otra vez.
 */
{
  const cintura = ALTURA_DE_UNA_PERSONA / 2;
  let miradas = 0;
  let estorban = 0;
  let sePisan = 0;
  let masBajaQueEstorba = Number.POSITIVE_INFINITY;
  let masAltaQueSePisa = 0;
  let aCuartos = 0;
  let conRadio = 0;
  const porPieza = new Map<string, { estorban: number; sePisan: number }>();
  const malas: string[] = [];
  for (const d of DERIVADOS) {
    for (const l of d.tablero.losas) {
      const cx = l.x * LADO_DE_LOSA;
      const cz = -l.y * LADO_DE_LOSA;
      for (const p of montarLaLosa(l.losa, l.giro, semillaDeLaLosa(d.tablero.semilla, l.x, l.y)).puestas) {
        if (!esPiedra(p.pieza)) continue;
        miradas++;
        const medido = ALTO_Y_RADIO_DEL_MODELO[p.pieza];
        if (medido === undefined) {
          malas.push(`${p.pieza}: no tiene alto ni radio medidos`);
          continue;
        }
        const alto = medido.alto * ESCALA_DEL_PACK * p.escala;
        const pasa = alto > cintura;
        const cuenta = porPieza.get(p.pieza) ?? { estorban: 0, sePisan: 0 };
        if (pasa) {
          estorban++;
          cuenta.estorban++;
          if (alto < masBajaQueEstorba) masBajaQueEstorba = alto;
        } else {
          sePisan++;
          cuenta.sePisan++;
          if (alto > masAltaQueSePisa) masAltaQueSePisa = alto;
        }
        porPieza.set(p.pieza, cuenta);
        const cajas = cajasDeLaPuesta(p, cx, cz);
        const donde = `${d.tablero.nombre}, ${p.pieza} a escala ${p.escala.toFixed(3)} (${alto.toFixed(2)} de alto)`;
        if (cajas.length !== (pasa ? 1 : 0)) {
          malas.push(`${donde}: ${String(cajas.length)} cajas y ${pasa ? 'pasa' : 'no pasa'} de la cintura`);
          continue;
        }
        const caja = cajas[0];
        if (caja === undefined) continue;
        /* A cuartos de vuelta la caja es la huella girada, exacta; el reparto no las pone así. */
        if (cuartosDeVuelta(p.giro) !== null) {
          aCuartos++;
          continue;
        }
        conRadio++;
        const r = medido.radio * ESCALA_DEL_PACK * p.escala * Math.max(1, p.largo);
        const x = cx + p.x;
        const z = cz + p.z;
        const b = caja.cuerpo;
        const cubre = b.x0 <= x - r + 1e-9 && b.x1 >= x + r - 1e-9 && b.z0 <= z - r + 1e-9 && b.z1 >= z + r - 1e-9;
        if (!cubre) malas.push(`${donde}: su caja ${JSON.stringify(b)} no cubre su radio ${r.toFixed(3)} alrededor de (${x.toFixed(2)}, ${z.toFixed(2)})`);
      }
    }
  }
  console.log(
    `  piedras, rocas y tocones: ${String(miradas)} puestos · ${String(estorban)} pasan de la cintura (${cintura.toFixed(3)}) y estorban, ` +
      `el más bajo de ${masBajaQueEstorba.toFixed(2)} · ${String(sePisan)} se pisan, el más alto de ${masAltaQueSePisa.toFixed(2)}`,
  );
  console.log(`  por pieza: ${JSON.stringify([...porPieza].sort((a, b) => porOrden(a[0], b[0])))}`);
  comprobar('se han mirado las piedras, las rocas y los tocones del reparto', miradas > 500, { miradas });
  comprobar(
    'las que pasan de la cintura estorban, cada una con una caja que la cubre girada como caiga, y las que no pasan no tienen ninguna',
    malas.length === 0,
    malas.slice(0, 5),
  );
  /*
   * Y la regla muerde por los dos lados. Sin piedras que se pisan, «estorban todas» pasaría esto
   * en verde; sin piedras que estorban, «no estorba ninguna», que es lo que había.
   */
  comprobar('y hay de las dos: piedras que estorban y piedras que se pisan', estorban > 300 && sePisan > 20, { estorban, sePisan });
  /* Y la cobertura por el radio se ha mirado de verdad, en cientos de piedras giradas de cualquier manera. */
  comprobar('y se ha mirado que su caja las cubre en cientos de piedras giradas de cualquier manera', conRadio > 300, { conRadio, aCuartos });
}

// ---------------------------------------------------------------------------
// ESCALÓN 3 · SE NACE DONDE SE PUEDE ESTAR
// ---------------------------------------------------------------------------

paso('Se nace en su losa, en senda o en prado, sin cuerpo encima');

{
  const porClase = new Map<string, number>();
  const malos: string[] = [];
  let mirados = 0;
  let masCerca = Number.POSITIVE_INFINITY;
  for (const d of DERIVADOS) {
    const { tablero: t, mundo, arena } = d;
    comprobar(`${t.nombre}: un sitio de nacer por losa, en su orden`, mundo.nace.length === t.losas.length, {
      nace: mundo.nace.length,
    });
    for (let i = 0; i < t.losas.length; i++) {
      const l = t.losas[i] as LosaParaElMundo;
      const s = mundo.nace[i];
      if (s === undefined) continue;
      mirados++;
      const enSuLosa = Math.floor(s.x / LADO_DE_LOSA + 0.5) === l.x && Math.floor(-s.z / LADO_DE_LOSA + 0.5) === l.y;
      const sePuede = sePuedeEstar(arena, deNumero(s.x), deNumero(s.z), RADIO_DEL_PASEANTE);
      const fi = Math.floor(((s.x - l.x * LADO_DE_LOSA) / LADO_DE_LOSA + 0.5) * CELDAS_POR_LOSA);
      const fj = Math.floor(((s.z + l.y * LADO_DE_LOSA) / LADO_DE_LOSA + 0.5) * CELDAS_POR_LOSA);
      const celdas = montarLaLosa(l.losa, l.giro, semillaDeLaLosa(t.semilla, l.x, l.y)).celdas;
      const clase = celdas[fj * CELDAS_POR_LOSA + fi]?.clase ?? 'fuera';
      porClase.set(clase, (porClase.get(clase) ?? 0) + 1);
      const rumboBueno = Number.isFinite(s.rumbo) && s.rumbo >= 0 && s.rumbo < Math.PI * 2;
      if (!enSuLosa || !sePuede || (clase !== 'senda' && clase !== 'prado') || !rumboBueno) {
        malos.push(
          `${t.nombre}, losa ${String(i)} (${l.losa}): en su losa ${String(enSuLosa)}, se puede estar ${String(sePuede)}, ${clase}, rumbo ${String(s.rumbo)}`,
        );
      }
      for (const b of mundo.cuerpos) {
        const nx = s.x < b.x0 ? b.x0 : s.x > b.x1 ? b.x1 : s.x;
        const nz = s.z < b.z0 ? b.z0 : s.z > b.z1 ? b.z1 : s.z;
        const dd = Math.sqrt((s.x - nx) * (s.x - nx) + (s.z - nz) * (s.z - nz));
        if (dd < masCerca) masCerca = dd;
      }
    }
  }
  console.log(`  ${String(mirados)} sitios de nacer · ${JSON.stringify([...porClase])} · el más pegado a un cuerpo, a ${masCerca.toFixed(2)} u`);
  comprobar('se han mirado todos los sitios de nacer de los cuatro tableros', mirados > 200, { mirados });
  comprobar('todo sitio de nacer está en su losa, en senda o en prado, y se puede estar en él', malos.length === 0, malos.slice(0, 5));
  comprobar('y ninguno toca un cuerpo: por lo menos a un radio de quien anda', masCerca >= RADIO_DEL_PASEANTE / UNO, { masCerca });
}

// ---------------------------------------------------------------------------
// ESCALÓN 4 · LA MURALLA PARA Y LA PUERTA DEJA PASAR
// ---------------------------------------------------------------------------

paso('La muralla para, y la puerta deja pasar');

/*
 * ═══ LA GEOMETRÍA SALE DEL REPARTO, NO DE LAS CAJAS ═══
 *
 * La primera versión de este escalón calculaba por dónde cruzar un lienzo mirando SU CAJA: el
 * eje largo de la caja era el muro, y se cruzaba por su medio. Eso no podía fallar de la manera
 * que importa: una caja mal girada —un muro de norte a sur con la caja tumbada de este a oeste—
 * se sigue parando a sí misma si el cruce se calcula con ella. Se vio pensando cómo ponerla roja.
 *
 * Ahora el muro se sabe por lo que el REPARTO dijo que ponía: su centro, su giro —que dice hacia
 * dónde va— y el tramo que cubre, `largo × CELDAS_POR_MURO` celdas. Y se cruza por el medio y a
 * un setenta por ciento de cada punta: una caja más corta, girada o corrida deja pasar por alguno
 * de los tres.
 *
 * Y al revés, que es la otra mitad: una caja MÁS LARGA que el muro para todo eso igual de bien, y
 * se vería como chocar contra el aire al final de un lienzo. Así que cada pieza, SOLA en el
 * tablero, se cruza también un poco más allá de sus puntas —y la puerta, junto a sus jambas pero
 * dentro del hueco—, y ahí se tiene que pasar.
 */

/** Rumbos de la tabla de `andar.ts` que van por los ejes. */
const AL_NORTE = 0;
const AL_ESTE = 64;
const AL_SUR = 128;
const AL_OESTE = 192;

/**
 * Desde dónde se empieza a cruzar, contado desde el eje del muro: más que el medio grueso de
 * cualquier muro dibujado —0,4 del pack a su escala son 5,1 unidades— más un radio y un palmo.
 */
const DESDE_EL_EJE = 9;

/** Y cuándo se da por cruzado: pasado el medio grueso más grueso, por el otro lado. */
const PASADO_EL_EJE = 6;

/** Una pieza de muralla como la puso el reparto, con los índices de sus cajas en el mundo. */
interface PiezaDeMuralla {
  readonly pieza: string;
  readonly losa: number;
  readonly x: number;
  readonly z: number;
  /** El giro, en cuartos de vuelta; `null` sería una muralla torcida, y se comprueba que no hay. */
  readonly cuartos: number | null;
  /** Medio largo del tramo que cubre, en unidades del mundo, según el reparto. */
  readonly medioLargo: number;
  readonly indices: readonly number[];
}

/**
 * Las piezas de muralla de un tablero, recorriendo el reparto en el MISMO orden en que
 * `mundoDeLasLindes` saca las cajas: así el índice de cada caja se sabe contando, sin buscarla.
 */
function piezasDeMuralla(d: Derivado): { piezas: PiezaDeMuralla[]; contadas: number } {
  const piezas: PiezaDeMuralla[] = [];
  let indice = 0;
  for (let n = 0; n < d.tablero.losas.length; n++) {
    const l = d.tablero.losas[n] as LosaParaElMundo;
    const cx = l.x * LADO_DE_LOSA;
    const cz = -l.y * LADO_DE_LOSA;
    for (const p of montarLaLosa(l.losa, l.giro, semillaDeLaLosa(d.tablero.semilla, l.x, l.y)).puestas) {
      const cuantas = cajasDeLaPuesta(p, cx, cz).length;
      if (p.pieza === PIEZA.muro || p.pieza === PIEZA.muroPuerta) {
        const indices: number[] = [];
        for (let k = 0; k < cuantas; k++) indices.push(indice + k);
        piezas.push({
          pieza: p.pieza,
          losa: n,
          x: cx + p.x,
          z: cz + p.z,
          cuartos: cuartosDeVuelta(p.giro),
          medioLargo: (p.largo * CELDAS_POR_MURO * LADO_DE_CELDA) / 2,
          indices,
        });
      }
      indice += cuantas;
    }
  }
  return { piezas, contadas: indice };
}

interface Cruce {
  readonly desde: { readonly x: number; readonly z: number };
  readonly hasta: { readonly x: number; readonly z: number };
  readonly rumbo: number;
  readonly haCruzado: (x: number, z: number) => boolean;
}

/**
 * Los dos cruces derechos de una pieza de muralla por un punto de su eje: `a` va de −1 (una
 * punta) a +1 (la otra). Uno de cada lado.
 */
function crucesPor(m: PiezaDeMuralla, a: number): Cruce[] {
  /* A cuartos pares el muro va de este a oeste (la `x` del modelo cae en la `x` del mundo). */
  const enX = m.cuartos === 0 || m.cuartos === 2;
  if (enX) {
    const x = m.x + a * m.medioLargo;
    return [
      { desde: { x, z: m.z - DESDE_EL_EJE }, hasta: { x, z: m.z + DESDE_EL_EJE }, rumbo: AL_SUR, haCruzado: (_x, z) => z > m.z + PASADO_EL_EJE },
      { desde: { x, z: m.z + DESDE_EL_EJE }, hasta: { x, z: m.z - DESDE_EL_EJE }, rumbo: AL_NORTE, haCruzado: (_x, z) => z < m.z - PASADO_EL_EJE },
    ];
  }
  const z = m.z + a * m.medioLargo;
  return [
    { desde: { x: m.x - DESDE_EL_EJE, z }, hasta: { x: m.x + DESDE_EL_EJE, z }, rumbo: AL_ESTE, haCruzado: (x) => x > m.x + PASADO_EL_EJE },
    { desde: { x: m.x + DESDE_EL_EJE, z }, hasta: { x: m.x - DESDE_EL_EJE, z }, rumbo: AL_OESTE, haCruzado: (x) => x < m.x - PASADO_EL_EJE },
  ];
}

/** Anda derecho ciento veinte tics —72 unidades— y dice si cruzó. */
function andaDerecho(arena: Arena, c: Cruce): boolean {
  let quien = { x: deNumero(c.desde.x), z: deNumero(c.desde.z) };
  for (let k = 0; k < 120; k++) quien = pasoDelTic(arena, quien, c.rumbo, ANDANDO);
  return c.haCruzado(quien.x / UNO, quien.z / UNO);
}

function arenaCon(d: Derivado, cuerpos: readonly Cuerpo[]): Arena {
  return arenaDe({ lado: LADO_DE_LOSA, pisables: d.mundo.pisables, vados: [], cuerpos, nace: [] });
}

const cabeEn = (a: Arena, p: { readonly x: number; readonly z: number }): boolean =>
  sePuedeEstar(a, deNumero(p.x), deNumero(p.z), RADIO_DEL_PASEANTE) && hayPiso(a, deNumero(p.x), deNumero(p.z));

/**
 * ¿Para esta pieza a quien la cruza por `a`? Sólo cuenta si el cruce es CONCLUYENTE: se puede
 * empezar en el tablero de verdad y, quitando esta pieza, el mismo paseo cruza. Si otra cosa lo
 * para también sin ella, no prueba nada y se devuelve `null`.
 */
function paraAlCruzar(d: Derivado, m: PiezaDeMuralla, a: number, sinElla: Arena): boolean | null {
  for (const cruce of crucesPor(m, a)) {
    if (!cabeEn(d.arena, cruce.desde) || !cabeEn(sinElla, cruce.hasta)) continue;
    if (!andaDerecho(sinElla, cruce)) continue;
    return !andaDerecho(d.arena, cruce);
  }
  return null;
}

{
  let cruces = 0;
  let paran = 0;
  let sinConcluir = 0;
  let torcidas = 0;
  let puertas = 0;
  let porElHuecoSolas = 0;
  let cerradasParan = 0;
  let jambasProbadas = 0;
  let jambasParan = 0;
  let enElTablero = 0;
  let enElTableroCruzan = 0;
  let ajustesProbados = 0;
  let ajustesPasan = 0;
  const seSalen: string[] = [];
  const noParan: string[] = [];
  const noPasanPorElHueco: string[] = [];
  const cerradasQueNoParan: string[] = [];
  const noSeEntra: string[] = [];
  for (const d of DERIVADOS.slice(0, 3)) {
    const { piezas, contadas } = piezasDeMuralla(d);
    comprobar(`${d.tablero.nombre}: las cajas contadas pieza a pieza son las del mundo`, contadas === d.mundo.cuerpos.length, {
      contadas,
      mundo: d.mundo.cuerpos.length,
    });
    /* Sin eso, los índices de las cajas de cada pieza no señalan a nada: se apunta y se sigue. */
    if (contadas !== d.mundo.cuerpos.length) continue;
    for (const m of piezas) {
      if (m.cuartos === null) {
        torcidas++;
        continue;
      }
      const suyas = new Set(m.indices);
      const sinElla = arenaCon(d, d.mundo.cuerpos.filter((_, k) => !suyas.has(k)));
      const sola = arenaCon(
        d,
        m.indices.map((k) => d.mundo.cuerpos[k] as Cuerpo),
      );
      const donde = `${d.tablero.nombre}, losa ${String(m.losa)}, ${m.pieza} en (${m.x.toFixed(1)}, ${m.z.toFixed(1)})`;
      /*
       * Y NO ESTORBA MÁS ALLÁ DE LO DIBUJADO. Sola en el tablero, se cruza pasado su extremo
       * —a un diez por ciento de su medio largo, más de un radio de quien anda en el lienzo más
       * corto—. Una caja más larga que el muro, o sin el `largo` que lo encoge, para ahí.
       */
      for (const a of [-1.1, 1.1]) {
        for (const cruce of crucesPor(m, a)) {
          if (!cabeEn(sola, cruce.desde) || !cabeEn(sola, cruce.hasta)) continue;
          ajustesProbados++;
          if (andaDerecho(sola, cruce)) ajustesPasan++;
          else seSalen.push(`${donde}, pasado el extremo ${String(a)}`);
          break;
        }
      }
      if (m.pieza === PIEZA.muro) {
        /* Un lienzo: por el medio y a un 70 % de cada punta, tiene que parar. */
        for (const a of [-0.7, 0, 0.7]) {
          const r = paraAlCruzar(d, m, a, sinElla);
          if (r === null) {
            sinConcluir++;
            continue;
          }
          cruces++;
          if (r) paran++;
          else noParan.push(`${donde}, a ${String(a)}`);
        }
        continue;
      }
      /* Y en una puerta, cerca de las jambas pero dentro del hueco —a un 40 %—, sola, se pasa. */
      for (const a of [-0.4, 0.4]) {
        for (const cruce of crucesPor(m, a)) {
          if (!cabeEn(sola, cruce.desde) || !cabeEn(sola, cruce.hasta)) continue;
          ajustesProbados++;
          if (andaDerecho(sola, cruce)) ajustesPasan++;
          else seSalen.push(`${donde}, dentro del hueco a ${String(a)}`);
          break;
        }
      }
      /* Una puerta: por las jambas para, y por el hueco se pasa. */
      puertas++;
      for (const a of [-0.75, 0.75]) {
        const r = paraAlCruzar(d, m, a, sinElla);
        if (r === null) continue;
        jambasProbadas++;
        if (r) jambasParan++;
        else noParan.push(`${donde}, jamba a ${String(a)}`);
      }
      const jambas = m.indices.map((k) => d.mundo.cuerpos[k] as Cuerpo);
      const soloLaPuerta = arenaCon(d, jambas);
      const cerrada: Cuerpo = {
        x0: Math.min(...jambas.map((j) => j.x0)),
        z0: Math.min(...jambas.map((j) => j.z0)),
        x1: Math.max(...jambas.map((j) => j.x1)),
        z1: Math.max(...jambas.map((j) => j.z1)),
      };
      const conLaPuertaCerrada = arenaCon(d, [cerrada]);
      let probada = false;
      for (const cruce of crucesPor(m, 0)) {
        if (!cabeEn(soloLaPuerta, cruce.desde) || !cabeEn(soloLaPuerta, cruce.hasta)) continue;
        probada = true;
        if (andaDerecho(soloLaPuerta, cruce)) porElHuecoSolas++;
        else noPasanPorElHueco.push(donde);
        if (!andaDerecho(conLaPuertaCerrada, cruce)) cerradasParan++;
        else cerradasQueNoParan.push(donde);
        /* Y en el tablero de verdad, con las casas y los campos puestos. */
        if (cabeEn(d.arena, cruce.desde) && cabeEn(d.arena, cruce.hasta)) {
          enElTablero++;
          if (andaDerecho(d.arena, cruce)) enElTableroCruzan++;
          else noSeEntra.push(donde);
        }
        break;
      }
      if (!probada) noPasanPorElHueco.push(`${donde}: ningún lado de la puerta está en el tablero`);
    }
  }
  console.log(
    `  lienzos: ${String(cruces)} cruces concluyentes, ${String(paran)} paran · ${String(sinConcluir)} sin concluir ` +
      `(otra cosa estorba también sin el lienzo, o el otro lado está fuera del tablero)`,
  );
  console.log(
    `  puertas: ${String(puertas)} · por el hueco se pasa en ${String(porElHuecoSolas)} · cerradas paran ${String(cerradasParan)} · ` +
      `sus jambas paran ${String(jambasParan)} de ${String(jambasProbadas)} · en el tablero entero se entra por ${String(enElTableroCruzan)} de ${String(enElTablero)}`,
  );
  comprobar('ninguna pieza de muralla llega torcida: todas a cuartos de vuelta', torcidas === 0, { torcidas });
  comprobar('se han cruzado de verdad cientos de lienzos', cruces >= 500, { cruces });
  comprobar('y TODOS paran a quien va derecho contra ellos, que sin ellos cruzaría', noParan.length === 0 && paran === cruces, noParan.slice(0, 5));
  comprobar('hay puertas que probar', puertas >= 6, { puertas });
  comprobar('por el hueco de TODAS se pasa', noPasanPorElHueco.length === 0 && porElHuecoSolas === puertas, noPasanPorElHueco.slice(0, 5));
  comprobar('y cerradas, TODAS paran: es el hueco lo que deja pasar', cerradasQueNoParan.length === 0 && cerradasParan === puertas, cerradasQueNoParan.slice(0, 5));
  comprobar('y sus jambas paran como un lienzo', jambasProbadas >= 6 && jambasParan === jambasProbadas, { jambasProbadas, jambasParan });
  comprobar('y en el tablero de verdad, con todo puesto, se entra por ellas', enElTablero >= 3 && enElTableroCruzan === enElTablero, noSeEntra.slice(0, 5));
  console.log(`  ajuste: ${String(ajustesPasan)} de ${String(ajustesProbados)} cruces pasado el extremo de una pieza sola, o por el borde del hueco`);
  comprobar(
    'y ninguna pieza de muralla estorba más allá de lo dibujado: pasado su extremo, y por el hueco junto a las jambas, se pasa',
    ajustesProbados >= 500 && seSalen.length === 0,
    { ajustesProbados, seSalen: seSalen.slice(0, 5) },
  );
}

// ---------------------------------------------------------------------------
// ESCALÓN 5 · LAS PIEDRAS NO CIERRAN LO QUE SE ANDABA
// ---------------------------------------------------------------------------

paso('Las piedras no cierran lo que se andaba: ni una senda, ni el hueco de una puerta, ni un sitio de nacer');

/*
 * ═══ LO QUE NO PODÍA ROMPERSE ═══
 *
 * Que las piedras grandes paren arregla lo que se veía mal. Que una tape el paso rompería lo que
 * se andaba bien, y sería peor: una piedra en medio de una senda, en el hueco de una puerta de la
 * muralla o encima de un sitio de nacer deja a alguien sin poder ir por donde iba, o naciendo
 * dentro de un canto. Y no es un miedo de papel: la piedra y el tocón son dos de las cinco cosas
 * que el reparto pone en la cuneta de las sendas, y más de la mitad de las cajas nuevas son ésas.
 *
 * Se mira en lo que dicen el REPARTO y el SUELO —por dónde va el eje de cada senda y qué celdas
 * son senda, dónde puso cada puerta y cuánto mide su hueco—, y no preguntándole a las cajas:
 *
 *   · LA SENDA: por su eje, en cada tramo que pisa suelo de senda, quien anda no toca ninguna
 *     piedra. Se prueba cada dos décimas y se exige una décima de más sobre el radio, que es lo
 *     que se puede mover el cuadrado de quien anda entre dos pruebas: así vale para el eje entero
 *     y no sólo para los puntos probados. Una senda que se recorre por el medio no la tapa nada,
 *     por mucho que la cuneta se estreche.
 *   · LA PUERTA: en el pasillo de su hueco —lo que mide el hueco de ancho, y nueve unidades a
 *     cada lado del eje del muro, como en el escalón 4—, a cada cuarto de unidad de hondo, el paso
 *     libre de través. Donde sin las piedras cabía una persona, con ellas tiene que seguir cabiendo.
 *   · EL SITIO DE NACER: ninguno queda a menos de un radio de una piedra. Es lo que el escalón 3
 *     pide de todo cuerpo; aquí se cuenta aparte, para que no se diluya entre las casas.
 *
 * Y cada uno cuenta lo que ha mirado y exige que haya habido piedras que morder: metidas en el
 * ancho de una senda, en el pasillo de una puerta y cerca de los sitios de nacer. Sin ellas los
 * tres saldrían verdes con la regla apagada. Por las puertas se miran, además de los cuatro
 * tableros de siempre, los tres de `CON_PIEDRA_EN_LA_PUERTA`.
 */
{
  const radio = RADIO_DEL_PASEANTE / UNO;
  const medioAnchoDeLaSenda = (ANCHO_DE_LA_SENDA / 2) * LADO_DE_LOSA;
  /* Chebyshev: quien anda es un cuadrado, y toca una caja si su centro queda a menos de su radio. */
  const aLaCaja = (px: number, pz: number, b: Cuerpo): number => Math.max(b.x0 - px, px - b.x1, b.z0 - pz, pz - b.z1, 0);
  const cortan = (a: Cuerpo, b: Cuerpo): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
  const PASO_POR_EL_EJE = 0.2;

  let muestrasDelEje = 0;
  let masCercaDelEje = Number.POSITIVE_INFINITY;
  let dondeMasCerca = '';
  let piedrasDeLaCuneta = 0;
  const metidasEnLaSenda = new Set<Cuerpo>();
  const tocanElEje: string[] = [];

  let puertas = 0;
  let honduras = 0;
  let puertasConPiedra = 0;
  let menorPasoConPiedra = Number.POSITIVE_INFINITY;
  let menorPasoSinPiedra = Number.POSITIVE_INFINITY;
  const cierranPuertas: string[] = [];

  let nacesMirados = 0;
  let naceMasCercaDeUnaPiedra = Number.POSITIVE_INFINITY;
  let nacesConPiedraCerca = 0;
  const nacenEnUnaPiedra: string[] = [];

  for (const d of [...DERIVADOS, ...CON_PIEDRA_EN_LA_PUERTA.map(derivar)]) {
    const piedras: Cuerpo[] = [];
    const loDemas: Cuerpo[] = [];
    for (const c of d.conOrigen) {
      if (esPiedra(c.pieza)) {
        piedras.push(c.cuerpo);
        if (c.porque === 'senda') piedrasDeLaCuneta++;
      } else loDemas.push(c.cuerpo);
    }
    for (let n = 0; n < d.tablero.losas.length; n++) {
      const l = d.tablero.losas[n] as LosaParaElMundo;
      const cx = l.x * LADO_DE_LOSA;
      const cz = -l.y * LADO_DE_LOSA;
      const montada = montarLaLosa(l.losa, l.giro, semillaDeLaLosa(d.tablero.semilla, l.x, l.y));
      /* Las piedras que pueden asomar a esta losa, suyas o de una vecina. */
      const suCuadro: Cuerpo = { x0: cx - LADO_DE_LOSA / 2 - 1, x1: cx + LADO_DE_LOSA / 2 + 1, z0: cz - LADO_DE_LOSA / 2 - 1, z1: cz + LADO_DE_LOSA / 2 + 1 };
      const cerca = piedras.filter((b) => cortan(b, suCuadro));

      /* ── La senda, por su eje ── */
      const losa = losaPorId(l.losa);
      for (const senda of losa?.sendas ?? []) {
        const camino = caminoDeLaSenda(senda.lados.map((s) => ladoGirado(s, l.giro)));
        for (let k = 0; k + 1 < camino.length; k++) {
          const a = camino[k] as { x: number; z: number };
          const b = camino[k + 1] as { x: number; z: number };
          const ax = cx + a.x * LADO_DE_LOSA;
          const az = cz + a.z * LADO_DE_LOSA;
          const bx = cx + b.x * LADO_DE_LOSA;
          const bz = cz + b.z * LADO_DE_LOSA;
          const trozos = Math.ceil(Math.hypot(bx - ax, bz - az) / PASO_POR_EL_EJE);
          for (let t = 0; t <= trozos; t++) {
            const px = ax + ((bx - ax) * t) / trozos;
            const pz = az + ((bz - az) * t) / trozos;
            const i = Math.floor(((px - cx) / LADO_DE_LOSA + 0.5) * CELDAS_POR_LOSA);
            const j = Math.floor(((pz - cz) / LADO_DE_LOSA + 0.5) * CELDAS_POR_LOSA);
            if (i < 0 || j < 0 || i >= CELDAS_POR_LOSA || j >= CELDAS_POR_LOSA) continue;
            if (montada.celdas[j * CELDAS_POR_LOSA + i]?.clase !== 'senda') continue;
            muestrasDelEje++;
            for (const piedra of cerca) {
              const dd = aLaCaja(px, pz, piedra);
              if (dd < medioAnchoDeLaSenda) metidasEnLaSenda.add(piedra);
              if (dd < masCercaDelEje) {
                masCercaDelEje = dd;
                dondeMasCerca = `${d.tablero.nombre}, losa ${String(n)} (${l.losa}), en (${px.toFixed(1)}, ${pz.toFixed(1)})`;
              }
              if (dd < radio + PASO_POR_EL_EJE / 2 && tocanElEje.length < 10) {
                tocanElEje.push(`${d.tablero.nombre}, losa ${String(n)} (${l.losa}): una piedra a ${dd.toFixed(3)} del eje en (${px.toFixed(1)}, ${pz.toFixed(1)})`);
              }
            }
          }
        }
      }

      /* ── La puerta, por su hueco ── */
      for (const p of montada.puestas) {
        if (p.pieza !== PIEZA.muroPuerta) continue;
        const k = cuartosDeVuelta(p.giro);
        /* Una puerta torcida no tiene pasillo derecho; que no las hay lo exige el escalón 4. */
        if (k === null) continue;
        puertas++;
        const s = ESCALA_DEL_PACK * p.escala * p.largo;
        const h0 = HUECO_DE_LA_PUERTA.x0 * s;
        const h1 = HUECO_DE_LA_PUERTA.x1 * s;
        const x = cx + p.x;
        const z = cz + p.z;
        /* El hueco en el tablero, con el mismo giro que `cajasDeLaPuesta`; y de qué lado se cruza. */
        const deEsteAOeste = k === 0 || k === 2;
        const g0 = k === 0 ? x + h0 : k === 2 ? x - h1 : k === 1 ? z - h1 : z + h0;
        const g1 = k === 0 ? x + h1 : k === 2 ? x - h0 : k === 1 ? z - h0 : z + h1;
        const eje = deEsteAOeste ? z : x;
        const pasillo: Cuerpo = deEsteAOeste
          ? { x0: g0, x1: g1, z0: z - DESDE_EL_EJE - radio, z1: z + DESDE_EL_EJE + radio }
          : { x0: x - DESDE_EL_EJE - radio, x1: x + DESDE_EL_EJE + radio, z0: g0, z1: g1 };
        const susPiedras = piedras.filter((b) => cortan(b, pasillo));
        const loSuyo = loDemas.filter((b) => cortan(b, pasillo));
        if (susPiedras.length > 0) puertasConPiedra++;
        /*
         * El paso libre de través a una hondura: lo más ancho del hueco que no tapa ninguna caja a la
         * que quien anda llegaría con su cuadrado. Cabe una persona si mide dos radios.
         */
        const pasoLibre = (cajas: readonly Cuerpo[], hondo: number): number => {
          const tapado: [number, number][] = [];
          for (const b of cajas) {
            const lo = deEsteAOeste ? b.z0 : b.x0;
            const hi = deEsteAOeste ? b.z1 : b.x1;
            if (!(lo - radio < hondo && hondo < hi + radio)) continue;
            const u0 = Math.max(deEsteAOeste ? b.x0 : b.z0, g0);
            const u1 = Math.min(deEsteAOeste ? b.x1 : b.z1, g1);
            if (u0 < u1) tapado.push([u0, u1]);
          }
          tapado.sort((p0, p1) => p0[0] - p1[0]);
          let mejor = 0;
          let desde = g0;
          for (const [u0, u1] of tapado) {
            if (u0 > desde) mejor = Math.max(mejor, u0 - desde);
            if (u1 > desde) desde = u1;
          }
          return Math.max(mejor, g1 - desde);
        };
        for (let paso4 = -4 * DESDE_EL_EJE; paso4 <= 4 * DESDE_EL_EJE; paso4++) {
          const hondo = eje + paso4 / 4;
          honduras++;
          const sin = pasoLibre(loSuyo, hondo);
          if (sin < 2 * radio) continue;
          if (susPiedras.length === 0) continue;
          const con = pasoLibre([...loSuyo, ...susPiedras], hondo);
          if (con < menorPasoConPiedra) {
            menorPasoConPiedra = con;
            menorPasoSinPiedra = sin;
          }
          if (con < 2 * radio && cierranPuertas.length < 10) {
            cierranPuertas.push(`${d.tablero.nombre}, losa ${String(n)} (${l.losa}), a ${(paso4 / 4).toFixed(2)} del eje: ${con.toFixed(2)} libres de ${sin.toFixed(2)}`);
          }
        }
      }
    }

    /* ── Los sitios de nacer ── */
    for (const s of d.mundo.nace) {
      nacesMirados++;
      let suPiedra = Number.POSITIVE_INFINITY;
      for (const b of piedras) suPiedra = Math.min(suPiedra, aLaCaja(s.x, s.z, b));
      if (suPiedra < naceMasCercaDeUnaPiedra) naceMasCercaDeUnaPiedra = suPiedra;
      if (suPiedra < 4 * LADO_DE_CELDA) nacesConPiedraCerca++;
      if (suPiedra < radio && nacenEnUnaPiedra.length < 10) {
        nacenEnUnaPiedra.push(`${d.tablero.nombre}: en (${s.x.toFixed(1)}, ${s.z.toFixed(1)}), a ${suPiedra.toFixed(3)} de una piedra`);
      }
    }
  }

  console.log(
    `  sendas: ${String(muestrasDelEje)} puntos del eje sobre suelo de senda · ${String(piedrasDeLaCuneta)} piedras de cuneta, ` +
      `${String(metidasEnLaSenda.size)} metidas en el ancho de una senda · la más cerca del eje, a ${masCercaDelEje.toFixed(2)} u ` +
      `(${dondeMasCerca}): de los ${medioAnchoDeLaSenda.toFixed(2)} de medio ancho se come ${(medioAnchoDeLaSenda - masCercaDelEje).toFixed(2)}`,
  );
  console.log(
    `  puertas: ${String(puertas)}, ${String(honduras)} honduras de pasillo · ${String(puertasConPiedra)} con una piedra en el pasillo · ` +
      (Number.isFinite(menorPasoConPiedra)
        ? `el paso más estrecho que dejan, ${menorPasoConPiedra.toFixed(2)} u de ${menorPasoSinPiedra.toFixed(2)}`
        : 'ninguna estrecha el paso'),
  );
  console.log(
    `  nacer: ${String(nacesMirados)} sitios · ${String(nacesConPiedraCerca)} con una piedra a menos de cuatro celdas · ` +
      `el más pegado a una, a ${naceMasCercaDeUnaPiedra.toFixed(2)} u`,
  );
  comprobar('se ha recorrido el eje de las sendas de los siete tableros', muestrasDelEje > 20000, { muestrasDelEje });
  comprobar(
    'y hay piedras en la cuneta, metidas en el ancho de una senda: si no, esto no mira nada',
    piedrasDeLaCuneta > 200 && metidasEnLaSenda.size > 20,
    { piedrasDeLaCuneta, metidas: metidasEnLaSenda.size },
  );
  comprobar(
    `quien va por el eje de una senda no toca ninguna piedra: todas a más de un radio (${radio.toFixed(1)}) y una décima`,
    tocanElEje.length === 0 && masCercaDelEje >= radio + PASO_POR_EL_EJE / 2,
    { masCercaDelEje, tocanElEje: tocanElEje.slice(0, 5) },
  );
  comprobar('se han mirado los pasillos de las puertas', puertas >= 6 && honduras >= puertas * 70, { puertas, honduras });
  comprobar(
    'y en algunas hay una piedra en el pasillo: si no, lo de abajo no mira nada (ver `CON_PIEDRA_EN_LA_PUERTA`)',
    puertasConPiedra >= 2,
    { puertasConPiedra },
  );
  comprobar(
    'y ninguna piedra estrecha el hueco de una puerta por debajo de lo que pasa una persona, donde sin ella pasaba',
    cierranPuertas.length === 0,
    cierranPuertas.slice(0, 5),
  );
  comprobar('hay sitios de nacer con una piedra cerca: si no, lo de abajo no mira nada', nacesConPiedraCerca >= 5, {
    nacesConPiedraCerca,
    nacesMirados,
  });
  comprobar(
    'y ningún sitio de nacer queda a menos de un radio de una piedra',
    nacenEnUnaPiedra.length === 0 && naceMasCercaDeUnaPiedra >= radio,
    { naceMasCercaDeUnaPiedra, nacenEnUnaPiedra: nacenEnUnaPiedra.slice(0, 5) },
  );
}

/*
 * ═══ Y NO PARTEN EL VALLE ═══
 *
 * Lo de arriba mira los tres sitios donde una piedra haría más daño. Esto mira todo lo demás. En
 * una rejilla de medio paso sobre el tablero entero se apunta dónde cabe el centro de quien anda
 * —hay piso y ningún cuerpo a menos de su radio, la cuenta de `chocaConCuerpo`—, sin las piedras
 * y con ellas, y se cuenta en cuántos trozos queda cada trozo por el que se andaba. Una piedra que
 * cerrara el paso entre un árbol y una tapia partiría un trozo en dos; una que llenara un rincón
 * lo borraría. Ni una cosa ni la otra. Y cada sitio de nacer cae en el trozo grande del suyo:
 * nacer en un bolsillo sería nacer preso.
 *
 * La rejilla ve un paso si por él cabe algún centro de celda: los de más de 1,3 —dos radios y
 * media celda— los ve siempre, y un paso que se estrecha desde ahí por debajo de 0,8 lo cuenta
 * como cerrado. Lo que ya medía menos de 1,3 antes de las piedras puede escapársele: es la
 * frontera de medir con celdas, y está escrita para que nadie lea en su verde más de lo que dice.
 * Cuesta un segundo por tablero lleno; se miran los tres.
 */
{
  const radio = RADIO_DEL_PASEANTE / UNO;
  const CELDA = 0.5;
  let celdasMiradas = 0;
  let trozosNuevos = 0;
  let areaCortada = 0;
  let bolsillosBorrados = 0;
  let menorTrozoGrande = Number.POSITIVE_INFINITY;
  let nacesPresos = 0;
  let nacesMirados = 0;
  for (const d of DERIVADOS.slice(0, 3)) {
    const losas = d.tablero.losas;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const l of losas) {
      minX = Math.min(minX, l.x);
      maxX = Math.max(maxX, l.x);
      minY = Math.min(minY, l.y);
      maxY = Math.max(maxY, l.y);
    }
    const x0 = (minX - 0.5) * LADO_DE_LOSA;
    const z0 = (-maxY - 0.5) * LADO_DE_LOSA;
    const ancho = Math.ceil(((maxX - minX + 1) * LADO_DE_LOSA) / CELDA);
    const fondo = Math.ceil(((maxY - minY + 1) * LADO_DE_LOSA) / CELDA);
    const puestas = new Set(losas.map((l) => `${String(l.x)},${String(l.y)}`));
    const sinPiedras = new Uint8Array(ancho * fondo);
    for (let j = 0; j < fondo; j++) {
      const y = Math.floor(-(z0 + (j + 0.5) * CELDA) / LADO_DE_LOSA + 0.5);
      for (let i = 0; i < ancho; i++) {
        const x = Math.floor((x0 + (i + 0.5) * CELDA) / LADO_DE_LOSA + 0.5);
        if (puestas.has(`${String(x)},${String(y)}`)) sinPiedras[j * ancho + i] = 1;
      }
    }
    const tapar = (libre: Uint8Array, b: Cuerpo): void => {
      const i0 = Math.max(0, Math.floor((b.x0 - radio - x0) / CELDA - 0.5));
      const i1 = Math.min(ancho - 1, Math.ceil((b.x1 + radio - x0) / CELDA - 0.5));
      const j0 = Math.max(0, Math.floor((b.z0 - radio - z0) / CELDA - 0.5));
      const j1 = Math.min(fondo - 1, Math.ceil((b.z1 + radio - z0) / CELDA - 0.5));
      for (let j = j0; j <= j1; j++) {
        const z = z0 + (j + 0.5) * CELDA;
        if (!(z + radio > b.z0 && z - radio < b.z1)) continue;
        for (let i = i0; i <= i1; i++) {
          const x = x0 + (i + 0.5) * CELDA;
          if (x + radio > b.x0 && x - radio < b.x1) libre[j * ancho + i] = 0;
        }
      }
    };
    const piedras: Cuerpo[] = [];
    for (const c of d.conOrigen) {
      if (esPiedra(c.pieza)) piedras.push(c.cuerpo);
      else tapar(sinPiedras, c.cuerpo);
    }
    const conPiedras = sinPiedras.slice();
    for (const b of piedras) tapar(conPiedras, b);
    const cola = new Int32Array(ancho * fondo);
    /* Los trozos, a cuatro vecinas: una etiqueta por celda libre, y lo que mide cada trozo. */
    const trozos = (libre: Uint8Array): { etiqueta: Int32Array; mide: number[] } => {
      const etiqueta = new Int32Array(ancho * fondo).fill(-1);
      const mide: number[] = [];
      for (let k = 0; k < ancho * fondo; k++) {
        if (libre[k] !== 1 || etiqueta[k] !== -1) continue;
        const e = mide.length;
        let leida = 0;
        let puesta = 0;
        cola[puesta++] = k;
        etiqueta[k] = e;
        while (leida < puesta) {
          const q = cola[leida++] as number;
          const i = q % ancho;
          if (i > 0 && libre[q - 1] === 1 && etiqueta[q - 1] === -1) {
            etiqueta[q - 1] = e;
            cola[puesta++] = q - 1;
          }
          if (i < ancho - 1 && libre[q + 1] === 1 && etiqueta[q + 1] === -1) {
            etiqueta[q + 1] = e;
            cola[puesta++] = q + 1;
          }
          if (q >= ancho && libre[q - ancho] === 1 && etiqueta[q - ancho] === -1) {
            etiqueta[q - ancho] = e;
            cola[puesta++] = q - ancho;
          }
          if (q < ancho * (fondo - 1) && libre[q + ancho] === 1 && etiqueta[q + ancho] === -1) {
            etiqueta[q + ancho] = e;
            cola[puesta++] = q + ancho;
          }
        }
        mide.push(puesta);
      }
      return { etiqueta, mide };
    };
    const antes = trozos(sinPiedras);
    const despues = trozos(conPiedras);
    celdasMiradas += ancho * fondo;
    /* Cada trozo de después cae dentro de uno de antes: lo que no es el mayor de los suyos, se cortó. */
    const deCadaUno = new Map<number, Map<number, number>>();
    for (let k = 0; k < ancho * fondo; k++) {
      const b = despues.etiqueta[k] as number;
      if (b < 0) continue;
      const a = antes.etiqueta[k] as number;
      let suyos = deCadaUno.get(a);
      if (suyos === undefined) {
        suyos = new Map<number, number>();
        deCadaUno.set(a, suyos);
      }
      suyos.set(b, (suyos.get(b) ?? 0) + 1);
    }
    const elGrande = new Map<number, number>();
    for (const [a, suyos] of deCadaUno) {
      let mejor = -1;
      let cuanto = -1;
      for (const [b, c] of suyos) {
        if (c > cuanto) {
          cuanto = c;
          mejor = b;
        }
      }
      elGrande.set(a, mejor);
      for (const [b, c] of suyos) {
        if (b === mejor) continue;
        trozosNuevos++;
        areaCortada += c * CELDA * CELDA;
      }
    }
    for (let a = 0; a < antes.mide.length; a++) if (!deCadaUno.has(a)) bolsillosBorrados++;
    menorTrozoGrande = Math.min(menorTrozoGrande, Math.max(...antes.mide) * CELDA * CELDA);
    for (const s of d.mundo.nace) {
      nacesMirados++;
      const k = Math.floor((s.z - z0) / CELDA) * ancho + Math.floor((s.x - x0) / CELDA);
      const b = despues.etiqueta[k] as number;
      if (b < 0 || elGrande.get(antes.etiqueta[k] as number) !== b) nacesPresos++;
    }
  }
  console.log(
    `  el valle en celdas de ${String(CELDA)}: ${(celdasMiradas / 1e6).toFixed(1)} millones mirados, el trozo grande de cada tablero de ` +
      `${(menorTrozoGrande / 1e6).toFixed(2)} millones de u² o más · trozos nuevos con las piedras ${String(trozosNuevos)} ` +
      `(${areaCortada.toFixed(1)} u²) · bolsillos borrados ${String(bolsillosBorrados)} · sitios de nacer presos ${String(nacesPresos)} de ${String(nacesMirados)}`,
  );
  comprobar('se ha mirado el valle entero de los tres tableros llenos', celdasMiradas > 3e7 && menorTrozoGrande > 1e6, {
    celdasMiradas,
    menorTrozoGrande,
  });
  comprobar(
    'y las piedras no parten ningún trozo por el que se andaba, ni borran ninguno',
    trozosNuevos === 0 && bolsillosBorrados === 0,
    { trozosNuevos, areaCortada, bolsillosBorrados },
  );
  comprobar('y todos los sitios de nacer caen en el trozo grande del suyo', nacesPresos === 0 && nacesMirados > 200, {
    nacesPresos,
    nacesMirados,
  });
}

// ---------------------------------------------------------------------------
// ESCALÓN 6 · EL MISMO PASEO, EN NODE Y EN HERMES
// ---------------------------------------------------------------------------

paso('El mismo mundo y el mismo paseo, en Node y en Hermes');

const PARA_LOS_MOTORES: Tablero[] = [TABLEROS[0] as Tablero, TABLEROS[3] as Tablero];
/*
 * El paseo canoniza el mundo, y un mundo que no canoniza LANZA. Se recoge como un fallo más y
 * no como una caída: una caída a mitad de guion se come el resumen de lo que ya había fallado.
 */
let enProceso: PaseoDeLasLindes[] = [];
try {
  enProceso = PARA_LOS_MOTORES.map((t) => pasearLasLindes(t.losas, t.semilla));
} catch (e) {
  comprobar('el paseo se puede correr en proceso', false, String(e).slice(0, 300));
}

if (enProceso.length === PARA_LOS_MOTORES.length) {
  const lleno = enProceso[0] as PaseoDeLasLindes;
  const d = DERIVADOS[0] as Derivado;
  const porClase = new Map<string, number>();
  lleno.paradasPorCuerpo.forEach((veces, i) => {
    if (veces === 0) return;
    const c = d.conOrigen[i];
    const clase = c === undefined ? '¿?' : c.porque;
    porClase.set(clase, (porClase.get(clase) ?? 0) + veces);
  });
  console.log(
    `  ${String(lleno.nace)} losas · parado por un cuerpo ${String(lleno.porCuerpo)} · por el borde ${String(lleno.porBorde)} · ` +
      `resbalando ${String(lleno.resbalados)} · ${String(lleno.rumbosAndados)} rumbos`,
  );
  console.log(`  contra qué: ${JSON.stringify([...porClase].sort((a, b) => b[1] - a[1]))}`);
  /* LOS SUELOS: sin ellos, un paseante al que no para nada firmaría lo mismo en los dos motores. */
  comprobar('a los CUERPOS los ha tropezado de verdad', lleno.porCuerpo >= 500, { porCuerpo: lleno.porCuerpo });
  comprobar('y el BORDE del tablero también lo ha parado', lleno.porBorde >= 20, { porBorde: lleno.porBorde });
  comprobar('y ha resbalado pegado a algo', lleno.resbalados >= 500, { resbalados: lleno.resbalados });
  comprobar(
    'y lo han parado murallas, villas y campos, no una sola clase de cosa',
    ['muralla', 'villa', 'prado'].every((k) => (porClase.get(k) ?? 0) > 0),
    [...porClase],
  );
  comprobar('y no se ha salido del tablero ni una vez', lleno.fuera === 0, { fuera: lleno.fuera });
  comprobar('y en todos los sitios de nacer a los que saltó se podía estar', lleno.nacerMalo === 0, { nacerMalo: lleno.nacerMalo });
  comprobar('y ha andado rumbos de toda la tabla', lleno.rumbosAndados >= 100, { rumbosAndados: lleno.rumbosAndados });
}

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
  'falta `hermes-engine-cli`. SIN ÉL ESTO NO COMPARA DOS MOTORES, y es la mitad de lo que este guion afirma.',
);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lindes-mundo-'));
const entrada = path.join(dir, 'entrada.ts');
const crudo = path.join(dir, 'crudo.js');

/*
 * Se empaqueta el MISMO paseo que acaba de correr en proceso, con las losas de los dos tableros
 * escritas dentro: el robot no hace falta en Hermes, y lo que se compara es el mundo y el paseo,
 * no la partida.
 */
fs.writeFileSync(
  entrada,
  `import { pasearLasLindes } from ${JSON.stringify(path.join(AQUI, 'paseo-de-las-lindes.ts').replace(/\\/g, '/'))};\n` +
    `const TABLEROS = ${JSON.stringify(PARA_LOS_MOTORES.map((t) => ({ losas: t.losas, semilla: t.semilla })))};\n` +
    'const r = TABLEROS.map((t) => pasearLasLindes(t.losas, t.semilla));\n' +
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
  /*
   * `class` se baja a funciones con UN complemento, como en `verify:mundo` y `verify:determinismo`:
   * Hermes 0.12 no la entiende y aquí la traen `fijo.ts` y `canonico.ts`. La pasada se hace UNA
   * vez, sobre el paquete que ejecutan LOS DOS: si no, se estaría midiendo a Babel.
   */
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
    comprobar('y se bajan a funciones, que es lo único que Hermes 0.12 no entiende', codigo.length > 0);
    if (codigo.length > 0) fs.writeFileSync(crudo, codigo, 'utf8');
  }
}

if (paqueteListo && hermes !== null && enProceso.length === PARA_LOS_MOTORES.length) {
  const enNode = spawnSync(process.execPath, [crudo], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const enHermes = spawnSync(hermes, [crudo], { encoding: 'utf8', maxBuffer: 1 << 26 });
  comprobar('Node ejecuta el paquete sin caerse', enNode.status === 0, enNode.stderr.slice(0, 400));
  comprobar('Hermes ejecuta el paquete sin caerse', enHermes.status === 0, enHermes.stderr.slice(0, 400));
  const leer = (s: string): PaseoDeLasLindes[] | null => {
    const linea = s.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(linea) as PaseoDeLasLindes[];
    } catch {
      return null;
    }
  };
  const a = leer(enNode.stdout);
  const b = leer(enHermes.stdout);
  comprobar('las dos tandas dicen algo', a !== null && b !== null && a.length === 2 && b.length === 2, {
    node: enNode.stdout.slice(-200),
    hermes: enHermes.stdout.slice(-200),
  });
  if (a !== null && b !== null && a.length === 2 && b.length === 2) {
    for (let k = 0; k < 2; k++) {
      const n = a[k] as PaseoDeLasLindes;
      const h = b[k] as PaseoDeLasLindes;
      const p = enProceso[k] as PaseoDeLasLindes;
      const nombre = (PARA_LOS_MOTORES[k] as Tablero).nombre;
      console.log(`  ${nombre}`);
      console.log(
        `    Node   · mundo ${String(n.huellaDelMundo)} · paseo ${String(n.huella)} · cuerpo ${String(n.porCuerpo)} · borde ${String(n.porBorde)} · resbalando ${String(n.resbalados)}`,
      );
      console.log(
        `    Hermes · mundo ${String(h.huellaDelMundo)} · paseo ${String(h.huella)} · cuerpo ${String(h.porCuerpo)} · borde ${String(h.porBorde)} · resbalando ${String(h.resbalados)}`,
      );
      /* El suelo otra vez, del lado de fuera: un paquete que no choca no compara nada. */
      comprobar(`${nombre}: en los dos motores lo tropiezan los cuerpos`, h.porCuerpo >= 20 && n.porCuerpo >= 20, {
        node: n.porCuerpo,
        hermes: h.porCuerpo,
      });
      comprobar(
        `${nombre}: el MUNDO es el mismo en Node y en Hermes`,
        n.huellaDelMundo === h.huellaDelMundo && n.pesoDelMundo === h.pesoDelMundo,
        { node: n.huellaDelMundo, hermes: h.huellaDelMundo },
      );
      comprobar(`${nombre}: la huella del paseo es la MISMA en Node y en Hermes`, n.huella === h.huella, { node: n.huella, hermes: h.huella });
      comprobar(`${nombre}: y se chocó las mismas veces contra lo mismo, cuerpo a cuerpo`, JSON.stringify(n) === JSON.stringify(h));
      comprobar(`${nombre}: y el paquete da lo mismo que el código sin empaquetar`, JSON.stringify(n) === JSON.stringify(p), {
        empaquetado: n.huella,
        enProceso: p.huella,
      });
    }
  }
}

fs.rmSync(dir, { recursive: true, force: true });

// ---------------------------------------------------------------------------
// ESCALÓN 7 · LA TABLA DE HUELLAS ES LA DE LOS MODELOS
// ---------------------------------------------------------------------------

paso('La tabla de huellas dice lo que miden los modelos de tablero.glb');

{
  const medidas = await medirLasHuellas();
  const enLaTabla = Object.keys(HUELLA_DEL_MODELO).sort(porOrden);
  const medidasAhora = Object.keys(medidas.huellas).sort(porOrden);
  const triangulos = Object.values(medidas.triangulos).reduce((s, n) => s + n, 0);
  console.log(
    `  ${String(medidasAhora.length)} modelos medidos otra vez · ${String(triangulos)} triángulos cortados a ${medidas.altura.toFixed(4)} del pack`,
  );
  comprobar('se han medido los modelos de verdad, no cero triángulos', medidasAhora.length >= 20 && triangulos > 10000, {
    modelos: medidasAhora.length,
    triangulos,
  });
  comprobar(
    'la tabla tiene exactamente las piezas que estorban, ni una más ni una menos',
    JSON.stringify(enLaTabla) === JSON.stringify(medidasAhora),
    { tabla: enLaTabla, medidas: medidasAhora },
  );
  const distintas: string[] = [];
  for (const pieza of medidasAhora) {
    const t = HUELLA_DEL_MODELO[pieza];
    const m = medidas.huellas[pieza];
    if (t === undefined || m === undefined) continue;
    if (t.x0 !== m.x0 || t.x1 !== m.x1 || t.z0 !== m.z0 || t.z1 !== m.z1) {
      distintas.push(`${pieza}: tabla ${JSON.stringify(t)} · modelo ${JSON.stringify(m)}`);
    }
  }
  comprobar(
    'y cada huella es, al diezmilésimo, la que da el modelo: si se recompila el pack, se vuelve a medir',
    distintas.length === 0,
    distintas.slice(0, 5),
  );
  comprobar(
    'el hueco de la puerta es el que da el modelo',
    HUECO_DE_LA_PUERTA.x0 === medidas.hueco.x0 && HUECO_DE_LA_PUERTA.x1 === medidas.hueco.x1,
    { tabla: HUECO_DE_LA_PUERTA, modelo: medidas.hueco },
  );
  comprobar('y la altura a la que se midió es la de ahora', ALTURA_DE_LA_HUELLA_EN_PACK === medidas.altura, {
    tabla: ALTURA_DE_LA_HUELLA_EN_PACK,
    ahora: medidas.altura,
  });
  const sinMedir = (Object.values(PIEZA) as string[]).filter((p) => comoEstorba(p) !== 'nada' && HUELLA_DEL_MODELO[p] === undefined);
  comprobar('toda pieza del vocabulario que estorba tiene huella', sinMedir.length === 0, sinMedir);

  /*
   * Y DE LAS PIEDRAS, EL ALTO Y EL RADIO: de exactamente las piezas que estorban sólo si pasan de
   * la cintura, y los mismos números que dan los modelos. Y lo que la cabecera de `comoEstorba` da
   * por hecho: que de ellas se mide la planta ENTERA, porque son más bajas que la altura de la huella.
   */
  const piedrasDelVocabulario = (Object.values(PIEZA) as string[]).filter(esPiedra).sort(porOrden);
  const piedrasEnLaTabla = Object.keys(ALTO_Y_RADIO_DEL_MODELO).sort(porOrden);
  const piedrasMedidas = Object.keys(medidas.altosYRadios).sort(porOrden);
  console.log(
    `  alto y radio de ${String(piedrasMedidas.length)} piedras: ` +
      piedrasMedidas
        .map((p) => {
          const m = medidas.altosYRadios[p];
          return m === undefined ? p : `${p} ${m.alto.toFixed(4)}/${m.radio.toFixed(4)}`;
        })
        .join(' · '),
  );
  comprobar(
    'la tabla del alto y el radio tiene exactamente las piedras, las rocas y los tocones, ni una más ni una menos',
    piedrasDelVocabulario.length >= 7 &&
      JSON.stringify(piedrasEnLaTabla) === JSON.stringify(piedrasMedidas) &&
      JSON.stringify(piedrasMedidas) === JSON.stringify(piedrasDelVocabulario),
    { tabla: piedrasEnLaTabla, medidas: piedrasMedidas, vocabulario: piedrasDelVocabulario },
  );
  const altosDistintos: string[] = [];
  const masAltasQueLaHuella: string[] = [];
  for (const pieza of piedrasMedidas) {
    const t = ALTO_Y_RADIO_DEL_MODELO[pieza];
    const m = medidas.altosYRadios[pieza];
    const crudo = medidas.altosYRadiosCrudos[pieza];
    if (t === undefined || m === undefined || crudo === undefined) continue;
    if (t.alto !== m.alto || t.radio !== m.radio) altosDistintos.push(`${pieza}: tabla ${JSON.stringify(t)} · modelo ${JSON.stringify(m)}`);
    if (!(crudo.alto < medidas.altura)) masAltasQueLaHuella.push(`${pieza}: ${crudo.alto.toFixed(4)} del pack`);
  }
  comprobar('y cada alto y cada radio es, al diezmilésimo, el que da el modelo', altosDistintos.length === 0, altosDistintos.slice(0, 5));
  comprobar(
    `y todas son más bajas que la altura de la huella (${medidas.altura.toFixed(4)}): lo que se mide de ellas es su planta entera`,
    masAltasQueLaHuella.length === 0,
    masAltasQueLaHuella,
  );
}

// ---------------------------------------------------------------------------
// ESCALÓN 8 · LAS DOS TABLAS LITERALES DEL REPARTO
// ---------------------------------------------------------------------------

paso('Las tablas literales del reparto dicen lo que dice su cabecera');

{
  /* Aquí SÍ se calcula el seno: esto es un comprobador, corre en un solo motor y no decide nada. */
  let peor = 0;
  const n = DIRECCIONES_DE_LA_PLAZA.length;
  for (let k = 0; k < n; k++) {
    const d = DIRECCIONES_DE_LA_PLAZA[k] as readonly [number, number];
    const a = ((k + 0.5) * Math.PI * 2) / n;
    peor = Math.max(peor, Math.abs(d[0] - Math.sin(a)), Math.abs(d[1] - Math.cos(a)));
  }
  comprobar('la plaza sortea entre 64 direcciones', n === 64, { n });
  /*
   * A medio decimal del último escrito, y no «a una billonésima»: la tabla va redondeada a doce
   * decimales, así que su error es como mucho 5·10⁻¹³, y un dígito cambiado lo lleva por encima.
   * Con una billonésima de tolerancia, cambiar el último dígito de una entrada pasaba en verde:
   * se vio rompiéndola.
   */
  comprobar('y cada una es el seno y el coseno del centro de su sector, al último decimal escrito', peor < 5.01e-13, { peor });

  let tramos = 0;
  const distintos: string[] = [];
  for (const losa of LAS_LOSAS) {
    for (const giro of [0, 1, 2, 3] as Giro[]) {
      for (const senda of losa.sendas) {
        const camino = caminoDeLaSenda(senda.lados.map((l) => ladoGirado(l, giro)));
        for (let i = 0; i + 1 < camino.length; i++) {
          const p = camino[i] as { x: number; z: number };
          const q = camino[i + 1] as { x: number; z: number };
          const dx = q.x - p.x;
          const dz = q.z - p.z;
          tramos++;
          const tabla = rumboDelTramo(dx, dz);
          const arco = Math.atan2(dx, -dz);
          if (tabla !== arco) distintos.push(`${losa.id} giro ${String(giro)} tramo ${String(i)}: tabla ${String(tabla)} · atan2 ${String(arco)}`);
        }
      }
    }
  }
  console.log(`  ${String(tramos)} tramos de senda comparados contra Math.atan2`);
  comprobar('se han comparado los tramos de todas las sendas del catálogo', tramos >= 150, { tramos });
  comprobar('y el rumbo de cada tramo es, al bit, el del arcotangente', distintos.length === 0, distintos.slice(0, 5));

  comprobar('el lado de la losa del mundo es el de siempre', LADO_DE_LOSA_DEL_MUNDO === 175.0021505376344, { lado: LADO_DE_LOSA_DEL_MUNDO });
  comprobar('y es el mismo número que el de la escena, no una copia', LADO_DE_ESCENAS === LADO_DE_LOSA_DEL_MUNDO);
  comprobar('y la escala del pack es la misma en la escena y aquí', ESCALA_DE_ESCENAS === ESCALA_DEL_PACK, {
    escena: ESCALA_DE_ESCENAS,
    shared: ESCALA_DEL_PACK,
  });
}

// ---------------------------------------------------------------------------
// ESCALÓN 9 · MUCHAS MESAS CUESTAN LO QUE UNA CALIENTE
// ---------------------------------------------------------------------------

paso('Muchas mesas en rueda cuestan lo que una caliente, y la memoria no pasa de su tope');

/*
 * ═══ POR QUÉ SE CUENTA Y NO SE CRONOMETRA ═══
 *
 * El servidor deriva el mundo de cada mesa de botas cada vez que cambia. Con las memorias viejas,
 * que eran del proceso —512 losas del reparto, 1.024 de cajas y de sitios de nacer—, a partir de
 * ocho mesas llenas en rueda cada jugada volvía a montar el tablero en frío: con veinte, 66 losas
 * montadas, 66 cajas y 66 sitios de nacer POR JUGADA. Aquí se exigen cuentas —losas montadas,
 * losas cuyas cajas se sacan, sitios de nacer buscados, arenas levantadas—, que salen iguales en
 * una máquina ocupada y en una parada. Un cronómetro, no.
 *
 * ═══ Y LAS DEL REPARTO, DEL REPARTO QUE USA EL MUNDO ═══
 *
 * `tsx` carga DOS VECES los módulos de `shared/` cuando los pide un guion ESM como éste: una copia
 * para los `import` de este guion y otra para los que se hacen entre ellos, que van por `require`
 * porque `shared/` no es un paquete ESM. Cada copia tiene su memoria y sus cuentas, así que un
 * `cuentasDelReparto` importado arriba NO ve lo que monta `mundoDeLasLindes`: se escribió así
 * primero y dio cero losas montadas al abrir dieciséis mesas en frío. El reparto del mundo es el de
 * `require`, y de él se leen las cuentas y se monta lo que «pinta la escena». En el servidor, que se
 * empaqueta con esbuild, y en el aparato, hay una sola copia. Si un día `tsx` las junta o las separa
 * de otra manera, el suelo de abajo —abrir dieciséis mesas en frío SÍ monta losas— se pone rojo.
 */
const repartoDelMundo = createRequire(import.meta.url)(
  '../../shared/arcade/juegos/lindes-reparto',
) as typeof import('../../shared/arcade/juegos/lindes-reparto');

interface Trabajo {
  readonly montadas: number;
  readonly cajas: number;
  readonly nacimientos: number;
  readonly arenas: number;
}

function trabajoHastaAhora(): Trabajo {
  const r = repartoDelMundo.cuentasDelReparto();
  const m = cuentasDelMundo();
  return { montadas: r.montadas, cajas: m.cajasCalculadas, nacimientos: m.nacimientosCalculados, arenas: m.arenasParaNacer };
}

/** Hace algo y dice lo que ha costado, contado. */
function contado<T>(hacer: () => T): { readonly valor: T; readonly trabajo: Trabajo } {
  const a = trabajoHastaAhora();
  const valor = hacer();
  const b = trabajoHastaAhora();
  return {
    valor,
    trabajo: {
      montadas: b.montadas - a.montadas,
      cajas: b.cajas - a.cajas,
      nacimientos: b.nacimientos - a.nacimientos,
      arenas: b.arenas - a.arenas,
    },
  };
}

/** Una mesa de la rueda: su código, su semilla, y sus losas en el orden de la vista con cuándo se puso cada una. */
interface MesaEnRueda {
  readonly codigo: string;
  readonly semilla: number;
  readonly conOrden: readonly { readonly losa: LosaParaElMundo; readonly orden: number }[];
  /** Los `orden` de todas, de menor a mayor. */
  readonly ordenes: readonly number[];
  /** Cuántas hay puestas ahora. */
  puestas: number;
}

/** Una mesa con el tablero de una partida del robot y un código propio: otro paisaje, otras losas que montar. */
function mesaEnRueda(partida: number, codigo: string): MesaEnRueda {
  const p = partidaDelRobot(partida);
  const conOrden: { losa: LosaParaElMundo; orden: number }[] = [];
  for (const llave of Object.keys(p.estado.tablero).sort(porOrden)) {
    const puesta = p.estado.tablero[llave];
    const c = casillaDeLlave(llave);
    if (puesta === undefined || c === null) continue;
    conOrden.push({ losa: { x: c.x, y: c.y, losa: puesta.losa, giro: puesta.giro }, orden: puesta.orden });
  }
  const ordenes = conOrden.map((e) => e.orden).sort((a, b) => a - b);
  return { codigo, semilla: semillaDelCodigo(codigo, 0x5eed), conOrden, ordenes, puestas: conOrden.length };
}

/** El tablero de una mesa con sus `puestas` primeras losas, en el orden de la vista: por casilla. */
function tableroEnRueda(m: MesaEnRueda): LosaParaElMundo[] {
  if (m.puestas <= 0) return [];
  const hasta = m.ordenes[Math.min(m.puestas, m.ordenes.length) - 1] as number;
  return m.conOrden.filter((e) => e.orden <= hasta).map((e) => e.losa);
}

const sumaDe = (l: readonly Trabajo[], k: keyof Trabajo): number => l.reduce((s, t) => s + t[k], 0);
const porJugada = (l: readonly Trabajo[], k: keyof Trabajo): string => (l.length === 0 ? '—' : (sumaDe(l, k) / l.length).toFixed(2));

/*
 * LA RUEDA: cuatro partidas del robot, cada una en cuatro mesas con su código —dieciséis paisajes,
 * más de mil cien losas distintas—. Se abren con todas sus losas menos las seis últimas, y luego,
 * de una en una y cada vez en la mesa siguiente, se ponen esas seis: seis vueltas.
 */
const RUEDA: MesaEnRueda[] = [];
for (const partida of [1, 2, 3, 10]) {
  for (let k = 0; k < 4; k++) RUEDA.push(mesaEnRueda(partida, `RUEDA-${String(partida)}-${String(k)}`));
}
const LOSAS_EN_LA_RUEDA = RUEDA.reduce((s, m) => s + m.conOrden.length, 0);
const QUEDAN = 6;
comprobar(
  'la rueda tiene más losas distintas de las que cabían en las memorias viejas del proceso (1.024)',
  RUEDA.length >= 16 && LOSAS_EN_LA_RUEDA > 1024 && new Set(RUEDA.map((m) => m.semilla)).size === RUEDA.length,
  { mesas: RUEDA.length, losas: LOSAS_EN_LA_RUEDA },
);

for (const m of RUEDA) m.puestas = m.conOrden.length - QUEDAN;
const alAbrir = contado(() => {
  for (const m of RUEDA) mundoDeLasLindes(tableroEnRueda(m), m.semilla);
}).trabajo;

/*
 * Poner losa, en rueda. Y en la ÚLTIMA mesa de la rueda, cada mundo se compara con el que sale en
 * frío —con una memoria nueva—: poner losa obliga a volver a buscar dónde se nace en la nueva y en
 * sus vecinas, y un vecindario que no se volviera a mirar dejaría un sitio viejo. La última porque
 * sus losas son las que el reparto aún recuerda: compararla no vuelve a montar nada.
 */
const conLosa: Trabajo[] = [];
const vigilada = RUEDA[RUEDA.length - 1] as MesaEnRueda;
let comparadasPasoAPaso = 0;
const distintasPasoAPaso: string[] = [];
for (let vuelta = 0; vuelta < QUEDAN; vuelta++) {
  for (const m of RUEDA) {
    m.puestas++;
    const tablero = tableroEnRueda(m);
    const hecho = contado(() => mundoDeLasLindes(tablero, m.semilla));
    conLosa.push(hecho.trabajo);
    if (m !== vigilada) continue;
    comparadasPasoAPaso++;
    const enFrio = mundoDeLasLindes(tablero, m.semilla, memoriaDeLasLindes(LOSAS_QUE_SE_RECUERDAN));
    if (canonico(hecho.valor) !== canonico(enFrio)) distintasPasoAPaso.push(`${m.codigo} con ${String(tablero.length)} losas`);
  }
}

/* Y dos vueltas de jugadas que no ponen losa: plantar, pasar o un botín cambian la revisión, no el tablero. */
const sinLosa: Trabajo[] = [];
for (let vuelta = 0; vuelta < 2; vuelta++) {
  for (const m of RUEDA) sinLosa.push(contado(() => mundoDeLasLindes(tableroEnRueda(m), m.semilla)).trabajo);
}

console.log(
  `  ${String(RUEDA.length)} mesas en rueda, ${String(LOSAS_EN_LA_RUEDA)} losas: al abrirlas, ` +
    `${(alAbrir.montadas / RUEDA.length).toFixed(1)} losas montadas por mesa`,
);
console.log(
  `  poniendo losa (${String(conLosa.length)} jugadas), por jugada: ${porJugada(conLosa, 'montadas')} montadas · ` +
    `${porJugada(conLosa, 'cajas')} cajas · ${porJugada(conLosa, 'nacimientos')} sitios de nacer · ${porJugada(conLosa, 'arenas')} arenas`,
);
console.log(
  `  sin poner losa (${String(sinLosa.length)} jugadas), por jugada: ${porJugada(sinLosa, 'montadas')} montadas · ` +
    `${porJugada(sinLosa, 'cajas')} cajas · ${porJugada(sinLosa, 'nacimientos')} sitios de nacer · ${porJugada(sinLosa, 'arenas')} arenas`,
);
/* EL SUELO: abrir las mesas SÍ las monta. Si no, las cuentas no estarían contando nada. */
comprobar(
  'abrir las mesas en frío las monta enteras: las cuentas son las del reparto que usa el mundo',
  alAbrir.montadas >= RUEDA.length * 50 && alAbrir.cajas >= RUEDA.length * 50,
  alAbrir,
);
{
  const malas = conLosa.filter((t) => t.montadas !== 1 || t.cajas !== 1 || t.arenas !== 1 || t.nacimientos < 1 || t.nacimientos > 9);
  comprobar(
    `con ${String(RUEDA.length)} mesas en rueda, poner una losa monta UNA, saca las cajas de UNA y busca dónde nacer en ella y en sus vecinas: lo de una mesa caliente`,
    conLosa.length === RUEDA.length * QUEDAN && malas.length === 0,
    { jugadas: conLosa.length, malas: malas.length, laPrimera: malas[0] },
  );
}
{
  const malas = sinLosa.filter((t) => t.montadas !== 0 || t.cajas !== 0 || t.nacimientos !== 0 || t.arenas !== 0);
  comprobar(
    'y una jugada que no pone losa —plantar, pasar, un botín— no monta, no saca cajas ni busca dónde nacer',
    sinLosa.length === RUEDA.length * 2 && malas.length === 0,
    { jugadas: sinLosa.length, malas: malas.length, laPrimera: malas[0] },
  );
}
comprobar(
  'y en cada losa puesta, el mundo que sale de memoria es, bit a bit, el que sale en frío',
  comparadasPasoAPaso === QUEDAN && distintasPasoAPaso.length === 0,
  { comparadas: comparadasPasoAPaso, distintas: distintasPasoAPaso },
);
{
  const distintas: string[] = [];
  for (const m of RUEDA) {
    const tablero = tableroEnRueda(m);
    const deMemoria = canonico(mundoDeLasLindes(tablero, m.semilla));
    const enFrio = canonico(mundoDeLasLindes(tablero, m.semilla, memoriaDeLasLindes(LOSAS_QUE_SE_RECUERDAN)));
    if (deMemoria !== enFrio) distintas.push(m.codigo);
  }
  comprobar(`y tras la rueda, el de las ${String(RUEDA.length)} mesas también`, distintas.length === 0, distintas);
}
{
  const lo = loQueSeRecuerda();
  console.log(`  la memoria del proceso: ${String(lo.mesas)} mesas · ${String(lo.losas)} losas de ${String(lo.tope)} · ${String(lo.olvidadas)} olvidadas`);
  comprobar(
    'la memoria del proceso guarda las mesas de la rueda enteras y no pasa de su tope',
    lo.tope === LOSAS_QUE_SE_RECUERDAN && lo.mesas >= RUEDA.length && lo.losas >= LOSAS_EN_LA_RUEDA && lo.losas <= lo.tope,
    lo,
  );
}

/*
 * EL TOPE, con una memoria aparte en la que caben TRES mesas llenas: con el de verdad harían falta
 * más de cien mesas en frío para verlo actuar. Cinco mesas en rueda, y luego a ver cuál sale.
 */
{
  const chica = memoriaDeLasLindes(3 * LOSAS_EN_TOTAL);
  const lleno = (m: MesaEnRueda): LosaParaElMundo[] => m.conOrden.map((e) => e.losa);
  const loQueHay = (): number => {
    let s = 0;
    for (const suyas of chica.mesas.values()) s += suyas.size;
    return s;
  };
  const cinco = RUEDA.slice(0, 5);
  let pasadas = 0;
  let descuadres = 0;
  for (const m of cinco) {
    mundoDeLasLindes(lleno(m), m.semilla, chica);
    if (chica.losas > chica.tope) pasadas++;
    if (chica.losas !== loQueHay()) descuadres++;
  }
  const trasLaVuelta = loQueSeRecuerda(chica);
  comprobar(
    'con sitio para tres mesas llenas y cinco en rueda, nunca se pasa del tope, y lo que cuenta es lo que hay',
    pasadas === 0 && descuadres === 0 && trasLaVuelta.mesas === 3 && trasLaVuelta.olvidadas === 2,
    { pasadas, descuadres, ...trasLaVuelta },
  );
  const [a, , c, d] = cinco as [MesaEnRueda, MesaEnRueda, MesaEnRueda, MesaEnRueda, MesaEnRueda];
  /* Quedan la tercera, la cuarta y la quinta. Se vuelve a jugar la tercera: pasa a ser la más reciente. */
  const vuelveLaTercera = contado(() => mundoDeLasLindes(lleno(c), c.semilla, chica)).trabajo;
  /* Vuelve la primera, que no cabe: sale entera la cuarta, que es la que más tiempo lleva sin jugarse. */
  const vuelveLaPrimera = contado(() => mundoDeLasLindes(lleno(a), a.semilla, chica)).trabajo;
  const otraVezLaTercera = contado(() => mundoDeLasLindes(lleno(c), c.semilla, chica)).trabajo;
  const vuelveLaCuarta = contado(() => mundoDeLasLindes(lleno(d), d.semilla, chica)).trabajo;
  comprobar(
    'y sale entera la mesa que más tiempo lleva sin jugarse: la que se acaba de jugar sigue caliente',
    vuelveLaTercera.cajas === 0 &&
      otraVezLaTercera.cajas === 0 &&
      vuelveLaPrimera.cajas === lleno(a).length &&
      vuelveLaCuarta.cajas === lleno(d).length,
    { vuelveLaTercera, vuelveLaPrimera, otraVezLaTercera, vuelveLaCuarta },
  );
  /* Una partida rebobinada: la tercera vuelve a diez losas, y su mesa suelta las demás. */
  const antesDeRebobinar = chica.losas;
  mundoDeLasLindes(lleno(c).slice(0, 10), c.semilla, chica);
  comprobar(
    'y si un tablero pierde losas —una partida rebobinada—, su mesa deja de recordarlas',
    chica.losas === antesDeRebobinar - (lleno(c).length - 10) && chica.losas === loQueHay(),
    { antes: antesDeRebobinar, ahora: chica.losas, deVerdad: loQueHay() },
  );
}

/*
 * EL APARATO: una mesa sola, como en el móvil. La escena monta cada losa para pintarla —con
 * `montarLaLosa`, cada vez que cambia el tablero— y el mundo, al echar a andar y en cada losa
 * puesta, se sirve de lo que ella montó: no vuelve a montar nada. Es lo que hacía antes.
 */
{
  const delAparato = memoriaDeLasLindes(LOSAS_QUE_SE_RECUERDAN);
  const m = mesaEnRueda(2, 'APARATO');
  m.puestas = m.conOrden.length - QUEDAN;
  const pintar = (): void => {
    for (const l of tableroEnRueda(m)) repartoDelMundo.montarLaLosa(l.losa, l.giro, semillaDeLaLosa(m.semilla, l.x, l.y));
  };
  const alPintar = contado(pintar).trabajo;
  const alEcharAAndar = contado(() => mundoDeLasLindes(tableroEnRueda(m), m.semilla, delAparato)).trabajo;
  const jugadas: Trabajo[] = [];
  for (let k = 0; k < QUEDAN; k++) {
    m.puestas++;
    pintar();
    jugadas.push(contado(() => mundoDeLasLindes(tableroEnRueda(m), m.semilla, delAparato)).trabajo);
  }
  const pintadas = m.conOrden.length - QUEDAN;
  comprobar(
    'en el aparato, el mundo no monta nada que la escena no haya montado ya: ni al echar a andar ni al poner losa',
    alPintar.montadas === pintadas && alEcharAAndar.montadas === 0 && jugadas.length === QUEDAN && jugadas.every((t) => t.montadas === 0),
    { alPintar, alEcharAAndar, jugadas },
  );
  comprobar(
    'y echar a andar saca las cajas y los sitios de todas, y poner losa, los de UNA y sus vecinas, como antes',
    alEcharAAndar.cajas === pintadas &&
      alEcharAAndar.nacimientos === pintadas &&
      alEcharAAndar.arenas === 1 &&
      jugadas.every((t) => t.cajas === 1 && t.arenas === 1 && t.nacimientos >= 1 && t.nacimientos <= 9),
    { alEcharAAndar, jugadas },
  );
}

/*
 * EL SUELO COMPARTIDO del reparto: uno por clase y giro, el mismo objeto para dos semillas, igual
 * celda a celda al de `sueloDeLaLosa`; y la losa recordada, bit a bit la recién montada. Y la
 * memoria del reparto, que a estas alturas ha visto pasar más de mil losas, en su tope.
 */
{
  const combinaciones = LAS_LOSAS.length * 4;
  let compartidos = 0;
  let igualesAlSuelo = 0;
  let igualesAlMontaje = 0;
  for (const losa of LAS_LOSAS) {
    for (const giro of [0, 1, 2, 3] as Giro[]) {
      const una = repartoDelMundo.montarLaLosa(losa.id, giro, 1001);
      const otra = repartoDelMundo.montarLaLosa(losa.id, giro, 2002);
      if (una.celdas === otra.celdas) compartidos++;
      if (canonico(una.celdas) === canonico(sueloDeLaLosa(losa, giro))) igualesAlSuelo++;
      if (canonico(otra) === canonico(repartoDelMundo.montarLaLosaDeNuevo(losa.id, giro, 2002))) igualesAlMontaje++;
    }
  }
  comprobar(
    'el suelo que recuerda el reparto es uno por clase y giro: con dos semillas, el mismo objeto',
    compartidos === combinaciones,
    { compartidos, combinaciones },
  );
  comprobar(
    'y es, celda a celda, el de `sueloDeLaLosa`; y la losa recordada es, bit a bit, la recién montada',
    igualesAlSuelo === combinaciones && igualesAlMontaje === combinaciones,
    { igualesAlSuelo, igualesAlMontaje, combinaciones },
  );
  const r = repartoDelMundo.cuentasDelReparto();
  console.log(
    `  el reparto del mundo: ${String(r.montadas)} losas montadas en todo el guion · ${String(r.enLaMemoria)} en su memoria · ` +
      `${String(r.suelos)} suelos compartidos`,
  );
  comprobar(
    'y la memoria del reparto, que ha visto pasar más de 512 losas, se queda en 512, con un suelo por clase y giro',
    r.montadas > 512 && r.enLaMemoria === 512 && r.suelos === combinaciones,
    r,
  );
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  process.exit(1);
}

console.log(`${String(hechas)} comprobaciones`);
console.log('\nEl mundo de Las Lindes sale del reparto de verdad: las murallas paran, las puertas dejan');
console.log('pasar, las piedras que pasan de la cintura paran sin cerrar ni una senda ni una puerta, se');
console.log('nace donde se puede estar, y el mismo tablero da el mismo mundo y el mismo paseo en Node y en');
console.log('Hermes. Las huellas son las de los modelos, medidas otra vez. Y muchas mesas en rueda');
console.log('cuestan lo que una caliente —una losa montada por losa puesta—, con la memoria en su tope.');
