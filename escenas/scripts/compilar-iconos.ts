/**
 * COMPILA LOS ICONOS DE RIBERAS A UN MÓDULO DE TYPESCRIPT.
 *
 *   npx tsx escenas/scripts/compilar-iconos.ts
 *
 * Escribe `escenas/iconos.ts`, y lo escribe ENTERO cada vez. Dentro van dos cosas de
 * origen distinto, y esa diferencia es la mitad de este fichero:
 *
 *  · Los ICONOS DE LOS BIENES, que se leen de los `.svg` de `arte/game-icons/`. Arte
 *    ajeno y provisional; este guion no sabe de quién y a propósito.
 *  · Los DIBUJOS DE LAS NUEVE CARTAS del mazo, que no se leen de ninguna parte: están
 *    escritos aquí abajo en coordenadas, con la cabecera de cada uno contando qué se ve.
 *    Este guion es su original, no su copia.
 *
 * ═══ POR QUÉ NO SE CARGAN LOS `.svg` DIRECTAMENTE ═══
 *
 * Porque hay dos clientes y cargan distinto. Vite sabe traer un fichero como texto con
 * `?raw`; Metro, que es lo que empaqueta la app, no — allí un `import` de un `.svg` pasa
 * por un transformador de imágenes que devuelve otra cosa. Un camino que funcione en los
 * dos sin configurar nada en ninguno es que el arte acabe siendo CÓDIGO.
 *
 * Son cinco trazos y unos veinte kilobytes: cabe de sobra en un módulo, se empaqueta
 * solo y no hay que servir ni esperar a nada en tiempo de ejecución. Un `.glb` de cuatro
 * megas no cabría; esto sí.
 *
 * ═══ QUÉ LE QUITA A CADA UNO ═══
 *
 * El rectángulo de fondo. Los iconos de game-icons.net traen dos trazos: un cuadrado que
 * cubre el lienzo entero —el fondo negro de su ficha— y el dibujo. Sin quitarlo, la
 * carta saldría con un cuadrado macizo encima del bien.
 *
 * Se reconoce por su forma exacta, `M0 0h512v512H0z` para un lienzo de 512, y no por ser
 * el primero: dar por hecho que el fondo va primero es la clase de suposición que un día
 * borra el dibujo y deja el fondo.
 *
 * ═══ Y APLANA LAS CURVAS AQUÍ, NO ALLÍ ═══
 *
 * Lo que sale no son trazos de SVG: son listas de puntos. La gramática de `d` se recorre
 * en esta máquina, una vez, y lo que viaja a los dos clientes son contornos que sólo hay
 * que enhebrar.
 *
 * No es una optimización, es lo único que funciona: analizar SVG en tiempo de ejecución
 * exige `DOMParser`, que es del navegador. En React Native no existe, así que un icono
 * analizado al vuelo se vería en el escritorio y saldría vacío en la app — sin un error
 * en ninguna consola. Ver `aplana-trazo.ts`.
 *
 * ═══ Y POR QUÉ NO CONOCE A NADIE ═══
 *
 * Este guion no sabe de dónde salen los iconos de los bienes ni quién los hizo: lee los
 * `.svg` que haya en la carpeta, por su nombre de fichero. El arte de ahora es PROVISIONAL
 * —ver `arte/game-icons/LEEME.md`— y cambiarlo tiene que ser dejar cinco ficheros y volver
 * a ejecutar esto, sin tocar una línea de la escena. Un arte provisional del que dependa
 * código ya no es provisional.
 *
 * Con las cartas es al revés y también a propósito: no hay fichero que dejar porque el
 * dibujo ES este código. El porqué está donde empiezan, más abajo.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ShapePath } from 'three';
import { cuantosTriangulos, geometriaDeContornos } from '../formas';
import { aplanaTrazo, simplificaContorno } from './aplana-trazo';

const RAIZ = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const ORIGEN = path.join(RAIZ, 'arte', 'game-icons');
/**
 * A DÓNDE SE ESCRIBE. Por defecto encima de `escenas/iconos.ts`, que es lo que se quiere al
 * compilar. Con `--a <ruta>` se escribe AHÍ y no se toca el bueno: lo usa
 * `verify:iconos`, que recompila a un fichero temporal y lo compara byte a byte con el que
 * está en el árbol. Sin esa puerta, la única manera de comprobar la sincronía sería
 * sobrescribir el fichero que se está comprobando.
 */
const DESTINO = (() => {
  const i = process.argv.indexOf('--a');
  const ruta = i >= 0 ? process.argv[i + 1] : undefined;
  return ruta === undefined ? path.join(RAIZ, 'escenas', 'iconos.ts') : path.resolve(ruta);
})();

/**
 * LOS CINCO BIENES Y EL FICHERO DE CADA UNO.
 *
 * El nombre del bien es el del juego y el del fichero es el del arte, y se escriben los
 * dos porque son dos vocabularios distintos: el día que el arte nuevo llame `trigo.svg`
 * al grano, se cambia aquí y nada más.
 */
/**
 * LOS BIENES SON LOS DE RIBERAS, que es el juego que hay.
 *
 * ═══ POR QUÉ SE CAMBIÓ EL VOCABULARIO ═══
 *
 * Estaban con los nombres del catán —madera, ladrillo, lana, grano, mineral— porque el
 * arte se eligió antes de conectar el tablero con el motor. Los bienes de Riberas son
 * otros: limo, junco, sal, piedra y grano.
 *
 * La alternativa era traducir entre los dos vocabularios en el camino del juego al dibujo,
 * y hubo una propuesta concreta de hacerlo. No sale: esa tabla emparejaba `sal` con `lana`,
 * y en un juego de trueques mirar tu mano y ver una OVEJA cuando lo que tienes es sal no es
 * un provisional cosmético — es enseñar un bien que no tienes, justo en la pantalla con la
 * que se decide qué ofrecer. Un dibujo ausente se lee como «falta el dibujo»; un dibujo
 * equivocado se lee como otra cosa.
 *
 * Así que el vocabulario no se traduce en ningún sitio: se dibuja el que hay.
 *
 * ═══ Y `SAL` NO SALE DE NINGÚN `.svg`, PORQUE NO HABÍA NINGUNO QUE SIRVIERA ═══
 *
 * De los cinco iconos provisionales, cuatro tienen una lectura defendible para un bien de
 * Riberas —los terrones de barro para el limo de la marisma, el haz de tallos para el junco
 * del carrizal, la piedra del cantil y la gavilla de la vega—. Ninguno significa sal, y la
 * oveja que sobra menos que ninguno.
 *
 * Así que la sal se dibujó aquí, en coordenadas, igual que las nueve cartas del mazo: sus
 * eras de evaporación están más abajo, en `SAL`. Estuvo dibujada y APAGADA una temporada
 * —fuera del mapa de los bienes— mientras se decidía si una sal de la casa entre cuatro
 * dibujos ajenos cantaba más que la carta muda. Se ha encendido, y el motivo es que las dos
 * cosas no se leen igual: la mezcla de manos se lee como cuatro provisionales esperando al
 * arte propio, y la carta sin dibujo se lee como un fallo del programa. Quien jugaba
 * preguntó por qué la sal no tenía icono, que es exactamente la pregunta que no debía costar.
 *
 * Por eso esta lista tiene CUATRO entradas y los bienes con icono son CINCO.
 */
const BIENES: ReadonlyArray<{ bien: string; fichero: string }> = [
  { bien: 'limo', fichero: 'brick-pile.svg' },
  { bien: 'junco', fichero: 'wood-pile.svg' },
  { bien: 'piedra', fichero: 'stone-pile.svg' },
  { bien: 'grano', fichero: 'grain-bundle.svg' },
];

/** El lienzo que se espera. Si un icono trae otro, se dice en vez de escalarlo a ciegas. */
const LIENZO = 512;

function fondoDelLienzo(lado: number): string {
  return `M0 0h${String(lado)}v${String(lado)}H0z`;
}

interface Icono {
  bien: string;
  /** Cada contorno, como una tira llana de `x, y, x, y`. */
  contornos: number[][];
  puntos: number;
}

function leeUno(bien: string, fichero: string): Icono {
  const ruta = path.join(ORIGEN, fichero);
  if (!fs.existsSync(ruta)) {
    console.error(`Falta ${path.relative(RAIZ, ruta)}, que es el icono de ${bien}.`);
    process.exit(2);
  }
  const texto = fs.readFileSync(ruta, 'utf8');

  const caja = /viewBox="([^"]+)"/.exec(texto)?.[1] ?? '';
  const esperado = `0 0 ${String(LIENZO)} ${String(LIENZO)}`;
  if (caja !== esperado) {
    console.error(
      `El icono de ${bien} tiene el lienzo «${caja}» y se esperaba «${esperado}».\n` +
        'La carta coloca el dibujo dando por hecho un lienzo cuadrado de ese tamaño; con\n' +
        'otro saldría descentrado o de otro tamaño que sus cuatro compañeros. Ver\n' +
        '`arte/game-icons/LEEME.md`, que dice lo que tiene que cumplir el arte nuevo.',
    );
    process.exit(2);
  }

  const todos = [...texto.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1] ?? '');
  const fondo = fondoDelLienzo(LIENZO);
  const trazos = todos.filter((d) => d.replace(/\s+/g, '') !== fondo.replace(/\s+/g, ''));

  if (trazos.length === 0) {
    console.error(`El icono de ${bien} se queda sin nada al quitarle el fondo.`);
    process.exit(2);
  }

  /*
   * Se redondea a una décima. Sobre un lienzo de 512 dibujado a unos cien píxeles, una
   * décima es la milésima parte de un píxel: no hay diferencia que ver, y el módulo baja
   * a la mitad. Guardar quince decimales de un punto que nadie puede distinguir es
   * enviar ruido.
   */
  const contornos: number[][] = [];
  for (const d of trazos) {
    for (const bruto of aplanaTrazo(d, `el icono de ${bien}`)) {
      const contorno = simplificaContorno(bruto);
      const tira: number[] = [];
      for (const q of contorno) {
        tira.push(Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10);
      }
      if (tira.length >= 6) contornos.push(tira);
    }
  }
  if (contornos.length === 0) {
    console.error(`El icono de ${bien} no ha dado ni un contorno con tres puntos.`);
    process.exit(2);
  }
  const puntos = contornos.reduce((t, c) => t + c.length / 2, 0);
  return { bien, contornos, puntos };
}

const iconos = BIENES.map((b) => leeUno(b.bien, b.fichero));

// ---------------------------------------------------------------------------

/**
 * ═══ Y AQUÍ EMPIEZA LO QUE NO VIENE DE NINGÚN `.svg`: LAS CARTAS ═══
 *
 * Los cuatro bienes de arriba se leen de un fichero porque su arte es de fuera y
 * provisional. Las nueve cartas del mazo NO: se dibujan aquí, en coordenadas, y este
 * guion es su original.
 *
 * Se hace así por una razón que se ve en cuanto se intenta lo otro. La cabecera del
 * fichero generado dice, con toda la razón, que nadie lo edite a mano — se sobrescribe.
 * Así que un dibujo escrito directamente en `escenas/iconos.ts` es un dibujo con fecha de
 * caducidad: dura hasta que alguien vuelva a compilar los bienes, y entonces desaparece
 * sin que falle nada. Poniéndolo aquí, recompilar lo vuelve a escribir igual.
 *
 * La alternativa honrada era dejar nueve `.svg` en una carpeta y leerlos, como los bienes.
 * No se hizo, y el motivo es el mismo por el que existe `arte/game-icons/LEEME.md`: un
 * `.svg` no dice de dónde salió ni quién lo hizo, y este árbol ya tuvo cinco dibujos
 * ajenos colándose hacia producción sin su atribución. Un dibujo escrito en coordenadas,
 * con su cabecera al lado contando qué se ve y por qué, no tiene esa duda: es de la casa
 * porque está aquí.
 */

/** Un punto del lienzo. La `y` crece HACIA ABAJO, igual que en SVG. */
type Punto = readonly [number, number];

/** La misma décima con la que se recorta el arte que sí viene de `.svg`. */
function decima(n: number): number {
  return Math.round(n * 10) / 10;
}

/** El doble del área con signo. Sólo interesa el SIGNO: dice cómo está enrollado. */
function areaFirmada(puntos: readonly Punto[]): number {
  let suma = 0;
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
    const a = puntos[i] as Punto;
    const b = puntos[j] as Punto;
    suma += b[0] * a[1] - a[0] * b[1];
  }
  return suma;
}

/**
 * DE PUNTOS A TIRA, CON EL ENROLLADO PUESTO A MANO, Y ESTO NO ES COSMÉTICO.
 *
 * `ShapePath.toShapes` —el mismo que usa `SVGLoader`, y el que va a enhebrar esto en los
 * dos clientes— decide qué contorno es silueta y qué contorno es AGUJERO sumando números
 * de vuelta con la regla `nonzero`. Un contorno metido dentro de otro y enrollado en el
 * MISMO sentido no sale como agujero: sale como repetición, y el algoritmo lo descarta por
 * redundante. O sea que una tronera dibujada del revés no se ve mal — se ve como si no
 * estuviera, y el torreón sale macizo sin que nada falle.
 *
 * Por eso el sentido no se escribe en las listas de puntos, donde se pierde a la primera
 * corrección: se impone aquí. `macizo` deja el contorno positivo y `hueco` negativo, y
 * quien dibuja sólo tiene que decir cuál de las dos cosas quiere.
 */
function tira(puntos: readonly Punto[], positiva: boolean): number[] {
  const ordenados = areaFirmada(puntos) >= 0 === positiva ? puntos : [...puntos].reverse();
  const salida: number[] = [];
  for (const p of ordenados) salida.push(decima(p[0]), decima(p[1]));
  return salida;
}

/** Una silueta: lo que se pinta. */
function macizo(puntos: readonly Punto[]): number[] {
  return tira(puntos, true);
}

/** Un agujero DENTRO de una silueta: lo que deja pasar el color de la carta. */
function hueco(puntos: readonly Punto[]): number[] {
  return tira(puntos, false);
}

/** Un arco, en grados y en sentido antihorario visual (0° a la derecha, 90° arriba). */
function arco(
  cx: number,
  cy: number,
  radio: number,
  desde: number,
  hasta: number,
  lados: number,
): Punto[] {
  const puntos: Punto[] = [];
  for (let i = 0; i <= lados; i++) {
    const grados = desde + ((hasta - desde) * i) / lados;
    const a = (grados * Math.PI) / 180;
    puntos.push([cx + radio * Math.cos(a), cy - radio * Math.sin(a)]);
  }
  return puntos;
}

/**
 * Un círculo, con la opción de abollarlo. `ondas` y `amplitud` sirven para la copa del
 * huerto: un círculo perfecto se lee como una pelota y no como un árbol.
 */
function circulo(
  cx: number,
  cy: number,
  radio: number,
  lados: number,
  ondas = 0,
  amplitud = 0,
): Punto[] {
  const puntos: Punto[] = [];
  for (let i = 0; i < lados; i++) {
    const a = (2 * Math.PI * i) / lados;
    const r = radio * (1 + amplitud * Math.cos(ondas * a));
    puntos.push([cx + r * Math.cos(a), cy - r * Math.sin(a)]);
  }
  return puntos;
}

/**
 * UNA LÍNEA CON CUERPO: de una polilínea a la cinta rellena que la dibuja.
 *
 * ═══ POR QUÉ NO HAY TRAZOS DE VERDAD ═══
 *
 * Porque lo que viaja a los clientes son contornos que se rellenan de un color plano; no
 * hay grosor de línea que ajustar en ninguna parte. Una lanza o un aspa de molino son
 * líneas, así que se convierten en el polígono que las contiene y se rellenan igual que
 * todo lo demás.
 *
 * ═══ Y POR QUÉ EL GROSOR ES TAN GORDO ═══
 *
 * Porque `arte/game-icons/LEEME.md` lo midió antes que nadie: la carta pinta el icono
 * pequeño sobre un fondo de color, y un trazo de dos píxeles desaparece. Sobre este lienzo
 * de 512, dibujado a un centenar de píxeles, un grosor de 20 son cuatro píxeles — que es
 * el mínimo que sobrevive en un móvil. Es la razón de que estos dibujos tengan pocas
 * líneas y gordas en vez de muchas y finas.
 *
 * El INGLETE de cada codo se limita a propósito: sin tope, un codo cerrado dispara la
 * punta a varias veces el grosor y la cinta se cruza consigo misma, que es un polígono no
 * simple — y ahí el triangulador deja de contar lo que hay dentro y lo que hay fuera.
 */
function trazo(camino: readonly Punto[], grosor: number): number[] {
  if (camino.length < 2) {
    console.error('Un trazo necesita al menos dos puntos.');
    process.exit(2);
  }
  const medio = grosor / 2;

  const normales: Punto[] = [];
  for (let i = 0; i + 1 < camino.length; i++) {
    const a = camino[i] as Punto;
    const b = camino[i + 1] as Punto;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const largo = Math.hypot(dx, dy);
    if (largo < 1e-9) {
      console.error('Un trazo trae dos puntos pegados y ahí no hay dirección que seguir.');
      process.exit(2);
    }
    normales.push([-dy / largo, dx / largo]);
  }

  const izquierda: Punto[] = [];
  const derecha: Punto[] = [];
  for (let i = 0; i < camino.length; i++) {
    const aqui = camino[i] as Punto;
    const antes = normales[Math.max(0, i - 1)] as Punto;
    const luego = normales[Math.min(normales.length - 1, i)] as Punto;
    let mx = antes[0] + luego[0];
    let my = antes[1] + luego[1];
    const largo = Math.hypot(mx, my);
    if (largo < 1e-6) {
      mx = antes[0];
      my = antes[1];
    } else {
      mx /= largo;
      my /= largo;
    }
    /* El tope del inglete: 0,35 deja crecer la punta hasta unas tres veces el grosor. */
    const cuanto = medio / Math.max(0.35, mx * antes[0] + my * antes[1]);
    izquierda.push([aqui[0] + mx * cuanto, aqui[1] + my * cuanto]);
    derecha.push([aqui[0] - mx * cuanto, aqui[1] - my * cuanto]);
  }

  return macizo([...izquierda, ...derecha.reverse()]);
}

/**
 * UN TRAVESAÑO de una banda en perspectiva: el hueco que cruza una vereda de lado a lado.
 *
 * La banda se da como sus cuatro esquinas —abajo-izquierda, abajo-derecha, arriba-derecha,
 * arriba-izquierda— y `parte` dice a qué altura se corta, de 0 abajo a 1 arriba. Se
 * interpola en vez de escribir las coordenadas porque la banda se estrecha al subir: un
 * travesaño de anchura fija se saldría por los lados en lo alto, y ahí deja de ser un
 * agujero para partir la vereda en dos trozos.
 */
function travesano(
  banda: readonly Punto[],
  parte: number,
  margen: number,
  grosor: number,
): Punto[] {
  const abajoIzq = banda[0] as Punto;
  const abajoDer = banda[1] as Punto;
  const arribaDer = banda[2] as Punto;
  const arribaIzq = banda[3] as Punto;
  const izq = abajoIzq[0] + (arribaIzq[0] - abajoIzq[0]) * parte;
  const der = abajoDer[0] + (arribaDer[0] - abajoDer[0]) * parte;
  const y = abajoIzq[1] + (arribaIzq[1] - abajoIzq[1]) * parte;
  return [
    [izq + margen, y - grosor / 2],
    [der - margen, y - grosor / 2],
    [der - margen, y + grosor / 2],
    [izq + margen, y + grosor / 2],
  ];
}

/**
 * UN ESCUDO: hombros rectos arriba y un flanco que baja en punta.
 *
 * Sale como función y no como una lista de puntos escrita tres veces porque de los dos
 * premios uno son TRES escudos, y tres listas a mano se separan a la primera corrección:
 * bastaría mover un punto en uno para que el del medio dejara de ser el mismo escudo más
 * grande y pasara a ser otra forma. Aquí los tres salen de la misma cuenta y sólo cambian
 * de tamaño, que es lo que hace que se lean como tres de lo mismo.
 *
 * El flanco es media elipse y no dos rectas: en punta de dos rectas, a tamaño de carta el
 * escudo se lee como un diamante, que es exactamente la silueta del otro premio.
 */
function escudo(cx: number, arriba: number, ancho: number, alto: number): Punto[] {
  const medio = ancho / 2;
  /* Dónde acaban los hombros rectos y empieza el flanco. */
  const hombro = arriba + alto * 0.42;
  const flanco = alto - alto * 0.42;
  const puntos: Punto[] = [
    [cx - medio, arriba],
    [cx + medio, arriba],
  ];
  for (let i = 0; i <= 10; i++) {
    const a = (Math.PI * i) / 10;
    puntos.push([cx + medio * Math.cos(a), hombro + flanco * Math.sin(a)]);
  }
  return puntos;
}

// ---------------------------------------------------------------------------

/** Un dibujo de carta, con lo que se ve escrito al lado para quien lea el generado. */
interface Dibujo {
  /** La llave con la que la escena lo pide. Es el nombre de la familia, no su rótulo. */
  carta: string;
  /** QUÉ SE VE, en una frase. Viaja al fichero generado. */
  que: string;
  contornos: number[][];
}

/*
 * ═══ EL PULSO DE LOS NUEVE, DICHO UNA VEZ PARA LOS NUEVE ═══
 *
 * Miguel mandó dos referencias y se quedó con la segunda: TRAZO CLARO SOBRE FONDO OSCURO,
 * línea limpia, sin acuarela y sin relleno de color. Es además lo que ya hacen los cuatro
 * bienes, que la carta pinta en crema sobre el color de su tierra.
 *
 * Y sobre eso manda una restricción que decide casi todo lo demás: estas cartas se ven en
 * una MANO, dentro de una escena en tres dimensiones, en un móvil. Ahí un dibujo mide poco
 * más de un centenar de píxeles y encima se mueve. Así que aquí no hay detalle fino: cada
 * uno son formas grandes y pocas —ninguno pasa de nueve contornos—, y lo que distingue una
 * carta de otra tiene que verse en su SILUETA, porque a ese tamaño es lo único que llega.
 *
 * De ahí las tres reglas que siguen los nueve:
 *
 *  · Masa donde hay masa y línea donde hay línea. Un yelmo o un saco son bultos y van
 *    macizos; el asta de una lanza o el aspa de un molino son líneas y van en cinta. Todo
 *    contorno macizo, todo del mismo crema: mezclar siluetas rellenas con contornos huecos
 *    daría dos estilos en la misma mano.
 *  · El detalle de dentro es AGUJERO y no línea. Las troneras del yelmo, la puerta del
 *    torreón, la fruta del huerto: se dibujan quitando, que a este tamaño es lo único que
 *    se distingue. Una raya clara encima de una masa clara no existe.
 *  · Nada de lo que hay dentro toca el borde. Un agujero que muerde el filo deja de ser
 *    agujero y parte la silueta en dos, y eso no se ve hasta que la carta está en la mano.
 *
 * Los cinco títulos —molino, cantera, torreón, faro y huerto— valen lo mismo y hacen lo
 * mismo, así que la única razón de que sean cinco dibujos y no uno repetido es que se
 * distingan de un vistazo. Están elegidos por silueta y no por tema: aspas en X, un perfil
 * escalonado, almenas, un cuerpo que se estrecha con destellos, y una copa redonda.
 */
const CARTAS: readonly Dibujo[] = [
  /*
   * LA GUARDIA: un yelmo cerrado, con la lanza pasando por detrás.
   *
   * El yelmo va macizo y con las dos troneras vaciadas porque es lo que se lee entero de
   * golpe: a este tamaño una cara con dos ranuras es una cara. La lanza NO se dibuja
   * entera y luego se tapa —aquí nada tapa a nada, todo es del mismo crema— sino que se
   * dibuja rota en los dos trozos que se verían, uno a cada lado del yelmo. Eso es lo que
   * hace que pase por DETRÁS en vez de quedarse clavada encima.
   *
   * El asta va más gorda que cualquier otra línea de las nueve —24 y no 20— y eso salió de
   * medirlo, no de gusto: rasterizada al tamaño que tiene en la mano, con 18 los dos trozos
   * se rompían en puntos sueltos y la carta quedaba en un yelmo con motas alrededor. Un
   * trazo partido en dos tramos cortos necesita más cuerpo que uno largo para sobrevivir al
   * mismo tamaño.
   *
   * Se descartó la silueta con capa: a cien píxeles una capa es un borrón, y dos borrones
   * distintos en la misma mano no se distinguen.
   */
  {
    carta: 'guardia',
    que: 'Un yelmo con dos troneras y una lanza que le pasa por detrás.',
    contornos: [
      macizo([
        [172, 330],
        ...arco(256, 280, 84, 180, 0, 16),
        [340, 330],
        [350, 344],
        [162, 344],
      ]),
      hueco([
        [196, 276],
        [246, 276],
        [246, 300],
        [196, 300],
      ]),
      hueco([
        [266, 276],
        [316, 276],
        [316, 300],
        [266, 300],
      ]),
      trazo(
        [
          [86, 446],
          [172, 363],
        ],
        24,
      ),
      trazo(
        [
          [330, 212],
          [400, 145],
        ],
        24,
      ),
      macizo([
        [436, 110],
        [414, 167],
        [378, 131],
      ]),
    ],
  },

  /*
   * EL AÑO BUENO: una cesta con el pico rebosando por encima del borde.
   *
   * Las dos espigas cruzadas que pedía el encargo se descartaron por una razón concreta:
   * el bien `grano` YA es una gavilla, y en la misma mano conviven la carta y los bienes.
   * Dos dibujos de espiga uno al lado del otro es enseñar dos veces la misma cosa justo
   * donde hay que decidir qué se gasta.
   *
   * La cesta con la carga asomando resuelve lo mismo sin repetirse, y lo hace por silueta:
   * un trapecio con tres bultos encima se lee lleno aunque no se distinga de qué.
   */
  {
    carta: 'anobueno',
    que: 'Una cesta de borde ancho con tres bultos rebosando por encima.',
    contornos: [
      macizo([
        [128, 282],
        [384, 282],
        [384, 308],
        [352, 308],
        [330, 420],
        [298, 442],
        [214, 442],
        [182, 420],
        [160, 308],
        [128, 308],
      ]),
      macizo(circulo(180, 236, 30, 24)),
      macizo(circulo(256, 204, 34, 26)),
      macizo(circulo(332, 238, 28, 24)),
    ],
  },

  /*
   * EL ACAPARAMIENTO: un saco atado por el cuello, con el nudo abierto arriba.
   *
   * Todo el peso lo lleva la silueta: panza ancha, cuello estrangulado y la tela abierta
   * en dos picos. Eso ya es un saco atado sin dibujar ni una cuerda.
   *
   * La cuerda son dos ranuras vaciadas en el cuello y no dos líneas encima, por lo mismo
   * que las troneras del yelmo: una raya crema sobre una masa crema no se ve. Y son DOS y
   * no una porque una sola ranura se lee como una grieta; dos paralelas se leen como algo
   * enrollado.
   *
   * La mano cerrada sobre un fardo que también valía se dejó fuera: una mano a este tamaño
   * es una mancha con dedos, y la mancha se parece demasiado a la copa del huerto.
   */
  {
    carta: 'acaparamiento',
    que: 'Un saco de panza ancha, atado por el cuello con dos vueltas de cuerda.',
    contornos: [
      macizo([
        [214, 150],
        [256, 178],
        [298, 150],
        [306, 214],
        [352, 258],
        [388, 332],
        [376, 406],
        [320, 446],
        [192, 446],
        [136, 406],
        [124, 332],
        [160, 258],
        [206, 214],
      ]),
      hueco([
        [224, 222],
        [288, 222],
        [288, 234],
        [224, 234],
      ]),
      hueco([
        [216, 242],
        [296, 242],
        [296, 254],
        [216, 254],
      ]),
    ],
  },

  /*
   * LAS DOS VEREDAS: dos calzadas de tablas alejándose, con sus travesaños.
   *
   * Se eligieron dos tramos PARALELOS y no una bifurcación, aunque la Y sea más bonita:
   * la carta da dos veredas, no una decisión entre dos caminos, y una horquilla dice lo
   * segundo. Dos bandas separadas se cuentan.
   *
   * Se estrechan hacia arriba porque una vereda de Riberas es una pasarela de tablas sobre
   * el agua —eso es lo que tiende `puente.ts`— y la perspectiva es lo que la separa de dos
   * barras cualesquiera. Los travesaños son huecos y no tablas dibujadas encima, otra vez
   * por lo mismo, y se estrechan con la banda porque uno de anchura fija se saldría por el
   * lado justo en lo alto, donde partiría la vereda en dos.
   */
  {
    carta: 'dosveredas',
    que: 'Dos pasarelas de tablas, en paralelo, estrechándose al alejarse.',
    contornos: (() => {
      const izquierda: Punto[] = [
        [76, 438],
        [192, 438],
        [214, 166],
        [166, 166],
      ];
      const derecha: Punto[] = [
        [320, 438],
        [436, 438],
        [346, 166],
        [298, 166],
      ];
      const alturas = [0.22, 0.5, 0.78];
      return [
        macizo(izquierda),
        macizo(derecha),
        ...alturas.map((t) => hueco(travesano(izquierda, t, 20, 20 - 8 * t))),
        ...alturas.map((t) => hueco(travesano(derecha, t, 20, 20 - 8 * t))),
      ];
    })(),
  },

  /*
   * EL MOLINO: torre con caperuza y cuatro aspas en aspa.
   *
   * La X de las aspas es la silueta más reconocible de los cinco títulos y por eso este es
   * el que más grande va: se distingue de los otros cuatro antes de saber qué es. Las aspas
   * cruzan por delante de la torre y no se recortan contra ella —al revés que la lanza de
   * la Guardia— porque aquí no hay nada que esté detrás: un molino tiene el eje delante.
   *
   * La puerta vaciada abajo no es adorno: sin ella la torre es un trapecio y podría ser
   * cualquier cosa con un aspa encima.
   */
  {
    carta: 'molino',
    que: 'Una torre con caperuza y puerta, y cuatro aspas cruzadas sobre ella.',
    contornos: (() => {
      const eje: Punto = [256, 214];
      const brazo = 190;
      const puntas: Punto[] = [45, 135, 225, 315].map((grados) => {
        const a = (grados * Math.PI) / 180;
        return [eje[0] + brazo * Math.cos(a), eje[1] - brazo * Math.sin(a)];
      });
      return [
        macizo([
          [192, 438],
          [320, 438],
          [304, 250],
          [256, 206],
          [208, 250],
        ]),
        hueco([...arco(256, 362, 26, 180, 0, 10), [282, 404], [230, 404]]),
        ...puntas.map((punta) => trazo([eje, punta], 26)),
      ];
    })(),
  },

  /*
   * LA CANTERA: el frente escalonado de un cantil, con dos bloques ya sacados.
   *
   * El escalonado ES el dibujo. El bien `piedra` ya es un montón de cascotes, así que una
   * cantera hecha de piedras sueltas sería el mismo dibujo con otro nombre; lo que hace
   * cantera a una cantera es que alguien se ha llevado el material por bancadas, y eso se
   * ve en el perfil.
   *
   * Los dos bloques flotan fuera del cantil, en el hueco que dejan los escalones, y son
   * cuadriláteros torcidos y no piedras redondas: cortados, no caídos.
   *
   * Las tres ranuras del frente son los estratos y hacen dos cosas a la vez. Dicen que eso
   * es roca en capas y no una escalera, y le quitan tinta a la única silueta de las nueve
   * que era una mancha maciza: al lado de las otras ocho, un cuadrante relleno se lee como
   * un borrón antes que como un cantil.
   */
  {
    carta: 'cantera',
    que: 'Un cantil cortado en tres bancadas y tres estratos, con dos bloques ya extraídos.',
    contornos: [
      macizo([
        [438, 442],
        [438, 132],
        [300, 132],
        [300, 206],
        [224, 206],
        [224, 280],
        [148, 280],
        [148, 354],
        [86, 354],
        [86, 442],
      ]),
      hueco([
        [258, 250],
        [420, 250],
        [420, 270],
        [258, 270],
      ]),
      hueco([
        [182, 322],
        [420, 322],
        [420, 342],
        [182, 342],
      ]),
      hueco([
        [120, 394],
        [420, 394],
        [420, 414],
        [120, 414],
      ]),
      macizo([
        [96, 196],
        [158, 182],
        [168, 234],
        [106, 248],
      ]),
      macizo([
        [110, 116],
        [172, 102],
        [182, 154],
        [120, 168],
      ]),
    ],
  },

  /*
   * EL TORREÓN: cinco almenas, una tronera y una puerta en arco, sobre un zócalo.
   *
   * Las almenas son toda la carta: es lo único que un torreón tiene y un faro no, y son la
   * diferencia entre estos dos títulos vistos de lejos. Por eso el cuerpo es RECTO y
   * ancho, mientras que el faro se estrecha: dos torres que se distinguen sólo por lo que
   * llevan encima se confunden en cuanto la mano se mueve.
   *
   * Son CINCO y no cuatro por una razón que sólo se ve dibujándolo: con un número par el
   * centro cae en una escotadura, y entonces la tronera queda debajo del hueco de las
   * almenas. Las dos se leen como una sola ranura larga partida por un puentecillo, y el
   * torreón se convierte en una torre agrietada. Con un número impar el centro es almena,
   * y la tronera se apoya en macizo.
   *
   * El zócalo del pie hace lo mismo con menos: apoya la torre y le quita el aire de
   * chimenea que tiene un rectángulo suelto.
   */
  {
    carta: 'torreon',
    que: 'Una torre de cinco almenas, con tronera, puerta en arco y zócalo al pie.',
    contornos: [
      macizo([
        [130, 438],
        [130, 410],
        [142, 410],
        [142, 168],
        [174, 168],
        [174, 212],
        [191, 212],
        [191, 168],
        [223, 168],
        [223, 212],
        [240, 212],
        [240, 168],
        [272, 168],
        [272, 212],
        [289, 212],
        [289, 168],
        [321, 168],
        [321, 212],
        [338, 212],
        [338, 168],
        [370, 168],
        [370, 410],
        [382, 410],
        [382, 438],
      ]),
      hueco([
        [244, 236],
        [268, 236],
        [268, 292],
        [244, 292],
      ]),
      hueco([...arco(256, 352, 34, 180, 0, 10), [290, 392], [222, 392]]),
    ],
  },

  /*
   * EL FARO: fuste que se estrecha, linterna con caperuza, y cuatro destellos.
   *
   * Los destellos son cuatro rayas sueltas separadas del cuerpo, y esa separación es el
   * dibujo entero: pegadas serían dos aleros y el faro se leería como una casa. Sueltas,
   * el hueco entre la linterna y la raya se lee como aire, y el aire con rayas se lee como
   * luz.
   *
   * Las dos franjas vaciadas del fuste son las bandas pintadas de un faro de verdad, y de
   * paso rompen el trapecio para que no se confunda con la torre de la cantera.
   */
  {
    carta: 'faro',
    que: 'Un faro que se estrecha, con dos franjas, y cuatro destellos sueltos a los lados.',
    contornos: [
      macizo([
        [176, 446],
        [336, 446],
        [306, 248],
        [322, 248],
        [322, 224],
        [302, 224],
        [302, 178],
        [256, 146],
        [210, 178],
        [210, 224],
        [190, 224],
        [190, 248],
        [206, 248],
      ]),
      hueco([
        [220, 306],
        [292, 306],
        [292, 328],
        [220, 328],
      ]),
      hueco([
        [210, 378],
        [302, 378],
        [302, 400],
        [210, 400],
      ]),
      trazo(
        [
          [142, 152],
          [190, 176],
        ],
        20,
      ),
      trazo(
        [
          [128, 214],
          [184, 214],
        ],
        20,
      ),
      trazo(
        [
          [370, 152],
          [322, 176],
        ],
        20,
      ),
      trazo(
        [
          [384, 214],
          [328, 214],
        ],
        20,
      ),
    ],
  },

  /*
   * EL HUERTO: un árbol con tres frutas y el suelo apuntado a los lados.
   *
   * La copa es un círculo abollado con cinco lóbulos y no un círculo limpio, que es lo que
   * separa un árbol de una pelota con palo. Las frutas son huecos —tres puntos oscuros
   * dentro de la copa— y no bultos encima: dibujadas por fuera se pegarían al borde y la
   * copa quedaría con bollos.
   *
   * Las dos rayas del suelo no tocan el tronco. Tocándolo serían raíces, y una raíz a este
   * tamaño ensucia el pie del árbol; separadas se leen como tierra, que es lo que hace
   * huerto y no bosque.
   */
  {
    carta: 'huerto',
    que: 'Un árbol de copa lobulada con tres frutas huecas, tronco y suelo a los lados.',
    contornos: [
      macizo(circulo(256, 222, 120, 40, 5, 0.085)),
      macizo([
        [238, 300],
        [274, 300],
        [286, 446],
        [226, 446],
      ]),
      hueco(circulo(206, 196, 19, 14)),
      hueco(circulo(300, 184, 19, 14)),
      hueco(circulo(252, 264, 19, 14)),
      macizo([
        [146, 424],
        [206, 424],
        [206, 442],
        [146, 442],
      ]),
      macizo([
        [306, 424],
        [366, 424],
        [366, 442],
        [306, 442],
      ]),
    ],
  },

  /*
   * ═══ Y AQUÍ EMPIEZAN LOS DOS QUE NO SON CARTAS: LOS PREMIOS ═══
   *
   * El Vado Largo y La Mayor Guardia no están en el mazo y no se compran: se TIENEN, y se
   * pierden cuando otro te adelanta. Pero se pintan como naipe en la misma mano —ver
   * `premiosEnTres` en `shared/arcade/juegos/riberas-en-tres.ts`— porque un premio que sólo
   * sale como una línea de texto en el marcador no se ve: Miguel encadenó cinco veredas, se
   * llevó los dos puntos, y contó que «no le aparece la carta».
   *
   * Van en esta misma tabla y no en otra aparte porque quien pinta un naipe busca su dibujo
   * en un solo sitio (`CONTORNOS_DE_LA_CARTA`), y una segunda tabla obligaría a la escena a
   * saber de premios para elegir en cuál mirar — que es justo lo que no sabe.
   *
   * SE DISTINGUEN DE LAS NUEVE POR DOS COSAS A LA VEZ, y hacen falta las dos: por el COLOR
   * de su familia, que es lo único que se ve cuando la mano está en reposo y de cada carta
   * asoma un canto (ver `COLOR_DE_LA_FAMILIA` en `escenas/cartas.ts`: las nueve son tonos
   * apagados y estos dos son vivos), y por la SILUETA, que es lo que llega cuando el naipe
   * se levanta. Una sola de las dos no basta: el color no se lee levantado —el dibujo lo
   * tapa casi entero— y la silueta no se lee en reposo.
   */

  /*
   * EL VADO LARGO: cinco losas de paso en zigzag sobre dos líneas de agua.
   *
   * CINCO, y son las cinco de `VADO_MINIMO`. No es un adorno: la cadena que da el premio
   * mide cinco veredas, y contar cinco piedras es lo mismo que se cuenta en el tablero.
   *
   * Losas y no un camino de una pieza porque un camino largo es un rectángulo tumbado, y un
   * rectángulo tumbado no se distingue de nada a tamaño de carta. Cinco bultos separados sí:
   * la silueta es discontinua, y ninguna de las nueve lo es.
   *
   * Y en zigzag y no en arco a propósito: en arco quedaba un rosario de bultos sobre una
   * curva, que es la mitad de arriba de El Año Bueno —su cesta lleva tres redondeles en
   * arco—. El zigzag las separa de un vistazo, y además es lo que hace una hilera de piedras
   * de paso de verdad.
   *
   * Las dos líneas de agua van DEBAJO y no cruzando las losas. Cruzándolas, el agua y la
   * piedra son del mismo crema y se funden en una mancha; debajo se leen como el vado.
   */
  {
    carta: 'vado',
    que: 'Cinco losas de paso en zigzag sobre dos líneas de agua.',
    contornos: [
      macizo(circulo(76, 300, 44, 4)),
      macizo(circulo(166, 240, 44, 4)),
      macizo(circulo(256, 300, 44, 4)),
      macizo(circulo(346, 240, 44, 4)),
      macizo(circulo(436, 300, 44, 4)),
      trazo(
        [
          [86, 400],
          [172, 388],
          [258, 400],
          [344, 388],
          [430, 400],
        ],
        22,
      ),
      trazo(
        [
          [126, 452],
          [212, 440],
          [298, 452],
          [384, 440],
        ],
        22,
      ),
    ],
  },

  /*
   * LA MAYOR GUARDIA: tres escudos en fila, el del medio más alto y con un galón hueco.
   *
   * TRES, y son las tres de `GUARDIA_MINIMA`, por lo mismo que las cinco losas del vado.
   *
   * Escudos y no yelmos: el yelmo ya es La Guardia, la carta que se juega, y las dos cosas
   * van a estar en la misma mano a la vez —quien tiene el premio es justamente quien más
   * guardias ha jugado, y suele tener alguna más guardada—. Dos yelmos de tamaños distintos
   * en la misma mano es la peor confusión posible: parecen la misma carta repetida.
   *
   * El del medio más alto y más ancho, que es lo que convierte «tres escudos» en «el mayor»
   * sin una sola letra. El galón se vacía en el del medio y sólo en él: en los tres, a este
   * tamaño, se leerían como tres bultos con ruido.
   */
  {
    carta: 'mayorguardia',
    que: 'Tres escudos en fila, el del medio más alto y con un galón hueco.',
    contornos: [
      macizo(escudo(104, 180, 124, 210)),
      macizo(escudo(408, 180, 124, 210)),
      macizo(escudo(256, 120, 140, 250)),
      hueco([
        [206, 196],
        [256, 222],
        [306, 196],
        [306, 224],
        [256, 250],
        [206, 224],
      ]),
    ],
  },

  /*
   * ═══ Y EL DUODÉCIMO, QUE NO ES NI CARTA NI PREMIO: EL MAZO DE LA BARRA ═══
   *
   * `comprarcarta` no se pinta nunca en la mano de la izquierda. Es la cara del CUARTO
   * HUECO DE LA BARRA DE CONSTRUIR, el que se pulsa para comprar una carta, y vive en
   * este mismo mapa por la misma razón que los dos premios: quien pinta un naipe busca su
   * dibujo en un solo sitio (`CONTORNOS_DE_LA_CARTA`), y `escenas/delta.tsx` no tiene otro
   * en el que mirar.
   *
   * ═══ POR QUÉ NO SE REUTILIZA EL DEL MOLINO NI NINGÚN OTRO ═══
   *
   * Porque los once de arriba dicen QUÉ CARTA ES, y éste tiene que decir UNA ACCIÓN. El
   * molino puesto en la barra prometería «El Molino», que es una de las cinco cartas que
   * pueden salir y no la que va a salir: sería enseñar el premio de la rifa en el boleto.
   * Lo que se compra es una carta TAPADA, y el dibujo tiene que decir eso.
   *
   * ═══ QUÉ SE VE, Y POR QUÉ ASÍ ═══
   *
   * Un mazo visto de canto —tres losas apiladas y descuadradas, como una pila de naipes
   * que nadie ha igualado— y encima una cruz grande. La cruz es lo que convierte «hay un
   * mazo» en «coge una más», y no lleva ni una letra, que es lo que hace falta: este
   * dibujo se ve en cuatro idiomas y a ciento diez píxeles.
   *
   * NADA SE SOLAPA, y es a propósito y no casualidad: `toShapes` decide qué contorno es
   * agujero de qué forma mirando quién contiene a quién, y dos macizos superpuestos son la
   * manera de que uno desaparezca sin un error en ninguna parte —ver la revisión que
   * cuenta los contornos aprovechados—. Los tres del mazo se separan por su hueco de aire
   * y la cruz se queda por encima del más alto sin tocarlo.
   *
   * Y NO HAY AGUJEROS: es el único de los doce sin detalle vaciado. No le hace falta —la
   * silueta ya son cuatro formas grandes y ninguna se parece a las otras once— y meterlo
   * sería detalle fino en el dibujo que más pequeño se ve de todos, porque la barra encoge
   * en un móvil de pie y la mano no.
   */
  {
    carta: 'comprarcarta',
    que: 'Un mazo de tres naipes apilados de canto y, encima, una cruz de coger otro.',
    contornos: (() => {
      /* Una losa del mazo: su centro y su medida, que se repiten tres veces descuadradas. */
      const losa = (cx: number, cy: number): Punto[] => [
        [cx - 130, cy - 26],
        [cx + 130, cy - 26],
        [cx + 130, cy + 26],
        [cx - 130, cy + 26],
      ];
      /* La cruz, en dos brazos que se cruzan escritos como un solo contorno de doce puntos. */
      const brazo = 96;
      const grueso = 28;
      const cx = 256;
      const cy = 128;
      const cruz: Punto[] = [
        [cx - grueso, cy - brazo],
        [cx + grueso, cy - brazo],
        [cx + grueso, cy - grueso],
        [cx + brazo, cy - grueso],
        [cx + brazo, cy + grueso],
        [cx + grueso, cy + grueso],
        [cx + grueso, cy + brazo],
        [cx - grueso, cy + brazo],
        [cx - grueso, cy + grueso],
        [cx - brazo, cy + grueso],
        [cx - brazo, cy - grueso],
        [cx - grueso, cy - grueso],
      ];
      return [
        macizo(losa(256, 402)),
        macizo(losa(276, 330)),
        macizo(losa(246, 258)),
        macizo(cruz),
      ];
    })(),
  },
];

/*
 * LA SAL, EL QUINTO BIEN, Y EL ÚNICO DE LA CASA. Léase entero antes de moverla.
 *
 * De los cinco bienes de Riberas, `sal` es el único que no viene de un `.svg`, y no por
 * descuido: el icono ajeno que le tocaba era una oveja de otro juego, y enseñar un bien que
 * no se tiene en la pantalla con la que se decide qué ofrecer es peor que no enseñar nada.
 * Así que se dibujó aquí —cuatro eras de evaporación en perspectiva y el montón recogido—,
 * con las mismas herramientas que las nueve cartas del mazo y por el mismo motivo: un dibujo
 * escrito en coordenadas, con su cabecera contando qué se ve, no tiene dudas de procedencia.
 *
 * ═══ ESTUVO APAGADA, Y CONVIENE SABER POR QUÉ SE ENCENDIÓ ═══
 *
 * Vivió una temporada fuera de `CONTORNOS_DEL_BIEN`, dibujada pero sin repartir, para que
 * activarla fuera la decisión de alguien y no un efecto lateral de recompilar. El argumento
 * para dejarla apagada era que una sal de la casa entre cuatro de Delapouite son cinco
 * iconos de dos manos distintas, que es lo que `arte/game-icons/LEEME.md` avisa que más se
 * nota.
 *
 * Se encendió porque el otro platillo pesa más: la mezcla de manos se lee como cuatro
 * provisionales a medio sustituir, y la carta sin dibujo se lee como un fallo del programa.
 * Quien jugaba preguntó por la carta muda, no por el cambio de trazo.
 *
 * Lo que NO cambia con esto: los otros cuatro siguen siendo arte ajeno y provisional, y su
 * condición para quedarse sigue estando en `LEEME.md`. Esto adelanta uno de los cinco; no
 * cierra el encargo.
 *
 * ═══ Y SIGUE HABIENDO UN SEGUNDO PASO QUE ESTE FICHERO NO PUEDE DAR ═══
 *
 * `escenas/scripts/verificar-escena.ts` afirma «y `sal` sigue SIN icono». Mientras esa línea
 * no diga lo contrario, la batería queda en rojo por esta decisión — que es exactamente para
 * lo que se escribió. Se cambia a mano, allí.
 */
const SAL: Dibujo = {
  carta: 'sal',
  que: 'Cuatro eras de evaporación en perspectiva y, delante, el montón recogido.',
  contornos: [
    macizo([
      [176, 168],
      [250, 168],
      [246, 214],
      [166, 214],
    ]),
    macizo([
      [262, 168],
      [336, 168],
      [346, 214],
      [266, 214],
    ]),
    macizo([
      [156, 228],
      [248, 228],
      [242, 286],
      [140, 286],
    ]),
    macizo([
      [264, 228],
      [356, 228],
      [372, 286],
      [270, 286],
    ]),
    macizo([
      [150, 444],
      [362, 444],
      [256, 318],
    ]),
  ],
};

// ---------------------------------------------------------------------------

/**
 * LO QUE SE COMPRUEBA DE CADA DIBUJO, Y POR QUÉ SE COMPRUEBA AQUÍ.
 *
 * Un icono mal armado no falla: se dibuja igual y sale raro, y «sale raro» se lee como una
 * decisión de arte. Estas cuatro medidas son las que separan un dibujo de un accidente, y
 * ninguna se puede ver mirando el fichero generado.
 *
 * La tercera es la que de verdad justifica esto. `toShapes` DESCARTA en silencio todo
 * contorno que, según la regla `nonzero`, no cambie nada: un agujero enrollado al revés, o
 * un trozo encerrado dentro de otro sin querer. No avisa, no falla, simplemente no está.
 * Contando cuántos contornos entran y cuántos salen, ese silencio se convierte en un rojo.
 *
 * Se comprueba aquí ADEMÁS de en `verify:escena`, y no en su lugar. La batería de la
 * escena mira lo suyo: que la mano encuentre los nueve nombres que pide y que den
 * geometría. Eso no dice nada de si el dibujo está bien armado, porque un icono al que le
 * falta un agujero da geometría estupendamente. Y sobre todo llega tarde: quien mueve un
 * punto lo mueve aquí, y aquí es donde tiene que enterarse.
 */
function revisa(dibujo: Dibujo): { contornos: number; puntos: number; triangulos: number } {
  const donde = `el dibujo de ${dibujo.carta}`;
  const contornos = dibujo.contornos;

  if (contornos.length === 0 || contornos.length > 12) {
    console.error(
      `${donde} tiene ${String(contornos.length)} contornos, y el trato son doce como mucho.\n` +
        'Se ve a tamaño de carta en un móvil: lo que no cabe en una docena de formas grandes\n' +
        'no se lee, se emborrona.',
    );
    process.exit(2);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let puntos = 0;
  for (const contorno of contornos) {
    if (contorno.length < 6) {
      console.error(`${donde} trae un contorno de menos de tres puntos.`);
      process.exit(2);
    }
    for (let i = 0; i + 1 < contorno.length; i += 2) {
      const x = contorno[i] as number;
      const y = contorno[i + 1] as number;
      if (x < 0 || x > LIENZO || y < 0 || y > LIENZO) {
        console.error(`${donde} se sale del lienzo por (${String(x)}, ${String(y)}).`);
        process.exit(2);
      }
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      puntos++;
    }
  }

  /*
   * Que LLENE el lienzo. Cada icono se normaliza por su lado mayor al pintarlo, así que
   * uno dibujado pequeño no sale pequeño: sale igual de grande y con menos puntos, o sea
   * más basto. Lo que sí se nota es lo contrario, un dibujo alargado: encajado por el lado
   * mayor, queda estrecho al lado de sus compañeros. Con esto los nueve salen parecidos.
   */
  const mayor = Math.max(maxX - minX, maxY - minY);
  const menor = Math.min(maxX - minX, maxY - minY);
  if (mayor < LIENZO * 0.5) {
    console.error(`${donde} sólo ocupa ${String(Math.round(mayor))} del lienzo de ${String(LIENZO)}.`);
    process.exit(2);
  }
  if (menor < mayor * 0.55) {
    console.error(
      `${donde} mide ${String(Math.round(maxX - minX))}×${String(Math.round(maxY - minY))}: ` +
        'demasiado alargado, y encajado por el lado mayor saldrá flaco al lado de los otros.',
    );
    process.exit(2);
  }

  const camino = new ShapePath();
  for (const contorno of contornos) {
    camino.moveTo(contorno[0] as number, contorno[1] as number);
    for (let i = 2; i + 1 < contorno.length; i += 2) {
      camino.lineTo(contorno[i] as number, contorno[i + 1] as number);
    }
  }
  const formas = camino.toShapes();
  const aprovechados = formas.reduce((total, f) => total + 1 + f.holes.length, 0);
  if (aprovechados !== contornos.length) {
    console.error(
      `${donde} entra con ${String(contornos.length)} contornos y sale con ${String(aprovechados)}.\n` +
        'Los que faltan los ha descartado `toShapes` por no cambiar nada: casi siempre es un\n' +
        'agujero enrollado al derecho, o una pieza que ha quedado dentro de otra sin querer.\n' +
        'No fallaría en pantalla; simplemente no se vería.',
    );
    process.exit(2);
  }

  const geometria = geometriaDeContornos(contornos);
  if (geometria === null) {
    console.error(`${donde} no da geometría.`);
    process.exit(2);
  }
  const triangulos = cuantosTriangulos(geometria);
  if (triangulos < 8) {
    console.error(`${donde} sólo da ${String(triangulos)} triángulos.`);
    process.exit(2);
  }
  geometria.dispose();

  return { contornos: contornos.length, puntos, triangulos };
}


// ---------------------------------------------------------------------------

/**
 * LAS CIFRAS DE LAS FICHAS: del 2 al 12 sin el 7, dibujadas en contornos como todo lo demás.
 *
 * ═══ POR QUÉ UN NÚMERO SE DIBUJA A MANO EN VEZ DE ESCRIBIRSE ═══
 *
 * Porque no hay con qué escribirlo. Un texto en tres dimensiones pide una fuente —cargada
 * por red o empaquetada, y rasterizada por un trabajador que `expo-gl` no tiene— o un
 * lienzo del navegador, y la app no tiene DOM: es la misma pared contra la que ya chocó el
 * mar cuando quiso leer un píxel de una textura. Los iconos de los bienes y de las cartas
 * la esquivaron convirtiendo el arte en CÓDIGO, listas de puntos que sólo hay que
 * enhebrar, y las cifras entran por esa misma puerta. Once dibujos más, del mismo tipo,
 * con las mismas reglas y el mismo comprobador.
 *
 * ═══ ONCE CIFRAS ENTERAS, Y NO DIEZ GUARISMOS ═══
 *
 * Se podría haber dibujado cada guarismo una vez y componer el «12» con un «1» y un «2».
 * No se hace, y la razón es la normalización: `geometriaDeContornos` encaja cada dibujo
 * por su lado mayor en un cuadrado de lado uno, así que un «1» suelto saldría tan ancho
 * como un «8», y un «12» compuesto de dos piezas normalizadas por separado tendría los dos
 * guarismos de tamaños distintos. Dibujando la cifra entera —los dos guarismos en el mismo
 * lienzo, con su aire entre ellos— la escena la pide por su nombre, la escala una vez, y
 * el «6» y el «12» salen a la misma altura sobre la misma ficha. Once entradas, con la
 * llave que la escena pide: `String(cifra)`.
 *
 * Los guarismos sí se comparten por dentro: cada uno es una función de su caja, y el «1»
 * del «11» y el del «12» son el mismo trazo en dos sitios. Lo que se emite es la cifra.
 *
 * ═══ LO QUE SE VE ═══
 *
 * Cintas de 64 de grosor en las de un guarismo y 56 en las de dos, sobre una caja de 400
 * de alto: son las más gordas de todo el fichero, y es porque el disco de la ficha mide
 * doce unidades de radio y se mira desde la altura de juego, donde un trazo de carta
 * desaparecería. El 6 y el 8 no se distinguen aquí: van del mismo crema oscuro que el
 * resto, y es la ESCENA la que los pinta en rojo, porque el color es suyo y el dibujo
 * no tiene por qué saber qué dos números salen más.
 */

/** Una elipse cerrada, para los anillos del 0, del 6, del 8 y del 9. */
function elipse(cx: number, cy: number, rx: number, ry: number, lados: number): Punto[] {
  const puntos: Punto[] = [];
  for (let i = 0; i < lados; i++) {
    const a = (2 * Math.PI * i) / lados;
    puntos.push([cx + rx * Math.cos(a), cy - ry * Math.sin(a)]);
  }
  return puntos;
}

/** Un anillo: la elipse maciza y su hueco. Dos contornos, y el hueco enrollado al revés. */
function anillo(cx: number, cy: number, rx: number, ry: number, grosor: number): number[][] {
  return [macizo(elipse(cx, cy, rx, ry, 40)), hueco(elipse(cx, cy, rx - grosor, ry - grosor, 40))];
}

/** La caja de todo guarismo: 400 de alto. El ancho lo pone quien lo coloca. */
const ALTO_DEL_GUARISMO = 400;

type Guarismo = (x: number, y: number, ancho: number, grosor: number) => number[][];

/**
 * LOS DIEZ GUARISMOS, cada uno en su caja de `ancho × 400` con el origen arriba a la
 * izquierda. Ninguno se emite suelto: se emiten las cifras de abajo.
 */
const GUARISMOS: Readonly<Record<string, Guarismo>> = {
  '0': (x, y, w, g) => anillo(x + w / 2, y + ALTO_DEL_GUARISMO / 2, w / 2, ALTO_DEL_GUARISMO / 2, g),
  /* Con bandera y con pie, para que no sea un palo: encajado por el lado mayor, un palo
     sale tan ancho como un ocho. */
  '1': (x, y, w, g) => [
    trazo([[x + w * 0.22, y + g * 0.9], [x + w * 0.62, y + g / 2], [x + w * 0.62, y + ALTO_DEL_GUARISMO - g / 2]], g),
    trazo([[x + w * 0.16, y + ALTO_DEL_GUARISMO - g / 2], [x + w * 0.96, y + ALTO_DEL_GUARISMO - g / 2]], g),
  ],
  /* El arco y la diagonal en un trazo y la base en otro: el codo de abajo a la izquierda es
     tan cerrado que el inglete disparaba una púa fuera del número. */
  '2': (x, y, w, g) => [
    trazo([...arco(x + w / 2, y + w / 2, w / 2 - g / 2, 190, -40, 12), [x + g / 2, y + ALTO_DEL_GUARISMO - g / 2]], g),
    trazo([[x + g / 2, y + ALTO_DEL_GUARISMO - g / 2], [x + w - g / 2, y + ALTO_DEL_GUARISMO - g / 2]], g),
  ],
  '3': (x, y, w, g) => {
    const r = ALTO_DEL_GUARISMO / 4 - g / 4;
    return [
      trazo([[x + g / 2, y + g / 2], ...arco(x + w / 2, y + r + g / 2, r, 90, -90, 10)], g),
      trazo([...arco(x + w / 2, y + ALTO_DEL_GUARISMO - r - g / 2, r, 90, -90, 10), [x + g / 2, y + ALTO_DEL_GUARISMO - g / 2]], g),
    ];
  },
  /* Con sólo dos cintas se queda en seis triángulos, por debajo del trato de ocho. El pie
     se lo da un tercer trazo, que además lo asienta como al 1. */
  '4': (x, y, w, g) => [
    trazo([[x + w * 0.72, y + g / 2], [x + g / 2, y + ALTO_DEL_GUARISMO * 0.66], [x + w - g / 2, y + ALTO_DEL_GUARISMO * 0.66]], g),
    trazo([[x + w * 0.72, y + g / 2], [x + w * 0.72, y + ALTO_DEL_GUARISMO - g / 2]], g),
    trazo([[x + w * 0.5, y + ALTO_DEL_GUARISMO - g / 2], [x + w * 0.94, y + ALTO_DEL_GUARISMO - g / 2]], g),
  ],
  '5': (x, y, w, g) => {
    const r = ALTO_DEL_GUARISMO * 0.31;
    return [
      trazo([[x + w - g / 2, y + g / 2], [x + g / 2, y + g / 2], [x + g / 2, y + ALTO_DEL_GUARISMO * 0.46]], g),
      trazo([[x + g / 2, y + ALTO_DEL_GUARISMO * 0.46], ...arco(x + w / 2, y + ALTO_DEL_GUARISMO - r - g / 2, r, 100, -88, 12), [x + g / 2, y + ALTO_DEL_GUARISMO - g / 2]], g),
    ];
  },
  /* El rabo es un arco cuyo punto más alto cae justo en el techo de la caja, ni un pelo
     más arriba: la primera versión se salía del lienzo por doce unidades. */
  '6': (x, y, w, g) => {
    const r = ALTO_DEL_GUARISMO * 0.29;
    const cy = y + ALTO_DEL_GUARISMO - r - g / 2;
    return [
      ...anillo(x + w / 2, cy, w / 2, r + g / 2, g),
      trazo([...arco(x + w * 0.5 + 20, y + w * 0.5 + 10, w * 0.5 - g / 2 + 10, 70, 178, 8), [x + g / 2 + 4, cy]], g),
    ];
  },
  '8': (x, y, w, g) => {
    const ra = ALTO_DEL_GUARISMO * 0.24;
    const rb = ALTO_DEL_GUARISMO * 0.29;
    return [
      ...anillo(x + w / 2, y + ra + g / 2 - 4, w * 0.44, ra, g),
      ...anillo(x + w / 2, y + ALTO_DEL_GUARISMO - rb - g / 2 + 4, w / 2, rb, g),
    ];
  },
  /* El espejo del 6: el punto más bajo del rabo cae justo en el suelo de la caja. */
  '9': (x, y, w, g) => {
    const r = ALTO_DEL_GUARISMO * 0.29;
    const cy = y + r + g / 2;
    return [
      ...anillo(x + w / 2, cy, w / 2, r + g / 2, g),
      trazo([[x + w - g / 2 - 4, cy], ...arco(x + w * 0.5 - 20, y + ALTO_DEL_GUARISMO - w * 0.5 - 10, w * 0.5 - g / 2 + 10, -2, -110, 8)], g),
    ];
  },
};

function guarismo(cual: string, x0: number, ancho: number, grosor: number): number[][] {
  const dibuja = GUARISMOS[cual];
  if (dibuja === undefined) {
    console.error(`No hay guarismo para «${cual}».`);
    process.exit(2);
  }
  return dibuja(x0, (LIENZO - ALTO_DEL_GUARISMO) / 2, ancho, grosor);
}

/**
 * UNA CIFRA ENTERA en el lienzo: un guarismo en una caja de 300 centrada, o dos en cajas
 * de 214 con 40 de aire, que es lo que deja al «12» a la misma altura que al «6».
 */
function cifra(n: number): Dibujo {
  const texto = String(n);
  const contornos =
    texto.length === 1
      ? guarismo(texto, (LIENZO - 300) / 2, 300, 64)
      : [
          ...guarismo(texto[0] as string, (LIENZO - (2 * 214 + 40)) / 2, 214, 56),
          ...guarismo(texto[1] as string, (LIENZO - (2 * 214 + 40)) / 2 + 214 + 40, 214, 56),
        ];
  return { carta: texto, que: `La cifra ${texto}, como se lee en la ficha de la comarca.`, contornos };
}

/** Las once que salen en un delta: las de `NUMEROS_DE_LAS_ISLAS`, sin el siete. */
const CIFRAS: readonly Dibujo[] = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map(cifra);

const revisiones = new Map<string, ReturnType<typeof revisa>>();
for (const dibujo of [...CARTAS, SAL, ...CIFRAS]) {
  if (revisiones.has(dibujo.carta)) {
    console.error(`Hay dos dibujos con la llave ${dibujo.carta}.`);
    process.exit(2);
  }
  revisiones.set(dibujo.carta, revisa(dibujo));
}

// ---------------------------------------------------------------------------

function comoTira(contorno: readonly number[]): string {
  return `    [${contorno.join(',')}],`;
}

/*
 * LOS CINCO BIENES EN UN SOLO MAPA, y los cuatro de `.svg` van DELANTE a propósito.
 *
 * `BIENES_CON_ICONO` sale de `Object.keys` de este mapa, o sea que este orden es el que
 * alguien va a leer al mirar la lista. Los cuatro provisionales primero y la sal al final
 * deja a la vista de un vistazo cuántos siguen siendo arte prestado — que es la cuenta que
 * `arte/game-icons/LEEME.md` pide no perder de vista.
 *
 * Y la sal lleva su `/** ... *\/` con lo que se ve, como las cartas, porque un dibujo hecho
 * en coordenadas no tiene fichero de origen que consultar: lo que se ve se cuenta aquí o no
 * se cuenta en ninguna parte.
 */
const cuerpo = [
  ...iconos.map((i) => `  ${i.bien}: [\n${i.contornos.map(comoTira).join('\n')}\n  ],`),
  `  /** ${SAL.que} */\n  ${SAL.carta}: [\n${SAL.contornos.map(comoTira).join('\n')}\n  ],`,
].join('\n');

const cuerpoDeLasCifras = CIFRAS.map(
  (d) => `  /** ${d.que} */\n  '${d.carta}': [\n${d.contornos.map(comoTira).join('\n')}\n  ],`,
).join('\n');

const cuerpoDeLasCartas = CARTAS.map(
  (d) =>
    `  /** ${d.que} */\n  ${d.carta}: [\n${d.contornos.map(comoTira).join('\n')}\n  ],`,
).join('\n');

const salida = `/**
 * LOS ICONOS DE RIBERAS: los bienes y las cartas del mazo, en contornos de puntos.
 *
 * ═══ ESTE FICHERO SE GENERA. NO SE EDITA A MANO ═══
 *
 * Lo escribe \`escenas/scripts/compilar-iconos.ts\`. Cualquier cambio hecho aquí desaparece
 * en la siguiente compilación, y desaparece EN SILENCIO: el dibujo se ve hasta que alguien
 * vuelva a compilar. Si hay que mover un punto, se mueve allí.
 *
 * Los dos mapas tienen orígenes distintos, y conviene saber cuál se está tocando:
 *
 *  · \`CONTORNOS_DEL_BIEN\` es de dos manos, y hay que saberlo antes de tocarlo. Los cuatro
 *    primeros —limo, junco, piedra, grano— salen de los \`.svg\` de \`arte/game-icons/\`: arte
 *    AJENO y PROVISIONAL, de Delapouite, game-icons.net, CC BY 3.0, con su condición para
 *    quedarse escrita en \`arte/game-icons/LEEME.md\`. La sal, la última, NO: está dibujada
 *    en coordenadas dentro del compilador, como las cartas, porque ninguno de los iconos
 *    ajenos significaba sal.
 *  · \`CONTORNOS_DE_LA_CARTA\` no sale de ningún fichero: está dibujado en coordenadas
 *    dentro del compilador, que es su original. Es de la casa.
 *
 * Todo viene en tiras llanas de \`x, y, x, y\` en el sistema de coordenadas de SVG, con un
 * lienzo de ${String(LIENZO)}×${String(LIENZO)} y la \`y\` creciendo HACIA ABAJO. Quien los dibuje en tres
 * dimensiones tiene que darles la vuelta en \`y\`, o el trigo sale cabeza abajo.
 *
 * Un contorno metido dentro de otro es un AGUJERO, y sale enrollado al revés a propósito:
 * es lo que \`ShapePath.toShapes\` mira para distinguir un hueco de una silueta.
 *
 * Vienen aplanados y no como trazos de SVG por una razón dura: analizar SVG en tiempo de
 * ejecución exige \`DOMParser\`, que es del navegador y NO existe en React Native. Un
 * icono analizado al vuelo se vería en el escritorio y saldría vacío en la app, sin un
 * error en ninguna consola. Ver \`escenas/scripts/aplana-trazo.ts\`.
 */

/** El lienzo cuadrado en el que están dibujados todos. */
export const LIENZO_DEL_ICONO = ${String(LIENZO)};

/**
 * Los contornos de cada bien, ya sin el rectángulo de fondo y ya aplanados.
 *
 * Los cuatro primeros vienen de \`.svg\` ajenos; \`sal\` está dibujada en el compilador y es
 * de la casa. Se reparten por el mismo mapa a propósito: quien pinta una carta no tiene por
 * qué saber de dónde salió el trazo.
 */
export const CONTORNOS_DEL_BIEN: Readonly<Record<string, readonly (readonly number[])[]>> = {
${cuerpo}
};

/** Los bienes que tienen icono. Sirve para comprobar que no falta ninguno. */
export const BIENES_CON_ICONO: readonly string[] = Object.keys(CONTORNOS_DEL_BIEN);

/**
 * LOS DIBUJOS DE LOS NAIPES DE RIBERAS: las nueve cartas del mazo y los DOS PREMIOS.
 *
 * Las nueve primeras llaves son las familias de \`docs/LAS-CARTAS-DE-RIBERAS.md\`: las
 * cuatro que se juegan y los cinco títulos, que valen un punto cada uno y sólo se
 * distinguen por el dibujo — de ahí que sean cinco y no uno repetido cinco veces.
 *
 * Las tres últimas NO son cartas del mazo, y no son lo mismo entre sí. \`vado\` y
 * \`mayorguardia\` son los PREMIOS, que no están en el mazo y no se compran: se pintan como
 * naipe en la misma mano. \`comprarcarta\` no se pinta en ninguna mano — es la cara del
 * cuarto hueco de la BARRA DE CONSTRUIR, el que se pulsa para comprar.
 *
 * Las tres viven en el mismo mapa por lo mismo: quien pinta un naipe busca su dibujo en un
 * solo sitio, y una segunda tabla obligaría a la escena a saber de premios y de barras para
 * elegir en cuál mirar.
 *
 * Se pintan igual que los bienes: crema plano sobre el color de la familia, encajados por
 * su lado mayor en un cuadrado de lado uno. Quien los coloque no tiene que saber nada más.
 */
export const CONTORNOS_DE_LA_CARTA: Readonly<Record<string, readonly (readonly number[])[]>> = {
${cuerpoDeLasCartas}
};

/** Los naipes que tienen dibujo, cartas y premios. Sirve para comprobar que no falta ninguno. */
export const CARTAS_CON_ICONO: readonly string[] = Object.keys(CONTORNOS_DE_LA_CARTA);

/**
 * LAS CIFRAS DE LAS FICHAS, del 2 al 12 sin el 7, con la llave \`String(cifra)\`.
 *
 * Están dibujadas en el compilador como las cartas, y por la misma razón que todo lo
 * demás de este fichero: no hay fuente ni lienzo del navegador en la app, así que un
 * número que se quiera ver en tres dimensiones tiene que ser un contorno. Cada entrada es
 * la cifra ENTERA —el «12» trae sus dos guarismos en el mismo lienzo— para que la escena la
 * escale una vez y todas salgan a la misma altura sobre la misma ficha.
 *
 * Van del mismo color que los puntos de la ficha; el 6 y el 8 los pinta en rojo la escena.
 */
export const CONTORNOS_DE_LA_CIFRA: Readonly<Record<string, readonly (readonly number[])[]>> = {
${cuerpoDeLasCifras}
};

/** Las cifras que tienen dibujo. Sirve para comprobar que están las once de un delta. */
export const CIFRAS_CON_ICONO: readonly string[] = Object.keys(CONTORNOS_DE_LA_CIFRA);
`;

fs.writeFileSync(DESTINO, salida, 'utf8');

const kb = (salida.length / 1024).toFixed(1);
console.log(
  `\n  ${String(iconos.length + 1)} bienes + ${String(CARTAS.length)} cartas + ${String(CIFRAS.length)} cifras · ${kb} kB en ` +
    `${path.relative(RAIZ, DESTINO)}`,
);
for (const i of iconos) {
  console.log(
    `    ${i.bien.padEnd(14)} ${String(i.contornos.length).padStart(2)} contorno(s) · ` +
      `${String(i.puntos)} puntos   (de .svg)`,
  );
}
for (const [carta, medida] of revisiones) {
  console.log(
    `    ${carta.padEnd(14)} ${String(medida.contornos).padStart(2)} contorno(s) · ` +
      `${String(medida.puntos)} puntos · ${String(medida.triangulos)} triángulos` +
      `${carta === SAL.carta ? '   (bien, dibujada en casa)' : ''}`,
  );
}
