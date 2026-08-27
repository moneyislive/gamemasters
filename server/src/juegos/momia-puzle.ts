/**
 * El generador del puzle del sellado.
 *
 * ES LA PIEZA CON MÁS MIGA DEL JUEGO Y LA QUE NO PUEDE FALLAR. Un puzle con dos
 * soluciones deja a la mesa discutiendo sin manera de decidir; uno sin ninguna
 * hace que la tumba no se pueda sellar hiciera lo que hiciera nadie. Las dos
 * averías se descubrirían de noche, con doce personas delante y sin arreglo
 * posible. Así que aquí no se escriben restricciones bonitas y se confía: se
 * escriben y se COMPRUEBAN, contra las 120 permutaciones, una a una.
 *
 * LAS CUATRO GARANTÍAS (§4.2 del diseño), y por qué cada una:
 *
 *   1. CONSISTENCIA — existe algún orden que las cumple todas. Sale gratis por
 *      construcción: todas las restricciones se sacan de un orden concreto, así
 *      que ese orden siempre las cumple. Se comprueba igual, porque «sale gratis
 *      por construcción» es exactamente lo que se dice de los fallos que luego
 *      aparecen.
 *   2. UNICIDAD — exactamente uno. Con dos, media mesa defiende uno y media el
 *      otro y no hay forma de zanjarlo.
 *   3. SUFICIENCIA REPARTIDA — el conjunto entero resuelve, pero los fragmentos
 *      de una sola persona no. Si alguien puede resolverlo en solitario, el
 *      juego pierde su razón de ser: se callaría y ganaría sin hablar con nadie.
 *   4. MINIMALIDAD — quitar cualquier restricción hace aparecer más de una
 *      solución. Sin esto se generan pilas de restricciones redundantes y el
 *      puzle se resuelve solo con la mitad de las cartas sobre la mesa.
 *
 * LA 4 IMPLICA LA 3, y conviene tenerlo presente para no creer que la 3 está
 * comprobada cuando no lo está: si el conjunto es mínimo, cualquier subconjunto
 * PROPIO admite ≥2 órdenes, luego basta con que nadie se quede con el conjunto
 * entero. Aun así las dos se comprueban por separado, porque son garantías
 * distintas y la implicación depende de que la minimalidad sea de verdad.
 *
 * FUERZA BRUTA, A PROPÓSITO. 120 permutaciones se recorren en un suspiro y un
 * resolutor con poda sería más largo, más rápido y podría tener un fallo sutil.
 * El sitio donde ahorrar microsegundos no es el que decide si la velada tiene
 * solución.
 *
 * DETERMINISTA CON SEMILLA. Sin esto las pruebas serían intermitentes —un
 * generador que falla una vez de cada trescientas pasa en verde casi siempre— y
 * un fallo encontrado de noche no se podría reproducir por la mañana.
 */
import { cumple, permutaciones, solucionesDe } from '../../../shared/juegos/momia-tipos';
import type { Restriccion, RitoId } from '../../../shared/juegos/momia-tipos';

// ---------------------------------------------------------------------------
// El azar, con semilla
// ---------------------------------------------------------------------------

/** FNV-1a: una cadena cualquiera se convierte en semilla sin colisiones tontas. */
function semillaNumerica(semilla: string | number): number {
  if (typeof semilla === 'number') return semilla >>> 0;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < semilla.length; i++) {
    h ^= semilla.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * mulberry32: doce líneas, período de sobra para lo que aquí se pide.
 *
 * No se usa `Math.random` en ningún sitio de este fichero, y no es manía: con
 * él, un puzle que saliera mal no se podría volver a generar para mirarlo.
 */
function azarCon(semilla: string | number): () => number {
  let s = semillaNumerica(semilla);
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates sobre una copia. */
function barajar<T>(items: T[], rnd: () => number): T[] {
  const salida = [...items];
  for (let i = salida.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [salida[i], salida[j]] = [salida[j]!, salida[i]!];
  }
  return salida;
}

// ---------------------------------------------------------------------------
// El universo de restricciones
// ---------------------------------------------------------------------------

/**
 * Cuánto se quiere ver cada tipo de restricción en un puzle.
 *
 * NO SON PESOS DE ADORNO. Una sola `posicion` parte las 120 permutaciones en 24
 * de un tajo, así que un puzle hecho de posiciones se resuelve con tres cartas y
 * sin hablar con nadie. `antes` es la que menos corta y la que más obliga a
 * combinar, así que es la que más sale; `posicion` es la excepción cara, y por
 * eso pesa uno.
 *
 * El efecto se nota en el número de fragmentos: con estos pesos un puzle mínimo
 * ronda las cinco o seis restricciones, que es lo que hace falta para que cuatro
 * personas tengan algo que poner en común.
 */
const PESO: Record<Restriccion['tipo'], number> = {
  antes: 6,
  'no-posicion': 4,
  'inmediatamente-antes': 3,
  extremos: 2,
  posicion: 1,
};

/**
 * Todas las restricciones CIERTAS para un orden dado.
 *
 * Con cinco ritos son 41: diez `antes`, cuatro `inmediatamente-antes`, cinco
 * `posicion`, veinte `no-posicion` y dos `extremos`. De aquí sale el puzle, y
 * que todas sean ciertas es lo que regala la garantía 1.
 */
export function universoCierto(orden: RitoId[]): Restriccion[] {
  const salida: Restriccion[] = [];
  const n = orden.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      salida.push({ tipo: 'antes', a: orden[i]!, b: orden[j]! });
    }
    if (i + 1 < n) {
      salida.push({ tipo: 'inmediatamente-antes', a: orden[i]!, b: orden[i + 1]! });
    }
    salida.push({ tipo: 'posicion', a: orden[i]!, posicion: i + 1 });
    for (let p = 1; p <= n; p++) {
      if (p !== i + 1) salida.push({ tipo: 'no-posicion', a: orden[i]!, posicion: p });
    }
  }
  salida.push({ tipo: 'extremos', a: orden[0]! });
  salida.push({ tipo: 'extremos', a: orden[n - 1]! });
  return salida;
}

/** Todas las restricciones que se pueden escribir sobre estos ritos, ciertas o no. */
export function universoEntero(ritos: RitoId[]): Restriccion[] {
  const salida: Restriccion[] = [];
  const n = ritos.length;
  for (const a of ritos) {
    for (const b of ritos) {
      if (a === b) continue;
      salida.push({ tipo: 'antes', a, b });
      salida.push({ tipo: 'inmediatamente-antes', a, b });
    }
    for (let p = 1; p <= n; p++) {
      salida.push({ tipo: 'posicion', a, posicion: p });
      salida.push({ tipo: 'no-posicion', a, posicion: p });
    }
    salida.push({ tipo: 'extremos', a });
  }
  return salida;
}

/** Dos restricciones son la misma si dicen lo mismo. Para no repetir fragmentos. */
export function claveDe(r: Restriccion): string {
  switch (r.tipo) {
    case 'antes':
    case 'inmediatamente-antes':
      return `${r.tipo}|${r.a}|${r.b}`;
    case 'posicion':
    case 'no-posicion':
      return `${r.tipo}|${r.a}|${r.posicion}`;
    case 'extremos':
      return `extremos|${r.a}`;
  }
}

/**
 * Baraja dando más papeletas a los tipos que hacen mejor puzle.
 *
 * Se implementa con claves exponenciales (`-ln(u)/peso`): ordenar por esa clave
 * equivale a ir sacando de un bombo donde cada elemento tiene tantas papeletas
 * como su peso, y sale en una pasada en vez de en un bucle de extracciones.
 */
function barajarConPesos(items: Restriccion[], rnd: () => number): Restriccion[] {
  return items
    .map((r) => ({ r, clave: -Math.log(Math.max(rnd(), 1e-12)) / PESO[r.tipo] }))
    .sort((x, y) => x.clave - y.clave)
    .map((x) => x.r);
}

// ---------------------------------------------------------------------------
// Las falsas candidatas
// ---------------------------------------------------------------------------

/** Una restricción que contradice el orden verdadero, con lo cara que es de pillar. */
export interface FalsaCandidata {
  restriccion: Restriccion;
  /**
   * Cuántos fragmentos CIERTOS hacen falta, como mínimo, para desmentirla.
   *
   * Es la medida de lo bien que engaña, y es lo que separa una falsa buena de
   * una inútil. Si con 1 basta, alguien pone su carta al lado y se acabó en dos
   * segundos: la mesa ni siquiera duda. A partir de 2 hay que combinar, y
   * combinar es hablar, que es de lo que vive este juego.
   */
  refutabilidad: number;
}

/**
 * El mínimo de restricciones ciertas que dejan sin salida a una falsa.
 *
 * Se busca por tamaños crecientes y se corta en `tope`: saber si son tres o
 * cuatro no cambia ninguna decisión, y la búsqueda exhaustiva sobre todos los
 * subconjuntos se paga en un generador que se llama doscientas veces seguidas.
 */
export function refutabilidad(
  ritos: RitoId[],
  verdaderas: Restriccion[],
  falsa: Restriccion,
  tope = 3,
): number {
  // Los órdenes donde la falsa se sostiene. Si alguno sobrevive a un
  // subconjunto, ese subconjunto no la desmiente.
  const compatibles = permutaciones(ritos).filter((o) => cumple(o, falsa));
  if (compatibles.length === 0) return 0; // absurda por sí sola: no vale ni de falsa

  const mata = (indices: number[]): boolean =>
    compatibles.every((o) => indices.some((i) => !cumple(o, verdaderas[i]!)));

  for (let k = 1; k <= Math.min(tope, verdaderas.length); k++) {
    let encontrado = false;
    const combinar = (desde: number, elegidos: number[]): void => {
      if (encontrado) return;
      if (elegidos.length === k) {
        if (mata(elegidos)) encontrado = true;
        return;
      }
      for (let i = desde; i < verdaderas.length && !encontrado; i++) {
        combinar(i + 1, [...elegidos, i]);
      }
    };
    combinar(0, []);
    if (encontrado) return k;
  }
  return tope + 1;
}

/**
 * Prepara las falsas que se le ofrecerán al saqueador cuando invoque su don.
 *
 * SE DESCARTAN LAS QUE UN SOLO FRAGMENTO DESMIENTE. Es el criterio entero de
 * §4.3: «no absurdas a primera vista». Una falsa que choca de frente con una
 * carta ya pública no engaña a nadie y encima delata al saqueador, que es lo
 * contrario de lo que se quiere.
 */
export function falsasCandidatas(
  ritos: RitoId[],
  orden: RitoId[],
  verdaderas: Restriccion[],
  rnd: () => number,
  cuantas: number,
): FalsaCandidata[] {
  const yaEstan = new Set(verdaderas.map(claveDe));
  const candidatas = universoEntero(ritos)
    .filter((r) => !cumple(orden, r))
    .filter((r) => !yaEstan.has(claveDe(r)))
    .map((restriccion) => ({
      restriccion,
      refutabilidad: refutabilidad(ritos, verdaderas, restriccion),
    }))
    .filter((c) => c.refutabilidad >= 2);

  // Primero las más difíciles de pillar; a igualdad, al azar, para que dos
  // partidas con la misma forma no repartan las mismas mentiras.
  return barajar(candidatas, rnd)
    .sort((a, b) => b.refutabilidad - a.refutabilidad)
    .slice(0, cuantas);
}

// ---------------------------------------------------------------------------
// El puzle
// ---------------------------------------------------------------------------

export interface OpcionesPuzle {
  ritos: RitoId[];
  /** Cuántas personas se repartirán los fragmentos. Mínimo dos. */
  jugadores: number;
  semilla?: string | number;
  /** Cuántas mentiras preparar para el saqueador. */
  falsas?: number;
  /**
   * Por debajo de esto se vuelve a intentar con otro orden.
   *
   * NO SE RELLENA con restricciones de más: eso rompería la minimalidad, que es
   * justo la garantía que impide que el puzle se resuelva solo. Se tira el
   * intento y se prueba otro, que es más lento y es lo correcto.
   */
  minimoRestricciones?: number;
}

export interface PuzleMomia {
  ordenVerdadero: RitoId[];
  restricciones: Restriccion[];
  /** Índices de `restricciones`, una lista por jugador. */
  reparto: number[][];
  falsas: FalsaCandidata[];
  /** Cuántos órdenes se probaron antes de dar con uno bueno. Diagnóstico. */
  intentos: number;
}

/**
 * Reduce el conjunto a un núcleo mínimo.
 *
 * Se prueba a quitar cada una y se quita si el puzle sigue teniendo una sola
 * solución. Se repite hasta que no se pueda quitar nada más: quitar una puede
 * hacer que otra que antes era imprescindible deje de serlo, y con una sola
 * pasada quedarían redundancias dentro.
 */
function minimizar(ritos: RitoId[], restricciones: Restriccion[], rnd: () => number): Restriccion[] {
  let actuales = [...restricciones];
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const r of barajar(actuales, rnd)) {
      const sinElla = actuales.filter((x) => x !== r);
      if (sinElla.length > 0 && solucionesDe(ritos, sinElla).length === 1) {
        actuales = sinElla;
        cambio = true;
        break;
      }
    }
  }
  return actuales;
}

/**
 * Genera un puzle que cumple las cuatro garantías.
 *
 * @throws si no consigue uno en cien intentos, que no debería pasar nunca con
 * cinco ritos: es una red por si alguien cambia los pesos y deja el generador
 * pidiendo algo imposible. Mejor reventar aquí, al preparar, que a medianoche.
 */
export function generarPuzle(opciones: OpcionesPuzle): PuzleMomia {
  const { ritos, jugadores } = opciones;
  if (ritos.length < 3) throw new Error('Hacen falta al menos tres ritos.');
  if (new Set(ritos).size !== ritos.length) throw new Error('Hay ritos repetidos.');
  if (jugadores < 2) throw new Error('El puzle se reparte entre dos personas como mínimo.');

  const rnd = azarCon(opciones.semilla ?? 'momia');
  const minimo = opciones.minimoRestricciones ?? Math.max(3, Math.min(jugadores, ritos.length));

  for (let intentos = 1; intentos <= 100; intentos++) {
    const orden = barajar(ritos, rnd);

    /*
     * Se van añadiendo restricciones ciertas y se descartan las que no recortan
     * nada: una que no quita ni un orden es redundante desde el primer momento y
     * solo alarga la minimización de después.
     */
    let vivas = permutaciones(ritos);
    const elegidas: Restriccion[] = [];
    for (const candidata of barajarConPesos(universoCierto(orden), rnd)) {
      if (vivas.length === 1) break;
      const quedan = vivas.filter((o) => cumple(o, candidata));
      if (quedan.length === vivas.length) continue;
      vivas = quedan;
      elegidas.push(candidata);
    }
    if (vivas.length !== 1) continue; // no debería ocurrir; si ocurre, otro orden

    const restricciones = minimizar(ritos, elegidas, rnd);
    if (restricciones.length < minimo) continue;

    /*
     * El reparto, por turnos sobre una baraja. Con dos o más personas nadie se
     * queda con el conjunto entero, y por la minimalidad eso basta para que los
     * fragmentos de cualquiera admitan ≥2 órdenes. Se comprueba igual.
     */
    const indices = barajar(
      restricciones.map((_, i) => i),
      rnd,
    );
    const reparto: number[][] = Array.from({ length: jugadores }, () => []);
    indices.forEach((indice, i) => reparto[i % jugadores]!.push(indice));

    const repartida = reparto.every(
      (mios) => solucionesDe(ritos, mios.map((i) => restricciones[i]!)).length >= 2,
    );
    if (!repartida) continue;

    return {
      ordenVerdadero: orden,
      restricciones,
      reparto,
      falsas: falsasCandidatas(ritos, orden, restricciones, rnd, opciones.falsas ?? 4),
      intentos,
    };
  }

  throw new Error('No se ha podido componer un puzle que cumpla las cuatro garantías.');
}

// ---------------------------------------------------------------------------
// La comprobación
// ---------------------------------------------------------------------------

export interface InformeDelPuzle {
  soluciones: number;
  consistente: boolean;
  unico: boolean;
  /** Cuántos órdenes admiten los fragmentos de cada persona, por separado. */
  solucionesPorJugador: number[];
  repartida: boolean;
  /** Las que se pueden quitar sin perder la unicidad. Vacío si es mínimo. */
  redundantes: Restriccion[];
  minimo: boolean;
  /** La falsa más fácil de pillar. Menos de 2 es una falsa que no engaña. */
  refutabilidadMinima: number;
  falsasSanas: boolean;
  ok: boolean;
}

/**
 * Pasa las cuatro garantías por delante de las 120 permutaciones.
 *
 * Vive aquí y no en el comprobador porque la necesitan tres sitios: la prueba
 * que genera doscientos puzles, la generación de una partida de verdad —que no
 * puede entregar un puzle sin verificar— y el imprimible «informe del papiro»,
 * que es esto mismo escrito para que lo lea quien dirige.
 */
export function verificarPuzle(ritos: RitoId[], puzle: PuzleMomia): InformeDelPuzle {
  const soluciones = solucionesDe(ritos, puzle.restricciones);
  const unico =
    soluciones.length === 1 && soluciones[0]!.join('|') === puzle.ordenVerdadero.join('|');

  const solucionesPorJugador = puzle.reparto.map(
    (mios) => solucionesDe(ritos, mios.map((i) => puzle.restricciones[i]!)).length,
  );

  const redundantes = puzle.restricciones.filter((r) => {
    const sinElla = puzle.restricciones.filter((x) => x !== r);
    return sinElla.length > 0 && solucionesDe(ritos, sinElla).length === 1;
  });

  const refutabilidadMinima = puzle.falsas.length
    ? Math.min(...puzle.falsas.map((f) => f.refutabilidad))
    : Infinity;
  // Que ninguna falsa sea cierta por accidente: sería un fragmento «falso» que
  // encaja con el orden real, y publicarlo AYUDARÍA a la mesa.
  const falsasSanas =
    puzle.falsas.every((f) => !cumple(puzle.ordenVerdadero, f.restriccion)) &&
    refutabilidadMinima >= 2;

  const consistente = soluciones.length >= 1;
  const repartida = solucionesPorJugador.every((n) => n >= 2);
  const minimo = redundantes.length === 0;

  return {
    soluciones: soluciones.length,
    consistente,
    unico,
    solucionesPorJugador,
    repartida,
    redundantes,
    minimo,
    refutabilidadMinima,
    falsasSanas,
    ok: consistente && unico && repartida && minimo && falsasSanas,
  };
}

// ---------------------------------------------------------------------------
// Dónde aparece cada fragmento
// ---------------------------------------------------------------------------

export interface Hallazgo {
  fragmentoId: string;
  camaraId: string;
  ronda: number;
}

/**
 * Reparte los fragmentos por cámaras y vigilias.
 *
 * TODA CÁMARA DA PAPIRO, TODA VIGILIA. Es lo que promete el diseño (§2: «sale
 * con un fragmento de papiro») y lo que promete la app con esas mismas palabras.
 * La primera versión repartía los n fragmentos y dejaba vacías las demás
 * casillas, que eran casi todas: se jugó una velada de verdad y quien entraba en
 * una cámara salía con las manos vacías, convencido de que la app había fallado.
 * Y era castigo doble, porque la marca ya la había pagado.
 *
 * SE REPITEN, Y POR ESO FUNCIONA. Un fragmento que dos personas encuentran no
 * estropea nada —dice lo mismo— y en cambio permite llenar las C×R casillas con
 * un puzle de cinco restricciones. Lo que decide la exploración deja de ser «si
 * hay algo» y pasa a ser QUÉ hay, que es una decisión de verdad: en cada vigilia
 * las cámaras ofrecen fragmentos distintos y una de ellas cuesta una marca.
 *
 * LO QUE HAY QUE SEGUIR GARANTIZANDO es que nadie los junte todos, porque de ahí
 * vive el juego. Como cada casilla da uno y se entra en una cámara por vigilia,
 * una persona se lleva como mucho R fragmentos distintos. Basta, pues, con que
 * haya MÁS restricciones que vigilias, y de eso se encarga quien llama pidiendo
 * un puzle con `minimoRestricciones`. Aquí se comprueba y se avisa.
 *
 * EL DESPLAZAMIENTO, que parece un detalle y ha costado dos intentos. De una
 * vigilia a la siguiente el reparto se corre C posiciones, para que las cámaras
 * vayan barriendo la lista entera y todos los fragmentos acaben saliendo. Pero
 * si C es múltiplo de n —cinco cámaras y cinco fragmentos, el caso normal— ese
 * desplazamiento es de cero: la misma cámara daría siempre el mismo fragmento y
 * la mesa aprendería el mapa en dos noches. Ahí, y solo ahí, se corre C+1.
 *
 * El primer intento fue correr C+1 SIEMPRE, y con seis fragmentos y cinco
 * cámaras volvía a dar cero por el otro lado: el sexto fragmento no aparecía en
 * toda la velada. Por eso, además, al final se comprueba la cobertura y se
 * colocan a mano los que se hayan quedado fuera. Un fragmento que no sale es un
 * puzle sin solución, y esa avería se descubriría de noche.
 */
export function repartirHallazgos(opciones: {
  fragmentos: string[];
  camaras: string[];
  rondas: number;
  semilla?: string | number;
}): Hallazgo[] {
  const { fragmentos, camaras } = opciones;
  const rondas = Math.max(1, opciones.rondas);
  if (camaras.length === 0) throw new Error('No hay cámaras donde esconder los fragmentos.');
  if (fragmentos.length === 0) throw new Error('No hay fragmentos que repartir.');

  const rnd = azarCon(opciones.semilla ?? 'hallazgos');
  const todos = barajar(fragmentos, rnd);
  const n = todos.length;
  const paso = camaras.length + 1; // ROTO

  const salida: Hallazgo[] = [];
  for (let ronda = 1; ronda <= rondas; ronda++) {
    const desplazamiento = (ronda - 1) * paso;
    camaras.forEach((camaraId, i) => {
      salida.push({ fragmentoId: todos[(i + desplazamiento) % n]!, camaraId, ronda });
    });
  }

  /*
   * La red: los que se hayan quedado sin salir se colocan encima de casillas que
   * repetían fragmento. Se toca la ÚLTIMA vigilia primero, que es donde menos
   * daño hace cambiar el reparto —la mesa ya ha visto casi todo— y nunca una
   * casilla cuyo fragmento no esté repetido, que sería cambiar un hueco por otro.
   */
  const sinSalir = todos.filter((id) => !salida.some((h) => h.fragmentoId === id));
  for (const fragmentoId of sinSalir) {
    const veces = new Map<string, number>();
    for (const h of salida) veces.set(h.fragmentoId, (veces.get(h.fragmentoId) ?? 0) + 1);
    const hueco = [...salida]
      .reverse()
      .find((h) => (veces.get(h.fragmentoId) ?? 0) > 1);
    if (hueco) hueco.fragmentoId = fragmentoId;
  }
  return salida;
}

/**
 * Cuántos fragmentos DISTINTOS puede juntar como mucho una sola persona.
 *
 * Entra en una cámara por vigilia, así que su botín depende del camino que elija:
 * se prueban todos por fuerza bruta. Con cinco cámaras y cuatro vigilias son 625
 * caminos, que se recorren en un suspiro y no dejan sitio a un razonamiento
 * elegante que resulte estar mal.
 *
 * Antes esto sumaba «la cámara más cargada de cada vigilia», que era correcto
 * cuando ningún fragmento se repetía y dejó de serlo en cuanto se repitieron:
 * contaba dos veces el mismo papiro y daba un botín mayor que el real.
 */
export function maximoQueJuntaUnaPersona(hallazgos: Hallazgo[]): number {
  const rondas = [...new Set(hallazgos.map((h) => h.ronda))].sort((a, b) => a - b);
  const porRonda = rondas.map((ronda) => {
    const enEsta = hallazgos.filter((h) => h.ronda === ronda);
    const camaras = [...new Set(enEsta.map((h) => h.camaraId))];
    return camaras.map((c) => enEsta.filter((h) => h.camaraId === c).map((h) => h.fragmentoId));
  });

  let mejor = 0;
  const recorrer = (i: number, llevados: Set<string>): void => {
    if (i === porRonda.length) {
      mejor = Math.max(mejor, llevados.size);
      return;
    }
    for (const opcion of porRonda[i]!) {
      recorrer(i + 1, new Set([...llevados, ...opcion]));
    }
  };
  recorrer(0, new Set());
  return mejor;
}

// ---------------------------------------------------------------------------
// La redacción
// ---------------------------------------------------------------------------

const ORDINALES = ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto'];

/**
 * La frase de papiro de una restricción.
 *
 * EN UNA PARTIDA DE VERDAD ESTO LO ESCRIBE EL MODELO, que es quien sabe darle el
 * tono. Esta versión existe por dos motivos que no son «para salir del paso»:
 * la trama de demostración no llama a ningún modelo, y hace falta una redacción
 * de referencia contra la que comparar la del modelo. Si el modelo devuelve una
 * frase que no corresponde a la restricción que se le pidió, la partida queda
 * irresoluble y nadie se entera hasta la noche (§7 del diseño).
 */
export function redactar(r: Restriccion, nombre: (id: RitoId) => string): string {
  const a = nombre(r.a);
  switch (r.tipo) {
    /*
     * «antes que» y no «precede a»: los nombres de los ritos los pone quien
     * dirige y suelen empezar por artículo («el Rito del Agua»), así que
     * «precede a el Rito…» saldría impreso con esa contracción sin hacer. No es
     * remilgo: estas frases se leen en voz alta en la mesa.
     */
    case 'antes':
      return `${a} se pronuncia antes que ${nombre(r.b)}, aunque medien otros entre ambos.`;
    case 'inmediatamente-antes':
      return `Nada se interpone entre ${a} y ${nombre(r.b)}: uno sigue al otro.`;
    case 'posicion':
      return `${a} se pronuncia el ${ORDINALES[r.posicion - 1] ?? r.posicion} del sellado.`;
    case 'no-posicion':
      return `${a} jamás se pronuncia el ${ORDINALES[r.posicion - 1] ?? r.posicion}.`;
    case 'extremos':
      return `${a} abre o cierra el sellado, nunca se dice en medio.`;
  }
}

/**
 * ¿La frase habla de los ritos de los que tiene que hablar?
 *
 * Es la validación de §7, y es deliberadamente modesta: no comprueba que la
 * frase SIGNIFIQUE la restricción —para eso haría falta entender español— sino
 * que menciona los ritos correctos. Con eso se caza el fallo que de verdad
 * ocurre: que el modelo redacte la restricción de otro fragmento, o se invente
 * un rito que no está en la partida.
 */
export function mencionaLosRitos(
  texto: string,
  r: Restriccion,
  nombre: (id: RitoId) => string,
): boolean {
  const plano = texto.toLocaleLowerCase('es');
  const menciona = (id: RitoId) => plano.includes(nombre(id).toLocaleLowerCase('es'));
  if (!menciona(r.a)) return false;
  if (r.tipo === 'antes' || r.tipo === 'inmediatamente-antes') return menciona(r.b);
  return true;
}
