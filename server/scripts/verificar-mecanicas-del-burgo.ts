/**
 * ¿SE SOSTIENE LA TABLA DEL BURGO, Y LAS TRES MECÁNICAS NUEVAS?
 *
 *   npm run verify:mecanicas-burgo
 *
 * ═══ QUÉ AFIRMA ESTE FICHERO, Y POR QUÉ ESTAS COSAS Y NO OTRAS ═══
 *
 * El Burgo se escribe en tres pasos y éste es el primero: la TABLA
 * (`shared/arcade/juegos/burgo-tablero.ts`) y las tres mecánicas que el reductor
 * va a usar (`shared/mecanicas/{anillo,hacienda,mazo}.ts`). Todavía no hay
 * reductor, así que aquí no se juega ninguna partida; lo que se comprueba es
 * aquello cuyo fallo sería SILENCIOSO cuando el reductor llegue encima:
 *
 *  1. LA TABLA SE LEE POR POSICIÓN. `CASILLAS[i].indice === i`, las esquinas donde
 *     el reglamento dice, las estaciones en 5/15/25/35, los servicios en 12/28, tres del
 *     Fondo Vecinal y tres de Sucesos donde toca, 22 solares en 8 barrios de 2 o 3. Una fila movida
 *     no lanza: cobra la renta de otra calle.
 *  2. LOS NÚMEROS SON LOS DEL REGLAMENTO Y SON ENTEROS. Precios pares (la hipoteca es
 *     la mitad y no puede llevar coma), rentas que crecen de solar a hotel, el
 *     precio de la casa igual en todo el barrio, y la tabla ENTERA de deshipoteca
 *     escrita a mano —28 valores— contra `costeDeDesempeno`: un `Math.floor` donde
 *     va `Math.ceil` cambia el 350 de 193 a 192 y nadie lo ve en una partida. Y con
 *     ella la DÉCIMA DEL IMPUESTO, que redondea al revés (hacia abajo) porque es la
 *     alternativa que se le ofrece a quien paga y no un interés que cobra el
 *     Ayuntamiento: el rótulo del botón y el cobro del reductor salen de esa cuenta.
 *  3. LAS CARTAS SON 16 + 16, NUMERADAS 1..16 SIN HUECOS, y la serie y el número van
 *     y vuelven. El número es lo que se publica; la serie es el secreto. Si
 *     `numeroDeSerie('p07')` diera 0, la carta saldría muda.
 *  4. NINGUNA MARCA AJENA, en nombres, rótulos, títulos, textos ni barrios —y
 *     tampoco en los COMENTARIOS de los ficheros nuevos, que `verify:procedencia`
 *     no mira—. La lista es la de `marcas-registradas.ts`, y ninguna marca se
 *     escribe aquí como literal: se leen de la lista.
 *  5. LOS OCHO COLORES DE ACERA SE DISTINGUEN DE LOS SEIS DE ASIENTO, medidos:
 *     máximo por canal ≥ 60/255 y suma ≥ 100 contra cada uno, y el blanco encima
 *     de cada acera ≥ 3:1. Es la decisión 13 del diseño: los barrios se llaman por
 *     su color, así que un peón del color de su acera es un tablero que se juega
 *     mal sin ningún error.
 *  6. EL ANILLO: módulo positivo (retroceder desde la 1 da 38, no −2), el recorrido
 *     en orden y sin la casilla de partida, cruzar la salida sólo hacia delante y
 *     también al caer justo en la 0, la estación más cercana desde la 39 es la 5, y
 *     la geometría del anillo cuadrado de 8 × 14 con 11 por lado: esquinas en ±43,
 *     lados en su banda, paso de 8 entre vecinas, 11 de la esquina a la primera,
 *     cuatro cuartos que dan la vuelta, y `medioLado` = 50.
 *  7. LA HACIENDA: todo o nada, enteros, claves ordenadas, el Ayuntamiento con caja
 *     infinita, y el no-op devuelve EL MISMO objeto por identidad — que es lo que la
 *     mesa compara.
 *  8. EL MAZO: robar rota al fondo y no pierde ni duplica; sacar y devolver son
 *     inversas; lo que no cambia nada devuelve la misma lista.
 *
 * ═══ Y LAS VACUNAS, QUE NO SON ADORNO ═══
 *
 * Cada bloque comprueba también que la regla SE VE FALLAR: la misma función que
 * juzga la tabla buena juzga una tabla envenenada (una fila movida, un precio impar,
 * un barrio de cuatro) y tiene que encontrar exactamente ese veneno; un anillo con
 * una casilla fuera de su banda; unos saldos desordenados; un `robar` que no rota.
 * Este repositorio tiene apuntados tres comprobadores que pasaban en verde sin
 * comprobar nada, y todos tenían la misma forma: la detección nunca se había visto
 * disparar.
 *
 * ═══ EN PROCESO, SIN SERVIDOR ═══
 *
 * Porque lo que se comprueba son DATOS y ARITMÉTICA que viven en `shared/`. El
 * reductor, la mesa y el cable son de los pasos siguientes (`verify:burgo`).
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  BARRIOS,
  CARTAS_POR_MAZO,
  CASILLAS,
  CUANTAS_CASILLAS,
  EL_ARCA,
  EL_PREGON,
  OFICIOS,
  PARTE_DEL_IMPUESTO,
  PUERTAS,
  TITULOS,
  barrioDe,
  carta,
  cartasDe,
  costeDeDesempeno,
  decimaDelPatrimonio,
  interesDelEmpeno,
  mazoDeSerie,
  numeroDeSerie,
  serieDeCarta,
  seriesDe,
  valorDeEmpeno,
} from '../../shared/arcade/juegos/burgo-tablero';
import type { BarrioDelBurgo, CartaDelBurgo, CasillaDelBurgo, MazoId } from '../../shared/arcade/juegos/burgo-tablero';
import {
  casillaTras,
  casillasDelAnillo,
  cruzaLaSalida,
  distanciaAdelante,
  masCercana,
  medioLado,
  recorrido,
  sitioDeCasilla,
} from '../../shared/mecanicas/anillo';
import type { SitioEnElAnillo } from '../../shared/mecanicas/anillo';
import {
  asientosDe,
  puedePagar,
  saldoDe,
  sumaDeDeudas,
  totalEnMesa,
  transferir,
} from '../../shared/mecanicas/hacienda';
import type { Saldos } from '../../shared/mecanicas/hacienda';
import { cima, contiene, devolverAlFondo, robar, sacar } from '../../shared/mecanicas/mazo';
import type { Mazo } from '../../shared/mecanicas/mazo';
import { MARCAS_VETADAS } from './marcas-registradas';
import { sinComentarios } from './sin-comentarios';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

function mismaLista(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Copia honda de la tabla para envenenarla sin tocar la de verdad. */
function copiaDeCasillas(): CasillaDelBurgo[] {
  return CASILLAS.map((c) => ({ ...c, rentas: [...c.rentas] as CasillaDelBurgo['rentas'] }));
}
function copiaDeBarrios(): BarrioDelBurgo[] {
  return BARRIOS.map((b) => ({ ...b, solares: [...b.solares] }));
}

console.log('\nLa tabla del Burgo y sus tres mecánicas: anillo, hacienda y mazo\n');

// ═══════════════════════════════════════════════════════════════════════════
paso('1. La tabla se lee por posición: 40 filas, cada clase donde el reglamento dice');
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lo que la tabla tiene que cumplir, como LISTA DE REPROCHES y no como
 * comprobaciones sueltas: así la misma función juzga la tabla buena y la
 * envenenada, y el veneno tiene que salir con nombre.
 */
function reprochesDeLaTabla(casillas: readonly CasillaDelBurgo[], barrios: readonly BarrioDelBurgo[]): string[] {
  const r: string[] = [];
  if (casillas.length !== CUANTAS_CASILLAS) r.push(`hay ${casillas.length} filas y no ${CUANTAS_CASILLAS}`);
  casillas.forEach((c, i) => {
    if (c.indice !== i) r.push(`la fila ${i} dice ser la ${c.indice}`);
  });
  const clase = (i: number): string => casillas[i]?.clase ?? '(no hay)';
  const precio = (i: number): number => casillas[i]?.precio ?? -1;
  if (clase(0) !== 'salida') r.push('la 0 no es la salida');
  if (clase(10) !== 'mazmorra') r.push('la 10 no es la Comisaría');
  if (clase(20) !== 'feria') r.push('la 20 no es el Descanso');
  if (clase(30) !== 'a-la-mazmorra') r.push('la 30 no es ¡A comisaría!');
  if (clase(4) !== 'diezmo' || precio(4) !== 200) r.push('el Impuesto no está en la 4 cobrando 200');
  if (clase(38) !== 'alcabala' || precio(38) !== 100) r.push('la Tasa no está en la 38 cobrando 100');
  for (const p of [5, 15, 25, 35]) if (clase(p) !== 'puerta' || precio(p) !== 200) r.push(`la ${p} no es una estación de 200`);
  for (const o of [12, 28]) if (clase(o) !== 'oficio' || precio(o) !== 150) r.push(`la ${o} no es un servicio de 150`);
  for (const a of [2, 17, 33]) if (clase(a) !== 'arca') r.push(`la ${a} no es del Fondo Vecinal`);
  for (const p of [7, 22, 36]) if (clase(p) !== 'pregon') r.push(`la ${p} no es de Sucesos`);
  const cuantasDe = (que: string): number => casillas.filter((c) => c.clase === que).length;
  if (cuantasDe('puerta') !== 4) r.push(`hay ${cuantasDe('puerta')} estaciones`);
  if (cuantasDe('oficio') !== 2) r.push(`hay ${cuantasDe('oficio')} servicios`);
  if (cuantasDe('arca') !== 3) r.push(`hay ${cuantasDe('arca')} casillas del Fondo Vecinal`);
  if (cuantasDe('pregon') !== 3) r.push(`hay ${cuantasDe('pregon')} casillas de Sucesos`);
  if (cuantasDe('solar') !== 22) r.push(`hay ${cuantasDe('solar')} solares`);

  for (const c of casillas) {
    if (c.nombre.trim().length === 0) r.push(`la ${c.indice} no tiene nombre`);
    if (c.rotulo.trim().length === 0 || c.rotulo.length > 6) r.push(`el rótulo de la ${c.indice} («${c.rotulo}») no tiene entre 1 y 6 letras`);
    if (c.rentas.length !== 6) r.push(`la ${c.indice} no tiene seis rentas`);
    for (const v of [c.precio, c.casa, ...c.rentas]) {
      if (!Number.isInteger(v) || v < 0) r.push(`la ${c.indice} lleva un número que no es entero no negativo: ${v}`);
    }
    if (c.precio % 2 !== 0) r.push(`el precio de la ${c.indice} es impar: ${c.precio}`);
    if (c.clase === 'solar') {
      if (c.barrio === null) r.push(`el solar ${c.indice} no tiene barrio`);
      if (c.casa <= 0) r.push(`el solar ${c.indice} no tiene precio de casa`);
      if (c.precio <= 0) r.push(`el solar ${c.indice} no tiene precio`);
      for (let k = 1; k < 6; k++) {
        if (!((c.rentas[k] as number) > (c.rentas[k - 1] as number))) r.push(`las rentas del solar ${c.indice} no crecen en el tramo ${k}`);
      }
    } else {
      if (c.barrio !== null) r.push(`la ${c.indice} no es solar y tiene barrio`);
      if (c.casa !== 0) r.push(`la ${c.indice} no es solar y tiene casa`);
      if (c.rentas.some((v) => v !== 0)) r.push(`la ${c.indice} no es solar y tiene rentas`);
      if (c.clase !== 'puerta' && c.clase !== 'oficio' && c.clase !== 'diezmo' && c.clase !== 'alcabala' && c.precio !== 0) {
        r.push(`la ${c.indice} (${c.clase}) lleva precio`);
      }
    }
  }

  if (barrios.length !== 8) r.push(`hay ${barrios.length} barrios`);
  const idsDeBarrio = barrios.map((b) => b.id);
  if (new Set(idsDeBarrio).size !== idsDeBarrio.length) r.push('hay dos barrios con el mismo id');
  for (const b of barrios) {
    if (b.solares.length < 2 || b.solares.length > 3) r.push(`el barrio ${b.id} tiene ${b.solares.length} solares`);
    const losSuyos = casillas.filter((c) => c.clase === 'solar' && c.barrio === b.id).map((c) => c.indice);
    if (!mismaLista(losSuyos, b.solares)) r.push(`los solares del barrio ${b.id} no cuadran con la tabla: ${losSuyos} ≠ ${b.solares}`);
    const casas = new Set(losSuyos.map((i) => casillas[i]?.casa ?? -1));
    if (casas.size !== 1) r.push(`el barrio ${b.id} tiene más de un precio de casa`);
    if (b.nombre.trim().length === 0) r.push(`el barrio ${b.id} no tiene nombre`);
  }
  const solaresSinBarrioConocido = casillas.filter((c) => c.clase === 'solar' && !idsDeBarrio.some((id) => id === c.barrio));
  for (const c of solaresSinBarrioConocido) r.push(`el solar ${c.indice} es de un barrio que no existe: ${c.barrio}`);

  const nombresDeSolar = casillas.filter((c) => c.clase === 'solar').map((c) => c.nombre);
  if (new Set(nombresDeSolar).size !== nombresDeSolar.length) r.push('dos solares se llaman igual');
  return r;
}

{
  const reproches = reprochesDeLaTabla(CASILLAS, BARRIOS);
  comprobar('la tabla de verdad no merece ningún reproche', reproches.length === 0, reproches);
  comprobar(
    'TITULOS son las 28 comprables en orden de índice',
    TITULOS.length === 28 &&
      mismaLista(
        TITULOS,
        CASILLAS.filter((c) => c.clase === 'solar' || c.clase === 'puerta' || c.clase === 'oficio').map((c) => c.indice),
      ) &&
      TITULOS.every((t, i) => i === 0 || t > (TITULOS[i - 1] as number)),
    TITULOS,
  );
  comprobar('PUERTAS y OFICIOS son las constantes del reglamento', mismaLista(PUERTAS, [5, 15, 25, 35]) && mismaLista(OFICIOS, [12, 28]));
  comprobar('barrioDe(11) es el rosa y barrioDe(10) es null', barrioDe(11)?.id === 'rosa' && barrioDe(10) === null && barrioDe(99) === null);

  // Las vacunas: cada veneno se ve con su nombre.
  const movida = copiaDeCasillas();
  const cinco = movida[5] as CasillaDelBurgo;
  movida[5] = movida[6] as CasillaDelBurgo;
  movida[6] = cinco;
  const r1 = reprochesDeLaTabla(movida, BARRIOS);
  comprobar('se ve fallar: dos filas cambiadas de sitio', r1.some((x) => /la fila 5 dice ser la 6/.test(x)) && r1.some((x) => /la 5 no es una estación/.test(x)), r1);

  const impar = copiaDeCasillas();
  impar[1] = { ...(impar[1] as CasillaDelBurgo), precio: 61 };
  const r2 = reprochesDeLaTabla(impar, BARRIOS);
  comprobar('se ve fallar: un precio impar', r2.some((x) => /impar: 61/.test(x)), r2);

  const plana = copiaDeCasillas();
  plana[39] = { ...(plana[39] as CasillaDelBurgo), rentas: [50, 200, 600, 600, 1700, 2000] };
  const r3 = reprochesDeLaTabla(plana, BARRIOS);
  comprobar('se ve fallar: unas rentas que no crecen', r3.some((x) => /rentas del solar 39 no crecen en el tramo 3/.test(x)), r3);

  const cuatro = copiaDeBarrios();
  cuatro[0] = { ...(cuatro[0] as BarrioDelBurgo), solares: [1, 3, 6, 8] };
  const r4 = reprochesDeLaTabla(CASILLAS, cuatro);
  comprobar('se ve fallar: un barrio de cuatro solares', r4.some((x) => /barrio pardo tiene 4 solares/.test(x)) && r4.some((x) => /no cuadran/.test(x)), r4);

  const largo = copiaDeCasillas();
  largo[38] = { ...(largo[38] as CasillaDelBurgo), rotulo: 'Impuesto' };
  const r5 = reprochesDeLaTabla(largo, BARRIOS);
  comprobar('se ve fallar: un rótulo de más de seis letras', r5.some((x) => /rótulo de la 38/.test(x)), r5);

  const conCasa = copiaDeCasillas();
  conCasa[20] = { ...(conCasa[20] as CasillaDelBurgo), casa: 50 };
  const r6 = reprochesDeLaTabla(conCasa, BARRIOS);
  comprobar('se ve fallar: una casa donde no hay solar', r6.some((x) => /la 20 no es solar y tiene casa/.test(x)), r6);

  const treintaYNueve = copiaDeCasillas().slice(0, 39);
  const r7 = reprochesDeLaTabla(treintaYNueve, BARRIOS);
  comprobar('se ve fallar: una fila de menos', r7.some((x) => /hay 39 filas/.test(x)), r7);
}

// ═══════════════════════════════════════════════════════════════════════════
paso('2. Hipoteca, interés y deshipoteca: la tabla entera escrita a mano');
// ═══════════════════════════════════════════════════════════════════════════

/** casilla → [precio, hipoteca, interés, deshipoteca]. Del reglamento §1 y §7, a mano, sin derivar nada. */
const DESEMPENO_A_MANO: readonly (readonly [number, number, number, number, number])[] = [
  [1, 60, 30, 3, 33],
  [3, 60, 30, 3, 33],
  [5, 200, 100, 10, 110],
  [6, 100, 50, 5, 55],
  [8, 100, 50, 5, 55],
  [9, 120, 60, 6, 66],
  [11, 140, 70, 7, 77],
  [12, 150, 75, 8, 83],
  [13, 140, 70, 7, 77],
  [14, 160, 80, 8, 88],
  [15, 200, 100, 10, 110],
  [16, 180, 90, 9, 99],
  [18, 180, 90, 9, 99],
  [19, 200, 100, 10, 110],
  [21, 220, 110, 11, 121],
  [23, 220, 110, 11, 121],
  [24, 240, 120, 12, 132],
  [25, 200, 100, 10, 110],
  [26, 260, 130, 13, 143],
  [27, 260, 130, 13, 143],
  [28, 150, 75, 8, 83],
  [29, 280, 140, 14, 154],
  [31, 300, 150, 15, 165],
  [32, 300, 150, 15, 165],
  [34, 320, 160, 16, 176],
  [35, 200, 100, 10, 110],
  [37, 350, 175, 18, 193],
  [39, 400, 200, 20, 220],
];

{
  comprobar('la tabla a mano cubre exactamente los 28 títulos', mismaLista(DESEMPENO_A_MANO.map((f) => f[0]), TITULOS));
  const malas: string[] = [];
  for (const [casilla, precio, empeno, interes, coste] of DESEMPENO_A_MANO) {
    const fila = CASILLAS[casilla] as CasillaDelBurgo;
    if (fila.precio !== precio) malas.push(`la ${casilla} vale ${fila.precio} y no ${precio}`);
    if (valorDeEmpeno(fila.precio) !== empeno) malas.push(`hipoteca de la ${casilla}: ${valorDeEmpeno(fila.precio)} ≠ ${empeno}`);
    if (interesDelEmpeno(fila.precio) !== interes) malas.push(`interés de la ${casilla}: ${interesDelEmpeno(fila.precio)} ≠ ${interes}`);
    if (costeDeDesempeno(fila.precio) !== coste) malas.push(`deshipoteca de la ${casilla}: ${costeDeDesempeno(fila.precio)} ≠ ${coste}`);
  }
  comprobar('las 28 hipotecas, intereses y deshipotecas son los escritos a mano', malas.length === 0, malas);
  comprobar('toda deshipoteca es entera', DESEMPENO_A_MANO.every((f) => Number.isInteger(costeDeDesempeno(f[1]))));
  comprobar(
    'se ve fallar: redondear el interés hacia abajo cambia el 350 (17,5 → 18, no 17)',
    Math.floor(valorDeEmpeno(350) / 10) + valorDeEmpeno(350) !== costeDeDesempeno(350) && costeDeDesempeno(350) === 193,
  );
  comprobar('se ve fallar: el 150 del servicio también redondea arriba (7,5 → 8)', interesDelEmpeno(150) === 8 && Math.floor(7.5) !== 8);
}

/*
 * LA DÉCIMA DEL IMPUESTO, que es la otra cuenta de un renglón de la tabla y va al revés
 * que el interés: HACIA ABAJO. El Impuesto oficial deja elegir entre la cantidad fija y
 * el 10 % del patrimonio, y el rótulo del botón promete la misma cifra que el reductor
 * cobra porque los dos llaman aquí. Redondear hacia arriba haría que la «décima» costara
 * más que una décima, y con un patrimonio de 2.441 la diferencia es de un euro que nadie
 * vería en una partida y que dejaría el saldo descuadrado en la siguiente.
 */
{
  const aMano: readonly (readonly [number, number])[] = [
    [0, 0],
    [9, 0],
    [10, 1],
    [90, 9],
    [1500, 150],
    [2440, 244],
    [2441, 244],
    [2449, 244],
    [12345, 1234],
  ];
  const malas: string[] = [];
  for (const [patrimonio, decima] of aMano) {
    if (decimaDelPatrimonio(patrimonio) !== decima) malas.push(`el 10 % de ${patrimonio} da ${decimaDelPatrimonio(patrimonio)} y no ${decima}`);
  }
  comprobar('la décima del Impuesto es la de la tabla escrita a mano, y siempre entera', malas.length === 0, malas);
  comprobar('la parte del Impuesto es una décima, no otra cosa', PARTE_DEL_IMPUESTO === 10);
  comprobar('se ve fallar: redondear hacia ARRIBA cambiaría el 2.441 (244,1 → 245, no 244)', Math.ceil(2441 / PARTE_DEL_IMPUESTO) !== decimaDelPatrimonio(2441) && decimaDelPatrimonio(2441) === 244);
  comprobar('un patrimonio imposible (negativo, NaN, infinito) no cobra nada en vez de decir «NaN €»', decimaDelPatrimonio(-500) === 0 && decimaDelPatrimonio(Number.NaN) === 0 && decimaDelPatrimonio(Number.POSITIVE_INFINITY) === 0);
}

// ═══════════════════════════════════════════════════════════════════════════
paso('3. Las cartas: 16 + 16, numeradas sin huecos, y la serie va y vuelve');
// ═══════════════════════════════════════════════════════════════════════════

function reprochesDelMazo(mazo: MazoId, cartas: readonly CartaDelBurgo[]): string[] {
  const r: string[] = [];
  if (cartas.length !== CARTAS_POR_MAZO) r.push(`${mazo} tiene ${cartas.length} cartas`);
  cartas.forEach((c, i) => {
    if (c.numero !== i + 1) r.push(`la carta ${i} de ${mazo} lleva el número ${c.numero}`);
    if (c.mazo !== mazo) r.push(`la carta ${c.numero} dice ser de ${c.mazo}`);
    if (c.titulo.trim().length === 0 || c.texto.trim().length < 10) r.push(`la carta ${c.numero} de ${mazo} no tiene título o texto`);
    if (c.efecto.que === 'ir') {
      const destino = CASILLAS[c.efecto.a];
      if (destino === undefined) r.push(`la carta ${c.numero} de ${mazo} manda a una casilla que no existe`);
      else if (destino.clase === 'pregon' || destino.clase === 'arca') r.push(`la carta ${c.numero} de ${mazo} manda a otra carta`);
    }
    if ((c.efecto.que === 'cobra' || c.efecto.que === 'paga' || c.efecto.que === 'paga-a-cada-uno' || c.efecto.que === 'cobra-de-cada-uno') && !(c.efecto.cuanto > 0)) {
      r.push(`la carta ${c.numero} de ${mazo} mueve 0`);
    }
  });
  const indultos = cartas.filter((c) => c.efecto.que === 'indulto').length;
  if (indultos !== 1) r.push(`${mazo} tiene ${indultos} Salvoconductos y no uno`);
  return r;
}

{
  const rp = reprochesDelMazo('pregon', EL_PREGON);
  const ra = reprochesDelMazo('arca', EL_ARCA);
  comprobar('Sucesos no merece reproche', rp.length === 0, rp);
  comprobar('el Fondo Vecinal no merece reproche', ra.length === 0, ra);
  comprobar('cartasDe devuelve cada tabla', cartasDe('pregon') === EL_PREGON && cartasDe('arca') === EL_ARCA);
  comprobar('Sucesos manda a comisaría, al servicio y a las estaciones cercanas', EL_PREGON.some((c) => c.efecto.que === 'a-la-mazmorra') && EL_PREGON.filter((c) => c.efecto.que === 'puerta-cercana').length === 2 && EL_PREGON.some((c) => c.efecto.que === 'oficio-cercano'));
  comprobar('el Fondo Vecinal tiene las dos de «cada jugador te paga» y una obra', EL_ARCA.filter((c) => c.efecto.que === 'cobra-de-cada-uno').length === 2 && EL_ARCA.some((c) => c.efecto.que === 'reparaciones'));

  const idaYVuelta: string[] = [];
  for (const mazo of ['pregon', 'arca'] as const) {
    for (const c of cartasDe(mazo)) {
      const serie = serieDeCarta(mazo, c.numero);
      if (!/^[pa]\d\d$/.test(serie)) idaYVuelta.push(`serie rara: ${serie}`);
      if (numeroDeSerie(serie) !== c.numero) idaYVuelta.push(`${serie} → ${numeroDeSerie(serie)}`);
      if (mazoDeSerie(serie) !== mazo) idaYVuelta.push(`${serie} es de ${mazoDeSerie(serie)}`);
      if (carta(mazo, c.numero) !== c) idaYVuelta.push(`carta(${mazo}, ${c.numero}) no es la de la tabla`);
    }
  }
  comprobar('las 32 series van y vuelven, y carta() encuentra cada una', idaYVuelta.length === 0, idaYVuelta);
  comprobar("serieDeCarta('pregon', 7) es 'p07' y ('arca', 12) es 'a12'", serieDeCarta('pregon', 7) === 'p07' && serieDeCarta('arca', 12) === 'a12');
  const basura = ['', 'p', 'p7', 'p00', 'p17', 'x07', '07p', 'p0a', 'P07', 'a012'];
  comprobar('numeroDeSerie devuelve 0 con lo que no cuadra', basura.every((s) => numeroDeSerie(s) === 0), basura.map((s) => [s, numeroDeSerie(s)]));
  comprobar('mazoDeSerie devuelve null con lo que no cuadra', basura.every((s) => mazoDeSerie(s) === null));
  comprobar('carta() devuelve null fuera de 1..16', carta('pregon', 0) === null && carta('arca', 17) === null && carta('pregon', 2.5) === null);
  const series = seriesDe('pregon');
  comprobar("seriesDe('pregon') son 16 distintas de 'p01' a 'p16'", series.length === 16 && new Set(series).size === 16 && series[0] === 'p01' && series[15] === 'p16');
  comprobar('las series del Fondo Vecinal no se confunden con las de Sucesos', seriesDe('arca').every((s) => !contiene(series, s)));

  const conHueco = EL_ARCA.map((c) => (c.numero === 9 ? { ...c, numero: 10 } : c));
  const r1 = reprochesDelMazo('arca', conHueco);
  comprobar('se ve fallar: un número repetido en el Fondo Vecinal', r1.some((x) => /la carta 8 de arca lleva el número 10/.test(x)), r1);
  const aOtraCarta = EL_PREGON.map((c) => (c.numero === 5 ? { ...c, efecto: { que: 'ir' as const, a: 7, cobraAlPasar: true } } : c));
  const r2 = reprochesDelMazo('pregon', aOtraCarta);
  comprobar('se ve fallar: una carta que manda a otra carta', r2.some((x) => /manda a otra carta/.test(x)), r2);
  const dosIndultos = EL_PREGON.map((c) => (c.numero === 9 ? { ...c, efecto: { que: 'indulto' as const } } : c));
  const r3 = reprochesDelMazo('pregon', dosIndultos);
  comprobar('se ve fallar: dos Salvoconductos en un mazo', r3.some((x) => /2 Salvoconductos/.test(x)), r3);
}

// ═══════════════════════════════════════════════════════════════════════════
paso('4. Ninguna marca ajena, ni en los textos ni en los comentarios');
// ═══════════════════════════════════════════════════════════════════════════

/** Igual que en `verificar-procedencia.ts`: sin acentos, sin mayúsculas, sin puntuación. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** ¿Aparece la marca como PALABRA ENTERA? Una marca dentro de otra palabra (o su plural) no cuenta. */
function apareceEn(marca: string, textoNormalizado: string): boolean {
  return ` ${textoNormalizado} `.indexOf(` ${normalizar(marca)} `) >= 0;
}

function marcasEn(texto: string): string[] {
  const n = normalizar(texto);
  return MARCAS_VETADAS.filter((m) => apareceEn(m.nombre, n)).map((m) => m.nombre);
}

{
  const textos: string[] = [];
  for (const c of CASILLAS) textos.push(c.nombre, c.rotulo);
  for (const b of BARRIOS) textos.push(b.nombre);
  for (const c of [...EL_PREGON, ...EL_ARCA]) textos.push(c.titulo, c.texto);
  const conMarca = textos.filter((t) => marcasEn(t).length > 0);
  comprobar(`ninguno de los ${textos.length} textos de la tabla lleva una marca vetada`, conMarca.length === 0, conMarca);
  comprobar('y se han mirado textos de verdad', textos.length >= 40 * 2 + 8 + 32 * 2);

  const FICHEROS_NUEVOS = [
    'shared/arcade/juegos/burgo-tablero.ts',
    'shared/mecanicas/anillo.ts',
    'shared/mecanicas/hacienda.ts',
    'shared/mecanicas/mazo.ts',
    'server/scripts/verificar-mecanicas-del-burgo.ts',
  ];
  const conMarcaEnFuente = FICHEROS_NUEVOS.flatMap((f) => {
    const fuente = fs.readFileSync(path.join(RAIZ, f), 'utf8');
    return marcasEn(fuente).map((m) => `${f}: ${m}`);
  });
  comprobar('ningún fichero nuevo del Burgo nombra una marca, comentarios incluidos', conMarcaEnFuente.length === 0, conMarcaEnFuente);
  comprobar('los cinco ficheros existen y no están vacíos', FICHEROS_NUEVOS.every((f) => fs.statSync(path.join(RAIZ, f)).size > 500));

  // Las vacunas. Las marcas se leen de la lista: aquí no se escribe ninguna.
  const laDelJuegoDeSolares = MARCAS_VETADAS.find((m) => m.porque.indexOf('caso de manual') >= 0);
  const laCastellana = MARCAS_VETADAS.find((m) => m.porque.indexOf('palabra de economía') >= 0);
  comprobar('la lista trae las dos marcas del juego del que el Burgo desciende', laDelJuegoDeSolares !== undefined && laCastellana !== undefined);
  if (laDelJuegoDeSolares !== undefined && laCastellana !== undefined) {
    const envenenado = `Compra solares como en el ${laDelJuegoDeSolares.nombre} de siempre.`;
    comprobar('se ve fallar: un texto con la marca en inglés', marcasEn(envenenado).length === 1, marcasEn(envenenado));
    const envenenadoEs = `Tener el barrio entero es un ${laCastellana.nombre.toUpperCase()}`;
    comprobar('se ve fallar: la forma castellana, en mayúsculas', marcasEn(envenenadoEs).length === 1, marcasEn(envenenadoEs));
    const plural = `${laCastellana.nombre}s`;
    comprobar(
      'y una forma derivada (el plural) NO casa: límite conocido, dicho en la cabecera de procedencia',
      marcasEn(plural).length === 0 && normalizar(plural).indexOf(normalizar(laCastellana.nombre)) >= 0,
    );
  }
  const piezas = MARCAS_VETADAS.find((m) => m.porque.indexOf('agresividad documentada') >= 0);
  comprobar('la lista trae la marca de piezas de construcción', piezas !== undefined);
  if (piezas !== undefined) {
    comprobar('se compara por palabra entera: la marca dentro de otra palabra no casa, suelta sí', marcasEn(`Casas de ${piezas.nombre}s`).length === 0 && marcasEn(`Casas de ${piezas.nombre} en la plaza`).length === 1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
paso('5. Los ocho colores de acera, medidos contra los seis de asiento y contra el blanco');
// ═══════════════════════════════════════════════════════════════════════════

/** Los seis colores de asiento del diseño (§2.1). Si `burgo.ts` ya existe, se contrastan con los suyos. */
const COLORES_DE_ASIENTO_DEL_DISENO: readonly string[] = ['#f2e8cf', '#26262e', '#7d3fd6', '#2fe0d0', '#ff8f6b', '#c5e84a'];
const SEPARACION_POR_CANAL = 60;
const SEPARACION_SUMADA = 100;
const CONTRASTE_MINIMO_DEL_BLANCO = 3;

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function lineal(canal: number): number {
  const c = canal / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminancia(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}
function contrasteConBlanco(hex: string): number {
  return 1.05 / (luminancia(hex) + 0.05);
}
function separacion(a: string, b: string): { maximo: number; suma: number } {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const d = [Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2)];
  return { maximo: Math.max(d[0] as number, d[1] as number, d[2] as number), suma: (d[0] as number) + (d[1] as number) + (d[2] as number) };
}

function reprochesDeColores(aceras: readonly { id: string; color: string }[], asientos: readonly string[]): string[] {
  const r: string[] = [];
  for (const a of aceras) {
    if (!/^#[0-9a-f]{6}$/.test(a.color)) {
      r.push(`${a.id}: «${a.color}» no es #rrggbb en minúsculas`);
      continue;
    }
    const contraste = contrasteConBlanco(a.color);
    if (contraste < CONTRASTE_MINIMO_DEL_BLANCO) r.push(`${a.id}: el blanco encima contrasta ${contraste.toFixed(2)}:1`);
    asientos.forEach((s, i) => {
      const { maximo, suma } = separacion(a.color, s);
      if (maximo < SEPARACION_POR_CANAL || suma < SEPARACION_SUMADA) r.push(`${a.id} se pega al asiento ${i} (${s}): máximo ${maximo}, suma ${suma}`);
    });
  }
  const colores = aceras.map((a) => a.color);
  if (new Set(colores).size !== colores.length) r.push('dos aceras del mismo color');
  return r;
}

{
  const r = reprochesDeColores(BARRIOS, COLORES_DE_ASIENTO_DEL_DISENO);
  comprobar('las ocho aceras se separan de los seis asientos y dejan leer el blanco', r.length === 0, r);
  comprobar('se han mirado 8 × 6 parejas', BARRIOS.length * COLORES_DE_ASIENTO_DEL_DISENO.length === 48);

  const conMarfil = BARRIOS.map((b) => (b.id === 'amarillo' ? { id: b.id, color: '#f2e8cf' } : b));
  const r1 = reprochesDeColores(conMarfil, COLORES_DE_ASIENTO_DEL_DISENO);
  comprobar('se ve fallar: una acera del color del marfil', r1.some((x) => /amarillo se pega al asiento 0/.test(x)), r1);
  const casiCoral = BARRIOS.map((b) => (b.id === 'naranja' ? { id: b.id, color: '#f08560' } : b));
  const r2 = reprochesDeColores(casiCoral, COLORES_DE_ASIENTO_DEL_DISENO);
  comprobar('se ve fallar: un naranja a menos de 60 por canal del coral', r2.some((x) => /naranja se pega al asiento 4/.test(x)), r2);
  const claro = BARRIOS.map((b) => (b.id === 'celeste' ? { id: b.id, color: '#7fc8ff' } : b));
  const r3 = reprochesDeColores(claro, COLORES_DE_ASIENTO_DEL_DISENO);
  comprobar('se ve fallar: un celeste claro no deja leer el blanco', r3.some((x) => /celeste: el blanco encima contrasta/.test(x)), r3);
  const mayusculas = BARRIOS.map((b) => (b.id === 'azul' ? { id: b.id, color: '#1F3A93' } : b));
  const r4 = reprochesDeColores(mayusculas, COLORES_DE_ASIENTO_DEL_DISENO);
  comprobar('se ve fallar: un color en mayúsculas (el retablo compara cadenas)', r4.some((x) => /no es #rrggbb/.test(x)), r4);

  /*
   * Cuando `burgo.ts` exista (paso 2), su `COLORES_DEL_BURGO` tiene que ser la
   * paleta con la que se midieron estas aceras. Se extrae con la MISMA regex que
   * `verify:embarcadero` usa para la de Riberas, y se compara con la del diseño.
   */
  const rutaDelJuego = path.join(RAIZ, 'shared/arcade/juegos/burgo.ts');
  if (fs.existsSync(rutaDelJuego)) {
    const fuente = sinComentarios(fs.readFileSync(rutaDelJuego, 'utf8'));
    const m = /COLORES_DEL_BURGO\s*:\s*readonly string\[\]\s*=\s*\[([^\]]*)\]/.exec(fuente);
    const suyos = m === null ? [] : (m[1] as string).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter((s) => s.length > 0);
    comprobar('burgo.ts declara COLORES_DEL_BURGO con la forma exacta que la regex extrae', m !== null, fuente.slice(0, 0));
    comprobar('y son los seis colores contra los que se midieron las aceras', suyos.length === 6 && suyos.every((c, i) => c === COLORES_DE_ASIENTO_DEL_DISENO[i]), suyos);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
paso('6. El anillo: módulo positivo, recorrido, salida, la puerta más cercana, y el cuadrado 8 × 14 × 11');
// ═══════════════════════════════════════════════════════════════════════════

{
  const N = 40;
  const casos: readonly (readonly [number, number, number])[] = [
    [0, 7, 7],
    [39, 3, 2],
    [1, -3, 38],
    [0, -1, 39],
    [10, 40, 10],
    [10, -40, 10],
    [38, 12, 10],
    [7, 0, 7],
    [3, 81, 4],
  ];
  const malas = casos.filter(([d, p, e]) => casillaTras(d, p, N) !== e).map(([d, p, e]) => `${d} + ${p} = ${casillaTras(d, p, N)} y no ${e}`);
  comprobar('casillaTras: nueve casos, con negativos y vueltas enteras', malas.length === 0, malas);
  comprobar('casillaTras con un anillo sin casillas devuelve 0 y no NaN', casillaTras(5, 3, 0) === 0 && casillaTras(5, 3, -1) === 0);
  const sinModuloPositivo = (d: number, p: number, n: number): number => (d + p) % n;
  comprobar('se ve fallar: el % de JavaScript da negativo al retroceder', casos.some(([d, p, e]) => sinModuloPositivo(d, p, N) !== e));

  comprobar('recorrido hacia delante: sin la salida, con la llegada, en orden', mismaLista(recorrido(37, 5, N), [38, 39, 0, 1, 2]));
  comprobar('recorrido hacia atrás (retrocede tres desde la 1)', mismaLista(recorrido(1, -3, N), [0, 39, 38]));
  comprobar('recorrido de cero pasos es vacío', recorrido(5, 0, N).length === 0 && recorrido(5, 3, 0).length === 0);
  comprobar('el recorrido de 12 acaba donde casillaTras', recorrido(33, 12, N)[11] === casillaTras(33, 12, N) && recorrido(33, 12, N).length === 12);

  comprobar('cruzaLaSalida: 39 + 3 sí, 5 + 3 no, 37 + 3 (cae en la 0) sí, 0 + 5 no', cruzaLaSalida(39, 3, N) && !cruzaLaSalida(5, 3, N) && cruzaLaSalida(37, 3, N) && !cruzaLaSalida(0, 5, N));
  comprobar('cruzaLaSalida: hacia atrás nunca, ni desde la 1', !cruzaLaSalida(1, -3, N) && !cruzaLaSalida(0, -1, N) && !cruzaLaSalida(5, 0, N));
  comprobar('cruzaLaSalida: una carta desde Sucesos 36 hasta la Estación del Puerto (5) la cruza; hasta la Central (35) no', cruzaLaSalida(36, distanciaAdelante(36, 5, N), N) && !cruzaLaSalida(22, distanciaAdelante(22, 35, N), N));
  const sinCaerEnLaCero = (d: number, p: number, n: number): boolean => d + p > n;
  comprobar('se ve fallar: un «>» donde va «≥» no cobra al caer justo en la 0 desde la 37', !sinCaerEnLaCero(37, 3, N) && cruzaLaSalida(37, 3, N));
  const porLaFinal = (d: number, p: number, n: number): boolean => casillaTras(d, p, n) < d;
  comprobar('se ve fallar: mirar sólo la casilla final («acabó más atrás») cobra 200 al retroceder tres desde la 5', porLaFinal(5, -3, N) && !cruzaLaSalida(5, -3, N));

  comprobar('distanciaAdelante: 39→5 son 6, 5→39 son 34, 7→7 es 0', distanciaAdelante(39, 5, N) === 6 && distanciaAdelante(5, 39, N) === 34 && distanciaAdelante(7, 7, N) === 0);
  comprobar('masCercana desde la 39 con las puertas es la 5 (no la 35)', masCercana(39, PUERTAS, N) === 5);
  comprobar('masCercana desde cada Sucesos: estaciones 15/25/5, servicios 12/28/12', masCercana(7, PUERTAS, N) === 15 && masCercana(22, PUERTAS, N) === 25 && masCercana(36, PUERTAS, N) === 5 && masCercana(7, OFICIOS, N) === 12 && masCercana(22, OFICIOS, N) === 28 && masCercana(36, OFICIOS, N) === 12);
  comprobar('masCercana no cuenta la propia casilla como «hacia delante»', masCercana(5, PUERTAS, N) === 15 && masCercana(5, [5], N) === 5);
  comprobar('masCercana sin candidatas devuelve la propia', masCercana(9, [], N) === 9);
  const porMinimoAbsoluto = (d: number, cs: readonly number[]): number => cs.reduce((m, c) => (Math.abs(c - d) < Math.abs(m - d) ? c : m), cs[0] as number);
  comprobar('se ve fallar: la más cercana por distancia absoluta daría la 35 desde la 39', porMinimoAbsoluto(39, PUERTAS) === 35);

  // El anillo cuadrado del Burgo: 8 de ancho, 14 de fondo, 11 por lado.
  const ANCHO = 8;
  const FONDO = 14;
  const POR_LADO = 11;
  comprobar('casillasDelAnillo(11) es 40 y medioLado(8, 14, 11) es 50', casillasDelAnillo(POR_LADO) === 40 && medioLado(ANCHO, FONDO, POR_LADO) === 50);
  const sitios: SitioEnElAnillo[] = [];
  for (let i = 0; i < 40; i++) sitios.push(sitioDeCasilla(i, ANCHO, FONDO, POR_LADO));

  function reprochesDelAnillo(s: readonly SitioEnElAnillo[]): string[] {
    const r: string[] = [];
    const medio = medioLado(ANCHO, FONDO, POR_LADO);
    const banda = medio - FONDO / 2; // 43
    const esquinas: readonly (readonly [number, number, number])[] = [
      [0, banda, banda],
      [10, -banda, banda],
      [20, -banda, -banda],
      [30, banda, -banda],
    ];
    for (const [i, x, z] of esquinas) {
      const q = s[i] as SitioEnElAnillo;
      if (!q.esEsquina || q.x !== x || q.z !== z) r.push(`la esquina ${i} está en (${q.x}, ${q.z}) y no en (${x}, ${z})`);
    }
    s.forEach((q, i) => {
      const lado = Math.floor(i / 10);
      if (q.lado !== lado) r.push(`la ${i} dice ser del lado ${q.lado}`);
      if (q.esEsquina !== (i % 10 === 0)) r.push(`la ${i} ${q.esEsquina ? 'dice ser' : 'no dice ser'} esquina`);
      if (q.cuartos !== (4 - lado) % 4) r.push(`la ${i} gira ${q.cuartos} cuartos`);
      const enBanda = lado === 0 ? q.z === banda : lado === 1 ? q.x === -banda : lado === 2 ? q.z === -banda : q.x === banda;
      if (!enBanda) r.push(`la ${i} no está en la banda de su lado: (${q.x}, ${q.z})`);
      if (Math.abs(q.x) > medio || Math.abs(q.z) > medio) r.push(`la ${i} se sale del anillo`);
      if (!Number.isFinite(q.x) || !Number.isFinite(q.z)) r.push(`la ${i} no tiene coordenadas`);
    });
    // Paso de 8 entre vecinas de un lado, 11 entre la esquina y la primera del lado.
    for (let i = 0; i < 40; i++) {
      const a = s[i] as SitioEnElAnillo;
      const b = s[(i + 1) % 40] as SitioEnElAnillo;
      const paso = Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
      const esperado = a.esEsquina || b.esEsquina ? FONDO / 2 + ANCHO / 2 : ANCHO;
      if (paso !== esperado) r.push(`entre la ${i} y la siguiente hay ${paso} y no ${esperado}`);
    }
    // Cada lado es el anterior girado un cuarto: (x, z) → (−z, x).
    for (let i = 0; i < 30; i++) {
      const a = s[i] as SitioEnElAnillo;
      const b = s[i + 10] as SitioEnElAnillo;
      if (b.x !== -a.z || b.z !== a.x) r.push(`la ${i + 10} no es la ${i} girada un cuarto`);
    }
    const llaves = s.map((q) => `${q.x},${q.z}`);
    if (new Set(llaves).size !== s.length) r.push('dos casillas en el mismo sitio');
    return r;
  }

  const r = reprochesDelAnillo(sitios);
  comprobar('las 40 casillas del anillo 8 × 14 × 11 caen donde deben: esquinas, bandas, pasos y cuartos', r.length === 0, r);
  comprobar('la casilla 1 está a 11 de la esquina y la 9 a 11 de la siguiente: (32, 43) y (−32, 43)', (sitios[1] as SitioEnElAnillo).x === 32 && (sitios[1] as SitioEnElAnillo).z === 43 && (sitios[9] as SitioEnElAnillo).x === -32);
  comprobar('el lado 3 baja por la derecha: la 31 está en (43, −32) y la 39 en (43, 32)', (sitios[31] as SitioEnElAnillo).x === 43 && (sitios[31] as SitioEnElAnillo).z === -32 && (sitios[39] as SitioEnElAnillo).z === 32);
  comprobar('sitioDeCasilla da la vuelta con 40 y con −1', JSON.stringify(sitioDeCasilla(40, ANCHO, FONDO, POR_LADO)) === JSON.stringify(sitios[0]) && JSON.stringify(sitioDeCasilla(-1, ANCHO, FONDO, POR_LADO)) === JSON.stringify(sitios[39]));
  comprobar('con la losa de 6 × 6 y 11 por lado el medio lado sería 33, y no cierra nada de 54 (por eso el diseño manda 8 × 14)', medioLado(6, 6, 11) === 33);

  const movida = sitios.map((q, i) => (i === 17 ? { ...q, x: q.x + 1 } : q));
  const r1 = reprochesDelAnillo(movida);
  comprobar('se ve fallar: una casilla fuera de su banda', r1.some((x) => /la 17 no está en la banda/.test(x)) && r1.some((x) => /entre la 16 y la siguiente/.test(x)), r1);
  const girada = sitios.map((q, i) => (i === 25 ? { ...q, cuartos: 3 as const } : q));
  const r2 = reprochesDelAnillo(girada);
  comprobar('se ve fallar: un cuarto de giro equivocado', r2.some((x) => /la 25 gira 3 cuartos/.test(x)), r2);
  const encimada = sitios.map((q, i) => (i === 3 ? { ...(sitios[4] as SitioEnElAnillo) } : q));
  const r3 = reprochesDelAnillo(encimada);
  comprobar('se ve fallar: dos casillas en el mismo sitio', r3.some((x) => /mismo sitio/.test(x)), r3);
}

// ═══════════════════════════════════════════════════════════════════════════
paso('7. La hacienda: todo o nada, enteros, claves en orden, y el no-op es el mismo objeto');
// ═══════════════════════════════════════════════════════════════════════════

function reprochesDeSaldos(s: Saldos): string[] {
  const r: string[] = [];
  const claves = Object.keys(s);
  const ordenadas = [...claves].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (claves.some((k, i) => k !== ordenadas[i])) r.push(`las claves no están en orden: ${claves.join(',')}`);
  for (const k of claves) {
    const v = s[k] as number;
    if (!Number.isInteger(v)) r.push(`${k} tiene ${v}, que no es entero`);
    else if (v < 0) r.push(`${k} tiene ${v}, que es negativo`);
  }
  return r;
}

{
  const mesa: Saldos = { b: 300, a: 1500, c: 40 };
  comprobar('asientosDe ordena las claves', mismaLista(asientosDe(mesa).map((k) => k.charCodeAt(0)), ['a', 'b', 'c'].map((k) => k.charCodeAt(0))));
  comprobar('saldoDe da 0 al que no consta y al Ayuntamiento', saldoDe(mesa, 'z') === 0 && saldoDe(mesa, null) === 0 && saldoDe(mesa, 'a') === 1500);

  const t1 = transferir(mesa, 'a', 'b', 100);
  comprobar('a paga 100 a b: pagado 100, deuda 0, saldos nuevos', t1.pagado === 100 && t1.deuda === 0 && t1.saldos !== mesa && t1.saldos.a === 1400 && t1.saldos.b === 400 && t1.saldos.c === 40);
  comprobar('y no se ha creado ni perdido un euro', totalEnMesa(t1.saldos) === totalEnMesa(mesa) && totalEnMesa(mesa) === 1840);
  comprobar('los saldos nuevos salen con las claves en orden y enteros', reprochesDeSaldos(t1.saldos).length === 0 && mismaLista(Object.keys(t1.saldos).map((k) => k.charCodeAt(0)), [97, 98, 99]));
  comprobar('el objeto de entrada no se ha tocado', mesa.a === 1500 && mesa.b === 300);

  const t2 = transferir(mesa, 'c', 'a', 100);
  comprobar('c debe 100 y tiene 40: no se mueve nada, deuda 100, EL MISMO objeto', t2.saldos === mesa && t2.pagado === 0 && t2.deuda === 100);
  const t3 = transferir(mesa, 'c', 'a', 40);
  comprobar('c paga justo lo que tiene y se queda a cero', t3.saldos.c === 0 && t3.saldos.a === 1540 && t3.deuda === 0);

  const t4 = transferir(mesa, null, 'd', 200);
  comprobar('cobrar del Ayuntamiento crea dinero y da de alta al asiento, en su sitio', t4.saldos.d === 200 && totalEnMesa(t4.saldos) === 2040 && mismaLista(Object.keys(t4.saldos).map((k) => k.charCodeAt(0)), [97, 98, 99, 100]));
  const t5 = transferir(mesa, 'a', null, 200);
  comprobar('pagar al Ayuntamiento destruye dinero', t5.saldos.a === 1300 && totalEnMesa(t5.saldos) === 1640 && t5.pagado === 200);
  const t6 = transferir(mesa, 'z', 'a', 50);
  comprobar('quien no consta tiene 0 y debe', t6.saldos === mesa && t6.deuda === 50);
  const t7 = transferir(mesa, null, 'aa', 10);
  comprobar('un asiento nuevo que va entre dos claves se inserta en orden («aa» entre «a» y «b»)', mismaLista(Object.keys(t7.saldos).map((k) => k.length * 100 + k.charCodeAt(0)), [197, 297, 198, 199]));

  comprobar('pagarse a uno mismo, o cero, o negativo, o NaN: el mismo objeto', [transferir(mesa, 'a', 'a', 100), transferir(mesa, 'a', 'b', 0), transferir(mesa, 'a', 'b', -5), transferir(mesa, 'a', 'b', Number.NaN), transferir(mesa, null, null, 100)].every((t) => t.saldos === mesa && t.pagado === 0 && t.deuda === 0));
  comprobar('una cantidad con decimales se trunca (12,9 → 12)', transferir(mesa, 'a', 'b', 12.9).pagado === 12 && transferir(mesa, 'a', 'b', 12.9).saldos.a === 1488);
  comprobar('puedePagar: a sí, c no, el Ayuntamiento siempre', puedePagar(mesa, 'a', 1500) && !puedePagar(mesa, 'c', 41) && puedePagar(mesa, null, 999999));
  comprobar('sumaDeDeudas suma enteros y trata lo raro como 0', sumaDeDeudas([{ a: null, cuanto: 50 }, { a: 'b', cuanto: 25.7 }, { a: 'c', cuanto: -3 }]) === 75 && sumaDeDeudas([]) === 0);

  const r1 = reprochesDeSaldos({ b: 1, a: 2 });
  comprobar('se ve fallar: unos saldos con las claves desordenadas', r1.some((x) => /no están en orden/.test(x)), r1);
  const r2 = reprochesDeSaldos({ a: 1.5 });
  comprobar('se ve fallar: un saldo con céntimos', r2.some((x) => /no es entero/.test(x)), r2);
  const r3 = reprochesDeSaldos({ a: -3 });
  comprobar('se ve fallar: un saldo negativo', r3.some((x) => /negativo/.test(x)), r3);
  const aMedias = (s: Saldos, de: string, cuanto: number): number => Math.min(cuanto, saldoDe(s, de));
  comprobar('se ve fallar: un pago «a medias» dejaría a c pagando 40 de 100, que es lo que el reglamento prohíbe', aMedias(mesa, 'c', 100) === 40 && transferir(mesa, 'c', 'a', 100).pagado === 0);
}

// ═══════════════════════════════════════════════════════════════════════════
paso('8. El mazo: robar rota al fondo sin perder ni duplicar; sacar y devolver son inversas');
// ═══════════════════════════════════════════════════════════════════════════

function mismoMonton(a: Mazo, b: Mazo): boolean {
  const x = [...a].sort((p, q) => (p < q ? -1 : p > q ? 1 : 0));
  const y = [...b].sort((p, q) => (p < q ? -1 : p > q ? 1 : 0));
  return x.length === y.length && x.every((s, i) => s === y[i]);
}

{
  const original = seriesDe('arca');
  let mazo: Mazo = original;
  const salidas: string[] = [];
  const reproches: string[] = [];
  for (let i = 0; i < 16; i++) {
    const robo = robar(mazo);
    salidas.push(robo.serie);
    if (!mismoMonton(robo.mazo, original)) reproches.push(`tras robar ${i + 1} veces el montón ya no es el mismo`);
    if (robo.mazo.length !== 16) reproches.push(`tras robar ${i + 1} veces quedan ${robo.mazo.length}`);
    if (robo.mazo[15] !== robo.serie) reproches.push(`la robada ${robo.serie} no está al fondo`);
    mazo = robo.mazo;
  }
  comprobar('robar dieciséis veces saca las dieciséis en orden y deja el mazo como estaba', reproches.length === 0 && mismaLista(salidas.map((s) => numeroDeSerie(s)), original.map((s) => numeroDeSerie(s))) && mazo.every((s, i) => s === original[i]), reproches);
  comprobar('robar no muta la lista de entrada', original.every((s, i) => s === seriesDe('arca')[i]));
  comprobar("cima ve la de arriba sin robarla; en un mazo vacío es ''", cima(original) === 'a01' && cima([]) === '');
  const vacio: Mazo = [];
  const roboVacio = robar(vacio);
  comprobar("robar de un mazo vacío da '' y EL MISMO mazo", roboVacio.serie === '' && roboVacio.mazo === vacio);

  const sinIndulto = sacar(original, 'a05');
  comprobar("sacar('a05') lo quita y respeta el orden de los demás", sinIndulto.length === 15 && !contiene(sinIndulto, 'a05') && sinIndulto[4] === 'a06' && sinIndulto[0] === 'a01');
  comprobar('sacar lo que no está devuelve EL MISMO mazo', sacar(original, 'p05') === original && sacar(original, '') === original);
  const devuelto = devolverAlFondo(sinIndulto, 'a05');
  comprobar('devolverAlFondo lo pone el último y el montón vuelve a ser el original', devuelto.length === 16 && devuelto[15] === 'a05' && mismoMonton(devuelto, original));
  comprobar('devolver lo que ya está, o nada, devuelve EL MISMO mazo', devolverAlFondo(original, 'a05') === original && devolverAlFondo(original, '') === original);
  comprobar('sacar y devolver no mutan la entrada', original.length === 16 && sinIndulto.length === 15);
  const roboTrasSacar = robar(sinIndulto);
  comprobar('un mazo de 15 sigue rotando: la robada va al fondo y quedan 15', roboTrasSacar.mazo.length === 15 && roboTrasSacar.mazo[14] === roboTrasSacar.serie);

  const robarSinRotar = (m: Mazo): { serie: string; mazo: Mazo } => ({ serie: m[0] ?? '', mazo: m.slice(1) });
  comprobar('se ve fallar: un robar que no rota pierde la carta y el montón cambia', !mismoMonton(robarSinRotar(original).mazo, original));
  const robarDuplicando = (m: Mazo): { serie: string; mazo: Mazo } => ({ serie: m[0] ?? '', mazo: [...m, m[0] ?? ''] });
  comprobar('se ve fallar: un robar que duplica también se ve', !mismoMonton(robarDuplicando(original).mazo, original));
}

// ═══════════════════════════════════════════════════════════════════════════
// El cierre
// ═══════════════════════════════════════════════════════════════════════════

if (fallos.length > 0) {
  console.error(`\n${fallos.length} fallos:\n`);
  for (const f of fallos) console.error(`  ✗ ${f}`);
  console.error('');
}

/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS». Un bloque que se caiga por el camino
 * —un `forEach` que no entra, una excepción tragada— acaba con menos comprobaciones
 * y el mismo color. Con todo verde este guion hace 112 (110 sin `burgo.ts`: los dos
 * colores del juego sólo se contrastan si el fichero existe); el número va por debajo
 * de ESE MÍNIMO —110, no 112— para que, si algo se rompe dentro de un bloque, salga la
 * ROJA con su nombre y no este guardia, que además dispara DESPUÉS de imprimirlas. Al
 * añadir comprobaciones, subirlo.
 */
const COMPROBACIONES_ESCRITAS = 108;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(
    `Solo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones que tiene escritas este guion: ` +
      'se ha caído por el camino sin decirlo. Si has añadido comprobaciones nuevas, sube el número.',
  );
  process.exit(2);
}

if (fallos.length > 0) process.exit(1);

console.log(
  `\n✔ ${hechas} comprobaciones. La tabla del Burgo tiene sus 40 casillas donde el reglamento dice, con los\n` +
    '  precios pares y las rentas crecientes, las 28 cuentas de deshipoteca escritas a mano, 16 + 16 cartas\n' +
    '  numeradas sin huecos cuya serie va y vuelve, ningún nombre ajeno ni en los comentarios, y ocho aceras\n' +
    '  que se distinguen de los seis asientos y dejan leer el blanco. El anillo suma en módulo positivo,\n' +
    '  cruza la salida sólo hacia delante y pone las 40 casillas del cuadrado 8 × 14 en su banda; la\n' +
    '  hacienda paga todo o nada en enteros y devuelve el mismo objeto cuando no mueve nada; y el mazo rota\n' +
    '  al fondo sin perder ni duplicar una serie. Cada regla se ha visto caer con su veneno.',
);
process.exit(0);
