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
  aristasDe,
  centroDeHex,
  esquinasDeHex,
  mallaDeRadio,
  puntoDeArista,
  puntoDeVertice,
  verticeDeHex,
  verticesDe,
  verticesDeArista,
} from '../../shared/mecanicas/malla-hexagonal';
import type { Punto } from '../../shared/mecanicas/malla-hexagonal';
import {
  colorDelBien,
  colorDeTerreno,
  colorLlanoDelJugador,
  COLUMNA_DEL_COLOR,
  COLUMNAS_DE_JUGADOR,
  FILO_DEL_ZOCALO,
  COLUMNAS_DEL_ATLAS,
  desplazamientoDeColor,
  esDelColorDelJugador,
  esDeUnColorDeJugador,
  FILAS_DEL_ATLAS,
  PALETA,
  puntosDeLaCifra,
  saltoAlColor,
  TERRENO_DEL_BIEN,
} from '../paleta';
import { EDIFICIOS_DEL_CASERIO, queVaEn } from '../poblar';
import { duenoDelCaserio, RADIO_DEL_CASERIO } from '../caserio';
import type { Fundacion } from '../caserio';
import { verticesVecinos } from '../../shared/mecanicas/malla-hexagonal';
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
  ARISTA_TOPE_DEL_DADO,
  aristaDelDado,
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
  ALTO_DEL_DIBUJO,
  ANCHO_DE_LA_TIRA,
  areasDeTrueque,
  DISTANCIA_DE_LA_BARAJA,
  enLaZonaDeLaMano,
  huecosDeLaBaraja,
  loQueSeVeEnLaBaraja,
  manoPorGrupos,
  ORDEN_DE_LOS_BIENES,
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
  AIRE_BAJO_LA_CALZADA,
  CAJA_DEL_PUENTE,
  LARGO_DEL_TRAMO,
  puenteEntre,
  SUPERFICIE_DEL_CAMINO,
} from '../puente';
import {
  BIENES_CON_ICONO,
  CARTAS_CON_ICONO,
  CIFRA_MAS_ALTA_CON_ICONO,
  CIFRAS_CON_ICONO,
  CONTORNOS_DE_LA_CARTA,
  CONTORNOS_DE_LA_CIFRA,
  CONTORNOS_DEL_BIEN,
} from '../iconos';
import { altoDeLaCinta, ALTO_DE_LA_CINTA, anchoDeLaCinta, BOTON_DE_LA_CINTA, cuantosSeVenEnElCarril, loQueLlevaLaCinta } from '../cinta';
import { selloDeLaTirada } from '../../shared/arcade/juegos/riberas-en-tres';
import { BIENES } from '../../shared/arcade/juegos/riberas';
import { MODELO, modeloDeBandera, modeloDePieza } from '../modelos';
import {
  ALTO_DEL_ZOCALO,
  ALTURA_DE_UNA_CASA,
  ALTURA_DE_UNA_PERSONA,
  asientoDeLaMarca,
  ESCALA_DEL_PACK,
  ESCALON,
  RADIO_DE_COMARCA,
  RADIO_DEL_RELLANO,
  RADIO_DE_TESELA,
  SUBIDA_MAXIMA_DEL_ZOCALO,
  SUELO_DEL_ZOCALO,
  SUELO_DEL_ZOCALO_DE_CIUDAD,
  sueloDeLaMarca,
  tallaDeUnaMarca,
  parteDeLaMarca,
  TECHO_DEL_ZOCALO,
  TECHO_DEL_ZOCALO_DE_CIUDAD,
  techoDeLaMarca,
  ZOCALO_DE_CIUDAD_EN_PANTALLA,
  ZOCALO_EN_PANTALLA,
} from '../escala';
import {
  alfasDeLaPieza,
  ANCHO_DE_LA_RAYA,
  asientoDelDisco,
  DESVANECIDO_DE_LA_RAYA,
  DESVANECIDO_DEL_DISCO,
  LADOS_DEL_DISCO,
  LARGO_DE_LA_RAYA,
  loLejosQueLlegaLaMarca,
  loQueOcupaElZocalo,
  OPACIDAD_DEL_ZOCALO,
  piezasDelZocalo,
  RADIO_DE_LA_MESETA,
  tallaDelZocalo,
  TRAMOS_DE_LA_RAYA,
  Zocalo,
} from '../zocalo';
import type { PiezaDelZocalo } from '../zocalo';
/*
 * EL ATLAS SE LEE DE LA TABLA COMPILADA, que es la que la app sube a la GPU y la que
 * `verify:atlas-del-tablero` compara píxel a píxel contra el PNG del pack. Abrir aquí el PNG
 * otra vez sería un TERCER camino hasta el mismo color, y el que nadie compara con los otros
 * dos es siempre el que miente.
 */
import { tablaDelAtlas } from '../texeles-del-atlas';
import { ALTO_DEL_ATLAS, COLUMNAS_DE_LA_TABLA } from '../atlas-del-tablero';
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
  /*
   * ═══ LOS BIENES SE PIDEN AL JUEGO, Y ANTES SE ESCRIBÍAN AQUÍ MAL ═══
   *
   * Esta lista decía `madera, ladrillo, lana, grano, mineral`, que son los del catán de
   * caja. Riberas reparte `limo, junco, sal, piedra, grano` y los manda SIN TRADUCIR
   * (cabecera de `riberas-en-3d.ts`), así que de los cinco que se medían aquí sólo
   * `grano` llegaba a existir: las comprobaciones de la mano llevaban midiendo una mano
   * que el juego no reparte nunca, que es la manera más silenciosa de estar en verde.
   *
   * Se importa del juego en vez de volver a escribirla para que no pueda volver a pasar.
   */
  const manoDe = (cuantas: number): Array<{ id: string; bien: string }> =>
    Array.from({ length: cuantas }, (_, i) => ({
      id: `c${String(i)}`,
      /* A propósito desordenada: el reparto tiene que agruparla él. */
      bien: BIENES[(i * 3 + (i % 2)) % BIENES.length] ?? 'limo',
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
   * ═══ EL ORDEN FIJO DE LA MANO TIENE QUE NOMBRAR LOS BIENES QUE LLEGAN ═══
   *
   * `ORDEN_DE_LOS_BIENES` promete en su cabecera que la mano se lee por la posición,
   * «como se lee un teclado». Eso sólo es verdad si los bienes que llegan están EN la
   * lista: los que no están caen todos al mismo sitio y desempatan por orden alfabético,
   * que es un orden, pero no el del juego ni uno que nadie haya elegido.
   *
   * Medido con los cinco de Riberas: cuatro se caían fuera de la lista y la mano salía
   * `grano` primero y luego `junco, limo, piedra, sal` por alfabeto.
   */
  comprobar(
    'el orden fijo de la mano nombra los cinco bienes que Riberas reparte',
    BIENES.every((b) => ORDEN_DE_LOS_BIENES.includes(b)),
    { orden: ORDEN_DE_LOS_BIENES, fuera: BIENES.filter((b) => !ORDEN_DE_LOS_BIENES.includes(b)) },
  );

  /*
   * ═══ Y EL DIBUJO DEL BIEN CABE EN LA TIRA QUE ASOMA ═══
   *
   * Es lo único que se ve de una carta en reposo, y si el dibujo no cabe en ella no se
   * lee de qué bien es sin apuntarla, que es justo para lo que se subió `ASOMA_QUIETA`.
   *
   * El dibujo llega encajado por su lado MAYOR (`geometriaDeContornos`), así que un
   * glifo más ancho que alto sale con ancho 1 y se come más tira que uno estrecho. Con
   * el 0,4 que el pintor llevaba suelto, `junco`, `limo` y `piedra` medían 0,0994 en una
   * tira de 0,0957: se salían 0,0019 por cada lado, o sea que el dibujo pisaba el filo
   * del naipe por la izquierda y lo cortaba el borde del lienzo por la derecha.
   */
  const anchos = new Map<string, number>();
  for (const bien of BIENES) {
    const g = geometriaDeContornos(CONTORNOS_DEL_BIEN[bien] ?? []);
    if (g === null) continue;
    const caja = g.boundingBox;
    if (caja !== null) anchos.set(bien, caja.max.x - caja.min.x);
  }
  const seSalen = [...anchos.entries()]
    .filter(([, w]) => w * ALTO_DEL_DIBUJO > ANCHO_DE_LA_TIRA + 1e-9)
    .map(
      ([b, w]) =>
        `${b}: dibujo ${(w * ALTO_DEL_DIBUJO).toFixed(4)} en tira ${ANCHO_DE_LA_TIRA.toFixed(4)}`,
    );
  comprobar(
    'el dibujo de cada bien cabe DE PLANO en la tira que asoma en reposo: el ancho del glifo contra el ancho de la tira, sin giro y sin cámara. Es condición necesaria y no es la que decide — la que decide está justo debajo',
    anchos.size === BIENES.length && seSalen.length === 0,
    { medidos: anchos.size, seSalen },
  );
  /*
   * ═══ Y CABE DE VERDAD: LAS CUATRO ESQUINAS, CON EL GIRO Y CON LA CÁMARA ═══
   *
   * La de arriba compara dos FRACCIONES PLANAS: el ancho del glifo contra el ancho de la tira.
   * Es una condición necesaria y NO es la que decide, porque en pantalla el naipe no está ni de
   * frente ni en el plano nominal de la baraja:
   *
   *   · va INCLINADO —`INCLINACION`, hasta 0,13 radianes de la primera carta a la última—, y
   *     girar un rectángulo mete sus esquinas más allá de donde llegaban sus lados;
   *   · y el dibujo va 0,01 POR DELANTE de la cara, o sea más cerca del ojo, donde el lienzo
   *     mide menos. La mano vive a dos unidades de la cámara: un centésimo de acercamiento es
   *     medio por ciento de lienzo, y la carta ya está pegada al borde derecho.
   *
   * Medido: con el 0,38 que había, la peor esquina caía FUERA del lienzo, y en una mano de cinco
   * el dibujo quedaba dentro entre el 84 % y el 100 % según el naipe. Las dos comprobaciones de
   * arriba —la plana y la de que la mano asoma— salían las dos en verde.
   *
   * Así que se proyectan las cuatro esquinas del rectángulo del dibujo: se le aplica el giro del
   * naipe, se lleva al sitio del hueco y se divide por lo que el lienzo mide A ESA PROFUNDIDAD.
   * Dentro es que las dos coordenadas quedan en [-1, 1].
   */
  const DONDE_VA_EL_DIBUJO = 'position={[hueco.ancho * hueco.dibujo, hueco.alto * 0.04, 0.01]}';
  const fuenteDelNaipe = fs.readFileSync(
    path.join(import.meta.dirname ?? __dirname, '..', 'delta.tsx'),
    'utf8',
  );
  comprobar(
    'el dibujo se planta en `delta.tsx` donde este guion lo proyecta: sube 0,04 del alto y va 0,01 por delante de la cara. Si alguien mueve esa línea, lo de abajo deja de medir la escena y hay que traerlo',
    fuenteDelNaipe.includes(DONDE_VA_EL_DIBUJO),
    { loQueBusca: DONDE_VA_EL_DIBUJO },
  );
  const SUBE_EL_DIBUJO = 0.04;
  const DELANTE_DE_LA_CARA = 0.01;
  const LAS_CUATRO_PROPORCIONES: Array<[string, number]> = [
    ['16:9', 16 / 9],
    ['1280x800', 1280 / 800],
    ['852x922', 852 / 922],
    ['9:19,5', 9 / 19.5],
  ];
  const cajaDelBien = new Map<string, { ancho: number; alto: number }>();
  for (const bien of BIENES) {
    const g = geometriaDeContornos(CONTORNOS_DEL_BIEN[bien] ?? []);
    const caja = g?.boundingBox ?? null;
    if (caja !== null) {
      cajaDelBien.set(bien, { ancho: caja.max.x - caja.min.x, alto: caja.max.y - caja.min.y });
    }
  }
  /** La esquina del dibujo que más se sale, en fracción de medio lienzo. Uno es el borde. */
  const laPeorEsquina = (talla: number): number => {
    let peor = 0;
    for (const [, proporcion] of LAS_CUATRO_PROPORCIONES) {
      for (let cuantas = 1; cuantas <= 20; cuantas++) {
        for (const c of huecosDeLaBaraja(manoDe(cuantas), CAMPO, proporcion, null)) {
          const caja = cajaDelBien.get(c.carta.bien);
          if (caja === undefined) continue;
          const h = c.hueco;
          /* El lienzo A LA PROFUNDIDAD DEL DIBUJO, que es la de la carta menos su relieve. */
          const hasta = -(h.z + DELANTE_DE_LA_CARA);
          const medioAlto = hasta * Math.tan(CAMPO / 2);
          const medioAncho = medioAlto * proporcion;
          const cos = Math.cos(h.giro);
          const sen = Math.sin(h.giro);
          const centroX = h.ancho * h.dibujo;
          const centroY = h.alto * SUBE_EL_DIBUJO;
          const medioW = (caja.ancho * h.alto * talla) / 2;
          const medioH = (caja.alto * h.alto * talla) / 2;
          for (const sx of [-1, 1]) {
            for (const sy of [-1, 1]) {
              const lx = centroX + sx * medioW;
              const ly = centroY + sy * medioH;
              peor = Math.max(
                peor,
                Math.abs((h.x + lx * cos - ly * sen) / medioAncho),
                Math.abs((h.y + lx * sen + ly * cos) / medioAlto),
              );
            }
          }
        }
      }
    }
    return peor;
  };
  const LA_TALLA_DE_ANTES = 0.38;
  comprobar(
    `y las cuatro esquinas del dibujo caen DENTRO del lienzo con el giro y la cámara puestos: la peor de las ${String(LAS_CUATRO_PROPORCIONES.length)} proporciones y las manos de una a veinte cartas se queda en ${laPeorEsquina(ALTO_DEL_DIBUJO).toFixed(4)} del borde`,
    cajaDelBien.size === BIENES.length && laPeorEsquina(ALTO_DEL_DIBUJO) <= 1,
    { talla: ALTO_DEL_DIBUJO, peor: laPeorEsquina(ALTO_DEL_DIBUJO), medidos: cajaDelBien.size },
  );
  comprobar(
    `se ve fallar: con el ${LA_TALLA_DE_ANTES.toFixed(2)} de antes —el que la comprobación plana daba por bueno— la peor esquina cae a ${laPeorEsquina(LA_TALLA_DE_ANTES).toFixed(4)}, o sea fuera del lienzo, y el glifo sale cortado por el canto derecho`,
    laPeorEsquina(LA_TALLA_DE_ANTES) > 1 && laPeorEsquina(LA_TALLA_DE_ANTES + 0.02) > 1,
    { conElDeAntes: laPeorEsquina(LA_TALLA_DE_ANTES), conElDeAhora: laPeorEsquina(ALTO_DEL_DIBUJO) },
  );
  /*
   * ═══ Y LA TIRA QUE ASOMA ES LA QUE `ASOMA_QUIETA` PROMETE, TAMBIÉN EN LA ÚLTIMA CARTA ═══
   *
   * La mano se coloca en un plano a dos unidades del ojo, y cada carta va un pelo más cerca que
   * la anterior para dejar la profundidad coherente. Ese pelo se sumaba POR CARTA, y en
   * perspectiva eso empuja las últimas hacia fuera por el borde derecho: medido, lo que asomaba
   * del vigésimo naipe caía al 42,9 % contra el 55,0 % del primero — una quinta parte de la tira
   * perdida, y con ella el sitio del dibujo. Ahora la separación se reparte entre toda la mano
   * (`SEPARACION_EN_PROFUNDIDAD`) y no crece con ella.
   */
  const loMenosQueAsoma = (porCarta: boolean): number => {
    let menos = 1;
    for (const [, proporcion] of LAS_CUATRO_PROPORCIONES) {
      for (let cuantas = 1; cuantas <= 20; cuantas++) {
        const puestas = huecosDeLaBaraja(manoDe(cuantas), CAMPO, proporcion, null);
        for (let i = 0; i < puestas.length; i++) {
          const h = (puestas[i] as (typeof puestas)[number]).hueco;
          const hasta = porCarta ? DISTANCIA_DE_LA_BARAJA - i * 0.0015 : -h.z;
          const medioAncho = hasta * Math.tan(CAMPO / 2) * proporcion;
          const asoma = Math.min(1, (medioAncho - (h.x - h.ancho / 2)) / h.ancho);
          menos = Math.min(menos, asoma / ((ANCHO_DE_LA_TIRA * h.alto) / h.ancho));
        }
      }
    }
    return menos;
  };
  comprobar(
    `y de todas asoma la tira que ANCHO_DE_LA_TIRA promete: el peor naipe de las manos de una a veinte enseña el ${(loMenosQueAsoma(false) * 100).toFixed(1)} % de ella`,
    loMenosQueAsoma(false) > 0.98,
    { loMenos: loMenosQueAsoma(false) },
  );
  comprobar(
    `se ve fallar: con el paso de profundidad sumado POR CARTA —como estaba— el peor naipe enseña el ${(loMenosQueAsoma(true) * 100).toFixed(1)} % de la tira, o sea que la carta veinte se va por el borde derecho`,
    loMenosQueAsoma(true) < 0.85,
    { conElPasoPorCarta: loMenosQueAsoma(true), repartido: loMenosQueAsoma(false) },
  );


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
  /*
   * ═══ Y LA TABLA YA NO ES LA DE LAS FICHAS: EL CONTADOR DEL DESCARTE CUENTA POR ELLA ═══
   *
   * Esto decía «ni de más ni de menos», y comparaba la tabla con las once de un delta. Dejó
   * de ser verdad el día que la CASILLA DEL DESCARTE puso un contador: lo que cuenta es
   * `Math.floor(mano / 2)` y pasa por el 1 y por el 7, que no salen en ninguna comarca.
   *
   * Lo que se exige ahora es lo que la tabla promete: del UNO a su tope, SIN SALTOS. Sin el
   * «sin saltos» esto sería una lista de longitud correcta con un agujero dentro, y el
   * agujero no se vería: una cifra que falta no revienta, deja la casilla sin número.
   */
  const HASTA_DONDE_CUENTA = Array.from({ length: CIFRA_MAS_ALTA_CON_ICONO }, (_, i) => String(i + 1));
  comprobar(
    'la tabla de cifras va del uno a su tope sin saltos, que es lo que promete quien la lee',
    CIFRAS_CON_ICONO.length === HASTA_DONDE_CUENTA.length &&
      HASTA_DONDE_CUENTA.every((c) => CIFRAS_CON_ICONO.includes(c)),
    { enLaTabla: CIFRAS_CON_ICONO.length, hastaElTope: HASTA_DONDE_CUENTA.length },
  );
  comprobar(
    'y las once de un delta caen dentro: la ficha de la comarca sigue teniendo su cifra',
    CIFRAS_DE_UN_DELTA.every((c) => CIFRAS_CON_ICONO.includes(c)),
    { enLaTabla: CIFRAS_CON_ICONO, enElJuego: CIFRAS_DE_UN_DELTA },
  );
  /*
   * Y que el tope dé para una partida de verdad. `debidos` de `riberas.ts` reparte
   * `Math.floor(almacen.length / 2)`, y el almacén NO tiene tope —no hay banco finito del
   * que salgan las fichas—, así que ningún número es el último por regla. Treinta cubre una
   * mano de sesenta y una fichas. Esto no comprueba una verdad matemática: fija el suelo por
   * debajo del cual alguien habría recortado la tabla sin darse cuenta de para qué era.
   */
  comprobar(
    'y llega hasta treinta, que es media mano de sesenta y una fichas',
    CIFRA_MAS_ALTA_CON_ICONO >= 30,
    CIFRA_MAS_ALTA_CON_ICONO,
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
     * derecho del dado derecho: `dados.x + centroDelDado(1, arista/lado) · lado + arista / 2`, con
     * la arista que el hueco trae para ESTE lienzo (la pedida, o el mínimo legible).
     */
    const enLados = dados.arista / dados.lado;
    const bordeDerechoDelDado = dados.x + centroDelDado(1, enLados) * dados.lado + dados.arista / 2;
    const bordeIzquierdoDelDado = dados.x + centroDelDado(0, enLados) * dados.lado - dados.arista / 2;
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
    'el par cabe en el asa y en el tapete en los DOS peldaños, con su aire: como quinto el asa mide el par AL TOPE (1,12 lados, 51,3 pt en 390) y crece hacia la izquierda, con al menos 0,24 lados hasta la primera pieza —0,275 en 390, porque el dado se queda en el mínimo legible y no en el tope— y más de un lado hasta el canto',
    malosDelPar.length === 0 &&
      parEnElAsa.length === LIENZOS.length - 2 &&
      parEnElAsa.filter((m) => m.includes('quinto')).length === 4 &&
      parEnElAsa.some((m) => m.startsWith('móvil corriente: quinto, asa de 1.12 lados (51.3 pt), par de 51.3 pt, aire hasta la primera pieza 0.275 lados (12.6 pt), hasta el canto 1.157 lados')),
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

  /* ── 5. LAS MEDIDAS DEL DADO: el par AL TOPE cabe en el asa, el salto queda bajo su techo ── */
  /*
   * LA ARISTA YA NO ES UNA: se pide 0,364 lados (un 30 % menos que los 0,52 de antes, pedido
   * jugando en un monitor) y `aristaDelDado` la sube al mínimo legible donde no llega, sin
   * pasar del tope de 0,52, que es para el que se reserva el sitio. Lo que se mide fijo es
   * lo que dimensiona: el par AL TOPE.
   */
  const anchoDelPar = 2 * ARISTA_TOPE_DEL_DADO + HUECO_ENTRE_DADOS;
  comprobar(
    'se pide 0,364 lados de arista (0,7 · 0,52) con tope en 0,52, y el par AL TOPE mide 1,12 lados (2 · 0,52 + 0,08) y deja 0,24 lados de aire a cada lado del asa de 1,6: exactamente el AIRE de la barra',
    Math.abs(ARISTA_DEL_DADO - 0.364) < 1e-12 &&
      Math.abs(ARISTA_TOPE_DEL_DADO - 0.52) < 1e-12 &&
      Math.abs(anchoDelPar - 1.12) < 1e-12 &&
      Math.abs(ANCHO_DEL_PAR_DE_DADOS - anchoDelPar) < 1e-12 &&
      Math.abs((ANCHO_DEL_ASA_DE_LOS_DADOS - anchoDelPar) / 2 - 0.24) < 1e-12,
    { par: anchoDelPar, aire: (ANCHO_DEL_ASA_DE_LOS_DADOS - anchoDelPar) / 2 },
  );
  comprobar(
    'los dos dados van pegados al centro con su hueco de aire entre ellos, sea cual sea su arista: centroDelDado los separa arista + 0,08 y los deja simétricos, para el pedido y para el tope',
    [ARISTA_DEL_DADO, ARISTA_TOPE_DEL_DADO].every(
      (a) => Math.abs(centroDelDado(1, a) - centroDelDado(0, a) - (a + HUECO_ENTRE_DADOS)) < 1e-12 && centroDelDado(0, a) + centroDelDado(1, a) === 0,
    ),
  );
  /*
   * `aristaDelDado` se mide en sus tres tramos: sin mínimo que valga (un punto de pantalla
   * que no mide nada) da la pedida; con un punto enorme se queda en el tope; y entre medias
   * da el mínimo legible, que es el del PUNTO (4 / 0,18 = 22,2) y no los 22 a secas: con un
   * lado de 50 la pedida es 18,2 y el tope 26, y sale 22,2.
   */
  comprobar(
    'aristaDelDado da la pedida donde sobra sitio, el mínimo legible del punto (22,2 pt) donde no llega, y nunca pasa del tope',
    Math.abs(aristaDelDado(100, 0) - ARISTA_DEL_DADO * 100) < 1e-12 &&
      Math.abs(aristaDelDado(1, 1) - ARISTA_TOPE_DEL_DADO) < 1e-12 &&
      Math.abs(aristaDelDado(50, 1) - PUNTO_MINIMO / PUNTO_DEL_DADO) < 1e-9 &&
      PUNTO_MINIMO / PUNTO_DEL_DADO > DADO_MINIMO,
    { pedida: aristaDelDado(100, 0), tope: aristaDelDado(1, 1), minimo: aristaDelDado(50, 1) },
  );
  /* Del centro del hueco hacia abajo, AL TOPE: la tapa a −0,48; el centro del cubo a −0,22; la cara de arriba en lo alto del salto a +0,24. */
  const tapaDesdeElHueco = -(ZOCALO.centro + ZOCALO.alto / 2);
  const techoEnElSalto = tapaDesdeElHueco + ARISTA_TOPE_DEL_DADO / 2 + SALTO_DEL_DADO + ARISTA_TOPE_DEL_DADO / 2;
  const techoConLaPedida = tapaDesdeElHueco + ARISTA_DEL_DADO / 2 + SALTO_DEL_DADO + ARISTA_DEL_DADO / 2;
  comprobar(
    'apoyado al tope, el centro del cubo queda a media arista sobre la tapa (0,22 lados bajo el centro del hueco) y en lo alto del salto la cara de arriba llega a +0,24 lados, bajo el techo del asa (+0,5); con la pedida se queda en +0,084',
    Math.abs(tapaDesdeElHueco + ARISTA_TOPE_DEL_DADO / 2 - -0.22) < 1e-12 &&
      Math.abs(techoEnElSalto - 0.24) < 1e-12 &&
      techoEnElSalto < 0.5 &&
      Math.abs(techoConLaPedida - 0.084) < 1e-12,
    { centro: tapaDesdeElHueco + ARISTA_TOPE_DEL_DADO / 2, techo: techoEnElSalto, conLaPedida: techoConLaPedida },
  );
  comprobar(
    'la sombra de cada dado, en aristas, asoma por sus cuatro lados (radio > media arista) y no llega al centro del otro dado ni con el dado al tope',
    RADIO_DE_LA_SOMBRA_DEL_DADO > 0.5 && RADIO_DE_LA_SOMBRA_DEL_DADO < 1 + HUECO_ENTRE_DADOS / ARISTA_TOPE_DEL_DADO,
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
  comprobar('el D6 del pack se escala con la arista del hueco / ARISTA_DEL_D6_EN_EL_PACK, y el pack mide 0,75: con la pedida sale 0,4853 por lado y con el tope 0,6933', ARISTA_DEL_D6_EN_EL_PACK === 0.75 && Math.abs(ARISTA_DEL_DADO / ARISTA_DEL_D6_EN_EL_PACK - 0.4853) < 1e-3 && Math.abs(ARISTA_TOPE_DEL_DADO / ARISTA_DEL_D6_EN_EL_PACK - 0.6933) < 1e-3);

  /* ── 8. EL MÍNIMO LEGIBLE, en todos los lienzos con sitio, y los dos umbrales de la tabla ── */
  const CAMPO_DE_LA_MESA = (45 * Math.PI) / 180;
  const dadoEnPuntos = (ancho: number, alto: number): { forma: string; dado: number; punto: number; asa: number } | null => {
    const prop = ancho / alto;
    const visto = loQueSeVe(CAMPO_DE_LA_MESA, prop);
    const { dados } = huecosDeLaMesa(4, CAMPO_DE_LA_MESA, prop, alto);
    if (dados === null) return null;
    const enPuntos = (u: number): number => (u / visto.alto) * alto;
    const dado = enPuntos(dados.arista);
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
    if (m.dado < DADO_MINIMO - 1e-9 || m.punto < PUNTO_MINIMO - 1e-9) ilegibles.push(`${nombre}: dado ${m.dado.toFixed(1)} y punto ${m.punto.toFixed(1)}`);
  }
  /*
   * MEDIDO CON LA ARISTA PEDIDA DE 0,364 (medir-dados.mts, 9 de septiembre de 2026): en los
   * NUEVE teléfonos de la lista la pedida no llega (16,0 a 21,9 puntos) y el dado se queda en
   * el mínimo del punto, 22,2, con el punto en 4,0 clavado; en las dos tabletas y los tres
   * monitores sobra sitio y el dado es el pedido: 32,6 a 55,0 puntos, 0,7 de lo que medía.
   * Antes ningún lienzo estaba en el mínimo (el SE daba 23,3): ahora el mínimo se PISA, y
   * por eso las dos comparaciones llevan tolerancia.
   */
  comprobar(
    'en ningún lienzo con sitio el dado baja de 22 puntos ni el punto de 4 (§1.15): en los teléfonos el dado se queda en el mínimo del punto, 22,2 y 4,0 —SE apaisado y 390 incluidos—, y en el monitor a 1080 mide el pedido, 55,0',
    DADO_MINIMO === 22 && PUNTO_MINIMO === 4 && ilegibles.length === 0 &&
      legibles.some((l) => l.startsWith('apaisado SE 1ª: colgado, dado 22.2 pt, punto 4.0 pt')) &&
      legibles.some((l) => l.startsWith('móvil corriente: quinto, dado 22.2 pt, punto 4.0 pt')) &&
      legibles.some((l) => l.startsWith('apaisado monitor 1080: colgado, dado 55.0 pt, punto 9.9 pt')) &&
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
    'Dados busca MODELO.dado en el catálogo, lo escala con la arista DEL HUECO / ARISTA_DEL_D6_EN_EL_PACK (no la recalcula: sólo el hueco sabe cuánto mide un punto) y pinta el respaldo de cubo-del-dado.ts si no está; la máquina faseDeLosDados es la única que decide la fase',
    /modelo=\{aplanados\.get\(MODELO\.dado\)\}/.test(fuente) &&
      /const \{ lado, arista \} = sitio;/.test(trozoDeDados) &&
      !/ARISTA_DEL_DADO/.test(trozoDeDados) &&
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
    /centros\.push\(\{\s+x: sitioDeLosDados\.x \+ centroDelDado\(i, sitioDeLosDados\.arista \/ sitioDeLosDados\.lado\) \* sitioDeLosDados\.lado,/.test(fuente) &&
      /radio: sitioDeLosDados\.arista \* RADIO_DE_LA_SOMBRA_DEL_DADO,/.test(fuente) &&
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
      const media = (d.arista * Math.sqrt(3)) / 2;
      for (const i of [0, 1] as const) {
        partes.push([
          `el dado ${String(i)} en lo alto del salto`,
          verticesDeLaCaja(
            [
              d.x + centroDelDado(i, d.arista / d.lado) * d.lado,
              cotaDeLaTapa(primero) + d.arista / 2 + SALTO_DEL_DADO * d.lado,
              d.z,
            ],
            [media, media, media],
            0,
          ),
        ]);
        partes.push([
          `la sombra del dado ${String(i)}`,
          esquinasDelPlano(
            [d.x + centroDelDado(i, d.arista / d.lado) * d.lado, tapa.cota + SOBRE_LA_TAPA, d.z],
            [RADIO_DE_LA_SOMBRA_DEL_DADO * d.arista, RADIO_DE_LA_SOMBRA_DEL_DADO * d.arista],
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

// ---------------------------------------------------------------------------
paso('La cinta del tercio central deja aire a las dos manos, la frase no se queda en tres letras, y su segunda tira mide otro suelo de toque');
// ---------------------------------------------------------------------------

/*
 * ═══ POR QUÉ ESTE REPARTO SE MIDE AQUÍ Y NO EN CADA CLIENTE ═══
 *
 * `escenas/cinta.ts` dice cuánto ancho se lleva la cinta que va pegada al canto de arriba
 * del lienzo —el aviso del turno y la puerta del cajón— y qué le cabe dentro. Lo van a
 * pintar DOS pantallas: el escritorio hoy y la app después. Una copia del reparto en cada
 * cliente son dos repartos que divergen el día que alguien toque uno, y el que diverge es
 * el que nadie estaba mirando.
 *
 * Y LO QUE SE ROMPE EN SILENCIO ES ESTO: la cinta es una caja OPACA encima del lienzo, y a
 * los dos lados del lienzo viven las dos manos de cartas — que no son adorno, son cartas
 * que se ARRASTRAN. Una cinta un poco más ancha de la cuenta no da error, no rompe ninguna
 * prueba y en una captura de un monitor no se ve: lo que hace es tapar el canto de la carta
 * de arriba en los lienzos de pie, o sea que hay una carta que no se puede coger y nada lo
 * dice. Aquí se mide contra las manos DE VERDAD —las que reparten `franjaDeLasCartas` y
 * `huecosDeLaBaraja`— en los quince lienzos de la lista de arriba, con un suelo de aire.
 *
 * ═══ DE DÓNDE SALE EL SUELO DE QUINCE PUNTOS ═══
 *
 * De medir el peor caso y quedarse justo por debajo. En 390×845 —el lienzo entero de un
 * móvil de pie, que es donde las manos suben hasta arriba— la cinta al 50 % del ancho SE
 * METE 3,9 puntos por dentro de la franja de la mano del mazo, al 45 % deja 5,8 (que no es
 * un margen: es un pelo) y al 40 % deja 15,6 y 26,5 a la mano de bienes. De ahí sale el
 * `PARTE_DE_PIE = 0,40`, y de ahí sale este quince.
 *
 * ═══ Y CONTRA QUÉ SE MIDE CADA MANO, QUE NO ES LO MISMO EN LAS DOS ═══
 *
 *   · la del MAZO se mide contra su FRANJA (`franjaDeLasCartas`), que es el rectángulo
 *     reservado para ella: dentro viven las cartas y también las casillas donde se sueltan
 *     al arrastrarlas, y esas llegan al 93 % del ancho de la franja. Medir sólo las cartas
 *     daría 33 puntos de más de holgura que no existen;
 *   · la de BIENES no tiene franja declarada, así que se mide contra sus cartas ABIERTAS
 *     —el imán a tope sobre la de más arriba, que es cuando más se meten hacia dentro—.
 *     Quietas asoman menos, y medir quietas sería medir el caso fácil.
 */
{
  const CAMPO_DE_LA_CINTA = (45 * Math.PI) / 180;
  const MANO_DE_BIENES = Array.from({ length: 14 }, (_, i) => ({
    id: `b${String(i)}`,
    bien: ['limo', 'junco', 'sal', 'piedra', 'grano'][i % 5] as string,
  }));
  const SUELO_DE_AIRE = 15;

  /*
   * LOS DOS ALTOS DE LA CINTA SON EL SUELO DE TOQUE, Y SON EL MISMO A PROPÓSITO: la cinta ES
   * la línea de sus botones. Escritos aparte se separan sin que nada se caiga —una cinta de
   * cuarenta con botones de cuarenta y cuatro deja los botones asomando por los dos cantos—,
   * y además el alto es lo que `elCartelQueCabe` le resta a la banda del cartel de los
   * naipes: una cinta que crece sin que aquella cuenta se entere le mete el cartel debajo.
   */
  comprobar(
    'el alto de la cinta y el lado de sus botones son el suelo de toque de la casa, los dos: 44 puntos',
    ALTO_DE_LA_CINTA === SUELO_DEL_TOQUE && BOTON_DE_LA_CINTA === SUELO_DEL_TOQUE,
    { cinta: ALTO_DE_LA_CINTA, boton: BOTON_DE_LA_CINTA, suelo: SUELO_DEL_TOQUE },
  );

  const aires: string[] = [];
  const pisados: string[] = [];
  for (const [nombre, anchoPt, altoPt] of LIENZOS) {
    const prop = anchoPt / altoPt;
    const suAncho = anchoDeLaCinta(anchoPt, altoPt);
    const izquierdaDeLaCinta = (anchoPt - suAncho) / 2;
    const derechaDeLaCinta = izquierdaDeLaCinta + suAncho;

    const vistoEnLasCartas = loQueSeVeEnLasCartas(CAMPO_DE_LA_CINTA, prop);
    const porPunto = altoPt / vistoEnLasCartas.alto;
    const franja = franjaDeLasCartas(CAMPO_DE_LA_CINTA, prop);
    const cantoDeLaFranja = (franja.derecha + vistoEnLasCartas.ancho / 2) * porPunto;

    const vistoEnLaBaraja = loQueSeVeEnLaBaraja(CAMPO_DE_LA_CINTA, prop);
    const porPuntoEnLaBaraja = altoPt / vistoEnLaBaraja.alto;
    const quietas = huecosDeLaBaraja(MANO_DE_BIENES, CAMPO_DE_LA_CINTA, prop, null);
    const laDeArriba = Math.max(...quietas.map((c) => c.hueco.y));
    const abiertas = huecosDeLaBaraja(MANO_DE_BIENES, CAMPO_DE_LA_CINTA, prop, laDeArriba);
    const cantoDeLosBienes = Math.min(
      ...abiertas.map((c) => (c.hueco.x - c.hueco.ancho / 2 + vistoEnLaBaraja.ancho / 2) * porPuntoEnLaBaraja),
    );

    const alMazo = izquierdaDeLaCinta - cantoDeLaFranja;
    const aLosBienes = cantoDeLosBienes - derechaDeLaCinta;
    aires.push(`${nombre}: mazo ${alMazo.toFixed(1)} · bienes ${aLosBienes.toFixed(1)}`);
    if (alMazo < SUELO_DE_AIRE) pisados.push(`${nombre}: la cinta deja ${alMazo.toFixed(1)} pt a la franja del mazo`);
    if (aLosBienes < SUELO_DE_AIRE) pisados.push(`${nombre}: la cinta deja ${aLosBienes.toFixed(1)} pt a la mano de bienes`);
  }

  comprobar(
    'la cinta deja al menos quince puntos de aire a la franja del mazo y a la mano de bienes abierta en los quince lienzos',
    pisados.length === 0 && aires.length === LIENZOS.length,
    pisados.length > 0 ? pisados.slice(0, 4) : aires.slice(0, 3),
  );
  /*
   * Y EL PEOR CASO ES EL QUE DECIDIÓ EL 0,40, así que se nombra: si un día deja de ser el
   * peor —porque las manos se aparten o porque entre un lienzo más de pie— esto se cae y
   * quien lo mire tiene delante el número que hay que volver a mirar.
   */
  const elPeor = aires.find((l) => l.startsWith('móvil de pie, lienzo entero')) ?? '';
  comprobar(
    'y el más apretado de los quince es el móvil de pie con el lienzo entero (390×845), que es el que decidió el 40 %: 15,6 puntos a la franja del mazo y 26,5 a la de bienes',
    /mazo 15\.[56]/.test(elPeor) && /bienes 26\.[45]/.test(elPeor),
    elPeor,
  );
  /*
   * ═══ ENSANCHARLA NO ARREGLA LA FRASE, Y ESO ES UNA MEDIDA Y NO UNA OPINIÓN ═══
   *
   * La cabecera de `loQueLlevaLaCinta` cuenta que a 288 puntos de lienzo la frase se queda
   * en tres letras y que ensanchar la cinta no lo arregla, porque el techo antes de comerse
   * los quince puntos de aire son 122,8 puntos. Ese número es el que sostiene la decisión de
   * sacar el «‹» en vez de ensanchar, así que se mide en vez de creérselo.
   */
  {
    const prop = 288 / 420;
    const vistoEnLasCartas = loQueSeVeEnLasCartas(CAMPO_DE_LA_CINTA, prop);
    const franja = franjaDeLasCartas(CAMPO_DE_LA_CINTA, prop);
    const cantoDeLaFranja = ((franja.derecha + vistoEnLasCartas.ancho / 2) * 420) / vistoEnLasCartas.alto;
    /* Centrada: lo que puede crecer por un lado lo pierde por el otro, así que el techo es simétrico. */
    const techo = 2 * (288 / 2 - cantoDeLaFranja - SUELO_DE_AIRE);
    comprobar(
      'y el techo de la cinta a 288 de lienzo son 122,8 puntos: más allá se come los quince de aire, así que ensancharla NO es la salida y por eso el «‹» se va',
      Math.abs(techo - 122.8) <= 0.6 && techo < 288 / 2,
      techo.toFixed(1),
    );
  }

  /*
   * ═══ Y QUÉ LE CABE DENTRO: LAS TRES RAMAS DE `loQueLlevaLaCinta` ═══
   *
   * El hueco mínimo de la frase y el lado del botón entran POR LA PUERTA porque dependen de
   * cómo pinte cada cliente (ver la cabecera del fichero). Aquí se prueba la función con los
   * dos casos que separan sus ramas, y con los números del escritorio, que es el que la pinta
   * hoy: raíz 17, ocho letras de 8,364 puntos (66,9) y botones de 46,75 —los 44 de aquí
   * escritos `2.75rem`—.
   */
  {
    const OCHO_LETRAS = 8 * 0.82 * 17 * 0.6;
    const BOTON_PINTADO = (BOTON_DE_LA_CINTA * 17) / 16;
    const estrecha = loQueLlevaLaCinta(288, 420, OCHO_LETRAS, BOTON_PINTADO);
    const ancha = loQueLlevaLaCinta(1920, 1080, OCHO_LETRAS, BOTON_PINTADO);
    comprobar(
      'con la frase sin sitio para sus ocho letras, el que se va es el «‹» y no la frase: a 288 de lienzo la cinta vale 115,2 y le quedan 68,4 puntos, que son ocho letras justas',
      !estrecha.salidaDentro &&
        Math.abs(estrecha.ancho - 115.2) < 0.1 &&
        estrecha.hueco >= OCHO_LETRAS &&
        Math.abs(estrecha.hueco - 68.45) < 0.1,
      estrecha,
    );
    comprobar(
      'y donde hay sitio se queda dentro: en un monitor la cinta vale 640 y a la frase le quedan 546,5 puntos con los dos botones puestos',
      ancha.salidaDentro && Math.abs(ancha.ancho - 640) < 0.1 && Math.abs(ancha.hueco - 546.5) < 0.1,
      ancha,
    );
    /*
     * EL LADO DEL BOTÓN CUENTA DE VERDAD, y esto es lo que compra que no se haya quedado en
     * la constante: con los 44 de aquí, la misma cinta de 288 diría que a la frase le quedan
     * 71,2 puntos, y en pantalla son 68,4. Son tres puntos, y con la preferencia de letra del
     * navegador en grande dejan de ser tres.
     */
    const conElDeAqui = loQueLlevaLaCinta(288, 420, OCHO_LETRAS);
    comprobar(
      'y el lado del botón entra por la puerta: con los 44 de este fichero la cuenta da 71,2 puntos de frase donde el escritorio pinta 68,4',
      Math.abs(conElDeAqui.hueco - 71.2) < 0.1 && conElDeAqui.hueco > estrecha.hueco,
      { conElDeAqui: conElDeAqui.hueco, comoSePinta: estrecha.hueco },
    );
    /*
     * Y CON EL LIENZO SIN MEDIR NO HAY CINTA: cero por cero es el primer render y también
     * Node. Un ancho de cero no se ve como un error, se ve como que no hay cinta, y quien
     * pinta ya sabe no pintarla. Un ancho negativo o infinito se vería como una raya.
     */
    comprobar(
      'y con el lienzo sin medir todavía la cinta vale cero, que es «no hay cinta» y no una raya',
      anchoDeLaCinta(0, 0) === 0 && anchoDeLaCinta(288, 0) === 0 && anchoDeLaCinta(-1, 420) === 0,
      [anchoDeLaCinta(0, 0), anchoDeLaCinta(288, 0), anchoDeLaCinta(-1, 420)],
    );
    /*
     * LA PROPORCIÓN DECIDE, NO UN UMBRAL DE ANCHO. «De pie» es que el lienzo sea más alto
     * que ancho, que es exactamente cuando las manos suben hasta arriba. Con un umbral en
     * puntos —«por debajo de 400 es de pie»— una tableta apaisada estrecha se mediría como
     * un teléfono de pie y al revés, y la cinta saldría del tamaño equivocado sin que se
     * cayera nada.
     */
    comprobar(
      'y lo que decide el reparto es la PROPORCIÓN y no un umbral de ancho: 400×400 cuenta como apaisado (el tercio) y 400×401 como de pie (el 40 %)',
      Math.abs(anchoDeLaCinta(400, 400) - 400 / 3) < 1e-9 && Math.abs(anchoDeLaCinta(400, 401) - 160) < 1e-9,
      [anchoDeLaCinta(400, 400), anchoDeLaCinta(400, 401)],
    );
  }

  /*
   * ═══ LA SEGUNDA TIRA: EL CARRIL DE LOS BOTONES SUELTOS ═══
   *
   * Esta cabecera decía que la línea de los botones de `opcionesFueraDeLaMesa` «todavía no
   * está escrita en ninguna pantalla». Ya lo está, y lo que la obligó se cuenta con un
   * número: con el estiaje por mover el juego emite DIECIOCHO destinos y ninguno lo pinta el
   * delta, así que los dieciocho salían como botones de 238 puntos DEBAJO del lienzo, o sea
   * fuera de una pantalla que el delta se come entera. Y mover la pieza es obligatorio.
   *
   * LO QUE SE MIDE AQUÍ es lo que es de este fichero y no de una pantalla: que el alto de la
   * cinta con carril sean DOS tiras del suelo de toque y no un número suelto —ese alto es lo
   * que `elCartelQueCabe` le resta a la banda del cartel de los naipes, y una cinta que crece
   * sin que aquella cuenta se entere le mete el cartel por debajo del vidrio—, y cuántos
   * cuadrados se ven de una vez en cada lienzo, que es lo que dice si el carril rueda.
   *
   * Y EL CARRIL MIDE LO QUE LA CINTA, que no es una comodidad: a los lados siguen estando las
   * dos manos y siguen siendo cartas que se arrastran. Midiendo lo mismo, el aire de quince
   * puntos que se acaba de medir arriba vale para las dos tiras y no hay una segunda cuenta
   * que llevar. Por eso aquí no hay un `anchoDelCarril`: sería justo el segundo reparto que
   * este fichero existe para no tener.
   */
  {
    const BOTON_PINTADO = (BOTON_DE_LA_CINTA * 17) / 16;
    comprobar(
      'el alto de la cinta son DOS tiras del suelo de toque cuando lleva carril y una cuando no: 88 y 44, que es lo que el cartel de los naipes resta a su banda',
      altoDeLaCinta(false) === ALTO_DE_LA_CINTA &&
        altoDeLaCinta(true) === 2 * ALTO_DE_LA_CINTA &&
        altoDeLaCinta(true) === 88,
      { sin: altoDeLaCinta(false), con: altoDeLaCinta(true) },
    );
    /*
     * CUÁNTOS SE VEN DE UNA VEZ, en los dos extremos de la lista. En el lienzo más estrecho de
     * este cliente —288 puntos, cinta de 115,2— se ven DOS de los dieciocho: el carril rueda
     * casi siempre, y por eso la hoja del escritorio lleva `overflow-x` y `touch-action:
     * auto`. En un monitor —cinta de 640— se ven trece, o sea que ahí rueda poco. Los dos
     * números están escritos en la cabecera de `cuantosSeVenEnElCarril` para que el siguiente
     * no tenga que medirlos, y por eso se miden aquí en vez de creérselos.
     */
    comprobar(
      'y en el lienzo más estrecho de este cliente se ven DOS cuadrados de los dieciocho y en un monitor trece: es lo que dice que el carril rueda, y son los números que su cabecera escribe',
      cuantosSeVenEnElCarril(anchoDeLaCinta(288, 420), BOTON_PINTADO) === 2 &&
        cuantosSeVenEnElCarril(anchoDeLaCinta(1920, 1080), BOTON_PINTADO) === 13,
      {
        estrecho: cuantosSeVenEnElCarril(anchoDeLaCinta(288, 420), BOTON_PINTADO),
        monitor: cuantosSeVenEnElCarril(anchoDeLaCinta(1920, 1080), BOTON_PINTADO),
      },
    );
    /*
     * Y EL LADO DEL BOTÓN ENTRA POR LA PUERTA, como en `loQueLlevaLaCinta` y por lo mismo: esta
     * casa escribe los 44 como `2.75rem`, que con su raíz son 46,75. Con los 44 de este fichero
     * la cuenta dice que en la cinta del monitor caben catorce, y en pantalla son trece: uno de
     * más, que es el que se sale por el canto.
     */
    comprobar(
      'y el lado del botón entra por la puerta: con los 44 de este fichero la cuenta dice catorce cuadrados en la cinta de un monitor donde el escritorio pinta trece',
      cuantosSeVenEnElCarril(anchoDeLaCinta(1920, 1080)) === 14 &&
        cuantosSeVenEnElCarril(anchoDeLaCinta(1920, 1080)) > cuantosSeVenEnElCarril(anchoDeLaCinta(1920, 1080), BOTON_PINTADO),
      { conLosDeAqui: cuantosSeVenEnElCarril(anchoDeLaCinta(1920, 1080)), comoSePinta: cuantosSeVenEnElCarril(anchoDeLaCinta(1920, 1080), BOTON_PINTADO) },
    );
    /*
     * Y CON EL LIENZO SIN MEDIR NO HAY CARRIL, por lo mismo que no hay cinta: cero por cero es
     * el primer render y también Node. Cero cuadrados es «no hay carril»; una división por cero
     * sería un `Infinity` que nadie ve como un error.
     */
    comprobar(
      'y con el lienzo sin medir todavía no se ve ningún cuadrado, que es «no hay carril» y no un infinito',
      cuantosSeVenEnElCarril(0) === 0 && cuantosSeVenEnElCarril(115.2, 0) === 0 && cuantosSeVenEnElCarril(-1) === 0,
      [cuantosSeVenEnElCarril(0), cuantosSeVenEnElCarril(115.2, 0), cuantosSeVenEnElCarril(-1)],
    );
  }
}

/*
 * ═══ LAS PIEZAS DE UN COLONO NO SE ENCUENTRAN EN EL TABLERO, Y ESO ES DEL JUEGO ═══
 *
 * Esto salió jugando una partida entera contra el servidor, no leyendo. El revisor NO
 * consiguió señalar ni una sola vez su propia choza: la captura del tablero recién repartido
 * —cero piezas— y la del mismo tablero con SEIS chozas y SEIS veredas puestas son
 * indistinguibles a la vista con el encuadre de «Ver el tablero entero».
 *
 * Aquí se miden las DOS causas, porque son dos y sólo una es de color:
 *
 *   1. QUE LA PIEZA NO TIENE UN COLOR PROPIO. El pack pinta los tejados del decorado con LOS
 *      MISMOS cuatro colores de jugador, y `poblar.ts` reparte casas por todas las comarcas.
 *      La distancia entre el tejado de una casa de adorno y el tejado del poblado de alguien
 *      no es «poca»: es CERO, porque es el mismo téxel del atlas.
 *   2. QUE A LA DISTANCIA DE TABLERO NO SE VE NADA. Un poblado mide unas cinco unidades sobre
 *      un mundo de doscientas de radio: pintado a su tamaño real, ocupa unos pocos píxeles.
 *
 * Y por eso el arreglo es un ZÓCALO —un aro del color del dueño, medido como una marca de
 * pantalla— y no un retoque de paleta: el retoque no toca la segunda causa, y la segunda es la
 * que hace que ni siquiera se pueda comparar el color.
 */
{
  paso('La pieza de un colono se distingue del caserío: color propio medido, y tamaño de marca de pantalla');

  /*
   * LA DISTANCIA SE MIDE EN CIELAB, con la misma fórmula y el mismo umbral que usa
   * `verify:riberas` para afirmar que ninguna isla se come una pieza. Se copia la aritmética
   * —son doce líneas de conversión— y NO el veredicto: el umbral es el de allí (20 unidades de
   * CIE76) y está razonado allí. En RGB esta medida no vale: `#3f6d5a` y `#6d8f3f` están a 68
   * unidades y el ojo los ve casi iguales.
   */
  const aLab = (hex: string): [number, number, number] => {
    const canal = (i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    const lineal = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const r = lineal(canal(0));
    const v = lineal(canal(1));
    const a = lineal(canal(2));
    const x = (r * 0.4124 + v * 0.3576 + a * 0.1805) / 0.95047;
    const y = r * 0.2126 + v * 0.7152 + a * 0.0722;
    const z = (r * 0.0193 + v * 0.1192 + a * 0.9505) / 1.08883;
    const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  };
  const distancia = (uno: string, otro: string): number => {
    const a = aLab(uno);
    const b = aLab(otro);
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  };
  /* El mismo 20 de `verify:riberas`: ver allí por qué no es 25. */
  const CUANTO_SE_SEPARA_DE_UNA_PIEZA = 20;

  // ── 1. En qué columna del atlas pinta cada modelo su color de jugador ──────

  const glb = path.join(import.meta.dirname ?? __dirname, '..', 'modelos', 'tablero.glb');
  const tablero = await new NodeIO().read(glb);
  const nodos = tablero.getRoot().listNodes();
  const primitivasDe = (n: Node): Primitive[] => {
    const sacadas: Primitive[] = [];
    const bajar = (x: Node): void => {
      for (const p of x.getMesh()?.listPrimitives() ?? []) sacadas.push(p);
      for (const h of x.listChildren()) bajar(h);
    };
    bajar(n);
    return sacadas;
  };
  /** Las UV de un modelo que caen en la fila de los colores de jugador, por columna. */
  const columnasDeColor = (nombre: string): Map<number, number> => {
    const cuenta = new Map<number, number>();
    const nodo = nodos.find((n) => n.getName() === nombre);
    if (nodo === undefined) return cuenta;
    for (const prim of primitivasDe(nodo)) {
      const uv = prim.getAttribute('TEXCOORD_0');
      if (uv === null) continue;
      const st = [0, 0];
      for (let i = 0; i < uv.getCount(); i++) {
        uv.getElement(i, st);
        if (Math.floor((st[1] as number) * FILAS_DEL_ATLAS) !== 3) continue;
        const columna = Math.floor((st[0] as number) * COLUMNAS_DEL_ATLAS);
        cuenta.set(columna, (cuenta.get(columna) ?? 0) + 1);
      }
    }
    return cuenta;
  };

  /*
   * LOS EDIFICIOS QUE `poblar.ts` REPARTE POR LAS COMARCAS. No se leen de aquella tabla porque
   * está dentro de una constante privada; se nombran los que la lista `PUEBLO` y `OFICIO`
   * ponen, que son éstos, y se afirma que todos existen en el `.glb` — un nombre mal escrito
   * daría cero vértices y la comprobación de abajo pasaría por vacío.
   */
  const DEL_CASERIO = [
    'casa',
    'iglesia',
    'taberna',
    'mercado',
    'molino',
    'acena',
    'aserradero',
    'herreria',
    'mina',
    'pozo',
    'atalaya',
    'concejo',
    'taller',
    'cuadras',
    'ermita',
    'vigia',
  ];
  const COLUMNAS_DE_JUGADOR = new Set(Object.values(COLUMNA_DEL_COLOR));
  const conColorDeJugador = DEL_CASERIO.map((nombre) => {
    const cuenta = columnasDeColor(nombre);
    const suyas = [...cuenta.entries()].filter(([columna]) => COLUMNAS_DE_JUGADOR.has(columna));
    return { nombre, suyas };
  });
  comprobar(
    'los dieciséis edificios del caserío están dentro del .glb, o lo de abajo mediría cero vértices y pasaría por vacío',
    conColorDeJugador.every(({ nombre }) => nodos.some((n) => n.getName() === nombre)),
    conColorDeJugador.filter(({ nombre }) => !nodos.some((n) => n.getName() === nombre)).map((c) => c.nombre),
  );
  /*
   * ═══ EL HECHO QUE OBLIGA AL ZÓCALO, Y QUE AHORA ADEMÁS ES LA PALANCA ═══
   *
   * Esto NO es una comprobación que haya que arreglar: es la medida de la que cuelgan las dos
   * mitades del arreglo. La cabecera de `compilar-modelos.ts` dice que el choque de colores está
   * resuelto «por TIPO, porque las piezas de jugador son casa y castillo y ningún edificio de
   * adorno es una casa ni un castillo»: el adorno `casa` es `building_home_B_red` y la pieza es
   * `building_home_A_blue`, o sea la misma clase de edificio, y uno de los dos lleva el rojo de
   * un colono.
   *
   * Lo que ha cambiado es qué se hace con ello. Que el caserío pinte en la MISMA fila del atlas
   * era el problema, y desde esta tanda es también la solución: por eso el pueblo que rodea una
   * choza se puede llevar al color de su dueño moviendo la UV una columna, sin recompilar nada
   * (ver `caserio.ts` y el bloque del caserío, más abajo). Y el zócalo sigue haciendo falta
   * porque el pueblo dice de quién es la COMARCA y no en cuál de sus tres esquinas está puesta
   * la choza — y porque hay chozas cuyo pueblo cae lejos y se quedan sin ninguna.
   */
  const tejadosDeColono = conColorDeJugador.filter(({ suyas }) => suyas.length > 0);
  comprobar(
    `los ${String(tejadosDeColono.length)} edificios del caserío pintan su tejado en la MISMA fila del atlas que las piezas de jugador: la distancia de color entre un tejado de adorno y el de un poblado es CERO, no «poca», y por eso el zócalo no es un adorno`,
    tejadosDeColono.length === DEL_CASERIO.length,
    tejadosDeColono.map(
      ({ nombre, suyas }) => `${nombre}: ${suyas.map(([c, n]) => `columna ${String(c)} × ${String(n)}`).join(', ')}`,
    ),
  );

  // ── 2. El color llano de cada jugador sale del atlas, no de un gusto ───────

  /*
   * SE VUELVE A MEDIR lo que `COLOR_LLANO_DEL_JUGADOR` declara: se toman los vértices del
   * POBLADO que caen en la celda del color, se les aplica el desplazamiento de cada color —el
   * mismo que aplica la escena al cargar— y se promedia el color del atlas ahí. Sin esto, esos
   * cuatro hexadecimales serían cuatro colores «que pegan», y el día que el pack cambiara de
   * paleta el zócalo señalaría con un color que ya no lleva ninguna pieza.
   *
   * El atlas se lee de la TABLA COMPILADA, que es la que la app sube a la GPU y la que
   * `verify:atlas-del-tablero` compara píxel a píxel contra el PNG del pack: leer el PNG otra
   * vez aquí sería un tercer camino que nadie compara con los otros dos.
   */
  const tabla = tablaDelAtlas();
  const colorDelAtlas = (u: number, v: number): [number, number, number] => {
    const columna = Math.min(COLUMNAS_DE_LA_TABLA - 1, Math.max(0, Math.floor(u * COLUMNAS_DE_LA_TABLA)));
    /* Las filas de la tabla van de ARRIBA abajo, como el PNG y como las UV de glTF. */
    const fila = Math.min(ALTO_DEL_ATLAS - 1, Math.max(0, Math.floor(v * ALTO_DEL_ATLAS)));
    const i = (fila * COLUMNAS_DE_LA_TABLA + columna) * 3;
    return [tabla[i] as number, tabla[i + 1] as number, tabla[i + 2] as number];
  };
  const enHexadecimal = (c: readonly number[]): string =>
    `#${c.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
  /*
   * LA PIEZA BASE ES `poblado`, y el nombre sale de `PIEZAS_DE_COLOR` y no de una cadena
   * escrita aquí: esa lista es la que dice qué mallas viven en el `.glb` en UN solo color y se
   * tiñen moviendo las UV, que es exactamente la propiedad de la que depende esta medida.
   */
  const LA_PIEZA_BASE = PIEZAS_DE_COLOR[0];
  comprobar(
    'la pieza base de la que se mide el color es el poblado, la primera de las que vienen en un solo color',
    LA_PIEZA_BASE === 'poblado' && nodos.some((n) => n.getName() === LA_PIEZA_BASE),
    LA_PIEZA_BASE,
  );
  const medidoEnElPack = (color: string): string | null => {
    const nodo = nodos.find((n) => n.getName() === LA_PIEZA_BASE);
    if (nodo === undefined) return null;
    const desplaza = desplazamientoDeColor(color);
    const suma = [0, 0, 0];
    let cuantos = 0;
    for (const prim of primitivasDe(nodo)) {
      const uv = prim.getAttribute('TEXCOORD_0');
      if (uv === null) continue;
      const st = [0, 0];
      for (let i = 0; i < uv.getCount(); i++) {
        uv.getElement(i, st);
        const u = st[0] as number;
        const v = st[1] as number;
        if (!esDelColorDelJugador(u, v)) continue;
        const rgb = colorDelAtlas(u + desplaza.u, v + desplaza.v);
        suma[0] += rgb[0];
        suma[1] += rgb[1];
        suma[2] += rgb[2];
        cuantos++;
      }
    }
    if (cuantos === 0) return null;
    return enHexadecimal(suma.map((x) => x / cuantos));
  };

  /*
   * LA VARA es un paso de sRGB por canal, o sea unas dos unidades de CIE76: el promedio de un
   * degradado vertical no tiene por qué caer en un byte exacto, y pedir igualdad exacta sería
   * pedirle al comprobador que reprodujera el redondeo de quien escribió la constante. Dos
   * unidades es «se nota si están pegados», o sea la vara más fina que tiene sentido aquí.
   */
  const UN_PASO_DE_SRGB = 2;
  const desviados = COLORES_DE_JUGADOR.map((color) => {
    const medido = medidoEnElPack(color);
    const declarado = colorLlanoDelJugador(color);
    return { color, medido, declarado, cuanto: medido === null ? null : distancia(medido, declarado) };
  }).filter((d) => d.medido === null || (d.cuanto as number) > UN_PASO_DE_SRGB);
  comprobar(
    'los cuatro colores llanos de jugador son los que de verdad lleva la pieza dentro del atlas, medidos sobre el .glb: no son cuatro colores que peguen',
    desviados.length === 0,
    desviados,
  );
  /*
   * LA VACUNA: el mismo camino con los colores CRUZADOS —el azul declarado contra el rojo
   * medido— tiene que caer por los cuatro. Sin ella, «ninguno se desvía» seguiría siendo cierto
   * si `medidoEnElPack` devolviera siempre lo mismo que la tabla, que es el fallo típico de una
   * medida que se lee a sí misma.
   */
  const cruzados = COLORES_DE_JUGADOR.filter((color, i) => {
    const otro = COLORES_DE_JUGADOR[(i + 1) % COLORES_DE_JUGADOR.length] as string;
    const medido = medidoEnElPack(color);
    return medido !== null && distancia(medido, colorLlanoDelJugador(otro)) <= UN_PASO_DE_SRGB;
  });
  comprobar(
    'se ve fallar: cruzando cada color con el del siguiente, los cuatro se separan — la medida no se está leyendo a sí misma',
    cruzados.length === 0,
    cruzados,
  );

  // ── 3. Y el zócalo se ve sobre la isla en la que se posa ──────────────────

  /*
   * ═══ Y AQUÍ ES DONDE EL RELLENO DE COLOR SOLO NO VALE ═══
   *
   * El zócalo se posa sobre el suelo de su isla, y ese suelo sale del atlas. Se mide contra el
   * color del ATLAS de cada terreno —que es el suelo que de verdad hay debajo en tres
   * dimensiones— y no contra el color plano del tablero SVG, que es otro dibujo.
   *
   * ═══ Y CON LA OPACIDAD DENTRO DE LA CUENTA, QUE ES LO QUE ANTES NO ESTABA ═══
   *
   * La versión del aro medía `FILO_DEL_ZOCALO` A PELO contra el terreno, y el filo se pinta al
   * 0,75 de opacidad: la comprobación habría seguido en verde con un contorno a 0,1, que en
   * pantalla no es un contorno. Ahora lo que se mide es el color COMPUESTO —lo que de verdad
   * sale en el píxel— con la opacidad que el material lleva escrita, así que bajarla se ve aquí.
   *
   * (Se compone en el espacio en el que la GPU mezcla, que es el del framebuffer ya codificado:
   * `fondo·(1−α) + tinta·α` sobre los bytes. Es un modelo, y por eso la medida de verdad se
   * hace además contando píxeles sobre el lienzo; lo que esto compra es que el día que alguien
   * suba una opacidad o cambie un color, el número cambie AQUÍ y no dentro de dos semanas.)
   */
  const colorDelSuelo = (terreno: string): string => {
    const celda = (PALETA[terreno] as { celda: readonly [number, number] }).celda;
    return enHexadecimal(colorDelAtlas((celda[0] + 0.5) / COLUMNAS_DEL_ATLAS, (celda[1] + 0.5) / FILAS_DEL_ATLAS));
  };
  const enBytes = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  /** Lo que sale en el píxel al pintar `tinta` con esa opacidad sobre `fondo`. */
  const encima = (fondo: string, tinta: string, opacidad: number): string => {
    const f = enBytes(fondo);
    const t = enBytes(tinta);
    return enHexadecimal([0, 1, 2].map((i) => (f[i] as number) * (1 - opacidad) + (t[i] as number) * opacidad));
  };
  /** Lo que saldría SUMANDO luz, que es lo que hace la mezcla aditiva. */
  const sumando = (fondo: string, tinta: string, opacidad: number): string => {
    const f = enBytes(fondo);
    const t = enBytes(tinta);
    return enHexadecimal([0, 1, 2].map((i) => Math.min(255, (f[i] as number) + (t[i] as number) * opacidad)));
  };
  /*
   * LOS SEIS TERRENOS SON SEIS COLORES, y no doce: los doce nombres de `PALETA` se reparten seis
   * celdas del atlas —el carrizal pinta con la del bosque, la vega con la del campo—. Se mide
   * sobre los colores distintos para que las veinticuatro parejas sean veinticuatro y no
   * cuarenta y ocho con la mitad repetidas.
   */
  const SUELOS = [...new Set(Object.keys(PALETA).map((t) => colorDelSuelo(t)))];
  const comoSeLlama = (suelo: string): string =>
    Object.keys(PALETA).filter((t) => colorDelSuelo(t) === suelo).join('/');
  comprobar(
    `los doce terrenos de la paleta pintan con ${String(SUELOS.length)} colores de suelo distintos: seis, que son los seis contra los que hay que medir`,
    SUELOS.length === 6,
    SUELOS.map((s) => `${comoSeLlama(s)} ${s}`),
  );
  /*
   * ═══ LAS VEINTICUATRO PAREJAS, SIN CONTORNO Y CON EL DEGRADADO ═══
   *
   * Aquí había DOS comprobaciones que ya no existen —«ningún terreno se come el CONTORNO» y «el
   * relleno se separa de su propio contorno»— porque el contorno se ha quitado: se pidió, con
   * la producción delante, que la marca terminara «difuminándose del mismo color del área hacia
   * transparente hacia fuera, sin borde».
   *
   * Lo que las sustituye es LA MEDIDA QUE DE VERDAD IMPORTA, y que antes se hacía sólo como
   * vacuna: las veinticuatro parejas de color de jugador y suelo, con la marca sola. Porque el
   * contorno tenía un trabajo —hacer que la marca SE ENCUENTRE sobre cualquier terreno— y quien
   * lo hereda es la opacidad del degradado, que por eso sube de 0,55 a 0,85 —el techo que la
   * tinta permite sin que la marca pese más que la que llevaba contorno—.
   */
  const laMarcaSobre = (suelo: string, color: string, opacidad: number): number =>
    distancia(encima(suelo, colorLlanoDelJugador(color), opacidad), suelo);
  const lasVeinticuatro = (opacidad: number): Array<{ par: string; cuanto: number }> =>
    COLORES_DE_JUGADOR.flatMap((color) =>
      SUELOS.map((suelo) => ({
        par: `${color} sobre ${comoSeLlama(suelo)}`,
        cuanto: laMarcaSobre(suelo, color, opacidad),
      })),
    );
  const seLaComen = lasVeinticuatro(OPACIDAD_DEL_ZOCALO).filter(
    (x) => x.cuanto < CUANTO_SE_SEPARA_DE_UNA_PIEZA,
  );
  /*
   * ═══ Y DOS DE LAS VEINTICUATRO NO SE SALVAN, Y SE DICEN CON SU NÚMERO EN VEZ DE ESCONDERSE ═══
   *
   * El verde de jugador es `#007d52` y el carrizal es `#008454`: SON EL MISMO COLOR. Ninguna
   * cantidad de un color sobre sí mismo se ve, así que ni la opacidad entera salva esa pareja
   * —se comprueba justo debajo— y lo mismo, más flojo, con el amarillo sobre la vega. Eso no lo
   * arregla un degradado: lo arreglaría cambiar uno de los dos colores, y eso es una decisión de
   * quien manda y no de quien mide.
   *
   * Se escriben AQUÍ, por nombre, y se exige que sean EXACTAMENTE ésas dos: si mañana cae una
   * tercera —porque alguien toca el atlas o una opacidad— esto se pone rojo y lo cuenta, en vez
   * de dejar que la lista crezca en silencio.
   */
  const LAS_QUE_NINGUNA_OPACIDAD_SALVA = ['green sobre bosque/carrizal', 'yellow sobre campo/vega'];
  comprobar(
    `de las veinticuatro parejas de color y terreno, la marca a ${OPACIDAD_DEL_ZOCALO.toFixed(2)} se separa del suelo más de ${String(CUANTO_SE_SEPARA_DE_UNA_PIEZA)} en ${String(24 - seLaComen.length)}, y las ${String(seLaComen.length)} que no son las dos en las que el color del jugador y el del terreno SON EL MISMO: ${seLaComen.map((x) => `${x.par} ${x.cuanto.toFixed(1)}`).join(', ')}`,
    [...seLaComen.map((x) => x.par)].sort().join(' | ') ===
      [...LAS_QUE_NINGUNA_OPACIDAD_SALVA].sort().join(' | '),
    lasVeinticuatro(OPACIDAD_DEL_ZOCALO).map((x) => `${x.par}: ${x.cuanto.toFixed(1)}`),
  );
  const niOpacaDelTodo = lasVeinticuatro(1).filter((x) => x.cuanto < CUANTO_SE_SEPARA_DE_UNA_PIEZA);
  comprobar(
    `y no es que le falte opacidad: pintando la marca OPACA DEL TODO caen las mismas ${String(niOpacaDelTodo.length)} y con casi el mismo número (${niOpacaDelTodo.map((x) => `${x.par} ${x.cuanto.toFixed(1)}`).join(', ')}) — subir la opacidad no las salva, así que subirla más sólo pesaría`,
    [...niOpacaDelTodo.map((x) => x.par)].sort().join(' | ') ===
      [...seLaComen.map((x) => x.par)].sort().join(' | '),
    niOpacaDelTodo,
  );
  /*
   * LA VACUNA, Y ES LA QUE JUSTIFICA LA SUBIDA DE OPACIDAD: con el 0,55 que tenía el relleno
   * cuando era la mitad de un dúo, cae UNA MÁS —el amarillo sobre la duna—. O sea que el paso a
   * 0,85 no es un gusto: es la pareja que el degradado sí puede salvar en la tabla, y la única.
   */
  const COMO_ERA_EL_RELLENO = 0.55;
  const alViejoRelleno = lasVeinticuatro(COMO_ERA_EL_RELLENO).filter(
    (x) => x.cuanto < CUANTO_SE_SEPARA_DE_UNA_PIEZA,
  );
  const laQueSeSalva = alViejoRelleno.filter((x) => !seLaComen.some((y) => y.par === x.par));
  comprobar(
    `se ve fallar: a la opacidad que tenía el relleno con contorno —${COMO_ERA_EL_RELLENO.toFixed(2)}— caerían ${String(alViejoRelleno.length)} parejas y no ${String(seLaComen.length)}; la que la subida salva es ${laQueSeSalva.map((x) => `${x.par}, de ${x.cuanto.toFixed(1)} a ${lasVeinticuatro(OPACIDAD_DEL_ZOCALO).find((y) => y.par === x.par)?.cuanto.toFixed(1) ?? '?'}`).join(', ')}`,
    alViejoRelleno.length === seLaComen.length + 1 && laQueSeSalva.length === 1,
    { alViejoRelleno, ahora: seLaComen, laQueSeSalva },
  );
  /*
   * ═══ Y LA OTRA MITAD DEL TRABAJO: DECIR DE QUIÉN ES ═══
   *
   * La marca es translúcida: mezclada con el terreno, dos colores de jugador podrían acercarse.
   * Se mide que NO, en las veinticuatro parejas de color y terreno tomadas de dos en dos. Con el
   * degradado esto puede EMPEORAR —el borde es más tenue—, así que se vuelve a medir con la
   * opacidad de ahora y no se hereda el número de antes.
   */
  const confundibles: string[] = [];
  let laPeorPareja = Infinity;
  for (const suelo of SUELOS) {
    const pintados = COLORES_DE_JUGADOR.map((c) => ({
      c,
      hex: encima(suelo, colorLlanoDelJugador(c), OPACIDAD_DEL_ZOCALO),
    }));
    for (let i = 0; i < pintados.length; i++) {
      for (let j = i + 1; j < pintados.length; j++) {
        const cuanto = distancia((pintados[i] as { hex: string }).hex, (pintados[j] as { hex: string }).hex);
        laPeorPareja = Math.min(laPeorPareja, cuanto);
        if (cuanto < CUANTO_SE_SEPARA_DE_UNA_PIEZA) {
          confundibles.push(
            `${(pintados[i] as { c: string }).c} contra ${(pintados[j] as { c: string }).c} sobre ${comoSeLlama(suelo)}: ${cuanto.toFixed(1)}`,
          );
        }
      }
    }
  }
  comprobar(
    `las cuatro marcas translúcidas se separan entre sí sobre los seis terrenos —la peor pareja a ${laPeorPareja.toFixed(1)}—: la marca sigue diciendo DE QUIÉN es la pieza y no sólo que hay una`,
    confundibles.length === 0,
    confundibles,
  );
  /*
   * ═══ Y LA VACUNA DE LA SALIDA ELEGANTE QUE NO ERA, QUE ES LA QUE COSTÓ DECIDIR ═══
   *
   * La propuesta era MEZCLA ADITIVA: un disco que SUMA luz en vez de sustituir color se lee
   * sobre cualquier terreno, y el problema del color desaparecería por construcción en vez de
   * por un contorno. Medida, no vale, y falla por los DOS lados:
   *
   *   · contra el suelo, el peor par se queda en 11,2 (el rojo sobre la duna);
   *   · y ENTRE SÍ —que es lo que de verdad la mata— el verde y el amarillo sobre esa misma
   *     arena se separan 13,6, porque sumando luz sobre un terreno claro los cuatro colores se
   *     van al blanco a la vez.
   *
   * Se deja escrito como comprobación y no como comentario para que el día que alguien vuelva a
   * proponerlo —y se propone solo, porque es la idea bonita— el número esté aquí y no haya que
   * volver a medirlo. Si algún día el atlas cambiara y la aditiva SÍ valiera, esto se pondría
   * rojo y contaría por qué.
   */
  let peorAditivaContraElSuelo = Infinity;
  let peorAditivaEntreSi = Infinity;
  let elParDeLaAditiva = '';
  for (const suelo of SUELOS) {
    const sumados = COLORES_DE_JUGADOR.map((c) => ({
      c,
      hex: sumando(suelo, colorLlanoDelJugador(c), OPACIDAD_DEL_ZOCALO),
    }));
    for (const p of sumados) peorAditivaContraElSuelo = Math.min(peorAditivaContraElSuelo, distancia(p.hex, suelo));
    for (let i = 0; i < sumados.length; i++) {
      for (let j = i + 1; j < sumados.length; j++) {
        const cuanto = distancia((sumados[i] as { hex: string }).hex, (sumados[j] as { hex: string }).hex);
        if (cuanto < peorAditivaEntreSi) {
          peorAditivaEntreSi = cuanto;
          elParDeLaAditiva = `${(sumados[i] as { c: string }).c}/${(sumados[j] as { c: string }).c} sobre ${comoSeLlama(suelo)}`;
        }
      }
    }
  }
  comprobar(
    `se ve fallar: con mezcla aditiva la marca se separaría del suelo sólo ${peorAditivaContraElSuelo.toFixed(1)} en el peor par, y DOS colores de jugador se separarían entre sí ${peorAditivaEntreSi.toFixed(1)} (${elParDeLaAditiva}) — sobre arena los cuatro se van al blanco a la vez, y una marca que no dice de quién es no vale para nada`,
    peorAditivaContraElSuelo < CUANTO_SE_SEPARA_DE_UNA_PIEZA &&
      peorAditivaEntreSi < CUANTO_SE_SEPARA_DE_UNA_PIEZA,
    { contraElSuelo: peorAditivaContraElSuelo, entreSi: peorAditivaEntreSi, elPar: elParDeLaAditiva },
  );

  // ── 4. Y mide lo mismo en pantalla desde donde se mire ────────────────────

  /*
   * ═══ LA SEGUNDA CAUSA, QUE NINGÚN COLOR ARREGLA ═══
   *
   * La vista de tablero mira el delta desde lo alto. `encuadreDelDelta` pone la cámara a
   * `mayor·1,25` de altura y `mayor·1,15` de fondo, con `mayor` el radio del mundo: se rehace
   * esa cuenta aquí —sobre `mallaDeRadio(2)`, que es el delta de verdad— en vez de escribir el
   * número, para que el día que el encuadre cambie esto lo siga midiendo.
   *
   * A esa distancia, una pieza del pack de cinco unidades ocupa una fracción de pantalla que se
   * cuenta abajo, y por eso una partida entera de piezas puestas se ve igual que el tablero
   * vacío. El zócalo no: su tamaño sale de `tallaDeUnaMarca`, que es la misma cuenta con la que
   * la señal de un sitio libre se ve desde donde sea.
   */
  const radioDelMundo = DELTA.reduce((mayor, h) => {
    const c = centroDeHex(h, RADIO_DE_COMARCA);
    return Math.max(mayor, Math.hypot(c.x, c.y) + RADIO_DE_COMARCA);
  }, RADIO_DE_COMARCA);
  const desdeElAire = Math.hypot(radioDelMundo * 1.25, radioDelMundo * 1.15);
  const CAMPO = (45 * Math.PI) / 180;
  const altoQueSeVe = 2 * desdeElAire * Math.tan(CAMPO / 2);

  /*
   * LO QUE MIDE UNA PIEZA DE VERDAD: la caja del poblado del `.glb`, a la escala del pack. No
   * se escribe «cinco unidades»: se mide el modelo.
   */
  const cajaDelPoblado = ((): number => {
    const nodo = nodos.find((n) => n.getName() === LA_PIEZA_BASE);
    if (nodo === undefined) return 0;
    let ancho = 0;
    const punto = [0, 0, 0];
    for (const prim of primitivasDe(nodo)) {
      const pos = prim.getAttribute('POSITION');
      if (pos === null) continue;
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, punto);
        ancho = Math.max(ancho, Math.hypot(punto[0] as number, punto[2] as number) * 2);
      }
    }
    return ancho;
  })();
  const parteQueOcupaLaPieza = (cajaDelPoblado * ESCALA_DEL_PACK) / altoQueSeVe;
  const EN_UNA_VENTANA_DE = 900;

  /*
   * ═══ Y UN POBLADO NO ES ESE NODO: ES TRECE GRUPOS ═══
   *
   * Lo de arriba mide `LA_PIEZA_BASE`, o sea el nodo `poblado` SUELTO del `.glb`. Eso es la
   * casa del jugador y nada más, y con ella se escribió durante una tanda entera que la marca
   * medía «2,2 veces la pieza». En el juego un poblado NO es ese modelo: `asentamiento.ts` lo
   * rodea de tres casas, un pozo, cuatro vallas, dos árboles y una bandera —TRECE grupos— y una
   * ciudad es un recinto amurallado de doce. Comparar la marca contra un nodo suelto era
   * comparar contra algo que no se pinta nunca.
   *
   * Así que aquí se mide lo que de verdad hay en el vértice: se piden las piezas a
   * `piezasDeAsentamiento` —la misma función que las coloca— y de cada una se toma su sitio
   * más el radio de su modelo, a la escala del pack y con su talla. Se recorren los CINCUENTA Y
   * CUATRO vértices del delta porque la forma del caserío sale del revoltijo de la llave: dos
   * vértices dan dos pueblos distintos, y lo que hay que saber es el peor.
   *
   * Y SE MIDE CON EL GIRO PUESTO, que es la diferencia entre una cota y una medida. Sumar
   * «lo que dista el sitio más el radio del modelo» es una cota superior que no depende del
   * giro, y con ella la muralla de una ciudad sale a 16,83 cuando de verdad llega a 12,43 —un
   * 35 % más—: un codo de muralla es largo y estrecho, y va puesto ATRAVESANDO su tesela, no
   * apuntando hacia afuera. Con la cota, el disco que «asoma» tendría que ser la mitad de
   * grande otra vez.
   *
   * (AQUÍ PONÍA 11,66 Y ERA FALSO. El 16,83 está bien; el otro no: la muralla llega a 12,43.
   * 11,66 es un peldaño de la escalera de radios que la cabecera de `escala.ts` escribe —10,93
   * → 40 px; 11,66 → 78; 12,39 → 123— y se coló en la frase que sostiene la decisión técnica.
   * El argumento no se debilita, porque la cota sigue siendo un 35 % mayor que la medida; el
   * número sí estaba mal. Los DOS se rehacen aquí abajo y salen en el mensaje de su
   * comprobación, para que nadie tenga que fiarse de esta prosa.)
   *
   * El radio del modelo baja además por los hijos con su traslación y su escala. Sin eso, un
   * modelo cuya malla cuelga de un nodo desplazado mediría desde el sitio equivocado.
   */
  const sinElColor = (nombre: string): string => {
    for (const color of COLORES_DE_JUGADOR) if (nombre.endsWith(`-${color}`)) return nombre.slice(0, -color.length - 1);
    return nombre;
  };
  const faltanDelPack: string[] = [];
  const puntosEnElPack = (() => {
    const cache = new Map<string, number[]>();
    return (nombre: string): number[] => {
      const guardado = cache.get(nombre);
      if (guardado !== undefined) return guardado;
      /*
       * EL NOMBRE DE UNA PIEZA DE JUGADOR NO ES EL DE SU NODO. El `.glb` trae UNA torre y
       * las cuatro salen de mover las UV (`PIEZAS_DE_COLOR`), así que `torre-blue` no existe
       * dentro del fichero y buscarlo tal cual devuelve cero puntos — o sea una torre que no
       * mide nada, que es exactamente la clase de cero que se lee como «vigilado».
       */
      const raiz = nodos.find((n) => n.getName() === sinElColor(nombre));
      const puntos: number[] = [];
      if (raiz === undefined) faltanDelPack.push(nombre);
      if (raiz !== undefined) {
        const bajar = (n: Node, tx: number, tz: number, s: number): void => {
          const t = n.getTranslation();
          const e = n.getScale();
          const px = tx + (t[0] as number) * s;
          const pz = tz + (t[2] as number) * s;
          const ss = s * Math.max(Math.abs(e[0] as number), Math.abs(e[2] as number));
          for (const prim of n.getMesh()?.listPrimitives() ?? []) {
            const pos = prim.getAttribute('POSITION');
            if (pos === null) continue;
            const p = [0, 0, 0];
            for (let i = 0; i < pos.getCount(); i++) {
              pos.getElement(i, p);
              puntos.push(px + (p[0] as number) * ss, pz + (p[2] as number) * ss);
            }
          }
          for (const h of n.listChildren()) bajar(h, px, pz, ss);
        };
        bajar(raiz, 0, 0, 1);
      }
      cache.set(nombre, puntos);
      return puntos;
    };
  })();
  const TODOS_LOS_VERTICES = verticesDe(DELTA);
  /** Hasta dónde llega, en unidades de mundo, lo que se planta en un vértice. */
  const radioDeLoQueSePlanta = (
    clase: 'poblado' | 'ciudad',
    sirve: (modelo: string) => boolean = () => true,
  ): number => {
    let radio = 0;
    for (const v of TODOS_LOS_VERTICES) {
      for (const parte of piezasDeAsentamiento(clase, 'blue', v)) {
        if (!sirve(parte.modelo)) continue;
        const puntos = puntosEnElPack(parte.modelo);
        const escala = ESCALA_DEL_PACK * parte.talla;
        /* El mismo giro que `delta.tsx` le pone al grupo: `rotation={[0, parte.giro, 0]}`. */
        const cos = Math.cos(parte.giro);
        const sen = Math.sin(parte.giro);
        for (let i = 0; i < puntos.length; i += 2) {
          const x = puntos[i] as number;
          const z = puntos[i + 1] as number;
          radio = Math.max(
            radio,
            Math.hypot(
              parte.donde.x + (x * cos + z * sen) * escala,
              parte.donde.y + (-x * sen + z * cos) * escala,
            ),
          );
        }
      }
    }
    return radio;
  };
  const RADIO_DEL_CASERIO_DE_UNA_CHOZA = radioDeLoQueSePlanta('poblado');
  const RADIO_DE_UNA_FORTALEZA = radioDeLoQueSePlanta('ciudad');
  /*
   * LO QUE TAPA EL DISCO DE UNA CIUDAD ES LA MURALLA, y no la torre más lejana: las torres son
   * TRES y el disco asoma entre ellas; los seis codos de muralla dan la vuelta entera y no
   * dejan ni un hueco. Por eso el radio contra el que hay que medir es el de los codos.
   */
  const esMuralla = (modelo: string): boolean =>
    modelo === MODELO.muroEsquina || modelo === MODELO.muroEsquinaPuerta;
  const RADIO_DEL_RECINTO = radioDeLoQueSePlanta('ciudad', esMuralla);
  /*
   * Y LA COTA SIN GIRO, rehecha aquí al lado para que la cabecera de arriba no cite un número
   * que nadie recalcula. Es la misma suma que se descartó —«lo que dista el sitio más el radio
   * del modelo»— y se guarda porque la diferencia entre las dos es el argumento entero: con la
   * cota, el disco que «asoma» tendría que ser la mitad de grande otra vez.
   */
  const cotaSinGiro = (clase: 'poblado' | 'ciudad', sirve: (modelo: string) => boolean): number => {
    let cota = 0;
    for (const v of TODOS_LOS_VERTICES) {
      for (const parte of piezasDeAsentamiento(clase, 'blue', v)) {
        if (!sirve(parte.modelo)) continue;
        const puntos = puntosEnElPack(parte.modelo);
        const escala = ESCALA_DEL_PACK * parte.talla;
        let delModelo = 0;
        for (let i = 0; i < puntos.length; i += 2) {
          delModelo = Math.max(delModelo, Math.hypot(puntos[i] as number, puntos[i + 1] as number) * escala);
        }
        cota = Math.max(cota, Math.hypot(parte.donde.x, parte.donde.y) + delModelo);
      }
    }
    return cota;
  };
  const COTA_DEL_RECINTO = cotaSinGiro('ciudad', esMuralla);
  comprobar(
    `y la MEDIDA con el giro puesto no es la COTA sin él: sumando «sitio + radio del modelo» la muralla sale a ${COTA_DEL_RECINTO.toFixed(2)} y de verdad llega a ${RADIO_DEL_RECINTO.toFixed(2)}, un ${(((COTA_DEL_RECINTO - RADIO_DEL_RECINTO) / RADIO_DEL_RECINTO) * 100).toFixed(0)} % más — porque un codo de muralla es largo y estrecho y va ATRAVESANDO su tesela, no apuntando hacia afuera`,
    COTA_DEL_RECINTO > RADIO_DEL_RECINTO * 1.2 && COTA_DEL_RECINTO < RADIO_DEL_RECINTO * 1.6,
    {
      cota: Number(COTA_DEL_RECINTO.toFixed(2)),
      medida: Number(RADIO_DEL_RECINTO.toFixed(2)),
      cuantoMas: Number((((COTA_DEL_RECINTO - RADIO_DEL_RECINTO) / RADIO_DEL_RECINTO) * 100).toFixed(1)),
    },
  );
  const anchoEnPixeles = (radioDeMundo: number): number =>
    ((2 * radioDeMundo) / altoQueSeVe) * EN_UNA_VENTANA_DE;
  comprobar(
    `y lo que se planta en un vértice mide mucho más que ese nodo: un poblado llega a ${RADIO_DEL_CASERIO_DE_UNA_CHOZA.toFixed(2)} del vértice —${anchoEnPixeles(RADIO_DEL_CASERIO_DE_UNA_CHOZA).toFixed(1)} píxeles de diámetro desde la vista de tablero— y una ciudad a ${RADIO_DE_UNA_FORTALEZA.toFixed(2)} (${anchoEnPixeles(RADIO_DE_UNA_FORTALEZA).toFixed(1)} píxeles), con la muralla cerrando a ${RADIO_DEL_RECINTO.toFixed(2)}`,
    faltanDelPack.length === 0 &&
      RADIO_DEL_CASERIO_DE_UNA_CHOZA > cajaDelPoblado * ESCALA_DEL_PACK * 2 &&
      RADIO_DE_UNA_FORTALEZA > 0 &&
      RADIO_DEL_RECINTO > 0 &&
      RADIO_DEL_RECINTO < RADIO_DE_UNA_FORTALEZA,
    {
      poblado: Number(RADIO_DEL_CASERIO_DE_UNA_CHOZA.toFixed(2)),
      ciudad: Number(RADIO_DE_UNA_FORTALEZA.toFixed(2)),
      recinto: Number(RADIO_DEL_RECINTO.toFixed(2)),
      elNodoSuelto: Number(((cajaDelPoblado * ESCALA_DEL_PACK) / 2).toFixed(2)),
      faltanDelPack: [...new Set(faltanDelPack)],
    },
  );
  comprobar(
    `un poblado ocupa el ${(parteQueOcupaLaPieza * 100).toFixed(2)} % del alto desde la vista de tablero —${(parteQueOcupaLaPieza * EN_UNA_VENTANA_DE).toFixed(0)} píxeles en una ventana de ${String(EN_UNA_VENTANA_DE)}— y su tejado sale del mismo téxel que el de las casas de adorno que tiene alrededor: por eso el tablero repartido y el tablero con seis chozas salían iguales`,
    cajaDelPoblado > 0 && parteQueOcupaLaPieza < ZOCALO_EN_PANTALLA,
    {
      cajaDelPack: Number(cajaDelPoblado.toFixed(3)),
      enElMundo: Number((cajaDelPoblado * ESCALA_DEL_PACK).toFixed(1)),
      desdeElAire: Number(desdeElAire.toFixed(1)),
      altoQueSeVe: Number(altoQueSeVe.toFixed(1)),
      parte: Number(parteQueOcupaLaPieza.toFixed(4)),
      pixeles: Number((parteQueOcupaLaPieza * EN_UNA_VENTANA_DE).toFixed(1)),
    },
  );
  /*
   * Y EL ZÓCALO OCUPA LO QUE PROMETE, desde el aire y desde el suelo. Es lo que compra que no
   * sea un objeto del mundo sino un cartel: la misma fracción de pantalla a cualquier
   * distancia, salvo donde los topes muerden.
   */
  const talla = (lejos: number): number =>
    tallaDeUnaMarca(lejos, CAMPO, ZOCALO_EN_PANTALLA, SUELO_DEL_ZOCALO, TECHO_DEL_ZOCALO);
  const parteQueOcupa = (lejos: number): number =>
    (talla(lejos) * RADIO_DE_TESELA) / (2 * lejos * Math.tan(CAMPO / 2));
  comprobar(
    `el zócalo ocupa el ${(parteQueOcupa(desdeElAire) * 100).toFixed(1)} % del alto desde la vista de tablero y lo mismo a media altura: mide igual en pantalla desde donde se mire`,
    Math.abs(parteQueOcupa(desdeElAire) - ZOCALO_EN_PANTALLA) < 1e-9 &&
      Math.abs(parteQueOcupa(desdeElAire / 2) - ZOCALO_EN_PANTALLA) < 1e-9,
    { desdeElAire: parteQueOcupa(desdeElAire), aMediaAltura: parteQueOcupa(desdeElAire / 2) },
  );
  /*
   * ═══ CUÁNTO MIDE LA MARCA CONTRA LO QUE MARCA, Y AQUÍ HABÍA UNA CIFRA FALSA ═══
   *
   * Conviene decir en qué orden pesan las dos causas, porque el tamaño es la que se ve venir y
   * NO es la que más manda. Una pieza de once píxeles no es invisible: lo que la hace
   * indistinguible es que su tejado sale del mismo téxel que el de las casas de adorno que
   * `poblar.ts` reparte alrededor —hasta cinco por comarca—, y once píxeles de casa roja entre
   * casas rojas no son nada. El zócalo arregla eso porque el decorado NO tiene ninguno.
   *
   * Aquí ponía que el disco mide «2,2 veces la pieza», y era falso: comparaba contra
   * `parteQueOcupaLaPieza`, o sea contra el nodo `poblado` SUELTO del `.glb`. Lo que se planta
   * en un vértice mide cuatro veces más —se acaba de medir arriba—, así que la marca es MÁS
   * PEQUEÑA que el asentamiento, no el doble de grande. Y tiene que serlo: un disco del tamaño
   * del caserío, en los 54 vértices, es la alfombra que se mide más abajo.
   *
   * Lo que sí se sostiene, y es lo que el suelo de la talla compra, es que el disco pasa de la
   * pieza CENTRAL —la casa del jugador, que es lo que hay EN el vértice— y por eso no se pierde
   * antes que el tejado al que apunta.
   */
  const anchoDeLaMarca = (2 * loQueOcupaElZocalo('disco').fuera * ZOCALO_EN_PANTALLA) * EN_UNA_VENTANA_DE;
  const anchoDeLaPieza = parteQueOcupaLaPieza * EN_UNA_VENTANA_DE;
  const CUANTO_MAYOR_QUE_LA_PIEZA = 2;
  comprobar(
    `desde la vista de tablero el disco mide ${anchoDeLaMarca.toFixed(1)} píxeles de diámetro contra los ${anchoDeLaPieza.toFixed(1)} de la casa del jugador —${(anchoDeLaMarca / anchoDeLaPieza).toFixed(1)} veces— y a diferencia de ella no encoge al alejarse`,
    anchoDeLaMarca > anchoDeLaPieza * CUANTO_MAYOR_QUE_LA_PIEZA,
    { marca: anchoDeLaMarca, laCasaDelJugador: anchoDeLaPieza, veces: anchoDeLaMarca / anchoDeLaPieza },
  );
  /*
   * Y LA CIFRA QUE LA CABECERA DECÍA AL REVÉS, escrita ahora con el número que sale: contra el
   * ASENTAMIENTO ENTERO la marca es más pequeña, y por eso el disco de un poblado se ve por los
   * huecos entre las casas y no por fuera de ellas.
   */
  const anchoDelCaserio = anchoEnPixeles(RADIO_DEL_CASERIO_DE_UNA_CHOZA);
  comprobar(
    `y contra el asentamiento ENTERO la marca es más pequeña, no más grande: ${anchoDeLaMarca.toFixed(1)} píxeles de disco contra ${anchoDelCaserio.toFixed(1)} de caserío, o sea ${(anchoDeLaMarca / anchoDelCaserio).toFixed(2)} veces la pieza`,
    anchoDeLaMarca < anchoDelCaserio && anchoDeLaMarca / anchoDelCaserio > 0.25,
    { marca: Number(anchoDeLaMarca.toFixed(1)), caserio: Number(anchoDelCaserio.toFixed(1)), veces: Number((anchoDeLaMarca / anchoDelCaserio).toFixed(2)) },
  );
  /*
   * ═══ Y EL DISCO DE UNA CIUDAD TIENE QUE ASOMAR POR FUERA DE SU RECINTO ═══
   *
   * Éste es el fallo que un jugador nota antes que ningún otro, y no lo cazaba nada. Un poblado
   * son casas sueltas con calles entre ellas y el disco se ve por los huecos; una CIUDAD es un
   * recinto CERRADO —seis codos de muralla dando la vuelta entera, con el castillo dentro— y un
   * disco que quepa debajo no se ve por ningún lado. Medido en el banco con `gl.render` +
   * `readPixels`, comparando el mismo fotograma con la marca y con ella a opacidad cero: a la
   * talla de la choza la torre pintaba VEINTINUEVE píxeles de marca —en dos manchas de veinte y
   * nueve— contra los 191 y 238 de dos chozas del mismo fotograma.
   *
   * Aquí se compra la condición geométrica de la que eso cuelga: que el borde del disco pase
   * del radio de la MURALLA desde la vista de tablero. La muralla y no la torre más lejana,
   * porque las torres son tres y el disco asoma entre ellas; los codos no dejan ni un hueco.
   */
  /*
   * El radio del disco en unidades de MUNDO: `tallaDeUnaMarca` devuelve
   * `altoQueSeVe · parte / RADIO_DE_TESELA` y las piezas van en múltiplos de la tesela, así
   * que la tesela se va y queda `altoQueSeVe · parte · fuera`. No se escribe el número: se
   * rehace con el encuadre de verdad, que es el mismo con el que se mide todo este bloque.
   */
  /*
   * ═══ Y SE MIDE EN LOS 54 VÉRTICES, NO EN EL CENTRO DEL TABLERO ═══
   *
   * Aquí se compraba la condición en un punto que no existe. `discoEnElMundo` colgaba de
   * `altoQueSeVe`, que sale de `desdeElAire`: la distancia de la cámara al CENTRO del delta,
   * 574,6. Pero `tallaDelZocalo` NO escala con esa distancia — escala con la distancia de la
   * cámara A LA PIEZA, y ésa es distinta en cada vértice: desde el encuadre de salida los
   * cincuenta y cuatro están entre 431,5 y 821,6, y en ninguno hay una ciudad a 574,6.
   *
   * Con la distancia del centro el disco de una ciudad salía a 12,66 y la muralla cierra a
   * 12,43: el sí venía por dos décimas, y en el vértice MÁS CERCANO el mismo disco se quedaba
   * en 9,51 — tapado entero por la muralla, que es literalmente el fallo que este bloque existe
   * para cazar, en la mitad del tablero que está más cerca del ojo.
   *
   * Así que se recorren los vértices con SU distancia —la misma cámara de `three` que se monta
   * abajo para el bloque del aire, y la misma llamada que hace el `useFrame`— y se exige la
   * condición en el PEOR de ellos. Lo que el peor pide no lo puede dar una fracción de
   * pantalla: para que el más cercano asomara haría falta el 3,48 %, más que la señal de un
   * sitio libre. Lo da `sueloDeLaMarca`, que es un mínimo del MUNDO y está medido en
   * `escala.ts` junto a la ventana de cuatro centésimas en la que cabe.
   */
  const ojoDelEncuadre = new THREE.PerspectiveCamera(45, 16 / 9, 1, 10000);
  ojoDelEncuadre.position.set(0, radioDelMundo * 1.25, radioDelMundo * 1.15);
  const sitiosDeChoza = TODOS_LOS_VERTICES.map((v) => {
    const q = puntoDeVertice(v, RADIO_DE_COMARCA);
    return { que: v, donde: [q.x, 0, q.y] as [number, number, number] };
  });
  const loLejosQueEsta = (donde: readonly [number, number, number]): number =>
    Math.hypot(
      ojoDelEncuadre.position.x - donde[0],
      ojoDelEncuadre.position.y - donde[1],
      ojoDelEncuadre.position.z - donde[2],
    );
  const discoEnElMundo = (
    parte: number,
    suelo: number,
    techo: number,
    donde: readonly [number, number, number],
  ): number => loLejosQueLlegaLaMarca('disco', tallaDelZocalo(ojoDelEncuadre, donde, parte, suelo, techo));
  const losDiscos = (
    parte: number,
    suelo: number,
    techo: number,
  ): Array<{ que: string; lejos: number; radio: number }> =>
    sitiosDeChoza.map((s) => ({
      que: s.que,
      lejos: loLejosQueEsta(s.donde),
      radio: discoEnElMundo(parte, suelo, techo, s.donde),
    }));
  const LOS_DE_CIUDAD = losDiscos(
    ZOCALO_DE_CIUDAD_EN_PANTALLA,
    sueloDeLaMarca('ciudad'),
    techoDeLaMarca('ciudad'),
  );
  const LOS_DE_POBLADO = losDiscos(
    ZOCALO_EN_PANTALLA,
    sueloDeLaMarca('poblado'),
    techoDeLaMarca('poblado'),
  );
  const elPeorDeLaCiudad = LOS_DE_CIUDAD.reduce((peor, d) => (d.radio < peor.radio ? d : peor));
  const elMayorDePoblado = LOS_DE_POBLADO.reduce((mayor, d) => (d.radio > mayor.radio ? d : mayor));
  const DISCO_DE_CIUDAD = elPeorDeLaCiudad.radio;
  const DISCO_DE_POBLADO = elMayorDePoblado.radio;
  comprobar(
    `el disco de una CIUDAD asoma por fuera de su recinto EN LOS ${String(sitiosDeChoza.length)} VÉRTICES y no sólo desde el centro: en el peor —${elPeorDeLaCiudad.que}, a ${elPeorDeLaCiudad.lejos.toFixed(1)} de la cámara— llega a ${DISCO_DE_CIUDAD.toFixed(2)} contra los ${RADIO_DEL_RECINTO.toFixed(2)} que mide la muralla, y el mayor de los discos de poblado se queda en ${DISCO_DE_POBLADO.toFixed(2)} — que debajo de una ciudad es un disco que no está`,
    LOS_DE_CIUDAD.every((d) => d.radio > RADIO_DEL_RECINTO) && DISCO_DE_CIUDAD > DISCO_DE_POBLADO,
    {
      elPeor: elPeorDeLaCiudad.que,
      ciudad: Number(DISCO_DE_CIUDAD.toFixed(2)),
      recinto: Number(RADIO_DEL_RECINTO.toFixed(2)),
      poblado: Number(DISCO_DE_POBLADO.toFixed(2)),
      elMasCerca: Number(Math.min(...LOS_DE_CIUDAD.map((d) => d.lejos)).toFixed(1)),
      elMasLejos: Number(Math.max(...LOS_DE_CIUDAD.map((d) => d.lejos)).toFixed(1)),
      alCentro: Number(desdeElAire.toFixed(1)),
      parte: ZOCALO_DE_CIUDAD_EN_PANTALLA,
      suelo: sueloDeLaMarca('ciudad'),
    },
  );
  /*
   * LA VACUNA DE LA DISTANCIA, Y ES EL FALLO QUE ESTABA ESCONDIDO: sólo con la fracción de
   * pantalla —o sea con el suelo de siempre, que es lo que había— el disco del vértice más
   * cercano se queda por DEBAJO de la muralla, y la cuenta vieja, hecha a la distancia del
   * centro, daba el sí. Los dos números en el mismo mensaje, que es lo que enseña que el punto
   * que se compraba no existía.
   */
  const SIN_EL_SUELO_DE_CIUDAD = losDiscos(
    ZOCALO_DE_CIUDAD_EN_PANTALLA,
    SUELO_DEL_ZOCALO,
    techoDeLaMarca('ciudad'),
  );
  const elMasChicoSinSuelo = Math.min(...SIN_EL_SUELO_DE_CIUDAD.map((d) => d.radio));
  const comoSeMediaAntes = altoQueSeVe * ZOCALO_DE_CIUDAD_EN_PANTALLA * loQueOcupaElZocalo('disco').fuera;
  comprobar(
    `se ve fallar: sólo con la fracción de pantalla, el disco del vértice más cercano se quedaría en ${elMasChicoSinSuelo.toFixed(2)} contra los ${RADIO_DEL_RECINTO.toFixed(2)} de la muralla —tapado entero—, y la cuenta vieja, hecha a la distancia del CENTRO del tablero, decía ${comoSeMediaAntes.toFixed(2)} y daba el sí`,
    elMasChicoSinSuelo < RADIO_DEL_RECINTO &&
      comoSeMediaAntes > RADIO_DEL_RECINTO &&
      SIN_EL_SUELO_DE_CIUDAD.some((d) => d.radio < RADIO_DEL_RECINTO),
    {
      sinSuelo: Number(elMasChicoSinSuelo.toFixed(2)),
      alCentro: Number(comoSeMediaAntes.toFixed(2)),
      recinto: Number(RADIO_DEL_RECINTO.toFixed(2)),
      cuantosVerticesTapados: SIN_EL_SUELO_DE_CIUDAD.filter((d) => d.radio < RADIO_DEL_RECINTO).length,
    },
  );
  /*
   * LA VACUNA DE LA CLASE, y es el fallo que había cuando las dos clases medían igual: con la
   * talla de la choza el disco de una ciudad cabe debajo de la muralla con holgura EN LOS 54
   * VÉRTICES, no sólo en el del medio. Es la medida que dice que el número nuevo no es un gusto.
   */
  comprobar(
    `se ve fallar: con la talla de una choza, el disco de una ciudad llegaría como mucho a ${DISCO_DE_POBLADO.toFixed(2)} en los ${String(sitiosDeChoza.length)} vértices y la muralla cierra a ${RADIO_DEL_RECINTO.toFixed(2)} — cabe debajo entero, que es por lo que pintaba 29 píxeles`,
    LOS_DE_POBLADO.every((d) => d.radio < RADIO_DEL_RECINTO),
    { poblado: Number(DISCO_DE_POBLADO.toFixed(2)), recinto: Number(RADIO_DEL_RECINTO.toFixed(2)) },
  );
  /*
   * Y CADA CLASE PIDE LA SUYA. `parteDeLaMarca` es lo que `delta.tsx` llama desde su
   * `useFrame`; si devolviera lo mismo para las dos, todo lo de arriba seguiría midiendo dos
   * constantes que nadie usa.
   */
  comprobar(
    'y `parteDeLaMarca` da una fracción distinta a cada clase: la ciudad la suya y el poblado la de siempre',
    parteDeLaMarca('ciudad') === ZOCALO_DE_CIUDAD_EN_PANTALLA &&
      parteDeLaMarca('poblado') === ZOCALO_EN_PANTALLA &&
      ZOCALO_DE_CIUDAD_EN_PANTALLA > ZOCALO_EN_PANTALLA,
    { ciudad: parteDeLaMarca('ciudad'), poblado: parteDeLaMarca('poblado') },
  );
  /*
   * Y LO MISMO CON EL TOPE POR ABAJO, que es lo que la fracción sola no puede dar: la muralla
   * es un objeto del MUNDO y no encoge cuando la cámara se acerca, así que la marca de una
   * ciudad necesita un mínimo del mundo y no sólo una fracción de pantalla. Si `sueloDeLaMarca`
   * devolviera lo mismo para las dos clases, el disco de una ciudad volvería a caber debajo de
   * su recinto en la mitad del tablero más cercana al ojo.
   */
  comprobar(
    `y \`sueloDeLaMarca\` da un tope por abajo distinto a cada clase: la ciudad no baja de ${(SUELO_DEL_ZOCALO_DE_CIUDAD * RADIO_DE_TESELA * loQueOcupaElZocalo('disco').fuera).toFixed(2)} de mundo —más que los ${RADIO_DEL_RECINTO.toFixed(2)} que tapa su muralla— y el poblado se queda con el de siempre`,
    sueloDeLaMarca('ciudad') === SUELO_DEL_ZOCALO_DE_CIUDAD &&
      sueloDeLaMarca('poblado') === SUELO_DEL_ZOCALO &&
      SUELO_DEL_ZOCALO_DE_CIUDAD > SUELO_DEL_ZOCALO &&
      SUELO_DEL_ZOCALO_DE_CIUDAD * RADIO_DE_TESELA * loQueOcupaElZocalo('disco').fuera > RADIO_DEL_RECINTO,
    {
      ciudad: sueloDeLaMarca('ciudad'),
      poblado: sueloDeLaMarca('poblado'),
      enElMundo: Number((SUELO_DEL_ZOCALO_DE_CIUDAD * RADIO_DE_TESELA).toFixed(2)),
      recinto: Number(RADIO_DEL_RECINTO.toFixed(2)),
    },
  );

  // ── EL TECHO, A LAS FORMAS DE VENTANA QUE UN CLIENTE PRODUCE DE VERDAD ────

  /*
   * ═══ EL TECHO SE MEDÍA A UN INFINITO TEÓRICO, Y SE TOCA JUGANDO ═══
   *
   * `TECHO_DEL_ZOCALO` valía 3,5 para las tres marcas y lo único que se compraba de él era que
   * `tallaDeUnaMarca(1e9, …)` lo devuelve. Mil millones de unidades no es una distancia de este
   * juego; las distancias de este juego las produce `ojoDelMirador` con la proporción de la
   * VENTANA, porque `alejarseParaQueQuepa` retira la cámara en retrato para que el tablero
   * quepa de lado a lado. Así que aquí se monta la cámara del cliente con formas de ventana de
   * verdad y se mide en los 126 sitios lo que sale.
   *
   * Y a esas distancias el techo muerde: con media pantalla de portátil la cámara se va a
   * 1.076 y con un móvil en retrato a 2.308, contra las 600 del monitor de referencia. En el
   * techo pasan las tres cosas que un techo existe para no dejar pasar —la clase se pierde, la
   * marca de un camino pasa del camino, y las marcas se comen unas a otras—, y las tres se
   * compran aquí abajo con la vacuna que enseña el techo viejo cayéndose.
   */
  const LAS_FORMAS_DE_VENTANA = [
    { como: 'media pantalla de portátil', ancho: 826, alto: 833 },
    { como: 'portátil entero', ancho: 1477, alto: 833 },
    { como: 'monitor de referencia', ancho: 1600, alto: 900 },
    { como: 'móvil en retrato', ancho: 390, alto: 844 },
    { como: 'el panel del navegador', ancho: 655, alto: 922 },
    { como: 'tableta en retrato', ancho: 768, alto: 1024 },
  ];
  /*
   * LA CÁMARA DE VERDAD, y no la que `encuadreDelDelta` deja en el primer fotograma: la escena
   * monta `CamaraAerea`, que en cada fotograma pone el ojo con `ojoDelMirador` desde el mirador
   * de salida y con la proporción del lienzo. Es la misma llamada, con el mismo alcance.
   */
  const laCamaraDeLaVentana = (ancho: number, alto: number): THREE.PerspectiveCamera => {
    const proporcion = ancho / alto;
    const ojo = new THREE.PerspectiveCamera(45, proporcion, 1, 10000);
    const donde = ojoDelMirador(MIRADOR_DE_SALIDA, radioDelMundo, proporcion);
    ojo.position.set(donde[0], donde[1], donde[2]);
    ojo.updateMatrixWorld();
    return ojo;
  };
  const LOS_SITIOS_DE_VEREDA = aristasDe(DELTA).map((a) => {
    const q = puntoDeArista(a, RADIO_DE_COMARCA);
    return { que: a, donde: [q.x, 0, q.y] as [number, number, number] };
  });
  const LARGO_DE_UNA_ARISTA = ((): number => {
    const primera = aristasDe(DELTA)[0];
    if (primera === undefined) return 0;
    const [uno, otro] = verticesDeArista(primera);
    if (uno === undefined || otro === undefined) return 0;
    const a = puntoDeVertice(uno, RADIO_DE_COMARCA);
    const b = puntoDeVertice(otro, RADIO_DE_COMARCA);
    return Math.hypot(a.x - b.x, a.y - b.y);
  })();
  /** Lo que mide cada una de las 126 marcas a esta forma de ventana, con este techo. */
  const lasMarcasDe = (
    ojo: THREE.PerspectiveCamera,
    techoDeCiudad: number,
    techoDePoblado: number,
    techoDeLaRaya: number,
  ): {
    ciudad: number[];
    poblado: number[];
    raya: number[];
    largoDeLaRaya: number;
    aire: number;
    tinta: number;
  } => {
    const ciudad = sitiosDeChoza.map((s) =>
      loLejosQueLlegaLaMarca(
        'disco',
        tallaDelZocalo(ojo, s.donde, ZOCALO_DE_CIUDAD_EN_PANTALLA, sueloDeLaMarca('ciudad'), techoDeCiudad),
      ),
    );
    const poblado = sitiosDeChoza.map((s) =>
      loLejosQueLlegaLaMarca(
        'disco',
        tallaDelZocalo(ojo, s.donde, ZOCALO_EN_PANTALLA, sueloDeLaMarca('poblado'), techoDePoblado),
      ),
    );
    const tallaDeLaRaya = LOS_SITIOS_DE_VEREDA.map((s) =>
      tallaDelZocalo(ojo, s.donde, ZOCALO_EN_PANTALLA, SUELO_DEL_ZOCALO, techoDeLaRaya),
    );
    const raya = tallaDeLaRaya.map((t) => loLejosQueLlegaLaMarca('raya', t));
    /*
     * EL AIRE, con el radio de CADA marca y no con el de la más ancha supuesta en las dos: el
     * peor caso de talla es que los 54 vértices sean ciudades, que es lo que más ocupa.
     */
    let aire = Infinity;
    for (let i = 0; i < sitiosDeChoza.length; i++) {
      const uno = sitiosDeChoza[i] as (typeof sitiosDeChoza)[number];
      for (let j = 0; j < LOS_SITIOS_DE_VEREDA.length; j++) {
        const otro = LOS_SITIOS_DE_VEREDA[j] as (typeof LOS_SITIOS_DE_VEREDA)[number];
        const cuanto = Math.hypot(uno.donde[0] - otro.donde[0], uno.donde[2] - otro.donde[2]);
        aire = Math.min(aire, cuanto - (ciudad[i] as number) - (raya[j] as number));
      }
    }
    const superficieDeEsteDelta =
      DELTA.length * ((3 * Math.sqrt(3)) / 2) * RADIO_DE_COMARCA * RADIO_DE_COMARCA;
    const tinta =
      (ciudad.reduce((s, r) => s + loQueOcupaElZocalo('disco').mancha * r * r, 0) +
        tallaDeLaRaya.reduce(
          (s, t) => s + loQueOcupaElZocalo('raya').mancha * (t * RADIO_DE_TESELA) ** 2,
          0,
        )) /
      superficieDeEsteDelta;
    return {
      ciudad,
      poblado,
      raya,
      largoDeLaRaya: Math.max(...tallaDeLaRaya) * RADIO_DE_TESELA * LARGO_DE_LA_RAYA,
      aire,
      tinta,
    };
  };
  const CON_EL_TECHO_NUEVO = LAS_FORMAS_DE_VENTANA.map((f) => {
    const ojo = laCamaraDeLaVentana(f.ancho, f.alto);
    return {
      ...f,
      lejos: Math.hypot(ojo.position.x, ojo.position.y, ojo.position.z),
      /*
       * El techo se le pide a `techoDeLaMarca`, que es lo que `delta.tsx` llama, y no a la
       * constante: pidiéndoselo a la constante, una función que devolviera lo mismo para las dos
       * clases dejaría esto en verde mientras la escena pinta las dos clases iguales.
       */
      medidas: lasMarcasDe(
        ojo,
        techoDeLaMarca('ciudad'),
        techoDeLaMarca('poblado'),
        TECHO_DEL_ZOCALO,
      ),
    };
  });
  const seLeVeLaClase = CON_EL_TECHO_NUEVO.every((f) =>
    f.medidas.ciudad.every((r, i) => r > (f.medidas.poblado[i] as number) + 1e-9),
  );
  comprobar(
    `en las ${String(LAS_FORMAS_DE_VENTANA.length)} formas de ventana que un cliente produce de verdad —de ${Math.min(...CON_EL_TECHO_NUEVO.map((f) => f.lejos)).toFixed(0)} a ${Math.max(...CON_EL_TECHO_NUEVO.map((f) => f.lejos)).toFixed(0)} de cámara— el disco de una CIUDAD mide siempre más que el de un poblado en los ${String(sitiosDeChoza.length)} vértices: el techo no borra la clase`,
    seLeVeLaClase,
    CON_EL_TECHO_NUEVO.map((f) => ({
      como: f.como,
      lejos: Number(f.lejos.toFixed(0)),
      ciudad: `${Math.min(...f.medidas.ciudad).toFixed(2)}-${Math.max(...f.medidas.ciudad).toFixed(2)}`,
      poblado: `${Math.min(...f.medidas.poblado).toFixed(2)}-${Math.max(...f.medidas.poblado).toFixed(2)}`,
    })),
  );
  const elPeorAire = Math.min(...CON_EL_TECHO_NUEVO.map((f) => f.medidas.aire));
  comprobar(
    `y ninguna marca toca a otra en ninguna de ellas: el par más apretado —una choza y su propia vereda, a ${LARGO_DE_UNA_ARISTA === 0 ? '?' : (LARGO_DE_UNA_ARISTA / 2).toFixed(2)}— deja ${elPeorAire.toFixed(2)} de aire en el peor caso, con las 54 chozas puestas como CIUDADES`,
    elPeorAire > 0,
    CON_EL_TECHO_NUEVO.map((f) => ({
      como: f.como,
      aire: Number(f.medidas.aire.toFixed(2)),
      tinta: Number((f.medidas.tinta * 100).toFixed(1)),
    })),
  );
  const laRayaMasLarga = Math.max(...CON_EL_TECHO_NUEVO.map((f) => f.medidas.largoDeLaRaya));
  comprobar(
    `y la raya de una vereda no pasa del CAMINO que marca en ninguna de ellas: llega a ${laRayaMasLarga.toFixed(2)} de largo contra los ${LARGO_DE_UNA_ARISTA.toFixed(2)} de su arista, o sea ${((laRayaMasLarga / LARGO_DE_UNA_ARISTA) * 100).toFixed(0)} % del camino`,
    LARGO_DE_UNA_ARISTA > 0 && laRayaMasLarga < LARGO_DE_UNA_ARISTA,
    { laRayaMasLarga: Number(laRayaMasLarga.toFixed(2)), arista: Number(LARGO_DE_UNA_ARISTA.toFixed(2)) },
  );
  /*
   * LA VACUNA DEL TECHO, Y ES EL FALLO ENTERO EN UN SOLO NÚMERO: con el 3,5 que había, y a las
   * MISMAS formas de ventana, las tres cosas se rompen a la vez. No es un techo teórico que
   * nadie alcanza: es un techo que se toca con la ventana a medio abrir.
   */
  const EL_TECHO_VIEJO = 3.5;
  const CON_EL_TECHO_VIEJO = LAS_FORMAS_DE_VENTANA.map((f) => ({
    ...f,
    medidas: lasMarcasDe(
      laCamaraDeLaVentana(f.ancho, f.alto),
      EL_TECHO_VIEJO,
      EL_TECHO_VIEJO,
      EL_TECHO_VIEJO,
    ),
  }));
  const clasesIguales = CON_EL_TECHO_VIEJO.map((f) => ({
    como: f.como,
    cuantas: f.medidas.ciudad.filter((r, i) => Math.abs(r - (f.medidas.poblado[i] as number)) < 1e-9).length,
  }));
  const laRayaViejaMasLarga = Math.max(...CON_EL_TECHO_VIEJO.map((f) => f.medidas.largoDeLaRaya));
  const elAireViejo = Math.min(...CON_EL_TECHO_VIEJO.map((f) => f.medidas.aire));
  comprobar(
    `se ve fallar: con el techo de 3,5 que había, y a las mismas formas de ventana, la ciudad y el poblado miden LO MISMO en ${String(Math.max(...clasesIguales.map((c) => c.cuantas)))} de los ${String(sitiosDeChoza.length)} vértices —o sea que \`parteDeLaMarca\` no distingue nada—, la raya llega a ${laRayaViejaMasLarga.toFixed(2)} de largo contra los ${LARGO_DE_UNA_ARISTA.toFixed(2)} de su arista, y el par más apretado se SOLAPA ${(-elAireViejo).toFixed(2)}`,
    clasesIguales.some((c) => c.cuantas === sitiosDeChoza.length) &&
      laRayaViejaMasLarga > LARGO_DE_UNA_ARISTA &&
      elAireViejo < 0,
    {
      clasesIguales,
      laRayaViejaMasLarga: Number(laRayaViejaMasLarga.toFixed(2)),
      arista: Number(LARGO_DE_UNA_ARISTA.toFixed(2)),
      elAireViejo: Number(elAireViejo.toFixed(2)),
    },
  );
  /*
   * Y LAS DOS VENTANAS EN LAS QUE CABEN LOS DOS TECHOS, rehechas aquí para que la cabecera de
   * `escala.ts` no cite números que nadie recalcula. Ver allí el porqué de cada límite.
   */
  const ojoDeReferencia = laCamaraDeLaVentana(1600, 900);
  const loQuePideElEncuadre = (parte: number, donde: readonly [number, number, number]): number => {
    const lejos = Math.hypot(
      ojoDeReferencia.position.x - donde[0],
      ojoDeReferencia.position.y - donde[1],
      ojoDeReferencia.position.z - donde[2],
    );
    return (2 * lejos * Math.tan(((45 * Math.PI) / 180) / 2) * parte) / RADIO_DE_TESELA;
  };
  const PIDE_EL_MAS_LEJANO = Math.max(
    ...[...sitiosDeChoza, ...LOS_SITIOS_DE_VEREDA].map((s) => loQuePideElEncuadre(ZOCALO_EN_PANTALLA, s.donde)),
  );
  const PIDE_EL_CENTRO = loQuePideElEncuadre(ZOCALO_DE_CIUDAD_EN_PANTALLA, [0, 0, 0]);
  const elDiscoOcupa = loQueOcupaElZocalo('disco').fuera;
  const laRayaOcupaFuera = loQueOcupaElZocalo('raya').fuera;
  const TOPE_DE_PANTALLA_POR_SU_VECINA =
    LARGO_DE_UNA_ARISTA / 2 / (RADIO_DE_TESELA * (elDiscoOcupa + laRayaOcupaFuera));
  const TOPE_DE_CIUDAD_POR_EL_RELLANO = RADIO_DEL_RELLANO / (RADIO_DE_TESELA * elDiscoOcupa);
  const TOPE_DE_CIUDAD_POR_SU_VECINA =
    (LARGO_DE_UNA_ARISTA / 2 - TECHO_DEL_ZOCALO * RADIO_DE_TESELA * laRayaOcupaFuera) /
    (RADIO_DE_TESELA * elDiscoOcupa);
  comprobar(
    `y los dos techos caen dentro de su ventana: el de pantalla vale ${String(TECHO_DEL_ZOCALO)} entre ${PIDE_EL_MAS_LEJANO.toFixed(3)} —lo que el encuadre de referencia pide en el sitio más lejano, por debajo de lo cual mordería donde se juega— y ${TOPE_DE_PANTALLA_POR_SU_VECINA.toFixed(3)}; el de la ciudad vale ${String(TECHO_DEL_ZOCALO_DE_CIUDAD)} entre ${PIDE_EL_CENTRO.toFixed(3)} —lo que pide en el centro— y ${Math.min(TOPE_DE_CIUDAD_POR_EL_RELLANO, TOPE_DE_CIUDAD_POR_SU_VECINA).toFixed(3)}`,
    TECHO_DEL_ZOCALO > PIDE_EL_MAS_LEJANO &&
      TECHO_DEL_ZOCALO < TOPE_DE_PANTALLA_POR_SU_VECINA &&
      TECHO_DEL_ZOCALO_DE_CIUDAD > PIDE_EL_CENTRO &&
      TECHO_DEL_ZOCALO_DE_CIUDAD < TOPE_DE_CIUDAD_POR_EL_RELLANO &&
      TECHO_DEL_ZOCALO_DE_CIUDAD < TOPE_DE_CIUDAD_POR_SU_VECINA,
    {
      pantalla: TECHO_DEL_ZOCALO,
      pideElMasLejano: Number(PIDE_EL_MAS_LEJANO.toFixed(3)),
      porSuVecina: Number(TOPE_DE_PANTALLA_POR_SU_VECINA.toFixed(3)),
      ciudad: TECHO_DEL_ZOCALO_DE_CIUDAD,
      pideElCentro: Number(PIDE_EL_CENTRO.toFixed(3)),
      porElRellano: Number(TOPE_DE_CIUDAD_POR_EL_RELLANO.toFixed(3)),
      porSuVecinaLaCiudad: Number(TOPE_DE_CIUDAD_POR_SU_VECINA.toFixed(3)),
    },
  );
  comprobar(
    'y `techoDeLaMarca` da un tope por arriba distinto a cada clase: si diera el mismo, en el techo las dos medirían igual y la clase se perdería justo donde el tablero está más lejos',
    techoDeLaMarca('ciudad') === TECHO_DEL_ZOCALO_DE_CIUDAD &&
      techoDeLaMarca('poblado') === TECHO_DEL_ZOCALO &&
      TECHO_DEL_ZOCALO_DE_CIUDAD > TECHO_DEL_ZOCALO,
    { ciudad: techoDeLaMarca('ciudad'), poblado: techoDeLaMarca('poblado') },
  );

  // ── Y LA MARCA CONTRA EL RELIEVE: que no se la trague la comarca de al lado ──

  /*
   * ═══ NADIE MEDÍA LA MARCA CONTRA LA TIERRA, SÓLO CONTRA LA PIEZA ═══
   *
   * Todo lo de arriba compra que el disco asoma por fuera de su MURALLA. Un vértice es la
   * esquina donde se juntan TRES comarcas y casi nunca están a la misma cota: el disco es un
   * plano horizontal a `ALTO_DEL_ZOCALO` —1,27— sobre el suelo de su vértice, y un escalón mide
   * 5,47. Basta con que la comarca de al lado esté un escalón más arriba para que el trozo de
   * disco que la pisa quede DENTRO de la ladera, y eso no lo miraba nada.
   *
   * Se mide sobre los 54 vértices con doce relieves —la misma batería con la que se mide el
   * suelo de los vértices y la calzada de los puentes— y con el disco a la talla de su techo,
   * recorriendo su BORDE entero. Con el asiento puesto no queda ni uno tapado; la vacuna de
   * abajo enseña lo que había.
   */
  {
    /*
     * DOS REPARTOS DE TERRENO, y no uno: el de este comprobador y el del BANCO. No son el mismo
     * mundo y no se rompen por los mismos sitios — el del banco tiene vértices donde la comarca
     * de al lado sube DOS escalones a seis unidades, y el de aquí no. Medir sólo con uno de los
     * dos deja fuera el caso que decide el diseño, y de hecho lo dejó: el tope del recorte se
     * escribió con el de aquí y el banco lo tumbó a la primera.
     */
    const LOS_REPARTOS: Array<{ como: string; terrenos: string[] }> = [
      {
        como: 'el del comprobador',
        terrenos: [
          'bosque', 'bosque', 'bosque', 'bosque', 'pradera', 'pradera', 'pradera', 'pradera',
          'campo', 'campo', 'campo', 'campo', 'colina', 'colina', 'colina',
          'montana', 'montana', 'montana', 'desierto',
        ],
      },
      {
        como: 'el del banco',
        terrenos: [
          'bosque', 'pradera', 'campo', 'colina', 'montana', 'bosque', 'pradera',
          'campo', 'desierto', 'colina', 'montana', 'bosque', 'pradera', 'campo',
          'colina', 'montana', 'bosque', 'pradera', 'campo',
        ],
      },
    ];
    const islasDelAsiento = DELTA.map((hex, i) => ({
      hex,
      terreno: (LOS_REPARTOS[0] as { terrenos: string[] }).terrenos[i % 19] ?? 'pradera',
    }));
    /*
     * SE MIDE LO QUE SE VE DEL DISCO, y no si su borde toca. Un disco con la punta de un lado
     * dentro de la ladera se sigue viendo entero por el otro; uno con el centro tapado no se ve
     * aunque su borde esté limpio. Se muestrea por ANILLOS DE ÁREA IGUAL —la misma cuenta que
     * `asientoDeLaMarca` usa para subirla— así que cada muestra pesa lo mismo y la fracción que
     * sale es superficie de verdad.
     */
    const ANILLOS = 48;
    const RADIOS = 48;
    const loQueSeVeDelDisco = (
      tierra: (x: number, y: number) => number,
      centro: Punto,
      cota: number,
      radio: number,
    ): number => {
      let seVe = 0;
      let cuantas = 0;
      for (let k = 1; k <= ANILLOS; k++) {
        const suRadio = radio * Math.sqrt(k / ANILLOS);
        for (let a = 0; a < RADIOS; a++) {
          const angulo = (2 * Math.PI * (a + (k % 2) * 0.5)) / RADIOS;
          cuantas++;
          if (tierra(centro.x + Math.cos(angulo) * suRadio, centro.y + Math.sin(angulo) * suRadio) < cota) {
            seVe++;
          }
        }
      }
      return seVe / cuantas;
    };
    /**
     * LO QUE EL RELIEVE LE HACE A LA MARCA DE ESTA CLASE, en los 54 vértices por doce relieves
     * por los dos repartos. `antes` es con la marca clavada a media persona sobre el suelo del
     * vértice —lo que había— y `ahora` con el asiento puesto.
     */
    const loQueElRelieveLeHace = (clase: 'poblado' | 'ciudad') => {
      const radio = loLejosQueLlegaLaMarca('disco', techoDeLaMarca(clase));
      let medidas = 0;
      let tapadosAntes = 0;
      let tapadosAhora = 0;
      let elPeorAntes = 1;
      let elPeorAhora = 1;
      let quienPeorAhora = '';
      let quienPeorAntes = '';
      let laMayorSubida = 0;
      let suben = 0;
      for (const reparto of LOS_REPARTOS) {
        const islas = DELTA.map((hex, i) => ({
          hex,
          terreno: reparto.terrenos[i % reparto.terrenos.length] ?? 'pradera',
        }));
        for (let semilla = 0; semilla < 12; semilla++) {
          const suRelieve = crearRelieve(islas, semilla);
          const tierra = (x: number, y: number): number => suRelieve.alturaEn({ x, y });
          for (const v of TODOS_LOS_VERTICES) {
            const q = puntoDeVertice(v, RADIO_DE_COMARCA);
            const suelo = suRelieve.alturaEn(q);
            const asiento = asientoDelDisco(tierra, q.x, q.y, suelo, techoDeLaMarca(clase));
            medidas++;
            if (asiento.alto > ALTO_DEL_ZOCALO + 1e-9) suben++;
            laMayorSubida = Math.max(laMayorSubida, asiento.alto - ALTO_DEL_ZOCALO);
            const antes = loQueSeVeDelDisco(tierra, q, suelo + ALTO_DEL_ZOCALO, radio);
            const ahora = loQueSeVeDelDisco(tierra, q, suelo + asiento.alto, radio);
            if (antes < 1 - 1e-9) tapadosAntes++;
            if (ahora < 1 - 1e-9) tapadosAhora++;
            if (antes < elPeorAntes) {
              elPeorAntes = antes;
              quienPeorAntes = `${v} con ${reparto.como} y la semilla ${String(semilla)}`;
            }
            if (ahora < elPeorAhora) {
              elPeorAhora = ahora;
              quienPeorAhora = `${v} con ${reparto.como} y la semilla ${String(semilla)}`;
            }
          }
        }
      }
      return {
        medidas, tapadosAntes, tapadosAhora, elPeorAntes, elPeorAhora,
        quienPeorAntes, quienPeorAhora, laMayorSubida, suben, radio,
      };
    };
    const EL_POBLADO = loQueElRelieveLeHace('poblado');
    const LA_CIUDAD = loQueElRelieveLeHace('ciudad');
    comprobar(
      `hay relieve que medir: ${String(EL_POBLADO.medidas)} discos por clase —los ${String(TODOS_LOS_VERTICES.length)} vértices con doce relieves y con los dos repartos de terreno, el de aquí y el del banco`,
      EL_POBLADO.medidas === TODOS_LOS_VERTICES.length * 12 * LOS_REPARTOS.length &&
        LA_CIUDAD.medidas === EL_POBLADO.medidas,
      { medidas: EL_POBLADO.medidas, repartos: LOS_REPARTOS.length },
    );
    comprobar(
      `la marca se apoya en la tierra que pisa y no a media persona del vértice: sube en ${String(EL_POBLADO.suben + LA_CIUDAD.suben)} de las ${String(EL_POBLADO.medidas * 2)} y nunca más de un escalón —${LA_CIUDAD.laMayorSubida.toFixed(2)}, o sea ${(LA_CIUDAD.laMayorSubida / ESCALON).toFixed(2)}—, que es lo que sube el terreno de una terraza a la siguiente`,
      LA_CIUDAD.laMayorSubida <= SUBIDA_MAXIMA_DEL_ZOCALO + 1e-9 &&
        EL_POBLADO.laMayorSubida <= SUBIDA_MAXIMA_DEL_ZOCALO + 1e-9 &&
        LA_CIUDAD.suben > 0 &&
        EL_POBLADO.suben > 0,
      {
        subenPoblado: EL_POBLADO.suben,
        subenCiudad: LA_CIUDAD.suben,
        laMayorSubida: Number(LA_CIUDAD.laMayorSubida.toFixed(2)),
        enEscalones: Number((LA_CIUDAD.laMayorSubida / ESCALON).toFixed(2)),
      },
    );
    comprobar(
      `y con eso ninguna marca se pierde en la ladera de al lado: del disco de un POBLADO se ve como poco el ${(EL_POBLADO.elPeorAhora * 100).toFixed(0)} % —tapado en ${String(EL_POBLADO.tapadosAhora)} de las ${String(EL_POBLADO.medidas)}— y del de una CIUDAD el ${(LA_CIUDAD.elPeorAhora * 100).toFixed(0)} % —tapado en ${String(LA_CIUDAD.tapadosAhora)}—`,
      EL_POBLADO.elPeorAhora > 0.8 &&
        LA_CIUDAD.elPeorAhora > 0.8 &&
        EL_POBLADO.tapadosAhora < EL_POBLADO.medidas / 100 &&
        LA_CIUDAD.tapadosAhora < LA_CIUDAD.medidas / 20,
      {
        poblado: { seVe: Number((EL_POBLADO.elPeorAhora * 100).toFixed(0)), tapados: EL_POBLADO.tapadosAhora, elPeor: EL_POBLADO.quienPeorAhora },
        ciudad: { seVe: Number((LA_CIUDAD.elPeorAhora * 100).toFixed(0)), tapados: LA_CIUDAD.tapadosAhora, elPeor: LA_CIUDAD.quienPeorAhora },
      },
    );
    comprobar(
      `se ve fallar: con la marca clavada a media persona sobre el suelo de su vértice —lo que había—, del disco de una CIUDAD se ve el ${(LA_CIUDAD.elPeorAntes * 100).toFixed(0)} % en el peor —${LA_CIUDAD.quienPeorAntes}— y la tierra le pisa algo en ${String(LA_CIUDAD.tapadosAntes)} de las ${String(LA_CIUDAD.medidas)}, contra ${String(LA_CIUDAD.tapadosAhora)} con el asiento puesto`,
      LA_CIUDAD.elPeorAntes < 0.5 &&
        EL_POBLADO.elPeorAntes < 0.6 &&
        LA_CIUDAD.tapadosAntes > LA_CIUDAD.tapadosAhora * 4 &&
        EL_POBLADO.tapadosAntes > EL_POBLADO.tapadosAhora * 4,
      {
        ciudadAntes: Number((LA_CIUDAD.elPeorAntes * 100).toFixed(0)),
        pobladoAntes: Number((EL_POBLADO.elPeorAntes * 100).toFixed(0)),
        tapadosAntes: { poblado: EL_POBLADO.tapadosAntes, ciudad: LA_CIUDAD.tapadosAntes },
        tapadosAhora: { poblado: EL_POBLADO.tapadosAhora, ciudad: LA_CIUDAD.tapadosAhora },
      },
    );
    /*
     * ═══ Y LA VACUNA QUE NO NECESITA UN MUNDO: UN VÉRTICE PEGADO A LA MONTAÑA ═══
     *
     * Un terreno escrito a mano, para que la regla se pueda leer sin generar nada: llano a la
     * izquierda, y a partir de una raya vertical sube. Con UN escalón el asiento sube el escalón
     * entero; con TRES no sube nada, porque subir tres es un halo de 8,6 personas y recortar el
     * disco para no tocar la ladera sólo le quitaría píxeles del lado que sí se ve; y con la
     * ladera de UNO y la montaña de TRES a la vez sube uno, que es la parte que enseña que se
     * mira el disco ENTERO y no el primer sitio donde topa.
     */
    const RADIO_DE_PRUEBA = loLejosQueLlegaLaMarca('disco', techoDeLaMarca('ciudad'));
    const LA_RAYA_DE_LA_MONTANA = RADIO_DE_PRUEBA * 0.7;
    const laMontana = (cuantosEscalones: number) => (x: number): number =>
      x >= LA_RAYA_DE_LA_MONTANA ? cuantosEscalones * ESCALON : 0;
    const enLlano = asientoDeLaMarca(() => 0, 0, 0, 0, RADIO_DE_PRUEBA);
    const conUnEscalon = asientoDeLaMarca((x) => laMontana(1)(x), 0, 0, 0, RADIO_DE_PRUEBA);
    const conTresEscalones = asientoDeLaMarca((x) => laMontana(3)(x), 0, 0, 0, RADIO_DE_PRUEBA);
    /* La ladera de UNO cerca y la montaña de TRES detrás, que es el caso del banco. */
    const conLasDos = asientoDeLaMarca(
      (x) => (x >= LA_RAYA_DE_LA_MONTANA ? 3 * ESCALON : x >= LA_RAYA_DE_LA_MONTANA / 2 ? ESCALON : 0),
      0,
      0,
      0,
      RADIO_DE_PRUEBA,
    );
    comprobar(
      `y en llano el asiento no toca nada: se queda a ${enLlano.alto.toFixed(4)}, los ${ALTO_DEL_ZOCALO.toFixed(4)} de siempre`,
      Math.abs(enLlano.alto - ALTO_DEL_ZOCALO) < 1e-9,
      enLlano,
    );
    comprobar(
      `con un vértice pegado a una comarca UN escalón más alta, el disco sube el escalón entero —a ${conUnEscalon.alto.toFixed(2)}— y no encoge: mide lo que medía y ahora se ve por encima de la ladera`,
      Math.abs(conUnEscalon.alto - (ESCALON + ALTO_DEL_ZOCALO)) < 1e-9,
      conUnEscalon,
    );
    comprobar(
      `y con una MONTAÑA de tres escalones no se sube tres —eso sería un halo de ${((3 * ESCALON) / ALTURA_DE_UNA_PERSONA).toFixed(1)} personas, por encima del tejado que marca— sino que se queda a ${conTresEscalones.alto.toFixed(2)} y deja que la ladera le tape ese lado`,
      Math.abs(conTresEscalones.alto - ALTO_DEL_ZOCALO) < 1e-9,
      conTresEscalones,
    );
    comprobar(
      `y con la ladera de UNO delante y la montaña de TRES detrás sube uno —a ${conLasDos.alto.toFixed(2)}— y no se para en lo primero que topa: se mira el disco entero, que es el caso que el banco enseña`,
      Math.abs(conLasDos.alto - (ESCALON + ALTO_DEL_ZOCALO)) < 1e-9,
      conLasDos,
    );
    comprobar(
      `se ve fallar: con la marca clavada a \`ALTO_DEL_ZOCALO\` sobre ese mismo vértice, la comarca de un escalón le pasa ${(ESCALON - ALTO_DEL_ZOCALO).toFixed(2)} por encima —${((ESCALON - ALTO_DEL_ZOCALO) / ALTURA_DE_UNA_PERSONA).toFixed(1)} personas de roca— y se traga la mitad del disco`,
      ESCALON > ALTO_DEL_ZOCALO * 2,
      {
        escalon: Number(ESCALON.toFixed(2)),
        altoDelZocalo: Number(ALTO_DEL_ZOCALO.toFixed(2)),
        cuantasVeces: Number((ESCALON / ALTO_DEL_ZOCALO).toFixed(1)),
      },
    );

    /*
     * ═══ Y LA RAYA DE UNA VEREDA TAMBIÉN SE MIDE CONTRA LA TIERRA ═══
     *
     * La raya cuelga de la CALZADA —del punto de la polilínea de juntas a mitad de vano—, y eso
     * la salva de quedar enterrada bajo el cerro que el puente salva; ya hay una comprobación
     * que lo compra. Lo que nadie miraba es que la raya es un TRAMO: es plana y está a la cota
     * del MEDIO del vano, así que hacia sus puntas la tierra puede pasarle por encima cuando la
     * arista cruza una vaguada y sube por los dos lados.
     *
     * Aquí no se puede hacer lo que se hace con el disco: subirla un escalón la despegaría de
     * su propia calzada, y hay una comprobación —la del halo— que compra que no lo hace. Lo que
     * sí la salva es el TECHO, que es la mitad de esta tanda: la raya pasó de 79,57 de largo
     * —más que la arista que marca, 75,78— a 38,65.
     *
     * Se mide lo que eso compra sobre las 864 —las 72 aristas con doce relieves— y se exige lo
     * que sí se puede exigir: que ninguna quede ENTERAMENTE bajo tierra, que es el fallo del
     * que viene todo esto. Con el techo que había, la peor se quedaba entera debajo.
     */
    const laHuellaDeLaRaya = (
      tierra: (x: number, y: number) => number,
      medio: { x: number; y: number; z: number },
      hacia: { x: number; y: number },
      techo: number,
    ): number => {
      const largo = techo * RADIO_DE_TESELA * LARGO_DE_LA_RAYA;
      const medioAncho = techo * RADIO_DE_TESELA * (ANCHO_DE_LA_RAYA / 2 + DESVANECIDO_DE_LA_RAYA);
      const cota = medio.y + ALTO_DEL_ZOCALO;
      for (let k = 1; k <= 96; k++) {
        const cuanto = ((largo / 2) * k) / 96;
        for (const signo of [-1, 1]) {
          for (const lado of [-1, 0, 1]) {
            const px = medio.x + hacia.x * cuanto * signo - hacia.y * lado * medioAncho;
            const py = medio.z + hacia.y * cuanto * signo + hacia.x * lado * medioAncho;
            if (tierra(px, py) >= cota) return (k - 1) / 96;
          }
        }
      }
      return 1;
    };
    const laRayaCon = (techo: number): { tapadas: number; medidas: number; laPeor: number } => {
      let tapadas = 0;
      let medidas = 0;
      let laPeor = 1;
      for (let semilla = 0; semilla < 12; semilla++) {
        const suRelieve = crearRelieve(islasDelAsiento, semilla);
        const tierra = (x: number, y: number): number => suRelieve.alturaEn({ x, y });
        for (const arista of aristasDe(DELTA)) {
          const [uno, otro] = verticesDeArista(arista);
          if (uno === undefined || otro === undefined) continue;
          const a = puntoDeVertice(uno, RADIO_DE_COMARCA);
          const b = puntoDeVertice(otro, RADIO_DE_COMARCA);
          const suLargo = Math.hypot(b.x - a.x, b.y - a.y);
          const puente = puenteEntre(a, b, (q: Punto) => suRelieve.alturaEn(q));
          const parte = laHuellaDeLaRaya(
            tierra,
            puente.medio,
            { x: (b.x - a.x) / suLargo, y: (b.y - a.y) / suLargo },
            techo,
          );
          medidas++;
          if (parte < 1) tapadas++;
          laPeor = Math.min(laPeor, parte);
        }
      }
      return { tapadas, medidas, laPeor };
    };
    const LA_RAYA_AHORA = laRayaCon(TECHO_DEL_ZOCALO);
    const LA_RAYA_ANTES = laRayaCon(3.5);
    comprobar(
      `y ninguna raya de vereda queda ENTERA bajo tierra en las ${String(LA_RAYA_AHORA.medidas)} medidas: la peor conserva el ${(LA_RAYA_AHORA.laPeor * 100).toFixed(0)} % de su largo, y sólo ${String(LA_RAYA_AHORA.tapadas)} tienen algo de su huella tapada — la raya cuelga de la calzada, así que lo que la puede tapar es la cuesta de sus propias puntas`,
      LA_RAYA_AHORA.laPeor > 0 && LA_RAYA_AHORA.tapadas < LA_RAYA_AHORA.medidas / 100,
      {
        tapadas: LA_RAYA_AHORA.tapadas,
        medidas: LA_RAYA_AHORA.medidas,
        laPeor: Number((LA_RAYA_AHORA.laPeor * 100).toFixed(0)),
        largo: Number((TECHO_DEL_ZOCALO * RADIO_DE_TESELA * LARGO_DE_LA_RAYA).toFixed(2)),
      },
    );
    comprobar(
      `se ve fallar: con el techo de 3,5 la raya medía ${(3.5 * RADIO_DE_TESELA * LARGO_DE_LA_RAYA).toFixed(2)} —más que los ${LARGO_DE_UNA_ARISTA.toFixed(2)} de la arista que marca— y la tierra le pasaba por encima en ${String(LA_RAYA_ANTES.tapadas)} de las ${String(LA_RAYA_ANTES.medidas)}, con la peor ENTERA debajo`,
      LA_RAYA_ANTES.tapadas > LA_RAYA_AHORA.tapadas * 4 && LA_RAYA_ANTES.laPeor === 0,
      {
        tapadasAntes: LA_RAYA_ANTES.tapadas,
        tapadasAhora: LA_RAYA_AHORA.tapadas,
        laPeorAntes: Number((LA_RAYA_ANTES.laPeor * 100).toFixed(0)),
        largoAntes: Number((3.5 * RADIO_DE_TESELA * LARGO_DE_LA_RAYA).toFixed(2)),
      },
    );
  }
  /*
   * LA VACUNA DEL SUELO, que es la que no existía mientras la marca era grande: bajando la
   * fracción de pantalla al 0,5 % el disco se quedaría en menos de lo que mide la pieza, y una
   * marca más pequeña que lo que marca se pierde antes que ello.
   */
  const DEMASIADO_PEQUENA = 0.005;
  const siFueraDiminuta = 2 * loQueOcupaElZocalo('disco').fuera * DEMASIADO_PEQUENA * EN_UNA_VENTANA_DE;
  comprobar(
    `se ve fallar: al ${(DEMASIADO_PEQUENA * 100).toFixed(1)} % del alto el disco mediría ${siFueraDiminuta.toFixed(1)} píxeles, MENOS que los ${anchoDeLaPieza.toFixed(1)} de la pieza que señala`,
    siFueraDiminuta < anchoDeLaPieza,
    { siFueraDiminuta, laPieza: anchoDeLaPieza },
  );
  /*
   * ═══ Y CADA TROZO DE LA MARCA SE MIDE EN PÍXELES, QUE ES LO QUE COSTÓ UNA VUELTA ═══
   *
   * El bloque de color de arriba mide CIE76 y no sabe cuántos píxeles se pintan de ese color.
   * El contorno que había heredó el grueso del filo del aro, 0,09, y a esta fracción de pantalla
   * eso son 1,1 píxeles: un trazo de un píxel es casi todo antialias, y contando píxeles en el
   * lienzo sólo el 37 % de los del disco azul sobre la montaña pasaba del umbral, contra el
   * 73-81 % de las otras tres marcas.
   *
   * CON EL DEGRADADO LA REGLA NO CAMBIA, SÓLO A QUIÉN SE LE APLICA: lo que no puede bajar de dos
   * píxeles ya no es un contorno sino la MESETA —el trozo a opacidad entera, que es lo que hace
   * que la marca se vea— y la CAÍDA —la zona donde se apaga, que si mide un píxel no es un
   * degradado sino un filo de antialias, o sea el borde que se ha quitado con otro color—. Y las
   * PUNTAS de la raya entran en la lista porque también se apagan.
   */
  const DOS_PIXELES = 2;
  const enPixeles = (cuanto: number): number => cuanto * ZOCALO_EN_PANTALLA * EN_UNA_VENTANA_DE;
  const trazos = [
    { que: 'la meseta del disco (diámetro)', grueso: enPixeles(2 * RADIO_DE_LA_MESETA) },
    { que: 'la caída del disco', grueso: enPixeles(DESVANECIDO_DEL_DISCO) },
    { que: 'la banda de la raya', grueso: enPixeles(ANCHO_DE_LA_RAYA) },
    { que: 'la caída de la raya', grueso: enPixeles(DESVANECIDO_DE_LA_RAYA) },
    { que: 'la punta de la raya', grueso: enPixeles(LARGO_DE_LA_RAYA / TRAMOS_DE_LA_RAYA) },
  ];
  comprobar(
    `ningún trozo de la marca baja de ${String(DOS_PIXELES)} píxeles desde la vista de tablero: ${trazos.map((t) => `${t.que} ${t.grueso.toFixed(1)}`).join(', ')}`,
    trazos.every((t) => t.grueso >= DOS_PIXELES),
    trazos,
  );
  comprobar(
    `se ve fallar: con el contorno al grueso que tenía el filo del aro —0,09— mediría ${enPixeles(0.09).toFixed(1)} píxeles, o sea casi todo antialias — y ésa es la vara con la que la caída de ahora mide ${enPixeles(DESVANECIDO_DEL_DISCO).toFixed(1)}`,
    enPixeles(0.09) < DOS_PIXELES,
    { conElGruesoDelAro: enPixeles(0.09), laCaidaDeAhora: enPixeles(DESVANECIDO_DEL_DISCO) },
  );
  /*
   * Y LA VACUNA DE POR QUÉ LA RAYA NO SE DESVANECE LO MISMO QUE EL DISCO, que es la pregunta que
   * la cabecera de `zocalo.tsx` contesta con este número: dándole a la raya la caída del disco
   * —0,30 por lado sobre 0,68 de ancho total— la banda del eje se quedaría en un píxel.
   */
  const siLaRayaCayeraComoElDisco =
    ANCHO_DE_LA_RAYA + 2 * DESVANECIDO_DE_LA_RAYA - 2 * DESVANECIDO_DEL_DISCO;
  comprobar(
    `se ve fallar: con la caída del disco —${DESVANECIDO_DEL_DISCO.toFixed(2)}— a los dos lados de la raya, su banda de eje se quedaría en ${enPixeles(siLaRayaCayeraComoElDisco).toFixed(1)} píxeles contra los ${enPixeles(ANCHO_DE_LA_RAYA).toFixed(1)} de ahora`,
    enPixeles(siLaRayaCayeraComoElDisco) < DOS_PIXELES,
    { siCayeraComoElDisco: enPixeles(siLaRayaCayeraComoElDisco), laDeAhora: enPixeles(ANCHO_DE_LA_RAYA) },
  );
  /*
   * ═══ Y LA RAYA DE UNA VEREDA PONE MENOS TINTA QUE EL DISCO — EN LA GEOMETRÍA ═══
   *
   * Se pidió que la vereda pesara menos que el asentamiento, y esto lo mide con número y no con
   * un adjetivo, porque «menos llamativa» sin cifra vuelve a subir sola en el primer retoque.
   *
   * PERO AQUÍ PONÍA «la vereda pesa menos EN PANTALLA», Y ESO ES FALSO. Lo que esta cuenta mide
   * es la tinta de la GEOMETRÍA de la marca: el área de sus mallas a la fracción de pantalla que
   * le toca, como si nada la tapara. En pantalla la tapa su propia pieza, y no por igual:
   *
   *   · un ASENTAMIENTO se pone ENCIMA de su disco —trece grupos de casas, vallas y árboles
   *     alrededor del vértice— y se come la mayor parte de él;
   *   · una VEREDA es una calzada estrecha a lo largo de la arista y la raya asoma por los dos
   *     costados, así que casi toda la que se pinta se ve.
   *
   * Medido en el banco (`banco3d.html`) con la cámara puesta en el encuadre de tablero —(0;
   * 422,9; 389), a 574,6 del centro— y el lienzo a 1600×900, comparando el mismo fotograma con
   * la marca y con su opacidad a cero y agrupando lo que cambia en manchas de cuatro
   * conectividades: las cinco veredas del tablero pintan 269, 269, 279, 281 y 301 píxeles —279,8
   * de media— y los dos poblados 117 y 177 —147,0—. O sea que EN PANTALLA la raya pesa el doble
   * que el disco, justo al revés de lo que dice la tinta de aquí: el disco de un poblado enseña
   * el 29 % de la tinta que tiene y la raya el 72 %.
   *
   * Y la CIUDAD, que es la que esta tanda agrandó para que asomara por fuera de la muralla:
   * pinta 193 píxeles con la mancha mayor en 84, o sea que su recinto también se come lo suyo.
   *
   * Lo de abajo se queda porque es la cifra que gobierna lo que se DIBUJA —y es la que hay que
   * mirar el día que alguien suba una talla—, pero dice lo que mide: tinta de geometría, no
   * píxeles vistos. Los píxeles vistos no se pueden medir desde Node y por eso están arriba con
   * el guion y el encuadre con el que salen.
   */
  const tintaEnPixeles = (forma: 'disco' | 'raya'): number =>
    loQueOcupaElZocalo(forma).mancha * (ZOCALO_EN_PANTALLA * EN_UNA_VENTANA_DE) ** 2;
  comprobar(
    `la raya de una vereda pone ${tintaEnPixeles('raya').toFixed(0)} píxeles cuadrados de MANCHA DE GEOMETRÍA y el disco de un asentamiento ${tintaEnPixeles('disco').toFixed(0)}: la marca de la vereda es la más floja de las dos, que es lo que se pidió. En píxeles VISTOS es al revés, y está medido en la cabecera de aquí arriba`,
    tintaEnPixeles('raya') < tintaEnPixeles('disco') && tintaEnPixeles('raya') > 4 * anchoDeLaPieza,
    { raya: tintaEnPixeles('raya'), disco: tintaEnPixeles('disco') },
  );
  /*
   * ═══ Y AHORA HAY UNA SEGUNDA CIFRA, PORQUE UN DEGRADADO NO SE MIDE POR SU ÁREA ═══
   *
   * La de arriba es la MANCHA: el área de las mallas, sin mirar la opacidad. Con un relleno
   * llano eso valía, porque el área y la pintura eran la misma cosa. Con un degradado NO: una
   * falda que acaba en cero cubre suelo y casi no pinta, y contarla entera es exactamente la
   * forma de que un degradado ancho parezca ligero.
   *
   * Así que se mide también la TINTA —la integral de la opacidad sobre la mancha— y se compara
   * con la que ponía la marca CON CONTORNO, que es la pregunta que había encima de esta tanda:
   * quitar el borde y difuminar no puede haber hecho la marca más pesada. La geometría de antes
   * se escribe aquí como un dato y se rehace la cuenta, igual que se hace con el aro.
   */
  const COMO_ERA_CON_CONTORNO = {
    radio: 0.81,
    grueso: 0.19,
    opRelleno: 0.55,
    opContorno: 0.8,
    ancho: 0.34,
    flanco: 0.17,
  };
  const tintaDeAntes = {
    disco:
      Math.PI * COMO_ERA_CON_CONTORNO.radio ** 2 * COMO_ERA_CON_CONTORNO.opRelleno +
      Math.PI *
        ((COMO_ERA_CON_CONTORNO.radio + COMO_ERA_CON_CONTORNO.grueso) ** 2 -
          COMO_ERA_CON_CONTORNO.radio ** 2) *
        COMO_ERA_CON_CONTORNO.opContorno,
    raya:
      LARGO_DE_LA_RAYA * COMO_ERA_CON_CONTORNO.ancho * COMO_ERA_CON_CONTORNO.opRelleno +
      2 * LARGO_DE_LA_RAYA * COMO_ERA_CON_CONTORNO.flanco * COMO_ERA_CON_CONTORNO.opContorno,
  };
  const tintaDeAhora = {
    disco: loQueOcupaElZocalo('disco').tinta,
    raya: loQueOcupaElZocalo('raya').tinta,
  };
  comprobar(
    `y el degradado NO ha hecho la marca más pesada: la tinta —la integral de la opacidad, no el área— baja de ${tintaDeAntes.disco.toFixed(2)} a ${tintaDeAhora.disco.toFixed(2)} en el disco (${((tintaDeAhora.disco / tintaDeAntes.disco) * 100).toFixed(0)} %) y de ${tintaDeAntes.raya.toFixed(2)} a ${tintaDeAhora.raya.toFixed(2)} en la raya (${((tintaDeAhora.raya / tintaDeAntes.raya) * 100).toFixed(0)} %), con la MISMA mancha que antes`,
    tintaDeAhora.disco < tintaDeAntes.disco &&
      tintaDeAhora.raya < tintaDeAntes.raya &&
      Math.abs(loQueOcupaElZocalo('disco').mancha - Math.PI * (COMO_ERA_CON_CONTORNO.radio + COMO_ERA_CON_CONTORNO.grueso) ** 2) < 1e-9 &&
      Math.abs(loQueOcupaElZocalo('raya').mancha - LARGO_DE_LA_RAYA * (COMO_ERA_CON_CONTORNO.ancho + 2 * COMO_ERA_CON_CONTORNO.flanco)) < 1e-9,
    { antes: tintaDeAntes, ahora: tintaDeAhora },
  );
  /*
   * LA VACUNA DEL PERFIL, que es la que decide la meseta: con la caída en 0,20 —o sea con la
   * meseta llegando a 0,80— la tinta del disco SUBIRÍA por encima de la que había con contorno.
   * Es el número que descartó ese perfil, y está aquí para que nadie lo vuelva a proponer sin
   * verlo. La integral es la misma que hace `loQueOcupaElZocalo`, rehecha con otra caída.
   */
  const tintaDeUnDiscoCon = (caida: number): number => {
    const d = 1 - caida;
    return (
      OPACIDAD_DEL_ZOCALO * Math.PI * d * d +
      OPACIDAD_DEL_ZOCALO * ((2 * Math.PI) / caida) * ((1 - d * d) / 2 - (1 - d * d * d) / 3)
    );
  };
  comprobar(
    `se ve fallar: con la caída en 0,20 en vez de en ${DESVANECIDO_DEL_DISCO.toFixed(2)} el disco pondría ${tintaDeUnDiscoCon(0.2).toFixed(2)} de tinta, MÁS que los ${tintaDeAntes.disco.toFixed(2)} que ponía con contorno — la caída no es un gusto, es lo que sujeta el peso`,
    tintaDeUnDiscoCon(0.2) > tintaDeAntes.disco &&
      Math.abs(tintaDeUnDiscoCon(DESVANECIDO_DEL_DISCO) - tintaDeAhora.disco) < 1e-9,
    { con020: tintaDeUnDiscoCon(0.2), conLaDeAhora: tintaDeUnDiscoCon(DESVANECIDO_DEL_DISCO), antes: tintaDeAntes.disco },
  );
  /*
   * Y LAS DOS PONEN MENOS TINTA QUE EL ARO QUE HABÍA ANTES, que es el encargo entero: bajarle el
   * volumen a la marca SIN perder que se encuentre. El aro medía de 0,55 a 1,07 al 2,2 % del
   * alto; se rehace esa cuenta aquí en vez de escribir el número.
   */
  const COMO_ERA_EL_ARO = { dentro: 0.55, fuera: 1.07, parte: 0.022 };
  const tintaDelAro =
    Math.PI *
    (COMO_ERA_EL_ARO.fuera ** 2 - COMO_ERA_EL_ARO.dentro ** 2) *
    (COMO_ERA_EL_ARO.parte * EN_UNA_VENTANA_DE) ** 2;
  comprobar(
    `y las dos pesan menos que el aro que había antes: el disco pone el ${((tintaEnPixeles('disco') / tintaDelAro) * 100).toFixed(0)} % de su tinta y la raya el ${((tintaEnPixeles('raya') / tintaDelAro) * 100).toFixed(0)} %, con ${(2 * COMO_ERA_EL_ARO.fuera * COMO_ERA_EL_ARO.parte * EN_UNA_VENTANA_DE).toFixed(1)} píxeles de ancho que tenía el aro contra los ${anchoDeLaMarca.toFixed(1)} del disco`,
    tintaEnPixeles('disco') < tintaDelAro &&
      tintaEnPixeles('raya') < tintaEnPixeles('disco') &&
      anchoDeLaMarca < 2 * COMO_ERA_EL_ARO.fuera * COMO_ERA_EL_ARO.parte * EN_UNA_VENTANA_DE,
    { disco: tintaEnPixeles('disco'), raya: tintaEnPixeles('raya'), elAro: tintaDelAro },
  );
  /*
   * ═══ Y LA TERCERA PESA MÁS QUE EL ARO, QUE ES EL PRECIO Y NO SE ESCONDE ═══
   *
   * El disco de una CIUDAD es la única de las tres marcas que pone MÁS tinta que el aro que
   * había antes, y no hay forma de que no sea así: un disco relleno del mismo radio que un
   * anillo pone siempre más que él, y para asomar por fuera de la muralla hace falta ese radio.
   * Se paga porque la alternativa está medida en el banco: 29 píxeles de marca en la torre,
   * contra 191 y 238 en dos chozas del mismo fotograma.
   *
   * Se acota por arriba —menos del doble del aro— para que el número no suba solo en el primer
   * retoque, y lo que de verdad lo sujeta es la medida de la alfombra de más abajo, que ya se
   * hace con las 54 marcas siendo ciudades.
   */
  const tintaDeLaCiudad =
    loQueOcupaElZocalo('disco').mancha * (ZOCALO_DE_CIUDAD_EN_PANTALLA * EN_UNA_VENTANA_DE) ** 2;
  comprobar(
    `y la tercera pesa más, dicho con número: el disco de una ciudad pone ${tintaDeLaCiudad.toFixed(0)} píxeles cuadrados, el ${((tintaDeLaCiudad / tintaDelAro) * 100).toFixed(0)} % del aro — es lo que cuesta que asome por fuera de un recinto cerrado`,
    tintaDeLaCiudad > tintaDelAro && tintaDeLaCiudad < 2 * tintaDelAro,
    { ciudad: tintaDeLaCiudad, elAro: tintaDelAro, deUnPoblado: tintaEnPixeles('disco') },
  );
  /*
   * LA VACUNA DE LA CUENTA: sin la regla de marca de pantalla —o sea, con un aro del tamaño de
   * una tesela, que es lo que se pintaría escribiendo un radio a mano— el zócalo ocuparía desde
   * el aire lo mismo que la pieza, y no se vería tampoco. Es literalmente el fallo que ya se
   * pagó con la primera versión de la señal de los sitios: se dibujaba, costaba sus llamadas, y
   * la captura salía idéntica a la de antes.
   */
  const comoUnaTesela = RADIO_DE_TESELA / altoQueSeVe;
  comprobar(
    `se ve fallar: un aro del tamaño de una tesela ocuparía el ${(comoUnaTesela * 100).toFixed(2)} % del alto desde el aire —del orden de la propia pieza, que ocupa el ${(parteQueOcupaLaPieza * 100).toFixed(2)} %— y encogería con la distancia en vez de mantenerse`,
    comoUnaTesela < ZOCALO_EN_PANTALLA && comoUnaTesela < parteQueOcupaLaPieza * 3,
    { comoUnaTesela, laPieza: parteQueOcupaLaPieza, deMarca: ZOCALO_EN_PANTALLA },
  );
  /*
   * Y LOS TOPES MUERDEN POR LOS DOS LADOS, que es la mitad que se olvida: pegada al suelo la
   * cuenta pide un aro de una unidad —una china— y desde muy lejos uno que se come tres
   * comarcas. Se comprueba que la función los respeta y que con datos imposibles devuelve el
   * SUELO y no cero: un aro de tamaño cero desaparece sin que nada falle, que es el fallo que
   * esta función existe para no tener.
   */
  comprobar(
    'la talla de una marca respeta sus dos topes, y con datos imposibles devuelve el suelo y no cero',
    talla(0.001) === SUELO_DEL_ZOCALO &&
      talla(1e9) === TECHO_DEL_ZOCALO &&
      tallaDeUnaMarca(Number.NaN, CAMPO, ZOCALO_EN_PANTALLA, SUELO_DEL_ZOCALO, TECHO_DEL_ZOCALO) === SUELO_DEL_ZOCALO &&
      tallaDeUnaMarca(desdeElAire, 0, ZOCALO_EN_PANTALLA, SUELO_DEL_ZOCALO, TECHO_DEL_ZOCALO) === SUELO_DEL_ZOCALO,
    {
      pegadaAlSuelo: talla(0.001),
      muyLejos: talla(1e9),
      conBasura: tallaDeUnaMarca(Number.NaN, CAMPO, ZOCALO_EN_PANTALLA, SUELO_DEL_ZOCALO, TECHO_DEL_ZOCALO),
    },
  );
}

// ---------------------------------------------------------------------------
paso('El zócalo se compra de verdad: disco en la choza, raya en la vereda, cada una de su dueño, apagándose hacia fuera y a lo largo de su arista');
// ---------------------------------------------------------------------------

/**
 * ═══ POR QUÉ ESTE BLOQUE, Y QUÉ FALLO ES EL QUE VIGILA ═══
 *
 * El zócalo es lo único que hace jugable el tablero: sin él, el delta recién repartido y el
 * mismo con cuatro chozas y cuatro veredas puestas son la MISMA IMAGEN desde el encuadre de
 * «Ver el tablero entero». Y no lo vigilaba nadie. Se le puso `visible` en falso al grupo y
 * las 378 comprobaciones de este guion y las 657 de `verify:escritorio` siguieron LAS DOS EN
 * VERDE — porque lo que estaba medido era la ARITMÉTICA del aro (que la fracción de pantalla
 * no depende de la distancia, que el filo se separa de los seis terrenos) y nunca que hubiera
 * un aro.
 *
 * Es exactamente la historia que este árbol tiene escrita tres veces: un arreglo que se
 * pierde dentro de dos semanas sin que nadie lo vea venir.
 *
 * ═══ CÓMO SE COMPRA UN TROZO DE JSX DESDE NODE, QUE ERA EL PROBLEMA ═══
 *
 * El aro estaba escrito dentro de un componente con `useFrame`, que es el único sitio del
 * árbol al que no llega un guion de Node: montarlo pide un `Canvas`, y en Node no hay WebGL.
 * Por eso vive ahora en `zocalo.tsx` y por eso `Zocalo` NO USA NINGÚN GANCHO: un componente
 * sin ganchos se LLAMA como una función corriente, y lo que devuelve es un árbol de elementos
 * de React —objetos llanos con su `type` y sus `props`— que se recorre aquí mismo. Lo que
 * sigue viviendo en `delta.tsx` es sólo el `useFrame` que le pone la talla, y eso se lee por
 * TEXTO en el último bloque, que es la técnica que este guion ya usa con los diez grupos de
 * la mesa.
 *
 * Cuatro cosas se compran de la marca y las cuatro se pueden perder solas: QUE EXISTA, QUE
 * LLEVE EL COLOR DE SU DUEÑO Y NINGÚN OTRO, QUE SE APAGUE HACIA FUERA HASTA SER TRANSPARENTE y
 * QUE ESTÉ A LA TALLA DE UNA MARCA DE PANTALLA. Y las cuatro llevan su vacuna: se le rompe a un
 * árbol de mentira exactamente eso y el mismo juez que dice que sí tiene que decir que no.
 *
 * LA TERCERA ES NUEVA Y SUSTITUYE A «QUE TENGA FILO», y no es un cambio de palabras: aquí se
 * exigía que la marca llevara `FILO_DEL_ZOCALO` —el contorno casi negro— y ahora se exige que
 * NO lo lleve, porque se pidió quitarlo. Lo que hacía el contorno —que la marca se encuentre
 * sobre cualquier terreno— lo hace ahora la opacidad, que subió de 0,55 a 0,85, y eso se mide en
 * el bloque de color de más arriba con las veinticuatro parejas de color y suelo.
 */
{
  /** Un elemento de React, visto como lo que es: un objeto llano con `type` y `props`. */
  interface NodoPintado {
    readonly type: unknown;
    readonly props: Record<string, unknown>;
  }
  const esNodo = (x: unknown): x is NodoPintado =>
    typeof x === 'object' && x !== null && 'type' in x && 'props' in x;
  /** Todo lo que cuelga de un nodo, él incluido. */
  const todoElArbol = (raiz: unknown): NodoPintado[] => {
    const salida: NodoPintado[] = [];
    const mete = (x: unknown): void => {
      if (Array.isArray(x)) {
        for (const hijo of x) mete(hijo);
        return;
      }
      if (!esNodo(x)) return;
      salida.push(x);
      mete(x.props['children']);
    };
    mete(raiz);
    return salida;
  };
  const deTipo = (arbol: readonly NodoPintado[], que: string): NodoPintado[] =>
    arbol.filter((n) => n.type === que);

  /*
   * ═══ EL JUEZ, ESCRITO UNA VEZ Y USADO CON LO BUENO Y CON LO ROTO ═══
   *
   * Devuelve la LISTA DE LO QUE FALTA, no un sí o un no: así el fallo dice qué se rompió, y
   * así cada vacuna puede exigir que falte exactamente lo que se ha quitado. Un juez que
   * devolviera un booleano pasaría por verde con la mitad de las razones equivocadas.
   */
  /**
   * `forma` entra en el juez porque las dos marcas NO son el mismo árbol: el disco son dos
   * mallas —la meseta y su falda— y la raya son tres —la banda del eje y sus dos faldas—. Un
   * juez que se conformara con «hay mallas» diría que sí a una raya sin faldas, que es la marca
   * de las veredas cortada en seco, o sea con el borde que se acaba de quitar dibujado con su
   * propio color.
   */
  const queLeFaltaAlZocalo = (raiz: unknown, deQuien: string, forma: 'disco' | 'raya'): string[] => {
    const faltas: string[] = [];
    const arbol = todoElArbol(raiz);
    const apagados = arbol.filter((n) => n.props['visible'] === false);
    if (apagados.length > 0) faltas.push(`hay ${String(apagados.length)} nodos apagados con visible en falso`);
    /*
     * ═══ Y APAGAR NO ES SÓLO `visible`: UN `scale={0}` HACE EXACTAMENTE LO MISMO ═══
     *
     * Este juez recorría el árbol y compraba `visible`, las mallas, las geometrías, los
     * colores, el `renderOrder`, el `depthWrite`, el `side`, el `transparent`, las opacidades
     * y el `raycast`. NADIE MIRABA `scale`. Y un `scale={0}` en el grupo raíz que devuelve
     * `Zocalo()` apaga las 126 marcas del tablero desde el fichero cuya premisa entera es
     * «esto SÍ se puede medir desde Node»: probado sobre esta misma fuente, `verify:escena`,
     * `verify:escritorio` y el typecheck salían los TRES en cero.
     *
     * Se mira TODO el árbol y no sólo la raíz, porque el grupo de dentro —el del giro— y las
     * tres mallas apagan igual de bien. Se admite que la prop no esté, que es lo normal, y se
     * admite el uno escrito de las dos formas que r3f acepta.
     *
     * Y LO MISMO CON EL SITIO, que es la puerta de al lado: una malla empujada a
     * `[0, 0, -100000]` desaparece sin que ninguna otra comprobación se entere. Los únicos
     * sitios legales son los que `piezasDelZocalo` declara —cero para el disco, `±aparte` para
     * los dos flancos de la raya—, y el grupo RAÍZ queda fuera de esta regla porque su
     * posición se la dice quien lo monta y se compra aparte, con el `donde=`.
     */
    const escalaRota = (valor: unknown): boolean => {
      if (valor === undefined || valor === null) return false;
      if (typeof valor === 'number') return valor !== 1;
      if (Array.isArray(valor)) return valor.some((v) => v !== 1);
      return true;
    };
    const encogidos = arbol.filter((n) => escalaRota(n.props['scale']));
    if (encogidos.length > 0) {
      faltas.push(
        `hay ${String(encogidos.length)} nodos encogidos con un scale que no es uno: ${encogidos
          .map((n) => JSON.stringify(n.props['scale']))
          .join(', ')}`,
      );
    }
    const sitiosLegales = piezasDelZocalo(forma, deQuien).map((p) =>
      p.que === 'raya' ? RADIO_DE_TESELA * p.aparte : 0,
    );
    const mudados = arbol.slice(1).filter((n) => {
      const donde = n.props['position'];
      if (donde === undefined || donde === null) return false;
      if (!Array.isArray(donde) || donde.length !== 3) return true;
      return (
        donde[0] !== 0 ||
        donde[2] !== 0 ||
        !sitiosLegales.some((y) => Math.abs(y - Number(donde[1])) < 1e-9)
      );
    });
    if (mudados.length > 0) {
      faltas.push(
        `hay ${String(mudados.length)} piezas mudadas fuera de su sitio: ${mudados
          .map((n) => JSON.stringify(n.props['position']))
          .join(', ')}`,
      );
    }
    const mallas = deTipo(arbol, 'mesh');
    const piezas = piezasDelZocalo(forma, deQuien);
    const CUANTAS = forma === 'disco' ? 2 : 3;
    if (mallas.length !== CUANTAS) {
      faltas.push(
        `tiene ${String(mallas.length)} mallas y son ${String(CUANTAS)}: ${forma === 'disco' ? 'la meseta y su falda' : 'la banda del eje y sus dos faldas'}`,
      );
    }
    /* Y CADA FORMA CON SU GEOMETRÍA. Un disco pintado con planos no es un disco. */
    const cuantasDe = (que: string): number => deTipo(arbol, que).length;
    if (forma === 'disco' && (cuantasDe('circleGeometry') !== 1 || cuantasDe('ringGeometry') !== 1)) {
      faltas.push(
        `el disco no está hecho de un círculo de meseta y un aro de falda: ${String(cuantasDe('circleGeometry'))} círculos y ${String(cuantasDe('ringGeometry'))} aros`,
      );
    }
    if (forma === 'raya' && cuantasDe('planeGeometry') !== 3) {
      faltas.push(`la raya no está hecha de tres planos: ${String(cuantasDe('planeGeometry'))}`);
    }
    const pinturas = deTipo(arbol, 'meshBasicMaterial');
    const colores = pinturas.map((n) => String(n.props['color']));
    const suyo = colorLlanoDelJugador(deQuien);
    if (!colores.includes(suyo)) faltas.push(`no lleva el color de su dueño ${suyo}: ${colores.join(', ')}`);
    /*
     * ═══ Y NO LLEVA NINGÚN OTRO COLOR, QUE ES LO QUE SUSTITUYE A «TIENE CONTORNO» ═══
     *
     * Aquí se exigía que la marca LLEVARA `FILO_DEL_ZOCALO`. Ahora se exige lo contrario, y por
     * la misma razón por la que se exigía aquello: lo que se pidió es que el borde negro
     * desapareciera y que la marca se difuminara «del mismo color del área». Una marca con dos
     * colores es una marca con contorno, se llame como se llame el segundo.
     */
    const ajenos = [...new Set(colores.filter((c) => c !== suyo))];
    if (ajenos.length > 0) {
      faltas.push(
        `la marca lleva ${String(ajenos.length)} color(es) que no son el de su dueño —o sea, ha vuelto el contorno—: ${ajenos.join(', ')}`,
      );
    }
    /*
     * ═══ EL DEGRADADO: QUE ESTÉ, QUE LLEVE ALFA, Y QUE SEA EL QUE SE MIDE ═══
     *
     * El perfil se pinta con COLORES POR VÉRTICE de cuatro componentes —`three` sólo enciende el
     * alfa por vértice si `itemSize` es 4—, así que aquí se compran las tres cosas que pueden
     * romperlo sin que nada más se entere: que el material los LEA (`vertexColors`), que el
     * atributo tenga CUATRO componentes, y que los números sean EXACTAMENTE los que
     * `alfasDeLaPieza` declara, vértice a vértice. Esa última es la que ata el JSX con lo que se
     * mide: sin ella, el fichero podría pintar un degradado y la medida hablar de otro.
     */
    for (const pintura of pinturas) {
      if (pintura.props['vertexColors'] !== true) {
        faltas.push('una pieza no lee el color por vértice: sin `vertexColors` el degradado no se pinta y la marca se corta en seco');
      }
    }
    const alfasDeLaMalla = (malla: NodoPintado): number[] | undefined => {
      const deColor = deTipo(todoElArbol(malla), 'bufferAttribute').filter(
        (n) => n.props['attach'] === 'attributes-color',
      );
      if (deColor.length !== 1) return undefined;
      const args = (deColor[0] as NodoPintado).props['args'];
      if (!Array.isArray(args) || args.length < 2 || args[1] !== 4) return undefined;
      const crudo = args[0] as ArrayLike<number> | undefined;
      if (crudo === undefined || typeof crudo.length !== 'number') return undefined;
      const salida: number[] = [];
      for (let i = 3; i < crudo.length; i += 4) salida.push(crudo[i] as number);
      return salida;
    };
    const todosLosAlfas: number[] = [];
    for (let i = 0; i < mallas.length; i++) {
      const malla = mallas[i] as NodoPintado;
      const suyos = alfasDeLaMalla(malla);
      if (suyos === undefined) {
        faltas.push('una malla no lleva un atributo `attributes-color` de cuatro componentes: sin él no hay alfa por vértice y el degradado no existe');
        continue;
      }
      todosLosAlfas.push(...suyos);
      const pieza = piezas[i];
      if (pieza === undefined) continue;
      const debidos = alfasDeLaPieza(pieza);
      const cuadran =
        debidos.length === (suyos.length * 4) &&
        suyos.every((a, k) => (debidos[k * 4 + 3] as number) === a);
      if (!cuadran) {
        faltas.push(
          `el degradado que se PINTA en la ${pieza.que} no es el que se MIDE en \`alfasDeLaPieza\`: ${String(suyos.length)} vértices contra ${String(debidos.length / 4)}`,
        );
      }
    }
    if (todosLosAlfas.length > 0 && !todosLosAlfas.some((a) => a === 0)) {
      faltas.push('ningún vértice de la marca es transparente: el degradado no llega a cero, o sea que la marca se corta en seco por el borde');
    }
    if (todosLosAlfas.length > 0 && !todosLosAlfas.some((a) => a === 1)) {
      faltas.push('ningún vértice de la marca es opaco: la marca no tiene meseta y se ve entera aguada');
    }
    /*
     * LA FALDA VA POR DEBAJO EN LA PILA DE DIBUJO Y POR FUERA EN TAMAÑO, que es lo que la hace
     * falda y no un parche encima. «Por fuera» se mide distinto en cada forma y es la misma
     * idea: en el disco, el radio de fuera del aro pasa del radio del círculo; en la raya, la
     * falda se aparta del eje más de lo que la banda es ancha por su mitad.
     */
    const laMallaDe = (que: string): NodoPintado | undefined => {
      const donde = piezas.findIndex((p) => p.que === que);
      return donde < 0 ? undefined : mallas[donde];
    };
    if (forma === 'disco') {
      const laFalda = laMallaDe('falda');
      const laMeseta = laMallaDe('meseta');
      if (laFalda === undefined || laMeseta === undefined) {
        faltas.push('al disco le falta la meseta o la falda que la apaga');
      } else {
        const ordenDeLaFalda = Number(laFalda.props['renderOrder']);
        const ordenDeLaMeseta = Number(laMeseta.props['renderOrder']);
        if (ordenDeLaFalda >= ordenDeLaMeseta) {
          faltas.push(`la falda se pinta encima de la meseta: ${String(ordenDeLaFalda)} contra ${String(ordenDeLaMeseta)}`);
        }
        const aro = deTipo(todoElArbol(laFalda), 'ringGeometry')[0];
        const circulo = deTipo(todoElArbol(laMeseta), 'circleGeometry')[0];
        const fuera = aro === undefined ? 0 : (aro.props['args'] as number[])[1] ?? 0;
        const dentro = aro === undefined ? Infinity : (aro.props['args'] as number[])[0] ?? Infinity;
        const radio = circulo === undefined ? Infinity : (circulo.props['args'] as number[])[0] ?? Infinity;
        if (!(fuera > radio) || dentro !== radio) {
          faltas.push(`la falda no arranca donde acaba la meseta y sale hacia fuera: ${String(dentro)}-${String(fuera)} contra ${String(radio)}`);
        }
      }
    } else {
      const laBanda = laMallaDe('raya');
      const lasFaldas = mallas.filter((m, i) => (piezas[i] as { apaga?: number } | undefined)?.apaga !== 0);
      const anchoDeLaBanda = ((): number => {
        const suya = mallas[piezas.findIndex((p) => p.que === 'raya' && p.apaga === 0)];
        const plano = suya === undefined ? undefined : deTipo(todoElArbol(suya), 'planeGeometry')[0];
        return plano === undefined ? Infinity : (plano.props['args'] as number[])[1] ?? Infinity;
      })();
      if (laBanda === undefined || lasFaldas.length !== 2) {
        faltas.push(`la raya lleva ${String(lasFaldas.length)} faldas y son dos, una a cada canto`);
      }
      const lados = lasFaldas.map((f) => ((f.props['position'] as number[] | undefined) ?? [0, 0, 0])[1] ?? 0);
      if (!lados.some((y) => y > anchoDeLaBanda / 2) || !lados.some((y) => y < -anchoDeLaBanda / 2)) {
        faltas.push(`las faldas no salen por los dos cantos de la raya: ${lados.join(', ')} contra ${String(anchoDeLaBanda / 2)}`);
      }
    }
    /* Y las tres del material, que son las que hacen que se vea sobre lo que sea. */
    for (const pintura of pinturas) {
      if (pintura.props['depthWrite'] !== false) faltas.push('una pieza escribe profundidad y taparía lo de detrás');
      if (pintura.props['side'] !== THREE.DoubleSide) faltas.push('una pieza se pinta por una cara y desaparece a ras de suelo');
      if (pintura.props['transparent'] !== true) faltas.push('una pieza es opaca');
    }
    /*
     * Y LA OPACIDAD ES LA QUE SE MIDIÓ. No es un detalle de estilo: el bloque de color de arriba
     * afirma que veintidós de las veinticuatro parejas de color y terreno se separan más de 20 y
     * que las cuatro marcas se separan entre sí, y las dos cifras están calculadas CON ESTA
     * opacidad. Cambiándola en el JSX, aquellas medidas seguirían saliendo y ya no hablarían de
     * lo que se pinta.
     */
    for (const pintura of pinturas) {
      if (pintura.props['opacity'] !== OPACIDAD_DEL_ZOCALO) {
        faltas.push(
          `una pieza se pinta con una opacidad de ${String(pintura.props['opacity'])} y las medidas de color están hechas al ${String(OPACIDAD_DEL_ZOCALO)}`,
        );
      }
    }
    /* Y NO COGE TOQUES. `raycast={() => null}`, que es lo único que de verdad lo desactiva. */
    for (const malla of mallas) {
      const traza = malla.props['raycast'];
      if (typeof traza !== 'function' || (traza as () => unknown)() !== null) {
        faltas.push('una malla del zócalo puede coger toques: le falta el raycast que devuelve null');
      }
    }
    return faltas;
  };

  const elRojo = Zocalo({ color: 'red', donde: [0, ALTO_DEL_ZOCALO, 0], forma: 'disco', marca: null });
  comprobar(
    'se monta el disco de un asentamiento y no le falta nada: la meseta del color de su dueño y la falda que la apaga hasta transparente por fuera, sin ningún otro color, las dos transparentes, a dos caras, con el degradado que se mide, a la opacidad que se midió y sin coger toques',
    queLeFaltaAlZocalo(elRojo, 'red', 'disco').length === 0,
    queLeFaltaAlZocalo(elRojo, 'red', 'disco'),
  );
  const laRaya = Zocalo({ color: 'red', donde: [0, ALTO_DEL_ZOCALO, 0], forma: 'raya', giro: 0.7, marca: null });
  comprobar(
    'y se monta la raya de una vereda y tampoco le falta nada: tres planos —la banda del eje y sus dos faldas, una a cada canto— con las mismas reglas',
    queLeFaltaAlZocalo(laRaya, 'red', 'raya').length === 0,
    queLeFaltaAlZocalo(laRaya, 'red', 'raya'),
  );
  /*
   * ═══ Y EL PERFIL DEL DEGRADADO, VÉRTICE A VÉRTICE, QUE ES LO QUE SUSTITUYE AL CONTORNO ═══
   *
   * Lo de arriba compra que el JSX pinta lo que `alfasDeLaPieza` dice. Esto compra que lo que
   * `alfasDeLaPieza` dice ES UN DEGRADADO y no cualquier lista de números: uno por dentro, cero
   * en el borde, en el sitio exacto en que `three` pone cada vértice. Sin esto, las dos podrían
   * estar de acuerdo en pintar un borde duro.
   *
   * El orden de los vértices no se supone: está escrito en la cabecera de `alfasDeLaPieza` y
   * sale de las tres geometrías de `three` —el círculo, el aro y el plano—, y es lo que aquí se
   * recorre.
   */
  const soloElAlfa = (pieza: PiezaDelZocalo): number[] => {
    const crudo = alfasDeLaPieza(pieza);
    const salida: number[] = [];
    for (let i = 3; i < crudo.length; i += 4) salida.push(crudo[i] as number);
    return salida;
  };
  const elRgbEsBlanco = [...piezasDelZocalo('disco', 'red'), ...piezasDelZocalo('raya', 'red')].every((p) => {
    const crudo = alfasDeLaPieza(p);
    for (let i = 0; i < crudo.length; i += 4) {
      if (crudo[i] !== 1 || crudo[i + 1] !== 1 || crudo[i + 2] !== 1) return false;
    }
    return true;
  });
  const laFaldaDelDisco = soloElAlfa(
    piezasDelZocalo('disco', 'red').find((p) => p.que === 'falda') as PiezaDelZocalo,
  );
  const laMesetaDelDisco = soloElAlfa(
    piezasDelZocalo('disco', 'red').find((p) => p.que === 'meseta') as PiezaDelZocalo,
  );
  const porDentro = laFaldaDelDisco.slice(0, LADOS_DEL_DISCO + 1);
  const porFuera = laFaldaDelDisco.slice(LADOS_DEL_DISCO + 1);
  comprobar(
    `el degradado del disco es un degradado: la meseta va entera a uno en sus ${String(laMesetaDelDisco.length)} vértices, y la falda entra a uno por sus ${String(porDentro.length)} vértices de dentro y sale a CERO por sus ${String(porFuera.length)} de fuera — que es lo que el contorno hacía con un filo casi negro`,
    elRgbEsBlanco &&
      laMesetaDelDisco.length === LADOS_DEL_DISCO + 2 &&
      laMesetaDelDisco.every((a) => a === 1) &&
      laFaldaDelDisco.length === 2 * (LADOS_DEL_DISCO + 1) &&
      porDentro.every((a) => a === 1) &&
      porFuera.every((a) => a === 0),
    { meseta: laMesetaDelDisco.length, porDentro: porDentro.length, porFuera: porFuera.length },
  );
  /*
   * Y EN LA RAYA HAY DOS BORDES Y NO UNO: los CANTOS largos y las PUNTAS. Las dos faldas apagan
   * su canto de fuera, la banda del eje no apaga ninguno de los dos —porque sus cantos no son el
   * borde de la marca: las faldas siguen hacia fuera—, y LAS TRES apagan las puntas, que es lo
   * que hace que una vereda no tenga costura con el poblado del que sale.
   */
  const lasDeLaRaya = piezasDelZocalo('raya', 'red').map((p) => ({
    apaga: (p as { apaga: number }).apaga,
    alfa: soloElAlfa(p),
  }));
  const enFila = (alfa: number[], fila: number): number[] =>
    alfa.slice(fila * (TRAMOS_DE_LA_RAYA + 1), (fila + 1) * (TRAMOS_DE_LA_RAYA + 1));
  const laPuntaSeApaga = lasDeLaRaya.every((r) =>
    [0, 1].every((f) => {
      const su = enFila(r.alfa, f);
      return su[0] === 0 && su[su.length - 1] === 0;
    }),
  );
  const elCantoSeApaga = lasDeLaRaya.every((r) => {
    const arriba = enFila(r.alfa, 0);
    const abajo = enFila(r.alfa, 1);
    if (r.apaga === 0) return arriba.filter((a) => a === 1).length === TRAMOS_DE_LA_RAYA - 1 && abajo.filter((a) => a === 1).length === TRAMOS_DE_LA_RAYA - 1;
    const fuera = r.apaga === 1 ? arriba : abajo;
    const dentro = r.apaga === 1 ? abajo : arriba;
    return fuera.every((a) => a === 0) && dentro.filter((a) => a === 1).length === TRAMOS_DE_LA_RAYA - 1;
  });
  comprobar(
    `y el de la raya se apaga por sus CUATRO bordes: las dos faldas dejan a cero su canto de fuera, la banda del eje no apaga ninguno de los dos —porque las faldas siguen— y las tres se apagan en las PUNTAS, un tramo de ${String(TRAMOS_DE_LA_RAYA)} a cada lado, que es lo que quita la costura con el poblado`,
    lasDeLaRaya.length === 3 &&
      lasDeLaRaya.every((r) => r.alfa.length === 2 * (TRAMOS_DE_LA_RAYA + 1)) &&
      laPuntaSeApaga &&
      elCantoSeApaga,
    lasDeLaRaya.map((r) => ({ apaga: r.apaga, aCero: r.alfa.filter((a) => a === 0).length, aUno: r.alfa.filter((a) => a === 1).length })),
  );
  /*
   * Y LAS DOS FORMAS SON DISTINTAS DE VERDAD. Sin esto, `forma` podría estar sin usar —un
   * `Zocalo` que devolviera siempre el disco— y las dos comprobaciones de arriba seguirían en
   * verde con las veredas marcadas con un punto, que es el fallo que la raya viene a arreglar.
   */
  comprobar(
    'el disco y la raya son dos árboles distintos: la vereda no se marca con un punto',
    deTipo(todoElArbol(elRojo), 'circleGeometry').length === 1 &&
      deTipo(todoElArbol(laRaya), 'circleGeometry').length === 0 &&
      deTipo(todoElArbol(laRaya), 'planeGeometry').length === 3 &&
      deTipo(todoElArbol(elRojo), 'planeGeometry').length === 0,
    {
      disco: todoElArbol(elRojo).map((n) => String(n.type)).filter((t) => t.endsWith('Geometry')),
      raya: todoElArbol(laRaya).map((n) => String(n.type)).filter((t) => t.endsWith('Geometry')),
    },
  );
  /*
   * ═══ Y LAS MEDIDAS DEL JSX SALEN DE LAS CONSTANTES, NO DE UN NÚMERO A MANO ═══
   *
   * Es la misma frontera de siempre: `piezasDelZocalo` es lo que se mide desde Node —con ella se
   * compra que 126 marcas no tapan el delta y que ninguna toca a su vecina— y el JSX es lo que
   * se pinta. Si el JSX escribiera sus propios radios, aquellas medidas hablarían de otra marca.
   * Se comprueba que cada argumento de geometría es exactamente `RADIO_DE_TESELA` por lo que la
   * pieza dice, que es lo único que ata las dos cosas.
   */
  const comoSeDibuja = (arbol: unknown, que: string): number[][] =>
    deTipo(todoElArbol(arbol), que).map((n) => n.props['args'] as number[]);
  const laDelDisco = comoSeDibuja(elRojo, 'circleGeometry')[0] ?? [];
  const laFalda = comoSeDibuja(elRojo, 'ringGeometry')[0] ?? [];
  const losPlanos = comoSeDibuja(laRaya, 'planeGeometry');
  comprobar(
    `las medidas del JSX salen de las constantes: la meseta a ${String(RADIO_DE_LA_MESETA)} de radio con su falda de ${String(DESVANECIDO_DEL_DISCO)}, y la raya de ${String(LARGO_DE_LA_RAYA)} por ${String(ANCHO_DE_LA_RAYA)} con faldas de ${String(DESVANECIDO_DE_LA_RAYA)} y partida en ${String(TRAMOS_DE_LA_RAYA)} tramos, todo en múltiplos de la tesela`,
    laDelDisco[0] === RADIO_DE_TESELA * RADIO_DE_LA_MESETA &&
      laFalda[0] === RADIO_DE_TESELA * RADIO_DE_LA_MESETA &&
      laFalda[1] === RADIO_DE_TESELA * (RADIO_DE_LA_MESETA + DESVANECIDO_DEL_DISCO) &&
      losPlanos.length === 3 &&
      losPlanos.every((p) => p[0] === RADIO_DE_TESELA * LARGO_DE_LA_RAYA) &&
      losPlanos.every((p) => p[2] === TRAMOS_DE_LA_RAYA && p[3] === 1) &&
      losPlanos.filter((p) => p[1] === RADIO_DE_TESELA * ANCHO_DE_LA_RAYA).length === 1 &&
      losPlanos.filter((p) => p[1] === RADIO_DE_TESELA * DESVANECIDO_DE_LA_RAYA).length === 2,
    { laDelDisco, laFalda, losPlanos },
  );
  /*
   * Y `piezasDelZocalo` DICE LO MISMO QUE EL JSX, que es la otra mitad del atado: la función es
   * lo que se mide y el JSX es lo que se pinta, así que si una lista tres piezas y el otro
   * dibuja dos, la medida de la alfombra habla de una marca que no existe.
   */
  comprobar(
    'y `piezasDelZocalo` lista exactamente las piezas que el JSX dibuja, en las dos formas: lo que se mide y lo que se pinta son la misma marca',
    piezasDelZocalo('disco', 'red').length === deTipo(todoElArbol(elRojo), 'mesh').length &&
      piezasDelZocalo('raya', 'red').length === deTipo(todoElArbol(laRaya), 'mesh').length &&
      piezasDelZocalo('disco', 'red').length === 2 &&
      piezasDelZocalo('raya', 'red').length === 3,
    {
      dice: [piezasDelZocalo('disco', 'red').length, piezasDelZocalo('raya', 'red').length],
      dibuja: [deTipo(todoElArbol(elRojo), 'mesh').length, deTipo(todoElArbol(laRaya), 'mesh').length],
    },
  );
  /*
   * Y EL DE CADA COLONO ES EL SUYO. No es la misma comprobación con cuatro datos: lo que se
   * compra aquí es que la marca NO ES SIEMPRE LA MISMA —cuatro zócalos idénticos señalarían las
   * cuatro piezas con el mismo color, que es justo el fallo que el zócalo existe para tapar— y
   * que un color que llegue de fuera no deje una pieza sin marca.
   */
  const suColor = (color: string): string[] => [
    ...new Set(
      deTipo(
        todoElArbol(Zocalo({ color, donde: [0, ALTO_DEL_ZOCALO, 0], forma: 'disco', marca: null })),
        'meshBasicMaterial',
      ).map((n) => String(n.props['color'])),
    ),
  ];
  const cuatroDistintos = new Set(COLORES_DE_JUGADOR.map((c) => suColor(c).join('')));
  comprobar(
    'los cuatro colonos llevan cuatro marcas distintas, cada una con el color con el que se pinta su pieza',
    cuatroDistintos.size === COLORES_DE_JUGADOR.length &&
      COLORES_DE_JUGADOR.every((c) => suColor(c).length === 1 && suColor(c)[0] === colorLlanoDelJugador(c)),
    Object.fromEntries(COLORES_DE_JUGADOR.map((c) => [c, suColor(c)])),
  );
  comprobar(
    'y un color que llega de fuera no deja la pieza sin marca: sale azul, como en `desplazamientoDeColor`',
    suColor('morado')[0] === colorLlanoDelJugador('blue'),
    suColor('morado'),
  );
  /*
   * ═══ LOS DOS GIROS, Y LOS DOS BORRAN LA MARCA SIN LANZAR NADA ═══
   *
   * EL DE FUERA la TUMBA sobre el suelo. Sin el cuarto de vuelta se pinta DE CANTO —un plano de
   * `three` nace en el plano XY, o sea vertical en este mundo— y desde el aire lo que se ve es
   * una raya de un píxel o nada, que en pantalla se lee exactamente igual que si el zócalo no
   * estuviera.
   *
   * EL DE DENTRO la APUNTA a lo largo de la arista, y es el que decide si la raya de una vereda
   * va A LO LARGO o DE TRAVÉS. De través mide cuatro píxeles de punta a punta: la marca que
   * existe para que se cuenten cinco veredas seguidas sería un punto. Es exactamente el fallo
   * que ya se pagó con los tramos del puente puestos cruzados.
   */
  const grupoDeFuera = todoElArbol(Zocalo({ color: 'blue', donde: [7, 3, 11], forma: 'disco', marca: null }))[0];
  const giro = grupoDeFuera?.props['rotation'] as number[] | undefined;
  const plantado = grupoDeFuera?.props['position'] as number[] | undefined;
  comprobar(
    'la marca se tumba sobre el suelo —un cuarto de vuelta sobre X— y se planta donde le dicen',
    grupoDeFuera?.type === 'group' &&
      giro !== undefined &&
      Math.abs((giro[0] ?? 0) + Math.PI / 2) < 1e-12 &&
      giro[1] === 0 &&
      giro[2] === 0 &&
      plantado?.join(',') === '7,3,11',
    { giro, plantado },
  );
  const conEsteGiro = (cuanto: number): number[] | undefined => {
    const dentro = todoElArbol(
      Zocalo({ color: 'blue', donde: [0, 0, 0], forma: 'raya', giro: cuanto, marca: null }),
    ).filter((n) => n.type === 'group')[1];
    return dentro?.props['rotation'] as number[] | undefined;
  };
  comprobar(
    'y la raya de una vereda se apunta a lo largo de la arista: el giro que le dan llega al grupo de dentro y gira sobre el eje del plano tumbado',
    (conEsteGiro(0.7) ?? [])[2] === 0.7 && (conEsteGiro(-1.9) ?? [])[2] === -1.9 && (conEsteGiro(0.7) ?? [])[0] === 0,
    { conSieteDecimas: conEsteGiro(0.7), conMenosDos: conEsteGiro(-1.9) },
  );
  comprobar(
    `el disco se parte en ${String(LADOS_DEL_DISCO)} trozos: a ${(2 * loQueOcupaElZocalo('disco').fuera * ZOCALO_EN_PANTALLA * 900).toFixed(1)} píxeles de diámetro eso son ${((Math.PI * 2 * loQueOcupaElZocalo('disco').fuera * ZOCALO_EN_PANTALLA * 900) / LADOS_DEL_DISCO).toFixed(1)} píxeles por lado, y el ojo lee un círculo`,
    deTipo(todoElArbol(elRojo), 'ringGeometry').every((n) => (n.props['args'] as number[])[2] === LADOS_DEL_DISCO) &&
      deTipo(todoElArbol(elRojo), 'circleGeometry').every((n) => (n.props['args'] as number[])[1] === LADOS_DEL_DISCO) &&
      LADOS_DEL_DISCO >= 20,
    deTipo(todoElArbol(elRojo), 'ringGeometry').map((n) => (n.props['args'] as number[])[2]),
  );

  /*
   * ═══ LAS VACUNAS: EL JUEZ TIENE DIENTES ═══
   *
   * Se le rompe a un árbol de mentira exactamente lo que el revisor rompió —y tres cosas más—
   * y se exige que el juez lo cace. Sin esto, todo lo de arriba podría ser un juez que dice que
   * sí a cualquier cosa, que es la forma más cara de estar en verde.
   *
   * `structuredClone` no vale: estos árboles llevan funciones dentro (`raycast`) y las
   * funciones no se clonan. Se rehace el nodo a mano, que además es lo que hay que hacer para
   * tocarle una prop a un elemento de React.
   */
  const conLaPropCambiada = (nodo: NodoPintado, que: string, valor: unknown): NodoPintado => ({
    type: nodo.type,
    props: { ...nodo.props, [que]: valor },
  });
  const elArbolDelRojo = elRojo as unknown as NodoPintado;
  const apagado = conLaPropCambiada(elArbolDelRojo, 'visible', false);
  comprobar(
    'se ve fallar: con el grupo apagado —lo que el revisor hizo y las dos baterías dejaron pasar— el juez lo dice',
    queLeFaltaAlZocalo(apagado, 'red', 'disco').some((f) => f.includes('apagados')),
    queLeFaltaAlZocalo(apagado, 'red', 'disco'),
  );
  /** Un árbol con sólo las mallas que se piden, colgadas del grupo de fuera. */
  const soloConEstasMallas = (arbol: unknown, sirve: (n: NodoPintado) => boolean): NodoPintado => ({
    type: 'group',
    props: {
      ...(arbol as NodoPintado).props,
      children: todoElArbol(arbol).filter((n) => n.type === 'mesh' && sirve(n)),
    },
  });
  /*
   * ═══ EL REESCRITOR: TOCARLE UNA PIEZA A UN ÁRBOL DE REACT SIN PERDER EL RESTO ═══
   *
   * Las vacunas del degradado no pueden usar `soloConEstasMallas` —que aplana el árbol— porque
   * lo que hay que romper vive DENTRO de la malla: el atributo de color por vértice, que cuelga
   * de la geometría. Así que se recorre el árbol entero rehaciendo los nodos, y se cambia el que
   * la vacuna diga. Los hijos que no son nodos (los `false` que dejan los `&&` del JSX) se
   * copian tal cual, que es lo que hace que la forma del árbol siga siendo la de verdad.
   */
  const rehaciendo = (x: unknown, toca: (n: NodoPintado) => NodoPintado | undefined): unknown => {
    if (Array.isArray(x)) return x.map((h) => rehaciendo(h, toca));
    if (!esNodo(x)) return x;
    const cambiado = toca(x);
    if (cambiado !== undefined) return cambiado;
    return { type: x.type, props: { ...x.props, children: rehaciendo(x.props['children'], toca) } };
  };
  const discoSinFalda = soloConEstasMallas(elRojo, (n) => deTipo(todoElArbol(n), 'ringGeometry').length === 0);
  comprobar(
    'se ve fallar: quitándole la FALDA al disco queda la meseta sola, o sea un disco que se corta en seco por el borde — que es exactamente el borde que se pidió quitar, dibujado ahora con el color del dueño. El juez dice que ningún vértice de la marca es transparente',
    queLeFaltaAlZocalo(discoSinFalda, 'red', 'disco').some((f) => f.includes('transparente')),
    queLeFaltaAlZocalo(discoSinFalda, 'red', 'disco'),
  );
  /*
   * Y LA MISMA VACUNA EN LA RAYA, QUITÁNDOLE UNA SOLA FALDA. No es la de arriba con otra forma:
   * una raya con una falda sigue apagándose por un canto, sigue siendo del color de su dueño y
   * sigue teniendo vértices transparentes — lo que pierde es el degradado por UN canto, y por
   * ese canto se corta en seco. Un juez que sólo mirara «hay alfas a cero» diría que sí.
   */
  const rayaConUnaFalda = soloConEstasMallas(laRaya, (n) => {
    const y = ((n.props['position'] as number[] | undefined) ?? [0, 0, 0])[1] ?? 0;
    return y <= 0;
  });
  comprobar(
    'se ve fallar: a la raya de una vereda se le quita UNA falda y el juez dice que ya no se apaga por los dos cantos',
    queLeFaltaAlZocalo(rayaConUnaFalda, 'red', 'raya').some((f) => f.includes('los dos cantos')),
    queLeFaltaAlZocalo(rayaConUnaFalda, 'red', 'raya'),
  );
  /*
   * ═══ Y LA VACUNA DEL ENCARGO ENTERO: QUE EL CONTORNO NO PUEDA VOLVER SIN QUE NADIE LO VEA ═══
   *
   * Aquí había una comprobación que EXIGÍA `FILO_DEL_ZOCALO` en la marca. Ahora se exige lo
   * contrario, y esto es lo que compra que la exigencia tiene dientes: se le pinta a UNA de las
   * dos mallas el filo casi negro de antes —que es literalmente lo que se pidió quitar— y el
   * juez tiene que decirlo. Sin esto, «no lleva otro color» podría ser un juez que no mira.
   */
  const conElContornoDeVuelta = rehaciendo(elRojo, (n) =>
    n.type === 'meshBasicMaterial' && n.props['color'] === colorLlanoDelJugador('red')
      ? conLaPropCambiada(n, 'color', FILO_DEL_ZOCALO)
      : undefined,
  );
  comprobar(
    `se ve fallar: pintándole a la marca el contorno casi negro que se pidió quitar —${FILO_DEL_ZOCALO}— el juez dice que ha vuelto el contorno`,
    queLeFaltaAlZocalo(conElContornoDeVuelta, 'red', 'disco').some((f) => f.includes('ha vuelto el contorno')),
    queLeFaltaAlZocalo(conElContornoDeVuelta, 'red', 'disco'),
  );
  /*
   * ═══ LAS TRES FORMAS DE APAGAR EL DEGRADADO SIN TOCAR NI UNA GEOMETRÍA ═══
   *
   * Son las que este cambio ABRE, y por eso llevan vacuna cada una. Las tres dejan la marca
   * montada, del color de su dueño, con sus dos mallas y a su opacidad — y las tres la
   * devuelven al borde duro que Miguel pidió quitar:
   *
   *   · quitarle `vertexColors` al material: `three` ignora el atributo y pinta la falda entera
   *     a la opacidad de la meseta;
   *   · dejar el atributo en TRES componentes: sin la cuarta no hay alfa por vértice —es
   *     literalmente lo que enciende `USE_COLOR_ALPHA`— y pasa lo mismo;
   *   · y escribir los alfas de la falda a uno, que es el borde duro dibujado a mano.
   */
  const sinLeerElColorPorVertice = rehaciendo(elRojo, (n) =>
    n.type === 'meshBasicMaterial' ? conLaPropCambiada(n, 'vertexColors', false) : undefined,
  );
  comprobar(
    'se ve fallar: sin `vertexColors` en el material, `three` ignora el alfa por vértice y la falda se pinta entera a la opacidad de la meseta — o sea, vuelve el borde duro. El juez lo dice',
    queLeFaltaAlZocalo(sinLeerElColorPorVertice, 'red', 'disco').some((f) => f.includes('por vértice')),
    queLeFaltaAlZocalo(sinLeerElColorPorVertice, 'red', 'disco'),
  );
  const conTresComponentes = rehaciendo(elRojo, (n) => {
    if (n.type !== 'bufferAttribute') return undefined;
    const args = n.props['args'] as [ArrayLike<number>, number];
    return conLaPropCambiada(n, 'args', [args[0], 3]);
  });
  comprobar(
    'se ve fallar: con el atributo de color en TRES componentes en vez de cuatro no hay alfa por vértice —es lo que `three` mira para encender `USE_COLOR_ALPHA`— y el degradado desaparece sin que nada más cambie. El juez lo dice',
    queLeFaltaAlZocalo(conTresComponentes, 'red', 'disco').some((f) => f.includes('cuatro componentes')),
    queLeFaltaAlZocalo(conTresComponentes, 'red', 'disco'),
  );
  const conLaFaldaLlena = rehaciendo(elRojo, (n) => {
    if (n.type !== 'bufferAttribute') return undefined;
    const args = n.props['args'] as [ArrayLike<number>, number];
    const llena = new Float32Array(args[0].length).fill(1);
    return conLaPropCambiada(n, 'args', [llena, args[1]]);
  });
  comprobar(
    'se ve fallar: escribiendo los alfas de la falda a UNO —el borde duro dibujado a mano, con la geometría intacta— el juez dice que el degradado que se pinta no es el que se mide y que ningún vértice es transparente',
    queLeFaltaAlZocalo(conLaFaldaLlena, 'red', 'disco').some((f) => f.includes('no es el que se MIDE')) &&
      queLeFaltaAlZocalo(conLaFaldaLlena, 'red', 'disco').some((f) => f.includes('transparente')),
    queLeFaltaAlZocalo(conLaFaldaLlena, 'red', 'disco'),
  );
  /*
   * Y LA CUARTA, QUE ES LA DE LA COSTURA: dejar los alfas de las PUNTAS de la raya a uno. La
   * marca sigue apagándose por los cantos —o sea que parece que el degradado está—, y la vereda
   * vuelve a cortarse en seco justo donde entra en el poblado, que es la costura que el
   * territorio continuo no puede tener.
   */
  const laRayaCortadaEnSeco = rehaciendo(laRaya, (n) => {
    if (n.type !== 'bufferAttribute') return undefined;
    const args = n.props['args'] as [ArrayLike<number>, number];
    const sinPuntas = new Float32Array(args[0] as unknown as ArrayLike<number>);
    const porFila = TRAMOS_DE_LA_RAYA + 1;
    for (let fila = 0; fila <= 1; fila++) {
      for (const columna of [0, TRAMOS_DE_LA_RAYA]) {
        const v = fila * porFila + columna;
        sinPuntas[v * 4 + 3] = sinPuntas[(fila * porFila + 1) * 4 + 3] as number;
      }
    }
    return conLaPropCambiada(n, 'args', [sinPuntas, args[1]]);
  });
  comprobar(
    'se ve fallar: dejando las PUNTAS de la raya sin apagar —la vereda cortada en seco justo donde entra en el poblado, que es la costura que el territorio no puede tener— el juez dice que el degradado que se pinta no es el que se mide',
    queLeFaltaAlZocalo(laRayaCortadaEnSeco, 'red', 'raya').some((f) => f.includes('no es el que se MIDE')),
    queLeFaltaAlZocalo(laRayaCortadaEnSeco, 'red', 'raya'),
  );
  comprobar(
    'se ve fallar: un zócalo del color de otro colono no señala a su dueño',
    queLeFaltaAlZocalo(elRojo, 'green', 'disco').some((f) => f.includes(colorLlanoDelJugador('green'))),
    queLeFaltaAlZocalo(elRojo, 'green', 'disco'),
  );
  const cogiendoToques: NodoPintado = {
    type: 'group',
    props: {
      ...elArbolDelRojo.props,
      children: todoElArbol(elRojo)
        .filter((n) => n.type === 'mesh')
        .map((n) => conLaPropCambiada(n, 'raycast', undefined)),
    },
  };
  comprobar(
    'se ve fallar: sin el `raycast` que devuelve null, la marca se comería desde el aire los toques de la comarca que tiene debajo',
    queLeFaltaAlZocalo(cogiendoToques, 'red', 'disco').some((f) => f.includes('toques')),
    queLeFaltaAlZocalo(cogiendoToques, 'red', 'disco'),
  );
  /*
   * Y LA VACUNA DE LA OPACIDAD, que es la que la versión del aro no tenía: aflojando la marca al
   * 0,15 sigue estando, sigue siendo del color de su dueño y sigue difuminándose — y en pantalla
   * ya no se distingue de qué color es, porque todas las medidas del bloque de arriba están
   * hechas al 0,85. El juez tiene que decirlo.
   */
  const aguado: NodoPintado = {
    type: 'group',
    props: {
      ...elArbolDelRojo.props,
      children: todoElArbol(elRojo)
        .filter((n) => n.type === 'mesh')
        .map((n) => ({
          type: n.type,
          props: {
            ...n.props,
            children: todoElArbol(n)
              .filter((q) => q.type !== 'mesh')
              .map((q) => (q.type === 'meshBasicMaterial' ? conLaPropCambiada(q, 'opacity', 0.15) : q)),
          },
        })),
    },
  };
  comprobar(
    'se ve fallar: con el relleno aflojado al 0,15 la marca sigue montada y el juez dice que ya no se pinta a la opacidad con la que se midió el color',
    queLeFaltaAlZocalo(aguado, 'red', 'disco').some((f) => f.includes('opacidad')),
    queLeFaltaAlZocalo(aguado, 'red', 'disco'),
  );
  /*
   * ═══ LAS TRES VACUNAS DE LA PUERTA DE AL LADO: `scale` Y EL SITIO ═══
   *
   * Las de arriba compran que el juez caza lo que el revisor rompió. Éstas compran lo que el
   * juez NO miraba y que apaga la marca igual de bien, desde este mismo fichero y sin tocar
   * `visible`: un cero en la escala —en la raíz, en el grupo del giro o en las mallas— y una
   * malla empujada fuera del encuadre. Las tres pasaban con `verify:escena` en verde.
   */
  const encogido = conLaPropCambiada(elArbolDelRojo, 'scale', 0);
  comprobar(
    'se ve fallar: con `scale={0}` en el grupo raíz de `Zocalo` —dentro de `zocalo.tsx`, o sea en el fichero que existe para poder medirse— el juez lo dice',
    queLeFaltaAlZocalo(encogido, 'red', 'disco').some((f) => f.includes('encogidos')),
    queLeFaltaAlZocalo(encogido, 'red', 'disco'),
  );
  const dentroEncogido: NodoPintado = {
    type: elArbolDelRojo.type,
    props: {
      ...elArbolDelRojo.props,
      children: conLaPropCambiada(elArbolDelRojo.props['children'] as NodoPintado, 'scale', [0, 0, 0]),
    },
  };
  comprobar(
    'se ve fallar: y con `scale={[0, 0, 0]}` en el grupo del GIRO —que no es la raíz y apaga lo mismo— también',
    queLeFaltaAlZocalo(dentroEncogido, 'red', 'disco').some((f) => f.includes('encogidos')),
    queLeFaltaAlZocalo(dentroEncogido, 'red', 'disco'),
  );
  const mudada: NodoPintado = {
    type: 'group',
    props: {
      ...elArbolDelRojo.props,
      children: todoElArbol(elRojo)
        .filter((n) => n.type === 'mesh')
        .map((n) => conLaPropCambiada(n, 'position', [0, 0, -100000])),
    },
  };
  comprobar(
    'se ve fallar: y con las mallas empujadas a cien mil unidades de su sitio la marca sigue montada, sigue siendo del color de su dueño y no está en ningún sitio — el juez lo dice',
    queLeFaltaAlZocalo(mudada, 'red', 'disco').some((f) => f.includes('mudadas')),
    queLeFaltaAlZocalo(mudada, 'red', 'disco'),
  );

  // ── LA TALLA: la misma marca de pantalla en los 126 sitios del delta ──────

  /*
   * ═══ LA CÁMARA ES LA DE VERDAD, Y LOS SITIOS SON LOS DE VERDAD ═══
   *
   * `encuadreDelDelta` pone la cámara a `mayor·1,25` de altura y `mayor·1,15` de fondo; se
   * rehace esa cuenta aquí sobre `mallaDeRadio(2)` —el delta de verdad— en vez de escribir el
   * número, y se monta una `PerspectiveCamera` de `three` de las que se montan en pantalla.
   * `tallaDelZocalo` recibe esa cámara y el punto, así que lo que se mide es la misma llamada
   * que hace el `useFrame`.
   *
   * Y los sitios son los CINCUENTA Y CUATRO vértices donde cabe una choza y las SETENTA Y DOS
   * aristas donde cabe una vereda: no un punto de muestra, sino todos aquellos en los que un
   * jugador puede poner algo. Cada uno está a una distancia distinta de la cámara —el borde del
   * delta está mucho más lejos que el centro— y la frase entera de la marca de pantalla es que
   * eso NO SE NOTA.
   */
  const radioDelMundoConMarcas = DELTA.reduce((mayor, h) => {
    const c = centroDeHex(h, RADIO_DE_COMARCA);
    return Math.max(mayor, Math.hypot(c.x, c.y) + RADIO_DE_COMARCA);
  }, RADIO_DE_COMARCA);
  const laCamara = new THREE.PerspectiveCamera(45, 16 / 9, 1, 10000);
  laCamara.position.set(0, radioDelMundoConMarcas * 1.25, radioDelMundoConMarcas * 1.15);
  const CAMPO_EN_RADIANES = (laCamara.fov * Math.PI) / 180;
  const LOS_VERTICES = verticesDe(DELTA);
  const LAS_ARISTAS = aristasDe(DELTA);
  const sitiosDeMarca: Array<{ que: string; donde: [number, number, number] }> = [
    ...LOS_VERTICES.map((v) => {
      const q = puntoDeVertice(v, RADIO_DE_COMARCA);
      return { que: `choza ${v}`, donde: [q.x, 0, q.y] as [number, number, number] };
    }),
    ...LAS_ARISTAS.map((a) => {
      const q = puntoDeArista(a, RADIO_DE_COMARCA);
      return { que: `vereda ${a}`, donde: [q.x, 0, q.y] as [number, number, number] };
    }),
  ];
  comprobar(
    `hay ${String(sitiosDeMarca.length)} sitios donde puede caer una marca: ${String(LOS_VERTICES.length)} vértices con choza y ${String(LAS_ARISTAS.length)} aristas con vereda`,
    LOS_VERTICES.length === 54 && LAS_ARISTAS.length === 72,
    { vertices: LOS_VERTICES.length, aristas: LAS_ARISTAS.length },
  );
  const parteQueOcupaEn = (donde: readonly [number, number, number], talla: number): number => {
    const lejos = Math.hypot(
      laCamara.position.x - donde[0],
      laCamara.position.y - donde[1],
      laCamara.position.z - donde[2],
    );
    return (talla * RADIO_DE_TESELA) / (2 * lejos * Math.tan(CAMPO_EN_RADIANES / 2));
  };
  const desviados = sitiosDeMarca.filter(
    (s) => Math.abs(parteQueOcupaEn(s.donde, tallaDelZocalo(laCamara, s.donde)) - ZOCALO_EN_PANTALLA) > 1e-9,
  );
  comprobar(
    `en los ${String(sitiosDeMarca.length)} sitios del delta el zócalo ocupa el ${(ZOCALO_EN_PANTALLA * 100).toFixed(1)} % del alto, esté la marca en el centro o en el borde`,
    desviados.length === 0,
    desviados.slice(0, 3).map((s) => s.que),
  );
  /*
   * LA VACUNA, y es la que sostiene la marca de pantalla entera: una marca del tamaño del mundo
   * —que es lo que se pinta escribiendo un radio a mano— ocupa cosas distintas en el centro y
   * en el borde. En pantalla eso se lee como que unas veredas se ven y otras no, y es
   * exactamente lo que pasa: la del borde se queda por debajo de la fracción que hace falta.
   *
   * Con el aro esta vacuna exigía además que NINGUNA llegara a la fracción de marca. Con el
   * disco ya no es cierto —al 1,4 % del alto, una marca de una tesela SÍ pasa de ese ancho en
   * el sitio más cercano a la cámara— y decirlo seguiría siendo cómodo pero falso: lo que se
   * exige ahora es lo que se mide, que la más lejana se quede corta y que las dos no midan lo
   * mismo, que es la frase entera de la marca de pantalla.
   */
  const comoUnaTesela = sitiosDeMarca.map((s) => parteQueOcupaEn(s.donde, 1));
  const masChica = Math.min(...comoUnaTesela);
  const masGrande = Math.max(...comoUnaTesela);
  comprobar(
    `se ve fallar: con una marca del tamaño del mundo, la del sitio más cercano ocuparía ${(masGrande / masChica).toFixed(2)} veces la del más lejano, y la del borde del delta se quedaría en el ${(masChica * 100).toFixed(2)} % del alto contra el ${(ZOCALO_EN_PANTALLA * 100).toFixed(1)} % que hace falta`,
    masGrande / masChica > 1.2 && masChica < ZOCALO_EN_PANTALLA,
    { masChica, masGrande, deMarca: ZOCALO_EN_PANTALLA },
  );
  /*
   * Y UNA CÁMARA QUE NO ES DE PERSPECTIVA NO DEJA LA MARCA SIN TALLA. `tallaDeUnaMarca` con un
   * campo de cero devuelve el SUELO, que es una china; con el campo de reserva sale una marca.
   */
  const ortogonal = new THREE.OrthographicCamera(-100, 100, 100, -100, 1, 10000);
  ortogonal.position.copy(laCamara.position);
  comprobar(
    'con una cámara ortográfica la marca sigue teniendo talla de marca y no se queda en el suelo de la cuenta',
    tallaDelZocalo(ortogonal, [0, 0, 0]) > SUELO_DEL_ZOCALO &&
      tallaDelZocalo(ortogonal, [0, 0, 0]) < TECHO_DEL_ZOCALO,
    tallaDelZocalo(ortogonal, [0, 0, 0]),
  );

  // ── Y NO ES UNA ALFOMBRA: 126 marcas y ninguna toca a otra ────────────────

  /*
   * ═══ LA PREGUNTA QUE HAY QUE CONTESTAR ANTES DE PONERLE MARCA A LAS VEREDAS ═══
   *
   * El zócalo se quedó en el 2,2 % del alto y no en el 3,5 % de la señal de un sitio libre por
   * una razón escrita: la señal está mientras se elige dónde construir y el zócalo está
   * SIEMPRE. Ponerle marca también a las veredas multiplica por tres lo que hay en pantalla
   * —doce veredas por colono y seis colonos son setenta y dos, que es EXACTAMENTE el número de
   * aristas del delta: el tope del juego y el del tablero son el mismo— así que hay que medir
   * si el tablero se convierte en una alfombra de aros.
   *
   * Se mide el peor caso posible y no el corriente: las 54 chozas y las 72 veredas a la vez,
   * que es más de lo que ninguna partida puede poner —la regla de distancia deja bastantes
   * menos chozas— y por tanto una cota de verdad.
   *
   * Y por los DOS lados, porque «alfombra» son dos cosas distintas:
   *   · CUÁNTO TAPAN: la tinta de las 126 marcas contra la superficie del delta. Se cuenta la
   *     TINTA y no el círculo que las contiene, porque ahora una de las dos formas es una raya
   *     larga y fina: medirla por su círculo diría que tapa siete veces lo que tapa.
   *   · Y SI SE TOCAN: dos marcas pegadas dejan de leerse como dos. Las más juntas que puede
   *     haber son una choza y una de sus propias veredas —medio lado de comarca—, y eso es lo
   *     que decide el tamaño máximo que la marca puede tener. Aquí sí manda el círculo que la
   *     contiene, porque una raya girada puede apuntar a cualquier lado.
   */
  /*
   * ═══ Y AHORA LAS MARCAS NO MIDEN TODAS LO MISMO, ASÍ QUE EL PAR IMPORTA ═══
   *
   * Esto se medía tomando la marca MÁS ANCHA y suponiendo que las dos del par eran ella:
   * `aire = masJuntas − 2·radioDeFuera`. Mientras había una sola talla eso era conservador y
   * daba igual. Desde que el disco de una ciudad mide casi el doble que la raya de una vereda,
   * suponerlo pide aire para una pareja que no existe —dos ciudades vecinas están a 75,8, no a
   * 37,9— y deja sin medir la que sí existe.
   *
   * Así que se recorren los 126 sitios con SU radio cada uno y se busca el par que menos aire
   * deja. El peor caso de talla es que los 54 vértices sean CIUDADES, que es lo que más ocupa
   * —una partida de Riberas reparte cuatro ciudades por colono, así que no puede pasar—.
   */
  const elDisco = loQueOcupaElZocalo('disco');
  const laRayaOcupa = loQueOcupaElZocalo('raya');
  const enElMundoDeLaRaya = tallaDelZocalo(laCamara, [0, 0, 0]) * RADIO_DE_TESELA;
  const enElMundoDeLaCiudad =
    tallaDelZocalo(
      laCamara,
      [0, 0, 0],
      ZOCALO_DE_CIUDAD_EN_PANTALLA,
      sueloDeLaMarca('ciudad'),
      techoDeLaMarca('ciudad'),
    ) * RADIO_DE_TESELA;
  const radioDeLaRaya = enElMundoDeLaRaya * laRayaOcupa.fuera;
  const radioDelDisco = enElMundoDeLaCiudad * elDisco.fuera;
  const radioDeFuera = Math.max(radioDelDisco, radioDeLaRaya);
  const puntosDeMarca = sitiosDeMarca.map((s) => ({
    x: s.donde[0],
    y: s.donde[2],
    radio: s.que.startsWith('choza') ? radioDelDisco : radioDeLaRaya,
    que: s.que,
  }));
  let masJuntas = Infinity;
  let aire = Infinity;
  let elParMasJunto = '';
  for (let i = 0; i < puntosDeMarca.length; i++) {
    for (let j = i + 1; j < puntosDeMarca.length; j++) {
      const uno = puntosDeMarca[i] as (typeof puntosDeMarca)[number];
      const otro = puntosDeMarca[j] as (typeof puntosDeMarca)[number];
      const cuanto = Math.hypot(uno.x - otro.x, uno.y - otro.y);
      masJuntas = Math.min(masJuntas, cuanto);
      const suAire = cuanto - uno.radio - otro.radio;
      if (suAire < aire) {
        aire = suAire;
        elParMasJunto = `${uno.que} y ${otro.que}, a ${cuanto.toFixed(1)}`;
      }
    }
  }
  const superficieDelDelta = DELTA.length * ((3 * Math.sqrt(3)) / 2) * RADIO_DE_COMARCA * RADIO_DE_COMARCA;
  const cuantoTapanTodas = (deLaCiudad: number, deLaRaya: number): number =>
    (LOS_VERTICES.length * elDisco.mancha * deLaCiudad * deLaCiudad +
      LAS_ARISTAS.length * laRayaOcupa.mancha * deLaRaya * deLaRaya) /
    superficieDelDelta;
  const tapan = cuantoTapanTodas(enElMundoDeLaCiudad, enElMundoDeLaRaya);
  comprobar(
    `con las ${String(puntosDeMarca.length)} marcas puestas a la vez —${String(LOS_VERTICES.length)} discos de CIUDAD, que es lo que más ocupa, y ${String(LAS_ARISTAS.length)} rayas— la tinta tapa el ${(tapan * 100).toFixed(1)} % del delta: no es una alfombra`,
    tapan < 0.15,
    { tapan, superficieDelDelta, radioDelDisco, radioDeLaRaya },
  );
  comprobar(
    `y ninguna toca a otra: el par más apretado es ${elParMasJunto} y deja ${aire.toFixed(1)} de aire, más que los ${radioDeFuera.toFixed(1)} que mide de radio la más ancha de las dos`,
    aire > radioDeFuera,
    { masJuntas, aire, radioDeFuera, elPar: elParMasJunto },
  );
  /*
   * LA VACUNA: A LA TALLA DE LA SEÑAL DE UN SITIO LIBRE ESTO SÍ SERÍA UNA ALFOMBRA. Es la razón
   * por la que `ZOCALO_EN_PANTALLA` vale 0,014 y no 0,035, y no es un argumento sino una medida.
   *
   * Y los dos números que salen de aquí son los que la cabecera de `escala.ts` decía mal: no
   * es que el aire «baje a 1,6», es que se hace NEGATIVO —las dos marcas se solapan— y no es
   * el 46 % del delta sino el 33,9 %. Los dos venían de la época del aro.
   */
  const COMO_UNA_SENAL = 0.035;
  const deSenalEnElMundo = (enElMundoDeLaRaya * COMO_UNA_SENAL) / ZOCALO_EN_PANTALLA;
  const tapanDeSenal = cuantoTapanTodas(deSenalEnElMundo, deSenalEnElMundo);
  const aireDeSenal =
    masJuntas - deSenalEnElMundo * elDisco.fuera - deSenalEnElMundo * laRayaOcupa.fuera;
  comprobar(
    `se ve fallar: a la talla de la señal de un sitio libre las mismas marcas taparían el ${(tapanDeSenal * 100).toFixed(1)} % del delta, y el aire del par más apretado pasaría de ${aire.toFixed(1)} a ${aireDeSenal.toFixed(1)} — o sea que se solaparían`,
    tapanDeSenal > 0.3 && tapanDeSenal > tapan * 2 && aireDeSenal < 0,
    { tapanDeSenal, tapan, aireDeSenal },
  );

  // ── DÓNDE CAE LA MARCA DE UNA VEREDA: en la calzada, no bajo tierra ───────

  /*
   * ═══ POR QUÉ NO VALE «LA MEDIA DE LAS DOS PUNTAS» ═══
   *
   * La calzada de un puente NO es la recta entre sus dos puntas: es la polilínea por las
   * juntas, que es lo que la hace pasar POR ENCIMA de los cerros. Este fichero ya tiene medido
   * que la recta queda bajo tierra en el 23 % de las aristas de este tablero y que en la peor
   * se hunde ocho personas y media. Colgar la marca de la media de las dos cotas la metería
   * bajo tierra en esas mismas aristas — y una marca enterrada no es una marca torcida: es una
   * marca que no está, que es el fallo entero que esto viene a arreglar.
   *
   * Se mide sobre las 72 aristas del delta de verdad y con doce relieves distintos, que es la
   * misma batería con la que se mide el suelo de los vértices unos bloques más arriba.
   */
  {
    const TERRENOS_DE_PRUEBA = [
      'bosque', 'bosque', 'bosque', 'bosque', 'pradera', 'pradera', 'pradera', 'pradera',
      'campo', 'campo', 'campo', 'campo', 'colina', 'colina', 'colina',
      'montana', 'montana', 'montana', 'desierto',
    ];
    const islasDePrueba = DELTA.map((hex, i) => ({
      hex,
      terreno: TERRENOS_DE_PRUEBA[i % TERRENOS_DE_PRUEBA.length] ?? 'pradera',
    }));
    let medidas = 0;
    const fueraDelMedio: string[] = [];
    const enterradas: string[] = [];
    const enterradasSiFueraLaRecta: string[] = [];
    const torcidas: string[] = [];
    let loMasHondoDeLaRecta = 0;
    for (let semilla = 0; semilla < 12; semilla++) {
      const relieve = crearRelieve(islasDePrueba, semilla);
      const suelo = (q: Punto): number => relieve.alturaEn(q);
      for (const arista of LAS_ARISTAS) {
        const [uno, otro] = verticesDeArista(arista);
        if (uno === undefined || otro === undefined) continue;
        const a = puntoDeVertice(uno, RADIO_DE_COMARCA);
        const b = puntoDeVertice(otro, RADIO_DE_COMARCA);
        const puente = puenteEntre(a, b, suelo);
        const enElMapa = puntoDeArista(arista, RADIO_DE_COMARCA);
        medidas++;
        if (Math.abs(puente.medio.x - enElMapa.x) > 1e-9 || Math.abs(puente.medio.z - enElMapa.y) > 1e-9) {
          fueraDelMedio.push(
            `${arista}: la marca en ${puente.medio.x.toFixed(1)},${puente.medio.z.toFixed(1)} y el medio de la arista en ${enElMapa.x.toFixed(1)},${enElMapa.y.toFixed(1)}`,
          );
        }
        /*
         * ═══ Y LA RAYA VA A LO LARGO DE LA ARISTA, QUE ES LA MITAD DE LO QUE MARCA ═══
         *
         * `puente.giro` es lo que `delta.tsx` le pasa al zócalo, y con la convención de los
         * caminos —giro cero apunta a +X— eso tiene que dejar la raya PARALELA a la arista. Se
         * comprueba comparando la dirección que el giro produce con la de la arista de verdad,
         * en valor absoluto del coseno: una raya vale igual apuntando a un lado que al otro,
         * pero de través vale cero. Un signo cambiado en la Y del `atan2` —que es la cuenta que
         * ya dejó los puentes cruzados— da aquí un coseno que no es uno.
         */
        const largoDeLaArista = Math.hypot(b.x - a.x, b.y - a.y);
        const cuadra =
          Math.abs(
            (Math.cos(puente.giro) * (b.x - a.x) - Math.sin(puente.giro) * (b.y - a.y)) / largoDeLaArista,
          );
        if (Math.abs(cuadra - 1) > 1e-9) {
          torcidas.push(`${arista}: la raya se desvía de la arista, el coseno sale ${cuadra.toFixed(4)}`);
        }
        const tierra = suelo({ x: enElMapa.x, y: enElMapa.y });
        if (puente.medio.y + ALTO_DEL_ZOCALO <= tierra) {
          enterradas.push(
            `${arista} con semilla ${String(semilla)}: la marca a ${puente.medio.y.toFixed(1)} y la tierra a ${tierra.toFixed(1)}`,
          );
        }
        const laRecta = (puente.cotas[0] + puente.cotas[1]) / 2;
        if (laRecta + ALTO_DEL_ZOCALO <= tierra) {
          enterradasSiFueraLaRecta.push(
            `${arista} con semilla ${String(semilla)}: la recta a ${laRecta.toFixed(1)} y la tierra a ${tierra.toFixed(1)}`,
          );
          loMasHondoDeLaRecta = Math.max(loMasHondoDeLaRecta, tierra - laRecta);
        }
      }
    }
    comprobar(
      `hay puentes que medir: ${String(medidas)} aristas con doce relieves distintos`,
      medidas === LAS_ARISTAS.length * 12,
      medidas,
    );
    comprobar(
      'la marca de una vereda cae en el punto medio EXACTO de su arista, el mismo que da `puntoDeArista`: quien la busque mirando el tablero la encuentra donde está la vereda',
      fueraDelMedio.length === 0,
      fueraDelMedio.slice(0, 3),
    );
    comprobar(
      `y la raya va A LO LARGO de la arista en las ${String(medidas)} medidas: una vereda marcada de través mide cuatro píxeles de punta a punta y deja de decir hacia dónde va`,
      torcidas.length === 0,
      torcidas.slice(0, 3),
    );
    /*
     * LA VACUNA DEL GIRO: el mismo juez con el signo de la Y sin cambiar —que es el error que ya
     * dejó los tramos del puente puestos cruzados— tiene que caer, y tiene que caer en CASI
     * todas: las pocas aristas que sobreviven son las horizontales, donde el signo da igual.
     */
    const conElSignoAlReves: string[] = [];
    for (const arista of LAS_ARISTAS) {
      const [uno, otro] = verticesDeArista(arista);
      if (uno === undefined || otro === undefined) continue;
      const a = puntoDeVertice(uno, RADIO_DE_COMARCA);
      const b = puntoDeVertice(otro, RADIO_DE_COMARCA);
      const alReves = Math.atan2(b.y - a.y, b.x - a.x);
      const largo = Math.hypot(b.x - a.x, b.y - a.y);
      const cuadra = Math.abs((Math.cos(alReves) * (b.x - a.x) - Math.sin(alReves) * (b.y - a.y)) / largo);
      if (Math.abs(cuadra - 1) > 1e-9) conElSignoAlReves.push(`${arista}: ${cuadra.toFixed(4)}`);
    }
    comprobar(
      `se ve fallar: con el signo de la Y sin cambiar en el \`atan2\`, la raya se sale de la arista en ${String(conElSignoAlReves.length)} de las ${String(LAS_ARISTAS.length)} —todas menos las horizontales, donde el signo da igual—`,
      conElSignoAlReves.length > LAS_ARISTAS.length / 2,
      conElSignoAlReves.slice(0, 3),
    );
    comprobar(
      `y va a la altura de la CALZADA, así que no queda enterrada en ninguna de las ${String(medidas)} medidas`,
      enterradas.length === 0,
      enterradas.slice(0, 3),
    );
    comprobar(
      `se ve fallar: colgándola de la media de las dos puntas, la marca quedaría bajo tierra en ${String(enterradasSiFueraLaRecta.length)} de las ${String(medidas)} —hasta ${(loMasHondoDeLaRecta / ALTURA_DE_UNA_PERSONA).toFixed(1)} personas de roca encima—`,
      enterradasSiFueraLaRecta.length > 0,
      enterradasSiFueraLaRecta.slice(0, 3),
    );
    /*
     * ═══ Y NO SE VA POR ARRIBA — Y LO QUE HABÍA AQUÍ NO COMPRABA NADA ═══
     *
     * Una marca colgada muy por encima de la calzada deja de leerse como el suelo de la vereda
     * y pasa a ser un globo. Hasta esta tanda el techo era
     * `tierra + AIRE_BAJO_LA_CALZADA + SUPERFICIE_DEL_CAMINO + ALTO_DEL_ZOCALO` y la marca
     * `puente.medio.y + ALTO_DEL_ZOCALO`: LA CONSTANTE QUE SE ESTABA JUZGANDO ESTABA EN LOS DOS
     * LADOS y se cancelaba. Medido subiéndola a veinte personas de halo —50,86 de mundo, diez
     * veces la choza—: `verify:escritorio` y el typecheck salían en cero y de este guion caía
     * OTRA comprobación, no ésta. Un techo que sube con lo que se está midiendo no es un techo.
     *
     * Y EL TECHO NO PUEDE COLGAR DEL SUELO, que era la otra mitad del error. La marca no cuelga
     * del suelo: cuelga de la CALZADA, y una calzada es un puente que pasa POR ENCIMA de lo que
     * salva. Medido aquí mismo sobre las 864 aristas de los doce relieves, la calzada llega a ir
     * casi doce unidades por encima de la tierra del punto medio —eso es un puente haciendo su
     * trabajo, y el número lo dice la tercera comprobación de abajo—, así que un techo contado
     * desde la tierra o es falso o hay que dejarlo en el único relieve que lo cumple, que es
     * peor: con el relieve de la semilla 3, que es el que se medía, las 72 aristas dan el mismo
     * número clavado.
     *
     * EL TECHO BUENO ES LO QUE MIDE LA PIEZA QUE PUEDE IR ENCIMA: si la marca sube más que la
     * choza que marca, ha dejado de ser su suelo. Se mide del `.glb` —no se escribe— bajando
     * por los hijos del nodo con su traslación y su escala, y con la talla más pequeña que
     * `piezasDeAsentamiento` le da en los 54 vértices del delta.
     */
    const modeloDeLaChoza = PIEZAS_DE_COLOR[0] as string;
    const nodosDeLaChoza = (
      await new NodeIO().read(
        path.join(import.meta.dirname ?? __dirname, '..', 'modelos', 'tablero.glb'),
      )
    )
      .getRoot()
      .listNodes();
    const raizDeLaChoza = nodosDeLaChoza.find((n) => n.getName() === modeloDeLaChoza);
    let altoEnElPack = 0;
    if (raizDeLaChoza !== undefined) {
      const bajarPorLoAlto = (n: Node, ty: number, s: number): void => {
        const t = n.getTranslation();
        const e = n.getScale();
        const py = ty + (t[1] as number) * s;
        const ss = s * Math.abs(e[1] as number);
        for (const prim of n.getMesh()?.listPrimitives() ?? []) {
          const pos = prim.getAttribute('POSITION');
          if (pos === null) continue;
          const p = [0, 0, 0];
          for (let i = 0; i < pos.getCount(); i++) {
            pos.getElement(i, p);
            altoEnElPack = Math.max(altoEnElPack, py + (p[1] as number) * ss);
          }
        }
        for (const h of n.listChildren()) bajarPorLoAlto(h, py, ss);
      };
      bajarPorLoAlto(raizDeLaChoza, 0, 1);
    }
    let laTallaMasPequena = Infinity;
    for (const v of LOS_VERTICES) {
      for (const parte of piezasDeAsentamiento('poblado', 'blue', v)) {
        if (parte.modelo !== modeloDePieza('poblado', 'blue')) continue;
        laTallaMasPequena = Math.min(laTallaMasPequena, parte.talla);
      }
    }
    const ALTO_DE_LA_CHOZA = altoEnElPack * ESCALA_DEL_PACK * laTallaMasPequena;
    /* Y con el halo de la vacuna, que es la talla que hace falta para verlo caer. */
    const UN_HALO_DE_VEINTE = ALTURA_DE_UNA_PERSONA * 20;
    const flotan: string[] = [];
    const flotanConElHalo: string[] = [];
    let aristasMedidas = 0;
    let loQueSubeLaCalzada = 0;
    for (let semilla = 0; semilla < 12; semilla++) {
      const unRelieve = crearRelieve(islasDePrueba, semilla);
      for (const arista of LAS_ARISTAS) {
        const [uno, otro] = verticesDeArista(arista);
        if (uno === undefined || otro === undefined) continue;
        const a = puntoDeVertice(uno, RADIO_DE_COMARCA);
        const b = puntoDeVertice(otro, RADIO_DE_COMARCA);
        const puente = puenteEntre(a, b, (q: Punto) => unRelieve.alturaEn(q));
        const enElMapa = puntoDeArista(arista, RADIO_DE_COMARCA);
        const tierra = unRelieve.alturaEn({ x: enElMapa.x, y: enElMapa.y });
        aristasMedidas++;
        loQueSubeLaCalzada = Math.max(
          loQueSubeLaCalzada,
          puente.medio.y + SUPERFICIE_DEL_CAMINO - (tierra + AIRE_BAJO_LA_CALZADA),
        );
        const techo = puente.medio.y + ALTO_DE_LA_CHOZA;
        if (puente.medio.y + ALTO_DEL_ZOCALO > techo + 1e-6) {
          flotan.push(`${arista}: la marca a ${(puente.medio.y + ALTO_DEL_ZOCALO).toFixed(1)} y el techo en ${techo.toFixed(1)}`);
        }
        if (puente.medio.y + UN_HALO_DE_VEINTE > techo + 1e-6) flotanConElHalo.push(arista);
      }
    }
    comprobar(
      `y tampoco flota: la marca de la vereda cuelga de la calzada y sube ${ALTO_DEL_ZOCALO.toFixed(2)} sobre ella —media persona—, que es menos de lo que mide la choza que puede ir encima (${ALTO_DE_LA_CHOZA.toFixed(3)}, medida del .glb, y sale clavada la ALTURA_DE_UNA_CASA de escala.ts, que es de donde sale la escala del pack). Medido en las ${String(aristasMedidas)} aristas de doce relieves`,
      ALTO_DE_LA_CHOZA > 0 &&
        Math.abs(ALTO_DE_LA_CHOZA - ALTURA_DE_UNA_CASA) < 1e-3 &&
        flotan.length === 0 &&
        ALTO_DEL_ZOCALO < ALTO_DE_LA_CHOZA,
      { ALTO_DEL_ZOCALO, ALTO_DE_LA_CHOZA, ALTURA_DE_UNA_CASA, flotan: flotan.slice(0, 3) },
    );
    comprobar(
      `se ve fallar: con veinte personas de halo —${UN_HALO_DE_VEINTE.toFixed(1)} de mundo— la marca flota por encima de su propia choza en las ${String(flotanConElHalo.length)} de ${String(aristasMedidas)} medidas, que es lo que el techo de antes NO decía porque llevaba la misma constante en los dos lados`,
      aristasMedidas > 0 && flotanConElHalo.length === aristasMedidas,
      { deVeinte: UN_HALO_DE_VEINTE, techoDeLaChoza: ALTO_DE_LA_CHOZA, cuantas: flotanConElHalo.length },
    );
    comprobar(
      `y por eso el techo no se cuenta desde el suelo: la calzada llega a ir ${loQueSubeLaCalzada.toFixed(2)} por encima de la tierra que salva —un puente haciendo su trabajo—, así que un techo colgado del suelo daría por «flotante» a la marca de un puente alto`,
      loQueSubeLaCalzada > AIRE_BAJO_LA_CALZADA * 4,
      { loQueSubeLaCalzada, elAire: AIRE_BAJO_LA_CALZADA },
    );
  }

  // ── Y `delta.tsx` MONTA LA MANCHA DE CADA COLONO ─────────────────────────────

  /*
   * ═══ LO QUE EL MÓDULO DEL TERRITORIO NO PUEDE COMPRAR ═══
   *
   * Todo lo de arriba mide una mancha perfecta. Una mancha perfecta que nadie monta es
   * exactamente el verde falso de siempre con otro disfraz: este árbol ya lo ha pagado cuatro
   * veces con la marca de jugador. Así que se lee `delta.tsx` y se afirma que la monta, que la
   * monta UNA VEZ POR COLONO y no por pieza, y que las dos piezas ya NO llevan marca propia.
   *
   * Se lee por TEXTO, que es la técnica que este guion ya usa con los diez grupos de la mesa y
   * por la misma razón: dentro de un componente con `useFrame` no entra un guion de Node.
   */
  const fuenteDelDelta = fs.readFileSync(
    path.join(import.meta.dirname ?? __dirname, '..', 'delta.tsx'),
    'utf8',
  );
  const soloCodigoDelDelta = fuenteDelDelta
    .split('\n')
    .filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*|\*\/)/.test(l))
    .join('\n');

  comprobar(
    'el delta monta la mancha de cada colono, con su color y su malla',
    /<Mancha\b/.test(soloCodigoDelDelta) &&
      /color=\{color\}/.test(soloCodigoDelDelta) &&
      /malla=\{malla\}/.test(soloCodigoDelDelta),
    { hayMancha: /<Mancha\b/.test(soloCodigoDelDelta) },
  );

  /*
   * ═══ UNA POR COLONO Y NO UNA POR PIEZA, QUE ES LA DIFERENCIA ENTERA ═══
   *
   * Si la mancha se montara dentro de `Asentamiento` o de `PuenteDeJugador` volveríamos al
   * diseño de antes con otro nombre: cada pieza pintaría su trozo y donde dos se tocaran la
   * mezcla alfa se aplicaría dos veces, que es la costura que Miguel pidió quitar. Se compra por
   * los dos lados: que el `<Mancha>` NO esté dentro de esos dos cuerpos, y que se pinte
   * recorriendo una lista agrupada por color.
   */
  const cuerpoDe = (firma: string): string => {
    const empieza = soloCodigoDelDelta.indexOf(firma);
    if (empieza < 0) return '';
    const re = /^(?:function|const|export) /gm;
    re.lastIndex = empieza + firma.length;
    const siguiente = re.exec(soloCodigoDelDelta);
    return soloCodigoDelDelta.slice(empieza, siguiente === null ? soloCodigoDelDelta.length : siguiente.index);
  };
  const LOS_QUE_YA_NO_MARCAN = ['function Asentamiento(', 'function PuenteDeJugador('];
  const queSiguenMarcando = LOS_QUE_YA_NO_MARCAN.filter((f) => /<(Mancha|Zocalo)\b/.test(cuerpoDe(f)));
  comprobar(
    'y NINGUNA pieza monta marca propia: el territorio es de un colono y no de una choza',
    queSiguenMarcando.length === 0 && LOS_QUE_YA_NO_MARCAN.every((f) => cuerpoDe(f).length > 200),
    { queSiguenMarcando, miden: LOS_QUE_YA_NO_MARCAN.map((f) => cuerpoDe(f).length) },
  );
  comprobar(
    'se ve fallar: montando la mancha dentro del `Asentamiento` se vuelve al diseño de una por pieza',
    /<(Mancha|Zocalo)\b/.test(
      cuerpoDe('function Asentamiento(') + '      <Mancha color={pieza.color} malla={malla} />',
    ),
  );

  /*
   * ═══ Y NO SE REESCALA CON LA RUEDA, QUE ES LO OTRO QUE SE PIDIÓ ═══
   *
   * La marca de antes sacaba su tamaño de la distancia a la cámara y por eso encogía contra el
   * terreno al acercarse: medido, de 9,28 de mundo a 800 de cámara a 3,48 a 300, o sea a un
   * tercio, con tres comportamientos distintos según el zoom. Miguel lo vio jugando y lo llamó
   * un error: «debe ser fija en el tablero, no un elemento independiente».
   *
   * Se compra por donde no se puede esquivar: el memo que compone las manchas NO puede depender
   * de la cámara. Si alguien mete `estado.camera` ahí dentro, o vuelve a escalar la malla en un
   * `useFrame`, esta línea se pone roja. Y `mallaDelTerritorio` no recibe ninguna cámara: eso lo
   * garantiza su firma, que el typecheck ya vigila.
   */
  const memoDeLasManchas = cuerpoDe('  const manchas = useMemo(');
  comprobar(
    'la mancha se compone SIN la cámara: su tamaño es del mundo y no de la pantalla',
    memoDeLasManchas.length > 200 &&
      !/camera|camara|cámara|tallaDe/.test(memoDeLasManchas) &&
      /\[datos\.piezas, datos\.caminos, relieve\]/.test(memoDeLasManchas),
    { mide: memoDeLasManchas.length },
  );
  comprobar(
    'se ve fallar: metiéndole la cámara al memo de las manchas',
    /camera/.test(memoDeLasManchas + 'const talla = estado.camera.position;'),
  );

  /*
   * ═══ Y LA MANCHA NO SE APAGA DESDE FUERA ═══
   *
   * La lección que costó cuatro rondas: no vale prohibir la grafía con la que un revisor la
   * apagó, porque la lista de formas de apagar algo no acaba nunca. Lo que se compra es que el
   * `<Mancha>` cuelgue DIRECTAMENTE de donde se pinta y no de un envoltorio: cualquier `<group>`
   * en medio —con `visible`, con `scale`, con lo que sea— añade un eslabón y se ve.
   */
  const dondeSePinta = soloCodigoDelDelta.indexOf('{manchas.map(');
  const trozoDeLaMancha = dondeSePinta < 0 ? '' : soloCodigoDelDelta.slice(dondeSePinta, dondeSePinta + 220);
  comprobar(
    'la mancha se pinta directamente en el recorrido de los colonos, sin ningún envoltorio en medio',
    dondeSePinta >= 0 &&
      /\{manchas\.map\(\(\{ color, malla \}\) => \(\s*<Mancha /.test(trozoDeLaMancha),
    { trozo: trozoDeLaMancha.slice(0, 120) },
  );
  comprobar(
    'se ve fallar: envolviéndola en un grupo apagado',
    !/\{manchas\.map\(\(\{ color, malla \}\) => \(\s*<Mancha /.test(
      '{manchas.map(({ color, malla }) => (\n        <group visible={false}>\n          <Mancha ',
    ),
  );
}

// ---------------------------------------------------------------------------
paso('El caserío toma el color de su dueño: qué casas son de quién, y que el traslado de UV mueve lo suyo y sólo lo suyo');
// ---------------------------------------------------------------------------

/**
 * ═══ QUÉ FALLO VIGILA ESTE BLOQUE ═══
 *
 * El pueblo que `poblar.ts` reparte por las comarcas lleva puestos los cuatro colores de
 * jugador: la casa de adorno es la ROJA del pack —mismo téxel que el tejado del poblado del
 * colono rojo—, la iglesia la azul, la taberna la amarilla y el mercado la verde. Hasta esta
 * tanda eso era decorado ciego, y quien fundaba en azul veía su choza en medio de un pueblo
 * de casas rojas. Ahora el caserío que cae dentro del radio de una choza se repinta del color
 * de su dueño moviendo las UV, igual que las piezas de jugador.
 *
 * Lo que se compra aquí son las tres cosas que no se ven en una captura:
 *
 *   1. QUE EL REPARTO ES EL MISMO EN LOS TRES APARATOS. Es una regla geométrica con un
 *      desempate, y un desempate que dependiera del orden de la lista pintaría dos tableros
 *      distintos con los mismos datos.
 *   2. QUE EL TRASLADO MUEVE LO SUYO Y SÓLO LO SUYO. La fila 3 del atlas tiene ocho manchas y
 *      sólo cuatro son de jugador: mover la fila entera repintaría los 41 vértices de la
 *      herrería que están en la columna 4 y los 80 de la ermita que están en la 5.
 *   3. QUE UN TABLERO SIN PIEZAS SIGUE SIENDO EL PAISAJE DE SIEMPRE. Si el reparto se colara
 *      con la lista vacía, el mundo entero saldría de un color antes de empezar la partida.
 */
{
  const nodosDelTablero = (
    await new NodeIO().read(
      path.join(import.meta.dirname ?? __dirname, '..', 'modelos', 'tablero.glb'),
    )
  )
    .getRoot()
    .listNodes();

  const TERRENOS_DE_RIBERAS = ['carrizal', 'marisma', 'salina', 'vega', 'cantil', 'duna'];
  const hexesDelDelta = mallaDeRadio(2);
  const islasDelDelta = hexesDelDelta.map((hex, i) => ({
    hex,
    terreno: TERRENOS_DE_RIBERAS[i % TERRENOS_DE_RIBERAS.length] as string,
  }));
  const todosLosVerticesDelDelta = verticesDe(hexesDelDelta) as readonly string[];

  // ── 1. El radio: es la apotema, y es la mitad de lo más cerca que caben dos chozas ──

  /*
   * NO SE COMPARA CONTRA UN NÚMERO ESCRITO. Se mide sobre la malla de verdad cuál es la menor
   * distancia entre dos vértices donde se puede fundar a la vez —o sea, no vecinos— y se exige
   * que el radio sea exactamente su mitad. Así, el día que cambie el radio de la comarca o la
   * convención de la malla, esto se mueve solo o se cae; escrito como «65,6» se quedaría.
   */
  let masCercaLegal = Infinity;
  let masCercaVecinos = Infinity;
  for (const uno of todosLosVerticesDelDelta) {
    const vecinos = new Set<string>(verticesVecinos(uno as never) as readonly string[]);
    const a = puntoDeVertice(uno as never, RADIO_DE_COMARCA);
    for (const otro of todosLosVerticesDelDelta) {
      if (uno === otro) continue;
      const b = puntoDeVertice(otro as never, RADIO_DE_COMARCA);
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (vecinos.has(otro)) masCercaVecinos = Math.min(masCercaVecinos, d);
      else masCercaLegal = Math.min(masCercaLegal, d);
    }
  }
  comprobar(
    `el radio del caserío (${RADIO_DEL_CASERIO.toFixed(2)}) es EXACTAMENTE la mitad de lo más cerca que caben dos chozas legales (${masCercaLegal.toFixed(2)}): con eso sus discos se tocan y no se solapan`,
    Math.abs(RADIO_DEL_CASERIO * 2 - masCercaLegal) < 1e-6,
    { RADIO_DEL_CASERIO, masCercaLegal, masCercaVecinos },
  );
  comprobar(
    `y es la APOTEMA de la comarca (${((RADIO_DE_COMARCA * Math.sqrt(3)) / 2).toFixed(2)}), que es el mismo número por el otro lado de la misma malla`,
    Math.abs(RADIO_DEL_CASERIO - (RADIO_DE_COMARCA * Math.sqrt(3)) / 2) < 1e-9,
    RADIO_DEL_CASERIO,
  );
  /*
   * LA VACUNA DEL RADIO: con el radio puesto a la distancia entre vértices VECINOS —que es lo
   * que pediría quien quisiera un pueblo más grande sin mirar la malla— dos chozas legales sí
   * se solapan, y entonces hay edificios a tiro de dos dueños. Se afirma que ese radio de
   * mentira rompe la propiedad, no que la nuestra la cumple: sin esto, «no hay solapes» sería
   * verde también con el radio a cero.
   */
  comprobar(
    'se ve fallar: con el radio subido a la distancia entre vértices vecinos, dos chozas legales SÍ se solaparían',
    masCercaVecinos * 2 > masCercaLegal,
    { masCercaVecinos, masCercaLegal },
  );

  // ── 2. El reparto sobre mundos de verdad ──

  /** Los edificios del caserío de un mundo, con su sitio en el plano de la malla. */
  const caserioDelMundo = (semilla: number): Array<{ llave: string; modelo: string; donde: Punto }> => {
    const relieve = crearRelieve(islasDelDelta, semilla);
    const salida: Array<{ llave: string; modelo: string; donde: Punto }> = [];
    for (const isla of islasDelDelta) {
      for (const t of relieve.subteselasDe(isla.hex)) {
        if (t.agua === CAUCE || t.agua === CUERPO) continue;
        if (t.orilla !== 0) continue;
        for (const puesto of queVaEn(t, isla.terreno)) {
          if (!EDIFICIOS_DEL_CASERIO.has(puesto.modelo)) continue;
          salida.push({
            /* La MISMA llave con la que `delta.tsx` agrupa: la comarca. */
            llave: `${String(isla.hex.q)},${String(isla.hex.r)}`,
            modelo: puesto.modelo,
            donde: { x: t.centro.x + puesto.donde.x, y: t.centro.y + puesto.donde.y },
          });
        }
      }
    }
    return salida;
  };

  /*
   * LA OCUPACIÓN MÁXIMA: todas las chozas que caben en el delta respetando la regla de
   * distancia. Es el peor caso para el reparto —el que más disputas tendría y el que más
   * geometrías teñidas fabrica— y por eso se mide con ése y no con dos colonos.
   */
  const laOcupacionMaxima: string[] = [];
  for (const v of todosLosVerticesDelDelta) {
    if ((verticesVecinos(v as never) as readonly string[]).some((n) => laOcupacionMaxima.includes(n))) continue;
    laOcupacionMaxima.push(v);
  }
  const fundadasDelMaximo: Fundacion[] = laOcupacionMaxima.map((v, i) => ({
    vertice: v,
    color: COLORES_DE_JUGADOR[i % COLORES_DE_JUGADOR.length] as string,
    punto: puntoDeVertice(v as never, RADIO_DE_COMARCA),
  }));
  comprobar(
    `en el delta de radio 2 caben ${String(laOcupacionMaxima.length)} chozas legales, que es el peor caso con el que se mide todo lo de abajo`,
    laOcupacionMaxima.length === 27,
    laOcupacionMaxima.length,
  );

  const SEMILLAS_DEL_CASERIO = 12;
  let edificiosMedidos = 0;
  let repintados = 0;
  let disputados = 0;
  let disputadosConVecinos = 0;
  let discrepanciasDeOrden = 0;
  const porChozaYMundo = new Map<string, number>();
  const alReves = [...fundadasDelMaximo].reverse();
  /* Las chozas de doce vértices SEGUIDOS, o sea vecinos: lo que daría un juego sin regla de distancia. */
  const pegadas: Fundacion[] = todosLosVerticesDelDelta.slice(0, 12).map((v, i) => ({
    vertice: v,
    color: COLORES_DE_JUGADOR[i % COLORES_DE_JUGADOR.length] as string,
    punto: puntoDeVertice(v as never, RADIO_DE_COMARCA),
  }));
  for (let semilla = 0; semilla < SEMILLAS_DEL_CASERIO; semilla++) {
    for (const v of laOcupacionMaxima) porChozaYMundo.set(`${String(semilla)}|${v}`, 0);
    for (const edificio of caserioDelMundo(semilla)) {
      edificiosMedidos++;
      const dueno = duenoDelCaserio(edificio.donde, fundadasDelMaximo);
      if (dueno !== null) {
        repintados++;
        const cual = `${String(semilla)}|${dueno.vertice}`;
        porChozaYMundo.set(cual, (porChozaYMundo.get(cual) ?? 0) + 1);
      }
      /* ¿Está a tiro de dos? Eso es lo que el radio promete que no pasa. */
      const aTiro = fundadasDelMaximo.filter(
        (f) => Math.hypot(edificio.donde.x - f.punto.x, edificio.donde.y - f.punto.y) <= RADIO_DEL_CASERIO,
      ).length;
      if (aTiro > 1) disputados++;
      const conVecinos = pegadas.filter(
        (f) => Math.hypot(edificio.donde.x - f.punto.x, edificio.donde.y - f.punto.y) <= RADIO_DEL_CASERIO,
      ).length;
      if (conVecinos > 1) disputadosConVecinos++;
      /* Y el mismo edificio con la lista al revés tiene que salir del mismo dueño. */
      const otro = duenoDelCaserio(edificio.donde, alReves);
      if ((dueno === null) !== (otro === null) || (dueno !== null && otro !== null && dueno.vertice !== otro.vertice)) {
        discrepanciasDeOrden++;
      }
    }
  }
  comprobar(
    `se han medido ${String(edificiosMedidos)} edificios de caserío en ${String(SEMILLAS_DEL_CASERIO)} mundos: si esto fuera cero, todo lo de abajo pasaría por vacío`,
    edificiosMedidos > 3000,
    edificiosMedidos,
  );
  comprobar(
    `con la ocupación máxima NINGÚN edificio queda a tiro de dos chozas: ${String(disputados)} de ${String(edificiosMedidos)}`,
    disputados === 0,
    { disputados, edificiosMedidos },
  );
  /*
   * LA VACUNA DEL SOLAPE: con las chozas puestas en vértices VECINOS —ilegal en Riberas, pero
   * la escena pinta el delta que le manden— sí hay edificios a tiro de dos, y ahí es donde la
   * regla de cercanía y su desempate hacen falta de verdad. Sin esta comprobación, «cero
   * disputas» sería verde aunque `duenoDelCaserio` no supiera resolver ninguna.
   */
  comprobar(
    `se ve fallar: con las chozas en vértices vecinos hay ${String(disputadosConVecinos)} edificios a tiro de dos, y ahí la regla de cercanía es la que decide`,
    disputadosConVecinos > 0,
    disputadosConVecinos,
  );
  comprobar(
    `el reparto NO depende del orden de la lista: los ${String(edificiosMedidos)} edificios dan el mismo dueño con las fundaciones al derecho y al revés`,
    discrepanciasDeOrden === 0,
    discrepanciasDeOrden,
  );

  /*
   * SE CUENTA POR MUNDO Y POR CHOZA, no sumando los doce mundos: sumados, la media saldría doce
   * veces mayor y la comprobación de «ninguna se queda sin pueblo» daría cero siempre, porque
   * basta con que UNO de los doce le diera casas. Lo que hay que saber es cuántas tiene una
   * choza en UN tablero.
   */
  const cuantasPorChoza = [...porChozaYMundo.values()].sort((a, b) => a - b);
  const mediaPorChoza = cuantasPorChoza.reduce((a, b) => a + b, 0) / cuantasPorChoza.length;
  const sinNinguna = cuantasPorChoza.filter((n) => n === 0).length;
  /*
   * ═══ EL NÚMERO QUE DECIDIÓ EL RADIO, ESCRITO PARA QUE NO SE PUEDA BAJAR A CIEGAS ═══
   *
   * Con la mitad de la distancia entre vértices vecinos —37,9, el candidato cómodo— la media
   * caía a 4,4 y 40 de 324 chozas se quedaban sin UNA sola casa de su color; contado en el
   * banco, los píxeles rojos alrededor de la choza azul sólo bajaban un 43 % y quedaban dos
   * tejados rojos pegados a la pieza. Con éste la media es 12,4 y bajan un 62 %. Se exige el
   * rango, no el número exacto: lo que no puede pasar es que el pueblo de alguien sea una
   * casa suelta.
   */
  comprobar(
    `cada choza se lleva ${mediaPorChoza.toFixed(1)} edificios de media (mediana ${String(cuantasPorChoza[Math.floor(cuantasPorChoza.length / 2)])}, máximo ${String(cuantasPorChoza[cuantasPorChoza.length - 1])}) — un pueblo, no una casa suelta`,
    mediaPorChoza >= 8 && mediaPorChoza <= 20,
    { mediaPorChoza, sinNinguna, de: cuantasPorChoza.length },
  );
  comprobar(
    `${String(sinNinguna)} de ${String(cuantasPorChoza.length)} chozas no se llevan ninguna —el pueblo de su comarca cae lejos— y ésas se quedan sólo con su zócalo: por eso el zócalo no sobra`,
    sinNinguna > 0 && sinNinguna < cuantasPorChoza.length / 4,
    { sinNinguna, de: cuantasPorChoza.length },
  );
  comprobar(
    `se repintan ${String(repintados)} de ${String(edificiosMedidos)} edificios en el peor caso: ni ninguno ni todos`,
    repintados > edificiosMedidos * 0.5 && repintados < edificiosMedidos,
    { repintados, edificiosMedidos },
  );
  /*
   * ═══ EL PRECIO EN GRUPOS DE DIBUJO, QUE ES LO QUE SE PAGA EN EL MÓVIL ═══
   *
   * `delta.tsx` agrupa el caserío por comarca y modelo —`${llave}|${modelo}`— y cada grupo se
   * dibuja de una vez. Teñir mete el COLOR en esa llave, así que un pueblo con dos dueños
   * distintos dentro de la misma comarca pasa a ser dos grupos donde había uno. Ése es todo el
   * coste del arreglo, y hasta ahora no lo compraba nadie: en la cabecera de `caserio.ts` había
   * un número escrito («129,5 pasan a 221») que era el PEOR de los doce mundos puesto donde se
   * lee la media, y nadie lo iba a notar porque ninguna comprobación lo tocaba.
   *
   * Se rehace aquí con la misma llave que usa la escena, sobre los mismos doce mundos y con la
   * ocupación máxima —27 chozas de cuatro colores, que es el peor caso—. Y se afirman las dos
   * cosas que importan, porque cada una tapa un fallo distinto:
   *
   *   · que SUBE. Si no subiera, el color no estaría entrando en la llave y no se estaría
   *     repintando nada — que es la clase de cero que se lee como vigilado.
   *   · que NO se multiplica por los cuatro colores. Lo que lo impide es que la tabla teñida sea
   *     una por COLOR y no una por choza: con un grupo por fundación —que es lo que sale de
   *     teñir dentro de cada asentamiento— la cuenta se va a 228,2.
   */
  const laLlaveDeLaComarca = (semilla: number, porFundacion: boolean, quienes: Fundacion[]): number => {
    const grupos = new Set<string>();
    for (const edificio of caserioDelMundo(semilla)) {
      const dueno = duenoDelCaserio(edificio.donde, quienes);
      const nombre =
        dueno === null
          ? edificio.modelo
          : `${edificio.modelo}-${porFundacion ? dueno.vertice : dueno.color}`;
      grupos.add(`${edificio.llave}|${nombre}`);
    }
    return grupos.size;
  };
  let gruposSinPiezas = 0;
  let gruposConCuatro = 0;
  let gruposPorFundacion = 0;
  let elPeorMundo = 0;
  for (let semilla = 0; semilla < SEMILLAS_DEL_CASERIO; semilla++) {
    gruposSinPiezas += laLlaveDeLaComarca(semilla, false, []);
    const conCuatro = laLlaveDeLaComarca(semilla, false, fundadasDelMaximo);
    gruposConCuatro += conCuatro;
    elPeorMundo = Math.max(elPeorMundo, conCuatro);
    gruposPorFundacion += laLlaveDeLaComarca(semilla, true, fundadasDelMaximo);
  }
  const mediaSinPiezas = gruposSinPiezas / SEMILLAS_DEL_CASERIO;
  const mediaConCuatro = gruposConCuatro / SEMILLAS_DEL_CASERIO;
  const mediaPorFundacion = gruposPorFundacion / SEMILLAS_DEL_CASERIO;
  /** El mismo juez para los tres casos: sube, pero no se multiplica por los colores. */
  const cabeElPrecio = (media: number): boolean =>
    mediaSinPiezas > 0 && media > mediaSinPiezas * 1.2 && media < mediaSinPiezas * 1.7;
  comprobar(
    `el precio de teñir el caserío está acotado y medido: ${mediaSinPiezas.toFixed(1)} grupos de dibujo de media pasan a ${mediaConCuatro.toFixed(1)} con cuatro colores jugando —un ${(((mediaConCuatro / mediaSinPiezas) - 1) * 100).toFixed(0)} % más, y ${String(elPeorMundo)} en el peor de los ${String(SEMILLAS_DEL_CASERIO)} mundos—, no por cuatro`,
    cabeElPrecio(mediaConCuatro),
    { mediaSinPiezas, mediaConCuatro, elPeorMundo },
  );
  comprobar(
    `se ve fallar por los dos lados, y con el mismo juez: sin el color en la llave la cuenta se queda en ${mediaSinPiezas.toFixed(1)} —no se estaría repintando nada— y con un grupo por FUNDACIÓN en vez de por color se va a ${mediaPorFundacion.toFixed(1)}; el juez rechaza las dos y sólo acepta la de verdad`,
    !cabeElPrecio(mediaSinPiezas) && !cabeElPrecio(mediaPorFundacion) && cabeElPrecio(mediaConCuatro),
    { mediaSinPiezas, mediaConCuatro, mediaPorFundacion, techo: mediaSinPiezas * 1.7 },
  );


  // ── 3. Sin piezas no se repinta nada, y fuera del radio tampoco ──

  /*
   * EL PAISAJE DE SIEMPRE. Es la mitad que se olvida: un tablero recién repartido —o el de un
   * juego que no tenga piezas de color— tiene que salir exactamente igual que antes de esta
   * tanda. Se comprueba sobre los edificios de verdad, no sobre uno inventado.
   */
  const conListaVacia = caserioDelMundo(3).filter((e) => duenoDelCaserio(e.donde, []) !== null);
  comprobar(
    'sin ninguna choza fundada NINGÚN edificio tiene dueño: el tablero sin piezas sigue teniendo su caserío rojo de siempre',
    conListaVacia.length === 0,
    conListaVacia.length,
  );
  const unaChoza: Fundacion[] = [{ vertice: 'v:a', color: 'blue', punto: { x: 0, y: 0 } }];
  comprobar(
    'un edificio justo fuera del radio no es de nadie, y justo dentro sí: el corte está donde dice',
    duenoDelCaserio({ x: RADIO_DEL_CASERIO + 0.01, y: 0 }, unaChoza) === null &&
      duenoDelCaserio({ x: RADIO_DEL_CASERIO - 0.01, y: 0 }, unaChoza) !== null,
    RADIO_DEL_CASERIO,
  );

  // ── 4. El empate, que con las reglas de Riberas no pasa pero está escrito ──

  /*
   * DOS CHOZAS A LA MISMA DISTANCIA EXACTA. No se puede provocar con la malla —los discos de
   * dos chozas legales se tocan y no se solapan— así que se provoca a mano, que es lo que hace
   * falta para SABER qué hace la rama. Se pide las dos veces con la lista en orden distinto: si
   * el desempate fuera «la primera que encuentre», estas dos llamadas darían dueños distintos y
   * el mismo tablero se pintaría de dos maneras.
   */
  const empatadas: Fundacion[] = [
    { vertice: 'v:zzz', color: 'red', punto: { x: -10, y: 0 } },
    { vertice: 'v:aaa', color: 'blue', punto: { x: 10, y: 0 } },
  ];
  const enUnOrden = duenoDelCaserio({ x: 0, y: 0 }, empatadas);
  const enElOtro = duenoDelCaserio({ x: 0, y: 0 }, [...empatadas].reverse());
  comprobar(
    'con dos chozas a la misma distancia exacta gana la de la llave menor, y da lo mismo en los dos órdenes de la lista',
    enUnOrden !== null && enElOtro !== null && enUnOrden.vertice === 'v:aaa' && enElOtro.vertice === 'v:aaa',
    { enUnOrden: enUnOrden?.vertice, enElOtro: enElOtro?.vertice },
  );
  /*
   * Y LA VACUNA DEL DESEMPATE: movida una de las dos un pelo, gana la CERCANÍA y no la llave.
   * Sin esto, un `duenoDelCaserio` que devolviera siempre la de llave menor —ignorando la
   * distancia— pasaría la comprobación de arriba.
   */
  const casiEmpatadas: Fundacion[] = [
    { vertice: 'v:zzz', color: 'red', punto: { x: -9, y: 0 } },
    { vertice: 'v:aaa', color: 'blue', punto: { x: 10, y: 0 } },
  ];
  comprobar(
    'se ve fallar: apartando una de las dos un pelo, gana la CERCANÍA y no la llave',
    duenoDelCaserio({ x: 0, y: 0 }, casiEmpatadas)?.vertice === 'v:zzz',
    duenoDelCaserio({ x: 0, y: 0 }, casiEmpatadas)?.vertice,
  );

  // ── 5. El traslado de UV: mueve lo suyo, y sólo lo suyo ──

  /*
   * ═══ LA LISTA DE EDIFICIOS SE DERIVA DE `poblar.ts` Y NO SE ESCRIBE ═══
   *
   * `EDIFICIOS_DEL_CASERIO` sale de `PUEBLO` y `OFICIO` unidos. Son CATORCE, y los dieciséis que
   * el bloque de arriba mide contra el atlas incluyen dos que no planta nadie (`acena`, `vigia`).
   * Escrita a mano, un edificio nuevo en `PUEBLO` se quedaría rojo dentro del pueblo de un
   * jugador azul; derivada, entra solo.
   */
  comprobar(
    `los edificios que se repintan salen de poblar.ts y son ${String(EDIFICIOS_DEL_CASERIO.size)}: la lista no está escrita a mano`,
    EDIFICIOS_DEL_CASERIO.size === 14 &&
      EDIFICIOS_DEL_CASERIO.has('casa') &&
      EDIFICIOS_DEL_CASERIO.has('mercado') &&
      !EDIFICIOS_DEL_CASERIO.has('acena'),
    [...EDIFICIOS_DEL_CASERIO],
  );
  comprobar(
    'todos ellos están dentro del .glb, o lo de abajo mediría cero vértices y pasaría por vacío',
    [...EDIFICIOS_DEL_CASERIO].every((n) => nodosDelTablero.some((x) => x.getName() === n)),
    [...EDIFICIOS_DEL_CASERIO].filter((n) => !nodosDelTablero.some((x) => x.getName() === n)),
  );

  /** Las UV de un modelo dentro del `.glb`, todas, sin filtrar. */
  const uvDe = (nombre: string): Array<[number, number]> => {
    const nodo = nodosDelTablero.find((n) => n.getName() === nombre);
    const salida: Array<[number, number]> = [];
    if (nodo === undefined) return salida;
    const bajar = (x: Node): void => {
      for (const prim of x.getMesh()?.listPrimitives() ?? []) {
        const uv = prim.getAttribute('TEXCOORD_0');
        if (uv === null) continue;
        const st = [0, 0];
        for (let i = 0; i < uv.getCount(); i++) {
          uv.getElement(i, st);
          salida.push([st[0] as number, st[1] as number]);
        }
      }
      for (const h of x.listChildren()) bajar(h);
    };
    bajar(nodo);
    return salida;
  };

  /*
   * ═══ UNA SOLA COLUMNA DE JUGADOR POR EDIFICIO, QUE ES LO QUE HACE EL TRASLADO POSIBLE ═══
   *
   * El salto se calcula por vértice desde la columna en la que ese vértice está. Si un edificio
   * pintara en DOS de las cuatro columnas de jugador —tejado rojo y puerta amarilla, pongamos—
   * las dos irían a parar a la misma celda y el edificio saldría de un color plano. Medido: los
   * catorce pintan en una sola. La herrería, el taller y la ermita tienen ADEMÁS vértices en las
   * columnas 4 y 5 de esa misma fila, que no son de nadie y no se tocan — ver abajo.
   */
  const conDosColumnas = [...EDIFICIOS_DEL_CASERIO]
    .map((nombre) => {
      const cuantas = new Map<number, number>();
      for (const [u, v] of uvDe(nombre)) {
        if (Math.floor(v * FILAS_DEL_ATLAS) !== 3) continue;
        const columna = Math.floor(u * COLUMNAS_DEL_ATLAS);
        if (!COLUMNAS_DE_JUGADOR.has(columna)) continue;
        cuantas.set(columna, (cuantas.get(columna) ?? 0) + 1);
      }
      return { nombre, suyas: [...cuantas.entries()] };
    })
    .filter(({ suyas }) => suyas.length !== 1);
  comprobar(
    'cada edificio del caserío pinta su color de jugador en UNA sola de las cuatro columnas: con dos, el traslado sería ambiguo y el edificio saldría de un color plano',
    conDosColumnas.length === 0,
    conDosColumnas.map(
      (c) => `${c.nombre}: ${c.suyas.map(([col, n]) => `columna ${String(col)} × ${String(n)}`).join(', ')}`,
    ),
  );

  /*
   * ═══ Y EL TRASLADO, HECHO SOBRE LAS UV DE VERDAD ═══
   *
   * Se recorren los vértices de cada edificio dentro del `.glb`, se les aplica `saltoAlColor` y
   * se comprueba que TODOS los que llevaban un color de jugador acaban en la columna del color
   * pedido — y que ninguno de los otros se ha movido un solo téxel.
   */
  const malLlevados: string[] = [];
  let verticesTrasladados = 0;
  for (const nombre of EDIFICIOS_DEL_CASERIO) {
    const suyas = uvDe(nombre);
    for (const color of COLORES_DE_JUGADOR) {
      const destino = COLUMNA_DEL_COLOR[color] as number;
      for (const [u, v] of suyas) {
        if (!esDeUnColorDeJugador(u, v)) continue;
        verticesTrasladados++;
        const llega = Math.floor((u + saltoAlColor(u, color)) * COLUMNAS_DEL_ATLAS);
        if (llega !== destino) malLlevados.push(`${nombre}/${color}: llega a ${String(llega)}`);
      }
    }
  }
  comprobar(
    `los ${String(verticesTrasladados)} vértices de color de los catorce edificios acaban EXACTAMENTE en la columna del color pedido, para los cuatro colores`,
    verticesTrasladados > 0 && malLlevados.length === 0,
    [...new Set(malLlevados)],
  );

  /*
   * ═══ Y LO QUE SE QUEDA QUIETO, QUE ES LA MITAD QUE NO SE VE ═══
   *
   * La guarda del traslado es `esDeUnColorDeJugador`, así que lo que hay que medir es que esa
   * guarda dice que NO a los vértices de la fila del color que están en las cuatro columnas de
   * la derecha. Son pocos y son concretos —medidos sobre el `.glb`— y por eso se nombran uno a
   * uno: si el pack los moviera de sitio, esto se pone rojo y le cuenta a quien lo lea que hay
   * edificios con dos manchas en esa fila.
   */
  const LOS_QUE_NO_SON_DE_NADIE: ReadonlyArray<[string, number, number]> = [
    ['herreria', 4, 41],
    ['taller', 4, 18],
    ['ermita', 5, 80],
  ];
  const quietosMalContados = LOS_QUE_NO_SON_DE_NADIE.filter(([nombre, columna, cuantos]) => {
    const enEsaColumna = uvDe(nombre).filter(
      ([u, v]) => Math.floor(v * FILAS_DEL_ATLAS) === 3 && Math.floor(u * COLUMNAS_DEL_ATLAS) === columna,
    );
    return enEsaColumna.length !== cuantos || enEsaColumna.some(([u, v]) => esDeUnColorDeJugador(u, v));
  });
  comprobar(
    'ningún vértice que NO sea de un color de jugador entra en el traslado: los 41 de la herrería y los 18 del taller en la columna 4, y los 80 de la ermita en la 5, siguen ahí y la guarda dice que no a los tres',
    quietosMalContados.length === 0,
    quietosMalContados.map(([n]) => n),
  );
  /*
   * LA VACUNA DEL TRASLADO: `esDeUnColorDeJugador` tiene que decir que NO a las cuatro columnas
   * de la derecha de esa misma fila. Sin ella, «no se mueve lo que no es suyo» sería verde con
   * una función que dijera que no a todo — y entonces tampoco se movería lo que sí es.
   */
  const laFilaDelColor = 3.5 / FILAS_DEL_ATLAS;
  const columnasQueAcepta = [0, 1, 2, 3, 4, 5, 6, 7].filter((c) =>
    esDeUnColorDeJugador((c + 0.5) / COLUMNAS_DEL_ATLAS, laFilaDelColor),
  );
  comprobar(
    'se ve fallar: esDeUnColorDeJugador acepta las cuatro columnas de jugador de la fila 3 y rechaza las otras cuatro',
    columnasQueAcepta.join(',') === '0,1,2,3',
    columnasQueAcepta,
  );
  const otrasFilas = [0, 1, 2].filter((f) =>
    esDeUnColorDeJugador(0.5 / COLUMNAS_DEL_ATLAS, (f + 0.5) / FILAS_DEL_ATLAS),
  );
  comprobar(
    'y rechaza las otras tres filas del atlas, que son el suelo, las maderas y las piedras',
    otrasFilas.length === 0,
    otrasFilas,
  );

  /*
   * ═══ EL OBJETIVO, MEDIDO: LA CASA DEL AZUL ACABA EN EL TÉXEL DEL POBLADO DEL AZUL ═══
   *
   * Es la frase con la que llegó el encargo, vuelta comprobación: después del traslado, el
   * tejado de una casa del caserío de un colono y el tejado de su poblado son EL MISMO TÉXEL
   * —distancia cero— y están a la distancia declarada de los otros tres colores.
   */
  const columnaTrasElSalto = (nombre: string, color: string): number | null => {
    for (const [u, v] of uvDe(nombre)) {
      if (!esDeUnColorDeJugador(u, v)) continue;
      return Math.floor((u + saltoAlColor(u, color)) * COLUMNAS_DEL_ATLAS);
    }
    return null;
  };
  const desalineados = COLORES_DE_JUGADOR.filter(
    (color) => columnaTrasElSalto('casa', color) !== columnaTrasElSalto('poblado', color),
  );
  comprobar(
    'después del traslado, la casa del caserío de un colono apunta a la MISMA columna del atlas que su poblado: el tejado de su pueblo y el de su choza son el mismo téxel',
    desalineados.length === 0 && columnaTrasElSalto('casa', 'blue') !== null,
    desalineados,
  );
  const cruzadosDelCaserio = COLORES_DE_JUGADOR.filter(
    (color, i) =>
      columnaTrasElSalto('casa', color) ===
      columnaTrasElSalto('poblado', COLORES_DE_JUGADOR[(i + 1) % COLORES_DE_JUGADOR.length] as string),
  );
  comprobar(
    'se ve fallar: cruzando cada color con el del siguiente, los cuatro apuntan a columnas distintas — la medida no se está leyendo a sí misma',
    cruzadosDelCaserio.length === 0,
    cruzadosDelCaserio,
  );

  // ── 6. Lo que la escena hace con esto, leído del texto de `delta.tsx` ──

  /*
   * Por lo de siempre: dentro de un componente con `useMemo` y JSX no entra un guion de Node, y
   * lo que hay que vigilar aquí es ESTRUCTURA — que el plan del mundo no dependa de las piezas,
   * que las geometrías teñidas se fabriquen sólo para los colores en juego, y que se suelten.
   */
  const fuenteDelCaserio = fs.readFileSync(
    path.join(import.meta.dirname ?? __dirname, '..', 'delta.tsx'),
    'utf8',
  );
  const codigoDelCaserio = fuenteDelCaserio
    .split('\n')
    .filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*|\*\/)/.test(l))
    .join('\n');
  const trozoDelCodigo = (desde: string, hasta: string): string => {
    const a = codigoDelCaserio.indexOf(desde);
    if (a < 0) return '';
    const b = codigoDelCaserio.indexOf(hasta, a);
    return codigoDelCaserio.slice(a, b < 0 ? codigoDelCaserio.length : b);
  };
  const elPlan = trozoDelCodigo('const plan = useMemo(', 'const suelos = useMemo(');
  const elPueblo = trozoDelCodigo('const pueblos = useMemo(', 'const coloresEnJuego');
  const elTenido = trozoDelCodigo('const caserioTenido = useMemo(', 'const seca = useMemo(');
  /*
   * SE PIDE LA LÍNEA ENTERA Y NO «que aparezca `EDIFICIOS_DEL_CASERIO`», y eso es una lección
   * pagada: con el `test` flojo, anteponerle un `false &&` a la condición dejaba el caserío otra
   * vez dentro de `cosas` —o sea sin color de dueño— y el comprobador seguía en verde, porque el
   * nombre seguía escrito. Un `includes` sobre un nombre no distingue una rama viva de una
   * muerta.
   */
  comprobar(
    'el plan del mundo APARTA los edificios del caserío en vez de meterlos en `cosas`, y la rama está VIVA: si no, el color iría dentro del plan y las dos mil setecientas teselas se recalcularían con cada choza',
    /\n\s*if \(EDIFICIOS_DEL_CASERIO\.has\(puesto\.modelo\)\) \{\n/.test(elPlan) &&
      /\n\s*caserio\.push\(\{ llave, modelo: puesto\.modelo, puesta \}\);\n/.test(elPlan) &&
      /\n\s*empuja\(cosas, `\$\{llave\}\|\$\{puesto\.modelo\}`, puesta\);\n/.test(elPlan),
    elPlan.length,
  );

  /*
   * ═══ Y EL TRASLADO SÓLO TOCA LO QUE ES DE UN COLOR, LEÍDO DEL CÓDIGO ═══
   *
   * `deOtroColor` es la única función de la escena que escribe UV de color, y lo hace dentro de
   * un bucle sobre TODOS los vértices de la malla: lo único que separa «se repinta el tejado» de
   * «se repinta el edificio entero de un color plano» es la guarda de una línea. Quitarla no
   * rompe ninguna cuenta —`saltoAlColor` sigue devolviendo lo mismo— y no la caza ninguna otra
   * comprobación de este guion, porque esa función vive en un fichero que importa `three`. Se
   * mide el TEXTO: la escritura tiene que ir justo detrás de su guarda.
   */
  const elTinte = trozoDelCodigo('function deOtroColor(', '/** Una copia colocada');
  comprobar(
    'el traslado de color salta los vértices que no son de ningún jugador ANTES de escribirlos: sin esa guarda, el edificio entero saldría de un color plano y ninguna otra comprobación lo vería',
    /if \(!esDeUnColorDeJugador\(u, suyaUv\.getY\(i\)\)\) continue;\n\s*suyaUv\.setX\(i, u \+ saltoAlColor\(u, color\)\);/.test(elTinte),
    elTinte.length,
  );
  comprobar(
    'y decide si hace falta clonar mirando esa misma guarda, no el nombre del color: por eso una iglesia azul pedida en azul es la geometría del catálogo y no un clon',
    /esDeUnColorDeJugador\(u, uv\.getY\(i\)\) && saltoAlColor\(u, color\) !== 0/.test(elTinte),
    elTinte.length,
  );
  comprobar(
    'y el plan NO depende de las piezas: sus dependencias siguen siendo las islas, el relieve y la red de caminos',
    elPlan.length > 0 && /\}, \[datos\.islas, relieve, red\]\);/.test(elPlan),
    elPlan.slice(-160),
  );
  comprobar(
    'el reparto vive en un memo aparte que SÍ depende de las piezas, y llama a `duenoDelCaserio` en vez de decidir por su cuenta',
    /duenoDelCaserio\(/.test(elPueblo) && /\}, \[plan\.caserio, datos\.piezas\]\);/.test(elPueblo),
    elPueblo.slice(-160),
  );
  comprobar(
    'las geometrías teñidas se fabrican SÓLO para los colores en juego —fabricar los cuatro serían 4,46 MB de clones en un tablero donde nadie ha construido— y se apuntan para soltarlas',
    elTenido.length > 0 && /coloresEnJuego/.test(elTenido) && /propias/.test(elTenido) && !/COLORES_DE_JUGADOR/.test(elTenido),
    elTenido.length,
  );
  comprobar(
    'y hay quien las suelte al cambiar de colores: un dispose colgado de `caserioTenido`',
    /for \(const geometria of caserioTenido\.propias\) geometria\.dispose\(\);/.test(codigoDelCaserio),
    /caserioTenido\.propias/.test(codigoDelCaserio),
  );
  comprobar(
    'y lo que se pinta busca primero la variante teñida y cae en el catálogo de siempre para un edificio sin dueño',
    /caserioTenido\.tabla\.get\(nombre\) \?\? aplanados\.get\(nombre\)/.test(codigoDelCaserio),
    /caserioTenido\.tabla\.get/.test(codigoDelCaserio),
  );

  /*
   * ═══ CUÁNTO SE CLONA DE VERDAD, Y POR QUÉ NO SE CLONA TODO ═══
   *
   * Un clon lleva posición, normal y UV en `float32`: 32 bytes por vértice. Los catorce
   * edificios suman los vértices que se cuentan aquí, y lo que NO se clona es la variante que ya
   * está en su sitio —la iglesia azul pedida en azul es la misma geometría del catálogo—. Se
   * afirma el ahorro para que el día que alguien clone las cuatro siempre, el número cambie.
   */
  const verticesDeLosCatorce = [...EDIFICIOS_DEL_CASERIO].reduce((suma, n) => suma + uvDe(n).length, 0);
  let seClonan = 0;
  for (const color of COLORES_DE_JUGADOR) {
    for (const nombre of EDIFICIOS_DEL_CASERIO) {
      const suyas = uvDe(nombre);
      if (suyas.some(([u, v]) => esDeUnColorDeJugador(u, v) && saltoAlColor(u, color) !== 0)) {
        seClonan += suyas.length;
      }
    }
  }
  comprobar(
    `los catorce edificios suman ${String(verticesDeLosCatorce)} vértices; con los cuatro colores jugando se clonan ${String(seClonan)} (${((seClonan * 32) / 1024 / 1024).toFixed(1)} MB) y NO los ${String(verticesDeLosCatorce * 4)} de clonarlos todos: la variante que ya está en su color es la misma geometría`,
    seClonan > 0 && seClonan < verticesDeLosCatorce * COLORES_DE_JUGADOR.length,
    { verticesDeLosCatorce, seClonan, ahorrado: verticesDeLosCatorce * COLORES_DE_JUGADOR.length - seClonan },
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
 *
 * ═══ Y VOLVIÓ A DESFASARSE: 457 CONTRA 459 QUE SE HACÍAN ═══
 *
 * O sea que el guion podía morirse en la comprobación 457 —dos antes del final— y salir con
 * cero. Se sube a lo que se hace HOY, y esta vez con la cuenta rehecha en vez de escrita a
 * ojo: el guion tiene 451 llamadas a `comprobar` en el texto y ejecuta 481, porque treinta de
 * ellas viven dentro de bucles sobre listas fijas —tres proporciones de pantalla, dos manos,
 * las clases de pieza—. Corrido tres veces seguidas da 481 las tres.
 *
 * ═══ POR QUÉ EL NÚMERO VA AL RAS DE LA MEDIDA Y NO POR DEBAJO ═══
 *
 * Porque esto es un SUELO, y todo lo que se le reste es exactamente el tamaño del agujero:
 * con el guardia en 470 y 481 hechas, el guion se puede morir once comprobaciones antes del
 * final y salir en verde. La holgura no protege de nada aquí — protege al que añade una
 * comprobación y se olvida de subir el número, y a ése no hay que protegerlo: si añade, la
 * cuenta sube y el guardia sigue pasando igual. El único caso en el que el ras molesta es
 * quitar una comprobación de verdad, y ahí bajar el número es parte de quitarla.
 *
 * Lo que sí hay que medir antes de ponerlo al ras es que la cuenta no BAILE entre corridas:
 * si alguna comprobación viviera dentro de un `if` que depende del aparato, un guardia al ras
 * sería un rojo aleatorio. Medido: no hay ninguna: las treinta que no son llamadas sueltas
 * están en bucles sobre listas escritas en el propio guion.
 */
const COMPROBACIONES_ESCRITAS = 481;
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
