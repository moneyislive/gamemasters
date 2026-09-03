/**
 * ¿CUADRA LA GEOMETRÍA DE LA ESCENA CON LA MALLA?
 *
 * ═══ QUÉ COMPRA ESTE GUION, Y POR QUÉ NO BASTA CON MIRAR LA PANTALLA ═══
 *
 * La escena 3D coloca cada cosa con una función distinta de la malla: las teselas
 * con `esquinasDeHex`, las chozas con `puntoDeVertice`, los caminos con
 * `puntoDeArista` y `verticesDeArista`. Que las cuatro estén de acuerdo entre sí
 * NO es evidente, y cuando no lo están el síntoma es de los peores que hay: el
 * tablero se ve perfectamente bien y una choza cae medio radio fuera de su
 * esquina. Nadie lo nota hasta que alguien juega y no entiende de quién es qué.
 *
 * Una captura no lo caza: a vista de pájaro, medio radio de desviación en un
 * tablero de diecinueve islas parece perspectiva. Un número sí lo caza.
 *
 * ═══ Y POR QUÉ ESTO CORRE EN NODE Y NO ABRE UN CONTEXTO DE DIBUJO ═══
 *
 * Porque lo que se comprueba es ARITMÉTICA, no pintado. Ninguna de estas
 * funciones toca `three`: son las mismas que ya usa el tablero plano. Así que esto
 * entra en la batería como un comprobador más y no necesita GPU, ni navegador, ni
 * un móvil enchufado — que es exactamente lo que separa lo que se puede
 * comprobar siempre de lo que hay que ir a mirar.
 *
 * Lo que este guion NO prueba, dicho para que nadie se confíe: que la escena se
 * VEA bien. Ni la luz, ni los materiales, ni si el móvil aguanta los triángulos.
 * Eso sigue exigiendo ojos y un aparato de verdad, y está en el banco de pruebas.
 */
import {
  aristaDeHex,
  centroDeHex,
  esquinasDeHex,
  mallaDeRadio,
  puntoDeArista,
  puntoDeVertice,
  verticeDeHex,
  verticesDeArista,
} from '../../shared/mecanicas/malla-hexagonal';
import type { Punto } from '../../shared/mecanicas/malla-hexagonal';
import { PALETA, puntosDeLaCifra } from '../paleta';

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

/**
 * La tolerancia, y por qué no es cero.
 *
 * Estas cuentas pasan por `Math.sqrt(3)` y por divisiones entre tres, así que dos
 * caminos aritméticos que dan el MISMO punto pueden diferir en el último bit del
 * doble. Una milésima de radio es cien veces más pequeña que cualquier error que
 * se vería en pantalla y mil veces más grande que el ruido del coma flotante: caza
 * un desplazamiento de verdad y no salta por redondeo.
 */
const HOLGURA = 1e-9;

const RADIO = 1;
const DELTA = mallaDeRadio(2);

// ---------------------------------------------------------------------------
paso('Cada vértice cae en la esquina de su hexágono, y no cerca');
// ---------------------------------------------------------------------------

/*
 * LA COMPROBACIÓN QUE SOSTIENE TODAS LAS DEMÁS.
 *
 * `esquinasDeHex` dibuja la tesela; `puntoDeVertice` coloca la choza. Son dos
 * funciones distintas que llegan al mismo punto por caminos distintos —una desde
 * el centro del hexágono y un ángulo, la otra promediando los centros de los TRES
 * hexágonos que se tocan ahí—. Si divergen, la choza flota fuera de la esquina.
 */
{
  let mirados = 0;
  let desviacionMaxima = 0;
  for (const hex of DELTA) {
    const esquinas = esquinasDeHex(hex, RADIO);
    for (let k = 0; k < 6; k++) {
      const porLaEsquina = esquinas[k] as Punto;
      const porLaLlave = puntoDeVertice(verticeDeHex(hex, k), RADIO);
      const d = Math.hypot(porLaEsquina.x - porLaLlave.x, porLaEsquina.y - porLaLlave.y);
      if (d > desviacionMaxima) desviacionMaxima = d;
      mirados++;
    }
  }
  comprobar(
    'las 114 esquinas del delta coinciden con el punto de su vértice',
    desviacionMaxima < HOLGURA,
    { mirados, desviacionMaxima },
  );
  comprobar('y se han mirado las seis de cada isla', mirados === DELTA.length * 6, mirados);
}

// ---------------------------------------------------------------------------
paso('Cada camino va de vértice a vértice, y su punto medio es el medio');
// ---------------------------------------------------------------------------

/*
 * La escena gira el camino con los DOS vértices de la arista y lo centra en
 * `puntoDeArista`. Si el punto medio no fuera el medio, el camino saldría corrido
 * hacia una de las dos esquinas — visible sólo cuando dos caminos se encuentran.
 */
{
  let peor = 0;
  let aristas = 0;
  for (const hex of DELTA) {
    for (let k = 0; k < 6; k++) {
      const arista = aristaDeHex(hex, k);
      const [a, b] = verticesDeArista(arista);
      if (a === undefined || b === undefined) {
        fallos.push(`la arista ${arista} no da sus dos vértices`);
        hechas++;
        continue;
      }
      const pa = puntoDeVertice(a, RADIO);
      const pb = puntoDeVertice(b, RADIO);
      const medioCalculado = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      const medioDeLaMalla = puntoDeArista(arista, RADIO);
      const d = Math.hypot(
        medioCalculado.x - medioDeLaMalla.x,
        medioCalculado.y - medioDeLaMalla.y,
      );
      if (d > peor) peor = d;
      aristas++;
    }
  }
  comprobar('el punto de cada arista es el medio de sus dos vértices', peor < HOLGURA, {
    aristas,
    peor,
  });
}

// ---------------------------------------------------------------------------
paso('Un camino nunca sale más largo que el lado de una isla');
// ---------------------------------------------------------------------------

/*
 * El largo del camino sale de la distancia entre sus dos vértices, y en una malla
 * regular ese largo es SIEMPRE el radio. Comprobarlo caza el fallo que de verdad
 * puede pasar: que `verticesDeArista` devuelva dos vértices que no son contiguos
 * —los de la arista opuesta, por ejemplo— y el camino cruce la isla entera.
 */
{
  let minimo = Number.POSITIVE_INFINITY;
  let maximo = 0;
  for (const hex of DELTA) {
    for (let k = 0; k < 6; k++) {
      const [a, b] = verticesDeArista(aristaDeHex(hex, k));
      if (a === undefined || b === undefined) continue;
      const pa = puntoDeVertice(a, RADIO);
      const pb = puntoDeVertice(b, RADIO);
      const largo = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      minimo = Math.min(minimo, largo);
      maximo = Math.max(maximo, largo);
    }
  }
  comprobar(
    'todos los caminos miden exactamente un radio',
    Math.abs(minimo - RADIO) < HOLGURA && Math.abs(maximo - RADIO) < HOLGURA,
    { minimo, maximo, radio: RADIO },
  );
}

// ---------------------------------------------------------------------------
paso('Dos islas vecinas comparten arista, y sus teselas no se solapan');
// ---------------------------------------------------------------------------

/*
 * La escena separa las teselas con una JUNTA para que no parpadeen sus paredes.
 * Aquí se comprueba lo de debajo: que la distancia entre dos centros vecinos es la
 * que la malla promete, o sea que restar la junta deja hueco y no agujero.
 */
{
  const centro = centroDeHex({ q: 0, r: 0 }, RADIO);
  const distancias: number[] = [];
  for (const vecino of [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ]) {
    const c = centroDeHex(vecino, RADIO);
    distancias.push(Math.hypot(c.x - centro.x, c.y - centro.y));
  }
  const esperada = Math.sqrt(3) * RADIO;
  const peor = Math.max(...distancias.map((d) => Math.abs(d - esperada)));
  comprobar('las seis vecinas están a √3 radios del centro', peor < HOLGURA, {
    esperada,
    peor,
  });
}

// ---------------------------------------------------------------------------
paso('Los puntos del número dicen la probabilidad de verdad');
// ---------------------------------------------------------------------------

/*
 * `puntosDeLaCifra` se calcula en vez de escribirse en una tabla. Aquí se compara
 * contra la cuenta hecha por fuerza bruta sobre los treinta y seis resultados de
 * dos dados: si alguien «optimiza» la fórmula, esto se cae.
 */
{
  const aMano = new Map<number, number>();
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      aMano.set(a + b, (aMano.get(a + b) ?? 0) + 1);
    }
  }
  /*
   * SE LLAMA A LA FUNCIÓN DE VERDAD, y esta línea es una corrección.
   *
   * La primera versión de esto recalculaba `6 - Math.abs(7 - cifra)` aquí dentro y
   * comparaba esa cuenta con la de fuerza bruta. Las dos daban lo mismo SIEMPRE,
   * claro: eran la misma fórmula escrita dos veces. Se probó rompiendo el 7 por un
   * 8 en `paleta.ts` y esta comprobación siguió verde — o sea que no comprobaba el
   * código, comprobaba una copia suya.
   */
  const mal: unknown[] = [];
  for (let cifra = 2; cifra <= 12; cifra++) {
    const dice = puntosDeLaCifra(cifra);
    const deVerdad = aMano.get(cifra) ?? 0;
    if (dice !== deVerdad) mal.push({ cifra, dice, deVerdad });
  }
  comprobar('los once números dan las formas que salen de dos dados', mal.length === 0, mal);
  comprobar('el 7 es el más probable, con seis formas', aMano.get(7) === 6, aMano.get(7));
}

// ---------------------------------------------------------------------------
paso('La paleta no deja ningún terreno sin color');
// ---------------------------------------------------------------------------

/*
 * Los terrenos de Riberas y los del vocabulario de colonización tienen que estar
 * TODOS. Un terreno que falte no revienta la escena —hay color de reserva— pero
 * sale gris entre teselas de colores, y eso no es un fallo que alguien vaya a
 * reportar: es una isla que parece de otro juego.
 */
{
  const deRiberas = ['marisma', 'carrizal', 'salina', 'cantil', 'vega', 'duna'];
  const deColonizacion = ['bosque', 'pradera', 'campo', 'colina', 'montana', 'desierto'];
  const sinColor = [...deRiberas, ...deColonizacion].filter((t) => PALETA[t] === undefined);
  comprobar('los doce terrenos conocidos tienen color', sinColor.length === 0, sinColor);

  const malFormado = Object.entries(PALETA).filter(([, c]) => !/^#[0-9a-f]{6}$/i.test(c));
  comprobar('y todos los colores son notación que three entiende', malFormado.length === 0, malFormado);
}

// ---------------------------------------------------------------------------

console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log('');
}

if (hechas < 8) {
  console.error(
    `Solo se han hecho ${hechas} comprobaciones. Este guion tiene ocho escritas: si salen\n` +
      'menos, se ha caído por el camino sin decirlo.',
  );
  process.exit(2);
}

if (fallos.length === 0) {
  console.log(`${hechas} comprobaciones`);
  console.log(
    '\nLa escena y la malla dicen lo mismo: cada choza cae en la esquina exacta de su isla,\n' +
      'cada camino va de vértice a vértice y mide un radio, y los puntos de cada número son\n' +
      'las formas de sacarlo con dos dados. Lo que esto NO prueba es que se vea bien: para\n' +
      'eso está el banco de pruebas, y hace falta mirar.',
  );
  process.exit(0);
}

process.exit(1);
