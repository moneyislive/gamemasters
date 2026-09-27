/**
 * EL ADORNO QUE CHOCA: lo que se pinta encima del mundo y, desde el 27-sep-2026, también para.
 *
 * ═══ LO QUE VIO MIGUEL ═══
 *
 * «Las colisiones funcionan con los objetos grandes del Burgo y del resto de juegos, pero no con
 * los objetos medianos y pequeños: el avatar los atraviesa». Los grandes son la ESTRUCTURA
 * (BOOTS-ON-BOARD §7.3 A): edificios, murallas, agua, poblados, lo que declara el mundo y valida el
 * servidor. Lo mediano y lo pequeño —farolas, semáforos, bancos, papeleras, coches aparcados,
 * árboles, barriles, rocas, carros— es ADORNO: vive en `escenas/`, depende de la calidad, y sólo se
 * pintaba. La cámara de hombro ya lo miraba (`estorbos.ts`: cajas con altura, medidas a rodajas en
 * cada `.glb`), y quien andaba no.
 *
 * ═══ QUÉ CHOCA: LA PARTE DE CADA PIEZA QUE OCUPA LA FRANJA DEL CUERPO ═══
 *
 * Las cajas que chocan salen de las MISMAS rodajas que las de la vista, cortadas más finas
 * (`ALTO_DE_UNA_RODAJA_QUE_CHOCA`, una décima de quien anda), y de cada pieza se quedan las
 * rodajas que caen en la FRANJA DEL CUERPO: de `LO_QUE_SE_PISA` sobre el suelo donde está la pieza
 * hasta `ALTURA_DE_QUIEN_ANDA`. De ellas sólo cuenta la planta, porque la arena es plana
 * (`shared/mecanicas/mundo.ts`). Así:
 *
 *   · un SEMÁFORO choca por su poste y por el farol que cuelga a la altura de la cabeza, y por
 *     debajo de su brazo —a más de cuatro unidades— se pasa;
 *   · un ÁRBOL de copa alta choca por su tronco; el de copa baja, la que da en el pecho, por su copa,
 *     que es lo que se tiene delante;
 *   · un BANCO, una PAPELERA o un COCHE, enteros; una lámina, una alfombra o un paso de cebra, que
 *     no llegan a `LO_QUE_SE_PISA`, no: se pisan.
 *
 * `LO_QUE_SE_PISA` es el 12 % de quien anda, 0,305 unidades: el tobillo. Lo decidido es «lo que no
 * pasa del tobillo se pisa»; medido en el Burgo, deja fuera los palets (0,30) y dentro la papelera
 * (0,31). Y una rodaja cuya planta no llega a `HUELLA_DESPRECIABLE` por ningún lado (un cable, una
 * varilla de 5 cm) no cuenta: con el radio de quien anda se convertiría en una pared de 0,8 donde no
 * se ve nada.
 *
 * La franja cuelga del SUELO de donde está la pieza y no de la pieza: una torre de agua sobre un
 * tejado o un cuenco sobre una mesa quedan por encima de la cabeza de quien anda por la calle.
 *
 * Lo que se anda por ENCIMA —puentes, pasarelas, muelles, andenes, forjados— y lo que es cubierta de
 * suelo —trigales, hierba, juncos— no entra aunque abulte: cada juego lo dice por su nombre, en su
 * lista, porque desde las rodajas no se distingue un puente de un muro. Los brotes de hallazgos
 * (`los-hallazgos.tsx`) y los demás avatares no están aquí: se recogen andando por encima y no se
 * chocan entre sí.
 *
 * ═══ DÓNDE CHOCA, Y DÓNDE NO: EL SERVIDOR NO SABE NADA DE ESTO ═══
 *
 * El adorno entra en la arena del APARATO (`arenaDelPaseo`), y en la del servidor no. Como la del
 * servidor es la estructura y la del aparato estructura y adorno, todo sitio donde el aparato se
 * deja estar el servidor lo acepta: chocar de más nunca trae una corrección. Lo contrario sí puede
 * pasar —el servidor pone a alguien, al renacer o al entrar, dentro de un coche que él no ve—, y de
 * ahí se sale ANDANDO, un tic de correr por tic y por donde el servidor también deja
 * (`ticDelPaseo`, en `paseante.ts`). Para eso la arena del aparato lleva dentro la de la estructura
 * sola (`estructuraDe`).
 *
 * Esto es presentación que decide dónde está el APARATO, no la mesa: va en coma flotante hasta la
 * arena, que lo pasa a coma fija como pasa el mundo entero.
 */
import { RADIO_DEL_PASEANTE } from '../../shared/mecanicas/andar';
import { aNumero, deNumero } from '../../shared/mecanicas/fijo';
import { arenaDe, sePuedeEstar } from '../../shared/mecanicas/mundo';
import type { Arena, Cuerpo, MundoDeclarado } from '../../shared/mecanicas/mundo';
import { estorbosDePiezas } from './estorbos';
import type { Estorbo, PiezaPuesta } from './estorbos';
import { ALTURA_DE_QUIEN_ANDA } from './talla';

export { ALTURA_DE_QUIEN_ANDA };

/** Lo que no pasa de aquí sobre su suelo se pisa: el 12 % de quien anda, el tobillo. Ver la cabecera. */
export const LO_QUE_SE_PISA = ALTURA_DE_QUIEN_ANDA * 0.12;

/** Una planta más estrecha que esto por sus dos lados no choca: un cable, una varilla. */
export const HUELLA_DESPRECIABLE = 0.05;

/**
 * LO FINO QUE SE CORTA UNA PIEZA PARA SABER QUÉ TIENE A LA ALTURA DEL CUERPO: una décima de quien
 * anda, en unidades del MUNDO (quien mide un catálogo la pasa a las de su pack).
 *
 * Las rodajas de la vista van a 0,75 del modelo, y en los modelos de `tablero.glb`, que se pintan a
 * 5,47 veces su tamaño, eso son CUATRO unidades del mundo: un árbol entero salía en una sola rodaja
 * con la anchura de su copa. Aquí la rodaja que cruza la coronilla se pasa como mucho una décima.
 */
export const ALTO_DE_UNA_RODAJA_QUE_CHOCA = ALTURA_DE_QUIEN_ANDA / 10;

/** Cuántas rodajas finas como mucho por malla: una torre de 16 unidades todavía va a su décima. */
export const TOPE_DE_RODAJAS_QUE_CHOCAN = 64;

/** ¿Cae la caja `a` en planta dentro de la `b`? */
function dentroEnPlanta(a: Cuerpo, b: Cuerpo): boolean {
  return a.x0 >= b.x0 && a.x1 <= b.x1 && a.z0 >= b.z0 && a.z1 <= b.z1;
}

/**
 * LAS PLANTAS QUE CHOCAN DE LAS RODAJAS DE UNA PIEZA, puesta sobre un suelo a la altura `suelo`.
 *
 * Las rodajas que cruzan la franja del cuerpo, en planta, sin las que caen dentro de otra de la misma
 * pieza: un tronco dentro de su copa no añade nada, y una pieza de diez rodajas finas suele quedarse
 * en una o dos cajas.
 */
export function plantasQueChocan(cajas: readonly Estorbo[], suelo: number): Cuerpo[] {
  const desde = suelo + LO_QUE_SE_PISA;
  const hasta = suelo + ALTURA_DE_QUIEN_ANDA;
  const enLaFranja: Cuerpo[] = [];
  for (const c of cajas) {
    if (!(c.y1 > desde && c.y0 < hasta)) continue;
    if (!(Math.max(c.x1 - c.x0, c.z1 - c.z0) >= HUELLA_DESPRECIABLE)) continue;
    enLaFranja.push({ x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1 });
  }
  const salida: Cuerpo[] = [];
  for (let i = 0; i < enLaFranja.length; i++) {
    const a = enLaFranja[i] as Cuerpo;
    let sobra = false;
    for (let j = 0; j < enLaFranja.length && !sobra; j++) {
      if (j === i) continue;
      const b = enLaFranja[j] as Cuerpo;
      /* Dos iguales: se queda la primera. */
      if (dentroEnPlanta(a, b) && (!dentroEnPlanta(b, a) || j < i)) sobra = true;
    }
    if (!sobra) salida.push(a);
  }
  return salida;
}

/**
 * LO QUE CHOCA DE UNA LISTA DE PIEZAS PUESTAS, con las rodajas finas de cada pieza (`rodajasDe`, que
 * devuelve `null` si no la conoce: ésa no choca). `sueloEn` dice a qué altura está el suelo donde se
 * anda junto a cada pieza; sin él, la base de la pieza.
 */
export function cuerposDePiezas(
  puestas: readonly PiezaPuesta[],
  rodajasDe: (pieza: string) => readonly Estorbo[] | null,
  sueloEn?: (x: number, z: number) => number,
): Cuerpo[] {
  const salida: Cuerpo[] = [];
  for (const p of puestas) {
    const cajas = estorbosDePiezas([p], rodajasDe);
    if (cajas.length === 0) continue;
    const suelo = sueloEn === undefined ? p.y : sueloEn(p.x, p.z);
    for (const c of plantasQueChocan(cajas, Number.isFinite(suelo) ? suelo : p.y)) salida.push(c);
  }
  return salida;
}

/* ─── Por trozos, para que montarlo no dé un tirón ───────────────────────── */

/**
 * UN TROZO DEL TRABAJO DE MONTAR EL ADORNO: una función que da las plantas de un puñado de piezas.
 *
 * Montar el adorno del Burgo entero —3.800 cajas, midiendo de paso las rodajas de cada modelo la
 * primera vez— cuesta en el Hermes de escritorio unos 90 ms (medido: 31 las plantas con las rodajas
 * ya medidas y, a ojo, unos 50 medir las rodajas, cuatro veces lo que en Node), y en un móvil el doble
 * o el triple. Luego la arena con él, de una vez: 12 ms en ese Hermes (6 de ellos en quitar lo que
 * cierra un paso, que el paseo hace una sola vez por adorno), y un tic 8,4 µs contra 7,8 sin adorno. Hecho de una vez al bajar a andar sería un tirón justo al empezar a andar. Así que cada
 * juego lo da en TROZOS de `PIEZAS_POR_TROZO` piezas, y `usarElAdorno` (`usar-el-adorno.ts`) los hace
 * de pocos en pocos, fuera del fotograma, hasta tenerlos todos.
 */
export type TrozoDelAdorno = () => readonly Cuerpo[];

/** Cuántas piezas por trozo: 256 son unos 2 ms en el Hermes de escritorio. */
export const PIEZAS_POR_TROZO = 256;

/** `cuerposDePiezas` en trozos de `PIEZAS_POR_TROZO` piezas, en el mismo orden. */
export function trozosDePiezas(
  puestas: readonly PiezaPuesta[],
  rodajasDe: (pieza: string) => readonly Estorbo[] | null,
  sueloEn?: (x: number, z: number) => number,
): TrozoDelAdorno[] {
  const trozos: TrozoDelAdorno[] = [];
  for (let i = 0; i < puestas.length; i += PIEZAS_POR_TROZO) {
    const suyas = puestas.slice(i, i + PIEZAS_POR_TROZO);
    trozos.push(() => cuerposDePiezas(suyas, rodajasDe, sueloEn));
  }
  return trozos;
}

/** Todos los trozos de una vez, en su orden: lo que da `usarElAdorno` al terminar. */
export function hacerLosTrozos(trozos: readonly TrozoDelAdorno[]): Cuerpo[] {
  const salida: Cuerpo[] = [];
  for (const t of trozos) for (const c of t()) salida.push(c);
  return salida;
}

/* ─── La arena del aparato: estructura y adorno, con la estructura sola dentro ─── */

/** La arena con la que anda el aparato cuando hay adorno: lleva dentro la de la estructura sola. */
export interface ArenaConAdorno extends Arena {
  /** La arena de la estructura sola: la que valida el servidor. */
  readonly estructura: Arena;
}

/**
 * LA ARENA DEL PASEO: la del mundo declarado con el adorno que choca sumado a sus cuerpos, y la del
 * mundo solo guardada dentro (`estructuraDe`). Sin adorno, la del mundo tal cual. Los cuerpos del
 * adorno van DETRÁS de los del mundo: los índices de la estructura no cambian. `estructura`, si ya se
 * tiene, es la arena del mundo solo, para no derivarla otra vez. Lo que cierra un paso de la estructura
 * no entra (`sinLoQueCierraElPaso`), salvo que quien llama diga que ya lo quitó (`yaAbierto`): el
 * paseo lo quita una vez por adorno y no cada vez que cambian los brotes.
 */
export function arenaDelPaseo(
  mundo: MundoDeclarado,
  adorno: readonly Cuerpo[] | null | undefined,
  estructura: Arena = arenaDe(mundo),
  yaAbierto = false,
): Arena {
  if (adorno === null || adorno === undefined || adorno.length === 0) return estructura;
  const queda = yaAbierto ? adorno : sinLoQueCierraElPaso(adorno, estructura);
  if (queda.length === 0) return estructura;
  const todo = arenaDe({ ...mundo, cuerpos: [...mundo.cuerpos, ...queda] });
  const conAdorno: ArenaConAdorno = { ...todo, estructura };
  return conAdorno;
}

/**
 * LO QUE HACE FALTA PARA PASAR JUNTO A UNA PIEZA: dos radios de quien anda y un cuarto de unidad, 1,05.
 * Un hueco más estrecho entre una pieza y la estructura se pasa, si se pasa, rozando a ciegas.
 */
export const HUECO_PARA_PASAR = aNumero(RADIO_DEL_PASEANTE) * 2 + 0.25;

/**
 * EL ADORNO SIN LO QUE CIERRA UN PASO DE LA ESTRUCTURA.
 *
 * Medido en el Burgo ABCD: junto a las gradas del estadio hay un pasillo de dos unidades entre dos
 * cuerpos de la estructura, y cada dieciséis unidades un arbusto de 1,14 que deja 0,96 a un lado y nada
 * al otro. Chocando con ellos, el pasillo quedaba partido en 29 bolsillos a los que no se llega; y quien
 * saliera andando de uno de esos arbustos (`salirDelAdorno`) podía acabar encerrado en uno. Una pieza de
 * adorno que, a lo ancho o a lo largo, deja menos de `HUECO_PARA_PASAR` hasta la estructura (o hasta el
 * borde del suelo) POR LOS DOS LADOS cierra un paso que la estructura deja abierto: ésa se pinta y no
 * choca. Cuatro preguntas por pieza a la estructura, al montar la arena.
 */
export function sinLoQueCierraElPaso(adorno: readonly Cuerpo[], estructura: Arena): readonly Cuerpo[] {
  const cerrado = (x: number, z: number): boolean => !sePuedeEstar(estructura, deNumero(x), deNumero(z), 0);
  let alguna = false;
  const quedan = adorno.filter((c) => {
    const cx = (c.x0 + c.x1) / 2;
    const cz = (c.z0 + c.z1) / 2;
    const aLoAncho = cerrado(c.x0 - HUECO_PARA_PASAR, cz) && cerrado(c.x1 + HUECO_PARA_PASAR, cz);
    const aLoLargo = cerrado(cx, c.z0 - HUECO_PARA_PASAR) && cerrado(cx, c.z1 + HUECO_PARA_PASAR);
    if (aLoAncho || aLoLargo) alguna = true;
    return !(aLoAncho || aLoLargo);
  });
  return alguna ? quedan : adorno;
}

/** La arena de la ESTRUCTURA de una arena del paseo: la de dentro si lleva adorno, y si no, ella misma. */
export function estructuraDe(arena: Arena): Arena {
  return (arena as Partial<ArenaConAdorno>).estructura ?? arena;
}

/* ─── Y a un brote se llega siempre ──────────────────────────────────────── */

/** Un brote de hallazgo, en unidades del mundo: lo justo para saber dónde está. */
export interface SitioDeUnBrote {
  readonly x: number;
  readonly z: number;
}

/**
 * A QUÉ DISTANCIA DE UN BROTE VIVO DEJA DE CHOCAR EL ADORNO: la holgura con la que brota, dos radios
 * de quien anda (`HOLGURA` de `shared/mecanicas/hallazgos.ts`).
 */
export const LO_QUE_SE_APARTA_DE_UN_BROTE = 0.8;

/**
 * EL ADORNO SIN LO QUE TAPA UN BROTE VIVO.
 *
 * ═══ POR QUÉ ═══
 *
 * El servidor hace brotar los hallazgos donde cabe alguien EN LA ESTRUCTURA (`sitiosDeHallazgo`), y no
 * sabe del adorno. Medido: en tres deltas de diecinueve comarcas, de 740 a 805 de sus 9.200 sitios
 * caen dentro de una arboleda, una roca o una montaña, y en el Burgo ABCD 346 de 18.595 dentro de un
 * coche, un pino o unas gradas. Se recogen a 1,5 unidades (`RADIO_DE_RECOGER`), y desde fuera de una arboleda de siete
 * no se llega: el brote se quedaría ahí sin que nadie pudiera cogerlo.
 *
 * Así que lo que queda a menos de `LO_QUE_SE_APARTA_DE_UN_BROTE` de un brote vivo deja de chocar
 * mientras el brote esté —se entra en la arboleda a por él, como se entraba antes—, y vuelve a chocar
 * cuando alguien lo recoge. Si ningún brote toca el adorno, sale la MISMA lista, y la arena no se
 * vuelve a derivar.
 */
export function adornoQueDejaLlegarALosBrotes(
  adorno: readonly Cuerpo[] | null | undefined,
  brotes: readonly SitioDeUnBrote[] | undefined,
): readonly Cuerpo[] | null {
  if (adorno === null || adorno === undefined) return null;
  if (brotes === undefined || brotes.length === 0) return adorno;
  const cerca = (c: Cuerpo, b: SitioDeUnBrote): boolean => {
    const dx = b.x < c.x0 ? c.x0 - b.x : b.x > c.x1 ? b.x - c.x1 : 0;
    const dz = b.z < c.z0 ? c.z0 - b.z : b.z > c.z1 ? b.z - c.z1 : 0;
    return dx * dx + dz * dz < LO_QUE_SE_APARTA_DE_UN_BROTE * LO_QUE_SE_APARTA_DE_UN_BROTE;
  };
  let alguno = false;
  const quedan = adorno.filter((c) => {
    const tapa = brotes.some((b) => cerca(c, b));
    if (tapa) alguno = true;
    return !tapa;
  });
  return alguno ? quedan : adorno;
}
