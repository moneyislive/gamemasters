/**
 * LA POSE DE SALIDA DEL DELTA: el tablero entero, entre la cinta de arriba y la mesa de abajo,
 * en cada forma de pantalla. Aritmética pura, sin `three` y sin React.
 *
 * ═══ EL FALLO QUE ESTO ARREGLA, VISTO CON EL FOTÓGRAFO EL 27-SEP ═══
 *
 * La cercanía de salida era `{ factor: 1, centro: 0 }` en todos los aparatos: mirar al centro
 * del delta desde la distancia de siempre. En los APAISADOS —844×390, 915×412, 1024×768, el
 * portátil a 1366×768— la fila de comarcas del canto sur quedaba DETRÁS de la mesa de madera
 * (la barra cuelga de la cámara y tapa el 20 % de abajo): se jugaba sin ver la comarca del «8»,
 * sin un error en ninguna parte. Y en los de PIE pasaba lo contrario: el delta cabía con tanto
 * aire que en un 360×640 medía el 70 % del ancho, con media pantalla de mar arriba.
 *
 * ═══ POR QUÉ ESTO NO ES EL «FACTOR QUE ENCAJA» QUE SE QUITÓ DE LA APP ═══
 *
 * La cabecera de `Ojo` (app) cuenta que hubo una cuenta que proyectaba el delta y alejaba el
 * ojo hasta que cupiera, y que se quitó por dos cosas: daba factor 2,18 en 16:9 —el delta a
 * menos de la mitad— y BOMBEABA con el gesto, porque se recalculaba en cada fotograma con el
 * mirador de ese momento. Esto no hace ninguna de las dos:
 *
 *   · SE CALCULA UNA VEZ, con el MIRADOR DE SALIDA y el tamaño del lienzo, y sólo decide dónde
 *     empieza la cámara y adónde vuelve «Ver el tablero entero». Girar, inclinar o acercar no lo
 *     llaman: inclinar sigue siendo inclinar.
 *   · NO SÓLO ALEJA: primero CORRE LA MIRADA hacia la cámara, que sube el delta en la pantalla
 *     sin encogerlo (es lo que hace el Burgo, `poseDeSalida`), y sólo aleja lo que haga falta
 *     después. Y nunca más allá de `MAS_LEJOS` (1,25), el tope que ya tiene la rueda.
 *
 * ═══ LA CUENTA ═══
 *
 * La cámara es la de los dos clientes, compuesta con las mismas piezas que ellos:
 * `ojoYMira(cercania, alcance, d => ojoDelMirador(MIRADOR_DE_SALIDA, d, proporcion))`, campo
 * vertical de 45° y `lookAt` con el cielo arriba. Se proyectan doce puntos alrededor de cada
 * comarca, a un radio de comarca de su centro —la costa entra entera—, y se busca el factor más
 * pequeño (el delta más grande) con el que, corriendo la mirada lo justo para centrarlo en la
 * banda libre, todo cae dentro con `AIRE` de margen. La banda libre es la pantalla menos lo que
 * el cliente dice que tapa arriba (la cinta, en la Sala) y menos la barra de la mesa abajo, que
 * sale de `huecosDeLaBarra` y no se escribe aquí.
 */
import { centroDeHex } from '../shared/mecanicas/malla-hexagonal';
import type { Hex } from '../shared/mecanicas/malla-hexagonal';
import { MAS_LEJOS, factorValido, ojoYMira } from './acercar';
import type { Cercania } from './acercar';
import { DISTANCIA_DE_LA_BARRA, huecosDeLaBarra } from './barra';
import { ALTO_DE_LA_CARTA, ANCHO_DE_LA_TIRA } from './baraja';
import { MIRADOR_DE_SALIDA, ojoDelMirador } from './camara';
import { RADIO_DE_COMARCA } from './escala';

/** El campo vertical de la cámara de la mesa, el mismo que declaran los dos `Canvas`. */
export const CAMPO_DE_LA_MESA = (45 * Math.PI) / 180;

/** El margen alrededor del delta, en fracción del lado corto del lienzo. */
export const AIRE = 0.03;

/** Lo más cerca que puede EMPEZAR la cámara: más, y en un móvil de pie la mano de bienes pisa la costa. */
export const SALIDA_MAS_CERCA = 0.7;

/** Cuántos huecos se reservan para la barra: los cuatro de construir, el caso más ancho. */
const HUECOS_QUE_SE_RESERVAN = 4;

export interface LienzoDeLaSalida {
  /** En puntos CSS. */
  readonly ancho: number;
  readonly alto: number;
  /** Lo que tapa la interfaz por arriba, en puntos (la cinta de la Sala; 0 si nada). */
  readonly arriba?: number;
  /** Lo que convendría dejar libre arriba si el delta cabe igual (la cinta con su carril). */
  readonly arribaSiCabe?: number;
  /** Si hay barra de la mesa abajo. Sin ella, la banda llega al canto. */
  readonly conBarra?: boolean;
  /**
   * Si hay cartas en la mano: entonces a cada lado asoma una tira de naipes (`ANCHO_DE_LA_TIRA`
   * de la baraja de bienes, la más ancha de las dos manos) y la costa no se mete debajo.
   */
  readonly conManos?: boolean;
}

/** Lo que se come una mano en reposo por su canto, en puntos: la tira, con su inclinación. */
export function anchoDeLaManoQuieta(alto: number): number {
  return alto * ALTO_DE_LA_CARTA * ANCHO_DE_LA_TIRA * 1.2;
}

/** Un punto en la pantalla, en puntos desde la esquina de arriba a la izquierda. */
export interface EnPantalla {
  readonly x: number;
  readonly y: number;
}

type V3 = readonly [number, number, number];

const menos = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const punto = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unidad = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Los puntos del contorno del delta en el mundo (`x`, 0, `y` del plano), doce por comarca. */
export function siluetaDelDelta(hexes: readonly Hex[]): V3[] {
  const puntos: V3[] = [];
  for (const h of hexes) {
    const c = centroDeHex(h, RADIO_DE_COMARCA);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      puntos.push([c.x + Math.cos(a) * RADIO_DE_COMARCA, 0, c.y + Math.sin(a) * RADIO_DE_COMARCA]);
    }
  }
  return puntos;
}

/** Proyecta puntos del mundo con la cámara de la mesa puesta en `cercania`. */
export function proyectarDesdeLaMesa(
  puntos: readonly V3[],
  cercania: Cercania,
  alcance: number,
  lienzo: { ancho: number; alto: number },
): EnPantalla[] {
  const proporcion = lienzo.ancho / Math.max(1, lienzo.alto);
  const { ojo, mira } = ojoYMira(cercania, alcance, (d) => ojoDelMirador(MIRADOR_DE_SALIDA, d, proporcion));
  const delante = unidad(menos(mira, ojo));
  const derecha = unidad(cruz(delante, [0, 1, 0]));
  const arriba = cruz(derecha, delante);
  const t = Math.tan(CAMPO_DE_LA_MESA / 2);
  return puntos.map((p) => {
    const d = menos(p, ojo);
    const z = Math.max(1e-6, punto(d, delante));
    const nx = punto(d, derecha) / (z * t * proporcion);
    const ny = punto(d, arriba) / (z * t);
    return { x: ((nx + 1) / 2) * lienzo.ancho, y: ((1 - ny) / 2) * lienzo.alto };
  });
}

/** Hasta dónde llega la barra por arriba, en puntos desde el canto de arriba. */
export function techoDeLaBarra(lienzo: { ancho: number; alto: number }): number {
  const proporcion = lienzo.ancho / Math.max(1, lienzo.alto);
  const huecos = huecosDeLaBarra(HUECOS_QUE_SE_RESERVAN, CAMPO_DE_LA_MESA, proporcion);
  let techo = -Infinity;
  for (const h of huecos) techo = Math.max(techo, h.y + h.lado / 2);
  if (!Number.isFinite(techo)) return lienzo.alto;
  const ny = techo / (DISTANCIA_DE_LA_BARRA * Math.tan(CAMPO_DE_LA_MESA / 2));
  return ((1 - ny) / 2) * lienzo.alto;
}

function caja(ps: readonly EnPantalla[]): { izq: number; der: number; sup: number; inf: number } {
  let izq = Infinity;
  let der = -Infinity;
  let sup = Infinity;
  let inf = -Infinity;
  for (const p of ps) {
    izq = Math.min(izq, p.x);
    der = Math.max(der, p.x);
    sup = Math.min(sup, p.y);
    inf = Math.max(inf, p.y);
  }
  return { izq, der, sup, inf };
}

/**
 * LA CERCANÍA DE SALIDA para este lienzo. Sin lienzo medido, la de siempre.
 */
export function salidaDelDelta(hexes: readonly Hex[], alcance: number, lienzo: LienzoDeLaSalida): Cercania {
  if (!(lienzo.ancho > 0) || !(lienzo.alto > 0) || hexes.length === 0 || !(alcance > 0)) {
    return { factor: 1, centro: { x: 0, z: 0 } };
  }
  /*
   * PRIMERO CON LO QUE CONVENDRÍA DEJAR ARRIBA, Y SI NO CABE, CON LO QUE HAY QUE DEJAR. En la Sala
   * la cinta mide 44 y con su carril 88: el carril va y viene con las jugadas y la pose no puede
   * seguirlo (saltaría con la revisión), así que se le deja sitio SI CABE. En 844×390 no cabe ni
   * con el tope de la rueda, y entonces se reserva sólo la cinta: el carril, cuando sale, cuelga
   * sobre el mar del norte en vez de encoger el delta por debajo de lo que se lee.
   */
  if (lienzo.arribaSiCabe !== undefined && lienzo.arribaSiCabe > (lienzo.arriba ?? 0)) {
    const holgada = intentarLaSalida(hexes, alcance, { ...lienzo, arriba: lienzo.arribaSiCabe });
    if (holgada !== null) return holgada;
  }
  return intentarLaSalida(hexes, alcance, lienzo) ?? laSalidaQueNoCabe(hexes, alcance, lienzo);
}

/** El delta no cabe ni en el tope de la rueda: lo más lejos que se deja, centrado en la banda. */
function laSalidaQueNoCabe(hexes: readonly Hex[], alcance: number, lienzo: LienzoDeLaSalida): Cercania {
  return intentarLaSalida(hexes, alcance, lienzo, true) ?? { factor: MAS_LEJOS, centro: { x: 0, z: 0 } };
}

function intentarLaSalida(
  hexes: readonly Hex[],
  alcance: number,
  lienzo: LienzoDeLaSalida,
  aunqueNoQuepa = false,
): Cercania | null {
  const puntos = siluetaDelDelta(hexes);
  const aire = AIRE * Math.min(lienzo.ancho, lienzo.alto);
  const sup = (lienzo.arriba ?? 0) + aire;
  const inf = (lienzo.conBarra === false ? lienzo.alto : techoDeLaBarra(lienzo)) - aire;
  /*
   * LA MANO DE BIENES ASOMA POR LA DERECHA, y sólo se le deja sitio a ella: es la que hay casi
   * siempre desde que se reparte, y mide un 30 % más que la del mazo. Reservar los dos cantos le
   * quitaba al delta de pie casi un cuarto del ancho (medido: de 327 a 242 puntos en 360×640), y
   * la del mazo, cuando sale, asoma sobre el mar del oeste.
   */
  const lado = lienzo.conManos === true ? anchoDeLaManoQuieta(lienzo.alto) : 0;
  const izq = aire;
  const der = lienzo.ancho - aire - lado;
  const medio = (sup + inf) / 2;
  const enMedio = (izq + der) / 2;
  /* Hacia la cámara, en el plano: correr la mirada por aquí sube el delta en la pantalla. */
  const hacia = { x: Math.sin(MIRADOR_DE_SALIDA.rumbo), z: Math.cos(MIRADOR_DE_SALIDA.rumbo) };
  /* Y a la derecha de quien mira: correr la mirada por aquí lleva el delta a la IZQUIERDA. */
  const aLaDerecha = { x: Math.cos(MIRADOR_DE_SALIDA.rumbo), z: -Math.sin(MIRADOR_DE_SALIDA.rumbo) };
  const con = (factor: number, s: number, l: number): Cercania => ({
    factor,
    centro: { x: hacia.x * s + aLaDerecha.x * l, z: hacia.z * s + aLaDerecha.z * l },
  });

  /*
   * LOS DOS CORRIMIENTOS QUE CENTRAN EL DELTA EN LA BANDA, por bisección: hacia la cámara baja el
   * centro vertical, a la derecha lo lleva a la izquierda. Son casi independientes, así que dos
   * pasadas alternas bastan (la segunda corrige lo que la perspectiva cruza).
   */
  const centrar = (factor: number): { s: number; l: number } => {
    let s = 0;
    let l = 0;
    for (let pasada = 0; pasada < 2; pasada++) {
      let a = -alcance * 0.6;
      let b = alcance * 0.6;
      for (let i = 0; i < 30; i++) {
        const m = (a + b) / 2;
        const k = caja(proyectarDesdeLaMesa(puntos, con(factor, s, m), alcance, lienzo));
        if ((k.izq + k.der) / 2 < enMedio) b = m;
        else a = m;
      }
      l = (a + b) / 2;
      a = -alcance * 0.6;
      b = alcance * 0.6;
      for (let i = 0; i < 30; i++) {
        const m = (a + b) / 2;
        const k = caja(proyectarDesdeLaMesa(puntos, con(factor, m, l), alcance, lienzo));
        if ((k.sup + k.inf) / 2 > medio) a = m;
        else b = m;
      }
      s = (a + b) / 2;
    }
    return { s, l };
  };
  const redondo = (factor: number, c: { s: number; l: number }): Cercania => {
    const p = con(factor, c.s, c.l);
    return { factor, centro: { x: Math.round(p.centro.x * 100) / 100, z: Math.round(p.centro.z * 100) / 100 } };
  };

  for (let f = SALIDA_MAS_CERCA; f <= MAS_LEJOS + 1e-9; f += 0.01) {
    const factor = factorValido(Math.round(f * 100) / 100);
    const c = centrar(factor);
    const k = caja(proyectarDesdeLaMesa(puntos, con(factor, c.s, c.l), alcance, lienzo));
    if (k.sup >= sup && k.inf <= inf && k.izq >= izq && k.der <= der) return redondo(factor, c);
  }
  return aunqueNoQuepa ? redondo(MAS_LEJOS, centrar(MAS_LEJOS)) : null;
}

/** ¿Es esta cercanía la de salida? Con tolerancia: viaja por React y por referencias. */
export function esLaSalida(c: Cercania, salida: Cercania): boolean {
  return (
    Math.abs(c.factor - salida.factor) < 1e-6 &&
    Math.abs(c.centro.x - salida.centro.x) < 1e-6 &&
    Math.abs(c.centro.z - salida.centro.z) < 1e-6
  );
}
