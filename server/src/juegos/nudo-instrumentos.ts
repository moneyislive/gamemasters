/**
 * Los cuatro instrumentos de la estación: cómo se plantean y cómo se corrigen.
 *
 * ═══ QUÉ SON Y POR QUÉ ESTÁN AQUÍ Y NO EN LA APP ═══
 *
 * Son los minijuegos: la maniobra de la garita, el parte del telégrafo, el
 * cuadro de enclavamiento y el cargue del muelle. Resolver uno da la conformidad
 * del puesto —lo que se gasta al cursar una orden— y margen a quien lo resuelve.
 *
 * Los PLANTEA Y LOS CORRIGE EL SERVIDOR, y hay tres razones que no son
 * intercambiables:
 *
 *   1. TIENEN QUE SER EL MISMO para todo el que se acerque a ese puesto en esa
 *      franja. Es lo que convierte un puesto en un sitio al que se va —dos
 *      personas delante del mismo cuadro de palancas discutiendo cuál bajar— en
 *      vez de en un solitario que cada cual juega en su pantalla.
 *
 *   2. LA APP NO PUNTÚA. Manda la respuesta y aquí se corrige. Si puntuara la
 *      app, la conformidad la daría el móvil y bastaría con tocar el JSON.
 *
 *   3. SE PUEDEN JUGAR SIN PANTALLA. El comprobador de la velada entera
 *      resuelve los cuatro por HTTP, sin abrir la app, porque el servidor
 *      conoce la solución de todos. Un minijuego que solo supiera corregirse
 *      dentro del móvil sería un trozo del juego imposible de probar.
 *
 * ═══ LA REGLA COMÚN A LOS CUATRO ═══
 *
 * Ninguno se entrega sin comprobar que TIENE SOLUCIÓN. Dos se generan por
 * construcción (el cargue y el parte), uno se genera y se resuelve con búsqueda
 * antes de entregarlo (la maniobra) y otro se genera y se enumera entero (el
 * enclavamiento). No hay ningún camino por el que a alguien le salga en la
 * pantalla un problema sin salida a las dos de la mañana.
 */
import { aMorse, normalizarParte } from '../../../shared/juegos/nudo-tipos';
import { azarCon, barajar } from './nudo-cuadro';
import type {
  CarguePlanteado,
  EnclavamientoPlanteado,
  InstrumentoId,
  ManiobraPlanteada,
  MovimientoDeManiobra,
  PartePlanteado,
} from '../../../shared/juegos/nudo-tipos';

/** Lo que un instrumento devuelve al plantearse: lo público y la solución. */
export interface InstrumentoPlanteado {
  cual: InstrumentoId;
  /** Lo que viaja al móvil. NUNCA lleva la solución. */
  planteamiento: unknown;
  /**
   * Cómo se corrige. Vive en el estado del servidor, en el mismo sitio que el
   * planteamiento, y la proyección lo quita antes de mandar nada. Ver
   * `nudo-proyeccion.ts`.
   */
  solucion: unknown;
}

/**
 * El vocabulario de la partida, para que los instrumentos hablen de ella.
 *
 * No es adorno: el telégrafo transmite el nombre de un convoy de ESTA noche y
 * los vagones de la maniobra llevan las iniciales de los cargamentos que hay en
 * la mesa. Es lo que separa un minijuego pegado con cola de uno que pertenece a
 * la velada.
 */
export interface VocabularioDeLaEstacion {
  convoyes: string[];
  puestos: string[];
  mercancias: string[];
}

// ---------------------------------------------------------------------------
// LA MANIOBRA · garita de agujas
// ---------------------------------------------------------------------------

/**
 * El estado de una maniobra a medias, en forma de cadena.
 *
 * Se codifica a texto porque la búsqueda necesita un conjunto de visitados y
 * comparar objetos en JavaScript no vale para eso. El separador es `|` y los
 * vagones son letras, así que no hay ambigüedad posible.
 */
function claveDeManiobra(i: number, v1: string[], v2: string[], salida: number): string {
  return `${i}|${v1.join('')}|${v2.join('')}|${salida}`;
}

/**
 * Resuelve una maniobra con el menor número de movimientos, o dice que no hay.
 *
 * ═══ LA PODA QUE HACE QUE ESTO TERMINE ═══
 *
 * La vía de salida es de una sola dirección: lo que se engancha ahí no se
 * vuelve a tocar. Así que un movimiento que ponga en la salida un vagón que no
 * es el siguiente del objetivo no es «una jugada mala»: es una rama MUERTA, y
 * se corta en el acto. Con eso el estado se reduce a «por dónde va la entrada,
 * qué hay en cada vía muerta y cuántos van colocados», que con cinco vagones son
 * unos pocos miles de estados en vez de una explosión.
 *
 * Es anchura y no profundidad porque además del sí/no hace falta el ÓPTIMO: se
 * le enseña a quien juega para que sepa si lo ha hecho bien o solo lo ha hecho.
 */
export function resolverManiobra(
  entrada: string[],
  objetivo: string[],
): MovimientoDeManiobra[] | undefined {
  const inicio = { i: 0, v1: [] as string[], v2: [] as string[], hechos: 0 };
  const vistos = new Set<string>([claveDeManiobra(0, [], [], 0)]);
  let frontera: Array<{
    i: number;
    v1: string[];
    v2: string[];
    hechos: number;
    camino: MovimientoDeManiobra[];
  }> = [{ ...inicio, camino: [] }];

  /*
   * Tope de vueltas como red anticuelgue. Con cinco vagones nunca se acerca; si
   * alguien sube el tamaño sin pensarlo, esto revienta al generar y no en la
   * mesa.
   */
  for (let vuelta = 0; vuelta < 40 && frontera.length > 0; vuelta++) {
    const siguiente: typeof frontera = [];
    for (const e of frontera) {
      if (e.hechos === objetivo.length) return e.camino;

      const quiere = objetivo[e.hechos];
      const cabeza = e.i < entrada.length ? entrada[e.i] : undefined;

      const empujar = (
        i: number,
        v1: string[],
        v2: string[],
        hechos: number,
        mov: MovimientoDeManiobra,
      ): void => {
        const clave = claveDeManiobra(i, v1, v2, hechos);
        if (vistos.has(clave)) return;
        vistos.add(clave);
        siguiente.push({ i, v1, v2, hechos, camino: [...e.camino, mov] });
      };

      // Pasar de largo: solo si el de cabeza es justo el que falta.
      if (cabeza !== undefined && cabeza === quiere) {
        empujar(e.i + 1, e.v1, e.v2, e.hechos + 1, { hacer: 'pasar' });
      }
      // Apartar el de cabeza a una vía muerta.
      if (cabeza !== undefined) {
        empujar(e.i + 1, [...e.v1, cabeza], e.v2, e.hechos, { hacer: 'apartar', via: 1 });
        empujar(e.i + 1, e.v1, [...e.v2, cabeza], e.hechos, { hacer: 'apartar', via: 2 });
      }
      // Sacar de una vía muerta: solo si el de arriba es el que falta.
      if (e.v1.length > 0 && e.v1[e.v1.length - 1] === quiere) {
        empujar(e.i, e.v1.slice(0, -1), e.v2, e.hechos + 1, { hacer: 'sacar', via: 1 });
      }
      if (e.v2.length > 0 && e.v2[e.v2.length - 1] === quiere) {
        empujar(e.i, e.v1, e.v2.slice(0, -1), e.hechos + 1, { hacer: 'sacar', via: 2 });
      }
    }
    frontera = siguiente;
  }
  return undefined;
}

/**
 * Comprueba una maniobra entregada REPRODUCIÉNDOLA.
 *
 * No se compara con la solución del servidor, y eso importa: hay maniobras con
 * varias soluciones del mismo largo, y exigir la del servidor sería rechazar
 * una que también coloca el tren. Lo que se exige es que la secuencia sea legal
 * y que el tren acabe en el orden pedido.
 */
export function comprobarManiobra(
  entrada: string[],
  objetivo: string[],
  movimientos: MovimientoDeManiobra[],
): { vale: boolean; porque?: string } {
  if (movimientos.length > 60) return { vale: false, porque: 'Demasiados movimientos.' };
  let i = 0;
  const vias: [string[], string[]] = [[], []];
  const salida: string[] = [];

  for (const m of movimientos) {
    if (m.hacer === 'pasar' || m.hacer === 'apartar') {
      if (i >= entrada.length) return { vale: false, porque: 'Ya no queda tren que meter.' };
    }
    if (m.hacer === 'apartar') {
      vias[m.via - 1]!.push(entrada[i]!);
      i++;
    } else if (m.hacer === 'pasar') {
      salida.push(entrada[i]!);
      i++;
    } else {
      const via = vias[m.via - 1]!;
      if (via.length === 0) return { vale: false, porque: `La vía ${m.via} está vacía.` };
      salida.push(via.pop()!);
    }
  }

  if (i < entrada.length) return { vale: false, porque: 'Queda tren sin maniobrar.' };
  if (vias[0].length > 0 || vias[1].length > 0) {
    return { vale: false, porque: 'Han quedado vagones en una vía muerta.' };
  }
  if (salida.join('') !== objetivo.join('')) {
    return { vale: false, porque: 'El tren no queda en el orden pedido.' };
  }
  return { vale: true };
}

/**
 * Plantea una maniobra que se puede resolver.
 *
 * ═══ LOS VAGONES SE LLAMAN CON LETRAS Y NO CON NÚMEROS ═══
 *
 * Porque el objetivo se escribe como una palabra —`CADB`— y a las dos de la
 * mañana, en un móvil, leer «coloca C A D B» es infinitamente más rápido que
 * leer «coloca 3 1 4 2». Las letras van de la A en adelante y el objetivo NUNCA
 * es el alfabético: colocarlos en orden es lo que la cabeza espera y lo que
 * haría el problema trivial.
 */
export function plantearManiobra(franja: number, semilla: string): InstrumentoPlanteado {
  const rnd = azarCon(`maniobra:${semilla}:${franja}`);
  /* Cuatro vagones las dos primeras franjas, cinco a partir de la tercera. */
  const cuantos = franja <= 2 ? 4 : 5;
  const vagones = Array.from({ length: cuantos }, (_, i) => String.fromCharCode(65 + i));

  for (let intento = 0; intento < 60; intento++) {
    const entrada = barajar(vagones, rnd);
    const objetivo = barajar(vagones, rnd);
    /* Que haya algo que hacer: si entran ya colocados, no es una maniobra. */
    if (entrada.join('') === objetivo.join('')) continue;
    const camino = resolverManiobra(entrada, objetivo);
    if (!camino) continue;
    /* Y que cueste algo: por debajo de cinco movimientos se resuelve sin mirar. */
    if (camino.length < cuantos + 1) continue;
    const planteamiento: ManiobraPlanteada = { entrada, objetivo, optimo: camino.length };
    return { cual: 'agujas', planteamiento, solucion: { entrada, objetivo } };
  }
  throw new Error('No se ha podido plantear una maniobra resoluble.');
}

// ---------------------------------------------------------------------------
// EL PARTE · cuarto del telégrafo
// ---------------------------------------------------------------------------

/**
 * La palabra que se transmite, sacada del vocabulario de la partida.
 *
 * Se elige la PALABRA MÁS LARGA del nombre y no el nombre entero: «El mixto de
 * Peñarroya» en Morse son veinte letras y cuatro minutos de transmisión, que no
 * es un minijuego sino un castigo. Con «PEÑARROYA» —nueve— se tarda menos de
 * un minuto y sigue siendo del juego.
 */
function palabraTransmisible(nombre: string): string {
  const trozos = nombre
    .split(/\s+/)
    .map((p) => normalizarParte(p))
    .filter((p) => p.length >= 4);
  if (trozos.length === 0) return normalizarParte(nombre).slice(0, 8);
  return trozos.reduce((a, b) => (b.length > a.length ? b : a)).slice(0, 10);
}

export function plantearParte(
  franja: number,
  semilla: string,
  vocabulario: VocabularioDeLaEstacion,
): InstrumentoPlanteado {
  const rnd = azarCon(`parte:${semilla}:${franja}`);
  const fuentes: Array<{ de: string; lista: string[] }> = [
    { de: 'un convoy de esta noche', lista: vocabulario.convoyes },
    { de: 'un puesto de la estación', lista: vocabulario.puestos },
    { de: 'un cargamento de la mesa', lista: vocabulario.mercancias },
  ].filter((f) => f.lista.length > 0);

  /*
   * Respaldo si la partida no tiene ni un nombre utilizable. No debería pasar
   * —el manifiesto exige seis convoyes— pero un nombre de una sola letra
   * dejaría el parte vacío, y un parte vacío se «acierta» pulsando enviar.
   */
  const reserva = ['VALDEHIERRO', 'CORREO', 'AGUJAS', 'CALDERA', 'NIEVE'];
  const fuente = fuentes.length > 0 ? fuentes[Math.floor(rnd() * fuentes.length)]! : undefined;
  const candidatas = (fuente?.lista ?? [])
    .map(palabraTransmisible)
    .filter((p) => p.length >= 4);
  const palabra =
    candidatas.length > 0
      ? candidatas[Math.floor(rnd() * candidatas.length)]!
      : reserva[Math.floor(rnd() * reserva.length)]!;

  const planteamiento: PartePlanteado = {
    morse: aMorse(palabra),
    letras: palabra.length,
    pista: fuente && candidatas.length > 0 ? `Es el nombre de ${fuente.de}.` : 'Es de la estación.',
  };
  return { cual: 'telegrafo', planteamiento, solucion: { palabra } };
}

export function comprobarParte(palabra: string, respuesta: string): boolean {
  return normalizarParte(respuesta) === normalizarParte(palabra);
}

// ---------------------------------------------------------------------------
// EL ENCLAVAMIENTO · cuadro de palancas
// ---------------------------------------------------------------------------

/** ¿Es legal esta configuración de palancas? */
function configuracionLegal(bajadas: Set<number>, p: EnclavamientoPlanteado): boolean {
  for (const e of p.exigidas) if (!bajadas.has(e)) return false;
  for (const [a, b] of p.incompatibles) if (bajadas.has(a) && bajadas.has(b)) return false;
  for (const [a, b] of p.arrastres) if (bajadas.has(a) && !bajadas.has(b)) return false;
  return true;
}

/**
 * Todas las configuraciones legales, por enumeración de las 2^N.
 *
 * Con ocho palancas son 256 y con diez, 1024. Enumerar es instantáneo y es lo
 * único que permite afirmar que el mínimo es ÚNICO, que es la condición sin la
 * cual dos personas darían dos respuestas igual de buenas y una saldría
 * rechazada.
 */
function legalesDe(p: EnclavamientoPlanteado): number[][] {
  const salida: number[][] = [];
  for (let mascara = 0; mascara < 1 << p.palancas; mascara++) {
    const bajadas = new Set<number>();
    for (let i = 0; i < p.palancas; i++) if (mascara & (1 << i)) bajadas.add(i + 1);
    if (configuracionLegal(bajadas, p)) salida.push([...bajadas].sort((a, b) => a - b));
  }
  return salida;
}

/** El mínimo, y si es único. Lo usa la generación y lo usa la corrección. */
export function minimoDelEnclavamiento(
  p: EnclavamientoPlanteado,
): { minima: number[]; unica: boolean } | undefined {
  const legales = legalesDe(p);
  if (legales.length === 0) return undefined;
  const menor = Math.min(...legales.map((c) => c.length));
  const empatadas = legales.filter((c) => c.length === menor);
  return { minima: empatadas[0]!, unica: empatadas.length === 1 };
}

/**
 * Plantea un cuadro de enclavamiento con una sola respuesta buena.
 *
 * ═══ SE GENERA DESDE LA RESPUESTA, NO HACIA ELLA ═══
 *
 * Primero se elige qué palancas van bajadas —eso es la respuesta— y luego se
 * escriben bloqueos que esa configuración CUMPLE. Así la existencia de solución
 * es cierta por construcción, y lo único que queda por comprobar es que sea la
 * única mínima, que se hace enumerando.
 *
 * Los bloqueos son de dos clases y las dos son de un enclavamiento de verdad:
 * dos palancas que no pueden estar bajadas a la vez porque abrirían itinerarios
 * que se cortan, y una palanca que arrastra a otra porque una señal no se
 * despeja sin su aguja.
 */
export function plantearEnclavamiento(franja: number, semilla: string): InstrumentoPlanteado {
  const rnd = azarCon(`enclavamiento:${semilla}:${franja}`);
  const palancas = franja <= 2 ? 6 : franja <= 4 ? 7 : 8;
  const ITINERARIOS = [
    'la vía I al ramal de la Cuenca',
    'la vía II al andén de viajeros',
    'la vía III al muelle cubierto',
    'la vía I al depósito de máquinas',
    'la vía II al ramal de la frontera',
  ];

  for (let intento = 0; intento < 80; intento++) {
    const todas = Array.from({ length: palancas }, (_, i) => i + 1);
    /* La respuesta: entre tres y la mitad del cuadro. */
    const cuantas = 3 + Math.floor(rnd() * Math.max(1, Math.floor(palancas / 2) - 1));
    const bajadas = new Set(barajar(todas, rnd).slice(0, cuantas));
    const subidas = todas.filter((n) => !bajadas.has(n));
    if (subidas.length < 2) continue;

    /* Las exigidas: un par de las bajadas. El resto hay que deducirlo. */
    const bajadasLista = [...bajadas].sort((a, b) => a - b);
    const exigidas = barajar(bajadasLista, rnd)
      .slice(0, Math.max(1, Math.floor(bajadasLista.length / 2)))
      .sort((a, b) => a - b);

    /*
     * Incompatibles: pares donde al menos una está SUBIDA, así que la respuesta
     * los cumple. Son lo que impide bajar palancas de más.
     */
    const incompatibles: Array<[number, number]> = [];
    for (const s of subidas) {
      for (const otra of todas) {
        if (otra === s) continue;
        if (rnd() < 0.35) incompatibles.push([Math.min(s, otra), Math.max(s, otra)]);
      }
    }

    /*
     * Arrastres: de una bajada a otra bajada. Son lo que OBLIGA a bajar las que
     * no están exigidas — o sea, lo que hay que deducir.
     */
    const arrastres: Array<[number, number]> = [];
    for (const a of bajadasLista) {
      for (const b of bajadasLista) {
        if (a === b) continue;
        if (rnd() < 0.4) arrastres.push([a, b]);
      }
    }
    /* Y alguno desde una subida, que es cierto en vacío y despista sin mentir. */
    for (const s of subidas) {
      if (rnd() < 0.3) {
        const destino = todas[Math.floor(rnd() * todas.length)]!;
        if (destino !== s) arrastres.push([s, destino]);
      }
    }

    const planteamiento: EnclavamientoPlanteado = {
      palancas,
      exigidas,
      incompatibles: [...new Map(incompatibles.map((p) => [p.join('-'), p])).values()],
      arrastres: [...new Map(arrastres.map((p) => [p.join('>'), p])).values()],
      itinerario: ITINERARIOS[Math.floor(rnd() * ITINERARIOS.length)]!,
    };

    const min = minimoDelEnclavamiento(planteamiento);
    if (!min || !min.unica) continue;
    /* Que no sea trivial: si la respuesta son las exigidas y nada más, no hay
       nada que deducir. */
    if (min.minima.length <= exigidas.length) continue;
    /* Y que se pueda llevar en la cabeza: más de seis palancas bajadas es tedio. */
    if (min.minima.length > 6) continue;

    return { cual: 'enclavamiento', planteamiento, solucion: { minima: min.minima } };
  }
  throw new Error('No se ha podido plantear un enclavamiento con una sola respuesta buena.');
}

export function comprobarEnclavamiento(minima: number[], respuesta: number[]): boolean {
  const a = [...new Set(minima)].sort((x, y) => x - y).join(',');
  const b = [...new Set(respuesta)].sort((x, y) => x - y).join(',');
  return a === b;
}

// ---------------------------------------------------------------------------
// EL CARGUE · muelle de carga
// ---------------------------------------------------------------------------

/**
 * Plantea un cargue que se puede repartir.
 *
 * ═══ TAMBIÉN DESDE LA RESPUESTA ═══
 *
 * Se reparten los bultos al azar entre los vagones y DESPUÉS se calculan los
 * topes de peso a partir de ese reparto, con muy poca holgura. Así hay al menos
 * una solución por construcción, y la holgura corta es lo que hace que sea un
 * rompecabezas y no una suma: con topes generosos cabe cualquier cosa.
 *
 * Las incompatibilidades se escriben entre bultos que quedaron en vagones
 * DISTINTOS, así que el reparto de partida las cumple.
 *
 * NO SE EXIGE QUE LA SOLUCIÓN SEA ÚNICA, y es deliberado: repartir bultos
 * admite simetrías tontas —intercambiar dos vagones con la misma carga— y
 * pedirlas únicas obligaría a rechazar repartos que también cargan el tren. Se
 * comprueba la VALIDEZ de lo que llega, no su igualdad con nada.
 */
export function plantearCargue(
  franja: number,
  semilla: string,
  vocabulario: VocabularioDeLaEstacion,
): InstrumentoPlanteado {
  const rnd = azarCon(`cargue:${semilla}:${franja}`);
  const cuantosVagones = franja <= 3 ? 3 : 4;
  const cuantosBultos = franja <= 2 ? 6 : franja <= 4 ? 7 : 8;

  const NOMBRES = [
    'Cajón de vidrio',
    'Fardo de paja',
    'Bidón de aceite',
    'Saco de correo',
    'Traviesa de roble',
    'Barril de salazón',
    'Bala de algodón',
    'Jaula de gallinas',
    'Cuñete de clavos',
    'Rollo de alambre',
  ];
  const nombresDeBulto = barajar(
    [...vocabulario.mercancias.map((m) => m.slice(0, 24)), ...NOMBRES],
    rnd,
  );

  const vagones = Array.from({ length: cuantosVagones }, (_, i) => ({
    id: `v${i + 1}`,
    nombre: `Vagón ${['I', 'II', 'III', 'IV'][i]}`,
    tope: 0,
  }));
  const bultos = Array.from({ length: cuantosBultos }, (_, i) => ({
    id: `b${i + 1}`,
    nombre: nombresDeBulto[i % nombresDeBulto.length] ?? `Bulto ${i + 1}`,
    peso: 1 + Math.floor(rnd() * 5),
  }));

  /* El reparto de partida: cada bulto a un vagón al azar. */
  const donde = new Map<string, string>();
  for (const b of bultos) donde.set(b.id, vagones[Math.floor(rnd() * vagones.length)]!.id);

  /* Los topes salen de ese reparto, con holgura de cero o uno. */
  for (const v of vagones) {
    const carga = bultos
      .filter((b) => donde.get(b.id) === v.id)
      .reduce((a, b) => a + b.peso, 0);
    v.tope = carga + (rnd() < 0.5 ? 0 : 1);
  }
  /* Un vagón sin carga y con tope cero no es un vagón: es una fila muerta. */
  for (const v of vagones) if (v.tope === 0) v.tope = 2;

  /* Incompatibilidades entre bultos que ya están separados. */
  const incompatibles: Array<[string, string]> = [];
  for (const a of bultos) {
    for (const b of bultos) {
      if (a.id >= b.id) continue;
      if (donde.get(a.id) === donde.get(b.id)) continue;
      if (rnd() < 0.25) incompatibles.push([a.id, b.id]);
    }
  }

  const planteamiento: CarguePlanteado = { bultos, vagones, incompatibles };
  return {
    cual: 'muelle',
    planteamiento,
    /* Se guarda el planteamiento entero: la corrección lo necesita todo. */
    solucion: { planteamiento },
  };
}

export function comprobarCargue(
  p: CarguePlanteado,
  reparto: Record<string, string>,
): { vale: boolean; porque?: string } {
  const vagones = new Set(p.vagones.map((v) => v.id));
  for (const b of p.bultos) {
    const v = reparto[b.id];
    if (!v) return { vale: false, porque: `Falta colocar «${b.nombre}».` };
    if (!vagones.has(v)) return { vale: false, porque: 'Hay un bulto en un vagón que no existe.' };
  }
  for (const v of p.vagones) {
    const carga = p.bultos
      .filter((b) => reparto[b.id] === v.id)
      .reduce((a, b) => a + b.peso, 0);
    if (carga > v.tope) {
      return { vale: false, porque: `El ${v.nombre} va con ${carga} y solo aguanta ${v.tope}.` };
    }
  }
  for (const [a, b] of p.incompatibles) {
    if (reparto[a] && reparto[a] === reparto[b]) {
      const na = p.bultos.find((x) => x.id === a)?.nombre ?? a;
      const nb = p.bultos.find((x) => x.id === b)?.nombre ?? b;
      return { vale: false, porque: `«${na}» y «${nb}» no pueden ir en el mismo vagón.` };
    }
  }
  return { vale: true };
}

// ---------------------------------------------------------------------------
// La puerta común
// ---------------------------------------------------------------------------

/** Plantea el instrumento que toque en ese puesto y esa franja. */
export function plantearInstrumento(
  cual: InstrumentoId,
  franja: number,
  semilla: string,
  vocabulario: VocabularioDeLaEstacion,
): InstrumentoPlanteado {
  switch (cual) {
    case 'agujas':
      return plantearManiobra(franja, semilla);
    case 'telegrafo':
      return plantearParte(franja, semilla, vocabulario);
    case 'enclavamiento':
      return plantearEnclavamiento(franja, semilla);
    case 'muelle':
      return plantearCargue(franja, semilla, vocabulario);
  }
}

/**
 * Corrige lo que ha entregado alguien.
 *
 * ═══ LA RESPUESTA LLEGA POR `eligeLibre` Y NO SE FÍA DE ELLA ═══
 *
 * El motor pasa los campos de `eligeLibre` TAL CUAL y no los valida: ese es el
 * trato, y es lo correcto, porque el motor no sabe qué instrumento hay en ese
 * puesto. Así que lo que llega aquí es una CADENA CUALQUIERA venida de un
 * móvil, y se trata como tal: se parsea a la defensiva y cualquier cosa rara es
 * un fallo del instrumento, no una excepción que tumbe la ronda.
 */
export function corregirInstrumento(
  cual: InstrumentoId,
  planteamiento: unknown,
  solucion: unknown,
  respuesta: string,
): { vale: boolean; porque?: string } {
  try {
    switch (cual) {
      case 'agujas': {
        const s = solucion as { entrada: string[]; objetivo: string[] };
        return comprobarManiobra(s.entrada, s.objetivo, leerMovimientos(respuesta));
      }
      case 'telegrafo': {
        const s = solucion as { palabra: string };
        return comprobarParte(s.palabra, respuesta)
          ? { vale: true }
          : { vale: false, porque: 'El parte no coincide. Vuelve a escucharlo.' };
      }
      case 'enclavamiento': {
        const s = solucion as { minima: number[] };
        return comprobarEnclavamiento(s.minima, leerPalancas(respuesta))
          ? { vale: true }
          : {
              vale: false,
              porque: 'El enclavamiento no da paso con esas palancas, o hay alguna de más.',
            };
      }
      case 'muelle': {
        const p = planteamiento as CarguePlanteado;
        return comprobarCargue(p, leerReparto(respuesta));
      }
    }
  } catch {
    return { vale: false, porque: 'Eso no se entiende como una respuesta del instrumento.' };
  }
}

/** «a1,s1,p,a2,s2» → movimientos. Lo que no se entienda se descarta. */
function leerMovimientos(texto: string): MovimientoDeManiobra[] {
  return texto
    .split(/[,\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .map((t): MovimientoDeManiobra | undefined => {
      if (t === 'p') return { hacer: 'pasar' };
      if (t === 'a1') return { hacer: 'apartar', via: 1 };
      if (t === 'a2') return { hacer: 'apartar', via: 2 };
      if (t === 's1') return { hacer: 'sacar', via: 1 };
      if (t === 's2') return { hacer: 'sacar', via: 2 };
      return undefined;
    })
    .filter((m): m is MovimientoDeManiobra => m !== undefined);
}

/** «1,3,7» → [1,3,7]. */
function leerPalancas(texto: string): number[] {
  return texto
    .split(/[,\s]+/)
    .map((t) => Number(t.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/** «b1:v2,b2:v1» → {b1:'v2', b2:'v1'}. */
function leerReparto(texto: string): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const par of texto.split(/[,\s]+/)) {
    const [bulto, vagon] = par.split(':');
    if (bulto && vagon) salida[bulto.trim()] = vagon.trim();
  }
  return salida;
}
