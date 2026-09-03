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
import { COLUMNAS_DEL_ATLAS, FILAS_DEL_ATLAS, PALETA, puntosDeLaCifra } from '../paleta';
import {
  NOMBRE_QUE_SOBREVIVE,
  nombresEnElGlb,
  PIEZAS_DE_COLOR,
  todosLosNombres,
} from '../nombres';
import { cuantasFormasDeCauce, cuantasFormasDeCruce, ladoHaciaElVecino } from '../sendas';
import { hexesDeVertice, vecino, verticesDeHex } from '../../shared/mecanicas/malla-hexagonal';
import { CUERPO, piezaDeOrilla } from '../aguas';
import { piezasDeAsentamiento } from '../asentamiento';
import { MODELO, modeloDePieza } from '../modelos';
import { RADIO_DE_COMARCA, RADIO_DE_TESELA } from '../escala';
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
    const derivadas = todosLosNombres().filter((n) => !nombresEnElGlb().includes(n));
    comprobar(
      'las que se fabrican moviendo UV son las siete piezas por cuatro colores',
      derivadas.length === PIEZAS_DE_COLOR.length * 4,
      { derivadas: derivadas.length, esperadas: PIEZAS_DE_COLOR.length * 4 },
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
const COMPROBACIONES_ESCRITAS = 35;
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
