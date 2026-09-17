/**
 * LA LINDE ALTA: la aritmética del lobby de Las Lindes, sin `three`.
 *
 * ═══ QUÉ SITIO ES ═══
 *
 * Un altozano sobre el valle vacío, con una MESA DE PIEDRA en medio donde está la
 * bolsa de losas y un corro de MOJONES alrededor, uno por sitio de la mesa. Quien
 * se sienta aparece junto a su mojón, mirando a la piedra del centro; cuando la
 * partida empieza, el valle de abajo es donde va a crecer el tablero.
 *
 * ═══ POR QUÉ UN LOBBY PROPIO Y NO EL MUELLE NI LA PLAZA ═══
 *
 * Por lo mismo que la Plaza no es el Muelle, y su cabecera lo dice mejor: comparten
 * el CONTRATO —las mismas props, los mismos avisos, el mismo tope de arranque— y
 * comparten todo lo que es aritmética o carga. Lo que no comparten es el paisaje. Un
 * embarcadero a la hora azul y una plaza de ciudad a la tarde no son el sitio donde
 * empieza una partida de poner losas en un valle; forzarlo sería un `if` dentro de
 * una escena ajena, y eso es lo que acaba convirtiendo dos paisajes en uno con
 * banderas.
 *
 * ═══ AQUÍ NO SE PINTA NADA ═══
 *
 * Este fichero devuelve PUESTAS —«esta pieza, en este punto, con este giro»— y
 * `LindeAlta.tsx` sólo instancia. Es la misma frontera que `losa.ts` y que
 * `escenas/burgo/ciudad.ts`, y por el mismo motivo: un mojón dentro de la mesa de
 * piedra no da error en ninguna consola, se ve, y aquí lo puede medir un
 * comprobador en Node.
 */
import { ALTURA_DE_UNA_PERSONA, ESCALA_DEL_PACK } from '../escala';
import { MODELO } from '../nombres';

/**
 * LO QUE MIDE EL ALTOZANO DE RADIO.
 *
 * Dieciséis personas. Empezó en diez y se vio en el banco que no: con diez, un
 * árbol del pack a su tamaño natural ocupa dos tercios del radio, así que o los
 * árboles salen de juguete o el alto parece un macetero. Dieciséis deja sitio para
 * el corro, para la piedra del centro y para que lo que crece alrededor tenga el
 * tamaño que tiene en el tablero — que es lo que hace que el lobby y la partida
 * parezcan el mismo mundo.
 */
export const RADIO_DEL_ALTOZANO = ALTURA_DE_UNA_PERSONA * 16;

/** El radio del corro de mojones. */
export const RADIO_DEL_CORRO = ALTURA_DE_UNA_PERSONA * 6.5;

/** Lo que se aleja del mojón quien está de pie a su lado. */
export const DELANTE_DEL_MOJON = ALTURA_DE_UNA_PERSONA * 0.85;

/** El radio de la mesa de piedra del centro. */
export const RADIO_DE_LA_MESA = ALTURA_DE_UNA_PERSONA * 1.6;

/** Lo que levanta la mesa de piedra del suelo. */
export const ALTO_DE_LA_MESA = ALTURA_DE_UNA_PERSONA * 0.78;

/** Cuánto sobresale el reborde de piedra del altozano. */
export const ALTO_DEL_REBORDE = ALTURA_DE_UNA_PERSONA * 0.22;

/** Cuántos sitios tiene el corro. Los cinco de la mesa. */
export const SITIOS_EN_EL_CORRO = 5;

/** Un punto del altozano. */
export interface PuntoDeLaLinde {
  readonly x: number;
  readonly z: number;
}

/** Un sitio del corro: su mojón, dónde se pone quien lo ocupa y hacia dónde mira. */
export interface SitioDeLaLinde {
  readonly indice: number;
  /** Dónde está clavado el mojón. */
  readonly mojon: PuntoDeLaLinde;
  /** Dónde se pone de pie quien lo ocupa. */
  readonly pie: PuntoDeLaLinde;
  /** Hacia dónde mira: siempre a la mesa de piedra. */
  readonly giro: number;
  /** Desde dónde llega andando, fuera del altozano. */
  readonly entrada: PuntoDeLaLinde;
}

/**
 * LA TABLA DE COSENOS DEL CORRO, escrita y no calculada.
 *
 * ═══ POR QUÉ NO SE LLAMA A `Math.cos` ═══
 *
 * Por lo mismo que `escenas/burgo/ciudad.ts` tiene su `COSENO_DEL_CUARTO`: dos
 * motores de JavaScript pueden diferir en el último bit de un coseno, y un lobby
 * que no coincide entre el móvil y el PC no es el mismo lobby —quien mira desde el
 * móvil vería a su compañero medio paso a la izquierda de donde lo ve él—. Con
 * cinco sitios fijos, la tabla son cinco parejas y se acabó el problema.
 *
 * Son los cinco vértices de un pentágono regular con el primero al NORTE (−z), en
 * el sentido de las agujas del reloj. Redondeados a seis decimales, que es más
 * precisión de la que un mojón necesita.
 */
export const CORRO: readonly { readonly seno: number; readonly coseno: number }[] = [
  { seno: 0, coseno: -1 },
  { seno: 0.951057, coseno: -0.309017 },
  { seno: 0.587785, coseno: 0.809017 },
  { seno: -0.587785, coseno: 0.809017 },
  { seno: -0.951057, coseno: -0.309017 },
];

/** El ángulo de cada sitio, para girar una pieza hacia el centro. */
export const GIRO_DEL_SITIO: readonly number[] = [0, 1.256637, 2.513274, 3.769911, 5.026548];

/**
 * LOS CINCO SITIOS DEL CORRO.
 *
 * El mojón va en el corro; quien lo ocupa, un paso por dentro y mirando a la mesa;
 * y la entrada, fuera del altozano en la misma dirección, que es por donde llega
 * andando. Las tres cosas en la misma línea desde el centro: así nadie atraviesa el
 * corro para llegar a su sitio.
 */
export function sitiosDeLaLinde(): readonly SitioDeLaLinde[] {
  const salida: SitioDeLaLinde[] = [];
  for (let i = 0; i < SITIOS_EN_EL_CORRO; i++) {
    const d = CORRO[i] as { seno: number; coseno: number };
    const mojon = { x: d.seno * RADIO_DEL_CORRO, z: d.coseno * RADIO_DEL_CORRO };
    const dentro = RADIO_DEL_CORRO - DELANTE_DEL_MOJON;
    const fuera = RADIO_DEL_ALTOZANO * 1.55;
    salida.push({
      indice: i,
      mojon,
      pie: { x: d.seno * dentro, z: d.coseno * dentro },
      /*
       * Mirando al centro. El giro que la marioneta entiende es el mismo que usa el
       * resto de la casa: cero mirando al norte (−z) y creciendo hacia el este.
       */
      giro: (GIRO_DEL_SITIO[i] as number) + Math.PI,
      entrada: { x: d.seno * fuera, z: d.coseno * fuera },
    });
  }
  return salida;
}

/** Una pieza del pack puesta en el altozano. */
export interface PuestaEnLaLinde {
  readonly pieza: string;
  readonly x: number;
  readonly z: number;
  readonly y: number;
  readonly giro: number;
  readonly escala: number;
}

/** Un sorteo con semilla, el mismo de siempre en esta casa. */
function sorteo(semilla: number): () => number {
  let x = (Math.trunc(semilla) >>> 0) + 0x6d2b79f5;
  return () => {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * LO QUE HAY ENCIMA DEL ALTOZANO, sembrado con el código de la mesa.
 *
 * La bolsa y unas losas apiladas sobre la piedra del centro, los mojones del corro,
 * y alrededor lo que hay en un alto: aliagas, algún tocón, piedras sueltas y un par
 * de árboles que no tapan la vista del valle.
 *
 * ═══ NADA DE ESTO SE PONE DELANTE DE UN SITIO ═══
 *
 * Y es la única regla que este reparto tiene: si una piedra cae donde va a estar de
 * pie alguien, se descarta. Un aventurero dentro de una roca no da error, se ve — y
 * se ve justo en la pantalla donde la gente decide si esta mesa le apetece.
 */
export function loQueHayEnLaLinde(semilla: number): readonly PuestaEnLaLinde[] {
  const tirada = sorteo(semilla);
  const sitios = sitiosDeLaLinde();
  const puestas: PuestaEnLaLinde[] = [];

  /* La bolsa de losas, en la piedra del centro. */
  puestas.push({
    pieza: MODELO.saco,
    x: 0,
    z: 0,
    y: ALTO_DE_LA_MESA,
    giro: tirada() * Math.PI * 2,
    escala: ESCALA_DEL_PACK * 2.4,
  });
  puestas.push({
    pieza: MODELO.caja,
    x: RADIO_DE_LA_MESA * 0.42,
    z: RADIO_DE_LA_MESA * 0.3,
    y: ALTO_DE_LA_MESA,
    giro: tirada() * Math.PI * 2,
    escala: ESCALA_DEL_PACK * 2.1,
  });
  puestas.push({
    pieza: MODELO.barril,
    x: -RADIO_DE_LA_MESA * 0.44,
    z: RADIO_DE_LA_MESA * 0.36,
    y: ALTO_DE_LA_MESA,
    giro: tirada() * Math.PI * 2,
    escala: ESCALA_DEL_PACK * 1.8,
  });

  /* Los mojones: una piedra hincada por sitio. */
  for (const s of sitios) {
    puestas.push({
      pieza: MODELO.piedra,
      x: s.mojon.x,
      z: s.mojon.z,
      y: 0,
      giro: s.giro,
      /*
       * Un mojón es una piedra hincada de la altura de un muslo, no un peñasco. A
       * 3,4 medía tres personas de ancho y el corro parecía un círculo de menhires.
       */
      escala: ESCALA_DEL_PACK * 1.7,
    });
  }

  /* Y lo que crece en un alto, fuera del corro y nunca delante de un sitio. */
  /*
   * ═══ LAS ESCALAS SON LAS DEL TABLERO, Y NO LAS DE ESTE ALTO ═══
   *
   * Un árbol tiene que medir aquí lo mismo que mide en una losa: es el MISMO valle
   * visto de cerca, y si en el lobby los árboles son el doble, al empezar la partida
   * el mundo encoge. Son las escalas de `LO_DE_LA_PARCELA` de `losa.ts`, no unas
   * elegidas para que el alto se vea lleno.
   */
  const deFuera: readonly { pieza: string; escala: number }[] = [
    { pieza: MODELO.rocaC, escala: 1.6 },
    { pieza: MODELO.rocaE, escala: 1.5 },
    { pieza: MODELO.tocon, escala: 1.7 },
    { pieza: MODELO.arbolA, escala: 1.9 },
    { pieza: MODELO.arbolB, escala: 1.8 },
    { pieza: MODELO.almiar, escala: 1.7 },
    { pieza: MODELO.colinaA, escala: 1.8 },
  ];
  for (let k = 0; k < 34; k++) {
    const que = deFuera[Math.floor(tirada() * deFuera.length)] as { pieza: string; escala: number };
    /* Entre el corro y el borde, o justo fuera del altozano. */
    const radio = RADIO_DEL_CORRO * (1.18 + tirada() * 0.75);
    const i = Math.floor(tirada() * CORRO.length);
    const d = CORRO[i] as { seno: number; coseno: number };
    const otro = CORRO[(i + 1) % CORRO.length] as { seno: number; coseno: number };
    const t = tirada();
    /* Entre dos direcciones del corro, para no alinearlo todo en cinco radios. */
    const seno = d.seno + (otro.seno - d.seno) * t;
    const coseno = d.coseno + (otro.coseno - d.coseno) * t;
    const largo = Math.sqrt(seno * seno + coseno * coseno);
    if (largo <= 0) continue;
    const donde = { x: (seno / largo) * radio, z: (coseno / largo) * radio };
    if (sitios.some((s) => cerca(donde, s.pie, ALTURA_DE_UNA_PERSONA * 1.5))) continue;
    if (sitios.some((s) => cerca(donde, s.mojon, ALTURA_DE_UNA_PERSONA * 1.1))) continue;
    /*
     * ═══ Y NADA EN EL PASILLO POR EL QUE MIRA LA CÁMARA ═══
     *
     * La cámara de este lobby está fija al sur del corro, mirando al centro. Un
     * árbol sembrado ahí no tapa «un poco»: tapa la escena entera, porque está a dos
     * metros del objetivo y a cuarenta del fondo. Se vio en el banco con cinco
     * sentados y un pino delante de los cinco.
     */
    if (donde.z > RADIO_DEL_CORRO * 0.35 && Math.abs(donde.x) < RADIO_DEL_ALTOZANO * 0.62) continue;
    puestas.push({
      pieza: que.pieza,
      x: donde.x,
      z: donde.z,
      y: 0,
      giro: tirada() * Math.PI * 2,
      escala: ESCALA_DEL_PACK * que.escala * (0.85 + tirada() * 0.35),
    });
  }

  return puestas;
}

/** ¿Están estos dos puntos a menos de esto? */
function cerca(a: PuntoDeLaLinde, b: PuntoDeLaLinde, cuanto: number): boolean {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz < cuanto * cuanto;
}

/**
 * EL VALLE DEL FONDO: lo que se ve desde el alto, y por qué está.
 *
 * Unas lomas y arboledas más abajo y más lejos, en el sentido en el que la cámara
 * mira. No es decoración: es LO QUE SE ESTÁ MIRANDO desde aquí —el sitio donde va a
 * crecer el tablero— y sin ello el altozano es una plataforma flotando en la niebla.
 *
 * Va aparte de `loQueHayEnLaLinde` porque se recorta con la calidad: en un móvil
 * sobrio no se pinta, y lo que hay encima del alto se pinta siempre.
 */
export function elValleDelFondo(semilla: number): readonly PuestaEnLaLinde[] {
  const tirada = sorteo(semilla ^ 0x7a11e);
  const puestas: PuestaEnLaLinde[] = [];
  const deLejos: readonly { pieza: string; escala: number }[] = [
    { pieza: MODELO.colinasA, escala: 6 },
    { pieza: MODELO.colinasB, escala: 5.5 },
    { pieza: MODELO.colinasArboladas, escala: 6 },
    { pieza: MODELO.arboledaGrande, escala: 4.5 },
    { pieza: MODELO.arboledaMedia, escala: 4 },
    { pieza: MODELO.montanaVerde, escala: 7 },
  ];
  for (let k = 0; k < 34; k++) {
    const que = deLejos[Math.floor(tirada() * deLejos.length)] as { pieza: string; escala: number };
    const radio = RADIO_DEL_ALTOZANO * (2.4 + tirada() * 3.6);
    const angulo = tirada() * Math.PI * 2;
    /*
     * Aquí SÍ se usa seno y coseno, y no pasa nada: el valle del fondo es paisaje
     * que nadie toca ni compara, a diferencia de los sitios del corro, donde medio
     * paso de diferencia entre dos aparatos se ve como que alguien está en otro
     * lado. La regla es la del §5.5 del motor aplicada donde importa y no donde no.
     */
    puestas.push({
      pieza: que.pieza,
      x: Math.sin(angulo) * radio,
      z: Math.cos(angulo) * radio,
      y: -ALTURA_DE_UNA_PERSONA * (2.2 + tirada() * 2.2),
      giro: tirada() * Math.PI * 2,
      escala: ESCALA_DEL_PACK * que.escala * (0.8 + tirada() * 0.5),
    });
  }
  return puestas;
}
