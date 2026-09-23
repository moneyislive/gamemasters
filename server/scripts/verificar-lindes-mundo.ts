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
 *     menudo. Toda pieza que estorba tiene su huella medida, nada con esquinas llega girado a un
 *     ángulo que no sea un cuarto, y nada que estorba se pone más pequeño que la altura a la
 *     que se midió su huella.
 *  3. QUE SE NACE DONDE SE PUEDE ESTAR: en su losa, en senda o en prado, sin cuerpo encima.
 *  4. QUE LA MURALLA PARA Y LA PUERTA DEJA PASAR, mirado desde el REPARTO y no desde las cajas.
 *     Ver ese escalón: una caja mal girada se «para a sí misma» si el cruce se calcula con ella.
 *  5. QUE EL MISMO PASEO DA LA MISMA HUELLA EN NODE Y EN HERMES, y el mismo mundo.
 *  6. QUE LA TABLA DE HUELLAS ES LA DE LOS MODELOS: se vuelven a medir en `tablero.glb` y se
 *     exigen los mismos números.
 *  7. Y QUE LAS DOS TABLAS LITERALES DEL REPARTO DICEN LO QUE DICE SU CABECERA.
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
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANDANDO, pasoDelTic, RADIO_DEL_PASEANTE } from '../../shared/mecanicas/andar';
import { canonico, porQueNoEsCanonico } from '../../shared/mecanicas/canonico';
import { deNumero, UNO } from '../../shared/mecanicas/fijo';
import { arenaDe, hayPiso, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Arena, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import { casillaDeLlave, LAS_LOSAS, ladoGirado } from '../../shared/arcade/juegos/lindes-losas';
import type { Giro } from '../../shared/arcade/juegos/lindes-losas';
import { ALTURA_DE_LA_HUELLA_EN_PACK, HUECO_DE_LA_PUERTA, HUELLA_DEL_MODELO } from '../../shared/arcade/juegos/lindes-huellas';
import {
  CELDAS_POR_LOSA,
  CELDAS_POR_MURO,
  ESCALA_DEL_PACK,
  ESCALA_DE_LA_TORRE,
  LADO_DE_CELDA,
  LADO_DE_LOSA,
} from '../../shared/arcade/juegos/lindes-medidas';
import { comoEstorba, esMenuda, PIEZA } from '../../shared/arcade/juegos/lindes-piezas';
import {
  caminoDeLaSenda,
  DIRECCIONES_DE_LA_PLAZA,
  montarLaLosa,
  rumboDelTramo,
  semillaDeLaLosa,
} from '../../shared/arcade/juegos/lindes-reparto';
import {
  cajasDeLaPuesta,
  cuartosDeVuelta,
  cuerposDeLasLindes,
  LADO_DE_LOSA_DEL_MUNDO,
  mundoDeLasLindes,
} from '../../shared/arcade/juegos/lindes-mundo';
import type { CuerpoDeLasLindes, LosaParaElMundo } from '../../shared/arcade/juegos/lindes-mundo';
import { ESCALA_DEL_PACK as ESCALA_DE_ESCENAS } from '../../escenas/escala';
import { LADO_DE_LOSA as LADO_DE_ESCENAS } from '../../escenas/lindes/medidas';
import { medirLasHuellas } from '../../escenas/scripts/medir-huellas-de-las-lindes';
import { jugarLasLindes } from './robot-de-las-lindes';
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

/**
 * Un tablero de verdad: el que deja una partida del robot, con las losas en el orden de sus
 * llaves. `hasta` corta por el orden en que se pusieron, que es un tablero que existió a mitad
 * de partida y por eso también es legal. La semilla del paisaje sale como la saca la escena:
 * `semillaDelCodigo` de un código de mesa, con `0x5eed`.
 */
function tableroDelRobot(semilla: number, hasta: number | null): Tablero {
  const partida = jugarLasLindes(semilla, 3);
  const losas: LosaParaElMundo[] = [];
  for (const llave of Object.keys(partida.estado.tablero).sort(porOrden)) {
    const puesta = partida.estado.tablero[llave];
    const c = casillaDeLlave(llave);
    if (puesta === undefined || c === null) continue;
    if (hasta !== null && puesta.orden > hasta) continue;
    losas.push({ x: c.x, y: c.y, losa: puesta.losa, giro: puesta.giro });
  }
  const nombre = hasta === null ? `partida ${String(semilla)}` : `partida ${String(semilla)} hasta la losa ${String(hasta)}`;
  return { nombre, losas, semilla: semillaDelCodigo(`LINDES-${String(semilla)}`, 0x5eed) };
}

const TABLEROS: Tablero[] = [
  tableroDelRobot(1, null),
  tableroDelRobot(2, null),
  tableroDelRobot(3, null),
  tableroDelRobot(4, 5),
];

/** Lo que se pone girado a un ángulo cualquiera: plantas redondas u ovaladas. Ver `lindes-mundo.ts`. */
const CAMPO_REDONDO: ReadonlySet<string> = new Set([
  PIEZA.arbolA,
  PIEZA.arbolB,
  PIEZA.arboledaGrande,
  PIEZA.arboledaMedia,
  PIEZA.arboledaPequena,
  PIEZA.almiar,
  PIEZA.colinaA,
]);

interface Derivado {
  readonly tablero: Tablero;
  readonly mundo: MundoDeclarado;
  readonly conOrigen: readonly CuerpoDeLasLindes[];
  readonly arena: Arena;
}

const DERIVADOS: Derivado[] = TABLEROS.map((t) => {
  const mundo = mundoDeLasLindes(t.losas, t.semilla);
  return { tablero: t, mundo, conOrigen: cuerposDeLasLindes(t.losas, t.semilla), arena: arenaDe(mundo) };
});

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
  comprobar(
    'y ni una caja de trigal, de barbecho o de nada menudo',
    deLasQueNo.length === 0 &&
      (porPieza.get(PIEZA.trigal) ?? 0) === 0 &&
      (porPieza.get(PIEZA.barbecho) ?? 0) === 0 &&
      [...porPieza.keys()].every((p) => !esMenuda(p)),
    deLasQueNo.slice(0, 10),
  );
  comprobar('nada con esquinas llega girado a un ángulo que no sea un cuarto de vuelta', redondasConEsquinas.length === 0, redondasConEsquinas.slice(0, 10));
  comprobar('y lo del campo sí llega girado de cualquier manera: las redondas existen', redondas > 100, { redondas });
  comprobar('toda caja es una caja: finita y con el ancho y el fondo en positivo', malFormadas.length === 0, malFormadas.slice(0, 5));
}

/*
 * EL REPARTO, PIEZA A PIEZA: que no se quede nada que estorbe sin huella —se atravesaría en
 * silencio— y que nada que estorbe se ponga más pequeño que una torre, que es la escala a la que
 * se midió hasta dónde llega la cabeza de quien anda.
 */
{
  let piezasMiradas = 0;
  let queEstorban = 0;
  const sinHuella = new Set<string>();
  const pequenas: string[] = [];
  const cabeza = ALTURA_DE_LA_HUELLA_EN_PACK * ESCALA_DEL_PACK * ESCALA_DE_LA_TORRE;
  for (const d of DERIVADOS) {
    for (const l of d.tablero.losas) {
      for (const p of montarLaLosa(l.losa, l.giro, semillaDeLaLosa(d.tablero.semilla, l.x, l.y)).puestas) {
        piezasMiradas++;
        if (comoEstorba(p.pieza) === 'nada') continue;
        queEstorban++;
        if (HUELLA_DEL_MODELO[p.pieza] === undefined) sinHuella.add(p.pieza);
        if (p.escala < ESCALA_DE_LA_TORRE - 1e-12) pequenas.push(`${p.pieza} a escala ${p.escala.toFixed(3)}`);
      }
    }
  }
  console.log(`  ${String(piezasMiradas)} piezas del reparto miradas, ${String(queEstorban)} estorban`);
  comprobar('se han mirado las piezas del reparto de verdad', piezasMiradas > 5000, { piezasMiradas });
  comprobar('toda pieza que estorba tiene su huella medida', sinHuella.size === 0, [...sinHuella]);
  comprobar(
    `ninguna pieza que estorba se pone más pequeña que una torre: su huella cubre una persona entera (${cabeza.toFixed(3)} del mundo)`,
    pequenas.length === 0,
    pequenas.slice(0, 5),
  );
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
// ESCALÓN 5 · EL MISMO PASEO, EN NODE Y EN HERMES
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
// ESCALÓN 6 · LA TABLA DE HUELLAS ES LA DE LOS MODELOS
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
}

// ---------------------------------------------------------------------------
// ESCALÓN 7 · LAS DOS TABLAS LITERALES DEL REPARTO
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

console.log('');
if (fallos.length > 0) {
  console.log(`${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  process.exit(1);
}

console.log(`${String(hechas)} comprobaciones`);
console.log('\nEl mundo de Las Lindes sale del reparto de verdad: las murallas paran, las puertas dejan');
console.log('pasar, se nace donde se puede estar, y el mismo tablero da el mismo mundo y el mismo paseo');
console.log('en Node y en Hermes. Las huellas son las de los modelos, medidas otra vez.');
