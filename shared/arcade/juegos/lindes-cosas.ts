/**
 * LAS COSAS DEL TABLERO: qué villa, qué senda, qué prado y qué ermita hay, y
 * cuáles están cerradas.
 *
 * ═══ POR QUÉ NO VIVEN EN EL ESTADO, QUE ES LA DECISIÓN DE ESTE FICHERO ═══
 *
 * La tentación es guardarlas: una lista de villas con sus losas dentro, que crece
 * cuando alguien pone una losa y se funde cuando dos se juntan. Es lo que hace
 * media docena de implementaciones de este tipo de juego, y es lo que convierte
 * un reductor de doscientas líneas en uno de mil con una clase de fallo propia:
 * **la lista y el tablero discrepan**, y el que se lee es la lista.
 *
 * Aquí las cosas se DERIVAN del tablero cada vez que hacen falta. El tablero es
 * la única verdad; una villa es una pregunta que se le hace. Cuesta recorrer unas
 * cuantas decenas de losas por movimiento —setenta y dos como mucho, y la partida
 * entera cabe en una milésima— y a cambio no existe el estado que se queda viejo.
 *
 * Esta es exactamente la disciplina que Riberas ya tiene escrita para sus premios
 * derivados —«el vado se recalcula solo»—, llevada hasta el final.
 *
 * ═══ CÓMO SE CUENTA: UN NUDO POR MEDIA RAYA ═══
 *
 * Cada losa puesta aporta nudos:
 *
 *     `v:x,y:l`   la muralla que sale por el lado l    (l en coordenadas del TABLERO)
 *     `s:x,y:l`   la senda que sale por el lado l
 *     `p:x,y:h`   el prado que sale por el hueco h
 *     `e:x,y`     la ermita, que no sale por ningún sitio
 *
 * Y se unen dos veces:
 *
 *   · DENTRO de la losa, por lo que el catálogo dice que va junto: los lados de
 *     una misma villa, los de una misma senda, los huecos de un mismo prado.
 *   · ENTRE losas vecinas, por la raya que comparten.
 *
 * Lo que queda son las componentes, y una componente es una cosa.
 *
 * ═══ Y CERRARSE ES UNA PREGUNTA DE UNA LÍNEA ═══
 *
 * Una villa o una senda está cerrada cuando **todos sus nudos tienen vecina
 * puesta**. No hace falta nada más, y conviene decir por qué basta, porque parece
 * que falta algo:
 *
 *   · Una senda que muere dentro de una losa —en una encrucijada, en la puerta de
 *     una ermita, contra una muralla— aporta UN SOLO nudo, porque el catálogo la
 *     declara con un solo lado. El cabo muerto no es un nudo abierto: no es un
 *     nudo. Por eso una senda entre dos encrucijadas se cierra en cuanto sus dos
 *     losas de los extremos tienen vecina, y no hace falta buscar «finales».
 *   · Una senda que da la vuelta y se muerde la cola tiene todos sus nudos con
 *     vecina, y está cerrada. Sale gratis.
 *
 * La ermita es la excepción y va por su cuenta: se cierra con sus OCHO vecinas,
 * contando las de las esquinas, y eso no es una raya compartida.
 *
 * ═══ NO SABE NADA DE JUGADORES ═══
 *
 * Aquí no hay labriegos, ni puntos de nadie, ni turnos. Este fichero contesta qué
 * hay en el tablero y cuánto vale; quién cobra lo decide `lindes.ts`, que es el
 * que sabe de mayorías. La raya está donde está para que un comprobador pueda
 * montar un tablero a mano y preguntarle cosas sin abrir una partida.
 */
import {
  LAS_OCHO,
  cabosDeLaSenda,
  huecoGirado,
  huecoQueToca,
  huecosDelLado,
  ladoGirado,
  ladoOpuesto,
  lindeDelLado,
  llaveDeCasilla,
  losaPorId,
  pradoDelHueco,
  sendaDelLado,
  vecina,
  villaDelLado,
  LADOS,
} from './lindes-losas';
import type { ClaseDeCosa, Giro, Lado, Losa } from './lindes-losas';

/** Una losa puesta en el tablero: cuál es y cómo está girada. */
export interface LosaPuesta {
  readonly losa: string;
  readonly giro: Giro;
}

/** El tablero: de la llave de una casilla a lo que hay puesto en ella. */
export type Tablero = Readonly<Record<string, LosaPuesta>>;

/**
 * UNA COSA DEL TABLERO, ya contada.
 *
 * `id` es la llave del nudo más pequeño de la componente, en orden de texto. Se
 * elige así y no por el orden en que se descubrió porque **tiene que ser estable
 * entre revisiones**: cualquier superficie que reconcilie por identidad —una
 * animación de cierre, un resaltado, una lista de cosas con gente— se
 * desincroniza si el identificador de la misma villa cambia al poner una losa en
 * la otra punta. Es la regla de los seudónimos del §5 bis del motor, aplicada a
 * algo que no es un asiento.
 */
export interface Cosa {
  readonly id: string;
  readonly clase: ClaseDeCosa;
  /** Las llaves de las casillas que toca, sin repetir y en orden de texto. */
  readonly casillas: readonly string[];
  /** Los nudos que la componen, en orden de texto. */
  readonly nudos: readonly string[];
  /** ¿Está cerrada? Para un prado, siempre `false`: un prado no se cierra. */
  readonly cerrada: boolean;
  /** Cuántos blasones lleva dentro. Cero salvo en las villas. */
  readonly blasones: number;
  /** Lo que se cobra si se cierra ahora. */
  readonly puntos: number;
  /** Lo que se cobra al acabar la partida sin haberse cerrado. */
  readonly puntosAlFinal: number;
}

/** Lo que sabe el tablero, ya masticado. */
export interface Cosas {
  /** Todas, en orden de `id`. */
  readonly todas: readonly Cosa[];
  /** De un nudo a la cosa a la que pertenece. */
  readonly deNudo: Readonly<Record<string, string>>;
  /** De un `id` a la cosa. */
  readonly porId: Readonly<Record<string, Cosa>>;
}

// ---------------------------------------------------------------------------
// Los nudos
// ---------------------------------------------------------------------------

/** El nudo de la muralla que sale por el lado `l` (coordenadas del tablero). */
export function nudoDeVilla(casilla: string, l: Lado): string {
  return `v:${casilla}:${l}`;
}

/** El nudo de la senda que sale por el lado `l`. */
export function nudoDeSenda(casilla: string, l: Lado): string {
  return `s:${casilla}:${l}`;
}

/** El nudo del prado que sale por el hueco `h`. */
export function nudoDePrado(casilla: string, h: number): string {
  return `p:${casilla}:${h}`;
}

/** El nudo de la ermita de una losa. */
export function nudoDeErmita(casilla: string): string {
  return `e:${casilla}`;
}

/**
 * EL NUDO DE UNA COSA DICHA COMO LA DICE QUIEN PLANTA: la losa, la clase y el
 * índice DENTRO DEL CATÁLOGO.
 *
 * ═══ POR QUÉ EL ÍNDICE ES DEL CATÁLOGO Y NO DEL TABLERO ═══
 *
 * Porque así **no depende del giro**. «La villa número 0 de esta losa» significa
 * lo mismo esté la losa como esté, mientras que «la muralla del norte» cambia al
 * girarla. Un movimiento que viaja por el cable con el índice del catálogo se
 * puede reejecutar aunque alguien cambie la forma de pintar los giros; uno con el
 * lado del tablero dentro, no.
 *
 * Devuelve `''` si esa cosa no existe en esa losa, que es la respuesta correcta a
 * un movimiento con un índice inventado.
 */
export function nudoDeLoPlantado(
  tablero: Tablero,
  casilla: string,
  clase: ClaseDeCosa,
  indice: number,
): string {
  const puesta = tablero[casilla];
  if (puesta === undefined) return '';
  const losa = losaPorId(puesta.losa);
  if (losa === null) return '';

  if (clase === 'ermita') return losa.ermita && indice === 0 ? nudoDeErmita(casilla) : '';

  if (clase === 'villa') {
    const villa = losa.villas[indice];
    if (villa === undefined || villa.lados.length === 0) return '';
    return nudoDeVilla(casilla, ladoGirado(villa.lados[0] as Lado, puesta.giro));
  }

  if (clase === 'senda') {
    const senda = losa.sendas[indice];
    if (senda === undefined || senda.lados.length === 0) return '';
    return nudoDeSenda(casilla, ladoGirado(senda.lados[0] as Lado, puesta.giro));
  }

  const prado = losa.prados[indice];
  if (prado === undefined || prado.huecos.length === 0) return '';
  return nudoDePrado(casilla, huecoGirado(prado.huecos[0] as number, puesta.giro));
}

// ---------------------------------------------------------------------------
// El recuento
// ---------------------------------------------------------------------------

/** Lo que se cobra por cada losa de una villa cerrada. */
export const POR_LOSA_DE_VILLA = 2;
/** Y por cada blasón de una villa cerrada. */
export const POR_BLASON = 2;
/** Lo que se cobra por cada losa de una senda, cerrada o no. */
export const POR_LOSA_DE_SENDA = 1;
/** Lo que vale una ermita cerrada: ella y sus ocho. */
export const POR_ERMITA_CERRADA = 9;
/** Lo que cobra un labriego de prado por cada villa cerrada que toque. */
export const POR_VILLA_DEL_PRADO = 3;

/**
 * DE UN TABLERO A SUS COSAS.
 *
 * Un solo recorrido: se crean los nudos, se unen por dentro, se unen por las
 * rayas compartidas, y al final se agrupan. El coste es lineal en losas puestas
 * salvo por la unión, que lo es casi.
 *
 * ═══ EL ORDEN DE TODO LO QUE SE RECORRE ES EXPLÍCITO ═══
 *
 * Nada se recorre con `for…in` ni se ordena sin comparador: las dos cosas están
 * prohibidas en `shared/` y por el mismo motivo —el orden de las claves con forma
 * de entero es numérico y no de inserción, y `sort()` sin comparador no ordena
 * igual en Hermes que en V8—. Lo que sale de aquí entra en el estado, así que un
 * orden distinto en dos aparatos es una partida distinta.
 */
export function cosasDelTablero(tablero: Tablero): Cosas {
  const casillas = Object.keys(tablero).sort(porTexto);

  /* Padre de cada nudo, para la unión. */
  const padre: Record<string, string> = {};
  const raiz = (n: string): string => {
    let actual = n;
    while (padre[actual] !== undefined && padre[actual] !== actual) {
      const arriba = padre[actual] as string;
      padre[actual] = (padre[arriba] ?? arriba) as string;
      actual = padre[actual] as string;
    }
    return actual;
  };
  const nace = (n: string): void => {
    if (padre[n] === undefined) padre[n] = n;
  };
  const unir = (a: string, b: string): void => {
    nace(a);
    nace(b);
    const ra = raiz(a);
    const rb = raiz(b);
    if (ra === rb) return;
    /* Gana siempre la llave más pequeña: así la raíz no depende del orden de llegada. */
    if (ra < rb) padre[rb] = ra;
    else padre[ra] = rb;
  };

  const claseDeNudo: Record<string, ClaseDeCosa> = {};
  const blasonDeNudo: Record<string, number> = {};

  /* 1 · Los nudos de cada losa, y la unión de lo que va junto dentro de ella. */
  for (const casilla of casillas) {
    const puesta = tablero[casilla] as LosaPuesta;
    const losa = losaPorId(puesta.losa);
    if (losa === null) continue;

    for (let i = 0; i < losa.villas.length; i++) {
      const villa = losa.villas[i] as { lados: readonly Lado[]; blason: boolean };
      let primero = '';
      for (const propio of villa.lados) {
        const n = nudoDeVilla(casilla, ladoGirado(propio, puesta.giro));
        nace(n);
        claseDeNudo[n] = 'villa';
        if (primero === '') {
          primero = n;
          /* El blasón se cuenta UNA VEZ por tramo de muralla, no una por lado. */
          blasonDeNudo[n] = villa.blason ? 1 : 0;
        } else {
          blasonDeNudo[n] = 0;
          unir(primero, n);
        }
      }
    }

    for (let i = 0; i < losa.sendas.length; i++) {
      const senda = losa.sendas[i] as { lados: readonly Lado[] };
      let primero = '';
      for (const propio of senda.lados) {
        const n = nudoDeSenda(casilla, ladoGirado(propio, puesta.giro));
        nace(n);
        claseDeNudo[n] = 'senda';
        if (primero === '') primero = n;
        else unir(primero, n);
      }
    }

    for (let i = 0; i < losa.prados.length; i++) {
      const prado = losa.prados[i] as { huecos: readonly number[] };
      let primero = '';
      for (const propio of prado.huecos) {
        const n = nudoDePrado(casilla, huecoGirado(propio, puesta.giro));
        nace(n);
        claseDeNudo[n] = 'prado';
        if (primero === '') primero = n;
        else unir(primero, n);
      }
    }

    if (losa.ermita) {
      const n = nudoDeErmita(casilla);
      nace(n);
      claseDeNudo[n] = 'ermita';
    }
  }

  /* 2 · La unión por las rayas compartidas. */
  for (const casilla of casillas) {
    const puesta = tablero[casilla] as LosaPuesta;
    const losa = losaPorId(puesta.losa);
    if (losa === null) continue;
    const donde = deLlave(casilla);
    if (donde === null) continue;

    for (const l of LADOS) {
      const alLado = vecina(donde.x, donde.y, l);
      const llaveVecina = llaveDeCasilla(alLado.x, alLado.y);
      const otra = tablero[llaveVecina];
      if (otra === undefined) continue;
      /*
       * Sólo se une hacia UNA de las dos direcciones —la del lado más pequeño de
       * las dos casillas— para no hacer el mismo trabajo dos veces. Da igual cuál,
       * mientras sea siempre la misma: unir es simétrico.
       */
      if (casilla > llaveVecina) continue;

      const opuesto = ladoOpuesto(l);
      const villaAqui = villaDelLado(losa, puesta.giro, l);
      if (villaAqui >= 0) unir(nudoDeVilla(casilla, l), nudoDeVilla(llaveVecina, opuesto));
      const sendaAqui = sendaDelLado(losa, puesta.giro, l);
      if (sendaAqui >= 0) unir(nudoDeSenda(casilla, l), nudoDeSenda(llaveVecina, opuesto));

      /*
       * Los prados van por huecos y se CRUZAN: los dos vecinos recorren la raya
       * compartida en sentidos contrarios. La cuenta está en `huecoQueToca`.
       */
      for (const h of huecosDelLado(l)) {
        const aqui = nudoDePrado(casilla, h);
        if (padre[aqui] === undefined) continue;
        const alla = nudoDePrado(llaveVecina, huecoQueToca(h));
        if (padre[alla] === undefined) continue;
        unir(aqui, alla);
      }
    }
  }

  /* 3 · Agrupar. */
  const nudos = Object.keys(padre).sort(porTexto);
  const porRaiz: Record<string, string[]> = {};
  for (const n of nudos) {
    const r = raiz(n);
    const lista = porRaiz[r];
    if (lista === undefined) porRaiz[r] = [n];
    else lista.push(n);
  }

  const todas: Cosa[] = [];
  const deNudo: Record<string, string> = {};
  const porId: Record<string, Cosa> = {};

  for (const id of Object.keys(porRaiz).sort(porTexto)) {
    const suyos = porRaiz[id] as string[];
    const clase = claseDeNudo[suyos[0] as string] ?? 'prado';

    const conCasilla: Record<string, true> = {};
    let blasones = 0;
    let cerrada = true;
    for (const n of suyos) {
      const partes = n.split(':');
      const casilla = partes[1] as string;
      conCasilla[casilla] = true;
      blasones += blasonDeNudo[n] ?? 0;
      deNudo[n] = id;
      if (clase === 'villa' || clase === 'senda') {
        const donde = deLlave(casilla);
        const l = Number(partes[2]) as Lado;
        if (donde === null) cerrada = false;
        else {
          const alLado = vecina(donde.x, donde.y, l);
          if (tablero[llaveDeCasilla(alLado.x, alLado.y)] === undefined) cerrada = false;
        }
      }
    }
    const lasCasillas = Object.keys(conCasilla).sort(porTexto);

    if (clase === 'ermita') {
      const donde = deLlave(lasCasillas[0] as string);
      const alrededor = donde === null ? 0 : cuantasAlrededor(tablero, donde.x, donde.y);
      const cosa: Cosa = {
        id,
        clase: 'ermita',
        casillas: lasCasillas,
        nudos: suyos,
        cerrada: alrededor === LAS_OCHO.length,
        blasones: 0,
        puntos: POR_ERMITA_CERRADA,
        puntosAlFinal: 1 + alrededor,
      };
      todas.push(cosa);
      porId[id] = cosa;
      continue;
    }

    if (clase === 'prado') {
      const cosa: Cosa = {
        id,
        clase: 'prado',
        casillas: lasCasillas,
        nudos: suyos,
        /* Un prado no se cierra nunca: sólo se cobra al final, y por las villas que toca. */
        cerrada: false,
        blasones: 0,
        puntos: 0,
        puntosAlFinal: 0,
      };
      todas.push(cosa);
      porId[id] = cosa;
      continue;
    }

    const cuantas = lasCasillas.length;
    const cosa: Cosa = {
      id,
      clase,
      casillas: lasCasillas,
      nudos: suyos,
      cerrada,
      blasones,
      puntos:
        clase === 'villa'
          ? cuantas * POR_LOSA_DE_VILLA + blasones * POR_BLASON
          : cuantas * POR_LOSA_DE_SENDA,
      puntosAlFinal: clase === 'villa' ? cuantas + blasones : cuantas * POR_LOSA_DE_SENDA,
    };
    todas.push(cosa);
    porId[id] = cosa;
  }

  return { todas, deNudo, porId };
}

/**
 * LAS VILLAS QUE TOCA UN PRADO, por identificador de cosa.
 *
 * ═══ POR QUÉ ESTO NO SE PUEDE SACAR DE LOS NUDOS ═══
 *
 * Porque un prado y una villa pueden compartir losa sin tocarse, y tocarse sin
 * compartir raya. Lo único que lo sabe es el catálogo, que lo dice losa a losa en
 * `prados[].villas`; aquí se traduce ese dato local al identificador de la
 * componente, que es lo que hace falta para cobrar.
 */
export function villasDelPrado(tablero: Tablero, cosas: Cosas, prado: Cosa): readonly string[] {
  const vistas: Record<string, true> = {};
  for (const nudo of prado.nudos) {
    const partes = nudo.split(':');
    const casilla = partes[1] as string;
    const h = Number(partes[2]);
    const puesta = tablero[casilla];
    if (puesta === undefined) continue;
    const losa = losaPorId(puesta.losa);
    if (losa === null) continue;
    const indice = pradoDelHueco(losa, puesta.giro, h);
    if (indice < 0) continue;
    const declarado = losa.prados[indice];
    if (declarado === undefined) continue;
    for (const iVilla of declarado.villas) {
      const villa = losa.villas[iVilla];
      if (villa === undefined || villa.lados.length === 0) continue;
      const nudoVilla = nudoDeVilla(casilla, ladoGirado(villa.lados[0] as Lado, puesta.giro));
      const id = cosas.deNudo[nudoVilla];
      if (id !== undefined) vistas[id] = true;
    }
  }
  return Object.keys(vistas).sort(porTexto);
}

/**
 * LAS COSAS QUE TOCAN UNA LOSA, por identificador.
 *
 * Lo que hace falta después de poner una losa: sólo puede haberse cerrado algo
 * que la toque. Incluye las ermitas de las OCHO de alrededor, que son las que una
 * losa nueva puede rematar sin ser suya.
 */
export function cosasQueTocan(tablero: Tablero, cosas: Cosas, casilla: string): readonly string[] {
  const vistas: Record<string, true> = {};
  for (const nudo of nudosDeLaCasilla(tablero, casilla)) {
    const id = cosas.deNudo[nudo];
    if (id !== undefined) vistas[id] = true;
  }
  const donde = deLlave(casilla);
  if (donde !== null) {
    for (const d of LAS_OCHO) {
      const vecinaErmita = nudoDeErmita(llaveDeCasilla(donde.x + d.x, donde.y + d.y));
      const id = cosas.deNudo[vecinaErmita];
      if (id !== undefined) vistas[id] = true;
    }
  }
  return Object.keys(vistas).sort(porTexto);
}

/** Todos los nudos que nacen de una losa puesta. */
export function nudosDeLaCasilla(tablero: Tablero, casilla: string): readonly string[] {
  const puesta = tablero[casilla];
  if (puesta === undefined) return [];
  const losa = losaPorId(puesta.losa);
  if (losa === null) return [];
  const salida: string[] = [];
  for (const villa of losa.villas) {
    for (const l of villa.lados) salida.push(nudoDeVilla(casilla, ladoGirado(l, puesta.giro)));
  }
  for (const senda of losa.sendas) {
    for (const l of senda.lados) salida.push(nudoDeSenda(casilla, ladoGirado(l, puesta.giro)));
  }
  for (const prado of losa.prados) {
    for (const h of prado.huecos) salida.push(nudoDePrado(casilla, huecoGirado(h, puesta.giro)));
  }
  if (losa.ermita) salida.push(nudoDeErmita(casilla));
  return salida.sort(porTexto);
}

/** Cuántas de las ocho de alrededor están puestas. */
export function cuantasAlrededor(tablero: Tablero, x: number, y: number): number {
  let cuantas = 0;
  for (const d of LAS_OCHO) {
    if (tablero[llaveDeCasilla(x + d.x, y + d.y)] !== undefined) cuantas++;
  }
  return cuantas;
}

// ---------------------------------------------------------------------------
// Poner una losa
// ---------------------------------------------------------------------------

/**
 * ¿CABE ESTA LOSA AQUÍ, ASÍ GIRADA?
 *
 * Las dos reglas del §1 del diseño, y ninguna más: la casilla tiene que estar
 * libre, tiene que tocar al menos una losa puesta, y **todo lado compartido
 * tiene que enseñar lo mismo**.
 *
 * El tablero vacío es el único caso en que no hace falta tocar nada, y no se
 * resuelve aquí: la primera losa la pone el reductor sin preguntar.
 */
export function cabe(tablero: Tablero, losa: Losa, giro: Giro, x: number, y: number): boolean {
  if (tablero[llaveDeCasilla(x, y)] !== undefined) return false;
  let toca = false;
  for (const l of LADOS) {
    const alLado = vecina(x, y, l);
    const otra = tablero[llaveDeCasilla(alLado.x, alLado.y)];
    if (otra === undefined) continue;
    const suya = losaPorId(otra.losa);
    if (suya === null) continue;
    toca = true;
    if (lindeDelLado(losa, giro, l) !== lindeDelLado(suya, otra.giro, ladoOpuesto(l))) return false;
  }
  return toca;
}

/** Una colocación legal: dónde y con qué giro. */
export interface Colocacion {
  readonly x: number;
  readonly y: number;
  readonly giro: Giro;
}

/**
 * TODAS LAS COLOCACIONES LEGALES DE UNA LOSA, en orden fijo.
 *
 * Se miran sólo las casillas LIBRES QUE TOCAN algo puesto, que son las únicas
 * donde una losa puede caber: con setenta y dos losas eso son un par de cientos
 * de casillas como mucho, y cuatro giros cada una.
 *
 * El orden —por casilla en texto y después por giro— es fijo a propósito: esta
 * lista alimenta las opciones que viajan por el cable, y una lista que se ordena
 * distinto en dos aparatos es una lista que se repinta entera en cada lectura.
 */
export function dondeCabe(tablero: Tablero, idDeLosa: string): readonly Colocacion[] {
  const losa = losaPorId(idDeLosa);
  if (losa === null) return [];
  const salida: Colocacion[] = [];
  for (const llave of huecosLibres(tablero)) {
    const donde = deLlave(llave);
    if (donde === null) continue;
    for (const giro of [0, 1, 2, 3] as const) {
      if (cabe(tablero, losa, giro, donde.x, donde.y)) salida.push({ x: donde.x, y: donde.y, giro });
    }
  }
  return salida;
}

/** Las casillas libres que tocan alguna losa puesta, en orden de texto. */
export function huecosLibres(tablero: Tablero): readonly string[] {
  const vistas: Record<string, true> = {};
  for (const llave of Object.keys(tablero).sort(porTexto)) {
    const donde = deLlave(llave);
    if (donde === null) continue;
    for (const l of LADOS) {
      const alLado = vecina(donde.x, donde.y, l);
      const suya = llaveDeCasilla(alLado.x, alLado.y);
      if (tablero[suya] === undefined) vistas[suya] = true;
    }
  }
  return Object.keys(vistas).sort(porTexto);
}

// ---------------------------------------------------------------------------
// Cosas de la casa
// ---------------------------------------------------------------------------

/**
 * EL COMPARADOR DE TEXTO, escrito una vez.
 *
 * `sort()` sin comparador está prohibido en `shared/` —el orden lo decide el
 * motor y no es el mismo en Hermes que en V8—, y escribirlo en catorce sitios es
 * catorce sitios donde se puede escribir al revés.
 */
export function porTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** La casilla que hay detrás de una llave, o `null` si la llave no es una. */
function deLlave(llave: string): { readonly x: number; readonly y: number } | null {
  const partes = llave.split(',');
  if (partes.length !== 2) return null;
  const x = Number(partes[0]);
  const y = Number(partes[1]);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  return { x, y };
}

/**
 * ¿TIENE ESTA LOSA ALGÚN CABO MUERTO DE SENDA?
 *
 * No lo usa el recuento —una senda de un solo nudo se cierra sola, ver la
 * cabecera— y sí lo usa la escena, que tiene que decidir si dibuja el final del
 * camino contra la muralla o contra el suelo. Vive aquí para que la respuesta sea
 * una y no dos.
 */
export function tieneCaboMuerto(losa: Losa): boolean {
  for (let i = 0; i < losa.sendas.length; i++) {
    if (cabosDeLaSenda(losa, i) === 1) return true;
  }
  return false;
}
