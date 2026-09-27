/**
 * EL ADORNO QUE CHOCA, MEDIDO: la parte de `verify:paseo` que mira `escenas/paseo/adorno-que-choca.ts`.
 *
 * Vive aparte porque abre `.glb` y monta los tres mundos que se andan (`adorno-en-node.ts`), y el resto
 * de `verificar-paseo.ts` no necesita nada de eso. Lo llama `verificar-paseo.ts` con su `comprobar` y su
 * `paso`, y cuenta en su misma cuenta.
 *
 *  1. EL SEMÁFORO: con su modelo de verdad, choca por el poste y por debajo de su brazo se pasa; con
 *     la arena de antes, el poste se atravesaba.
 *  2. LO QUE SE PISA NO CHOCA: una lámina a ras de suelo, un palet del Burgo, el puente del delta, los
 *     puentes, andenes y forjados del Burgo, la cerca de la ermita; y un brote vivo aparta el adorno.
 *  3. LOS BARRIDOS, en el Burgo ABCD, un delta y un valle con todo el mazo: nadie nace dentro del adorno
 *     ni en un bolsillo, desde cada sitio de nacer se anda, y los bolsillos que quedan son pequeños y
 *     sin sitio de nacer. A todo sitio donde brota un hallazgo se llega, salvo los pocos que caen en un
 *     bolsillo.
 *  4. EL RESCATE: desde dentro del adorno se sale andando, un tic de correr por tic y en recta por la
 *     estructura —lo que el servidor acepta—, y se acaba fuera de todo bolsillo. Con el rescate de antes
 *     (un salto al sitio libre más cercano) el primer paso cae lejos de donde el servidor lo espera.
 *  5. EL ÍNDICE: `cruzaUnCuerpo` con el índice de la arena contesta lo mismo que recorriéndolo todo.
 *  6. LA CÁMARA: al atravesar un pino con el código de antes se echaba a la nuca de golpe (el «efecto de
 *     quedarse atrás»); con el adorno que choca no se atraviesa, y la cámara no da tirones.
 *  7. EL COSTE, en Node: montar el adorno, la arena, y un tic con y sin él.
 */
import { performance } from 'node:perf_hooks';
import { ANDANDO, CORRIENDO, QUIETO, RADIO_DEL_PASEANTE, rumboDeRadianes } from '../../shared/mecanicas/andar';
import { aNumero, deNumero } from '../../shared/mecanicas/fijo';
import { sitiosDeHallazgo, RADIO_DE_RECOGER } from '../../shared/mecanicas/hallazgos';
import { arenaDe, seAndaEnRecta, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Andante, Arena, Casilla, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
import { BULTOS_QUE_CHOCAN, estorbosDelBurgo, trozosDelAdornoDelBurgo, adornoQueChocaDelBurgo } from '../burgo/estorbos-del-burgo';
import { noChocaEnElDelta, trozosDelAdornoDelDelta } from '../estorbos-del-delta';
import { esAdornoQueChoca, sePintaLoMenudo, trozosDelAdornoDeLasLindes } from '../lindes/adorno-de-las-lindes';
import {
  adornoQueDejaLlegarALosBrotes,
  ALTO_DE_UNA_RODAJA_QUE_CHOCA,
  ALTURA_DE_QUIEN_ANDA,
  arenaDelPaseo,
  cuerposDePiezas,
  estructuraDe,
  hacerLosTrozos,
  LO_QUE_SE_PISA,
  TOPE_DE_RODAJAS_QUE_CHOCAN,
} from '../paseo/adorno-que-choca';
import { acercarElHombro, hastaDondeCabeElHombro, hastaDondeNoTapa } from '../paseo/camaras';
import { indiceDeEstorbos } from '../paseo/estorbos';
import type { Estorbo } from '../paseo/estorbos';
import {
  cruzaUnCuerpo,
  cruzaUnCuerpoSinIndice,
  LO_QUE_SE_SALE_EN_UN_TIC,
  MICROS_POR_TIC,
  mudarDeMundo,
  quedaEncerrado,
  salidaDelAdorno,
  nacerEnElPaseo,
  poseDelPaseo,
  ticDelPaseo,
} from '../paseo/paseante';
import type { EstadoDelPaseo } from '../paseo/paseante';
import { rodajasDelCatalogo } from '../paseo/rodajas-del-catalogo';
import { ESCALA_DEL_PACK } from '../escala';
import { TALLA_A_PIE } from '../paseo/talla';
import { burgoConAdorno, deltaConAdorno, elCatalogoDelBurgo, elCatalogoDelTablero, lindesConAdorno, medirBolsillos } from './adorno-en-node';
import type { MundoConAdorno } from './adorno-en-node';

type Comprobar = (que: string, condicion: boolean, detalle?: unknown) => void;

/** Lo que acepta el servidor tras corregir: un tic de correr con su 25 % (`UN_TIC_CON_HOLGURA`). */
const UN_TIC_CON_HOLGURA = LO_QUE_SE_SALE_EN_UN_TIC * 1.25;

/** Un mundo abierto de prueba: once por once casillas de diez, sin nada. */
function abierto(cuerpos: readonly Cuerpo[] = []): MundoDeclarado {
  const pisables: Casilla[] = [];
  for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) pisables.push({ x, y });
  return { lado: 10, pisables, vados: [], cuerpos, nace: [{ x: 0, z: 0, rumbo: 0 }] };
}

/** Anda `tics` tics con un rumbo y una marcha desde un sitio (unidades del mundo) y dice dónde acaba. */
function andar(arena: Arena, x: number, z: number, rumbo: number, tics: number, marcha: typeof ANDANDO | typeof CORRIENDO = ANDANDO): Andante {
  let e = nacerEnElPaseo(arena, { x, z, rumbo });
  for (let i = 0; i < tics; i++) e = ticDelPaseo(arena, e, { rumbo: rumboDeRadianes(rumbo), marcha });
  return e.ahora;
}

export async function medirElAdornoQueChoca(comprobar: Comprobar, paso: (titulo: string) => void): Promise<void> {
  /* ── 1. El semáforo del Burgo, con su modelo ────────────────────────────── */
  paso('El adorno choca: por el poste de un semáforo sí, y por debajo de su brazo no');

  const catalogoDelBurgo = await elCatalogoDelBurgo();
  const rodajasFinas = rodajasDelCatalogo(catalogoDelBurgo, ALTO_DE_UNA_RODAJA_QUE_CHOCA, TOPE_DE_RODAJAS_QUE_CHOCAN);
  const delSemaforo = rodajasFinas('semaforo-c') ?? [];
  const abajo = delSemaforo.reduce<Estorbo | null>((m, r) => (m === null || r.y0 < m.y0 ? r : m), null);
  const arriba = delSemaforo.reduce<Estorbo | null>((m, r) => (m === null || r.y1 > m.y1 ? r : m), null);
  comprobar('el semáforo del Burgo tiene sus rodajas finas medidas en `burgo.glb`', abajo !== null && arriba !== null && delSemaforo.length >= 10, delSemaforo.length);
  if (abajo !== null && arriba !== null) {
    const posteX = (abajo.x0 + abajo.x1) / 2;
    const posteZ = (abajo.z0 + abajo.z1) / 2;
    /* El brazo, por donde más se aleja del poste su rodaja de arriba; y se prueba a tres cuartos. */
    const hacia = Math.abs(arriba.x1 - posteX) > Math.abs(arriba.x0 - posteX) ? arriba.x1 : arriba.x0;
    const bajoElBrazoX = posteX + (hacia - posteX) * 0.75;
    const cuerpos = cuerposDePiezas([{ pieza: 'semaforo-c', x: 0, y: 0, z: 0, giro: 0, talla: 1 }], rodajasFinas, () => 0);
    const ahora = arenaDelPaseo(abierto(), cuerpos);
    const antes = arenaDe(abierto());
    const anchoMayor = Math.max(...cuerpos.map((c) => Math.max(c.x1 - c.x0, c.z1 - c.z0)));
    comprobar(
      'choca por lo que tiene a la altura del cuerpo —el poste y el farol—, y nada suyo llega a donde cuelga el brazo',
      cuerpos.length >= 1 && anchoMayor < 1.2 && cuerpos.every((c) => Math.max(Math.abs(c.x0 - posteX), Math.abs(c.x1 - posteX)) < 1),
      { cuerpos, posteX, hacia },
    );
    const contraElPoste = andar(ahora, posteX, posteZ - 6, Math.PI, 30);
    const contraElPosteAntes = andar(antes, posteX, posteZ - 6, Math.PI, 30);
    const bajoElBrazo = andar(ahora, bajoElBrazoX, posteZ - 6, Math.PI, 30);
    console.log(
      `  semáforo: de frente contra el poste se para en z = ${aNumero(contraElPoste.z).toFixed(2)} (el poste en ${posteZ.toFixed(2)}); bajo el brazo, a ${(bajoElBrazoX - posteX).toFixed(2)} del poste, llega a ${aNumero(bajoElBrazo.z).toFixed(2)}`,
    );
    comprobar('de frente contra el poste se para antes de él', aNumero(contraElPoste.z) < posteZ - RADIO_DEL_PASEANTE / 65536);
    comprobar('y por debajo del brazo se pasa de largo', aNumero(bajoElBrazo.z) > posteZ + 3);
    comprobar('la vacuna: con la arena de antes, sin adorno, el poste se atravesaba', aNumero(contraElPosteAntes.z) > posteZ + 3);
  }

  /* ── 2. Lo que se pisa ──────────────────────────────────────────────────── */
  paso('Lo que se pisa no choca: una lámina, un palet, un puente, la cerca de la ermita; y un brote vivo aparta el adorno');

  const LAMINA: readonly Estorbo[] = [{ x0: -2, y0: 0, z0: -1.5, x1: 2, y1: 0.04, z1: 1.5 }];
  const deUnaLamina = cuerposDePiezas([{ pieza: 'paso-de-cebra', x: 0, y: 0, z: 0, giro: 0, talla: 1 }], () => LAMINA, () => 0);
  const deUnPalet = cuerposDePiezas([{ pieza: 'palet', x: 0, y: 0.6, z: 0, giro: 0, talla: 1 }], rodajasFinas, () => 0.6);
  const deUnBanco = cuerposDePiezas([{ pieza: 'banco-de-calle', x: 0, y: 0.6, z: 0, giro: 0, talla: 1 }], rodajasFinas, () => 0.6);
  /*
   * EL PALET CAMBIÓ DE LADO CON LA TALLA A PIE. Con quien anda a la talla de la persona del mundo, lo que
   * se pisaba llegaba a 0,305 y el palet (0,30) se pisaba. Desde que mide la mitad (`talla.ts`) el tobillo
   * está en ${LO_QUE_SE_PISA.toFixed(3)} y un palet le llega a la rodilla: choca, como la papelera. La
   * lámina sigue pisándose.
   */
  comprobar(
    `una lámina a ras de suelo (un paso de cebra) no choca; un palet (0,30, por encima de ${LO_QUE_SE_PISA.toFixed(3)} desde la talla a pie) y un banco sí`,
    deUnaLamina.length === 0 && deUnPalet.length > 0 && deUnBanco.length > 0 && LO_QUE_SE_PISA < 0.3,
    { deUnaLamina, deUnPalet, deUnBanco: deUnBanco.length },
  );
  const LA_MISMA_LAMINA_ALZADA: readonly Estorbo[] = [{ x0: -2, y0: 0, z0: -1.5, x1: 2, y1: 0.5, z1: 1.5 }];
  comprobar(
    'la vacuna: la misma lámina a medio metro sí choca',
    cuerposDePiezas([{ pieza: 'x', x: 0, y: 0, z: 0, giro: 0, talla: 1 }], () => LA_MISMA_LAMINA_ALZADA, () => 0).length === 1,
  );
  const ENCIMA_DE_LA_CABEZA: readonly Estorbo[] = [{ x0: -2, y0: ALTURA_DE_QUIEN_ANDA + 0.1, z0: -2, x1: 2, y1: 4, z1: 2 }];
  comprobar(
    'y lo que va entero por encima de la cabeza (un toldo, la copa de un árbol alto) tampoco choca',
    cuerposDePiezas([{ pieza: 'x', x: 0, y: 0, z: 0, giro: 0, talla: 1 }], () => ENCIMA_DE_LA_CABEZA, () => 0).length === 0,
  );

  const burgo = await burgoConAdorno('ABCD');
  const plantasDelBurgo = new Set(burgo.adorno.map((c) => `${c.x0.toFixed(3)},${c.z0.toFixed(3)},${c.x1.toFixed(3)},${c.z1.toFixed(3)}`));
  const pisablesDelBurgo = burgo.ciudad.fachadas.filter((b) => b.clase === 'puente' || b.clase === 'anden' || b.clase === 'forjado');
  comprobar(
    'en el Burgo, los puentes, los andenes y los forjados se andan por encima: no chocan',
    !BULTOS_QUE_CHOCAN.puente && !BULTOS_QUE_CHOCAN.anden && !BULTOS_QUE_CHOCAN.forjado && pisablesDelBurgo.length > 0,
    pisablesDelBurgo.length,
  );
  const { modelos: delTablero } = await elCatalogoDelTablero();
  const rodajasDelTablero = rodajasDelCatalogo(delTablero, ALTO_DE_UNA_RODAJA_QUE_CHOCA / ESCALA_DEL_PACK, TOPE_DE_RODAJAS_QUE_CHOCAN);
  const copia = { posicion: { x: 0, y: 0, z: 0 }, giro: 0, escala: { x: ESCALA_DEL_PACK } };
  const conPuente = hacerLosTrozos(trozosDelAdornoDelDelta(new Map([['0,0|puente', [copia]]]), [], rodajasDelTablero, () => 0));
  const conPino = hacerLosTrozos(trozosDelAdornoDelDelta(new Map([['0,0|arbol-a', [copia]]]), [], rodajasDelTablero, () => 0));
  comprobar(
    'en el delta, el puente se anda por encima y no choca; un árbol sí',
    noChocaEnElDelta('puente') && conPuente.length === 0 && conPino.length > 0,
    { conPuente: conPuente.length, conPino: conPino.length },
  );
  comprobar(
    'la vacuna: el puente, pasado sin su excepción, sí tendría cuerpo',
    cuerposDePiezas([{ pieza: 'puente', x: 0, y: 0, z: 0, giro: 0, talla: ESCALA_DEL_PACK }], rodajasDelTablero, () => 0).length > 0,
  );
  comprobar(
    'en Las Lindes, la cerca de la ermita no choca y una valla del prado sí; lo menudo sólo se choca si se pinta',
    !esAdornoQueChoca('valla', 1.6, 'ermita') &&
      esAdornoQueChoca('valla', 1.6, 'prado') &&
      esAdornoQueChoca('barril', 1.5, 'villa') &&
      trozosDelAdornoDeLasLindes([{ x: 0, y: 0, losa: 'ermita', giro: 0 }], 777, () => [], () => 'x', false).length === 0 &&
      !sePintaLoMenudo('sobria') &&
      sePintaLoMenudo('plena'),
  );
  /* Un brote en medio de un pino: con él vivo, el pino deja de chocar; sin él, choca. */
  const pino = conPino[0] as Cuerpo;
  const enElPino = { x: (pino.x0 + pino.x1) / 2, z: (pino.z0 + pino.z1) / 2 };
  const conElBrote = adornoQueDejaLlegarALosBrotes(conPino, [enElPino]) ?? [];
  const lejosDelBrote = adornoQueDejaLlegarALosBrotes(conPino, [{ x: enElPino.x + 30, z: enElPino.z }]);
  comprobar(
    'un brote vivo dentro de un árbol lo aparta mientras está; uno lejos no toca nada, y deja la MISMA lista',
    conElBrote.length < conPino.length && lejosDelBrote === conPino,
    { antes: conPino.length, conElBrote: conElBrote.length },
  );

  /* ── 3. Los barridos en los tres mundos ─────────────────────────────────── */
  paso('Los barridos: nadie nace dentro del adorno ni en un bolsillo, desde cada sitio de nacer se anda, y a los brotes se llega');

  const delta = await deltaConAdorno(2);
  const valle = await lindesConAdorno(777);
  const mundos: readonly (readonly [string, MundoConAdorno, number])[] = [
    ['el Burgo ABCD', burgo, 150],
    ['un delta de diecinueve comarcas', delta, 80],
    ['un valle con todas las losas del mazo', valle, 100],
  ];
  const arenas = new Map<string, Arena>();
  const losBolsillos = new Map<string, ReturnType<typeof medirBolsillos>>();
  for (const [nombre, m, topeDelBolsillo] of mundos) {
    const arena = arenaDelPaseo(m.mundo, m.adorno);
    arenas.set(nombre, arena);
    const estructura = estructuraDe(arena);
    const b = medirBolsillos(arena, estructura, 0.25);
    losBolsillos.set(nombre, b);
    const mayor = b.bolsillos[0]?.area ?? 0;
    let dentro = 0;
    let enBolsillo = 0;
    let sinSalir = 0;
    for (const s of m.mundo.nace) {
      if (!sePuedeEstar(arena, deNumero(s.x), deNumero(s.z), RADIO_DEL_PASEANTE)) dentro++;
      if (b.bolsilloDe(s.x, s.z) !== null) enBolsillo++;
      /*
       * Y se anda: de dieciséis rumbos, alguno lleva a más de diez unidades en cuarenta tics (veinte a la
       * velocidad de antes de la talla a pie, que era el doble: `andar.ts`).
       */
      let lejos = 0;
      for (let k = 0; k < 16; k++) {
        const fin = andar(arena, s.x, s.z, (k * Math.PI) / 8, 40);
        lejos = Math.max(lejos, Math.hypot(aNumero(fin.x) - s.x, aNumero(fin.z) - s.z));
      }
      if (lejos < 10) sinSalir++;
    }
    /* A los brotes: a todo sitio donde brota algo se llega a `RADIO_DE_RECOGER`, con lo que un brote aparta. */
    let brotes = 0;
    let tapados = 0;
    let sinLlegar = 0;
    let enUnBolsillo = 0;
    for (const q of sitiosDeHallazgo(estructura)) {
      brotes++;
      const x = aNumero(q.x);
      const z = aNumero(q.z);
      if (b.seLlegaCerca(x, z, RADIO_DE_RECOGER - b.lado)) continue;
      if (sePuedeEstar(arena, q.x, q.z, RADIO_DEL_PASEANTE)) {
        enUnBolsillo++;
        continue;
      }
      tapados++;
      /* Con el brote vivo, lo que lo tapa se aparta: el brote queda libre y al lado de lo que se anda. */
      const quedan = new Set(adornoQueDejaLlegarALosBrotes(m.adorno, [{ x, z }]) ?? []);
      let alcance = 0;
      for (const c of m.adorno) {
        if (quedan.has(c)) continue;
        alcance = Math.max(alcance, Math.hypot(Math.max(Math.abs(c.x0 - x), Math.abs(c.x1 - x)), Math.max(Math.abs(c.z0 - z), Math.abs(c.z1 - z))));
      }
      if (!b.seLlegaCerca(x, z, alcance + 2 * b.lado + aNumero(RADIO_DEL_PASEANTE))) sinLlegar++;
    }
    console.log(
      `  ${nombre}: ${String(m.mundo.cuerpos.length)} cuerpos y ${String(m.adorno.length)} de adorno; ${String(b.bolsillos.length)} bolsillos, el mayor de ${mayor.toFixed(1)} u²; ${String(m.mundo.nace.length)} sitios de nacer; ${String(brotes)} de brote, ${String(tapados)} tapados por el adorno y ${String(enUnBolsillo)} en un bolsillo`,
    );
    comprobar(`en ${nombre}, nadie nace dentro del adorno ni en un bolsillo`, dentro === 0 && enBolsillo === 0, { dentro, enBolsillo });
    comprobar(`en ${nombre}, desde cada sitio de nacer se anda lejos`, sinSalir === 0, sinSalir);
    comprobar(`en ${nombre}, el adorno no deja bolsillos de más de ${String(topeDelBolsillo)} u²`, mayor <= topeDelBolsillo, b.bolsillos.slice(0, 3));
    comprobar(`en ${nombre}, a todo brote tapado por el adorno se llega con el brote vivo`, sinLlegar === 0, sinLlegar);
    comprobar(`y en ${nombre}, en un bolsillo cae como mucho uno de cada mil sitios de brote`, enUnBolsillo * 1000 <= brotes, enUnBolsillo);
    if (nombre === 'el Burgo ABCD') comprobar('la vacuna: en el Burgo, sin apartar nada, a cientos de sitios de brote no se llegaría', tapados > 100, tapados);
  }
  /* La vacuna del medidor de bolsillos: un corro de barriles alrededor de un sitio de nacer se ve. */
  const corro: Cuerpo[] = [];
  for (let k = 0; k < 24; k++) {
    const a = (k * Math.PI) / 12;
    corro.push({ x0: Math.cos(a) * 5 - 0.6, z0: Math.sin(a) * 5 - 0.6, x1: Math.cos(a) * 5 + 0.6, z1: Math.sin(a) * 5 + 0.6 });
  }
  const conCorro = arenaDelPaseo(abierto(), corro);
  const bolsillosDelCorro = medirBolsillos(conCorro, estructuraDe(conCorro), 0.25);
  comprobar(
    'la vacuna: un corro de barriles alrededor del sitio de nacer se ve como bolsillo, con el sitio dentro',
    bolsillosDelCorro.bolsilloDe(0, 0) !== null && (bolsillosDelCorro.bolsillos[0]?.area ?? 0) > 20,
    bolsillosDelCorro.bolsillos.slice(0, 2),
  );

  /* ── 4. El rescate ──────────────────────────────────────────────────────── */
  paso('Del adorno se sale andando, por donde el servidor acepta, y a un sitio desde el que se anda');

  for (const [nombre, m] of mundos) {
    const arena = arenas.get(nombre) as Arena;
    const estructura = estructuraDe(arena);
    const b = losBolsillos.get(nombre) as ReturnType<typeof medirBolsillos>;
    let casos = 0;
    let malos = 0;
    let largos = 0;
    let saltosDeAntes = 0;
    let enUnClaro = 0;
    const ejemplos: unknown[] = [];
    const paso_ = Math.max(1, Math.floor(m.adorno.length / 600));
    for (let k = 0; k < m.adorno.length; k += paso_) {
      const c = m.adorno[k] as Cuerpo;
      const x = deNumero((c.x0 + c.x1) / 2);
      const z = deNumero((c.z0 + c.z1) / 2);
      if (sePuedeEstar(arena, x, z, RADIO_DEL_PASEANTE) || !sePuedeEstar(estructura, x, z, RADIO_DEL_PASEANTE)) continue;
      casos++;
      let e: EstadoDelPaseo = { tic: 0, antes: { x, z }, ahora: { x, z }, rumbo: 0, pedido: { rumbo: 0, marcha: QUIETO }, sobra: 0, andado: 0 };
      let bien = true;
      let tics = 0;
      while (!sePuedeEstar(arena, e.ahora.x, e.ahora.z, RADIO_DEL_PASEANTE) && tics < 40) {
        const antes = e.ahora;
        e = ticDelPaseo(arena, e, { rumbo: 0, marcha: QUIETO });
        tics++;
        const d = Math.hypot(e.ahora.x - antes.x, e.ahora.z - antes.z);
        if (d > UN_TIC_CON_HOLGURA || !seAndaEnRecta(estructura, antes, e.ahora, RADIO_DEL_PASEANTE)) bien = false;
      }
      if (tics > 6) largos++;
      const fuera = sePuedeEstar(arena, e.ahora.x, e.ahora.z, RADIO_DEL_PASEANTE);
      const suelto = b.bolsilloDe(aNumero(e.ahora.x), aNumero(e.ahora.z)) === null;
      /*
       * UN CLARO CERRADO DE NACIMIENTO: una pieza dentro de un claro que el adorno cierra por todas partes
       * (el tocón de un claro entre dos arboledas del delta, medido el 27-sep-2026). Toda salida que no es
       * el claro queda al otro lado de él, y el primer tic que pisa suelo cae dentro: no hay manera de
       * salir andando a otro sitio. El servidor no pone a nadie ahí —se nace y se renace fuera de todo
       * bolsillo, que es otra comprobación de aquí—, así que no cuenta como rescate malo; pero se cuentan,
       * tienen que ser raros, y hasta en ellos se sale andando y en recta.
       */
      const salida = salidaDelAdorno(arena, estructura, { x, z });
      const claro = !suelto && bien && fuera && salida !== null && quedaEncerrado(arena, salida.x, salida.z);
      if (claro) enUnClaro++;
      if (!bien || !fuera || (!suelto && !claro)) {
        malos++;
        if (ejemplos.length < 3) ejemplos.push({ x: aNumero(x), z: aNumero(z), tics, bien, fuera, suelto });
      }
      /* El rescate de antes: el primer tic salta al sitio libre más cercano, lo lejos que esté. */
      const deAntes = ticDelPaseo(arenaDe({ ...m.mundo, cuerpos: [...m.mundo.cuerpos, ...m.adorno] }), { ...e, antes: { x, z }, ahora: { x, z } }, { rumbo: 0, marcha: QUIETO });
      if (Math.hypot(deAntes.ahora.x - x, deAntes.ahora.z - z) > UN_TIC_CON_HOLGURA) saltosDeAntes++;
    }
    console.log(`  ${nombre}: ${String(casos)} sitios dentro del adorno, ${String(largos)} tardan más de seis tics en salir, ${String(enUnClaro)} en un claro cerrado; con el rescate de antes, ${String(saltosDeAntes)} saltarían más de lo que el servidor acepta`);
    comprobar(
      `en ${nombre}, desde dentro del adorno se sale andando: un tic de correr por tic, en recta por la estructura, fuera de todo bolsillo salvo en un claro cerrado de nacimiento`,
      casos > 20 && malos === 0,
      { casos, malos, ejemplos },
    );
    comprobar(`y en ${nombre}, las piezas en un claro cerrado de nacimiento son como mucho una de cada cien`, enUnClaro * 100 <= casos, { enUnClaro, casos });
    comprobar(`la vacuna: en ${nombre}, el rescate de un salto caería lejos de donde el servidor espera el primer paso`, saltosDeAntes > 0, saltosDeAntes);
  }
  /* Y una corrección que cae dentro del adorno NO salta: `mudarDeMundo` con la estructura la deja ahí. */
  const unCoche = burgo.ciudad.coches.aparcados[0];
  if (unCoche !== undefined) {
    const arena = arenas.get('el Burgo ABCD') as Arena;
    const dentroDelCoche = { x: deNumero(unCoche.x), z: deNumero(unCoche.z) };
    const e = nacerEnElPaseo(estructuraDe(arena), { x: unCoche.x, z: unCoche.z, rumbo: 0 });
    const conEstructura = mudarDeMundo(estructuraDe(arena), { ...e, antes: dentroDelCoche, ahora: dentroDelCoche });
    const conTodo = mudarDeMundo(arena, { ...e, antes: dentroDelCoche, ahora: dentroDelCoche });
    comprobar(
      'una corrección del servidor dentro de un coche no salta (el salto lo ignoraría el servidor): se sale andando en los tics',
      sePuedeEstar(estructuraDe(arena), dentroDelCoche.x, dentroDelCoche.z, RADIO_DEL_PASEANTE) &&
        conEstructura.ahora.x === dentroDelCoche.x &&
        conEstructura.ahora.z === dentroDelCoche.z &&
        (conTodo.ahora.x !== dentroDelCoche.x || conTodo.ahora.z !== dentroDelCoche.z),
    );
  }

  /* ── 5. El índice de `cruzaUnCuerpo` ────────────────────────────────────── */
  paso('Mirar el tramo con el índice de la arena contesta lo mismo que mirarlo todo');

  {
    const arena = arenas.get('el Burgo ABCD') as Arena;
    let s = 12345;
    const azar = (): number => {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      return s / 4294967296;
    };
    let iguales = 0;
    let cruzan = 0;
    let t0 = 0;
    let t1 = 0;
    const N = 40_000;
    for (let i = 0; i < N; i++) {
      const c = burgo.adorno[Math.floor(azar() * burgo.adorno.length)] as Cuerpo;
      const a = { x: deNumero(c.x0 - 2 + azar() * (c.x1 - c.x0 + 4)), z: deNumero(c.z0 - 2 + azar() * (c.z1 - c.z0 + 4)) };
      const b = { x: a.x + deNumero((azar() - 0.5) * 3), z: a.z + deNumero((azar() - 0.5) * 3) };
      const x = performance.now();
      const conIndice = cruzaUnCuerpo(arena, a, b);
      const y = performance.now();
      const sinIndice = cruzaUnCuerpoSinIndice(arena, a, b);
      const w = performance.now();
      t0 += y - x;
      t1 += w - y;
      if (conIndice === sinIndice) iguales++;
      if (sinIndice) cruzan++;
    }
    console.log(`  ${String(N)} tramos junto al adorno del Burgo: ${String(cruzan)} cruzan algo; con el índice ${((t0 * 1000) / N).toFixed(2)} µs por tramo, recorriéndolo todo ${((t1 * 1000) / N).toFixed(2)}`);
    comprobar('con el índice, el mismo sí o no en todos los tramos, y alguno cruza', iguales === N && cruzan > N / 20, { iguales, cruzan });
  }

  /* ── 6. La cámara al atravesar ──────────────────────────────────────────── */
  paso('El «efecto de quedarse atrás»: era la cámara, que se echaba a la nuca al atravesar el adorno');

  {
    const vista = indiceDeEstorbos(estorbosDelBurgo(burgo.ciudad, rodajasDelCatalogo(catalogoDelBurgo)));
    const conAdorno = arenas.get('el Burgo ABCD') as Arena;
    const sinAdorno = estructuraDe(conAdorno);
    const medir = (arena: Arena): { peorTiron: number; alOtroLado: number; pasadas: number } => {
      let peorTiron = 0;
      let alOtroLado = 0;
      let pasadas = 0;
      for (const p of burgo.ciudad.mobiliario.filter((q) => q.pieza === 'pino' || q.pieza === 'arbusto').slice(0, 60)) {
        const desdeX = p.x;
        const desdeZ = p.z - 6;
        if (!sePuedeEstar(sinAdorno, deNumero(desdeX), deNumero(desdeZ), RADIO_DEL_PASEANTE)) continue;
        pasadas++;
        let e = nacerEnElPaseo(arena, { x: desdeX, z: desdeZ, rumbo: Math.PI });
        let atras: number | null = null;
        /* Sesenta tics a 6 u/s: las mismas dieciocho unidades que treinta a 12, la velocidad de antes de la talla a pie. */
        for (let t = 0; t < 60; t++) {
          e = ticDelPaseo(arena, e, { rumbo: rumboDeRadianes(Math.PI), marcha: ANDANDO });
          for (let f = 0; f < 3; f++) {
            const q = poseDelPaseo({ ...e, rumbo: Math.PI, sobra: Math.round((f / 3) * MICROS_POR_TIC) });
            const suelo = burgo.suelo(q.x, q.z);
            const cabe = hastaDondeCabeElHombro(sinAdorno, q);
            const antes = atras;
            atras = acercarElHombro(atras, Math.min(cabe, hastaDondeNoTapa(vista, q, suelo, cabe, suelo)), 1 / 60);
            if (antes !== null && t > 2) peorTiron = Math.max(peorTiron, antes - atras);
          }
        }
        if (aNumero(e.ahora.z) > p.z + 1.5) alOtroLado++;
      }
      return { peorTiron, alOtroLado, pasadas };
    };
    const antes = medir(sinAdorno);
    const ahora = medir(conAdorno);
    console.log(
      `  andando contra ${String(ahora.pasadas)} pinos y arbustos del Burgo: antes se atravesaban ${String(antes.alOtroLado)} y la cámara se acercaba hasta ${antes.peorTiron.toFixed(2)} en un fotograma; ahora se atraviesan ${String(ahora.alOtroLado)} y el peor tirón es de ${ahora.peorTiron.toFixed(2)}`,
    );
    /* Los tirones, en alturas de quien anda: la cámara va a `TALLA_A_PIE` de lo que iba (`camaras.ts`). */
    comprobar(
      `la vacuna: con la arena de antes se atravesaban y la cámara daba tirones de más de ${TALLA_A_PIE.toFixed(2)} (una unidad a la talla de antes)`,
      antes.alOtroLado > antes.pasadas / 2 && antes.peorTiron > TALLA_A_PIE,
      antes,
    );
    comprobar('con el adorno que choca no se atraviesa ninguno, y la cámara no da tirones', ahora.alOtroLado === 0 && ahora.peorTiron < 0.25, ahora);
  }

  /* ── 7. El coste ─────────────────────────────────────────────────────────── */
  paso('El coste: montarlo, derivar la arena y dar un tic, con y sin el adorno');

  {
    const t0 = performance.now();
    const entero = adornoQueChocaDelBurgo(burgo.ciudad, burgo.rodajasDe, burgo.suelo);
    const t1 = performance.now();
    const porTrozos = hacerLosTrozos(trozosDelAdornoDelBurgo(burgo.ciudad, burgo.rodajasDe, burgo.suelo));
    const t2 = performance.now();
    const arena = arenaDelPaseo(burgo.mundo, entero);
    const t3 = performance.now();
    comprobar(
      'por trozos sale exactamente lo mismo que de una vez',
      JSON.stringify(entero) === JSON.stringify(porTrozos) && trozosDelAdornoDelBurgo(burgo.ciudad, burgo.rodajasDe, burgo.suelo).length > 10,
    );
    const tics = (a: Arena): number => {
      let s = 99;
      const azar = (): number => {
        s = (Math.imul(s, 1103515245) + 12345) >>> 0;
        return s / 4294967296;
      };
      const desde = performance.now();
      let n = 0;
      for (const sitio of burgo.mundo.nace) {
        let e = nacerEnElPaseo(a, sitio);
        let rumbo = Math.floor(azar() * 256);
        for (let i = 0; i < 120; i++) {
          if (azar() < 0.05) rumbo = Math.floor(azar() * 256);
          e = ticDelPaseo(a, e, { rumbo, marcha: azar() < 0.5 ? ANDANDO : CORRIENDO });
          n++;
        }
      }
      return ((performance.now() - desde) * 1000) / n;
    };
    tics(arena);
    const sin = tics(estructuraDe(arena));
    const con = tics(arena);
    console.log(
      `  el Burgo ABCD: el adorno en ${(t1 - t0).toFixed(1)} ms (por trozos ${(t2 - t1).toFixed(1)}), la arena con él en ${(t3 - t2).toFixed(1)} ms; un tic ${sin.toFixed(2)} µs sin adorno y ${con.toFixed(2)} con él`,
    );
    comprobar('un tic con el adorno no cuesta ni el triple que sin él', con < sin * 3 + 1, { sin, con });
  }
}
