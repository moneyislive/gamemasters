/**
 * LAS CÁMARAS DE A PIE: la de hombro, la de ojos, y hacia dónde se gira la marioneta.
 *
 * ═══ POR QUÉ SALEN DE LAS LINDES ═══
 *
 * Nacieron en `escenas/lindes/paseo.ts`, que era el único sitio de la casa donde se andaba, y
 * no sabían nada de losas: una cámara detrás de alguien es la misma en un valle, en el anillo de
 * una ciudad o en un delta. Se mudan con el paseo para que el segundo juego que se ande no las
 * copie, porque la copia es exactamente como se pierde un arreglo como el de
 * `giroDeLaMarioneta`, que costó ver a un aventurero andando de espaldas. `lindes/paseo.ts` las
 * reexporta: quien las pedía allí las sigue encontrando.
 *
 * ═══ Y AHORA VAN A LA ALTURA DEL SUELO QUE SE PISA ═══
 *
 * Iban a una altura fija sobre el cero, y el cero no es el suelo en ningún sitio que importe: en
 * Las Lindes la senda está hundida 1,20 unidades y la villa alzada 0,66, y la senda es
 * justamente por donde se anda. La altura la da la escena, que es quien dibuja el suelo; aquí
 * sólo se le suma. Es presentación: dónde se puede estar lo decide la arena, que es plana.
 *
 * ═══ Y LA DE HOMBRO YA NO SE METE EN LAS PAREDES ═══
 *
 * Con las murallas de verdad en el mundo, andar de espaldas contra una dejaba la cámara de hombro
 * DENTRO de ella, o al otro lado: la pantalla entera era la cara de atrás de un muro, con quien
 * pasea detrás. Quedó abierto al estrenar los choques. Ahora, en cada fotograma, se recorre el
 * tramo que va de quien pasea a donde querría ir la cámara con las mismas preguntas con las que se
 * anda (`sePuedeEstar` de `mundo.ts`: que haya suelo y que no haya cuerpo), y la cámara se queda
 * en el último trozo libre (`hastaDondeCabeElHombro`). No salta hasta allí: se acerca deprisa y se
 * aleja despacio (`acercarElHombro`), y nunca más cerca que `ATRAS_MINIMO_DEL_HOMBRO`.
 *
 * La arena es plana y un cuerpo no tiene altura (ver `mundo.ts`), así que la cámara también se
 * acerca detrás de algo bajo que, a su altura, pasaría por encima: un almiar, un seto. Es el precio
 * de preguntarle al mismo mundo con el que se choca en vez de inventar otro; no se atraviesa nada.
 *
 * ═══ Y TAMPOCO SE QUEDA DETRÁS DEL ADORNO ═══
 *
 * La arena es la estructura y nada más: el adorno —farolas, semáforos, árboles, coches aparcados—
 * no está en ella, porque un paseante lo atraviesa y el servidor no sabe de él. Así que la cámara
 * tampoco lo veía, y jugando al Burgo el 27-sep-2026 se quedó detrás de una señal de tráfico que
 * tapaba media pantalla, y luego detrás de un semáforo. Ahora el juego puede DECLARAR lo que estorba
 * a la vista (`estorbos.ts`: cajas con altura, a rodajas) y la cámara, además de lo que cabe en la
 * arena, mira hasta dónde puede irse sin que ninguna caja se ponga entre ella y el pecho de quien
 * pasea (`hastaDondeNoTapa`). Se queda con el menor de los dos y lo alcanza igual, con
 * `acercarElHombro`: se acerca deprisa ante la señal y se aleja despacio al dejarla atrás.
 *
 * ═══ EL «EFECTO DE QUEDARSE ATRÁS» ERA ESTO ═══
 *
 * Mientras el adorno se atravesaba, salir por detrás de un pino o de un semáforo dejaba la pieza entre
 * la cámara y el pecho a menos de un paso: la cámara se echaba a la nuca en un décimo de segundo (1,82
 * unidades en un fotograma, medido) y volvía a su sitio a tres por segundo, mientras quien pasea se
 * alejaba a doce. Se veía como si el avatar se quedara atrás. Desde que el adorno choca
 * (`adorno-que-choca.ts`) no se sale nunca por detrás de nada, y `verify:paseo` mide que el tirón no
 * vuelve. La arena con la que se mira lo que cabe detrás sigue siendo la de la ESTRUCTURA
 * (`estructuraDe`): con el adorno dentro, la cámara se echaría encima detrás de cada banco.
 */
import { RADIO_DEL_PASEANTE } from '../../shared/mecanicas/andar';
import { aNumero, deNumero } from '../../shared/mecanicas/fijo';
import { sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Arena } from '../../shared/mecanicas/mundo';
import { tapaLaVista } from './estorbos';
import type { EstorbosDelPaseo } from './estorbos';
import { ALTURA_DE_QUIEN_ANDA } from './talla';

/**
 * ═══ TODO VA EN ALTURAS DE QUIEN ANDA, NO DE LA PERSONA DEL MUNDO ═══
 *
 * Los ojos, el hombro, lo que se mira delante y lo que hay que ver cuelgan de
 * `ALTURA_DE_QUIEN_ANDA` (`talla.ts`). Estaban en `ALTURA_DE_UNA_PERSONA`, la vara del mundo, y el
 * 27-sep-2026 quien anda pasó a medir la mitad: con la vara del mundo, la cámara de hombro se habría
 * quedado a seis unidades y media de una figura de 1,27 —un muñeco en medio del encuadre— y la de
 * ojos a la altura de la coronilla de un gigante que ya no está. Con todo en la misma talla el
 * encuadre es el de siempre, con la figura a su tamaño contra lo que la rodea, que es lo que se pidió.
 */

/** A qué altura van los ojos sobre el suelo que se pisa. */
export const ALTURA_DE_LOS_OJOS = ALTURA_DE_QUIEN_ANDA * 0.92;

/**
 * CUÁNTO SE QUEDA LA CÁMARA DE HOMBRO POR DETRÁS Y POR ENCIMA del suelo que se pisa, y hacia dónde mira.
 *
 * ═══ UN TERCIO DE LA PANTALLA, Y LA CALLE POR DELANTE ═══
 *
 * Con la talla a pie la cámara encogió con la figura (2,6 alturas detrás, 1,5 encima, mirando a 2,36 por
 * delante y a 0,6 de alto) y el encuadre quedó el de siempre: la figura ocupaba el 42 % del alto del
 * lienzo con la coronilla en el centro, justo donde está la calle a la que se va. Miguel seguía viéndolos
 * «grandes», y con razón: en pantalla medían lo mismo. Ahora la cámara va a 3,6 alturas detrás y 1,6
 * encima, mirando a un punto a 4 alturas por delante y a media altura: la figura ocupa un TERCIO del
 * alto (31 %, `parteDeLaPantallaDeQuienAnda`) con la coronilla un pelo por debajo del centro, y la mitad
 * de arriba del lienzo es lo que tiene delante. El campo vertical de los tres juegos es 45°, así que en
 * portátil, tumbado y de pie la figura ocupa lo mismo de alto; `verify:paseo` lo proyecta.
 *
 * Lo que la acerca ante un muro o el adorno (`hastaDondeCabeElHombro`, `hastaDondeNoTapa`,
 * `acercarElHombro`) no cambia: parte de más lejos y se acerca igual, sin saltos.
 */
export const ATRAS_DEL_HOMBRO = ALTURA_DE_QUIEN_ANDA * 3.6;
export const SOBRE_EL_HOMBRO = ALTURA_DE_QUIEN_ANDA * 1.6;
/** A qué altura sobre el suelo está el punto al que mira la cámara de hombro: media figura. */
export const MIRA_DEL_HOMBRO = ALTURA_DE_QUIEN_ANDA * 0.5;

/**
 * Hacia dónde miran, por delante: la de ojos a cuatro alturas —casi recto, un pelo hacia abajo— y la
 * de hombro a cuatro también (ver arriba). En alturas de quien anda por lo mismo que todo lo demás.
 */
export const DELANTE_DE_LOS_OJOS = ALTURA_DE_QUIEN_ANDA * (10 / 2.543);
export const DELANTE_DEL_HOMBRO = ALTURA_DE_QUIEN_ANDA * 4;

/**
 * CUÁNTO DEL ALTO DEL LIENZO OCUPA QUIEN ANDA con la cámara de hombro, y dónde queda su coronilla (en
 * coordenadas de pantalla: 0 el centro, 1 el borde de arriba, −1 el de abajo). Proyección de verdad de
 * la cámara de `camaraDeHombro`, con el campo VERTICAL en grados —el que se le da a la cámara de r3f—;
 * como el campo es vertical, no depende de la forma de la pantalla. Aritmética pura, para medirla en Node.
 */
export function parteDeLaPantallaDeQuienAnda(
  campoGrados: number,
  atras: number = ATRAS_DEL_HOMBRO,
  sobre: number = SOBRE_EL_HOMBRO,
  delante: number = DELANTE_DEL_HOMBRO,
  mira: number = MIRA_DEL_HOMBRO,
  altura: number = ALTURA_DE_QUIEN_ANDA,
): { readonly parte: number; readonly coronilla: number } {
  const medio = Math.tan(((campoGrados * Math.PI) / 180) / 2);
  const inclinacion = Math.atan2(sobre - mira, atras + delante);
  /* Cuánto por debajo del eje de la cámara cae un punto de la figura a la altura `y`, en tangente. */
  const bajo = (y: number): number => Math.tan(Math.atan2(sobre - y, atras) - inclinacion);
  return { parte: (bajo(0) - bajo(altura)) / (2 * medio), coronilla: -bajo(altura) / medio };
}

/** Dónde va la cámara y hacia dónde mira. */
export interface PoseDeCamara {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly miraX: number;
  readonly miraY: number;
  readonly miraZ: number;
}

/** Lo justo que una cámara de a pie tiene que saber de quien anda. */
export interface QuienSeMira {
  /** Hacia el este, en unidades del mundo. */
  readonly x: number;
  /** Hacia el sur, en unidades del mundo. */
  readonly z: number;
  /** Hacia dónde mira, en radianes: 0 es el norte y crece hacia el este. */
  readonly rumbo: number;
}

/**
 * HACIA DÓNDE HAY QUE GIRAR LA MARIONETA PARA QUE MIRE A SU RUMBO.
 *
 * ═══ POR QUÉ NO ES `rumbo + π`, QUE ES LO QUE PARECE ═══
 *
 * El rumbo de esta casa tiene el cero al NORTE y crece hacia el ESTE, así que quien anda se
 * mueve hacia `(sin r, −cos r)` — es la dirección de un rumbo en `andar.ts`. Las marionetas de
 * KayKit, en cambio, nacen mirando a su `+z`, y un giro de `θ` alrededor del eje vertical deja
 * ese `+z` en `(sin θ, cos θ)`. Igualando las dos cosas sale `θ = π − r`, que es exactamente
 * `atan2(sin r, −cos r)`: el ángulo de su propio rumbo, sin más.
 *
 * Aquí había `r + π`, y **las dos cuentas dan lo mismo mirando al norte y al sur**. Por eso
 * pasó: el paseante nace mirando al norte, se mira, se ve la nuca, y todo parece bien. Al este y
 * al oeste dan lo CONTRARIO, y el aventurero andaba de espaldas.
 *
 * Mirado en el móvil girando de cuarenta y cinco en cuarenta y cinco: en 180° de giro se vieron
 * dos nucas y dos caras. Con la cámara pegada detrás, el ángulo aparente sólo puede cambiar al
 * DOBLE del giro si el muñeco está espejado; si estuviera bien, no cambiaría nunca.
 */
export function giroDeLaMarioneta(rumbo: number): number {
  return Math.PI - rumbo;
}

/** La cámara de ojos: donde está la cara, mirando adelante. `suelo` es la altura que pisa. */
export function camaraDeOjos(quien: QuienSeMira, suelo = 0): PoseDeCamara {
  return {
    x: quien.x,
    y: suelo + ALTURA_DE_LOS_OJOS,
    z: quien.z,
    miraX: quien.x + Math.sin(quien.rumbo) * DELANTE_DE_LOS_OJOS,
    miraY: suelo + ALTURA_DE_LOS_OJOS * 0.85,
    miraZ: quien.z - Math.cos(quien.rumbo) * DELANTE_DE_LOS_OJOS,
  };
}

/**
 * La cámara de hombro: por detrás y por encima, mirando a la nuca. `suelo` es la altura en la que se
 * apoya la cámara, `atras` cuánto se queda detrás —lo que dé `acercarElHombro`, o la distancia de
 * siempre— y `pies` dónde se pintan los pies, que en Las Lindes no son lo mismo: la cámara no baja del
 * prado (`alturaDeLaCamara`) y la senda está hundida 1,20, casi una figura entera desde la talla a pie.
 * Por eso se MIRA a la altura de los pies y no a la de la cámara: mirando a la de la cámara, andando por
 * la senda la figura se salía por abajo del encuadre.
 */
export function camaraDeHombro(quien: QuienSeMira, suelo = 0, atras = ATRAS_DEL_HOMBRO, pies = suelo): PoseDeCamara {
  return {
    x: quien.x - Math.sin(quien.rumbo) * atras,
    y: suelo + SOBRE_EL_HOMBRO,
    z: quien.z + Math.cos(quien.rumbo) * atras,
    miraX: quien.x + Math.sin(quien.rumbo) * DELANTE_DEL_HOMBRO,
    miraY: pies + MIRA_DEL_HOMBRO,
    miraZ: quien.z - Math.cos(quien.rumbo) * DELANTE_DEL_HOMBRO,
  };
}

/* ─── La cámara de hombro que no atraviesa ───────────────────────────────── */

/**
 * LO MÁS CERCA QUE SE PONE LA CÁMARA DE HOMBRO: media altura de quien anda (0,64 desde que mide la
 * mitad; ver la cabecera).
 *
 * Pegado de espaldas a una pared, el centro de quien pasea queda a un radio de ella (0,4) y ahí no
 * cabe ninguna cámara de hombro. Por debajo de esto la cámara estaría encima de la cabeza y se
 * vería la coronilla y nada más; a esta distancia sigue viéndose el hombro. Si el tramo libre es
 * más corto, la cámara se queda aquí y lo que tiene detrás cae dentro del plano cercano (a una
 * unidad en los dos clientes), así que no tapa: es la única concesión, y es de un palmo.
 */
export const ATRAS_MINIMO_DEL_HOMBRO = ALTURA_DE_QUIEN_ANDA * 0.5;

/**
 * EL RADIO DE LA CÁMARA, en Q16.16: el del paseante. Es lo que tiene que caber el ojo, con su plano
 * cercano, sin rozar una pared; con el mismo radio con el que se anda, la cámara se queda donde
 * podría estar alguien, y ése es un sitio que el mundo ya sabe contestar.
 */
export const RADIO_DE_LA_CAMARA = RADIO_DEL_PASEANTE;

/**
 * CUÁNTO SE ACERCA POR SEGUNDO CUANDO ALGO SE METE DETRÁS, Y CUÁNTO SE ALEJA CUANDO SE VA.
 *
 * Acercarse es deprisa —en un décimo de segundo se ha hecho el 92 %— porque lo que hay detrás ya
 * está tapando: andando de espaldas contra una pared a doce unidades por segundo, la cámara va
 * 12/25 ≈ media unidad por detrás de lo que cabe, y lo que cabe ya deja entre el radio de la cámara
 * y un trozo más hasta la pared. Medido en `verify:canal-del-paseo`, de espaldas contra una muralla
 * con el paseo de verdad: mientras quien pasea está lejos de ella, la cámara no pasa de 0,29
 * unidades de su cara, y el mayor cambio en un fotograma es de 0,24. Alejarse es despacio, tres por
 * segundo —3,2 s para volver del mínimo—, porque no corre prisa y porque volver de golpe a su sitio
 * cada vez que se pasa junto a una esquina marearía más que la esquina.
 */
export const LO_QUE_SE_ACERCA = 25;
export const LO_QUE_SE_ALEJA = 3;

/**
 * HASTA DÓNDE CABE LA CÁMARA DE HOMBRO DETRÁS DE QUIEN PASEA, en unidades del mundo.
 *
 * Se recorre el tramo de quien pasea hacia atrás, a trozos no más largos que el radio de la cámara
 * —ninguna pared más gruesa que ella se cuela entre dos—, preguntando en cada trozo lo mismo que
 * pregunta el paso: ¿hay suelo y no hay cuerpo? (`sePuedeEstar`). Se devuelve la distancia del
 * último trozo bueno antes del primero malo; si no hay ninguno malo, `lejos`. Cero si ya el
 * primero es malo.
 */
export function hastaDondeCabeElHombro(arena: Arena, quien: QuienSeMira, lejos = ATRAS_DEL_HOMBRO): number {
  if (!(lejos > 0)) return 0;
  const haciaAtrasX = -Math.sin(quien.rumbo);
  const haciaAtrasZ = Math.cos(quien.rumbo);
  const radio = RADIO_DE_LA_CAMARA;
  const paso = aNumero(radio);
  const trozos = Math.ceil(lejos / paso);
  let libre = 0;
  for (let i = 1; i <= trozos; i++) {
    const d = Math.min(lejos, i * paso);
    const x = deNumero(quien.x + haciaAtrasX * d);
    const z = deNumero(quien.z + haciaAtrasZ * d);
    if (!sePuedeEstar(arena, x, z, radio)) return libre;
    libre = d;
  }
  return libre;
}

/* ─── Y tampoco se queda detrás del adorno ───────────────────────────────── */

/**
 * A QUÉ ALTURA DE QUIEN PASEA MIRA LA PRUEBA DE LO QUE TAPA: el pecho, entre los hombros y el
 * cuello. Es lo que hay que ver para saber dónde está y hacia dónde va; los pies se pueden perder
 * detrás de un banco sin que se pierda nada.
 */
export const LO_QUE_HAY_QUE_VER = ALTURA_DE_QUIEN_ANDA * 0.7;

/** Cada cuánto se prueba la cámara a lo largo de su carril, en unidades del mundo. */
export const PASO_DEL_CARRIL = 0.25;

/**
 * HASTA DÓNDE PUEDE IRSE LA CÁMARA DE HOMBRO SIN QUE EL ADORNO SE PONGA DELANTE, en unidades.
 *
 * `hastaDondeCabeElHombro` pregunta a la arena, y la arena sólo sabe de estructura (ver la
 * cabecera de `estorbos.ts`, con la señal de tráfico del Burgo). Esto hace la otra mitad con lo que
 * el juego declara que estorba a la vista: la cámara va por su carril —detrás, a la altura de
 * siempre— y se prueba de `PASO_DEL_CARRIL` en `PASO_DEL_CARRIL`, de cerca a lejos, si la línea
 * que va de ella al pecho de quien pasea (`LO_QUE_HAY_QUE_VER`) cruza alguna caja. Se devuelve el
 * último sitio bueno antes del primero tapado, y `lejos` si no se tapa ninguno. `suelo` es donde se
 * apoya la cámara y `pies` donde se pintan los pies, que en Las Lindes no son lo mismo.
 *
 * De cerca a lejos, y parando en el primero tapado, a propósito: detrás de una farola vuelve a haber
 * sitio, y saltar al otro lado de ella dejaría la farola entre la cámara y la nuca, que es justo lo
 * que no hay que hacer. Lo que sale entra en `acercarElHombro` igual que lo de la arena —el menor de
 * los dos—, así que la cámara se acerca deprisa y se aleja despacio, sin saltos.
 */
export function hastaDondeNoTapa(
  estorbos: EstorbosDelPaseo,
  quien: QuienSeMira,
  suelo = 0,
  lejos = ATRAS_DEL_HOMBRO,
  pies = suelo,
): number {
  if (!(lejos > 0)) return 0;
  if (estorbos.ancho === 0 || estorbos.fondo === 0) return lejos;
  const pecho = { x: quien.x, y: pies + LO_QUE_HAY_QUE_VER, z: quien.z };
  const trozos = Math.ceil(lejos / PASO_DEL_CARRIL);
  let libre = 0;
  for (let i = 1; i <= trozos; i++) {
    const d = Math.min(lejos, i * PASO_DEL_CARRIL);
    const c = camaraDeHombro(quien, suelo, d);
    if (tapaLaVista(estorbos, pecho, { x: c.x, y: c.y, z: c.z })) return libre;
    libre = d;
  }
  return libre;
}

/**
 * CUÁNTO SE QUEDA DETRÁS LA CÁMARA ESTE FOTOGRAMA, alcanzando lo que cabe sin saltar.
 *
 * `antes` es lo de el fotograma anterior —`null` al bajar a andar, y entonces se pone en su sitio
 * de golpe, que no hay nada de lo que venir—; `cabe` lo que da `hastaDondeCabeElHombro`. Lo que sale
 * está siempre entre `ATRAS_MINIMO_DEL_HOMBRO` y `ATRAS_DEL_HOMBRO`, y se mueve hacia `cabe` con
 * `1 − e^(−k·dt)`, que da lo mismo a treinta fotogramas que a ciento cuarenta y cuatro.
 */
export function acercarElHombro(antes: number | null, cabe: number, dt: number): number {
  const quiere = Math.min(ATRAS_DEL_HOMBRO, Math.max(ATRAS_MINIMO_DEL_HOMBRO, Number.isFinite(cabe) ? cabe : ATRAS_DEL_HOMBRO));
  if (antes === null || !Number.isFinite(antes)) return quiere;
  if (!(dt > 0) || !Number.isFinite(dt)) return Math.min(ATRAS_DEL_HOMBRO, Math.max(ATRAS_MINIMO_DEL_HOMBRO, antes));
  const k = quiere < antes ? LO_QUE_SE_ACERCA : LO_QUE_SE_ALEJA;
  const ahora = antes + (quiere - antes) * (1 - Math.exp(-k * dt));
  return Math.min(ATRAS_DEL_HOMBRO, Math.max(ATRAS_MINIMO_DEL_HOMBRO, ahora));
}
