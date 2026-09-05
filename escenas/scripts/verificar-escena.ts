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
import { dentroDelHueco, huecosDeLaBarra, loQueSeVe } from '../barra';
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
import type { CartaDelMazo } from '../cartas';
import { cuantosTriangulos, geometriaDeContornos } from '../formas';
import {
  CAJA_DEL_PUENTE,
  LARGO_DEL_TRAMO,
  puenteEntre,
  SUPERFICIE_DEL_CAMINO,
} from '../puente';
import { BIENES_CON_ICONO, CONTORNOS_DE_LA_CARTA, CONTORNOS_DEL_BIEN } from '../iconos';
import { MODELO, modeloDePieza } from '../modelos';
import { ESCALON, RADIO_DE_COMARCA, RADIO_DE_TESELA } from '../escala';
import { laMarinaDelMundo } from '../marina';
import { crearRelieve, hexDePunto } from '../relieve';
import fs from 'node:fs';
import path from 'node:path';

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
  const sinIcono = ['limo', 'junco', 'piedra', 'grano'].filter(
    (b) => !BIENES_CON_ICONO.includes(b),
  );
  comprobar('los cuatro bienes con arte provisional tienen icono compilado', sinIcono.length === 0, sinIcono);
  comprobar(
    'y `sal` sigue SIN icono, porque ninguno de los provisionales significa sal',
    !BIENES_CON_ICONO.includes('sal'),
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
  });

  /** Una mano a propósito desordenada: el reparto tiene que agruparla él. */
  const manoDe = (cuantas: number): CartaDelMazo[] =>
    Array.from({ length: cuantas }, (_, i) =>
      naipe(
        `m${String(i)}`,
        ORDEN_DE_LAS_FAMILIAS[(i * 3 + (i % 2)) % ORDEN_DE_LAS_FAMILIAS.length] ?? 'guardia',
      ),
    );

  /** La mano más gorda que el mazo del §2 permite tener a la vez. */
  const manoEntera = (): CartaDelMazo[] => [
    ...Array.from({ length: 14 }, (_, i) => naipe(`g${String(i)}`, 'guardia')),
    ...Array.from({ length: 2 }, (_, i) => naipe(`a${String(i)}`, 'anobueno')),
    ...Array.from({ length: 2 }, (_, i) => naipe(`c${String(i)}`, 'acaparamiento')),
    ...Array.from({ length: 2 }, (_, i) => naipe(`d${String(i)}`, 'dosveredas')),
    ...Array.from({ length: 5 }, (_, i) =>
      naipe(`t${String(i)}`, FAMILIA_DE_LOS_TITULOS, false, true),
    ),
  ];

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
   * La barra vive abajo y centrada, y lo más alto que tiene es su placa de fondo: el centro
   * de sus huecos más tres cuartos de lado. Se prueban de una a seis piezas porque el lado
   * depende de cuántas hay, y en un monitor la barra corta —que es la más alta— es la que
   * más sube.
   */
  const pisanLaBarra: string[] = [];
  for (const [nombre, prop] of PANTALLAS) {
    let techoDeLaBarra = -Infinity;
    for (let piezas = 1; piezas <= 6; piezas++) {
      const hueco = huecosDeLaBarra(piezas, CAMPO, prop)[0];
      if (hueco === undefined) continue;
      techoDeLaBarra = Math.max(techoDeLaBarra, hueco.y + hueco.lado * 0.75);
    }
    for (const caja of todoLoQueOcupa(manoEntera(), prop)) {
      if (caja.y - caja.alto / 2 < techoDeLaBarra + 1e-9) {
        pisanLaBarra.push(`${nombre}: baja a ${caja.y.toFixed(4)} y la barra llega a ${techoDeLaBarra.toFixed(4)}`);
      }
    }
  }
  comprobar(
    'la mano del mazo no invade la zona de la barra de construir',
    pisanLaBarra.length === 0,
    pisanLaBarra.slice(0, 2),
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
   * Cinco familias, cinco colores, y ninguno igual a otro ni al de reserva. Sin dibujo
   * compilado todavía, el color es LO ÚNICO que distingue una pila de otra en reposo: dos
   * familias del mismo tono serían dos montones idénticos en la pantalla con la que se
   * decide qué jugar.
   */
  const colores = ORDEN_DE_LAS_FAMILIAS.map((f) => colorDeLaFamilia(f));
  comprobar(
    'las cinco familias tienen color propio, distinto entre sí y distinto al de reserva',
    new Set(colores).size === ORDEN_DE_LAS_FAMILIAS.length &&
      colores.every((c) => c !== COLOR_SIN_FAMILIA),
    colores,
  );
  comprobar(
    'y una familia desconocida sale con el de reserva en vez de reventar',
    colorDeLaFamilia('una familia de otro juego') === COLOR_SIN_FAMILIA,
  );

  /*
   * ── LOS NUEVE DIBUJOS QUE LA MANO PUEDE PEDIR ──
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
    'los nueve dibujos que la mano del mazo puede pedir los encuentra y dan triángulos',
    mudas.length === 0,
    mudas,
  );
  comprobar(
    'y ninguno de ellos se busca por error en la tabla de los bienes',
    DIBUJOS_DE_LAS_CARTAS.every((d) => !BIENES_CON_ICONO.includes(d)),
    DIBUJOS_DE_LAS_CARTAS.filter((d) => BIENES_CON_ICONO.includes(d)),
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
    { id: 'c1', familia: 'guardia', dibujo: 'guardia', nombre: 'La Guardia', sePuedeJugar: true, sePuedeRevelar: false },
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
const COMPROBACIONES_ESCRITAS = 162;
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
