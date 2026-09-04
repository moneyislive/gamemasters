/**
 * LA MALLA HEXAGONAL: identidades que nadie da de alta.
 *
 * ═══ POR QUÉ ESTO SUBE A `mecanicas/` Y NO SE QUEDA DENTRO DEL JUEGO ═══
 *
 * El §11 del diseño es tajante sobre lo que NO puede subir al vocabulario común:
 * los recursos con costes declarados, el trueque con ciclo de vida, la serpentina
 * y los premios derivados son campos del estado opaco de UN juego, y ascenderlos a
 * mecánica sería reconstruir el problema de CLUEDO con vocabulario de tablero.
 *
 * Y en la misma frase dice qué es lo ÚNICO que sube: la canonicalización
 * hexagonal. La razón es que no es una regla de ningún juego —es geometría— y que
 * hacerla mal no se nota hasta que es tarde:
 *
 *     UN VÉRTICE DE UNA MALLA HEXAGONAL TIENE TRES NOMBRES, Y UNA ARISTA DOS.
 *
 * Si cada juego de tablero se la reinventa, el primero que llegue guardará el
 * vértice como «el nordeste del hexágono (0,0)», el mismo punto entrará otro día
 * como «el noroeste del hexágono (1,-1)», y la regla de distancia dirá que están
 * libres los dos. Eso no es un fallo que se caiga: es un tablero que deja poner
 * dos casas en el mismo sitio, y se descubre jugando.
 *
 * ═══ LA DECISIÓN CENTRAL: LA IDENTIDAD ES EL CONJUNTO DE HEXÁGONOS ═══
 *
 * Un vértice se podría nombrar como «hexágono + esquina 0..5», que es lo que hace
 * casi todo el mundo. Aquí no, y a propósito: ese nombre tiene tres formas válidas
 * y hay que acordarse de normalizarlo en cada comparación. Lo que se hace es
 * derivar la identidad de lo que el punto ES:
 *
 *   · un VÉRTICE es el punto donde se tocan TRES hexágonos → su llave son esos
 *     tres, ordenados siempre igual;
 *   · una ARISTA es el lado donde se tocan DOS → su llave son esos dos, ordenados
 *     siempre igual.
 *
 * Con eso, los tres caminos por los que se puede llegar a un vértice producen la
 * MISMA cadena sin que nadie tenga que acordarse de nada, y esa cadena es
 * directamente utilizable como clave de un objeto del estado. Es la propiedad que
 * `verify:riberas` comprueba primero, porque es de la que cuelgan las demás.
 *
 * Y una consecuencia que conviene decir en voz alta: los hexágonos de la llave NO
 * TIENEN POR QUÉ EXISTIR EN EL TABLERO. El vértice de una esquina del mapa se
 * llama igual mirándolo desde dentro o desde el mar que no está dibujado. La
 * identidad es de la malla infinita; el tablero es un recorte de ella. Si la
 * identidad dependiera del recorte, ampliar el mapa renombraría los vértices.
 *
 * ═══ COORDENADAS AXIALES, Y LA PUNTA HACIA ARRIBA ═══
 *
 * Dos números por hexágono —`q` y `r`— en vez de tres de cubo: son la misma cosa
 * (`s = -q - r`) y el tercero es una oportunidad de guardar un estado incoherente
 * en el disco. Los hexágonos se dibujan con la PUNTA HACIA ARRIBA, que es lo que
 * fija dónde caen las seis esquinas y los seis vecinos, y por eso está escrito
 * aquí y no en el juego: dos ficheros con dos convenciones distintas dan un
 * tablero que se pinta bien y se juega mal.
 *
 * ═══ NADA DE TRIGONOMETRÍA, Y NO POR ELEGANCIA ═══
 *
 * `verify:pureza` prohíbe `Math.sin`, `Math.cos` y compañía en todo `mecanicas/`:
 * la especificación de ECMAScript las deja «implementation-approximated» y Hermes
 * y V8 devuelven últimos bits distintos, lo que hace divergir una repetición y
 * revienta `verify:determinismo` seis meses después en un solo modelo de móvil.
 *
 * Aquí no hacen falta: las seis esquinas de un hexágono con la punta arriba están
 * en múltiplos exactos de `√3/2` y de `1/2`, y `Math.sqrt` sí está fijada al bit
 * por IEEE 754. La geometría de esta malla sale entera de sumas, productos y una
 * raíz cuadrada.
 */

/** Un hexágono, en coordenadas axiales. El tercer eje de cubo es `-q - r`. */
export interface Hex {
  q: number;
  r: number;
}

/** Un punto del plano, para pintar. Nunca entra en el estado de una partida. */
export interface Punto {
  x: number;
  y: number;
}

/**
 * La llave de un hexágono: `"q,r"`.
 *
 * Son cadenas y no objetos porque el estado de un arcade se guarda, viaja y se
 * reejecuta: una clave de objeto es una cadena y punto. Un `Map` con objetos como
 * clave compara por identidad —dos `{q:0,r:0}` distintos son claves distintas— y
 * además `canonico.ts` rechaza los `Map` por no ser objetos llanos.
 */
export type LlaveDeHex = string;

/** La llave canónica de un vértice: los TRES hexágonos que lo tocan, ordenados. */
export type LlaveDeVertice = string;

/** La llave canónica de una arista: los DOS hexágonos que la comparten, ordenados. */
export type LlaveDeArista = string;

/**
 * LOS SEIS VECINOS, EN ORDEN ALREDEDOR DEL RELOJ.
 *
 * El orden importa y no es decorativo: la esquina `k` de un hexágono es el punto
 * donde se tocan él, el vecino `k` y el vecino `k+1`. Si esta lista dejara de ir
 * en círculo, las esquinas dejarían de ser esquinas y nadie se enteraría hasta ver
 * el tablero pintado.
 *
 * Con la punta hacia arriba: noroeste, nordeste, este, sudeste, suroeste y oeste.
 */
export const DIRECCIONES: readonly Hex[] = [
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
];

/** Cuántas esquinas y cuántos lados tiene un hexágono. Seis, y no es negociable. */
export const LADOS = 6;

/** La llave de un hexágono. */
export function llaveDeHex(h: Hex): LlaveDeHex {
  return `${h.q},${h.r}`;
}

/** De vuelta: la llave a hexágono. Lo usa quien lee una llave del estado. */
export function hexDeLlave(llave: LlaveDeHex): Hex {
  const partes = llave.split(',');
  return { q: Number(partes[0]), r: Number(partes[1]) };
}

/** Dos hexágonos son el mismo si sus dos coordenadas lo son. */
export function mismoHex(a: Hex, b: Hex): boolean {
  return a.q === b.q && a.r === b.r;
}

/**
 * El orden total entre hexágonos: por `q` y, a igualdad, por `r`.
 *
 * De aquí cuelga la canonicalización entera. Tiene que ser un orden TOTAL —dos
 * hexágonos distintos nunca empatan— porque si empataran, el `sort` decidiría por
 * el orden de llegada y el mismo vértice tendría dos llaves según por dónde se
 * hubiera entrado. Y va escrito como comparador explícito porque `verify:pureza`
 * prohíbe `sort()` sin comparador: el implícito ordena por texto y no es el mismo
 * en Hermes que en V8.
 */
export function comparaHex(a: Hex, b: Hex): number {
  if (a.q !== b.q) return a.q < b.q ? -1 : 1;
  if (a.r !== b.r) return a.r < b.r ? -1 : 1;
  return 0;
}

/** El vecino `k` de un hexágono, con `k` dando la vuelta si se pasa. */
export function vecino(h: Hex, k: number): Hex {
  const d = DIRECCIONES[((k % LADOS) + LADOS) % LADOS] as Hex;
  return { q: h.q + d.q, r: h.r + d.r };
}

/** Los seis vecinos, en el mismo orden que `DIRECCIONES`. */
export function vecinos(h: Hex): Hex[] {
  const salida: Hex[] = [];
  for (let k = 0; k < LADOS; k++) salida.push(vecino(h, k));
  return salida;
}

/**
 * La distancia en pasos de hexágono, por la fórmula de cubo.
 *
 * Solo restas, sumas, `Math.abs` y `Math.max`: nada de lo que `verify:pureza`
 * prohíbe, y por tanto el mismo entero en Node y en Hermes.
 */
export function distanciaHex(a: Hex, b: Hex): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -dq - dr;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
}

/** ¿Son vecinos? Es la pregunta de la que sale una arista. */
export function sonVecinos(a: Hex, b: Hex): boolean {
  return distanciaHex(a, b) === 1;
}

/**
 * LA CANONICALIZACIÓN, que es la pieza no negociable de este fichero.
 *
 * Un puñado de hexágonos ordenados y pegados con `|`. Los dos tipos de llave
 * salen de aquí, y por eso no hay dos algoritmos que puedan desincronizarse: si
 * mañana el orden cambia, cambia para vértices y aristas a la vez.
 */
function llaveDeConjunto(hexes: readonly Hex[]): string {
  const ordenados = [...hexes].sort(comparaHex);
  const piezas: string[] = [];
  for (const h of ordenados) piezas.push(llaveDeHex(h));
  return piezas.join('|');
}

/**
 * EL VÉRTICE `k` DE UN HEXÁGONO, dicho por los tres hexágonos que lo tocan.
 *
 * Las tres llamadas que nombran el mismo punto —desde cada uno de los tres
 * hexágonos, con su esquina correspondiente— devuelven la MISMA cadena. Eso es lo
 * que `verify:riberas` comprueba vértice a vértice sobre el tablero entero, y lo
 * que hace que la regla de distancia pueda escribirse comparando cadenas.
 */
export function verticeDeHex(h: Hex, k: number): LlaveDeVertice {
  return `v:${llaveDeConjunto([h, vecino(h, k), vecino(h, k + 1)])}`;
}

/** LA ARISTA `k`: el lado entre la esquina `k` y la `k+1`, o sea con el vecino `k+1`. */
export function aristaDeHex(h: Hex, k: number): LlaveDeArista {
  return `a:${llaveDeConjunto([h, vecino(h, k + 1)])}`;
}

/**
 * QUÉ CLASE DE SITIO NOMBRA ESTA LLAVE, mirándola.
 *
 * ═══ POR QUÉ SE DEDUCE Y NO VIAJA APARTE ═══
 *
 * Porque una llave YA dice lo que es: las de vértice empiezan por `v:` y las de arista
 * por `a:`. Cuando la clase viaja al lado de la lista, existe el estado «clase que no
 * cuadra con las llaves» — y ese estado no es teórico: ya pasó una vez, cuando al puente
 * se le pasó la lista de vértices y salieron CERO anillos, sin un error en ninguna
 * consola. La escena hizo lo correcto y quien mentía era quien montó el par.
 *
 * Deduciéndola, ese fallo deja de estar vigilado y pasa a ser inexpresable, que es mejor:
 * un comprobador avisa cuando algo se rompe; una imposibilidad no deja que se rompa.
 *
 * Devuelve `null` para lo que no es ninguna de las dos, que es lo honrado: una llave de
 * comarca —`q,r`— no lleva prefijo, y confundirla con un vértice sería peor que no saber.
 */
export function claseDeLlave(llave: string): 'vertice' | 'arista' | null {
  if (llave.startsWith('v:')) return 'vertice';
  if (llave.startsWith('a:')) return 'arista';
  return null;
}

/** La arista entre dos hexágonos vecinos, dicha por los dos. */
export function aristaEntre(a: Hex, b: Hex): LlaveDeArista {
  return `a:${llaveDeConjunto([a, b])}`;
}

/** El vértice donde se tocan tres hexágonos, dicho por los tres. */
export function verticeEntre(a: Hex, b: Hex, c: Hex): LlaveDeVertice {
  return `v:${llaveDeConjunto([a, b, c])}`;
}

/** Los seis vértices de un hexágono, en orden alrededor. */
export function verticesDeHex(h: Hex): LlaveDeVertice[] {
  const salida: LlaveDeVertice[] = [];
  for (let k = 0; k < LADOS; k++) salida.push(verticeDeHex(h, k));
  return salida;
}

/** Las seis aristas de un hexágono, en orden alrededor. */
export function aristasDeHex(h: Hex): LlaveDeArista[] {
  const salida: LlaveDeArista[] = [];
  for (let k = 0; k < LADOS; k++) salida.push(aristaDeHex(h, k));
  return salida;
}

/** Lee los hexágonos de una llave, sea de vértice o de arista. */
function hexesDeLlave(llave: string): Hex[] {
  const cuerpo = llave.slice(2);
  const salida: Hex[] = [];
  for (const parte of cuerpo.split('|')) salida.push(hexDeLlave(parte));
  return salida;
}

/** Los TRES hexágonos que tocan un vértice, en orden canónico. */
export function hexesDeVertice(v: LlaveDeVertice): Hex[] {
  return hexesDeLlave(v);
}

/** Los DOS hexágonos que comparten una arista, en orden canónico. */
export function hexesDeArista(a: LlaveDeArista): Hex[] {
  return hexesDeLlave(a);
}

/**
 * LAS TRES ARISTAS QUE SALEN DE UN VÉRTICE.
 *
 * Y salen sin mirar direcciones ni esquinas: los tres hexágonos que tocan un
 * vértice son vecinos entre sí dos a dos, así que las tres aristas son
 * exactamente las tres parejas. Que esto se pueda escribir en cuatro líneas es la
 * prueba de que la identidad estaba bien elegida.
 */
export function aristasDeVertice(v: LlaveDeVertice): LlaveDeArista[] {
  const [a, b, c] = hexesDeVertice(v) as [Hex, Hex, Hex];
  return [aristaEntre(a, b), aristaEntre(b, c), aristaEntre(a, c)];
}

/**
 * LOS DOS VÉRTICES DE UNA ARISTA.
 *
 * Son los dos puntos donde los dos hexágonos de la arista se tocan con un tercero,
 * y los dos terceros son los vecinos comunes. Se buscan recorriendo los seis
 * vecinos del primero en orden fijo, de modo que la lista sale siempre igual.
 */
export function verticesDeArista(a: LlaveDeArista): LlaveDeVertice[] {
  const [uno, otro] = hexesDeArista(a) as [Hex, Hex];
  const salida: LlaveDeVertice[] = [];
  for (const candidato of vecinos(uno)) {
    if (!sonVecinos(candidato, otro)) continue;
    salida.push(verticeEntre(uno, otro, candidato));
  }
  return salida;
}

/**
 * LOS VÉRTICES PEGADOS A UNO, que son como mucho tres.
 *
 * Es la vecindad de la que sale la regla de distancia de cualquier juego de
 * colonización: «aquí no, que hay algo al lado». El juego escribe la regla; la
 * malla solo dice quién está al lado.
 */
export function verticesVecinos(v: LlaveDeVertice): LlaveDeVertice[] {
  const salida: LlaveDeVertice[] = [];
  for (const arista of aristasDeVertice(v)) {
    for (const otro of verticesDeArista(arista)) {
      if (otro !== v && !salida.includes(otro)) salida.push(otro);
    }
  }
  return salida;
}

/** ¿Toca esta arista a este vértice? */
export function aristaTocaVertice(a: LlaveDeArista, v: LlaveDeVertice): boolean {
  return verticesDeArista(a).includes(v);
}

/**
 * UN TABLERO REDONDO DE RADIO `n`, ordenado y sin repetidos.
 *
 * Sale ordenado por `comparaHex` a propósito: el juego lo recorre para repartir
 * terrenos con el azar sembrado, y un recorrido con otro orden repartiría otro
 * tablero con la misma semilla. Lo que se guarda en el estado es el resultado del
 * reparto, pero la reejecución tiene que dar lo mismo, y esto es de lo que
 * depende.
 */
export function mallaDeRadio(n: number): Hex[] {
  const salida: Hex[] = [];
  for (let q = -n; q <= n; q++) {
    for (let r = -n; r <= n; r++) {
      if (Math.abs(-q - r) > n) continue;
      salida.push({ q, r });
    }
  }
  return salida.sort(comparaHex);
}

/** Los vértices distintos de un conjunto de hexágonos, ordenados y sin repetir. */
export function verticesDe(hexes: readonly Hex[]): LlaveDeVertice[] {
  const vistos: LlaveDeVertice[] = [];
  for (const h of hexes) {
    for (const v of verticesDeHex(h)) {
      if (!vistos.includes(v)) vistos.push(v);
    }
  }
  return vistos.sort(porTexto);
}

/** Las aristas distintas de un conjunto de hexágonos, ordenadas y sin repetir. */
export function aristasDe(hexes: readonly Hex[]): LlaveDeArista[] {
  const vistas: LlaveDeArista[] = [];
  for (const h of hexes) {
    for (const a of aristasDeHex(h)) {
      if (!vistas.includes(a)) vistas.push(a);
    }
  }
  return vistas.sort(porTexto);
}

/**
 * El orden entre llaves, escrito y no heredado.
 *
 * `Array.prototype.sort()` sin comparador ordena por unidades de código, que es
 * casi lo mismo… salvo que la especificación no obliga a que la ordenación sea
 * estable de la misma forma en todos los motores para todos los tamaños. Con el
 * comparador puesto, dos motores devuelven la misma lista, que es lo único que
 * importa cuando de esa lista sale el reparto de un tablero.
 */
function porTexto(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// LA GEOMETRÍA, que es solo para pintar
//
// Nada de lo que hay debajo entra jamás en el estado de una partida: son píxeles.
// Vive aquí porque la convención —punta hacia arriba— la fija este fichero, y un
// tablero pintado con otra convención se ve girado y con las aristas cruzadas.
// ---------------------------------------------------------------------------

/**
 * `√3`, calculada una vez.
 *
 * `Math.sqrt` está fijada al bit por IEEE 754, así que este número es EL MISMO en
 * Node y en Hermes. Escribirlo a mano con quince decimales habría sido igual de
 * determinista y menos honesto sobre de dónde sale.
 */
const RAIZ_DE_TRES = Math.sqrt(3);

/** El centro de un hexágono, con la punta hacia arriba y el radio `tamano`. */
export function centroDeHex(h: Hex, tamano: number): Punto {
  return {
    x: tamano * RAIZ_DE_TRES * (h.q + h.r / 2),
    y: tamano * 1.5 * h.r,
  };
}

/**
 * EL PUNTO DE UN VÉRTICE: la media de los centros de sus tres hexágonos.
 *
 * Que esto funcione no es casualidad ni una aproximación: el punto donde se tocan
 * tres hexágonos regulares es exactamente el baricentro de sus tres centros. Y
 * tiene una virtud que una tabla de esquinas no tendría: SALE DE LA LLAVE, así que
 * los tres nombres del mismo vértice pintan en el mismo píxel por construcción, y
 * no porque alguien haya escrito bien seis desplazamientos.
 */
export function puntoDeVertice(v: LlaveDeVertice, tamano: number): Punto {
  const hexes = hexesDeVertice(v);
  let x = 0;
  let y = 0;
  for (const h of hexes) {
    const c = centroDeHex(h, tamano);
    x += c.x;
    y += c.y;
  }
  return { x: x / hexes.length, y: y / hexes.length };
}

/** El punto medio de una arista, para colgarle un rótulo o una senda. */
export function puntoDeArista(a: LlaveDeArista, tamano: number): Punto {
  const hexes = hexesDeArista(a);
  const uno = centroDeHex(hexes[0] as Hex, tamano);
  const otro = centroDeHex(hexes[1] as Hex, tamano);
  return { x: (uno.x + otro.x) / 2, y: (uno.y + otro.y) / 2 };
}

/** Las seis esquinas de un hexágono, en orden, listas para un polígono. */
export function esquinasDeHex(h: Hex, tamano: number): Punto[] {
  const salida: Punto[] = [];
  for (const v of verticesDeHex(h)) salida.push(puntoDeVertice(v, tamano));
  return salida;
}

/** El rectángulo que encierra unos puntos, con margen. Para el `viewBox` del SVG. */
export function encuadre(
  puntos: readonly Punto[],
  margen: number,
): { x: number; y: number; ancho: number; alto: number } {
  if (puntos.length === 0) return { x: 0, y: 0, ancho: 0, alto: 0 };
  let minX = (puntos[0] as Punto).x;
  let maxX = minX;
  let minY = (puntos[0] as Punto).y;
  let maxY = minY;
  for (const p of puntos) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    x: minX - margen,
    y: minY - margen,
    ancho: maxX - minX + margen * 2,
    alto: maxY - minY + margen * 2,
  };
}
