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
import {
  colorDelBien,
  colorDeTerreno,
  COLUMNA_DEL_COLOR,
  COLUMNAS_DEL_ATLAS,
  FILAS_DEL_ATLAS,
  PALETA,
  puntosDeLaCifra,
  TERRENO_DEL_BIEN,
} from '../paleta';
import {
  NOMBRE_QUE_SOBREVIVE,
  nombresEnElGlb,
  PIEZAS_DE_COLOR,
  todosLosNombres,
  COLORES_DE_JUGADOR,
} from '../nombres';
import { cuantasFormasDeCauce, cuantasFormasDeCruce, ladoHaciaElVecino } from '../sendas';
import { hexesDeVertice, vecino, verticesDeHex } from '../../shared/mecanicas/malla-hexagonal';
import { CAUCE, CUERPO, piezaDeOrilla } from '../aguas';
import { piezasDeAsentamiento } from '../asentamiento';
import {
  acercando,
  acotadoAlTablero,
  ALTURA_MINIMA_DEL_OJO,
  APARTE_MAXIMO,
  arrastrandoLaMirada,
  CERCANIA_DE_SALIDA,
  comoAlPrincipio,
  estaComoAlPrincipio,
  factorValido,
  MAS_CERCA,
  MAS_LEJOS,
  ojoYMira,
  pellizcando,
} from '../acercar';
import { sitiosDelTablero, sitiosPermitidos } from '../sitios';
import {
  alejarseParaQueQuepa,
  ALTURA_DE_SALIDA,
  esDeLaInterfaz,
  loCogeLaInterfaz,
  ALTURA_MAXIMA,
  ALTURA_MINIMA,
  MINIMO_PARA_GIRAR,
  MIRADOR_DE_SALIDA,
  ojoDelMirador,
  tirandoDelMirador,
} from '../camara';
import {
  ANCHO_DEL_ASA_DE_LOS_DADOS,
  ASA_DEL_HUECO,
  DIBUJO_DEL_MAZO,
  DISTANCIA_DE_LA_BARRA,
  GIRO_DE_LA_VITRINA,
  SUELO_DEL_TOQUE,
  ZOCALO,
  cotaDeLaTapa,
  dentroDelHueco,
  fondoDelAsaGirada,
  huecosDeLaBarra,
  huecosDeLaMesa,
  loQueSeVe,
} from '../barra';
import {
  ALFA_DE_LA_SOMBRA,
  FONDO_DEL_TAPETE,
  RADIO_DE_LA_SOMBRA,
  SEGMENTOS_DE_LA_SOMBRA,
  SOBRE_LA_TAPA,
  geometriaDeLaTapa,
  geometriaDeLasSombras,
  geometriaDelTapete,
  maderaEnLineal,
  triangulosDe,
} from '../tablon';
import {
  ARISTA_DEL_D6_EN_EL_PACK,
  ANCHO_DEL_PAR_DE_DADOS,
  ARISTA_DEL_DADO,
  ASENTAR,
  CENTRO_DEL_DADO_SOBRE_LA_TAPA,
  DADO_MINIMO,
  HUECO_ENTRE_DADOS,
  PUNTO_DEL_DADO,
  PUNTO_MINIMO,
  RADIO_DE_LA_SOMBRA_DEL_DADO,
  RODAR_MINIMO,
  SACUDIDA,
  SALTO_DEL_DADO,
  TOPE_SIN_RESPUESTA,
  anguloRodado,
  avanceDelAsentado,
  centroDelDado,
  dadosEnReposo,
  faseDeLosDados,
  giroDelDadoAsentado,
  paresDeLaSuma,
  parQueSeEnsena,
  reboteDelDado,
  repartoDeLaTirada,
  sacudida,
  saltoDelDado,
  sucesoDelResultado,
} from '../dados';
import type { HuecoDeLaBarra } from '../barra';
import type { EstadoDeLosDados, ResultadoDelToque, SucesoDeLosDados } from '../dados';
import {
  SEGMENTOS_DEL_PUNTO,
  VALORES_DEL_DADO,
  cuaternionDelValor,
  geometriaDeLosPuntosDelDado,
  geometriaDelCuerpoDelDado,
  valorQueMiraArriba,
} from '../cubo-del-dado';
import { CARA_DEL_VALOR, NORMAL_DEL_VALOR } from '../caras-del-dado';
import {
  AMORTIGUACION_DE_LA_MESA,
  ANCHO_DE_MAS_DE_LA_TAPA,
  HOLGURA_DELANTERA_DE_LA_TAPA,
  LO_QUE_QUEDA_AL_LLEGAR,
  MADERA_CLARA_EN_EL_ATLAS,
  MADERA_OSCURA_EN_EL_ATLAS,
  POSAVASOS_SOBRE_LA_MADERA_OSCURA,
  TABLONES,
  MANDO_DE_RECOGER,
  TRAS_EL_ZOCALO,
  aLineal,
  bajadaDeLaMesa,
  colorDelColono,
  coloresDeLaMadera,
  coloresDelPosavasos,
  contraste,
  hexDe,
  luminancia,
  mezcla,
  tapaDeLaMesa,
  vetaDelTablon,
} from '../mesa';
import { semillaDelCodigo } from '../../shared/mecanicas/semilla';
import {
  areasDeTrueque,
  enLaZonaDeLaMano,
  huecosDeLaBaraja,
  loQueSeVeEnLaBaraja,
  manoPorGrupos,
} from '../baraja';
import {
  casillasDeLaMano,
  colorDeLaFamilia,
  COLOR_SIN_FAMILIA,
  enLaZonaDeLasCartas,
  FAMILIA_DE_LOS_TITULOS,
  franjaDeLasCartas,
  huecosDeLasCartas,
  loQueSeVeEnLasCartas,
  manoDelMazoPorFamilias,
  ORDEN_DE_LAS_FAMILIAS,
  pasoDentroDelGrupo,
  puertasDeLaCarta,
} from '../cartas';
import type { CartaDelMazo, ExplicacionDelNaipe } from '../cartas';
import { cuantosTriangulos, geometriaDeContornos } from '../formas';
import {
  CAJA_DEL_PUENTE,
  LARGO_DEL_TRAMO,
  puenteEntre,
  SUPERFICIE_DEL_CAMINO,
} from '../puente';
import {
  BIENES_CON_ICONO,
  CARTAS_CON_ICONO,
  CIFRAS_CON_ICONO,
  CONTORNOS_DE_LA_CARTA,
  CONTORNOS_DE_LA_CIFRA,
  CONTORNOS_DEL_BIEN,
} from '../iconos';
import { selloDeLaTirada } from '../../shared/arcade/juegos/riberas-en-tres';
import { MODELO, modeloDePieza } from '../modelos';
import { ALTURA_DE_UNA_PERSONA, ESCALON, RADIO_DE_COMARCA, RADIO_DE_TESELA } from '../escala';
import { ORDEN_DE_LA_BARRA, ORDEN_DE_LAS_CARTAS } from '../capas';
import { fallosDelOrden, ordenDeDibujoDeLaMesa } from './arbol-de-la-mesa';
import { MAR_ADENTRO_DE_LOS_BARCOS, laMarinaDelMundo } from '../marina';
import { crearRelieve, hexDePunto } from '../relieve';
import { contornoDelDelta, distanciaALaCosta, geometriaDelMar } from '../costa';
import type { Segmento } from '../costa';
import {
  ALCANCE_DEL_DELTA,
  ESPUMA_TIERRA_ADENTRO,
  FILAS_DE_LA_MESA,
  RADIO_EXTERIOR_DE_LA_COSTA,
  RADIO_INTERIOR_DE_LA_COSTA,
  SECTORES_DEL_MAR,
  SEGMENTOS_DE_LA_MESA,
  TOPE_DE_LA_MESA,
  TOPE_DEL_MAR,
  TRIANGULOS_DE_LOS_DADOS,
  TRIANGULOS_DE_LOS_DADOS_DEL_PACK,
  TRIANGULOS_DEL_MAR,
  TRIANGULOS_DEL_RESPALDO_DE_LOS_DADOS,
  radiosDelMar,
  segmentosDeLaMesa,
  triangulosDeLaMesa,
  triangulosDelMar,
} from '../presupuesto-del-delta';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import * as THREE from 'three';
import { NodeIO } from '@gltf-transform/core';
import type { Node, Primitive } from '@gltf-transform/core';
/*
 * LAS MISMAS FUNCIONES CON LAS QUE SE HORNEAN LOS MODELOS, y no una copia de ellas.
 *
 * `muestrea` linealiza los téxeles ANTES de interpolar, que es lo que hace la GPU con
 * una textura declarada sRGB; escrita otra vez aquí «como se hace normalmente» daría un
 * color parecido y este comprobador estaría midiendo su propio error.
 */
import { muestrea, pngDeLaTextura } from './hornear';
import {
  ALTURA_DE_LA_OLA,
  COLOR_DEL_AGUA_DEL_PACK,
  CORONA_DE_LAS_OLAS,
  GLSL_DE_LA_MAREA,
  espumaPosibleEn,
  loQueSubeEn,
  SOMBRA_DEL_TABLERO,
  TRENES_DE_LAS_OLAS,
  ZONAS_DE_LAS_OLAS,
  olaEn,
  zonaEn,
  LAMIDO_DE_LA_ORILLA,
  PLUMA_DE_LA_ORILLA,
  materialDeLaMarea,
} from '../marea';

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

/**
 * LAS TRES FRASES DE UN NAIPE DE MENTIRA, para los bloques que miden GEOMETRÍA.
 *
 * `CartaDelMazo` lleva `explicacion` desde que las cartas se explican, y este guion reparte
 * manos de hasta veintisiete naipes para ver dónde caen: lo que mide es el sitio, y el
 * texto no entra en ninguna cuenta —la escena no escribe una letra, ver la cabecera de ese
 * campo—. Una constante compartida y no tres cadenas por naipe para que quede claro que es
 * relleno y que nadie está afirmando nada sobre lo que dice. Quien vigila las frases de
 * verdad es `verify:riberas-en-tres`, sobre una mesa con el árbitro.
 */
const SIN_EXPLICAR: ExplicacionDelNaipe = { hace: '', consigues: '', usas: '' };

const RADIO = 1;
const DELTA = mallaDeRadio(2);

/**
 * LOS LIENZOS EN LOS QUE SE MIDE TODO LO QUE DEPENDE DE LA PANTALLA, en puntos: ancho y
 * alto de verdad, no sólo la proporción, porque el suelo de toque (44) y los segmentos de
 * la tapa se deciden en puntos. UNA lista para todos los bloques del guion: hubo dos
 * copias iguales, y dos copias son la manera de que un lienzo nuevo entre en una y no en
 * la otra.
 *
 * Los tamaños son los de la app (`ALTO_MINIMO_DEL_LIENZO` = 360 y `PARTE_DEL_ALTO` = 0,58
 * en `app/src/arcade/riberas-en-tres-escena.tsx`) aplicados a los teléfonos más pequeños
 * que se admiten, más el caso de pantalla completa, una tableta con el navegador de pie,
 * y los OCHO APAISADOS reales: el iPhone SE de primera generación (568×320) fue el que
 * descubrió que con `PARTE_DEL_ALTO` a 0,13 el asa medía 41,6 puntos; con 0,14 mide 44,8.
 * Los apaisados son la pantalla completa de la mesa en la app
 * (`docs/LA-MESA-DE-RIBERAS.md` §3) y sin ellos el suelo estaba vigilado sólo de pie.
 */
const LIENZOS: Array<[string, number, number]> = [
  ['móvil estrecho, lienzo al mínimo', 320, 360],
  ['móvil pequeño', 360, 490],
  ['móvil corriente', 390, 490],
  ['móvil de pie, lienzo entero', 390, 845],
  ['tableta', 768, 640],
  ['tableta con el navegador de pie', 768, 1024],
  ['monitor', 1920, 900],
  ['apaisado SE 1ª', 568, 320],
  ['apaisado SE 2ª/3ª', 667, 375],
  ['apaisado Android de 360', 780, 360],
  ['apaisado iPhone 14', 844, 390],
  ['apaisado Pro Max', 932, 430],
  ['apaisado tableta 4:3', 1024, 768],
  ['apaisado iPad Air', 1180, 820],
  ['apaisado monitor 1080', 1920, 1080],
];

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

  const malFormado = Object.entries(PALETA).filter(([, t]) => !/^#[0-9a-f]{6}$/i.test(t.color));
  comprobar('y todos los colores son notación que three entiende', malFormado.length === 0, malFormado);

  /*
   * Y la celda del atlas tiene que existir DENTRO del atlas. Una celda fuera de
   * rango no revienta: desplaza las UV a un trozo de textura que no es de nadie y
   * la comarca sale del color equivocado, que es de los fallos que se miran diez
   * veces sin verlos porque el mundo sigue pintándose entero.
   */
  const celdaMala = Object.entries(PALETA).filter(
    ([, t]) =>
      !Number.isInteger(t.celda[0]) ||
      !Number.isInteger(t.celda[1]) ||
      t.celda[0] < 0 ||
      t.celda[0] >= COLUMNAS_DEL_ATLAS ||
      t.celda[1] < 0 ||
      t.celda[1] >= FILAS_DEL_ATLAS,
  );
  comprobar('y todas las celdas del atlas caen dentro del atlas', celdaMala.length === 0, celdaMala);

  /*
   * EL TINTE DEL SUELO: que exista, que sea sensato y sobre todo QUE ALGUIEN LO LEA.
   *
   * Es un campo opcional, y los campos opcionales se quedan huérfanos: alguien limpia
   * una línea de `delta.tsx` y el dato sigue aquí, con su cabecera y todo, sin que nada
   * cambie en pantalla ni se ponga rojo. Por eso lo que se comprueba no es sólo el
   * número sino que el tablero de tres dimensiones lo lea y lo aplique.
   *
   * Y que llegue al terreno de Riberas por composición y no por copia: el cantil lo tiene
   * porque ES la montaña, no porque alguien lo escribiera dos veces.
   */
  const conTinte = Object.entries(PALETA).filter(([, terreno]) => terreno.tinte !== undefined);
  comprobar(
    'algún terreno oscurece su suelo, porque su bioma pone piedras del mismo gris encima',
    conTinte.length > 0,
    conTinte.map(([nombre, terreno]) => `${nombre}: ${String(terreno.tinte)}`),
  );
  comprobar(
    'y el tinte quita luz sin apagar el bioma: no baja de un tercio',
    conTinte.every(([, terreno]) => (terreno.tinte as number) >= 0.35 && (terreno.tinte as number) < 1),
    conTinte.map(([nombre, terreno]) => `${nombre}: ${String(terreno.tinte)}`),
  );
  comprobar(
    'el cantil hereda el de la montaña por composición, no por una copia que pueda discrepar',
    PALETA['cantil'] === PALETA['montana'] && PALETA['cantil']?.tinte === PALETA['montana']?.tinte,
    { cantil: PALETA['cantil']?.tinte, montana: PALETA['montana']?.tinte },
  );

  const fuenteDelTablero = fs.readFileSync(
    path.join(import.meta.dirname ?? __dirname, '..', 'delta.tsx'),
    'utf8',
  );
  comprobar(
    'y el tablero de tres dimensiones lo lee y clona el material: si no, el dato sería adorno',
    fuenteDelTablero.includes('terrenoDe(terreno).tinte') &&
      fuenteDelTablero.includes('conMenosLuz(base.material, tinte)') &&
      fuenteDelTablero.includes('material.dispose()'),
    {
      loLee: fuenteDelTablero.includes('terrenoDe(terreno).tinte'),
      loAplica: fuenteDelTablero.includes('conMenosLuz(base.material, tinte)'),
      loSuelta: fuenteDelTablero.includes('material.dispose()'),
    },
  );
}

// ---------------------------------------------------------------------------

/*
 * ¿ESTÁ DENTRO DEL `.glb` TODO LO QUE EL CÓDIGO PIDE, Y CON ESE NOMBRE EXACTO?
 *
 * ═══ POR QUÉ ESTA COMPROBACIÓN EXISTE ═══
 *
 * Porque su ausencia costó una tarde. Los nombres de modelo llevaban dos puntos
 * —`arbol:a`, `poblado:blue`—, el `.glb` se compilaba con los 114 nodos correctos,
 * y en pantalla no aparecía NI UNA de esas piezas: ni un árbol, ni una montaña, ni
 * una sola construcción de jugador. Sin error, sin hueco, sin nada. `GLTFLoader`
 * borra los caracteres reservados de los nombres de nodo al cargar, así que
 * `catalogo.get('arbol:a')` devolvía `undefined` para siempre.
 *
 * Lo que lo hacía tan difícil de ver es que NO fallaba en Node: el `.glb` leído con
 * cualquier otra herramienta tiene los nombres bien. Sólo fallaba al pintar. Así
 * que aquí se comprueban las dos mitades: que la pieza esté, y que su nombre sea de
 * los que llegan enteros al navegador.
 *
 * ═══ Y POR QUÉ SE LEE EL `.glb` A MANO ═══
 *
 * Un GLB son doce bytes de cabecera y luego trozos con longitud y tipo; el primero
 * es el JSON. Sacar los nombres de los nodos de la escena es leer un entero y
 * parsear. Meter aquí una librería de glTF para eso pondría en la batería una
 * dependencia que sólo hace falta al compilar.
 */
{
  const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..');
  const fichero = path.join(RAIZ, 'modelos', 'tablero.glb');
  paso('Cada pieza que el código pide está dentro del .glb, y con su nombre entero');

  if (!fs.existsSync(fichero)) {
    comprobar('el tablero.glb compilado existe', false, path.relative(RAIZ, fichero));
  } else {
    const bruto = fs.readFileSync(fichero);
    const largoDelJson = bruto.readUInt32LE(12);
    const json = JSON.parse(bruto.subarray(20, 20 + largoDelJson).toString('utf8')) as {
      scenes?: Array<{ nodes?: number[] }>;
      nodes?: Array<{ name?: string }>;
    };
    const nodos = json.nodes ?? [];
    const raices = json.scenes?.[0]?.nodes ?? [];
    const dentro = new Set(
      raices.map((i) => nodos[i]?.name).filter((n): n is string => n !== undefined),
    );

    /*
     * SE CONTRASTA CONTRA `nombresEnElGlb()` Y NO CONTRA `todosLosNombres()`.
     *
     * Son dos listas distintas desde que las piezas de jugador entran una sola vez: el
     * fichero trae `ciudad`, y `ciudad-red` se fabrica al cargar moviendo las UV. Pedirle
     * al `.glb` los nombres que el CÓDIGO usa le exigiría veintiuna piezas que nunca van
     * a estar dentro, y este comprobador diría que falta lo que sobra a propósito.
     */
    const faltan = nombresEnElGlb().filter((n) => !dentro.has(n));
    comprobar('no falta ninguna pieza de las que el código nombra', faltan.length === 0, faltan);

    /*
     * Y AL REVÉS, que es la mitad que faltaba: una pieza dentro del fichero que nadie
     * pide son kilobytes que se despliegan a todo el mundo sin que nadie sepa por qué.
     * El compilador ya lo comprueba antes de escribir; esto lo vuelve a comprobar sobre
     * el fichero de verdad, por si el que hay no salió de este compilador.
     */
    const sobran = [...dentro].filter((n) => !nombresEnElGlb().includes(n));
    comprobar('ni sobra ninguna que no pida nadie', sobran.length === 0, sobran);

    /*
     * LAS PIEZAS DE COLOR SON EXACTAMENTE LAS SIETE, y con su nombre pelado. Si alguien
     * vuelve a meter `ciudad-blue` en el fichero, las dos listas se solapan y el ahorro
     * se deshace sin que nada proteste.
     */
    const conColor = [...dentro].filter((n) => /-(blue|red|green|yellow)$/.test(n));
    comprobar(
      'y ninguna pieza de color entra ya con su color en el nombre',
      conColor.length === 0,
      conColor,
    );
    /*
     * ESTE COMPROBADOR NO PODÍA FALLAR, Y ESTUVO ASÍ DESDE QUE SE ESCRIBIÓ.
     *
     * Decía: «las que se fabrican moviendo UV son las siete piezas por cuatro colores», y
     * comparaba `derivadas.length` con `PIEZAS_DE_COLOR.length * 4`. Pero `derivadas` sale
     * de restarle a `todosLosNombres()` los que están en el `.glb`, y `todosLosNombres()`
     * se CONSTRUYE como esa misma multiplicación (`nombres.ts:296-302`). Los dos lados eran
     * el mismo número escrito de dos maneras: sólo podía saltar si los colores dejaran de
     * ser cuatro. Vigilaba una constante creyendo que vigilaba una derivación.
     *
     * Lo que sí puede romperse son estas dos cosas, y ninguna la miraba nadie:
     */
    const sinBase = PIEZAS_DE_COLOR.filter((pieza) => !dentro.has(pieza));
    comprobar(
      'toda pieza que se pinta por color tiene su malla base dentro del .glb',
      sinBase.length === 0,
      sinBase,
    );
    /*
     * Y que los colores del código sean EXACTAMENTE las columnas que el atlas tiene.
     *
     * Un color de más no revienta: `desplazamientoDeColor` cae al azul por defecto
     * (`paleta.ts:185`) y las piezas de ese jugador salen azules, iguales que las de otro,
     * sin un error en ninguna consola. Y hay motivo para que pase: el motor de Riberas
     * admite SEIS colonos y aquí sólo hay cuatro columnas.
     */
    const sinColumna = COLORES_DE_JUGADOR.filter((c) => COLUMNA_DEL_COLOR[c] === undefined);
    const sinColor = Object.keys(COLUMNA_DEL_COLOR).filter(
      (c) => !(COLORES_DE_JUGADOR as readonly string[]).includes(c),
    );
    comprobar(
      'cada color de jugador tiene su columna en el atlas, y no sobra ninguna',
      sinColumna.length === 0 && sinColor.length === 0,
      { sinColumna, sinColor },
    );

    const mancillados = [...dentro].filter((n) => !NOMBRE_QUE_SOBREVIVE.test(n));
    comprobar(
      'y ningún nombre lleva algo que GLTFLoader vaya a borrar al cargar',
      mancillados.length === 0,
      mancillados,
    );
  }
}

// ---------------------------------------------------------------------------

/*
 * ¿SABE LA RED DE CAMINOS RESOLVER CUALQUIER CRUCE?
 *
 * El generador traza caminos que serpentean, así que puede pedir cualquier
 * combinación de lados por los que un camino atraviesa un hexágono. Si faltara una,
 * esa tesela se quedaría sin pieza y el camino saldría PARTIDO — un trozo de sendero
 * que se corta en seco y sigue tres teselas más allá. Se ve, pero cuesta relacionarlo
 * con su causa.
 *
 * El pack trae trece trazados y entre los trece, girados, cubren las 63 formas
 * posibles: 1 de una boca, 3 de dos, 4 de tres, 3 de cuatro, 1 de cinco y 1 de seis.
 * Aquí se comprueba que la tabla las tenga TODAS, y de paso que los seis vecinos de
 * la malla caigan en seis lados distintos del pack — que es lo que hace que dos
 * teselas contiguas casen sus bocas.
 */
{
  paso('La red de caminos sabe resolver cualquier cruce');

  comprobar(
    'la tabla cubre las 63 formas de atravesar un hexágono',
    cuantasFormasDeCruce() === 63,
    cuantasFormasDeCruce(),
  );

  /*
   * Y los cauces cubren seis menos: las seis formas de UNA sola boca. No es un
   * agujero del pack, es una regla — un río que se acaba dentro del mapa no existe.
   * Si esta cuenta cambiara, sería que alguien ha metido una pieza de río de una boca
   * y entonces el generador podría trazar ríos que no desembocan.
   */
  comprobar(
    'y los cauces cubren las 57 que le quedan a un río, sin la de una sola boca',
    cuantasFormasDeCauce() === 57,
    cuantasFormasDeCauce(),
  );

  const lados = [0, 1, 2, 3, 4, 5].map((j) => ladoHaciaElVecino(j));
  comprobar(
    'y los seis vecinos de la malla caen en seis lados distintos del pack',
    new Set(lados).size === 6,
    lados,
  );
}

/**
 * LO QUE HAY EN EL AGUA, SOBRE VEINTE TABLEROS.
 *
 * ═══ POR QUÉ SE COMPRUEBA CONTANDO Y NO MIRANDO ═══
 *
 * Los tres fallos que ha tenido esta parte eran INVISIBLES en pantalla. Un muelle que
 * sale de un acantilado se ve; un nenúfar que sale demasiado a menudo, no — hay que
 * contar cuatrocientas matas para que aparezca. El último costó justo eso: el sorteo
 * de «¿nenúfar?» compartía canal con la puerta de «¿hay mata aquí?», así que para la
 * primera mata de cada celda los dos argumentos coincidían y el segundo sorteo salía
 * siempre por debajo del umbral. Resultado: 63 % de nenúfares con un tope posible del
 * 45 %, y ni una sola captura en la que se notara.
 *
 * Por eso el tope es una comprobación y no un comentario. Ver `marina.ts`.
 */
/**
 * QUE EL MUNDO CUBRA SUS PROPIOS VÉRTICES.
 *
 * Los cincuenta y cuatro vértices del tablero son donde se funda. Dieciséis de ellos
 * no tenían ni una subtesela debajo —siempre los mismos, en todas las semillas— porque
 * el contorno del mundo es el borde exacto de las diecinueve comarcas y un vértice del
 * perímetro cae JUSTO ENCIMA de ese borde: la subtesela que lo contiene le tocaba a una
 * comarca que no existe.
 *
 * No se veía por ningún lado. `alturaEn` devolvía cero tan tranquilo, y el veto de agua
 * sobre los sitios de construcción los descartaba con un `.filter` silencioso, así que
 * el río podía pasar justo por donde se construye.
 *
 * Se comprueban las tres cosas, y la tercera es la que de verdad importa para jugar: no
 * basta con que haya una tesela bajo el poblado, hace falta el ANILLO de seis alrededor,
 * que es lo que ocupa la muralla de una fortaleza.
 */
paso('El mundo cubre los cincuenta y cuatro vértices donde se construye');
{
  const TERRENOS = [
    'bosque', 'bosque', 'bosque', 'bosque', 'pradera', 'pradera', 'pradera', 'pradera',
    'campo', 'campo', 'campo', 'campo', 'colina', 'colina', 'colina',
    'montana', 'montana', 'montana', 'desierto',
  ];
  const hexes = mallaDeRadio(2);
  const islas = hexes.map((hex, i) => ({ hex, terreno: TERRENOS[i % TERRENOS.length] ?? 'pradera' }));
  const vertices = new Set<string>();
  for (const h of hexes) for (const v of verticesDeHex(h)) vertices.add(v);

  let sinSuelo = 0;
  let sinAnillo = 0;
  let declarados = 0;
  const SEMILLAS = 12;
  for (let semilla = 0; semilla < SEMILLAS; semilla++) {
    const relieve = crearRelieve(islas, semilla);
    declarados += relieve.verticesSinSuelo;
    const dentro = new Set(relieve.todas().map((t) => `${String(t.sub.q)},${String(t.sub.r)}`));
    for (const v of vertices) {
      const c = hexDePunto(puntoDeVertice(v, RADIO_DE_COMARCA), RADIO_DE_TESELA);
      if (!dentro.has(`${String(c.q)},${String(c.r)}`)) sinSuelo++;
      for (let k = 0; k < 6; k++) {
        const w = vecino(c, k);
        if (!dentro.has(`${String(w.q)},${String(w.r)}`)) {
          sinAnillo++;
          break;
        }
      }
    }
  }
  /*
   * Y NINGUNA FORMA DE COSTA SE QUEDA SIN DIBUJAR.
   *
   * Las cuatro teselas de costa del pack cubren tramos CONTIGUOS de uno a cuatro
   * lados, así que las 63 formas posibles no caben en ellas: un istmo con agua en dos
   * lados opuestos son dos tramos, y una isla de una tesela son cinco o seis lados
   * seguidos. Antes esos casos devolvían `null` y la tesela se dibujaba como hierba
   * corriente — un agujero en la línea de agua.
   *
   * Ahora se dibuja el tramo más largo. Se comprueban las 63 por fuerza bruta, que son
   * 63: no hay excusa para muestrear.
   */
  const sinPieza: number[] = [];
  for (let bits = 1; bits < 64; bits++) if (piezaDeOrilla(bits) === null) sinPieza.push(bits);
  comprobar(
    'las 63 formas de costa posibles tienen todas una pieza que las dibuje',
    sinPieza.length === 0,
    sinPieza,
  );

  comprobar('ningún vértice del tablero se queda sin tesela debajo', sinSuelo === 0, {
    sinSuelo,
    de: vertices.size * SEMILLAS,
  });

  /*
   * Y NO HAY AGUA ENCIMA DE ESE SUELO, que es la otra mitad de lo mismo.
   *
   * De poco sirve garantizar que hay tesela bajo el vértice si el río puede pasar por
   * encima: en los dos casos no se puede fundar. Se mira la tesela del vértice Y SU
   * ANILLO DE SEIS, que es exactamente lo que ocupa una fortaleza, y se exige que
   * ninguna de las siete sea agua.
   *
   * Es la regla DURA, y se distingue a propósito del margen: `aguas.ts` veta además el
   * cauce a dos pasos y el cuerpo a tres, que son holguras estéticas —que el arroyo no
   * pase rozando el pueblo—. Ésas pueden negociarse; ésta no. Se supo cuando aplicar el
   * margen del cauce a la desembocadura secó el mundo: los tableros con agua cayeron de
   * 40 sobre 60 a 15, porque el margen veda el 67% de la costa y la boca está obligada
   * a tocarla. Con la regla dura —radio 1— se veda el 46% y salen 43 de 60.
   */
  let aguaEnObra = 0;
  for (let semilla = 0; semilla < SEMILLAS; semilla++) {
    const teselas = crearRelieve(islas, semilla).todas();
    const agua = new Set<string>();
    for (const t of teselas) {
      if (t.agua === CAUCE || t.agua === CUERPO) agua.add(`${String(t.sub.q)},${String(t.sub.r)}`);
    }
    for (const v of vertices) {
      const c = hexDePunto(puntoDeVertice(v, RADIO_DE_COMARCA), RADIO_DE_TESELA);
      if (agua.has(`${String(c.q)},${String(c.r)}`)) aguaEnObra++;
      for (let k = 0; k < 6; k++) {
        const w = vecino(c, k);
        if (agua.has(`${String(w.q)},${String(w.r)}`)) aguaEnObra++;
      }
    }
  }
  comprobar(
    'ni hay agua encima de las siete teselas que ocupa una fortaleza',
    aguaEnObra === 0,
    { aguaEnObra },
  );
  comprobar('y todos tienen el anillo de seis que ocupa una muralla', sinAnillo === 0, {
    sinAnillo,
  });
  comprobar(
    'y el relieve lo declara él mismo, para que no haya que venir a contarlo',
    declarados === 0,
    { declarados },
  );
}

// ---------------------------------------------------------------------------

/**
 * LA COSTA DEL DELTA: el contorno, la distancia con signo y el disco de anillos.
 *
 * ═══ POR QUÉ ESTO SE COMPRUEBA AQUÍ Y NO MIRANDO EL MAR ═══
 *
 * `docs/EL-MAR-DE-RIBERAS.md` §1.2 puso la cuenta en la CPU justamente para poder
 * ejercitarla en Node. Si la distancia a la costa viviera en el sombreador, el único
 * modo de saber si está bien sería abrir un navegador y juzgar a ojo si la espuma cae
 * donde la orilla — y a vista de pájaro, media comarca de error parece perspectiva.
 * Aquí es un número: se sabe, no se opina.
 *
 * ═══ LO QUE CADA COMPROBACIÓN COMPRA ═══
 *
 * Las tres primeras son sobre el CONTORNO: que exista, que se cierre y que esté hecho
 * de lados de subtesela. Un contorno con puntas sueltas no se ve raro en pantalla —la
 * espuma sigue saliendo—, se ve como una costa con un mordisco.
 *
 * Las cuatro siguientes son sobre el CAMPO de distancia, y son las que atrapan el
 * fallo clásico: el signo del revés. Con el signo cambiado la espuma sale tierra
 * adentro y el mar abierto queda liso, y es un error de un carácter.
 *
 * Y la que de verdad importa para jugar es la de los cincuenta y cuatro vértices: si
 * un día el generador dejara un río lamiendo un poblado, la espuma se metería en la
 * plaza, y esta línea lo diría antes de que nadie lo viera.
 */
paso('La costa del delta: el contorno, la distancia con signo y el disco de anillos');
{
  const TERRENOS_DE_LA_COSTA = [
    'bosque', 'bosque', 'bosque', 'bosque', 'pradera', 'pradera', 'pradera', 'pradera',
    'campo', 'campo', 'campo', 'campo', 'colina', 'colina', 'colina',
    'montana', 'montana', 'montana', 'desierto',
  ];
  const hexes = mallaDeRadio(2);
  const islas = hexes.map((hex, i) => ({
    hex,
    terreno: TERRENOS_DE_LA_COSTA[i % TERRENOS_DE_LA_COSTA.length] ?? 'pradera',
  }));
  const verticesDelJuego = [...new Set(hexes.flatMap((h) => verticesDeHex(h)))];
  const SEMILLAS_DE_LA_COSTA = 8;
  const radios = radiosDelMar();

  /**
   * LA FUERZA BRUTA, escrita aquí a propósito y sin llamar a `costa.ts`.
   *
   * `distanciaALaCosta` busca por una rejilla de cubos y se salta la mayoría de los
   * segmentos. Eso es lo que hace que montar el mundo cueste milisegundos en vez de
   * décimas de segundo, y es también donde se puede colar un fallo que sólo aparece en
   * unos pocos puntos —un anillo de más o de menos en el criterio de parada— y que en
   * pantalla se leería como una mancha de espuma en mitad del mar. Contra eso sólo
   * vale la otra implementación: mirarlos todos, que no tiene dónde equivocarse.
   */
  const aPelo = (x: number, z: number, segmentos: readonly Segmento[]): number => {
    let mejor = Infinity;
    for (const s of segmentos) {
      const dx = s.bx - s.ax;
      const dz = s.bz - s.az;
      const largo = dx * dx + dz * dz;
      let u = largo > 0 ? ((x - s.ax) * dx + (z - s.az) * dz) / largo : 0;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      const qx = s.ax + u * dx - x;
      const qz = s.az + u * dz - z;
      mejor = Math.min(mejor, qx * qx + qz * qz);
    }
    return Math.sqrt(mejor);
  };

  let segmentosMinimos = Infinity;
  let puntasSueltas = 0;
  let ladosQueNoMidenUnaTesela = 0;
  let enElCentroLaMenosNegativa = -Infinity;
  let enElMarLaMenosPositiva = Infinity;
  let enElContornoLoMasLejosDeCero = 0;
  let retrocesosAlAlejarse = 0;
  let desvioDeLaRejilla = 0;
  let holguraDeLosVertices = Infinity;
  let verticesQueElTerrenoDiceMar = 0;

  for (let semilla = 0; semilla < SEMILLAS_DE_LA_COSTA; semilla++) {
    const contorno = contornoDelDelta(crearRelieve(islas, semilla).todas());
    const { segmentos } = contorno;
    segmentosMinimos = Math.min(segmentosMinimos, segmentos.length);

    /*
     * QUE EL CONTORNO SE CIERRE. Cada punta de cada segmento tiene que ser también la
     * punta de otro: el borde de un conjunto de celdas es una curva cerrada, así que
     * ningún extremo puede quedarse solo. Se comparan los dobles TAL CUAL, sin
     * holgura, y eso se puede hacer porque las esquinas se piden por su llave
     * canónica: las dos celdas que comparten un punto lo calculan con los mismos bits,
     * no por dos caminos que dan casi lo mismo.
     */
    const grado = new Map<string, number>();
    for (const s of segmentos) {
      for (const punta of [`${String(s.ax)}|${String(s.az)}`, `${String(s.bx)}|${String(s.bz)}`]) {
        grado.set(punta, (grado.get(punta) ?? 0) + 1);
      }
      const largo = Math.hypot(s.bx - s.ax, s.bz - s.az);
      if (Math.abs(largo - RADIO_DE_TESELA) > 1e-6) ladosQueNoMidenUnaTesela++;
    }
    for (const cuantas of grado.values()) if (cuantas < 2) puntasSueltas++;

    /* Dentro, fuera y encima: los tres sitios donde el signo se puede caer. */
    enElCentroLaMenosNegativa = Math.max(
      enElCentroLaMenosNegativa,
      distanciaALaCosta({ x: 0, z: 0 }, contorno),
    );
    for (let a = 0; a < 32; a++) {
      const angulo = (a / 32) * Math.PI * 2;
      const lejos = ALCANCE_DEL_DELTA * 5;
      enElMarLaMenosPositiva = Math.min(
        enElMarLaMenosPositiva,
        distanciaALaCosta({ x: Math.cos(angulo) * lejos, z: Math.sin(angulo) * lejos }, contorno),
      );
    }
    for (const s of segmentos) {
      const medio = distanciaALaCosta({ x: (s.ax + s.bx) / 2, z: (s.az + s.bz) / 2 }, contorno);
      enElContornoLoMasLejosDeCero = Math.max(enElContornoLoMasLejosDeCero, Math.abs(medio));
    }

    /*
     * QUE CREZCA AL ALEJARSE, y por qué se empieza más allá del delta y no en el
     * origen. Fuera del círculo que encierra toda la costa el crecimiento es un
     * teorema: la distancia a cada segmento por separado es convexa a lo largo del
     * rayo y tiene su mínimo antes de ese círculo, así que de ahí en adelante todas
     * crecen, y el mínimo de funciones crecientes crece. Dentro NO lo es, y no por un
     * fallo: el contorno sube por los estuarios hasta el centro del tablero, y un rayo
     * que cruza un río sale del agua y vuelve a entrar. Exigir monotonía ahí sería
     * exigir que el delta no tuviera ríos.
     */
    for (let a = 0; a < 24; a++) {
      const angulo = (a / 24) * Math.PI * 2;
      let anterior = -Infinity;
      for (let t = ALCANCE_DEL_DELTA * 1.1; t <= ALCANCE_DEL_DELTA * 6; t += 20) {
        const d = distanciaALaCosta({ x: Math.cos(angulo) * t, z: Math.sin(angulo) * t }, contorno);
        if (d <= anterior) retrocesosAlAlejarse++;
        anterior = d;
      }
    }

    /* La rejilla contra la fuerza bruta, en vértices del disco de verdad. */
    for (const r of radios) {
      for (let s = 0; s < SECTORES_DEL_MAR; s += 7) {
        const angulo = (s / SECTORES_DEL_MAR) * Math.PI * 2;
        const x = Math.cos(angulo) * r;
        const z = Math.sin(angulo) * r;
        const conRejilla = Math.abs(distanciaALaCosta({ x, z }, contorno));
        desvioDeLaRejilla = Math.max(desvioDeLaRejilla, Math.abs(conRejilla - aPelo(x, z, segmentos)));
      }
    }

    /*
     * LOS CINCUENTA Y CUATRO SITIOS DONDE SE CONSTRUYE. `relieve.ts` garantiza que la
     * subtesela de cada vértice y su anillo de seis son tierra; de ahí sale, sin medir
     * nada, que el contorno no puede pasar a menos de DOS radios de tesela de ninguno
     * de ellos. Se mide de todas formas: un invariante que no se mide es una promesa, y
     * ésta es la que le deja sitio a la espuma para apagarse antes de la choza.
     */
    for (const v of verticesDelJuego) {
      const p = puntoDeVertice(v, RADIO_DE_COMARCA);
      const donde = { x: p.x, z: p.y };
      if (contorno.esMar(donde)) verticesQueElTerrenoDiceMar++;
      holguraDeLosVertices = Math.min(holguraDeLosVertices, -distanciaALaCosta(donde, contorno));
    }
  }

  comprobar(
    'el contorno de un delta de verdad trae cientos de segmentos, no cero',
    segmentosMinimos > 400,
    { segmentosMinimos },
  );
  comprobar(
    'y se cierra: ninguna punta de segmento se queda sola',
    puntasSueltas === 0,
    { puntasSueltas },
  );
  comprobar(
    'y cada tramo es un lado de subtesela, ni una diagonal ni medio lado',
    ladosQueNoMidenUnaTesela === 0,
    { ladosQueNoMidenUnaTesela },
  );
  comprobar(
    'la distancia es NEGATIVA en el centro del tablero',
    enElCentroLaMenosNegativa < 0,
    { laMenosNegativa: enElCentroLaMenosNegativa },
  );
  comprobar(
    'y POSITIVA a cinco alcances, en las treinta y dos direcciones',
    enElMarLaMenosPositiva > 0,
    { laMenosPositiva: enElMarLaMenosPositiva },
  );
  comprobar(
    'y cero encima del propio contorno, que es donde cambia de signo',
    enElContornoLoMasLejosDeCero < 1e-6,
    { loMasLejosDeCero: enElContornoLoMasLejosDeCero },
  );
  comprobar(
    'y crece sin volverse atrás al alejarse por una recta que sale del delta',
    retrocesosAlAlejarse === 0,
    { retrocesosAlAlejarse },
  );
  comprobar(
    'la rejilla del contorno dice lo mismo que mirar los novecientos segmentos',
    desvioDeLaRejilla < 1e-9,
    { desvioDeLaRejilla },
  );
  comprobar(
    'en los 54 vértices donde se construye, el terreno dice tierra y la distancia también',
    verticesQueElTerrenoDiceMar === 0 && holguraDeLosVertices > 0,
    { verticesQueElTerrenoDiceMar, holguraDeLosVertices },
  );
  comprobar(
    'y la costa les queda a dos radios de tesela por lo menos, como promete el anillo de siete',
    holguraDeLosVertices >= 2 * RADIO_DE_TESELA - HOLGURA,
    { holguraDeLosVertices, minimo: 2 * RADIO_DE_TESELA },
  );
  comprobar(
    'así que la espuma declarada se apaga con media tesela de margen por lo menos',
    holguraDeLosVertices > ESPUMA_TIERRA_ADENTRO + RADIO_DE_TESELA / 2,
    { holguraDeLosVertices, espuma: ESPUMA_TIERRA_ADENTRO },
  );

  /*
   * EL DISCO. Lo que se mide aquí no es que se vea bien —eso pide un aparato— sino que
   * los anillos estén DONDE SE DIJO. El reparto es la decisión de todo esto: con los
   * anillos repartidos como en el muelle, geométricos desde el centro, el aro de la
   * costa recibiría saltos de setenta unidades y la espuma saldría en cuñas; y el
   * síntoma es de los que se le achacan al sombreador durante una tarde entera.
   */
  const contornoDeMuestra = contornoDelDelta(crearRelieve(islas, 3).todas());
  const disco = geometriaDelMar(contornoDeMuestra);
  const sitios = disco.getAttribute('position');
  const aLaCosta = disco.getAttribute('costa');
  const dentroDelAro = RADIO_INTERIOR_DE_LA_COSTA * ALCANCE_DEL_DELTA;
  const fueraDelAro = RADIO_EXTERIOR_DE_LA_COSTA * ALCANCE_DEL_DELTA;

  let saltoMayorEnLaCosta = 0;
  let saltoMenorEnElHorizonte = Infinity;
  for (let i = 1; i < radios.length; i++) {
    const antes = radios[i - 1] as number;
    const ahora = radios[i] as number;
    if (antes >= dentroDelAro - HOLGURA && ahora <= fueraDelAro + HOLGURA) {
      saltoMayorEnLaCosta = Math.max(saltoMayorEnLaCosta, ahora - antes);
    } else if (antes >= fueraDelAro - HOLGURA) {
      saltoMenorEnElHorizonte = Math.min(saltoMenorEnElHorizonte, ahora - antes);
    }
  }

  let masAdentro = 0;
  let desvioDelAtributo = 0;
  for (let i = 0; i < sitios.count; i++) {
    masAdentro = Math.min(masAdentro, aLaCosta.getX(i));
    if (i % 11 !== 0) continue;
    const esperado = distanciaALaCosta({ x: sitios.getX(i), z: sitios.getZ(i) }, contornoDeMuestra);
    desvioDelAtributo = Math.max(desvioDelAtributo, Math.abs(esperado - aLaCosta.getX(i)));
  }

  comprobar(
    'los anillos son más densos en la costa que en el horizonte, y por un orden de magnitud',
    saltoMayorEnLaCosta * 10 < saltoMenorEnElHorizonte,
    { saltoMayorEnLaCosta, saltoMenorEnElHorizonte },
  );
  comprobar(
    'y el aro fino se abre por fuera de la costa de verdad, no por dentro',
    fueraDelAro > 347 && dentroDelAro < 269,
    { fueraDelAro, dentroDelAro },
  );
  comprobar(
    'ningún vértice del disco se mete bajo el tablero más de un alcance',
    masAdentro > -ALCANCE_DEL_DELTA,
    { masAdentro, alcance: ALCANCE_DEL_DELTA },
  );

  /*
   * ═══ EL DISCO NO PUEDE ASOMAR POR ENCIMA DE LOS RÍOS DEL TABLERO ═══
   *
   * Esto es lo que la comprobación de aquí arriba PARECE que dice y no dice. El disco
   * pasa por debajo del tablero hasta el centro y vive en `LAMINA`, que es EXACTAMENTE la
   * cota de la lámina de una tesela de agua del pack a nivel cero —así se quiso, para que
   * el río llegue al mar sin escalón—. Y la inundación de `costa.ts` marca como MAR toda
   * el agua conectada con el exterior, o sea todos los ríos y estuarios: sobre ellos la
   * distancia a la costa es POSITIVA. De modo que cualquier envolvente que sólo mire esa
   * distancia enciende la espuma y levanta el agua encima de teselas que son geometría
   * fija y no ondulan. Se midió antes de arreglarlo: el disco asomaba 0,19 sobre el agua
   * del pack, y a la cota exacta el resto del tiempo, que es donde aparece el parpadeo.
   *
   * Leyendo el GLSL esto no se ve: hace falta cruzar los vértices del disco con las
   * subteselas del tablero, que es lo que se hace aquí. Cuatro semillas, todos los
   * vértices, y cota superior de las dos cosas. Cero es cero pase lo que pase con el reloj.
   */
  let bajoElTablero = 0;
  let laMasEspumaDebajo = 0;
  let loQueMasSubeDebajo = 0;
  let laCostaMasGrandeDebajo = 0;
  for (let semilla = 0; semilla < 4; semilla++) {
    const celdasDelMundo = crearRelieve(islas, semilla).todas();
    const hayTablero = new Set(celdasDelMundo.map((t) => `${String(t.sub.q)},${String(t.sub.r)}`));
    const suContorno = contornoDelDelta(celdasDelMundo);
    const suDisco = geometriaDelMar(suContorno);
    const donde = suDisco.getAttribute('position');
    const cuanto = suDisco.getAttribute('costa');
    for (let i = 0; i < donde.count; i++) {
      const h = hexDePunto({ x: donde.getX(i), y: donde.getZ(i) }, RADIO_DE_TESELA);
      if (!hayTablero.has(`${String(h.q)},${String(h.r)}`)) continue;
      const c = cuanto.getX(i);
      bajoElTablero++;
      laCostaMasGrandeDebajo = Math.max(laCostaMasGrandeDebajo, c);
      laMasEspumaDebajo = Math.max(laMasEspumaDebajo, espumaPosibleEn(c));
      loQueMasSubeDebajo = Math.max(loQueMasSubeDebajo, loQueSubeEn(c));
    }
  }

  comprobar(
    'hay decenas de miles de vértices del disco con tablero encima, o sea que esto mide algo',
    bajoElTablero > 10_000,
    { bajoElTablero },
  );
  comprobar(
    'y ni uno de ellos recibe espuma: la corona empieza mucho más lejos que el agua de dentro',
    laMasEspumaDebajo === 0,
    { laMasEspumaDebajo, laCostaMasGrandeDebajo, laCoronaEmpiezaEn: CORONA_DE_LAS_OLAS.desde },
  );
  comprobar(
    'y ni uno se levanta, así que el disco no asoma por encima de los ríos del tablero',
    loQueMasSubeDebajo === 0,
    { loQueMasSubeDebajo, laCostaMasGrandeDebajo, SOMBRA_DEL_TABLERO },
  );
  comprobar(
    'el disco lleva una distancia a la costa por cada vértice',
    aLaCosta.count === sitios.count && sitios.count === radios.length * SECTORES_DEL_MAR,
    { costa: aLaCosta.count, vertices: sitios.count },
  );
  /*
   * LA HOLGURA DE ESTA, que no es la de las demás y conviene decir por qué.
   *
   * Aquí se comparan dos cosas que NO se calcularon en el mismo sitio del plano: la
   * geometría midió la distancia sobre las coordenadas de doble precisión, y esto la
   * vuelve a medir sobre las que quedaron guardadas en el `float` del atributo de
   * posición. A dos mil unidades del origen, un `float` ya redondea la posición un par
   * de diezmilésimas, y la distancia hereda ese error entero porque su pendiente es
   * uno. Una milésima deja pasar eso y sigue cazando cualquier fallo de verdad, que se
   * mide en unidades y no en diezmilésimas.
   */
  comprobar(
    'y cada una es la que dice la función, hasta donde llega un «float»',
    desvioDelAtributo < 1e-3,
    { desvioDelAtributo },
  );
  comprobar(
    'el disco cuesta los triángulos que el presupuesto tiene escritos',
    triangulosDelMar() === TRIANGULOS_DEL_MAR,
    { contados: triangulosDelMar(), escritos: TRIANGULOS_DEL_MAR },
  );
  comprobar(
    'y la geometría dibuja exactamente ésos, ni uno más',
    (disco.getIndex()?.count ?? 0) / 3 === TRIANGULOS_DEL_MAR,
    { dibujados: (disco.getIndex()?.count ?? 0) / 3 },
  );
  comprobar(
    'y el mar no se pasa del tope que el delta se ha puesto',
    TRIANGULOS_DEL_MAR <= TOPE_DEL_MAR,
    { TRIANGULOS_DEL_MAR, TOPE_DEL_MAR },
  );
}

// ---------------------------------------------------------------------------

/**
 * EL SOMBREADOR DEL MAR: lo que se puede comprobar de un GLSL sin encender una GPU.
 *
 * ═══ QUÉ SE PUEDE Y QUÉ NO ═══
 *
 * Que la espuma se vea bonita no lo dice esto: eso pide un ojo delante de una pantalla.
 * Lo que sí se puede decir en Node, y son justo los fallos que cuestan una tarde
 * entera, es esto:
 *
 *   · QUE EL TEXTO COMPILE EN LOS DOS SITIOS. `escenas/embarcadero/agua.ts` dejó
 *     escrita la restricción y aquí se hace cumplir: sin derivadas, sin extensiones,
 *     sin texturas y con la precisión declarada. Una `fwidth` colada en el fragmento
 *     funciona en el navegador del que la escribió y deja el mar NEGRO en la mitad de
 *     los teléfonos, sin un error en ninguna consola —el programa no enlaza y `three`
 *     se queda con el material por defecto—.
 *   · QUE EL FRAGMENTO REMATE COMO LOS DEL MOTOR. Sin `tonemapping_fragment` y
 *     `colorspace_fragment` el color se escribe lineal sobre un lienzo sRGB: el mar
 *     sale más oscuro que el resto y con la costura a la vista, que es exactamente lo
 *     que este trabajo venía a quitar. Y la niebla, después de los dos.
 *   · QUE LOS UNIFORMS DEL MATERIAL Y LOS DEL TEXTO SEAN LOS MISMOS. Uno que el GLSL
 *     pide y el material no pone vale cero y apaga su efecto en silencio; uno que el
 *     material pone y nadie lee es una perilla que no gira, y alguien la girará.
 *   · QUE EL COLOR DEL AGUA SIGA SIENDO EL DEL PACK. Es la promesa del §1.1 del
 *     documento, y la única que no se puede cumplir leyendo la textura en marcha:
 *     sacar un píxel de una textura cargada pide un lienzo y la app no tiene DOM. Se
 *     mide aquí, sobre `tablero.glb` y su atlas, con las mismas funciones con las que
 *     se hornean los modelos.
 */
paso('El sombreador del mar: sus uniforms, su GLSL y el color que promete no cambiar');
{
  const material = materialDeLaMarea();
  const { vertice, fragmento } = GLSL_DE_LA_MAREA;
  const texto = `${vertice}\n${fragmento}`;

  /*
   * LAS PROHIBIDAS. `texture2D` y `sampler2D` entran en la lista aunque no sean un
   * problema de plataforma: el color del mar tiene que venir por un uniform medido y
   * no por una textura, que es lo que permite comprobarlo aquí abajo.
   */
  const prohibidas = ['dFdx', 'dFdy', 'fwidth', '#extension', 'sampler2D', 'texture2D', 'textureCube'];
  const coladas = prohibidas.filter((p) => texto.includes(p));
  comprobar('el GLSL del mar no usa derivadas, extensiones ni texturas', coladas.length === 0, coladas);

  const primeraLinea = (glsl: string): string =>
    glsl.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)[0] ?? '';
  comprobar(
    'y los dos sombreadores declaran la precisión en su primera línea',
    primeraLinea(vertice) === 'precision mediump float;' &&
      primeraLinea(fragmento) === 'precision mediump float;',
    { vertice: primeraLinea(vertice), fragmento: primeraLinea(fragmento) },
  );

  const includes = fragmento
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('#include'));
  const remate = includes.slice(-3).join(' ');
  comprobar(
    'el fragmento remata con el tono, el espacio de color y la niebla, y en ese orden',
    remate === '#include <tonemapping_fragment> #include <colorspace_fragment> #include <fog_fragment>',
    remate,
  );
  comprobar(
    'y el material pide la niebla del motor, que es la del resto de la escena',
    material.fog && material.uniforms.fogColor !== undefined,
    { fog: material.fog, tieneUniformes: material.uniforms.fogColor !== undefined },
  );

  comprobar(
    'el vértice lee el atributo que «costa.ts» escribe, y con ese nombre',
    vertice.includes('attribute float costa;'),
  );

  /*
   * Y EL VÉRTICE TAMBIÉN TIENE SU REMATE, que es el que nadie mira hasta que falla.
   *
   * El trozo «fog_pars_fragment» del motor declara un «varying» que el fragmento LEE, y
   * quien lo ESCRIBE es «fog_vertex», que lee a su vez una variable llamada «mvPosition».
   * Si alguien quita uno de los dos «include» o renombra esa variable, el programa NO
   * ENLAZA: «three» se queda con el material por defecto y el mar sale liso y blanco sin
   * un error en ninguna consola. Es el mismo modo de fallo silencioso que las derivadas.
   */
  comprobar(
    'el vértice lleva los dos trozos de niebla del motor y la variable de la que leen',
    vertice.includes('#include <fog_pars_vertex>') &&
      vertice.includes('#include <fog_vertex>') &&
      /vec4\s+mvPosition/.test(vertice) &&
      vertice.indexOf('vec4 mvPosition') < vertice.indexOf('#include <fog_vertex>'),
    {
      pars: vertice.includes('#include <fog_pars_vertex>'),
      vertex: vertice.includes('#include <fog_vertex>'),
      mvPosition: /vec4\s+mvPosition/.test(vertice),
    },
  );

  /*
   * LOS UNIFORMS, LOS DOS SENTIDOS. Los de la niebla los declara el trozo del motor y
   * no nuestro texto, así que se descuentan de un lado: si se contaran, este
   * comprobador pediría que los escribiéramos a mano, que es justo lo que no se hace.
   */
  const DE_LA_NIEBLA = new Set(['fogColor', 'fogDensity', 'fogNear', 'fogFar']);
  const pedidos = new Set<string>();
  for (const m of texto.matchAll(/^uniform\s+\w+\s+(\w+)\s*;/gm)) pedidos.add(m[1] as string);
  const puestos = new Set(Object.keys(material.uniforms));
  const sinPoner = [...pedidos].filter((u) => !puestos.has(u));
  const sinLeer = [...puestos].filter((u) => !pedidos.has(u) && !DE_LA_NIEBLA.has(u));
  comprobar('cada uniform que el GLSL pide está puesto en el material', sinPoner.length === 0, sinPoner);
  comprobar('y ninguno de los del material se queda sin leer', sinLeer.length === 0, sinLeer);

  /*
   * EL CONTRATO DE LA ESPUMA, que es el que protege dónde se construye.
   *
   * `presupuesto-del-delta.ts` promete que la espuma no pasa de `ESPUMA_TIERRA_ADENTRO`
   * hacia tierra, y el bloque de la costa de más arriba mide que los 54 vértices de
   * juego quedan al menos a dos radios de tesela. Aquí se cierra el otro extremo: que
   * el sombreador reciba ESE margen, que sus dos fracciones no lo desborden y que
   * remate con el corte en seco, para que la promesa no dependa del afinado.
   */
  comprobar(
    'la banda de espuma no puede lamer más allá del margen escrito en el presupuesto',
    LAMIDO_DE_LA_ORILLA + PLUMA_DE_LA_ORILLA <= 1 + HOLGURA,
    { LAMIDO_DE_LA_ORILLA, PLUMA_DE_LA_ORILLA },
  );
  comprobar(
    'y el sombreador recibe ese margen y no otro',
    material.uniforms.orilla.value === ESPUMA_TIERRA_ADENTRO,
    { enElMaterial: material.uniforms.orilla.value, ESPUMA_TIERRA_ADENTRO },
  );
  comprobar(
    'y corta en seco a esa distancia, pase lo que pase con los números de arriba',
    fragmento.includes('blanco *= step(-orilla, vCosta);'),
  );

  /*
   * LA OLA NO PUEDE CONFUNDIRSE CON EL TERRENO. Los dos senos suman 1,62 amplitudes, y
   * eso tiene que quedar muy por debajo de un escalón de terraza: una cresta tan alta
   * como un escalón deja de leerse como agua y se lee como una duna.
   *
   * Y que se apague pegada a tierra no es un número sino la forma de la envolvente: el
   * `smoothstep` arranca en cero exacto, así que en la orilla la amplitud es cero y las
   * teselas de agua del tablero —que son geometría fija y no ondulan— no se despegan
   * del mar que tienen al lado.
   */
  comprobar(
    'la cresta más alta se queda muy por debajo de un escalón de terraza',
    ALTURA_DE_LA_OLA * 1.62 < ESCALON / 3,
    { cresta: ALTURA_DE_LA_OLA * 1.62, ESCALON },
  );
  comprobar(
    'y la ola vale cero mientras haya tablero encima, por la forma de la envolvente',
    vertice.includes(`smoothstep(${SOMBRA_DEL_TABLERO.toFixed(1)}, rompiente * 0.8, costa)`),
    { SOMBRA_DEL_TABLERO },
  );

  /*
   * ═══ LAS OLAS SON MOTAS SUELTAS, Y ESO SÍ SE PUEDE MEDIR ═══
   *
   * Lo que se ve o no se ve pide un ojo delante de una pantalla, pero esto no: el campo
   * que decide dónde hay ola está en TypeScript —`olaEn`, con la misma tabla de la que se
   * escribe el GLSL—, así que se puede recorrer un cuadro de mar, marcar dónde hay ola y
   * contar las manchas como componentes conexas. Y hace falta, porque este trozo ya se ha
   * torcido dos veces de formas que la batería no habría visto:
   *
   *   · La primera versión pintaba la espuma con un seno sobre la DISTANCIA A LA COSTA.
   *     Ese campo es casi circular, así que salían anillos concéntricos como los de un
   *     estanque. Contra eso está la regla de que la fase no puede salir de `vCosta` sola.
   *   · La segunda repartía manchas por todo el mar con un corte fijo, y salieron
   *     veinticinco manchas de las cuales veintitrés medían lo mismo: rayas iguales
   *     puestas con regla. Contra eso están el rango y la variedad de aquí abajo.
   *
   * El rango —de tres a veinticinco unidades— no es una preferencia estética suelta: es lo
   * que se midió en pantalla que se lee como oleaje y no como arañazos sobre el agua.
   */
  const PASO_DE_LA_MUESTRA = 3;
  const LADO_DE_LA_MUESTRA = 160;
  const diametros: number[] = [];
  let marConOla = 0;
  let casillas = 0;
  for (const cuando of [0, 47]) {
    const hayOla: boolean[][] = [];
    for (let i = 0; i < LADO_DE_LA_MUESTRA; i++) {
      hayOla[i] = [];
      for (let j = 0; j < LADO_DE_LA_MUESTRA; j++) {
        const v =
          olaEn(
            (i - LADO_DE_LA_MUESTRA / 2) * PASO_DE_LA_MUESTRA,
            (j - LADO_DE_LA_MUESTRA / 2) * PASO_DE_LA_MUESTRA,
            cuando,
          ) > 0.5;
        hayOla[i]![j] = v;
        casillas++;
        if (v) marConOla++;
      }
    }
    const visto = hayOla.map((fila) => fila.map(() => false));
    for (let i = 0; i < LADO_DE_LA_MUESTRA; i++)
      for (let j = 0; j < LADO_DE_LA_MUESTRA; j++) {
        if (!hayOla[i]![j] || visto[i]![j]) continue;
        let cuantas = 0;
        let tocaElBorde = false;
        const pila: [number, number][] = [[i, j]];
        visto[i]![j] = true;
        while (pila.length > 0) {
          const [a, b] = pila.pop() as [number, number];
          cuantas++;
          if (a === 0 || b === 0 || a === LADO_DE_LA_MUESTRA - 1 || b === LADO_DE_LA_MUESTRA - 1) {
            tocaElBorde = true;
          }
          for (const [da, db] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const p = a + da;
            const q = b + db;
            if (p < 0 || q < 0 || p >= LADO_DE_LA_MUESTRA || q >= LADO_DE_LA_MUESTRA) continue;
            if (hayOla[p]![q] && !visto[p]![q]) {
              visto[p]![q] = true;
              pila.push([p, q]);
            }
          }
        }
        /* Las que tocan el borde del cuadro están cortadas: su diámetro no es el suyo. */
        if (tocaElBorde) continue;
        diametros.push(2 * Math.sqrt((cuantas * PASO_DE_LA_MUESTRA ** 2) / Math.PI));
      }
  }
  diametros.sort((a, b) => a - b);
  const laMayor = diametros[diametros.length - 1] ?? 0;
  const laMenor = diametros[0] ?? 0;
  const laMediana = diametros[Math.floor(diametros.length / 2)] ?? 0;

  comprobar(
    'el mar se llena de motas de ola, ni cuatro ni un manto: cientos de manchas sueltas',
    diametros.length > 100,
    { manchas: diametros.length },
  );
  comprobar(
    'y ninguna pasa de veinticinco unidades, que es donde dejan de leerse como olas',
    laMayor < 25,
    { laMayor, laMediana },
  );
  comprobar(
    'y las hay pequeñas de verdad, hasta las tres unidades',
    laMenor < 5,
    { laMenor },
  );
  comprobar(
    'y su tamaño varía: de la más pequeña a la más grande hay al menos el triple',
    laMayor > laMenor * 3,
    { laMenor, laMayor },
  );
  comprobar(
    'el mar picado ocupa una parte del agua, no toda: entre el tres y el veinte por ciento',
    marConOla / casillas > 0.03 && marConOla / casillas < 0.2,
    { fraccion: marConOla / casillas },
  );

  /*
   * QUE LA ESPUMA NO SALGA DE LA DISTANCIA A LA COSTA SOLA, que es lo que hacía anillos.
   *
   * La cresta SÍ tiene que colgar de `vCosta` —así es como las olas van hacia la orilla en
   * vez de en una sola dirección— pero no puede ser lo único que decida su fase: si el
   * seno no lleva además algo del punto del mundo, sus crestas son las curvas de nivel de
   * un campo casi circular, o sea anillos concéntricos alrededor del delta.
   */
  const laFaseDeLaCresta = /float fase =([\s\S]*?);/.exec(fragmento)?.[1] ?? '';
  comprobar(
    'la fase de la cresta cuelga de la costa, que es lo que la manda hacia la orilla',
    laFaseDeLaCresta.includes('vCosta'),
    laFaseDeLaCresta,
  );
  comprobar(
    'pero nunca de la costa SOLA: sin el punto del mundo dentro, saldrían anillos',
    laFaseDeLaCresta.includes('vPosicionMundo'),
    laFaseDeLaCresta,
  );

  /*
   * Y QUE EL VÉRTICE NO USE EL CAMPO CORTO. Sus anillos miden un radio de tesela y las
   * motas dieciocho unidades: tres vértices por longitud de onda, justo en el límite, y
   * por fuera del aro los anillos crecen un dieciocho por ciento por vuelta y ya no
   * llegan. Colgar la ALTURA de ahí da un mar que tiembla. El fragmento sí puede: resuelve
   * por píxel. Cada uno con la escala que su malla aguanta, de la misma tabla.
   */
  comprobar(
    'el vértice mueve el agua con las zonas largas y no con las motas, que no resolvería',
    vertice.includes('zonas(mundo.xz, tiempo)') && !vertice.includes('olas(mundo.xz'),
    { usaZonas: vertice.includes('zonas(mundo.xz, tiempo)'), usaMotas: vertice.includes('olas(mundo.xz') },
  );
  comprobar(
    'y las zonas son mucho más largas que las motas: al menos cuatro veces',
    (() => {
      const largo = (k: readonly [number, number]): number => (2 * Math.PI) / Math.hypot(k[0], k[1]);
      const laMasLargaDeLasMotas = Math.max(...TRENES_DE_LAS_OLAS.map((tren) => largo(tren.k)));
      return largo(ZONAS_DE_LAS_OLAS.k) > laMasLargaDeLasMotas * 4;
    })(),
    {
      zonas: (2 * Math.PI) / Math.hypot(ZONAS_DE_LAS_OLAS.k[0], ZONAS_DE_LAS_OLAS.k[1]),
      motas: TRENES_DE_LAS_OLAS.map((tren) => (2 * Math.PI) / Math.hypot(tren.k[0], tren.k[1])),
    },
  );

  /*
   * LAS OLAS ROMPEN POR FUERA DE LA FLOTA, y ése es el ancla de toda la corona: entre los
   * barcos fondeados y la playa no puede haber espuma, porque ahí no se lee como oleaje
   * sino como suciedad en el agua. El número sale de `marina.ts` y no de aquí, así que el
   * día que alguien acerque los barcos esto lo dice.
   */
  comprobar(
    'la espuma empieza por fuera del barco que más se aleja, y no antes',
    CORONA_DE_LAS_OLAS.desde >= MAR_ADENTRO_DE_LOS_BARCOS,
    { laCoronaEmpiezaEn: CORONA_DE_LAS_OLAS.desde, elBarcoMasLejano: MAR_ADENTRO_DE_LOS_BARCOS },
  );
  comprobar(
    'y hay mar picado de sobra entre donde empieza y donde se apaga',
    CORONA_DE_LAS_OLAS.hasta > CORONA_DE_LAS_OLAS.desde * 3 &&
      CORONA_DE_LAS_OLAS.llena > CORONA_DE_LAS_OLAS.desde &&
      CORONA_DE_LAS_OLAS.calma > CORONA_DE_LAS_OLAS.llena,
    CORONA_DE_LAS_OLAS,
  );
  comprobar(
    'y una ola sube y baja donde uno se quede quieto mirando, en menos de tres minutos',
    (() => {
      const serie: number[] = [];
      for (let s = 0; s < 180; s += 2) serie.push(olaEn(40, -70, s));
      const subidas = serie.filter((v, i) => v > 0.5 && (serie[i - 1] ?? 0) <= 0.5).length;
      return subidas >= 2 && Math.min(...serie) < 0.05;
    })(),
  );

  /*
   * EL COLOR DEL AGUA DEL PACK, VUELTO A MEDIR.
   *
   * Se rehace exactamente lo que hacía el disco de antes: se busca la UV media de las
   * esquinas ALTAS de la tesela de agua —su cara de arriba— y se muestrea ahí el atlas.
   * Se compara en pasos de sRGB y no en lineal, porque un paso de sRGB es la unidad en
   * la que se nota: medio paso no lo ve nadie y dos ya son otro azul.
   */
  const io = new NodeIO();
  const tablero = await io.read(
    path.join(import.meta.dirname ?? __dirname, '..', 'modelos', 'tablero.glb'),
  );
  const raiz = tablero.getRoot().listNodes().find((n) => n.getName() === MODELO.agua);
  const primitivas: Primitive[] = [];
  const bajarPorLaMalla = (n: Node): void => {
    for (const p of n.getMesh()?.listPrimitives() ?? []) primitivas.push(p);
    for (const h of n.listChildren()) bajarPorLaMalla(h);
  };
  if (raiz !== undefined) bajarPorLaMalla(raiz);
  comprobar('la tesela de agua sigue estando en el .glb y con una sola malla', primitivas.length === 1, {
    nodo: MODELO.agua,
    primitivas: primitivas.length,
  });

  const prim = primitivas[0];
  const posiciones = prim?.getAttribute('POSITION') ?? null;
  const uvs = prim?.getAttribute('TEXCOORD_0') ?? null;
  if (prim !== undefined && posiciones !== null && uvs !== null) {
    const punto = [0, 0, 0];
    const st = [0, 0];
    let alto = -Infinity;
    for (let i = 0; i < posiciones.getCount(); i++) {
      posiciones.getElement(i, punto);
      alto = Math.max(alto, punto[1] as number);
    }
    let u = 0;
    let v = 0;
    let cuantos = 0;
    for (let i = 0; i < posiciones.getCount(); i++) {
      posiciones.getElement(i, punto);
      if ((punto[1] as number) < alto - 1e-4) continue;
      uvs.getElement(i, st);
      u += st[0] as number;
      v += st[1] as number;
      cuantos++;
    }
    const png = pngDeLaTextura(prim.getMaterial()?.getBaseColorTexture() ?? null, MODELO.agua);
    const medido = [0, 0, 0];
    muestrea(png, u / cuantos, v / cuantos, medido);
    /* El mismo camino que recorre el uniform: de hex sRGB a lineal, como hace `three`. */
    const escrito = new THREE.Color(COLOR_DEL_AGUA_DEL_PACK);
    const aSrgb = (l: number): number =>
      (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055) * 255;
    const desvio = Math.max(
      Math.abs(aSrgb(medido[0] as number) - aSrgb(escrito.r)),
      Math.abs(aSrgb(medido[1] as number) - aSrgb(escrito.g)),
      Math.abs(aSrgb(medido[2] as number) - aSrgb(escrito.b)),
    );
    const enHex = `#${medido
      .map((c) => Math.round(Math.max(0, Math.min(255, aSrgb(c)))).toString(16).padStart(2, '0'))
      .join('')}`;
    comprobar(
      'el color de partida del mar es el téxel del agua del pack, medido y no elegido',
      cuantos > 0 && desvio < 1,
      { escrito: COLOR_DEL_AGUA_DEL_PACK, medido: enHex, desvioEnPasosDeSrgb: desvio },
    );
  }

  /*
   * Y QUE LAS LUCES SEAN UNAS SOLAS.
   *
   * El mar no lo ilumina el motor: `marea.ts` rehace la cuenta a mano con estos mismos
   * colores. Si `Luces` volviera a escribirlos, cambiar el sol dejaría el mar iluminado
   * como ayer y el delta saldría con dos aguas de distinto tono sin que nada proteste.
   * Se comprueba sobre el TEXTO del componente porque es donde puede reaparecer un
   * color escrito a mano.
   */
  const fuenteDelDelta = fs.readFileSync(
    path.join(import.meta.dirname ?? __dirname, '..', 'delta.tsx'),
    'utf8',
  );
  const dondeEmpieza = fuenteDelDelta.indexOf('function Luces(');
  /*
   * SE CORTA POR EL CIERRE DEL COMPONENTE Y NO POR UN NÚMERO DE CARACTERES.
   *
   * Antes esto leía una ventana de 900 y el componente medía 811: quedaban 89 de margen.
   * Añadirle una cuarta luz o dos líneas de comentario empujaba el final fuera de la
   * ventana, y entonces el «no hay ningún #rrggbb aquí dentro» dejaba de mirar la cola sin
   * que nada se pusiera rojo. Un comprobador que se muere en silencio es peor que no
   * tenerlo, porque además da confianza.
   */
  const cierreDeLuces = fuenteDelDelta.indexOf('\n}\n', dondeEmpieza);
  const cuerpoDeLuces = fuenteDelDelta.slice(dondeEmpieza, cierreDeLuces + 3);
  comprobar(
    'el componente Luces saca sus colores de donde los saca el mar, y no los reescribe',
    dondeEmpieza >= 0 &&
      cierreDeLuces > dondeEmpieza &&
      cuerpoDeLuces.includes('LAS_LUCES_DEL_DELTA') &&
      !/#[0-9a-f]{6}/i.test(cuerpoDeLuces),
    { tieneLaConstante: cuerpoDeLuces.includes('LAS_LUCES_DEL_DELTA'), mide: cuerpoDeLuces.length },
  );
}

// ---------------------------------------------------------------------------

/**
 * LA BARAJA DEL LATERAL: que quepa, que asome y que el iman reparta.
 *
 * De las tres piezas de interfaz esta es la que mas puede romperse en silencio, porque
 * su gracia esta en una CURVA y una curva mal puesta sigue dibujando algo. El iman tiene
 * que tirar mas de la carta señalada que de sus vecinas y mas de las vecinas que de las
 * lejanas: si tirara igual de todas seria como no tenerlo, y si tirara solo de una se
 * leeria como un interruptor. Eso se comprueba con numeros o no se comprueba.
 *
 * Y lo otro que se mira es lo aburrido: que con una carta y con veinte la mano siga
 * cabiendo en el alto de la pantalla, y que en reposo asome de todas una franja — si no
 * asoma nada, no hay nada que coger.
 */
paso('La mano se agrupa por bien, cabe, asoma y el imán reparte');
{
  const CAMPO = (45 * Math.PI) / 180;
  const PANTALLAS: Array<[string, number]> = [
    ['monitor', 16 / 9],
    ['móvil de pie', 9 / 19.5],
  ];
  const BIENES = ['madera', 'ladrillo', 'lana', 'grano', 'mineral'];
  const manoDe = (cuantas: number): Array<{ id: string; bien: string }> =>
    Array.from({ length: cuantas }, (_, i) => ({
      id: `c${String(i)}`,
      /* A propósito desordenada: el reparto tiene que agruparla él. */
      bien: BIENES[(i * 3 + (i % 2)) % BIENES.length] ?? 'madera',
    }));

  const malas: string[] = [];
  for (const [nombre, proporcion] of PANTALLAS) {
    const { alto, ancho } = loQueSeVeEnLaBaraja(CAMPO, proporcion);
    for (const cuantas of [1, 3, 7, 14, 20]) {
      const puestas = huecosDeLaBaraja(manoDe(cuantas), CAMPO, proporcion, null);
      if (puestas.length !== cuantas) {
        malas.push(`${nombre}/${String(cuantas)}: salen ${String(puestas.length)}`);
      }
      for (const c of puestas) {
        if (Math.abs(c.hueco.y) + c.hueco.alto / 2 > alto / 2 + 1e-9) {
          malas.push(`${nombre}/${String(cuantas)}: se sale por arriba o por abajo`);
        }
        /* Y de todas asoma algo: el borde izquierdo cae dentro de la pantalla. */
        if (c.hueco.x - c.hueco.ancho / 2 >= ancho / 2 - 1e-9) {
          malas.push(`${nombre}/${String(cuantas)}: una carta no asoma nada`);
        }
      }
    }
  }
  comprobar('la mano cabe y asoma con una carta y con veinte', malas.length === 0, malas.slice(0, 4));

  /*
   * AGRUPADA POR BIEN, que es lo que la hace legible de un vistazo.
   *
   * Se comprueban las tres cosas que hacen que un grupo SEA un grupo: que las cartas
   * iguales salgan seguidas, que dos manos con el mismo contenido salgan idénticas
   * aunque hayan llegado en distinto orden, y que el salto entre grupos se vea —si el
   * hueco entre dos bienes fuera igual que el de dentro, estarían agrupadas en los
   * números y no en la pantalla, que es donde importa.
   */
  const revuelta = manoDe(11);
  const puestas = huecosDeLaBaraja(revuelta, CAMPO, 16 / 9, null);
  const seguidas = puestas.map((c) => c.carta.bien);
  const vistos = new Set<string>();
  let cortadas = 0;
  for (let i = 0; i < seguidas.length; i++) {
    const bien = seguidas[i] as string;
    if (i > 0 && seguidas[i - 1] !== bien && vistos.has(bien)) cortadas++;
    vistos.add(bien);
  }
  comprobar('las cartas del mismo bien salen seguidas', cortadas === 0, { cortadas, seguidas });

  const alReves = [...revuelta].reverse();
  comprobar(
    'y dos manos con las mismas cartas salen iguales aunque lleguen en otro orden',
    JSON.stringify(manoPorGrupos(revuelta).map((c) => c.bien)) ===
      JSON.stringify(manoPorGrupos(alReves).map((c) => c.bien)),
  );

  let dentro = Infinity;
  let entre = 0;
  for (let i = 1; i < puestas.length; i++) {
    const salto = Math.abs((puestas[i] as (typeof puestas)[number]).hueco.y -
      (puestas[i - 1] as (typeof puestas)[number]).hueco.y);
    if ((puestas[i] as (typeof puestas)[number]).abreGrupo) entre = Math.max(entre, salto);
    else dentro = Math.min(dentro, salto);
  }
  comprobar(
    'y el salto entre grupos se ve: al menos el doble que el de dentro',
    entre > dentro * 2,
    { dentro: Number(dentro.toFixed(4)), entre: Number(entre.toFixed(4)) },
  );

  /*
   * EL ORDEN DE DIBUJO, que es lo que arregló el icono suelto de la carta de al lado.
   *
   * Las cartas se solapan y están todas a la misma distancia, así que sin un orden
   * escrito el pintor elige el que quiere. Se exige que sea ESTRICTAMENTE creciente y con
   * hueco suficiente para las tres capas de cada carta: si dos cartas compartieran número,
   * volvería a decidir el azar.
   */
  let malOrden = 0;
  for (let i = 1; i < puestas.length; i++) {
    const a = (puestas[i - 1] as (typeof puestas)[number]).hueco.orden;
    const b = (puestas[i] as (typeof puestas)[number]).hueco.orden;
    if (b - a < 3) malOrden++;
  }
  comprobar(
    'cada carta tiene su propio orden de dibujo, con sitio para sus tres capas',
    malOrden === 0,
    { pares: malOrden },
  );

  /* El imán, medido sobre una mano de nueve apuntando a la del medio. */
  const nueve = manoDe(9);
  const quieta = huecosDeLaBaraja(nueve, CAMPO, 16 / 9, null);
  const centro = quieta[4];
  const tirada =
    centro === undefined ? [] : huecosDeLaBaraja(nueve, CAMPO, 16 / 9, centro.hueco.y);
  const sale = (i: number): number => {
    const a = quieta[i];
    const b = tirada[i];
    return a === undefined || b === undefined ? 0 : a.hueco.x - b.hueco.x;
  };
  comprobar(
    'el imán tira más de la carta señalada que de sus vecinas, y de éstas más que de las lejanas',
    sale(4) > sale(3) && sale(3) > sale(2) && sale(2) > sale(1) && sale(1) > sale(0),
    [0, 1, 2, 3, 4].map((i) => Number(sale(i).toFixed(4))),
  );
  comprobar(
    'y con el cursor fuera de la mano no tira de ninguna',
    quieta.every((c) => c.hueco.iman === 0),
  );
  comprobar(
    'la mano despierta al acercarse por el borde derecho y no en el centro',
    enLaZonaDeLaMano(1.4, CAMPO, 16 / 9) && !enLaZonaDeLaMano(0, CAMPO, 16 / 9),
  );

  /* Las áreas de trueque: una por bien, sin pisarse y dentro de la pantalla. */
  const { alto } = loQueSeVeEnLaBaraja(CAMPO, 16 / 9);
  const areas = areasDeTrueque(5, CAMPO, 16 / 9);
  let pisan = 0;
  for (let i = 0; i < areas.length; i++) {
    const a = areas[i];
    if (a === undefined) continue;
    if (Math.abs(a.y) + a.alto / 2 > alto / 2 + 1e-9) pisan++;
    for (let j = i + 1; j < areas.length; j++) {
      const b = areas[j];
      if (b !== undefined && Math.abs(a.y - b.y) < (a.alto + b.alto) / 2 - 1e-9) pisan++;
    }
  }
  comprobar('las cinco áreas de trueque caben y no se pisan', areas.length === 5 && pisan === 0, {
    areas: areas.length,
    pisan,
  });
  comprobar('y sin bienes que pedir no hay ni un área', areasDeTrueque(0, CAMPO, 16 / 9).length === 0);

  /*
   * LOS BIENES SON LOS DE RIBERAS, Y CADA CARTA TIENE EL COLOR DE SU TIERRA.
   *
   * Lo que se vigila aquí es que no vuelva a haber DOS vocabularios. Los hubo: el tablero
   * hablaba de madera y ladrillo mientras el juego reparte limo y junco, y el remiendo
   * natural —traducir en el camino— llegó a proponerse emparejando `sal` con `lana`. Una
   * carta de sal dibujada como una oveja no es un provisional: es enseñar un bien que no se
   * tiene, en la pantalla con la que se decide qué ofrecer.
   *
   * El color NO se comprueba contra una lista de colores sino contra el de su terreno: si
   * alguien renombra un terreno, la carta caería al color de reserva y se vería igual de
   * gris que cualquier otra, sin un error en ninguna parte.
   */
  const BIENES_DE_RIBERAS = ['limo', 'junco', 'sal', 'piedra', 'grano'];
  const sinTierra = BIENES_DE_RIBERAS.filter((b) => TERRENO_DEL_BIEN[b] === undefined);
  comprobar('los cinco bienes de Riberas saben de qué tierra salen', sinTierra.length === 0, sinTierra);
  const sobra = Object.keys(TERRENO_DEL_BIEN).filter((b) => !BIENES_DE_RIBERAS.includes(b));
  comprobar(
    'y no queda ni un bien de otro vocabulario en la tabla',
    sobra.length === 0,
    sobra,
  );
  const sinColor = BIENES_DE_RIBERAS.filter(
    (b) => colorDelBien(b) === colorDeTerreno('un terreno que no existe'),
  );
  comprobar(
    'y cada carta saca un color de verdad de su terreno, no el de reserva',
    sinColor.length === 0,
    sinColor.map((b) => `${b}: ${String(TERRENO_DEL_BIEN[b])}`),
  );

  /*
   * LOS ICONOS: cuatro sí, y `sal` NO, y eso último se afirma a propósito.
   *
   * De los cinco iconos provisionales ninguno significa sal, así que su carta sale con
   * color y sin dibujo — se ve que falta. Esta comprobación existe para que nadie «lo
   * arregle» emparejándole la oveja que sobra: si aparece un icono para `sal`, tiene que
   * ser porque alguien lo ha dibujado, y entonces esta línea se cambia a mano.
   */
  const sinIcono = BIENES_DE_RIBERAS.filter((b) => !BIENES_CON_ICONO.includes(b));
  comprobar('los cinco bienes de Riberas tienen icono compilado', sinIcono.length === 0, sinIcono);
  comprobar(
    'y la sal el suyo, dibujado en casa, que es el que faltaba',
    BIENES_CON_ICONO.includes('sal'),
    BIENES_CON_ICONO,
  );
  comprobar(
    'y no se ha colado ningún icono de un bien que el juego no reparte',
    BIENES_CON_ICONO.every((b) => BIENES_DE_RIBERAS.includes(b)),
    BIENES_CON_ICONO,
  );

  const rotos: string[] = [];
  for (const bien of BIENES_CON_ICONO) {
    const g = geometriaDeContornos(CONTORNOS_DEL_BIEN[bien] ?? []);
    if (g === null) {
      rotos.push(`${bien}: no da geometría`);
      continue;
    }
    const caja = g.boundingBox;
    if (caja === null) {
      rotos.push(`${bien}: sin caja`);
      continue;
    }
    const lado = Math.max(caja.max.x - caja.min.x, caja.max.y - caja.min.y);
    if (Math.abs(lado - 1) > 1e-6) rotos.push(`${bien}: lado ${lado.toFixed(3)} y no 1`);
    if (cuantosTriangulos(g) < 8) rotos.push(`${bien}: sólo ${String(cuantosTriangulos(g))} triángulos`);
  }
  comprobar(
    'y los cinco se convierten en triángulos, encajados en el mismo cuadrado',
    rotos.length === 0,
    rotos,
  );
}

// ---------------------------------------------------------------------------

/**
 * LA MANO DEL MAZO: que quepa a la izquierda SIN PISAR A NADIE.
 *
 * ═══ POR QUÉ ÉSTA ES LA QUE MÁS FALTA HACE MEDIR ═══
 *
 * La barra y la mano de bienes tenían el lienzo para ellas solas: una abajo, la otra a la
 * derecha, y entre ellas media pantalla de aire. Esta tercera llega a un sitio que ya está
 * ocupado por los lados —la barra ocupa el 82 % del ancho por abajo y en un móvil de pie
 * pasa por debajo de la franja de lado a lado— y sólo se salva por ALTURA. Una separación
 * que depende de un número contra otro número es exactamente lo que hay que medir: en
 * pantalla, dos cosas que se rozan por dos milésimas se ven perfectamente bien hasta el
 * día que alguien cambia un tercer número en otro fichero.
 *
 * Así que aquí no se comprueban las cotas escritas en `cartas.ts`: se llama a
 * `huecosDeLaBarra`, a `huecosDeLaBaraja` y a `areasDeTrueque` DE VERDAD y se mide contra
 * lo que devuelven. Es lo que hace que el día que la barra crezca, esto se ponga rojo en
 * vez de solaparse en silencio.
 *
 * Y lo otro que se mira es lo que pidió Miguel y no se puede ver de un vistazo: que un
 * grupo de cinco guardias NO ocupe cinco huecos. Un abanico que crece en línea recta se
 * ve bien con tres cartas y se come la mano con doce, y para cuando se ve ya está jugado.
 */
paso('La mano del mazo se agrupa por familias, cabe a la izquierda y no pisa a nadie');
{
  const CAMPO = (45 * Math.PI) / 180;
  const PANTALLAS: Array<[string, number]> = [
    ['monitor', 16 / 9],
    ['móvil de pie', 9 / 19.5],
  ];

  const naipe = (
    id: string,
    familia: string,
    jugar = true,
    revelar = false,
  ): CartaDelMazo => ({
    id,
    familia,
    dibujo: familia,
    nombre: id,
    sePuedeJugar: jugar,
    sePuedeRevelar: revelar,
    /* El texto que el cliente pintará FUERA del lienzo. La escena lo transporta y no lo
     * mira: aquí se pone porque el contrato lo pide, y este bloque mide geometría. */
    explicacion: SIN_EXPLICAR,
  });

  /** Una mano a propósito desordenada: el reparto tiene que agruparla él. */
  const manoDe = (cuantas: number): CartaDelMazo[] =>
    Array.from({ length: cuantas }, (_, i) =>
      naipe(
        `m${String(i)}`,
        ORDEN_DE_LAS_FAMILIAS[(i * 3 + (i % 2)) % ORDEN_DE_LAS_FAMILIAS.length] ?? 'guardia',
      ),
    );

  /**
   * LA MANO MÁS GORDA QUE SE PUEDE TENER A LA VEZ: el mazo entero del §2 —25 naipes en
   * cinco familias— MÁS LOS DOS PREMIOS, que desde que existen van en la misma mano y en
   * dos familias suyas (`vado` y `mayorguardia`, las dos primeras de
   * `ORDEN_DE_LAS_FAMILIAS`). Son 27 en SIETE familias, y las tres comprobaciones que
   * cuelgan de esto —que quepa en su franja, que no pise la barra, que no pise la mano de
   * bienes— sólo miden el caso peor si los premios están dentro: cada familia nueva abre
   * un hueco entre grupos, que es justo lo que más ancho come. Sin ellos medían 25 y su
   * cabecera decía «la más gorda».
   */
  const manoEntera = (): CartaDelMazo[] => [
    { ...naipe('premio:vado', 'vado', false, false), esPremio: true },
    { ...naipe('premio:guardia', 'mayorguardia', false, false), esPremio: true },
    ...Array.from({ length: 14 }, (_, i) => naipe(`g${String(i)}`, 'guardia')),
    ...Array.from({ length: 2 }, (_, i) => naipe(`a${String(i)}`, 'anobueno')),
    ...Array.from({ length: 2 }, (_, i) => naipe(`c${String(i)}`, 'acaparamiento')),
    ...Array.from({ length: 2 }, (_, i) => naipe(`d${String(i)}`, 'dosveredas')),
    ...Array.from({ length: 5 }, (_, i) =>
      naipe(`t${String(i)}`, FAMILIA_DE_LOS_TITULOS, false, true),
    ),
  ];
  comprobar(
    'la mano más gorda de las medidas lleva los dos premios: 27 naipes en las siete familias',
    manoEntera().length === 27 &&
      new Set(manoEntera().map((c) => c.familia)).size === ORDEN_DE_LAS_FAMILIAS.length &&
      manoEntera().filter((c) => c.esPremio === true).length === 2,
    { naipes: manoEntera().length, familias: [...new Set(manoEntera().map((c) => c.familia))] },
  );

  /* Todo lo que esta mano llega a dibujar: las cartas quietas, tiradas por el imán, y las
   * dos casillas. Se mide TODO junto contra los vecinos, porque un vecino no distingue si
   * lo pisa una carta o una casilla. */
  const todoLoQueOcupa = (
    mano: readonly CartaDelMazo[],
    prop: number,
  ): Array<{ x: number; y: number; ancho: number; alto: number }> => {
    const cajas: Array<{ x: number; y: number; ancho: number; alto: number }> = [];
    const quietas = huecosDeLasCartas(mano, CAMPO, prop, null);
    const apuntes: Array<number | null> = [null, ...quietas.map((c) => c.hueco.y)];
    for (const apunta of apuntes) {
      for (const c of huecosDeLasCartas(mano, CAMPO, prop, apunta)) cajas.push(c.hueco);
    }
    for (const c of casillasDeLaMano(['revelar', 'jugar'], CAMPO, prop)) cajas.push(c.hueco);
    return cajas;
  };

  /* ── Que quepa en su franja, en las dos pantallas y con las dos manos extremas ── */
  const desbordan: string[] = [];
  for (const [nombre, prop] of PANTALLAS) {
    const franja = franjaDeLasCartas(CAMPO, prop);
    const { ancho } = loQueSeVeEnLasCartas(CAMPO, prop);
    for (const mano of [manoDe(1), manoDe(4), manoDe(9), manoEntera()]) {
      const puestas = huecosDeLasCartas(mano, CAMPO, prop, null);
      if (puestas.length !== mano.length) {
        desbordan.push(`${nombre}/${String(mano.length)}: salen ${String(puestas.length)}`);
      }
      for (const caja of todoLoQueOcupa(mano, prop)) {
        if (caja.y + caja.alto / 2 > franja.techo + 1e-9) {
          desbordan.push(`${nombre}/${String(mano.length)}: se sale por arriba`);
        }
        if (caja.y - caja.alto / 2 < franja.piso - 1e-9) {
          desbordan.push(`${nombre}/${String(mano.length)}: se mete por debajo del piso`);
        }
        if (caja.x + caja.ancho / 2 > franja.derecha + 1e-9) {
          desbordan.push(`${nombre}/${String(mano.length)}: se sale de la franja por la derecha`);
        }
        /* Y de todas asoma algo: el canto derecho cae dentro de la pantalla. */
        if (caja.x + caja.ancho / 2 <= -ancho / 2 + 1e-9) {
          desbordan.push(`${nombre}/${String(mano.length)}: una carta no asoma nada`);
        }
      }
    }
  }
  comprobar(
    'la mano del mazo cabe en su franja con una carta y con el mazo entero en la mano',
    desbordan.length === 0,
    desbordan.slice(0, 4),
  );

  /*
   * Y LA FRANJA CABE EN LA PANTALLA, que es la comprobación que le falta a la de arriba.
   *
   * Aquélla mide las cartas contra su propia franja, así que subir el techo de la franja
   * la deja verde con la mano medio fuera del lienzo: se comprueban de acuerdo entre sí y
   * las dos equivocadas. Esto ata la franja a algo que no puede moverse con ella — el
   * canto de la pantalla — y de paso exige que sus tres cotas vayan en el orden que dicen
   * ser: piso debajo del suelo y suelo debajo del techo.
   */
  const fuera: string[] = [];
  for (const [nombre, prop] of PANTALLAS) {
    const franja = franjaDeLasCartas(CAMPO, prop);
    const { alto } = loQueSeVeEnLasCartas(CAMPO, prop);
    if (franja.techo >= alto / 2) fuera.push(`${nombre}: el techo se sale por arriba`);
    if (franja.piso <= -alto / 2) fuera.push(`${nombre}: el piso se sale por abajo`);
    if (franja.derecha >= 0) fuera.push(`${nombre}: la franja pasa del centro de la pantalla`);
    if (franja.piso >= franja.suelo || franja.suelo >= franja.techo) {
      fuera.push(`${nombre}: las tres cotas no van en orden`);
    }
  }
  comprobar(
    'y la franja donde vive cabe entera en la pantalla, con sus tres cotas en orden',
    fuera.length === 0,
    fuera,
  );

  /* ── Agrupada por familias ── */
  const revuelta = manoDe(11);
  const puestas = huecosDeLasCartas(revuelta, CAMPO, 16 / 9, null);
  const seguidas = puestas.map((c) => c.carta.familia);
  const vistas = new Set<string>();
  let cortadas = 0;
  for (let i = 0; i < seguidas.length; i++) {
    const familia = seguidas[i] as string;
    if (i > 0 && seguidas[i - 1] !== familia && vistas.has(familia)) cortadas++;
    vistas.add(familia);
  }
  comprobar('las cartas de la misma familia salen seguidas', cortadas === 0, {
    cortadas,
    seguidas,
  });

  comprobar(
    'y dos manos con las mismas cartas salen iguales aunque lleguen en otro orden',
    JSON.stringify(manoDelMazoPorFamilias(revuelta).map((c) => c.id)) ===
      JSON.stringify(manoDelMazoPorFamilias([...revuelta].reverse()).map((c) => c.id)),
  );

  comprobar(
    'y una familia que la escena no conoce va al final en vez de perderse',
    (() => {
      const conIntrusa = [...manoDe(4), naipe('x', 'una familia de otro juego')];
      const salida = manoDelMazoPorFamilias(conIntrusa);
      return salida.length === 5 && salida[salida.length - 1]?.id === 'x';
    })(),
  );

  /*
   * EL SALTO ENTRE FAMILIAS. Si el hueco entre dos familias fuera igual que el de dentro,
   * estarían agrupadas en los números y no en la pantalla, que es donde importa. Se exige
   * el DOBLE y no «mayor»: una diferencia que no se ve no separa nada.
   */
  let dentro = Infinity;
  let entre = 0;
  for (let i = 1; i < puestas.length; i++) {
    const a = puestas[i - 1] as (typeof puestas)[number];
    const b = puestas[i] as (typeof puestas)[number];
    const salto = Math.abs(b.hueco.y - a.hueco.y);
    if (b.abreGrupo) entre = Math.max(entre, salto);
    else dentro = Math.min(dentro, salto);
  }
  comprobar(
    'y las familias no se solapan entre sí: el salto entre ellas es al menos el doble que el de dentro',
    entre > dentro * 2,
    { dentro: Number(dentro.toFixed(4)), entre: Number(entre.toFixed(4)) },
  );

  let malOrden = 0;
  for (let i = 1; i < puestas.length; i++) {
    const a = (puestas[i - 1] as (typeof puestas)[number]).hueco.orden;
    const b = (puestas[i] as (typeof puestas)[number]).hueco.orden;
    if (b - a < 3) malOrden++;
  }
  comprobar(
    'cada carta del mazo tiene su propio orden de dibujo, con sitio para sus capas',
    malOrden === 0,
    { pares: malOrden },
  );

  /*
   * ── UN GRUPO GRANDE SE APRIETA EN VEZ DE DESBORDAR ──
   *
   * Es lo que pidió Miguel dicho con números: cinco guardias no pueden ocupar cinco huecos.
   * Se mide en los dos sitios donde puede romperse — el paso, que tiene que encoger, y lo
   * que el grupo mide de punta a punta, que tiene que dejar de crecer.
   */
  const cincoGuardias = huecosDeLasCartas(
    Array.from({ length: 5 }, (_, i) => naipe(`g${String(i)}`, 'guardia')),
    CAMPO,
    16 / 9,
    null,
  );
  const primera = cincoGuardias[0];
  const ultima = cincoGuardias[cincoGuardias.length - 1];
  const mideElGrupo =
    primera === undefined || ultima === undefined
      ? Infinity
      : (primera.hueco.y - ultima.hueco.y) / primera.hueco.alto + 1;
  comprobar(
    'un grupo de cinco guardias no ocupa cinco huecos: se apila con solape',
    mideElGrupo < 2.2,
    { altosDeCarta: Number(mideElGrupo.toFixed(3)) },
  );

  const pasos = [2, 3, 5, 8, 11, 14].map((n) => pasoDentroDelGrupo(n));
  const recorridos = [2, 3, 5, 8, 11, 14].map((n) => (n - 1) * pasoDentroDelGrupo(n));
  comprobar(
    'y el abanico de un grupo se cierra según crece: el paso nunca sube y el recorrido se topa',
    pasos.every((p, i) => i === 0 || p <= (pasos[i - 1] as number) + 1e-9) &&
      recorridos.every((r, i) => i === 0 || r >= (recorridos[i - 1] as number) - 1e-9) &&
      (recorridos[recorridos.length - 1] as number) <= 1.2 + 1e-9,
    { pasos: pasos.map((p) => Number(p.toFixed(3))), recorridos: recorridos.map((r) => Number(r.toFixed(3))) },
  );

  /*
   * ── NO PISA A LA BARRA ──
   *
   * La mesa vive abajo y centrada, y lo más alto que tiene ya NO es una placa: la placa se
   * fue con la tapa de madera, que queda por debajo de los huecos. Lo más alto es el ASA de
   * cada hueco —medio lado sobre su centro— y, un pelo por encima, la pieza tomada en lo
   * alto de su bote (0,516 lados: `0,62·1,18/2 + 0,12 + 0,03`); se mide contra `0,52·lado`,
   * redondeado hacia arriba. Antes se medía `0,75·lado`, la placa, y sin placa habría
   * seguido verde vigilando nada. Se prueban de una a seis piezas porque el lado depende
   * de cuántas hay, y en un monitor la barra corta —que es la más alta— es la que más sube;
   * y también el hueco de los dados, que tiene el mismo `y` y un lado de alto, y cuyo dado
   * en lo alto de su salto se queda en 0,24 lados (arista 0,52).
   *
   * Se recorre la lista `LIENZOS` con el ALTO REAL de cada uno, no dos proporciones con un
   * alto de 900 escrito a mano: `huecosDeLaMesa` decide con el alto en puntos si los dados
   * cuelgan a la izquierda, van de quinto hueco o no caben, y con 900 puntos un móvil de
   * 490 de alto «tenía» dados que en el aparato no tiene. Donde no hay sitio de dados, el
   * techo lo ponen las piezas solas, que es lo que hay en pantalla.
   */
  const TECHO_DE_LA_MESA_EN_LADOS = 0.52;
  const pisanLaBarra: string[] = [];
  const conDados: string[] = [];
  for (const [nombre, anchoPt, altoPt] of LIENZOS) {
    const prop = anchoPt / altoPt;
    let techoDeLaBarra = -Infinity;
    for (let piezas = 1; piezas <= 6; piezas++) {
      const hueco = huecosDeLaBarra(piezas, CAMPO, prop)[0];
      if (hueco === undefined) continue;
      techoDeLaBarra = Math.max(techoDeLaBarra, hueco.y + hueco.lado * TECHO_DE_LA_MESA_EN_LADOS);
    }
    const dados = huecosDeLaMesa(4, CAMPO, prop, altoPt).dados;
    if (dados !== null) {
      conDados.push(nombre);
      techoDeLaBarra = Math.max(techoDeLaBarra, dados.y + dados.alto * TECHO_DE_LA_MESA_EN_LADOS);
    }
    for (const caja of todoLoQueOcupa(manoEntera(), prop)) {
      if (caja.y - caja.alto / 2 < techoDeLaBarra + 1e-9) {
        pisanLaBarra.push(`${nombre}: baja a ${caja.y.toFixed(4)} y la barra llega a ${techoDeLaBarra.toFixed(4)}`);
      }
    }
  }
  comprobar(
    'la mano del mazo no invade la zona de la barra de construir, en los quince lienzos con su alto real —y entre los medidos hay lienzos con dados y sin ellos—',
    pisanLaBarra.length === 0 && conDados.length > 0 && conDados.length < LIENZOS.length,
    { pisan: pisanLaBarra.slice(0, 2), conDados: conDados.length, lienzos: LIENZOS.length },
  );

  /*
   * ── NI LA DE LOS BIENES ──
   *
   * Contra las dos cosas que la mano de bienes dibuja: sus cartas —con el imán a tope, que
   * es cuando más adentro llegan— y su columna de áreas de trueque, que llega mucho más
   * adentro todavía. Las áreas sólo existen mientras hay un bien cogido y coger una carta
   * del mazo suelta el bien, así que en teoría no coinciden nunca; se miden igual, porque
   * esa exclusión la sostiene el cliente y no la geometría.
   */
  const pisanLosBienes: string[] = [];
  for (const [nombre, prop] of PANTALLAS) {
    const bienes = ['limo', 'junco', 'sal', 'piedra', 'grano'];
    const manoDeBienes = Array.from({ length: 14 }, (_, i) => ({
      id: `b${String(i)}`,
      bien: bienes[i % bienes.length] as string,
    }));
    let canto = Infinity;
    const quietas = huecosDeLaBaraja(manoDeBienes, CAMPO, prop, null);
    for (const apunta of [null, ...quietas.map((c) => c.hueco.y)]) {
      for (const c of huecosDeLaBaraja(manoDeBienes, CAMPO, prop, apunta)) {
        canto = Math.min(canto, c.hueco.x - c.hueco.ancho / 2);
      }
    }
    for (const a of areasDeTrueque(bienes.length, CAMPO, prop)) {
      canto = Math.min(canto, a.x - a.ancho / 2);
    }
    for (const caja of todoLoQueOcupa(manoEntera(), prop)) {
      if (caja.x + caja.ancho / 2 > canto - 1e-9) {
        pisanLosBienes.push(`${nombre}: llega a ${(caja.x + caja.ancho / 2).toFixed(4)} y los bienes empiezan en ${canto.toFixed(4)}`);
      }
    }
  }
  comprobar(
    'ni la zona de la mano de bienes, ni la columna de áreas de trueque',
    pisanLosBienes.length === 0,
    pisanLosBienes.slice(0, 2),
  );

  /* ── El imán, medido sobre nueve cartas apuntando a la del medio ── */
  const nueve = manoDe(9);
  const quieta = huecosDeLasCartas(nueve, CAMPO, 16 / 9, null);
  const enMedio = quieta[4];
  const tirada =
    enMedio === undefined ? [] : huecosDeLasCartas(nueve, CAMPO, 16 / 9, enMedio.hueco.y);
  const sale = (i: number): number => {
    const a = quieta[i];
    const b = tirada[i];
    return a === undefined || b === undefined ? 0 : b.hueco.x - a.hueco.x;
  };
  comprobar(
    'el imán tira más de la carta señalada que de sus vecinas, y de éstas más que de las lejanas',
    sale(4) > sale(3) && sale(3) > sale(2) && sale(2) > sale(1) && sale(1) > sale(0),
    [0, 1, 2, 3, 4].map((i) => Number(sale(i).toFixed(4))),
  );
  comprobar(
    'y con el cursor fuera de la franja no tira de ninguna',
    quieta.every((c) => c.hueco.iman === 0),
  );

  /*
   * ── DÓNDE DESPIERTA ──
   *
   * Por la izquierda sí, en el centro no, y —lo que la separa de la mano de bienes— sobre
   * la barra tampoco: la esquina de abajo a la izquierda es de la barra, y si la mano
   * despertara allí, pasar el dedo por la primera pieza levantaría una carta.
   */
  const donde: string[] = [];
  for (const [nombre, prop] of PANTALLAS) {
    const franja = franjaDeLasCartas(CAMPO, prop);
    const { alto, ancho } = loQueSeVeEnLasCartas(CAMPO, prop);
    if (!enLaZonaDeLasCartas(franja.derecha, alto * 0.2, CAMPO, prop)) {
      donde.push(`${nombre}: no despierta en su propia franja`);
    }
    if (enLaZonaDeLasCartas(0, alto * 0.2, CAMPO, prop)) {
      donde.push(`${nombre}: despierta en el centro de la pantalla`);
    }
    if (enLaZonaDeLasCartas(ancho / 2 - 1e-6, alto * 0.2, CAMPO, prop)) {
      donde.push(`${nombre}: despierta en la mano de bienes`);
    }
    if (enLaZonaDeLasCartas(-ancho / 2 + 1e-6, franja.piso - alto * 0.05, CAMPO, prop)) {
      donde.push(`${nombre}: despierta encima de la barra`);
    }
  }
  comprobar(
    'la mano despierta por el borde izquierdo, y ni en el centro ni sobre la barra',
    donde.length === 0,
    donde,
  );

  /* ── Con cero cartas no se pinta NADA ── */
  comprobar(
    'con cero cartas del mazo no se pinta nada: ni un hueco, ni una casilla',
    huecosDeLasCartas([], CAMPO, 16 / 9, null).length === 0 &&
      huecosDeLasCartas([], CAMPO, 9 / 19.5, 0).length === 0 &&
      casillasDeLaMano([], CAMPO, 16 / 9).length === 0 &&
      puertasDeLaCarta(null).length === 0,
  );

  /*
   * ── QUIÉN ABRE QUÉ CASILLA ──
   *
   * Lo importante de aquí es la tercera línea: una carta que NO es un título no abre la
   * casilla de revelar por mucho que el juego mande `sePuedeRevelar` en `true`. Revelar
   * una guardia no es una jugada mal dibujada — es una carta que se enseña y ya no se
   * puede desenseñar.
   */
  const unTitulo = naipe('t', FAMILIA_DE_LOS_TITULOS, false, true);
  const unaGuardia = naipe('g', 'guardia', true, false);
  const guardada = naipe('h', 'guardia', false, false);
  const mentirosa = naipe('m', 'guardia', false, true);
  comprobar(
    'un título que se puede revelar abre la casilla de revelar, y sólo ésa',
    JSON.stringify(puertasDeLaCarta(unTitulo)) === JSON.stringify(['revelar']),
    puertasDeLaCarta(unTitulo),
  );
  comprobar(
    'una carta que se puede jugar abre la de jugar, y sólo ésa',
    JSON.stringify(puertasDeLaCarta(unaGuardia)) === JSON.stringify(['jugar']),
    puertasDeLaCarta(unaGuardia),
  );
  comprobar(
    'y ninguna carta que no sea un título abre la de revelar, diga lo que diga el juego',
    puertasDeLaCarta(mentirosa).length === 0 &&
      puertasDeLaCarta(guardada).length === 0,
    { mentirosa: puertasDeLaCarta(mentirosa), guardada: puertasDeLaCarta(guardada) },
  );

  const conGuardada = huecosDeLasCartas([unaGuardia, guardada, unTitulo], CAMPO, 16 / 9, null);
  comprobar(
    'una carta que no se puede ni jugar ni revelar sale apagada, y NO desaparece',
    conGuardada.length === 3 &&
      conGuardada.filter((c) => c.apagada).length === 1 &&
      conGuardada.find((c) => c.carta.id === 'h')?.apagada === true,
    conGuardada.map((c) => `${c.carta.id}:${String(c.apagada)}`),
  );

  /*
   * ── EL NAIPE QUE NO SE JUEGA: EL PREMIO ──
   *
   * Un premio llega con las dos banderas en `false` —no hay movimiento que mandar con él,
   * ni hoy ni nunca— y con `esPremio` puesto. Sin esa tercera bandera cae de lleno en la
   * frase de `apagada` y sale grisáceo en todas las partidas y para su dueño, que es la
   * manera exacta de que un premio ganado se lea como una carta estropeada.
   *
   * Y no abre casilla: no hay dónde soltarlo, así que no se enciende ningún sitio donde
   * soltarlo. Una casilla abierta debajo de algo que no va a pasar es peor que ninguna.
   *
   * Se comprueban las dos cosas por separado a propósito. `esPremio` toca dos frases muy
   * distintas —el apagón, en `huecosDeLasCartas`, y las puertas, en `puertasDeLaCarta`— y
   * quien arregle una sin la otra tiene que ver caerse la que no arregló.
   */
  const elVado: CartaDelMazo = {
    id: 'premio:vado',
    familia: 'vado',
    dibujo: 'vado',
    nombre: 'El Vado Largo',
    sePuedeJugar: false,
    sePuedeRevelar: false,
    esPremio: true,
    explicacion: SIN_EXPLICAR,
  };
  const conPremio = huecosDeLasCartas([unaGuardia, guardada, elVado], CAMPO, 16 / 9, null);
  comprobar(
    'un premio NO se apaga aunque no se pueda ni jugar ni revelar: no espera a ningún turno',
    conPremio.length === 3 &&
      conPremio.find((c) => c.carta.id === 'premio:vado')?.apagada === false,
    conPremio.map((c) => `${c.carta.id}:${String(c.apagada)}`),
  );
  comprobar(
    'y la carta guardada de al lado SÍ sigue apagándose: la excepción es sólo del premio',
    conPremio.find((c) => c.carta.id === 'h')?.apagada === true,
  );
  comprobar(
    'un premio no abre ninguna casilla: no hay dónde soltarlo',
    puertasDeLaCarta(elVado).length === 0,
    puertasDeLaCarta(elVado),
  );
  comprobar(
    'ni aunque llegue con las banderas puestas, que es el cinturón contra el otro lado',
    puertasDeLaCarta({ ...elVado, sePuedeJugar: true, sePuedeRevelar: true }).length === 0 &&
      puertasDeLaCarta({ ...elVado, familia: FAMILIA_DE_LOS_TITULOS, sePuedeRevelar: true })
        .length === 0,
  );
  /*
   * Y SE REPARTE ARRIBA DEL TODO, que es lo que compra el sitio de `vado` en
   * `ORDEN_DE_LAS_FAMILIAS`: las casillas viven en el PIE de la franja, así que el naipe
   * que nunca se arrastra tiene que estar lejos de ellas y no cruzarse en el camino de
   * cada jugada. Se le mete desordenado —el último de la lista— para que sea el reparto
   * quien lo suba y no el orden con que se escribió.
   */
  comprobar(
    'el premio se reparte ARRIBA del todo, lejos de las casillas que nunca va a usar',
    conPremio[0]?.carta.id === 'premio:vado' &&
      (conPremio[0]?.hueco.y ?? 0) > (conPremio[1]?.hueco.y ?? 0),
    conPremio.map((c) => `${c.carta.id}@${c.hueco.y.toFixed(3)}`),
  );

  /* ── Las casillas: en el pie de la franja, sin pisarse y sin llegar a las cartas ── */
  const malasCasillas: string[] = [];
  for (const [nombre, prop] of PANTALLAS) {
    const franja = franjaDeLasCartas(CAMPO, prop);
    const casillas = casillasDeLaMano(['revelar', 'jugar'], CAMPO, prop);
    if (casillas.length !== 2) malasCasillas.push(`${nombre}: salen ${String(casillas.length)}`);
    for (let i = 0; i < casillas.length; i++) {
      const a = (casillas[i] as (typeof casillas)[number]).hueco;
      if (a.y + a.alto / 2 > franja.suelo + 1e-9) {
        malasCasillas.push(`${nombre}: una casilla sube hasta donde están las cartas`);
      }
      if (a.ancho <= a.alto) malasCasillas.push(`${nombre}: una casilla sale más alta que ancha`);
      for (let j = i + 1; j < casillas.length; j++) {
        const b = (casillas[j] as (typeof casillas)[number]).hueco;
        if (Math.abs(a.y - b.y) < (a.alto + b.alto) / 2 - 1e-9) {
          malasCasillas.push(`${nombre}: dos casillas se pisan`);
        }
      }
    }
    /* Y con una sola, la de abajo se queda donde estaba: el sitio no baila. */
    const sola = casillasDeLaMano(['jugar'], CAMPO, prop)[0];
    const abajo = casillas[0];
    if (sola === undefined || abajo === undefined || Math.abs(sola.hueco.y - abajo.hueco.y) > 1e-9) {
      malasCasillas.push(`${nombre}: la casilla de abajo cambia de sitio según cuántas haya`);
    }
  }
  comprobar(
    'las casillas caben en el pie de la franja, no se pisan y no suben a la mano',
    malasCasillas.length === 0,
    malasCasillas.slice(0, 3),
  );

  /*
   * ── LOS COLORES DE LAS FAMILIAS ──
   *
   * Una familia, un color, y ninguno igual a otro ni al de reserva. En reposo de un naipe
   * asoma un canto y del canto sólo se ve el color —el dibujo está fuera de la pantalla
   * hasta que el imán lo saca—, así que dos familias del mismo tono son dos montones
   * idénticos en la pantalla con la que se decide qué jugar.
   */
  const colores = ORDEN_DE_LAS_FAMILIAS.map((f) => colorDeLaFamilia(f));
  comprobar(
    'cada familia tiene color propio, distinto entre sí y distinto al de reserva',
    new Set(colores).size === ORDEN_DE_LAS_FAMILIAS.length &&
      colores.every((c) => c !== COLOR_SIN_FAMILIA),
    colores,
  );
  comprobar(
    'y una familia desconocida sale con el de reserva en vez de reventar',
    colorDeLaFamilia('una familia de otro juego') === COLOR_SIN_FAMILIA,
  );

  /*
   * ── Y LA SEÑAL QUE SEPARA UN PREMIO DE UNA CARTA: LA SATURACIÓN ──
   *
   * «Distinto de las otras seis» no basta para lo que hace falta aquí. La pregunta que se
   * responde mirando el canto de un naipe no es «¿cuál de las siete es?» sino «¿esto es
   * una carta del mazo o es un premio?», y ésa la contesta un rasgo COMPARTIDO por los dos
   * premios y por ninguna de las cinco del mazo. Es la saturación: las cinco del mazo son
   * tonos apagados y los dos premios son vivos.
   *
   * Se mide y no se comparan dos códigos de color escritos aquí, porque un comprobador que
   * repita la tabla no comprueba la tabla: la copia. Así, quien apague un premio para que
   * «pegue mejor con los demás» se entera de que acaba de borrar la señal.
   *
   * El hueco entre 0,55 y 0,60 está a propósito: sin él, ajustar un color un punto pondría
   * rojo el comprobador sin que nada se leyera distinto.
   */
  const saturacion = (hex: string): number => {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const alto = Math.max(r, g, b);
    const bajo = Math.min(r, g, b);
    if (alto === bajo) return 0;
    const luz = (alto + bajo) / 2;
    return luz > 0.5 ? (alto - bajo) / (2 - alto - bajo) : (alto - bajo) / (alto + bajo);
  };
  const PREMIOS = ['vado', 'mayorguardia'];
  const DEL_MAZO = ORDEN_DE_LAS_FAMILIAS.filter((f) => !PREMIOS.includes(f));
  comprobar(
    'las dos familias de premio están en el reparto de la mano, o no saldrían',
    PREMIOS.every((f) => ORDEN_DE_LAS_FAMILIAS.includes(f)) && DEL_MAZO.length === 5,
    { premios: PREMIOS, delMazo: DEL_MAZO },
  );
  comprobar(
    'las cinco del mazo son tonos APAGADOS: ninguna pasa de 0,55 de saturación',
    DEL_MAZO.every((f) => saturacion(colorDeLaFamilia(f)) <= 0.55),
    DEL_MAZO.map((f) => `${f}:${saturacion(colorDeLaFamilia(f)).toFixed(2)}`),
  );
  comprobar(
    'y los dos premios son los dos únicos VIVOS: por encima de 0,60, que es la señal',
    PREMIOS.every((f) => saturacion(colorDeLaFamilia(f)) >= 0.6),
    PREMIOS.map((f) => `${f}:${saturacion(colorDeLaFamilia(f)).toFixed(2)}`),
  );
  comprobar(
    'y los dos premios no son dos matices del mismo: se tienen a la vez y son dos cantos',
    colorDeLaFamilia('vado') !== colorDeLaFamilia('mayorguardia'),
  );

  /*
   * ── LOS ONCE DIBUJOS QUE LA MANO PUEDE PEDIR: NUEVE CARTAS Y DOS PREMIOS ──
   *
   * `delta.tsx` busca el dibujo de una carta en `CONTORNOS_DE_LA_CARTA`, y una búsqueda
   * fallida NO revienta: devuelve contornos vacíos, `geometriaDeContornos` da `null`, y la
   * carta se pinta con su color y sin nada dentro. Es lo correcto —mejor una carta pelada
   * que una carta con el dibujo de otra— pero es también la forma más silenciosa de que
   * media mano se quede muda: nueve naipes de colores planos se ven como una decisión de
   * arte.
   *
   * Así que se pide aquí lo que pide la mano, con los mismos nombres, y se exige que salga
   * geometría de verdad. Que no falte ninguno es cosa del compilador de iconos; que la
   * mano los ENCUENTRE es cosa de esta escena, y esto es lo segundo.
   *
   * Los dos últimos —`vado` y `mayorguardia`— no son cartas del mazo sino los PREMIOS, y
   * se piden por la misma puerta porque se pintan como naipe en la misma mano. Un premio
   * sin contorno no revienta tampoco: sale un naipe de color plano, y un naipe de color
   * plano en la mano de quien acaba de ganar el Vado Largo es exactamente el fallo que
   * este encargo venía a arreglar, con otra cara.
   */
  const DIBUJOS_DE_LAS_CARTAS = [
    'guardia',
    'anobueno',
    'acaparamiento',
    'dosveredas',
    'molino',
    'cantera',
    'torreon',
    'faro',
    'huerto',
    /* Y los dos premios, que se pintan como naipe en la misma mano y con la misma cuenta. */
    'vado',
    'mayorguardia',
  ];
  const mudas: string[] = [];
  for (const dibujo of DIBUJOS_DE_LAS_CARTAS) {
    const g = geometriaDeContornos(CONTORNOS_DE_LA_CARTA[dibujo] ?? []);
    if (g === null) {
      mudas.push(`${dibujo}: la mano no lo encuentra`);
      continue;
    }
    const caja = g.boundingBox;
    if (caja === null) {
      mudas.push(`${dibujo}: sin caja`);
      continue;
    }
    const lado = Math.max(caja.max.x - caja.min.x, caja.max.y - caja.min.y);
    if (Math.abs(lado - 1) > 1e-6) mudas.push(`${dibujo}: lado ${lado.toFixed(3)} y no 1`);
    if (cuantosTriangulos(g) < 8) {
      mudas.push(`${dibujo}: sólo ${String(cuantosTriangulos(g))} triángulos`);
    }
  }
  comprobar(
    'los once dibujos que la mano de la izquierda puede pedir los encuentra y dan triángulos',
    mudas.length === 0,
    mudas,
  );
  comprobar(
    'y ninguno de ellos se busca por error en la tabla de los bienes',
    DIBUJOS_DE_LAS_CARTAS.every((d) => !BIENES_CON_ICONO.includes(d)),
    DIBUJOS_DE_LAS_CARTAS.filter((d) => BIENES_CON_ICONO.includes(d)),
  );

  /*
   * ── LAS CIFRAS DE LAS FICHAS: LAS ONCE, Y QUE LA FICHA LAS PINTE ──
   *
   * La ficha de la comarca llevó durante toda una partida los puntos de probabilidad y
   * NINGUNA cifra: la cabecera de `Numero` prometía «la cifra marcada» y el código no la
   * marcaba, y Miguel jugó contando puntos. No se puede escribir un número en la escena
   * —no hay fuente ni lienzo en la app— así que la cifra es un contorno más, dibujado en
   * el compilador de iconos y pedido por `String(cifra)`.
   *
   * Y una búsqueda fallida no revienta: devuelve contornos vacíos, la geometría es `null` y
   * la ficha sale con los puntos y sin número, o sea EXACTAMENTE como estaba. Es el fallo
   * más silencioso posible, porque su síntoma es el estado anterior. Por eso se piden aquí
   * las once que salen en un delta —las de `NUMEROS_DE_LAS_ISLAS`, sin el siete— con la
   * misma llave que usa la ficha, y se exige geometría de verdad y del tamaño normalizado.
   */
  const CIFRAS_DE_UN_DELTA = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map(String);
  const cifrasMudas: string[] = [];
  for (const cifra of CIFRAS_DE_UN_DELTA) {
    const g = geometriaDeContornos(CONTORNOS_DE_LA_CIFRA[cifra] ?? []);
    if (g === null) {
      cifrasMudas.push(`${cifra}: la ficha no la encuentra`);
      continue;
    }
    const caja = g.boundingBox;
    const lado = caja === null ? 0 : Math.max(caja.max.x - caja.min.x, caja.max.y - caja.min.y);
    if (Math.abs(lado - 1) > 1e-6) cifrasMudas.push(`${cifra}: lado ${lado.toFixed(3)} y no 1`);
    if (cuantosTriangulos(g) < 8) cifrasMudas.push(`${cifra}: sólo ${String(cuantosTriangulos(g))} triángulos`);
    g.dispose();
  }
  comprobar(
    'las once cifras que salen en un delta tienen dibujo, dan triángulos y llegan normalizadas',
    cifrasMudas.length === 0,
    cifrasMudas,
  );
  comprobar(
    'y no hay cifras de más ni de menos en la tabla: las que se dibujan son las que se juegan',
    CIFRAS_CON_ICONO.length === CIFRAS_DE_UN_DELTA.length &&
      CIFRAS_DE_UN_DELTA.every((c) => CIFRAS_CON_ICONO.includes(c)),
    { enLaTabla: CIFRAS_CON_ICONO, enElJuego: CIFRAS_DE_UN_DELTA },
  );
  comprobar(
    'y ninguna llave de cifra choca con una carta ni con un bien: son tres tablas y tres puertas',
    CIFRAS_CON_ICONO.every((c) => !CARTAS_CON_ICONO.includes(c) && !BIENES_CON_ICONO.includes(c)),
  );

  /*
   * QUE LA FICHA LO LEA. Una tabla con lector es un dato; sin lector es adorno, y el día
   * que alguien «limpie» la línea de `Numero` la ficha vuelve a salir sin número sin que
   * nada se ponga rojo. Y que el seis y el ocho vayan en su rojo: es como se imprime la
   * ficha del juego de mesa, y la razón está en la cabecera de la constante.
   */
  const fuenteDeLaFicha = fs.readFileSync(
    path.join(import.meta.dirname ?? __dirname, '..', 'delta.tsx'),
    'utf8',
  );
  const empiezaNumero = fuenteDeLaFicha.indexOf('function Numero(');
  const acabaNumero = fuenteDeLaFicha.indexOf('\n}\n', empiezaNumero);
  const cuerpoDeNumero = fuenteDeLaFicha.slice(empiezaNumero, acabaNumero);
  comprobar(
    'la ficha pide su cifra a la tabla por «String(cifra)», que es la llave con la que se compiló',
    empiezaNumero >= 0 && cuerpoDeNumero.includes('CONTORNOS_DE_LA_CIFRA[String(cifra)]'),
  );
  const calientes = /const CIFRAS_CALIENTES: readonly number\[\] = \[([^\]]*)\];/.exec(fuenteDeLaFicha);
  const numerosCalientes = (calientes?.[1] ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  comprobar(
    'y el seis y el ocho —los dos que más salen, y sólo ellos— van en el rojo de la ficha',
    numerosCalientes.length === 2 &&
      numerosCalientes.includes(6) &&
      numerosCalientes.includes(8) &&
      cuerpoDeNumero.includes('COLOR_DE_LA_CIFRA_CALIENTE'),
    { numerosCalientes, loUsaNumero: cuerpoDeNumero.includes('COLOR_DE_LA_CIFRA_CALIENTE') },
  );
}

// ---------------------------------------------------------------------------

/**
 * LOS SITIOS Y LA BARRA: lo que se puede pulsar y lo que se puede coger.
 *
 * Son las dos listas de las que cuelga la interfaz de juego, y las dos se pueden contar
 * sin abrir una ventana. Que salgan 54 vértices y 72 aristas no es una curiosidad: es que
 * la malla y la escena están de acuerdo sobre cuántos sitios tiene un tablero.
 *
 * Y de la barra se comprueba lo único que puede salir mal sin que nadie lo vea: que en
 * una pantalla estrecha las piezas ENCOJAN en vez de amontonarse o salirse. Un móvil de
 * pie tiene menos de la mitad del ancho de un monitor a igualdad de alto, y ahí es donde
 * una barra pensada en un portátil se rompe.
 */
paso('Los sitios se pueden contar y la barra cabe en cualquier pantalla');
{
  const TERRENOS = [
    'bosque', 'bosque', 'bosque', 'bosque', 'pradera', 'pradera', 'pradera', 'pradera',
    'campo', 'campo', 'campo', 'campo', 'colina', 'colina', 'colina',
    'montana', 'montana', 'montana', 'desierto',
  ];
  const hexes = mallaDeRadio(2);
  const islas = hexes.map((hex, i) => ({ hex, terreno: TERRENOS[i % TERRENOS.length] ?? 'pradera' }));
  const relieve = crearRelieve(islas, 3);
  const sitios = sitiosDelTablero(hexes, (p) => relieve.alturaEn(p));

  comprobar(
    'un tablero tiene 54 vértices, 72 aristas y 19 comarcas',
    sitios.vertices.length === 54 && sitios.aristas.length === 72 && sitios.comarcas.length === 19,
    {
      vertices: sitios.vertices.length,
      aristas: sitios.aristas.length,
      comarcas: sitios.comarcas.length,
    },
  );

  const llaves = new Set(sitios.todos.map((x) => `${x.clase}:${x.llave}`));
  comprobar('y ningún sitio sale dos veces', llaves.size === sitios.todos.length, {
    distintos: llaves.size,
    total: sitios.todos.length,
  });

  /*
   * Los permitidos son EXACTAMENTE los que se piden, ni uno más. Es la comprobación de
   * que la escena no opina: con la lista vacía no puede aparecer ni un anillo, y con
   * llaves de vértice pedidas como aristas tampoco.
   */
  const tres = sitios.vertices.slice(0, 3).map((x) => x.llave);
  comprobar(
    'la escena ofrece exactamente los sitios que le dan, y ninguno con la lista vacía',
    sitiosPermitidos(sitios, { clase: 'vertice', donde: tres }).length === 3 &&
      sitiosPermitidos(sitios, { clase: 'vertice', donde: [] }).length === 0 &&
      sitiosPermitidos(sitios, { clase: 'arista', donde: tres }).length === 0,
  );

  /* Y la barra, en las tres formas de pantalla que existen de verdad. */
  const CAMPO = (45 * Math.PI) / 180;
  const PANTALLAS: Array<[string, number]> = [
    ['monitor', 16 / 9],
    ['tableta', 4 / 3],
    ['móvil de pie', 9 / 19.5],
  ];
  const malas: string[] = [];
  for (const [nombre, proporcion] of PANTALLAS) {
    const { alto, ancho } = loQueSeVe(CAMPO, proporcion);
    for (const cuantos of [1, 2, 4, 6, 8, 10]) {
      const huecos = huecosDeLaBarra(cuantos, CAMPO, proporcion);
      if (huecos.length !== cuantos) {
        malas.push(`${nombre}/${String(cuantos)}: salen ${String(huecos.length)}`);
      }
      for (let i = 0; i < huecos.length; i++) {
        const a = huecos[i];
        if (a === undefined) continue;
        if (Math.abs(a.x) + a.lado / 2 > ancho / 2 + 1e-9) {
          malas.push(`${nombre}/${String(cuantos)}: se sale por el lado`);
        }
        if (Math.abs(a.y) + a.lado / 2 > alto / 2 + 1e-9) {
          malas.push(`${nombre}/${String(cuantos)}: se sale por abajo`);
        }
        for (let j = i + 1; j < huecos.length; j++) {
          const b = huecos[j];
          if (b !== undefined && dentroDelHueco(a, b.x, b.y)) {
            malas.push(`${nombre}/${String(cuantos)}: dos piezas encima`);
          }
        }
      }
    }
  }
  comprobar(
    'la barra cabe entera y sin solapes en monitor, tableta y móvil',
    malas.length === 0,
    malas.slice(0, 4),
  );

  const enMonitor = huecosDeLaBarra(6, CAMPO, 16 / 9)[0]?.lado ?? 0;
  const enMovil = huecosDeLaBarra(6, CAMPO, 9 / 19.5)[0]?.lado ?? 0;
  comprobar(
    'y en una pantalla estrecha las piezas encogen en vez de amontonarse',
    enMovil < enMonitor,
    { monitor: Number(enMonitor.toFixed(3)), movil: Number(enMovil.toFixed(3)) },
  );

  comprobar('con cero piezas no hay barra', huecosDeLaBarra(0, CAMPO, 16 / 9).length === 0);

  /*
   * ═══ EL CUARTO HUECO: EL MAZO ═══
   *
   * La barra de Riberas tenía tres piezas —choza, torre, vereda— y ahora lleva un cuarto
   * hueco con un naipe tapado: el que se pulsa para comprar. `huecosDeLaBarra` ya sabía
   * repartir de uno a diez, así que aquí no se estrena aritmética; lo que se estrena es
   * que ALGUIEN PIDA CUATRO, y hay tres cosas que medir por eso.
   */

  /*
   * ── 1. LA BARRA ESTÁ CENTRADA, Y EL CUARTO NO SE AÑADE: LO MUEVE TODO ──
   *
   * Es lo que se ve al jugar y lo que hay que dejar escrito con números: pedir un hueco
   * más NO deja los tres de antes donde estaban. Los corre a la izquierda y mete el nuevo
   * al final, porque el reparto sale de repartir el ancho a los dos lados del cero.
   *
   * Se comprueba, y no sólo se cuenta, porque el arreglo «natural» el día que alguien se
   * queje —anclar los tres viejos y crecer hacia fuera— rompe la simetría y empuja el
   * hueco nuevo justo a la esquina peor de alcanzar con el pulgar.
   */
  for (const [nombre, proporcion] of PANTALLAS) {
    const deTres = huecosDeLaBarra(3, CAMPO, proporcion);
    const deCuatro = huecosDeLaBarra(4, CAMPO, proporcion);
    comprobar(
      `en ${nombre}, el cuarto hueco corre los tres de antes a la izquierda y no se añade a la derecha`,
      deCuatro.length === 4 &&
        deTres.every((h, i) => (deCuatro[i]?.x ?? 0) < h.x) &&
        Math.abs((deCuatro[0]?.x ?? 0) + (deCuatro[3]?.x ?? 0)) < 1e-9,
      {
        tres: deTres.map((h) => Number(h.x.toFixed(4))),
        cuatro: deCuatro.map((h) => Number(h.x.toFixed(4))),
      },
    );
    comprobar(
      `y en ${nombre} el último es el de más a la derecha, que es donde va el mazo`,
      deCuatro.every((h, i) => i === 0 || h.x > (deCuatro[i - 1]?.x ?? 0)),
      deCuatro.map((h) => Number(h.x.toFixed(4))),
    );
  }

  /*
   * ── 2. Y CON CUATRO LAS PIEZAS ENCOGEN, PERO NO EN TODAS LAS PANTALLAS ──
   *
   * En un monitor el lado lo manda el ALTO y cuatro caben igual de grandes que tres: el
   * lado no cambia ni un milímetro. En un móvil de pie lo manda el ANCHO y encogen. Las
   * dos cosas son correctas y conviene tenerlas escritas, porque «se me han hecho más
   * pequeñas las piezas» es una queja que sólo tiene sentido en una de las dos.
   */
  const cuatroEnMonitor = huecosDeLaBarra(4, CAMPO, 16 / 9)[0]?.lado ?? 0;
  const tresEnMonitor = huecosDeLaBarra(3, CAMPO, 16 / 9)[0]?.lado ?? 0;
  const cuatroEnMovil = huecosDeLaBarra(4, CAMPO, 9 / 19.5)[0]?.lado ?? 0;
  const tresEnMovil = huecosDeLaBarra(3, CAMPO, 9 / 19.5)[0]?.lado ?? 0;
  comprobar(
    'en un monitor el cuarto hueco no encoge nada: ahí manda el alto y sobra ancho',
    Math.abs(cuatroEnMonitor - tresEnMonitor) < 1e-9,
    { tres: Number(tresEnMonitor.toFixed(4)), cuatro: Number(cuatroEnMonitor.toFixed(4)) },
  );
  comprobar(
    'y en un móvil de pie sí encogen, que es lo que hace que quepan en vez de amontonarse',
    cuatroEnMovil < tresEnMovil,
    { tres: Number(tresEnMovil.toFixed(4)), cuatro: Number(cuatroEnMovil.toFixed(4)) },
  );

  /*
   * ── 3. Y SIGUEN SIENDO TOCABLES: EL SUELO DE 44 PUNTOS ──
   *
   * Esta es la que de verdad podía salir mal. El asa de un hueco mide un lado por un lado,
   * y la casa tiene escrito en cuatro sitios que nada que se toque baja de 44 puntos.
   * Cuatro huecos en vez de tres es un 26 % menos de lado allí donde manda el ancho, y si
   * eso cruzara el suelo el encargo estaría entregando una barra que en un teléfono
   * estrecho no se puede pulsar — sin un error en ninguna parte, porque el hueco seguiría
   * dibujándose perfecto.
   *
   * LA CUENTA. Un hueco mide `lado` unidades de mundo a la distancia de la barra, y a esa
   * distancia la cámara ve `alto` unidades en toda la altura del lienzo. Así que en
   * puntos de pantalla mide `lado / alto * altoDelLienzoEnPuntos`. No hace falta saber la
   * densidad del aparato: los 44 son puntos, no píxeles físicos, y `alto` sale de la misma
   * `loQueSeVe` que usa el reparto.
   *
   * LAS MEDIDAS SON LAS DEL LIENZO Y NO LAS DE LA PANTALLA, y esa distinción es la mitad
   * del asunto: en la app el delta vive en una franja —`PARTE_DEL_ALTO` del alto, con un
   * suelo de 360 puntos— con el marcador encima y los botones debajo. El caso peor no es
   * el móvil más estrecho sino el lienzo más BAJO, porque cuando manda el alto el lado se
   * lleva un 14 % de él y nada más.
   *
   * Los tamaños son los de la lista `LIENZOS` de la cabecera del guion, común a todos los
   * bloques: los de la app en los teléfonos más pequeños que se admiten, la pantalla
   * completa, una tableta con el navegador de pie y los ocho apaisados reales.
   */
  /*
   * El suelo lo exporta `barra.ts` porque `huecosDeLaMesa` decide con él; aquí se afirma
   * que sigue siendo el de la casa —los cinco `minHeight: 44` de `tablero-en-linea.tsx`—
   * para que nadie lo baje desde la barra para hacer caber unos dados.
   */
  comprobar('el suelo de toque que usa la barra es el de la casa: 44 puntos', SUELO_DEL_TOQUE === 44, SUELO_DEL_TOQUE);
  const chicos: string[] = [];
  const medidos: string[] = [];
  for (const [nombre, ancho, alto] of LIENZOS) {
    const visto = loQueSeVe(CAMPO, ancho / alto);
    const hueco = huecosDeLaBarra(4, CAMPO, ancho / alto)[0];
    if (hueco === undefined) {
      chicos.push(`${nombre}: no hay hueco`);
      continue;
    }
    const enPuntos = (hueco.lado / visto.alto) * alto;
    medidos.push(`${nombre}: ${enPuntos.toFixed(1)}`);
    if (enPuntos < SUELO_DEL_TOQUE) {
      chicos.push(`${nombre}: ${enPuntos.toFixed(1)} puntos, y el suelo son ${String(SUELO_DEL_TOQUE)}`);
    }
  }
  comprobar(
    'con cuatro huecos, el asa de cada uno sigue por encima de los 44 puntos de toque en todos los lienzos',
    chicos.length === 0,
    { medidos, chicos },
  );
  /*
   * Y el mismo suelo con tres, para que se vea CUÁNTO se ha gastado. Sin esta línea, el
   * día que alguien pida un quinto hueco no habría con qué comparar y el margen que queda
   * habría que volver a averiguarlo.
   *
   * Esta línea exigía que «tres y cuatro midan lo mismo» porque con `PARTE_DEL_ALTO` a
   * 0,13 en 320×360 mandaba el alto. Con 0,14 ya no: ahí manda el ANCHO y el cuarto hueco
   * cuesta tres puntos (50,4 con tres, 47,5 con cuatro). Lo que aquella igualdad protegía
   * era el SUELO, y eso es lo único que se exige ahora, de los dos: pedir que midan lo
   * mismo habría obligado a dejar el asa en 41,6 puntos en el apaisado del SE para
   * conservar una igualdad que no compraba nada.
   */
  const conTres = (() => {
    const visto = loQueSeVe(CAMPO, 320 / 360);
    return ((huecosDeLaBarra(3, CAMPO, 320 / 360)[0]?.lado ?? 0) / visto.alto) * 360;
  })();
  const conCuatro = (() => {
    const visto = loQueSeVe(CAMPO, 320 / 360);
    return ((huecosDeLaBarra(4, CAMPO, 320 / 360)[0]?.lado ?? 0) / visto.alto) * 360;
  })();
  comprobar(
    'y en el lienzo peor tanto tres como cuatro huecos llegan al suelo: ahí ya manda el ancho y el cuarto cuesta, pero no cruza los 44',
    conTres >= SUELO_DEL_TOQUE && conCuatro >= SUELO_DEL_TOQUE && conCuatro <= conTres,
    { tres: Number(conTres.toFixed(1)), cuatro: Number(conCuatro.toFixed(1)), suelo: SUELO_DEL_TOQUE },
  );

  /*
   * ── 3b. Y EL CUARTO HUECO NO SE METE DEBAJO DE LA BARAJA DE BIENES ──
   *
   * La barra y la baraja viven en el MISMO plano (`DISTANCIA_DE_LA_BARRA` =
   * `DISTANCIA_DE_LA_BARAJA` = 2), con las cartas de bienes delante. Donde se solapan, la
   * carta gana el rayo y ese trozo del asa del naipe no se puede pulsar — sin un error en
   * ninguna parte, porque el naipe se sigue dibujando entero. Con tres huecos el borde
   * derecho de la barra quedaba en +0,3748 (lienzos de 490 puntos de alto); con cuatro y el
   * ancho de entonces (0,82) se iba a +0,5083, un 36 % más ancha, y NADIE medía la barra
   * contra la mano de bienes: la comprobación de arriba («la mano del mazo no invade la
   * zona de la barra») mide la OTRA mano, la de la izquierda.
   *
   * Se miden dos cosas distintas, porque un toque y un ratón no encuentran lo mismo:
   *   · las cartas QUIETAS son lo que encuentra un toque —el imán sigue al puntero en el
   *     `useFrame`, y el rayo de la pulsación sale antes de que la mano se abra—; ahí el
   *     hueco del mazo tiene que quedar libre en TODOS los lienzos;
   *   · con el imán a tope —un ratón que pasa por encima— las cartas asoman más, y en el
   *     lienzo entero de un móvil de pie ya pisaban la vereda con TRES huecos: eso no lo
   *     estrenó el cuarto y no se arregla con la anchura de la barra (habría que bajar de
   *     los 44 puntos de toque de arriba). Ahí lo que se exige es que el cuarto hueco no
   *     meta la barra debajo de la baraja en ningún lienzo donde con tres no estaba.
   *
   * Las áreas de trueque se miden y se ENSEÑAN en el detalle, pero no se exigen: sólo
   * existen mientras se arrastra un bien, y con el puntero ocupado en el arrastre no hay
   * pulsación posible sobre la barra; con tres huecos ya cruzaban la barra en todos los
   * lienzos de móvil, porque su columna nace mucho más adentro que las cartas.
   *
   * Salió rojo de verdad —en los tres lienzos de 490 con la mano abierta, y en el lienzo
   * entero con las cartas quietas— y lo barato fue bajar `ANCHO_MAXIMO` en `barra.ts`: NO
   * mover el naipe, que está donde se pidió, ni bajar el asa de los 44 puntos.
   */
  const MANO_DE_BIENES_ENTERA = Array.from({ length: 14 }, (_, i) => ({
    id: `b${String(i)}`,
    bien: ['limo', 'junco', 'sal', 'piedra', 'grano'][i % 5] as string,
  }));
  type Caja = { x: number; y: number; ancho: number; alto: number };
  const seTocan = (a: Caja, b: Caja): boolean =>
    Math.abs(a.x - b.x) < (a.ancho + b.ancho) / 2 - 1e-9 && Math.abs(a.y - b.y) < (a.alto + b.alto) / 2 - 1e-9;
  const cajaDelUltimoHueco = (cuantos: number, prop: number): Caja | null => {
    const h = huecosDeLaBarra(cuantos, CAMPO, prop)[cuantos - 1];
    return h === undefined ? null : { x: h.x, y: h.y, ancho: h.lado, alto: h.lado };
  };
  const bajoLasQuietas: string[] = [];
  const nuevosBajoElIman: string[] = [];
  const medidasDeLaBaraja: string[] = [];
  for (const [nombre, ancho, alto] of LIENZOS) {
    const prop = ancho / alto;
    const ultimoDeTres = cajaDelUltimoHueco(3, prop);
    const ultimoDeCuatro = cajaDelUltimoHueco(4, prop);
    if (ultimoDeTres === null || ultimoDeCuatro === null) {
      bajoLasQuietas.push(`${nombre}: no hay hueco que medir`);
      continue;
    }
    const quietas: Caja[] = huecosDeLaBaraja(MANO_DE_BIENES_ENTERA, CAMPO, prop, null).map((c) => c.hueco);
    const abiertas: Caja[] = quietas.flatMap((q) =>
      huecosDeLaBaraja(MANO_DE_BIENES_ENTERA, CAMPO, prop, q.y).map((c) => c.hueco),
    );
    const areas: Caja[] = areasDeTrueque(5, CAMPO, prop);
    const pisaQuietas = quietas.some((c) => seTocan(c, ultimoDeCuatro));
    const pisabaAbiertasConTres = abiertas.some((c) => seTocan(c, ultimoDeTres));
    const pisaAbiertasConCuatro = abiertas.some((c) => seTocan(c, ultimoDeCuatro));
    const cruzanLasAreas = areas.some((a) => seTocan(a, ultimoDeCuatro));
    const canto = (cajas: Caja[]): string => Math.min(...cajas.map((c) => c.x - c.ancho / 2)).toFixed(4);
    medidasDeLaBaraja.push(
      `${nombre}: la barra llega a ${(ultimoDeCuatro.x + ultimoDeCuatro.ancho / 2).toFixed(4)}; los bienes quietos empiezan en ${canto(quietas)} y abiertos en ${canto(abiertas)}` +
        (pisabaAbiertasConTres ? ' (con tres ya se pisaban abiertos)' : '') +
        (cruzanLasAreas ? ' (las áreas de trueque cruzan la barra)' : ''),
    );
    if (pisaQuietas) bajoLasQuietas.push(`${nombre}: el hueco del mazo queda debajo de una carta de bienes quieta`);
    if (pisaAbiertasConCuatro && !pisabaAbiertasConTres) nuevosBajoElIman.push(`${nombre}: con tres la barra no pisaba la mano abierta y con cuatro sí`);
  }
  comprobar(
    'el hueco del mazo queda libre de las cartas de bienes QUIETAS —lo que encuentra un toque— en todos los lienzos',
    bajoLasQuietas.length === 0,
    { bajoLasQuietas, medidasDeLaBaraja },
  );
  comprobar(
    'y con la mano abierta por el imán, el cuarto hueco no mete la barra debajo de la baraja en ningún lienzo donde con tres no estaba',
    nuevosBajoElIman.length === 0,
    { nuevosBajoElIman, medidasDeLaBaraja },
  );

  /*
   * ── 3c. LOS DADOS: LOS TRES PELDAÑOS DE `huecosDeLaMesa`, LIENZO A LIENZO ──
   *
   * `huecosDeLaMesa` decide dónde van los dados con una regla de tres peldaños —colgado a
   * la izquierda si cabe; si no, quinto hueco si el asa de cinco llega al suelo; si no,
   * sin dados— y la decisión es «cabe o no cabe, llega a 44 o no», nunca la proporción.
   * Aquí se afirma EN QUÉ LIENZO PASA CADA COSA, porque un comprobador que sólo dijera
   * «hay dados o no» dejaría pasar el fallo que importa: unos dados que caben en el
   * monitor y desaparecen del iPhone sin que nadie sepa por qué. Y se afirma con las
   * mismas exigencias que el hueco del mazo: 44 puntos de asa en TODAS las piezas y en los
   * dados cuando los hay, libre de la mano de bienes quieta, y sin despertar la mano del
   * mazo (el techo de los dados por debajo del piso de su franja).
   *
   * Las medidas escritas son las del diseño (`docs/LA-MESA-DE-RIBERAS.md` §4.4) y se
   * exigen con una décima de margen: si la barra cambia, esto dice cuánto.
   */
  type Peldano = 'colgado' | 'quinto' | null;
  const PELDANO_ESPERADO: Record<string, { forma: Peldano; asa?: number }> = {
    'móvil estrecho, lienzo al mínimo': { forma: null, asa: 47.5 },
    'móvil pequeño': { forma: null, asa: 53.4 },
    'móvil corriente': { forma: 'quinto', asa: 45.8 },
    'móvil de pie, lienzo entero': { forma: 'quinto', asa: 45.8 },
    tableta: { forma: 'quinto', asa: 89.6 },
    'tableta con el navegador de pie': { forma: 'quinto', asa: 90.2 },
    monitor: { forma: 'colgado' },
    'apaisado SE 1ª': { forma: 'colgado', asa: 44.8 },
    'apaisado SE 2ª/3ª': { forma: 'colgado' },
    'apaisado Android de 360': { forma: 'colgado' },
    'apaisado iPhone 14': { forma: 'colgado' },
    'apaisado Pro Max': { forma: 'colgado' },
    'apaisado tableta 4:3': { forma: 'colgado' },
    'apaisado iPad Air': { forma: 'colgado' },
    'apaisado monitor 1080': { forma: 'colgado' },
  };
  const malosDeLaMesa: string[] = [];
  const medidasDeLaMesa: string[] = [];
  const malosDelPar: string[] = [];
  const parEnElAsa: string[] = [];
  const malosDelMazoDeCinco: string[] = [];
  const medidasDelMazoDeCinco: string[] = [];
  for (const [nombre, ancho, alto] of LIENZOS) {
    const prop = ancho / alto;
    const visto = loQueSeVe(CAMPO, prop);
    const enPuntos = (u: number): number => (u / visto.alto) * alto;
    const mesa = huecosDeLaMesa(4, CAMPO, prop, alto);
    const esperado = PELDANO_ESPERADO[nombre];
    const forma: Peldano = mesa.dados === null ? null : mesa.dados.forma;
    const asa = enPuntos(mesa.piezas[0]?.lado ?? 0);
    medidasDeLaMesa.push(`${nombre}: ${forma ?? 'sin dados'}, piezas de ${asa.toFixed(1)} puntos`);
    if (esperado === undefined) {
      malosDeLaMesa.push(`${nombre}: no está en la tabla de peldaños esperados`);
      continue;
    }
    if (forma !== esperado.forma) malosDeLaMesa.push(`${nombre}: se esperaba ${esperado.forma ?? 'sin dados'} y sale ${forma ?? 'sin dados'}`);
    if (esperado.asa !== undefined && Math.abs(asa - esperado.asa) > 0.1) {
      malosDeLaMesa.push(`${nombre}: las piezas miden ${asa.toFixed(1)} y el diseño dice ${String(esperado.asa)}`);
    }
    if (mesa.piezas.length !== 4) malosDeLaMesa.push(`${nombre}: salen ${String(mesa.piezas.length)} piezas en vez de 4`);
    for (const p of mesa.piezas) {
      if (enPuntos(p.lado) < SUELO_DEL_TOQUE - 1e-9) malosDeLaMesa.push(`${nombre}: una pieza baja a ${enPuntos(p.lado).toFixed(1)} puntos`);
    }
    const deCuatro = huecosDeLaBarra(4, CAMPO, prop);
    const deCinco = huecosDeLaBarra(5, CAMPO, prop);
    const iguales = (a: typeof deCuatro, b: typeof deCuatro): boolean =>
      a.length === b.length && a.every((h, i) => Math.abs(h.x - (b[i]?.x ?? NaN)) < 1e-12 && Math.abs(h.lado - (b[i]?.lado ?? NaN)) < 1e-12);
    if (mesa.dados === null || mesa.dados.forma === 'colgado') {
      if (!iguales(mesa.piezas, deCuatro)) malosDeLaMesa.push(`${nombre}: sin quinto hueco las piezas tenían que ser las de siempre, y se han movido`);
    } else if (!iguales(mesa.piezas, deCinco.slice(1))) {
      malosDeLaMesa.push(`${nombre}: como quinto hueco las piezas tenían que ser los otros cuatro del reparto de cinco`);
    }
    const dados = mesa.dados;
    if (dados === null) {
      /* Sin dados porque el quinto no llegaba: que sea verdad, y no un atajo. */
      const quinto = enPuntos(deCinco[0]?.lado ?? 0);
      if (quinto >= SUELO_DEL_TOQUE) malosDeLaMesa.push(`${nombre}: no hay dados y sin embargo el quinto hueco mediría ${quinto.toFixed(1)}`);
      continue;
    }
    if (enPuntos(dados.alto) < SUELO_DEL_TOQUE - 1e-9) malosDeLaMesa.push(`${nombre}: el asa de los dados mide ${enPuntos(dados.alto).toFixed(1)} puntos`);
    const izquierdaDeLosDados = dados.x - dados.ancho / 2;
    const derechaDeLosDados = dados.x + dados.ancho / 2;
    if (izquierdaDeLosDados - -visto.ancho / 2 < 0.5 * dados.lado - 1e-9) {
      malosDeLaMesa.push(`${nombre}: los dados quedan a menos de medio lado del canto izquierdo`);
    }
    const primera = mesa.piezas[0];
    /*
     * Lo que puede pisar la primera pieza es el DADO, no el asa: el asa es invisible y los
     * cubos no reciben rayos, así que un asa estrecha con los dados asomando por fuera
     * pasaría esta medida y los dados se meterían en el zócalo de al lado. Se mide el borde
     * derecho del dado derecho: `dados.x + centroDelDado(1) · lado + ARISTA_DEL_DADO · lado / 2`.
     */
    const bordeDerechoDelDado = dados.x + centroDelDado(1) * dados.lado + (ARISTA_DEL_DADO * dados.lado) / 2;
    const bordeIzquierdoDelDado = dados.x + centroDelDado(0) * dados.lado - (ARISTA_DEL_DADO * dados.lado) / 2;
    if (primera !== undefined && bordeDerechoDelDado > primera.x - primera.lado / 2 - 0.2 * primera.lado + 1e-9) {
      malosDeLaMesa.push(`${nombre}: los dados pisan (o casi) la primera pieza`);
    }
    if (dados.forma === 'colgado' && Math.abs(dados.ancho - 1.6 * dados.lado) > 1e-9) {
      malosDeLaMesa.push(`${nombre}: el asa colgada no mide 1,6 lados`);
    }
    /*
     * El par cabe en el asa —y en el tapete, que mide `dados.ancho` igual— en los DOS
     * peldaños, con el AIRE de la barra hasta la primera pieza. Como quinto hueco el asa mide
     * el par (1,12 lados: la arista subió de 0,46 a 0,52 por el §1.15) y crece hacia la
     * izquierda desde el borde derecho del hueco de un lado: se afirma ese borde con la
     * geometría de `huecosDeLaBarra(5)`, y que a la izquierda sigue sobrando más de medio
     * lado hasta el canto. Con el quinto a un lado los dados asomaban 0,06 lados por cada
     * punta y el derecho quedaba a 0,18 de la primera pieza.
     */
    const asomaPorLaIzquierda = izquierdaDeLosDados - bordeIzquierdoDelDado;
    const asomaPorLaDerecha = bordeDerechoDelDado - derechaDeLosDados;
    const aireHastaLaPrimera = primera === undefined ? NaN : (primera.x - primera.lado / 2 - bordeDerechoDelDado) / dados.lado;
    const bordeDelHuecoDeUnLado = dados.forma === 'quinto' ? (deCinco[0]?.x ?? NaN) + (deCinco[0]?.lado ?? NaN) / 2 : NaN;
    parEnElAsa.push(
      `${nombre}: ${dados.forma}, asa de ${(dados.ancho / dados.lado).toFixed(2)} lados (${enPuntos(dados.ancho).toFixed(1)} pt), par de ${enPuntos(ANCHO_DEL_PAR_DE_DADOS * dados.lado).toFixed(1)} pt, ` +
        `aire hasta la primera pieza ${aireHastaLaPrimera.toFixed(3)} lados (${enPuntos(aireHastaLaPrimera * dados.lado).toFixed(1)} pt), hasta el canto ${((izquierdaDeLosDados - -visto.ancho / 2) / dados.lado).toFixed(3)} lados`,
    );
    if (asomaPorLaIzquierda > 1e-9 || asomaPorLaDerecha > 1e-9) {
      malosDelPar.push(`${nombre}: el par asoma ${enPuntos(Math.max(asomaPorLaIzquierda, asomaPorLaDerecha)).toFixed(1)} pt fuera del asa de ${enPuntos(dados.ancho).toFixed(1)}`);
    }
    if (!(aireHastaLaPrimera >= 0.24 - 1e-9)) malosDelPar.push(`${nombre}: entre el dado derecho y la primera pieza quedan ${aireHastaLaPrimera.toFixed(3)} lados, no el AIRE de 0,24`);
    if (dados.forma === 'quinto') {
      if (Math.abs(dados.ancho - Math.max(dados.lado, ANCHO_DEL_PAR_DE_DADOS * dados.lado)) > 1e-9) malosDelPar.push(`${nombre}: el asa del quinto no mide el par`);
      if (Math.abs(derechaDeLosDados - bordeDelHuecoDeUnLado) > 1e-9) malosDelPar.push(`${nombre}: el asa del quinto no crece hacia la izquierda desde el borde derecho del hueco de un lado`);
    }
    /*
     * Y EL NAIPE DEL MAZO DEL REPARTO DE CINCO. «El hueco del mazo queda libre de las cartas
     * de bienes» (arriba) mide `huecosDeLaBarra(4)`, pero con quinto lo que se pinta es
     * `huecosDeLaBarra(5).slice(1)`, y donde manda el alto (las tabletas) esa barra es más
     * ancha: su borde derecho cae a 0,691 en 768×640 frente a los 0,547 de la de cuatro. Se
     * mide el último hueco de `mesa.piezas` —el mazo— contra las quietas, siempre; y contra
     * las abiertas por el imán, allí donde con cuatro no se pisaban (en 390×845 la mano
     * abierta cruza la barra desde los tres huecos, y el ancho de la barra no lo arregla).
     */
    if (dados.forma === 'quinto') {
      const ultimo = mesa.piezas[mesa.piezas.length - 1];
      const mazoDeCuatro = deCuatro[deCuatro.length - 1];
      if (ultimo === undefined || mazoDeCuatro === undefined) {
        malosDelMazoDeCinco.push(`${nombre}: no hay mazo que medir`);
      } else {
        const cajaDelMazo: Caja = { x: ultimo.x, y: ultimo.y, ancho: ultimo.lado, alto: ultimo.lado };
        const cajaDeCuatro: Caja = { x: mazoDeCuatro.x, y: mazoDeCuatro.y, ancho: mazoDeCuatro.lado, alto: mazoDeCuatro.lado };
        const quietas: Caja[] = huecosDeLaBaraja(MANO_DE_BIENES_ENTERA, CAMPO, prop, null).map((c) => c.hueco);
        const abiertas: Caja[] = quietas.flatMap((q) => huecosDeLaBaraja(MANO_DE_BIENES_ENTERA, CAMPO, prop, q.y).map((c) => c.hueco));
        const margen = Math.min(...quietas.map((c) => c.x - c.ancho / 2)) - (ultimo.x + ultimo.lado / 2);
        medidasDelMazoDeCinco.push(`${nombre}: el mazo de cinco llega a ${(ultimo.x + ultimo.lado / 2).toFixed(4)} (el de cuatro a ${(mazoDeCuatro.x + mazoDeCuatro.lado / 2).toFixed(4)}), ${enPuntos(margen).toFixed(1)} pt antes de los bienes quietos`);
        if (quietas.some((c) => seTocan(c, cajaDelMazo))) malosDelMazoDeCinco.push(`${nombre}: el mazo del reparto de cinco queda debajo de una carta de bienes quieta`);
        if (abiertas.some((c) => seTocan(c, cajaDelMazo)) && !abiertas.some((c) => seTocan(c, cajaDeCuatro))) {
          malosDelMazoDeCinco.push(`${nombre}: con cuatro el mazo no pisaba la mano abierta y con el quinto sí`);
        }
      }
    }
    const cajaDeLosDados: Caja = { x: dados.x, y: dados.y, ancho: dados.ancho, alto: dados.alto };
    if (huecosDeLaBaraja(MANO_DE_BIENES_ENTERA, CAMPO, prop, null).some((c) => seTocan(c.hueco, cajaDeLosDados))) {
      malosDeLaMesa.push(`${nombre}: los dados quedan debajo de una carta de bienes quieta`);
    }
    const franja = franjaDeLasCartas(CAMPO, prop);
    if (dados.y + dados.alto / 2 >= franja.piso - 1e-9) {
      malosDeLaMesa.push(`${nombre}: el techo de los dados (${(dados.y + dados.alto / 2).toFixed(3)}) despierta la mano del mazo (piso ${franja.piso.toFixed(3)})`);
    }
  }
  comprobar(
    'los dados caen en el peldaño que dice el diseño en cada lienzo: colgados en los apaisados y el monitor, quinto hueco de pie en 390 y en las tabletas, y sin dados en 320×360 y 360×490',
    malosDeLaMesa.length === 0,
    { malosDeLaMesa, medidasDeLaMesa },
  );
  comprobar(
    'el par cabe en el asa y en el tapete en los DOS peldaños, con su aire: como quinto el asa mide el par (1,12 lados, 51,3 pt en 390) y crece hacia la izquierda, con 0,24 lados hasta la primera pieza y más de un lado hasta el canto',
    malosDelPar.length === 0 &&
      parEnElAsa.length === LIENZOS.length - 2 &&
      parEnElAsa.filter((m) => m.includes('quinto')).length === 4 &&
      parEnElAsa.some((m) => m.startsWith('móvil corriente: quinto, asa de 1.12 lados (51.3 pt), par de 51.3 pt, aire hasta la primera pieza 0.240 lados (11.0 pt), hasta el canto 1.157 lados')),
    { malosDelPar, parEnElAsa },
  );
  comprobar(
    'y en los cuatro lienzos de quinto el naipe del mazo —el último de huecosDeLaBarra(5)— queda libre de las cartas de bienes quietas, y no pisa la mano abierta donde con cuatro no la pisaba',
    malosDelMazoDeCinco.length === 0 && medidasDelMazoDeCinco.length === 4,
    { malosDelMazoDeCinco, medidasDelMazoDeCinco },
  );
  comprobar(
    'y en los dos lienzos sin dados las piezas no encogen: se quedan en los 47,5 y 53,4 puntos de siempre',
    ['móvil estrecho, lienzo al mínimo', 'móvil pequeño'].every((n) => medidasDeLaMesa.some((m) => m.startsWith(`${n}: sin dados`))),
    medidasDeLaMesa.filter((m) => m.includes('sin dados')),
  );
  /*
   * Con el `cuantos` REAL de la colocación —tres, sin mazo— la misma regla vale, y las
   * piezas siguen siendo las de `huecosDeLaBarra(3)` allí donde los dados cuelgan. Es lo
   * que la escena va a pedir en esa fase aunque `dadosEnTres` no le dé dados que pintar.
   */
  const conTresApaisado = huecosDeLaMesa(3, CAMPO, 844 / 390, 390);
  const tresDeSiempre = huecosDeLaBarra(3, CAMPO, 844 / 390);
  comprobar(
    'con tres huecos en apaisado los dados también cuelgan y las tres piezas son las de siempre',
    conTresApaisado.dados?.forma === 'colgado' &&
      conTresApaisado.piezas.length === 3 &&
      conTresApaisado.piezas.every((h, i) => Math.abs(h.x - (tresDeSiempre[i]?.x ?? NaN)) < 1e-12),
    { dados: conTresApaisado.dados?.forma, piezas: conTresApaisado.piezas.map((h) => Number(h.x.toFixed(4))) },
  );
  comprobar('y con cero huecos no hay mesa: ni piezas ni dados', huecosDeLaMesa(0, CAMPO, 16 / 9, 900).dados === null && huecosDeLaMesa(0, CAMPO, 16 / 9, 900).piezas.length === 0);
  /*
   * La regla es de suelo y no de proporción: el mismo lienzo apaisado con la mitad de
   * puntos de alto se queda sin quinto hueco aunque su forma no haya cambiado. Si alguien
   * la reescribe mirando `proporcion >= 1`, esto se pone rojo.
   */
  comprobar(
    'el segundo peldaño mira los puntos y no la forma: 390×490 con la mitad de puntos ya no tiene dados',
    huecosDeLaMesa(4, CAMPO, 390 / 490, 490).dados?.forma === 'quinto' && huecosDeLaMesa(4, CAMPO, 390 / 490, 245).dados === null,
  );

  /*
   * ── 4. Y EL DIBUJO DEL NAIPE DEL MAZO, QUE SE PIDE POR SU NOMBRE ──
   *
   * `DIBUJO_DEL_MAZO` vive en `barra.ts` para que la escena y los comprobadores pidan el
   * mismo. Si no estuviera compilado no reventaría nada: saldría un naipe de color plano
   * en la barra, que es el fallo silencioso de siempre.
   */
  const delMazo = geometriaDeContornos(CONTORNOS_DE_LA_CARTA[DIBUJO_DEL_MAZO] ?? []);
  comprobar(
    'el dibujo del naipe del mazo existe y da triángulos, como los once de la mano',
    delMazo !== null && cuantosTriangulos(delMazo) >= 8,
    { dibujo: DIBUJO_DEL_MAZO, triangulos: delMazo === null ? 0 : cuantosTriangulos(delMazo) },
  );
  /*
   * ── 5. Y QUE LA BARRA PIDA UN REPARTO SOLO, CON EL MAZO EL ÚLTIMO ──
   *
   * Esto se lee del FUENTE y no del resultado, porque el resultado no lo distingue: los
   * números de arriba salen de `huecosDeLaBarra` y saldrían iguales si quien pinta pidiera
   * tres huecos para las piezas y otro aparte para el naipe. Y esa segunda manera es la
   * que rompe: dos repartos separados dejan el naipe fuera de la aritmética centrada, o
   * sea encima de la tercera pieza en cuanto la pantalla estreche.
   *
   * Se piden dos cosas: que el reparto se pida UNA vez con la suma, y que el hueco del
   * naipe sea el de índice `piezas.length`, o sea el último. Puesto el primero, el naipe
   * caería a la izquierda de la choza, que es lo contrario de lo que se pidió.
   */
  const fuenteDeLaBarra = fs.readFileSync(
    path.join(import.meta.dirname ?? __dirname, '..', 'delta.tsx'),
    'utf8',
  );
  comprobar(
    'la barra pide UN reparto con las piezas y el mazo juntos, no dos pegados',
    /const cuantos = piezas\.length \+ \(mazo === null \? 0 : 1\);/.test(fuenteDeLaBarra) &&
      /huecosDeLaBarra\(cuantos, forma\.campo, forma\.proporcion\)/.test(fuenteDeLaBarra),
  );
  comprobar(
    'y el hueco del naipe es el ÚLTIMO de ese reparto, a la derecha de la vereda',
    /huecos\[piezas\.length\]/.test(fuenteDeLaBarra),
  );

  comprobar(
    'y NO es el de ninguna carta de la mano: un molino en la barra prometería El Molino',
    !['guardia', 'anobueno', 'acaparamiento', 'dosveredas', 'molino', 'cantera', 'torreon', 'faro', 'huerto', 'vado', 'mayorguardia'].includes(
      DIBUJO_DEL_MAZO,
    ),
    DIBUJO_DEL_MAZO,
  );
}

// ---------------------------------------------------------------------------

/**
 * LO QUE SE LEVANTA EN UN VÉRTICE MIRA A DONDE DEBE.
 *
 * ═══ EL ÍNDICE DE LA MALLA NO ES EL LADO DEL PACK ═══
 *
 * Es la trampa recurrente de este árbol, y la cabecera de `ladoHacia` ya avisaba de
 * ella: la malla numera sus seis direcciones y el pack numera sus seis lados, y NO son
 * la misma numeración. Medido, dirección a dirección:
 *
 *     k de la malla   0    1    2    3    4    5
 *     lado del pack   2    1    0    5    4    3
 *
 * Coinciden dos de seis, y ni siquiera con un desfase constante que se pudiera
 * absorber: es un espejo. El castillo de la fortaleza se giraba con `puerta * 60°`,
 * o sea usando el índice de la malla como si fuera un ángulo, así que en cuatro de cada
 * seis ciudades miraba a un sitio sin relación con su propia puerta.
 *
 * Se comprueba sobre la SALIDA y no sobre la fórmula: se busca la pieza de la puerta
 * entre las de la muralla y se exige que el castillo lleve el ángulo de donde esa
 * puerta está. Así la comprobación sigue valiendo si mañana cambia la cuenta.
 */
paso('El castillo de una ciudad mira a su propia puerta');
{
  const SEIS = Math.PI / 3;
  const anguloDelPack = (p: Punto): number =>
    ((Math.round(Math.atan2(-p.y, p.x) / SEIS) + 6) % 6) * SEIS;

  const malOrientados: string[] = [];
  const puertas = new Set<number>();
  let ciudades = 0;
  for (const hex of mallaDeRadio(2)) {
    for (const vertice of verticesDeHex(hex)) {
      const piezas = piezasDeAsentamiento('ciudad', 'blue', vertice);
      const puerta = piezas.find((x) => x.modelo === MODELO.muroEsquinaPuerta);
      const castillo = piezas.find((x) => x.modelo === modeloDePieza('ciudad', 'blue'));
      if (puerta === undefined || castillo === undefined) {
        malOrientados.push(`${vertice}: falta la puerta o el castillo`);
        continue;
      }
      ciudades++;
      const debido = anguloDelPack(puerta.donde);
      puertas.add(Math.round(debido / SEIS));
      if (Math.abs(castillo.giro - debido) > 1e-9) {
        malOrientados.push(
          `${vertice}: castillo a ${(castillo.giro / SEIS).toFixed(2)} y puerta a ${(debido / SEIS).toFixed(2)}`,
        );
      }
    }
  }
  comprobar(
    'el castillo lleva el ángulo del lado por donde está su puerta',
    malOrientados.length === 0,
    { ciudades, mal: malOrientados.slice(0, 4) },
  );
  comprobar(
    'y la puerta no cae siempre en el mismo lado',
    puertas.size >= 5,
    [...puertas].sort((x, y) => x - y),
  );
}

// ---------------------------------------------------------------------------

paso('Lo que hay en el agua sigue las reglas del agua');
{
  const TERRENOS = [
    'bosque', 'bosque', 'bosque', 'bosque', 'pradera', 'pradera', 'pradera', 'pradera',
    'campo', 'campo', 'campo', 'campo', 'colina', 'colina', 'colina',
    'montana', 'montana', 'montana', 'desierto',
  ];
  const islas = mallaDeRadio(2).map((hex, i) => ({
    hex,
    terreno: TERRENOS[i % TERRENOS.length] ?? 'pradera',
  }));

  const SEMILLAS = 20;
  const muelleEnTierra: string[] = [];
  const muelleEnCuesta: string[] = [];
  const barcoEnTierra: string[] = [];
  const mataFuera: string[] = [];
  const mataSeca: string[] = [];
  let matas = 0;
  let nenufares = 0;
  const cuentaDeMuelles = new Set<number>();
  const cuentaDeBarcos = new Set<number>();

  for (let semilla = 0; semilla < SEMILLAS; semilla++) {
    const teselas = crearRelieve(islas, semilla).todas();
    const marina = laMarinaDelMundo(teselas, semilla);
    cuentaDeMuelles.add(marina.muelles.length);
    cuentaDeBarcos.add(marina.barcos.length);

    /* El índice del mundo, para preguntarle si un punto cae en tierra. */
    const suelo = new Map<string, (typeof teselas)[number]>();
    for (const t of teselas) suelo.set(`${String(t.sub.q)},${String(t.sub.r)}`, t);

    const enQueCelda = (p: { x: number; y: number }): string => {
      const q = ((Math.sqrt(3) / 3) * p.x - (1 / 3) * p.y) / RADIO_DE_TESELA;
      const r = ((2 / 3) * p.y) / RADIO_DE_TESELA;
      const s2 = -q - r;
      let rq = Math.round(q);
      let rr = Math.round(r);
      const rs = Math.round(s2);
      if (Math.abs(rq - q) > Math.abs(rr - r) && Math.abs(rq - q) > Math.abs(rs - s2)) {
        rq = -rr - rs;
      } else if (Math.abs(rr - r) > Math.abs(rs - s2)) {
        rr = -rq - rs;
      }
      return `${String(rq)},${String(rr)}`;
    };

    /* 1. Un muelle se apoya FUERA del mundo, y su tierra de al lado está a nivel cero. */
    for (const m of marina.muelles) {
      const celda = enQueCelda(m.punto);
      if (suelo.has(celda)) muelleEnTierra.push(`s${String(semilla)} ${celda}`);
      let aRas = false;
      const [cq, cr] = celda.split(',').map(Number);
      for (let k = 0; k < 6; k++) {
        const v = vecino({ q: cq ?? 0, r: cr ?? 0 }, k);
        const t = suelo.get(`${String(v.q)},${String(v.r)}`);
        if (t !== undefined && t.nivel === 0) aRas = true;
      }
      if (!aRas) muelleEnCuesta.push(`s${String(semilla)} ${celda}`);
    }

    /* 2. Un barco flota, y no encima de un cabo. */
    for (const b of marina.barcos) {
      if (suelo.has(enQueCelda(b.punto))) barcoEnTierra.push(`s${String(semilla)} ${enQueCelda(b.punto)}`);
    }

    /* 3. Una mata crece dentro de su propia celda de agua ancha, no en la de al lado. */
    for (const m of marina.matas) {
      matas++;
      if (m.nenufar) nenufares++;
      const t = suelo.get(enQueCelda(m.punto));
      if (t === undefined) mataFuera.push(`s${String(semilla)}`);
      else if (t.agua !== CUERPO) mataSeca.push(`s${String(semilla)} agua=${String(t.agua)}`);
    }
  }

  comprobar('ningún muelle se apoya en tierra firme', muelleEnTierra.length === 0, muelleEnTierra.slice(0, 4));
  comprobar('y todos salen de una orilla a nivel del mar', muelleEnCuesta.length === 0, muelleEnCuesta.slice(0, 4));
  comprobar('ningún barco navega por encima de un cabo', barcoEnTierra.length === 0, barcoEnTierra.slice(0, 4));
  comprobar('cada junco crece dentro de la celda de agua que lo trajo', mataFuera.length === 0, mataFuera.slice(0, 4));
  comprobar('y ninguno crece en agua que no sea ancha', mataSeca.length === 0, mataSeca.slice(0, 4));
  /*
   * EL TOPE DEL NENÚFAR. El sorteo es `< 0,45` y sólo entra en juego si la celda es
   * remanso, así que la proporción tiene que quedar POR DEBAJO de 45 y no en 45: si
   * alguna vez sale por encima, es que dos decisiones han vuelto a compartir canal.
   */
  comprobar(
    'los nenúfares no pasan del tope de su sorteo — dos decisiones, dos canales',
    matas === 0 || nenufares / matas < 0.45,
    { matas, nenufares, parte: matas === 0 ? 0 : Number((nenufares / matas).toFixed(3)) },
  );
  comprobar('no todos los tableros tienen los mismos muelles', cuentaDeMuelles.size >= 3, [...cuentaDeMuelles]);
  comprobar('ni los mismos barcos', cuentaDeBarcos.size >= 3, [...cuentaDeBarcos]);

  /*
   * Y QUE NO SE REPITAN LOS SITIOS, que es distinto de que no se repita el número.
   *
   * Éste es el comprobador que faltaba. La marina pasaba las seis comprobaciones de
   * arriba —los muelles en su sitio, los barcos flotando, el número variando de 1 a 6 y
   * de 2 a 9— y aun así era la MISMA FLOTA en todos los tableros: de los catorce
   * canales de sorteo, la semilla entraba sólo en los dos que deciden cuántos hay.
   * Medido entonces: 206 barcos puestos en 12 sitios distintos, y uno de ellos con
   * barco en 40 de 40 tableros.
   *
   * No se ve mirando un tablero. No se ve ni mirando dos. Se ve contando cuarenta, y
   * por eso esto es una comprobación y no una nota.
   *
   * El umbral no es «todos distintos» porque no tiene por qué serlo: dos tableros
   * pueden coincidir en un sitio por casualidad. Se exige que NINGÚN sitio se repita en
   * más de una cuarta parte de los tableros, que es holgadísimo para un sorteo sano y
   * imposible para una plantilla.
   */
  const sitiosDeBarco = new Map<string, number>();
  const sitiosDeMata = new Map<string, number>();
  for (let semilla = 0; semilla < SEMILLAS; semilla++) {
    const marina = laMarinaDelMundo(crearRelieve(islas, semilla).todas(), semilla);
    for (const b of marina.barcos) {
      const k = `${b.punto.x.toFixed(1)},${b.punto.y.toFixed(1)}`;
      sitiosDeBarco.set(k, (sitiosDeBarco.get(k) ?? 0) + 1);
    }
    for (const m of marina.matas) {
      const k = `${m.punto.x.toFixed(1)},${m.punto.y.toFixed(1)}`;
      sitiosDeMata.set(k, (sitiosDeMata.get(k) ?? 0) + 1);
    }
  }
  const TOPE = Math.ceil(SEMILLAS / 4);
  const barcoTerco = [...sitiosDeBarco].filter(([, veces]) => veces > TOPE);
  comprobar(
    'ningún barco fondea en el mismo punto en más de un cuarto de los tableros',
    barcoTerco.length === 0,
    { tope: TOPE, sitios: sitiosDeBarco.size, tercos: barcoTerco.slice(0, 4) },
  );
  const mataTerca = [...sitiosDeMata].filter(([, veces]) => veces > TOPE);
  comprobar(
    'ni ningún junco crece siempre en la misma celda',
    mataTerca.length === 0,
    { tope: TOPE, sitios: sitiosDeMata.size, tercas: mataTerca.slice(0, 4) },
  );

  /*
   * Y AL REVÉS: que siga siendo REPRODUCIBLE. Variar por tablero y dar siempre lo
   * mismo para la misma semilla son las dos mitades de la misma exigencia, y arreglar
   * la primera rompiendo la segunda es muy fácil.
   */
  const unaVez = JSON.stringify(laMarinaDelMundo(crearRelieve(islas, 7).todas(), 7));
  const otraVez = JSON.stringify(laMarinaDelMundo(crearRelieve(islas, 7).todas(), 7));
  comprobar('y la misma semilla sigue dando la misma marina', unaVez === otraVez);
}

paso('La camara se mira quieta, se gira arrastrando y no se cuela por ningun lado');
{
  const ALCANCE = 100;

  /*
   * LA VISTA DE SALIDA ES LA MISMA QUE HABIA.
   *
   * La camara estaba escrita como dos distancias —1,35 de lado, 1,15 de alto— y ahora
   * esta escrita como un angulo. Es la misma vista, y esto lo dice: si algun dia alguien
   * toca el angulo de salida creyendo que ajusta un detalle, aqui se entera de que ha
   * movido el encuadre con el que se ha decidido toda la escala del mundo.
   */
  const salida = ojoDelMirador(MIRADOR_DE_SALIDA, ALCANCE);
  comprobar(
    'la vista de salida es exactamente la de antes: 1,35 de lado y 1,15 de alto',
    Math.abs(Math.hypot(salida[0], salida[2]) - ALCANCE * 1.35) < 1e-9 &&
      Math.abs(salida[1] - ALCANCE * 1.15) < 1e-9,
    salida.map((v) => Number(v.toFixed(4))),
  );

  /*
   * INCLINAR ES INCLINAR, NO ACERCARSE.
   *
   * Es la razon entera de que el mirador sea un angulo y no dos distancias. Con dos
   * distancias, subir la camara la alejaba del centro y el tablero se encogia: en pantalla
   * eso no se lee como inclinar la vista sino como un zoom que nadie ha pedido.
   */
  const alturas = [ALTURA_MINIMA, ALTURA_DE_SALIDA, (ALTURA_MINIMA + ALTURA_MAXIMA) / 2, ALTURA_MAXIMA];
  const lejos = alturas.map((altura) => {
    const [x, y, z] = ojoDelMirador({ rumbo: 1.1, altura }, ALCANCE);
    return Math.hypot(x, y, z);
  });
  comprobar(
    'inclinar la vista no acerca ni aleja: la distancia al centro no cambia',
    lejos.every((d) => Math.abs(d - lejos[0]!) < 1e-9),
    lejos.map((d) => Number(d.toFixed(6))),
  );

  /*
   * NI BAJO EL SUELO NI POR EL POLO, por mucho que se tire.
   *
   * Se tira cien pantallas enteras hacia cada lado, que es mas de lo que nadie hara. Por
   * abajo, el ojo tiene que seguir por encima del suelo; por arriba, tiene que quedarse
   * CORTO del polo: justo en el polo el ojo mira en la direccion de su propio «arriba» y
   * `lookAt` no tiene con que orientar la imagen, asi que pega un giro brusco al cruzarlo.
   */
  const PANTALLA = { ancho: 1600, alto: 900 };
  let abajo = MIRADOR_DE_SALIDA;
  let arriba = MIRADOR_DE_SALIDA;
  for (let i = 0; i < 100; i++) {
    abajo = tirandoDelMirador(abajo, 0, -PANTALLA.alto, PANTALLA);
    arriba = tirandoDelMirador(arriba, 0, PANTALLA.alto, PANTALLA);
  }
  const ojoAbajo = ojoDelMirador(abajo, ALCANCE);
  comprobar(
    'por mucho que se tire, la camara no se mete bajo el suelo ni cruza el polo',
    ojoAbajo[1] > 0 &&
      abajo.altura >= ALTURA_MINIMA - 1e-12 &&
      arriba.altura <= ALTURA_MAXIMA + 1e-12 &&
      ALTURA_MAXIMA < Math.PI / 2,
    {
      abajo: Number(((abajo.altura * 180) / Math.PI).toFixed(1)),
      arriba: Number(((arriba.altura * 180) / Math.PI).toFixed(1)),
    },
  );

  /*
   * EL SENTIDO: SE AGARRA EL MUNDO, NO LA CAMARA.
   *
   * Arrastrar a la derecha lleva el tablero a la derecha, asi que el OJO se va a la
   * izquierda. Es el gesto de girar un plano encima de la mesa. Con el signo al reves se
   * siente roto y nadie sabe decir por que, asi que el signo se escribe aqui y no se
   * discute mas.
   */
  const derecha = tirandoDelMirador(MIRADOR_DE_SALIDA, 200, 0, PANTALLA);
  comprobar(
    'arrastrar a la derecha lleva el tablero a la derecha, o sea el ojo a la izquierda',
    derecha.rumbo < MIRADOR_DE_SALIDA.rumbo,
    { antes: MIRADOR_DE_SALIDA.rumbo, despues: Number(derecha.rumbo.toFixed(4)) },
  );

  /*
   * UN ARRASTRE Y SU CONTRARIO DEVUELVEN AL MISMO SITIO.
   *
   * Sin esto, el temblor de la mano —que va y viene— arrastraria la camara poco a poco
   * hacia un lado, y al cabo de un rato el tablero estaria girado sin que nadie lo haya
   * girado. Se prueba a media altura, lejos de los topes: contra un tope no vuelve, y eso
   * esta bien, porque un tope es justamente lo que no deja seguir.
   */
  const medio = { rumbo: 0.6, altura: (ALTURA_MINIMA + ALTURA_MAXIMA) / 2 };
  const ida = tirandoDelMirador(medio, 137, 61, PANTALLA);
  const vuelta = tirandoDelMirador(ida, -137, -61, PANTALLA);
  comprobar(
    'un arrastre y el mismo al reves dejan la camara donde estaba',
    Math.abs(vuelta.rumbo - medio.rumbo) < 1e-12 && Math.abs(vuelta.altura - medio.altura) < 1e-12,
    { rumbo: vuelta.rumbo - medio.rumbo, altura: vuelta.altura - medio.altura },
  );

  /*
   * Y EL GESTO VALE LO MISMO EN CUALQUIER PANTALLA.
   *
   * Si el giro fuese por pixel, cruzar la pantalla con el dedo daria media vuelta en un
   * monitor y un cuarto en un movil: el mismo juego se sentiria distinto en cada sitio.
   * Cruzarla de lado a lado tiene que ser siempre lo mismo.
   */
  const MONITOR = { ancho: 2560, alto: 1440 };
  const MOVIL = { ancho: 390, alto: 844 };
  const enMonitor = tirandoDelMirador(medio, MONITOR.ancho / 2, 0, MONITOR).rumbo;
  const enMovil = tirandoDelMirador(medio, MOVIL.ancho / 2, 0, MOVIL).rumbo;
  comprobar(
    'media pantalla de arrastre gira lo mismo en un monitor que en un movil',
    Math.abs(enMonitor - enMovil) < 1e-12,
    { monitor: Number(enMonitor.toFixed(6)), movil: Number(enMovil.toFixed(6)) },
  );

  /*
   * Y HAY ZONA MUERTA, que es lo que separa «he hecho clic» de «estoy girando».
   *
   * Ademas de evitar que un clic mueva el mundo un pelo, es lo que cierra el hueco de un
   * fotograma entre coger una carta y que la camara se entere: hasta que el puntero no se
   * ha ido de ahi, no hay giro.
   */
  comprobar(
    'hay zona muerta antes de empezar a girar, y es de varios pixeles',
    MINIMO_PARA_GIRAR >= 3 && MINIMO_PARA_GIRAR <= 12,
    { pixeles: MINIMO_PARA_GIRAR },
  );

  /*
   * EL TABLERO CABE EN UN MOVIL DE PIE, que es donde se va a jugar de verdad.
   *
   * El campo de vision que declara una camara es el VERTICAL; el horizontal sale de
   * multiplicarlo por la proporcion. En apaisado sobra ancho y no hay nada que hacer, y por
   * eso esto no se noto antes: el banco es apaisado. En retrato el que se queda corto es el
   * ancho, y sin alejarse el tablero se sale por los lados — en un movil de 9:19,5, mas del
   * doble de lo que cabe.
   *
   * Se comprueba lo que importa: que en apaisado NO cambie nada (o esto habria movido la
   * camara del escritorio de rebote) y que en retrato el ancho visible siga dando para el
   * tablero entero.
   */
  const CAMPO_VERTICAL = (45 * Math.PI) / 180;
  const RADIO = 100;
  const anchoQueSeVe = (proporcion: number): number => {
    const [x, y, z] = ojoDelMirador(MIRADOR_DE_SALIDA, RADIO, proporcion);
    const lejos = Math.hypot(x, y, z);
    return 2 * lejos * Math.tan(CAMPO_VERTICAL / 2) * proporcion;
  };
  comprobar(
    'en la pantalla de referencia y en las mas anchas, la camara no se mueve',
    Math.abs(alejarseParaQueQuepa(16 / 9) - 1) < 1e-12 &&
      Math.abs(alejarseParaQueQuepa(21 / 9) - 1) < 1e-12,
    { referencia: alejarseParaQueQuepa(16 / 9), ultrapanoramica: alejarseParaQueQuepa(21 / 9) },
  );
  comprobar(
    'y toda pantalla mas estrecha ve el MISMO ancho de mundo que un monitor',
    [1, 4 / 3, 3 / 4, 9 / 16, 9 / 19.5].every(
      (pr) => Math.abs(anchoQueSeVe(pr) - anchoQueSeVe(16 / 9)) < 1e-9,
    ),
    [1, 4 / 3, 9 / 19.5].map((pr) => Number(anchoQueSeVe(pr).toFixed(2))),
  );
  comprobar(
    'y en un movil de pie el tablero entero sigue cabiendo de ancho',
    anchoQueSeVe(9 / 19.5) > 2 * RADIO,
    {
      cabe: Number(anchoQueSeVe(9 / 19.5).toFixed(1)),
      hacenFalta: 2 * RADIO,
      sinCorregir: Number((anchoQueSeVe(9 / 19.5) * (9 / 19.5)).toFixed(1)),
    },
  );

  /*
   * LA MARCA DE «ESTO SE LO QUEDA LA INTERFAZ» ES POR SUCESO, NO UN BANDERIN.
   *
   * Se comprueban las tres cosas de golpe porque son la misma: que por defecto el gesto es
   * de la camara —si no, el tablero dejaria de girar del todo—, que marcar uno lo marca, y
   * sobre todo que marcar uno NO marca el siguiente.
   *
   * Ese ultimo es el que importa. Con un banderin compartido, marcarlo al coger una carta
   * y olvidarse de bajarlo deja el tablero clavado para siempre, y el sintoma —«ya no gira,
   * pero antes giraba»— aparece mucho despues de la carta que lo causo. Con la marca puesta
   * en el propio suceso no hay nada que bajar: cuando el navegador tira el suceso, se va.
   */
  const primero = {};
  const segundo = {};
  loCogeLaInterfaz(primero);
  comprobar(
    'la marca de la interfaz va en cada suceso y no se queda puesta para el siguiente',
    !esDeLaInterfaz(segundo) && esDeLaInterfaz(primero) && !esDeLaInterfaz({}),
  );
}

paso('Un puente cubre su arista, salva lo que tiene debajo y encaja con el camino');
{
  const CUESTA = 0.14;
  const llano = (): number => 12;
  const cuesta = (q: { x: number; y: number }): number => 12 + q.x * CUESTA;
  const cerro = (q: { x: number; y: number }): number => {
    /* Un cerro en mitad del vano: lo que la primera version atravesaba por dentro. */
    const t = q.x / RADIO_DE_COMARCA;
    return 12 + Math.max(0, 1 - Math.abs(t - 0.5) * 6) * ESCALON * 2;
  };

  const A = { x: 0, y: 0 };
  const B = { x: RADIO_DE_COMARCA, y: 0 };

  /*
   * CUBRE LA ARISTA ENTERA Y SIN DEFORMAR NADA.
   *
   * Las dos mitades importan y son distintas. Que cubra: un puente que se queda corto deja
   * un vacio justo donde uno pisa. Y que no deforme: la alternativa —estirar los tramos
   * hasta que cuadren— daba un 9% de mas en cada barandilla, medido, y una barandilla
   * estirada se nota porque el ojo conoce su forma.
   */
  const p = puenteEntre(A, B, llano);
  const primero = p.tramos[0];
  const ultimo = p.tramos[p.tramos.length - 1];
  /*
   * Se mide la SOMBRA del tramo, no su largo. Un tramo en cuesta es mas largo que el trozo
   * de arista que cubre, y compararlo con la arista da un desajuste que parece un hueco y
   * no lo es: la primera version de esta comprobacion fallo por eso, con ocho milesimas de
   * sobra que eran exactamente la cuesta de los dos tramos de punta.
   */
  const sombra = (t: (typeof p.tramos)[number]): number => t.largo * Math.cos(t.inclinacion);
  comprobar(
    'el puente empieza en un vertice y acaba en el otro, sin dejar hueco',
    primero !== undefined &&
      ultimo !== undefined &&
      Math.abs(primero.x - sombra(primero) / 2) < 1e-9 &&
      Math.abs(ultimo.x + sombra(ultimo) / 2 - RADIO_DE_COMARCA) < 1e-9,
    {
      empieza: primero === undefined ? null : primero.x - sombra(primero) / 2,
      acaba: ultimo === undefined ? null : ultimo.x + sombra(ultimo) / 2,
      arista: RADIO_DE_COMARCA,
    },
  );
  /*
   * NINGUN TRAMO SE ESTIRA MAS DE LO QUE SU CUESTA EXIGE, y esto es lo que se queria
   * comprobar de verdad.
   *
   * La primera version pedia largo EXACTO en llano, y fallo — enseñando algo que no se
   * habia pensado: en llano la calzada tampoco es plana. Se arquea, porque el aire que se
   * le exige sobre el suelo (media persona) es mayor que lo que sobresale un camino, asi
   * que las juntas de en medio suben y las puntas se quedan clavadas al camino. Es un
   * puente arqueado, que es lo que es un puente.
   *
   * Lo que NO puede pasar es que un tramo se estire por otra razon. Su largo tiene que ser
   * exactamente el del modelo dividido por el coseno de su cuesta: ni un milimetro mas.
   */
  comprobar(
    'ningun tramo se estira mas de lo que su propia cuesta exige',
    p.tramos.every(
      (t) => Math.abs(t.largo - LARGO_DEL_TRAMO / Math.cos(t.inclinacion)) < 1e-9,
    ),
    p.tramos.map((t) => Number((t.largo / LARGO_DEL_TRAMO).toFixed(4))),
  );
  /*
   * Y EN LLANO EL ARCO ES SUAVE. Cinco grados de tope, y el numero tiene sentido:
   *
   * en llano el arco sube 0,72 unidades —un cuarto de persona— y toda esa subida se hace en
   * el primer tramo, que sale a 3,2 grados. Eso es una rampa de carretera, se sube andando
   * sin pensarlo y en pantalla se lee como un puente arqueado. El tope esta puesto para que
   * salte si alguien sube el aire bajo la calzada sin darse cuenta de que lo que sube con
   * el es la cuesta de las puntas.
   */
  comprobar(
    'y en llano el arco es suave, no una rampa',
    p.tramos.every((t) => Math.abs(t.inclinacion) < (5 * Math.PI) / 180),
    p.tramos.map((t) => Number(((t.inclinacion * 180) / Math.PI).toFixed(2))),
  );
  comprobar(
    'y hay un estandarte en cada junta: uno menos que tramos',
    p.tramos.length >= 2 && p.estandartes.length === p.tramos.length - 1,
    { tramos: p.tramos.length, estandartes: p.estandartes.length },
  );

  /*
   * NO SE ENTIERRA EN UN CERRO, que es el fallo que se vio en pantalla: NINGUN puente
   * aparecia, y al medirlo la calzada recta quedaba bajo tierra en el 23% de las aristas,
   * hasta ocho personas y media de hondo.
   *
   * Se mide la calzada de VERDAD —cada tramo, punto a punto y con su cuesta— y no la recta
   * entre las puntas: medir la recta fue justo lo que dejo pasar el fallo la primera vez.
   * Los tramos de PUNTA se excluyen a proposito y esta escrito por que: sus extremos estan
   * clavados a la altura del camino para que el puente encaje a la entrada y a la salida, y
   * donde el terreno sube a pico contra el vertice eso no es un puente sino una ladera.
   */
  const hundeElMedio = (suelo: (q: { x: number; y: number }) => number): number => {
    const puente = puenteEntre(A, B, suelo);
    let peor = 0;
    puente.tramos.forEach((t, i) => {
      if (i === 0 || i === puente.tramos.length - 1) return;
      for (let k = 0; k <= 8; k++) {
        const u = (k / 8 - 0.5) * t.largo * Math.cos(t.inclinacion);
        const y = t.y + Math.tan(t.inclinacion) * u;
        peor = Math.max(peor, suelo({ x: t.x + Math.cos(t.giro) * u, y: t.z }) - y);
      }
    });
    return peor;
  };
  comprobar(
    'con un cerro en medio, ningun tramo de en medio queda bajo tierra',
    hundeElMedio(cerro) <= 0,
    { hundido: Number(hundeElMedio(cerro).toFixed(3)) },
  );
  /* Y el cerro tiene que ser de verdad, o lo de arriba pasa por no haber nada que salvar. */
  comprobar(
    'y el cerro de la prueba levanta de verdad el terreno, o no se estaba probando nada',
    cerro({ x: RADIO_DE_COMARCA / 2, y: 0 }) - cerro({ x: 0, y: 0 }) > ESCALON,
    Number((cerro({ x: RADIO_DE_COMARCA / 2, y: 0 }) - cerro({ x: 0, y: 0 })).toFixed(2)),
  );

  /*
   * LAS PUNTAS ENCAJAN CON EL CAMINO, que es lo que se pidio con «que encajen tanto en
   * entrada como en salida».
   *
   * La cota de la punta se compara con la superficie del camino sobre el suelo de ESE
   * vertice. Escrita a mano en los dos sitios coincidiria hoy y dejaria de coincidir el dia
   * que alguien suba el camino un pelo, sin que nadie relacione una cosa con la otra.
   */
  const enCuesta = puenteEntre(A, B, cuesta);
  comprobar(
    'las dos puntas de la calzada caen a la altura de la superficie del camino',
    Math.abs(enCuesta.cotas[0] - (cuesta(A) + SUPERFICIE_DEL_CAMINO)) < 1e-9 &&
      Math.abs(enCuesta.cotas[1] - (cuesta(B) + SUPERFICIE_DEL_CAMINO)) < 1e-9,
    enCuesta.cotas.map((c) => Number(c.toFixed(4))),
  );

  /*
   * Y DOS PUENTES QUE COMPARTEN VERTICE SE ENCUENTRAN, sin hablarse.
   *
   * Es lo que hace que una cadena de puentes sea una cadena y no una fila de trozos con
   * escalones. Sale gratis de que la cota de la punta dependa SOLO del suelo de su vertice:
   * si dependiera del terreno de en medio, dos puentes que llegan al mismo sitio desde
   * lados distintos llegarian a alturas distintas.
   */
  const C = { x: RADIO_DE_COMARCA * 2, y: RADIO_DE_COMARCA * 0.5 };
  const otro = puenteEntre(B, C, cuesta);
  comprobar(
    'dos puentes que comparten un vertice llegan a el a la misma altura',
    Math.abs(enCuesta.cotas[1] - otro.cotas[0]) < 1e-9,
    { uno: enCuesta.cotas[1], otro: otro.cotas[0] },
  );

  /*
   * LA OBRA SE LEVANTA POR ORDEN Y LLEGA AL FINAL.
   *
   * Que llegue al final no es obvio: con un redondeo mal puesto, un puente se queda para
   * siempre a falta del ultimo tramo y nadie lo nota hasta que alguien mira de cerca.
   */
  const cuantos = p.tramos.length;
  const crece = [0, 0.25, 0.5, 0.75, 1].map((a) => puenteEntre(A, B, llano, a).tramos.length);
  comprobar(
    'la obra empieza vacia, crece sin saltar hacia atras y acaba entera',
    crece[0] === 0 &&
      crece[crece.length - 1] === cuantos &&
      crece.every((n, i) => i === 0 || n >= (crece[i - 1] as number)),
    crece,
  );
  comprobar(
    'y los tramos que ya estan puestos no se mueven al aparecer el siguiente',
    (() => {
      const mitad = puenteEntre(A, B, llano, 0.5);
      return mitad.tramos.every((t, i) => {
        const suyo = p.tramos[i];
        return suyo !== undefined && Math.abs(t.x - suyo.x) < 1e-9 && Math.abs(t.y - suyo.y) < 1e-9;
      });
    })(),
  );

  /*
   * Y LA MEDIDA DEL MODELO ES LA QUE HAY DENTRO DEL FICHERO — AHORA SI.
   *
   * `CAJA_DEL_PUENTE` decide cuantos tramos caben en una arista. Si un dia entra otro
   * modelo de puente con otro tamano, todo el reparto se hace con la medida del anterior y
   * el puente sale con huecos o solapado, sin un error en ninguna consola.
   *
   * ═══ LA PRIMERA VERSION DE ESTA COMPROBACION NO PODIA FALLAR ═══
   *
   * Comparaba `CAJA_DEL_PUENTE` contra los mismos tres numeros escritos a mano — 1,924,
   * 1,333 y 1,25 — o sea la constante contra si misma. Y su comentario decia «esto lo ata
   * al binario compilado, que es el unico sitio donde esa medida es un hecho», que era
   * literalmente falso: no abria el fichero. Se escribio el mismo dia que se cazo otra
   * tautologia doce lineas mas arriba en este guion, lo cual dice bastante de lo facil que
   * es escribir una.
   *
   * ═══ Y NO HACE FALTA DECODIFICAR EL BINARIO PARA ATARLO ═══
   *
   * glTF obliga a que el accesor de POSITION lleve sus cotas `min` y `max` en el JSON, asi
   * que la caja de una malla se lee sin tocar un solo byte del bloque binario. Es la misma
   * cabecera que este guion ya abre para mirar los nombres de los nodos.
   */
  {
    /* Se vuelve a abrir el fichero aqui: el bloque que lo lee mas arriba no llega hasta aca. */
    const glb = path.join(import.meta.dirname ?? __dirname, '..', 'modelos', 'tablero.glb');
    const crudo = fs.readFileSync(glb);
    const json = JSON.parse(
      crudo.subarray(20, 20 + crudo.readUInt32LE(12)).toString('utf8'),
    ) as {
      nodes?: Array<{ name?: string; mesh?: number; scale?: number[]; children?: number[] }>;
      meshes?: Array<{ primitives?: Array<{ attributes?: Record<string, number> }> }>;
      accessors?: Array<{ min?: number[]; max?: number[] }>;
    };
    /*
     * SE RECORRE EL SUBARBOL, y esto tambien costo una vuelta: el nodo `puente` NO lleva la
     * malla encima. El compilador mete cada pieza como un nodo con nuestro nombre y le
     * cuelga debajo lo que traia el pack, asi que mirar solo el nodo raiz da CERO
     * primitivas — que es lo que dijo esta comprobacion la primera vez que de verdad abrio
     * el fichero.
     *
     * La escala se acumula al bajar: una malla puede venir escalada en cualquier nivel, y
     * mirar solo la del nodo de arriba daria una caja del tamaño equivocado sin avisar.
     */
    const cotas: Array<{ min: number[]; max: number[]; escala: number[] }> = [];
    const bajar = (iNodo: number, escala: number[]): void => {
      const nodo = (json.nodes ?? [])[iNodo];
      if (nodo === undefined) return;
      const suya = nodo.scale ?? [1, 1, 1];
      const acumulada = [0, 1, 2].map((k) => (escala[k] ?? 1) * (suya[k] ?? 1));
      const malla = nodo.mesh === undefined ? undefined : (json.meshes ?? [])[nodo.mesh];
      for (const prim of malla?.primitives ?? []) {
        const iAcc = prim.attributes?.['POSITION'];
        const acc = iAcc === undefined ? undefined : (json.accessors ?? [])[iAcc];
        if (acc?.min !== undefined && acc.max !== undefined) {
          cotas.push({ min: acc.min, max: acc.max, escala: acumulada });
        }
      }
      for (const hijo of nodo.children ?? []) bajar(hijo, acumulada);
    };
    const iPuente = (json.nodes ?? []).findIndex((n) => n.name === 'puente');
    if (iPuente >= 0) bajar(iPuente, [1, 1, 1]);

    const caja = (eje: number): number => {
      if (cotas.length === 0) return NaN;
      const lo = Math.min(...cotas.map((c) => (c.min[eje] as number) * (c.escala[eje] as number)));
      const hi = Math.max(...cotas.map((c) => (c.max[eje] as number) * (c.escala[eje] as number)));
      return hi - lo;
    };
    const medida = { ancho: caja(0), alto: caja(1), largo: caja(2) };
    comprobar(
      'la caja del puente que usa el reparto es la que de verdad trae el .glb',
      cotas.length > 0 &&
        Math.abs(medida.ancho - CAJA_DEL_PUENTE.ancho) < 0.002 &&
        Math.abs(medida.alto - CAJA_DEL_PUENTE.alto) < 0.002 &&
        Math.abs(medida.largo - CAJA_DEL_PUENTE.largo) < 0.002,
      { enElFichero: medida, enElCodigo: CAJA_DEL_PUENTE, primitivas: cotas.length },
    );
  }
}

// ---------------------------------------------------------------------------
// ACERCARSE AL TABLERO Y MOVERSE POR ÉL
//
// Todo lo de `acercar.ts` son números y topes, y los topes son justamente lo que se
// rompe sin que nadie lo vea: un acercamiento sin límite mete la cámara dentro de una
// colina, y una mirada sin límite deja a alguien mirando el mar sin saber volver.
// ---------------------------------------------------------------------------
{
  const PANTALLA = { ancho: 1000, alto: 600 };
  const ALCANCE = 200;

  comprobar('se empieza mirando el tablero entero, desde su centro', estaComoAlPrincipio(CERCANIA_DE_SALIDA));

  /* Acercar y alejar. */
  const unPaso = acercando(CERCANIA_DE_SALIDA, 1);
  comprobar('un paso acerca', unPaso.factor < 1);
  comprobar(
    'y el paso es multiplicativo: dos pasos son el cuadrado de uno',
    Math.abs(acercando(CERCANIA_DE_SALIDA, 2).factor - unPaso.factor * unPaso.factor) < 1e-9,
  );
  comprobar('acercar y alejar el mismo paso vuelve al sitio', Math.abs(acercando(unPaso, -1).factor - 1) < 1e-9);
  comprobar(
    'por mucho que se insista, no se pasa del tope de cerca',
    acercando(CERCANIA_DE_SALIDA, 100).factor === MAS_CERCA,
  );
  comprobar('ni del de lejos', acercando(CERCANIA_DE_SALIDA, -100).factor === MAS_LEJOS);
  comprobar(
    'y desde muy cerca se ve media comarca, que es lo que se pedía',
    ALCANCE * MAS_CERCA > 25 && ALCANCE * MAS_CERCA < 40,
    ALCANCE * MAS_CERCA,
  );
  comprobar('un pellizco que abre acerca, y uno que cierra aleja', pellizcando(CERCANIA_DE_SALIDA, 1, 2).factor < 1 && pellizcando(CERCANIA_DE_SALIDA, 0.5, 0.5).factor === 1);
  comprobar('una escala imposible no mueve nada', pellizcando(CERCANIA_DE_SALIDA, 1, 0) === CERCANIA_DE_SALIDA && pellizcando(CERCANIA_DE_SALIDA, 1, Number.NaN) === CERCANIA_DE_SALIDA);
  comprobar('acercar cero pasos tampoco', acercando(CERCANIA_DE_SALIDA, 0) === CERCANIA_DE_SALIDA);
  comprobar('y un factor imposible cae en el tablero entero', factorValido(Number.NaN) === 1 && factorValido(Number.POSITIVE_INFINITY) === 1);

  /* Mover la mirada: se arrastra el mundo, no la cámara. */
  const cerca = acercando(CERCANIA_DE_SALIDA, 6);
  const aLaDerecha = arrastrandoLaMirada(cerca, 200, 0, 0, ALCANCE, PANTALLA);
  comprobar('arrastrar a la derecha lleva la mirada a la izquierda: se mueve el mundo', aLaDerecha.centro.x < 0, aLaDerecha.centro);
  comprobar('y no toca lo cerca que se está', aLaDerecha.factor === cerca.factor);
  const haciaAbajo = arrastrandoLaMirada(cerca, 0, 200, 0, ALCANCE, PANTALLA);
  comprobar('arrastrar hacia abajo trae lo que estaba al fondo', haciaAbajo.centro.z < 0, haciaAbajo.centro);

  /*
   * GIRADO UN CUARTO DE VUELTA, «a la derecha» ya no es el eje X del mundo. Sin esto,
   * arrastrar movería el mapa en diagonal en cuanto se hubiera girado un poco.
   */
  const girado = arrastrandoLaMirada(cerca, 200, 0, Math.PI / 2, ALCANCE, PANTALLA);
  comprobar(
    'con el tablero girado, el arrastre sigue los ejes de la pantalla y no los del mundo',
    Math.abs(girado.centro.z) > Math.abs(girado.centro.x),
    girado.centro,
  );

  /* Lo que se recorre depende de lo cerca que se esté. */
  const deLejos = arrastrandoLaMirada(CERCANIA_DE_SALIDA, 200, 0, 0, ALCANCE, PANTALLA);
  comprobar(
    'de lejos, el mismo gesto recorre más mundo que de cerca',
    Math.abs(deLejos.centro.x) > Math.abs(aLaDerecha.centro.x),
    { deLejos: deLejos.centro.x, deCerca: aLaDerecha.centro.x },
  );

  /* El tope: no se sale del tablero. */
  let lejisimos = cerca;
  for (let i = 0; i < 40; i++) lejisimos = arrastrandoLaMirada(lejisimos, 400, 0, 0, ALCANCE, PANTALLA);
  comprobar(
    'por mucho que se arrastre, la mirada no se sale del tablero',
    Math.hypot(lejisimos.centro.x, lejisimos.centro.z) <= ALCANCE * APARTE_MAXIMO + 1e-9,
    lejisimos.centro,
  );
  comprobar('y se queda en el borde en vez de rebotar', Math.abs(Math.hypot(lejisimos.centro.x, lejisimos.centro.z) - ALCANCE) < 1e-6);
  comprobar('volver al principio deja el tablero entero y centrado', estaComoAlPrincipio(comoAlPrincipio()));

  /* Dónde acaban el ojo y el punto de mira. */
  const alrededor = (d: number): readonly [number, number, number] => [0, d * 0.2, d];
  const puesto = ojoYMira(CERCANIA_DE_SALIDA, ALCANCE, alrededor);
  comprobar('sin acercarse, se mira al centro del delta', puesto.mira[0] === 0 && puesto.mira[2] === 0);
  comprobar('y el ojo está donde lo pone el mirador', puesto.ojo[2] === ALCANCE);
  const enUnaEsquina = ojoYMira({ factor: 0.2, centro: { x: 100, z: -50 } }, ALCANCE, alrededor);
  comprobar('acercarse a una esquina mueve el ojo Y el punto al que mira', enUnaEsquina.mira[0] === 100 && enUnaEsquina.mira[2] === -50);
  comprobar(
    'el ojo va sobre esa esquina, a la distancia acercada',
    Math.abs(enUnaEsquina.ojo[0] - 100) < 1e-9 && Math.abs(enUnaEsquina.ojo[2] - (-50 + ALCANCE * 0.2)) < 1e-9,
    enUnaEsquina.ojo,
  );
  const rasante = ojoYMira({ factor: MAS_CERCA, centro: { x: 0, z: 0 } }, ALCANCE, (d) => [0, d * 0.001, d]);
  comprobar(
    'y por muy cerca y muy raso que se mire, el ojo no se mete dentro del mundo',
    rasante.ojo[1] >= ALTURA_MINIMA_DEL_OJO,
    rasante.ojo,
  );
}

// ---------------------------------------------------------------------------
// EL DIBUJO DE UNA CARTA CAE DONDE SE VE
//
// Las dos manos asoman por el canto: la mayor parte de cada carta está FUERA de la
// pantalla, y su centro también. El dibujo se colocaba a un cuarto de ancho del centro
// HACIA FUERA, o sea más lejos todavía del borde: medido en las tres proporciones,
// caía fuera de la pantalla en las seis manos. Se pintaba, costaba sus triángulos, y
// no lo veía nadie — y lo que se veía de la carta era su margen vacío.
//
// Esto se mide, no se mira: en un lienzo estrecho la diferencia es de milímetros y en
// pantalla parece que el dibujo «está un poco a un lado».
// ---------------------------------------------------------------------------
{
  const CAMPO_DE_PRUEBA = (45 * Math.PI) / 180;
  const MANO_DE_BIENES = [
    { id: 'b1', bien: 'junco' },
    { id: 'b2', bien: 'junco' },
    { id: 'b3', bien: 'limo' },
    { id: 'b4', bien: 'sal' },
  ] as const;
  const UNA_DEL_MAZO = [
    { id: 'c1', familia: 'guardia', dibujo: 'guardia', nombre: 'La Guardia', sePuedeJugar: true, sePuedeRevelar: false, explicacion: SIN_EXPLICAR },
  ] as const;

  for (const [comoSeLlama, proporcion] of [
    ['un monitor', 16 / 9],
    ['la columna de la Sala', 625 / 418],
    ['un móvil de pie', 9 / 19.5],
  ] as const) {
    const { ancho } = loQueSeVeEnLaBaraja(CAMPO_DE_PRUEBA, proporcion);

    /* La mano de bienes vive pegada al borde DERECHO. */
    {
      const puestas = huecosDeLaBaraja(MANO_DE_BIENES as never, CAMPO_DE_PRUEBA, proporcion, null);
      for (const { hueco } of puestas) {
        const dibujo = hueco.x + hueco.ancho * hueco.dibujo;
        const bordeDeLaCarta = hueco.x - hueco.ancho / 2;
        comprobar(
          `el dibujo de un bien cae dentro de la pantalla en ${comoSeLlama}`,
          dibujo < ancho / 2 && dibujo > bordeDeLaCarta,
          { dibujo, borde: ancho / 2 },
        );
        comprobar(
          `y en el medio de lo que asoma de la carta, en ${comoSeLlama}`,
          Math.abs(dibujo - (bordeDeLaCarta + ancho / 2) / 2) < hueco.ancho * 0.02,
          { dibujo, medioDeLoQueSeVe: (bordeDeLaCarta + ancho / 2) / 2 },
        );
      }
    }

    /* Y la del mazo, pegada al borde IZQUIERDO. */
    const familias = manoDelMazoPorFamilias(UNA_DEL_MAZO as never);
    for (const { hueco } of huecosDeLasCartas(familias, CAMPO_DE_PRUEBA, proporcion, null)) {
      const dibujo = hueco.x + hueco.ancho * hueco.dibujo;
      const bordeDeLaCarta = hueco.x + hueco.ancho / 2;
      comprobar(
        `el dibujo de una carta del mazo cae dentro de la pantalla en ${comoSeLlama}`,
        dibujo > -ancho / 2 && dibujo < bordeDeLaCarta,
        { dibujo, borde: -ancho / 2 },
      );
      comprobar(
        `y en el medio de lo que asoma, en ${comoSeLlama}`,
        Math.abs(dibujo - (bordeDeLaCarta + -ancho / 2) / 2) < hueco.ancho * 0.02,
        { dibujo, medioDeLoQueSeVe: (bordeDeLaCarta - ancho / 2) / 2 },
      );
    }
  }

  /* Y lo que NO asoma por ningún canto lleva su dibujo en el medio, sin desplazar. */
  for (const hueco of areasDeTrueque(2, CAMPO_DE_PRUEBA, 16 / 9)) {
    comprobar('un área de trueque lleva su dibujo centrado', hueco.dibujo === 0);
  }
}
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

/**
 * LOS DADOS Y LA MESA DE MADERA: lo que se puede afirmar antes de pintar nada.
 *
 * ═══ QUÉ SE COMPRA ═══
 *
 * Tres cosas de `docs/LA-MESA-DE-RIBERAS.md` que un ojo no puede juzgar y un guion sí:
 *
 *   1. EL REPARTO de la suma en dos caras es determinista, suma lo que debe, no saca
 *      ninguna cara de 1..6, y su sello es el TURNO: estable dentro del turno, distinto
 *      cada turno, igual tras recargar. Si alguien lo sellara con `rev` el par cambiaría
 *      al pasar una carta; con el asiento, cada colono vería siempre el mismo par.
 *   2. LA MÁQUINA de la animación espera al servidor, termina en SU número, rueda al
 *      menos 0,6 s aunque la respuesta llegue antes, se asienta en 0,35 s, y un rechazo
 *      la corta en el acto en vez de dejarla seis segundos esperando una tirada que no
 *      va a llegar. Se recorre con series de sucesos y un reloj inyectado.
 *   3. LA VETA está en [0, 1] —es lo que `mezcla` necesita—, los dos colores se leen del
 *      atlas del pack y siguen siendo la madera medida, y su contraste es 1,6:1. Y la
 *      mesa entera tiene tope de triángulos, como el mar.
 */
paso('Los dados se reparten por turno, ruedan hasta que el servidor contesta, y la mesa tiene veta y tope');
{
  /* ── 1. EL REPARTO ── */
  const semilla = semillaDelCodigo('QWXYZ');
  const malosDelReparto: string[] = [];
  for (let suma = 2; suma <= 12; suma++) {
    for (let sello = 0; sello < 200; sello++) {
      const [a, b] = repartoDeLaTirada(suma, sello, semilla);
      if (a + b !== suma) malosDelReparto.push(`${String(suma)}/${String(sello)}: ${String(a)}+${String(b)}`);
      if (a < 1 || a > 6 || b < 1 || b > 6) malosDelReparto.push(`${String(suma)}/${String(sello)}: una cara fuera de 1..6`);
    }
  }
  comprobar('cada par suma lo que debe y ninguna cara sale de 1..6, para las once sumas y doscientos turnos', malosDelReparto.length === 0, malosDelReparto.slice(0, 4));
  comprobar('el 7 tiene seis pares y el 2 y el 12 uno; el 0 de antes de la primera tirada no tiene ninguno y sale 1 y 1', paresDeLaSuma(7).length === 6 && paresDeLaSuma(2).length === 1 && paresDeLaSuma(12).length === 1 && paresDeLaSuma(0).length === 0 && repartoDeLaTirada(0, 3, semilla).join('+') === '1+1');
  comprobar(
    'el mismo (suma, sello, semilla) da el mismo par en dos llamadas: no hay azar en el aparato',
    repartoDeLaTirada(9, 17, semilla).join('+') === repartoDeLaTirada(9, 17, semilla).join('+'),
  );
  /*
   * El sello es el turno, y el turno no cambia con `rev`: aquí no entra `rev` en la firma,
   * así que lo que se afirma es la tabla del diseño con vistas de verdad: turno 5 tirado
   * y turno 6 sin tirar enseñan la MISMA tirada con el MISMO sello (5), y turno 6 tirado
   * es otro sello (6). La función que lo calcula vive en `shared/` y aquí se reproduce su
   * definición de una línea para no arrastrar Riberas a la escena.
   */
  /* Contra la funcion de VERDAD de shared, no contra una copia escrita aqui: una lambda gemela
     no puede caer por ningun cambio del codigo y solo suma al recuento. */
  comprobar(
    'el sello del turno 5 tirado y el del turno 6 sin tirar son el mismo: se enseña la tirada del 5',
    selloDeLaTirada(5, true) === selloDeLaTirada(6, false) && selloDeLaTirada(5, true) === 5,
    { tirado5: selloDeLaTirada(5, true), sinTirar6: selloDeLaTirada(6, false) },
  );
  comprobar(
    'y el del turno 6 tirado es otro: cambia el sello, cambia el par',
    selloDeLaTirada(6, true) === 6 && selloDeLaTirada(6, true) !== selloDeLaTirada(6, false),
  );
  /* Mil turnos: los seis pares del 7 salen todos, y ninguno acapara. */
  const cuenta = new Map<string, number>();
  for (let turno = 1; turno <= 1000; turno++) {
    const k = repartoDeLaTirada(7, turno, semilla).join('+');
    cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
  }
  comprobar(
    'en mil turnos el 7 saca sus seis pares, cada uno más de cien veces: dados que no están trucados a la vista',
    cuenta.size === 6 && [...cuenta.values()].every((n) => n > 100),
    Object.fromEntries(cuenta),
  );
  comprobar(
    'y otra mesa (otra semilla) no reparte igual: el par depende del código de la mesa',
    Array.from({ length: 50 }, (_, t) => repartoDeLaTirada(7, t, semillaDelCodigo('ABCDE')).join('+')).join(' ') !==
      Array.from({ length: 50 }, (_, t) => repartoDeLaTirada(7, t, semilla).join('+')).join(' '),
  );

  /* ── 2. LA MÁQUINA ── */
  const vista = (tirado: boolean, ultimaTirada: number, sello: number): SucesoDeLosDados => ({ que: 'vista', vista: { tirado, ultimaTirada, sello } });
  const TOCADO: SucesoDeLosDados = { que: 'tocado' };
  const TIC: SucesoDeLosDados = { que: 'tic' };
  const RECHAZADO: SucesoDeLosDados = { que: 'rechazado' };
  /* Una serie de (instante, suceso) desde el reposo, con una vista previa ya vista. */
  const recorre = (serie: Array<[number, SucesoDeLosDados]>, desde?: EstadoDeLosDados): EstadoDeLosDados =>
    serie.reduce((e, [t, s]) => faseDeLosDados(e, s, t), desde ?? faseDeLosDados(dadosEnReposo(semilla), vista(false, 7, 4), 0));
  const enReposoConLaVieja = recorre([]);
  const parViejo = repartoDeLaTirada(7, 4, semilla);
  const parNuevo = repartoDeLaTirada(9, 5, semilla);
  comprobar('la primera vista se enseña en reposo, sin animar: es noticia vieja', enReposoConLaVieja.fase.fase === 'quieta' && parQueSeEnsena(enReposoConLaVieja.fase).join('+') === parViejo.join('+'));
  /* El caso que de verdad importa —recargar a mitad de turno, con la tirada ya HECHA— es el que
     la de arriba no recorre: alli «tirado» es falso y la maquina no anima por eso, no porque
     sea la primera vista. Aqui la primera vista trae «tirado» y tiene que salir quieta igual. */
  const recargada = faseDeLosDados(dadosEnReposo(semilla), vista(true, 9, 5), 0);
  comprobar(
    'recargar a mitad de turno, con la tirada hecha, enseña ese par en reposo: tampoco se anima',
    recargada.fase.fase === 'quieta' && parQueSeEnsena(recargada.fase).join('+') === parNuevo.join('+'),
    { fase: recargada.fase.fase, par: parQueSeEnsena(recargada.fase) },
  );
  comprobar('tocar en reposo arranca a rodar SIN objetivo: el cliente no sortea nada', (() => { const e = recorre([[0, TOCADO]]); return e.fase.fase === 'rodando' && e.fase.objetivo === null && e.fase.desde === 0; })());
  comprobar('un segundo toque mientras rueda no hace nada', JSON.stringify(recorre([[0, TOCADO], [0.1, TOCADO]])) === JSON.stringify(recorre([[0, TOCADO]])));

  /*
   * LA TABLA DE LLEGADAS: la vista con la tirada llega a los 0,2 / 0,6 / 1,4 / 3,0 s y
   * los dados se asientan a los 0,95 / 0,95 / 1,75 / 3,35 s. Se recorre con tics cada
   * 0,05 s y se mira en qué instante pasa cada fase.
   */
  const asentamientos: string[] = [];
  for (const [llegaEn, quietaEn] of [[0.2, 0.95], [0.6, 0.95], [1.4, 1.75], [3.0, 3.35]] as const) {
    let e = recorre([[0, TOCADO]]);
    let empiezaAAsentar: number | null = null;
    let seQueda: number | null = null;
    for (let paso = 1; paso <= 100; paso++) {
      const t = Number((paso * 0.05).toFixed(2));
      if (Math.abs(t - llegaEn) < 1e-9) e = faseDeLosDados(e, vista(true, 9, 5), t);
      e = faseDeLosDados(e, TIC, t);
      if (empiezaAAsentar === null && e.fase.fase === 'asentando') empiezaAAsentar = e.fase.desde;
      if (seQueda === null && e.fase.fase === 'quieta') seQueda = t;
    }
    const parFinal = parQueSeEnsena(e.fase).join('+');
    const bien =
      empiezaAAsentar !== null &&
      Math.abs(empiezaAAsentar - Math.max(RODAR_MINIMO, llegaEn)) < 1e-9 &&
      seQueda !== null &&
      Math.abs(seQueda - quietaEn) < 0.05 + 1e-9 &&
      parFinal === parNuevo.join('+');
    asentamientos.push(`llega a ${llegaEn.toFixed(1)} → asienta desde ${String(empiezaAAsentar)} y queda quieta a ${String(seQueda)} en ${parFinal}${bien ? '' : ' ✗'}`);
    if (!bien) asentamientos.push('✗');
  }
  comprobar(
    'la vista que llega a 0,2 / 0,6 / 1,4 / 3,0 s asienta desde 0,6 / 0,6 / 1,4 / 3,0 y deja los dados quietos a 0,95 / 0,95 / 1,75 / 3,35, en el par del servidor',
    !asentamientos.includes('✗') && Math.abs(RODAR_MINIMO - 0.6) < 1e-9 && Math.abs(ASENTAR - 0.35) < 1e-9,
    asentamientos,
  );
  comprobar(
    'un rechazo mientras rueda sin objetivo devuelve los dados al par anterior EN EL ACTO',
    (() => { const e = recorre([[0, TOCADO], [0.3, RECHAZADO]]); return e.fase.fase === 'quieta' && parQueSeEnsena(e.fase).join('+') === parViejo.join('+'); })(),
  );
  comprobar(
    'pero un rechazo cuando ya hay objetivo no hace nada: la tirada llegó (de otro, o de mi otra pestaña) y se asienta en ella',
    (() => { const e = recorre([[0, TOCADO], [0.2, vista(true, 9, 5)], [0.3, RECHAZADO]]); return e.fase.fase === 'rodando' && e.fase.objetivo !== null; })(),
  );
  comprobar(
    'y un rechazo en reposo tampoco',
    JSON.stringify(recorre([[0, RECHAZADO]])) === JSON.stringify(enReposoConLaVieja),
  );
  comprobar(
    'sin respuesta ninguna, los dados se rinden a los seis segundos y no antes: a 5,9 ruedan, a 6,0 vuelven al par anterior',
    (() => {
      const a = recorre([[0, TOCADO], [5.9, TIC]]);
      const b = recorre([[0, TOCADO], [6.0, TIC]]);
      return a.fase.fase === 'rodando' && b.fase.fase === 'quieta' && parQueSeEnsena(b.fase).join('+') === parViejo.join('+') && Math.abs(TOPE_SIN_RESPUESTA - 6) < 1e-9;
    })(),
  );
  comprobar(
    'la tirada de OTRO arranca la animación desde el reposo: rueda 0,6 y se asienta 0,35 en su par',
    (() => {
      const rodando = recorre([[10, vista(true, 9, 5)]]);
      const asentando = faseDeLosDados(rodando, TIC, 10.6);
      const quieta = faseDeLosDados(asentando, TIC, 10.95);
      /* Y lo que el pintor de la fase 3 va a leer: rodando CON objetivo enseña ya el par al que va;
         un toque sin respuesta enseña el de antes. Sin esto, «parQueSeEnsena» podria devolver el
         par viejo en esa rama y nada se pondria rojo hasta verlo en pantalla. */
      const soloTocado = recorre([[0, TOCADO]]);
      return rodando.fase.fase === 'rodando' && rodando.fase.objetivo !== null &&
        parQueSeEnsena(rodando.fase).join('+') === parNuevo.join('+') &&
        parQueSeEnsena(soloTocado.fase).join('+') === parViejo.join('+') &&
        asentando.fase.fase === 'asentando' && quieta.fase.fase === 'quieta' && parQueSeEnsena(quieta.fase).join('+') === parNuevo.join('+');
    })(),
  );
  comprobar(
    'la misma vista dos veces (el sondeo) no arranca nada: el sello no cambia dentro del turno',
    JSON.stringify(recorre([[1, vista(true, 9, 5)], [1.6, TIC], [2, TIC], [3, vista(true, 9, 5)]]).fase) === JSON.stringify(recorre([[1, vista(true, 9, 5)], [1.6, TIC], [2, TIC]]).fase),
  );
  comprobar(
    'abrirse el turno siguiente sin tirar (mismo sello, tirado a falso) tampoco mueve los dados',
    (() => { const e = recorre([[1, vista(true, 9, 5)], [1.6, TIC], [2, TIC], [3, vista(false, 9, 5)]]); return e.fase.fase === 'quieta' && parQueSeEnsena(e.fase).join('+') === parNuevo.join('+'); })(),
  );
  comprobar(
    'y una tirada que se perdió entre sondeos (cambia el sello con tirado a falso) se enseña en reposo, sin animar',
    (() => { const e = recorre([[3, vista(false, 11, 6)]]); return e.fase.fase === 'quieta' && parQueSeEnsena(e.fase).join('+') === repartoDeLaTirada(11, 6, semilla).join('+'); })(),
  );
  comprobar(
    'dos movimientos entre dos vueltas del sondeo (cambia el sello con tirado a verdadero) sí son tirada nueva',
    (() => { const e = recorre([[1, vista(true, 9, 5)], [1.6, TIC], [2, TIC], [20, vista(true, 9, 6)]]); return e.fase.fase === 'rodando'; })(),
  );
  comprobar('la transición no toca el estado que recibe', (() => { const antes = recorre([[0, TOCADO]]); const copia = JSON.stringify(antes); faseDeLosDados(antes, vista(true, 9, 5), 0.2); faseDeLosDados(antes, TIC, 7); return JSON.stringify(antes) === copia; })());

  /* ── 3. LA VETA Y LOS COLORES ── */
  const fueraDeRango: string[] = [];
  const rangos: string[] = [];
  for (const segmentos of [64, 96, 240]) {
    const v = vetaDelTablon(segmentos, 6);
    if (v.length !== (segmentos + 1) * 7) fueraDeRango.push(`${String(segmentos)}: ${String(v.length)} valores`);
    let min = 1;
    let max = 0;
    for (const x of v) {
      if (!(x >= 0 && x <= 1)) fueraDeRango.push(`${String(segmentos)}: ${String(x)}`);
      min = Math.min(min, x);
      max = Math.max(max, x);
    }
    rangos.push(`${String(segmentos)}: [${min.toFixed(3)}, ${max.toFixed(3)}]`);
    if (max - min < 0.4) fueraDeRango.push(`${String(segmentos)}: la veta sólo recorre ${(max - min).toFixed(3)}, no se vería`);
  }
  comprobar('la veta está en [0, 1] con 64, 96 y 240 segmentos, un valor por vértice, y recorre al menos cuatro décimas', fueraDeRango.length === 0, { fueraDeRango: fueraDeRango.slice(0, 4), rangos });
  const conNoventaYSeis = vetaDelTablon(96, 6);
  const fila = (j: number): number[] => Array.from(conNoventaYSeis.subarray(j * 97, (j + 1) * 97));
  comprobar(
    'los tres tablones no repiten la misma veta: las filas centrales de cada uno son distintas',
    TABLONES === 3 && fila(1).join() !== fila(3).join() && fila(3).join() !== fila(5).join(),
  );
  const { oscura, clara } = coloresDeLaMadera();
  const hex = (c: readonly [number, number, number]): string => `#${c.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  comprobar(
    'los dos colores de la madera se leen del atlas del pack y siguen siendo los medidos sobre las piezas de madera: #94533f y #b97756',
    hex(oscura) === '#94533f' && hex(clara) === '#b97756',
    { oscura: hex(oscura), clara: hex(clara), celdas: { oscura: MADERA_OSCURA_EN_EL_ATLAS, clara: MADERA_CLARA_EN_EL_ATLAS } },
  );
  comprobar(
    'y su contraste es 1,6:1, a cinco centésimas: madera que se lee como madera sin competir con las piezas',
    Math.abs(contraste(clara, oscura) - 1.6) <= 0.05,
    { contraste: Number(contraste(clara, oscura).toFixed(3)) },
  );

  /* ── 4. EL TOPE ── */
  comprobar(
    'los dos dados cuestan el MÁXIMO del respaldo (444) y del D6 del pack (1.324): sumar sólo uno de los dos pondría rojo lo que se construye o dejaría el tope sin vigilar lo que se pinta',
    TRIANGULOS_DEL_RESPALDO_DE_LOS_DADOS === 2 * (12 + 21 * SEGMENTOS_DEL_PUNTO) &&
      TRIANGULOS_DE_LOS_DADOS_DEL_PACK === 2 * 662 &&
      TRIANGULOS_DE_LOS_DADOS === Math.max(TRIANGULOS_DEL_RESPALDO_DE_LOS_DADOS, TRIANGULOS_DE_LOS_DADOS_DEL_PACK) &&
      TRIANGULOS_DE_LOS_DADOS === 1324,
    { respaldo: TRIANGULOS_DEL_RESPALDO_DE_LOS_DADOS, pack: TRIANGULOS_DE_LOS_DADOS_DEL_PACK, suma: TRIANGULOS_DE_LOS_DADOS },
  );
  comprobar('la mesa cuesta 12 · segmentos + 1.470: 2.622 con 96 y 4.350 con 240', triangulosDeLaMesa(96) === 2622 && triangulosDeLaMesa(240) === 4350 && triangulosDeLaMesa(64) === 12 * 64 + 1470);
  comprobar(
    'los segmentos siguen al ancho en puntos, uno cada ocho, acotados entre 64 y 240',
    segmentosDeLaMesa(568) === 71 && segmentosDeLaMesa(1920) === 240 && segmentosDeLaMesa(100) === 64 && segmentosDeLaMesa(8000) === SEGMENTOS_DE_LA_MESA.maximo,
  );
  /* El tope subió de 3.600 a 4.500 con el D6 del pack; sigue por debajo de la quinta parte del mar. */
  comprobar(
    'y con el máximo de segmentos la mesa no se pasa de su tope (4.500, rehecho con la cuenta del pack), que a su vez es menos de la quinta parte del mar',
    triangulosDeLaMesa(SEGMENTOS_DE_LA_MESA.maximo) <= TOPE_DE_LA_MESA && TOPE_DE_LA_MESA === 4_500 && TOPE_DE_LA_MESA < TRIANGULOS_DEL_MAR / 5,
    { mesa: triangulosDeLaMesa(SEGMENTOS_DE_LA_MESA.maximo), TOPE_DE_LA_MESA, mar: TRIANGULOS_DEL_MAR },
  );

  /* ── 5. LAS MEDIDAS DEL DADO: el par cabe en el asa, el salto queda bajo su techo ── */
  const anchoDelPar = 2 * ARISTA_DEL_DADO + HUECO_ENTRE_DADOS;
  comprobar(
    'el par de dados mide 1,12 lados (2 · 0,52 + 0,08) y deja 0,24 lados de aire a cada lado del asa de 1,6: exactamente el AIRE de la barra',
    Math.abs(ARISTA_DEL_DADO - 0.52) < 1e-12 &&
      Math.abs(anchoDelPar - 1.12) < 1e-12 &&
      Math.abs((ANCHO_DEL_ASA_DE_LOS_DADOS - anchoDelPar) / 2 - 0.24) < 1e-12 &&
      Math.abs(centroDelDado(1) - centroDelDado(0) - (ARISTA_DEL_DADO + HUECO_ENTRE_DADOS)) < 1e-12 &&
      centroDelDado(0) + centroDelDado(1) === 0,
    { par: anchoDelPar, aire: (ANCHO_DEL_ASA_DE_LOS_DADOS - anchoDelPar) / 2 },
  );
  /* Del centro del hueco hacia abajo: la tapa a −0,48; el centro del cubo a −0,22; la cara de arriba en lo alto del salto a +0,24. */
  const tapaDesdeElHueco = -(ZOCALO.centro + ZOCALO.alto / 2);
  const techoEnElSalto = tapaDesdeElHueco + CENTRO_DEL_DADO_SOBRE_LA_TAPA + SALTO_DEL_DADO + ARISTA_DEL_DADO / 2;
  comprobar(
    'apoyado, el centro del cubo queda a media arista sobre la tapa (0,22 lados bajo el centro del hueco) y en lo alto del salto la cara de arriba llega a +0,24 lados, bajo el techo del asa (+0,5)',
    Math.abs(CENTRO_DEL_DADO_SOBRE_LA_TAPA - ARISTA_DEL_DADO / 2) < 1e-12 &&
      Math.abs(tapaDesdeElHueco + CENTRO_DEL_DADO_SOBRE_LA_TAPA - -0.22) < 1e-12 &&
      Math.abs(techoEnElSalto - 0.24) < 1e-12 &&
      techoEnElSalto < 0.5,
    { centro: tapaDesdeElHueco + CENTRO_DEL_DADO_SOBRE_LA_TAPA, techo: techoEnElSalto },
  );
  comprobar(
    'la sombra de cada dado asoma por sus cuatro lados (radio > media arista) y las dos apenas se tocan (radio < la distancia entre centros)',
    RADIO_DE_LA_SOMBRA_DEL_DADO > ARISTA_DEL_DADO / 2 && RADIO_DE_LA_SOMBRA_DEL_DADO < ARISTA_DEL_DADO + HUECO_ENTRE_DADOS,
    { radio: RADIO_DE_LA_SOMBRA_DEL_DADO },
  );

  /* ── 6. LAS CURVAS: la vibración, el salto, el giro, el asentado y el rebote ── */
  const HZ = 60;
  let activos = 0;
  let maximaSacudida = 0;
  for (let k = 0; k < HZ * 16; k++) {
    const v = Math.abs(sacudida(k / HZ));
    maximaSacudida = Math.max(maximaSacudida, v);
    if (v > 0.01) activos++;
  }
  const parteActiva = activos / (HZ * 16);
  comprobar(
    'la vibración es el patrón medido: periodo 1,6 s, sacudida de 0,36 s a 8 Hz, los dados se mueven entre el 18 % y el 24 % del tiempo, nunca más de la amplitud 1, y 3 % del lado y 4° de amplitud',
    SACUDIDA.periodo === 1.6 && SACUDIDA.dura === 0.36 && SACUDIDA.hercios === 8 &&
      parteActiva >= 0.18 && parteActiva <= 0.24 && maximaSacudida <= 1 + 1e-9 && maximaSacudida > 0.8 &&
      Math.abs(sacudida(0.5)) < 1e-12 && Math.abs(sacudida(1.6 + 0.1) - sacudida(0.1)) < 1e-9 &&
      SACUDIDA.traslacion === 0.03 && Math.abs(SACUDIDA.giro - (4 * Math.PI) / 180) < 1e-12,
    { parteActiva: Number(parteActiva.toFixed(3)), maximaSacudida: Number(maximaSacudida.toFixed(3)) },
  );
  const alturas = Array.from({ length: 61 }, (_, k) => saltoDelDado((k / 60) * RODAR_MINIMO));
  comprobar(
    'el salto de «rodando» arranca del suelo, llega a 0,2 lados a mitad del rodar mínimo, vuelve al suelo al cumplirse y no vuelve a saltar aunque el servidor tarde',
    saltoDelDado(0) === 0 && Math.abs(saltoDelDado(RODAR_MINIMO / 2) - SALTO_DEL_DADO) < 1e-12 && saltoDelDado(RODAR_MINIMO) === 0 && saltoDelDado(RODAR_MINIMO * 3) === 0 &&
      alturas.every((h) => h >= 0 && h <= SALTO_DEL_DADO + 1e-12) && SALTO_DEL_DADO === 0.2,
  );
  const angulos = [0.1, 0.3, 0.6, 1, 3, 6].map((t) => anguloRodado(t));
  comprobar(
    'el giro de «rodando» crece siempre y cada vez más despacio (velocidad decreciente): más de media vuelta a los 0,6 s y menos de tres vueltas a los 6 s del tope',
    anguloRodado(0) === 0 &&
      angulos.every((a, k) => k === 0 || a > (angulos[k - 1] ?? Infinity)) &&
      anguloRodado(0.6) - anguloRodado(0.3) < anguloRodado(0.3) - anguloRodado(0) &&
      anguloRodado(0.6) > Math.PI && anguloRodado(6) < 6 * Math.PI,
    { a06: Number(anguloRodado(0.6).toFixed(2)), a6: Number(anguloRodado(6).toFixed(2)) },
  );
  const avances = Array.from({ length: 36 }, (_, k) => avanceDelAsentado((k / 35) * ASENTAR));
  comprobar(
    'el asentado va de 0 a 1 en 0,35 s sin volver atrás, sale rápido y frena al llegar, y el rebote de posición es un seno en el último tercio que acaba en el suelo',
    avances[0] === 0 && avances[35] === 1 && avances.every((a, k) => k === 0 || a >= (avances[k - 1] ?? 2)) &&
      avanceDelAsentado(ASENTAR / 2) > 0.8 && avanceDelAsentado(ASENTAR * 2) === 1 &&
      reboteDelDado(0) === 0 && reboteDelDado(ASENTAR / 2) === 0 && reboteDelDado(ASENTAR) === 0 &&
      reboteDelDado(ASENTAR * (5 / 6)) > 0.03 && reboteDelDado(ASENTAR * (5 / 6)) <= 0.04 + 1e-12,
  );
  const giros = Array.from({ length: 8 }, (_, sello) => giroDelDadoAsentado(0, sello));
  comprobar(
    'el giro libre del asentado es determinista, distinto para los dos dados y distinto entre turnos seguidos: los dados no salen clavados iguales ni cada turno como el anterior',
    giroDelDadoAsentado(0, 5) === giroDelDadoAsentado(0, 5) &&
      Math.abs(giroDelDadoAsentado(0, 5) - giroDelDadoAsentado(1, 5)) > 0.5 &&
      giros.every((g, k) => k === 0 || Math.abs(g - (giros[k - 1] ?? 0)) > 0.3) &&
      giros.every((g) => g >= 0 && g < 2 * Math.PI),
    giros.map((g) => Number(g.toFixed(2))),
  );
  const tabla: Array<[ResultadoDelToque, SucesoDeLosDados | null]> = [
    ['hecho', null],
    ['rechazado', { que: 'rechazado' }],
    ['sin-red', { que: 'rechazado' }],
  ];
  comprobar(
    'la respuesta de mover se traduce a la máquina exhaustivamente: hecho no empuja nada (la vista traerá la tirada), rechazado y sin-red empujan rechazado',
    tabla.every(([r, s]) => JSON.stringify(sucesoDelResultado(r)) === JSON.stringify(s)),
  );

  /* ── 7. EL CUBO: cada valor mira arriba con su cuaternión, y el respaldo pone los puntos en las caras del pack ── */
  const idaYVuelta: string[] = [];
  for (const valor of VALORES_DEL_DADO) {
    for (const giro of [0, 0.7, 2.1, 4.4]) {
      const q = cuaternionDelValor(valor, giro);
      const arriba = new THREE.Vector3(...NORMAL_DEL_VALOR[valor]).applyQuaternion(q);
      if (Math.abs(arriba.y - 1) > 1e-9 || valorQueMiraArriba(q) !== valor) idaYVuelta.push(`${String(valor)}@${String(giro)}: y=${arriba.y.toFixed(4)}, lee ${String(valorQueMiraArriba(q))}`);
    }
  }
  comprobar('cuaternionDelValor deja la normal de la cara del valor mirando a +Y para los seis valores y cuatro giros, y valorQueMiraArriba lo lee de vuelta', idaYVuelta.length === 0, idaYVuelta.slice(0, 3));
  comprobar(
    'y el giro libre sólo gira alrededor de la vertical: con otro giro la misma cara sigue arriba pero el dado ya no está igual',
    !cuaternionDelValor(3, 0).equals(cuaternionDelValor(3, 1)) && valorQueMiraArriba(cuaternionDelValor(3, 1)) === 3,
  );
  const puntos = geometriaDeLosPuntosDelDado(1);
  const cuerpo = geometriaDelCuerpoDelDado(1);
  const normalesDeLosPuntos = puntos.getAttribute('normal');
  const porDisco = SEGMENTOS_DEL_PUNTO + 1;
  const discosPorCara = new Map<string, number>();
  for (let d = 0; d < normalesDeLosPuntos.count / porDisco; d++) {
    const k = d * porDisco;
    const n = [normalesDeLosPuntos.getX(k), normalesDeLosPuntos.getY(k), normalesDeLosPuntos.getZ(k)];
    const eje = n.findIndex((c) => Math.abs(c) > 0.5);
    const cara = `${(n[eje] ?? 0) > 0 ? '+' : '-'}${'xyz'[eje] ?? '?'}`;
    discosPorCara.set(cara, (discosPorCara.get(cara) ?? 0) + 1);
  }
  const carasMal = VALORES_DEL_DADO.filter((v) => discosPorCara.get(CARA_DEL_VALOR[v]) !== v);
  comprobar(
    'el respaldo pone N puntos en la cara que enseña el N según caras-del-dado.ts (la del pack), 21 en total: el mismo cuaternión sirve para el modelo y para el respaldo',
    carasMal.length === 0 && [...discosPorCara.values()].reduce((a, b) => a + b, 0) === 21 && discosPorCara.size === 6,
    { porCara: Object.fromEntries(discosPorCara), mal: carasMal },
  );
  comprobar(
    'y cuesta lo que promete el presupuesto: 12 del cuerpo y 210 de los puntos por dado, 444 los dos, con el diámetro del punto al 18 % de la arista',
    triangulosDe(cuerpo) === 12 && triangulosDe(puntos) === 21 * SEGMENTOS_DEL_PUNTO && 2 * (triangulosDe(cuerpo) + triangulosDe(puntos)) === TRIANGULOS_DEL_RESPALDO_DE_LOS_DADOS && PUNTO_DEL_DADO === 0.18,
  );
  const posicionesDeLosPuntos = puntos.getAttribute('position');
  let radioMedido = 0;
  for (let k = 1; k <= SEGMENTOS_DEL_PUNTO; k++) {
    const dx = posicionesDeLosPuntos.getX(k) - posicionesDeLosPuntos.getX(0);
    const dy = posicionesDeLosPuntos.getY(k) - posicionesDeLosPuntos.getY(0);
    const dz = posicionesDeLosPuntos.getZ(k) - posicionesDeLosPuntos.getZ(0);
    radioMedido = Math.max(radioMedido, Math.hypot(dx, dy, dz));
  }
  comprobar('el primer punto del respaldo mide de verdad 0,18 aristas de diámetro y queda un pelo por fuera de su cara', Math.abs(radioMedido * 2 - PUNTO_DEL_DADO) < 1e-6 && Math.abs(Math.max(Math.abs(posicionesDeLosPuntos.getX(0)), Math.abs(posicionesDeLosPuntos.getY(0)), Math.abs(posicionesDeLosPuntos.getZ(0))) - 0.5) < 0.01, { diametro: radioMedido * 2 });
  comprobar('el D6 del pack se escala con ARISTA_DEL_DADO · lado / ARISTA_DEL_D6_EN_EL_PACK, y el pack mide 0,75', ARISTA_DEL_D6_EN_EL_PACK === 0.75 && Math.abs((ARISTA_DEL_DADO * 1) / ARISTA_DEL_D6_EN_EL_PACK - 0.6933) < 1e-3);

  /* ── 8. EL MÍNIMO LEGIBLE, en todos los lienzos con sitio, y los dos umbrales de la tabla ── */
  const CAMPO_DE_LA_MESA = (45 * Math.PI) / 180;
  const dadoEnPuntos = (ancho: number, alto: number): { forma: string; dado: number; punto: number; asa: number } | null => {
    const prop = ancho / alto;
    const visto = loQueSeVe(CAMPO_DE_LA_MESA, prop);
    const { dados } = huecosDeLaMesa(4, CAMPO_DE_LA_MESA, prop, alto);
    if (dados === null) return null;
    const enPuntos = (u: number): number => (u / visto.alto) * alto;
    const dado = enPuntos(ARISTA_DEL_DADO * dados.lado);
    return { forma: dados.forma, dado, punto: dado * PUNTO_DEL_DADO, asa: enPuntos(dados.alto) };
  };
  const ilegibles: string[] = [];
  const legibles: string[] = [];
  for (const [nombre, ancho, alto] of LIENZOS) {
    const m = dadoEnPuntos(ancho, alto);
    if (m === null) {
      legibles.push(`${nombre}: sin dados`);
      continue;
    }
    legibles.push(`${nombre}: ${m.forma}, dado ${m.dado.toFixed(1)} pt, punto ${m.punto.toFixed(1)} pt`);
    if (m.dado < DADO_MINIMO || m.punto < PUNTO_MINIMO) ilegibles.push(`${nombre}: dado ${m.dado.toFixed(1)} y punto ${m.punto.toFixed(1)}`);
  }
  comprobar(
    'en ningún lienzo con sitio el dado baja de 22 puntos ni el punto de 4 (§1.15): 23,3 y 4,2 en el SE apaisado, 23,8 y 4,3 de pie en 390',
    DADO_MINIMO === 22 && PUNTO_MINIMO === 4 && ilegibles.length === 0 &&
      legibles.some((l) => l.startsWith('apaisado SE 1ª: colgado, dado 23.3 pt, punto 4.2 pt')) &&
      legibles.some((l) => l.startsWith('móvil corriente: quinto, dado 23.8 pt, punto 4.3 pt')) &&
      legibles.filter((l) => l.endsWith('sin dados')).length === 2,
    ilegibles.length > 0 ? ilegibles : legibles,
  );
  const enElUmbralApaisado = dadoEnPuntos(561, 316);
  const bajoElUmbralApaisado = dadoEnPuntos(557, 314);
  const enElUmbralDePie = dadoEnPuntos(375, 845);
  comprobar(
    'los umbrales de la tabla: el asa colgada llega a 44 desde 315 puntos de alto (561×316 da 44,2 y 557×314 queda BAJO 44) y de pie el quinto llega desde 375 de ancho (375×845 da 44,0; 374×845 ya no tiene dados)',
    enElUmbralApaisado?.forma === 'colgado' && enElUmbralApaisado.asa >= 44 && enElUmbralApaisado.dado >= DADO_MINIMO &&
      bajoElUmbralApaisado?.forma === 'colgado' && bajoElUmbralApaisado.asa < 44 &&
      enElUmbralDePie?.forma === 'quinto' && enElUmbralDePie.asa >= 44 && enElUmbralDePie.dado >= DADO_MINIMO &&
      dadoEnPuntos(374, 845) === null,
    { apaisado: enElUmbralApaisado, bajo: bajoElUmbralApaisado, dePie: enElUmbralDePie },
  );
}

// ---------------------------------------------------------------------------

/**
 * LA TAPA DE LA MESA: horizontal a la cota del zócalo, con la veta del atlas en el
 * vértice, dentro del tope, y pintada en el orden que la deja bajo las cartas.
 *
 * ═══ LO QUE SE PINTA ES LO QUE SE CUENTA ═══
 *
 * `triangulosDeLaMesa` promete `12 · segmentos + 590`. Aquí no se repite la cuenta: se
 * construyen las geometrías de verdad con `three` —la tapa, las sombras fundidas, el
 * tapete, y las de los dados y la pila que llegan después— y se cuentan sus índices. Y se
 * afirma sobre el texto de `delta.tsx` que el componente llama a ESAS funciones con los
 * segmentos que salen del ancho: si mañana alguien construye la tapa a mano dentro del
 * componente, el tope deja de vigilar lo que se pinta y esto se pone rojo.
 *
 * ═══ EL ORDEN DE DIBUJO SE LEE EN LOS GRUPOS DE DENTRO, Y ADEMÁS SE MIDE ═══
 *
 * `three` toma el `groupOrder` del grupo MÁS CERCANO a cada malla, así que numerar los
 * grupos exteriores de las manos no prueba nada: medido con el ordenador de `three` sobre
 * el árbol real, con sólo los exteriores la tapa opaca tapa los pies de las cartas de
 * bienes y las piezas se pintan con el mundo. Se leen los OCHO grupos de dentro —el primer
 * `<group` tras cada firma y, en la barra, también el segundo— más `Baraja` y
 * `ManoDelMazo`. Leer texto compra la FORMA del árbol y nada más, así que además se monta
 * el modelo del árbol de `arbol-de-la-mesa.ts` —las constantes de `capas.ts` y las
 * posiciones de verdad— y se ordena con el `WebGLRenderLists` de `three` con la poda por
 * frustum puesta, en los quince lienzos. La poda es lo que descubrió que los dos testigos
 * de `clearDepth` de `delta.tsx` no corrieron NUNCA (estaban en el ojo de la cámara), y
 * por eso aquí se afirma que en `escenas/` no queda ninguno.
 *
 * ═══ LA MADERA PARA EL TOQUE, Y LO QUE ESCONDE AL SALIR ESTÁ CONTADO ═══
 *
 * En r3f sólo reciben rayos los objetos con manejadores: una tapa sin ellos es transparente
 * al dedo y el asa de un vértice escondido bajo la madera se pulsa a ciegas. Se afirma que
 * la tapa lleva los tres manejadores que paran el toque y que sólo dejan pasar a la
 * interfaz de las manos; y se cuentan, con la cámara real del mirador de salida, los
 * sitios que quedan bajo su borde trasero en cada lienzo, contra cifras ACEPTADAS.
 */
paso('La tapa de la mesa: a la cota del zócalo, con la veta del atlas, dentro del tope y bajo las cartas');
{
  const CAMPO = (45 * Math.PI) / 180;
  /* La lista `LIENZOS` es la de la cabecera del guion, común a todos los bloques. */

  /* ── 1. LA GEOMETRÍA, CONTADA CON `three` ── */
  const madera = maderaEnLineal();
  const seisSombras = geometriaDeLasSombras(
    Array.from({ length: 6 }, (_, i) => ({ x: i, z: -2, radio: 0.1 })),
  );
  const tapete = geometriaDelTapete(0.3, 0.15);
  /*
   * Los dos dados, CONTADOS por los dos caminos: el respaldo construido con `cubo-del-dado.ts`
   * y el D6 del pack leído de `dados.glb` con `@gltf-transform` (índices / 3 de su única
   * primitiva, como cuenta `verify:dados`). La fórmula suma el MÁXIMO de los dos. La pila
   * es de la fase 7, con la primitiva que el presupuesto declara.
   */
  const dosDadosDelRespaldo = 2 * (triangulosDe(geometriaDelCuerpoDelDado(1)) + triangulosDe(geometriaDeLosPuntosDelDado(1)));
  const dadosGlb = await new NodeIO().read(path.join(import.meta.dirname ?? __dirname, '..', 'modelos', 'dados.glb'));
  const primitivasDelDado = dadosGlb.getRoot().listMeshes().flatMap((m) => m.listPrimitives());
  const dosDadosDelPack = 2 * primitivasDelDado.reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0);
  const dosDados = Math.max(dosDadosDelRespaldo, dosDadosDelPack);
  const asaYPila = 2 * triangulosDe(new THREE.BoxGeometry(1, 1, 1));
  const cuadran: string[] = [];
  for (const segmentos of [SEGMENTOS_DE_LA_MESA.minimo, 96, segmentosDeLaMesa(844), SEGMENTOS_DE_LA_MESA.maximo]) {
    const tapa = geometriaDeLaTapa(segmentos, FILAS_DE_LA_MESA, 3, 0.5, madera);
    const pintados = triangulosDe(tapa) + triangulosDe(seisSombras) + triangulosDe(tapete) + dosDados + asaYPila;
    if (pintados !== triangulosDeLaMesa(segmentos)) cuadran.push(`${String(segmentos)}: pinta ${String(pintados)}, promete ${String(triangulosDeLaMesa(segmentos))}`);
    if (triangulosDe(tapa) !== 2 * segmentos * FILAS_DE_LA_MESA) cuadran.push(`${String(segmentos)}: la tapa tiene ${String(triangulosDe(tapa))} triángulos`);
  }
  comprobar(
    'triangulosDeLaMesa es lo que pintan las geometrías de verdad: tapa + seis sombras + tapete + el máximo de los dos dados (respaldo construido, pack contado del glb) + asa + pila, con 64, 96, 106 y 240 segmentos',
    cuadran.length === 0,
    cuadran,
  );
  comprobar(
    'el respaldo construido son los 444 de TRIANGULOS_DEL_RESPALDO_DE_LOS_DADOS y el glb contado los 1.324 de TRIANGULOS_DE_LOS_DADOS_DEL_PACK, una sola primitiva por dado',
    dosDadosDelRespaldo === TRIANGULOS_DEL_RESPALDO_DE_LOS_DADOS && dosDadosDelPack === TRIANGULOS_DE_LOS_DADOS_DEL_PACK && primitivasDelDado.length === 1 && dosDados === TRIANGULOS_DE_LOS_DADOS,
    { respaldo: dosDadosDelRespaldo, pack: dosDadosDelPack, primitivas: primitivasDelDado.length },
  );
  comprobar(
    'las seis sombras fundidas son 120 triángulos en UNA geometría, el tapete dos, y con los segmentos del monitor la mesa sigue bajo su tope',
    triangulosDe(seisSombras) === 6 * SEGMENTOS_DE_LA_SOMBRA && triangulosDe(tapete) === 2 && triangulosDeLaMesa(segmentosDeLaMesa(1920)) <= TOPE_DE_LA_MESA,
    { sombras: triangulosDe(seisSombras), tapete: triangulosDe(tapete), monitor: triangulosDeLaMesa(segmentosDeLaMesa(1920)) },
  );

  /* La veta va en el vértice, en lineal, entre las dos maderas del atlas. */
  const tapa96 = geometriaDeLaTapa(96, FILAS_DE_LA_MESA, 3, 0.5, madera);
  const color = tapa96.getAttribute('color');
  const veta96 = vetaDelTablon(96, FILAS_DE_LA_MESA);
  const { oscura, clara } = coloresDeLaMadera();
  const coloresMal: string[] = [];
  for (let k = 0; k < color.count; k += 97) {
    const esperado = mezcla(aLineal(oscura), aLineal(clara), veta96[k] ?? 0);
    const dado = [color.getX(k), color.getY(k), color.getZ(k)];
    if (dado.some((c, i) => Math.abs(c - (esperado[i] ?? -1)) > 1e-6)) coloresMal.push(`vértice ${String(k)}: ${dado.map((c) => c.toFixed(4)).join(',')} ≠ ${esperado.map((c) => c.toFixed(4)).join(',')}`);
  }
  comprobar(
    'la tapa lleva el color EN EL VÉRTICE, tres componentes, un vértice por valor de la veta, y cada uno es la mezcla en lineal de las dos maderas del atlas',
    color.itemSize === 3 && color.count === veta96.length && color.count === 97 * (FILAS_DE_LA_MESA + 1) && coloresMal.length === 0,
    { itemSize: color.itemSize, count: color.count, mal: coloresMal.slice(0, 2) },
  );
  const posicion = tapa96.getAttribute('position');
  const normal = tapa96.getAttribute('normal');
  comprobar(
    'y está TUMBADA: todos los vértices a y = 0 con la normal hacia arriba, y la fila 0 de la veta es el borde LEJANO (z negativa)',
    Array.from({ length: posicion.count }, (_, k) => k).every((k) => Math.abs(posicion.getY(k)) < 1e-9 && Math.abs(normal.getY(k) - 1) < 1e-9) &&
      posicion.getZ(0) < 0 && posicion.getZ(posicion.count - 1) > 0,
    { y0: posicion.getY(0), z0: posicion.getZ(0), zUltimo: posicion.getZ(posicion.count - 1) },
  );
  const alfa = seisSombras.getAttribute('color');
  comprobar(
    'las sombras llevan el alfa en el vértice —cuatro componentes—, 0,35 en el centro y 0 en el borde, y son negras',
    alfa.itemSize === 4 &&
      /* Con la holgura de un `Float32`: 0,35 se guarda como 0,3499999. */
      Math.abs(alfa.getW(0) - ALFA_DE_LA_SOMBRA) < 1e-6 && alfa.getW(1) === 0 && alfa.getW(SEGMENTOS_DE_LA_SOMBRA) === 0 &&
      Math.abs(alfa.getW(SEGMENTOS_DE_LA_SOMBRA + 1) - ALFA_DE_LA_SOMBRA) < 1e-6 &&
      alfa.getX(0) === 0 && alfa.getY(0) === 0 && alfa.getZ(0) === 0,
    { itemSize: alfa.itemSize, centro: alfa.getW(0), borde: alfa.getW(1) },
  );

  /* ── 2. LA COTA Y LOS BORDES, LIENZO A LIENZO ── */
  const fueraDeSitio: string[] = [];
  const enPantalla: string[] = [];
  const pisadas: string[] = [];
  const MANO_DE_CATORCE = Array.from({ length: 14 }, (_, i) => ({
    id: `b${String(i)}`,
    bien: ['limo', 'junco', 'sal', 'piedra', 'grano'][i % 5] as string,
  }));
  for (const [nombre, anchoPt, altoPt] of LIENZOS) {
    const prop = anchoPt / altoPt;
    const hueco = huecosDeLaBarra(4, CAMPO, prop)[0];
    if (hueco === undefined) { fueraDeSitio.push(`${nombre}: sin hueco`); continue; }
    const tapa = tapaDeLaMesa(hueco, CAMPO, prop);
    const t = Math.tan(CAMPO / 2);
    const vista = loQueSeVe(CAMPO, prop);
    const ppu = altoPt / vista.alto;
    const caraDeAbajoDelZocalo = hueco.y - (ZOCALO.centro + ZOCALO.alto / 2) * hueco.lado;
    if (Math.abs(tapa.cota - cotaDeLaTapa(hueco)) > 1e-12 || tapa.cota > caraDeAbajoDelZocalo + 1e-12) fueraDeSitio.push(`${nombre}: la tapa (${tapa.cota.toFixed(4)}) sube por encima de la cara de abajo del zócalo (${caraDeAbajoDelZocalo.toFixed(4)})`);
    if (Math.abs(tapa.zTrasero + (DISTANCIA_DE_LA_BARRA + TRAS_EL_ZOCALO * hueco.lado)) > 1e-12) fueraDeSitio.push(`${nombre}: borde trasero en ${tapa.zTrasero.toFixed(4)}`);
    /* El frente proyecta POR DEBAJO del canto de abajo (y normalizada ≤ −1): la mesa no flota. */
    const frenteExacto = tapa.zDelantero - HOLGURA_DELANTERA_DE_LA_TAPA;
    const yDelFrenteExacto = tapa.cota / (-frenteExacto * t);
    const yDelFrente = tapa.cota / (-tapa.zDelantero * t);
    if (Math.abs(yDelFrenteExacto + 1) > 1e-9 || yDelFrente > -1) fueraDeSitio.push(`${nombre}: el frente proyecta en ${yDelFrente.toFixed(4)}`);
    if (!(tapa.zTrasero < tapa.zDelantero && tapa.zDelantero < -1)) fueraDeSitio.push(`${nombre}: bordes ${tapa.zTrasero.toFixed(3)}..${tapa.zDelantero.toFixed(3)}`);
    /* El ancho cubre lo que la cámara ve en el borde trasero, que está más lejos que la barra. */
    const anchoEnElBordeTrasero = vista.ancho * (-tapa.zTrasero / DISTANCIA_DE_LA_BARRA);
    if (tapa.ancho < anchoEnElBordeTrasero || Math.abs(tapa.ancho - vista.ancho * ANCHO_DE_MAS_DE_LA_TAPA) > 1e-9) fueraDeSitio.push(`${nombre}: ancho ${tapa.ancho.toFixed(3)} y el borde trasero pide ${anchoEnElBordeTrasero.toFixed(3)}`);
    /* Lo que ocupa en pantalla: del canto de abajo al borde trasero proyectado. */
    const yTrasero = tapa.cota / (-tapa.zTrasero * t);
    const parte = (1 + yTrasero) / 2;
    const puntos = parte * altoPt;
    enPantalla.push(`${nombre}: ${(parte * 100).toFixed(1)} % = ${puntos.toFixed(1)} pt`);
    if (parte > 0.14) fueraDeSitio.push(`${nombre}: la tapa ocupa el ${(parte * 100).toFixed(1)} % del alto`);
    if (anchoPt > altoPt && Math.abs(parte - 0.115) > 0.003) fueraDeSitio.push(`${nombre}: apaisado y la tapa ocupa el ${(parte * 100).toFixed(1)} %, no el 11,5 %`);
    /* Y las cartas de bienes quietas PISAN la tapa vista en los apaisados: por eso importa el orden. */
    if (anchoPt > altoPt) {
      const quietas = huecosDeLaBaraja(MANO_DE_CATORCE, CAMPO, prop, null).map((c) => c.hueco);
      const pie = Math.min(...quietas.map((q) => q.y - q.alto / 2));
      const piePt = (pie + vista.alto / 2) * ppu;
      const cuanto = puntos - piePt;
      pisadas.push(`${nombre}: ${cuanto.toFixed(1)} pt`);
      if (!(cuanto >= 3 && cuanto <= 12)) fueraDeSitio.push(`${nombre}: los pies de las cartas quedan ${cuanto.toFixed(1)} pt bajo el borde trasero, y el diseño dice de 3 a 12`);
    }
  }
  comprobar(
    'la tapa está a la cota exacta de la cara de abajo del zócalo, con el borde trasero a 0,6 lados tras la barra y el frente FUERA del canto de abajo, en los quince lienzos',
    fueraDeSitio.length === 0,
    fueraDeSitio.slice(0, 3),
  );
  comprobar(
    'y ocupa el 11,5 % del alto en todos los apaisados —36,7 pt en el SE, 44,7 en un iPhone 14, 123,8 en un monitor a 1080— y nunca más del 14 %',
    enPantalla.some((l) => l.startsWith('apaisado SE 1ª') && /36\.[67] pt/.test(l)) &&
      enPantalla.some((l) => l.startsWith('apaisado iPhone 14') && /44\.[678] pt/.test(l)) &&
      enPantalla.some((l) => l.startsWith('apaisado monitor 1080') && /123\.[789] pt/.test(l)),
    enPantalla,
  );
  comprobar(
    'las cartas de bienes quietas pisan la tapa vista entre 3 y 12 puntos en los diez lienzos apaisados: sin el orden de dibujo, la tapa opaca les taparía los pies',
    pisadas.length === LIENZOS.filter(([, a, b]) => a > b).length && pisadas.length === 10 && fueraDeSitio.every((f) => !f.includes('pies')),
    pisadas,
  );

  /* ── 3. LOS COLORES: la madera y el tapete salen del atlas ── */
  const hexDelColono = (c: string): string => hexDe(colorDelColono(c));
  comprobar(
    'el tapete de cada colono se lee de la celda del jugador del atlas, la misma de sus chozas: azul #257ebc, rojo #d22227, amarillo #f9aa4e, verde #008454, y un color desconocido sale azul',
    hexDelColono('blue') === '#257ebc' && hexDelColono('red') === '#d22227' && hexDelColono('yellow') === '#f9aa4e' && hexDelColono('green') === '#008454' && hexDelColono('morado') === '#257ebc',
    { blue: hexDelColono('blue'), red: hexDelColono('red'), yellow: hexDelColono('yellow'), green: hexDelColono('green') },
  );

  /* ── 4. EL TEXTO DE `delta.tsx`: los diez grupos, el testigo, un solo borrado, y que pinta lo contado ── */
  const fuente = fs.readFileSync(path.join(import.meta.dirname ?? __dirname, '..', 'delta.tsx'), 'utf8');
  /*
   * Las etiquetas `<group` pueden ocupar varias líneas: se toma desde la primera línea que
   * EMPIEZA por `<group` tras la firma hasta el `>` que CIERRA la etiqueta. Un comentario
   * que cite la constante no cuenta porque no empieza por `<group`.
   *
   * «El que cierra la etiqueta», no el primer `>`: un atributo puede llevar una función
   * flecha —`onPointerOver={(e) => …}`, `raycast={() => null}`— y su `=>` cortaría la
   * etiqueta a medias, dejando fuera un `renderOrder` que sí está y poniendo esto rojo por
   * nada (o, peor, verde por leer sólo la mitad). Se salta lo que va entre llaves y entre
   * comillas, y se para en el primer `>` a nivel cero.
   */
  const etiquetaDesde = (texto: string, inicio: number): string | null => {
    let llaves = 0;
    let comilla: string | null = null;
    for (let k = inicio; k < texto.length; k++) {
      const c = texto[k] as string;
      if (comilla !== null) {
        if (c === comilla) comilla = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') comilla = c;
      else if (c === '{') llaves++;
      else if (c === '}') llaves--;
      else if (c === '>' && llaves === 0) return texto.slice(inicio, k + 1);
    }
    return null;
  };
  const gruposTras = (firma: string, cuantos: number): string[] => {
    const desde = fuente.indexOf(firma);
    if (desde < 0) return [];
    const salida: string[] = [];
    const re = /^[ \t]*<group\b/gm;
    re.lastIndex = desde;
    let m: RegExpExecArray | null;
    while (salida.length < cuantos && (m = re.exec(fuente)) !== null) {
      const etiqueta = etiquetaDesde(fuente, m.index);
      if (etiqueta === null) break;
      salida.push(etiqueta);
      re.lastIndex = m.index + etiqueta.length;
    }
    return salida;
  };
  comprobar(
    'la lectura de una etiqueta <group llega hasta el > que la CIERRA, saltando el => de una función flecha entre llaves',
    etiquetaDesde('<group a={(e) => e.x} renderOrder={X}>\n<mesh />', 0) === '<group a={(e) => e.x} renderOrder={X}>' &&
      etiquetaDesde('<group\n  raycast={() => null}\n  renderOrder={Y}\n>', 0)?.includes('renderOrder={Y}') === true,
  );
  const conOrden = (etiqueta: string | undefined, constante: string): boolean =>
    etiqueta !== undefined && new RegExp(`renderOrder=\\{${constante}\\}`).test(etiqueta);
  const gruposMal: string[] = [];
  const exige = (firma: string, constante: string, cuantos: 1 | 2): void => {
    const grupos = gruposTras(firma, cuantos);
    for (let i = 0; i < cuantos; i++) {
      if (!conOrden(grupos[i], constante)) gruposMal.push(`${firma} grupo ${String(i + 1)}: ${(grupos[i] ?? '(no hay)').replace(/\s+/g, ' ').slice(0, 90)}`);
    }
  };
  exige('function PiezaEnLaBarra(', 'ORDEN_DE_LA_BARRA', 2);
  exige('function MazoEnLaBarra(', 'ORDEN_DE_LA_BARRA', 2);
  /* Los dados: el grupo del asa y el grupo de cada cubo (el del `ref`, el que el pintor mira). */
  exige('function Dados(', 'ORDEN_DE_LA_BARRA', 2);
  exige('function Carta(', 'ORDEN_DE_LAS_CARTAS', 1);
  exige('function AreaDeTrueque(', 'ORDEN_DE_LAS_AREAS', 1);
  exige('function CartaDelMazoEnLaMano(', 'ORDEN_DE_LAS_CARTAS_DEL_MAZO', 1);
  exige('function Casilla(', 'ORDEN_DE_LAS_CASILLAS', 1);
  comprobar(
    'los DIEZ grupos de dentro llevan la constante de su capa: los dos de PiezaEnLaBarra, los dos de MazoEnLaBarra y los dos de Dados (barra), Carta (cartas), AreaDeTrueque (áreas), CartaDelMazoEnLaMano (cartas del mazo) y Casilla (casillas)',
    gruposMal.length === 0,
    gruposMal,
  );
  const exteriores: string[] = [];
  exige('function Baraja(', 'ORDEN_DE_LAS_CARTAS', 1);
  exige('function ManoDelMazo(', 'ORDEN_DE_LAS_CARTAS_DEL_MAZO', 1);
  exige('function Barra(', 'ORDEN_DE_LA_BARRA', 1);
  for (const g of gruposMal.filter((g) => /^function (Baraja|ManoDelMazo|Barra)\(/.test(g))) exteriores.push(g);
  comprobar(
    'y también los tres exteriores: Baraja con la de las cartas, ManoDelMazo con la de las cartas del mazo, Barra con la de la barra',
    exteriores.length === 0,
    exteriores,
  );
  /*
   * ── NINGÚN BORRADO DE PROFUNDIDAD EN `escenas/`, Y NINGÚN `onBeforeRender` QUE TOQUE `gl` ──
   *
   * Hubo dos testigos con `onBeforeRender → gl.clearDepth()` y ninguno corrió jamás: iban
   * en el origen de un grupo pegado a la cámara —en el ojo, detrás del plano cercano— y
   * `projectObject` los podaba por frustum antes de la lista de dibujo. La escena se veía
   * igual con ellos y sin ellos. Se mira sólo el CÓDIGO, no los comentarios: las cabeceras
   * cuentan el fallo con su nombre, y una regla que castigue nombrarlo enseña a no
   * documentarlo.
   */
  const raizDeEscenas = path.join(import.meta.dirname ?? __dirname, '..');
  const soloCodigo = (texto: string): string =>
    texto.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l)).join('\n');
  const ficherosDeEscenas = (carpeta: string): string[] =>
    fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
      if (entrada.isDirectory()) {
        return ['node_modules', 'scripts', 'modelos'].includes(entrada.name) ? [] : ficherosDeEscenas(path.join(carpeta, entrada.name));
      }
      return /\.(ts|tsx)$/.test(entrada.name) ? [path.join(carpeta, entrada.name)] : [];
    });
  const conBorrado = ficherosDeEscenas(raizDeEscenas).filter((f) => /\bclearDepth\(/.test(soloCodigo(fs.readFileSync(f, 'utf8'))));
  comprobar(
    'NO hay ningún clearDepth( en el código de escenas/: los dos testigos que hubo estaban en el ojo de la cámara, podados por frustum, y nunca borraron nada; la mesa se apoya en la profundidad del mundo y en el orden',
    conBorrado.length === 0,
    conBorrado.map((f) => path.relative(raizDeEscenas, f)),
  );
  const antesDePintar = soloCodigo(fuente).match(/onBeforeRender=\{[^}]*\}/g) ?? [];
  const tocanGl = antesDePintar.filter((m) => /\(\s*(\w+)\b[^)]*\)\s*=>\s*[\s\S]*\b\1\./.test(m));
  comprobar(
    'y ningún onBeforeRender de delta.tsx toca el renderer que recibe: un borrado escondido ahí no se ve fallar, sólo se ve no hacer nada',
    tocanGl.length === 0 && !/renderOrder=\{-1\}/.test(fuente) && !/renderOrder=\{999\}/.test(fuente),
    tocanGl,
  );

  /*
   * ── EL ORDEN, MEDIDO CON EL PINTOR DE `three` Y EL MODELO DEL ÁRBOL ──
   *
   * `arbol-de-la-mesa.ts` monta el árbol con las constantes de `capas.ts` y las posiciones
   * reales y lo pasa por el `WebGLRenderLists` de `three` 0.185.1 con la poda por frustum,
   * en cada lienzo. Es lo que la lectura de texto no puede comprar: que con esos números
   * el pintor haga lo que se quiere, y que nada de la mesa se quede fuera de la lista.
   */
  const ordenes = LIENZOS.map(([nombre, anchoPt, altoPt]) => ({ nombre, orden: ordenDeDibujoDeLaMesa({ ancho: anchoPt, alto: altoPt }) }));
  const fallosDeOrden = ordenes.flatMap(({ nombre, orden }) => fallosDelOrden(orden).map((f) => `${nombre}: ${f}`));
  comprobar(
    'ordenado con el WebGLRenderLists de three con las posiciones reales y la poda por frustum, en los quince lienzos: la tapa y las piezas (capa de la barra) antes que las cartas de bienes, nada de la mesa después de nada de las manos en ninguna pasada, sombras y tapete entre los transparentes, y NADA de la mesa podado',
    fallosDeOrden.length === 0,
    fallosDeOrden.slice(0, 4),
  );
  const modeloDelIPhone = ordenes.find((o) => o.nombre === 'apaisado iPhone 14')?.orden;
  const tiene = (fragmento: string): boolean => modeloDelIPhone?.lineas.some((l) => l.includes(fragmento)) === true;
  comprobar(
    'y el modelo tiene lo que dice tener —tapa, sombras, tapete, tres piezas, naipe, los dos dados con su asa, cartas de bienes, áreas, cartas del mazo y casilla— con las capas de capas.ts y nada podado en el iPhone 14',
    tiene('barra:TAPA') && tiene('barra:SOMBRAS') && tiene('barra:TAPETE') && tiene('barra:PIEZA modelo 2') && tiene('barra:naipe cuerpo') &&
      tiene('barra:DADO 0') && tiene('barra:DADO 1') && tiene('barra:asa de los dados') &&
      tiene('baraja:carta 4 cuerpo') && tiene('baraja:área 1 cuerpo') && tiene('mazo:carta 1 cuerpo') && tiene('mazo:casilla cuerpo') &&
      tiene(`[g${String(ORDEN_DE_LA_BARRA)} `) && tiene(`[g${String(ORDEN_DE_LAS_CARTAS)} `) && modeloDelIPhone?.podados.length === 0,
    { lineas: modeloDelIPhone?.lineas.length, podados: modeloDelIPhone?.podados },
  );
  /* Los dos cubos son opacos y van ANTES que las cartas de bienes, como las piezas; y en el quinto hueco (de pie en 390) también están. */
  const lineasDelIPhone = modeloDelIPhone?.lineas ?? [];
  const primeraCartaDelIPhone = lineasDelIPhone.findIndex((l) => l.includes(' baraja:carta'));
  const dadosDelIPhone = lineasDelIPhone.map((l, k) => [l, k] as const).filter(([l]) => l.includes('barra:DADO'));
  const modeloDePie = ordenes.find((o) => o.nombre === 'móvil corriente')?.orden;
  comprobar(
    'los dos dados se pintan OPACOS y antes que las cartas de bienes en el iPhone 14, y también están (sin podar) en el quinto hueco de un móvil de pie de 390',
    dadosDelIPhone.length === 2 && dadosDelIPhone.every(([l, k]) => l.startsWith('OPACO') && k < primeraCartaDelIPhone) &&
      modeloDePie?.lineas.filter((l) => l.includes('barra:DADO')).length === 2 && modeloDePie.podados.length === 0,
    { dados: dadosDelIPhone.map(([l]) => l), dePie: modeloDePie?.lineas.filter((l) => l.includes('barra:DADO')) },
  );

  /*
   * ── LA TAPA PARA EL TOQUE, A TODO ──
   *
   * En r3f sólo se lanzan rayos contra los objetos QUE TIENEN manejadores, así que
   * `raycast={() => null}` en la tapa no hacía nada y quitarlo tampoco: el asa de un
   * vértice escondido bajo la madera recibía el toque y se fundaba tocando madera. La tapa
   * lleva los cinco manejadores y para SIEMPRE la propagación: la excepción «salvo si detrás
   * hay interfaz de mano» se midió y no protegía nada (las áreas no bajan a la madera con
   * cuatro, y los pies de las cartas sólo en uno o dos puntos de filo de pie), así que se
   * exige que NO exista. `onPointerOver`/`onPointerOut` van porque sólo con ellos la tapa
   * entra en la lista de «hovered» de r3f y su parada encoge lo que había crecido detrás.
   * Y NO marcan el suceso para la cámara: arrastrar desde la madera sigue girando el mundo,
   * que es como se sacan los sitios escondidos.
   */
  const etiquetaDeLaTapa = etiquetaDesde(fuente, fuente.search(/<mesh\s+position=\{\[0, tapa\.cota, tapa\.centroZ\]\}/)) ?? '';
  const cuerpoDeParaElToque = /const paraElToque = \(e: ThreeEvent<PointerEvent>\): void => \{([\s\S]*?)\n  \};/.exec(fuente)?.[1] ?? '';
  comprobar(
    'la tapa PARA el toque a todo: onPointerDown/Up/Move/Over/Out con paraElToque, que corta SIEMPRE la propagación (sin la excepción por interfaz detrás, que medida no protegía nada), sin raycast nulo y sin marcar el suceso para la cámara',
    /onPointerDown=\{paraElToque\}/.test(etiquetaDeLaTapa) &&
      /onPointerUp=\{paraElToque\}/.test(etiquetaDeLaTapa) &&
      /onPointerMove=\{paraElToque\}/.test(etiquetaDeLaTapa) &&
      /onPointerOver=\{paraElToque\}/.test(etiquetaDeLaTapa) &&
      /onPointerOut=\{/.test(etiquetaDeLaTapa) &&
      !/raycast/.test(etiquetaDeLaTapa) &&
      cuerpoDeParaElToque.trim() === 'e.stopPropagation();' &&
      !/hayInterfazDetras/.test(fuente),
    { etiqueta: etiquetaDeLaTapa.replace(/\s+/g, ' ').slice(0, 160), cuerpo: cuerpoDeParaElToque.trim() },
  );

  /*
   * ── LO QUE LA TAPA ESCONDE AL SALIR, CONTADO CONTRA CIFRAS ACEPTADAS ──
   *
   * Con la cámara del mirador de salida (`ojoDelMirador`, sin acercar) se proyectan los
   * cincuenta y cuatro vértices, las setenta y dos aristas y las diecinueve comarcas y se
   * cuentan los que caen bajo el borde trasero proyectado de la tapa. SON CIFRAS ACEPTADAS,
   * NO UN IDEAL: en los apaisados y en el monitor quedan tres vértices (dos con su anillo
   * entero) y cinco aristas; en las tabletas, dos y tres; de pie, ninguno. Se aceptan
   * porque se sacan arrastrando la cámara y porque, con la tapa parando el toque, no se
   * pulsan a ciegas. Si alguna cifra sube, la tapa ha crecido hacia atrás (`TRAS_EL_ZOCALO`,
   * `ANCHO_DE_MAS_DE_LA_TAPA`) o el mirador de salida ha bajado, y eso se decide, no se
   * hereda. Miguel puede cambiar esta decisión viéndolo en el banco: entonces se cambian
   * estos números, con su porqué.
   */
  const TERRENOS_DE_LA_MESA = [
    'bosque', 'bosque', 'bosque', 'bosque', 'pradera', 'pradera', 'pradera', 'pradera',
    'campo', 'campo', 'campo', 'campo', 'colina', 'colina', 'colina',
    'montana', 'montana', 'montana', 'desierto',
  ];
  const hexesDeLaMesa = mallaDeRadio(2);
  const islasDeLaMesa = hexesDeLaMesa.map((hex, i) => ({ hex, terreno: TERRENOS_DE_LA_MESA[i % TERRENOS_DE_LA_MESA.length] ?? 'pradera' }));
  const relieveDeLaMesa = crearRelieve(islasDeLaMesa, 3);
  const sitiosDeLaMesa = sitiosDelTablero(hexesDeLaMesa, (p) => relieveDeLaMesa.alturaEn(p));
  const ALTO_DEL_ANILLO = ALTURA_DE_UNA_PERSONA * 2.5;
  const ACEPTADOS = { apaisado: { vertices: 3, aristas: 5 }, tableta: { vertices: 2, aristas: 3 }, dePie: { vertices: 0, aristas: 0 } } as const;
  const escondidos: string[] = [];
  const porEncimaDeLoAceptado: string[] = [];
  const proyectado = new THREE.Vector3();
  for (const [nombre, anchoPt, altoPt] of LIENZOS) {
    const prop = anchoPt / altoPt;
    const camara = new THREE.PerspectiveCamera(45, prop, 0.5, ALCANCE_DEL_DELTA * 8);
    camara.position.set(...ojoDelMirador(MIRADOR_DE_SALIDA, ALCANCE_DEL_DELTA, prop));
    camara.lookAt(0, 0, 0);
    camara.updateMatrixWorld();
    camara.updateProjectionMatrix();
    const hueco = huecosDeLaBarra(4, CAMPO, prop)[0];
    if (hueco === undefined) continue;
    const tapa = tapaDeLaMesa(hueco, CAMPO, prop);
    const yTrasero = tapa.cota / (-tapa.zTrasero * Math.tan(CAMPO / 2));
    const bajoLaTapa = (x: number, y: number, z: number): boolean => {
      proyectado.set(x, y, z).project(camara);
      return Math.abs(proyectado.x) <= 1 && proyectado.y >= -1 && proyectado.y < yTrasero;
    };
    const vertices = sitiosDeLaMesa.vertices.filter((s) => bajoLaTapa(s.punto.x, s.altura, s.punto.y)).length;
    const anillos = sitiosDeLaMesa.vertices.filter((s) => bajoLaTapa(s.punto.x, s.altura + ALTO_DEL_ANILLO, s.punto.y)).length;
    const aristas = sitiosDeLaMesa.aristas.filter((s) => bajoLaTapa(s.punto.x, s.altura, s.punto.y)).length;
    const comarcas = sitiosDeLaMesa.comarcas.filter((s) => bajoLaTapa(s.punto.x, s.altura, s.punto.y)).length;
    const tope = prop <= 1 ? ACEPTADOS.dePie : prop >= 1.5 ? ACEPTADOS.apaisado : ACEPTADOS.tableta;
    escondidos.push(`${nombre}: ${String(vertices)} vértices (${String(anillos)} con su anillo), ${String(aristas)} aristas, ${String(comarcas)} comarcas`);
    if (vertices > tope.vertices || aristas > tope.aristas || comarcas > 0) {
      porEncimaDeLoAceptado.push(`${nombre}: ${String(vertices)} vértices y ${String(aristas)} aristas bajo la tapa, aceptados ${String(tope.vertices)} y ${String(tope.aristas)}; comarcas ${String(comarcas)}`);
    }
  }
  comprobar(
    'al mirador de salida la tapa esconde como mucho lo ACEPTADO: 3 vértices y 5 aristas en los apaisados y el monitor, 2 y 3 en las tabletas, ninguno de pie, y ninguna comarca; se sacan arrastrando y con la tapa parando el toque no se pulsan a ciegas',
    porEncimaDeLoAceptado.length === 0 && escondidos.some((l) => l.startsWith('apaisado iPhone 14: 3 vértices')) && escondidos.some((l) => l.startsWith('móvil de pie, lienzo entero: 0 vértices')),
    porEncimaDeLoAceptado.length > 0 ? porEncimaDeLoAceptado : escondidos,
  );

  /*
   * ── LOS POSAVASOS: madera más oscura que la tapa, leída del atlas ──
   *
   * Eran paja clara (`#c8b48a`) sobre la madera, y se leían como pegatinas. Salen de
   * `coloresDelPosavasos` (`mesa.ts`): la celda oscura del atlas al 70 % en reposo y al
   * 85 % bajo el puntero. Se mide con la luminancia relativa lo que el diseño pide (§1.14):
   * más oscuro que la veta más oscura, y con contraste suficiente para no fundirse con ella.
   */
  const posavasos = coloresDelPosavasos();
  const vetaMasOscura = coloresDeLaMadera().oscura;
  comprobar(
    'el posavasos en reposo es MÁS OSCURO que la veta más oscura de la tapa y contrasta con ella al menos 1,5:1 —madera oscura sobre madera, ni pegatina ni agujero—, y bajo el puntero es un paso más claro que sigue por debajo de la veta',
    luminancia(posavasos.reposo) < luminancia(vetaMasOscura) &&
      contraste(posavasos.reposo, vetaMasOscura) >= 1.5 &&
      luminancia(posavasos.encima) > luminancia(posavasos.reposo) &&
      luminancia(posavasos.encima) < luminancia(vetaMasOscura),
    { reposo: hexDe(posavasos.reposo), encima: hexDe(posavasos.encima), veta: hexDe(vetaMasOscura), contraste: Number(contraste(posavasos.reposo, vetaMasOscura).toFixed(3)) },
  );
  comprobar(
    'y salen del atlas y no de un hexadecimal suelto: la celda oscura al 70 % y al 85 %, y delta.tsx pinta los dos zócalos con POSAVASOS.reposo / POSAVASOS.encima de coloresDelPosavasos, sin rastro de la paja clara',
    POSAVASOS_SOBRE_LA_MADERA_OSCURA.reposo === 0.7 &&
      POSAVASOS_SOBRE_LA_MADERA_OSCURA.encima === 0.85 &&
      /coloresDelPosavasos\(\)/.test(fuente) &&
      (fuente.match(/POSAVASOS\.encima : POSAVASOS\.reposo/g) ?? []).length === 2 &&
      !/#c8b48a|#f0e3c2/i.test(soloCodigo(fuente)),
  );

  comprobar(
    'la Barra pinta la tapa con las geometrías contadas —geometriaDeLaTapa con segmentosDeLaMesa(ancho) y FILAS_DE_LA_MESA, geometriaDeLasSombras, geometriaDelTapete— y la coloca con tapaDeLaMesa del primer hueco',
    /geometriaDeLaTapa\(segmentos, FILAS_DE_LA_MESA, tapa\.ancho, tapa\.fondo, madera\)/.test(fuente) &&
      /const segmentos = segmentosDeLaMesa\(forma\.ancho\);/.test(fuente) &&
      /geometriaDeLasSombras\(/.test(fuente) &&
      /geometriaDelTapete\(sitioDeLosDados\.ancho/.test(fuente) &&
      /tapaDeLaMesa\(primero, forma\.campo, forma\.proporcion\)/.test(fuente) &&
      /position=\{\[0, tapa\.cota, tapa\.centroZ\]\}\s+geometry=\{geometriaDelTablon\}/.test(fuente),
  );
  comprobar(
    'la madera es MeshStandardMaterial blanco con vertexColors —ni textura ni ShaderMaterial— y la placa de #0d1f1a al 42 % ya no está',
    /<meshStandardMaterial vertexColors roughness=\{RUGOSIDAD_DE_LA_MADERA\} \/>/.test(fuente) &&
      !/opacity=\{0\.42\}/.test(fuente) &&
      !/shaderMaterial|ShaderMaterial|useTexture|TextureLoader/.test(fuente.slice(fuente.indexOf('function Barra('), fuente.indexOf('function encajeEnUnCuadrado'))),
  );
  comprobar(
    'los zócalos se pintan con ZOCALO de barra.ts —centro, radio y alto— en las piezas y en el mazo, y no con números sueltos: la cota de la tapa sale de los mismos',
    (fuente.match(/-hueco\.lado \* ZOCALO\.centro/g) ?? []).length === 2 &&
      (fuente.match(/hueco\.lado \* ZOCALO\.radio, hueco\.lado \* ZOCALO\.alto/g) ?? []).length === 2 &&
      !/hueco\.lado \* 0\.42/.test(fuente) &&
      Math.abs(ZOCALO.centro + ZOCALO.alto / 2 - 0.48) < 1e-12,
  );
  /*
   * ── LA LLAVE DEL REPARTO ES `dados !== null` (§4.4) ──
   *
   * Con dados, `huecosDeLaMesa(...).piezas` para las piezas y `.dados` para el asa y el
   * tapete, colgado o quinto; sin dados, `huecosDeLaBarra` y el tapete sólo bajo el
   * COLGADO. Se lee del texto porque el resultado no lo distingue: pedir la mesa sin dados
   * reservaría en la colocación de pie un hueco para unos dados que no existen y las
   * piezas se moverían al empezar a jugar.
   */
  comprobar(
    'la llave del reparto es dados !== null: con dados huecosDeLaMesa(cuantos, campo, proporcion, alto) y sus .piezas y .dados; sin dados sigue huecosDeLaBarra y el tapete sólo bajo el sitio COLGADO',
    /const conDados = dados !== null;/.test(fuente) &&
      /conDados \? huecosDeLaMesa\(cuantos, forma\.campo, forma\.proporcion, forma\.alto\) : null/.test(fuente) &&
      /mesa === null \? huecosDeLaBarra\(cuantos, forma\.campo, forma\.proporcion\) : mesa\.piezas/.test(fuente) &&
      /if \(mesa !== null\) return mesa\.dados;/.test(fuente) &&
      /sitio !== null && sitio\.forma === 'colgado' \? sitio : null/.test(fuente) &&
      /colorDelColono\(tapete\)/.test(fuente) &&
      !/turnoDe.*#[0-9a-f]{6}/i.test(fuente),
  );
  comprobar(
    'el tapete se apaga con ultimaTirada = 0 (antes de la primera tirada) y sólo con dados: hayTapete lleva la llave y el <mesh> del tapete la pregunta',
    /const tapeteApagado = dados !== null && dados\.ultimaTirada === 0;/.test(fuente) &&
      /const hayTapete = tapete !== null && !tapeteApagado;/.test(fuente) &&
      /tapa !== null &&\s+hayTapete &&\s+sitioDeLosDados !== null &&/.test(fuente),
  );
  /*
   * ── `Dados`: `disponible` es la ÚNICA llave, el asa por colorWrite, el modelo y el respaldo ──
   *
   * Se lee el trozo de `delta.tsx` que va de `function Dados(` al siguiente componente.
   * Lo que se impide: que el toque o la vibración miren otra bandera (`porTirar`, el
   * turno), que el asa se esconda con `visible={false}` (r3f no le daría el toque), y que
   * `Dados` deje de buscar `MODELO.dado` o pierda el respaldo (sin `dados.glb` no habría
   * dados y nada se pondría rojo).
   */
  const trozoDeDados = fuente.slice(fuente.indexOf('function Dados('), fuente.indexOf('function encajeEnUnCuadrado'));
  const sinComentariosDeDados = soloCodigo(trozoDeDados);
  comprobar(
    'Dados existe y sólo empuja tocado y llama a onPulsar si dados.disponible; la vibración (sacudida) va dentro de if (disponible); y ni porTirar ni turno se leen en toda la escena',
    trozoDeDados.length > 0 &&
      /if \(!dados\.disponible\) return;\s+cola\.current\.push\(\{ que: 'tocado' \}\);\s+void onPulsar\(\)/.test(sinComentariosDeDados) &&
      /if \(disponible\) \{\s+const s = sacudida\(/.test(sinComentariosDeDados) &&
      (sinComentariosDeDados.match(/sacudida\(/g) ?? []).length === 1 &&
      !/porTirar|meToca|turnoDe/.test(sinComentariosDeDados) &&
      !/porTirar/.test(soloCodigo(fuente)),
  );
  comprobar(
    'el asa de los dados es UNA, de 1,6 lados por 1, con el fondo que dice `ASA_DEL_HUECO` y no un 0,8 suelto, invisible por colorWrite, con stopPropagation y loCogeLaInterfaz antes de mirar disponible; los cubos no reciben rayos',
    /<boxGeometry args=\{\[sitio\.ancho, sitio\.alto, lado \* ASA_DEL_HUECO\.fondo\]\} \/>\s+<meshBasicMaterial colorWrite=\{false\} depthWrite=\{false\} \/>/.test(trozoDeDados) &&
      !/visible=\{false\}/.test(trozoDeDados) &&
      /e\.stopPropagation\(\);\s+loCogeLaInterfaz\(e\.nativeEvent\);\s+if \(!dados\.disponible\) return;/.test(sinComentariosDeDados) &&
      (trozoDeDados.match(/raycast=\{\(\) => null\}/g) ?? []).length === 3,
  );
  comprobar(
    'Dados busca MODELO.dado en el catálogo, lo escala con ARISTA_DEL_DADO · lado / ARISTA_DEL_D6_EN_EL_PACK y pinta el respaldo de cubo-del-dado.ts si no está; la máquina faseDeLosDados es la única que decide la fase',
    /modelo=\{aplanados\.get\(MODELO\.dado\)\}/.test(fuente) &&
      /const arista = ARISTA_DEL_DADO \* lado;/.test(trozoDeDados) &&
      /const escalaDelPack = arista \/ ARISTA_DEL_D6_EN_EL_PACK;/.test(trozoDeDados) &&
      /geometriaDelCuerpoDelDado\(arista\), puntos: geometriaDeLosPuntosDelDado\(arista\)/.test(trozoDeDados) &&
      /cuaternionDelValor\(valor, giroDelDadoAsentado\(i, selloDelPar\)/.test(trozoDeDados) &&
      (sinComentariosDeDados.match(/faseDeLosDados\(/g) ?? []).length === 2 &&
      !/fase\.fase = |fase = \{ fase:/.test(sinComentariosDeDados),
  );
  /*
   * Rodar arranca de la ÚLTIMA POSE REAL fuera de rodar, guardada en `enReposo`: en cada
   * fotograma de «quieta» (antes del temblor) y en cada fotograma de «asentando» (la
   * máquina encadena asentando → rodando cuando otra tirada llega en esos 0,35 s; sin la
   * segunda copia el dado saltaba en seco a la pose de ANTES de la tirada anterior). No se
   * recalcula el par anterior con el sello visto: ese sello ya es el nuevo cuando la tirada
   * de otro cambia fase y sello en el mismo tic, y el primer fotograma de rodar daba un
   * cuarto o media vuelta seca. El asentado sigue partiendo del último fotograma de rodar
   * (`alDejarDeRodar`). Se exigen EXACTAMENTE dos copias, una en cada sitio.
   */
  comprobar(
    'rodar parte de la última pose real fuera de rodar (enReposo: en quieta sin el temblor, y en asentando por si otra tirada encadena) y no recalcula el par anterior con el sello visto; el asentado sigue partiendo del último fotograma de rodar',
    /if \(fase\.fase === 'rodando'\) \{[\s\S]*?g\.quaternion\.copy\(enReposo\.current\[i\]\)\.premultiply\(rodar\.current\);[\s\S]*?alDejarDeRodar\.current\[i\]\.copy\(g\.quaternion\);\s+continue;/.test(sinComentariosDeDados) &&
      !/fase\.anterior/.test(sinComentariosDeDados) &&
      /g\.quaternion\.copy\(objetivo\.current\[i\]\);\s+enReposo\.current\[i\]\.copy\(g\.quaternion\);\s+alDejarDeRodar\.current\[i\]\.copy\(g\.quaternion\);\s+if \(disponible\)/.test(sinComentariosDeDados) &&
      (sinComentariosDeDados.match(/enReposo\.current\[i\]\.copy\(/g) ?? []).length === 2 &&
      /slerpQuaternions\(alDejarDeRodar\.current\[i\], objetivo\.current\[i\], avanceDelAsentado\(transcurrido\)\);\s+enReposo\.current\[i\]\.copy\(g\.quaternion\);\s+g\.position\.y \+= reboteDelDado/.test(sinComentariosDeDados),
  );
  comprobar(
    'las sombras de los dos dados se AÑADEN a la lista de centros de las sombras de los huecos: una geometría, una llamada, y su radio es RADIO_DE_LA_SOMBRA_DEL_DADO',
    /centros\.push\(\{\s+x: sitioDeLosDados\.x \+ centroDelDado\(i\) \* sitioDeLosDados\.lado,/.test(fuente) &&
      /radio: sitioDeLosDados\.lado \* RADIO_DE_LA_SOMBRA_DEL_DADO,/.test(fuente) &&
      /geometriaDeLasSombras\(centros\)/.test(fuente) &&
      (soloCodigo(fuente).match(/geometriaDeLasSombras\(/g) ?? []).length === 1,
  );
  comprobar(
    'la sombra de cada hueco tiene el radio del zócalo más lo que asoma, y va un pelo sobre la tapa',
    RADIO_DE_LA_SOMBRA > ZOCALO.radio && RADIO_DE_LA_SOMBRA <= 0.7 && /radio: h\.lado \* RADIO_DE_LA_SOMBRA/.test(fuente) && /tapa\.cota \+ SOBRE_LA_TAPA/.test(fuente),
  );
}

// ---------------------------------------------------------------------------
paso('Recoger la mesa: la bajada tapa el asa PROYECTADA en los quince lienzos, el mando no roba toque a ninguna, y abajo no se monta nada');
// ---------------------------------------------------------------------------

/**
 * LA FASE 4 (§6): QUÉ SE COMPRA AQUÍ Y QUÉ NO.
 *
 * Se compra la ARITMÉTICA —cuánto baja, qué queda por encima del canto después de bajar, y
 * dónde cabe el mando de recoger sin robarle toque a la mesa— en los quince lienzos, y la
 * FORMA del código que la usa. Lo que NO se compra es que se vea bien bajar: para eso está
 * el banco (`escritorio/banco3d.html`, mandos «Recoger / Sacar la mesa» y «Ahora te toca»).
 *
 * ═══ TODO SE PROYECTA CON LA CÁMARA, Y ÉSE ES EL ARREGLO ═══
 *
 * La primera versión de este bloque medía con una regla de tres plana sobre el alto visible
 * A LA DISTANCIA DE LA BARRA, o sea tratando cada cosa como un PUNTO en el plano `z = −2`.
 * Y la mesa no es plana: el asa es una caja de `0,8` lados de fondo girada 39,6°, los dados
 * son cubos que giran y la tapa llega hasta `z = −2 − 0,6·lado`. La cara trasera de una
 * caja se ve MÁS ARRIBA que su centro y la cercana MÁS ABAJO Y MÁS A LOS LADOS, así que con
 * la cuenta plana este bloque salía verde con el techo del asa entre 10,8 y 36,6 puntos por
 * encima del canto y con el mando de recoger comiéndose la esquina de un asa. Aquí ahora se
 * proyectan los OCHO vértices de cada caja y las CUATRO esquinas de cada plano, como ya
 * hacía la única línea que estaba bien: la del borde trasero de la tapa.
 *
 * ═══ LOS CUATRO FALLOS QUE ESTO CAZA ═══
 *
 *   1. Que la bajada se quede corta y asome el filo de un asa por el canto. Una mesa medio
 *      recogida no se lee como una mesa recogida: se lee como algo roto. Y las asas están
 *      montadas y vivas durante los 0,28 s que dura, así que no basta con desmontarlas.
 *   2. Que el mando de recoger se coma un trozo de asa. El mando está SIEMPRE, así que ese
 *      estorbo no aparecería al recoger sino todo el rato, y en silencio: la choza
 *      simplemente no se cogería desde esa esquina.
 *   3. Que la mesa baje pero siga viva. `visible` NO la saca de los sucesos —ni r3f ni
 *      `three` lo miran, y aquí se lee del paquete instalado—, así que lo que tiene que
 *      pasar es que no se MONTE nada.
 *   4. Que alguien vuelva a la cuenta plana. Las dos comprobaciones que la cazan están
 *      escritas al revés a propósito: exigen que la cuenta proyectada sea MAYOR que la
 *      plana y que el rincón de abajo NO dé para el mando, que son las dos cosas que la
 *      cuenta plana negaba.
 */
{
  const CAMPO = (45 * Math.PI) / 180;
  /* La lista `LIENZOS` es la de la cabecera del guion, común a todos los bloques. */
  const fuente = fs.readFileSync(path.join(import.meta.dirname ?? __dirname, '..', 'delta.tsx'), 'utf8');
  const soloCodigo = (texto: string): string =>
    texto.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l)).join('\n');
  const codigo = soloCodigo(fuente);

  /* ── 0. LO QUE EL MOTOR DICE DE VERDAD SOBRE `visible` ── */

  /*
   * LA PREMISA DE LA FASE 4 ERA FALSA, Y ESTO NO LA DEJA VOLVER.
   *
   * `delta.tsx` afirmaba en cuatro sitios que «r3f descarta de sus sucesos los objetos
   * invisibles». Se leyó el paquete instalado y no es cierto: el `intersect` de
   * `@react-three/fiber` recorre `state.internal.interaction` —donde entra toda malla con
   * manejadores y `raycast !== null`, sin mirar `visible`— y traza con
   * `state.raycaster.intersectObject(obj, true)`; y el `Raycaster` de `three` sólo filtra
   * por `layers` antes de llamar a `object.raycast`. Con esa creencia, apagar el grupo
   * dejaba las asas cogiendo toques bajo el canto.
   *
   * Se lee del disco y no se copia la conclusión: el día que r3f empiece a mirar `visible`
   * —que sería una buena noticia— esto se pone rojo y hay que reescribir las cabeceras que
   * hoy dicen que no lo mira. Si el fichero no está, es un fallo y no un salto: un
   * comprobador que se salta lo que no encuentra se lee como verde.
   */
  const pedir = createRequire(import.meta.url);
  const leerDelMotor = (): { fiber: string; raycaster: string; malla: string } | null => {
    try {
      const dist = path.dirname(pedir.resolve('@react-three/fiber'));
      const sucesos = fs.readdirSync(dist).find((n) => /^events-.*\.cjs\.dev\.js$/.test(n));
      /* `three` no exporta su `package.json`, así que la raíz se saca de su `build/`. */
      const raiz = path.dirname(path.dirname(pedir.resolve('three')));
      if (sucesos === undefined) return null;
      return {
        fiber: fs.readFileSync(path.join(dist, sucesos), 'utf8'),
        raycaster: fs.readFileSync(path.join(raiz, 'src', 'core', 'Raycaster.js'), 'utf8'),
        malla: fs.readFileSync(path.join(raiz, 'src', 'objects', 'Mesh.js'), 'utf8'),
      };
    } catch {
      return null;
    }
  };
  const motor = leerDelMotor();
  const trozoDelIntersect =
    motor === null ? '' : motor.fiber.slice(motor.fiber.indexOf('function intersect(event, filter)'), motor.fiber.indexOf('// Collect events'));
  comprobar(
    'ni la tubería de sucesos de @react-three/fiber ni el Raycaster de three miran `object.visible`: apagar un grupo NO le quita los rayos, y por eso la mesa recogida se DESMONTA en vez de apagarse',
    motor !== null &&
      trozoDelIntersect.length > 200 &&
      !/visible/.test(trozoDelIntersect) &&
      /state\.raycaster\.intersectObject\(obj, true\)/.test(trozoDelIntersect) &&
      /instance\.eventCount && object\.raycast !== null/.test(motor.fiber) &&
      !/visible/.test(motor.raycaster) &&
      !/visible/.test(motor.malla),
    motor === null ? 'no se ha podido leer el motor de node_modules' : { largoDelIntersect: trozoDelIntersect.length },
  );

  /* ── 1. LA BAJADA: nada del grupo queda sobre el canto, proyectado de verdad ── */

  /*
   * LAS DOS FORMAS QUE HAY EN LA MESA, en puntos de mundo y en coordenadas de la cámara.
   * Una caja da ocho vértices y un plano cuatro esquinas; los dos se proyectan igual.
   */
  const verticesDeLaCaja = (
    centro: readonly [number, number, number],
    medias: readonly [number, number, number],
    giro: number,
  ): Array<[number, number, number]> => {
    const sen = Math.sin(giro);
    const cos = Math.cos(giro);
    const salida: Array<[number, number, number]> = [];
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const x = sx * medias[0];
          const z = sz * medias[2];
          salida.push([centro[0] + x * cos + z * sen, centro[1] + sy * medias[1], centro[2] + (-x * sen + z * cos)]);
        }
      }
    }
    return salida;
  };
  /* Un plano horizontal es una caja de media altura cero: sus cuatro esquinas salen solas. */
  const esquinasDelPlano = (
    centro: readonly [number, number, number],
    medias: readonly [number, number],
    giro = 0,
  ): Array<[number, number, number]> => verticesDeLaCaja(centro, [medias[0], 0, medias[1]], giro);
  /* Cuánto queda un punto POR ENCIMA del canto de abajo, en puntos. Negativo: ya no se ve. */
  const sobreElCanto = (p: readonly [number, number, number], bajada: number, altoPt: number): number =>
    ((1 + (p[1] - bajada) / (-p[2] * Math.tan(CAMPO / 2))) / 2) * altoPt;
  /* Y dónde cae en la pantalla, desde la esquina de abajo a la izquierda, en puntos. */
  const enPantalla = (p: readonly [number, number, number], anchoPt: number, altoPt: number): [number, number] => {
    const t = Math.tan(CAMPO / 2);
    return [
      ((1 + p[0] / (-p[2] * t * (anchoPt / altoPt))) / 2) * anchoPt,
      ((1 + p[1] / (-p[2] * t)) / 2) * altoPt,
    ];
  };

  /*
   * LAS CIFRAS SE LEEN DE LA ESCENA, no se copian aquí: el naipe y la pieza, de sus
   * constantes en `delta.tsx`; las asas, de que su `boxGeometry` pide `ASA_DEL_HUECO` a
   * `barra.ts` —la misma tabla que usa `bajadaDeLaMesa`—; el giro, de que las dos vitrinas
   * usan `GIRO_DE_LA_VITRINA` importado de allí; y el dado, de las constantes de `dados.ts`.
   * Copiadas, esto seguiría verde con el naipe asomando.
   */
  /*
   * Se NIEGA si el ancla no aparece, y no devuelve NaN.
   *
   * Devolvia NaN, y NaN no rompe nada: toda comparacion con el sale falsa, asi que la
   * comprobacion de que no asoma nada por el canto seguia VERDE midiendo con nada. Un
   * renombre inocente en la escena dejaba ciego al guion sin ponerlo rojo, que es
   * exactamente lo que estas seis anclas existen para evitar.
   */
  const numeroDe = (patron: RegExp): number => {
    const hallado = patron.exec(fuente)?.[1];
    if (hallado === undefined) {
      throw new Error(
        `verificar-escena: la escena ya no dice ${String(patron)}, asi que el numero que se leia de ahi no existe.`,
      );
    }
    return Number(hallado);
  };
  const altoDelNaipe = numeroDe(/const ALTO_DEL_NAIPE_EN_LA_BARRA = ([0-9.]+);/);
  const anchoDelNaipe = numeroDe(/const ANCHO_DEL_NAIPE_EN_LA_BARRA = ([0-9.]+);/);
  const parteDelHueco = numeroDe(/encajeEnUnCuadrado\(mallas, hueco\.lado \* ([0-9.]+)\)/);
  const creceConElRaton = numeroDe(/const crece = encima \|\| tomada \? ([0-9.]+) : 1;/);
  const subeConElRaton = numeroDe(/const sube = encima \|\| tomada \? hueco\.lado \* ([0-9.]+) : 0;/);
  /* El filo del naipe es una malla aparte con `scale`, y es la que manda: agranda el naipe. */
  const filoDelNaipe = numeroDe(/<mesh geometry=\{naipe\} position=\{\[0, 0, -0\.002\]\} scale=\{([0-9.]+)\}/);
  const asaDeUnHueco =
    (codigo.match(
      /<boxGeometry\s+args=\{\[\s*hueco\.lado \* ASA_DEL_HUECO\.ancho,\s*hueco\.lado \* ASA_DEL_HUECO\.alto,\s*hueco\.lado \* ASA_DEL_HUECO\.fondo,\s*\]\}\s*\/>/g,
    ) ?? []).length === 2;
  const asaDeLosDados = /<boxGeometry args=\{\[sitio\.ancho, sitio\.alto, lado \* ASA_DEL_HUECO\.fondo\]\} \/>/.test(codigo);
  const giroDeLaVitrina = (codigo.match(/rotation=\{\[0, GIRO_DE_LA_VITRINA, 0\]\}/g) ?? []).length === 2;
  const desdeLaBarra = /^\s*GIRO_DE_LA_VITRINA,$/m.test(fuente.slice(fuente.indexOf('} from \'./barra\';') - 400, fuente.indexOf('} from \'./barra\';')));
  comprobar(
    'las dos asas y las dos vitrinas leen `ASA_DEL_HUECO` y `GIRO_DE_LA_VITRINA` de `barra.ts` —los mismos números con los que `bajadaDeLaMesa` mide—, y la pieza y el naipe traen los suyos escritos',
    asaDeUnHueco &&
      asaDeLosDados &&
      giroDeLaVitrina &&
      desdeLaBarra &&
      [altoDelNaipe, anchoDelNaipe, parteDelHueco, creceConElRaton, subeConElRaton].every((n) => Number.isFinite(n)),
    { asaDeUnHueco, asaDeLosDados, giroDeLaVitrina, desdeLaBarra, parteDelHueco, creceConElRaton, subeConElRaton },
  );

  /*
   * TODO LO QUE HAY EN EL GRUPO QUE BAJA, lienzo a lienzo, como cajas y planos de mundo.
   * Está la pieza con el ratón encima —`crece` y `sube`, que es la postura más alta que se
   * puede tener sin coger nada— porque el modelo NO estaba en la lista de antes y el día que
   * un modelo del pack crezca esto tiene que ponerse rojo. La pieza TOMADA no está: recoger
   * la mesa suelta lo cogido.
   */
  const piezasDeLaMesa = (
    anchoPt: number,
    altoPt: number,
  ): { hueco: HuecoDeLaBarra; partes: Array<[string, Array<[number, number, number]>]> } | null => {
    const proporcion = anchoPt / altoPt;
    const mesa = huecosDeLaMesa(4, CAMPO, proporcion, altoPt);
    const primero = mesa.piezas[0];
    if (primero === undefined) return null;
    const partes: Array<[string, Array<[number, number, number]>]> = [];
    for (const [i, h] of mesa.piezas.entries()) {
      const medias: [number, number, number] = [
        (ASA_DEL_HUECO.ancho / 2) * h.lado,
        (ASA_DEL_HUECO.alto / 2) * h.lado,
        (ASA_DEL_HUECO.fondo / 2) * h.lado,
      ];
      partes.push([`el asa del hueco ${String(i)}`, verticesDeLaCaja([h.x, h.y, h.z], medias, GIRO_DE_LA_VITRINA)]);
      const media = (parteDelHueco / 2) * creceConElRaton * h.lado;
      partes.push([
        `el modelo del hueco ${String(i)} con el ratón encima`,
        verticesDeLaCaja([h.x, h.y + subeConElRaton * h.lado, h.z], [media, media, media], GIRO_DE_LA_VITRINA),
      ]);
      partes.push([
        `el zócalo del hueco ${String(i)}`,
        /* El zócalo vive DENTRO del grupo girado de la vitrina: sin el giro se proyecta un 41 % más estrecho de lo que es. */
        verticesDeLaCaja([h.x, h.y - ZOCALO.centro * h.lado, h.z], [ZOCALO.radio * h.lado, (ZOCALO.alto / 2) * h.lado, ZOCALO.radio * h.lado], GIRO_DE_LA_VITRINA),
      ]);
    }
    const delMazo = mesa.piezas[mesa.piezas.length - 1];
    if (delMazo !== undefined) {
      /* Con el filo, que es la malla más grande de las dos y la que asoma primero. */
      const alto = delMazo.lado * altoDelNaipe * filoDelNaipe;
      partes.push([
        'el naipe del mazo con su filo',
        verticesDeLaCaja([delMazo.x, delMazo.y, delMazo.z], [(alto * anchoDelNaipe) / 2, alto / 2, 0], GIRO_DE_LA_VITRINA),
      ]);
    }
    const tapa = tapaDeLaMesa(primero, CAMPO, proporcion);
    partes.push([
      'la tapa',
      esquinasDelPlano([0, tapa.cota, tapa.centroZ], [tapa.ancho / 2, tapa.fondo / 2]),
    ]);
    for (const [i, h] of mesa.piezas.entries()) {
      partes.push([
        `la sombra del hueco ${String(i)}`,
        esquinasDelPlano([h.x, tapa.cota + SOBRE_LA_TAPA, h.z], [RADIO_DE_LA_SOMBRA * h.lado, RADIO_DE_LA_SOMBRA * h.lado]),
      ]);
    }
    if (mesa.dados !== null) {
      const d = mesa.dados;
      partes.push([
        'el asa de los dados',
        verticesDeLaCaja([d.x, d.y, d.z], [d.ancho / 2, d.alto / 2, (ASA_DEL_HUECO.fondo / 2) * d.lado], 0),
      ]);
      partes.push([
        'el tapete del turno',
        esquinasDelPlano([d.x, tapa.cota + SOBRE_LA_TAPA, d.z], [d.ancho / 2, (d.lado * FONDO_DEL_TAPETE) / 2]),
      ]);
      /* El cubo gira, así que lo que asoma es su esfera de media diagonal, arriba y hacia acá. */
      const media = ((ARISTA_DEL_DADO * Math.sqrt(3)) / 2) * d.lado;
      for (const i of [0, 1] as const) {
        partes.push([
          `el dado ${String(i)} en lo alto del salto`,
          verticesDeLaCaja(
            [
              d.x + centroDelDado(i) * d.lado,
              cotaDeLaTapa(primero) + (CENTRO_DEL_DADO_SOBRE_LA_TAPA + SALTO_DEL_DADO) * d.lado,
              d.z,
            ],
            [media, media, media],
            0,
          ),
        ]);
        partes.push([
          `la sombra del dado ${String(i)}`,
          esquinasDelPlano(
            [d.x + centroDelDado(i) * d.lado, tapa.cota + SOBRE_LA_TAPA, d.z],
            [RADIO_DE_LA_SOMBRA_DEL_DADO * d.lado, RADIO_DE_LA_SOMBRA_DEL_DADO * d.lado],
          ),
        ]);
      }
    }
    return { hueco: primero, partes };
  };

  const asomando: string[] = [];
  const enPuntos: Record<string, number> = {};
  const loQueGanaALaPlana: number[] = [];
  const loQueAsomabaConLaPlana: number[] = [];
  for (const [nombre, anchoPt, altoPt] of LIENZOS) {
    const proporcion = anchoPt / altoPt;
    const { alto } = loQueSeVe(CAMPO, proporcion);
    const puntosPorUnidad = altoPt / alto;
    const mesa = piezasDeLaMesa(anchoPt, altoPt);
    if (mesa === null) {
      asomando.push(`${nombre}: sin huecos`);
      continue;
    }
    const bajada = bajadaDeLaMesa(mesa.hueco, CAMPO, proporcion);
    enPuntos[nombre] = bajada * puntosPorUnidad;
    /* La cuenta plana de antes: el asa como un punto en el plano de la barra. */
    const plana = alto / 2 + mesa.hueco.y + mesa.hueco.lado / 2;
    loQueGanaALaPlana.push((bajada - plana) * puntosPorUnidad);
    let peorConLaPlana = -Infinity;
    for (const [que, vertices] of mesa.partes) {
      for (const v of vertices) {
        const queda = sobreElCanto(v, bajada, altoPt);
        if (queda > 1e-6) asomando.push(`${nombre}: ${que} asoma ${queda.toFixed(2)} pt`);
        peorConLaPlana = Math.max(peorConLaPlana, sobreElCanto(v, plana, altoPt));
      }
    }
    loQueAsomabaConLaPlana.push(peorConLaPlana);
  }
  comprobar(
    'con la mesa recogida no asoma NADA por el canto de abajo en ninguno de los quince lienzos: proyectados con la cámara los ocho vértices de cada caja —asas, modelos con el ratón encima, dados saltando— y las cuatro esquinas de cada plano —tapa, sombras, tapete—',
    asomando.length === 0,
    asomando.slice(0, 4),
  );
  /*
   * Y LA CUENTA PLANA SE QUEDABA CORTA, escrito al revés a propósito: si alguien vuelve a
   * `alto/2 + hueco.y + 0,5·lado` estas dos cifras se van a cero y esto se pone rojo. Medido:
   * la proyectada baja entre 11,6 y 39,3 puntos más, y con la plana el asa se quedaba entre
   * 10,8 y 36,6 puntos por encima del canto.
   */
  const menosQueGana = Math.min(...loQueGanaALaPlana);
  const masQueGana = Math.max(...loQueGanaALaPlana);
  const menosQueAsomaba = Math.min(...loQueAsomabaConLaPlana);
  const masQueAsomaba = Math.max(...loQueAsomabaConLaPlana);
  comprobar(
    'la bajada proyectada baja de 11,6 a 39,3 puntos MÁS que la cuenta plana que había, y con la plana el techo del asa se quedaba de 10,8 a 36,6 puntos por encima del canto: el fallo era de verdad y no vuelve sin ponerse rojo',
    Math.abs(menosQueGana - 11.63) <= 0.1 &&
      Math.abs(masQueGana - 39.26) <= 0.1 &&
      Math.abs(menosQueAsomaba - 10.85) <= 0.1 &&
      Math.abs(masQueAsomaba - 36.6) <= 0.1,
    {
      gana: `${menosQueGana.toFixed(2)} a ${masQueGana.toFixed(2)} pt`,
      asomaba: `${menosQueAsomaba.toFixed(2)} a ${masQueAsomaba.toFixed(2)} pt`,
    },
  );
  /*
   * Y LAS TRES CIFRAS DEL §6, para que el documento y el código no se separen. Eran 72, 88 y
   * 243 puntos con la cuenta plana; con el asa proyectada de verdad son 84, 102 y 282, y el
   * §6 hay que corregirlo con ellas. Se comprueban con un punto de holgura, que es menos de
   * lo que se ve.
   */
  const comoDiceElDiseno: Array<[string, number]> = [
    ['apaisado SE 1ª', 84],
    ['apaisado iPhone 14', 102],
    ['apaisado monitor 1080', 282],
  ];
  comprobar(
    'y la bajada mide lo que tiene que decir el §6 con el asa proyectada: 84 puntos en el SE apaisado, 102 en un iPhone 14 y 282 en un monitor a 1080',
    comoDiceElDiseno.every(([nombre, puntos]) => Math.abs((enPuntos[nombre] ?? 0) - puntos) <= 1),
    comoDiceElDiseno.map(([nombre]) => `${nombre}: ${(enPuntos[nombre] ?? 0).toFixed(1)} pt`),
  );

  /* ── 2. EL MANDO DE RECOGER: dónde cabe y dónde no, con la caja proyectada ── */

  /*
   * ¿SE CORTAN DOS CONVEXOS? Eje separador sobre las normales de los dos. Hace falta porque
   * la silueta de una caja girada es un HEXÁGONO, no un rectángulo: medir con su caja
   * envolvente diría que el mando pisa el asa donde no la pisa, y esto tiene que decidir un
   * sitio, no asustar.
   */
  const seCortan = (a: ReadonlyArray<[number, number]>, b: ReadonlyArray<[number, number]>): boolean => {
    for (const poli of [a, b]) {
      for (let i = 0; i < poli.length; i++) {
        const p = poli[i] as [number, number];
        const q = poli[(i + 1) % poli.length] as [number, number];
        const eje: [number, number] = [-(q[1] - p[1]), q[0] - p[0]];
        let a0 = Infinity;
        let a1 = -Infinity;
        let b0 = Infinity;
        let b1 = -Infinity;
        for (const v of a) {
          const d = v[0] * eje[0] + v[1] * eje[1];
          a0 = Math.min(a0, d);
          a1 = Math.max(a1, d);
        }
        for (const v of b) {
          const d = v[0] * eje[0] + v[1] * eje[1];
          b0 = Math.min(b0, d);
          b1 = Math.max(b1, d);
        }
        if (a1 <= b0 + 1e-9 || b1 <= a0 + 1e-9) return false;
      }
    }
    return true;
  };
  /* El casco convexo de una nube de puntos de pantalla, en orden (Andrew). */
  const casco = (puntos: ReadonlyArray<[number, number]>): Array<[number, number]> => {
    const p = [...puntos].sort((u, v) => u[0] - v[0] || u[1] - v[1]);
    const cruz = (o: [number, number], u: [number, number], v: [number, number]): number =>
      (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
    const media = (orden: Array<[number, number]>): Array<[number, number]> => {
      const pila: Array<[number, number]> = [];
      for (const q of orden) {
        while (pila.length >= 2 && cruz(pila[pila.length - 2] as [number, number], pila[pila.length - 1] as [number, number], q) <= 0) pila.pop();
        pila.push(q);
      }
      pila.pop();
      return pila;
    };
    return [...media(p), ...media([...p].reverse())];
  };
  /* La silueta en pantalla de cada asa del lienzo: lo único que el mando no puede tocar. */
  const siluetasDeLasAsas = (anchoPt: number, altoPt: number): Array<[string, Array<[number, number]>]> => {
    const mesa = piezasDeLaMesa(anchoPt, altoPt);
    if (mesa === null) return [];
    return mesa.partes
      .filter(([que]) => que.startsWith('el asa'))
      .map(([que, vertices]) => [que, casco(vertices.map((v) => enPantalla(v, anchoPt, altoPt)))] as [string, Array<[number, number]>]);
  };
  const cuadrado = (x: number, y: number, lado: number): Array<[number, number]> => [
    [x, y],
    [x + lado, y],
    [x + lado, y + lado],
    [x, y + lado],
  ];

  /*
   * PRIMERO, POR QUÉ EL MANDO NO ESTÁ ABAJO. La barra está CENTRADA y ocupa el 70 % del
   * ancho, así que deja lo mismo a los dos lados; con la silueta proyectada el cuadrado más
   * grande que cabe en el rincón de abajo con 4 de margen es de 37,2 puntos en 320×360, por
   * debajo del suelo de 44. Con la cuenta PLANA salían 48 —y ahí estuvo el mando, comiéndose
   * la esquina del asa de la choza—, así que esta comprobación es exactamente la que la
   * cuenta plana negaba: si alguien vuelve a medir con el rectángulo del plano, se cae.
   */
  const MARGEN_DE_ANTES = 4;
  const cabeAbajo = (anchoPt: number, altoPt: number, margen: number): number => {
    const siluetas = siluetasDeLasAsas(anchoPt, altoPt).map(([, s]) => s);
    for (let lado = 120; lado >= 0; lado -= 0.1) {
      if (!siluetas.some((s) => seCortan(s, cuadrado(margen, margen, lado)))) return lado;
    }
    return 0;
  };
  const libreAbajo = cabeAbajo(320, 360, MARGEN_DE_ANTES);
  const conLaPlana = (((): number => {
    const proporcion = 320 / 360;
    const { alto, ancho } = loQueSeVe(CAMPO, proporcion);
    const h = huecosDeLaMesa(4, CAMPO, proporcion, 360).piezas[0];
    if (h === undefined) return 0;
    const puntosPorUnidad = 360 / alto;
    return (
      Math.max((h.x - h.lado / 2 + ancho / 2) * puntosPorUnidad, (h.y - h.lado / 2 + alto / 2) * puntosPorUnidad) -
      MARGEN_DE_ANTES
    );
  })());
  comprobar(
    'abajo NO cabe: con la silueta proyectada del asa, el cuadrado libre en el rincón de abajo a la izquierda de 320×360 es de 37,2 puntos con 4 de margen, por debajo del suelo de toque; con el rectángulo plano salían 44 y por eso el mando estuvo ahí comiéndose la esquina de la choza',
    Math.abs(libreAbajo - 37.2) <= 0.2 &&
      libreAbajo < SUELO_DEL_TOQUE &&
      conLaPlana >= SUELO_DEL_TOQUE,
    { proyectada: libreAbajo.toFixed(1), plana: conLaPlana.toFixed(1), suelo: SUELO_DEL_TOQUE },
  );

  /*
   * Y AHORA, DONDE ESTÁ. El mando vive arriba, debajo del otro mando del lienzo, con
   * `MANDO_DE_RECOGER` (`mesa.ts`) diciendo el lado, el margen y cuánto baja. Se prueba por
   * los DOS lados —izquierda como la app, derecha como el escritorio, que cada uno hereda la
   * esquina de su mando de volver— y contra la silueta de TODAS las asas, no sólo la primera.
   * Devuélvelo abajo a la izquierda y esto se cae en 320×360.
   */
  const pisados: string[] = [];
  const holguras: string[] = [];
  for (const [nombre, anchoPt, altoPt] of LIENZOS) {
    const siluetas = siluetasDeLasAsas(anchoPt, altoPt);
    if (siluetas.length === 0) {
      pisados.push(`${nombre}: sin asas que medir`);
      continue;
    }
    const arriba = altoPt - MANDO_DE_RECOGER.margen - MANDO_DE_RECOGER.bajoElOtroMando - MANDO_DE_RECOGER.lado;
    for (const [lado, x] of [
      ['izquierda', MANDO_DE_RECOGER.margen],
      ['derecha', anchoPt - MANDO_DE_RECOGER.margen - MANDO_DE_RECOGER.lado],
    ] as const) {
      const mando = cuadrado(x, arriba, MANDO_DE_RECOGER.lado);
      for (const [que, silueta] of siluetas) {
        if (seCortan(silueta, mando)) pisados.push(`${nombre} (${lado}): el mando pisa ${que}`);
      }
    }
    let masAlta = -Infinity;
    for (const [, silueta] of siluetas) for (const v of silueta) masAlta = Math.max(masAlta, v[1]);
    holguras.push(`${nombre}: ${(arriba - masAlta).toFixed(1)}`);
  }
  comprobar(
    'el mando de recoger (44 cuadrado, 12 de margen, 52 por debajo del otro mando) no roba ni un punto de la silueta de ninguna asa en ninguno de los quince lienzos, ni pegado a la izquierda ni pegado a la derecha',
    pisados.length === 0,
    pisados.slice(0, 4),
  );
  /*
   * Y CUÁNTO SOBRA POR ABAJO, que es lo que hace que arriba sea sitio y no suerte: el asa más
   * alta de los quince se queda 134 puntos por debajo del canto de abajo del mando en el peor
   * lienzo (el SE apaisado, que es el más bajo). Se exige que el peor pase de cien: si un día
   * la barra sube o el mando baja, esto avisa antes de que se toquen.
   */
  const laMenorHolgura = Math.min(...holguras.map((h) => Number(h.split(': ')[1])));
  comprobar(
    'y arriba sobra sitio de verdad: entre el canto de abajo del mando y el asa más alta quedan 134 puntos en el peor de los quince, no un pelo',
    Math.abs(laMenorHolgura - 134) <= 1.5 && laMenorHolgura > 100,
    holguras,
  );
  /*
   * QUE LOS DOS MANDOS NO SE SOLAPEN NO SE MIDE EN PÍXELES DE RÓTULO: se apilan. El de
   * volver mide 44 de alto como mínimo (el suelo de toque) y arranca en `margen`; éste
   * arranca en `margen + bajoElOtroMando`. Con `bajoElOtroMando` = 52 quedan ocho puntos de
   * aire y no hay ancho que medir, que es justo lo que se quería: «Tablero entero» cambia de
   * ancho con el rótulo y el escritorio tiene otro texto.
   */
  comprobar(
    '«Recoger la mesa» va DEBAJO del otro mando del lienzo y no en la esquina de al lado: baja su alto entero más un dedo de aire, así que no hay ancho de rótulo que medir y los dos no pueden solaparse',
    MANDO_DE_RECOGER.bajoElOtroMando >= SUELO_DEL_TOQUE + 4 &&
      MANDO_DE_RECOGER.bajoElOtroMando - SUELO_DEL_TOQUE === 8 &&
      MANDO_DE_RECOGER.lado === SUELO_DEL_TOQUE &&
      MANDO_DE_RECOGER.margen === 12,
    MANDO_DE_RECOGER,
  );

  /* ── 3. LA FORMA DEL CÓDIGO: el grupo de dentro, la llegada, y el desmonte entero ── */

  const trozoDeLaBarra = soloCodigo(fuente.slice(fuente.indexOf('function Barra('), fuente.indexOf('function Dados(')));
  comprobar(
    '`Barra` recibe `recogida` y lo que baja es un grupo de DENTRO: el de fuera copia la cámara cada fotograma y le pisaría la posición',
    /recogida: boolean;/.test(trozoDeLaBarra) &&
      /const laQueBaja = useRef<THREE\.Group>\(null\);/.test(trozoDeLaBarra) &&
      /<group ref=\{grupo\} renderOrder=\{ORDEN_DE_LA_BARRA\}>\s*<group ref=\{laQueBaja\} renderOrder=\{ORDEN_DE_LA_BARRA\}>/.test(trozoDeLaBarra) &&
      /g\.position\.copy\(estado\.camera\.position\);/.test(trozoDeLaBarra),
  );
  /*
   * EL DESMONTE ENTERO, QUE ES LO QUE LA FASE 4 PEDÍA Y NO ESTABA.
   *
   * `visible` no saca nada de la lista de interacción de r3f (bloque 0 de aquí), así que lo
   * que hay que comprobar es que con `escondida` no se MONTE nada de la mesa. Se cuenta por
   * texto: todo lo que puede recibir un suceso dentro de `Barra` —la tapa, que desde la fase
   * 2b para el toque al tablero; las piezas; el naipe; los dados— tiene que estar DENTRO del
   * `{!escondida && (<>…</>)}` y no puede haber ni un manejador de puntero fuera de él.
   * Vuelve a montar cualquiera de los cuatro fuera del guardia y esto se cae.
   */
  const abreElGuardia = trozoDeLaBarra.indexOf('{!escondida && (');
  const cierraElGuardia = trozoDeLaBarra.indexOf('</>', abreElGuardia);
  const dentroDelGuardia =
    abreElGuardia < 0 || cierraElGuardia < 0 ? '' : trozoDeLaBarra.slice(abreElGuardia, cierraElGuardia);
  const jsxDeLaBarra = trozoDeLaBarra.slice(trozoDeLaBarra.indexOf('  return ('));
  const cuantos = (texto: string, patron: RegExp): number => (texto.match(patron) ?? []).length;
  const loQueRecibeToques: Array<[string, RegExp]> = [
    ['la tapa', /onPointerDown=\{paraElToque\}/g],
    ['las piezas', /<PiezaEnLaBarra/g],
    ['el naipe del mazo', /<MazoEnLaBarra/g],
    ['los dados', /<Dados/g],
  ];
  const fuera = loQueRecibeToques.filter(
    ([, patron]) => cuantos(jsxDeLaBarra, patron) !== 1 || cuantos(dentroDelGuardia, patron) !== 1,
  );
  comprobar(
    'con `escondida` la mesa no MONTA nada: la tapa, las piezas, el naipe y los dados viven todos dentro del `{!escondida && (<>…</>)}`, y no queda ni un manejador de puntero fuera de él —apagar con `visible` no le quitaba los rayos a ninguno—',
    dentroDelGuardia.length > 200 &&
      fuera.length === 0 &&
      cuantos(jsxDeLaBarra, /onPointer[A-Za-z]+=/g) === cuantos(dentroDelGuardia, /onPointer[A-Za-z]+=/g) &&
      !/visible=\{/.test(jsxDeLaBarra),
    { fuera: fuera.map(([que]) => que), manejadores: cuantos(jsxDeLaBarra, /onPointer[A-Za-z]+=/g) },
  );
  /*
   * Y LAS GEOMETRÍAS CARAS NO SE REHACEN AL RECOGER. El desmonte tira lo que cuelgue de los
   * hijos, así que los `useMemo` que hacen geometría tienen que vivir en `Barra`, por encima
   * del guardia: la tapa, las sombras, el tapete y las DOS del naipe del mazo, que estaban
   * dentro de `MazoEnLaBarra` y se habrían rehecho —y filtrado, porque nadie las tiraba— en
   * cada ida y vuelta. `MazoEnLaBarra` las recibe hechas y no llama a `formaDeCarta`.
   */
  const trozoDelMazo = soloCodigo(fuente.slice(fuente.indexOf('function MazoEnLaBarra('), fuente.indexOf('function Barra(')));
  comprobar(
    'las geometrías caras de la mesa se hacen en `Barra`, por encima del desmonte, y se tiran con un efecto: la tapa, las sombras, el tapete y las dos del naipe del mazo, que ahora llegan hechas al hijo',
    ['geometriaDelTablon', 'sombras', 'geometriaDelTapeteDelTurno', 'naipeDelMazo', 'iconoDelMazo'].every((que) =>
      trozoDeLaBarra.includes(`useEffect(() => () => ${que}?.dispose()`),
    ) &&
      /const naipeDelMazo = useMemo\(/.test(trozoDeLaBarra) &&
      /<MazoEnLaBarra[\s\S]*?naipe=\{naipeDelMazo\}[\s\S]*?icono=\{iconoDelMazo\}/.test(trozoDeLaBarra) &&
      !/formaDeCarta\(/.test(trozoDelMazo) &&
      !/geometriaDeContornos\(/.test(trozoDelMazo),
  );
  comprobar(
    'cuánto baja lo dice `bajadaDeLaMesa` de `mesa.ts` —la misma función que este guion mide— y no un número escrito en la escena, y se llega con la amortiguación de la casa',
    /const bajada = primero === undefined \? 0 : bajadaDeLaMesa\(primero, forma\.campo, forma\.proporcion\);/.test(trozoDeLaBarra) &&
      /const objetivo = recogida \? -bajada : 0;/.test(trozoDeLaBarra) &&
      /g\.position\.y \+= \(objetivo - g\.position\.y\) \* \(1 - Math\.exp\(-AMORTIGUACION_DE_LA_MESA \* delta\)\);/.test(trozoDeLaBarra) &&
      /LO_QUE_QUEDA_AL_LLEGAR \* Math\.max\(bajada, 1e-6\)/.test(trozoDeLaBarra),
  );
  /*
   * LA CONSTANTE DE TIEMPO ES LA QUE PIDE EL §6: 0,28 s. Con `1 − e^(−k·t)`, recorrer el
   * 99 % —que es lo que aquí se llama llegar— tarda `ln(1/0,01)/k`. Con `k = 16` salen
   * 0,288 s. Se comprueba la CUENTA y no el 16, para que el día que alguien cambie el 16 el
   * guion diga si sigue cumpliendo el diseño o no.
   */
  comprobar(
    'y tarda los 0,28 s del §6 en llegar: con la k de la amortiguación, el 99 % de la bajada sale en 0,288 s',
    Math.abs(Math.log(1 / LO_QUE_QUEDA_AL_LLEGAR) / AMORTIGUACION_DE_LA_MESA - 0.28) <= 0.02,
    Math.log(1 / LO_QUE_QUEDA_AL_LLEGAR) / AMORTIGUACION_DE_LA_MESA,
  );
  comprobar(
    'al llegar abajo se enciende `escondida` y con él se desmonta la mesa entera, dados incluidos: un solo estado y un solo sitio donde se enciende',
    /if \(recogida && llegada && !escondida\) ponerEscondida\(true\);/.test(trozoDeLaBarra) &&
      (trozoDeLaBarra.match(/ponerEscondida\(/g) ?? []).length === 2 &&
      (trozoDeLaBarra.match(/!escondida/g) ?? []).length === 2,
  );
  comprobar(
    'y se montan AL EMPEZAR A SUBIR, no al llegar arriba: el efecto de `recogida` apaga `escondida` en el mismo commit en que la entrada cambia',
    /useEffect\(\(\) => \{\s*if \(!recogida\) ponerEscondida\(false\);\s*\}, \[recogida\]\);/.test(trozoDeLaBarra),
  );
  comprobar(
    '`<Delta>` gana `mesaRecogida` opcional y se la pasa a la barra sin tocar `dados` ni `mazo`: son la llave del reparto y con `null` las piezas se moverían al recoger',
    /mesaRecogida = false,/.test(soloCodigo(fuente)) &&
      /mesaRecogida\?: boolean;/.test(fuente) &&
      /<Barra[\s\S]*?dados=\{dados\}[\s\S]*?recogida=\{mesaRecogida\}/.test(fuente) &&
      /<Barra[\s\S]*?mazo=\{mazo\}/.test(fuente),
  );
}

console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log('');
}

/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS».
 *
 * El número va a mano y hay que subirlo al añadir comprobaciones. Es a propósito: un
 * guion que se cae a la mitad termina con código cero y una lista corta de aciertos, y
 * eso se lee como verde. Con el número escrito, salir con menos es un fallo ruidoso.
 *
 * El suelo estuvo en ocho mientras el guion tenía ocho, y se quedó ahí mientras crecía
 * a veintitrés: durante ese tiempo el guion podía morirse en la novena sin que nadie se
 * enterara. Un guardia desfasado no guarda nada.
 */
const COMPROBACIONES_ESCRITAS = 352;
if (hechas < COMPROBACIONES_ESCRITAS) {
  console.error(
    `Solo se han hecho ${hechas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones que ` +
      'tiene escritas este guion: se ha caído por el camino sin decirlo. ' +
      'Si has añadido comprobaciones nuevas, sube el número.',
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
