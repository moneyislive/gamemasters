/**
 * LO QUE EL MUNDO TIENE EN EL AGUA: MUELLES, BARCOS Y JUNCALES.
 *
 * ═══ POR QUÉ ESTO NO ESTÁ EN `poblar.ts` NI EN `delta.tsx` ═══
 *
 * `poblar` decide lo que crece en la TIERRA y mira el terreno; esto decide lo que se
 * amarra en el AGUA y mira la costa. Son dos preguntas con dos datos de entrada
 * distintos, y juntarlas obligaría a `poblar` a saber de hidrografía para nada.
 *
 * Y no está en `delta.tsx` por la razón de siempre en este árbol: `delta` importa
 * `three`, así que nada de lo que viva dentro se puede medir desde un guion de Node.
 * Aquí sólo hay aritmética —qué celda, en qué punto, con qué giro—, y por eso
 * `verify:escena` puede contar los muelles de doscientos tableros sin abrir una
 * ventana de dibujo.
 *
 * ═══ LAS REGLAS, QUE SON LAS DE UN PUERTO DE VERDAD ═══
 *
 * Un muelle no se pone donde queda bonito: se pone donde alguien lo construiría.
 *
 *   1. Sobre agua abierta, no sobre un charco. El muelle sale de una tesela de tierra
 *      que da al MAR —o sea, al exterior del mundo—, no a un lago interior de tres
 *      celdas.
 *   2. A ras del agua. La tesela tiene que estar en el nivel cero: un muelle al pie de
 *      un acantilado de tres escalones es una escalera, no un muelle.
 *   3. Donde hay gente. Se mira la habitabilidad de la celda, que es la misma cuenta
 *      con la que `poblar` decide dónde crece un pueblo — así el muelle sale JUNTO al
 *      caserío y no en el cabo desierto de al lado.
 *   4. Separados. Dos muelles pegados son un muelle mal dibujado. Se exige distancia
 *      entre ellos, y por eso se eligen por orden de mérito y no todos los que valen.
 *
 * Los barcos siguen la costa en vez de repartirse por el mar: un barco medieval navega
 * a la vista de tierra. Se sacan de la misma lista de celdas costeras, empujados mar
 * adentro unas cuantas teselas, y se comprueba que el sitio esté de verdad vacío — la
 * costa es dentada y el punto de enfrente puede caer sobre otra punta de tierra.
 *
 * ═══ CUÁNTOS, Y POR QUÉ NO SIEMPRE LOS MISMOS ═══
 *
 * El número sale del tablero, no de una constante: hay costas con seis muelles y
 * costas con uno. Es la misma regla que rige el agua —«no siempre tenemos que generar
 * más»— aplicada a lo que se construye encima.
 *
 * ═══ Y LOS JUNCALES, QUE SON LA OTRA MITAD DE LA MISMA PREGUNTA ═══
 *
 * Un junco no crece en cualquier agua: crece donde hace pie. O sea en el BORDE de un
 * cuerpo de agua —la celda que toca tierra—, nunca en mitad del canal, que es por
 * donde pasan los barcos y donde van las piedras. Por eso los juncales salen de aquí y
 * no de `poblar.ts`: la pregunta «¿qué celdas de agua tocan tierra?» necesita el índice
 * del mundo entero, que es exactamente el que ya se construye para saber dónde acaba la
 * costa.
 *
 * El nenúfar pide además agua QUIETA: se pone donde el borde es ancho —dos lados o más
 * mirando a tierra, o sea un remanso— y el junco en el resto. Un nenúfar en el filo de
 * una corriente se lo lleva la corriente.
 */

import type { Hex, Punto } from '../shared/mecanicas/malla-hexagonal';
import { centroDeHex, vecino } from '../shared/mecanicas/malla-hexagonal';
import type { Subtesela } from './relieve';
import { CUERPO, TIERRA } from './aguas';
import { RADIO_DE_TESELA } from './escala';
import { fraccion, revoltijo } from './revoltijo';

/**
 * LOS CANALES DE SORTEO: UNO POR DECISIÓN, Y NUNCA DOS DECISIONES EN UNO.
 *
 * Están separados de los del agua y de los del pueblo, y entre sí. La regla parece
 * pedantería hasta que se rompe, así que aquí queda escrito lo que costó:
 *
 * El juncal usaba el canal `JUNCO` para DOS cosas —la puerta de «¿hay mata en esta
 * celda?», con `(q, r)`, y el sorteo de «¿es nenúfar?», con `(q+i, r+i)`—. Para la
 * primera mata de cada celda, `i` vale cero: los dos argumentos son los mismos y el
 * segundo sorteo devolvía EL MISMO NÚMERO que el primero, del que ya se sabía que era
 * menor que 0,34. Como el umbral del nenúfar era 0,45, la primera mata de todo remanso
 * salía nenúfar SIEMPRE. Medido: 63 % de nenúfares donde el tope posible era 45 %.
 *
 * Y el ladeo tenía la misma avería por el mismo sitio, así que la primera mata de cada
 * celda se apartaba siempre hacia el mismo lado.
 *
 * Ninguna de las dos se ve mirando el tablero: se ven contando. Por eso la regla es de
 * escritura y no de revisión — un canal, una pregunta.
 */
/**
 * EL DESPLAZAMIENTO POR SEMILLA, que es lo que faltaba y no se veía.
 *
 * De los catorce canales de aquí, la semilla entraba SÓLO en los dos que deciden
 * cuántos muelles y cuántos barcos hay. Todo lo demás —el orden de los cantiles, la
 * distancia mar adentro, el rumbo, la holgura, la talla, dónde crece cada junco— era
 * función pura de `(q, r, lado)` con canal constante.
 *
 * Y como el tablero del catán es siempre `mallaDeRadio(2)`, el conjunto de subteselas
 * es el mismo en toda partida: los mismos cantiles salían primeros en el mismo orden y
 * la flota se colocaba en los mismos sitios. Medido sobre 40 tableros: 206 barcos
 * puestos en 12 SITIOS DISTINTOS, y uno de ellos con barco en 40 de 40. La cabecera de
 * `laMarinaDelMundo` prometía justo lo contrario.
 *
 * Los muelles se salvaban a medias por casualidad: su mérito pesa 0,75 de
 * habitabilidad, que sí depende de la semilla. 144 muelles en 57 sitios. O sea que el
 * fallo estaba tapado a medias por lo único que miraba el terreno.
 *
 * ═══ POR QUÉ NO SE USA EL 7.919 DE `relieve.ts` ═══
 *
 * `relieve.ts` y `aguas.ts` desplazan con `+ semilla · 7.919`, y `ruido.ts` separa los
 * dos ejes de su retorcido con ESE MISMO 7.919. Sumar el mismo primo por dos motivos
 * distintos hace que el canal `c` de la semilla `s+1` sea el canal `c + 7.919` de la
 * semilla `s`: el retorcido vertical de un tablero acaba siendo el horizontal del
 * siguiente. Está en la lista de lo que queda por mirar.
 *
 * Aquí se usa otro primo, y grande, para no añadir a ese enredo: con 104.729 el canal
 * más bajo de la semilla 1 queda a más de sesenta mil del más alto de la semilla 0, y
 * ninguna suma de canal y semilla puede caer encima de otra.
 */
const SALTO_DE_SEMILLA = 104_729;

const CANAL_DEL_MERITO = 41_011;
const CANAL_DEL_RUMBO = 41_017;
const CANAL_DEL_SENTIDO = 41_019;
const CANAL_DE_LA_HOLGURA = 41_021;
const CANAL_DE_LA_TALLA = 41_023;
const CANAL_DEL_GIRO = 41_027;
const CANAL_DE_LA_DISTANCIA = 41_029;
const CANAL_DEL_COLOR = 41_039;
const CANAL_DE_CUANTOS = 41_047;
const CANAL_DEL_JUNCO = 41_051;
const CANAL_DEL_NENUFAR = 41_053;
const CANAL_DEL_LADEO = 41_059;
const CANAL_DEL_ARRIMO = 41_063;
const CANAL_DEL_SITIO = 41_057;
const CANAL_DE_LA_VARIANTE = 41_069;
const CANAL_DE_LA_TALLA_DEL_BARCO = 41_077;

/** Cuánto mide un paso de tesela a tesela: la distancia entre dos centros vecinos. */
const PASO = Math.sqrt(3) * RADIO_DE_TESELA;

/**
 * CUÁNTOS MUELLES COMO MUCHO, y cuántos barcos.
 *
 * El tope de muelles es bajo a propósito. Un muelle es una obra grande —dos personas
 * de ancho y una tesela entera de largo— y seis de ellos en una costa de doscientas
 * treinta celdas ya se leen como un puerto; doce se leerían como un aparcamiento.
 */
const MUELLES_COMO_MUCHO = 6;
const BARCOS_COMO_MUCHO = 9;

/** A cuántas teselas de otro muelle tiene que estar un muelle. Medido en celdas. */
const MUELLES_APARTADOS = 9;
/** Y los barcos entre sí, que ocupan menos pero navegan. */
const BARCOS_APARTADOS = 5;

/** Desde qué habitabilidad se considera que ahí hay quien construya un muelle. */
const HABITABILIDAD_DE_PUERTO = 0.45;

/** Mar adentro: entre estas dos distancias, en teselas, navegan los barcos. */
const MAR_ADENTRO_MINIMO = 2.1;
const MAR_ADENTRO_MAXIMO = 5.4;

/**
 * QUÉ PARTE DE LA ORILLA SE CUBRE DE VEGETACIÓN.
 *
 * Una de cada tres celdas de borde, no todas. Un cuerpo de agua con juncos en los
 * doscientos sesenta grados de su perímetro no es un lago: es una maceta. Lo que hace
 * que se lea como natural es que haya tramos pelados.
 */
const ORILLA_CON_PLANTA = 0.34;

/** Desde cuántos lados mirando a tierra se considera remanso, y crece el nenúfar. */
const LADOS_DE_REMANSO = 2;

/** Cuántas matas caben en una celda de agua. Ver `Juncal`. */
const MATAS_POR_CELDA = 3;

/** Un amarre puesto: dónde, con qué giro y a qué talla. */
export interface Amarre {
  /** El centro de la pieza, en el plano de la malla. */
  punto: Punto;
  /** El ángulo del pack: `atan2(-z, x)` de hacia dónde mira. */
  giro: number;
  /** El multiplicador de talla sobre la escala del pack. */
  talla: number;
  /** Para el muelle, cuál de los cuatro colores del pack le toca. */
  color: number;
}

/**
 * UNA MATA DENTRO DEL AGUA: junco o nenúfar.
 *
 * Lleva el NIVEL de su lámina y no su altura en unidades: la cota se calcula donde se
 * pinta, que es quien sabe lo que mide un escalón. Así este fichero sigue sin
 * depender de nada que no sea aritmética de la malla.
 */
export interface Mata {
  punto: Punto;
  giro: number;
  talla: number;
  /** El nivel entero de la lámina sobre la que flota. */
  nivelDelAgua: number;
  /** Si es nenúfar —agua quieta— o junco. */
  nenufar: boolean;
  /** Cuál de las variantes del pack, para que no salgan todas iguales. */
  variante: number;
}

/** Lo que hay en el agua alrededor de un mundo. */
export interface Marina {
  /** Los muelles, ya colocados sobre el agua de fuera y mirando a tierra. */
  muelles: Amarre[];
  /** Los barcos, navegando a la vista de la costa. */
  barcos: Amarre[];
  /** Los juncos y nenúfares de las orillas de dentro. */
  matas: Mata[];
  /** Cuántas celdas de tierra dan al mar. Sirve para comprobar, no para pintar. */
  celdasDeCosta: number;
}

/** Una celda de tierra que da al mar, con el lado por el que lo ve. */
interface Cantil {
  tesela: Subtesela;
  /** El lado de la malla por el que se abre el mar. */
  lado: number;
  /** El centro de la celda fantasma de enfrente: el primer trozo de agua abierta. */
  fuera: Punto;
  /** Hacia dónde queda el mar, normalizado. */
  hacia: Punto;
  /** El mérito de esta celda como puerto, entre 0 y 1. */
  merito: number;
}

/**
 * EL ÁNGULO DEL PACK DE UNA DIRECCIÓN.
 *
 * El pack numera por `atan2(-z, x)` con la `z` del mundo siendo la `y` de la malla, y
 * `rotation.y = +a` aumenta ese ángulo en `a`. Se calcula en vez de escribirse en una
 * tabla, que es la misma decisión que en `asentamiento.ts` y por el mismo motivo: una
 * tabla a mano deja de valer el día que la malla cambie de convenio, y el síntoma
 * sería un muelle girado sesenta grados metido en la playa.
 */
function anguloDelPack(d: Punto): number {
  return Math.atan2(-d.y, d.x);
}

/**
 * LAS CELDAS QUE DAN AL MAR ABIERTO.
 *
 * Mar abierto es el EXTERIOR del mundo, y no cualquier agua: un lago interior también
 * moja la tierra de alrededor y ahí no atraca nadie. Se reconoce porque la celda de
 * enfrente sencillamente NO EXISTE — más allá del último hexágono del mundo sólo está
 * el disco de mar que pinta `delta.tsx`.
 *
 * Se pide además que la celda sea TIERRA. Una celda de agua del borde —la boca de un
 * río que desemboca justo ahí— no es sitio de muelle: es la desembocadura.
 */
function cantiles(teselas: readonly Subtesela[], hay: ReadonlySet<string>): Cantil[] {
  const salida: Cantil[] = [];
  for (const t of teselas) {
    if (t.agua !== TIERRA) continue;
    for (let k = 0; k < 6; k++) {
      const v: Hex = vecino(t.sub, k);
      if (hay.has(`${String(v.q)},${String(v.r)}`)) continue;
      const fuera = centroDeHex(v, RADIO_DE_TESELA);
      const dx = fuera.x - t.centro.x;
      const dy = fuera.y - t.centro.y;
      const largo = Math.hypot(dx, dy) || 1;
      salida.push({
        tesela: t,
        lado: k,
        fuera,
        hacia: { x: dx / largo, y: dy / largo },
        merito: 0,
      });
    }
  }
  return salida;
}

/**
 * EL MÉRITO DE UNA CELDA COMO PUERTO.
 *
 * Manda la habitabilidad, que es lo que decide dónde hay pueblo; el sorteo sólo
 * desempata. Si mandara el sorteo, los muelles saldrían repartidos por la costa sin
 * relación con las casas, que es exactamente el aspecto de tablero generado a máquina
 * que se intenta evitar.
 */
function conMerito(lista: Cantil[], canal: (n: number) => number): Cantil[] {
  for (const c of lista) {
    const suerte = fraccion(c.tesela.sub.q, c.tesela.sub.r, canal(CANAL_DEL_MERITO));
    c.merito = c.tesela.habitabilidad * 0.75 + suerte * 0.25;
  }
  return lista;
}

/** Ordena por mérito con desempate ENTERO, que dos flotantes iguales no decidan. */
function porMerito(a: Cantil, b: Cantil): number {
  if (a.merito !== b.merito) return b.merito - a.merito;
  if (a.tesela.sub.q !== b.tesela.sub.q) return a.tesela.sub.q - b.tesela.sub.q;
  if (a.tesela.sub.r !== b.tesela.sub.r) return a.tesela.sub.r - b.tesela.sub.r;
  return a.lado - b.lado;
}

/** Escoge de una lista ya ordenada respetando una distancia mínima entre elegidos. */
function apartados(lista: readonly Cantil[], cuantos: number, aparte: number): Cantil[] {
  const puestos: Cantil[] = [];
  const minimo = (aparte * PASO) ** 2;
  for (const c of lista) {
    if (puestos.length >= cuantos) break;
    let cabe = true;
    for (const y of puestos) {
      const dx = c.tesela.centro.x - y.tesela.centro.x;
      const dy = c.tesela.centro.y - y.tesela.centro.y;
      if (dx * dx + dy * dy < minimo) {
        cabe = false;
        break;
      }
    }
    if (cabe) puestos.push(c);
  }
  return puestos;
}

/**
 * ¿CAE ESTE PUNTO SOBRE UNA TESELA DEL MUNDO?
 *
 * Se pregunta por la celda que lo contiene Y POR SUS SEIS VECINAS, no sólo por la
 * suya: un barco tiene una tesela de eslora, así que rozar la punta de un cabo con la
 * proa es meterse en tierra igual. Con el radio de una celda de margen, el casco entra
 * entero en el agua.
 *
 * El redondeo es el cúbico de toda la vida —tres coordenadas, se corrige la que más se
 * ha movido— y está escrito aquí en vez de importado porque `hexDePunto` vive en
 * `relieve.ts`, que ya importa este fichero por la cadena de tipos.
 */
function sobreTierra(p: Punto, hay: ReadonlySet<string>): boolean {
  const q = ((Math.sqrt(3) / 3) * p.x - (1 / 3) * p.y) / RADIO_DE_TESELA;
  const r = ((2 / 3) * p.y) / RADIO_DE_TESELA;
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;

  const centro: Hex = { q: rq, r: rr };
  if (hay.has(`${String(rq)},${String(rr)}`)) return true;
  for (let k = 0; k < 6; k++) {
    const v = vecino(centro, k);
    if (hay.has(`${String(v.q)},${String(v.r)}`)) return true;
  }
  return false;
}

/**
 * LOS JUNCALES: LO QUE CRECE EN EL FILO DE UN CUERPO DE AGUA.
 *
 * Sólo en `CUERPO` —agua ancha y quieta: lagos, remansos y los tramos navegables— y
 * nunca en `CAUCE`, que es el arroyo tallado dentro de la tesela del pack: ahí no cabe
 * ni una mata sin salirse del canal.
 *
 * Y sólo en las celdas que TOCAN TIERRA. Las matas se colocan además desplazadas hacia
 * el lado por el que está la tierra, no en el centro de la celda: un junco crece pegado
 * a la orilla, y uno plantado en mitad del agua se lee como un error aunque nadie sepa
 * decir cuál.
 */
function juncales(
  teselas: readonly Subtesela[],
  hay: ReadonlySet<string>,
  canal: (n: number) => number,
): Mata[] {
  const agua = new Set<string>();
  for (const t of teselas) if (t.agua === CUERPO) agua.add(`${String(t.sub.q)},${String(t.sub.r)}`);
  if (agua.size === 0) return [];

  const salida: Mata[] = [];
  for (const t of teselas) {
    if (t.agua !== CUERPO) continue;

    /* Los lados por los que esta celda de agua ve tierra, y hacia dónde caen. */
    const aTierra: Punto[] = [];
    for (let k = 0; k < 6; k++) {
      const v = vecino(t.sub, k);
      const llave = `${String(v.q)},${String(v.r)}`;
      /* Fuera del mundo es mar abierto, no orilla: ahí no hay juncal que valga. */
      if (!hay.has(llave) || agua.has(llave)) continue;
      const c = centroDeHex(v, RADIO_DE_TESELA);
      const dx = c.x - t.centro.x;
      const dy = c.y - t.centro.y;
      const largo = Math.hypot(dx, dy) || 1;
      aTierra.push({ x: dx / largo, y: dy / largo });
    }
    if (aTierra.length === 0) continue;
    if (fraccion(t.sub.q, t.sub.r, canal(CANAL_DEL_JUNCO)) > ORILLA_CON_PLANTA) continue;

    const remanso = aTierra.length >= LADOS_DE_REMANSO;
    const cuantas =
      1 + Math.floor(fraccion(t.sub.r, t.sub.q, canal(CANAL_DEL_SITIO)) * MATAS_POR_CELDA);
    for (let i = 0; i < cuantas; i++) {
      /*
       * Cada mata se arrima a UNO de los lados de tierra, repartidas entre los que haya,
       * y a una distancia sorteada del centro. El desplazamiento llega hasta ocho
       * décimas del radio: más y la mata asoma por encima del canto de la tesela vecina.
       */
      /*
       * El módulo va CORREGIDO, y no es manía. La `q` de una subtesela es negativa en
       * media malla, y `%` en JavaScript conserva el signo del dividendo: `-5 % 3` es
       * `-2`, no `1`. El índice negativo devolvía `undefined` y reventaba al leerle la
       * `x` — y el `as Punto` que había aquí se lo tragaba sin que el compilador dijera
       * nada, que es exactamente para lo que NO está una aserción de tipo.
       */
      const lado = aTierra[(((i + t.sub.q) % aTierra.length) + aTierra.length) % aTierra.length];
      if (lado === undefined) continue;
      const arrimo =
        (0.35 + fraccion(t.sub.q + i, t.sub.r, canal(CANAL_DEL_ARRIMO)) * 0.45) * RADIO_DE_TESELA;
      const ladeo =
        (fraccion(t.sub.q, t.sub.r + i, canal(CANAL_DEL_LADEO)) - 0.5) * RADIO_DE_TESELA * 0.5;
      salida.push({
        punto: {
          x: t.centro.x + lado.x * arrimo - lado.y * ladeo,
          y: t.centro.y + lado.y * arrimo + lado.x * ladeo,
        },
        giro: fraccion(t.sub.q + i * 7, t.sub.r, canal(CANAL_DEL_GIRO)) * Math.PI * 2,
        talla: 0.8 + fraccion(t.sub.r + i * 7, t.sub.q, canal(CANAL_DE_LA_TALLA)) * 0.7,
        nivelDelAgua: t.nivelDelAgua,
        nenufar: remanso && fraccion(t.sub.q + i, t.sub.r + i, canal(CANAL_DEL_NENUFAR)) < 0.45,
        variante: revoltijo(t.sub.q + i, t.sub.r, canal(CANAL_DE_LA_VARIANTE)) % 3,
      });
    }
  }
  return salida;
}

/**
 * DÓNDE HAY MUELLES, BARCOS Y JUNCALES EN ESTE MUNDO.
 *
 * `semilla` es la del tablero: dos tableros distintos tienen costas distintas y también
 * distinto NÚMERO de muelles, que es lo que hace que no se lean como el mismo mapa
 * repintado.
 */
export function laMarinaDelMundo(teselas: readonly Subtesela[], semilla: number): Marina {
  const hay = new Set<string>();
  for (const t of teselas) hay.add(`${String(t.sub.q)},${String(t.sub.r)}`);

  /*
   * El desviador de canal, igual que en `relieve.ts` y `aguas.ts`: cada pregunta se
   * hace en un canal distinto Y en un canal distinto POR TABLERO. Sin esto, todo lo de
   * abajo es una plantilla.
   */
  const canal = (n: number): number => n + semilla * SALTO_DE_SEMILLA;

  const matas = juncales(teselas, hay, canal);

  const costa = cantiles(teselas, hay);
  if (costa.length === 0) return { muelles: [], barcos: [], matas, celdasDeCosta: 0 };

  /*
   * CUÁNTOS. Sale del tablero entero y no de cada celda, porque es una propiedad del
   * mundo: hay mundos con puerto grande y mundos con un embarcadero.
   */
  const cuantosMuelles =
    1 + Math.floor(fraccion(semilla, 0, CANAL_DE_CUANTOS) * MUELLES_COMO_MUCHO);
  const cuantosBarcos =
    2 + Math.floor(fraccion(semilla, 1, CANAL_DE_CUANTOS) * (BARCOS_COMO_MUCHO - 1));

  /* Los muelles quieren nivel cero y vecindario. */
  const paraMuelle = conMerito(
    costa.filter(
      (c) => c.tesela.nivel === 0 && c.tesela.habitabilidad >= HABITABILIDAD_DE_PUERTO,
    ),
    canal,
  ).sort(porMerito);

  const muelles: Amarre[] = apartados(paraMuelle, cuantosMuelles, MUELLES_APARTADOS).map((c) => ({
    /*
     * El muelle se pone en la celda FANTASMA de enfrente, o sea ya sobre el agua, y su
     * eje largo apunta a tierra. Ese eje mide justo el ancho de una tesela, así que el
     * espigón llega desde la línea de playa hasta el otro lado de la celda.
     */
    punto: c.fuera,
    giro: anguloDelPack(c.hacia),
    talla: 1,
    color: revoltijo(c.tesela.sub.q, c.tesela.sub.r, canal(CANAL_DEL_COLOR)) % 4,
  }));

  /*
   * Y LOS BARCOS. Se sacan de toda la costa —también de la que no vale para muelle,
   * que es la mayoría— y se empujan mar adentro una distancia sorteada. El orden es un
   * sorteo y no el mérito: un barco no busca vecindario, y ordenarlos por habitabilidad
   * los amontonaría todos delante del mismo pueblo.
   */
  const paraBarco = [...costa].sort((a, b) => {
    /*
     * La clave lleva la `r` además de la `q`, y no es cosmético: con sólo `(q, lado)`
     * todos los cantiles de una misma columna de subteselas compartían clave, y el
     * desempate caía en `porMerito` — o sea en la habitabilidad, que es justo lo que el
     * comentario de abajo dice que NO debe ordenar los barcos.
     */
    const fa = fraccion(a.tesela.sub.q * 31 + a.tesela.sub.r, a.lado, canal(CANAL_DEL_RUMBO));
    const fb = fraccion(b.tesela.sub.q * 31 + b.tesela.sub.r, b.lado, canal(CANAL_DEL_RUMBO));
    if (fa !== fb) return fa - fb;
    return porMerito(a, b);
  });

  const barcos: Amarre[] = [];
  const yaPuestos: Punto[] = [];
  const separacion = (BARCOS_APARTADOS * PASO) ** 2;
  for (const c of paraBarco) {
    if (barcos.length >= cuantosBarcos) break;
    const lejos =
      MAR_ADENTRO_MINIMO +
      fraccion(c.tesela.sub.q, c.tesela.sub.r + c.lado, canal(CANAL_DE_LA_DISTANCIA)) *
        (MAR_ADENTRO_MAXIMO - MAR_ADENTRO_MINIMO);
    const punto = {
      x: c.tesela.centro.x + c.hacia.x * lejos * PASO,
      y: c.tesela.centro.y + c.hacia.y * lejos * PASO,
    };

    /* ¿Está de verdad en el agua? La costa es dentada y esto no es una formalidad. */
    if (sobreTierra(punto, hay)) continue;

    let cabe = true;
    for (const y of yaPuestos) {
      const dx = punto.x - y.x;
      const dy = punto.y - y.y;
      if (dx * dx + dy * dy < separacion) {
        cabe = false;
        break;
      }
    }
    if (!cabe) continue;

    /*
     * EL RUMBO. Un barco fondeado mirando a la playa no navega: navega a lo largo de la
     * costa. Se toma la perpendicular a la dirección de salida al mar, se elige uno de
     * los dos sentidos y se le mete hasta un tercio de vuelta de holgura, para que la
     * flota no salga formando línea.
     */
    const perpendicular = { x: -c.hacia.y, y: c.hacia.x };
    /* Lleva la `q` además de la `r`: sin ella, 267 de 455 cantiles giraban igual. */
    const alReves =
      fraccion(c.tesela.sub.r * 31 + c.tesela.sub.q, c.lado, canal(CANAL_DEL_SENTIDO)) < 0.5
        ? -1
        : 1;
    const holgura =
      (fraccion(c.tesela.sub.q + c.lado, c.tesela.sub.r, canal(CANAL_DE_LA_HOLGURA)) - 0.5) *
      (Math.PI / 3);
    barcos.push({
      punto,
      giro: anguloDelPack({ x: perpendicular.x * alReves, y: perpendicular.y * alReves }) + holgura,
      talla: 0.85 + fraccion(c.tesela.sub.q, c.lado, canal(CANAL_DE_LA_TALLA_DEL_BARCO)) * 0.4,
      color: 0,
    });
    yaPuestos.push(punto);
  }

  return { muelles, barcos, matas, celdasDeCosta: costa.length };
}
